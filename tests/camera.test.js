// The shared orbit camera: drag, zoom, the tilt that reveals the pillars, and
// the transform both canvases and the raycaster read from it.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { useCameraStore, applyCameraState, PHI_HIDE, PHI_SHOW } from '../src/store/cameraStore.js';

const initial = useCameraStore.getState();
beforeEach(() => useCameraStore.setState({ radius: initial.radius, theta: initial.theta, phi: initial.phi, target: initial.target, revealT: initial.revealT }));
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('it starts near top-down with the pillars hidden', () => {
  const s = useCameraStore.getState();
  assert.equal(s.phi, PHI_HIDE);
  assert.equal(s.revealT, 0);
});

test('dragging down tilts the table and fades the pillars in, fully by PHI_SHOW', () => {
  const { drag } = useCameraStore.getState();
  drag(0, -((PHI_SHOW - PHI_HIDE) / 2) / 0.006);
  close(useCameraStore.getState().revealT, 0.5, 'half way');
  drag(0, -1000);
  assert.equal(useCameraStore.getState().revealT, 1);
});

test('the tilt is clamped short of the poles in both directions', () => {
  const { drag } = useCameraStore.getState();
  drag(0, 100000);
  close(useCameraStore.getState().phi, 0.06, 'top');
  assert.equal(useCameraStore.getState().revealT, 0);
  drag(0, -100000);
  close(useCameraStore.getState().phi, Math.PI - 0.06, 'bottom');
});

test('horizontal drags orbit without limit', () => {
  useCameraStore.getState().drag(10000, 0);
  close(useCameraStore.getState().theta, -60, 'theta');
});

test('zoom is clamped to 6..26', () => {
  const { zoom } = useCameraStore.getState();
  zoom(-1e6);
  assert.equal(useCameraStore.getState().radius, 6);
  zoom(1e6);
  assert.equal(useCameraStore.getState().radius, 26);
});

test('applyCameraState puts the camera on its sphere, looking at the target', () => {
  useCameraStore.setState({ theta: 0.7, phi: 1.1, radius: 12 });
  const cam = new THREE.PerspectiveCamera(52, 1.6, 0.1, 100);
  applyCameraState(cam);
  const t = useCameraStore.getState().target;
  close(cam.position.distanceTo(new THREE.Vector3(t.x, t.y, t.z)), 12, 'distance');
  const dir = cam.getWorldDirection(new THREE.Vector3());
  const toTarget = new THREE.Vector3(t.x, t.y, t.z).sub(cam.position).normalize();
  close(dir.dot(toTarget), 1, 'facing the target');
});

test('applyCameraState refreshes matrixWorld, so an unrendered raycasting camera is not a step stale', () => {
  // tracker.md: HitLayer's camera is never rendered, so nothing else updates
  // its matrixWorld. A ray through the screen center must hit the target.
  const cam = new THREE.PerspectiveCamera(52, 1.6, 0.1, 100);
  applyCameraState(cam);
  useCameraStore.setState({ theta: 2.0, phi: 0.9 });
  applyCameraState(cam);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), cam);
  const t = useCameraStore.getState().target;
  assert.ok(ray.ray.distanceToPoint(new THREE.Vector3(t.x, t.y, t.z)) < 1e-6);
});
