// server/state-store.mjs - reading and writing <data>/state/dashboard-state.json.
//
// Write protocol (optimistic concurrency):
//   - The page sends the whole state with `_lastSave` = the version it last
//     loaded or wrote.
//   - If the file's `_lastSave` is newer, the write is refused with 409 (a
//     script or another tab changed it; the page reloads it).
//   - Otherwise the server stamps a new `_lastSave` (always larger than the
//     file's), writes atomically under the cross-process lock, and returns it.
//     The page keeps that value as its new version.
//   - A write identical to the file (ignoring `_lastSave`/`_saveCount`) is not
//     written at all.
//
// Backups (only when the DATA part changed, see lib/state-keys.mjs):
//   backups/state-<stamp>.json   at most one every 10 minutes, last 40 kept
//   backups/daily/state-<date>.json   first change of each day, 30 days kept
// tools/ scripts that edit the file directly must bump `_lastSave` (any
// Date.now() works) so open tabs see that the file is newer.
//
// mutate(fn) is the compare-and-swap edit the actions layer (server/actions)
// uses, in this server and in the MCP server's embedded mode: same lock, same
// version stamping, same backups. onChange(fn) hears about every write this
// process makes (live sync).

import { existsSync, promises as fsp } from 'node:fs';
import { join } from 'node:path';
import { atomicWrite, withLock, readJson, retryFs } from '../lib/fsutil.mjs';
import { dataFingerprint, fullFingerprint } from '../lib/state-keys.mjs';
import { HttpError } from './http.mjs';

export const ROLLING_KEEP = 40;
export const ROLLING_MIN_GAP_MS = 10 * 60 * 1000;
export const DAILY_KEEP_DAYS = 30;

