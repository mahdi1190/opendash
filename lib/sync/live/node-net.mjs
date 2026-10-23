// lib/sync/live/node-net.mjs - the Node adapters of live sync: TCP links
// (node:net), LAN announcements (node:dgram), this computer's network
// interfaces (node:os), and the UDP and HTTP calls port mapping needs.
// Everything that decides anything is in the platform-agnostic modules next
// to this one; a phone app supplies its own versions of these adapters.

import net from 'node:net';
import dgram from 'node:dgram';
import http from 'node:http';
import { networkInterfaces } from 'node:os';
import { parseV4 } from './addrbook.mjs';

export const DEFAULT_PORT = 41731;
export const DISCOVERY_PORT = 41733;
export const DISCOVERY_GROUP = '239.255.41.73';

/** A TCP socket as the byte stream lib/sync/live/session.mjs reads and writes. */
export function wrapSocket(sock) {
  const dataFns = [], closeFns = [];
  let closed = false;
  sock.setNoDelay(true);
  sock.on('data', (b) => { const u = new Uint8Array(b.buffer, b.byteOffset, b.length); for (const f of dataFns) f(u); });
  const done = () => { if (closed) return; closed = true; for (const f of closeFns) f(); };
  sock.on('close', done);
  sock.on('error', () => { /* 'close' follows */ });
  return {
    write: (bytes) => { if (!closed) sock.write(bytes); return !closed; },
    // end(): what was written still goes out (an error reply), then the socket closes.
    close: () => { if (closed) return; sock.end(); const t = setTimeout(() => sock.destroy(), 1000); t.unref(); },
    onData: (f) => dataFns.push(f),
    onClose: (f) => closeFns.push(f),
    remote: { address: sock.remoteAddress || null, port: sock.remotePort || null },
    local: { address: sock.localAddress || null, port: sock.localPort || null },
  };
}

/**
 * TCP for live links. listen({host, port, onConnection}) binds `host`, or
 * when none is given every address ("::" dual stack, else 0.0.0.0); a port
 * in use moves up (at most 10). connect({host, port, timeoutMs}) -> a link.
 */
export function createNodeNet({ maxConnections = 32 } = {}) {
  return {
    async listen({ host = null, port = DEFAULT_PORT, onConnection, tries = 10 }) {
      const hosts = host ? [host] : ['::', '0.0.0.0'];
      let lastErr = null;
      for (let i = 0; i < Math.max(1, tries); i++) {
        const p = port === 0 ? 0 : port + i;
        for (const h of hosts) {
          const server = net.createServer({ pauseOnConnect: false }, (sock) => {
            if (server._odCount >= maxConnections) { sock.destroy(); return; }
            server._odCount++;
            sock.on('close', () => { server._odCount--; });
            onConnection(wrapSocket(sock));
          });
          server._odCount = 0;
          try {
            await new Promise((res, rej) => {
              server.once('error', rej);
              server.listen({ host: h, port: p, ...(h === '::' ? { ipv6Only: false } : {}), exclusive: true }, () => { server.off('error', rej); res(); });
            });
            server.on('error', () => {});
            server.unref();
            return { port: server.address().port, host: h, close: () => new Promise(r => server.close(() => r())) };
          } catch (e) {
            lastErr = e;
            try { server.close(); } catch { /* not listening */ }
            if (e.code === 'EADDRINUSE') break;          // try the next port
          }
        }
      }
      throw lastErr || new Error('could not listen');
    },
    connect({ host, port, timeoutMs = 3000 }) {
      return new Promise((resolve, reject) => {
        const sock = net.connect({ host, port });
        sock.unref();
        const t = setTimeout(() => { sock.destroy(); reject(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })); }, timeoutMs);
        t.unref();
        sock.once('connect', () => { clearTimeout(t); resolve(wrapSocket(sock)); });
        sock.once('error', (e) => { clearTimeout(t); reject(e); });
      });
    },
  };
}

/** This computer's interfaces: [{name, address, family:'IPv4'|'IPv6', netmask, internal}]. */
export function nodeInterfaces(source = networkInterfaces) {
  const out = [];
  let ifs = {};
  try { ifs = source() || {}; } catch { ifs = {}; }
  for (const [name, list] of Object.entries(ifs)) {
    for (const i of list || []) out.push({ name, address: i.address, family: i.family === 6 ? 'IPv6' : i.family === 4 ? 'IPv4' : String(i.family), netmask: i.netmask, internal: !!i.internal });
  }
  return out;
}
/** The broadcast address of an IPv4 interface. */
export function broadcastOf(address, netmask) {
  const a = parseV4(address), m = parseV4(netmask);
  if (!a || !m) return null;
  return a.map((x, i) => (x | (~m[i] & 255)) & 255).join('.');
}

