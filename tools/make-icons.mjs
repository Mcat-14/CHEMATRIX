// Render the SVG app icon to the PNG sizes needed by Android, iOS and desktop.
import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const jobs = [['icon.svg', 'icon-192.png', 192], ['icon.svg', 'icon-512.png', 512], ['maskable.svg', 'maskable-512.png', 512], ['maskable.svg', 'apple-touch-icon.png', 180]];
const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage();
for (const [src, out, size] of jobs) {
  const svg = await readFile(new URL(`../app/icons/${src}`, import.meta.url), 'utf8');
  await page.setViewport({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: new URL(`../app/icons/${out}`, import.meta.url).pathname, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
await browser.close();
console.log('icons written');
