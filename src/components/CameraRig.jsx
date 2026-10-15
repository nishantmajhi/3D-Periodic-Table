'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { applyCameraState } from '@/store/cameraStore';

export default function CameraRig() {
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    applyCameraState(camera);
  });
  return null;
}
