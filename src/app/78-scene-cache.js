/* ============================================================
   SCENE ENGINE: the persistent bake cache. Browser only (pure at load: functions and constants).

   A canvas scene's bake (78-scene-canvas.js) is the slow part of showing it: the compile, then every sprite rasterised and
   drawn into the layer bitmaps, the shadows, the water's reflection. This file keeps the results in IndexedDB so the next
   load restores them in milliseconds instead of baking again:

     compiled  'C|<scene>|<season>|<lod>|<version>'   the compiled scene (plain data, structured clone)
     bake      'B|<scene>|<W>x<H>|<lod>|<light key>|<version>'
               the layer bitmaps, the sky, the wind strips and what the passes keep for their frames (the water's
               reflection and mask), as lossless PNG blobs, with the layout they need ({ groups, strips, ... }), plus a
               still of the scene's first frame (the first paint while the live canvas restores)

   The version is the build's scene-content hash, so unrelated app changes keep their prepared scenes. Older builds and
   standalone scene tools fall back to hashing the app script. A world scene (v3) is keyed by its OWN content instead (its spec and
   the world engine's hash: 79-world-5persist.js worldPersistId), so editing one scene, a v2 pack or the registry keeps every other
   world scene's bake. The light key carries the season, the quantised light and every pass's own key, exactly what the renderer
   re-bakes on, so a restored bake is the bake the renderer would make. Entries are evicted LEAST RECENTLY USED (the use time is
   touched on every read, at most once an hour) once the store is over SCENE_STORE_MAX_BYTES, and an entry nobody used for
   SCENE_STORE_MAX_IDLE_MS goes too: a scene opened every day is never evicted for its age (until 14 Nov entries expired 4 days
   after they were stored, however often they were used: docs/dev/WORLD_LOAD.md 3). The world engine also keeps its own records
   here ('W|...': the built world, the ground plan, its bake's bitmaps, the kept stills; 79-world-5persist.js). Encoding runs in a
   worker where the page allows one (CSP worker-src blob:), else in the browser's own async encoder; decoding is createImageBitmap
   (off the main thread).

     sceneStoreOn()                       IndexedDB, createImageBitmap and canvas encoding are there (and not switched off)
     sceneStoreVersion()                  Promise<string>
     sceneStoreGet(key)                   Promise<record | null>   (touches its use time)
     sceneStoreGetMany(keys)              Promise<(record | null)[]> in one transaction (touches their use times)
     sceneStoreHas(keys)                  Promise<Set<key>>         which of these keys are kept (reads the small meta store only)
     sceneStorePut(record, bytes)         Promise<boolean>         record: { k, ... }; evicts afterwards
     sceneStoreEncode(canvases)           Promise<Blob[]>          PNG blobs of canvases (a worker where it can)
     sceneStoreDecode(blobs)              Promise<ImageBitmap[]>
   window.__sceneStoreOff = true (tests, tools) turns it off for the page.
   ============================================================ */
const SCENE_STORE_DB = 'opendash-scenes', SCENE_STORE_FORMAT = 1;
// the budget on disk (the least recently used go first past it) and the longest an entry may go unused; SCENE_STORE_MAX_AGE_MS is kept
// for older callers (it now means unused for that long, never stored that long ago)
const SCENE_STORE_MAX_BYTES = 300 * 1024 * 1024, SCENE_STORE_MAX_IDLE_MS = 30 * 24 * 3600 * 1000, SCENE_STORE_MAX_AGE_MS = SCENE_STORE_MAX_IDLE_MS;
let _scstVer = null, _scstDbP = null, _scstWk = undefined, _scstWkId = 0;
const _scstWkJobs = new Map();

