// server/state-store.mjs: optimistic concurrency, no-op writes, and the backup
// policy (data changes only, at most one rolling backup per 10 minutes, one
// daily snapshot kept 30 days).
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createStateStore, ROLLING_MIN_GAP_MS } from '../server/state-store.mjs';

let dir, clock, store;
const MIN = 60000;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'store-test-'));
  clock = Date.UTC(2026, 9, 2, 9, 0, 0);
  store = createStateStore({ stateDir: dir, now: () => clock });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const body = (o) => JSON.stringify(o);
const rolling = () => (existsSync(join(dir, 'backups')) ? readdirSync(join(dir, 'backups')).filter(f => /^state-.*\.json$/.test(f)) : []);
const daily = () => (existsSync(join(dir, 'backups', 'daily')) ? readdirSync(join(dir, 'backups', 'daily')) : []);

test('first write creates the file and returns the server-stamped version', async () => {
  const r = await store.write(body({ custom: [], _lastSave: 0 }));
  assert.equal(r.written, true);
  assert.equal(r.lastSave, clock);
  assert.equal(JSON.parse(readFileSync(join(dir, 'dashboard-state.json'), 'utf8'))._lastSave, clock);
});

test('a stale base version is refused with 409; an equal one is accepted', async () => {
  const a = await store.write(body({ custom: [{ id: 1 }], _lastSave: 0 }));
  clock += 1000;
  await assert.rejects(store.write(body({ custom: [], _lastSave: a.lastSave - 1 })), e => e.status === 409 && e.lastSave === a.lastSave);
  const b = await store.write(body({ custom: [{ id: 2 }], _lastSave: a.lastSave }));
  assert.ok(b.lastSave > a.lastSave);
});

test('the new version is always larger, even if the clock goes backwards', async () => {
  const a = await store.write(body({ custom: [], x: 1, _lastSave: 0 }));
  clock -= 5000;
  const b = await store.write(body({ custom: [], x: 2, _lastSave: a.lastSave }));
  assert.equal(b.lastSave, a.lastSave + 1);
});

test('identical content is not written again', async () => {
  const a = await store.write(body({ custom: [{ id: 1 }], view: 'today', _lastSave: 0 }));
  clock += 1000;
  const b = await store.write(body({ custom: [{ id: 1 }], view: 'today', _lastSave: a.lastSave, _saveCount: 99 }));
  assert.equal(b.written, false);
  assert.equal(b.lastSave, a.lastSave);
});

test('UI-only changes are saved but never backed up', async () => {
  let v = (await store.write(body({ custom: [{ id: 1 }], view: 'today', _lastSave: 0 }))).lastSave;
  for (const view of ['week', 'all', 'finance', 'stream:x']) {
    clock += 11 * MIN;
    v = (await store.write(body({ custom: [{ id: 1 }], view, selectedTaskId: 'a', _lastSave: v }))).lastSave;
  }
  assert.deepEqual(rolling(), []);
  assert.deepEqual(daily(), []);
});

test('data changes: one rolling backup per 10 minutes at most, plus one daily snapshot', async () => {
  let v = (await store.write(body({ custom: [], n: 0, _lastSave: 0 }))).lastSave;
  for (let i = 1; i <= 5; i++) {               // 5 data edits within 5 minutes
    clock += MIN;
    v = (await store.write(body({ custom: [], n: i, _lastSave: v }))).lastSave;
  }
  assert.equal(rolling().length, 1);
  assert.equal(daily().length, 1);
  clock += ROLLING_MIN_GAP_MS;                 // 10 minutes later
  v = (await store.write(body({ custom: [], n: 6, _lastSave: v }))).lastSave;
  assert.equal(rolling().length, 2);
  clock += 24 * 60 * MIN;                       // next day
  await store.write(body({ custom: [], n: 7, _lastSave: v }));
  assert.equal(daily().length, 2);
});

test('daily snapshots older than 30 days are pruned', async () => {
  mkdirSync(join(dir, 'backups', 'daily'), { recursive: true });
  writeFileSync(join(dir, 'backups', 'daily', 'state-2026-08-01.json'), '{}');
  writeFileSync(join(dir, 'backups', 'daily', 'state-2026-09-20.json'), '{}');
  const v = (await store.write(body({ custom: [], n: 1, _lastSave: 0 }))).lastSave;
  await store.write(body({ custom: [], n: 2, _lastSave: v }));
  const d = daily();
  assert.ok(!d.includes('state-2026-08-01.json'));
  assert.ok(d.includes('state-2026-09-20.json'));
});

test('bad bodies are refused before touching disk', async () => {
  await assert.rejects(store.write('{nope'), e => e.status === 400);
  await assert.rejects(store.write('[]'), e => e.status === 400);
  await assert.rejects(store.write('{"x":1}'), e => e.status === 400 && /custom/.test(e.message));
  assert.ok(!existsSync(join(dir, 'dashboard-state.json')));
});

test('a corrupt state file is served from the newest good backup', async () => {
  mkdirSync(join(dir, 'backups'), { recursive: true });
  writeFileSync(join(dir, 'backups', 'state-2026-10-01.json'), JSON.stringify({ custom: [{ id: 'kept' }], _lastSave: 5 }));
  writeFileSync(join(dir, 'dashboard-state.json'), '{"custom": [ {"id"');
  const r = await store.readText();
  assert.ok(r.recoveredFrom);
  assert.equal(JSON.parse(r.text).custom[0].id, 'kept');
});
