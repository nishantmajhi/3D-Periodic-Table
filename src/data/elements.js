// Ported directly from periodic-table-prototype.html — same data, same
// category logic, same PERIODS layout table. Kept framework-agnostic (no
// three.js / React imports here) so it can be unit-tested or swapped for a
// generated JSON later without touching scene code.

export const CATEGORY_COLORS = {
  alkali: 0xff6b6b,
  alkaline: 0xffa94d,
  transition: 0xffd43b,
  posttrans: 0x74c0fc,
  metalloid: 0xb197fc,
  nonmetal: 0x8ce99a,
  halogen: 0xff8fa3,
  noble: 0xd0bfff,
  lanthanide: 0x63e6be,
  actinide: 0x66d9e8,
};

const CAT = {
  alkali: ['Li', 'Na', 'K', 'Rb', 'Cs', 'Fr'],
  alkaline: ['Be', 'Mg', 'Ca', 'Sr', 'Ba', 'Ra'],
  posttrans: ['Al', 'Ga', 'In', 'Sn', 'Tl', 'Pb', 'Bi', 'Nh', 'Fl', 'Mc', 'Lv'],
  metalloid: ['B', 'Si', 'Ge', 'As', 'Sb', 'Te', 'Po', 'At'],
  nonmetal: ['H', 'C', 'N', 'O', 'P', 'S', 'Se'],
  halogen: ['F', 'Cl', 'Br', 'I', 'Ts'],
  noble: ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'Og'],
};

export const LANTHANIDES = ['La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu'];
export const ACTINIDES = ['Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr'];

export function categoryOf(sym) {
  if (LANTHANIDES.includes(sym)) return 'lanthanide';
  if (ACTINIDES.includes(sym)) return 'actinide';
  for (const k in CAT) if (CAT[k].includes(sym)) return k;
  return 'transition';
}

// [group, symbol, atomicNumber] per period — defines table LAYOUT only.
// '*' marks the La/Ac range-cell; the real elements live in the pillars.
export const PERIODS = [
  [[1, 'H', 1], [18, 'He', 2]],
  [[1, 'Li', 3], [2, 'Be', 4], [13, 'B', 5], [14, 'C', 6], [15, 'N', 7], [16, 'O', 8], [17, 'F', 9], [18, 'Ne', 10]],
  [[1, 'Na', 11], [2, 'Mg', 12], [13, 'Al', 13], [14, 'Si', 14], [15, 'P', 15], [16, 'S', 16], [17, 'Cl', 17], [18, 'Ar', 18]],
  [[1, 'K', 19], [2, 'Ca', 20], [3, 'Sc', 21], [4, 'Ti', 22], [5, 'V', 23], [6, 'Cr', 24], [7, 'Mn', 25], [8, 'Fe', 26], [9, 'Co', 27], [10, 'Ni', 28], [11, 'Cu', 29], [12, 'Zn', 30], [13, 'Ga', 31], [14, 'Ge', 32], [15, 'As', 33], [16, 'Se', 34], [17, 'Br', 35], [18, 'Kr', 36]],
  [[1, 'Rb', 37], [2, 'Sr', 38], [3, 'Y', 39], [4, 'Zr', 40], [5, 'Nb', 41], [6, 'Mo', 42], [7, 'Tc', 43], [8, 'Ru', 44], [9, 'Rh', 45], [10, 'Pd', 46], [11, 'Ag', 47], [12, 'Cd', 48], [13, 'In', 49], [14, 'Sn', 50], [15, 'Sb', 51], [16, 'Te', 52], [17, 'I', 53], [18, 'Xe', 54]],
  [[1, 'Cs', 55], [2, 'Ba', 56], [3, 'La*', 0], [4, 'Hf', 72], [5, 'Ta', 73], [6, 'W', 74], [7, 'Re', 75], [8, 'Os', 76], [9, 'Ir', 77], [10, 'Pt', 78], [11, 'Au', 79], [12, 'Hg', 80], [13, 'Tl', 81], [14, 'Pb', 82], [15, 'Bi', 83], [16, 'Po', 84], [17, 'At', 85], [18, 'Rn', 86]],
  [[1, 'Fr', 87], [2, 'Ra', 88], [3, 'Ac*', 0], [4, 'Rf', 104], [5, 'Db', 105], [6, 'Sg', 106], [7, 'Bh', 107], [8, 'Hs', 108], [9, 'Mt', 109], [10, 'Ds', 110], [11, 'Rg', 111], [12, 'Cn', 112], [13, 'Nh', 113], [14, 'Fl', 114], [15, 'Mc', 115], [16, 'Lv', 116], [17, 'Ts', 117], [18, 'Og', 118]],
];

