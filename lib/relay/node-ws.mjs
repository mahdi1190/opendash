// lib/relay/node-ws.mjs - a small RFC 6455 WebSocket for Node 20 (which has no
// WebSocket server, and no client before Node 22): the Node relay adapter
// accepts sockets with it, and Node clients of the relay may connect with it.
// Text and binary messages (fragmented too), ping/pong, close; nothing else
// (no extensions, no compression). Node stdlib only.
//
//   acceptWebSocket(req, socket, head, {maxMessage})  -> ws | null (server side, after 'upgrade')
//   connectWebSocket(url, {headers, maxMessage})      -> Promise<ws> (client side, ws: or wss:)
//   ws.send(text) ws.ping() ws.close(code, reason)   events: 'message' (string | Buffer), 'pong', 'close' (code)

import { createHash, randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import https from 'node:https';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const acceptOf = (key) => createHash('sha1').update(key + GUID).digest('base64');

function wrap(socket, { client, maxMessage, head }) {
  const ws = new EventEmitter();
  let buf = head && head.length ? Buffer.from(head) : Buffer.alloc(0);
  let frags = [], fragOp = 0, fragLen = 0, closing = false, closed = false;
  try { socket.setNoDelay(true); } catch { /* not a TCP socket */ }
  const done = (code) => { if (closed) return; closed = true; ws.emit('close', code); };
  const frame = (op, payload) => {
    const len = payload.length;
    let hdr;
    if (len < 126) { hdr = Buffer.alloc(2); hdr[1] = len; }
    else if (len < 65536) { hdr = Buffer.alloc(4); hdr[1] = 126; hdr.writeUInt16BE(len, 2); }
    else { hdr = Buffer.alloc(10); hdr[1] = 127; hdr.writeBigUInt64BE(BigInt(len), 2); }
    hdr[0] = 0x80 | op;
    if (!client) return Buffer.concat([hdr, payload]);
    hdr[1] |= 0x80;
    const k = randomBytes(4), out = Buffer.from(payload);
    for (let i = 0; i < out.length; i++) out[i] ^= k[i & 3];
    return Buffer.concat([hdr, k, out]);
  };
  const write = (op, payload) => {
    if (closed || (closing && op !== 8) || socket.destroyed) return;
    try { socket.write(frame(op, payload)); } catch { /* gone */ }
  };
  ws.send = (data) => write(typeof data === 'string' ? 1 : 2, typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data));
  ws.ping = () => write(9, Buffer.alloc(0));
  ws.close = (code = 1000, reason = '') => {
    if (closing || closed) return;
    const r = Buffer.from(String(reason).slice(0, 100), 'utf8'), p = Buffer.alloc(2 + r.length);
    p.writeUInt16BE(code >= 1000 && code <= 4999 && code !== 1005 && code !== 1006 ? code : 1000, 0); r.copy(p, 2);
    write(8, p); closing = true;
    try { socket.end(); } catch { /* gone */ }
    setTimeout(() => { try { socket.destroy(); } catch { /* gone */ } done(code); }, 2000).unref?.();
  };
  const fail = (code) => { ws.close(code, ''); try { socket.destroy(); } catch { /* gone */ } done(code); };
  function parse() {
    while (buf.length >= 2) {
      const b0 = buf[0], b1 = buf[1], fin = (b0 & 0x80) !== 0, op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
      if (b0 & 0x70) return fail(1002);
      let len = b1 & 0x7f, at = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); at = 4; }
      else if (len === 127) { if (buf.length < 10) return; const big = buf.readBigUInt64BE(2); if (big > BigInt(maxMessage)) return fail(1009); len = Number(big); at = 10; }
      if (len > maxMessage) return fail(1009);
      if (masked === client) return fail(1002);            // clients mask, servers do not
      const need = at + (masked ? 4 : 0) + len;
      if (buf.length < need) return;
      let payload = buf.subarray(at + (masked ? 4 : 0), need);
      if (masked) { const k = buf.subarray(at, at + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= k[i & 3]; }
      buf = buf.subarray(need);
      if (op === 8) {
        const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1005;
        if (!closing) { write(8, payload.subarray(0, 2)); closing = true; }
        try { socket.end(); } catch { /* gone */ }
        return done(code);
      }
      if (op === 9) { write(10, payload); continue; }
      if (op === 10) { ws.emit('pong'); continue; }
      if (op === 0 || op === 1 || op === 2) {
        if (op !== 0) { if (fragOp) return fail(1002); fragOp = op; frags = []; fragLen = 0; }
        else if (!fragOp) return fail(1002);
        fragLen += payload.length;
        if (fragLen > maxMessage) return fail(1009);
        frags.push(Buffer.from(payload));
        if (fin) {
          const data = Buffer.concat(frags), kind = fragOp;
          fragOp = 0; frags = []; fragLen = 0;
          ws.emit('message', kind === 1 ? data.toString('utf8') : data);
        }
        continue;
      }
      return fail(1002);
    }
  }
  socket.on('data', (d) => { if (closed) return; buf = buf.length ? Buffer.concat([buf, d]) : d; if (buf.length > maxMessage + 64 * 1024) return fail(1009); parse(); });
  socket.on('close', () => done(1006));
  socket.on('end', () => done(1006));
  socket.on('error', () => { try { socket.destroy(); } catch { /* gone */ } done(1006); });
  if (buf.length) setImmediate(parse);
  return ws;
}

/** Server side: answer the upgrade (after http.Server 'upgrade') and wrap the socket. */
export function acceptWebSocket(req, socket, head, { maxMessage = 1024 * 1024 } = {}) {
  const key = req.headers['sec-websocket-key'];
  if (typeof key !== 'string' || !/^[A-Za-z0-9+/]{22}==$/.test(key) || req.headers['sec-websocket-version'] !== '13') {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    return null;
  }
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acceptOf(key)}\r\n\r\n`);
  return wrap(socket, { client: false, maxMessage, head });
}

/** Client side: connect to ws:// or wss:// (the relay's /ws paths). */
export function connectWebSocket(url, { headers = {}, maxMessage = 4 * 1024 * 1024, timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    if (u.protocol !== 'ws:' && u.protocol !== 'wss:') { reject(new Error('not a WebSocket URL')); return; }
    const key = randomBytes(16).toString('base64');
    const mod = u.protocol === 'wss:' ? https : http;
    const req = mod.request({
      hostname: u.hostname, port: u.port || (u.protocol === 'wss:' ? 443 : 80), path: u.pathname + u.search, method: 'GET',
      headers: { ...headers, Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Key': key, 'Sec-WebSocket-Version': '13' },
    });
    req.on('upgrade', (res, socket, head) => {
      try { socket.setTimeout(0); } catch { /* fine */ }
      if (res.headers['sec-websocket-accept'] !== acceptOf(key)) { socket.destroy(); reject(new Error('bad WebSocket handshake')); return; }
      resolve(wrap(socket, { client: true, maxMessage, head }));
    });
    req.on('response', (res) => { res.resume(); reject(Object.assign(new Error('WebSocket upgrade refused'), { status: res.statusCode })); });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('WebSocket connect timed out')));
    req.end();
  });
}
