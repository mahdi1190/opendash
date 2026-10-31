// lib/relay/base.mjs - what every part ("space") of the OpenDash relay shares:
// limits, errors, answers, request and WebSocket authentication, member
// lookups, usage reports (docs/dev/RELAY_PROTOCOL.md). Pure: no node: imports,
// no Cloudflare APIs. A space talks to the world only through `store` and `io`:
//
//   store   synchronous ordered key-value table of this space
//           get(k) -> value|undefined   put(k, v)   del(k)   deleteAll()
//           list({prefix|start, end, limit, reverse}) -> [[k, v]]   tx(fn)
//           values are JSON values or Uint8Array; `writes` counts rows written
//   io      now(), bootAt (ms this instance started), ownerKey,
//           call(space, op, body) -> Promise<JSON>   another space's internal op
//           sockets() -> [{att, setAtt(a), send(text), close(code, reason)}]
//           limit(bucket, key) -> Promise<boolean>   rate limits (section 8.1)
//           setAlarm(ms)                             wake up at that time (earliest wins)

import * as A from './auth.mjs';

const KiB = 1024, MiB = 1024 * 1024, DAY = 86400000;
export const LIMITS = Object.freeze({
  bodyDefault: 64 * KiB, logBody: 2 * MiB, logLine: 1 * MiB, logLines: 500,
  slot: Object.freeze({ device: 64 * KiB, pair: 64 * KiB, keys: 256 * KiB, snapshot: 16 * MiB }),
  blob: 5 * MiB + KiB, post: 64 * KiB, dirBlob: 4 * KiB, joinDoc: 8 * KiB,
  partChars: 256 * KiB, partBytes: 1 * MiB,
  // pending: a member let in by an invite whose friend request the owner has not approved yet (4.2)
  quota: Object.freeze({ owner: 1024 * MiB, sync: 128 * MiB, message: 16 * MiB, pending: 1 * MiB }),
  relayMax: 4096 * MiB, members: 200, invites: 50, certsPerIdentity: 64,
  group: 64 * MiB, groupBlobs: 32 * MiB, groupDevices: 16, groupsPerIdentity: 4,
  mailbox: 4 * MiB, mailboxItems: 2000, drops: 500, dropPerDay: 100, dropPending: 1 * MiB,
  // A socket that has not signed in yet is someone holding a card or a link: 5 s to answer the challenge,
  // at most pendingPerIp of them per address (and space), and a full space makes room by closing the oldest
  // of them from another address, so strangers can never keep the owner's own devices out.
  socketsPerIdentity: 8, socketsPerSpace: 64, pendingPerIp: 4, wsAuthMs: 5000, wsMsg: 1 * MiB, wsChg: 256 * KiB,
  inviteMs: 7 * DAY, inviteMaxMs: 30 * DAY, revokedKeepMs: 7 * DAY, itemMs: 30 * DAY,
  dropMs: 365 * DAY, dropMaxMs: 3 * 365 * DAY, groupIdleMs: 180 * DAY, logKeepMs: 7 * DAY, tombMs: 30 * DAY,
  staleDeviceMs: 45 * DAY, softPersistMs: 30 * 60000, ackPersistMs: 10 * 60000,
  joinDocMs: 10 * 60000, joinSlotMs: 20 * 60000, joinOthers: 4, joinWrites: 60, joinAnonWrites: 30,
  feedDefault: 1 * MiB, feedMax: 4 * MiB, inlineSlot: 16 * KiB, readMax: 4 * MiB,
  redeemPerHour: 5, membersTtl: 30000, reportMs: 15 * 60000, reportBytes: 256 * KiB,
  // Rows a member (not the owner) may write a day, all their devices and spaces together (section 8.1):
  // a tenth of Workers Free's 100,000, so no one person can use up the day for everyone.
  memberRowsDay: 10000, pendingRowsDay: 1000,
  // The front door's copy of who may sign requests at all (8.1): kept this long, looked up again at most this often on a miss.
  frontMembersMs: 60000, frontRefreshMs: 5000,
  // Groups (docs/dev/GROUPS.md section 2). rg: a group's space. People a group let in are relay members with a small grant.
  rg: Object.freeze({
    members: 500, warnMembers: 100, perIdentity: 8, perRelay: 50, relayMembers: 1000,
    store: 32 * MiB, items: 2000, itemMs: 30 * DAY, post: 16 * KiB, profile: 6 * KiB, card: 8 * KiB, request: 6 * KiB, dm: 8 * KiB,
    small: 32 * KiB, keysBody: 256 * KiB, pending: 100, dmPending: 20, dmPerDay: 50, dmStore: 2 * MiB, postsPerMin: 30, postsPerDay: 300, groupPostsPerDay: 5000,
    profilesPerHour: 20, badPerHour: 5, joinPerHour: 60, sockets: 600, authKeep: 64, ownersKeep: 64, epochsKept: 4, idleMs: 365 * DAY, declinedMs: 7 * DAY,
    rekeysPerDay: 3, groupRekeysPerDay: 20, admitDepth: 4, admitMax: 2 * KiB, codesPerDay: 20,
    // A change makes every online member fetch. Small groups hear at once; a big one at most once per this many ms per person (at most 30 minutes): about 29,000 fetches a day at worst, whatever its size.
    fanoutFree: 10, fanoutPerPerson: 3000, fanoutMaxMs: 30 * 60000,
    quota: 8 * MiB, rowsApproved: 3000, rowsOpen: 1000, codeMissesDay: 200, codeIpMisses: 6, feedBytes: 1 * MiB,
  }),
});
export const SCOPES = Object.freeze(['message', 'sync']);
const SCOPE_ALIAS = { message: 'message', sync: 'sync', 'friend-mailbox': 'message', 'device-sync': 'sync' };
/** Scope names as stored (aliases accepted), or null when one is unknown. */
export function cleanScopes(list) {
  if (!Array.isArray(list) || !list.length || list.length > 4) return null;
  const out = new Set();
  for (const s of list) { const v = SCOPE_ALIAS[s]; if (!v) return null; out.add(v); }
  return SCOPES.filter(s => out.has(s));
}
export const defaultQuota = (scopes) => (scopes.includes('sync') ? LIMITS.quota.sync : LIMITS.quota.message);
export const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '');
export const pad = (n) => String(n).padStart(13, '0');
export const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
export const DEV_RE = /^[0-9a-f]{16}$/;
export const B64_43 = /^[A-Za-z0-9_-]{43}$/;

