// End-to-end PWA / offline / mobile test in real headless Chrome.
// Covers the scenarios in section 14-I of the brief and writes docs/OFFLINE_TEST_REPORT.md.
// Run: npm run test:browser   (needs Chrome; set CHROME_PATH if it is not /usr/bin/google-chrome)
import puppeteer from 'puppeteer-core';
import { spawn, execFileSync } from 'node:child_process';
import { cp, rm, writeFile, readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const PORT = 8099;
const BASE = `http://localhost:${PORT}/`;
const repo = new URL('../../', import.meta.url).pathname;
const results = [];
const record = (id, scenario, pass, detail = '') => { results.push({ id, scenario, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}. ${scenario}${detail ? ' — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// work on a copy so the update test can change files safely
const root = await mkdtemp(join(tmpdir(), 'cx-app-'));
await cp(join(repo, 'app'), root, { recursive: true });
const env = { ...process.env, APP_ROOT: root };
execFileSync('node', [join(repo, 'tools/build-sw.mjs')], { env });
const server = spawn('node', [join(repo, 'tools/serve.mjs'), String(PORT)], { env, stdio: 'ignore' });
await sleep(600);

const profile = await mkdtemp(join(tmpdir(), 'cx-profile-'));
let browser = await puppeteer.launch({ executablePath: CHROME, userDataDir: profile, args: ['--no-sandbox'] });
let page = await browser.newPage();
const consoleErrors = [];
const watchPage = (p) => { p.on('pageerror', (e) => consoleErrors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(m.text())) consoleErrors.push(m.text()); }); };
watchPage(page);
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

const closeTour = () => page.evaluate(() => { const d = document.querySelector('#tour'); if (d && d.open) d.close(); });
async function calc(route, fill) {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('form.inputs');
  await closeTour();
  await fill();
  await page.$eval('form.inputs', (f) => f.requestSubmit());
  await page.waitForSelector('.answer-box .val, .error-box', { timeout: 5000 });
  return page.$eval('.answer-box .val', (e) => e.textContent).catch(() => 'ERROR');
}
const type = async (sel, text) => { await page.$eval(sel, (e) => { e.value = ''; }); await page.type(sel, text); };

try {
  // 1. first-time installation: manifest + installability
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  const cdp = await page.createCDPSession();
  const man = await cdp.send('Page.getAppManifest');
  const inst = await cdp.send('Page.getInstallabilityErrors');
  const parsed = JSON.parse(man.data || '{}');
  record(1, 'First-time installation (manifest valid, browser reports the app installable)', !!parsed.name && (man.errors || []).length === 0 && inst.installabilityErrors.length === 0,
    `name "${parsed.short_name}", display ${parsed.display}, ${parsed.icons?.length} icons; installability errors: ${inst.installabilityErrors.map((e) => e.errorId).join(', ') || 'none'}`);

  // 2. initial resource caching
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, { timeout: 15000 }).catch(() => {});
  await page.reload({ waitUntil: 'networkidle0' });
  const cache = await page.evaluate(async () => {
    const keys = await caches.keys();
    const c = await caches.open(keys.find((k) => k.startsWith('chematrix-')));
    return { keys, count: (await c.keys()).length, controlled: !!navigator.serviceWorker.controller };
  });
  const swSrc = await readFile(join(root, 'sw.js'), 'utf8');
  const expected = JSON.parse(swSrc.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]).length;
  record(2, 'Initial resource caching (service worker controls the page, all app files cached)', cache.controlled && cache.count === expected, `cache ${cache.keys.join(', ')}, ${cache.count}/${expected} files`);
  const cacheV1 = cache.keys[0];

  // 3. open without internet
  await page.setOfflineMode(true);
  await page.goto(BASE + '#/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await closeTour();
  const offlineUI = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent, pill: document.querySelector('#net').textContent, banner: !document.querySelector('#offline-banner').hidden, font: document.fonts.check('16px Geist') }));
  record(3, 'Opening the application without internet', offlineUI.h1 === 'Dashboard' && offlineUI.pill === 'Offline' && offlineUI.banner, `page "${offlineUI.h1}", status pill "${offlineUI.pill}", offline banner shown, local font loaded: ${offlineUI.font}`);

  // 4. calculations offline (one per module + balancer)
  const bal = await calc('#/reactions/balancer', () => type('form.inputs input', 'C3H8 + O2 -> CO2 + H2O'));
  const ideal = await calc('#/gas-laws/ideal', async () => { await page.click('.seg input[value="V"]'); const ins = await page.$$('form.inputs input[type="text"]'); await ins[0].type('1.00'); await ins[2].type('1.00'); await ins[3].type('0'); });
  const heat = await calc('#/thermochemistry/heat', async () => { const ins = await page.$$('form.inputs input[type="text"]'); await ins[1].type('100.0'); await ins[2].type('4.184'); await ins[3].type('20.0'); await ins[4].type('30.0'); });
  const mm = await calc('#/stoichiometry/molar-mass', () => type('form.inputs input', 'Ca(OH)2'));
  const graph = await page.goto(BASE + '#/gas-laws/explorer').then(() => page.waitForSelector('canvas')).then(() => sleep(400)).then(() => page.evaluate(() => !!window.Chart && !!document.querySelector('canvas').getContext('2d')));
  record(4, 'Performing chemistry calculations offline', bal.includes('5O') && ideal.includes('22.4') && heat.includes('4180') && mm.includes('74.09') && graph,
    `balancer "${bal}", ideal gas "${ideal}", heat "${heat}", molar mass "${mm}", Chart.js graph drawn offline: ${graph}`);

  // 5. formula library offline
  await page.goto(BASE + '#/formulas', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.formula-item');
  await closeTour();
  await page.focus('main input[type="search"]');
  await page.type('main input[type="search"]', 'kelvin');
  await sleep(200);
  const lib = await page.$$eval('.formula-item', (els) => els.map((e) => e.querySelector('b').textContent));
  record(5, 'Accessing the formula library offline', lib.length >= 1 && lib.length < 5 && lib.some((t) => /kelvin/i.test(t)), `search "kelvin" → ${lib.join(', ')}`);

  // 6. history saved and reopened offline
  await page.goto(BASE + '#/history', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.hist-item');
  const histCount = await page.$$eval('.hist-item', (e) => e.length);
  await page.$$eval('.hist-item a', (as) => as.find((a) => a.textContent.includes('Reopen')).click());
  await page.waitForSelector('.answer-box .val', { timeout: 5000 });
  const reopened = await page.$eval('.answer-box .val', (e) => e.textContent);
  record(6, 'Saving and reopening calculation history offline', histCount >= 4 && reopened.length > 0, `${histCount} entries saved; reopened newest → "${reopened}"`);

  // 7. close and reopen the app (new browser process, same profile), still offline
  await browser.close();
  browser = await puppeteer.launch({ executablePath: CHROME, userDataDir: profile, args: ['--no-sandbox'] });
  page = await browser.newPage();
  watchPage(page);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.setOfflineMode(true);
  await page.goto(BASE + '#/history', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.hist-item', { timeout: 8000 });
  const afterRestart = await page.$$eval('.hist-item', (e) => e.length);
  const themeKept = await page.evaluate(() => document.querySelector('#net').textContent);
  record(7, 'Closing and reopening the installed application (browser restarted, offline)', afterRestart === histCount, `${afterRestart} history entries still present; status "${themeKept}"`);

  // 8. switching online/offline
  await page.setOfflineMode(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await sleep(300);
  const on = await page.$eval('#net', (e) => e.textContent);
  await page.setOfflineMode(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await sleep(300);
  const off = await page.$eval('#net', (e) => e.textContent);
  const stillWorks = await calc('#/stoichiometry/percent-yield', async () => { const ins = await page.$$('form.inputs input[type="text"]'); await ins[0].type('8.50'); await ins[1].type('10.0'); });
  record(8, 'Switching between online and offline states', on === 'Online' && off === 'Offline' && stillWorks.includes('85.0'), `indicator ${on} → ${off}; calculation after switch "${stillWorks}"`);

  // 9. update when internet returns: change a file, rebuild sw.js, accept the update
  await page.setOfflineMode(false);
  await writeFile(join(root, 'js/ui/version.js'), "export const APP_VERSION = '1.0.1-test';\n");
  execFileSync('node', [join(repo, 'tools/build-sw.mjs')], { env });
  await page.goto(BASE + '#/', { waitUntil: 'networkidle0' });
  await closeTour();
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('update is ready')), { timeout: 20000 }).catch(() => {});
  const toastSeen = await page.evaluate(() => [...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('update is ready')));
  if (toastSeen) {
    await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => {}), page.evaluate(() => [...document.querySelectorAll('.toast button')].find((b) => b.textContent === 'Reload').click())]);
  }
  await sleep(800);
  const after = await page.evaluate(async () => ({ keys: await caches.keys(), works: !!document.querySelector('h1') }));
  record(9, 'Updating the application when internet returns (user-approved update, old cache removed)', toastSeen && after.keys.length === 1 && after.keys[0] !== cacheV1 && after.works, `"Update ready" prompt shown: ${toastSeen}; caches now ${after.keys.join(', ')} (was ${cacheV1})`);

  // 10 + 11. screen sizes and touch targets
  const sizes = [[320, 640], [360, 780], [390, 844], [768, 1024], [1024, 768], [1440, 900]];
  const routes = ['#/', '#/reactions/balancer', '#/gas-laws/combined', '#/thermochemistry/hess', '#/practice', '#/formulas', '#/calculator', '#/states'];
  const overflow = [];
  const smallTargets = new Set();
  for (const [w, hgt] of sizes) {
    await page.setViewport({ width: w, height: hgt, isMobile: w < 1024, hasTouch: w < 1024 });
    for (const r of routes) {
      await page.goto(BASE + r, { waitUntil: 'domcontentloaded' });
      await sleep(250);
      await closeTour();
      const o = await page.evaluate((vw) => document.documentElement.scrollWidth > vw + 1, w);
      if (o) overflow.push(`${w}px ${r}`);
      if (w < 1024) {
        const small = await page.evaluate(() => [...document.querySelectorAll('button, a.btn, .bottom-nav a, .tabs a, input[type=text], select, .seg span')]
          .filter((e) => e.offsetParent && !e.closest('.sheet') && !e.closest('p, li, dd'))
          .map((e) => [e.getBoundingClientRect().height, (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30)])
          .filter(([hh]) => hh > 0 && hh < 43.5).map(([hh, t]) => `${t} (${Math.round(hh)}px)`));
        small.forEach((s) => smallTargets.add(s));
      }
    }
  }
  record(10, 'Different screen sizes (320, 360, 390, 768, 1024, 1440 px) without horizontal scrolling', overflow.length === 0, overflow.length ? `overflow: ${overflow.join('; ')}` : `${sizes.length} sizes × ${routes.length} pages checked, no horizontal overflow`);
  record(11, 'Touch controls and navigation (controls ≥ 44 px, bottom navigation and "More" sheet work)', smallTargets.size === 0 && await (async () => {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(BASE + '#/', { waitUntil: 'domcontentloaded' });
    await closeTour();
    await page.tap('#more-btn');
    await sleep(350);
    const open = await page.$eval('#sheet', (s) => s.classList.contains('open'));
    await page.tap('#sheet a[href="#/practice"]');
    await sleep(400);
    return open && (await page.$eval('h1', (e) => e.textContent)) === 'Practice mode';
  })(), smallTargets.size ? `controls under 44 px: ${[...smallTargets].join('; ')}` : 'all visible controls ≥ 44 px on touch screens; More sheet opened and navigated to Practice');

  // 12. clear site data: a brand-new visitor state. Recovery needs one online visit.
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const cdp2 = await page.createCDPSession();
  await page.goto('about:blank');
  await cdp2.send('Storage.clearDataForOrigin', { origin: BASE.slice(0, -1), storageTypes: 'all' });
  await cdp2.send('Network.clearBrowserCache');
  await page.close();
  page = await browser.newPage();
  watchPage(page);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.setOfflineMode(true);
  let offlineAfterClear;
  try { await page.goto(BASE + '#/', { waitUntil: 'domcontentloaded', timeout: 8000 }); offlineAfterClear = await page.evaluate(() => (document.querySelector('#view h1') ? 'the app still opened' : 'the browser showed its offline page')); } catch { offlineAfterClear = 'the browser showed its offline page'; }
  const histGone = await page.evaluate(async () => { try { const r = indexedDB.open('chematrix'); return await new Promise((ok) => { r.onsuccess = () => { try { const t = r.result.transaction('history'); const q = t.objectStore('history').count(); q.onsuccess = () => ok(q.result); } catch { ok(0); } }; r.onerror = () => ok(0); }); } catch { return 0; } }).catch(() => 0);
  await page.setOfflineMode(false);
  await page.goto(BASE + '#/', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => navigator.serviceWorker.controller, { timeout: 15000 }).catch(() => {});
  await page.reload({ waitUntil: 'networkidle0' });
  const recached = await page.evaluate(async () => { const k = await caches.keys(); return k.length ? (await (await caches.open(k[0])).keys()).length : 0; });
  await page.setOfflineMode(true);
  await page.goto(BASE + '#/units', { waitUntil: 'domcontentloaded' });
  const unitsOk = await page.waitForSelector('.answer-box .val', { timeout: 5000 }).then(() => true).catch(() => false);
  record(12, 'After clearing browser cache and site data (data is gone; one online visit restores offline use)', histGone === 0 && recached > 40 && unitsOk,
    `offline right after clearing: ${offlineAfterClear}; saved history after clearing: ${histGone} entries (deleted, as expected); after one online visit ${recached} files were re-cached and the app worked offline again`);

  record(13, 'No JavaScript errors during the whole run', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | ') || 'none');
} catch (e) {
  record(99, 'Test runner crashed', false, e.stack);
} finally {
  await browser.close().catch(() => {});
  server.kill();
  await rm(root, { recursive: true, force: true });
  await rm(profile, { recursive: true, force: true });
}

