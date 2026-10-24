// lib/sync/relay-client.mjs - the device-sync side of the OpenDash relay
// (docs/dev/RELAY_PROTOCOL.md, version 1): signed requests (3.1), the sync
// group (5: enrolment, logs, slots, blobs, the changes feed, the live socket)
// and the join rendezvous (6).
//
// PLATFORM-AGNOSTIC: Web Crypto (Ed25519, SHA-256, HKDF, AES-GCM), fetch and
// WebSocket only; no node: imports. lib/sync/relay-node.mjs gives it the
// device key, the certificate and the origin.
//
// EVERY ANSWER IS UNTRUSTED (the owner's rule, 24 Oct 2026): sizes are capped
// while reading, every field is checked before it is used, offsets must add
// up, and what the relay carries is sealed by the sync layer anyway (the
// relay can drop or replay, never forge or read). Nothing here logs a key,
// a certificate, a body or a relay message.

import { b64u, unb64u, utf8, fromUtf8, sha256, hkdf, aesKey, randomBytes, concat } from './e2e-crypto.mjs';
import { relayOrigin } from '../relay/origin.mjs';

const subtle = () => {
  const c = globalThis.crypto;
  if (!c || !c.subtle) throw new Error('the relay needs Web Crypto (crypto.subtle)');
  return c.subtle;
};

export const DEV_RE = /^[0-9a-f]{16}$/;
export const LOG_FILE_RE = /^ops-(\d{8})(?:-(\d{2}))?\.jsonl$/;
export const SLOT_NAMES = Object.freeze(['device', 'snapshot', 'keys', 'pair']);
export const SLOT_CAPS = Object.freeze({ device: 64 * 1024, pair: 64 * 1024, keys: 256 * 1024, snapshot: 16 * 1024 * 1024 });
export const BLOB_MAX = 5 * 1024 * 1024 + 1024;
export const LOC_RE = /^[0-9a-f]{32}$/;
const GID_RE = /^[A-Za-z0-9_-]{43}$/;
const SLOT_RE = /^[A-Za-z0-9_-]{22}$/;      // a join slot: 16 random bytes (RELAY_PROTOCOL.md 6)
const MAX_JSON = 4 * 1024 * 1024 + 64 * 1024;       // a changes answer is at most 4 MiB
const MAX_LINE = 1024 * 1024;

// ─── Errors ─────────────────────────────────────────────────────────────────
/**
 * code: unreachable | rate | busy | quota | not-member | scope | forbidden |
 * auth | not-found | stale | taken | exists | gone | too-large | bad | relay-error
 */
export class RelayError extends Error {
  constructor(code, { status = 0, retryAfterMs = 0, message, why = null } = {}) {
    super(message || code);
    this.code = code; this.status = status; this.retryAfterMs = retryAfterMs; this.why = why;
  }
}
const ERR_BY_NAME = { not_member: 'not-member', scope: 'scope', forbidden: 'forbidden', not_found: 'not-found', stale: 'stale', taken: 'taken', exists: 'exists', gone: 'gone', too_large: 'too-large', rate_limit: 'rate', relay_busy: 'busy', quota: 'quota' };
function errorFor(status, body, headers) {
  const name = body && typeof body.error === 'string' ? body.error : '';
  const ra = Number(headers && headers.get && headers.get('retry-after'));
  const retryAfterMs = Number.isFinite(ra) && ra > 0 ? Math.min(ra, 24 * 3600) * 1000 : 0;
  let code = ERR_BY_NAME[name] || null;
  if (!code) code = status === 401 ? 'auth' : status === 403 ? 'forbidden' : status === 404 ? 'not-found' : status === 409 ? 'stale' : status === 410 ? 'gone' : status === 413 ? 'too-large' : status === 429 ? 'rate' : status === 503 ? 'busy' : status === 507 ? 'quota' : status >= 500 ? 'relay-error' : 'bad';
  // why: a closed join slot says why ('second', 'expired', 'done'); one plain word, never shown as is.
  const why = body && typeof body.why === 'string' && /^[a-z]{1,20}$/.test(body.why) ? body.why : null;
  return new RelayError(code, { status, retryAfterMs, why });
}

