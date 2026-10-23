// lib/sync/live/nat.mjs - asking the home router to forward a port to this
// computer, so a device on another network (the office) can dial in
// (docs/dev/LIVE_SYNC.md section 6).
//
// PLATFORM-AGNOSTIC: no node: imports. The network goes through adapters
// (lib/sync/live/node-nat.mjs gives the Node ones):
//   udp.request(target {address, port}, bytes, {timeoutMs, many}) -> [{bytes, address, port}]
//   http({method, url, headers, body, timeoutMs}) -> {status, body, localAddress}
//   gateways() -> ['192.168.1.1', ...]   routers to try NAT-PMP / PCP on
//   clientAddress() -> this computer's LAN IPv4 (PCP's client address)
//
// Tried in order:
//   1. UPnP IGD: SSDP M-SEARCH to 239.255.255.250:1900, the device
//      description over HTTP, then SOAP GetExternalIPAddress and
//      AddPortMapping (a lease, renewed at half time; DeletePortMapping on a
//      clean exit). A taken port (error 718) moves to the next one; a router
//      that only takes permanent mappings (725) gets lease 0 (deleted on exit).
//   2. NAT-PMP (RFC 6886) on UDP 5351 of the router; a router that answers
//      "unsupported version" is asked again with PCP (RFC 6887, MAP opcode).
// An external address in 100.64.0.0/10 (carrier-grade NAT) or a private
// range (a second router in front) means the mapping exists but nothing from
// the internet reaches it: reported as not reachable.

import { classifyAddress, parseV4 } from './addrbook.mjs';

export const SSDP_TARGET = Object.freeze({ address: '239.255.255.250', port: 1900 });
export const NATPMP_PORT = 5351;
export const IGD_TYPES = Object.freeze(['urn:schemas-upnp-org:device:InternetGatewayDevice:1', 'urn:schemas-upnp-org:device:InternetGatewayDevice:2']);
const SERVICE_PREFS = ['urn:schemas-upnp-org:service:WANIPConnection:2', 'urn:schemas-upnp-org:service:WANIPConnection:1', 'urn:schemas-upnp-org:service:WANPPPConnection:1'];
const te = new TextEncoder();
const td = new TextDecoder();

