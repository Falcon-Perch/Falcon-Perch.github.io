import { db, type Place } from '../db/db';
import { isValidLatLng } from './geo';
import { SETTINGS_KEY, useSettings, type Mode, type Perch } from '../store/settings';

interface ExportFile {
  app: 'falcon-perch';
  version: 1;
  exportedAt: string;
  mode: Mode;
  perch: Perch | null;
  places: Omit<Place, 'id'>[];
}

/** Export saved perches and settings. The privacy log is deliberately not included. */
export async function exportData(): Promise<Blob> {
  const { mode, perch } = useSettings.getState();
  const places = (await db.places.toArray()).map(({ id: _id, ...rest }) => rest);
  const file: ExportFile = { app: 'falcon-perch', version: 1, exportedAt: new Date().toISOString(), mode, perch, places };
  return new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
}

export async function importData(text: string): Promise<number> {
  let parsed: ExportFile;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }
  if (parsed?.app !== 'falcon-perch' || !Array.isArray(parsed.places)) {
    throw new Error('That file isn’t a Falcon Perch export.');
  }
  const places = parsed.places
    .filter((p) => typeof p.name === 'string' && isValidLatLng(p.lat, p.lng))
    .map((p) => ({ name: p.name.slice(0, 80), lat: p.lat, lng: p.lng, createdAt: Number(p.createdAt) || Date.now() }));
  await db.places.bulkAdd(places);
  if (parsed.mode === 'perch' || parsed.mode === 'ask') useSettings.getState().setMode(parsed.mode);
  if (parsed.perch && isValidLatLng(parsed.perch.lat, parsed.perch.lng)) {
    useSettings.getState().setPerch({ lat: parsed.perch.lat, lng: parsed.perch.lng, label: String(parsed.perch.label ?? 'Imported perch') });
  }
  return places.length;
}

/** Wipes everything Falcon Perch has stored on this device. */
export async function forgetEverything() {
  await db.delete();
  localStorage.removeItem(SETTINGS_KEY);
  if ('caches' in window) {
    for (const key of await caches.keys()) {
      if (key === 'osm-tiles') await caches.delete(key);
    }
  }
}
