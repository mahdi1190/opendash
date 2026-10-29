// lib/sync/e2e-crypto.mjs - the cryptography of end-to-end encrypted folder
// sync (lib/sync/e2e.mjs uses it; the format is docs/dev/SYNC_FORMAT.md,
// section 11).
//
// PLATFORM-AGNOSTIC: Web Crypto only (globalThis.crypto.subtle and
// getRandomValues: Node 20+, every current browser, iOS/Android web views, a
// desktop shell), no node: imports, no Buffer. Base64 is done here.
//
//   AES-256-GCM      every record (a log line, a snapshot, a device name),
//                    a fresh random 96-bit nonce each time, 128-bit tag, and
//                    associated data that names the group, the device, the
//                    file, the record's sequence number and the key id, so a
//                    record cannot be moved to another file, device or place.
//   X25519           each device's identity key pair (the private half never
//                    leaves the device's secret store); key wraps between two
//                    devices are static-static ECDH, so a wrap proves who
//                    made it; recovery wraps are ECIES to the recovery key.
//   HKDF-SHA-256     every derived key, each with its own label.
//   SHA-256          device ids (a fingerprint of the identity key), the
//                    pairing commitment and the 6-digit pairing code.
//
// Recovery code: 8 groups of 4 characters from Crockford's base-32 alphabet
// (no I, L, O or U: nothing to misread, few accidental words). In each group
// 3 characters carry the secret and the 4th is a check character (Luhn mod 32
// over the group number and the 3 characters), so a typo is found and the
// group named. 8 x 15 bits = 120 bits of secret: far beyond guessing.

const subtle = () => {
  const c = globalThis.crypto;
  if (!c || !c.subtle || typeof c.getRandomValues !== 'function') throw new Error('encrypted sync needs Web Crypto (crypto.subtle)');
  return c.subtle;
};

// ─── Bytes ─────────────────────────────────────────────────────────────────
const te = new TextEncoder();
const td = new TextDecoder('utf-8', { fatal: true });
export const utf8 = (s) => te.encode(String(s));
export function fromUtf8(b) { try { return td.decode(b); } catch { return null; } }

export function randomBytes(n) {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 65536) globalThis.crypto.getRandomValues(out.subarray(i, Math.min(n, i + 65536)));
  return out;
}
export const hex = (b) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
export const randomId = (bytes = 8) => hex(randomBytes(bytes));

export function concat(...parts) {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
export function equalBytes(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

// base64url without padding (RFC 4648 section 5)
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_INV = (() => { const t = new Int16Array(128).fill(-1); for (let i = 0; i < 64; i++) t[B64.charCodeAt(i)] = i; return t; })();
export function b64u(bytes) {
  const chunks = [];
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[n >>> 18] + B64[(n >>> 12) & 63] + B64[(n >>> 6) & 63] + B64[n & 63];
    if (out.length >= 8192) { chunks.push(out); out = ''; }
  }
  const rest = bytes.length - i;
  if (rest === 1) { const n = bytes[i] << 16; out += B64[n >>> 18] + B64[(n >>> 12) & 63]; }
  else if (rest === 2) { const n = (bytes[i] << 16) | (bytes[i + 1] << 8); out += B64[n >>> 18] + B64[(n >>> 12) & 63] + B64[(n >>> 6) & 63]; }
  chunks.push(out);
  return chunks.join('');
}
/** Bytes, or null for anything that is not canonical base64url. */
export function unb64u(s) {
  if (typeof s !== 'string' || s.length % 4 === 1 || s.length > 64 * 1024 * 1024) return null;
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0, acc = 0, bits = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const v = c < 128 ? B64_INV[c] : -1;
    if (v < 0) return null;
    acc = ((acc << 6) | v) & 0xffff; bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (acc >>> bits) & 255; }
  }
  if (bits && (acc & ((1 << bits) - 1))) return null;     // stray bits: not what an encoder writes
  return out.subarray(0, o);
}

// ─── Hashes and keys ───────────────────────────────────────────────────────
export async function sha256(bytes) { return new Uint8Array(await subtle().digest('SHA-256', bytes)); }

