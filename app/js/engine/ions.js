// Ion data: common charges, polyatomic ions, activity series and solubility rules.
// Sources: standard general-chemistry reference tables (e.g. OpenStax Chemistry 2e,
// tables of common polyatomic ions, the activity series and solubility guidelines
// for ionic compounds in water at 25 °C).
import { ChemError } from './errors.js';
import { parseFormula } from './formula.js';
import { isElement, isMetal } from './elements.js';

export const POLYATOMIC = [
  // formula as written in compounds, charge, name
  { f: 'NH4', q: 1, name: 'ammonium' },
  { f: 'H3O', q: 1, name: 'hydronium' },
  { f: 'OH', q: -1, name: 'hydroxide' },
  { f: 'NO3', q: -1, name: 'nitrate' },
  { f: 'NO2', q: -1, name: 'nitrite' },
  { f: 'ClO4', q: -1, name: 'perchlorate' },
  { f: 'ClO3', q: -1, name: 'chlorate' },
  { f: 'ClO2', q: -1, name: 'chlorite' },
  { f: 'ClO', q: -1, name: 'hypochlorite' },
  { f: 'BrO3', q: -1, name: 'bromate' },
  { f: 'IO3', q: -1, name: 'iodate' },
  { f: 'MnO4', q: -1, name: 'permanganate' },
  { f: 'HCO3', q: -1, name: 'hydrogen carbonate (bicarbonate)' },
  { f: 'HSO4', q: -1, name: 'hydrogen sulfate' },
  { f: 'H2PO4', q: -1, name: 'dihydrogen phosphate' },
  { f: 'CN', q: -1, name: 'cyanide' },
  { f: 'SCN', q: -1, name: 'thiocyanate' },
  { f: 'C2H3O2', q: -1, name: 'acetate' },
  { f: 'CH3COO', q: -1, name: 'acetate' },
  { f: 'CO3', q: -2, name: 'carbonate' },
  { f: 'SO4', q: -2, name: 'sulfate' },
  { f: 'SO3', q: -2, name: 'sulfite' },
  { f: 'HPO4', q: -2, name: 'hydrogen phosphate' },
  { f: 'CrO4', q: -2, name: 'chromate' },
  { f: 'Cr2O7', q: -2, name: 'dichromate' },
  { f: 'C2O4', q: -2, name: 'oxalate' },
  { f: 'O2', q: -2, name: 'peroxide', onlyWith: ['H', 'Na', 'K', 'Li', 'Ba'] },
  { f: 'S2O3', q: -2, name: 'thiosulfate' },
  { f: 'PO4', q: -3, name: 'phosphate' },
  { f: 'PO3', q: -3, name: 'phosphite' },
];

export const MONATOMIC_ANIONS = {
  F: { q: -1, name: 'fluoride' }, Cl: { q: -1, name: 'chloride' }, Br: { q: -1, name: 'bromide' }, I: { q: -1, name: 'iodide' },
  O: { q: -2, name: 'oxide' }, S: { q: -2, name: 'sulfide' }, Se: { q: -2, name: 'selenide' },
  N: { q: -3, name: 'nitride' }, P: { q: -3, name: 'phosphide' }, H: { q: -1, name: 'hydride' },
};

// Common cation charges. Metals with more than one common charge list them all;
// predictions involving these need the user to choose the charge.
export const CATION_CHARGES = {
  H: [1], Li: [1], Na: [1], K: [1], Rb: [1], Cs: [1], Ag: [1], NH4: [1],
  Be: [2], Mg: [2], Ca: [2], Sr: [2], Ba: [2], Zn: [2], Cd: [2], Ni: [2],
  Al: [3], Ga: [3], Sc: [3],
  Fe: [2, 3], Cu: [1, 2], Co: [2, 3], Cr: [2, 3], Mn: [2, 4, 7], Pb: [2, 4], Sn: [2, 4], Hg: [1, 2], Au: [1, 3], Ti: [2, 3, 4], V: [2, 3, 4, 5], Pt: [2, 4],
};

