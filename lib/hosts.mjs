// lib/hosts.mjs - which computers have this data folder open, so two of them
// never overwrite each other through OneDrive (or any folder sync), and the
// copies a sync tool leaves when they did.
//
// PRESENCE
//   <data>/hosts/<hostId>.json = {hostId, hostname, pid, version, startedAt, beatAt}
//   The server writes its own file (atomicWrite) at start and every 60 s, and
//   deletes it on a clean stop. Each computer writes only its own file, so a
//   sync tool never has two versions of one file to reconcile. 60 s rather
//   than seconds keeps the sync traffic low; the sync tool's own delay limits
//   how fast another computer can be seen anyway. hostId is random and kept
//   in the device folder (lib/devicedir.mjs), never the computer's name: two
//   laptops can share a name. The heartbeat is NOT in runtime.json, which is
//   meant to become device-local.
//
//   othersLive(dataDir, now) -> the OTHER hosts seen within LIVE_MS (3 minutes):
//   their own clock says they beat recently (|now - beatAt| <= 3 min, which
//   allows for some clock difference between computers), or this process saw
//   their beatAt change within the last 3 minutes by its own clock (which
//   catches a computer whose clock is far off once it has beaten twice).
//
// THE WRITE GATE (server/state-store.mjs writeGate)
//   createWriteGate({others}) - when another computer is live at START, writes
//   to the state pause (423 OTHER_COMPUTER) until the user chooses "Use here
//   anyway" (override) or the other computer goes away (closes OpenDash, or is
//   quiet for 3 minutes). A computer that appears LATER only shows a warning:
//   writes are never paused in the middle of an edit. {pauseLater:true} (MCP
//   embedded mode, tools: one-shot writers with nobody mid-edit) checks before
//   every write instead.
//
// ONEDRIVE CONFLICT COPIES
//   OneDrive does not merge two versions of a file: it keeps one and renames the
//   other '<name>-<DEVICE>.<ext>'. findConflictCopies() looks for those next to
//   the files that matter (the state, the actions journal, config, sources,
//   connections), never in backups/. keepConflictCopy() moves one into
//   state/backups/ (a copy of the state as onedrive-<DEVICE>-<stamp>.json, which
//   Settings > Data can restore; the others under state/backups/onedrive-copies/).
//   Nothing is ever merged automatically.
//
// Node stdlib only. Platform paths live in lib/devicedir.mjs; os.hostname()
// is only a label.

import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, copyFileSync, renameSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { hostname as osHostname } from 'node:os';
import { createHash, randomBytes } from 'node:crypto';
import { atomicWrite } from './fsutil.mjs';
import { ensureHostId, readHostId } from './devicedir.mjs';

export const BEAT_MS = 60 * 1000;
export const LIVE_MS = 3 * 60 * 1000;
const ID_RE = /^[a-f0-9]{16,64}$/;

export const hostsDir = (dataDir) => join(resolve(dataDir), 'hosts');
const hostFile = (dataDir, id) => join(hostsDir(dataDir), `${id}.json`);
const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 63) || 'another computer';

/** Every presence file that parses (any age), with its file name checked. */
export function readHosts(dataDir) {
  let names = [];
  try { names = readdirSync(hostsDir(dataDir)); } catch { return []; }
  const out = [];
  for (const n of names) {
    const m = /^([a-f0-9]{16,64})\.json$/.exec(n);      // skips temp files and sync-tool copies
    if (!m) continue;
    try {
      const j = JSON.parse(readFileSync(join(hostsDir(dataDir), n), 'utf8'));
      if (!j || j.hostId !== m[1] || !Number.isFinite(Number(j.beatAt))) continue;
      out.push({ hostId: j.hostId, hostname: cleanName(j.hostname), pid: Number(j.pid) || null, version: String(j.version || '').slice(0, 40), startedAt: j.startedAt || null, beatAt: Number(j.beatAt) });
    } catch { /* half-synced or damaged: ignored until it is whole */ }
  }
  return out;
}

// What this process has seen of each host's beatAt: {beatAt, changedAt}.
const seen = new Map();

/**
 * The other hosts that are live now. opts.selfId (default: this computer's id
 * for the data folder, read without creating one), opts.observer (a Map; the
 * module keeps one per process), opts.device (device root options, tests).
 * Each: {hostId, hostname, version, beatAt, lastSeenMs}.
 */
