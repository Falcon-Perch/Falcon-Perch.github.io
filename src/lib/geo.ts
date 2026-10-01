export interface LatLng {
  lat: number;
  lng: number;
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * Parses "6.9271, 79.8612", "6.9271 79.8612" or "6.9271°N 79.8612°E".
 * Returns null when the text isn't a coordinate pair.
 */
export function parseCoordinates(input: string): LatLng | null {
  const text = input.trim().toUpperCase();
  const match = text.match(
    /^(-?\d{1,2}(?:\.\d+)?)\s*°?\s*([NS])?\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])?$/,
  );
  if (!match) return null;
  let lat = parseFloat(match[1]);
  let lng = parseFloat(match[3]);
  if (match[2] === 'S') lat = -Math.abs(lat);
  if (match[4] === 'W') lng = -Math.abs(lng);
  return isValidLatLng(lat, lng) ? { lat, lng } : null;
}

export function round(value: number, digits = 5): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function formatLatLng({ lat, lng }: LatLng, digits = 5): string {
  return `${round(lat, digits).toFixed(digits)}, ${round(lng, digits).toFixed(digits)}`;
}

export function formatHemisphere({ lat, lng }: LatLng, digits = 4): { lat: string; lng: string } {
  return {
    lat: `${Math.abs(lat).toFixed(digits)}° ${lat >= 0 ? 'N' : 'S'}`,
    lng: `${Math.abs(lng).toFixed(digits)}° ${lng >= 0 ? 'E' : 'W'}`,
  };
}

export function osmLink({ lat, lng }: LatLng, zoom = 15): string {
  const a = round(lat), b = round(lng);
  return `https://www.openstreetmap.org/?mlat=${a}&mlon=${b}#map=${zoom}/${a}/${b}`;
}

/** Great-circle distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
