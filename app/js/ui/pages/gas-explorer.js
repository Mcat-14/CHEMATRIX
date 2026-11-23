// Interactive gas-law graph explorer: change variables and watch the relationship.
import { h, clear } from '../dom.js';
import { gasExplorer } from '../charts.js';
import { fmtSf } from '../../engine/numbers.js';

const R = 0.082057366; // L·atm/(mol·K)

const LAWS = {
  boyle: {
    label: "Boyle's law: P vs V", consts: [['n', 'Amount n (mol)', 0.1, 2, 0.05, 1], ['T', 'Temperature T (K)', 100, 600, 5, 300]],
    x: ['V', 'Volume V (L)', 1, 10, 0.1, 5], k: (c) => c.n * R * c.T, yName: 'P', yUnit: 'atm',
    explain: 'P = nRT / V. Doubling the volume halves the pressure: the curve is a hyperbola. Raising T or n moves the whole curve up.',
  },
  charles: {
    label: "Charles's law: V vs T", consts: [['n', 'Amount n (mol)', 0.1, 2, 0.05, 1], ['P', 'Pressure P (atm)', 0.5, 5, 0.1, 1]],
    x: ['T', 'Temperature T (K)', 50, 600, 5, 300], k: (c) => (c.n * R) / c.P, yName: 'V', yUnit: 'L',
    explain: 'V = (nR/P)·T. Volume is proportional to kelvin temperature, so the line passes through the origin (0 K). Higher pressure makes the line less steep.',
  },
  gayLussac: {
    label: "Gay-Lussac's law: P vs T", consts: [['n', 'Amount n (mol)', 0.1, 2, 0.05, 1], ['V', 'Volume V (L)', 1, 50, 0.5, 22.4]],
    x: ['T', 'Temperature T (K)', 50, 600, 5, 300], k: (c) => (c.n * R) / c.V, yName: 'P', yUnit: 'atm',
    explain: 'P = (nR/V)·T. In a rigid container, pressure is proportional to kelvin temperature. A smaller volume makes the line steeper.',
  },
  avogadro: {
    label: "Avogadro's law: V vs n", consts: [['T', 'Temperature T (K)', 100, 600, 5, 273.15], ['P', 'Pressure P (atm)', 0.5, 5, 0.1, 1]],
    x: ['n', 'Amount n (mol)', 0.1, 4, 0.05, 1], k: (c) => (R * c.T) / c.P, yName: 'V', yUnit: 'L',
    explain: 'V = (RT/P)·n. At constant T and P, each mole adds the same volume (22.4 L at 0 °C and 1 atm).',
  },
};

export function renderGasExplorer(container) {
  clear(container);
  const lawSel = h('select', { id: 'gx-law' }, Object.entries(LAWS).map(([k, l]) => h('option', { value: k }, l.label)));
  const controls = h('div');
  const readout = h('div', { class: 'answer-box', 'aria-live': 'polite' });
  const explain = h('div', { class: 'note' });
  const canvas = h('canvas', { role: 'img', 'aria-label': 'Interactive gas law graph' });
  const chartBox = h('div', { class: 'chart-box' }, canvas);
  let update = null;
  const vals = {};

  const build = () => {
    const L = LAWS[lawSel.value];
    clear(controls);
    const all = [...L.consts, L.x];
    all.forEach(([key, label, min, max, step, def]) => {
      vals[key] = def;
      const out = h('output', { class: 'mono' }, String(def));
      const r = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(def), id: `gx-${key}` });
      r.addEventListener('input', () => { vals[key] = Number(r.value); out.textContent = r.value; redraw(); });
      controls.append(h('div', { class: 'field' }, h('label', { for: `gx-${key}` }, label, ' = ', out), r));
    });
    explain.textContent = L.explain;
    update = gasExplorer(canvas, lawSel.value);
    redraw();
  };
  const redraw = () => {
    const L = LAWS[lawSel.value];
    const k = L.k(vals);
    const x = vals[L.x[0]];
    const y = lawSel.value === 'boyle' ? k / x : k * x;
    readout.replaceChildren(h('div', { class: 'lbl' }, 'Current state'), h('div', { class: 'val' }, `${L.yName} = ${fmtSf(y, 3).replace(/<[^>]+>/g, '')} ${L.yUnit}`),
      h('div', { class: 'more' }, h('div', {}, `${lawSel.value === 'boyle' ? 'P × V' : `${L.yName} / ${L.x[0]}`} = ${fmtSf(k, 4).replace(/<[^>]+>/g, '')} (constant while the other variables stay fixed)`)));
    if (update) update(k, x);
  };
  lawSel.addEventListener('change', build);
  container.append(h('div', { class: 'calc' },
    h('div', { class: 'card inputs' }, h('h2', {}, 'Gas law graph explorer'), h('p', { class: 'intro' }, 'Pick a law, then drag the sliders. Variables held constant are listed first.'),
      h('div', { class: 'field' }, h('label', { for: 'gx-law' }, 'Relationship'), lawSel), controls),
    h('div', { class: 'card' }, readout, chartBox, explain)));
  build();
}
