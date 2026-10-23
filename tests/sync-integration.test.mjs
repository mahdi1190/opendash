// Folder sync end to end: TWO computers, each with its own data folder, state
// store and sync engine, and each with its OWN copy of the cloud folder. A
// simulated cloud client carries files between the two copies late, out of
// order, half-delivered first, with conflict-copy junk on the side. Both
// computers edit at the same time (the page's saves and MCP-style changes);
// afterwards the synced data must be identical on both.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { syncedView } from '../lib/sync/model.mjs';
import { SYNC_DIR_NAME, isSyncFileName } from '../lib/sync/folder.mjs';
import { buildFakeData } from '../tools/make-fake-data.mjs';
import { tempDir, rm, stopAll, makeDevice, editState, waitFor, sleep, keepAlive } from './sync.shared.mjs';

const base = tempDir('sync-int-');
const release = keepAlive();
after(async () => { await stopAll(); release(); rm(base); });

const cloudA = join(base, 'cloud-a'), cloudB = join(base, 'cloud-b');
mkdirSync(cloudA); mkdirSync(cloudB);
const devs = (cloud) => join(cloud, SYNC_DIR_NAME, 'devices');

/** Atomic "download" of one file (a cloud client writes a temp file and renames it). */
function put(path, text) {
  mkdirSync(join(path, '..'), { recursive: true });
  const tmp = join(path, '..', `.~${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}
/** The files of `id` in `cloud` that the other copy does not have yet (or has shorter). */
function pending(fromCloud, toCloud, id) {
  const src = join(devs(fromCloud), id), dst = join(devs(toCloud), id);
  if (!existsSync(src)) return [];
  return readdirSync(src).filter(isSyncFileName).filter((n) => {
    const a = readFileSync(join(src, n), 'utf8');
    const b = existsSync(join(dst, n)) ? readFileSync(join(dst, n), 'utf8') : null;
    return a !== b;
  }).map(n => ({ name: n, text: readFileSync(join(src, n), 'utf8'), dst: join(dst, n) }));
}
/**
 * Carry one computer's files to the other copy. order: 'reverse' (newest
 * first), 'snapshot-last'; halfFirst: deliver each log cut mid-line first,
 * then wait, then the whole file; junk: drop conflict copies beside them.
 */
async function deliver(fromCloud, toCloud, id, { order = 'normal', halfFirst = false, junk = false, gapMs = 150 } = {}) {
  let files = pending(fromCloud, toCloud, id);
  if (order === 'reverse') files = files.reverse();
  if (order === 'snapshot-last') files = [...files.filter(f => f.name !== 'snapshot.json'), ...files.filter(f => f.name === 'snapshot.json')];
  for (const f of files) {
    if (junk) {
      put(f.dst.replace(/\.(jsonl?)$/, '-DESKTOP-AB12CD.$1'), f.text.replace(/"/g, '"'));
      put(f.dst.replace(/\.(jsonl?)$/, ' (1).$1'), '{"v":1,"broken": tru');
    }
    if (halfFirst && f.text.length > 40) {
      put(f.dst, f.text.slice(0, Math.floor(f.text.length / 2) + 7));
      await sleep(gapMs);
    }
    put(f.dst, f.text);
    await sleep(20);
  }
  return files.length;
}
const settled = async (...ds) => { for (let i = 0; i < 3; i++) { await Promise.all(ds.map(d => d.eng.syncNow())); await sleep(60); } };
const view = async (d) => syncedView(await d.store.readObject());

// A slow poll, so the latency measured below is the file watcher's.
const A = makeDevice(base, 'a', { state: buildFakeData({ tasks: 40, seed: 3 }).state, pollMs: 3000 });
const B = makeDevice(base, 'b', { state: { custom: [], view: 'home', theme: 'dark' }, pollMs: 3000 });
let idA, idB;

test('a new computer joins: it gets everything, delivered late, half-first and out of order', async () => {
  await A.eng.start(); await B.eng.start();
  await A.eng.configure({ enabled: true, apply: true, folder: cloudA, deviceName: 'Home PC' });
  idA = A.eng.deviceId;
  await B.eng.configure({ enabled: true, apply: true, folder: cloudB, deviceName: 'Work laptop' });
  idB = B.eng.deviceId;
  assert.notEqual(idA, idB);
  // Nothing has been delivered yet: B has only its own (empty) data.
  assert.equal((await B.store.readObject()).custom.length, 0);
  await deliver(cloudA, cloudB, idA, { order: 'reverse', halfFirst: true, junk: true });
  await waitFor(async () => (await view(A)) === (await view(B)), 8000, 'B to match A');
  const b = await B.store.readObject();
  assert.equal(b.custom.length, 40);
  assert.equal(b.view, 'home', 'B keeps its own view and theme (UI keys are not synced)');
  assert.equal(b.theme, 'dark');
  await deliver(cloudB, cloudA, idB);
  await settled(A, B);
  assert.equal(await view(A), await view(B));
  const st = A.eng.status();
  assert.equal(st.state, 'ok');
  assert.deepEqual(st.devices.filter(d => !d.me).map(d => d.name), ['Work laptop']);
});

test('both computers edit at once (page saves and MCP-style changes), then the cloud catches up: identical, nothing lost', async () => {
  const a0 = await A.store.readObject();
  const [t1, t2, t3, t5] = [a0.custom[1].id, a0.custom[2].id, a0.custom[3].id, a0.custom[5].id];
  const cdOrder = a0.countdowns.map(c => c.id);
  // Home PC (A), offline from B for now:
  await editState(A.store, s => { const t = s.custom.find(x => x.id === t1); t.title = 'Title from Home PC'; (t.subtasks = t.subtasks || []).push({ id: 'st-from-a', title: 'added on A', done: false }); });
  await editState(A.store, s => { s.custom = s.custom.filter(x => x.id !== t5); });
  await editState(A.store, s => { s.countdowns.push(s.countdowns.shift()); });
  // The same field on both: B first, A a moment later. (A change's time is
  // when its computer recorded it, within ~0.1 s of the save.)
  await editState(B.store, s => { s.custom.find(x => x.id === t3).title = 'B wrote this first'; });
  await B.eng.syncNow();
  await sleep(15);
  await editState(A.store, s => { s.custom.find(x => x.id === t3).title = 'A wrote this later'; }, 'mcp');
  await A.eng.syncNow();
  // Work laptop (B):
  await editState(B.store, s => { const t = s.custom.find(x => x.id === t1); t.priority = 'p1'; t.tags = ['urgent']; });
  await editState(B.store, s => { s.custom.find(x => x.id === t5).title = 'edited while A deleted it'; });
  await editState(B.store, s => { s.custom.unshift({ id: 'u-made-on-b', title: 'Made on the work laptop', stream: 'work', priority: 'p2', tags: [], subtasks: [] }); }, 'mcp');
  await editState(B.store, s => { (s.notes[t2] = s.notes[t2] || []).push({ id: 'n-from-b', ts: Date.now(), text: 'note from B' }); });
  await settled(A, B);
  // The cloud: B's files reach A in reverse order, half first; A's reach B snapshot last, with junk.
  await deliver(cloudB, cloudA, idB, { order: 'reverse', halfFirst: true });
  await deliver(cloudA, cloudB, idA, { order: 'snapshot-last', junk: true });
  await settled(A, B);
  await deliver(cloudB, cloudA, idB); await deliver(cloudA, cloudB, idA);
  await settled(A, B);
  const a = await A.store.readObject(), b = await B.store.readObject();
  assert.equal(syncedView(a), syncedView(b), 'the synced data is identical on both');
  const T1 = a.custom.find(x => x.id === t1);
  assert.equal(T1.title, 'Title from Home PC');
  assert.equal(T1.priority, 'p1');
  assert.deepEqual(T1.tags, ['urgent']);
  assert.ok(T1.subtasks.some(s => s.id === 'st-from-a'));
  assert.equal(a.custom.find(x => x.id === t3).title, 'A wrote this later', 'same field: the later edit wins');
  assert.equal(a.custom.find(x => x.id === t5), undefined, 'delete vs edit: the delete wins');
  assert.equal(a.custom[0].id, 'u-made-on-b');
  assert.ok(a.notes[t2].some(n => n.id === 'n-from-b'));
  assert.equal(a.countdowns[a.countdowns.length - 1].id, cdOrder[0]);
  const conflicts = A.eng.status().conflicts.count + B.eng.status().conflicts.count;
  assert.ok(conflicts >= 2, `the title clash and the edit-after-delete are reported (${conflicts})`);
  const kinds = [...A.eng.status().conflicts.recent, ...B.eng.status().conflicts.recent].map(c => c.kind);
  assert.ok(kinds.includes('same-field') && kinds.includes('edit-after-delete'), kinds.join(','));
});

test('a computer that was offline for 300 changes catches up in one go and converges', async () => {
  const b0 = await B.store.readObject();
  for (let i = 0; i < 300; i++) {
    const t = b0.custom[i % b0.custom.length];
    await editState(B.store, s => {
      const x = s.custom.find(y => y.id === t.id);
      if (x) { x.title = `B edit ${i}`; x.priority = ['p1', 'p2', 'p3'][i % 3]; }
      if (i % 50 === 0) s.custom.push({ id: `u-b-${i}`, title: `new ${i}`, stream: 'work', priority: 'p2', tags: [], subtasks: [] });
      if (i % 37 === 0) s.statuses[t.id] = 'doing';
    });
    if (i % 25 === 0) await B.eng.syncNow();
  }
  await B.eng.syncNow();
  const t0 = Date.now();
  await deliver(cloudB, cloudA, idB, { order: 'reverse' });
  await waitFor(async () => (await view(A)) === (await view(B)), 10000, 'A to catch up');
  const ms = Date.now() - t0;
  const logs = readdirSync(join(devs(cloudA), idB)).filter(n => n.endsWith('.jsonl'));
  const bytes = logs.reduce((n, f) => n + statSync(join(devs(cloudA), idB, f)).size, 0);
  console.log(`# caught up on 300+ changes (${Math.round(bytes / 1024)} KB of log) in ${ms} ms`);
  assert.ok((await A.store.readObject()).custom.some(x => x.id === 'u-b-250'));
});

