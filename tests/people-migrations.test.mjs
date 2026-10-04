// Migrations 030-people, 040-tags and 050-cleanup on synthetic data folders
// (generic names only): dry run, plan files, idempotency, counts.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyMigration } from '../tools/migrations/_lib.mjs';
import * as m030 from '../tools/migrations/030-people.mjs';
import * as m040 from '../tools/migrations/040-tags.mjs';
import * as m050 from '../tools/migrations/050-cleanup.mjs';

const t = (id, title, extra = {}) => ({ id, title, dueDate: null, priority: 'p0', tags: [], stream: 'work', detail: '', subtasks: [], recurrence: 'none', people: [], ...extra });
function sample() {
  return {
    _lastSave: 1000,
    streams: [{ id: 'work', label: 'Work', color: '#2563eb' }, { id: 'thesis', label: 'Thesis', color: '#7c3aed' }],
    people: [
      { id: 'sam', name: 'Sam', email: 'sam@uni.example', aliases: ['supervisor'] },
      { id: 'desk', name: 'Help desk', email: 'it-support@uni.example' },
      { id: 'me', name: 'Test (you)', aliases: ['me'], self: true },
    ],
    peopleNotes: { sam: 'Prefers short emails' },
    custom: [
      t('u-1', 'Email Sam about the draft', { tags: ['email', 'blocked-sam', 'work'], people: ['Sam'] }),
      t('u-2', 'Kickoff with the client', { people: ['robin'], tags: ['mtg', 'urgent'], dueDate: '2099-01-01' }),
      t('u-3', 'Old one', { tags: ['robin', 'thesis'], stream: 'thesis' }),
      t('u-4', 'Layered', { detail: '**Sync 2026-09-02:** newest\n\n---\n\n**Sync 2026-08-20:** middle\n\n---\n\n**Sync 2026-08-01:** oldest\n\n---\n\nOriginal text', subtasks: [{ id: 's1', title: '[ ] first', done: false }, { id: 's2', title: '[x] second', done: false }] }),
      t('u-5', 'Weekly thing', { tags: [] }),
    ],
    statuses: { 'u-3': 'done', 'u-gone': 'doing', 'Doing\r\n': 'doing' },
    notes: { 'u-binned': [{ id: 'n1', ts: 1, text: 'kept' }] },
    pinned: {},
    taskActivity: { 'Doing\r\n': [{ id: 'a' }], 'u-forgotten': [{ id: 'b' }] },
    completionLog: { 'u-5': [1000000, 1000000 + 60000, 1000000 + 120000, 1000000 + 86400000] },
    customOrder: { all: ['u-1', 'Today 2\r\nThis week', 'u-dead'] },
    bin: { tasks: [{ id: 'u-binned', binTs: 5, kind: 'custom', customData: t('u-binned', 'Binned', { tags: ['mtg'] }) }], notes: [] },
    deleted: {},
    quickTemplates: [{ label: 'Log', title: 'Email Sam re: ', stream: 'work', tags: ['email', 'blocked-sam'] }],
  };
}
let dir;
const stateFile = () => join(dir, 'state', 'dashboard-state.json');
const read = () => JSON.parse(readFileSync(stateFile(), 'utf8'));
const run = (mod, opts = {}) => applyMigration(mod, { dataDir: dir, argv: opts.argv || [], dryRun: !!opts.dryRun, log: () => {} });
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ppl-mig-'));
  mkdirSync(join(dir, 'state'), { recursive: true });
  writeFileSync(stateFile(), JSON.stringify(sample()));
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ userName: 'Test', timezone: 'Europe/London' }));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const plan = (id, obj) => { mkdirSync(join(dir, 'migration-plans'), { recursive: true }); writeFileSync(join(dir, 'migration-plans', id + '.json'), JSON.stringify(obj)); };

test('030 dry run writes nothing; generic run fixes shape, names-as-ids and dangling ids', async () => {
  const before = readFileSync(stateFile(), 'utf8');
  const r = await run(m030, { dryRun: true });
  assert.ok(r.changed);
  assert.equal(readFileSync(stateFile(), 'utf8'), before);
  await run(m030);
  const s = read();
  const sam = s.people.find(p => p.id === 'sam');
  assert.deepEqual(sam.emails, ['sam@uni.example']);
  assert.equal(s.people.find(p => p.id === 'desk').kind, 'mailbox');
  assert.deepEqual(s.custom[0].people, ['sam'], "'Sam' used as an id is remapped");
  const robin = s.people.find(p => p.id === 'robin');
  assert.ok(robin && robin.stub && robin.name === 'Robin', 'dangling id gets a stub profile with that id');
  assert.equal(sam.notes[0].text, 'Prefers short emails');
  assert.ok(!s.peopleNotes.sam);
  assert.ok(readdirSync(join(dir, 'state', 'backups')).some(f => f.startsWith('pre-030-people')));
  const again = await run(m030);
  assert.equal(again.changed, false, 'idempotent');
});

