'use client';
import { useAppStore } from '@/store/appStore';

export default function Hud() {
  const state = useAppStore((s) => s.state);
  return (
    <div id="hud">
      <span className="title">3D PERIODIC TABLE</span>
      Drag to orbit · scroll to zoom · click any element to open its isotopes. Press Tab to navigate by keyboard.
      <div className="state">state: {state}</div>
    </div>
  );
}
