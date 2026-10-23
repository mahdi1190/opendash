// Encrypted sync against a MALICIOUS FOLDER: an attacker who can read and
// write every file in the shared folder (the cloud provider, or someone with
// a leaked token) but holds no device's key. It must not get the sync key or
// the data, and nothing it writes may change anyone's data: forged, flipped,
// moved, swapped, copied or replayed records, plain-text injections, a fake
// device with its own key, fake removal notices, a tampered QR offer, and a
// man in the middle of pairing who plays the other computer on both sides.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import * as X from '../lib/sync/e2e-crypto.mjs';
import { SYNC_DIR_NAME } from '../lib/sync/folder.mjs';
import { encodeHlc } from '../lib/sync/hlc.mjs';
import { tempDir, rm, editState, stopAll, makeE2EDevice, memorySecrets, settle, folderFiles, devFile, titles } from './sync-e2e.shared.mjs';

const base = tempDir('sync-e2e-attack-');
const cloud = join(base, 'cloud');
mkdirSync(cloud);
let A, B, group;
const day = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
const devDir = (id) => join(cloud, SYNC_DIR_NAME, 'devices', id);
const logsOf = (id) => readdirSync(devDir(id)).filter(n => /^ops-.*\.jsonl$/.test(n)).sort();
const linesOf = (id, name) => readFileSync(join(devDir(id), name), 'utf8').split('\n').filter(Boolean);
const title = async (d, id = 'u-1') => ((await d.store.readObject()).custom.find(t => t.id === id) || {}).title;
const putJson = (id, name, v) => { mkdirSync(devDir(id), { recursive: true }); writeFileSync(join(devDir(id), name), JSON.stringify(v)); };
/** The attacker's own device: a real key pair with a valid fingerprint id. */
async function attackerDevice() { const kp = await X.newKeyPair(); return { ...kp, id: await X.deviceIdOf(kp.pub) }; }

before(async () => {
  A = makeE2EDevice(base, 'a', { state: { custom: [{ id: 'u-1', title: 'Pay the rent', subtasks: [] }] } });
  B = makeE2EDevice(base, 'b', { state: { custom: [] }, secrets: memorySecrets() });
  await A.eng.start();
  const { recoveryCode } = await A.eng.setupFirst({ folder: cloud, deviceName: 'Work laptop', apply: true });
  await B.eng.start();
  await B.eng.joinExisting({ folder: cloud, deviceName: 'Home PC', apply: true });
  await B.eng.joinWithRecovery(recoveryCode);
  await settle([A, B]);
  assert.equal(await title(B), 'Pay the rent');
  group = (await A.secrets.get('sync-e2e')).group;
});
after(async () => { await stopAll(); rm(base); });

test('reading everything gives the attacker nothing: no key, no recovery key, no private key, no text', async () => {
  const st = await A.secrets.get('sync-e2e');
  const all = folderFiles(cloud).map(f => f.text).join('\n');
  for (const k of Object.values(st.keys)) {
    assert.ok(!all.includes(k.k), 'a sync key');
    assert.ok(!all.includes(k.rec), 'the recovery public key is never in the folder either');
  }
  assert.ok(!all.includes(st.identity.priv), 'a private key');
  for (const s of ['Pay the rent', 'Work laptop', 'Home PC']) assert.ok(!all.includes(s), s);
  // The wraps in keys.json open for no key the attacker can make.
  const M = await attackerDevice();
  const kj = JSON.parse(readFileSync(devFile(cloud, A.eng.deviceId, 'keys.json'), 'utf8'));
  for (const [to, w] of Object.entries(kj.to)) {
    assert.equal(await X.unwrapBetween({ myPriv: M.priv, fromPub: kj.pub, toPub: M.pub, label: `opendash-wrap-v2|${group}|${kj.kid}|${A.eng.deviceId}|${to}`, enc: w }), null);
  }
  assert.equal(await X.unwrapTo({ myPriv: M.priv, myPub: M.pub, label: `opendash-recovery-wrap-v2|${group}|${kj.kid}|${A.eng.deviceId}`, enc: kj.rec }), null);
});

