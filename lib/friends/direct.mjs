// lib/friends/direct.mjs - direct live links between friends (docs/dev/FRIENDS.md
// section 10). PLATFORM-AGNOSTIC: no node: imports; the byte streams come from
// an adapter (lib/friends/node-direct.mjs wraps TCP, like lib/sync/live/node-net.mjs).
//
// It reuses the live-sync link (lib/sync/live/session.mjs: a Noise-KK-style
// handshake, then AES-256-GCM frames with counters) with a friends PeerAuth:
//   deviceId   my friend id          peer(id)   the X25519 key of a CONFIRMED friend, else null
//   group/kid  constants of the friends network (HKDF of a fixed label)
//   psk        the same; authentication rests on the two static keys
// So a peer that is not a known friend is refused at the hello, before any key
// work, and nothing it sends is parsed beyond the size-capped hello; after the
// handshake only {t:'env', env} frames are used (the same sealed envelopes as
// the relay carries), and the engine checks that every opened message comes
// from the authenticated peer. Frames at most 256 KB, one link per friend (the
// one dialled by the smaller id stays), at most 16 links, at most 2 links
// still in their handshake per remote address (an IPv6 /64 counts as one) and
// 12 in all; a handshake not done in 5 s is closed (session.mjs). Dialled only on
// the friends port range, and only an IP address: a global one, or a private one
// on this computer's own subnet (a friend on the same network whose direct links
// the person allowed); never loopback, link-local or a host name, so a friend's
// addresses can never point this computer at another service or machine.
// The port is never mapped on the router.

import { createSession } from '../sync/live/session.mjs';
import { dialOrder, classifyAddress, plainAddress, parseV4, parseV6, sameSubnet } from '../sync/live/addrbook.mjs';
import { dh, hkdf, utf8, hex } from '../sync/e2e-crypto.mjs';
import { ID_RE } from './core.mjs';

export const DIRECT_PORT = 41736;
export const DIRECT_PORT_MAX = 41745;
export const MAX_DIRECT_FRAME = 256 * 1024;
const MAX_LINKS = 16;
const MAX_PENDING_PER_ADDR = 2, MAX_PENDING = 12;
const DIAL_MS = 3000;
/** The per-address bucket of a remote address: IPv4 as it is, IPv6 by its /64 (privacy addresses cost nothing). */
function addrBucket(a) {
  const p = plainAddress(a), g = parseV6(p);
  return g ? g.slice(0, 4).map(x => x.toString(16)).join(':') + '::/64' : p;
}
const maskBitsOf = (mask) => { const o = parseV4(mask); if (!o) return null; let n = ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3], b = 0; while (n & 0x80000000) { b++; n = (n << 1) >>> 0; } return b; };
/**
 * May this computer dial a friend's announced endpoint? IP literals only: a global address (the internet
 * path), or a private / unique-local one inside a subnet of this computer's own interfaces (the same network).
 * Never loopback (unless `loopback`: a throwaway sandbox), link-local, multicast or a host name.
 */
export function dialable(e, mine = [], { loopback = false } = {}) {
  const a = plainAddress(e && e.a);
  const c = classifyAddress(a);
  if (c === 'global') return true;
  if (c === 'loopback') return loopback;
  if (c === 'private' || c === 'cgnat') {
    return mine.some(i => { const m = plainAddress(i.address); const bits = maskBitsOf(i.netmask); return !!parseV4(m) && !i.internal && bits >= 8 && sameSubnet(m, a, bits); });
  }
  if (c === 'ula') {
    const g = parseV6(a);
    return mine.some(i => { const h = parseV6(plainAddress(i.address)); return !!h && !i.internal && classifyAddress(plainAddress(i.address)) === 'ula' && h.slice(0, 4).every((x, k) => x === g[k]); });
  }
  return false;
}

