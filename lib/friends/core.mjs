// lib/friends/core.mjs - the pure core of OpenDash Friends (docs/dev/FRIENDS.md).
//
// PLATFORM-AGNOSTIC: Web Crypto only (X25519, Ed25519, HKDF-SHA-256,
// AES-256-GCM, HMAC-SHA-256, SHA-256), no node: imports, no Buffer, no I/O.
// The Node side (secret store, data files, relay client, direct links) is
// lib/friends/store.mjs, engine.mjs, relay-client.mjs and node-direct.mjs.
//
//   identity      one X25519 + Ed25519 key pair per PERSON (never per device). The
//                 private halves live only in the device secret store and travel to
//                 the person's other devices only inside the encrypted device-pairing
//                 keyring (lib/sync/e2e.mjs registerKeyringExtra). The same identity
//                 is the person's relay membership identity (Ed25519 signs relay requests).
//   cards         the public half {id, x, ed, name, relay}, self-signed with Ed25519
//   friend codes  'ALEX-7K2QX9': resolve only between members of the same relay
//   invites       'ODF1.<base64url>': the inviter's card, a one-time secret, an expiry,
//                 a drop token for the inviter's mailbox and (relay owners only) a
//                 one-time relay access token
//   handshake     commit / nonce / reveal, then a 6-digit confirmation code both see;
//                 the INVITER (or the person whose code was used) approves after comparing
//   messages      end-to-end encrypted per pair (static X25519 between the two
//                 identities), per party for groups (one sealed copy per member);
//                 ordered by a hybrid logical clock, deduplicated by a random id
//   schemas       everything from a friend is untrusted input: every kind has a strict,
//                 allow-listed schema (defineKind); anything else is dropped
//   friendship    friendship XP, levels, streaks and milestones from the shared feed

import {
  b64u, unb64u, utf8, fromUtf8, concat, hkdf, sha256, hex, randomBytes,
  aesKey, sealJson, openJson, newKeyPair, dh, isPub, CODE_ALPHABET,
} from '../sync/e2e-crypto.mjs';
import { relayOrigin } from '../relay/origin.mjs';

const subtle = () => {
  const c = globalThis.crypto;
  if (!c || !c.subtle) throw new Error('friends need Web Crypto (crypto.subtle)');
  return c.subtle;
};
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

export const FRIENDS_V = 1;
/** A person's friend id: 16 hex digits (the fingerprint of both public keys). */
export const ID_RE = /^[0-9a-f]{16}$/;
/** A message id: 32 hex digits (16 random bytes). */
export const MSG_ID_RE = /^[0-9a-f]{32}$/;
/** Any id that comes from a friend (spaces, quests, items): the owner's rule. */
export const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
/** The largest payload one message may carry (its JSON). */
export const MAX_BODY = 32 * 1024;
/** The largest envelope accepted from any transport (base64url ciphertext and the rest). */
export const MAX_ENVELOPE = 64 * 1024;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// ─── Small helpers ─────────────────────────────────────────────────────────
/** Canonical JSON: object keys sorted, undefined dropped (what signatures cover). */
export function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}
/** One line of plain text: no control or bidi-override characters, spaces collapsed, at most `max`. */
export function cleanLine(s, max = 60) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069\u200b-\u200f\ufeff]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, max);
}
/** Plain text that may keep line breaks (at most 3 in a row). */
export function cleanText(s, max = 500) {
  return String(s == null ? '' : s).replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069\u200b-\u200f\ufeff]/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n{4,}/g, '\n\n\n').trim().slice(0, max);
}
export const newMsgId = () => hex(randomBytes(16));
export const newNonce = () => b64u(randomBytes(16));
const isB64 = (s, n) => { const r = typeof s === 'string' ? unb64u(s) : null; return !!r && (n == null || r.length === n); };

// ─── Ed25519 ───────────────────────────────────────────────────────────────
const edPriv = new Map(), edPub = new Map();
const memo = (map, k, make) => { let p = map.get(k); if (!p) { p = make(); map.set(k, p); if (map.size > 128) map.delete(map.keys().next().value); p.catch(() => map.delete(k)); } return p; };
const importEdPriv = (b) => memo(edPriv, b, async () => {
  const der = unb64u(b);
  if (!der || der.length !== 48) throw new Error('not an Ed25519 private key');
  return subtle().importKey('pkcs8', der, { name: 'Ed25519' }, false, ['sign']);
});
const importEdPub = (b) => memo(edPub, b, async () => {
  const raw = unb64u(b);
  if (!raw || raw.length !== 32) throw new Error('not an Ed25519 public key');
  return subtle().importKey('raw', raw, { name: 'Ed25519' }, false, ['verify']);
});
/** A new Ed25519 key pair: {priv: PKCS#8 base64url (48 bytes), pub: raw 32 bytes base64url}. */
export async function newEdKeyPair() {
  const kp = await subtle().generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    priv: b64u(new Uint8Array(await subtle().exportKey('pkcs8', kp.privateKey))),
    pub: b64u(new Uint8Array(await subtle().exportKey('raw', kp.publicKey))),
  };
}
/** Ed25519 signature (64 bytes, base64url) of `bytes` with a PKCS#8 private key. */
export async function signBytes(privB64, bytes) {
  return b64u(new Uint8Array(await subtle().sign({ name: 'Ed25519' }, await importEdPriv(privB64), bytes)));
}
/** True when `sigB64` is a valid Ed25519 signature of `bytes` by `pubB64`. Never throws. */
export async function verifyBytes(pubB64, bytes, sigB64) {
  const sig = typeof sigB64 === 'string' ? unb64u(sigB64) : null;
  if (!sig || sig.length !== 64 || !isPub(pubB64)) return false;
  try { return await subtle().verify({ name: 'Ed25519' }, await importEdPub(pubB64), sig, bytes); }
  catch { return false; }
}
/** Sign UTF-8 text with the person's identity (what the relay client signs: RELAY_PROTOCOL.md). */
export const signText = (identity, text) => signBytes(identity.ed.priv, utf8(text));
export const verifyText = (edPubB64, text, sig) => verifyBytes(edPubB64, utf8(text), sig);

// ─── Identity ──────────────────────────────────────────────────────────────
// The format other modules (the relay client, agent 'relay') rely on:
//   {v: 1, id, x: {pub, priv}, ed: {pub, priv}, createdAt}
//   x.pub / ed.pub     raw 32-byte public keys, base64url without padding
//   x.priv / ed.priv   PKCS#8 DER (48 bytes), base64url without padding
//   id                 friendIdOf(x.pub, ed.pub): 16 hex digits
// Kept ONLY in the device secret store (lib/friends/store.mjs, key 'friends-identity').
/** A person's id: the first 8 bytes of SHA-256("opendash-friend-v1\n" | raw X25519 pub | raw Ed25519 pub), hex. */
export async function friendIdOf(xPub, edPubB64) {
  const x = unb64u(xPub), e = unb64u(edPubB64);
  if (!x || x.length !== 32 || !e || e.length !== 32) return null;
  return hex((await sha256(concat(utf8('opendash-friend-v1\n'), x, e))).subarray(0, 8));
}
export async function newIdentity({ now = Date.now } = {}) {
  const x = await newKeyPair();
  const ed = await newEdKeyPair();
  return { v: FRIENDS_V, id: await friendIdOf(x.pub, ed.pub), x, ed, createdAt: now() };
}
/** The identity, cleaned, when its shape holds and its id is its keys' fingerprint; else null. */
export async function checkIdentity(i) {
  if (!isObj(i) || !isObj(i.x) || !isObj(i.ed)) return null;
  if (!isPub(i.x.pub) || !isPub(i.ed.pub) || !isB64(i.x.priv, 48) || !isB64(i.ed.priv, 48)) return null;
  if (!ID_RE.test(i.id || '') || (await friendIdOf(i.x.pub, i.ed.pub)) !== i.id) return null;
  const createdAt = Number.isFinite(i.createdAt) && i.createdAt > 0 ? i.createdAt : 0;
  return { v: FRIENDS_V, id: i.id, x: { pub: i.x.pub, priv: i.x.priv }, ed: { pub: i.ed.pub, priv: i.ed.priv }, createdAt };
}
/**
 * Two of the person's devices made an identity before they synced: every
 * device keeps the EARLIEST (then the smaller id), so all of them agree.
 */
