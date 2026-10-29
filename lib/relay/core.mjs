// lib/relay/core.mjs - the OpenDash relay, pure (docs/dev/RELAY_PROTOCOL.md).
// Web Crypto only, no node: imports and no Cloudflare APIs, so the same code
// runs in the Cloudflare Worker + Durable Object adapter (cloudflare/worker.mjs)
// and in the Node adapter (lib/relay/node.mjs, tools/relay-local.mjs).
//
// An adapter does three things:
//   1. front(method, path, ip, io, {host, query, headers, upgrade}): answers
//      health and the two plain pages, applies the per-IP limits (ipBucket),
//      refuses unsigned requests, and says which SPACE a request goes to
//      (`reg`, `g:<gid>`, `join:<hash>`, `mb:<mbox>`);
//   2. reads the body (at most maxBody(method, path) bytes) and gives the space
//      {method, host, path, query, headers: {get(name)}, body: Uint8Array, ip, upgrade};
//   3. keeps one createSpace(name, {store, io}) per space, passes it requests,
//      WebSocket messages, alarms and internal calls (space.internal(op, body)).
//      A store keeps nothing (no table, no file, not the space's name) until
//      its first put: a request for a space that does not exist leaves no trace.
// Nothing here logs.

import * as A from './auth.mjs';
import { LIMITS, reply, replyRaw, errorReply, fail, RelayError } from './base.mjs';
import { Registry } from './space-reg.mjs';
import { Group } from './space-group.mjs';
import { Join, Mailbox } from './space-friends.mjs';

export const API = 1;
export const SPACE_RE = /^(reg|g:[A-Za-z0-9_-]{43}|join:[A-Za-z0-9_-]{43}|mb:[A-Za-z0-9_-]{16,64})$/;
/** Requests a minute per bucket and key (section 8.1): Cloudflare rate-limit bindings or memLimit(). */
export const RATES = Object.freeze({ ip: 300, key: 240, anon: 20, lookup: 20, lookupIp: 10 });

export function createSpace(name, deps) {
  if (!SPACE_RE.test(name)) throw new Error('not a relay space');
  if (name === 'reg') return new Registry(name, deps);
  if (name.startsWith('g:')) return new Group(name, deps);
  if (name.startsWith('join:')) return new Join(name, deps);
  return new Mailbox(name, deps);
}

