// Gas law solvers. Every temperature is converted to kelvin before use and every
// pressure/volume is converted into one consistent unit before substitution.
import { ChemError, v, esc } from './errors.js';
import { parseMeasured, fmtWork, sfFromDecimals } from './numbers.js';
import { convert, toKelvin, fromKelvin, unitLabel, gasConstantFor, rLabel } from './units.js';
import { molarMass } from './formula.js';
import { Solution, minSf, AMBIGUOUS_NOTE } from './solution.js';

const QTY = { P: 'pressure', V: 'volume', T: 'temperature', n: 'amount' };
const NAMES = { P: 'pressure', V: 'volume', T: 'absolute temperature', n: 'amount of gas' };
const UNIT_OF = { P: 'atm', V: 'L', T: 'K', n: 'mol' };

export const TWO_STATE_LAWS = {
  boyle: {
    title: "Boyle's law", exps: { P: 1, V: 1 }, constant: ['T', 'n'],
    formula: `${v('P', '1')}${v('V', '1')} = ${v('P', '2')}${v('V', '2')}`,
    meaning: 'At constant temperature and amount, pressure and volume are inversely proportional.',
  },
  charles: {
    title: "Charles's law", exps: { V: 1, T: -1 }, constant: ['P', 'n'],
    formula: `${v('V', '1')} / ${v('T', '1')} = ${v('V', '2')} / ${v('T', '2')}`,
    meaning: 'At constant pressure and amount, volume is directly proportional to absolute temperature.',
  },
  gayLussac: {
    title: "Gay-Lussac's law", exps: { P: 1, T: -1 }, constant: ['V', 'n'],
    formula: `${v('P', '1')} / ${v('T', '1')} = ${v('P', '2')} / ${v('T', '2')}`,
    meaning: 'At constant volume and amount, pressure is directly proportional to absolute temperature.',
  },
  combined: {
    title: 'Combined gas law', exps: { P: 1, V: 1, T: -1 }, constant: ['n'],
    formula: `${v('P', '1')}${v('V', '1')} / ${v('T', '1')} = ${v('P', '2')}${v('V', '2')} / ${v('T', '2')}`,
    meaning: 'For a fixed amount of gas, PV/T stays constant.',
  },
  avogadro: {
    title: "Avogadro's law", exps: { V: 1, n: -1 }, constant: ['P', 'T'],
    formula: `${v('V', '1')} / ${v('n', '1')} = ${v('V', '2')} / ${v('n', '2')}`,
    meaning: 'At constant temperature and pressure, volume is directly proportional to the amount of gas.',
  },
};

function measured(input, label, key) {
  if (!input || input.value === '' || input.value == null) throw new ChemError(`Enter a value for ${label}.`, key);
  const m = parseMeasured(input.value, label);
  return m;
}

/** Convert a measured value of quantity q into target unit; returns { value, sf, ambiguous, note } */
function normalise(q, m, fromUnit, toUnit, label) {
  if (q === 'T') {
    const k = toKelvin(m.value, fromUnit);
    if (k <= 0) throw new ChemError(`${label} is ${fmtWork(m.value)} ${unitLabel('temperature', fromUnit)}, which is at or below absolute zero (0 K). Gas laws need a temperature above 0 K.`);
    let sf = m.sf;
    if (fromUnit === 'C') sf = sfFromDecimals(k, Math.min(m.decimals, 2));
    const note = fromUnit === 'K' ? null : fromUnit === 'C'
      ? `${label}: ${fmtWork(m.value)} °C + 273.15 = ${fmtWork(k)} K`
      : `${label}: (${fmtWork(m.value)} °F − 32) × 5/9 + 273.15 = ${fmtWork(k)} K`;
    return { value: k, sf, ambiguous: m.ambiguous, note };
  }
  if (!(m.value > 0)) throw new ChemError(`${label} must be greater than zero.`);
  if (fromUnit === toUnit) return { value: m.value, sf: m.sf, ambiguous: m.ambiguous, note: null };
  const val = convert(m.value, QTY[q], fromUnit, toUnit);
  return { value: val, sf: m.sf, ambiguous: m.ambiguous, note: `${label}: ${fmtWork(m.value)} ${unitLabel(QTY[q], fromUnit)} = ${fmtWork(val)} ${unitLabel(QTY[q], toUnit)}` };
}

/**
 * Solve a two-state gas law.
 * @param {{ law: string, unknown: string, values: Record<string,{value:string, unit:string}>, outUnit?: string }} p
 */
