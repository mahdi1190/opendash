// tools/make-fake-data.mjs: invented demo data for onboarding, tests,
// screenshots and load tests. Repeatable, well-formed, and never real.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildFakeData, writeFakeData } from '../tools/make-fake-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'fake-data-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const ISO = /^\d{4}-\d{2}-\d{2}$/;

test('same seed and day -> the same data; another seed -> different data', () => {
  const today = new Date('2026-03-10T09:00:00');
  const a = buildFakeData({ today, seed: 7 }), b = buildFakeData({ today, seed: 7 }), c = buildFakeData({ today, seed: 8 });
  assert.deepEqual(a.state.custom, b.state.custom);
  assert.notDeepEqual(a.state.custom, c.state.custom);
});

test('well-formed: unique ids, known streams and people, ISO dates, invented addresses only', () => {
  const d = buildFakeData({ today: new Date('2026-03-10T09:00:00'), tasks: 300 });
  const s = d.state;
  assert.equal(s.custom.length, 300);
  assert.equal(new Set(s.custom.map(t => t.id)).size, 300);
  const streams = new Set(s.streams.map(x => x.id));
  const people = new Set(s.people.map(p => p.id));
  for (const t of s.custom) {
    assert.ok(typeof t.title === 'string' && t.title.length > 2, t.id);
    assert.ok(streams.has(t.stream), `stream ${t.stream}`);
    if (t.dueDate) assert.match(t.dueDate, ISO);
    for (const p of t.people || []) assert.ok(people.has(p), `person ${p}`);
  }
  for (const p of s.people) assert.match(p.email, /@example\.(com|org|net)$/);
  for (const e of d.inbox.emails) assert.match(String(e.from || e.fromEmail || ''), /example\.(com|org|net)|^$/);
  assert.ok(d.calendar.events.length > 10);
  assert.ok(Array.isArray(s.countdowns) && s.countdowns.length >= 3);
  assert.ok(d.finance.analysis.transactions.length > 50);
});

test('the CLI writes a full data folder, refuses to overwrite without --force, and scales to 2000 tasks', () => {
  const dest = join(tmp, 'demo');
  const run = (...args) => spawnSync(process.execPath, [join(ROOT, 'tools', 'make-fake-data.mjs'), dest, ...args], { encoding: 'utf8' });
  const r1 = run('--tasks', '2000', '--seed', '3');
  assert.equal(r1.status, 0, r1.stderr);
  const st = JSON.parse(readFileSync(join(dest, 'state', 'dashboard-state.json'), 'utf8'));
  assert.equal(st.custom.length, 2000);
  for (const f of ['config.json', 'calendar/calendar.json', 'email/inbox.json', 'finance/_system/analysis.json']) assert.ok(existsSync(join(dest, f)), f);
  const r2 = run('--tasks', '5');
  assert.notEqual(r2.status, 0, 'an existing state is not replaced without --force');
  assert.equal(JSON.parse(readFileSync(join(dest, 'state', 'dashboard-state.json'), 'utf8')).custom.length, 2000);
});

test('writeFakeData keeps a name the user already chose', async () => {
  const dest = join(tmp, 'named');
  const { writeJson } = await import('../lib/fsutil.mjs');
  const { ensureDataDir } = await import('../lib/datadir.mjs');
  await ensureDataDir(dest);
  await writeJson(join(dest, 'config.json'), { userName: 'Robin' });
  await writeFakeData(dest, { tasks: 10, finance: false });
  assert.equal(JSON.parse(readFileSync(join(dest, 'config.json'), 'utf8')).userName, 'Robin');
});
