package io.github.falconperch;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Feeds the user's chosen location to Android so every app sees it instead of the real one.
 *
 * Two layers are mocked, because apps read location in two different ways:
 *  - Android's own providers (gps, network and, on Android 12+, fused) via LocationManager
 *    test providers. Apps using the platform LocationManager read these.
 *  - Google Play services' fused location provider (the one Google Maps, ride-hailing and
 *    most modern apps use) via FusedLocationProviderClient mock mode. Without this, Play
 *    services would keep answering from Wi-Fi and cell towers.
 *
 * Android only allows this for the app picked under Developer options → "Select mock
 * location app". A fix is pushed every second so apps never fall back to the real GPS.
 */
public class MockLocationService extends Service {

    static final String ACTION_START = "io.github.falconperch.action.START";
    static final String ACTION_STOP = "io.github.falconperch.action.STOP";

    static final String ERROR_NOT_MOCK_APP = "NOT_MOCK_APP";
    static final String ERROR_START_FAILED = "START_FAILED";

    private static final String TAG = "FalconPerchMock";
    private static final String CHANNEL_ID = "system_location";
    private static final int NOTIFICATION_ID = 7;
    private static final long TICK_MS = 1000;
    private static final double EARTH_RADIUS_M = 6_371_008.8;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<String> providers = new ArrayList<>();

