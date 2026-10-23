// Port mapping (lib/sync/live/nat.mjs with the Node UDP/HTTP adapters)
// against FAKE routers on 127.0.0.1 only: a fake UPnP IGD (device description
// + SOAP control over HTTP) found through a fake SSDP responder, and fake
// NAT-PMP and PCP responders. Success, renewal, removal on exit, a taken
// port, a router that only takes permanent mappings, refusals, no router at
// all, and carrier-grade NAT / a second router (mapped but not reachable).
// Nothing here talks to a real router: every target is 127.0.0.1.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dgram from 'node:dgram';
import { createPortMapper, parseSsdpResponse, parseIgdDescription, parseSoapResponse, soapRequest, natpmpMapRequest, parseNatpmp, pcpMapRequest, parsePcp, classifyExternal } from '../lib/sync/live/nat.mjs';
import { createNodeUdp, nodeHttp } from '../lib/sync/live/node-net.mjs';

const LOOP = '127.0.0.1';
const closers = [];
after(async () => { for (const c of closers) await c(); });

const DESC = (control) => `<?xml version="1.0"?><root xmlns="urn:schemas-upnp-org:device-1-0"><device><deviceType>urn:schemas-upnp-org:device:InternetGatewayDevice:1</deviceType>
<deviceList><device><deviceType>urn:schemas-upnp-org:device:WANDevice:1</deviceType><deviceList><device><deviceType>urn:schemas-upnp-org:device:WANConnectionDevice:1</deviceType>
<serviceList><service><serviceType>urn:schemas-upnp-org:service:WANCommonInterfaceConfig:1</serviceType><controlURL>/common</controlURL></service>
<service><serviceType>urn:schemas-upnp-org:service:WANIPConnection:1</serviceType><serviceId>urn:upnp-org:serviceId:WANIPConn1</serviceId><controlURL>${control}</controlURL></service></serviceList>
</device></deviceList></device></deviceList></device></root>`;

