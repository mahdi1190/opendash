// lib/fsutil.mjs - the ONLY way the dashboard writes user data to disk.
//
// The data folder usually sits inside OneDrive (or Dropbox, or a folder an
// antivirus scanner watches). Those briefly lock files, so a plain
// writeFile/rename fails now and then with EPERM, EBUSY or EACCES on Windows.
// Everything here retries those with backoff instead of losing a save.
//
//   atomicWrite(path, data)      temp file in the same folder + rename, retried
//   writeJson(path, obj)         atomicWrite of JSON
//   withLock(path, fn)           cross-process lock (<path>.lock) with stale-lock recovery
//   readJson(path, opts)         parse, and on corruption fall back to the newest good backup
//   copyTree(src, dst, opts)     recursive copy that never overwrites unless asked (migrations)
//
// Node stdlib only.

import { promises as fsp, existsSync, constants as FS } from 'node:fs';
import { dirname, join, basename, resolve, relative, sep, isAbsolute } from 'node:path';
import { hostname } from 'node:os';
import { randomBytes } from 'node:crypto';

const RETRY_CODES = new Set(['EPERM', 'EBUSY', 'EACCES', 'EAGAIN', 'ENOTEMPTY', 'EMFILE']);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Test hooks: swap the low-level rename to simulate OneDrive locking a file.
let _rename = (a, b) => fsp.rename(a, b);
export const __test = {
  setRename(fn) { _rename = fn || ((a, b) => fsp.rename(a, b)); },
};

/** Run fn, retrying transient Windows/OneDrive lock errors with backoff. */
export async function retryFs(fn, { retries = 10, baseMs = 25, maxMs = 1000, label = 'file operation' } = {}) {
  let delay = baseMs;
  for (let attempt = 0; ; attempt++) {
    try { return await fn(); }
    catch (e) {
      if (!RETRY_CODES.has(e && e.code) || attempt >= retries) {
        if (e && RETRY_CODES.has(e.code)) {
          e.message = `${label} failed after ${attempt + 1} attempts (${e.code}): the file is locked by another program `
            + `(OneDrive, antivirus or an editor). ${e.message}`;
        }
        throw e;
      }
      await sleep(delay + Math.floor(Math.random() * delay));
      delay = Math.min(maxMs, delay * 2);
    }
  }
}

/**
 * Write `data` to `path` atomically: write a temp file next to it, then rename
 * over the target. Readers never see half a file. Creates the folder.
 * opts.mode sets the file mode of the new file (e.g. 0o600 for secrets).
 */
export async function atomicWrite(path, data, opts = {}) {
  const dir = dirname(path);
  await fsp.mkdir(dir, { recursive: true });
  const tmp = join(dir, `.${basename(path)}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`);
  await retryFs(() => fsp.writeFile(tmp, data, { encoding: opts.encoding === null ? undefined : 'utf8', ...(opts.mode ? { mode: opts.mode } : {}) }), { label: `writing ${basename(path)}` });
  try {
    await retryFs(() => _rename(tmp, path), { label: `saving ${basename(path)}`, ...opts.retry });
  } catch (e) {
    await fsp.unlink(tmp).catch(() => {});
    throw e;
  }
}

export async function writeJson(path, obj, opts = {}) {
  await atomicWrite(path, JSON.stringify(obj, null, opts.indent ?? 1) + (opts.trailingNewline ? '\n' : ''), opts);
}

// ─── Cross-process lock ────────────────────────────────────────────────────
// <path>.lock holds {pid, host, ts, token}. A lock is stale when its ts is older
// than staleMs (the holder refreshes ts while it works) or, on this machine,
// when its pid is no longer running. Stale locks are removed and retaken.

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code === 'EPERM'; }   // exists but not ours
}

