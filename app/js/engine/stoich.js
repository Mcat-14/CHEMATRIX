// Stoichiometry solvers: molar mass, mole conversions, mole ratios,
// limiting reactant and percent yield.
import { ChemError, esc, v } from './errors.js';
import { molarMass, atomCount } from './formula.js';
import { balanceEquation } from './equation.js';
import { parseMeasured, fmtWork, requirePositive } from './numbers.js';
import { CONSTANTS, UNITS, unitLabel } from './units.js';
import { ATOMIC_MASS_SOURCE } from './elements.js';
import { Solution, minSf, anyAmbiguous, AMBIGUOUS_NOTE } from './solution.js';

const NA = CONSTANTS.NA.value;
const naHtml = '6.02214076 × 10<sup>23</sup>';

export function molarMassSolution(formula) {
  const mm = molarMass(formula);
  const sol = new Solution('molar-mass', 'Molar mass');
  sol.give('Formula', 'Chemical formula', mm.html);
  sol.find('M', 'Molar mass');
  sol.formula = `M = Σ (number of atoms × atomic mass)`;
  sol.define('M', 'molar mass of the compound', 'g/mol');
  sol.define('n<sub>i</sub>', 'number of atoms of element i in one formula unit');
  sol.define('A<sub>i</sub>', 'standard atomic mass of element i', 'g/mol');
  sol.substitution = 'M = ' + mm.rows.map((r) => `(${r.count} × ${r.atomicMass})`).join(' + ');
  sol.step('Add the contribution of each element', mm.rows.map((r) => `${fmtWork(r.subtotal)}`).join(' + ') + ` = ${fmtWork(mm.total)} g/mol`);
  sol.table('Contribution of each element', ['Element', 'Atoms', 'Atomic mass (g/mol)', 'Subtotal (g/mol)', 'Mass %'],
    mm.rows.map((r) => [`${esc(r.symbol)} <span class="muted">${esc(r.name)}</span>`, String(r.count), String(r.atomicMass), fmtWork(r.subtotal), r.percent.toFixed(2) + ' %']));
  // precision: limited by the least precise atomic mass (decimal places), report to 0.01 g/mol typically
  const minDec = Math.min(...mm.rows.map((r) => (String(r.atomicMass).split('.')[1] || '').length));
  const decimals = Math.min(Math.max(minDec, 0), 3);
  const ruleSf = Math.max(3, Math.floor(Math.log10(mm.total)) + 1 + decimals);
  sol.answer('Molar mass', 'M', mm.total, 'g/mol', ruleSf);
  sol.interpretation = `One mole of ${mm.html} has a mass of ${fmtWork(mm.total)} g. ${mm.rows.length > 1 ? `By mass it is ${mm.rows.map((r) => `${r.percent.toFixed(1)} % ${esc(r.symbol)}`).join(', ')}.` : ''}`;
  sol.assume(`Atomic masses: ${ATOMIC_MASS_SOURCE}`);
  if (mm.rows.some((r) => r.radioactive)) sol.warn('This formula contains a radioactive element; its mass is the mass number of its most stable isotope, not a standard atomic weight.');
  sol.molarMass = mm;
  return sol;
}

const PARTICLE_WORDS = { molecules: 'molecules', 'formula units': 'formula units', atoms: 'atoms' };

/**
 * Mole conversions.
 * mode: 'mass-mol' | 'mol-mass' | 'mol-particles' | 'particles-mol' | 'mass-particles' | 'particles-mass'
 */