/**
 * LAN announcements over UDP. Production: listen on DISCOVERY_PORT on every
 * address, join the multicast group on each IPv4 interface, send to the
 * group and to each interface's broadcast address. Tests pass bind
 * '127.0.0.1' and targets [{address: '127.0.0.1', port}] (loopback unicast).
 */
export function createNodeDiscovery({ port = DISCOVERY_PORT, bind = null, targets = null, group = DISCOVERY_GROUP, interfaces = () => nodeInterfaces() } = {}) {
  let sock = null;
  return {
    async start(onMessage) {
      sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      sock.on('message', (msg, rinfo) => { try { onMessage(new Uint8Array(msg.buffer, msg.byteOffset, msg.length), { address: rinfo.address, port: rinfo.port }); } catch { /* never breaks */ } });
      sock.on('error', () => {});
      await new Promise((res, rej) => { sock.once('error', rej); sock.bind({ port, ...(bind ? { address: bind } : {}), exclusive: false }, () => { sock.off('error', rej); res(); }); });
      sock.unref();
      if (!targets) {
        try { sock.setBroadcast(true); sock.setMulticastTTL(1); sock.setMulticastLoopback(false); } catch { /* fine */ }
        for (const i of interfaces()) if (i.family === 'IPv4' && !i.internal) { try { sock.addMembership(group, i.address); } catch { /* not on this one */ } }
      }
      return { port: sock.address().port };
    },
    async send(bytes) {
      if (!sock) return 0;
      const fixed = typeof targets === 'function' ? targets() : targets;
      const list = fixed || [{ address: group, port }, ...interfaces().filter(i => i.family === 'IPv4' && !i.internal).map(i => ({ address: broadcastOf(i.address, i.netmask), port })).filter(t => t.address)];
      let sent = 0;
      for (const t of list) {
        await new Promise((r) => sock.send(bytes, t.port, t.address, (e) => { if (!e) sent++; r(); }));
      }
      return sent;
    },
    async close() { if (sock) { const s = sock; sock = null; await new Promise(r => { try { s.close(r); } catch { r(); } }); } },
  };
}

// ─── For port mapping (lib/sync/live/nat.mjs) ───────────────────────────────
/** udp.request: one datagram out, answers back until timeoutMs (or the first one when many is false). */
export function createNodeUdp({ bind = null } = {}) {
  return {
    request(target, bytes, { timeoutMs = 1000, many = false } = {}) {
      return new Promise((resolve) => {
        const s = dgram.createSocket({ type: 'udp4' });
        const got = [];
        let done = false;
        const finish = () => { if (done) return; done = true; clearTimeout(t); try { s.close(); } catch { /* closed */ } resolve(got); };
        const t = setTimeout(finish, timeoutMs);
        s.on('error', finish);
        s.on('message', (msg, rinfo) => { got.push({ bytes: new Uint8Array(msg.buffer, msg.byteOffset, msg.length), address: rinfo.address, port: rinfo.port }); if (!many) finish(); });
        s.bind({ port: 0, ...(bind ? { address: bind } : {}) }, () => {
          try { if (target.address.startsWith('239.')) s.setMulticastTTL(2); } catch { /* fine */ }
          s.send(bytes, target.port, target.address, (e) => { if (e) finish(); });
        });
        s.unref();
      });
    },
  };
}
/** http({method, url, headers, body, timeoutMs}) -> {status, body, localAddress}: plain HTTP to a router (64 KB at most). */
export function nodeHttp({ method = 'GET', url, headers = {}, body = null, timeoutMs = 3000 }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    if (u.protocol !== 'http:') { reject(new Error('router URLs are plain http')); return; }
    const req = http.request({ method, hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, headers: { ...headers, ...(body != null ? { 'Content-Length': Buffer.byteLength(body) } : {}), Connection: 'close' }, timeout: timeoutMs }, (res) => {
      const localAddress = res.socket ? res.socket.localAddress : null;
      const chunks = [];
      let size = 0;
      res.on('data', (c) => { size += c.length; if (size > 64 * 1024) { req.destroy(); return; } chunks.push(c); });
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8'), localAddress }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (body != null) req.write(body);
    req.end();
  });
}
/** Routers worth asking for NAT-PMP / PCP: the first address of each private IPv4 network this computer is on. */
export function guessGateways(interfaces = nodeInterfaces()) {
  const out = [];
  for (const i of interfaces) {
    if (i.family !== 'IPv4' || i.internal) continue;
    const a = parseV4(i.address), m = parseV4(i.netmask);
    if (!a || !m || !(a[0] === 10 || (a[0] === 172 && a[1] >= 16 && a[1] <= 31) || (a[0] === 192 && a[1] === 168))) continue;
    const netw = a.map((x, k) => x & m[k]);
    netw[3] += 1;
    const g = netw.join('.');
    if (!out.includes(g) && g !== i.address) out.push(g);
  }
  return out;
}
