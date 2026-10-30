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
// RECOVERY CODE (2.20.1: the "emergency backup sheet", 10 words; the old
// 32-character codes still work): shown only when the person makes a sheet.
// It stands for an X25519 key pair; members keep only its PUBLIC half
// (never written to the folder) and wrap every new key to it, so the code
// opens the newest key on a new device; nothing on any device can recreate it.
// A removal renews it unseen (key info `sheet: 'old'` -> "print a new one").

import * as X from './e2e-crypto.mjs';

export const E2E_STATE_KEY = 'sync-e2e';
// The pairing in progress (both sides), kept in the secret store so a restart
// in the middle of a pairing carries on with the same session: the other side
// never waits on a session that died with the process. Nonces stay secret.
export const E2E_PAIR_KEY = 'sync-e2e-pairing';
const GONE_GRACE_MS = 15 * 1000;   // the other side's pairing message missing this long: that session ended there
// The 4-letter join code ("Add a computer"): its own window, separate from the
// 6-digit pairing's 1-minute idle timeout. Single use; 3 wrong answers burn it.
export const CODE_MS = 10 * 60 * 1000;
const CODE_TRIES = 3;
const CODE_SETTLE_MS = 3000;       // a valid answer is taken only if no second device answered within this
const CODE_MAX_TRIES_JOIN = 3;     // sessions a new device answers at most (a fake session costs it one)
const CODE_FINAL = new Set(['done', 'expired', 'cancelled', 'declined', 'burned', 'clash', 'wrong', 'taken', 'failed']);
const ID_RE = /^[0-9a-f]{16}$/;
const KID_RE = /^[0-9a-f]{16}$/;
const SID_RE = /^[0-9a-f]{16}$/;
const OFFER_RE = /^[0-9a-f]{8}$/;
export const PAIR_MS = 60 * 1000;            // a session ends after 1 minute without progress (owner, 23 Oct 2026); each step extends it
const PAIR_ACCEPT_MS = 20 * 60 * 1000;       // requests from older versions carry a 15-minute expiry: still accepted
export const OFFER_MS = 10 * 60 * 1000;
const ENDED_MS = 2 * 60 * 1000;
const FINAL = new Set(['done', 'expired', 'declined', 'cancelled', 'failed']);
const KINDS = ['computer', 'phone', 'tablet'];
export const cleanName = (s) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const okIso = (s) => typeof s === 'string' && s.length <= 40 && !Number.isNaN(Date.parse(s));

