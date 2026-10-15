'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { PERIODS, ELEMENTS_BY_SYMBOL, LANTHANIDES, ACTINIDES, categoryOf } from '@/data/elements';
import { NAV_ROWS, clampCell, navigate } from '@/data/gridNav';
import { getIsotopesFor } from '@/data/isotopes';
import { findTileBySymbol, isotopeCubeRegistry } from '@/store/registry';
import { popController } from '@/three/popController';
import { focusController } from '@/three/focusController';
import { useAppStore } from '@/store/appStore';
import { useA11yStore } from '@/store/a11yStore';

const CATEGORY_LABELS = {
  alkali: 'alkali metal',
  alkaline: 'alkaline earth metal',
  transition: 'transition metal',
  posttrans: 'post-transition metal',
  metalloid: 'metalloid',
  nonmetal: 'nonmetal',
  halogen: 'halogen',
  noble: 'noble gas',
  lanthanide: 'lanthanide',
  actinide: 'actinide',
};

function elementFor(sym) {
  return { ...ELEMENTS_BY_SYMBOL[sym], category: categoryOf(sym) };
}

function activate(sym) {
  const { state } = useAppStore.getState();
  if (state !== 'overview') return false;
  const tile = findTileBySymbol(sym);
  if (!tile) return false;
  const pos = new THREE.Vector3();
  tile.getWorldPosition(pos);
  const el = elementFor(sym);
  const isotopes = getIsotopesFor(el);
  popController.pop?.(el, isotopes, { x: pos.x, y: pos.y, z: pos.z });
  return true;
}

