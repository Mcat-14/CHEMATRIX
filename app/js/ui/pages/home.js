// Landing page and main dashboard.
import { h, rich } from '../dom.js';
import { listHistory, setSetting, settings } from '../store.js';
import { allTools, WORKSPACES } from './workspace.js';
import { FORMULAS } from '../../engine/library.js';
import { balanceEquation } from '../../engine/equation.js';

export function renderLanding(view, ctx) {
  const demo = balanceEquation('C3H8 + O2 -> CO2 + H2O');
  view.append(
    h('section', { class: 'hero' },
      h('div', {},
        h('div', { class: 'eyebrow' }, 'CHEMATRIX · Calculate. Understand. Explore.'),
        h('h1', {}, 'Chemistry solver for stoichiometry, gas laws and thermochemistry'),
        h('p', {}, 'Every answer comes with the formula, the substitution and each step, so you can check your own working. Install it once and it works without internet.'),
        h('div', { class: 'btn-row' },
          h('a', { class: 'btn btn-primary', href: '#/', onclick: () => setSetting('landingSeen', true).catch(() => {}) }, 'Open the dashboard'),
          ctx.canInstall() ? h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => ctx.install() }, 'Install the app') : h('a', { class: 'btn btn-secondary', href: '#/settings/install' }, 'How to install'))),
      h('div', { class: 'hero-demo', 'aria-label': 'Example result' },
        h('div', { class: 'small', style: { color: '#9fb0c8', marginBottom: '6px' } }, 'Balancer result'),
        rich('div', demo.html, { class: 'eq' }),
        h('dl', {}, h('dt', {}, 'C'), h('dd', {}, '3 = 3'), h('dt', {}, 'H'), h('dd', {}, '8 = 8'), h('dt', {}, 'O'), h('dd', {}, '10 = 6 + 4'), h('dt', {}, 'Method'), h('dd', {}, 'exact algebra, smallest whole numbers')))),
    h('div', { class: 'section-title' }, h('h2', {}, 'Three modules, one workflow')),
    h('div', { class: 'grid grid-3' },
      moduleCard('stoichiometry', 'Stoichiometry and reactions', ['Equation balancer and reaction classifier', 'Molar mass, moles, mole ratios', 'Limiting reactant and percent yield']),
      moduleCard('gas-laws', 'States of matter and gas laws', ['Boyle, Charles, Gay-Lussac, combined, ideal', 'Automatic °C → K and unit conversion', 'Particle simulation and live graphs']),
      moduleCard('thermochemistry', 'Thermochemistry and energy', ['q = mcΔT and calorimetry', 'ΔH from formation data and Hess\'s law', 'Bond energies and energy diagrams'])),
    h('div', { class: 'section-title' }, h('h2', {}, 'Works on your phone, offline')),
    h('div', { class: 'grid grid-3' },
      h('div', { class: 'card' }, h('h3', {}, 'Install without an app store'), h('p', { class: 'muted' }, 'Add it to your home screen from the browser on Android, iPhone, iPad or a computer.')),
      h('div', { class: 'card' }, h('h3', {}, 'No internet needed after the first visit'), h('p', { class: 'muted' }, 'All formulas, data and calculations are stored on your device.')),
      h('div', { class: 'card' }, h('h3', {}, 'No account'), h('p', { class: 'muted' }, 'History, settings and practice progress stay on this device only.'))),
  );
}

function moduleCard(ws, title, items) {
  return h('a', { class: 'card module-card', href: `#/${ws}` }, h('span', { class: 'tag' }, WORKSPACES[ws].module), h('h3', {}, title), h('ul', {}, items.map((i) => h('li', {}, i))));
}

const QUICK = [
  ['reactions/balancer', 'Balance', 'Balance an equation'],
  ['stoichiometry/molar-mass', 'M', 'Molar mass'],
  ['stoichiometry/moles', 'n', 'Mass ↔ moles ↔ particles'],
  ['stoichiometry/limiting', 'LR', 'Limiting reactant'],
  ['gas-laws/ideal', 'PV', 'Ideal gas law'],
  ['gas-laws/combined', 'PVT', 'Combined gas law'],
  ['thermochemistry/heat', 'q', 'q = mcΔT'],
  ['thermochemistry/hess', 'ΔH', "Hess's law"],
];

