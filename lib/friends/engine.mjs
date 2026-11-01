// lib/friends/engine.mjs - the OpenDash Friends service (docs/dev/FRIENDS.md):
// the handshake, the message channel, handlers, presence, direct links,
// remove and block. One per data folder; server/routes/friends.mjs makes it
// and puts it on app.ctx.friends.
//
// Security (FRIENDS.md section 1):
//   - the identity comes from the secret store (lib/friends/store.mjs); no key,
//     token or nonce ever leaves through a view, an event or a log line
//   - everything that arrives is: an envelope of the right shape -> opened with
//     the pair key (or as a request) -> its inner from/to checked -> its kind's
//     schema (core.mjs checkBody) -> only then stored, emitted or handed to a
//     handler. Anything else is dropped and only COUNTED.
//   - only confirmed friends may send anything but the handshake; blocked ids
//     are dropped at the door
//   - nothing here calls Claude, the actions layer, MCP, connectors, accounts
//     or remote jobs, and nothing a friend sends changes the state file
//   - handlers run one message at a time (a queue), so two messages of one
//     friend never race on their record

import { AsyncLocalStorage } from 'node:async_hooks';
import {
  ID_RE, MSG_ID_RE, newMsgId, newNonce, makeCard, publicIdentity, parseFriendCode, newFriendCode,
  codeKey, sealCardForCode, openCardForCode, makeInvite, parseInvite, checkInvite, inviteProof, checkInviteProof,
  newShortToken, shortInviteKey, shortInviteLink, sealShortInvite, openShortInvite, parseShortInvite,
  commitOf, confirmCode, formatConfirmCode, sealPair, openPair, sealRequest, openRequest, sealForGroup,
  cleanEnvelope, createClock, createSeen, kindDef, checkBody, scopeOf, defineKind, sealAtRest, openAtRest,
  pairSecret, presenceNow, PRESENCE_STATES, PRESENCE_TTL_MS, friendshipStats, cleanLine, isToken, isMbox,
  cleanOrigin, cleanRelayRef, SAFE_ID_RE, kindOk, verifyCard, firstName, signRekey, verifyRekey,
  liveCodeKey, sealCardForLive, openCardForLive,
} from './core.mjs';
import { newShortCode, parseShortCode } from '../sync/e2e-crypto.mjs';
import {
  ensureIdentity, loadIdentity, allIdentities, readDoc, updateDoc, homeRelay, listRelays, setRelay,
  normEntry, rotateIdentityKeys, retiredIdentities, retiredIds, resealRelayTokens, RETIRED_KEEP_MS,
} from './store.mjs';
import { createRelayClient, relaySupport, relayErrorText } from './relay-client.mjs';

const DAY = 86400000;
const UNDO_MS = 10000;
const PULL_MS = 60000, PULL_IDLE_MS = 5 * 60000;
// Presence is sent when it changes and every 2 hours (each send is one post per friend; a drop token allows 100 a day).
const PRESENCE_BEAT_MS = 2 * 3600000, PRESENCE_SEND_TTL = 3 * 3600000;
const ADDR_EVERY_MS = 6 * 3600000;
// "Show my friend code" (2.20.1): 4 letters, live 10 minutes, single use. A request can reach me a little after
// that (the relay only hands out the code while it is live; my next pull may be a minute away). The drop token
// outlives it: the friend needs it to finish the handshake, however long I take to press Accept.
const LIVE_CODE_MS = 10 * 60000, LIVE_LATE_MS = 5 * 60000, LIVE_DROP_MS = 24 * 3600000;
const OUTBOX_DAYS = 14;
// A stored message older than this is not taken (a replay: pair keys are static, so an old envelope still
// opens). The oldest a real one gets: OUTBOX_DAYS in the sender's outbox, then 30 days in a relay mailbox.
const MSG_MAX_AGE_MS = (OUTBOX_DAYS + 31) * DAY;
// friend:* messages must move a friend's logical clock forward (lcIn on their record, synced), give or take
// this much for the sender's other computers whose clocks run a little behind.
const LC_SLACK_MS = 10 * 60000;
// Revocations (drop tokens, relay members) the relay did not confirm are tried again (local.revokes) this long.
const REVOKE_KEEP_MS = 400 * DAY;
// Relay upkeep: drop tokens a friend holds into my mailbox are renewed after DROP_RENEW_MS (they run 365 days);
// members of my connection who are friends run out MEMBER_EXP_MS after the last renewal (renewed once less than
// MEMBER_RENEW_MS is left); members an invite let in who are not friends (any more) run out after LEFT_EXP_MS.
const UPKEEP_MS = 6 * 3600000, DROP_RENEW_MS = 180 * DAY, MEMBER_EXP_MS = 180 * DAY, MEMBER_RENEW_MS = 150 * DAY, LEFT_EXP_MS = 60 * DAY;
const MAX_INCOMING = 20, MAX_INCOMING_GROUP = 8;   // one group cannot fill the queue real friend requests wait in
// A friend made through a group starts here: nothing crosses by itself but the name they already know me by, and no direct link (which would show addresses).
// Each stays off until I choose otherwise (lib/friends/share.mjs, docs/dev/GROUPS.md).
const GROUP_FRIEND_PERMS = Object.freeze({ profile: false, game: false, garden: false, presence: false, direct: false });
// Live kinds (core.mjs LIVE_*): a fresh message from a friend means they are online now; over the
// relay a live message is a mailbox post, so it goes at most every 3 seconds and 30 times a day per
// friend; the rest waits for a direct link or is dropped. A knock and its answer (def.knock) are the
// few the whole visit hangs on: they have their own, larger count (the relay stopped limiting an
// approved friend's drop token in 2.27.8; a flood is held by each kind's rate), and a send that does
// not go says why (sendLive's `why`) instead of vanishing.
const LIVE_HEARD_MS = 2 * 60000;
const LIVE_RELAY_GAP_MS = 3000, LIVE_RELAY_DAY = 30, LIVE_KNOCK_DAY = 200;
const LIVE_WAKE_MS = 4000;   // a gate that is waiting reads the mailbox and reopens a dropped live connection at most this often
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const fail = (code, message) => Object.assign(new Error(message), { status: 400, code });
const NO_RELAY = "Friends connect through a small private service you set up once (it's free). Open Settings > Your connection to friends, or paste a friend's invite.";

const jobScope = new AsyncLocalStorage();
const SERIAL_STUCK_MS = 120000;

