'use client';
import { useFrame } from '@react-three/fiber';
import { useCameraStore } from '@/store/cameraStore';
import { allSharedMaterials } from '@/three/materialCache';

export default function RevealSync() {
  useFrame(() => {
    const revealT = useCameraStore.getState().revealT;
    for (const entry of allSharedMaterials()) {
      entry.fillMat.opacity = entry.fillOpacity * revealT;
      entry.edgeMat.opacity = entry.edgeOpacity * revealT;
    }
  });
  return null;
}
