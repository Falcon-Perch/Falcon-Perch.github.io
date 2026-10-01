import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db, type Place } from '../db/db';
import { formatLatLng } from '../lib/geo';
import { useSettings } from '../store/settings';
import { Button, PageHeader } from '../components/ui';

export default function PlacesPage() {
  const places = useLiveQuery(() => db.places.toArray().then((all) => all.sort((a, b) => (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt))));
  const { perch, setPerch } = useSettings();
  const navigate = useNavigate();

  async function use(place: Place) {
    await db.places.update(place.id!, { lastUsedAt: Date.now() });
    setPerch({ lat: place.lat, lng: place.lng, label: place.name, placeId: place.id });
    navigate('/');
  }

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title="Places" intro="Your saved perches. Switch between them in one tap." />
      {places && places.length === 0 && (
        <div className="px-5">
          <p className="max-w-[52ch] text-muted">
            No saved places yet. Set a perch on the map, then choose “Save place” to keep it here.
          </p>
          <Button className="mt-4" variant="primary" onClick={() => navigate('/')}>Go to the map</Button>
        </div>
      )}
      {places && places.length > 0 && (
        <ul className="mx-3 mb-6 divide-y divide-line rounded-3xl border border-line bg-surface">
          {places.map((p) => (
            <PlaceRow
              key={p.id}
              place={p}
              active={!!perch && perch.lat === p.lat && perch.lng === p.lng}
              onUse={() => use(p)}
              onRename={async (name) => {
                await db.places.update(p.id!, { name });
                if (perch && perch.lat === p.lat && perch.lng === p.lng) setPerch({ ...perch, label: name });
              }}
              onDelete={() => db.places.delete(p.id!)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PlaceRow({
  place,
  active,
  onUse,
  onRename,
  onDelete,
}: {
  place: Place;
  active: boolean;
  onUse: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(place.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li className="px-4 py-4">
      {editing ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onRename(name.trim());
            setEditing(false);
          }}
        >
          <label htmlFor={`rename-${place.id}`} className="sr-only">New name</label>
          <input
            id={`rename-${place.id}`}
            autoFocus
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-bg px-4 outline-none focus:border-ink"
          />
          <Button variant="primary" type="submit">Rename</Button>
          <Button variant="quiet" onClick={() => setEditing(false)}>Cancel</Button>
        </form>
      ) : (
        <>
          <div className="flex items-start gap-3">
            {active && <span aria-hidden className="fp-eye mt-0.5 size-6! border-[5px]! shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {place.name}
                {active && <span className="sr-only"> (current perch)</span>}
              </p>
              <p className="tabular text-sm text-muted">{formatLatLng(place, 4)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant={active ? 'secondary' : 'primary'} disabled={active} onClick={onUse}>
              {active ? 'Current perch' : 'Perch here'}
            </Button>
            <Button variant="quiet" onClick={() => setEditing(true)}>Rename</Button>
            {confirmDelete ? (
              <>
                <Button variant="danger" onClick={onDelete}>Delete “{place.name}”</Button>
                <Button variant="quiet" onClick={() => setConfirmDelete(false)}>Keep</Button>
              </>
            ) : (
              <Button variant="quiet" onClick={() => setConfirmDelete(true)}>Delete</Button>
            )}
          </div>
        </>
      )}
    </li>
  );
}