// ─── Errors and answers ────────────────────────────────────────────────────
const MESSAGES = {
  bad_request: 'The request is not in the form this relay expects.',
  clock: "This computer's clock is more than 5 minutes off the relay's.",
  replay: 'This request was already used. Sign it again.',
  body: 'The body does not match its signature.',
  signature: 'The signature does not check.',
  cert: 'The device certificate is not valid.',
  not_member: 'This relay is private. Ask its owner for an invite.',
  scope: 'Your access to this relay does not include this.',
  forbidden: 'This is not yours.',
  not_found: 'Not found.',
  stale: 'A newer version is already stored.',
  taken: 'That name is already in use.',
  exists: 'That already exists.',
  gone: 'This has expired, was used already, or was taken back.',
  too_large: 'That is too big for this relay.',
  content_type: 'Wrong content type.',
  rate_limit: 'Too many requests. Wait a little and try again.',
  relay_busy: 'The relay is resting (its free-tier allowance for today may be used up). Try again later.',
  quota: 'The storage allowed here is full.',
  relay_error: 'Something went wrong in the relay.',
};
export class RelayError extends Error {
  constructor(status, code, message, extra = null) { super(message || MESSAGES[code] || code); this.status = status; this.code = code; this.extra = extra; }
}
export const fail = (status, code, message, extra) => { throw new RelayError(status, code, message, extra); };
/** 429 until midnight UTC: a member's rows for today are used up (8.1). */
export function failBudget(now) {
  const e = new RelayError(429, 'rate_limit', "This account's share of the relay for today is used up. It opens again after midnight UTC.");
  e.retryAfter = Math.max(60, Math.ceil((DAY - (now % DAY)) / 1000));
  throw e;
}

