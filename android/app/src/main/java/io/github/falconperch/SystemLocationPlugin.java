package io.github.falconperch;

import android.Manifest;
import android.app.AppOpsManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;

/** Bridge between the web UI (src/location/systemLocation.ts) and {@link MockLocationService}. */
@CapacitorPlugin(
    name = "SystemLocation",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" }),
    }
)
public class SystemLocationPlugin extends Plugin {

    @Override
    public void load() {
        MockState.setListener(() -> notifyListeners("statusChange", status()));
    }

    @Override
    protected void handleOnDestroy() {
        MockState.setListener(null);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void start(PluginCall call) {
        Double lat = call.getDouble("lat");
        Double lng = call.getDouble("lng");
        if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            call.reject("A valid latitude and longitude are required.", "INVALID_COORDINATES");
            return;
        }
        Context ctx = getContext();
        if (!isMockAppSelected(ctx)) {
            call.reject("Falcon Perch isn’t selected as the mock location app yet.", MockLocationService.ERROR_NOT_MOCK_APP);
            return;
        }

        MockState s = MockState.load(ctx);
        s.enabled = true;
        s.lat = lat;
        s.lng = lng;
        s.accuracy = clamp(call.getFloat("accuracy", 5f), 1f, 500f);
        s.altitude = call.getDouble("altitude", 0d);
        s.speed = clamp(call.getFloat("speed", 0f), 0f, 300f);
        s.label = call.getString("label", "");
        s.lastError = null;
        s.save(ctx);

        try {
            ContextCompat.startForegroundService(ctx, new Intent(ctx, MockLocationService.class).setAction(MockLocationService.ACTION_START));
        } catch (RuntimeException e) {
            MockState.fail(ctx, MockLocationService.ERROR_START_FAILED);
            call.reject("Android wouldn’t start the location service: " + e.getMessage(), MockLocationService.ERROR_START_FAILED);
            return;
        }
        call.resolve(status());
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context ctx = getContext();
        MockState s = MockState.load(ctx);
        s.enabled = false;
        s.save(ctx);
        ctx.stopService(new Intent(ctx, MockLocationService.class));
        call.resolve(status());
    }

    /** Opens Developer options, or "About phone" when they still need unlocking. */
    @PluginMethod
    public void openDeveloperSettings(PluginCall call) {
        boolean unlocked = developerOptionsEnabled(getContext());
        String action = unlocked ? Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS : Settings.ACTION_DEVICE_INFO_SETTINGS;
        JSObject ret = new JSObject();
        ret.put("opened", open(new Intent(action)) ? (unlocked ? "developer" : "about") : "none");
        call.resolve(ret);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null));
        JSObject ret = new JSObject();
        ret.put("opened", open(i) ? "app" : "none");
        call.resolve(ret);
    }

    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("opened", open(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)) ? "location" : "none");
        call.resolve(ret);
    }

    @PluginMethod
    public void requestLocationPermission(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            call.resolve(status());
        } else {
            requestPermissionForAlias("location", call, "permissionCallback");
        }
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve(status());
        } else {
            requestPermissionForAlias("notifications", call, "permissionCallback");
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        call.resolve(status());
    }

    // ---- Status ----------------------------------------------------------------------------

    private JSObject status() {
        Context ctx = getContext();
        MockState s = MockState.load(ctx);
        JSObject o = new JSObject();
        o.put("supported", true);
        o.put("sdk", Build.VERSION.SDK_INT);
        o.put("developerOptions", developerOptionsEnabled(ctx));
        o.put("mockAppSelected", isMockAppSelected(ctx));
        o.put("locationPermission", permissionString(getPermissionState("location")));
        o.put(
            "notificationPermission",
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ? "granted" : permissionString(getPermissionState("notifications"))
        );
        o.put("locationServicesOn", locationServicesOn(ctx));
        o.put("playServices", playServicesAvailable(ctx));
        o.put("enabled", s.enabled);
        o.put("running", MockState.running);
        o.put("fusedActive", MockState.fusedActive);
        o.put("providers", new JSArray(MockState.activeProviders));
        o.put("moving", MockState.moving);
        if (s.enabled) {
            o.put("lat", s.lat);
            o.put("lng", s.lng);
            o.put("label", s.label);
            o.put("speed", s.speed);
        }
        if (!Double.isNaN(MockState.currentLat)) {
            o.put("currentLat", MockState.currentLat);
            o.put("currentLng", MockState.currentLng);
        }
        if (s.lastError != null) o.put("lastError", s.lastError);
        return o;
    }

    static boolean isMockAppSelected(Context ctx) {
        try {
            AppOpsManager ops = (AppOpsManager) ctx.getSystemService(Context.APP_OPS_SERVICE);
            int mode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                ? ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_MOCK_LOCATION, Process.myUid(), ctx.getPackageName())
                : ops.checkOpNoThrow(AppOpsManager.OPSTR_MOCK_LOCATION, Process.myUid(), ctx.getPackageName());
            return mode == AppOpsManager.MODE_ALLOWED;
        } catch (Exception e) {
            return false;
        }
    }

    private static boolean developerOptionsEnabled(Context ctx) {
        return Settings.Global.getInt(ctx.getContentResolver(), Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) != 0;
    }

    private static boolean locationServicesOn(Context ctx) {
        android.location.LocationManager lm = (android.location.LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return lm.isLocationEnabled();
        return (
            lm.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER) ||
            lm.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER)
        );
    }

    private static boolean playServicesAvailable(Context ctx) {
        try {
            return GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(ctx) == ConnectionResult.SUCCESS;
        } catch (Throwable t) {
            return false;
        }
    }

    private static String permissionString(PermissionState state) {
        if (state == PermissionState.GRANTED) return "granted";
        if (state == PermissionState.DENIED) return "denied";
        return "prompt";
    }

    private boolean open(Intent intent) {
        try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            return true;
        } catch (ActivityNotFoundException e) {
            return false;
        }
    }

    private static float clamp(Float v, float min, float max) {
        float f = v == null ? min : v;
        return Math.max(min, Math.min(max, f));
    }
}