export function moleConversion({ mode, formula, value, unit = 'g', particle = 'molecules' }) {
  const x = parseMeasured(value, 'the given quantity');
  requirePositive(x.value, 'The given quantity');
  const needsMass = mode.includes('mass');
  const mm = needsMass || particle === 'atoms' ? molarMass(formula) : null;
  const word = PARTICLE_WORDS[particle] || 'particles';
  const sol = new Solution('mole', 'Mole conversion');
  const sf = x.sf;
  if (x.ambiguous) sol.warn(AMBIGUOUS_NOTE);
  sol.define('n', 'amount of substance', 'mol');
  if (needsMass) {
    sol.define('m', 'mass', 'g');
    sol.define('M', `molar mass of ${mm.formula}`, 'g/mol');
    sol.give('M', 'Molar mass', `${fmtWork(mm.total)} g/mol (${mm.html})`);
  }
  if (mode.includes('particles')) {
    sol.define('N', `number of ${word}`);
    sol.define('N<sub>A</sub>', "Avogadro's constant", 'mol⁻¹');
  }
  const massG = (val) => val * UNITS.mass.units[unit].factor;
  const molFromUnit = (val) => val * (UNITS.amount.units[unit]?.factor ?? 1);
  let n, ans;
  switch (mode) {
    case 'mass-mol': {
      const m = massG(x.value);
      sol.give('m', 'Mass', x.value, unitLabel('mass', unit));
      if (unit !== 'g') sol.convert(`m = ${fmtWork(x.value)} ${unitLabel('mass', unit)} = ${fmtWork(m)} g`);
      sol.find('n', 'Amount in moles');
      sol.formula = 'n = m / M';
      sol.substitution = `n = ${fmtWork(m)} g ÷ ${fmtWork(mm.total)} g/mol`;
      n = m / mm.total;
      sol.step('Divide mass by molar mass', `n = ${fmtWork(n)} mol`);
      sol.answer('Amount', 'n', n, 'mol', sf);
      sol.interpretation = `${fmtWork(m)} g of ${mm.html} contains ${fmtWork(n)} mol of ${mm.html}.`;
      break;
    }
    case 'mol-mass': {
      n = molFromUnit(x.value);
      sol.give('n', 'Amount', x.value, unitLabel('amount', unit));
      if (unit !== 'mol') sol.convert(`n = ${fmtWork(x.value)} ${unitLabel('amount', unit)} = ${fmtWork(n)} mol`);
      sol.find('m', 'Mass');
      sol.formula = 'm = n × M';
      sol.substitution = `m = ${fmtWork(n)} mol × ${fmtWork(mm.total)} g/mol`;
      ans = n * mm.total;
      sol.step('Multiply moles by molar mass', `m = ${fmtWork(ans)} g`);
      sol.answer('Mass', 'm', ans, 'g', sf);
      sol.interpretation = `${fmtWork(n)} mol of ${mm.html} has a mass of ${fmtWork(ans)} g.`;
      break;
    }
    case 'mol-particles': {
      n = molFromUnit(x.value);
      sol.give('n', 'Amount', x.value, unitLabel('amount', unit));
      if (unit !== 'mol') sol.convert(`n = ${fmtWork(n)} mol`);
      sol.find('N', `Number of ${word}`);
      sol.formula = 'N = n × N<sub>A</sub>';
      sol.substitution = `N = ${fmtWork(n)} mol × ${naHtml} mol⁻¹`;
      ans = n * NA;
      sol.step('Multiply by Avogadro\'s constant', `N = ${fmtWork(ans)} ${word}`);
      sol.answer(`Number of ${word}`, 'N', ans, word, sf);
      sol.interpretation = `${fmtWork(n)} mol contains ${fmtWork(ans)} ${word}.`;
      break;
    }
    case 'particles-mol': {
      sol.give('N', `Number of ${word}`, x.value);
      sol.find('n', 'Amount in moles');
      sol.formula = 'n = N / N<sub>A</sub>';
      sol.substitution = `n = ${fmtWork(x.value)} ÷ ${naHtml} mol⁻¹`;
      n = x.value / NA;
      sol.step('Divide by Avogadro\'s constant', `n = ${fmtWork(n)} mol`);
      sol.answer('Amount', 'n', n, 'mol', sf);
      sol.interpretation = `${fmtWork(x.value)} ${word} is ${fmtWork(n)} mol.`;
      break;
    }
    case 'mass-particles': {
      const m = massG(x.value);
      sol.give('m', 'Mass', x.value, unitLabel('mass', unit));
      if (unit !== 'g') sol.convert(`m = ${fmtWork(m)} g`);
      sol.find('N', `Number of ${word}`);
      sol.formula = 'N = (m / M) × N<sub>A</sub>';
      n = m / mm.total;
      ans = n * NA;
      sol.substitution = `N = (${fmtWork(m)} g ÷ ${fmtWork(mm.total)} g/mol) × ${naHtml} mol⁻¹`;
      sol.step('Step 1: mass to moles', `n = ${fmtWork(m)} ÷ ${fmtWork(mm.total)} = ${fmtWork(n)} mol`);
      sol.step('Step 2: moles to particles', `N = ${fmtWork(n)} × ${naHtml} = ${fmtWork(ans)}`);
      sol.answer(`Number of ${word}`, 'N', ans, word, sf);
      sol.interpretation = `${fmtWork(m)} g of ${mm.html} contains ${fmtWork(ans)} ${word}.`;
      break;
    }
    case 'particles-mass': {
      sol.give('N', `Number of ${word}`, x.value);
      sol.find('m', 'Mass');
      sol.formula = 'm = (N / N<sub>A</sub>) × M';
      n = x.value / NA;
      ans = n * mm.total;
      sol.substitution = `m = (${fmtWork(x.value)} ÷ ${naHtml} mol⁻¹) × ${fmtWork(mm.total)} g/mol`;
      sol.step('Step 1: particles to moles', `n = ${fmtWork(n)} mol`);
      sol.step('Step 2: moles to mass', `m = ${fmtWork(n)} × ${fmtWork(mm.total)} = ${fmtWork(ans)} g`);
      sol.answer('Mass', 'm', ans, 'g', sf);
      sol.interpretation = `${fmtWork(x.value)} ${word} of ${mm.html} has a mass of ${fmtWork(ans)} g.`;
      break;
    }
    default:
      throw new ChemError('Choose what to convert from and to.');
  }
  // total atoms as an extra result when the answer is a particle count
  if (mode.endsWith('particles') && formula) {
    try {
      const mmA = mm || molarMass(formula);
      const k = atomCount(mmA.counts);
      if (k > 1) {
        const N = sol.answers[0].value;
        sol.step(`Total atoms (${k} atoms in each ${mmA.formula})`, `${fmtWork(N)} × ${k} = ${fmtWork(N * k)} atoms`);
        sol.answer('Total number of atoms', 'N(atoms)', N * k, 'atoms', sf);
      }
    } catch { /* formula optional for pure mol<->particle conversions */ }
  }
  sol.assume("Avogadro's constant N_A = 6.02214076 × 10²³ mol⁻¹ (exact, SI 2019). Molar masses and N_A do not limit significant figures.");
  return sol;
}