const BASE_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
export const reply = (status, value, now, headers = {}) => ({ status, headers: { 'Content-Type': 'application/json', ...BASE_HEADERS, 'X-OD-Now': String(now), ...headers }, body: JSON.stringify(value) });
export const replyRaw = (status, body, type, now, headers = {}) => ({ status, headers: { 'Content-Type': type, ...BASE_HEADERS, 'X-OD-Now': String(now), ...headers }, body });
export function errorReply(e, now) {
  if (e instanceof RelayError) {
    const h = {};
    if (e.status === 429 || e.status === 503) h['Retry-After'] = String(e.retryAfter || (e.status === 429 ? 30 : 300));
    return reply(e.status, { error: e.code, message: e.message, ...(e.extra || {}) }, now, h);
  }
  // Cloudflare's own limits surface as exceptions from storage or stubs.
  if (/exceed|limit|overload|too many/i.test(String(e && e.message))) return reply(503, { error: 'relay_busy', message: MESSAGES.relay_busy }, now, { 'Retry-After': '300' });
  return reply(500, { error: 'relay_error', message: MESSAGES.relay_error }, now);
}

// ─── Request helpers ───────────────────────────────────────────────────────
const td = new TextDecoder('utf-8', { fatal: true });
export function text(req) { try { return td.decode(req.body); } catch { fail(400, 'bad_request'); } }
export function jsonBody(req) {
  const type = (req.headers.get('content-type') || '').split(';')[0].trim();
  if (req.body.length && type !== 'application/json') fail(415, 'content_type');
  if (!req.body.length) return {};
  let v; try { v = JSON.parse(text(req)); } catch { fail(400, 'bad_request'); }
  if (!isObj(v)) fail(400, 'bad_request');
  return v;
}
export const qnum = (req, name, dflt, max = Number.MAX_SAFE_INTEGER) => {
  const v = new URLSearchParams(req.query).get(name);
  if (v == null || v === '') return dflt;
  if (!/^\d{1,15}$/.test(v)) fail(400, 'bad_request');
  return Math.min(Number(v), max);
};
export const qflag = (req, name) => new URLSearchParams(req.query).get(name) === '1';

// ─── A space ───────────────────────────────────────────────────────────────
export class Space {
  constructor(name, { store, io }) {
    this.name = name;
    this.kind = name.split(':')[0];
    this.store = store;
    this.io = io;
    this.ownerKey = io.ownerKey;
    this.nonces = new Map();
    this.nonceFloor = (io.bootAt || io.now()) - 1000;
    this.snap = null; this.snapAt = 0;
    this.day = { d: '', req: 0, w0: 0 };
    this.rep = { used: -1, at: 0, req: 0 };
    this.queue = Promise.resolve();
    this.payer = null;          // iid of the member the current request's writes are charged to (pay())
    this.spent = new Map();     // iid -> {day, rows}: the registry's last word on a member's rows today
    this.foreign = 0;           // rows written by internal calls (they may land while a request waits): never charged to it
  }
  now() { return this.io.now(); }
  tick() { const d = dayOf(this.now()); if (this.day.d !== d) this.day = { d, req: 0, w0: this.store.writes || 0 }; this.day.req++; }
  writesToday() { return (this.store.writes || 0) - (this.day.w0 || 0); }

  /** One request, message or alarm at a time (internal calls do not wait: they never take the lock, so spaces cannot deadlock). */
  lock(fn) { const r = this.queue.then(fn, fn); this.queue = r.catch(() => {}); return r; }
  fetch(req) {
    return this.lock(async () => {
      this.tick();
      this.payer = null;
      const w0 = this.store.writes || 0, f0 = this.foreign;
      let r;
      try { r = req.upgrade ? await this.upgrade(req) : await this.handle(req); }
      catch (e) { r = errorReply(e, this.now()); }
      await this.settle(w0, f0);
      return r;
    });
  }
  async internal(op, body) {
    if (op === 'revoke') return this.memberRevoked(body);
    fail(404, 'not_found');
  }
  /** The registry took a member's access back: no cached grant here, and their open sockets close now. */
  memberRevoked(body) {
    this.snap = null; this.snapAt = 0;
    const iid = body && typeof body.iid === 'string' ? body.iid : null;
    if (iid) for (const s of this.sockets(a => a.authed && a.iid === iid)) { try { s.close(4403, 'revoked'); } catch { /* gone */ } }
    return { ok: true };
  }
  async handle(req) { fail(404, 'not_found'); }

