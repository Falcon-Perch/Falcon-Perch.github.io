import { LocationError, type Fix, type LocationProvider } from './types';

/**
 * Thin wrapper around the browser Geolocation API.
 * Only ever called by locationManager, and only after the user has confirmed.
 */
export const realProvider: LocationProvider = {
  getCurrent() {
    return new Promise<Fix>((resolve, reject) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        reject(new LocationError('unavailable', 'This browser has no location support.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            source: 'real',
          }),
        (err) =>
          reject(
            err.code === err.PERMISSION_DENIED
              ? new LocationError('denied', 'Location permission is blocked for this site. Allow it in your browser’s site settings.')
              : new LocationError('unavailable', 'Your device could not get a location fix. Try again outdoors or check that location services are on.'),
          ),
        // Low accuracy by default: faster, kinder to the battery, and less precise data in memory.
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
      );
    });
  },
};

export async function getPermissionState(): Promise<PermissionState | 'unsupported'> {
  try {
    if (!navigator.permissions) return 'unsupported';
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unsupported';
  }
}