// Activity series of metals (most reactive first), with hydrogen for reference.
export const ACTIVITY_SERIES = ['Li', 'K', 'Ba', 'Sr', 'Ca', 'Na', 'Mg', 'Al', 'Mn', 'Zn', 'Cr', 'Fe', 'Cd', 'Co', 'Ni', 'Sn', 'Pb', 'H', 'Cu', 'Ag', 'Hg', 'Pt', 'Au'];
// metals that react with cold water to give hydroxide + H2
export const COLD_WATER_METALS = ['Li', 'K', 'Ba', 'Sr', 'Ca', 'Na'];
export const HALOGEN_SERIES = ['F', 'Cl', 'Br', 'I'];

function sameCounts(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

const POLY_PARSED = POLYATOMIC.map((p) => ({ ...p, counts: parseFormula(p.f).counts }));

export function findPolyatomic(fragment) {
  try {
    const c = typeof fragment === 'string' ? parseFormula(fragment).counts : fragment;
    return POLY_PARSED.find((p) => sameCounts(p.counts, c)) || null;
  } catch {
    return null;
  }
}

/**
 * Split an ionic compound (or acid / water) into cation and anion.
 * Returns null if the formula does not look like a simple ionic compound.
 * Result: { cation: {f, q, count}, anion: {f, q, count, poly} }
 */
export function splitIonic(formula) {
  const s = String(formula).replace(/\((s|l|g|aq)\)$/i, '').trim();
  if (s === 'H2O') return { cation: { f: 'H', q: 1, count: 1 }, anion: { f: 'OH', q: -1, count: 1, poly: true }, water: true };
  // cation: NH4 (possibly in brackets) or a metal symbol or H
  let m = s.match(/^(\(NH4\)(\d+)|NH4|H3O)/);
  let cat, rest, catCount = 1;
  if (m) {
    cat = 'NH4';
    if (m[2]) catCount = parseInt(m[2], 10);
    if (m[0] === 'H3O') cat = 'H3O';
    rest = s.slice(m[0].length);
  } else {
    m = s.match(/^([A-Z][a-z]?)(\d*)/);
    if (!m || !isElement(m[1])) return null;
    cat = m[1];
    if (!(isMetal(cat) || cat === 'H')) return null;
    catCount = m[2] ? parseInt(m[2], 10) : 1;
    rest = s.slice(m[0].length);
  }
  if (!rest) return null;
  // anion: (poly)n | poly | element n
  let an, anCount = 1, poly = false;
  const pm = rest.match(/^\(([^()]+)\)(\d+)$/);
  if (pm) {
    an = pm[1];
    anCount = parseInt(pm[2], 10);
    poly = true;
  } else if (findPolyatomic(rest) && !/^[A-Z][a-z]?\d*$/.test(rest)) {
    an = rest;
    poly = true;
  } else {
    const em = rest.match(/^([A-Z][a-z]?)(\d*)$/);
    if (em && MONATOMIC_ANIONS[em[1]]) {
      an = em[1];
      anCount = em[2] ? parseInt(em[2], 10) : 1;
    } else if (findPolyatomic(rest)) {
      an = rest;
      poly = true;
    } else return null;
  }
  let aq;
  if (poly) {
    const p = findPolyatomic(an);
    if (!p) return null;
    aq = p.q;
    an = p.f === 'CH3COO' ? 'C2H3O2' : p.f;
  } else {
    aq = MONATOMIC_ANIONS[an].q;
  }
  const totalNeg = -aq * anCount;
  if (totalNeg % catCount !== 0) return null;
  const cq = totalNeg / catCount;
  if (cq <= 0) return null;
  const catName = cat;
  const allowed = CATION_CHARGES[catName];
  return {
    cation: { f: catName, q: cq, count: catCount, poly: catName === 'NH4' || catName === 'H3O', unusualCharge: allowed ? !allowed.includes(cq) : false },
    anion: { f: an, q: aq, count: anCount, poly },
  };
}

function gcd(a, b) { return b ? gcd(b, a % b) : Math.abs(a); }

/** Build a neutral formula from a cation and an anion using the criss-cross rule. */
export function buildIonic(cation, cq, anion, aq) {
  if (cation === 'H' && anion === 'OH') return 'H2O';
  const a = Math.abs(aq), c = Math.abs(cq);
  const g = gcd(a, c);
  const nc = a / g, na = c / g;
  const catPoly = cation === 'NH4' || cation === 'H3O';
  const anPoly = !MONATOMIC_ANIONS[anion] || anion.length > 2;
  const part = (f, n, poly) => (n === 1 ? f : poly ? `(${f})${n}` : `${f}${n}`);
  return part(cation, nc, catPoly) + part(anion, na, anPoly && !MONATOMIC_ANIONS[anion]);
}

/**
 * Solubility in water of an ionic compound, following the standard solubility
 * guidelines. Returns { soluble: boolean|null, rule: string }.
 */
export function solubility(cation, anion) {
  const c = cation, a = anion;
  if (['Li', 'Na', 'K', 'Rb', 'Cs', 'NH4'].includes(c)) return { soluble: true, rule: 'Compounds of group 1 metal ions and ammonium are soluble.' };
  if (['NO3', 'C2H3O2', 'ClO4', 'ClO3'].includes(a)) return { soluble: true, rule: 'Nitrates, acetates, chlorates and perchlorates are soluble.' };
  if (['Cl', 'Br', 'I'].includes(a)) {
    if (['Ag', 'Pb', 'Hg'].includes(c)) return { soluble: false, rule: 'Chlorides, bromides and iodides are soluble, except those of Ag⁺, Pb²⁺ and Hg₂²⁺.' };
    return { soluble: true, rule: 'Chlorides, bromides and iodides are soluble (exceptions: Ag⁺, Pb²⁺, Hg₂²⁺).' };
  }
  if (a === 'F') {
    if (['Mg', 'Ca', 'Sr', 'Ba', 'Pb'].includes(c)) return { soluble: false, rule: 'Fluorides of Mg²⁺, Ca²⁺, Sr²⁺, Ba²⁺ and Pb²⁺ are insoluble.' };
    return { soluble: true, rule: 'Most fluorides are soluble.' };
  }
  if (a === 'SO4') {
    if (['Ba', 'Pb', 'Sr', 'Hg'].includes(c)) return { soluble: false, rule: 'Sulfates are soluble except those of Ba²⁺, Sr²⁺, Pb²⁺ and Hg₂²⁺.' };
    if (['Ca', 'Ag'].includes(c)) return { soluble: false, rule: 'CaSO₄ and Ag₂SO₄ are only slightly soluble (treated as precipitates).' };
    return { soluble: true, rule: 'Most sulfates are soluble.' };
  }
  if (a === 'OH') {
    if (['Ba', 'Sr'].includes(c)) return { soluble: true, rule: 'Hydroxides are insoluble except those of group 1, NH₄⁺, Ba²⁺ and Sr²⁺.' };
    if (c === 'Ca') return { soluble: false, rule: 'Ca(OH)₂ is only slightly soluble (treated as a precipitate).' };
    return { soluble: false, rule: 'Most hydroxides are insoluble (exceptions: group 1, NH₄⁺, Ba²⁺, Sr²⁺; Ca²⁺ slightly).' };
  }
  if (['CO3', 'PO4', 'S', 'SO3', 'CrO4', 'C2O4', 'O'].includes(a)) {
    return { soluble: false, rule: 'Carbonates, phosphates, sulfides, sulfites, chromates, oxalates and oxides are insoluble except with group 1 ions and NH₄⁺.' };
  }
  return { soluble: null, rule: 'No general solubility rule covers this combination.' };
}

export function chargeLabel(q) {
  const m = Math.abs(q);
  return `${m === 1 ? '' : m}${q > 0 ? '+' : '−'}`;
}

export function assertIonic(formula) {
  const r = splitIonic(formula);
  if (!r) throw new ChemError(`${formula} is not recognised as a simple ionic compound or acid.`);
  return r;
}
