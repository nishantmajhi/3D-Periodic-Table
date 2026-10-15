import { create } from 'zustand';

// Ported 1:1 from the prototype's custom orbit camera. Starts near-top-down
// so the table first reads exactly like a flat 2D periodic table; pillars
// fade in only once tilted past PHI_SHOW (see tracker.md — this alone can't
// hide the pillars optically from directly overhead, so pillar opacity is
// also driven by revealT in the scene components).
export const PHI_HIDE = 0.12;
export const PHI_SHOW = 0.55;

export const useCameraStore = create((set, get) => ({
  radius: 17,
  theta: 0,
  phi: PHI_HIDE,
  target: { x: 0, y: 0.2, z: 0 },

  revealT: 0,

  drag(dx, dy) {
    const theta = get().theta - dx * 0.006;
    let phi = get().phi - dy * 0.006;
    phi = Math.max(0.06, Math.min(Math.PI - 0.06, phi));
    const revealT = Math.max(0, Math.min(1, (phi - PHI_HIDE) / (PHI_SHOW - PHI_HIDE)));
    set({ theta, phi, revealT });
  },

  zoom(deltaY) {
    const radius = Math.max(6, Math.min(26, get().radius + deltaY * 0.045));
    set({ radius });
  },
}));

// Applies the current store state to a THREE.PerspectiveCamera. Called
// imperatively (not via a subscribe+re-render) from useFrame in CameraRig,
// once per stacked canvas, every frame — this is what keeps both canvases'
// cameras in lockstep without React re-renders in the hot path.
export function applyCameraState(camera) {
  const { radius, theta, phi, target } = useCameraStore.getState();
  const sinPhi = Math.sin(phi);
  camera.position.x = target.x + radius * sinPhi * Math.sin(theta);
  camera.position.y = target.y + radius * Math.cos(phi);
  camera.position.z = target.z + radius * sinPhi * Math.cos(theta);
  camera.lookAt(target.x, target.y, target.z);

  // lookAt() only updates camera.quaternion -- it does NOT rebuild
  // camera.matrix / camera.matrixWorld. For the real render camera that's
  // invisible because WebGLRenderer.render() force-updates it every frame.
  // But HitLayer's raycasting camera is a standalone THREE.PerspectiveCamera
  // that's never passed to the renderer, so nothing else ever refreshes its
  // matrixWorld -- without this call it raycasts using the *previous*
  // applyCameraState() call's rotation (one step stale), which is exactly
  // what made hover/click targeting feel slightly "off" from the cursor.
  camera.updateMatrixWorld(true);
}
