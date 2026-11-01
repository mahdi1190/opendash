// lib/friends/group-core.mjs - the pure core of Freeflo Groups (docs/dev/GROUPS.md).
//
// PLATFORM-AGNOSTIC: Web Crypto only, no node: imports. Everything a group's apps agree on: the link and the optional
// 4-letter code, the group's card, the authority document (who owns and runs it), the group key's wraps, sealed and
// signed messages, join requests and admit proofs. Everything that arrives here is untrusted: from a member, from
// whoever holds a link, and from the relay.

import { b64u, unb64u, utf8, concat, hkdf, sha256, hex, randomBytes, aesKey, sealJson, openJson, newKeyPair, dh, isPub, newShortCode, parseShortCode } from '../sync/e2e-crypto.mjs';
import { canon, signBytes, verifyBytes, signText, verifyText, cleanLine, cleanText, cleanOrigin, newMsgId, verifyCard } from './core.mjs';
import { groupAuthText, groupRekeyText, groupIdOf, groupAuthHash } from '../relay/auth.mjs';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const subtle = () => globalThis.crypto.subtle;
export const GROUP_LINK_PREFIX = 'ODG1.';
export const GID_RE = /^[A-Za-z0-9_-]{22}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;
const HEX32 = /^[0-9a-f]{32}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export const NAME_MAX = 60, ABOUT_MAX = 500, WELCOME_MAX = 500, TEXT_MAX = 2000, STATUS_MAX = 80, MEMBER_NAME_MAX = 40;
/** Part of what a group can look like: an emoji and a colour. Never a picture (FRIENDS.md rule 3). */
export const cleanEmoji = (e) => { const s = String(e == null ? '' : e); return s && s.length <= 16 && !/[\u0000-\u007f<>&"'`\s]/.test(s) ? s : ''; };
export const cleanColor = (c) => (typeof c === 'string' && COLOR_RE.test(c) ? c : '');

// ─── The link ──────────────────────────────────────────────────────────────
// <relay origin>/g#ODG1.<group id>.<secret>.<check>: everything after # stays in the browser and the app.
// A group's id is a hash of the key that started it (and a random nonce), so the link anchors everything: a joiner checks the first
// signed document against the id they were given, and walks forward from there. A relay cannot put a made-up history in front.
export async function newGroupOrigin(owner) { const nonce = b64u(randomBytes(16)); return { nonce, gid: await groupIdOf(owner, nonce) }; }
export const newLinkToken = () => b64u(randomBytes(16));
const linkCheck = async (origin, gid, token) => b64u(await sha256(utf8(`opendash-group-check-v1\n${origin}\n${gid}\n${token}`))).slice(0, 6);
export async function groupLink(origin, gid, token) { return `${origin}/g#${GROUP_LINK_PREFIX}${gid}.${token}.${await linkCheck(origin, gid, token)}`; }
/** A group link anywhere in what was pasted -> {origin, gid, token}, {error: 'needs-link' | 'origin' | 'check'}, or null when there is none. */
export async function parseGroupLink(text) {
  const t = String(text == null ? '' : text).slice(0, 2000);
  const m = /ODG1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{6})(?![A-Za-z0-9_-])/.exec(t);
  if (!m) return null;
  const u = /(https?:\/\/[^\s/#?]+)\/g#$/.exec(t.slice(Math.max(0, m.index - 300), m.index));
  if (!u) return { error: 'needs-link' };
  const origin = cleanOrigin(u[1]);
  if (!origin) return { error: 'origin' };
  if ((await linkCheck(origin, m[1], m[2])) !== m[3]) return { error: 'check' };
  return { origin, gid: m[1], token: m[2] };
}
const SALT = utf8('opendash-group-secrets-v1');
const relayHash = async (proof) => b64u(await sha256(utf8(`opendash-group-link-v1\n${proof}`)));
/** What a link's secret gives: proof (shown to the relay when joining), h (all the relay keeps), seal (a key the relay never sees), tag (open-mode admit proofs). */
export async function linkSecrets(gid, token) {
  const raw = unb64u(token);
  if (!raw || !TOKEN_RE.test(token)) throw new Error('not a link secret');
  const proof = b64u(await hkdf(raw, SALT, `proof|${gid}`));
  return { proof, h: await relayHash(proof), seal: await aesKey(await hkdf(raw, SALT, `seal|${gid}`)), tag: await hkdf(raw, SALT, `tag|${gid}`) };
}
/** A group's 4-letter code. A relay could try them all, so what it seals says only what a code holder may know (GROUPS.md). */
export async function codeSecrets(code) {
  const raw = utf8(code);
  const proof = b64u(await hkdf(raw, SALT, 'code-proof'));
  return { key: hex(await sha256(utf8(`opendash-group-code-v1\n${code}`))), proof, h: await relayHash(proof), seal: await aesKey(await hkdf(raw, SALT, 'code-seal')) };
}
export { newShortCode, parseShortCode };

// ─── Sealing a card or a bundle under a shared key ─────────────────────────
export const sealFor = (key, value, label) => sealJson(key, value, utf8(`opendash-group-seal-v1|${label}`));
export async function openFor(key, enc, label) {
  if (!isObj(enc) || typeof enc.iv !== 'string' || typeof enc.ct !== 'string') return null;
  try { return await openJson(key, { iv: enc.iv, ct: enc.ct }, utf8(`opendash-group-seal-v1|${label}`)); } catch { return null; }
}
export const newGroupKey = () => b64u(randomBytes(32));
export const groupAes = (k) => { const raw = unb64u(k); if (!raw || raw.length !== 32) throw new Error('not a group key'); return aesKey(raw); };

// ─── The group's card ──────────────────────────────────────────────────────
// {v, gid, name, about, welcome, logo: {e, c}, owner: {name, ed, x}, j, auto, mode, au: {seq, h}, at, by, sig}: what someone with the
// link sees before joining. j: the public key join requests are sealed to. by: who signed it (the owner or an admin). mode: how people
// get in, signed, because the relay's word for it opens nothing. au: the authority document it was signed under, so a relay cannot
// quietly show a newcomer an older history than the card's own.
const cardText = (c) => utf8(canon(['opendash-group-card-v1', c.v, c.gid, c.name, c.about, c.welcome, c.logo, c.owner, c.j, c.auto === true, c.mode, c.au, c.at, c.by]));
export async function signCard(identity, f) {
  const c = {
    v: 1, gid: f.gid, name: cleanLine(f.name, NAME_MAX), about: cleanText(f.about || '', ABOUT_MAX), welcome: cleanText(f.welcome || '', WELCOME_MAX),
    logo: { e: cleanEmoji(f.logo && f.logo.e), c: cleanColor(f.logo && f.logo.c) },
    owner: { name: cleanLine(f.owner.name, MEMBER_NAME_MAX), ed: f.owner.ed, x: f.owner.x }, j: f.j, auto: f.auto === true, mode: f.mode === 'open' ? 'open' : 'approve',
    au: { seq: f.auth.seq, h: await groupAuthHash(f.auth) }, at: f.at, by: identity.ed.pub,
  };
  c.sig = await signBytes(identity.ed.priv, cardText(c));
  return c;
}
/** A card, checked in full and cleaned for showing; else null. by: must be someone who runs the group (the caller says who). */
export async function checkCard(c, gid) {
  if (!isObj(c) || c.v !== 1 || c.gid !== gid || typeof c.name !== 'string' || c.name.length > NAME_MAX * 2 || typeof c.about !== 'string' || c.about.length > ABOUT_MAX * 2 || typeof c.welcome !== 'string' || c.welcome.length > WELCOME_MAX * 2) return null;
  if (!isObj(c.owner) || !isPub(c.owner.ed) || !isPub(c.owner.x) || typeof c.owner.name !== 'string' || c.owner.name.length > 200 || !isPub(c.j) || !isPub(c.by) || !Number.isFinite(c.at) || !isObj(c.logo) || (c.mode !== 'open' && c.mode !== 'approve') || !isObj(c.au) || !Number.isInteger(c.au.seq) || typeof c.au.h !== 'string') return null;
  if (!(await verifyBytes(c.by, cardText(c), c.sig))) return null;
  const name = cleanLine(c.name, NAME_MAX);
  if (!name) return null;
  return { v: 1, gid, name, about: cleanText(c.about, ABOUT_MAX), welcome: cleanText(c.welcome, WELCOME_MAX), logo: { e: cleanEmoji(c.logo.e), c: cleanColor(c.logo.c) }, owner: { name: cleanLine(c.owner.name, MEMBER_NAME_MAX), ed: c.owner.ed, x: c.owner.x }, j: c.j, auto: c.auto === true, mode: c.mode, au: { seq: c.au.seq, h: c.au.h }, at: c.at, by: c.by, sig: c.sig };
}

/** A card against the signed history I just walked: signed by someone who runs the group now, naming this owner, and no newer than this history. */
export function cardFits(c, fa) {
  const a = fa && fa.auth;
  if (!c || !a || a.owner.ed !== c.owner.ed || a.owner.x !== c.owner.x || !runsGroup(a, c.by) || c.au.seq > a.seq) return false;
  const h = fa.hashes && fa.hashes[c.au.seq];
  return h === undefined || h === c.au.h;
}

// ─── Who runs it ───────────────────────────────────────────────────────────
/**
 * One signed step in who runs the group. The first names the nonce its group id is a hash of; each later one names the one before
 * it by a hash of the WHOLE document (signature included), and is signed by the owner so far.
 */
export async function signAuth(signerIdentity, { gid, seq, owner, admins = [], at, prev = null, nonce = null }) {
  const d = { v: 1, gid, seq, owner: { ed: owner.ed, x: owner.x }, admins: admins.map(a => ({ ed: a.ed, x: a.x })), at, ...(prev ? { prev: await groupAuthHash(prev) } : {}), ...(nonce ? { nonce } : {}) };
  return { ...d, sig: await signText(signerIdentity, groupAuthText(d)) };
}
const authShape = (d, gid) => isObj(d) && d.gid === gid && Number.isInteger(d.seq) && d.seq > 0 && isObj(d.owner) && isPub(d.owner.ed) && isPub(d.owner.x) && Array.isArray(d.admins) && d.admins.length <= 64 && d.admins.every(a => isObj(a) && isPub(a.ed) && isPub(a.x)) && Number.isFinite(d.at) && typeof d.sig === 'string';
const cleanAuth = (d, gid) => ({ v: 1, gid, seq: d.seq, owner: { ed: d.owner.ed, x: d.owner.x }, admins: d.admins.map(a => ({ ed: a.ed, x: a.x })), at: d.at, sig: d.sig, ...(typeof d.prev === 'string' && d.prev ? { prev: d.prev } : {}), ...(typeof d.nonce === 'string' && d.nonce ? { nonce: d.nonce } : {}) });
/**
 * Walk from what I know through newer documents. With nothing known yet, the walk can only start at document 1, whose hash the group's
 * id is, signed by the key it names. Every later document must be signed by the owner so far, and when it directly follows the last
 * one it must name it by hash. A relay may keep only the documents where the owner changed plus the recent ones, so a gap is fine:
 * what is signed by the owner so far is the owner's word. A document that fails is skipped: it can add nobody.
 * -> {auth, ever, hashes}: ever = everyone these documents ever named as running the group (old announcements only, it opens nothing).
 */
export async function followAuth(gid, cur, list, ever = []) {
  let auth = cur;
  const seen = new Set(ever), hashes = {};
  if (auth) { hashes[auth.seq] = await groupAuthHash(auth); seen.add(auth.owner.ed); for (const a of auth.admins) seen.add(a.ed); }
  for (const d of [...(Array.isArray(list) ? list : [])].sort((a, b) => (a && a.seq) - (b && b.seq))) {
    if (!authShape(d, gid)) continue;
    if (!auth) {
      if (d.seq !== 1 || d.admins.length || typeof d.nonce !== 'string' || (await groupIdOf(d.owner, d.nonce)) !== gid) continue;
      if (!(await verifyText(d.owner.ed, groupAuthText(d), d.sig))) continue;
    } else {
      if (d.seq <= auth.seq) continue;
      if (d.seq === auth.seq + 1 && d.prev !== await groupAuthHash(auth)) continue;
      if (!(await verifyText(auth.owner.ed, groupAuthText(d), d.sig))) continue;
    }
    auth = cleanAuth(d, gid);
    hashes[auth.seq] = await groupAuthHash(auth);
    seen.add(auth.owner.ed);
    for (const a of auth.admins) seen.add(a.ed);
  }
  return { auth: auth || null, ever: [...seen].slice(-256), hashes };
}
export const roleIn = (auth, ed) => (!auth ? 'member' : auth.owner.ed === ed ? 'owner' : auth.admins.some(a => a.ed === ed) ? 'admin' : 'member');
export const runsGroup = (auth, ed) => roleIn(auth, ed) !== 'member';
/** Does the signed document name exactly this pair of keys as running the group? An x key is never taken on anyone's word. */
export const namedIn = (auth, ed, x) => !!auth && ((auth.owner.ed === ed && auth.owner.x === x) || auth.admins.some(a => a.ed === ed && a.x === x));

// ─── The group key: one wrap per member, one signature per batch ───────────
const hdrText = (gid, h) => utf8(canon(['opendash-group-keys-v1', gid, h.e, h.by, h.eph, h.at]));
const wrapKey = async (mineX, theirX, ephPub, memberX) => aesKey(await hkdf(await dh(mineX, theirX), concat(unb64u(ephPub), unb64u(memberX)), 'opendash-group-wrap-v1'));
const wrapAad = (gid, e, ed) => utf8(`opendash-group-wrap-v1|${gid}|${e}|${ed}`);
/** A batch of key wraps by this identity for epoch e -> {hdr, wrap(member {ed, x}, bundle) -> {iv, ct}}. */
export async function wrapBatch(identity, gid, e, at) {
  const eph = await newKeyPair();
  const hdr = { e, by: identity.ed.pub, eph: eph.pub, at };
  hdr.sig = await signBytes(identity.ed.priv, hdrText(gid, hdr));
  return { hdr, wrap: async (member, bundle) => sealJson(await wrapKey(eph.priv, member.x, eph.pub, member.x), bundle, wrapAad(gid, e, member.ed)) };
}
/** A wrap for me -> {by, bundle} | null. The caller checks that `by` runs the group. */
export async function openWrap(identity, gid, w) {
  if (!isObj(w) || !isObj(w.hdr) || !isPub(w.hdr.eph) || !isPub(w.hdr.by)) return null;
  if (!Number.isInteger(w.hdr.e) || !(await verifyBytes(w.hdr.by, hdrText(gid, w.hdr), w.hdr.sig))) return null;
  try {
    const bundle = await openJson(await wrapKey(identity.x.priv, w.hdr.eph, w.hdr.eph, identity.x.pub), { iv: w.iv, ct: w.ct }, wrapAad(gid, w.hdr.e, identity.ed.pub));
    return isObj(bundle) && typeof bundle.k === 'string' ? { e: w.hdr.e, by: w.hdr.by, bundle } : null;
  } catch { return null; }
}

// ─── The key sealed under the link (anyone-with-the-link only) ─────────────
// Signed by whoever runs the group: holding the link is not enough to hand out a key. Only the key and older keys are ever taken from it.
const linkKeysText = (gid, e, b) => utf8(canon(['opendash-group-linkkeys-v1', gid, e, b.k, b.old, b.by, b.at]));
export async function sealLinkKeys(identity, seal, gid, e, k, old, at) {
  const b = { k, old: old || {}, by: identity.ed.pub, at };
  b.sig = await signBytes(identity.ed.priv, linkKeysText(gid, e, b));
  return sealFor(seal, b, `keys|${gid}|${e}`);
}
/** -> {k, old} | null, only when someone the signed document says runs the group signed it for exactly this epoch. */
export async function openLinkKeys(seal, gid, e, enc, auth) {
  if (!Number.isInteger(e)) return null;
  const b = await openFor(seal, enc, `keys|${gid}|${e}`);
  if (!isObj(b) || typeof b.k !== 'string' || !isPub(b.by) || !isObj(b.old) || !Number.isFinite(b.at) || !runsGroup(auth, b.by)) return null;
  if (!(await verifyBytes(b.by, linkKeysText(gid, e, b), b.sig))) return null;
  return { k: b.k, old: b.old };
}

// ─── Messages: sealed with the group key, signed by who wrote them ─────────
// ch: a (announcement), m (a note), p (a profile). Signed, so a relay cannot relabel someone's note as an announcement.
const envSigText = (gid, e) => utf8(canon(['opendash-group-msg-v1', gid, e.e, e.id, e.from, e.ch, e.iv, e.ct]));
const envAad = (gid, e, id, from, ch) => utf8(`opendash-group-msg-v1|${gid}|${e}|${id}|${from}|${ch}`);
export async function sealEnv({ identity, gid, e, key, k, b, at, ch = 'm', id = newMsgId() }) {
  const enc = await sealJson(await groupAes(key), { k, b, at }, envAad(gid, e, id, identity.ed.pub, ch));
  const env = { v: 1, e, id, from: identity.ed.pub, ch, iv: enc.iv, ct: enc.ct };
  env.sig = await signBytes(identity.ed.priv, envSigText(gid, env));
  return env;
}
/** {id, from, ch, k, b, at, e} or null. keyOf(e) -> that epoch's key or null. */
export async function openEnv({ gid, env, keyOf }) {
  if (!isObj(env) || env.v !== 1 || !Number.isInteger(env.e) || !HEX32.test(env.id || '') || !isPub(env.from) || !['a', 'm', 'p'].includes(env.ch) || typeof env.iv !== 'string' || typeof env.ct !== 'string') return null;
  if (!(await verifyBytes(env.from, envSigText(gid, env), env.sig))) return null;
  const key = keyOf(env.e);
  if (!key) return null;
  try {
    const m = await openJson(await groupAes(key), { iv: env.iv, ct: env.ct }, envAad(gid, env.e, env.id, env.from, env.ch));
    return isObj(m) && typeof m.k === 'string' && Number.isFinite(m.at) ? { id: env.id, from: env.from, ch: env.ch, e: env.e, k: m.k, b: m.b, at: m.at } : null;
  } catch { return null; }
}

// ─── Asking to join ────────────────────────────────────────────────────────
const reqKey = async (priv, pub, ephPub, jPub) => aesKey(await hkdf(await dh(priv, pub), concat(unb64u(ephPub), unb64u(jPub)), 'opendash-group-request-v1'));
const reqAad = (gid) => utf8(`opendash-group-request-v1|${gid}`);
/** Who is asking, sealed so only the people running the group can read it. */
export async function sealAsk(jPub, gid, body) {
  const e = await newKeyPair();
  const enc = await sealJson(await reqKey(e.priv, jPub, e.pub, jPub), body, reqAad(gid));
  return { eph: e.pub, iv: enc.iv, ct: enc.ct };
}
export async function openAsk(j, gid, env) {
  if (!isObj(env) || !isPub(env.eph)) return null;
  try { return await openJson(await reqKey(j.priv, env.eph, env.eph, j.pub), { iv: env.iv, ct: env.ct }, reqAad(gid)); } catch { return null; }
}

// ─── Admit proofs: why this key is on the roster ───────────────────────────
const admitText = (gid, ed, x, at) => `OPENDASH-GROUP-ADMIT-1\n${gid}\n${ed}\n${x}\n${at}`;
export async function signAdmit(identity, gid, ed, x, at) { return { by: identity.ed.pub, at, sig: await signText(identity, admitText(gid, ed, x, at)) }; }
export async function openTag(tagKey, gid, ed, x) {
  const k = await subtle().importKey('raw', tagKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(new Uint8Array(await subtle().sign('HMAC', k, utf8(canon(['opendash-group-openjoin-v1', gid, ed, x])))));
}
/**
 * Does this roster row's proof hold, judged against the signed document as it is NOW?
 * ctx: {auth, open, tag, lv, strict}. auth: the document. open: the signed card says anyone with the link may join (otherwise a link's
 * proof is worth nothing). tag, lv: the current link's admit key and version, if this app holds them. strict: for someone about to seal a key.
 * -> true | false | null (a link's proof this app has no key to check: never true, so it opens nothing; only a member's list shows it).
 * Signed by someone who no longer runs the group: not valid. Whoever signs them out signs again for the people they let in, so
 * a removed admin cannot let anyone in afterwards, whatever date they write.
 */
export const ADMIT_DEPTH = 4;
export async function checkAdmit(admit, gid, ed, x, ctx, depth = 0) {
  if (namedIn(ctx.auth, ed, x)) return true;
  if (!isObj(admit) || depth > ADMIT_DEPTH) return false;
  if (typeof admit.by === 'string') return runsGroup(ctx.auth, admit.by) && Number.isFinite(admit.at) && verifyText(admit.by, admitText(gid, ed, x, admit.at), admit.sig);
  if (typeof admit.tag === 'string') {
    if (!ctx.open) return false;
    if (!ctx.tag || admit.lv !== ctx.lv) return ctx.strict ? false : null;
    const want = await openTag(ctx.tag, gid, ed, x);
    let d = want.length ^ admit.tag.length;
    for (let i = 0; i < Math.min(want.length, admit.tag.length); i++) d |= want.charCodeAt(i) ^ admit.tag.charCodeAt(i);
    return d === 0;
  }
  if (isObj(admit.rk) && isPub(admit.rk.from) && isPub(admit.rk.x)) {
    const text = groupRekeyText(gid, admit.rk.from, ed, x);
    if (!(await verifyText(ed, text, admit.rk.sig)) || !(await verifyText(admit.rk.from, text, admit.rk.sigOld))) return false;
    return checkAdmit(admit.prev, gid, admit.rk.from, admit.rk.x, ctx, depth + 1);
  }
  return false;
}
/** Who signed this proof at the bottom of any key renewals; '' for a link's proof, or for someone named in the document at the time. */
export function admitRoot(admit, depth = 0) {
  if (!isObj(admit) || depth > ADMIT_DEPTH) return '';
  if (typeof admit.by === 'string') return admit.by;
  return isObj(admit.rk) ? admitRoot(admit.prev, depth + 1) : '';
}
/** The keys this one renewed from, each step signed by both keys: [{from, x}], oldest last. Empty when any step fails. */
export async function renewedFrom(admit, gid, ed, x) {
  const out = [];
  let a = admit, key = ed, kx = x;
  for (let i = 0; i <= ADMIT_DEPTH && isObj(a) && isObj(a.rk) && isPub(a.rk.from) && isPub(a.rk.x); i++) {
    const text = groupRekeyText(gid, a.rk.from, key, kx);
    if (!(await verifyText(key, text, a.rk.sig)) || !(await verifyText(a.rk.from, text, a.rk.sigOld))) return [];
    out.push({ from: a.rk.from, x: a.rk.x });
    key = a.rk.from; kx = a.rk.x; a = a.prev;
  }
  return out;
}
/** A friend request through a group proves its sender holds the group's key: a relay's made-up list row cannot. "<epoch>.<mac>", bound to who asks. */
export async function friendProof(key, gid, e, ed, x) {
  const k = await subtle().importKey('raw', unb64u(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return `${e}.${b64u(new Uint8Array(await subtle().sign('HMAC', k, utf8(canon(['opendash-group-friend-v1', gid, e, ed, x])))))}`;
}
export const signRekeyText = (identity, gid, oldKey, key, x) => signText(identity, groupRekeyText(gid, oldKey, key, x));

// ─── What is shown about a member ──────────────────────────────────────────
/** A person's check pictures in the group: 11 of the 64 pictures (66 bits, too many to match by trying keys), the same on every screen, from their public key alone. */
export async function fingerprintOf(ed) { const d = await sha256(utf8(`opendash-group-fingerprint-v1\n${ed}`)); return [...d.slice(0, 11)].map(b => b & 63); }
/** What a member's profile may say: a name, a status, how their picture looks. Nothing else, ever (docs/dev/GROUPS.md). */
export async function cleanProfile(b, ed, checkAvatar = () => undefined) {
  if (!isObj(b) || typeof b.name !== 'string') return null;
  const name = cleanLine(b.name, MEMBER_NAME_MAX);
  if (!name) return null;
  const card = await verifyCard(b.card);
  const out = { name };
  if (card && card.ed === ed) out.card = card;
  const status = cleanLine(b.status, STATUS_MAX);
  if (status) out.status = status;
  const emoji = cleanEmoji(b.emoji);
  if (emoji) out.emoji = emoji;
  const color = cleanColor(b.color);
  if (color) out.color = color;
  const avatar = checkAvatar(b.avatar);
  if (avatar) out.avatar = avatar;
  return out;
}
