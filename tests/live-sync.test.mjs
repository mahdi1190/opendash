// Live sync end to end (lib/sync/live/ with the real engine, real encrypted
// sync and real TCP on 127.0.0.1): two paired computers, each with its own
// cloud folder that only moves when the test copies it. An edit shows on the
// other computer within milliseconds over the live link; the same record
// arriving again through the folder (or twice live) changes nothing; a
// computer that restarts on a new address is found again from its address
// book and catches up; a device that was never paired is refused on the real
// port; the "main computer" lease moves when the holder goes away; a device
// removed from sync is cut off at once.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as X from '../lib/sync/e2e-crypto.mjs';
import { SYNC_DIR_NAME } from '../lib/sync/folder.mjs';
import { createNodeNet, wrapSocket } from '../lib/sync/live/node-net.mjs';
import { createSession } from '../lib/sync/live/session.mjs';
import { staticAuth } from '../lib/sync/live/handshake.mjs';
import { tempDir, rm, stopAll, editState, waitFor, sleep, titles, pairedPair, liveFor, listenOnly, LOOP } from './live.shared.mjs';
import net from 'node:net';

const base = tempDir('live-sync-');
const lives = [];
after(async () => { for (const l of lives) await l.stop().catch(() => {}); await stopAll(); rm(base); });

let P, liveA, liveB;
const titleOf = async (d, id) => ((await d.store.readObject()).custom || []).find(t => t.id === id)?.title;
/** Resolves when `store` commits a change made by sync (the moment B's data has it). */
const nextSyncCommit = (store) => new Promise((res) => { const off = store.onChange((i) => { if (i && i.source === 'sync') { off(); res(performance.now()); } }); });
const startLive = async (dev, opts) => { const l = liveFor(dev, opts); lives.push(l); await l.start(); return l; };

test('two paired computers find each other from the address book and open one authenticated link', async () => {
  P = await pairedPair(base);
  liveA = await startLive(P.A);
  // B ("Work laptop") cannot dial out: A has to reach it, through its published address.
  liveB = await startLive(P.B, { net: listenOnly(createNodeNet()) });
  await waitFor(() => liveB.port && liveA.port, 3000, 'both listening');
  assert.ok(liveA.status().listening && liveB.status().listening);
  await waitFor(async () => { await P.B.eng.syncNow(); return !!JSON.parse(JSON.stringify(P.B.eng.status())).live; }, 3000, 'B publishes');
  await sleep(150);
  await P.B.eng.syncNow();                                 // B's device.json carries its encrypted address book now
  P.oneDrive('b->a');
  await P.A.eng.syncNow();                                 // A reads it
  await waitFor(() => liveA.sessions.size === 1 && liveB.sessions.size === 1, 5000, 'a live link');
  const a = liveA.status(), b = liveB.status();
  assert.equal(a.peers.length, 1);
  assert.equal(a.peers[0].state, 'live');
  assert.equal(a.peers[0].path, 'lan', '127.0.0.1 counts as the same network');
  assert.equal(a.peers[0].name, 'Work laptop');
  assert.equal(b.peers[0].name, 'Home laptop');
  assert.equal(P.A.eng.status().live.peers[0].state, 'live', 'the engine status carries it (Settings > Sync)');
  // Nothing about the link is in the folder in the clear.
  const devFolder = join(P.cloudA, SYNC_DIR_NAME, 'devices', P.B.eng.deviceId);
  const dj = readFileSync(join(devFolder, 'device.json'), 'utf8');
  assert.ok(!dj.includes(String(liveB.port)), 'the port is inside the encrypted part');
  assert.ok(!dj.includes('127.0.0.1'));
});

test('an edit on one computer is on the other within 200 ms over the live link (the folder never moves)', async () => {
  const lat = [];
  for (let i = 0; i < 12; i++) {
    const title = `Live edit ${i}`;
    const got = nextSyncCommit(P.B.store);
    const t0 = performance.now();
    await editState(P.A.store, (st) => { st.custom.find(t => t.id === 'u-1').title = title; });
    const t1 = await Promise.race([got, sleep(3000).then(() => null)]);
    assert.ok(t1, `edit ${i} did not arrive`);
    assert.equal(await titleOf(P.B, 'u-1'), title);
    lat.push(t1 - t0);
    await sleep(120);                    // about the pace of someone working
  }
  // ...and the other way.
  const back = nextSyncCommit(P.A.store);
  const t0 = performance.now();
  await editState(P.B.store, (st) => { st.custom.push({ id: 'u-w', title: 'Written at work', subtasks: [] }); });
  const t1 = await Promise.race([back, sleep(3000).then(() => null)]);
  assert.ok(t1, 'B -> A');
  lat.push(t1 - t0);
  assert.equal(await titleOf(P.A, 'u-w'), 'Written at work');
  const sorted = [...lat].sort((x, y) => x - y);
  const median = sorted[Math.floor(sorted.length / 2)];
  console.log(`# live push latency on loopback: median ${median.toFixed(1)} ms, min ${sorted[0].toFixed(1)} ms, max ${sorted[sorted.length - 1].toFixed(1)} ms over ${lat.length} edits (edit committed on one -> committed on the other)`);
  assert.ok(median < 200, `median ${median} ms`);
  assert.ok(sorted[sorted.length - 2] < 400, `nearly all under 400 ms: ${sorted.map(x => x.toFixed(0))}`);
  assert.ok(P.B.eng.status().liveIn.received >= 12, 'B took them from the live link');
  assert.equal(P.B.eng.status().liveIn.refused, 0);
});

