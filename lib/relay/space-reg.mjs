// lib/relay/space-reg.mjs - the relay's registry (one per relay, space "reg"):
// member grants, invites, device certificates seen and revoked, the friend-code
// directory, each identity's mailbox, and usage (docs/dev/RELAY_PROTOCOL.md
// sections 3.4, 4, 7.1, 7.5). Pure, like lib/relay/base.mjs.
//
// Keys:  m/<iid> grant   i/<id> invite   c/<cert id> certificate seen   cr/<cert id> revoked
//        d/<dir key> {iid, blob, at}   dk/<iid> dir key   mbx/<iid> {mbox}   u/<space> usage
//        v/<invite key> {iid, blob, exp, at}: a short invite link's sealed invite (section 7.8)
//        w/<iid> {iid, day, rows}: rows a member's requests wrote today, all spaces together (section 8.1)
//        m/<iid> may carry pending {scopes, quota, grantTtlMs}: let in by an invite whose friend request the
//        owner has not approved yet; until the owner confirms it (PUT .../members/<iid> {pending: false}) it
//        can only message (LIMITS.quota.pending, no friend-code lookups) and runs out by itself (4.2)
//        d/<dir key> or v/<invite key> {iid, gone}: a released code or link key, kept for its member
//        for 90 days (a tombstone), so nobody else can claim it and an old code never opens another card

import * as A from './auth.mjs';
import { Space, LIMITS, fail, reply, jsonBody, cleanScopes, defaultQuota, isObj, dayOf, B64_43 } from './base.mjs';

const DAY = 86400000;
export const FREE_TIER = Object.freeze({ workerRequests: 100000, objectRequests: 100000, rowsWritten: 100000, rowsRead: 5000000, storageBytes: 5e9 });
const DIR_RE = /^[0-9a-f]{64}$/;
const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const IID = '([A-Za-z0-9_-]{22})';
// A friend code's directory key or a short invite link's key, once released (a new code, a delete, an
// expiry, a member gone), stays reserved for the member who held it this long: only they may use it again.
const KEY_TOMB_MS = 90 * DAY, KEY_TOMBS_PER_MEMBER = 64;
const tombOld = (x, now) => !!(x && x.gone && x.gone < now - KEY_TOMB_MS);
const liveOver = (x, now) => !!(x && Number.isFinite(x.exp) && x.exp <= now);
// Live friend codes (2.20.1): at most 30 minutes; 3 lookups that find nothing per member per 10 minutes.
const LIVE_CODE_MAX_MS = 30 * 60000, LOOKUP_MISS_MS = 10 * 60000, LOOKUP_MISSES = 3;

export class Registry extends Space {
  constructor(name, deps) {
    super(name, deps);
    this.cache = null;
    this.redeems = new Map();
  }

  // ── the members snapshot (other spaces ask for it; cached here) ──
  async members() { return this.snapshot(); }
  snapshot() {
    const day = dayOf(this.now());
    if (this.cache && this.cache.day === day) return this.cache;
    const members = {}, used = {}, spent = {};
    let relayUsed = 0;
    for (const [, g] of this.store.list({ prefix: 'm/' })) members[g.key] = { iid: g.iid, scopes: g.scopes, quota: g.quota, exp: g.exp || null, revoked: g.revoked || null, ...(g.pending ? { pending: true } : {}) };
    for (const [, u] of this.store.list({ prefix: 'u/' })) { used[u.iid] = (used[u.iid] || 0) + (u.used || 0); relayUsed += u.used || 0; }
    for (const [, w] of this.store.list({ prefix: 'w/' })) if (w.day === day) spent[w.iid] = w.rows;
    const certRevoked = this.store.list({ prefix: 'cr/' }).map(([k]) => k.slice(3));
    this.cache = { members, used, relayUsed, relayMax: LIMITS.relayMax, certRevoked, day, spent };
    return this.cache;
  }
  /** Add a member's rows for today (one more for this record itself) -> {day, rows}. */
  spend(iid, rows) {
    if (!A.IID_RE.test(iid || '')) fail(400, 'bad_request');
    const snap = this.snapshot(), day = snap.day, k = 'w/' + iid, old = this.store.get(k);
    const w = { iid, day, rows: (old && old.day === day ? old.rows : 0) + Math.max(0, Math.min(rows | 0, 1e6)) + 1 };
    this.store.put(k, w);
    snap.spent[iid] = w.rows;
    return { day, rows: w.rows };
  }
  async charge(iid, rows) { this.spent.set(iid, this.spend(iid, rows)); }
  dirty() { this.cache = null; this.io.setAlarm(this.now() + DAY); }
  ownerIid() { return this.ownerIidMemo || (this.ownerIidMemo = A.iidOf(this.ownerKey)); }

