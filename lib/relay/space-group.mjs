// lib/relay/space-group.mjs - one sync group's mailbox (space "g:<gid>",
// docs/dev/RELAY_PROTOCOL.md section 5): per device an append-only log of
// sealed records with the folder's byte offsets, slots (device / snapshot /
// keys / pair), sealed blobs, a changes feed and live push. The relay only
// stores what the devices sealed (SYNC_FORMAT.md section 11). Pure.
//
// Keys:  meta   dv/<dev>   f/<dev>/<file>   l/<s, 13 digits> one line
//        s/<dev>/<name> + sp/<dev>/<name>/<i>   b/<dev>/<loc> + bp/<dev>/<loc>/<i>

import * as A from './auth.mjs';
import { Space, LIMITS, fail, reply, replyRaw, jsonBody, text, qnum, qflag, pad, isObj, DEV_RE, B64_43, putParts, getParts, delParts } from './base.mjs';

const DAY = 86400000;
const LOG_RE = /^ops-\d{8}(-\d{2})?\.jsonl$/;
const SLOTS = Object.freeze(['device', 'snapshot', 'keys', 'pair']);
const LOC_RE = /^[0-9a-f]{32}$/;
const KID_RE = /^[0-9a-f]{16}$/;
const te = new TextEncoder();

const fileView = (f) => (f.gone ? { s: f.s, dev: f.dev, file: f.file, gone: true } : { s: f.s, dev: f.dev, file: f.file, size: f.size, first: f.first });
const slotView = (r, body) => (r.gone ? { s: r.s, dev: r.dev, name: r.name, gone: true } : { s: r.s, dev: r.dev, name: r.name, ver: r.ver, size: r.size, at: r.at, ...(body != null ? { body } : {}) });
const blobView = (b) => (b.gone ? { s: b.s, dev: b.dev, loc: b.loc, gone: true } : { s: b.s, dev: b.dev, loc: b.loc, size: b.size, at: b.at });
const devView = (d) => ({ s: d.s, dev: d.dev, since: d.since, ...(d.revoked ? { revoked: d.revoked } : {}) });

export class Group extends Space {
  constructor(name, deps) {
    super(name, deps);
    this.gid = name.slice(2);
    this.meta = undefined;
    this.idx = null;
    this.soft = new Map();     // dev/name -> {ver, body, at}: device heartbeats not stored yet
    this.acks = new Map();     // dev -> s, stored at most every 10 minutes
  }
  m() { if (this.meta === undefined) this.meta = this.store.get('meta') || null; return this.meta; }
  saveMeta() { this.store.put('meta', this.meta); }
  index() {
    if (this.idx) return this.idx;
    const idx = { dv: new Map(), f: new Map(), s: new Map(), b: new Map() };
    for (const [, v] of this.store.list({ prefix: 'dv/' })) idx.dv.set(v.dev, v);
    for (const [, v] of this.store.list({ prefix: 'f/' })) idx.f.set(v.dev + '/' + v.file, v);
    for (const [, v] of this.store.list({ prefix: 's/' })) idx.s.set(v.dev + '/' + v.name, v);
    for (const [, v] of this.store.list({ prefix: 'b/' })) idx.b.set(v.dev + '/' + v.loc, v);
    this.idx = idx;
    return idx;
  }
  next() { return ++this.meta.s; }
  /** Run a set of writes atomically; on failure forget the cached state (it is read again). */
  write(fn) {
    try { return this.store.tx(fn); } catch (e) { this.meta = undefined; this.idx = null; throw e; }
  }
  usage() { const m = this.m(); return m ? { iid: m.owner, used: m.used } : null; }
  online(dev) { return this.sockets(a => a.authed && a.dev === dev).length > 0; }
  /** Send a change to every other device's socket (a big one as a "fetch it" note). */
  push(fromDev, msg) {
    let t = JSON.stringify(msg);
    if (t.length > LIMITS.wsChg) t = JSON.stringify({ t: 'chg', s: msg.s, more: true });
    for (const s of this.sockets(a => a.authed && a.dev !== fromDev)) { try { s.send(t); } catch { /* closed */ } }
  }
  closeDev(dev, code = 4403, why = 'removed') {
    for (const s of this.sockets(a => a.dev === dev)) { try { s.close(code, why); } catch { /* gone */ } }
  }