export function pickIdentity(list) {
  const ok = (list || []).filter(i => i && ID_RE.test(i.id || ''));
  ok.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return ok[0] || null;
}
/** The public half only (safe to show, store in the data folder, or send). */
export const publicIdentity = (i) => (i ? { id: i.id, x: i.x.pub, ed: i.ed.pub } : null);

/**
 * Secrets at rest that must follow the person but are not the identity
 * (drop tokens friends gave you, relay access tokens): sealed with a key only
 * a holder of the identity can derive, so the data folder carries ciphertext.
 */
async function atRestKey(identity) {
  return aesKey(await hkdf(unb64u(identity.ed.priv), utf8('opendash-friends-at-rest-v1'), `opendash-friends-at-rest|${identity.id}`));
}
export async function sealAtRest(identity, value, label) {
  return sealJson(await atRestKey(identity), value, utf8(`opendash-friends-at-rest-v1|${label}`));
}
export async function openAtRest(identity, enc, label) {
  try { return await openJson(await atRestKey(identity), enc, utf8(`opendash-friends-at-rest-v1|${label}`)); }
  catch { return null; }
}

// ─── Relay references ──────────────────────────────────────────────────────
// Where a person receives messages: their HOME relay (their own, or a friend's
// they joined through an invite) and their random mailbox id there. The relay
// sees only this mailbox id, never a name or a friend id.
const MBOX_RE = /^[A-Za-z0-9_-]{16,64}$/;
const TOKEN_RE = /^[A-Za-z0-9._~-]{16,512}$/;
export const RELAY_SCOPES = Object.freeze(['message', 'sync']);
/**
 * A relay origin: THE shared check (lib/relay/origin.mjs): a public https origin; a
 * local relay (http://127.0.0.1:<port>, http://localhost:<port>) only when the
 * process has OPENDASH_RELAY_ALLOW_LOCAL=1, never because of data or the page.
 */
export function cleanOrigin(o) { return relayOrigin(o); }
export const isToken = (t) => typeof t === 'string' && TOKEN_RE.test(t);
export const isMbox = (m) => typeof m === 'string' && MBOX_RE.test(m);
/** {origin, mbox} or null. */
export function cleanRelayRef(r) {
  if (!isObj(r)) return null;
  const origin = cleanOrigin(r.origin);
  return origin && isMbox(r.mbox) ? { origin, mbox: r.mbox } : null;
}

// ─── Cards ─────────────────────────────────────────────────────────────────
// {v, id, x, ed, name, relay: {origin, mbox} | null, at, sig}: who a person is
// and where they receive messages, signed with their Ed25519 key. Never carries
// a token: drop tokens travel only inside encrypted messages and invites.
const cardBytes = (c) => utf8(canon(['opendash-friend-card-v1', c.v, c.id, c.x, c.ed, c.name, c.relay || null, c.at]));
export async function makeCard(identity, { name = '', relay = null, now = Date.now } = {}) {
  const card = { v: FRIENDS_V, id: identity.id, x: identity.x.pub, ed: identity.ed.pub, name: cleanLine(name, 60), relay: cleanRelayRef(relay), at: now() };
  card.sig = await signBytes(identity.ed.priv, cardBytes(card));
  return card;
}
/** The card, cleaned, when its signature and id hold; else null. */
export async function verifyCard(c) {
  if (!isObj(c) || c.v !== FRIENDS_V || !ID_RE.test(c.id || '') || !isPub(c.x) || !isPub(c.ed)) return null;
  if (typeof c.name !== 'string' || c.name.length > 60 || !Number.isFinite(c.at) || typeof c.sig !== 'string') return null;
  const relay = c.relay == null ? null : cleanRelayRef(c.relay);
  if (c.relay != null && !relay) return null;
  if ((await friendIdOf(c.x, c.ed)) !== c.id) return null;
  const card = { v: FRIENDS_V, id: c.id, x: c.x, ed: c.ed, name: c.name, relay, at: c.at, sig: c.sig };
  if (!(await verifyBytes(c.ed, cardBytes(card), c.sig))) return null;
  return { ...card, name: cleanLine(c.name, 60) };
}

// ─── Friend codes ──────────────────────────────────────────────────────────
// 'ALEX-7K2QX9': up to 8 letters from the person's first name, a dash, 6 characters
// of Crockford base 32 (no I, L, O, U: 30 bits, so guessing a code is out of reach
// behind the relay's members-only, rate-limited lookups). Typing is forgiving: case,
// spaces and a missing dash do not matter, and in the last 6 characters O reads as
// 0, I and L as 1, U as V. A code resolves only between members of the same relay (the
// relay's directory: the key is a hash of the code, the card is sealed with a
// key derived from it), and a request through it still needs the owner's approval.
export const FRIEND_CODE_RE = /^[A-Z]{1,8}-[0-9A-HJKMNP-TV-Z]{6}$/;
/**
 * The name a card carries: the first name only (a card can be opened by anyone who
 * guesses a friend code, or who sees a forwarded invite). The full profile comes
 * after the friendship is confirmed ('profile').
 */
export function firstName(name) { return cleanLine(String(name || '').trim().split(/\s+/)[0] || '', 30); }
export function codePrefix(name) {
  const letters = String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  const f = first.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
  const p = (f.length >= 2 ? f : letters).slice(0, 8);
  return p.length >= 2 ? p : 'FRIEND';
}
export function newFriendCode(name) {
  const r = randomBytes(6);
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[r[i] & 31];
  return `${codePrefix(name)}-${s}`;
}
/** The canonical code, or null for anything that is not one. */
export function parseFriendCode(text) {
  const t = String(text == null ? '' : text).toUpperCase().replace(/[\s_.]+/g, '').slice(0, 40);
  const m = /^([A-Z]{1,8})-?([0-9A-Z]{6})$/.exec(t);
  if (!m) return null;
  const tail = m[2].replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  const code = `${m[1]}-${tail}`;
  return FRIEND_CODE_RE.test(code) ? code : null;
}
// ─── Live friend codes (2.20.1) ────────────────────────────────────────────
// "Show my friend code": 4 letters (lib/sync/e2e-crypto.mjs SHORT_ALPHABET), live for 10 minutes,
// single use. Same directory as the lasting codes, under its own label, so the two never mix.
// Four letters are only safe because the code is LIVE: the relay drops it after 10 minutes and
// after the first lookup that finds it, refuses a member's 4th miss in 10 minutes, and whoever
// finds it can only ASK: the person who showed the code still sees who it is, checks the
// pictures and presses Accept. (The relay itself could try all codes; it learns a first name.)
export async function liveCodeKey(code) { return hex(await sha256(utf8(`opendash-friend-live-v1\n${code}`))); }
async function liveCardKey(code) { return aesKey(await hkdf(utf8(code), utf8('opendash-friend-live-v1'), 'opendash-friend-live-card')); }
export async function sealCardForLive(code, card, drop) {
  return sealJson(await liveCardKey(code), { card, drop: isToken(drop) ? drop : null }, utf8(`opendash-friend-live-v1|${await liveCodeKey(code)}`));
}
export async function openCardForLive(code, blob) {
  const v = await openJson(await liveCardKey(code), blob, utf8(`opendash-friend-live-v1|${await liveCodeKey(code)}`)).catch(() => null);
  if (!isObj(v)) return null;
  const card = await verifyCard(v.card);
  return card ? { card, drop: isToken(v.drop) ? v.drop : null } : null;
}
/** The directory key of a code (64 hex): what the relay stores it under. */
export async function codeKey(code) { return hex(await sha256(utf8(`opendash-friend-code-v1\n${code}`))); }
async function codeCardKey(code) { return aesKey(await hkdf(utf8(code), utf8('opendash-friend-code-v1'), 'opendash-friend-code-card')); }
/** The card sealed for the directory: only someone who knows the code can open it. */
/**
 * The directory entry: {card, drop} sealed so only someone who knows the code
 * opens it. drop: a drop token for the owner's mailbox that requests through
 * this code use (revoked when the code is rotated; RELAY_PROTOCOL.md 7.2).
 */