export async function renderDashboard(view) {
  const search = h('input', { type: 'search', placeholder: 'Search calculators and formulas (e.g. "ideal", "limiting", "ΔH")', 'aria-label': 'Search calculators and formulas', autocomplete: 'off' });
  const results = h('ul', { class: 'search-results', 'aria-live': 'polite' });
  search.addEventListener('input', () => renderSearch(search.value, results));
  view.append(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Dashboard'), h('p', {}, 'Pick a module or a quick calculator. Every tool shows the full solution.'))),
    h('label', { class: 'dash-search' }, search), results,
    h('div', { class: 'section-title' }, h('h2', {}, 'Modules')),
    h('div', { class: 'grid grid-4' },
      wsCard('stoichiometry', 'flask', 'Stoichiometry', 'Molar mass, moles, ratios, yield'),
      wsCard('reactions', 'react', 'Chemical reactions', 'Balance, classify, predict'),
      wsCard('gas-laws', 'gas', 'Gas laws', 'All gas laws + graphs'),
      h('a', { class: 'card module-card', href: '#/states' }, h('span', { class: 'tag' }, 'Module 2'), h('h3', {}, 'States of matter'), h('p', { class: 'muted small' }, 'Particle model explorer')),
      wsCard('thermochemistry', 'fire', 'Thermochemistry', 'Heat, ΔH, Hess, bond energy'),
      h('a', { class: 'card module-card', href: '#/practice' }, h('span', { class: 'tag ok' }, 'Practice'), h('h3', {}, 'Practice mode'), h('p', { class: 'muted small' }, 'Randomised questions with feedback')),
      h('a', { class: 'card module-card', href: '#/formulas' }, h('span', { class: 'tag gray' }, 'Reference'), h('h3', {}, 'Formula library'), h('p', { class: 'muted small' }, `${FORMULAS.length} formulas with examples`)),
      h('a', { class: 'card module-card', href: '#/units' }, h('span', { class: 'tag gray' }, 'Tools'), h('h3', {}, 'Unit converter'), h('p', { class: 'muted small' }, 'Pressure, volume, energy and more'))),
    h('div', { class: 'section-title' }, h('h2', {}, 'Quick calculators')),
    h('div', { class: 'grid grid-4' }, QUICK.map(([p, ic, label]) => h('a', { class: 'card quick', href: `#/${p}` }, h('span', { class: 'ico', 'aria-hidden': 'true' }, ic), h('span', {}, h('b', {}, label))))),
  );
  const recent = h('div', { class: 'grid grid-2' });
  view.append(h('div', { class: 'section-title' }, h('h2', {}, 'Recently used'), h('a', { href: '#/history' }, 'All history')), recent);
  try {
    const hist = (await listHistory()).slice(0, 4);
    if (!hist.length) recent.append(h('p', { class: 'muted' }, 'Your calculations will appear here.'));
    hist.forEach((e) => recent.append(h('a', { class: 'card hist-item', href: `#/${e.tool}?h=${encodeURIComponent(e.id)}` }, h('div', { class: 'top' }, h('b', {}, e.title), h('small', { class: 'muted' }, new Date(e.createdAt).toLocaleDateString())), h('div', { class: 'muted small ans' }, e.summary))));
  } catch {
    recent.append(h('p', { class: 'muted' }, 'History is unavailable in this browser mode.'));
  }
  view.append(h('div', { class: 'section-title' }, h('h2', {}, 'Learning resources')),
    h('div', { class: 'grid grid-3' },
      h('a', { class: 'card', href: '#/formulas' }, h('h3', {}, 'How to read a solution'), h('p', { class: 'muted small' }, 'Each result lists given values, the formula, variable meanings, conversions, substitution, calculation, answer and interpretation.')),
      h('a', { class: 'card', href: '#/settings/checklist' }, h('h3', {}, 'Topic checklist'), h('p', { class: 'muted small' }, 'See which course topics are covered and which still need confirming with your instructor.')),
      h('button', { class: 'card', type: 'button', style: { textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }, onclick: () => document.dispatchEvent(new CustomEvent('cx:walkthrough')) }, h('h3', {}, 'Take the 1-minute tour'), h('p', { class: 'muted small' }, 'Optional. Shows where everything is.'))));
}

function wsCard(ws, ic, title, sub) {
  return h('a', { class: 'card module-card', href: `#/${ws}` }, h('span', { class: 'tag' }, WORKSPACES[ws].module), h('h3', {}, title), h('p', { class: 'muted small' }, sub));
}

export function searchIndex() {
  const tools = allTools().map((t) => ({ title: t.title || t.short, sub: t.workspaceTitle, href: `#/${t.path}`, text: `${t.title} ${t.short} ${t.intro || ''} ${t.workspaceTitle}` }));
  const formulas = FORMULAS.map((f) => ({ title: f.name, sub: `Formula · ${f.equation}`, href: `#/formulas?f=${f.id}`, text: `${f.name} ${f.equation} ${f.topic} ${f.explanation}` }));
  const pages = [
    { title: 'States of matter explorer', sub: 'Module 2', href: '#/states', text: 'solid liquid gas particles states matter' },
    { title: 'Unit converter', sub: 'Tools', href: '#/units', text: 'unit convert pressure volume temperature energy mass' },
    { title: 'Scientific calculator', sub: 'Tools', href: '#/calculator', text: 'calculator log sqrt exponent scientific' },
    { title: 'Practice mode', sub: 'Learn', href: '#/practice', text: 'practice quiz questions test' },
    { title: 'Install the app', sub: 'Settings', href: '#/settings/install', text: 'install offline download android iphone' },
  ];
  return [...tools, ...pages, ...formulas];
}

export function renderSearch(q, list) {
  list.replaceChildren();
  const s = q.trim().toLowerCase();
  if (s.length < 2) return;
  const words = s.split(/\s+/);
  const hits = searchIndex().filter((x) => words.every((w) => x.text.toLowerCase().includes(w))).slice(0, 8);
  if (!hits.length) list.append(h('li', { class: 'muted small' }, 'No matches. Try a different word.'));
  hits.forEach((x) => list.append(h('li', {}, h('a', { href: x.href }, x.title, h('small', {}, x.sub)))));
}

export { settings };
