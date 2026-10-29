// cloudflare/worker.mjs - the OpenDash relay on Cloudflare Workers Free
// (docs/dev/RELAY_PROTOCOL.md). A thin adapter around lib/relay/core.mjs:
// the Worker routes each request to one SQLite-backed Durable Object per
// "space" (RelaySpace, binding SPACES); the object keeps that space's ordered
// key-value table, its hibernatable WebSockets and its alarm.
//
// Variables: OWNER_KEY (the owner's identity public key; public, a plain var).
// Optional rate-limit bindings RL_IP, RL_KEY, RL_ANON, RL_LOOKUP, RL_LOOKUP_IP
// (wrangler.toml); without them an in-memory limiter is used.
// Nothing is logged: no console calls; observability is off in wrangler.toml.
// No CORS headers: OpenDash calls the relay from Node.
//
// This is NOT the public Claude MCP relay (cloudflare/relay-worker.mjs).

import { front, createSpace, maxBody, readCapped, memLimiter, memberGate, ipBucket, SPACE_RE, RATES } from '../lib/relay/core.mjs';
import { errorReply, reply, RelayError } from '../lib/relay/base.mjs';
import { sha256b64u } from '../lib/relay/auth.mjs';

const FORWARD = ['content-type', 'upgrade', 'x-od-key', 'x-od-cert', 'x-od-time', 'x-od-nonce', 'x-od-body', 'x-od-sig', 'x-od-drop'];
const BINDINGS = { ip: 'RL_IP', key: 'RL_KEY', anon: 'RL_ANON', lookup: 'RL_LOOKUP', lookupIp: 'RL_LOOKUP_IP' };
const fallback = memLimiter(RATES);
async function limit(env, bucket, key) {
  const b = env[BINDINGS[bucket]];
  if (b && typeof b.limit === 'function') {
    try { return (await b.limit({ key: bucket + '|' + key })).success; } catch { return fallback(bucket, key); }
  }
  return fallback(bucket, key);
}
const toResponse = (r) => new Response(r.body ?? null, { status: r.status, headers: r.headers });
// Who may sign members-only requests, per isolate (core.mjs memberGate): a key that is neither the owner
// nor a member is refused here, before any Durable Object is asked (RELAY_PROTOCOL.md 8.1).
let gate = null;
async function regMembers(env) {
  const stub = env.SPACES.get(env.SPACES.idFromName('reg'));
  const r = await stub.fetch('https://relay.internal/internal/members', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OD-Space': 'reg', 'X-OD-Internal': '1' }, body: '{}' });
  if (!r.ok) throw new RelayError(r.status, 'relay_error');
  return r.json();
}

export default {
  async fetch(request, env) {
    const now = Date.now();
    try {
      const u = new URL(request.url);
      const ip = await sha256b64u('opendash-relay-ip\n' + ipBucket(request.headers.get('CF-Connecting-IP') || 'unknown'));
      if (!gate) { const e0 = env; gate = memberGate(() => regMembers(e0)); }
      const io = { now: () => Date.now(), ownerKey: env.OWNER_KEY, limit: (b, k) => limit(env, b, k), known: gate };
      const upgrade = (request.headers.get('upgrade') || '').toLowerCase() === 'websocket';
      // Unsigned requests stop here, before any Durable Object is looked up (or created).
      const f = await front(request.method, u.pathname, ip, io, { host: u.host, query: u.search.slice(1), headers: request.headers, upgrade });
      if (f.response) return toResponse(f.response);
      const headers = new Headers();
      for (const h of FORWARD) { const v = request.headers.get(h); if (v) headers.set(h, v); }
      headers.set('X-OD-Space', f.route.space);
      headers.set('X-OD-IP', ip);
      const stub = env.SPACES.get(env.SPACES.idFromName(f.route.space));
      const res = await stub.fetch(new Request(request, { headers }));
      if (res.status === 200 && u.pathname === '/v1/invites/redeem') gate.add(request.headers.get('x-od-key'));
      return res;
    } catch (e) { return toResponse(errorReply(e, now)); }
  },
};

/**
 * One space of the relay: SQLite table kv(k TEXT PRIMARY KEY, v) WITHOUT ROWID.
 * The table (and the space's name, `_name`) is made by the space's first write,
 * never by a read or a refused request: an object asked about a space that does
 * not exist stores nothing, so nothing is left behind (RELAY_PROTOCOL.md 8.2).
 */
export class RelaySpace {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.bootAt = Date.now();
    this.space = null;
    this.spaceName = null;
    this.hasTable = undefined;
    this.alarmAt = undefined;
    this.alarmChain = Promise.resolve();
    try { ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong')); } catch { /* older runtime */ }
  }

  store() {
    const self = this, ctx = this.ctx, sql = ctx.storage.sql;
    const dec = (v) => (v instanceof ArrayBuffer ? new Uint8Array(v) : typeof v === 'string' ? JSON.parse(v) : v);
    const enc = (v) => (v instanceof Uint8Array ? v : JSON.stringify(v));
    const has = () => {
      if (self.hasTable === undefined) self.hasTable = sql.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'kv'").toArray().length > 0;
      return self.hasTable;
    };
    const row = (k, v) => { const c = sql.exec('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)', k, enc(v)); c.toArray(); st.writes += c.rowsWritten || 1; };
    const st = {
      writes: 0,
      get(k) { if (!has()) return undefined; const r = sql.exec('SELECT v FROM kv WHERE k = ?', k).toArray(); return r.length ? dec(r[0].v) : undefined; },
      put(k, v) {
        if (!has()) {
          sql.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v) WITHOUT ROWID');
          self.hasTable = true;
          if (self.spaceName && k !== '_name') row('_name', self.spaceName);
        }
        row(k, v);
      },
      del(k) { if (!has()) return; const c = sql.exec('DELETE FROM kv WHERE k = ?', k); c.toArray(); st.writes += c.rowsWritten || 0; },
      list({ prefix, start, end, limit: n, reverse } = {}) {
        if (!has()) return [];
        const lo = prefix != null ? prefix : (start ?? ''), hi = prefix != null ? prefix + '￿' : (end ?? '￿');
        const q = `SELECT k, v FROM kv WHERE k >= ? AND k < ? ORDER BY k ${reverse ? 'DESC' : 'ASC'}${n ? ' LIMIT ?' : ''}`;
        return (n ? sql.exec(q, lo, hi, n) : sql.exec(q, lo, hi)).toArray().map(r => [r.k, dec(r.v)]);
      },
      // A rolled-back first write takes its CREATE TABLE with it: look again next time.
      tx: (fn) => { try { return ctx.storage.transactionSync(fn); } catch (e) { self.hasTable = undefined; throw e; } },
      // The whole database, its metadata and the alarm: an emptied space keeps nothing.
      deleteAll() {
        sql.exec('DROP TABLE IF EXISTS kv');
        self.hasTable = false;
        self.alarmAt = undefined;
        ctx.storage.deleteAll().catch(() => {});
        ctx.storage.deleteAlarm().catch(() => {});
      },
    };
    return st;
  }
  io() {
    const env = this.env, ctx = this.ctx;
    const wrap = (ws) => ({
      get att() { try { return ws.deserializeAttachment(); } catch { return null; } },
      setAtt(a) { ws.serializeAttachment(a); },
      send(t) { ws.send(t); },
      close(code, why) { ws.close(code, why); },
    });
    return {
      now: () => Date.now(),
      bootAt: this.bootAt,
      ownerKey: env.OWNER_KEY,
      limit: (b, k) => limit(env, b, k),
      sockets: () => ctx.getWebSockets().map(wrap),
      async call(space, op, body) {
        const stub = env.SPACES.get(env.SPACES.idFromName(space));
        const r = await stub.fetch('https://relay.internal/internal/' + op, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OD-Space': space, 'X-OD-Internal': '1' }, body: JSON.stringify(body || {}) });
        const v = await r.json().catch(() => ({}));
        if (!r.ok) throw new RelayError(r.status, v.error || 'relay_error', v.message);
        return v;
      },
      setAlarm: (t) => {
        this.alarmChain = this.alarmChain.then(async () => {
          if (this.alarmAt === undefined) this.alarmAt = await ctx.storage.getAlarm();
          if (this.alarmAt == null || t < this.alarmAt) { this.alarmAt = t; await ctx.storage.setAlarm(t); }
        }).catch(() => {});
      },
    };
  }
  /** This object's space (its name comes with each request, and is kept as `_name` by the space's first write). */
  spaceFor(name) {
    if (this.space) return this.space;
    const store = this.store();
    const known = store.get('_name');
    const n = known || name;
    if (!n || !SPACE_RE.test(n)) return null;
    this.spaceName = n;
    this.space = createSpace(n, { store, io: this.io() });
    return this.space;
  }

  async fetch(request) {
    const now = Date.now();
    try {
      const sp = this.spaceFor(request.headers.get('X-OD-Space'));
      if (!sp) return toResponse(reply(400, { error: 'bad_request', message: 'Unknown space.' }, now));
      const u = new URL(request.url);
      if (request.headers.get('X-OD-Internal') === '1') {
        const body = await request.json().catch(() => ({}));
        try { return toResponse(reply(200, await sp.internal(u.pathname.slice('/internal/'.length), body), Date.now())); }
        catch (e) { return toResponse(errorReply(e, Date.now())); }
      }
      const upgrade = (request.headers.get('upgrade') || '').toLowerCase() === 'websocket';
      const body = await readCapped(request.body, maxBody(request.method, u.pathname));
      const req = { method: request.method, host: u.host, path: u.pathname, query: u.search.slice(1), headers: request.headers, body, ip: request.headers.get('X-OD-IP') || 'unknown', upgrade };
      const r = await sp.fetch(req);
      if (r.upgrade) {
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        this.ctx.acceptWebSocket(server);
        server.serializeAttachment(r.upgrade.att);
        server.send(r.upgrade.hello);
        return new Response(null, { status: 101, webSocket: client });
      }
      return toResponse(r);
    } catch (e) { return toResponse(errorReply(e, now)); }
  }
  async webSocketMessage(ws, message) {
    const sp = this.spaceFor(null);
    if (!sp) { try { ws.close(4410, 'gone'); } catch { /* gone */ } return; }
    await sp.wsMessage({
      get att() { try { return ws.deserializeAttachment(); } catch { return null; } },
      setAtt(a) { ws.serializeAttachment(a); },
      send(t) { ws.send(t); },
      close(code, why) { ws.close(code, why); },
    }, typeof message === 'string' ? message : null);
  }
  async webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch { /* already closed */ }
  }
  async webSocketError(ws) {
    try { ws.close(1011, 'error'); } catch { /* already closed */ }
  }
  async alarm() {
    this.alarmAt = null;
    const sp = this.spaceFor(null);
    if (sp) await sp.alarm();
  }
}
