// lib/sync/live/discovery.mjs - finding a paired device on the same network
// within seconds (docs/dev/LIVE_SYNC.md section 5).
//
// PLATFORM-AGNOSTIC: Web Crypto only. The UDP side is an adapter
// (lib/sync/live/node-net.mjs createNodeDiscovery: multicast 239.255.41.73 and
// broadcast on port 41733).
//
// An announcement says nothing to anyone without the sync key:
//   {p:"odl", v:1, g, n, d, port}
//   g     HMAC-SHA-256(dk, "group")[0:12]          the same for every member (this key epoch)
//   n     12 random bytes                           new each time
//   d     HMAC-SHA-256(dk, "dev|" n "|" id "|" port)[0:12]   which member, and its port
//   dk    HKDF(current sync key, "opendash-live-discovery-v1")  (lib/sync/e2e.mjs liveAuth().tagKey)
// A member recognises the group from g and finds which member sent it by
// trying d for each member id. An outsider sees a constant group tag and
// random bytes; replaying an announcement only makes members dial the
// replayer, whose handshake then fails.

import { b64u, unb64u, utf8 } from '../e2e-crypto.mjs';
import { jsonBytes, parseJsonBytes } from './wire.mjs';

const subtle = () => globalThis.crypto.subtle;
const ID_RE = /^[0-9a-f]{16}$/;
export const ANNOUNCE_MAX = 512;

const keyCache = new Map();
function hmacKey(raw) {
  const k = b64u(raw);
  let p = keyCache.get(k);
  if (!p) { p = subtle().importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); keyCache.set(k, p); if (keyCache.size > 16) keyCache.delete(keyCache.keys().next().value); }
  return p;
}
async function mac(raw, text, len) { return new Uint8Array(await subtle().sign('HMAC', await hmacKey(raw), utf8(text))).subarray(0, len); }

export async function groupTag(tagKey) { return b64u(await mac(tagKey, 'group', 12)); }

export async function encodeAnnounce({ tagKey, deviceId, port }) {
  const n = new Uint8Array(12); globalThis.crypto.getRandomValues(n);
  const nb = b64u(n);
  return jsonBytes({ p: 'odl', v: 1, g: await groupTag(tagKey), n: nb, d: b64u(await mac(tagKey, `dev|${nb}|${deviceId}|${port}`, 12)), port });
}

/** {deviceId, port} when a member of this group (not this device) sent it, else null. */
export async function decodeAnnounce(bytes, { tagKey, members = [], self = null }) {
  if (!bytes || bytes.length > ANNOUNCE_MAX) return null;
  const m = parseJsonBytes(bytes);
  if (!m || m.p !== 'odl' || m.v !== 1 || typeof m.g !== 'string' || typeof m.n !== 'string' || typeof m.d !== 'string') return null;
  if (!Number.isInteger(m.port) || m.port < 1 || m.port > 65535) return null;
  const n = unb64u(m.n), d = unb64u(m.d);
  if (!n || n.length !== 12 || !d || d.length !== 12) return null;
  if (m.g !== await groupTag(tagKey)) return null;
  for (const id of members) {
    if (!ID_RE.test(id) || id === self) continue;
    const want = await mac(tagKey, `dev|${m.n}|${id}|${m.port}`, 12);
    let diff = 0;
    for (let i = 0; i < 12; i++) diff |= want[i] ^ d[i];
    if (!diff) return { deviceId: id, port: m.port };
  }
  return null;
}
