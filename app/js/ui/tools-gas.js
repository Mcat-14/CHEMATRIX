// Tool definitions: gas laws.
import * as E from '../engine/index.js';
import { h } from './dom.js';

const UNIT = { P: 'pressure', V: 'volume', T: 'temperature', n: [['mol', 'mol'], ['mmol', 'mmol']] };
const DEF_UNIT = { P: 'atm', V: 'L', T: 'C', n: 'mol' };
const NAME = { P: 'Pressure', V: 'Volume', T: 'Temperature', n: 'Amount' };
const SUBS = { 1: '₁', 2: '₂' };

function twoState(law, id, title, intro, example) {
  const L = E.TWO_STATE_LAWS[law];
  const vars = Object.keys(L.exps);
  const keys = vars.flatMap((q) => [`${q}1`, `${q}2`]);
  const fields = [
    { type: 'seg', key: 'unknown', label: 'Solve for', options: keys.map((k) => [k, `${k[0]}${SUBS[k[1]]}`]), default: `${vars[1]}2` },
    ...keys.map((k) => ({
      type: 'num', key: k, label: `${NAME[k[0]]} ${k[1] === '1' ? '(initial)' : '(final)'}, ${k[0]}${SUBS[k[1]]}`, units: UNIT[k[0]], unit: DEF_UNIT[k[0]],
      placeholder: k[0] === 'T' ? 'e.g. 25' : 'e.g. 1.00', showIf: (v) => v.unknown !== k,
    })),
    ...vars.map((q) => ({
      type: 'select', key: `out${q}`, label: 'Answer unit',
      options: q === 'T' ? [['C', '°C (and K)'], ['K', 'K only'], ['F', '°F (and K)']] : [['', 'Same unit as the given value'], ...(Array.isArray(UNIT[q]) ? UNIT[q] : Object.entries(E.UNITS[UNIT[q]].units).map(([k2, x]) => [k2, x.label]))],
      default: q === 'T' ? 'C' : '', showIf: (v) => v.unknown && v.unknown[0] === q,
    })),
  ];
  return {
    id, path: `gas-laws/${id}`, title, short: L.title.replace(' law', '').replace('Combined gas', 'Combined'), intro: `${intro} Constant: ${L.constant.join(' and ')}.`,
    fields, example,
    compute: (v) => {
      const values = {};
      keys.forEach((k) => { if (k !== v.unknown) values[k] = v[k]; });
      const outUnit = v[`out${v.unknown[0]}`];
      return E.solveTwoState({ law, unknown: v.unknown, values, outUnit: v.unknown[0] === 'n' || !outUnit ? undefined : outUnit });
    },
    sideInfo: () => h('p', { class: 'small' }, 'Temperatures are converted to kelvin automatically. Celsius is never used directly in a gas law.'),
  };
}

