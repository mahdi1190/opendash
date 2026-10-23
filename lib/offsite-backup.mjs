// lib/offsite-backup.mjs - the optional daily ENCRYPTED copy of your data in a
// cloud folder (OneDrive/OpenDash Backups by default), so a data folder that
// lives only on this computer (Settings > Data > Move) still has an off-site
// copy. The cloud only ever sees ciphertext.
//
//   What is copied   the same files as "Export all data" (lib/sharing.mjs exportData):
//                    settings, tasks and notes, calendar and email snapshots, finances.
//                    No sign-ins, keys, logs or caches.
//   File             'OpenDash backup <YYYY-MM-DD> <computer>.odbackup', one a day per
//                    computer; the newest KEEP (14) of this computer's are kept, older
//                    ones (only these files) are removed.
//   Format           line 1  'OPENDASH-BACKUP 1'
//                    line 2  header JSON {v, alg, kdf, iv, createdAt, host, appVersion, bytes}
//                    then    AES-256-GCM ciphertext of the export zip, then the 16-byte tag.
//                    Lines 1 and 2 are the additional authenticated data, so a changed
//                    header fails like a wrong key.
//   Key              from a passphrase (scrypt N=2^15 r=8 p=1, random salt in the header)
//                    or, when sync has one, its recovery key (HKDF-SHA256). The derived
//                    key is kept on THIS computer only (lib/secret-store.mjs
//                    'offsite-backup'), so the daily copy runs unattended; restoring on
//                    another computer needs the passphrase (or recovery key) again.
//                    Forget it and the copies cannot be opened: OpenDash cannot help.
//
// createOffsiteBackup({...}) is the service the server route uses
// (server/routes/offsite-backup.mjs). Everything it touches comes in as
// arguments (the secret store, the export, the clock), so tests run in temp
// folders. Node stdlib only.

import { createCipheriv, createDecipheriv, randomBytes, scrypt as scryptCb, hkdfSync, createHash } from 'node:crypto';
import { promises as fsp, existsSync } from 'node:fs';
import { join } from 'node:path';

export const KEEP = 14;
export const MAGIC = 'OPENDASH-BACKUP 1';
export const EXT = '.odbackup';
export const SECRET_KEY = 'offsite-backup';
const KDF = Object.freeze({ name: 'scrypt', N: 1 << 15, r: 8, p: 1 });
export const MIN_PASSPHRASE = 10;

const scrypt = (pw, salt, o) => new Promise((res, rej) => scryptCb(pw, salt, 32, { N: o.N, r: o.r, p: o.p, maxmem: 128 * o.N * o.r * 2 }, (e, k) => (e ? rej(e) : res(k))));
const err = (code, message, status = 400) => Object.assign(new Error(message), { code, status });

/** The key for a passphrase or a recovery key, and the kdf description that goes in the header. */
export async function deriveKey({ passphrase, recoveryKey, kdf } = {}) {
  if (recoveryKey) {
    const salt = kdf && kdf.salt ? Buffer.from(kdf.salt, 'base64') : randomBytes(16);
    const key = Buffer.from(hkdfSync('sha256', Buffer.from(recoveryKey), salt, Buffer.from('opendash offsite backup v1'), 32));
    return { key, kdf: { name: 'hkdf-recovery', salt: salt.toString('base64') } };
  }
  if (typeof passphrase !== 'string' || !passphrase) throw err('NO_PASSPHRASE', 'A passphrase is needed.');
  const k = kdf && kdf.name === 'scrypt' ? kdf : { ...KDF, salt: randomBytes(16).toString('base64') };
  if (!(k.N >= 1024 && k.N <= (1 << 20) && k.r >= 1 && k.r <= 32 && k.p >= 1 && k.p <= 16)) throw err('DAMAGED', 'This backup file is damaged (unknown key settings).');
  const key = await scrypt(passphrase.normalize('NFC'), Buffer.from(k.salt, 'base64'), k);
  return { key, kdf: { name: 'scrypt', N: k.N, r: k.r, p: k.p, salt: k.salt } };
}

