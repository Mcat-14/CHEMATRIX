// Tool definitions: thermochemistry.
import * as E from '../engine/index.js';
import { h, rich } from './dom.js';
import { energyDiagram } from './charts.js';

const C_UNITS = Object.entries(E.SPECIFIC_HEAT_UNITS).map(([k, v]) => [k, v.label]);
const MASS = [['g', 'g'], ['kg', 'kg'], ['mg', 'mg']];
const TEMP = [['C', '°C'], ['K', 'K'], ['F', '°F']];
const ENERGY = 'energy';

const specificHeatHelp = () => h('details', { class: 'small' }, h('summary', {}, 'Common specific heats'),
  h('ul', {}, Object.entries(E.SPECIFIC_HEATS).map(([k, v]) => h('li', {}, `${k}: ${v} J/(g·°C)`))));

const dTFields = (show = () => true) => [
  { type: 'seg', key: 'dtMode', label: 'Temperature data', options: [['tt', 'Initial and final temperature'], ['dt', 'Temperature change ΔT']], default: 'tt', showIf: show },
  { type: 'num', key: 'Ti', label: 'Initial temperature, Tᵢ', units: TEMP, unit: 'C', placeholder: 'e.g. 20.0', showIf: (v) => show(v) && v.dtMode === 'tt' },
  { type: 'num', key: 'Tf', label: 'Final temperature, T_f', units: TEMP, unit: 'C', placeholder: 'e.g. 30.0', showIf: (v) => show(v) && v.dtMode === 'tt' },
  { type: 'num', key: 'dT', label: 'Temperature change, ΔT', units: TEMP, unit: 'C', placeholder: 'e.g. 10.0', hint: 'Use a negative value for cooling.', showIf: (v) => show(v) && v.dtMode === 'dt' },
];
const dtArgs = (v) => (v.dtMode === 'dt' ? { dT: v.dT } : { Ti: v.Ti, Tf: v.Tf });