export default function AccessibleOverlay() {
  const state = useAppStore((s) => s.state);
  const activeEl = useAppStore((s) => s.activeEl);

  const gridBtnRefs = useRef({}); // sym -> button el
  const isoBtnRefs = useRef([]); // index -> button el
  const lastGridSymRef = useRef('H');
  const lastIsoIndexRef = useRef(0);

  // Roving-tabindex position lives in real state (not just a ref) so the
  // `tabIndex` attribute below actually updates in the DOM -- otherwise
  // Tab/Shift+Tab into the grid would always land on the first element
  // regardless of where arrow-key navigation last left off.
  const [gridPos, setGridPos] = useState({ row: 0, col: 0 });
  const [isoIndex, setIsoIndex] = useState(0);

  // Keyboard focus reuses HitLayer's real hover-highlight (the GSAP scale-up
  // tween on the actual 3D tile/cube) via focusController -- no separate
  // on-screen indicator to draw or keep in sync, it's literally the same
  // visual a mouse user sees on hover.
  const track = useCallback((obj3d) => {
    focusController.highlight?.(obj3d || null);
  }, []);

  // --- roving tabindex: main element grid -------------------------------
  // Real elements only, in left-to-right group order per period (see
  // gridNav.js) -- the lanthanides/actinides get their own footnote lists
  // below instead, which also sidesteps needing the "tilt to reveal
  // pillars" gesture entirely for keyboard/screen-reader users.
  const focusCell = useCallback((row, col) => {
    const { row: r, col: c } = clampCell(row, col);
    const [, sym] = NAV_ROWS[r][c];
    gridBtnRefs.current[sym]?.focus();
  }, []);

  const handleGridKeyDown = useCallback((e) => {
    const target = navigate(gridPos, e.key);
    if (!target) return;
    e.preventDefault();
    focusCell(target.row, target.col);
  }, [gridPos, focusCell]);

  const handleCellFocus = useCallback((sym, row, col) => {
    setGridPos({ row, col });
    lastGridSymRef.current = sym;
    const tile = findTileBySymbol(sym);
    track(tile);
    const el = elementFor(sym);
    const { state: curState } = useAppStore.getState();
    const hint = curState === 'overview' ? 'Press Enter to view isotopes.' : 'Press Escape to return to the table first.';
    useA11yStore.getState().announce(
      `${el.name}, symbol ${sym}, atomic number ${el.z}, ${CATEGORY_LABELS[el.category] || el.category}. ${hint}`
    );
  }, [track]);

  const handleGridBlur = useCallback((e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return; // focus moved within the grid
    track(null);
  }, [track]);

  // --- footnote lists: lanthanides / actinides ---------------------------
  const handleFootnoteFocus = useCallback((sym) => {
    lastGridSymRef.current = sym;
    const tile = findTileBySymbol(sym);
    track(tile);
    const el = elementFor(sym);
    const { state: curState } = useAppStore.getState();
    const hint = curState === 'overview'
      ? 'Press Enter to view isotopes. Represented by a pillar cube on the tilted table.'
      : 'Press Escape to return to the table first.';
    useA11yStore.getState().announce(
      `${el.name}, symbol ${sym}, atomic number ${el.z}, ${CATEGORY_LABELS[el.category] || el.category}. ${hint}`
    );
  }, [track]);

  // --- isotope list (shown while popped) ---------------------------------
  const isotopes = useMemo(() => (activeEl ? getIsotopesFor(activeEl) : []), [activeEl]);

  const handleIsoFocus = useCallback((iso, index) => {
    setIsoIndex(index);
    lastIsoIndexRef.current = index;
    const cube = isotopeCubeRegistry[index];
    track(cube);
    useA11yStore.getState().announce(
      `Isotope ${activeEl?.sym}-${iso.mass}, ${iso.name}, ${iso.protons} protons, ${iso.neutrons} neutrons${iso.stable ? ', stable' : ', radioactive'}. Press Enter to view its atomic structure.`
    );
  }, [activeEl, track]);

  const handleIsoKeyDown = useCallback((e, index) => {
    let target = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = Math.min(isotopes.length - 1, index + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = Math.max(0, index - 1);
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = isotopes.length - 1;
    if (target !== null) {
      e.preventDefault();
      isoBtnRefs.current[target]?.focus();
    }
  }, [isotopes.length]);

  const handleIsoBlur = useCallback((e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    track(null);
  }, [track]);

  // --- focus handoff between the three views ------------------------------
  const prevStateRef = useRef(state);
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (prev === state) return;

    if (state === 'popped' && prev !== 'detail') {
      setIsoIndex(0);
      requestAnimationFrame(() => isoBtnRefs.current[0]?.focus());
    } else if (state === 'popped' && prev === 'detail') {
      requestAnimationFrame(() => isoBtnRefs.current[lastIsoIndexRef.current]?.focus());
    } else if (state === 'overview' && prev !== 'overview') {
      requestAnimationFrame(() => gridBtnRefs.current[lastGridSymRef.current]?.focus());
      useA11yStore.getState().announce('Returned to the periodic table overview.');
    }
  }, [state]);

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="a11y-announcer">
        {useA11yStore((s) => s.message)}
      </div>

      <p id="a11y-grid-instructions" className="sr-only">
        Periodic table of elements. Use arrow keys to move between elements, Home and End to jump to the
        start or end of a row, and Enter to view an element&apos;s isotopes.
      </p>

      <div
        role="grid"
        aria-label="Periodic table of elements"
        aria-describedby="a11y-grid-instructions"
        className="sr-only"
        onKeyDown={handleGridKeyDown}
        onBlur={handleGridBlur}
      >
        {PERIODS.map((row, ri) => (
          <div role="row" key={ri}>
            {row.map(([, sym, z]) => {
              if (sym.includes('*')) {
                const range = ri === 5 ? '57 to 71' : '89 to 103';
                const label = ri === 5 ? 'Lanthanides' : 'Actinides';
                return (
                  <span role="gridcell" key={sym}>
                    {label}, elements {range}. Listed individually after the main table.
                  </span>
                );
              }
              const navCol = NAV_ROWS[ri].findIndex(([, s]) => s === sym);
              const isRoving = gridPos.row === ri && gridPos.col === navCol;
              return (
                <span role="gridcell" key={sym}>
                  <button
                    type="button"
                    ref={(node) => { gridBtnRefs.current[sym] = node; }}
                    tabIndex={isRoving ? 0 : -1}
                    onFocus={() => handleCellFocus(sym, ri, navCol)}
                    onClick={() => activate(sym)}
                  >
                    {sym}, atomic number {z}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <div role="list" aria-label="Lanthanides" className="sr-only">
        {LANTHANIDES.map((sym) => {
          const el = elementFor(sym);
          return (
            <button
              type="button"
              role="listitem"
              key={sym}
              ref={(node) => { gridBtnRefs.current[sym] = node; }}
              onFocus={() => handleFootnoteFocus(sym)}
              onClick={() => activate(sym)}
            >
              {el.name} ({sym}), atomic number {el.z}
            </button>
          );
        })}
      </div>

      <div role="list" aria-label="Actinides" className="sr-only">
        {ACTINIDES.map((sym) => {
          const el = elementFor(sym);
          return (
            <button
              type="button"
              role="listitem"
              key={sym}
              ref={(node) => { gridBtnRefs.current[sym] = node; }}
              onFocus={() => handleFootnoteFocus(sym)}
              onClick={() => activate(sym)}
            >
              {el.name} ({sym}), atomic number {el.z}
            </button>
          );
        })}
      </div>

      {(state === 'popped' || state === 'detail' || state === 'moving') && activeEl && isotopes.length > 0 && (
        <div
          role="listbox"
          aria-label={`Isotopes of ${activeEl.name}`}
          className="sr-only"
          onBlur={handleIsoBlur}
        >
          {isotopes.map((iso, index) => (
            <button
              type="button"
              role="option"
              key={iso.mass}
              ref={(node) => { isoBtnRefs.current[index] = node; }}
              tabIndex={index === isoIndex ? 0 : -1}
              onFocus={() => handleIsoFocus(iso, index)}
              onKeyDown={(e) => handleIsoKeyDown(e, index)}
              onClick={() => { if (useAppStore.getState().state === 'popped') popController.selectIsotope?.(index); }}
            >
              {activeEl.sym}-{iso.mass} ({iso.name})
            </button>
          ))}
        </div>
      )}
    </>
  );
}