const stamp = (d = new Date()) => d.toISOString().replace(/[:.]/g, '-');
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function createStateStore({ stateDir, log = () => {}, now = () => Date.now() }) {
  const file = join(stateDir, 'dashboard-state.json');
  const backups = join(stateDir, 'backups');
  const daily = join(backups, 'daily');
  let lastRollingAt = null;   // lazily initialised from the newest backup

  const validate = (o) => o && typeof o === 'object' && Array.isArray(o.custom);

  /** Raw JSON text for GET /api/state, or null if there is no state yet. */
  async function readText() {
    if (!existsSync(file)) return null;
    let recovered = null;
    const obj = await readJson(file, {
      validate, backupDirs: [backups, daily],
      onRecover: ({ from }) => { recovered = from; },
    });
    if (recovered) {
      log('warn', `state file was unreadable; served the newest good backup (${recovered.split(/[\\/]/).pop()})`);
      return { text: JSON.stringify(obj), recoveredFrom: recovered };
    }
    return { text: JSON.stringify(obj), recoveredFrom: null };
  }

  async function readObject() {
    const r = await readText();
    return r ? JSON.parse(r.text) : null;
  }

  async function initLastRolling() {
    if (lastRollingAt !== null) return;
    lastRollingAt = 0;
    try {
      const names = (await fsp.readdir(backups)).filter(f => /^state-.*\.json$/.test(f)).sort();
      if (names.length) lastRollingAt = (await fsp.stat(join(backups, names[names.length - 1]))).mtimeMs;
    } catch { /* no backups yet */ }
  }

  async function prune() {
    try {
      const names = (await fsp.readdir(backups)).filter(f => /^state-.*\.json$/.test(f)).sort();
      for (const f of names.slice(0, Math.max(0, names.length - ROLLING_KEEP))) await fsp.unlink(join(backups, f)).catch(() => {});
    } catch { /* none */ }
    try {
      const cutoff = localDate(new Date(now() - DAILY_KEEP_DAYS * 86400000));
      for (const f of await fsp.readdir(daily)) {
        const m = /^state-(\d{4}-\d{2}-\d{2})\.json$/.exec(f);
        if (m && m[1] < cutoff) await fsp.unlink(join(daily, f)).catch(() => {});
      }
    } catch { /* none */ }
  }

  /** Back up the previous file content if the data changed. Returns what was written. */
  async function backupIfNeeded(prevText) {
    const made = [];
    const today = localDate(new Date(now()));
    const dailyFile = join(daily, `state-${today}.json`);
    if (!existsSync(dailyFile)) { await atomicWrite(dailyFile, prevText); made.push('daily'); }
    await initLastRolling();
    if (now() - lastRollingAt >= ROLLING_MIN_GAP_MS) {
      await atomicWrite(join(backups, `state-${stamp(new Date(now()))}.json`), prevText);
      lastRollingAt = now();
      made.push('rolling');
    }
    if (made.length) await prune();
    return made;
  }

  // ── Change listeners (live sync) ──────────────────────────────────────
  // Called after every write this process makes, with {version, source,
  // client, summary, dataChanged}. Writes by other processes (the MCP server
  // in embedded mode, scripts) are picked up by server/live-sync.mjs, which
  // watches the file.
  const listeners = new Set();
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function emit(info) { for (const fn of listeners) { try { fn(info); } catch { /* a listener must never break a save */ } } }

  /**
   * Read the current file under the lock (raw text + parsed, or nulls when
   * there is no file). A file that exists but cannot be READ (OneDrive or an
   * antivirus holding it: EBUSY/EPERM/EACCES) is retried and then refused -
   * never mistaken for "no file", which would write a state with no tasks.
   */
  async function readLocked() {
    let prevText = null, prev = null;
    try {
      prevText = await retryFs(() => fsp.readFile(file, 'utf8'), { retries: 8, label: 'reading the state file' });
    } catch (e) {
      if (e && e.code === 'ENOENT') return { prevText: null, prev: null };
      throw new HttpError(503, `the state file cannot be read right now (${e && e.code || 'error'}: another program may be holding it); nothing was changed - try again in a moment`, { code: 'STATE_UNREADABLE' });
    }
    try { prev = prevText ? JSON.parse(prevText.charCodeAt(0) === 0xfeff ? prevText.slice(1) : prevText) : null; } catch { prev = null; }
    if (prevText !== null && !prevText.trim()) prevText = ' ';   // an empty file counts as corrupt, not missing
    return { prevText, prev };
  }

  /**
   * The file is there but not valid JSON: read it once more (a writer outside
   * the lock may be mid-way), then fall back to the newest good backup - what
   * every reader (GET /api/state, queries) is already being served. A copy of
   * the bad file is kept in backups/. Returns {prevText, prev, recoveredFrom}.
   */
  async function recoverLocked(prevText) {
    await new Promise(r => setTimeout(r, 150));
    const again = await readLocked();
    if (!again.prevText || again.prev) return { ...again, recoveredFrom: null };
    let from = null;
    const obj = await readJson(file, { validate, backupDirs: [backups, daily], fallback: null, onRecover: (x) => { from = x.from; } }).catch(() => null);
    if (!obj || !from) {
      throw new HttpError(503, 'the state file is unreadable (corrupt) and no good backup was found; nothing was changed - restore one from Settings > Data', { code: 'STATE_UNREADABLE' });
    }
    await atomicWrite(join(backups, `corrupt-${stamp(new Date(now()))}.json`), again.prevText || prevText).catch(() => {});
    log('warn', `state file was corrupt; recovered from ${from.split(/[\\/]/).pop()} before a change (a copy of the bad file is in backups/)`);
    return { prevText: JSON.stringify(obj), prev: obj, recoveredFrom: from };
  }

  /** Write `next` over `prev` (caller holds the lock). Stamps the new version. */
  async function commit(prevText, prev, next) {
    const prevSave = Number(prev && prev._lastSave) || 0;
    if (prev && fullFingerprint(prev) === fullFingerprint(next)) {
      return { lastSave: prevSave, taskCount: next.custom.length, written: false, backups: [], dataChanged: false };
    }
    const dataChanged = !prev || dataFingerprint(prev) !== dataFingerprint(next);
    const made = prev && dataChanged ? await backupIfNeeded(prevText) : [];
    const lastSave = Math.max(now(), prevSave + 1);
    next._lastSave = lastSave;
    await atomicWrite(file, JSON.stringify(next, null, 1));
    return { lastSave, taskCount: next.custom.length, written: true, backups: made, dataChanged };
  }

  /**
   * Write a new state. `text` is the request body. Returns
   * { lastSave, taskCount, written, backups }.
   * opts.source / opts.client label the change for live-sync listeners.
   */
  async function write(text, opts = {}) {
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw new HttpError(400, 'body must be JSON'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new HttpError(400, 'state must be a JSON object');
    if (!Array.isArray(parsed.custom)) throw new HttpError(400, "refusing to write: state has no 'custom' task array");

    const r = await withLock(file, async () => {
      const { prevText, prev } = await readLocked();
      if (prevText && !prev) {
        // Corrupt file on disk: keep a copy before it is replaced.
        await atomicWrite(join(backups, `corrupt-${stamp(new Date(now()))}.json`), prevText).catch(() => {});
        log('warn', 'state file on disk was corrupt; kept a copy in backups/ and replaced it');
      }
      const prevSave = Number(prev && prev._lastSave) || 0;
      const base = Number(parsed._lastSave) || 0;
      if (base < prevSave) {
        throw new HttpError(409, 'stale write: the state file is newer than this tab - reload the page', { lastSave: prevSave });
      }
      return commit(prevText, prev, parsed);
    });
    if (r.written) emit({ version: r.lastSave, source: opts.source || 'ui', client: opts.client || null, dataChanged: r.dataChanged });
    return r;
  }

  /**
   * Compare-and-swap edit used by the actions layer (server/actions) in the
   * server AND in the MCP server's embedded mode: under the cross-process
   * lock, read the file, call fn(current) and write what it returns.
   *
   *   fn(cur, {version}) -> { next, result }   next = new state object, or
   *                                           null to write nothing
   *   opts.ifVersion   refuse (409) if the file's version is not this one
   *   opts.afterCommit(info) runs while the lock is still held (journals)
   *
   * Returns { version, written, result, dataChanged }.
   */
  async function mutate(fn, opts = {}) {
    const r = await withLock(file, async () => {
      let { prevText, prev } = await readLocked();
      let recoveredFrom = null;
      if (prevText && !prev) ({ prevText, prev, recoveredFrom } = await recoverLocked(prevText));
      const cur = prev || { custom: [] };
      const version = Number(cur._lastSave) || 0;
      if (opts.ifVersion != null && Number(opts.ifVersion) !== version) {
        throw new HttpError(409, `the state changed (version ${version}, you expected ${opts.ifVersion})`, { code: 'VERSION_MISMATCH', lastSave: version });
      }
      const out = await fn(cur, { version, recoveredFrom });
      if (!out || !out.next) return { version, written: false, result: out ? out.result : undefined, dataChanged: false };
      if (!Array.isArray(out.next.custom)) throw new HttpError(500, 'refusing to write: state has no task array');
      const c = await commit(prevText, prev, out.next);
      const info = { version: c.lastSave, written: c.written, result: out.result, dataChanged: c.dataChanged, prevVersion: version, ...(recoveredFrom ? { recoveredFrom } : {}) };
      if (c.written && opts.afterCommit) await opts.afterCommit(info);
      return info;
    });
    if (r.written) emit({ version: r.version, source: opts.source || 'script', client: opts.client || null, summary: opts.summary || null, undo: opts.undo || null, dataChanged: r.dataChanged });
    return r;
  }

  /** The file's current version (_lastSave), or 0. */
  async function version() {
    const r = await readText().catch(() => null);
    if (!r) return 0;
    try { return Number(JSON.parse(r.text)._lastSave) || 0; } catch { return 0; }
  }

  async function info() {
    if (!existsSync(file)) return { exists: false };
    try {
      const st = await fsp.stat(file);
      const s = await readObject();
      return { exists: true, taskCount: Array.isArray(s?.custom) ? s.custom.length : null, lastSave: s?._lastSave ?? null, size: st.size };
    } catch (e) {
      return { exists: true, parseError: String(e.message) };
    }
  }

  return { file, stateDir, backups, daily, readText, readObject, write, mutate, version, onChange, emit, info };
}