test('local apply latency: file appears in the folder -> state updated -> version bumped', async () => {
  const samples = [], reasons = [];
  for (let i = 0; i < 8; i++) {
    await editState(A.store, s => { s.custom[0].title = `latency ${i}`; });
    await A.eng.syncNow();
    const files = pending(cloudA, cloudB, idA).filter(f => f.name.endsWith('.jsonl'));
    assert.ok(files.length, 'A wrote a log line');
    const v0 = (await B.store.readObject())._lastSave;
    const heard = new Promise((res) => { const off = B.store.onChange((info) => { if (info.source === 'sync') { off(); res({ at: Date.now(), version: info.version }); } }); });
    const t0 = Date.now();
    for (const f of files) put(f.dst, f.text);
    const { at, version } = await heard;
    assert.ok(version > v0, 'the version the page and the MCP server watch went up');
    assert.equal((await B.store.readObject()).custom[0].title, `latency ${i}`);
    samples.push(at - t0);
    reasons.push(B.eng.status().lastApply.reason);
    await sleep(50);
  }
  samples.sort((x, y) => x - y);
  const med = samples[Math.floor(samples.length / 2)];
  console.log(`# local apply latency (fs.watch): median ${med} ms, min ${samples[0]} ms, max ${samples[samples.length - 1]} ms over ${samples.length}`);
  console.log(`# woken by: ${reasons.join(',')}; last pass: ${JSON.stringify(B.eng.status().lastApply)}`);
  assert.ok(med < 1000, `median ${med} ms should be well under a second`);
});