export async function hkdf(ikm, salt, info, len = 32) {
  const k = await subtle().importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await subtle().deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: typeof info === 'string' ? utf8(info) : info }, k, len * 8));
}

/** A 256-bit AES-GCM key from 32 raw bytes (not extractable). */
export async function aesKey(raw) {
  if (!raw || raw.length !== 32) throw new Error('an AES-256 key is 32 bytes');
  return subtle().importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
export const newSecretKey = () => randomBytes(32);

/** AES-256-GCM with a fresh random nonce: {iv, ct} (base64url; ct carries the 16-byte tag). */
export async function seal(key, plain, aad) {
  const iv = randomBytes(12);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, plain));
  return { iv: b64u(iv), ct: b64u(ct) };
}
/** The plaintext bytes, or null when anything was changed (or the key or associated data is wrong). */
export async function open(key, enc, aad) {
  if (!enc || typeof enc !== 'object') return null;
  const iv = unb64u(enc.iv), ct = unb64u(enc.ct);
  if (!iv || iv.length !== 12 || !ct || ct.length < 16) return null;
  try { return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, ct)); }
  catch { return null; }
}
export async function sealJson(key, value, aad) { return seal(key, utf8(JSON.stringify(value)), aad); }
export async function openJson(key, enc, aad) {
  const b = await open(key, enc, aad);
  if (!b) return null;
  const t = fromUtf8(b);
  if (t == null) return null;
  try { return JSON.parse(t); } catch { return null; }
}

// ─── X25519 ────────────────────────────────────────────────────────────────
const PKCS8_X25519 = Uint8Array.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x04, 0x22, 0x04, 0x20]);
const privCache = new Map();
const pubCache = new Map();
const cached = (map, k, make) => { let p = map.get(k); if (!p) { p = make(); map.set(k, p); if (map.size > 256) map.delete(map.keys().next().value); p.catch(() => map.delete(k)); } return p; };
const importPriv = (b) => cached(privCache, b, async () => {
  const der = unb64u(b);
  if (!der || der.length !== 48) throw new Error('not an X25519 private key');
  return subtle().importKey('pkcs8', der, { name: 'X25519' }, false, ['deriveBits']);
});
const importPub = (b) => cached(pubCache, b, async () => {
  const raw = unb64u(b);
  if (!raw || raw.length !== 32) throw new Error('not an X25519 public key');
  return subtle().importKey('raw', raw, { name: 'X25519' }, true, []);
});
export const isPub = (b) => { const r = typeof b === 'string' ? unb64u(b) : null; return !!r && r.length === 32; };

/** A new identity key pair: {priv: PKCS#8 base64url, pub: raw 32 bytes base64url}. */
export async function newKeyPair() {
  const kp = await subtle().generateKey({ name: 'X25519' }, true, ['deriveBits']);
  const priv = new Uint8Array(await subtle().exportKey('pkcs8', kp.privateKey));
  const pub = new Uint8Array(await subtle().exportKey('raw', kp.publicKey));
  return { priv: b64u(priv), pub: b64u(pub) };
}
/** The key pair whose private key is these 32 bytes (the recovery key). */
export async function keyPairFromSeed(seed) {
  if (!seed || seed.length !== 32) throw new Error('a seed is 32 bytes');
  const der = concat(PKCS8_X25519, seed);
  const k = await subtle().importKey('pkcs8', der, { name: 'X25519' }, true, ['deriveBits']);
  const jwk = await subtle().exportKey('jwk', k);
  const pub = unb64u(jwk.x);
  if (!pub || pub.length !== 32) throw new Error('could not make the recovery key');
  return { priv: b64u(der), pub: b64u(pub) };
}
/** X25519(priv, pub): 32 shared bytes. Refuses an all-zero result (a low-order public key). */
export async function dh(privB64, pubB64) {
  const bits = new Uint8Array(await subtle().deriveBits({ name: 'X25519', public: await importPub(pubB64) }, await importPriv(privB64), 256));
  if (bits.every(x => x === 0)) throw new Error('bad public key');
  return bits;
}

