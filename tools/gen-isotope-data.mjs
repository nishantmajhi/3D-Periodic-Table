#!/usr/bin/env node
// Regenerates src/data/isotopeData.js from published nuclear data.
//
//   node tools/gen-isotope-data.mjs            fetch (or reuse tools/.cache/) and write
//   node tools/gen-isotope-data.mjs --check    exit 1 if the committed file would change
//
// Three questions, each answered from sources that are maintained separately,
// so that one stale or mistyped entry is outvoted rather than shipped:
//
//   Which isotopes occur naturally, and how abundant are they?
//     NIST, "Atomic Weights and Isotopic Compositions for All Elements" --
//     the one source, as before; it is the reference the others cite.
//
//   Is a naturally occurring isotope stable?
//     Radioactive when at least two of IAEA LiveChart, NUBASE2020 and
//     Wikipedia's "List of nuclides" report an observed decay. A half-life
//     given only as a lower bound ("> 1e18 y") is not an observed decay. For
//     NUBASE the state that carries the natural abundance is used, which is
//     how Ta-180 comes out stable: natural tantalum-180 is the isomer
//     Ta-180m, not the 8-hour ground state.
//
//   For an element with no natural isotopes, which isotope lives longest?
//     The majority of IAEA LiveChart (ground states with a measured
//     half-life), NUBASE2020 (likewise, estimates marked # excluded) and
//     PubChem's periodic table (its mass, rounded). The generator refuses to
//     write if any element has no majority.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'tools', '.cache');
const OUT = path.join(ROOT, 'src', 'data', 'isotopeData.js');
const CHECK = process.argv.includes('--check');

const SOURCES = {
  nist: 'https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ele=&ascii=ascii2&isotype=all',
  iaea: 'https://nds.iaea.org/relnsd/v1/data?fields=ground_states&nuclides=all',
  nubase: 'https://www-nds.iaea.org/amdc/ame2020/nubase_4.mas20.txt',
  wikipedia: 'https://en.wikipedia.org/w/index.php?title=List_of_nuclides&action=raw',
  pubchem: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/CSV',
};

async function source(name) {
  const file = path.join(CACHE, `${name}.txt`);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const res = await fetch(SOURCES[name], { headers: { 'user-agent': 'periodic-table-3d data generator' } });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const text = await res.text();
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, text);
  return text;
}

// --- parsers ---------------------------------------------------------------

// NIST ascii2: blank-line separated blocks of "Key = value" lines.
function parseNist(text) {
  const natural = {}; // symbol -> [{ mass, abundance }]
  for (const block of text.split(/\n\s*\n/)) {
    const field = (k) => (block.match(new RegExp(`${k} = ([^\\n]*)`)) || [])[1]?.trim();
    if (!field('Atomic Number')) continue;
    const sym = field('Atomic Symbol').replace(/^[DT]$/, 'H'); // NIST lists H-2/H-3 as D and T
    const comp = field('Isotopic Composition');
    if (!comp) continue;
    (natural[sym] ||= []).push({ mass: +field('Mass Number'), abundance: Number(comp.replace(/\(.*\)/, '')) });
  }
  return natural;
}

// IAEA LiveChart ground states (CSV). A half-life with an operator (GT, GE,
// LT, AP...) is a bound or an estimate, not a measurement.
function parseIaea(text) {
  const [head, ...rows] = text.trim().split('\n');
  const col = Object.fromEntries(head.split(',').map((n, i) => [n, i]));
  const out = {}; // "Sym-A" -> { verdict, seconds }
  for (const row of rows) {
    const f = row.split(',');
    const key = `${f[col.symbol]}-${+f[col.z] + +f[col.n]}`;
    const hl = f[col.half_life], measured = hl && hl !== 'STABLE' && !f[col.operator_hl] && f[col.half_life_sec] !== '';
    out[key] = { verdict: hl === 'STABLE' ? 'stable' : measured ? 'radioactive' : 'unknown', seconds: measured ? +f[col.half_life_sec] : null };
  }
  return out;
}

// NUBASE2020 fixed columns. Isomers are flagged by the digit in column 8 and
// a letter after the symbol; "#" marks a value from systematics, not a
// measurement.
const UNIT = { ys: 1e-24, zs: 1e-21, as: 1e-18, fs: 1e-15, ps: 1e-12, ns: 1e-9, us: 1e-6, ms: 1e-3, s: 1, m: 60, h: 3600, d: 86400, y: 31556926 };
for (const [p, f] of Object.entries({ k: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15, E: 1e18, Z: 1e21, Y: 1e24 })) UNIT[`${p}y`] = f * UNIT.y;
function parseNubase(text) {
  const ground = {}, natural = {};
  for (const line of text.split('\n')) {
    if (line.startsWith('#') || line.length < 100) continue;
    const A = +line.slice(0, 3), state = line[7];
    const name = line.slice(11, 17).trim().replace(/^\d+/, '');
    const sym = state === '0' ? name : name.slice(0, -1);
    const [hl = '', unit = ''] = line.slice(69, 88).trim().split(/\s+/);
    const measured = /^[\d.]+$/.test(hl) && UNIT[unit];
    const rec = { verdict: hl === 'stbl' ? 'stable' : measured ? 'radioactive' : 'unknown', seconds: measured ? +hl * UNIT[unit] : null, isomer: state !== '0' };
    const key = `${sym}-${A}`;
    if (state === '0') ground[key] = rec;
    if (/IS=/.test(line.slice(119))) natural[key] = rec;
  }
  return { ground, natural };
}