  // ── who is asking ──
  /** The registry's view of members (cached for 30 s): {members: {key: grant}, certRevoked: [...], used: {iid: bytes}, relayUsed, relayMax}. */
  async members() {
    if (this.snap && this.now() - this.snapAt < LIMITS.membersTtl) return this.snap;
    this.snap = await this.io.call('reg', 'members', {});
    this.snapAt = this.now();
    return this.snap;
  }
  async who(identity) {
    const iid = await A.iidOf(identity);
    if (identity === this.ownerKey) return { role: 'owner', scopes: [...SCOPES], quota: LIMITS.quota.owner, iid, exp: null };
    const g = (await this.members()).members[identity];
    if (g && !g.revoked && (!g.exp || g.exp > this.now())) return { role: 'member', scopes: g.scopes, quota: g.quota, iid, exp: g.exp || null, ...(g.pending ? { pending: true } : {}), ...(g.gm ? { groupOnly: g.gm } : {}) };
    return { role: 'anonymous', scopes: [], quota: 0, iid, exp: null };
  }
  /** The principal behind a certificate or a bare key (no replay check: WebSockets and requests do their own). */
  async principal(key, cert) {
    let identity = key, device = false, certId = null, certIat = 0, certExp = 0;
    if (cert) {
      const c = await A.checkCert(cert, this.now());
      if (!c.ok || c.device !== key) fail(401, 'cert');
      identity = c.identity; device = true; certId = c.id; certIat = c.iat; certExp = c.exp;
    }
    const p = await this.who(identity);
    if (certId && p.role !== 'anonymous' && (await this.members()).certRevoked.includes(certId)) fail(401, 'cert');
    return { ...p, key, identity, device, certId, certIat, certExp };
  }
  /** Check a request (RELAY_PROTOCOL.md 3.1) and say who sent it. */
  async auth(req) {
    const now = this.now();
    const s = await A.checkSignature({ host: req.host, method: req.method, path: req.path, query: req.query, headers: req.headers, body: req.body, now });
    if (!s.ok) fail(401, s.error, null, s.error === 'clock' ? { now } : null);
    if (s.time < this.nonceFloor) fail(401, 'replay', null, { now });
    const nk = s.key + '|' + s.nonce;
    if (this.nonces.has(nk)) fail(401, 'replay', null, { now });
    this.remember(nk, s.time, now);
    if (!(await this.io.limit('key', s.key))) fail(429, 'rate_limit');
    const p = await this.principal(s.key, s.cert);
    // Device keys cost nothing to make: a member's keys share one limit (8.1).
    if (p.role === 'member' && !(await this.io.limit('key', 'id|' + p.iid))) fail(429, 'rate_limit');
    return p;
  }
  remember(nk, time, now) {
    if (this.nonces.size > 50000) { this.nonces.clear(); this.nonceFloor = now; }
    if (this.nonces.size > 1000) for (const [k, t] of this.nonces) { if (t > now - 2 * A.SKEW_MS) break; this.nonces.delete(k); }
    this.nonces.set(nk, time);
  }
  need(p, scope) {
    if (p.role === 'anonymous') fail(403, 'not_member');
    if (scope && !p.scopes.includes(scope)) fail(403, 'scope');
  }
  /** Room left for this identity: its quota, the relay's total, and `delta` more bytes from this space. */
  async room(p, delta, ownUsed) {
    if (delta <= 0) return;
    const snap = await this.members();
    const known = snap.used[p.iid] || 0;
    const local = this.rep.used >= 0 ? ownUsed - this.rep.used : 0;
    if (known + local + delta > p.quota) fail(507, 'quota', 'Your storage on this relay is full.');
    if (snap.relayUsed + local + delta > snap.relayMax) fail(507, 'quota', 'This relay is full.');
  }