export function solveTwoState({ law, unknown, values, outUnit }) {
  const L = TWO_STATE_LAWS[law];
  if (!L) throw new ChemError('Unknown gas law.');
  const vars = Object.keys(L.exps);
  const all = vars.flatMap((q) => [q + '1', q + '2']);
  if (!all.includes(unknown)) throw new ChemError('Choose which variable to solve for.');
  const uq = unknown[0];
  const sol = new Solution('gas-' + law, L.title);
  // a working unit per quantity: the unit chosen for the answer if same quantity, else first given unit
  const work = {};
  for (const q of vars) {
    if (q === 'T') { work[q] = 'K'; continue; }
    if (q === uq && outUnit) { work[q] = outUnit; continue; }
    const g = all.find((k) => k[0] === q && k !== unknown && values[k]);
    work[q] = g ? values[g].unit : UNIT_OF[q];
  }
  const known = {};
  const ms = [];
  for (const k of all) {
    if (k === unknown) continue;
    const label = `${NAMES[k[0]].replace('absolute ', '')} ${k[1]} (${k[0]}${k[1] === '1' ? '₁' : '₂'})`;
    const inp = values[k];
    const m = measured(inp, label, k);
    sol.give(v(k[0], k[1]), label[0].toUpperCase() + label.slice(1), m.value, unitLabel(QTY[k[0]], inp.unit));
    const nrm = normalise(k[0], m, inp.unit, work[k[0]], `${k[0]}${k[1] === '1' ? '₁' : '₂'}`);
    if (nrm.note) sol.convert(nrm.note);
    if (m.ambiguous && k[0] !== 'T') sol.warn(AMBIGUOUS_NOTE);
    known[k] = nrm.value;
    ms.push(nrm);
  }
  sol.find(v(uq, unknown[1]), `${NAMES[uq][0].toUpperCase() + NAMES[uq].slice(1)} in state ${unknown[1]}`);
  sol.formula = L.formula;
  for (const q of vars) sol.define(`${v(q, '1')}, ${v(q, '2')}`, `${NAMES[q]} in the initial (1) and final (2) state`, q === 'T' ? 'K' : unitLabel(QTY[q], work[q]));
  L.constant.forEach((c) => sol.assume(`${NAMES[c][0].toUpperCase() + NAMES[c].slice(1)} (${c}) is held constant.`));
  sol.assume('The gas behaves ideally (reasonable at moderate pressure and temperature).');

  // rearrange: unknown side s, exponent e. Product_{side1} q^e = Product_{side2} q^e
  const side = unknown[1];
  const other = side === '1' ? '2' : '1';
  const e = L.exps[uq];
  // X^e = [prod other-side terms] / [prod same-side terms except X]
  const num = [], den = [];
  for (const q of vars) {
    const eq = L.exps[q];
    (eq > 0 ? num : den).push(q + other);
    if (q !== uq) (eq > 0 ? den : num).push(q + side);
  }
  // if e = -1, invert
  const N = e > 0 ? num : den, D = e > 0 ? den : num;
  const sym = (k) => v(k[0], k[1]);
  sol.rearranged = `${sym(unknown)} = ${N.map(sym).join('')}${D.length ? ' / ' + (D.length > 1 ? '(' + D.map(sym).join('') + ')' : sym(D[0])) : ''}`;
  const val = (k) => known[k];
  const unitOf = (k) => (k[0] === 'T' ? 'K' : unitLabel(QTY[k[0]], work[k[0]]));
  sol.substitution = `${sym(unknown)} = ${N.map((k) => `(${fmtWork(val(k))} ${unitOf(k)})`).join(' × ')}${D.length ? ' / ' + D.map((k) => `(${fmtWork(val(k))} ${unitOf(k)})`).join(' × ') : ''}`;
  const result = N.reduce((a, k) => a * val(k), 1) / D.reduce((a, k) => a * val(k), 1);
  if (!(result > 0) || !Number.isFinite(result)) throw new ChemError('The inputs do not give a physically meaningful result. Check the values and units.');
  const ruleSf = minSf(...ms);
  sol.step('Calculate', `${sym(unknown)} = ${fmtWork(result)} ${uq === 'T' ? 'K' : unitLabel(QTY[uq], work[uq])}`);
  if (uq === 'T') {
    const tu = outUnit || 'K';
    sol.answer(`Temperature ${unknown[1] === '1' ? '1' : '2'}`, sym(unknown), result, 'K', ruleSf);
    if (tu !== 'K') {
      const c = fromKelvin(result, tu);
      sol.step('Convert back', `${fmtWork(result)} K ${tu === 'C' ? '− 273.15' : '→ °F'} = ${fmtWork(c)} ${unitLabel('temperature', tu)}`);
      sol.answer(`Temperature in ${unitLabel('temperature', tu)}`, sym(unknown), c, unitLabel('temperature', tu), sfFromDecimals(c, Math.max(0, ruleSf - 1 - Math.floor(Math.log10(result)))));
    }
  } else {
    sol.answer(`${NAMES[uq][0].toUpperCase() + NAMES[uq].slice(1)} ${unknown[1]}`, sym(unknown), result, unitLabel(QTY[uq], work[uq]), ruleSf);
  }
  // interpretation
  const before = known[uq + other];
  const change = result > before ? 'increases' : result < before ? 'decreases' : 'stays the same';
  sol.interpretation = `${L.meaning} Here the ${NAMES[uq]} ${change} from ${fmtWork(before)} to ${fmtWork(result)} ${uq === 'T' ? 'K' : unitLabel(QTY[uq], work[uq])}.`;
  // chart spec: the curve through both states
  const xs = { boyle: ['V', 'P'], charles: ['T', 'V'], gayLussac: ['T', 'P'], avogadro: ['n', 'V'] }[law];
  if (xs) {
    const pt = (s) => ({ x: s === side ? (xs[0] === uq ? result : known[xs[0] + s]) : known[xs[0] + s], y: s === side ? (xs[1] === uq ? result : known[xs[1] + s]) : known[xs[1] + s] });
    const p1 = pt('1'), p2 = pt('2');
    sol.chart = { law, x: xs[0], y: xs[1], xUnit: xs[0] === 'T' ? 'K' : unitLabel(QTY[xs[0]], work[xs[0]]), yUnit: unitLabel(QTY[xs[1]], work[xs[1]]), points: [p1, p2], k: law === 'boyle' ? p1.x * p1.y : p1.y / p1.x };
  }
  return sol;
}