// ─── Keys and certificates (2.1) ───────────────────────────────────────────
const edPrivCache = new Map();
async function importEdPriv(pkcs8B64) {
  let p = edPrivCache.get(pkcs8B64);
  if (!p) {
    const der = unb64u(pkcs8B64);
    if (!der || der.length !== 48) throw new Error('not an Ed25519 private key');
    p = subtle().importKey('pkcs8', der, { name: 'Ed25519' }, false, ['sign']);
    edPrivCache.set(pkcs8B64, p);
    if (edPrivCache.size > 16) edPrivCache.delete(edPrivCache.keys().next().value);
    p.catch(() => edPrivCache.delete(pkcs8B64));
  }
  return p;
}
export async function edSign(pkcs8B64, bytes) {
  return b64u(new Uint8Array(await subtle().sign({ name: 'Ed25519' }, await importEdPriv(pkcs8B64), bytes)));
}
export async function edVerify(pubB64, bytes, sigB64) {
  const pub = unb64u(pubB64 || ''), sig = unb64u(sigB64 || '');
  if (!pub || pub.length !== 32 || !sig || sig.length !== 64) return false;
  try { return await subtle().verify({ name: 'Ed25519' }, await subtle().importKey('raw', pub, { name: 'Ed25519' }, false, ['verify']), sig, bytes); }
  catch { return false; }
}
/** A new Ed25519 key pair: {priv: PKCS#8 b64u, pub: raw 32 bytes b64u}. */
export async function newEdKeys() {
  const kp = await subtle().generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { priv: b64u(new Uint8Array(await subtle().exportKey('pkcs8', kp.privateKey))), pub: b64u(new Uint8Array(await subtle().exportKey('raw', kp.publicKey))) };
}
const certText = (identity, device, iat, exp) => `OPENDASH-RELAY-CERT-1\n${identity}\n${device}\n${iat}\n${exp}`;
/** A device certificate (2.1) from the identity's Ed25519 key: '1.<identity>.<device>.<iat>.<exp>.<sig>'. */
export async function makeCert({ identityPriv, identityPub, devicePub, iat, exp }) {
  const sig = await edSign(identityPriv, utf8(certText(identityPub, devicePub, iat, exp)));
  return `1.${identityPub}.${devicePub}.${iat}.${exp}.${sig}`;
}
/** {identity, device, iat, exp} of a certificate whose signature checks, else null. */
export async function checkCert(cert) {
  const m = /^1\.([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})\.(\d{1,15})\.(\d{1,15})\.([A-Za-z0-9_-]{86})$/.exec(String(cert || ''));
  if (!m) return null;
  const [, identity, device, iat, exp, sig] = m;
  if (!(await edVerify(identity, utf8(certText(identity, device, iat, exp)), sig))) return null;
  return { identity, device, iat: Number(iat), exp: Number(exp) };
}
/** The relay's id for a key (2): b64u(SHA-256("opendash-relay-id-v1\n" + key))[0:22]. */
export async function iidOf(key) { return b64u(await sha256(utf8(`opendash-relay-id-v1\n${key}`))).slice(0, 22); }
/** gid (5.1) of a 16-hex sync group id. */
export async function gidOf(group) { return b64u(await sha256(utf8(`opendash-relay-group-v1\n${group}`))); }

/** A signer: {key, cert, sign(text) -> b64u}. From a PKCS#8 Ed25519 key (and its certificate). */
export function signerFrom({ priv, pub, cert = null }) {
  return { key: pub, cert, sign: (text) => edSign(priv, utf8(text)) };
}
/** A throwaway key for anonymous paths (a join slot the new device posts to). */
export async function anonymousSigner() { const k = await newEdKeys(); return signerFrom(k); }

