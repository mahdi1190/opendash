// lib/sync/live/addrbook.mjs - where a device can be reached (the free
// "dynamic DNS" of live sync, docs/dev/LIVE_SYNC.md section 4).
//
// PLATFORM-AGNOSTIC: no node: imports. The network interfaces come from an
// adapter (lib/sync/live/node-net.mjs nodeInterfaces()).
//
// Each device publishes its endpoints inside the ENCRYPTED part of its own
// device.json in the sync folder (only members can read it), refreshed when
// its network changes:
//   {v:1, port, eps:[{k, a, p}], nat:{state, ext?}, at}
//   k: 'lan'  a private IPv4 address of this computer (home or office network)
//      'lan6' a unique-local IPv6 address (fc00::/7)
//      'wan'  the public IPv4 address and port the router maps to it (UPnP / NAT-PMP / PCP)
//      'v6'   a global IPv6 address (reachable when no firewall is in the way)
// Peers try them in order: an address heard on the same network a moment ago
// (lib/sync/live/discovery.mjs), the same subnet, other LAN addresses, then
// the internet ones.

const V4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
export const MAX_ENDPOINTS = 16;

export function parseV4(a) {
  const m = V4_RE.exec(String(a || ''));
  if (!m) return null;
  const o = m.slice(1).map(Number);
  return o.every(x => x >= 0 && x <= 255) ? o : null;
}
const v4num = (o) => ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3];

