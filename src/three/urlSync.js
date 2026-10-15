// Deliberately uses window.history.replaceState directly rather than
// next/navigation's router. Going through Next's router would treat this as
// a real route change -- since /, /element/[symbol], and
// /element/[symbol]/isotope/[mass] are distinct page.jsx files, that would
// unmount and remount the whole CanvasStack (and its two live WebGL
// contexts) on every click. Using the History API directly just repaints
// the address bar/updates browser history, leaving the running React tree
// (and the Three.js scene state inside it) completely untouched.

function replace(path) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === path) return;
  window.history.replaceState(null, '', path);
}

export function setUrlOverview() {
  replace('/');
}

export function setUrlElement(sym) {
  replace(`/element/${sym}`);
}

export function setUrlIsotope(sym, mass) {
  replace(`/element/${sym}/isotope/${mass}`);
}
