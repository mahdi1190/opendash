// lib/relocate/copy.mjs - copy a folder tree with every file verified, so a
// move can never leave a half-copied or silently damaged file behind.
//
//   scanTree(root, {skip})      -> {files: [{rel, size, mtimeMs}], bytes, skipped: [rel], links: [rel]}
//   copyTree(src, dst, opts)    -> {files: [{rel, size, sha256}], bytes, copied, already, passes, unsettled}
//   hashFile(file)              -> sha256 hex (streamed)
//   cleanTemp(dst)              removes this module's own temp files left by a crash
//
// How one file is copied: streamed into '.<name>.odmove-<pid>-<rand>' next to
// the target while its SHA-256 is computed, flushed to disk (fsync), read back
// and hashed again, and only then renamed over the target. So a target file
// is either absent or complete and identical to the source as it was read.
//
// Resume: a target that already has the source's size and hash is kept (a
// crash, a power cut or "Stop" half-way loses no work; a run started again
// finishes the rest). Temp files of an earlier run are removed first.
//
// Files that change while the copy runs (the server's own log, a background
// job that finishes during the move): after each pass every source file is
// looked at again (size and modified time); changed or new files are copied
// again, up to opts.passes (default 3). What still changes after that is
// reported in `unsettled`; the caller decides (only logs/ may stay unsettled).
//
// Symbolic links are never followed (listed in `links`, not copied).
// Node stdlib only.

import { createReadStream, createWriteStream, promises as fsp } from 'node:fs';
import { join, dirname, basename, sep } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const TEMP_RE = /^\..+\.odmove-\d+-[0-9a-f]{8}$/;
export const isMoveTemp = (name) => TEMP_RE.test(name);
const toRel = (r) => r.split(sep).join('/');
const fromRel = (r) => r.split('/').join(sep);

/** sha256 of a file, streamed (big files never sit in memory). */
export async function hashFile(file) {
  const h = createHash('sha256');
  await pipeline(createReadStream(file), new Transform({ transform(c, _e, cb) { h.update(c); cb(); } }));
  return h.digest('hex');
}

/**
 * Every file under root (relative, with /), its size and modified time.
 * skip(rel, isDir) -> true leaves a file or a whole folder out.
 */
export async function scanTree(root, { skip = () => false } = {}) {
  const files = [], skipped = [], links = [];
  let bytes = 0;
  async function walk(relDir) {
    let ents;
    try { ents = await fsp.readdir(relDir ? join(root, fromRel(relDir)) : root, { withFileTypes: true }); }
    catch (e) { if (e.code === 'ENOENT' && relDir) return; throw e; }
    ents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const d of ents) {
      const rel = relDir ? `${relDir}/${d.name}` : d.name;
      if (d.isSymbolicLink()) { links.push(rel); continue; }
      const isDir = d.isDirectory();
      if (skip(rel, isDir)) { skipped.push(rel + (isDir ? '/' : '')); continue; }
      if (isDir) { await walk(rel); continue; }
      if (!d.isFile()) { skipped.push(rel); continue; }
      let st;
      try { st = await fsp.stat(join(root, fromRel(rel))); } catch { continue; }   // vanished between readdir and stat
      files.push({ rel, size: st.size, mtimeMs: st.mtimeMs });
      bytes += st.size;
    }
  }
  await walk('');
  return { files, bytes, skipped, links };
}

/** Remove this module's temp files (a crashed run's) anywhere under dst. Returns how many. */
export async function cleanTemp(dst) {
  let n = 0;
  async function walk(dir) {
    let ents;
    try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const d of ents) {
      const p = join(dir, d.name);
      if (d.isDirectory()) await walk(p);
      else if (d.isFile() && isMoveTemp(d.name)) { try { await fsp.unlink(p); n++; } catch { /* in use: left */ } }
    }
  }
  await walk(dst);
  return n;
}

async function fsyncFile(file) {
  const fh = await fsp.open(file, 'r+');
  try { await fh.sync(); } finally { await fh.close(); }
}

/** Copy one file through a verified temp file. Returns {sha256, size}. */
async function copyOne(src, dst) {
  await fsp.mkdir(dirname(dst), { recursive: true });
  const tmp = join(dirname(dst), `.${basename(dst)}.odmove-${process.pid}-${randomBytes(4).toString('hex')}`);
  try {
    const h = createHash('sha256');
    let size = 0;
    await pipeline(createReadStream(src), new Transform({ transform(c, _e, cb) { h.update(c); size += c.length; cb(null, c); } }), createWriteStream(tmp));
    const want = h.digest('hex');
    await fsyncFile(tmp);
    const got = await hashFile(tmp);
    if (got !== want) throw Object.assign(new Error(`the copy of ${basename(src)} does not match the original`), { code: 'VERIFY_FAILED' });
    await renameRetry(tmp, dst);
    return { sha256: want, size };
  } catch (e) {
    await fsp.unlink(tmp).catch(() => {});
    throw e;
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function renameRetry(a, b) {
  for (let i = 0; ; i++) {
    try { return await fsp.rename(a, b); }
    catch (e) { if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code) || i >= 8) throw e; await sleep(30 * (i + 1)); }
  }
}

