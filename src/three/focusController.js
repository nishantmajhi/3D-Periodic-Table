// Mirrors popController.js's pattern: a plain mutable registry, not a
// zustand store, because it's imperative Three.js state (a GSAP-driven
// mesh highlight), not something React components re-render in response to.
//
// HitLayer owns the actual highlight implementation (the same GSAP hover
// scale-up used for mouse hover) and wires its `setHovered` function in
// here. AccessibleOverlay (keyboard nav / roving tabindex grid) calls
// `focusController.highlight(obj3d)` when a grid button receives keyboard
// focus, so a sighted keyboard-only user sees the exact same visual
// feedback a mouse user gets on hover -- one highlight mechanism, two ways
// to drive it.
export const focusController = {
  highlight: null, // (obj3d | null) => void
};
