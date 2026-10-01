import { create } from 'zustand';

interface ToastState {
  message: string | null;
  tone: 'info' | 'error';
  show: (message: string, tone?: 'info' | 'error') => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>()((set) => ({
  message: null,
  tone: 'info',
  show: (message, tone = 'info') => {
    clearTimeout(timer);
    set({ message, tone });
    timer = setTimeout(() => set({ message: null }), tone === 'error' ? 6000 : 3000);
  },
  hide: () => set({ message: null }),
}));

export const toast = (message: string, tone?: 'info' | 'error') => useToast.getState().show(message, tone);
