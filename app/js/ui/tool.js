// Generic calculator view: input form on the left, structured solution on the right.
// Every calculator in the app is defined declaratively (fields + compute function).
import { h, clear, toast } from './dom.js';
import { ChemError, esc } from '../engine/errors.js';
import { UNITS } from '../engine/units.js';
import { renderSolution, formatAnswer } from './solution-view.js';
import { addHistory, settings } from './store.js';

const uid = (() => { let i = 0; return (p) => `${p}-${++i}`; })();

function unitOptions(u) {
  if (Array.isArray(u)) return u;
  return Object.entries(UNITS[u].units).map(([k, v]) => [k, v.label]);
}

function buildField(f, state, onChange) {
  const id = uid(f.key);
  const wrap = h('div', { class: 'field', 'data-key': f.key });
  const hintId = f.hint ? `${id}-hint` : null;
  if (f.type === 'num') {
    const input = h('input', { id, type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', placeholder: f.placeholder || '', 'aria-describedby': hintId });
    const cur = state[f.key];
    input.value = cur && typeof cur === 'object' ? cur.value ?? '' : cur ?? '';
    input.addEventListener('input', onChange);
    wrap.append(h('label', { for: id }, f.label));
    if (f.units) {
      const sel = h('select', { 'aria-label': `${f.label} unit` }, unitOptions(f.units).map(([v, l]) => h('option', { value: v }, l)));
      sel.value = (cur && cur.unit) || f.unit || unitOptions(f.units)[0][0];
      sel.addEventListener('change', onChange);
      wrap.append(h('div', { class: 'with-unit' }, input, sel));
      wrap._get = () => ({ value: input.value.trim(), unit: sel.value });
      wrap._set = (v) => { input.value = v?.value ?? ''; if (v?.unit) sel.value = v.unit; };
    } else {
      wrap.append(input);
      wrap._get = () => input.value.trim();
      wrap._set = (v) => { input.value = (v && typeof v === 'object' ? v.value : v) ?? ''; };
    }
  } else if (f.type === 'text') {
    const input = h(f.multiline ? 'textarea' : 'input', { id, type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: f.placeholder || '', class: f.mono ? 'mono' : null, 'aria-describedby': hintId });
    input.value = state[f.key] ?? '';
    input.addEventListener('input', onChange);
    wrap.append(h('label', { for: id }, f.label), input);
    if (f.examples) {
      wrap.append(h('div', { class: 'chips', 'aria-label': 'Examples' }, f.examples.map((ex) => h('button', { type: 'button', class: 'chip', onclick: () => { input.value = ex; onChange(); input.focus(); } }, ex))));
    }
    wrap._get = () => input.value.trim();
    wrap._set = (v) => { input.value = v ?? ''; };
  } else if (f.type === 'select') {
    const sel = h('select', { id }, f.options.map(([v, l]) => h('option', { value: v }, l)));
    sel.value = state[f.key] ?? f.default ?? f.options[0][0];
    sel.addEventListener('change', onChange);
    wrap.append(h('label', { for: id }, f.label), sel);
    wrap._get = () => sel.value;
    wrap._set = (v) => { if (v != null) sel.value = v; };
  } else if (f.type === 'seg') {
    const name = uid('seg');
    const fs = h('fieldset', { class: 'seg', style: { border: 0, padding: 0, margin: 0 } }, h('legend', { class: 'label', style: { padding: 0, marginBottom: '6px', fontWeight: 600, fontSize: '.9rem' } }, f.label));
    const cur = state[f.key] ?? f.default ?? f.options[0][0];
    f.options.forEach(([v, l]) => {
      const r = h('input', { type: 'radio', name, value: v });
      r.checked = v === cur;
      r.addEventListener('change', onChange);
      fs.append(h('label', {}, r, h('span', {}, l)));
    });
    wrap.append(fs);
    wrap._get = () => (fs.querySelector('input:checked') || {}).value;
    wrap._set = (v) => fs.querySelectorAll('input').forEach((r) => { r.checked = r.value === v; });
  } else if (f.type === 'rows') {
    const list = h('div', { class: 'rows' });
    const addRow = (data = {}) => {
      if (f.max && list.children.length >= f.max) { toast(`At most ${f.max} rows.`); return; }
      const fields = f.columns.map((c) => {
        let ctl;
        if (c.type === 'select') {
          ctl = h('select', { 'data-col': c.key }, c.options.map(([v, l]) => h('option', { value: v }, l)));
          ctl.value = data[c.key] ?? c.default ?? c.options[0][0];
        } else {
          ctl = h('input', { 'data-col': c.key, type: 'text', inputmode: c.type === 'num' ? 'decimal' : 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: c.placeholder || '' });
          ctl.value = data[c.key] ?? '';
        }
        ctl.addEventListener('input', onChange);
        return h('label', { style: c.wide ? { gridColumn: '1 / -1' } : null }, c.label, ctl);
      });
      const row = h('div', { class: 'row-item' }, h('div', { class: 'row-fields' }, fields),
        h('button', { type: 'button', class: 'btn btn-secondary btn-small rm', onclick: () => { if (list.children.length > (f.min ?? 1)) { row.remove(); onChange(); } else toast(`Keep at least ${f.min ?? 1}.`); } }, 'Remove'));
      list.append(row);
    };
    const initial = state[f.key] || f.defaultRows || [{}];
    initial.forEach(addRow);
    wrap.append(h('div', { class: 'label' }, f.label), list, h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => { addRow(); onChange(); } }, f.addLabel || 'Add row'));
    wrap._get = () => [...list.children].map((row) => Object.fromEntries([...row.querySelectorAll('[data-col]')].map((c) => [c.dataset.col, c.value.trim()])));
    wrap._set = (rows) => { clear(list); (rows && rows.length ? rows : (f.min === 0 ? [] : [{}])).forEach(addRow); };
  } else if (f.type === 'html') {
    wrap.append(f.render());
    wrap._get = () => undefined;
    wrap._set = () => {};
  }
  if (f.hint) wrap.append(h('div', { class: 'hint', id: hintId }, f.hint));
  wrap.append(h('div', { class: 'err-msg', 'aria-live': 'polite' }));
  return wrap;
}