/**
 * Ideal gas law PV = nRT. values: { P, V, n, T } each { value, unit } except the unknown.
 */
export function solveIdeal({ unknown, values, outUnit }) {
  const sol = new Solution('gas-ideal', 'Ideal gas law');
  const keys = ['P', 'V', 'n', 'T'];
  if (!keys.includes(unknown)) throw new ChemError('Choose which variable to solve for.');
  const pUnit = unknown === 'P' ? outUnit || 'atm' : values.P.unit;
  const vUnit = unknown === 'V' ? outUnit || 'L' : values.V.unit;
  const R = gasConstantFor(pUnit, vUnit);
  const k = {};
  const ms = [];
  for (const q of keys) {
    if (q === unknown) continue;
    const inp = values[q];
    const m = measured(inp, NAMES[q], q);
    sol.give(q, (q === 'T' ? 'Temperature' : NAMES[q][0].toUpperCase() + NAMES[q].slice(1)), m.value, unitLabel(QTY[q], inp.unit));
    if (m.ambiguous && q !== 'T') sol.warn(AMBIGUOUS_NOTE);
    let nrm;
    if (q === 'n') {
      if (!(m.value > 0)) throw new ChemError('Amount of gas must be greater than zero.');
      const val = convert(m.value, 'amount', inp.unit, 'mol');
      nrm = { value: val, sf: m.sf, note: inp.unit !== 'mol' ? `n = ${fmtWork(val)} mol` : null };
    } else {
      nrm = normalise(q, m, inp.unit, q === 'P' ? pUnit : q === 'V' ? vUnit : 'K', q);
    }
    if (nrm.note) sol.convert(nrm.note);
    k[q] = nrm.value;
    ms.push(nrm);
  }
  sol.find(unknown, NAMES[unknown]);
  sol.formula = 'PV = nRT';
  sol.define('P', 'pressure', unitLabel('pressure', pUnit));
  sol.define('V', 'volume', unitLabel('volume', vUnit));
  sol.define('n', 'amount of gas', 'mol');
  sol.define('R', 'ideal gas constant', rLabel(pUnit, vUnit));
  sol.define('T', 'absolute temperature', 'K');
  sol.give('R', 'Gas constant (matched to your units)', fmtWork(R), esc(rLabel(pUnit, vUnit)));
  const rs = `${fmtWork(R)} ${rLabel(pUnit, vUnit)}`;
  let res, unitStr;
  switch (unknown) {
    case 'P':
      sol.rearranged = 'P = nRT / V';
      sol.substitution = `P = (${fmtWork(k.n)} mol)(${rs})(${fmtWork(k.T)} K) / (${fmtWork(k.V)} ${unitLabel('volume', vUnit)})`;
      res = (k.n * R * k.T) / k.V; unitStr = unitLabel('pressure', pUnit); break;
    case 'V':
      sol.rearranged = 'V = nRT / P';
      sol.substitution = `V = (${fmtWork(k.n)} mol)(${rs})(${fmtWork(k.T)} K) / (${fmtWork(k.P)} ${unitLabel('pressure', pUnit)})`;
      res = (k.n * R * k.T) / k.P; unitStr = unitLabel('volume', vUnit); break;
    case 'n':
      sol.rearranged = 'n = PV / (RT)';
      sol.substitution = `n = (${fmtWork(k.P)} ${unitLabel('pressure', pUnit)})(${fmtWork(k.V)} ${unitLabel('volume', vUnit)}) / ((${rs})(${fmtWork(k.T)} K))`;
      res = (k.P * k.V) / (R * k.T); unitStr = 'mol'; break;
    case 'T':
      sol.rearranged = 'T = PV / (nR)';
      sol.substitution = `T = (${fmtWork(k.P)} ${unitLabel('pressure', pUnit)})(${fmtWork(k.V)} ${unitLabel('volume', vUnit)}) / ((${fmtWork(k.n)} mol)(${rs}))`;
      res = (k.P * k.V) / (k.n * R); unitStr = 'K'; break;
  }
  const ruleSf = minSf(...ms);
  sol.step('Calculate', `${unknown} = ${fmtWork(res)} ${unitStr}`);
  sol.answer(NAMES[unknown][0].toUpperCase() + NAMES[unknown].slice(1), unknown, res, unitStr, ruleSf);
  if (unknown === 'T' && outUnit === 'C') {
    sol.answer('Temperature in °C', 'T', res - 273.15, '°C', ruleSf);
    sol.step('Convert to °C', `${fmtWork(res)} K − 273.15 = ${fmtWork(res - 273.15)} °C`);
  }
  sol.interpretation = {
    P: `${fmtWork(k.n)} mol of gas in ${fmtWork(k.V)} ${unitLabel('volume', vUnit)} at ${fmtWork(k.T)} K exerts a pressure of ${fmtWork(res)} ${unitStr}.`,
    V: `${fmtWork(k.n)} mol of gas at ${fmtWork(k.T)} K and ${fmtWork(k.P)} ${unitLabel('pressure', pUnit)} occupies ${fmtWork(res)} ${unitStr}.`,
    n: `The sample contains ${fmtWork(res)} mol of gas (${fmtWork(res * 6.02214076e23)} molecules).`,
    T: `The gas is at ${fmtWork(res)} K (${fmtWork(res - 273.15)} °C).`,
  }[unknown];
  sol.assume('Ideal gas: molecules have negligible volume and no attractive forces. Real gases deviate at high pressure and low temperature.');
  sol.assume(`R = 8.314462618 J/(mol·K), expressed as ${fmtWork(R)} ${rLabel(pUnit, vUnit)} to match the pressure and volume units.`);
  return sol;
}

