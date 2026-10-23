// lib/sync/folder.mjs - the shared sync folder on disk, and finding one.
//
//   <cloud folder>/OpenDash Sync/
//     devices/<deviceId>/device.json          {name, lastSeen, instance, app}  (rewritten now and then)
//     devices/<deviceId>/ops-YYYYMMDD.jsonl   append-only change log, one change per line
//     devices/<deviceId>/ops-YYYYMMDD-NN.jsonl  the same day, continued (a part stays under ~512 KB,
//                                             so a cloud client never re-uploads a big file per edit)
//     devices/<deviceId>/snapshot.json        every register this device knows (compaction; written
//                                             rarely: after ~1 MB of log or once a day)
//     devices/<deviceId>/keys.json            encrypted sync (v 2): the sync key wrapped for each
//                                             member, and the member list (lib/sync/e2e.mjs)
//     devices/<deviceId>/pair.json            encrypted sync: adding a device (pairing, QR offer)
//
// File format (v 1). One change per log line:
//   {v:1, dev, n, h, s, w:[[path, value]], x:[path]}     plain
//   {v:1, dev, n, h, enc:{...}}                           RESERVED for end-to-end encryption:
//                                                         this version stops at such a line and
//                                                         reports it, never skips or applies it
// snapshot.json {v:1, dev, seq, hlc, seen, covers, enc:null, data} and device.json
// {v:1, deviceId, name, lastSeen, instance, app, format:1, enc:null} carry the same
// reserved enc field (null = not encrypted).
// Format v 2 (end-to-end encrypted, docs/dev/SYNC_FORMAT.md section 11):
//   {v:2, dev, n, enc:{k, iv, ct}}     a change; the log file's NAME is part of
//                                      the associated data, so appendLog takes it
//                                      from nextLogName() (appendLog(lines, {name})).
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

import { promises as fsp, existsSync, readFileSync, readdirSync, statSync, watch as fsWatch } from 'node:fs';
import { join, resolve, basename, win32, posix } from 'node:path';
import { homedir } from 'node:os';
import { atomicWrite, retryFs } from '../fsutil.mjs';
import { oneDriveRoots, oneDriveLabel, kindFromName } from '../onedrive.mjs';

export const SYNC_DIR_NAME = 'OpenDash Sync';
export const DEVICE_RE = /^[0-9a-f]{16}$/;
export const LOG_RE = /^ops-(\d{8})(?:-(\d{2}))?\.jsonl$/;
export const MAX_LOG_BYTES = 512 * 1024;
const MAX_READ = 8 * 1024 * 1024;           // per file per pass

/** The sync root for a chosen folder: <folder>/OpenDash Sync (or the folder itself if it is one). */
export function syncRootFor(folder) {
  const f = resolve(String(folder));
  return basename(f).toLowerCase() === SYNC_DIR_NAME.toLowerCase() ? f : join(f, SYNC_DIR_NAME);
}
export const devicesDir = (root) => join(root, 'devices');
export const deviceDir = (root, id) => join(root, 'devices', id);
/** True for a name this protocol writes; false for temp files, conflict copies and anything else. */
export const KEY_FILES = Object.freeze(['keys.json', 'pair.json']);
export const isSyncFileName = (n) => n === 'device.json' || n === 'snapshot.json' || KEY_FILES.includes(n) || LOG_RE.test(n);
const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '');

// ─── Writing this device's files ───────────────────────────────────────────
/**
 * This device's log writer. append(lines) adds complete lines to today's log
 * (temp file + rename of the whole file, which only ever grows), returns the
 * file name and its new size.
 */