/** A device's id: the first 8 bytes of SHA-256 over its identity public key, as 16 hex digits. */
export async function deviceIdOf(pubB64) {
  const raw = unb64u(pubB64);
  if (!raw || raw.length !== 32) return null;
  return hex((await sha256(concat(utf8('opendash-device-v2\n'), raw))).subarray(0, 8));
}

// ─── Key wraps ─────────────────────────────────────────────────────────────
/**
 * From one device to another (static-static X25519): only the two of them can
 * compute the key, so opening it proves the wrap came from `fromPub`'s owner.
 * `label` names the purpose and context (group, key id, sender, receiver); it
 * is both the HKDF info and the associated data.
 */
export async function wrapBetween({ myPriv, fromPub, toPub, label, value }) {
  const kek = await aesKey(await hkdf(await dh(myPriv, toPub), concat(unb64u(fromPub), unb64u(toPub)), label));
  return sealJson(kek, value, utf8(label));
}
export async function unwrapBetween({ myPriv, fromPub, toPub, label, enc }) {
  let kek;
  try { kek = await aesKey(await hkdf(await dh(myPriv, fromPub), concat(unb64u(fromPub), unb64u(toPub)), label)); }
  catch { return null; }
  return openJson(kek, enc, utf8(label));
}
/** To a public key from nobody in particular (ECIES with a one-time key): the recovery wraps. */
export async function wrapTo({ toPub, label, value }) {
  const e = await newKeyPair();
  const kek = await aesKey(await hkdf(await dh(e.priv, toPub), concat(unb64u(e.pub), unb64u(toPub)), label));
  return { eph: e.pub, ...(await sealJson(kek, value, utf8(label))) };
}
export async function unwrapTo({ myPriv, myPub, label, enc }) {
  if (!enc || !isPub(enc.eph)) return null;
  let kek;
  try { kek = await aesKey(await hkdf(await dh(myPriv, enc.eph), concat(unb64u(enc.eph), unb64u(myPub)), label)); }
  catch { return null; }
  return openJson(kek, enc, utf8(label));
}
/** With a one-time secret that never touches the shared folder (the QR offer). */
export async function secretKeyFrom(secret, label) { return aesKey(await hkdf(secret, utf8('opendash-offer-v2'), label)); }

// ─── Records ───────────────────────────────────────────────────────────────
/** Associated data of an encrypted record: nothing in it may contain a newline (callers pass ids and file names). */
export function recordAad({ kind, group, dev, file, seq, kid }) {
  return utf8(['opendash-sync-v2', kind, group, dev, file, String(seq), kid].join('\n'));
}

// ─── Device signatures (2.19.8) ────────────────────────────────────────────
// The group key proves only that a record's writer HOLDS the key; a removed
// device keeps the old keys. So each device also signs what it writes with an
// Ed25519 key DERIVED from its X25519 identity key (HKDF, so nothing new is
// stored and the key never changes for a device id). Its public half travels
// in the member list (field spk), announced by the device itself in its
// authenticated key wraps. The signature covers the record's associated data
// and its ciphertext; older versions ignore the extra field `sig`.
const PKCS8_ED25519 = Uint8Array.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]);
const edSignCache = new Map(), edVerifyCache = new Map();
/** The device's signing key pair, derived from its X25519 private key: {priv (PKCS#8), pub (raw)}, base64url. */
export async function deviceSigner(identityPrivB64, deviceId) {
  const ikm = unb64u(identityPrivB64);
  if (!ikm || ikm.length !== 48) throw new Error('not an X25519 private key');
  const seed = await hkdf(ikm, utf8('opendash-device-sign-v1'), `opendash-device-sign|${deviceId}`, 32);
  const der = concat(PKCS8_ED25519, seed);
  const k = await subtle().importKey('pkcs8', der, { name: 'Ed25519' }, true, ['sign']);
  const jwk = await subtle().exportKey('jwk', k);
  const pub = unb64u(jwk.x);
  if (!pub || pub.length !== 32) throw new Error('could not make the signing key');
  return { priv: b64u(der), pub: b64u(pub) };
}
/** The bytes a record signature covers: its associated data, nonce and ciphertext. */
export const recordSigBytes = (aad, enc) => concat(utf8('opendash-record-sig-v1\n'), aad, utf8(`\n${enc.iv}\n${enc.ct}`));
export async function edSign(privB64, bytes) {
  const key = await cached(edSignCache, privB64, async () => subtle().importKey('pkcs8', unb64u(privB64), { name: 'Ed25519' }, false, ['sign']));
  return b64u(new Uint8Array(await subtle().sign({ name: 'Ed25519' }, key, bytes)));
}
/** True when `sigB64` is a valid signature of `bytes` by `pubB64`. Never throws. */
export async function edVerify(pubB64, bytes, sigB64) {
  const sig = typeof sigB64 === 'string' ? unb64u(sigB64) : null;
  if (!sig || sig.length !== 64 || !isPub(pubB64)) return false;
  try {
    const key = await cached(edVerifyCache, pubB64, async () => subtle().importKey('raw', unb64u(pubB64), { name: 'Ed25519' }, false, ['verify']));
    return await subtle().verify({ name: 'Ed25519' }, key, sig, bytes);
  } catch { return false; }
}

