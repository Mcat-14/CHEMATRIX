// Small DOM helpers. Text is always set with textContent; HTML is only inserted
// through `trusted()` for strings produced by the engine's escaping helpers.
import { esc } from '../engine/errors.js';

export { esc };

/** Create an element. props: attributes/properties; children: nodes or strings (as text). */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v.__trusted ?? esc(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && typeof v !== 'string' && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Mark an engine-produced HTML string as trusted (engine escapes all dynamic text). */
export function trusted(s) {
  return { __trusted: String(s) };
}

/** Element whose inner HTML comes from the engine. */
export function rich(tag, htmlStr, props = {}) {
  return h(tag, { ...props, html: trusted(htmlStr) });
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

const toastRoot = () => document.getElementById('toasts');
export function toast(msg, opts = {}) {
  const root = toastRoot();
  if (!root) return;
  const t = h('div', { class: 'toast', role: 'status' }, h('span', {}, msg));
  if (opts.action) t.append(h('button', { class: 'btn btn-secondary btn-small', onclick: () => { opts.action.run(); t.remove(); } }, opts.action.label));
  root.append(t);
  setTimeout(() => t.remove(), opts.timeout ?? 3500);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
    return true;
  } catch {
    // fallback for browsers without clipboard permission
    const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    toast(ok ? 'Copied to clipboard' : 'Copy failed: select the text and copy it manually');
    return ok;
  }
}

/** Plain text from engine HTML (for clipboard and history summaries). */
export function textOf(htmlStr) {
  const d = document.createElement('div');
  d.innerHTML = String(htmlStr).replace(/<sub>/g, '').replace(/<sup>(-?\d+)<\/sup>/g, '^$1');
  return d.textContent.replace(/\s+/g, ' ').trim();
}

export const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  flask: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 15h9"/>',
  react: '<path d="M4 12h12M12 8l4 4-4 4"/><circle cx="19" cy="12" r="2"/>',
  gas: '<circle cx="7" cy="8" r="2.2"/><circle cx="16" cy="6" r="1.6"/><circle cx="15" cy="15" r="2.6"/><circle cx="7" cy="17" r="1.6"/>',
  states: '<rect x="3" y="4" width="6" height="6" rx="1"/><circle cx="17" cy="7" r="3"/><path d="M4 18c2-2 4 2 6 0s4 2 6 0 3 1 4 0"/>',
  fire: '<path d="M12 3c3 4 6 6 6 10a6 6 0 0 1-12 0c0-2.5 1.5-4 3-5.5 0 2 1 3 2 3 0-3 0-5 1-7.5z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7"/>',
  swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M16 12v5M8 16h2M12 16h2"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
};
export function icon(name, size = 20) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', size);
  s.setAttribute('height', size);
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.8');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || '';
  return s;
}