test('forged, flipped, moved, copied and plain-text records change nothing and are counted', async () => {
  await editState(A.store, s => { s.custom[0].title = 'Pay the rent on Friday'; });
  await settle([A, B]);
  assert.equal(await title(B), 'Pay the rent on Friday');
  const t0 = B.eng.status().e2e.tampered;
  const a = A.eng.deviceId, b = B.eng.deviceId;
  const lf = logsOf(a).pop();
  const real = linesOf(a, lf);
  const lastReal = JSON.parse(real[real.length - 1]);
  const kid = lastReal.enc.k;            // the key id is not secret
  const h = encodeHlc(Date.now() + 60000, 0, a);

  // 1. a well-formed line sealed with a key the attacker made up
  const fake = await X.sealJson(await X.aesKey(X.newSecretKey()), { h, s: {}, w: [[['custom', 'u-1', 'title'], 'Send money to the attacker']], x: [] }, X.recordAad({ kind: 'log', group, dev: a, file: lf, seq: 5000, kid }));
  appendFileSync(join(devDir(a), lf), JSON.stringify({ v: 2, dev: a, n: 5000, enc: { k: kid, ...fake } }) + '\n');
  // 2. a real line with one byte flipped
  const flip = JSON.parse(real[real.length - 1]);
  const ct = X.unb64u(flip.enc.ct); ct[3] ^= 0x40; flip.enc.ct = X.b64u(ct); flip.n = 5001;
  appendFileSync(join(devDir(a), lf), JSON.stringify(flip) + '\n');
  // 3. a plain-text (v 1) change in a member's folder
  appendFileSync(join(devDir(a), lf), JSON.stringify({ v: 1, dev: a, n: 5002, h, s: {}, w: [[['custom', 'u-1', 'title'], 'Plain injection']], x: [] }) + '\n');
  // 4. A's real line moved into another of A's log files (another name in the associated data)
  writeFileSync(join(devDir(a), `ops-${day()}-07.jsonl`), real[real.length - 1] + '\n');
  // 5. A's real line copied into B's folder, as if B had written it
  const asB = JSON.parse(real[real.length - 1]); asB.dev = b;
  appendFileSync(join(devDir(b), logsOf(b).pop()), JSON.stringify(asB) + '\n');
  // 6. A's snapshot put in B's place
  const snapA = readFileSync(join(devDir(a), 'snapshot.json'), 'utf8');
  const snapB0 = readFileSync(join(devDir(b), 'snapshot.json'), 'utf8');
  writeFileSync(join(devDir(b), 'snapshot.json'), snapA);

  await settle([A, B]);
  assert.equal(await title(A), 'Pay the rent on Friday');
  assert.equal(await title(B), 'Pay the rent on Friday');
  const t1 = B.eng.status().e2e.tampered;
  assert.ok(t1 - t0 >= 4, `each injection counted (${t1 - t0})`);
  assert.match(B.eng.status().message, /did not come from your devices/);
  writeFileSync(join(devDir(b), 'snapshot.json'), snapB0);
  // Sync carries on after all that.
  await editState(B.store, s => { s.custom[0].title = 'Rent paid'; });
  await settle([A, B]);
  assert.equal(await title(A), 'Rent paid');
});

