// lib/friends/store.mjs - where OpenDash Friends keeps things (docs/dev/FRIENDS.md
// sections 2, 3 and 7). Node only.
//
//   the identity    the device secret store, key 'friends-identity' ({v, current, others}):
//                   never the data folder, never a log line, never an /api answer. It
//                   reaches the person's other devices only inside the encrypted
//                   device-pairing keyring (registerIdentityExtra -> lib/sync/e2e.mjs).
//   data files      <data>/friends/*.json (REL below): me, friends, relays, feed and
//                   shared are synced between the person's own devices (e2e only,
//                   lib/sync/manifest.mjs ── friends ──); local.json stays here.
//                   Tokens in them are sealed at rest with the identity (core.mjs).
//
// Every write goes through lib/fsutil.mjs (atomic, locked). Every read is
// normalised: a file another device wrote is checked like anything else.

import { join, resolve } from 'node:path';
import { readJson, writeJson, withLock } from '../fsutil.mjs';
import { secretStore } from '../secret-store.mjs';
import { hex, sha256, utf8, isPub } from '../sync/e2e-crypto.mjs';
import { registerKeyringExtra, keyringExtrasChanged, EXTRA_PURPOSES } from '../sync/e2e.mjs';
import {
  checkIdentity, newIdentity, pickIdentity, publicIdentity, cleanOrigin, isMbox, isToken,
  sealAtRest, openAtRest, RELAY_SCOPES, normFriend, MSG_ID_RE, ID_RE, SAFE_ID_RE, FRIEND_CODE_RE,
  PRESENCE_STATES, kindOk, cleanLine,
} from './core.mjs';

export const IDENTITY_KEY = 'friends-identity';
export const REL = Object.freeze({
  me: 'friends/me.json', friends: 'friends/friends.json', relays: 'friends/relays.json',
  feed: 'friends/feed.json', shared: 'friends/shared.json', local: 'friends/local.json',
  groups: 'friends/groups.json', groupsLocal: 'friends/groups-local.json',
});
export const FEED_MAX = 3000;
export const FEED_DAYS = 400;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const num = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
const sealedOk = (s) => (isObj(s) && typeof s.iv === 'string' && typeof s.ct === 'string' && s.iv.length <= 32 && s.ct.length <= 4096 ? { iv: s.iv, ct: s.ct } : null);

