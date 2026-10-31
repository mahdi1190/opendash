// lib/relay/space-rgroup.mjs - a group of people on a relay (space "rg:<gid>", docs/dev/GROUPS.md,
// docs/dev/RELAY_PROTOCOL.md section 13). Pure, like lib/relay/base.mjs.
//
// The relay decides who may read and post here; it never reads what is said. Names, messages, profiles, join
// requests and the group's card are sealed by the members' apps. What it keeps in the clear: identity keys,
// roles, sizes and times.
//
// What it says about who runs a group decides nothing in an app: apps follow signatures from the group's first document, whose hash the
// group's id is (lib/friends/group-core.mjs). Everything here is for an honest relay's own rules, and for its bills.
//
// Keys: meta  {gid, owner, ownerIid, at, s, n, used, in, dmUsed, mode, posts, epoch, due, seen, rs, ps, ds, qs, link: {h, v, exp, maxUses, uses, at}, codeKey, codeH, day: {d, posts, rekeys, codes}}
//       doc   {cardK, cardL, linkWrap, auth, auths: [..]}: read on demand, written only when they change. auths keeps every document where the owner changed, and the last 64
//       m/<iid>  a member {iid, key, x, role, at, since, admit, w?: a key wrap for them alone, scopes, mbox, day?: {d, dm, rk}}: day moves with the seat when someone renews their keys
//       q/<iid>  someone waiting {iid, key, x, env, at, via: link|code, home, admit?}
//       b/<iid>  {at, blocked}: removed (can only ask again) or blocked (cannot ask)
//       dc/<iid> {at}: declined, so the asker's app can say so
//       e/<epoch> {hdr, wraps: {iid: {iv, ct}}}: a key rotation's wraps, one row whatever the size of the group
//       p/<iid>  {iid, s, at, env, size}: a member's sealed profile
//       i/<pad s> {s, ch, from, at, exp, env, size}: a post (a: announcement, m: a note)
//       d/<iid>/<pad s> {s, from, at, exp, env, size}: a sealed request to one member (add as friend)
//       pg/<iid> {at}: the registry has not yet confirmed that this person left (the alarm retries)

import * as A from './auth.mjs';
import { Space, LIMITS, RelayError, fail, reply, jsonBody, qnum, qflag, pad, isObj, dayOf, B64_43 } from './base.mjs';

const R = LIMITS.rg;
const DAY = 86400000, HOUR = 3600000;
const te = new TextEncoder();
const IID_RE = A.IID_RE;
const sizeOf = (v) => te.encode(JSON.stringify(v)).length;
const ROLES = ['owner', 'admin', 'member'];
const ENV_ID = /^[0-9a-f]{32}$/;
const GONE = 'This link no longer works. Ask the person who shared it for a new one.';

const sealedOk = (v, max) => isObj(v) && typeof v.iv === 'string' && typeof v.ct === 'string' && v.iv.length <= 32 && sizeOf(v) <= max;
/** A signed, sealed group message: only these fields are kept, and they are all the relay ever sees of it. */
function cleanEnv(e, max) {
  if (!isObj(e) || e.v !== 1 || !Number.isInteger(e.e) || e.e < 0 || !ENV_ID.test(e.id || '') || !B64_43.test(e.from || '') || !['a', 'm', 'p'].includes(e.ch) || !A.SIG_RE.test(e.sig || '') || typeof e.iv !== 'string' || typeof e.ct !== 'string' || e.iv.length > 32) return null;
  const out = { v: 1, e: e.e, id: e.id, from: e.from, ch: e.ch, iv: e.iv, ct: e.ct, sig: e.sig };
  return sizeOf(out) <= max ? out : null;
}
const cleanHdr = (h) => (isObj(h) && Number.isInteger(h.e) && B64_43.test(h.by || '') && B64_43.test(h.eph || '') && Number.isFinite(h.at) && A.SIG_RE.test(h.sig || '') ? { e: h.e, by: h.by, eph: h.eph, at: h.at, sig: h.sig } : null);
const cleanAdmit = (a) => {
  if (!isObj(a) || sizeOf(a) > 2048) return null;
  if (B64_43.test(a.by || '') && A.SIG_RE.test(a.sig || '') && Number.isFinite(a.at)) return { by: a.by, at: a.at, sig: a.sig };
  if (typeof a.tag === 'string' && a.tag.length <= 64 && Number.isInteger(a.lv)) return { tag: a.tag, lv: a.lv };
  return null;
};
const PAST_DATE = 'That date has already passed. Pick a new one.';
const depthOf = (a, n = 0) => (isObj(a) && isObj(a.rk) && n < 16 ? depthOf(a.prev, n + 1) : n);
const cleanLink = (l, now) => {
  if (!isObj(l) || !B64_43.test(l.h || '') || !Number.isInteger(l.v) || l.v < 1) return null;
  if (Number.isFinite(l.exp) && l.exp <= now) fail(400, 'bad_request', PAST_DATE);     // a date that passed means expired, never "no end date"
  return { h: l.h, v: l.v, exp: Number.isFinite(l.exp) ? l.exp : null, maxUses: Number.isInteger(l.maxUses) && l.maxUses > 0 ? Math.min(l.maxUses, 100000) : null, uses: 0, at: now };
};

export class RelayGroup extends Space {
  constructor(name, deps) {
    super(name, deps);
    this.gid = name.slice(3);
    this.meta = undefined;
    this.docCache = undefined;
    this.bad = new Map(); this.joins = new Map(); this.posting = new Map(); this.profiling = new Map();
    this.toldAt = 0; this.tellDue = false; this.hkAt = 0;
    this.rosterS = -1; this.rosterOut = null;
  }
  socketCap() { return R.sockets; }
  m() { if (this.meta === undefined) this.meta = this.store.get('meta') || null; return this.meta; }
  doc() { if (this.docCache === undefined) this.docCache = this.store.get('doc') || {}; return this.docCache; }
  saveMeta() { this.store.put('meta', this.meta); }
  saveDoc() { this.store.put('doc', this.docCache); }
  usage() { const m = this.m(); return m ? { iid: m.ownerIid, used: m.used } : null; }
  next() { return ++this.meta.s; }
  /** Today's counts for the whole group. A copy: saved only with what it counted. */
  today() { const d = dayOf(this.now()), t = this.meta.day; return t && t.d === d ? { rekeys: 0, codes: 0, ...t } : { d, posts: 0, rekeys: 0, codes: 0 }; }
  /** Today's counts for one seat: kept in the stored row, so an evicted object or a new key starts nothing again. */
  seatDay(row) { const d = dayOf(this.now()), t = row.day; return t && t.d === d ? { dm: 0, rk: 0, ...t } : { d, dm: 0, rk: 0 }; }
  /** The relay's total, as the registry last counted it: bytes in a group count there too. */
  async relayRoom(delta) {
    if (delta <= 0) return;
    const snap = await this.members(), local = this.rep.used >= 0 ? this.m().used - this.rep.used : 0;
    if (snap.relayUsed + local + delta > snap.relayMax) fail(507, 'quota', 'This relay is full.');
  }

  // ── a tiny limiter kept in this object's memory: refused before anything is stored ──
  hit(map, key, per, max) {
    const now = this.now();
    let w = map.get(key);
    if (!w || w.until < now) { w = { n: 0, until: now + per }; map.set(key, w); }
    if (map.size > 5000) for (const [k, v] of map) if (v.until < now) map.delete(k);
    return ++w.n <= max;
  }
  peekHit(map, key, max) { const w = map.get(key); return !w || w.until < this.now() || w.n < max; }

