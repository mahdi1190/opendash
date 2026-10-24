// lib/sync/blobs.mjs - people's pictures and story narration audio between
// devices: a content-addressed, encrypted BLOB channel next to the JSON sync
// (docs/dev/SYNC_FORMAT.md section 12).
//
// PLATFORM-AGNOSTIC: no node: imports; SHA-256 and AES-GCM through Web Crypto
// (lib/sync/e2e-crypto.mjs, lib/sync/e2e.mjs). The engine (lib/sync/engine.mjs)
// creates the channel and hands it its adapters:
//   host.data    readBytes / writeBytes / statBytes / list (the data folder's
//                binary files; the host refuses anything blobKind() does not name) and
//                readJson / updateJson (the catalogue, under its lock)
//   host.local   this device's own blobs.json (hashes of its files, what it saw)
//   transport    writeOwnBlob / readBlob / statBlob / listOwnBlobs / removeOwnBlob /
//                listDevices (lib/sync/folder.mjs: devices/<id>/blobs/<xx>/<locator>)
//   e2e          sealBlob / openBlob / blobLocator / hasKey (the group's keys)
//
// THE MODEL
//   blob        the bytes of one file. Its ID is the SHA-256 of those bytes
//               (64 hex). Sealed with the sync key (AES-GCM, AD = group + id +
//               key id) and written ONCE, by a device that has the file, into
//               its OWN folder (devices/<id>/blobs/: the one-writer rule holds;
//               two devices that both upload one simply hold two copies, and
//               readers take whichever they find). Its name there is a keyed
//               LOCATOR, not the id, so the folder cannot test for a picture.
//   catalogue   blobs/index.json, a synced file (lib/sync/manifest.mjs 'blobs',
//               encrypted sync only): {v: 1, blobs: {<ref>: {id, size, kind,
//               at, by, kid, re?}}}, one register per file (ref =
//               'people/images/<name>' or 'cache/narration/<id>.mp3'; by = the
//               device whose folder holds it, kid = the key it is sealed with).
//               It travels in the encrypted log like every synced file.
//   references  a person's photo / cover ('file:<name>', synced with the
//               person) names a picture: the later reference wins like any
//               field. A narration clip is its own reference, a cache entry
//               marked re-creatable (re: true).
//   fetching    lazily: the first time a file is asked for and is missing here
//               (a People card shows the picture, a story plays the clip). Any
//               device's folder may hold it (dedupe on read); the bytes are
//               checked against the id after opening and only then written into
//               this data folder. One that fails is dropped and fetched again
//               once the folder brings another copy. Not there yet: the page
//               shows its normal placeholder and gets the picture when it
//               arrives (onArrived -> 'synced-files'). Live sync carries small
//               new blobs at once (deliverLive).
//   budget      5 MB per blob, 200 MB per group (the catalogue's distinct ids).
//               Narration is stored only while the group is under 75 % of it
//               (and not in trial mode), and is pruned first (and after 45
//               days); a picture nobody shows any more goes a week after this
//               device first saw it unreferenced; a picture someone shows is
//               never pruned: a full budget stops new uploads, and the status says so.
//               Only a device that uses the others' changes (apply) prunes.

import { sha256, hex, b64u, unb64u } from './e2e-crypto.mjs';