  // ── who may ──
  async member(req) {
    const p = await this.auth(req);
    this.need(p, 'sync');
    const m = this.m();
    if (!m) fail(404, 'not_found');
    if (p.identity !== m.ownerKey) fail(403, 'forbidden');
    return p;
  }
  enrolled(p) {
    for (const d of this.index().dv.values()) if (d.key === p.key && !d.revoked) return d;
    fail(403, 'forbidden', 'This device is not in this sync group.');
  }
  own(p, dev) {
    const d = this.index().dv.get(dev);
    if (!d || d.revoked || d.key !== p.key) fail(403, 'forbidden');
    return d;
  }

  async internal(op) {
    if (op === 'purge') {
      for (const s of this.sockets()) { try { s.close(4410, 'gone'); } catch { /* gone */ } }
      this.store.deleteAll(); this.meta = null; this.idx = null;
      return { ok: true };
    }
    fail(404, 'not_found');
  }

  async handle(req) {
    const { method } = req;
    const rest = req.path.slice(('/v1/g/' + this.gid).length) || '/';
    if (rest === '/enrol' && method === 'POST') return this.enrol(req);
    const p = await this.member(req), now = this.now();
    if (method !== 'GET') await this.pay(p, !rest.endsWith('/ack'));    // acks: counted, never refused (see onSocket)
    let m;
    if (rest === '/' && method === 'GET') return this.info(p);
    if (rest === '/files' && method === 'GET') { this.enrolled(p); return this.files(); }
    if (rest === '/changes' && method === 'GET') { this.enrolled(p); return reply(200, this.changes(qnum(req, 'since', 0), qnum(req, 'max', LIMITS.feedDefault, LIMITS.feedMax)), now); }
    if (rest === '/cap' && method === 'POST') return this.cap(p, jsonBody(req));
    if (rest === '/revoke' && method === 'POST') return this.revoke(p, jsonBody(req));
    if (!(m = /^\/d\/([0-9a-f]{16})(\/.*)?$/.exec(rest))) fail(404, 'not_found');
    const dev = m[1], sub = m[2] || '';
    if (sub === '' && method === 'DELETE') return this.prune(p, dev);
    if (sub === '/log' && method === 'POST') {
      const b = jsonBody(req);
      return reply(200, await this.append(p, dev, b.file, b.lines), now);
    }
    if ((m = /^\/log\/(ops-\d{8}(?:-\d{2})?\.jsonl)$/.exec(sub))) {
      if (method === 'GET') { this.enrolled(p); return this.readLog(dev, m[1], qnum(req, 'from', 0), qnum(req, 'max', LIMITS.feedDefault, LIMITS.readMax)); }
      if (method === 'DELETE') return this.removeLog(p, dev, m[1], qnum(req, 'size', -1));
    }
    if ((m = /^\/s\/(device|snapshot|keys|pair)$/.exec(sub))) {
      if (method === 'PUT') return this.putSlot(req, p, dev, m[1]);
      if (method === 'GET') { this.enrolled(p); return this.getSlot(dev, m[1]); }
      if (method === 'DELETE') return this.delSlot(p, dev, m[1]);
    }
    if (sub === '/b' && method === 'GET') {
      this.enrolled(p);
      const blobs = [...this.index().b.values()].filter(b => b.dev === dev && !b.gone).map(b => ({ loc: b.loc, size: b.size, at: b.at }));
      return reply(200, { blobs }, now);
    }
    if ((m = /^\/b\/([0-9a-f]{32})$/.exec(sub))) {
      if (method === 'PUT') return this.putBlob(req, p, dev, m[1]);
      if (method === 'GET') { this.enrolled(p); return this.getBlob(dev, m[1]); }
      if (method === 'DELETE') return this.delBlob(p, dev, m[1]);
    }
    if (sub === '/ack' && method === 'POST') { this.own(p, dev); this.ack(dev, jsonBody(req).s); return reply(200, { ok: true }, now); }
    fail(404, 'not_found');
  }

