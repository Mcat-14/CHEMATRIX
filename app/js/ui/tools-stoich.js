// Tool definitions: stoichiometry and chemical reactions.
import * as E from '../engine/index.js';
import { h, rich } from './dom.js';

const { Solution } = E;

export const STOICH_TOOLS = [
  {
    id: 'molar-mass', path: 'stoichiometry/molar-mass', title: 'Molar mass calculator', short: 'Molar mass',
    intro: 'Type a formula. Brackets, hydrates (CuSO4·5H2O or CuSO4*5H2O) and nested groups are supported.',
    fields: [{ type: 'text', key: 'formula', label: 'Chemical formula', placeholder: 'e.g. Ca(OH)2', examples: ['H2O', 'C6H12O6', 'Ca(OH)2', 'Al2(SO4)3', 'CuSO4·5H2O'], mono: true }],
    example: { formula: 'Al2(SO4)3' },
    compute: (v) => E.molarMassSolution(v.formula),
  },
  {
    id: 'moles', path: 'stoichiometry/moles', title: 'Mole calculator', short: 'Moles',
    intro: 'Convert between mass, moles and number of particles using the molar mass and Avogadro\'s constant.',
    fields: [
      { type: 'select', key: 'mode', label: 'Convert', options: [['mass-mol', 'Mass → moles'], ['mol-mass', 'Moles → mass'], ['mol-particles', 'Moles → particles'], ['particles-mol', 'Particles → moles'], ['mass-particles', 'Mass → particles'], ['particles-mass', 'Particles → mass']] },
      { type: 'text', key: 'formula', label: 'Chemical formula', placeholder: 'e.g. H2O', examples: ['H2O', 'NaCl', 'CO2'], mono: true, hint: 'Needed for any conversion involving mass; also used to count atoms.' },
      { type: 'num', key: 'mass', label: 'Mass', units: [['g', 'g'], ['kg', 'kg'], ['mg', 'mg']], placeholder: 'e.g. 36.0', showIf: (v) => v.mode.startsWith('mass') },
      { type: 'num', key: 'moles', label: 'Amount', units: [['mol', 'mol'], ['mmol', 'mmol']], placeholder: 'e.g. 2.50', showIf: (v) => v.mode.startsWith('mol') },
      { type: 'num', key: 'particles', label: 'Number of particles', placeholder: 'e.g. 1.204e24', hint: 'Scientific notation: 1.204e24 or 1.204x10^24', showIf: (v) => v.mode.startsWith('particles') },
      { type: 'select', key: 'particle', label: 'Particles are', options: [['molecules', 'molecules'], ['formula units', 'formula units (ionic)'], ['atoms', 'atoms']], showIf: (v) => v.mode.includes('particles') },
    ],
    example: { mode: 'mass-particles', formula: 'NaCl', mass: { value: '10.0', unit: 'g' }, particle: 'formula units' },
    compute: (v) => {
      const src = v.mode.split('-')[0];
      const inp = src === 'mass' ? v.mass : src === 'mol' ? v.moles : { value: v.particles, unit: '' };
      return E.moleConversion({ mode: v.mode, formula: v.formula, value: inp.value, unit: inp.unit, particle: v.particle || 'molecules' });
    },
  },
  {
    id: 'mole-ratio', path: 'stoichiometry/mole-ratio', title: 'Mole ratio calculator', short: 'Mole ratio',
    intro: 'Enter an equation (it is balanced automatically), the substance you know and the one you want.',
    fields: [
      { type: 'text', key: 'equation', label: 'Chemical equation', placeholder: 'N2 + H2 -> NH3', examples: ['N2 + H2 -> NH3', 'CH4 + O2 -> CO2 + H2O', 'Fe2O3 + CO -> Fe + CO2'], mono: true },
      { type: 'text', key: 'known', label: 'Known substance', placeholder: 'e.g. H2', mono: true },
      { type: 'num', key: 'amount', label: 'Amount of known substance', units: [['mol', 'mol'], ['g', 'g']], placeholder: 'e.g. 6.00' },
      { type: 'text', key: 'target', label: 'Substance to find', placeholder: 'e.g. NH3', mono: true },
      { type: 'seg', key: 'outUnit', label: 'Answer in', options: [['mol', 'moles'], ['g', 'grams']] },
    ],
    example: { equation: 'N2 + H2 -> NH3', known: 'H2', amount: { value: '10.0', unit: 'g' }, target: 'NH3', outUnit: 'g' },
    compute: (v) => E.moleRatio({ equation: v.equation, known: v.known, amount: v.amount.value, unit: v.amount.unit, target: v.target, outUnit: v.outUnit }),
  },
  {
    id: 'limiting', path: 'stoichiometry/limiting', title: 'Limiting reactant calculator', short: 'Limiting reactant',
    intro: 'Find the limiting reactant, how much excess reactant is left, and the theoretical yield of each product.',
    fields: [
      { type: 'text', key: 'equation', label: 'Chemical equation', placeholder: 'Al + O2 -> Al2O3', examples: ['H2 + O2 -> H2O', 'Al + O2 -> Al2O3', 'N2 + H2 -> NH3'], mono: true },
      { type: 'rows', key: 'amounts', label: 'Reactant amounts', addLabel: 'Add reactant', min: 2, max: 6,
        columns: [{ key: 'formula', label: 'Reactant', placeholder: 'Al' }, { key: 'value', label: 'Amount', type: 'num', placeholder: '10.0' }, { key: 'unit', label: 'Unit', type: 'select', options: [['g', 'g'], ['mol', 'mol']] }],
        defaultRows: [{}, {}] },
      { type: 'text', key: 'product', label: 'Product for theoretical yield (optional)', placeholder: 'leave blank for all products', mono: true },
    ],
    example: { equation: 'Al + O2 -> Al2O3', amounts: [{ formula: 'Al', value: '10.0', unit: 'g' }, { formula: 'O2', value: '10.0', unit: 'g' }], product: '' },
    compute: (v) => E.limitingReactant({ equation: v.equation, amounts: v.amounts.filter((a) => a.formula || a.value), product: v.product || null }),
  },
  {
    id: 'percent-yield', path: 'stoichiometry/percent-yield', title: 'Percent yield calculator', short: 'Percent yield',
    intro: 'Solve for percent, actual or theoretical yield. Get a theoretical yield first from the limiting reactant tool if needed.',
    fields: [
      { type: 'seg', key: 'solveFor', label: 'Solve for', options: [['percent', 'Percent yield'], ['actual', 'Actual yield'], ['theoretical', 'Theoretical yield']] },
      { type: 'select', key: 'unit', label: 'Yield unit', options: [['g', 'grams (g)'], ['mol', 'moles (mol)'], ['kg', 'kilograms (kg)']] },
      { type: 'num', key: 'actual', label: 'Actual yield', placeholder: 'e.g. 8.50', showIf: (v) => v.solveFor !== 'actual' },
      { type: 'num', key: 'theoretical', label: 'Theoretical yield', placeholder: 'e.g. 10.0', showIf: (v) => v.solveFor !== 'theoretical' },
      { type: 'num', key: 'percent', label: 'Percent yield (%)', placeholder: 'e.g. 85.0', showIf: (v) => v.solveFor !== 'percent' },
    ],
    example: { solveFor: 'percent', unit: 'g', actual: '8.50', theoretical: '10.0' },
    compute: (v) => E.percentYield(v),
  },
];

