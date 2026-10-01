import { useSettings } from '../store/settings';
import { LocationError, type Fix, type LocationProvider } from './types';

export const perchProvider: LocationProvider = {
  async getCurrent(): Promise<Fix> {
    const perch = useSettings.getState().perch;
    if (!perch) throw new LocationError('unavailable', 'No perch is set yet.');
    return { lat: perch.lat, lng: perch.lng, label: perch.label, source: 'perch' };
  },
};
