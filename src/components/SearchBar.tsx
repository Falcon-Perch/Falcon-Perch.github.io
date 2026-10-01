import { useRef, useState, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import { parseCoordinates, type LatLng } from '../lib/geo';
import { searchPlaces, type SearchResult } from '../lib/search';

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function SearchBar({ onPick }: { onPick: (p: LatLng & { label: string }) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const abortRef = useRef<AbortController | null>(null);

  const reset = () => {
    abortRef.current?.abort();
    setResults([]);
    setStatus('idle');
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = query.trim();
    const coords = parseCoordinates(text);
    if (coords) {
      onPick({ ...coords, label: 'Typed coordinates' });
      reset();
      return;
    }
    if (text.length < 3) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    try {
      setResults(await searchPlaces(text, controller.signal));
      setStatus('done');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setStatus('error');
    }
  }

  const open = status !== 'idle';

  return (
    <div className="absolute inset-x-0 top-0 z-[1100] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <form role="search" onSubmit={submit} className="mx-auto max-w-xl">
        <label htmlFor="place-search" className="sr-only">
          Search a place or enter coordinates
        </label>
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface pr-1.5 pl-4 shadow-md focus-within:border-ink focus-within:ring-3 focus-within:ring-cere">
          <Search size={18} aria-hidden className="shrink-0 text-muted" />
          <input
            id="place-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a place or type 6.9271, 79.8612"
            className="min-h-12 min-w-0 flex-1 bg-transparent text-ink outline-none focus-visible:outline-none placeholder:text-muted"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                reset();
              }}
              className="grid size-10 place-items-center rounded-full text-muted"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </form>

      {open && (
        <div className="sheet-enter mx-auto mt-2 max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
          {status === 'loading' && <p className="px-4 py-3 text-muted">Searching OpenStreetMap…</p>}
          {status === 'error' && (
            <p className="px-4 py-3 text-danger">Search didn’t respond. Check your connection, or type coordinates instead.</p>
          )}
          {status === 'done' && results.length === 0 && (
            <p className="px-4 py-3 text-muted">No places matched. Try a town name, or type coordinates.</p>
          )}
          {results.length > 0 && (
            <ul className="max-h-72 divide-y divide-line overflow-y-auto">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-bg"
                    onClick={() => {
                      onPick({ lat: r.lat, lng: r.lng, label: r.name });
                      reset();
                    }}
                  >
                    <span className="block font-bold">{r.name}</span>
                    <span className="block truncate text-sm text-muted">{r.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-line px-4 py-2 text-xs text-muted">
            Only the text you type is sent to OpenStreetMap — never your location.
          </p>
        </div>
      )}
    </div>
  );
}