export const GAS_TOOLS = [
  twoState('boyle', 'boyle', "Boyle's law (P₁V₁ = P₂V₂)", 'Pressure–volume change at constant temperature.',
    { unknown: 'V2', P1: { value: '1.00', unit: 'atm' }, V1: { value: '2.00', unit: 'L' }, P2: { value: '2.50', unit: 'atm' } }),
  twoState('charles', 'charles', "Charles's law (V₁/T₁ = V₂/T₂)", 'Volume–temperature change at constant pressure.',
    { unknown: 'V2', V1: { value: '2.00', unit: 'L' }, T1: { value: '25', unit: 'C' }, T2: { value: '50', unit: 'C' } }),
  twoState('gayLussac', 'gay-lussac', "Gay-Lussac's law (P₁/T₁ = P₂/T₂)", 'Pressure–temperature change at constant volume.',
    { unknown: 'P2', P1: { value: '100.0', unit: 'kPa' }, T1: { value: '20.0', unit: 'C' }, T2: { value: '80.0', unit: 'C' } }),
  twoState('combined', 'combined', 'Combined gas law (P₁V₁/T₁ = P₂V₂/T₂)', 'Pressure, volume and temperature all change.',
    { unknown: 'V2', P1: { value: '101.3', unit: 'kPa' }, V1: { value: '2.00', unit: 'L' }, T1: { value: '25', unit: 'C' }, P2: { value: '202.6', unit: 'kPa' }, T2: { value: '50', unit: 'C' } }),
  twoState('avogadro', 'avogadro', "Avogadro's law (V₁/n₁ = V₂/n₂)", 'Volume–amount change at constant temperature and pressure.',
    { unknown: 'V2', V1: { value: '5.00', unit: 'L' }, n1: { value: '0.200', unit: 'mol' }, n2: { value: '0.500', unit: 'mol' } }),
  {
    id: 'ideal', path: 'gas-laws/ideal', title: 'Ideal gas law (PV = nRT)', short: 'Ideal gas',
    intro: 'Solve for P, V, n or T. R is chosen automatically to match your pressure and volume units.',
    fields: [
      { type: 'seg', key: 'unknown', label: 'Solve for', options: [['P', 'Pressure P'], ['V', 'Volume V'], ['n', 'Moles n'], ['T', 'Temperature T']], default: 'V' },
      { type: 'num', key: 'P', label: 'Pressure, P', units: 'pressure', unit: 'atm', placeholder: 'e.g. 1.00', showIf: (v) => v.unknown !== 'P' },
      { type: 'num', key: 'V', label: 'Volume, V', units: 'volume', unit: 'L', placeholder: 'e.g. 22.4', showIf: (v) => v.unknown !== 'V' },
      { type: 'num', key: 'n', label: 'Amount, n', units: [['mol', 'mol'], ['mmol', 'mmol']], unit: 'mol', placeholder: 'e.g. 1.00', showIf: (v) => v.unknown !== 'n' },
      { type: 'num', key: 'T', label: 'Temperature, T', units: 'temperature', unit: 'C', placeholder: 'e.g. 25', showIf: (v) => v.unknown !== 'T' },
      { type: 'select', key: 'outP', label: 'Answer unit', options: Object.entries(E.UNITS.pressure.units).map(([k, x]) => [k, x.label]), default: 'atm', showIf: (v) => v.unknown === 'P' },
      { type: 'select', key: 'outV', label: 'Answer unit', options: Object.entries(E.UNITS.volume.units).map(([k, x]) => [k, x.label]), default: 'L', showIf: (v) => v.unknown === 'V' },
      { type: 'select', key: 'outT', label: 'Also show', options: [['K', 'kelvin only'], ['C', 'kelvin and °C']], default: 'C', showIf: (v) => v.unknown === 'T' },
    ],
    example: { unknown: 'V', P: { value: '1.00', unit: 'atm' }, n: { value: '1.00', unit: 'mol' }, T: { value: '0', unit: 'C' }, outV: 'L' },
    compute: (v) => {
      const values = {};
      ['P', 'V', 'n', 'T'].forEach((k) => { if (k !== v.unknown) values[k] = v[k]; });
      const outUnit = v.unknown === 'P' ? v.outP : v.unknown === 'V' ? v.outV : v.unknown === 'T' ? v.outT : undefined;
      return E.solveIdeal({ unknown: v.unknown, values, outUnit });
    },
  },
  {
    id: 'density', path: 'gas-laws/density', title: 'Gas density calculator', short: 'Gas density',
    intro: 'd = PM/(RT). Find density from molar mass (or a formula), or molar mass from a measured density.',
    fields: [
      { type: 'seg', key: 'solveFor', label: 'Solve for', options: [['d', 'Density'], ['M', 'Molar mass']], default: 'd' },
      { type: 'num', key: 'P', label: 'Pressure', units: 'pressure', unit: 'atm', placeholder: 'e.g. 1.00' },
      { type: 'num', key: 'T', label: 'Temperature', units: 'temperature', unit: 'C', placeholder: 'e.g. 25' },
      { type: 'text', key: 'formula', label: 'Gas formula (or enter molar mass below)', placeholder: 'e.g. CO2', mono: true, examples: ['CO2', 'O2', 'N2', 'CH4'], showIf: (v) => v.solveFor === 'd' },
      { type: 'num', key: 'M', label: 'Molar mass (g/mol)', placeholder: 'used if no formula', showIf: (v) => v.solveFor === 'd' },
      { type: 'num', key: 'd', label: 'Density (g/L)', placeholder: 'e.g. 1.25', showIf: (v) => v.solveFor === 'M' },
    ],
    example: { solveFor: 'd', P: { value: '1.00', unit: 'atm' }, T: { value: '0', unit: 'C' }, formula: 'CO2' },
    compute: (v) => E.gasDensity({ solveFor: v.solveFor, P: v.P, T: v.T, formula: v.formula, M: { value: v.M }, d: { value: v.d } }),
  },
  {
    id: 'molar-mass', path: 'gas-laws/molar-mass', title: 'Molar mass of a gas', short: 'Gas molar mass',
    intro: 'M = mRT/(PV): identify an unknown gas from the mass of a sample at known P, V and T.',
    fields: [
      { type: 'num', key: 'm', label: 'Mass of gas', units: [['g', 'g'], ['mg', 'mg'], ['kg', 'kg']], unit: 'g', placeholder: 'e.g. 1.60' },
      { type: 'num', key: 'P', label: 'Pressure', units: 'pressure', unit: 'atm', placeholder: 'e.g. 1.00' },
      { type: 'num', key: 'V', label: 'Volume', units: 'volume', unit: 'L', placeholder: 'e.g. 1.12' },
      { type: 'num', key: 'T', label: 'Temperature', units: 'temperature', unit: 'C', placeholder: 'e.g. 0' },
    ],
    example: { m: { value: '1.60', unit: 'g' }, P: { value: '1.00', unit: 'atm' }, V: { value: '1.12', unit: 'L' }, T: { value: '0', unit: 'C' } },
    compute: (v) => E.gasMolarMass(v),
  },
];
