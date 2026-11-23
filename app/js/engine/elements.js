// Periodic table data used by every mass calculation.
// Atomic masses: IUPAC/CIAAW abridged standard atomic weights (2021), given to
// 5 significant figures where the abridged table allows, which is the precision
// used in most general-chemistry textbooks. For elements with no stable isotope
// the mass number of the longest-lived isotope is used (flagged radioactive).
// Categories are used by the reaction classifier and product predictor.

const RAW = [
  // [Z, symbol, name, mass, category, radioactive]
  [1, 'H', 'Hydrogen', 1.008, 'nonmetal'],
  [2, 'He', 'Helium', 4.0026, 'noble'],
  [3, 'Li', 'Lithium', 6.94, 'alkali'],
  [4, 'Be', 'Beryllium', 9.0122, 'alkaline-earth'],
  [5, 'B', 'Boron', 10.81, 'metalloid'],
  [6, 'C', 'Carbon', 12.011, 'nonmetal'],
  [7, 'N', 'Nitrogen', 14.007, 'nonmetal'],
  [8, 'O', 'Oxygen', 15.999, 'nonmetal'],
  [9, 'F', 'Fluorine', 18.998, 'halogen'],
  [10, 'Ne', 'Neon', 20.180, 'noble'],
  [11, 'Na', 'Sodium', 22.990, 'alkali'],
  [12, 'Mg', 'Magnesium', 24.305, 'alkaline-earth'],
  [13, 'Al', 'Aluminium', 26.982, 'post-transition'],
  [14, 'Si', 'Silicon', 28.085, 'metalloid'],
  [15, 'P', 'Phosphorus', 30.974, 'nonmetal'],
  [16, 'S', 'Sulfur', 32.06, 'nonmetal'],
  [17, 'Cl', 'Chlorine', 35.45, 'halogen'],
  [18, 'Ar', 'Argon', 39.95, 'noble'],
  [19, 'K', 'Potassium', 39.098, 'alkali'],
  [20, 'Ca', 'Calcium', 40.078, 'alkaline-earth'],
  [21, 'Sc', 'Scandium', 44.956, 'transition'],
  [22, 'Ti', 'Titanium', 47.867, 'transition'],
  [23, 'V', 'Vanadium', 50.942, 'transition'],
  [24, 'Cr', 'Chromium', 51.996, 'transition'],
  [25, 'Mn', 'Manganese', 54.938, 'transition'],
  [26, 'Fe', 'Iron', 55.845, 'transition'],
  [27, 'Co', 'Cobalt', 58.933, 'transition'],
  [28, 'Ni', 'Nickel', 58.693, 'transition'],
  [29, 'Cu', 'Copper', 63.546, 'transition'],
  [30, 'Zn', 'Zinc', 65.38, 'transition'],
  [31, 'Ga', 'Gallium', 69.723, 'post-transition'],
  [32, 'Ge', 'Germanium', 72.630, 'metalloid'],
  [33, 'As', 'Arsenic', 74.922, 'metalloid'],
  [34, 'Se', 'Selenium', 78.971, 'nonmetal'],
  [35, 'Br', 'Bromine', 79.904, 'halogen'],
  [36, 'Kr', 'Krypton', 83.798, 'noble'],
  [37, 'Rb', 'Rubidium', 85.468, 'alkali'],
  [38, 'Sr', 'Strontium', 87.62, 'alkaline-earth'],
  [39, 'Y', 'Yttrium', 88.906, 'transition'],
  [40, 'Zr', 'Zirconium', 91.224, 'transition'],
  [41, 'Nb', 'Niobium', 92.906, 'transition'],
  [42, 'Mo', 'Molybdenum', 95.95, 'transition'],
  [43, 'Tc', 'Technetium', 97, 'transition', true],
  [44, 'Ru', 'Ruthenium', 101.07, 'transition'],
  [45, 'Rh', 'Rhodium', 102.91, 'transition'],
  [46, 'Pd', 'Palladium', 106.42, 'transition'],
  [47, 'Ag', 'Silver', 107.87, 'transition'],
  [48, 'Cd', 'Cadmium', 112.41, 'transition'],
  [49, 'In', 'Indium', 114.82, 'post-transition'],
  [50, 'Sn', 'Tin', 118.71, 'post-transition'],
  [51, 'Sb', 'Antimony', 121.76, 'metalloid'],
  [52, 'Te', 'Tellurium', 127.60, 'metalloid'],
  [53, 'I', 'Iodine', 126.90, 'halogen'],
  [54, 'Xe', 'Xenon', 131.29, 'noble'],
  [55, 'Cs', 'Caesium', 132.91, 'alkali'],
  [56, 'Ba', 'Barium', 137.33, 'alkaline-earth'],
  [57, 'La', 'Lanthanum', 138.91, 'lanthanide'],
  [58, 'Ce', 'Cerium', 140.12, 'lanthanide'],
  [59, 'Pr', 'Praseodymium', 140.91, 'lanthanide'],
  [60, 'Nd', 'Neodymium', 144.24, 'lanthanide'],
  [61, 'Pm', 'Promethium', 145, 'lanthanide', true],
  [62, 'Sm', 'Samarium', 150.36, 'lanthanide'],
  [63, 'Eu', 'Europium', 151.96, 'lanthanide'],
  [64, 'Gd', 'Gadolinium', 157.25, 'lanthanide'],
  [65, 'Tb', 'Terbium', 158.93, 'lanthanide'],
  [66, 'Dy', 'Dysprosium', 162.50, 'lanthanide'],
  [67, 'Ho', 'Holmium', 164.93, 'lanthanide'],
  [68, 'Er', 'Erbium', 167.26, 'lanthanide'],
  [69, 'Tm', 'Thulium', 168.93, 'lanthanide'],
  [70, 'Yb', 'Ytterbium', 173.05, 'lanthanide'],
  [71, 'Lu', 'Lutetium', 174.97, 'lanthanide'],
  [72, 'Hf', 'Hafnium', 178.49, 'transition'],
  [73, 'Ta', 'Tantalum', 180.95, 'transition'],
  [74, 'W', 'Tungsten', 183.84, 'transition'],
  [75, 'Re', 'Rhenium', 186.21, 'transition'],
  [76, 'Os', 'Osmium', 190.23, 'transition'],
  [77, 'Ir', 'Iridium', 192.22, 'transition'],
  [78, 'Pt', 'Platinum', 195.08, 'transition'],
  [79, 'Au', 'Gold', 196.97, 'transition'],
  [80, 'Hg', 'Mercury', 200.59, 'transition'],
  [81, 'Tl', 'Thallium', 204.38, 'post-transition'],
  [82, 'Pb', 'Lead', 207.2, 'post-transition'],
  [83, 'Bi', 'Bismuth', 208.98, 'post-transition'],
  [84, 'Po', 'Polonium', 209, 'post-transition', true],
  [85, 'At', 'Astatine', 210, 'halogen', true],
  [86, 'Rn', 'Radon', 222, 'noble', true],
  [87, 'Fr', 'Francium', 223, 'alkali', true],
  [88, 'Ra', 'Radium', 226, 'alkaline-earth', true],
  [89, 'Ac', 'Actinium', 227, 'actinide', true],
  [90, 'Th', 'Thorium', 232.04, 'actinide', true],
  [91, 'Pa', 'Protactinium', 231.04, 'actinide', true],
  [92, 'U', 'Uranium', 238.03, 'actinide', true],
  [93, 'Np', 'Neptunium', 237, 'actinide', true],
  [94, 'Pu', 'Plutonium', 244, 'actinide', true],
  [95, 'Am', 'Americium', 243, 'actinide', true],
  [96, 'Cm', 'Curium', 247, 'actinide', true],
  [97, 'Bk', 'Berkelium', 247, 'actinide', true],
  [98, 'Cf', 'Californium', 251, 'actinide', true],
  [99, 'Es', 'Einsteinium', 252, 'actinide', true],
  [100, 'Fm', 'Fermium', 257, 'actinide', true],
  [101, 'Md', 'Mendelevium', 258, 'actinide', true],
  [102, 'No', 'Nobelium', 259, 'actinide', true],
  [103, 'Lr', 'Lawrencium', 266, 'actinide', true],
  [104, 'Rf', 'Rutherfordium', 267, 'transition', true],
  [105, 'Db', 'Dubnium', 268, 'transition', true],
  [106, 'Sg', 'Seaborgium', 269, 'transition', true],
  [107, 'Bh', 'Bohrium', 270, 'transition', true],
  [108, 'Hs', 'Hassium', 269, 'transition', true],
  [109, 'Mt', 'Meitnerium', 278, 'transition', true],
  [110, 'Ds', 'Darmstadtium', 281, 'transition', true],
  [111, 'Rg', 'Roentgenium', 282, 'transition', true],
  [112, 'Cn', 'Copernicium', 285, 'transition', true],
  [113, 'Nh', 'Nihonium', 286, 'post-transition', true],
  [114, 'Fl', 'Flerovium', 289, 'post-transition', true],
  [115, 'Mc', 'Moscovium', 290, 'post-transition', true],
  [116, 'Lv', 'Livermorium', 293, 'post-transition', true],
  [117, 'Ts', 'Tennessine', 294, 'halogen', true],
  [118, 'Og', 'Oganesson', 294, 'noble', true],
];

export const ELEMENTS = Object.freeze(
  Object.fromEntries(
    RAW.map(([z, symbol, name, mass, category, radioactive]) => [
      symbol,
      Object.freeze({ z, symbol, name, mass, category, radioactive: !!radioactive }),
    ]),
  ),
);

export const ATOMIC_MASS_SOURCE =
  'IUPAC CIAAW abridged standard atomic weights (2021); mass number of the most stable isotope for radioactive elements.';

const METAL_CATS = new Set(['alkali', 'alkaline-earth', 'transition', 'post-transition', 'lanthanide', 'actinide']);

export function isElement(sym) {
  return Object.prototype.hasOwnProperty.call(ELEMENTS, sym);
}
export function isMetal(sym) {
  return isElement(sym) && METAL_CATS.has(ELEMENTS[sym].category);
}
export function isNonmetal(sym) {
  return isElement(sym) && !isMetal(sym) && ELEMENTS[sym].category !== 'metalloid';
}

/** Elements that exist as diatomic molecules in their standard state. */
export const DIATOMIC = new Set(['H', 'N', 'O', 'F', 'Cl', 'Br', 'I']);
