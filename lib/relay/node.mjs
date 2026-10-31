// lib/relay/node.mjs - the OpenDash relay on a computer (docs/dev/RELAY_PROTOCOL.md):
// the Node adapter of lib/relay/core.mjs, for self-hosting and for running the
// whole friends and sync system end to end without Cloudflare
// (`node tools/relay-local.mjs --port 4199 --owner-key <key>`).
//
// Each space keeps its ordered key-value table in memory and an append-only
// journal on disk (<data>/spaces/<hash>.jsonl: ["name", name], then
// ["p", key, "j"|"b", value] and ["d", key] lines; rewritten when it grows;
// made by the space's first write and removed when the space is emptied).
// A space that has stored nothing is not kept in memory after its request.
// Same semantics as the Durable Object store: values are copied in and out,
// tx(fn) is all or nothing. Nothing is logged. Node stdlib only.

import http from 'node:http';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { networkInterfaces } from 'node:os';
import { front, createSpace, maxBody, memLimiter, ipBucket, SPACE_RE, RATES } from './core.mjs';
import { errorReply, fail, LIMITS } from './base.mjs';
import { acceptWebSocket } from './node-ws.mjs';

// ─── The store ─────────────────────────────────────────────────────────────
function bsearch(keys, k) { let lo = 0, hi = keys.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (keys[mid] < k) lo = mid + 1; else hi = mid; } return lo; }
const pack = (v) => (v instanceof Uint8Array ? { t: 'b', s: Buffer.from(v) } : { t: 'j', s: JSON.stringify(v) });
const unpack = (e) => (e.t === 'b' ? new Uint8Array(e.s) : JSON.parse(e.s));
const line = (op, k, e) => JSON.stringify(op === 'd' ? ['d', k] : ['p', k, e.t, e.t === 'b' ? e.s.toString('base64') : e.s]) + '\n';

export function fileStore(file, name) {
  const map = new Map();
  let keys = [], lines = 0, tx = null;
  // The journal is made by the first write, never by a read or a refused request (RELAY_PROTOCOL.md 8.2).
  let made = existsSync(file);
  const make = () => { if (!made) { writeFileSync(file, JSON.stringify(['name', name]) + '\n'); lines = 1; made = true; } };
  if (made) {
    for (const raw of readFileSync(file, 'utf8').split('\n')) {
      if (!raw) continue;
      let r; try { r = JSON.parse(raw); } catch { continue; }       // a line cut short by a crash
      lines++;
      if (r[0] === 'p') { if (!map.has(r[1])) keys.splice(bsearch(keys, r[1]), 0, r[1]); map.set(r[1], { t: r[2], s: r[2] === 'b' ? Buffer.from(r[3], 'base64') : r[3] }); }
      else if (r[0] === 'd') { if (map.delete(r[1])) keys.splice(bsearch(keys, r[1]), 1); }
      else if (r[0] === 'x') { map.clear(); keys = []; }
    }
  }
  const out = (text) => { if (tx) tx.text.push(text); else { make(); appendFileSync(file, text); lines++; maybeCompact(); } };
  function maybeCompact() {
    if (lines < 4 * map.size + 2000) return;
    const tmp = file + '.tmp';
    writeFileSync(tmp, JSON.stringify(['name', name]) + '\n' + keys.map(k => line('p', k, map.get(k))).join(''));
    renameSync(tmp, file);
    lines = map.size + 1;
  }
  const set = (k, e) => {
    if (tx && !tx.undo.has(k)) tx.undo.set(k, map.get(k));
    if (e) { if (!map.has(k)) keys.splice(bsearch(keys, k), 0, k); map.set(k, e); }
    else if (map.delete(k)) keys.splice(bsearch(keys, k), 1);
  };
  const st = {
    writes: 0,
    get(k) { const e = map.get(k); return e ? unpack(e) : undefined; },
    put(k, v) { const e = pack(v); set(k, e); st.writes++; out(line('p', k, e)); },
    del(k) { if (!map.has(k)) return; set(k, null); st.writes++; out(line('d', k)); },
    list({ prefix, start, end, limit, reverse } = {}) {
      const lo = prefix != null ? prefix : (start ?? ''), hi = prefix != null ? prefix + '￿' : (end ?? '￿');
      const a = bsearch(keys, lo), b = bsearch(keys, hi), res = [];
      if (reverse) { for (let i = b - 1; i >= a && (!limit || res.length < limit); i--) res.push([keys[i], unpack(map.get(keys[i]))]); }
      else for (let i = a; i < b && (!limit || res.length < limit); i++) res.push([keys[i], unpack(map.get(keys[i]))]);
      return res;
    },
    tx(fn) {
      if (tx) return fn();
      tx = { undo: new Map(), text: [] };
      try {
        const r = fn();
        const text = tx.text.join('');
        tx = null;
        if (text) { make(); appendFileSync(file, text); lines += text.split('\n').length - 1; maybeCompact(); }
        return r;
      } catch (e) {
        const undo = tx.undo; tx = null;
        for (const [k, old] of undo) { if (old) { if (!map.has(k)) keys.splice(bsearch(keys, k), 0, k); map.set(k, old); } else if (map.delete(k)) keys.splice(bsearch(keys, k), 1); }
        throw e;
      }
    },
    deleteAll() { map.clear(); keys = []; if (made) { try { unlinkSync(file); } catch { /* gone */ } } made = false; lines = 0; },
    /** True once something was written (the space exists on disk). */
    kept: () => made,
  };
  return st;
}