export function othersLive(dataDir, now = Date.now(), opts = {}) {
  const selfId = opts.selfId !== undefined ? opts.selfId : readHostId(dataDir, opts.device || {});
  const memo = opts.observer || seen;
  const out = [];
  for (const h of readHosts(dataDir)) {
    if (h.hostId === selfId) continue;
    const key = `${resolve(dataDir)}|${h.hostId}`;
    const prev = memo.get(key);
    let changedAt = prev ? prev.changedAt : null;
    if (prev && prev.beatAt !== h.beatAt) changedAt = now;     // it beat since we last looked
    memo.set(key, { beatAt: h.beatAt, changedAt });
    const age = now - h.beatAt;
    const byClock = Math.abs(age) <= LIVE_MS;
    const byChange = changedAt != null && now - changedAt <= LIVE_MS;
    if (!byClock && !byChange) continue;
    const lastSeenMs = Math.max(0, Math.min(byClock ? Math.max(0, age) : Infinity, byChange ? now - changedAt : Infinity));
    out.push({ hostId: h.hostId, hostname: h.hostname, version: h.version, beatAt: h.beatAt, lastSeenMs });
  }
  return out.sort((a, b) => a.lastSeenMs - b.lastSeenMs);
}

/** "just now", "1 min ago", "5 min ago" */
export function seenText(ms) {
  const m = Math.floor(Math.max(0, Number(ms) || 0) / 60000);
  return m < 1 ? 'just now' : `${m} min ago`;
}

/**
 * This computer's presence file for a data folder. start() writes it and
 * beats every BEAT_MS; stop() (or stopSync() at process exit) removes it.
 * opts: {dataDir, version, now, hostname, pid, intervalMs, device, log}.
 */
export function createPresence({ dataDir, version = '0', now = () => Date.now(), hostname = osHostname(), pid = process.pid, intervalMs = BEAT_MS, device = {}, log = () => {} } = {}) {
  const hostId = ensureHostId(dataDir, device);
  const startedAt = new Date(now()).toISOString();
  let timer = null, last = Promise.resolve(), stopped = false;
  const file = hostFile(dataDir, hostId);
  const body = () => JSON.stringify({ hostId, hostname: cleanName(hostname), pid, version, startedAt, beatAt: now() }, null, 1);
  function beat() {
    if (stopped) return last;
    last = last.then(() => (stopped ? null : atomicWrite(file, body()))).catch((e) => { log('warn', `hosts: could not write the presence file (${e.code || e.message})`); });
    return last;
  }
  const mine = () => { try { const j = JSON.parse(readFileSync(file, 'utf8')); return j && j.hostId === hostId && j.pid === pid; } catch { return false; } };
  return {
    hostId, hostname: cleanName(hostname), file,
    start() { stopped = false; const p = beat(); if (!timer) { timer = setInterval(beat, intervalMs); timer.unref?.(); } return p; },
    beat,
    others: (at = now(), opts = {}) => othersLive(dataDir, at, { ...opts, selfId: hostId }),
    async stop() {
      stopped = true; clearInterval(timer); timer = null;
      await last;
      if (mine()) { try { unlinkSync(file); } catch { /* gone */ } }
    },
    stopSync() { stopped = true; clearInterval(timer); timer = null; if (mine()) { try { unlinkSync(file); } catch { /* gone */ } } },
  };
}

// ─── The write gate ──────────────────────────────────────────────────────
export const OTHER_COMPUTER = 'OTHER_COMPUTER';

/** The 423 error a refused write throws (HTTP routes, the actions layer, MCP all pass it on). */
export function otherComputerError(h) {
  const host = cleanName(h && h.hostname);
  const lastSeen = h && h.beatAt ? new Date(h.beatAt).toISOString() : null;
  const message = `OpenDash is open on ${host} (seen ${seenText(h && h.lastSeenMs)}). Changes here are paused so the two computers don't overwrite each other. Close it there, or choose "Use here anyway" in OpenDash on this computer.`;
  const e = new Error(message);
  return Object.assign(e, {
    status: 423, code: OTHER_COMPUTER, host, lastSeen, lastSeenMs: h ? h.lastSeenMs : null,
    toJSON: () => ({ error: message, code: OTHER_COMPUTER, message, host, lastSeen }),
  });
}

/**
 * others() -> the live other hosts (presence.others). Re-checked at most every
 * recheckMs while paused. init() decides at start; check() is the store's
 * writeGate (throws otherComputerError); override() is "Use here anyway".
 */