  async internal(op, body) {
    const w = this.store.writes || 0;
    try { return await this.internalOp(op, body); } finally { this.foreign += (this.store.writes || 0) - w; }
  }
  async internalOp(op, body) {
    if (op === 'members') return this.snapshot();
    if (op === 'claim') {
      const { space, iid, kind } = body;
      if (this.store.get('u/' + space)) return { ok: true };
      const mine = this.store.list({ prefix: 'u/' }).filter(([, u]) => u.iid === iid && u.kind === kind).length;
      if (kind === 'g' && mine >= LIMITS.groupsPerIdentity) fail(403, 'forbidden', `This relay keeps at most ${LIMITS.groupsPerIdentity} sync groups per person.`);
      if (this.snapshot().relayUsed >= LIMITS.relayMax) fail(507, 'quota', 'This relay is full.');
      this.store.put('u/' + space, { iid, kind, used: 0, at: this.now(), day: '', req: 0, writes: 0 });
      this.dirty();
      return { ok: true };
    }
    if (op === 'report') {
      const { space, iid, kind, used, day, req, writes } = body;
      const old = this.store.get('u/' + space);
      this.store.put('u/' + space, { iid, kind, used: Math.max(0, used | 0), at: this.now(), day, req: req | 0, writes: writes | 0 });
      if (this.cache && old && old.iid === iid) {
        const d = Math.max(0, used | 0) - (old.used || 0);
        this.cache.used[iid] = (this.cache.used[iid] || 0) + d;
        this.cache.relayUsed += d;
      } else this.dirty();
      return { ok: true };
    }
    if (op === 'release') { this.store.del('u/' + body.space); this.dirty(); return { ok: true }; }
    if (op === 'spend') return this.spend(body.iid, body.rows);
    fail(404, 'not_found');
  }

  async handle(req) {
    const { method, path } = req, now = this.now();
    let m;
    if (path === '/v1/invites/redeem' && method === 'POST') return this.redeem(req);
    const p = await this.auth(req);
    if (method !== 'GET') await this.pay(p);
    if (path === '/v1/me' && method === 'GET') {
      this.need(p);
      // liveCodes (2.20.1): this relay keeps live friend codes live (a client must not show one on a relay without it).
      return reply(200, { iid: p.iid, role: p.role, device: p.device, scopes: p.scopes, quota: p.quota, used: this.snapshot().used[p.iid] || 0, exp: p.exp, liveCodes: 1 }, now);
    }
    if (path === '/v1/certs' && method === 'POST') return this.certSeen(p);
    if (path === '/v1/certs/revoke' && method === 'POST') return this.certRevoke(p, jsonBody(req));
    if (path === '/v1/mailbox' && method === 'GET') {
      this.need(p, 'message');
      if (!this.store.get('mbx/' + p.iid)) await this.pay(p);
      return reply(200, { mbox: await this.mailboxOf(p) }, now);
    }
    if ((m = /^\/v1\/codes\/([0-9a-f]{64})$/.exec(path))) return this.directory(req, p, m[1]);
    if ((m = /^\/v1\/inv\/([0-9a-f]{64})$/.exec(path))) return this.inviteLink(req, p, m[1]);
    if (path === '/v1/admin' || path.startsWith('/v1/admin/')) {
      if (p.role === 'anonymous') fail(403, 'not_member');
      if (p.role !== 'owner' || p.device) fail(403, 'forbidden', 'Only the relay owner can do this.');
      return this.admin(req, p);
    }
    fail(404, 'not_found');
  }

