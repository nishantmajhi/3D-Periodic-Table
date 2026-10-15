// What a click on the overview can land on. The pillar cubes hang below the
// floor and stay hidden until the view is tilted; three's Raycaster ignores
// `visible`, so HitLayer has to leave them out itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hittable, solidHits, tileRegistry, registerTile, unregisterTile, findTileBySymbol } from '../src/store/registry.js';
import { buildOverview, overviewCamera, firstHit, hiddenPillarPoints, tileCenterOnScreen } from './scene.js';

const W = 1280, H = 800;

test('at the overview, some points between tiles reach a hidden pillar cube first', () => {
  // This is the situation the filter exists for; if the layout changes so
  // that none exist, the regression test below proves nothing.
  assert.ok(hiddenPillarPoints(W, H).length > 20);
});

test('regression: a click there lands on a visible tile or on nothing, never on a hidden cube', () => {
  const roots = buildOverview();
  const cam = overviewCamera(W, H);
  for (const { x, y, sym } of hiddenPillarPoints(W, H)) {
    const r = firstHit(hittable(roots), cam, x, y, W, H);
    assert.ok(r === null || r.visible, `(${x}, ${y}) opened hidden ${sym}`);
  }
});

test('once the view is tilted and the pillars show, their cubes can be clicked', () => {
  const roots = buildOverview();
  const cam = overviewCamera(W, H);
  const [{ x, y, sym }] = hiddenPillarPoints(W, H);
  for (const r of roots) r.visible = true;
  assert.equal(firstHit(hittable(roots), cam, x, y, W, H).userData.el.sym, sym);
});

test('hittable keeps visible objects in order and drops hidden ones', () => {
  const a = { visible: true }, b = { visible: false }, c = { visible: true };
  assert.deepEqual(hittable([a, b, c]), [a, c]);
  assert.deepEqual(hittable([]), []);
});

test('keyboard activation still finds a hidden pillar cube by symbol', () => {
  // AccessibleOverlay reaches the lanthanides without tilting; only the
  // pointer path is filtered.
  const cube = { visible: false, userData: { el: { sym: 'Gd' }, isMarker: false } };
  registerTile(cube);
  try {
    assert.equal(findTileBySymbol('Gd'), cube);
  } finally {
    unregisterTile(cube);
  }
  assert.equal(tileRegistry.includes(cube), false);
});

test('regression: the middle of every floor tile picks that tile, not a neighbour', () => {
  // three treats a ray as hitting a line within 1 world unit of it, and the
  // tiles are 1.05 apart, so each tile's outline answered for its
  // neighbours: aimed at Fe, the first hit was Rh's outline.
  const roots = buildOverview();
  const cam = overviewCamera(W, H);
  const wrong = [];
  for (const r of roots.filter((x) => x.visible && !x.userData.isMarker)) {
    const sym = r.userData.el.sym;
    const { x, y } = tileCenterOnScreen(sym, cam, W, H);
    const got = firstHit(hittable(roots), cam, x, y, W, H)?.userData.el.sym;
    if (got !== sym) wrong.push(`${sym}->${got}`);
  }
  assert.deepEqual(wrong, []);
});

test('without the filter, three alone gets most tiles wrong -- which is what HitLayer did', () => {
  const roots = buildOverview();
  const cam = overviewCamera(W, H);
  const { x, y } = tileCenterOnScreen('Fe', cam, W, H);
  assert.equal(firstHit(hittable(roots), cam, x, y, W, H, { raw: true }).userData.el.sym, 'Rh');
});

test('solidHits drops line hits and keeps meshes and sprites in order', () => {
  const mesh = { object: { isMesh: true } }, line = { object: { isLine: true } }, sprite = { object: { isSprite: true } };
  assert.deepEqual(solidHits([line, mesh, line, sprite]), [mesh, sprite]);
});