function sceneStoreOn() {
  try {
    if (typeof window !== 'undefined' && window.__sceneStoreOff) return false;
    return typeof indexedDB !== 'undefined' && !!indexedDB && typeof createImageBitmap === 'function' && typeof OffscreenCanvas === 'function'
      && typeof OffscreenCanvas.prototype.convertToBlob === 'function';
  } catch (e) { return false; }
}
/** The app script's text (the block that holds the scene engine). */
function _scstScriptText() {
  try {
    for (const s of document.scripts) { const t = s.text || ''; if (t.length > 1000 && t.indexOf('function sceneRendererCreate(') >= 0) return t; }
  } catch (e) { /* no document */ }
  return '';
}
/** The scene-content version (+ format), or a script hash for older builds and standalone tools. */
function sceneStoreVersion() {
  if (_scstVer) return _scstVer;
  _scstVer = (async () => {
    try {
      const meta = document.querySelector('meta[name="freeflo-scene-version"]');
      const version = meta && meta.getAttribute('content');
      if (typeof version === 'string' && /^[a-f0-9]{16,64}$/.test(version)) return version + '.' + SCENE_STORE_FORMAT;
    } catch (e) { /* standalone tools use the script hash */ }
    const text = _scstScriptText();
    if (!text) return 'none';
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder === 'function') {
        const d = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text)));
        return Array.from(d.slice(0, 10), b => b.toString(16).padStart(2, '0')).join('') + '.' + SCENE_STORE_FORMAT;
      }
    } catch (e) { /* no subtle crypto: the hash below */ }
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 + c, 2246822519) ^ (h2 >>> 13); }
    return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16) + '.' + text.length + '.' + SCENE_STORE_FORMAT;
  })();
  return _scstVer;
}
function _scstReq(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
function _scstDone(tx) { return new Promise((res, rej) => { tx.oncomplete = () => res(true); tx.onerror = tx.onabort = () => rej(tx.error || new Error('aborted')); }); }
/** The database: 'data' (k -> the record) and 'meta' (k -> { k, used, at, bytes }: eviction reads only these). */
function _scstDb() {
  if (_scstDbP) return _scstDbP;
  _scstDbP = new Promise((res) => {
    let r;
    try { r = indexedDB.open(SCENE_STORE_DB, 1); } catch (e) { res(null); return; }
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('data')) db.createObjectStore('data', { keyPath: 'k' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' }).createIndex('used', 'used');
    };
    r.onsuccess = () => { const db = r.result; db.onversionchange = () => { try { db.close(); } catch (e) { /* closed */ } _scstDbP = null; }; res(db); };
    r.onerror = r.onblocked = () => res(null);
  });
  return _scstDbP;
}
/** A record by key, or null. Its use time is touched (at most once an hour) for the LRU. */
async function sceneStoreGet(key) {
  if (!sceneStoreOn()) return null;
  return (await sceneStoreGetMany([key]))[0];
}
/** Records by key, in order (null for a missing one), read in ONE transaction; their use times are touched (at most once an hour). */
async function sceneStoreGetMany(keys) {
  const out = (keys || []).map(() => null);
  if (!sceneStoreOn() || !out.length) return out;
  try {
    const db = await _scstDb();
    if (!db) return out;
    const tx = db.transaction(['data', 'meta'], 'readonly'), ds = tx.objectStore('data'), ms = tx.objectStore('meta');
    const got = await Promise.all(keys.map(k => Promise.all([_scstReq(ds.get(k)), _scstReq(ms.get(k))])));
    const now = Date.now(), touch = [];
    got.forEach(([rec, meta], i) => {
      if (!rec || !meta || now - (meta.used || meta.at || 0) > SCENE_STORE_MAX_IDLE_MS) return;
      out[i] = rec;
      if (now - (meta.used || 0) > 3600000) touch.push(Object.assign({}, meta, { used: now }));
    });
    if (touch.length) { try { const t2 = db.transaction('meta', 'readwrite'), m2 = t2.objectStore('meta'); for (const m of touch) m2.put(m); } catch (e) { /* next time */ } }
    return out;
  } catch (e) { return out; }
}
/** Which of these keys are kept (the small meta store only: no record is read). */
async function sceneStoreHas(keys) {
  const out = new Set();
  if (!sceneStoreOn() || !keys || !keys.length) return out;
  try {
    const db = await _scstDb();
    if (!db) return out;
    const ms = db.transaction('meta', 'readonly').objectStore('meta'), now = Date.now();
    const got = await Promise.all(keys.map(k => _scstReq(ms.get(k))));
    got.forEach((m, i) => { if (m && now - (m.used || m.at || 0) <= SCENE_STORE_MAX_IDLE_MS) out.add(keys[i]); });
  } catch (e) { /* none */ }
  return out;
}
/** Store a record ({ k, ... }; bytes: its size on disk, for the eviction). */
async function sceneStorePut(rec, bytes) {
  if (!sceneStoreOn() || !rec || !rec.k) return false;
  try {
    const db = await _scstDb();
    if (!db) return false;
    const tx = db.transaction(['data', 'meta'], 'readwrite'), now = Date.now();
    tx.objectStore('data').put(rec);
    tx.objectStore('meta').put({ k: rec.k, used: now, at: now, bytes: bytes || 0 });
    await _scstDone(tx);
    _scstEvictSoon();
    return true;
  } catch (e) { return false; }
}
let _scstEvictT = 0;
function _scstEvictSoon() { if (_scstEvictT) return; _scstEvictT = setTimeout(() => { _scstEvictT = 0; _scstEvict().catch(() => {}); }, 4000); }
/** Drop entries nobody used for SCENE_STORE_MAX_IDLE_MS, then the least recently used until the store fits its budget. */
async function _scstEvict() {
  const db = await _scstDb();
  if (!db) return 0;
  const all = await _scstReq(db.transaction('meta', 'readonly').objectStore('meta').index('used').getAll());
  const now = Date.now(), drop = [];
  let total = all.reduce((n, m) => n + (m.bytes || 0), 0);
  for (const m of all) {   // least recently used first (the index order)
    if (now - (m.used || m.at || 0) > SCENE_STORE_MAX_IDLE_MS || total > SCENE_STORE_MAX_BYTES) { drop.push(m.k); total -= m.bytes || 0; }
  }
  if (!drop.length) return 0;
  const tx = db.transaction(['data', 'meta'], 'readwrite');
  for (const k of drop) { tx.objectStore('data').delete(k); tx.objectStore('meta').delete(k); }
  await _scstDone(tx);
  return drop.length;
}
async function sceneStoreStats() {
  const db = await _scstDb();
  if (!db) return { entries: 0, bytes: 0 };
  const all = await _scstReq(db.transaction('meta', 'readonly').objectStore('meta').getAll());
  return { entries: all.length, bytes: all.reduce((n, m) => n + (m.bytes || 0), 0), keys: all.map(m => m.k) };
}

/* ---------- encoding (a worker where the page allows one) and decoding ---------- */
const _SCST_WORKER_SRC = `self.onmessage = async (e) => {
  const { id, bitmaps } = e.data, out = [];
  try {
    for (const b of bitmaps) {
      const c = new OffscreenCanvas(b.width, b.height), x = c.getContext('2d');
      x.drawImage(b, 0, 0); b.close();
      out.push(await c.convertToBlob({ type: 'image/png' }));
    }
    self.postMessage({ id, blobs: out });
  } catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
};`;
/** The encoder worker, or null (no Worker, or the page's CSP refuses blob: workers: the main thread's async encoder instead). */
function _scstWorker() {
  if (_scstWk !== undefined) return _scstWk;
  _scstWk = null;
  try {
    if (typeof Worker !== 'function' || typeof Blob !== 'function' || typeof URL === 'undefined') return null;
    const url = URL.createObjectURL(new Blob([_SCST_WORKER_SRC], { type: 'text/javascript' }));
    const w = new Worker(url);
    w.onmessage = (e) => { const j = _scstWkJobs.get(e.data.id); if (!j) return; _scstWkJobs.delete(e.data.id); if (e.data.error) j.rej(new Error(e.data.error)); else j.res(e.data.blobs); };
    w.onerror = () => { for (const j of _scstWkJobs.values()) j.rej(new Error('worker failed')); _scstWkJobs.clear(); _scstWk = null; };
    _scstWk = w;
  } catch (e) { _scstWk = null; }
  return _scstWk;
}
/** PNG blobs of canvases (OffscreenCanvas or canvas elements), in order. Lossless (premultiplied alpha survives the round trip). */
async function sceneStoreEncode(canvases) {
  const w = _scstWorker();
  if (w) {
    try {
      const bitmaps = await Promise.all(canvases.map(c => createImageBitmap(c)));
      const id = ++_scstWkId;
      return await new Promise((res, rej) => { _scstWkJobs.set(id, { res, rej }); w.postMessage({ id, bitmaps }, bitmaps); });
    } catch (e) { /* the worker failed: the main thread's encoder below */ }
  }
  const out = [];
  for (const c of canvases) {
    if (typeof c.convertToBlob === 'function') out.push(await c.convertToBlob({ type: 'image/png' }));
    else out.push(await new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('toBlob'))), 'image/png')));
  }
  return out;
}
/** ImageBitmaps of PNG blobs (decoded off the main thread), in order; a blob that fails gives null. */
function sceneStoreDecode(blobs) {
  return Promise.all(blobs.map(b => (b ? createImageBitmap(b).catch(() => null) : Promise.resolve(null))));
}