// ─── Blobs (pictures, narration audio: docs/dev/SYNC_FORMAT.md section 12) ─
/** AES-256-GCM over raw bytes, a fresh random nonce: {iv, ct} as bytes (ct carries the 16-byte tag). */
export async function sealBytes(key, plain, aad) {
  const iv = randomBytes(12);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, plain));
  return { iv, ct };
}
/** The plaintext bytes, or null when anything was changed (or the key or associated data is wrong). */
export async function openBytes(key, iv, ct, aad) {
  if (!(iv instanceof Uint8Array) || iv.length !== 12 || !(ct instanceof Uint8Array) || ct.length < 16) return null;
  try { return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, ct)); }
  catch { return null; }
}
/** A blob's associated data: the group, the blob's id (SHA-256 of its plaintext, hex) and the key id. */
export const blobAad = ({ group, id, kid }) => utf8(['opendash-blob-v1', group, id, kid].join('\n'));

// ─── Pairing (short authentication string) ─────────────────────────────────
const H = async (parts) => sha256(utf8(JSON.stringify(parts)));
/** The joining device's commitment to its key, name and nonce, published before it sees the other side's nonce. */
export async function pairCommitment({ sid, pub, name, kind, nonce }) {
  return b64u(await H(['opendash-pair-commit-v2', sid, pub, name, kind, nonce]));
}
/** The 6 digits both screens show. Every input is fixed before either side can see the last one. */
export async function pairCode({ sid, group, commit, joinPub, approvePub, joinNonce, approveNonce }) {
  const d = await H(['opendash-pair-code-v2', sid, group, commit, joinPub, approvePub, joinNonce, approveNonce]);
  let n = 0;
  for (let i = 0; i < 6; i++) n = n * 256 + d[i];      // 48 bits: the bias of "mod 10^6" is below 10^-8
  return String(n % 1000000).padStart(6, '0');
}
export const formatPairCode = (c) => (typeof c === 'string' && /^\d{6}$/.test(c) ? `${c.slice(0, 3)} ${c.slice(3)}` : '');

// ─── Recovery code ─────────────────────────────────────────────────────────
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_INV = (() => { const m = new Map(); for (let i = 0; i < 32; i++) m.set(CODE_ALPHABET[i], i); return m; })();
const GROUPS = 8, DATA_PER_GROUP = 3;
export const RECOVERY_BYTES = 15;     // 8 groups x 3 characters x 5 bits = 120 bits

