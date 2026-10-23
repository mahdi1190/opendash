// lib/sync/engine.mjs - live sync between computers through a cloud-drive folder.
//
// No server and no sign-in: the user's own OneDrive / Google Drive / Dropbox
// desktop folder carries the changes (lib/sync/folder.mjs is that transport;
// the engine only talks to its adapter interface). Off by default.
//
// Two switches (Settings > Sync):
//   enabled  this computer records its changes into the shared folder and reads
//            the other computers' changes
//   apply    those changes are written into this computer's data. OFF at first
//            (SHADOW MODE): the engine merges them into a separate copy, works
//            out what WOULD change (shadow-report.json, the status line) and
//            changes nothing. Turning it on applies everything collected so far
//            with exactly the same merge.
//
// Where it hooks in (one engine, in the dashboard server process only):
//   - every write to the state goes through server/state-store.mjs. Writes made
//     in this process (the page's PUT /api/state, the actions layer, the MCP
//     server over HTTP) are heard through store.onChange; writes by other
//     processes (the MCP server in embedded mode, tools/ scripts) are found by
//     the poll, which looks at the state file's mtime (the same check
//     server/live-sync.mjs makes). Changes are found by comparing the state
//     with this computer's SHADOW: the register tree of lib/sync/model.mjs,
//     which holds the last value of every synced field. _lastSave is never
//     trusted as a clock.
//   - a sync pass runs inside store.mutate(): under the state lock it first
//     records what changed locally (capture) and appends it to this device's
//     log, then merges what the other devices wrote and (apply on) commits the
//     merged state through the same compare-and-swap commit. So the version
//     goes up, store.onChange fires, server/live-sync.mjs tells open tabs over
//     /api/events at once, and the MCP server sees the new version.
//
// This computer's own files live OUTSIDE the data folder (which may itself be
// in OneDrive): %LOCALAPPDATA%\OpenDash\sync\<key> on Windows, ~/Library/
// Application Support/OpenDash/sync/<key> on macOS, ~/.local/state/opendash/
// sync/<key> elsewhere (DASHBOARD_SYNC_LOCAL_DIR overrides):
//   settings.json   {enabled, apply, folder, deviceName}
//   device.json     {deviceId, host, instance}: this computer's identity
//   meta.json       the shadow registers, the collected remote registers (shadow
//                   mode), the clock, how far each device's logs were read
//   meta.pending.json  meta for a merged state being committed (crash safety)
//   conflicts.jsonl edits that lost to a concurrent edit on another computer
//   shadow-report.json what applying would change (shadow mode)
//
// Logs (server.log) never contain task text or names: counts only.