/** The groups of an IPv6 address as 8 numbers, or null. Accepts "::", an IPv4 tail and drops a %zone. */
export function parseV6(a) {
  let s = String(a || '').toLowerCase();
  if (!s.includes(':')) return null;
  s = s.split('%')[0];
  let tail = [];
  const v4 = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(s);
  if (v4) {
    const o = parseV4(v4[1]);
    if (!o) return null;
    tail = [(o[0] << 8) | o[1], (o[2] << 8) | o[3]];
    s = s.slice(0, -v4[1].length);
    if (s.endsWith(':') && !s.endsWith('::')) s = s.slice(0, -1);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const part = (x) => (x ? x.split(':') : []);
  const head = part(halves[0]), rest = halves.length === 2 ? part(halves[1]) : [];
  const groups = [...head, ...rest];
  if (groups.some(g => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  const nums = groups.map(g => parseInt(g, 16));
  const want = 8 - tail.length;
  if (halves.length === 1) return nums.length === want ? [...nums, ...tail] : null;
  if (nums.length >= want) return null;
  return [...head.map(g => parseInt(g, 16)), ...new Array(want - nums.length).fill(0), ...rest.map(g => parseInt(g, 16)), ...tail];
}

/**
 * 'loopback' | 'private' (RFC 1918) | 'linklocal' | 'cgnat' (100.64.0.0/10)
 * | 'ula' (fc00::/7) | 'global' | 'invalid' (also multicast, 0.0.0.0, documentation ranges).
 */
export function classifyAddress(a) {
  const o = parseV4(a);
  if (o) {
    if (o[0] === 127) return 'loopback';
    if (o[0] === 10 || (o[0] === 172 && o[1] >= 16 && o[1] <= 31) || (o[0] === 192 && o[1] === 168)) return 'private';
    if (o[0] === 169 && o[1] === 254) return 'linklocal';
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return 'cgnat';
    if (o[0] === 0 || o[0] >= 224 || (o[0] === 192 && o[1] === 0 && o[2] === 2) || (o[0] === 198 && (o[1] === 18 || o[1] === 19)) || (o[0] === 198 && o[1] === 51 && o[2] === 100) || (o[0] === 203 && o[1] === 0 && o[2] === 113)) return 'invalid';
    return 'global';
  }
  const g = parseV6(a);
  if (!g) return 'invalid';
  if (g.slice(0, 7).every(x => x === 0) && g[7] === 1) return 'loopback';
  if (g.every(x => x === 0)) return 'invalid';
  if (g.slice(0, 5).every(x => x === 0) && g[5] === 0xffff) return classifyAddress(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`);
  if ((g[0] & 0xffc0) === 0xfe80) return 'linklocal';
  if ((g[0] & 0xfe00) === 0xfc00) return 'ula';
  if ((g[0] & 0xff00) === 0xff00) return 'invalid';
  if (g[0] === 0x2001 && g[1] === 0x0db8) return 'invalid';
  if ((g[0] & 0xe000) === 0x2000) return 'global';
  return 'invalid';
}
/** Is this an address on a local network (the "same Wi-Fi" path)? */
export const isLocalAddress = (a) => ['private', 'linklocal', 'loopback', 'ula'].includes(classifyAddress(a));
/** "::ffff:192.168.1.5" -> "192.168.1.5" (what a dual-stack socket reports for an IPv4 peer). */
export function plainAddress(a) {
  const s = String(a || '');
  const m = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(s);
  return m ? m[1] : s.split('%')[0];
}

const maskBits = (mask) => {
  const o = parseV4(mask);
  if (!o) return null;
  let n = v4num(o), bits = 0;
  while (n & 0x80000000) { bits++; n = (n << 1) >>> 0; }
  return bits;
};
/** Are a and b in the same IPv4 subnet of `bits` prefix length? */
export function sameSubnet(a, b, bits) {
  const x = parseV4(a), y = parseV4(b);
  if (!x || !y || !Number.isInteger(bits) || bits < 1 || bits > 32) return false;
  const m = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0;
  return ((v4num(x) & m) >>> 0) === ((v4num(y) & m) >>> 0);
}

/**
 * This device's endpoints from its interfaces ([{address, family, netmask,
 * internal}]) and the router's mapping ({address, port} or null).
 */
export function endpointsFrom({ interfaces = [], port, mapped = null, includeLoopback = false }) {
  const eps = [];
  const seen = new Set();
  const add = (k, a, p, m) => { const key = `${a}|${p}`; if (seen.has(key) || eps.length >= MAX_ENDPOINTS) return; seen.add(key); eps.push(m != null ? { k, a, p, m } : { k, a, p }); };
  const list = [...interfaces].sort((x, y) => (String(x.family) === 'IPv4' ? 0 : 1) - (String(y.family) === 'IPv4' ? 0 : 1));
  for (const i of list) {
    const a = plainAddress(i.address);
    const c = classifyAddress(a);
    const v4 = !!parseV4(a);
    if (c === 'loopback') { if (includeLoopback) add('lan', a, port); continue; }
    if (i.internal) continue;
    if (v4 && c === 'private') add('lan', a, port, maskBits(i.netmask));
    else if (v4 && c === 'cgnat') add('lan', a, port, maskBits(i.netmask));     // some offices and hotspots use 100.64/10 inside
    else if (!v4 && c === 'ula') add('lan6', a, port);
    else if (!v4 && c === 'global') add('v6', a, port);
    else if (v4 && c === 'global') add('wan', a, port);                           // a computer with a public address of its own
  }
  if (mapped && parseV4(mapped.address) && classifyAddress(mapped.address) === 'global' && validPort(mapped.port)) add('wan', mapped.address, mapped.port);
  return eps;
}
const validPort = (p) => Number.isInteger(p) && p > 0 && p < 65536;
const KINDS = ['lan', 'lan6', 'wan', 'v6'];

/** A peer's published address record, checked (anything odd is dropped), or null. */
export function cleanAddressRecord(r) {
  if (!r || typeof r !== 'object' || r.v !== 1) return null;
  const eps = [];
  for (const e of Array.isArray(r.eps) ? r.eps.slice(0, MAX_ENDPOINTS) : []) {
    if (!e || !KINDS.includes(e.k) || !validPort(e.p) || typeof e.a !== 'string' || e.a.length > 60) continue;
    const c = classifyAddress(e.a);
    if (c === 'invalid' || c === 'linklocal') continue;
    eps.push({ k: e.k, a: plainAddress(e.a), p: e.p, ...(Number.isInteger(e.m) && e.m >= 1 && e.m <= 32 ? { m: e.m } : {}) });
  }
  const nat = r.nat && typeof r.nat === 'object' ? { state: typeof r.nat.state === 'string' ? r.nat.state.slice(0, 20) : 'unknown' } : { state: 'unknown' };
  return { v: 1, port: validPort(r.port) ? r.port : null, eps, nat, at: Number.isFinite(r.at) ? r.at : null };
}

/** A stable key for "did the published addresses change?". */
export const endpointsKey = (eps) => (eps || []).map(e => `${e.k}:${e.a}:${e.p}`).sort().join(',');

/**
 * The order to try a peer's endpoints in. heard: [{a, p, at}] addresses its
 * announcements came from on this network (newest first); mine: this
 * computer's own interfaces (to prefer the same subnet).
 */
export function dialOrder(eps, { heard = [], mine = [] } = {}) {
  const out = [];
  const seen = new Set();
  const push = (e, via) => { const key = `${e.a}|${e.p}`; if (seen.has(key)) return; seen.add(key); out.push({ ...e, via }); };
  for (const h of heard) push({ k: isLocalAddress(h.a) ? 'lan' : 'wan', a: plainAddress(h.a), p: h.p }, 'heard');
  const mineV4 = mine.map(i => ({ a: plainAddress(i.address), m: maskBits(i.netmask) })).filter(i => parseV4(i.a));
  const local = (e) => e.k === 'lan' && mineV4.some(i => sameSubnet(i.a, e.a, Math.min(i.m || 24, e.m || 24)));
  // A LAN address on this computer's own subnet first; then the internet
  // ones; a private address on ANOTHER network last (at the office,
  // 192.168.1.20 is someone else's machine, or nothing: only a timeout).
  const rank = (e) => (local(e) ? 0 : e.k === 'wan' ? 1 : e.k === 'v6' ? 2 : e.k === 'lan' ? 3 : 4);
  const rest = [...(eps || [])].map((e, i) => ({ e, i })).sort((x, y) => (rank(x.e) - rank(y.e)) || (x.i - y.i)).map(x => x.e);
  for (const e of rest) push(e, 'book');
  return out;
}

/** 'lan' (same network) or 'internet' for the address a link runs over. */
export const pathOf = (address) => (isLocalAddress(plainAddress(address)) ? 'lan' : 'internet');
