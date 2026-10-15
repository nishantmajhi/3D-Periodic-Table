'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function AtomAnimator({ animatedAtomsRef }) {
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    elapsed.current += delta;
    animatedAtomsRef.current.forEach((a) => a.userData.update?.(elapsed.current));
  });
  return null;
}
