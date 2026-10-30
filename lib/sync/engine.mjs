// lib/sync/engine.mjs - live sync between devices through a shared folder.
//
// PLATFORM-AGNOSTIC CORE: no node: imports. Everything that touches a disk,
// a path or the operating system goes through two adapters:
//   host        this device: its own sync files, the synced files in the data
//               folder, the state file's change stamp, folder checks, its name
//               (lib/sync/node-host.mjs is the Node one; createNodeSyncEngine
//               wires everything for the dashboard server)
//   transport   the shared place (lib/sync/folder.mjs createFolderAdapter is a
//               cloud-drive desktop folder; a OneDrive/Drive API adapter for a
//               phone or a PWA would implement the same calls)
// and the app's state store ({mutate, onChange, readObject}). The file format
// is docs/dev/SYNC_FORMAT.md.
//
// Two switches (Settings > Sync):
//   enabled  this device records its changes into the shared place and reads
//            the others' changes
//   apply    those changes are written into this device's data. OFF at first
//            (SHADOW MODE): they are merged into a separate copy, a report says
//            what WOULD change (shadow-report.json, the status line), nothing is
//            changed. Turning it on applies everything collected, same merge.
//
// Where it hooks in: every state write goes through the state store
// (server/state-store.mjs). Writes in this process are heard through
// store.onChange; writes by other processes (the MCP server in embedded mode,
// scripts) through the poll, which compares the state file's change stamp (the
// same check server/live-sync.mjs makes). Changes are found by comparing with
// this device's SHADOW, the register tree of lib/sync/model.mjs (the last
// value of every synced field); _lastSave is never used as a clock. A pass runs
// inside store.mutate(): capture local changes -> append them to this
// device's log -> merge the others' -> commit through the same compare-and-
// swap (the version goes up, live sync tells open tabs, the MCP sees it).
//
// Synced FILES (lib/sync/manifest.mjs SYNC_FILES) ride along: the account
// registry (accounts.json, no secrets) and per-account mail/calendar snapshots
// (inbox|calendar/sources/<sourceId>.json; the account's record names its
// source ids, `sources: {mail, calendar}`). A snapshot is PUBLISHED only by its
// account's FETCHER device; the others receive it. A snapshot no account owns
// (a source set up on one computer only) is never sent.
// isFetcher / setFetcher / takeOver / fetcher / devices are the API for the
// connections code (and later bank pulls and AI briefs: "main computer" jobs).
// The fetcher of an account is the record's own `fetcher` field
// (docs/dev/ACCOUNTS.md section 7), holding the device's FETCHER ID: the host's
// fetcherId (lib/devicedir.mjs host id on Node, the id the accounts code uses
// too), else the sync device id. device.json carries it so the others can name
// the fetcher. Jobs that are not accounts are kept in roles.json the same way.
// A device that can only fetch while it is open (a phone, a PWA) says so
// (background:false): it never claims an unassigned account when a device
// that fetches in the background exists, and fetcher() marks it stale.
//
// This device's own files (host.local): settings.json, device.json, meta.json,
// meta.pending.json, conflicts.jsonl, shadow-report.json. Logs never contain
// task text or names: counts only.
//
// END-TO-END ENCRYPTION (format v 2): pass `e2e` (lib/sync/e2e.mjs
// createE2E, with this device's secret store) and the device can use an
// encrypted group (settings.e2e). Then every log line, snapshot and device
// name is sealed with the group's current key, the device id is the
// fingerprint of the device's identity key, and nothing unencrypted from the
// folder is ever taken in. Until the device holds the key (a new device
// waiting to be approved, or one that was removed) passes only look at the
// folder and say so: nothing is sent or applied. setupFirst / joinExisting /
// encrypt / joinWithRecovery / pairStart / pairRespond / pairConfirm /
// makeOffer / joinWithOffer / removeDevice / renameDevice / newRecoveryCode
// are the API for Settings > Sync. Without `e2e`, nothing changes (format v 1).
//
// PICTURES AND AUDIO (encrypted sync only, lib/sync/blobs.mjs): people's
// pictures and story narration clips travel as sealed, content-addressed
// blobs in this device's own devices/<id>/blobs/ folder, named by the synced
// catalogue blobs/index.json. Each pass ends with a (throttled) look at them;
// another device's file is fetched the first time it is asked for
// (engine.blobs.fetch), and onBlobs tells the open tabs when one arrives.

import { createClock, decodeHlc } from './hlc.mjs';
import {
  capture, applyWrite, materialize, newTree, serializeTree, loadTree, validateOp, checkWrite, classifyPath,
  syncedFingerprint, elementPrefixes, getReg, walkRegs, concurrent, devOf, stable, hash, captureFile, materializeFile, FILE_PREFIX,
} from './model.mjs';
import { fileSpecFor, fileInstances, reviewable } from './manifest.mjs';
import { datedSplit } from './model.mjs';                  // ── files ── dated results
import { fileRule } from './manifest.mjs';     // ── files ── merge rules of synced files
import { recordedRunner, roleRunner, runsNow, MAIN } from './roles.mjs';
import { cleanCaps, hasNeed, jobNeed, isOnline, isRecent, sourceOwner } from './caps.mjs';
import { describeApplied, createFeed } from './changes.mjs';   // ── health ── the "What changed" feed
import { createBlobChannel, blobKind, BLOBS_REL } from './blobs.mjs';   // ── blobs ── pictures and audio
import { parseJoinLink, cleanOrigin } from './relay-client.mjs'; // ── relay ── the join link; a relay address

const CHUNK = 1000;                        // writes per log line
const HEARTBEAT_MS = 2 * 60 * 1000;        // device.json lastSeen
const SNAPSHOT_BYTES = 1024 * 1024;        // a fresh snapshot after this much log...
const SNAPSHOT_MS = 24 * 60 * 60 * 1000;   // ...or once a day when something changed
const LOG_KEEP_DAYS = 30;                  // own logs older than this (and in a snapshot) are removed
const BAD_LINE_TRIES = 3;                  // a line that stays unreadable this many passes is skipped
const CONFLICT_KEEP = 500;
const FOREGROUND_STALE_MS = 6 * 60 * 60 * 1000;   // a fetcher that only fetches while open, unseen this long
// ── health ── (docs/dev/MULTI_DEVICE.md "When something goes wrong")
const WAKE_GAP_MS = 60 * 1000;             // the poll did not run for this long: the computer slept (or was very busy)
const DISK_FULL_RETRY_MS = 60 * 1000;      // disk full: no writes, one try a minute
const PRUNE_AFTER_MS = 7 * 86400000;       // a removed device's files go once removed and quiet this long
// ── self-healing ── a hole in what this device has of another one (its change n+1 missing while later
// ones are here): after this long its logs are read again from the start (only missing lines are used),
// then again after GAP_RETRY_MS, doubling up to GAP_RETRY_MAX_MS while the hole stays.
const GAP_MS = 10 * 60 * 1000;
const GAP_RETRY_MS = 30 * 60 * 1000;
const GAP_RETRY_MAX_MS = 6 * 60 * 60 * 1000;
const COMPACT_KEEP_DAYS = 7;               // "Compact now" keeps this many days of this computer's own logs
const CLOCK_AHEAD_MS = 2 * 60 * 1000;      // a device.json written this far "in the future": that clock is ahead
const FEED_MAX = 100;
// 2.19.8: a change stamped more than this far in the future is refused (it would otherwise win every
// later edit until that date: a clock far ahead, or a record forged with an old key).
const FUTURE_MAX_MS = 24 * 60 * 60 * 1000;
export const LOG_NAME_RE = /^ops-(\d{8})(?:-(\d{2}))?\.jsonl$/;
const errMsg = (e) => String((e && (e.code || e.message)) || e).slice(0, 120);
const ID_RE = /^[0-9a-f]{16}$/;
const FID_RE = /^[A-Za-z0-9_-]{8,64}$/;     // a fetcher id (lib/accounts/core.mjs HOST_ID_RE)
const ACCOUNTS_REL = 'accounts.json', ACCOUNTS_TOP = FILE_PREFIX + 'accounts.json';
// ── relay carry-over ── (2.17.1) the person's relay record: friends/relays.json's home relay, which
// one is home, and the choice to sync through it ('sync'). Its registers ride in each device's sealed
// device.json and on a live link when it opens, so another of the person's computers has it at once,
// whatever its log backlog. Only these registers, at most PART_MAX bytes.
const PART_REL = 'friends/relays.json', PART_TOP = FILE_PREFIX + PART_REL;
const PART_MAX = 16 * 1024;

