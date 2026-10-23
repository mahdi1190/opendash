// lib/sync/live/lease.mjs - the automatic "main computer" for a job (fetching
// one account's mail and calendar, answering the phone): a lease that moves
// to another device when its holder goes to sleep or offline, and comes back
// to the preferred one (docs/dev/LIVE_SYNC.md section 7).
//
// PLATFORM-AGNOSTIC: no node: imports, no timers (the caller ticks it).
//
// Every device that CAN do a job (eligible: it has its own sign-in for that
// account, it runs in the background) publishes a claim for its role:
//   {v:1, at, ttl, prefs:{list, at}, roles:{<role>: {since, view, pin}}}
//   since  when this device's current, unbroken claim began (incumbency)
//   view   who this device thinks holds the role now (its "ack")
//   pin    {d, at}: the device the user chose for this account ("Use this computer instead")
//   prefs  the order the user chose ("home laptop first"); the newest list wins everywhere
// Over a live link a claim lasts ttl = 30 s from when it ARRIVED and is renewed
// every 10 s; through the sync folder (device.json) it lasts 3 minutes from
// `at` and is renewed every 60 s. A device's newest message (by its own `at`)
// counts.
//
// The holder of a role is, among the devices with a valid claim: the pinned
// device, then the preference order, then the oldest `since`, then the id.
// Every device computes the same answer from the same claims. A device RUNS
// the job only when it is the holder AND every other valid claimant's view
// names it (they have merged its claim and agree): two devices never both
// act while they can still hear each other. A device whose own claim ran out
// (it slept) starts a new claim (a new `since`) and so does not snatch the
// role back unless it is preferred. A network split can leave both acting
// until it heals (two devices cannot outvote each other); then the same rule
// leaves one.

export const LIVE_RENEW_MS = 10 * 1000;
export const LIVE_TTL_MS = 30 * 1000;
export const FOLDER_RENEW_MS = 60 * 1000;
export const FOLDER_TTL_MS = 3 * 60 * 1000;
const ID_RE = /^[0-9a-f]{16}$/;
const ROLE_RE = /^(fetch:[^\s]{1,200}|phone|[a-z][a-z0-9-]{0,40})$/;
const MAX_ROLES = 200;

export function cleanPrefs(p) {
  if (!p || typeof p !== 'object' || !Array.isArray(p.list) || !Number.isFinite(p.at)) return { list: [], at: 0 };
  return { list: [...new Set(p.list.filter(x => ID_RE.test(x)))].slice(0, 32), at: p.at };
}
const newerPrefs = (a, b) => (a.at !== b.at ? a.at > b.at : JSON.stringify(a.list) > JSON.stringify(b.list));
const cleanPin = (p) => (p && typeof p === 'object' && ID_RE.test(p.d || '') && Number.isFinite(p.at) ? { d: p.d, at: p.at } : null);

/** A claim message from another device, checked, or null. */
export function cleanClaims(m) {
  if (!m || typeof m !== 'object' || m.v !== 1 || !Number.isFinite(m.at) || !Number.isFinite(m.ttl) || m.ttl < 100 || m.ttl > 10 * 60 * 1000) return null;
  const roles = {};
  let n = 0;
  for (const [role, r] of Object.entries(m.roles && typeof m.roles === 'object' ? m.roles : {})) {
    if (++n > MAX_ROLES) break;
    if (!ROLE_RE.test(role) || !r || typeof r !== 'object' || !Number.isFinite(r.since)) continue;
    roles[role] = { since: r.since, view: ID_RE.test(r.view || '') ? r.view : null, pin: cleanPin(r.pin) };
  }
  return { at: m.at, ttl: m.ttl, roles, prefs: cleanPrefs(m.prefs) };
}