// ─── The relay ─────────────────────────────────────────────────────────────
const hashName = (s) => createHash('sha256').update(s).digest('hex').slice(0, 32);
const hashIp = (ip) => createHash('sha256').update('opendash-relay-ip\n' + ip).digest('base64url');

/**
 * The Host names (host or host:port, lower case) this relay answers to. Requests are signed for
 * their host (3.1) and that host must be one of these, never just whatever Host header came in:
 * else a request or WebSocket answer signed for ANOTHER relay could be replayed here.
 * Loopback names always; the address it listens on; with a wildcard address, this computer's own
 * addresses; plus `extra` (--public-host: the name a reverse proxy passes on).
 */
export function relayHosts({ host = '127.0.0.1', port, extra = [] }) {
  const out = new Set();
  const add = (h) => {
    h = String(h || '').trim().toLowerCase().split('%')[0];
    if (!h) return;
    const b = h.includes(':') ? `[${h.replace(/^\[|\]$/g, '')}]` : h;
    out.add(`${b}:${port}`);
    if (port === 80) out.add(b);
  };
  for (const h of ['127.0.0.1', 'localhost', '::1']) add(h);
  if (host === '0.0.0.0' || host === '::' || host === '') { for (const list of Object.values(networkInterfaces())) for (const a of list || []) add(a.address); }
  else add(host);
  for (const h of extra) { const v = String(h || '').trim().toLowerCase(); if (v) out.add(v); }
  return out;
}

