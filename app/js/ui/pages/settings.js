// Settings, installation guide, topic checklist and about.
import { h, toast } from '../dom.js';
import { settings, setSetting, clearAll, storageMode } from '../store.js';
import { TOPIC_CHECKLIST } from '../../engine/library.js';
import { APP_VERSION } from '../version.js';

export function renderSettings(view, section, ctx) {
  const tabs = [['', 'Settings'], ['install', 'Install and offline'], ['checklist', 'Topic checklist'], ['about', 'About']];
  view.append(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Settings and about'))),
    h('nav', { class: 'tabs', 'aria-label': 'Settings sections' }, tabs.map(([k, l]) => h('a', { href: `#/settings${k ? '/' + k : ''}`, 'aria-current': (section || '') === k ? 'page' : null }, l))));
  const body = h('div');
  view.append(body);
  if (section === 'install') return installSection(body, ctx);
  if (section === 'checklist') return checklistSection(body);
  if (section === 'about') return aboutSection(body);
  return mainSection(body, ctx);
}

function mainSection(body, ctx) {
  const s = settings();
  const theme = h('select', { id: 's-theme' }, h('option', { value: 'system' }, 'Match device'), h('option', { value: 'light' }, 'Light'), h('option', { value: 'dark' }, 'Dark'));
  theme.value = s.theme;
  theme.addEventListener('change', async () => { await save('theme', theme.value); ctx.applyTheme(); });
  const sf = h('select', { id: 's-sf' }, h('option', { value: 'auto' }, 'Automatic (significant-figure rules)'), ...[2, 3, 4, 5, 6].map((n) => h('option', { value: String(n) }, `Always ${n} significant figures`)));
  sf.value = String(s.sigfigs);
  sf.addEventListener('change', () => save('sigfigs', sf.value === 'auto' ? 'auto' : Number(sf.value)));
  const hist = h('input', { type: 'checkbox', id: 's-hist', checked: s.saveHistory !== false, style: { width: '22px', height: '22px' } });
  hist.addEventListener('change', () => save('saveHistory', hist.checked));
  body.append(h('div', { class: 'grid grid-2' },
    h('div', { class: 'card' }, h('h2', {}, 'Display'),
      h('div', { class: 'field' }, h('label', { for: 's-theme' }, 'Theme'), theme),
      h('div', { class: 'field' }, h('label', { for: 's-sf' }, 'Rounding of final answers'), sf, h('div', { class: 'hint' }, 'Calculations always keep full precision internally; only the displayed answer is rounded.'))),
    h('div', { class: 'card' }, h('h2', {}, 'Data on this device'),
      h('div', { class: 'field' }, h('label', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, hist, 'Save calculations to history')),
      h('p', { class: 'small muted' }, `Storage: ${storageMode() === 'idb' ? 'IndexedDB (persistent)' : storageMode() === 'local' ? 'local storage (fallback)' : 'memory only (storage blocked)'}. Nothing is sent to a server.`),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => document.dispatchEvent(new CustomEvent('cx:walkthrough')) }, 'Show the tour again'),
        h('button', { class: 'btn btn-secondary btn-danger', type: 'button', onclick: async () => {
          if (!confirm('Delete all history, practice progress and settings stored by CHEMATRIX on this device? The app itself stays installed.')) return;
          try { await clearAll(); toast('All local data cleared'); ctx.applyTheme(); location.hash = '#/'; } catch { toast('Could not clear data.'); }
        } }, 'Clear all stored data')))));
}

async function save(k, v) {
  try { await setSetting(k, v); toast('Saved'); } catch { toast('Setting applied for this session only (storage unavailable).'); }
}

