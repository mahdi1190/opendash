// lib/sync/e2e.mjs - end-to-end encryption for folder sync: the sync key, who
// may read it, joining a new device, removing one. The engine
// (lib/sync/engine.mjs) calls it through createE2E(); the cryptography is
// lib/sync/e2e-crypto.mjs; the file format is docs/dev/SYNC_FORMAT.md
// section 11.
//
// PLATFORM-AGNOSTIC: Web Crypto only, no node: imports. Two adapters:
//   secrets    this device's secret store ({get, set}: lib/secret-store.mjs on
//              a computer, the Keychain/Keystore in a phone app). The sync
//              keys, this device's private key and the group's member list
//              live there, never in the shared folder.
//   transport  the shared folder (lib/sync/folder.mjs): listFiles, readJson,
//              writeOwnJson, removeOwnFile.
//
// THE MODEL
//   group      one sync group per shared folder: a random 16-hex id.
//   keys       256-bit AES-GCM keys, each with a random id (kid) and an epoch
//              number n. Records are written with the CURRENT key: the
//              highest (n, creator) among the VALID keys. A key is valid when
//              its creator is not removed and it was made knowing every
//              removal this device knows of (its `excl` list). Removing a
//              device therefore always ends in a new key the removed device
//              never receives.
//   identity   each device has an X25519 key pair; its device id is the
//              fingerprint of the public key (e2e-crypto deviceIdOf), so the
//              folder cannot pass another key off as a member's.
//   members    the devices that may read; learned from wraps (authenticated by
//              the sender's identity key) and from rosters (encrypted with a
//              group key: only a holder of the key can announce itself).
//   removed    permanent; learned only from wraps (so only a member can remove).
//
// WHAT IS IN THE SHARED FOLDER (per device, single writer, as everything else):
//   keys.json  {v:2, t:'keys', dev, pub, group, kid, n,
//               to: {<memberId>: wrap of the whole keyring for that member},
//               rec: the keyring wrapped to the recovery key (ECIES),
//               roster: the member list, encrypted with the current key}
//   pair.json  pairing messages and the QR offer (see PAIRING below)
//
// PAIRING ("Approve on your other computer"), through a folder that may be hostile:
//   1. new device N publishes  join: {sid, commit = H(sid, pubN, name, kind, nN)}
//   2. existing device E, after its user clicks "Check it's yours", LOCKS onto
//      that commitment and publishes  approve: {sid, to: N, pubE, group, nE}
//   3. N locks onto the first answer and reveals  join.open = nN
//   4. E checks the commitment. Both show code = 6 digits of H(sid, group,
//      commit, pubN, pubE, nN, nE); the user compares the two screens and
//      confirms on BOTH.
//   5. E sends the keyring wrapped from pubE to pubN (static-static X25519);
//      N opens it only after its own user confirmed.
//   Why the folder cannot win: N's values are fixed (committed) before the
//   folder sees nE, and E's nE is fixed before the folder sees nN, so the
//   folder cannot try keys until the codes match; a man in the middle gets one
//   blind guess (1 in a million) per pairing the user starts, and each side
//   answers only once per session. The code itself never travels.
//   "Scan with your phone": E puts the keyring in pair.json encrypted with a
//   one-time 128-bit secret that exists only in the QR code on E's screen.
//
// RECOVERY CODE: shown once when the group is made (and when a new one is
// made). It stands for an X25519 key pair; members keep only its PUBLIC half
// (never written to the folder) and wrap every new key to it, so the code
// opens the newest key on a new device; nothing on any device can recreate it.

import * as X from './e2e-crypto.mjs';

export const E2E_STATE_KEY = 'sync-e2e';
const ID_RE = /^[0-9a-f]{16}$/;
const KID_RE = /^[0-9a-f]{16}$/;
const SID_RE = /^[0-9a-f]{16}$/;
const OFFER_RE = /^[0-9a-f]{8}$/;
export const PAIR_MS = 15 * 60 * 1000;
export const OFFER_MS = 10 * 60 * 1000;
const ENDED_MS = 2 * 60 * 1000;
const FINAL = new Set(['done', 'expired', 'declined', 'cancelled', 'failed']);
const KINDS = ['computer', 'phone', 'tablet'];
export const cleanName = (s) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const okIso = (s) => typeof s === 'string' && s.length <= 40 && !Number.isNaN(Date.parse(s));