function speciesIndex(list, formula) {
  const f = String(formula).replace(/\s+/g, '');
  const i = list.findIndex((s) => s.formula === f || s.formula.replace(/\^.*/, '') === f);
  if (i < 0) throw new ChemError(`${formula} is not in the balanced equation. Choose a substance from the equation.`);
  return i;
}

/** Use a balanced equation to convert an amount of one substance into another. */
export function moleRatio({ equation, known, amount, unit = 'mol', target, outUnit = 'mol' }) {
  const bal = balanceEquation(equation);
  const all = [...bal.reactants, ...bal.products];
  const ki = speciesIndex(all, known);
  const ti = speciesIndex(all, target);
  const x = parseMeasured(amount, `the amount of ${known}`);
  requirePositive(x.value, `The amount of ${known}`);
  const K = all[ki], T = all[ti];
  const ck = bal.coefficients[ki], ct = bal.coefficients[ti];
  const sol = new Solution('mole-ratio', 'Mole ratio');
  if (x.ambiguous) sol.warn(AMBIGUOUS_NOTE);
  sol.give('Equation', 'Balanced equation', bal.html);
  sol.give(`n(${K.formula})`, `Given amount of ${K.formula}`, x.value, unit === 'g' ? 'g' : 'mol');
  sol.find(`n(${T.formula})`, `Amount of ${T.formula}`);
  sol.formula = `n<sub>target</sub> = n<sub>known</sub> × (coefficient<sub>target</sub> / coefficient<sub>known</sub>)`;
  sol.define('n', 'amount of substance', 'mol');
  sol.define('coefficient', 'number in front of the substance in the balanced equation (exact)');
  let nk = x.value;
  if (unit === 'g') {
    const mmK = molarMass(K.formula.replace(/\^.*/, ''));
    nk = x.value / mmK.total;
    sol.convert(`n(${K.html}) = ${fmtWork(x.value)} g ÷ ${fmtWork(mmK.total)} g/mol = ${fmtWork(nk)} mol`);
  }
  sol.step('Mole ratio from the balanced equation', `${ct} mol ${T.html} : ${ck} mol ${K.html}`);
  const nt = nk * ct / ck;
  sol.substitution = `n(${T.html}) = ${fmtWork(nk)} mol × (${ct} / ${ck})`;
  sol.step('Multiply by the mole ratio', `n(${T.html}) = ${fmtWork(nt)} mol`);
  if (outUnit === 'g') {
    const mmT = molarMass(T.formula.replace(/\^.*/, ''));
    const mt = nt * mmT.total;
    sol.step('Convert to mass', `m(${T.html}) = ${fmtWork(nt)} mol × ${fmtWork(mmT.total)} g/mol = ${fmtWork(mt)} g`);
    sol.answer(`Mass of ${T.formula}`, `m(${T.html})`, mt, 'g', x.sf);
    sol.answer(`Amount of ${T.formula}`, `n(${T.html})`, nt, 'mol', x.sf);
  } else {
    sol.answer(`Amount of ${T.formula}`, `n(${T.html})`, nt, 'mol', x.sf);
  }
  sol.interpretation = `Every ${ck} mol of ${K.html} ${K.role === T.role ? 'goes with' : K.role === 'reactant' ? 'produces' : 'requires'} ${ct} mol of ${T.html}, so ${fmtWork(nk)} mol of ${K.html} corresponds to ${fmtWork(nt)} mol of ${T.html}.`;
  sol.assume('The reaction goes to completion exactly as written by the balanced equation.');
  sol.balanced = bal;
  return sol;
}