  // ── membership (5.1) ──
  async enrol(req) {
    const p = await this.auth(req);
    this.need(p, 'sync');
    if (!p.device) fail(400, 'bad_request', 'Enrol with a device key and its certificate.');
    await this.pay(p);
    const b = jsonBody(req), now = this.now();
    if (!DEV_RE.test(b.dev || '') || !KID_RE.test(b.kid || '') || !Number.isInteger(b.n) || b.n < 0 || !B64_43.test(b.cap || '')) fail(400, 'bad_request');
    const capHash = await A.sha256b64u(b.cap);
    let m = this.m();
    if (!m) {
      await this.io.call('reg', 'claim', { space: this.name, iid: p.iid, kind: 'g' });
      m = this.meta = { gid: this.gid, owner: p.iid, ownerKey: p.identity, capHash, capKid: b.kid, capN: b.n, s: 0, used: 0, blobUsed: 0, floor: 0, created: now, lastWrite: now };
    } else {
      const capOk = b.kid === m.capKid && A.sameText(capHash, m.capHash);
      if (p.identity !== m.ownerKey) {
        // The person renewed their identity (FRIENDS.md section 15): the group moves to the new one, but only
        // once the identity it belongs to has no access here any more (not the owner key, no active grant),
        // and only for a device that shows the group's CURRENT capability (it holds the person's sync key).
        if (!capOk || (await this.who(m.ownerKey)).role !== 'anonymous') fail(403, 'forbidden');
        m.owner = p.iid; m.ownerKey = p.identity;
      }
      if (!capOk) fail(403, 'forbidden', 'The sync key does not match this group.');
    }
    const idx = this.index(), old = idx.dv.get(b.dev);
    if (old && old.revoked) fail(410, 'gone', 'This device was removed from the group. Join again as a new device.');
    if (!old && [...idx.dv.values()].filter(d => !d.revoked).length >= LIMITS.groupDevices) fail(507, 'quota', `A sync group holds at most ${LIMITS.groupDevices} devices.`);
    const d = { dev: b.dev, key: p.key, since: old ? old.since : now, seen: now, ack: old ? old.ack : 0, ackAt: 0, lastN: old ? old.lastN : 0, snapS: old ? old.snapS : 0, revoked: null, s: 0 };
    this.write(() => { d.s = this.next(); m.lastWrite = now; this.store.put('dv/' + b.dev, d); this.saveMeta(); });
    if (old && old.key !== p.key) this.closeDev(b.dev, 4401, 'moved');
    idx.dv.set(b.dev, d);
    this.io.setAlarm(now + DAY);
    this.push(b.dev, { t: 'chg', s: d.s, devices: [devView(d)] });
    return reply(200, { gid: this.gid, dev: b.dev, s: m.s, floor: m.floor }, now);
  }
  info(p) {
    const m = this.m();
    const devices = [...this.index().dv.values()].map(d => ({ dev: d.dev, since: d.since, seen: d.seen, online: this.online(d.dev), revoked: d.revoked || null }));
    return reply(200, { owner: m.owner, devices, s: m.s, floor: m.floor, used: m.used, max: LIMITS.group, blobUsed: m.blobUsed, blobMax: LIMITS.groupBlobs, cap: { kid: m.capKid, n: m.capN } }, this.now());
  }
  async cap(p, b) {
    this.enrolled(p);
    const m = this.m();
    if (!KID_RE.test(b.kid || '') || !Number.isInteger(b.n) || b.n < 0 || !B64_43.test(b.cap || '')) fail(400, 'bad_request');
    if (b.n < m.capN) fail(409, 'stale');
    const h = await A.sha256b64u(b.cap);
    this.write(() => { m.capHash = h; m.capKid = b.kid; m.capN = b.n; this.saveMeta(); });
    return reply(200, { ok: true }, this.now());
  }
  revoke(p, b) {
    this.enrolled(p);
    if (!DEV_RE.test(b.dev || '')) fail(400, 'bad_request');
    const idx = this.index(), t = idx.dv.get(b.dev), now = this.now();
    if (!t) fail(404, 'not_found');
    if (!t.revoked) {
      const d = { ...t, revoked: now, key: null };
      this.write(() => { d.s = this.next(); this.store.put('dv/' + b.dev, d); this.saveMeta(); });
      idx.dv.set(b.dev, d);
      this.closeDev(b.dev);
      this.push(null, { t: 'chg', s: d.s, devices: [devView(d)] });
    }
    return reply(200, { ok: true }, now);
  }
  /** A removed device's files, or an older id of this same device key (SYNC_FORMAT.md section 1). */
  prune(p, dev) {
    const idx = this.index(), t = idx.dv.get(dev), m = this.m(), now = this.now();
    if (!t) fail(404, 'not_found');
    if (!(t.revoked || t.key === p.key)) fail(403, 'forbidden');
    const changes = { log: [], files: [], slots: [], blobs: [], devices: [] };
    this.write(() => {
      for (const f of [...idx.f.values()].filter(f => f.dev === dev && !f.gone)) {
        m.used -= this.dropLines(f);
        const g = { dev, file: f.file, gone: true, at: now, s: this.next() };
        this.store.put('f/' + dev + '/' + f.file, g); idx.f.set(dev + '/' + f.file, g); changes.files.push(fileView(g));
      }
      for (const r of [...idx.s.values()].filter(r => r.dev === dev && !r.gone)) {
        delParts(this.store, `sp/${dev}/${r.name}/`, r.parts); m.used -= r.size;
        const g = { dev, name: r.name, gone: true, at: now, s: this.next() };
        this.store.put(`s/${dev}/${r.name}`, g); idx.s.set(dev + '/' + r.name, g); changes.slots.push(slotView(g));
      }
      for (const r of [...idx.b.values()].filter(r => r.dev === dev && !r.gone)) {
        delParts(this.store, `bp/${dev}/${r.loc}/`, r.parts); m.used -= r.size; m.blobUsed -= r.size;
        const g = { dev, loc: r.loc, gone: true, at: now, s: this.next() };
        this.store.put(`b/${dev}/${r.loc}`, g); idx.b.set(dev + '/' + r.loc, g); changes.blobs.push(blobView(g));
      }
      const d = { ...t, revoked: t.revoked || now, key: null, s: this.next() };
      this.store.put('dv/' + dev, d); idx.dv.set(dev, d); changes.devices.push(devView(d));
      this.soft.delete(dev + '/device');
      this.saveMeta();
    });
    this.closeDev(dev);
    this.push(null, { t: 'chg', s: m.s, ...changes });
    return reply(200, { ok: true }, now);
  }

