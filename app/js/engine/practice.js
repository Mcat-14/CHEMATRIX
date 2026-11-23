// Practice question generator. Numerical answers are computed by the same
// deterministic engine used by the calculators, never hard-coded.
import { molarMass } from './formula.js';
import { balanceEquation, parseEquation } from './equation.js';
import { classifyReaction } from './classifier.js';
import { solveTwoState, solveIdeal } from './gas.js';
import { solveHeat } from './thermo.js';
import { limitingReactant } from './stoich.js';
import { fmtSf, fmtWork } from './numbers.js';
import { formulaHtml, esc } from './errors.js';
import { convert } from './units.js';

export const TOPICS = [
  { id: 'molar-mass', label: 'Molar mass', module: 'stoichiometry' },
  { id: 'moles', label: 'Mole conversions', module: 'stoichiometry' },
  { id: 'balancing', label: 'Balancing equations', module: 'reactions' },
  { id: 'classify', label: 'Reaction types', module: 'reactions' },
  { id: 'limiting', label: 'Limiting reactant', module: 'stoichiometry' },
  { id: 'yield', label: 'Percent yield', module: 'stoichiometry' },
  { id: 'gas-laws', label: 'Gas laws', module: 'gases' },
  { id: 'ideal-gas', label: 'Ideal gas law', module: 'gases' },
  { id: 'states', label: 'States of matter', module: 'gases' },
  { id: 'heat', label: 'Heat and specific heat', module: 'thermo' },
  { id: 'enthalpy', label: 'Enthalpy concepts', module: 'thermo' },
  { id: 'units', label: 'Unit conversions', module: 'tools' },
];