const passed = results.filter((r) => r.pass).length;
const md = `# Offline, installation and mobile test report

Generated by \`npm run test:browser\` (tests/browser/run.mjs) on ${new Date().toISOString().slice(0, 10)} in headless Google Chrome, using a fresh browser profile, a real service worker and real IndexedDB. Offline mode is simulated with Chrome DevTools network emulation.

**Result: ${passed} of ${results.length} scenarios passed.**

| # | Scenario | Result | Details |
|---|---|---|---|
${results.map((r) => `| ${r.id} | ${r.scenario} | ${r.pass ? 'PASS' : 'FAIL'} | ${String(r.detail).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`).join('\n')}

## What this does not cover

- Real devices. Chrome's mobile emulation checks layout, touch events and sizes, but the app has not been run on a physical Android phone, iPhone or iPad in this environment. Please do the manual checks in docs/DEMO_SCRIPT.md on at least one Android phone and one iPhone before the presentation.
- Safari/iOS specifics (Add to Home Screen flow, iOS storage eviction after weeks without use) cannot be tested in Chrome.
- The browser's own install dialog. The test confirms Chrome reports the app as installable; it does not click the native dialog.
`;
await writeFile(join(repo, 'docs/OFFLINE_TEST_REPORT.md'), md);
console.log(`\n${passed}/${results.length} passed. Report: docs/OFFLINE_TEST_REPORT.md`);
process.exit(passed === results.length ? 0 : 1);
