// Arrow-key movement through the accessible element grid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ROWS, navigate, clampCell } from '../src/data/gridNav.js';

const at = (sym) => {
  for (let r = 0; r < NAV_ROWS.length; r++) {
    const c = NAV_ROWS[r].findIndex(([, s]) => s === sym);
    if (c !== -1) return { row: r, col: c };
  }
  throw new Error(`${sym} is not in the grid`);
};
const symAt = ({ row, col }) => NAV_ROWS[row][col][1];
const press = (sym, key) => symAt(navigate(at(sym), key));

test('the grid holds every floor element and no marker cell', () => {
  const syms = NAV_ROWS.flat().map(([, s]) => s);
  assert.equal(syms.length, 88); // 118 minus the 30 lanthanides and actinides
  assert.ok(syms.every((s) => !s.includes('*')));
});

test('left and right move along a period and stop at its ends', () => {
  assert.equal(press('Li', 'ArrowRight'), 'Be');
  assert.equal(press('Be', 'ArrowRight'), 'B', 'skips the gap in period 2');
  assert.equal(press('Ne', 'ArrowRight'), 'Ne');
  assert.equal(press('Li', 'ArrowLeft'), 'Li');
  assert.equal(press('Ba', 'ArrowRight'), 'Hf', 'skips the La* marker');
});

test('up and down land on the nearest group in the next period', () => {
  assert.equal(press('He', 'ArrowDown'), 'Ne');
  assert.equal(press('H', 'ArrowDown'), 'Li');
  assert.equal(press('Al', 'ArrowDown'), 'Ga');
  assert.equal(press('Sc', 'ArrowUp'), 'Mg', 'group 3 has no period-3 cell; Mg (group 2) is nearest');
  assert.equal(press('Fe', 'ArrowUp'), 'Al', 'group 8: Al (13) is 5 away, Mg (2) is 6');
});

test('a tie between two equally near groups goes to the left one', () => {
  // Y is group 3; period 6 has no group 3 cell (the La* marker), so Ba (2)
  // and Hf (4) are both one away.
  assert.equal(press('Y', 'ArrowDown'), 'Ba');
});

test('up from the first period and down from the last stay put', () => {
  assert.equal(press('H', 'ArrowUp'), 'H');
  assert.equal(press('Og', 'ArrowDown'), 'Og');
});

test('Home and End jump to the ends of the period', () => {
  assert.equal(press('Fe', 'Home'), 'K');
  assert.equal(press('Fe', 'End'), 'Kr');
});

test('keys the grid does not handle are left alone', () => {
  for (const key of ['Enter', ' ', 'Tab', 'Escape', 'a']) assert.equal(navigate(at('Fe'), key), null);
});

test('clampCell keeps any position inside the grid', () => {
  assert.deepEqual(clampCell(-3, -3), { row: 0, col: 0 });
  assert.deepEqual(clampCell(99, 99), { row: 6, col: NAV_ROWS[6].length - 1 });
  assert.deepEqual(clampCell(0, 5), { row: 0, col: 1 }, 'period 1 has two cells');
});
