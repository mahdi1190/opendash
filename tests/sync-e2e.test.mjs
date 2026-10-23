// Encrypted folder sync end to end (lib/sync/e2e.mjs in the engine, real
// files in a temp folder): the first computer and its recovery code, joining
// with the code, "Approve on your other computer" with matching and
// mismatching 6-digit codes, the phone QR offer, renaming, removing a device
// (a new key; the removed one reads nothing new and its later changes are
// refused), and moving from unencrypted (v 1) sync.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, existsSync, readFileSync, appendFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as X from '../lib/sync/e2e-crypto.mjs';
import { SYNC_DIR_NAME } from '../lib/sync/folder.mjs';
import { tempDir, rm, editState, stopAll, makeE2EDevice, memorySecrets, settle, folderFiles, devFile, titles } from './sync-e2e.shared.mjs';

const base = tempDir('sync-e2e-');
const cloud = join(base, 'cloud');
mkdirSync(cloud);
after(async () => { await stopAll(); rm(base); });

let A, B, C, code;

test('first computer: an encrypted group and a recovery code shown once; another computer joins with the code', async () => {
  A = makeE2EDevice(base, 'a', { state: { custom: [{ id: 'u-1', title: 'Write the secret report', subtasks: [] }], statuses: { 'u-1': 'doing' } } });
  await A.eng.start();
  const r = await A.eng.setupFirst({ folder: cloud, deviceName: 'Work laptop', apply: true });
  code = r.recoveryCode;
  assert.match(code, /^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(r.e2e.on, true);
  assert.equal(r.e2e.ready, true);
  assert.equal(r.e2e.epoch, 1);
  assert.equal(A.eng.status().recoveryCode, undefined, 'the code is not part of the status');
  await A.eng.syncNow();
  assert.equal(A.eng.deviceId, await X.deviceIdOf((await A.secrets.get('sync-e2e')).identity.pub), 'the device id is the key fingerprint');
  await assert.rejects(() => A.eng.setupFirst({ folder: cloud }), { code: 'ALREADY_ON' });

  B = makeE2EDevice(base, 'b', { state: { custom: [{ id: 'u-b', title: 'Only on B', subtasks: [] }] } });
  await B.eng.start();
  await assert.rejects(() => B.eng.setupFirst({ folder: cloud }), { code: 'GROUP_EXISTS' }, '"first computer" on a folder that already has one is refused');
  await B.eng.joinExisting({ folder: cloud, deviceName: 'Home PC', apply: true });
  await B.eng.syncNow();
  let s = B.eng.status();
  assert.equal(s.state, 'locked');
  assert.equal(s.e2e.reason, 'not-joined');
  assert.equal(s.e2e.found.groups, 1);
  assert.match(s.message, /Found your OpenDash sync/);
  assert.equal(s.devices.filter(d => !d.me).length, 0, 'no names are readable before joining');
  await assert.rejects(() => B.eng.joinWithRecovery('ABCD-EFGH'), /32 letters and numbers/);
  await assert.rejects(() => B.eng.joinWithRecovery(X.encodeRecoveryCode(new Uint8Array(15))), { code: 'WRONG_CODE' });
  s = await B.eng.joinWithRecovery(code.toLowerCase().replace(/-/g, ' '));
  assert.equal(s.e2e.ready, true);
  await settle([A, B]);
  assert.deepEqual(await titles(B), ['Only on B', 'Write the secret report']);
  assert.deepEqual(await titles(A), ['Only on B', 'Write the secret report'], "what only the joining computer had is added");
  await editState(B.store, st => { st.custom.find(t => t.id === 'u-1').title = 'Write the final report'; });
  await settle([A, B]);
  assert.equal((await A.store.readObject()).custom.find(t => t.id === 'u-1').title, 'Write the final report');
  assert.ok(A.eng.status().devices.some(d => !d.me && d.name === 'Home PC'), 'names are decrypted on the other side');
  assert.ok(B.eng.status().devices.some(d => !d.me && d.name === 'Work laptop'));

  // Nothing in the shared folder is readable: no task text, no device name, no key, no code.
  const all = folderFiles(cloud).map(f => f.text).join('\n');
  const keyA = Object.values((await A.secrets.get('sync-e2e')).keys)[0].k;
  for (const secret of ['secret report', 'final report', 'Only on B', 'Work laptop', 'Home PC', 'doing', code, code.replace(/-/g, ''), keyA]) assert.ok(!all.includes(secret), `the folder holds "${secret}"`);
  assert.ok(readdirSync(A.secretsDir).includes('sync-e2e.json'), 'the key is in the secret store');
  assert.ok(readFileSync(join(A.secretsDir, 'sync-e2e.json'), 'utf8').includes(keyA));
  for (const f of folderFiles(cloud).filter(f => /\.jsonl$/.test(f.rel))) {
    for (const line of f.text.split('\n').filter(Boolean)) {
      const o = JSON.parse(line);
      assert.deepEqual(Object.keys(o).sort(), ['dev', 'enc', 'n', 'v'], 'a log line is {v, dev, n, enc}');
      assert.equal(o.v, 2);
    }
  }
});

test('approve on the other computer: both show the same 6 digits; once both say so, the new computer has the key', async () => {
  C = makeE2EDevice(base, 'c', { state: { custom: [] } });
  await C.eng.start();
  await C.eng.joinExisting({ folder: cloud, deviceName: 'Kitchen laptop', apply: true });
  let c = await C.eng.pairStart();
  assert.equal(c.e2e.pairing.step, 'waiting');
  assert.match(c.message, /finish uploading this computer's request/);
  await A.eng.syncNow();
  let a = A.eng.status();
  assert.equal(a.e2e.requests.length, 1);
  assert.equal(a.e2e.requests[0].name, 'Kitchen laptop');
  a = await A.eng.pairRespond(a.e2e.requests[0].sid);
  assert.equal(a.e2e.pairing.step, 'waiting');
  await C.eng.syncNow();
  c = C.eng.status();
  assert.equal(c.e2e.pairing.step, 'compare');
  assert.match(c.e2e.pairing.code, /^\d{6}$/);
  await A.eng.syncNow();
  a = A.eng.status();
  assert.equal(a.e2e.pairing.step, 'compare');
  assert.equal(a.e2e.pairing.code, c.e2e.pairing.code, 'the same 6 digits on both screens');
  assert.ok(!folderFiles(cloud).some(f => f.text.includes(c.e2e.pairing.code)), 'the code never travels');
  await C.eng.pairConfirm(c.e2e.pairing.sid, true);
  assert.equal(C.eng.status().e2e.ready, false, 'nothing until the other computer sends the key');
  await A.eng.pairConfirm(a.e2e.pairing.sid, true);
  assert.equal(A.eng.status().e2e.pairing.step, 'sent');
  c = await (async () => { await C.eng.syncNow(); return C.eng.status(); })();
  assert.equal(c.e2e.ready, true);
  await settle([A, B, C]);
  assert.deepEqual(await titles(C), await titles(A));
  assert.equal(A.eng.status().e2e.pairing.step, 'done');
  assert.deepEqual(B.eng.status().devices.map(d => d.name).sort(), ['Home PC', 'Kitchen laptop', 'Work laptop'], 'B learns of C from the member list');
});

test('"they do not match" on either computer: no key is sent, the new computer stays out', async () => {
  for (const side of ['new', 'old']) {
    const D = makeE2EDevice(base, `d-${side}`, { state: { custom: [] }, secrets: memorySecrets() });
    await D.eng.start();
    await D.eng.joinExisting({ folder: cloud, deviceName: `Stranger ${side}`, apply: true });
    let d = await D.eng.pairStart();
    await A.eng.syncNow();
    const req = A.eng.status().e2e.requests.find(r => r.name === `Stranger ${side}`);
    await A.eng.pairRespond(req.sid);
    await D.eng.syncNow(); await A.eng.syncNow();
    d = D.eng.status();
    const a = A.eng.status();
    assert.equal(d.e2e.pairing.step, 'compare'); assert.equal(a.e2e.pairing.step, 'compare');
    if (side === 'new') {
      await D.eng.pairConfirm(d.e2e.pairing.sid, false);
      await A.eng.syncNow();
      assert.equal(A.eng.status().e2e.pairing.step, 'declined');
      await assert.rejects(() => A.eng.pairConfirm(a.e2e.pairing.sid, true), { code: 'NOT_YET' }, 'cannot send once the other side said no');
    } else {
      await A.eng.pairConfirm(a.e2e.pairing.sid, false);
      await D.eng.pairConfirm(d.e2e.pairing.sid, true);       // even if the new side says yes
      await D.eng.syncNow();
      assert.equal(D.eng.status().e2e.pairing.step, 'declined');
    }
    await settle([A, D]);
    assert.equal(D.eng.status().e2e.ready, false);
    assert.equal(D.eng.status().e2e.reason, 'not-joined');
    assert.deepEqual(await titles(D), []);
    const pj = existsSync(devFile(cloud, A.eng.deviceId, 'pair.json')) ? JSON.parse(readFileSync(devFile(cloud, A.eng.deviceId, 'pair.json'), 'utf8')) : null;
    assert.ok(!(pj && pj.approve && pj.approve.wrap), 'no key wrap was written');
    await D.eng.stop();
  }
});

test('scan with your phone: a one-time offer that only the code on the screen opens', async () => {
  const o = await A.eng.makeOffer();
  const text = o.offer.text;
  assert.match(text, /^opendash-join:1:[0-9a-f]{16}:[0-9a-f]{16}:[0-9a-f]{8}:[A-Za-z0-9_-]{22}$/);
  const secretPart = text.split(':').pop();
  assert.ok(!folderFiles(cloud).some(f => f.text.includes(secretPart)), 'the secret is only on the screen');
  const P = makeE2EDevice(base, 'phone', { state: { custom: [] }, background: false, secrets: memorySecrets(), kind: 'phone' });
  await P.eng.start();
  await P.eng.joinExisting({ folder: cloud, deviceName: 'Phone', apply: true });
  await assert.rejects(() => P.eng.joinWithOffer(text.slice(0, -22) + 'A'.repeat(22)), { code: 'BAD_OFFER' }, 'a wrong secret opens nothing');
  await assert.rejects(() => P.eng.joinWithOffer('hello'), { code: 'BAD_OFFER' });
  await P.eng.joinWithOffer(text);
  await settle([A, B, C, P]);
  assert.deepEqual(await titles(P), await titles(A));
  assert.equal(A.eng.status().e2e.offer, null, 'used once, the offer is gone');
  const ph = A.eng.status().devices.find(d => d.name === 'Phone');
  assert.ok(ph);
  assert.equal(ph.kind, 'phone');
  assert.equal(await P.eng.isFetcher('ai-brief'), false, 'the phone leaves background jobs to a computer');
  await P.eng.removeDevice(ph.id).catch((e) => assert.equal(e.code, 'BAD_DEVICE', 'a device cannot remove itself'));
  await A.eng.removeDevice(ph.id);
  await settle([A, B, C, P]);
  await P.eng.stop();
});

test('rename another device: it takes the name', async () => {
  await A.eng.renameDevice(B.eng.deviceId, 'Study PC');
  await settle([A, B, C]);
  assert.equal(B.eng.status().deviceName, 'Study PC');
  assert.ok(C.eng.status().devices.some(d => d.name === 'Study PC'));
  assert.ok(A.eng.status().devices.find(d => d.me).name === 'Work laptop');
});

test('remove a device: a new key for the others; the removed one reads nothing new, and what it writes later is refused', async () => {
  const e0 = A.eng.status().e2e.epoch;
  const cId = C.eng.deviceId;
  assert.ok(A.eng.status().devices.some(d => d.id === cId));
  // C is the main computer for a mail account.
  writeFileSync(join(A.data, 'accounts.json'), JSON.stringify({ v: 1, accounts: [{ id: 'acc-home', provider: 'outlook', email: 'alex@example.com', label: 'Home mail' }] }));
  await A.eng.setFetcher('acc-home', cId);
  await settle([A, B, C]);
  assert.equal(B.eng.fetcher('acc-home').deviceId, cId);
  assert.deepEqual(A.eng.status().devices.find(d => d.id === cId).fetches, ['Home mail'], 'the list says which device is main computer');
  await A.eng.removeDevice(cId);
  assert.equal(A.eng.fetcher('acc-home').deviceId, null, 'a removed device is no longer main computer for anything');
  assert.equal(A.eng.status().e2e.epoch, e0 + 1);
  assert.ok(!A.eng.status().devices.some(d => d.id === cId), 'gone from the list');
  await settle([A, B, C]);
  assert.equal(B.eng.status().e2e.epoch, e0 + 1, 'B has the new key');
  assert.equal(B.eng.fetcher('acc-home').deviceId, null);
  const cs = C.eng.status();
  assert.equal(cs.e2e.reason, 'removed');
  assert.match(cs.message, /was removed from sync by Work laptop/);
  const cKeys = Object.values((await C.secrets.get('sync-e2e')).keys);
  assert.ok(!cKeys.some(k => k.n === e0 + 1), 'C never received the new key');

  await editState(A.store, st => { st.custom.push({ id: 'u-2', title: 'After the removal', subtasks: [] }); });
  await settle([A, B, C]);
  assert.ok((await titles(B)).includes('After the removal'));
  assert.ok(!(await titles(C)).includes('After the removal'));
  // C still has the folder (OneDrive is signed in on it) and its old key: nothing written after the removal opens with it.
  const fresh = folderFiles(cloud).filter(f => f.rel.startsWith(`devices/${A.eng.deviceId}/ops-`)).flatMap(f => f.text.split('\n').filter(Boolean).map(l => ({ f, o: JSON.parse(l) })));
  const last = fresh[fresh.length - 1];
  const group = (await A.secrets.get('sync-e2e')).group;
  for (const k of cKeys) {
    const got = await X.openJson(await X.aesKey(X.unb64u(k.k)), last.o.enc, X.recordAad({ kind: 'log', group, dev: A.eng.deviceId, file: last.f.rel.split('/').pop(), seq: last.o.n, kid: last.o.enc.k }));
    assert.equal(got, null);
  }
  // ...and a change it makes with the old key now is refused by the others.
  const oldKid = Object.entries((await C.secrets.get('sync-e2e')).keys).sort((x, y) => y[1].n - x[1].n)[0];
  const file = `ops-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.jsonl`;
  const n = 9000;
  const h = `${String(Date.now() + 1000).padStart(15, '0')}.00000.${cId}`;
  const enc = await X.sealJson(await X.aesKey(X.unb64u(oldKid[1].k)), { h, s: {}, w: [[['custom', 'u-1', 'title'], 'Hijacked by the old laptop']], x: [] }, X.recordAad({ kind: 'log', group, dev: cId, file, seq: n, kid: oldKid[0] }));
  appendFileSync(devFile(cloud, cId, file), JSON.stringify({ v: 2, dev: cId, n, enc: { k: oldKid[0], ...enc } }) + '\n');
  const refusedBefore = B.eng.status().e2e.refused;
  await settle([A, B]);
  assert.notEqual((await A.store.readObject()).custom.find(t => t.id === 'u-1').title, 'Hijacked by the old laptop');
  assert.notEqual((await B.store.readObject()).custom.find(t => t.id === 'u-1').title, 'Hijacked by the old laptop');
  assert.ok(B.eng.status().e2e.refused > refusedBefore, 'counted as refused');
  // The two that remain still sync.
  await editState(B.store, st => { st.custom.find(t => t.id === 'u-2').title = 'After the removal, edited'; });
  await settle([A, B]);
  assert.ok((await titles(A)).includes('After the removal, edited'));
});

test('the removed computer can come back with the recovery code, as a new device', async () => {
  const oldId = C.eng.deviceId;
  await C.eng.joinWithRecovery(code);
  await settle([A, B, C]);
  assert.notEqual(C.eng.deviceId, oldId, 'a new identity');
  assert.equal(C.eng.status().e2e.ready, true);
  assert.ok((await titles(C)).includes('After the removal, edited'), 'it reads again');
  assert.ok(A.eng.status().devices.some(d => d.id === C.eng.deviceId));
});

test('a removed computer can also be approved again by pairing (as a new device)', async () => {
  const D = makeE2EDevice(base, 'again', { state: { custom: [] }, secrets: memorySecrets() });
  await D.eng.start();
  await D.eng.joinExisting({ folder: cloud, deviceName: 'Spare laptop', apply: true });
  await D.eng.joinWithRecovery(code);
  await settle([A, B, C, D]);
  const old = D.eng.deviceId;
  await A.eng.removeDevice(old);
  await settle([A, B, C, D]);
  assert.equal(D.eng.status().e2e.reason, 'removed');
  await D.eng.pairStart();
  await D.eng.syncNow();
  assert.notEqual(D.eng.deviceId, old, 'it asks under a new id');
  await A.eng.syncNow();
  const req = A.eng.status().e2e.requests.find(r => r.deviceId === D.eng.deviceId);
  assert.ok(req, 'the request is shown');
  await A.eng.pairRespond(req.sid);
  await D.eng.syncNow(); await A.eng.syncNow();
  const dp = D.eng.status().e2e.pairing, ap = A.eng.status().e2e.pairing;
  assert.equal(dp.code, ap.code);
  await D.eng.pairConfirm(dp.sid, true);
  await A.eng.pairConfirm(ap.sid, true);
  await settle([A, B, C, D]);
  assert.equal(D.eng.status().e2e.ready, true);
  assert.deepEqual(await titles(D), await titles(A));
  await D.eng.stop();
});

test('a new recovery code: the old one stops opening new keys', async () => {
  const r = await A.eng.newRecoveryCode();
  assert.notEqual(r.recoveryCode, code);
  await settle([A, B, C]);
  const E = makeE2EDevice(base, 'e', { state: { custom: [] }, secrets: memorySecrets() });
  await E.eng.start();
  await E.eng.joinExisting({ folder: cloud, deviceName: 'Spare', apply: true });
  await assert.rejects(() => E.eng.joinWithRecovery(code), (e) => ['WRONG_CODE', 'OLD_CODE'].includes(e.code), 'the old code no longer opens the newest key');
  assert.equal(E.eng.status().e2e.ready, false);
  await E.eng.joinWithRecovery(r.recoveryCode);
  await settle([A, E]);
  assert.deepEqual(await titles(E), await titles(A));
  await E.eng.stop();
});

test('moving from unencrypted sync (v 1): data kept under a new id, the plain files go, the other computer joins', async () => {
  const cloud2 = join(base, 'cloud-v1');
  mkdirSync(cloud2);
  const P = makeE2EDevice(base, 'v1p', { state: { custom: [{ id: 'u-9', title: 'Old plain task', subtasks: [] }] } });
  const Q = makeE2EDevice(base, 'v1q', { state: { custom: [] } });
  await P.eng.start(); await P.eng.configure({ enabled: true, apply: true, folder: cloud2, deviceName: 'Desk' });
  await Q.eng.start(); await Q.eng.configure({ enabled: true, apply: true, folder: cloud2, deviceName: 'Laptop' });
  await settle([P, Q]);
  assert.deepEqual(await titles(Q), ['Old plain task']);
  assert.ok(folderFiles(cloud2).some(f => f.text.includes('Old plain task')), 'v 1 is plain');
  const oldP = P.eng.deviceId, oldQ = Q.eng.deviceId;

  const r = await P.eng.encrypt();
  assert.ok(r.recoveryCode);
  assert.notEqual(P.eng.deviceId, oldP);
  await settle([P, Q]);
  assert.ok(!existsSync(join(cloud2, SYNC_DIR_NAME, 'devices', oldP)), "P's unencrypted folder is gone");
  assert.deepEqual(await titles(P), ['Old plain task'], 'P kept its data');
  assert.match(Q.eng.status().message, /now encrypts the synced data/);
  // Q's plain changes are not taken in by P any more.
  await editState(Q.store, st => { st.custom[0].title = 'Plain edit'; });
  await settle([P, Q]);
  assert.equal((await P.store.readObject()).custom[0].title, 'Old plain task');
  assert.match(P.eng.status().message, /still syncs without encryption/);

  const q = await Q.eng.encrypt();
  assert.equal(q.recoveryCode, null, 'a group exists: Q joins it');
  await Q.eng.syncNow();
  assert.equal(Q.eng.status().e2e.reason, 'not-joined');
  await Q.eng.joinWithRecovery(r.recoveryCode);
  await settle([P, Q]);
  assert.equal((await P.store.readObject()).custom[0].title, 'Plain edit', "Q's edit made while it was locked out arrives once it joins");
  await editState(P.store, st => { st.custom.push({ id: 'u-10', title: 'Encrypted task', subtasks: [] }); });
  await settle([P, Q]);
  assert.ok((await titles(Q)).includes('Encrypted task'));
  assert.ok(!existsSync(join(cloud2, SYNC_DIR_NAME, 'devices', oldQ)), "Q's unencrypted folder is gone");
  const all = folderFiles(cloud2).map(f => f.text).join('\n');
  for (const s of ['Old plain task', 'Plain edit', 'Encrypted task', 'Desk', 'Laptop']) assert.ok(!all.includes(s), `nothing plain is left: ${s}`);
  await P.eng.stop(); await Q.eng.stop();
});