export const BLOBS_REL = 'blobs/index.json';
export const BLOB_MAX = 5 * 1024 * 1024;              // per blob
export const GROUP_BUDGET = 200 * 1024 * 1024;        // per group, the catalogue's distinct blobs
export const TIGHT = 0.75;                            // narration stops above this share of the budget
export const LIVE_BLOB_MAX = 1536 * 1024;             // live sync pushes blob files up to this size
export const BLOB_ID_RE = /^[0-9a-f]{64}$/;
// A stored picture's name: the same rule as src/app/54-people-card-logic.js PC_IMG_NAME_RE (its
// 16 hex digits are the start of the SHA-256 of the picture, lib/people-images.mjs).
const IMG_NAME_RE = /^[a-z0-9][a-z0-9-]{0,59}-(avatar|cover)-([0-9a-f]{16})\.(png|jpg|webp|gif)$/;
const AUDIO_NAME_RE = /^[a-f0-9]{64}\.mp3$/;          // lib/narration.mjs cache/narration/<id>.mp3
export const BLOB_DIRS = Object.freeze({ picture: 'people/images', narration: 'cache/narration', receipt: 'expenses/receipts' });
const PIC_PREFIX = 'people/images/', AUDIO_PREFIX = 'cache/narration/', RECEIPT_PREFIX = 'expenses/receipts/';
const RECEIPT_NAME_RE = /^rc-[0-9a-f]{16}\.(pdf|png|jpg|webp|gif)$/;   // lib/expenses.mjs RECEIPT_RE (16 hex = the start of the file's SHA-256)
const DEV_RE = /^[0-9a-f]{16}$/, KID_RE = /^[0-9a-f]{16}$/;
const UNREF_GRACE_MS = 7 * 86400000;
const NARRATION_KEEP_MS = 45 * 86400000;
const MAINTAIN_MS = 60 * 1000;                        // a look at the files at least this often
const DIRTY_MIN_MS = 5 * 1000;                        // ...and at most this often when something changed
const RUN_UPLOAD_BYTES = 32 * 1024 * 1024;            // per run (the rest next time)
const RUN_HASH_BYTES = 64 * 1024 * 1024;
const MAX_FILES = 5000;
const WANT_MAX_MS = 2 * 60 * 60 * 1000;               // a missing file is looked for this long after it was asked for
const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const errMsg = (e) => String((e && (e.code || e.message)) || e).slice(0, 120);

/** 'picture' | 'narration' | null: what a data-folder path is to the blob channel. */
export function blobKind(ref) {
  const s = String(ref || '');
  if (s.startsWith(PIC_PREFIX) && IMG_NAME_RE.test(s.slice(PIC_PREFIX.length))) return 'picture';
  if (s.startsWith(AUDIO_PREFIX) && AUDIO_NAME_RE.test(s.slice(AUDIO_PREFIX.length))) return 'narration';
  if (s.startsWith(RECEIPT_PREFIX) && RECEIPT_NAME_RE.test(s.slice(RECEIPT_PREFIX.length))) return 'receipt';   // ── expenses ──
  return null;
}
/** A picture's name carries the first 16 hex digits of its hash: the id must start with them. */
function idFitsName(ref, id) {
  if (ref.startsWith(RECEIPT_PREFIX)) return id.startsWith(ref.slice(RECEIPT_PREFIX.length + 3, RECEIPT_PREFIX.length + 19));
  if (!ref.startsWith(PIC_PREFIX)) return true;
  const m = IMG_NAME_RE.exec(ref.slice(PIC_PREFIX.length));
  return !!m && id.startsWith(m[2]);
}
/** The pictures the people in a state show: Set of 'people/images/<name>'. */
export function pictureRefs(state) {
  const out = new Set();
  for (const p of Array.isArray(state && state.people) ? state.people : []) {
    if (!isObj(p)) continue;
    for (const f of ['photo', 'cover']) {
      const v = p[f];
      if (typeof v === 'string' && v.startsWith('file:') && IMG_NAME_RE.test(v.slice(5))) out.add(PIC_PREFIX + v.slice(5));
    }
  }
  return out;
}

