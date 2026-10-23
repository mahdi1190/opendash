// lib/sync/live/handshake.mjs - the mutual authentication of a live link and
// the keys that protect it (docs/dev/LIVE_SYNC.md section 3).
//
// PLATFORM-AGNOSTIC: Web Crypto only (X25519, HKDF-SHA-256, AES-256-GCM,
// SHA-256), no node: imports.
//
// It is a Noise-KK-style exchange: both sides already know each other's
// static X25519 key (the member list of lib/sync/e2e.mjs; a device id is the
// fingerprint of that key), each adds a fresh ephemeral key, and the session
// keys come from all four Diffie-Hellman results plus a secret derived from
// the CURRENT sync key:
//
//   I -> R  hello    {p, v, t:'hello',   g, from:I, to:R, k:kid, e:eI, n, ts}
//   R -> I  welcome  {p, v, t:'welcome', g, from:R, to:I, k:kid, e:eR, n, ts, c}
//   I -> R  confirm  {t:'confirm', c}
//
//   th   = SHA-256(JSON ["opendash-live-v1", hello fields, welcome fields])
//   ikm  = DH(eI,eR) | DH(eI,sR) | DH(sI,eR) | DH(sI,sR)
//   keys = HKDF(ikm, salt = th | psk, "opendash-live-v1 keys", 64) -> kIR | kRI
//   c    = AES-GCM(k, nonce 0, aad th, "opendash-live-v1 responder" / "... initiator")
//
// DH(eI,sR) needs R's static private key and DH(sI,eR) needs I's, so a valid
// `c` proves possession of the device's identity key; the ephemeral keys make
// every session's keys new (a recorded hello, welcome or confirm is useless
// later) and give forward secrecy; psk (HKDF of the current sync key) means a
// device removed in this key epoch cannot finish even with its own key.
// Afterwards every frame is AES-256-GCM with a per-direction key and a nonce
// that counts up from 1: a frame replayed, dropped, reordered or changed in
// the stream fails to open and the link is closed.
//
// PeerAuth (what the handshake needs from the key layer; lib/sync/e2e.mjs
// liveAuth() gives the real one, tests may give a test key):
//   deviceId, pub, group, kid   this device and the current sync key's id
//   psk                         32 bytes derived from the current sync key
//   dh(pub)                     X25519(this device's private key, pub): the private key never leaves
//   peer(id)                    the static public key of a member of the current epoch, or null

import { b64u, unb64u, utf8, concat, hkdf, sha256, isPub, dh as staticDh } from '../e2e-crypto.mjs';
import { LIVE_PROTOCOL, LIVE_VERSION, SUPPORTED_VERSIONS } from './wire.mjs';

const subtle = () => globalThis.crypto.subtle;
const ID_RE = /^[0-9a-f]{16}$/;
const KID_RE = /^[0-9a-f]{16}$/;
const N_RE = /^[A-Za-z0-9_-]{22}$/;
const CONFIRM_R = 'opendash-live-v1 responder';
const CONFIRM_I = 'opendash-live-v1 initiator';

/** An ephemeral X25519 key pair whose private half can never be exported. */
export async function ephemeral() {
  const kp = await subtle().generateKey({ name: 'X25519' }, false, ['deriveBits']);
  const pub = b64u(new Uint8Array(await subtle().exportKey('raw', kp.publicKey)));
  return {
    pub,
    async dh(peerPub) {
      const raw = unb64u(peerPub);
      if (!raw || raw.length !== 32) throw new Error('bad public key');
      const k = await subtle().importKey('raw', raw, { name: 'X25519' }, false, []);
      const bits = new Uint8Array(await subtle().deriveBits({ name: 'X25519', public: k }, kp.privateKey, 256));
      if (bits.every(x => x === 0)) throw new Error('bad public key');
      return bits;
    },
  };
}