function freshState() {
  return { v: 1, identity: null, group: null, keys: {}, members: {}, removed: {}, names: {}, joined: null, sign: null };
}
function cleanKeyInfo(k) {
  if (!isObj(k)) return null;
  const raw = X.unb64u(k.k);
  if (!raw || raw.length !== 32 || !Number.isInteger(k.n) || k.n < 1 || k.n > 1e9 || !ID_RE.test(k.by || '')) return null;
  const excl = Array.isArray(k.excl) ? [...new Set(k.excl.filter(x => ID_RE.test(x)))].sort().slice(0, 5000) : [];
  let cut = null;
  if (isObj(k.cut)) { cut = {}; for (const [d, n] of Object.entries(k.cut)) if (ID_RE.test(d) && Number.isInteger(n) && n >= 0) cut[d] = n; }
  // sheet (2.20.1): 'made' when a backup sheet was shown for this key's rec, 'old' when the person had
  // one but this rec is new (a removal renewed it). Older versions drop it: then nothing is said.
  return { k: k.k, n: k.n, by: k.by, at: okIso(k.at) ? k.at : null, excl, cut, rec: X.isPub(k.rec) ? k.rec : null, ...(k.sheet === 'made' || k.sheet === 'old' ? { sheet: k.sheet } : {}) };
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
  // 2.19.8: from which record number this identity signs everything it writes (see sealLine).
  if (isObj(v.sign) && ID_RE.test(v.sign.dev || '') && Number.isInteger(v.sign.from) && v.sign.from >= 1) s.sign = { dev: v.sign.dev, from: v.sign.from };
  return s;
}
// spk / sf (2.19.8): the member's signing key (e2e-crypto deviceSigner) and the record number from
// which it signs everything it writes. Older versions drop both fields (and so never ask for them).
function cleanMember(m) {
  const c = { pub: m.pub, kind: KINDS.includes(m.kind) ? m.kind : 'computer', since: okIso(m.since) ? m.since : null, via: typeof m.via === 'string' ? m.via.slice(0, 60) : null };
  if (X.isPub(m.spk)) { c.spk = m.spk; if (Number.isInteger(m.sf) && m.sf >= 1 && m.sf <= 1e12) c.sf = m.sf; }
  return c;
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

// ─── Keyring extras ── (docs/dev/FRIENDS.md section 2) ────────────────
// Other secrets of the PERSON ride in the encrypted keyring payload (field
// `x`): the friends identity (lib/friends/store.mjs registers 'friends').
//   registerKeyringExtra(name, {value, take, purposes})
//     value(purpose)     the current value for that payload (sync or a promise), or null
//     take(value, by, {purpose, join})
//                        merge what arrived (idempotent). A 'recovery' payload is not
//                        authenticated by any member (a removed device still knows the
//                        recovery key's public half); join: a device of the person is
//                        adding this one (takeExtras).
//     purposes           the payloads it rides in. Default: EVERY payload that
//                        carries the full sync keyring (EXTRA_PURPOSES): the join
//                        code ('joincode'), the 6-digit pairing ('pair'), the QR
//                        offer ('offer'), the recovery code ('recovery') and the
//                        members' rewraps in keys.json ('member'). Whatever opens
//                        the sync keys opens these too (docs/dev/FRIENDS.md rule 1:
//                        a paired device, a join code, a QR offer or the recovery
//                        code bring the friends identity). A narrower list is
//                        possible for a future extra.
//   keyringExtrasChanged()   every engine writes its keys.json again
// Values are never logged.
export const EXTRA_PURPOSES = Object.freeze(['joincode', 'pair', 'offer', 'recovery', 'member']);
const keyringExtras = new Map();
const extrasListeners = new Set();
export function registerKeyringExtra(name, def) {
  if (!/^[a-z][a-z0-9-]{0,30}$/.test(name || '') || !def || typeof def.value !== 'function' || typeof def.take !== 'function') throw new Error('registerKeyringExtra needs a name, value() and take()');
  const entry = { value: def.value, take: def.take, purposes: new Set((Array.isArray(def.purposes) ? def.purposes : EXTRA_PURPOSES).filter(p => EXTRA_PURPOSES.includes(p))) };
  keyringExtras.set(name, entry);
  keyringExtrasChanged();
  return () => { if (keyringExtras.get(name) === entry) keyringExtras.delete(name); };
}
export function keyringExtrasChanged() { for (const f of extrasListeners) { try { f(); } catch { /* fine */ } } }
/**
 * The registered extras that ride in `purpose` ({name: value}), as a payload of that purpose
 * carries them (2.17.1: a live link offers 'member' ones to a computer of the person that lacks
 * them, lib/sync/live/live.mjs 'kx'). Values are never logged.
 */
export async function keyringExtrasFor(purpose) {
  const x = {};
  if (!EXTRA_PURPOSES.includes(purpose)) return x;
  for (const [name, def] of keyringExtras) {
    if (!def.purposes.has(purpose)) continue;
    try { const v = await def.value(purpose); if (v != null) x[name] = v; } catch { /* left out */ }
  }
  return x;
}

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
  let sess = { join: null, approve: null, offer: null, code: null, claim: null };
  let dirty = true;                           // our keys.json must be written again
  let pairDirty = false;
  let lastKeys = null, lastPair = null;      // what we last wrote (to notice someone else changing it)
  let stats = { refused: 0, bad: 0, notMember: 0 };
  let removedNotice = null;                  // {by, at}: a member told this (not yet joined) identity it was removed
  let lastSavedPairing = null;               // what was last saved of the pairing (only changes are written)
  extrasListeners.add(() => { dirty = true; });   // a keyring extra changed: our keys.json carries it (if allowed there)

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
    aesCache.clear(); locCache.clear(); fileCache.clear(); done.clear(); rosterDone.clear();
    sess = { join: null, approve: null, offer: null, code: null, claim: null };
    await restorePairing();
    loaded = true; dirty = true;
    return S;
  }

  // ─── The pairing across a restart ────────────────────────────────────
  const SESSION_FIELDS = {
    join: ['sid', 'nonce', 'name', 'kind', 'at', 'exp', 'step', 'commit', 'peer', 'code', 'endedAt', 'why', 'goneSince'],
    approve: ['sid', 'to', 'toPub', 'commit', 'name', 'kind', 'nonce', 'at', 'joinAt', 'exp', 'step', 'wrap', 'code', 'why', 'rejoin', 'before', 'endedAt', 'goneSince', 'sentAt'],
    code: ['sid', 'code', 'priv', 'Y', 'at', 'exp', 'step', 'wrong', 'checked', 'no', 'validSince', 'validDev', 'to', 'toPub', 'wrap', 'tag', 'name', 'kind', 'member', 'rejoin', 'before', 'sentAt', 'endedAt', 'pic'],
    claim: ['code', 'name', 'kind', 'at', 'exp', 'step', 'tries', 'endedAt'],
  };
  const pick = (o, fields) => { const out = {}; for (const f of fields) if (o && o[f] !== undefined) out[f] = o[f]; return out; };
  const SESSIONS = ['join', 'approve', 'code', 'claim'];
  const finalStep = (w, step) => (w === 'code' || w === 'claim' ? CODE_FINAL : FINAL).has(step);
  /** The sessions to keep: only unfinished ones of THIS identity (a new identity starts clean). */
  function pairingRecord() {
    const out = { v: 1, dev: me() };
    for (const w of SESSIONS) if (sess[w] && !finalStep(w, sess[w].step)) out[w] = pick(sess[w], SESSION_FIELDS[w]);
    return out;
  }
  async function savePairing() {
    const rec = pairingRecord();
    const text = JSON.stringify(rec);
    if (text === lastSavedPairing) return;
    lastSavedPairing = text;
    try { await secrets.set(E2E_PAIR_KEY, SESSIONS.some(w => rec[w]) ? rec : null); } catch (e) { log('warn', 'sync: the pairing could not be kept for a restart'); }
  }
  async function restorePairing() {
    let r = null;
    try { r = await secrets.get(E2E_PAIR_KEY); } catch { r = null; }
    lastSavedPairing = null;
    if (!isObj(r) || r.v !== 1 || !S.identity || r.dev !== S.identity.deviceId) return;
    const t = now();
    const J = r.join;
    if (isObj(J) && SID_RE.test(J.sid || '') && typeof J.nonce === 'string' && typeof J.commit === 'string' && Number.isFinite(J.exp) && J.exp > t && ['waiting', 'compare', 'confirmed'].includes(J.step)) {
      sess.join = { ...pick(J, SESSION_FIELDS.join), name: cleanName(J.name) || 'New computer', kind: KINDS.includes(J.kind) ? J.kind : kind };
      if (sess.join.peer && !(isObj(sess.join.peer) && ID_RE.test(sess.join.peer.dev || '') && X.isPub(sess.join.peer.pub))) { delete sess.join.peer; delete sess.join.code; sess.join.step = 'waiting'; }
      pairDirty = true;
    }
    const A = r.approve;
    if (isObj(A) && SID_RE.test(A.sid || '') && ID_RE.test(A.to || '') && X.isPub(A.toPub) && typeof A.nonce === 'string' && Number.isFinite(A.exp) && (A.step === 'sent' ? sentUntil(A) > t : A.exp > t) && ['waiting', 'compare', 'sent'].includes(A.step)) {
      sess.approve = { ...pick(A, SESSION_FIELDS.approve), name: cleanName(A.name) || 'A new computer', kind: KINDS.includes(A.kind) ? A.kind : 'computer' };
      pairDirty = true;
    }
    const C = r.code;
    if (isObj(C) && SID_RE.test(C.sid || '') && X.parseJoinCode(C.code).ok && typeof C.priv === 'string' && X.isPub(C.Y) && Number.isFinite(C.exp) && C.exp > t && ['waiting', 'approve', 'sent'].includes(C.step)) {
      sess.code = { ...pick(C, SESSION_FIELDS.code), wrong: Number.isInteger(C.wrong) ? C.wrong : 0, checked: isObj(C.checked) ? C.checked : {}, no: isObj(C.no) ? C.no : {} };
      pairDirty = true;
    }
    const K = r.claim;
    if (isObj(K) && X.parseJoinCode(K.code).ok && Number.isFinite(K.exp) && K.exp > t && ['looking', 'sent'].includes(K.step)) {
      const tries = (Array.isArray(K.tries) ? K.tries : []).filter(x => isObj(x) && SID_RE.test(x.sid || '') && ID_RE.test(x.to || '') && X.isPub(x.toPub) && typeof x.priv === 'string' && X.isPub(x.Y)).slice(0, CODE_MAX_TRIES_JOIN);
      sess.claim = { ...pick(K, SESSION_FIELDS.claim), name: cleanName(K.name) || 'New computer', kind: KINDS.includes(K.kind) ? K.kind : kind, tries };
      pairDirty = true;
    }
    if (SESSIONS.some(w => sess[w])) log('info', 'sync: carrying on with the pairing that was in progress');
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
    sess = { join: null, approve: null, offer: null, code: null, claim: null };
    aesCache.clear(); locCache.clear(); fileCache.clear(); done.clear(); rosterDone.clear(); docs = {}; requests = [];
    lastKeys = null; lastPair = null; dirty = true; removedNotice = null;
    await save();
    lastSavedPairing = null;
    try { await secrets.set(E2E_PAIR_KEY, null); } catch { /* nothing kept */ }
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
  /**
   * from: the member that wrote (and authenticated) this list, when known. What a member says
   * about ITSELF (its signing key spk and since when it signs, sf) replaces what others said;
   * what others say fills in only what is not known yet. Never this device's own entry.
   */
  async function mergeMembers(members, from = null) {
    let changed = false;
    for (const [id, m] of Object.entries(isObj(members) ? members : {})) {
      if (!ID_RE.test(id) || !isObj(m) || !X.isPub(m.pub)) continue;
      if (own(S.members, id)) {
        const cur = S.members[id], c = cleanMember(m);
        if (id === me() || cur.pub !== m.pub || !c.spk) continue;
        if (id === from ? (cur.spk !== c.spk || (c.sf && cur.sf !== c.sf)) : (!cur.spk || (cur.spk === c.spk && !cur.sf && c.sf))) {
          cur.spk = c.spk;
          if (c.sf) cur.sf = c.sf; else if (id === from) delete cur.sf;
          changed = true;
        }
        continue;
      }
      if ((await X.deviceIdOf(m.pub)) !== id) continue;          // the id must be the key's fingerprint
      S.members[id] = cleanMember(m);
      changed = true;
    }
    return changed;
  }
  /** join: this device is being added by one of the person's devices (see takeExtras). from: see mergeMembers. */
  async function mergeKeyring(p, { join = false, from = null } = {}) {
    let changed = false;
    for (const [kid, k] of Object.entries(isObj(p.keys) ? p.keys : {})) {
      if (!KID_RE.test(kid) || own(S.keys, kid)) continue;
      const c = cleanKeyInfo(k);
      if (c) { S.keys[kid] = c; changed = true; }
    }
    if (await mergeMembers(p.members, from)) changed = true;
    for (const [id, r] of Object.entries(isObj(p.removed) ? p.removed : {})) if (mergeRemoved(id, r)) changed = true;
    for (const [id, n] of Object.entries(isObj(p.names) ? p.names : {})) if (mergeName(id, n)) changed = true;
    await takeExtras(p, { join });
    return changed;
  }
  const keyringPayload = (forId, purpose) => ({
    t: 'keyring', v: 2, group: S.group, purpose, for: forId, by: me(), at: iso(),
    keys: S.keys, members: S.members, removed: S.removed, names: S.names,
  });
  // ─── This device's signing key (2.19.8, e2e-crypto deviceSigner) ─────
  let signerP = null, signerOf = null;
  function signer() {
    if (!S.identity) return null;
    if (signerOf !== S.identity.deviceId) { signerOf = S.identity.deviceId; signerP = X.deviceSigner(S.identity.priv, S.identity.deviceId); signerP.catch(() => { signerOf = null; }); }
    return signerP;
  }
  /** Our own member entry carries our signing key and since when we sign: what we tell the others. */
  async function stampSelf() {
    if (!S.identity || !S.group || !own(S.members, me())) return false;
    const m = S.members[me()];
    const sg = await signer().catch(() => null);
    const sf = S.sign && S.sign.dev === me() ? S.sign.from : null;
    if (!sg || (m.spk === sg.pub && (m.sf || null) === sf)) return false;
    m.spk = sg.pub;
    if (sf) m.sf = sf; else delete m.sf;
    return true;
  }
  /** The first record this identity signs: from then on, every record it writes is signed. */
  async function startSigning(from) {
    if (S.sign && S.sign.dev === me()) return;
    S.sign = { dev: me(), from: Math.max(1, from) };
    await stampSelf();
    dirty = true;
    await save();
  }
  /** {sig} for a sealed record, or {} when this device cannot sign (never blocks writing). */
  async function signRecord(aadBytes, enc) {
    try { const sg = await signer(); return sg ? { sig: await X.edSign(sg.priv, X.recordSigBytes(aadBytes, enc)) } : {}; }
    catch { return {}; }
  }
  /**
   * null when a record of `dev` may be opened, else {refused} / {bad}. A member that announced its
   * signing key: a signature present must be its own; from its sf on (and on every snapshot) one must
   * be present. A member that did not (an older version): as before.
   */
  async function checkSig(dev, seq, obj, aadBytes, snapshot) {
    const m = own(S.members, dev) ? S.members[dev] : null;
    if (!m || !m.spk) return null;
    if (obj.sig != null) {
      if (await X.edVerify(m.spk, X.recordSigBytes(aadBytes, obj.enc), obj.sig)) return null;
      stats.bad++;
      return { bad: 'signature' };
    }
    if (Number.isInteger(m.sf) && (snapshot || seq >= m.sf)) { stats.refused++; return { refused: 'unsigned' }; }
    return null;
  }
  /** The payload with the registered extras that ride in this purpose (field `x`, see registerKeyringExtra). */
  async function fullPayload(forId, purpose) {
    if (await stampSelf()) await save();
    const p = keyringPayload(forId, purpose);
    const x = {};
    for (const [name, def] of keyringExtras) {
      if (!def.purposes.has(purpose)) continue;
      try { const v = await def.value(purpose); if (v != null) x[name] = v; }
      catch { log('warn', `sync: ${name} could not be added to the pairing`); }
    }
    if (Object.keys(x).length) p.x = x;
    return p;
  }
  /**
   * A received payload's extras, handed to their owners (only those allowed in its purpose):
   * take(value, by, {purpose, join}). purpose 'recovery' is NOT authenticated by any member
   * (anyone who ever knew the recovery key's public half can wrap one); join: one of the
   * person's devices is adding this one, so its view replaces what came only by recovery.
   */
  async function takeExtras(p, { join = false } = {}) {
    if (!isObj(p) || !isObj(p.x)) return;
    for (const [name, def] of keyringExtras) {
      if (!own(p.x, name) || !def.purposes.has(p.purpose)) continue;
      try { await def.take(p.x[name], ID_RE.test(p.by || '') ? p.by : null, { purpose: p.purpose, join: !!join }); }
      catch { log('warn', `sync: ${name} from the pairing could not be kept (the next one brings it again)`); }
    }
  }
  /**
   * 2.17.1: extras another MEMBER sent over an authenticated live link (lib/sync/live/live.mjs 'kx'):
   * taken exactly as from that member's keys.json rewrap (purpose 'member'). True when taken.
   */
  async function takeLiveExtras(x, by) {
    if (!isReady() || !isObj(x) || !ID_RE.test(by || '') || by === me() || !own(S.members, by) || own(S.removed, by)) return false;
    await takeExtras({ purpose: 'member', by, x });
    return true;
  }
  const payloadOk = (p, { group, purpose, forId, by }) => isObj(p) && p.t === 'keyring' && p.v === 2 && p.group === group && (!purpose || p.purpose === purpose) && (!forId || p.for === forId) && (!by || p.by === by) && isObj(p.keys);

  // ─── Our keys.json ───────────────────────────────────────────────────
  async function buildKeysFile() {
    if (await stampSelf()) await save();
    const kid = currentKid();
    const k = S.keys[kid];
    const to = {};
    for (const [id, m] of Object.entries(S.members).sort()) {
      if (id === me() || own(S.removed, id)) continue;
      to[id] = await X.wrapBetween({ myPriv: S.identity.priv, fromPub: S.identity.pub, toPub: m.pub, label: wrapLabel(S.group, kid, me(), id), value: await fullPayload(id, 'member') });
    }
    const rec = k.rec ? await X.wrapTo({ toPub: k.rec, label: recLabel(S.group, kid, me()), value: await fullPayload('recovery', 'recovery') }) : null;
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
    // The join code: the session id and this side's CPace share; never the code or anything that tests it.
    const C = sess.code;
    if (C) {
      // p: 1 (2.20.1): this computer shows the matching picture, so the new one shows it too (older versions ignore it).
      if (C.step === 'waiting' || C.step === 'approve') out.code = { sid: C.sid, Y: C.Y, at: C.at, exp: C.exp, p: 1, ...(C.no && Object.keys(C.no).length ? { no: C.no } : {}) };
      else if (C.step === 'sent') out.code = { sid: C.sid, at: C.at, exp: C.exp, done: { to: C.to, wrap: C.wrap, tag: C.tag } };
      else if (['burned', 'clash', 'cancelled', 'declined', 'expired'].includes(C.step)) out.code = { sid: C.sid, at: C.at, exp: C.exp, abort: C.step, ...(C.no && Object.keys(C.no).length ? { no: C.no } : {}) };
    }
    const K = sess.claim;
    if (K && ['looking', 'sent'].includes(K.step) && K.tries.length) {
      out.claims = K.tries.map(t => ({ sid: t.sid, to: t.to, Y: t.Y, name: K.name, kind: K.kind, tag: t.tag, at: t.at, p: 1 }));
    }
    return out.join || out.approve || out.offer || out.code || out.claims ? out : null;
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
    // Not in a group (yet): was this identity removed earlier (say halfway
    // through an earlier pairing)? Then asking again with it would go nowhere:
    // a pairing in progress starts again at once with a fresh identity.
    if (!S.group && S.identity) {
      removedNotice = await removedFromFolder();
      const J0 = sess.join && ['waiting', 'compare', 'confirmed'].includes(sess.join.step) ? sess.join : null;
      const K0 = sess.claim && ['looking', 'sent'].includes(sess.claim.step) ? sess.claim : null;
      if (removedNotice && (J0 || K0)) {
        log('warn', 'sync: this computer had been removed from your sync; asking again as a new device');
        await ad.removeOwnFile('pair.json').catch(() => {});
        await reset();
        if (K0) await codeJoin(K0.code, { name: K0.name, kind: K0.kind });
        else await pairStart({ name: J0.name, kind: J0.kind });
        await savePairing();
        return status();     // the engine moves to the new identity (and its own folder) on this pass
      }
    }
    await movePairing();
    await moveCode();
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
    await savePairing();
    return status();
  }

  /**
   * A member's "you were removed" notice for this identity, read while it is
   * not in a group: {by, at} or null. The notice is wrapped from the member's
   * identity key to this one's, so only a device holding that key wrote it;
   * the worst a fake one could do is make this device start with a new key pair.
   */
  async function removedFromFolder() {
    for (const [id, d] of Object.entries(docs)) {
      const J = d.keys;
      if (!J || !isObj(J.gone) || !J.gone[me()] || !ID_RE.test(J.group || '')) continue;
      const g = await X.unwrapBetween({ myPriv: S.identity.priv, fromPub: J.pub, toPub: S.identity.pub, label: goneLabel(J.group, id, me()), enc: J.gone[me()] }).catch(() => null);
      if (isObj(g) && g.t === 'removed' && g.v === 2 && g.group === J.group && g.id === me()) return { by: id, at: okIso(g.at) ? g.at : null };
    }
    return null;
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
        if (await mergeKeyring(p, { from: id })) more = true;
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
  /**
   * The first device: a new group and its first key. Its backup secret is never shown (2.20.1: the
   * person makes a backup sheet only if they want one, newRecoveryCode); it is returned for old callers.
   */
  async function createGroup({ group } = {}) {
    await identity();
    if (S.group) throw err('ALREADY_IN_GROUP', 'This computer already syncs.');
    const r = await X.newBackupWords();
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
    // Already a member, and the computer that approved it knows it as one (it typed a code
    // only to receive the extras, say the key for your relay; codeApprove sets `member`):
    // the keyring is merged, the membership stays as it is.
    const refresh = !!(S.group && isReady() && own(S.members, me()) && p.member === true);
    // Added by one of your computers (code, 6 digits, QR offer) that did NOT know this one:
    // what it held for the group did not come from your other computers (an old copy, or one
    // a removed device wrapped to the recovery key). It is dropped, not merged, so none of it
    // (its keys, its members) is ever used or wrapped to; the approver's keyring replaces it.
    const approved = how !== 'recovery';
    if (S.group && approved && !refresh) {
      const gone = own(S.removed, me()) ? S.removed[me()] : null;
      S.keys = {}; S.members = {}; S.removed = gone ? { [me()]: gone } : {}; S.names = {};
      aesCache.clear(); locCache.clear(); rosterDone.clear();
    }
    S.group = p.group;
    await mergeKeyring(p, { join: approved && !refresh, from: approved && ID_RE.test(by || '') && p.by === by ? by : null });
    if (!refresh) {
      if (own(S.removed, me())) {
        // This identity was removed earlier: come back as a new device.
        const keep = { keys: S.keys, members: S.members, removed: S.removed, names: S.names, group: S.group };
        const kp = await X.newKeyPair();
        S.identity = { ...kp, deviceId: await X.deviceIdOf(kp.pub), createdAt: iso() };
        Object.assign(S, keep);
      }
      S.members[me()] = { pub: S.identity.pub, kind, since: iso(), via: how };
      S.joined = { how: how.split(':')[0], by: by || null, at: iso() };
    }
    dirty = true;
    done.clear();
    await save();
  }

  /** Join with the recovery code: the newest keyring any member wrapped to the recovery key. */
  async function joinWithRecovery(code, ad, listing) {
    await identity();
    // A member takes keys only from your other computers: a recovery copy is signed by none of
    // them, and merged here it would reach every member through this computer's keys.json.
    if (S.group && isReady() && own(S.members, me())) throw err('ALREADY_IN_GROUP', 'This computer already syncs, so the backup sheet is not needed here.');
    const parsed = await X.parseBackup(code);
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
      throw err('WRONG_CODE', 'Those words do not open your synced data in this folder. Check them against your newest backup sheet and try again.');
    }
    // An old code may still open an old copy (a removed device's folder keeps
    // one): it must open the newest key the members announce.
    const p = best.p;
    let newest = 0;
    for (const [id, d] of Object.entries(docs)) {
      const J = d.keys;
      if (J && J.group === p.group && Number.isInteger(J.n) && isObj(p.members) && own(p.members, id) && !(isObj(p.removed) && own(p.removed, id))) newest = Math.max(newest, J.n);
    }
    if (best.n < newest) throw err('OLD_CODE', 'That backup sheet was replaced by a newer one. Use the newest sheet you printed or saved.');
    // The copy must read every keys.json of the group in the folder: only a holder of a key can
    // write a roster with it. A copy a removed device made (it still knows the recovery key's
    // public half and can wrap anything to it) cannot read your other computers' rosters, so
    // it is refused whatever key number or member list it claims.
    for (const [id, d] of Object.entries(docs)) {
      const J = d.keys;
      // (2.19.8: one without a roster counts too: the folder could have taken the roster out.)
      if (!J || J.group !== p.group) continue;
      const k = isObj(J.roster) && KID_RE.test(J.roster.k || '') && own(p.keys, J.roster.k) ? cleanKeyInfo(p.keys[J.roster.k]) : null;
      const r = k ? await X.openJson(await X.aesKey(X.unb64u(k.k)), J.roster, X.recordAad({ kind: 'roster', group: p.group, dev: id, file: 'keys.json', seq: 0, kid: J.roster.k })).catch(() => null) : null;
      if (!isObj(r)) throw err('UNSURE_COPY', 'That backup sheet opened an older copy that does not match your other computers, so it was not used. If one of them still works, join this computer to it instead: there, open Settings > Sync and press Add a computer. Or wait a minute and try again.');
    }
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
  async function rotate({ remove = [], newRecovery = false, frontier = {}, seq = 0, sheet = null } = {}) {
    const n = Math.max(0, ...Object.values(S.keys).map(k => k.n)) + 1;
    for (const id of remove) if (!own(S.removed, id)) S.removed[id] = { at: iso(), by: me(), n, cut: Number.isInteger(frontier[id]) ? frontier[id] : 0 };
    const cur = S.keys[currentKid()] || latestKey();
    let rec = cur ? cur.rec : null, code = null;
    // The backup sheet's state rides with the key: kept with the same rec; a new rec is 'made' when
    // the person is shown it now, 'old' when they had a sheet that this one replaces unseen.
    let sh = cur && cur.sheet ? cur.sheet : null;
    if (newRecovery) {
      const r = await X.newBackupWords();
      rec = (await X.recoveryKeyPair(r.entropy)).pub;
      code = r.code;
      sh = sheet === 'made' ? 'made' : sh ? 'old' : null;
    }
    const kid = X.randomId(8);
    const cut = remove.length ? { ...Object.fromEntries(Object.entries(frontier).filter(([d, v]) => ID_RE.test(d) && Number.isInteger(v))), [me()]: seq } : null;
    S.keys[kid] = { k: X.b64u(X.newSecretKey()), n, by: me(), at: iso(), excl: Object.keys(S.removed).sort(), cut, rec, ...(sh ? { sheet: sh } : {}) };
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
    // 2.19.8: always a new recovery code too. The removed device knows the old recovery key's
    // public half (it is in every key entry) and could wrap a keyring of its own making to it,
    // for a computer that later joins with the old code (security review: recovery hijack).
    // 2.20.1: the new one is NOT shown (nobody is asked to write anything down while removing a
    // device); a person who had a backup sheet sees "out of date: print a new one" in Settings.
    const r = await rotate({ remove: [id], frontier, seq, newRecovery: true });
    return { ok: true, n: r.n };
  }
  /** "Make a backup sheet": a new backup secret, shown once (the 10 words); any older sheet stops working. */
  async function newRecoveryCode() {
    if (!isReady()) throw err('NOT_READY', 'This computer cannot change the sync right now.');
    const r = await rotate({ newRecovery: true, sheet: 'made' });
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
    // A removed device asks again as a new one (its old id stays removed for good),
    // also when it only knows from a member's notice in the folder (not in a group).
    if ((S.group && own(S.removed, me())) || (!S.group && removedNotice)) await reset();
    const sid = X.randomId(8);
    const nonce = X.b64u(X.randomBytes(32));
    const nm = cleanName(name) || 'New computer';
    const kd = KINDS.includes(k) ? k : kind;
    sess.join = { sid, nonce, name: nm, kind: kd, at: now(), exp: now() + PAIR_MS, step: 'waiting', commit: await X.pairCommitment({ sid, pub: S.identity.pub, name: nm, kind: kd, nonce }) };
    pairDirty = true;
    await savePairing();
    return pairingStatus();
  }
  // ─── Pairing: the existing device ────────────────────────────────────
  function collectRequests() {
    requests = [];
    if (!S.group || !isReady()) return;
    for (const [id, d] of Object.entries(docs)) {
      const j = d.pair && d.pair.join;
      if (!isObj(j) || !SID_RE.test(j.sid || '') || typeof j.commit !== 'string' || j.abort) continue;
      // A removed device asking again is shown (never dropped in silence): approving it
      // lets it back in under a NEW id (its old one stays removed for good, see adopt()).
      const removed = own(S.removed, id);
      if (own(S.members, id) && !removed) continue;
      if (!Number.isFinite(j.exp) || j.exp < now() || j.exp > now() + PAIR_ACCEPT_MS) continue;
      requests.push({
        sid: j.sid, deviceId: id, name: cleanName(j.name) || 'A new computer', kind: KINDS.includes(j.kind) ? j.kind : 'computer', at: Number.isFinite(j.at) ? j.at : null,
        ...(removed ? { removed: true, removedAt: S.removed[id].at || null, oldName: (S.names[id] && S.names[id].name) || null } : {}),
      });
    }
    requests.sort((a, b) => (b.at || 0) - (a.at || 0));
  }
  async function pairRespond(sid) {
    if (!isReady()) throw err('NOT_READY', 'This computer cannot add another one right now.');
    const r = requests.find(x => x.sid === sid);
    const j = r && docs[r.deviceId] && docs[r.deviceId].pair && docs[r.deviceId].pair.join;
    if (!r || !j) throw err('NO_REQUEST', 'That request has gone. Start again on the new computer.');
    sess.approve = { sid, to: r.deviceId, toPub: docs[r.deviceId].pair.pub, commit: j.commit, name: r.name, kind: r.kind, nonce: X.b64u(X.randomBytes(32)), at: now(), joinAt: Number.isFinite(j.at) ? j.at : 0, exp: now() + PAIR_MS, step: 'waiting', ...(r.removed ? { rejoin: true } : {}) };
    pairDirty = true;
    await savePairing();
    return pairingStatus();
  }

  async function pairConfirm(sid, match) {
    const J = sess.join, A = sess.approve;
    if (J && J.sid === sid) {
      if (J.step !== 'compare') throw err('NOT_YET', 'There is nothing to confirm yet.');
      J.step = match ? 'confirmed' : 'cancelled';
      pairDirty = true;
      await savePairing();
      return pairingStatus();
    }
    if (A && A.sid === sid) {
      if (A.step !== 'compare') throw err('NOT_YET', 'There is nothing to confirm yet.');
      if (!match) { A.step = 'cancelled'; pairDirty = true; await savePairing(); return pairingStatus(); }
      if (!isReady()) throw err('NOT_READY', 'This computer cannot add another one right now.');
      // A removed device coming back: its old id stays removed (removals are permanent);
      // the keyring tells it so, and it joins under a new identity (adopt()), which it
      // then announces in its roster. Remember who was already a member to see it arrive.
      A.rejoin = A.rejoin || own(S.removed, A.to);
      A.before = Object.keys(S.members);
      if (!A.rejoin) {
        S.members[A.to] = { pub: A.toPub, kind: A.kind, since: iso(), via: `pair:${me()}` };
        S.names[A.to] = S.names[A.to] || { name: A.name, at: iso(), by: me() };
      }
      A.wrap = await X.wrapBetween({ myPriv: S.identity.priv, fromPub: S.identity.pub, toPub: A.toPub, label: pairLabel(S.group, A.sid, me(), A.to), value: await fullPayload(A.to, 'pair') });
      A.step = 'sent'; A.sentAt = now();
      dirty = true; pairDirty = true;
      await save();
      await savePairing();
      log('info', A.rejoin ? 'sync: approved a removed device to come back as a new one' : 'sync: approved a new device');
      return pairingStatus();
    }
    throw err('NO_PAIRING', 'That pairing has ended. Start again.');
  }
  async function pairCancel() {
    // Cancel what is going on (the other side sees the abort in pair.json and stops too);
    // a session that has already ended is closed at once ("Close"), not after ENDED_MS.
    if (sess.join && ['waiting', 'compare', 'confirmed'].includes(sess.join.step)) sess.join.step = 'cancelled';
    else if (sess.join && FINAL.has(sess.join.step)) sess.join = null;
    if (sess.approve && ['waiting', 'compare', 'sent'].includes(sess.approve.step)) sess.approve.step = 'cancelled';
    else if (sess.approve && FINAL.has(sess.approve.step)) sess.approve = null;
    pairDirty = true;
    await savePairing();
    return pairingStatus();
  }

  async function movePairing() {
    const stepsBefore = [sess.join && sess.join.step, sess.approve && sess.approve.step];
    try { return await movePairingSteps(); } finally {
      // progress (a new step) gives the session another minute
      if (sess.join && sess.join.step !== stepsBefore[0] && !FINAL.has(sess.join.step)) sess.join.exp = Math.max(sess.join.exp, now() + PAIR_MS);
      if (sess.approve && sess.approve.step !== stepsBefore[1] && !FINAL.has(sess.approve.step)) sess.approve.exp = Math.max(sess.approve.exp, now() + PAIR_MS);
    }
  }
  // The keyring stays in pair.json until the new device has taken it (its keys.json
  // appears), however slow the cloud is: the 1-minute idle rule is for waiting on
  // the user, not on the upload. At most CODE_MS after it was sent.
  const sentUntil = (A) => Math.max(A.exp || 0, (A.sentAt || A.at || 0) + CODE_MS);
  async function movePairingSteps() {
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
        // The other computer's answer gone from the folder for a while (it ended the session,
        // or it restarted on an older version): say so now instead of waiting for the timeout.
        if (a && a.sid === J.sid) J.goneSince = null;
        else if (docs[J.peer.dev]) { J.goneSince = J.goneSince || now(); if (now() - J.goneSince > GONE_GRACE_MS) { J.step = 'expired'; J.why = 'other-ended'; pairDirty = true; } }
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
      // The new computer started again (a restart, a new name): follow its newest request
      // from the same device. This side picks a fresh nonce for it, fixed before it sees
      // the new opening, so following gives a man in the middle nothing.
      if (['waiting', 'compare'].includes(A.step) && isObj(j) && SID_RE.test(j.sid || '') && j.sid !== A.sid && !j.abort && typeof j.commit === 'string' && Number.isFinite(j.at) && j.at > (A.joinAt || 0) && Number.isFinite(j.exp) && j.exp > now()) {
        Object.assign(A, { sid: j.sid, commit: j.commit, name: cleanName(j.name) || A.name, kind: KINDS.includes(j.kind) ? j.kind : A.kind, nonce: X.b64u(X.randomBytes(32)), at: now(), joinAt: j.at, exp: now() + PAIR_MS, step: 'waiting', goneSince: null });
        delete A.code;
        pairDirty = true;
        log('info', 'sync: the new computer asked again; following its new request');
      }
      if (['waiting', 'compare'].includes(A.step)) {
        if (j && j.sid === A.sid) A.goneSince = null;
        else if (docs[A.to]) { A.goneSince = A.goneSince || now(); if (now() - A.goneSince > GONE_GRACE_MS) { A.step = 'expired'; A.why = 'other-ended'; pairDirty = true; } }
      }
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
        if (A.rejoin) {
          // Back under a new id: done once it announces itself (its roster names this pairing).
          const back = Object.entries(S.members).find(([id, m]) => id !== A.to && !(A.before || []).includes(id) && m.via === `pair:${me()}`);
          if (back) { if (!S.names[back[0]]) { S.names[back[0]] = { name: A.name, at: iso(), by: me() }; dirty = true; await save(); } A.step = 'done'; pairDirty = true; }
          else if (now() > sentUntil(A)) { A.step = 'done'; pairDirty = true; }
        } else {
          const k = docs[A.to] && docs[A.to].keys;
          if ((k && k.group === S.group) || now() > sentUntil(A)) { A.step = 'done'; pairDirty = true; }
        }
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

  // ─── The 4-letter join code (docs/dev/SYNC_FORMAT.md 11.7) ───────────
  const codeLabel = (sid, from, to) => `opendash-joincode-wrap-v1|${sid}|${from}|${to}`;
  const codeTranscript = ({ sid, eDev, ePub, eY, nDev, nPub, nY, name, kind: k }) => [sid, eDev, ePub, eY, nDev, nPub, nY, name, k];
  /** "Add a computer": a fresh code on this (member) device, valid CODE_MS, single use. */
  async function codeStart() {
    if (!isReady()) throw err('NOT_READY', 'This computer cannot add another one right now.');
    const code = X.newJoinCode();
    const sid = X.randomId(8);
    const share = await X.joinShare(code, sid);
    sess.code = { sid, code, priv: share.priv, Y: share.Y, at: now(), exp: now() + CODE_MS, step: 'waiting', wrong: 0, checked: {}, no: {} };
    pairDirty = true;
    await savePairing();
    log('info', 'sync: showing a join code');
    return codeStatus();
  }
  /** Cancel the code on screen (existing device) or the code being tried (new device). */
  async function codeCancel() {
    if (sess.code && ['waiting', 'approve', 'sent'].includes(sess.code.step)) { sess.code.step = 'cancelled'; pairDirty = true; }
    else if (sess.code && CODE_FINAL.has(sess.code.step)) { sess.code = null; pairDirty = true; }      // "Close" a finished one at once
    if (sess.claim && ['looking', 'sent'].includes(sess.claim.step)) { sess.claim.step = 'cancelled'; pairDirty = true; }
    else if (sess.claim && CODE_FINAL.has(sess.claim.step)) { sess.claim = null; pairDirty = true; }
    await savePairing();
    return codeStatus();
  }
  /**
   * "Approve <name>?" on the computer that shows the code: yes sends the keys
   * (wrapped to the device that proved it knows the code), no stops the code.
   */
  async function codeApprove(yes) {
    const C = sess.code;
    if (!C || C.step !== 'approve') throw err('NOT_YET', 'There is nothing to approve right now.');
    if (!yes) { C.step = 'declined'; pairDirty = true; await savePairing(); log('info', 'sync: a computer that typed the join code was not approved'); return codeStatus(); }
    if (!isReady()) throw err('NOT_READY', 'This computer cannot add another one right now.');
    if (now() > C.exp) { C.step = 'expired'; pairDirty = true; await savePairing(); return codeStatus(); }
    C.rejoin = !C.member && own(S.removed, C.to);
    C.before = Object.keys(S.members);
    if (!C.member && !C.rejoin) {
      S.members[C.to] = { pub: C.toPub, kind: KINDS.includes(C.kind) ? C.kind : 'computer', since: iso(), via: `code:${me()}` };
      S.names[C.to] = S.names[C.to] || { name: C.name, at: iso(), by: me() };
    }
    const payload = await fullPayload(C.to, 'joincode');
    // A member this computer already knew: it merges (adopt refresh). Anything else starts from this keyring.
    if (C.member) payload.member = true;
    C.wrap = await X.wrapBetween({ myPriv: S.identity.priv, fromPub: S.identity.pub, toPub: C.toPub, label: codeLabel(C.sid, me(), C.to), value: payload });
    C.step = 'sent'; C.sentAt = now();
    dirty = true; pairDirty = true;
    await save();
    await savePairing();
    log('info', C.member ? 'sync: sent the pairing extras to a computer that already syncs' : C.rejoin ? 'sync: a removed computer comes back with the join code' : 'sync: added a computer with the join code');
    return codeStatus();
  }
  /** Stop the code on screen for a reason the other side is told ('clash': a second device tried the link). */
  async function codeAbort(why = 'cancelled') {
    const C = sess.code;
    if (!C || !['waiting', 'approve', 'sent'].includes(C.step)) return codeStatus();
    C.step = why === 'clash' ? 'clash' : 'cancelled';
    pairDirty = true;
    await savePairing();
    return codeStatus();
  }
  /** The new device: "Type the 4-letter code from your other computer". */
  async function codeJoin(text, { name, kind: k, member = false } = {}) {
    await identity();
    // member: a device that already syncs asks for the pairing extras only (the key for your relay).
    if (S.group && isReady() && !member) throw err('ALREADY_IN_GROUP', 'This computer already syncs.');
    const p = X.parseJoinCode(text);
    if (!p.ok) throw err('BAD_CODE', p.message);
    // Removed earlier (known from the keyring, or from a member's notice): come in as a new device.
    if ((S.group && own(S.removed, me())) || (!S.group && removedNotice)) await reset();
    // "Try again" with the same code: answers still on their way are kept (the other computer may
    // already have sent the key for one of them); everything else starts fresh at once.
    const keep = sess.claim && sess.claim.code === p.code && Array.isArray(sess.claim.tries) ? sess.claim.tries.filter(t => !t.result) : [];
    sess.claim = { code: p.code, name: cleanName(name) || 'New computer', kind: KINDS.includes(k) ? k : kind, at: now(), exp: now() + CODE_MS, step: keep.length ? 'sent' : 'looking', tries: keep };
    pairDirty = true;
    await savePairing();
    return codeStatus();
  }

  async function moveCode() {
    // ── This device shows the code: check the answers ──
    // A valid answer that stays alone for a moment is shown as "Approve <name>?";
    // the keys go only after the user approves (codeApprove). A device that is
    // already a member may answer too: it gets the pairing extras (the key for
    // your relay), nothing else changes.
    const C = sess.code;
    if (C) {
      if (['waiting', 'approve'].includes(C.step) && now() > C.exp) { C.step = 'expired'; pairDirty = true; }
      if (['waiting', 'approve'].includes(C.step) && isReady()) {
        const valid = [];
        for (const [id, d] of Object.entries(docs)) {
          const pd = d.pair;
          const claims = pd && Array.isArray(pd.claims) ? pd.claims : [];
          const c = claims.find(x => isObj(x) && x.sid === C.sid && x.to === me() && X.isPub(x.Y) && typeof x.tag === 'string' && Number.isFinite(x.at));
          if (!c) continue;
          const member = own(S.members, id) && !own(S.removed, id);
          if (member && S.members[id].pub !== pd.pub) continue;
          const name = cleanName(c.name) || 'A new computer', k = KINDS.includes(c.kind) ? c.kind : 'computer';
          const key = `${id}|${c.Y}|${c.at}`;
          let res = C.checked[key];
          if (res === undefined) {
            // Each answer is checked once; a wrong one counts, 3 wrong ones burn the code.
            const tags = await X.joinTags(C.priv, c.Y, codeTranscript({ sid: C.sid, eDev: me(), ePub: S.identity.pub, eY: C.Y, nDev: id, nPub: pd.pub, nY: c.Y, name, kind: k })).catch(() => null);
            res = tags && X.sameB64(tags.join, c.tag) ? { ok: true, tag: tags.approve } : { ok: false };
            const keys = Object.keys(C.checked);
            if (keys.length >= 40) delete C.checked[keys[0]];
            C.checked[key] = res;
            if (!res.ok) {
              C.wrong++;
              C.no = { ...(C.no || {}), [id]: c.at };
              pairDirty = true;
              log('warn', `sync: a wrong join code was typed (${C.wrong} of ${CODE_TRIES})`);
              if (C.wrong >= CODE_TRIES) { C.step = 'burned'; break; }
            }
          }
          if (res.ok) valid.push({ id, pub: pd.pub, name, kind: k, tag: res.tag, at: c.at, member, pic: c.p === 1 });
        }
        if (['waiting', 'approve'].includes(C.step)) {
          const devs = [...new Set(valid.map(v => v.id))];
          if (devs.length > 1 || (C.step === 'approve' && devs.length === 1 && devs[0] !== C.to)) {
            // Two computers knew the code: nobody gets in (one of them may not be yours).
            C.step = 'clash'; pairDirty = true;
            log('warn', 'sync: two computers answered the same join code; refused both');
          } else if (devs.length === 1 && C.step === 'waiting') {
            const v = valid.sort((a, b) => b.at - a.at)[0];
            if (C.validDev !== v.id) { C.validDev = v.id; C.validSince = now(); }
            else if (now() - (C.validSince || 0) >= CODE_SETTLE_MS) {
              // One device, still alone after a moment: ask the user before anything is sent.
              // The matching picture: from the code's shared secret (both sides have it only with the right code).
              const pic = v.pic ? (await X.pictureFor(v.tag, 1))[0] : null;
              Object.assign(C, { to: v.id, toPub: v.pub, name: v.name, kind: v.kind, tag: v.tag, member: !!v.member, step: 'approve', pic });
              C.exp = Math.max(C.exp, now() + PAIR_MS);
              pairDirty = true;
              log('info', 'sync: a computer typed the join code; waiting for approval here');
            }
          } else if (!devs.length && C.step === 'waiting') { C.validDev = null; C.validSince = null; }
        }
      }
      if (C.step === 'sent') {
        let joined = false;
        if (C.member) {
          // A member that came for the extras: done once its answer is gone (it took the payload).
          const pd = docs[C.to] && docs[C.to].pair;
          joined = !(pd && Array.isArray(pd.claims) && pd.claims.some(x => isObj(x) && x.sid === C.sid));
        } else if (C.rejoin) {
          const back = Object.entries(S.members).find(([id, m]) => id !== C.to && !(C.before || []).includes(id) && m.via === `code:${me()}`);
          if (back) { joined = true; if (!S.names[back[0]]) { S.names[back[0]] = { name: C.name, at: iso(), by: me() }; dirty = true; await save(); } }
        } else { const k = docs[C.to] && docs[C.to].keys; joined = !!(k && k.group === S.group); }
        if (joined || now() > (C.sentAt || C.at) + CODE_MS) { C.step = 'done'; pairDirty = true; }
      }
      if (CODE_FINAL.has(C.step)) { C.endedAt = C.endedAt || now(); if (now() - C.endedAt > ENDED_MS) { sess.code = null; pairDirty = true; } }
    }

    // ── This device typed a code: answer the sessions it finds, then read the result ──
    const K = sess.claim;
    if (K) {
      if (['looking', 'sent'].includes(K.step) && now() > K.exp) { K.step = 'expired'; pairDirty = true; }
      if (['looking', 'sent'].includes(K.step)) {
        for (const id of Object.keys(docs).sort()) {
          const pd = docs[id].pair, o = pd && pd.code;
          if (!isObj(o) || !SID_RE.test(o.sid || '') || !X.isPub(o.Y) || o.abort || o.done) continue;
          if (!Number.isFinite(o.exp) || o.exp < now() || o.exp > now() + CODE_MS + 5 * 60 * 1000) continue;
          if (K.tries.some(t => t.sid === o.sid && t.to === id)) continue;
          if (K.tries.length >= CODE_MAX_TRIES_JOIN) break;
          const share = await X.joinShare(K.code, o.sid).catch(() => null);
          const tags = share && await X.joinTags(share.priv, o.Y, codeTranscript({ sid: o.sid, eDev: id, ePub: pd.pub, eY: o.Y, nDev: me(), nPub: S.identity.pub, nY: share.Y, name: K.name, kind: K.kind })).catch(() => null);
          if (!tags) continue;
          K.tries.push({ sid: o.sid, to: id, toPub: pd.pub, priv: share.priv, Y: share.Y, tag: tags.join, expect: tags.approve, at: now(), pic: o.p === 1 ? (await X.pictureFor(tags.approve, 1))[0] : null });
          K.step = 'sent'; pairDirty = true;
        }
        for (const t of K.tries) {
          if (t.result) continue;
          const pd = docs[t.to] && docs[t.to].pair;
          const o = pd && pd.pub === t.toPub && isObj(pd.code) && pd.code.sid === t.sid ? pd.code : null;
          if (!o) continue;
          if (isObj(o.done) && o.done.to === me()) {
            // Only the device that knows the code can make this tag; the keyring is wrapped from its identity key.
            if (!X.sameB64(o.done.tag, t.expect)) { t.result = 'bad'; continue; }
            const p = await X.unwrapBetween({ myPriv: S.identity.priv, fromPub: t.toPub, toPub: S.identity.pub, label: codeLabel(t.sid, t.to, me()), enc: o.done.wrap });
            if (isObj(p) && ID_RE.test(p.group || '') && payloadOk(p, { group: p.group, purpose: 'joincode', forId: me(), by: t.to }) && own(p.members || {}, t.to)) {
              try {
                await adopt(p, `code:${t.to}`, t.to);
                K.step = 'done'; t.result = 'done'; pairDirty = true;
                log('info', 'sync: joined with the join code');
                break;
              } catch (e) { t.result = 'bad'; log('warn', `sync: could not join with the code (${(e && e.code) || 'error'})`); continue; }
            }
            t.result = 'bad';
          } else if (isObj(o.done)) t.result = 'taken';
          else if (o.abort === 'clash') t.result = 'clash';
          else if (isObj(o.no) && o.no[me()] === t.at) t.result = 'wrong';
          else if (o.abort) t.result = o.abort === 'burned' ? 'wrong' : o.abort === 'declined' ? 'declined' : 'ended';
        }
        if (K.step === 'sent' && K.tries.length && K.tries.every(t => t.result)) {
          const r = K.tries.map(t => t.result);
          K.step = r.includes('clash') ? 'clash' : r.includes('wrong') ? 'wrong' : r.includes('taken') ? 'taken' : r.includes('declined') ? 'declined' : 'failed';
          pairDirty = true;
        }
      }
      if (CODE_FINAL.has(K.step)) { K.endedAt = K.endedAt || now(); if (now() - K.endedAt > ENDED_MS) { sess.claim = null; pairDirty = true; } }
    }
  }
  /** The join code as the page shows it: {role: 'offer'|'join', step, code?, expiresAt, name?, wrong?}. */
  function codeStatus() {
    const C = sess.code, K = sess.claim;
    // A "Done" about a computer that has since been removed says nothing any more.
    if (K && K.step === 'done' && own(S.removed, me())) return null;
    if (!K && C && C.step === 'done' && C.to && own(S.removed, C.to)) return null;
    if (K) {
      // The matching picture while the other computer is asked (only when exactly one answer is open).
      const open = K.step === 'sent' ? K.tries.filter(t => !t.result) : [];
      const pic = open.length === 1 && Array.isArray(open[0].pic) ? open[0].pic : null;
      return { role: 'join', step: K.step, expiresAt: K.exp, tried: K.tries.length, pic };
    }
    if (C) return { role: 'offer', step: C.step, code: C.step === 'waiting' || C.step === 'approve' ? C.code : null, expiresAt: C.exp, name: C.name || null, kind: C.kind || null, member: !!C.member, wrong: C.wrong || 0, rejoin: !!C.rejoin, pic: C.step === 'approve' && Array.isArray(C.pic) ? C.pic : null };
    return null;
  }

  function pairingStatus() {
    const J = sess.join, A = sess.approve;
    if (J) return { role: 'join', sid: J.sid, step: J.step, code: J.step === 'compare' || J.step === 'confirmed' ? J.code : null, expiresAt: J.exp, name: J.name, why: J.why || null };
    if (A) return { role: 'approve', sid: A.sid, step: A.step, code: A.step === 'compare' ? A.code : null, expiresAt: A.exp, name: A.name, kind: A.kind, why: A.why || null, rejoin: !!A.rejoin };
    return null;
  }

  // ─── "Scan with your phone": a one-time offer ────────────────────────
  async function makeOffer() {
    if (!isReady()) throw err('NOT_READY', 'This computer cannot add another one right now.');
    const id = X.randomId(4);
    const secret = X.randomBytes(16);
    const label = offerLabel(S.group, me(), id);
    const enc = await X.sealJson(await X.secretKeyFrom(secret, label), await fullPayload(`offer:${id}`, 'offer'), X.utf8(label));
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
  // 2.19.8: every record also carries `sig`, this device's signature (see checkSig). Older versions ignore it.
  async function sealLine(line, file) {
    const kid = currentKid();
    await startSigning(line.n);
    const a = aad('log', me(), file, line.n, kid);
    const enc = await X.sealJson(await aes(kid), { h: line.h, s: line.s, w: line.w, x: line.x }, a);
    return { v: 2, dev: me(), n: line.n, enc: { k: kid, ...enc }, ...(await signRecord(a, enc)) };
  }
  /** {line} (a v1-shaped change), {wait} (key not here yet), {refused: why} or {bad: why}. */
  async function openLine(obj, dev, file) {
    if (!isObj(obj) || obj.v !== 2 || obj.dev !== dev || !Number.isInteger(obj.n) || obj.n < 1 || !isObj(obj.enc) || !KID_RE.test(obj.enc.k || '')) return { bad: 'format' };
    const a = accepts(dev, obj.n, obj.enc.k);
    if (a === 'wait') return { wait: true };
    if (a !== 'ok') { stats.refused++; return { refused: a }; }
    const ad = aad('log', dev, file, obj.n, obj.enc.k);
    const no = await checkSig(dev, obj.n, obj, ad, false);
    if (no) return no;
    const inner = await X.openJson(await aes(obj.enc.k), obj.enc, ad);
    if (!isObj(inner)) { stats.bad++; return { bad: 'auth' }; }
    return { line: { v: 1, dev, n: obj.n, h: inner.h, s: inner.s, w: inner.w, x: inner.x } };
  }
  async function sealSnapshot(snap) {
    const kid = currentKid();
    const { v, dev, seq, enc: _e, ...rest } = snap;
    await startSigning(seq + 1);
    const a = aad('snapshot', me(), 'snapshot.json', seq, kid);
    const enc = await X.sealJson(await aes(kid), rest, a);
    return { v: 2, dev: me(), seq, enc: { k: kid, ...enc }, ...(await signRecord(a, enc)) };
  }
  async function openSnapshot(obj, dev) {
    if (!isObj(obj) || obj.v !== 2 || obj.dev !== dev || !Number.isInteger(obj.seq) || obj.seq < 0 || !isObj(obj.enc) || !KID_RE.test(obj.enc.k || '')) return { bad: 'format' };
    const a = accepts(dev, obj.seq, obj.enc.k);
    if (a === 'wait') return { wait: true };
    if (a !== 'ok') { stats.refused++; return { refused: a }; }
    const ad = aad('snapshot', dev, 'snapshot.json', obj.seq, obj.enc.k);
    const no = await checkSig(dev, obj.seq, obj, ad, true);
    if (no) return no;
    const inner = await X.openJson(await aes(obj.enc.k), obj.enc, ad);
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

  // ─── Blobs (pictures, narration audio: lib/sync/blobs.mjs) ───────────
  // A blob is sealed under the current key with AD = group + its id (the
  // SHA-256 of its plaintext) + the key id; its name in the folder is a keyed
  // LOCATOR (HKDF of that key over the id), so the folder cannot test whether
  // a picture it knows is in there. Any key this device holds opens one: blobs
  // stay under the key they were written with (members hold every key), and
  // their content is checked against the id after opening anyway.
  const BLOB_ID_RE = /^[0-9a-f]{64}$/;
  const locCache = new Map();             // "<kid>|<id>" -> locator
  async function blobLocator(id, kid) {
    if (!BLOB_ID_RE.test(id || '') || !KID_RE.test(kid || '') || !own(S.keys, kid)) return null;
    const ck = `${kid}|${id}`;
    let loc = locCache.get(ck);
    if (!loc) {
      loc = X.hex(await X.hkdf(X.unb64u(S.keys[kid].k), X.utf8('opendash-blob-name-v1'), `opendash-blob-name|${S.group}|${kid}|${id}`, 16));
      locCache.set(ck, loc);
      if (locCache.size > 4096) locCache.delete(locCache.keys().next().value);
    }
    return loc;
  }
  /** {kid, iv, ct} (bytes) of a blob sealed with the current key, or null without one. */
  async function sealBlob(id, bytes) {
    if (!isReady() || !BLOB_ID_RE.test(id || '')) return null;
    const kid = currentKid();
    const { iv, ct } = await X.sealBytes(await aes(kid), bytes, X.blobAad({ group: S.group, id, kid }));
    return { kid, iv, ct };
  }
  /** The plaintext bytes, {wait: true} (a key this device does not have yet), or null (changed, or not for this id). */
  async function openBlob(id, { kid, iv, ct } = {}) {
    if (!BLOB_ID_RE.test(id || '') || !KID_RE.test(kid || '')) return null;
    if (!own(S.keys, kid)) return { wait: true };
    // (Not counted as tampering: a blob the cloud is still bringing fails the same way; lib/sync/blobs.mjs counts drops.)
    return X.openBytes(await aes(kid), iv, ct, X.blobAad({ group: S.group, id, kid }));
  }

  // ─── Live sync (lib/sync/live/) ──────────────────────────────────────
  const liveCache = new Map();               // kid -> {psk, tagKey}
  /**
   * What a live link's handshake needs (a PeerAuth, lib/sync/live/handshake.mjs),
   * for the CURRENT key, or null when this device cannot sync. psk and tagKey
   * are HKDF outputs of the current sync key (never the key itself); dh(pub)
   * uses this device's private key without handing it out; peer(id) is a
   * member of this epoch (null once removed).
   */
  async function liveAuth() {
    if (!isReady()) return null;
    const kid = currentKid();
    let d = liveCache.get(kid);
    if (!d) {
      const raw = X.unb64u(S.keys[kid].k);
      d = {
        psk: await X.hkdf(raw, X.utf8('opendash-live-psk-v1'), `opendash-live-psk|${S.group}|${kid}`, 32),
        tagKey: await X.hkdf(raw, X.utf8('opendash-live-discovery-v1'), `opendash-live-discovery|${S.group}|${kid}`, 32),
      };
      liveCache.set(kid, d);
    }
    const priv = S.identity.priv;
    return {
      deviceId: me(), pub: S.identity.pub, group: S.group, kid, epoch: S.keys[kid].n, psk: d.psk, tagKey: d.tagKey,
      dh: (pub) => X.dh(priv, pub),
      peer: (id) => (id !== me() && own(S.members, id) && !own(S.removed, id) && S.members[id].pub ? S.members[id].pub : null),
      members: () => Object.keys(S.members).filter(id => id !== me() && !own(S.removed, id)),
    };
  }

  /**
   * The relay's enrolment capability (docs/dev/RELAY_PROTOCOL.md 5.1) for a key
   * (default: the current one): {group, kid, n, cap}, or null. Proves knowledge
   * of the sync key without revealing it; the relay keeps only its hash.
   */
  async function relayCap(kid = null) {
    await ensureLoaded();
    const id = kid || currentKid();
    if (!S.group || !id || !own(S.keys, id) || !isReady()) return null;
    const raw = X.unb64u(S.keys[id].k);
    const cap = X.b64u(await X.hkdf(raw, X.utf8('opendash-relay-cap-v1'), `opendash-relay-cap|${S.group}|${id}`, 32));
    return { group: S.group, kid: id, n: S.keys[id].n, cap };
  }
  /** The capabilities of the newest keys this device holds (newest first): enrolling where the relay knows an older key. */
  async function relayCaps(max = 8) {
    await ensureLoaded();
    if (!S.group || !isReady()) return [];
    const kids = Object.entries(S.keys).sort((x, y) => y[1].n - x[1].n || (x[0] < y[0] ? 1 : -1)).slice(0, max).map(([kid]) => kid);
    const out = [];
    for (const kid of kids) { const c = await relayCap(kid); if (c) out.push(c); }
    return out;
  }

  function status() {
    const kid = currentKid();
    return {
      group: S.group, deviceId: me(), ready: isReady(), reason: reason(),
      epoch: kid ? S.keys[kid].n : null, kid,
      sheet: kid && S.keys[kid].sheet ? S.keys[kid].sheet : 'none',
      members: Object.keys(S.members).filter(id => !own(S.removed, id)),
      removed: Object.keys(S.removed),
      joined: S.joined,
      pairing: pairingStatus(),
      joinCode: codeStatus(),
      requests: requests.map(r => ({ ...r })),
      offer: sess.offer && now() < sess.offer.exp ? { text: sess.offer.text, expiresAt: sess.offer.exp } : null,
      found: { groups: Object.keys(found.groups).length, devices: Object.values(found.groups).reduce((a, b) => a + b, 0) },
      stats: { ...stats },
    };
  }

  return {
    load, identity, reset, refresh, status,
    createGroup, joinWithRecovery, joinWithOffer, makeOffer,
    pairStart, pairRespond, pairConfirm, pairCancel, codeStart, codeCancel, codeJoin, codeApprove, codeAbort, relayCap, relayCaps, takeLiveExtras,
    removeDevice, newRecoveryCode, rename, rotate,
    sealLine, openLine, sealSnapshot, openSnapshot, sealDevice, openDevice, accepts, liveAuth,
    sealBlob, openBlob, blobLocator, hasKey: (kid) => own(S.keys, kid),
    /** True when a device was removed after this key was made (a removal key of a higher number exists). */
    beforeRemoval: (kid) => { const k = S.keys[kid]; return !!k && Object.values(S.keys).some(o => o.cut && o.n > k.n && !own(S.removed, o.by)); },
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