test('replays: a record sent twice, or an old one sent again later, changes nothing', async () => {
  const a = A.eng.deviceId;
  await editState(A.store, s => { s.custom[0].title = 'Version one'; });
  await settle([A, B]);
  const lf = logsOf(a).pop();
  const v1 = linesOf(a, lf).pop();
  await editState(A.store, s => { s.custom[0].title = 'Version two'; });
  await settle([A, B]);
  assert.equal(await title(B), 'Version two');
  const d0 = B.eng.status().e2e.duplicates;
  appendFileSync(join(devDir(a), lf), v1 + '\n' + v1 + '\n');        // the old change, twice, at the end
  await settle([A, B]);
  assert.equal(await title(B), 'Version two', 'the old value does not come back');
  assert.ok(B.eng.status().e2e.duplicates - d0 >= 2, 'recognised as already seen');
  // An old copy of A's whole snapshot (a roll-back by the cloud) does not undo anything either.
  const snap = readFileSync(join(devDir(a), 'snapshot.json'), 'utf8');
  await editState(A.store, s => { s.custom[0].title = 'Version three'; });
  await settle([A, B]);
  writeFileSync(join(devDir(a), 'snapshot.json'), snap);
  await settle([B]);
  assert.equal(await title(B), 'Version three');
});

test('a fake device with its own key, fake key wraps and fake removal notices are ignored', async () => {
  const M = await attackerDevice();
  const evil = X.newSecretKey();
  const evilKid = 'e'.repeat(16);
  const b = B.eng.deviceId, a = A.eng.deviceId;
  const before = await B.secrets.get('sync-e2e');
  const e0 = B.eng.status().e2e.epoch;
  // A "member" that offers B its own key, announces itself in a roster and writes changes with that key.
  const payload = { t: 'keyring', v: 2, group, purpose: 'member', for: b, by: M.id, at: new Date().toISOString(), keys: { [evilKid]: { k: X.b64u(evil), n: 99, by: M.id, excl: [], cut: null, rec: null } }, members: { [M.id]: { pub: M.pub, kind: 'computer' } }, removed: { [a]: { at: new Date().toISOString(), by: M.id, n: 99, cut: 0 } }, names: {} };
  const wrap = await X.wrapBetween({ myPriv: M.priv, fromPub: M.pub, toPub: before.identity.pub, label: `opendash-wrap-v2|${group}|${evilKid}|${M.id}|${b}`, value: payload });
  const roster = await X.sealJson(await X.aesKey(evil), { members: { [M.id]: { pub: M.pub, kind: 'computer' } }, names: {} }, X.recordAad({ kind: 'roster', group, dev: M.id, file: 'keys.json', seq: 0, kid: evilKid }));
  const gone = await X.wrapBetween({ myPriv: M.priv, fromPub: M.pub, toPub: before.identity.pub, label: `opendash-removed-v2|${group}|${M.id}|${b}`, value: { t: 'removed', v: 2, group, id: b, at: new Date().toISOString(), by: M.id, n: 99, cut: 0 } });
  putJson(M.id, 'keys.json', { v: 2, t: 'keys', dev: M.id, pub: M.pub, group, kid: evilKid, n: 99, to: { [b]: wrap }, rec: null, gone: { [b]: gone }, roster: { k: evilKid, ...roster } });
  putJson(M.id, 'device.json', { v: 2, deviceId: M.id, format: 2, pub: M.pub, lastSeen: new Date().toISOString(), enc: null });
  const line = await X.sealJson(await X.aesKey(evil), { h: encodeHlc(Date.now() + 60000, 0, M.id), s: {}, w: [[['custom', 'u-1', 'title'], 'Fake device edit']], x: [] }, X.recordAad({ kind: 'log', group, dev: M.id, file: `ops-${day()}.jsonl`, seq: 1, kid: evilKid }));
  writeFileSync(join(devDir(M.id), `ops-${day()}.jsonl`), JSON.stringify({ v: 2, dev: M.id, n: 1, enc: { k: evilKid, ...line } }) + '\n');
  // Inside A's real keys.json: a removal notice for B and a swapped wrap, neither made with A's key.
  const kjPath = devFile(cloud, a, 'keys.json');
  const kj = JSON.parse(readFileSync(kjPath, 'utf8'));
  kj.gone = { [b]: gone };
  kj.to[b] = wrap;
  writeFileSync(kjPath, JSON.stringify(kj));

  await settle([B]);
  const after1 = await B.secrets.get('sync-e2e');
  assert.ok(!after1.keys[evilKid], "B never takes the attacker's key");
  assert.ok(!after1.members[M.id], 'the fake device is not a member');
  assert.ok(!after1.removed[a] && !after1.removed[b], 'nobody was removed');
  assert.equal(B.eng.status().e2e.ready, true);
  assert.notEqual(await title(B), 'Fake device edit');
  assert.ok(!B.eng.status().devices.some(d => d.id === M.id), 'not listed as a device');
  assert.equal(B.eng.status().e2e.epoch, e0, 'B still writes with the same key');
  assert.ok(!Object.values(after1.keys).some(k => k.n === 99));
  // A notices its keys.json was changed by someone else and simply writes its own again later.
  await settle([A, B]);
  await editState(A.store, s => { s.custom[0].title = 'Still syncing'; });
  await settle([A, B]);
  assert.equal(await title(B), 'Still syncing');
});