  async internal(op, body) {
    if (op === 'revoke') return super.internal(op, body);
    if (op === 'purge') { await this.wipe(); return { ok: true }; }
    if (op === 'dropMember') {
      if (this.m() && typeof body.iid === 'string') { const r = this.store.get('m/' + body.iid); if (r && r.role !== 'owner') this.dropRow(r, { ungrant: false }); }
      return { ok: true };
    }
    fail(404, 'not_found');
  }

  async handle(req) {
    const { method, path } = req;
    const rest = path.slice(('/v1/rg/' + this.gid).length);
    const p = await this.auth(req);
    if (rest === '/create' && method === 'POST') return this.create(req, p);
    const meta = this.m();
    if (!meta) fail(404, 'not_found');
    if (this.now() - (meta.seen || 0) > DAY) { meta.seen = this.now(); this.saveMeta(); }
    if (rest === '/peek' && method === 'POST') return this.peek(req, p);
    if (rest === '/join') {
      if (method === 'POST') return this.join(req, p);
      if (method === 'GET') return this.joinState(p);
      if (method === 'DELETE') return this.joinCancel(p);
    }
    const me = this.memberOf(p);
    if (method !== 'GET') await this.pay(p);
    let m;
    if (rest === '/feed' && method === 'GET') return this.feed(req, p, me);
    if (rest === '/post' && method === 'POST') return this.post(req, p, me);
    if (rest === '/me' && method === 'PUT') return this.profile(req, p, me);
    if (rest === '/dm' && method === 'POST') return this.dm(req, p, me);
    if (rest === '/dm/ack' && method === 'POST') return this.dmAck(req, p);
    if (rest === '/leave' && method === 'POST') return this.leave(me);
    if (rest === '/rekey' && method === 'POST') return this.rekey(req, p, me);
    if ((m = /^\/requests\/([A-Za-z0-9_-]{22})\/(approve|decline)$/.exec(rest)) && method === 'POST') { this.runs(me); return m[2] === 'approve' ? this.approve(req, m[1], me) : this.decline(req, m[1]); }
    if ((m = /^\/members\/([A-Za-z0-9_-]{22})$/.exec(rest)) && method === 'DELETE') return this.remove(req, m[1], p, me, null);
    if ((m = /^\/members\/([A-Za-z0-9_-]{22})\/remove$/.exec(rest)) && method === 'POST') return this.remove(req, m[1], p, me, jsonBody(req));
    if ((m = /^\/members\/([A-Za-z0-9_-]{22})\/role$/.exec(rest)) && method === 'PUT') return this.setRole(req, m[1], p, me);
    if ((m = /^\/blocks\/([A-Za-z0-9_-]{22})$/.exec(rest)) && method === 'DELETE') { this.runs(me); this.store.del('b/' + m[1]); return reply(200, { ok: true }, this.now()); }
    if (rest === '/link' && method === 'POST') return this.link(req, me);
    if (rest === '/card' && method === 'PUT') return this.card(req, me);
    if (rest === '/code' && method === 'POST') return this.setCode(req, me);
    if (rest === '/code' && method === 'DELETE') return this.dropCode(me);
    if (rest === '/keys' && method === 'POST') return this.rotate(req, p, me);
    if (rest === '/transfer' && method === 'POST') return this.transfer(req, p, me);
    if (rest === '/auth' && method === 'POST') return this.setAuth(req, p, me);
    if (rest === '' && method === 'DELETE') { if (me.role !== 'owner') fail(403, 'forbidden', 'Only the owner can delete a group.'); await this.wipe(); return reply(200, { ok: true }, this.now()); }
    fail(404, 'not_found');
  }

  // ── who ──
  memberOf(p) {
    if (p.role === 'anonymous') fail(403, 'not_member');
    const r = this.store.get('m/' + p.iid);
    if (!r) fail(403, 'not_member', 'You are not in this group.');
    return r;
  }
  runs(me) { if (me.role !== 'owner' && me.role !== 'admin') fail(403, 'forbidden', 'Only the people who run this group can do that.'); }
  owns(me) { if (me.role !== 'owner') fail(403, 'forbidden', 'Only the owner can do that.'); }
  /** A new authority document: the owner signed it, it follows the last one and says what it should. */
  async checkAuth(d, signer, owner = signer) {
    if (!isObj(d) || sizeOf(d) > R.small || d.gid !== this.gid || !Number.isInteger(d.seq) || !isObj(d.owner) || !B64_43.test(d.owner.ed || '') || !B64_43.test(d.owner.x || '') || !Array.isArray(d.admins) || d.admins.length > 64 || !Number.isFinite(d.at)) fail(400, 'bad_request');
    if (d.admins.some(a => !isObj(a) || !B64_43.test(a.ed || '') || !B64_43.test(a.x || ''))) fail(400, 'bad_request');
    if (d.owner.ed !== owner || !(await A.verify(signer, d.sig, A.groupAuthText(d)))) fail(400, 'bad_request', 'That change was not signed by the owner.');
    const cur = this.doc().auth;
    if (cur ? d.seq !== cur.seq + 1 : d.seq !== 1) fail(409, 'stale', 'Someone else just changed who runs this group. Try again.', { seq: cur ? cur.seq : 0 });
    if (cur ? d.prev !== await A.groupAuthHash(cur) : (typeof d.nonce !== 'string' || (await A.groupIdOf(d.owner, d.nonce)) !== this.gid)) fail(400, 'bad_request', 'That change does not follow the one before it.');
    return { v: 1, gid: d.gid, seq: d.seq, owner: { ed: d.owner.ed, x: d.owner.x }, admins: d.admins.map(a => ({ ed: a.ed, x: a.x })), at: d.at, sig: d.sig, ...(typeof d.prev === 'string' && d.prev ? { prev: d.prev } : {}), ...(typeof d.nonce === 'string' && d.nonce ? { nonce: d.nonce } : {}) };
  }
  /** A newcomer walks from document 1 to now: every document where the owner changed must stay, for good. The rest need only be recent. */
  keepAuth(d) {
    const doc = this.doc(), all = [...(doc.auths || []), d], recent = new Set(all.slice(-R.authKeep).map(a => a.seq));
    const kept = all.filter((a, i) => recent.has(a.seq) || i === 0 || a.owner.ed !== all[i - 1].owner.ed);
    if (kept.length > R.authKeep + R.ownersKeep) fail(507, 'quota', 'This group has changed hands too many times. Start a new one.');
    doc.auth = d; doc.auths = kept;
  }
  /** New proofs for people on the list, signed by this person: when who signed theirs stops running the group, or the link they used stops. */
  /** Worked out from the list as it stood: someone new since then would be left without a proof or a key. The app looks again and retries. */
  sameList(b) { if (b && b.rs !== undefined && b.rs !== this.m().rs) fail(409, 'stale', 'Someone just joined or left. Try again.', { rs: this.m().rs }); }
  checkAdmits(admits, key) {
    if (admits == null) return [];
    if (!isObj(admits) || Object.keys(admits).length > R.members + 1) fail(400, 'bad_request');
    return Object.entries(admits).map(([iid, a]) => {
      const c = IID_RE.test(iid) ? cleanAdmit(a) : null;
      if (!c || c.by !== key) fail(400, 'bad_request');
      return [iid, c];
    });
  }
  keepAdmits(list) {
    let n = 0;
    for (const [iid, c] of list) { const row = this.store.get('m/' + iid); if (row) { this.store.put('m/' + iid, { ...row, admit: c }); n++; } }
    return n;
  }