export function createLeases({ me, now = () => Date.now(), roles = () => [], eligible = () => true, pin = () => null, prefs = null, onPrefs = () => {}, timing = {} }) {
  if (!ID_RE.test(me || '')) throw new Error('createLeases needs this device id');
  const T = { liveRenew: LIVE_RENEW_MS, liveTtl: LIVE_TTL_MS, folderRenew: FOLDER_RENEW_MS, folderTtl: FOLDER_TTL_MS, ...timing };
  const own = new Map();     // role -> {since, until}
  const peers = new Map();   // dev -> {live: claim, folder: claim}; claim = {at, exp, roles, prefs}
  const views = new Map();   // role -> the holder this device sees (what it publishes as its view)
  let myPrefs = cleanPrefs(prefs);
  let ready = false;
  let lastRenew = 0, lastMode = null;

  const roleList = () => [...new Set(roles())].filter(r => ROLE_RE.test(r)).slice(0, MAX_ROLES);
  const newest = (e) => (!e ? null : !e.live ? e.folder : !e.folder ? e.live : e.live.at >= e.folder.at ? e.live : e.folder);

  function candidates(role, t) {
    const out = [];
    const o = own.get(role);
    if (ready && eligible(role) && o && o.until > t) out.push({ dev: me, since: o.since, view: views.get(role) || null, pin: cleanPin(pin(role)) });
    for (const [dev, e] of peers) {
      const c = newest(e);
      if (!c || c.exp <= t || !c.roles[role]) continue;
      out.push({ dev, ...c.roles[role], exp: c.exp });
    }
    return out;
  }
  function winnerOf(cands) {
    if (!cands.length) return null;
    let pinned = null;
    for (const c of cands) if (c.pin && (!pinned || c.pin.at > pinned.at || (c.pin.at === pinned.at && c.pin.d > pinned.d))) pinned = c.pin;
    const order = myPrefs.list;
    const rank = (d) => (pinned && pinned.d === d ? -1 : order.includes(d) ? order.indexOf(d) : order.length);
    return [...cands].sort((a, b) => (rank(a.dev) - rank(b.dev)) || (a.since - b.since) || (a.dev < b.dev ? -1 : a.dev > b.dev ? 1 : 0))[0];
  }

  /** Work out every role's holder again; true when this device's views changed (publish soon). */
  function recompute() {
    const t = now();
    let changed = false;
    for (const role of roleList()) {
      const w = winnerOf(candidates(role, t));
      const v = w ? w.dev : null;
      if ((views.get(role) || null) !== v) { views.set(role, v); changed = true; }
    }
    for (const role of [...views.keys()]) if (!roleList().includes(role)) { views.delete(role); changed = true; }
    return changed;
  }

  /**
   * Renew this device's claims when due. liveMode: live links are open (10 s
   * renewals, 30 s expiry) or not (60 s, 3 minutes). Returns true when it renewed.
   */
  function renew(liveMode, force = false) {
    const t = now();
    const every = liveMode ? T.liveRenew : T.folderRenew;
    if (!force && lastMode === liveMode && t - lastRenew < every) return false;
    lastRenew = t; lastMode = liveMode;
    const ttl = liveMode ? T.liveTtl : T.folderTtl;
    for (const role of roleList()) {
      if (!eligible(role)) { own.delete(role); continue; }
      const o = own.get(role);
      // A new claim (the first, or after a lapse: this device slept); else the
      // same claim runs on (moving to live links shortens it: they expire us sooner).
      if (!o || o.until <= t) own.set(role, { since: t, until: t + ttl });
      else o.until = t + ttl;
    }
    for (const role of [...own.keys()]) if (!roleList().includes(role)) own.delete(role);
    recompute();
    return true;
  }

  /** The message to send: over a live link (via 'live') or into device.json (via 'folder'). */
  function publish(via = 'live') {
    const t = now();
    const out = { v: 1, at: t, ttl: via === 'live' ? T.liveTtl : T.folderTtl, prefs: myPrefs, roles: {} };
    if (!ready) return out;
    for (const [role, o] of own) {
      if (o.until <= t || !eligible(role)) continue;
      out.roles[role] = { since: o.since, view: views.get(role) || null, pin: cleanPin(pin(role)) };
    }
    return out;
  }

  /** Another device's claims (via 'live' or 'folder'). Returns true when anything this device sees changed. */
  function receive(dev, msg, { via = 'live', recvAt = now() } = {}) {
    if (!ID_RE.test(dev || '') || dev === me) return false;
    const c = cleanClaims(msg);
    if (!c) return false;
    const e = peers.get(dev) || {};
    const prev = e[via];
    if (prev && prev.at > c.at) return false;                      // older than what we have
    e[via] = { at: c.at, exp: via === 'live' ? recvAt + c.ttl : c.at + c.ttl, roles: c.roles, prefs: c.prefs };
    peers.set(dev, e);
    if (c.prefs.at && newerPrefs(c.prefs, myPrefs)) { myPrefs = c.prefs; try { onPrefs(myPrefs); } catch { /* fine */ } }
    return recompute();
  }
  function forget(dev) { peers.delete(dev); return recompute(); }

  /** Should THIS device run the job for `role` now? */
  function isMain(role) {
    if (!ready) return false;
    const t = now();
    const cands = candidates(role, t);
    const w = winnerOf(cands);
    if (!w || w.dev !== me) return false;
    return cands.every(c => c.dev === me || c.view === me);
  }
  /** {deviceId, me, acting, until, waitingFor:[ids]} for a role (deviceId null: nobody can). */
  function holder(role) {
    const t = now();
    const cands = candidates(role, t);
    const w = winnerOf(cands);
    if (!w) return { role, deviceId: null, me: false, acting: false, until: null, waitingFor: [], candidates: 0 };
    const waiting = cands.filter(c => c.dev !== w.dev && c.view !== w.dev).map(c => c.dev);
    const until = w.dev === me ? (own.get(role) || {}).until || null : w.exp || null;
    return { role, deviceId: w.dev, me: w.dev === me, acting: !waiting.length, until, waitingFor: waiting, candidates: cands.length };
  }

  function setPrefs(list) {
    myPrefs = cleanPrefs({ list, at: Math.max(now(), myPrefs.at + 1) });
    recompute();
    return myPrefs;
  }

  return {
    renew, publish, receive, forget, recompute, isMain, holder, setPrefs, timing: T,
    setReady(v = true) { ready = !!v; recompute(); },
    get ready() { return ready; },
    get prefs() { return { ...myPrefs, list: [...myPrefs.list] }; },
    roles: roleList,
    status: () => roleList().map(holder),
    _debug: () => ({ own, peers, views }),
  };
}
