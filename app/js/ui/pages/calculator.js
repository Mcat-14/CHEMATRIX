// Scientific calculator using the engine's safe expression parser (no eval).
import { h } from '../dom.js';
import { evaluate } from '../../engine/expr.js';
import { ChemError } from '../../engine/errors.js';
import { settings, setSetting } from '../store.js';

const KEYS = [
  ['sqrt(', '√', 'fn'], ['^', 'xʸ', 'op'], ['log(', 'log', 'fn'], ['ln(', 'ln', 'fn'], ['C', 'C', 'op'],
  ['(', '(', 'op'], [')', ')', 'op'], ['e', 'e', 'fn'], ['pi', 'π', 'fn'], ['⌫', '⌫', 'op'],
  ['7', '7'], ['8', '8'], ['9', '9'], ['/', '÷', 'op'], ['NA', 'Nₐ', 'fn'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['*', '×', 'op'], ['E', 'EXP', 'fn'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['-', '−', 'op'], ['ans', 'Ans', 'fn'],
  ['0', '0'], ['.', '.'], ['!', 'n!', 'fn'], ['+', '+', 'op'], ['=', '=', 'eqk'],
];

export function renderCalculator(view) {
  let ans = null;
  const expr = h('input', { type: 'text', 'aria-label': 'Expression', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', inputmode: 'text', placeholder: 'e.g. 6.022e23 * 0.25' });
  const res = h('div', { class: 'res', 'aria-live': 'polite' });
  const err = h('div', { class: 'err', role: 'alert' });
  const tape = h('ol', { class: 'small', reversed: true });
  const angle = h('select', { 'aria-label': 'Angle unit' }, h('option', { value: 'deg' }, 'Degrees'), h('option', { value: 'rad' }, 'Radians'));
  angle.value = settings().angle || 'deg';
  angle.addEventListener('change', () => setSetting('angle', angle.value).catch(() => {}));
  const compute = (commit) => {
    err.textContent = '';
    if (!expr.value.trim()) { res.textContent = ''; return; }
    try {
      const v = evaluate(expr.value, { deg: angle.value === 'deg', ans });
      res.textContent = fmt(v);
      if (commit) {
        tape.prepend(h('li', {}, `${expr.value} = ${fmt(v)}`));
        ans = v;
        expr.value = '';
      }
    } catch (e) {
      if (commit) err.textContent = e instanceof ChemError ? e.message : 'Invalid expression.';
      else res.textContent = '';
    }
  };
  expr.addEventListener('input', () => compute(false));
  expr.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); compute(true); } });
  const press = (k) => {
    if (k === 'C') { expr.value = ''; res.textContent = ''; err.textContent = ''; }
    else if (k === '⌫') expr.value = expr.value.slice(0, -1);
    else if (k === '=') { compute(true); return; }
    else if (k === 'E') expr.value += 'e';
    else expr.value += k;
    compute(false);
  };
  const keys = h('div', { class: 'keys' }, KEYS.map(([k, l, c]) => h('button', { type: 'button', class: c || '', 'aria-label': k === '⌫' ? 'Backspace' : k === 'C' ? 'Clear' : l, onclick: () => press(k) }, l)));
  view.append(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Scientific calculator'), h('p', {}, 'Type or tap. Supports powers, roots, logarithms, scientific notation (6.02e23) and brackets.'))),
    h('div', { class: 'calc' },
      h('div', { class: 'card' }, h('div', { class: 'calc-display' }, expr, res, err), keys, h('div', { class: 'field', style: { marginTop: '12px' } }, h('span', { class: 'label' }, 'Angles'), angle)),
      h('div', { class: 'card' }, h('h2', {}, 'History'), tape,
        h('details', { class: 'small' }, h('summary', {}, 'Functions and constants'), h('ul', {},
          h('li', {}, 'sqrt(x), cbrt(x), log(x) base 10, ln(x), exp(x), antilog(x) = 10^x, abs(x)'),
          h('li', {}, 'sin, cos, tan, asin, acos, atan (degrees or radians)'),
          h('li', {}, 'x^y, n!, x% (= x/100), implicit multiplication: 2pi, 3(4+1)'),
          h('li', {}, 'Constants: pi, e, NA = 6.02214076e23, R = 8.314462618, kB, h, c'),
          h('li', {}, 'ans = previous result'))))));
  requestAnimationFrame(() => expr.focus({ preventScroll: true }));
}

function fmt(v) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e10 || a < 1e-6) return v.toExponential(8).replace(/\.?0+e/, 'e').replace('e', ' × 10^');
  return String(Number(v.toPrecision(12)));
}
