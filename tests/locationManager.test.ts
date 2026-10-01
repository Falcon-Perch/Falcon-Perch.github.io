import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Node has no localStorage; zustand's persist needs one.
const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => mem.set(k, v),
  removeItem: (k: string) => mem.delete(k),
});

const geo = { getCurrentPosition: vi.fn() };
vi.stubGlobal('navigator', { geolocation: geo });

const { db } = await import('../src/db/db');
const { useSettings } = await import('../src/store/settings');
const { useAsk } = await import('../src/store/ask');
const { getLocation, requestRealLocation } = await import('../src/location/locationManager');

beforeEach(async () => {
  await db.log.clear();
  geo.getCurrentPosition.mockReset();
  useSettings.setState({ mode: 'perch', perch: { lat: 7.2, lng: 79.84, label: 'Beach' } });
});

const answerNext = (choice: 'perch' | 'real' | 'cancel') =>
  queueMicrotask(() => useAsk.getState().answer(choice));

describe('locationManager', () => {
  it('answers with the perch and never touches GPS in perch mode', async () => {
    const fix = await getLocation('test');
    expect(fix).toMatchObject({ lat: 7.2, lng: 79.84, source: 'perch' });
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect((await db.log.toArray())[0].source).toBe('perch');
  });

  it('returns null and logs when no perch is set', async () => {
    useSettings.setState({ perch: null });
    expect(await getLocation('test')).toBeNull();
    expect((await db.log.toArray())[0].source).toBe('no-perch');
  });

  it('asks in ask mode and can use the real location', async () => {
    useSettings.setState({ mode: 'ask' });
    geo.getCurrentPosition.mockImplementation((ok: PositionCallback) =>
      ok({ coords: { latitude: 1, longitude: 2, accuracy: 30.4 } } as GeolocationPosition),
    );
    answerNext('real');
    const fix = await getLocation('test');
    expect(fix).toMatchObject({ lat: 1, lng: 2, source: 'real', accuracy: 30 });
    const [entry] = await db.log.toArray();
    expect(entry).toMatchObject({ source: 'real', accuracy: 30 });
    expect(entry).not.toHaveProperty('lat');
  });

  it('logs a cancelled explicit GPS request without calling GPS', async () => {
    answerNext('cancel');
    expect(await requestRealLocation('test')).toBeNull();
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect((await db.log.toArray())[0].source).toBe('cancelled');
  });
});
