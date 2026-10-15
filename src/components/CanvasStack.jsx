'use client';
import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import CameraRig from './CameraRig';
import HitLayer from './HitLayer';
import SceneLights from './scene/SceneLights';
import TableScene from './scene/TableScene';
import PoppedCuboid from './scene/PoppedCuboid';
import AtomAnimator from './scene/AtomAnimator';
import Hud from './ui/Hud';
import BackButton from './ui/BackButton';
import DetailPanel from './ui/DetailPanel';
import Toast from './ui/Toast';
import AccessibleOverlay from './ui/AccessibleOverlay';
import useDeepLink from '@/hooks/useDeepLink';

// Both canvases render with `events={null}` — all pointer interaction goes
// through the single HitLayer DOM div (manual raycasting against the shared
// registries), matching the prototype's architecture and avoiding two
// independent, out-of-sync R3F event systems.
const CAMERA_PROPS = { fov: 52, near: 0.1, far: 100, position: [0, 9, 15] };

// initialTarget: null | { symbol } | { symbol, mass } — set by the
// /element/[symbol] and /element/[symbol]/isotope/[mass] routes so a shared
// link lands directly on that element/isotope. See useDeepLink.js and
// three/urlSync.js for how the URL stays in sync as the user then interacts
// (via the browser History API directly, not Next's router, so navigating
// never remounts these live WebGL canvases).
export default function CanvasStack({ initialTarget = null }) {
  const blurOverlayRef = useRef(null);
  const animatedAtomsRef = useRef([]);
  useDeepLink(initialTarget);

  return (
    <div className="stage">
      <Canvas
        events={null}
        gl={{ antialias: true }}
        camera={CAMERA_PROPS}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        onCreated={({ gl }) => gl.setClearColor(0x090c11, 1)}
        aria-hidden="true"
      >
        <CameraRig />
        <SceneLights />
        <TableScene />
      </Canvas>

      <div id="blur-overlay" ref={blurOverlayRef} />

      <Canvas
        events={null}
        gl={{ antialias: true, alpha: true }}
        camera={CAMERA_PROPS}
        style={{ position: 'absolute', inset: 0, zIndex: 3 }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        aria-hidden="true"
      >
        <CameraRig />
        <SceneLights />
        <PoppedCuboid blurOverlayRef={blurOverlayRef} animatedAtomsRef={animatedAtomsRef} />
        <AtomAnimator animatedAtomsRef={animatedAtomsRef} />
      </Canvas>

      <HitLayer />
      <Hud />
      <BackButton />
      <DetailPanel />
      <Toast />
      <AccessibleOverlay />
    </div>
  );
}
