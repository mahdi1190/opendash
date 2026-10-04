// tools/migrate.mjs + tools/migrations/*: copy-only legacy move (001), config
// (002), streams/templates into data (010), --auto with a backup, idempotency,
// and tools/make-test-data.mjs. All on synthetic data in a temp folder.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadMigrations, autoMigrate } from '../tools/migrate.mjs';
import { applyMigration } from '../tools/migrations/_lib.mjs';
import { legacyStatus, dataPaths } from '../lib/datadir.mjs';
import { KNOWN_STREAMS, buildStreams, run as run010 } from '../tools/migrations/010-streams-config.mjs';
import { DEFAULT_STREAMS } from '../server/actions/model.mjs';

let root, repo, fin, data;
const quiet = () => {};
const readState = (d) => JSON.parse(readFileSync(dataPaths(d).stateFile, 'utf8'));

function legacyState() {
  return {
    _lastSave: 1000,
    custom: [
      { id: 't1', title: 'Write chapter', stream: 'thesis', tags: [] },
      { id: 't2', title: 'Fix bike', stream: 'personal', tags: [] },
      { id: 't3', title: 'Side thing', stream: 'side-project', tags: [] },
      { id: 't4', title: 'Read two papers', stream: 'learning', tags: [] },
    ],
    statuses: {}, people: [{ id: 'me', name: 'Sam Example (you)' }, { id: 'alex', name: 'Alex' }],
    bin: { tasks: [], notes: [] }, boards: [],
  };
}

before(() => {
  root = mkdtempSync(join(tmpdir(), 'migr-test-'));
  repo = join(root, 'repo');
  fin = join(root, 'finance-src');
  data = join(root, 'data');
  mkdirSync(join(repo, 'state', 'backups'), { recursive: true });
  writeFileSync(join(repo, 'state', 'dashboard-state.json'), JSON.stringify(legacyState()));
  writeFileSync(join(repo, 'state', 'backups', 'state-old.json'), '{"custom":[]}');
  writeFileSync(join(repo, 'state', 'calendar.json'), JSON.stringify({ fetchedAt: 'x', events: [] }));
  writeFileSync(join(repo, 'state', 'inbox.json'), JSON.stringify({ fetchedAt: 'x', emails: [] }));
  mkdirSync(join(fin, '_system', '__pycache__'), { recursive: true });
  mkdirSync(join(fin, 'inbox'), { recursive: true });
  writeFileSync(join(fin, '_system', 'spend.py'), 'print("hi")');
  writeFileSync(join(fin, '_system', 'rules.json'), '{"rules":[]}');
  writeFileSync(join(fin, '_system', '__pycache__', 'spend.cpython-313.pyc'), 'junk');
});
after(() => rmSync(root, { recursive: true, force: true }));

test('migrations load in order, ids match file names, 001 is manual', async () => {
  const mods = await loadMigrations();
  const ids = mods.map(m => m.id);
  assert.deepEqual(ids, [...ids].sort());
  assert.ok(ids.includes('001-data-dir') && ids.includes('002-config') && ids.includes('010-streams-config'));
  assert.equal(mods.find(m => m.id === '001-data-dir').auto, false);
});

test('an empty data dir next to a legacy state/ is detected, with the exact command', () => {
  const l = legacyStatus({ dataDir: data, repoRoot: repo });
  assert.ok(l);
  assert.match(l.command, /^node tools\/migrate\.mjs 001-data-dir --data-dir /);
});

test('--auto refuses to run while the legacy folder has not been copied', async () => {
  const r = await autoMigrate({ dataDir: data, repoRoot: repo, log: quiet });
  assert.equal(r.status, 'legacy');
  assert.ok(!existsSync(join(data, 'migrations.json')));
});

test('001 dry run writes nothing', async () => {
  const mods = await loadMigrations();
  const m001 = mods.find(m => m.id === '001-data-dir');
  const r = await applyMigration(m001, { dataDir: data, dryRun: true, repoRoot: repo, argv: ['--finance-from', fin], log: quiet });
  assert.ok(r.changed);
  assert.ok(!existsSync(data));
});