test('the QR offer: a changed offer opens nothing, and nobody without the code on the screen can open it', async () => {
  const o = await A.eng.makeOffer();
  const pj = JSON.parse(readFileSync(devFile(cloud, A.eng.deviceId, 'pair.json'), 'utf8'));
  // Every 16-byte secret but the right one fails (a few thousand tries stand for "guessing").
  const id = o.offer.text.split(':')[4];
  const label = `opendash-offer-wrap-v2|${group}|${A.eng.deviceId}|${id}`;
  for (let i = 0; i < 2000; i++) assert.equal(await X.openJson(await X.secretKeyFrom(X.randomBytes(16), label), pj.offer, X.utf8(label)), null);
  const ct = X.unb64u(pj.offer.ct); ct[10] ^= 1; pj.offer.ct = X.b64u(ct);
  writeFileSync(devFile(cloud, A.eng.deviceId, 'pair.json'), JSON.stringify(pj));
  const P = makeE2EDevice(base, 'p', { state: { custom: [] }, secrets: memorySecrets() });
  await P.eng.start();
  await P.eng.joinExisting({ folder: cloud, deviceName: 'Phone', apply: true });
  await assert.rejects(() => P.eng.joinWithOffer(o.offer.text), { code: 'BAD_OFFER' });
  assert.equal(P.eng.status().e2e.ready, false);
  await P.eng.stop();
});