const SEG = '(?:/[A-Za-z0-9._~-]+)*';
const ROUTES = [
  [new RegExp(`^/v1/g/([A-Za-z0-9_-]{43})${SEG}$`), (m) => ({ space: 'g:' + m[1], anon: false })],
  [new RegExp(`^/v1/join/([A-Za-z0-9_-]{22})${SEG}$`), async (m) => ({ space: 'join:' + await A.sha256b64u('opendash-relay-slot-v1\n' + m[1]), anon: true })],
  // a post carries a drop token (anyone a member gave one); everything else in a mailbox is its owner's (presence too)
  [new RegExp(`^/v1/mb/([A-Za-z0-9_-]{16,64})${SEG}$`), (m) => ({ space: 'mb:' + m[1], anon: /\/post$/.test(m[0]) })],
  [/^\/v1\/(?:me|certs|certs\/revoke|mailbox|invites\/redeem|admin|admin\/[A-Za-z0-9_\/-]+|codes\/[0-9a-f]{64})$/, (m) => ({ space: 'reg', anon: m[0] === '/v1/invites/redeem' })],
  // short invite links (section 7.8): read by anyone holding the link, so the anonymous limit applies
  [/^\/v1\/inv\/[0-9a-f]{64}$/, () => ({ space: 'reg', anon: true })],
];
/** Which space a path belongs to: {space, anon} | {page: 'i'|'j'} | {health: true} | null. */
export async function routeOf(path) {
  if (path === '/i' || path === '/j') return { page: path.slice(1), anon: true };
  if (path === '/v1/health') return { health: true, anon: true };
  for (const [re, fn] of ROUTES) { const m = re.exec(path); if (m) return fn(m); }
  return null;
}
/** The most body a request may carry (0: none). */
export function maxBody(method, path) {
  if (method === 'GET' || method === 'DELETE' || method === 'HEAD') return 0;
  if (/\/s\/snapshot$/.test(path)) return LIMITS.slot.snapshot;
  if (/\/s\/(?:device|pair|keys)$/.test(path)) return LIMITS.slot.keys;
  if (/\/b\/[0-9a-f]{32}$/.test(path)) return LIMITS.blob;
  if (/^\/v1\/g\/[A-Za-z0-9_-]{43}\/d\/[0-9a-f]{16}\/log$/.test(path)) return LIMITS.logBody;
  if (/\/post$/.test(path)) return LIMITS.post + 1024;
  if (/^\/v1\/join\//.test(path)) return LIMITS.joinDoc;
  if (/^\/v1\/codes\//.test(path) || /^\/v1\/inv\//.test(path)) return LIMITS.dirBlob + 1024;
  return LIMITS.bodyDefault;
}

const PAGES = {
  i: 'This is an OpenDash invite link.\n\nOpen OpenDash, go to Friends > Paste invite, and paste the whole link.\n',
  j: 'This is an OpenDash join link.\n\nOpen OpenDash on your new computer and paste this link there, then type the 4-letter code your other computer shows.\n',
};
const PAGE_HEADERS = { 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'X-Frame-Options': 'DENY' };

/**
 * The adapter's first step: {response} (health, a page, refused) or {route}.
 * `ip` is already hashed by the adapter (it is never stored). `req` is
 * {host, query, headers: {get(name)}, upgrade}: a request for a space must be
 * signed (3.1) before any space is looked up, so a stranger's unsigned request
 * never reaches (or creates) one. The WebSocket upgrade is the one unsigned
 * request: it signs in on the socket (7.7), and a space that does not exist refuses it.
 * With io.known(identity) (memberGate below), a signed request for a members-only
 * path from a key that is neither the owner nor a member stops here too (8.1):
 * throwaway keys cost the relay a Worker request, never a Durable Object request.
 */
export async function front(method, path, ip, io, req = {}) {
  const now = io.now();
  try {
    if (!A.KEY_RE.test(io.ownerKey || '')) fail(503, 'relay_busy', 'This relay has no owner key yet.');
    const route = await routeOf(path);
    if (!route) fail(404, 'not_found');
    if (!(await io.limit('ip', ip)) || (route.anon && !(await io.limit('anon', ip)))) fail(429, 'rate_limit');
    if (route.page) {
      if (method !== 'GET') fail(404, 'not_found');
      return { response: replyRaw(200, PAGES[route.page], 'text/plain; charset=utf-8', now, PAGE_HEADERS) };
    }
    if (route.health) {
      if (method !== 'GET') fail(404, 'not_found');
      return { response: reply(200, { service: 'opendash-relay', api: API, now }, now) };
    }
    if (!(req.upgrade === true && method === 'GET' && path.endsWith('/ws'))) {
      const s = await A.checkSignedHeaders({ host: req.host || '', method, path, query: req.query || '', headers: req.headers || { get: () => null }, now });
      if (!s.ok) fail(401, s.error, null, s.error === 'clock' ? { now } : null);
      if (!route.anon && typeof io.known === 'function') {
        let identity = s.key;
        if (s.cert) { const c = await A.checkCert(s.cert, now); if (!c.ok || c.device !== s.key) fail(401, 'cert'); identity = c.identity; }
        if (identity !== io.ownerKey) {
          const k = await io.known(identity);
          if (k === 'busy') { const e = new RelayError(429, 'rate_limit'); e.retryAfter = Math.ceil(LIMITS.frontRefreshMs / 1000); throw e; }
          if (!k) fail(403, 'not_member');
        }
      }
    }
    return { route };
  } catch (e) { return { response: errorReply(e, now) }; }
}

/**
 * The front door's view of who may sign members-only requests: known(identity) ->
 * true | false | 'busy'. `load()` gives the registry's members snapshot (a Durable
 * Object request on Cloudflare), kept for LIMITS.frontMembersMs and looked up again
 * on a miss at most every LIMITS.frontRefreshMs, so a flood of unknown keys costs at
 * most one registry lookup per isolate in that time. A member let in moments ago
 * may be told 'busy' (429, retry in a few seconds) once; the space still decides.
 */
export function memberGate(load, now = () => Date.now()) {
  let keys = null, at = 0, tried = 0, loading = null;
  const active = (g, t) => !!g && !g.revoked && (!g.exp || g.exp > t);
  async function refresh() {
    if (!loading) {
      tried = now();
      loading = (async () => {
        try {
          const snap = await load(), t = now(), next = new Set();
          for (const [k, g] of Object.entries((snap && snap.members) || {})) if (active(g, t)) next.add(k);
          keys = next; at = t;
        } finally { loading = null; }
      })();
    }
    return loading;
  }
  async function known(identity) {
    const t = now();
    if (keys && t - at < LIMITS.frontMembersMs && keys.has(identity)) return true;
    if (t - tried < LIMITS.frontRefreshMs) return 'busy';
    try { await refresh(); } catch { return 'busy'; }
    return keys.has(identity);
  }
  /** A key the registry just let in (a redeem this isolate passed on): known here at once. */
  known.add = (identity) => { if (keys) keys.add(identity); };
  return known;
}

/**
 * The address a per-IP limit counts (before the adapter hashes it): an IPv4
 * address as it is; IPv6 by its /64, since one home or phone is given a whole /64.
 */
export function ipBucket(ip) {
  let s = String(ip || '').trim().toLowerCase();
  if (/^::ffff:\d{1,3}(\.\d{1,3}){3}$/.test(s)) return s.slice(7);
  if (!s.includes(':')) return s;
  s = s.split('%')[0];
  const halves = s.split('::');
  if (halves.length > 2) return s;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const groups = halves.length === 2 ? [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill('0'), ...tail] : head;
  return groups.slice(0, 4).map(g => (parseInt(g, 16) || 0).toString(16)).join(':') + '::/64';
}

/** An in-memory per-minute limiter (the Node adapter, or a Worker without rate-limit bindings). */
export function memLimiter(rates = RATES) {
  const windows = new Map();
  return (bucket, key) => {
    const now = Date.now(), k = bucket + '|' + key;
    let w = windows.get(k);
    if (!w || w.until < now) { w = { n: 0, until: now + 60000 }; windows.set(k, w); }
    if (windows.size > 50000) { for (const [x, v] of windows) if (v.until < now) windows.delete(x); if (windows.size > 50000) windows.clear(); }
    return ++w.n <= (rates[bucket] || 60);
  };
}

/** Read a body stream with a cap (adapters): Uint8Array, or throws 413. */
export async function readCapped(stream, max) {
  if (!stream) return new Uint8Array(0);
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel().catch(() => {}); fail(413, 'too_large'); }
      chunks.push(value);
    }
  } finally { try { reader.releaseLock(); } catch { /* released */ } }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.byteLength; }
  return out;
}

export { LIMITS, errorReply, reply };