/* ---------------- reactions ---------------- */
function balancerSolution(eqStr) {
  const b = E.balanceEquation(eqStr);
  const s = new Solution('balancer', 'Balanced equation');
  s.give('', 'Equation entered', [...b.reactants.map((x) => x.html)].join(' + ') + ' → ' + b.products.map((x) => x.html).join(' + '));
  s.give('', 'Reactants', b.reactants.map((x) => x.html).join(', '));
  s.give('', 'Products', b.products.map((x) => x.html).join(', '));
  s.find('coefficients', 'Smallest whole-number coefficients');
  s.formula = 'For every element: atoms in reactants = atoms in products';
  s.define('coefficient', 'number in front of a formula; multiplies the whole formula (the only thing changed when balancing)');
  s.define('subscript', 'small number inside a formula; fixed, because changing it changes the substance');
  b.steps.forEach((st) => s.step(st.title, st.html ?? null) && st.lines && (s.steps[s.steps.length - 1].lines = st.lines));
  s.table('Atom count check', ['Element', 'Reactant side', 'Product side', 'Balanced?'], b.table.map((r) => [E.esc(r.element), String(r.left), String(r.right), r.ok ? '<span class="ok-cell">Yes</span>' : '<span class="bad-cell">No</span>']));
  s.answer('Balanced equation', '', 0, '', null, '', { html: b.html, textValue: b.text });
  s.answer('Coefficients', '', 0, '', null, '', { textValue: b.coefficients.join(' : ') });
  if (b.givenCheck) s.warn(b.givenCheck);
  if (b.note) s.warn(b.note);
  s.interpretation = `Every element now has the same number of atoms on both sides, so mass is conserved. The coefficients (${b.coefficients.join(', ')}) also give the mole ratio of the reaction.`;
  s.assume('Balanced exactly with rational arithmetic (no rounding), then scaled to the smallest whole numbers.');
  return s;
}

