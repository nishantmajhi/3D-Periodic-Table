import { create } from 'zustand';

let timer = null;

export const useToastStore = create((set) => ({
  message: '',
  visible: false,
  show(message) {
    clearTimeout(timer);
    set({ message, visible: true });
    timer = setTimeout(() => set({ visible: false }), 1800);
  },
}));