test('with file watching unavailable, the 5 s poll still picks changes up', async () => {
  const C = makeDevice(base, 'c', { state: { custom: [] }, watch: false, pollMs: 5000 });
  const cloudC = join(base, 'cloud-c'); mkdirSync(cloudC);
  await C.eng.start();
  await C.eng.configure({ enabled: true, apply: true, folder: cloudC, deviceName: 'Old laptop' });
  await deliver(cloudA, cloudC, idA); await deliver(cloudB, cloudC, idB);
  await waitFor(async () => (await view(C)) === (await view(A)), 12000, 'C to catch up by polling');
  await editState(A.store, s => { s.custom[0].title = 'poll check'; });
  await A.eng.syncNow();
  const heard = new Promise((res) => { const off = C.store.onChange((i) => { if (i.source === 'sync') { off(); res(Date.now()); } }); });
  const t0 = Date.now();
  await deliver(cloudA, cloudC, idA);
  const ms = (await heard) - t0;
  console.log(`# poll-only apply latency: ${ms} ms (poll every 5 s)`);
  assert.ok(ms <= 6500);
  await C.eng.stop();
});

test('after a restart the engine resumes where it was (no re-send, no lost offsets)', async () => {
  await A.eng.stop();
  const before = readdirSync(join(devs(cloudA), idA)).map(n => [n, statSync(join(devs(cloudA), idA, n)).size]);
  const A2 = { ...A, eng: (await import('../lib/sync/node-host.mjs')).createNodeSyncEngine({ store: A.store, dataDir: A.data, localDir: join(base, 'local-a'), host: 'host-a', pollMs: 200, debounceMs: 30, detect: () => [] }) };
  await A2.eng.start();
  assert.equal(A2.eng.deviceId, idA, 'same identity');
  await A2.eng.syncNow();
  const afterLogs = readdirSync(join(devs(cloudA), idA)).filter(n => n.endsWith('.jsonl')).map(n => [n, statSync(join(devs(cloudA), idA, n)).size]);
  for (const [n, size] of afterLogs) { const b = before.find(x => x[0] === n); assert.ok(b && b[1] === size, `${n} did not grow: nothing was sent again`); }
  await A2.eng.stop(); await B.eng.stop();
});
