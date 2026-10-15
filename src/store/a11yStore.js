import { create } from 'zustand';

// Backs a visually-hidden aria-live region (see AccessibleOverlay.jsx) that
// narrates state changes for screen-reader users -- the 3D scene itself
// (popping cuboids, dissolving into an atom, etc.) has no text equivalent
// otherwise. Re-announcing the identical string twice in a row is a no-op
// for most screen readers, so callers can announce freely.
export const useA11yStore = create((set) => ({
  message: '',
  announce(message) {
    // Force a change even if the text is identical to last time, so
    // repeated identical announcements (e.g. re-focusing the same cell)
    // still fire for screen readers that dedupe on exact string equality.
    set({ message: '' });
    // Rely on a microtask so React commits the empty string first.
    queueMicrotask(() => set({ message }));
  },
}));
