'use client';
import { useEffect } from 'react';
import * as THREE from 'three';
import { findTileBySymbol } from '@/store/registry';
import { getIsotopesFor } from '@/data/isotopes';
import { useAppStore } from '@/store/appStore';
import { popController } from '@/three/popController';

const MAX_ATTEMPTS = 90; // ~1.5s at 60fps -- generous, since this only runs once at mount

export default function useDeepLink(initialTarget) {
  useEffect(() => {
    if (!initialTarget?.symbol) return;
    let cancelled = false;
    let attempts = 0;

    function tryTrigger() {
      if (cancelled) return;
      const normalizedSym = initialTarget.symbol.charAt(0).toUpperCase() + initialTarget.symbol.slice(1).toLowerCase();
      const tileObj = findTileBySymbol(normalizedSym);
      if (tileObj && popController.pop) {
        const el = tileObj.userData.el;
        const pos = new THREE.Vector3();
        tileObj.getWorldPosition(pos);
        const isotopes = getIsotopesFor(el);
        popController.pop(el, isotopes, { x: pos.x, y: pos.y, z: pos.z });

        if (initialTarget.mass != null) {
          const idx = isotopes.findIndex((iso) => iso.mass === initialTarget.mass);
          if (idx !== -1) {
            const unsub = useAppStore.subscribe((state, prevState) => {
              if (state.state === 'popped' && prevState.state !== 'popped') {
                popController.selectIsotope?.(idx);
                unsub();
              }
            });
          }
        }
        return;
      }
      attempts += 1;
      if (attempts < MAX_ATTEMPTS) requestAnimationFrame(tryTrigger);
    }
    tryTrigger();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only ever run once, for the initial URL the page loaded with
}
