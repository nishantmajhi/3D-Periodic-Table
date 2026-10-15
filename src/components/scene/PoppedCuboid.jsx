'use client';
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { buildIsotopeCube, buildAtom, disposeIsotopeCube, disposeAtom } from '@/three/builders';
import { cubeSlots } from '@/three/cuboidLayout';
import { CATEGORY_COLORS } from '@/data/elements';
import { useAppStore } from '@/store/appStore';
import { setIsotopeCubeRegistry, clearIsotopeCubeRegistry } from '@/store/registry';
import { popController } from '@/three/popController';
import { setUrlOverview, setUrlElement, setUrlIsotope } from '@/three/urlSync';
import { applyCameraState } from '@/store/cameraStore';

export default function PoppedCuboid({ blurOverlayRef, animatedAtomsRef }) {
  const groupRef = useRef(null);
  const camera = useThree((s) => s.camera);
  const subsRef = useRef([]);
  const atomRef = useRef(null);
  const anchorRef = useRef(null);

  useEffect(() => {
    const group = groupRef.current;
    const app = () => useAppStore.getState();
    let currentElSym = null;

    function slerpTo(obj, targetQuat, duration) {
      const startQuat = obj.quaternion.clone();
      const p = { t: 0 };
      gsap.to(p, {
        t: 1,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => obj.quaternion.copy(startQuat).slerp(targetQuat, p.t),
      });
    }

    function separateAndFace(subs, slots) {
      blurOverlayRef.current?.classList.add('active');
      const camQuat = camera.quaternion.clone();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camQuat);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camQuat);

      subs.forEach((s, i) => {
        const slot = slots[i];
        const targetPos = right.clone().multiplyScalar(slot.col).add(up.clone().multiplyScalar(slot.row));
        s.userData.poppedLocalPos = targetPos.clone();
        gsap.to(s.position, { x: targetPos.x, y: targetPos.y, z: targetPos.z, duration: 0.9, ease: 'power2.inOut' });
        slerpTo(s, camQuat, 0.9);
      });

      gsap.delayedCall(0.95, () => {
        app().setState('popped');
        setUrlElement(currentElSym);
      });
    }

    function pop(el, isotopes, anchorWorldPos) {
      if (app().state !== 'overview') return;
      app().setState('moving');
      app().setActiveEl(el);
      anchorRef.current = anchorWorldPos;
      currentElSym = el.sym;

      // Guarantee `camera` reflects the current cameraStore transform before
      // we read its position/direction below. Normally CameraRig's useFrame
      // keeps this in sync every frame, but a deep link (/element/[symbol])
      // can call pop() from a plain requestAnimationFrame poll that wins the
      // race against R3F's very first frame -- in that case the camera
      // would still be sitting at the raw Canvas `camera` prop default,
      // and staging the isotope cuboid off of that transient position
      // leaves it stranded somewhere the camera never actually faces.
      applyCameraState(camera);

      group.position.set(anchorWorldPos.x, anchorWorldPos.y, anchorWorldPos.z);
      group.scale.set(0.001, 0.001, 0.001);

      // Isotope cubes take on the same category color as the element tile
      // they came from, rather than a single fixed color for every element.
      const color = CATEGORY_COLORS[el.category] ?? 0xffb454;
      const slots = cubeSlots(isotopes.length);
      const subs = isotopes.map((iso, i) => {
        const cube = buildIsotopeCube(el.sym, iso, i, color);
        group.add(cube);
        return cube;
      });
      subsRef.current = subs;
      setIsotopeCubeRegistry(subs);

      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const staging = camera.position.clone().add(dir.multiplyScalar(6.2));

      gsap.to(group.position, { x: staging.x, y: staging.y, z: staging.z, duration: 1.0, ease: 'power3.out' });
      gsap.to(group.scale, { x: 1.6, y: 1.6, z: 1.6, duration: 1.0, ease: 'power3.out' });
      subs.forEach((s) => gsap.to(s.scale, { x: 1, y: 1, z: 1, duration: 0.6, delay: 0.15, ease: 'back.out(1.6)' }));

      gsap.delayedCall(1.0, () => separateAndFace(subs, slots));
    }

    function showDetail(iso) {
      const atom = buildAtom(iso.protons, iso.neutrons);
      atom.position.copy(group.position);
      group.parent.add(atom);
      atomRef.current = atom;
      animatedAtomsRef.current.push(atom);
      app().setDetailIsotope(iso);
    }

    function selectIsotope(index) {
      if (app().state !== 'popped') return;
      app().setState('moving');
      const subs = subsRef.current;
      const chosen = subs[index];
      if (!chosen) return;

      subs.forEach((s, idx) => {
        if (idx === index) return;
        gsap.to(s.scale, { x: 0, y: 0, z: 0, duration: 0.4, ease: 'power1.in', onComplete: () => { s.visible = false; } });
      });

      gsap.to(chosen.position, { x: 0, y: 0, z: 0, duration: 0.5, ease: 'power2.inOut' });
      gsap.to(chosen.scale, {
        x: 1.3, y: 1.3, z: 1.3, duration: 0.5, ease: 'power2.inOut',
        onComplete: () => {
          showDetail(chosen.userData.iso);
          app().setState('detail');
          setUrlIsotope(currentElSym, chosen.userData.iso.mass);
          gsap.to(chosen.scale, {
            x: 0.001, y: 0.001, z: 0.001, duration: 0.45, delay: 0.1, ease: 'power1.in',
            onComplete: () => { chosen.visible = false; },
          });
        },
      });
    }

    function removeAtom() {
      if (!atomRef.current) return;
      group.parent.remove(atomRef.current);
      disposeAtom(atomRef.current);
      const idx = animatedAtomsRef.current.indexOf(atomRef.current);
      if (idx !== -1) animatedAtomsRef.current.splice(idx, 1);
      atomRef.current = null;
      app().setDetailIsotope(null);
    }

    function collapseToPopped() {
      if (app().state !== 'detail') return;
      removeAtom();
      const subs = subsRef.current;
      subs.forEach((s) => {
        s.visible = true;
        gsap.to(s.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'power2.out' });
        const p = s.userData.poppedLocalPos;
        if (p) gsap.to(s.position, { x: p.x, y: p.y, z: p.z, duration: 0.45, ease: 'power2.inOut' });
      });
      app().setState('popped');
      setUrlElement(currentElSym);
    }

    function returnToOverview() {
      if (app().state !== 'popped') return;
      app().setState('moving');
      removeAtom();
      blurOverlayRef.current?.classList.remove('active');

      const anchor = anchorRef.current;
      gsap.to(group.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.55, ease: 'power2.in' });
      gsap.to(group.position, {
        x: anchor.x, y: anchor.y, z: anchor.z, duration: 0.55, ease: 'power2.in',
        onComplete: () => {
          subsRef.current.forEach((s) => {
            group.remove(s);
            disposeIsotopeCube(s);
          });
          subsRef.current = [];
          clearIsotopeCubeRegistry();
          app().setActiveEl(null);
          app().setState('overview');
          setUrlOverview();
          currentElSym = null;
        },
      });
    }

    popController.pop = pop;
    popController.selectIsotope = selectIsotope;
    popController.collapseToPopped = collapseToPopped;
    popController.returnToOverview = returnToOverview;

    return () => {
      popController.pop = null;
      popController.selectIsotope = null;
      popController.collapseToPopped = null;
      popController.returnToOverview = null;
    };
  }, [camera, blurOverlayRef, animatedAtomsRef]);

  return <group ref={groupRef} />;
}