// ─── The identity ──────────────────────────────────────────────────────────
// Secret store value: {v: 1, current, others: [identity...], retired: [{id, at, until}],
// retiredKeys: [identity...]} (FRIENDS.md section 15). `retired` lists identities that were
// replaced by rotateIdentityKeys: they are never picked again, whatever an older keyring
// brings. Their private halves stay in `retiredKeys` only until `until` (to OPEN messages
// still addressed to them and to finish the move on the relay), never to sign anything new.
// lib/sync/relay-node.mjs reads only current and others, so device certificates move to the new one.
// `unconfirmed`: ids (identities, retired entries) that reached this device ONLY in a
// recovery copy. A recovery copy is signed by none of the person's devices (a removed device
// still knows the recovery key's public half and can wrap anything to it), so these are used
// here but never preferred over a confirmed identity, never passed on in the members' rewraps
// of keys.json, and dropped when a device of the person adds this one without holding them.
// The same ids arriving from a member or a pairing confirm them.
export const RETIRED_KEEP_MS = 14 * 86400000;
const RETIRED_LIST_MS = 400 * 86400000;
const idCache = new Map();          // resolved data dir -> doc | null
async function normIdentityDoc(raw, t = Date.now()) {
  const retired = [];
  if (isObj(raw) && Array.isArray(raw.retired)) {
    for (const r of raw.retired.slice(0, 64)) {
      if (!isObj(r) || !ID_RE.test(r.id || '') || retired.some(x => x.id === r.id)) continue;
      const at = num(r.at), until = num(r.until);
      if (at && t - at > RETIRED_LIST_MS) continue;
      retired.push({ id: r.id, at, until });
      if (retired.length >= 32) break;
    }
  }
  const gone = new Set(retired.map(r => r.id));
  const list = [], keys = [];
  const add = async (i) => { const c = await checkIdentity(i); if (c && !list.some(x => x.id === c.id) && !keys.some(x => x.id === c.id)) (gone.has(c.id) ? keys : list).push(c); };
  if (isObj(raw)) {
    await add(raw.current);
    for (const i of (Array.isArray(raw.others) ? raw.others.slice(0, 8) : [])) await add(i);
    for (const i of (Array.isArray(raw.retiredKeys) ? raw.retiredKeys.slice(0, 8) : [])) await add(i);
  }
  const retiredKeys = keys.filter(i => { const r = retired.find(x => x.id === i.id); return r && r.until > t; });
  const uI = uncSet(isObj(raw) ? raw.unconfirmed : null), uR = uncSet(isObj(raw) ? raw.unconfirmedRetired : null);
  const current = pickIdentity(list.filter(i => !uI.has(i.id))) || pickIdentity(list);
  if (!current && !retired.length) return null;
  return {
    v: 1, current: current || null, others: current ? list.filter(i => i.id !== current.id) : [], retired, retiredKeys,
    unconfirmed: [...uI].filter(x => list.some(i => i.id === x) || retiredKeys.some(i => i.id === x)),
    unconfirmedRetired: [...uR].filter(x => retired.some(r => r.id === x)),
  };
}
const uncSet = (a) => new Set(Array.isArray(a) ? a.slice(0, 64).filter(x => ID_RE.test(x || '')) : []);
async function identityDoc(dataDir) {
  const k = resolve(dataDir);
  if (idCache.has(k)) {
    const d = idCache.get(k);
    // a retired key past its day: dropped from memory at once (the store loses it on the next write)
    if (d && d.retiredKeys.some(i => { const r = d.retired.find(x => x.id === i.id); return !r || r.until <= Date.now(); })) idCache.delete(k);
    else return d;
  }
  const doc = await normIdentityDoc(await secretStore(dataDir).get(IDENTITY_KEY).catch(() => null));
  idCache.set(k, doc);
  return doc;
}
/** The person's identity on this device, or null (none made or received yet). */
export async function loadIdentity(dataDir) { const d = await identityDoc(dataDir); return d ? d.current : null; }
/**
 * Every identity this device holds (the kept one first): to open messages sent to an older
 * one. retired: false leaves out the ones replaced by a rotation (they open pair messages
 * from friends only while their keys are kept; never requests, never signatures).
 */
export async function allIdentities(dataDir, { retired = true } = {}) {
  const d = await identityDoc(dataDir);
  if (!d) return [];
  return [d.current, ...d.others, ...(retired ? d.retiredKeys : [])].filter(Boolean);
}
/** The identities replaced by a rotation whose keys are still kept: [{identity, at, until}]. */
export async function retiredIdentities(dataDir) {
  const d = await identityDoc(dataDir);
  if (!d) return [];
  return d.retiredKeys.map(i => ({ identity: i, ...d.retired.find(r => r.id === i.id) }));
}
/** Ids that were rotated away (never used again): [{id, at, until}]. */
export async function retiredIds(dataDir) { const d = await identityDoc(dataDir); return d ? d.retired.map(r => ({ ...r })) : []; }
/** The identity, made now if there is none (first use of Friends). */
export async function ensureIdentity(dataDir, { now = Date.now } = {}) {
  const have = await loadIdentity(dataDir);
  if (have) return have;
  let made = null;
  await secretStore(dataDir).update(IDENTITY_KEY, async (cur) => {
    const doc = await normIdentityDoc(cur);
    if (doc && doc.current) { made = doc; return undefined; }
    const i = await newIdentity({ now });
    made = { v: 1, current: i, others: [], retired: doc ? doc.retired : [], retiredKeys: doc ? doc.retiredKeys : [], unconfirmed: doc ? doc.unconfirmed : [], unconfirmedRetired: doc ? doc.unconfirmedRetired : [] };
    return made;
  });
  idCache.set(resolve(dataDir), made);
  keyringExtrasChanged();
  return made.current;
}
/**
 * Identity rotation (FRIENDS.md section 15): a new identity becomes current, and every one
 * held before (the current and any others) is retired: never picked again, its keys kept
 * keepMs to open what is still addressed to it. The keyring carries the change to the
 * person's other devices. -> {from: the old current, to: the new one, olds: [every retired identity]}
 */
