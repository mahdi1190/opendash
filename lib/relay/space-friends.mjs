// lib/relay/space-friends.mjs - the join rendezvous (space "join:<SHA-256(slot)>",
// docs/dev/RELAY_PROTOCOL.md section 6) and a person's mailbox (space
// "mb:<mbox>", section 7). Both hold only what clients sealed. Pure.

import * as A from './auth.mjs';
import { Space, LIMITS, fail, reply, jsonBody, text, qnum, pad, isObj, dayOf, B64_43 } from './base.mjs';

const DAY = 86400000, HOUR = 3600000;
const te = new TextEncoder();

// ─── Join slots (6) ────────────────────────────────────────────────────────
// st = {opened, closes, opener, closed: null | {why, at}, docs: {dev: {dev, key, ver, at, exp, body}}}
export class Join extends Space {
  constructor(name, deps) {
    super(name, deps);
    this.st = undefined;
    this.writes = [];
    this.anon = new Map();
  }
  state() { if (this.st === undefined) this.st = this.store.get('st') || null; return this.st; }
  save() { this.store.put('st', this.st); }
  /** Whose rows a write in this slot uses: the member who opened it, else the writer when a member. */
  payerOf(st, p) { return st.payer ? { role: 'member', iid: st.payer } : p; }
  view() { return Object.values(this.st.docs).map(d => ({ dev: d.dev, ver: d.ver, at: d.at, body: d.body })); }
  closeSlot(why) {
    const now = this.now();
    this.st = { ...this.st, closed: { why, at: now }, docs: {} };
    this.save();
    this.broadcast(() => true, { t: 'closed', why });
    for (const s of this.sockets()) { try { s.close(4410, why); } catch { /* gone */ } }
    this.io.setAlarm(now + HOUR);
  }
  /** Open and not expired, else 404 / 410 (closing it on the way when it ran out). */
  live() {
    const st = this.state(), now = this.now();
    if (!st) fail(404, 'not_found');
    if (st.closed) fail(410, 'gone', null, { why: st.closed.why });
    const opener = st.docs[st.opener];
    if (now > st.closes || !opener || opener.exp <= now) { this.closeSlot('expired'); fail(410, 'gone', null, { why: 'expired' }); }
    return st;
  }
  async handle(req) {
    const m = /^\/v1\/join\/[A-Za-z0-9_-]{22}(?:\/([0-9a-f]{16}))?$/.exec(req.path);
    if (!m) fail(404, 'not_found');
    const dev = m[1] || null, now = this.now();
    const p = await this.auth(req);
    if (!dev && req.method === 'GET') { this.live(); return reply(200, { docs: this.view(), now }, now); }
    if (dev && req.method === 'PUT') return this.put(req, p, dev);
    if (dev && req.method === 'DELETE') {
      const st = this.live(), d = st.docs[dev];
      if (!d) return reply(200, { ok: true }, now);
      if (d.key !== p.key) fail(403, 'forbidden');
      await this.pay(this.payerOf(st, p));
      if (dev === st.opener) this.closeSlot('done');
      else { delete st.docs[dev]; this.save(); this.broadcast(() => true, { t: 'gone', dev }); }
      return reply(200, { ok: true }, now);
    }
    fail(404, 'not_found');
  }
  async put(req, p, dev) {
    const now = this.now();
    this.writes = this.writes.filter(t => t > now - 600000);
    if (this.writes.length >= LIMITS.joinWrites) fail(429, 'rate_limit');
    if (p.role === 'anonymous') {
      const a = (this.anon.get(req.ip) || []).filter(t => t > now - 600000);
      if (a.length >= LIMITS.joinAnonWrites) fail(429, 'rate_limit');
      a.push(now); this.anon.set(req.ip, a);
    }
    this.writes.push(now);
    const ver = qnum(req, 'ver', -1);
    if (ver < 0) fail(400, 'bad_request');
    if (req.body.length > LIMITS.joinDoc) fail(413, 'too_large');
    const body = text(req);
    let doc; try { doc = JSON.parse(body); } catch { fail(400, 'bad_request'); }
    if (!isObj(doc) || doc.v !== 2 || doc.t !== 'pair' || doc.dev !== dev) fail(400, 'bad_request', 'A join document is a pair.json of this device.');
    let st = this.state();
    if (!st) {
      this.need(p, 'sync');
      if (!p.device) fail(400, 'bad_request', 'Open a join link with a device key and its certificate.');
      await this.pay(p);
      // `payer`: the member who opened the slot; every write in it counts against their rows for the day (8.1).
      st = { opened: now, closes: now + LIMITS.joinDocMs, opener: dev, payer: p.role === 'member' ? p.iid : null, closed: null, docs: {} };
    } else {
      st = this.live();
      const old = st.docs[dev];
      if (old) {
        if (old.key !== p.key) fail(403, 'forbidden');
        if (ver <= old.ver) fail(409, 'stale');
      } else if (Object.keys(st.docs).some(d => d !== st.opener)) {
        // One attempt per link: a second device ends it for everyone.
        this.closeSlot('second');
        fail(409, 'taken', 'Someone else tried this link: start again.');
      }
      await this.pay(this.payerOf(st, p));
    }
    st.docs[dev] = { dev, key: p.key, ver, at: now, exp: now + LIMITS.joinDocMs, body };
    this.st = st;
    this.save();
    this.broadcast(() => true, { t: 'doc', dev, ver, at: now, body });
    this.io.setAlarm(Math.min(st.closes, ...Object.values(st.docs).map(d => d.exp)) + 1000);
    return reply(200, { ok: true, ver }, now);
  }
  async canUpgrade() { this.live(); }
  async socketFor() { this.live(); return {}; }
  ready() { return { docs: this.view() }; }
  async onSocket() { fail(400, 'bad_request'); }
  async housekeep(now) {
    const st = this.state();
    if (!st) return;
    if (st.closed) {
      if (now - st.closed.at >= HOUR) { this.store.deleteAll(); this.st = null; }
      else this.io.setAlarm(st.closed.at + HOUR);
      return;
    }
    const opener = st.docs[st.opener];
    if (now > st.closes || !opener || opener.exp <= now) { this.closeSlot('expired'); return; }
    let changed = false;
    for (const [dev, d] of Object.entries(st.docs)) if (d.exp <= now) { delete st.docs[dev]; changed = true; this.broadcast(() => true, { t: 'gone', dev }); }
    if (changed) this.save();
    this.io.setAlarm(Math.min(st.closes, ...Object.values(st.docs).map(d => d.exp)) + 1000);
  }
}

