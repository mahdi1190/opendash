// lib/relay/space-room.mjs - a pass-through room (space "rt:<id>", docs/dev/GARDEN_TOGETHER.md section 4).
// Two or more people's sockets and nothing else: what comes in goes straight out, sealed end to end by the
// people themselves. IT WRITES NOTHING TO STORAGE: a free-tier relay's tightest limit is rows written, so the
// store below refuses writes and alarms are switched off. Pure.
//
//   id        SHA-256("opendash-relay-room-v1\n" + hostKey + "\n" + nonce): a room belongs to one key
//   the host  the relay's owner or a member with the 'message' scope, let in by the owner and not only through a group (a stranger cannot use this as free transport)
//   a guest   needn't be a member: shows the host's signature over ("...ticket-v1\n" + id + "\n" + guestKey + "\n" + exp)
//   to host   {t:'to', env}                      goes out as {t:'fwd', f:<guest's iid>, env}
//   to guests {t:'to', b:[[iid, env], ...]}      one message for a whole broadcast (incoming messages are what Cloudflare counts)
//   kick      {t:'kick', g:<iid>}                closes that socket, and the key cannot come back to this room (until {t:'unban', g})
// The host's socket closing closes the room. All that must survive hibernation is in the sockets' attachments
// (a room has no rows, so even its name is there: `sp`, which the Worker asks for on waking).
// A flood is dropped before anything is parsed. Rooms never touch the per-key request limits sync uses (8.1); they have
// their own day: this room's count is in the host's attachment (it outlives a hibernation), and every ROOM.flush messages
// it goes to the registry, which counts each host key and the whole relay and says when to stop (space-reg.mjs, 'rr').

import * as A from './auth.mjs';
import { Space, fail, isObj, dayOf } from './base.mjs';

const KiB = 1024;
export const ROOM = Object.freeze({
  guests: 12, msg: 32 * KiB, guestMsg: 8 * KiB, batch: 13, perSec: 40, perMin: 1200, strikes: 200, bans: 32, ticketMaxMs: 6 * 3600000,
  // A day's allowance (docs/dev/GARDEN_TOGETHER.md section 4). Incoming socket messages count 20 to 1 against Workers Free's 100,000 requests:
  // one guest 300 request-equivalents, one room 3,000, one host key 6,000, the whole relay 15,000 (it stops long before sync could feel it).
  guestDay: 1e9, perDay: 1e9, perKeyDay: 1e9, relayDay: 1200000,   // no per-person limits (the owner's choice); relayDay stops at 60% of the free day so sync keeps working
  // Workers Free's 13,000 GB-s is about 28 hours of a room in memory: a room counts as in memory for up to idleMs after each message.
  keyActiveMs: 6 * 3600000, relayActiveMs: 12 * 3600000, idleMs: 10000,
  signIn: 40,                                  // a socket is a Worker request and a Durable Object request: 40 messages' worth
  flush: 1024, flushMs: 10 * 60000,            // how often a room tells the registry (one row each time, never one in the room)
  keyRooms: 3, keyOpensPerHour: 12, gsMax: 16, // rooms of one key at once (a fourth closes the oldest); opened an hour; guests counted per room
});
export const roomIdOf = (hostKey, nonce) => A.sha256b64u(`opendash-relay-room-v1\n${hostKey}\n${nonce}`);
export const roomTicketText = (id, key, exp) => `opendash-relay-room-ticket-v1\n${id}\n${key}\n${exp}`;

/** What a room is given instead of a store: reads say nothing is there, a write is a bug. */
const te = new TextEncoder();
const tooBig = (s, max) => s.length > max || (s.length * 3 > max && te.encode(s).length > max);   // bytes, as a socket counts them (the sum only when it could matter)
const HOST_GONE = '{"t":"closed","why":"host"}', BUDGET = '{"t":"err","error":"budget"}';
const NO_STORE = Object.freeze({
  writes: 0, get() { return undefined; }, list() { return []; }, tx: (fn) => fn(), del() {}, deleteAll() {}, kept: () => false,
  put() { throw new Error('a room stores nothing'); },
});

export class Room extends Space {
  constructor(name, { io }) {
    super(name, { store: NO_STORE, io: { ...io, setAlarm() {} } });   // base.upgrade asks for an alarm; a late sign-in is refused when it comes, and the next upgrade closes it
    this.win = new Map();     // iid -> {s, ns, m, nm, bad}
    this.retryAt = 0;         // the registry did not answer: when to ask again
  }
  async handle() { fail(404, 'not_found'); }
  async canUpgrade() {}
  async upgrade(req) { const r = await super.upgrade(req); if (r && r.upgrade) r.upgrade.att.sp = this.name; return r; }
  hostSock(not) { return this.sockets(a => a.authed && a.rk === 'h' && (!not || a.at !== not.at))[0] || null; }