export async function rotateIdentityKeys(dataDir, { now = Date.now, keepMs = RETIRED_KEEP_MS } = {}) {
  let out = null, next = null;
  await secretStore(dataDir).update(IDENTITY_KEY, async (cur) => {
    const doc = await normIdentityDoc(cur, now());
    if (!doc || !doc.current) throw Object.assign(new Error('There are no friend keys on this computer yet, so there is nothing to renew.'), { status: 400, code: 'NO_IDENTITY' });
    const to = await newIdentity({ now });
    const t = now();
    const olds = [doc.current, ...doc.others];
    const oldIds = new Set(olds.map(i => i.id));
    next = {
      v: 1, current: to, others: [],
      retired: [...olds.map(i => ({ id: i.id, at: t, until: t + keepMs })), ...doc.retired.filter(r => !oldIds.has(r.id))].slice(0, 32),
      retiredKeys: [...olds, ...doc.retiredKeys.filter(i => !oldIds.has(i.id))].slice(0, 8),
      // Retired here on purpose: those retirements are this device's own.
      unconfirmed: doc.unconfirmed.filter(x => !oldIds.has(x)),
      unconfirmedRetired: doc.unconfirmedRetired.filter(x => !oldIds.has(x)),
    };
    out = { from: doc.current, to, olds };
    return next;
  });
  idCache.set(resolve(dataDir), await normIdentityDoc(next));
  keyringExtrasChanged();
  return out;
}
/**
 * Identities that arrived in the keyring from another of the person's devices: merged, the
 * earliest kept, the retired never again. recovery: they came in a recovery copy (unconfirmed,
 * see `unconfirmed` above). join: a device of the person is adding this one: what came only by
 * recovery and that device does not hold is dropped.
 */
export async function takeIdentities(dataDir, incoming, { recovery = false, join = false } = {}) {
  if (!isObj(incoming) || incoming.v !== 1 || !Array.isArray(incoming.ids)) return { changed: false };
  let changed = false, doc = null, before = null;
  await secretStore(dataDir).update(IDENTITY_KEY, async (cur) => {
    const have = await normIdentityDoc(cur);
    before = have && have.current ? have.current.id : null;
    let list = have ? [have.current, ...have.others].filter(Boolean) : [];
    let keys = have ? [...have.retiredKeys] : [];
    let retired = have ? have.retired.map(r => ({ ...r })) : [];
    // Identities and retired entries are confirmed separately (a pairing that carries N as an
    // identity does not confirm a recovery copy's claim that N was retired).
    const uI = new Set(have ? have.unconfirmed : []), uR = new Set(have ? have.unconfirmedRetired : []);
    // What the sender itself holds unconfirmed stays so here; anything else from a member or a pairing confirms.
    const tI = uncSet(incoming.unconfirmed), tR = uncSet(incoming.unconfirmedRetired);
    const cI = new Set(), cR = new Set();
    const mark = (u, theirs, carried, id, isNew) => {
      carried.add(id);
      if (recovery || theirs.has(id)) { if (isNew) u.add(id); }
      else if (u.delete(id)) changed = true;
    };
    for (const r of (Array.isArray(incoming.retired) ? incoming.retired.slice(0, 32) : [])) {
      if (!isObj(r) || !ID_RE.test(r.id || '')) continue;
      const mine = retired.find(x => x.id === r.id);
      if (!mine) { retired.push({ id: r.id, at: num(r.at), until: num(r.until) }); changed = true; }
      else if (num(r.until) > mine.until) { mine.until = num(r.until); changed = true; }
      mark(uR, tR, cR, r.id, !mine);
    }
    for (const raw of [...incoming.ids.slice(0, 8), ...(Array.isArray(incoming.retiredKeys) ? incoming.retiredKeys.slice(0, 8) : [])]) {
      const c = await checkIdentity(raw);
      if (!c) continue;
      const isNew = !list.some(x => x.id === c.id) && !keys.some(x => x.id === c.id);
      if (isNew) { list.push(c); changed = true; }
      mark(uI, tI, cI, c.id, isNew);
    }
    if (join) {
      const dropI = [...uI].filter(id => !cI.has(id)), dropR = [...uR].filter(id => !cR.has(id));
      if (dropI.length || dropR.length) {
        list = list.filter(i => !dropI.includes(i.id)); keys = keys.filter(i => !dropI.includes(i.id)); retired = retired.filter(r => !dropR.includes(r.id));
        for (const id of dropI) uI.delete(id);
        for (const id of dropR) uR.delete(id);
        changed = true;
      }
    }
    if (!changed) { doc = have; return undefined; }
    const raw = { v: 1, current: list[0] || null, others: list.slice(1), retired, retiredKeys: keys, unconfirmed: [...uI], unconfirmedRetired: [...uR] };
    doc = await normIdentityDoc(raw);
    return doc ? { v: 1, current: doc.current, others: doc.others.slice(0, 8), retired: doc.retired, retiredKeys: doc.retiredKeys, unconfirmed: doc.unconfirmed, unconfirmedRetired: doc.unconfirmedRetired } : null;
  });
  idCache.set(resolve(dataDir), doc);
  if (changed) keyringExtrasChanged();
  const current = doc ? doc.current : null;
  return { changed, current, rotated: !!(before && current && before !== current.id && doc.retired.some(r => r.id === before)) };
}
/**
 * Let the device-pairing keyring carry the identity (lib/sync/e2e.mjs). value() is
 * sync, so it gives the cached copy (loaded at start: primeIdentity). It rides in
 * EVERY payload that carries the full sync keyring (EXTRA_PURPOSES: the join code,
 * the 6-digit pairing, the QR offer, the recovery code and the members' keys.json
 * rewraps), so however a device joins, it can use the person's relay and Friends.
 */