// ─── Mailboxes (7) ─────────────────────────────────────────────────────────
// meta {mbox, owner (identity key), iid, s, used, count, created, presence}
// i/<s> {at, exp, env, size, drop}   dr/<id> {id, h, exp, at, day, n, pending}
export class Mailbox extends Space {
  constructor(name, deps) {
    super(name, deps);
    this.mbox = name.slice(3);
    this.meta = undefined;
  }
  m() { if (this.meta === undefined) this.meta = this.store.get('meta') || null; return this.meta; }
  saveMeta() { this.store.put('meta', this.meta); }
  usage() { const m = this.m(); return m ? { iid: m.iid, used: m.used } : null; }

  async internal(op, body) {
    if (op === 'init') {
      if (!this.m()) {
        if (!A.KEY_RE.test(body.owner || '')) fail(400, 'bad_request');
        this.meta = { mbox: this.mbox, owner: body.owner, iid: body.iid, s: 0, used: 0, count: 0, created: this.now(), presence: null };
        this.saveMeta();
        this.io.setAlarm(this.now() + DAY);
      }
      return { ok: true };
    }
    if (op === 'purge') {
      for (const s of this.sockets()) { try { s.close(4410, 'gone'); } catch { /* gone */ } }
      this.store.deleteAll(); this.meta = null;
      return { ok: true };
    }
    fail(404, 'not_found');
  }

  async owner(req) {
    const p = await this.auth(req);
    this.need(p, 'message');
    const m = this.m();
    if (!m || p.identity !== m.owner) fail(403, 'forbidden');
    return p;
  }
  /** The drop token's record, or the same 403 for every way it can fail. */
  async drop(req) {
    const token = req.headers.get('x-od-drop') || '', m = this.m(), now = this.now();
    const no = () => fail(403, 'forbidden', 'This drop token does not work here.');
    if (!m || !B64_43.test(token)) no();
    const h = await A.tokenHash('drop', token), d = this.store.get('dr/' + h.slice(0, 22));
    if (!d || !A.sameText(d.h, h) || d.exp <= now) no();
    return d;
  }

