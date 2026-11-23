// Calculation history stored locally (IndexedDB).
import { h, copyText, toast } from '../dom.js';
import { listHistory, del, clearStore, storageMode } from '../store.js';

export async function renderHistory(view) {
  const list = h('div', { class: 'grid grid-2' });
  const q = h('input', { type: 'search', placeholder: 'Filter history', 'aria-label': 'Filter history', autocomplete: 'off' });
  let items = [];
  const draw = () => {
    const s = q.value.trim().toLowerCase();
    const shown = items.filter((e) => !s || `${e.title} ${e.summary}`.toLowerCase().includes(s));
    list.replaceChildren();
    if (!items.length) { list.append(h('div', { class: 'card output-empty' }, h('p', {}, 'No saved calculations yet.'), h('a', { class: 'btn btn-primary', href: '#/' }, 'Go to the dashboard'))); return; }
    if (!shown.length) list.append(h('p', { class: 'muted' }, 'No matches.'));
    shown.forEach((e) => {
      const card = h('div', { class: 'card hist-item' },
        h('div', { class: 'top' }, h('b', {}, e.title), h('small', { class: 'muted' }, new Date(e.createdAt).toLocaleString())),
        h('div', { class: 'ans' }, e.summary),
        h('div', { class: 'btn-row' },
          h('a', { class: 'btn btn-secondary btn-small', href: `#/${e.tool}?h=${encodeURIComponent(e.id)}` }, 'Reopen solution'),
          h('button', { class: 'btn btn-secondary btn-small', type: 'button', onclick: () => copyText(e.summary) }, 'Copy result'),
          h('button', { class: 'btn btn-secondary btn-small btn-danger', type: 'button', onclick: async () => {
            try { await del('history', e.id); items = items.filter((x) => x.id !== e.id); draw(); toast('Entry deleted'); } catch { toast('Could not delete the entry.'); }
          } }, 'Delete')));
      list.append(card);
    });
  };
  q.addEventListener('input', draw);
  view.append(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Calculation history'), h('p', {}, 'Saved on this device only. Reopen any calculation to see its full step-by-step solution again.')),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-secondary', type: 'button', onclick: async () => {
        if (!items.length) return;
        if (!confirm('Delete all saved calculations on this device?')) return;
        try { await clearStore('history'); items = []; draw(); toast('History cleared'); } catch { toast('Could not clear history.'); }
      } }, 'Clear history'))),
    q, h('div', { style: { height: '12px' } }), list);
  if (storageMode() !== 'idb') view.append(h('p', { class: 'note warn', style: { marginTop: '12px' } }, storageMode() === 'local' ? 'Your browser blocked IndexedDB, so history is kept in simpler local storage.' : 'Storage is blocked in this browser mode (for example private browsing). History will be lost when you close the app.'));
  try { items = await listHistory(); } catch { toast('History could not be loaded.'); }
  draw();
}