/** Gas density d = PM/(RT), or molar mass from density. */
export function gasDensity({ solveFor = 'd', P, T, M, formula, d }) {
  const sol = new Solution('gas-density', solveFor === 'd' ? 'Gas density' : 'Molar mass from gas density');
  const mp = measured(P, 'pressure', 'P');
  const pAtm = normalise('P', mp, P.unit, 'atm', 'P');
  const mt = measured(T, 'temperature', 'T');
  const tK = normalise('T', mt, T.unit, 'K', 'T');
  const R = 0.082057366;
  sol.give('P', 'Pressure', mp.value, unitLabel('pressure', P.unit));
  sol.give('T', 'Temperature', mt.value, unitLabel('temperature', T.unit));
  [pAtm, tK].forEach((x) => x.note && sol.convert(x.note));
  sol.define('d', 'density of the gas', 'g/L');
  sol.define('M', 'molar mass', 'g/mol');
  sol.define('P', 'pressure', 'atm');
  sol.define('R', 'gas constant', 'L·atm/(mol·K)');
  sol.define('T', 'absolute temperature', 'K');
  sol.formula = 'd = PM / (RT)  (from PV = nRT with n = m/M and d = m/V)';
  if (solveFor === 'd') {
    let mVal, mSf = 99;
    if (formula && String(formula).trim()) {
      const mm = molarMass(formula);
      mVal = mm.total;
      sol.give('M', `Molar mass of ${mm.formula}`, `${fmtWork(mVal)} g/mol (${mm.html})`);
    } else {
      const mm = measured(M, 'molar mass', 'M');
      if (!(mm.value > 0)) throw new ChemError('Molar mass must be greater than zero.');
      mVal = mm.value; mSf = mm.sf;
      sol.give('M', 'Molar mass', mm.value, 'g/mol');
    }
    sol.find('d', 'Density');
    sol.substitution = `d = (${fmtWork(pAtm.value)} atm)(${fmtWork(mVal)} g/mol) / ((0.0820574 L·atm/(mol·K))(${fmtWork(tK.value)} K))`;
    const dens = (pAtm.value * mVal) / (R * tK.value);
    sol.step('Calculate', `d = ${fmtWork(dens)} g/L`);
    sol.answer('Density', 'd', dens, 'g/L', Math.min(minSf(pAtm, tK), mSf));
    sol.interpretation = `Each litre of this gas has a mass of ${fmtWork(dens)} g at the given conditions. ${dens > 1.2 ? 'It is denser than air (about 1.2 g/L at room conditions).' : 'It is less dense than air (about 1.2 g/L at room conditions).'}`;
  } else {
    const md = measured(d, 'density', 'd');
    if (!(md.value > 0)) throw new ChemError('Density must be greater than zero.');
    sol.give('d', 'Density', md.value, 'g/L');
    sol.find('M', 'Molar mass');
    sol.rearranged = 'M = dRT / P';
    sol.substitution = `M = (${fmtWork(md.value)} g/L)(0.0820574 L·atm/(mol·K))(${fmtWork(tK.value)} K) / (${fmtWork(pAtm.value)} atm)`;
    const mm = (md.value * R * tK.value) / pAtm.value;
    sol.step('Calculate', `M = ${fmtWork(mm)} g/mol`);
    sol.answer('Molar mass', 'M', mm, 'g/mol', minSf(md, pAtm, tK));
    sol.interpretation = `A gas with this density at these conditions has a molar mass of about ${fmtWork(mm)} g/mol.`;
  }
  sol.assume('The gas behaves ideally.');
  return sol;
}