// ─── The join link (RELAY_PROTOCOL.md 6) ───────────────────────────────────
// <origin>/j#ODJ1.<slot>.<seal>: <slot> is 16 random bytes (the slot the relay
// opens, stored there only as a hash); <seal> is 16 more random bytes that
// never reach the relay: the documents in the slot are sealed with a key from
// it, so the relay sees no device name and no key. The fragment never leaves
// the two computers. The 4-letter code is only the CPace password; knowing the
// slot never helps guess it. A link without <seal> (another client) carries
// the documents as they are.
export const LINK_PREFIX = 'ODJ1.';
export function newJoinSecrets() { return { slot: b64u(randomBytes(16)), seal: b64u(randomBytes(16)) }; }
export function joinLinkFor(origin, slot, seal) { return `${String(origin).replace(/\/+$/, '')}/j#${LINK_PREFIX}${slot}${seal ? '.' + seal : ''}`; }
/** What was pasted -> {origin, slot, seal|null} or null. */
export function parseJoinLink(text) {
  const t = String(text == null ? '' : text).trim();
  const m = /^(https?:\/\/[^\s/#?]+)\/j#ODJ1\.([A-Za-z0-9_-]{22})(?:\.([A-Za-z0-9_-]{22}))?$/.exec(t);
  if (!m) return null;
  const origin = cleanOrigin(m[1]);
  if (!origin || !unb64u(m[2]) || (m[3] && !unb64u(m[3]))) return null;
  return { origin, slot: m[2], seal: m[3] || null };
}
/** The documents' AES key for a link's seal part (null: documents travel as they are). */
export async function joinKeyFor(slot, seal) {
  if (!seal) return null;
  const raw = unb64u(seal);
  if (!raw || raw.length !== 16) throw new Error('not a join link');
  return aesKey(await hkdf(raw, utf8('opendash-relay-join-v2'), `seal|${slot}`, 32));
}
const docAad = (slot, dev) => utf8(`opendash-relay-join-doc-v2|${slot}|${dev}`);
/** A pair.json for the slot: {v:2, t:'pair', dev, sealed:{iv, ct}} (the relay checks v, t and dev only). */
export async function sealJoinDoc(key, slot, dev, text) {
  if (!key) return text;
  const iv = randomBytes(12);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: docAad(slot, dev), tagLength: 128 }, key, utf8(text)));
  return JSON.stringify({ v: 2, t: 'pair', dev, sealed: { iv: b64u(iv), ct: b64u(ct) } });
}
/** The pair.json in a slot document, or null (sealed with another key, changed, not this device's). */
export async function openJoinDoc(key, slot, dev, body) {
  let o;
  try { o = typeof body === 'string' ? JSON.parse(body) : body; } catch { return null; }
  if (!o || typeof o !== 'object' || o.v !== 2 || o.t !== 'pair' || o.dev !== dev) return null;
  if (!key) return o.sealed ? null : o;
  const s = o.sealed;
  if (!s || typeof s.iv !== 'string' || typeof s.ct !== 'string') return null;     // a link with a seal takes sealed documents only
  const iv = unb64u(s.iv), ct = unb64u(s.ct);
  if (!iv || iv.length !== 12 || !ct || ct.length < 16 || ct.length > 16 * 1024) return null;
  try {
    const pt = new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv, additionalData: docAad(slot, dev), tagLength: 128 }, key, ct));
    const t = fromUtf8(pt);
    const doc = t == null ? null : JSON.parse(t);
    return doc && typeof doc === 'object' && doc.dev === dev && doc.t === 'pair' ? doc : null;
  } catch { return null; }
}

/**
 * An origin we may talk to: THE shared check (lib/relay/origin.mjs): a public https
 * origin; http://127.0.0.1:<port> or http://localhost:<port> only when the process
 * has OPENDASH_RELAY_ALLOW_LOCAL=1 (never because of a link, a file or the page).
 */
export function cleanOrigin(value) { return relayOrigin(value); }

// ─── The client ─────────────────────────────────────────────────────────────
/**
 * createRelayClient({origin, signer, fetchFn, WebSocketImpl, now, timeoutMs})
 * signer: {key, cert, sign(text)} (the device key and its certificate), or a
 * function returning one (it may change when a certificate is renewed).
 */
