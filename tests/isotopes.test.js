// What clicking an element shows: its isotopes, their particle counts, and
// the curated "notable" ones folded in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS, ELEMENTS_BY_SYMBOL } from '../src/data/elements.js';
import { getIsotopesFor, HYDROGEN_ISOTOPES } from '../src/data/isotopes.js';
import { NATURAL_ISOTOPES, LONGEST_LIVED_ISOTOPE } from '../src/data/isotopeData.js';

const iso = (sym) => getIsotopesFor(ELEMENTS_BY_SYMBOL[sym]);
const masses = (sym) => iso(sym).map((i) => i.mass);

test('every element has at least one isotope, and every isotope adds up', () => {
  for (const [z, sym, name] of ELEMENTS) {
    const list = iso(sym);
    assert.ok(list.length >= 1, sym);
    for (const i of list) {
      assert.equal(i.protons, z, `${sym}-${i.mass} protons`);
      assert.equal(i.neutrons, i.mass - z, `${sym}-${i.mass} neutrons`);
      assert.ok(i.neutrons >= 0, `${sym}-${i.mass}`);
      assert.equal(typeof i.stable, 'boolean', `${sym}-${i.mass} stable`);
      assert.ok(i.note.length > 0, `${sym}-${i.mass} note`);
      if (sym !== 'H') assert.equal(i.name, `${name}-${i.mass}`);
    }
  }
});

test('isotopes come back sorted by mass, with no mass listed twice', () => {
  for (const [, sym] of ELEMENTS) {
    const m = masses(sym);
    assert.deepEqual(m, [...m].sort((a, b) => a - b), sym);
    assert.equal(new Set(m).size, m.length, sym);
  }
});

test('the natural isotopes are the NIST list: tin has ten, fluorine one', () => {
  assert.deepEqual(masses('Sn'), [112, 114, 115, 116, 117, 118, 119, 120, 122, 124]);
  assert.deepEqual(masses('F'), [19]);
  assert.deepEqual(masses('O'), [16, 17, 18]);
  for (const [, sym] of ELEMENTS) {
    if (sym === 'H') continue;
    for (const { mass } of NATURAL_ISOTOPES[sym]) assert.ok(masses(sym).includes(mass), `${sym}-${mass}`);
  }
});

test('a natural isotope carries its abundance; the abundances of an element sum to 1', () => {
  for (const [, sym] of ELEMENTS) {
    const nat = NATURAL_ISOTOPES[sym];
    if (!nat.length) continue;
    const sum = nat.reduce((a, b) => a + b.abundance, 0);
    assert.ok(Math.abs(sum - 1) < 2e-4, `${sym} sums to ${sum}`);
    if (sym === 'H') continue;
    for (const { mass, abundance } of nat) assert.equal(iso(sym).find((i) => i.mass === mass).abundance, abundance);
  }
});

test('a curated notable isotope is added when it is not natural, flagged when it is', () => {
  const c14 = iso('C').find((i) => i.mass === 14);
  assert.deepEqual(masses('C'), [12, 13, 14]);
  assert.equal(c14.stable, false);
  assert.equal(c14.abundance, null);
  assert.deepEqual(c14.notable, { flag: true, reason: 'Used in radiocarbon dating' });
  assert.equal(c14.note, 'Used in radiocarbon dating');

  const u = iso('U');
  assert.deepEqual(u.map((i) => i.mass), [234, 235, 238], 'U-235 and U-238 are natural, so nothing is added');
  assert.equal(u.find((i) => i.mass === 235).notable.flag, true);
  assert.equal(u.find((i) => i.mass === 234).notable.flag, false);
  assert.deepEqual(masses('Co'), [59, 60]);
  assert.deepEqual(masses('I'), [127, 131]);
  assert.ok(masses('Pu').includes(239));
});

test('getIsotopesFor builds fresh objects, so flagging a notable never leaks between calls', () => {
  const a = iso('U');
  a[0].notable.flag = true;
  a.push({ mass: 999 });
  assert.equal(iso('U')[0].notable.flag, false);
  assert.equal(iso('U').length, 3);
});

test('an element with no natural isotopes falls back to one radioactive isotope', () => {
  for (const sym of ['Pm', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Np', 'Am', 'Og']) {
    const list = iso(sym);
    assert.equal(list.length, 1, sym);
    assert.equal(list[0].stable, false);
    assert.equal(list[0].abundance, null);
    assert.equal(list[0].mass, ELEMENTS_BY_SYMBOL[sym].weight);
    assert.match(list[0].note, /no stable isotopes/);
  }
  assert.ok(iso('Tc').some((i) => i.mass === 99 && i.notable.flag), 'Tc-99 is added as notable');
});

test('hydrogen uses its hand-written list: protium, deuterium, tritium', () => {
  assert.equal(iso('H'), HYDROGEN_ISOTOPES);
  assert.deepEqual(HYDROGEN_ISOTOPES.map((i) => [i.name, i.mass, i.neutrons, i.stable]), [
    ['Protium', 1, 0, true],
    ['Deuterium', 2, 1, true],
    ['Tritium', 3, 2, false],
  ]);
});

test('the generic note counts neutrons and protons in the right grammatical number', () => {
  const he3 = iso('He').find((i) => i.mass === 3);
  assert.match(he3.note, /with 1 neutron alongside its 2 protons\./);
  assert.match(iso('He').find((i) => i.mass === 4).note, /with 2 neutrons alongside/);
});

test('the dataset\'s mass number is the most abundant natural isotope, or else the longest-lived', () => {
  for (const [, sym, , weight] of ELEMENTS) {
    const nat = NATURAL_ISOTOPES[sym];
    const expected = nat.length ? [...nat].sort((a, b) => b.abundance - a.abundance)[0].mass : LONGEST_LIVED_ISOTOPE[sym];
    assert.equal(weight, expected, sym);
  }
});

test('the generated data covers all 118 elements, and only the ones with no natural isotope get a fallback', () => {
  assert.deepEqual(Object.keys(NATURAL_ISOTOPES), ELEMENTS.map(([, s]) => s));
  for (const [, sym] of ELEMENTS) {
    assert.equal(sym in LONGEST_LIVED_ISOTOPE, NATURAL_ISOTOPES[sym].length === 0, sym);
  }
});
