// lib/sync/relay.mjs - device sync through the person's own OpenDash relay
// (docs/dev/RELAY_PROTOCOL.md section 5), so a shared cloud folder is optional.
//
// PLATFORM-AGNOSTIC CORE: no node: imports. It is a TRANSPORT for
// lib/sync/engine.mjs with exactly the folder transport's interface
// (lib/sync/folder.mjs createFolderAdapter, listed there), carrying the same
// sealed records, snapshots, device files and blobs. The relay keeps logs with
// the folder's semantics (file names, byte offsets), so the engine's offsets,
// dedupe and merge are unchanged.
//
//   createRelayAdapter({deviceId, local, mode, client, group, ...})
//     local   a folder transport holding THIS device's own files: the cloud
//             folder ('both': OneDrive and the relay at once) or a private
//             folder on this computer ('relay': no shared folder). Own files are
//             always written there first, then uploaded (an outbox: nothing is
//             lost while the relay is unreachable).
//     mode    'relay' | 'both'
//     client  () -> lib/sync/relay-client.mjs client signed with this device's
//             key and certificate, or null (no certificate yet: the device needs
//             the key to your relay, which a join code brings)
//     group   () -> {group, cap(kid?), caps()} once the device holds the sync key, else null
//
// READING. Other devices' files are the union of the cloud folder (in 'both')
// and the relay. A log is the same byte stream in both places (each device is
// its only writer and uploads its own file line by line), so the longer copy
// is read; for the JSON files the newer one. Changes arrive on the group's
// live socket (pushed within a moment); without it the changes feed is polled
// every 60 s (RELAY_PROTOCOL.md 7.7). Direct live sync (lib/sync/live/) stays
// first: a log change from a device that is live-connected does not wake a
// pass, its records already came straight from it.
//
// UNTRUSTED. The relay can drop, delay or replay; it cannot forge or read:
// every record, snapshot, device file and blob is sealed by lib/sync/e2e.mjs
// and checked there exactly as when read from a folder. Here: sizes are capped,
// offsets must add up (relay-client.mjs), the changes feed never goes back
// (`s`), and anything malformed is ignored.
//
// JOINING WITHOUT A FOLDER (the join link, RELAY_PROTOCOL.md 6): the computer
// that shows the code opens a random slot named in the link
// <origin>/j#ODJ1.<slot>.<seal>; both sides' pair.json travel there sealed with
// a key from <seal>, which the relay never sees, so it reads neither names nor
// keys, and the code never reaches it at all. The slot lives 2 minutes here
// (the relay's own limit is 10), takes one new device (a second one closes it:
// "Someone else tried this link"), and the existing computer still asks
// "Approve <name>?" before any key is sent.

import {
  RelayError, LOG_FILE_RE, SLOT_NAMES, SLOT_CAPS, DEV_RE, LOC_RE, BLOB_MAX,
  gidOf, joinKeyFor, sealJoinDoc, openJoinDoc, newJoinSecrets, joinLinkFor, anonymousSigner,
} from './relay-client.mjs';
import { utf8 } from './e2e-crypto.mjs';

export const POLL_MS = 60 * 1000;                 // the changes feed while the socket is down (7.7)
export const LINK_MS = 2 * 60 * 1000;             // a join link's slot lives this long at most
const BACKOFF_MIN = 30 * 1000, BACKOFF_MAX = 30 * 60 * 1000;   // 429, 503, 507, network (3.3)
const DENIED_RETRY_MS = 10 * 60 * 1000;
const APPEND_LINES = 400, APPEND_BYTES = 1536 * 1024;
const CACHE_FILE_BYTES = 1024 * 1024, CACHE_TOTAL_BYTES = 16 * 1024 * 1024;
const SOFT_HARD_MS = 25 * 60 * 1000;              // a device.json heartbeat is stored at least this often
const CERTS_MS = 24 * 3600 * 1000;
const ACK_MS = 10 * 60 * 1000;
const BLOBS_PER_FLUSH = 8, BLOB_BYTES_PER_FLUSH = 24 * 1024 * 1024;
const SLOT_FILE = { device: 'device.json', snapshot: 'snapshot.json', keys: 'keys.json', pair: 'pair.json' };
const FILE_SLOT = { 'device.json': 'device', 'snapshot.json': 'snapshot', 'keys.json': 'keys', 'pair.json': 'pair' };
const STATE_NAME = 'relay-state.json';
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : null);
const ulen = (s) => utf8(s).length;
/** Logs in the order they were written: by day, then part ("ops-20261024.jsonl" before "ops-20261024-01.jsonl"). */
export function logOrder(a, b) {
  const x = LOG_FILE_RE.exec(a), y = LOG_FILE_RE.exec(b);
  if (!x || !y) return a < b ? -1 : a > b ? 1 : 0;
  return x[1] !== y[1] ? (x[1] < y[1] ? -1 : 1) : Number(x[2] || 0) - Number(y[2] || 0);
}