  // ── invites (4.2) ──
  async redeem(req) {
    const now = this.now();
    const ip = req.ip || 'unknown';
    let r = this.redeems.get(ip);
    if (!r || r.until < now) r = { n: 0, until: now + 3600000 };
    if (++r.n > LIMITS.redeemPerHour) fail(429, 'rate_limit');
    this.redeems.set(ip, r);
    if (this.redeems.size > 5000) for (const [k, v] of this.redeems) if (v.until < now) this.redeems.delete(k);
    const p = await this.auth(req);
    const b = jsonBody(req);
    if (p.identity === this.ownerKey) fail(409, 'exists', 'You own this relay.');
    if (p.device) fail(400, 'bad_request', 'Redeem an invite with the identity key, not a device key.');
    if (typeof b.token !== 'string' || !B64_43.test(b.token)) fail(410, 'gone');
    const h = await A.tokenHash('invite', b.token);
    let inv = null;
    for (const [, x] of this.store.list({ prefix: 'i/' })) if (A.sameText(x.h, h)) inv = x;
    if (!inv || inv.exp <= now) fail(410, 'gone');
    const old = this.store.get('m/' + p.iid);
    if (!old || old.revoked) {
      const active = this.store.list({ prefix: 'm/' }).filter(([, g]) => !g.revoked).length;
      if (active >= LIMITS.members) fail(507, 'quota', 'This relay has as many members as it can take.');
    }
    const scopes = old && !old.revoked ? [...new Set([...old.scopes, ...inv.scopes])].sort() : inv.scopes;
    let grant = {
      key: p.identity, iid: p.iid, scopes: cleanScopes(scopes),
      quota: Math.max(old && !old.revoked ? old.quota : 0, inv.quota || defaultQuota(scopes)),
      exp: inv.grantTtlMs ? now + inv.grantTtlMs : (old && !old.revoked ? old.exp || null : null),
      since: old && !old.revoked ? old.since : now, via: 'invite:' + inv.id, revoked: null,
    };
    if (inv.pending) {
      // Holding the link proves nothing about who holds it: what the invite allows waits for the owner's
      // approval of the friend request (PUT .../members/<iid> {pending: false}). Meanwhile: what they
      // already had here (an active, confirmed member), else a small message-only access that runs out.
      const had = old && !old.revoked && !old.pending && (!old.exp || old.exp > now) ? old : null;
      grant = {
        ...grant,
        scopes: had ? had.scopes : ['message'], quota: had ? had.quota : LIMITS.quota.pending,
        exp: had ? had.exp || null : now + LIMITS.inviteMaxMs,
        pending: { scopes: grant.scopes, quota: grant.quota, grantTtlMs: inv.grantTtlMs || null },
      };
    }
    this.store.tx(() => { this.store.del('i/' + inv.id); this.store.put('m/' + p.iid, grant); });
    this.dirty();
    const mbox = grant.scopes.includes('message') ? await this.mailboxOf({ ...p, scopes: grant.scopes }) : null;
    return reply(200, { role: 'member', iid: p.iid, scopes: grant.scopes, quota: grant.quota, exp: grant.exp, mbox, ...(grant.pending ? { pending: { scopes: grant.pending.scopes } } : {}) }, now);
  }

  // ── certificates (3.4) ──
  certSeen(p) {
    this.need(p);
    if (!p.device) fail(400, 'bad_request', 'Send this with a device certificate.');
    const now = this.now(), k = 'c/' + p.certId, old = this.store.get(k);
    if (!old) {
      const mine = this.store.list({ prefix: 'c/' }).filter(([, c]) => c.identity === p.iid).length;
      if (mine >= LIMITS.certsPerIdentity) fail(429, 'rate_limit', 'Too many devices recorded for this person. Revoke old ones first.');
    }
    if (!old || now - old.seen > DAY) return A.iidOf(p.key).then(device => { this.store.put(k, { cert: p.certId, identity: p.iid, device, iat: p.certIat, exp: p.certExp, seen: now }); this.dirty(); return reply(200, { ok: true }, now); });
    return reply(200, { ok: true }, now);
  }
  certRevoke(p, b) {
    this.need(p);
    if (typeof b.cert !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(b.cert)) fail(400, 'bad_request');
    const rec = this.store.get('c/' + b.cert);
    if (p.role !== 'owner' && (!rec || rec.identity !== p.iid)) fail(403, 'forbidden');
    this.store.put('cr/' + b.cert, { at: this.now(), by: p.iid });
    this.dirty();
    return reply(200, { ok: true }, this.now());
  }