const fields = (m) => [m.p, m.v, m.g, m.from, m.to, m.k, m.e, m.n, m.ts];
async function transcript(hello, welcome) {
  return sha256(utf8(JSON.stringify(['opendash-live-v1', fields(hello), fields(welcome)])));
}
const nonceBytes = (n) => {
  const iv = new Uint8Array(12);
  let hi = Math.floor(n / 0x100000000), lo = n >>> 0;
  for (let i = 11; i >= 8; i--) { iv[i] = lo & 255; lo >>>= 8; }
  for (let i = 7; i >= 4; i--) { iv[i] = hi & 255; hi >>>= 8; }
  return iv;
};
async function aes(raw) { return subtle().importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); }
async function sealAt(key, n, plain, aad) { return new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: nonceBytes(n), additionalData: aad, tagLength: 128 }, key, plain)); }
async function openAt(key, n, ct, aad) {
  try { return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: nonceBytes(n), additionalData: aad, tagLength: 128 }, key, ct)); }
  catch { return null; }
}

/** The cleartext message shape both sides check before doing any key work. Returns why not, or null. */
export function checkHelloShape(m, t) {
  if (!m || typeof m !== 'object') return 'format';
  if (m.p !== LIVE_PROTOCOL) return 'protocol';
  if (!SUPPORTED_VERSIONS.includes(m.v)) return 'version';
  if (m.t !== t) return 'format';
  if (!ID_RE.test(m.g || '') || !ID_RE.test(m.from || '') || !ID_RE.test(m.to || '') || !KID_RE.test(m.k || '')) return 'format';
  if (!isPub(m.e) || !N_RE.test(m.n || '') || !Number.isFinite(m.ts)) return 'format';
  if (t === 'welcome' && (typeof m.c !== 'string' || m.c.length > 200)) return 'format';
  return null;
}

async function schedule({ hello, welcome, ee, es, se, ss, psk }) {
  const th = await transcript(hello, welcome);
  const okm = await hkdf(concat(ee, es, se, ss), concat(th, psk), 'opendash-live-v1 keys', 64);
  return { th, kIR: okm.subarray(0, 32), kRI: okm.subarray(32, 64) };
}

/**
 * Directional AES-256-GCM: seal() and open() each count their own nonces from
 * 1. Callers keep the order (one queue per direction): frame n is sealed with
 * nonce n, and the reader expects exactly n.
 */
export async function makeCiphers(sendRaw, recvRaw) {
  const sk = await aes(sendRaw), rk = await aes(recvRaw);
  const aad = utf8('opendash-live-v1 frame');
  let sn = 1, rn = 1;
  return {
    seal: (plain) => sealAt(sk, sn++, plain, aad),
    async open(ct) { const p = await openAt(rk, rn, ct, aad); if (p) rn++; return p; },
    get sent() { return sn - 1; },
    get received() { return rn - 1; },
  };
}

// ─── The initiator (the device that dials) ─────────────────────────────────
export async function initiatorStart({ auth, peerId, now = Date.now }) {
  if (!ID_RE.test(peerId || '')) throw new Error('bad peer id');
  const peerPub = auth.peer(peerId);
  if (!peerPub) throw Object.assign(new Error('not a member'), { code: 'unknown' });
  const eph = await ephemeral();
  const nonce = new Uint8Array(16); globalThis.crypto.getRandomValues(nonce);
  const hello = { p: LIVE_PROTOCOL, v: LIVE_VERSION, t: 'hello', g: auth.group, from: auth.deviceId, to: peerId, k: auth.kid, e: eph.pub, n: b64u(nonce), ts: now() };
  return { hello, state: { auth, peerId, peerPub, eph, hello } };
}
/** {ciphers, confirm (the third message)} or {error: why}. */
export async function initiatorFinish(state, welcome) {
  const why = checkHelloShape(welcome, 'welcome');
  if (why) return { error: why };
  const { auth, peerId, peerPub, eph, hello } = state;
  if (welcome.from !== peerId || welcome.to !== auth.deviceId || welcome.g !== hello.g) return { error: 'wrong-peer' };
  if (welcome.k !== hello.k) return { error: 'key-mismatch' };
  let ee, es, se, ss;
  try {
    ee = await eph.dh(welcome.e); es = await eph.dh(peerPub);
    se = await auth.dh(welcome.e); ss = await auth.dh(peerPub);
  } catch { return { error: 'bad-key' }; }
  const { th, kIR, kRI } = await schedule({ hello, welcome, ee, es, se, ss, psk: auth.psk });
  const c = unb64u(welcome.c);
  const ok = c && await openAt(await aes(kRI), 0, c, th);
  if (!ok || new TextDecoder().decode(ok) !== CONFIRM_R) return { error: 'auth' };
  const mine = await sealAt(await aes(kIR), 0, utf8(CONFIRM_I), th);
  return { confirm: { t: 'confirm', c: b64u(mine) }, ciphers: await makeCiphers(kIR, kRI) };
}

