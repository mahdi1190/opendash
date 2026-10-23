// lib/devicedir.mjs - the folder on THIS computer that belongs to one data
// folder, and the sign-ins and keys kept in it.
//
// The data folder may be shared between computers through OneDrive, Dropbox
// or a USB stick. Sign-ins must not travel with it: a refresh token that two
// computers both rotate breaks on one of them (a Monzo refresh token works
// only once), and a cloud folder is the wrong place for keys. So they live in
// a per-computer folder instead:
//
//   <data>/data-id.json      {id, createdAt}: a random id made once. The device
//                            folder is found by this id, not by the data
//                            folder's path, so moving the data folder keeps
//                            its sign-ins on this computer.
//   deviceBase()             Windows  %LOCALAPPDATA%\OpenDash
//                            macOS    ~/Library/Application Support/OpenDash
//                            Linux    $XDG_STATE_HOME/opendash, else ~/.local/state/opendash
//                            DASHBOARD_DEVICE_DIR replaces it (portable set-ups).
//   deviceRoot(dataDir)      <base>/<dataId>
//   secretsDir(dataDir)      <base>/<dataId>/secrets   (was <data>/secrets before 2.15)
//   <base>/<dataId>/host.json  {hostId}: this computer's id for this data folder
//                            (lib/hosts.mjs presence files). Random, never the
//                            computer's name: two laptops can share a name.
//
// What does NOT travel to another computer (by design): every sign-in
// (Google, Microsoft, Google Health, ElevenLabs, the remote MCP and relay
// pairings) and the finance connector credentials in secrets/fin/, including
// the Enable Banking .pem key and the Monzo client ID and secret. On a new
// computer the user signs in again (docs/INSTALL.md).
//
// migrateLegacySecrets() moves an old <data>/secrets folder here once
// (server start-up runs it; see the function).
//
// TESTS never touch the real folder: a process started by `node --test`
// (NODE_TEST_CONTEXT, or --test in execArgv) uses <os tmp>/opendash-test-device
// unless DASHBOARD_DEVICE_DIR or opts.base says otherwise. Every function
// takes opts {base, env, platform, home} so tests can inject the device root.
//
// Node stdlib only. secretsDir() is synchronous: its callers build their
// paths in plain factory functions.

import {
  existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, renameSync, unlinkSync, rmdirSync, copyFileSync, chmodSync,
} from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { randomBytes, createHash } from 'node:crypto';

const ID_RE = /^[a-f0-9]{16,64}$/;

/** True in a process started by the node test runner (never in a real server). */
function underTestRunner(env) {
  if (env && env.NODE_TEST_CONTEXT) return true;
  return env === process.env && process.execArgv.some(a => a === '--test' || a.startsWith('--test-'));
}

/** The folder that holds one device folder per data folder on this computer. */
export function deviceBase({ base, env = process.env, platform = process.platform, home } = {}) {
  if (base) return resolve(base);
  if (env.DASHBOARD_DEVICE_DIR) return resolve(env.DASHBOARD_DEVICE_DIR);
  if (underTestRunner(env)) return join(tmpdir(), 'opendash-test-device');
  const h = home || homedir();
  if (platform === 'win32') return join(env.LOCALAPPDATA || join(h, 'AppData', 'Local'), 'OpenDash');
  if (platform === 'darwin') return join(h, 'Library', 'Application Support', 'OpenDash');
  return join(env.XDG_STATE_HOME || join(h, '.local', 'state'), 'opendash');
}

// ─── data-id.json ─────────────────────────────────────────────────────────
export const dataIdFile = (dataDir) => join(resolve(dataDir), 'data-id.json');

const sleepSync = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { /* no wait: spin is fine */ } };

/** The data folder's id, or null when it has none yet (never creates it). */
export function readDataId(dataDir) {
  try {
    const t = readFileSync(dataIdFile(dataDir), 'utf8');
    const j = JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);
    return j && ID_RE.test(j.id) ? j.id : null;
  } catch { return null; }
}

/**
 * The data folder's id, made once (an exclusive create, so two processes
 * starting together agree on one id). A file that exists but holds no valid
 * id is read again for a moment (another process may be writing it), then
 * replaced.
 */