  // ── mailboxes (7.1) ──
  async mailboxOf(p) {
    const k = 'mbx/' + p.iid, have = this.store.get(k);
    if (have) return have.mbox;
    const mbox = A.randomId(16);
    await this.io.call('mb:' + mbox, 'init', { owner: p.identity, iid: p.iid });
    this.store.tx(() => {
      this.store.put(k, { mbox, at: this.now() });
      this.store.put('u/mb:' + mbox, { iid: p.iid, kind: 'mb', used: 0, at: this.now(), day: '', req: 0, writes: 0 });
    });
    this.dirty();
    return mbox;
  }

  // ── released keys (7.5, 7.8): a tombstone {iid, gone} instead of a delete ──
  /** Keep key k reserved for its member (rec: what it holds now); an expired tombstone, or one over the cap, goes. */
  release(k, rec, now = this.now()) {
    if (!rec || !rec.iid) { this.store.del(k); return; }
    if (rec.gone) return;
    this.store.put(k, { iid: rec.iid, gone: now });
    const prefix = k.slice(0, 2);
    const mine = this.store.list({ prefix }).filter(([, x]) => x.gone && x.iid === rec.iid).sort((a, b) => a[1].gone - b[1].gone);
    for (const [ok] of mine.slice(0, Math.max(0, mine.length - KEY_TOMBS_PER_MEMBER))) this.store.del(ok);
  }
  /** May member iid take key k (rec: what it holds now)? Free, theirs, or released by someone else long enough ago. */
  mayTake(rec, iid, now = this.now()) { return !rec || rec.iid === iid || tombOld(rec, now); }

  /** A live friend code goes for good; an entry without exp is a lasting code (released, as ever). */
  dropLive(k, key, rec) {
    if (!Number.isFinite(rec.exp)) { this.release(k, rec, this.now()); if (this.store.get('dk/' + rec.iid) === key) this.store.del('dk/' + rec.iid); return; }
    this.store.del(k);
    if (this.store.get('dl/' + rec.iid) === key) this.store.del('dl/' + rec.iid);
  }

  // ── the directory (7.5) ──
  // 2.20.1: live friend codes (4 letters, lib/friends/core.mjs liveCodeKey) sit here too, put with
  // {exp, once}: gone after exp (at most 30 minutes) and after the first lookup that finds them.
  // One per member at a time (dl/<iid> names it), so nobody can sit on many of the 279,841 codes
  // and be found by someone typing theirs; and no tombstone: a dead short code is free for anyone.
  // A member's lookups that find nothing are counted: 3 in 10 minutes and their next lookups are
  // refused until the 10 minutes are over, so nobody can try more than 3 codes per 10 minutes.
  async directory(req, p, key) {
    this.need(p, 'message');
    const now = this.now(), k = 'd/' + key, rec = this.store.get(k);
    if (req.method === 'GET') {
      if (p.pending) fail(403, 'scope', 'Friend codes can be looked up once the relay owner approves your request.');
      if (!(await this.io.limit('lookup', p.iid)) || !(await this.io.limit('lookupIp', req.ip || 'unknown'))) fail(429, 'rate_limit');
      const mk = 'lm/' + p.iid, m0 = this.store.get(mk), m = m0 && now - m0.since < LOOKUP_MISS_MS ? m0 : null;
      if (m && m.n >= LOOKUP_MISSES) fail(429, 'too_many_misses', 'Too many codes that were not right. Wait 10 minutes, or ask for an invite link.');
      const live = rec && !rec.gone && !liveOver(rec, now);
      if (!live) {
        this.store.tx(() => {
          if (rec && !rec.gone) this.dropLive(k, key, rec);
          this.store.put(mk, { n: (m ? m.n : 0) + 1, since: m ? m.since : now });
        });
        fail(404, 'not_found');
      }
      if (rec.once) this.store.tx(() => this.dropLive(k, key, rec));
      return reply(200, { blob: rec.blob }, now);
    }
    if (req.method === 'PUT') {
      const b = jsonBody(req);
      if (b.blob === undefined || JSON.stringify(b.blob).length > LIMITS.dirBlob) fail(413, 'too_large');
      if (!liveOver(rec, now) && !this.mayTake(rec, p.iid, now)) fail(409, 'taken');
      const exp = Number.isFinite(b.exp) ? Math.min(Math.max(b.exp, now + 60000), now + LIVE_CODE_MAX_MS) : null;
      if (exp) {
        // A live code: kept apart from the member's lasting friend code (dk/ names that one).
        const prev = this.store.get('dl/' + p.iid);
        this.store.tx(() => {
          if (prev && prev !== key) { const pr = this.store.get('d/' + prev); if (pr && pr.iid === p.iid && Number.isFinite(pr.exp)) this.store.del('d/' + prev); }
          this.store.put(k, { iid: p.iid, blob: b.blob, at: now, exp, once: b.once === true });
          this.store.put('dl/' + p.iid, key);
        });
        return reply(200, { ok: true, exp }, now);
      }
      const old = this.store.get('dk/' + p.iid);
      this.store.tx(() => {
        if (old && old !== key) this.release('d/' + old, this.store.get('d/' + old), now);
        this.store.put(k, { iid: p.iid, blob: b.blob, at: now });
        this.store.put('dk/' + p.iid, key);
      });
      return reply(200, { ok: true }, now);
    }
    if (req.method === 'DELETE') {
      if (rec && rec.iid === p.iid && Number.isFinite(rec.exp)) this.store.tx(() => this.dropLive(k, key, rec));
      else if (rec && rec.iid === p.iid && !rec.gone) this.store.tx(() => { this.release(k, rec, now); if (this.store.get('dk/' + p.iid) === key) this.store.del('dk/' + p.iid); });
      return reply(200, { ok: true }, now);
    }
    fail(404, 'not_found');
  }