  // ── rows written a day (8.1): a member's writes, all spaces together, are counted by the registry ──
  /**
   * Before a write: charge this request's rows to `p` (a member; the owner is not
   * counted, and anonymous writers are held by their space's own limits) and
   * refuse when their rows for today are used up. `check` false: count only.
   */
  async pay(p, check = true) {
    if (!p || p.role !== 'member' || !p.iid) return;
    this.payer = p.iid;
    if (!check) return;
    const now = this.now(), day = dayOf(now), snap = await this.members(), seen = this.spent.get(p.iid);
    const rows = Math.max(snap.day === day && snap.spent ? (snap.spent[p.iid] || 0) : 0, seen && seen.day === day ? seen.rows : 0);
    if (rows >= (p.pending ? LIMITS.pendingRowsDay : p.groupOnly === 'open' ? LIMITS.rg.rowsOpen : p.groupOnly ? LIMITS.rg.rowsApproved : LIMITS.memberRowsDay)) failBudget(now);
  }
  /** Add `rows` to `iid`'s count for today (the registry keeps it; it overrides this to count locally). */
  async charge(iid, rows) {
    const r = await this.io.call('reg', 'spend', { iid, rows });
    if (r && typeof r.day === 'string' && Number.isFinite(r.rows)) this.spent.set(iid, { day: r.day, rows: r.rows });
  }
  /** After a request or socket message: what it wrote goes on the payer's count. Never throws. */
  async settle(w0, f0) {
    const iid = this.payer, rows = (this.store.writes || 0) - w0 - (this.foreign - f0);
    this.payer = null;
    if (!iid || rows <= 0) return;
    if (this.spent.size > 1000) this.spent.clear();
    try { await this.charge(iid, rows); } catch { /* not counted this once */ }
  }

  // ── usage (reported to the registry; section 4.3) ──
  usage() { return null; }      // {iid, used} of the identity this space is charged to
  async report(force = false) {
    const u = this.usage();
    if (!u || !u.iid) return;
    const now = this.now(), r = this.rep;
    const due = force || r.used < 0 || Math.abs(u.used - r.used) >= LIMITS.reportBytes || (now - r.at >= LIMITS.reportMs && (u.used !== r.used || this.day.req !== r.req));
    if (!due) return;
    try {
      await this.io.call('reg', 'report', { space: this.name, iid: u.iid, kind: this.kind, used: u.used, day: this.day.d, req: this.day.req, writes: this.writesToday() });
      this.rep = { used: u.used, at: now, req: this.day.req };
    } catch { /* the next write tries again */ }
  }

