// Build step: list every file the app needs offline, hash them, and write app/sw.js.
// The cache name changes whenever any file changes, which triggers a clean update.
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const ROOT = process.env.APP_ROOT ? process.env.APP_ROOT.replace(/\/?$/, '/') : new URL('../app/', import.meta.url).pathname;
const SKIP = new Set(['sw.js', 'sw.template.js']);
async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    if ((await stat(p)).isDirectory()) out.push(...await walk(p));
    else if (!SKIP.has(name) && !name.endsWith('.md') && !name.endsWith('.txt') && !name.endsWith('.map')) out.push(p);
  }
  return out;
}
const files = (await walk(ROOT)).sort();
const hash = createHash('sha256');
for (const f of files) { hash.update(relative(ROOT, f)); hash.update(await readFile(f)); }
const { APP_VERSION } = await import('file://' + join(ROOT, 'js/ui/version.js'));
const version = `${APP_VERSION}-${hash.digest('hex').slice(0, 10)}`;
const list = ['./', ...files.map((f) => './' + relative(ROOT, f).split('\\').join('/'))];
const tpl = await readFile(join(ROOT, 'sw.template.js'), 'utf8');
await writeFile(join(ROOT, 'sw.js'), tpl.replace('__VERSION__', version).replace('__FILES__', JSON.stringify(list, null, 2)));
console.log(`sw.js written: version ${version}, ${list.length} files precached`);