// ─── The responder (the device that was dialled) ───────────────────────────
/** {welcome, state} or {error: why, reply?} (reply: an error message worth sending back). */
export async function responderAccept({ auth, hello, now = Date.now }) {
  const why = checkHelloShape(hello, 'hello');
  if (why) return { error: why, reply: why === 'version' ? { p: LIVE_PROTOCOL, v: LIVE_VERSION, t: 'error', code: 'version', versions: SUPPORTED_VERSIONS } : null };
  if (hello.to !== auth.deviceId) return { error: 'not-for-me' };
  if (hello.g !== auth.group) return { error: 'group' };
  if (hello.from === auth.deviceId) return { error: 'self' };
  const peerPub = auth.peer(hello.from);
  if (!peerPub) return { error: 'unknown' };                 // never paired, or removed in this epoch
  if (hello.k !== auth.kid) return { error: 'key-mismatch', reply: { p: LIVE_PROTOCOL, v: LIVE_VERSION, t: 'error', code: 'key', k: auth.kid } };
  const eph = await ephemeral();
  const nonce = new Uint8Array(16); globalThis.crypto.getRandomValues(nonce);
  const welcome = { p: LIVE_PROTOCOL, v: LIVE_VERSION, t: 'welcome', g: auth.group, from: auth.deviceId, to: hello.from, k: auth.kid, e: eph.pub, n: b64u(nonce), ts: now() };
  let ee, es, se, ss;
  try {
    ee = await eph.dh(hello.e); es = await auth.dh(hello.e);
    se = await eph.dh(peerPub); ss = await auth.dh(peerPub);
  } catch { return { error: 'bad-key' }; }
  const { th, kIR, kRI } = await schedule({ hello, welcome, ee, es, se, ss, psk: auth.psk });
  welcome.c = b64u(await sealAt(await aes(kRI), 0, utf8(CONFIRM_R), th));
  return { welcome, state: { th, kIR, kRI, peerId: hello.from } };
}
/** {ciphers, peerId} or {error}. */
export async function responderFinish(state, confirm) {
  if (!confirm || confirm.t !== 'confirm' || typeof confirm.c !== 'string' || confirm.c.length > 200) return { error: 'format' };
  const c = unb64u(confirm.c);
  const ok = c && await openAt(await aes(state.kIR), 0, c, state.th);
  if (!ok || new TextDecoder().decode(ok) !== CONFIRM_I) return { error: 'auth' };
  return { ciphers: await makeCiphers(state.kRI, state.kIR), peerId: state.peerId };
}

/**
 * A PeerAuth from plain values (tests, and anything that is not
 * lib/sync/e2e.mjs): identity {deviceId, pub, priv}, members {id: pub}.
 */
export function staticAuth({ identity, group, kid, psk, members }) {
  return {
    deviceId: identity.deviceId, pub: identity.pub, group, kid, psk,
    dh: (pub) => staticDh(identity.priv, pub),
    peer: (id) => (Object.prototype.hasOwnProperty.call(members, id) && id !== identity.deviceId ? members[id] : null),
  };
}