test('001 copies state, snapshots and finance (no __pycache__), never moves, and is idempotent', async () => {
  const mods = await loadMigrations();
  const m001 = mods.find(m => m.id === '001-data-dir');
  const r = await applyMigration(m001, { dataDir: data, repoRoot: repo, argv: ['--finance-from', fin], log: quiet });
  assert.ok(r.changed);
  const p = dataPaths(data);
  assert.equal(readState(data).custom.length, 4);
  assert.ok(existsSync(join(p.stateBackups, 'state-old.json')));
  assert.ok(existsSync(p.calendarFile) && existsSync(p.inboxFile));
  assert.ok(!existsSync(join(p.stateDir, 'calendar.json')), 'snapshots go to their own folders');
  assert.ok(existsSync(join(p.finance, '_system', 'spend.py')));
  assert.ok(!existsSync(join(p.finance, '_system', '__pycache__')));
  // sources untouched
  assert.ok(existsSync(join(repo, 'state', 'dashboard-state.json')));
  assert.ok(existsSync(join(fin, '_system', 'spend.py')));
  // second run: nothing new
  const again = await applyMigration(m001, { dataDir: data, repoRoot: repo, argv: ['--finance-from', fin], log: quiet });
  assert.equal(again.changed, false);
  assert.equal(legacyStatus({ dataDir: data, repoRoot: repo }), null);
  const applied = JSON.parse(readFileSync(p.migrations, 'utf8')).applied.map(a => a.id);
  assert.ok(applied.includes('001-data-dir'));
});

test('--auto backs up the data dir, then applies 002 and 010', async () => {
  const before = readState(data)._lastSave;
  const r = await autoMigrate({ dataDir: data, repoRoot: repo, log: quiet });
  assert.equal(r.status, 'applied');
  // (later auto migrations, e.g. 020-countdowns, run after these two; they have their own tests)
  assert.deepEqual(r.applied.map(a => a.id).filter(id => /^0[01]\d-/.test(id)), ['002-config', '010-streams-config']);
  const p = dataPaths(data);
  const backups = readdirSync(p.backups).filter(n => n.startsWith('pre-migrate-'));
  assert.equal(backups.length, 1);
  assert.ok(existsSync(join(p.backups, backups[0], 'state', 'dashboard-state.json')));
  const cfg = JSON.parse(readFileSync(p.config, 'utf8'));
  assert.equal(cfg.userName, 'Sam Example');
  const s = readState(data);
  assert.ok(s._lastSave > before, '_lastSave bumped so open tabs reload');
  assert.equal(s.people.find(x => x.id === 'me').self, true);
  assert.deepEqual(s.streams.map(x => x.id), ['side-project', 'learning', 'personal', 'thesis'], 'well-known ids first, then the rest');
  assert.equal(s.streams[0].label, 'Side project');
  assert.equal(s.streams[3].label, 'Thesis', 'an unknown id gets a generated label');
  assert.deepEqual(s.quickTemplates, [], 'no built-in quick-add chips are seeded');
  // a backup of the state was taken before each state write
  assert.ok(readdirSync(p.stateBackups).some(n => n.startsWith('pre-010-streams-config-')));
});

test('--auto again is a no-op', async () => {
  const s0 = readState(data);
  const r = await autoMigrate({ dataDir: data, repoRoot: repo, log: quiet });
  assert.equal(r.status, 'up-to-date');
  assert.equal(readState(data)._lastSave, s0._lastSave);
});

test('--auto on a new data folder (missing or empty) sets it up quietly, with nothing to back up', async () => {
  const noRepo = join(root, 'no-repo');
  for (const d of [join(root, 'brand-new'), join(root, 'made-empty')]) {
    if (d.endsWith('made-empty')) mkdirSync(d);
    const lines = [];
    const r = await autoMigrate({ dataDir: d, repoRoot: noRepo, log: (s) => lines.push(s) });
    assert.equal(r.status, 'applied');
    assert.equal(r.fresh, true);
    assert.ok(r.applied.length > 0, 'the set-up migrations still run');
    assert.deepEqual(lines, ['  A new data folder: setting it up.'], 'no backup and no upgrade steps to report');
    const p = dataPaths(d);
    assert.ok(!existsSync(p.backups) || !readdirSync(p.backups).some(n => n.startsWith('pre-migrate-')), 'nothing was backed up');
    assert.ok(existsSync(p.config));
    assert.equal((await autoMigrate({ dataDir: d, repoRoot: noRepo, log: quiet })).status, 'up-to-date');
  }
});