/** Encrypt the export zip. Returns the file's bytes. */
export function encryptBackup(plain, { key, kdf, host = '', appVersion = '', now = Date.now() }) {
  const iv = randomBytes(12);
  const header = { v: 1, alg: 'AES-256-GCM', kdf, iv: iv.toString('base64'), createdAt: new Date(now).toISOString(), host: String(host).slice(0, 63), appVersion: String(appVersion).slice(0, 40), bytes: plain.length };
  const head = Buffer.from(`${MAGIC}\n${JSON.stringify(header)}\n`, 'utf8');
  const c = createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(head);
  const body = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([head, body, c.getAuthTag()]);
}

/** {header, head, body, tag} of a backup file (no key needed). Throws NOT_A_BACKUP / DAMAGED. */
export function parseBackup(buf) {
  const s = buf.subarray(0, Math.min(buf.length, 4096)).toString('latin1');
  if (!s.startsWith(MAGIC + '\n')) throw err('NOT_A_BACKUP', 'This is not an OpenDash backup file.');
  const end = s.indexOf('\n', MAGIC.length + 1);
  if (end < 0) throw err('DAMAGED', 'This backup file is damaged.');
  let header;
  try { header = JSON.parse(buf.subarray(MAGIC.length + 1, end).toString('utf8')); } catch { throw err('DAMAGED', 'This backup file is damaged.'); }
  if (!header || header.v !== 1 || header.alg !== 'AES-256-GCM' || !header.iv || !header.kdf) throw err('DAMAGED', 'This backup file is from a newer OpenDash or is damaged.');
  if (buf.length < end + 1 + 16) throw err('DAMAGED', 'This backup file is incomplete.');
  return { header, head: buf.subarray(0, end + 1), body: buf.subarray(end + 1, buf.length - 16), tag: buf.subarray(buf.length - 16) };
}

/** The export zip from a backup file. secret: {passphrase} | {recoveryKey} | {key}. Throws WRONG_KEY. */
export async function decryptBackup(buf, secret = {}) {
  const { header, head, body, tag } = parseBackup(buf);
  let key = secret.key;
  if (!key) {
    if (header.kdf.name === 'scrypt') key = (await deriveKey({ passphrase: secret.passphrase, kdf: header.kdf })).key;
    else if (header.kdf.name === 'hkdf-recovery') {
      if (!secret.recoveryKey) throw err('NEEDS_RECOVERY_KEY', 'This copy was locked with the sync recovery key. Enter it to open it.');
      key = (await deriveKey({ recoveryKey: secret.recoveryKey, kdf: header.kdf })).key;
    } else throw err('DAMAGED', 'This backup file uses an unknown lock.');
  }
  try {
    const d = createDecipheriv('aes-256-gcm', key, Buffer.from(header.iv, 'base64'));
    d.setAAD(head);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(body), d.final()]);
  } catch { throw err('WRONG_KEY', 'That passphrase does not open this copy (or the file was changed).', 403); }
}

// ─── Files ───────────────────────────────────────────────────────────────
const slug = (h) => String(h || 'this-computer').replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'this-computer';
const NAME_RE = /^OpenDash backup (\d{4}-\d{2}-\d{2}) ([A-Za-z0-9-]{1,40})\.odbackup$/;
export const backupName = (date, host) => `OpenDash backup ${date} ${slug(host)}${EXT}`;
export const parseName = (n) => { const m = NAME_RE.exec(n); return m ? { date: m[1], host: m[2] } : null; };
const localDate = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** The backups in a folder, newest first: [{name, date, host, size, at, header?}]. */
export async function listBackups(folder) {
  let names = [];
  try { names = await fsp.readdir(folder); } catch { return []; }
  const out = [];
  for (const n of names) {
    const p = parseName(n);
    if (!p) continue;
    try {
      const st = await fsp.stat(join(folder, n));
      let header = null;
      try { const fh = await fsp.open(join(folder, n), 'r'); try { const b = Buffer.alloc(Math.min(4096, st.size)); await fh.read(b, 0, b.length, 0); header = parseBackup(Buffer.concat([b, Buffer.alloc(16)])).header; } finally { await fh.close(); } } catch { header = null; }
      out.push({ name: n, ...p, size: st.size, at: st.mtime.toISOString(), createdAt: header ? header.createdAt : null, lock: header ? (header.kdf.name === 'scrypt' ? 'passphrase' : 'recovery key') : null, ok: !!header });
    } catch { /* gone */ }
  }
  return out.sort((a, b) => (b.date + b.name).localeCompare(a.date + a.name));
}