// A lock file that cannot be parsed is usually one another process has just
// created and not yet filled in, so it only counts as stale once it is old.
async function readLock(lockPath) {
  try { return JSON.parse(await fsp.readFile(lockPath, 'utf8')); }
  catch (e) {
    if (e.code === 'ENOENT') return null;
    const st = await fsp.stat(lockPath).catch(() => null);
    return st ? { corrupt: true, ts: st.mtimeMs } : null;
  }
}

export class LockTimeoutError extends Error {
  constructor(path, holder) {
    super(`Timed out waiting for the lock on ${basename(path)}`
      + (holder && holder.pid ? ` (held by process ${holder.pid})` : ''));
    this.code = 'LOCK_TIMEOUT';
    this.status = 503;
  }
}

// Callers in THIS process queue in memory (first come, first served) so only
// one of them at a time competes for the lock file: a burst of writes from one
// server or MCP process runs back to back instead of polling each other.
const localQueues = new Map();   // lock path -> tail promise

/**
 * Run fn while holding an exclusive cross-process lock for `path`.
 * Other processes calling withLock on the same path wait (up to timeoutMs).
 * Not re-entrant: never call withLock on the same path from inside fn.
 */
export async function withLock(path, fn, opts = {}) {
  const key = resolve(`${path}.lock`).toLowerCase();
  const prev = localQueues.get(key) || Promise.resolve();
  let release;
  const mine = new Promise(r => { release = r; });
  const tail = prev.then(() => mine);
  localQueues.set(key, tail);
  try {
    await prev;
    return await fileLock(path, fn, opts);
  } finally {
    release();
    if (localQueues.get(key) === tail) localQueues.delete(key);
  }
}

// A lock file that is still empty or half-written this long after it was
// last touched was left by a process that died between creating and filling
// it (filling takes microseconds).
const CORRUPT_STALE_MS = 2000;

async function fileLock(path, fn, { timeoutMs = 15000, staleMs = 20000, pollMs = 25 } = {}) {
  const lockPath = `${path}.lock`;
  await fsp.mkdir(dirname(lockPath), { recursive: true });
  const token = randomBytes(8).toString('hex');
  const me = () => JSON.stringify({ pid: process.pid, host: hostname(), ts: Date.now(), token });
  const deadline = Date.now() + timeoutMs;
  let holder = null;
  for (let delay = pollMs; ; delay = Math.min(150, Math.round(delay * 1.5))) {
    try {
      const fh = await fsp.open(lockPath, 'wx');
      try { await fh.writeFile(me()); } finally { await fh.close(); }
      break;
    } catch (e) {
      if (e.code !== 'EEXIST' && !RETRY_CODES.has(e.code)) throw e;
      holder = await readLock(lockPath);
      const stale = holder && ((Date.now() - (holder.ts || 0) > (holder.corrupt ? CORRUPT_STALE_MS : staleMs))
        || (!holder.corrupt && holder.host === hostname() && !pidAlive(holder.pid)));
      if (stale) {
        // Remove only if it is still the same stale lock (another waiter may
        // have replaced it already).
        const again = await readLock(lockPath);
        if (again && (again.corrupt ? again.ts === holder.ts : again.token === holder.token)) await fsp.unlink(lockPath).catch(() => {});
        continue;
      }
      if (Date.now() > deadline) throw new LockTimeoutError(path, holder);
      await sleep(delay);
    }
  }
  // Heartbeat so a long job is never mistaken for a dead one. 'r+' never
  // creates the file, so a late heartbeat cannot resurrect a released lock.
  let beating = Promise.resolve();
  const beat = setInterval(() => {
    beating = (async () => {
      const fh = await fsp.open(lockPath, 'r+');
      try { const b = Buffer.from(me()); await fh.truncate(0); await fh.write(b, 0, b.length, 0); } finally { await fh.close(); }
    })().catch(() => {});
  }, Math.max(1000, Math.floor(staleMs / 3)));
  beat.unref?.();
  try {
    return await fn();
  } finally {
    clearInterval(beat);
    await beating;
    const cur = await readLock(lockPath);
    if (cur && cur.token === token) await retryFs(() => fsp.unlink(lockPath), { retries: 5 }).catch(() => {});
  }
}