  // ── making a group ──
  async create(req, p) {
    if (this.m()) fail(409, 'exists');
    this.need(p);
    if (p.pending || p.groupOnly) fail(403, 'forbidden', 'Only people the owner of this connection let in can start a group here.');
    const b = jsonBody(req), now = this.now();
    if (!B64_43.test(b.x || '') || !sealedOk(b.cardK, R.card + 512) || !sealedOk(b.cardL, R.card + 512)) fail(400, 'bad_request');
    const link = cleanLink(b.link, now);
    const hdr = cleanHdr(b.hdr);
    if (!link || !hdr || hdr.e !== 1 || hdr.by !== p.identity || !sealedOk(b.wrap, R.small)) fail(400, 'bad_request');
    if (b.linkWrap != null && !sealedOk(b.linkWrap, R.small)) fail(400, 'bad_request');
    const mode = b.mode === 'open' ? 'open' : 'approve';
    if (mode === 'open' && !b.linkWrap) fail(400, 'bad_request');
    this.docCache = {};
    const auth = await this.checkAuth(b.auth, p.identity);
    if (auth.owner.x !== b.x || auth.admins.length || !auth.nonce) fail(400, 'bad_request');
    await this.pay(p);
    await this.io.call('reg', 'claim', { space: this.name, iid: p.iid, kind: 'rg' });
    const used = sizeOf(b.cardK) + sizeOf(b.cardL);
    this.store.tx(() => {
      this.meta = { gid: this.gid, owner: p.identity, ownerIid: p.iid, at: now, s: 1, n: 1, used, in: 0, dmUsed: 0, mode, posts: b.posts === 'admins' ? 'admins' : 'all', epoch: 1, due: false, seen: now, rs: 1, ps: 0, ds: 1, qs: 0, link, codeKey: null, codeH: null, day: { d: dayOf(now), posts: 0, rekeys: 0, codes: 0 } };
      this.saveMeta();
      this.docCache = { cardK: { iv: b.cardK.iv, ct: b.cardK.ct }, cardL: { iv: b.cardL.iv, ct: b.cardL.ct }, linkWrap: mode === 'open' ? { iv: b.linkWrap.iv, ct: b.linkWrap.ct } : null, auth, auths: [auth] };
      this.saveDoc();
      this.store.put('m/' + p.iid, { iid: p.iid, key: p.identity, x: b.x, role: 'owner', at: now, since: 0, admit: { self: true }, w: { hdr, iv: b.wrap.iv, ct: b.wrap.ct } });
    });
    this.io.setAlarm(now + DAY);
    await this.report(true);
    return reply(200, { ok: true, gid: this.gid, epoch: 1, s: 1 }, now);
  }

  // ── a link holder: peek and join ──
  async linkOk(proof, ip) {
    const meta = this.m(), now = this.now(), l = meta.link;
    if (typeof proof !== 'string' || !B64_43.test(proof)) return false;
    if (!l || (l.exp && l.exp <= now)) return false;
    return A.sameText(await A.sha256b64u('opendash-group-link-v1\n' + proof), l.h);
  }
  /** A wrong link or code from this address counts; too many and it gets nothing (before any row is read or written). */
  barrier(ip) { if (!this.peekHit(this.bad, ip, R.badPerHour)) fail(429, 'rate_limit', 'Too many tries. Wait an hour, or ask for a new link.'); }
  async peek(req, p) {
    const ip = req.ip || 'unknown', b = jsonBody(req);
    this.barrier(ip);
    const blocked = this.store.get('b/' + p.iid);
    if (!(await this.linkOk(b.proof, ip)) || (blocked && blocked.blocked)) { this.hit(this.bad, ip, HOUR, R.badPerHour); fail(410, 'gone', GONE); }
    const meta = this.m(), doc = this.doc(), l = meta.link;
    return reply(200, { card: doc.cardL, auths: doc.auths || [], mode: meta.mode, n: meta.n, lv: l.v, full: meta.n >= R.members || (meta.mode === 'open' && !!l.maxUses && l.uses >= l.maxUses), epoch: meta.epoch }, this.now());
  }
  async join(req, p) {
    const ip = req.ip || 'unknown', b = jsonBody(req), meta = this.m(), now = this.now();
    this.barrier(ip);
    const viaCode = b.codeProof != null;
    let ok;
    if (viaCode) {
      // A code is for people already on this relay, and it only ever asks (docs/dev/GROUPS.md).
      if (p.role === 'anonymous') fail(403, 'not_member');
      if (p.groupOnly === 'open') fail(403, 'scope', 'Codes work once someone has let you in. Use the group\'s link.');
      ok = !!meta.codeH && typeof b.codeProof === 'string' && B64_43.test(b.codeProof) && A.sameText(await A.sha256b64u('opendash-group-link-v1\n' + b.codeProof), meta.codeH);
    } else ok = await this.linkOk(b.proof, ip);
    const stone = this.store.get('b/' + p.iid);
    if (!ok || (stone && stone.blocked)) { this.hit(this.bad, ip, HOUR, R.badPerHour); fail(410, 'gone', GONE); }
    if (!this.hit(this.joins, ip, HOUR, R.joinPerHour)) fail(429, 'rate_limit', 'Too many people joining from here just now. Try again in a while.');
    if (!B64_43.test(b.x || '')) fail(400, 'bad_request');
    if (p.identity !== p.key) fail(400, 'bad_request', 'Join with the identity key, not a device key.');
    const already = this.store.get('m/' + p.iid);
    if (already) return reply(200, this.memberInfo(already), now);
    const l = meta.link;
    if (meta.n >= R.members) fail(507, 'quota', 'This group is full.');
    if (meta.mode === 'open' && !viaCode && !stone) {
      if (l.maxUses && l.uses >= l.maxUses) fail(410, 'gone', GONE);
      const admit = cleanAdmit(b.admit);
      if (!admit || !admit.tag || admit.lv !== l.v) fail(400, 'bad_request');
      const g = await this.io.call('reg', 'rgJoin', { key: p.identity, gid: this.gid, home: b.home === true, open: true });
      this.snap = null;      // they are a member of the relay now: this object must not go by its older copy
      const row = this.memberRow(p, b.x, admit, g, now);
      this.store.tx(() => {
        this.store.put('m/' + p.iid, row);
        this.store.del('q/' + p.iid); this.store.del('dc/' + p.iid);
        l.uses++; meta.n++; meta.rs = this.next();
        this.saveMeta();
      });
      this.tell({ t: 'chg', s: meta.s });
      await this.report();
      return reply(200, this.memberInfo(row), now);
    }
    // Approve mode, a code, or someone removed before: they may ask, and nothing more.
    if (!sealedOk(b.env, R.request) || typeof b.env.eph !== 'string') fail(400, 'bad_request');
    const had = this.store.get('q/' + p.iid);
    if (!had && this.store.list({ prefix: 'q/' }).length >= R.pending) fail(429, 'rate_limit', 'Too many people are already waiting. Try again later.');
    this.store.tx(() => {
      this.store.put('q/' + p.iid, { iid: p.iid, key: p.identity, x: b.x, env: { eph: b.env.eph, iv: b.env.iv, ct: b.env.ct }, at: now, via: viaCode ? 'code' : 'link', home: b.home === true });
      this.store.del('dc/' + p.iid);
      meta.qs = this.next();
      this.saveMeta();
    });
    this.tell({ t: 'chg', s: meta.s }, (a) => a.runs);
    return reply(202, { state: 'pending' }, now);
  }
  memberRow(p, x, admit, g, now) { return { iid: p.iid, key: p.identity, x, role: 'member', at: now, since: this.m().s, admit, scopes: g.scopes, mbox: g.mbox || null }; }
  /** What a member's app needs when it arrives or comes back: the key wrap, the relay's grant, the group's authority. */
  memberInfo(row) {
    const meta = this.m(), doc = this.doc();
    const wrapRow = row.w && row.w.hdr.e === meta.epoch ? row.w : null;
    const e = wrapRow ? null : this.store.get('e/' + meta.epoch);
    const w = wrapRow || (e && e.wraps[row.iid] ? { hdr: e.hdr, ...e.wraps[row.iid] } : null);
    return { state: 'member', role: row.role, epoch: meta.epoch, wrap: w, linkWrap: !w && meta.mode === 'open' ? doc.linkWrap : null, scopes: row.scopes || null, mbox: row.mbox || null, auths: doc.auths || [], card: doc.cardK, s: row.since || 0 };
  }
  joinState(p) {
    const now = this.now();
    const row = this.store.get('m/' + p.iid);
    // On the list, but the relay's owner took them off the relay: not in, whatever the list says.
    if (row) return reply(200, p.role === 'anonymous' ? { state: 'none' } : this.memberInfo(row), now);
    if (this.store.get('q/' + p.iid)) return reply(200, { state: 'pending' }, now);
    const b = this.store.get('b/' + p.iid);
    if (this.store.get('dc/' + p.iid) || (b && b.blocked)) return reply(200, { state: 'declined' }, now);
    return reply(200, { state: b ? 'removed' : 'none' }, now);
  }
  joinCancel(p) {
    const k = 'q/' + p.iid;
    if (this.store.get(k)) { this.store.del(k); this.m().qs = this.next(); this.saveMeta(); this.tell({ t: 'chg', s: this.m().s }, (a) => a.runs); }
    return reply(200, { ok: true }, this.now());
  }