  // ── logs (5.2) ──
  dropLines(f) {
    let bytes = 0;
    if (!f.lo) return 0;
    for (const [k, v] of this.store.list({ start: 'l/' + pad(f.lo), end: 'l/' + pad(f.hi + 1) })) {
      if (v.dev === f.dev && v.file === f.file) { this.store.del(k); bytes += v.len; }
    }
    return bytes;
  }
  async append(p, dev, file, lines) {
    const d0 = this.own(p, dev), m = this.m(), idx = this.index(), now = this.now();
    if (!LOG_RE.test(file || '') || !Array.isArray(lines) || !lines.length || lines.length > LIMITS.logLines) fail(400, 'bad_request');
    let prev = d0.lastN, bytes = 0, skipped = 0;
    const add = [];
    for (const line of lines) {
      if (typeof line !== 'string' || line.length > LIMITS.logLine || line.includes('\n')) fail(400, 'bad_request');
      let o; try { o = JSON.parse(line); } catch { fail(400, 'bad_request'); }
      if (!isObj(o) || o.v !== 2 || o.dev !== dev || !Number.isInteger(o.n) || o.n < 1 || !isObj(o.enc) || typeof o.enc.ct !== 'string') fail(400, 'bad_request', 'A line is not a sealed record of this device.');
      if (o.n <= d0.lastN) { skipped++; continue; }
      if (o.n <= prev) fail(400, 'bad_request', 'Change numbers must rise.');
      prev = o.n;
      const len = te.encode(line).length + 1;
      bytes += len; add.push({ line, len });
    }
    const fk = dev + '/' + file, f0 = idx.f.get(fk);
    if (!add.length) return { s: m.s, size: f0 && !f0.gone ? f0.size : 0, skipped };
    if (m.used + bytes > LIMITS.group) { this.compact(now, true); if (m.used + bytes > LIMITS.group) fail(507, 'quota', 'This sync group is full.'); }
    await this.room(p, bytes, m.used);
    const f = f0 && !f0.gone ? { ...f0 } : { dev, file, size: 0, first: 0, lo: 0, hi: 0, at: now, s: 0, gone: false };
    const d = { ...d0, lastN: prev, seen: now };
    const out = [];
    this.write(() => {
      for (const x of add) {
        const s = this.next();
        if (!f.lo) f.lo = s;
        f.hi = s;
        this.store.put('l/' + pad(s), { dev, file, off: f.size, len: x.len, at: now, line: x.line });
        out.push({ s, dev, file, off: f.size, line: x.line });
        f.size += x.len;
      }
      f.at = now; f.s = this.next();
      this.store.put('f/' + fk, f);
      this.store.put('dv/' + dev, d);
      m.used += bytes; m.lastWrite = now;
      this.saveMeta();
    });
    idx.f.set(fk, f); idx.dv.set(dev, d);
    this.push(dev, { t: 'chg', s: f.s, log: out, files: [fileView(f)] });
    await this.report();
    return { s: m.s, size: f.size, skipped };
  }
  readLog(dev, file, from, max) {
    const f = this.index().f.get(dev + '/' + file), now = this.now();
    if (!f || f.gone || !f.lo) return reply(200, { lines: [], end: from, size: f && !f.gone ? f.size : 0, first: f && !f.gone ? f.first : 0 }, now);
    const lines = [];
    let end = Math.max(from, f.first), size = 0;
    for (const [, v] of this.store.list({ start: 'l/' + pad(f.lo), end: 'l/' + pad(f.hi + 1) })) {
      if (v.dev !== dev || v.file !== file || v.off < from) continue;
      if (size && size + v.len > max) break;
      lines.push({ line: v.line, end: v.off + v.len }); size += v.len; end = v.off + v.len;
    }
    return reply(200, { lines, end, size: f.size, first: f.first }, now);
  }
  removeLog(p, dev, file, size) {
    this.own(p, dev);
    const idx = this.index(), fk = dev + '/' + file, f = idx.f.get(fk), m = this.m(), now = this.now();
    if (!f || f.gone || f.size !== size) return reply(200, { removed: false }, now);
    const g = { dev, file, gone: true, at: now, s: 0 };
    this.write(() => { m.used -= this.dropLines(f); g.s = this.next(); this.store.put('f/' + fk, g); this.saveMeta(); });
    idx.f.set(fk, g);
    this.push(dev, { t: 'chg', s: g.s, files: [fileView(g)] });
    return reply(200, { removed: true }, now);
  }

