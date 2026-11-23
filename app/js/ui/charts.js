// Visualisations: gas-law graphs (Chart.js, bundled locally), energy diagrams
// (SVG) and the particle simulation (canvas). All work offline.
import { fmtWork } from '../engine/numbers.js';

const charts = new WeakMap();
function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function baseOptions(xLabel, yLabel) {
  const ink = css('--ink-2'), grid = css('--line');
  return {
    responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
    plugins: { legend: { labels: { color: ink, boxWidth: 14 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: (${fmtWork(c.parsed.x)}, ${fmtWork(c.parsed.y)})` } } },
    scales: {
      x: { type: 'linear', title: { display: true, text: xLabel, color: ink }, ticks: { color: ink }, grid: { color: grid } },
      y: { type: 'linear', title: { display: true, text: yLabel, color: ink }, ticks: { color: ink }, grid: { color: grid }, beginAtZero: true },
    },
  };
}

function draw(canvas, config) {
  if (!window.Chart) {
    const p = document.createElement('p');
    p.className = 'muted small';
    p.textContent = 'The graph library could not be loaded.';
    canvas.replaceWith(p);
    return null;
  }
  const old = charts.get(canvas);
  if (old) old.destroy();
  const c = new window.Chart(canvas, config);
  charts.set(canvas, c);
  return c;
}

const AX = { P: 'Pressure', V: 'Volume', T: 'Temperature', n: 'Amount' };

/** Curve for a gas law. k: P·V (Boyle) or y/x slope (others). */
export function lawCurve(law, k, xMax, xMin = 0) {
  const pts = [];
  const N = 60;
  const lo = law === 'boyle' ? Math.max(xMin, xMax / 40) : 0;
  for (let i = 0; i <= N; i++) {
    const x = lo + ((xMax - lo) * i) / N;
    pts.push({ x, y: law === 'boyle' ? k / x : k * x });
  }
  return pts;
}

export function renderSolutionChart(canvas, spec) {
  if (!canvas || !spec) return;
  const accent = css('--accent'), ok = css('--success');
  const xMax = Math.max(...spec.points.map((p) => p.x)) * 1.5;
  draw(canvas, {
    type: 'scatter',
    data: {
      datasets: [
        { label: spec.law === 'boyle' ? 'PV = constant' : `${spec.y}/${spec.x} = constant`, data: lawCurve(spec.law, spec.k, xMax), showLine: true, pointRadius: 0, borderColor: accent, borderWidth: 2 },
        { label: 'State 1 and state 2', data: spec.points, pointRadius: 6, pointBackgroundColor: ok, borderColor: ok },
      ],
    },
    options: baseOptions(`${AX[spec.x]} (${spec.xUnit})`, `${AX[spec.y]} (${spec.yUnit})`),
  });
}

/** Interactive explorer: returns an update function. */
export function gasExplorer(canvas, law) {
  const accent = css('--accent'), ok = css('--success');
  const cfg = {
    boyle: { x: 'Volume (L)', y: 'Pressure (atm)', xMax: 10 },
    charles: { x: 'Temperature (K)', y: 'Volume (L)', xMax: 600 },
    gayLussac: { x: 'Temperature (K)', y: 'Pressure (atm)', xMax: 600 },
    avogadro: { x: 'Amount (mol)', y: 'Volume (L)', xMax: 4 },
  }[law];
  const chart = draw(canvas, {
    type: 'scatter',
    data: { datasets: [
      { label: 'Relationship', data: [], showLine: true, pointRadius: 0, borderColor: accent, borderWidth: 2 },
      { label: 'Current state', data: [], pointRadius: 7, pointBackgroundColor: ok, borderColor: ok },
    ] },
    options: { ...baseOptions(cfg.x, cfg.y), animation: false },
  });
  return (k, x) => {
    if (!chart) return;
    chart.data.datasets[0].data = lawCurve(law, k, cfg.xMax);
    chart.data.datasets[1].data = [{ x, y: law === 'boyle' ? k / x : k * x }];
    chart.options.scales.x.min = 0;
    chart.options.scales.x.max = cfg.xMax;
    if (law === 'boyle') chart.options.scales.y.max = Math.min(k / (cfg.xMax / 40), 40);
    chart.update();
  };
}

/** SVG energy diagram from engine.energyProfile(). */
export function energyDiagram(profile) {
  const W = 640, H = 360, pad = { l: 64, r: 24, t: 24, b: 40 };
  const vals = [profile.reactant, profile.product, profile.transition];
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo || 1;
  const yOf = (v) => pad.t + (H - pad.t - pad.b) * (1 - (v - lo + span * 0.1) / (span * 1.25));
  const xR = pad.l + 40, xT = W / 2, xP = W - pad.r - 80;
  const yr = yOf(profile.reactant), yp = yOf(profile.product), yt = yOf(profile.transition);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'energy-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Energy diagram: ${profile.type} reaction, activation energy ${fmtWork(profile.Ea)} kJ, enthalpy change ${fmtWork(profile.dH)} kJ`);
  const accent = css('--accent'), ink = css('--ink-2'), warn = css('--warn'), good = css('--success'), line = css('--line');
  const el = (tag, attrs, text) => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text) e.textContent = text;
    svg.append(e);
    return e;
  };
  el('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: ink, 'stroke-width': 1.5 });
  el('line', { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: ink, 'stroke-width': 1.5 });
  el('text', { x: 16, y: H / 2, transform: `rotate(-90 16 ${H / 2})`, 'text-anchor': 'middle' }, 'Enthalpy, H (kJ)');
  el('text', { x: (W + pad.l) / 2, y: H - 12, 'text-anchor': 'middle' }, 'Reaction progress');
  // smooth path reactants -> TS -> products
  const d = `M ${pad.l + 8} ${yr} L ${xR} ${yr} C ${xR + 70} ${yr}, ${xT - 60} ${yt}, ${xT} ${yt} C ${xT + 60} ${yt}, ${xP - 70} ${yp}, ${xP} ${yp} L ${W - pad.r - 8} ${yp}`;
  el('path', { d, fill: 'none', stroke: accent, 'stroke-width': 3 });
  el('line', { x1: pad.l + 8, y1: yr, x2: W - pad.r - 8, y2: yr, stroke: line, 'stroke-dasharray': '4 4' });
  // Ea arrow
  const ax = xT - 26;
  el('line', { x1: ax, y1: yr, x2: ax, y2: yt + 4, stroke: warn, 'stroke-width': 2, 'marker-end': 'url(#arw)' });
  el('text', { x: ax - 6, y: (yr + yt) / 2, 'text-anchor': 'end', fill: warn }, `Ea = ${fmtWork(profile.Ea)} kJ`);
  // ΔH arrow
  const dx = xP + 40;
  if (Math.abs(yp - yr) > 2) el('line', { x1: dx, y1: yr, x2: dx, y2: yp + (yp > yr ? -4 : 4), stroke: good, 'stroke-width': 2, 'marker-end': 'url(#arw2)' });
  el('text', { x: dx - 8, y: (yr + yp) / 2 + 4, 'text-anchor': 'end', fill: good }, `ΔH = ${fmtWork(profile.dH)} kJ`);
  el('text', { x: xR - 20, y: yr - 10, 'text-anchor': 'middle' }, 'Reactants');
  el('text', { x: xP + 10, y: yp - 10, 'text-anchor': 'middle' }, 'Products');
  el('text', { x: xT, y: yt - 10, 'text-anchor': 'middle' }, 'Transition state');
  const defs = document.createElementNS(ns, 'defs');
  defs.innerHTML = `<marker id="arw" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="${warn}"/></marker><marker id="arw2" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="${good}"/></marker>`;
  svg.prepend(defs);
  return svg;
}

/** Particle simulation for the states of matter explorer. Returns controller. */
export function particleSim(canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let state = 'solid', temp = 0.5, raf = 0, running = !reduce;
  const N = 36;
  let parts = [];
  function size() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return r;
  }
  function layout() {
    const r = size();
    parts = [];
    const W = r.width, H = r.height;
    if (state === 'solid') {
      const cols = 9, rows = 4, gap = 22;
      const x0 = W / 2 - ((cols - 1) * gap) / 2, y0 = H - 24 - (rows - 1) * gap;
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) parts.push({ hx: x0 + j * gap, hy: y0 + i * gap, x: x0 + j * gap, y: y0 + i * gap, vx: 0, vy: 0 });
    } else if (state === 'liquid') {
      for (let i = 0; i < N; i++) parts.push({ x: 20 + Math.random() * (W - 40), y: H - 20 - Math.random() * 80, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2 });
    } else {
      for (let i = 0; i < 18; i++) parts.push({ x: 20 + Math.random() * (W - 40), y: 20 + Math.random() * (H - 40), vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 });
    }
  }
  function step() {
    const r = canvas.getBoundingClientRect();
    const W = r.width, H = r.height;
    ctx.clearRect(0, 0, W, H);
    const col = css('--accent');
    const speed = 0.3 + temp * 1.7;
    for (const p of parts) {
      if (state === 'solid') {
        p.x = p.hx + (Math.random() - 0.5) * 3 * speed;
        p.y = p.hy + (Math.random() - 0.5) * 3 * speed;
      } else {
        p.x += p.vx * speed; p.y += p.vy * speed;
        if (state === 'liquid') { p.vy += 0.05; if (p.y > H - 10) { p.y = H - 10; p.vy *= -0.6; } if (p.y < H - 110) p.vy += 0.1; }
        if (p.x < 10 || p.x > W - 10) { p.vx *= -1; p.x = Math.min(Math.max(p.x, 10), W - 10); }
        if (p.y < 10 || p.y > H - 10) { p.vy *= -1; p.y = Math.min(Math.max(p.y, 10), H - 10); }
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (running) raf = requestAnimationFrame(step);
  }
  layout();
  step();
  const onResize = () => layout();
  window.addEventListener('resize', onResize);
  return {
    setState(s) { state = s; layout(); if (!running) step(); },
    setTemp(t) { temp = t; if (!running) step(); },
    toggle() { running = !running; if (running) step(); else cancelAnimationFrame(raf); return running; },
    get running() { return running; },
    destroy() { cancelAnimationFrame(raf); running = false; window.removeEventListener('resize', onResize); },
  };
}