export async function sealCardForCode(code, card, drop = null) {
  return sealJson(await codeCardKey(code), { card, drop: isToken(drop) ? drop : null }, utf8(`opendash-friend-dir-v1|${await codeKey(code)}`));
}
/** {card, drop} or null. */
export async function openCardForCode(code, blob) {
  const v = await openJson(await codeCardKey(code), blob, utf8(`opendash-friend-dir-v1|${await codeKey(code)}`)).catch(() => null);
  if (!isObj(v)) return null;
  const card = await verifyCard(v.card);
  return card ? { card, drop: isToken(v.drop) ? v.drop : null } : null;
}

// ─── Invites ───────────────────────────────────────────────────────────────
// 'ODF1.' + base64url(JSON {v, t:'invite', id, card, s, exp, drop?, relay?})
//   id     the invite's id (16 hex): single use, kept by the inviter until used or expired
//   s      a one-time secret (16 bytes): the request proves it holds it (inviteProof)
//   drop   a drop token for the inviter's mailbox, so the request can be delivered
//   relay  {origin, token, scopes}: a one-time relay access token (only a relay OWNER
//          makes these): redeeming it makes the friend a member of that relay
// The link form is the same text after '#' on the relay's /i page (agent 'relay').
// A leaked invite alone never makes a friendship: the inviter still approves
// the request after comparing the confirmation code.
export const INVITE_PREFIX = 'ODF1.';
export const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;
export const MAX_INVITE_TEXT = 4000;
export async function makeInvite({ card, drop = null, relay = null, ttlMs = INVITE_TTL_MS, now = Date.now }) {
  const id = hex(randomBytes(8));
  const s = b64u(randomBytes(16));
  const exp = now() + Math.max(60 * 1000, Math.min(30 * 24 * 3600 * 1000, ttlMs));
  const inv = { v: FRIENDS_V, t: 'invite', id, card, s, exp };
  if (isToken(drop)) inv.drop = drop;
  if (relay && isToken(relay.token) && cleanOrigin(relay.origin)) {
    inv.relay = { origin: cleanOrigin(relay.origin), token: relay.token, scopes: (relay.scopes || ['message']).filter(x => RELAY_SCOPES.includes(x)) };
  }
  const text = INVITE_PREFIX + b64u(utf8(JSON.stringify(inv)));
  return { id, s, exp, text, invite: inv };
}
/** {invite, card} or {error: 'format'|'expired'|'card'}. Accepts the text anywhere in what was pasted (a link too). */
export async function parseInvite(text, { now = Date.now } = {}) {
  const t = String(text == null ? '' : text).slice(0, MAX_INVITE_TEXT * 2);
  const m = /ODF1\.([A-Za-z0-9_-]{40,4000})/.exec(t);
  if (!m) return { error: 'format' };
  const raw = unb64u(m[1]);
  const json = raw ? fromUtf8(raw) : null;
  let inv = null;
  try { inv = json ? JSON.parse(json) : null; } catch { inv = null; }
  return checkInvite(inv, { now });
}
/** An invite object (the long text decoded, or a short link's sealed card opened): {invite, card} or {error}. Untrusted: checked in full. */
export async function checkInvite(inv, { now = Date.now } = {}) {
  if (!isObj(inv) || inv.v !== FRIENDS_V || inv.t !== 'invite' || !ID_RE.test(inv.id || '') || !isB64(inv.s, 16) || !Number.isFinite(inv.exp)) return { error: 'format' };
  if (inv.exp < now()) return { error: 'expired' };
  const card = await verifyCard(inv.card);
  if (!card) return { error: 'card' };
  const out = { v: FRIENDS_V, t: 'invite', id: inv.id, s: inv.s, exp: inv.exp, card };
  if (isToken(inv.drop)) out.drop = inv.drop;
  if (isObj(inv.relay)) {
    const origin = cleanOrigin(inv.relay.origin);
    if (origin && isToken(inv.relay.token)) out.relay = { origin, token: inv.relay.token, scopes: (Array.isArray(inv.relay.scopes) ? inv.relay.scopes : []).filter(x => RELAY_SCOPES.includes(x)) };
  }
  return { invite: out, card };
}
// ─── Short invite links ────────────────────────────────────────────────────
// '<relay origin>/i#ODF1.<token>.<check>' (about 100 characters: a QR code fits). token: 16
// random bytes (base64url, 22 characters); check: 6 characters of SHA-256 over the origin and the
// token, so a link that was cut short or mistyped says so before anything is asked. The invite
// itself (the long form's object) is kept SEALED on the inviter's home relay (RELAY_PROTOCOL.md
// 7.8) under key = SHA-256("opendash-friend-short-v1\n" + token), with an AES-256-GCM key derived
// from the token (HKDF): the relay holds a hash and ciphertext, never the token, so it cannot read
// the invite. Redeeming fetches it (anyone with the link may) and opens it; the inviter deletes it
// when the invite is used, cancelled or expires. The long 'ODF1.<base64url>' form stays accepted.
export const SHORT_TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;
export const newShortToken = () => b64u(randomBytes(16));
export async function shortInviteKey(token) { return hex(await sha256(utf8(`opendash-friend-short-v1\n${token}`))); }
export async function shortCheck(origin, token) { return b64u(await sha256(utf8(`opendash-friend-short-check-v1\n${origin}\n${token}`))).slice(0, 6); }
async function shortSealKey(token) { return aesKey(await hkdf(unb64u(token), utf8('opendash-friend-short-v1'), 'opendash-friend-short-key')); }
const shortAad = async (token, origin) => utf8(`opendash-friend-short-v1|${await shortInviteKey(token)}|${origin}`);
export async function shortInviteLink(origin, token) { return `${origin}/i#${INVITE_PREFIX}${token}.${await shortCheck(origin, token)}`; }
export async function sealShortInvite(token, origin, invite) { return sealJson(await shortSealKey(token), invite, await shortAad(token, origin)); }
/** The invite object a short link's relay copy holds, or null (wrong token, tampered, not one). */
export async function openShortInvite(token, origin, blob) {
  if (!SHORT_TOKEN_RE.test(token || '') || !isObj(blob) || typeof blob.iv !== 'string' || typeof blob.ct !== 'string' || blob.iv.length > 32 || blob.ct.length > 8000) return null;
  try { return await openJson(await shortSealKey(token), { iv: blob.iv, ct: blob.ct }, await shortAad(token, origin)); } catch { return null; }
}
/**
 * A short invite link anywhere in what was pasted -> {origin, token}, or {error: 'needs-link'
 * (only the ODF1 part, no address) | 'origin' (an address that can't be used) | 'check' (cut
 * short or mistyped)}, or null when it is not a short link (try the long form).
 */
export async function parseShortInvite(text) {
  const t = String(text == null ? '' : text).slice(0, 2000);
  const m = /ODF1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{6})(?![A-Za-z0-9_-])/.exec(t);
  if (!m) return null;
  const u = /(https?:\/\/[^\s/#?]+)\/i#$/.exec(t.slice(Math.max(0, m.index - 300), m.index));
  if (!u) return { error: 'needs-link' };
  const origin = cleanOrigin(u[1]);
  if (!origin) return { error: 'origin' };
  if ((await shortCheck(origin, m[1])) !== m[2]) return { error: 'check' };
  return { origin, token: m[1] };
}
async function hmac(keyBytes, text) {
  const k = await subtle().importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await subtle().sign('HMAC', k, utf8(text)));
}
/** Proof that a request comes from someone holding invite `id`'s secret. */
export async function inviteProof(s, inviteId, requesterId) { return b64u(await hmac(unb64u(s), `opendash-friend-invite-v1\n${inviteId}\n${requesterId}`)); }
export async function checkInviteProof(s, inviteId, requesterId, proof) {
  if (typeof proof !== 'string' || !isB64(s, 16)) return false;
  const want = await inviteProof(s, inviteId, requesterId);
  if (want.length !== proof.length) return false;
  let d = 0;
  for (let i = 0; i < want.length; i++) d |= want.charCodeAt(i) ^ proof.charCodeAt(i);
  return d === 0;
}