export const THERMO_TOOLS = [
  {
    id: 'heat', path: 'thermochemistry/heat', title: 'Heat calculator (q = mcΔT)', short: 'Heat q = mcΔT',
    intro: 'Solve for heat, mass, specific heat or temperature change.',
    fields: [
      { type: 'seg', key: 'solveFor', label: 'Solve for', options: [['q', 'Heat q'], ['m', 'Mass m'], ['c', 'Specific heat c'], ['dT', 'ΔT']], default: 'q' },
      { type: 'num', key: 'q', label: 'Heat, q', units: ENERGY, unit: 'J', placeholder: 'e.g. 4184', hint: 'Positive if absorbed, negative if released.', showIf: (v) => v.solveFor !== 'q' },
      { type: 'num', key: 'm', label: 'Mass, m', units: MASS, unit: 'g', placeholder: 'e.g. 100', showIf: (v) => v.solveFor !== 'm' },
      { type: 'num', key: 'c', label: 'Specific heat capacity, c', units: C_UNITS, unit: 'J/gC', placeholder: 'water: 4.184', showIf: (v) => v.solveFor !== 'c' },
      ...dTFields((v) => v.solveFor !== 'dT'),
    ],
    example: { solveFor: 'q', m: { value: '100', unit: 'g' }, c: { value: '4.184', unit: 'J/gC' }, dtMode: 'tt', Ti: { value: '20.0', unit: 'C' }, Tf: { value: '30.0', unit: 'C' } },
    compute: (v) => E.solveHeat({ solveFor: v.solveFor, q: v.q, m: v.m, c: v.c, ...dtArgs(v) }),
    sideInfo: specificHeatHelp,
  },
  {
    id: 'temperature', path: 'thermochemistry/temperature', title: 'Temperature change calculator', short: 'Final temperature',
    intro: 'Find the final (or initial) temperature after a known amount of heat is absorbed or released.',
    fields: [
      { type: 'seg', key: 'solveFor', label: 'Find', options: [['Tf', 'Final temperature'], ['Ti', 'Initial temperature']], default: 'Tf' },
      { type: 'num', key: 'q', label: 'Heat, q', units: ENERGY, unit: 'J', placeholder: 'e.g. 2092', hint: 'Negative if the substance releases heat.' },
      { type: 'num', key: 'm', label: 'Mass, m', units: MASS, unit: 'g', placeholder: 'e.g. 50.0' },
      { type: 'num', key: 'c', label: 'Specific heat, c', units: C_UNITS, unit: 'J/gC', placeholder: 'e.g. 4.184' },
      { type: 'num', key: 'Ti', label: 'Initial temperature', units: TEMP, unit: 'C', placeholder: 'e.g. 20.0', showIf: (v) => v.solveFor === 'Tf' },
      { type: 'num', key: 'Tf', label: 'Final temperature', units: TEMP, unit: 'C', placeholder: 'e.g. 30.0', showIf: (v) => v.solveFor === 'Ti' },
    ],
    example: { solveFor: 'Tf', q: { value: '2092', unit: 'J' }, m: { value: '50.0', unit: 'g' }, c: { value: '4.184', unit: 'J/gC' }, Ti: { value: '20.0', unit: 'C' } },
    compute: (v) => E.solveTemperature(v),
    sideInfo: specificHeatHelp,
  },
  {
    id: 'specific-heat', path: 'thermochemistry/specific-heat', title: 'Specific heat calculator', short: 'Specific heat',
    intro: 'c = q / (mΔT). The result is compared with known materials to help identify the substance.',
    fields: [
      { type: 'num', key: 'q', label: 'Heat absorbed, q', units: ENERGY, unit: 'J', placeholder: 'e.g. 385' },
      { type: 'num', key: 'm', label: 'Mass, m', units: MASS, unit: 'g', placeholder: 'e.g. 10.0' },
      ...dTFields(),
    ],
    example: { q: { value: '385', unit: 'J' }, m: { value: '10.0', unit: 'g' }, dtMode: 'dt', dT: { value: '100', unit: 'C' } },
    compute: (v) => E.solveHeat({ solveFor: 'c', q: v.q, m: v.m, ...dtArgs(v) }),
    sideInfo: specificHeatHelp,
  },
  {
    id: 'calorimetry', path: 'thermochemistry/calorimetry', title: 'Calorimetry solver', short: 'Calorimetry',
    intro: 'Heat lost = heat gained in an isolated calorimeter. Choose the type of problem.',
    fields: [
      { type: 'select', key: 'mode', label: 'Problem type', options: [['mixing', 'Two substances mixed: final temperature'], ['unknown-c', 'Hot metal in water: specific heat of metal'], ['reaction', 'Reaction in solution (coffee-cup): ΔH'], ['bomb', 'Bomb calorimeter: heat of combustion']] },
      { type: 'num', key: 'm1', label: 'Mass of substance 1', units: MASS, unit: 'g', placeholder: 'e.g. 100', showIf: (v) => v.mode === 'mixing' },
      { type: 'num', key: 'c1', label: 'Specific heat of substance 1', units: C_UNITS, unit: 'J/gC', placeholder: '4.184', showIf: (v) => v.mode === 'mixing' },
      { type: 'num', key: 'T1', label: 'Initial temperature of substance 1', units: TEMP, unit: 'C', placeholder: 'e.g. 80.0', showIf: (v) => v.mode === 'mixing' },
      { type: 'num', key: 'm2', label: 'Mass of substance 2', units: MASS, unit: 'g', placeholder: 'e.g. 200', showIf: (v) => v.mode === 'mixing' },
      { type: 'num', key: 'c2', label: 'Specific heat of substance 2', units: C_UNITS, unit: 'J/gC', placeholder: '4.184', showIf: (v) => v.mode === 'mixing' },
      { type: 'num', key: 'T2', label: 'Initial temperature of substance 2', units: TEMP, unit: 'C', placeholder: 'e.g. 20.0', showIf: (v) => v.mode === 'mixing' },
      { type: 'num', key: 'mMetal', label: 'Mass of metal', units: MASS, unit: 'g', placeholder: 'e.g. 50.0', showIf: (v) => v.mode === 'unknown-c' },
      { type: 'num', key: 'TMetal', label: 'Initial temperature of metal (°C)', placeholder: 'e.g. 100.0', showIf: (v) => v.mode === 'unknown-c' },
      { type: 'num', key: 'mWater', label: 'Mass of water', units: MASS, unit: 'g', placeholder: 'e.g. 100.0', showIf: (v) => v.mode === 'unknown-c' },
      { type: 'num', key: 'TWater', label: 'Initial temperature of water (°C)', placeholder: 'e.g. 20.0', showIf: (v) => v.mode === 'unknown-c' },
      { type: 'num', key: 'TfMix', label: 'Final temperature (°C)', placeholder: 'e.g. 22.0', showIf: (v) => v.mode === 'unknown-c' },
      { type: 'num', key: 'mSol', label: 'Mass of solution', units: MASS, unit: 'g', placeholder: 'e.g. 100.0', hint: 'For dilute water solutions, 1 mL ≈ 1 g.', showIf: (v) => v.mode === 'reaction' },
      { type: 'num', key: 'cSol', label: 'Specific heat of solution', units: C_UNITS, unit: 'J/gC', placeholder: '4.184', showIf: (v) => v.mode === 'reaction' },
      { type: 'num', key: 'C', label: 'Heat capacity of calorimeter', units: [['kJ/C', 'kJ/°C'], ['J/C', 'J/°C']], unit: 'kJ/C', placeholder: 'e.g. 10.0', showIf: (v) => v.mode === 'bomb' },
      ...dTFields((v) => v.mode === 'reaction' || v.mode === 'bomb'),
      { type: 'num', key: 'n', label: 'Moles of reactant (optional, for ΔH per mole)', placeholder: 'e.g. 0.0500', showIf: (v) => v.mode === 'reaction' || v.mode === 'bomb' },
    ],
    example: { mode: 'unknown-c', mMetal: { value: '50.0', unit: 'g' }, TMetal: '100.0', mWater: { value: '100.0', unit: 'g' }, TWater: '20.0', TfMix: '22.0' },
    compute: (v) => {
      if (v.mode === 'mixing') return E.solveCalorimetry({ mode: 'mixing', m1: v.m1, c1: v.c1, T1: v.T1, m2: v.m2, c2: v.c2, T2: v.T2 });
      if (v.mode === 'unknown-c') return E.solveCalorimetry({ mode: 'unknown-c', mMetal: v.mMetal, mWater: v.mWater, TMetal: { value: v.TMetal }, TWater: { value: v.TWater }, Tf: { value: v.TfMix } });
      if (v.mode === 'reaction') return E.solveCalorimetry({ mode: 'reaction', m: v.mSol, c: v.cSol && v.cSol.value ? v.cSol : undefined, n: { value: v.n }, ...dtArgs(v) });
      return E.solveCalorimetry({ mode: 'bomb', C: v.C, n: { value: v.n }, ...dtArgs(v) });
    },
    sideInfo: specificHeatHelp,
  },
  {
    id: 'enthalpy', path: 'thermochemistry/enthalpy', title: 'Enthalpy calculator', short: 'Enthalpy ΔH',
    intro: 'Calculate ΔH from formation data, from measured heat, or for a given amount of reactant.',
    fields: [
      { type: 'select', key: 'mode', label: 'Method', options: [['formation', 'ΔH°rxn from standard enthalpies of formation'], ['heat', 'Molar ΔH from heat and moles'], ['amount', 'Heat for a given amount (thermochemical equation)']] },
      { type: 'text', key: 'equation', label: 'Equation (add states for accuracy)', placeholder: 'CH4(g) + O2(g) -> CO2(g) + H2O(l)', mono: true, examples: ['CH4(g) + O2(g) -> CO2(g) + H2O(l)', 'CaCO3(s) -> CaO(s) + CO2(g)', 'C3H8(g) + O2(g) -> CO2(g) + H2O(g)', 'N2(g) + H2(g) -> NH3(g)'], showIf: (v) => v.mode !== 'heat' },
      { type: 'rows', key: 'overrides', label: 'Your own ΔH°f values (optional)', addLabel: 'Add value', min: 0, max: 8, columns: [{ key: 'species', label: 'Substance with state', placeholder: 'C4H10(g)' }, { key: 'value', label: 'ΔH°f (kJ/mol)', type: 'num', placeholder: '-125.7' }], defaultRows: [], showIf: (v) => v.mode === 'formation' },
      { type: 'num', key: 'q', label: 'Heat', units: ENERGY, unit: 'kJ', placeholder: 'e.g. 5.56', showIf: (v) => v.mode === 'heat' },
      { type: 'seg', key: 'process', label: 'The system', options: [['released', 'released heat (exothermic)'], ['absorbed', 'absorbed heat (endothermic)']], default: 'released', showIf: (v) => v.mode === 'heat' },
      { type: 'num', key: 'n', label: 'Moles', placeholder: 'e.g. 0.0100', showIf: (v) => v.mode === 'heat' },
      { type: 'num', key: 'dH', label: 'ΔH for the equation as written (kJ)', placeholder: 'e.g. -890', showIf: (v) => v.mode === 'amount' },
      { type: 'text', key: 'species', label: 'Substance you have an amount of', placeholder: 'e.g. CH4', mono: true, showIf: (v) => v.mode === 'amount' },
      { type: 'num', key: 'amount', label: 'Amount', units: [['g', 'g'], ['mol', 'mol']], unit: 'g', placeholder: 'e.g. 32.0', showIf: (v) => v.mode === 'amount' },
    ],
    example: { mode: 'formation', equation: 'CH4(g) + O2(g) -> CO2(g) + H2O(l)', overrides: [] },
    compute: (v) => {
      if (v.mode === 'heat') return E.enthalpyFromHeat({ q: v.q, n: { value: v.n }, process: v.process });
      if (v.mode === 'amount') return E.enthalpyForAmount({ equation: v.equation, dH: v.dH, species: v.species, amount: v.amount.value, unit: v.amount.unit });
      const overrides = {};
      (v.overrides || []).filter((r) => r.species && r.value).forEach((r) => { overrides[r.species.replace(/\s+/g, '')] = r.value; });
      return E.enthalpyFromFormation({ equation: v.equation, overrides });
    },
    onError: (e, out) => {
      if (e.missing) out.append(h('p', { class: 'small', style: { marginTop: '10px' } }, 'Add the missing value under "Your own ΔH°f values", using the substance exactly as shown (with its state), then calculate again.'));
    },
    sideInfo: () => h('details', { class: 'small' }, h('summary', {}, `Stored ΔH°f values (${Object.keys(E.DHF).length})`), h('div', { class: 'table-wrap' }, h('table', {}, h('tbody', {}, Object.entries(E.DHF).map(([k, val]) => h('tr', {}, rich('td', E.formulaHtml(k.replace(/\(.*$/, '')) + `<span class="state">${E.esc(k.match(/\(.*\)$/)[0])}</span>`), h('td', { class: 'num' }, String(val)))))))),
  },
  {
    id: 'hess', path: 'thermochemistry/hess', title: "Hess's law solver", short: "Hess's law",
    intro: 'Enter the given thermochemical equations with their coefficients. Use -1 to reverse, 2 to double, 1/2 to halve, or let the app find the factors from a target equation.',
    fields: [
      { type: 'seg', key: 'auto', label: 'Factors', options: [['auto', 'Find automatically from target'], ['manual', 'I will enter factors']], default: 'auto' },
      { type: 'text', key: 'target', label: 'Target equation', placeholder: '2C(s) + H2(g) -> C2H2(g)', mono: true, showIf: (v) => v.auto === 'auto' },
      { type: 'rows', key: 'steps', label: 'Given equations', addLabel: 'Add equation', min: 2, max: 8,
        columns: [{ key: 'equation', label: 'Equation (with coefficients)', placeholder: 'C(s) + O2(g) -> CO2(g)', wide: true }, { key: 'dH', label: 'ΔH (kJ)', type: 'num', placeholder: '-393.5' }, { key: 'factor', label: 'Factor', placeholder: '1' }],
        defaultRows: [{}, {}] },
    ],
    example: { auto: 'auto', target: '2C(s) + H2(g) -> C2H2(g)', steps: [{ equation: 'C(s) + O2(g) -> CO2(g)', dH: '-393.5', factor: '' }, { equation: 'H2(g) + 1/2O2(g) -> H2O(l)', dH: '-285.8', factor: '' }, { equation: '2C2H2(g) + 5O2(g) -> 4CO2(g) + 2H2O(l)', dH: '-2599.0', factor: '' }] },
    compute: (v) => E.solveHess({ auto: v.auto === 'auto', target: v.auto === 'auto' ? v.target : (v.target || null), steps: v.steps.filter((s) => s.equation).map((s) => ({ ...s, factor: s.factor || '1' })) }),
  },
  {
    id: 'bond-energy', path: 'thermochemistry/bond-energy', title: 'Bond energy calculator', short: 'Bond energies',
    intro: 'List the bonds broken in the reactants and the bonds formed in the products. ΔH ≈ Σ broken − Σ formed.',
    fields: [
      { type: 'rows', key: 'broken', label: 'Bonds broken (reactants)', addLabel: 'Add bond', min: 1, max: 10,
        columns: [{ key: 'bond', label: 'Bond', type: 'select', options: Object.keys(E.BOND_ENERGIES).map((b) => [b, `${b} (${E.BOND_ENERGIES[b]})`]) }, { key: 'count', label: 'How many', type: 'num', placeholder: '1' }, { key: 'energy', label: 'Own value (optional)', type: 'num', placeholder: 'kJ/mol' }], defaultRows: [{}] },
      { type: 'rows', key: 'formed', label: 'Bonds formed (products)', addLabel: 'Add bond', min: 1, max: 10,
        columns: [{ key: 'bond', label: 'Bond', type: 'select', options: Object.keys(E.BOND_ENERGIES).map((b) => [b, `${b} (${E.BOND_ENERGIES[b]})`]) }, { key: 'count', label: 'How many', type: 'num', placeholder: '1' }, { key: 'energy', label: 'Own value (optional)', type: 'num', placeholder: 'kJ/mol' }], defaultRows: [{}] },
    ],
    example: { broken: [{ bond: 'H–H', count: '1', energy: '' }, { bond: 'Cl–Cl', count: '1', energy: '' }], formed: [{ bond: 'H–Cl', count: '2', energy: '' }] },
    compute: (v) => E.bondEnergy({ broken: v.broken, formed: v.formed }),
    sideInfo: () => h('p', { class: 'small' }, 'Example: CH₄ + 2O₂ → CO₂ + 2H₂O breaks 4 C–H and 2 O=O, and forms 2 C=O (in CO₂) and 4 O–H.'),
  },
];

/** Interactive energy diagram (not a calculator form). */
export function renderEnergyDiagramTool(container) {
  const state = { dH: -60, Ea: 90 };
  const out = h('div', { class: 'card' });
  const dHIn = h('input', { type: 'range', min: '-300', max: '300', step: '5', value: String(state.dH), id: 'ed-dh' });
  const EaIn = h('input', { type: 'range', min: '5', max: '400', step: '5', value: String(state.Ea), id: 'ed-ea' });
  const dHNum = h('input', { type: 'text', inputmode: 'decimal', value: String(state.dH), 'aria-label': 'ΔH in kJ' });
  const EaNum = h('input', { type: 'text', inputmode: 'decimal', value: String(state.Ea), 'aria-label': 'Activation energy in kJ' });
  const msg = h('div', { 'aria-live': 'polite' });
  const draw = () => {
    while (out.firstChild) out.removeChild(out.firstChild);
    let p;
    try { p = E.energyProfile({ dH: state.dH, Ea: state.Ea }); } catch (e) {
      out.append(h('div', { class: 'error-box', role: 'alert' }, e.message));
      return;
    }
    out.append(h('div', { class: 'answer-box' }, h('div', { class: 'lbl' }, 'Reaction type'), h('div', { class: 'val' }, p.type[0].toUpperCase() + p.type.slice(1)),
      h('div', { class: 'more' }, h('div', {}, `ΔH = ${p.dH} kJ · Ea (forward) = ${p.Ea} kJ · Ea (reverse) = ${p.EaReverse} kJ`))));
    out.append(energyDiagram(p));
    out.append(h('div', { class: 'note', style: { marginTop: '12px' } }, p.explanation));
    out.append(h('ul', { class: 'small', style: { marginTop: '10px' } },
      h('li', {}, 'Reactants (left level) and products (right level): the vertical gap between them is ΔH.'),
      h('li', {}, 'The peak is the transition state; its height above the reactants is the activation energy Ea.'),
      h('li', {}, 'A catalyst lowers Ea (the peak) but does not change ΔH.')));
  };
  const sync = (src) => {
    const dH = Number(src === 'range' ? dHIn.value : dHNum.value);
    const Ea = Number(src === 'range' ? EaIn.value : EaNum.value);
    if (Number.isFinite(dH)) state.dH = dH;
    if (Number.isFinite(Ea)) state.Ea = Ea;
    if (src === 'range') { dHNum.value = String(state.dH); EaNum.value = String(state.Ea); } else { dHIn.value = String(state.dH); EaIn.value = String(state.Ea); }
    msg.textContent = '';
    draw();
  };
  [dHIn, EaIn].forEach((i) => i.addEventListener('input', () => sync('range')));
  [dHNum, EaNum].forEach((i) => i.addEventListener('change', () => sync('num')));
  const presets = h('div', { class: 'chips' },
    h('button', { type: 'button', class: 'chip', onclick: () => { dHNum.value = '-890'; EaNum.value = '150'; sync('num'); } }, 'Combustion (exothermic)'),
    h('button', { type: 'button', class: 'chip', onclick: () => { dHNum.value = '180'; EaNum.value = '260'; sync('num'); } }, 'Decomposition (endothermic)'),
    h('button', { type: 'button', class: 'chip', onclick: () => { EaNum.value = String(Math.max(state.dH, 0) + Math.round((state.Ea - Math.max(state.dH, 0)) / 2)); sync('num'); } }, 'Add a catalyst (halve the barrier above the higher level)'));
  const form = h('div', { class: 'card inputs' }, h('h2', {}, 'Energy diagram'), h('p', { class: 'intro' }, 'Move the sliders or type values to see how ΔH and activation energy shape the diagram.'),
    h('div', { class: 'field' }, h('label', { for: 'ed-dh' }, 'Enthalpy change ΔH (kJ)'), dHIn, dHNum),
    h('div', { class: 'field' }, h('label', { for: 'ed-ea' }, 'Activation energy Ea (kJ)'), EaIn, EaNum),
    presets, msg);
  while (container.firstChild) container.removeChild(container.firstChild);
  container.append(h('div', { class: 'calc' }, form, out));
  draw();
}
