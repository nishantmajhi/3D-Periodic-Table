// The facts the detail panel states about an isotope, checked against the
// nuclear data the generator votes over (tools/gen-isotope-data.mjs): IAEA
// LiveChart, NUBASE2020 and Wikipedia's list of nuclides for stability; IAEA,
// NUBASE2020 and PubChem for the longest-lived isotope; NIST for abundance.
//
// These import only getIsotopesFor, so they run unchanged against the code
// this pass started from -- where every "regression:" test fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS, ELEMENTS_BY_SYMBOL } from '../src/data/elements.js';
import { getIsotopesFor } from '../src/data/isotopes.js';

const iso = (sym, mass) => getIsotopesFor(ELEMENTS_BY_SYMBOL[sym]).find((i) => i.mass === mass);

// Every naturally occurring isotope with an observed decay, by majority of the
// three sources. Ta-180 is absent on purpose: natural tantalum-180 is the
// long-lived isomer Ta-180m, whose decay has never been seen.
const RADIOACTIVE_NATURAL = [
  'K-40', 'Ca-48', 'V-50', 'Ge-76', 'Se-82', 'Rb-87', 'Zr-96', 'Mo-100', 'Cd-113', 'Cd-116',
  'In-115', 'Te-128', 'Te-130', 'Xe-136', 'La-138', 'Nd-144', 'Nd-150', 'Sm-147', 'Sm-148',
  'Eu-151', 'Gd-152', 'Lu-176', 'Hf-174', 'W-180', 'Re-187', 'Os-184', 'Os-186', 'Pt-190',
  'Bi-209', 'Th-232', 'Pa-231', 'U-234', 'U-235', 'U-238',
];

test('regression: uranium-238 is radioactive, and the panel says so', () => {
  const u238 = iso('U', 238);
  assert.equal(u238.stable, false);
  assert.match(u238.note, /radioactive/);
  assert.doesNotMatch(u238.note, /stable/);
});

test('regression: every naturally occurring isotope with an observed decay is marked radioactive', () => {
  const wrong = RADIOACTIVE_NATURAL.filter((k) => {
    const [sym, mass] = k.split('-');
    return iso(sym, +mass).stable !== false;
  });
  assert.deepEqual(wrong, []);
});

test('regression: protactinium-231 is radioactive -- it is not even primordial (32,600 years)', () => {
  assert.equal(iso('Pa', 231).stable, false);
});

test('the radioactive natural isotopes keep their natural abundance', () => {
  for (const k of RADIOACTIVE_NATURAL) {
    const [sym, mass] = k.split('-');
    const i = iso(sym, +mass);
    assert.ok(i.abundance > 0, k);
  }
});

test('every other natural isotope is stable, Ta-180m included', () => {
  const radioactive = new Set(RADIOACTIVE_NATURAL);
  for (const [, sym] of ELEMENTS) {
    if (sym === 'H') continue;
    for (const i of getIsotopesFor(ELEMENTS_BY_SYMBOL[sym])) {
      if (i.abundance == null) continue;
      if (!radioactive.has(`${sym}-${i.mass}`)) assert.equal(i.stable, true, `${sym}-${i.mass}`);
    }
  }
  assert.equal(iso('Ta', 180).stable, true);
});

test('a stable isotope is still described as stable', () => {
  assert.equal(iso('Fe', 56).stable, true);
  assert.match(iso('Fe', 56).note, /^A stable, naturally occurring form of Iron/);
});

test('regression: helium-3 has the abundance NIST publishes, not a rounded one', () => {
  // The old generator rounded to six decimals: 0.00000134 became 0.000001,
  // which the panel showed as 0.000100% -- a quarter low.
  assert.equal(iso('He', 3).abundance, 0.00000134);
  assert.equal(iso('He', 4).abundance, 0.99999866);
  assert.equal(iso('La', 138).abundance, 0.0008881);
  assert.equal(iso('Ta', 180).abundance, 0.0001201);
});

// Elements with no natural isotopes show only their longest-lived one.
const LONGEST_LIVED = {
  Tc: 97, Pm: 145, Po: 209, At: 210, Rn: 222, Fr: 223, Ra: 226, Ac: 227, Np: 237, Pu: 244,
  Am: 243, Cm: 247, Bk: 247, Cf: 251, Es: 252, Fm: 257, Md: 258, No: 259, Lr: 266, Rf: 267,
  Db: 268, Sg: 269, Bh: 270, Hs: 269, Mt: 277, Ds: 282, Rg: 282, Cn: 286, Nh: 286, Fl: 290,
  Mc: 290, Lv: 293, Ts: 294, Og: 295,
};

test('regression: the isotope shown as an element\'s longest-lived is the longest-lived one', () => {
  const wrong = [];
  for (const [sym, mass] of Object.entries(LONGEST_LIVED)) {
    const fallback = getIsotopesFor(ELEMENTS_BY_SYMBOL[sym]).find((i) => /longest-lived/.test(i.note));
    if (!fallback || fallback.mass !== mass) wrong.push(`${sym}: ${fallback?.mass} not ${mass}`);
  }
  assert.deepEqual(wrong, []);
});

test('the fallback isotope is radioactive with no abundance', () => {
  for (const sym of Object.keys(LONGEST_LIVED)) {
    const fallback = getIsotopesFor(ELEMENTS_BY_SYMBOL[sym]).find((i) => /longest-lived/.test(i.note));
    assert.equal(fallback.stable, false, sym);
    assert.equal(fallback.abundance, null, sym);
  }
});
