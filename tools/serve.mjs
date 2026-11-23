// Minimal static server for local use and testing (no dependencies).
// Usage: node tools/serve.mjs [port] [--lan]   (--lan makes it reachable from phones on the same Wi-Fi)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { networkInterfaces } from 'node:os';

const ROOT = process.env.APP_ROOT ? process.env.APP_ROOT.replace(/\/?$/, '/') : new URL('../app/', import.meta.url).pathname;
const port = Number(process.argv.find((a) => /^\d+$/.test(a)) || 8080);
const host = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
    await stat(file);
    const headers = {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': p.endsWith('sw.js') ? 'no-cache' : 'no-cache',
    };
    res.writeHead(200, headers).end(await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(port, host, () => {
  console.log(`CHEMATRIX running at http://localhost:${port}/`);
  if (host === '0.0.0.0') {
    for (const list of Object.values(networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) console.log(`On your network: http://${n.address}:${port}/ (offline install needs HTTPS; see docs/DEPLOYMENT.md)`);
  }
});