/** A catalogue entry as stored, checked; null for anything else. */
export function cleanEntry(ref, e) {
  const kind = blobKind(ref);
  if (!kind || !isObj(e)) return null;
  if (!BLOB_ID_RE.test(e.id || '') || !Number.isSafeInteger(e.size) || e.size < 1 || e.size > BLOB_MAX) return null;
  if (!DEV_RE.test(e.by || '') || !KID_RE.test(e.kid || '') || !idFitsName(ref, e.id)) return null;
  const at = typeof e.at === 'string' && Number.isFinite(Date.parse(e.at)) ? e.at : new Date(0).toISOString();
  return { id: e.id, size: e.size, kind, at, by: e.by, kid: e.kid, ...(kind === 'narration' ? { re: true } : {}) };
}
/** The catalogue file's value -> Map(ref -> entry), valid entries only. */
export function catalogueOf(value) {
  const out = new Map();
  const b = isObj(value) && isObj(value.blobs) ? value.blobs : {};
  for (const ref of Object.keys(b).slice(0, MAX_FILES * 2)) { const e = cleanEntry(ref, b[ref]); if (e) out.set(ref, e); }
  return out;
}

// ─── The blob file: a one-line JSON header, then the sealed bytes ─────────
const te = new TextEncoder(), td = new TextDecoder();
/** {kid, iv, ct} -> the file's bytes: '{"v":2,"t":"blob","k":<kid>,"iv":<b64u>}\n' + ct. */
export function encodeBlobFile({ kid, iv, ct }) {
  const head = te.encode(JSON.stringify({ v: 2, t: 'blob', k: kid, iv: b64u(iv) }) + '\n');
  const out = new Uint8Array(head.length + ct.length);
  out.set(head, 0); out.set(ct, head.length);
  return out;
}
/** The file's bytes -> {kid, iv, ct}, or null (not a blob file: half delivered, or something else). */
export function decodeBlobFile(bytes) {
  if (!bytes || bytes.length < 60) return null;
  const n = Math.min(bytes.length, 512);
  let i = 0;
  while (i < n && bytes[i] !== 0x0a) i++;
  if (i >= n) return null;
  let h;
  try { h = JSON.parse(td.decode(bytes.subarray(0, i))); } catch { return null; }
  if (!isObj(h) || h.v !== 2 || h.t !== 'blob' || !KID_RE.test(h.k || '')) return null;
  const iv = unb64u(h.iv);
  if (!iv || iv.length !== 12) return null;
  const ct = bytes.subarray(i + 1);
  return ct.length >= 16 ? { kid: h.k, iv, ct } : null;
}
const sha256hex = async (b) => hex(await sha256(b));
const mb = (n) => { const v = n / (1024 * 1024); return `${v > 0 && v < 10 ? (Math.round(v * 10) / 10) : Math.round(v)} MB`; };

/**
 * The channel. adapter() is the engine's current transport (or null), me() this
 * device's id, ready() "encrypted sync is on and this device holds the key",
 * apply() "the others' changes are used here", isMember(id), readState() the
 * state (for the pictures people show, when the engine has not said yet).
 * onChange() the catalogue changed here (the engine sends it), onArrived(refs)
 * files arrived in this data folder (open tabs show them).
 */
