// People/tag ops and queries (server/actions/ops-people.mjs, queries-people.mjs)
// through the real actions layer: the same API the page, MCP and the CLI use.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir } from './fixtures/actions-state.mjs';

let dir, a;
beforeEach(() => { dir = makeDataDir(); a = createActions({ dataDir: dir }); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const file = () => join(dir, 'state', 'dashboard-state.json');
const disk = () => JSON.parse(readFileSync(file(), 'utf8'));
const run = (ops, extra = {}) => a.apply({ ops, source: 'mcp', client: 'test', ...extra });
const rejects = async (p, code) => { try { await p; } catch (e) { assert.equal(e.code, code, `${e.code}: ${e.message}`); return e; } assert.fail('expected ' + code); };

test('describe exposes the people/tag tools', () => {
  const d = a.describe();
  const ops = d.ops.map(o => o.name), qs = d.queries.map(q => q.name);
  for (const n of ['person.create', 'person.update', 'person.merge', 'person.delete', 'person.add_note', 'people.link_suggested', 'tag.create', 'tag.update', 'task.link_person', 'task.unlink_person']) assert.ok(ops.includes(n), n);
  for (const n of ['people.list', 'person.get', 'people.suggestions', 'tags.list']) assert.ok(qs.includes(n), n);
});

test('create a person: emails[], kind, duplicate guard, and existing links light up', async () => {
  const s = disk(); s.custom[1].people = ['robin']; writeFileSync(file(), JSON.stringify(s));
  const r = await run([{ op: 'person.create', name: 'Robin Marlowe', emails: ['Robin@Client.example'], kind: 'person', org: 'Client Co', group: 'Clients' }]);
  assert.equal(r.created[0].personId, 'robin');
  assert.ok(r.warnings.some(w => /already pointed at 'robin'/.test(w.message)));
  const p = disk().people.find(x => x.id === 'robin');
  assert.deepEqual(p.emails, ['robin@client.example']);
  assert.equal(p.email, 'robin@client.example');
  await rejects(run([{ op: 'person.create', name: 'robin marlowe' }]), 'DUPLICATE_PERSON');
  await rejects(run([{ op: 'person.create', name: 'X', emails: ['not-an-email'] }]), 'BAD_VALUE');
});

test('a new task links the people its title names (and the switch turns it off)', async () => {
  const r = await run([{ op: 'task.create', title: 'Send Alex the agenda', stream: 'work' }]);
  const id = r.created[0].id;
  assert.ok(disk().custom.find(t => t.id === id).people.includes('alex'));
  const s = disk(); s.peopleAutoLink = false; s._lastSave += 1; writeFileSync(file(), JSON.stringify(s));
  const r2 = await run([{ op: 'task.create', title: 'Call Alex back', stream: 'work' }]);
  assert.deepEqual(disk().custom.find(t => t.id === r2.created[0].id).people, []);
});

test('unlink is remembered; link lifts it; suggestions respect it', async () => {
  await run([{ op: 'task.unlink_person', id: 'u-1-aaa', person: 'sam' }]);
  let t = disk().custom.find(x => x.id === 'u-1-aaa');
  assert.ok(!t.people.includes('sam')); assert.deepEqual(t.peopleExcluded, ['sam']);
  const sug = await a.query('people.suggestions', {});
  assert.ok(!sug.links.some(l => l.taskId === 'u-1-aaa' && l.personId === 'sam'), 'an unlinked person is not suggested again');
  await run([{ op: 'task.link_person', id: 'u-1-aaa', person: 'Sam Taylor' }]);
  t = disk().custom.find(x => x.id === 'u-1-aaa');
  assert.ok(t.people.includes('sam')); assert.ok(!t.peopleExcluded);
});

test('link_suggested_people links title mentions in one batch, undoable', async () => {
  const s = disk(); s.custom.push({ id: 'u-9-zzz', title: 'Ask Alex for the data', stream: 'work', tags: [], people: [], subtasks: [], detail: '', recurrence: 'none', priority: 'p0', dueDate: null }); s._lastSave += 1;
  writeFileSync(file(), JSON.stringify(s));
  const q = await a.query('people.suggestions', {});
  assert.ok(q.links.some(l => l.taskId === 'u-9-zzz' && l.personId === 'alex' && l.strength === 'strong'));
  const r = await run([{ op: 'people.link_suggested', personIds: ['alex'] }]);
  assert.ok(disk().custom.find(t => t.id === 'u-9-zzz').people.includes('alex'));
  await a.undo(r.undo, { source: 'mcp' });
  assert.ok(!disk().custom.find(t => t.id === 'u-9-zzz').people.includes('alex'));
});

test('merge needs a dry run, moves links/aliases/emails and removes the duplicate', async () => {
  await run([{ op: 'person.create', name: 'Sammy T', emails: ['sammy@other.example'], allowDuplicate: true }]);
  const s = disk(); s.custom.find(t => t.id === 'u-2-bbb').people = ['sammy']; s._lastSave += 1; writeFileSync(file(), JSON.stringify(s));
  const ops = [{ op: 'person.merge', from: 'sammy', into: 'sam' }];
  const e = await rejects(run(ops), 'NEEDS_CONFIRM');
  await run(ops, { confirm: e.confirm });
  const d = disk();
  assert.ok(!d.people.some(p => p.id === 'sammy'));
  const sam = d.people.find(p => p.id === 'sam');
  assert.ok(sam.emails.includes('sammy@other.example'));
  assert.ok(sam.aliases.includes('sammy t') || sam.aliases.includes('sammy'));
  assert.ok(d.custom.find(t => t.id === 'u-2-bbb').people.includes('sam'));
  await rejects(run([{ op: 'person.merge', from: 'me', into: 'sam' }], { dryRun: true }), 'FORBIDDEN');
});

test('person.get splits open tasks into owe / waiting; people.list counts open tasks only', async () => {
  const s = disk(); s.custom.find(t => t.id === 'u-5-eee').tags = ['blocked-sam']; s._lastSave += 1; writeFileSync(file(), JSON.stringify(s));
  const g = await a.query('person.get', { id: 'sam' });
  assert.ok(g.owe.some(t => t.id === 'u-1-aaa'));
  assert.ok(g.waiting.some(t => t.id === 'u-5-eee'));
  const l = await a.query('people.list', {});
  const samRow = l.people.find(p => p.id === 'sam');
  assert.equal(samRow.openTasks, g.owe.length + g.waiting.length);
  assert.ok(l.people.find(p => p.id === 'me').self);
  await a.apply({ ops: [{ op: 'person.add_note', id: 'sam', text: 'Prefers mornings' }], source: 'ui' });
  assert.equal((await a.query('person.get', { id: 'sam' })).notes[0].text, 'Prefers mornings');
});

test('tags.list carries the rule and flags; tag.create / tag.update keep a canonical list', async () => {
  const s = disk(); s.custom[0].tags.push('thesis', 'blocked-alex'); s._lastSave += 1; writeFileSync(file(), JSON.stringify(s));
  const l = await a.query('tags.list', {});
  assert.match(l.rule, /kind of work/);
  assert.ok(l.tags.find(t => t.tag === 'thesis').flags.includes('stream'));
  assert.ok(l.tags.find(t => t.tag === 'blocked-alex').flags.includes('person'));
  await run([{ op: 'tag.create', tag: '#Deep Work', note: 'focus blocks' }]);
  await run([{ op: 'tag.update', tag: 'email', pinned: true }]);
  const reg = disk().tagRegistry;
  assert.ok(reg.some(e => e.id === 'deep-work' && e.note === 'focus blocks'));
  assert.ok(reg.some(e => e.id === 'email' && e.pinned));
  // the registry makes the new tag known to create_task
  await run([{ op: 'task.create', title: 'Focus block', tags: ['deep-work'], stream: 'work' }]);
  await rejects(run([{ op: 'tag.update', tag: 'nope', pinned: true }]), 'UNKNOWN_TAG');
});
