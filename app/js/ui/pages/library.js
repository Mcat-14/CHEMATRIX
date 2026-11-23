// Searchable formula library.
import { h } from '../dom.js';
import { FORMULAS } from '../../engine/library.js';
import { CONSTANTS } from '../../engine/units.js';
import { ATOMIC_MASS_SOURCE } from '../../engine/elements.js';

export function renderLibrary(view, ctx = {}) {
  const q = h('input', { type: 'search', placeholder: 'Search formulas, e.g. "kelvin", "PV", "Hess"', 'aria-label': 'Search formulas', autocomplete: 'off' });
  const topicSel = h('select', { 'aria-label': 'Filter by topic' }, h('option', { value: '' }, 'All topics'), [...new Set(FORMULAS.map((f) => f.topic))].map((t) => h('option', { value: t }, t)));
  const list = h('div', { class: 'grid grid-2' });
  const count = h('p', { class: 'muted small', 'aria-live': 'polite' });
  const draw = () => {
    const s = q.value.trim().toLowerCase();
    const hits = FORMULAS.filter((f) => (!topicSel.value || f.topic === topicSel.value) && (!s || `${f.name} ${f.equation} ${f.explanation} ${f.topic} ${f.vars.flat().join(' ')}`.toLowerCase().includes(s)));
    count.textContent = `${hits.length} of ${FORMULAS.length} formulas`;
    list.replaceChildren(...hits.map((f) => {
      const d = h('details', { class: 'card formula-item', id: `f-${f.id}`, open: ctx.focus === f.id },
        h('summary', {}, h('span', {}, h('b', {}, f.name), h('br'), h('span', { class: 'muted small' }, f.topic)), h('span', { class: 'tag gray' }, 'Details')),
        h('div', { class: 'eq' }, f.equation),
        h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Symbol'), h('th', {}, 'Meaning'), h('th', {}, 'Units'))), h('tbody', {}, f.vars.map(([a, b, c]) => h('tr', {}, h('td', {}, a), h('td', {}, b), h('td', {}, c)))))),
        h('p', { style: { marginTop: '10px' } }, f.explanation),
        h('p', { class: 'small' }, h('b', {}, 'Conditions and assumptions: '), f.conditions),
        h('p', { class: 'small' }, h('b', {}, 'Example: '), f.example),
        f.tool ? h('a', { class: 'btn btn-secondary btn-small', href: `#/${f.tool}` }, 'Open the calculator') : null);
      return d;
    }));
  };
  q.addEventListener('input', draw);
  topicSel.addEventListener('change', draw);
  view.append(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Formula library'), h('p', {}, 'Every formula used by the calculators, with variables, units, conditions and an example.'))),
    h('div', { class: 'grid grid-2', style: { marginBottom: '8px' } }, q, topicSel), count, list,
    h('div', { class: 'section-title' }, h('h2', {}, 'Constants and data sources')),
    h('div', { class: 'card' }, h('ul', {}, Object.values(CONSTANTS).map((c) => h('li', {}, `${c.name}: ${c.value} ${c.unit} (${c.source})`)), h('li', {}, `Atomic masses: ${ATOMIC_MASS_SOURCE}`))));
  draw();
  if (ctx.focus) requestAnimationFrame(() => document.getElementById(`f-${ctx.focus}`)?.scrollIntoView({ block: 'start' }));
}
