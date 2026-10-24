// lib/relay/auth.mjs - signing and checking OpenDash relay requests
// (docs/dev/RELAY_PROTOCOL.md sections 2 and 3). Web Crypto only, no node:
// imports: the relay (lib/relay/core.mjs, in a Cloudflare Worker or in Node)
// and the clients (lib/sync, lib/friends) share it.
//
// Keys are Ed25519. A public key travels as its raw 32 bytes in base64url
// (43 characters); a private key is a CryptoKey (signerFromSeed / newSigner).

const te = new TextEncoder();
const subtle = () => globalThis.crypto.subtle;

export const KEY_RE = /^[A-Za-z0-9_-]{43}$/;
export const SIG_RE = /^[A-Za-z0-9_-]{86}$/;
export const NONCE_RE = /^[A-Za-z0-9_-]{22}$/;
export const IID_RE = /^[A-Za-z0-9_-]{22}$/;
export const B64U_RE = /^[A-Za-z0-9_-]*$/;
export const SKEW_MS = 5 * 60 * 1000;
export const CERT_MAX_MS = 400 * 86400000;

// ─── Encoding ──────────────────────────────────────────────────────────────
export function b64u(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64u(text) {
  const s = String(text || '');
  if (!B64U_RE.test(s)) throw new Error('not base64url');
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export const utf8 = (s) => te.encode(String(s));
export const randomBytes = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));
export const randomId = (n = 16) => b64u(randomBytes(n));

export async function sha256(data) {
  const bytes = typeof data === 'string' ? utf8(data) : data;
  return new Uint8Array(await subtle().digest('SHA-256', bytes));
}
export const sha256b64u = async (data) => b64u(await sha256(data));
export const EMPTY_SHA256 = '47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU';

/** Constant-time comparison of two strings (same length leaks nothing but the length). */
export function sameText(a, b) {
  const x = utf8(a == null ? '' : a), y = utf8(b == null ? '' : b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] | 0) ^ (y[i] | 0);
  return diff === 0;
}

/** The identity id of a public key (22 characters). */
export async function iidOf(key) { return (await sha256b64u('opendash-relay-id-v1\n' + key)).slice(0, 22); }

// ─── Ed25519 ───────────────────────────────────────────────────────────────
const pubCache = new Map();
async function publicKey(key) {
  let k = pubCache.get(key);
  if (!k) {
    k = await subtle().importKey('raw', unb64u(key), { name: 'Ed25519' }, false, ['verify']);
    if (pubCache.size > 500) pubCache.clear();
    pubCache.set(key, k);
  }
  return k;
}
/** True when `sig` (b64u) is `key`'s signature of `text`. Never throws. */
export async function verify(key, sig, text) {
  if (!KEY_RE.test(key || '') || !SIG_RE.test(sig || '')) return false;
  try { return await subtle().verify({ name: 'Ed25519' }, await publicKey(key), unb64u(sig), utf8(text)); }
  catch { return false; }
}
/** A signer from a raw 32-byte private seed (b64u) and its public key: {key, sign(text)}. */
export async function signerFromSeed(seed, pub) {
  const priv = await subtle().importKey('jwk', { kty: 'OKP', crv: 'Ed25519', d: seed, x: pub, ext: false }, { name: 'Ed25519' }, false, ['sign']);
  return { key: pub, sign: async (text) => b64u(await subtle().sign({ name: 'Ed25519' }, priv, utf8(text))) };
}
/** A signer from a PKCS#8 private key (b64u, the friends identity's `ed.priv`) and its public key. */
export async function signerFromPkcs8(priv, pub) {
  const k = await subtle().importKey('pkcs8', unb64u(priv), { name: 'Ed25519' }, false, ['sign']);
  return { key: pub, sign: async (text) => b64u(await subtle().sign({ name: 'Ed25519' }, k, utf8(text))) };
}
/** A fresh key pair: {key, seed, sign(text)} (seed: b64u of the 32-byte private key, for the caller's secret store). */
export async function newSigner() {
  const pair = await subtle().generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const jwk = await subtle().exportKey('jwk', pair.privateKey);
  return { key: jwk.x, seed: jwk.d, sign: async (text) => b64u(await subtle().sign({ name: 'Ed25519' }, pair.privateKey, utf8(text))) };
}

