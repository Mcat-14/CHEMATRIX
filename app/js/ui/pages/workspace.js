// Module workspaces: page heading, tool tabs and the active calculator.
import { h } from '../dom.js';
import { renderTool } from '../tool.js';
import { STOICH_TOOLS, REACTION_TOOLS } from '../tools-stoich.js';
import { GAS_TOOLS } from '../tools-gas.js';
import { THERMO_TOOLS, renderEnergyDiagramTool } from '../tools-thermo.js';
import { renderGasExplorer } from './gas-explorer.js';

export const WORKSPACES = {
  stoichiometry: { title: 'Stoichiometry', module: 'Module 1', lead: 'Molar mass, mole conversions, mole ratios, limiting reactants and yield.', tools: STOICH_TOOLS },
  reactions: { title: 'Chemical reactions', module: 'Module 1', lead: 'Balance equations, classify reaction types and predict products.', tools: REACTION_TOOLS },
  'gas-laws': {
    title: 'Gas laws', module: 'Module 2', lead: 'Every gas law with automatic unit and kelvin conversion, plus an interactive graph explorer.',
    tools: [...GAS_TOOLS, { id: 'explorer', path: 'gas-laws/explorer', short: 'Graph explorer', custom: renderGasExplorer }],
  },
  thermochemistry: {
    title: 'Thermochemistry', module: 'Module 3', lead: 'Heat, calorimetry, enthalpy, Hess\'s law, bond energies and energy diagrams.',
    tools: [...THERMO_TOOLS, { id: 'energy-diagram', path: 'thermochemistry/energy-diagram', short: 'Energy diagram', custom: renderEnergyDiagramTool }],
  },
};

export function allTools() {
  return Object.entries(WORKSPACES).flatMap(([ws, w]) => w.tools.map((t) => ({ ...t, workspace: ws, workspaceTitle: w.title })));
}

export function findTool(path) {
  return allTools().find((t) => t.path === path);
}

export function renderWorkspace(view, wsId, toolId, ctx = {}) {
  const ws = WORKSPACES[wsId];
  const tool = ws.tools.find((t) => t.id === toolId) || ws.tools[0];
  const head = h('div', { class: 'page-head' }, h('div', {}, h('div', { class: 'crumb' }, ws.module), h('h1', {}, ws.title), h('p', {}, ws.lead)));
  const tabs = h('nav', { class: 'tabs', 'aria-label': `${ws.title} tools` }, ws.tools.map((t) => h('a', { href: `#/${t.path}`, 'aria-current': t === tool ? 'page' : null }, t.short || t.title)));
  const body = h('div');
  view.append(head, tabs, body);
  if (tool.custom) tool.custom(body);
  else renderTool(body, tool, { prefill: ctx.prefill, autorun: !!ctx.prefill });
  // keep the active tab visible on small screens
  requestAnimationFrame(() => tabs.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'center' }));
  return tool;
}
