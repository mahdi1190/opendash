// Shadow (trial) mode, the default when sync is turned on: changes from the
// other devices are collected and reported, the data is not touched; this
// device's own changes still go out. Turning "apply" on merges everything
// collected with the normal merge, and a clash made meanwhile is reported.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { syncedView } from '../lib/sync/model.mjs';
import { tempDir, rm, stopAll, makeDevice, editState, sleep, keepAlive } from './sync.shared.mjs';

const base = tempDir('sync-shadow-');
const release = keepAlive();
after(async () => { await stopAll(); release(); rm(base); });
const cloud = join(base, 'cloud');
mkdirSync(cloud);
const settle = async (...ds) => { for (let i = 0; i < 3; i++) { for (const d of ds) await d.eng.syncNow(); await sleep(40); } };
const task = (id, title) => ({ id, title, stream: 'work', priority: 'p2', tags: [], subtasks: [] });

const A = makeDevice(base, 'a', { state: { custom: [task('u-a1', 'From home 1'), task('u-a2', 'From home 2')], statuses: {} } });
const B = makeDevice(base, 'b', { state: { custom: [task('u-b1', 'Only at work')], statuses: {} } });

test('turned on without "apply": the other device is reported, nothing here changes', async () => {
  await A.eng.start(); await A.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Home PC' });
  await B.eng.start();
  const st0 = await B.eng.configure({ enabled: true, folder: cloud, deviceName: 'Work laptop' });
  assert.equal(st0.mode, 'shadow');
  const before = readFileSync(join(B.data, 'state', 'dashboard-state.json'), 'utf8');
  await settle(A, B);
  assert.equal(readFileSync(join(B.data, 'state', 'dashboard-state.json'), 'utf8'), before, "B's data file is byte for byte unchanged");
  const st = B.eng.status();
  assert.equal(st.preview.tasks.added, 2);
  assert.deepEqual(st.preview.from, ['Home PC']);
  assert.match(st.message, /Trial mode: Home PC has changes waiting \(2 new tasks/);
  const report = JSON.parse(readFileSync(join(B.eng.localDir, 'shadow-report.json'), 'utf8'));
  assert.deepEqual(report.added.map(t => t.title).sort(), ['From home 1', 'From home 2']);
  // B's own data still goes out, and A (apply on) takes it.
  assert.ok((await A.store.readObject()).custom.some(t => t.id === 'u-b1'), "A got B's task");
});

test('edits made while in trial mode, then "apply": everything merges, the clash is reported', async () => {
  // Both edit B's task at about the same time; B is still only collecting.
  await editState(A.store, s => { s.custom.find(t => t.id === 'u-b1').title = 'Renamed at home'; });
  await A.eng.syncNow();
  await B.eng.syncNow();                                   // B collects A's rename, applies nothing
  assert.equal((await B.store.readObject()).custom.find(t => t.id === 'u-b1').title, 'Only at work');
  await sleep(10);
  await editState(B.store, s => { s.custom.find(t => t.id === 'u-b1').title = 'Renamed at work'; s.statuses['u-b1'] = 'doing'; });
  await settle(B, A);
  const st = await B.eng.configure({ apply: true });
  assert.equal(st.mode, 'apply');
  await settle(A, B);
  const a = await A.store.readObject(), b = await B.store.readObject();
  assert.equal(syncedView(a), syncedView(b), 'identical after apply');
  assert.equal(b.custom.length, 3);
  assert.equal(b.custom.find(t => t.id === 'u-b1').title, 'Renamed at work', 'the later rename wins');
  assert.equal(b.statuses['u-b1'], 'doing');
  const kinds = [...A.eng.status().conflicts.recent, ...B.eng.status().conflicts.recent].map(c => c.kind);
  assert.ok(kinds.includes('same-field'), 'the rename clash is reported, though B saw the other one only later');
  assert.equal(B.eng.status().preview, null);
});

test('turning "apply" off again goes back to collecting', async () => {
  await B.eng.configure({ apply: false });
  await editState(A.store, s => { s.custom[0].title = 'Home again'; });
  await settle(A, B);
  assert.notEqual((await B.store.readObject()).custom[0].title, 'Home again');
  assert.ok(B.eng.status().preview.tasks.changed >= 1);
  assert.ok(existsSync(join(B.eng.localDir, 'meta.json')));
});