export function ensureDataId(dataDir) {
  const f = dataIdFile(dataDir);
  for (let i = 0; i < 25; i++) {
    const cur = readDataId(dataDir);
    if (cur) return cur;
    if (!existsSync(f) || i === 24) {
      mkdirSync(dirname(f), { recursive: true });
      const id = randomBytes(12).toString('hex');
      const body = JSON.stringify({ id, createdAt: new Date().toISOString() }, null, 1) + '\n';
      if (i === 24) {          // unreadable for a quarter of a second: replace it (atomically)
        const tmp = `${f}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
        writeFileSync(tmp, body); renameSync(tmp, f);
        return id;
      }
      try { writeFileSync(f, body, { flag: 'wx' }); return id; }
      catch (e) { if (e.code !== 'EEXIST') throw e; }
    }
    sleepSync(10);
  }
  return readDataId(dataDir);
}

// ─── The device folder ────────────────────────────────────────────────────
/**
 * <base>/<dataId> for this data folder. opts.create (default true) makes the
 * data id if there is none; with create:false a data folder without one
 * gives null. Only the PATH is made here: writers create the folders.
 */
export function deviceRoot(dataDir, opts = {}) {
  const id = opts.create === false ? readDataId(dataDir) : ensureDataId(dataDir);
  return id ? join(deviceBase(opts), id) : null;
}

/** Where this computer keeps the sign-ins and keys for this data folder. */
export function secretsDir(dataDir, opts = {}) {
  return join(deviceRoot(dataDir, opts), 'secrets');
}

/** The old place, inside the (possibly shared) data folder. Only the migration reads it. */
export const legacySecretsDir = (dataDir) => join(resolve(dataDir), 'secrets');

// ─── This computer's host id (lib/hosts.mjs) ─────────────────────────────
const hostFile = (root) => join(root, 'host.json');
function readHostFile(root) {
  try { const j = JSON.parse(readFileSync(hostFile(root), 'utf8')); return j && ID_RE.test(j.hostId) ? j.hostId : null; } catch { return null; }
}
/** This computer's host id for the data folder, or null if it never had one (never creates anything). */
export function readHostId(dataDir, opts = {}) {
  const root = deviceRoot(dataDir, { ...opts, create: false });
  return root ? readHostFile(root) : null;
}
/** This computer's host id for the data folder, made once in the device folder. */
export function ensureHostId(dataDir, opts = {}) {
  const root = deviceRoot(dataDir, opts);
  for (let i = 0; i < 25; i++) {
    const cur = readHostFile(root);
    if (cur) return cur;
    mkdirSync(root, { recursive: true, mode: 0o700 });
    const id = randomBytes(12).toString('hex');
    try { writeFileSync(hostFile(root), JSON.stringify({ hostId: id, createdAt: new Date().toISOString() }, null, 1) + '\n', { flag: i === 24 ? 'w' : 'wx' }); return id; }
    catch (e) { if (e.code !== 'EEXIST') throw e; }
    sleepSync(10);
  }
  return readHostFile(root);
}

// ─── One-time move of <data>/secrets ─────────────────────────────────────
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const isJunk = (name) => /\.lock$/i.test(name) || /\.tmp-/i.test(name);

function listFiles(dir) {
  const out = [], junk = [], dirs = [];
  const walk = (rel) => {
    const full = rel ? join(dir, rel) : dir;
    for (const n of readdirSync(full).sort()) {
      const r = rel ? join(rel, n) : n;
      const st = statSync(join(dir, r));
      if (st.isDirectory()) { dirs.push(r); walk(r); }
      else if (isJunk(n)) junk.push(r);
      else out.push(r);
    }
  };
  walk('');
  return { files: out, junk, dirs };
}

/** Copy src to dst through a temp file + rename (dst is complete or absent), mode 0600, verified. */
function copyVerified(src, dst, hash) {
  mkdirSync(dirname(dst), { recursive: true, mode: 0o700 });
  const tmp = join(dirname(dst), `.${dst.split(/[\\/]/).pop()}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`);
  try {
    copyFileSync(src, tmp);
    try { chmodSync(tmp, 0o600); } catch { /* Windows */ }
    if (sha256(tmp) !== hash) throw new Error('the copy does not match the original');
    renameSync(tmp, dst);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* gone */ }
    throw e;
  }
}

/** A free name next to `file` (file, file.2, file.3 ...) for a backup that must not replace another. */
function freeName(file) {
  if (!existsSync(file)) return file;
  for (let i = 2; ; i++) if (!existsSync(`${file}.${i}`)) return `${file}.${i}`;
}

/**
 * Move a legacy <data>/secrets folder into secretsDir(dataDir), once.
 *
 *   - Nothing to do when the data folder has no secrets/ (the usual case).
 *   - Skipped while another computer has the data folder open
 *     (opts.othersLive() returns a non-empty list): that computer may still be
 *     using those files. It runs at a later start.
 *   - 1. copy every file into the device folder and verify it by SHA-256. A
 *        device-local file that is already there is never replaced: the same
 *        content counts as copied; different content means this computer has
 *        a newer sign-in, which wins (the old file is still kept, step 2).
 *     2. move the originals into <device>/legacy-secrets-backup/ (copied and
 *        verified, then removed from the data folder).
 *     3. remove the emptied secrets/ folder (lock and temp files left by old
 *        writers go with it).
 *   - Resumable: stopped half-way (a crash, a power cut), the next run skips
 *     what is already copied and finishes the rest.
 *
 * opts: {base, env, platform, home} (device root), othersLive() -> [], dryRun,
 * log(level, msg), now(), onStep(step, rel) (tests: throw to simulate a crash).
 * Returns {status: 'none' | 'skipped' | 'dry-run' | 'done', copied, already,
 * kept, backedUp, removed, reason?}.
 */
export function migrateLegacySecrets(dataDir, opts = {}) {
  const log = opts.log || (() => {});
  const legacy = legacySecretsDir(dataDir);
  const res = { status: 'none', copied: [], already: [], kept: [], backedUp: [], removed: [] };
  if (!existsSync(legacy)) return res;
  let st;
  try { st = statSync(legacy); } catch { return res; }
  if (!st.isDirectory()) return res;
  const others = typeof opts.othersLive === 'function' ? (opts.othersLive() || []) : [];
  if (others.length) {
    const h = others[0];
    res.status = 'skipped';
    res.reason = `another computer (${h.hostname || 'unknown'}) has this data folder open`;
    log('warn', `secrets: not moving <data>/secrets to this computer yet: ${res.reason}`);
    return res;
  }
  const root = deviceRoot(dataDir, opts);
  const target = join(root, 'secrets');
  const backup = join(root, 'legacy-secrets-backup');
  const { files, junk, dirs } = listFiles(legacy);
  const step = (name, rel) => { if (opts.onStep) opts.onStep(name, rel); };
  if (opts.dryRun) {
    for (const rel of files) (existsSync(join(target, rel)) ? res.already : res.copied).push(rel.split(sep).join('/'));
    res.status = 'dry-run';
    return res;
  }
  const hashes = new Map();
  // 1. copy + verify
  for (const rel of files) {
    const src = join(legacy, rel), dst = join(target, rel);
    const h = sha256(src);
    hashes.set(rel, h);
    if (existsSync(dst)) {
      if (sha256(dst) === h) res.already.push(rel);
      else { res.kept.push(rel); log('warn', `secrets: ${rel.split(sep).join('/')} already exists on this computer with other content; keeping this computer's copy`); }
    } else {
      copyVerified(src, dst, h);
      res.copied.push(rel);
    }
    step('copy', rel);
  }
  // 2. originals -> legacy-secrets-backup/, then out of the data folder
  for (const rel of files) {
    const src = join(legacy, rel), h = hashes.get(rel);
    let bak = join(backup, rel);
    if (!(existsSync(bak) && sha256(bak) === h)) {
      bak = freeName(bak);
      copyVerified(src, bak, h);
    }
    res.backedUp.push(rel);
    step('backup', rel);
    unlinkSync(src);
    res.removed.push(rel);
    step('remove', rel);
  }
  // 3. the emptied folder
  for (const rel of junk) { try { unlinkSync(join(legacy, rel)); } catch { /* in use: left */ } }
  for (const rel of dirs.slice().sort((a, b) => b.length - a.length)) { try { rmdirSync(join(legacy, rel)); } catch { /* not empty */ } }
  try { rmdirSync(legacy); } catch { /* not empty: something new appeared; the next start finishes */ }
  try {
    const rec = join(root, 'legacy-secrets-migrated.json');
    const now = typeof opts.now === 'function' ? opts.now() : Date.now();
    writeFileSync(rec, JSON.stringify({ at: new Date(now).toISOString(), files: files.length, kept: res.kept.map(r => r.split(sep).join('/')) }, null, 1) + '\n');
  } catch { /* the record is only a note */ }
  res.status = 'done';
  const norm = (a) => a.map(r => r.split(sep).join('/'));
  for (const k of ['copied', 'already', 'kept', 'backedUp', 'removed']) res[k] = norm(res[k]);
  log('info', `secrets: moved ${files.length} file(s) from the data folder to this computer (${relative(resolve(dataDir), legacy) || 'secrets'} -> device folder; originals in legacy-secrets-backup/)`);
  return res;
}