/** Luhn mod 32: the check value of a list of digits in base 32. */
function luhn32(vals) {
  let factor = 2, sum = 0;
  for (let i = vals.length - 1; i >= 0; i--) {
    let a = factor * vals[i];
    factor = factor === 2 ? 1 : 2;
    a = Math.floor(a / 32) + (a % 32);
    sum += a;
  }
  return (32 - (sum % 32)) % 32;
}
function toBase32(bytes) {
  const out = [];
  let acc = 0, bits = 0;
  for (const b of bytes) { acc = ((acc << 8) | b) & 0xffff; bits += 8; while (bits >= 5) { bits -= 5; out.push((acc >>> bits) & 31); } }
  if (bits) out.push((acc << (5 - bits)) & 31);
  return out;
}
function fromBase32(vals) {
  const out = [];
  let acc = 0, bits = 0;
  for (const v of vals) { acc = ((acc << 5) | v) & 0xffff; bits += 5; if (bits >= 8) { bits -= 8; out.push((acc >>> bits) & 255); } }
  return Uint8Array.from(out);
}
/** "XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" for 15 bytes of secret. */
export function encodeRecoveryCode(entropy) {
  if (!entropy || entropy.length !== RECOVERY_BYTES) throw new Error('a recovery secret is 15 bytes');
  const v = toBase32(entropy);   // 24 values
  const groups = [];
  for (let g = 0; g < GROUPS; g++) {
    const d = v.slice(g * DATA_PER_GROUP, g * DATA_PER_GROUP + DATA_PER_GROUP);
    groups.push([...d, luhn32([g, ...d])].map(x => CODE_ALPHABET[x]).join(''));
  }
  return groups.join('-');
}
export function newRecoveryCode() {
  const entropy = randomBytes(RECOVERY_BYTES);
  return { code: encodeRecoveryCode(entropy), entropy };
}
/**
 * What the user typed -> {ok: true, entropy, code} or {ok: false, reason, groups, message}.
 * Spaces, dashes and lower case are fine; O reads as 0 and I or L as 1.
 */
export function parseRecoveryCode(text) {
  const s = String(text == null ? '' : text).toUpperCase().replace(/[\s\-_.‐-―]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length !== GROUPS * 4) return { ok: false, reason: 'length', groups: [], message: `A recovery code has 32 letters and numbers, in 8 groups of 4. This one has ${s.length}.` };
  const vals = [], bad = [];
  for (let g = 0; g < GROUPS; g++) {
    const chunk = s.slice(g * 4, g * 4 + 4);
    const v = [...chunk].map(c => (CODE_INV.has(c) ? CODE_INV.get(c) : -1));
    if (v.some(x => x < 0) || luhn32([g, v[0], v[1], v[2]]) !== v[3]) { bad.push(g + 1); continue; }
    vals.push(v[0], v[1], v[2]);
  }
  if (bad.length) {
    const which = bad.length === 1 ? `group ${bad[0]}` : `groups ${bad.slice(0, -1).join(', ')} and ${bad[bad.length - 1]}`;
    return { ok: false, reason: 'check', groups: bad, message: `Check ${which} of the recovery code: ${bad.length === 1 ? 'it does' : 'they do'} not look right.` };
  }
  const bytes = fromBase32(vals).subarray(0, RECOVERY_BYTES);
  return { ok: true, entropy: bytes, code: encodeRecoveryCode(bytes) };
}
/** The recovery key pair the code stands for (X25519, from HKDF over the code's secret). */
export async function recoveryKeyPair(entropy) {
  return keyPairFromSeed(await hkdf(entropy, utf8('opendash-recovery-v2'), 'x25519 recovery key'));
}