export function registerIdentityExtra(dataDir, { onChange = () => {} } = {}) {
  const k = resolve(dataDir);
  return registerKeyringExtra('friends', {
    purposes: EXTRA_PURPOSES,
    value: (purpose) => {
      // Not read yet: nothing said. Read and none: an empty list, so a device this one adds
      // drops what it holds only from a recovery copy (takeIdentities join).
      if (!idCache.has(k)) return null;
      const d = idCache.get(k);
      if (!d) return { v: 1, ids: [], retired: [], retiredKeys: [] };
      // The members' rewraps never pass on what this device holds only from a recovery copy;
      // a pairing it approves carries it marked so (the new device keeps it unconfirmed too).
      const member = purpose === 'member';
      const uI = new Set(d.unconfirmed), uR = new Set(d.unconfirmedRetired);
      const okI = (i) => !!i && !(member && uI.has(i.id));
      return {
        v: 1,
        ids: [d.current, ...d.others].filter(okI),
        retired: d.retired.filter(r => !(member && uR.has(r.id))).map(r => ({ ...r })),
        retiredKeys: d.retiredKeys.filter(i => { const r = d.retired.find(x => x.id === i.id); return okI(i) && r && r.until > Date.now(); }),
        ...(member ? {} : { unconfirmed: [...uI], unconfirmedRetired: [...uR] }),
      };
    },
    take: async (v, by, ctx) => {
      const r = await takeIdentities(dataDir, v, { recovery: !!ctx && ctx.purpose === 'recovery', join: !!ctx && ctx.join === true });
      if (r.changed) onChange(r.current, { rotated: r.rotated });
    },
  });
}
export async function primeIdentity(dataDir) { await identityDoc(dataDir); }
export { publicIdentity };

