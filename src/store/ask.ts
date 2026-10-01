import { create } from 'zustand';

export type AskChoice = 'perch' | 'real' | 'cancel';

interface PendingAsk {
  purpose: string;
  hasPerch: boolean;
  /** true when the user explicitly asked for GPS; the dialog then only confirms. */
  realOnly: boolean;
  resolve: (choice: AskChoice) => void;
}

interface AskState {
  pending: PendingAsk | null;
  ask: (purpose: string, hasPerch: boolean, realOnly?: boolean) => Promise<AskChoice>;
  answer: (choice: AskChoice) => void;
}

export const useAsk = create<AskState>()((set, get) => ({
  pending: null,
  ask: (purpose, hasPerch, realOnly = false) =>
    new Promise<AskChoice>((resolve) => {
      get().pending?.resolve('cancel');
      set({ pending: { purpose, hasPerch, realOnly, resolve } });
    }),
  answer: (choice) => {
    get().pending?.resolve(choice);
    set({ pending: null });
  },
}));
