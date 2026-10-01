import { useEffect, useRef } from 'react';
import { useAsk } from '../store/ask';
import { Button } from './ui';

export default function AskDialog() {
  const { pending, answer } = useAsk();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (pending && !d.open) d.showModal();
    if (!pending && d.open) d.close();
  }, [pending]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        answer('cancel');
      }}
      aria-labelledby="ask-title"
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-3xl bg-surface p-0 text-ink backdrop:bg-falcon/60"
    >
      {pending && (
        <div className="p-6">
          <h2 id="ask-title" className="font-display text-2xl font-bold tracking-tight">
            {pending.realOnly ? 'Use your real location once?' : 'Which location should Falcon Perch use?'}
          </h2>
          <p className="mt-2 text-muted">
            {pending.realOnly
              ? `Your browser will be asked for your current position to ${pending.purpose}. It’s used once; the coordinates aren’t saved.`
              : `Falcon Perch needs a location to ${pending.purpose}.`}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {!pending.realOnly && (
              <Button
                variant="primary"
                disabled={!pending.hasPerch}
                onClick={() => answer('perch')}
                autoFocus
              >
                {pending.hasPerch ? 'Use my perch' : 'Use my perch (none set yet)'}
              </Button>
            )}
            <Button
              variant={pending.realOnly ? 'primary' : 'secondary'}
              onClick={() => answer('real')}
              autoFocus={pending.realOnly}
            >
              Use real location
            </Button>
            <Button variant="quiet" onClick={() => answer('cancel')}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