    private LocationManager locationManager;
    private FusedLocationProviderClient fused;
    private MockState target;
    private double curLat = Double.NaN;
    private double curLng = Double.NaN;
    private float bearing;
    private boolean moving;
    private long ticks;

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            advance();
            if (!push()) return;
            handler.postDelayed(this, TICK_MS);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            MockState s = MockState.load(this);
            s.enabled = false;
            s.save(this);
            stopSelf();
            return START_NOT_STICKY;
        }

        boolean wasRunning = MockState.running;
        target = MockState.load(this);
        if (!target.enabled) {
            // Restarted by the system after the user switched it off.
            stopSelf();
            return START_NOT_STICKY;
        }

        try {
            startInForeground();
        } catch (RuntimeException e) {
            // Android 12+ refuses to restart a foreground service from the background.
            Log.w(TAG, "Could not enter the foreground", e);
            MockState.fail(this, ERROR_START_FAILED);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (!wasRunning) {
            if (!setUpProviders()) {
                stopSelf();
                return START_NOT_STICKY;
            }
            double[] saved = intent == null ? MockState.loadCurrent(this) : null;
            if (saved != null && target.speed > 0) {
                curLat = saved[0];
                curLng = saved[1];
            }
        }
        // Jump when there is nowhere to travel from, or when travel is off.
        if (Double.isNaN(curLat) || target.speed <= 0) {
            curLat = target.lat;
            curLng = target.lng;
        }

        MockState.running = true;
        handler.removeCallbacks(tick);
        handler.post(tick);
        MockState.notifyChanged();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(tick);
        tearDownProviders();
        MockState.running = false;
        MockState.moving = false;
        MockState.currentLat = Double.NaN;
        MockState.currentLng = Double.NaN;
        MockState.notifyChanged();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ---- Providers -------------------------------------------------------------------------

    private static String[] platformProviders() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return new String[] { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.FUSED_PROVIDER };
        }
        return new String[] { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER };
    }

    /** Returns false (and records why) when Android refuses to let us mock. */
    @SuppressWarnings("deprecation")
    private boolean setUpProviders() {
        providers.clear();
        for (String name : platformProviders()) {
            try {
                // A leftover provider from a crash would make addTestProvider throw.
                locationManager.removeTestProvider(name);
            } catch (Exception ignored) {}
            try {
                boolean network = LocationManager.NETWORK_PROVIDER.equals(name);
                boolean gps = LocationManager.GPS_PROVIDER.equals(name);
                locationManager.addTestProvider(
                    name,
                    network,
                    gps,
                    network,
                    false,
                    true,
                    true,
                    true,
                    android.location.Criteria.POWER_LOW,
                    android.location.Criteria.ACCURACY_FINE
                );
                locationManager.setTestProviderEnabled(name, true);
                providers.add(name);
            } catch (SecurityException e) {
                Log.w(TAG, "Not the selected mock location app", e);
                tearDownProviders();
                MockState.fail(this, ERROR_NOT_MOCK_APP);
                return false;
            } catch (Exception e) {
                Log.w(TAG, "Could not mock provider " + name, e);
            }
        }
        MockState.setActiveProviders(providers);
        setUpFused();
        return true;
    }

    @SuppressLint("MissingPermission") // Checked just above the call.
    private void setUpFused() {
        MockState.fusedActive = false;
        if (!hasLocationPermission()) {
            Log.i(TAG, "No location permission: Google Play services location is not mocked");
            return;
        }
        try {
            fused = LocationServices.getFusedLocationProviderClient(this);
            fused
                .setMockMode(true)
                .addOnSuccessListener(v -> {
                    MockState.fusedActive = true;
                    MockState.notifyChanged();
                })
                .addOnFailureListener(e -> {
                    Log.w(TAG, "Google Play services refused mock mode", e);
                    MockState.fusedActive = false;
                    fused = null;
                    MockState.notifyChanged();
                });
        } catch (Throwable t) {
            // No Google Play services on this device (e.g. de-Googled ROMs): platform providers still work.
            Log.i(TAG, "Google Play services location unavailable", t);
            fused = null;
        }
    }

    @SuppressLint("MissingPermission")
    private void tearDownProviders() {
        for (String name : providers) {
            try {
                locationManager.setTestProviderEnabled(name, false);
                locationManager.removeTestProvider(name);
            } catch (Exception ignored) {}
        }
        providers.clear();
        MockState.setActiveProviders(providers);
        if (fused != null) {
            try {
                fused.setMockMode(false);
            } catch (Throwable ignored) {}
            fused = null;
        }
        MockState.fusedActive = false;
    }

    private boolean hasLocationPermission() {
        return (
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        );
    }

    // ---- Movement and fixes ----------------------------------------------------------------

    /** Moves the current position toward the target at the chosen speed, along a great circle. */
    private void advance() {
        double remaining = distance(curLat, curLng, target.lat, target.lng);
        boolean wasMoving = moving;
        if (target.speed <= 0 || remaining <= target.speed) {
            if (remaining > 0) bearing = (float) initialBearing(curLat, curLng, target.lat, target.lng);
            curLat = target.lat;
            curLng = target.lng;
            moving = false;
        } else {
            bearing = (float) initialBearing(curLat, curLng, target.lat, target.lng);
            double[] next = destination(curLat, curLng, bearing, target.speed * (TICK_MS / 1000.0));
            curLat = next[0];
            curLng = next[1];
            moving = true;
        }
        MockState.currentLat = curLat;
        MockState.currentLng = curLng;
        MockState.moving = moving;
        if (moving || wasMoving) MockState.saveCurrent(this, curLat, curLng);
        if (wasMoving != moving) {
            updateNotification();
            MockState.notifyChanged();
        }
    }

    /** Returns false when Android withdrew permission and the service stopped. */
    @SuppressLint("MissingPermission")
    private boolean push() {
        try {
            for (String name : providers) {
                locationManager.setTestProviderLocation(name, buildFix(name));
            }
        } catch (SecurityException e) {
            // The user picked a different mock location app while we were running.
            Log.w(TAG, "Mock permission withdrawn", e);
            MockState.fail(this, ERROR_NOT_MOCK_APP);
            stopSelf();
            return false;
        } catch (Exception e) {
            Log.w(TAG, "Failed to push a fix", e);
        }
        if (fused != null && MockState.fusedActive) {
            try {
                fused.setMockLocation(buildFix("fused"));
            } catch (Throwable t) {
                Log.w(TAG, "Failed to push a Play services fix", t);
            }
        }
        if (++ticks % 30 == 0 && !moving) MockState.saveCurrent(this, curLat, curLng);
        return true;
    }

    private Location buildFix(String provider) {
        Location l = new Location(provider);
        l.setLatitude(curLat);
        l.setLongitude(curLng);
        l.setAccuracy(target.accuracy);
        l.setAltitude(target.altitude);
        l.setTime(System.currentTimeMillis());
        l.setElapsedRealtimeNanos(SystemClock.elapsedRealtimeNanos());
        l.setSpeed(moving ? target.speed : 0f);
        l.setBearing(bearing);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            l.setVerticalAccuracyMeters(target.accuracy * 1.5f);
            l.setSpeedAccuracyMetersPerSecond(0.5f);
            l.setBearingAccuracyDegrees(moving ? 5f : 180f);
        }
        if (LocationManager.GPS_PROVIDER.equals(provider)) {
            Bundle extras = new Bundle();
            extras.putInt("satellites", 12);
            l.setExtras(extras);
        }
        return l;
    }

    static double distance(double lat1, double lng1, double lat2, double lng2) {
        double p1 = Math.toRadians(lat1), p2 = Math.toRadians(lat2);
        double dp = p2 - p1, dl = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    static double initialBearing(double lat1, double lng1, double lat2, double lng2) {
        double p1 = Math.toRadians(lat1), p2 = Math.toRadians(lat2), dl = Math.toRadians(lng2 - lng1);
        double y = Math.sin(dl) * Math.cos(p2);
        double x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
        return (Math.toDegrees(Math.atan2(y, x)) + 360) % 360;
    }

    static double[] destination(double lat, double lng, double bearingDeg, double metres) {
        double d = metres / EARTH_RADIUS_M, b = Math.toRadians(bearingDeg);
        double p1 = Math.toRadians(lat), l1 = Math.toRadians(lng);
        double p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
        double l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
        return new double[] { Math.toDegrees(p2), ((Math.toDegrees(l2) + 540) % 360) - 180 };
    }

    // ---- Notification ----------------------------------------------------------------------

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "System-wide location", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Shown while other apps see your perch instead of your real location.");
        channel.setShowBadge(false);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    private void startInForeground() {
        Notification n = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, n);
        }
    }

    private void updateNotification() {
        try {
            getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, buildNotification());
        } catch (SecurityException ignored) {
            // Notifications are blocked; the service keeps running regardless.
        }
    }

    private Notification buildNotification() {
        int immutable = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
        PendingIntent open = PendingIntent.getActivity(
            this,
            0,
            new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            immutable | PendingIntent.FLAG_UPDATE_CURRENT
        );
        PendingIntent stop = PendingIntent.getService(
            this,
            1,
            new Intent(this, MockLocationService.class).setAction(ACTION_STOP),
            immutable | PendingIntent.FLAG_UPDATE_CURRENT
        );
        String where = target.label == null || target.label.isEmpty() ? "your perch" : target.label;
        String title = moving ? "Travelling to " + where : "Apps see " + where;
        String text = String.format(Locale.US, "%.5f, %.5f · your real location is hidden", target.lat, target.lng);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_perch)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(open)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .addAction(0, "Stop", stop)
            .build();
    }
}