function freshState() {
  return { v: 1, identity: null, group: null, keys: {}, members: {}, removed: {}, names: {}, joined: null };
}
function cleanKeyInfo(k) {
  if (!isObj(k)) return null;
  const raw = X.unb64u(k.k);
  if (!raw || raw.length !== 32 || !Number.isInteger(k.n) || k.n < 1 || k.n > 1e9 || !ID_RE.test(k.by || '')) return null;
  const excl = Array.isArray(k.excl) ? [...new Set(k.excl.filter(x => ID_RE.test(x)))].sort().slice(0, 5000) : [];
  let cut = null;
  if (isObj(k.cut)) { cut = {}; for (const [d, n] of Object.entries(k.cut)) if (ID_RE.test(d) && Number.isInteger(n) && n >= 0) cut[d] = n; }
  return { k: k.k, n: k.n, by: k.by, at: okIso(k.at) ? k.at : null, excl, cut, rec: X.isPub(k.rec) ? k.rec : null };
}
function normalize(v) {
  const s = freshState();
  if (!isObj(v) || v.v !== 1) return s;
  if (isObj(v.identity) && typeof v.identity.priv === 'string' && X.isPub(v.identity.pub) && ID_RE.test(v.identity.deviceId || '')) s.identity = { priv: v.identity.priv, pub: v.identity.pub, deviceId: v.identity.deviceId, createdAt: v.identity.createdAt || null };
  if (ID_RE.test(v.group || '')) s.group = v.group;
  for (const [kid, k] of Object.entries(isObj(v.keys) ? v.keys : {})) { const c = cleanKeyInfo(k); if (KID_RE.test(kid) && c) s.keys[kid] = c; }
  for (const [id, m] of Object.entries(isObj(v.members) ? v.members : {})) if (ID_RE.test(id) && isObj(m) && X.isPub(m.pub)) s.members[id] = cleanMember(m);
  for (const [id, r] of Object.entries(isObj(v.removed) ? v.removed : {})) { const c = cleanRemoved(r); if (ID_RE.test(id) && c) s.removed[id] = c; }
  for (const [id, n] of Object.entries(isObj(v.names) ? v.names : {})) { const c = cleanNameEntry(n); if (ID_RE.test(id) && c) s.names[id] = c; }
  if (isObj(v.joined)) s.joined = { how: String(v.joined.how || '').slice(0, 20), by: ID_RE.test(v.joined.by || '') ? v.joined.by : null, at: okIso(v.joined.at) ? v.joined.at : null };
  return s;
}
function cleanMember(m) {
  return { pub: m.pub, kind: KINDS.includes(m.kind) ? m.kind : 'computer', since: okIso(m.since) ? m.since : null, via: typeof m.via === 'string' ? m.via.slice(0, 60) : null };
}
function cleanRemoved(r) {
  if (!isObj(r) || !ID_RE.test(r.by || '') || !Number.isInteger(r.n) || r.n < 1) return null;
  return { at: okIso(r.at) ? r.at : null, by: r.by, n: r.n, cut: Number.isInteger(r.cut) && r.cut >= 0 ? r.cut : 0 };
}
function cleanNameEntry(n) {
  if (!isObj(n) || !okIso(n.at)) return null;
  const name = cleanName(n.name);
  return name ? { name, at: n.at, by: ID_RE.test(n.by || '') ? n.by : null } : null;
}
const err = (code, message) => Object.assign(new Error(message), { code, status: 400 });

