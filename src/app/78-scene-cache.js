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

   The version is a SHA-1 of the app's own script (the engine, the object library and the scenes are in it), so any code
   change invalidates every entry. The light key carries the season, the quantised light and every pass's own key, exactly
   what the renderer re-bakes on, so a restored bake is the bake the renderer would make. Entries are evicted least recently
   used past SCENE_STORE_MAX_BYTES and after SCENE_STORE_MAX_AGE_MS. Encoding runs in a worker where the page allows one
   (CSP worker-src blob:), else in the browser's own async encoder; decoding is createImageBitmap (off the main thread).

     sceneStoreOn()                       IndexedDB, createImageBitmap and canvas encoding are there (and not switched off)
     sceneStoreVersion()                  Promise<string>
     sceneStoreGet(key)                   Promise<record | null>   (touches its use time)
     sceneStorePut(record, bytes)         Promise<boolean>         record: { k, ... }; evicts afterwards
     sceneStoreEncode(canvases)           Promise<Blob[]>          PNG blobs of canvases (a worker where it can)
     sceneStoreDecode(blobs)              Promise<ImageBitmap[]>
     sceneStoreClear()  sceneStoreStats() Promise
   window.__sceneStoreOff = true (tests, tools) turns it off for the page.
   ============================================================ */
const SCENE_STORE_DB = 'opendash-scenes', SCENE_STORE_FORMAT = 1;
const SCENE_STORE_MAX_BYTES = 480 * 1024 * 1024, SCENE_STORE_MAX_AGE_MS = 4 * 24 * 3600 * 1000;
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
/** A SHA-1 of the app script (+ the format): any engine, library or scene change gives a new version. */
function sceneStoreVersion() {
  if (_scstVer) return _scstVer;
  _scstVer = (async () => {
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
  try {
    const db = await _scstDb();
    if (!db) return null;
    const tx = db.transaction(['data', 'meta'], 'readonly');
    const [rec, meta] = await Promise.all([_scstReq(tx.objectStore('data').get(key)), _scstReq(tx.objectStore('meta').get(key))]);
    if (!rec || !meta) return null;
    const now = Date.now();
    if (now - meta.at > SCENE_STORE_MAX_AGE_MS) return null;
    if (now - meta.used > 3600000) { try { const t2 = db.transaction('meta', 'readwrite'); t2.objectStore('meta').put(Object.assign({}, meta, { used: now })); } catch (e) { /* next time */ } }
    return rec;
  } catch (e) { return null; }
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
/** Drop entries older than the max age, then the least recently used until the store fits. */
async function _scstEvict() {
  const db = await _scstDb();
  if (!db) return 0;
  const all = await _scstReq(db.transaction('meta', 'readonly').objectStore('meta').index('used').getAll());
  const now = Date.now(), drop = [];
  let total = all.reduce((n, m) => n + (m.bytes || 0), 0);
  for (const m of all) {   // oldest use first (the index order)
    if (now - m.at > SCENE_STORE_MAX_AGE_MS || total > SCENE_STORE_MAX_BYTES) { drop.push(m.k); total -= m.bytes || 0; }
  }
  if (!drop.length) return 0;
  const tx = db.transaction(['data', 'meta'], 'readwrite');
  for (const k of drop) { tx.objectStore('data').delete(k); tx.objectStore('meta').delete(k); }
  await _scstDone(tx);
  return drop.length;
}
async function sceneStoreClear() {
  const db = await _scstDb();
  if (!db) return false;
  const tx = db.transaction(['data', 'meta'], 'readwrite');
  tx.objectStore('data').clear(); tx.objectStore('meta').clear();
  await _scstDone(tx);
  return true;
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