function installSection(body, ctx) {
  const status = h('div', { class: 'card' }, h('h2', {}, 'Status on this device'),
    h('ul', {},
      h('li', {}, ctx.isStandalone() ? 'Running as an installed app.' : 'Running in a browser tab.'),
      h('li', {}, ctx.swState()),
      h('li', {}, navigator.onLine ? 'You are online.' : 'You are offline. Everything below still works.')),
    ctx.canInstall() ? h('button', { class: 'btn btn-primary', type: 'button', onclick: () => ctx.install() }, 'Install CHEMATRIX') : null,
    h('button', { class: 'btn btn-secondary', type: 'button', style: { marginLeft: ctx.canInstall() ? '8px' : 0 }, onclick: () => ctx.checkUpdate() }, 'Check for updates'));
  const guide = (title, steps) => h('div', { class: 'card' }, h('h3', {}, title), h('ol', {}, steps.map((s) => h('li', {}, s))));
  body.append(status, h('div', { class: 'section-title' }, h('h2', {}, 'Install guides')),
    h('div', { class: 'grid grid-3' },
      guide('Android (Chrome)', ['Open the CHEMATRIX link in Chrome.', 'Tap "Install app" when it appears, or open the ⋮ menu and choose "Add to Home screen" / "Install app".', 'Open CHEMATRIX from your home screen. It works offline from now on.']),
      guide('iPhone and iPad (Safari)', ['Open the link in Safari (other iOS browsers may not offer installation).', 'Tap the Share button (square with an arrow).', 'Choose "Add to Home Screen", then "Add".', 'Open it from the home screen once while online so everything is saved for offline use.']),
      guide('Windows, Mac, Chromebook', ['Open the link in Chrome or Edge.', 'Click the install icon at the right of the address bar, or the "Install the app" button on the welcome page.', 'CHEMATRIX opens in its own window and appears in your apps list.'])),
    h('div', { class: 'section-title' }, h('h2', {}, 'What works offline')),
    h('div', { class: 'card' }, h('p', {}, 'After the first visit has finished loading, everything works without internet: all calculators, the balancer and classifier, step-by-step solutions, graphs, the particle simulation, the formula library, unit converter, scientific calculator, practice mode and history.'),
      h('p', { class: 'small muted' }, 'Internet is needed only for the first download and for receiving updates. If you clear your browser\'s site data, open the app once online to download it again.')));
}

function checklistSection(body) {
  body.append(h('div', { class: 'note' }, 'This checklist is configurable (app/js/engine/library.js). Items marked "To confirm" are not implemented and should be checked against your instructor\'s topic list.'),
    ...TOPIC_CHECKLIST.map((m) => h('div', { class: 'card', style: { marginTop: '14px' } }, h('h2', {}, m.module), h('ul', { style: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' } },
      m.items.map(([label, path, done]) => h('li', { style: { display: 'flex', gap: '10px', alignItems: 'baseline', justifyContent: 'space-between' } },
        path ? h('a', { href: `#/${path}` }, label) : h('span', {}, label),
        h('span', { class: `tag ${done ? 'ok' : 'warn'}` }, done ? 'Covered' : 'To confirm')))))));
}

function aboutSection(body) {
  body.append(h('div', { class: 'card' }, h('h2', {}, 'CHEMATRIX'), h('p', {}, 'Calculate. Understand. Explore.'),
    h('p', {}, `Version ${APP_VERSION}. A chemistry solver and learning app for stoichiometry, gas laws and thermochemistry.`),
    h('p', {}, 'All answers come from a deterministic calculation engine (no AI-generated numbers), verified by automated tests with independently worked expected values.'),
    h('h3', {}, 'Data sources'),
    h('ul', { class: 'small' },
      h('li', {}, 'Atomic masses: IUPAC CIAAW abridged standard atomic weights (2021).'),
      h('li', {}, "Avogadro's constant, gas constant: 2019 SI / CODATA 2018 exact values."),
      h('li', {}, 'Standard enthalpies of formation: CRC Handbook of Chemistry and Physics (298.15 K); see also OpenStax Chemistry 2e Appendix G.'),
      h('li', {}, 'Bond energies and specific heats: typical general-chemistry values (OpenStax Chemistry 2e). Editable in the app.'),
      h('li', {}, 'Solubility rules, activity series, polyatomic ions: standard introductory chemistry tables.')),
    h('h3', {}, 'Privacy'), h('p', { class: 'small' }, 'No account, no tracking, no data sent anywhere. History and settings are stored only in this browser.'),
    h('h3', {}, 'Credits'), h('p', { class: 'small' }, 'Charts: Chart.js (MIT). Font: Geist and Geist Mono (SIL Open Font License).')));
}