  // ── slots (5.3) ──
  async putSlot(req, p, dev, name) {
    const d0 = this.own(p, dev), m = this.m(), idx = this.index(), now = this.now();
    const ver = qnum(req, 'ver', -1);
    if (ver < 0) fail(400, 'bad_request', 'A slot write needs ?ver=.');
    if (req.body.length > LIMITS.slot[name]) fail(413, 'too_large');
    const body = text(req);
    if (!body.startsWith('{')) fail(400, 'bad_request');
    const k = dev + '/' + name, old = idx.s.get(k), stored = old && !old.gone ? old : null, soft = this.soft.get(k);
    const cur = Math.max(stored ? stored.ver : 0, soft ? soft.ver : 0);
    if (ver < cur) fail(409, 'stale', null, { ver: cur });
    if (ver === cur && (stored || soft)) return reply(200, { ver, same: true }, now);
    if (name === 'device' && qflag(req, 'soft') && stored && now - stored.at < LIMITS.softPersistMs) {
      this.soft.set(k, { ver, body, at: now });
      this.push(dev, { t: 'soft', dev, ver, body });
      return reply(200, { ver, soft: true }, now);
    }
    const size = req.body.length, delta = size - (stored ? stored.size : 0);
    if (delta > 0 && m.used + delta > LIMITS.group) { this.compact(now, true); if (m.used + delta > LIMITS.group) fail(507, 'quota', 'This sync group is full.'); }
    await this.room(p, delta, m.used);
    const rec = { dev, name, ver, size, parts: 0, at: now, s: 0, gone: false };
    let d = d0;
    this.write(() => {
      rec.parts = putParts(this.store, `sp/${k}/`, body, stored ? stored.parts : 0);
      rec.s = this.next();
      this.store.put('s/' + k, rec);
      if (name === 'snapshot') { d = { ...d0, snapS: rec.s, seen: now }; this.store.put('dv/' + dev, d); }
      m.used += delta; m.lastWrite = now;
      this.saveMeta();
    });
    idx.s.set(k, rec); idx.dv.set(dev, d); this.soft.delete(k);
    this.push(dev, { t: 'chg', s: rec.s, slots: [slotView(rec, size <= LIMITS.inlineSlot ? body : null)] });
    await this.report();
    return reply(200, { ver, s: rec.s }, now);
  }
  getSlot(dev, name) {
    const k = dev + '/' + name, r = this.index().s.get(k), soft = this.soft.get(k), now = this.now();
    if (soft && (!r || r.gone || soft.ver > r.ver)) return replyRaw(200, soft.body, 'application/json', now, { 'X-OD-Ver': String(soft.ver) });
    if (!r || r.gone) fail(404, 'not_found');
    const body = getParts(this.store, `sp/${k}/`, r.parts);
    if (body == null) fail(404, 'not_found');
    return replyRaw(200, body, 'application/json', now, { 'X-OD-Ver': String(r.ver) });
  }
  delSlot(p, dev, name) {
    this.own(p, dev);
    const k = dev + '/' + name, idx = this.index(), r = idx.s.get(k), m = this.m(), now = this.now();
    this.soft.delete(k);
    if (!r || r.gone) return reply(200, { ok: true }, now);
    const g = { dev, name, gone: true, at: now, s: 0 };
    this.write(() => { delParts(this.store, `sp/${k}/`, r.parts); m.used -= r.size; g.s = this.next(); this.store.put('s/' + k, g); this.saveMeta(); });
    idx.s.set(k, g);
    this.push(dev, { t: 'chg', s: g.s, slots: [slotView(g)] });
    return reply(200, { ok: true }, now);
  }