/**
 * Render a tool into `container`.
 * tool: { path, title, intro, fields, compute(values) -> Solution, example, sideInfo? }
 */
export function renderTool(container, tool, opts = {}) {
  const state = { ...(tool.defaults || {}), ...(opts.prefill || {}) };
  const out = h('div', { class: 'card output', tabindex: '-1' });
  const fieldEls = [];
  const values = () => Object.fromEntries(fieldEls.filter((w) => w._get).map((w) => [w.dataset.key, w._get()]));
  const refreshVisibility = () => {
    const v = values();
    tool.fields.forEach((f, i) => { if (f.showIf) fieldEls[i].hidden = !f.showIf(v); });
  };
  const onChange = () => refreshVisibility();
  tool.fields.forEach((f) => fieldEls.push(buildField(f, state, onChange)));

  const showEmpty = () => {
    clear(out);
    out.append(h('div', { class: 'output-empty' }, h('div', { class: 'big' }, tool.emptyIcon || '= ?'), h('p', {}, 'Enter your values and press Calculate. The full step-by-step solution appears here.'), tool.sideInfo ? tool.sideInfo() : null));
  };

  const run = async (save = true) => {
    fieldEls.forEach((w) => { w.classList.remove('err'); w.querySelector('.err-msg').textContent = ''; });
    const v = values();
    // only pass visible fields
    tool.fields.forEach((f, i) => { if (fieldEls[i].hidden) delete v[f.key]; });
    clear(out);
    let sol;
    try {
      sol = tool.compute(v);
    } catch (e) {
      const known = e instanceof ChemError;
      if (!known) console.error(e);
      const msg = known ? e.message : 'Something went wrong in this calculation. Check the inputs and try again.';
      out.append(h('div', { class: 'error-box', role: 'alert' }, h('b', {}, 'Cannot calculate yet. '), msg));
      if (known && e.field) {
        const w = fieldEls.find((x) => x.dataset.key === e.field);
        if (w) { w.classList.add('err'); w.querySelector('.err-msg').textContent = msg; }
      }
      if (tool.onError) tool.onError(e, out, v);
      return;
    }
    const view = renderSolution(sol, { extraActions: tool.extraActions ? tool.extraActions(sol) : null });
    out.append(view);
    if (tool.after) tool.after(sol, out, v);
    if (window.matchMedia('(max-width: 899px)').matches) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (save && settings().saveHistory !== false) {
      const a = sol.answers[0];
      try {
        await addHistory({ tool: tool.path, title: tool.title, inputs: v, summary: a ? `${a.label}: ${formatAnswer(a).text}` : sol.title });
      } catch {
        toast('This result could not be saved to history (storage unavailable). The calculation itself is fine.');
      }
    }
  };

  const form = h('form', { class: 'card inputs', novalidate: true, onsubmit: (e) => { e.preventDefault(); run(); } },
    h('h2', {}, tool.title),
    tool.intro ? h('p', { class: 'intro' }, tool.intro) : null,
    fieldEls,
    h('div', { class: 'btn-row' },
      h('button', { type: 'submit', class: 'btn btn-primary' }, tool.submitLabel || 'Calculate'),
      tool.example ? h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => { setValues(tool.example); run(false); } }, 'Load example') : null,
      h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => { setValues(tool.blank || {}); showEmpty(); } }, 'Clear')));

  function setValues(vals) {
    tool.fields.forEach((f, i) => fieldEls[i]._set(vals[f.key] ?? (f.type === 'seg' || f.type === 'select' ? f.default ?? f.options[0][0] : f.type === 'rows' ? f.defaultRows : '')));
    refreshVisibility();
  }

  clear(container);
  container.append(h('div', { class: 'calc' }, form, out));
  refreshVisibility();
  showEmpty();
  if (opts.prefill && opts.autorun) run(false);
  return { run, setValues };
}

export { esc };