export function createE2E({ secrets, now = () => Date.now(), log = () => {}, kind = 'computer' } = {}) {
  if (!secrets || typeof secrets.get !== 'function' || typeof secrets.set !== 'function') throw new Error('createE2E needs a secret store');
  let S = freshState();
  let loaded = false;
  const aesCache = new Map();                 // kid -> Promise<CryptoKey>
  const fileCache = new Map();                // "<id>/<name>" -> {stamp, value}
  const done = new Map();                     // "<id>/keys.json" -> stamp whose wraps were taken in
  const rosterDone = new Map();               // id -> "<stamp>|<kid>" of the roster last read
  let docs = {};                              // id -> {keys, pair} as last read
  let requests = [];                          // pairing requests from new devices
  let found = { groups: {} };                 // groups seen in the folder (for a device not in one yet)
  let sess = { join: null, approve: null, offer: null };
  let dirty = true;                           // our keys.json must be written again
  let pairDirty = false;
  let lastKeys = null, lastPair = null;      // what we last wrote (to notice someone else changing it)
  let stats = { refused: 0, bad: 0, notMember: 0 };

  const iso = () => new Date(now()).toISOString();
  const me = () => (S.identity ? S.identity.deviceId : null);
  const save = () => secrets.set(E2E_STATE_KEY, S);
  const aes = (kid) => {
    let p = aesCache.get(kid);
    if (!p) { p = X.aesKey(X.unb64u(S.keys[kid].k)); aesCache.set(kid, p); }
    return p;
  };
  const wrapLabel = (group, kid, from, to) => `opendash-wrap-v2|${group}|${kid}|${from}|${to}`;
  const recLabel = (group, kid, from) => `opendash-recovery-wrap-v2|${group}|${kid}|${from}`;
  const pairLabel = (group, sid, from, to) => `opendash-pair-wrap-v2|${group}|${sid}|${from}|${to}`;
  const offerLabel = (group, from, id) => `opendash-offer-wrap-v2|${group}|${from}|${id}`;
  const goneLabel = (group, from, to) => `opendash-removed-v2|${group}|${from}|${to}`;

  async function load() {
    S = normalize(await secrets.get(E2E_STATE_KEY));
    aesCache.clear(); fileCache.clear(); done.clear(); rosterDone.clear();
    loaded = true; dirty = true;
    return S;
  }
  async function ensureLoaded() { if (!loaded) await load(); }

  // ─── Identity ────────────────────────────────────────────────────────
  async function identity() {
    await ensureLoaded();
    if (!S.identity) {
      const kp = await X.newKeyPair();
      S.identity = { ...kp, deviceId: await X.deviceIdOf(kp.pub), createdAt: iso() };
      await save();
    }
    return { deviceId: S.identity.deviceId, pub: S.identity.pub };
  }
  /** Start again with a new key pair and no group (a removed device, or "leave this sync"). */
  async function reset() {
    S = freshState();
    sess = { join: null, approve: null, offer: null };
    aesCache.clear(); fileCache.clear(); done.clear(); rosterDone.clear(); docs = {}; requests = [];
    lastKeys = null; lastPair = null; dirty = true;
    await save();
    return identity();
  }

  // ─── Keys: which one to write with, which records to accept ─────────
  function validKids() {
    const rm = Object.keys(S.removed);
    return Object.entries(S.keys).filter(([, k]) => !own(S.removed, k.by) && rm.every(r => k.excl.includes(r)));
  }
  function currentKid() {
    let best = null;
    for (const [kid, k] of validKids()) {
      if (!best || k.n > best[1].n || (k.n === best[1].n && (k.by > best[1].by || (k.by === best[1].by && kid > best[0])))) best = [kid, k];
    }
    return best ? best[0] : null;
  }
  const latestKey = () => Object.values(S.keys).sort((a, b) => b.n - a.n)[0] || null;
  function reason() {
    if (!S.identity) return 'no-identity';
    if (!S.group) return 'not-joined';
    if (own(S.removed, me())) return 'removed';
    if (!Object.keys(S.keys).length) return 'no-key';
    if (!currentKid()) return 'rotating';
    return null;
  }
  const isReady = () => reason() === null;

  /** 'ok', 'wait' (a key this device does not have yet), or why a record is refused. */
  function accepts(dev, seq, kid) {
    const k = S.keys[kid];
    if (!k) return 'wait';
    const r = S.removed[dev];
    if (r && seq > r.cut) return 'removed-device';
    const kr = S.removed[k.by];
    if (kr && k.n >= kr.n) return 'removed-key';
    // Records under an older key than a removal's new key are accepted only
    // up to what the remover had seen of that device: later ones would have
    // been written with the new key (a device that had not heard yet sends a
    // fresh snapshot with the new key once it has).
    for (const o of Object.values(S.keys)) {
      if (o.cut && o.n > k.n && !own(S.removed, o.by) && seq > (o.cut[dev] ?? 0)) return 'old-key';
    }
    return 'ok';
  }

  // ─── Merging what other members say ──────────────────────────────────
  function mergeRemoved(id, r) {
    if (!ID_RE.test(id) || own(S.removed, id)) return false;
    const c = cleanRemoved(r);
    if (!c) return false;
    // A device this one removed cannot remove it back.
    if (id === me() && own(S.removed, c.by) && S.removed[c.by].by === me()) return false;
    S.removed[id] = c;
    return true;
  }
  function mergeName(id, n) {
    const c = cleanNameEntry(n);
    if (!ID_RE.test(id) || !c) return false;
    const cur = S.names[id];
    if (cur && (cur.at > c.at || (cur.at === c.at && cur.name >= c.name))) return false;
    S.names[id] = c;
    return true;
  }
  async function mergeMembers(members) {
    let changed = false;
    for (const [id, m] of Object.entries(isObj(members) ? members : {})) {
      if (own(S.members, id) || !ID_RE.test(id) || !isObj(m) || !X.isPub(m.pub)) continue;
      if ((await X.deviceIdOf(m.pub)) !== id) continue;          // the id must be the key's fingerprint
      S.members[id] = cleanMember(m);
      changed = true;
    }
    return changed;
  }
  async function mergeKeyring(p) {
    let changed = false;
    for (const [kid, k] of Object.entries(isObj(p.keys) ? p.keys : {})) {
      if (!KID_RE.test(kid) || own(S.keys, kid)) continue;
      const c = cleanKeyInfo(k);
      if (c) { S.keys[kid] = c; changed = true; }
    }
    if (await mergeMembers(p.members)) changed = true;
    for (const [id, r] of Object.entries(isObj(p.removed) ? p.removed : {})) if (mergeRemoved(id, r)) changed = true;
    for (const [id, n] of Object.entries(isObj(p.names) ? p.names : {})) if (mergeName(id, n)) changed = true;
    return changed;
  }
  const keyringPayload = (forId, purpose) => ({
    t: 'keyring', v: 2, group: S.group, purpose, for: forId, by: me(), at: iso(),
    keys: S.keys, members: S.members, removed: S.removed, names: S.names,
  });
  const payloadOk = (p, { group, purpose, forId, by }) => isObj(p) && p.t === 'keyring' && p.v === 2 && p.group === group && (!purpose || p.purpose === purpose) && (!forId || p.for === forId) && (!by || p.by === by) && isObj(p.keys);

  // ─── Our keys.json ───────────────────────────────────────────────────
  async function buildKeysFile() {
    const kid = currentKid();
    const k = S.keys[kid];
    const to = {};
    for (const [id, m] of Object.entries(S.members).sort()) {
      if (id === me() || own(S.removed, id)) continue;
      to[id] = await X.wrapBetween({ myPriv: S.identity.priv, fromPub: S.identity.pub, toPub: m.pub, label: wrapLabel(S.group, kid, me(), id), value: keyringPayload(id, 'member') });
    }
    const rec = k.rec ? await X.wrapTo({ toPub: k.rec, label: recLabel(S.group, kid, me()), value: keyringPayload('recovery', 'recovery') }) : null;
    // Removed devices get no key, but are told (authenticated, so the folder cannot fake it).
    const gone = {};
    for (const [id, r] of Object.entries(S.removed).sort((a, b) => String(b[1].at).localeCompare(String(a[1].at))).slice(0, 20)) {
      if (id === me() || !own(S.members, id)) continue;
      gone[id] = await X.wrapBetween({ myPriv: S.identity.priv, fromPub: S.identity.pub, toPub: S.members[id].pub, label: goneLabel(S.group, me(), id), value: { t: 'removed', v: 2, group: S.group, id, ...r } });
    }
    const roster = await X.sealJson(await aes(kid), { members: S.members, names: S.names, at: iso() }, X.recordAad({ kind: 'roster', group: S.group, dev: me(), file: 'keys.json', seq: 0, kid }));
    return { v: 2, t: 'keys', dev: me(), pub: S.identity.pub, group: S.group, kid, n: k.n, to, rec, gone, roster: { k: kid, ...roster }, at: iso() };
  }

  async function pairFile() {
    const out = { v: 2, t: 'pair', dev: me(), pub: S.identity.pub, at: iso() };
    const J = sess.join;
    if (J && ['waiting', 'compare', 'confirmed', 'cancelled'].includes(J.step)) {
      out.join = { sid: J.sid, commit: J.commit, name: J.name, kind: J.kind, at: J.at, exp: J.exp };
      if (J.peer) out.join.open = J.nonce;
      if (J.step === 'cancelled') out.join.abort = true;
    }
    const A = sess.approve;
    if (A && ['waiting', 'compare', 'sent', 'cancelled', 'failed'].includes(A.step)) {
      out.approve = { sid: A.sid, to: A.to, group: S.group, commit: A.commit, nonce: A.nonce, at: A.at, exp: A.exp };
      if (A.wrap) out.approve.wrap = A.wrap;
      if (A.step === 'cancelled' || A.step === 'failed') out.approve.abort = true;
    }
    if (sess.offer && now() < sess.offer.exp) out.offer = { id: sess.offer.id, exp: sess.offer.exp, iv: sess.offer.enc.iv, ct: sess.offer.enc.ct };
    return out.join || out.approve || out.offer ? out : null;
  }
  async function writePair(ad) {
    pairDirty = false;
    const f = await pairFile();
    if (f) await ad.writeOwnJson('pair.json', f); else await ad.removeOwnFile('pair.json');
    lastPair = f ? JSON.stringify(f) : null;
  }

  // ─── Reading the folder ──────────────────────────────────────────────
  async function readCached(ad, id, name, st) {
    const key = `${id}/${name}`;
    if (!st) { fileCache.delete(key); return null; }
    const stamp = `${st.size}:${st.mtimeMs}`;
    const c = fileCache.get(key);
    if (c && c.stamp === stamp) return c.value;
    const value = await ad.readJson(id, name, 1024 * 1024);
    if (value) fileCache.set(key, { stamp, value });     // half-delivered (null): read again next time
    return value;
  }
  const pubOk = async (id, pub) => X.isPub(pub) && (await X.deviceIdOf(pub)) === id;

  /**
   * One look at the folder: take in other members' keys and member lists,
   * move pairing along, rotate when a removal needs it, write our own files.
   * listing: [{id, files}] from the transport (files.keys / files.pair stats).
   */
  async function refresh(ad, listing) {
    await ensureLoaded();
    docs = {};
    const groups = {};
    for (const { id, files } of listing) {
      if (!ID_RE.test(id) || id === me()) continue;
      const keys = await readCached(ad, id, 'keys.json', files.keys);
      const pair = await readCached(ad, id, 'pair.json', files.pair);
      const ok = !!(keys && keys.v === 2 && keys.t === 'keys' && keys.dev === id && ID_RE.test(keys.group || '') && KID_RE.test(keys.kid || '') && await pubOk(id, keys.pub));
      docs[id] = { keys: ok ? keys : null, pair: pair && pair.v === 2 && pair.t === 'pair' && pair.dev === id && await pubOk(id, pair.pub) ? pair : null, stamp: files.keys ? `${files.keys.size}:${files.keys.mtimeMs}` : null };
      if (ok) groups[keys.group] = (groups[keys.group] || 0) + 1;
    }
    found = { groups };

    if (S.group && S.identity) await takeInMembers();
    if (S.group && S.identity && !own(S.removed, me()) && Object.keys(S.keys).length && !currentKid()) {
      // Two removals at once (or one this device learnt late): no key fits
      // every removal yet. Make one that does.
      await rotate({});
    }
    await movePairing();
    collectRequests();
    const mine = listing.find(x => x.id === me());
    // Our own files changed by someone else (or gone): written again.
    if (mine && mine.files.keys && lastKeys && !dirty) {
      const cur = await readCached(ad, me(), 'keys.json', mine.files.keys);
      if (cur && JSON.stringify(cur) !== lastKeys) dirty = true;
    }
    if (S.group && isReady() && (dirty || !(mine && mine.files.keys))) {
      const f = await buildKeysFile();
      await ad.writeOwnJson('keys.json', f);
      lastKeys = JSON.stringify(f);
      dirty = false;
    }
    const want = await pairFile();
    if (mine && mine.files.pair && lastPair && !pairDirty) {
      const cur = await readCached(ad, me(), 'pair.json', mine.files.pair);
      if (cur && JSON.stringify(cur) !== lastPair) pairDirty = true;
    }
    if (pairDirty || (mine && !!mine.files.pair !== !!want)) await writePair(ad);
    return status();
  }

  async function takeInMembers() {
    let changed = false;
    for (let round = 0; round < 4; round++) {
      let more = false;
      // Wraps for this device, from members only (authenticated by their identity key).
      for (const [id, d] of Object.entries(docs)) {
        const J = d.keys;
        if (!J || J.group !== S.group || !J.to || !J.to[me()]) continue;
        if (done.get(`${id}/keys.json`) === d.stamp) continue;
        if (!own(S.members, id) || own(S.removed, id) || S.members[id].pub !== J.pub) { stats.notMember++; continue; }
        const p = await X.unwrapBetween({ myPriv: S.identity.priv, fromPub: J.pub, toPub: S.identity.pub, label: wrapLabel(S.group, J.kid, id, me()), enc: J.to[me()] });
        if (!payloadOk(p, { group: S.group, purpose: 'member', forId: me(), by: id }) || !own(p.keys, J.kid)) { stats.bad++; continue; }
        if (await mergeKeyring(p)) more = true;
        done.set(`${id}/keys.json`, d.stamp);
      }
      // "You were removed": a member tells a device it no longer wraps keys for.
      for (const [id, d] of Object.entries(docs)) {
        const J = d.keys;
        if (!J || J.group !== S.group || !isObj(J.gone) || !J.gone[me()] || own(S.removed, me())) continue;
        if (!own(S.members, id) || own(S.removed, id) || S.members[id].pub !== J.pub) continue;
        const g = await X.unwrapBetween({ myPriv: S.identity.priv, fromPub: J.pub, toPub: S.identity.pub, label: goneLabel(S.group, id, me()), enc: J.gone[me()] });
        if (isObj(g) && g.t === 'removed' && g.v === 2 && g.group === S.group && g.id === me() && mergeRemoved(me(), g)) { more = true; log('warn', 'sync: this device was removed from the sync group'); }
      }
      // Rosters, encrypted with the CURRENT key: a device that holds it may
      // announce itself (one that only has older keys, say from a recovery
      // code that was replaced, cannot).
      const cur = currentKid();
      for (const [id, d] of Object.entries(docs)) {
        const J = d.keys;
        if (!cur || !J || J.group !== S.group || !J.roster || J.roster.k !== cur || own(S.removed, id)) continue;
        if (rosterDone.get(id) === `${d.stamp}|${cur}`) continue;
        rosterDone.set(id, `${d.stamp}|${cur}`);
        const r = await X.openJson(await aes(cur), J.roster, X.recordAad({ kind: 'roster', group: S.group, dev: id, file: 'keys.json', seq: 0, kid: cur }));
        if (!isObj(r)) { stats.bad++; continue; }
        if (await mergeMembers(r.members)) more = true;
        for (const [nid, n] of Object.entries(isObj(r.names) ? r.names : {})) if (mergeName(nid, n)) more = true;
      }
      if (!more) break;
      changed = true;
    }
    if (changed) { dirty = true; await save(); }
    return changed;
  }

  // ─── Making the group, joining it ────────────────────────────────────
  /** The first device: a new group, its first key and the recovery code (returned once, never stored). */
  async function createGroup({ group } = {}) {
    await identity();
    if (S.group) throw err('ALREADY_IN_GROUP', 'This computer already syncs.');
    const r = X.newRecoveryCode();
    const rec = (await X.recoveryKeyPair(r.entropy)).pub;
    S.group = group && ID_RE.test(group) ? group : X.randomId(8);
    const kid = X.randomId(8);
    S.keys = { [kid]: { k: X.b64u(X.newSecretKey()), n: 1, by: me(), at: iso(), excl: [], cut: null, rec } };
    S.members = { [me()]: { pub: S.identity.pub, kind, since: iso(), via: 'created' } };
    S.removed = {}; S.names = {};
    S.joined = { how: 'created', by: me(), at: iso() };
    dirty = true;
    await save();
    return { group: S.group, code: r.code };
  }

  async function adopt(p, how, by) {
    if (S.group && S.group !== p.group) throw err('OTHER_GROUP', 'This computer belongs to another sync.');
    S.group = p.group;
    await mergeKeyring(p);
    if (own(S.removed, me())) {
      // This identity was removed earlier: come back as a new device.
      const keep = { keys: S.keys, members: S.members, removed: S.removed, names: S.names, group: S.group };
      const kp = await X.newKeyPair();
      S.identity = { ...kp, deviceId: await X.deviceIdOf(kp.pub), createdAt: iso() };
      Object.assign(S, keep);
    }
    S.members[me()] = { pub: S.identity.pub, kind, since: iso(), via: how };
    S.joined = { how: how.split(':')[0], by: by || null, at: iso() };
    dirty = true;
    done.clear();
    await save();
  }

  /** Join with the recovery code: the newest keyring any member wrapped to the recovery key. */
  async function joinWithRecovery(code, ad, listing) {
    await identity();
    const parsed = X.parseRecoveryCode(code);
    if (!parsed.ok) throw err('BAD_CODE', parsed.message);
    const rk = await X.recoveryKeyPair(parsed.entropy);
    if (listing) await refresh(ad, listing);
    let best = null, tried = 0;
    for (const [id, d] of Object.entries(docs)) {
      const J = d.keys;
      if (!J || !J.rec || (S.group && J.group !== S.group)) continue;
      tried++;
      const p = await X.unwrapTo({ myPriv: rk.priv, myPub: rk.pub, label: recLabel(J.group, J.kid, id), enc: J.rec });
      if (!payloadOk(p, { group: J.group, purpose: 'recovery', by: id }) || !own(p.keys, J.kid)) continue;
      const n = (cleanKeyInfo(p.keys[J.kid]) || {}).n || 0;
      if (!best || n > best.n) best = { p, n, id };
    }
    if (!best) {
      if (!tried) throw err('NO_GROUP', 'OpenDash sync was not found in this folder yet. If your cloud drive is still downloading, wait a minute and try again.');
      throw err('WRONG_CODE', 'That recovery code does not open the sync in this folder. Check it and try again.');
    }
    // An old code may still open an old copy (a removed device's folder keeps
    // one): it must open the newest key the members announce.
    const p = best.p;
    let newest = 0;
    for (const [id, d] of Object.entries(docs)) {
      const J = d.keys;
      if (J && J.group === p.group && Number.isInteger(J.n) && isObj(p.members) && own(p.members, id) && !(isObj(p.removed) && own(p.removed, id))) newest = Math.max(newest, J.n);
    }
    if (best.n < newest) throw err('OLD_CODE', 'That recovery code was replaced by a newer one. Use the newest recovery code you saved.');
    const wasRemoved = S.group === best.p.group && own(S.removed, me());
    await adopt(best.p, 'recovery', null);
    log('info', `sync: joined with the recovery code${wasRemoved ? ' (as a new device)' : ''}`);
    return { ok: true, group: S.group, deviceId: me() };
  }

  // ─── Removing a device, a new recovery code ──────────────────────────
  /**
   * A new current key. remove: devices that must never get it (recorded as
   * removed; their records after `frontier[id]` are refused). newRecovery: a
   * new recovery code (returned once). frontier: what this device has seen.
   */
  async function rotate({ remove = [], newRecovery = false, frontier = {}, seq = 0 } = {}) {
    const n = Math.max(0, ...Object.values(S.keys).map(k => k.n)) + 1;
    for (const id of remove) if (!own(S.removed, id)) S.removed[id] = { at: iso(), by: me(), n, cut: Number.isInteger(frontier[id]) ? frontier[id] : 0 };
    const cur = S.keys[currentKid()] || latestKey();
    let rec = cur ? cur.rec : null, code = null;
    if (newRecovery) {
      const r = X.newRecoveryCode();
      rec = (await X.recoveryKeyPair(r.entropy)).pub;
      code = r.code;
    }
    const kid = X.randomId(8);
    const cut = remove.length ? { ...Object.fromEntries(Object.entries(frontier).filter(([d, v]) => ID_RE.test(d) && Number.isInteger(v))), [me()]: seq } : null;
    S.keys[kid] = { k: X.b64u(X.newSecretKey()), n, by: me(), at: iso(), excl: Object.keys(S.removed).sort(), cut, rec };
    dirty = true;
    await save();
    log('info', `sync: new sync key (number ${n})${remove.length ? `; removed ${remove.length} device${remove.length === 1 ? '' : 's'}` : ''}${newRecovery ? '; new recovery code' : ''}`);
    return { kid, n, code };
  }
  async function removeDevice(id, { frontier = {}, seq = 0 } = {}) {
    if (!isReady()) throw err('NOT_READY', 'This computer cannot change the sync right now.');
    if (!ID_RE.test(id || '') || id === me()) throw err('BAD_DEVICE', 'Choose another device to remove.');
    if (own(S.removed, id)) return { ok: true, already: true };
    if (!own(S.members, id)) throw err('BAD_DEVICE', 'That device is not part of this sync.');
    const r = await rotate({ remove: [id], frontier, seq });
    return { ok: true, n: r.n };
  }
  async function newRecoveryCode() {
    if (!isReady()) throw err('NOT_READY', 'This computer cannot change the sync right now.');
    const r = await rotate({ newRecovery: true });
    return { code: r.code };
  }
  async function rename(id, name) {
    const n = cleanName(name);
    if (!ID_RE.test(id || '') || !n) throw err('BAD_NAME', 'Type a name.');
    S.names[id] = { name: n, at: iso(), by: me() };
    dirty = true;
    await save();
    return { ok: true };
  }

  // ─── Pairing: the new device ─────────────────────────────────────────
  async function pairStart({ name, kind: k } = {}) {
    await identity();
    if (S.group && isReady()) throw err('ALREADY_IN_GROUP', 'This computer already syncs.');
    // A removed device asks again as a new one (its old id stays removed for good).
    if (S.group && own(S.removed, me())) await reset();
    const sid = X.randomId(8);
    const nonce = X.b64u(X.randomBytes(32));
    const nm = cleanName(name) || 'New computer';
    const kd = KINDS.includes(k) ? k : kind;
    sess.join = { sid, nonce, name: nm, kind: kd, at: now(), exp: now() + PAIR_MS, step: 'waiting', commit: await X.pairCommitment({ sid, pub: S.identity.pub, name: nm, kind: kd, nonce }) };
    pairDirty = true;
    return pairingStatus();
  }
  // ─── Pairing: the existing device ────────────────────────────────────
  function collectRequests() {
    requests = [];
    if (!S.group || !isReady()) return;
    for (const [id, d] of Object.entries(docs)) {
      const j = d.pair && d.pair.join;
      if (!isObj(j) || !SID_RE.test(j.sid || '') || typeof j.commit !== 'string' || j.abort) continue;
      if (own(S.members, id) || own(S.removed, id)) continue;
      if (!Number.isFinite(j.exp) || j.exp < now() || j.exp > now() + PAIR_MS + 5 * 60 * 1000) continue;
      requests.push({ sid: j.sid, deviceId: id, name: cleanName(j.name) || 'A new computer', kind: KINDS.includes(j.kind) ? j.kind : 'computer', at: Number.isFinite(j.at) ? j.at : null });
    }
    requests.sort((a, b) => (b.at || 0) - (a.at || 0));
  }
  async function pairRespond(sid) {
    if (!isReady()) throw err('NOT_READY', 'This computer cannot add another one right now.');
    const r = requests.find(x => x.sid === sid);
    const j = r && docs[r.deviceId] && docs[r.deviceId].pair && docs[r.deviceId].pair.join;
    if (!r || !j) throw err('NO_REQUEST', 'That request has gone. Start again on the new computer.');
    sess.approve = { sid, to: r.deviceId, toPub: docs[r.deviceId].pair.pub, commit: j.commit, name: r.name, kind: r.kind, nonce: X.b64u(X.randomBytes(32)), at: now(), exp: now() + PAIR_MS, step: 'waiting' };
    pairDirty = true;
    return pairingStatus();
  }

  async function pairConfirm(sid, match) {
    const J = sess.join, A = sess.approve;
    if (J && J.sid === sid) {
      if (J.step !== 'compare') throw err('NOT_YET', 'There is nothing to confirm yet.');
      J.step = match ? 'confirmed' : 'cancelled';
      pairDirty = true;
      return pairingStatus();
    }
    if (A && A.sid === sid) {
      if (A.step !== 'compare') throw err('NOT_YET', 'There is nothing to confirm yet.');
      if (!match) { A.step = 'cancelled'; pairDirty = true; return pairingStatus(); }
      if (!isReady()) throw err('NOT_READY', 'This computer cannot add another one right now.');
      S.members[A.to] = { pub: A.toPub, kind: A.kind, since: iso(), via: `pair:${me()}` };
      S.names[A.to] = S.names[A.to] || { name: A.name, at: iso(), by: me() };
      A.wrap = await X.wrapBetween({ myPriv: S.identity.priv, fromPub: S.identity.pub, toPub: A.toPub, label: pairLabel(S.group, A.sid, me(), A.to), value: keyringPayload(A.to, 'pair') });
      A.step = 'sent';
      dirty = true; pairDirty = true;
      await save();
      log('info', 'sync: approved a new device');
      return pairingStatus();
    }
    throw err('NO_PAIRING', 'That pairing has ended. Start again.');
  }
  function pairCancel() {
    if (sess.join && ['waiting', 'compare', 'confirmed'].includes(sess.join.step)) sess.join.step = 'cancelled';
    if (sess.approve && ['waiting', 'compare'].includes(sess.approve.step)) sess.approve.step = 'cancelled';
    pairDirty = true;
    return pairingStatus();
  }

  async function movePairing() {
    const J = sess.join;
    if (J) {
      if (['waiting', 'compare', 'confirmed'].includes(J.step) && now() > J.exp) { J.step = 'expired'; pairDirty = true; }
      if (J.step === 'waiting') {
        // The first answer for this request wins; the code tells the user if it was not their other computer.
        for (const id of Object.keys(docs).sort()) {
          const a = docs[id].pair && docs[id].pair.approve;
          if (!isObj(a) || a.sid !== J.sid || a.to !== me() || a.abort || a.commit !== J.commit || typeof a.nonce !== 'string' || !ID_RE.test(a.group || '')) continue;
          J.peer = { dev: id, pub: docs[id].pair.pub, nonce: a.nonce, group: a.group };
          J.code = await X.pairCode({ sid: J.sid, group: a.group, commit: J.commit, joinPub: S.identity.pub, approvePub: J.peer.pub, joinNonce: J.nonce, approveNonce: a.nonce });
          J.step = 'compare';
          pairDirty = true;
          break;
        }
      }
      if (J.peer && ['compare', 'confirmed'].includes(J.step)) {
        const pd = docs[J.peer.dev] && docs[J.peer.dev].pair;
        const a = pd && pd.pub === J.peer.pub ? pd.approve : null;
        if (a && a.sid === J.sid && a.abort) { J.step = 'declined'; pairDirty = true; }
        else if (J.step === 'confirmed' && a && a.sid === J.sid && a.wrap) {
          const p = await X.unwrapBetween({ myPriv: S.identity.priv, fromPub: J.peer.pub, toPub: S.identity.pub, label: pairLabel(J.peer.group, J.sid, J.peer.dev, me()), enc: a.wrap });
          if (payloadOk(p, { group: J.peer.group, purpose: 'pair', forId: me(), by: J.peer.dev }) && own(p.members || {}, J.peer.dev)) {
            await adopt(p, `pair:${J.peer.dev}`, J.peer.dev);
            J.step = 'done';
            pairDirty = true;
            log('info', 'sync: joined: the other computer approved this one');
          } else { J.step = 'failed'; pairDirty = true; }
        }
      }
    }
    const A = sess.approve;
    if (A) {
      if (['waiting', 'compare'].includes(A.step) && now() > A.exp) { A.step = 'expired'; pairDirty = true; }
      const pd = docs[A.to] && docs[A.to].pair;
      const j = pd && pd.pub === A.toPub ? pd.join : null;
      if (A.step === 'waiting' && j && j.sid === A.sid) {
        if (j.abort) { A.step = 'declined'; pairDirty = true; }
        else if (j.commit !== A.commit) { A.step = 'failed'; A.why = 'changed'; pairDirty = true; }
        else if (typeof j.open === 'string') {
          const c = await X.pairCommitment({ sid: A.sid, pub: pd.pub, name: j.name, kind: j.kind, nonce: j.open });
          if (c !== A.commit) { A.step = 'failed'; A.why = 'changed'; pairDirty = true; }
          else {
            A.code = await X.pairCode({ sid: A.sid, group: S.group, commit: A.commit, joinPub: A.toPub, approvePub: S.identity.pub, joinNonce: j.open, approveNonce: A.nonce });
            A.step = 'compare';
          }
        }
      } else if (A.step === 'compare' && j && j.sid === A.sid && j.abort) { A.step = 'declined'; pairDirty = true; }
      if (A.step === 'sent') {
        const k = docs[A.to] && docs[A.to].keys;
        if ((k && k.group === S.group) || now() > A.exp) { A.step = 'done'; pairDirty = true; }
      }
    }
    // A finished session stays on screen for a moment, then goes.
    for (const which of ['join', 'approve']) {
      const s = sess[which];
      if (!s || !FINAL.has(s.step)) continue;
      s.endedAt = s.endedAt || now();
      if (now() - s.endedAt > ENDED_MS) { sess[which] = null; pairDirty = true; }
    }
    if (sess.offer) {
      const used = Object.values(S.members).some(m => m.via === `offer:${me()}:${sess.offer.id}`);
      if (used || now() > sess.offer.exp) { sess.offer = null; pairDirty = true; }
    }
  }

  function pairingStatus() {
    const J = sess.join, A = sess.approve;
    if (J) return { role: 'join', sid: J.sid, step: J.step, code: J.step === 'compare' || J.step === 'confirmed' ? J.code : null, expiresAt: J.exp, name: J.name };
    if (A) return { role: 'approve', sid: A.sid, step: A.step, code: A.step === 'compare' ? A.code : null, expiresAt: A.exp, name: A.name, kind: A.kind, why: A.why || null };
    return null;
  }

  // ─── "Scan with your phone": a one-time offer ────────────────────────
  async function makeOffer() {
    if (!isReady()) throw err('NOT_READY', 'This computer cannot add another one right now.');
    const id = X.randomId(4);
    const secret = X.randomBytes(16);
    const label = offerLabel(S.group, me(), id);
    const enc = await X.sealJson(await X.secretKeyFrom(secret, label), keyringPayload(`offer:${id}`, 'offer'), X.utf8(label));
    const exp = now() + OFFER_MS;
    const text = `opendash-join:1:${S.group}:${me()}:${id}:${X.b64u(secret)}`;
    sess.offer = { id, exp, enc, text };
    pairDirty = true;
    return { text, expiresAt: exp };
  }
  async function joinWithOffer(text, ad) {
    await identity();
    const m = /^opendash-join:1:([0-9a-f]{16}):([0-9a-f]{16}):([0-9a-f]{8}):([A-Za-z0-9_-]{22})$/.exec(String(text || '').trim());
    if (!m) throw err('BAD_OFFER', 'That is not an OpenDash code. Scan the code on your other device again.');
    const [, group, dev, id, sec] = m;
    const secret = X.unb64u(sec);
    if (!secret || secret.length !== 16) throw err('BAD_OFFER', 'That is not an OpenDash code. Scan the code on your other device again.');
    const pair = await ad.readJson(dev, 'pair.json', 1024 * 1024);
    const o = pair && pair.v === 2 && pair.dev === dev && pair.offer;
    if (!isObj(o) || o.id !== id) throw err('NO_OFFER', 'The code is not in the sync folder yet. If your cloud drive is still downloading, wait a minute and try again.');
    if (!Number.isFinite(o.exp) || o.exp < now()) throw err('OFFER_EXPIRED', 'That code has run out. Make a new one on your other device.');
    const label = offerLabel(group, dev, id);
    const p = await X.openJson(await X.secretKeyFrom(secret, label), o, X.utf8(label));
    if (!payloadOk(p, { group, purpose: 'offer', by: dev })) throw err('BAD_OFFER', 'That code does not open the sync in this folder.');
    await adopt(p, `offer:${dev}:${id}`, dev);
    return { ok: true, group: S.group, deviceId: me() };
  }

  // ─── Records ─────────────────────────────────────────────────────────
  const aad = (kind, dev, file, seq, kid) => X.recordAad({ kind, group: S.group, dev, file, seq, kid });
  async function sealLine(line, file) {
    const kid = currentKid();
    const enc = await X.sealJson(await aes(kid), { h: line.h, s: line.s, w: line.w, x: line.x }, aad('log', me(), file, line.n, kid));
    return { v: 2, dev: me(), n: line.n, enc: { k: kid, ...enc } };
  }
  /** {line} (a v1-shaped change), {wait} (key not here yet), {refused: why} or {bad: why}. */
  async function openLine(obj, dev, file) {
    if (!isObj(obj) || obj.v !== 2 || obj.dev !== dev || !Number.isInteger(obj.n) || obj.n < 1 || !isObj(obj.enc) || !KID_RE.test(obj.enc.k || '')) return { bad: 'format' };
    const a = accepts(dev, obj.n, obj.enc.k);
    if (a === 'wait') return { wait: true };
    if (a !== 'ok') { stats.refused++; return { refused: a }; }
    const inner = await X.openJson(await aes(obj.enc.k), obj.enc, aad('log', dev, file, obj.n, obj.enc.k));
    if (!isObj(inner)) { stats.bad++; return { bad: 'auth' }; }
    return { line: { v: 1, dev, n: obj.n, h: inner.h, s: inner.s, w: inner.w, x: inner.x } };
  }
  async function sealSnapshot(snap) {
    const kid = currentKid();
    const { v, dev, seq, enc: _e, ...rest } = snap;
    const enc = await X.sealJson(await aes(kid), rest, aad('snapshot', me(), 'snapshot.json', seq, kid));
    return { v: 2, dev: me(), seq, enc: { k: kid, ...enc } };
  }
  async function openSnapshot(obj, dev) {
    if (!isObj(obj) || obj.v !== 2 || obj.dev !== dev || !Number.isInteger(obj.seq) || obj.seq < 0 || !isObj(obj.enc) || !KID_RE.test(obj.enc.k || '')) return { bad: 'format' };
    const a = accepts(dev, obj.seq, obj.enc.k);
    if (a === 'wait') return { wait: true };
    if (a !== 'ok') { stats.refused++; return { refused: a }; }
    const inner = await X.openJson(await aes(obj.enc.k), obj.enc, aad('snapshot', dev, 'snapshot.json', obj.seq, obj.enc.k));
    if (!isObj(inner)) { stats.bad++; return { bad: 'auth' }; }
    return { snap: { ...inner, v: 1, dev, seq: obj.seq, enc: null } };
  }
  /** device.json: what the folder may see in the clear, and the name and progress encrypted. */
  async function sealDevice(info, secret) {
    const base = { v: 2, format: 2, pub: S.identity.pub, ...info };
    if (!isReady()) return { ...base, enc: null };
    const kid = currentKid();
    const enc = await X.sealJson(await aes(kid), secret, aad('device', me(), 'device.json', 0, kid));
    return { ...base, enc: { k: kid, ...enc } };
  }
  async function openDevice(obj, dev) {
    if (!isObj(obj) || obj.v !== 2 || obj.deviceId !== dev || !isObj(obj.enc) || !KID_RE.test(obj.enc.k || '') || !own(S.keys, obj.enc.k)) return null;
    const inner = await X.openJson(await aes(obj.enc.k), obj.enc, aad('device', dev, 'device.json', 0, obj.enc.k));
    return isObj(inner) ? inner : null;
  }

  function status() {
    const kid = currentKid();
    return {
      group: S.group, deviceId: me(), ready: isReady(), reason: reason(),
      epoch: kid ? S.keys[kid].n : null, kid,
      members: Object.keys(S.members).filter(id => !own(S.removed, id)),
      removed: Object.keys(S.removed),
      joined: S.joined,
      pairing: pairingStatus(),
      requests: requests.map(r => ({ ...r })),
      offer: sess.offer && now() < sess.offer.exp ? { text: sess.offer.text, expiresAt: sess.offer.exp } : null,
      found: { groups: Object.keys(found.groups).length, devices: Object.values(found.groups).reduce((a, b) => a + b, 0) },
      stats: { ...stats },
    };
  }

  return {
    load, identity, reset, refresh, status,
    createGroup, joinWithRecovery, joinWithOffer, makeOffer,
    pairStart, pairRespond, pairConfirm, pairCancel,
    removeDevice, newRecoveryCode, rename, rotate,
    sealLine, openLine, sealSnapshot, openSnapshot, sealDevice, openDevice, accepts,
    member: (id) => (own(S.members, id) && !own(S.removed, id) ? { ...S.members[id] } : null),
    removedInfo: (id) => (own(S.removed, id) ? { ...S.removed[id] } : null),
    nameOf: (id) => (S.names[id] ? S.names[id].name : null),
    nameEntry: (id) => (S.names[id] ? { ...S.names[id] } : null),
    get ready() { return isReady(); },
    get reason() { return reason(); },
    get deviceId() { return me(); },
    get group() { return S.group; },
    get currentKid() { return currentKid(); },
    get loaded() { return loaded; },
    _debug: () => ({ S, sess, docs }),
  };
}
