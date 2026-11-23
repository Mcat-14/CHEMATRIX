// Renders the engine's structured Solution into the standard 9-part layout.
import { h, rich, textOf, copyText, toast } from './dom.js';
import { fmtSf, displaySf } from '../engine/numbers.js';
import { settings } from './store.js';
import { renderSolutionChart } from './charts.js';

export function formatAnswer(a, sfMode = settings().sigfigs) {
  if (a.html !== undefined || a.textValue !== undefined) return { html: a.html ?? a.textValue, text: a.textValue ?? textOf(a.html), sf: null };
  const sf = displaySf(a.ruleSf, sfMode);
  const num = fmtSf(a.value, sf);
  const unit = a.unit ? ` ${a.unit}` : '';
  return { html: `${num}${unit}`, text: `${textOf(num)}${a.unitText ? ' ' + a.unitText : ''}`, sf };
}

function sec(n, title, ...content) {
  return h('section', { class: 'sol-sec' }, h('h3', {}, h('span', { class: 'n' }, String(n)), title), ...content);
}

export function solutionToText(sol) {
  const lines = [`CHEMATRIX – ${sol.title}`, ''];
  if (sol.given.length) { lines.push('Given:'); sol.given.forEach((g) => lines.push(`  ${textOf(g.label)}: ${textOf(g.display)}`)); }
  if (sol.unknown) lines.push(`Find: ${textOf(sol.unknown.label)} (${textOf(sol.unknown.symbol)})`);
  if (sol.formula) lines.push(`Formula: ${textOf(sol.formula)}`);
  if (sol.rearranged) lines.push(`Rearranged: ${textOf(sol.rearranged)}`);
  if (sol.definitions.length) { lines.push('Variables:'); sol.definitions.forEach((d) => lines.push(`  ${textOf(d.symbol)} = ${d.meaning}${d.unit ? ` (${d.unit})` : ''}`)); }
  if (sol.conversions.length) { lines.push('Unit conversions:'); sol.conversions.forEach((c) => lines.push(`  ${textOf(c)}`)); }
  if (sol.substitution) lines.push(`Substitution: ${textOf(sol.substitution)}`);
  if (sol.steps.length) { lines.push('Calculation:'); sol.steps.forEach((s, i) => lines.push(`  ${i + 1}. ${textOf(s.title)}: ${textOf(s.html || (s.lines || []).join('; '))}`)); }
  lines.push('Answer:');
  sol.answers.forEach((a) => lines.push(`  ${a.label}: ${formatAnswer(a).text}`));
  if (sol.interpretation) lines.push(`Interpretation: ${textOf(sol.interpretation)}`);
  if (sol.assumptions.length) { lines.push('Assumptions:'); sol.assumptions.forEach((a) => lines.push(`  - ${a}`)); }
  if (sol.warnings.length) { lines.push('Notes:'); sol.warnings.forEach((a) => lines.push(`  - ${a}`)); }
  return lines.join('\n');
}

