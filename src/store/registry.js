// Plain module-level registry (deliberately not zustand — this is read once
// per pointer event by a manual THREE.Raycaster, not something components
// need to re-render in response to). Tile/Pillar components push their group
// ref in on mount and remove it on unmount; IsotopeCube components register
// into a separate list that's cleared/rebuilt each time the popped cuboid
// changes.

export const tileRegistry = [];

export function registerTile(obj3d) {
  tileRegistry.push(obj3d);
}
export function unregisterTile(obj3d) {
  const i = tileRegistry.indexOf(obj3d);
  if (i !== -1) tileRegistry.splice(i, 1);
}
export function findTileBySymbol(sym) {
  return tileRegistry.find((t) => t.userData?.el?.sym === sym && !t.userData?.isMarker) || null;
}

// What a pointer can hit right now. three's Raycaster ignores `visible`, so
// without this the pillar cubes -- hidden until the view is tilted -- still
// answer clicks and hovers through the gaps between the floor tiles, and so
// do isotope cubes that have faded out.
export function hittable(objects) {
  return objects.filter((o) => o.visible);
}

export let isotopeCubeRegistry = [];

export function setIsotopeCubeRegistry(list) {
  isotopeCubeRegistry = list;
}
export function clearIsotopeCubeRegistry() {
  isotopeCubeRegistry = [];
}

// Hits on solid things only: boxes and label sprites, not outlines. three
// counts a ray as hitting a line when it passes within
// raycaster.params.Line.threshold of it -- 1 world unit by default -- and
// the floor tiles are 1.05 apart, so every tile's edge outline caught rays
// aimed at its neighbours, and the one nearest the camera won. Aimed at the
// middle of Fe, a click opened Rh.
export function solidHits(hits) {
  return hits.filter((h) => !h.object.isLine);
}