export function createLogWriter({ root, deviceId, now = () => Date.now(), maxBytes = MAX_LOG_BYTES }) {
  const dir = deviceDir(root, deviceId);
  const cache = new Map();   // file name -> content (this process is the only writer)

  async function current(want) {
    const day = utcDay(now());
    let names = [];
    try { names = (await fsp.readdir(dir)).filter(n => LOG_RE.test(n) && n.slice(4, 12) === day).sort(); } catch { /* new folder */ }
    let name = names.length ? names[names.length - 1] : `ops-${day}.jsonl`;
    if (want && want !== name && LOG_RE.test(want)) name = want;      // the name the caller encrypted for
    let text = cache.get(name);
    if (text === undefined) {
      text = await retryFs(() => fsp.readFile(join(dir, name), 'utf8')).catch((e) => { if (e.code === 'ENOENT') return ''; throw e; });
      // A line cut short (the computer stopped mid-write in an older version,
      // or a cloud client restored a partial copy) is closed off so the next
      // line starts clean; readers skip the broken one.
      if (text && !text.endsWith('\n')) text += '\n';
    }
    if (Buffer.byteLength(text) >= maxBytes && !want) {
      const m = LOG_RE.exec(name);
      const part = String(Number(m[2] || 0) + 1).padStart(2, '0');
      name = `ops-${day}-${part}.jsonl`;
      text = cache.get(name) ?? '';
    }
    return { name, text };
  }

  /** The file the next append goes to (encrypted lines name it in their associated data). */
  async function nextName() { return (await current()).name; }

  async function append(lines, { name: want } = {}) {
    if (!lines.length) return null;
    const { name, text } = await current(want);
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

  return { dir, append, nextName, sizes, forget: () => cache.clear() };
}

export async function writeDeviceInfo(root, deviceId, info) {
  await atomicWrite(join(deviceDir(root, deviceId), 'device.json'), JSON.stringify({ v: 1, deviceId, format: 1, enc: null, ...info }, null, 1));
}
export async function writeSnapshot(root, deviceId, snap) {
  await atomicWrite(join(deviceDir(root, deviceId), 'snapshot.json'), JSON.stringify({ enc: null, ...snap }));
}

/** The offset just after the line that starts at `at` (to step over a line that stays unreadable), or null. */
export async function lineEndAfter(path, at) {
  const fh = await fsp.open(path, 'r').catch(() => null);
  if (!fh) return null;
  try {
    const buf = Buffer.alloc(64 * 1024);
    let pos = at;
    for (;;) {
      const { bytesRead } = await fh.read(buf, 0, buf.length, pos);
      if (!bytesRead) return null;
      const i = buf.subarray(0, bytesRead).indexOf(0x0a);
      if (i >= 0) return pos + i + 1;
      pos += bytesRead;
    }
  } finally { await fh.close().catch(() => {}); }
}

/** The largest change number in this device's own logs (after a restart that lost meta). */
async function lastSeqIn(dir) {
  let names = [];
  try { names = (await fsp.readdir(dir)).filter(n => LOG_RE.test(n)); } catch { return 0; }
  let max = 0;
  for (const n of names) {
    let fh;
    try {
      fh = await fsp.open(join(dir, n), 'r');
      const { size } = await fh.stat();
      const len = Math.min(size, 256 * 1024);
      const buf = Buffer.alloc(len);
      await fh.read(buf, 0, len, size - len);
      for (const line of buf.toString('utf8').split('\n').reverse()) {
        try { const o = JSON.parse(line); if (Number.isInteger(o.n)) { max = Math.max(max, o.n); break; } } catch { /* partial */ }
      }
    } catch { /* unreadable: skip */ } finally { await fh?.close().catch(() => {}); }
  }
  return max;
}

// ─── The transport ─────────────────────────────────────────────────────────
/**
 * The FOLDER transport: a cloud-drive desktop folder (OneDrive, Google Drive
 * for desktop, Dropbox). lib/sync/engine.mjs talks only to this interface, so
 * another transport (for example a OneDrive app folder through Microsoft
 * Graph) can replace it without touching the merge:
 *
 *   kind, label, where          what and where (for the status line)
 *   ready()                     the place is reachable (never creates the cloud folder itself)
 *   listDevices()               device ids present
 *   listFiles(id)               {logs:[{name,size,mtimeMs}], snapshot, device}
 *   readJson(id, name)          device.json / snapshot.json, or null while half-delivered
 *   readLog(id, name, offset)   complete new lines (readLogFrom)
 *   skipLine(id, name, at)      offset after an unreadable line
 *   appendLog(lines, {name}?)   this device's log -> {name, size}
 *   nextLogName()               the log file the next append goes to (encrypted sync binds it)
 *   writeOwnJson(name, value)   this device's keys.json / pair.json (encrypted sync)
 *   removeOwnFile(name)         ...and removing one
 *   removeOldDevice(id)         this device's files under an id it used before (after it moved
 *                               to encrypted sync with a new id): never another device's
 *   logSizes()                  {name: size} of this device's logs
 *   lastOwnSeq()                the newest change number in this device's logs
 *   writeDevice(info), writeSnapshot(snap), removeOwnLog(name, size)
 *   watch(onEvent)              change events for other devices' files (may return null)
 */
export function createFolderAdapter({ folder, deviceId, now = () => Date.now(), maxLogBytes = MAX_LOG_BYTES, watchFn = fsWatch }) {
  const root = syncRootFor(folder);
  const own = deviceDir(root, deviceId);
  const writer = createLogWriter({ root, deviceId, now, maxBytes: maxLogBytes });
  const p = (id, name) => join(deviceDir(root, id), name);
  return {
    kind: 'folder', where: root, folder,
    async ready() {
      if (!existsSync(folder)) return false;          // OneDrive not running / signed out: wait, never create it
      await fsp.mkdir(own, { recursive: true });
      return true;
    },
    listDevices: () => listDevices(root),
    listFiles: (id) => listDeviceFiles(root, id),
    readJson: (id, name, max) => readJsonLoose(p(id, name), max),
    readLog: (id, name, offset) => readLogFrom(p(id, name), offset),
    skipLine: (id, name, at) => lineEndAfter(p(id, name), at),
    appendLog: (lines, opts) => writer.append(lines, opts),
    nextLogName: () => writer.nextName(),
    async writeOwnJson(name, value) {
      if (!KEY_FILES.includes(name)) throw new Error(`not a sync file: ${name}`);
      await atomicWrite(join(own, name), JSON.stringify(value));
    },
    async removeOwnFile(name) {
      if (!KEY_FILES.includes(name)) return;
      await retryFs(() => fsp.unlink(join(own, name))).catch(() => {});
    },
    async removeOldDevice(id) {
      if (!DEVICE_RE.test(id) || id === deviceId) return;
      const dir = deviceDir(root, id);
      let names = [];
      try { names = await fsp.readdir(dir); } catch { return; }
      for (const n of names) if (isSyncFileName(n)) await retryFs(() => fsp.unlink(join(dir, n))).catch(() => {});
      await fsp.rmdir(dir).catch(() => {});       // left if anything else is in it
    },
    logSizes: () => writer.sizes(),
    lastOwnSeq: () => lastSeqIn(own),
    writeDevice: (info) => writeDeviceInfo(root, deviceId, info),
    writeSnapshot: (snap) => writeSnapshot(root, deviceId, snap),
    async removeOwnLog(name, size) {
      if (!LOG_RE.test(name)) return;
      const st = await fsp.stat(join(own, name)).catch(() => null);
      if (st && st.size === size) await fsp.unlink(join(own, name)).catch(() => {});
    },
    forget: () => writer.forget(),
    /**
     * onGone() runs (once) when the folder disappears (signed out of OneDrive,
     * folder deleted): Windows keeps firing events for a deleted folder, so the
     * watcher closes itself and the engine makes a new one when it is back.
     */
    watch(onEvent, onGone = () => {}) {
      if (!existsSync(root)) return null;
      let closed = false;
      const close = () => { if (closed) return; closed = true; try { w.close(); } catch { /* closed */ } };
      const gone = () => { if (closed) return; close(); onGone(); };
      const w = watchFn(root, { recursive: true, persistent: false }, (ev, name) => {
        if (closed) return;
        if (!existsSync(root)) { gone(); return; }
        const n = String(name || '');
        if (n && n.includes(deviceId)) return;                    // our own writes
        if (n && !/(device|snapshot|keys|pair)\.json$|\.jsonl$/.test(n)) return;
        onEvent();
      });
      w.on('error', gone);
      return close;
    },
  };
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
  try { names = await fsp.readdir(dir); } catch { return { logs: [], snapshot: null, device: null, keys: null, pair: null }; }
  const out = { logs: [], snapshot: null, device: null, keys: null, pair: null };
  for (const n of names.filter(isSyncFileName).sort()) {
    let st;
    try { st = await fsp.stat(join(dir, n)); } catch { continue; }
    if (!st.isFile()) continue;
    const e = { name: n, size: st.size, mtimeMs: st.mtimeMs };
    if (n === 'snapshot.json') out.snapshot = e; else if (n === 'device.json') out.device = e;
    else if (n === 'keys.json') out.keys = e; else if (n === 'pair.json') out.pair = e; else out.logs.push(e);
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
  const add = (kind, label, p, extra = {}) => {
    if (!p) return;
    let full;
    try { full = P.resolve(String(p)); } catch { return; }
    const key = platform === 'win32' ? full.toLowerCase() : full;
    if (seen.has(key)) return;
    let ok = false;
    try { ok = exists(full) && (exists === existsSync ? statSync(full).isDirectory() : true); } catch { ok = false; }
    if (!ok) return;
    seen.add(key);
    out.push({ kind, label, path: full, ...(extra.work ? { work: true } : {}) });
  };
  const sep = platform === 'win32' ? '\\' : '/';
  const j = (...a) => a.filter(Boolean).join(sep);

  // OneDrive: the Windows client sets these for the signed-in accounts. %OneDrive%
  // is the account added last (often the work one): lib/onedrive.mjs tells
  // personal from work or school, and a work one is marked and listed last.
  if (platform === 'win32') for (const r of oneDriveRoots(env)) add('onedrive', oneDriveLabel(r), r.path, { work: r.work });
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
      if (/^OneDrive/i.test(n)) { const k = kindFromName(n) || { work: false, org: null }; add('onedrive', oneDriveLabel(k), j(cs, n), { work: k.work }); }
      else if (/^GoogleDrive/i.test(n)) add('gdrive', 'Google Drive', j(cs, n, 'My Drive'));
      else if (/^Dropbox/i.test(n)) add('dropbox', 'Dropbox', j(cs, n));
    }
    add('dropbox', 'Dropbox', j(home, 'Dropbox'));
    add('onedrive', 'OneDrive', j(home, 'OneDrive'));
    add('gdrive', 'Google Drive', j(home, 'Google Drive'));
  }
  // Personal folders first: the first one is what "turn sync on" uses when no folder was chosen.
  return out.map((d, i) => ({ d, i })).sort((a, b) => (!!a.d.work - !!b.d.work) || a.i - b.i).map(x => x.d);
}
