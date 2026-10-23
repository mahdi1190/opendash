// lib/sync/live/live.mjs - live sync between paired devices: an edit on one
// shows on the other within about a second, with no server and no hosting
// (docs/dev/LIVE_SYNC.md).
//
// PLATFORM-AGNOSTIC: no node: imports. It drives the sync engine
// (lib/sync/engine.mjs) and talks to the world through adapters:
//   net         {listen({host, port, onConnection}), connect({host, port, timeoutMs})}
//               (lib/sync/live/node-net.mjs createNodeNet: TCP)
//   discovery   {start(onMessage), send(bytes), close()} or null (LAN announcements)
//   nat         lib/sync/live/nat.mjs createPortMapper, or null (no port mapping)
//   interfaces  () -> [{address, family, netmask, internal}]
//   local       this device's own files {read(name), write(name, text)} (live.json)
//
// THE CONNECTION LADDER (each rung is tried; the folder is always there):
//   1. same network: an address heard in a LAN announcement, or a LAN address
//      from the peer's address book (its encrypted device.json)
//   2. the internet: the public address and port the peer's router maps to it
//      (UPnP / NAT-PMP / PCP), or its global IPv6 address
//   3. neither: the sync folder (OneDrive), 10-60 s, as before
// Whichever side can reach the other dials; both may, and the link the
// device with the smaller id dialled is kept.
//
// On a link: the sealed records of the sync layer, exactly as written to the
// folder (`recs`), a catch-up of what the other missed when the link opens
// (`hi` / `recs`), how far each side is (`seen`), and the main-computer
// claims (`lease`). The engine takes live records through the same checks as
// folder ones and takes a record once however it arrives. A small new picture
// or narration clip (`blob`: the sealed blob file, lib/sync/blobs.mjs) goes to
// connected devices at once, paced; the folder carries it too.

import { createSession } from './session.mjs';
import { endpointsFrom, endpointsKey, cleanAddressRecord, dialOrder, pathOf, plainAddress, sameSubnet, parseV4 } from './addrbook.mjs';
import { encodeAnnounce, decodeAnnounce } from './discovery.mjs';
import { createLeases } from './lease.mjs';
import { MAX_FRAME } from './wire.mjs';

const ID_RE = /^[0-9a-f]{16}$/;
const BATCH_BYTES = 1024 * 1024;
const MAX_PENDING = 16;
const PER_IP_PER_MIN = 30;
const FOLDER_PUBLISH_MIN_MS = 10 * 1000;
const OFFLINE_MS = 10 * 60 * 1000;
const BLOB_QUEUE_MAX = 64;                   // pushed blobs waiting; past this the folder brings them
const BLOB_BYTES_PER_S = 4 * 1024 * 1024;    // well under a link's limit (wire.mjs createRateLimit)