// ─── The confirmation code (short authentication string) ──────────────────
// The requester commits to its nonce before it sees the other side's, so
// nobody in the middle (the relay included) can pick keys that give both sides
// the same code: it would have a one-in-a-million chance.
//   R -> A  friend:request {card_R, commit = H(nR, card_R)}     (sealed to A's key)
//   A -> R  friend:hello   {nA}                                  (automatic, no secrets)
//   R -> A  friend:reveal  {nR}       both now show code(card_R, card_A, nR, nA)
//   A       approves (or declines) after comparing: friend:approve {drop}
export async function commitOf(nonce, card) {
  return b64u(await sha256(utf8(JSON.stringify(['opendash-friend-commit-v1', nonce, card.id, card.x, card.ed]))));
}
/** The 6 digits both screens show. r: the requester's card, a: the approver's. */
export async function confirmCode({ r, a, nr, na }) {
  const d = await sha256(utf8(JSON.stringify(['opendash-friend-sas-v1', r.id, r.x, r.ed, a.id, a.x, a.ed, nr, na])));
  let n = 0;
  for (let i = 0; i < 6; i++) n = n * 256 + d[i];
  return String(n % 1000000).padStart(6, '0');
}
export const formatConfirmCode = (c) => (typeof c === 'string' && /^\d{6}$/.test(c) ? `${c.slice(0, 3)} ${c.slice(3)}` : '');

// ─── Identity rotation (FRIENDS.md section 15) ─────────────────────────────
// friend:rekey carries the NEW card and two signatures over the same text: one by the OLD
// identity (the friend checks it against the key they hold) and one by the NEW one.
const rekeyBytes = (oldId, card, nonce) => utf8(canon(['opendash-friend-rekey-v1', oldId, card.id, card.x, card.ed, card.at, nonce]));
export async function signRekey({ from, to, card, nonce }) {
  const b = rekeyBytes(from.id, card, nonce);
  return { sigOld: await signBytes(from.ed.priv, b), sigNew: await signBytes(to.ed.priv, b) };
}
/** True when sigOld is by oldEd and sigNew by the card's own key, over the same rekey. Never throws. */
export async function verifyRekey({ oldId, oldEd, card, nonce, sigOld, sigNew }) {
  if (!isObj(card) || typeof nonce !== 'string' || !nonce || !ID_RE.test(oldId || '')) return false;
  const b = rekeyBytes(oldId, card, nonce);
  return (await verifyBytes(oldEd, b, sigOld)) && (await verifyBytes(card.ed, b, sigNew));
}

// ─── Messages ──────────────────────────────────────────────────────────────
// Two envelope shapes travel on every transport (relay mailbox, direct link).
// Only these fields are in the clear: no names, no friend ids, no kinds, no times.
//   pair     {v:1, t:'pm', id, p, iv, ct}      p: the pair's tag (16 hex, from the pair key)
//   request  {v:1, t:'rq', id, eph, iv, ct}    sealed to the recipient's X25519 key with a
//                                              one-time key (the sender is not yet a friend)
// Inside (JSON): {k: kind, b: body, from, to, at, lc, g?: group id, n?: [member ids]}
// pair key = HKDF(X25519(mine, theirs), salt = both raw public keys in sorted order,
//                 "opendash-friends-pair-v1"); AAD binds the shape, id and tag.
const pairCache = new Map();
export async function pairSecret(identity, theirX) {
  const k = `${identity.id}|${theirX}`;
  return memo(pairCache, k, async () => {
    const a = unb64u(identity.x.pub), b = unb64u(theirX);
    if (!b || b.length !== 32) throw new Error('bad public key');
    const salt = identity.x.pub < theirX ? concat(a, b) : concat(b, a);
    const shared = await dh(identity.x.priv, theirX);
    const key = await aesKey(await hkdf(shared, salt, 'opendash-friends-pair-v1'));
    const tag = hex(await hkdf(shared, salt, 'opendash-friends-pair-tag-v1', 8));
    return { key, tag };
  });
}
const pmAad = (id, p) => utf8(`opendash-friend-pm-v1\n${id}\n${p}`);
const rqAad = (id, eph) => utf8(`opendash-friend-rq-v1\n${id}\n${eph}`);
/** Envelope shape check (before any key work): 'pm' | 'rq' | null. */
export function envelopeKind(env) {
  if (!isObj(env) || env.v !== FRIENDS_V || !MSG_ID_RE.test(env.id || '')) return null;
  if (typeof env.iv !== 'string' || typeof env.ct !== 'string' || env.iv.length > 32 || env.ct.length > MAX_ENVELOPE) return null;
  if (env.t === 'pm' && /^[0-9a-f]{16}$/.test(env.p || '')) return 'pm';
  if (env.t === 'rq' && isPub(env.eph)) return 'rq';
  return null;
}
/** Only the envelope's own fields (nothing else a transport added travels on). */
export function cleanEnvelope(env) {
  const k = envelopeKind(env);
  if (!k) return null;
  return k === 'pm' ? { v: FRIENDS_V, t: 'pm', id: env.id, p: env.p, iv: env.iv, ct: env.ct } : { v: FRIENDS_V, t: 'rq', id: env.id, eph: env.eph, iv: env.iv, ct: env.ct };
}
function innerOk(m) {
  return isObj(m) && typeof m.k === 'string' && kindOk(m.k) && ID_RE.test(m.from || '') && ID_RE.test(m.to || '')
    && Number.isFinite(m.at) && Number.isFinite(m.lc) && (m.g == null || SAFE_ID_RE.test(m.g))
    && (m.n == null || (Array.isArray(m.n) && m.n.length <= 64 && m.n.every(x => ID_RE.test(x))));
}
/** A pair message to a friend ({id, x}). */
export async function sealPair({ identity, friend, kind, body = null, id = newMsgId(), at = Date.now(), lc = at, g = null, n = null }) {
  const { key, tag } = await pairSecret(identity, friend.x);
  const inner = { k: kind, b: body, from: identity.id, to: friend.id, at, lc };
  if (g) inner.g = g;
  if (n) inner.n = n;
  const plain = utf8(JSON.stringify(inner));
  if (plain.length > MAX_BODY + 1024) throw Object.assign(new Error('message too big'), { code: 'TOO_BIG' });
  const enc = await sealJson(key, inner, pmAad(id, tag));
  return { v: FRIENDS_V, t: 'pm', id, p: tag, iv: enc.iv, ct: enc.ct };
}
/** {id, ...inner} or null. byTag(tag) -> the friend {id, x} that pair tag belongs to, or null (unknown: dropped). */
export async function openPair({ identity, env, byTag }) {
  if (envelopeKind(env) !== 'pm') return null;
  const friend = byTag(env.p);
  if (!friend) return null;
  const { key, tag } = await pairSecret(identity, friend.x);
  if (tag !== env.p) return null;
  const m = await openJson(key, { iv: env.iv, ct: env.ct }, pmAad(env.id, env.p));
  if (!innerOk(m) || m.from !== friend.id || m.to !== identity.id) return null;
  return { id: env.id, k: m.k, b: m.b === undefined ? null : m.b, from: m.from, to: m.to, at: m.at, lc: m.lc, g: m.g || null, n: m.n || null };
}
/** A request to someone who is not a friend yet (their card): only they can open it. */
export async function sealRequest({ identity, to, body, id = newMsgId(), at = Date.now() }) {
  const e = await newKeyPair();
  const kek = await aesKey(await hkdf(await dh(e.priv, to.x), concat(unb64u(e.pub), unb64u(to.x)), 'opendash-friends-request-v1'));
  const enc = await sealJson(kek, { k: 'friend:request', b: body, from: identity.id, to: to.id, at, lc: at }, rqAad(id, e.pub));
  return { v: FRIENDS_V, t: 'rq', id, eph: e.pub, iv: enc.iv, ct: enc.ct };
}
export async function openRequest({ identity, env }) {
  if (envelopeKind(env) !== 'rq') return null;
  let kek;
  try { kek = await aesKey(await hkdf(await dh(identity.x.priv, env.eph), concat(unb64u(env.eph), unb64u(identity.x.pub)), 'opendash-friends-request-v1')); }
  catch { return null; }
  const m = await openJson(kek, { iv: env.iv, ct: env.ct }, rqAad(env.id, env.eph));
  if (!innerOk(m) || m.k !== 'friend:request' || m.to !== identity.id) return null;
  return { id: env.id, k: m.k, b: m.b, from: m.from, to: m.to, at: m.at, lc: m.lc, g: null, n: null };
}
/** Per party for groups: one sealed copy per member, all with the same message id. */
export async function sealForGroup({ identity, members, kind, body, g, at = Date.now(), lc = at, id = newMsgId() }) {
  const ids = members.map(m => m.id).filter(x => x !== identity.id).slice(0, 64);
  const out = [];
  for (const m of members) {
    if (m.id === identity.id) continue;
    out.push({ to: m.id, env: await sealPair({ identity, friend: m, kind, body, id, at, lc, g, n: ids }) });
  }
  return out;
}

