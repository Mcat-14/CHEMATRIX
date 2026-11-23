// States of matter explorer with an interactive particle model.
import { h } from '../dom.js';
import { particleSim } from '../charts.js';

const STATES = {
  solid: {
    name: 'Solid', arrangement: 'Regular, fixed pattern (lattice)', spacing: 'Very close together', movement: 'Vibrate about fixed positions',
    shape: 'Definite shape', volume: 'Definite volume', compress: 'Practically incompressible', example: 'Ice, iron, salt',
  },
  liquid: {
    name: 'Liquid', arrangement: 'Random, but particles stay in contact', spacing: 'Close together', movement: 'Slide past one another',
    shape: 'Takes the shape of its container', volume: 'Definite volume', compress: 'Very slightly compressible', example: 'Water, ethanol, mercury',
  },
  gas: {
    name: 'Gas', arrangement: 'Random, no pattern', spacing: 'Far apart (mostly empty space)', movement: 'Fast, random, straight lines between collisions',
    shape: 'Fills its container', volume: 'Takes the volume of its container', compress: 'Easily compressed', example: 'Air, steam, CO₂',
  },
};
const ROWS = [['arrangement', 'Particle arrangement'], ['spacing', 'Particle spacing'], ['movement', 'Particle movement'], ['shape', 'Shape'], ['volume', 'Volume'], ['compress', 'Compressibility'], ['example', 'Examples']];

export function renderStates(view) {
  let current = 'solid';
  const canvas = h('canvas', { class: 'sim-canvas', role: 'img', 'aria-label': 'Animated particle model of a solid' });
  const info = h('dl', { class: 'kv', 'aria-live': 'polite' });
  const btns = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'State of matter' });
  const temp = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: '0.4', id: 'st-temp' });
  const pause = h('button', { class: 'btn btn-secondary btn-small', type: 'button' }, 'Pause animation');
  let sim;
  const showInfo = () => {
    const s = STATES[current];
    info.replaceChildren(...ROWS.flatMap(([k, l]) => [h('dt', {}, l), h('dd', {}, s[k])]));
    canvas.setAttribute('aria-label', `Animated particle model of a ${s.name.toLowerCase()}: ${s.arrangement.toLowerCase()}, ${s.movement.toLowerCase()}`);
  };
  Object.entries(STATES).forEach(([k, s]) => {
    const r = h('input', { type: 'radio', name: 'state', value: k, checked: k === current });
    r.addEventListener('change', () => { current = k; sim.setState(k); showInfo(); });
    btns.append(h('label', {}, r, h('span', {}, s.name)));
  });
  temp.addEventListener('input', () => sim.setTemp(Number(temp.value)));
  pause.addEventListener('click', () => { pause.textContent = sim.toggle() ? 'Pause animation' : 'Play animation'; });

  view.append(
    h('div', { class: 'page-head' }, h('div', {}, h('div', { class: 'crumb' }, 'Module 2'), h('h1', {}, 'States of matter explorer'), h('p', {}, 'Compare how particles are arranged and how they move in solids, liquids and gases.'))),
    h('div', { class: 'calc' },
      h('div', { class: 'card inputs' }, h('h2', {}, 'Particle model'), btns,
        h('div', { class: 'field', style: { marginTop: '14px' } }, h('label', { for: 'st-temp' }, 'Temperature (particle energy)'), temp, h('div', { class: 'hint' }, 'Higher temperature means faster particles (greater average kinetic energy).')),
        pause),
      h('div', { class: 'card' }, canvas, h('div', { style: { marginTop: '14px' } }, info))),
    h('div', { class: 'section-title' }, h('h2', {}, 'Side-by-side comparison')),
    h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Property'), ...Object.values(STATES).map((s) => h('th', { scope: 'col' }, s.name)))),
      h('tbody', {}, ROWS.map(([k, l]) => h('tr', {}, h('th', { scope: 'row' }, l), ...Object.values(STATES).map((s) => h('td', {}, s[k]))))))),
    h('div', { class: 'section-title' }, h('h2', {}, 'Changes of state')),
    h('div', { class: 'grid grid-3' },
      h('div', { class: 'card' }, h('h3', {}, 'Energy absorbed (endothermic)'), h('p', { class: 'muted' }, 'Melting (s → l), vaporisation (l → g), sublimation (s → g). Particles gain energy to overcome attractions.')),
      h('div', { class: 'card' }, h('h3', {}, 'Energy released (exothermic)'), h('p', { class: 'muted' }, 'Freezing (l → s), condensation (g → l), deposition (g → s). Attractions form and energy is released.')),
      h('div', { class: 'card' }, h('h3', {}, 'Link to gas laws'), h('p', { class: 'muted' }, 'Gas particles are far apart and fast, which is why gas volume and pressure respond so strongly to temperature. '), h('a', { href: '#/gas-laws/explorer' }, 'Open the gas law explorer'))),
  );
  showInfo();
  requestAnimationFrame(() => { sim = particleSim(canvas); sim.setTemp(Number(temp.value)); if (!sim.running) pause.textContent = 'Play animation'; });
  return () => sim && sim.destroy();
}