// ─── Device certificates (2.1) ─────────────────────────────────────────────
export const certText = (identity, device, iat, exp) => `OPENDASH-RELAY-CERT-1\n${identity}\n${device}\n${iat}\n${exp}`;
/** `identity` (a signer) certifies `device` (a public key). */
export async function makeCert(identity, device, { iat = Date.now(), days = 365 } = {}) {
  const exp = iat + Math.min(days * 86400000, CERT_MAX_MS);
  return `1.${identity.key}.${device}.${iat}.${exp}.${await identity.sign(certText(identity.key, device, iat, exp))}`;
}
export function parseCert(text) {
  const p = String(text || '').split('.');
  if (p.length !== 6 || p[0] !== '1' || !KEY_RE.test(p[1]) || !KEY_RE.test(p[2]) || !/^\d{1,15}$/.test(p[3]) || !/^\d{1,15}$/.test(p[4]) || !SIG_RE.test(p[5])) return null;
  return { identity: p[1], device: p[2], iat: Number(p[3]), exp: Number(p[4]), sig: p[5] };
}
/** {ok, identity, device, id, iat, exp}: signature, dates (the revocation list is the caller's). */
export async function checkCert(text, now = Date.now()) {
  const c = parseCert(text);
  if (!c) return { ok: false };
  const t = certText(c.identity, c.device, c.iat, c.exp);
  if (c.iat > now + SKEW_MS || c.exp <= now || c.exp - c.iat > CERT_MAX_MS || c.identity === c.device) return { ok: false };
  if (!(await verify(c.identity, c.sig, t))) return { ok: false };
  return { ok: true, identity: c.identity, device: c.device, iat: c.iat, exp: c.exp, id: (await sha256b64u(t)).slice(0, 22) };
}

// ─── Requests (3.1) ────────────────────────────────────────────────────────
export const requestText = ({ host, method, path, query = '', time, nonce, bodyHash }) =>
  ['OPENDASH-RELAY-1', String(host).toLowerCase(), method.toUpperCase(), path, query, String(time), nonce, bodyHash].join('\n');

/**
 * The headers of a signed request. `signer` = {key, sign(text)}; `cert` when
 * the signer is a device key; `url` the full request URL; `body` a string or
 * bytes (or nothing); `now` the relay's clock as the client knows it.
 */
export async function signRequest({ signer, cert = null, url, method = 'GET', body = null, now = Date.now() }) {
  const u = new URL(url);
  const bytes = body == null ? new Uint8Array(0) : typeof body === 'string' ? utf8(body) : body;
  const bodyHash = await sha256b64u(bytes);
  const time = Math.round(now), nonce = randomId(16);
  const sig = await signer.sign(requestText({ host: u.host, method, path: u.pathname, query: u.search.slice(1), time, nonce, bodyHash }));
  const h = { 'X-OD-Key': signer.key, 'X-OD-Time': String(time), 'X-OD-Nonce': nonce, 'X-OD-Body': bodyHash, 'X-OD-Sig': sig };
  if (cert) h['X-OD-Cert'] = cert;
  return h;
}

/**
 * Check a request's signature (not who it is: lib/relay/core.mjs does that).
 * {ok, key, cert?, time, nonce} or {ok: false, error}.
 */