  // ── people who run the group: approving, removing ──
  async approve(req, iid, me) {
    const q = this.store.get('q/' + iid), meta = this.m(), now = this.now();
    if (!q) fail(404, 'not_found');
    const b = jsonBody(req), hdr = cleanHdr(b.hdr), admit = cleanAdmit(b.admit);
    if (!hdr || !sealedOk(b.wrap, R.small) || !admit || !admit.by || admit.by !== me.key || hdr.by !== me.key) fail(400, 'bad_request');
    if (hdr.e !== meta.epoch) fail(409, 'stale', 'The group\'s key just changed. Try again.', { epoch: meta.epoch });
    if (meta.n >= R.members) fail(507, 'quota', 'This group is full.');
    const g = await this.io.call('reg', 'rgJoin', { key: q.key, gid: this.gid, home: q.home === true, open: false });
    this.snap = null;
    const row = { iid, key: q.key, x: q.x, role: 'member', at: now, since: meta.s, admit, w: { hdr, iv: b.wrap.iv, ct: b.wrap.ct }, scopes: g.scopes, mbox: g.mbox || null };
    this.store.tx(() => {
      this.store.del('q/' + iid); this.store.del('b/' + iid); this.store.del('dc/' + iid);
      this.store.put('m/' + iid, row);
      meta.n++; meta.rs = this.next(); meta.qs = meta.rs;
      this.saveMeta();
    });
    this.tell({ t: 'chg', s: meta.s });
    await this.report();
    return reply(200, { ok: true, n: meta.n }, now);
  }
  decline(req, iid) {
    const b = jsonBody(req), meta = this.m(), now = this.now();
    if (!this.store.get('q/' + iid)) return reply(200, { ok: true }, now);
    this.store.tx(() => {
      this.store.del('q/' + iid);
      this.store.put('dc/' + iid, { at: now });
      if (b.block === true) this.store.put('b/' + iid, { at: now, blocked: true });
      meta.qs = this.next();
      this.saveMeta();
    });
    this.tell({ t: 'chg', s: meta.s }, (a) => a.runs);
    return reply(200, { ok: true }, now);
  }
  /** A row goes: nobody with that key can read or post from this moment, and their sockets close. */
  dropRow(row, { ungrant = true } = {}) {
    const meta = this.m();
    this.store.tx(() => {
      const prof = this.store.get('p/' + row.iid);
      if (prof) meta.used = Math.max(0, meta.used - (prof.size || 0));
      this.store.del('m/' + row.iid); this.store.del('p/' + row.iid);
      this.dropDms(row.iid);
      if (ungrant) this.store.put('pg/' + row.iid, { at: this.now() });
      meta.n = Math.max(0, meta.n - 1); meta.due = true; meta.rs = this.next();
      this.saveMeta();
    });
    for (const s of this.sockets(a => a.authed && a.iid === row.iid)) { try { s.close(4403, 'removed'); } catch { /* gone */ } }
    this.tellDue_();
  }
  /** Requests waiting for someone: what they take of the group's room comes back with them. */
  dropDms(iid) {
    const meta = this.m();
    for (const [k, v] of this.store.list({ prefix: `d/${iid}/` })) { this.store.del(k); meta.used = Math.max(0, meta.used - (v.size || 0)); meta.dmUsed = Math.max(0, (meta.dmUsed || 0) - (v.size || 0)); }
  }
  /** Tell the registry they are gone from this group. Not confirmed: the alarm tries again. */
  async ungrant(iid) {
    try { await this.io.call('reg', 'rgLeave', { gid: this.gid, iids: [iid] }); this.store.del('pg/' + iid); }
    catch { this.io.setAlarm(this.now() + 5 * 60000); }
  }
  /** b: {block?, auth?, admits?}. Someone who runs the group goes only with the owner's signed document that says so: they must not stay in it. */
  async remove(req, iid, p, me, b) {
    this.runs(me);
    const row = this.store.get('m/' + iid), now = this.now();
    if (!row) return reply(404, { error: 'not_found', message: 'They are no longer in this group.' }, now);
    if (row.role === 'owner') fail(403, 'forbidden', 'The owner cannot be removed. They can hand the group to someone else.');
    if (row.role === 'admin' && me.role !== 'owner') fail(403, 'forbidden', 'Only the owner can remove someone who runs the group.');
    this.sameList(b);
    let auth = null;
    if (row.role === 'admin') {
      if (!b || !b.auth) fail(400, 'bad_request', 'That needs a signed change of who runs the group.');
      auth = await this.checkAuth(b.auth, p.identity);
      if (auth.admins.some(a => a.ed === row.key)) fail(400, 'bad_request', 'That change does not say the same thing as what was asked.');
    }
    const admits = this.checkAdmits(auth ? b.admits : null, me.key);
    if (auth) this.keepAuth(auth);
    this.store.tx(() => {
      if (auth) { this.saveDoc(); this.keepAdmits(admits); }
      this.store.put('b/' + iid, { at: now, blocked: qflag(req, 'block') || !!(b && b.block === true) });
    });
    this.dropRow(row);
    await this.ungrant(iid);
    await this.report();
    return reply(200, { ok: true, due: true, epoch: this.m().epoch }, now);
  }
  async leave(me) {
    const meta = this.m(), now = this.now();
    if (me.role === 'owner') {
      if (meta.n > 1) fail(409, 'exists', 'Hand the group to someone else before you leave.');
      await this.wipe();
      return reply(200, { ok: true, deleted: true }, now);
    }
    this.dropRow(me);
    await this.ungrant(me.iid);
    await this.report();
    return reply(200, { ok: true }, now);
  }
  async setRole(req, iid, p, me) {
    this.owns(me);
    const row = this.store.get('m/' + iid), meta = this.m(), now = this.now(), b = jsonBody(req);
    if (!row) fail(404, 'not_found');
    if (row.role === 'owner' || !['admin', 'member'].includes(b.role)) fail(400, 'bad_request');
    this.sameList(b);
    const auth = await this.checkAuth(b.auth, p.identity);
    const listed = auth.admins.some(a => a.ed === row.key && a.x === row.x);
    if (listed !== (b.role === 'admin')) fail(400, 'bad_request', 'That change does not say the same thing as what was asked.');
    const fresh = b.admit == null ? null : cleanAdmit(b.admit);
    if (b.admit != null && (!fresh || fresh.by !== me.key)) fail(400, 'bad_request');
    const admits = this.checkAdmits(b.admits, me.key);
    this.keepAuth(auth);
    this.store.tx(() => {
      this.saveDoc();
      this.keepAdmits(admits);
      this.store.put('m/' + iid, { ...this.store.get('m/' + iid), role: b.role, ...(fresh ? { admit: fresh } : {}) });
      meta.due = true; meta.rs = this.next(); meta.ds = meta.rs; meta.qs = meta.rs;
      this.saveMeta();
    });
    this.tellDue_();
    return reply(200, { ok: true, due: true }, now);
  }
  /**
   * A new document that is not about one row: someone who runs the group left and must be signed out, or renewed their keys and must be
   * signed in again. Roles here follow the document; a document naming someone who is not on the list with that very key is refused.
   */
  async setAuth(req, p, me) {
    this.owns(me);
    const b = jsonBody(req), meta = this.m(), now = this.now();
    this.sameList(b);
    const auth = await this.checkAuth(b.auth, p.identity);
    const cur = this.doc().auth, has = new Map(auth.admins.map(a => [a.ed, a])), had = new Map(cur.admins.map(a => [a.ed, a]));
    const changes = [];
    for (const [ed, a] of has) {
      if (had.has(ed)) continue;
      const iid = await A.iidOf(ed), row = this.store.get('m/' + iid);
      if (!row || row.x !== a.x) fail(400, 'bad_request', 'That person is not in this group.');
      changes.push([iid, 'admin']);
    }
    for (const ed of had.keys()) { if (!has.has(ed)) changes.push([await A.iidOf(ed), 'member']); }
    const admits = this.checkAdmits(b.admits, me.key);
    this.keepAuth(auth);
    this.store.tx(() => {
      this.saveDoc();
      for (const [iid, role] of changes) { const row = this.store.get('m/' + iid); if (row) this.store.put('m/' + iid, { ...row, role }); }
      this.keepAdmits(admits);
      meta.due = true; meta.rs = this.next(); meta.ds = meta.rs; meta.qs = meta.rs;
      this.saveMeta();
    });
    this.tellDue_();
    return reply(200, { ok: true, due: true }, now);
  }
  async transfer(req, p, me) {
    this.owns(me);
    const b = jsonBody(req), meta = this.m(), now = this.now();
    if (typeof b.to !== 'string' || !IID_RE.test(b.to) || b.to === me.iid) fail(400, 'bad_request');
    const row = this.store.get('m/' + b.to);
    if (!row) fail(404, 'not_found', 'They are not in this group.');
    const auth = await this.checkAuth(b.auth, p.identity, row.key);
    if (auth.owner.x !== row.x || !auth.admins.some(a => a.ed === me.key)) fail(400, 'bad_request');
    this.keepAuth(auth);
    this.store.tx(() => {
      this.saveDoc();
      this.store.put('m/' + b.to, { ...row, role: 'owner' });
      this.store.put('m/' + me.iid, { ...me, role: 'admin' });
      meta.owner = row.key; meta.ownerIid = row.iid; meta.due = true; meta.rs = this.next(); meta.ds = meta.rs; meta.qs = meta.rs;
      this.saveMeta();
    });
    this.tellDue_();
    await this.report(true);
    return reply(200, { ok: true, due: true }, now);
  }

