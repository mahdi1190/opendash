// Encrypted sync, the plain-words status: "Your other computer's clock (...)
// is 2 hours ahead" and "Waiting for ... to finish uploading: ... has not
// received this computer's latest changes yet". Each computer sees its own
// copy of the cloud folder; copy() plays the cloud client carrying files
// across, so an upload can be held back.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SYNC_DIR_NAME } from '../lib/sync/folder.mjs';
import { tempDir, rm, editState, stopAll, makeE2EDevice, memorySecrets, settle } from './sync-e2e.shared.mjs';

const base = tempDir('sync-e2e-status-');
after(async () => { await stopAll(); rm(base); });

test("another computer's clock 2 hours ahead is named, in hours", async () => {
  const cloud = join(base, 'cloud-clock');
  mkdirSync(cloud);
  const A = makeE2EDevice(base, 'ca', { state: { custom: [{ id: 'u-1', title: 'One', subtasks: [] }] }, secrets: memorySecrets() });
  const S = makeE2EDevice(base, 'cs', { state: { custom: [] }, secrets: memorySecrets(), now: () => Date.now() + 2 * 3600 * 1000 });
  await A.eng.start();
  const { recoveryCode } = await A.eng.setupFirst({ folder: cloud, deviceName: 'Work laptop', apply: true });
  await S.eng.start();
  await S.eng.joinExisting({ folder: cloud, deviceName: 'Old desktop', apply: true });
  await S.eng.joinWithRecovery(recoveryCode);
  await settle([A, S]);
  await editState(S.store, s => { s.custom[0].title = 'Edited on the fast clock'; });
  await settle([A, S]);
  const st = A.eng.status();
  assert.ok(st.skew, 'the skew is noticed');
  assert.equal(st.skew.text, "Your other computer's clock (Old desktop) is 2 hours ahead. Set both computers to the right time so the newest change wins.");
  assert.equal((await A.store.readObject()).custom[0].title, 'Edited on the fast clock', 'its change still arrives');
});

test('an upload that has not arrived on the other computer is reported, then clears', async () => {
  let T = Date.now();
  const now = () => T;
  const viewA = join(base, 'view-a'), viewB = join(base, 'view-b');
  mkdirSync(viewA); mkdirSync(viewB);
  const A = makeE2EDevice(base, 'ua', { state: { custom: [{ id: 'u-1', title: 'One', subtasks: [] }] }, secrets: memorySecrets(), now });
  const B = makeE2EDevice(base, 'ub', { state: { custom: [] }, secrets: memorySecrets(), now });
  /** The cloud client: one device's files from one view to the other. */
  const copy = (id, from, to) => {
    const src = join(from, SYNC_DIR_NAME, 'devices', id);
    if (existsSync(src)) cpSync(src, join(to, SYNC_DIR_NAME, 'devices', id), { recursive: true, force: true });
  };
  const both = () => { copy(A.eng.deviceId, viewA, viewB); copy(B.eng.deviceId, viewB, viewA); };
  await A.eng.start();
  const { recoveryCode } = await A.eng.setupFirst({ folder: viewA, deviceName: 'Work laptop', apply: true });
  await A.eng.syncNow();
  copy(A.eng.deviceId, viewA, viewB);
  await B.eng.start();
  await B.eng.joinExisting({ folder: viewB, deviceName: 'Home PC', apply: true });
  await B.eng.joinWithRecovery(recoveryCode);
  for (let i = 0; i < 3; i++) { await B.eng.syncNow(); both(); await A.eng.syncNow(); both(); }
  assert.equal((await B.store.readObject()).custom[0].title, 'One');

  // B changes something; its cloud client has not uploaded it yet.
  await editState(B.store, s => { s.custom[0].title = 'Changed on B'; });
  await B.eng.syncNow();
  T += 5 * 60 * 1000;
  await A.eng.syncNow();                         // A is here, 5 minutes later, without B's change
  copy(A.eng.deviceId, viewA, viewB);
  await B.eng.syncNow();
  assert.equal(B.eng.status().state, 'waiting');
  assert.match(B.eng.status().message, /^Waiting for the sync folder to finish uploading: Work laptop has not received this computer's latest changes yet\.$/);

  // The upload goes through; A takes it in and says so at its next check-in.
  copy(B.eng.deviceId, viewB, viewA);
  await A.eng.syncNow();
  assert.equal((await A.store.readObject()).custom[0].title, 'Changed on B');
  T += 3 * 60 * 1000;
  await A.eng.syncNow();
  copy(A.eng.deviceId, viewA, viewB);
  await B.eng.syncNow();
  assert.equal(B.eng.status().state, 'ok');
  assert.equal(B.eng.status().message, 'Up to date.');
});
