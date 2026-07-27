import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  add: (type: ToastType, message: string) => void;
  remove: (id: string) => void;
}

let counter = 0;
const TOAST_TTL_MS = 4000;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (type, message) => {
    counter += 1;
    const id = `t${counter}`;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, TOAST_TTL_MS);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Fire-and-forget toast helpers, callable from anywhere (not just components). */
export const toast = {
  success: (message: string) => useToastStore.getState().add("success", message),
  error: (message: string) => useToastStore.getState().add("error", message),
  info: (message: string) => useToastStore.getState().add("info", message),
};