export function createFriendsEngine({ dataDir, log = () => {}, now = Date.now, emit = () => {}, getName = () => '', zone = () => null, direct = null, timers = globalThis }) {
  let local = null;                    // friends/local.json (this computer)
  let clock = null, seen = null;
  let started = false, stopping = false, tick = null, localDirty = false, localTimer = null;
  let tags = new Map();                // "<identity id>|<pair tag>" -> {id, x, moved?}
  let movedIds = new Set();            // old ids of friends who renewed their keys (FRIENDS.md section 15)
  let knownId = null;                  // the identity this engine last ran as (a change: a renewal)
  const rotatedFns = new Set(), rekeyFns = new Set();
  let peerMap = new Map();             // friend id -> {id, x}: who a direct link may be made with (sync: the handshake asks)
  let chain = Promise.resolve();       // one thing at a time (messages and actions)
  let pageState = 'online', lastPresence = { s: null, at: 0 };
  let lastPull = 0, pulling = null, liveStops = new Map(), liveState = new Map(), lastUpkeep = 0, lastWake = 0;
  let policy = null;
  let groupHook = null;                // lib/friends/groups.mjs: {okRequest(card, gid, gp), autoAccept(gid), nameIn(gid), via(gid, ed, env)}: someone in a group of mine
  const handlers = new Map();          // kind | 'prefix:*' | '*' -> Set(fn)
  const removedFns = new Set(), changeFns = new Set();
  const clients = new Map();           // origin -> relay client (for the current identity)
  let clientsFor = null;
  // Live kinds: in memory only (never stored).
  const liveSeen = new Map();          // message id -> when (dedupe without writing local.json)
  const heard = new Map();             // friend id -> when a fresh message from them last arrived
  const liveOut = new Map(), liveIn = new Map();   // "<friend>|<kind>" -> [times] (rate windows)
  const liveRelay = new Map();         // friend id -> {last, day, n}: live posts through their relay
  let liveRoad = null;                 // set by lib/friends/live.mjs: {has(id), send(id, env) -> bool}: a session's own road for live kinds
  let liveCtx = null;                  // {at, fr, me}: a 3-second cache for live sends
  // Added BY CODE, the requester compares the check code too (2.17.1, FRIENDS.md section 6): what the
  // other side sends after approving, before "The codes match" here, waits in memory and is handled then
  // (dropped on "The codes are different"). friend id -> [{m, identity, via}]
  const held = new Map();
  // The live friend code on screen (in memory only: a restart ends it, and the relay drops it by itself):
  // {code, key, exp, origin, mbox, drop}
  let liveCode = null;
  const HELD_MAX = 100;
  // One job at a time. A job that waits for another job from inside (a message handler sending a reply) runs at once, because
  // queueing behind itself would stop Friends for good; and one that never finishes lets the queue move on after SERIAL_STUCK_MS.
  const serial = (fn) => {
    const run = async () => { await loadLocal(); return fn(); };
    const inside = jobScope.getStore();
    if (inside && inside.active) return run();
    let free;
    const next = new Promise((res) => { free = res; });
    const job = async () => {
      const me = { active: true };
      const t = setTimeout(() => { log('warn', 'friends: a job took too long, so the next one goes ahead'); free(); }, SERIAL_STUCK_MS);
      if (t && t.unref) t.unref();
      try { return await jobScope.run(me, run); } finally { me.active = false; clearTimeout(t); free(); }
    };
    const p = chain.then(job, job);
    chain = next;
    return p;
  };
  const count = (k) => { if (!local) return; local.counts[k] = (Number(local.counts[k]) || 0) + 1; dirtyLocal(); };
  /** A sliding-window rate check: true (and counted) when one more fits {sec, min}. */
  function rateOk(map, key, rate, t) {
    let w = map.get(key);
    if (!w) { w = []; map.set(key, w); if (map.size > 4000) map.delete(map.keys().next().value); }
    while (w.length && t - w[0] >= 60000) w.shift();
    if (w.length >= rate.min) return false;
    let s = 0;
    for (let i = w.length - 1; i >= 0 && t - w[i] < 1000; i--) s++;
    if (s >= rate.sec) return false;
    w.push(t);
    return true;
  }

  // ─── Small helpers ─────────────────────────────────────────────────────
  const fmts = new Map();
  function dayOf(ts) {
    const z = zone() || '';
    let f = fmts.get(z);
    if (!f) {
      try { f = new Intl.DateTimeFormat('en-CA', { timeZone: z || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }); }
      catch { f = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
      fmts.set(z, f);
    }
    return f.format(new Date(Number(ts)));
  }
  function dirtyLocal() {
    localDirty = true;
    if (localTimer) return;
    localTimer = timers.setTimeout(() => { localTimer = null; saveLocal().catch(() => {}); }, 1500);
    if (localTimer && localTimer.unref) localTimer.unref();
  }
  async function saveLocal() {
    if (!local || !localDirty) return;
    localDirty = false;
    seen.prune();
    local.seen = seen.toJSON();
    local.lc = clock.value;
    const snap = local;
    await updateDoc(dataDir, 'local', () => snap);
  }
  async function loadLocal() {
    if (local) return local;
    local = await readDoc(dataDir, 'local');
    clock = createClock(local.lc, now);
    seen = createSeen({ from: local.seen, now });
    return local;
  }
  async function client(origin) {
    const identity = await loadIdentity(dataDir);
    if (!identity) throw fail('NO_IDENTITY', 'Open Friends first.');
    if (clientsFor !== identity.id) { clients.clear(); clientsFor = identity.id; }
    const o = cleanOrigin(origin);
    if (!o) throw fail('BAD_RELAY', "That relay address can't be used.");
    if (!clients.has(o)) clients.set(o, createRelayClient({ origin: o, identity }));
    return clients.get(o);
  }
  /** A relay client acting as a given identity (an old one a key renewal left behind, FRIENDS.md section 15). */
  const clientsAs = new Map();
  function clientAs(identity, origin) {
    const o = cleanOrigin(origin);
    if (!o) throw fail('BAD_RELAY', "That relay address can't be used.");
    const k = `${identity.id}|${o}`;
    if (!clientsAs.has(k)) { clientsAs.set(k, createRelayClient({ origin: o, identity })); if (clientsAs.size > 32) clientsAs.delete(clientsAs.keys().next().value); }
    return clientsAs.get(k);
  }
  async function retiredById(id) { const r = (await retiredIdentities(dataDir)).find(x => x.identity.id === id); return r ? r.identity : null; }
  /** The client that may read or manage a mailbox: the old identity for a mailbox a renewal left behind, else the current one. */
  async function clientForBox(origin, mbox) {
    const o = cleanOrigin(origin);
    const b = local && local.retiredBoxes.find(x => x.origin === o && x.mbox === mbox);
    if (b) { const old = await retiredById(b.id); if (old) return clientAs(old, o); }
    return client(o);
  }
  const relayFail = (e) => { const x = fail(e && e.code === 'RELAY_UNAVAILABLE' ? 'RELAY_UNAVAILABLE' : 'RELAY', relayErrorText(e)); x.relayError = e && e.relayError; return x; };
  async function myName() {
    const me = await readDoc(dataDir, 'me');
    return cleanLine(me.prefs.name || getName() || '', 60);
  }
  async function myCard(identity) {
    const home = await homeRelay(dataDir);
    // Only what the handshake needs: keys, the mailbox, the first name (the directory card can be opened by whoever guesses the code).
    return makeCard(identity, { name: firstName(await myName()), relay: home && home.mbox ? { origin: home.origin, mbox: home.mbox } : null, now });
  }
  const pub = (i) => ({ id: i.id, x: i.x.pub, ed: i.ed.pub });
  /** The avatar a live-code request brought, only if it passes as a profile would. */
  const lookOf = (text, name) => {
    try { const c = checkBody('profile', { name: name || 'Friend', avatar: JSON.parse(text) }); return c && c.avatar ? { avatar: c.avatar } : null; }
    catch { return null; }
  };
  async function ensureMailbox(home) {
    if (home.mbox) return home.mbox;
    let r;
    try { r = await (await client(home.origin)).mailbox(); } catch (e) { throw relayFail(e); }
    await setRelay(dataDir, { origin: home.origin, role: home.role, scopes: home.scopes, mbox: r.mbox }, { home: home.home });
    return r.mbox;
  }
  async function needHome() {
    const home = await homeRelay(dataDir);
    if (!home) throw fail('NO_RELAY', NO_RELAY);
    const R = local && local.rotation;
    if (R && R.step === 'member' && !R.memberReady && R.origin === home.origin) throw fail('WAITING_RELAY', `Your new keys are waiting for the owner of ${home.host} to let them in. Invites and friend codes work again once they have.`);
    return { ...home, mbox: await ensureMailbox(home) };
  }
  /** A fresh drop token for one friend into my home mailbox -> {origin, mbox, drop}. */
  async function mintMyDrop(ttlMs = 365 * DAY) {
    const home = await needHome();
    let d;
    try { d = await (await client(home.origin)).mintDrop(home.mbox, { ttlMs }); } catch (e) { throw relayFail(e); }
    return { origin: home.origin, mbox: home.mbox, drop: d.token };
  }
  const sealDrop = (identity, label, v) => sealAtRest(identity, v, `drop|${label}`);
  /** A secret sealed at rest: with `identity`, else any identity this device still holds (sealed before a key renewal reached here). */
  async function openSealed(identity, sealed, label) {
    if (!sealed) return null;
    let v = identity ? await openAtRest(identity, sealed, label) : null;
    if (v) return v;
    for (const i of await allIdentities(dataDir)) {
      if (identity && i.id === identity.id) continue;
      v = await openAtRest(i, sealed, label);
      if (v) return v;
    }
    return null;
  }
  const openDrop = async (identity, label, sealed) => {
    if (!sealed) return null;
    const v = await openSealed(identity, sealed, `drop|${label}`);
    return v && cleanOrigin(v.origin) && isMbox(v.mbox) && isToken(v.drop) ? { origin: cleanOrigin(v.origin), mbox: v.mbox, drop: v.drop } : null;
  };
  /** A drop token taken back; when the relay can't say yes now, the background pass tries again (local.revokes). -> true when done. */
  async function revokeDropSealed(identity, label, sealed, { queue = true } = {}) {
    const d = await openDrop(identity, label, sealed);
    if (!d) return true;
    try { await (await clientForBox(d.origin, d.mbox)).revokeDrop(d.mbox, d.drop); return true; } catch (e) {
      log('warn', `friends: a drop token could not be revoked yet (${e && (e.relayError || e.code)}); trying again later`);
      if (queue) await queueRevoke({ t: 'drop', label, sealed });
      return false;
    }
  }
  /** Every drop token a friend was given into my mailbox (the current one, and older ones a renewal left running). */
  async function revokeMyDrops(identity, f) {
    if (!f.myDrop) return;
    if (f.myDrop.sealed) await revokeDropSealed(identity, `mine|${f.id}`, f.myDrop.sealed);
    for (const old of f.myDrop.prev || []) await revokeDropSealed(identity, `mine|${f.id}`, old);
  }
  /** A member taken off my connection; retried by the background pass until the relay confirms. -> true when done. */
  async function revokeMemberOn(origin, ed, { queue = true } = {}) {
    try { await (await client(origin)).revokeMember(ed); return true; } catch (e) {
      log('info', `friends: relay access not revoked yet (${e && (e.relayError || e.code)}); trying again later`);
      if (queue) await queueRevoke({ t: 'member', origin: cleanOrigin(origin), ed });
      return false;
    }
  }
  const sameJob = (a, b) => a.t === b.t && (a.t === 'member' ? a.origin === b.origin && a.ed === b.ed : a.label === b.label && a.sealed.ct === b.sealed.ct);
  async function queueRevoke(job) {
    await loadLocal();
    if (!job || (job.t === 'member' && !job.origin)) return;
    local.revokes = (local.revokes || []).filter(x => !sameJob(x, job));
    local.revokes.push({ ...job, at: now(), tries: 0, next: now() + 60000 });
    if (local.revokes.length > 500) local.revokes = local.revokes.slice(-500);
    dirtyLocal();
  }
  /** The background pass: revocations the relay has not confirmed yet, tried again with a growing wait. */
  async function retryRevokes() {
    if (!local || !local.revokes || !local.revokes.length) return;
    const identity = await loadIdentity(dataDir);
    if (!identity) return;
    const home = await homeRelay(dataDir);
    const fr = Object.values(await getFriends());
    const keep = [];
    for (const job of local.revokes) {
      if (job.at < now() - REVOKE_KEEP_MS) continue;
      if (job.next > now()) { keep.push(job); continue; }
      let done;
      if (job.t === 'member') {
        // not my connection any more, or they are back (friends again, or a request in progress): nothing to take back
        if (!home || home.role !== 'owner' || home.origin !== job.origin) continue;
        if (fr.some(f => f.ed === job.ed && ['friend', 'incoming', 'requested'].includes(f.status))) continue;
        done = await revokeMemberOn(job.origin, job.ed, { queue: false });
      } else done = await revokeDropSealed(identity, job.label, job.sealed, { queue: false });
      if (done) continue;
      job.tries = (job.tries || 0) + 1;
      job.next = now() + Math.min(6 * 3600000, 60000 * 2 ** Math.min(9, job.tries));
      keep.push(job);
    }
    local.revokes = keep;
    dirtyLocal();
  }

  // ─── Friends file ──────────────────────────────────────────────────────
  const getFriends = async () => (await readDoc(dataDir, 'friends')).friends;
  async function putFriend(id, fn) {
    let out = null;
    await updateDoc(dataDir, 'friends', async (d) => {
      const cur = d.friends[id] ? { ...d.friends[id] } : null;
      const nx = await fn(cur);
      if (nx === undefined) { out = cur; return undefined; }
      if (nx === null) { delete d.friends[id]; out = null; return d; }
      d.friends[id] = { ...nx, id, updatedAt: now() };
      out = d.friends[id];
      return d;
    });
    await refreshTags();
    changed();
    return out;
  }
  async function refreshTags() {
    const ids = await allIdentities(dataDir);
    const doc = await readDoc(dataDir, 'friends');
    const fr = doc.friends;
    const next = new Map();
    for (const i of ids) {
      for (const f of Object.values(fr)) {
        if (!['friend', 'incoming', 'requested'].includes(f.status)) continue;
        try { const { tag } = await pairSecret(i, f.x); next.set(`${i.id}|${tag}`, { id: f.id, x: f.x }); } catch { /* a bad key: never opens */ }
      }
      // Friends who renewed their keys: their OLD pair still opens, but only so a second, different
      // renewal of the same old id is seen (and freezes the friendship); anything else from it is dropped.
      for (const [oldId, mv] of Object.entries(doc.moved)) {
        if (fr[oldId] || mv.conflict) continue;
        try { const { tag } = await pairSecret(i, mv.x); if (!next.has(`${i.id}|${tag}`)) next.set(`${i.id}|${tag}`, { id: oldId, x: mv.x, moved: true }); } catch { /* never opens */ }
      }
    }
    movedIds = new Set(Object.keys(doc.moved).filter(k => !fr[k]));
    tags = next;
    const me = await readDoc(dataDir, 'me');
    const peers = new Map();
    for (const f of Object.values(fr)) if (f.status === 'friend' && await allowed(f, 'direct', me)) peers.set(f.id, { id: f.id, x: f.x });
    peerMap = peers;
    if (direct) direct.refresh();
  }
  function changed(what = 'changed') {
    liveCtx = null;
    try { emit('friends', { type: what }); } catch { /* no open tabs */ }
    for (const fn of changeFns) { try { fn(what); } catch { /* fine */ } }
  }
  const defaultAllowed = (f, scope, me) => {
    if (!f || f.status !== 'friend') return false;
    if (scope === 'presence' && !me.prefs.presence.share) return false;   // the tab's switch AND the friend's scope
    if (f.perms && typeof f.perms[scope] === 'boolean') return f.perms[scope];
    if (scope === 'presence') return true;
    if (scope === 'direct') return me.prefs.direct !== false;
    return true;
  };
  async function allowed(f, scope, me = null) {
    const m = me || await readDoc(dataDir, 'me');
    const def = defaultAllowed(f, scope, m);
    if (!f || f.status !== 'friend') return false;
    if (!policy) return def;
    if (scope === 'presence' && !m.prefs.presence.share) return false;
    if (scope === 'direct' && m.prefs.direct === false) return false;
    try { const r = await policy(publicFriend(f), scope, { allowed: def }); return typeof r === 'boolean' ? r : def; } catch { return def; }
  }
  /** What a handler or another agent may see of a friend: no keys, no tokens, no handshake. */
  const publicFriend = (f) => (f ? { id: f.id, name: f.name, nick: f.nick || '', status: f.status, friendsAt: f.friendsAt || 0, addedAt: f.addedAt || 0, perms: { ...(f.perms || {}) } } : null);

  // ─── Delivery ──────────────────────────────────────────────────────────
  async function routeOf(identity, f) { return openDrop(identity, `friend|${f.id}`, f.dropSealed); }
  /** -> 'direct' | 'relay' | 'queued' | 'failed' */
  async function deliver(identity, f, env, { queue = true } = {}) {
    if (direct && f.status === 'friend' && direct.isOpen(f.id)) { if (await direct.send(f.id, env)) return 'direct'; }
    // Asked through a group: until someone accepts, the handshake stays inside it. An address the asker names is never called.
    if (f.how === 'group' && f.status !== 'friend' && f.flow && f.flow.g && groupHook && groupHook.via) {
      try { await groupHook.via(f.flow.g, f.ed, env); return 'relay'; }
      catch (e) { if (queue) enqueue(f.id, env, e && e.retryAfter); return queue ? 'queued' : 'failed'; }
    }
    const r = await routeOf(identity, f);
    if (!r) { if (queue) enqueue(f.id, env); return queue ? 'queued' : 'failed'; }
    try { await (await client(r.origin)).post(r.mbox, r.drop, env); return 'relay'; }
    catch (e) {
      if (e && (e.status === 403 || e.status === 410 || e.code === 'ENOTPUBLIC' || e.code === 'BAD_RELAY')) { count('undeliverable'); return 'failed'; }
      if (queue) enqueue(f.id, env, e && e.retryAfter);
      return queue ? 'queued' : 'failed';
    }
  }
  function enqueue(to, env, retryAfter = null) {
    if (!local) return;
    if (local.outbox.some(x => x.id === env.id && x.to === to)) return;
    if (local.outbox.length >= 500) local.outbox.shift();
    local.outbox.push({ id: env.id, to, env, tries: 0, next: now() + Math.max(60000, (retryAfter || 0) * 1000), exp: now() + OUTBOX_DAYS * DAY, at: now() });
    dirtyLocal();
  }
  async function flushOutbox(onlyTo = null) {
    if (!local || !local.outbox.length) return;
    const identity = await loadIdentity(dataDir);
    if (!identity) return;
    const fr = await getFriends();
    const keep = [];
    for (const item of local.outbox) {
      const f = fr[item.to];
      if (!f || f.status === 'blocked' || f.status === 'removing' || item.exp < now()) continue;
      if ((onlyTo && item.to !== onlyTo) || item.next > now()) { keep.push(item); continue; }
      const r = await deliver(identity, f, item.env, { queue: false });
      if (r === 'direct' || r === 'relay') continue;
      item.tries++;
      item.next = now() + Math.min(3600000, 60000 * 2 ** Math.min(6, item.tries));
      keep.push(item);
    }
    local.outbox = keep;
    dirtyLocal();
  }
  async function sendPair(identity, f, kind, body) {
    const env = await sealPair({ identity, friend: f, kind, body, at: now(), lc: clock.tick() });
    return deliver(identity, f, env);
  }

  // ─── Receiving ─────────────────────────────────────────────────────────
  /**
   * An envelope from any transport. via: 'direct' (an open link), 'push' (the relay's live
   * socket), 'relay' (read from the mailbox later) or 'room' (a pass-through room: only the
   * kinds of a live garden, docs/dev/GARDEN_TOGETHER.md). peerId: the authenticated direct peer,
   * or who holds that room socket (its messages must be from it).
   */
  function receive(rawEnv, via = 'relay', peerId = null) {
    return serial(async () => {
      await loadLocal();
      const env = cleanEnvelope(rawEnv);
      if (!env) { count('bad'); return false; }
      if (seen.has(env.id) || liveSeen.has(env.id)) return 'dup';
      if (via === 'room' && env.t === 'rq') { count('room-kind'); return false; }
      // A request is never taken for an identity a key renewal retired (only pair messages from friends open with it).
      const ids = await allIdentities(dataDir, { retired: env.t !== 'rq' });
      if (!ids.length) return false;
      let m = null, identity = null;
      for (const i of ids) {
        m = env.t === 'rq' ? await openRequest({ identity: i, env }) : await openPair({ identity: i, env, byTag: (t) => tags.get(`${i.id}|${t}`) || null });
        if (m) { identity = i; break; }
      }
      if (!m) { count('unopened'); return false; }
      if (peerId && m.from !== peerId) { count('wrong-peer'); return false; }
      if (env.t !== 'rq' && !(await allIdentities(dataDir, { retired: false })).some(i => i.id === identity.id) && !(await retiredMayOpen(identity, m))) { count('retired'); return false; }
      const t = now();
      const def = kindDef(m.k);
      if (via === 'room' && !(def && def.room)) { count('room-kind'); return false; }   // a room is not a way round the mailbox's limits
      // Too old to be real (MSG_MAX_AGE_MS): a recorded envelope sent again. `at` is sealed in, nobody on the way can change it.
      if (!(def && def.store === 'live' && !def.core) && (!Number.isFinite(m.at) || t - m.at > MSG_MAX_AGE_MS)) { count('too-old'); return 'late'; }
      if (def && def.store === 'live' && !def.core) {
        // Live: only while fresh (never from the mailbox later), within its rate, remembered in memory only.
        // (a knock and its answer read from the mailbox a moment after they were posted still count: this computer's live connection was down or just reopening)
        if (via === 'relay' && !(def.knock && t - m.at <= def.ttl + 30000)) { count('live-late'); return 'late'; }
        if (Math.abs(t - m.at) > def.ttl + 5 * 60000) { count('live-stale'); return 'late'; }
        if (!rateOk(liveIn, `${m.from}|${m.k}`, { sec: def.rate.sec * 2, min: def.rate.min * 2 }, t)) { count('live-rate'); return false; }
        liveSeen.set(env.id, t);
        if (liveSeen.size > 5000) for (const [k, v] of liveSeen) { if (t - v < 10 * 60000 && liveSeen.size <= 4000) break; liveSeen.delete(k); }
      } else {
        seen.add(env.id);
        dirtyLocal();
      }
      if (Math.abs(t - m.at) < LIVE_HEARD_MS) heard.set(m.from, t);   // sent moments ago: they are online now
      clock.see(m.lc);
      try { await dispatch(m, identity, via); } catch (e) { count('failed'); log('warn', `friends: a message could not be handled (${e && (e.code || 'error')})`); }
      return true;
    });
  }
  /**
   * A pair message that opened only with a key a renewal retired (FRIENDS.md section 15). Pair keys
   * are static, so whoever stole that key can seal a message "from" any friend with it: it is kept
   * only for what friends sent before they heard of the renewal. So: only the renewal this computer
   * runs, only from a friend made before it who has not moved to the new keys yet, and never a
   * removal or a new route (those come again under the new keys).
   */
  async function retiredMayOpen(identity, m) {
    const R = local.rotation;
    if (!R || R.from !== identity.id || R.told[m.from] === 'ok') return false;
    if (m.k === 'friend:remove' || m.k === 'friend:relay') return false;
    const f = (await getFriends())[m.from];
    return !!f && f.status === 'friend' && (f.friendsAt || 0) <= R.at;
  }
  async function dispatch(m, identity, via) {
    const def = kindDef(m.k);
    if (!def || def.local) { count('kind'); return; }
    const body = checkBody(m.k, m.b);
    if (body === undefined) { count('schema'); return; }
    // A friend's OLD id after they renewed their keys: only another renewal is looked at (it freezes the friendship).
    if (movedIds.has(m.from) && m.k !== 'friend:rekey') { count('moved'); return; }
    if (m.k.startsWith('friend:')) return handshake(m.k, body, m, identity);
    const fr = await getFriends();
    const f = fr[m.from];
    if (f && f.status === 'requested' && f.flow && f.flow.approved) {
      // They approved my request by code; I have not confirmed the check code yet: kept until I do.
      const list = held.get(f.id) || [];
      if (list.length < HELD_MAX) { list.push({ m, identity, via }); held.set(f.id, list); } else count('held-full');
      return;
    }
    if (!f || f.status !== 'friend') { count('not-friend'); return; }
    if (m.k === 'presence') {
      local.presence[m.from] = { s: body.s, at: now(), ttl: body.ttl || PRESENCE_TTL_MS };
      dirtyLocal();
      try { emit('friends', { type: 'presence', id: m.from, s: presenceNow(local.presence[m.from], now()) }); } catch { /* fine */ }
      return;
    }
    if (m.k === 'live:addr') {
      local.addrs[m.from] = { eps: body.eps, port: body.port, at: now() };
      dirtyLocal();
      if (direct && await allowed(f, 'direct')) direct.connect(m.from, body.eps).catch(() => {});
      return;
    }
    const msg = { id: m.id, from: m.from, k: m.k, b: body, at: m.at, lc: m.lc, g: m.g || null, n: m.n || null };
    if (def.store === 'live') {
      // Never stored: open pages and handlers get it now, or never (Together's cursors and typing).
      if (!def.noPage) { try { emit('friends', { type: 'live', msg }); } catch { /* fine */ } }
      await runHandlers(msg, f);
      return;
    }
    if (def.store === 'handler') {
      // validated above; the kind's owner keeps what it needs (nothing is stored here)
    } else if (def.store === 'latest') {
      let prev = null, took = false;
      await updateDoc(dataDir, 'shared', (d) => {
        const key = `${m.from}|${m.k}`;
        const cur = d.items[key];
        if (cur && cur.lc >= m.lc) return undefined;
        prev = cur ? cur.b : null; took = true;
        d.items[key] = { f: m.from, k: m.k, at: m.at, lc: m.lc, b: body };
        return d;
      });
      if (took && m.k === 'share:game' && prev) await gameMoments(m.from, prev, body);
    } else if (def.store === 'event') {
      await addFeed({ id: m.id, f: m.from, dir: 'in', k: m.k, at: m.at, lc: m.lc, b: body, ...(m.g ? { g: m.g } : {}) });
    }
    try { emit('friends', { type: 'msg', msg }); } catch { /* fine */ }
    await runHandlers(msg, f);
  }
  /** A friend's game moved: a level-up or a streak milestone becomes a line in the feed (made here, from validated numbers). */
  async function gameMoments(from, prev, cur) {
    if (Number(cur.level) > Number(prev.level)) await addFeed({ id: newMsgId(), f: from, dir: 'in', k: 'game:level', at: now(), lc: clock.tick(), b: { level: cur.level, ...(cur.title ? { title: cur.title } : {}) } });
    const marks = [3, 7, 14, 30, 50, 100, 200, 365, 500, 1000];
    const was = Number(prev.streak) || 0, is = Number(cur.streak) || 0;
    const hit = marks.filter(n => was < n && is >= n).pop();
    if (hit) await addFeed({ id: newMsgId(), f: from, dir: 'in', k: 'game:streak', at: now(), lc: clock.tick(), b: { n: hit } });
  }
  async function runHandlers(msg, f) {
    const keys = [msg.k];
    const i = msg.k.indexOf(':');
    if (i > 0) keys.push(msg.k.slice(0, i + 1) + '*');
    keys.push('*');
    const pf = publicFriend(f);
    for (const k of keys) for (const fn of handlers.get(k) || []) {
      try { await fn({ ...msg, b: structuredClone(msg.b) }, pf); } catch { log('warn', `friends: a handler for ${msg.k.split(':')[0]} failed`); }
    }
  }
  async function addFeed(entry) {
    const e = normEntry(entry.id, entry);
    if (!e) return null;
    await updateDoc(dataDir, 'feed', (d) => { if (d.msgs[e.id]) return undefined; d.msgs[e.id] = e; return d; });
    return e;
  }

  // ─── The handshake (FRIENDS.md section 6) ──────────────────────────────
  async function handshake(kind, body, m, identity) {
    const fr = await getFriends();
    const f = fr[m.from] || null;
    if (f && f.status === 'blocked') { count('blocked'); return; }
    // A friend's housekeeping must be newer than the last of it seen from them (on any of my computers: lcIn is
    // synced), so an old friend:remove or friend:relay sent again (a new computer's `seen` is empty) does nothing.
    if (f && f.lcIn && !(Number(m.lc) > f.lcIn - LC_SLACK_MS)) { count('replay'); return; }
    if (f && Number.isFinite(m.lc) && m.lc > (f.lcIn || 0) && m.lc < now() + DAY) {
      await updateDoc(dataDir, 'friends', (d) => { const c = d.friends[m.from]; if (!c || (c.lcIn || 0) >= m.lc) return undefined; c.lcIn = m.lc; return d; });
    }
    if (kind === 'friend:request') return onRequest(body, m, identity, f, fr);
    if (kind === 'friend:rekey') return onRekey(body, m, identity, f);
    if (!f) { count('not-friend'); return; }
    if (kind === 'friend:rekeyed') return onRekeyed(f, identity);
    if (kind === 'friend:relaymoved') return onRelayMoved(body, f);
    if (kind === 'friend:hello') {
      if (f.status !== 'requested' || f.role !== 'r' || !f.flow || !f.flow.mine || f.flow.theirs) return;
      const code = await confirmCode({ r: pub(identity), a: f, nr: f.flow.mine, na: body.nonce });
      const rec = await putFriend(f.id, (cur) => (cur && cur.status === 'requested' ? { ...cur, flow: { ...cur.flow, theirs: body.nonce, code, at: now() } } : undefined));
      if (rec) await sendPair(identity, rec, 'friend:reveal', { nonce: f.flow.mine });
      return;
    }
    if (kind === 'friend:reveal') {
      if (f.status !== 'incoming' || f.role !== 'a' || !f.flow || !f.flow.mine || f.flow.theirs) return;
      if ((await commitOf(body.nonce, f)) !== f.flow.commit) { count('commit'); return; }
      const code = await confirmCode({ r: f, a: pub(identity), nr: body.nonce, na: f.flow.mine });
      await putFriend(f.id, (cur) => (cur && cur.status === 'incoming' ? { ...cur, flow: { ...cur.flow, theirs: body.nonce, code, at: now() } } : undefined));
      // A group whose owner made everyone friends, and I said yes to that myself: accepted without asking (never by anything else).
      if (f.how === 'group' && f.flow.g && groupHook && await groupHook.autoAccept(f.flow.g)) { const t = timers.setTimeout(() => { approve(f.id).catch(() => {}); }, 0); if (t && t.unref) t.unref(); }
      return;
    }
    if (kind === 'friend:approve') {
      if (f.status !== 'requested' || !f.flow || !f.flow.code) return;
      let dropSealed = f.dropSealed;
      if (body.drop) {
        const o = cleanOrigin(body.drop.origin);
        if (o && isMbox(body.drop.mbox) && isToken(body.drop.drop)) dropSealed = await sealDrop(identity, `friend|${f.id}`, { origin: o, mbox: body.drop.mbox, drop: body.drop.drop });
      }
      // Added by code: the approval counts here only once this side said "The codes match" (confirm). Until
      // then it waits on the record, so a relay that answered for someone else is caught by THIS person too.
      if (f.how === 'code' && !f.flow.ok) {
        await putFriend(f.id, (cur) => (cur && cur.status === 'requested' && cur.flow ? { ...cur, flow: { ...cur.flow, approved: { at: now(), ...(dropSealed ? { dropSealed } : {}) } } } : undefined));
        return;
      }
      await acceptApproval(identity, f, dropSealed);
      return;
    }
    if (kind === 'friend:mismatch' && f.status === 'friend' && f.role === 'a' && f.how === 'code') {
      // I approved; they compared the code on their side afterwards and it differed: the friendship ends here too.
      await forget(identity, f, { theyLeft: true });
      await putFriend(f.id, () => ({ id: f.id, x: f.x, ed: f.ed, name: f.name, status: 'declined', role: f.role, how: f.how, addedAt: f.addedAt, why: 'codes-differed' }));
      return;
    }
    if (kind === 'friend:decline' || kind === 'friend:mismatch') {
      if (f.status !== 'requested' && f.status !== 'incoming') return;
      await revokeMyDrops(identity, f);
      await putFriend(f.id, (cur) => (cur ? { id: cur.id, x: cur.x, ed: cur.ed, name: cur.name, status: 'declined', role: cur.role, how: cur.how, addedAt: cur.addedAt, why: kind === 'friend:mismatch' ? 'codes-differed' : 'not-accepted' } : undefined));
      return;
    }
    if (kind === 'friend:remove') {
      // They removed this friendship (or cancelled a request): forget what they shared, keep nothing of theirs.
      await forget(identity, f, { blocked: false, theyLeft: true });
      return;
    }
    if (kind === 'friend:revoke') {
      if (f.status !== 'friend') return;
      const d = kindOk(body.k) ? kindDef(body.k) : null;
      if (!d || d.core || d.local || (d.store !== 'latest' && d.store !== 'handler')) { count('kind'); return; }
      if (d.store === 'latest') await updateDoc(dataDir, 'shared', (doc) => { const key = `${f.id}|${body.k}`; if (!doc.items[key]) return undefined; delete doc.items[key]; return doc; });
      const msg = { id: m.id, from: m.from, k: body.k, b: null, at: m.at, lc: m.lc, g: null, n: null, revoked: true };
      try { emit('friends', { type: 'msg', msg }); } catch { /* fine */ }
      await runHandlers(msg, f);
      return;
    }
    if (kind === 'friend:relay') {
      if (f.status !== 'friend') return;
      const o = cleanOrigin(body.drop.origin);
      if (!o || !isMbox(body.drop.mbox) || !isToken(body.drop.drop)) return;
      const dropSealed = await sealDrop(identity, `friend|${f.id}`, { origin: o, mbox: body.drop.mbox, drop: body.drop.drop });
      await putFriend(f.id, (cur) => (cur && cur.status === 'friend' ? { ...cur, relay: { origin: o, mbox: body.drop.mbox }, dropSealed } : undefined));
      // Friends made through a group: what I had for them waited for this.
      if (local) { for (const it of local.outbox) if (it.to === f.id) it.next = 0; await flushOutbox(f.id).catch(() => {}); }
    }
  }
  async function onRequest(body, m, identity, f, fr) {
    const card = await verifyCard(body.card);
    if (!card || card.id !== m.from || card.id === identity.id) { count('card'); return; }
    if (f && (f.status === 'removing' || f.status === 'friend')) { count('already'); return; }
    if (f && f.status === 'declined' && now() - (f.updatedAt || 0) < DAY) { count('declined'); return; }
    if (f && f.status === 'incoming' && f.flow && f.flow.theirs) return;          // already showing a code
    if (f && f.status === 'requested' && identity.id < card.id) return;          // both asked: the larger id answers
    if (f && f.status === 'requested') await revokeMyDrops(identity, f);
    const me = await readDoc(dataDir, 'me');
    let usedInvite = null;
    if (body.how === 'invite') {
      const inv = body.inv ? me.invites[body.inv] : null;
      if (!inv || inv.used || inv.cancelled || inv.exp < now()) { count('invite'); return; }
      const sec = await openSealed(identity, inv.sSealed, `invite|${inv.id}`);
      if (!sec || !(await checkInviteProof(sec.s, inv.id, card.id, body.proof))) { count('invite'); return; }
      usedInvite = inv.id;
    } else if (body.how === 'group') {
      // Through a group: only from someone on that group's list who proves they hold its key now (docs/dev/GROUPS.md).
      if (!groupHook || !body.g || !(await groupHook.okRequest(card, body.g, body.gp))) { count('group'); return; }
      if (Object.values(fr).filter(x => x.status === 'incoming' && x.flow && x.flow.g === body.g).length >= MAX_INCOMING_GROUP && !(f && f.status === 'incoming')) { count('too-many'); return; }
    } else if (body.lc) {
      // Through my live friend code: only the one on screen, before it runs out, once.
      const L = liveCode;
      if (!L || L.key !== body.lc || L.exp + LIVE_LATE_MS < now() || L.used) { count('live-code'); return; }
      L.used = true;
    } else if (!me.code) { count('no-code'); return; }
    const pendingIn = Object.values(fr).filter(x => x.status === 'incoming').length;
    if (pendingIn >= MAX_INCOMING && !(f && f.status === 'incoming')) { count('too-many'); return; }
    if (usedInvite) {
      await updateDoc(dataDir, 'me', (d) => { const i = d.invites[usedInvite]; if (!i || i.used) return undefined; i.used = { by: card.id, at: now() }; return d; });
      await dropShort(me.invites[usedInvite]);
    }
    // Asked through a group: nothing goes to any address a stranger named, no token is made, and neither side's own mailbox is shown, until someone accepts.
    const inGroup = body.how === 'group';
    const d = inGroup ? null : body.drop;
    const o = d ? cleanOrigin(d.origin) : null;
    const dropSealed = o && isMbox(d.mbox) && isToken(d.drop) ? await sealDrop(identity, `friend|${card.id}`, { origin: o, mbox: d.mbox, drop: d.drop }) : null;
    if (!dropSealed && !inGroup) { count('no-route'); return; }
    const nA = newNonce();
    const myNameThere = inGroup ? await groupHook.nameIn(body.g) : '';
    const rec = await putFriend(card.id, (cur) => ({
      id: card.id, x: card.x, ed: card.ed, name: card.name, status: 'incoming', role: 'a', how: body.how,
      relay: inGroup ? null : cleanRelayRef(card.relay) || { origin: o, mbox: d.mbox }, dropSealed,
      ...(inGroup ? { perms: { ...GROUP_FRIEND_PERMS, ...((cur && cur.perms) || {}) }, as: myNameThere } : {}),
      flow: { commit: body.commit, mine: nA, at: now(), ...(body.how === 'group' ? { g: body.g } : {}), ...(usedInvite ? { inv: usedInvite, ...(me.invites[usedInvite].rid ? { rid: me.invites[usedInvite].rid } : {}) } : {}) },
      addedAt: (cur && cur.addedAt) || now(), friendsAt: 0, ...(!inGroup && cur && cur.perms ? { perms: cur.perms } : {}),
      ...(body.lc && lookOf(body.look, card.name) ? { look: lookOf(body.look, card.name) } : {}),
    }));
    await sendPair(identity, rec, 'friend:hello', { nonce: nA });
    if (body.lc && liveCode && liveCode.key === body.lc) await endLiveCode('used');
  }
  /** The requester's side of an approval: friends now, then what they sent meanwhile (held) is handled. */
  async function acceptApproval(identity, f, dropSealed) {
    const rec = await putFriend(f.id, (cur) => {
      if (!cur || cur.status !== 'requested') return undefined;
      const { flow, ...rest } = cur;
      return { ...rest, status: 'friend', friendsAt: now(), dropSealed: dropSealed || cur.dropSealed };
    });
    if (!rec || rec.status !== 'friend') return rec;
    // They accepted: now they can have a way to reach me, and it goes only to them.
    if (rec.how === 'group') {
      try {
        const mine = await mintMyDrop();
        await putFriendDrop(identity, rec.id, mine);
        await sendPair(identity, rec, 'friend:relay', { drop: mine });
      } catch (e) { log('info', `friends: my mailbox could not be shared yet (${e && (e.relayError || e.code)})`); }
    }
    await becameFriends(identity, rec);
    const list = held.get(rec.id) || [];
    held.delete(rec.id);
    for (const h of list) { try { await dispatch(h.m, h.identity, h.via); } catch { count('failed'); } }
    return rec;
  }
  async function putFriendDrop(identity, id, mine) {
    const myDrop = { origin: mine.origin, sealed: await sealDrop(identity, `mine|${id}`, mine), at: now() };
    await putFriend(id, (cur) => (cur ? { ...cur, myDrop } : undefined));
  }
  async function becameFriends(identity, f) {
    await addFeed({ id: newMsgId(), f: f.id, dir: 'local', k: 'friended', at: now(), lc: clock.tick(), b: null });
    await sendMine(identity, f);
    // A friend made in a group knows me by the name I use there. My real name crosses only if I choose to show them my profile.
    if (f.how === 'group' && f.as && !(await allowed(f, 'profile'))) await sendPair(identity, f, 'profile', { name: f.as });
    await sendAddr(identity, f, true);
    if (lastPresence.s && await allowed(f, 'presence')) await sendPair(identity, f, 'presence', { s: lastPresence.s, ttl: PRESENCE_SEND_TTL });
    changed();
  }
  /** What I last published (profile, share:<scope>) to a new friend. */
  async function sendMine(identity, f) {
    const me = await readDoc(dataDir, 'me');
    const mine = { ...me.mine };
    if (!mine.profile) mine.profile = { at: now(), b: { name: await myName() || 'Friend' } };
    for (const [kind, v] of Object.entries(mine)) {
      if (!kindDef(kind) || checkBody(kind, v.b) === undefined) continue;
      if (!(await allowed(f, scopeOf(kind), me))) continue;
      await sendPair(identity, f, kind, v.b);
    }
  }
  async function sendAddr(identity, f, force = false) {
    if (!direct || !local) return;
    const eps = direct.endpoints();
    if (!eps.length || !(await allowed(f, 'direct'))) return;
    const key = JSON.stringify(eps);
    const last = local.sentAddr[f.id];
    if (!force && last && last.key === key && now() - last.at < ADDR_EVERY_MS) return;
    await sendPair(identity, f, 'live:addr', { eps: eps.map(e => ({ k: e.k, a: e.a, p: e.p, ...(Number.isInteger(e.m) ? { m: e.m } : {}) })), port: direct.port });
    local.sentAddr[f.id] = { key, at: now() };
    dirtyLocal();
  }

  // ─── Actions (the page, through server/routes/friends.mjs) ─────────────
  async function startRequest(identity, card, { how, inv = null, proof = null, route, lc = null, g = null, gp = null, via = null, cardName = null }) {
    const fr = await getFriends();
    const f = fr[card.id];
    if (f && f.status === 'friend') throw fail('ALREADY', `You're already friends with ${card.name || 'them'}.`);
    if (f && f.status === 'blocked') throw fail('BLOCKED', 'You blocked this person. Unblock them first (Friends > Blocked).');
    if (f && f.status === 'incoming') throw fail('PENDING', `${card.name || 'They'} already asked to connect: check their request in Friends.`);
    // Through a group nothing of where my mail goes is shown yet: it goes to them only once they accept. I still need somewhere for it to go.
    const inGroup = how === 'group';
    const mine = inGroup ? (await needHome(), null) : await mintMyDrop();
    const nR = newNonce();
    const commit = await commitOf(nR, pub(identity));
    const body = { card: inGroup ? await makeCard(identity, { name: firstName(cardName), relay: null, now }) : await myCard(identity), commit, how, ...(mine ? { drop: mine } : {}) };
    if (inv) { body.inv = inv; body.proof = proof; }
    if (g) { body.g = g; if (gp) body.gp = gp; }
    if (lc) {
      body.lc = lc;
      const av = (await readDoc(dataDir, 'me')).mine?.profile?.b?.avatar;
      const look = av ? JSON.stringify(av) : '';
      if (look && look.length <= 1500) body.look = look;
    }
    const dropSealed = route ? await sealDrop(identity, `friend|${card.id}`, route) : null;   // through a group: their first reply brings it
    const myDrop = mine ? { origin: mine.origin, sealed: await sealDrop(identity, `mine|${card.id}`, mine), at: now() } : null;
    const full = await putFriend(card.id, (cur) => ({
      id: card.id, x: card.x, ed: card.ed, name: card.name, status: 'requested', role: 'r', how,
      relay: inGroup ? null : cleanRelayRef(card.relay), addedAt: (cur && cur.addedAt) || now(), friendsAt: 0,
      dropSealed, ...(myDrop ? { myDrop } : {}), flow: { commit, mine: nR, at: now(), ...(inGroup ? { g } : {}) },
      ...(inGroup ? { perms: { ...GROUP_FRIEND_PERMS, ...((cur && cur.perms) || {}) }, as: cardName || '' } : cur && cur.perms ? { perms: cur.perms } : {}),
    }));
    const env = await sealRequest({ identity, to: card, body, at: now() });
    const r = via ? await via(env).then(() => 'relay', (e) => { log('info', `friends: a request through a group did not go (${e && (e.relayError || e.code)})`); return 'failed'; }) : await deliver(identity, full, env);
    if (r === 'failed') {
      await putFriend(card.id, () => null);
      if (myDrop) await revokeDropSealed(identity, `mine|${card.id}`, myDrop.sealed);
      throw fail('UNDELIVERABLE', "Your request couldn't be delivered: their relay didn't accept it. Ask them for a new invite.");
    }
    return view(full);
  }
  /** "Add as friend" in a group: the same handshake, its first message carried by the group (lib/friends/groups.mjs). */
  async function addFromGroup({ card, g, gp, cardName, via }) {
    return serial(async () => {
      await loadLocal();
      const identity = await ensureIdentity(dataDir);
      const c = await verifyCard(card);
      if (!c || c.id === identity.id) throw fail('BAD_CARD', "That person's details couldn't be checked. Ask them to open Freeflo, then try again.");
      return startRequest(identity, c, { how: 'group', g, gp, via, cardName });
    });
  }
  async function add({ code = null, invite = null } = {}) {
    return serial(async () => {
      await loadLocal();
      const identity = await ensureIdentity(dataDir);
      if (invite) {
        // A short link: fetch its sealed copy from the inviter's relay (anyone with the link may) and open it.
        const sh = await parseShortInvite(invite);
        let p;
        if (sh && sh.error === 'needs-link') throw fail('BAD_INVITE', 'Paste the whole invite link, starting with https://.');
        if (sh && sh.error === 'origin') throw fail('BAD_INVITE', "That invite link's address can't be used (it must be a public https address). Ask for a new invite.");
        if (sh && sh.error === 'check') throw fail('BAD_INVITE', 'That link looks cut short or mistyped. Copy the whole link again.');
        if (sh) {
          let got;
          try { got = await (await client(sh.origin)).invGet(await shortInviteKey(sh.token)); } catch (e) { throw relayFail(e); }
          if (!got) throw fail('EXPIRED', 'This invite link was already used, cancelled or has expired. Ask for a new one.');
          const obj = await openShortInvite(sh.token, sh.origin, got.blob);
          if (!obj) throw fail('BAD_INVITE', "That invite link couldn't be opened. Ask for a new one.");
          p = await checkInvite(obj, { now });
        } else p = await parseInvite(invite, { now });
        if (p.error === 'expired') throw fail('EXPIRED', 'This invite has expired. Ask for a new one.');
        if (p.error) throw fail('BAD_INVITE', "That doesn't look like an OpenDash invite. Copy the whole invite and try again.");
        if (p.card.id === identity.id) throw fail('SELF', "That's your own invite. Send it to the person you want to add.");
        if (!p.card.relay || !p.invite.drop) throw fail('BAD_INVITE', "This invite has no way to reach its sender. Ask them for a new one.");
        if (p.invite.relay) {
          try {
            const r = await (await client(p.invite.relay.origin)).redeem(p.invite.relay.token);
            const had = await homeRelay(dataDir);
            // A relay reached through someone else's invite is never this person's own, whatever it answers:
            // only Connect Cloudflare and useLocal record 'owner' (as deploy.mjs useInvite does).
            await setRelay(dataDir, { origin: p.invite.relay.origin, role: 'member', scopes: r.scopes, mbox: r.mbox }, { home: !had });
          } catch (e) {
            if (!(await homeRelay(dataDir))) throw relayFail(e);
            log('info', `friends: an invite's relay access could not be used (${e && (e.relayError || e.code)}); continuing with the home relay`);
          }
        }
        const proof = await inviteProof(p.invite.s, p.invite.id, identity.id);
        return startRequest(identity, p.card, { how: 'invite', inv: p.invite.id, proof, route: { origin: p.card.relay.origin, mbox: p.card.relay.mbox, drop: p.invite.drop } });
      }
      // 2.20.1: a live friend code (4 letters, shown for 10 minutes in their OpenDash).
      const short = parseShortCode(code);
      if (short.ok) {
        if (short.code.includes('L')) throw fail('BAD_CODE', "Friend codes never have an L. Check the letters with your friend and type them again.");
        const home = await needHome();
        if (liveCode && liveCode.code === short.code) throw fail('SELF', "That's your own code. Your friend types it in their OpenDash.");
        const key = await liveCodeKey(short.code);
        let blob;
        try { blob = await (await client(home.origin)).lookup(key); }
        catch (e) {
          if (e && e.status === 429) throw fail('TOO_MANY', "Too many codes that weren't right. Wait 10 minutes and try again, or ask your friend for an invite link.");
          throw relayFail(e);
        }
        const o = blob ? await openCardForLive(short.code, blob) : null;
        if (!o) throw fail('NOT_FOUND', "That code isn't right, or it ran out (codes last 10 minutes and work once). Ask your friend to press Show my friend code again and read you the 4 letters. Still no luck? Ask them to send an invite link instead.");
        if (o.card.id === identity.id) throw fail('SELF', "That's your own code. Your friend types it in their OpenDash.");
        if (!o.card.relay || !o.drop) throw fail('NOT_FOUND', "That code can't take requests right now. Ask your friend for an invite link instead.");
        return startRequest(identity, o.card, { how: 'code', lc: key, route: { origin: o.card.relay.origin, mbox: o.card.relay.mbox, drop: o.drop } });
      }
      const c = parseFriendCode(code);
      if (!c) throw fail('BAD_CODE', "That isn't a friend code. Type the 4 letters your friend's OpenDash shows.");
      const home = await needHome();
      const me = await readDoc(dataDir, 'me');
      if (me.code && me.code.code === c) throw fail('SELF', "That's your own code. Share it with friends so they can add you.");
      let blob;
      try { blob = await (await client(home.origin)).lookup(await codeKey(c)); } catch (e) { throw relayFail(e); }
      const o = blob ? await openCardForCode(c, blob) : null;
      if (!o) throw fail('NOT_FOUND', "No one on your connection to friends has that code. Check it with them, or ask them for an invite link instead.");
      if (o.card.id === identity.id) throw fail('SELF', "That's your own code. Share it with friends so they can add you.");
      if (!o.card.relay || !o.drop) throw fail('NOT_FOUND', "That code can't take requests right now. Ask them for an invite link instead.");
      return startRequest(identity, o.card, { how: 'code', route: { origin: o.card.relay.origin, mbox: o.card.relay.mbox, drop: o.drop } });
    });
  }
  /** "Show my friend code": a new live code (any older one ends). -> {code, expiresAt} */
  async function showLiveCode() {
    return serial(async () => {
      await endLiveCode('replaced');
      const identity = await ensureIdentity(dataDir);
      const home = await needHome();
      const card = await myCard(identity);
      const cl = await client(home.origin);
      // A relay from before 2.20.1 would keep a short code for ever, with no limit on guesses, and in
      // place of a lasting friend code: never show one there.
      let info;
      try { info = await cl.me(); } catch (e) { throw relayFail(e); }
      if (!info.liveCodes) throw fail('RELAY_OLD', home.role === 'owner' ? 'Friend codes need a quick update first: open Settings > Your connection to friends and press Update. Until then, send an invite link (the first tab).' : 'Friend codes will work once your friend updates the connection you share. Until then, send an invite link (the first tab).');
      let d;
      try { d = await cl.mintDrop(home.mbox, { ttlMs: LIVE_DROP_MS }); } catch (e) { throw relayFail(e); }
      const exp = now() + LIVE_CODE_MS;
      for (let i = 0; i < 4; i++) {
        const code = newShortCode(), key = await liveCodeKey(code);
        try { await cl.publish(key, await sealCardForLive(code, card, d.token), { exp, once: true }); }
        catch (e) { if (e.status === 409) continue; await cl.revokeDrop(home.mbox, d.token).catch(() => {}); throw relayFail(e); }
        liveCode = { code, key, exp, origin: home.origin, mbox: home.mbox, drop: d.token, used: false };
        changed();
        return liveView();
      }
      await cl.revokeDrop(home.mbox, d.token).catch(() => {});
      throw fail('RELAY', 'Could not make a code just now. Try again.');
    });
  }
  function liveView() { return liveCode && !liveCode.used && liveCode.exp > now() ? { code: liveCode.code, expiresAt: liveCode.exp } : null; }
  /** The live code goes: off the relay, its drop token taken back. why: 'cancelled' | 'used' | 'expired' | 'replaced'. */
  async function endLiveCode(why = 'cancelled') {
    const L = liveCode;
    if (!L) return null;
    liveCode = null;
    // Used: its drop token stays (the friend's half of the handshake comes through it) and runs out by itself.
    try { const cl = await client(L.origin); await cl.unpublish(L.key).catch(() => {}); if (why !== 'used') await cl.revokeDrop(L.mbox, L.drop).catch(() => {}); }
    catch { /* both run out by themselves */ }
    changed();
    return null;
  }
  async function cancelLiveCode() { return serial(() => endLiveCode('cancelled')); }
  async function rotateCode() { return serial(() => makeCode()); }
  /** A new friend code (the old one stops at once). Not queued: callers already hold the queue. */
  async function makeCode() {
    const identity = await ensureIdentity(dataDir);
    const home = await needHome();
    const me = await readDoc(dataDir, 'me');
    const card = await myCard(identity);
    const cl = await client(home.origin);
    let d;
    try { d = await cl.mintDrop(home.mbox, { ttlMs: 3 * 365 * DAY }); } catch (e) { throw relayFail(e); }
    let code = null;
    for (let i = 0; i < 3 && !code; i++) {
      const c = newFriendCode(await myName());
      try { await cl.publish(await codeKey(c), await sealCardForCode(c, card, d.token)); code = c; }
      catch (e) { if (e.status !== 409) { await cl.revokeDrop(home.mbox, d.token).catch(() => {}); throw relayFail(e); } }
    }
    if (!code) throw fail('RELAY', 'Could not make a new code just now. Try again.');
    if (me.code && me.code.dropSealed) await revokeDropSealed(identity, 'code', me.code.dropSealed);
    const dropSealed = await sealDrop(identity, 'code', { origin: home.origin, mbox: home.mbox, drop: d.token });
    await updateDoc(dataDir, 'me', (doc) => { doc.code = { code, at: now(), origin: home.origin, dropSealed }; return doc; });
    changed();
    return { code };
  }
  async function createInvite({ ttlDays = 7, relayScopes = null } = {}) {
    return serial(async () => {
      const identity = await ensureIdentity(dataDir);
      const home = await needHome();
      const ttlMs = Math.max(1, Math.min(30, Number(ttlDays) || 7)) * DAY;
      const drop = await mintMyDrop(ttlMs + 30 * DAY);
      let relay = null, rid = null;
      const scopes = Array.isArray(relayScopes) ? relayScopes.filter(s => s === 'message' || s === 'sync') : [];
      if (scopes.length && home.role === 'owner') {
        if (!scopes.includes('message')) scopes.unshift('message');
        try { const t = await (await client(home.origin)).mintInvite({ scopes, ttlMs }); relay = { origin: home.origin, token: t.token, scopes }; rid = t.id; }
        catch (e) { throw relayFail(e); }
      }
      const inv = await makeInvite({ card: await myCard(identity), drop: drop.drop, relay, ttlMs, now });
      const sSealed = await sealAtRest(identity, { s: inv.s }, `invite|${inv.id}`);
      const dropSealed = await sealDrop(identity, `invite|${inv.id}`, drop);
      // The short link (a QR code fits): the invite sealed on my home relay under a hash of a new token.
      // A relay from before RELAY_PROTOCOL.md 7.8 says 404: the long link is used, as before.
      let short = null, shortWhy = null;
      try {
        const token = newShortToken();
        const key = await shortInviteKey(token);
        await (await client(home.origin)).invPut(key, await sealShortInvite(token, home.origin, inv.invite), inv.exp);
        short = { origin: home.origin, key, link: await shortInviteLink(home.origin, token) };
      } catch (e) {
        shortWhy = e && e.status === 404 ? 'old-relay' : 'relay';
        if (shortWhy !== 'old-relay') log('info', `friends: no short invite link this time (${e && (e.relayError || e.code)})`);
      }
      await updateDoc(dataDir, 'me', (d) => { d.invites[inv.id] = { id: inv.id, at: now(), exp: inv.exp, sSealed, dropSealed, origin: home.origin, scopes: relay ? relay.scopes : [], rid, used: null, cancelled: false, short: short ? { origin: short.origin, key: short.key } : null }; return d; });
      changed();
      const longLink = `${home.origin}/i#${inv.text}`;
      const link = short ? short.link : longLink;
      return {
        id: inv.id, text: inv.text, link, longLink, short: !!short, shortWhy, exp: inv.exp, relayScopes: relay ? relay.scopes : [],
        message: `Join me on OpenDash: ${link}
(In OpenDash, open Friends > Add a friend > Paste an invite, and paste this link.)`,
      };
    });
  }
  /** A short link's sealed copy on the relay: gone once the invite is used, cancelled or expired (best effort). */
  async function dropShort(inv) {
    if (!inv || !inv.short) return;
    try { await (await client(inv.short.origin)).invDel(inv.short.key); } catch (e) { log('info', `friends: an invite link's copy was not deleted yet (${e && (e.relayError || e.code)}); it expires by itself`); }
  }
  /**
   * An invite's one-time access to my own relay (RELAY_PROTOCOL.md 4.2): its token deleted, and
   * with `members` whoever redeemed it and did not become my friend taken off the relay (keep: the
   * identity key of the friend who did). -> true when done (or nothing to close), false: try later.
   */
  async function closeRelayInvite(inv, { members = false, keep = null } = {}) {
    if (!inv || !inv.rid) return true;
    const home = await homeRelay(dataDir);
    // not my connection (any more): nothing I can close. No origin: the request's own note of it (dropInvite), on my connection.
    if (!home || home.role !== 'owner' || (inv.origin && home.origin !== inv.origin)) return true;
    try {
      const cl = await client(home.origin);
      await cl.revokeInvite(inv.rid);
      if (members) for (const m of (await cl.grants()).members) if (!m.revoked && m.via === `invite:${inv.rid}` && m.key !== keep) await cl.revokeMember(m.key);
      return true;
    } catch (e) {
      log('info', `friends: an invite's access to your connection to friends was not closed yet (${e && (e.relayError || e.code)}); trying again shortly`);
      return false;
    }
  }
  /**
   * An invite that has done its job (or was declined): its drop token revoked, its relay access
   * closed (keep: the friend it brought, who stays a member), gone from the list. If the relay
   * can't be reached it stays as cancelled and the background pass closes it (cancelInvite).
   */
  async function dropInvite(identity, id, { keep = null, rid = null } = {}) {
    const me = await readDoc(dataDir, 'me');
    const inv = me.invites[id];
    if (!inv) {
      // The invite was cancelled (or ran out) while its request waited: whoever redeemed its relay
      // access goes now (keep: the friend it brought), from the request's own note of it (flow.rid).
      if (rid) await closeRelayInvite({ rid, origin: null }, { members: true, keep });
      return;
    }
    if (inv.dropSealed) await revokeDropSealed(identity, `invite|${id}`, inv.dropSealed);
    await dropShort(inv);
    const done = await closeRelayInvite(inv, { members: true, keep });
    await updateDoc(dataDir, 'me', (d) => {
      if (!d.invites[id]) return undefined;
      if (done) delete d.invites[id]; else d.invites[id] = { ...d.invites[id], cancelled: true, closing: { keep } };
      return d;
    });
  }
  async function cancelInvite(id) {
    return serial(async () => {
      const identity = await loadIdentity(dataDir);
      const me = await readDoc(dataDir, 'me');
      const inv = me.invites[id];
      if (!inv) return { ok: true };
      if (!inv.cancelled) {
        // Its drop token goes too, unless a request that came through it still waits for an answer (and not for ever: 30 days).
        const by = inv.used ? (await getFriends())[inv.used.by] : null;
        const waiting = by && by.status === 'incoming' && inv.used.at > now() - 30 * DAY;
        if (identity && inv.dropSealed && !waiting) await revokeDropSealed(identity, `invite|${id}`, inv.dropSealed);
        if (identity) await dropShort(inv);
      }
      // Its relay access goes too; whoever redeemed it goes unless a request came through it that
      // still waits (its answer decides: decline takes them off, approve keeps the friend; both find
      // the token's id on the request). A request that is gone or was answered decides nothing more.
      let close = inv.closing ? { members: true, keep: inv.closing.keep } : { members: !inv.used, keep: null };
      if (!inv.closing && inv.used) {
        const f = (await getFriends())[inv.used.by];
        if (!f || f.status !== 'incoming') close = { members: true, keep: f && (f.status === 'friend' || f.status === 'removing') ? f.ed : null };
      }
      const done = !identity || await closeRelayInvite(inv, close);
      const giveUp = inv.exp < now() - 30 * DAY;
      await updateDoc(dataDir, 'me', (d) => {
        if (!d.invites[id]) return undefined;
        if (done || giveUp) delete d.invites[id]; else d.invites[id] = { ...d.invites[id], cancelled: true };
        return d;
      });
      changed();
      return { ok: true };
    });
  }
  const getOr404 = async (id) => {
    if (!ID_RE.test(id || '')) throw fail('NOT_FOUND', 'That friend is not here any more.');
    const f = (await getFriends())[id];
    if (!f) throw fail('NOT_FOUND', 'That friend is not here any more.');
    return f;
  };
  async function approve(id) {
    return serial(async () => {
      const identity = await ensureIdentity(dataDir);
      const f = await getOr404(id);
      if (f.status !== 'incoming' || !f.flow || !f.flow.code) throw fail('NOT_READY', 'This request is not ready to accept yet: the pictures to check have not arrived.');
      const mine = await mintMyDrop();
      // They came through an invite to my connection: the relay held what it allows until this approval (RELAY_PROTOCOL.md 4.2).
      if (f.flow.rid) await confirmRelayMember(f.ed);
      await sendPair(identity, f, 'friend:approve', { drop: mine });
      const myDrop = { origin: mine.origin, sealed: await sealDrop(identity, `mine|${f.id}`, mine), at: now(), ...(f.myDrop && f.myDrop.sealed ? { prev: [f.myDrop.sealed] } : {}) };
      const inv = f.flow.inv;
      const rec = await putFriend(f.id, (cur) => {
        if (!cur || cur.status !== 'incoming') return undefined;
        const { flow, ...rest } = cur;
        return { ...rest, status: 'friend', friendsAt: now(), myDrop };
      });
      if (inv) await dropInvite(identity, inv, { keep: f.ed, rid: f.flow.rid || null });
      if (rec) await becameFriends(identity, rec);
      return view(rec);
    });
  }
  /**
   * The requester's "The codes match" (added by code, FRIENDS.md section 6): the friendship is confirmed on
   * this side only after it. When they already approved, friends now; else their approval completes it.
   */
  async function confirm(id) {
    return serial(async () => {
      const identity = await ensureIdentity(dataDir);
      const f = await getOr404(id);
      if (f.status === 'friend') return view(f);
      if (f.status !== 'requested' || !f.flow || !f.flow.code) throw fail('NOT_READY', 'There are no pictures to compare yet: they show once their OpenDash answers. Try again in a moment.');
      if (f.flow.approved) return view(await acceptApproval(identity, f, f.flow.approved.dropSealed || null));
      return view(await putFriend(f.id, (cur) => (cur && cur.status === 'requested' && cur.flow ? { ...cur, flow: { ...cur.flow, ok: true } } : undefined)));
    });
  }
  async function decline(id, { mismatch = false } = {}) {
    return serial(async () => {
      const identity = await ensureIdentity(dataDir);
      const f = await getOr404(id);
      if (f.status !== 'incoming' && f.status !== 'requested') throw fail('NOT_PENDING', 'There is no request to answer here.');
      held.delete(f.id);
      await sendPair(identity, f, mismatch ? 'friend:mismatch' : 'friend:decline', null).catch(() => {});
      await revokeMyDrops(identity, f);
      if (f.flow && f.flow.inv) await dropInvite(identity, f.flow.inv, { rid: f.flow.rid || null });
      const rec = await putFriend(f.id, (cur) => (cur ? { id: cur.id, x: cur.x, ed: cur.ed, name: cur.name, status: 'declined', role: cur.role, how: cur.how, addedAt: cur.addedAt, why: mismatch ? 'codes-differed' : 'you-declined' } : undefined));
      return view(rec);
    });
  }
  /** Take back my own request (or forget a declined one). */
  async function cancel(id) {
    return serial(async () => {
      const identity = await ensureIdentity(dataDir);
      const f = await getOr404(id);
      if (f.status === 'friend' || f.status === 'blocked') throw fail('NOT_PENDING', 'Use Remove for a friend.');
      held.delete(f.id);
      if (f.status === 'requested' || f.status === 'incoming') await sendPair(identity, f, 'friend:remove', { forget: true }).catch(() => {});
      await revokeMyDrops(identity, f);
      // A request that came through my invite and is dropped unanswered: the invite's relay access closes as on Decline.
      if (f.status === 'incoming' && f.flow && f.flow.inv) await dropInvite(identity, f.flow.inv, { rid: f.flow.rid || null });
      await putFriend(f.id, () => null);
      return { ok: true };
    });
  }
  /** Remove (or block): hidden at once, finalised after UNDO_MS unless undone. */
  async function remove(id, { block = false } = {}) {
    return serial(async () => {
      const f = await getOr404(id);
      if (f.status === 'removing') return { ok: true, undoUntil: f.removeAt };
      if (f.status === 'blocked') return { ok: true };
      const removeAt = now() + UNDO_MS;
      await putFriend(id, (cur) => (cur ? { ...cur, status: 'removing', removeAt, removeAs: block ? 'blocked' : 'removed', wasStatus: cur.status } : undefined));
      if (direct) direct.dropPeer(id);
      const t = timers.setTimeout(() => { finalizeDue().catch(() => {}); }, UNDO_MS + 200);
      if (t && t.unref) t.unref();
      return { ok: true, undoUntil: removeAt };
    });
  }
  async function undoRemove(id) {
    return serial(async () => {
      const f = await getOr404(id);
      if (f.status !== 'removing') throw fail('TOO_LATE', 'It was already removed, so it cannot be undone. You can add them again.');
      const rec = await putFriend(id, (cur) => { if (!cur || cur.status !== 'removing') return undefined; const { removeAt, removeAs, wasStatus, ...rest } = cur; return { ...rest, status: wasStatus || 'friend' }; });
      return view(rec);
    });
  }
  async function unblock(id) {
    return serial(async () => {
      const f = await getOr404(id);
      if (f.status !== 'blocked') return { ok: true };
      await putFriend(id, () => null);
      // the stub is gone: handlers clear anything kept for them since the block (agent perms: the choices made
      // for them), so a new request from the same person starts from nothing
      for (const fn of removedFns) { try { await fn(publicFriend(f), { blocked: false, theyLeft: false, unblocked: true }); } catch { log('warn', 'friends: a removal handler failed'); } }
      return { ok: true };
    });
  }
  async function finalizeDue() {
    return serial(async () => {
      const identity = await loadIdentity(dataDir);
      if (!identity) return;
      for (const f of Object.values(await getFriends())) {
        if (f.status !== 'removing' || f.removeAt > now()) continue;
        if (['friend', 'requested', 'incoming'].includes(f.wasStatus)) await sendPair(identity, f, 'friend:remove', { forget: true }).catch(() => {});
        await forget(identity, f, { blocked: f.removeAs === 'blocked' });
      }
    });
  }
  /**
   * The end of a friendship (either side): their drop token and (on my connection) their
   * access revoked, my copy of what they shared deleted, handlers told (agent
   * 'together' rotates group keys), and the record gone (a block keeps a stub).
   */
  async function forget(identity, f, { blocked = false, theyLeft = false } = {}) {
    held.delete(f.id);
    await revokeMyDrops(identity, f);
    // Their access to my connection goes whoever ended it (they left too: a friend who removes you keeps nothing of
    // yours, relay space included). Not confirmed by the relay: tried again (retryRevokes).
    const home = await homeRelay(dataDir);
    if (home && home.role === 'owner') await revokeMemberOn(home.origin, f.ed);
    await updateDoc(dataDir, 'feed', (d) => {
      let n = 0;
      for (const [k, e] of Object.entries(d.msgs)) {
        if (e.f === f.id) { delete d.msgs[k]; n++; }
        else if (Array.isArray(e.to) && e.to.includes(f.id)) { e.to = e.to.filter(x => x !== f.id); n++; }
      }
      return n ? d : undefined;
    });
    await updateDoc(dataDir, 'shared', (d) => { let n = 0; for (const k of Object.keys(d.items)) if (k.startsWith(f.id + '|')) { delete d.items[k]; n++; } return n ? d : undefined; });
    if (local) {
      delete local.presence[f.id]; delete local.addrs[f.id]; delete local.sentAddr[f.id];
      local.outbox = local.outbox.filter(x => x.to !== f.id);
      dirtyLocal();
    }
    if (direct) direct.dropPeer(f.id);
    for (const fn of removedFns) { try { await fn(publicFriend(f), { blocked, theyLeft }); } catch { log('warn', 'friends: a removal handler failed'); } }
    if (blocked) await putFriend(f.id, (cur) => (cur ? { id: cur.id, x: cur.x, ed: cur.ed, name: cur.name, status: 'blocked', role: cur.role, how: cur.how, addedAt: cur.addedAt } : undefined));
    else await putFriend(f.id, () => null);
  }

  // ─── Sending (other agents) ────────────────────────────────────────────
  async function send(to, kind, body, { group = null, revoke = false } = {}) {
    if (revoke) return revokeKind(to, kind);
    const ldef = kindDef(kind);
    if (ldef && ldef.store === 'live' && !ldef.core && !ldef.local) return sendLive(to, kind, body, ldef, group);
    return serial(async () => {
      await loadLocal();
      const def = kindDef(kind);
      if (!def || def.core || def.local || def.store === 'live') throw fail('BAD_KIND', `Friends can't send "${String(kind).slice(0, 40)}".`);
      const clean = checkBody(kind, body);
      if (clean === undefined) throw fail('BAD_BODY', `That ${kind.split(':')[0]} message does not fit its shape.`);
      if (group != null && !SAFE_ID_RE.test(group)) throw fail('BAD_GROUP', 'A group id is letters, digits, - and _ (at most 64).');
      const identity = await ensureIdentity(dataDir);
      const ids = [...new Set([].concat(to).filter(x => ID_RE.test(x || '')))].slice(0, 64);
      const fr = await getFriends();
      const me = await readDoc(dataDir, 'me');
      const targets = [];
      for (const id of ids) { const f = fr[id]; if (f && await allowed(f, scopeOf(kind), me)) targets.push(f); }
      if (!targets.length) return { id: null, sent: 0, queued: 0, skipped: ids.length };
      const id = newMsgId(), at = now(), lc = clock.tick();
      const envs = group
        ? await sealForGroup({ identity, members: targets, kind, body: clean, g: group, at, lc, id })
        : await Promise.all(targets.map(async (f) => ({ to: f.id, env: await sealPair({ identity, friend: f, kind, body: clean, id, at, lc }) })));
      let sent = 0, queued = 0;
      for (const { to: t, env } of envs) {
        const r = await deliver(identity, fr[t], env);
        if (r === 'direct' || r === 'relay') sent++; else if (r === 'queued') queued++;
      }
      if (def.store === 'event') await addFeed({ id, f: targets.length === 1 ? targets[0].id : null, to: targets.map(f => f.id), dir: 'out', k: kind, at, lc, b: clean, ...(group ? { g: group } : {}) });
      if (def.store === 'event') changed('feed');
      return { id, sent, queued, skipped: ids.length - targets.length };
    });
  }
  /**
   * A live kind (FRIENDS.md section 8): only to friends who are online right now (an open
   * direct link, else their relay's live push when they were heard from in the last 2 minutes
   * or share a presence that is not offline). Never stored, queued or retried; dropped
   * silently for anyone offline or over the kind's rate. Not in the serial queue (nothing is
   * written), so a cursor never waits behind a mailbox read.
   * -> {id, sent, queued: 0, skipped, offline, live: true, failed, why}
   * A knock and its answer (def.knock) wait for the relay's answer and say what went wrong: why is 'rate' (too many
   * a minute), 'cap' (the day's count), 'route' (no way to their mailbox known), 'seal' or 'post' (the relay said no),
   * 'limit' (their relay answered 429: it is turning my messages away, which an older relay does after a day's count);
   * count 'live-post-failed' keeps the tally. Everything else is fire and forget, as before.
   */
  async function sendLive(to, kind, body, def, group) {
    const clean = checkBody(kind, body);
    if (clean === undefined) throw fail('BAD_BODY', `That ${kind.split(':')[0]} message does not fit its shape.`);
    if (group != null && !SAFE_ID_RE.test(group)) throw fail('BAD_GROUP', 'A group id is letters, digits, - and _ (at most 64).');
    await loadLocal();
    const identity = await loadIdentity(dataDir);
    const ids = [...new Set([].concat(to).filter(x => ID_RE.test(x || '')))].slice(0, 64);
    if (!identity || !ids.length) return { id: null, sent: 0, queued: 0, skipped: ids.length, offline: 0, live: true };
    if (!liveCtx || now() - liveCtx.at > 3000) liveCtx = { at: now(), fr: await getFriends(), me: await readDoc(dataDir, 'me') };
    const { fr, me } = liveCtx;
    const targets = [];
    for (const id of ids) { const f = fr[id]; if (f && await allowed(f, scopeOf(kind), me)) targets.push(f); }
    const id = newMsgId(), at = now(), lc = clock.tick();
    const n = group ? targets.map(f => f.id) : null;
    let sent = 0, offline = 0, failed = 0, why = '';
    for (const f of targets) {
      const t = now();
      const linked = !!(direct && direct.isOpen(f.id));
      const seenRecently = t - (heard.get(f.id) || 0) < LIVE_HEARD_MS || presenceNow(local.presence[f.id], t) !== 'offline';
      const road = !linked && !!def.room && !!(liveRoad && liveRoad.has(f.id));
      if (!linked && !road && !seenRecently && !def.knock) { offline++; continue; }
      if (!rateOk(liveOut, `${f.id}|${kind}`, def.rate, t)) { why = why || 'rate'; continue; }
      let env;
      try { env = await sealPair({ identity, friend: f, kind, body: clean, id, at, lc, g: group || null, n }); } catch { why = why || 'seal'; continue; }
      if (linked && await direct.send(f.id, env)) { sent++; continue; }
      if (road && await liveRoad.send(f.id, env)) { sent++; continue; }
      if (def.road || (!seenRecently && !def.knock)) { offline++; continue; }
      // Through their relay: a mailbox post their live socket gets at once (and acks); a late read drops it.
      const day = new Date(t).toISOString().slice(0, 10);
      const b = liveRelay.get(f.id) || { last: 0, day, n: 0, k: 0 };
      if (b.day !== day) { b.day = day; b.n = 0; b.k = 0; }
      if (def.knock ? (b.k || 0) >= LIVE_KNOCK_DAY : (t - b.last < LIVE_RELAY_GAP_MS || b.n >= LIVE_RELAY_DAY)) { why = why || 'cap'; continue; }   // (a knock and its answer come once a visit: their own rate holds them)
      const r = await routeOf(identity, f).catch(() => null);
      if (!r) { why = why || 'route'; continue; }
      if (def.knock) b.k = (b.k || 0) + 1; else { b.last = t; b.n++; }
      liveRelay.set(f.id, b);
      const post = client(r.origin).then(cl => cl.post(r.mbox, r.drop, env));
      if (!def.knock) { post.catch(() => { /* live: never retried */ }); sent++; continue; }
      try { await post; sent++; }
      catch (e) {
        b.k = Math.max(0, (b.k || 1) - 1);   // (it never left: not counted against the day)
        // 429: their relay answered but is turning my messages away (a limit on what one person may post to it): 'limit', not my connection's fault
        const limited = !!e && e.status === 429;
        failed++; why = why || (limited ? 'limit' : 'post'); count('live-post-failed');
        log('info', `friends: a ${kind.split(':')[0]} message could not be posted to a friend's relay (${(e && (e.status || e.relayError || e.code)) || 'error'}${limited ? `, ${e.relayError || 'limit'}, retry ${e.retryAfter || '?'}s` : ''})`);
      }
    }
    return { id, sent, queued: 0, skipped: ids.length - targets.length, offline, failed, why, live: true };
  }
  /** A latest-value kind (profile, share:<scope>) to every friend allowed it; kept for new friends. */
  async function publish(kind, body, { force = false } = {}) {
    const def = kindDef(kind);
    if (!def || (def.store !== 'latest' && def.store !== 'handler') || def.local || def.core) throw fail('BAD_KIND', 'Only profile and share:<scope> can be published.');
    const clean = checkBody(kind, body);
    if (clean === undefined) throw fail('BAD_BODY', `That ${kind} does not fit its shape.`);
    const me = await readDoc(dataDir, 'me');
    const same = me.mine[kind] && JSON.stringify(me.mine[kind].b) === JSON.stringify(clean);
    if (!same) await updateDoc(dataDir, 'me', (d) => { d.mine[kind] = { at: now(), b: clean }; return d; });
    if (same && !force) return { sent: 0, queued: 0, unchanged: true };
    const ids = Object.values(await getFriends()).filter(f => f.status === 'friend').map(f => f.id);
    if (!ids.length) return { sent: 0, queued: 0 };
    return serial(async () => {
      await loadLocal();
      const identity = await ensureIdentity(dataDir);
      const fr = await getFriends();
      let sent = 0, queued = 0;
      for (const id of ids) {
        const f = fr[id];
        if (!f || !(await allowed(f, scopeOf(kind), me))) continue;
        const r = await sendPair(identity, f, kind, clean);
        if (r === 'direct' || r === 'relay') sent++; else if (r === 'queued') queued++;
      }
      return { sent, queued };
    });
  }
  /**
   * Take a latest or handler kind back from friends (sharing turned off): each
   * receiver deletes its copy and its handlers see {revoked: true}. Sent whatever
   * the policy says now (it is because the policy changed). to: id, [ids] or '*'.
   */
  async function revokeKind(to, kind) {
    const def = kindDef(kind);
    if (!def || def.core || def.local || (def.store !== 'latest' && def.store !== 'handler')) throw fail('BAD_KIND', 'Only profile and share:<scope> can be taken back.');
    return serial(async () => {
      const identity = await ensureIdentity(dataDir);
      const fr = await getFriends();
      const ids = to === '*' ? Object.keys(fr) : [...new Set([].concat(to).filter(x => ID_RE.test(x || '')))].slice(0, 500);
      let sent = 0, queued = 0;
      for (const id of ids) {
        const f = fr[id];
        if (!f || f.status !== 'friend') continue;
        const r = await sendPair(identity, f, 'friend:revoke', { k: kind });
        if (r === 'direct' || r === 'relay') sent++; else if (r === 'queued') queued++;
      }
      return { id: null, sent, queued, revoked: true };
    });
  }
  /** Stop publishing a kind: forgotten here (new friends do not get it) and taken back from every friend. */
  async function unpublish(kind) {
    await updateDoc(dataDir, 'me', (d) => { if (!d.mine[kind]) return undefined; delete d.mine[kind]; return d; });
    return revokeKind('*', kind);
  }
  /**
   * A line in the hangout feed (agent 'together': friendsFeedPost). With `to`, the
   * kind is also sent to those friends; without, it stays on your side.
   * event: {kind, body?, text?, icon?, to?, friend?, group?}
   */
  async function feedPost(event = {}) {
    if (!isObj(event)) throw fail('BAD_EVENT', 'A feed post is an object.');
    const kind = typeof event.kind === 'string' ? event.kind : 'note';
    const txt = typeof event.text === 'string' ? cleanLine(event.text, 200) : '';
    const ic = typeof event.icon === 'string' && /^[a-z0-9-]{1,40}$/.test(event.icon) ? event.icon : '';
    if (event.to) {
      const r = await send(event.to, kind, event.body, { group: event.group || null });
      if (r.id && (txt || ic)) await updateDoc(dataDir, 'feed', (d) => { const e = d.msgs[r.id]; if (!e) return undefined; if (txt) e.txt = txt; if (ic) e.ic = ic; return d; });
      return r;
    }
    const def = kindDef(kind);
    if (!def || def.store !== 'event') throw fail('BAD_KIND', 'Feed posts are events (cheer, quest, focus, challenge, space:<id>, note).');
    const b = kind === 'note' ? checkBody('note', { text: txt || 'Something happened', ...(ic ? { icon: ic } : {}) }) : checkBody(kind, event.body);
    if (b === undefined) throw fail('BAD_BODY', 'That feed post does not fit its shape.');
    await loadLocal();
    const f = ID_RE.test(event.friend || '') ? event.friend : null;
    const e = await addFeed({ id: newMsgId(), f, dir: 'local', k: kind, at: now(), lc: clock.tick(), b, ...(txt ? { txt } : {}), ...(ic ? { ic } : {}), ...(event.group && SAFE_ID_RE.test(event.group) ? { g: event.group } : {}) });
    changed('feed');
    return { entry: e };
  }

  // ─── Presence ──────────────────────────────────────────────────────────
  async function effectivePresence() {
    const me = await readDoc(dataDir, 'me');
    if (!me.prefs.presence.share) return null;
    return me.prefs.presence.state === 'auto' ? pageState : me.prefs.presence.state;
  }
  async function presenceTick(force = false) {
    const s = await effectivePresence();
    if (!s) { if (lastPresence.s && lastPresence.s !== 'offline') await broadcastPresence('offline'); lastPresence = { s: null, at: now() }; return; }
    if (!force && s === lastPresence.s && now() - lastPresence.at < PRESENCE_BEAT_MS) return;
    await broadcastPresence(s);
    lastPresence = { s, at: now() };
  }
  async function broadcastPresence(s) {
    const identity = await loadIdentity(dataDir);
    if (!identity) return;
    const me = await readDoc(dataDir, 'me');
    for (const f of Object.values(await getFriends())) {
      if (f.status !== 'friend') continue;
      // 'offline' goes to everyone who may have seen us online
      if (s !== 'offline' && !(await allowed(f, 'presence', me))) continue;
      const env = await sealPair({ identity, friend: f, kind: 'presence', body: { s, ttl: PRESENCE_SEND_TTL }, at: now(), lc: clock.tick() });
      await deliver(identity, f, env, { queue: false });
    }
  }
  /** The page's state (focus timer, a trip, idle): used when sharing is on and set to Auto. */
  async function setPagePresence(state) {
    if (!PRESENCE_STATES.includes(state)) throw fail('BAD_STATE', 'Presence is online, focusing, travelling or away.');
    pageState = state;
    return serial(() => presenceTick());
  }

  // ─── Pulling my mailboxes ──────────────────────────────────────────────
  async function pull() {
    if (pulling) return pulling;
    pulling = (async () => {
      let got = 0;
      const identity = await loadIdentity(dataDir);
      if (!identity) return 0;
      await loadLocal();
      // My mailboxes, and the old identity's mailboxes a key renewal left behind (read with the old key while it still can).
      const boxes = [];
      for (const r of await listRelays(dataDir)) if (r.mbox && !local.retiredBoxes.some(b => b.origin === r.origin && b.mbox === r.mbox)) boxes.push({ origin: r.origin, mbox: r.mbox, key: r.key });
      for (const b of local.retiredBoxes) boxes.push({ origin: b.origin, mbox: b.mbox, retired: b });
      for (const r of boxes) {
        let cl;
        try { cl = r.retired ? await clientForBox(r.origin, r.mbox) : await client(r.origin); } catch { continue; }
        let after = Number(r.retired ? r.retired.cursor : cursorFor(r.key, r.mbox)) || 0;
        for (let page = 0; page < 5; page++) {
          let res;
          try { res = await cl.pull(r.mbox, after, 100); }
          catch (e) {
            // the old key lost its access (the relay was redeployed, or its owner took it off): that mailbox is done
            if (r.retired && e && e.status === 403) local.retiredBoxes = local.retiredBoxes.filter(b => b !== r.retired);
            log('info', `friends: mailbox not read (${e && (e.relayError || e.code)})`);
            break;
          }
          const rids = [];
          for (const it of res.items) { await receive(it.env, 'relay'); rids.push(it.rid); got++; }
          if (rids.length) { try { await cl.ack(r.mbox, rids); } catch { /* acked next time; dedupe covers it */ } }
          after = res.cursor;
          if (r.retired) r.retired.cursor = String(after); else local.cursors[r.key] = `${r.mbox}:${after}`;
          dirtyLocal();
          if (!res.more) break;
        }
      }
      lastPull = now();
      return got;
    })().finally(() => { pulling = null; });
    return pulling;
  }
  async function listenHome() {
    const home = await homeRelay(dataDir);
    const key = home && home.mbox ? `${home.origin}|${home.mbox}` : null;
    for (const [k, stop] of liveStops) if (k !== key) { stop(); liveStops.delete(k); liveState.delete(k); }
    if (!key || liveStops.has(key) || !(await loadIdentity(dataDir))) return;
    let cl;
    try { cl = await clientForBox(home.origin, home.mbox); } catch { return; }
    const stop = cl.listen(home.mbox, {
      onItem: ({ rid, env }) => { receive(env, 'push').then(() => cl.ack(home.mbox, [rid])).catch(() => {}); },
      onState: (s) => { liveState.set(key, s); if (s === 'live') pull().catch(() => {}); },
    });
    if (stop) liveStops.set(key, stop);
  }
  /**
   * Someone is waiting at a gate (a host at home, a visitor who has knocked): make sure a knock or an answer can reach
   * this computer now. With the live connection up there is nothing to do. With it down (the socket waits longer after
   * every failed try, up to 30 minutes) it is opened again at once and the mailbox is read now, so what was posted
   * meanwhile is not left until the next minute's read. At most once every LIVE_WAKE_MS. -> 'live' | 'woken' | 'wait' | 'none'
   */
  async function wakeLive() {
    if (stopping || !(await loadIdentity(dataDir))) return 'none';
    const home = await homeRelay(dataDir);
    const key = home && home.mbox ? `${home.origin}|${home.mbox}` : null;
    if (!key) return 'none';
    if (liveState.get(key) === 'live') return 'live';
    const t = now();
    if (t - lastWake < LIVE_WAKE_MS) return 'wait';
    lastWake = t;
    const stop = liveStops.get(key);
    if (stop && liveState.get(key) === 'down') { try { stop(); } catch { /* closed */ } liveStops.delete(key); liveState.delete(key); }   // (one still opening is left to finish)
    await listenHome();
    await pull().catch(() => {});
    return 'woken';
  }

  // ─── Identity rotation: a friend renewed their keys (FRIENDS.md section 15) ─
  /**
   * friend:rekey from a friend's OLD identity (the old pair key opened it): checked against the
   * key I hold for them (sigOld) and the new card's own key (sigNew), then their record, feed,
   * shared items and this computer's notes move to the new id. Taken once per old id: a second,
   * DIFFERENT renewal of the same old id freezes the friendship until a fresh invite.
   */
  async function onRekey(body, m, identity, f) {
    const card = await verifyCard(body.card);
    if (!card || card.id === m.from || card.id === identity.id) { count('rekey'); return; }
    const doc = await readDoc(dataDir, 'friends');
    const prev = doc.moved[m.from];
    if (prev) {
      if (prev.to === card.id || prev.conflict) return;          // the same renewal again (another device, a retry), or already frozen
      if (!(await verifyRekey({ oldId: m.from, oldEd: prev.ed, card, nonce: body.nonce, sigOld: body.sigOld, sigNew: body.sigNew }))) { count('rekey'); return; }
      await updateDoc(dataDir, 'friends', (d) => {
        if (!d.moved[m.from]) return undefined;
        d.moved[m.from].conflict = card.id;
        const r = d.friends[prev.to];
        if (r && r.status !== 'blocked' && r.status !== 'removing') d.friends[prev.to] = { ...r, status: 'frozen', why: 'renewed-twice', updatedAt: now() };
        return d;
      });
      await refreshTags();
      if (direct) direct.dropPeer(prev.to);
      await addFeed({ id: newMsgId(), f: prev.to, dir: 'local', k: 'renewed', at: now(), lc: clock.tick(), b: { twice: true } });
      log('warn', "friends: a friend's keys were renewed twice; that friendship is paused until a fresh invite");
      changed();
      return;
    }
    if (!f || f.status !== 'friend') { count('not-friend'); return; }
    if (doc.friends[card.id]) { count('rekey'); return; }          // someone here already has that id
    if (!(await verifyRekey({ oldId: f.id, oldEd: f.ed, card, nonce: body.nonce, sigOld: body.sigOld, sigNew: body.sigNew }))) { count('rekey'); return; }
    await moveFriend(identity, f, card, body);
  }
  async function moveFriend(identity, f, card, body) {
    const O = f.id, N = card.id;
    // Their route: the new mailbox in the rekey, else the one I had (sealed again under the new id).
    let route = null;
    if (body.drop) { const o = cleanOrigin(body.drop.origin); if (o && isMbox(body.drop.mbox) && isToken(body.drop.drop)) route = { origin: o, mbox: body.drop.mbox, drop: body.drop.drop }; }
    if (!route) route = await routeOf(identity, f);
    const dropSealed = route ? await sealDrop(identity, `friend|${N}`, route) : null;
    const mine = f.myDrop ? await openDrop(identity, `mine|${O}`, f.myDrop.sealed) : null;
    const myDrop = mine ? { origin: mine.origin, sealed: await sealDrop(identity, `mine|${N}`, mine) } : null;
    // They use MY relay and ask to keep using it: the owner (me) gets one button (answerRelayAsk).
    const home = await homeRelay(dataDir);
    const onMine = (r) => !!(r && home && r.origin === home.origin);
    const ask = body.relayAsk && home && home.role === 'owner' && (onMine(card.relay) || onMine(f.relay)) ? { oldEd: f.ed, at: now() } : null;
    let moved = false;
    await updateDoc(dataDir, 'friends', (d) => {
      const cur = d.friends[O];
      if (!cur || cur.status !== 'friend' || d.friends[N] || d.moved[O]) return undefined;
      const { dropSealed: _d, myDrop: _m, flow: _f, ask: _a, ...rest } = cur;
      d.friends[N] = {
        ...rest, id: N, x: card.x, ed: card.ed, name: cur.name || card.name, relay: cleanRelayRef(card.relay) || cur.relay || null,
        ...(dropSealed ? { dropSealed } : {}), ...(myDrop ? { myDrop } : {}), ...(ask ? { ask } : {}), renewedFrom: O, updatedAt: now(),
      };
      delete d.friends[O];
      d.moved[O] = { to: N, x: cur.x, ed: cur.ed, nonce: body.nonce, at: now() };
      moved = true;
      return d;
    });
    if (!moved) return;
    await updateDoc(dataDir, 'feed', (d) => {
      let n = 0;
      for (const e of Object.values(d.msgs)) {
        if (e.f === O) { e.f = N; n++; }
        if (Array.isArray(e.to) && e.to.includes(O)) { e.to = e.to.map(x => (x === O ? N : x)); n++; }
      }
      return n ? d : undefined;
    });
    await updateDoc(dataDir, 'shared', (d) => {
      let n = 0;
      for (const [k, it] of Object.entries(d.items)) if (it.f === O) { delete d.items[k]; d.items[`${N}|${it.k}`] = { ...it, f: N }; n++; }
      return n ? d : undefined;
    });
    for (const k of ['presence', 'addrs', 'sentAddr']) if (local[k][O]) { local[k][N] = local[k][O]; delete local[k][O]; }
    for (const it of local.outbox) if (it.to === O) it.to = N;    // sealed for their old keys: they still open them for a while
    if (heard.has(O)) { heard.set(N, heard.get(O)); heard.delete(O); }
    liveRelay.delete(O);
    dirtyLocal();
    if (direct) direct.dropPeer(O);
    await refreshTags();
    const rec = (await getFriends())[N];
    await addFeed({ id: newMsgId(), f: N, dir: 'local', k: 'renewed', at: now(), lc: clock.tick(), b: null });
    if (rec) await sendPair(identity, rec, 'friend:rekeyed', null).catch(() => {});
    for (const fn of rekeyFns) { try { await fn(O, N, publicFriend(rec)); } catch { log('warn', 'friends: a renewal handler failed'); } }
    try { emit('friends', { type: 'rekeyed', from: O, to: N }); } catch { /* fine */ }
    log('info', 'friends: a friend renewed their keys; moved to the new ones');
    changed();
  }
  /** A friend moved me to my new keys (I renewed them): counted, and in a member relay's wait, given my new mailbox. */
  async function onRekeyed(f, identity) {
    const R = local.rotation;
    if (!R || identity.id !== R.to || f.status !== 'friend') return;
    R.told[f.id] = 'ok';
    dirtyLocal();
    if (R.memberReady && !R.relayed[f.id]) await relayFriend(R, identity, f).catch(() => {});
    changed();
  }
  /** A friend who renewed their keys and uses my connection: their new key is in, so their old key goes. */
  async function onRelayMoved(body, f) {
    if (f.status !== 'friend' || !f.ask || !f.ask.added || body.old !== f.ask.oldEd) return;
    const home = await homeRelay(dataDir);
    if (home && home.role === 'owner') {
      try { await (await client(home.origin)).revokeMember(body.old); }
      catch (e) { log('info', `friends: an old key was not taken off the relay yet (${e && (e.relayError || e.code)})`); return; }
    }
    await putFriend(f.id, (cur) => { if (!cur || !cur.ask) return undefined; const { ask, ...rest } = cur; return rest; });
  }
  /** The owner's answer to "Sam renewed their keys: let them keep using your connection to friends" (allow: false dismisses it). */
  async function answerRelayAsk(id, allow = true) {
    return serial(async () => {
      const f = await getOr404(id);
      if (!f.ask) return view(f);
      const drop = () => putFriend(id, (cur) => { if (!cur || !cur.ask) return undefined; const { ask, ...rest } = cur; return rest; });
      if (!allow) return view(await drop());
      const home = await homeRelay(dataDir);
      if (!home || home.role !== 'owner') { await drop(); throw fail('NOT_OWNER', "This isn't your own relay any more, so there is nothing to change."); }
      const cl = await client(home.origin);
      let grant;
      try { grant = await cl.memberOf(f.ask.oldEd); } catch (e) { throw relayFail(e); }
      if (!grant || grant.revoked) { await drop(); throw fail('NOT_MEMBER', `${f.nick || f.name || 'They'} no longer use your connection to friends, so there is nothing to move.`); }
      try { await cl.addMember(f.ed, { scopes: grant.scopes, quota: grant.quota }); } catch (e) { throw relayFail(e); }
      return view(await putFriend(id, (cur) => (cur && cur.ask ? { ...cur, ask: { ...cur.ask, added: now() } } : undefined)));
    });
  }

  // ─── Identity rotation: renewing MY keys (FRIENDS.md section 15) ───────
  function notifyRotated(info) {
    for (const fn of rotatedFns) { try { Promise.resolve(fn({ ...info })).catch(() => {}); } catch { /* fine */ } }
    try { emit('friends', { type: 'identity-rotated', oldEd: info.oldEd || null, newEd: info.newEd || null, role: info.role || null, source: info.source || 'here' }); } catch { /* fine */ }
  }
  /**
   * rotateIdentity(): new friend keys for this person (Settings > Friends; "Remove this device
   * and lock it out"). Steps, each resumable (local.rotation; the background pass goes on):
   *   1. what cannot move is closed: open invites, requests in progress, the friend code
   *   2. a new identity is current at once; the old one is retired (kept 14 days only to open
   *      what is still addressed to it); secrets at rest are sealed again; the keyring carries it
   *      to the person's other devices (a device removed from sync never gets it)
   *   3. the relay: owner: the OLD key lets the new one in as a member, the new mailbox is made,
   *      then the relay is redeployed with OWNER_KEY = the new key (server/routes/relay-rotate.mjs
   *      on 'identity-rotated'); member: the relay's owner is asked to let the new key in
   *   4. every friend gets friend:rekey (the new card signed by both keys, under the old pair key)
   */
  async function rotateIdentity() {
    await serial(async () => {
      const R0 = local.rotation;
      if (R0 && R0.step !== 'done') return;
      const O = await loadIdentity(dataDir);
      if (!O) throw fail('NO_IDENTITY', 'There are no friend keys on this computer yet, so there is nothing to renew.');
      const home = await homeRelay(dataDir);
      const me = await readDoc(dataDir, 'me');
      let cancelled = 0;
      // 1. What carries the old keys and cannot move. Open invites close with their relay access
      // (whoever redeemed one and is not a friend goes; requests in progress are cancelled below).
      for (const inv of Object.values(me.invites)) {
        if (inv.dropSealed && !inv.used && !inv.cancelled) await revokeDropSealed(O, `invite|${inv.id}`, inv.dropSealed);
        await dropShort(inv);
        await closeRelayInvite(inv, { members: true, keep: inv.closing ? inv.closing.keep : null });
      }
      // ...and every other open invite on my own relay (one made with the old key by whoever holds it
      // would still let them in after the relay is redeployed with the new key).
      if (home && home.role === 'owner') {
        try { const cl = await client(home.origin); for (const id of (await cl.grants()).invites) await cl.revokeInvite(id); }
        catch (e) { log('info', `friends: your connection to friends's open invites were not all closed (${e && (e.relayError || e.code)}); see Settings > Your connection to friends`); }
      }
      await endLiveCode('cancelled');
      if (me.code) {
        if (home) { try { await (await client(home.origin)).unpublish(await codeKey(me.code.code)); } catch { /* it goes with the old key */ } }
        if (me.code.dropSealed) await revokeDropSealed(O, 'code', me.code.dropSealed);
      }
      await updateDoc(dataDir, 'me', (d) => { if (!Object.keys(d.invites).length && !d.code) return undefined; d.invites = {}; d.code = null; return d; });
      for (const f of Object.values(await getFriends())) {
        if (f.status !== 'requested' && f.status !== 'incoming') continue;
        await sendPair(O, f, 'friend:remove', { forget: true }).catch(() => {});
        if (f.myDrop) await revokeDropSealed(O, `mine|${f.id}`, f.myDrop.sealed);
        await putFriend(f.id, () => null);
        cancelled++;
      }
      // 2. The new identity, and the secrets at rest sealed again with it.
      const r = await rotateIdentityKeys(dataDir, { now });
      const N = r.to;
      await resealAll(r.olds, N);
      local.rotation = {
        from: O.id, to: N.id, fromEd: O.ed.pub, toEd: N.ed.pub, at: now(), nonce: newNonce(), step: 'relay',
        role: home ? home.role : 'none', origin: home ? home.origin : null, memberReady: false, hadCode: !!me.code, cancelled,
        told: {}, relayed: {}, err: null, doneAt: 0, checkedAt: 0, memberAt: 0,
      };
      if (home && home.mbox) {
        local.retiredBoxes = [...local.retiredBoxes.filter(b => !(b.origin === home.origin && b.mbox === home.mbox)),
          { id: O.id, origin: home.origin, mbox: home.mbox, until: now() + RETIRED_KEEP_MS, cursor: cursorFor(home.key, home.mbox) }];
      }
      clients.clear(); clientsFor = null; knownId = N.id;
      localDirty = true;
      await saveLocal();
      log('info', `friends: new friend keys made (${cancelled} request(s) in progress cancelled); telling friends`);
    });
    changed();
    await continueRotation().catch((e) => log('warn', `friends: key renewal waits (${e && (e.code || e.message)})`));
    return rotationView();
  }
  /** Every secret sealed at rest in the friends files, opened with an old identity and sealed again with the new one. */
  async function resealAll(olds, to) {
    const re = async (sealed, label) => {
      if (!sealed || await openAtRest(to, sealed, label)) return sealed;
      for (const o of olds) { const v = await openAtRest(o, sealed, label); if (v) return sealAtRest(to, v, label); }
      return sealed;
    };
    await updateDoc(dataDir, 'friends', async (d) => {
      for (const f of Object.values(d.friends)) {
        if (f.dropSealed) f.dropSealed = await re(f.dropSealed, `drop|friend|${f.id}`);
        if (f.myDrop && f.myDrop.sealed) f.myDrop.sealed = await re(f.myDrop.sealed, `drop|mine|${f.id}`);
      }
      return d;
    });
    await resealRelayTokens(dataDir, olds, to);
  }
  let rotating = null;
  /** The next steps of a renewal in progress (called right away, by the background pass, and by relay-rotate after a redeploy). */
  function continueRotation() {
    if (rotating) return rotating;
    rotating = serial(async () => {
      const R = local.rotation;
      if (!R || R.step === 'done') return;
      const before = JSON.stringify(R);
      const N = await loadIdentity(dataDir);
      if (!N || N.id !== R.to) { R.step = 'done'; R.doneAt = now(); R.err = 'Another renewal of your keys replaced this one.'; dirtyLocal(); return; }
      const O = await retiredById(R.from);       // null once its keys are gone (14 days)
      R.err = null;
      try {
        if (R.step === 'relay') await rotRelay(R, O, N);
        if (R.step === 'tell') await rotTell(R, O, N);
        if (R.step === 'owner' && now() - R.checkedAt > 25000) await rotOwnerCheck(R);
        if (R.step === 'member' && now() - R.checkedAt > 110000) await rotMemberCheck(R, N);
      } catch (e) {
        R.err = e && e.status === 400 ? cleanLine(e.message, 200) : relayErrorText(e);
        log('info', `friends: key renewal waits (${e && (e.relayError || e.code || 'error')})`);
      }
      dirtyLocal();
      if (JSON.stringify(R) !== before) changed();
    }).finally(() => { rotating = null; });
    return rotating;
  }
  async function rotRelay(R, O, N) {
    const home = await homeRelay(dataDir);
    if (R.role === 'none' || !R.origin || !home || home.origin !== R.origin) { R.role = 'none'; R.step = 'tell'; return; }   // no relay, or it changed meanwhile
    if (R.role === 'owner') {
      // While the relay still knows the OLD key as its owner, it lets the new one in as a member, so
      // nothing is lost before it is redeployed with the new owner key.
      if (O) {
        try { await clientAs(O, R.origin).addMember(N.ed.pub, { scopes: ['message', 'sync'] }); }
        catch (e) { if (!(e && e.status === 403)) throw e; }    // already redeployed: the new key is the owner
      }
      const mb = await (await client(R.origin)).mailbox();
      await setRelay(dataDir, { origin: R.origin, role: 'owner', scopes: home.scopes, mbox: mb.mbox }, { home: true });
      R.memberReady = true;
    } else {
      try {
        const mb = await (await client(R.origin)).mailbox();
        await setRelay(dataDir, { origin: R.origin, role: 'member', scopes: home.scopes, mbox: mb.mbox }, { home: true });
        R.memberReady = true;
      } catch (e) { if (!(e && e.status === 403)) throw e; R.memberReady = false; }   // the owner lets the new key in (relayAsk)
    }
    R.step = 'tell';
  }
  async function rotTell(R, O, N) {
    if (O) {
      const home = await homeRelay(dataDir);
      const box = R.memberReady && home && home.origin === R.origin && home.mbox ? home : null;
      const old = local.retiredBoxes.find(b => b.id === R.from) || null;
      const name = firstName(await myName());
      for (const f of Object.values(await getFriends())) {
        if (f.status !== 'friend' || R.told[f.id]) continue;
        let drop = null;
        if (box) { try { drop = { origin: box.origin, mbox: box.mbox, drop: (await (await client(box.origin)).mintDrop(box.mbox, { ttlMs: 365 * DAY })).token }; } catch (e) { throw relayFail(e); } }
        const card = await makeCard(N, { name, relay: box ? { origin: box.origin, mbox: box.mbox } : (old ? { origin: old.origin, mbox: old.mbox } : null), now });
        const body = { card, nonce: R.nonce, ...(await signRekey({ from: O, to: N, card, nonce: R.nonce })), ...(drop ? { drop } : {}) };
        if (R.role === 'member' && !R.memberReady && f.relay && f.relay.origin === R.origin) body.relayAsk = true;
        const env = await sealPair({ identity: O, friend: f, kind: 'friend:rekey', body, at: now(), lc: clock.tick() });
        const res = await deliver(O, f, env);
        R.told[f.id] = res === 'failed' ? 'failed' : 'sent';
        if (drop) {
          R.relayed[f.id] = true;
          const sealed = await sealDrop(N, `mine|${f.id}`, drop);
          const was = f.myDrop;
          await putFriend(f.id, (cur) => (cur ? { ...cur, myDrop: { origin: drop.origin, sealed, at: now() } } : undefined));
          if (was && was.sealed) await revokeDropSealed(N, `mine|${f.id}`, was.sealed);
        }
        dirtyLocal();
      }
    }
    if (R.hadCode && R.memberReady) { try { await makeCode(); R.hadCode = false; } catch { /* made later from Add a friend */ } }
    // Direct links are made again under the new identity.
    if (direct && typeof direct.restart === 'function') await direct.restart().catch(() => {});
    R.step = R.role === 'owner' ? 'owner' : (R.role === 'member' ? 'member' : 'done');
    if (R.role === 'member') R.memberAt = R.memberReady ? now() : 0;
    if (R.step === 'done') R.doneAt = now();
    notifyRotated({ source: 'here', oldEd: R.fromEd, newEd: R.toEd, role: R.role, origin: R.origin });
  }
  /** Owner: done once the relay knows the new key as its owner (redeployed). The old mailbox is then out of reach. */
  async function rotOwnerCheck(R) {
    R.checkedAt = now();
    const me = await (await client(R.origin)).me();
    if (me.role !== 'owner') return;
    R.step = 'done'; R.doneAt = now();
    local.retiredBoxes = local.retiredBoxes.filter(b => b.id !== R.from);
    log('info', 'friends: your connection to friends now trusts only your new keys');
  }
  /** Member: wait until the relay's owner lets the new key in, give friends the new mailbox, then let the owner take the old key off. */
  async function rotMemberCheck(R, N) {
    R.checkedAt = now();
    if (!R.memberReady) {
      let mb;
      try { mb = await (await client(R.origin)).mailbox(); } catch (e) { if (e && e.status === 403) return; throw e; }
      const home = await homeRelay(dataDir);
      await setRelay(dataDir, { origin: R.origin, role: 'member', scopes: home ? home.scopes : ['message'], mbox: mb.mbox }, { home: true });
      R.memberReady = true; R.memberAt = now();
      if (R.hadCode) { try { await makeCode(); R.hadCode = false; } catch { /* later */ } }
    }
    const fr = Object.values(await getFriends()).filter(f => f.status === 'friend');
    for (const f of fr) if (R.told[f.id] === 'ok' && !R.relayed[f.id]) await relayFriend(R, N, f);
    const waiting = fr.filter(f => R.told[f.id] && !(R.told[f.id] === 'ok' && R.relayed[f.id]));
    if (waiting.length && now() - R.memberAt < 3 * DAY) return;
    for (const f of fr) if (f.relay && f.relay.origin === R.origin) await sendPair(N, f, 'friend:relaymoved', { old: R.fromEd }).catch(() => {});
    R.step = 'done'; R.doneAt = now();
  }
  /** My new mailbox to one friend who already moved me to my new keys (friend:relay); the drop into the old mailbox goes. */
  async function relayFriend(R, N, f) {
    const home = await homeRelay(dataDir);
    if (!home || !home.mbox) return;
    let d;
    try { d = await (await client(home.origin)).mintDrop(home.mbox, { ttlMs: 365 * DAY }); } catch (e) { throw relayFail(e); }
    const drop = { origin: home.origin, mbox: home.mbox, drop: d.token };
    const r = await sendPair(N, f, 'friend:relay', { drop });
    if (r === 'failed') return;
    R.relayed[f.id] = true;
    const sealed = await sealDrop(N, `mine|${f.id}`, drop);
    const was = f.myDrop;
    await putFriend(f.id, (cur) => (cur ? { ...cur, myDrop: { origin: drop.origin, sealed } } : undefined));
    if (was && was.sealed) await revokeDropSealed(N, `mine|${f.id}`, was.sealed);
    dirtyLocal();
  }
  /** What the page shows about a renewal: no keys, no nonce. */
  function rotationView() {
    const R = local && local.rotation;
    if (!R) return null;
    const told = Object.values(R.told);
    return {
      step: R.step, at: R.at, doneAt: R.doneAt || 0, role: R.role, relayHost: R.origin ? R.origin.replace(/^https?:\/\//, '') : null,
      friends: told.length, moved: told.filter(x => x === 'ok').length, failed: told.filter(x => x === 'failed').length,
      waiting: R.step === 'owner' ? 'relay-update' : R.step === 'member' ? (R.memberReady ? 'friends' : 'relay-owner') : R.step === 'done' ? null : 'working',
      cancelled: R.cancelled || 0, error: R.err || null,
    };
  }
  /** This person's role on their home relay, asked as the current identity -> 'owner'|'member'|null. */
  async function relayRole() {
    const home = await homeRelay(dataDir);
    if (!home) return null;
    try { return (await (await client(home.origin)).me()).role; } catch { return null; }
  }
  /** The mailbox cursor, kept per mailbox ("<mbox>:<n>"; a plain number is from before, for the current one). */
  function cursorFor(key, mbox) {
    const c = String(local.cursors[key] || '');
    const i = c.lastIndexOf(':');
    if (i > 0) return c.slice(0, i) === mbox ? c.slice(i + 1) : '0';
    return /^\d+$/.test(c) ? c : '0';
  }

  // ─── Views ─────────────────────────────────────────────────────────────
  async function view(f, ctx = null) {
    if (!f) return null;
    const c = ctx || await viewCtx();
    const shared = (k) => { const it = c.shared[`${f.id}|${k}`]; return it ? it.b : null; };
    let step = null;
    // requested + code: 'check' while I still have to compare it (added by code), then 'approve' (their turn)
    if (f.status === 'requested') step = f.flow && f.flow.code ? (f.how === 'code' && !f.flow.ok ? 'check' : 'approve') : 'sent';
    if (f.status === 'incoming') step = f.flow && f.flow.code ? 'check' : 'answering';
    let presence = presenceNow(c.local.presence[f.id], now());
    if (presence === 'offline' && direct && direct.isOpen(f.id)) presence = 'online';
    if (presence === 'offline' && now() - (heard.get(f.id) || 0) < LIVE_HEARD_MS) presence = 'online';   // (they have just sent you something: whatever they share, they are plainly there)
    const entries = c.byFriend.get(f.id) || [];
    return {
      id: f.id, ed: f.ed, name: f.name, nick: f.nick || '', status: f.status, role: f.role, how: f.how, step,
      code: (f.status === 'requested' || f.status === 'incoming') && f.flow && f.flow.code ? formatConfirmCode(f.flow.code) : null,
      theyApproved: f.status === 'requested' && !!(f.flow && f.flow.approved),
      group: f.how === 'group' && f.flow && f.flow.g ? f.flow.g : null,
      addedAt: f.addedAt, friendsAt: f.friendsAt || 0, why: f.why || null, removeAt: f.removeAt || 0, removeAs: f.removeAs || null,
      presence: f.status === 'friend' ? presence : 'offline', direct: !!(direct && direct.isOpen(f.id)),
      relayHost: f.relay ? f.relay.origin.replace(/^https?:\/\//, '') : null,
      perms: { ...(f.perms || {}) }, profile: shared('profile') || (f.status === 'incoming' && f.look ? { name: f.name, ...f.look } : null), game: shared('share:game'), petItems: shared('pet:items'), petPack: shared('pet:pack'),
      friendship: f.status === 'friend' ? friendshipStats(entries, { friendsAt: f.friendsAt, today: dayOf(now()), dayOf }) : null,
      lastAt: entries.length ? Math.max(...entries.map(e => e.at)) : 0,
      // Key renewals (FRIENDS.md section 15): they asked to keep using my connection; they renewed their keys.
      relayAsk: !!(f.ask && !f.ask.added && f.status === 'friend'), renewed: !!f.renewedFrom,
    };
  }
  async function viewCtx() {
    await loadLocal();
    const shared = (await readDoc(dataDir, 'shared')).items;
    const feed = (await readDoc(dataDir, 'feed')).msgs;
    const byFriend = new Map();
    const push = (id, e) => { if (!byFriend.has(id)) byFriend.set(id, []); byFriend.get(id).push(e); };
    for (const e of Object.values(feed)) { if (e.f) push(e.f, e); else if (Array.isArray(e.to)) for (const t of e.to) push(t, e); }
    return { shared, feed, byFriend, local };
  }
  async function snapshot({ create = true } = {}) {
    const identity = create ? await ensureIdentity(dataDir) : await loadIdentity(dataDir);
    if (identity && !started) await start();
    const me = await readDoc(dataDir, 'me');
    const fr = await getFriends();
    const ctx = await viewCtx();
    const friends = [];
    for (const f of Object.values(fr)) friends.push(await view(f, ctx));
    const relays = await listRelays(dataDir);
    const home = relays.find(r => r.home) || null;
    const invites = Object.values(me.invites).filter(i => !i.used && !i.cancelled && i.exp > now()).map(i => ({ id: i.id, exp: i.exp, at: i.at, scopes: i.scopes })).sort((a, b) => b.at - a.at);
    const counts = { friends: 0, incoming: 0, requested: 0, blocked: 0, online: 0, frozen: 0, relayAsks: 0 };
    for (const f of friends) {
      if (f.status === 'frozen') counts.frozen++;
      if (f.relayAsk) counts.relayAsks++;
      if (f.status === 'friend') counts.friends++;
      if (f.status === 'incoming') counts.incoming++;
      if (f.status === 'requested') counts.requested++;
      if (f.status === 'blocked') counts.blocked++;
      if (f.status === 'friend' && f.presence !== 'offline') counts.online++;
    }
    return {
      me: {
        id: identity ? identity.id : null, ed: identity ? identity.ed.pub : null, name: await myName(), code: me.code ? me.code.code : null, codeAt: me.code ? me.code.at : 0, live: liveView(),
        prefs: { presence: { ...me.prefs.presence }, direct: me.prefs.direct, name: me.prefs.name },
        presence: lastPresence.s, invites, mine: Object.keys(me.mine), rotation: rotationView(),
      },
      friends, counts,
      relay: {
        support: await relaySupport(), home: home ? { host: home.host, origin: home.origin, role: home.role, scopes: home.scopes } : null,
        relays: relays.map(r => ({ host: r.host, origin: r.origin, role: r.role, home: r.home })),
        live: home && home.mbox ? (liveState.get(`${home.origin}|${home.mbox}`) || 'off') : 'off', lastPull,
        outbox: local ? local.outbox.length : 0,
      },
      direct: direct ? direct.status() : { on: false },
      dropped: local ? Object.values(local.counts).reduce((a, b) => a + (Number(b) || 0), 0) : 0,
    };
  }
  async function friendDetail(id) {
    const f = await getOr404(id);
    const ctx = await viewCtx();
    const shared = {};
    for (const [k, it] of Object.entries(ctx.shared)) if (it.f === id) shared[it.k] = { at: it.at, b: it.b };
    const feed = (ctx.byFriend.get(id) || []).slice().sort((a, b) => (b.lc - a.lc) || (b.at - a.at)).slice(0, 100);
    return { friend: await view(f, ctx), shared, feed };
  }
  async function feed({ friend = null, kind = null, limit = 50, before = null } = {}) {
    const all = Object.values((await readDoc(dataDir, 'feed')).msgs);
    const fam = typeof kind === 'string' && kind.endsWith(':*') ? kind.slice(0, -1) : null;
    let list = all.filter(e => (!friend || e.f === friend || (Array.isArray(e.to) && e.to.includes(friend)))
      && (!kind || (fam ? e.k.startsWith(fam) : e.k === kind))
      && (before == null || e.lc < Number(before)));
    list.sort((a, b) => (b.lc - a.lc) || (b.at - a.at));
    return list.slice(0, Math.max(1, Math.min(500, Number(limit) || 50)));
  }
  async function setMe({ name, presence, direct: dir } = {}) {
    const out = await updateDoc(dataDir, 'me', (d) => {
      if (typeof name === 'string') d.prefs.name = cleanLine(name, 60);
      if (isObj(presence)) {
        if (typeof presence.share === 'boolean') d.prefs.presence.share = presence.share;
        if (['auto', ...PRESENCE_STATES].includes(presence.state)) d.prefs.presence.state = presence.state;
      }
      if (typeof dir === 'boolean') d.prefs.direct = dir;
      return d;
    });
    if (typeof dir === 'boolean' && direct) direct.refresh();
    serial(() => presenceTick(true)).catch(() => {});
    if (typeof name === 'string') {
      const prof = out.mine && out.mine.profile && out.mine.profile.b && typeof out.mine.profile.b === 'object' ? out.mine.profile.b : {};
      publish('profile', { ...prof, name: cleanLine(name, 60) || cleanLine(getName(), 60) || 'Friend' }).catch(() => {});
    }
    changed();
    return out.prefs;
  }

  // ─── Relay upkeep (every UPKEEP_MS) ────────────────────────────────────
  /** Owner: an invite's member whose request I approved gets what the invite allowed (false: not done now; the upkeep tries again). */
  async function confirmRelayMember(ed) {
    const home = await homeRelay(dataDir);
    if (!home || home.role !== 'owner') return false;
    try { await (await client(home.origin)).confirmMember(ed); return true; } catch (e) { log('info', `friends: relay access not confirmed yet (${e && (e.relayError || e.code)})`); return false; }
  }
  async function relayUpkeep() {
    const identity = await loadIdentity(dataDir);
    const home = await homeRelay(dataDir);
    if (!identity || !home) return;
    const fr = Object.values(await getFriends());
    if (home.role === 'member') {
      // What the owner allows me can change (an invite's access arrives once they approve me): kept as the relay says.
      const me = await (await client(home.origin)).me();
      const was = (home.scopes || []).slice().sort().join(' '), is = me.scopes.slice().sort().join(' ');
      if (me.role === 'member' && is && is !== was) await setRelay(dataDir, { origin: home.origin, role: 'member', scopes: me.scopes, mbox: home.mbox }, { home: true });
    } else if (home.role === 'owner') {
      const cl = await client(home.origin);
      const { members } = await cl.grants();
      const byEd = new Map(fr.map(f => [f.ed, f]));
      const anyFriend = fr.some(f => f.status === 'friend');
      for (const m of members) {
        if (m.revoked) continue;
        const f = byEd.get(m.key), active = !!f && f.status === 'friend';
        // approved (maybe on a computer with an older OpenDash): what their invite allowed applies
        if (m.pending && active) await cl.confirmMember(m.key);
        if (!m.via || !m.via.startsWith('invite:')) continue;          // let in by hand (Settings > Your connection to friends): the owner's call
        if (active) { if (!m.exp || m.exp < now() + MEMBER_RENEW_MS) await cl.memberExpiry(m.key, now() + MEMBER_EXP_MS); }
        else if (anyFriend && !m.exp && !(f && ['incoming', 'requested', 'removing'].includes(f.status))) await cl.memberExpiry(m.key, now() + LEFT_EXP_MS);
      }
    }
    // Drop tokens my friends hold run 365 days: a new one before then (the old one runs out by itself, or goes with the friendship).
    for (const f of fr) {
      if (f.status !== 'friend' || !f.myDrop || !f.myDrop.sealed) continue;
      const since = f.myDrop.at || f.friendsAt || f.addedAt || 0;
      if (since > now() - DROP_RENEW_MS) continue;
      const mine = await mintMyDrop();
      const r = await sendPair(identity, f, 'friend:relay', { drop: mine });
      const sealed = await sealDrop(identity, `mine|${f.id}`, mine);
      if (r === 'failed') { await revokeDropSealed(identity, `mine|${f.id}`, sealed); continue; }
      await putFriend(f.id, (cur) => (cur && cur.status === 'friend' && cur.myDrop ? { ...cur, myDrop: { origin: mine.origin, sealed, at: now(), prev: [cur.myDrop.sealed, ...(cur.myDrop.prev || [])].filter(Boolean).slice(0, 2) } } : undefined));
    }
  }

  // ─── Life cycle ────────────────────────────────────────────────────────
  async function onTick() {
    if (stopping) return;
    try {
      await loadLocal();
      await flushOutbox();
      if (await loadIdentity(dataDir)) {
        const live = [...liveState.values()].includes('live');
        if (now() - lastPull >= (live ? PULL_IDLE_MS : PULL_MS)) await pull();
        await listenHome();
        await finalizeDue();
        if (liveCode && liveCode.exp + LIVE_LATE_MS < now()) await serial(() => endLiveCode('expired'));
        await serial(() => retryRevokes());
        if (now() - lastUpkeep >= UPKEEP_MS) { lastUpkeep = now(); await serial(() => relayUpkeep()).catch((e) => log('info', `friends: relay upkeep waits (${e && (e.relayError || e.code || 'error')})`)); }
        if (local.rotation && local.rotation.step !== 'done') await continueRotation();
        // A friend's renewed key I let onto my connection: if they never said they moved, their old key goes after 2 days.
        for (const f of Object.values(await getFriends())) {
          if (!f.ask || !f.ask.added || now() - f.ask.added < 2 * DAY) continue;
          await onRelayMoved({ old: f.ask.oldEd }, f).catch(() => {});
        }
        await serial(() => presenceTick());
        // invites past their day: their drop tokens go
        const me = await readDoc(dataDir, 'me');
        // (and cancelled ones whose relay access could not be closed yet: tried again)
        for (const inv of Object.values(me.invites)) if (inv.cancelled || (!inv.used && inv.exp < now()) || (inv.used && inv.used.at < now() - 30 * DAY)) await cancelInvite(inv.id);
        // forgotten declines
        for (const f of Object.values(await getFriends())) if (f.status === 'declined' && now() - (f.updatedAt || 0) > 30 * DAY) await putFriend(f.id, () => null);
      }
      await saveLocal();
    } catch (e) { log('warn', `friends: background pass stopped early (${e && (e.code || e.message)})`); }
  }
  async function start() {
    if (started) return;
    started = true;
    await loadLocal();
    const self = await loadIdentity(dataDir);
    if (self) knownId = self.id;
    await refreshTags();
    if (direct) {
      await direct.start();
      const identity = await loadIdentity(dataDir);
      if (identity) for (const f of Object.values(await getFriends())) if (f.status === 'friend') { sendAddr(identity, f).catch(() => {}); const a = local.addrs[f.id]; if (a && now() - a.at < 7 * DAY && await allowed(f, 'direct')) direct.connect(f.id, a.eps).catch(() => {}); }
    }
    tick = timers.setInterval(() => { onTick(); }, 30000);
    if (tick && tick.unref) tick.unref();
    timers.setTimeout(() => { onTick(); }, 1500);
  }
  async function stop() {
    stopping = true;
    if (tick) timers.clearInterval(tick);
    for (const s of liveStops.values()) { try { s(); } catch { /* closed */ } }
    liveStops.clear();
    if (lastPresence.s && lastPresence.s !== 'offline') {
      await Promise.race([broadcastPresence('offline').catch(() => {}), new Promise(r => { const t = timers.setTimeout(r, 2000); if (t && t.unref) t.unref(); })]);
    }
    if (direct) await direct.stop().catch(() => {});
    localDirty = true;
    await saveLocal().catch(() => {});
  }
  /**
   * Another of the person's devices changed a friends file (sync), or the keyring brought a
   * different identity: read it again. A renewal made on another device (FRIENDS.md section 15)
   * is adopted here: relay clients and direct links move to the new keys, and 'identity-rotated'
   * tells the relay page and server/routes/relay-rotate.mjs (which redeploys a relay this
   * computer deployed).
   */
  async function reload() {
    const i = await loadIdentity(dataDir);
    if (i && knownId && i.id !== knownId) {
      const was = knownId;
      knownId = i.id;
      clients.clear(); clientsFor = null;
      if (direct && typeof direct.restart === 'function') await direct.restart().catch(() => {});
      if ((await retiredIds(dataDir)).some(r => r.id === was)) {
        const old = await retiredById(was);
        const home = await homeRelay(dataDir);
        log('info', 'friends: your friend keys were renewed on another device; using the new ones here');
        notifyRotated({ source: 'sync', oldEd: old ? old.ed.pub : null, newEd: i.ed.pub, role: home ? home.role : 'none', origin: home ? home.origin : null });
      }
    } else if (i && !knownId) knownId = i.id;
    await refreshTags();
    if (direct) direct.refresh();
    changed();
  }
  function onLink(id, up) {
    if (up) flushOutbox(id).catch(() => {});
    try { emit('friends', { type: 'presence', id, s: up ? 'online' : 'offline', direct: up }); } catch { /* fine */ }
  }

  return {
    start, stop, reload, snapshot, friendDetail, feed, setMe, rotateCode, showLiveCode, cancelLiveCode, add, addFromGroup, createInvite, cancelInvite,
    setGroupHook(h) { groupHook = h || null; },
    approve, confirm, decline: (id) => decline(id), mismatch: (id) => decline(id, { mismatch: true }), cancel, remove, undoRemove, unblock,
    send, publish, unpublish, feedPost, setPresence: setPagePresence, check: () => pull(), receive, onLink,
    // A session's road and what it needs to know about a friend (lib/friends/live.mjs; never a name, never a private key)
    liveLink: {
      setRoad(r) { liveRoad = r && typeof r.has === 'function' && typeof r.send === 'function' ? r : null; },
      isDirect: (id) => !!(direct && direct.isOpen(id)),
      presenceOk: async (id) => { const f = (await getFriends())[id]; return !!f && await allowed(f, 'presence'); },
      async routeOf(id) { const i = await loadIdentity(dataDir), f = (await getFriends())[id]; if (!i || !f || f.status !== 'friend') return null; const r = await routeOf(i, f).catch(() => null); return { origin: r ? r.origin : null, ed: f.ed }; },
      identity: () => loadIdentity(dataDir),
      home: () => homeRelay(dataDir),
      wake: () => wakeLive().catch(() => 'none'),
    },
    on(kind, fn) {
      if (typeof fn !== 'function' || typeof kind !== 'string' || !(kind === '*' || kind.endsWith(':*') || kindOk(kind))) throw new Error('friends.on(kind, fn)');
      if (!handlers.has(kind)) handlers.set(kind, new Set());
      handlers.get(kind).add(fn);
      return () => handlers.get(kind).delete(fn);
    },
    onRemoved(fn) { removedFns.add(fn); return () => removedFns.delete(fn); },
    onChange(fn) { changeFns.add(fn); return () => changeFns.delete(fn); },
    // Identity rotation (FRIENDS.md section 15)
    rotateIdentity,
    rotation: async () => { await loadLocal(); return rotationView(); },
    /** Look at a renewal's relay step now (server/routes/relay-rotate.mjs after a redeploy). */
    rotationCheck: async () => { await loadLocal(); if (local.rotation) local.rotation.checkedAt = 0; await continueRotation(); return rotationView(); },
    relayRole,
    answerRelayAsk,
    /** fn({source: 'here'|'sync', oldEd, newEd, role: 'owner'|'member'|'none', origin}): this person's keys were renewed. */
    onRotated(fn) { rotatedFns.add(fn); return () => rotatedFns.delete(fn); },
    /** fn(oldId, newId, friend): a friend renewed their keys and moved to a new id (agents keep their own records by friend id). */
    onRekeyed(fn) { rekeyFns.add(fn); return () => rekeyFns.delete(fn); },
    setPolicy(fn) { policy = typeof fn === 'function' ? fn : null; },
    defineKind,
    async friend(id) { const f = (await getFriends())[id]; return publicFriend(f); },
    async list() { return Object.values(await getFriends()).filter(f => f.status === 'friend').map(publicFriend); },
    async shared(friendId, kind) { const it = (await readDoc(dataDir, 'shared')).items[`${friendId}|${kind}`]; return it ? { at: it.at, b: it.b } : null; },
    async me() { const i = await loadIdentity(dataDir); return i ? { id: i.id, name: await myName() } : null; },
    publicIdentity: async () => publicIdentity(await loadIdentity(dataDir)),
    /** Sync: the friends a direct link may be made with (lib/friends/direct.mjs asks during the handshake). */
    get peerMap() { return peerMap; },
  };
}