/** Remove this computer's oldest copies beyond keep. Only files named like ours, of this host. */
export async function prune(folder, host, keep = KEEP) {
  const mine = (await listBackups(folder)).filter(b => b.host === slug(host)).sort((a, b) => b.date.localeCompare(a.date));
  const removed = [];
  for (const b of mine.slice(keep)) { try { await fsp.unlink(join(folder, b.name)); removed.push(b.name); } catch { /* in use: next time */ } }
  return removed;
}

/** The suggested folder: <OneDrive>/OpenDash Backups, or null without OneDrive. */
export function defaultBackupFolder(env = process.env) {
  const od = env.OneDrive || env.OneDriveConsumer || env.OneDriveCommercial;
  return od ? join(od, 'OpenDash Backups') : null;
}

// ─── The service ─────────────────────────────────────────────────────────
/**
 * createOffsiteBackup({secrets, exportZip() -> Buffer, host, appVersion, env, now, log, recoveryKey() -> Buffer|null})
 *   status()                      -> {enabled, folder, suggestedFolder, lock, lastRunAt, lastResult, due, canUseRecoveryKey}
 *   configure({enabled, folder, passphrase, useRecoveryKey})
 *   runNow()                      -> {name, bytes, removed}
 *   isDue()                       -> today's copy not made yet (and switched on)
 *   list(folder?)                 -> listBackups
 *   open(name, secret)            -> the export zip (Buffer) of one copy
 */
