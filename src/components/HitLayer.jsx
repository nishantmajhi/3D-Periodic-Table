'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useCameraStore, applyCameraState } from '@/store/cameraStore';
import { useAppStore } from '@/store/appStore';
import { useToastStore } from '@/store/toastStore';
import { tileRegistry, isotopeCubeRegistry, hittable, solidHits } from '@/store/registry';
import { popController } from '@/three/popController';
import { focusController } from '@/three/focusController';
import { getIsotopesFor } from '@/data/isotopes';

function findTileRoot(o) {
  while (o && !o.userData.el) o = o.parent;
  return o;
}
function findSubRoot(o, subs) {
  while (o && subs.indexOf(o) === -1) o = o.parent;
  return o;
}

export default function HitLayer() {
  const elRef = useRef(null);
  const raycaster = useRef(new THREE.Raycaster());
  const shadowCamera = useRef(
    new THREE.PerspectiveCamera(52, typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1, 0.1, 100)
  );
  const dragState = useRef({ dragging: false, moved: false, lastX: 0, lastY: 0, pdX: 0, pdY: 0 });
  const hoveredRef = useRef(null);

  useEffect(() => {
    const el = elRef.current;
    const cam = shadowCamera.current;

    function ndcFromEvent(e) {
      const rect = el.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    }

    function getIntersects(objects, ndc) {
      applyCameraState(cam);
      raycaster.current.setFromCamera(ndc, cam);
      return solidHits(raycaster.current.intersectObjects(objects, true));
    }

    const HOVER_SCALE = 1.08;
    const HOVER_DURATION = 0.28;
    const HOVER_EASE_IN = 'power2.out';
    const HOVER_EASE_OUT = 'power2.inOut';

    function setHovered(root) {
      if (root === hoveredRef.current) return;
      const prev = hoveredRef.current;
      if (prev && prev.parent) {
        gsap.killTweensOf(prev.scale);
        gsap.to(prev.scale, { x: 1, y: 1, z: 1, duration: HOVER_DURATION, ease: HOVER_EASE_OUT });
      }
      hoveredRef.current = root;
      if (root) {
        gsap.killTweensOf(root.scale);
        gsap.to(root.scale, { x: HOVER_SCALE, y: HOVER_SCALE, z: HOVER_SCALE, duration: HOVER_DURATION, ease: HOVER_EASE_IN });
      }
    }

    focusController.highlight = setHovered;

    function handleClick(e) {
      const { state } = useAppStore.getState();
      if (state === 'moving') return;
      const ndc = ndcFromEvent(e);

      if (state === 'overview') {
        const hits = getIntersects(hittable(tileRegistry), ndc);
        if (hits.length) {
          const root = findTileRoot(hits[0].object);
          if (!root) return;
          if (root.userData.isMarker) {
            useToastStore.getState().show(
              `Represents ${root.userData.el.rangeLabel.replace('-', ' – ')} — tilt the view to see them hang below`
            );
          } else {
            setHovered(null); // clicked tile is leaving overview — don't leave it stuck mid-hover-scale
            const pos = new THREE.Vector3();
            root.getWorldPosition(pos);
            const isotopes = getIsotopesFor(root.userData.el);
            popController.pop?.(root.userData.el, isotopes, { x: pos.x, y: pos.y, z: pos.z });
          }
        }
      } else if (state === 'popped') {
        const subs = hittable(isotopeCubeRegistry);
        const hits = getIntersects(subs, ndc);
        if (hits.length) {
          const root = findSubRoot(hits[0].object, subs);
          if (root) {
            setHovered(null);
            popController.selectIsotope?.(root.userData.index);
          }
        }
      }
    }

    function onPointerDown(e) {
      const d = dragState.current;
      d.dragging = true; d.moved = false;
      d.pdX = d.lastX = e.clientX;
      d.pdY = d.lastY = e.clientY;
      el.classList.add('grabbing');
      setHovered(null);
    }
    function onPointerMove(e) {
      const d = dragState.current;
      if (!d.dragging) {
        // hover feedback
        const ndc = ndcFromEvent(e);
        const { state } = useAppStore.getState();
        let root = null;
        if (state === 'overview') {
          const hits = getIntersects(hittable(tileRegistry), ndc);
          root = hits.length ? findTileRoot(hits[0].object) : null;
        } else if (state === 'popped') {
          const subs = hittable(isotopeCubeRegistry);
          const hits = getIntersects(subs, ndc);
          root = hits.length ? findSubRoot(hits[0].object, subs) : null;
        } else {
          // 'moving' / 'detail' — nothing hoverable right now; make sure
          // whatever was hovered eases back down rather than staying stuck
          setHovered(null);
          el.style.cursor = 'default';
          return;
        }
        setHovered(root);
        el.style.cursor = root ? 'pointer' : 'grab';
        return;
      }
      const dx = e.clientX - d.lastX, dy = e.clientY - d.lastY;
      if (Math.abs(e.clientX - d.pdX) + Math.abs(e.clientY - d.pdY) > 4) d.moved = true;
      useCameraStore.getState().drag(dx, dy);
      d.lastX = e.clientX; d.lastY = e.clientY;
    }
    function onPointerUp(e) {
      const d = dragState.current;
      if (d.dragging && !d.moved) handleClick(e);
      d.dragging = false;
      el.classList.remove('grabbing');
    }
    function onWheel(e) {
      useCameraStore.getState().zoom(e.deltaY);
      e.preventDefault();
    }
    function onResize() {
      cam.aspect = window.innerWidth / window.innerHeight;
      cam.updateProjectionMatrix();
    }

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    return () => {
      focusController.highlight = null;
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <div id="hit-layer" ref={elRef} aria-hidden="true" />;
}