/**
 * Copy src to dst (both folders), verified and resumable (see the header).
 * opts: skip(rel, isDir), passes (3), onProgress({phase, file, done, total, bytesDone, bytesTotal}),
 * onFile(rel, how) (tests: throw to simulate a crash), mayChange(rel) -> true for files allowed to
 * keep changing (they are still copied; `busy` lists only the others).
 */
export async function copyTree(src, dst, opts = {}) {
  const { skip = () => false, passes = 3, onProgress = () => {}, onFile = () => {}, mayChange = () => false } = opts;
  await fsp.mkdir(dst, { recursive: true });
  await cleanTemp(dst);
  const done = new Map();          // rel -> {size, mtimeMs, sha256}
  let copied = 0, already = 0, pass = 0, pending = null, totalBytes = 0;
  for (pass = 1; pass <= passes; pass++) {
    const scan = await scanTree(src, { skip });
    totalBytes = scan.bytes;
    pending = scan.files.filter(f => { const d = done.get(f.rel); return !d || d.size !== f.size || d.mtimeMs !== f.mtimeMs; });
    if (!pending.length) break;
    let n = 0, bytesDone = 0;
    for (const f of pending) {
      const s = join(src, fromRel(f.rel)), d = join(dst, fromRel(f.rel));
      onProgress({ phase: 'copy', pass, file: f.rel, done: n, total: pending.length, bytesDone, bytesTotal: pending.reduce((a, x) => a + x.size, 0) });
      let st0;
      try { st0 = await fsp.stat(s); } catch { done.delete(f.rel); n++; continue; }   // gone since the scan
      let res = null, how = 'copied';
      // Resume: a target with the same size and content is already done.
      if (pass === 1) {
        try {
          const dt = await fsp.stat(d);
          if (dt.isFile() && dt.size === st0.size) {
            const [a, b] = await Promise.all([hashFile(s), hashFile(d)]);
            if (a === b) { res = { sha256: a, size: st0.size }; how = 'already'; }
          }
        } catch { /* not there yet */ }
      }
      if (!res) res = await copyOne(s, d);
      // Recorded with the stat from BEFORE the copy: a change during the copy shows up next pass.
      done.set(f.rel, { size: st0.size, mtimeMs: st0.mtimeMs, sha256: res.sha256 });
      if (how === 'already') already++; else copied++;
      n++; bytesDone += f.size;
      await onFile(f.rel, how);
    }
  }
  // What still differs after the last pass.
  const last = await scanTree(src, { skip });
  const unsettled = last.files.filter(f => { const d = done.get(f.rel); return !d || d.size !== f.size || d.mtimeMs !== f.mtimeMs; }).map(f => f.rel);
  const bad = unsettled.filter(r => !mayChange(r));
  onProgress({ phase: 'copied', pass: Math.min(pass, passes), done: last.files.length, total: last.files.length, bytesDone: totalBytes, bytesTotal: totalBytes });
  const files = [...done.entries()].map(([rel, v]) => ({ rel, size: v.size, sha256: v.sha256 })).sort((a, b) => (a.rel < b.rel ? -1 : 1));
  return { files, bytes: files.reduce((a, f) => a + f.size, 0), copied, already, passes: Math.min(pass, passes), unsettled, busy: bad };
}

/**
 * Copy some files (relative paths) from src to dst, verified. A dst file that
 * would be replaced and differs is first copied into keepDir (same relative
 * path), so nothing is ever lost. Resumable: a dst that already matches is kept.
 * Returns {copied, already, kept}.
 */
export async function copyFiles(src, dst, rels, { keepDir = null, onFile = () => {} } = {}) {
  let copied = 0, already = 0, kept = 0;
  for (const rel of rels) {
    const s = join(src, fromRel(rel)), d = join(dst, fromRel(rel));
    if (!(await fsp.stat(s).catch(() => null))) continue;
    const dt = await fsp.stat(d).catch(() => null);
    if (dt && dt.isFile()) {
      const [a, b] = await Promise.all([hashFile(s), hashFile(d)]);
      if (a === b) { already++; await onFile(rel, 'already'); continue; }
      if (keepDir) {
        const k = join(keepDir, fromRel(rel));
        if (!(await fsp.stat(k).catch(() => null))) { await copyOne(d, k); kept++; }
      }
    }
    await copyOne(s, d);
    copied++;
    await onFile(rel, 'copied');
  }
  return { copied, already, kept };
}

export const _test = { copyOne, toRel };