// ─── Ordering and dedupe ───────────────────────────────────────────────────
/**
 * A hybrid logical clock in milliseconds: tick() is never below the wall clock
 * nor below anything seen, so sorting by lc keeps cause before effect across
 * friends whose clocks differ, and stays close to real time.
 */
export function createClock(start = 0, now = Date.now) {
  let last = Number(start) || 0;
  return {
    tick() { last = Math.max(last + 1, now()); return last; },
    see(lc) { if (Number.isFinite(lc) && lc > last && lc < now() + 24 * 3600 * 1000) last = lc; },
    get value() { return last; },
  };
}
/** Messages in order: hybrid clock, then the sender's time, then id. */
export const orderMsgs = (list) => list.slice().sort((a, b) => (a.lc - b.lc) || (a.at - b.at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
/** Ids seen recently (a relay may deliver twice until acked; a message may come by two roads). */
export function createSeen({ ttlMs = 45 * 24 * 3600 * 1000, max = 20000, now = Date.now, from = null } = {}) {
  const m = new Map(isObj(from) ? Object.entries(from).filter(([k, v]) => MSG_ID_RE.test(k) && Number.isFinite(v)) : []);
  return {
    has: (id) => m.has(id),
    add(id, at = now()) { m.set(id, at); if (m.size > max) { const cut = [...m.entries()].sort((a, b) => a[1] - b[1]).slice(0, m.size - max); for (const [k] of cut) m.delete(k); } },
    prune() { const t = now() - ttlMs; for (const [k, v] of m) if (v < t) m.delete(k); },
    toJSON: () => Object.fromEntries(m),
    get size() { return m.size; },
  };
}

// ─── Schemas: everything from a friend is untrusted input ─────────────────
// A schema says exactly which fields a body may have; unknown fields are
// dropped, anything of the wrong type or over its cap makes the whole message
// invalid (dropped and counted, never shown). No schema has a URL field: a
// friend can never make this computer load something (no tracking pixels, no
// requests from the server).
//   S.str(max)        one line of text      S.text(max)       text with line breaks
//   S.int(min, max)   an integer            S.num(min, max)   a finite number
//   S.bool()          true / false          S.id()            /^[A-Za-z0-9_-]{1,64}$/
//   S.fid()           a friend id           S.day()           'YYYY-MM-DD'
//   S.ms()            a time in ms          S.oneOf([...])    one of these strings
//   S.color()         '#rgb' / '#rrggbb'    S.emoji()         up to 8 code points, no ASCII
//   S.list(item, n)   at most n items       S.obj(fields)     a record of these fields
//   S.map(val, n)     {id: val}, n keys     S.opt(schema)     may be missing or null
//   S.tuple([a, b..]) a short array, one schema per place (up to 4 more places from a newer app are dropped)
const NOPE = Symbol('invalid');
const mk = (f, opt = false) => Object.freeze({ f, opt });
export const S = Object.freeze({
  str: (max = 120) => mk((v) => (typeof v === 'string' && v.length <= max * 2 ? cleanLine(v, max) : NOPE)),
  text: (max = 500) => mk((v) => (typeof v === 'string' && v.length <= max * 2 ? cleanText(v, max) : NOPE)),
  int: (min = 0, max = 1e9) => mk((v) => (Number.isInteger(v) && v >= min && v <= max ? v : NOPE)),
  num: (min = -1e12, max = 1e12) => mk((v) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : NOPE)),
  bool: () => mk((v) => (typeof v === 'boolean' ? v : NOPE)),
  id: () => mk((v) => (typeof v === 'string' && SAFE_ID_RE.test(v) ? v : NOPE)),
  fid: () => mk((v) => (typeof v === 'string' && ID_RE.test(v) ? v : NOPE)),
  day: () => mk((v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : NOPE)),
  ms: () => mk((v) => (Number.isInteger(v) && v > 0 && v < 1e14 ? v : NOPE)),
  oneOf: (list) => mk((v) => (typeof v === 'string' && list.includes(v) ? v : NOPE)),
  color: () => mk((v) => (typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v.toLowerCase() : NOPE)),
  emoji: () => mk((v) => (typeof v === 'string' && v.length <= 32 && [...v].length <= 8 && !/[\u0000-\u007f]/.test(v) ? v : NOPE)),
  list: (item, n = 20) => mk((v) => {
    if (!Array.isArray(v) || v.length > n) return NOPE;
    const out = [];
    for (const x of v) { const c = run(item, x); if (c === NOPE) return NOPE; out.push(c); }
    return out;
  }),
  obj: (fields) => mk((v) => {
    if (!isObj(v) || Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) return NOPE;
    const out = {};
    for (const [k, sch] of Object.entries(fields)) {
      if (FORBIDDEN_KEYS.has(k)) continue;
      const has = own(v, k) && v[k] !== undefined && v[k] !== null;
      if (!has) { if (sch.opt) continue; return NOPE; }
      const c = run(sch, v[k]);
      if (c === NOPE) return NOPE;
      out[k] = c;
    }
    return out;
  }),
  map: (val, n = 50) => mk((v) => {
    if (!isObj(v)) return NOPE;
    const keys = Object.keys(v);
    if (keys.length > n) return NOPE;
    const out = Object.create(null);
    for (const k of keys) {
      if (FORBIDDEN_KEYS.has(k) || !SAFE_ID_RE.test(k)) return NOPE;
      const c = run(val, v[k]);
      if (c === NOPE) return NOPE;
      out[k] = c;
    }
    return { ...out };
  }),
  opt: (sch) => mk(sch.f, true),
  // ── garden-social ── (2.18: a garden snapshot's rows, [plantId, x, y, stage, variant, flags])
  tuple: (items) => mk((v) => {
    if (!Array.isArray(v) || v.length < items.length || v.length > items.length + 4) return NOPE;
    const out = [];
    for (let i = 0; i < items.length; i++) { const c = run(items[i], v[i]); if (c === NOPE) return NOPE; out.push(c); }
    return out;
  }),
  // ── end garden-social ──
});
function run(sch, v) { return sch && typeof sch.f === 'function' ? sch.f(v) : NOPE; }
/** The cleaned value, or undefined when it does not fit (the caller drops the message). */
export function validate(schema, value) {
  if (value === undefined) value = null;
  if (value === null) return schema.opt ? null : undefined;
  const c = run(schema, value);
  return c === NOPE ? undefined : c;
}

// ─── Kinds ─────────────────────────────────────────────────────────────────
// Every kind has a schema. Core kinds are the engine's own; the documented
// kinds are for agents 'profile', 'perms' and 'together', who may refine them
// (defineKind again with a stricter or richer schema before the engine starts)
// or add kinds of their own. A kind no one defined is dropped on arrival.
//   latest  only the newest value per friend is kept (profile, share:<scope>)
//   event   kept in the feed (cheer, quest, focus, challenge, space:<id>)
//   live    never stored, queued or retried: sent only to friends who are online
//           right now (a direct link, else their relay's live push) and dropped
//           when they are not; rate-limited and size-capped per kind (LIVE_*).
//           The engine's own (presence, live:addr) and other agents' (Together's
//           cursors and typing, 'together:live')
//   handler validated and handed to handlers and open pages, never stored by the engine:
//           the kind's owner keeps what it needs (agent 'perms' for share:<scope>)
const KINDS = new Map();
const PATTERNS = [];   // [{prefix, def}] for 'share:' and 'space:' families
const KIND_RE = /^(friend:[a-z]{2,16}|[a-z][a-z0-9-]{1,23}(:[A-Za-z0-9_-]{1,64})?)$/;
export function kindOk(kind) { return typeof kind === 'string' && kind.length <= 90 && KIND_RE.test(kind); }
/** Live kinds: the largest body, how long one stays fresh, and the default rate per friend and kind (sending; receivers allow twice). */
export const LIVE_MAX = 4096;
export const LIVE_TTL_MS = 60 * 1000;
export const LIVE_RATE = Object.freeze({ sec: 10, min: 300 });
const clampNum = (v, lo, hi, d) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d);
/**
 * defineKind(kind, schema, {store: 'latest'|'event'|'live'|'handler', scope, passive, xp, max, rate, ttl})
 * kind: an exact kind ('cheer') or a family ending in ':*' ('share:*', 'space:*').
 *   scope    the permission scope agent 'perms' checks (default: the kind's first part)
 *   passive  true: does not count toward friendship XP or streaks
 *   xp       friendship XP one such event is worth (default 3; capped per day)
 *   max      the largest body in bytes (default 8 KB, at most MAX_BODY; live kinds: default 1 KB, at most LIVE_MAX)
 *   rate     live kinds only: {sec, min} messages per friend (default LIVE_RATE; at most 50 and 1200)
 *   ttl      live kinds only: older than this on arrival is dropped (default LIVE_TTL_MS, 5 s to 5 min)
 *   local    true: made on this side only (a feed line); never accepted from a friend
 */