  // ── the link, the code, the card ──
  async link(req, me) {
    this.runs(me);
    const b = jsonBody(req), meta = this.m(), doc = this.doc(), now = this.now();
    this.sameList(b);
    const mode = b.mode === undefined ? meta.mode : b.mode === 'open' ? 'open' : 'approve';
    let link = meta.link, fresh = false;
    if (b.link) {
      link = cleanLink(b.link, now);
      if (!link) fail(400, 'bad_request');
      if (meta.link && link.v <= meta.link.v) fail(409, 'stale', 'Someone else just changed the link.', { v: meta.link.v });
      fresh = true;
      if (!sealedOk(b.cardL, R.card + 512)) fail(400, 'bad_request');
    } else if (b.exp !== undefined || b.maxUses !== undefined) {
      // A date that passed stays passed: sending it back changes nothing, and it never comes back as "no end date".
      if (Number.isFinite(b.exp) && b.exp <= now && b.exp !== link.exp) fail(400, 'bad_request', PAST_DATE);
      link = { ...link, exp: Number.isFinite(b.exp) ? b.exp : null, maxUses: Number.isInteger(b.maxUses) && b.maxUses > 0 ? Math.min(b.maxUses, 100000) : null };
    }
    if (mode === 'open' && !(b.linkWrap && sealedOk(b.linkWrap, R.small)) && !(doc.linkWrap && !fresh)) fail(400, 'bad_request', 'Anyone-with-the-link needs the key sealed under the link.');
    if ((b.cardK != null && !sealedOk(b.cardK, R.card + 512)) || (b.cardL != null && !sealedOk(b.cardL, R.card + 512))) fail(400, 'bad_request');
    // Whoever held the old link, or the key through it, must not read what comes next.
    const keyDue = fresh || (meta.mode === 'open' && mode === 'approve');
    const admits = this.checkAdmits(b.admits, me.key);
    this.store.tx(() => {
      this.keepAdmits(admits);
      if (b.cardK) doc.cardK = { iv: b.cardK.iv, ct: b.cardK.ct };
      if (!fresh && b.cardL) doc.cardL = { iv: b.cardL.iv, ct: b.cardL.ct };
      if (keyDue) meta.due = true;
      // The old link dies here. Whoever was still waiting through it needs the new one (a leaked link's queue goes with it).
      if (fresh) for (const [k, q] of this.store.list({ prefix: 'q/' })) if (q.via === 'link') { this.store.del(k); this.store.put('dc/' + q.iid, { at: now }); }
      if (fresh) doc.cardL = { iv: b.cardL.iv, ct: b.cardL.ct };
      doc.linkWrap = mode === 'open' ? (b.linkWrap ? { iv: b.linkWrap.iv, ct: b.linkWrap.ct } : doc.linkWrap) : null;
      this.saveDoc();
      meta.link = link; meta.mode = mode; meta.qs = this.next(); meta.ds = meta.qs; meta.rs = meta.qs;
      this.saveMeta();
    });
    if (keyDue) this.tellDue_(); else this.tell({ t: 'chg', s: meta.s });
    return reply(200, { ok: true, mode, v: link ? link.v : 0 }, now);
  }
  card(req, me) {
    this.runs(me);
    const b = jsonBody(req), meta = this.m(), doc = this.doc(), now = this.now();
    if (!sealedOk(b.cardK, R.card + 512) || (b.cardL != null && !sealedOk(b.cardL, R.card + 512))) fail(413, 'too_large');
    this.store.tx(() => {
      doc.cardK = { iv: b.cardK.iv, ct: b.cardK.ct };
      if (b.cardL) doc.cardL = { iv: b.cardL.iv, ct: b.cardL.ct };
      this.saveDoc();
      if (b.posts === 'admins' || b.posts === 'all') meta.posts = b.posts;
      meta.ds = this.next();
      this.saveMeta();
    });
    this.tell({ t: 'chg', s: meta.s });
    return reply(200, { ok: true }, now);
  }
  async setCode(req, me) {
    this.runs(me);
    const b = jsonBody(req), meta = this.m(), now = this.now();
    if (!/^[0-9a-f]{64}$/.test(b.key || '') || !B64_43.test(b.h || '') || !sealedOk(b.blob, R.card + 1024)) fail(400, 'bad_request');
    // The same code with a newer card is not a guess. A new one is, and a group gets only so many a day.
    const newCode = b.key !== meta.codeKey, t = this.today();
    if (newCode && t.codes >= R.codesPerDay) fail(429, 'rate_limit', 'That is a lot of new codes today. Try again tomorrow.');
    await this.io.call('reg', 'rgCode', { gid: this.gid, key: b.key, blob: b.blob, old: meta.codeKey, iid: me.iid, ip: req.ip || 'unknown' });
    meta.codeKey = b.key; meta.codeH = b.h; meta.ds = this.next();
    if (newCode) meta.day = { ...t, codes: t.codes + 1 };
    this.saveMeta();
    return reply(200, { ok: true }, now);
  }
  async dropCode(me) {
    this.runs(me);
    const meta = this.m();
    if (meta.codeKey) await this.io.call('reg', 'rgCode', { gid: this.gid, key: null, old: meta.codeKey });
    meta.codeKey = null; meta.codeH = null; meta.ds = this.next();
    this.saveMeta();
    return reply(200, { ok: true }, this.now());
  }

