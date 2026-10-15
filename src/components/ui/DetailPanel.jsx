'use client';
import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { formatAbundance } from '@/data/isotopes';

export default function DetailPanel() {
  const state = useAppStore((s) => s.state);
  const el = useAppStore((s) => s.activeEl);
  const iso = useAppStore((s) => s.detailIsotope);
  const show = state === 'detail' && el && iso;
  const panelRef = useRef(null);

  useEffect(() => {
    if (show) panelRef.current?.focus();
  }, [show]);

  return (
    <div
      id="detailPanel"
      className={show ? 'show' : ''}
      ref={panelRef}
      role="region"
      aria-label={show ? `${el.sym}-${iso.mass} isotope detail` : undefined}
      tabIndex={-1}
    >
      {show && (
        <>
          <h3>{el.sym}-{iso.mass}</h3>
          <span className="sub">{iso.name} · {el.name} (Z={el.z})</span>
          <div className="row"><span>Protons</span><b>{iso.protons}</b></div>
          <div className="row"><span>Neutrons</span><b>{iso.neutrons}</b></div>
          <div className="row"><span>Electrons</span><b>{el.z}</b></div>
          <div className="row"><span>Stable</span><b>{iso.stable ? 'Yes' : 'No'}</b></div>
          {iso.abundance != null && (
            <div className="row"><span>Natural abundance</span><b>{formatAbundance(iso.abundance)}</b></div>
          )}
          <p>{iso.note}</p>
          {iso.notable?.flag && <p className="notable">★ {iso.notable.reason}</p>}
        </>
      )}
    </div>
  );
}