test('pairing with a man in the middle: the folder answers as the other computer, and the codes give it away', async () => {
  const N = makeE2EDevice(base, 'n', { state: { custom: [] }, secrets: memorySecrets() });
  await N.eng.start();
  await N.eng.joinExisting({ folder: cloud, deviceName: 'Kitchen laptop', apply: true });
  const n0 = await N.eng.pairStart();
  const sid = n0.e2e.pairing.sid;
  const nId = N.eng.deviceId;
  const req = JSON.parse(readFileSync(devFile(cloud, nId, 'pair.json'), 'utf8'));
  assert.ok(req.join.commit && !req.join.open, 'the new computer publishes only a commitment at first');

  // The attacker plays the approving computer towards N (M2) and the new computer towards A (M1).
  const M1 = await attackerDevice(), M2 = await attackerDevice();
  const fakeGroup = 'f'.repeat(16);
  const answer = (nonce) => ({ v: 2, t: 'pair', dev: M2.id, pub: M2.pub, at: Date.now(), approve: { sid, to: nId, group: fakeGroup, commit: req.join.commit, nonce, at: Date.now(), exp: Date.now() + 600000 } });
  putJson(M2.id, 'pair.json', answer('attacker-nonce-1'));
  const m1Nonce = X.b64u(X.randomBytes(32));
  const m1Commit = await X.pairCommitment({ sid, pub: M1.pub, name: 'Kitchen laptop', kind: 'computer', nonce: m1Nonce });
  putJson(M1.id, 'pair.json', { v: 2, t: 'pair', dev: M1.id, pub: M1.pub, at: Date.now(), join: { sid, commit: m1Commit, name: 'Kitchen laptop', kind: 'computer', at: Date.now(), exp: Date.now() + 600000 } });
  await N.eng.syncNow();
  const codeN = N.eng.status().e2e.pairing.code;
  assert.equal(N.eng.status().e2e.pairing.step, 'compare');
  // N has revealed its nonce now; the attacker can compute N's code, but N answers only once:
  putJson(M2.id, 'pair.json', answer('attacker-nonce-2'));
  await N.eng.syncNow();
  assert.equal(N.eng.status().e2e.pairing.code, codeN, 'a second answer cannot change the code N shows');

  await A.eng.syncNow();
  const r = A.eng.status().e2e.requests.find(x => x.deviceId === M1.id);
  assert.ok(r, 'A sees the request the attacker made');
  await A.eng.pairRespond(r.sid);
  const apj = JSON.parse(readFileSync(devFile(cloud, A.eng.deviceId, 'pair.json'), 'utf8'));
  // Too late to choose: the attacker's key and nonce were fixed by its commitment before it saw A's nonce.
  // Opening with anything else (to steer A's code towards N's) is caught:
  const steer = X.b64u(X.randomBytes(32));
  putJson(M1.id, 'pair.json', { v: 2, t: 'pair', dev: M1.id, pub: M1.pub, at: Date.now(), join: { sid, commit: m1Commit, name: 'Kitchen laptop', kind: 'computer', open: steer, at: Date.now(), exp: Date.now() + 600000 } });
  await A.eng.syncNow();
  assert.equal(A.eng.status().e2e.pairing.step, 'failed', 'an opening that does not match the commitment ends the pairing');

  // A second try, opened honestly: A's code is then fixed, and only matches N's by a 1-in-a-million chance.
  putJson(M1.id, 'pair.json', { v: 2, t: 'pair', dev: M1.id, pub: M1.pub, at: Date.now(), join: { sid, commit: m1Commit, name: 'Kitchen laptop', kind: 'computer', at: Date.now(), exp: Date.now() + 600000 } });
  await A.eng.syncNow();
  const r2 = A.eng.status().e2e.requests.find(x => x.deviceId === M1.id);
  await A.eng.pairRespond(r2.sid);
  const ap2 = JSON.parse(readFileSync(devFile(cloud, A.eng.deviceId, 'pair.json'), 'utf8')).approve;
  assert.ok(ap2.nonce && ap2.nonce !== apj.approve.nonce, 'a fresh nonce for each try');
  putJson(M1.id, 'pair.json', { v: 2, t: 'pair', dev: M1.id, pub: M1.pub, at: Date.now(), join: { sid, commit: m1Commit, name: 'Kitchen laptop', kind: 'computer', open: m1Nonce, at: Date.now(), exp: Date.now() + 600000 } });
  await A.eng.syncNow();
  const a = A.eng.status().e2e.pairing;
  assert.equal(a.step, 'compare');
  assert.notEqual(a.code, codeN, 'the two screens show different numbers');
  // The user sees two different numbers and says no on both. Nothing was sent.
  await A.eng.pairConfirm(a.sid, false);
  await N.eng.pairConfirm(sid, false);
  await settle([A, N]);
  const final = JSON.parse(readFileSync(devFile(cloud, A.eng.deviceId, 'pair.json'), 'utf8'));
  assert.ok(!(final.approve && final.approve.wrap), 'no key wrap for the attacker');
  assert.equal(N.eng.status().e2e.ready, false, 'N did not join a fake group');
  const ns = await N.secrets.get('sync-e2e');
  assert.equal(ns.group, null);
  assert.ok(!(await A.secrets.get('sync-e2e')).members[M1.id]);
  await N.eng.stop();
});