import { promises as fsp, existsSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { hostname, homedir } from 'node:os';
import { randomBytes, createHash } from 'node:crypto';
import { atomicWrite, isInside } from '../fsutil.mjs';
import { createClock, decodeHlc } from './hlc.mjs';
import {
  capture, applyWrite, materialize, newTree, serializeTree, loadTree, validateOp, checkWrite, classifyPath,
  syncedFingerprint, elementPrefixes, getReg, walkRegs, concurrent, devOf, stable,
} from './model.mjs';
import { syncRootFor, createFolderAdapter, LOG_RE, detectCloudFolders } from './folder.mjs';

const CHUNK = 1000;                        // writes per log line
const HEARTBEAT_MS = 2 * 60 * 1000;        // device.json lastSeen
const SNAPSHOT_BYTES = 1024 * 1024;        // a fresh snapshot after this much log...
const SNAPSHOT_MS = 24 * 60 * 60 * 1000;   // ...or once a day when something changed
const LOG_KEEP_DAYS = 30;                  // own logs older than this (and in a snapshot) are removed
const BAD_LINE_TRIES = 3;                  // a line that stays unreadable this many passes is skipped
const CONFLICT_KEEP = 500;
const errMsg = (e) => String((e && (e.code || e.message)) || e).slice(0, 120);

/** Where this computer keeps its own sync files for a data folder (never inside it). */
export function defaultLocalDir(dataDir, host = hostname(), { env = process.env, platform = process.platform, home = homedir() } = {}) {
  if (env.DASHBOARD_SYNC_LOCAL_DIR) return resolve(env.DASHBOARD_SYNC_LOCAL_DIR);
  const key = createHash('sha1').update(`${resolve(dataDir).toLowerCase()}|${host}`).digest('hex').slice(0, 16);
  const base = platform === 'win32' ? join(env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'OpenDash')
    : platform === 'darwin' ? join(home, 'Library', 'Application Support', 'OpenDash')
      : join(env.XDG_STATE_HOME || join(home, '.local', 'state'), 'opendash');
  return join(base, 'sync', key);
}

export function createSyncEngine({
  store, dataDir, localDir, log = () => {}, now = () => Date.now(), pollMs = 5000, watch = true, debounceMs = 120,
  appVersion = '0', host = hostname(), detect = () => detectCloudFolders(), forbid = [], maxDriftMs, metaSaveMs = 10000,
  adapterFactory = (o) => createFolderAdapter(o),
} = {}) {
  if (!store || !dataDir) throw new Error('createSyncEngine needs {store, dataDir}');
  const dir = localDir ? resolve(localDir) : defaultLocalDir(dataDir, host);
  const F = {
    settings: join(dir, 'settings.json'), device: join(dir, 'device.json'), meta: join(dir, 'meta.json'),
    pending: join(dir, 'meta.pending.json'), conflicts: join(dir, 'conflicts.jsonl'), report: join(dir, 'shadow-report.json'),
  };
  let settings = { enabled: false, apply: false, folder: null, deviceName: null };
  let device = null;            // {deviceId, host, instance, createdAt}
  let meta = null;              // see freshMeta()
  let tree = newTree();         // the shadow: what this computer's data holds, field by field
  let remoteTree = newTree();   // shadow mode: other computers' changes, collected, not applied
  let clock = null;
  let ad = null;                // the transport adapter
  let active = false;
  let unwatch = null, poller = null, debounce = null, unsubscribe = null;
  let running = null, again = false;
  let localDirty = false, lastStateMtime = -1, lastHeartbeat = 0, firstEventAt = null;
  let metaDirty = false, lastMetaSave = 0, previewDirty = false;
  const peers = new Map();      // deviceId -> {name, lastSeen, app}
  const listeners = new Set();  // onApplied
  const st = {
    state: 'off', message: '', lastSyncAt: null, lastSentAt: null, lastReceivedAt: null, lastError: null,
    waitingLines: 0, waitingFrom: null, encrypted: 0, conflictsSeen: 0, recentConflicts: [], lastApply: null, rejected: 0, skipped: 0,
    preview: null,
  };

  const freshMeta = (where) => ({
    v: 1, deviceId: device.deviceId, where, hlc: null, seq: 0, frontier: {}, ahead: {}, pendingSeen: {}, offsets: {}, snaps: {}, bad: {},
    joined: false, join: false, lastSnapshotAt: 0, snapSeq: 0, bytesSinceSnapshot: 0, createdAt: new Date(now()).toISOString(),
  });

  // ─── Local files ─────────────────────────────────────────────────────
  async function readLocal(p) { try { return JSON.parse(await fsp.readFile(p, 'utf8')); } catch { return null; } }

  async function loadSettings() {
    const s = await readLocal(F.settings);
    if (s && typeof s === 'object') settings = { enabled: !!s.enabled, apply: !!s.apply, folder: typeof s.folder === 'string' ? s.folder : null, deviceName: typeof s.deviceName === 'string' ? s.deviceName : null };
  }
  async function saveSettings() { await atomicWrite(F.settings, JSON.stringify(settings, null, 1)); }
  let loaded = false;

  /** Read this computer's identity (made only when sync is first turned on). */
  async function loadDevice() {
    const d = await readLocal(F.device);
    device = d && /^[0-9a-f]{16}$/.test(d.deviceId || '') && d.host === host && d.instance ? d : null;
  }
  async function ensureDevice() { if (!device) await newIdentity(null); }
  async function newIdentity(why) {
    device = { deviceId: randomBytes(8).toString('hex'), host, instance: randomBytes(8).toString('hex'), createdAt: new Date(now()).toISOString() };
    await atomicWrite(F.device, JSON.stringify(device, null, 1));
    meta = null; tree = newTree(); remoteTree = newTree();
    await fsp.unlink(F.meta).catch(() => {});
    await fsp.unlink(F.pending).catch(() => {});
    if (why) log('warn', `sync: new device identity (${why})`);
  }

  async function loadMeta() {
    meta = null; tree = newTree(); remoteTree = newTree();
    if (!device) return;
    // A merged state that was being committed when the server stopped: keep
    // its meta only if the state file really holds that merge.
    const pend = await readLocal(F.pending);
    if (pend && pend.expect) {
      const cur = await store.readObject().catch(() => null);
      if (cur && syncedFingerprint(cur) === pend.expect) await fsp.rename(F.pending, F.meta).catch(() => {});
      else await fsp.unlink(F.pending).catch(() => {});
    }
    const m = await readLocal(F.meta);
    if (m && m.v === 1 && m.deviceId === device.deviceId) {
      const { tree: t, remote: rt, expect, ...rest } = m;
      meta = { ...freshMeta(m.where), ...rest };
      tree = loadTree(t);
      remoteTree = loadTree(rt);
    }
  }
  function metaJson(extra = {}) { return JSON.stringify({ ...meta, ...extra, tree: serializeTree(tree), remote: serializeTree(remoteTree) }); }
  async function saveMeta() { await atomicWrite(F.meta, metaJson()); metaDirty = false; lastMetaSave = now(); }
  /**
   * meta.json is about the size of the synced data, so it is not rewritten on
   * every local edit: after a crash the newest local changes are simply sent
   * again (same values, harmless). A merge that changes the state is saved at
   * once (savePending), because there a stale meta WOULD matter.
   */
  async function saveMetaSoon(force = false) { if (metaDirty && (force || now() - lastMetaSave >= metaSaveMs)) await saveMeta(); }
  async function savePending(fp) { await atomicWrite(F.pending, metaJson({ expect: fp })); }
  async function promotePending() { if (existsSync(F.pending)) { await fsp.rename(F.pending, F.meta).catch(async () => { await saveMeta(); }); metaDirty = false; lastMetaSave = now(); } }

  // ─── Who has seen what (to tell concurrent edits from later ones) ────
  function markSeen(dev, n, into = meta.frontier, ahead = meta.ahead) {
    const c = into[dev] || 0;
    if (n <= c) return;
    if (n === c + 1) {
      let k = n;
      const a = new Set(ahead[dev] || []);
      while (a.has(k + 1)) { a.delete(k + 1); k++; }
      into[dev] = k;
      ahead[dev] = [...a].filter(x => x > k).sort((x, y) => x - y).slice(0, 5000);
      if (!ahead[dev].length) delete ahead[dev];
    } else {
      const a = new Set(ahead[dev] || []); a.add(n);
      ahead[dev] = [...a].sort((x, y) => x - y).slice(-5000);
    }
  }
  function seenAtLeast(dev, n, into = meta.frontier) {
    if ((into[dev] || 0) >= n) return;
    into[dev] = n;
    if (into === meta.frontier && meta.ahead[dev]) { meta.ahead[dev] = meta.ahead[dev].filter(x => x > n); if (!meta.ahead[dev].length) delete meta.ahead[dev]; }
  }
  const seenVector = () => Object.freeze(Object.fromEntries(Object.entries(meta.frontier).filter(([d]) => d !== device.deviceId)));

  // ─── Conflicts ───────────────────────────────────────────────────────
  const nameOf = (h) => (devOf(h) === device.deviceId ? 'this computer' : (peers.get(devOf(h)) || {}).name || 'another computer');
  function labelFor(path, state) {
    const [top, id, ...rest] = path;
    const field = rest.filter(s => s !== '@alive' && s !== '@pos').join(' > ') || null;
    const find = (arr) => (Array.isArray(arr) ? arr.find(x => x && String(x.id) === String(id)) : null);
    if (top === 'custom') { const t = find(state && state.custom); return { what: 'task', name: t ? String(t.title || '').slice(0, 80) : null, field }; }
    if (top === 'people') { const p = find(state && state.people); return { what: 'person', name: p ? String(p.name || '').slice(0, 80) : null, field }; }
    if (['countdowns', 'streams', 'resources'].includes(top)) { const x = find(state && state[top]); return { what: top.replace(/s$/, ''), name: x ? String(x.label || x.title || '').slice(0, 80) : null, field }; }
    return { what: top, name: null, field: [id, ...rest].filter(Boolean).join(' > ') || null };
  }
  function recordConflict(list, kind, c, state) {
    if (list.length >= 200) return;
    // A joining computer's older copy (written at the clock's floor) losing is expected, not a clash.
    const lw = decodeHlc(c.lost.h);
    if (lw && lw.wall === 0) return;
    list.push({
      at: new Date(now()).toISOString(), kind, path: c.path, ...labelFor(c.path, state),
      kept: { by: nameOf(c.kept.h), h: c.kept.h, ...(c.kept.d ? { deleted: true } : { value: c.kept.v }) },
      lost: { by: nameOf(c.lost.h), h: c.lost.h, ...(c.lost.d ? { deleted: true } : { value: c.lost.v }) },
    });
  }
  async function saveConflicts(list) {
    if (!list.length) return;
    st.conflictsSeen += list.length;
    const short = (x) => ({ ...x, ...(x.value !== undefined ? { value: typeof x.value === 'string' ? x.value.slice(0, 120) : JSON.stringify(x.value).slice(0, 120) } : {}) });
    st.recentConflicts = [...list.map(c => ({ ...c, kept: short(c.kept), lost: short(c.lost) })), ...st.recentConflicts].slice(0, 20);
    let text = '';
    try { text = await fsp.readFile(F.conflicts, 'utf8'); } catch { /* first */ }
    const lines = (text + list.map(c => JSON.stringify(c)).join('\n') + '\n').split('\n').filter(Boolean).slice(-CONFLICT_KEEP);
    await atomicWrite(F.conflicts, lines.join('\n') + '\n').catch(() => {});
  }

  // ─── Reading other devices ───────────────────────────────────────────
  /** Everything new from the other computers, without changing meta. */
  async function gather() {
    const out = { ops: [], snaps: [], offsets: {}, snapKeys: {}, bad: {}, waitingLines: 0, waitingFrom: null, rejected: 0, encrypted: 0 };
    for (const id of await ad.listDevices()) {
      const files = await ad.listFiles(id);
      if (files.device) {
        const p = peers.get(id);
        if (!p || p.mtimeMs !== files.device.mtimeMs) {
          const info = await ad.readJson(id, 'device.json', 256 * 1024);
          if (info && info.deviceId === id) peers.set(id, { name: String(info.name || '').slice(0, 60) || 'Another computer', lastSeen: Date.parse(info.lastSeen) || files.device.mtimeMs, app: String(info.app || '').slice(0, 20), instance: info.instance || null, mtimeMs: files.device.mtimeMs });
        }
      }
      const newest = Math.max(0, ...files.logs.map(l => l.mtimeMs));
      if (peers.has(id) && newest > (peers.get(id).lastSeen || 0)) peers.get(id).lastSeen = newest;
      if (id === device.deviceId && meta.joined) continue;   // our own files: read again only to recover lost meta
      const offs = { ...(meta.offsets[id] || {}) };
      if (files.snapshot) {
        const key = `${files.snapshot.size}:${files.snapshot.mtimeMs}`;
        if (meta.snaps[id] !== key) {
          const snap = await ad.readJson(id, 'snapshot.json');
          if (snap && snap.enc != null) out.encrypted++;    // reserved: a later version encrypts; never guessed at
          else if (snap && snap.v === 1 && snap.dev === id && snap.data && snap.data.v === 2) {
            out.snaps.push({ dev: id, snap });
            out.snapKeys[id] = key;
            for (const [n, size] of Object.entries(snap.covers || {})) if (LOG_RE.test(n) && Number.isFinite(size)) offs[n] = Math.max(offs[n] || 0, size);
          }
          // else: still arriving (half a file is not JSON): try again next pass
        }
      }
      for (const lf of files.logs) {
        let from = offs[lf.name] || 0;
        if (lf.size < from) from = 0;             // replaced by an older copy: read it again (merging twice is harmless)
        if (lf.size === from) continue;
        const r = await ad.readLog(id, lf.name, from);
        let end = r.end, last = from, stopped = false;
        for (const { obj, end: e } of r.lines) {
          if (obj && obj.enc != null) { out.encrypted++; end = last; stopped = true; break; }   // reserved for encryption: stop, do not skip
          const v = validateOp(obj, id);
          if (!v) out.rejected++;
          else { out.rejected += v.rejected; out.ops.push(v.op); }
          last = e;
        }
        if (r.bad && !stopped) {
          const bk = `${id}/${lf.name}`;
          const prev = meta.bad[bk];
          const tries = prev && prev.at === r.bad.at && prev.size === lf.size ? prev.tries + 1 : 1;
          if (tries >= BAD_LINE_TRIES) {
            // Unreadable for several passes with the file unchanged: step over that line.
            end = (await ad.skipLine(id, lf.name, r.bad.at)) ?? end;
            out.rejected++;
            log('warn', 'sync: skipped an unreadable line in a log from another device');
          } else out.bad[bk] = { at: r.bad.at, size: lf.size, tries };
        }
        if (r.partial > 0 && !stopped) { out.waitingLines++; out.waitingFrom = id; }
        offs[lf.name] = end;
      }
      out.offsets[id] = offs;
    }
    return out;
  }

  // ─── Merging ─────────────────────────────────────────────────────────
  function applyRemote(path, reg, touched, conflicts, cur) {
    const res = applyWrite(tree, path, reg, (c) => {
      if (path[path.length - 1] === '@pos') return;   // a move that lost is not worth a conflict
      recordConflict(conflicts, 'same-field', c, cur);
    });
    if (res === 'won') touched.add(path[0]);
    const leaf = path[path.length - 1];
    // An edit inside something another computer deleted at the same time: the delete wins.
    if (leaf !== '@alive' && leaf !== '@pos' && !reg.d) {
      for (const pre of elementPrefixes(path)) {
        if (pre.length < 2 || pre.length >= path.length) continue;
        const al = getReg(tree, [...pre, '@alive']);
        if (al && !al.d && al.v === false && (concurrent(al, reg) || concurrent(reg, al))) {
          recordConflict(conflicts, 'edit-after-delete', { path, kept: al, lost: reg }, cur);
          break;
        }
      }
    }
    // ...and the other way round: this delete removed edits it had not seen.
    if (leaf === '@alive' && reg.v === false && res === 'won') {
      const pre = path.slice(0, -1);
      let node = tree;
      for (const s of pre) { node = node && node.k ? node.k.get(s) : null; if (!node) break; }
      if (node) for (const [p, r] of walkRegs(node, pre)) {
        const l = p[p.length - 1];
        if (l === '@alive' || l === '@pos' || r.d) continue;
        if (concurrent(r, reg)) { recordConflict(conflicts, 'edit-after-delete', { path: p, kept: reg, lost: r }, cur); break; }
      }
    }
    return res;
  }

  /** Incoming writes, as [path, reg] (validated), from snapshots and log lines. */
  function* incoming(got, result) {
    for (const { dev, snap } of got.snaps) {
      let top = null;
      for (const [p, r] of walkRegs(loadTree(snap.data))) {
        const ok = r.d ? (classifyPath(p) || {}).leaf === 'value' : checkWrite(p, r.v);
        if (!ok || !decodeHlc(r.h)) { st.rejected++; continue; }
        if (!top || r.h > top) top = r.h;
        yield [p, r.d ? { h: r.h, n: r.n, s: r.s, d: true } : { h: r.h, n: r.n, s: r.s, v: ok.value }];
      }
      if (top) clock.observe(top);
      result.snapSeen.push({ dev, snap });
    }
    for (const op of got.ops) {
      clock.observe(op.h);
      for (const [p, v] of op.w) yield [p, { h: op.h, n: op.n, s: op.s, v }];
      for (const p of op.x) yield [p, { h: op.h, n: op.n, s: op.s, d: true }];
      result.opSeen.push(op);
    }
  }

  async function mutateFn(cur, got, opts) {
    const result = { sent: 0, received: 0, collected: 0, from: new Set(), conflicts: [], snapSeen: [], opSeen: [] };
    // a) what changed here since the last pass
    const cap = capture(cur, tree, { onSkip: () => { st.skipped++; } });
    if (cap.w.length || cap.x.length) {
      const joining = meta.join && !meta.joined;
      let h = joining ? clock.floor() : clock.tick();
      if (!joining) {
        // A register written by a clock that runs ahead: this edit must still win.
        let top = null;
        for (const [p] of cap.w) { const r = getReg(tree, p); if (r && (!top || r.h > top)) top = r.h; }
        for (const p of cap.x) { const r = getReg(tree, p); if (r && (!top || r.h > top)) top = r.h; }
        if (top && top >= h) { clock.observe(top, { force: true }); h = clock.tick(); }
      }
      const s = seenVector();
      const lines = [];
      let w = cap.w, x = cap.x;
      while (w.length || x.length) {
        const cw = w.slice(0, CHUNK); w = w.slice(cw.length);
        const cx = x.slice(0, CHUNK - cw.length); x = x.slice(cx.length);
        lines.push({ v: 1, dev: device.deviceId, n: ++meta.seq, h, s, w: cw, x: cx });
      }
      for (const op of lines) {
        for (const [p, v] of op.w) applyWrite(tree, p, { h: op.h, n: op.n, s: op.s, v });
        for (const p of op.x) applyWrite(tree, p, { h: op.h, n: op.n, s: op.s, d: true });
      }
      const r = await ad.appendLog(lines);
      meta.bytesSinceSnapshot += lines.reduce((a, l) => a + JSON.stringify(l).length + 1, 0);
      if (r) meta.offsets[device.deviceId] = { ...(meta.offsets[device.deviceId] || {}), [r.name]: r.size };
      result.sent = cap.w.length + cap.x.length;
      metaDirty = true;
    }
    meta.joined = true;

    const touched = new Set();
    if (settings.apply) {
      // b) apply: what was collected in shadow mode first, then what is new
      for (const [p, r] of walkRegs(remoteTree)) if (applyRemote(p, r, touched, result.conflicts, cur) === 'won') { result.received++; result.from.add(devOf(r.h)); }
      if (remoteTree.k) {
        remoteTree = newTree();
        for (const [d, n] of Object.entries(meta.pendingSeen)) seenAtLeast(d, n);
        meta.pendingSeen = {};
      }
      for (const [p, reg] of incoming(got, result)) if (applyRemote(p, reg, touched, result.conflicts, cur) === 'won') { result.received++; result.from.add(devOf(reg.h)); }
      for (const op of result.opSeen) markSeen(op.dev, op.n);
      for (const { dev, snap } of result.snapSeen) {
        if (Number.isInteger(snap.seq)) seenAtLeast(dev, snap.seq);
        for (const [d, n] of Object.entries(snap.seen || {})) if (/^[0-9a-f]{16}$/.test(d) && Number.isInteger(n) && d !== device.deviceId) seenAtLeast(d, n);
      }
    } else {
      // b') shadow mode: collect, never touch the state
      for (const [p, reg] of incoming(got, result)) { if (applyWrite(remoteTree, p, reg) === 'won') result.collected++; }
      for (const op of result.opSeen) meta.pendingSeen[op.dev] = Math.max(meta.pendingSeen[op.dev] || 0, op.n);
      for (const { dev, snap } of result.snapSeen) if (Number.isInteger(snap.seq)) meta.pendingSeen[dev] = Math.max(meta.pendingSeen[dev] || 0, snap.seq);
      if (result.collected) previewDirty = true;
    }
    for (const { dev } of got.snaps) meta.snaps[dev] = got.snapKeys[dev];
    for (const [id, offs] of Object.entries(got.offsets)) meta.offsets[id] = { ...(meta.offsets[id] || {}), ...offs };
    meta.bad = got.bad;
    meta.hlc = clock.peek();
    if (got.ops.length || got.snaps.length) metaDirty = true;

    // c) the merged state, through the store's own commit
    if (!touched.size) { await saveMetaSoon(); return { next: null, result }; }
    const next = materialize(cur, tree, [...touched]);
    const names = [...result.from].filter(d => d !== device.deviceId).map(d => (peers.get(d) || {}).name || 'another computer');
    opts.client = [...new Set(names)].join(', ').slice(0, 80) || 'another computer';
    opts.summary = `${result.received} change${result.received === 1 ? '' : 's'} from ${opts.client}`;
    await savePending(syncedFingerprint(next));
    return { next, result };
  }

  // ─── Shadow mode: what applying would do ─────────────────────────────
  async function buildPreview() {
    previewDirty = false;
    const cur = await store.readObject().catch(() => null);
    if (!cur) return;
    const merged = loadTree(serializeTree(tree));
    const touched = new Set(), from = new Set();
    let changes = 0, conflicts = 0;
    for (const [p, r] of walkRegs(remoteTree)) {
      const res = applyWrite(merged, p, r, (c) => { if (p[p.length - 1] !== '@pos' && decodeHlc(c.lost.h).wall !== 0) conflicts++; });
      if (res === 'won') { touched.add(p[0]); changes++; from.add(devOf(r.h)); }
    }
    const next = materialize(cur, merged, [...touched]);
    const byId = (arr) => new Map((Array.isArray(arr) ? arr : []).filter(t => t && t.id != null).map(t => [String(t.id), t]));
    const a = byId(cur.custom), b = byId(next.custom);
    const added = [], removed = [], changed = [];
    for (const [id, t] of b) {
      const o = a.get(id);
      if (!o) added.push({ id, title: String(t.title || '').slice(0, 80) });
      else if (stable(o) !== stable(t)) changed.push({ id, title: String(t.title || '').slice(0, 80), fields: [...new Set([...Object.keys(o), ...Object.keys(t)])].filter(k => stable(o[k]) !== stable(t[k])).slice(0, 10) });
    }
    for (const [id, t] of a) if (!b.has(id)) removed.push({ id, title: String(t.title || '').slice(0, 80) });
    const keys = [...touched].filter(k => k !== 'custom' && stable(cur[k]) !== stable(next[k]));
    st.preview = {
      at: now(), changes, conflicts, from: [...from].filter(d => d !== device.deviceId).map(d => (peers.get(d) || {}).name || 'another computer'),
      tasks: { added: added.length, removed: removed.length, changed: changed.length }, keys,
      sample: { added: added.slice(0, 5), removed: removed.slice(0, 5), changed: changed.slice(0, 5) },
    };
    await atomicWrite(F.report, JSON.stringify({ ...st.preview, added, removed, changed }, null, 1)).catch(() => {});
    log('info', `sync (shadow): applying would change ${added.length} new, ${changed.length} changed, ${removed.length} removed tasks and ${keys.length} other areas (${changes} fields, ${conflicts} clashes); nothing was changed`);
  }

  // ─── One sync pass ───────────────────────────────────────────────────
  async function pass(reason) {
    if (!active) return null;
    const t0 = now();
    const eventAt = firstEventAt;   // when the watcher first heard of this change (latency)
    firstEventAt = null;
    if (!(await ad.ready())) {
      setState('waiting', `Waiting for ${cloudName()}: the folder ${settings.folder} is not there. Is ${cloudName()} running and signed in?`);
      return null;
    }
    await checkIdentity();
    startWatcher();
    const got = await gather();
    const stt = await fsp.stat(store.file).catch(() => null);
    const mtime = stt ? stt.mtimeMs : 0;
    const applyPending = settings.apply && !!remoteTree.k;
    const localMaybe = localDirty || mtime !== lastStateMtime || !meta.joined || applyPending;
    st.waitingLines = got.waitingLines; st.waitingFrom = got.waitingFrom; st.rejected += got.rejected; st.encrypted = got.encrypted;
    if (!got.ops.length && !got.snaps.length && !localMaybe) {
      meta.bad = got.bad;
      for (const [id, offs] of Object.entries(got.offsets)) meta.offsets[id] = { ...(meta.offsets[id] || {}), ...offs };
      await finishPass();
      return { idle: true };
    }
    localDirty = false;
    const tRead = now();
    const opts = { source: 'sync', client: null, summary: null, afterCommit: promotePending };
    let r;
    try {
      r = await store.mutate((cur) => mutateFn(cur, got, opts), opts);
    } catch (e) {
      // Nothing of this pass is kept in memory: back to what is on disk (the
      // lines it read are read again next time; merging twice is harmless).
      const seq = meta.seq;
      await loadMeta();
      if (!meta) meta = freshMeta(ad.where);
      meta.seq = Math.max(meta.seq, seq);
      ad.forget();
      throw e;
    }
    if (existsSync(F.pending)) await promotePending();
    const st2 = await fsp.stat(store.file).catch(() => null);
    lastStateMtime = st2 ? st2.mtimeMs : 0;
    const res = r && r.result;
    const tDone = now();
    if (res) {
      if (res.sent) st.lastSentAt = tDone;
      if (res.received) {
        st.lastReceivedAt = tDone;
        st.preview = null;
        st.lastApply = { reason, ops: got.ops.length, snapshots: got.snaps.length, writes: res.received, version: r.version, eventToCommitMs: eventAt ? tDone - eventAt : null, readMs: tRead - t0, applyMs: tDone - tRead };
        for (const fn of listeners) { try { fn({ ...st.lastApply, at: tDone }); } catch { /* a listener never breaks sync */ } }
        log('info', `sync: ${res.received} change${res.received === 1 ? '' : 's'} from ${res.from.size} device${res.from.size === 1 ? '' : 's'} (${tDone - t0} ms)`);
      }
      await saveConflicts(res.conflicts);
    }
    await finishPass();
    return res;
  }
  async function finishPass() {
    if (previewDirty && !settings.apply) await buildPreview();
    await heartbeat();
    await maybeSnapshot();
    await saveMetaSoon();
    ok();
  }

  async function checkIdentity() {
    const mine = await ad.readJson(device.deviceId, 'device.json', 256 * 1024);
    if (mine && mine.instance && mine.instance !== device.instance) {
      // Another installation is using this computer's id (a copied settings
      // folder): take a new one and join again, so the two never write the same files.
      await newIdentity('another installation was using the same device id');
      await activateCore();
    }
  }

  async function heartbeat(force = false) {
    if (!ad || !device || !meta) return;
    if (!force && now() - lastHeartbeat < HEARTBEAT_MS) return;
    if (!(await ad.ready().catch(() => false))) return;
    lastHeartbeat = now();
    await ad.writeDevice({ name: deviceName(), instance: device.instance, app: appVersion, lastSeen: new Date(now()).toISOString(), seq: meta.seq }).catch((e) => log('warn', `sync: could not write device.json (${errMsg(e)})`));
  }

  async function maybeSnapshot(force = false) {
    const due = force || meta.bytesSinceSnapshot >= SNAPSHOT_BYTES || (meta.seq > meta.snapSeq && now() - meta.lastSnapshotAt > SNAPSHOT_MS) || (meta.seq > 0 && !meta.lastSnapshotAt);
    if (!due) return;
    const covers = await ad.logSizes();
    await ad.writeSnapshot({ v: 1, dev: device.deviceId, seq: meta.seq, hlc: clock.peek(), seen: seenVector(), covers, createdAt: new Date(now()).toISOString(), data: serializeTree(tree) });
    meta.lastSnapshotAt = now(); meta.bytesSinceSnapshot = 0; meta.snapSeq = meta.seq;
    // Own logs older than LOG_KEEP_DAYS that the snapshot fully covers can go:
    // a device that never read them gets the same registers from the snapshot.
    const cutoff = new Date(now() - LOG_KEEP_DAYS * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    for (const [n, size] of Object.entries(covers)) { const m = LOG_RE.exec(n); if (m && m[1] < cutoff) await ad.removeOwnLog(n, size); }
    await saveMeta();
  }

  // ─── Scheduling ──────────────────────────────────────────────────────
  // Circuit breaker: whatever goes wrong (a storm of file events, a pass that
  // keeps asking for another), sync never takes more than a trickle of CPU.
  // Past 20 passes in 2 s it waits for the next poll and says so once.
  const recentPasses = [];
  let throttled = false;
  function run(reason) {
    if (!active) return Promise.resolve(null);
    const t = Date.now();
    while (recentPasses.length && recentPasses[0] < t - 2000) recentPasses.shift();
    if (recentPasses.length >= 20 && reason !== 'poll' && reason !== 'now' && reason !== 'apply-switch') {
      if (!throttled) { throttled = true; log('warn', `sync: too many passes in a short time; waiting for the ${Math.round(pollMs / 1000)} s check`); }
      return running || Promise.resolve(null);
    }
    if (reason === 'poll') throttled = false;
    if (running) { again = true; return running; }
    recentPasses.push(t);
    running = (async () => {
      try { return await pass(reason); }
      catch (e) {
        st.lastError = errMsg(e);
        setState('error', `Sync paused: ${plainError(e)}. It tries again in a few seconds.`);
        log('warn', `sync pass failed: ${errMsg(e)}`);
        return null;
      } finally {
        running = null;
        if (again && active) { again = false; schedule('again', 30); }
      }
    })();
    return running;
  }
  function schedule(reason, ms = debounceMs) {
    if (!active) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => run(reason), ms);
    debounce.unref?.();
  }
  /**
   * Cloud clients do not always raise change events when they download a
   * file, so the 5 s poll is the safety net; the watcher only makes it fast.
   */
  let watchFailed = false;
  function startWatcher() {
    if (!watch || unwatch || watchFailed || !active) return;
    try {
      unwatch = ad.watch(
        () => { if (!firstEventAt) firstEventAt = now(); schedule('watch', 40); },
        () => { unwatch = null; },   // the folder went away: the poll waits for it, then a new watcher starts
      );
    } catch (e) { unwatch = null; watchFailed = true; log('info', `sync: cannot watch the folder (${errMsg(e)}); checking every ${Math.round(pollMs / 1000)} s`); }
  }

  // ─── Status ──────────────────────────────────────────────────────────
  function cloudName() {
    const f = String(settings.folder || '').toLowerCase();
    if (/onedrive/.test(f)) return 'OneDrive';
    if (/google ?drive|my drive/.test(f)) return 'Google Drive';
    if (/dropbox/.test(f)) return 'Dropbox';
    return 'the sync folder';
  }
  function plainError(e) {
    const c = e && e.code;
    if (c === 'EPERM' || c === 'EACCES' || c === 'EBUSY') return `${cloudName()} is holding a file (it may be busy uploading)`;
    if (c === 'ENOSPC') return 'the disk is full';
    if (c === 'ENOENT') return `a file in ${cloudName()} went missing`;
    if (c === 'LOCK_TIMEOUT') return 'the dashboard was busy saving';
    return 'something went wrong reading or writing the sync folder';
  }
  function setState(state, message) { st.state = state; st.message = message; }
  function ok() {
    st.lastSyncAt = now(); st.lastError = null;
    if (st.encrypted) setState('waiting', 'Another computer writes encrypted changes that this version of OpenDash cannot read yet. Update OpenDash on this computer.');
    else if (st.waitingLines) setState('waiting', `Waiting for ${cloudName()} to finish downloading a change from ${(peers.get(st.waitingFrom) || {}).name || 'another computer'}.`);
    else if (!settings.apply && st.preview && st.preview.changes) {
      const p = st.preview, t = p.tasks;
      const parts = [t.added && `${t.added} new task${t.added === 1 ? '' : 's'}`, t.changed && `${t.changed} changed`, t.removed && `${t.removed} removed`, p.keys.length && `${p.keys.length} other area${p.keys.length === 1 ? '' : 's'}`].filter(Boolean);
      setState('ok', `Trial mode: ${p.from.join(', ') || 'another computer'} has changes waiting (${parts.join(', ') || `${p.changes} small changes`}). Nothing here has been changed yet.`);
    } else setState('ok', settings.apply ? 'Up to date.' : 'Trial mode: nothing from your other computers is waiting.');
  }
  const deviceName = () => (settings.deviceName || host || 'This computer').slice(0, 60);
  let detectCache = { at: 0, list: [] };
  function detected() {
    if (now() - detectCache.at > 30000) { try { detectCache = { at: now(), list: detect() }; } catch { detectCache = { at: now(), list: [] }; } }
    return detectCache.list;
  }

  function status() {
    const found = detected();
    const devices = [];
    if (device && settings.enabled) devices.push({ name: deviceName(), me: true, lastSeen: now() });
    for (const [id, p] of peers) if (!device || id !== device.deviceId) devices.push({ name: p.name, me: false, lastSeen: p.lastSeen || null, app: p.app || null });
    return {
      enabled: settings.enabled, apply: settings.apply, mode: !settings.enabled ? 'off' : settings.apply ? 'apply' : 'shadow',
      active, folder: settings.folder, where: ad ? ad.where : (settings.folder ? syncRootFor(settings.folder) : null), cloud: settings.folder ? cloudName() : null,
      deviceName: deviceName(), deviceId: device ? device.deviceId.slice(0, 6) : null,
      state: settings.enabled ? st.state : 'off',
      message: settings.enabled ? st.message : 'Off. Your data stays on this computer.',
      lastSyncAt: st.lastSyncAt, lastSentAt: st.lastSentAt, lastReceivedAt: st.lastReceivedAt, lastError: st.lastError,
      devices, conflicts: { count: st.conflictsSeen, recent: st.recentConflicts.slice(0, 5) },
      preview: settings.apply ? null : st.preview,
      skew: clock && clock.skewed ? { device: (peers.get(clock.skewed.deviceId) || {}).name || 'another computer', aheadMin: Math.round(clock.skewed.aheadMs / 60000) } : null,
      detected: found.map(d => ({ kind: d.kind, label: d.label, path: d.path })),
      lastApply: st.lastApply, now: now(),
    };
  }

  // ─── Turning it on and off ───────────────────────────────────────────
  async function activateCore() {
    ad = adapterFactory({ folder: settings.folder, deviceId: device.deviceId, now });
    if (!meta || meta.where !== ad.where) {
      // A new folder (or the first time): start fresh. If other computers
      // already sync there, this one JOINS: its existing data is treated as
      // older than everything in the folder, so the folder's copy wins where
      // both have the same thing, and what only this computer has is added.
      meta = freshMeta(ad.where);
      tree = newTree(); remoteTree = newTree();
      if (await ad.ready().catch(() => false)) {
        for (const id of await ad.listDevices()) {
          if (id === device.deviceId) continue;
          const files = await ad.listFiles(id);
          if (files.snapshot || files.logs.some(l => l.size > 0)) { meta.join = true; break; }
        }
        meta.seq = Math.max(meta.seq, await ad.lastOwnSeq().catch(() => 0));
      }
    } else if (await ad.ready().catch(() => false)) {
      meta.seq = Math.max(meta.seq, await ad.lastOwnSeq().catch(() => 0));   // meta may be older than the log
    }
    clock = createClock({ deviceId: device.deviceId, now, last: meta.hlc, ...(maxDriftMs ? { maxDriftMs } : {}) });
  }

  async function activate() {
    if (active) await deactivate();
    if (process.env.DASHBOARD_SYNC === 'off') { setState('off', 'Turned off by DASHBOARD_SYNC=off.'); return; }
    await ensureDevice();
    if (!meta) await loadMeta();
    await activateCore();
    active = true;
    setState('syncing', 'Starting...');
    lastStateMtime = -1; lastHeartbeat = 0;
    unsubscribe = store.onChange((info) => {
      if (!info || info.source === 'sync' || info.dataChanged === false) return;
      localDirty = true;
      schedule('local');
    });
    await heartbeat(true).catch(() => {});
    startWatcher();
    poller = setInterval(() => run('poll'), pollMs); poller.unref?.();
    await run('start');
  }

  async function deactivate() {
    active = false;
    clearTimeout(debounce); clearInterval(poller); poller = null;
    if (unwatch) { unwatch(); unwatch = null; }
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (running) await running.catch(() => {});
    if (meta && metaDirty) await saveMeta().catch(() => {});
  }

  async function start() {
    await loadSettings();
    await loadDevice();
    await loadMeta();
    loaded = true;
    if (settings.enabled && settings.folder) await activate().catch((e) => { st.lastError = errMsg(e); setState('error', `Sync could not start: ${plainError(e)}.`); });
    else setState('off', '');
    return status();
  }

  function badRequest(message, code = 'BAD_SYNC_SETTING') { const e = new Error(message); e.status = 400; e.code = code; return e; }

  /** Change settings: {enabled?, apply?, folder?, deviceName?}. Returns the status. */
  async function configure(patch = {}) {
    if (!loaded) { await loadSettings(); await loadDevice(); if (device && !meta) await loadMeta(); loaded = true; }
    const next = { ...settings };
    if (patch.deviceName !== undefined) {
      const n = String(patch.deviceName || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 60);
      next.deviceName = n || null;
    }
    if (patch.folder !== undefined && patch.folder !== null && patch.folder !== '') {
      const f = String(patch.folder).trim();
      if (f.length > 1000 || !isAbsolute(f)) throw badRequest('Choose a full folder path, for example your OneDrive folder.');
      const full = resolve(f);
      let s = null;
      try { s = await fsp.stat(full); } catch { s = null; }
      if (!s || !s.isDirectory()) throw badRequest('That folder does not exist on this computer.');
      const r = syncRootFor(full);
      if (isInside(dataDir, r) || isInside(r, dataDir)) throw badRequest('Choose a folder outside the OpenDash data folder.');
      if (isInside(dir, r) || isInside(r, dir)) throw badRequest("Choose a folder outside OpenDash's own settings folder.");
      for (const bad of forbid) if (bad && (isInside(bad, r) || isInside(r, bad))) throw badRequest('Choose a folder outside the OpenDash app folder.');
      next.folder = full;
    }
    if (patch.enabled !== undefined) next.enabled = !!patch.enabled;
    if (patch.apply !== undefined) next.apply = !!patch.apply;
    if (next.enabled && !next.folder) {
      detectCache.at = 0;
      const d = detected();
      if (!d.length) throw badRequest('No OneDrive, Google Drive or Dropbox folder was found. Choose a folder that your cloud drive keeps in sync.', 'NO_FOLDER');
      next.folder = d[0].path;
    }
    const restart = next.enabled && (!active || next.folder !== settings.folder);
    const nameChanged = next.deviceName !== settings.deviceName;
    const applyOn = next.apply && !settings.apply;
    settings = next;
    await saveSettings();
    if (!settings.enabled) { await deactivate(); setState('off', ''); }
    else if (restart) await activate();
    else {
      if (nameChanged) await heartbeat(true);
      if (applyOn || patch.apply !== undefined) { previewDirty = !settings.apply; await run('apply-switch'); }
    }
    return status();
  }

  async function stop() { await deactivate(); }

  return {
    start, stop, configure, status,
    syncNow: () => run('now'),
    onApplied(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get active() { return active; },
    get where() { return ad ? ad.where : null; },
    get localDir() { return dir; },
    get deviceId() { return device && device.deviceId; },
    _debug: () => ({ meta, tree, remoteTree, peers }),
  };
}
