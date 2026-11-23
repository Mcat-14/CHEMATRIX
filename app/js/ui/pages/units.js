// Centralised unit converter (uses the engine's unit system).
import { h } from '../dom.js';
import { UNITS, convert } from '../../engine/units.js';
import { parseMeasured, fmtSf } from '../../engine/numbers.js';
import { ChemError } from '../../engine/errors.js';
import { rich } from '../dom.js';

const QUANTITIES = [['pressure', 'Pressure'], ['temperature', 'Temperature'], ['volume', 'Volume'], ['mass', 'Mass'], ['energy', 'Energy'], ['amount', 'Amount of substance'], ['concentration', 'Concentration']];

export function renderUnits(view) {
  const qSel = h('select', { id: 'u-q' }, QUANTITIES.map(([v, l]) => h('option', { value: v }, l)));
  const val = h('input', { id: 'u-v', type: 'text', inputmode: 'decimal', value: '1', autocomplete: 'off' });
  const from = h('select', { 'aria-label': 'From unit' });
  const to = h('select', { 'aria-label': 'To unit' });
  const out = h('div', { class: 'answer-box', 'aria-live': 'polite' });
  const table = h('div', { class: 'table-wrap' });
  const fill = () => {
    const units = Object.entries(UNITS[qSel.value].units);
    from.replaceChildren(...units.map(([k, u]) => h('option', { value: k }, u.label)));
    to.replaceChildren(...units.map(([k, u]) => h('option', { value: k }, u.label)));
    to.selectedIndex = Math.min(1, units.length - 1);
    run();
  };
  const run = () => {
    try {
      const m = parseMeasured(val.value, 'the value');
      const r = convert(m.value, qSel.value, from.value, to.value);
      const sf = Math.max(m.sf, 4);
      out.replaceChildren(h('div', { class: 'lbl' }, 'Result'), rich('div', `${fmtSf(r, sf)} ${UNITS[qSel.value].units[to.value].label}`, { class: 'val' }),
        h('div', { class: 'sf-note' }, qSel.value === 'temperature' ? formulaFor(from.value, to.value) : `1 ${UNITS[qSel.value].units[from.value].label} = ${convert(1, qSel.value, from.value, to.value).toPrecision(8).replace(/\.?0+$/, '')} ${UNITS[qSel.value].units[to.value].label}`));
      table.replaceChildren(h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Unit'), h('th', { class: 'num' }, 'Value'))),
        h('tbody', {}, Object.entries(UNITS[qSel.value].units).map(([k, u]) => h('tr', {}, h('td', {}, u.label), rich('td', fmtSf(convert(m.value, qSel.value, from.value, k), sf), { class: 'num' }))))));
    } catch (e) {
      out.replaceChildren(h('div', { class: 'error-box', role: 'alert' }, e instanceof ChemError ? e.message : 'Enter a valid number.'));
      table.replaceChildren();
    }
  };
  [val].forEach((i) => i.addEventListener('input', run));
  [from, to].forEach((s) => s.addEventListener('change', run));
  qSel.addEventListener('change', fill);
  const swap = h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => { const a = from.value; from.value = to.value; to.value = a; run(); } }, 'Swap units');
  view.append(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Unit converter'), h('p', {}, 'The same conversion system used inside every calculator.'))),
    h('div', { class: 'calc' },
      h('div', { class: 'card inputs' },
        h('div', { class: 'field' }, h('label', { for: 'u-q' }, 'Quantity'), qSel),
        h('div', { class: 'field' }, h('label', { for: 'u-v' }, 'Value'), val),
        h('div', { class: 'field' }, h('span', { class: 'label' }, 'From'), from),
        h('div', { class: 'field' }, h('span', { class: 'label' }, 'To'), to), swap),
      h('div', { class: 'card' }, out, h('h3', { style: { marginTop: '16px' } }, 'In every unit'), table)));
  fill();
}

function formulaFor(a, b) {
  const f = { 'C-K': 'K = °C + 273.15', 'K-C': '°C = K − 273.15', 'C-F': '°F = °C × 9/5 + 32', 'F-C': '°C = (°F − 32) × 5/9', 'F-K': 'K = (°F − 32) × 5/9 + 273.15', 'K-F': '°F = (K − 273.15) × 9/5 + 32' };
  return f[`${a}-${b}`] || 'Same unit';
}