  // ── keys ──
  async rotate(req, p, me) {
    this.runs(me);
    const b = jsonBody(req), meta = this.m(), doc = this.doc(), now = this.now();
    const hdr = cleanHdr(b.hdr);
    if (!hdr || hdr.by !== p.identity || !isObj(b.wraps) || !sealedOk(b.cardK, R.card + 512)) fail(400, 'bad_request');
    if (hdr.e !== meta.epoch + 1) fail(409, 'stale', 'Someone else just changed the group\'s key.', { epoch: meta.epoch });
    this.sameList(b);
    if (Object.keys(b.wraps).length > R.members + 1) fail(413, 'too_large');
    const wraps = {};
    for (const [iid, w] of Object.entries(b.wraps)) { if (!IID_RE.test(iid) || !sealedOk(w, 4096)) fail(400, 'bad_request'); wraps[iid] = { iv: w.iv, ct: w.ct }; }
    if (meta.mode === 'open' && !sealedOk(b.linkWrap, R.small)) fail(400, 'bad_request');
    const admits = this.checkAdmits(b.admits, me.key);
    this.store.tx(() => {
      if (this.keepAdmits(admits)) meta.rs = this.next();
      this.store.put('e/' + hdr.e, { hdr, wraps });
      const old = hdr.e - R.epochsKept;
      if (old > 0) this.store.del('e/' + old);
      doc.cardK = { iv: b.cardK.iv, ct: b.cardK.ct };
      if (b.cardL && sealedOk(b.cardL, R.card + 512)) doc.cardL = { iv: b.cardL.iv, ct: b.cardL.ct };
      doc.linkWrap = meta.mode === 'open' ? { iv: b.linkWrap.iv, ct: b.linkWrap.ct } : null;
      this.saveDoc();
      meta.epoch = hdr.e; meta.due = false; meta.ds = this.next(); meta.qs = meta.ds;
      this.saveMeta();
    });
    this.tell({ t: 'chg', s: meta.s });
    return reply(200, { ok: true, epoch: meta.epoch }, now);
  }
  /** A person renewed their keys (FRIENDS.md section 15): the old key moves its seat to the new one; the group's key then rotates. */
  async rekey(req, p, me) {
    const b = jsonBody(req), meta = this.m(), now = this.now();
    if (!B64_43.test(b.key || '') || !B64_43.test(b.x || '') || b.key === me.key) fail(400, 'bad_request');
    const text = A.groupRekeyText(this.gid, me.key, b.key, b.x);
    if (!(await A.verify(b.key, b.sig, text)) || !(await A.verify(me.key, b.sigOld, text))) fail(400, 'bad_request');
    // Rare, and counted in the stored row: a seat that keeps moving would reset what its old key had used up, and costs everyone a new roster.
    const seat = this.seatDay(me), t = this.today();
    if (seat.rk >= R.rekeysPerDay || t.rekeys >= R.groupRekeysPerDay) fail(429, 'rate_limit', 'That is a lot of key changes today. Try again tomorrow.');
    const admit = { rk: { from: me.key, x: me.x, sig: b.sig, sigOld: b.sigOld }, prev: me.admit };
    if (depthOf(admit) > R.admitDepth || sizeOf(admit) > R.admitMax) fail(400, 'bad_request', 'Ask someone who runs this group to let you in again.');
    const iid = await A.iidOf(b.key);
    if (this.store.get('m/' + iid)) fail(409, 'exists');
    let auth = null;
    if (me.role === 'owner') {
      auth = await this.checkAuth(b.auth, me.key, b.key);
      if (auth.owner.x !== b.x) fail(400, 'bad_request');
    }
    // The same kind of grant as before (an open link's stays an open link's), and today's rows come along.
    const g = await this.io.call('reg', 'rgJoin', { key: b.key, gid: this.gid, home: !!me.mbox, open: p.groupOnly === 'open', from: me.iid });
    this.snap = null;
    const row = { ...me, iid, key: b.key, x: b.x, w: null, admit, day: { ...seat, rk: seat.rk + 1 }, scopes: g.scopes, mbox: g.mbox || null };
    const prof = this.store.get('p/' + me.iid);
    const admits = this.checkAdmits(auth ? b.admits : null, b.key);
    if (auth) this.keepAuth(auth);
    this.store.tx(() => {
      this.store.del('m/' + me.iid);
      this.store.put('m/' + iid, row);
      this.keepAdmits(admits);
      if (prof) { this.store.del('p/' + me.iid); this.store.put('p/' + iid, { ...prof, iid }); }
      this.dropDms(me.iid);
      this.store.put('pg/' + me.iid, { at: now });
      if (auth) { this.saveDoc(); meta.owner = b.key; meta.ownerIid = iid; meta.ds = meta.s + 1; }
      meta.day = { ...t, rekeys: t.rekeys + 1 };
      meta.due = true; meta.rs = this.next();
      this.saveMeta();
    });
    for (const map of [this.posting, this.profiling]) for (const k of [me.iid, 'm|' + me.iid, 'd|' + me.iid]) { const w = map.get(k); if (w) { map.set(k.replace(me.iid, iid), w); map.delete(k); } }
    for (const s of this.sockets(a => a.authed && a.iid === me.iid)) { try { s.close(4403, 'renewed'); } catch { /* gone */ } }
    await this.ungrant(me.iid);
    this.tellDue_();
    return reply(200, { ok: true, iid }, now);
  }

