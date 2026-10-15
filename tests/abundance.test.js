// How the detail panel writes a natural abundance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS_BY_SYMBOL } from '../src/data/elements.js';
import { getIsotopesFor, formatAbundance } from '../src/data/isotopes.js';
import { NATURAL_ISOTOPES } from '../src/data/isotopeData.js';

const iso = (sym, mass) => getIsotopesFor(ELEMENTS_BY_SYMBOL[sym]).find((i) => i.mass === mass);

test('three significant figures, as before, for ordinary values', () => {
  assert.equal(formatAbundance(0.9893), '98.9%');
  assert.equal(formatAbundance(0.0107), '1.07%');
  assert.equal(formatAbundance(0.00000134), '0.000134%');
  assert.equal(formatAbundance(0.5069), '50.7%');
});

test('an element with one natural isotope is 100%', () => {
  assert.equal(formatAbundance(1), '100%');
});

test('regression: an isotope with a sibling never reads 100%', () => {
  // toPrecision(3) rounded these up, so helium read 100% + 0.000134%.
  assert.equal(formatAbundance(0.99999866), '99.9999%');
  assert.equal(formatAbundance(0.9998799), '99.99%');
  assert.equal(formatAbundance(0.999885), '99.99%');
  for (const [sym, list] of Object.entries(NATURAL_ISOTOPES)) {
    for (const { mass, abundance } of list) {
      if (abundance < 1) assert.notEqual(formatAbundance(abundance), '100%', `${sym}-${mass}`);
    }
  }
});

test('regression: protium and deuterium carry their natural abundance like every other isotope', () => {
  assert.equal(iso('H', 1).abundance, 0.999885);
  assert.equal(iso('H', 2).abundance, 0.000115);
  assert.equal(iso('H', 3).abundance, null, 'tritium does not occur naturally in measurable amounts');
});