export function createBlobChannel({
  host, e2e, adapter, me, ready, apply = () => true, isMember = () => true, readState = async () => null,
  log = () => {}, now = () => Date.now(), onChange = () => {}, onArrived = () => {},
} = {}) {
  if (!host || !e2e || !adapter) throw new Error('createBlobChannel needs {host, e2e, adapter}');
  const L = host.local;
  let local = null;               // {v, files: {ref: {s, id}}, known: {ref: ms}, unref: {ref: ms}}
  let localDirty = false;
  let picRefs = null;             // the pictures the state shows, as the engine last saw it
  let dirty = true, lastRun = 0, running = null;
  let usage = null;               // {used, files, pictures, audio, full, tight, at}
  const wanted = new Map();       // ref -> {since, next, tries}
  const bad = new Map();          // "<dev>/<loc>" -> the stamp of a copy that failed its check
  const inflight = new Map();     // ref -> Promise<boolean>
  const pushListeners = new Set();
  const stats = { uploaded: 0, fetched: 0, dropped: 0, live: 0, pruned: 0 };
  let lastWarn = 0;

  // ─── This device's bookkeeping (host.local blobs.json) ────────────────
  async function loadLocal() {
    if (local) return local;
    let v = null;
    try { const t = L && (await L.read('blobs.json')); v = t ? JSON.parse(t) : null; } catch { v = null; }
    local = { v: 1, files: isObj(v && v.files) ? v.files : {}, known: isObj(v && v.known) ? v.known : {}, unref: isObj(v && v.unref) ? v.unref : {} };
    return local;
  }
  async function saveLocal() {
    if (!localDirty || !local || !L) return;
    // bounded: the newest entries of each map
    for (const k of ['known', 'unref']) {
      const ent = Object.entries(local[k]);
      if (ent.length > MAX_FILES) local[k] = Object.fromEntries(ent.sort((a, b) => b[1] - a[1]).slice(0, MAX_FILES));
    }
    localDirty = false;
    await L.write('blobs.json', JSON.stringify(local)).catch(() => { localDirty = true; });
  }
  function noteFile(ref, size, id) { local.files[ref] = { s: size, id }; localDirty = true; }

  // ─── What this computer has ───────────────────────────────────────────
  async function scanLocal() {
    const out = new Map();
    for (const [kind, dir] of Object.entries(BLOB_DIRS)) {
      const names = await host.data.list(dir).catch(() => []);
      let n = 0;
      for (const name of names || []) {
        const ref = `${dir}/${name}`;
        if (blobKind(ref) !== kind) continue;
        if (++n > MAX_FILES) break;
        const st = await host.data.statBytes(ref).catch(() => null);
        if (st && st.size > 0) out.set(ref, st);
      }
    }
    for (const ref of Object.keys(local.files)) if (!out.has(ref)) { delete local.files[ref]; localDirty = true; }
    return out;
  }
  /** The id of a local file (its SHA-256), hashed once per size (the names never change content). */
  async function idOf(ref, st, budget) {
    const f = local.files[ref];
    if (f && f.s === st.size && BLOB_ID_RE.test(f.id || '')) return f.id;
    if (budget.hash + st.size > RUN_HASH_BYTES) { dirty = true; return null; }
    const bytes = await host.data.readBytes(ref, BLOB_MAX).catch(() => null);
    if (!bytes) return null;
    budget.hash += bytes.length;
    const id = await sha256hex(bytes);
    if (!idFitsName(ref, id)) return null;          // not the picture its name says: never sent
    noteFile(ref, bytes.length, id);
    return id;
  }

  // ─── Opening a blob file ──────────────────────────────────────────────
  /** Plaintext bytes that hash to `id`, {wait: true}, or null (changed, cut short, or not this blob). */
  async function openFile(id, fileBytes, size = null) {
    const f = decodeBlobFile(fileBytes);
    if (!f) return null;
    const plain = await e2e.openBlob(id, f);
    if (plain && plain.wait) return plain;
    if (!plain || plain.length > BLOB_MAX || (size != null && plain.length !== size)) return null;
    return (await sha256hex(plain)) === id ? plain : null;
  }
  function dropped(what) {
    stats.dropped++;
    if (now() - lastWarn > 60000) { lastWarn = now(); log('warn', `sync: a ${what} in the sync folder failed its check; it was dropped and will be fetched again`); }
  }

  // ─── Keeping the folder in step (each pass, throttled) ───────────────
  async function runMaintain() {
    const ad = adapter();
    const myId = me();
    if (!ad || !myId) return;
    await loadLocal();
    const cr = await host.data.readJson(BLOBS_REL).catch(() => ({ error: 'unreadable' }));
    if (!cr || cr.error) { dirty = true; return; }   // being written: next time
    const cat = catalogueOf(cr.present ? cr.value : null);
    const files = await scanLocal();
    if (!picRefs) { try { picRefs = pictureRefs(await readState()); } catch { picRefs = null; } }
    const pics = picRefs || new Set();
    const ownBlobs = new Map((await ad.listOwnBlobs().catch(() => [])).map(b => [b.loc, b]));
    const t = now(), iso = new Date(t).toISOString();
    const budget = { hash: 0, upload: 0 };
    // Distinct blobs and what they take (several names may share one blob).
    const ids = new Map();            // id -> {size, n}
    let used = 0;
    const count = (e, d) => {
      if (d < 0 && !ids.has(e.id)) return;
      const x = ids.get(e.id) || { size: e.size, n: 0 };
      x.n += d;
      if (x.n === 1 && d === 1) used += e.size;
      if (x.n === 0 && d === -1) used -= x.size;
      if (x.n > 0) ids.set(e.id, x); else ids.delete(e.id);
    };
    for (const e of cat.values()) count(e, 1);
    const adds = new Map(), dels = new Set();
    const put = (ref, e) => { const o = cat.get(ref); if (o) count(o, -1); cat.set(ref, e); count(e, 1); adds.set(ref, e); dels.delete(ref); };
    const del = (ref) => { const o = cat.get(ref); if (!o) return; count(o, -1); cat.delete(ref); dels.add(ref); adds.delete(ref); stats.pruned++; };
    const locOf = (e) => e2e.blobLocator(e.id, e.kid);
    /** Is the blob there? Ours: in our folder. Another member's: taken on trust (it puts it back itself). */
    const held = async (e) => (e.by === myId ? ownBlobs.has(await locOf(e)) : isMember(e.by) && e2e.hasKey(e.kid));
    async function heldEntry(id) {
      for (const e of cat.values()) if (e.id === id && await held(e)) return e;
      return null;
    }
    let full = false, tight = false;
    const pushes = [];                // small new blobs for live sync
    async function upload(ref, id, size, kind) {
      // Already in the folder under another name (the same picture twice): the same blob.
      const same = await heldEntry(id);
      if (same) { put(ref, { id, size: same.size, kind, at: iso, by: same.by, kid: same.kid, ...(kind === 'narration' ? { re: true } : {}) }); return; }
      const limit = kind === 'narration' ? TIGHT * GROUP_BUDGET : GROUP_BUDGET;
      if (used + size > limit) { if (kind === 'narration') tight = true; else full = true; return; }
      if (budget.upload + size > RUN_UPLOAD_BYTES) { dirty = true; return; }
      const bytes = await host.data.readBytes(ref, BLOB_MAX).catch(() => null);
      if (!bytes || bytes.length !== size || (await sha256hex(bytes)) !== id) { delete local.files[ref]; localDirty = true; return; }   // changed: hashed again next time
      const sealed = await e2e.sealBlob(id, bytes);
      if (!sealed) return;
      const loc = await e2e.blobLocator(id, sealed.kid);
      const file = encodeBlobFile(sealed);
      await ad.writeOwnBlob(loc, file);
      ownBlobs.set(loc, { loc, size: file.length });
      budget.upload += size; stats.uploaded++;
      const e = { id, size, kind, at: iso, by: myId, kid: sealed.kid, ...(kind === 'narration' ? { re: true } : {}) };
      put(ref, e);
      if (file.length <= LIVE_BLOB_MAX) pushes.push({ t: 'blob', v: 1, ref, id, kind, data: b64u(file) });
    }

    // 1. Pictures someone shows, that this computer has and the folder does not.
    for (const ref of pics) {
      const st = files.get(ref);
      if (!st || st.size > BLOB_MAX) continue;
      const e = cat.get(ref);
      if (e && await held(e)) continue;
      const id = await idOf(ref, st, budget);
      if (!id || (e && e.id !== id)) continue;
      await upload(ref, id, st.size, 'picture');
    }
    // 1b. Receipts (expenses): every one this computer has, once; never pruned (an expense names it).
    for (const [ref, st] of files) {
      if (blobKind(ref) !== 'receipt' || st.size > BLOB_MAX) continue;
      const e = cat.get(ref);
      if (e && await held(e)) continue;
      const id = await idOf(ref, st, budget);
      if (!id || (e && e.id !== id)) continue;
      await upload(ref, id, st.size, 'receipt');
    }
    // 2. Narration clips: a re-creatable cache. Each clip once (a clip pruned from the
    // folder is not sent again), only while there is room, never in trial mode.
    for (const [ref, e] of cat) if (e.kind === 'narration' && !own(local.known, ref)) { local.known[ref] = t; localDirty = true; }
    if (apply()) {
      for (const [ref, st] of files) {
        if (blobKind(ref) !== 'narration' || st.size > BLOB_MAX) continue;
        const e = cat.get(ref);
        if (e ? await held(e) : own(local.known, ref)) continue;
        const id = await idOf(ref, st, budget);
        if (!id || (e && e.id !== id)) continue;
        await upload(ref, id, st.size, 'narration');
        if (cat.has(ref)) { local.known[ref] = t; localDirty = true; }
      }
    }
    // 3. Pruning (a device that uses the others' changes: its state shows what is referenced).
    if (apply() && cr.present) {
      for (const [ref, e] of [...cat]) {
        if (e.kind !== 'picture') continue;
        if (pics.has(ref)) { if (own(local.unref, ref)) { delete local.unref[ref]; localDirty = true; } continue; }
        if (!own(local.unref, ref)) { local.unref[ref] = t; localDirty = true; }
        if (t - local.unref[ref] >= UNREF_GRACE_MS) del(ref);
      }
      const byAge = (kind, keep = () => false) => [...cat].filter(([r, e]) => e.kind === kind && !keep(r)).sort((a, b) => (a[1].at < b[1].at ? -1 : a[1].at > b[1].at ? 1 : 0));
      for (const [ref, e] of byAge('narration')) if (t - Date.parse(e.at) > NARRATION_KEEP_MS) del(ref);
      for (const [ref] of byAge('narration')) { if (used <= TIGHT * GROUP_BUDGET) break; del(ref); }
      for (const [ref] of byAge('picture', (r) => pics.has(r))) { if (used <= GROUP_BUDGET) break; del(ref); }
    }
    for (const r of Object.keys(local.unref)) if (!cat.has(r)) { delete local.unref[r]; localDirty = true; }

    // 4. The catalogue, then this device's blobs that nothing names any more.
    let final = cr.present ? cr.value : null;
    if (adds.size || dels.size) {
      try {
        final = await host.data.updateJson(BLOBS_REL, (v) => {
          const out = isObj(v) ? v : {};
          out.v = 1;
          out.blobs = isObj(out.blobs) ? out.blobs : {};
          for (const r of dels) delete out.blobs[r];
          for (const [r, e] of adds) out.blobs[r] = e;
          return out;
        });
        onChange();
      } catch (e) { dirty = true; log('info', `sync: the pictures and audio list could not be saved yet (${errMsg(e)})`); final = null; }
    }
    if (final && (cr.present || adds.size)) {
      const keep = new Set();
      for (const e of catalogueOf(final).values()) if (e.by === myId) { const l = await locOf(e); if (l) keep.add(l); }
      for (const loc of ownBlobs.keys()) if (!keep.has(loc)) await ad.removeOwnBlob(loc).catch(() => {});
    }
    usage = summarize(final ? catalogueOf(final) : cat, { full, tight });
    await saveLocal();
    for (const m of pushes) for (const fn of pushListeners) { try { fn(m); } catch { /* a listener never breaks sync */ } }
  }
  function summarize(cat, { full = false, tight = false } = {}) {
    const seen = new Map();
    let pictures = 0, audio = 0, receipts = 0;
    for (const e of cat.values()) {
      if (e.kind === 'picture') pictures++; else if (e.kind === 'receipt') receipts++; else audio++;
      if (!seen.has(e.id)) seen.set(e.id, e.size);
    }
    const used = [...seen.values()].reduce((a, b) => a + b, 0);
    return { used, files: cat.size, pictures, audio, receipts, full: full || used >= GROUP_BUDGET, tight: tight || used >= TIGHT * GROUP_BUDGET, at: now() };
  }

  /** One look at the files (throttled; forced after a local change or when asked). */
  function maintain({ force = false } = {}) {
    if (!ready()) return Promise.resolve(null);
    if (running) return running;
    const since = now() - lastRun;
    if (!force && !(dirty && since >= DIRTY_MIN_MS) && since < MAINTAIN_MS) return Promise.resolve(null);
    dirty = false; lastRun = now();
    running = runMaintain().catch((e) => { dirty = true; log('warn', `sync: pictures and audio: ${errMsg(e)}`); }).finally(() => { running = null; });
    return running;
  }

  // ─── Fetching a file another device has ──────────────────────────────
  function want(ref) {
    const w = wanted.get(ref);
    const t = now();
    if (!w) wanted.set(ref, { since: t, next: t + 5000, tries: 1 });
    else { w.tries++; w.next = t + Math.min(5 * 60 * 1000, 5000 * 2 ** Math.min(6, w.tries - 1)); }
    if (wanted.size > 500) wanted.delete(wanted.keys().next().value);
  }
  async function fetchNow(ref) {
    if (await host.data.statBytes(ref).catch(() => null)) return true;
    if (!ready()) return false;
    const ad = adapter();
    if (!ad) return false;
    const cr = await host.data.readJson(BLOBS_REL).catch(() => null);
    const e = cr && cr.present && isObj(cr.value) && isObj(cr.value.blobs) ? cleanEntry(ref, cr.value.blobs[ref]) : null;
    if (!e || !e2e.hasKey(e.kid)) { want(ref); return false; }    // not in the folder yet (or its key is on the way)
    const loc = await e2e.blobLocator(e.id, e.kid);
    if (!loc) { want(ref); return false; }
    const devs = [e.by, ...(await ad.listDevices().catch(() => [])).filter(d => d !== e.by)];
    for (const dev of devs) {
      const st = await ad.statBlob(dev, loc).catch(() => null);
      if (!st) continue;
      const bk = `${dev}/${loc}`, stamp = `${st.size}:${st.mtimeMs}`;
      if (bad.get(bk) === stamp) continue;              // this copy failed before: wait for another
      const bytes = await ad.readBlob(dev, loc, BLOB_MAX + 4096).catch(() => null);
      if (!bytes) continue;
      const plain = await openFile(e.id, bytes, e.size);
      if (plain && plain.wait) { want(ref); return false; }
      if (!plain) { bad.set(bk, stamp); if (bad.size > 2000) bad.delete(bad.keys().next().value); dropped(e.kind === 'picture' ? 'picture' : 'narration clip'); continue; }
      if (!(await host.data.statBytes(ref).catch(() => null))) await host.data.writeBytes(ref, plain);
      await loadLocal();
      noteFile(ref, plain.length, e.id);
      if (e.kind === 'narration') local.known[ref] = now();
      wanted.delete(ref);
      stats.fetched++;
      return true;
    }
    want(ref);
    return false;
  }
  /**
   * Make sure a file is in this data folder: true when it is (it was, or it was
   * fetched now). waitMs: answer false after that long and carry on in the
   * background (onArrived tells the open tabs when it is here).
   */
  async function fetch(ref, { waitMs = Infinity } = {}) {
    if (!blobKind(ref)) return false;
    let p = inflight.get(ref);
    if (!p) {
      p = fetchNow(ref).catch((e) => { log('info', `sync: a picture or audio clip could not be fetched (${errMsg(e)})`); want(ref); return false; }).finally(() => inflight.delete(ref));
      inflight.set(ref, p);
    }
    if (!Number.isFinite(waitMs)) return p;
    let settled = false;
    const r = await Promise.race([p.then((v) => { settled = true; return v; }), new Promise((res) => { const tm = setTimeout(() => res(false), Math.max(0, waitMs)); if (tm && typeof tm.unref === 'function') tm.unref(); })]);
    if (!settled) p.then((ok) => { if (ok) onArrived([ref]); }, () => {});
    return r === true;
  }
  /** Files asked for and not here yet: try again (backing off), and tell the tabs when they arrive. */
  function retryWanted({ soon = false } = {}) {
    if (!ready() || !wanted.size) return;
    const t = now();
    for (const [ref, w] of [...wanted]) {
      if (t - w.since > WANT_MAX_MS) { wanted.delete(ref); continue; }
      if (soon) w.next = Math.min(w.next, t);
      if (w.next > t || inflight.has(ref)) continue;
      fetch(ref).then((ok) => { if (ok) onArrived([ref]); }, () => {});
    }
  }

  // ─── Live sync: a small new blob, pushed by a connected member ───────
  async function deliverLive(m, from) {
    if (!ready() || !isObj(m) || !DEV_RE.test(from || '') || from === me() || !isMember(from)) return false;
    const ref = String(m.ref || ''), kind = blobKind(ref);
    if (!kind || !BLOB_ID_RE.test(m.id || '') || !idFitsName(ref, m.id) || typeof m.data !== 'string' || m.data.length > Math.ceil(LIVE_BLOB_MAX * 4 / 3) + 16) return false;
    if (await host.data.statBytes(ref).catch(() => null)) return true;
    const bytes = unb64u(m.data);
    const plain = bytes ? await openFile(m.id, bytes) : null;
    if (!plain || plain.wait) { if (!plain) dropped(kind === 'picture' ? 'picture' : 'narration clip'); return false; }
    await host.data.writeBytes(ref, plain);
    await loadLocal();
    noteFile(ref, plain.length, m.id);
    if (kind === 'narration') local.known[ref] = now();
    await saveLocal();
    wanted.delete(ref);
    stats.live++;
    onArrived([ref]);
    return true;
  }

  function status() {
    if (!ready()) return { on: false, text: 'Pictures and audio stay on each computer until sync is encrypted and this computer holds the key.' };
    const u = usage;
    if (!u) return { on: true, used: null, budget: GROUP_BUDGET, text: 'Pictures and audio: checking...' };
    const extra = u.full ? ' (full: new pictures stay on this computer)' : '';
    return {
      on: true, used: u.used, budget: GROUP_BUDGET, files: u.files, pictures: u.pictures, audio: u.audio, full: u.full, tight: u.tight,
      waiting: wanted.size, ...stats,
      text: `Pictures and audio: ${mb(u.used)} of ${mb(GROUP_BUDGET)}${extra}`,
    };
  }

  return {
    maintain, fetch, retryWanted, deliverLive, status,
    /** The state the engine just merged or captured: the pictures its people show. */
    noteState(state) {
      const next = pictureRefs(state);
      if (!picRefs || next.size !== picRefs.size || [...next].some(r => !picRefs.has(r))) { picRefs = next; dirty = true; }
    },
    /** A file was saved here (a new picture, a new clip): look at the files soon. */
    noteLocal() { dirty = true; },
    /** The catalogue arrived from another device: files asked for may be there now. */
    catalogueChanged() { dirty = true; retryWanted({ soon: true }); },
    onPush(fn) { pushListeners.add(fn); return () => pushListeners.delete(fn); },
    get due() { return dirty && now() - lastRun >= DIRTY_MIN_MS; },
    _debug: () => ({ local, usage, wanted, bad, picRefs, stats }),
  };
}