// ─── SSDP ──────────────────────────────────────────────────────────────────
export function ssdpSearch(st, mx = 2) {
  return te.encode(`M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: ${mx}\r\nST: ${st}\r\n\r\n`);
}
/** {location, st, usn} from an SSDP answer, or null. */
export function parseSsdpResponse(bytes) {
  const text = typeof bytes === 'string' ? bytes : td.decode(bytes);
  const lines = text.split(/\r?\n/);
  if (!/^HTTP\/1\.[01] 200/i.test(lines[0] || '') && !/^NOTIFY /i.test(lines[0] || '')) return null;
  const h = {};
  for (const l of lines.slice(1)) { const i = l.indexOf(':'); if (i > 0) h[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); }
  if (!h.location || !/^https?:\/\//i.test(h.location)) return null;
  return { location: h.location, st: h.st || h.nt || '', usn: h.usn || '' };
}

// ─── XML (only what an IGD description and a SOAP answer need) ────────────
const unxml = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** The text of the first <name> element (any namespace prefix), or null. */
export function xmlText(xml, name) {
  const m = new RegExp(`<(?:[\\w.-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${name}>`, 'i').exec(xml);
  return m ? unxml(m[1].trim()) : null;
}
/** The WAN connection service to talk to: {serviceType, controlUrl}, or null. */
export function parseIgdDescription(xml, location) {
  const base = xmlText(xml, 'URLBase') || location;
  const services = [];
  for (const m of String(xml).matchAll(/<(?:[\w.-]+:)?service(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?service>/gi)) {
    const type = xmlText(m[1], 'serviceType'), ctl = xmlText(m[1], 'controlURL');
    if (type && ctl) services.push({ serviceType: type, controlUrl: ctl });
  }
  for (const want of SERVICE_PREFS) {
    const s = services.find(x => x.serviceType === want);
    if (!s) continue;
    try {
      const u = new URL(s.controlUrl, base);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      return { serviceType: s.serviceType, controlUrl: u.href };
    } catch { continue; }
  }
  return null;
}
export function soapRequest(serviceType, action, args = {}) {
  const inner = Object.entries(args).map(([k, v]) => `<${k}>${xmlEsc(v)}</${k}>`).join('');
  return {
    headers: { 'Content-Type': 'text/xml; charset="utf-8"', SOAPAction: `"${serviceType}#${action}"` },
    body: `<?xml version="1.0"?>\r\n<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:${action} xmlns:u="${serviceType}">${inner}</u:${action}></s:Body></s:Envelope>`,
  };
}
/** {ok, get(name)} or {ok:false, code, description}. */
export function parseSoapResponse(status, xml) {
  const body = String(xml || '');
  if (status === 200 && !/<(?:[\w.-]+:)?Fault[\s>]/i.test(body)) return { ok: true, get: (n) => xmlText(body, n) };
  const code = Number(xmlText(body, 'errorCode'));
  return { ok: false, code: Number.isFinite(code) ? code : status, description: xmlText(body, 'errorDescription') || `HTTP ${status}` };
}

// ─── NAT-PMP and PCP packets ───────────────────────────────────────────────
const u16 = (b, i) => (b[i] << 8) | b[i + 1];
const u32 = (b, i) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const put16 = (b, i, v) => { b[i] = (v >>> 8) & 255; b[i + 1] = v & 255; };
const put32 = (b, i, v) => { b[i] = (v >>> 24) & 255; b[i + 1] = (v >>> 16) & 255; b[i + 2] = (v >>> 8) & 255; b[i + 3] = v & 255; };
export const natpmpExternalRequest = () => Uint8Array.from([0, 0]);
export function natpmpMapRequest({ internalPort, externalPort, lifetime }) {
  const b = new Uint8Array(12);
  b[0] = 0; b[1] = 2;                       // version 0, map TCP
  put16(b, 4, internalPort); put16(b, 6, externalPort); put32(b, 8, lifetime);
  return b;
}
/** {op, result, external?} | {op, result, internalPort, externalPort, lifetime} | {version} | null */
export function parseNatpmp(b) {
  if (!b || b.length < 4) return null;
  if (b[0] !== 0) return { version: b[0], result: b.length >= 4 ? u16(b, 2) : null };
  const op = b[1], result = u16(b, 2);
  if (op === 128 && b.length >= 12) return { op, result, external: `${b[8]}.${b[9]}.${b[10]}.${b[11]}` };
  if (op === 130 && b.length >= 16) return { op, result, internalPort: u16(b, 8), externalPort: u16(b, 10), lifetime: u32(b, 12) };
  return { op, result };
}
const v4mapped = (a) => { const o = parseV4(a) || [0, 0, 0, 0]; return Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, ...o]); };
export function pcpMapRequest({ clientAddress, internalPort, externalPort, lifetime, nonce }) {
  const b = new Uint8Array(60);
  b[0] = 2; b[1] = 1;                       // version 2, request, MAP
  put32(b, 4, lifetime);
  b.set(v4mapped(clientAddress), 8);
  b.set(nonce, 24);
  b[36] = 6;                                // TCP
  put16(b, 40, internalPort); put16(b, 42, externalPort);
  b.set(v4mapped('0.0.0.0'), 44);
  return b;
}
/** {result, lifetime, nonce, internalPort, externalPort, external} or null. */
export function parsePcp(b) {
  if (!b || b.length < 24 || b[0] !== 2 || (b[1] & 0x80) === 0) return null;
  const result = b[3], lifetime = u32(b, 4);
  if ((b[1] & 0x7f) !== 1 || b.length < 60) return { result, lifetime };
  const ip = b.subarray(44, 60);
  return { result, lifetime, nonce: b.subarray(24, 36), internalPort: u16(b, 40), externalPort: u16(b, 42), external: `${ip[12]}.${ip[13]}.${ip[14]}.${ip[15]}` };
}

/** 'public' | 'cgnat' | 'private' (another router in front) | 'invalid'. */
export function classifyExternal(ip) {
  const c = classifyAddress(ip);
  if (!parseV4(ip)) return 'invalid';
  if (c === 'global') return 'public';
  if (c === 'cgnat') return 'cgnat';
  if (c === 'private' || c === 'linklocal' || c === 'loopback') return 'private';
  return 'invalid';
}