export function createLive({
  engine, net, discovery = null, nat = null, interfaces = () => [], local = null,
  now = () => Date.now(), log = () => {}, timers = globalThis,
  port = 41731, bind = null, includeLoopback = false, platform = null,
  background = true, canFetch = () => true, extraRoles = ['phone'], canRun = () => true,
  tickMs = 1000, netCheckMs = 5000, dialTimeoutMs = 3000, announceMs = 30000, natLeaseS = 3600, natRetryMs = 30 * 60 * 1000,
  backoffMs = (n) => Math.min(60000, 1000 * 2 ** Math.max(0, n - 1)),
  sessionOpts = {}, leaseTiming = {},
} = {}) {
  if (!engine || !net) throw new Error('createLive needs {engine, net}');
  let settings = { enabled: true, internet: true, prefs: null, inboundOk: false };
  let started = false, ticking = false, tickTimer = null, again = false;
  let auth = null;                   // the PeerAuth of the current key (lib/sync/e2e.mjs liveAuth)
  let listener = null, listenError = null, listenRetryAt = 0, listenedAt = 0;
  const sessions = new Map();        // peerId -> open session
  const pending = new Set();         // sessions still in the handshake
  const peerState = new Map();       // peerId -> see ps()
  const inboundByIp = new Map();     // ip -> [times]
  const helloDone = new WeakSet();   // links whose 'hi' was answered
  let myEps = [], myEpKey = '', lastNetCheck = 0, netSig = '';
  let mapping = { state: 'off', method: null, external: null, renewAt: 0, reason: null, busy: false };
  let disc = { started: false, lastAt: 0, error: null };
  let leases = null, leaseMe = null, lastLiveMode = null;
  let lastFolderPublish = 0, lastPublishedKey = '', lastFolderLease = 0;
  const folderClaimSeen = new Map(); // peerId -> mtimeMs of the device.json its claims came from
  let eligibleCache = new Map(), eligibleAt = 0, eligibleKey = '';
  let passesSeen = 0, startedAt = 0, ticks = 0;
  let state = 'off', why = null;
  const stats = { pushed: 0, received: 0, lastPushAt: null, lastRecvAt: null, refusedPeers: 0, sessionsOpened: 0, blobsPushed: 0, blobsReceived: 0 };
  const blobQueue = [];
  let pumping = false;
  const unsubs = [];
  const say = (level, m) => { try { log(level, `live sync: ${m}`); } catch { /* fine */ } };
  const unref = (t) => { if (t && typeof t.unref === 'function') t.unref(); return t; };

  function ps(id) {
    let p = peerState.get(id);
    if (!p) { p = { attempts: 0, nextDialAt: 0, dialing: false, lastError: null, epKey: '', heard: [], openedAt: null, closedAt: null, path: null, address: null, theirSeen: 0, sentSeen: 0, dialFailedLan: false, triedAt: null, reachedUs: false, theyCouldNotReachUs: false }; peerState.set(id, p); }
    return p;
  }

  // ─── Settings (this device's own live.json) ──────────────────────────
  async function loadSettings() {
    if (!local) return;
    try {
      const t = await local.read('live.json');
      const s = t ? JSON.parse(t) : null;
      if (s && typeof s === 'object') settings = { enabled: s.enabled !== false, internet: s.internet !== false, prefs: s.prefs && Array.isArray(s.prefs.list) ? s.prefs : null, inboundOk: !!s.inboundOk };
    } catch { /* defaults */ }
  }
  async function saveSettings() { if (local) await local.write('live.json', JSON.stringify(settings, null, 1)).catch(() => {}); }

  // ─── Roles for the lease ─────────────────────────────────────────────
  function jobs() { try { return engine.jobs(); } catch { return { accounts: [], roles: {} }; } }
  function roleList() { return [...jobs().accounts.map(a => `fetch:${a.id}`), ...extraRoles]; }
  async function refreshEligible() {
    const key = JSON.stringify(jobs().accounts.map(a => [a.id, a.provider]));
    if (key === eligibleKey && now() - eligibleAt < 30000) return;
    eligibleKey = key; eligibleAt = now();
    const next = new Map();
    for (const a of jobs().accounts) { let ok = false; try { ok = background && !!(await canFetch(a)); } catch { ok = false; } next.set(`fetch:${a.id}`, ok); }
    // A role that is not an account ('phone', 'claude': answering remote requests) needs this device to run in the background, and canRun(role) (e.g. Claude works here).
    for (const r of extraRoles) { let ok = false; try { ok = !!background && !!(await canRun(r)); } catch { ok = false; } next.set(r, ok); }
    eligibleCache = next;
  }
  function pinOf(role) {
    const j = jobs();
    if (role.startsWith('fetch:')) {
      const a = j.accounts.find(x => `fetch:${x.id}` === role);
      return a && a.fetcherDeviceId ? { d: a.fetcherDeviceId, at: Date.parse(a.fetcherSince || '') || 1 } : null;
    }
    // ── host ── the 'claude' role is pinned to the Claude host (roles.json `claude`, else the main computer).
    const r = j.roles[role] || (role === 'claude' ? j.roles.main : null);
    return r && r.deviceId ? { d: r.deviceId, at: Date.parse(r.since || '') || 1 } : null;
  }
  function ensureLeases(me) {
    if (leases && leaseMe === me) return leases;
    leaseMe = me;
    leases = createLeases({
      me, now, roles: roleList, eligible: (r) => eligibleCache.get(r) === true, pin: pinOf, prefs: settings.prefs,
      onPrefs: (p) => { settings.prefs = p; saveSettings(); },
      timing: leaseTiming,
    });
    return leases;
  }
  /** For the engine: should this device fetch `accountId` now? null when the lease has no answer. */
  function oracle(accountId) {
    if (!leases || !leases.ready || !auth) return null;
    const role = `fetch:${accountId}`;
    if (!leases.roles().includes(role)) return null;
    const h = leases.holder(role);
    if (!h.deviceId) return null;
    return leases.isMain(role);
  }

  // ─── Links ───────────────────────────────────────────────────────────
  const initiatorOf = (s) => (s.role === 'initiator' ? auth && auth.deviceId : s.peerId);
  function attach(conn, role, peerId) {
    if (!auth) { conn.close(); return null; }
    if (pending.size >= MAX_PENDING) { conn.close(); return null; }
    const s = createSession({
      conn, role, auth, peerId, now, timers, ...sessionOpts,
      onOpen: (x) => { pending.delete(x); opened(x); },
      onMessage: (m, x) => onMessage(m, x),
      onClose: (reason, x, wasOpen) => { pending.delete(x); closed(x, reason, wasOpen); },
    });
    pending.add(s);
    return s;
  }
  function onConnection(conn) {
    const ip = plainAddress(conn.remote && conn.remote.address);
    const t = now();
    const list = (inboundByIp.get(ip) || []).filter(x => t - x < 60000);
    list.push(t);
    inboundByIp.set(ip, list);
    if (inboundByIp.size > 1000) inboundByIp.delete(inboundByIp.keys().next().value);
    if (list.length > PER_IP_PER_MIN || !started || state !== 'on') { conn.close(); return; }
    attach(conn, 'responder', null);
  }
  function opened(s) {
    const id = s.peerId;
    if (!auth || !auth.peer(id)) { stats.refusedPeers++; s.close('not-member'); return; }
    const cur = sessions.get(id);
    if (cur && cur !== s && cur.state === 'open') {
      const keep = initiatorOf(s) === (auth.deviceId < id ? auth.deviceId : id) ? s : cur;
      const drop = keep === s ? cur : s;
      sessions.set(id, keep);
      drop.close('duplicate');
      if (keep !== s) return;
    }
    sessions.set(id, s);
    stats.sessionsOpened++;
    const p = ps(id);
    p.attempts = 0; p.lastError = null; p.openedAt = now(); p.path = pathOf(s.remote && s.remote.address); p.address = plainAddress(s.remote && s.remote.address);
    if (s.role === 'responder') { p.reachedUs = true; if (!settings.inboundOk) { settings.inboundOk = true; saveSettings(); } }
    say('info', `live with ${nameOf(id)} (${p.path === 'lan' ? 'same network' : 'over the internet'}, ${s.role === 'initiator' ? 'dialled' : 'it dialled'})`);
    s.send({ t: 'hi', v: 1, seen: engine.liveSeen(id), seq: engine.seq, couldNotReachYou: !!p.dialFailedLan && s.role === 'responder' });
    if (leases) s.send({ t: 'lease', claims: leases.publish('live') });
    schedule(0);
  }
  function closed(s, reason, wasOpen) {
    const id = s.peerId;
    if (id && sessions.get(id) === s) {
      sessions.delete(id);
      const p = ps(id);
      p.closedAt = now();
      p.lastError = reason;
      p.nextDialAt = now() + (reason === 'duplicate' ? 2000 : 300);
      if (wasOpen && reason !== 'duplicate') say('info', `link to ${nameOf(id)} closed (${reason})`);
    }
    if (!wasOpen && reason !== 'duplicate' && s.role === 'responder') stats.refusedPeers += ['unknown', 'auth', 'tampered', 'format', 'group', 'not-for-me', 'version', 'key-mismatch'].includes(reason) ? 1 : 0;
  }
  async function onMessage(m, s) {
    const id = s.peerId;
    const p = ps(id);
    if (m.t === 'hi') {
      if (helloDone.has(s)) return;                  // once per link: a catch-up reads this device's own logs
      helloDone.add(s);
      if (m.couldNotReachYou === true) p.theyCouldNotReachUs = true;
      if (Number.isInteger(m.seen) && m.seen >= 0) await sendCatchUp(s, m.seen);
      return;
    }
    if (m.t === 'recs') {
      const items = Array.isArray(m.items) ? m.items.slice(0, 5000).filter(it => it && it.rec && it.rec.dev === id) : [];
      if (items.length && engine.deliverLive(items, id)) { stats.received += items.length; stats.lastRecvAt = now(); }
      return;
    }
    if (m.t === 'seen') { if (Number.isInteger(m.n) && m.n > p.theirSeen) p.theirSeen = m.n; return; }
    if (m.t === 'blob') {
      // A small picture or clip the other device just stored: checked against its id, then kept here.
      if (typeof engine.deliverBlob === 'function' && await engine.deliverBlob(m, id)) { stats.blobsReceived++; stats.lastRecvAt = now(); }
      return;
    }
    if (m.t === 'lease') {
      if (leases && leases.receive(id, m.claims, { via: 'live', recvAt: now() })) broadcastLease();
    }
  }
  async function sendCatchUp(s, seen) {
    const recs = await engine.ownRecordsAfter(seen).catch(() => []);
    if (recs.length) await sendRecords(s, recs);
  }
  async function sendRecords(s, items) {
    let batch = [], bytes = 0;
    for (const it of items) {
      const size = JSON.stringify(it).length + 8;
      if (size > MAX_FRAME - 1024) continue;           // too big for one frame: the folder brings it
      if (bytes + size > BATCH_BYTES && batch.length) { await s.send({ t: 'recs', items: batch }); batch = []; bytes = 0; }
      batch.push(it); bytes += size;
    }
    if (batch.length) await s.send({ t: 'recs', items: batch });
  }
  /** The engine wrote new records: to every open link, now. */
  function onRecords({ file, records }) {
    if (!sessions.size) return;
    const items = records.map(rec => ({ file, rec }));
    stats.pushed += items.length; stats.lastPushAt = now();
    for (const s of sessions.values()) sendRecords(s, items).catch(() => {});
  }
  /** The engine stored a small new blob: to every open link, one at a time (a burst would trip the receiver's rate limit). */
  function onBlob(m) {
    if (!sessions.size || !m || typeof m.data !== 'string' || blobQueue.length >= BLOB_QUEUE_MAX) return;
    blobQueue.push(m);
    pumpBlobs();
  }
  function pumpBlobs() {
    if (pumping) return;
    pumping = true;
    (async () => {
      while (blobQueue.length && started && sessions.size) {
        const b = blobQueue.shift();
        for (const s of [...sessions.values()]) await s.send(b).catch(() => false);
        stats.blobsPushed++; stats.lastPushAt = now();
        await new Promise((res) => unref(timers.setTimeout(res, Math.max(50, Math.ceil((b.data.length / BLOB_BYTES_PER_S) * 1000)))));
      }
    })().catch(() => {}).finally(() => {
      pumping = false;
      if (!started || !sessions.size) blobQueue.length = 0;     // nobody to send to: the folder brings them
      else if (blobQueue.length) pumpBlobs();
    });
  }
  function afterPass() {
    if (!started) return;
    passesSeen++;
    for (const [id, s] of sessions) {
      const n = engine.liveSeen(id);
      const p = ps(id);
      if (n > p.sentSeen) { p.sentSeen = n; s.send({ t: 'seen', n }); }
    }
    schedule(20);
  }
  function broadcastLease() {
    if (!leases) return;
    const claims = leases.publish('live');
    for (const s of sessions.values()) s.send({ t: 'lease', claims });
  }
  function closeAll(reason) { for (const s of [...sessions.values(), ...pending]) s.close(reason); sessions.clear(); pending.clear(); }

  // ─── Dialling ────────────────────────────────────────────────────────
  async function dial(id) {
    const p = ps(id);
    const ex = engine.peerExtra(id);
    const book = ex ? cleanAddressRecord(ex.live) : null;
    const order = dialOrder(book ? book.eps : [], { heard: p.heard, mine: interfaces() });
    if (!order.length) return;
    p.dialing = true; p.triedAt = now();
    let lanFailed = false;
    try {
      for (const ep of order.slice(0, 6)) {
        if (!started || sessions.has(id) || !auth || !auth.peer(id)) return;
        let conn;
        try { conn = await net.connect({ host: ep.a, port: ep.p, timeoutMs: dialTimeoutMs }); }
        catch (e) { p.lastError = (e && e.code) || 'unreachable'; if (ep.k === 'lan') lanFailed = true; continue; }
        const s = attach(conn, 'initiator', id);
        if (!s) return;
        const ok = await new Promise((res) => {
          const t0 = now();
          const check = () => { if (s.state === 'open') return res(true); if (s.state === 'closed' || now() - t0 > dialTimeoutMs * 2) return res(false); unref(timers.setTimeout(check, 15)); };
          check();
        });
        if (ok) { p.dialFailedLan = false; return; }
        p.lastError = s.why || 'refused';
        if (ep.k === 'lan') lanFailed = true;
        if (['key-mismatch', 'auth', 'unknown', 'version'].includes(s.why)) break;     // the right device, but not now: no point trying its other addresses
      }
      p.attempts++;
      p.dialFailedLan = lanFailed;
      p.nextDialAt = now() + backoffMs(p.attempts);
    } finally { p.dialing = false; }
  }

  // ─── LAN discovery ───────────────────────────────────────────────────
  async function onAnnounce(bytes, from) {
    if (!auth || !auth.tagKey) return;
    const r = await decodeAnnounce(bytes, { tagKey: auth.tagKey, members: auth.members(), self: auth.deviceId }).catch(() => null);
    if (!r) return;
    const p = ps(r.deviceId);
    const a = plainAddress(from.address);
    p.heard = [{ a, p: r.port, at: now() }, ...p.heard.filter(h => h.a !== a || h.p !== r.port)].slice(0, 3);
    if (!sessions.has(r.deviceId) && !p.dialing) { p.nextDialAt = 0; p.attempts = 0; }
    if (now() - disc.lastAt > 2000) announce();      // answer, so it finds this device too
    schedule(0);
  }
  async function announce() {
    if (!discovery || !disc.started || !auth || !listener) return;
    disc.lastAt = now();
    try { await discovery.send(await encodeAnnounce({ tagKey: auth.tagKey, deviceId: auth.deviceId, port: listener.port })); } catch (e) { disc.error = (e && e.code) || 'send'; }
  }

  // ─── The address book and the lease, published in device.json ───────
  function publishFolder(force = false) {
    const t = now();
    const lease = leases ? leases.publish('folder') : null;
    const rec = { v: 1, port: listener ? listener.port : null, eps: myEps, nat: { state: mapping.state }, at: t, ...(lease ? { lease } : {}) };
    const key = JSON.stringify([rec.port, endpointsKey(rec.eps), rec.nat.state, lease ? Object.keys(lease.roles).sort().map(r => [r, lease.roles[r].view, lease.roles[r].since]) : null, lease ? lease.prefs : null]);
    const leaseDue = lease && Object.keys(lease.roles).length && t - lastFolderLease >= leases.timing.folderRenew;
    if (!force && key === lastPublishedKey && !leaseDue) return;
    if (!force && t - lastFolderPublish < FOLDER_PUBLISH_MIN_MS && key === lastPublishedKey) return;
    lastPublishedKey = key; lastFolderPublish = t;
    if (lease) lastFolderLease = t;
    engine.setDeviceExtra(rec);
  }
  function readFolderClaims() {
    if (!leases || !auth) return false;
    let changed = false;
    for (const id of auth.members()) {
      const ex = engine.peerExtra(id);
      if (!ex || !ex.live || !ex.live.lease || folderClaimSeen.get(id) === ex.mtimeMs) continue;
      folderClaimSeen.set(id, ex.mtimeMs);
      if (leases.receive(id, ex.live.lease, { via: 'folder' })) changed = true;
    }
    return changed;
  }

  // ─── Port mapping ────────────────────────────────────────────────────
  function startMapping() {
    if (!nat || !settings.internet || !listener || mapping.busy) return;
    if (mapping.state !== 'off' && now() < mapping.renewAt) return;
    mapping.busy = true;
    if (mapping.state === 'off') mapping.state = 'trying';
    const want = mapping.external && mapping.external.port ? mapping.external.port : listener.port;
    nat.map({ internalPort: listener.port, externalPort: want, lease: natLeaseS }).then((r) => {
      if (!started) return;
      if (r.ok) {
        mapping = { ...mapping, state: r.reachable ? 'mapped' : (r.reason || 'not-reachable'), method: r.method, external: r.reachable ? r.external : null, reason: r.reason || null, renewAt: now() + (r.lease > 0 ? r.lease * 500 : natRetryMs) };
      } else {
        mapping = { ...mapping, state: r.reason === 'no-router-support' ? 'none' : (r.reason || 'none'), method: null, external: null, reason: r.reason || null, renewAt: now() + natRetryMs };
      }
    }).catch(() => { mapping = { ...mapping, state: 'none', renewAt: now() + natRetryMs }; }).finally(() => { mapping.busy = false; schedule(0); });
  }

  // ─── The loop ────────────────────────────────────────────────────────
  function schedule(ms = 0) {
    if (!started) return;
    if (ticking) { again = true; return; }
    unref(timers.setTimeout(() => tick().catch(() => {}), ms));
  }
  async function stopNetwork(reason) {
    closeAll(reason);
    if (listener) { const l = listener; listener = null; await l.close().catch(() => {}); }
    if (disc.started && discovery) { disc.started = false; await discovery.close().catch(() => {}); }
    if (nat && mapping.state !== 'off') { await nat.unmap().catch(() => {}); }
    mapping = { state: 'off', method: null, external: null, renewAt: 0, reason: null, busy: false };
    auth = null; myEps = []; myEpKey = '';
  }
  async function tick() {
    if (!started || ticking) return;
    ticking = true;
    ticks++;
    try {
      const e2e = engine.e2e;
      if (!settings.enabled) { if (state !== 'off') { state = 'off'; why = 'turned-off'; await stopNetwork('off'); } return; }
      if (!engine.active || !e2e || !e2e.ready) {
        if (state === 'on') await stopNetwork('no-key');
        state = 'waiting'; why = !engine.active ? 'sync-off' : !e2e ? 'not-encrypted' : 'no-key';
        return;
      }
      const a = await e2e.liveAuth();
      if (!a) { state = 'waiting'; why = 'no-key'; return; }
      if (!auth || a.kid !== auth.kid || a.deviceId !== auth.deviceId) {
        if (auth) { say('info', 'a new sync key: links start again'); closeAll('new-key'); }
        auth = a;
        folderClaimSeen.clear();
      } else auth = a;
      state = 'on'; why = null;
      ensureLeases(auth.deviceId);
      // Links to devices that are no longer members close at once.
      for (const [id, s] of sessions) if (!auth.peer(id)) { stats.refusedPeers++; s.close('removed'); }
      if (!listener && now() >= listenRetryAt) {
        try {
          listener = await net.listen({ host: bind, port, onConnection });
          listenError = null;
          listenedAt = now();
          say('info', `listening on port ${listener.port}`);
        } catch (e) { listenError = (e && e.code) || 'listen'; listenRetryAt = now() + 60000; say('warn', `cannot listen (${listenError}); this computer can still dial out`); }
      }
      // The network: addresses, port mapping, discovery.
      const t = now();
      if (t - lastNetCheck >= netCheckMs || !myEpKey) {
        lastNetCheck = t;
        const ifs = interfaces();
        const sig = ifs.filter(i => !i.internal).map(i => `${i.address}/${i.netmask}`).sort().join(',');
        if (sig !== netSig) {
          if (netSig) { say('info', 'the network changed'); if (nat) { nat.forgetRouter && nat.forgetRouter(); mapping.renewAt = 0; } for (const p of peerState.values()) { p.attempts = 0; p.nextDialAt = 0; } }
          netSig = sig;
          disc.lastAt = 0;
        }
      }
      if (listener) startMapping();
      // Bound to one address (tests: 127.0.0.1): that is the only way in.
      const bound = bind && bind !== '::' && bind !== '0.0.0.0' ? [{ address: bind, family: bind.includes(':') ? 'IPv6' : 'IPv4', netmask: bind.includes(':') ? 'ffff:ffff:ffff:ffff::' : '255.255.255.0', internal: false }] : null;
      myEps = listener ? endpointsFrom({ interfaces: bound || interfaces(), port: listener.port, mapped: mapping.state === 'mapped' ? mapping.external : null, includeLoopback }) : [];
      const k = endpointsKey(myEps);
      if (k !== myEpKey) { myEpKey = k; disc.lastAt = 0; }
      if (discovery && !disc.started && listener) {
        try { await discovery.start((b, from) => { onAnnounce(b, from); }); disc.started = true; disc.error = null; }
        catch (e) { disc.error = (e && e.code) || 'discovery'; }
      }
      if (disc.started && now() - disc.lastAt >= announceMs) await announce();
      // Roles and claims.
      await refreshEligible();
      const fromFolder = readFolderClaims();
      // Claims count once this device has read the folder and given live
      // links a moment to connect (so it never acts on half the picture).
      if (!leases.ready && passesSeen > 0 && now() - startedAt >= 1500) leases.setReady(true);
      const liveMode = sessions.size > 0;
      const renewed = leases.renew(liveMode, lastLiveMode !== liveMode);
      lastLiveMode = liveMode;
      if (renewed || fromFolder || leases.recompute()) broadcastLease();
      publishFolder();
      // Dial the members this device has no link to.
      for (const id of auth.members()) {
        const p = ps(id);
        if (sessions.has(id) || p.dialing) continue;
        const ex = engine.peerExtra(id);
        const book = ex ? cleanAddressRecord(ex.live) : null;
        const ek = book ? endpointsKey(book.eps) : '';
        if (ek !== p.epKey) { p.epKey = ek; p.attempts = 0; p.nextDialAt = 0; }        // it moved: try at once
        if (now() < p.nextDialAt) continue;
        if (!(book && book.eps.length) && !p.heard.length) continue;
        dial(id).catch(() => {}).finally(() => schedule(0));
      }
    } finally {
      ticking = false;
      if (again) { again = false; schedule(0); }
    }
  }

  // ─── Status (Settings > Sync) ────────────────────────────────────────
  function nameOf(id) { const e = engine.e2e; return (e && e.nameOf(id)) || 'another device'; }
  function peerRow(id) {
    const s = sessions.get(id);
    const p = ps(id);
    const ex = engine.peerExtra(id);
    const book = ex ? cleanAddressRecord(ex.live) : null;
    const lastSeen = ex ? ex.lastSeen : null;
    const row = { id, name: nameOf(id), live: !!s, path: s ? p.path : null, since: s ? p.openedAt : null, sent: s ? s.counts.sent : 0, received: s ? s.counts.received : 0, upToDate: s ? p.theirSeen >= engine.seq : null };
    if (s) return { ...row, state: 'live', reason: null };
    const sameLan = p.heard.some(h => now() - h.at < 5 * 60000) || (book && book.eps.some(e => e.k === 'lan' && interfaces().some(i => parseV4(plainAddress(i.address)) && sameSubnet(plainAddress(i.address), e.a, Math.min(e.m || 24, 24)))));
    const theirNat = book ? book.nat.state : null;
    const theyHaveWan = !!(book && book.eps.some(e => e.k === 'wan' || e.k === 'v6'));
    let reason;
    if (lastSeen && now() - lastSeen > OFFLINE_MS && !p.heard.some(h => now() - h.at < 60000)) reason = 'offline';
    else if (!book || !book.eps.length) reason = p.heard.length ? 'trying' : 'no-address';
    else if (p.dialing || (p.attempts === 0 && !p.lastError)) reason = 'trying';
    else if (p.lastError === 'key-mismatch') reason = 'new-key';
    else if (sameLan && platform === 'win32' && !settings.inboundOk) reason = 'firewall';
    else if (sameLan) reason = 'lan-blocked';
    else if (['cgnat', 'double-nat'].includes(theirNat) && ['cgnat', 'double-nat', 'none', 'refused', 'off'].includes(mapping.state)) reason = 'cgnat';
    else if (!theyHaveWan && mapping.state !== 'mapped') reason = 'router';
    else reason = 'unreachable';
    return { ...row, state: reason === 'trying' ? 'connecting' : 'not-live', reason, lastSeen, theirNat };
  }
  function status() {
    const members = auth ? auth.members() : [];
    const rolesOut = [];
    if (leases && auth) {
      const j = jobs();
      for (const h of leases.status()) {
        const acc = h.role.startsWith('fetch:') ? j.accounts.find(a => `fetch:${a.id}` === h.role) : null;
        rolesOut.push({ role: h.role, label: acc ? acc.label : h.role === 'phone' ? 'Answering your phone' : h.role === 'claude' ? 'Answering requests that need Claude' : h.role, deviceId: h.deviceId, name: h.deviceId ? (h.deviceId === auth.deviceId ? 'This computer' : nameOf(h.deviceId)) : null, me: h.me, acting: h.acting, until: h.until, eligible: eligibleCache.get(h.role) === true });
      }
    }
    const anyBlocked = members.some(id => ['firewall', 'lan-blocked'].includes(peerRow(id).reason));
    return {
      on: settings.enabled, state, why, internet: settings.internet,
      port: listener ? listener.port : null, listening: !!listener, listenError,
      reach: { state: mapping.state, method: mapping.method, external: mapping.external ? `${mapping.external.address}:${mapping.external.port}` : null, reason: mapping.reason },
      firewall: platform === 'win32' && !!listener && !settings.inboundOk && (anyBlocked || members.some(id => ps(id).theyCouldNotReachUs)),
      // Windows shows its "allow on private networks" question when OpenDash first listens.
      firewallHint: platform === 'win32' && !!listener && !settings.inboundOk && now() - listenedAt < 10 * 60 * 1000,
      peers: members.map(peerRow),
      roles: rolesOut,
      prefs: leases ? leases.prefs.list : [],
      discovery: discovery ? (disc.started ? 'on' : disc.error || 'off') : 'off',
      stats: { ...stats },
    };
  }

  // ─── Turning it on and off ───────────────────────────────────────────
  async function start() {
    if (started) return status();
    await loadSettings();
    started = true;
    startedAt = now();
    unsubs.push(engine.onRecords(onRecords), engine.onPass(afterPass));
    if (typeof engine.onBlobPush === 'function') unsubs.push(engine.onBlobPush(onBlob));
    engine.setLeaseOracle(oracle);
    engine.setLiveStatus(status);
    tickTimer = unref(timers.setInterval(() => tick().catch(() => {}), tickMs));
    await tick().catch(() => {});
    return status();
  }
  async function stop() {
    if (!started) return;
    started = false;
    if (tickTimer) timers.clearInterval(tickTimer);
    for (const u of unsubs.splice(0)) { try { u(); } catch { /* fine */ } }
    engine.setLeaseOracle(null);
    engine.setLiveStatus(null);
    await stopNetwork('stopping');
    state = 'off';
  }
  async function configure(patch = {}) {
    if (patch.enabled !== undefined) settings.enabled = !!patch.enabled;
    if (patch.internet !== undefined) {
      settings.internet = !!patch.internet;
      if (!settings.internet && nat && mapping.state !== 'off') { await nat.unmap().catch(() => {}); mapping = { state: 'off', method: null, external: null, renewAt: 0, reason: null, busy: false }; }
    }
    if (Array.isArray(patch.prefer) && leases) { settings.prefs = leases.setPrefs(patch.prefer.filter(x => ID_RE.test(x))); broadcastLease(); }
    await saveSettings();
    schedule(0);
    return status();
  }

  return {
    start, stop, status, configure, tick,
    isMain: (role) => !!(leases && leases.isMain(role)),
    get port() { return listener ? listener.port : null; },
    get leases() { return leases; },
    get sessions() { return sessions; },
    _debug: () => ({ peerState, mapping, myEps, auth, settings, passesSeen, ticks, ticking, startedAt, state, why }),
  };
}