  // ── posting and reading ──
  async post(req, p, me) {
    const b = jsonBody(req), meta = this.m(), now = this.now(), d = dayOf(now);
    if (b.ch !== 'a' && b.ch !== 'm') fail(400, 'bad_request');
    if (b.ch === 'a') this.runs(me);
    else if (meta.posts === 'admins' && me.role === 'member') fail(403, 'forbidden', 'Only the people who run this group can post here.');
    // Refused before anything is stored, in this object's memory.
    if (!this.hit(this.posting, 'm|' + me.iid, 60000, R.postsPerMin) || !this.hit(this.posting, 'd|' + me.iid, DAY, R.postsPerDay)) fail(429, 'rate_limit', 'That is a lot of posts. Wait a little.');
    if (meta.day.d === d && meta.day.posts >= R.groupPostsPerDay) fail(429, 'rate_limit', 'This group has posted all it can today. It opens again after midnight UTC.');
    const env = cleanEnv(b.env, R.post);
    if (!env) fail(413, 'too_large', 'That is too long to post.');
    if (env.from !== p.identity) fail(403, 'forbidden', 'You can only post as yourself.');
    if (env.ch !== b.ch) fail(400, 'bad_request');
    if (env.e > meta.epoch || env.e < meta.epoch - 1) fail(409, 'stale', 'The group\'s key changed. Try again.', { epoch: meta.epoch });
    const size = sizeOf(env);
    await this.relayRoom(size);
    const room = this.planRoom(size), t = this.today();
    let s = 0;
    this.store.tx(() => {
      for (const k of room.del) this.store.del(k);
      s = this.next();
      this.store.put('i/' + pad(s), { s, ch: b.ch, from: me.iid, at: now, exp: now + R.itemMs, env, size });
      meta.used = room.used + size; meta.in = room.n + 1;
      meta.day = { ...t, posts: t.posts + 1 };
      this.saveMeta();
    });
    this.tell({ t: 'chg', s });
    await this.report();
    return reply(200, { s }, now);
  }
  /** Oldest notes go first when a group is full; announcements only when nothing else is left. Only works out what would go: nothing changes until it fits. */
  planRoom(size) {
    const meta = this.m();
    let used = meta.used, n = Number.isInteger(meta.in) ? meta.in : this.store.list({ prefix: 'i/' }).length;
    const del = [];
    if (used + size <= R.store && n < R.items) return { del, used, n };
    const rows = this.store.list({ prefix: 'i/' });
    for (const pass of ['m', 'a']) {
      for (const [k, v] of rows) {
        if (used + size <= R.store && n < R.items) return { del, used, n };
        if (v.ch !== pass) continue;
        del.push(k); used = Math.max(0, used - (v.size || 0)); n--;
      }
    }
    if (used + size > R.store) fail(507, 'quota', 'This group is full.');
    return { del, used, n };
  }
  async profile(req, p, me) {
    const b = jsonBody(req), meta = this.m(), now = this.now();
    if (!this.hit(this.profiling, me.iid, HOUR, R.profilesPerHour)) fail(429, 'rate_limit');
    const env = cleanEnv(b.env, R.profile);
    if (!env) fail(413, 'too_large');
    if (env.from !== p.identity) fail(403, 'forbidden', 'You can only change your own card.');
    if (env.ch !== 'p') fail(400, 'bad_request');
    const k = 'p/' + me.iid, old = this.store.get(k), size = sizeOf(env), delta = size - (old ? old.size : 0);
    if (meta.used + delta > R.store) fail(507, 'quota', 'This group is full.');
    await this.relayRoom(delta);
    const s = this.next();
    this.store.tx(() => {
      this.store.put(k, { iid: me.iid, s, at: now, env, size });
      meta.used += delta; meta.ps = s;
      this.saveMeta();
    });
    this.tell({ t: 'chg', s });
    await this.report();
    return reply(200, { s }, now);
  }
  /** One sealed request to one member (add as friend). The relay only checks both are in the group, and how many. */
  async dm(req, p, me) {
    const b = jsonBody(req), meta = this.m(), now = this.now();
    if (typeof b.to !== 'string' || !IID_RE.test(b.to) || !isObj(b.env) || sizeOf(b.env) > R.dm) fail(413, 'too_large');
    if (b.to === me.iid) fail(400, 'bad_request');
    const to = this.store.get('m/' + b.to);
    if (!to) fail(404, 'not_found', 'They are no longer in this group.');
    const seat = this.seatDay(me), size = sizeOf(b.env);
    if (seat.dm >= R.dmPerDay) fail(429, 'rate_limit', 'That is a lot of requests today. Try again tomorrow.');
    if (this.store.list({ prefix: `d/${b.to}/` }).length >= R.dmPending) fail(507, 'quota', 'They have many requests waiting. Try again later.');
    // Counted against the group's room, and the group's requests can never take the room its noticeboard needs.
    if ((meta.dmUsed || 0) + size > R.dmStore || meta.used + size > R.store) fail(507, 'quota', 'This group has too many requests waiting. Try again later.');
    await this.relayRoom(size);
    const s = this.next();
    this.store.tx(() => {
      this.store.put(`d/${b.to}/${pad(s)}`, { s, from: me.iid, at: now, exp: now + R.itemMs, env: b.env, size });
      this.store.put('m/' + me.iid, { ...me, day: { ...seat, dm: seat.dm + 1 } });
      meta.used += size; meta.dmUsed = (meta.dmUsed || 0) + size;
      this.saveMeta();
    });
    this.tell({ t: 'chg', s }, (a) => a.iid === b.to);
    await this.report();
    return reply(200, { s }, now);
  }
  dmAck(req, p) {
    const b = jsonBody(req), meta = this.m();
    if (!Array.isArray(b.ss) || b.ss.length > 100 || !b.ss.every(n => Number.isInteger(n) && n > 0)) fail(400, 'bad_request');
    this.store.tx(() => {
      for (const n of b.ss) { const k = `d/${p.iid}/${pad(n)}`, v = this.store.get(k); if (v) { this.store.del(k); meta.used = Math.max(0, meta.used - (v.size || 0)); meta.dmUsed = Math.max(0, (meta.dmUsed || 0) - (v.size || 0)); } }
      this.saveMeta();
    });
    return reply(200, { ok: true }, this.now());
  }
  feed(req, p, me) {
    const meta = this.m(), doc = this.doc(), now = this.now();
    const since = qnum(req, 'since', 0), ke = qnum(req, 'ke', 0), au = qnum(req, 'au', 0);
    const runs = me.role === 'owner' || me.role === 'admin';
    const out = { head: meta.s, s: meta.s, rs: meta.rs, more: false, epoch: meta.epoch, due: meta.due, n: meta.n, mode: meta.mode, posts: meta.posts, role: me.role, since: me.since || 0 };
    // Nothing new: an answer that reads no rows (the common case, every few minutes for every member).
    if (since >= meta.s && ke >= meta.epoch && au >= (doc.auth ? doc.auth.seq : 0)) { if (runs) out.limits = { warn: R.warnMembers, max: R.members }; return reply(200, out, now); }
    // A change to the list would otherwise read every row once per person: N squared. Once per change is enough.
    if (meta.rs > since) { if (this.rosterS !== meta.rs) { this.rosterOut = this.store.list({ prefix: 'm/' }).map(([, r]) => ({ iid: r.iid, key: r.key, x: r.x, role: r.role, at: r.at, admit: r.admit })); this.rosterS = meta.rs; } out.roster = this.rosterOut; }
    if (ke < meta.epoch) out.keys = this.memberInfo(me).wrap || null;
    if (ke < meta.epoch && !out.keys && meta.mode === 'open') out.linkWrap = doc.linkWrap;
    if (meta.ds > since || ke < meta.epoch) out.card = doc.cardK;
    if (au < (doc.auth ? doc.auth.seq : 0)) out.auths = (doc.auths || []).filter(a => a.seq > au);
    const dms = this.store.list({ prefix: `d/${me.iid}/` });
    if (dms.length) out.dms = dms.map(([, d]) => ({ s: d.s, from: d.from, at: d.at, env: d.env }));
    // Posts and profiles in order, cut at a size an app can take. A newcomer sees announcements, not older notes.
    const items = [];
    const first = since + 1;
    for (const [, v] of this.store.list({ start: 'i/' + pad(first), end: 'i/~', limit: 500 })) if (v.ch === 'a' || v.s > (me.since || 0)) items.push({ t: 'post', s: v.s, ch: v.ch, from: v.from, at: v.at, env: v.env, size: v.size });
    if (meta.ps > since) for (const [, v] of this.store.list({ prefix: 'p/' })) if (v.s > since) items.push({ t: 'prof', s: v.s, iid: v.iid, at: v.at, env: v.env, size: v.size });
    items.sort((a, b) => a.s - b.s);
    let bytes = 0; out.items = [];
    for (const it of items) {
      if (bytes && bytes + it.size > R.feedBytes) { out.more = true; out.s = out.items[out.items.length - 1].s; break; }
      bytes += it.size || 0;
      const { size, ...rest } = it;
      out.items.push(rest);
    }
    if (runs) {
      if (meta.qs > since || since === 0) out.requests = this.store.list({ prefix: 'q/' }).map(([, q]) => ({ iid: q.iid, key: q.key, x: q.x, env: q.env, at: q.at, via: q.via }));
      out.blocks = this.store.list({ prefix: 'b/' }).filter(([, b]) => b.blocked).map(([k, b]) => ({ iid: k.slice(2), at: b.at }));
      out.link = meta.link ? { v: meta.link.v, exp: meta.link.exp, maxUses: meta.link.maxUses, uses: meta.link.uses } : null;
      out.code = !!meta.codeKey;
      out.used = meta.used;
      out.limits = { warn: R.warnMembers, max: R.members, store: R.store };
    }
    return reply(200, out, now);
  }