export async function checkSignature({ host, method, path, query, headers, body, now = Date.now() }) {
  const key = headers.get('x-od-key') || '', time = headers.get('x-od-time') || '', nonce = headers.get('x-od-nonce') || '';
  const claimed = headers.get('x-od-body') || '', sig = headers.get('x-od-sig') || '';
  if (!KEY_RE.test(key) || !/^\d{1,15}$/.test(time) || !NONCE_RE.test(nonce) || !/^[A-Za-z0-9_-]{43}$/.test(claimed) || !SIG_RE.test(sig)) return { ok: false, error: 'signature' };
  if (Math.abs(Number(time) - now) > SKEW_MS) return { ok: false, error: 'clock' };
  if (!sameText(await sha256b64u(body || new Uint8Array(0)), claimed)) return { ok: false, error: 'body' };
  if (!(await verify(key, sig, requestText({ host, method, path, query, time, nonce, bodyHash: claimed })))) return { ok: false, error: 'signature' };
  return { ok: true, key, time: Number(time), nonce, cert: headers.get('x-od-cert') || null };
}
/**
 * The relay's front door (lib/relay/core.mjs front()): the same checks without the
 * body (the space checks it against X-OD-Body) and without any state. {ok} or {ok: false, error}.
 */
export async function checkSignedHeaders({ host, method, path, query, headers, now = Date.now() }) {
  const key = headers.get('x-od-key') || '', time = headers.get('x-od-time') || '', nonce = headers.get('x-od-nonce') || '';
  const claimed = headers.get('x-od-body') || '', sig = headers.get('x-od-sig') || '';
  if (!KEY_RE.test(key) || !/^\d{1,15}$/.test(time) || !NONCE_RE.test(nonce) || !/^[A-Za-z0-9_-]{43}$/.test(claimed) || !SIG_RE.test(sig)) return { ok: false, error: 'signature' };
  if (Math.abs(Number(time) - now) > SKEW_MS) return { ok: false, error: 'clock' };
  if (!(await verify(key, sig, requestText({ host, method, path, query, time, nonce, bodyHash: claimed })))) return { ok: false, error: 'signature' };
  return { ok: true };
}

// ─── WebSockets (7.7) ──────────────────────────────────────────────────────
export const wsText = (host, path, challenge) => `OPENDASH-RELAY-WS-1\n${String(host).toLowerCase()}\n${path}\n${challenge}`;
/** The client's answer to {t:'challenge', c}: the `auth` message (add `dev` for a sync group). */
export async function answerChallenge({ signer, cert = null, url, challenge, extra = {} }) {
  const u = new URL(url);
  const msg = { t: 'auth', key: signer.key, sig: await signer.sign(wsText(u.host, u.pathname, challenge)), ...extra };
  if (cert) msg.cert = cert;
  return msg;
}

// ─── Derived names (sections 5.1, 6, 7.2) ──────────────────────────────────
export const groupId = (group) => sha256b64u('opendash-relay-group-v1\n' + group);
export async function groupCap(rawKey, group, kid) {
  const base = await subtle().importKey('raw', rawKey, 'HKDF', false, ['deriveBits']);
  const bits = await subtle().deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: utf8('opendash-relay-cap-v1'), info: utf8(`opendash-relay-cap|${group}|${kid}`) }, base, 256);
  return b64u(new Uint8Array(bits));
}
/** A join slot id (section 6): 16 random bytes. Never derived from the join code. */
export const newJoinSlot = () => randomId(16);
export const SLOT_RE = /^[A-Za-z0-9_-]{22}$/;
/** The join link E shows, and reading one back: {origin, slot} or null. */
export const joinLink = (origin, slot) => `${String(origin).replace(/\/+$/, '')}/j#ODJ1.${slot}`;
export function parseJoinLink(text) {
  const m = /^(https?:\/\/[^/#?\s]+)\/j#ODJ1\.([A-Za-z0-9_-]{22})$/.exec(String(text || '').trim());
  return m ? { origin: m[1].toLowerCase(), slot: m[2] } : null;
}
export const tokenHash = (kind, token) => sha256b64u(`opendash-relay-${kind}-v1\n${token}`);
/** A drop token's id (what revokeDrop sends): the first 22 characters of its hash. */
export const dropId = async (token) => (await tokenHash('drop', token)).slice(0, 22);