// ─── The port mapper ───────────────────────────────────────────────────────
export function createPortMapper({ udp, http, ssdpTargets = [SSDP_TARGET], gateways = () => [], clientAddress = () => null, natpmpPort = NATPMP_PORT, description = 'OpenDash sync', log = () => {}, ssdpMs = 2500, httpMs = 3000, natpmpMs = 250 } = {}) {
  let igd = null;          // {serviceType, controlUrl}
  let current = null;      // {method, internalPort, externalPort, lease, internalClient, gateway, nonce}
  const say = (m) => { try { log('info', `live sync: ${m}`); } catch { /* fine */ } };

  async function findIgd() {
    const found = [];
    for (const target of ssdpTargets) {
      for (const st of IGD_TYPES) {
        let answers = [];
        try { answers = await udp.request(target, ssdpSearch(st), { timeoutMs: ssdpMs, many: true }); } catch { answers = []; }
        for (const a of answers) { const r = parseSsdpResponse(a.bytes); if (r && !found.some(f => f.location === r.location)) found.push(r); }
        if (found.length) break;
      }
      if (found.length) break;
    }
    for (const f of found) {
      try {
        const r = await http({ method: 'GET', url: f.location, timeoutMs: httpMs });
        if (r.status !== 200) continue;
        const s = parseIgdDescription(r.body, f.location);
        if (s) return s;
      } catch { /* the next one */ }
    }
    return null;
  }
  async function soap(action, args) {
    const q = soapRequest(igd.serviceType, action, args);
    const r = await http({ method: 'POST', url: igd.controlUrl, headers: q.headers, body: q.body, timeoutMs: httpMs });
    return { ...parseSoapResponse(r.status, r.body), localAddress: r.localAddress || null };
  }

  async function upnpMap({ internalPort, externalPort, lease }) {
    if (!igd) igd = await findIgd();
    if (!igd) return { ok: false, reason: 'no-upnp' };
    let ext = null, internalClient = null;
    try {
      const r = await soap('GetExternalIPAddress', {});
      if (r.ok) ext = r.get('NewExternalIPAddress');
      internalClient = r.localAddress;
    } catch { igd = null; return { ok: false, reason: 'no-upnp' }; }
    if (!internalClient) internalClient = clientAddress();
    let leaseNow = lease;
    const ports = [externalPort, externalPort + 1, externalPort + 2, externalPort + 3, 20000 + Math.floor(Math.random() * 40000)];
    for (let i = 0; i < ports.length; i++) {
      const port = ports[i];
      if (port > 65535) continue;
      const r = await soap('AddPortMapping', {
        NewRemoteHost: '', NewExternalPort: port, NewProtocol: 'TCP', NewInternalPort: internalPort,
        NewInternalClient: internalClient || '', NewEnabled: 1, NewPortMappingDescription: description, NewLeaseDuration: leaseNow,
      }).catch(() => ({ ok: false, code: 0 }));
      if (r.ok) {
        current = { method: 'upnp', internalPort, externalPort: port, lease: leaseNow, internalClient };
        return { ok: true, method: 'upnp', external: { address: ext, port }, lease: leaseNow };
      }
      if (r.code === 725 && leaseNow !== 0) { leaseNow = 0; i--; continue; }       // only permanent mappings
      if (r.code === 718 || r.code === 727 || r.code === 729) continue;           // that port is taken
      return { ok: false, reason: 'refused', code: r.code };
    }
    return { ok: false, reason: 'refused', code: 718 };
  }

  async function ask(gateway, bytes, parse, ok) {
    let wait = natpmpMs;
    for (let i = 0; i < 3; i++) {
      let answers = [];
      try { answers = await udp.request({ address: gateway, port: natpmpPort }, bytes, { timeoutMs: wait, many: false }); } catch { answers = []; }
      for (const a of answers) { const r = parse(a.bytes); if (r && ok(r)) return r; }
      wait *= 2;
    }
    return null;
  }
  async function pmpMap({ internalPort, externalPort, lease }) {
    for (const gw of gateways()) {
      const e = await ask(gw, natpmpExternalRequest(), parseNatpmp, (r) => r.version !== undefined || r.op === 128);
      if (!e) continue;
      if (e.version === 2 || e.result === 1) {
        // Answers in PCP: ask in PCP.
        const nonce = new Uint8Array(12); globalThis.crypto.getRandomValues(nonce);
        const client = clientAddress();
        const r = await ask(gw, pcpMapRequest({ clientAddress: client, internalPort, externalPort, lifetime: lease || 7200, nonce }), parsePcp, (x) => x.nonce && x.nonce.every((b, i) => b === nonce[i]));
        if (r && r.result === 0) {
          current = { method: 'pcp', internalPort, externalPort: r.externalPort, lease: r.lifetime, gateway: gw, nonce, client };
          return { ok: true, method: 'pcp', external: { address: r.external, port: r.externalPort }, lease: r.lifetime };
        }
        return { ok: false, reason: 'refused', code: r ? r.result : null };
      }
      if (e.result !== 0) return { ok: false, reason: 'refused', code: e.result };
      const m = await ask(gw, natpmpMapRequest({ internalPort, externalPort, lifetime: lease || 7200 }), parseNatpmp, (r) => r.op === 130 && r.internalPort === internalPort);
      if (!m || m.result !== 0) return { ok: false, reason: 'refused', code: m ? m.result : null };
      current = { method: 'natpmp', internalPort, externalPort: m.externalPort, lease: m.lifetime, gateway: gw };
      return { ok: true, method: 'natpmp', external: { address: e.external, port: m.externalPort }, lease: m.lifetime };
    }
    return { ok: false, reason: 'no-natpmp' };
  }

  /**
   * Map TCP internalPort on this computer: {ok, method, external:{address, port},
   * lease, reachable, reason}. reason: 'cgnat' | 'double-nat' (mapped, but not
   * reachable from outside), 'no-router-support', 'refused'.
   */
  async function map({ internalPort, externalPort = internalPort, lease = 3600 } = {}) {
    let r = await upnpMap({ internalPort, externalPort, lease });
    if (!r.ok && r.reason === 'no-upnp') r = await pmpMap({ internalPort, externalPort, lease });
    if (!r.ok) {
      const reason = r.reason === 'no-natpmp' ? 'no-router-support' : r.reason;
      say(reason === 'no-router-support' ? 'the router does not offer port mapping (UPnP or NAT-PMP)' : `the router refused a port mapping (${r.code})`);
      return { ok: false, method: null, reachable: false, reason, code: r.code ?? null };
    }
    const kind = r.external.address ? classifyExternal(r.external.address) : 'invalid';
    const reachable = kind === 'public';
    const reason = kind === 'cgnat' ? 'cgnat' : kind === 'private' ? 'double-nat' : kind === 'invalid' ? 'no-external-address' : null;
    say(`port ${r.external.port} mapped with ${r.method}${reachable ? '' : ` (not reachable from outside: ${reason})`}`);
    return { ok: true, method: r.method, external: r.external, lease: r.lease, reachable, reason };
  }

  async function unmap() {
    const c = current;
    current = null;
    if (!c) return { ok: true };
    try {
      if (c.method === 'upnp' && igd) { const r = await soap('DeletePortMapping', { NewRemoteHost: '', NewExternalPort: c.externalPort, NewProtocol: 'TCP' }); return { ok: r.ok }; }
      if (c.method === 'natpmp') { await ask(c.gateway, natpmpMapRequest({ internalPort: c.internalPort, externalPort: 0, lifetime: 0 }), parseNatpmp, (r) => r.op === 130); return { ok: true }; }
      if (c.method === 'pcp') { await ask(c.gateway, pcpMapRequest({ clientAddress: c.client, internalPort: c.internalPort, externalPort: c.externalPort, lifetime: 0, nonce: c.nonce }), parsePcp, () => true); return { ok: true }; }
    } catch { /* the lease runs out by itself */ }
    return { ok: false };
  }

  return { map, unmap, get current() { return current ? { ...current } : null; }, forgetRouter: () => { igd = null; } };
}