export function createRelayAdapter({
  deviceId, local, mode = 'relay', origin, client: getClient, group: getGroup,
  state: store = null, now = () => Date.now(), log = () => {}, isLive = () => false,
  seed = null, onJoinEvent = () => {}, onDenied = null, anonClient = null, timers = globalThis,
}) {
  if (!local || !DEV_RE.test(deviceId || '')) throw new Error('createRelayAdapter needs {deviceId, local}');
  const say = (level, m) => { try { log(level, `sync (relay): ${m}`); } catch { /* fine */ } };
  // ── what this device has uploaded, and where it is in the feed (host.local relay-state.json)
  let st = { v: 1, origin, gid: null, dev: deviceId, s: 0, ackS: 0, ackAt: 0, certsAt: 0, enrolled: null, up: { logs: {}, slots: {}, blobs: {} }, diverged: {} };
  let stLoaded = false, stDirty = false;
  // ── the index of the group, from the relay
  const idx = { s: 0, floor: 0, devs: new Map(), at: 0, full: false };
  const lineCache = new Map();     // "<dev>/<file>" -> {start, end, lines: [{line, start, end}], bytes}
  let cacheBytes = 0;
  const slotBodies = new Map();    // "<dev>/<name>" -> {ver, text}
  const blobLists = new Map();     // dev -> {at, map: Map(loc -> {size, at})}
  const choice = new Map();        // "<dev>/<name>" -> 'f' | 'r' (where a file was read from)
  let gid = null, socket = null, socketState = 'off', socketTries = 0, socketTimer = null, wantSocket = false;
  let dirty = true, lastRefreshAt = 0, refreshing = null, flushing = null, flushAgain = false, flushTimer = null;
  let back = { until: 0, ms: 0, code: null, at: 0 };
  let lastOkAt = null, lastError = null, lastErrorAt = null, quota = null, tooBig = {};
  let seeded = !seed, seedRun = null;
  let outbox = { bytes: 0, files: 0, at: 0 };     // own changes not on the relay yet
  const watchers = new Set();
  // ── the join link
  let rv = null;   // {role: 'host'|'guest', secret, slot, key, link, origin, opened, exp, signer, docs: Map(dev -> {ver, doc}), state, lastGet, closeAt}

  // ─── State ──────────────────────────────────────────────────────────
  async function loadState() {
    if (stLoaded) return;
    stLoaded = true;
    if (!store) return;
    try {
      const t = await store.read(STATE_NAME);
      const o = t ? JSON.parse(t) : null;
      if (isObj(o) && o.v === 1 && o.origin === origin && o.dev === deviceId && isObj(o.up)) {
        st = { ...st, ...o, up: { logs: isObj(o.up.logs) ? o.up.logs : {}, slots: isObj(o.up.slots) ? o.up.slots : {}, blobs: isObj(o.up.blobs) ? o.up.blobs : {} }, diverged: isObj(o.diverged) ? o.diverged : {} };
      }
    } catch { /* a fresh start: uploads are idempotent (the relay skips lines it has) */ }
  }
  async function saveState() {
    if (!store || !stDirty) return;
    stDirty = false;
    try { await store.write(STATE_NAME, JSON.stringify(st)); } catch { stDirty = true; }
  }
  const touch = () => { stDirty = true; };

  // ─── Errors and back-off ────────────────────────────────────────────
  let quickEnrolAt = 0;
  function fail(e, what) {
    const code = (e && e.code) || 'relay-error';
    lastError = code; lastErrorAt = now();
    if (['rate', 'busy', 'quota', 'unreachable', 'relay-error', 'bad', 'too-large'].includes(code)) {
      const ms = e && e.retryAfterMs ? Math.max(e.retryAfterMs, 5000) : back.ms ? Math.min(back.ms * 2, BACKOFF_MAX) : BACKOFF_MIN;
      back = { until: now() + ms, ms, code, at: now() };
    } else if (['not-member', 'scope', 'auth', 'forbidden', 'gone'].includes(code)) {
      back = { until: now() + DENIED_RETRY_MS, ms: DENIED_RETRY_MS, code, at: now() };
      // Enrol again next time: after a renewal of the person's keys the group moves to the new identity on
      // enrolment ('gone': this device was removed from the group, and stays out).
      if ((code === 'forbidden' || code === 'not-member') && st.enrolled) {
        st.enrolled = null; touch();
        // soon, at most once in DENIED_RETRY_MS
        if (code === 'forbidden' && now() - quickEnrolAt > DENIED_RETRY_MS) { quickEnrolAt = now(); back = { until: now() + 2000, ms: 2000, code, at: now() }; }
      }
      // Another identity this computer holds may be the one the relay knows: try it soon.
      if (code === 'not-member' && typeof onDenied === 'function') Promise.resolve(onDenied()).then((moved) => { if (moved) back = { until: now() + 2000, ms: 2000, code, at: now() }; }).catch(() => {});
    }
    if (code === 'quota') quota = { at: now() };
    if (what) say('warn', `${what}: ${code}`);
  }
  function ok() { lastOkAt = now(); if (back.code) back = { until: 0, ms: 0, code: null, at: 0 }; lastError = null; if (quota && now() - quota.at > BACKOFF_MAX) quota = null; }
  const waiting = () => back.until && now() < back.until;

  // ─── The group ──────────────────────────────────────────────────────
  let noKey = false;               // no certificate here yet (this computer lacks the key to your relay)
  async function clientNow() { let c = null; try { c = (await getClient()) || null; } catch { c = null; } noKey = !c; return c; }
  async function groupNow() {
    let g = null;
    try { g = await getGroup(); } catch { g = null; }
    if (!g || !/^[0-9a-f]{16}$/.test(g.group || '')) return null;
    const id = await gidOf(g.group);
    if (gid !== id) {
      gid = id;
      idx.devs.clear(); idx.s = 0; idx.full = false; lineCache.clear(); cacheBytes = 0; slotBodies.clear(); blobLists.clear(); dirty = true;
      if (st.gid !== id) { st.gid = id; st.s = 0; st.ackS = 0; st.enrolled = null; st.up = { logs: {}, slots: {}, blobs: {} }; st.diverged = {}; touch(); }
      else idx.s = 0;
    }
    return g;
  }
  /** The relay's capability moves to our current key ('stale': another device already moved it further). */
  async function setCap(c, cur) {
    try { await c.setCap(gid, { kid: cur.kid, n: cur.n, cap: cur.cap }); }
    catch (e) { if (e.code !== 'stale') throw e; }
  }
  /** Our own write took `used` change numbers right after what the index has: the index stays exact (no extra read). */
  function ownWrite(sAfter, used) { const s = int(sAfter); if (s !== null && used > 0 && s === idx.s + used) idx.s = s; }
  async function ensureEnrolled(c, g) {
    const cur = await g.cap();
    if (!cur) return false;
    if (st.enrolled && st.enrolled.gid === gid && st.enrolled.dev === deviceId) {
      if (st.enrolled.kid !== cur.kid && (st.enrolled.n || 0) <= cur.n) {
        await setCap(c, cur);
        st.enrolled = { ...st.enrolled, kid: cur.kid, n: cur.n }; touch();
      }
      return true;
    }
    // The first device makes the group; the others show a capability the relay
    // knows (its key may be older than ours), then bring it up to date.
    const caps = typeof g.caps === 'function' ? await g.caps() : [cur];
    let enrolled = null, lastErr = null;
    for (const k of caps.length ? caps : [cur]) {
      try { await c.enrol(gid, { dev: deviceId, kid: k.kid, n: k.n, cap: k.cap }); enrolled = k; break; }
      catch (e) { lastErr = e; if (e.code !== 'forbidden') throw e; }
    }
    if (!enrolled) throw lastErr || new RelayError('forbidden');
    if (enrolled.kid !== cur.kid) await setCap(c, cur);
    st.enrolled = { gid, dev: deviceId, kid: cur.kid, n: cur.n, at: now() };
    touch();
    say('info', 'this computer is enrolled in your sync group on the relay');
    if (now() - (st.certsAt || 0) > CERTS_MS) { c.certs().then(() => { st.certsAt = now(); touch(); }).catch(() => {}); }
    return true;
  }

  // ─── The index: the changes feed and the live socket ────────────────
  function devEntry(dev) {
    let d = idx.devs.get(dev);
    if (!d) { d = { logs: new Map(), slots: new Map(), revoked: false, blobs: 0 }; idx.devs.set(dev, d); }
    return d;
  }
  function cacheLine(dev, file, start, line) {
    const key = `${dev}/${file}`;
    const end = start + ulen(line) + 1;
    let c = lineCache.get(key);
    if (!c || c.end !== start) {
      if (c) cacheBytes -= c.bytes;
      c = { start, end: start, lines: [], bytes: 0 };
      lineCache.set(key, c);
    }
    c.lines.push({ line, start, end });
    c.end = end; c.bytes += end - start; cacheBytes += end - start;
    while (c.bytes > CACHE_FILE_BYTES && c.lines.length > 1) { const x = c.lines.shift(); c.bytes -= x.end - x.start; cacheBytes -= x.end - x.start; c.start = c.lines[0].start; }
    if (cacheBytes > CACHE_TOTAL_BYTES) { for (const [k, v] of lineCache) { if (k === key) continue; cacheBytes -= v.bytes; lineCache.delete(k); if (cacheBytes <= CACHE_TOTAL_BYTES / 2) break; } }
  }
  function dropCache(dev, file) { const k = `${dev}/${file}`; const c = lineCache.get(k); if (c) { cacheBytes -= c.bytes; lineCache.delete(k); } }
  /**
   * Apply one changes answer (or a socket 'chg'): true when a pass should run now.
   * Each entry carries its change number `s`: one at or below what the index has
   * is old news (a replay) and is skipped. A socket message that does not follow
   * on from the index (a change was missed) is applied, and the feed is read again.
   */
  function applyChanges(r, { socket: fromSocket = false } = {}) {
    if (!isObj(r)) return false;
    const s = int(r.s);
    if (s === null || s < idx.s) return false;                     // never back: a replay of older news is ignored
    const list = (k) => (Array.isArray(r[k]) ? r[k].slice(0, 20000) : []);
    const fresh = (x) => isObj(x) && (int(x.s) || 0) > idx.s;
    const all = ['log', 'files', 'slots', 'blobs', 'devices'].flatMap(list).filter(fresh);
    const minS = all.length ? Math.min(...all.map(x => x.s)) : s;
    const follows = !fromSocket || minS <= idx.s + 1;
    let wake = false;
    const other = (dev) => dev !== deviceId;
    for (const x of list('log')) {
      if (!fresh(x) || !DEV_RE.test(x.dev || '') || !LOG_FILE_RE.test(x.file || '') || typeof x.line !== 'string' || int(x.off) === null || x.line.length > 1024 * 1024) continue;
      const d = devEntry(x.dev);
      const f = d.logs.get(x.file) || { size: 0, first: 0 };
      const end = x.off + ulen(x.line) + 1;
      if (end > f.size) f.size = end;
      d.logs.set(x.file, f);
      cacheLine(x.dev, x.file, x.off, x.line);
      if (other(x.dev) && !isLive(x.dev)) wake = true;
    }
    for (const x of list('files')) {
      if (!fresh(x) || !DEV_RE.test(x.dev || '') || !LOG_FILE_RE.test(x.file || '')) continue;
      const d = devEntry(x.dev);
      if (x.gone === true) { d.logs.delete(x.file); dropCache(x.dev, x.file); }
      else if (int(x.size) !== null) { const f = d.logs.get(x.file) || { size: 0, first: 0 }; f.size = x.size; f.first = int(x.first) || 0; d.logs.set(x.file, f); }
      if (other(x.dev) && !isLive(x.dev)) wake = true;
    }
    for (const x of list('slots')) {
      if (!fresh(x) || !DEV_RE.test(x.dev || '') || !SLOT_NAMES.includes(x.name)) continue;
      const d = devEntry(x.dev);
      if (x.gone === true) { d.slots.delete(x.name); slotBodies.delete(`${x.dev}/${x.name}`); }
      else if (int(x.ver) !== null && int(x.size) !== null && x.size <= SLOT_CAPS[x.name]) {
        const prev = d.slots.get(x.name);
        if (prev && prev.ver > x.ver) continue;                     // an older version: ignored
        d.slots.set(x.name, { ver: x.ver, size: x.size, at: int(x.at) || 0 });
        if (typeof x.body === 'string' && x.body.length <= 16 * 1024) slotBodies.set(`${x.dev}/${x.name}`, { ver: x.ver, text: x.body });
      }
      if (other(x.dev)) wake = true;
    }
    for (const x of list('blobs')) {
      if (!fresh(x) || !DEV_RE.test(x.dev || '') || !LOC_RE.test(x.loc || '')) continue;
      const l = blobLists.get(x.dev);
      if (l) { if (x.gone === true) l.map.delete(x.loc); else if (int(x.size) !== null && x.size <= BLOB_MAX) l.map.set(x.loc, { size: x.size, at: int(x.at) || 0 }); }
    }
    for (const x of list('devices')) {
      if (!fresh(x) || !DEV_RE.test(x.dev || '')) continue;
      devEntry(x.dev).revoked = x.revoked === true;
      if (other(x.dev)) wake = true;
    }
    // A socket's "more": the change itself was too big to push; it is read from the feed.
    if (follows && !(fromSocket && r.more === true)) idx.s = Math.max(idx.s, s); else { dirty = true; wake = true; }
    if (r.more === true) { dirty = true; wake = true; }
    return wake;
  }
  async function refreshFull(c) {
    const r = await c.files(gid);
    idx.devs.clear(); lineCache.clear(); cacheBytes = 0; slotBodies.clear(); blobLists.clear();
    for (const [dev, v] of Object.entries(r.devices)) {
      if (!DEV_RE.test(dev) || !isObj(v)) continue;
      const d = devEntry(dev);
      for (const l of Array.isArray(v.logs) ? v.logs : []) if (isObj(l) && LOG_FILE_RE.test(l.name || '') && int(l.size) !== null) d.logs.set(l.name, { size: l.size, first: int(l.first) || 0 });
      for (const [name, sl] of Object.entries(isObj(v.slots) ? v.slots : {})) if (SLOT_NAMES.includes(name) && isObj(sl) && int(sl.ver) !== null && int(sl.size) !== null && sl.size <= SLOT_CAPS[name]) d.slots.set(name, { ver: sl.ver, size: sl.size, at: int(sl.at) || 0 });
      d.blobs = int(v.blobs) || 0;
    }
    idx.s = int(r.s) || 0; idx.floor = int(r.floor) || 0; idx.full = true;
  }
  /** Bring the index up to date when it may be behind (never throws: the pass carries on with what is known). */
  async function refresh({ force = false } = {}) {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      await loadState();
      const c = await clientNow();
      const g = c && await groupNow();
      if (!c || !g) return false;
      if (!force && waiting()) return false;
      const sockOpen = socket && socket.open;
      if (!force && idx.full && !dirty && sockOpen) return false;
      if (!force && idx.full && !dirty && now() - lastRefreshAt < POLL_MS) return false;
      try {
        if (!(await ensureEnrolled(c, g))) return false;
        if (!idx.full) await refreshFull(c);
        for (let i = 0; i < 16; i++) {
          const r = await c.changes(gid, idx.s);
          if (r.reset === true) { await refreshFull(c); break; }
          const before = idx.s;
          applyChanges(r);
          if (r.more !== true || idx.s === before) break;
        }
        dirty = false; lastRefreshAt = now();
        ok();
        ensureSocket();
        return true;
      } catch (e) { fail(e, 'could not read the group'); return false; }
      finally { await saveState(); }
    })().finally(() => { refreshing = null; });
    return refreshing;
  }
  function ensureSocket() {
    if (!wantSocket || socket || socketTimer || !gid || !st.enrolled) return;
    (async () => {
      const c = await clientNow();
      if (!c || !gid) return;
      socketState = 'connecting';
      const sock = c.groupSocket(gid, deviceId, {
        onReady: (m) => {
          socketState = 'live'; socketTries = 0;
          if (int(m && m.s) !== null && m.s > idx.s) dirty = true;
          dirty = true;                                // whatever happened while it was down
          emit();
        },
        onMessage: (m) => {
          if (m.t === 'chg') { if (applyChanges(m, { socket: true })) emit(); }
          else if (m.t === 'soft' && DEV_RE.test(m.dev || '') && int(m.ver) !== null && typeof m.body === 'string' && m.body.length <= SLOT_CAPS.device) {
            const d = devEntry(m.dev);
            const prev = d.slots.get('device');
            if (!prev || prev.ver <= m.ver) { d.slots.set('device', { ver: m.ver, size: ulen(m.body), at: now() }); slotBodies.set(`${m.dev}/device`, { ver: m.ver, text: m.body }); if (m.dev !== deviceId) emit(); }
          } else if (m.t === 'ok' || m.t === 'err') { const w = pendingAppends.get(m.id); if (w) { pendingAppends.delete(m.id); w(m); } }
        },
        onClose: () => {
          socket = null;
          for (const [, w] of pendingAppends) w({ t: 'err', error: 'closed' });
          pendingAppends.clear();
          if (!wantSocket) { socketState = 'off'; return; }
          socketState = 'polling';
          // One look at the changes feed on the next pass (not 60 s later): what was missed, and whether this
          // device still gets in (a relay deployed again after a renewal of the keys refuses the old certificate).
          dirty = true;
          socketTries++;
          const ms = Math.min(60000, 1000 * 2 ** Math.min(6, socketTries));
          socketTimer = timers.setTimeout(() => { socketTimer = null; ensureSocket(); }, ms);
          if (socketTimer && typeof socketTimer.unref === 'function') socketTimer.unref();
        },
      });
      socket = sock;
    })().catch(() => { socketState = 'polling'; });
  }
  function emit() { for (const fn of watchers) { try { fn(); } catch { /* a watcher never breaks sync */ } } }

  // ─── Uploading this device's own files ──────────────────────────────
  const pendingAppends = new Map();
  let appendId = 0;
  async function sendLines(c, file, lines) {
    if (socket && socket.open) {
      const id = ++appendId;
      const answer = await new Promise((resolve) => {
        pendingAppends.set(id, resolve);
        if (!socket.send({ t: 'append', id, file, lines })) { pendingAppends.delete(id); resolve(null); }
        const t = timers.setTimeout(() => { if (pendingAppends.delete(id)) resolve(null); }, 20000);
        if (t && typeof t.unref === 'function') t.unref();
      });
      if (answer && answer.t === 'ok' && int(answer.size) !== null) return { s: int(answer.s), size: answer.size, skipped: int(answer.skipped) || 0 };
      if (answer && answer.t === 'err' && answer.error && answer.error !== 'closed') throw new RelayError(answer.error === 'quota' ? 'quota' : answer.error === 'rate_limit' ? 'rate' : 'relay-error');
    }
    return c.append(gid, deviceId, file, lines);
  }
  async function measureOutbox() {
    try {
      const own = await local.listFiles(deviceId);
      let bytes = 0, files = 0;
      for (const l of own.logs) { const u = st.up.logs[l.name]; const left = l.size - ((u && u.sent) || 0); if (left > 0) { bytes += left; files++; } }
      for (const name of SLOT_NAMES) { const f = own[name]; const u = st.up.slots[name]; if (f && (!u || u.stamp !== `${f.size}:${f.mtimeMs}`) && !tooBig[name]) files++; }
      outbox = { bytes, files, at: now() };
    } catch { /* next time */ }
  }
  async function uploadLogs(c) {
    const own = await local.listFiles(deviceId);
    const names = own.logs.map(l => l.name).sort(logOrder);
    const sizes = new Map(own.logs.map(l => [l.name, l.size]));
    for (const name of names) {
      const size = sizes.get(name);
      let u = st.up.logs[name] || { sent: 0, relay: 0 };
      if (size < u.sent) u = { sent: 0, relay: 0 };            // the file was replaced here: send it again (the relay skips what it has)
      while (u.sent < size) {
        const r = await local.readLog(deviceId, name, u.sent);
        if (r.bad || !r.lines.length) break;
        let batch = [], bytes = 0, end = u.sent, dropped = 0, lastN = st.lastN || 0;
        for (const { obj, end: e } of r.lines) {
          // The relay takes sealed records of this device with rising numbers; anything else stays here.
          if (!isObj(obj) || obj.v !== 2 || obj.dev !== deviceId || !Number.isSafeInteger(obj.n) || obj.n <= lastN || !isObj(obj.enc)) { dropped++; end = e; continue; }
          const line = JSON.stringify(obj);
          if (batch.length >= APPEND_LINES || bytes + line.length > APPEND_BYTES) break;
          batch.push(line); bytes += line.length + 1; end = e; lastN = obj.n;
        }
        if (!batch.length) {
          if (end > u.sent) { if (!st.diverged[name]) st.diverged[name] = { at: now(), local: end, relay: u.relay }; u = { sent: end, relay: u.relay }; st.up.logs[name] = u; touch(); continue; }
          break;
        }
        const a = await sendLines(c, name, batch);
        st.lastN = lastN;
        ownWrite(a.s, batch.length - a.skipped > 0 ? batch.length - a.skipped + 1 : 0);
        const expect = dropped ? -1 : u.relay + (end - u.sent);          // lines kept here: the copies differ
        if (a.size !== expect && !st.diverged[name]) { st.diverged[name] = { at: now(), local: end, relay: a.size }; say('warn', `the relay's copy of a log differs in length from this computer's (${a.skipped} line(s) skipped)`); }
        u = { sent: end, relay: a.size };
        st.up.logs[name] = u; touch();
        ok();
      }
    }
    // Logs removed here (old ones a snapshot covers) go from the relay too.
    for (const name of Object.keys(st.up.logs)) {
      if (sizes.has(name)) continue;
      try { await c.deleteLog(gid, deviceId, name, st.up.logs[name].relay); } catch (e) { if (!['not-found', 'stale', 'gone'].includes(e.code)) throw e; }
      delete st.up.logs[name]; delete st.diverged[name]; touch();
    }
  }
  async function uploadSlots(c) {
    const own = await local.listFiles(deviceId);
    const stat = { device: own.device, snapshot: own.snapshot, keys: own.keys, pair: own.pair };
    // The snapshot after the logs it covers; device.json last (it says how far this device is).
    for (const name of ['keys', 'pair', 'snapshot', 'device']) {
      const f = stat[name];
      const u = st.up.slots[name];
      if (!f) {
        if (u) { try { await c.deleteSlot(gid, deviceId, name); } catch (e) { if (!['not-found', 'gone'].includes(e.code)) throw e; } delete st.up.slots[name]; touch(); }
        continue;
      }
      const stamp = `${f.size}:${f.mtimeMs}`;
      if (u && u.stamp === stamp) continue;
      const value = await local.readJson(deviceId, SLOT_FILE[name], SLOT_CAPS[name] * 4);
      if (!value) continue;                                     // being written: next time
      const text = JSON.stringify(value);
      if (ulen(text) > SLOT_CAPS[name]) { if (!tooBig[name]) say('warn', `this computer's ${name} file is too big for the relay`); tooBig[name] = { at: now(), bytes: ulen(text) }; continue; }
      delete tooBig[name];
      let ver = Math.max(Math.floor(f.mtimeMs) || now(), ((u && u.ver) || 0) + 1);
      const soft = name === 'device' && u && u.hardSize === ulen(text) && now() - (u.hardAt || 0) < SOFT_HARD_MS;
      try { const a = await c.putSlot(gid, deviceId, name, ver, text, { soft }); if (a && !a.soft && !a.same) ownWrite(a.s, 1); }
      catch (e) {
        if (e.code !== 'stale') throw e;
        const cur = await c.getSlot(gid, deviceId, name).catch(() => null);
        ver = Math.max(ver, ((cur && cur.ver) || 0) + 1);
        await c.putSlot(gid, deviceId, name, ver, text, { soft: false });
      }
      st.up.slots[name] = { stamp, ver, ...(soft ? { hardSize: u.hardSize, hardAt: u.hardAt } : { hardSize: ulen(text), hardAt: now() }) };
      touch(); ok();
    }
  }
  async function uploadBlobs(c) {
    if (typeof local.listOwnBlobs !== 'function') return;
    const mine = await local.listOwnBlobs();
    const have = new Set(mine.map(b => b.loc));
    let n = 0, bytes = 0;
    for (const b of mine) {
      if (st.up.blobs[b.loc] || b.size > BLOB_MAX) continue;
      if (n >= BLOBS_PER_FLUSH || bytes >= BLOB_BYTES_PER_FLUSH) { flushAgain = true; break; }
      const data = await local.readBlob(deviceId, b.loc, BLOB_MAX);
      if (!data) continue;
      const a = await c.putBlob(gid, deviceId, b.loc, data instanceof Uint8Array ? data : new Uint8Array(data));
      if (a && !a.have) ownWrite(a.s, 1);
      st.up.blobs[b.loc] = b.size; touch(); ok();
      n++; bytes += b.size;
    }
    for (const loc of Object.keys(st.up.blobs)) {
      if (have.has(loc)) continue;
      try { await c.deleteBlob(gid, deviceId, loc); } catch (e) { if (!['not-found', 'gone'].includes(e.code)) throw e; }
      delete st.up.blobs[loc]; touch();
    }
  }
  /** Upload whatever changed here (never throws; backs off on errors). */
  function flush() {
    if (flushing) { flushAgain = true; return flushing; }
    flushing = (async () => {
      try {
        if (!seeded) await runSeed();
        await loadState();
        await measureOutbox();
        const c = await clientNow();
        const g = c && await groupNow();
        if (!c || !g || waiting()) return;
        if (!(await ensureEnrolled(c, g))) return;
        await uploadLogs(c);
        await uploadSlots(c);
        await uploadBlobs(c).catch((e) => { if (e.code === 'quota') quota = { at: now(), blobs: true }; else throw e; });
        // How far this device has taken the feed (the relay compacts lines everyone has).
        if (idx.s > (st.ackS || 0) && now() - (st.ackAt || 0) > ACK_MS) {
          if (socket && socket.open) socket.send({ t: 'ack', s: idx.s }); else await c.ack(gid, deviceId, idx.s);
          st.ackS = idx.s; st.ackAt = now(); touch();
        }
        if (now() - (st.certsAt || 0) > CERTS_MS) { await c.certs().catch(() => {}); st.certsAt = now(); touch(); }
        await measureOutbox();
      } catch (e) { fail(e, 'could not upload'); }
      finally { await saveState(); }
    })().finally(() => {
      flushing = null;
      if (flushAgain) { flushAgain = false; kick(waiting() ? Math.max(1000, back.until - now()) : 50); }
      else if (waiting()) kick(Math.max(1000, back.until - now()));
    });
    return flushing;
  }
  function kick(ms = 100) {
    if (flushTimer) timers.clearTimeout(flushTimer);
    flushTimer = timers.setTimeout(() => { flushTimer = null; flush(); }, ms);
    if (flushTimer && typeof flushTimer.unref === 'function') flushTimer.unref();
  }
  async function runSeed() {
    if (seeded) return;
    if (!seedRun) seedRun = Promise.resolve().then(() => seed()).catch((e) => say('warn', `could not copy this computer's sync files (${(e && e.code) || 'error'})`)).finally(() => { seeded = true; });
    await seedRun;
  }

  // ─── The join link ──────────────────────────────────────────────────
  async function slotPut(text) {
    // While a clash is being told ('clash'), the abort still goes to the slot.
    if (!rv || !(rv.state === 'open' || (rv.state === 'clash' && rv.role === 'host'))) return;
    const c = await clientNow();
    const signer = rv.role === 'guest' ? rv.signer : undefined;
    const cl = c || anonClient;
    if (!cl) return;
    const body = await sealJoinDoc(rv.key, rv.slot, deviceId, text);
    rv.ver = Math.max(now(), (rv.ver || 0) + 1);
    try { await cl.joinPut(rv.slot, deviceId, rv.ver, body, signer); rv.opened = true; rv.error = null; }
    catch (e) { rv.error = e.code; slotGone(e); say('info', `join link: ${e.code}`); }
  }
  async function slotRead() {
    if (!rv || rv.state !== 'open' || now() - (rv.lastGet || 0) < 3000) return;
    rv.lastGet = now();
    const c = (await clientNow()) || anonClient;
    if (!c) return;
    let docs;
    try { docs = await c.joinGet(rv.slot, rv.role === 'guest' ? rv.signer : undefined); }
    catch (e) {
      // A guest's first look: a link the relay does not know (or closed) is dead; useJoinLink says so at once.
      if (rv.role === 'guest' && !rv.read && (e.code === 'not-found' || e.code === 'gone')) rv.dead = true;
      slotGone(e);
      return;
    }
    rv.read = true;
    const seen = new Set();
    for (const d of docs) {
      if (d.dev === deviceId) continue;
      const doc = await openJoinDoc(rv.key, rv.slot, d.dev, d.body);
      if (!isObj(doc) || doc.dev !== d.dev) continue;               // not sealed with this link's key: ignored
      seen.add(d.dev);
      const prev = rv.docs.get(d.dev);
      if (!prev || prev.ver <= d.ver) rv.docs.set(d.dev, { ver: d.ver || now(), doc });
    }
    if (rv.role === 'host') {
      for (const dev of seen) rv.guests.add(dev);
      // One new device per link: a second one closes it, for both.
      if (rv.guests.size > 1 && rv.state === 'open') {
        rv.state = 'clash';
        say('warn', 'a second device tried the join link; it was closed');
        try { onJoinEvent({ type: 'clash', role: 'host' }); } catch { /* fine */ }
        rv.closeAt = now() + 15000;              // the abort reaches the new device first
      }
    }
  }
  /** The relay says the slot is over: why 'second' is the one-device rule (both sides hear "Someone else tried this link"). */
  function slotGone(e) {
    if (!rv || rv.state !== 'open') return;
    const second = (e.code === 'gone' && e.why === 'second') || (e.code === 'taken' && rv.role === 'guest');
    if (second) {
      rv.state = 'clash'; rv.closeAt = now();
      say('warn', 'a second device tried the join link; the relay closed it');
      try { onJoinEvent({ type: 'clash', role: rv.role }); } catch { /* fine */ }
    } else if (e.code === 'gone' || (e.code === 'not-found' && (rv.role === 'host' || rv.opened))) rv.state = e.why === 'done' ? 'done' : rv.role === 'host' ? 'expired' : 'closed';
  }
  async function slotClose(why) {
    if (!rv) return;
    const r = rv;
    rv = r.role === 'host' ? { ...r, state: why || 'closed', docs: new Map() } : null;
    if (r.role === 'host' && r.opened) {
      const c = await clientNow();
      if (c) await c.joinDelete(r.slot, deviceId).catch(() => {});
    } else if (r.role === 'guest' && r.opened) {
      const c = (await clientNow()) || anonClient;
      if (c) await c.joinDelete(r.slot, deviceId, r.signer).catch(() => {});
    }
  }
  async function joinTick(code) {
    if (!rv) return;
    if (rv.role === 'host') {
      const live = code && code.role === 'offer' && ['waiting', 'approve', 'sent', 'clash'].includes(code.step);
      // Two minutes at most (the owner's rule), whatever step it is at; a new link is one click.
      if (rv.state === 'open' && now() > rv.exp) await slotClose('expired');
      else if (rv.state === 'clash' && now() > (rv.closeAt || 0)) await slotClose('clash');
      else if (rv.state === 'open' && !live) await slotClose(code && code.step === 'done' ? 'done' : 'closed');
    } else if (code && code.role === 'join' && !['looking', 'sent'].includes(code.step)) await slotClose('done');
    else if (rv.state === 'open' && now() > rv.exp + 30 * 1000) await slotClose('expired');
  }

  // ─── The transport interface (lib/sync/folder.mjs) ──────────────────
  const rDev = (id) => idx.devs.get(id) || null;
  const slotDoc = (id) => (rv && rv.state !== 'closed' && rv.docs.get(id)) || null;
  const relayStat = (id, name) => {
    if (name === 'pair.json' && slotDoc(id)) { const d = slotDoc(id); return { name, size: ulen(JSON.stringify(d.doc)), mtimeMs: d.ver }; }
    const d = rDev(id);
    const s = d && d.slots.get(FILE_SLOT[name]);
    return s ? { name, size: s.size, mtimeMs: s.ver } : null;
  };
  async function readRelayJson(id, name, max) {
    if (name === 'pair.json' && slotDoc(id)) return slotDoc(id).doc;
    const slot = FILE_SLOT[name];
    const d = rDev(id);
    const s = d && d.slots.get(slot);
    if (!s || s.size > Math.min(max, SLOT_CAPS[slot])) return null;
    const key = `${id}/${slot}`;
    let text = null;
    const cached = slotBodies.get(key);
    if (cached && cached.ver === s.ver) text = cached.text;
    else {
      const c = await clientNow();
      if (!c || !gid) return null;
      try {
        const r = await c.getSlot(gid, id, slot, Math.min(max, SLOT_CAPS[slot]) + 16);
        if (r.ver !== null && r.ver < s.ver) return null;           // older than the index says: a stale answer
        text = r.text;
        if (ulen(text) <= 256 * 1024) slotBodies.set(key, { ver: r.ver ?? s.ver, text });
      } catch (e) { if (!['not-found', 'gone'].includes(e.code)) fail(e); return null; }
    }
    try { const v = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text); return isObj(v) ? v : null; } catch { return null; }
  }
  async function readRelayLog(id, name, offset) {
    const d = rDev(id);
    const f = d && d.logs.get(name);
    if (!f) return { lines: [], end: offset, partial: 0, bad: null, missing: true };
    if (f.size <= offset) return { lines: [], end: Math.min(offset, f.size), partial: 0, bad: null, shrunk: f.size < offset };
    const toOut = (arr, from) => {
      const lines = [];
      let end = from, bad = null;
      for (const x of arr) {
        let obj = null;
        try { obj = JSON.parse(x.line); } catch { obj = null; }
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) { bad = { at: x.start, text: x.line.slice(0, 80) }; break; }
        lines.push({ obj, end: x.end });
        end = x.end;
      }
      return { lines, end, bad };
    };
    const c0 = lineCache.get(`${id}/${name}`);
    if (c0 && c0.start <= offset && c0.end > offset) {
      const from = c0.lines.findIndex(x => x.start === offset);
      if (from >= 0) { const o = toOut(c0.lines.slice(from), offset); return { ...o, partial: 0, more: o.end < f.size && !o.bad }; }
    }
    const c = await clientNow();
    if (!c || !gid) return { lines: [], end: offset, partial: 0, bad: null };
    try {
      const r = await c.readLog(gid, id, name, offset, 2 * 1024 * 1024);
      const o = toOut(r.lines, offset);
      // Lines before `first` were compacted (the device's snapshot holds them): carry on after them.
      const end = o.lines.length || o.bad ? o.end : Math.max(offset, Math.min(r.end, r.size));
      return { lines: o.lines, end, partial: 0, bad: o.bad, more: end < r.size && !o.bad };
    } catch (e) { fail(e); return { lines: [], end: offset, partial: 0, bad: null }; }
  }
  const both = mode === 'both';
  /** Merge the folder's view of a device with the relay's: the longer log, the newer JSON file. */
  function pick(id, name, f, r) {
    const k = `${id}/${name}`;
    let w;
    if (!r) w = f ? 'f' : null;
    else if (!f) w = 'r';
    else if (LOG_FILE_RE.test(name)) w = r.size > f.size ? 'r' : 'f';
    else w = r.mtimeMs >= f.mtimeMs - 2000 ? 'r' : 'f';
    if (w) choice.set(k, w); else choice.delete(k);
    return w === 'r' ? r : w === 'f' ? f : null;
  }

  const adapter = {
    kind: both ? 'both' : 'relay',
    where: both ? local.where : `relay:${origin}`,
    folder: both ? local.folder : null,
    origin,
    async ready() {
      if (!seeded) await runSeed();
      const okLocal = await local.ready();
      if (okLocal) { if (!flushing) flush(); }
      return okLocal;
    },
    rootState: () => (both && typeof local.rootState === 'function' ? local.rootState() : Promise.resolve('ok')),
    async listDevices() {
      await refresh();
      if (rv) await slotRead();
      const ids = new Set([deviceId]);
      if (both) for (const id of await local.listDevices()) ids.add(id);
      for (const id of idx.devs.keys()) ids.add(id);
      if (rv) for (const id of rv.docs.keys()) ids.add(id);
      return [...ids].sort();
    },
    async listFiles(id) {
      if (id === deviceId) return local.listFiles(id);
      const f = both ? await local.listFiles(id) : { logs: [], snapshot: null, device: null, keys: null, pair: null };
      const d = rDev(id);
      const logs = new Map(f.logs.map(l => [l.name, l]));
      const out = { logs: [], snapshot: null, device: null, keys: null, pair: null };
      const names = new Set([...logs.keys(), ...(d ? d.logs.keys() : [])]);
      for (const n of names) {
        const rl = d && d.logs.get(n);
        const e = pick(id, n, logs.get(n) || null, rl ? { name: n, size: rl.size, mtimeMs: 0 } : null);
        if (e) out.logs.push(e);
      }
      out.logs.sort((a, b) => logOrder(a.name, b.name));
      for (const [k, name] of [['snapshot', 'snapshot.json'], ['device', 'device.json'], ['keys', 'keys.json'], ['pair', 'pair.json']]) out[k] = pick(id, name, f[k], relayStat(id, name));
      return out;
    },
    async readJson(id, name, max = 64 * 1024 * 1024) {
      if (id === deviceId) {
        // Our own device.json as the RELAY has it: another installation using this id shows there.
        const rs = name === 'device.json' ? relayStat(id, name) : null;
        if (rs) {
          const mine = (await local.listFiles(id)).device;
          if (!mine || rs.mtimeMs > mine.mtimeMs + 1000) { const v = await readRelayJson(id, name, max); if (v) return v; }
        }
        return local.readJson(id, name, max);
      }
      const w = choice.get(`${id}/${name}`) || (both ? 'f' : 'r');
      if (w === 'r') return (await readRelayJson(id, name, max)) || (both ? local.readJson(id, name, max) : null);
      return (await local.readJson(id, name, max)) || readRelayJson(id, name, max);
    },
    async readLog(id, name, offset) {
      if (id === deviceId) return local.readLog(id, name, offset);
      const w = choice.get(`${id}/${name}`) || (both ? 'f' : 'r');
      if (w === 'f') { const r = await local.readLog(id, name, offset); if (!r.missing) return r; }
      return readRelayLog(id, name, offset);
    },
    async skipLine(id, name, at) {
      if (id === deviceId || choice.get(`${id}/${name}`) === 'f') return local.skipLine(id, name, at);
      const r = await readRelayLog(id, name, at);
      return r.lines.length ? r.lines[0].end : null;
    },
    async appendLog(lines, opts) { const r = await local.appendLog(lines, opts); kick(20); return r; },
    nextLogName: () => local.nextLogName(),
    async writeOwnJson(name, value) {
      await local.writeOwnJson(name, value);
      if (name === 'pair.json' && rv && (rv.state === 'open' || rv.state === 'clash')) await slotPut(JSON.stringify(value));
      kick();
    },
    async removeOwnFile(name) { await local.removeOwnFile(name); kick(); },
    async removeOldDevice(id) {
      await local.removeOldDevice(id);
      const c = await clientNow();
      if (c && gid && DEV_RE.test(id || '') && id !== deviceId) await c.deleteDevice(gid, id).catch(() => {});
    },
    async pruneDevice(id) {
      let done = both && typeof local.pruneDevice === 'function' ? await local.pruneDevice(id) : false;
      const c = await clientNow();
      if (c && gid && DEV_RE.test(id || '') && id !== deviceId && idx.devs.has(id)) {
        try { await c.deleteDevice(gid, id); idx.devs.delete(id); done = true; } catch { /* not revoked on the relay yet */ }
      }
      return done;
    },
    async writeOwnBlob(loc, bytes) { await local.writeOwnBlob(loc, bytes); kick(); },
    async readBlob(id, loc, max = 8 * 1024 * 1024) {
      if (both || id === deviceId) { const b = await local.readBlob(id, loc, max); if (b) return b; }
      const c = await clientNow();
      if (!c || !gid || !DEV_RE.test(id || '') || !LOC_RE.test(loc || '')) return null;
      try { return await c.getBlob(gid, id, loc, Math.min(max, BLOB_MAX)); } catch { return null; }
    },
    async statBlob(id, loc) {
      if (both || id === deviceId) { const s = await local.statBlob(id, loc); if (s) return s; }
      if (id === deviceId || !DEV_RE.test(id || '') || !LOC_RE.test(loc || '')) return null;
      let l = blobLists.get(id);
      if (!l || now() - l.at > 60000) {
        const c = await clientNow();
        if (!c || !gid) return null;
        try { l = { at: now(), map: new Map((await c.listBlobs(gid, id)).map(b => [b.loc, { size: b.size, at: b.at }])) }; blobLists.set(id, l); }
        catch { return null; }
      }
      const b = l.map.get(loc);
      return b ? { size: b.size, mtimeMs: b.at } : null;
    },
    listOwnBlobs: () => local.listOwnBlobs(),
    async removeOwnBlob(loc) { await local.removeOwnBlob(loc); kick(); },
    logSizes: () => local.logSizes(),
    lastOwnSeq: () => local.lastOwnSeq(),
    writeDevice: async (info) => { await local.writeDevice(info); kick(); },
    writeSnapshot: async (snap) => { await local.writeSnapshot(snap); kick(); },
    async removeOwnLog(name, size) { await local.removeOwnLog(name, size); kick(); },
    forget: () => { if (typeof local.forget === 'function') local.forget(); },
    watch(onEvent, onGone = () => {}) {
      watchers.add(onEvent);
      wantSocket = true;
      ensureSocket();
      let closeLocal = null;
      if (both && typeof local.watch === 'function') { try { closeLocal = local.watch(onEvent, () => { closeLocal = null; }); } catch { closeLocal = null; } }
      return () => {
        watchers.delete(onEvent);
        if (closeLocal) { try { closeLocal(); } catch { /* closed */ } closeLocal = null; }
        if (!watchers.size) { wantSocket = false; if (socket) { const s = socket; socket = null; s.close(); } if (socketTimer) { timers.clearTimeout(socketTimer); socketTimer = null; } socketState = 'off'; }
        void onGone;
      };
    },

    // ─── Relay only ───────────────────────────────────────────────────
    /** "Check now": read the group again and upload at once. */
    async syncNow() { back = { until: 0, ms: 0, code: null, at: 0 }; await refresh({ force: true }); await flush(); },
    /** A device removed from sync loses its access to the group at once (5.1 revoke). */
    async revokeDevice(id) {
      const c = await clientNow();
      if (!c || !gid || !DEV_RE.test(id || '')) return false;
      try { await c.revoke(gid, id); return true; } catch (e) { say('warn', `could not revoke a removed device on the relay (${e.code})`); return false; }
    },
    /** The computer that shows the code opens a join link: {link, expiresAt} (the slot opens with its first pair.json). */
    async openJoinLink() {
      const c = await clientNow();
      if (!c) throw new RelayError('auth');
      const { slot, seal } = newJoinSecrets();
      const key = await joinKeyFor(slot, seal);
      if (rv && rv.role === 'host' && rv.opened && rv.state === 'open') await slotClose('replaced');
      rv = { role: 'host', slot, key, link: joinLinkFor(origin, slot, seal), origin, opened: false, exp: now() + LINK_MS, docs: new Map(), guests: new Set(), state: 'open', lastGet: 0, ver: 0 };
      const mine = await local.readJson(deviceId, 'pair.json', 64 * 1024);
      if (mine) await slotPut(JSON.stringify(mine));
      return { link: rv.link, expiresAt: rv.exp };
    },
    /** The new computer uses a pasted join link ({slot, seal}); it talks to the slot with a throwaway key (anonClient). */
    async useJoinLink({ slot, seal }) {
      const key = await joinKeyFor(slot, seal);
      if (rv && rv.role === 'guest' && rv.slot === slot && rv.state === 'open') return;
      rv = { role: 'guest', slot, key, origin, opened: false, exp: now() + LINK_MS, docs: new Map(), guests: new Set(), state: 'open', lastGet: 0, ver: 0, signer: await anonymousSigner() };
      await slotRead();
      // Used, cancelled or expired (or never made): nothing to join. The caller says so and changes nothing.
      if (rv && rv.role === 'guest' && rv.slot === slot && rv.dead) { rv = null; throw Object.assign(new RelayError('gone'), { code: 'LINK_GONE' }); }
    },
    closeJoinLink: (why) => slotClose(why),
    joinTick,
    /** For Settings > Sync and its Health tab. */
    relayStatus() {
      let state;
      if (back.code && waiting()) state = { rate: 'rate', busy: 'busy', quota: 'quota', unreachable: 'offline', 'not-member': 'denied', scope: 'denied', auth: 'denied', forbidden: 'denied' }[back.code] || 'error';
      else if (noKey) state = 'denied';
      else if (!st.enrolled) state = lastError ? ({ 'not-member': 'denied', scope: 'denied', auth: 'denied', forbidden: 'denied', unreachable: 'offline' }[lastError] || 'connecting') : 'connecting';
      else state = socket && socket.open ? 'live' : 'polling';
      return {
        origin, host: (() => { try { return new URL(origin).host; } catch { return null; } })(), mode: adapter.kind, state,
        enrolled: !!st.enrolled, noKey, lastOkAt, lastError: noKey ? 'no-key' : lastError, lastErrorAt, retryAt: waiting() ? back.until : null, outbox: { ...outbox },
        quota: quota ? { at: quota.at, blobs: !!quota.blobs } : null, tooBig: Object.keys(tooBig), diverged: Object.keys(st.diverged).length,
        devices: [...idx.devs.entries()].filter(([id]) => id !== deviceId).map(([id, d]) => ({ id, revoked: d.revoked })).slice(0, 16),
        link: rv ? { role: rv.role, state: rv.state, link: rv.role === 'host' && rv.state === 'open' ? rv.link : null, expiresAt: rv.exp, error: rv.error || null } : null,
      };
    },
    stop() { wantSocket = false; if (socket) { const s = socket; socket = null; s.close(); } if (flushTimer) timers.clearTimeout(flushTimer); if (socketTimer) timers.clearTimeout(socketTimer); },
  };
  return adapter;
}