export function defineKind(kind, schema, opts = {}) {
  if (typeof kind !== 'string' || !schema || typeof schema.f !== 'function') throw new Error('defineKind needs a kind and a schema');
  const store = ['latest', 'event', 'live', 'handler'].includes(opts.store) ? opts.store : 'event';
  const live = store === 'live';
  const r = isObj(opts.rate) ? opts.rate : {};
  const def = Object.freeze({
    kind, schema, store,
    scope: typeof opts.scope === 'string' ? opts.scope : null,
    passive: !!opts.passive, xp: Number.isFinite(opts.xp) ? Math.max(0, Math.min(50, opts.xp)) : 3,
    max: Math.min(live ? LIVE_MAX : MAX_BODY, Number(opts.max) || (live ? 1024 : 8 * 1024)), core: !!opts.core, local: !!opts.local,
    rate: live ? Object.freeze({ sec: clampNum(r.sec, 1, 50, LIVE_RATE.sec), min: clampNum(r.min, 1, 1200, LIVE_RATE.min) }) : null,
    ttl: live ? clampNum(opts.ttl, 5000, 5 * 60000, LIVE_TTL_MS) : 0,
  });
  if (kind.endsWith(':*')) {
    const prefix = kind.slice(0, -1);
    const i = PATTERNS.findIndex(p => p.prefix === prefix);
    if (i >= 0) PATTERNS[i] = { prefix, def }; else PATTERNS.push({ prefix, def });
  } else {
    if (!kindOk(kind)) throw new Error(`bad kind: ${kind}`);
    KINDS.set(kind, def);
  }
  return def;
}
/** The definition of a kind (exact first, then its family), or null. */
export function kindDef(kind) {
  if (!kindOk(kind)) return null;
  if (KINDS.has(kind)) return KINDS.get(kind);
  const p = PATTERNS.find(x => kind.startsWith(x.prefix));
  return p ? p.def : null;
}
/** The permission scope of a kind: 'share:game' -> 'game', 'space:abc' -> 'space', 'cheer' -> 'cheer'. */
export function scopeOf(kind) {
  const d = kindDef(kind);
  if (d && d.scope) return d.scope;
  const s = String(kind || '');
  if (s.startsWith('share:')) return s.slice(6);
  return s.split(':')[0];
}
/** Does a value carry a __proto__ / constructor / prototype key anywhere (or nest absurdly deep)? */
function forbiddenIn(v, depth = 0) {
  if (!v || typeof v !== 'object') return false;
  if (depth > 32) return true;
  if (Array.isArray(v)) return v.some(x => forbiddenIn(x, depth + 1));
  for (const k of Object.keys(v)) if (FORBIDDEN_KEYS.has(k) || forbiddenIn(v[k], depth + 1)) return true;
  return false;
}
/**
 * A body checked against its kind's schema: the cleaned body, or undefined (drop the message).
 * A body that carries a __proto__, constructor or prototype key anywhere is dropped WHOLE: no
 * OpenDash ever sends one, so it is hostile input, never "the rest of it" (FRIENDS.md rule 3).
 */
export function checkBody(kind, body) {
  const d = kindDef(kind);
  if (!d) return undefined;
  let size = 0;
  try { size = JSON.stringify(body === undefined ? null : body).length; } catch { return undefined; }
  if (size > d.max) return undefined;
  if (forbiddenIn(body)) return undefined;
  return validate(d.schema, body);
}

