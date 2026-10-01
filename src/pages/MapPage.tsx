import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Crosshair, LocateFixed } from 'lucide-react';
import MapView, { type FlyTarget } from '../components/MapView';
import SearchBar from '../components/SearchBar';
import { DraftCard, PerchCard } from '../components/PerchCard';
import { Button } from '../components/ui';
import { db } from '../db/db';
import { formatLatLng, osmLink, type LatLng } from '../lib/geo';
import { getLocation, requestRealLocation } from '../location/locationManager';
import type { Fix } from '../location/types';
import { useSettings } from '../store/settings';
import { toast } from '../store/toast';

type Draft = LatLng & { label?: string };

// Real fixes live in memory only for this session — never in storage.
let sessionReal: Fix | null = null;

export default function MapPage() {
  const { perch, setPerch } = useSettings();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [real, setReal] = useState<Fix | null>(sessionReal);
  const [fly, setFly] = useState<FlyTarget | null>(null);

  const savedMatch = useLiveQuery(
    () => (perch ? db.places.filter((p) => p.lat === perch.lat && p.lng === perch.lng).first() : undefined),
    [perch?.lat, perch?.lng],
  );

  const flyTo = (p: LatLng, zoom?: number) => setFly({ ...p, zoom, key: Date.now() });

  const keepReal = (fix: Fix | null) => {
    sessionReal = fix;
    setReal(fix);
  };

  async function locate() {
    try {
      const fix = await getLocation('center the map on your location');
      if (!fix) {
        if (!useSettings.getState().perch && useSettings.getState().mode === 'perch') {
          toast('Set a perch first, or use “Start from my GPS once”.');
        }
        return;
      }
      if (fix.source === 'real') keepReal(fix);
      flyTo(fix, 15);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  async function perchFromGps() {
    try {
      const fix = await requestRealLocation('set your perch from GPS');
      if (!fix) return;
      keepReal(fix);
      setDraft({ lat: fix.lat, lng: fix.lng, label: 'From GPS' });
      flyTo(fix, 15);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  async function share() {
    const fix = await getLocation('share your location').catch((err) => {
      toast((err as Error).message, 'error');
      return null;
    });
    if (!fix) return;
    const text = `${fix.label ?? 'Location'}: ${formatLatLng(fix)}`;
    const url = osmLink(fix);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Falcon Perch', text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast(fix.source === 'perch' ? 'Perch link copied.' : 'Location link copied.');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast('Couldn’t share. Copy the coordinates below instead.', 'error');
    }
  }

  async function savePlace(name: string) {
    if (!perch) return;
    const id = await db.places.add({ name, lat: perch.lat, lng: perch.lng, createdAt: Date.now(), lastUsedAt: Date.now() });
    setPerch({ ...perch, label: name, placeId: id });
    toast(`Saved “${name}” to Places.`);
  }

  function confirmDraft() {
    if (!draft) return;
    setPerch({ lat: draft.lat, lng: draft.lng, label: draft.label ?? 'Dropped pin' });
    setDraft(null);
    toast('Perch set. Falcon Perch will use this location.');
  }

  return (
    <div className="absolute inset-0">
      <MapView perch={perch} draft={draft} real={real} flyTarget={fly} onTap={(p) => setDraft(p)} />
      <SearchBar
        onPick={(p) => {
          setDraft(p);
          flyTo(p, 14);
        }}
      />

      <button
        type="button"
        onClick={locate}
        aria-label="Center the map on my location"
        title="Center the map on my location"
        className="absolute top-[calc(max(0.75rem,env(safe-area-inset-top))+4rem)] right-3 z-[1100] grid size-12 place-items-center rounded-full border border-line bg-surface text-ink shadow-md"
      >
        <Crosshair size={22} aria-hidden />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1100] px-3 pb-3">
        <div className="pointer-events-auto mx-auto max-w-xl rounded-[1.75rem] border border-line bg-surface p-5 shadow-[0_-2px_24px_rgb(23_34_43/0.18)]">
          {draft ? (
            <DraftCard draft={draft} onConfirm={confirmDraft} onCancel={() => setDraft(null)} />
          ) : perch ? (
            <PerchCard
              key={`${perch.lat},${perch.lng}`}
              perch={perch}
              saved={!!savedMatch}
              onSave={savePlace}
              onShare={share}
            />
          ) : (
            <section aria-label="Choose a perch">
              <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-tight">Choose your perch</h1>
              <p className="mt-1 max-w-[52ch] text-muted">
                Tap the map, search a place, or type coordinates. Falcon Perch uses this location instead of
                your real one.
              </p>
              <Button className="mt-4" icon={<LocateFixed size={18} aria-hidden />} onClick={perchFromGps}>
                Start from my GPS once
              </Button>
            </section>
          )}
          {real && !draft && (
            <p className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-sm text-muted">
              <span>Real location shown for this session only.</span>
              <button type="button" className="font-bold text-ink underline underline-offset-4" onClick={() => keepReal(null)}>
                Hide it
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