/** A fake UPnP router: {port, mappings, calls, opts, close}. */
async function fakeIgd(opts = {}) {
  const o = { external: '81.2.3.4', conflictPorts: [], permanentOnly: false, fail: null, ...opts };
  const mappings = new Map();
  const calls = [];
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const c of req) body += c;
    const send = (status, xml) => { res.writeHead(status, { 'Content-Type': 'text/xml' }); res.end(xml); };
    if (req.method === 'GET' && req.url === '/desc.xml') return send(200, DESC('/ctl/IPConn'));
    if (req.method !== 'POST' || req.url !== '/ctl/IPConn') return send(404, '');
    const action = (/#(\w+)"?$/.exec(String(req.headers.soapaction || '')) || [])[1];
    const arg = (n) => (new RegExp(`<${n}>([^<]*)</${n}>`).exec(body) || [])[1];
    calls.push(action);
    const ok = (inner = '') => send(200, `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:${action}Response xmlns:u="urn:schemas-upnp-org:service:WANIPConnection:1">${inner}</u:${action}Response></s:Body></s:Envelope>`);
    const fault = (code, desc) => send(500, `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><s:Fault><faultcode>s:Client</faultcode><faultstring>UPnPError</faultstring><detail><UPnPError xmlns="urn:schemas-upnp-org:control-1-0"><errorCode>${code}</errorCode><errorDescription>${desc}</errorDescription></UPnPError></detail></s:Fault></s:Body></s:Envelope>`);
    if (action === 'GetExternalIPAddress') return ok(`<NewExternalIPAddress>${o.external}</NewExternalIPAddress>`);
    if (action === 'AddPortMapping') {
      const port = Number(arg('NewExternalPort')), lease = Number(arg('NewLeaseDuration'));
      if (o.fail) return fault(o.fail, 'Action Failed');
      if (o.conflictPorts.includes(port)) return fault(718, 'ConflictInMappingEntry');
      if (o.permanentOnly && lease !== 0) return fault(725, 'OnlyPermanentLeasesSupported');
      mappings.set(port, { internalPort: Number(arg('NewInternalPort')), client: arg('NewInternalClient'), protocol: arg('NewProtocol'), lease, description: arg('NewPortMappingDescription'), enabled: arg('NewEnabled') });
      return ok();
    }
    if (action === 'DeletePortMapping') { mappings.delete(Number(arg('NewExternalPort'))); return ok(); }
    return fault(401, 'Invalid Action');
  });
  await new Promise(r => server.listen(0, LOOP, r));
  const port = server.address().port;
  closers.push(() => new Promise(r => server.close(r)));
  return { port, mappings, calls, opts: o };
}
/** A fake SSDP responder that points at `location`. */
async function fakeSsdp(location) {
  const s = dgram.createSocket('udp4');
  const searches = [];
  s.on('message', (msg, r) => {
    const t = msg.toString();
    if (!t.startsWith('M-SEARCH')) return;
    searches.push(t);
    const st = (/ST: (.*)\r\n/.exec(t) || [])[1];
    s.send(Buffer.from(`HTTP/1.1 200 OK\r\nCACHE-CONTROL: max-age=120\r\nST: ${st}\r\nUSN: uuid:fake-igd::${st}\r\nEXT:\r\nSERVER: Fake/1.0 UPnP/1.0\r\nLOCATION: ${location}\r\n\r\n`), r.port, r.address);
  });
  await new Promise(r => s.bind(0, LOOP, r));
  closers.push(() => new Promise(r => s.close(r)));
  return { port: s.address().port, searches };
}
/** A UDP port with nobody behind it. */
async function silentPort() {
  const s = dgram.createSocket('udp4');
  await new Promise(r => s.bind(0, LOOP, r));
  const port = s.address().port;
  s.on('message', () => {});
  closers.push(() => new Promise(r => s.close(r)));
  return port;
}
/** A fake NAT-PMP (mode 'ok' | 'refuse') or PCP-only ('pcp') router. */
async function fakePmp({ mode = 'ok', external = [81, 2, 3, 4] } = {}) {
  const s = dgram.createSocket('udp4');
  const seen = [];
  s.on('message', (m, r) => {
    const b = new Uint8Array(m);
    seen.push([...b]);
    const reply = (arr) => s.send(Buffer.from(arr), r.port, r.address);
    if (mode === 'pcp' && b[0] === 0) return reply([2, 0x80, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);   // UNSUPP_VERSION, in PCP
    if (mode === 'pcp' && b[0] === 2 && b[1] === 1) {
      const out = new Uint8Array(60);
      out[0] = 2; out[1] = 0x81; out[3] = 0;
      out.set(b.subarray(4, 8), 4);
      out.set(b.subarray(24, 36), 24);                 // the nonce
      out[36] = 6; out.set(b.subarray(40, 42), 40); out.set(b.subarray(42, 44), 42);
      out.set([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, ...external], 44);
      return reply([...out]);
    }
    if (b[0] === 0 && b[1] === 0) return reply([0, 128, 0, mode === 'refuse' ? 2 : 0, 0, 0, 0, 9, ...external]);
    if (b[0] === 0 && b[1] === 2) return reply([0, 130, 0, mode === 'refuse' ? 2 : 0, 0, 0, 0, 9, b[4], b[5], b[6], b[7], b[8], b[9], b[10], b[11]]);
  });
  await new Promise(r => s.bind(0, LOOP, r));
  closers.push(() => new Promise(r => s.close(r)));
  return { port: s.address().port, seen };
}
async function mapper({ igd = null, ssdp = null, pmpPort = null, gateways = [] } = {}) {
  const ssdpPort = ssdp ? ssdp.port : await silentPort();
  return createPortMapper({
    udp: createNodeUdp({ bind: LOOP }), http: nodeHttp,
    ssdpTargets: [{ address: LOOP, port: ssdpPort }],
    gateways: () => gateways, clientAddress: () => LOOP, natpmpPort: pmpPort || await silentPort(),
    ssdpMs: 300, httpMs: 1000, natpmpMs: 60,
  });
}

test('packets and messages: SSDP answers, the device description, SOAP faults, NAT-PMP and PCP, what an external address means', () => {
  const r = parseSsdpResponse('HTTP/1.1 200 OK\r\nLocation: http://192.168.1.1:5000/rootDesc.xml\r\nST: urn:schemas-upnp-org:device:InternetGatewayDevice:1\r\n\r\n');
  assert.equal(r.location, 'http://192.168.1.1:5000/rootDesc.xml');
  assert.equal(parseSsdpResponse('HTTP/1.1 404 Not Found\r\n\r\n'), null);
  assert.equal(parseSsdpResponse('HTTP/1.1 200 OK\r\nLOCATION: file:///etc/passwd\r\n\r\n'), null, 'only http(s) locations');
  const s = parseIgdDescription(DESC('/ctl/IPConn'), 'http://192.168.1.1:5000/rootDesc.xml');
  assert.deepEqual({ ...s }, { serviceType: 'urn:schemas-upnp-org:service:WANIPConnection:1', controlUrl: 'http://192.168.1.1:5000/ctl/IPConn' });
  assert.equal(parseIgdDescription('<root><URLBase>http://10.0.0.1:80/</URLBase>' + DESC('ctl').slice(40), 'http://x/').controlUrl, 'http://10.0.0.1/ctl');
  assert.equal(parseIgdDescription('<root><serviceList></serviceList></root>', 'http://x/'), null);
  const q = soapRequest('urn:schemas-upnp-org:service:WANIPConnection:1', 'AddPortMapping', { NewPortMappingDescription: 'a<b&c' });
  assert.match(q.body, /a&lt;b&amp;c/);
  assert.equal(q.headers.SOAPAction, '"urn:schemas-upnp-org:service:WANIPConnection:1#AddPortMapping"');
  const f = parseSoapResponse(500, '<s:Envelope><s:Body><s:Fault><detail><UPnPError><errorCode>718</errorCode><errorDescription>ConflictInMappingEntry</errorDescription></UPnPError></detail></s:Fault></s:Body></s:Envelope>');
  assert.deepEqual([f.ok, f.code, f.description], [false, 718, 'ConflictInMappingEntry']);
  assert.equal(parseSoapResponse(200, '<a:NewExternalIPAddress>1.2.3.4</a:NewExternalIPAddress>').get('NewExternalIPAddress'), '1.2.3.4');
  const m = natpmpMapRequest({ internalPort: 41731, externalPort: 41731, lifetime: 3600 });
  assert.deepEqual([...m], [0, 2, 0, 0, 0xa3, 0x03, 0xa3, 0x03, 0, 0, 0x0e, 0x10]);
  assert.deepEqual({ ...parseNatpmp(Uint8Array.from([0, 130, 0, 0, 0, 0, 0, 1, 0xa3, 3, 0xa3, 4, 0, 0, 0x0e, 0x10])) }, { op: 130, result: 0, internalPort: 41731, externalPort: 41732, lifetime: 3600 });
  assert.equal(parseNatpmp(Uint8Array.from([0, 128, 0, 0, 0, 0, 0, 1, 81, 2, 3, 4])).external, '81.2.3.4');
  const nonce = Uint8Array.from({ length: 12 }, (_, i) => i + 1);
  const p = pcpMapRequest({ clientAddress: '192.168.1.20', internalPort: 41731, externalPort: 41731, lifetime: 7200, nonce });
  assert.equal(p.length, 60); assert.equal(p[0], 2); assert.equal(p[1], 1); assert.deepEqual([...p.subarray(18, 24)], [255, 255, 192, 168, 1, 20]);
  assert.equal(parsePcp(p), null, 'a request is not an answer');
  for (const [ip, want] of [['81.2.3.4', 'public'], ['100.64.1.2', 'cgnat'], ['100.127.255.1', 'cgnat'], ['10.0.0.2', 'private'], ['192.168.0.5', 'private'], ['0.0.0.0', 'invalid'], ['nonsense', 'invalid']]) assert.equal(classifyExternal(ip), want, ip);
});

test('UPnP: found through SSDP, mapped with a lease, renewed, and removed on a clean exit', async () => {
  const igd = await fakeIgd();
  const ssdp = await fakeSsdp(`http://${LOOP}:${igd.port}/desc.xml`);
  const pm = await mapper({ ssdp });
  const r = await pm.map({ internalPort: 41731, lease: 3600 });
  assert.equal(r.ok, true);
  assert.equal(r.method, 'upnp');
  assert.deepEqual({ ...r.external }, { address: '81.2.3.4', port: 41731 });
  assert.equal(r.reachable, true);
  assert.equal(r.lease, 3600);
  assert.ok(ssdp.searches.some(t => t.includes('MAN: "ssdp:discover"') && t.includes('InternetGatewayDevice:1')));
  assert.deepEqual({ ...igd.mappings.get(41731) }, { internalPort: 41731, client: LOOP, protocol: 'TCP', lease: 3600, description: 'OpenDash sync', enabled: '1' });
  await pm.map({ internalPort: 41731, lease: 3600 });
  assert.equal(igd.calls.filter(c => c === 'AddPortMapping').length, 2, 'renewed');
  await pm.unmap();
  assert.equal(igd.mappings.size, 0, 'removed on exit');
  assert.ok(igd.calls.includes('DeletePortMapping'));
});

test('UPnP: a taken port moves on; a router that only takes permanent mappings gets one; a refusal is reported', async () => {
  let igd = await fakeIgd({ conflictPorts: [41731] });
  let r = await (await mapper({ ssdp: await fakeSsdp(`http://${LOOP}:${igd.port}/desc.xml`) })).map({ internalPort: 41731 });
  assert.equal(r.ok, true); assert.equal(r.external.port, 41732);
  assert.equal(igd.mappings.get(41732).internalPort, 41731);
  igd = await fakeIgd({ permanentOnly: true });
  r = await (await mapper({ ssdp: await fakeSsdp(`http://${LOOP}:${igd.port}/desc.xml`) })).map({ internalPort: 41731 });
  assert.equal(r.ok, true); assert.equal(r.lease, 0);
  assert.equal(igd.mappings.get(41731).lease, 0);
  igd = await fakeIgd({ fail: 501 });
  r = await (await mapper({ ssdp: await fakeSsdp(`http://${LOOP}:${igd.port}/desc.xml`) })).map({ internalPort: 41731 });
  assert.deepEqual([r.ok, r.reason, r.code, r.reachable], [false, 'refused', 501, false]);
});

test('carrier-grade NAT or a second router: the mapping is made but reported as not reachable from outside', async () => {
  for (const [external, reason] of [['100.64.12.34', 'cgnat'], ['192.168.0.2', 'double-nat']]) {
    const igd = await fakeIgd({ external });
    const r = await (await mapper({ ssdp: await fakeSsdp(`http://${LOOP}:${igd.port}/desc.xml`) })).map({ internalPort: 41731 });
    assert.equal(r.ok, true);
    assert.equal(r.reachable, false, external);
    assert.equal(r.reason, reason);
  }
});

test('no UPnP: NAT-PMP on the router; PCP when the router answers in PCP; refusals; no router support at all', async () => {
  let pmp = await fakePmp({ mode: 'ok' });
  let pm = await mapper({ pmpPort: pmp.port, gateways: [LOOP] });
  let r = await pm.map({ internalPort: 41731, lease: 3600 });
  assert.equal(r.ok, true); assert.equal(r.method, 'natpmp');
  assert.deepEqual({ ...r.external }, { address: '81.2.3.4', port: 41731 });
  assert.equal(r.reachable, true);
  await pm.unmap();
  const last = pmp.seen[pmp.seen.length - 1];
  assert.deepEqual(last.slice(0, 2), [0, 2]); assert.deepEqual(last.slice(8), [0, 0, 0, 0], 'lifetime 0 removes it');
  pmp = await fakePmp({ mode: 'pcp' });
  pm = await mapper({ pmpPort: pmp.port, gateways: [LOOP] });
  r = await pm.map({ internalPort: 41731, lease: 3600 });
  assert.equal(r.ok, true); assert.equal(r.method, 'pcp');
  assert.deepEqual({ ...r.external }, { address: '81.2.3.4', port: 41731 });
  pmp = await fakePmp({ mode: 'refuse' });
  r = await (await mapper({ pmpPort: pmp.port, gateways: [LOOP] })).map({ internalPort: 41731 });
  assert.deepEqual([r.ok, r.reason], [false, 'refused']);
  r = await (await mapper({ gateways: [LOOP] })).map({ internalPort: 41731 });
  assert.deepEqual([r.ok, r.reason, r.reachable], [false, 'no-router-support', false]);
});