// Full 118-element dataset: [Z, symbol, name, mass number]. The mass number
// is that of the most abundant natural isotope or, for an element with none,
// the longest-lived one -- tests/isotopes.test.js holds it to isotopeData.js.
export const ELEMENTS = [
  [1, 'H', 'Hydrogen', 1], [2, 'He', 'Helium', 4], [3, 'Li', 'Lithium', 7], [4, 'Be', 'Beryllium', 9],
  [5, 'B', 'Boron', 11], [6, 'C', 'Carbon', 12], [7, 'N', 'Nitrogen', 14], [8, 'O', 'Oxygen', 16],
  [9, 'F', 'Fluorine', 19], [10, 'Ne', 'Neon', 20], [11, 'Na', 'Sodium', 23], [12, 'Mg', 'Magnesium', 24],
  [13, 'Al', 'Aluminium', 27], [14, 'Si', 'Silicon', 28], [15, 'P', 'Phosphorus', 31], [16, 'S', 'Sulfur', 32],
  [17, 'Cl', 'Chlorine', 35], [18, 'Ar', 'Argon', 40], [19, 'K', 'Potassium', 39], [20, 'Ca', 'Calcium', 40],
  [21, 'Sc', 'Scandium', 45], [22, 'Ti', 'Titanium', 48], [23, 'V', 'Vanadium', 51], [24, 'Cr', 'Chromium', 52],
  [25, 'Mn', 'Manganese', 55], [26, 'Fe', 'Iron', 56], [27, 'Co', 'Cobalt', 59], [28, 'Ni', 'Nickel', 58],
  [29, 'Cu', 'Copper', 63], [30, 'Zn', 'Zinc', 64], [31, 'Ga', 'Gallium', 69], [32, 'Ge', 'Germanium', 74],
  [33, 'As', 'Arsenic', 75], [34, 'Se', 'Selenium', 80], [35, 'Br', 'Bromine', 79], [36, 'Kr', 'Krypton', 84],
  [37, 'Rb', 'Rubidium', 85], [38, 'Sr', 'Strontium', 88], [39, 'Y', 'Yttrium', 89], [40, 'Zr', 'Zirconium', 90],
  [41, 'Nb', 'Niobium', 93], [42, 'Mo', 'Molybdenum', 98], [43, 'Tc', 'Technetium', 97], [44, 'Ru', 'Ruthenium', 102],
  [45, 'Rh', 'Rhodium', 103], [46, 'Pd', 'Palladium', 106], [47, 'Ag', 'Silver', 107], [48, 'Cd', 'Cadmium', 114],
  [49, 'In', 'Indium', 115], [50, 'Sn', 'Tin', 120], [51, 'Sb', 'Antimony', 121], [52, 'Te', 'Tellurium', 130],
  [53, 'I', 'Iodine', 127], [54, 'Xe', 'Xenon', 132], [55, 'Cs', 'Caesium', 133], [56, 'Ba', 'Barium', 138],
  [57, 'La', 'Lanthanum', 139], [58, 'Ce', 'Cerium', 140], [59, 'Pr', 'Praseodymium', 141], [60, 'Nd', 'Neodymium', 142],
  [61, 'Pm', 'Promethium', 145], [62, 'Sm', 'Samarium', 152], [63, 'Eu', 'Europium', 153], [64, 'Gd', 'Gadolinium', 158],
  [65, 'Tb', 'Terbium', 159], [66, 'Dy', 'Dysprosium', 164], [67, 'Ho', 'Holmium', 165], [68, 'Er', 'Erbium', 166],
  [69, 'Tm', 'Thulium', 169], [70, 'Yb', 'Ytterbium', 174], [71, 'Lu', 'Lutetium', 175], [72, 'Hf', 'Hafnium', 180],
  [73, 'Ta', 'Tantalum', 181], [74, 'W', 'Tungsten', 184], [75, 'Re', 'Rhenium', 187], [76, 'Os', 'Osmium', 192],
  [77, 'Ir', 'Iridium', 193], [78, 'Pt', 'Platinum', 195], [79, 'Au', 'Gold', 197], [80, 'Hg', 'Mercury', 202],
  [81, 'Tl', 'Thallium', 205], [82, 'Pb', 'Lead', 208], [83, 'Bi', 'Bismuth', 209], [84, 'Po', 'Polonium', 209],
  [85, 'At', 'Astatine', 210], [86, 'Rn', 'Radon', 222], [87, 'Fr', 'Francium', 223], [88, 'Ra', 'Radium', 226],
  [89, 'Ac', 'Actinium', 227], [90, 'Th', 'Thorium', 232], [91, 'Pa', 'Protactinium', 231], [92, 'U', 'Uranium', 238],
  [93, 'Np', 'Neptunium', 237], [94, 'Pu', 'Plutonium', 244], [95, 'Am', 'Americium', 243], [96, 'Cm', 'Curium', 247],
  [97, 'Bk', 'Berkelium', 247], [98, 'Cf', 'Californium', 251], [99, 'Es', 'Einsteinium', 252], [100, 'Fm', 'Fermium', 257],
  [101, 'Md', 'Mendelevium', 258], [102, 'No', 'Nobelium', 259], [103, 'Lr', 'Lawrencium', 266], [104, 'Rf', 'Rutherfordium', 267],
  [105, 'Db', 'Dubnium', 268], [106, 'Sg', 'Seaborgium', 269], [107, 'Bh', 'Bohrium', 270], [108, 'Hs', 'Hassium', 269],
  [109, 'Mt', 'Meitnerium', 277], [110, 'Ds', 'Darmstadtium', 282], [111, 'Rg', 'Roentgenium', 282], [112, 'Cn', 'Copernicium', 286],
  [113, 'Nh', 'Nihonium', 286], [114, 'Fl', 'Flerovium', 290], [115, 'Mc', 'Moscovium', 290], [116, 'Lv', 'Livermorium', 293],
  [117, 'Ts', 'Tennessine', 294], [118, 'Og', 'Oganesson', 295],
];