export function createWriteGate({ others, now = () => Date.now(), pauseLater = false, recheckMs = 10000 } = {}) {
  let blocked = null, overridden = false, cache = { at: -Infinity, list: [] };
  const live = (force) => {
    if (force || now() - cache.at >= recheckMs) { let l = []; try { l = others() || []; } catch { l = []; } cache = { at: now(), list: l }; }
    return cache.list;
  };
  function init() { const l = live(true); blocked = !overridden && l.length ? l[0] : null; return status(); }
  function current() {
    if (overridden) return null;
    if (pauseLater) { const l = live(); return l.length ? l[0] : null; }
    if (!blocked) return null;
    const l = live();
    if (!l.length) { blocked = null; return null; }      // it went away: writes resume
    blocked = l[0];
    return blocked;
  }
  function check() { const h = current(); if (h) throw otherComputerError(h); }
  function override() { overridden = true; blocked = null; return status(); }
  /** For the page (GET /api/hosts): always a fresh look. */
  function status() {
    live(true);
    const h = current();
    return { paused: !!h, by: h ? { hostId: h.hostId, hostname: h.hostname, lastSeenMs: h.lastSeenMs, seen: seenText(h.lastSeenMs) } : null, overridden };
  }
  return { init, check, override, status, others: () => live(true) };
}

// ─── OneDrive conflict copies ────────────────────────────────────────────
export const KNOWN_FILES = Object.freeze([
  { kind: 'state', dir: 'state', base: 'dashboard-state' },
  { kind: 'journal', dir: 'state', base: 'actions-journal' },
  { kind: 'config', dir: '', base: 'config' },
  { kind: 'sources', dir: '', base: 'sources' },
  { kind: 'connections', dir: '', base: 'connections' },
]);
const DEVICE = '([A-Za-z][A-Za-z0-9-]{0,62})';
// Suffixes people and tools put on copies that are not a device's name.
const NOT_A_DEVICE = /^(backup|bak|old|new|copy|orig|original|tmp|temp|test|draft|v\d+|\d+)$/i;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** [{rel, kind, device, at, size}] - the '<known-file>-<DEVICE>.json' copies in data/ and data/state/. */
export function findConflictCopies(dataDir) {
  const root = resolve(dataDir), out = [];
  for (const dir of ['', 'state']) {
    let names = [];
    try { names = readdirSync(join(root, dir)); } catch { continue; }
    for (const n of names) {
      for (const k of KNOWN_FILES.filter(x => x.dir === dir)) {
        const m = new RegExp(`^${esc(k.base)}-${DEVICE}\\.json$`).exec(n);
        if (!m || NOT_A_DEVICE.test(m[1])) continue;
        // 'dashboard-state-x' must not count as a copy of 'dashboard' and so on: the base is exact
        const full = join(root, dir, n);
        let st; try { st = statSync(full); } catch { continue; }
        if (!st.isFile()) continue;
        out.push({ rel: dir ? `${dir}/${n}` : n, kind: k.kind, device: m[1], at: st.mtime.toISOString(), size: st.size });
      }
    }
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const stamp = (d) => d.toISOString().replace(/[:.]/g, '-');

/**
 * "Keep as a backup": copy one found conflict copy into state/backups/
 * (verified), then remove it from where the sync tool left it. Only names that
 * findConflictCopies() reports are accepted. Returns {kept, name, kind, device}.
 */
export function keepConflictCopy(dataDir, rel, { now = () => Date.now() } = {}) {
  const root = resolve(dataDir);
  const hit = findConflictCopies(root).find(c => c.rel === rel);
  if (!hit) throw Object.assign(new Error('that copy is not there any more'), { status: 404, code: 'NOT_FOUND' });
  const src = join(root, ...hit.rel.split('/'));
  const backups = join(root, 'state', 'backups');
  const dev = hit.device.replace(/[^A-Za-z0-9-]/g, '');
  const name = hit.kind === 'state'
    ? `onedrive-${dev}-${stamp(new Date(now()))}.json`                     // restorable from Settings > Data
    : `onedrive-copies/${KNOWN_FILES.find(k => k.kind === hit.kind).base}-${dev}-${stamp(new Date(now()))}.json`;
  const dst = join(backups, ...name.split('/'));
  mkdirSync(dirname(dst), { recursive: true });
  const tmp = `${dst}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  const h = sha(src);
  copyFileSync(src, tmp);
  if (sha(tmp) !== h) { try { unlinkSync(tmp); } catch { /* gone */ } throw new Error('the copy could not be verified; nothing was changed'); }
  renameSync(tmp, dst);
  unlinkSync(src);
  return { kept: hit.rel, name, kind: hit.kind, device: hit.device };
}

export const _test = { seen };
