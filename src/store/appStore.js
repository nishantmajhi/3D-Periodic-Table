import { create } from 'zustand';

// state: 'overview' | 'moving' | 'popped' | 'detail'
// This store is a READ MODEL for React-rendered UI (HUD state line, back
// button visibility, detail panel content). The actual GSAP-driven Three.js
// animation lives in popController.js and calls setState()/setActiveEl()/
// setDetailIsotope() at the same points the prototype's setState() calls
// happened -- this store doesn't drive the animation, it reflects it.
export const useAppStore = create((set) => ({
  state: 'overview',
  activeEl: null, // {z, sym, name, weight, category}
  detailIsotope: null, // the isotope object once in 'detail' state

  setState(state) { set({ state }); },
  setActiveEl(activeEl) { set({ activeEl }); },
  setDetailIsotope(detailIsotope) { set({ detailIsotope }); },
}));
