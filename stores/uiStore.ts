import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface UIState {
  toastQueue: Toast[];
  isGlobalLoading: boolean;
}

interface UIActions {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState & UIActions>((set, get) => ({
  toastQueue: [],
  isGlobalLoading: false,

  showToast: (message, type = 'info', duration = 3000) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({
      toastQueue: [...state.toastQueue, { id, message, type, duration }],
    }));
    setTimeout(() => {
      get().dismissToast(id);
    }, duration);
  },

  dismissToast: (id) => {
    set((state) => ({
      toastQueue: state.toastQueue.filter((t) => t.id !== id),
    }));
  },

  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),
}));
