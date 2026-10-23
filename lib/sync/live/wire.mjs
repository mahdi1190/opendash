// lib/sync/live/wire.mjs - framing for live sync between paired devices
// (docs/dev/LIVE_SYNC.md). PLATFORM-AGNOSTIC: no node: imports, no Buffer;
// bytes are Uint8Array, so a phone or a WebRTC data channel reuses it.
//
// A frame is a 4-byte big-endian length followed by that many bytes. Before
// the handshake is done a frame is a small JSON object in the clear (at most
// MAX_HELLO_FRAME bytes, at most 3 of them); after it, every frame is
// AES-256-GCM sealed (lib/sync/live/handshake.mjs) and at most MAX_FRAME.

export const LIVE_PROTOCOL = 'opendash-live';
export const LIVE_VERSION = 1;
export const SUPPORTED_VERSIONS = Object.freeze([1]);
export const MAX_HELLO_FRAME = 4096;
export const MAX_FRAME = 4 * 1024 * 1024;

const te = new TextEncoder();
const td = new TextDecoder('utf-8', { fatal: true });

/** The 4-byte length prefix + payload. */
export function encodeFrame(payload) {
  if (!(payload instanceof Uint8Array)) throw new TypeError('a frame is bytes');
  if (payload.length > 0xffffffff) throw new RangeError('frame too big');
  const out = new Uint8Array(4 + payload.length);
  const n = payload.length;
  out[0] = (n >>> 24) & 255; out[1] = (n >>> 16) & 255; out[2] = (n >>> 8) & 255; out[3] = n & 255;
  out.set(payload, 4);
  return out;
}

/**
 * Cuts a byte stream into frames. push(chunk) any number of bytes at a time;
 * onFrame(bytes) runs once per complete frame; a length of 0 or above `max`
 * calls onError('frame-size') and stops reading (the caller closes the line).
 */
export function createFrameReader({ max = MAX_FRAME, onFrame, onError = () => {} } = {}) {
  let chunks = [], head = 0, off = 0, have = 0, need = -1, dead = false, limit = max;
  function take(n) {
    const out = new Uint8Array(n);
    let o = 0;
    while (o < n) {
      const c = chunks[head];
      const k = Math.min(c.length - off, n - o);
      out.set(c.subarray(off, off + k), o);
      o += k; off += k;
      if (off === c.length) { chunks[head++] = null; off = 0; }
    }
    if (head > 64 && head * 2 > chunks.length) { chunks = chunks.slice(head); head = 0; }
    have -= n;
    return out;
  }
  return {
    push(chunk) {
      if (dead || !chunk || !chunk.length) return;
      chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
      have += chunk.length;
      for (;;) {
        if (dead) return;
        if (need < 0) {
          if (have < 4) return;
          const h = take(4);
          need = ((h[0] << 24) >>> 0) + (h[1] << 16) + (h[2] << 8) + h[3];
          if (need === 0 || need > limit) { dead = true; chunks = []; head = 0; have = 0; onError('frame-size'); return; }
        }
        if (have < need) return;
        const f = take(need);
        need = -1;
        onFrame(f);
      }
    },
    setMax(n) { limit = n; },
    stop() { dead = true; chunks = []; head = 0; have = 0; },
    get buffered() { return have; },
  };
}

export const jsonBytes = (v) => te.encode(JSON.stringify(v));
/** The object, or null for anything that is not one UTF-8 JSON object. */
export function parseJsonBytes(b) {
  let t;
  try { t = td.decode(b); } catch { return null; }
  try { const v = JSON.parse(t); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; }
}

/**
 * Sliding one-second counters: allow(bytes) is false once a peer sends more
 * than `frames` frames or `bytes` bytes in a second (the line is then closed).
 */
export function createRateLimit({ frames = 400, bytes = 16 * 1024 * 1024, now = () => Date.now() } = {}) {
  let start = now(), f = 0, b = 0;
  return {
    allow(n) {
      const t = now();
      if (t - start >= 1000) { start = t; f = 0; b = 0; }
      f++; b += n;
      return f <= frames && b <= bytes;
    },
  };
}
