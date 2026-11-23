// CHEMATRIX application shell: routing, theme, connectivity, install and updates.
import { h, clear, toast, $, $$ } from './ui/dom.js';
import { loadSettings, settings, setSetting, get, requestPersistence } from './ui/store.js';
import { renderLanding, renderDashboard, renderSearch } from './ui/pages/home.js';
import { WORKSPACES, renderWorkspace } from './ui/pages/workspace.js';
import { renderStates } from './ui/pages/states.js';
import { renderLibrary } from './ui/pages/library.js';
import { renderUnits } from './ui/pages/units.js';
import { renderCalculator } from './ui/pages/calculator.js';
import { renderPractice } from './ui/pages/practice.js';
import { renderHistory } from './ui/pages/history.js';
import { renderSettings } from './ui/pages/settings.js';
import { APP_VERSION } from './ui/version.js';

const view = document.getElementById('view');
let cleanup = null;
let deferredPrompt = null;
let swReg = null;
let swStatus = 'Offline support is starting…';

/* ---------------- theme ---------------- */
function applyTheme() {
  const t = settings().theme;
  const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const btn = $('#theme-btn');
  if (btn) btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/* ---------------- connectivity ---------------- */
function updateNet() {
  const online = navigator.onLine;
  const pill = $('#net');
  pill.dataset.state = online ? 'online' : 'offline';
  pill.textContent = online ? 'Online' : 'Offline';
  pill.title = online ? 'Connected. The app works offline too.' : 'No connection. All calculators keep working.';
  const banner = $('#offline-banner');
  banner.hidden = online;
}
window.addEventListener('online', () => { updateNet(); toast('Back online'); if (swReg) swReg.update().catch(() => {}); });
window.addEventListener('offline', () => { updateNet(); toast('You are offline. Everything still works.'); });

/* ---------------- install ---------------- */
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('#install-btn').hidden = false;
});
window.addEventListener('appinstalled', () => { deferredPrompt = null; $('#install-btn').hidden = true; toast('CHEMATRIX installed'); });
async function install() {
  if (!deferredPrompt) { location.hash = '#/settings/install'; return; }
  deferredPrompt.prompt();
  try { await deferredPrompt.userChoice; } catch { /* dismissed */ }
  deferredPrompt = null;
  $('#install-btn').hidden = true;
}

/* ---------------- service worker ---------------- */
async function registerSW() {
  if (!('serviceWorker' in navigator)) { swStatus = 'This browser does not support offline mode.'; return; }
  if (location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) {
    swStatus = 'Offline mode needs HTTPS (or localhost). It is off on this address.';
    return;
  }
  try {
    swReg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    swStatus = navigator.serviceWorker.controller ? 'Saved for offline use.' : 'Downloading for offline use…';
    const watch = (w) => {
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            toast('An update is ready.', { timeout: 15000, action: { label: 'Reload', run: () => w.postMessage({ type: 'SKIP_WAITING' }) } });
          } else {
            swStatus = 'Saved for offline use.';
            toast('CHEMATRIX is saved for offline use.');
          }
        }
      });
    };
    if (swReg.waiting && navigator.serviceWorker.controller) {
      toast('An update is ready.', { timeout: 15000, action: { label: 'Reload', run: () => swReg.waiting && swReg.waiting.postMessage({ type: 'SKIP_WAITING' }) } });
    }
    watch(swReg.installing);
    swReg.addEventListener('updatefound', () => watch(swReg.installing));
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      // the new version only takes over when the user pressed "Reload" on the update toast
      location.reload();
    });
  } catch (e) {
    swStatus = 'Offline mode could not be enabled in this browser.';
    console.warn('Service worker registration failed', e);
  }
}
async function checkUpdate() {
  if (!swReg) { toast(swStatus); return; }
  if (!navigator.onLine) { toast('You are offline. Connect to the internet to check for updates.'); return; }
  try { await swReg.update(); toast(swReg.waiting || swReg.installing ? 'Downloading the update…' : `You have the latest version (${APP_VERSION}).`); } catch { toast('Could not check for updates right now.'); }
}

const ctx = {
  canInstall: () => !!deferredPrompt,
  install,
  isStandalone,
  swState: () => swStatus,
  checkUpdate,
  applyTheme,
};

/* ---------------- routing ---------------- */
function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query || '');
  return { parts, params };
}

const TITLES = { states: 'States of matter', formulas: 'Formula library', units: 'Unit converter', calculator: 'Scientific calculator', practice: 'Practice', history: 'History', settings: 'Settings', welcome: 'Welcome' };

