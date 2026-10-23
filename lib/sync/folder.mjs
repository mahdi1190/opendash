// lib/sync/folder.mjs - the shared sync folder on disk, and finding one.
//
//   <cloud folder>/OpenDash Sync/
//     devices/<deviceId>/device.json          {name, lastSeen, instance, app}  (rewritten now and then)
//     devices/<deviceId>/ops-YYYYMMDD.jsonl   append-only change log, one change per line
//     devices/<deviceId>/ops-YYYYMMDD-NN.jsonl  the same day, continued (a log never grows past ~4 MB)
//     devices/<deviceId>/snapshot.json        every register this device knows (compaction)
//
// Every device writes ONLY inside its own devices/<deviceId>/ folder, so two
// devices never write the same file and a cloud client never has to make a
// conflict copy. Every write is a temp file + rename (lib/fsutil.mjs), so a
// reader on this computer never sees half a file; a cloud client can still
// deliver a log cut short, so readers stop at the last complete line and pick
// up the rest later.
//
// Readers accept exactly these names. Everything else is ignored: temp files
// (".x.tmp-...", "*.tmp"), cloud conflict copies ("ops-20261023 (1).jsonl",
// "ops-20261023-DESKTOP-AB12CD.jsonl", "... (conflicted copy ...)",
// "...-conflict-..."), desktop.ini, .dropbox, Icon files.
//
// detectCloudFolders() finds OneDrive, Google Drive for desktop and Dropbox
// folders from environment variables and their usual places. It only LOOKS
// (existsSync / reading Dropbox's info.json); it never writes anything.

import { promises as fsp, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, basename, win32, posix } from 'node:path';
import { homedir } from 'node:os';
import { atomicWrite, retryFs } from '../fsutil.mjs';

export const SYNC_DIR_NAME = 'OpenDash Sync';
export const DEVICE_RE = /^[0-9a-f]{16}$/;
export const LOG_RE = /^ops-(\d{8})(?:-(\d{2}))?\.jsonl$/;
export const MAX_LOG_BYTES = 4 * 1024 * 1024;
const MAX_READ = 8 * 1024 * 1024;           // per file per pass

/** The sync root for a chosen folder: <folder>/OpenDash Sync (or the folder itself if it is one). */
export function syncRootFor(folder) {
  const f = resolve(String(folder));
  return basename(f).toLowerCase() === SYNC_DIR_NAME.toLowerCase() ? f : join(f, SYNC_DIR_NAME);
}
export const devicesDir = (root) => join(root, 'devices');
export const deviceDir = (root, id) => join(root, 'devices', id);
/** True for a name this protocol writes; false for temp files, conflict copies and anything else. */
export const isSyncFileName = (n) => n === 'device.json' || n === 'snapshot.json' || LOG_RE.test(n);
const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '');

// ─── Writing this device's files ───────────────────────────────────────────
/**
 * This device's log writer. append(lines) adds complete lines to today's log
 * (temp file + rename of the whole file, which only ever grows), returns the
 * file name and its new size.
 */
export function createLogWriter({ root, deviceId, now = () => Date.now() }) {
  const dir = deviceDir(root, deviceId);
  const cache = new Map();   // file name -> content (this process is the only writer)

  async function current() {
    const day = utcDay(now());
    let names = [];
    try { names = (await fsp.readdir(dir)).filter(n => LOG_RE.test(n) && n.slice(4, 12) === day).sort(); } catch { /* new folder */ }
    let name = names.length ? names[names.length - 1] : `ops-${day}.jsonl`;
    let text = cache.get(name);
    if (text === undefined) {
      text = await retryFs(() => fsp.readFile(join(dir, name), 'utf8')).catch((e) => { if (e.code === 'ENOENT') return ''; throw e; });
      // A line cut short (the computer stopped mid-write in an older version,
      // or a cloud client restored a partial copy) is closed off so the next
      // line starts clean; readers skip the broken one.
      if (text && !text.endsWith('\n')) text += '\n';
    }
    if (Buffer.byteLength(text) >= MAX_LOG_BYTES) {
      const m = LOG_RE.exec(name);
      const part = String(Number(m[2] || 0) + 1).padStart(2, '0');
      name = `ops-${day}-${part}.jsonl`;
      text = cache.get(name) ?? '';
    }
    return { name, text };
  }

  async function append(lines) {
    if (!lines.length) return null;
    const { name, text } = await current();
    const next = text + lines.map(l => (typeof l === 'string' ? l : JSON.stringify(l)) + '\n').join('');
    await atomicWrite(join(dir, name), next);
    cache.set(name, next);
    return { name, size: Buffer.byteLength(next) };
  }

  /** {name: size} of this device's logs (for a snapshot's `covers`). */
  async function sizes() {
    const out = {};
    let names = [];
    try { names = (await fsp.readdir(dir)).filter(n => LOG_RE.test(n)); } catch { return out; }
    for (const n of names) { try { out[n] = (await fsp.stat(join(dir, n))).size; } catch { /* gone */ } }
    return out;
  }

  return { dir, append, sizes, forget: () => cache.clear() };
}