  // ── WebSockets (section 7.7) ──
  sockets(filter) { return this.io.sockets().filter(s => { const a = s.att; return !!a && (!filter || filter(a)); }); }
  broadcast(filter, msg) {
    const t = JSON.stringify(msg);
    for (const s of this.sockets(a => a.authed && filter(a))) { try { s.send(t); } catch { /* closed */ } }
  }
  /** How many sockets this kind of space holds (a group has more people online than a person has devices). */
  socketCap() { return LIMITS.socketsPerSpace; }
  /** Checks before accepting an upgrade (the space exists...); throws to refuse. */
  async canUpgrade(req) { fail(404, 'not_found'); }
  async upgrade(req) {
    if (req.method !== 'GET' || !req.path.endsWith('/ws')) fail(404, 'not_found');
    await this.canUpgrade(req);
    if (!(await this.io.limit('ip', 'ws|' + req.ip))) fail(429, 'rate_limit');
    const now = this.now(), ip = req.ip || 'unknown';
    const all = this.sockets(), authed = all.filter(s => s.att.authed), fresh = [];
    for (const s of all) {
      if (s.att.authed) continue;
      if (now - s.att.at > LIMITS.wsAuthMs) { try { s.close(4401, 'auth timeout'); } catch { /* gone */ } } else fresh.push(s);
    }
    // Not signed in yet: counted per address (a hashed IP bucket), never per space.
    if (fresh.filter(s => s.att.ip === ip).length >= LIMITS.pendingPerIp) fail(429, 'rate_limit');
    if (authed.length + fresh.length >= this.socketCap()) {
      // Full: the oldest socket of another address that has not signed in gives way; only signed-in sockets can fill a space.
      const out = fresh.filter(s => s.att.ip !== ip).sort((a, b) => a.att.at - b.att.at)[0];
      if (!out) fail(429, 'rate_limit');
      try { out.close(4429, 'busy'); } catch { /* gone */ }
    }
    const c = A.randomId(32);
    this.io.setAlarm(now + LIMITS.wsAuthMs + 1000);
    return { upgrade: { att: { authed: false, c, at: now, ip, host: req.host, path: req.path }, hello: JSON.stringify({ t: 'challenge', c, now }) } };
  }
  /** Kind-specific checks of an authenticated socket: returns extra attachment fields, or throws. */
  async socketFor(p, m) { fail(403, 'forbidden'); }
  ready(att) { return {}; }
  async onSocket(sock, att, m) {}
  wsMessage(sock, data) { return this.lock(() => this.wsNow(sock, data)); }
  async wsNow(sock, data) {
    const a = sock.att;
    if (!a || typeof data !== 'string' || data.length > LIMITS.wsMsg) { try { sock.close(1009, 'too large'); } catch { /* gone */ } return; }
    this.tick();
    let m;
    try { m = JSON.parse(data); } catch { m = null; }
    if (!isObj(m) || typeof m.t !== 'string') { try { sock.close(4400, 'bad message'); } catch { /* gone */ } return; }
    const now = this.now();
    if (!a.authed) {
      try {
        if (now - a.at > LIMITS.wsAuthMs || m.t !== 'auth') fail(401, 'signature');
        if (!(await A.verify(m.key, m.sig, A.wsText(a.host, a.path, a.c)))) fail(401, 'signature');
        const p = await this.principal(m.key, typeof m.cert === 'string' ? m.cert : null);
        const extra = await this.socketFor(p, m);
        if (this.sockets(x => x.authed && x.iid === p.iid).length >= LIMITS.socketsPerIdentity) fail(429, 'rate_limit');
        const att = { authed: true, at: now, key: p.key, identity: p.identity, iid: p.iid, role: p.role, ...extra };
        sock.setAtt(att);
        sock.send(JSON.stringify({ t: 'ready', ...this.ready(att), now }));
      } catch (e) {
        const code = e instanceof RelayError ? e.code : 'relay_error';
        try { sock.send(JSON.stringify({ t: 'error', error: code })); sock.close(e instanceof RelayError && e.status === 403 ? 4403 : 4401, code); } catch { /* gone */ }
      }
      return;
    }
    if (!(await this.io.limit('key', a.key)) || (a.role === 'member' && !(await this.io.limit('key', 'id|' + a.iid)))) { try { sock.send(JSON.stringify({ t: 'err', id: m.id ?? null, error: 'rate_limit' })); } catch { /* gone */ } return; }
    this.payer = null;
    const w0 = this.store.writes || 0, f0 = this.foreign;
    try { await this.onSocket(sock, a, m); }
    catch (e) { try { sock.send(JSON.stringify({ t: 'err', id: m.id ?? null, error: e instanceof RelayError ? e.code : 'relay_error' })); } catch { /* gone */ } }
    await this.settle(w0, f0);
  }
  wsClose(sock) {}
  /** Alarm: close sockets that never authenticated, then the kind's own housekeeping. */
  alarm() { return this.lock(() => this.alarmNow()); }
  async alarmNow() {
    const now = this.now();
    for (const s of this.sockets(a => !a.authed && now - a.at > LIMITS.wsAuthMs)) { try { s.close(4401, 'auth timeout'); } catch { /* gone */ } }
    await this.housekeep(now);
  }
  async housekeep(now) {}
}

// ─── Large values: strings and bytes cut into parts ────────────────────────
export function putParts(store, prefix, value, oldParts = 0) {
  const parts = [];
  if (typeof value === 'string') for (let i = 0; i < value.length || i === 0; i += LIMITS.partChars) parts.push(value.slice(i, i + LIMITS.partChars));
  else for (let i = 0; i < value.length || i === 0; i += LIMITS.partBytes) parts.push(value.slice(i, i + LIMITS.partBytes));
  parts.forEach((p, i) => store.put(prefix + i, p));
  for (let i = parts.length; i < oldParts; i++) store.del(prefix + i);
  return parts.length;
}
export function getParts(store, prefix, n, bytes = false) {
  const parts = [];
  for (let i = 0; i < n; i++) { const p = store.get(prefix + i); if (p === undefined) return null; parts.push(p); }
  if (!bytes) return parts.join('');
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let at = 0; for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
export function delParts(store, prefix, n) { for (let i = 0; i < n; i++) store.del(prefix + i); }
