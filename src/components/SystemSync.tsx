import { useEffect, useRef } from 'react';
import { SystemLocation, errorMessage, isAndroidApp, travelSpeeds } from '../location/systemLocation';
import { useSettings } from '../store/settings';
import { useSystem } from '../store/system';
import { toast } from '../store/toast';

/**
 * Keeps the native system-wide location in step with the perch (Android app only).
 * Settings are the user's intent; the native status is the truth. If the native side
 * stopped on its own (the notification's Stop button, or Android withdrew permission),
 * the intent is switched off to match rather than silently restarted.
 */
export default function SystemSync() {
  const { perch, systemWide, travel, setSystemWide } = useSettings();
  const synced = useRef(false);

  useEffect(() => {
    if (!isAndroidApp) return;
    const { refresh, set } = useSystem.getState();

    const reconcile = (enabled: boolean, lastError?: string) => {
      if (useSettings.getState().systemWide && !enabled) {
        useSettings.getState().setSystemWide(false);
        if (lastError) toast(errorMessage(lastError), 'error');
        else toast('System-wide location is off. Apps can see your real location again.');
      }
    };

    refresh().then((s) => {
      if (s) reconcile(s.enabled, s.lastError);
      synced.current = true;
    });
    const handle = SystemLocation.addListener('statusChange', (s) => {
      set(s);
      reconcile(s.enabled, s.lastError);
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh().then((s) => s && reconcile(s.enabled, s.lastError));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      handle.then((h) => h.remove());
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!isAndroidApp) return;
    let cancelled = false;
    // Wait for the first status read so a stop from the notification isn't undone.
    const run = async () => {
      while (!synced.current) await new Promise((r) => setTimeout(r, 50));
      if (cancelled) return;
      const { status, set } = useSystem.getState();
      try {
        if (systemWide && perch) {
          set(
            await SystemLocation.start({
              lat: perch.lat,
              lng: perch.lng,
              label: perch.label,
              speed: travelSpeeds[travel],
              accuracy: 5,
            }),
          );
        } else if (status?.enabled) {
          set(await SystemLocation.stop());
        }
      } catch (err) {
        setSystemWide(false);
        const code = (err as { code?: string }).code;
        toast(code === 'NOT_MOCK_APP' ? 'Finish the setup steps in Settings to apply your perch to all apps.' : (err as Error).message, 'error');
        useSystem.getState().refresh();
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [systemWide, perch?.lat, perch?.lng, perch?.label, travel]);

  return null;
}