export function createRelayClient({ origin, signer, fetchFn = globalThis.fetch, WebSocketImpl = globalThis.WebSocket, now = () => Date.now(), timeoutMs = 30000 } = {}) {
  const base = cleanOrigin(origin);
  if (!base) throw new RelayError('bad', { message: 'A relay must be a public https address.' });
  const host = new URL(base).host.toLowerCase();
  let offset = 0;                       // the relay's clock minus ours (X-OD-Now)
  const getSigner = async (s) => (typeof s === 'function' ? s() : s);
  const relayNow = () => Math.round(now() + offset);
  const noteNow = (headers) => { const n = Number(headers && headers.get && headers.get('x-od-now')); if (Number.isFinite(n) && n > 0) offset = n - now(); };

  async function readCapped(res, max) {
    const len = Number(res.headers.get('content-length'));
    if (Number.isFinite(len) && len > max) { try { await res.body?.cancel(); } catch { /* closed */ } throw new RelayError('too-large', { status: res.status }); }
    if (!res.body || typeof res.body.getReader !== 'function') {
      const b = new Uint8Array(await res.arrayBuffer());
      if (b.length > max) throw new RelayError('too-large', { status: res.status });
      return b;
    }
    const reader = res.body.getReader();
    const parts = [];
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > max) { try { await reader.cancel(); } catch { /* closed */ } throw new RelayError('too-large', { status: res.status }); }
        parts.push(value);
      }
    } finally { try { reader.releaseLock(); } catch { /* released */ } }
    return concat(...parts);
  }

  /**
   * One signed request. body: object (JSON), string (JSON text) or Uint8Array
   * (octet-stream). want: 'json' | 'bytes' | 'text'. Returns {status, headers, data}.
   */
  async function request(method, path, { query = '', body, signer: sg, want = 'json', max = MAX_JSON, retry = true } = {}) {
    const s = await getSigner(sg !== undefined ? sg : signer);
    if (!s || !s.key) throw new RelayError('auth');
    let bytes = null, type = null;
    if (body instanceof Uint8Array) { bytes = body; type = 'application/octet-stream'; }
    else if (typeof body === 'string') { bytes = utf8(body); type = 'application/json'; }
    else if (body !== undefined) { bytes = utf8(JSON.stringify(body)); type = 'application/json'; }
    const bodyHash = b64u(await sha256(bytes || new Uint8Array(0)));
    const time = String(relayNow());
    const nonce = b64u(randomBytes(16));
    const text = ['OPENDASH-RELAY-1', host, method, path, query, time, nonce, bodyHash].join('\n');
    const headers = { 'X-OD-Key': s.key, 'X-OD-Time': time, 'X-OD-Nonce': nonce, 'X-OD-Body': bodyHash, 'X-OD-Sig': await s.sign(text) };
    if (s.cert) headers['X-OD-Cert'] = s.cert;
    if (type) headers['Content-Type'] = type;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    let res;
    try {
      res = await fetchFn(base + path + (query ? '?' + query : ''), { method, headers, body: bytes || undefined, redirect: 'error', signal: ac.signal, cache: 'no-store' });
    } catch { clearTimeout(timer); throw new RelayError('unreachable'); }
    try {
      noteNow(res.headers);
      if (!res.ok) {
        let errBody = null;
        try { const b = await readCapped(res, 16 * 1024); errBody = JSON.parse(fromUtf8(b) || 'null'); } catch { errBody = null; }
        // A clock that is off, or a nonce the relay thinks it saw: sign again once (3.1).
        if (res.status === 401 && retry && errBody && (errBody.error === 'clock' || errBody.error === 'replay')) {
          if (errBody.error === 'clock' && Number.isFinite(errBody.now)) offset = errBody.now - now();
          return request(method, path, { query, body, signer: sg, want, max, retry: false });
        }
        throw errorFor(res.status, errBody, res.headers);
      }
      const b = await readCapped(res, max);
      if (want === 'bytes') return { status: res.status, headers: res.headers, data: b };
      const t = fromUtf8(b);
      if (t == null) throw new RelayError('bad', { status: res.status });
      if (want === 'text') return { status: res.status, headers: res.headers, data: t };
      try { return { status: res.status, headers: res.headers, data: t ? JSON.parse(t) : null }; } catch { throw new RelayError('bad', { status: res.status }); }
    } finally { clearTimeout(timer); }
  }

  const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  const int = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : null);
  const gpath = (gid, rest = '') => { if (!GID_RE.test(gid)) throw new RelayError('bad'); return `/v1/g/${gid}${rest}`; };
  const dpath = (gid, dev, rest) => { if (!DEV_RE.test(dev)) throw new RelayError('bad'); return gpath(gid, `/d/${dev}${rest}`); };
  const fpath = (file) => { if (!LOG_FILE_RE.test(file)) throw new RelayError('bad'); return file; };

  /** Lines of a log answer, checked: each `end` is where the line ends, and they add up from `from`. */
  function checkLines(lines, from) {
    const out = [];
    let at = from;
    for (const x of Array.isArray(lines) ? lines : []) {
      if (!isObj(x) || typeof x.line !== 'string' || x.line.length > MAX_LINE) throw new RelayError('bad');
      const end = int(x.end);
      const len = utf8(x.line).length + 1;
      // A line starts where the last one ended (or later, after a compaction gap at the start).
      if (end === null || end - len < at) throw new RelayError('bad');
      if (out.length && end - len !== at) throw new RelayError('bad');
      out.push({ line: x.line, start: end - len, end });
      at = end;
    }
    return out;
  }

  const client = {
    origin: base, host,
    get clockOffset() { return offset; },
    request,
    health: async () => (await request('GET', '/v1/health')).data,
    me: async () => (await request('GET', '/v1/me')).data,
    certs: async () => (await request('POST', '/v1/certs', { body: {} })).data,

    // ─── Sync group (5) ───
    group: async (gid) => (await request('GET', gpath(gid))).data,
    enrol: async (gid, { dev, kid, n, cap }) => (await request('POST', gpath(gid, '/enrol'), { body: { dev, kid, n, cap } })).data,
    setCap: async (gid, { kid, n, cap }) => (await request('POST', gpath(gid, '/cap'), { body: { kid, n, cap } })).data,
    revoke: async (gid, dev) => (await request('POST', gpath(gid, '/revoke'), { body: { dev } })).data,
    deleteDevice: async (gid, dev) => (await request('DELETE', dpath(gid, dev, ''))).data,
    async append(gid, dev, file, lines) {
      const r = (await request('POST', dpath(gid, dev, '/log'), { body: { file: fpath(file), lines } })).data;
      if (!isObj(r) || int(r.size) === null) throw new RelayError('bad');
      return { s: int(r.s), size: r.size, skipped: int(r.skipped) || 0 };
    },
    async files(gid) {
      const r = (await request('GET', gpath(gid, '/files'))).data;
      if (!isObj(r) || !isObj(r.devices)) throw new RelayError('bad');
      return r;
    },
    async readLog(gid, dev, file, from, max = 1024 * 1024) {
      const r = (await request('GET', dpath(gid, dev, `/log/${fpath(file)}`), { query: `from=${from}&max=${max}`, max: max + 1024 * 1024 })).data;
      if (!isObj(r) || int(r.size) === null) throw new RelayError('bad');
      const first = int(r.first) || 0;
      return { lines: checkLines(r.lines, Math.max(from, 0)), end: int(r.end) ?? from, size: r.size, first };
    },
    deleteLog: async (gid, dev, file, size) => (await request('DELETE', dpath(gid, dev, `/log/${fpath(file)}`), { query: `size=${size}` })).data,
    async putSlot(gid, dev, name, ver, text, { soft = false } = {}) {
      if (!SLOT_NAMES.includes(name)) throw new RelayError('bad');
      return (await request('PUT', dpath(gid, dev, `/s/${name}`), { query: `ver=${ver}${soft ? '&soft=1' : ''}`, body: text })).data;
    },
    async getSlot(gid, dev, name, max = SLOT_CAPS[name] || 64 * 1024) {
      if (!SLOT_NAMES.includes(name)) throw new RelayError('bad');
      const r = await request('GET', dpath(gid, dev, `/s/${name}`), { want: 'text', max });
      const ver = Number(r.headers.get('x-od-ver'));
      return { text: r.data, ver: Number.isSafeInteger(ver) ? ver : null };
    },
    deleteSlot: async (gid, dev, name) => (await request('DELETE', dpath(gid, dev, `/s/${name}`))).data,
    putBlob: async (gid, dev, loc, bytes) => { if (!LOC_RE.test(loc)) throw new RelayError('bad'); return (await request('PUT', dpath(gid, dev, `/b/${loc}`), { body: bytes })).data; },
    async getBlob(gid, dev, loc, max = BLOB_MAX) { if (!LOC_RE.test(loc)) throw new RelayError('bad'); return (await request('GET', dpath(gid, dev, `/b/${loc}`), { want: 'bytes', max })).data; },
    async listBlobs(gid, dev) {
      const r = (await request('GET', dpath(gid, dev, '/b'))).data;
      return (isObj(r) && Array.isArray(r.blobs) ? r.blobs : []).filter(b => isObj(b) && LOC_RE.test(b.loc || '') && int(b.size) !== null && b.size <= BLOB_MAX).map(b => ({ loc: b.loc, size: b.size, at: int(b.at) || 0 }));
    },
    deleteBlob: async (gid, dev, loc) => { if (!LOC_RE.test(loc)) throw new RelayError('bad'); return (await request('DELETE', dpath(gid, dev, `/b/${loc}`))).data; },
    async changes(gid, since, max = 1024 * 1024) {
      const r = (await request('GET', gpath(gid, '/changes'), { query: `since=${since}&max=${max}`, max: MAX_JSON })).data;
      if (!isObj(r) || int(r.s) === null) throw new RelayError('bad');
      return r;
    },
    ack: async (gid, dev, s) => (await request('POST', dpath(gid, dev, '/ack'), { body: { s } })).data,

    // ─── Join rendezvous (6) ───
    joinPut: async (slot, dev, ver, body, sg) => { if (!SLOT_RE.test(slot) || !DEV_RE.test(dev)) throw new RelayError('bad'); return (await request('PUT', `/v1/join/${slot}/${dev}`, { query: `ver=${ver}`, body, signer: sg })).data; },
    async joinGet(slot, sg) {
      if (!SLOT_RE.test(slot)) throw new RelayError('bad');
      const r = (await request('GET', `/v1/join/${slot}`, { signer: sg, max: 64 * 1024 })).data;
      return (isObj(r) && Array.isArray(r.docs) ? r.docs : []).filter(d => isObj(d) && DEV_RE.test(d.dev || '') && typeof d.body === 'string' && d.body.length <= 16 * 1024).slice(0, 8).map(d => ({ dev: d.dev, ver: int(d.ver) || 0, at: int(d.at) || 0, body: d.body }));
    },
    joinDelete: async (slot, dev, sg) => { if (!SLOT_RE.test(slot) || !DEV_RE.test(dev)) throw new RelayError('bad'); return (await request('DELETE', `/v1/join/${slot}/${dev}`, { signer: sg })).data; },

    /**
     * A live socket (7.7): challenge, signed answer, then JSON messages.
     * Returns {send(obj), close(), get open()}; onMessage(obj), onReady(ready), onClose(code).
     */
    socket(path, { dev = null, signer: sg, onMessage = () => {}, onReady = () => {}, onClose = () => {} } = {}) {
      if (typeof WebSocketImpl !== 'function') { setTimeout(() => onClose(0), 0); return { send: () => false, close: () => {}, get open() { return false; } }; }
      const url = base.replace(/^http/, 'ws') + path;
      let ws, ready = false, closed = false, pinger = null;
      const done = (code) => { if (closed) return; closed = true; ready = false; clearInterval(pinger); try { ws.close(); } catch { /* closed */ } onClose(code); };
      try { ws = new WebSocketImpl(url); } catch { setTimeout(() => done(0), 0); return { send: () => false, close: () => {}, get open() { return false; } }; }
      const authTimer = setTimeout(() => { if (!ready) done(4408); }, 20000);
      ws.onmessage = async (ev) => {
        const raw = typeof ev.data === 'string' ? ev.data : null;
        if (raw === null || raw.length > MAX_JSON) return;
        if (raw === 'pong') return;
        let m;
        try { m = JSON.parse(raw); } catch { return; }
        if (!isObj(m) || typeof m.t !== 'string') return;
        if (!ready) {
          if (m.t === 'challenge' && typeof m.c === 'string' && m.c.length <= 64) {
            if (Number.isFinite(m.now)) offset = m.now - now();
            try {
              const s = await getSigner(sg !== undefined ? sg : signer);
              const sig = await s.sign(`OPENDASH-RELAY-WS-1\n${host}\n${path}\n${m.c}`);
              ws.send(JSON.stringify({ t: 'auth', key: s.key, ...(s.cert ? { cert: s.cert } : {}), sig, ...(dev ? { dev } : {}) }));
            } catch { done(4401); }
          } else if (m.t === 'ready') {
            ready = true; clearTimeout(authTimer);
            pinger = setInterval(() => { try { ws.send('ping'); } catch { /* closing */ } }, 50000);
            if (pinger && typeof pinger.unref === 'function') pinger.unref();
            onReady(m);
          } else if (m.t === 'error') done(4401);
          return;
        }
        try { onMessage(m); } catch { /* a listener never breaks the socket */ }
      };
      ws.onclose = (ev) => { clearTimeout(authTimer); done(ev && ev.code ? ev.code : 1006); };
      ws.onerror = () => { /* onclose follows */ };
      return {
        send: (obj) => { if (!ready) return false; try { ws.send(JSON.stringify(obj)); return true; } catch { return false; } },
        close: () => { clearTimeout(authTimer); done(1000); },
        get open() { return ready && !closed; },
      };
    },
    groupSocket: (gid, dev, handlers) => client.socket(gpath(gid, '/ws'), { dev, ...handlers }),
    joinSocket: (slot, handlers) => { if (!SLOT_RE.test(slot)) throw new RelayError('bad'); return client.socket(`/v1/join/${slot}/ws`, handlers); },
  };
  return client;
}