let consts = null;
async function constants() {
  if (consts) return consts;
  const base = utf8('opendash-friends-direct-v1');
  consts = {
    group: hex(await hkdf(base, utf8('group'), 'opendash-friends-direct-group', 8)),
    kid: hex(await hkdf(base, utf8('kid'), 'opendash-friends-direct-kid', 8)),
    psk: await hkdf(base, utf8('psk'), 'opendash-friends-direct-psk', 32),
  };
  return consts;
}

/**
 * createDirect({net, interfaces, port, bind, endpointsFrom, getIdentity, peers,
 *   onEnvelope(env, peerId), onLink(peerId, up), log, timers, anyPort})
 * peers() -> Map id -> {id, x} of the friends a link may be made with (confirmed, allowed 'direct').
 */
export function createDirect({ net, interfaces = () => [], port = DIRECT_PORT, bind = null, endpointsFrom, getIdentity, peers, onEnvelope, onLink = () => {}, log = () => {}, timers = globalThis, anyPort = false, includeLoopback = false }) {
  let server = null, auth = null, me = null, myPort = null, running = false;
  const links = new Map();          // friend id -> open session
  const pending = new Map();        // remote address -> sessions still in their handshake
  const dialing = new Map();        // friend id -> {busy, next, wait}
  const peerKey = (id) => { if (!ID_RE.test(id || '')) return null; const p = peers().get(id); return p ? p.x : null; };

  async function start() {
    if (running) return status();
    me = await getIdentity();
    if (!me) return status();
    const c = await constants();
    auth = {
      deviceId: me.id, pub: me.x.pub, group: c.group, kid: c.kid, psk: c.psk,
      dh: (pub) => dh(me.x.priv, pub),
      peer: (id) => (id === me.id ? null : peerKey(id)),
    };
    try {
      server = await net.listen({ host: bind, port, onConnection: inbound, tries: anyPort ? 1 : (DIRECT_PORT_MAX - port + 1) });
      myPort = server.port;
      running = true;
      log('info', `friends: direct links listen on port ${myPort}`);
    } catch (e) {
      log('warn', `friends: direct links could not listen (${e && (e.code || e.message)}); the relay carries everything`);
    }
    return status();
  }
  const dec = (addr) => { const n = (pending.get(addr) || 1) - 1; if (n <= 0) pending.delete(addr); else pending.set(addr, n); };
  const pendingAll = () => { let n = 0; for (const v of pending.values()) n += v; return n; };
  function inbound(conn) {
    const addr = addrBucket((conn.remote && conn.remote.address) || '?');
    if (!running || links.size >= MAX_LINKS || (pending.get(addr) || 0) >= MAX_PENDING_PER_ADDR || pendingAll() >= MAX_PENDING) { try { conn.close(); } catch { /* gone */ } return; }
    pending.set(addr, (pending.get(addr) || 0) + 1);
    let opened = false;
    createSession({
      conn, role: 'responder', auth, timers, limits: { maxFrame: MAX_DIRECT_FRAME, frames: 200, bytes: 4 * MAX_DIRECT_FRAME },
      onOpen: (s) => { opened = true; dec(addr); adopt(s); },
      onMessage,
      onClose: (why, s) => { if (!opened) dec(addr); lost(s); },
    });
  }
  function adopt(s) {
    const id = s.peerId;
    if (!peerKey(id)) { s.close('unknown'); return; }
    const old = links.get(id);
    if (old && old !== s && old.state === 'open') {
      const dialler = (x) => (x.role === 'initiator' ? me.id : id);
      if (dialler(s) < dialler(old)) { links.set(id, s); old.close('duplicate'); }
      else { s.close('duplicate'); return; }
    } else links.set(id, s);
    const d = dialing.get(id); if (d) { d.wait = 30000; d.next = 0; }
    try { onLink(id, true); } catch { /* fine */ }
  }
  function lost(s) {
    const id = s.peerId;
    if (id && links.get(id) === s) { links.delete(id); try { onLink(id, false); } catch { /* fine */ } }
  }
  function onMessage(msg, s) {
    if (msg.t !== 'env' || !msg.env || typeof msg.env !== 'object') return;
    if (links.get(s.peerId) !== s) return;
    try { onEnvelope(msg.env, s.peerId); } catch { /* the engine counts it */ }
  }
  const portOk = (p) => Number.isInteger(p) && (anyPort ? p >= 1024 && p < 65536 : p >= DIRECT_PORT && p <= DIRECT_PORT_MAX);

  /** Try to reach a friend at the endpoints they sent (a live:addr message). */
  async function connect(id, eps) {
    if (!running || !peerKey(id) || (links.get(id) && links.get(id).state === 'open') || links.size >= MAX_LINKS) return false;
    const d = dialing.get(id) || { busy: false, next: 0, wait: 30000 };
    dialing.set(id, d);
    if (d.busy || Date.now() < d.next) return false;
    d.busy = true;
    try {
      const mine = interfaces();
      const order = dialOrder((Array.isArray(eps) ? eps : []).filter(e => e && portOk(e.p) && e.k !== 'wan' && dialable(e, mine, { loopback: includeLoopback })).slice(0, 8), { mine });
      for (const e of order) {
        if (links.get(id) && links.get(id).state === 'open') return true;
        let conn;
        try { conn = await net.connect({ host: e.a, port: e.p, timeoutMs: DIAL_MS }); } catch { continue; }
        const ok = await new Promise((resolve) => {
          createSession({
            conn, role: 'initiator', auth, peerId: id, timers, limits: { maxFrame: MAX_DIRECT_FRAME, frames: 200, bytes: 4 * MAX_DIRECT_FRAME },
            onOpen: (s) => { adopt(s); resolve(true); },
            onMessage,
            onClose: (why, s, wasOpen) => { if (!wasOpen) resolve(false); lost(s); },
          });
        });
        if (ok) return true;
      }
      d.next = Date.now() + d.wait;
      d.wait = Math.min(30 * 60 * 1000, d.wait * 2);
      return false;
    } finally { d.busy = false; }
  }
  /** Send one envelope over an open link: true when it went. */
  async function send(id, env) {
    const s = links.get(id);
    if (!s || s.state !== 'open') return false;
    return s.send({ t: 'env', env }).catch(() => false);
  }
  /** Close links to anyone no longer allowed (a friend removed, blocked, or direct turned off). */
  function refresh() { for (const [id, s] of links) if (!peerKey(id)) { links.delete(id); s.close('removed'); } }
  function dropPeer(id) { const s = links.get(id); if (s) { links.delete(id); s.close('removed'); } dialing.delete(id); }
  const isOpen = (id) => { const s = links.get(id); return !!s && s.state === 'open'; };
  function endpoints() {
    if (!running || !myPort) return [];
    return endpointsFrom({ interfaces: interfaces(), port: myPort, includeLoopback }).filter(e => e.k !== 'wan').slice(0, 8);
  }
  function status() { return { on: running, port: myPort, links: [...links.values()].filter(s => s.state === 'open').length }; }
  async function stop() {
    running = false;
    for (const s of links.values()) { try { s.send({ t: 'bye' }); s.close('bye'); } catch { /* closed */ } }
    links.clear();
    if (server) { try { await server.close(); } catch { /* closed */ } server = null; }
  }
  /** The person's identity changed (a key renewal, FRIENDS.md section 15): every link is made again under the new one. */
  async function restart() {
    const was = running || !!me;
    await stop();
    dialing.clear(); pending.clear();
    me = null;
    return was ? start() : status();
  }
  /** The friend id links are made under now (null before start). */
  const identityId = () => (me ? me.id : null);
  return { start, stop, restart, identityId, connect, send, refresh, dropPeer, isOpen, endpoints, status, get port() { return myPort; } };
}
