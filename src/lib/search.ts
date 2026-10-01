import { isValidLatLng, type LatLng } from './geo';

export interface SearchResult extends LatLng {
  id: number;
  name: string;
  detail: string;
}

let lastRequest = 0;

/**
 * Place search via OpenStreetMap Nominatim.
 * Only the typed text is sent — never the user's location. Requests are spaced
 * at least 1 second apart to respect the Nominatim usage policy.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const wait = 1000 - (Date.now() - lastRequest);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '6');

  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data: Array<{ place_id: number; lat: string; lon: string; name?: string; display_name: string }> =
    await res.json();

  return data
    .map((d) => {
      const parts = d.display_name.split(', ');
      return {
        id: d.place_id,
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
        name: d.name || parts[0],
        detail: parts.slice(1).join(', '),
      };
    })
    .filter((r) => isValidLatLng(r.lat, r.lng));
}
