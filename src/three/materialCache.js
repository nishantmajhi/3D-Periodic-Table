import * as THREE from 'three';

const cache = new Map(); // "type:color" -> { fillMat, edgeMat, fillOpacity, edgeOpacity }

// Visual polish pass: fills are now real lit THREE.MeshStandardMaterial
// (so they pick up SceneLights.jsx and read as solid, shaded blocks)
// instead of the earlier unlit, translucent "blueprint" look. Edges are a
// fixed dark neutral outline rather than a bright category-colored
// wireframe line -- enough to keep adjacent same-colored geometry (e.g.
// stacked isotope-stub cubes) readable without the scene reading as
// wireframe again.
export const EDGE_COLOR = 0x0a0e14;

export function getSharedMaterials(type, color, fillOpacity, edgeOpacity) {
  const key = `${type}:${color}`;
  if (!cache.has(key)) {
    cache.set(key, {
      fillMat: new THREE.MeshStandardMaterial({
        color,
        transparent: true, // stays true even at opacity 1 -- RevealSync fades this every frame
        opacity: fillOpacity,
        metalness: 0.3,
        roughness: 0.55,
      }),
      edgeMat: new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: edgeOpacity }),
      fillOpacity,
      edgeOpacity,
    });
  }
  return cache.get(key);
}

export function allSharedMaterials() {
  return cache.values();
}