test('the same record again through the folder, or twice over the link, is taken once and changes nothing', async () => {
  const before = P.B.eng.status();
  const v0 = (await P.B.store.readObject())._lastSave;
  const dup0 = before.e2e.duplicates;
  P.oneDrive('a->b');
  await P.B.eng.syncNow();
  const after1 = P.B.eng.status();
  assert.ok(after1.e2e.duplicates - dup0 >= 12, `the folder copies were recognised (${after1.e2e.duplicates - dup0})`);
  assert.equal((await P.B.store.readObject())._lastSave, v0, 'no new write');
  assert.deepEqual(after1.lastApply, before.lastApply, 'nothing applied');
  // A record delivered live a second time (a replay over a link).
  const dir = join(P.cloudA, SYNC_DIR_NAME, 'devices', P.A.eng.deviceId);
  const log = readdirSync(dir).filter(n => /^ops-/.test(n)).sort().pop();
  const lines = readFileSync(join(dir, log), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const ld0 = P.B.eng.status().liveIn.duplicates;
  assert.equal(P.B.eng.deliverLive(lines.slice(-3).map(rec => ({ file: log, rec })), P.A.eng.deviceId), true);
  await waitFor(() => P.B.eng.status().liveIn.duplicates - ld0 >= 3, 3000, 'live duplicates counted');
  assert.equal((await P.B.store.readObject())._lastSave, v0);
  // A record from A presented as if it came from another device, or under the wrong file name, is refused.
  const lr0 = P.B.eng.status().liveIn.refused;
  P.B.eng.deliverLive([{ file: log, rec: lines[lines.length - 1] }], 'f'.repeat(16));
  P.B.eng.deliverLive([{ file: 'ops-20000101.jsonl', rec: { ...lines[lines.length - 1], n: lines[lines.length - 1].n + 1000 } }], P.A.eng.deviceId);
  await waitFor(() => P.B.eng.status().liveIn.refused - lr0 >= 2, 3000, 'refusals counted');
  assert.equal((await P.B.store.readObject())._lastSave, v0);
});

test('a computer that restarts on a new address: found again from its address book, and it catches up on what it missed', async () => {
  await liveB.stop();
  await waitFor(() => liveA.sessions.size === 0, 3000, 'A notices');
  const oldPort = P.A.eng.peerExtra(P.B.eng.deviceId).live.port;
  for (let i = 1; i <= 3; i++) await editState(P.A.store, (st) => { st.custom.push({ id: `u-miss-${i}`, title: `Missed ${i}`, subtasks: [] }); });
  await P.A.eng.syncNow();
  liveB = await startLive(P.B, { net: listenOnly(createNodeNet()) });
  await waitFor(() => liveB.port, 3000);
  assert.notEqual(liveB.port, oldPort, 'a new port: the old address is gone');
  await sleep(400);
  assert.equal(liveA.sessions.size, 0, 'A cannot reach B at the old address');
  assert.equal(liveA.status().peers[0].state === 'live', false);
  await P.B.eng.syncNow();
  await sleep(100);
  await P.B.eng.syncNow();
  P.oneDrive('b->a');                                    // only B's files move: A's changes stay out of B's folder
  const t0 = performance.now();
  await P.A.eng.syncNow();
  await waitFor(() => liveA.sessions.size === 1, 5000, 'A dials the new address');
  const reconnectMs = performance.now() - t0;
  await waitFor(async () => (await titles(P.B)).includes('Missed 3'), 3000, 'the catch-up');
  console.log(`# address change: link back ${reconnectMs.toFixed(0)} ms after the new address book arrived; 3 missed edits caught up over the link`);
  assert.ok((await titles(P.B)).includes('Missed 1'));
  // A restarts: B cannot dial, A's address book of B is still right, so A is back at once.
  await liveA.stop();
  const t1 = performance.now();
  liveA = await startLive(P.A);
  await waitFor(() => liveA.sessions.size === 1 && liveB.sessions.size === 1, 5000, 'back after A restarts');
  console.log(`# peer restart: link back ${(performance.now() - t1).toFixed(0)} ms after it started again`);
  const back = nextSyncCommit(P.A.store);
  await editState(P.B.store, (st) => { st.custom.find(t => t.id === 'u-w').title = 'After the restart'; });
  assert.ok(await Promise.race([back, sleep(3000).then(() => null)]));
  assert.equal(await titleOf(P.A, 'u-w'), 'After the restart');
});

test('on the real port: a device that was never paired is refused and learns nothing', async () => {
  const kp = await X.newKeyPair();
  const C = { ...kp, deviceId: await X.deviceIdOf(kp.pub) };
  const bPub = (await P.B.secrets.get('sync-e2e')).identity.pub;
  const auth = staticAuth({ identity: C, group: P.B.eng.e2e.group, kid: P.B.eng.e2e.currentKid, psk: X.randomBytes(32), members: { [P.B.eng.deviceId]: bPub } });
  const refused0 = liveB.status().stats.refusedPeers;
  const sock = net.connect({ host: LOOP, port: liveB.port });
  await new Promise((r, j) => { sock.once('connect', r); sock.once('error', j); });
  const ev = { open: false, why: null };
  createSession({ conn: wrapSocket(sock), role: 'initiator', auth, peerId: P.B.eng.deviceId, onOpen: () => { ev.open = true; }, onClose: (w) => { ev.why = w; } });
  await waitFor(() => ev.why, 3000, 'closed');
  assert.equal(ev.open, false);
  await waitFor(() => liveB.status().stats.refusedPeers > refused0, 2000, 'B counts it');
  // Junk on the port is dropped too.
  const s2 = net.connect({ host: LOOP, port: liveB.port });
  await new Promise((r) => s2.once('connect', r));
  s2.write('GET / HTTP/1.1\r\nHost: x\r\n\r\n');
  await new Promise((r) => { s2.once('close', r); setTimeout(r, 6000); });
  assert.equal(s2.destroyed || s2.readyState === 'closed', true, 'the line was closed');
  assert.equal(liveB.sessions.size, 1, 'the real link is untouched');
});

test('the main computer for a job: one at a time, it moves when the holder goes away, and the other does not snatch it back', async () => {
  const roleOf = (l) => l.status().roles.find(r => r.role === 'phone');
  await waitFor(() => (liveA.isMain('phone') !== liveB.isMain('phone')), 5000, 'one main computer');
  const holder = liveA.isMain('phone') ? 'a' : 'b';
  const [H, O] = holder === 'a' ? [liveA, liveB] : [liveB, liveA];
  const other = holder === 'a' ? P.B : P.A;
  await waitFor(() => roleOf(O).deviceId && roleOf(O).deviceId === roleOf(H).deviceId, 3000, 'both name the same device').catch((e) => { console.log('# lease state', JSON.stringify([roleOf(H), roleOf(O), H.leases.ready, O.leases.ready])); throw e; });
  assert.equal(roleOf(O).name, holder === 'a' ? 'Home laptop' : 'Work laptop');
  for (let i = 0; i < 10; i++) { assert.ok(!(liveA.isMain('phone') && liveB.isMain('phone')), 'never both'); await sleep(50); }
  // The holder stops (sleep, shut down): after its short claim runs out, the other takes over.
  if (H === liveA) { await liveA.stop(); } else { await liveB.stop(); }
  await waitFor(() => O.isMain('phone'), 5000, 'takeover');
  assert.equal(roleOf(O).deviceId, other.eng.deviceId);
  // It comes back: the job stays where it is (no preference set), and never with two holders.
  const back = await startLive(holder === 'a' ? P.A : P.B, holder === 'a' ? {} : { net: listenOnly(createNodeNet()) });
  if (holder === 'a') liveA = back; else liveB = back;
  // (B cannot dial: when B restarted on a new port, A needs B's new address book from the folder.)
  await waitFor(async () => {
    if (liveA.sessions.size === 1 && liveB.sessions.size === 1) return true;
    if (holder === 'b') { await P.B.eng.syncNow(); P.oneDrive('b->a'); await P.A.eng.syncNow(); }
    return false;
  }, 5000, 'linked again');
  for (let i = 0; i < 20; i++) { assert.ok(!(liveA.isMain('phone') && liveB.isMain('phone')), 'never both'); await sleep(50); }
  assert.equal(O.isMain('phone'), true, 'still the one that took over');
  // "Home laptop first": the preference moves it back, cleanly.
  await liveB.configure({ prefer: [P.A.eng.deviceId, P.B.eng.deviceId] });
  await waitFor(() => liveA.isMain('phone') && !liveB.isMain('phone'), 5000, 'the preferred computer');
  assert.deepEqual(liveA.status().prefs, [P.A.eng.deviceId, P.B.eng.deviceId], 'the preference reached the other computer');
  // The engine's fetcher check follows the lease for an account role (none here): unchanged answer for unknown jobs.
  assert.equal(await P.A.eng.isFetcher('bank'), true);
});

test('a device removed from sync is cut off at once: the link closes and nothing more from it is taken', async () => {
  assert.equal(liveA.sessions.size, 1);
  const bId = P.B.eng.deviceId;
  await P.A.eng.removeDevice(bId);
  await waitFor(() => liveA.sessions.size === 0, 3000, 'link closed');
  const v0 = (await P.A.store.readObject())._lastSave;
  await editState(P.B.store, (st) => { st.custom.push({ id: 'u-after', title: 'After removal', subtasks: [] }); });
  await sleep(800);
  assert.equal(liveA.sessions.size, 0, 'it cannot get back in');
  assert.equal((await P.A.store.readObject())._lastSave, v0);
  assert.ok(!(await titles(P.A)).includes('After removal'));
});