  // ── short invite links (7.8): an invite sealed by the inviter, under a hash of the link's token ──
  // The relay never sees the token, so it cannot open what it keeps. Anyone holding the link may
  // read it (the person invited is usually not a member yet); only its member may put or delete it.
  async inviteLink(req, p, key) {
    const now = this.now(), k = 'v/' + key, rec = this.store.get(k);
    if (req.method === 'GET') {
      if (!(await this.io.limit('lookupIp', req.ip || 'unknown'))) fail(429, 'rate_limit');
      if (!rec || rec.gone) fail(404, 'not_found');
      if (rec.exp <= now) { this.release(k, rec, now); fail(410, 'gone'); }
      return reply(200, { blob: rec.blob, exp: rec.exp }, now);
    }
    this.need(p, 'message');
    if (req.method === 'PUT') {
      const b = jsonBody(req);
      if (b.blob === undefined || JSON.stringify(b.blob).length > LIMITS.dirBlob) fail(413, 'too_large');
      if (!this.mayTake(rec, p.iid, now)) fail(409, 'taken');
      const exp = Number.isFinite(b.exp) ? Math.min(Math.max(b.exp, now + 60000), now + LIMITS.inviteMaxMs + DAY) : now + LIMITS.inviteMs;
      if (!rec || rec.gone) {
        let mine = 0;
        for (const [vk, x] of this.store.list({ prefix: 'v/' })) { if (x.gone) { if (tombOld(x, now)) this.store.del(vk); } else if (x.exp <= now) this.release(vk, x, now); else if (x.iid === p.iid) mine++; }
        if (mine >= LIMITS.invites) fail(429, 'rate_limit', 'Too many open invite links. Cancel some first.');
      }
      this.store.put(k, { iid: p.iid, blob: b.blob, exp, at: now });
      return reply(200, { ok: true, exp }, now);
    }
    if (req.method === 'DELETE') {
      if (rec && rec.iid === p.iid && !rec.gone) this.release(k, rec, now);
      return reply(200, { ok: true }, now);
    }
    fail(404, 'not_found');
  }