  // ── blobs (5.4) ──
  async putBlob(req, p, dev, loc) {
    this.own(p, dev);
    const type = (req.headers.get('content-type') || '').split(';')[0].trim();
    if (type !== 'application/octet-stream') fail(415, 'content_type');
    const size = req.body.length, m = this.m(), idx = this.index(), now = this.now(), k = dev + '/' + loc;
    if (!size || size > LIMITS.blob) fail(413, 'too_large');
    const old = idx.b.get(k);
    if (old && !old.gone) return reply(200, { have: true }, now);
    if (m.blobUsed + size > LIMITS.groupBlobs || m.used + size > LIMITS.group) fail(507, 'quota', 'Pictures and audio through the relay are full for this group.');
    await this.room(p, size, m.used);
    const rec = { dev, loc, size, parts: 0, at: now, s: 0, gone: false };
    this.write(() => {
      rec.parts = putParts(this.store, `bp/${k}/`, req.body);
      rec.s = this.next();
      this.store.put('b/' + k, rec);
      m.used += size; m.blobUsed += size; m.lastWrite = now;
      this.saveMeta();
    });
    idx.b.set(k, rec);
    this.push(dev, { t: 'chg', s: rec.s, blobs: [blobView(rec)] });
    await this.report();
    return reply(200, { s: rec.s }, now);
  }
  getBlob(dev, loc) {
    const idx = this.index();
    let r = idx.b.get(dev + '/' + loc);
    if (!r || r.gone) r = [...idx.b.values()].find(x => x.loc === loc && !x.gone) || null;
    if (!r) fail(404, 'not_found');
    const bytes = getParts(this.store, `bp/${r.dev}/${loc}/`, r.parts, true);
    if (!bytes) fail(404, 'not_found');
    return replyRaw(200, bytes, 'application/octet-stream', this.now());
  }
  delBlob(p, dev, loc) {
    this.own(p, dev);
    const k = dev + '/' + loc, idx = this.index(), r = idx.b.get(k), m = this.m(), now = this.now();
    if (!r || r.gone) return reply(200, { ok: true }, now);
    const g = { dev, loc, gone: true, at: now, s: 0 };
    this.write(() => { delParts(this.store, `bp/${k}/`, r.parts); m.used -= r.size; m.blobUsed -= r.size; g.s = this.next(); this.store.put('b/' + k, g); this.saveMeta(); });
    idx.b.set(k, g);
    this.push(dev, { t: 'chg', s: g.s, blobs: [blobView(g)] });
    return reply(200, { ok: true }, now);
  }