// ─── Join code: a short code, without offline guessing (CPace on X25519) ───
// "Add a computer" shows 4 letters on a computer that already syncs; the new
// one types them. Four letters are easy to guess offline, so nothing that
// would let anyone TEST a guess goes into the shared folder: no code, no hash
// or MAC of it. Instead both sides run CPace (a balanced PAKE): the code picks
// a generator point G (Elligator 2 on Curve25519, so nobody knows its discrete
// log), each side publishes Y = X25519(y, G) for a fresh secret y, and both get
// K = X25519(y_self, Y_other). Someone who does not know the code (the folder,
// a fake device) gets ONE guess per session it takes part in, and the device
// that shows the code allows 3 wrong answers before the code stops working.
// Key confirmation tags (HKDF of K over the whole transcript) prove each side
// knew the code; the sync key itself still travels as an identity-key wrap.
export const JOIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // 24 letters: no I or O, and no digits (so no 0 or 1)
export const JOIN_LENGTH = 4;
/** 4 random letters from JOIN_ALPHABET (rejection sampling: no bias). */
export function newJoinCode() {
  let out = '';
  while (out.length < JOIN_LENGTH) {
    for (const b of randomBytes(8)) {
      if (b >= 240) continue;                     // 240 = 10 x 24: keeps every letter equally likely
      out += JOIN_ALPHABET[b % 24];
      if (out.length === JOIN_LENGTH) break;
    }
  }
  return out;
}
/** What the user typed -> {ok, code} or {ok:false, message}. Lower case, spaces and dashes are fine. */
export function parseJoinCode(text) {
  const s = String(text == null ? '' : text).toUpperCase().replace(/[\s\-_.‐-―]/g, '');
  if (s.length !== JOIN_LENGTH) return { ok: false, message: `The code has ${JOIN_LENGTH} letters. Look at your other computer: Settings > Sync > Add a computer.` };
  if ([...s].some(c => !JOIN_ALPHABET.includes(c))) return { ok: false, message: 'The code has only letters, and never I or O. Check it on your other computer.' };
  return { ok: true, code: s };
}
// Curve25519 field arithmetic (only for Elligator 2: the scalar work is Web Crypto's X25519).
const FP = 2n ** 255n - 19n, MONT_A = 486662n;
const fmod = (a) => { const r = a % FP; return r < 0n ? r + FP : r; };
function fpow(b, e) { let r = 1n; b = fmod(b); while (e > 0n) { if (e & 1n) r = (r * b) % FP; b = (b * b) % FP; e >>= 1n; } return r; }
const finv = (x) => fpow(x, FP - 2n);                       // inv0: 0 -> 0
const isSquare = (x) => { const l = fpow(x, (FP - 1n) / 2n); return l === 0n || l === 1n; };
/** RFC 9380 map_to_curve_elligator2 for curve25519 (Z = 2), the u-coordinate only. */
function elligator2U(r) {
  let tv1 = fmod(2n * r * r);
  if (tv1 === FP - 1n) tv1 = 0n;
  const x1 = fmod(-MONT_A * finv(tv1 + 1n));
  const gx1 = fmod(fmod(fmod(x1 + MONT_A) * x1 + 1n) * x1);
  return isSquare(gx1) ? x1 : fmod(-x1 - MONT_A);
}
/** The session's generator: a curve point from the code and the session id (raw u-coordinate, base64url). */
async function joinGenerator(code, sid) {
  const h = await hkdf(utf8(code), utf8('opendash-joincode-v1'), `opendash-joincode-generator|${sid}`, 48);
  let r = 0n;
  for (const b of h) r = (r << 8n) | BigInt(b);
  let u = elligator2U(fmod(r));
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) { out[i] = Number(u & 255n); u >>= 8n; }
  return b64u(out);
}
/** One side's CPace share for (code, sid): {priv, Y} (priv stays on this device; Y is published). */
export async function joinShare(code, sid) {
  const kp = await newKeyPair();
  const G = await joinGenerator(code, sid);
  return { priv: kp.priv, Y: b64u(await dh(kp.priv, G)) };
}
/**
 * Both confirmation tags from this side's secret and the other side's share,
 * bound to the whole transcript (session, both devices, both keys, both
 * shares, the new device's name and kind): {join, approve}. Equal on both
 * sides only when both used the same code. Throws on a bad share.
 */
export async function joinTags(priv, theirY, transcript) {
  const K = await dh(priv, theirY);
  const salt = await sha256(utf8(JSON.stringify(['opendash-joincode-transcript-v1', ...transcript])));
  const out = await hkdf(K, salt, 'opendash-joincode-confirm-v1', 64);
  return { join: b64u(out.subarray(0, 32)), approve: b64u(out.subarray(32)) };
}
/** Two base64url strings that hold the same bytes (constant time over the bytes). */
export function sameB64(a, b) { const x = typeof a === 'string' ? unb64u(a) : null, y = typeof b === 'string' ? unb64u(b) : null; return !!x && !!y && equalBytes(x, y); }