// ─── Reading JSON with corruption recovery ────────────────────────────────

/**
 * Read and parse a JSON file.
 *   missing file          -> opts.fallback (default null)
 *   unparseable file      -> newest parseable *.json in opts.backupDirs (newest
 *                            by name, then mtime); opts.onRecover({from, error})
 *                            is called; null/fallback if none parse.
 * opts.validate(obj) may return false to treat a parsed file as corrupt too.
 */
export async function readJson(path, opts = {}) {
  let text;
  try { text = await retryFs(() => fsp.readFile(path, 'utf8'), { retries: 6, label: `reading ${basename(path)}` }); }
  catch (e) {
    if (e.code === 'ENOENT') return opts.fallback ?? null;
    throw e;
  }
  try {
    const obj = JSON.parse(stripBom(text));
    if (opts.validate && !opts.validate(obj)) throw new Error('failed validation');
    return obj;
  } catch (error) {
    for (const dir of opts.backupDirs || []) {
      const cand = await newestJsonFiles(dir);
      for (const f of cand) {
        try {
          const obj = JSON.parse(stripBom(await fsp.readFile(f, 'utf8')));
          if (opts.validate && !opts.validate(obj)) continue;
          opts.onRecover?.({ from: f, error });
          return obj;
        } catch { /* try the next one */ }
      }
    }
    if ('fallback' in opts) { opts.onRecover?.({ from: null, error }); return opts.fallback; }
    error.message = `${basename(path)} is not valid JSON and no backup could be read: ${error.message}`;
    throw error;
  }
}

const stripBom = (t) => (t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);

async function newestJsonFiles(dir) {
  let names;
  try { names = (await fsp.readdir(dir)).filter(f => f.endsWith('.json')); }
  catch { return []; }
  const withTime = await Promise.all(names.map(async n => {
    const p = join(dir, n);
    try { return { p, n, t: (await fsp.stat(p)).mtimeMs }; } catch { return null; }
  }));
  return withTime.filter(Boolean).sort((a, b) => (b.t - a.t) || b.n.localeCompare(a.n)).map(x => x.p);
}

// ─── Copying trees (migrations) ───────────────────────────────────────────

/**
 * Recursively copy src -> dst. Never overwrites an existing file unless
 * opts.overwrite. opts.skip(relPath, isDir) may return true to skip.
 * Returns {copied:[rel], skipped:[rel], existing:[rel]}. With opts.dryRun it
 * only reports.
 */
export async function copyTree(src, dst, opts = {}) {
  const res = { copied: [], skipped: [], existing: [] };
  const walk = async (rel) => {
    const from = join(src, rel), to = join(dst, rel);
    const st = await fsp.stat(from);
    if (st.isDirectory()) {
      if (rel && opts.skip?.(rel, true)) { res.skipped.push(rel + sep); return; }
      if (!opts.dryRun) await fsp.mkdir(to, { recursive: true });
      for (const n of (await fsp.readdir(from)).sort()) await walk(rel ? join(rel, n) : n);
      return;
    }
    if (opts.skip?.(rel, false)) { res.skipped.push(rel); return; }
    if (existsSync(to) && !opts.overwrite) { res.existing.push(rel); return; }
    if (!opts.dryRun) {
      await fsp.mkdir(dirname(to), { recursive: true });
      await retryFs(() => fsp.copyFile(from, to, opts.overwrite ? 0 : FS.COPYFILE_EXCL), { label: `copying ${rel}` });
      await fsp.utimes(to, st.atime, st.mtime).catch(() => {});
    }
    res.copied.push(rel);
  };
  await walk('');
  return res;
}

/** True if `child` is `parent` or inside it. */
export function isInside(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (rel.split(/[\\/]/)[0] !== '..' && !isAbsolute(rel));
}