test('030 with a plan: adds and corrects people, links listed tasks, never re-adds an unlinked person', async () => {
  const s0 = sample(); s0.custom[1].peopleExcluded = ['casey']; writeFileSync(stateFile(), JSON.stringify(s0));
  plan('030-people', {
    self: 'me',
    people: [{ id: 'robin', name: 'Robin Marlowe', org: 'Client Co', group: 'Clients', emails: ['robin@client.example'], aliases: ['marlowe'], linkTaskIds: ['u-5'] },
      { id: 'casey', name: 'Casey Ng', linkTaskIds: ['u-2', 'u-missing'] }],
    update: { sam: { name: 'Sam Taylor', emails: { add: ['s.taylor@lab.example'] }, aliases: { remove: ['supervisor'], add: ['taylor'] }, group: 'Academic' } },
  });
  const r = await run(m030);
  const s = read();
  const robin = s.people.find(p => p.id === 'robin');
  assert.equal(robin.name, 'Robin Marlowe'); assert.equal(robin.org, 'Client Co'); assert.ok(!robin.stub || robin.name !== 'Robin');
  assert.deepEqual(s.custom.find(x => x.id === 'u-5').people, ['robin']);
  assert.ok(!s.custom.find(x => x.id === 'u-2').people.includes('casey'), 'exclusion respected');
  const sam = s.people.find(p => p.id === 'sam');
  assert.equal(sam.name, 'Sam Taylor');
  assert.deepEqual(sam.emails, ['sam@uni.example', 's.taylor@lab.example']);
  assert.deepEqual(sam.aliases, ['taylor']);
  assert.ok(r.notes.some(n => /1 listed tasks not found/.test(n)));
  assert.ok(!r.notes.join(' ').includes('Robin'), 'notes report counts, not names');
  assert.equal((await run(m030)).changed, false);
});

test('040 refuses a plan that names people who are not there, then cleans everything', async () => {
  plan('040-tags', { canonical: ['email', 'meeting', 'waiting'], stripUnknown: true, merges: { meeting: ['mtg'], waiting: ['blocked-sam'] }, toPeople: { robin: 'robin' }, addTags: { 'u-5': ['meeting'] } });
  await assert.rejects(() => run(m040), /run 030-people/);
  await run(m030);
  const r = await run(m040);
  const s = read();
  const byId = (id) => s.custom.find(x => x.id === id);
  assert.deepEqual(byId('u-1').tags, ['email', 'waiting']);
  assert.ok(byId('u-1').people.includes('sam'));
  assert.deepEqual(byId('u-2').tags, ['meeting']);
  assert.equal(byId('u-2').priority, 'p0', 'urgent only raises tasks due within 14 days');
  assert.deepEqual(byId('u-3').tags, [], 'done tasks too: person tag -> link, stream tag gone');
  assert.ok(byId('u-3').people.includes('robin'));
  assert.deepEqual(byId('u-5').tags, ['meeting']);
  assert.deepEqual(s.bin.tasks[0].customData.tags, ['meeting']);
  assert.deepEqual(s.quickTemplates[0].tags, ['email', 'waiting']);
  assert.deepEqual(s.tagRegistry.map(e => e.id), ['email', 'meeting', 'waiting']);
  assert.ok(Array.isArray(s.taskActivity['u-1']) && s.taskActivity['u-1'].some(a => a.source === 'script'));
  assert.ok(r.notes.some(n => /distinct tags on tasks: \d+ -> 3/.test(n)), r.notes.join('\n'));
  assert.equal((await run(m040)).changed, false, 'idempotent');
});

test('050 cleans junk keys, orphans, [ ] subtasks, sync layers and burst completions, archiving what it removes', async () => {
  const r = await run(m050);
  const s = read();
  assert.ok(!('Doing\r\n' in s.statuses) && !('Doing\r\n' in s.taskActivity));
  assert.ok(!('u-gone' in s.statuses));
  assert.equal(s.cleanupArchive['050-cleanup'].statuses['u-gone'], 'doing');
  assert.ok(!('u-binned' in s.notes));
  assert.equal(s.bin.tasks[0].notes[0].text, 'kept', 'notes of a binned task move into its bin record');
  assert.ok(!('u-forgotten' in s.taskActivity));
  assert.deepEqual(s.customOrder.all, ['u-1']);
  const l = s.custom.find(x => x.id === 'u-4');
  assert.deepEqual(l.subtasks.map(x => [x.title, x.done]), [['first', false], ['second', true]]);
  assert.equal(l.detail, '**Sync 2026-09-02:** newest\n\n---\n\nOriginal text');
  assert.deepEqual(s.notes['u-4'].map(n => n.text), ['**Sync 2026-08-20:** middle', '**Sync 2026-08-01:** oldest']);
  assert.equal(s.completionLog['u-5'].length, 2);
  assert.ok(r.notes.some(n => /burst completions archived: 2/.test(n)));
  assert.equal((await run(m050)).changed, false, 'idempotent');
});