export function createOffsiteBackup({ secrets, exportZip, host = 'this-computer', appVersion = '', env = process.env, now = () => Date.now(), log = () => {}, recoveryKey = () => null } = {}) {
  if (!secrets || typeof exportZip !== 'function') throw new Error('createOffsiteBackup needs {secrets, exportZip}');
  let running = null;
  const read = async () => (await secrets.get(SECRET_KEY)) || {};
  const write = (v) => secrets.set(SECRET_KEY, v);

  async function status() {
    const s = await read();
    return {
      enabled: !!s.enabled, folder: s.folder || null, suggestedFolder: defaultBackupFolder(env), lock: s.kind || null,
      lastRunAt: s.lastRunAt || null, lastResult: s.lastResult || null, lastFile: s.lastFile || null, keep: KEEP,
      due: await isDue(), running: !!running, canUseRecoveryKey: !!recoveryKey(),
    };
  }

  async function configure({ enabled, folder, passphrase, useRecoveryKey } = {}) {
    const s = await read();
    if (folder !== undefined) {
      if (folder !== null && (typeof folder !== 'string' || !/^([A-Za-z]:[\\/]|\/)/.test(folder) || folder.length > 400)) throw err('BAD_FOLDER', 'Choose a full folder path for the copies.');
      s.folder = folder;
    }
    if (useRecoveryKey) {
      const rk = recoveryKey();
      if (!rk) throw err('NO_RECOVERY_KEY', 'Sync has no recovery key on this computer yet. Use a passphrase instead.');
      const d = await deriveKey({ recoveryKey: rk });
      Object.assign(s, { kind: 'recovery', key: d.key.toString('base64'), kdf: d.kdf });
    } else if (passphrase !== undefined) {
      if (typeof passphrase !== 'string' || passphrase.length < MIN_PASSPHRASE) throw err('WEAK_PASSPHRASE', `Use a passphrase of at least ${MIN_PASSPHRASE} characters (a few words is easiest to remember).`);
      const d = await deriveKey({ passphrase });
      Object.assign(s, { kind: 'passphrase', key: d.key.toString('base64'), kdf: d.kdf });
    }
    if (enabled !== undefined) {
      if (enabled && !s.key) throw err('NO_PASSPHRASE', 'Choose a passphrase first.');
      if (enabled && !(s.folder || defaultBackupFolder(env))) throw err('BAD_FOLDER', 'Choose a folder for the copies.');
      if (enabled && !s.folder) s.folder = defaultBackupFolder(env);
      s.enabled = !!enabled;
    }
    await write(s);
    return status();
  }

  async function isDue() {
    const s = await read();
    if (!s.enabled || !s.key || !s.folder) return false;
    return !s.lastRunAt || localDate(Date.parse(s.lastRunAt)) !== localDate(now()) || s.lastResult !== 'ok';
  }

  async function runNow() {
    if (running) return running;
    running = (async () => {
      const s = await read();
      if (!s.key || !s.folder) throw err('NOT_SET_UP', 'Switch the daily encrypted copy on first.');
      const at = now();
      try {
        await fsp.mkdir(s.folder, { recursive: true });
        const zip = await exportZip();
        const file = encryptBackup(zip, { key: Buffer.from(s.key, 'base64'), kdf: s.kdf, host, appVersion, now: at });
        const name = backupName(localDate(at), host);
        const tmp = join(s.folder, `.${name}.tmp-${process.pid}`);
        await fsp.writeFile(tmp, file);
        await fsp.rename(tmp, join(s.folder, name)).catch(async (e) => { await fsp.unlink(tmp).catch(() => {}); throw e; });
        const removed = await prune(s.folder, host, KEEP);
        await write({ ...(await read()), lastRunAt: new Date(at).toISOString(), lastResult: 'ok', lastFile: name, lastError: null });
        log('note', `encrypted copy saved: ${name} (${Math.round(file.length / 1024)} KB)${removed.length ? `; removed ${removed.length} older` : ''}`);
        return { name, bytes: file.length, removed };
      } catch (e) {
        await write({ ...(await read()), lastRunAt: new Date(at).toISOString(), lastResult: 'error', lastError: String(e.code || e.message).slice(0, 120) });
        log('warn', `encrypted copy failed: ${e.code || e.message}`);
        throw e;
      }
    })();
    try { return await running; } finally { running = null; }
  }

  async function list(folder) {
    const s = await read();
    const f = folder || s.folder || defaultBackupFolder(env);
    return f && existsSync(f) ? listBackups(f) : [];
  }

  async function open(name, secret = {}) {
    if (!parseName(String(name || ''))) throw err('BAD_NAME', 'Unknown backup.');
    const s = await read();
    const folder = secret.folder || s.folder || defaultBackupFolder(env);
    let buf;
    try { buf = await fsp.readFile(join(folder, name)); } catch { throw err('NOT_FOUND', 'That copy is not there any more.', 404); }
    // On this computer, with nothing typed: the key it keeps (only if it is the same lock).
    if (!secret.passphrase && !secret.recoveryKey && s.key) {
      const h = parseBackup(buf).header;
      if (s.kdf && h.kdf && h.kdf.salt === s.kdf.salt) return decryptBackup(buf, { key: Buffer.from(s.key, 'base64') });
    }
    if (!secret.passphrase && !secret.recoveryKey && recoveryKey()) return decryptBackup(buf, { recoveryKey: recoveryKey() });
    return decryptBackup(buf, secret);
  }

  return { status, configure, runNow, isDue, list, open };
}

export const _test = { slug, localDate, sha: (b) => createHash('sha256').update(b).digest('hex') };