/**
 * Limiting reactant, excess remaining and theoretical yield.
 * amounts: [{ formula, value, unit: 'g'|'mol' }] for two or more reactants.
 */
export function limitingReactant({ equation, amounts, product = null }) {
  const bal = balanceEquation(equation);
  if (bal.reactants.length < 2) throw new ChemError('A limiting reactant problem needs at least two reactants in the equation.');
  if (!amounts || amounts.length < 2) throw new ChemError('Enter the amount of at least two reactants.');
  const sol = new Solution('limiting', 'Limiting reactant');
  sol.give('Equation', 'Balanced equation', bal.html);
  sol.find('Limiting reactant', 'Which reactant runs out first, excess left over, theoretical yield');
  sol.formula = 'reaction extent = n<sub>reactant</sub> / coefficient (the smallest value identifies the limiting reactant)';
  sol.define('n', 'amount of reactant available', 'mol');
  sol.define('coefficient', 'coefficient of the reactant in the balanced equation');
  const rows = [];
  let sfAll = [];
  for (const a of amounts) {
    const i = speciesIndex(bal.reactants, a.formula);
    const sp = bal.reactants[i];
    const x = parseMeasured(a.value, `the amount of ${sp.formula}`);
    requirePositive(x.value, `The amount of ${sp.formula}`);
    if (x.ambiguous) sol.warn(AMBIGUOUS_NOTE);
    sfAll.push(x);
    const mm = molarMass(sp.formula.replace(/\^.*/, ''));
    const n = a.unit === 'g' ? x.value / mm.total : x.value;
    sol.give(`n(${sp.formula})`, `Amount of ${sp.formula}`, x.value, a.unit === 'g' ? 'g' : 'mol');
    if (a.unit === 'g') sol.convert(`n(${sp.html}) = ${fmtWork(x.value)} g ÷ ${fmtWork(mm.total)} g/mol = ${fmtWork(n)} mol`);
    rows.push({ sp, i, n, coef: bal.rc[i], extent: n / bal.rc[i], mm: mm.total, given: x.value, unit: a.unit });
  }
  const seen = new Set(rows.map((r) => r.i));
  if (seen.size !== rows.length) throw new ChemError('Each reactant should be entered only once.');
  const missing = bal.reactants.filter((_, i) => !seen.has(i));
  if (missing.length) sol.warn(`No amount was given for ${missing.map((m) => m.formula).join(', ')}; it is assumed to be present in excess.`);
  rows.forEach((r) => sol.step(`Divide moles of ${r.sp.formula} by its coefficient`, `${fmtWork(r.n)} mol ÷ ${r.coef} = ${fmtWork(r.extent)}`));
  const lim = rows.reduce((a, b) => (b.extent < a.extent ? b : a));
  const ties = rows.filter((r) => Math.abs(r.extent - lim.extent) / lim.extent < 1e-9);
  const ruleSf = minSf(...sfAll);
  if (ties.length > 1) {
    sol.step('Compare', 'The reactants are in exactly the stoichiometric ratio; none is in excess.');
  } else {
    sol.step('Compare', `${lim.sp.html} has the smallest value, so it runs out first and is the limiting reactant.`);
  }
  sol.answer('Limiting reactant', '', 0, '', ruleSf, '', { textValue: ties.length > 1 ? 'None (exact ratio)' : lim.sp.formula, html: ties.length > 1 ? 'None (exact ratio)' : lim.sp.html });
  // excess
  const excessTable = [];
  rows.filter((r) => r !== lim).forEach((r) => {
    const used = lim.extent * r.coef;
    const left = r.n - used;
    sol.step(`Excess ${r.sp.formula}`, `used = ${fmtWork(lim.extent)} × ${r.coef} = ${fmtWork(used)} mol; left = ${fmtWork(r.n)} − ${fmtWork(used)} = ${fmtWork(left)} mol (${fmtWork(left * r.mm)} g)`);
    excessTable.push([r.sp.html, fmtWork(r.n), fmtWork(used), fmtWork(Math.max(left, 0)), fmtWork(Math.max(left, 0) * r.mm)]);
    if (ties.length === 1) sol.answer(`Excess ${r.sp.formula} remaining`, `m(${r.sp.html})`, Math.max(left * r.mm, 0), 'g', ruleSf, 'g', { secondary: `${fmtWork(Math.max(left, 0))} mol` });
  });
  if (excessTable.length) sol.table('Reactant use', ['Reactant', 'Available (mol)', 'Used (mol)', 'Left (mol)', 'Left (g)'], excessTable);
  // theoretical yield for each (or the chosen) product
  const prods = product ? [speciesIndex(bal.products, product)] : bal.products.map((_, i) => i);
  prods.forEach((pi) => {
    const P = bal.products[pi];
    const np = lim.extent * bal.pc[pi];
    const mmP = molarMass(P.formula.replace(/\^.*/, '')).total;
    sol.step(`Theoretical yield of ${P.formula}`, `n = ${fmtWork(lim.extent)} × ${bal.pc[pi]} = ${fmtWork(np)} mol; m = ${fmtWork(np)} × ${fmtWork(mmP)} g/mol = ${fmtWork(np * mmP)} g`);
    sol.answer(`Theoretical yield of ${P.formula}`, `m(${P.html})`, np * mmP, 'g', ruleSf, 'g', { secondary: `${fmtWork(np)} mol` });
  });
  sol.substitution = rows.map((r) => `${r.sp.html}: ${fmtWork(r.n)} / ${r.coef}`).join('; ');
  sol.interpretation = ties.length > 1
    ? 'Both reactants are used up completely at the same time.'
    : `${lim.sp.html} is used up first, which stops the reaction. The other reactant${rows.length > 2 ? 's are' : ' is'} left over, and the maximum amount of product (theoretical yield) is set by ${lim.sp.html}.`;
  sol.assume('The reaction goes to completion and no side reactions occur.');
  sol.balanced = bal;
  sol.limiting = ties.length > 1 ? null : lim.sp.formula;
  return sol;
}

