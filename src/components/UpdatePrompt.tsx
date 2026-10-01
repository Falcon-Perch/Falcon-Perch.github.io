import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <div className="fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[3000] flex justify-center px-4">
      <div role="status" className="sheet-enter flex items-center gap-3 rounded-full bg-falcon py-1.5 pr-1.5 pl-4 text-[#e6ecf0] shadow-lg">
        <span>A new version of Falcon Perch is ready.</span>
        <Button variant="primary" onClick={() => updateServiceWorker(true)}>Reload</Button>
        <button type="button" className="px-2 underline underline-offset-4" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
      </div>
    </div>
  );
}
