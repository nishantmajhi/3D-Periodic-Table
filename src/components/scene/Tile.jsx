'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TILE, TILE_H, MARKER_H, CATEGORY_COLORS } from '@/data/elements';
import { tileLabelTexture } from '@/three/textures';
import { registerTile, unregisterTile } from '@/store/registry';
import { EDGE_COLOR } from '@/three/materialCache';

// PERF: only two distinct tile sizes exist across the whole 118-element
// table (normal + the two lanthanide/actinide marker cells), so geometry is
// shared module-level rather than re-created per Tile instance -- avoids
// ~118 redundant BoxGeometry/EdgesGeometry allocations at mount.
const NORMAL_H = TILE_H;
const GEO_CACHE = {};
function getGeo(height) {
  if (!GEO_CACHE[height]) {
    const geo = new THREE.BoxGeometry(TILE, height, TILE);
    GEO_CACHE[height] = { geo, edges: new THREE.EdgesGeometry(geo) };
  }
  return GEO_CACHE[height];
}

export default function Tile({ el, isMarker, position }) {
  const groupRef = useRef(null);
  const color = CATEGORY_COLORS[el.category] ?? 0x888888;
  const height = isMarker ? MARKER_H : NORMAL_H;
  const { geo, edges: edgesGeo } = getGeo(height);

  const label = isMarker ? el.rangeLabel : el.sym;
  const tex = useMemo(() => tileLabelTexture(label, isMarker ? null : el.z), [label, isMarker, el.z]);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.userData = { el, isMarker };
    registerTile(g);
    return () => unregisterTile(g);
  }, [el, isMarker]);

  return (
    <group ref={groupRef} position={position}>
      <mesh geometry={geo} position={[0, height / 2, 0]}>
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.5}
          emissive={isMarker ? color : 0x000000}
          emissiveIntensity={isMarker ? 0.25 : 0}
        />
      </mesh>
      <lineSegments geometry={edgesGeo} position={[0, height / 2, 0]}>
        <lineBasicMaterial color={EDGE_COLOR} transparent opacity={0.4} />
      </lineSegments>
      <sprite scale={[TILE * 0.95, TILE * 0.95, 1]} position={[0, height + 0.02, 0]}>
        <spriteMaterial map={tex} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}