/** Percent yield: solve for percent, actual or theoretical. */
export function percentYield({ solveFor = 'percent', actual, theoretical, percent, unit = 'g' }) {
  const sol = new Solution('percent-yield', 'Percent yield');
  sol.formula = 'percent yield = (actual yield / theoretical yield) × 100 %';
  sol.define('actual yield', 'amount of product actually obtained', unit);
  sol.define('theoretical yield', 'maximum amount predicted by stoichiometry', unit);
  const u = unit;
  let ans;
  if (solveFor === 'percent') {
    const a = parseMeasured(actual, 'actual yield'), t = parseMeasured(theoretical, 'theoretical yield');
    requirePositive(t.value, 'Theoretical yield');
    if (a.value < 0) throw new ChemError('Actual yield cannot be negative.');
    sol.give('actual', 'Actual yield', a.value, u).give('theoretical', 'Theoretical yield', t.value, u);
    sol.find('% yield', 'Percent yield');
    sol.substitution = `percent yield = (${fmtWork(a.value)} ${u} / ${fmtWork(t.value)} ${u}) × 100 %`;
    ans = (a.value / t.value) * 100;
    sol.step('Divide and multiply by 100', `= ${fmtWork(ans)} %`);
    sol.answer('Percent yield', '% yield', ans, '%', minSf(a, t));
    if (ans > 100) sol.warn('A percent yield above 100 % is not physically possible for a pure product. It usually means the product was still wet or impure, or there was a measurement error.');
    sol.interpretation = ans <= 100 ? `${fmtWork(ans)} % of the maximum possible product was obtained; the rest was lost to incomplete reaction, side reactions or handling losses.` : 'The measured product exceeds the theoretical maximum; check the measurements.';
  } else if (solveFor === 'actual') {
    const p = parseMeasured(percent, 'percent yield'), t = parseMeasured(theoretical, 'theoretical yield');
    requirePositive(t.value, 'Theoretical yield');
    if (p.value < 0) throw new ChemError('Percent yield cannot be negative.');
    sol.give('% yield', 'Percent yield', p.value, '%').give('theoretical', 'Theoretical yield', t.value, u);
    sol.find('actual', 'Actual yield');
    sol.rearranged = 'actual yield = (percent yield / 100 %) × theoretical yield';
    sol.substitution = `actual yield = (${fmtWork(p.value)} % / 100 %) × ${fmtWork(t.value)} ${u}`;
    ans = (p.value / 100) * t.value;
    sol.step('Calculate', `= ${fmtWork(ans)} ${u}`);
    sol.answer('Actual yield', 'actual', ans, u, minSf(p, t));
    sol.interpretation = `At ${fmtWork(p.value)} % yield you would expect to collect ${fmtWork(ans)} ${u} of product.`;
  } else if (solveFor === 'theoretical') {
    const p = parseMeasured(percent, 'percent yield'), a = parseMeasured(actual, 'actual yield');
    requirePositive(p.value, 'Percent yield');
    sol.give('% yield', 'Percent yield', p.value, '%').give('actual', 'Actual yield', a.value, u);
    sol.find('theoretical', 'Theoretical yield');
    sol.rearranged = 'theoretical yield = actual yield / (percent yield / 100 %)';
    sol.substitution = `theoretical yield = ${fmtWork(a.value)} ${u} / (${fmtWork(p.value)} / 100)`;
    ans = a.value / (p.value / 100);
    sol.step('Calculate', `= ${fmtWork(ans)} ${u}`);
    sol.answer('Theoretical yield', 'theoretical', ans, u, minSf(p, a));
    sol.interpretation = `The reaction could have produced at most ${fmtWork(ans)} ${u}.`;
  } else throw new ChemError('Choose what to solve for.');
  if (anyAmbiguous()) sol.warn(AMBIGUOUS_NOTE);
  sol.assume('Actual and theoretical yields must be in the same units.');
  return sol;
}

export { v };
