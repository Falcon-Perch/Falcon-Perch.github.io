import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LatLng } from '../lib/geo';
import type { Travel } from '../location/systemLocation';

export type Mode = 'perch' | 'ask';

export interface Perch extends LatLng {
  label: string;
  placeId?: number;
}

interface SettingsState {
  mode: Mode;
  perch: Perch | null;
  /** Android app only: publish the perch to the whole phone, so other apps see it too. */
  systemWide: boolean;
  /** How the system-wide location moves when you change your perch. */
  travel: Travel;
  setMode: (mode: Mode) => void;
  setPerch: (perch: Perch | null) => void;
  setSystemWide: (on: boolean) => void;
  setTravel: (travel: Travel) => void;
}

export const SETTINGS_KEY = 'falcon-perch-settings';

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      mode: 'perch',
      perch: null,
      systemWide: false,
      travel: 'jump',
      setMode: (mode) => set({ mode }),
      setPerch: (perch) => set({ perch }),
      setSystemWide: (systemWide) => set({ systemWide }),
      setTravel: (travel) => set({ travel }),
    }),
    { name: SETTINGS_KEY, version: 1 },
  ),
);
