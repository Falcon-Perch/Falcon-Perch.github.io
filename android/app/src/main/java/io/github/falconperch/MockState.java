package io.github.falconperch;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * The system-wide location the user chose, shared by the plugin (which writes it) and
 * {@link MockLocationService} (which feeds it to Android). Persisted so the service can
 * resume after the system restarts it.
 */
final class MockState {

    interface Listener {
        void onChanged();
    }

    private static final String PREFS = "system_location";

    // Runtime-only state, owned by MockLocationService.
    static volatile boolean running;
    static volatile boolean fusedActive;
    static volatile List<String> activeProviders = Collections.emptyList();
    static volatile double currentLat = Double.NaN;
    static volatile double currentLng = Double.NaN;
    static volatile boolean moving;

    private static volatile Listener listener;

    boolean enabled;
    double lat;
    double lng;
    float accuracy;
    double altitude;
    float speed; // metres per second; 0 jumps straight to the target
    String label;
    String lastError;

    private MockState() {}

    static MockState load(Context context) {
        SharedPreferences p = prefs(context);
        MockState s = new MockState();
        s.enabled = p.getBoolean("enabled", false);
        s.lat = Double.longBitsToDouble(p.getLong("lat", 0));
        s.lng = Double.longBitsToDouble(p.getLong("lng", 0));
        s.accuracy = p.getFloat("accuracy", 5f);
        s.altitude = Double.longBitsToDouble(p.getLong("altitude", 0));
        s.speed = p.getFloat("speed", 0f);
        s.label = p.getString("label", "");
        s.lastError = p.getString("lastError", null);
        return s;
    }

    void save(Context context) {
        prefs(context)
            .edit()
            .putBoolean("enabled", enabled)
            .putLong("lat", Double.doubleToRawLongBits(lat))
            .putLong("lng", Double.doubleToRawLongBits(lng))
            .putFloat("accuracy", accuracy)
            .putLong("altitude", Double.doubleToRawLongBits(altitude))
            .putFloat("speed", speed)
            .putString("label", label)
            .putString("lastError", lastError)
            .apply();
    }

    /** Last position the service reported, so travel resumes where it left off. */
    static void saveCurrent(Context context, double lat, double lng) {
        prefs(context)
            .edit()
            .putLong("currentLat", Double.doubleToRawLongBits(lat))
            .putLong("currentLng", Double.doubleToRawLongBits(lng))
            .apply();
    }

    static double[] loadCurrent(Context context) {
        SharedPreferences p = prefs(context);
        if (!p.contains("currentLat")) return null;
        return new double[] {
            Double.longBitsToDouble(p.getLong("currentLat", 0)),
            Double.longBitsToDouble(p.getLong("currentLng", 0)),
        };
    }

    /** Records a failure and switches system-wide mode off. */
    static void fail(Context context, String error) {
        MockState s = load(context);
        s.enabled = false;
        s.lastError = error;
        s.save(context);
        notifyChanged();
    }

    static void setActiveProviders(List<String> providers) {
        activeProviders = Collections.unmodifiableList(new ArrayList<>(providers));
    }

    static void setListener(Listener l) {
        listener = l;
    }

    static void notifyChanged() {
        Listener l = listener;
        if (l != null) l.onChanged();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