/** n random bytes as hex (Web Crypto: Node 19+, browsers, React Native with a getRandomValues polyfill). */
export function randomHex(bytes = 8) {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function') throw new Error('sync needs crypto.getRandomValues');
  return [...c.getRandomValues(new Uint8Array(bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function createSyncEngine({
  store, host, adapterFactory, log = () => {}, now = () => Date.now(), pollMs = 5000, watch = true, debounceMs = 120,
  appVersion = '0', maxDriftMs, metaSaveMs = 10000, background = true, e2e = null, kind = 'computer',
  gapMs = GAP_MS,
} = {}) {
  if (!store || !host || !adapterFactory) throw new Error('createSyncEngine needs {store, host, adapterFactory}');
  const L = host.local;
  // relay: sync through the person's own relay (lib/sync/relay.mjs; with a folder too: both at once).
  // relayOrigin: the origin a join link brought, until the synced relay setting arrives.
  // lastFolder: the folder used before "relay only" (this computer's files are copied from it once).
  // relayOff: "not on this computer" (the person's choice to sync through their relay follows them,
  // friends/relays.json `sync`; off here stays here). relayAutoAt: when it was turned on here by itself
  // (the Sync page says so once, with Undo).
  let settings = { enabled: false, apply: false, folder: null, deviceName: null, e2e: false, nameAt: null, relay: false, relayOrigin: null, lastFolder: null, relayOff: false, relayAutoAt: null };
  const sec = () => !!(e2e && settings.e2e);
  let device = null;            // {deviceId, host, instance, createdAt}
  let meta = null;              // see freshMeta()
  let tree = newTree();         // the shadow: what this device's data holds, field by field
  let remoteTree = newTree();   // shadow mode: the other devices' changes, collected, not applied
  let clock = null;
  let ad = null;                // the transport adapter
  let active = false, loaded = false;
  let unwatch = null, poller = null, debounce = null, unsubscribe = null;
  let running = null, again = false;
  let localDirty = false, lastStamp = null, lastHeartbeat = 0, firstEventAt = null;
  let metaDirty = false, lastMetaSave = 0, previewDirty = false;
  let roles = { accounts: [], roles: {}, owners: new Map() };   // the registry, job roles and snapshot owners, as last read
  let roleMove = null;          // {from, to}: accounts fetched under an old device id move to the new one
  let waitingKeySince = null;
  let tamperedAt = 0;           // when records last failed their check (the warning shows for a while)
  const TAMPER_SHOW_MS = 30 * 60 * 1000;   // encrypted records with a key this device does not have yet, since
  const peers = new Map();      // deviceId -> {name, lastSeen, app, background}
  const listeners = new Set();  // onApplied
  // LIVE DELIVERY (lib/sync/live/, docs/dev/LIVE_SYNC.md): a connected device
  // pushes its new records the moment it writes them; they queue here and go
  // through the same checks and merge as records read from the folder (the
  // same record arriving both ways is taken once). Without a live layer none
  // of this does anything.
  const liveQueue = [];          // [{dev, file, rec}]
  // ── relay carry-over ── the person's relay record from another device (its device.json, or
  // pushed over a live link): deviceId -> {data, h}, merged on the next pass (see personPart).
  const pendingParts = new Map();
  const recordListeners = new Set(), passListeners = new Set();
  let deviceExtra = null, extraDirty = false, leaseOracle = null, liveStatusFn = null;
  // CAPABILITIES (lib/sync/caps.mjs): what this device can do, published in its
  // device.json (sealed with encrypted sync), and the others' as last read.
  let myCaps = null, capsDirty = false, livePeersFn = null;
  // PRESENCE (lib/sync/presence.mjs): whether a dashboard page is open here
  // ({open, at}), published in device.json (sealed with encrypted sync) and
  // written again soon after it changes; `stoppedAt` only in the goodbye record
  // a clean stop writes. presenceFn: the server's tracker, for groupCaps rows.
  let myPage = null, presDirty = false, lastPresWrite = 0, stoppedAt = null, presenceFn = null;
  const PRES_MIN_MS = 15 * 1000;
  let claudeHostFn = null;     // ── host ── (need, {devices, roles}) -> the fetcher id that runs Claude's jobs now (lib/sync/claude-host.mjs jobHost)
  // The stamp of each synced file when it was last captured (an unchanged file is not read again).
  const capStamps = new Map();
  let passCapStamps = new Map();
  const LIVE_QUEUE_MAX = 20000;
  const st = {
    state: 'off', message: '', lastSyncAt: null, lastSentAt: null, lastReceivedAt: null, lastError: null,
    waitingLines: 0, waitingFrom: null, encrypted: 0, conflictsSeen: 0, recentConflicts: [], lastApply: null, rejected: 0, skipped: 0,
    preview: null,
    // encrypted sync
    waitingKey: 0, tampered: 0, refused: 0, duplicates: 0, plainFrom: [], locked: null,
    // live delivery
    liveReceived: 0, liveDuplicates: 0, liveRefused: 0,
    // ── health ── what Settings > Sync > Health reads (lib/sync/health.mjs)
    diskFull: null, wokeAt: null, sleptMs: 0, moved: null, rewroteOwnAt: null,
    io: { lastWriteAt: null, error: null, errorAt: null }, storage: null, transfer: null, pruned: [], conflictsOpen: 0,
  };
  // ── health ──
  const feed = createFeed({ max: FEED_MAX });
  let feedDirty = false;
  const resolutions = [];       // "Keep theirs" choices from the Review list, written on the next pass
  let resolved = null;          // ids of clashes already reviewed (conflicts-done.json)
  let swept = 0;                // ── 2.17.2 ── the one-off tidy of old Review items that ran (conflicts-done.json `swept`)
  let pauseUntil = 0;           // the disk is full: no pass writes until then
  let lastPollAt = 0;
  let allowFresh = false;       // the user chose "Start sync again in this folder" after the folder went missing
  let ownRewrite = false, forceCompact = false;
  let pruneCheckAt = 0, lastListing = null, movedCands = { at: 0, list: [] };
  let inFlight = [];            // the choices the pass being committed carries (put back if it fails)
  const extra = (top) => { const f = fileSpecFor(top); return f ? f.spec : null; };

  // ── blobs ── pictures and narration audio (lib/sync/blobs.mjs): only with
  // encrypted sync and the key; nothing of it can break a pass.
  const blobArrived = new Set();
  const blobs = e2e ? createBlobChannel({
    host, e2e, log, now,
    adapter: () => ad,
    me: () => (device ? device.deviceId : null),
    ready: () => !!(active && sec() && e2e.ready && ad && device),
    apply: () => !!settings.apply,
    isMember: (id) => !!e2e.member(id),
    readState: () => store.readObject(),
    // The catalogue changed here: the next pass sends it.
    onChange: () => { localDirty = true; schedule('blobs', 50); },
    onArrived: (refs) => { for (const fn of blobArrived) { try { fn(refs); } catch { /* a listener never breaks sync */ } } },
  }) : null;
  async function blobWork() {
    if (!blobs) return;
    try { await blobs.maintain(); blobs.retryWanted(); }
    catch (e) { log('warn', `sync: pictures and audio: ${errMsg(e)}`); }
  }

  // app: the version that wrote this meta (another one replays the others' changes once, see loadMeta).
  // peerApps: the version each other device ran when last seen (a change makes a fresh snapshot here).
  // reread: {deviceId: {replay}} devices whose snapshot and logs are being read again from the start.
  const freshMeta = (where) => ({
    v: 1, deviceId: device.deviceId, where, hlc: null, seq: 0, frontier: {}, ahead: {}, pendingSeen: {}, offsets: {}, snaps: {}, bad: {},
    joined: false, join: false, lastSnapshotAt: 0, snapSeq: 0, bytesSinceSnapshot: 0, createdAt: new Date(now()).toISOString(),
    oldIds: [], snapKid: null, app: appVersion, peerApps: {}, reread: {},
  });

  // ─── This device's own files ─────────────────────────────────────────
  async function readLocal(name) { try { const t = await L.read(name); return t == null ? null : JSON.parse(t); } catch { return null; } }
  async function loadSettings() {
    const s = await readLocal('settings.json');
    if (s && typeof s === 'object') settings = { enabled: !!s.enabled, apply: !!s.apply, folder: typeof s.folder === 'string' ? s.folder : null, deviceName: typeof s.deviceName === 'string' ? s.deviceName : null, e2e: !!s.e2e, nameAt: typeof s.nameAt === 'string' ? s.nameAt : null, relay: !!s.relay, relayOrigin: typeof s.relayOrigin === 'string' ? s.relayOrigin : null, lastFolder: typeof s.lastFolder === 'string' ? s.lastFolder : null, relayOff: !!s.relayOff, relayAutoAt: Number.isFinite(s.relayAutoAt) ? s.relayAutoAt : null };
  }
  async function saveSettings() { await L.write('settings.json', JSON.stringify(settings, null, 1)); }

  /** This device's identity (made only when sync is first turned on). */
  async function loadDevice() {
    const d = await readLocal('device.json');
    device = d && ID_RE.test(d.deviceId || '') && d.host === host.hostKey && d.instance ? d : null;
  }
  async function ensureDevice() {
    if (sec()) {
      // Encrypted sync: the device id is the fingerprint of this device's identity key.
      const id = (await e2e.identity()).deviceId;
      if (!device || device.deviceId !== id) await switchIdentity(id);
      return;
    }
    if (!device) await newIdentity(null);
  }
  async function newIdentity(why) {
    device = { deviceId: randomHex(8), host: host.hostKey, instance: randomHex(8), createdAt: new Date(now()).toISOString() };
    await L.write('device.json', JSON.stringify(device, null, 1));
    meta = null; tree = newTree(); remoteTree = newTree();
    await L.remove('meta.json'); await L.remove('meta.pending.json');
    if (why) log('warn', `sync: new device identity (${why})`);
  }
  /**
   * A new device id for encrypted sync (moving from v 1, joining, or coming
   * back after a removal). What this device already synced is KEPT under the
   * new id (its registers keep their timestamps; nothing is joined at the
   * floor again); its old folder is removed after the first encrypted
   * snapshot, and the accounts it fetched for move to the new id.
   */
  async function switchIdentity(id) {
    const old = device ? device.deviceId : null;
    device = { deviceId: id, host: host.hostKey, instance: randomHex(8), createdAt: new Date(now()).toISOString() };
    await L.write('device.json', JSON.stringify(device, null, 1));
    if (old && meta && meta.deviceId === old) {
      meta.deviceId = id;
      meta.frontier[old] = Math.max(meta.frontier[old] || 0, meta.seq);
      meta.oldIds = [...new Set([...(meta.oldIds || []), old])].slice(-8);
      meta.seq = 0; meta.offsets[id] = {}; meta.joined = true; meta.join = false;
      meta.lastSnapshotAt = 0; meta.snapSeq = 0; meta.snapKid = null; meta.snapSigned = false; meta.bytesSinceSnapshot = 0;
      roleMove = { from: old, to: id };
      await saveMeta();
    } else {
      meta = null; tree = newTree(); remoteTree = newTree();
      await L.remove('meta.json'); await L.remove('meta.pending.json');
    }
    log('info', 'sync: this device has a new id for encrypted sync');
  }

  const fileFp = (r) => (r && r.present ? hash(stable(r.value)) : null);
  async function loadMeta() {
    meta = null; tree = newTree(); remoteTree = newTree();
    if (!device) return;
    // A merge that was being committed when the app stopped: keep its meta
    // only if the state really holds that merge; then finish writing any
    // synced file it had not written yet (files are written after the state).
    const pend = await readLocal('meta.pending.json');
    let rollForward = [];
    if (pend && pend.expect) {
      const cur = await store.readObject().catch(() => null);
      if (cur && syncedFingerprint(cur) === pend.expect) {
        await L.rename('meta.pending.json', 'meta.json');
        for (const [top, fp] of Object.entries(pend.files || {})) {
          const f = fileSpecFor(top);
          if (f && fileFp(await host.data.readJson(f.rel)) !== fp) rollForward.push(top);
        }
      } else await L.remove('meta.pending.json');
    }
    const m = await readLocal('meta.json');
    if (m && m.v === 1 && m.deviceId === device.deviceId) {
      const { tree: t, remote: rt, expect, files, ...rest } = m;
      meta = { ...freshMeta(m.where), ...rest, app: rest.app || null };
      tree = loadTree(t);
      remoteTree = loadTree(rt);
      for (const top of rollForward) await writeFileFromTree(top).catch(() => {});
      // A count of another device's changes that stalled (an older version kept it at a snapshot's
      // seq while the lines after it waited in 'ahead'): it takes them in now, before anything is sent.
      let healed = 0;
      for (const d of Object.keys(meta.ahead || {})) if (settle(d)) healed++;
      if (healed) { metaDirty = true; log('info', `sync: caught up the count of changes received from ${healed} other device${healed === 1 ? '' : 's'}`); }
      // ── 2.17.1 ── This computer runs another version than when it last synced: what an
      // older version could not use (a synced file it did not know yet) was read and dropped
      // then. Every other device's snapshot and logs are read once more (replay) so nothing is lost.
      if (meta.app !== appVersion) {
        meta.replayAll = true; meta.replayDone = {};
        if (meta.app) log('info', `sync: OpenDash was updated (${meta.app} -> ${appVersion}): reading your other devices' changes once more`);
        meta.app = appVersion; metaDirty = true;
      }
    }
  }
  function metaJson(more = {}) { return JSON.stringify({ ...meta, ...more, tree: serializeTree(tree), remote: serializeTree(remoteTree) }); }
  async function saveMeta() { await L.write('meta.json', metaJson()); metaDirty = false; lastMetaSave = now(); }
  /**
   * meta.json is about the size of the synced data, so it is not rewritten on
   * every local edit: after a crash the newest local changes are sent again
   * (same values, harmless). A merge that changes data is saved at once
   * (savePending), because there a stale meta WOULD matter.
   */
  async function saveMetaSoon(force = false) { if (metaDirty && (force || now() - lastMetaSave >= metaSaveMs)) await saveMeta(); }
  async function savePending(fp, files) { await L.write('meta.pending.json', metaJson({ expect: fp, files })); }
  async function promotePending() {
    if (!(await L.exists('meta.pending.json'))) return;
    try { await L.rename('meta.pending.json', 'meta.json'); } catch { await saveMeta(); }
    metaDirty = false; lastMetaSave = now();
  }

  // ─── Who has seen what (to tell concurrent edits from later ones) ────
  function markSeen(dev, n) {
    const into = meta.frontier, ahead = meta.ahead;
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
  /**
   * The frontier takes in the run of change numbers already held as 'ahead'
   * right after it (n+1, n+2, ...), and 'ahead' keeps only what is still past
   * it. True when anything moved. (2.17.1: before, a frontier raised by a
   * snapshot's seq stayed there while the lines after it sat in 'ahead' for
   * good: every later line landed there too, so this device reported the
   * snapshot's seq as how far it was, the other device resent everything on
   * each live link, and edits made here looked concurrent with ones it had seen.)
   */
  function settle(dev) {
    const a = meta.ahead[dev];
    if (!a) return false;
    const c = meta.frontier[dev] || 0;
    const have = new Set(a);
    let k = c;
    while (have.has(k + 1)) k++;
    if (k > c) meta.frontier[dev] = k;
    const rest = a.filter(x => x > k);
    if (rest.length) meta.ahead[dev] = rest; else delete meta.ahead[dev];
    return k > c || rest.length !== a.length;
  }
  function seenAtLeast(dev, n) {
    if ((meta.frontier[dev] || 0) < n) meta.frontier[dev] = n;
    settle(dev);
  }
  const seenVector = () => Object.freeze(Object.fromEntries(Object.entries(meta.frontier).filter(([d]) => d !== device.deviceId)));

  // ─── Conflicts ───────────────────────────────────────────────────────
  const nameOf = (h) => (devOf(h) === device.deviceId ? 'this device' : (peers.get(devOf(h)) || {}).name || 'another device');
  // ── 2.17.2 ── Plain words for the Review list: what the thing is, its name, the field.
  const NOUN = {
    custom: 'task', statuses: 'task', pinned: 'task', notes: 'task', deleted: 'task', people: 'person', peopleNotes: 'person',
    streams: 'stream', countdowns: 'countdown', resources: 'file or link', taskTemplates: 'task template', quickTemplates: 'quick-add templates',
    smartLists: 'smart list', taskBoards: 'board', sidebarLayout: 'sidebar', taskContexts: 'context list', tagRegistry: 'tag list', tags: 'tag list',
    pinnedTags: 'pinned tags', daynotes: 'day note', eventMeta: 'calendar event note', calendarSettings: 'calendar', weeklyReviews: 'weekly reviews',
    reviews: 'reviews', memories: 'journal', home: 'Home layout', travel: 'trips', friendPerms: 'sharing with a friend', bin: 'bin',
    defaultStream: 'default stream', archiveDays: 'archive setting', peopleIgnoredNames: 'ignored names', peopleIgnoredEmails: 'ignored addresses',
    peopleAutoLink: 'people auto-link setting', 'file:profile.json': 'settings', 'file:finance-share/edits.json': 'finance edits',
    'file:animations/mine.json': 'animation', 'file:index/settings.json': 'auto-link settings', 'file:source-prefs.json': 'calendar and mail sources',
  };
  /** Keys whose entries are named by another list's item id (a task's status, a person's older notes). */
  const OWNER = { statuses: 'custom', pinned: 'custom', notes: 'custom', deleted: 'custom', peopleNotes: 'people' };
  const FIELD = { statuses: 'status', pinned: 'pinned', notes: 'notes', deleted: 'removed' };
  const NAMED = new Set(['custom', 'people', 'countdowns', 'streams', 'resources', 'taskTemplates', 'smartLists', 'taskBoards']);
  const words = (s) => String(s).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  const idLike = (s) => /^h:/.test(s) || (/\d/.test(s) && /[-_:]/.test(s));
  function labelFor(path, state) {
    const [top, id, ...rest] = path;
    const src = OWNER[top] || top;
    let name = null;
    if (NAMED.has(src) && id != null) {
      const arr = state && state[src];
      const x = Array.isArray(arr) ? arr.find(e => e && String(e.id) === String(id)) : null;
      if (x) name = String(x.title || x.name || x.label || '').slice(0, 80) || null;
      // A deleted item is not in the state any more: its name is still in the registers.
      else for (const f of ['title', 'name', 'label']) { const r = getReg(tree, [src, id, f]); if (r && !r.d && typeof r.v === 'string' && r.v) { name = r.v.slice(0, 80); break; } }
    } else if (top === 'daynotes' && id != null) name = String(id);
    const parts = (NAMED.has(src) || top === 'daynotes' ? rest : [id, ...rest]).filter(x => typeof x === 'string' && x[0] !== '@' && !idLike(x));
    return { what: NOUN[top] || 'setting', name, field: FIELD[top] || parts.map(words).join(' > ') || null };
  }
  function recordConflict(list, kind, c, state) {
    if (list.length >= 200) return;
    // A joining device's older copy (written at the clock's floor) losing is expected, not a clash.
    const lw = decodeHlc(c.lost.h);
    if (lw && lw.wall === 0) return;
    // ── 2.17.2 ── Only the person's own content becomes a Review item (manifest conflictsOf):
    // a preference (theme, density, a hidden calendar...) is quiet, the later choice wins;
    // housekeeping (the job queue, roles, published snapshots, caches, results, friends'
    // data...) is silent: it merges by the same rule and nothing is ever listed.
    if (!reviewable(c.path[0])) return;
    list.push({
      // ── health ── an id for the Review list, and (edit vs delete) the item's @alive register
      id: conflictId({ path: c.path, kept: c.kept, lost: c.lost }), ...(c.alive ? { alive: c.alive } : {}),
      at: new Date(now()).toISOString(), kind, path: c.path, ...labelFor(c.path, state),
      kept: { by: nameOf(c.kept.h), h: c.kept.h, ...(c.kept.d ? { deleted: true } : { value: c.kept.v }) },
      lost: { by: nameOf(c.lost.h), h: c.lost.h, ...(c.lost.d ? { deleted: true } : { value: c.lost.v }) },
    });
  }
  const conflictId = (c) => (c && typeof c.id === 'string' && c.id) || hash(stable([c.path, c.kept && c.kept.h, c.lost && c.lost.h])).slice(0, 16);
  async function saveConflicts(list) {
    if (!list.length) return;
    st.conflictsSeen += list.length;
    const short = (x) => ({ ...x, ...(x.value !== undefined ? { value: typeof x.value === 'string' ? x.value.slice(0, 120) : JSON.stringify(x.value).slice(0, 120) } : {}) });
    st.recentConflicts = [...list.map(c => ({ ...c, kept: short(c.kept), lost: short(c.lost) })), ...st.recentConflicts].slice(0, 20);
    const text = (await L.read('conflicts.jsonl').catch(() => null)) || '';
    const lines = (text + list.map(c => JSON.stringify(c)).join('\n') + '\n').split('\n').filter(Boolean).slice(-CONFLICT_KEEP);
    await L.write('conflicts.jsonl', lines.join('\n') + '\n').catch(() => {});
    countOpenConflicts().catch(() => {});
  }

  // ─── Reviewing clashes (Settings > Sync > Review) ── health ──────────
  // conflicts.jsonl (this computer's own folder) keeps every clash; the
  // Review list shows the newest one per field that still stands (the
  // register is still the one that won: a later edit, or a choice already
  // made, retires it). "Keep theirs" writes the other value again as a new
  // local change, so it is the newest everywhere: the same path an edit takes.
  let resolvedP = null;
  async function loadResolved() {
    if (resolved) return resolved;
    // One read for every caller at start-up (two scans at once must share one set: the tidy below adds to it).
    if (!resolvedP) resolvedP = readLocal('conflicts-done.json').then((o) => {
      resolved = new Set(Array.isArray(o && o.ids) ? o.ids.filter(x => typeof x === 'string').slice(-1000) : []);
      swept = o && Number.isInteger(o.swept) ? o.swept : 0;
      return resolved;
    }).finally(() => { resolvedP = null; });
    return resolvedP;
  }
  async function saveResolved() { await L.write('conflicts-done.json', JSON.stringify({ v: 1, ids: [...resolved].slice(-1000), ...(swept ? { swept } : {}) })).catch(() => {}); }
  async function readConflicts() {
    const text = (await L.read('conflicts.jsonl').catch(() => null)) || '';
    const out = [];
    for (const line of text.split('\n')) {
      if (!line) continue;
      let c; try { c = JSON.parse(line); } catch { continue; }
      if (c && Array.isArray(c.path) && c.path.length && c.kept && c.lost && typeof c.kept.h === 'string' && typeof c.lost.h === 'string') out.push(c);
    }
    return out.reverse();   // newest first
  }
  /** The item's @alive path for an edit-vs-delete clash (older records did not store it). */
  function aliveFor(c) {
    if (Array.isArray(c.alive)) return c.alive;
    if (c.kind !== 'edit-after-delete') return null;
    for (const pre of elementPrefixes(c.path, extra).reverse()) {
      const r = getReg(tree, [...pre, '@alive']);
      if (r && r.h === c.kept.h) return [...pre, '@alive'];
    }
    return null;
  }
  /**
   * ── 2.17.2 ── An edit that really came after a delete: written later than the delete,
   * and without having seen it (concurrent). An edit made before the delete is not a clash:
   * the delete was the later choice, and the computer that made it may well have seen the edit.
   */
  const editCameLater = (del, edit) => !!(del && edit && edit.h > del.h && concurrent(del, edit));
  /** A recorded edit-vs-delete clash that still counts by that rule (judged by time alone when its registers have moved on). */
  function racedDelete(c) {
    if (!(c.lost.h > c.kept.h)) return false;
    const at = aliveFor(c);
    const del = at ? getReg(tree, at) : null, edit = getReg(tree, c.path);
    return del && del.h === c.kept.h && edit && edit.h === c.lost.h ? editCameLater(del, edit) : true;
  }
  /** A recorded clash that is still worth asking about: the person's own content, and (edit vs delete) an edit that came later. */
  const worthAsking = (c) => reviewable(c.path[0]) && (c.kind !== 'edit-after-delete' || racedDelete(c));
  /**
   * ── 2.17.2 ── Once, on start-up: older versions listed clashes on the app's own housekeeping
   * (requests.json, roles, snapshots...) and re-listed old edits inside items deleted since (the
   * fresh snapshot after an update). They are dismissed like "Keep" in the Review list (what won
   * stays), on every computer as it updates; conflicts-done.json `swept` says it ran.
   */
  const SWEEP = 1;
  async function sweepOld(list) {
    const done = await loadResolved();
    if (swept >= SWEEP) return;
    let n = 0;
    for (const c of list) {
      const id = conflictId(c);
      if (!done.has(id) && !worthAsking(c)) { done.add(id); n++; }
    }
    swept = SWEEP;
    await saveResolved();
    if (n) log('info', `sync: dismissed ${n} old review item${n === 1 ? '' : 's'} about sync's own housekeeping or older edits (nothing changed)`);
  }
  /** Does the clash still stand? (the register that won is still the one there) */
  function standing(c) {
    const at = c.kind === 'edit-after-delete' ? aliveFor(c) : c.path;
    const r = at ? getReg(tree, at) : null;
    return !!(r && r.h === c.kept.h);
  }
  const isMine = (h) => { const d = devOf(h); return !!device && (d === device.deviceId || !!(meta && (meta.oldIds || []).includes(d))); };
  function showValue(side) {
    if (side.deleted) return 'deleted';
    const v = side.value;
    if (v === undefined || v === null || v === '') return '(empty)';
    if (v === true) return 'yes';
    if (v === false) return 'no';
    if (typeof v === 'string') return v.replace(/\s+/g, ' ').slice(0, 120);
    if (Array.isArray(v) && v.every(x => typeof x === 'string' || typeof x === 'number')) return v.join(', ').slice(0, 120) || '(empty)';
    return JSON.stringify(v).slice(0, 120);
  }
  async function scanConflicts(max = 50) {
    const done = await loadResolved();
    const all = await readConflicts();
    await sweepOld(all);
    const items = [];
    const seen = new Set();
    let open = 0;
    for (const c of all) {
      const id = conflictId(c);
      const pk = JSON.stringify(c.path);
      if (done.has(id) || seen.has(pk)) continue;
      seen.add(pk);
      if (!standing(c)) continue;
      open++;
      if (items.length >= max) continue;
      const keptMine = isMine(c.kept.h), lostMine = isMine(c.lost.h);
      const lab = labelFor(c.path, null);
      const kept = { by: keptMine ? 'this computer' : peerName(devOf(c.kept.h)), mine: keptMine, value: showValue(c.kept) };
      const lost = { by: lostMine ? 'this computer' : peerName(devOf(c.lost.h)), mine: lostMine, value: showValue(c.lost) };
      const it = { id, at: c.at, kind: c.kind, what: lab.what, name: lab.name || c.name || null, field: lab.field || null, kept, lost };
      items.push({ ...it, text: sayClash(it) });
    }
    st.conflictsOpen = open;
    return { items, open };
  }
  /**
   * ── 2.17.2 ── One plain sentence for a Review item, e.g. 'On Mahdi Work you changed the task
   * "Book flights" after this computer deleted it.' (the buttons: Keep it deleted · Bring it back).
   */
  function sayClash(it) {
    const thing = `the ${it.what || 'item'}${it.name ? ` "${it.name}"` : ''}`;
    if (it.kind === 'edit-after-delete') return `On ${it.lost.by} you changed ${thing} after ${it.kept.by} deleted it.`;
    const kept = it.kept.mine ? 'This computer' : it.kept.by;
    return `You changed ${thing}${it.field ? ` (${it.field})` : ''} on ${it.lost.by} and on ${it.kept.by} at the same time. ${kept}'s change is kept now.`;
  }
  async function countOpenConflicts() { if (device && meta) await scanConflicts(0); }
  /** GET /api/sync/conflicts: {items, open}. */
  async function conflicts({ max = 50 } = {}) {
    await ensureLoaded();
    if (!device || !meta) return { items: [], open: 0 };
    return scanConflicts(Math.max(0, Math.min(200, max | 0)));
  }
  /**
   * The user's choice for one clash: keep 'kept' (what won; the clash is just
   * marked reviewed) or 'lost' (the other value is written again, newest).
   */
  async function resolveConflict(id, keep) {
    await ensureLoaded();
    if (typeof id !== 'string' || !id || id.length > 40) throw badRequest('Which clash?', 'BAD_CONFLICT');
    if (keep !== 'kept' && keep !== 'lost') throw badRequest('Choose which one to keep.', 'BAD_CHOICE');
    const done = await loadResolved();
    const c = (await readConflicts()).find(x => conflictId(x) === id);
    if (!c) throw badRequest('That clash is no longer listed.', 'NO_CONFLICT');
    let stale = false;
    if (keep === 'lost') {
      if (!active || !settings.apply) throw badRequest('Turn on "Use changes from my other computers" first.', 'TRIAL_MODE');
      if (!standing(c)) stale = true;
      else {
        const writes = [], deletes = [];
        const alive = c.kind === 'edit-after-delete' ? aliveFor(c) : null;
        if (alive) writes.push([alive, true]);                 // bring the item back...
        if (c.lost.deleted) { if (!alive) deletes.push(c.path); }
        else {
          const ok = checkWrite(c.path, c.lost.value, extra);
          if (!ok) throw badRequest('That value cannot be used any more.', 'BAD_VALUE');
          writes.push([c.path, ok.value]);                     // ...with the edit that lost
        }
        resolutions.push({ id, writes, deletes });
        localDirty = true;
      }
    }
    done.add(id);
    await saveResolved();
    if (keep === 'lost' && !stale) await run('now');
    await countOpenConflicts().catch(() => {});
    return { ok: true, stale, ...status() };
  }

  // ─── Roles: who fetches which account ────────────────────────────────
  async function readRoles() {
    const a = await host.data.readJson('accounts.json').catch(() => null);
    const r = await host.data.readJson('roles.json').catch(() => null);
    setRoles(a && a.present ? a.value : null, r && r.present && r.value && r.value.roles && typeof r.value.roles === 'object' ? r.value.roles : {});
    return roles;
  }
  /** The registry (accounts.json's value) and job roles in memory; a snapshot is owned by the account that names its source id. */
  function setRoles(registry, jobRoles = roles.roles) {
    const accounts = registry && Array.isArray(registry.accounts) ? registry.accounts.filter(x => x && typeof x.id === 'string') : [];
    const owners = new Map();
    for (const acc of accounts) {
      owners.set(acc.id, acc.id);
      if (acc.sources && typeof acc.sources === 'object') for (const v of Object.values(acc.sources)) if (typeof v === 'string' && !owners.has(v)) owners.set(v, acc.id);
    }
    roles = { accounts, roles: jobRoles, owners };
  }
  const fidOf = (v) => (typeof v === 'string' && FID_RE.test(v) ? v : null);
  /** ── presence ── {page, stoppedAt} from a device record (its plain part, or the sealed inner one), checked. */
  const presenceOfRecord = (r) => {
    if (!r || typeof r !== 'object') return {};
    const pg = r.page && typeof r.page === 'object' && !Array.isArray(r.page) ? { open: r.page.open === true, at: Number.isFinite(r.page.at) ? r.page.at : null } : null;
    return { ...(pg ? { page: pg } : {}), ...(Number.isFinite(r.stoppedAt) && r.stoppedAt > 0 ? { stoppedAt: r.stoppedAt } : {}) };
  };
  /** This device's id in the fetcher role (see the header). */
  function myFid() {
    let f = null;
    try { f = host.fetcherId; } catch { f = null; }
    return typeof f === 'string' && FID_RE.test(f) ? f : (device ? device.deviceId : null);
  }
  /** The account or job a synced file belongs to; null: a snapshot no account owns (never sent). */
  function ownerOf(f) {
    if (!f || f.role !== 'published') return null;
    if (!f.dir) return f.account;
    const acc = roles.owners.get(f.account);
    if (acc) return acc;
    // A source that is not an account (an MCP server read through Claude, a
    // calendar link): published by the device that reads it, the one whose
    // capabilities list it (lib/sync/caps.mjs; the smallest fetcher id on a clash).
    const fid = sourceOwner(knownDevices(), f.account, { now: now() });
    return fid ? 'src:' + fid : null;
  }
  /** Does this device send its own copy of the file? (shared files: always; snapshots: only its accounts' fetcher, or the device that reads that source) */
  function publishes(f) {
    if (f.role !== 'published') return true;
    const o = ownerOf(f);
    if (o && o.startsWith('src:')) return o.slice(4) === myFid();
    return !!o && isFetcherNow(o);
  }
  const knownDevices = () => {
    const out = [];
    if (device) out.push({ deviceId: device.deviceId, fetcherId: myFid(), name: deviceName(), me: true, lastSeen: now(), background, kind, caps: myCaps ? { ...myCaps, apply: !!settings.apply, background } : null, app: appVersion });
    for (const [id, p] of peers) {
      if (device && id === device.deviceId) continue;
      if (sec() && !e2e.member(id)) continue;           // encrypted sync: members only
      out.push({ deviceId: id, fetcherId: p.fetcherId || id, name: (sec() && e2e.nameOf(id)) || p.name, me: false, lastSeen: p.lastSeen || null, background: p.background !== false, kind: p.kind || 'computer', caps: p.caps || null, app: p.app || null, clockAheadMs: p.clockAheadMs || 0 });
    }
    return out;
  };
  const accountOf = (id) => roles.accounts.find(a => a.id === id) || null;
  /**
   * Who is recorded to run an account (its `fetcher`) or a job ('main', 'bank',
   * 'ai-brief', 'story', 'connectors': its role, else the main computer's), as a
   * fetcher id, or null. The one rule: lib/sync/roles.mjs recordedRunner.
   */
  function fetcherIdOf(id) { return recordedRunner(id, roles); }
  /**
   * Synchronous check (registry and roles as last read). What is recorded holds
   * with sync on or off (the accounts code and the main computer read the same
   * files); nothing recorded: with sync off, or no other device, this device
   * does it, as before sync.
   */
  function isFetcherNow(id) {
    // The whole rule is lib/sync/roles.mjs runsNow: live sync's lease (lib/sync/live/lease.mjs)
    // when it has an answer (it starts from the recorded pin and moves the job while that
    // device sleeps), else what is recorded, else the default below.
    let lease = null;
    if (settings.enabled && device && leaseOracle) { try { lease = leaseOracle(id); } catch { lease = null; } }
    if (lease === true || lease === false) return runsNow({ lease });
    // A job that needs something (Claude, the Claude connectors, a bank): only a
    // device that has it runs it, whatever is recorded (lib/sync/caps.mjs).
    const cap = capableRunner(id);
    if (cap) return cap === myFid();
    // Unassigned: a device that fetches in the background takes it; one that
    // only fetches while open (a phone) leaves it to such a device if there is one.
    const fallback = !settings.enabled || !device ? true : background || !knownDevices().some(d => !d.me && d.background);
    return runsNow({ recorded: fetcherIdOf(id), me: myFid(), fallback });
  }

  /**
   * A job that is not an account and needs a capability (lib/sync/caps.mjs
   * jobNeed: AI jobs need Claude, the connectors' update the Claude connectors,
   * bank updates a bank): the fetcher id of the device that runs it, when the
   * capabilities decide; null when they do not (nobody publishes capabilities
   * yet, or nobody has it: the recorded rule applies, as before). The recorded
   * runner (its role, else the main computer) keeps it when it can; else the
   * capable device that is online, smallest fetcher id first. A device that
   * publishes no capabilities (an older version) is taken to be able to.
   */
  function capableRunner(id) {
    if (!settings.enabled || !device || accountOf(id)) return null;
    const need = jobNeed(id);
    if (!need) return null;
    const t = now();
    const devs = knownDevices().filter(d => isRecent(d, t));
    if (!devs.some(d => d.caps)) return null;
    const cands = devs.filter(d => !d.caps || hasNeed(d.caps, need));
    if (!cands.length) return null;
    // ── host ── Claude's jobs follow the Claude host (live sync's 'claude' lease holder while it moves them).
    if ((need === 'claude' || need === 'connectors') && claudeHostFn) {
      let h = null;
      try { h = claudeHostFn(need, { devices: devs, roles: roles.roles }); } catch { h = null; }
      if (h && cands.some(d => d.fetcherId === h)) return h;
    }
    const rec = fetcherIdOf(id);
    if (rec && cands.some(d => d.fetcherId === rec)) return rec;
    const byFid = (a, b) => (String(a.fetcherId) < String(b.fetcherId) ? -1 : String(a.fetcherId) > String(b.fetcherId) ? 1 : 0);
    const online = cands.filter(d => isOnline(d, t)).sort(byFid);
    return (online[0] || [...cands].sort(byFid)[0]).fetcherId || null;
  }

  // ─── Synced files ────────────────────────────────────────────────────
  // ── files ── files (or parts) too big to sync from here: rel -> {id, why, whole, at}.
  // A WHOLE one is left alone by merges too (this computer's copy could not be
  // sent, so a smaller copy from elsewhere must not replace it); Settings > Sync lists them.
  const notSynced = new Map();
  function noteNotSynced(f, { whole = false, bytes = 0 } = {}) {
    const why = bytes ? `larger than ${Math.round(fileRule(f).maxBytes / 1024)} KB (${Math.round(bytes / 1024)} KB)` : whole ? 'larger than 256 KB' : 'some entries are larger than 256 KB';
    const had = notSynced.get(f.rel);
    notSynced.set(f.rel, { id: f.id, why, whole, at: now() });
    if (!had || had.why !== why) log('warn', `sync: a synced file (${f.id}) is too big to send: ${why}; ${whole ? 'it stays as it is on this computer' : 'those entries stay on this computer'}`);
  }
  const keepsLocal = (rel) => { const n = notSynced.get(rel); return !!(n && n.whole); };
  /** The synced files present here or known to the registers: [{top, rel, spec, role, account}]. */
  async function fileList() {
    const known = [];
    if (tree.k) for (const k of tree.k.keys()) if (k.startsWith(FILE_PREFIX)) known.push(k);
    if (remoteTree.k) for (const k of remoteTree.k.keys()) if (k.startsWith(FILE_PREFIX)) known.push(k);
    // A file that travels only end-to-end encrypted (the blob catalogue) is left alone otherwise.
    return (await fileInstances({ list: (dir) => host.data.list(dir), known })).filter(f => !f.e2eOnly || sec());
  }
  async function writeFileFromTree(top) {
    const f = fileSpecFor(top);
    if (!f || keepsLocal(f.rel)) return;
    const cur = await host.data.readJson(f.rel);
    // A snapshot this device does not publish is a MIRROR of the fetcher's: rebuilt from the registers alone.
    const mirror = !publishes(f);
    const r = mirror ? materializeFile(top, f.spec, undefined, false, tree) : materializeFile(top, f.spec, cur && cur.value, !!(cur && cur.present), tree);
    if (r.present) await host.data.writeJson(f.rel, r.value); else if (cur && cur.present) await host.data.remove(f.rel);
  }

  // ─── Reading other devices ───────────────────────────────────────────
  /** Every device folder and its files: [{id, files}] (one listing per pass, shared with the key layer). */
  async function listAll() {
    const out = [];
    for (const id of await ad.listDevices()) out.push({ id, files: await ad.listFiles(id) });
    return out;
  }
  async function readPeers(listing) {
    for (const { id, files } of listing) {
      if (files.device) {
        const p = peers.get(id);
        if (!p || p.mtimeMs !== files.device.mtimeMs || (sec() && p.locked && e2e.ready)) {
          const info = await ad.readJson(id, 'device.json', 256 * 1024);
          if (info && info.deviceId === id) {
            const base = { name: String(info.name || '').slice(0, 60) || 'Another device', lastSeen: Date.parse(info.lastSeen) || files.device.mtimeMs, app: String(info.app || '').slice(0, 20), instance: info.instance || null, background: info.fetch !== 'foreground', fetcherId: fidOf(info.fetcherId), mtimeMs: files.device.mtimeMs, plain: info.v !== 2, caps: info.v !== 2 ? cleanCaps(info.caps) : null };
            // ── health ── a device.json written "in the future" by this computer's clock: that clock (or this one) is off.
            // (Read soon after it was written; the cloud's delay only makes this smaller, never larger.)
            const ahead = (Date.parse(info.lastSeen) || 0) - now();
            base.clockAheadMs = ahead > CLOCK_AHEAD_MS ? ahead : 0;
            // ── presence ── its own clock's lastSeen, and when THIS computer watched the record change (its clock may be wrong).
            base.seenClaim = Date.parse(info.lastSeen) || null;
            base.observedAt = p && p.mtimeMs !== files.device.mtimeMs ? now() : (p ? p.observedAt || null : null);
            Object.assign(base, presenceOfRecord(info.v !== 2 ? info : null));
            if (sec() && info.v === 2) {
              // The name, kind and progress are encrypted: readable once this device holds the key.
              const inner = e2e.ready ? await e2e.openDevice(info, id) : null;
              Object.assign(base, { name: (inner && String(inner.name || '').slice(0, 60)) || 'Another device', kind: inner && ['computer', 'phone', 'tablet'].includes(inner.kind) ? inner.kind : 'computer', seen: inner && inner.seen && typeof inner.seen === 'object' ? inner.seen : null, fetcherId: fidOf(inner && inner.fetcherId), locked: !inner });
              // Live sync: its addresses and "main computer" claims (encrypted with the rest).
              base.extra = inner && inner.live && typeof inner.live === 'object' && !Array.isArray(inner.live) ? inner.live : null;
              // What it can do (Claude, the sources it reads itself, its own sign-ins): encrypted too.
              base.caps = cleanCaps(inner && inner.caps);
              // ── relay carry-over ── the person's relay as that device has it (its address, role) and
              // the record itself (registers of friends/relays.json), so this one never waits for the logs.
              base.rly = cleanRly(inner && inner.rly);
              if (inner && inner.part && id !== device.deviceId && e2e.member(id)) notePart(id, inner.part);
              Object.assign(base, presenceOfRecord(inner));
            }
            peers.set(id, base);
            notePeerApp(id, base.app);
          }
        }
      }
      const newest = Math.max(0, ...files.logs.map(l => l.mtimeMs));
      if (peers.has(id) && newest > (peers.get(id).lastSeen || 0)) peers.get(id).lastSeen = newest;
    }
  }
  /**
   * ── 2.17.1 ── Another device now runs another version of OpenDash. While it ran an older
   * one, it read (and dropped) what that version did not know yet, a synced file new in
   * this one for example (2.17.0's friends/relays.json on a computer still on 2.16), and
   * nothing would send it again until this device's next daily snapshot. A fresh snapshot
   * now carries every register at once. (The first sight of a device only records it.)
   */
  let snapSoon = false, snapSoonAt = 0;
  function notePeerApp(id, app) {
    if (!meta || !app || id === device.deviceId || (sec() && !e2e.member(id))) return;
    if (!meta.peerApps || typeof meta.peerApps !== 'object') meta.peerApps = {};
    const was = meta.peerApps[id];
    if (was === app) return;
    meta.peerApps[id] = app; metaDirty = true;
    if (!was || now() - snapSoonAt < 10 * 60 * 1000) return;
    snapSoon = true; snapSoonAt = now();
    log('info', `sync: another device moved to OpenDash ${app.slice(0, 20)}: writing a fresh snapshot so it gets everything`);
  }
  // ─── The person's relay, carried over (2.17.1) ────────────────────────
  /** {o: origin, r: 'owner'|'member'} from a device record, checked, or null. */
  function cleanRly(x) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
    const o = cleanOrigin(x.o);
    return o ? { o, r: x.r === 'owner' ? 'owner' : 'member' } : null;
  }
  /** Another device's copy of the person's relay record: merged on the next pass unless it is the one taken last. */
  function notePart(id, data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    let text;
    try { text = JSON.stringify(data); } catch { return false; }
    if (!text || text.length > PART_MAX * 2) return false;
    const h = hash(text);
    if (meta && meta.partSeen && meta.partSeen[id] === h) return false;
    const cur = pendingParts.get(id);
    if (cur && cur.h === h) return false;
    pendingParts.set(id, { data, h });
    return true;
  }
  let partCache = { key: null, part: null };
  /** This device's registers of the person's relay record as {data, h} (serialized like a snapshot), or null. */
  function personPart() {
    if (!sec() || !tree.k || !tree.k.has(PART_TOP)) return null;
    const home = getReg(tree, [PART_TOP, 'home']);
    const homeKey = home && !home.d && typeof home.v === 'string' ? home.v : null;
    const rel = homeKey ? getReg(tree, [PART_TOP, 'relays', homeKey]) : null;
    const choice = getReg(tree, [PART_TOP, 'sync']);
    // the containers' own @alive registers too (a record and a map exist apart from their fields), and 'v'
    const regs = [[[PART_TOP, '@alive']], [[PART_TOP, 'v']], [[PART_TOP, 'relays', '@alive']]].map(([path]) => [path, getReg(tree, path)]);
    const key = [home && home.h, rel && rel.h, choice && choice.h, homeKey, ...regs.map(([, r]) => r && r.h)].join('|');
    if (partCache.key === key) return partCache.part;
    let part = null;
    if (home || choice) {
      const t = newTree();
      for (const [path, r] of regs) if (r) applyWrite(t, path, r);
      if (home) applyWrite(t, [PART_TOP, 'home'], home);
      if (rel) applyWrite(t, [PART_TOP, 'relays', homeKey], rel);
      if (choice) applyWrite(t, [PART_TOP, 'sync'], choice);
      const data = serializeTree(t);
      const text = JSON.stringify(data);
      if (text.length <= PART_MAX) part = { data, h: hash(text) };
    }
    partCache = { key, part };
    return part;
  }
  /**
   * The person's relay as far as this computer knows: its own friends/relays.json (from: 'here'),
   * else what another of their devices says it uses (from: 'peer', by: its name), else null.
   * {origin, host, role, from, by?}. A friend's relay that does not carry sync does not count.
   */
  function personRelay() {
    const hostOf = (o) => { try { return new URL(o).host; } catch { return null; } };
    const info = relayInfo();
    if (info && info.origin && info.source === 'friends' && (info.role === 'owner' || info.usable)) return { origin: info.origin, host: hostOf(info.origin), role: info.role, from: 'here' };
    if (!settings.enabled) return null;
    for (const [id, p] of peers) {
      if (!p.rly || (device && id === device.deviceId) || (sec() && !e2e.member(id))) continue;
      return { origin: p.rly.o, host: hostOf(p.rly.o), role: p.rly.r, from: 'peer', by: peerName(id) };
    }
    return null;
  }
  /**
   * Should this computer start syncing through the person's relay by itself? When the person chose
   * it on another computer (friends/relays.json sync.on), or it is their OWN relay and nobody chose
   * otherwise (relay first, the folder as a backup: the owner's rule of 24 Oct 2026). Never when it
   * was turned off on this computer, and only once it can (the key to the relay is here).
   */
  function relayAutoWanted() {
    if (!settings.enabled || settings.relay || settings.relayOff || !settings.folder || !sec() || !e2e.ready) return false;
    const r = relayInfo();
    if (!r || !r.usable || !r.origin || r.private) return false;
    const choice = typeof r.syncAll === 'boolean' ? r.syncAll : null;
    if (choice === false || (choice !== true && r.role !== 'owner')) return false;
    let hasKey = false;
    try { hasKey = typeof host.relayHasKey === 'function' ? !!host.relayHasKey() : false; } catch { hasKey = false; }
    return hasKey;
  }
  /** Another device that still syncs without encryption (not this device's own old folder). */
  const isPlainPeer = (id, files) => id !== device.deviceId && !(meta && (meta.oldIds || []).includes(id)) && peers.has(id) && peers.get(id).plain && !!(files.logs.length || files.snapshot);
  /** Encrypted sync: whether this device takes in another device's records at all. */
  const readsFrom = (id) => !sec() || id === device.deviceId || !!e2e.member(id) || !!e2e.removedInfo(id);

  /**
   * ── 2.17.1 ── Read a device's snapshot and logs again from the start (its offsets and
   * snapshot stamp are forgotten). replay: lines already taken are taken AGAIN (after an
   * update, for what the older version dropped); otherwise they are skipped as before
   * and only missing ones are used. Either way merging twice is harmless (per register,
   * later change wins), and clashes are not reported again for what was read before.
   */
  function scheduleReread(id, { replay = false } = {}) {
    if (!meta.reread || typeof meta.reread !== 'object') meta.reread = {};
    const cur = meta.reread[id];
    meta.reread[id] = { replay: !!(replay || (cur && cur.replay)), at: now() };
    meta.offsets[id] = {};
    delete meta.snaps[id];
    metaDirty = true;
  }
  /**
   * ── self-healing ── A hole: another device's change n+1 is missing here while later ones
   * arrived (they wait in 'ahead'), so what this device reports as seen stays at n. Live
   * records arrive out of order for a moment, so only a hole that stays GAP_MS gets its
   * device's logs read again from the start: lines already here are skipped by their plain
   * number (nothing is decrypted twice), the missing one is used, and the count closes.
   * A hole that a newer snapshot covers closes when the snapshot is read again with them.
   */
  function watchGaps(listing) {
    if (!meta.gaps || typeof meta.gaps !== 'object') meta.gaps = {};
    const t = now();
    for (const id of Object.keys(meta.gaps)) if (!(meta.ahead[id] || []).length) { delete meta.gaps[id]; metaDirty = true; }
    for (const id of Object.keys(meta.ahead || {})) {
      if (!(meta.ahead[id] || []).length || id === device.deviceId || (sec() && !e2e.member(id))) continue;
      const entry = listing.find(x => x.id === id);
      if (!entry || !(entry.files.logs.length || entry.files.snapshot)) continue;   // nothing there to read again
      let g = meta.gaps[id];
      if (!g) { g = meta.gaps[id] = { since: t, tries: 0, next: t + gapMs }; metaDirty = true; }
      if (t < g.next || (meta.reread && meta.reread[id])) continue;
      g.tries++;
      g.next = t + Math.min(GAP_RETRY_MAX_MS, GAP_RETRY_MS * 2 ** Math.max(0, g.tries - 1));
      log('info', `sync: a change from another device is missing here (after ${meta.frontier[id] || 0}); reading its changes again to find it`);
      scheduleReread(id);
    }
  }
  /** After a pass took what gather read: devices read to the end are done re-reading; an update's replay ends when every device is. */
  function rereadDone(got) {
    for (const id of got.rereadDone || []) if (meta.reread && meta.reread[id]) { delete meta.reread[id]; metaDirty = true; }
    if (meta.replayAll && got.replayScheduledAll) { delete meta.replayAll; delete meta.replayDone; metaDirty = true; }
  }

  async function gather(listing) {
    const out = { ops: [], snaps: [], offsets: {}, snapKeys: {}, bad: {}, waitingLines: 0, waitingFrom: null, rejected: 0, encrypted: 0, waitingKey: 0, tampered: 0, refused: 0, duplicates: 0, plainFrom: new Set(), live: 0, rereadDone: [], replayScheduledAll: false };
    await readPeers(listing);
    const seenNow = new Set();
    // ── 2.17.1 ── after an update: every device this one reads is read once more (see loadMeta)
    if (meta.replayAll && (!sec() || e2e.ready)) {
      if (!meta.replayDone || typeof meta.replayDone !== 'object') meta.replayDone = {};
      for (const { id } of listing) {
        if (id === device.deviceId || meta.replayDone[id] || !readsFrom(id) || (sec() && !e2e.member(id))) continue;
        scheduleReread(id, { replay: true });
        meta.replayDone[id] = true;
      }
      out.replayScheduledAll = true;
    }
    if (settings.apply) watchGaps(listing);
    // 2.19.8: unencrypted records are taken only in a folder that never had encrypted sync. Once an
    // encrypted group shows here, an unencrypted record is from an old device or someone else.
    if (!sec() && st.groupSeen && !meta.e2eSeen) { meta.e2eSeen = true; metaDirty = true; }
    const plainLocked = !sec() && !!(st.groupSeen || meta.e2eSeen);
    for (const { id, files } of listing) {
      if (id === device.deviceId && meta.joined) continue;   // our own files: read again only to recover lost meta
      if (!readsFrom(id)) { if (isPlainPeer(id, files)) out.plainFrom.add(id); continue; }
      const rr = id !== device.deviceId && meta.reread ? meta.reread[id] || null : null;
      const replay = !!(rr && rr.replay);
      let complete = true;
      const offs = { ...(meta.offsets[id] || {}) };
      let covered = 0;     // 2.19.8: the seq of this device's snapshot taken this pass: its own lines up to there are in it
      if (files.snapshot) {
        const key = `${files.snapshot.size}:${files.snapshot.mtimeMs}`;
        if (meta.snaps[id] !== key) {
          let snap = await ad.readJson(id, 'snapshot.json');
          if (sec() && snap) {
            // Encrypted sync: only a sealed snapshot from this group counts; an unencrypted one never does.
            if (snap.v === 2) {
              const r = await e2e.openSnapshot(snap, id);
              if (r.wait) { out.waitingKey++; snap = null; complete = false; }
              else if (r.snap) snap = r.snap;
              else { if (r.bad) out.tampered++; else out.refused++; meta.snaps[id] = key; snap = null; }
            } else if (snap.v === 1) { if (e2e.member(id)) out.tampered++; else out.plainFrom.add(id); meta.snaps[id] = key; snap = null; }
          }
          if (snap && plainLocked && id !== device.deviceId && snap.v === 1) { meta.snaps[id] = key; out.plainFrom.add(id); snap = null; }
          if (!snap) { if (meta.snaps[id] !== key) complete = false; /* waiting for the key, or still arriving (refused: done) */ }
          else if (snap.enc != null || (typeof snap.v === 'number' && snap.v > 1)) out.encrypted++;    // encrypted (reserved) or a newer format: never guessed at
          else if (snap && snap.v === 1 && snap.dev === id && snap.data && snap.data.v === 2) {
            out.snaps.push({ dev: id, snap, ...(rr ? { quiet: true } : {}) });
            out.snapKeys[id] = key;
            if (sec() && Number.isInteger(snap.seq)) covered = snap.seq;
            for (const [n, size] of Object.entries(snap.covers || {})) if (LOG_NAME_RE.test(n) && Number.isFinite(size)) offs[n] = Math.max(offs[n] || 0, size);
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
          let line = obj;
          if (sec()) {
            if (obj && obj.v === 2) {
              // Already here (by its number in the clear): skipped before anything is decrypted, so a
              // re-read costs only the reading. A replay after an update takes it again (see loadMeta).
              // 2.19.8: nor does a replay take again a line under a key made before a removal (a removed
              // device still holds that key and could have rewritten the line); and a line the device's
              // snapshot read in this pass already covers is never taken from the log.
              const again = !replay || (obj.enc && typeof obj.enc === 'object' && e2e.beforeRemoval(obj.enc.k));
              if (Number.isInteger(obj.n) && ((covered && obj.n <= covered) || (again && (seenNow.has(`${id}:${obj.n}`) || (settings.apply && ((meta.frontier[id] || 0) >= obj.n || (meta.ahead[id] || []).includes(obj.n))))))) { out.duplicates++; last = e; continue; }
              const o = await e2e.openLine(obj, id, lf.name);
              if (o.wait) { out.waitingKey++; end = last; stopped = true; break; }   // a newer key: read on once it is here
              if (!o.line) { if (o.bad) out.tampered++; else out.refused++; last = e; continue; }
              line = o.line;
              // The same change twice (a copy, a replay): taken once.
              const k = `${id}:${line.n}`;
              // (A replay after an update takes them again: an older version may have dropped part of them.)
              if (seenNow.has(k) || (!replay && settings.apply && ((meta.frontier[id] || 0) >= line.n || (meta.ahead[id] || []).includes(line.n)))) { out.duplicates++; last = e; continue; }
              seenNow.add(k);
            } else if (obj && obj.v === 1) {
              // Never mixed into an encrypted group: in a member's folder it was put there by someone else.
              if (e2e.member(id) || id === device.deviceId) out.tampered++; else out.plainFrom.add(id);
              last = e; continue;
            }
          }
          if (plainLocked && id !== device.deviceId && line && line.v === 1) { out.plainFrom.add(id); last = e; continue; }
          // Encrypted (reserved) or a newer format: stop here and say so; never skip it, a newer version will read it.
          if (line && (line.enc != null || (typeof line.v === 'number' && line.v > 1))) { out.encrypted++; end = last; stopped = true; break; }
          const v = validateOp(line, id, extra);
          if (!v) out.rejected++;
          else { out.rejected += v.rejected; out.ops.push(replay ? { ...v.op, quiet: true } : v.op); }
          last = e;
        }
        if (r.bad && !stopped) {
          const bk = `${id}/${lf.name}`;
          const prev = meta.bad[bk];
          const tries = prev && prev.at === r.bad.at && prev.size === lf.size ? prev.tries + 1 : 1;
          if (tries >= BAD_LINE_TRIES) {
            end = (await ad.skipLine(id, lf.name, r.bad.at)) ?? end;     // unreadable for several passes: step over it
            out.rejected++;
            log('warn', 'sync: skipped an unreadable line in a log from another device');
          } else out.bad[bk] = { at: r.bad.at, size: lf.size, tries };
        }
        if ((r.partial > 0 || r.busy) && !stopped) { out.waitingLines++; out.waitingFrom = id; }
        offs[lf.name] = end;
        if (end < lf.size) complete = false;
      }
      out.offsets[id] = offs;
      if (rr && complete) out.rereadDone.push(id);
    }
    // ── relay carry-over ── the person's relay record another device sent (device.json or live)
    out.parts = [...pendingParts.entries()].map(([dev, x]) => ({ dev, data: x.data, h: x.h }));
    pendingParts.clear();
    // Records a connected device pushed (live sync): exactly the checks a log
    // line from the folder gets, and the same "taken once" rule, so the copy
    // that arrives later through the folder (or arrived first) changes nothing.
    if (liveQueue.length) {
      const items = liveQueue.splice(0, liveQueue.length);
      if (sec() && e2e.ready) {
        for (const { dev, file, rec } of items) {
          if (dev === device.deviceId || !e2e.member(dev) || !LOG_NAME_RE.test(file || '') || !rec || rec.dev !== dev) { st.liveRefused++; continue; }
          const o = await e2e.openLine(rec, dev, file);
          if (o.wait) continue;                         // a key this device does not have yet: the folder brings it again
          if (!o.line) { if (o.bad) out.tampered++; else out.refused++; st.liveRefused++; continue; }
          const k = `${dev}:${o.line.n}`;
          if (seenNow.has(k) || (meta.frontier[dev] || 0) >= o.line.n || (meta.ahead[dev] || []).includes(o.line.n)) { st.liveDuplicates++; continue; }
          seenNow.add(k);
          const v = validateOp(o.line, dev, extra);
          if (!v) { out.rejected++; continue; }
          out.rejected += v.rejected;
          out.ops.push(v.op);
          out.live++;
        }
      }
    }
    return out;
  }

  // ─── Merging ─────────────────────────────────────────────────────────
  /**
   * ── 2.17.2 ── A register this computer has merged before: its own (or its old id's), or
   * another device's change whose number it has already counted as seen. Reading it again
   * (an update's replay, a re-read, the fresh snapshot another device writes when this one
   * is updated) is never news, so it never records a clash, of any kind. (2.17.1 kept only
   * the replay itself quiet; the fresh snapshot right after it re-reported every old edit
   * inside an item deleted since.)
   */
  function knownHere(reg) {
    const d = devOf(reg.h);
    if (!d || !meta || !device) return false;
    if (d === device.deviceId || (meta.oldIds || []).includes(d)) return true;
    const n = Number(reg.n) || 0;
    return n > 0 && ((meta.frontier[d] || 0) >= n || (meta.ahead[d] || []).includes(n));
  }
  function applyRemote(path, reg, touched, conflicts, cur) {
    const known = knownHere(reg);
    const res = applyWrite(tree, path, reg, (c) => {
      if (known || path[path.length - 1] === '@pos') return;   // merged before, or a move that lost: not worth a conflict
      recordConflict(conflicts, 'same-field', c, cur);
    });
    if (res === 'won') touched.add(path[0]);
    // Already here (the same register) or merged before: any clash it makes was checked when it first arrived.
    if (known || res === 'same') return res;
    const leaf = path[path.length - 1];
    // An edit inside something another device deleted: the delete wins. ── 2.17.2 ── It is a
    // clash only when the edit really came after the delete without knowing of it (editCameLater):
    // an older edit the deleting computer simply had not seen yet is not (the delete was the later choice).
    if (leaf !== '@alive' && leaf !== '@pos' && !reg.d && res === 'won') {
      for (const pre of elementPrefixes(path, extra)) {
        if (pre.length < 2 || pre.length >= path.length) continue;
        const al = getReg(tree, [...pre, '@alive']);
        if (al && !al.d && al.v === false && editCameLater(al, reg)) {
          recordConflict(conflicts, 'edit-after-delete', { path, kept: al, lost: reg, alive: [...pre, '@alive'] }, cur);
          break;
        }
      }
    }
    // ...and the other way round: a delete arrives after an edit made later, without knowing of it.
    if (leaf === '@alive' && reg.v === false && res === 'won') {
      const pre = path.slice(0, -1);
      let node = tree;
      for (const s of pre) { node = node && node.k ? node.k.get(s) : null; if (!node) break; }
      if (node) for (const [p, r] of walkRegs(node, pre)) {
        const l = p[p.length - 1];
        if (l === '@alive' || l === '@pos' || r.d) continue;
        if (editCameLater(reg, r)) { recordConflict(conflicts, 'edit-after-delete', { path: p, kept: reg, lost: r, alive: path }, cur); break; }
      }
    }
    return res;
  }

  /**
   * Incoming writes as [path, reg, quiet], validated, from snapshots and log lines.
   * quiet: read again (a re-read or an update's replay): it was merged here before,
   * so a clash it makes was reported then (or is an old one), never again.
   */
  const tooFarAhead = (h) => { const d = decodeHlc(h); return !!d && d.wall > now() + FUTURE_MAX_MS; };
  let farWarned = 0;
  function farAheadWarn(dev) { if (now() - farWarned > 3600000) { farWarned = now(); log('warn', `sync: refused a change from ${dev} stamped more than a day in the future (is that computer's clock right?)`); } }
  function* incoming(got, result) {
    for (const { dev, snap, quiet } of got.snaps) {
      let top = null;
      for (const [p, r] of walkRegs(loadTree(snap.data))) {
        const ok = r.d ? (classifyPath(p, extra) || {}).leaf === 'value' : checkWrite(p, r.v, extra);
        if (!ok || !decodeHlc(r.h) || tooFarAhead(r.h)) { st.rejected++; continue; }
        if (!top || r.h > top) top = r.h;
        yield [p, r.d ? { h: r.h, n: r.n, s: r.s, d: true } : { h: r.h, n: r.n, s: r.s, v: ok.value }, !!quiet];
      }
      if (top) clock.observe(top);
      result.snapSeen.push({ dev, snap });
    }
    // ── relay carry-over ── registers of the person's relay record, with the clock times they were
    // written at (so a later change, a Disconnect for one, still wins wherever they meet).
    for (const { dev, data, h } of got.parts || []) {
      let t = null;
      try { t = loadTree(data); } catch { t = null; }
      if (t) {
        for (const [p, r] of walkRegs(t)) {
          if (p[0] !== PART_TOP) { st.rejected++; continue; }
          const ok = r.d ? (classifyPath(p, extra) || {}).leaf === 'value' : checkWrite(p, r.v, extra);
          if (!ok || !decodeHlc(r.h) || tooFarAhead(r.h)) { st.rejected++; continue; }
          clock.observe(r.h);
          yield [p, r.d ? { h: r.h, n: r.n, s: r.s, d: true } : { h: r.h, n: r.n, s: r.s, v: ok.value }, false];
        }
      }
      result.partSeen.push({ dev, h });
    }
    for (const op of got.ops) {
      // Refused, but counted as seen (so it is not read again and again).
      if (tooFarAhead(op.h)) { st.rejected += op.w.length + op.x.length || 1; result.opSeen.push(op); farAheadWarn(op.dev); continue; }
      clock.observe(op.h);
      for (const [p, v] of op.w) yield [p, { h: op.h, n: op.n, s: op.s, v }, !!op.quiet];
      for (const p of op.x) yield [p, { h: op.h, n: op.n, s: op.s, d: true }, !!op.quiet];
      result.opSeen.push(op);
    }
  }

  async function mutateFn(cur, got, opts, files, stamps = null) {
    const result = { sent: 0, received: 0, collected: 0, from: new Set(), conflicts: [], snapSeen: [], opSeen: [], partSeen: [], fileWrites: [], won: [], feed: null };
    // a) what changed here since the last pass: the state, and the synced files
    // this device may publish (shared ones; snapshots only for accounts it fetches).
    // A file whose stamp has not moved since it was last captured has nothing new
    // (merges rewrite it, which moves the stamp), so it is not read again.
    const cap = capture(cur, tree, { onSkip: () => { st.skipped++; } });
    // ── health ── "Keep theirs" from the Review list: the other value, written
    // again here as a new change (so it is the newest on every device).
    const resolving = settings.apply ? resolutions.splice(0, resolutions.length) : [];
    inFlight = resolving;
    if (resolving.length) {
      const pk = (p) => JSON.stringify(p);
      const drop = new Set(resolving.flatMap(x => [...x.writes.map(([p]) => pk(p)), ...x.deletes.map(pk)]));
      cap.w = cap.w.filter(([p]) => !drop.has(pk(p)));
      cap.x = cap.x.filter(p => !drop.has(pk(p)));
      for (const x of resolving) { cap.w.push(...x.writes); cap.x.push(...x.deletes); }
    }
    if (blobs) blobs.noteState(cur);       // ── blobs ── the pictures its people show
    passCapStamps = new Map();
    const dated = [], stale = new Set();   // ── files ── dated results [{h, w}]; files holding an older copy than the one known
    for (const [i, f] of files.entries()) {
      if (!publishes(f)) { passCapStamps.set(f.rel, null); continue; }
      const sNow = stamps ? stamps[i] : null;
      if (sNow && capStamps.get(f.rel) === sNow) continue;
      const r = await host.data.readJson(f.rel).catch(() => null);
      if (r && r.error) continue;                     // unreadable right now (half written by another program): next pass
      // ── files ── a file too big to sync stays as it is here (status notSynced); results
      // are dated (manifest FILE_RULES): each goes out under its own produced-at.
      const rule = fileRule(f);
      const size = rule && rule.maxBytes && r && r.present ? JSON.stringify(r.value).length : 0;
      if (size && size > rule.maxBytes) { noteNotSynced(f, { whole: true, bytes: size }); if (sNow) passCapStamps.set(f.rel, sNow); continue; }
      let big = 0;
      const c = captureFile(f.top, f.spec, r && r.value, !!(r && r.present), tree, { onSkip: (p, why) => { st.skipped++; if (why === 'too big') big = Math.max(big, p.length === 1 ? 2 : 1); } });
      if (big) noteNotSynced(f, { whole: big === 2 }); else notSynced.delete(f.rel);
      if (rule && rule.newest) {
        const d = datedSplit(c, { tree, newest: rule.newest, depth: rule.depth || 1, deviceId: device.deviceId, now: now() });
        cap.w.push(...d.w); cap.x.push(...d.x); dated.push(...d.dated);
        if (d.stale) stale.add(f.top);
      } else { cap.w.push(...c.w); cap.x.push(...c.x); }
      if (sNow) passCapStamps.set(f.rel, sNow);
    }
    const sending = cap.w.length + cap.x.length + dated.reduce((a, g) => a + g.w.length, 0);
    if (sending) {
      const s = seenVector();
      const lines = [];
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
        let w = cap.w, x = cap.x;
        while (w.length || x.length) {
          const cw = w.slice(0, CHUNK); w = w.slice(cw.length);
          const cx = x.slice(0, CHUNK - cw.length); x = x.slice(cx.length);
          lines.push({ v: 1, dev: device.deviceId, n: ++meta.seq, h, s, w: cw, x: cx });
        }
      }
      // ── files ── dated results: one line per produced-at (lib/sync/model.mjs datedSplit)
      for (const g of dated) for (let i = 0; i < g.w.length; i += CHUNK) lines.push({ v: 1, dev: device.deviceId, n: ++meta.seq, h: g.h, s, w: g.w.slice(i, i + CHUNK), x: [] });
      for (const op of lines) {
        for (const [p, v] of op.w) applyWrite(tree, p, { h: op.h, n: op.n, s: op.s, v });
        for (const p of op.x) applyWrite(tree, p, { h: op.h, n: op.n, s: op.s, d: true });
      }
      let out = lines, opts2;
      if (sec()) {
        // Encrypted: the log file's name is part of each line's associated data.
        const name = await ad.nextLogName();
        out = [];
        for (const l of lines) out.push(await e2e.sealLine(l, name));
        opts2 = { name };
      }
      const r = await ad.appendLog(out, opts2);
      // Live sync: the sealed records go to connected devices now (the folder copy follows).
      if (sec() && r && recordListeners.size) {
        const msg = { file: opts2.name, records: out };
        for (const fn of recordListeners) { try { fn(msg); } catch { /* a listener never breaks sync */ } }
      }
      meta.bytesSinceSnapshot += out.reduce((a, l) => a + JSON.stringify(l).length + 1, 0);
      if (r) meta.offsets[device.deviceId] = { ...(meta.offsets[device.deviceId] || {}), [r.name]: r.size };
      result.sent = sending;
      metaDirty = true;
    }
    meta.joined = true;

    const touched = new Set();
    // ── health ── the registers other devices' changes won here, for the "What changed" feed (lib/sync/changes.mjs)
    const mine = new Set([device.deviceId, ...((meta && meta.oldIds) || [])]);
    const won = (p, r) => { if (result.won.length < 20000 && !mine.has(devOf(r.h))) result.won.push([p, r]); };
    for (const x of resolving) { for (const [p] of x.writes) touched.add(p[0]); for (const p of x.deletes) touched.add(p[0]); }
    if (settings.apply) {
      // b) apply: what was collected in shadow mode first, then what is new
      for (const [p, r] of walkRegs(remoteTree)) if (applyRemote(p, r, touched, result.conflicts, cur) === 'won') { result.received++; result.from.add(devOf(r.h)); won(p, r); }
      if (remoteTree.k) {
        remoteTree = newTree();
        for (const [d, n] of Object.entries(meta.pendingSeen)) seenAtLeast(d, n);
        meta.pendingSeen = {};
      }
      for (const [p, reg, quiet] of incoming(got, result)) if (applyRemote(p, reg, touched, quiet ? [] : result.conflicts, cur) === 'won') { result.received++; result.from.add(devOf(reg.h)); won(p, reg); }
      for (const op of result.opSeen) markSeen(op.dev, op.n);
      for (const { dev, snap } of result.snapSeen) {
        if (Number.isInteger(snap.seq)) seenAtLeast(dev, snap.seq);
        for (const [d, n] of Object.entries(snap.seen || {})) if (ID_RE.test(d) && Number.isInteger(n) && d !== device.deviceId) seenAtLeast(d, n);
      }
    } else {
      // b') shadow mode: collect, never touch the data
      for (const [p, reg] of incoming(got, result)) { if (applyWrite(remoteTree, p, reg) === 'won') result.collected++; }
      for (const op of result.opSeen) meta.pendingSeen[op.dev] = Math.max(meta.pendingSeen[op.dev] || 0, op.n);
      for (const { dev, snap } of result.snapSeen) if (Number.isInteger(snap.seq)) meta.pendingSeen[dev] = Math.max(meta.pendingSeen[dev] || 0, snap.seq);
      if (result.collected) previewDirty = true;
    }
    // ── files ── a file that holds an older copy than the one known gets the known one back.
    if (settings.apply) for (const t of stale) touched.add(t);
    for (const { dev } of got.snaps) meta.snaps[dev] = got.snapKeys[dev];
    if (result.partSeen.length) { if (!meta.partSeen || typeof meta.partSeen !== 'object') meta.partSeen = {}; for (const { dev, h } of result.partSeen) meta.partSeen[dev] = h; }
    for (const [id, offs] of Object.entries(got.offsets)) meta.offsets[id] = { ...(meta.offsets[id] || {}), ...offs };
    meta.bad = got.bad;
    meta.hlc = clock.peek();
    if (got.ops.length || got.snaps.length || (got.parts || []).length) metaDirty = true;

    // c) the merged data: synced files are written after the state commit
    const stateTops = [...touched].filter(t => !t.startsWith(FILE_PREFIX));
    // The registry first: a snapshot's owner (and so mirror or not) follows the merged account list.
    const fileTops = [...touched].filter(t => t.startsWith(FILE_PREFIX) && fileSpecFor(t)).sort((a, b) => (b === ACCOUNTS_TOP) - (a === ACCOUNTS_TOP));
    if (!touched.size) { await saveMetaSoon(); return { next: null, result }; }
    const fps = {};
    for (const top of fileTops) {
      const f = fileSpecFor(top);
      if (keepsLocal(f.rel)) continue;   // ── files ── too big to sync: this computer's copy stays as it is
      const cur2 = await host.data.readJson(f.rel).catch(() => null);
      const mirror = !publishes(f);   // not ours to publish: an exact copy of the fetcher's
      const m = mirror ? materializeFile(top, f.spec, undefined, false, tree) : materializeFile(top, f.spec, cur2 && cur2.value, !!(cur2 && cur2.present), tree);
      result.fileWrites.push({ rel: f.rel, present: m.present, value: m.value, had: !!(cur2 && cur2.present) });
      if (top === ACCOUNTS_TOP) setRoles(m.present ? m.value : null);
      fps[top] = fileFp(m);
    }
    const next = stateTops.length ? materialize(cur, tree, stateTops) : null;
    // ── health ── one line of the feed: who changed what, in words (no new log: the registers the merge has)
    if (result.won.length) { try { result.feed = describeApplied(result.won, { before: cur, after: next || cur }); } catch { result.feed = null; } }
    result.won = [];
    if (blobs && next) blobs.noteState(next);
    const names = [...result.from].filter(d => d !== device.deviceId).map(d => (peers.get(d) || {}).name || 'another device');
    opts.client = [...new Set(names)].join(', ').slice(0, 80) || 'another device';
    opts.summary = `${result.received} change${result.received === 1 ? '' : 's'} from ${opts.client}`;
    if (resolving.length && !result.received) { opts.client = 'Sync review'; opts.summary = `kept the other version of ${resolving.length} clash${resolving.length === 1 ? '' : 'es'}`; }
    await savePending(syncedFingerprint(next || cur), fps);
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
      const res = applyWrite(merged, p, r, (c) => { if (p[p.length - 1] !== '@pos' && decodeHlc(c.lost.h).wall !== 0 && reviewable(p[0])) conflicts++; });
      if (res === 'won') { touched.add(p[0]); changes++; from.add(devOf(r.h)); }
    }
    const next = materialize(cur, merged, [...touched].filter(t => !t.startsWith(FILE_PREFIX)));
    const byId = (arr) => new Map((Array.isArray(arr) ? arr : []).filter(t => t && t.id != null).map(t => [String(t.id), t]));
    const a = byId(cur.custom), b = byId(next.custom);
    const added = [], removed = [], changed = [];
    for (const [id, t] of b) {
      const o = a.get(id);
      if (!o) added.push({ id, title: String(t.title || '').slice(0, 80) });
      else if (stable(o) !== stable(t)) changed.push({ id, title: String(t.title || '').slice(0, 80), fields: [...new Set([...Object.keys(o), ...Object.keys(t)])].filter(k => stable(o[k]) !== stable(t[k])).slice(0, 10) });
    }
    for (const [id, t] of a) if (!b.has(id)) removed.push({ id, title: String(t.title || '').slice(0, 80) });
    const keys = [...touched].filter(k => k !== 'custom' && (k.startsWith(FILE_PREFIX) || stable(cur[k]) !== stable(next[k])));
    st.preview = {
      at: now(), changes, conflicts, from: [...from].filter(d => d !== device.deviceId).map(d => (peers.get(d) || {}).name || 'another device'),
      tasks: { added: added.length, removed: removed.length, changed: changed.length }, keys,
      sample: { added: added.slice(0, 5), removed: removed.slice(0, 5), changed: changed.slice(0, 5) },
    };
    await L.write('shadow-report.json', JSON.stringify({ ...st.preview, added, removed, changed }, null, 1)).catch(() => {});
    log('info', `sync (shadow): applying would change ${added.length} new, ${changed.length} changed, ${removed.length} removed tasks and ${keys.length} other areas (${changes} fields, ${conflicts} clashes); nothing was changed`);
  }

  // ─── The folder itself: still where it was? ── health ────────────────
  /** Has this computer synced through this folder before? (then an empty place there is news, not a start) */
  const hadHistory = () => !!(meta && meta.joined && device && (meta.seq > 0 || Object.keys(meta.frontier || {}).some(d => d !== device.deviceId)));
  /**
   * 'ok' | 'moved-root' (the OpenDash Sync folder is gone) | 'moved-own' (only an
   * OpenDash Sync of devices this computer does not know is there) | 'rewrite'
   * (this computer's own files went missing, the others are there) | 'no-folder'.
   */
  async function placeCheck() {
    if (!ad || typeof ad.rootState !== 'function') return 'ok';
    const rs = await ad.rootState().catch(() => null);
    if (rs === 'no-folder') return 'no-folder';
    if (!hadHistory() || allowFresh) return 'ok';
    if (rs === 'no-root') return 'moved-root';
    if (rs !== 'no-own') return 'ok';
    const ids = await ad.listDevices().catch(() => []);
    const known = new Set([...Object.keys(meta.frontier || {}), ...(sec() && e2e.group ? e2e.status().members : []), ...peers.keys()]);
    known.delete(device.deviceId);
    return ids.some(id => known.has(id)) ? 'rewrite' : 'moved-own';
  }
  /** ad.ready(), except that it never makes a new OpenDash Sync folder where this computer's one went missing. */
  async function readyHere() {
    const p = await placeCheck().catch(() => 'ok');
    if (p === 'moved-root' || p === 'moved-own') return false;
    return ad.ready();
  }
  /** The folder went missing: say so plainly, look for where it went, write nothing. */
  async function noteMoved(kind) {
    const cloud = cloudName();
    if (typeof host.findSyncFolders === 'function' && now() - movedCands.at > 60000) {
      const ids = [device.deviceId, ...Object.keys(meta.frontier || {}), ...(sec() && e2e.group ? e2e.status().members : [])];
      let list = [];
      try { list = (await host.findSyncFolders([...new Set(ids)], { current: settings.folder })) || []; } catch { list = []; }
      movedCands = { at: now(), list: list.slice(0, 5) };
    }
    st.moved = { kind, at: st.moved && st.moved.kind === kind ? st.moved.at : now(), candidates: movedCands.list };
    setState('error', kind === 'root'
      ? `The OpenDash Sync folder is not in ${cloud} any more (${settings.folder}). It may have been moved, renamed or deleted, or ${cloud} is signed in to a different account. Nothing is written until you choose what to do: Settings > Sync > Health.`
      : `The OpenDash Sync folder in ${cloud} holds none of your devices. ${cloud} may be signed in to a different account. Nothing is written until you choose what to do: Settings > Sync > Health.`);
    emitPass();
  }

  // ─── One sync pass ───────────────────────────────────────────────────
  async function pass(reason) {
    if (!active) return null;
    const t0 = now();
    // ── relay ── the person's relay changed (Connect Cloudflare here, or relays.json from another
    // device), or arrived: this computer moves to it. What it knows is kept (the same sync).
    if (typeof host.refreshRelayInfo === 'function') await host.refreshRelayInfo().catch(() => {});
    // ── relay carry-over ── the person syncs through their relay (chosen on another computer, or it is
    // their own): this computer does too, the folder kept alongside as a backup. Settings > Sync says so once, with Undo.
    if (relayAutoWanted()) {
      settings.relay = true; settings.relayAutoAt = now();
      await saveSettings().catch(() => {});
      log('info', 'sync: this computer now syncs through your relay too (the folder stays as a backup)');
    }
    const wantOrigin = usesRelay() ? relayOrigin() : null;
    if (wantOrigin !== ((ad && ad.origin) || null) && !reactivating) {
      reactivating = true; keepPlace = true;
      setTimeout(() => { reactivating = false; activate().catch((e) => { st.lastError = errMsg(e); setState('error', `Sync could not start: ${plainError(e)}.`); }); }, 0);
      return null;
    }
    // The link's origin was only for joining: the synced home relay takes over once it is here.
    if (settings.relayOrigin && e2e && e2e.ready) { const r = relayInfo(); if (r && r.usable && r.origin) { settings.relayOrigin = null; await saveSettings().catch(() => {}); } }
    const eventAt = firstEventAt;   // when the watcher first heard of this change (latency)
    firstEventAt = null;
    // ── health ── the OpenDash Sync folder gone from a cloud folder this computer synced
    // through (moved, renamed, deleted, or the cloud drive signed in to another account):
    // never start again in an empty place by itself; Settings > Sync > Health asks.
    const place = await placeCheck();
    if (place === 'moved-root' || place === 'moved-own') { await noteMoved(place === 'moved-root' ? 'root' : 'own'); return null; }
    // Only this computer's own files went missing; the others are there: write ours again.
    if (place === 'rewrite') ownRewrite = true;
    if (!(await ad.ready())) {
      setState('waiting', `Waiting for ${cloudName()}: the folder ${settings.folder} is not there. Is ${cloudName()} running and signed in?`);
      return null;
    }
    if (st.moved) st.moved = null;
    if (ownRewrite) { lastHeartbeat = 0; log('warn', `sync: this computer's files in ${cloudName()} went missing; writing them again`); }
    await checkIdentity();
    startWatcher();
    const listing = await listAll();
    lastListing = listing;
    if (sec()) {
      // Encrypted sync: the keys, the members and pairing first. Without the
      // key nothing is sent or taken in; the status says what is needed.
      await e2e.refresh(ad, listing);
      // ── relay ── the join link follows the join code (opened, closed after 2 minutes or when done).
      if (typeof ad.joinTick === 'function') await ad.joinTick(e2e.status().joinCode).catch(() => {});
      if (e2e.deviceId !== device.deviceId) {
        // Came back as a new device (after a removal): a new folder, a new watcher.
        await switchIdentity(e2e.deviceId);
        if (unwatch) { unwatch(); unwatch = null; }
        await activateCore();
        schedule('again', 30);
        return null;
      }
      await adoptOwnName();
      if (!e2e.ready) {
        await readPeers(listing);
        st.plainFrom = listing.filter(x => isPlainPeer(x.id, x.files)).map(x => x.id);
        st.locked = e2e.reason;
        await heartbeat();
        lockedState();
        emitPass();
        return { locked: e2e.reason };
      }
      st.locked = null;
      if (meta.join === null) {
        // First pass with the key: join at the floor when other members already sync here.
        meta.join = listing.some(x => x.id !== device.deviceId && e2e.member(x.id) && (x.files.snapshot || x.files.logs.some(l => l.size > 0)));
      }
    }
    st.groupSeen = listing.some(x => x.id !== device.deviceId && x.files.keys);
    const got = await gather(listing);
    if (roleMove) { const m = roleMove; roleMove = null; await moveRoles(m.from, m.to).catch(() => {}); }
    await readRoles();
    const files = await fileList();
    // Changed here since the last pass? The state's stamp plus the synced files' stamps.
    const fileStamps = await Promise.all(files.map(f => host.data.stamp(f.rel)));
    const stamp = [await host.stateStamp(), ...fileStamps].join('|');
    const applyPending = settings.apply && !!remoteTree.k;
    const localMaybe = localDirty || stamp !== lastStamp || !meta.joined || applyPending;
    st.waitingLines = got.waitingLines; st.waitingFrom = got.waitingFrom; st.rejected += got.rejected; st.encrypted = got.encrypted;
    st.waitingKey = got.waitingKey; st.tampered += got.tampered; st.refused += got.refused; st.duplicates += got.duplicates; st.plainFrom = [...got.plainFrom];
    st.liveReceived += got.live;
    if (got.waitingKey) waitingKeySince = waitingKeySince || now(); else waitingKeySince = null;
    if (got.tampered) { tamperedAt = now(); log('warn', `sync: ${got.tampered} record(s) in the folder failed their check and were ignored`); }
    if (!got.ops.length && !got.snaps.length && !(got.parts || []).length && !localMaybe) {
      meta.bad = got.bad;
      for (const [id, offs] of Object.entries(got.offsets)) meta.offsets[id] = { ...(meta.offsets[id] || {}), ...offs };
      rereadDone(got);
      await finishPass();
      return { idle: true };
    }
    localDirty = false;
    const tRead = now();
    const opts = { source: 'sync', client: null, summary: null };
    let r;
    // The synced files stay locked from reading them to writing the merge, so
    // a change by the accounts code or a fetch in between is not lost (it
    // waits, then the next pass captures it). Hosts without locks run as is.
    const locked = (fn) => (typeof host.data.withLocks === 'function' ? host.data.withLocks(files.map(f => f.rel), fn) : fn());
    try {
      r = await locked(async () => {
        const r1 = await store.mutate((cur) => mutateFn(cur, got, opts, files, fileStamps), opts);
        const res0 = r1 && r1.result;
        for (const w of (res0 && res0.fileWrites) || []) {
          if (w.present) await host.data.writeJson(w.rel, w.value);
          else if (w.had) await host.data.remove(w.rel);
        }
        return r1;
      });
      await promotePending();
      rereadDone(got);
      inFlight = [];
      for (const [rel, s] of passCapStamps) { if (s) capStamps.set(rel, s); else capStamps.delete(rel); }
    } catch (e) {
      capStamps.clear();
      if (inFlight.length) { resolutions.unshift(...inFlight); inFlight = []; }
      // Nothing of this pass is kept in memory: back to what is on disk (the
      // lines it read are read again next time; merging twice is harmless).
      const seq = meta.seq;
      await loadMeta();
      if (!meta) meta = freshMeta(ad.where);
      meta.seq = Math.max(meta.seq, seq);
      ad.forget();
      throw e;
    }
    lastStamp = [await host.stateStamp(), ...await Promise.all((await fileList()).map(f => host.data.stamp(f.rel)))].join('|');
    const res = r && r.result;
    // ── blobs ── the catalogue came in: pictures and clips asked for may be in the folder now.
    if (blobs && res && res.fileWrites.some(w => w.rel === BLOBS_REL)) blobs.catalogueChanged();
    const tDone = now();
    if (res) {
      if (res.sent) { st.lastSentAt = tDone; st.io.lastWriteAt = tDone; st.io.error = null; }
      // ── health ── "What changed": one line per pass (bursts from the same device fold into one)
      if (res.feed && res.feed.length) {
        const from = [...res.from].filter(d => d !== device.deviceId).map(peerName);
        if (feed.add({ at: tDone, from, groups: res.feed, live: got.live > 0 })) { feedDirty = true; await saveFeed(); }
      }
      res.feed = null;
      if (res.received) {
        st.lastReceivedAt = tDone;
        st.preview = null;
        st.lastApply = { reason, ops: got.ops.length, snapshots: got.snaps.length, writes: res.received, files: res.fileWrites.length, version: r.version, eventToCommitMs: eventAt ? tDone - eventAt : null, readMs: tRead - t0, applyMs: tDone - tRead };
        const fileRels = res.fileWrites.map(w => w.rel);
        for (const fn of listeners) { try { fn({ ...st.lastApply, fileRels, at: tDone }); } catch { /* a listener never breaks sync */ } }
        log('info', `sync: ${res.received} change${res.received === 1 ? '' : 's'} from ${res.from.size} device${res.from.size === 1 ? '' : 's'}${res.fileWrites.length ? ` (+${res.fileWrites.length} file${res.fileWrites.length === 1 ? '' : 's'})` : ''} (${tDone - t0} ms)`);
        if (res.fileWrites.some(w => w.rel === 'accounts.json' || w.rel === 'roles.json')) await readRoles();
      }
      await saveConflicts(res.conflicts);
    }
    await finishPass();
    return res;
  }
  async function finishPass() {
    if (previewDirty && !settings.apply) await buildPreview();
    await heartbeat();
    // ── health ── own files written again after they went missing, or "Compact now": a fresh snapshot
    const rewrite = ownRewrite, compact = forceCompact;
    ownRewrite = false; forceCompact = false;
    // ── 2.17.1 ── another device was updated: a fresh snapshot (it carries what an older version dropped)
    const soon = snapSoon && (!sec() || e2e.ready);
    if (soon) snapSoon = false;
    await maybeSnapshot(rewrite || compact || soon, { keepDays: compact ? COMPACT_KEEP_DAYS : LOG_KEEP_DAYS });
    if (rewrite) { st.rewroteOwnAt = now(); log('info', 'sync: this computer\'s sync files were written again (a fresh snapshot)'); }
    await pruneRemoved(lastListing).catch((e) => log('warn', `sync: could not tidy a removed device's files (${errMsg(e)})`));
    measure(lastListing);
    await blobWork();
    await saveMetaSoon();
    ok();
    emitPass();
  }
  async function saveFeed() {
    if (!feedDirty) return;
    feedDirty = false;
    await L.write('changes.json', JSON.stringify(feed.toJSON())).catch(() => {});
  }

  // ─── Sizes, progress, tidying ── health ──────────────────────────────
  /**
   * What the folder holds and how far this computer has read the others:
   * st.storage {total, mine: {bytes, logs, logBytes, snapshot, lastSnapshotAt,
   * sinceSnapshot, oldLogs}, devices: [{name, bytes, removed}]} and st.transfer
   * {in: {read, total, from}, out: {bytes, seq, peers: [{name, seen, pct, lastSeen}]}}.
   * From the listing the pass already made: no extra reads.
   */
  function measure(listing) {
    if (!listing || !device || !meta) return;
    const removed = new Set(sec() && e2e.group ? e2e.status().removed : []);
    const cutoff = new Date(now() - LOG_KEEP_DAYS * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    const devs = [];
    let total = 0, inRead = 0, inTotal = 0;
    const inFrom = [];
    let mine = null;
    for (const { id, files } of listing) {
      const logBytes = files.logs.reduce((a, l) => a + l.size, 0);
      const snap = files.snapshot ? files.snapshot.size : 0;
      const bytes = logBytes + snap + ['device', 'keys', 'pair'].reduce((a, k) => a + (files[k] ? files[k].size : 0), 0);
      total += bytes;
      if (id === device.deviceId) {
        mine = { bytes, logs: files.logs.length, logBytes, snapshot: snap, lastSnapshotAt: meta.lastSnapshotAt || null, sinceSnapshot: meta.bytesSinceSnapshot || 0, oldLogs: files.logs.filter(l => { const m = LOG_NAME_RE.exec(l.name); return m && m[1] < cutoff; }).length };
        continue;
      }
      devs.push({ name: peerName(id), bytes, removed: removed.has(id) });
      if (!readsFrom(id) || removed.has(id)) continue;
      const offs = meta.offsets[id] || {};
      let read = 0, all = 0;
      for (const l of files.logs) { all += l.size; read += Math.min(l.size, offs[l.name] || 0); }
      if (files.snapshot) { all += snap; if (meta.snaps[id] === `${files.snapshot.size}:${files.snapshot.mtimeMs}`) read += snap; }
      inRead += read; inTotal += all;
      if (all - read > 0) inFrom.push({ name: peerName(id), read, total: all });
    }
    st.storage = { total, mine, devices: devs.sort((a, b) => b.bytes - a.bytes).slice(0, 20), at: now() };
    const outPeers = [];
    if (sec() && meta.seq > 0) {
      for (const d of knownDevices()) {
        if (d.me) continue;
        const p = peers.get(d.deviceId);
        const seen = p && p.seen ? (p.seen[device.deviceId] || 0) : null;
        if (seen === null || seen >= meta.seq) continue;
        outPeers.push({ name: d.name, seen, pct: Math.max(0, Math.min(99, Math.floor((seen / meta.seq) * 100))), lastSeen: d.lastSeen || null });
      }
    }
    st.transfer = {
      in: inTotal - inRead > 0 ? { read: inRead, total: inTotal, from: inFrom.slice(0, 5) } : null,
      out: outPeers.length ? { bytes: mine ? mine.bytes : 0, seq: meta.seq, peers: outPeers.slice(0, 5) } : null,
    };
  }
  /**
   * A device that was REMOVED keeps its files in the folder; nobody reads what
   * it wrote after its removal. Once it has been removed and quiet for a week,
   * and this computer has written a snapshot since (it carries everything
   * that device had shared), its files go. One device does it: the one that
   * removed it (or, when that one is gone too, the member with the smallest id).
   */
  async function pruneRemoved(listing) {
    if (!listing || !sec() || !e2e.ready || !ad || typeof ad.pruneDevice !== 'function' || now() < pruneCheckAt) return;
    pruneCheckAt = now() + 60 * 60 * 1000;
    const s = e2e.status();
    for (const id of s.removed || []) {
      const entry = listing.find(x => x.id === id);
      if (!entry || id === device.deviceId) continue;
      const info = e2e.removedInfo(id) || {};
      const at = Date.parse(info.at || '') || 0;
      if (!at || now() - at < PRUNE_AFTER_MS || !meta.lastSnapshotAt || meta.lastSnapshotAt < at) continue;
      const f = entry.files;
      const newest = Math.max(0, ...f.logs.map(l => l.mtimeMs), ...['snapshot', 'device', 'keys', 'pair'].map(k => (f[k] ? f[k].mtimeMs : 0)));
      if (now() - newest < PRUNE_AFTER_MS) continue;                 // it still writes there (a removed computer left on)
      const remover = info.by && e2e.member(info.by) ? info.by : [...(s.members || [])].sort()[0];
      if (remover !== device.deviceId) continue;
      if (await ad.pruneDevice(id)) {
        st.pruned = [{ at: now(), name: peerName(id) }, ...st.pruned].slice(0, 10);
        log('info', 'sync: deleted the sync files of a device that was removed from sync');
      }
    }
  }
  /** "Compact now": a fresh snapshot; this computer's own logs older than a week that it covers go. */
  async function compactNow() {
    await ensureLoaded();
    if (!active) throw badRequest('Sync is off on this computer.', 'SYNC_OFF');
    forceCompact = true;
    localDirty = true;
    await syncNowInner();
    return status();
  }
  function diskFull() {
    st.diskFull = { at: (st.diskFull && st.diskFull.at) || now() };
    pauseUntil = now() + DISK_FULL_RETRY_MS;
  }
  function emitPass() { for (const fn of passListeners) { try { fn(); } catch { /* a listener never breaks sync */ } } }

  async function checkIdentity() {
    const mine = await ad.readJson(device.deviceId, 'device.json', 256 * 1024);
    if (mine && mine.instance && mine.instance !== device.instance) {
      // Another installation is using this device's id (a copied settings
      // folder): take a new one and join again, so the two never write the same files.
      if (sec()) {
        // Encrypted: a new key pair too (a copy must not share one); it must be added again.
        await serial(() => e2e.reset()).catch(() => e2e.reset());
        await switchIdentity(e2e.deviceId);
        log('warn', 'sync: new device identity (another installation was using the same device id)');
      } else await newIdentity('another installation was using the same device id');
      await activateCore();
    }
  }

  let heartbeatKid = null, lastPartSent = null, lastRlySent = null;
  async function heartbeat(force = false) {
    if (!ad || !device || !meta) return;
    // ── relay carry-over ── the person's relay record changed here: the others hear it now, not in 2 minutes
    if (sec() && e2e.ready && meta.joined) {
      const part = personPart(), ri = relayInfo();
      const o = ri && ri.source === 'friends' && ri.origin ? ri.origin : null;
      if ((part ? part.h : null) !== lastPartSent || o !== lastRlySent) force = true;
    }
    const kidChanged = sec() && e2e.currentKid !== heartbeatKid;
    const extraNow = sec() && extraDirty && e2e.ready;
    const capsNow = capsDirty && (!sec() || e2e.ready);
    const presNow = presDirty && (!sec() || e2e.ready) && now() - lastPresWrite >= PRES_MIN_MS - 100;
    if (!force && !kidChanged && !extraNow && !capsNow && !presNow && now() - lastHeartbeat < HEARTBEAT_MS) return;
    if (pauseUntil && now() < pauseUntil) return;          // ── health ── the disk is full: write nothing
    if (!(await readyHere().catch(() => false))) return;
    lastHeartbeat = now();
    if (!sec() || e2e.ready) { presDirty = false; lastPresWrite = now(); }
    const plain = { instance: device.instance, app: appVersion, fetch: background ? 'background' : 'foreground', lastSeen: new Date(now()).toISOString() };
    // fetcherId: the id an account's `fetcher` names this device by (encrypted with the name when sync is).
    const capsOut = myCaps ? { caps: { ...myCaps, apply: !!settings.apply, background } } : {};
    // ── presence ── a page open here (refreshed while it is), and the goodbye of a clean stop.
    const presOut = { ...(myPage ? { page: { open: !!myPage.open, at: myPage.open ? now() : myPage.at } } : {}), ...(stoppedAt ? { stoppedAt } : {}) };
    let info = { name: deviceName(), ...plain, fetcherId: myFid(), seq: meta.seq, ...capsOut, ...presOut };
    if (!sec() || e2e.ready) capsDirty = false;
    if (sec()) {
      // The folder sees when this device was last here; its name, kind and
      // progress are encrypted, and so are its live-sync addresses and claims.
      heartbeatKid = e2e.currentKid;
      if (e2e.ready) extraDirty = false;
      // ── relay carry-over ── the person's relay (address and role) and its record, sealed with the rest
      const ri = relayInfo();
      const rly = ri && ri.source === 'friends' && ri.origin ? { o: ri.origin, r: ri.role === 'owner' ? 'owner' : 'member' } : null;
      const part = e2e.ready ? personPart() : null;
      lastPartSent = part ? part.h : null; lastRlySent = rly ? rly.o : null;
      info = await e2e.sealDevice(plain, { name: deviceName(), kind, seen: seenVector(), seq: meta.seq, fetcherId: myFid(), ...(deviceExtra ? { live: deviceExtra } : {}), ...capsOut, ...presOut, ...(rly ? { rly } : {}), ...(part ? { part: part.data } : {}) });
    }
    await ad.writeDevice(info).then(() => { st.io.lastWriteAt = now(); if (st.io.error) st.io.error = null; }).catch((e) => {
      log('warn', `sync: could not write device.json (${errMsg(e)})`);
      st.io.error = (e && e.code) || 'write'; st.io.errorAt = now();
      if (e && e.code === 'ENOSPC') diskFull();
    });
  }

  async function maybeSnapshot(force = false, { keepDays = LOG_KEEP_DAYS } = {}) {
    // Encrypted sync: a new key means a new snapshot with it (records a device
    // wrote with the old key after a removal are refused; this brings them back).
    const newKey = sec() && e2e.ready && (meta.snapKid !== e2e.currentKid || !meta.snapSigned) && (meta.seq > 0 || tree.k);
    const due = force || newKey || meta.bytesSinceSnapshot >= SNAPSHOT_BYTES || (meta.seq > meta.snapSeq && now() - meta.lastSnapshotAt > SNAPSHOT_MS) || (meta.seq > 0 && !meta.lastSnapshotAt);
    if (!due) return;
    const covers = await ad.logSizes();
    let snap = { v: 1, dev: device.deviceId, seq: meta.seq, hlc: clock.peek(), seen: seenVector(), covers, createdAt: new Date(now()).toISOString(), data: serializeTree(tree) };
    if (sec()) { if (!e2e.ready) return; snap = await e2e.sealSnapshot(snap); meta.snapKid = e2e.currentKid; meta.snapSigned = true; }
    await ad.writeSnapshot(snap);
    meta.lastSnapshotAt = now(); meta.bytesSinceSnapshot = 0; meta.snapSeq = meta.seq;
    if (sec() && meta.oldIds && meta.oldIds.length && typeof ad.removeOldDevice === 'function') {
      // Moved to encrypted sync under a new id: everything is now in the
      // encrypted snapshot, so the old unencrypted files go.
      for (const old of meta.oldIds) await ad.removeOldDevice(old).catch(() => {});
      meta.oldIds = [];
      log('info', 'sync: removed this device\'s unencrypted sync files');
    }
    // Own logs older than LOG_KEEP_DAYS that the snapshot fully covers can go:
    // a device that never read them gets the same registers from the snapshot.
    const cutoff = new Date(now() - keepDays * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    for (const [n, size] of Object.entries(covers)) { const m = LOG_NAME_RE.exec(n); if (m && m[1] < cutoff) await ad.removeOwnLog(n, size); }
    await saveMeta();
  }

  // ─── Scheduling ──────────────────────────────────────────────────────
  // Circuit breaker: whatever goes wrong (a storm of file events, a pass that
  // keeps asking for another), sync never takes more than a trickle of CPU.
  // Past 20 passes in 2 s it waits for the next poll and says so once.
  const recentPasses = [];
  let throttled = false, throttleRetry = null;
  function run(reason) {
    if (!active) return Promise.resolve(null);
    // ── health ── the disk is full: nothing is written until it has room again (one try a minute, or "Try again")
    if (pauseUntil && now() < pauseUntil && reason !== 'now') return running || Promise.resolve(null);
    const t = Date.now();
    while (recentPasses.length && recentPasses[0] < t - 2000) recentPasses.shift();
    if (recentPasses.length >= 20 && reason !== 'poll' && reason !== 'now' && reason !== 'apply-switch') {
      if (!throttled) { throttled = true; log('warn', `sync: too many passes in a short time; waiting a moment`); }
      // Pending work (a live record, a local edit) runs when the 2 s window ends, not at the next poll.
      if (!throttleRetry) { throttleRetry = setTimeout(() => { throttleRetry = null; run('throttled'); }, Math.max(50, 2000 - (t - recentPasses[0]))); if (typeof throttleRetry.unref === 'function') throttleRetry.unref(); }
      return running || Promise.resolve(null);
    }
    if (reason === 'poll' || reason === 'throttled') throttled = false;
    if (running) { again = true; return running; }
    recentPasses.push(t);
    running = (async () => {
      try { return await serial(() => pass(reason)); }
      catch (e) {
        st.lastError = errMsg(e);
        const code = e && e.code;
        if (['EPERM', 'EACCES', 'EROFS', 'ENOSPC', 'EBUSY'].includes(code)) { st.io.error = code; st.io.errorAt = now(); }
        if (code === 'ENOSPC') {
          // ── health ── stop writing (a half-written file helps nobody) and say so
          diskFull();
          setState('error', 'Sync stopped writing: the disk is full. Free some space on this computer; sync tries again every minute, or click Try again.');
        } else setState('error', `Sync paused: ${plainError(e)}. It tries again in a few seconds.`);
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
    if (debounce && typeof debounce.unref === 'function') debounce.unref();
  }
  /**
   * Cloud clients do not always raise change events when they download a
   * file, so the poll is the safety net; the watcher only makes it fast.
   */
  let watchFailed = false;
  function startWatcher() {
    if (!watch || unwatch || watchFailed || !active || typeof ad.watch !== 'function') return;
    try {
      unwatch = ad.watch(
        () => { if (!firstEventAt) firstEventAt = now(); schedule('watch', 40); },
        () => { unwatch = null; },   // the folder went away: the poll waits for it, then a new watcher starts
      );
    } catch (e) { unwatch = null; watchFailed = true; log('info', `sync: cannot watch the folder (${errMsg(e)}); checking every ${Math.round(pollMs / 1000)} s`); }
  }

  // ─── Status ──────────────────────────────────────────────────────────
  const cloudName = () => (settings.folder ? host.folderLabel(settings.folder) : usesRelay() ? 'your relay' : 'the sync folder');
  // ── relay ── (lib/sync/relay.mjs) the person's relay: from their synced home relay
  // (host.relayInfo: <data>/friends/relays.json), or the origin a join link brought.
  const relayInfo = () => { try { return (typeof host.relayInfo === 'function' && host.relayInfo()) || null; } catch { return null; } };
  function relayOrigin() {
    const r = relayInfo();
    const synced = r && r.usable ? r.origin : null;
    // While joining with a link, the link's relay; afterwards the person's synced one.
    if (settings.relayOrigin && (!synced || !(e2e && e2e.ready))) return settings.relayOrigin;
    return synced || settings.relayOrigin || null;
  }
  const usesRelay = () => !!(settings.relay && relayOrigin());
  const hasPlace = () => !!(settings.folder || usesRelay());
  let keepPlace = false, reactivating = false, linkClashAt = 0;
  const isLivePeer = (id) => { if (!livePeersFn) return false; try { const l = livePeersFn(); return !!(l && typeof l.has === 'function' && l.has(id)); } catch { return false; } };
  function joinEvent(ev) {
    if (!ev || ev.type !== 'clash' || !e2e) return;
    linkClashAt = now();
    // "Someone else tried this link": the computer showing the code stops it; the new one stops trying.
    serial(() => (ev.role === 'guest' ? e2e.codeCancel() : e2e.codeAbort('clash'))).then(() => run('now')).catch(() => {});
  }
  function relayStatus() {
    const info = relayInfo();
    const origin = relayOrigin();
    let hostName = null;
    try { hostName = origin ? new URL(origin).host : null; } catch { hostName = null; }
    let r = null;
    try { r = ad && typeof ad.relayStatus === 'function' ? ad.relayStatus() : null; } catch { r = null; }
    let hasKey = false;
    try { hasKey = typeof host.relayHasKey === 'function' ? !!host.relayHasKey() : false; } catch { hasKey = false; }
    return {
      available: !!origin, host: hostName, source: settings.relayOrigin && origin === settings.relayOrigin ? 'link' : info ? info.source : null,
      role: info ? info.role : null, usable: info ? !!info.usable : !!settings.relayOrigin, hasKey,
      // its address answers inside this network (lib/relay/public.mjs): never used, and said so
      private: !!(info && info.private), privateHost: info && info.private ? (() => { try { return new URL(info.origin).host; } catch { return null; } })() : null,
      on: !!settings.relay, transport: !settings.enabled ? null : settings.folder && usesRelay() ? 'both' : usesRelay() ? 'relay' : settings.folder ? 'folder' : null,
      ...(r ? { state: r.state, enrolled: r.enrolled, lastOkAt: r.lastOkAt, lastError: r.lastError, retryAt: r.retryAt, outbox: r.outbox, quota: r.quota, tooBig: r.tooBig, link: r.link, diverged: r.diverged, reading: r.reading || null } : {}),
      devices: r && r.devices || [], presenceAt: r && r.presenceAt || 0,
      linkClashAt: linkClashAt || null, lastFolder: settings.lastFolder || null,
      // ── relay carry-over ── (2.17.1) the person's relay as far as this computer knows (here, or what
      // another of their devices uses), what this computer still lacks to use it ('key': the key to it,
      // 'record': its record, 'private', 'scope', 'choose'), the choice for all computers, and "turned on here by itself".
      person: personRelay(), missing: relayMissing(info, hasKey), choice: info && typeof info.syncAll === 'boolean' ? info.syncAll : null,
      off: !!settings.relayOff, autoAt: settings.relay && settings.relayAutoAt ? settings.relayAutoAt : null,
    };
  }
  function relayMissing(info, hasKey) {
    if (info && info.private) return 'private';
    // 'choose': a friend's relay that allows device sync but was not chosen for it (Settings > Your relay,
    // lib/sync/relay-node.mjs: never by itself); 'scope': one that allows messages only.
    if (info && info.origin && !info.usable) return info.role === 'member' && (info.scopes || []).some(s => s === 'sync' || s === 'device-sync') ? 'choose' : 'scope';
    const person = personRelay();
    if (!person && !info) return null;
    if (!hasKey) return 'key';
    if (!info || !info.origin) return 'record';
    return null;
  }
  function plainError(e) {
    const c = e && e.code;
    if (c === 'EPERM' || c === 'EACCES' || c === 'EBUSY') return `${cloudName()} is holding a file (it may be busy uploading)`;
    if (c === 'ENOSPC') return 'the disk is full';
    if (c === 'ENOENT') return `a file in ${cloudName()} went missing`;
    // macOS File Provider (and an offline OneDrive on Windows): a file that is still online-only cannot be read yet
    if (c === 'EDEADLK' || c === 'ETIMEDOUT' || c === 'ECANCELED' || c === 'EAGAIN' || c === 'ENOTCONN') return `${cloudName()} is still downloading some files (they are online-only on this computer)`;
    if (c === 'EROFS') return `the sync folder is read-only`;
    if (c === 'LOCK_TIMEOUT') return 'the dashboard was busy saving';
    return 'something went wrong reading or writing the sync folder';
  }
  function setState(state, message) { st.state = state; st.message = message; }
  const peerName = (id) => (sec() && e2e.nameOf(id)) || (peers.get(id) || {}).name || 'another device';
  const minutes = (ms) => { const m = Math.round(ms / 60000); return m < 90 ? `${m} minute${m === 1 ? '' : 's'}` : `${Math.round(m / 60)} hours`; };
  /** Encrypted sync without the key: what this device needs, in plain words. */
  function lockedState() {
    st.lastSyncAt = st.lastSyncAt || null;
    const s = e2e.status();
    const cloud = cloudName();
    if (s.reason === 'removed') {
      const r = e2e.removedInfo(device.deviceId) || {};
      return setState('locked', `This computer was removed from sync${r.by ? ` by ${peerName(r.by)}` : ''}. It keeps what it had, but gets nothing new. To sync here again, join it to your other computer again: there, open Settings > Sync and press Add a computer.`);
    }
    if (s.reason === 'not-joined') {
      const p = s.pairing, jc = s.joinCode;
      if (jc && jc.role === 'join' && jc.step === 'looking') return setState('locked', `Looking for the code from your other computer in ${cloud}. If it does not turn up within a minute, ${cloud} may still be bringing it.`);
      if (jc && jc.role === 'join' && jc.step === 'sent') return setState('locked', `Checking the code with your other computer (through ${cloud}). This takes a few seconds, sometimes a minute.`);
      if (p && p.role === 'join' && p.step === 'waiting') return setState('locked', `Waiting for ${cloud} to finish uploading this computer's request. Then, on your other computer, open OpenDash > Settings > Sync.`);
      if (s.found.groups) return setState('locked', `Found your synced data in ${cloud}. To join this computer: on your other computer, open Settings > Sync and press Add a computer, then type the 4 letters it shows here.`);
      if (st.plainFrom.length) return setState('locked', `Your other computer (${peerName(st.plainFrom[0])}) syncs without encryption. On it, open Settings > Sync and choose "Encrypt my synced data", then come back here.`);
      return setState('locked', `Looking for your OpenDash sync in ${cloud}... Check that sync is on on your other computer. If ${cloud} is still downloading, this can take a few minutes.`);
    }
    return setState('locked', "This computer can't read the synced data yet. Join it to your other computer: there, open Settings > Sync and press Add a computer.");
  }

  function ok() {
    st.lastSyncAt = now(); st.lastError = null;
    // A pass that finished writes again (unless the heartbeat of this very pass hit the full disk).
    if (st.diskFull && !(st.io.error === 'ENOSPC' && now() - (st.io.errorAt || 0) < 5000)) { st.diskFull = null; pauseUntil = 0; }
    const lag = sec() ? uploadLag() : null;
    if (st.diskFull) setState('error', 'Sync stopped writing: the disk is full. Free some space on this computer; sync tries again every minute, or click Try again.');
    else if (sec() && st.waitingKey) {
      const long = waitingKeySince && now() - waitingKeySince > 2 * 60 * 1000;
      setState(long ? 'locked' : 'waiting', long ? "This computer can't read the newest synced data: your other computers have not caught it up yet. On one of them, open Settings > Sync, press Add a computer and type the 4 letters here." : `Waiting for ${cloudName()} to bring the newest changes.`);
    } else if (sec() && st.plainFrom.length && settings.apply) setState('waiting', `${peerName(st.plainFrom[0])} still syncs without encryption, so its changes are not used. Open OpenDash on it and add it to encrypted sync (Settings > Sync).`);
    else if (lag) setState('waiting', `Waiting for ${cloudName()} to finish uploading: ${lag} has not received this computer's latest changes yet.`);
    else if (sec() && tamperedAt && now() - tamperedAt < TAMPER_SHOW_MS) setState('ok', `Up to date. ${st.tampered} change${st.tampered === 1 ? '' : 's'} in ${cloudName()} did not come from your devices (changed or added by something else) and ${st.tampered === 1 ? 'was' : 'were'} ignored.`);
    else if (st.encrypted && e2e && !settings.e2e && st.groupSeen) setState('waiting', 'Your other computer now encrypts the synced data. To keep syncing here, choose "Encrypt my synced data" below and add this computer.');
    else if (st.encrypted) setState('waiting', 'Another device writes changes this version of OpenDash cannot read yet (encrypted, or a newer format). Update OpenDash here.');
    else if (st.waitingLines) setState('waiting', `Waiting for ${cloudName()} to finish downloading a change from ${(peers.get(st.waitingFrom) || {}).name || 'another device'}.`);
    else if (!settings.apply && st.preview && st.preview.changes) {
      const p = st.preview, t = p.tasks;
      const parts = [t.added && `${t.added} new task${t.added === 1 ? '' : 's'}`, t.changed && `${t.changed} changed`, t.removed && `${t.removed} removed`, p.keys.length && `${p.keys.length} other area${p.keys.length === 1 ? '' : 's'}`].filter(Boolean);
      setState('ok', `Trial mode: ${p.from.join(', ') || 'another device'} has changes waiting (${parts.join(', ') || `${p.changes} small changes`}). Nothing here has been changed yet.`);
    } else setState('ok', settings.apply ? 'Up to date.' : 'Trial mode: nothing from your other devices is waiting.');
  }
  const deviceName = () => (settings.deviceName || host.defaultName || 'This device').slice(0, 60);
  let detectCache = { at: 0, list: [] };
  function detected() {
    if (now() - detectCache.at > 30000) { try { detectCache = { at: now(), list: host.detect() || [] }; } catch { detectCache = { at: now(), list: [] }; } }
    return detectCache.list;
  }

  /**
   * A member that was here well after this device's last change but has not
   * received it: the cloud client has not finished uploading (or the other one
   * downloading). Its name, or null.
   */
  function uploadLag() {
    if (!st.lastSentAt || now() - st.lastSentAt < 3 * 60 * 1000 || !device) return null;
    for (const d of knownDevices()) {
      if (d.me) continue;
      const p = peers.get(d.deviceId);
      if (!p || !p.seen || !p.lastSeen) continue;
      if (p.lastSeen > st.lastSentAt + 3 * 60 * 1000 && (p.seen[device.deviceId] || 0) < meta.seq) return d.name;
    }
    return null;
  }
  function e2eStatus() {
    if (!e2e) return null;
    if (!settings.e2e) return { available: true, on: false };
    const s = e2e.status();
    const r = device ? e2e.removedInfo(device.deviceId) : null;
    return {
      available: true, on: true, ready: s.ready, reason: s.reason, epoch: s.epoch, sheet: s.sheet || 'none',
      found: { ...s.found, plain: st.plainFrom.length }, joined: s.joined,
      pairing: s.pairing, requests: s.requests, offer: s.offer,
      // A join link someone else tried: shown as the clash it is (lib/sync/relay.mjs closes it for both).
      joinCode: s.joinCode && linkClashAt && now() - linkClashAt < 10 * 60 * 1000 && ['cancelled', 'clash', 'failed', 'expired'].includes(s.joinCode.step) ? { ...s.joinCode, step: 'clash' } : s.joinCode,
      removedBy: r ? { name: peerName(r.by), at: r.at } : null,
      waitingKey: st.waitingKey, tampered: st.tampered + s.stats.bad, refused: st.refused, duplicates: st.duplicates,
      plainFrom: st.plainFrom.map(peerName),
    };
  }
  /** An account as people read it: its address (lib/accounts-file.mjs records have no label). */
  const accountLabel = (a) => String(a.email || a.displayName || a.label || a.provider || 'An account').slice(0, 80);
  function deviceRows() {
    if (!settings.enabled) return [];
    const jobs = [...roles.accounts.map(a => ({ id: a.id, label: accountLabel(a) })), ...Object.keys(roles.roles).map(id => ({ id, label: JOB_LABELS[id] || id }))];
    return knownDevices().map(d => ({
      ...d, id: d.deviceId,
      fetches: jobs.filter(j => fetcherIdOf(j.id) === d.fetcherId || (!fetcherIdOf(j.id) && d.me && isFetcherNow(j.id))).map(j => j.label),
    })).map(({ deviceId, fetcherId, ...d }) => d);
  }
  function status() {
    const found = detected();
    const devices = deviceRows();
    return {
      enabled: settings.enabled, apply: settings.apply, mode: !settings.enabled ? 'off' : settings.apply ? 'apply' : 'shadow',
      active, folder: settings.folder, where: ad ? ad.where : null, cloud: settings.folder || usesRelay() ? cloudName() : null,
      deviceName: deviceName(), deviceId: device ? device.deviceId.slice(0, 6) : null,
      state: settings.enabled ? st.state : 'off',
      message: settings.enabled ? st.message : 'Off. Your data stays on this computer.',
      lastSyncAt: st.lastSyncAt, lastSentAt: st.lastSentAt, lastReceivedAt: st.lastReceivedAt, lastError: st.lastError,
      devices, conflicts: { count: st.conflictsSeen, recent: st.recentConflicts.slice(0, 5) },
      preview: settings.apply ? null : st.preview,
      skew: clock && clock.skewed ? { device: peerName(clock.skewed.deviceId), aheadMin: Math.round(clock.skewed.aheadMs / 60000), text: `Your other computer's clock (${peerName(clock.skewed.deviceId)}) is ${minutes(clock.skewed.aheadMs)} ahead. Set both computers to the right time so the newest change wins.` } : null,
      e2e: e2eStatus(),
      accounts: settings.enabled ? roles.accounts.map(a => ({ id: a.id, label: accountLabel(a), provider: a.provider || null, fetcher: fetcher(a.id) })) : [],
      detected: found.map(d => ({ kind: d.kind, label: d.label, path: d.path, ...(d.work ? { work: true } : {}) })),
      lastApply: st.lastApply, now: now(),
      live: liveStatusFn ? (() => { try { return liveStatusFn(); } catch { return null; } })() : null,
      liveIn: { received: st.liveReceived, duplicates: st.liveDuplicates, refused: st.liveRefused },
      // ── files ── files that are too big to sync from this computer (they stay as they are here)
      notSynced: [...notSynced].slice(0, 20).map(([file, n]) => ({ file, why: n.why, whole: n.whole })),
      // ── health ── for Settings > Sync > Health (lib/sync/health.mjs) and the "What changed" feed
      health: settings.enabled ? {
        diskFull: st.diskFull, wokeAt: st.wokeAt, sleptMs: st.sleptMs, moved: st.moved, rewroteOwnAt: st.rewroteOwnAt,
        io: { ...st.io }, storage: st.storage, transfer: st.transfer, pruned: st.pruned.slice(0, 3), conflictsOpen: st.conflictsOpen,
        waitingLines: st.waitingLines, waitingFrom: st.waitingFrom ? peerName(st.waitingFrom) : null, uploadLag: sec() ? uploadLag() : null,
        appVersion, history: hadHistory(), allowFresh,
        // ── self-healing ── another device's changes with a hole (one missing, later ones here): being read again
        gaps: meta ? Object.entries(meta.gaps || {}).filter(([id]) => (meta.ahead[id] || []).length).slice(0, 5).map(([id, g]) => ({ name: peerName(id), since: g.since || null, missing: (meta.frontier[id] || 0) + 1 })) : [],
        rereading: meta ? Object.keys(meta.reread || {}).slice(0, 5).map(peerName) : [],
      } : null,
      changes: settings.enabled ? feed.list(5) : [],
      // ── blobs ── {on, used, budget, text: 'Pictures and audio: 34 MB of 200 MB', ...} (lib/sync/blobs.mjs)
      blobs: settings.enabled && blobs ? blobs.status() : null,
      // ── relay ── {available, host, on, transport, state, outbox, quota, link, hasKey, ...} (lib/sync/relay.mjs)
      relay: relayStatus(),
    };
  }

  // ─── Turning it on and off ───────────────────────────────────────────
  async function activateCore() {
    capStamps.clear();
    if (ad && typeof ad.stop === 'function') { try { ad.stop(); } catch { /* stopped */ } }
    ad = adapterFactory({
      folder: settings.folder, deviceId: device.deviceId, now,
      // ── relay ── sync through the person's relay too (or only): lib/sync/relay.mjs
      relay: usesRelay() ? { origin: relayOrigin() } : null, lastFolder: settings.lastFolder, isLive: isLivePeer, onJoinEvent: joinEvent,
    });
    // The same sync through another transport (folder <-> relay): what this computer knows is kept.
    if (meta && meta.where !== ad.where && keepPlace) { meta.where = ad.where; metaDirty = true; }
    keepPlace = false;
    if (!meta || meta.where !== ad.where) {
      // A new folder (or the first time): start fresh. If other devices
      // already sync there, this one JOINS: its existing data is treated as
      // older than everything in the folder, so the folder's copy wins where
      // both have the same thing, and what only this device has is added.
      meta = freshMeta(ad.where);
      tree = newTree(); remoteTree = newTree();
      if (sec()) meta.join = null;      // decided on the first pass with the key (only members' data counts)
      else if (await ad.ready().catch(() => false)) {
        for (const id of await ad.listDevices()) {
          if (id === device.deviceId) continue;
          const files = await ad.listFiles(id);
          if (files.snapshot || files.logs.some(l => l.size > 0)) { meta.join = true; break; }
        }
      }
    }
    if (await readyHere().catch(() => false)) meta.seq = Math.max(meta.seq, await ad.lastOwnSeq().catch(() => 0));   // meta may be older than the log
    clock = createClock({ deviceId: device.deviceId, now, last: meta.hlc, ...(maxDriftMs ? { maxDriftMs } : {}) });
  }

  async function activate() {
    if (active) await deactivate();
    if (host.disabled) { setState('off', host.disabled); return; }
    if (typeof host.refreshRelayInfo === 'function') await host.refreshRelayInfo().catch(() => {});
    if (!hasPlace()) { setState('waiting', 'Your relay is not set up on this computer yet. Connect it in Settings > Your relay, or join with a link from your other computer.'); waitForRelay(); return; }
    await ensureDevice();
    if (!meta) await loadMeta();
    await activateCore();
    active = true;
    setState('syncing', 'Starting...');
    lastStamp = null; lastHeartbeat = 0; stoppedAt = null;
    unsubscribe = store.onChange((info) => {
      if (!info || info.source === 'sync' || info.dataChanged === false) return;
      localDirty = true;
      schedule('local');
    });
    await heartbeat(true).catch(() => {});
    startWatcher();
    // ── health ── a poll that comes far too late: the computer slept (or the process was
    // frozen). Catch up at once with a new watcher (Windows can drop one across sleep),
    // and tell the others straight away that this computer is back.
    lastPollAt = now();
    poller = setInterval(() => {
      const t = now(), gap = lastPollAt ? t - lastPollAt : 0;
      lastPollAt = t;
      if (gap > Math.max(WAKE_GAP_MS, pollMs * 6)) { woke(gap); run('wake'); return; }
      run('poll');
    }, pollMs);
    if (poller && typeof poller.unref === 'function') poller.unref();
    await run('start');
  }

  // ── relay ── sync through a relay that is not known here yet: look again every 30 s
  // (Connect Cloudflare on this computer writes it), or at once with relayChanged().
  let relayWait = null;
  function waitForRelay() {
    if (relayWait) return;
    relayWait = setInterval(() => { relayChanged().catch(() => {}); }, 30000);
    if (relayWait && typeof relayWait.unref === 'function') relayWait.unref();
  }
  async function relayChanged() {
    await ensureLoaded();
    if (typeof host.refreshRelayInfo === 'function') await host.refreshRelayInfo({ force: true }).catch(() => {});
    const stopWaiting = () => { if (relayWait) { clearInterval(relayWait); relayWait = null; } };
    // A fresh look at once (a renewed identity, a new relay): any back-off from the old one is dropped.
    // (after the pass that may be running: the transport's syncNow never runs beside a pass)
    if (active) { stopWaiting(); syncNowInner().catch(() => {}); return status(); }
    if (!settings.enabled || !settings.relay) { stopWaiting(); return status(); }
    if (hasPlace()) { stopWaiting(); await activate(); }
    return status();
  }

  function woke(gap) {
    st.wokeAt = now(); st.sleptMs = gap;
    log('info', `sync: back after ${Math.max(1, Math.round(gap / 60000))} min asleep (or busy): catching up`);
    if (unwatch) { try { unwatch(); } catch { /* closed */ } unwatch = null; }
    watchFailed = false;
    lastHeartbeat = 0;      // "this computer is back" in its device.json at once
    localDirty = true;      // look at the state again: a write may have been cut off by the sleep
    capStamps.clear();
  }

  async function deactivate() {
    active = false;
    clearTimeout(debounce); clearInterval(poller); poller = null;
    if (throttleRetry) { clearTimeout(throttleRetry); throttleRetry = null; }
    if (unwatch) { unwatch(); unwatch = null; }
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (running) await running.catch(() => {});
    if (ad && typeof ad.stop === 'function') { try { ad.stop(); } catch { /* stopped */ } }
    if (meta && metaDirty) await saveMeta().catch(() => {});
  }

  async function ensureLoaded() {
    if (!loaded) {
      await loadSettings();
      if (e2e && settings.e2e && !e2e.loaded) await e2e.load();
      await loadDevice();
      if (device && !meta) await loadMeta();
      feed.load(await L.read('changes.json').catch(() => null));      // ── health ── the feed survives a restart
      loaded = true;
      countOpenConflicts().catch(() => {});
    }
  }

  async function start() {
    await ensureLoaded();
    if (settings.enabled && (settings.folder || settings.relay)) await activate().catch((e) => { st.lastError = errMsg(e); setState('error', `Sync could not start: ${plainError(e)}.`); });
    else setState('off', '');
    return status();
  }

  function badRequest(message, code = 'BAD_SYNC_SETTING') { const e = new Error(message); e.status = 400; e.code = code; return e; }

  /**
   * ── relay carry-over ── "Sync through your relay" chosen here: the person's choice, kept in
   * friends/relays.json (synced), so their other computers switch to it too once they can.
   * Only for their own relay record (not an address from the environment or a join link).
   */
  async function chooseRelayForAll() {
    const r = relayInfo();
    if (!r || r.source !== 'friends' || r.syncAll === true || typeof host.setRelaySyncChoice !== 'function') return;
    try { await host.setRelaySyncChoice(true); localDirty = true; schedule('local', 50); }
    catch (e) { log('warn', `sync: could not keep the choice to sync through your relay (${errMsg(e)})`); }
  }
  /** Change settings: {enabled?, apply?, folder?, deviceName?, relay?, relayNotice?}. Returns the status. */
  async function configure(patch = {}) {
    await ensureLoaded();
    const next = { ...settings };
    if (patch.deviceName !== undefined) {
      const n = String(patch.deviceName || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 60);
      next.deviceName = n || null;
    }
    if (patch.folder !== undefined && patch.folder !== null && patch.folder !== '') {
      const c = await host.checkFolder(String(patch.folder).trim());
      if (!c.ok) throw badRequest(c.error, c.code);
      next.folder = c.path;
    }
    if (patch.enabled !== undefined) next.enabled = !!patch.enabled;
    if (patch.apply !== undefined) next.apply = !!patch.apply;
    // ── relay ── through the relay too (or only): {relay: true}; {folder: false} stops using the folder.
    // On: the person's choice, for all their computers (friends/relays.json sync.on, see relayAutoWanted).
    // Off: this computer only (relayOff), the others keep theirs. relayNotice: false closes the
    // "now syncs through your relay" line.
    if (patch.relay !== undefined) { next.relay = !!patch.relay; next.relayOff = !patch.relay; next.relayAutoAt = null; }
    if (patch.relayNotice === false) next.relayAutoAt = null;
    if (patch.folder === false) {
      if (!next.relay) throw badRequest('Turn on sync through your relay first, so this computer keeps syncing.', 'RELAY_FIRST');
      if (next.folder) next.lastFolder = next.folder;
      next.folder = null;
    }
    // Relay off with no folder left: back to the folder it used before, if there was one.
    if (patch.relay === false && !next.folder && settings.lastFolder) next.folder = settings.lastFolder;
    if (next.enabled && !next.folder && !next.relay) {
      detectCache.at = 0;
      const d = detected();
      if (!d.length) throw badRequest('No OneDrive, Google Drive or Dropbox folder was found. Choose a folder that your cloud drive keeps in sync.', 'NO_FOLDER');
      // Never a work or school OneDrive by default: personal data does not go to an employer's cloud.
      const own = d.find(x => !x.work);
      if (!own) throw badRequest('Only a work or school OneDrive was found. Your personal data should not go into it: choose your own OneDrive, Google Drive or Dropbox folder.', 'NO_FOLDER');
      next.folder = own.path;
    }
    const restart = next.enabled && (!active || next.folder !== settings.folder || next.relay !== settings.relay);
    if (patch.relayNotice === false && Object.keys(patch).length === 1) { settings = next; await saveSettings(); return status(); }
    // The same sync on another transport keeps what this computer knows; a different folder starts fresh.
    keepPlace = restart && !!meta && !(next.folder && settings.folder && next.folder !== settings.folder);
    const nameChanged = next.deviceName !== settings.deviceName;
    if (nameChanged) next.nameAt = new Date(now()).toISOString();
    if (nameChanged && e2e && next.e2e && next.deviceName && device) await serial(() => e2e.rename(device.deviceId, next.deviceName)).catch(() => {});
    const applyChanged = next.apply !== settings.apply;
    if (applyChanged && myCaps) capsDirty = true;     // the others read `apply` from this device's capabilities
    settings = next;
    await saveSettings();
    if (patch.relay === true) await chooseRelayForAll();
    if (!settings.enabled) { await deactivate(); setState('off', ''); }
    else if (restart) await activate();
    else {
      if (nameChanged) await heartbeat(true);
      if (applyChanged) { previewDirty = !settings.apply; await run('apply-switch'); }
    }
    return status();
  }

  // ─── Fetcher API (for the connections code; later bank pulls and AI briefs) ──
  /**
   * Should THIS device run the fetch jobs for an account (or a job such as
   * 'bank')? An account's recorded fetcher decides with sync on or off; with
   * sync off anything else runs here, as before sync.
   */
  async function isFetcher(id) {
    await ensureLoaded();
    await readRoles();
    const yes = isFetcherNow(id);
    // Unassigned and this device takes it: record that, so the others stop.
    // (Not when live sync's lease decides: there the registry entry is the
    // user's own choice, "Use this computer instead", and the lease moves the
    // job between computers by itself.)
    let leased = null;
    if (leaseOracle && settings.enabled && device) { try { leased = leaseOracle(id); } catch { leased = null; } }
    if (settings.enabled && device && yes && leased === null && !fetcherIdOf(id)) await setFetcher(id).catch(() => {});
    return yes;
  }
  /** A device id from the devices list (or a fetcher id) -> that device's fetcher id. */
  function fetcherIdFor(dev) {
    if (!dev) return myFid();
    const d = knownDevices().find(x => x.deviceId === dev || x.fetcherId === dev);
    return d ? d.fetcherId : dev;
  }
  /**
   * Make a device (default: this one; a device id from devices() or a fetcher
   * id) the fetcher of an account or job. An account in the registry
   * (accounts.json) gets its `fetcher` field set, under the registry's own lock
   * when the host has one (host.data.updateJson); any other id ('bank',
   * 'ai-brief', 'connectors') is kept in roles.json. Both files are synced, so
   * the choice reaches the other devices (later change wins if two devices
   * choose at once).
   */
  async function setFetcher(id, deviceId, { name } = {}) {
    await ensureLoaded();
    if (typeof id !== 'string' || !id || id.length > 200) throw badRequest('Which account?', 'BAD_ACCOUNT');
    const fid = fetcherIdFor(deviceId);
    const known = knownDevices().find(x => x.fetcherId === fid);
    const label = String((known && known.name) || name || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 60);
    if (!FID_RE.test(fid || '')) throw badRequest('Unknown device.', 'BAD_DEVICE');
    const since = new Date(now()).toISOString();
    const update = typeof host.data.updateJson === 'function'
      ? (rel, fn) => host.data.updateJson(rel, fn)
      : async (rel, fn) => { const cur = await host.data.readJson(rel); const next = await fn(cur && cur.present ? cur.value : undefined); if (next !== undefined) await host.data.writeJson(rel, next); };
    let isAccount = false;
    await update(ACCOUNTS_REL, (v) => {
      const acc = v && Array.isArray(v.accounts) ? v.accounts.find(x => x && x.id === id) : null;
      if (!acc) return undefined;               // not an account: leave the file alone
      isAccount = true;
      acc.fetcher = fid;
      delete acc.fetcherDeviceId; delete acc.fetcherSince;   // fields of the sync prototype (never released)
      return v;
    });
    if (!isAccount) {
      await update('roles.json', (v) => {
        const out = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
        out.roles = out.roles && typeof out.roles === 'object' ? out.roles : {};
        out.roles[id] = { fetcher: fid, since, ...(label ? { name: label } : {}) };
        return out;
      });
    }
    await readRoles();
    localDirty = true;
    schedule('local');
    return fetcher(id);
  }
  /**
   * "Fetch on this device instead". The device needs its own sign-in for the
   * account (tokens never sync): hasToken false -> refused with SIGN_IN_FIRST.
   */
  async function takeOver(id, { hasToken } = {}) {
    if (!hasToken) return { ok: false, code: 'SIGN_IN_FIRST', message: 'Sign in on this computer to take over.' };
    await ensureLoaded();
    if (settings.enabled) await ensureDevice();   // sync off: the host's fetcher id is enough
    return { ok: true, ...(await setFetcher(id)) };
  }
  /**
   * Nobody is recorded for an account or job any more: an account's `fetcher`
   * is cleared, a job's role removed (it then follows the main computer, or
   * with nothing recorded every computer / the first that asks runs it).
   */
  async function clearFetcher(id) {
    await ensureLoaded();
    if (typeof id !== 'string' || !id || id.length > 200) throw badRequest('Which account?', 'BAD_ACCOUNT');
    const update = typeof host.data.updateJson === 'function'
      ? (rel, fn) => host.data.updateJson(rel, fn)
      : async (rel, fn) => { const cur = await host.data.readJson(rel); const next = await fn(cur && cur.present ? cur.value : undefined); if (next !== undefined) await host.data.writeJson(rel, next); };
    let isAccount = false;
    await update(ACCOUNTS_REL, (v) => {
      const acc = v && Array.isArray(v.accounts) ? v.accounts.find(x => x && x.id === id) : null;
      if (!acc) return undefined;
      isAccount = true;
      if (acc.fetcher == null) return undefined;
      acc.fetcher = null;
      return v;
    });
    if (!isAccount) await update('roles.json', (v) => (v && v.roles && typeof v.roles === 'object' && v.roles[id] ? (delete v.roles[id], v) : undefined));
    await readRoles();
    localDirty = true;
    schedule('local');
    return fetcher(id);
  }
  /** Who fetches an account: {deviceId, name, me, background, lastSeen, stale, note}. */
  function fetcher(id) {
    const fid = capableRunner(id) || fetcherIdOf(id);
    if (!fid) return { deviceId: null, name: null, me: isFetcherNow(id), background, lastSeen: null, stale: false, note: null };
    const d = knownDevices().find(x => x.fetcherId === fid || x.deviceId === fid);
    // Not a device sync knows (sync off, a shared data folder): the name stored with the role.
    const r = accountOf(id) ? null : (roles.roles[id] && roles.roles[id].fetcher === fid ? roles.roles[id] : roles.roles[MAIN]);
    const name = d ? d.name : (r && typeof r.name === 'string' && r.name.slice(0, 60)) || 'another device';
    const fg = d ? !d.background : false;
    const stale = !!(d && fg && d.lastSeen && now() - d.lastSeen > FOREGROUND_STALE_MS);
    return {
      deviceId: d ? d.deviceId : fid, name, me: fid === myFid(), background: d ? d.background : true, lastSeen: d ? d.lastSeen : null, stale,
      note: fg ? `${name} fetches only while OpenDash is open on it${stale ? '; it has not been open for a while, so this may be out of date' : ''}.` : null,
    };
  }
  /** The devices that sync here: [{deviceId, name, me, lastSeen, background}]. */
  async function devices() { await ensureLoaded(); return settings.enabled ? knownDevices() : []; }

  // ─── The folder moved: use it where it is now, or start again here ── health ──
  /**
   * "Use this folder": the same sync, found somewhere else (the OpenDash Sync
   * folder moved, or the cloud drive now lives at another path). What this
   * computer knows is kept (it is the same sync), unlike choosing a new folder.
   */
  async function relink(folder) {
    await ensureLoaded();
    if (!settings.enabled || !device) throw badRequest('Turn sync on first.', 'SYNC_OFF');
    const c = await host.checkFolder(String(folder || '').trim());
    if (!c.ok) throw badRequest(c.error, c.code);
    const a = adapterFactory({ folder: c.path, deviceId: device.deviceId, now });
    const ids = typeof a.listDevices === 'function' ? await a.listDevices().catch(() => []) : [];
    const known = new Set([device.deviceId, ...Object.keys((meta && meta.frontier) || {}), ...(sec() && e2e.group ? e2e.status().members : [])]);
    if (!ids.some(id => known.has(id))) throw badRequest('That folder does not hold your OpenDash sync. Choose the folder that has "OpenDash Sync" inside it.', 'NOT_OUR_SYNC');
    settings = { ...settings, folder: c.path };
    await saveSettings();
    if (meta) { meta.where = a.where; await saveMeta(); }
    st.moved = null; movedCands = { at: 0, list: [] };
    await activate();
    return status();
  }
  /**
   * "Start sync again in this folder" after the folder went missing: this
   * computer writes everything it has (a fresh snapshot) into a new OpenDash
   * Sync folder there. The other computers must choose this folder too.
   */
  async function startFresh() {
    await ensureLoaded();
    if (!settings.enabled || !active) throw badRequest('Turn sync on first.', 'SYNC_OFF');
    allowFresh = true;
    st.moved = null; movedCands = { at: 0, list: [] };
    ownRewrite = true; localDirty = true; lastHeartbeat = 0;
    log('warn', 'sync: starting again in the chosen folder (the user chose it after the old one went missing)');
    await syncNowInner();
    return status();
  }
  /** A fresh pass (one already running is finished first, so this one sees everything up to now). */
  async function syncNowInner() {
    if (running) await running.catch(() => {});
    if (ad && typeof ad.syncNow === 'function') await ad.syncNow().catch(() => {});
    return run('now');
  }

  // ─── Encrypted sync: setting up, joining, devices ─────────────────────
  const JOB_LABELS = { main: 'Main computer', bank: 'Bank', 'ai-brief': 'AI brief', story: 'AI story scripts', connectors: 'Claude connectors', claude: 'Claude host' };
  function needE2E() { if (!e2e) throw badRequest('Encrypted sync is not available in this version.', 'NO_E2E'); }
  // Key changes from Settings and the sync pass never interleave.
  let chain = Promise.resolve();
  function serial(fn) { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p; }
  const cleanDeviceName = (n) => String(n || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 60) || null;

  async function resolveFolder(folder) {
    if (folder !== undefined && folder !== null && folder !== '') {
      const c = await host.checkFolder(String(folder).trim());
      if (!c.ok) throw badRequest(c.error, c.code);
      return c.path;
    }
    if (settings.folder) return settings.folder;
    detectCache.at = 0;
    const d = detected();
    if (!d.length) throw badRequest('No OneDrive, Google Drive or Dropbox folder was found. Choose a folder that your cloud drive keeps in sync.', 'NO_FOLDER');
    const own = d.find(x => !x.work);   // never a work or school OneDrive by default
    if (!own) throw badRequest('Only a work or school OneDrive was found. Your personal data should not go into it: choose your own OneDrive, Google Drive or Dropbox folder.', 'NO_FOLDER');
    return own.path;
  }
  /** Is there an encrypted group in this folder already? (Looks only; makes this device's own empty folder.) */
  async function groupsIn(folder) {
    const id = (await e2e.identity()).deviceId;
    const a = adapterFactory({ folder, deviceId: id, now });
    if (!(await a.ready().catch(() => false))) throw badRequest(`${host.folderLabel(folder)} is not ready: the folder is not there. Is it running and signed in?`, 'FOLDER_NOT_READY');
    const listing = [];
    for (const d of await a.listDevices()) listing.push({ id: d, files: await a.listFiles(d) });
    await serial(() => e2e.refresh(a, listing));
    return e2e.status().found.groups;
  }
  const withName = (name) => (name !== undefined && name !== null ? { deviceName: cleanDeviceName(name), nameAt: new Date(now()).toISOString() } : {});

  /**
   * "Yes, this is my first computer": a new encrypted group in the folder.
   * Returns the status with recoveryCode (shown once, never stored).
   * A device that synced without encryption keeps its data (this is the move to v 2).
   */
  async function setupFirst({ folder, deviceName: name, apply, relay } = {}) {
    await ensureLoaded(); needE2E();
    if (settings.enabled && settings.e2e && e2e.group) throw badRequest('Sync is already set up on this computer.', 'ALREADY_ON');
    // ── relay ── "Sync through your relay": no folder needed (one can be added later).
    const viaRelay = relay === true;
    if (viaRelay && typeof host.refreshRelayInfo === 'function') await host.refreshRelayInfo({ force: true }).catch(() => {});
    if (viaRelay && !(relayInfo() && relayInfo().usable)) throw badRequest('Your relay is not set up yet: connect it in Settings > Your relay first.', 'NO_RELAY');
    const f = viaRelay && !folder ? null : await resolveFolder(folder);
    if (f && await groupsIn(f)) throw badRequest('OpenDash sync is already set up in this folder by another computer. Choose "No, I already use OpenDash" to add this computer.', 'GROUP_EXISTS');
    const { code } = e2e.group ? { code: null } : await serial(() => e2e.createGroup());
    settings = { ...settings, ...withName(name), folder: f, relay: viaRelay, enabled: true, e2e: true, ...(apply !== undefined ? { apply: !!apply } : {}) };
    await saveSettings();
    await activate();
    if (viaRelay) await chooseRelayForAll();
    if (settings.deviceName) await serial(() => e2e.rename(device.deviceId, settings.deviceName));
    // 2.20.1: the backup secret is not shown here; the page offers a backup sheet (optional).
    return { ...status(), recoveryCode: null, sheetOffer: !!code };
  }
  /** "No, I already use OpenDash": wait in the folder for approval or the recovery code. */
  async function joinExisting({ folder, deviceName: name, apply, relay } = {}) {
    await ensureLoaded(); needE2E();
    const viaRelay = relay === true;
    const f = viaRelay && !folder ? null : await resolveFolder(folder);
    await e2e.identity();
    settings = { ...settings, ...withName(name), folder: f, relay: viaRelay || settings.relay, enabled: true, e2e: true, ...(apply !== undefined ? { apply: !!apply } : {}) };
    await saveSettings();
    await activate();
    return status();
  }
  /** A device that syncs without encryption moves to encrypted sync (v 1 -> v 2); joins if another one already did. */
  async function encrypt() {
    await ensureLoaded(); needE2E();
    if (!settings.enabled || !settings.folder) throw badRequest('Turn sync on first.', 'SYNC_OFF');
    if (settings.e2e) return { ...status(), recoveryCode: null, sheetOffer: false };
    let code = null;
    if (!(await groupsIn(settings.folder))) code = (await serial(() => e2e.createGroup())).code;
    settings = { ...settings, e2e: true };
    await saveSettings();
    await activate();
    return { ...status(), recoveryCode: null, sheetOffer: !!code };
  }
  async function afterJoin() {
    if (device && e2e.deviceId !== device.deviceId) await activate();
    else await run('now');
    if (settings.deviceName && e2e.ready) { await serial(() => e2e.rename(device.deviceId, settings.deviceName)); await run('now'); }
    return status();
  }
  function needActive() { if (!active || !sec()) throw badRequest('Choose "No, I already use OpenDash" in Settings > Sync first.', 'NOT_JOINING'); }
  async function joinWithRecovery(code) {
    await ensureLoaded(); needE2E(); needActive();
    await serial(async () => e2e.joinWithRecovery(code, ad, await listAll()));
    return afterJoin();
  }
  async function joinWithOffer(text) {
    await ensureLoaded(); needE2E(); needActive();
    await serial(() => e2e.joinWithOffer(text, ad));
    return afterJoin();
  }
  async function keyOp(fn) {
    await ensureLoaded(); needE2E(); needActive();
    const r = await serial(fn);
    await run('now');
    return r;
  }
  const pairStart = async () => { await keyOp(() => e2e.pairStart({ name: deviceName(), kind })); return status(); };
  const pairRespond = async (sid) => { await keyOp(() => e2e.pairRespond(String(sid || ''))); return status(); };
  const pairConfirm = async (sid, match) => {
    await keyOp(() => e2e.pairConfirm(String(sid || ''), !!match));
    if (device && e2e.deviceId !== device.deviceId) await activate();
    return afterJoin();
  };
  const pairCancel = async () => { await keyOp(() => e2e.pairCancel()); return status(); };
  // The 4-letter join code: "Add a computer" here, "Type the code" on the new one (lib/sync/e2e.mjs).
  const codeStart = async () => {
    await keyOp(() => e2e.codeStart());
    linkClashAt = 0;
    // ── relay ── a join link for a computer that has no folder yet (2 minutes, one device).
    if (usesRelay() && ad && typeof ad.openJoinLink === 'function') await ad.openJoinLink().catch((e) => log('info', `sync: no join link (${errMsg(e)})`));
    return status();
  };
  const codeCancel = async () => {
    if (ad && typeof ad.closeJoinLink === 'function') await ad.closeJoinLink('cancelled').catch(() => {});
    await keyOp(() => e2e.codeCancel());
    return status();
  };
  // "Approve <name>?": the keys go only after this (lib/sync/e2e.mjs codeApprove).
  const codeApprove = async (yes) => { await keyOp(() => e2e.codeApprove(!!yes)); return status(); };
  async function codeJoin(text, { link } = {}) {
    await ensureLoaded(); needE2E();
    // ── relay ── "Join with a link": the link names the relay and a slot; the 4 letters stay the CPace password.
    if (link) {
      const L = parseJoinLink(link);     // the shared origin check: a local relay only with OPENDASH_RELAY_ALLOW_LOCAL=1
      if (!L) throw badRequest('That is not a join link. Copy the whole link from your other computer (Settings > Sync > Add a computer).', 'BAD_LINK');
      let before = null;
      if (!active || !settings.relay || relayOrigin() !== L.origin) {
        await e2e.identity();
        before = { ...settings };
        const fromOff = !settings.enabled;
        settings = { ...settings, enabled: true, e2e: true, relay: true, relayOrigin: L.origin, ...(fromOff ? { apply: true } : {}) };
        await saveSettings();
        keepPlace = !!meta;
        await activate();
      }
      if (!ad || typeof ad.useJoinLink !== 'function') throw badRequest('This computer cannot reach the relay in that link.', 'NO_RELAY');
      try { await ad.useJoinLink({ slot: L.slot, seal: L.seal }); }
      catch (e) {
        if (!e || e.code !== 'LINK_GONE') throw e;
        // A used, cancelled or expired link: this computer's sync goes back to how it was.
        if (before) {
          settings = before;
          await saveSettings();
          if (settings.enabled && (settings.folder || settings.relay)) { keepPlace = !!meta; await activate(); }
          else { await deactivate(); setState('off', ''); }
        }
        throw badRequest('That join link was already used or has expired. On your other computer, open Settings > Sync > Add a computer to get a new link and code.', 'LINK_GONE');
      }
    }
    needActive();
    // A computer that already syncs may type a code too: it then receives the pairing
    // extras only (the key for your relay), its membership stays as it is.
    const member = !!e2e.ready;
    await serial(() => e2e.codeJoin(String(text || ''), { name: deviceName(), kind, member }));
    await run('now');
    // Joined at once (the other computer had already answered): carry on as afterJoin does.
    if (e2e.ready) return afterJoin();
    return status();
  }
  async function makeOffer() { const o = await keyOp(() => e2e.makeOffer()); return { ...status(), offer: o }; }
  /** "Remove this device": a new key for the others; the removed one can read nothing written after. */
  async function removeDevice(id) {
    // 2.19.8: a removal also renews the backup secret (lib/sync/e2e.mjs removeDevice); 2.20.1: unseen
    // (e2e.sheet 'old' asks for a new sheet in Settings, only when the person had made one).
    await keyOp(() => e2e.removeDevice(String(id || ''), { frontier: { ...meta.frontier }, seq: meta.seq }));
    if (ad && typeof ad.revokeDevice === 'function') await ad.revokeDevice(String(id || '')).catch(() => {});
    await releaseRoles(String(id || '')).catch(() => {});
    return status();
  }
  /** Accounts and jobs a removed device was main computer for become unassigned (the next computer that can, takes them). */
  async function releaseRoles(id) {
    // The removed device's fetcher id (its host id; its device id on hosts without one).
    const p = peers.get(id);
    const fid = (p && p.fetcherId) || id;
    const update = typeof host.data.updateJson === 'function'
      ? (rel, fn) => host.data.updateJson(rel, fn)
      : async (rel, fn) => { const cur = await host.data.readJson(rel); const next = await fn(cur && cur.present ? cur.value : undefined); if (next !== undefined) await host.data.writeJson(rel, next); };
    let changed = false;
    await update(ACCOUNTS_REL, (v) => {
      let c = false;
      for (const acc of (v && Array.isArray(v.accounts) ? v.accounts : [])) if (acc && (acc.fetcher === fid || acc.fetcher === id)) { acc.fetcher = null; c = true; }
      if (c) changed = true;
      return c ? v : undefined;
    });
    await update('roles.json', (v) => {
      if (!v || !v.roles || typeof v.roles !== 'object') return undefined;
      let c = false;
      for (const [k, r] of Object.entries(v.roles)) if (r && [r.fetcher, r.deviceId].some(x => x === fid || x === id)) { delete v.roles[k]; c = true; }
      if (c) changed = true;
      return c ? v : undefined;
    });
    if (changed) { await readRoles(); localDirty = true; await run('now'); }
  }
  async function renameDevice(id, name) {
    if (device && id === device.deviceId) return configure({ deviceName: name });
    await keyOp(() => e2e.rename(String(id || ''), name));
    return status();
  }
  async function newRecoveryCode() {
    const r = await keyOp(() => e2e.newRecoveryCode());
    return { ...status(), recoveryCode: r.code };
  }
  /** Encrypted sync: take a name another device gave this one. */
  async function adoptOwnName() {
    const n = e2e.nameEntry(device.deviceId);
    if (!n || n.by === device.deviceId || n.name === settings.deviceName || (settings.nameAt && settings.nameAt >= n.at)) return;
    settings.deviceName = n.name; settings.nameAt = n.at;
    await saveSettings();
    lastHeartbeat = 0;
  }
  /**
   * Accounts fetched under an old device id move to the new one. Only on a
   * host without a fetcher id of its own (a phone, a PWA): on the desktop an
   * account's `fetcher` is the host id, which a new sync identity keeps.
   */
  async function moveRoles(from, to) {
    await readRoles();
    if (fidOf((() => { try { return host.fetcherId; } catch { return null; } })())) return;
    for (const a of roles.accounts) if (a.fetcher === from) await setFetcher(a.id, to);
    for (const [id, r] of Object.entries(roles.roles)) if (r && (r.fetcher || r.deviceId) === from) await setFetcher(id, to);
  }

  async function stop() {
    // ── presence ── a clean stop says goodbye in device.json, so the others say "off" at once (not "asleep").
    if (active && ad && device && meta) {
      stoppedAt = now();
      let t = null;
      await Promise.race([heartbeat(true).catch(() => {}), new Promise((r) => { t = setTimeout(r, 1500); })]);
      clearTimeout(t);
    }
    await deactivate();
  }

  // ─── Live sync hooks (lib/sync/live/live.mjs) ─────────────────────────
  /**
   * Records pushed by a connected, authenticated device `from`: [{file, rec}]
   * (rec exactly as in its log). They are merged on the next pass (in a few
   * ms) through the same checks as folder records. False when this device
   * cannot take them now (sync off, or no key).
   */
  function deliverLive(items, from) {
    if (!active || !sec() || !e2e.ready || !ID_RE.test(from || '')) return false;
    for (const it of Array.isArray(items) ? items : []) {
      if (liveQueue.length >= LIVE_QUEUE_MAX) break;
      if (it && typeof it.file === 'string' && it.rec && typeof it.rec === 'object') liveQueue.push({ dev: from, file: it.file, rec: it.rec });
    }
    if (!firstEventAt) firstEventAt = now();
    schedule('live', 5);
    return true;
  }
  /** ── relay carry-over ── The person's relay record a connected device pushed: merged on the next pass. */
  function deliverPart(data, from) {
    if (!active || !sec() || !e2e.ready || !ID_RE.test(from || '') || !e2e.member(from)) return false;
    if (notePart(from, data)) schedule('live', 5);
    return true;
  }
  /**
   * ── relay carry-over ── The keyring extras (the person's friends identity: the key to their
   * relay) a connected device sent because this one lacked them: taken exactly as from that
   * member's keys.json (lib/sync/e2e.mjs takeLiveExtras), then the relay is looked at again.
   */
  async function deliverExtras(x, from) {
    if (!active || !sec() || !e2e.ready || !ID_RE.test(from || '') || !e2e.member(from) || typeof e2e.takeLiveExtras !== 'function') return false;
    const ok = await serial(() => e2e.takeLiveExtras(x, from)).catch(() => false);
    if (ok) relayChanged().catch(() => {});
    return !!ok;
  }
  /** How far this device has another device's records (its change numbers up to n, without gaps). */
  function liveSeen(dev) { return meta ? Math.max(meta.frontier[dev] || 0, meta.pendingSeen[dev] || 0) : 0; }
  /**
   * This device's own records with a change number above n, from its own
   * logs (for a device that connects and missed some): [{file, rec}],
   * ascending, the newest `max` of them at most.
   */
  async function ownRecordsAfter(n, { max = 5000, maxBytes = 8 * 1024 * 1024 } = {}) {
    if (!active || !sec() || !ad || !device || !Number.isInteger(n) || n < 0 || n >= (meta ? meta.seq : 0)) return [];
    const logs = [...(await ad.listFiles(device.deviceId)).logs].sort((a, b) => b.mtimeMs - a.mtimeMs);
    const out = [];
    let bytes = 0;
    for (const lf of logs) {
      const r = await ad.readLog(device.deviceId, lf.name, 0);
      let low = Infinity;
      for (const { obj } of r.lines) {
        if (!obj || obj.v !== 2 || obj.dev !== device.deviceId || !Number.isInteger(obj.n)) continue;
        low = Math.min(low, obj.n);
        if (obj.n > n) { out.push({ file: lf.name, rec: obj }); bytes += JSON.stringify(obj).length; }
      }
      if (low <= n + 1 || out.length >= max || bytes >= maxBytes) break;
    }
    out.sort((a, b) => a.rec.n - b.rec.n);
    return out.slice(-max);
  }
  /** What this device publishes for live sync inside its encrypted device.json (addresses, claims). */
  function setDeviceExtra(obj) {
    deviceExtra = obj && typeof obj === 'object' ? obj : null;
    extraDirty = true;
    if (active) schedule('extra', 50);
  }
  /**
   * What this device can do (lib/sync/caps.mjs), published in its device.json
   * (sealed with encrypted sync). A change makes the next pass write
   * device.json and look at the synced files again (the snapshots of the
   * sources it reads become its to publish). Returns true when it changed.
   */
  function setCaps(caps) {
    const next = cleanCaps(caps && typeof caps === 'object' ? { ...caps, v: 1 } : null);
    const key = (c) => (c ? JSON.stringify({ ...c, at: 0 }) : '');
    if (key(next) === key(myCaps)) return false;
    myCaps = next ? { ...next, kind } : null;
    capsDirty = true; localDirty = true;
    if (active) schedule('caps', 50);
    return true;
  }
  /**
   * Every device of the group with what it can do: [{deviceId, fetcherId, name,
   * me, lastSeen, background, kind, live, caps}] (caps null: it publishes none,
   * an older version). Empty with sync off.
   */
  function groupCaps() {
    if (!settings.enabled) return [];
    let live = null;
    if (livePeersFn) { try { live = livePeersFn(); } catch { live = null; } }
    const rows = knownDevices().map(d => ({ ...d, live: !d.me && !!(live && typeof live.has === 'function' && live.has(d.deviceId)) }));
    // ── presence ── the tracker's answer (lib/sync/presence.mjs): `reachable` is what isOnline / reachable use.
    if (presenceFn) for (const d of rows) {
      if (d.me) continue;
      let p = null;
      try { p = presenceFn(d.deviceId); } catch { p = null; }
      if (p) { d.reachable = !!p.reachable; d.presence = p.state; d.presenceBase = p.base; }
    }
    return rows;
  }
  /**
   * ── presence ── The evidence for lib/sync/presence.mjs: every device of the
   * group ([] with sync off), each with what its device.json said (app, page,
   * stoppedAt, its own lastSeen as seenClaim, observedAt by this computer's
   * clock) and how many of this device's changes it has not received (behind).
   */
  function presenceRows() {
    if (!settings.enabled) return [];
    const me = device && device.deviceId;
    let live = null;
    if (livePeersFn) { try { live = livePeersFn(); } catch { live = null; } }
    return knownDevices().map((d) => {
      if (d.me) return { ...d, page: myPage };
      const p = peers.get(d.deviceId) || {};
      const got = me && p.seen && Number.isInteger(p.seen[me]) ? p.seen[me] : null;
      return {
        ...d, live: !!(live && typeof live.has === 'function' && live.has(d.deviceId)),
        seenClaim: p.seenClaim || null, observedAt: p.observedAt || null, page: p.page || null, stoppedAt: p.stoppedAt || null,
        behind: meta && got != null ? Math.max(0, meta.seq - got) : 0, mtimeMs: p.mtimeMs || null,
      };
    });
  }
  /** ── presence ── Is a dashboard page open on this computer? Published soon after it changes. True when it changed. */
  function setPresence({ page } = {}) {
    const open = page === true;
    if (myPage && myPage.open === open) return false;
    myPage = { open, at: now() };
    presDirty = true;
    if (active) schedule('presence', Math.max(50, PRES_MIN_MS - (now() - lastPresWrite)));
    return true;
  }
  /** ── presence ── This computer woke up: write device.json on the next pass (the others see it is back). */
  function touch() { lastHeartbeat = 0; stoppedAt = null; if (active) schedule('wake', 50); }
  /** Another member's published live-sync block (from its device.json), or null. */
  function peerExtra(id) { const p = peers.get(id); return p && p.extra ? { live: p.extra, lastSeen: p.lastSeen || null, mtimeMs: p.mtimeMs || null } : null; }
  /**
   * The accounts and jobs that have a main computer, for live sync's lease
   * (lib/sync/live/live.mjs): [{id, label, provider, fetcherDeviceId, fetcherSince}], roles.
   * The lease works in sync device ids: an account's recorded `fetcher` (a
   * fetcher id, lib/sync/roles.mjs) becomes the device id that publishes it, so
   * the user's choice is the lease's pin. A recorded computer sync does not know
   * (yet) pins nothing.
   */
  function jobs() {
    const devOf = (fid) => { if (!fid) return null; const d = knownDevices().find(x => x.fetcherId === fid || x.deviceId === fid); return d && ID_RE.test(d.deviceId) ? d.deviceId : null; };
    return {
      accounts: roles.accounts.map(a => ({ id: a.id, label: accountLabel(a), provider: a.provider || null, fetcherDeviceId: devOf(typeof a.fetcher === 'string' ? a.fetcher : null), fetcherSince: typeof a.updatedAt === 'string' ? a.updatedAt : null })),
      roles: Object.fromEntries(Object.entries(roles.roles).map(([k, v]) => [k, { deviceId: devOf(roleRunner(roles.roles, k)), since: v && v.since }])),
    };
  }

  return {
    start, stop, configure, status,
    /** A fresh pass (one already running is finished first, so this one sees everything up to now). */
    syncNow: syncNowInner,
    // ── health ── (Settings > Sync > Health, What changed, Review)
    changes: (n = FEED_MAX) => (settings.enabled ? feed.list(Math.max(1, Math.min(FEED_MAX, n | 0))) : []),
    conflicts, resolveConflict, relink, startFresh, compactNow,
    isFetcher, setFetcher, takeOver, clearFetcher, fetcher, devices,
    /** Read accounts.json and roles.json again (fetcher() answers from them; never claims anything). */
    reloadRoles: async () => { await ensureLoaded(); await readRoles(); },
    /** The person's relay setting changed (friends/relays.json, Connect Cloudflare): look again now. */
    relayChanged,
    refreshRelayPresence: () => ad && typeof ad.refreshPresence === 'function' ? ad.refreshPresence() : Promise.resolve(),
    /** Which of the person's computers have an open socket on the relay (asked at most once a minute): {state, devices: [{id, online, seen}], presenceAt}, or null when this computer does not use the relay. */
    relayPresence: () => {
      try {
        if (!ad || typeof ad.relayStatus !== 'function' || !usesRelay()) return null;
        const r = ad.relayStatus();
        return { state: r.state, devices: r.devices || [], presenceAt: r.presenceAt || 0 };
      } catch { return null; }
    },
    /** This computer's sync goes through the person's relay (live sync then leaves the router alone unless asked). */
    usesRelay: () => usesRelay(),
    /** ...and the relay takes it (not refused): SIMPLIFY_PLAN L4's relayInUse. */
    relayInUse: () => { if (!usesRelay()) return false; try { const r = ad && typeof ad.relayStatus === 'function' ? ad.relayStatus() : null; return !(r && r.state === 'denied'); } catch { return true; } },
    setupFirst, joinExisting, encrypt, joinWithRecovery, joinWithOffer, pairStart, pairRespond, pairConfirm, pairCancel,
    codeStart, codeCancel, codeJoin, codeApprove,
    makeOffer, removeDevice, renameDevice, newRecoveryCode,
    onApplied(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    // live sync (lib/sync/live/live.mjs)
    onRecords(fn) { recordListeners.add(fn); return () => recordListeners.delete(fn); },
    onPass(fn) { passListeners.add(fn); return () => passListeners.delete(fn); },
    deliverLive, liveSeen, ownRecordsAfter, setDeviceExtra, peerExtra, jobs,
    // ── relay carry-over ── (lib/sync/live/live.mjs: 'part' and 'kx' when a link opens; lib/relay/deploy.mjs)
    livePart: () => { const x = active && sec() && e2e.ready ? personPart() : null; return x ? x.data : null; },
    deliverPart, deliverExtras, personRelay,
    personFid: () => { try { return typeof host.friendsId === 'function' ? host.friendsId() || '' : ''; } catch { return ''; } },
    // capabilities (lib/sync/caps.mjs) and remote requests (lib/remote-jobs.mjs)
    setCaps, groupCaps, setLivePeers(fn) { livePeersFn = typeof fn === 'function' ? fn : null; },
    // presence (lib/sync/presence.mjs)
    presenceRows, setPresence, touch, setPresenceSource(fn) { presenceFn = typeof fn === 'function' ? fn : null; },
    // ── blobs ── pictures and narration audio (lib/sync/blobs.mjs; null without encryption support)
    //   blobs.fetch(rel, {waitMs})  make sure 'people/images/<name>' or 'cache/narration/<id>.mp3' is here
    //   blobs.noteLocal()           a picture or clip was just saved here
    //   onBlobs(fn(rels))           files that arrived from other devices
    //   onBlobPush(fn(msg)) / deliverBlob(msg, from)   live sync: small new blobs, pushed
    blobs: blobs ? {
      fetch: (rel, o) => blobs.fetch(rel, o),
      noteLocal: () => { blobs.noteLocal(); if (active) schedule('blobs', 250); },
      status: () => blobs.status(),
      kindOf: blobKind,
    } : null,
    onBlobs(fn) { blobArrived.add(fn); return () => blobArrived.delete(fn); },
    onBlobPush(fn) { return blobs ? blobs.onPush(fn) : () => {}; },
    deliverBlob(m, from) { return blobs ? blobs.deliverLive(m, from).catch(() => false) : Promise.resolve(false); },
    setClaudeHost(fn) { claudeHostFn = typeof fn === 'function' ? fn : null; },
    get caps() { return myCaps; },
    get apply() { return !!settings.apply; },
    setLeaseOracle(fn) { leaseOracle = typeof fn === 'function' ? fn : null; },
    setLiveStatus(fn) { liveStatusFn = typeof fn === 'function' ? fn : null; },
    get localFiles() { return L; },
    get seq() { return meta ? meta.seq : 0; },
    get active() { return active; },
    /** Settings > Sync is on (the accounts code asks isFetcher only then). */
    get enabled() { return !!settings.enabled; },
    /** This device's id in the fetcher role (an account's `fetcher` field). */
    get fetcherId() { return myFid(); },
    get where() { return ad ? ad.where : null; },
    get localDir() { return L.where; },
    get deviceId() { return device && device.deviceId; },
    get e2e() { return sec() ? e2e : null; },
    _debug: () => ({ meta, tree, remoteTree, peers, roles, e2e }),
  };
}