  async handle(req) {
    const rest = req.path.slice(('/v1/mb/' + this.mbox).length), { method } = req, now = this.now();
    let mm;
    if (rest === '/post' && method === 'POST') { await this.auth(req); return this.post(req, await this.drop(req)); }
    if (rest === '/presence' && method === 'GET') {
      if (req.headers.get('x-od-drop')) { await this.auth(req); await this.drop(req); }
      else await this.owner(req);
      const pr = this.m().presence;
      return reply(200, pr ? { state: pr.state, at: pr.at } : { state: 'off' }, now);
    }
    const p = await this.owner(req), m = this.m();
    if (method !== 'GET') await this.pay(p);
    if (rest === '/items' && method === 'GET') {
      const after = qnum(req, 'after', 0), limit = qnum(req, 'limit', 100, 200);
      const rows = this.store.list({ start: 'i/' + pad(after + 1), end: 'i/~', limit: limit + 1 });
      const items = [];
      let size = 0, cursor = after, more = rows.length > limit;
      for (const [k, v] of rows.slice(0, limit)) {
        if (size && size + v.size > LIMITS.readMax) { more = true; break; }
        const s = Number(k.slice(2));
        items.push({ rid: String(s), env: v.env, at: v.at }); size += v.size; cursor = s;
      }
      if (!more) cursor = Math.max(cursor, m.s);
      return reply(200, { items, cursor, more }, now);
    }
    if (rest === '/ack' && method === 'POST') {
      const b = jsonBody(req);
      if (!Array.isArray(b.rids) || b.rids.length > 500 || !b.rids.every(r => typeof r === 'string' && /^\d{1,13}$/.test(r))) fail(400, 'bad_request');
      this.removeItems(b.rids.map(r => 'i/' + pad(Number(r))));
      return reply(200, { ok: true }, now);
    }
    if (rest === '/drops' && method === 'POST') {
      const b = jsonBody(req);
      if (this.store.list({ prefix: 'dr/' }).length >= LIMITS.drops) fail(429, 'rate_limit', 'Too many drop tokens. Take some back first.');
      const ttl = Number.isFinite(b.ttlMs) ? Math.min(Math.max(b.ttlMs, 60000), LIMITS.dropMaxMs) : LIMITS.dropMs;
      const token = A.randomId(32), h = await A.tokenHash('drop', token), id = h.slice(0, 22);
      this.store.put('dr/' + id, { id, h, exp: now + ttl, at: now, day: '', n: 0, pending: 0 });
      return reply(200, { id, token, exp: now + ttl }, now);
    }
    if ((mm = /^\/drops\/([A-Za-z0-9_-]{22})$/.exec(rest)) && method === 'DELETE') { this.store.del('dr/' + mm[1]); return reply(200, { ok: true }, now); }
    if (rest === '/presence' && method === 'PUT') {
      const b = jsonBody(req);
      if (!['here', 'away', 'off'].includes(b.state)) fail(400, 'bad_request');
      const at = Math.floor(now / 300000) * 300000, cur = m.presence;
      const next = b.state === 'off' ? null : { state: b.state, at };
      if (!(cur && next && cur.state === next.state && next.at - cur.at < 30 * 60000) && !(!cur && !next)) { m.presence = next; this.saveMeta(); }
      return reply(200, { ok: true }, now);
    }
    fail(404, 'not_found');
  }
  async post(req, d) {
    const m = this.m(), now = this.now(), day = dayOf(now);
    const b = jsonBody(req);
    if (b.env === undefined) fail(400, 'bad_request');
    const size = te.encode(JSON.stringify(b.env)).length;
    if (size > LIMITS.post) fail(413, 'too_large');
    const dr = { ...d, ...(d.day !== day ? { day, n: 0 } : {}) };
    if (dr.n >= LIMITS.dropPerDay) fail(429, 'rate_limit');
    if (dr.pending + size > LIMITS.dropPending) fail(507, 'quota', 'Too many unread messages from you here. Try again later.');
    if (m.used + size > LIMITS.mailbox || m.count >= LIMITS.mailboxItems) fail(507, 'quota', 'This mailbox is full.');
    const p = await this.who(m.owner);
    await this.pay({ ...p, iid: m.iid });          // a post uses the mailbox owner's rows (they hand out its drop tokens)
    await this.room({ ...p, iid: m.iid }, size, m.used);
    let s = 0;
    this.store.tx(() => {
      s = ++m.s;
      this.store.put('i/' + pad(s), { at: now, exp: now + LIMITS.itemMs, env: b.env, size, drop: d.id });
      dr.n++; dr.pending += size;
      this.store.put('dr/' + d.id, dr);
      m.used += size; m.count++;
      this.saveMeta();
    });
    this.broadcast(() => true, { t: 'item', rid: String(s), env: b.env, at: now });
    await this.report();
    return reply(200, { rid: String(s) }, now);
  }
  removeItems(keys) {
    const m = this.m(), drops = new Map();
    this.store.tx(() => {
      for (const k of keys) {
        const v = this.store.get(k);
        if (!v) continue;
        this.store.del(k);
        m.used -= v.size; m.count--;
        if (v.drop) drops.set(v.drop, (drops.get(v.drop) || 0) + v.size);
      }
      for (const [id, n] of drops) { const d = this.store.get('dr/' + id); if (d) this.store.put('dr/' + id, { ...d, pending: Math.max(0, d.pending - n) }); }
      this.saveMeta();
    });
  }

  async canUpgrade() { if (!this.m()) fail(404, 'not_found'); }
  async socketFor(p) {
    this.need(p, 'message');
    if (p.identity !== this.m().owner) fail(403, 'forbidden');
    return {};
  }
  ready() { return { cursor: this.m().s }; }
  async onSocket() { fail(400, 'bad_request'); }

  async housekeep(now) {
    const m = this.m();
    if (!m) return;
    const old = [];
    for (const [k, v] of this.store.list({ prefix: 'i/', limit: 2000 })) { if (v.exp > now) break; old.push(k); }
    if (old.length) this.removeItems(old);
    for (const [k, d] of this.store.list({ prefix: 'dr/' })) if (d.exp <= now) this.store.del(k);
    await this.report(true);
    this.io.setAlarm(now + DAY);
  }
}