  // ── admin (4.3, owner key only) ──
  async admin(req, p) {
    const { method, path } = req, now = this.now();
    let m;
    if (path === '/v1/admin' && method === 'GET') return reply(200, await this.overview(), now);
    if (path === '/v1/admin/invites' && method === 'POST') {
      const b = jsonBody(req);
      const scopes = cleanScopes(b.scopes);
      if (!scopes) fail(400, 'bad_request', 'Choose what the invite allows: message, and optionally sync.');
      if (this.store.list({ prefix: 'i/' }).filter(([, x]) => x.exp > now).length >= LIMITS.invites) fail(429, 'rate_limit', 'Too many open invites. Cancel some first.');
      const ttl = Number.isFinite(b.ttlMs) ? Math.min(Math.max(b.ttlMs, 60000), LIMITS.inviteMaxMs) : LIMITS.inviteMs;
      const quota = Number.isFinite(b.quota) ? Math.min(Math.max(b.quota, 1024 * 1024), LIMITS.relayMax) : defaultQuota(scopes);
      const grantTtlMs = Number.isFinite(b.grantTtlMs) && b.grantTtlMs > 0 ? Math.min(b.grantTtlMs, 10 * 365 * DAY) : null;
      const token = A.randomId(32), id = A.randomId(8);
      this.store.put('i/' + id, { id, h: await A.tokenHash('invite', token), scopes, quota, exp: now + ttl, grantTtlMs, at: now, ...(b.pending === false ? {} : { pending: true }) });
      this.dirty();
      return reply(200, { id, token, exp: now + ttl }, now);
    }
    if ((m = /^\/v1\/admin\/invites\/([A-Za-z0-9_-]{11})$/.exec(path)) && method === 'DELETE') {
      this.store.del('i/' + m[1]);
      return reply(200, { ok: true }, now);
    }
    if ((m = new RegExp(`^/v1/admin/members/${IID}$`).exec(path))) {
      const k = 'm/' + m[1], old = this.store.get(k);
      if (method === 'PUT') {
        const b = jsonBody(req);
        let g = old;
        // {pending: false}: the owner approved the friend request of someone an invite let in; what the invite allowed applies now.
        if (b.pending === false && (!g || g.revoked)) fail(404, 'not_found');
        if (b.pending === false && g.pending) {
          const pd = g.pending;
          g = { ...g, scopes: cleanScopes(pd.scopes) || g.scopes, quota: Number.isFinite(pd.quota) ? pd.quota : g.quota, exp: pd.grantTtlMs ? now + pd.grantTtlMs : null };
          delete g.pending;
        }
        if (!g) {
          if (!A.KEY_RE.test(b.key || '') || (await A.iidOf(b.key)) !== m[1] || b.key === this.ownerKey) fail(400, 'bad_request', 'Give the member\'s identity key.');
          if (this.store.list({ prefix: 'm/' }).filter(([, x]) => !x.revoked).length >= LIMITS.members) fail(507, 'quota', 'This relay has as many members as it can take.');
          g = { key: b.key, iid: m[1], scopes: ['message'], quota: LIMITS.quota.message, exp: null, since: now, via: 'owner', revoked: null };
        }
        if (b.scopes !== undefined) { const s = cleanScopes(b.scopes); if (!s) fail(400, 'bad_request'); g = { ...g, scopes: s }; if (g.pending) { g = { ...g, quota: Math.max(g.quota, g.pending.quota || 0), exp: null }; delete g.pending; } }
        if (b.quota !== undefined) { if (!Number.isFinite(b.quota) || b.quota < 0) fail(400, 'bad_request'); g = { ...g, quota: Math.min(b.quota, LIMITS.relayMax) }; }
        if (b.exp !== undefined) { if (b.exp !== null && !Number.isFinite(b.exp)) fail(400, 'bad_request'); g = { ...g, exp: b.exp }; }
        this.store.put(k, g);
        this.dirty();
        return reply(200, { ok: true, member: this.memberView(g, this.snapshot()) }, now);
      }
      if (method === 'DELETE') {
        if (!old) fail(404, 'not_found');
        this.store.put(k, { ...old, revoked: old.revoked || now });
        this.dirty();
        // Their spaces forget the cached grant and close the member's open sockets now, not in 30 s.
        for (const [uk, u] of this.store.list({ prefix: 'u/' })) if (u.iid === old.iid) { try { await this.io.call(uk.slice(2), 'revoke', { iid: old.iid }); } catch { /* the cache runs out by itself */ } }
        return reply(200, { ok: true, undo: `/v1/admin/members/${m[1]}/restore`, until: (old.revoked || now) + LIMITS.revokedKeepMs }, now);
      }
    }
    if ((m = new RegExp(`^/v1/admin/members/${IID}/restore$`).exec(path)) && method === 'POST') {
      const k = 'm/' + m[1], old = this.store.get(k);
      if (!old) fail(410, 'gone');
      this.store.put(k, { ...old, revoked: null, ...(old.exp && old.exp <= now ? { exp: null } : {}) });
      this.dirty();
      return reply(200, { ok: true }, now);
    }
    fail(404, 'not_found');
  }
  memberView(g, snap) {
    const devices = this.store.list({ prefix: 'c/' }).filter(([, c]) => c.identity === g.iid).map(([, c]) => ({ cert: c.cert, device: c.device, iat: c.iat, exp: c.exp, seen: c.seen, revoked: !!this.store.get('cr/' + c.cert) }));
    return { iid: g.iid, key: g.key, scopes: g.scopes, quota: g.quota, used: snap.used[g.iid] || 0, since: g.since, exp: g.exp || null, via: g.via, revoked: g.revoked || null, devices, ...(g.pending ? { pending: { scopes: g.pending.scopes } } : {}) };
  }
  async overview() {
    const now = this.now(), snap = this.snapshot(), today = this.day.d, oiid = await this.ownerIid();
    const members = this.store.list({ prefix: 'm/' }).map(([, g]) => this.memberView(g, snap));
    const ownerDevices = this.memberView({ iid: oiid, key: this.ownerKey }, snap).devices;
    const invites = this.store.list({ prefix: 'i/' }).filter(([, x]) => x.exp > now).map(([, x]) => ({ id: x.id, scopes: x.scopes, quota: x.quota, exp: x.exp, grantTtlMs: x.grantTtlMs, at: x.at, ...(x.pending ? { pending: true } : {}) }));
    let requests = this.day.req, writes = this.writesToday(), spaces = 0;
    for (const [, u] of this.store.list({ prefix: 'u/' })) { spaces++; if (u.day === today) { requests += u.req || 0; writes += u.writes || 0; } }
    return {
      owner: { iid: oiid, used: snap.used[oiid] || 0, quota: LIMITS.quota.owner },
      members, ownerDevices, invites,
      relay: { used: snap.relayUsed, max: LIMITS.relayMax, spaces, today: { requests, writes }, limits: FREE_TIER },
    };
  }