// Core kinds (the engine's handshake and housekeeping).
const CARD = S.obj({ v: S.int(1, 1), id: S.fid(), x: S.str(64), ed: S.str(64), name: S.str(60), relay: S.opt(S.obj({ origin: S.str(200), mbox: S.str(64) })), at: S.ms(), sig: S.str(100) });
const DROP = S.obj({ origin: S.str(200), mbox: S.str(64), drop: S.str(512) });
// lc (2.20.1): the live code's directory key, when the request came through a live friend code.
// look (2.20.1, only with lc, so never to an older OpenDash): the asker's avatar as JSON, shown beside Accept
// (checked on arrival against the 'profile' kind, which lib/profile-avatar.mjs refines).
defineKind('friend:request', S.obj({ card: CARD, commit: S.str(64), how: S.oneOf(['code', 'invite']), inv: S.opt(S.id()), proof: S.opt(S.str(64)), drop: S.opt(DROP), lc: S.opt(S.str(64)), look: S.opt(S.str(1500)) }), { store: 'live', core: true, max: 4096 });
defineKind('friend:hello', S.obj({ nonce: S.str(32) }), { store: 'live', core: true, max: 512 });
defineKind('friend:reveal', S.obj({ nonce: S.str(32) }), { store: 'live', core: true, max: 512 });
defineKind('friend:approve', S.obj({ drop: S.opt(DROP) }), { store: 'live', core: true, max: 2048 });
defineKind('friend:decline', S.opt(S.obj({})), { store: 'live', core: true, max: 64 });
defineKind('friend:mismatch', S.opt(S.obj({})), { store: 'live', core: true, max: 64 });
defineKind('friend:remove', S.obj({ forget: S.bool() }), { store: 'live', core: true, max: 128 });
defineKind('friend:relay', S.obj({ drop: DROP }), { store: 'live', core: true, max: 2048 });
// Take back a latest or handler kind (sharing turned off): the receiver deletes its copy and tells handlers (revoked: true).
defineKind('friend:revoke', S.obj({ k: S.str(90) }), { store: 'live', core: true, max: 256 });
// Identity rotation (FRIENDS.md section 15): the new card, signed by BOTH keys, under the OLD pair key;
// the friend's answer under the new one; and "my new keys are in, take my old key off your relay".
defineKind('friend:rekey', S.obj({ card: CARD, drop: S.opt(DROP), nonce: S.str(32), sigOld: S.str(100), sigNew: S.str(100), relayAsk: S.opt(S.bool()) }), { store: 'live', core: true, max: 4096 });
defineKind('friend:rekeyed', S.opt(S.obj({})), { store: 'live', core: true, max: 64 });
defineKind('friend:relaymoved', S.obj({ old: S.str(64) }), { store: 'live', core: true, max: 256 });
defineKind('presence', S.obj({ s: S.oneOf(['online', 'focusing', 'travelling', 'away', 'offline']), ttl: S.opt(S.int(60000, 6 * 3600000)) }), { store: 'live', core: true, scope: 'presence', passive: true, max: 128 });
defineKind('live:addr', S.obj({ eps: S.list(S.obj({ k: S.oneOf(['lan', 'lan6', 'wan', 'v6']), a: S.str(64), p: S.int(1, 65535), m: S.opt(S.int(0, 128)) }), 8), port: S.int(1, 65535) }), { store: 'live', core: true, scope: 'direct', passive: true, max: 2048 });
// Local feed lines (never accepted from a friend): becoming friends, a note posted with friendsFeedPost.
defineKind('friended', S.opt(S.obj({})), { store: 'event', core: true, passive: true, local: true, max: 64 });
// A friend renewed their keys (twice: true when two different renewals came, and the friendship is paused).
defineKind('renewed', S.opt(S.obj({ twice: S.opt(S.bool()) })), { store: 'event', core: true, passive: true, local: true, max: 64 });
defineKind('note', S.obj({ text: S.str(200), icon: S.opt(S.id()) }), { store: 'event', passive: true, local: true, max: 1024 });
// Made here from a friend's validated share:game when it moves: a level-up, a streak milestone (lines in the hangout feed).
defineKind('game:level', S.obj({ level: S.int(1, 10000), title: S.opt(S.str(40)) }), { store: 'event', passive: true, local: true, max: 256 });
defineKind('game:streak', S.obj({ n: S.int(1, 100000) }), { store: 'event', passive: true, local: true, max: 128 });
// The documented kinds (agents 'profile', 'perms', 'together' may refine them).
defineKind('profile', S.obj({ name: S.str(60), bio: S.opt(S.text(280)), emoji: S.opt(S.emoji()), color: S.opt(S.color()), pronouns: S.opt(S.str(30)), city: S.opt(S.str(60)) }), { store: 'latest', scope: 'profile', passive: true, max: 2048 });
defineKind('share:game', S.obj({ level: S.int(1, 10000), title: S.opt(S.str(40)), xp: S.opt(S.int(0, 1e9)), xpWeek: S.opt(S.int(0, 1e8)), streak: S.opt(S.int(0, 100000)), best: S.opt(S.int(0, 100000)), quests: S.opt(S.int(0, 1e6)), focusMin: S.opt(S.int(0, 1e8)), at: S.opt(S.ms()) }), { store: 'latest', scope: 'game', passive: true, max: 1024 });
defineKind('share:*', S.obj({ at: S.opt(S.ms()), text: S.opt(S.str(200)) }), { store: 'latest', passive: true, max: 2048 });
defineKind('cheer', S.obj({ emoji: S.opt(S.emoji()), text: S.opt(S.str(140)), re: S.opt(S.id()) }), { store: 'event', scope: 'cheer', xp: 4, max: 1024 });
defineKind('quest', S.obj({ id: S.id(), state: S.oneOf(['offer', 'accept', 'progress', 'done', 'drop']), title: S.opt(S.str(120)), n: S.opt(S.int(0, 1e6)), of: S.opt(S.int(0, 1e6)), due: S.opt(S.day()) }), { store: 'event', scope: 'quest', xp: 8, max: 2048 });
defineKind('focus', S.obj({ id: S.id(), state: S.oneOf(['invite', 'join', 'start', 'done', 'leave']), min: S.opt(S.int(1, 600)), title: S.opt(S.str(120)) }), { store: 'event', scope: 'focus', xp: 6, max: 1024 });
defineKind('challenge', S.obj({ id: S.id(), state: S.oneOf(['offer', 'accept', 'progress', 'win', 'lose', 'draw', 'drop']), title: S.opt(S.str(120)), score: S.opt(S.int(0, 1e9)), of: S.opt(S.int(0, 1e9)), until: S.opt(S.day()) }), { store: 'event', scope: 'challenge', xp: 8, max: 2048 });
defineKind('space:*', S.obj({ op: S.id(), item: S.opt(S.id()), title: S.opt(S.str(200)), done: S.opt(S.bool()), at: S.opt(S.ms()) }), { store: 'event', scope: 'space', xp: 2, max: 4096 });

// ─── Friend records ────────────────────────────────────────────────────────
// One per person, in <data>/friends/friends.json (synced between the person's
// own devices, end-to-end encrypted). Statuses:
//   requested   I asked; waiting for their app to answer
//   incoming    they asked; the confirmation code is being worked out or waiting for my approval
//   friend      approved (by the approver) / accepted (seen by the requester; added by code, only once
//               the requester also said the check codes match)
//   removing    removed or blocked a moment ago: Undo still works (then finalised)
//   declined    they declined or the codes did not match (kept a while, then forgotten)
//   blocked     never shown again; anything from them is dropped
//   frozen      two different key renewals came for them (FRIENDS.md section 15): nothing is
//               sent or accepted until they are removed and added again with a fresh invite
export const STATUSES = Object.freeze(['requested', 'incoming', 'friend', 'removing', 'declined', 'blocked', 'frozen']);
export function normFriend(r) {
  if (!isObj(r) || !ID_RE.test(r.id || '') || !isPub(r.x) || !isPub(r.ed) || !STATUSES.includes(r.status)) return null;
  const n = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
  const out = {
    id: r.id, x: r.x, ed: r.ed, name: cleanLine(r.name, 60), status: r.status,
    role: r.role === 'a' ? 'a' : 'r', how: r.how === 'invite' ? 'invite' : 'code',
    relay: cleanRelayRef(r.relay),
    addedAt: n(r.addedAt), friendsAt: n(r.friendsAt), updatedAt: n(r.updatedAt),
  };
  if (isObj(r.dropSealed)) out.dropSealed = { iv: String(r.dropSealed.iv || ''), ct: String(r.dropSealed.ct || '') };
  const sealedOf = (x) => (isObj(x) ? { iv: String(x.iv || ''), ct: String(x.ct || '') } : null);
  // myDrop: the drop token they hold into my mailbox (at: minted; prev: older ones a renewal left running, revoked with it)
  if (isObj(r.myDrop)) {
    out.myDrop = { origin: cleanOrigin(r.myDrop.origin), sealed: sealedOf(r.myDrop.sealed) };
    if (n(r.myDrop.at)) out.myDrop.at = n(r.myDrop.at);
    if (Array.isArray(r.myDrop.prev)) { const pv = r.myDrop.prev.map(sealedOf).filter(Boolean).slice(0, 2); if (pv.length) out.myDrop.prev = pv; }
  }
  // the newest logical clock of a friend:* message from them (older ones are replays, FRIENDS.md section 6)
  if (n(r.lcIn)) out.lcIn = n(r.lcIn);
  if (isObj(r.flow)) {
    const f = {};
    for (const k of ['commit', 'mine', 'theirs', 'code', 'inv']) if (typeof r.flow[k] === 'string' && r.flow[k].length <= 64) f[k] = r.flow[k];
    if (typeof r.flow.rid === 'string' && /^[A-Za-z0-9_-]{11}$/.test(r.flow.rid)) f.rid = r.flow.rid;   // the invite's relay token id (closed on Decline)
    if (Number.isFinite(r.flow.at)) f.at = r.flow.at;
    // the requester's side of the check code (added by code): ok = "The codes match" said here; approved =
    // their approval, waiting for that ({at, dropSealed?: the route they gave, sealed})
    if (r.flow.ok === true) f.ok = true;
    if (isObj(r.flow.approved)) {
      const a = r.flow.approved;
      f.approved = { at: n(a.at), ...(isObj(a.dropSealed) ? { dropSealed: { iv: String(a.dropSealed.iv || ''), ct: String(a.dropSealed.ct || '') } } : {}) };
    }
    out.flow = f;
  }
  if (r.status === 'removing') { out.removeAt = n(r.removeAt); out.removeAs = r.removeAs === 'blocked' ? 'blocked' : 'removed'; out.wasStatus = STATUSES.includes(r.wasStatus) ? r.wasStatus : 'friend'; }
  if (r.why) out.why = cleanLine(r.why, 40);
  // They renewed their keys and asked to keep using MY relay (I own it): {oldEd, at, added?}.
  if (isObj(r.ask) && isPub(r.ask.oldEd)) out.ask = { oldEd: r.ask.oldEd, at: n(r.ask.at), ...(n(r.ask.added) ? { added: n(r.ask.added) } : {}) };
  if (ID_RE.test(r.renewedFrom || '')) out.renewedFrom = r.renewedFrom;
  // Reserved for other agents: perms (scope -> true|false, agent 'perms'), nick (agent 'profile').
  if (isObj(r.perms)) { const p = {}; for (const [k, v] of Object.entries(r.perms)) if (SAFE_ID_RE.test(k) && typeof v === 'boolean' && !FORBIDDEN_KEYS.has(k)) p[k] = v; out.perms = p; }
  if (typeof r.nick === 'string') out.nick = cleanLine(r.nick, 40);
  // The avatar a live-code request brought (2.20.1), checked on arrival; the page sanitises it again to draw it.
  if (isObj(r.look) && isObj(r.look.avatar) && JSON.stringify(r.look).length <= 2000) out.look = { avatar: r.look.avatar };
  return out;
}

