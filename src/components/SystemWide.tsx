import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, Globe2, ShieldCheck, TriangleAlert } from 'lucide-react';
import {
  APK_URL,
  SystemLocation,
  isAndroidApp,
  isReady,
  type SystemStatus,
  type Travel,
} from '../location/systemLocation';
import { useSettings } from '../store/settings';
import { useSystem } from '../store/system';
import { toast } from '../store/toast';
import { Button } from './ui';

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-45 ${
        checked ? 'border-cere bg-cere' : 'border-line bg-bg'
      }`}
    >
      <span className={`inline-block size-6 rounded-full bg-falcon shadow transition ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  );
}

/** One-line status and switch under the perch card on the map. Android app only. */
export function SystemWideBar() {
  const { perch, systemWide, setSystemWide } = useSettings();
  const status = useSystem((s) => s.status);
  if (!isAndroidApp || !perch) return null;

  const ready = isReady(status);
  const live = systemWide && status?.running;
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
      <p className="min-w-0 text-sm">
        {live ? (
          <>
            <span className="flex items-center gap-1.5 font-bold">
              <ShieldCheck size={16} aria-hidden /> {status?.moving ? 'Travelling — all apps follow' : 'All apps see this perch'}
            </span>
            <span className="block text-muted">Your real location is hidden from Google Maps and other apps.</span>
          </>
        ) : ready ? (
          <>
            <span className="block font-bold">Only Falcon Perch uses this perch</span>
            <span className="block text-muted">Turn on to hide your real location from every app.</span>
          </>
        ) : (
          <>
            <span className="block font-bold">Hide your location from every app</span>
            <Link to="/settings" className="text-muted underline underline-offset-4">Finish the one-time setup</Link>
          </>
        )}
      </p>
      <Switch
        label="Apply my perch to all apps"
        checked={systemWide}
        disabled={!ready && !systemWide}
        onChange={(on) => {
          setSystemWide(on);
          if (on) toast('Applying your perch to every app…');
        }}
      />
    </div>
  );
}

const travelOptions: { value: Travel; title: string; body: string }[] = [
  { value: 'jump', title: 'Jump', body: 'Move instantly when you pick a new perch.' },
  { value: 'walk', title: 'Walk', body: 'Travel there at about 5 km/h.' },
  { value: 'cycle', title: 'Cycle', body: 'Travel there at about 18 km/h.' },
  { value: 'drive', title: 'Drive', body: 'Travel there at about 50 km/h.' },
];

