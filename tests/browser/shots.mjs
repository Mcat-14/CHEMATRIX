import puppeteer from 'puppeteer-core';
const BASE = 'http://localhost:8080/';
const [W, H] = (process.env.SIZE || '390x844').split('x').map(Number);
const routes = (process.env.ROUTES || '#/welcome,#/,#/gas-laws/charles').split(',');
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1, isMobile: W < 800, hasTouch: W < 800 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: process.env.DARK ? 'dark' : 'light' }]);
await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.evaluate(async () => { const r = indexedDB.open('chematrix'); await new Promise((ok) => { r.onsuccess = () => { const db = r.result; const t = db.transaction('settings', 'readwrite'); t.objectStore('settings').put({ key: 'walkthroughDone', value: true }); t.objectStore('settings').put({ key: 'landingSeen', value: true }); t.oncomplete = ok; }; }); });
for (const r of routes) {
  await page.goto(BASE + r, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  if (process.env.EXAMPLE) await page.$$eval('button', (bs) => bs.find((x) => x.textContent.trim() === 'Load example')?.click());
  await new Promise((x) => setTimeout(x, 600));
  const overflow = await page.evaluate((w) => document.documentElement.scrollWidth > w + 1, W);
  const name = `shots/${W}${process.env.DARK ? '-dark' : ''}-${r.replace(/[#/]+/g, '_') || 'root'}.png`;
  await page.screenshot({ path: name, fullPage: !!process.env.FULL });
  console.log(name, overflow ? 'HORIZONTAL OVERFLOW' : 'ok');
}
await browser.close();
