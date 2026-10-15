// Isotope data scope (decided in tracker.md): the naturally occurring
// isotopes as the base list, plus a curated `notable` flag for isotopes with
// outsized real-world relevance regardless of stability. This keeps typical
// per-element counts small (1–6, max 10 for Sn) so the cuboid can stay a
// single row that wraps to a grid past ~5, without needing pagination or
// scrolling.
//
// The base list is generated from NIST, and whether each isotope is stable
// from a vote of three nuclear data sources -- see isotopeData.js and
// tools/gen-isotope-data.mjs. Naturally occurring is not the same as stable:
// U-238, K-40 and 32 others occur in nature and are radioactive.

import { NATURAL_ISOTOPES, LONGEST_LIVED_ISOTOPE } from './isotopeData.js';

const naturalAbundance = (sym, mass) => NATURAL_ISOTOPES[sym].find((i) => i.mass === mass)?.abundance ?? null;

export const HYDROGEN_ISOTOPES = [
  { mass: 1, name: 'Protium', protons: 1, neutrons: 0, stable: true, abundance: naturalAbundance('H', 1), notable: { flag: true, reason: 'Over 99.98% of natural hydrogen' }, note: 'The common form of hydrogen: one proton, no neutrons. Makes up over 99.98% of natural hydrogen.' },
  { mass: 2, name: 'Deuterium', protons: 1, neutrons: 1, stable: true, abundance: naturalAbundance('H', 2), notable: { flag: true, reason: 'Used in heavy water and nuclear research' }, note: 'Stable isotope used in heavy water and nuclear research.' },
  { mass: 3, name: 'Tritium', protons: 1, neutrons: 2, stable: false, abundance: null, notable: { flag: true, reason: 'Used in self-luminous signage' }, note: 'Radioactive, half-life ≈ 12.3 years. Used in self-luminous signage.' },
];

// Curated "notable" isotopes — radioactive isotopes with outsized real-world
// relevance that wouldn't otherwise appear (since they have no natural
// abundance and so aren't in NATURAL_ISOTOPES). Expand this table over
// time; it's intentionally a small illustrative set, not exhaustive.
const NOTABLE_BY_SYMBOL = {
  C: [{ mass: 14, reason: 'Used in radiocarbon dating' }],
  Co: [{ mass: 60, reason: 'Used in radiotherapy and industrial radiography' }],
  I: [{ mass: 131, reason: 'Used in thyroid imaging and treatment' }],
  Tc: [{ mass: 99, reason: 'Most common isotope used in nuclear medicine imaging' }],
  U: [
    { mass: 235, reason: 'The fissile isotope used in nuclear reactors and weapons' },
    { mass: 238, reason: 'The most abundant natural uranium isotope' },
  ],
  Pu: [{ mass: 239, reason: 'Fissile isotope produced in reactors, used in weapons' }],
};

function baseNote(elName, mass, protons, stable) {
  const n = mass - protons;
  if (!stable) {
    return `A radioactive form of ${elName} with ${n} neutron${n === 1 ? '' : 's'} alongside its ${protons} proton${protons > 1 ? 's' : ''}.`;
  }
  return `A stable, naturally occurring form of ${elName} with ${n} neutron${n === 1 ? '' : 's'} alongside its ${protons} proton${protons > 1 ? 's' : ''}.`;
}

export function getIsotopesFor(el) {
  if (el.sym === 'H') return HYDROGEN_ISOTOPES;

  const Z = el.z;
  const naturalList = NATURAL_ISOTOPES[el.sym] || [];

  let isotopes;
  if (naturalList.length > 0) {
    isotopes = naturalList.map(({ mass, abundance, stable }) => ({
      mass,
      protons: Z,
      neutrons: mass - Z,
      name: `${el.name}-${mass}`,
      stable,
      abundance,
      notable: { flag: false, reason: '' },
      note: baseNote(el.name, mass, Z, stable),
    }));
  } else {
    // Nothing occurs naturally, so nothing is stable -- fall back to the
    // longest-lived known isotope, e.g. Tc-97, Pm-145, Po-209.
    const mass = LONGEST_LIVED_ISOTOPE[el.sym];
    isotopes = [{
      mass,
      protons: Z,
      neutrons: mass - Z,
      name: `${el.name}-${mass}`,
      stable: false,
      abundance: null,
      notable: { flag: false, reason: '' },
      note: `${el.name} has no stable isotopes — every known form, including this one (its longest-lived), is radioactive.`,
    }];
  }

  // Fold in curated notables, avoiding duplicate mass numbers
  const notables = NOTABLE_BY_SYMBOL[el.sym] || [];
  notables.forEach((n) => {
    const existing = isotopes.find((iso) => iso.mass === n.mass);
    if (existing) {
      existing.notable = { flag: true, reason: n.reason };
    } else {
      isotopes.push({
        mass: n.mass,
        protons: Z,
        neutrons: n.mass - Z,
        name: `${el.name}-${n.mass}`,
        stable: false,
        abundance: null,
        notable: { flag: true, reason: n.reason },
        note: n.reason,
      });
    }
  });

  isotopes.sort((a, b) => a.mass - b.mass);
  return isotopes;
}

// A natural abundance as a percentage, to three significant figures -- except
// that a value short of 1 is never allowed to round up to "100%", which would
// contradict the sibling isotope listed next to it (He-4 is 99.999866%).
export function formatAbundance(abundance) {
  const pct = abundance * 100;
  let digits = 3;
  while (abundance < 1 && Number(pct.toPrecision(digits)) >= 100) digits += 1;
  return `${pct.toPrecision(digits)}%`;
}