export async function writeDeviceInfo(root, deviceId, info) {
  await atomicWrite(join(deviceDir(root, deviceId), 'device.json'), JSON.stringify({ v: 1, deviceId, ...info }, null, 1));
}
export async function writeSnapshot(root, deviceId, snap) {
  await atomicWrite(join(deviceDir(root, deviceId), 'snapshot.json'), JSON.stringify(snap));
}

// ─── Reading other devices' files ──────────────────────────────────────────
/** Device folders under devices/ (valid ids only). */
export async function listDevices(root) {
  try { return (await fsp.readdir(devicesDir(root), { withFileTypes: true })).filter(d => d.isDirectory() && DEVICE_RE.test(d.name)).map(d => d.name).sort(); }
  catch { return []; }
}

/** The protocol's files in one device folder: {logs: [{name, size, mtimeMs}], snapshot, device} (stat only). */
export async function listDeviceFiles(root, id) {
  const dir = deviceDir(root, id);
  let names = [];
  try { names = await fsp.readdir(dir); } catch { return { logs: [], snapshot: null, device: null }; }
  const out = { logs: [], snapshot: null, device: null };
  for (const n of names.filter(isSyncFileName).sort()) {
    let st;
    try { st = await fsp.stat(join(dir, n)); } catch { continue; }
    if (!st.isFile()) continue;
    const e = { name: n, size: st.size, mtimeMs: st.mtimeMs };
    if (n === 'snapshot.json') out.snapshot = e; else if (n === 'device.json') out.device = e; else out.logs.push(e);
  }
  out.logs.sort((a, b) => (a.name < b.name ? -1 : 1));
  return out;
}

/** Parse a small JSON file, or null (missing, half-delivered, not JSON). */
export async function readJsonLoose(path, max = 64 * 1024 * 1024) {
  try {
    const st = await fsp.stat(path);
    if (st.size > max) return null;
    const t = await retryFs(() => fsp.readFile(path, 'utf8'), { retries: 4 });
    return JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);
  } catch { return null; }
}

/**
 * Complete new lines of a log from byte `offset`:
 *   {lines: [{obj, end}], end, partial, bad}
 *   end      the offset just after the last complete line read (where to resume)
 *   partial  bytes after it that do not end in a newline yet (still arriving)
 *   bad      {at, text} of the first line that is not JSON (reading stops before it)
 * A file shorter than `offset` was replaced by an older copy: the caller starts again from 0.
 */
export async function readLogFrom(path, offset) {
  let fh;
  try { fh = await fsp.open(path, 'r'); } catch (e) { return { lines: [], end: offset, partial: 0, bad: null, missing: e.code === 'ENOENT' }; }
  try {
    const { size } = await fh.stat();
    if (size <= offset) return { lines: [], end: Math.min(offset, size), partial: 0, bad: null, shrunk: size < offset };
    const len = Math.min(size - offset, MAX_READ);
    const buf = Buffer.alloc(len);
    let got = 0;
    while (got < len) {
      const { bytesRead } = await fh.read(buf, got, len - got, offset + got);
      if (!bytesRead) break;
      got += bytesRead;
    }
    const lines = [];
    let start = 0, bad = null;
    for (let i = 0; i < got; i++) {
      if (buf[i] !== 0x0a) continue;
      const raw = buf.subarray(start, i).toString('utf8').trim();
      if (raw) {
        let obj = null;
        try { obj = JSON.parse(raw); } catch { obj = null; }
        if (obj === null || typeof obj !== 'object') { bad = { at: offset + start, text: raw.slice(0, 80) }; break; }
        lines.push({ obj, end: offset + i + 1 });
      }
      start = i + 1;
    }
    const end = bad ? bad.at : offset + start;
    return { lines, end, partial: bad ? 0 : got - start, bad, more: got < size - offset };
  } finally { await fh.close().catch(() => {}); }
}

