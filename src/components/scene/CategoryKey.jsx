'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import { CATEGORY_KEY_LAYOUT, CATEGORY_COLORS } from '@/data/elements';
import { buildKeyTexture } from '@/three/textures';

export default function CategoryKey() {
  const tex = useMemo(() => buildKeyTexture(CATEGORY_COLORS), []);
  const { w, h, x, z } = CATEGORY_KEY_LAYOUT;
  const geo = useMemo(() => new THREE.PlaneGeometry(w, h), []);

  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.05, z]}>
      <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}
