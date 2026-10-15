// The floor: which cell every element occupies, and the spacing maths the
// scene is built from. tracker.md records one bug here already (the marker
// cell to pillar gap was ~0.56 instead of the grid's 0.19).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PERIODS, ELEMENTS, ELEMENTS_BY_SYMBOL, LANTHANIDES, ACTINIDES, CATEGORY_COLORS, categoryOf,
  SP, TILE, TILE_H, MARKER_H, colX, rowZ, PILLAR_CUBE_H, PILLAR_CUBE_W, PILLAR_STEP_Y, pillarY,
  tableLayout, CATEGORY_KEY_LAYOUT,
} from '../src/data/elements.js';

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);
const GAP = SP - TILE;

test('the dataset is 118 elements, numbered 1 to 118 in order, with unique symbols', () => {
  assert.equal(ELEMENTS.length, 118);
  ELEMENTS.forEach(([z], i) => assert.equal(z, i + 1));
  assert.equal(new Set(ELEMENTS.map(([, s]) => s)).size, 118);
  assert.equal(Object.keys(ELEMENTS_BY_SYMBOL).length, 118);
});

test('every element appears exactly once: on the floor or in a pillar', () => {
  const floor = PERIODS.flat().filter(([, s]) => !s.includes('*')).map(([, s]) => s);
  const all = [...floor, ...LANTHANIDES, ...ACTINIDES];
  assert.equal(all.length, 118);
  assert.deepEqual([...all].sort(), ELEMENTS.map(([, s]) => s).sort());
});

test('the floor table agrees with the dataset about every atomic number', () => {
  for (const row of PERIODS) {
    for (const [, sym, z] of row) {
      if (sym.includes('*')) assert.equal(z, 0, `${sym} is a marker`);
      else assert.equal(ELEMENTS_BY_SYMBOL[sym].z, z, sym);
    }
  }
});

test('each period reads left to right in increasing atomic number', () => {
  for (const row of PERIODS) {
    const zs = row.map(([, , z]) => z).filter(Boolean);
    assert.deepEqual(zs, [...zs].sort((a, b) => a - b));
    const groups = row.map(([g]) => g);
    assert.deepEqual(groups, [...groups].sort((a, b) => a - b));
    assert.equal(new Set(groups).size, groups.length, 'no two cells share a group');
  }
});

test('periods 1-3 have the standard gaps; periods 4-7 fill all 18 groups', () => {
  assert.deepEqual(PERIODS[0].map(([g]) => g), [1, 18]);
  for (const r of [1, 2]) assert.deepEqual(PERIODS[r].map(([g]) => g), [1, 2, 13, 14, 15, 16, 17, 18]);
  for (const r of [3, 4, 5, 6]) assert.equal(PERIODS[r].length, 18);
});

test('the La*/Ac* markers stand in group 3 of periods 6 and 7 for 57-71 and 89-103', () => {
  assert.deepEqual(PERIODS[5][2], [3, 'La*', 0]);
  assert.deepEqual(PERIODS[6][2], [3, 'Ac*', 0]);
  assert.deepEqual(LANTHANIDES.map((s) => ELEMENTS_BY_SYMBOL[s].z), Array.from({ length: 15 }, (_, i) => 57 + i));
  assert.deepEqual(ACTINIDES.map((s) => ELEMENTS_BY_SYMBOL[s].z), Array.from({ length: 15 }, (_, i) => 89 + i));
});

test('the grid is centered on the origin and spaced SP apart', () => {
  close(colX(0), -colX(17), 'groups 1 and 18 are symmetric');
  close(rowZ(0), -rowZ(6), 'periods 1 and 7 are symmetric');
  for (let c = 0; c < 17; c++) close(colX(c + 1) - colX(c), SP, `column ${c}`);
  for (let r = 0; r < 6; r++) close(rowZ(r + 1) - rowZ(r), SP, `row ${r}`);
  assert.ok(GAP > 0, 'tiles do not touch');
});

test('tableLayout places every floor cell at its group and period', () => {
  const cells = tableLayout();
  assert.equal(cells.length, PERIODS.flat().length);
  assert.equal(new Set(cells.map((c) => c.key)).size, cells.length, 'keys are unique');
  let i = 0;
  PERIODS.forEach((row, ri) => row.forEach(([g, sym]) => {
    const cell = cells[i++];
    assert.deepEqual(cell.position, [colX(g - 1), 0, rowZ(ri)], sym);
    assert.equal(cell.marker, sym.includes('*'));
  }));
});

test('tableLayout gives each element its category and each marker its range and pillar', () => {
  const cells = tableLayout();
  for (const c of cells.filter((x) => !x.marker)) {
    assert.equal(c.el.category, categoryOf(c.el.sym));
    assert.equal(c.pillarSymbols, null);
  }
  const markers = cells.filter((x) => x.marker);
  assert.equal(markers.length, 2);
  assert.deepEqual(markers.map((m) => [m.el.category, m.el.rangeLabel, m.pillarSymbols]), [
    ['lanthanide', '57-71', LANTHANIDES],
    ['actinide', '89-103', ACTINIDES],
  ]);
  for (const c of cells) assert.ok(CATEGORY_COLORS[c.el.category] !== undefined, `${c.key} has a color`);
});

test('the first pillar cube hangs one grid gap below its marker cell', () => {
  // Tiles stand on the floor, so the marker's underside is y = 0.
  const firstTop = pillarY(0) + PILLAR_CUBE_H / 2;
  close(0 - firstTop, GAP, 'marker underside to first cube top');
  assert.ok(MARKER_H > TILE_H, 'the marker stands taller than an ordinary tile');
});

test('pillar cubes are evenly stacked, never overlap, and fit inside the marker footprint', () => {
  for (let i = 0; i < 14; i++) {
    close(pillarY(i) - pillarY(i + 1), PILLAR_STEP_Y, `step ${i}`);
    const gap = (pillarY(i) - PILLAR_CUBE_H / 2) - (pillarY(i + 1) + PILLAR_CUBE_H / 2);
    assert.ok(gap > 0, `cubes ${i} and ${i + 1} are separate`);
  }
  assert.ok(PILLAR_CUBE_W < TILE);
});

test('the category key sits in the empty groups 3-12 of periods 1-3 without touching a tile', () => {
  const k = CATEGORY_KEY_LAYOUT;
  const key = { x0: k.x - k.w / 2, x1: k.x + k.w / 2, z0: k.z - k.h / 2, z1: k.z + k.h / 2 };
  for (const c of tableLayout()) {
    const [x, , z] = c.position;
    const t = { x0: x - TILE / 2, x1: x + TILE / 2, z0: z - TILE / 2, z1: z + TILE / 2 };
    const overlaps = key.x0 < t.x1 && t.x0 < key.x1 && key.z0 < t.z1 && t.z0 < key.z1;
    assert.ok(!overlaps, `the key overlaps ${c.key}`);
  }
  close(k.x, (colX(2) + colX(11)) / 2, 'centered between groups 3 and 12');
  close(k.z, rowZ(1), 'centered on period 2');
});

test('categories: lanthanides and actinides by list, unlisted metals are transition metals', () => {
  for (const s of LANTHANIDES) assert.equal(categoryOf(s), 'lanthanide');
  for (const s of ACTINIDES) assert.equal(categoryOf(s), 'actinide');
  assert.equal(categoryOf('Fe'), 'transition');
  assert.equal(categoryOf('Og'), 'noble');
  assert.equal(categoryOf('H'), 'nonmetal');
  for (const [, sym] of ELEMENTS) assert.ok(CATEGORY_COLORS[categoryOf(sym)] !== undefined, sym);
});