// ─── Finding a cloud folder ────────────────────────────────────────────────
/**
 * Cloud-drive folders on this computer: [{kind, label, path}] (existing ones
 * only, de-duplicated). Injectable for tests: env, platform, home, exists, read, list.
 */
export function detectCloudFolders({ env = process.env, platform = process.platform, home = homedir(), exists = existsSync, read = (p) => readFileSync(p, 'utf8'), list = (p) => readdirSync(p) } = {}) {
  const out = [];
  const seen = new Set();
  const P = platform === 'win32' ? win32 : posix;
  const add = (kind, label, p) => {
    if (!p) return;
    let full;
    try { full = P.resolve(String(p)); } catch { return; }
    const key = platform === 'win32' ? full.toLowerCase() : full;
    if (seen.has(key)) return;
    let ok = false;
    try { ok = exists(full) && (exists === existsSync ? statSync(full).isDirectory() : true); } catch { ok = false; }
    if (!ok) return;
    seen.add(key);
    out.push({ kind, label, path: full });
  };
  const sep = platform === 'win32' ? '\\' : '/';
  const j = (...a) => a.filter(Boolean).join(sep);

  // OneDrive: the Windows client sets these for the signed-in accounts.
  if (platform === 'win32') {
    add('onedrive', 'OneDrive', env.OneDriveConsumer || null);
    add('onedrive', 'OneDrive', env.OneDrive || null);
    add('onedrive', 'OneDrive (work or school)', env.OneDriveCommercial || null);
  }
  // Dropbox writes where its folder is to info.json.
  const dropboxInfo = platform === 'win32'
    ? [env.APPDATA && j(env.APPDATA, 'Dropbox', 'info.json'), env.LOCALAPPDATA && j(env.LOCALAPPDATA, 'Dropbox', 'info.json')]
    : [j(home, '.dropbox', 'info.json')];
  for (const f of dropboxInfo.filter(Boolean)) {
    try {
      const info = JSON.parse(read(f));
      if (info && info.personal && info.personal.path) add('dropbox', 'Dropbox', info.personal.path);
      if (info && info.business && info.business.path) add('dropbox', 'Dropbox (business)', info.business.path);
    } catch { /* not installed */ }
  }
  if (platform === 'win32') {
    // Google Drive for desktop: a virtual drive (G: by default) with "My Drive",
    // or mirrored files in the user folder; the old Backup and Sync folder.
    for (const L of 'GHIJKLMNOPQRSTUVWXYZ') add('gdrive', 'Google Drive', `${L}:\\My Drive`);
    add('gdrive', 'Google Drive', j(home, 'My Drive'));
    add('gdrive', 'Google Drive', j(home, 'Google Drive'));
    add('dropbox', 'Dropbox', j(home, 'Dropbox'));
    add('onedrive', 'OneDrive', j(home, 'OneDrive'));
  } else {
    // macOS File Provider folders: ~/Library/CloudStorage/OneDrive-*, GoogleDrive-*/My Drive, Dropbox.
    const cs = j(home, 'Library', 'CloudStorage');
    let names = [];
    try { if (exists(cs)) names = list(cs); } catch { names = []; }
    for (const n of names) {
      if (/^OneDrive/i.test(n)) add('onedrive', n.includes('-') ? `OneDrive (${n.split('-').slice(1).join('-')})` : 'OneDrive', j(cs, n));
      else if (/^GoogleDrive/i.test(n)) add('gdrive', 'Google Drive', j(cs, n, 'My Drive'));
      else if (/^Dropbox/i.test(n)) add('dropbox', 'Dropbox', j(cs, n));
    }
    add('dropbox', 'Dropbox', j(home, 'Dropbox'));
    add('onedrive', 'OneDrive', j(home, 'OneDrive'));
    add('gdrive', 'Google Drive', j(home, 'Google Drive'));
  }
  return out;
}
