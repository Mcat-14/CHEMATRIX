// Local persistence with IndexedDB (history, practice progress, settings).
// Falls back to localStorage, then to memory, so the app keeps working if
// storage is blocked (e.g. some private-browsing modes). No data leaves the device.
const DB_NAME = 'chematrix';
const DB_VERSION = 1;
const STORES = ['history', 'practice', 'settings'];
const MAX_HISTORY = 300;

let dbPromise = null;
let mode = 'idb'; // 'idb' | 'local' | 'memory'
const memory = { history: new Map(), practice: new Map(), settings: new Map() };
let lastError = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) return reject(new Error('IndexedDB unavailable'));
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { return reject(e); }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('history')) {
        const s = db.createObjectStore('history', { keyPath: 'id' });
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('practice')) db.createObjectStore('practice', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Database upgrade blocked by another open tab'));
  }).catch((e) => {
    lastError = e;
    mode = canLocal() ? 'local' : 'memory';
    return null;
  });
  return dbPromise;
}

function canLocal() {
  try { localStorage.setItem('__cx', '1'); localStorage.removeItem('__cx'); return true; } catch { return false; }
}
const lsKey = (store) => `chematrix:${store}`;
function lsRead(store) {
  try { return JSON.parse(localStorage.getItem(lsKey(store)) || '[]'); } catch { return []; }
}
function lsWrite(store, arr) {
  try { localStorage.setItem(lsKey(store), JSON.stringify(arr)); } catch (e) { lastError = e; throw new Error('Storage is full or unavailable.'); }
}
const keyOf = (store, rec) => (store === 'settings' ? rec.key : rec.id);

async function tx(store, fn, write = false) {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, write ? 'readwrite' : 'readonly');
    const s = t.objectStore(store);
    let result;
    Promise.resolve(fn(s)).then((r) => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Storage transaction aborted'));
  });
}
const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export async function getAll(store) {
  await openDb();
  if (mode === 'idb') return (await tx(store, (s) => reqP(s.getAll()))) || [];
  if (mode === 'local') return lsRead(store);
  return [...memory[store].values()];
}
export async function get(store, key) {
  await openDb();
  if (mode === 'idb') return tx(store, (s) => reqP(s.get(key)));
  if (mode === 'local') return lsRead(store).find((r) => keyOf(store, r) === key);
  return memory[store].get(key);
}
export async function put(store, rec) {
  await openDb();
  if (mode === 'idb') return tx(store, (s) => reqP(s.put(rec)), true);
  if (mode === 'local') {
    const arr = lsRead(store).filter((r) => keyOf(store, r) !== keyOf(store, rec));
    arr.push(rec);
    lsWrite(store, arr);
    return;
  }
  memory[store].set(keyOf(store, rec), rec);
}
export async function del(store, key) {
  await openDb();
  if (mode === 'idb') return tx(store, (s) => reqP(s.delete(key)), true);
  if (mode === 'local') return lsWrite(store, lsRead(store).filter((r) => keyOf(store, r) !== key));
  memory[store].delete(key);
}
export async function clearStore(store) {
  await openDb();
  if (mode === 'idb') return tx(store, (s) => reqP(s.clear()), true);
  if (mode === 'local') return lsWrite(store, []);
  memory[store].clear();
}
export async function clearAll() {
  for (const s of STORES) await clearStore(s);
}
export function storageMode() { return mode; }
export function storageError() { return lastError; }

/* ---------- history ---------- */
export async function addHistory(entry) {
  const rec = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now(), ...entry };
  await put('history', rec);
  // keep the most recent MAX_HISTORY entries
  const all = await getAll('history');
  if (all.length > MAX_HISTORY) {
    all.sort((a, b) => a.createdAt - b.createdAt);
    for (const old of all.slice(0, all.length - MAX_HISTORY)) await del('history', old.id);
  }
  return rec;
}
export async function listHistory() {
  const all = await getAll('history');
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/* ---------- settings ---------- */
export const DEFAULT_SETTINGS = { theme: 'system', sigfigs: 'auto', angle: 'deg', saveHistory: true, walkthroughDone: false, landingSeen: false };
let settingsCache = null;
export async function loadSettings() {
  const out = { ...DEFAULT_SETTINGS };
  try {
    const rows = await getAll('settings');
    for (const r of rows) out[r.key] = r.value;
  } catch (e) { lastError = e; }
  settingsCache = out;
  return out;
}
export function settings() { return settingsCache || { ...DEFAULT_SETTINGS }; }
export async function setSetting(key, value) {
  settingsCache = { ...settings(), [key]: value };
  try { await put('settings', { key, value }); } catch (e) { lastError = e; throw e; }
}

/* ---------- practice progress ---------- */
export async function recordPractice(topic, correct) {
  const cur = (await get('practice', topic)) || { id: topic, attempted: 0, correct: 0, streak: 0, best: 0 };
  cur.attempted++;
  if (correct) { cur.correct++; cur.streak++; cur.best = Math.max(cur.best, cur.streak); } else cur.streak = 0;
  cur.updatedAt = Date.now();
  await put('practice', cur);
  return cur;
}

/** Ask the browser to keep our storage (reduces the chance of eviction). */
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch { /* ignore */ }
  return false;
}