/** Small seeded RNG (mulberry32) so a question can be regenerated from its seed. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const between = (r, min, max, step) => {
  const n = Math.round((min + r() * (max - min)) / step) * step;
  return Number(n.toFixed(6));
};
function shuffle(r, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function mcq(r, correct, distractors) {
  const uniq = [...new Set(distractors.filter((d) => d !== correct))].slice(0, 3);
  const choices = shuffle(r, [correct, ...uniq]);
  return { choices, answer: choices.indexOf(correct) };
}
const fx = (v, d) => v.toFixed(d);

const COMPOUNDS = {
  easy: ['H2O', 'CO2', 'NaCl', 'O2', 'NH3', 'CH4', 'HCl', 'MgO'],
  medium: ['H2SO4', 'CaCO3', 'C6H12O6', 'NaOH', 'KNO3', 'C2H5OH', 'Na2CO3', 'Al2O3'],
  hard: ['Ca(OH)2', 'Al2(SO4)3', 'Mg3(PO4)2', '(NH4)2SO4', 'CuSO4·5H2O', 'Fe2(SO4)3', 'Ca3(PO4)2'],
};
const UNBALANCED = {
  easy: ['H2 + O2 -> H2O', 'Na + Cl2 -> NaCl', 'N2 + H2 -> NH3', 'Mg + O2 -> MgO', 'H2O2 -> H2O + O2'],
  medium: ['CH4 + O2 -> CO2 + H2O', 'Al + O2 -> Al2O3', 'Fe + Cl2 -> FeCl3', 'KClO3 -> KCl + O2', 'Zn + HCl -> ZnCl2 + H2'],
  hard: ['C3H8 + O2 -> CO2 + H2O', 'C2H6 + O2 -> CO2 + H2O', 'Al + H2SO4 -> Al2(SO4)3 + H2', 'Fe2O3 + CO -> Fe + CO2', 'C6H12O6 + O2 -> CO2 + H2O'],
};
const CLASSIFY = [
  '2Na + Cl2 -> 2NaCl', '2H2 + O2 -> 2H2O', 'CaO + H2O -> Ca(OH)2',
  'CaCO3 -> CaO + CO2', '2KClO3 -> 2KCl + 3O2', '2H2O2 -> 2H2O + O2',
  'Zn + CuSO4 -> ZnSO4 + Cu', 'Fe + 2HCl -> FeCl2 + H2', 'Cl2 + 2NaBr -> 2NaCl + Br2',
  'AgNO3 + NaCl -> AgCl + NaNO3', 'HCl + NaOH -> NaCl + H2O', 'BaCl2 + Na2SO4 -> BaSO4 + 2NaCl',
  'CH4 + 2O2 -> CO2 + 2H2O', 'C3H8 + 5O2 -> 3CO2 + 4H2O', '2C2H6 + 7O2 -> 4CO2 + 6H2O',
];
const TYPE_LABEL = { synthesis: 'Synthesis', decomposition: 'Decomposition', 'single-displacement': 'Single displacement', 'double-displacement': 'Double displacement', combustion: 'Combustion' };

const STATES_BANK = [
  { q: 'In which state are particles closest together and vibrating about fixed positions?', a: 'Solid', d: ['Liquid', 'Gas', 'All states equally'], e: 'Particles in a solid are tightly packed in fixed positions and can only vibrate.' },
  { q: 'Which state has a definite volume but takes the shape of its container?', a: 'Liquid', d: ['Solid', 'Gas', 'None of them'], e: 'Liquid particles are close together (definite volume) but can slide past one another (no fixed shape).' },
  { q: 'Why can gases be compressed easily?', a: 'There is a lot of empty space between gas particles', d: ['Gas particles are very small', 'Gas particles do not move', 'Gas particles attract each other strongly'], e: 'Gas particles are far apart compared with their size, so pressure can push them closer together.' },
  { q: 'What happens to the average kinetic energy of gas particles when the absolute temperature doubles?', a: 'It doubles', d: ['It halves', 'It stays the same', 'It quadruples'], e: 'Average kinetic energy is directly proportional to absolute (kelvin) temperature.' },
  { q: 'Which change of state is endothermic?', a: 'Melting', d: ['Freezing', 'Condensation', 'Deposition'], e: 'Melting absorbs energy to overcome attractions between particles in the solid.' },
  { q: 'Which statement describes a gas?', a: 'No definite shape and no definite volume', d: ['Definite shape and definite volume', 'Definite volume but no definite shape', 'Definite shape but no definite volume'], e: 'A gas expands to fill whatever container it is in.' },
];
const ENTHALPY_BANK = [
  { q: 'A reaction has ΔH = −890 kJ. What kind of reaction is it?', a: 'Exothermic: it releases heat', d: ['Endothermic: it absorbs heat', 'Neither: ΔH is only about speed', 'It cannot be decided from ΔH'], e: 'A negative ΔH means the products have less enthalpy than the reactants; the difference is released as heat.' },
  { q: 'An ice pack gets cold when activated. For the dissolving process, ΔH is…', a: 'Positive (endothermic)', d: ['Negative (exothermic)', 'Zero', 'Always equal to the activation energy'], e: 'The process absorbs heat from its surroundings (your hand), so ΔH > 0.' },
  { q: 'If ΔH for A → B is +50 kJ, what is ΔH for B → A?', a: '−50 kJ', d: ['+50 kJ', '0 kJ', '+100 kJ'], e: "Reversing a reaction changes the sign of ΔH (Hess's law)." },
  { q: 'If ΔH for A → B is −40 kJ, what is ΔH for 2A → 2B?', a: '−80 kJ', d: ['−40 kJ', '−20 kJ', '+80 kJ'], e: 'Multiplying a reaction by 2 multiplies ΔH by 2.' },
  { q: 'On an energy diagram, the activation energy is the difference between…', a: 'the reactants and the transition state', d: ['the reactants and the products', 'the products and zero', 'the transition state and the products only'], e: 'Ea is the energy barrier reactants must climb to reach the transition state.' },
  { q: 'Forming a chemical bond…', a: 'releases energy', d: ['absorbs energy', 'requires no energy change', 'always makes a reaction endothermic'], e: 'Energy is released when bonds form and absorbed when bonds break.' },
];

const GEN = {
  'molar-mass': (r, diff) => {
    const f = pick(r, COMPOUNDS[diff]);
    const mm = molarMass(f);
    return {
      type: 'numeric', prompt: `Calculate the molar mass of ${formulaHtml(f)}.`, answer: mm.total, unit: 'g/mol', tolerance: 0.005,
      explanation: `M = ${mm.rows.map((x) => `${x.count} × ${x.atomicMass}`).join(' + ')} = ${fmtWork(mm.total)} g/mol.`,
    };
  },
  moles: (r, diff) => {
    const f = pick(r, COMPOUNDS[diff === 'hard' ? 'medium' : 'easy']);
    const mm = molarMass(f);
    const kind = diff === 'easy' ? 'mass-mol' : pick(r, ['mass-mol', 'mol-particles', 'mass-particles']);
    if (kind === 'mass-mol') {
      const m = between(r, 5, 150, 0.1);
      const n = m / mm.total;
      return { type: 'numeric', prompt: `How many moles are in ${fx(m, 1)} g of ${formulaHtml(f)}?`, answer: n, unit: 'mol', tolerance: 0.01, explanation: `n = m / M = ${fx(m, 1)} g ÷ ${fmtWork(mm.total)} g/mol = ${fmtSf(n, 3)} mol.` };
    }
    if (kind === 'mol-particles') {
      const n = between(r, 0.1, 5, 0.01);
      const N = n * 6.02214076e23;
      return { type: 'numeric', prompt: `How many molecules are in ${fx(n, 2)} mol of ${formulaHtml(f)}?`, answer: N, unit: 'molecules', tolerance: 0.01, explanation: `N = n × N<sub>A</sub> = ${fx(n, 2)} × 6.022 × 10<sup>23</sup> = ${fmtSf(N, 3)}.` };
    }
    const m = between(r, 1, 100, 0.1);
    const N = (m / mm.total) * 6.02214076e23;
    return { type: 'numeric', prompt: `How many formula units (or molecules) are in ${fx(m, 1)} g of ${formulaHtml(f)}?`, answer: N, unit: 'particles', tolerance: 0.01, explanation: `n = ${fx(m, 1)} ÷ ${fmtWork(mm.total)} = ${fmtSf(m / mm.total, 4)} mol; N = n × 6.022 × 10<sup>23</sup> = ${fmtSf(N, 3)}.` };
  },
  balancing: (r, diff) => {
    const e = pick(r, UNBALANCED[diff]);
    const b = balanceEquation(e);
    const all = [...b.reactants, ...b.products];
    const i = Math.floor(r() * all.length);
    const correct = String(b.coefficients[i]);
    const d = [1, 2, 3, 4, 5, 6, 7, 8, 9, 13].map(String);
    const { choices, answer } = mcq(r, correct, shuffle(r, d));
    const eqU = parseEquation(e);
    return {
      type: 'mcq', prompt: `Balance the equation with the smallest whole numbers: ${eqU.reactants.map((s) => s.html).join(' + ')} → ${eqU.products.map((s) => s.html).join(' + ')}. What is the coefficient of ${all[i].html}?`,
      choices, answer, explanation: `Balanced: ${b.html}. Check each element: ${b.table.map((t) => `${esc(t.element)} ${t.left} = ${t.right}`).join(', ')}.`,
    };
  },
  classify: (r) => {
    const e = pick(r, CLASSIFY);
    const c = classifyReaction(e);
    const b = balanceEquation(e);
    const correct = TYPE_LABEL[c.type];
    const { choices, answer } = mcq(r, correct, Object.values(TYPE_LABEL));
    return { type: 'mcq', prompt: `Classify this reaction: ${b.html}`, choices, answer, explanation: c.reasons.join(' ') };
  },
  limiting: (r, diff) => {
    const sets = [
      { eq: '2H2 + O2 -> 2H2O', a: 'H2', b: 'O2' },
      { eq: 'N2 + 3H2 -> 2NH3', a: 'N2', b: 'H2' },
      { eq: '4Al + 3O2 -> 2Al2O3', a: 'Al', b: 'O2' },
      { eq: '2Na + Cl2 -> 2NaCl', a: 'Na', b: 'Cl2' },
    ];
    const s = pick(r, sets);
    const ga = between(r, 2, 60, 0.1), gb = between(r, 2, 60, 0.1);
    const sol = limitingReactant({ equation: s.eq, amounts: [{ formula: s.a, value: String(ga), unit: 'g' }, { formula: s.b, value: String(gb), unit: 'g' }] });
    if (diff === 'easy' || !sol.limiting) {
      const correct = sol.limiting || 'Neither';
      const { choices, answer } = mcq(r, correct, [s.a, s.b, 'Neither']);
      return { type: 'mcq', prompt: `For ${balanceEquation(s.eq).html}, you have ${fx(ga, 1)} g of ${formulaHtml(s.a)} and ${fx(gb, 1)} g of ${formulaHtml(s.b)}. Which is the limiting reactant?`, choices, answer, explanation: sol.steps.map((x) => x.html).join(' ') };
    }
    const y = sol.answers.find((a) => a.label.startsWith('Theoretical'));
    return { type: 'numeric', prompt: `For ${balanceEquation(s.eq).html}, you have ${fx(ga, 1)} g of ${formulaHtml(s.a)} and ${fx(gb, 1)} g of ${formulaHtml(s.b)}. What is the theoretical yield of product in grams?`, answer: y.value, unit: 'g', tolerance: 0.01, explanation: `The limiting reactant is ${formulaHtml(sol.limiting)}. ${sol.steps.slice(-1)[0].html}` };
  },
  yield: (r) => {
    const t = between(r, 10, 80, 0.1);
    const a = Number((t * between(r, 0.55, 0.97, 0.01)).toFixed(1));
    const p = (a / t) * 100;
    return { type: 'numeric', prompt: `A reaction has a theoretical yield of ${fx(t, 1)} g. You collect ${fx(a, 1)} g. What is the percent yield?`, answer: p, unit: '%', tolerance: 0.01, explanation: `% yield = (${fx(a, 1)} / ${fx(t, 1)}) × 100 % = ${fmtSf(p, 3)} %.` };
  },
  'gas-laws': (r, diff) => {
    if (diff === 'easy') {
      const P1 = between(r, 0.8, 3, 0.01), V1 = between(r, 1, 10, 0.1), P2 = between(r, 0.5, 4, 0.01);
      const s = solveTwoState({ law: 'boyle', unknown: 'V2', values: { P1: { value: String(P1), unit: 'atm' }, V1: { value: String(V1), unit: 'L' }, P2: { value: String(P2), unit: 'atm' } } });
      return { type: 'numeric', prompt: `A gas occupies ${fx(V1, 1)} L at ${fx(P1, 2)} atm. What is its volume at ${fx(P2, 2)} atm if temperature is constant?`, answer: s.answers[0].value, unit: 'L', tolerance: 0.01, explanation: `Boyle's law: V₂ = P₁V₁/P₂ = (${fx(P1, 2)})(${fx(V1, 1)})/${fx(P2, 2)} = ${fmtSf(s.answers[0].value, 3)} L.` };
    }
    if (diff === 'medium') {
      const V1 = between(r, 1, 5, 0.01), T1 = between(r, 10, 40, 1), T2 = between(r, 50, 150, 1);
      const s = solveTwoState({ law: 'charles', unknown: 'V2', values: { V1: { value: String(V1), unit: 'L' }, T1: { value: String(T1), unit: 'C' }, T2: { value: String(T2), unit: 'C' } } });
      return { type: 'numeric', prompt: `A balloon holds ${fx(V1, 2)} L at ${T1} °C. At constant pressure, what is its volume at ${T2} °C?`, answer: s.answers[0].value, unit: 'L', tolerance: 0.01, explanation: `Convert to kelvin first: T₁ = ${T1 + 273.15} K, T₂ = ${T2 + 273.15} K. Charles's law: V₂ = V₁T₂/T₁ = ${fmtSf(s.answers[0].value, 3)} L. Using °C directly would give a wrong answer.` };
    }
    const P1 = between(r, 90, 110, 0.1), V1 = between(r, 2, 8, 0.01), T1 = between(r, 15, 30, 1), P2 = between(r, 150, 300, 1), T2 = between(r, 40, 90, 1);
    const s = solveTwoState({ law: 'combined', unknown: 'V2', values: { P1: { value: String(P1), unit: 'kPa' }, V1: { value: String(V1), unit: 'L' }, T1: { value: String(T1), unit: 'C' }, P2: { value: String(P2), unit: 'kPa' }, T2: { value: String(T2), unit: 'C' } } });
    return { type: 'numeric', prompt: `A gas at ${fx(P1, 1)} kPa, ${fx(V1, 2)} L and ${T1} °C is changed to ${P2} kPa and ${T2} °C. What is the new volume?`, answer: s.answers[0].value, unit: 'L', tolerance: 0.01, explanation: `Combined gas law with temperatures in kelvin: V₂ = P₁V₁T₂/(T₁P₂) = ${fmtSf(s.answers[0].value, 3)} L.` };
  },
  'ideal-gas': (r, diff) => {
    const n = between(r, 0.2, 3, 0.01), T = between(r, 0, 80, 1);
    if (diff === 'easy') {
      const V = between(r, 5, 50, 0.1);
      const s = solveIdeal({ unknown: 'P', values: { V: { value: String(V), unit: 'L' }, n: { value: String(n), unit: 'mol' }, T: { value: String(T), unit: 'C' } }, outUnit: 'atm' });
      return { type: 'numeric', prompt: `What pressure (atm) do ${fx(n, 2)} mol of gas exert in ${fx(V, 1)} L at ${T} °C?`, answer: s.answers[0].value, unit: 'atm', tolerance: 0.01, explanation: `P = nRT/V = (${fx(n, 2)})(0.08206)(${T + 273.15})/${fx(V, 1)} = ${fmtSf(s.answers[0].value, 3)} atm.` };
    }
    const P = between(r, 80, 200, 1);
    const s = solveIdeal({ unknown: 'V', values: { P: { value: String(P), unit: 'kPa' }, n: { value: String(n), unit: 'mol' }, T: { value: String(T), unit: 'C' } }, outUnit: 'L' });
    return { type: 'numeric', prompt: `What volume (L) do ${fx(n, 2)} mol of gas occupy at ${P} kPa and ${T} °C?`, answer: s.answers[0].value, unit: 'L', tolerance: 0.01, explanation: `V = nRT/P with R = 8.314 L·kPa/(mol·K) and T = ${T + 273.15} K: V = ${fmtSf(s.answers[0].value, 3)} L.` };
  },
  states: (r) => {
    const b = pick(r, STATES_BANK);
    const { choices, answer } = mcq(r, b.a, b.d);
    return { type: 'mcq', prompt: b.q, choices, answer, explanation: b.e };
  },
  heat: (r, diff) => {
    const metals = { Water: 4.184, Aluminium: 0.897, Copper: 0.385, Iron: 0.449 };
    const name = pick(r, Object.keys(metals));
    const m = between(r, 20, 500, 1), Ti = between(r, 15, 30, 0.1), Tf = between(r, 40, 95, 0.1);
    if (diff !== 'hard') {
      const s = solveHeat({ solveFor: 'q', m: { value: String(m), unit: 'g' }, c: { value: String(metals[name]), unit: 'J/gC' }, Ti: { value: String(Ti), unit: 'C' }, Tf: { value: String(Tf), unit: 'C' } });
      return { type: 'numeric', prompt: `How much heat (J) is needed to warm ${m} g of ${name.toLowerCase()} (c = ${metals[name]} J/(g·°C)) from ${fx(Ti, 1)} °C to ${fx(Tf, 1)} °C?`, answer: s.answers[0].value, unit: 'J', tolerance: 0.01, explanation: `q = mcΔT = (${m})(${metals[name]})(${fx(Tf - Ti, 1)}) = ${fmtSf(s.answers[0].value, 3)} J.` };
    }
    const q = Math.round(m * metals[name] * (Tf - Ti));
    const c = q / (m * (Tf - Ti));
    return { type: 'numeric', prompt: `A ${m} g sample absorbs ${q} J and warms from ${fx(Ti, 1)} °C to ${fx(Tf, 1)} °C. What is its specific heat capacity in J/(g·°C)?`, answer: c, unit: 'J/(g·°C)', tolerance: 0.01, explanation: `c = q/(mΔT) = ${q}/(${m} × ${fx(Tf - Ti, 1)}) = ${fmtSf(c, 3)} J/(g·°C), which matches ${name.toLowerCase()}.` };
  },
  enthalpy: (r) => {
    const b = pick(r, ENTHALPY_BANK);
    const { choices, answer } = mcq(r, b.a, b.d);
    return { type: 'mcq', prompt: b.q, choices, answer, explanation: b.e };
  },
  units: (r, diff) => {
    const opts = [
      ['pressure', 'atm', 'kPa', 0.5, 3, 0.01], ['pressure', 'mmHg', 'atm', 500, 900, 1], ['pressure', 'kPa', 'mmHg', 80, 120, 0.1],
      ['volume', 'mL', 'L', 50, 2500, 5], ['energy', 'kJ', 'cal', 1, 20, 0.1], ['temperature', 'C', 'K', -40, 120, 1], ['temperature', 'F', 'C', 0, 212, 1],
    ];
    const o = pick(r, diff === 'easy' ? opts.slice(0, 4) : opts);
    const val = between(r, o[3], o[4], o[5]);
    const ans = convert(val, o[0], o[1], o[2]);
    const lab = { C: '°C', F: '°F' };
    return { type: 'numeric', prompt: `Convert ${val} ${lab[o[1]] || o[1]} to ${lab[o[2]] || o[2]}.`, answer: ans, unit: lab[o[2]] || o[2], tolerance: o[0] === 'temperature' ? 0.002 : 0.01, absTol: o[0] === 'temperature' ? 0.6 : 0, explanation: `${val} ${lab[o[1]] || o[1]} = ${fmtSf(ans, 4)} ${lab[o[2]] || o[2]}.` };
  },
};

/** Create a question. topic: an id from TOPICS or 'mixed'. */
export function makeQuestion(topic = 'mixed', difficulty = 'easy', seed = Math.floor(Math.random() * 2 ** 31)) {
  const r = rng(seed);
  const t = topic === 'mixed' ? pick(r, TOPICS).id : topic;
  const gen = GEN[t];
  if (!gen) throw new Error(`Unknown practice topic ${t}`);
  const q = gen(r, difficulty);
  return { ...q, topic: t, topicLabel: TOPICS.find((x) => x.id === t).label, difficulty, seed };
}

/** Check a numeric answer: relative tolerance (default 1 %) or absolute tolerance. */
export function checkNumeric(q, input) {
  const s = String(input ?? '').trim().replace(/×10\^/i, 'e').replace(/x10\^/i, 'e').replace(/,/g, '');
  const v = Number(s);
  if (s === '' || !Number.isFinite(v)) return { ok: false, invalid: true };
  const tol = q.tolerance ?? 0.01;
  const ok = Math.abs(v - q.answer) <= Math.max(Math.abs(q.answer) * tol, q.absTol || 0);
  return { ok, value: v };
}
