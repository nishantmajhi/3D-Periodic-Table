// Where the popped isotope cubes go: one centered row up to five, then a
// centered grid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cubeSlots, CUBE_STEP, CUBE_SIZE, MAX_PER_ROW } from '../src/three/cuboidLayout.js';
import { ELEMENTS_BY_SYMBOL } from '../src/data/elements.js';
import { getIsotopesFor } from '../src/data/isotopes.js';

const close = (a, b) => Math.abs(a - b) < 1e-9;
const rowsOf = (slots) => [...new Set(slots.map((s) => s.row.toFixed(9)))];

test('one slot per cube, none shared', () => {
  for (let n = 1; n <= 12; n++) {
    const slots = cubeSlots(n);
    assert.equal(slots.length, n);
    assert.equal(new Set(slots.map((s) => `${s.col.toFixed(6)},${s.row.toFixed(6)}`)).size, n, `n=${n}`);
  }
});

test('up to five cubes sit in one row', () => {
  for (let n = 1; n <= MAX_PER_ROW; n++) {
    const slots = cubeSlots(n);
    assert.equal(rowsOf(slots).length, 1, `n=${n}`);
    assert.ok(slots.every((s) => close(s.row, 0)));
  }
});

test('six or more wrap into balanced rows of at most five', () => {
  const expect = { 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [5, 4], 10: [5, 5], 11: [4, 4, 3] };
  for (const [n, counts] of Object.entries(expect)) {
    const slots = cubeSlots(+n);
    const rows = rowsOf(slots);
    assert.deepEqual(rows.map((r) => slots.filter((s) => s.row.toFixed(9) === r).length), counts, `n=${n}`);
  }
});

test('the arrangement is centered on the cuboid in both directions', () => {
  for (let n = 1; n <= 12; n++) {
    const slots = cubeSlots(n);
    for (const r of rowsOf(slots)) {
      const cols = slots.filter((s) => s.row.toFixed(9) === r).map((s) => s.col);
      assert.ok(close(cols.reduce((a, b) => a + b, 0), 0), `n=${n}: row centered`);
    }
    const rows = rowsOf(slots).map(Number);
    assert.ok(close(Math.max(...rows) + Math.min(...rows), 0), `n=${n}: rows centered`);
  }
});

test('neighbours are one step apart, so cubes never touch', () => {
  assert.ok(CUBE_STEP > CUBE_SIZE);
  for (let n = 2; n <= 12; n++) {
    const slots = cubeSlots(n);
    for (const r of rowsOf(slots)) {
      const cols = slots.filter((s) => s.row.toFixed(9) === r).map((s) => s.col).sort((a, b) => a - b);
      for (let i = 1; i < cols.length; i++) assert.ok(close(cols[i] - cols[i - 1], CUBE_STEP), `n=${n}`);
    }
  }
});

test('the most isotopes any element has still fits in two rows', () => {
  const most = Math.max(...Object.values(ELEMENTS_BY_SYMBOL).map((el) => getIsotopesFor(el).length));
  assert.equal(most, 10, 'tin, with ten stable isotopes');
  assert.equal(rowsOf(cubeSlots(most)).length, 2);
});