  // ── listing, feed, acks (5.2, 5.5) ──
  files() {
    const m = this.m(), idx = this.index(), devices = {};
    const of = (dev) => (devices[dev] = devices[dev] || { logs: [], slots: {}, blobs: 0 });
    for (const d of idx.dv.values()) if (!d.revoked) of(d.dev);
    for (const f of idx.f.values()) if (!f.gone) of(f.dev).logs.push({ name: f.file, size: f.size, first: f.first });
    for (const r of idx.s.values()) if (!r.gone) of(r.dev).slots[r.name] = { ver: r.ver, size: r.size, at: r.at };
    for (const b of idx.b.values()) if (!b.gone) of(b.dev).blobs++;
    for (const x of Object.values(devices)) x.logs.sort((a, b) => (a.name < b.name ? -1 : 1));
    return reply(200, { s: m.s, floor: m.floor, devices }, this.now());
  }
  changes(since, max) {
    const m = this.m(), idx = this.index(), LIMIT = 2000;
    const rows = this.store.list({ start: 'l/' + pad(since + 1), end: 'l/~', limit: LIMIT });
    const boundary = rows.length === LIMIT ? Number(rows[rows.length - 1][0].slice(2)) : Infinity;
    const items = rows.map(([k, v]) => ({ s: Number(k.slice(2)), kind: 'log', v }));
    for (const f of idx.f.values()) if (f.s > since) items.push({ s: f.s, kind: 'files', v: f });
    for (const r of idx.s.values()) if (r.s > since) items.push({ s: r.s, kind: 'slots', v: r });
    for (const b of idx.b.values()) if (b.s > since) items.push({ s: b.s, kind: 'blobs', v: b });
    for (const d of idx.dv.values()) if (d.s > since) items.push({ s: d.s, kind: 'devices', v: d });
    items.sort((a, b) => a.s - b.s);
    const out = { log: [], files: [], slots: [], blobs: [], devices: [] };
    // A full page of lines means more may follow: the cursor then stops at what was sent.
    let size = 0, last = since, more = rows.length === LIMIT;
    for (const it of items) {
      if (it.s > boundary) { more = true; break; }
      let view;
      if (it.kind === 'log') view = { s: it.s, dev: it.v.dev, file: it.v.file, off: it.v.off, line: it.v.line };
      else if (it.kind === 'files') view = fileView(it.v);
      else if (it.kind === 'slots') {
        const r = it.v, soft = this.soft.get(r.dev + '/' + r.name);
        view = slotView(r, !r.gone && r.size <= LIMITS.inlineSlot && !(soft && soft.ver > r.ver) ? getParts(this.store, `sp/${r.dev}/${r.name}/`, r.parts) : null);
      } else if (it.kind === 'blobs') view = blobView(it.v);
      else view = devView(it.v);
      const len = JSON.stringify(view).length;
      if (size && size + len > max) { more = true; break; }
      size += len; out[it.kind].push(view); last = it.s;
    }
    if (!more) last = Math.max(last, m.s);
    return { s: last, head: m.s, more, floor: m.floor, reset: since < m.floor, ...out };
  }
  ack(dev, s) {
    if (!Number.isInteger(s) || s < 0) fail(400, 'bad_request');
    const m = this.m(), idx = this.index(), d = idx.dv.get(dev), now = this.now();
    const v = Math.min(s, m.s);
    if (v > (this.acks.get(dev) || 0)) this.acks.set(dev, v);
    if (d && !d.revoked && now - (d.ackAt || 0) > LIMITS.ackPersistMs) {
      const nd = { ...d, ack: Math.max(d.ack || 0, v), ackAt: now, seen: now };
      this.store.put('dv/' + dev, nd); idx.dv.set(dev, nd);
    }
  }