export const ELEMENTS_BY_SYMBOL = {};
ELEMENTS.forEach(([z, sym, name, weight]) => {
  ELEMENTS_BY_SYMBOL[sym] = { z, sym, name, weight, category: categoryOf(sym) };
});

// Layout constants — ported 1:1 from the prototype
export const SP = 1.05;
export const TILE = 0.86;
export const TILE_H = 0.2;
export const colX = (c) => (c - 8.5) * SP; // c = group-1 (0..17)
export const rowZ = (r) => (r - 3) * SP; // r = period index (0..6)

// The La*/Ac* marker cells are taller than an ordinary tile so they read as
// the top of their pillar. Every tile's box sits on the floor (y = 0).
export const MARKER_H = 0.42;

// Pillars hang *below* the floor (negative Y) rather than rising above it --
// keeps the lanthanide/actinide stacks out of the way of the readable 2D
// overview and out of the "isotope pop" cuboid's airspace in front of the
// camera. PILLAR_START_Y is the (positive) distance from the marker cell's
// underside down to the first pillar cube's center. Chosen so the gap between
// the marker cell's bottom face and the first pillar cube's top face matches
// the normal edge-to-edge gap between adjacent tiles in the main grid
// (SP - TILE), rather than reading as a much bigger, disconnected gap.
export const PILLAR_CUBE_H = 0.42;
export const PILLAR_CUBE_W = TILE * 0.8;
export const PILLAR_START_Y = SP - TILE + PILLAR_CUBE_H / 2;
export const PILLAR_STEP_Y = PILLAR_CUBE_H + 0.08; // small breathing room between stacked cubes
export const pillarY = (index) => -(PILLAR_START_Y + index * PILLAR_STEP_Y);

// Every cell of the floor, in PERIODS order: one entry per element tile and
// one per marker cell, with the pillar it carries. TableScene renders this.
export function tableLayout() {
  const out = [];
  PERIODS.forEach((row, ri) => {
    row.forEach(([grp, sym]) => {
      const marker = sym.includes('*');
      let el;
      if (marker) {
        const cat = ri === 5 ? 'lanthanide' : 'actinide';
        el = { category: cat, rangeLabel: ri === 5 ? '57-71' : '89-103' };
      } else {
        el = { ...ELEMENTS_BY_SYMBOL[sym], category: categoryOf(sym) };
      }
      out.push({
        key: `${ri}-${grp}-${sym}`,
        el,
        marker,
        position: [colX(grp - 1), 0, rowZ(ri)],
        pillarSymbols: marker ? (ri === 5 ? LANTHANIDES : ACTINIDES) : null,
      });
    });
  });
  return out;
}

// The floor-mounted category legend: centered across the empty groups 3-12
// of periods 1-3, with the aspect ratio of buildKeyTexture's 900x340 canvas.
export const CATEGORY_KEY_LAYOUT = { x: colX(6.5), z: rowZ(1), w: 4.2, h: 4.2 * (340 / 900) };