  async socketFor(p, m) {
    const now = this.now();
    if (!isObj(m) || !A.KEY_RE.test(m.host || '') || !A.NONCE_RE.test(m.nonce || '')) fail(400, 'bad_request');
    if (this.name !== 'rt:' + await roomIdOf(m.host, m.nonce)) fail(403, 'forbidden');
    if (p.device) fail(403, 'forbidden');                                 // the person's own key: a ticket names one
    if (p.identity === m.host) {
      this.need(p, 'message');
      if (p.pending || p.groupOnly) fail(403, 'scope');
      // the registry keeps this key's rooms and what they cost: over its day or the relay's, no room
      const r = await this.io.call('reg', 'room-open', { iid: p.iid, id: this.name.slice(3) });
      if (!r || r.ok !== true) { if (r && r.why === 'revoked') fail(403, 'not_member'); fail(429, 'rate_limit'); }
      for (const s of this.sockets(a => a.authed && a.rk === 'h')) { try { s.close(4409, 'replaced'); } catch { /* gone */ } }
      return { sp: this.name, rk: 'h', ban: [], d: dayOf(now), n: 0, u: 0, ms: 0, la: now, gs: {} };
    }
    const exp = m.exp;
    if (!Number.isFinite(exp) || exp <= now || exp > now + ROOM.ticketMaxMs) fail(403, 'forbidden');
    if (typeof m.ticket !== 'string' || !(await A.verify(m.host, m.ticket, roomTicketText(this.name.slice(3), p.key, exp)))) fail(403, 'forbidden');
    const h = this.hostSock();
    if (!h) fail(410, 'gone');
    if ((h.att.ban || []).includes(p.iid)) fail(403, 'forbidden');
    const mine = this.sockets(a => a.authed && a.rk === 'g' && a.iid === p.iid);
    for (const s of mine) { try { s.close(4409, 'replaced'); } catch { /* gone */ } }
    if (this.sockets(a => a.authed && a.rk === 'g').length - mine.length >= ROOM.guests) fail(429, 'rate_limit');
    this.spend(h, now, ROOM.signIn, p.iid);
    return { sp: this.name, rk: 'g' };
  }
  ready(att) {
    if (att.rk === 'g') { const h = this.hostSock(); if (h) { try { h.send(JSON.stringify({ t: 'peer', g: att.iid, on: true })); } catch { /* gone */ } } }
    return { g: att.iid };
  }
  /** A flood costs a Map lookup. Over the rate: dropped; a socket that keeps at it is closed. */
  allow(iid, now, sock) {
    let w = this.win.get(iid);
    if (!w) { if (this.win.size > 64) this.win.clear(); w = { s: 0, ns: 0, m: 0, nm: 0, bad: 0 }; this.win.set(iid, w); }
    const s = Math.floor(now / 1000), mi = Math.floor(now / 60000);
    if (w.s !== s) { w.s = s; w.ns = 0; }
    if (w.m !== mi) { w.m = mi; w.nm = 0; w.bad = 0; }
    if (++w.ns > ROOM.perSec || ++w.nm > ROOM.perMin) {
      if (++w.bad > ROOM.strikes) { try { sock.close(4429, 'flood'); } catch { /* gone */ } }
      return false;
    }
    return true;
  }
  /** What just came in, whatever becomes of it (Cloudflare has counted it already), on the host's attachment. */
  spend(h, now, cost = 1, from = null) {
    const a = h.att || {}, d = dayOf(now), same = a.d === d, gs = same ? { ...(a.gs || {}) } : {};
    if (from) { gs[from] = (gs[from] || 0) + cost; const ks = Object.keys(gs); if (ks.length > ROOM.gsMax) delete gs[ks[0]]; }
    const next = { ...a, d, n: (same ? a.n || 0 : 0) + cost, u: (a.u || 0) + cost, ms: (a.ms || 0) + Math.min(ROOM.idleMs, Math.max(0, now - (a.la || 0))), la: now, gs };
    try { h.setAtt(next); } catch { /* gone */ }
    return next;
  }
  /** Tell the registry what this room has cost since it last did: true, 'budget' or 'revoked' (stop), null (no answer). */
  async report(a, h, end = false) {
    const n = a.u || 0, ms = a.ms || 0;
    if (!n && !ms && !end) return true;
    let r = null;
    try { r = await this.io.call('reg', 'room-spend', { iid: a.iid, id: this.name.slice(3), n, ms, ...(end ? { end: true } : {}) }); } catch { return null; }
    if (h) { const c = h.att || a; try { h.setAtt({ ...c, u: Math.max(0, (c.u || 0) - n), ms: Math.max(0, (c.ms || 0) - ms) }); } catch { /* gone */ } }
    return r && r.ok === false ? r.why || 'budget' : true;
  }
  closeAll(code, why, say) {
    for (const s of this.sockets(x => x.authed)) { try { if (say !== HOST_GONE || s.att.rk === 'g') s.send(say); s.close(code, why); } catch { /* gone */ } }
  }
  /** One guest is over their share: that socket goes, the key cannot come back to this room, the room goes on. The host hears. */
  overShare(h, sock, iid) {
    const c = h.att || {}, ban = [...(c.ban || [])];
    if (!ban.includes(iid)) { ban.push(iid); if (ban.length > ROOM.bans) ban.shift(); try { h.setAtt({ ...c, ban }); } catch { /* gone */ } }
    try { h.send(JSON.stringify({ t: 'over', g: iid })); } catch { /* gone */ }
    try { sock.send('{"t":"err","error":"share"}'); sock.close(4429, 'share'); } catch { /* gone */ }
  }
  /** Every so often, and it may be the moment to stop. */
  async settleDay(h, now) {
    const c = h.att || {};
    if (((c.u || 0) < ROOM.flush && (c.ms || 0) < ROOM.flushMs) || now < this.retryAt) return;
    const r = await this.report(c, h);
    if (r === true) return;
    if (r === null) { this.retryAt = now + 15000; if ((c.u || 0) < ROOM.flush * 4) return; }   // the registry is not answering: not for long on credit
    if (r === 'revoked') this.closeAll(4403, 'revoked', HOST_GONE); else this.closeAll(4429, 'budget', BUDGET);
  }
  async wsNow(sock, data) {
    const a = sock.att;
    if (!a || !a.authed) return super.wsNow(sock, data);    // the challenge and answer (base.mjs): only ever once a socket
    const now = this.now(), h = this.hostSock(), guest = a.rk === 'g';
    if (!h) { try { sock.close(4410, 'closed'); } catch { /* gone */ } return undefined; }
    const paid = this.spend(h, now, 1, guest ? a.iid : null);
    if (paid.n > ROOM.perDay) { await this.report(paid, h); this.closeAll(4429, 'budget', BUDGET); return undefined; }
    if (guest && (paid.gs[a.iid] || 0) > ROOM.guestDay) { this.overShare(h, sock, a.iid); return this.settleDay(h, now); }
    if (this.allow(a.iid, now, sock)) {
      // too big: only the sender goes
      if (typeof data !== 'string' || tooBig(data, guest ? ROOM.guestMsg : ROOM.msg)) { try { sock.close(1009, 'too large'); } catch { /* gone */ } } else this.carry(sock, h, guest, a.iid, data);
    }
    return this.settleDay(h, now);
  }
  /** One message that has passed everything: to the host, or from the host. */
  carry(sock, h, guest, iid, data) {
    let m;
    try { m = JSON.parse(data); } catch { m = null; }
    if (!isObj(m)) return undefined;
    if (guest) {
      if (m.t === 'to' && isObj(m.env)) { try { h.send(JSON.stringify({ t: 'fwd', f: iid, env: m.env })); } catch { /* gone */ } }
      return undefined;
    }
    const a = sock.att || {};
    if (m.t === 'to' && Array.isArray(m.b) && m.b.length <= ROOM.batch) {
      const guests = new Map(this.sockets(x => x.authed && x.rk === 'g').map(s => [s.att.iid, s]));
      for (const row of m.b) {
        if (!Array.isArray(row) || !isObj(row[1])) continue;
        const s = guests.get(row[0]);
        if (s) { try { s.send(JSON.stringify({ t: 'fwd', env: row[1] })); } catch { /* gone */ } }
      }
      return undefined;
    }
    if (m.t === 'unban' && typeof m.g === 'string' && (a.ban || []).includes(m.g)) { sock.setAtt({ ...a, ban: a.ban.filter(x => x !== m.g) }); return undefined; }   // the host let them back in
    if (m.t === 'kick' && typeof m.g === 'string' && m.g.length <= 32) {
      const ban = [...(a.ban || [])];
      if (!ban.includes(m.g)) { ban.push(m.g); if (ban.length > ROOM.bans) ban.shift(); sock.setAtt({ ...a, ban }); }
      for (const s of this.sockets(x => x.authed && x.rk === 'g' && x.iid === m.g)) { try { s.send('{"t":"closed","why":"kick"}'); s.close(4403, 'kick'); } catch { /* gone */ } }
    }
    return undefined;
  }
  /** The registry took a member's access back (or a newer room of theirs needs the place): if this room is theirs, it is over at once. */
  memberRevoked(body) {
    const iid = body && typeof body.iid === 'string' ? body.iid : null, h = this.hostSock();
    if (h && h.att && h.att.iid === iid) { this.snap = null; this.snapAt = 0; if (body.why === 'replaced') this.closeAll(4409, 'replaced', HOST_GONE); else this.closeAll(4403, 'revoked', HOST_GONE); return { ok: true }; }
    return super.memberRevoked(body);
  }
  /** A socket went. The host: the room is over, and the registry hears the last of what it cost. A guest: the host hears. */
  async wsClose(sock) {
    const a = sock.att;
    if (!a || !a.authed) return;
    if (a.rk === 'h') {
      const newer = this.hostSock(a);                                     // replaced by a newer socket of the same host: the room goes on
      if (!newer) for (const s of this.sockets(x => x.authed && x.rk === 'g')) { try { s.send(HOST_GONE); s.close(4410, 'closed'); } catch { /* gone */ } }
      await this.report(a, null, !newer);
    } else {
      const h = this.hostSock();
      if (h) { try { h.send(JSON.stringify({ t: 'peer', g: a.iid, on: false })); } catch { /* gone */ } }
    }
  }
}
