// Quick smoke test: open every route, collect console errors, take screenshots.
import puppeteer from 'puppeteer-core';
const BASE = process.env.BASE || 'http://localhost:8080/';
const routes = ['#/welcome', '#/', '#/stoichiometry/molar-mass', '#/stoichiometry/moles', '#/stoichiometry/mole-ratio', '#/stoichiometry/limiting', '#/stoichiometry/percent-yield',
  '#/reactions/balancer', '#/reactions/classifier', '#/reactions/predictor', '#/gas-laws/boyle', '#/gas-laws/charles', '#/gas-laws/gay-lussac', '#/gas-laws/combined', '#/gas-laws/avogadro', '#/gas-laws/ideal', '#/gas-laws/density', '#/gas-laws/molar-mass', '#/gas-laws/explorer',
  '#/states', '#/thermochemistry/heat', '#/thermochemistry/temperature', '#/thermochemistry/specific-heat', '#/thermochemistry/calorimetry', '#/thermochemistry/enthalpy', '#/thermochemistry/hess', '#/thermochemistry/bond-energy', '#/thermochemistry/energy-diagram',
  '#/formulas', '#/units', '#/calculator', '#/practice', '#/history', '#/settings', '#/settings/install', '#/settings/checklist', '#/settings/about'];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(`${page.url()} :: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`${page.url()} :: PAGEERROR ${e.message}`));
await page.setViewport({ width: Number(process.env.W || 1440), height: Number(process.env.H || 900) });
await page.goto(BASE, { waitUntil: 'networkidle0' });
for (const r of routes) {
  await page.goto(BASE + r, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.querySelector('#tour')?.open && document.querySelector('#tour').close());
  // press "Load example" if present
  const ex = await page.$$eval('button', (bs) => { const b = bs.find((x) => x.textContent.trim() === 'Load example'); if (b) { b.click(); return true; } return false; });
  await new Promise((r2) => setTimeout(r2, ex ? 400 : 150));
  const res = await page.evaluate(() => ({ err: document.querySelector('.error-box')?.textContent || '', ans: document.querySelector('.answer-box .val')?.textContent || '', h1: document.querySelector('h1')?.textContent || '' }));
  console.log(r.padEnd(34), '|', res.h1.slice(0, 30).padEnd(30), '|', ex ? (res.err ? 'ERR ' + res.err : res.ans) : '-');
  if (process.env.SHOTS) await page.screenshot({ path: `shots/${(process.env.W || 1440)}-${r.replace(/[#/]+/g, '_')}.png`, fullPage: true });
}
console.log('\nConsole errors:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