// ─── Data files ────────────────────────────────────────────────────────────
const fileOf = (dataDir, name) => join(resolve(dataDir), ...REL[name].split('/'));
const sealedMap = (m, max, fn) => {
  const out = {};
  if (!isObj(m)) return out;
  for (const [k, v] of Object.entries(m).slice(0, max)) { const c = fn(k, v); if (c) out[k] = c; }
  return out;
};
const NORM = {
  me(v) {
    const p = isObj(v) && isObj(v.prefs) ? v.prefs : {};
    const pres = isObj(p.presence) ? p.presence : {};
    const out = {
      v: 1,
      prefs: {
        presence: { share: pres.share === true, state: ['auto', ...PRESENCE_STATES].includes(pres.state) ? pres.state : 'auto' },
        direct: p.direct !== false,
        name: typeof p.name === 'string' ? cleanLine(p.name, 60) : '',
      },
      code: null, invites: {}, mine: {},
    };
    if (isObj(v) && isObj(v.code) && FRIEND_CODE_RE.test(v.code.code || '')) out.code = { code: v.code.code, at: num(v.code.at), origin: cleanOrigin(v.code.origin), dropSealed: sealedOk(v.code.dropSealed) };
    out.invites = sealedMap(isObj(v) ? v.invites : null, 100, (id, x) => {
      if (!ID_RE.test(id) || !isObj(x) || !sealedOk(x.sSealed)) return null;
      // short: where its short link's sealed copy is kept (RELAY_PROTOCOL.md 7.8), to delete it when the invite is done
      const short = isObj(x.short) && cleanOrigin(x.short.origin) && /^[0-9a-f]{64}$/.test(x.short.key || '') ? { origin: cleanOrigin(x.short.origin), key: x.short.key } : null;
      // rid: the id of its one-time relay access token on my own relay, to delete it (and close what it let in) when the invite is done
      return { id, at: num(x.at), exp: num(x.exp), sSealed: sealedOk(x.sSealed), origin: cleanOrigin(x.origin), scopes: (Array.isArray(x.scopes) ? x.scopes : []).filter(s => RELAY_SCOPES.includes(s)), rid: /^[A-Za-z0-9_-]{11}$/.test(x.rid || '') ? x.rid : null, closing: isObj(x.closing) ? { keep: isPub(x.closing.keep) ? x.closing.keep : null } : null, used: isObj(x.used) && ID_RE.test(x.used.by || '') ? { by: x.used.by, at: num(x.used.at) } : null, cancelled: x.cancelled === true, dropSealed: sealedOk(x.dropSealed), short };
    });
    out.mine = sealedMap(isObj(v) ? v.mine : null, 50, (k, x) => (kindOk(k) && isObj(x) && Number.isFinite(x.at) ? { at: x.at, b: x.b === undefined ? null : x.b } : null));
    return out;
  },
  friends(v) {
    // moved: friends who renewed their keys (FRIENDS.md section 15), by their OLD id: a second,
    // different renewal of the same old id freezes the friendship instead of moving it again.
    const cut = Date.now() - 90 * 86400000;
    const moved = sealedMap(isObj(v) ? v.moved : null, 500, (id, m) => (ID_RE.test(id) && isObj(m) && ID_RE.test(m.to || '') && isPub(m.x) && isPub(m.ed) && Number.isFinite(m.at) && m.at > cut
      ? { to: m.to, x: m.x, ed: m.ed, nonce: typeof m.nonce === 'string' ? m.nonce.slice(0, 32) : '', at: m.at, ...(ID_RE.test(m.conflict || '') ? { conflict: m.conflict } : {}) } : null));
    return { v: 1, friends: sealedMap(isObj(v) ? v.friends : null, 2000, (id, r) => { const c = normFriend(r); return c && c.id === id ? c : null; }), moved };
  },
  relays(v) {
    const relays = sealedMap(isObj(v) ? v.relays : null, 20, (k, r) => {
      if (!/^[0-9a-f]{16}$/.test(k) || !isObj(r)) return null;
      const origin = cleanOrigin(r.origin);
      if (!origin) return null;
      // sync: true = the person chose this relay for device sync (Settings > Your connection to friends); a member relay is used for
      // sync only then (lib/sync/relay-node.mjs readRelayInfo), never because a friend's invite granted 'sync'
      return { origin, role: r.role === 'owner' ? 'owner' : 'member', scopes: (Array.isArray(r.scopes) ? r.scopes : []).filter(s => RELAY_SCOPES.includes(s)), mbox: isMbox(r.mbox) ? r.mbox : null, at: num(r.at), tokenSealed: sealedOk(r.tokenSealed), ...(r.sync === true ? { sync: true } : {}) };
    });
    const home = isObj(v) && typeof v.home === 'string' && own(relays, v.home) ? v.home : null;
    // sync (2.17.1): the person's choice to sync all their devices through it ({on, at}; lib/sync/engine.mjs)
    const sync = isObj(v) && isObj(v.sync) && typeof v.sync.on === 'boolean' ? { on: v.sync.on, at: num(v.sync.at) } : null;
    return { v: 1, relays, home, ...(sync ? { sync } : {}) };
  },
  feed(v) {
    const msgs = sealedMap(isObj(v) ? v.msgs : null, FEED_MAX * 2, (id, e) => normEntry(id, e));
    return { v: 1, msgs };
  },
  shared(v) {
    return { v: 1, items: sealedMap(isObj(v) ? v.items : null, 20000, (k, x) => {
      const m = /^([0-9a-f]{16})\|(.{2,90})$/.exec(k);
      if (!m || !isObj(x) || x.f !== m[1] || x.k !== m[2] || !kindOk(x.k) || !Number.isFinite(x.at)) return null;
      return { f: x.f, k: x.k, at: x.at, lc: Number.isFinite(x.lc) ? x.lc : x.at, b: x.b === undefined ? null : x.b };
    }) };
  },
  // Groups (docs/dev/GROUPS.md). groups: the person's groups, with every device's keys sealed at rest. groupsLocal: this computer's copy of what it read.
  groups(v) {
    return { v: 1, groups: sealedMap(isObj(v) ? v.groups : null, 200, (id, g) => {
      if (!/^[A-Za-z0-9_-]{22}$/.test(id) || !isObj(g) || !cleanOrigin(g.origin)) return null;
      return {
        id, origin: cleanOrigin(g.origin), status: ['asking', 'member', 'left', 'removed', 'declined', 'gone'].includes(g.status) ? g.status : 'left',
        at: num(g.at), joinedAt: num(g.joinedAt), ed: isPub(g.ed) ? g.ed : null, via: g.via === 'code' ? 'code' : 'link', card: isObj(g.card) ? g.card : null, auth: isObj(g.auth) ? g.auth : null,
        ever: (Array.isArray(g.ever) ? g.ever : []).filter(isPub).slice(-256), me: isObj(g.me) ? g.me : {}, sealed: sealedOk(g.sealed), autoOk: g.autoOk === true, autoAsked: g.autoAsked === true, leftAt: num(g.leftAt), leftN: num(g.leftN), home: g.home === true, asked: num(g.asked),
      };
    }) };
  },
  groupsLocal(v) {
    const o = isObj(v) ? v : {};
    return { v: 1, g: isObj(o.g) ? o.g : {}, jobs: (Array.isArray(o.jobs) ? o.jobs : []).filter(j => isObj(j) && typeof j.t === 'string').slice(-500) };
  },
  local(v) {
    const o = isObj(v) ? v : {};
    const outbox = (Array.isArray(o.outbox) ? o.outbox : []).filter(x => isObj(x) && MSG_ID_RE.test(x.id || '') && ID_RE.test(x.to || '') && isObj(x.env)).slice(0, 500)
      .map(x => ({ id: x.id, to: x.to, env: x.env, tries: Math.min(100, x.tries | 0), next: num(x.next), exp: num(x.exp), at: num(x.at) }));
    const seen = {};
    if (isObj(o.seen)) for (const [k, t] of Object.entries(o.seen)) if (MSG_ID_RE.test(k) && Number.isFinite(t)) seen[k] = t;
    const cursors = sealedMap(o.cursors, 20, (k, c) => (/^[0-9a-f]{16}$/.test(k) && typeof c === 'string' && c.length <= 200 ? c : null));
    const presence = sealedMap(o.presence, 2000, (k, p) => (ID_RE.test(k) && isObj(p) && Number.isFinite(p.at) ? { s: String(p.s || ''), at: p.at, ttl: Number.isFinite(p.ttl) ? p.ttl : null } : null));
    const addrs = sealedMap(o.addrs, 2000, (k, a) => (ID_RE.test(k) && isObj(a) && Array.isArray(a.eps) && Number.isFinite(a.at) ? { eps: a.eps.slice(0, 8), port: a.port | 0, at: a.at } : null));
    // A rotation this computer runs (FRIENDS.md section 15), and the old identity's mailboxes it still reads.
    const R = isObj(o.rotation) && ID_RE.test(o.rotation.from || '') && ID_RE.test(o.rotation.to || '') ? o.rotation : null;
    const marks = (m, ok) => sealedMap(m, 2000, (k, x) => (ID_RE.test(k) && ok.includes(x) ? x : null));
    const rotation = R ? {
      from: R.from, to: R.to, fromEd: isPub(R.fromEd) ? R.fromEd : '', toEd: isPub(R.toEd) ? R.toEd : '', at: num(R.at),
      nonce: typeof R.nonce === 'string' ? R.nonce.slice(0, 32) : '',
      step: ['relay', 'tell', 'owner', 'member', 'done'].includes(R.step) ? R.step : 'done',
      role: ['owner', 'member', 'none'].includes(R.role) ? R.role : 'none', origin: cleanOrigin(R.origin),
      memberReady: R.memberReady === true, hadCode: R.hadCode === true, cancelled: Math.min(1000, R.cancelled | 0),
      told: marks(R.told, ['sent', 'ok', 'failed']), relayed: marks(R.relayed, [true]),
      err: typeof R.err === 'string' ? cleanLine(R.err, 200) : null, doneAt: num(R.doneAt), checkedAt: num(R.checkedAt), memberAt: num(R.memberAt),
    } : null;
    const retiredBoxes = (Array.isArray(o.retiredBoxes) ? o.retiredBoxes : []).filter(b => isObj(b) && ID_RE.test(b.id || '') && cleanOrigin(b.origin) && isMbox(b.mbox) && num(b.until) > Date.now()).slice(0, 8)
      .map(b => ({ id: b.id, origin: cleanOrigin(b.origin), mbox: b.mbox, until: num(b.until), cursor: typeof b.cursor === 'string' && b.cursor.length <= 200 ? b.cursor : '0' }));
    // Revocations the relay has not confirmed yet (engine retryRevokes): a drop token (sealed, as on the friend's
    // record) or a member of my connection (their identity key).
    const revokes = (Array.isArray(o.revokes) ? o.revokes : []).filter(isObj).slice(-500).map((x) => {
      const base = { at: num(x.at), tries: Math.min(100, x.tries | 0), next: num(x.next) };
      if (x.t === 'drop' && typeof x.label === 'string' && /^(?:code|(?:mine|invite|friend)\|[A-Za-z0-9_-]{1,64})$/.test(x.label) && sealedOk(x.sealed)) return { t: 'drop', label: x.label, sealed: sealedOk(x.sealed), ...base };
      if (x.t === 'member' && cleanOrigin(x.origin) && isPub(x.ed)) return { t: 'member', origin: cleanOrigin(x.origin), ed: x.ed, ...base };
      return null;
    }).filter(Boolean);
    return { v: 1, outbox, seen, cursors, presence, addrs, lc: num(o.lc), sentAddr: isObj(o.sentAddr) ? o.sentAddr : {}, counts: isObj(o.counts) ? o.counts : {}, rotation, retiredBoxes, revokes };
  },
};
/** A feed entry, checked (the body was validated when it arrived; this only keeps the shape). */
export function normEntry(id, e) {
  if (!MSG_ID_RE.test(id || '') || !isObj(e) || e.id !== id || !kindOk(e.k) || !Number.isFinite(e.at)) return null;
  const out = { id, f: ID_RE.test(e.f || '') ? e.f : null, dir: ['in', 'out', 'local'].includes(e.dir) ? e.dir : 'local', k: e.k, at: e.at, lc: Number.isFinite(e.lc) ? e.lc : e.at, b: e.b === undefined ? null : e.b };
  if (Array.isArray(e.to)) out.to = e.to.filter(x => ID_RE.test(x)).slice(0, 64);
  if (typeof e.g === 'string' && SAFE_ID_RE.test(e.g)) out.g = e.g;
  if (typeof e.txt === 'string') out.txt = cleanLine(e.txt, 200);
  if (typeof e.ic === 'string' && /^[a-z0-9-]{1,40}$/.test(e.ic)) out.ic = e.ic;
  return out;
}
const DEFAULT = (name) => NORM[name](null);
export async function readDoc(dataDir, name) {
  if (!own(NORM, name)) throw new Error(`unknown friends file ${name}`);
  const v = await readJson(fileOf(dataDir, name), { fallback: null }).catch(() => null);
  return NORM[name](v);
}
/** Read-modify-write under the file's lock: fn(doc) -> the new doc, or undefined for no change. */
export async function updateDoc(dataDir, name, fn) {
  if (!own(NORM, name)) throw new Error(`unknown friends file ${name}`);
  const file = fileOf(dataDir, name);
  return withLock(file, async () => {
    const cur = NORM[name](await readJson(file, { fallback: null }).catch(() => null));
    const next = await fn(cur);
    if (next === undefined) return cur;
    const clean = NORM[name](next);
    if (name === 'feed') trimFeed(clean);
    await writeJson(file, clean);
    return clean;
  });
}
/** Keep the newest FEED_MAX entries of the last FEED_DAYS days. */
export function trimFeed(doc, now = Date.now()) {
  const cut = now - FEED_DAYS * 86400000;
  const list = Object.values(doc.msgs).filter(e => e.at >= cut).sort((a, b) => (b.lc - a.lc) || (b.at - a.at));
  if (list.length === Object.keys(doc.msgs).length && list.length <= FEED_MAX) return doc;
  doc.msgs = {};
  for (const e of list.slice(0, FEED_MAX)) doc.msgs[e.id] = e;
  return doc;
}
export { DEFAULT as emptyDoc };

