// lib/sync/live/session.mjs - one live link between two paired devices over
// any byte stream: the handshake (lib/sync/live/handshake.mjs), then sealed
// frames carrying small JSON messages, keepalive and limits.
//
// PLATFORM-AGNOSTIC: no node: imports. The byte stream is an adapter:
//   conn = {write(bytes), close(), onData(fn(bytes)), onClose(fn), remote: {address, port}}
// (lib/sync/live/node-net.mjs wraps a TCP socket; a WebRTC data channel or a
// WebSocket would wrap the same way).
//
// Never trusts the other end before the handshake: at most 3 cleartext frames
// of at most 4 KB, 5 s to finish, nothing delivered until both sides proved
// their identity key. After it: frames of at most 4 MB, at most 400 frames or
// 16 MB a second (more closes the link), a ping when idle for 15 s, closed when
// nothing arrived for 45 s.

import { createFrameReader, encodeFrame, jsonBytes, parseJsonBytes, createRateLimit, MAX_FRAME, MAX_HELLO_FRAME } from './wire.mjs';
import { initiatorStart, initiatorFinish, responderAccept, responderFinish } from './handshake.mjs';

export const HANDSHAKE_MS = 5000;
export const PING_MS = 15000;
export const IDLE_MS = 45000;

export function createSession({
  conn, role, auth, peerId = null, now = () => Date.now(), timers = globalThis, limits = {},
  handshakeMs = HANDSHAKE_MS, pingMs = PING_MS, idleMs = IDLE_MS,
  onOpen = () => {}, onMessage = () => {}, onClose = () => {},
}) {
  if (role !== 'initiator' && role !== 'responder') throw new Error('role is initiator or responder');
  const maxFrame = limits.maxFrame || MAX_FRAME;
  const rate = createRateLimit({ frames: limits.frames, bytes: limits.bytes, now });
  let state = 'hello', why = null, ciphers = null, hs = null, helloFrames = 0;
  let lastRecv = now(), lastSent = now(), openedAt = null;
  let sendChain = Promise.resolve(), recvChain = Promise.resolve();
  const unref = (t) => { if (t && typeof t.unref === 'function') t.unref(); return t; };
  const hsTimer = unref(timers.setTimeout(() => close('timeout'), handshakeMs));
  let keepalive = null;

  const api = {
    get state() { return state; },
    get peerId() { return peerId; },
    get role() { return role; },
    get remote() { return conn.remote || null; },
    get openedAt() { return openedAt; },
    get why() { return why; },
    get counts() { return ciphers ? { sent: ciphers.sent, received: ciphers.received } : { sent: 0, received: 0 }; },
    /** When anything (a ping too) last arrived, by this device's clock (lib/sync/presence.mjs). */
    get lastRecvAt() { return lastRecv; },
    send, close,
  };

  const writeClear = (obj) => { try { conn.write(encodeFrame(jsonBytes(obj))); } catch { /* gone */ } };
  const reader = createFrameReader({
    max: MAX_HELLO_FRAME,
    onFrame: (f) => { recvChain = recvChain.then(() => (state === 'closed' ? null : onFrame(f))).catch(() => close('error')); },
    onError: () => close('frame-size'),
  });
  conn.onData((b) => { if (state !== 'closed') reader.push(b); });
  conn.onClose(() => close('closed'));

  function open(c) {
    ciphers = c;
    state = 'open';
    openedAt = now();
    lastRecv = now();
    reader.setMax(maxFrame + 16);
    timers.clearTimeout(hsTimer);
    keepalive = unref(timers.setInterval(() => {
      if (state !== 'open') return;
      if (now() - lastRecv > idleMs) return close('idle');
      if (now() - lastSent >= pingMs) send({ t: 'ping' });
    }, Math.max(50, Math.min(pingMs, idleMs) / 3)));
    try { onOpen(api); } catch { /* a listener never breaks the link */ }
  }

  async function onFrame(f) {
    if (state === 'hello') {
      if (++helloFrames > 3) return close('format');
      const msg = parseJsonBytes(f);
      if (!msg) return close('format');
      if (role === 'initiator') {
        if (msg.t === 'error') return close(msg.code === 'version' ? 'version' : msg.code === 'key' ? 'key-mismatch' : 'refused');
        const r = await initiatorFinish(hs, msg);
        if (r.error) return close(r.error);
        writeClear(r.confirm);
        lastSent = now();
        return open(r.ciphers);
      }
      if (!hs) {
        const r = await responderAccept({ auth, hello: msg, now });
        if (r.error) { if (r.reply) writeClear(r.reply); return close(r.error); }
        hs = r.state;
        writeClear(r.welcome);
        return null;
      }
      const r = await responderFinish(hs, msg);
      if (r.error) return close(r.error);
      peerId = r.peerId;
      return open(r.ciphers);
    }
    if (state !== 'open') return null;
    if (!rate.allow(f.length)) return close('rate');
    const plain = await ciphers.open(f);
    if (!plain) return close('tampered');
    const msg = parseJsonBytes(plain);
    if (!msg || typeof msg.t !== 'string') return close('format');
    lastRecv = now();
    if (msg.t === 'ping') return null;
    if (msg.t === 'bye') return close('bye');
    try { await onMessage(msg, api); } catch { /* a listener never breaks the link */ }
    return null;
  }

  /** Seal and send one message; false when the link is not open or the message is too big for a frame. */
  function send(msg) {
    if (state !== 'open') return Promise.resolve(false);
    const bytes = jsonBytes(msg);
    if (bytes.length > maxFrame) return Promise.resolve(false);
    const p = sendChain.then(async () => {
      if (state !== 'open') return false;
      const ct = await ciphers.seal(bytes);
      if (state !== 'open') return false;
      try { conn.write(encodeFrame(ct)); } catch { close('closed'); return false; }
      lastSent = now();
      return true;
    });
    sendChain = p.catch(() => false);
    return p;
  }

  function close(reason = 'closed') {
    if (state === 'closed') return;
    const wasOpen = state === 'open';
    state = 'closed';
    why = reason;
    timers.clearTimeout(hsTimer);
    if (keepalive) timers.clearInterval(keepalive);
    reader.stop();
    try { conn.close(); } catch { /* closed */ }
    try { onClose(reason, api, wasOpen); } catch { /* fine */ }
  }

  if (role === 'initiator') {
    initiatorStart({ auth, peerId, now }).then(({ hello, state: s }) => {
      if (state === 'closed') return;
      hs = s;
      writeClear(hello);
      lastSent = now();
    }).catch((e) => close((e && e.code) || 'error'));
  }
  return api;
}
