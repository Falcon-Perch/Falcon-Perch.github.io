import { useState } from 'react';
import { Bookmark, Share2 } from 'lucide-react';
import { formatHemisphere, formatLatLng, type LatLng } from '../lib/geo';
import type { Perch } from '../store/settings';
import { Button } from './ui';

interface DraftProps {
  draft: LatLng & { label?: string };
  onConfirm: () => void;
  onCancel: () => void;
}

function Coordinates({ point, size = 'lg' }: { point: LatLng; size?: 'lg' | 'md' }) {
  const h = formatHemisphere(point);
  return (
    <p
      className={`tabular font-display leading-[1.05] font-medium tracking-tight ${
        size === 'lg' ? 'text-[2.5rem]' : 'text-[1.75rem]'
      }`}
      aria-label={`Latitude ${h.lat}, longitude ${h.lng}`}
    >
      <span className="block">{h.lat}</span>
      <span className="block">{h.lng}</span>
    </p>
  );
}

export function DraftCard({ draft, onConfirm, onCancel }: DraftProps) {
  return (
    <section aria-label="New perch" className="sheet-enter">
      <p className="text-muted">{draft.label ? draft.label : 'Dropped pin'} — not your perch yet</p>
      <Coordinates point={draft} size="md" />
      <div className="mt-4 flex gap-2">
        <Button variant="primary" className="flex-1" onClick={onConfirm}>
          Perch here
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </section>
  );
}

interface PerchProps {
  perch: Perch;
  saved: boolean;
  onSave: (name: string) => void;
  onShare: () => void;
}

export function PerchCard({ perch, saved, onSave, onShare }: PerchProps) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(perch.label);

  return (
    <section aria-label="Your perch">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-muted">
            Your perch{perch.label ? `: ${perch.label}` : ''}
          </p>
          <Coordinates point={perch} />
        </div>
        <span aria-hidden className="fp-eye mt-1 shrink-0" />
      </div>

      {naming ? (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSave(name.trim());
            setNaming(false);
          }}
        >
          <label htmlFor="perch-name" className="sr-only">Name this place</label>
          <input
            id="perch-name"
            autoFocus
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-bg px-4 outline-none focus:border-ink"
          />
          <Button variant="primary" type="submit">Save</Button>
          <Button variant="quiet" onClick={() => setNaming(false)}>Cancel</Button>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" icon={<Share2 size={18} aria-hidden />} onClick={onShare}>
            Share perch
          </Button>
          <Button icon={<Bookmark size={18} aria-hidden />} onClick={() => setNaming(true)} disabled={saved}>
            {saved ? 'Saved' : 'Save place'}
          </Button>
        </div>
      )}
      <p className="mt-3 text-sm text-muted tabular">{formatLatLng(perch)}</p>
    </section>
  );
}
