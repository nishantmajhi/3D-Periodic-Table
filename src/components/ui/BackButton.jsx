'use client';
import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { popController } from '@/three/popController';

function stepBack() {
  const { state } = useAppStore.getState();
  if (state === 'detail') popController.collapseToPopped?.();
  else if (state === 'popped') popController.returnToOverview?.();
}

export default function BackButton() {
  const state = useAppStore((s) => s.state);
  const visible = state === 'popped' || state === 'detail';

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') stepBack();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <button
      id="backBtn"
      style={{ display: visible ? 'block' : 'none' }}
      onClick={stepBack}
      aria-label="Back to previous view"
    >
      ← Back
    </button>
  );
}