function Step({ done, title, children, optional }: { done: boolean; title: string; children: ReactNode; optional?: boolean }) {
  return (
    <li className="flex gap-3 px-4 py-4">
      <span
        aria-hidden
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${done ? 'border-cere bg-cere text-falcon' : 'border-line'}`}
      >
        {done && <Check size={16} strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {title}
          {optional && <span className="font-normal text-muted"> (recommended)</span>}
          <span className="sr-only">{done ? ' — done' : ' — to do'}</span>
        </p>
        {!done && <div className="mt-1 text-sm text-muted">{children}</div>}
      </div>
    </li>
  );
}

function Setup({ status }: { status: SystemStatus }) {
  const refresh = useSystem((s) => s.refresh);
  const set = useSystem((s) => s.set);
  return (
    <ol className="mt-3 divide-y divide-line rounded-3xl border border-line bg-surface">
      <Step done={status.developerOptions} title="1. Turn on Developer options">
        <p>Open <b>About phone</b> and tap <b>Build number</b> seven times, then come back here.</p>
        <Button className="mt-2" onClick={() => SystemLocation.openDeveloperSettings()}>Open About phone</Button>
      </Step>
      <Step done={status.mockAppSelected} title="2. Choose Falcon Perch as the mock location app">
        <p>
          In <b>Developer options</b>, scroll to <b>Select mock location app</b> and pick <b>Falcon Perch</b>. This is what lets it
          replace your location for every app.
        </p>
        <Button className="mt-2" disabled={!status.developerOptions} onClick={() => SystemLocation.openDeveloperSettings()}>
          Open Developer options
        </Button>
      </Step>
      <Step done={status.locationPermission === 'granted'} title="3. Allow location access" optional>
        <p>
          Needed to override Google Play services, which is where Google Maps and most apps get location. Falcon Perch never
          stores or sends your real location.
        </p>
        <Button
          className="mt-2"
          onClick={async () => {
            if (status.locationPermission === 'denied') await SystemLocation.openAppSettings();
            else set(await SystemLocation.requestLocationPermission());
          }}
        >
          {status.locationPermission === 'denied' ? 'Open app settings' : 'Allow location'}
        </Button>
      </Step>
      <Step done={status.notificationPermission === 'granted'} title="4. Allow notifications" optional>
        <p>A quiet notification shows while your location is replaced, with a Stop button.</p>
        <Button className="mt-2" onClick={async () => set(await SystemLocation.requestNotificationPermission())}>
          Allow notifications
        </Button>
      </Step>
      <li className="px-4 py-3">
        <Button variant="quiet" onClick={() => refresh()}>I’ve done this — check again</Button>
      </li>
    </ol>
  );
}

/** The "System-wide location" section of Settings. */
export function SystemWideSettings() {
  const { perch, systemWide, setSystemWide, travel, setTravel } = useSettings();
  const status = useSystem((s) => s.status);

  if (!isAndroidApp) {
    return (
      <section className="mb-8 max-w-[65ch] px-5">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Globe2 size={20} aria-hidden /> Hide your location from every app
        </h2>
        <p className="mt-2">
          Websites can’t change your phone’s location. The <b>Falcon Perch Android app</b> can: it replaces your location for the
          whole phone, so Google Maps and every other app see your perch instead of where you really are.
        </p>
        <a
          href={APK_URL}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-cere px-4 font-bold text-falcon hover:brightness-95"
        >
          <Download size={18} aria-hidden /> Download the Android app (APK)
        </a>
        <p className="mt-3 text-sm text-muted">
          iPhone: Apple doesn’t let apps change the location other apps see, so this isn’t possible on iOS.
        </p>
      </section>
    );
  }

  if (!status) return null;
  const ready = isReady(status);
  const live = systemWide && status.running;

  return (
    <section className="mb-8 px-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Globe2 size={20} aria-hidden /> System-wide location
      </h2>
      <p className="mt-1 max-w-[60ch] text-muted">
        Replace your phone’s location with your perch, so Google Maps and every other app see the perch instead of where you
        really are.
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-3xl border border-line bg-surface px-4 py-4">
        <div className="min-w-0">
          <p className="font-bold">Apply my perch to all apps</p>
          <p className="text-sm text-muted">
            {!ready
              ? 'Finish the setup steps below first.'
              : !perch
                ? 'Choose a perch on the map first.'
                : live
                  ? `On. Apps see ${perch.label || 'your perch'}.`
                  : 'Off. Apps can see your real location.'}
          </p>
        </div>
        <Switch
          label="Apply my perch to all apps"
          checked={systemWide}
          disabled={(!ready || !perch) && !systemWide}
          onChange={setSystemWide}
        />
      </div>

      {(!ready || status.locationPermission !== 'granted' || status.notificationPermission !== 'granted') && <Setup status={status} />}

      {live && (
        <ul className="mt-3 space-y-1 text-sm">
          <li>
            Android providers replaced: <span className="text-muted">{status.providers.join(', ') || 'none'}</span>
          </li>
          <li>
            Google Play services (Google Maps and most apps):{' '}
            <span className={status.fusedActive ? 'text-muted' : 'font-bold text-danger'}>
              {status.fusedActive
                ? 'replaced'
                : !status.playServices
                  ? 'not installed on this phone'
                  : status.locationPermission !== 'granted'
                    ? 'not replaced: allow location access (step 3)'
                    : 'not replaced: Play services refused'}
            </span>
          </li>
        </ul>
      )}

      {!status.locationServicesOn && (
        <p className="mt-3 flex items-start gap-2 text-sm">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden />
          <span>
            Location is switched off on this phone, so apps get no location at all.{' '}
            <button type="button" className="font-bold underline underline-offset-4" onClick={() => SystemLocation.openLocationSettings()}>
              Turn it on
            </button>{' '}
            for apps to see your perch.
          </span>
        </p>
      )}

      <fieldset className="mt-5">
        <legend className="font-bold">When you change your perch</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {travelOptions.map((t) => (
            <label
              key={t.value}
              className={`cursor-pointer rounded-2xl border px-3 py-3 ${travel === t.value ? 'border-ink bg-surface' : 'border-line'}`}
            >
              <input
                type="radio"
                name="travel"
                value={t.value}
                checked={travel === t.value}
                onChange={() => setTravel(t.value)}
                className="sr-only"
              />
              <span className="block font-bold">{t.title}</span>
              <span className="block text-sm text-muted">{t.body}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">Travelling moves your location smoothly, like a real trip, instead of jumping across the map.</p>
      </fieldset>

      <div className="mt-5 max-w-[65ch] rounded-3xl border border-line p-4 text-sm">
        <p className="font-bold">Other ways you can still be located</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>
            <b className="text-ink">Your IP address.</b> Websites and apps can estimate your city from your connection. Use a
            trusted VPN with a server near your perch.
          </li>
          <li>
            <b className="text-ink">Your Google account.</b> Pause Timeline (Location History) and Web &amp; App Activity, and turn
            off Wi‑Fi and Bluetooth scanning under Location services.
          </li>
          <li>
            <b className="text-ink">Your mobile carrier.</b> The network always knows which towers your phone uses.
          </li>
          <li>
            <b className="text-ink">Detection.</b> Android marks replaced locations, so some apps (banking, games, ride-hailing)
            can tell and may refuse to work.
          </li>
          <li>
            <b className="text-ink">Emergencies.</b> Tap <b>Stop</b> in the notification before calling emergency services, so
            responders can find you.
          </li>
        </ul>
      </div>
    </section>
  );
}
