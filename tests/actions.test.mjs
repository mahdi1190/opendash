// server/actions: every op and query, dry runs, undo, idempotency, atomic
// batches, the confirm rule, helpful errors and sanitising. Synthetic data only.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir, TODAY, addDays } from './fixtures/actions-state.mjs';

let dir, a;
beforeEach(() => { dir = makeDataDir(); a = createActions({ dataDir: dir }); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const file = () => join(dir, 'state', 'dashboard-state.json');
const disk = () => JSON.parse(readFileSync(file(), 'utf8'));
const task = (id) => disk().custom.find(t => t.id === id);
const rejects = async (p, code, check) => {
  try { await p; } catch (e) { assert.equal(e.code, code, `${e.code}: ${e.message}`); if (check) check(e); return e; }
  assert.fail(`expected ${code}`);
};
const run = (ops, extra = {}) => a.apply({ ops, source: 'mcp', client: 'test', ...extra });

// ─── Queries ───────────────────────────────────────────────────────────────
test('context.get gives a model everything it needs to start', async () => {
  const c = await a.query('context.get');
  assert.equal(c.today, TODAY);
  assert.match(c.weekday, /day$/);
  assert.equal(c.next14Days.length, 14);
  assert.equal(c.user, 'Test');
  assert.deepEqual(c.streams.map(s => s.id), ['work', 'thesis', 'personal']);
  assert.equal(c.streams.find(s => s.id === 'thesis').open, 2);
  assert.ok(c.people.find(p => p.id === 'me').self);
  assert.equal(c.countdowns[0].headline, true);
  assert.equal(c.counts.overdue, 1);
  assert.equal(c.counts.dueToday, 1);
  assert.equal(c.version, 1000);
  assert.ok(c.meaning.priorities.p1);
});

test('tasks.list: views, filters, paging and helpful errors', async () => {
  const ids = async (p) => (await a.query('tasks.list', p)).tasks.map(t => t.id);
  assert.deepEqual(await ids({ view: 'today' }), ['u-3-ccc', 'u-4-ddd']);
  assert.deepEqual(await ids({ view: 'overdue' }), ['u-3-ccc']);
  assert.deepEqual(await ids({ view: 'tomorrow' }), ['u-1-aaa']);
  assert.deepEqual((await ids({ view: 'week' })).sort(), ['u-1-aaa', 'u-3-ccc', 'u-4-ddd']);
  assert.deepEqual(await ids({ view: 'no-date' }), ['t-seed-1']);
  assert.deepEqual(await ids({ view: 'completed' }), ['u-6-fff']);
  assert.deepEqual(await ids({ stream: 'Thesis' }), ['u-1-aaa', 'u-5-eee']);
  assert.deepEqual(await ids({ person: 'Sam Taylor' }), ['u-1-aaa', 'u-5-eee']);
  assert.deepEqual(await ids({ tag: '#Email' }), ['u-1-aaa']);
  assert.deepEqual(await ids({ dueFrom: addDays(TODAY, 8), dueTo: addDays(TODAY, 9) }), ['u-2-bbb', 'u-5-eee']);
  assert.deepEqual(await ids({ text: 'council' }), ['u-3-ccc']);
  const page = await a.query('tasks.list', { limit: 2 });
  assert.equal(page.count, 2);
  assert.match(page.more, /offset 2/);
  const one = (await a.query('tasks.list', { view: 'tomorrow' })).tasks[0];
  assert.deepEqual(one, { id: 'u-1-aaa', title: 'Email Sam about chapter corrections', due: addDays(TODAY, 1), day: new Date(addDays(TODAY, 1) + 'T12:00:00Z').toUTCString().slice(0, 3), daysLeft: 1, status: 'todo', priority: 'p1', stream: 'thesis', tags: ['email', 'corrections'], people: ['Sam Taylor'], subtasks: '0/1' });
  await rejects(a.query('tasks.list', { dueFrom: 'next week' }), 'INVALID_PARAMS', e => assert.match(e.hint, /Today is/));
  await rejects(a.query('tasks.list', { stream: 'thesys' }), 'UNKNOWN_STREAM', e => { assert.deepEqual(e.valid, ['work', 'thesis', 'personal']); assert.match(e.hint, /thesis/); });
  await rejects(a.query('tasks.list', { view: 'todya' }), 'INVALID_PARAMS', e => assert.match(e.hint, /today/));
  await rejects(a.query('tasks.lsit'), 'UNKNOWN_QUERY', e => assert.match(e.hint, /tasks.list/));
});

test('task.get returns everything; a title instead of an id returns candidates', async () => {
  const t = await a.query('task.get', { id: 'u-1-aaa' });
  assert.equal(t.subtasks[0].id, 'st-1');
  assert.equal(t.notes[0].text, 'Sam prefers Thursday');
  assert.deepEqual(t.people, [{ id: 'sam', name: 'Sam Taylor' }]);
  assert.equal(t.streamLabel, 'Thesis');
  await rejects(a.query('task.get', { id: 'email sam corrections' }), 'NOT_FOUND', e => assert.equal(e.candidates[0].id, 'u-1-aaa'));
});

test('tasks.find ranks by title, people, typos; done tasks only on request', async () => {
  const top = async (text, extra) => (await a.query('tasks.find', { text, ...extra })).results;
  const r1 = await top('email sam corrections');
  assert.equal(r1[0].id, 'u-1-aaa');
  assert.ok(r1[0].score >= 0.85);
  assert.equal((await top('slieds group'))[0].id, 'u-2-bbb', 'typo tolerated');
  assert.ok((await top('alex')).some(r => r.id === 'u-2-bbb' && r.matchedOn.includes('people')));
  assert.ok(!(await top('finished thing')).some(r => r.id === 'u-6-fff'));
  assert.equal((await top('finished thing', { includeDone: true }))[0].id, 'u-6-fff');
  const none = await a.query('tasks.find', { text: 'zebra quantum' });
  assert.equal(none.count, 0);
  assert.match(none.advice, /new task/);
});

test('people, countdowns, tags, calendar and finance queries', async () => {
  const p = await a.query('people.list');
  assert.equal(p.people.find(x => x.id === 'sam').openTasks, 2);
  const cd = await a.query('countdowns.list');
  assert.equal(cd.countdowns[0].daysLeft, 60);
  const tags = await a.query('tags.list');
  assert.equal(tags.tags.find(t => t.tag === 'email').total, 2);
  assert.equal(tags.tags.find(t => t.tag === 'email').open, 1);
  const cal = await a.query('calendar.list', { from: TODAY, to: addDays(TODAY, 7) });
  assert.deepEqual(cal.events.map(e => e.title), ['Group meeting', 'Conference']);
  assert.equal(cal.events[1].until, addDays(TODAY, 4), 'all-day end is exclusive');
  await rejects(a.query('calendar.list', { from: TODAY, to: addDays(TODAY, 200) }), 'BAD_VALUE');
  const fin = await a.query('finance.summary');
  assert.equal(fin.available, true);
  assert.equal(fin.week.total, 120.5);
  assert.equal(fin.balances.total, 1234.5);
  const s = JSON.stringify(fin);
  assert.ok(!s.includes('Secret Shop') && !s.includes('Some Shop'), 'no merchants or transactions');
});

// ─── Ops ───────────────────────────────────────────────────────────────────
test('task.create: defaults, refs, people by name, subtasks, history with source', async () => {
  const r = await run([
    { op: 'task.create', title: 'Book train', ref: 'trip', dueDate: addDays(TODAY, 3), priority: 'high', people: ['Alex'], subtasks: ['compare prices'] },
    { op: 'task.add_note', id: '$trip', text: 'before Friday' },
  ]);
  assert.equal(r.ok, true);
  const id = r.created[0].id;
  assert.match(id, /^u-\d+-[a-z0-9]{3}$/);
  const t = task(id);
  assert.equal(t.priority, 'p1');
  assert.equal(t.stream, 'personal', 'default stream');
  assert.ok(r.warnings.some(w => /default stream/.test(w.message)));
  assert.deepEqual(t.people, ['alex']);
  assert.equal(t.subtasks[0].title, 'compare prices');
  assert.equal(disk().notes[id][0].text, 'before Friday');
  const act = disk().taskActivity[id];
  assert.equal(act[0].type, 'created');
  assert.equal(act[0].source, 'mcp');
  assert.equal(act[0].client, 'test');
});

test('task.create refuses near-duplicates and unknown tags unless asked', async () => {
  await rejects(run([{ op: 'task.create', title: 'email sam about chapter corrections!', stream: 'thesis' }]), 'DUPLICATE_TASK', e => assert.equal(e.candidates[0].id, 'u-1-aaa'));
  const ok = await run([{ op: 'task.create', title: 'Email Sam about chapter corrections', stream: 'thesis', allowDuplicate: true }]);
  assert.equal(ok.changed, 1);
  await rejects(run([{ op: 'task.create', title: 'New thing', tags: ['emial'] }]), 'NEW_TAG', e => { assert.match(e.message, /email/); assert.ok(e.valid.includes('email')); });
  const r = await run([{ op: 'task.create', title: 'New thing', tags: ['#Big Idea'], createTag: true }]);
  assert.deepEqual(task(r.created[0].id).tags, ['big-idea']);
});

test('task.update changes several fields and logs each', async () => {
  const r = await run([{ op: 'task.update', id: 'u-2-bbb', title: 'Prepare slides v2', priority: 'p1', stream: 'thesis', dueDate: null, pinned: true, status: 'doing', tags: ['presentation', 'email'], people: ['sam', 'alex'] }]);
  const t = task('u-2-bbb');
  assert.equal(t.title, 'Prepare slides v2');
  assert.equal(t.dueDate, null);
  assert.deepEqual(t.people, ['sam', 'alex']);
  assert.equal(disk().statuses['u-2-bbb'], 'doing');
  assert.equal(disk().pinned['u-2-bbb'], true);
  const types = disk().taskActivity['u-2-bbb'].map(x => x.type);
  for (const k of ['title', 'priority', 'stream', 'date', 'status', 'pin', 'tags', 'people']) assert.ok(types.includes(k), k);
  assert.ok(r.preview[0].changes.length >= 8);
  await rejects(run([{ op: 'task.update', id: 'u-2-bbb' }]), 'INVALID_PARAMS', e => assert.match(e.message, /at least one field/));
  await rejects(run([{ op: 'task.update', id: 'u-2-bbb', titel: 'x' }]), 'INVALID_PARAMS', e => assert.match(e.hint, /title/));
});

test('complete / reopen, and repeating tasks roll forward', async () => {
  await run([{ op: 'task.complete', id: 'u-1-aaa' }]);
  assert.equal(disk().statuses['u-1-aaa'], 'done');
  assert.equal(disk().completionLog['u-1-aaa'].length, 1);
  const again = await run([{ op: 'task.complete', id: 'u-1-aaa' }]);
  assert.equal(again.changed, 0);
  assert.match(again.warnings[0].message, /already done/);
  await run([{ op: 'task.reopen', id: 'u-1-aaa' }]);
  assert.equal(disk().statuses['u-1-aaa'], 'todo');
  const r = await run([{ op: 'task.complete', id: 'u-4-ddd' }]);
  assert.equal(task('u-4-ddd').dueDate, addDays(TODAY, 7));
  assert.equal(disk().statuses['u-4-ddd'], 'todo');
  assert.match(r.preview[0].summary, /repeats/);
});

test('bin needs a dry run; bin + restore for user and seed tasks', async () => {
  await rejects(run([{ op: 'task.bin', id: 'u-3-ccc' }]), 'NEEDS_CONFIRM', e => { assert.equal(e.status, 428); assert.ok(e.confirm); assert.ok(e.preview.length); });
  const d = await run([{ op: 'task.bin', id: 'u-3-ccc' }, { op: 'task.bin', id: 't-seed-1' }], { dryRun: true });
  assert.equal(d.needsConfirm, true);
  assert.equal(disk().custom.length, 7, 'dry run wrote nothing');
  await run([{ op: 'task.bin', id: 'u-3-ccc' }, { op: 'task.bin', id: 't-seed-1' }], { confirm: d.confirm });
  const s = disk();
  assert.ok(!s.custom.some(t => t.id === 'u-3-ccc'), 'user task leaves the list');
  assert.equal(s.deleted['t-seed-1'], true, 'seed task is flagged');
  assert.equal(s.bin.tasks.length, 2);
  assert.equal(s.bin.tasks[0].kind, 'custom');
  await rejects(run([{ op: 'task.update', id: 'u-3-ccc', priority: 'p1' }]), 'TASK_BINNED');
  assert.equal((await a.query('tasks.list', { view: 'bin' })).total, 2);
  assert.equal((await a.query('task.get', { id: 'u-3-ccc' })).binned, true);
  await run([{ op: 'task.restore', id: 'u-3-ccc' }, { op: 'task.restore', id: 't-seed-1' }]);
  const s2 = disk();
  assert.ok(s2.custom.some(t => t.id === 'u-3-ccc'));
  assert.ok(!s2.deleted['t-seed-1']);
  assert.equal(s2.bin.tasks.length, 0);
  await rejects(run([{ op: 'task.restore', id: 'u-3-ccc' }]), 'NOT_BINNED');
});

test('reschedule by date or by days; errors say how to fix the call', async () => {
  await run([{ op: 'task.reschedule', id: 'u-2-bbb', shiftDays: 2, reason: 'waiting for data' }]);
  assert.equal(task('u-2-bbb').dueDate, addDays(TODAY, 10));
  const last = disk().taskActivity['u-2-bbb'].at(-1);
  assert.deepEqual([last.type, last.reason], ['date', 'waiting for data']);
  await run([{ op: 'task.reschedule', id: 'u-2-bbb', dueDate: '2030-01-31' }]);
  assert.equal(task('u-2-bbb').dueDate, '2030-01-31');
  await rejects(run([{ op: 'task.reschedule', id: 'u-2-bbb', dueDate: '2030-02-30' }]), 'BAD_DATE', e => assert.match(e.hint, /Today is/));
  await rejects(run([{ op: 'task.reschedule', id: 'u-2-bbb', dueDate: 'thursday' }]), 'INVALID_PARAMS', e => assert.match(e.hint, /Today is/));
  await rejects(run([{ op: 'task.reschedule', id: 'u-2-bbb', dueDate: '2030-01-01', shiftDays: 1 }]), 'INVALID_PARAMS');
  await rejects(run([{ op: 'task.reschedule', id: 't-seed-1', shiftDays: 1 }]), 'NO_DUE_DATE');
});

test('priority aliases, stream labels, subtasks, notes, people and tags ops', async () => {
  await run([
    { op: 'task.set_priority', id: 'u-5-eee', priority: 'medium' },
    { op: 'task.move_stream', id: 'u-5-eee', stream: 'Work' },
    { op: 'task.add_subtask', id: 'u-5-eee', title: 'Skim intro' },
    { op: 'task.update_subtask', id: 'u-1-aaa', subtaskId: 'Draft reply', done: true, title: 'Draft the reply' },
    { op: 'task.remove_subtask', id: 'u-1-aaa', subtaskId: 'st-1' },
    { op: 'task.add_note', id: 'u-5-eee', text: 'line one\nline two' },
    { op: 'task.link_person', id: 'u-5-eee', person: 'samt' },
    { op: 'task.unlink_person', id: 'u-2-bbb', person: 'alex' },
    { op: 'task.add_tag', id: 'u-5-eee', tag: 'Email' },
    { op: 'task.remove_tag', id: 'u-1-aaa', tag: 'corrections' },
  ]);
  const t5 = task('u-5-eee');
  assert.equal(t5.priority, 'p2');
  assert.equal(t5.stream, 'work');
  assert.equal(t5.subtasks[0].title, 'Skim intro');
  assert.deepEqual(t5.people, ['sam']);
  assert.deepEqual(t5.tags, ['writing', 'email']);
  assert.deepEqual(task('u-1-aaa').subtasks, []);
  assert.deepEqual(task('u-1-aaa').tags, ['email']);
  assert.deepEqual(task('u-2-bbb').people, []);
  assert.equal(disk().notes['u-5-eee'][0].text, 'line one\nline two');
  await rejects(run([{ op: 'task.set_priority', id: 'u-5-eee', priority: 'urgentish' }]), 'INVALID_PARAMS', e => assert.ok(e.valid.includes('p1')));
  await rejects(run([{ op: 'task.update_subtask', id: 'u-5-eee', subtaskId: 'nope', done: true }]), 'NOT_FOUND', e => assert.match(e.hint, /Skim intro/));
  await rejects(run([{ op: 'task.link_person', id: 'u-5-eee', person: 'Alx' }]), 'UNKNOWN_PERSON', e => assert.match(e.hint, /alex/i));
});

test('person.create / person.update', async () => {
  // a task already points at an id nobody has yet
  await run([{ op: 'task.update', id: 'u-2-bbb', people: ['alex'] }]);
  const s = disk(); s.custom.find(t => t.id === 'u-3-ccc').people = ['jordan']; s._lastSave = 2000;
  const { writeFileSync } = await import('node:fs'); writeFileSync(file(), JSON.stringify(s));
  const r = await run([{ op: 'person.create', name: 'Jordan Lee', role: 'new manager', aliases: ['JL'] }]);
  assert.equal(r.created[0].personId, 'jordan');
  assert.ok(r.warnings.some(w => /already pointed/.test(w.message)));
  await rejects(run([{ op: 'person.create', name: 'jordan lee' }]), 'DUPLICATE_PERSON');
  const r2 = await run([{ op: 'person.create', name: 'Jordan Smith', allowDuplicate: true }]);
  assert.equal(r2.created[0].personId, 'jordan-smith');
  await run([{ op: 'person.update', id: 'Jordan Lee', email: 'j@example.com', aliases: ['jl', 'jordy'] }]);
  const p = disk().people.find(x => x.id === 'jordan');
  assert.equal(p.email, 'j@example.com');
  assert.deepEqual(p.aliases, ['jl', 'jordy']);
});

test('countdowns: create, update, reorder, delete', async () => {
  const r = await run([{ op: 'countdown.create', label: 'Paper deadline', date: addDays(TODAY, 10), icon: 'calendar', color: '#2563eb', position: 0 }]);
  const id = r.created[0].countdownId;
  assert.equal(disk().countdowns[0].id, id);
  await run([{ op: 'countdown.update', id: 'Paper deadline', date: addDays(TODAY, 11) }]);
  assert.equal(disk().countdowns[0].date, addDays(TODAY, 11));
  await run([{ op: 'countdown.reorder', ids: ['cd-2'] }]);
  assert.deepEqual(disk().countdowns.map(c => c.id), ['cd-2', id, 'cd-1']);
  await rejects(run([{ op: 'countdown.update', id: 'cd-1', color: 'url(x)' }]), 'BAD_VALUE');
  const d = await run([{ op: 'countdown.delete', id: 'cd-1' }], { dryRun: true });
  await run([{ op: 'countdown.delete', id: 'cd-1' }], { confirm: d.confirm });
  assert.equal(disk().countdowns.length, 2);
});

test('tags: rename, merge and delete across tasks', async () => {
  await rejects(run([{ op: 'tag.rename', from: 'email', to: 'admin' }]), 'TAG_EXISTS', e => assert.match(e.hint, /merge_tags/));
  const r = await run([{ op: 'tag.rename', from: 'presentation', to: 'slides' }]);
  assert.equal(r.changed, 1);
  assert.deepEqual(task('u-2-bbb').tags, ['slides']);
  const ops = [{ op: 'tag.merge', from: ['money', 'corrections'], into: 'admin' }];
  await rejects(run(ops), 'NEEDS_CONFIRM');
  const d = await run(ops, { dryRun: true });
  await run(ops, { confirm: d.confirm });
  assert.deepEqual(task('u-3-ccc').tags, ['admin'], 'merged and de-duplicated');
  assert.deepEqual(task('u-1-aaa').tags, ['email', 'admin']);
  const del = [{ op: 'tag.delete', tag: 'email' }];
  const d2 = await run(del, { dryRun: true });
  await run(del, { confirm: d2.confirm });
  assert.ok(!disk().custom.some(t => t.tags.includes('email')));
  await rejects(run([{ op: 'tag.delete', tag: 'nosuchtag' }], { dryRun: true }), 'UNKNOWN_TAG');
});

// ─── Batch rules ───────────────────────────────────────────────────────────
test('a batch is atomic and reports every problem with its op index', async () => {
  const before = readFileSync(file(), 'utf8');
  const e = await rejects(run([
    { op: 'task.set_priority', id: 'u-1-aaa', priority: 'p3' },
    { op: 'task.update', id: 'u-nope', title: 'x' },
    { op: 'task.move_stream', id: 'u-2-bbb', stream: 'nowhere' },
  ]), 'NOT_FOUND');
  assert.equal(e.opIndex, 1);
  assert.equal(e.errors.length, 2);
  assert.equal(e.errors[1].code, 'UNKNOWN_STREAM');
  assert.equal(e.errors[1].opIndex, 2);
  assert.equal(readFileSync(file(), 'utf8'), before, 'nothing written');
  await rejects(run([{ op: 'task.frobnicate', id: 'u-1-aaa' }]), 'UNKNOWN_OP', e2 => assert.ok(e2.valid.includes('task.update')));
  await rejects(run([]), 'INVALID_PARAMS');
});

test('over 25 ops needs a confirm from a dry run of the same ops; stale confirms are refused', async () => {
  const ops = Array.from({ length: 26 }, (_, i) => ({ op: 'task.create', title: `Bulk task number ${i} ${'abcdefghijklmnopqrstuvwxyz'[i]}`, stream: 'work' }));
  await rejects(run(ops), 'NEEDS_CONFIRM', e => assert.match(e.reasons[0], /more than 25 ops/));
  const d = await run(ops, { dryRun: true });
  await rejects(run(ops.slice(0, 25).concat([{ ...ops[25], title: 'Something else entirely' }]), { confirm: d.confirm }), 'BAD_CONFIRM');
  await rejects(run(ops, { confirm: d.confirm.replace(/.$/, c => (c === 'A' ? 'B' : 'A')) }), 'BAD_CONFIRM');
  const r = await run(ops, { confirm: d.confirm });
  assert.equal(r.changed, 26);

  // tag rename touching > 25 tasks also needs a confirm; a change in between invalidates the preview
  const many = Array.from({ length: 26 }, (_, i) => ({ op: 'task.add_tag', id: r.created[i].id, tag: 'admin' }));
  const d2 = await run(many, { dryRun: true });
  await run(many, { confirm: d2.confirm });
  const ren = [{ op: 'tag.rename', from: 'admin', to: 'paperwork' }];
  const d3 = await run(ren, { dryRun: true });
  assert.ok(d3.reasons.some(x => /more than 25 tasks/.test(x)));
  await run([{ op: 'task.add_tag', id: 'u-2-bbb', tag: 'admin' }]);
  await rejects(run(ren, { confirm: d3.confirm }), 'PREVIEW_CHANGED', e => assert.ok(e.confirm));
});

test('idempotencyKey: the same key applies once and returns the first result', async () => {
  const ops = [{ op: 'task.create', title: 'Only once please', stream: 'work' }];
  const r1 = await run(ops, { idempotencyKey: 'abc-1' });
  const r2 = await run(ops, { idempotencyKey: 'abc-1' });
  assert.equal(r2.idempotent, true);
  assert.equal(r2.undo, r1.undo);
  assert.equal(disk().custom.filter(t => t.title === 'Only once please').length, 1);
});

test('undo round trip, conflicts, force, redo', async () => {
  const r = await run([{ op: 'task.create', title: 'Undo me', stream: 'work', ref: 'u' }, { op: 'task.set_priority', id: 'u-1-aaa', priority: 'p3' }]);
  const id = r.created[0].id;
  const dry = await a.undo(r.undo, { dryRun: true });
  assert.equal(dry.restores, 2);
  const u = await a.undo(r.undo, { source: 'mcp' });
  assert.equal(u.ok, true);
  assert.ok(!task(id));
  assert.equal(task('u-1-aaa').priority, 'p1');
  await rejects(a.undo(r.undo), 'ALREADY_UNDONE');
  await a.undo(u.undo);   // redo
  assert.equal(task(id).title, 'Undo me');
  assert.equal(task('u-1-aaa').priority, 'p3');

  const r2 = await run([{ op: 'task.update', id: 'u-2-bbb', title: 'First edit' }]);
  await run([{ op: 'task.update', id: 'u-2-bbb', priority: 'p3' }]);
  await rejects(a.undo(r2.undo), 'CONFLICT', e => assert.equal(e.conflicts[0].entity, 'task:u-2-bbb'));
  await a.undo(r2.undo, { force: true });
  assert.equal(task('u-2-bbb').title, 'Prepare slides for group meeting');
  const h = await a.query('history.list', { limit: 10 });
  assert.ok(h.history.length >= 5);
  assert.ok(h.history.every(x => x.source));
  await rejects(a.undo('undo_nope'), 'NOT_FOUND');
});

test('sanitising: control and bidi characters go, unicode and emoji stay, lengths are capped', async () => {
  const nasty = 'Hi\u0007 there‮\nnew line \u{1F680} café \u{1F468}‍\u{1F469}‍\u{1F467}';
  const r = await run([{ op: 'task.create', title: nasty, stream: 'work', detail: 'a\r\nb\u0000c\tok', allowDuplicate: true }]);
  const t = task(r.created[0].id);
  assert.equal(t.title, 'Hi there new line \u{1F680} café \u{1F468}‍\u{1F469}‍\u{1F467}');
  assert.equal(t.detail, 'a\nbc\tok');
  const long = await run([{ op: 'task.create', title: 'x'.repeat(900), stream: 'work' }]);
  assert.equal(task(long.created[0].id).title.length, 300);
  await rejects(run([{ op: 'task.create', title: '\u0001\u0002 ', stream: 'work' }]), 'BAD_VALUE');
});

test('writes keep UI keys, bump the version, and make backups', async () => {
  const v0 = disk()._lastSave;
  const r = await run([{ op: 'task.set_priority', id: 'u-2-bbb', priority: 'p1' }]);
  const s = disk();
  assert.ok(s._lastSave > v0);
  assert.equal(r.version, s._lastSave);
  assert.equal(s.view, 'today');
  assert.equal(s.theme, 'light');
  assert.ok(existsSync(join(dir, 'state', 'backups', 'daily')));
  assert.ok(readdirSync(join(dir, 'state', 'backups')).some(f => f.startsWith('state-')));
  await rejects(a.apply({ ops: [{ op: 'task.set_priority', id: 'u-2-bbb', priority: 'p2' }], ifVersion: v0 }), 'VERSION_MISMATCH');
});

test('proposals: stored, never applied by themselves, applied once on request', async () => {
  const ops = [{ op: 'task.reschedule', id: 'u-2-bbb', shiftDays: 1 }, { op: 'task.bin', id: 'u-3-ccc' }];
  const p = await a.propose({ ops, note: 'tidy up', client: 'assistant-test' });
  assert.equal(p.ok, true);
  assert.match(p.note, /Nothing has been changed/);
  assert.equal(task('u-2-bbb').dueDate, addDays(TODAY, 8));
  const got = await a.query('proposal.get', { id: p.proposalId });
  assert.equal(got.status, 'pending');
  assert.equal(got.ops.length, 2);
  const r = await a.applyProposal(p.proposalId, { source: 'assistant' });
  assert.equal(r.changed, 2, 'the user click applies it, deletes included');
  assert.equal(task('u-2-bbb').dueDate, addDays(TODAY, 9));
  await rejects(a.applyProposal(p.proposalId), 'ALREADY_APPLIED');
  assert.equal((await a.query('proposal.get', { id: p.proposalId })).status, 'applied');

  const p2 = await a.propose({ ops: [{ op: 'task.set_priority', id: 'u-5-eee', priority: 'p1' }] });
  await run([{ op: 'task.set_priority', id: 'u-5-eee', priority: 'p1' }]);
  await rejects(a.applyProposal(p2.proposalId), 'PREVIEW_CHANGED');
  await a.dismissProposal(p2.proposalId);
  assert.equal((await a.query('proposal.get', { id: p2.proposalId })).status, 'dismissed');
  await rejects(a.propose({ ops: [{ op: 'task.update', id: 'u-zzz', title: 'x' }] }), 'NOT_FOUND');
});

test('describe lists every op and query with a JSON Schema', () => {
  const d = a.describe();
  const names = d.ops.map(o => o.name);
  for (const n of ['task.create', 'task.update', 'task.complete', 'task.reopen', 'task.bin', 'task.restore', 'task.reschedule', 'task.set_priority',
    'task.move_stream', 'task.add_subtask', 'task.update_subtask', 'task.remove_subtask', 'task.add_note', 'task.link_person', 'task.unlink_person',
    'task.add_tag', 'task.remove_tag', 'person.create', 'person.update', 'countdown.create', 'countdown.update', 'countdown.delete', 'countdown.reorder',
    'tag.rename', 'tag.merge', 'tag.delete']) assert.ok(names.includes(n), n);
  for (const o of d.ops) {
    assert.equal(o.schema.type, 'object');
    assert.ok(!JSON.stringify(o.schema).includes('formatHint'));
  }
  // Area files (calendar-queries.mjs, queries-people.mjs ...) may add more queries.
  const qnames = d.queries.map(q => q.name);
  for (const n of ['calendar.list', 'context.get', 'countdowns.list', 'finance.summary', 'history.list', 'people.list', 'proposal.get', 'tags.list', 'task.get', 'tasks.find', 'tasks.list']) assert.ok(qnames.includes(n), n);
  for (const q of d.queries) assert.equal(q.schema.type, 'object', q.name);
});