test('010: a new user whose streams merely share a common v1 id (thesis) never gets the v1 templates', async () => {
  const d = join(root, 'friend');
  mkdirSync(join(d, 'state'), { recursive: true });
  writeFileSync(join(d, 'state', 'dashboard-state.json'), JSON.stringify({ _lastSave: 1, streams: [{ id: 'thesis', label: 'My thesis', color: '#000', order: 0 }], custom: [{ id: 'u-1', title: 'Write intro', stream: 'thesis' }, { id: 'u-2', title: 'Apply', stream: 'jobs' }] }));
  const mods = await loadMigrations();
  await applyMigration(mods.find(m => m.id === '010-streams-config'), { dataDir: d, log: quiet });
  const s = readState(d);
  assert.deepEqual(s.quickTemplates, [], 'no v1 (personal) templates for someone else');
  assert.equal(s.streams[0].label, 'My thesis');
});

test('re-running 010 never overwrites existing streams', async () => {
  const p = dataPaths(data);
  const s = readState(data);
  s.streams[0].label = 'Renamed by user';
  writeFileSync(p.stateFile, JSON.stringify(s));
  const mods = await loadMigrations();
  const r = await applyMigration(mods.find(m => m.id === '010-streams-config'), { dataDir: data, log: quiet });
  assert.equal(r.changed, false);
  assert.equal(readState(data).streams[0].label, 'Renamed by user');
});

test('010 for a new user: no state -> nothing; non-v1 streams -> no v1 templates', async () => {
  const fresh = join(root, 'fresh');
  const mods = await loadMigrations();
  const m010 = mods.find(m => m.id === '010-streams-config');
  const r = await applyMigration(m010, { dataDir: fresh, log: quiet });
  assert.equal(r.changed, false);
  assert.deepEqual(buildStreams({ custom: [{ stream: 'work' }] }).map(s => s.id), ['work']);
  mkdirSync(join(fresh, 'state'), { recursive: true });
  writeFileSync(dataPaths(fresh).stateFile, JSON.stringify({ custom: [{ id: 'a', stream: 'work' }] }));
  const r2 = await applyMigration(m010, { dataDir: fresh, log: quiet });
  assert.ok(r2.changed);
  const s = readState(fresh);
  assert.deepEqual(s.quickTemplates, []);
  assert.equal(s.streams[0].id, 'work');
  for (const d of DEFAULT_STREAMS) assert.equal(KNOWN_STREAMS.find(k => k.id === d.id)?.label, d.label, `the app default ${d.id} is well known`);
  assert.equal(new Set(KNOWN_STREAMS.map(k => k.id)).size, KNOWN_STREAMS.length);
});

test('010: well-known streams are matched by id, never by label; no quick-add chips are seeded', async () => {
  const s = buildStreams({ custom: [{ stream: 'reading-list' }, { stream: 'health' }, { stream: 'work' }], boards: [{ stream: 'Health' }] });
  assert.deepEqual(s.map(x => x.id), ['work', 'health', 'Health', 'reading-list']);
  assert.deepEqual(s.map(x => x.label), ['Work', 'Health', 'Health', 'Reading List']);
  assert.equal(s[1].color, KNOWN_STREAMS.find(k => k.id === 'health').color);
  assert.ok(/^#[0-9a-f]{6}$/.test(s[2].color), 'a look-alike id gets a palette colour of its own');
  let written = null;
  const r = await run010({ state: { read: async () => ({ custom: [{ id: 'a', stream: 'side-project' }] }), write: async (x) => { written = x; } } });
  assert.ok(r.changed);
  assert.deepEqual(written.streams.map(x => [x.id, x.label, x.order]), [['side-project', 'Side project', 0]]);
  assert.deepEqual(written.quickTemplates, []);
});

test('make-test-data builds a current-schema copy and only reads its sources', async () => {
  const { makeTestData } = await import('../tools/make-test-data.mjs');
  const dest = join(root, 'testdata');
  const srcBefore = readFileSync(join(repo, 'state', 'dashboard-state.json'), 'utf8');
  const r = await makeTestData(dest, { stateFrom: join(repo, 'state'), financeFrom: fin, log: quiet });
  assert.equal(r.tasks, 4);
  assert.equal(readFileSync(join(repo, 'state', 'dashboard-state.json'), 'utf8'), srcBefore);
  const s = readState(dest);
  assert.ok(Array.isArray(s.streams));
  assert.ok(existsSync(join(dest, 'finance', '_system', 'spend.py')));
  assert.ok(existsSync(join(dest, 'calendar', 'calendar.json')));
  await assert.rejects(makeTestData(dest, { stateFrom: join(repo, 'state'), log: quiet }), /not empty/);
});