function classifierSolution(eqStr) {
  let bal = null;
  try { bal = E.balanceEquation(eqStr); } catch { /* classify even if not balanceable */ }
  const c = E.classifyReaction(eqStr);
  const eq = E.parseEquation(eqStr);
  const s = new Solution('classifier', 'Reaction type');
  s.give('', 'Equation', bal ? bal.html : E.equationHtml(eq.reactants, eq.products));
  s.give('', 'Number of reactants / products', `${eq.reactants.length} / ${eq.products.length}`);
  s.find('type', 'Reaction type');
  s.formula = 'Compare the equation with the five patterns: A + B → AB · AB → A + B · A + BC → AC + B · AB + CD → AD + CB · CxHy + O2 → CO2 + H2O';
  E.REACTION_TYPES.forEach((t) => s.define(t.label, `${t.pattern} (e.g. ${t.example})`));
  c.reasons.forEach((r, i) => s.step(i === 0 ? 'Evidence' : 'Reasoning', E.esc(r)));
  c.also.forEach((a) => s.warn(a));
  s.answer('Reaction type', '', 0, '', null, '', { textValue: c.label, html: E.esc(c.label) });
  s.answer('Confidence', '', 0, '', null, '', { textValue: c.confidence === 'definite' ? 'Pattern matched exactly' : c.confidence === 'likely' ? 'Likely (multi-step pattern)' : 'Not classified' });
  if (!bal) s.warn('This equation could not be balanced; check the formulas. The classification only looks at the pattern of substances.');
  s.interpretation = c.type ? `This is a ${c.label.toLowerCase()} reaction.` : 'This reaction is not one of the five types taught in this module, so the app does not force it into one.';
  return s;
}

function predictorSolution(v) {
  const charges = v.charge && v.metal ? { [v.metal]: Number(v.charge) } : undefined;
  const p = E.predictProducts(v.reactants, { charges });
  const s = new Solution('predictor', 'Product prediction');
  s.give('', 'Reactants', v.reactants.split('+').map((t) => E.formulaHtml(t.trim())).join(' + '));
  s.find('products', 'Likely products');
  s.formula = p.type ? `${E.esc(p.type)} pattern` : 'Pattern recognition (synthesis, decomposition, single/double displacement, combustion)';
  s.define('Activity series', E.ACTIVITY_SERIES.join(' > '));
  s.define('Halogen reactivity', 'F₂ > Cl₂ > Br₂ > I₂');
  p.reasons.forEach((r) => s.step('Reasoning', E.esc(r)));
  p.assumptions.forEach((a) => s.assume(a));
  if (p.status === 'predicted') {
    s.answer('Predicted equation', '', 0, '', null, '', { html: p.balanced ? p.balanced.html : E.esc(p.equation), textValue: p.balanced ? p.balanced.text : p.equation });
    s.answer('Reaction type', '', 0, '', null, '', { textValue: p.type });
    s.interpretation = 'This prediction follows the standard rules for this reaction type. Real outcomes can depend on concentration, temperature and other conditions.';
  } else if (p.status === 'no-reaction') {
    s.answer('Prediction', '', 0, '', null, '', { textValue: 'No reaction expected' });
    s.interpretation = 'Under the stated assumptions, these reactants do not react.';
  } else {
    s.answer('Prediction', '', 0, '', null, '', { textValue: p.status === 'needs-info' ? 'More information needed' : 'Not supported' });
    p.questions.forEach((q) => s.warn(q));
    s.interpretation = 'The app does not guess products when the rules are not enough. Provide the missing information or check with your textbook.';
  }
  return s;
}

