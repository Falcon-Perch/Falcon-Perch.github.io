import { useToast } from '../store/toast';

export default function Toaster() {
  const { message, tone, hide } = useToast();
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(max(0.75rem,env(safe-area-inset-top))+4rem)] z-[3000] flex justify-center px-4">
      <div
        role={tone === 'error' ? 'alert' : 'status'}
        className={`sheet-enter pointer-events-auto flex max-w-md items-start mr-14 gap-3 rounded-2xl px-4 py-3 shadow-lg ${
          tone === 'error' ? 'bg-danger text-surface' : 'bg-falcon text-[#e6ecf0]'
        }`}
      >
        <span className="flex-1">{message}</span>
        <button type="button" onClick={hide} className="font-bold underline underline-offset-4">
          Dismiss
        </button>
      </div>
    </div>
  );
}
