'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TILE, ELEMENTS_BY_SYMBOL, categoryOf, PILLAR_CUBE_W, PILLAR_CUBE_H, pillarY } from '@/data/elements';
import { tileLabelTexture } from '@/three/textures';
import { useCameraStore } from '@/store/cameraStore';
import { registerTile, unregisterTile } from '@/store/registry';
import { getSharedMaterials } from '@/three/materialCache';

const BOX_OPACITY = 0.96;
const EDGES_OPACITY = 0.45;

// PERF: every pillar cube (all 30 lanthanide/actinide elements) is the same
// size -- shared module-level geometry instead of one BoxGeometry per cube.
const CUBE_GEO = new THREE.BoxGeometry(PILLAR_CUBE_W, PILLAR_CUBE_H, PILLAR_CUBE_W);
const CUBE_EDGES_GEO = new THREE.EdgesGeometry(CUBE_GEO);

function PillarCube({ sym, index, color, originPosition }) {
  const groupRef = useRef(null);
  const spriteMatRef = useRef(null);

  const tex = useMemo(() => tileLabelTexture(sym, null), [sym]);
  const el = useMemo(() => ({ ...ELEMENTS_BY_SYMBOL[sym], category: categoryOf(sym) }), [sym]);
  // PERF: box/edge materials shared by color across all 30 pillar cubes (only
  // 2 colors: lanthanide, actinide) and updated centrally by <RevealSync/>.
  // The sprite material can't be shared since each cube has a unique label
  // texture, so its opacity is still written per-instance below -- 30 writes
  // is cheap on its own, it's the box/edge materials (previously another 60
  // writes, now 0 extra) that were worth consolidating.
  const { fillMat, edgeMat } = useMemo(
    () => getSharedMaterials('pillar', color, BOX_OPACITY, EDGES_OPACITY),
    [color]
  );

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.userData = { el, isMarker: false };
    registerTile(g);
    return () => unregisterTile(g);
  }, [el]);

  useFrame(() => {
    const revealT = useCameraStore.getState().revealT;
    const g = groupRef.current;
    if (!g) return;
    g.visible = revealT > 0.01;
    if (spriteMatRef.current) spriteMatRef.current.opacity = revealT;
  });

  return (
    <group
      ref={groupRef}
      position={[originPosition.x, pillarY(index), originPosition.z]}
      visible={false}
    >
      <mesh geometry={CUBE_GEO} material={fillMat} />
      <lineSegments geometry={CUBE_EDGES_GEO} material={edgeMat} />
      <sprite scale={[TILE * 0.7, TILE * 0.7, 1]}>
        <spriteMaterial ref={spriteMatRef} map={tex} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

export default function Pillar({ originPosition, symbols, color }) {
  return (
    <>
      {symbols.map((sym, i) => (
        <PillarCube key={sym} sym={sym} index={i} color={color} originPosition={originPosition} />
      ))}
    </>
  );
}
