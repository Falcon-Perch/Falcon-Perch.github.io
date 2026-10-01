import { create } from 'zustand';
import { SystemLocation, isAndroidApp, type SystemStatus } from '../location/systemLocation';

interface SystemState {
  status: SystemStatus | null;
  refresh: () => Promise<SystemStatus | null>;
  set: (status: SystemStatus) => void;
}

/** Live status of the native system-wide location service. Never persisted. */
export const useSystem = create<SystemState>()((set) => ({
  status: null,
  refresh: async () => {
    if (!isAndroidApp) return null;
    try {
      const status = await SystemLocation.getStatus();
      set({ status });
      return status;
    } catch {
      return null;
    }
  },
  set: (status) => set({ status }),
}));