  // ── live (5.7) ──
  async canUpgrade() { if (!this.m()) fail(404, 'not_found'); }
  async socketFor(p, msg) {
    this.need(p, 'sync');
    const m = this.m();
    if (!m || p.identity !== m.ownerKey) fail(403, 'forbidden');
    if (!DEV_RE.test(msg.dev || '')) fail(400, 'bad_request');
    this.own(p, msg.dev);
    return { dev: msg.dev };
  }
  ready() { const m = this.m(); return { s: m.s, floor: m.floor }; }
  async onSocket(sock, a, msg) {
    if (msg.t === 'append') {
      const p = { ...(await this.who(a.identity)), key: a.key, identity: a.identity };
      await this.pay(p);
      const r = await this.append(p, a.dev, msg.file, msg.lines);
      sock.send(JSON.stringify({ t: 'ok', id: msg.id ?? null, ...r }));
      return;
    }
    // An ack stores at most one row per device every 10 minutes: counted, never refused.
    if (msg.t === 'ack') { if (a.role === 'member') await this.pay({ role: 'member', iid: a.iid }, false); this.ack(a.dev, msg.s); return; }
    fail(400, 'bad_request');
  }

  // ── retention (5.6) ──
  compact(now, pressure) {
    const idx = this.index(), m = this.m();
    let minAck = Infinity;
    for (const d of idx.dv.values()) {
      if (d.revoked || now - (d.seen || 0) > LIMITS.staleDeviceMs) continue;
      minAck = Math.min(minAck, Math.max(d.ack || 0, this.acks.get(d.dev) || 0));
    }
    if (minAck === Infinity) minAck = m.s;
    const cutoff = pressure ? now : now - LIMITS.logKeepMs;
    const rows = this.store.list({ prefix: 'l/', limit: 5000 });
    const touched = new Map();
    let freed = 0, floor = m.floor;
    this.write(() => {
      for (const [k, v] of rows) {
        const s = Number(k.slice(2));
        if (s > minAck || v.at >= cutoff) break;
        const d = idx.dv.get(v.dev);
        if (d && !d.revoked && s >= (d.snapS || 0)) continue;      // no newer snapshot of that device yet
        this.store.del(k); freed += v.len; floor = Math.max(floor, s);
        const fk = v.dev + '/' + v.file, f = touched.get(fk) || idx.f.get(fk);
        if (f && !f.gone) touched.set(fk, { ...f, first: Math.max(f.first || 0, v.off + v.len) });
      }
      for (const [fk, f] of touched) { f.s = this.next(); this.store.put('f/' + fk, f); }
      m.used -= freed; m.floor = floor;
      this.saveMeta();
    });
    for (const [fk, f] of touched) idx.f.set(fk, f);
  }
  async housekeep(now) {
    const m = this.m();
    if (!m) return;
    if (now - m.lastWrite > LIMITS.groupIdleMs) {
      await this.internal('purge');
      try { await this.io.call('reg', 'release', { space: this.name }); } catch { /* the registry forgets it later */ }
      return;
    }
    const idx = this.index();
    for (const [dev, s] of this.acks) {
      const d = idx.dv.get(dev);
      if (d && !d.revoked && s > (d.ack || 0)) { const nd = { ...d, ack: s, ackAt: now }; this.store.put('dv/' + dev, nd); idx.dv.set(dev, nd); }
    }
    this.compact(now, m.used > 0.9 * LIMITS.group);
    for (const [map, pre] of [[idx.f, 'f/'], [idx.s, 's/'], [idx.b, 'b/']]) {
      for (const [k, v] of map) if (v.gone && v.at < now - LIMITS.tombMs) { this.store.del(pre + k); map.delete(k); }
    }
    await this.report(true);
    this.io.setAlarm(now + DAY);
  }
}