// ─── Presence (opt-in, coarse) ─────────────────────────────────────────────
export const PRESENCE_STATES = Object.freeze(['online', 'focusing', 'travelling', 'away']);
export const PRESENCE_TTL_MS = 15 * 60 * 1000;
/** A friend's presence now: one of PRESENCE_STATES, or 'offline' once it is stale. */
export function presenceNow(p, now = Date.now()) {
  if (!isObj(p) || !PRESENCE_STATES.includes(p.s) || !Number.isFinite(p.at)) return 'offline';
  const ttl = Number.isFinite(p.ttl) ? p.ttl : PRESENCE_TTL_MS;
  return now - p.at <= ttl ? p.s : 'offline';
}

// ─── Friendship: XP, levels, streaks, milestones ───────────────────────────
// Grows as two people do things together: every non-passive event either way
// (a cheer, a quest step, a shared focus, a challenge, a space change) is worth
// its kind's xp, at most FRIENDSHIP_DAY_CAP a day; becoming friends is worth 25.
// Nothing is ever taken away. A streak is days in a row with at least one such
// event between the two of you; one quiet day in a week is forgiven.
export const FRIENDSHIP_DAY_CAP = 60;
export const FRIENDSHIP_TITLES = Object.freeze(['New friends', 'Getting to know each other', 'Pals', 'Good friends', 'Close friends', 'Best friends', 'Kindred spirits', 'Lifelong friends']);
const dayDefault = (ts) => new Date(Number(ts)).toISOString().slice(0, 10);
const isoAdd = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
/** Level n needs 30*n more XP than level n-1: {level, into, need, pct, title}. */
export function friendshipLevelOf(xp) {
  let level = 1, left = Math.max(0, Math.floor(Number(xp) || 0));
  while (left >= 30 * level && level < 999) { left -= 30 * level; level++; }
  const need = 30 * level;
  return { level, into: left, need, pct: need ? left / need : 0, title: FRIENDSHIP_TITLES[Math.min(FRIENDSHIP_TITLES.length - 1, level - 1)] };
}
/** The milestone of `today` for a friendship that began on `since` (ISO days), and the next one. */
export function friendshipMilestone(since, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since || '') || !/^\d{4}-\d{2}-\d{2}$/.test(today || '')) return { today: null, next: null, days: 0 };
  const days = daysBetween(since, today);
  const years = Number(today.slice(0, 4)) - Number(since.slice(0, 4));
  const anniv = years >= 1 && today.slice(5) === since.slice(5);
  const marks = [[7, 'One week of friendship'], [30, 'One month of friendship'], [100, '100 days of friendship'], [500, '500 days of friendship'], [1000, '1,000 days of friendship']];
  let todayM = null;
  if (anniv) todayM = { kind: 'anniversary', n: years, label: years === 1 ? 'Friends for a year today' : `Friends for ${years} years today` };
  else { const m = marks.find(x => x[0] === days); if (m) todayM = { kind: 'days', n: m[0], label: m[1] }; }
  let next = null;
  const nextYear = `${Number(since.slice(0, 4)) + Math.max(1, years + (today.slice(5) >= since.slice(5) ? 1 : 0))}${since.slice(4)}`;
  const cands = marks.filter(x => x[0] > days).map(x => ({ kind: 'days', n: x[0], label: x[1], inDays: x[0] - days }));
  const ny = daysBetween(today, nextYear);
  if (ny > 0) cands.push({ kind: 'anniversary', n: Number(nextYear.slice(0, 4)) - Number(since.slice(0, 4)), label: 'Friendship anniversary', inDays: ny });
  cands.sort((a, b) => a.inDays - b.inDays);
  next = cands[0] || null;
  return { today: todayM, next, days };
}
/**
 * The friendship with one friend, from feed entries between you
 * ({k, at, dir}), worked out the same on every device.
 * o: {friendsAt (ms), today (ISO), dayOf (ts -> ISO day in the person's zone)}
 */
export function friendshipStats(entries, { friendsAt = 0, today = null, dayOf = dayDefault } = {}) {
  const t = today || dayOf(Date.now());
  const byDay = new Map();
  const counts = { in: 0, out: 0 };
  for (const e of entries || []) {
    if (!e || !Number.isFinite(e.at)) continue;
    const d = kindDef(e.k);
    if (!d || d.core || d.passive || d.store === 'live') continue;
    const day = dayOf(e.at);
    byDay.set(day, Math.min(FRIENDSHIP_DAY_CAP, (byDay.get(day) || 0) + d.xp));
    if (e.dir === 'in') counts.in++; else counts.out++;
  }
  let xp = friendsAt ? 25 : 0;
  for (const v of byDay.values()) xp += v;
  // the streak (one quiet day a week forgiven)
  const days = [...byDay.keys()].filter(d => d <= t).sort();
  let current = 0, best = 0, run = 0, free = 1, sinceFree = 0, prev = null;
  for (const d of days) {
    if (prev) {
      const gap = daysBetween(prev, d);
      if (gap === 2 && free > 0) { free--; }
      else if (gap > 1) { run = 0; free = 1; sinceFree = 0; }
    }
    run++; sinceFree++;
    if (sinceFree >= 7) { free = 1; sinceFree = 0; }
    best = Math.max(best, run);
    prev = d;
  }
  if (prev) {
    const gap = daysBetween(prev, t);
    current = gap <= 1 || (gap === 2 && free > 0) ? run : 0;
  }
  const sinceDay = friendsAt ? dayOf(friendsAt) : null;
  return {
    xp, ...friendshipLevelOf(xp), streak: current, best, todayDone: byDay.has(t),
    since: sinceDay, milestone: sinceDay ? friendshipMilestone(sinceDay, t) : { today: null, next: null, days: 0 },
    counts, activeDays: byDay.size, lastDay: prev,
  };
}

/** For tests of schemas by other agents' code (no I/O): the registered kinds, as data. */
export function kindList() {
  return [...KINDS.values(), ...PATTERNS.map(p => p.def)].map(d => ({ kind: d.kind, store: d.store, scope: d.scope, passive: d.passive, xp: d.xp, max: d.max, core: d.core, local: d.local, rate: d.rate, ttl: d.ttl }));
}
export const _internals = { isoAdd };