/** Molar mass of a gas from mass, P, V and T: M = mRT / (PV). */
export function gasMolarMass({ m, P, V, T }) {
  const sol = new Solution('gas-molar-mass', 'Molar mass of a gas');
  const mm = measured(m, 'mass', 'm');
  if (!(mm.value > 0)) throw new ChemError('Mass must be greater than zero.');
  const mg = convert(mm.value, 'mass', m.unit, 'g');
  const mp = measured(P, 'pressure', 'P');
  const pAtm = normalise('P', mp, P.unit, 'atm', 'P');
  const mv = measured(V, 'volume', 'V');
  const vL = normalise('V', mv, V.unit, 'L', 'V');
  const mt = measured(T, 'temperature', 'T');
  const tK = normalise('T', mt, T.unit, 'K', 'T');
  sol.give('m', 'Mass of gas', mm.value, unitLabel('mass', m.unit));
  sol.give('P', 'Pressure', mp.value, unitLabel('pressure', P.unit));
  sol.give('V', 'Volume', mv.value, unitLabel('volume', V.unit));
  sol.give('T', 'Temperature', mt.value, unitLabel('temperature', T.unit));
  if (m.unit !== 'g') sol.convert(`m = ${fmtWork(mg)} g`);
  [pAtm, vL, tK].forEach((x) => x.note && sol.convert(x.note));
  sol.find('M', 'Molar mass');
  sol.formula = 'M = mRT / (PV)  (from PV = nRT with n = m/M)';
  sol.define('M', 'molar mass', 'g/mol');
  sol.define('m', 'mass of the gas sample', 'g');
  sol.define('R', 'gas constant', 'L·atm/(mol·K)');
  sol.define('T', 'absolute temperature', 'K');
  sol.define('P', 'pressure', 'atm');
  sol.define('V', 'volume', 'L');
  const R = 0.082057366;
  sol.substitution = `M = (${fmtWork(mg)} g)(0.0820574 L·atm/(mol·K))(${fmtWork(tK.value)} K) / ((${fmtWork(pAtm.value)} atm)(${fmtWork(vL.value)} L))`;
  const M = (mg * R * tK.value) / (pAtm.value * vL.value);
  sol.step('Calculate', `M = ${fmtWork(M)} g/mol`);
  sol.answer('Molar mass', 'M', M, 'g/mol', minSf(mm, pAtm, vL, tK));
  sol.interpretation = `The gas has a molar mass of about ${fmtWork(M)} g/mol. Compare it with candidate gases (for example O₂ 32.00, CO₂ 44.01, N₂ 28.01 g/mol) to identify it.`;
  sol.assume('The gas behaves ideally and the sample is a single pure gas.');
  return sol;
}
