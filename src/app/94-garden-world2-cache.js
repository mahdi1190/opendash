/* Local cache of compiled artwork. Keys include the complete drawing input;
 * this is disposable presentation data, never garden state or a save format. */
window.GardenTextureCache = (function () {
  'use strict';
  const name = 'freeflo-garden-art', store = 'textures', schema = 'native-1';
  const lowMemory = Number(navigator.deviceMemory) > 0 && Number(navigator.deviceMemory) <= 4;
  const budget = (lowMemory ? 48 : 128) * 1024 * 1024, maxEntries = 192;
  const pending = new Map();
  let opening = null, unavailable = false, running = false, timer = 0;
  const counts = { hits: 0, misses: 0, writes: 0, errors: 0, evictions: 0 };
  function database() {
    if (unavailable || !window.indexedDB) return Promise.resolve(null);
    if (opening) return opening;
    opening = new Promise(resolve => {
      let settled = false;
      const done = db => { if (settled) { if (db) db.close(); return; } settled = true; resolve(db); };
      try {
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'key' }); };
        request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); opening = null; }; done(db); };
        request.onerror = request.onblocked = () => { unavailable = true; done(null); };
      } catch (e) { unavailable = true; done(null); }
    });
    return opening;
  }
  async function key(source) {
    if (!window.crypto || !crypto.subtle || unavailable) return null;
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(schema + '|' + source)).then(bytes => [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('')).catch(() => null);
  }
  function requestValue(db, mode, operation) {
    return new Promise(resolve => {
      try {
        const transaction = db.transaction(store, mode), request = operation(transaction.objectStore(store));
        let value = null;
        request.onsuccess = () => { value = request.result; };
        transaction.oncomplete = () => resolve(value);
        transaction.onerror = transaction.onabort = () => resolve(null);
      } catch (e) { resolve(null); }
    });
  }
  async function get(id) {
    if (!id) return null;
    const db = await database(); if (!db) return null;
    const record = await requestValue(db, 'readonly', table => table.get(id));
    if (!record || !(record.blob instanceof Blob)) { counts.misses++; return null; }
    try {
      let image, close;
      if (typeof createImageBitmap === 'function') { image = await createImageBitmap(record.blob); close = () => image.close(); }
      else {
        const url = URL.createObjectURL(record.blob); image = new Image(); image.decoding = 'async'; image.src = url;
        try { await image.decode(); } finally { URL.revokeObjectURL(url); }
        close = () => { image.src = ''; };
      }
      if (image.width !== record.width || image.height !== record.height) { close(); counts.misses++; return null; }
      counts.hits++; return { image, meta: record.meta, close };
    } catch (e) { counts.misses++; return null; }
  }
  function idle() {
    return !document.hidden && !(typeof _gw !== 'undefined' && (_gw.moving || _gw.keys && _gw.keys.size || _gw.hold)) && !(typeof _gdp !== 'undefined' && (_gdp.pinch || _gdp.press));
  }
  function schedule() {
    if (timer || running || !pending.size || unavailable) return;
    timer = setTimeout(() => { timer = 0; if (!idle()) { schedule(); return; } drain(); }, 400);
  }
  function put(id, canvas, meta) {
    const bytes = canvas && canvas.width * canvas.height * 4;
    // Reading a large GPU-used canvas can block the UI even though PNG
    // encoding is asynchronous. Persist small reusable sprites; terrain stays
    // retained in the renderer without a disk-cache pixel readback.
    if (!id || !canvas || !bytes || bytes > 256 * 1024 || unavailable || pending.has(id)) return;
    // Keep only a few strong references to resident canvases. The renderer can
    // evict one before this idle write; a changed size simply skips that entry.
    if (pending.size >= 8) pending.delete(pending.keys().next().value);
    pending.set(id, { canvas, width: canvas.width, height: canvas.height, meta }); schedule();
  }
  async function prune(db, wanted) {
    const records = await new Promise(resolve => {
      const rows = [];
      try {
        const transaction = db.transaction(store, 'readonly'), request = transaction.objectStore(store).openCursor();
        request.onsuccess = () => { const c = request.result; if (c) { const v = c.value; rows.push({ key: v.key, bytes: v.bytes || 0, used: v.used || 0 }); c.continue(); } };
        transaction.oncomplete = () => resolve(rows); transaction.onerror = transaction.onabort = () => resolve([]);
      } catch (e) { resolve([]); }
    });
    let bytes = records.reduce((sum, row) => sum + row.bytes, 0), count = records.length;
    const remove = []; records.sort((a, b) => a.used - b.used);
    for (const row of records) { if (bytes + wanted <= budget && count < maxEntries) break; remove.push(row.key); bytes -= row.bytes; count--; }
    if (!remove.length) return;
    await new Promise(resolve => {
      try { const transaction = db.transaction(store, 'readwrite'), table = transaction.objectStore(store); for (const id of remove) table.delete(id); transaction.oncomplete = transaction.onerror = transaction.onabort = resolve; }
      catch (e) { resolve(); }
    });
    counts.evictions += remove.length;
  }
  async function drain() {
    if (running || !pending.size) return;
    running = true;
    const [id, entry] = pending.entries().next().value; pending.delete(id);
    try {
      const db = await database(); if (!db || entry.canvas.width !== entry.width || entry.canvas.height !== entry.height) return;
      const blob = await new Promise(resolve => { try { entry.canvas.toBlob(resolve, 'image/png'); } catch (e) { resolve(null); } });
      if (!blob || !idle()) return;
      const bytes = entry.width * entry.height * 4;
      await prune(db, bytes);
      const saved = await new Promise(resolve => {
        try {
          const transaction = db.transaction(store, 'readwrite');
          transaction.objectStore(store).put({ key: id, blob, meta: entry.meta, width: entry.width, height: entry.height, bytes, used: Date.now() });
          transaction.oncomplete = () => resolve(true); transaction.onerror = transaction.onabort = () => resolve(false);
        } catch (e) { resolve(false); }
      });
      if (saved) counts.writes++; else counts.errors++;
    } finally { running = false; schedule(); }
  }
  return Object.freeze({ key, get, put, status: () => ({ ...counts, pending: pending.size, writing: running, available: !unavailable && !!window.indexedDB, budgetBytes: budget }) });
})();
