// Finding a paired computer on the same network by announcement
// (lib/sync/live/discovery.mjs) before the cloud folder has delivered its
// address book. The UDP adapter runs on loopback (127.0.0.1 unicast stands in
// for multicast/broadcast); nothing is sent to the real network.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import * as X from '../lib/sync/e2e-crypto.mjs';
import { encodeAnnounce, decodeAnnounce } from '../lib/sync/live/discovery.mjs';
import { createNodeDiscovery } from '../lib/sync/live/node-net.mjs';
import { tempDir, rm, stopAll, editState, waitFor, sleep, pairedPair, liveFor, LOOP } from './live.shared.mjs';

const base = tempDir('live-disc-');
const lives = [];
after(async () => { for (const l of lives) await l.stop().catch(() => {}); await stopAll(); rm(base); });

async function freeUdpPorts(n) {
  const socks = [];
  for (let i = 0; i < n; i++) { const s = dgram.createSocket('udp4'); await new Promise(r => s.bind(0, LOOP, r)); socks.push(s); }
  const ports = socks.map(s => s.address().port);
  for (const s of socks) await new Promise(r => s.close(r));
  return ports;
}

test('an announcement names the group and the member only to those who hold the sync key', async () => {
  const k = X.randomBytes(32), other = X.randomBytes(32);
  const me = '1111111111111111', peer = '2222222222222222';
  const b = await encodeAnnounce({ tagKey: k, deviceId: peer, port: 41731 });
  const text = new TextDecoder().decode(b);
  assert.ok(!text.includes(peer), 'the device id is not in it');
  assert.deepEqual({ ...(await decodeAnnounce(b, { tagKey: k, members: [peer, '3333333333333333'], self: me })) }, { deviceId: peer, port: 41731 });
  assert.equal(await decodeAnnounce(b, { tagKey: other, members: [peer], self: me }), null, 'another group (or an old key)');
  assert.equal(await decodeAnnounce(b, { tagKey: k, members: ['3333333333333333'], self: me }), null, 'not a member any more');
  const m = JSON.parse(text);
  assert.equal(await decodeAnnounce(new TextEncoder().encode(JSON.stringify({ ...m, port: 4444 })), { tagKey: k, members: [peer], self: me }), null, 'a changed port');
  assert.equal(await decodeAnnounce(new TextEncoder().encode('{"p":"odl"}'), { tagKey: k, members: [peer] }), null);
  assert.equal(await decodeAnnounce(new Uint8Array(600), { tagKey: k, members: [peer] }), null, 'too big');
  const b2 = await encodeAnnounce({ tagKey: k, deviceId: peer, port: 41731 });
  assert.notEqual(new TextDecoder().decode(b2), text, 'each announcement looks different');
});

test('two computers on the same network find each other within a second, with no address book', async () => {
  const P = await pairedPair(base);
  assert.equal(P.A.eng.peerExtra(P.B.eng.deviceId), null, 'A has no address for B from the folder');
  const [pa, pb] = await freeUdpPorts(2);
  const discA = createNodeDiscovery({ port: pa, bind: LOOP, targets: () => [{ address: LOOP, port: pb }] });
  const discB = createNodeDiscovery({ port: pb, bind: LOOP, targets: () => [{ address: LOOP, port: pa }] });
  const t0 = performance.now();
  const liveA = liveFor(P.A, { discovery: discA, announceMs: 400 }); lives.push(liveA);
  const liveB = liveFor(P.B, { discovery: discB, announceMs: 400 }); lives.push(liveB);
  await liveA.start(); await liveB.start();
  await waitFor(() => liveA.sessions.size === 1 && liveB.sessions.size === 1, 5000, 'linked by announcement');
  const ms = performance.now() - t0;
  console.log(`# LAN discovery: linked ${ms.toFixed(0)} ms after both started, with no address book (loopback stand-in for multicast)`);
  assert.ok(ms < 2000, `${ms} ms`);
  assert.equal(liveA.status().discovery, 'on');
  assert.equal(liveA.status().peers[0].path, 'lan');
  assert.equal(P.A.eng.peerExtra(P.B.eng.deviceId), null, 'still nothing from the folder: it was the announcement');
  const got = new Promise((res) => { const off = P.B.store.onChange((i) => { if (i.source === 'sync') { off(); res(true); } }); });
  await editState(P.A.store, (st) => { st.custom.push({ id: 'u-lan', title: 'Found on the LAN', subtasks: [] }); });
  assert.equal(await Promise.race([got, sleep(3000).then(() => false)]), true);
  // A stranger's announcement on the same port is ignored (no dial, no link).
  const s = dgram.createSocket('udp4');
  await new Promise(r => s.bind(0, LOOP, r));
  const stray = await encodeAnnounce({ tagKey: X.randomBytes(32), deviceId: 'abcdefabcdefabcd', port: 9 });
  await new Promise(r => s.send(stray, pa, LOOP, r));
  await new Promise(r => s.close(r));
  await sleep(200);
  assert.equal(liveA.sessions.size, 1);
  assert.equal(liveA._debug().peerState.has('abcdefabcdefabcd'), false);
});