export const REACTION_TOOLS = [
  {
    id: 'balancer', path: 'reactions/balancer', title: 'Chemical equation balancer', short: 'Balancer',
    intro: 'Use -> or = for the arrow and + between substances. Charges: Fe^3+, SO4^2-. Coefficients you type are checked.',
    fields: [{ type: 'text', key: 'equation', label: 'Unbalanced equation', placeholder: 'C3H8 + O2 -> CO2 + H2O', mono: true,
      examples: ['C3H8 + O2 -> CO2 + H2O', 'Al + H2SO4 -> Al2(SO4)3 + H2', 'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2', 'Fe^3+ + Cu -> Fe^2+ + Cu^2+'] }],
    example: { equation: 'Al + H2SO4 -> Al2(SO4)3 + H2' },
    submitLabel: 'Balance',
    compute: (v) => balancerSolution(v.equation),
  },
  {
    id: 'classifier', path: 'reactions/classifier', title: 'Reaction classifier', short: 'Classifier',
    intro: 'Identifies synthesis, decomposition, single displacement, double displacement and combustion, and explains why.',
    fields: [{ type: 'text', key: 'equation', label: 'Equation', placeholder: 'AgNO3 + NaCl -> AgCl + NaNO3', mono: true,
      examples: ['2Na + Cl2 -> 2NaCl', 'CaCO3 -> CaO + CO2', 'Zn + CuSO4 -> ZnSO4 + Cu', 'AgNO3 + NaCl -> AgCl + NaNO3', 'CH4 + 2O2 -> CO2 + 2H2O'] }],
    example: { equation: 'AgNO3 + NaCl -> AgCl + NaNO3' },
    submitLabel: 'Classify',
    compute: (v) => classifierSolution(v.equation),
  },
  {
    id: 'predictor', path: 'reactions/predictor', title: 'Product prediction assistant', short: 'Predict products',
    intro: 'Enter one reactant (decomposition) or two reactants. Uses the activity series, solubility rules and common patterns.',
    fields: [
      { type: 'text', key: 'reactants', label: 'Reactants', placeholder: 'AgNO3 + NaCl', mono: true, examples: ['AgNO3 + NaCl', 'Zn + HCl', 'C3H8 + O2', 'Na + Cl2', 'CaCO3', 'Na2CO3 + HCl', 'Cl2 + NaBr', 'Fe + CuSO4'] },
      { type: 'text', key: 'metal', label: 'Metal with more than one charge (optional)', placeholder: 'e.g. Fe', mono: true, hint: 'Only needed when the app asks which ion forms.' },
      { type: 'select', key: 'charge', label: 'Its charge', options: [['', 'not specified'], ['1', '+1'], ['2', '+2'], ['3', '+3'], ['4', '+4']] },
    ],
    example: { reactants: 'Pb(NO3)2 + KI', metal: '', charge: '' },
    submitLabel: 'Predict',
    compute: (v) => predictorSolution(v),
  },
];

export function stoichSide() {
  return h('p', { class: 'small' }, 'Tip: you can paste formulas like ', rich('span', E.formulaHtml('CuSO4·5H2O')), '.');
}
