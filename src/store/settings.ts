import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LatLng } from '../lib/geo';

export type Mode = 'perch' | 'ask';

export interface Perch extends LatLng {
  label: string;
  placeId?: number;
}

interface SettingsState {
  mode: Mode;
  perch: Perch | null;
  setMode: (mode: Mode) => void;
  setPerch: (perch: Perch | null) => void;
}

export const SETTINGS_KEY = 'falcon-perch-settings';

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      mode: 'perch',
      perch: null,
      setMode: (mode) => set({ mode }),
      setPerch: (perch) => set({ perch }),
    }),
    { name: SETTINGS_KEY, version: 1 },
  ),
);