async function route() {
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  const { parts, params } = parseHash();
  const [a, b] = parts;
  clear(view);
  closeSheet();
  let title = 'Dashboard';
  let navKey = a || 'home';
  try {
    if (!a) {
      if (!settings().landingSeen && !isStandalone()) { location.replace('#/welcome'); return; }
      await renderDashboard(view);
      if (!settings().walkthroughDone) setTimeout(() => { if (!$('#tour').open) walkthrough(); }, 500);
    } else if (a === 'welcome') {
      renderLanding(view, ctx);
      setSetting('landingSeen', true).catch(() => {});
      title = 'Welcome';
      navKey = 'home';
    } else if (WORKSPACES[a]) {
      let prefill;
      const hid = params.get('h');
      if (hid) {
        try {
          const entry = await get('history', hid);
          if (entry && entry.tool.startsWith(a)) prefill = entry.inputs;
          else toast('That history entry was not found.');
        } catch { toast('History is unavailable.'); }
      }
      const tool = renderWorkspace(view, a, b, { prefill });
      title = `${tool.short || tool.title} · ${WORKSPACES[a].title}`;
    } else if (a === 'states') { cleanup = renderStates(view); title = TITLES.states; }
    else if (a === 'formulas') { renderLibrary(view, { focus: params.get('f') }); title = TITLES.formulas; }
    else if (a === 'units') { renderUnits(view); title = TITLES.units; }
    else if (a === 'calculator') { renderCalculator(view); title = TITLES.calculator; }
    else if (a === 'practice') { renderPractice(view); title = TITLES.practice; }
    else if (a === 'history') { await renderHistory(view); title = TITLES.history; }
    else if (a === 'settings') { renderSettings(view, b, ctx); title = TITLES.settings; }
    else {
      view.append(h('div', { class: 'card output-empty' }, h('h1', {}, 'Page not found'), h('p', {}, 'That page does not exist.'), h('a', { class: 'btn btn-primary', href: '#/' }, 'Go to the dashboard')));
      title = 'Not found';
    }
  } catch (e) {
    console.error(e);
    clear(view);
    view.append(h('div', { class: 'error-box', role: 'alert' }, h('b', {}, 'This page could not be shown. '), 'Try reloading the app. Your saved data is not affected.'));
  }
  document.title = `${title} · CHEMATRIX`;
  $$('[data-nav]').forEach((el) => {
    const k = el.dataset.nav;
    const active = k === navKey || (k === 'stoichiometry' && navKey === 'reactions' && el.closest('.bottom-nav'));
    if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
}

/* ---------------- mobile "more" sheet ---------------- */
function openSheet() { $('#sheet').classList.add('open'); $('#sheet-bg').classList.add('open'); $('#sheet').removeAttribute('inert'); $('#more-btn').setAttribute('aria-expanded', 'true'); $('#sheet a')?.focus(); }
function closeSheet() { $('#sheet').classList.remove('open'); $('#sheet-bg').classList.remove('open'); $('#sheet').setAttribute('inert', ''); $('#more-btn')?.setAttribute('aria-expanded', 'false'); }

/* ---------------- optional walkthrough ---------------- */
const TOUR = [
  ['Welcome to CHEMATRIX', 'Solve chemistry problems and see every step. This short tour is optional; skip it any time.'],
  ['Pick a module', 'Stoichiometry, Reactions, Gas laws and Thermochemistry each have several calculators. On a phone, use the bar at the bottom; on a computer, the menu on the left.'],
  ['Enter values, press Calculate', 'Choose what to solve for, type your numbers and pick units. Celsius is converted to kelvin for you. "Load example" fills in a sample problem.'],
  ['Read the solution', 'You get the formula, variable meanings, conversions, substitution, calculation, answer and an explanation. Copy it or save it as a PDF.'],
  ['Works offline', 'Install the app from Settings → Install. After the first visit, everything works without internet, and your history stays on this device.'],
];
function walkthrough() {
  const dlg = $('#tour');
  let i = 0;
  const draw = () => {
    const [t, p] = TOUR[i];
    dlg.replaceChildren(h('div', { class: 'dlg' }, h('h2', { id: 'tour-title' }, t), h('p', {}, p),
      h('div', { class: 'step-dots', 'aria-hidden': 'true' }, TOUR.map((_, j) => h('span', { class: j === i ? 'on' : '' }))),
      h('div', { class: 'btn-row', style: { justifyContent: 'space-between' } },
        h('button', { class: 'btn btn-secondary', type: 'button', onclick: done }, 'Skip tour'),
        h('div', { class: 'btn-row' },
          i > 0 ? h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => { i--; draw(); } }, 'Back') : null,
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { if (i < TOUR.length - 1) { i++; draw(); } else done(); } }, i < TOUR.length - 1 ? 'Next' : 'Start using CHEMATRIX')))));
  };
  const done = () => { if (dlg.open) dlg.close(); };
  setSetting('walkthroughDone', true).catch(() => {}); // shown once automatically; available again in Settings
  draw();
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
}
document.addEventListener('cx:walkthrough', walkthrough);

/* ---------------- boot ---------------- */
async function boot() {
  await loadSettings();
  applyTheme();
  updateNet();
  $('#theme-btn').addEventListener('click', async () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    try { await setSetting('theme', dark ? 'light' : 'dark'); } catch { /* session only */ }
    applyTheme();
  });
  $('#install-btn').addEventListener('click', install);
  $('#more-btn').addEventListener('click', () => ($('#sheet').classList.contains('open') ? closeSheet() : openSheet()));
  $('#sheet-bg').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  const topSearch = $('#top-search');
  const topResults = $('#top-results');
  topSearch.addEventListener('input', () => renderSearch(topSearch.value, topResults));
  topSearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = topResults.querySelector('a'); if (a) { location.hash = a.getAttribute('href'); topSearch.value = ''; topResults.replaceChildren(); } } });
  topResults.addEventListener('click', () => { topSearch.value = ''; setTimeout(() => topResults.replaceChildren(), 0); });
  window.addEventListener('hashchange', route);
  await route();
  registerSW();
  requestPersistence();
}
boot();