// ─── Relays (docs/dev/FRIENDS.md section 3) ───────────────────────────────
export async function relayKey(origin) { return hex(await sha256(utf8(`opendash-relay-key-v1\n${origin}`))).slice(0, 16); }
const relayView = (key, r, home) => ({ key, origin: r.origin, host: r.origin.replace(/^https?:\/\//, ''), role: r.role, scopes: r.scopes, mbox: r.mbox, at: r.at, home: key === home, hasToken: !!r.tokenSealed, sync: r.sync === true });
export async function listRelays(dataDir) {
  const d = await readDoc(dataDir, 'relays');
  return Object.entries(d.relays).map(([k, r]) => relayView(k, r, d.home));
}
/** The home relay ({key, origin, host, role, scopes, mbox, home: true}) or null. */
export async function homeRelay(dataDir) {
  const d = await readDoc(dataDir, 'relays');
  return d.home ? relayView(d.home, d.relays[d.home], d.home) : null;
}
/**
 * Record a relay this person owns or belongs to (agent 'relay' calls this when a
 * deployment completes; the friends engine when an invite is redeemed).
 * token (optional): a bearer credential for it, sealed at rest with the identity.
 * sync (optional): true = the person chose it for device sync, false = not; left out = as it was.
 * home: make it the home relay (also when there is none yet).
 */
export async function setRelay(dataDir, { origin, role = 'member', scopes = ['message'], mbox = null, token = null, sync }, { home = false } = {}) {
  const o = cleanOrigin(origin);
  if (!o) throw Object.assign(new Error('That address is not a valid https address.'), { status: 400, code: 'BAD_RELAY' });
  const identity = await ensureIdentity(dataDir);
  const key = await relayKey(o);
  const tokenSealed = isToken(token) ? await sealAtRest(identity, { token }, `relay|${key}`) : null;
  const out = await updateDoc(dataDir, 'relays', (d) => {
    const prev = d.relays[key] || {};
    d.relays[key] = {
      origin: o, role: role === 'owner' ? 'owner' : 'member', scopes: (Array.isArray(scopes) ? scopes : []).filter(s => RELAY_SCOPES.includes(s)),
      mbox: isMbox(mbox) ? mbox : (prev.mbox || null), at: Date.now(), tokenSealed: tokenSealed || prev.tokenSealed || null,
      ...((typeof sync === 'boolean' ? sync : prev.sync === true) ? { sync: true } : {}),
    };
    if (home || !d.home) d.home = key;
    return d;
  });
  return relayView(key, out.relays[key], out.home);
}
export async function removeRelay(dataDir, origin) {
  const o = cleanOrigin(origin);
  if (!o) return false;
  const key = await relayKey(o);
  let had = false;
  await updateDoc(dataDir, 'relays', (d) => {
    if (!own(d.relays, key)) return undefined;
    had = true;
    delete d.relays[key];
    // No other relay takes its place by itself (2.17.1): device sync stays on the folder and the network,
    // friends' messages wait, and Settings > Your connection to friends offers the choice.
    if (d.home === key) d.home = null;
    return d;
  });
  return had;
}
/** The relay's bearer token (opened with the identity), or null. */
export async function relayToken(dataDir, origin) {
  const o = cleanOrigin(origin);
  if (!o) return null;
  const key = await relayKey(o);
  const d = await readDoc(dataDir, 'relays');
  const r = d.relays[key];
  if (!r || !r.tokenSealed) return null;
  // the current identity, else one this device still holds (sealed before a rotation reached here)
  for (const identity of await allIdentities(dataDir)) {
    const v = await openAtRest(identity, r.tokenSealed, `relay|${key}`);
    if (v && isToken(v.token)) return v.token;
  }
  return null;
}
/**
 * After a rotation: every secret sealed at rest in relays.json opened with one of `olds`
 * (or already the new identity's) and sealed again with `to`.
 */
export async function resealRelayTokens(dataDir, olds, to) {
  await updateDoc(dataDir, 'relays', async (d) => {
    let n = 0;
    for (const [key, r] of Object.entries(d.relays)) {
      if (!r.tokenSealed) continue;
      let v = await openAtRest(to, r.tokenSealed, `relay|${key}`);
      if (v) continue;
      for (const o of olds) { v = await openAtRest(o, r.tokenSealed, `relay|${key}`); if (v) break; }
      if (v && isToken(v.token)) { r.tokenSealed = await sealAtRest(to, { token: v.token }, `relay|${key}`); n++; }
    }
    return n ? d : undefined;
  });
}