export function renderSolution(sol, opts = {}) {
  const sfMode = settings().sigfigs;
  const primary = sol.answers[0];
  const root = h('div', { class: 'solution', 'aria-live': 'polite' });
  root.append(h('div', { class: 'print-head' }, h('b', {}, 'CHEMATRIX solution report'), ' · ', sol.title, ' · ', new Date().toLocaleString()));

  if (primary) {
    const f = formatAnswer(primary, sfMode);
    const box = h('div', { class: 'answer-box' },
      h('div', { class: 'lbl' }, primary.label),
      rich('div', `${primary.symbol ? `${primary.symbol} = ` : ''}${f.html}`, { class: 'val' }));
    if (primary.secondary) box.append(h('div', { class: 'muted' }, primary.secondary));
    const more = sol.answers.slice(1);
    if (more.length) {
      box.append(h('div', { class: 'more' }, more.map((a) => {
        const g = formatAnswer(a, sfMode);
        return rich('div', `<b>${a.label.replace(/</g, '&lt;')}:</b> ${g.html}${a.secondary ? ` <span class="muted">(${a.secondary})</span>` : ''}`);
      })));
    }
    if (f.sf) box.append(h('div', { class: 'sf-note' }, sfMode === 'auto' ? `Rounded to ${f.sf} significant figures (fewest significant figures among the measured inputs). Full precision is kept until the final step.` : `Rounded to ${f.sf} significant figures (your setting).`));
    root.append(box);
  }
  sol.warnings.forEach((w) => root.append(h('div', { class: 'note warn', role: 'note' }, w)));

  let n = 1;
  if (sol.given.length) {
    root.append(sec(n++, 'Given values', h('dl', { class: 'kv' }, sol.given.flatMap((g) => [rich('dt', g.label), rich('dd', `${g.symbol && g.symbol !== g.label ? `${g.symbol} = ` : ''}${g.display}`)]))));
  }
  if (sol.unknown) root.append(sec(n++, 'Required unknown', rich('p', `${sol.unknown.label} (${sol.unknown.symbol})`)));
  if (sol.formula) {
    const f = [rich('div', sol.formula, { class: 'eq' })];
    if (sol.rearranged) f.push(h('div', { class: 'small muted', style: { margin: '6px 0 4px' } }, 'Rearranged for the unknown:'), rich('div', sol.rearranged, { class: 'eq' }));
    root.append(sec(n++, 'Applicable formula', ...f));
  }
  if (sol.definitions.length) {
    root.append(sec(n++, 'Variable definitions', h('dl', { class: 'kv' }, sol.definitions.flatMap((d) => [rich('dt', d.symbol), rich('dd', `${d.meaning.replace(/</g, '&lt;').replace(/&lt;(\/?)(sub|sup)>/g, '<$1$2>')}${d.unit ? ` <span class="muted">(${d.unit})</span>` : ''}`)]))));
  }
  root.append(sec(n++, 'Unit conversions', sol.conversions.length ? h('ul', { class: 'steps' }, sol.conversions.map((c) => rich('li', c))) : h('p', { class: 'muted small' }, 'No unit conversions were needed.')));
  if (sol.substitution) root.append(sec(n++, 'Substitution', rich('div', sol.substitution, { class: 'eq wrap' })));
  if (sol.steps.length) {
    root.append(sec(n++, 'Calculation', h('ol', { class: 'steps' }, sol.steps.map((s) => h('li', {}, rich('b', s.title), s.html ? rich('div', s.html) : null, s.lines ? h('div', {}, s.lines.map((l) => rich('div', l))) : null)))));
  }
  sol.tables.forEach((t) => {
    root.append(h('div', { class: 'table-wrap' }, h('table', {},
      t.caption ? h('caption', { class: 'sr-only' }, t.caption) : null,
      h('thead', {}, h('tr', {}, t.head.map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, t.rows.map((r) => h('tr', {}, r.map((c) => rich('td', c))))))));
  });
  if (primary) {
    root.append(sec(n++, 'Final answer', h('ul', { class: 'steps' }, sol.answers.map((a) => rich('li', `<b>${a.label.replace(/</g, '&lt;')}:</b> <span>${formatAnswer(a, sfMode).html}</span>`)))));
  }
  if (sol.interpretation) root.append(sec(n++, 'Interpretation', rich('div', sol.interpretation, { class: 'note' })));
  if (sol.chart) {
    const box = h('div', { class: 'chart-box' }, h('canvas', { 'aria-label': 'Graph of the gas law relationship through both states', role: 'img' }));
    root.append(sec(n++, 'Graph', box));
    requestAnimationFrame(() => renderSolutionChart(box.querySelector('canvas'), sol.chart));
  }
  if (sol.assumptions.length) root.append(h('details', { class: 'sol-sec' }, h('summary', {}, h('b', {}, 'Assumptions and data sources')), h('ul', { class: 'small' }, sol.assumptions.map((a) => h('li', {}, a)))));

  const actions = h('div', { class: 'sol-actions' },
    h('button', { class: 'btn btn-secondary btn-small', type: 'button', onclick: () => copyText(sol.answers.map((a) => `${a.label}: ${formatAnswer(a).text}`).join('\n')) }, 'Copy answer'),
    h('button', { class: 'btn btn-secondary btn-small', type: 'button', onclick: () => copyText(solutionToText(sol)) }, 'Copy full solution'),
    h('button', { class: 'btn btn-secondary btn-small', type: 'button', onclick: () => printReport() }, 'Save as PDF / Print'));
  if (opts.extraActions) opts.extraActions.forEach((a) => actions.append(a));
  root.append(actions);
  return root;
}

export function printReport() {
  try {
    window.print();
  } catch {
    toast('Printing is not available in this browser. Use "Copy full solution" instead.');
  }
}