/** The relay in this process: {onRequest(req, res), onUpgrade(req, socket, head), close()}. hosts: relayHosts() (null: any Host, tests only). */
export function createNodeRelay({ ownerKey, dataDir, now = () => Date.now(), rates = RATES, hosts = null }) {
  const dir = join(dataDir, 'spaces');
  mkdirSync(dir, { recursive: true });
  const spaces = new Map(), sockets = new Map(), timers = new Map(), busy = new Map();
  const limiter = memLimiter(rates);
  const bootAt = now();
  const limit = async (b, k) => limiter(b, k);

  function schedule(name, t) {
    const cur = timers.get(name);
    if (cur && cur.t <= t) return;
    if (cur) clearTimeout(cur.h);
    const h = setTimeout(() => { timers.delete(name); const sp = spaces.get(name); if (sp) sp.alarm().catch(() => {}); }, Math.min(Math.max(t - now(), 0), 2 ** 31 - 1));
    h.unref?.();
    timers.set(name, { t, h });
  }
  function space(name) {
    let sp = spaces.get(name);
    if (sp) return sp;
    if (!SPACE_RE.test(name)) throw new Error('not a relay space');
    const io = {
      now, bootAt, ownerKey, limit,
      sockets: () => [...(sockets.get(name) || [])],
      call: async (other, op, body) => {
        const o = hold(other);
        try { return JSON.parse(JSON.stringify(await o.internal(op, JSON.parse(JSON.stringify(body || {}))))); } finally { release(other); }
      },
      setAlarm: (t) => schedule(name, t),
    };
    sp = createSpace(name, { store: fileStore(join(dir, hashName(name) + '.jsonl'), name), io });
    spaces.set(name, sp);
    return sp;
  }
  /** A space for one request or call; release() forgets it again when it has stored nothing and nothing else uses it. */
  function hold(name) { const sp = space(name); busy.set(name, (busy.get(name) || 0) + 1); return sp; }
  function release(name) {
    const n = (busy.get(name) || 1) - 1;
    if (n > 0) { busy.set(name, n); return; }
    busy.delete(name);
    const sp = spaces.get(name);
    if (sp && name !== 'reg' && !sp.store.kept() && !(sockets.get(name) || new Set()).size && !timers.has(name)) spaces.delete(name);
  }
  // Spaces written before a restart get their housekeeping again (alarms are not kept on disk).
  for (const f of readdirSync(dir).filter(f => /^[0-9a-f]{32}\.jsonl$/.test(f))) {
    try {
      const first = readFileSync(join(dir, f), 'utf8').split('\n', 1)[0];
      const r = JSON.parse(first);
      if (r[0] === 'name' && SPACE_RE.test(r[1])) { space(r[1]); schedule(r[1], now() + 60000); }
    } catch { /* not ours */ }
  }

  const headerGetter = (h) => ({ get: (n) => { const v = h[String(n).toLowerCase()]; return Array.isArray(v) ? v[0] : (v ?? null); } });
  const toNode = (res, r) => {
    const body = r.body == null ? '' : r.body;
    res.writeHead(r.status, { ...r.headers, 'Content-Length': Buffer.byteLength(typeof body === 'string' ? body : Buffer.from(body)) });
    res.end(typeof body === 'string' ? body : Buffer.from(body));
  };
  async function readNode(req, max) {
    const chunks = [];
    let size = 0;
    for await (const c of req) { size += c.length; if (size > max) fail(413, 'too_large'); chunks.push(c); }
    return new Uint8Array(Buffer.concat(chunks));
  }
  function reqOf(req, u, body, ip, upgrade) {
    return { method: req.method, host: String(req.headers.host || '').toLowerCase(), path: u.pathname, query: u.search.slice(1), headers: headerGetter(req.headers), body, ip, upgrade };
  }
  // In one process the registry's snapshot costs nothing to ask, so it is asked every time (no cache to go stale).
  const known = async (identity, hosting = false) => {
    const r = hold('reg');
    try { const g = (await r.internal('members', {})).members[identity]; return !!g && !g.revoked && (!g.exp || g.exp > now()) && !(hosting && g.gm); } finally { release('reg'); }
  };
  const frontIo = { now, ownerKey, limit, known };

  // A Host this relay does not answer to: refused before anything else (the signature covers the host, see relayHosts).
  const hostOf = (req) => { const h = String(req.headers.host || '').toLowerCase(); if (hosts && !hosts.has(h)) fail(421, 'bad_request', 'This relay does not answer to that host name.'); return h; };
  const frontReq = (req, u, upgrade) => ({ host: hostOf(req), query: u.search.slice(1), headers: headerGetter(req.headers), upgrade });

  async function onRequest(req, res) {
    try {
      const u = new URL(req.url, 'http://relay.local');
      const ip = hashIp(ipBucket(req.socket.remoteAddress || 'unknown'));
      const f = await front(req.method, u.pathname, ip, frontIo, frontReq(req, u, false));
      if (f.response) return toNode(res, f.response);
      const cap = maxBody(req.method, u.pathname);
      if (Number(req.headers['content-length']) > cap) fail(413, 'too_large');   // refused before it is read, and before any space
      const body = await readNode(req, cap);
      const name = f.route.space, sp = hold(name);
      try { toNode(res, await sp.fetch(reqOf(req, u, body, ip, false))); } finally { release(name); }
    } catch (e) {
      try { toNode(res, errorReply(e, now())); } catch { res.destroy(); }
    }
  }
  async function onUpgrade(req, socket, head) {
    const refuse = (r) => {
      const body = typeof r.body === 'string' ? r.body : '';
      try { socket.end(`HTTP/1.1 ${r.status} Refused\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`); } catch { /* gone */ }
    };
    let held = null;
    try {
      const u = new URL(req.url, 'http://relay.local');
      const ip = hashIp(ipBucket(req.socket.remoteAddress || 'unknown'));
      const f = await front('GET', u.pathname, ip, frontIo, frontReq(req, u, true));
      if (f.response) return refuse(f.response);
      const sp = hold(held = f.route.space);
      const r = await sp.fetch(reqOf(req, u, new Uint8Array(0), ip, true));
      if (!r.upgrade) return refuse(r);
      const ws = acceptWebSocket(req, socket, head, { maxMessage: LIMITS.wsMsg });
      if (!ws) return;
      const set = sockets.get(f.route.space) || new Set();
      sockets.set(f.route.space, set);
      const sock = { att: r.upgrade.att, setAtt(a) { sock.att = a; }, send: (t) => ws.send(t), close: (c, w) => ws.close(c, w) };
      set.add(sock);
      ws.on('message', (t) => {
        if (t === 'ping') { ws.send('pong'); return; }
        sp.wsMessage(sock, typeof t === 'string' ? t : null).catch(() => {});
      });
      ws.on('close', () => { set.delete(sock); sp.wsClose(sock); });
      ws.send(r.upgrade.hello);
    } catch (e) { refuse(errorReply(e, now())); }
    finally { if (held) release(held); }
  }
  function close() {
    for (const { h } of timers.values()) clearTimeout(h);
    for (const set of sockets.values()) for (const s of set) { try { s.close(1001, 'relay stopping'); } catch { /* gone */ } }
  }
  return { onRequest, onUpgrade, close };
}

/** Listen on host:port: {server, close()}. */
export async function startRelayServer({ port = 4199, host = '127.0.0.1', ownerKey, dataDir, rates = RATES, publicHosts = [] }) {
  const relay = createNodeRelay({ ownerKey, dataDir, rates, hosts: relayHosts({ host, port, extra: publicHosts }) });
  const server = http.createServer((req, res) => { relay.onRequest(req, res); });
  server.on('upgrade', (req, socket, head) => { relay.onUpgrade(req, socket, head); });
  server.headersTimeout = 20000;
  server.requestTimeout = 60000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  return { server, relay, close: () => new Promise(r => { relay.close(); server.close(() => r()); }) };
}
