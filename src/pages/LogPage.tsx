import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LogEntry, type LogSource } from '../db/db';
import { Button, PageHeader } from '../components/ui';

const outcome: Record<LogSource, string> = {
  perch: 'Answered with your perch',
  real: 'Used your real location',
  denied: 'Browser permission blocked',
  unavailable: 'Real location unavailable',
  cancelled: 'You cancelled',
  'no-perch': 'No perch set, nothing shared',
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function LogPage() {
  const entries = useLiveQuery(() => db.log.orderBy('at').reverse().limit(300).toArray());
  const monthAgo = Date.now() - 30 * 86400000;
  const recent = entries?.filter((e) => e.at >= monthAgo) ?? [];
  const realCount = recent.filter((e) => e.source === 'real').length;
  const perchCount = recent.filter((e) => e.source === 'perch').length;

  const groups = new Map<string, LogEntry[]>();
  entries?.forEach((e) => {
    const k = dayLabel(e.at);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  });

  return (
    <div className="h-full overflow-y-auto pb-6">
      <PageHeader title="Privacy log" intro="Every time Falcon Perch needed a location, and what it used. Real coordinates are never written here." />

      <div className="mx-3 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line">
        <div className="bg-surface p-4">
          <p className="tabular font-display text-[2.5rem] leading-none font-bold">{realCount}</p>
          <p className="mt-1 text-sm text-muted">real-location uses in the last 30 days</p>
        </div>
        <div className="bg-surface p-4">
          <p className="tabular font-display text-[2.5rem] leading-none font-bold">{perchCount}</p>
          <p className="mt-1 text-sm text-muted">answered with your perch</p>
        </div>
      </div>

      {entries && entries.length === 0 && (
        <p className="px-5 pt-6 text-muted">Nothing yet. Requests appear here as soon as a feature asks for a location.</p>
      )}

      {[...groups.entries()].map(([day, items]) => (
        <section key={day} className="mt-6">
          <h2 className="px-5 pb-2 font-display text-lg font-bold">{day}</h2>
          <ol className="mx-3 divide-y divide-line rounded-3xl border border-line bg-surface">
            {items.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className={`mt-2 size-2.5 shrink-0 rounded-full ${
                    e.source === 'real' ? 'bg-cere ring-2 ring-falcon' : e.source === 'perch' ? 'bg-muted' : 'border border-muted'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{capitalise(e.purpose)}</p>
                  <p className="text-sm text-muted">
                    {outcome[e.source]}
                    {e.source === 'real' && e.accuracy ? `, about ${e.accuracy} m accuracy` : ''}
                  </p>
                </div>
                <time className="tabular text-sm text-muted" dateTime={new Date(e.at).toISOString()}>
                  {new Date(e.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </time>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {entries && entries.length > 0 && (
        <div className="px-5 pt-6">
          <Button variant="danger" onClick={() => db.log.clear()}>Clear the log</Button>
        </div>
      )}
    </div>
  );
}