// Wikipedia's list puts each nuclide under a heading: the stable and
// observationally stable ones first, then the radionuclides from
// "Primordial radioactive nuclides" onwards. An isomer is keyed "Ta-180m".
function parseWikipedia(text) {
  const verdict = {};
  let section = 'stable';
  for (const line of text.split('\n')) {
    if (/^===?Primordial radioactive nuclides/.test(line)) section = 'radioactive';
    for (const m of line.matchAll(/^\|\|_row_count\|\|\[\[[^\]|]*\|<sup>(\d+)(m?)\d*<\/sup>([A-Z][a-z]?)/g)) verdict[`${m[3]}-${m[1]}${m[2]}`] ??= section;
  }
  return verdict;
}

function parsePubchem(text) {
  const out = {};
  for (const line of text.trim().split('\n').slice(1)) {
    const f = [...line.matchAll(/"([^"]*)"|([^,]+)|(?<=,)(?=,|$)/g)].map((m) => m[1] ?? m[2] ?? '');
    out[f[1]] = Math.round(parseFloat(f[3]));
  }
  return out;
}

// --- votes -----------------------------------------------------------------

function majority(votes) {
  const tally = new Map();
  for (const v of votes) if (v != null) tally.set(v, (tally.get(v) || 0) + 1);
  for (const [v, n] of tally) if (n >= 2) return v;
  return null;
}

function longestLived(records, sym) {
  let best = null;
  for (const [key, r] of Object.entries(records)) {
    const [s, A] = key.split('-');
    if (s === sym && r.seconds != null && (!best || r.seconds > best.seconds)) best = { mass: +A, seconds: r.seconds };
  }
  return best?.mass ?? null;
}

async function main() {
  const elementsSrc = fs.readFileSync(path.join(ROOT, 'src', 'data', 'elements.js'), 'utf8');
  const symbols = [...elementsSrc.matchAll(/\[(\d+), '([A-Z][a-z]?)', '[A-Za-z]+', \d+\]/g)].map((m) => m[2]);
  if (symbols.length !== 118) throw new Error(`read ${symbols.length} elements from elements.js, expected 118`);

  const nist = parseNist(await source('nist'));
  const iaea = parseIaea(await source('iaea'));
  const nubase = parseNubase(await source('nubase'));
  const wiki = parseWikipedia(await source('wikipedia'));
  const pubchem = parsePubchem(await source('pubchem'));

  const natural = {}, longest = {}, disputes = [];
  for (const sym of symbols) {
    natural[sym] = (nist[sym] || []).map(({ mass, abundance }) => {
      const key = `${sym}-${mass}`;
      // When the natural form is an isomer, the ground state's half-life says
      // nothing about it, and IAEA's ground-state table has no vote.
      const nub = nubase.natural[key] || nubase.ground[key];
      const votes = nub?.isomer ? ['unknown', nub.verdict, wiki[`${key}m`]] : [iaea[key]?.verdict, nub?.verdict, wiki[key]];
      const radioactive = votes.filter((v) => v === 'radioactive').length >= 2;
      if (votes.includes('radioactive') && !radioactive) disputes.push(`${key} radioactive by one source of three (${votes.join(', ')})`);
      if (!radioactive && votes.filter((v) => v === 'stable').length === 0) throw new Error(`${key}: no source calls it stable (${votes.join(', ')})`);
      return { mass, abundance, stable: !radioactive };
    });
    if (!natural[sym].length) {
      const votes = [longestLived(iaea, sym), longestLived(nubase.ground, sym), pubchem[sym]];
      const mass = majority(votes);
      if (mass == null) throw new Error(`${sym}: no majority for the longest-lived isotope (${votes.join(', ')})`);
      longest[sym] = mass;
    }
  }

  const lines = [
    '// GENERATED by tools/gen-isotope-data.mjs -- do not hand-edit; run it instead.',
    '// See that file for the sources and the voting rules.',
    '//',
    '// NATURAL_ISOTOPES: per element, every isotope NIST lists with a natural',
    '// isotopic composition, with that abundance (mole fraction, 0.9893 = 98.93%)',
    '// and whether it is stable. Some are radioactive but long-lived enough to',
    '// occur naturally -- U-238, K-40, Th-232 -- or are replenished by decay, like',
    '// U-234 and Pa-231; those have stable: false.',
    '//',
    '// LONGEST_LIVED_ISOTOPE: for each element with no natural isotopes, the mass',
    '// number of its longest-lived known isotope.',
    'export const NATURAL_ISOTOPES = {',
    ...symbols.map((s) => `  ${s}: [${natural[s].map((i) => `{ mass: ${i.mass}, abundance: ${i.abundance}, stable: ${i.stable} }`).join(', ')}],`),
    '};',
    '',
    'export const LONGEST_LIVED_ISOTOPE = {',
    ...Object.entries(longest).map(([s, m]) => `  ${s}: ${m},`),
    '};',
    '',
  ];
  const text = lines.join('\n');

  for (const d of disputes) console.log(`note: ${d}; kept stable`);
  if (CHECK) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
    if (current !== text) { console.error(`${path.relative(ROOT, OUT)} is out of date`); process.exit(1); }
    console.log(`${path.relative(ROOT, OUT)} is up to date`);
    return;
  }
  fs.writeFileSync(OUT, text);
  const radioactive = Object.entries(natural).flatMap(([s, l]) => l.filter((i) => !i.stable).map((i) => `${s}-${i.mass}`));
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${Object.values(natural).flat().length} natural isotopes, ${radioactive.length} radioactive, ${Object.keys(longest).length} elements with none`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
