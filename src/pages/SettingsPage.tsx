import { useEffect, useRef, useState } from 'react';
import { exportData, forgetEverything, importData } from '../lib/data';
import { getPermissionState } from '../location/realProvider';
import { useSettings, type Mode } from '../store/settings';
import { toast } from '../store/toast';
import { Button, PageHeader } from '../components/ui';
import { SystemWideSettings } from '../components/SystemWide';
import { isAndroidApp } from '../location/systemLocation';

const modes: { value: Mode; title: string; body: string }[] = [
  { value: 'perch', title: 'Always use my perch', body: 'Your real location is only requested when you tap a GPS button, and you confirm each time.' },
  { value: 'ask', title: 'Ask me every time', body: 'Each time a feature needs a location, choose between your perch and your real location.' },
];

const permissionText: Record<string, string> = {
  granted: 'Allowed. Falcon Perch still only reads it when you confirm.',
  prompt: 'Not decided. You’ll be asked the first time you use GPS.',
  denied: 'Blocked. Allow it in your browser’s or phone’s settings if you want to use GPS.',
  unsupported: 'This browser doesn’t report it.',
};

export default function SettingsPage() {
  const { mode, setMode } = useSettings();
  const [permission, setPermission] = useState<string>('unsupported');
  const [confirmForget, setConfirmForget] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPermissionState().then(setPermission);
  }, []);

  async function download() {
    const blob = await exportData();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `falcon-perch-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full overflow-y-auto pb-8">
      <PageHeader title="Settings" />

      <SystemWideSettings />

      <section className="px-5">
        <h2 className="font-display text-xl font-bold">Location mode</h2>
        <fieldset className="mt-3 divide-y divide-line rounded-3xl border border-line bg-surface">
          <legend className="sr-only">Location mode</legend>
          {modes.map((m) => (
            <label key={m.value} className="flex cursor-pointer items-start gap-3 px-4 py-4">
              <input
                type="radio"
                name="mode"
                value={m.value}
                checked={mode === m.value}
                onChange={() => setMode(m.value)}
                className="mt-1 size-5 accent-[#f2b807]"
              />
              <span>
                <span className="block font-bold">{m.title}</span>
                <span className="block text-sm text-muted">{m.body}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="mt-3 text-sm text-muted">
          Location permission: <span className="text-ink">{permissionText[permission] ?? permissionText.unsupported}</span>
        </p>
      </section>

      <section className="mt-8 px-5">
        <h2 className="font-display text-xl font-bold">Your data</h2>
        <p className="mt-1 max-w-[60ch] text-muted">
          Everything stays on this device. There’s no account and no server. Export a backup to move your places to
          another phone.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={download}>Export places</Button>
          <Button onClick={() => fileRef.current?.click()}>Import places</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                const n = await importData(await file.text());
                toast(`Imported ${n} ${n === 1 ? 'place' : 'places'}.`);
              } catch (err) {
                toast((err as Error).message, 'error');
              }
            }}
          />
        </div>
        <div className="mt-4">
          {confirmForget ? (
            <div className="rounded-3xl border border-danger p-4">
              <p className="font-bold">Forget everything on this device?</p>
              <p className="text-sm text-muted">Your perch, saved places, the privacy log and cached map tiles will be deleted. This can’t be undone.</p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  onClick={async () => {
                    await forgetEverything();
                    location.reload();
                  }}
                >
                  Forget everything
                </Button>
                <Button variant="quiet" onClick={() => setConfirmForget(false)}>Keep my data</Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmForget(true)}>Forget everything</Button>
          )}
        </div>
      </section>

      <section className="mt-8 max-w-[65ch] px-5">
        <h2 className="font-display text-xl font-bold">What Falcon Perch can and can’t do</h2>
        {isAndroidApp ? (
          <p className="mt-2">
            Falcon Perch always uses your perch for the map, sharing and saved places. With <em>System-wide location</em> on,
            it also replaces your phone’s location for every other app. While that’s on, “use my GPS” is unavailable, because
            your phone itself reports the perch.
          </p>
        ) : (
          <p className="mt-2">
            Falcon Perch controls the location used <em>inside this app</em>: the map, sharing and saved places. A website can’t
            change your phone’s GPS, so other apps and websites still see your real location if you allow them to. Use the
            Android app to change it for every app.
          </p>
        )}
        <p className="mt-2 text-muted">
          Map tiles come from OpenStreetMap, which sees the map area you view, not your GPS position. Place searches send
          only the text you type. There are no analytics or trackers.
        </p>
        <p className="mt-4 text-sm text-muted">Falcon Perch {__APP_VERSION__}. Map data © OpenStreetMap contributors.</p>
      </section>
    </div>
  );
}