  // ── sockets ──
  async canUpgrade() { if (!this.m()) fail(404, 'not_found'); }
  async socketFor(p) {
    const r = this.memberOf(p);
    return { runs: r.role === 'owner' || r.role === 'admin' };
  }
  ready() { return { s: this.m().s, epoch: this.m().epoch }; }
  async onSocket() { fail(400, 'bad_request'); }
  /**
   * A change makes every online member fetch, so telling everyone costs as many requests as there are people. In a big group
   * that would use up the day whether someone means to or not: at once after a quiet spell, then at most once per window (and once more at
   * its end, by alarm). Telling one person, or the few who run the group, is not held back.
   */
  tell(msg, filter = null) {
    if (filter) { this.broadcast(filter, msg); return; }
    const now = this.now(), n = this.m().n;
    const w = n < R.fanoutFree ? 0 : Math.min(R.fanoutMaxMs, n * R.fanoutPerPerson);
    if (now - this.toldAt >= w) { this.toldAt = now; this.tellDue = false; this.broadcast(() => true, { t: 'chg', s: this.m().s }); return; }
    if (!this.tellDue) { this.tellDue = true; this.io.setAlarm(this.toldAt + w); }
  }
  /** Something only the people who run the group can finish: they hear now, everyone else in their turn. */
  tellDue_() { const s = this.m().s; this.broadcast((a) => a.runs, { t: 'chg', s }); this.tell({ t: 'chg', s }); }

  // ── the end, and housekeeping ──
  async wipe() {
    const meta = this.m();
    if (!meta) return;
    const iids = this.store.list({ prefix: 'm/' }).map(([k]) => k.slice(2));
    for (const s of this.sockets()) { try { s.close(4410, 'gone'); } catch { /* gone */ } }
    try { await this.io.call('reg', 'rgLeave', { gid: this.gid, iids, deleted: true, code: meta.codeKey }); } catch { /* a grant left behind runs on: its owner sees it in Settings > Your relay */ }
    try { await this.io.call('reg', 'release', { space: this.name }); } catch { /* the registry's daily pass */ }
    this.store.deleteAll();
    this.meta = null; this.docCache = undefined; this.rosterS = -1; this.rosterOut = null;
  }
  async housekeep(now) {
    const meta = this.m();
    if (!meta) return;
    if (this.tellDue) { this.tellDue = false; this.toldAt = now; this.broadcast(() => true, { t: 'chg', s: meta.s }); }
    // An alarm for a held message comes often in a busy group: the rest is for once a day.
    if (this.hkAt && now - this.hkAt < DAY - HOUR) { this.io.setAlarm(this.hkAt + DAY); return; }
    this.hkAt = now;
    if (now - (meta.seen || meta.at) > R.idleMs) { await this.wipe(); return; }
    // What the group holds, worked out from the rows themselves, so nothing can drift for good.
    const doc = this.doc();
    let used = sizeOf(doc.cardK || null) + sizeOf(doc.cardL || null), items = 0, dm = 0;
    for (const [k, v] of this.store.list({ prefix: 'i/' })) {
      if (v.exp <= now) { this.store.del(k); continue; }
      used += v.size || 0; items++;
    }
    for (const [, v] of this.store.list({ prefix: 'p/' })) used += v.size || 0;
    for (const [k, v] of this.store.list({ prefix: 'd/' })) {
      if (v.exp <= now) { this.store.del(k); continue; }
      used += v.size || 0; dm += v.size || 0;
    }
    meta.used = used; meta.in = items; meta.dmUsed = dm;
    for (const [k, v] of this.store.list({ prefix: 'q/' })) if (v.at < now - R.itemMs) this.store.del(k);
    for (const [k, v] of this.store.list({ prefix: 'dc/' })) if (v.at < now - R.declinedMs) this.store.del(k);
    const pg = this.store.list({ prefix: 'pg/' });
    for (const [k] of pg) await this.ungrant(k.slice(3));
    this.saveMeta();
    await this.report(true);
    this.io.setAlarm(now + (this.store.list({ prefix: 'pg/' }).length ? 15 * 60000 : DAY));
  }
}
export { RelayError };