  // ── daily housekeeping ──
  async housekeep(now) {
    for (const [k, x] of this.store.list({ prefix: 'i/' })) if (x.exp <= now) this.store.del(k);
    for (const [k, x] of this.store.list({ prefix: 'v/' })) { if (x.gone) { if (tombOld(x, now)) this.store.del(k); } else if (x.exp <= now) this.release(k, x, now); }
    for (const [k, x] of this.store.list({ prefix: 'd/' })) if (tombOld(x, now) || liveOver(x, now)) this.store.del(k);
    for (const [k, c] of this.store.list({ prefix: 'c/' })) if (c.exp <= now) this.store.del(k);
    for (const [k, r] of this.store.list({ prefix: 'cr/' })) if (r.at < now - 400 * DAY) this.store.del(k);
    for (const [k, w] of this.store.list({ prefix: 'w/' })) if (w.day !== dayOf(now)) this.store.del(k);
    for (const [k, g] of this.store.list({ prefix: 'm/' })) {
      const gone = (g.revoked && g.revoked < now - LIMITS.revokedKeepMs) || (g.exp && g.exp < now - LIMITS.revokedKeepMs);
      if (!gone) continue;
      for (const [uk, u] of this.store.list({ prefix: 'u/' })) {
        if (u.iid !== g.iid) continue;
        try { await this.io.call(uk.slice(2), 'purge', {}); this.store.del(uk); } catch { /* tried again tomorrow */ }
      }
      const dk = this.store.get('dk/' + g.iid), dl = this.store.get('dl/' + g.iid);
      const links = this.store.list({ prefix: 'v/' }).filter(([, x]) => x.iid === g.iid && !x.gone);
      // their code and links stay reserved for them (tombstones, 90 days): a returning member gets them back, nobody else
      this.store.tx(() => { if (dk) this.release('d/' + dk, this.store.get('d/' + dk), now); for (const [vk, x] of links) this.release(vk, x, now); if (dl) { this.store.del('d/' + dl); this.store.del('dl/' + g.iid); } this.store.del('dk/' + g.iid); this.store.del('mbx/' + g.iid); this.store.del('w/' + g.iid); this.store.del(k); });
    }
    this.cache = null;
    this.io.setAlarm(now + DAY);
  }
}

export const isAdminPath = (path) => path === '/v1/admin' || path.startsWith('/v1/admin/');
export { isObj };
