// The page's three-way merge (src/app/86-live-sync.js, syncMerge3/syncResolve),
// loaded into a VM: it must be pure and must never lose an edit silently.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', '86-live-sync.js');
const box = {};
vm.createContext(box);
vm.runInContext(readFileSync(SRC, 'utf8'), box, { filename: '86-live-sync.js' });
const { syncMerge3, syncResolve } = box;
const plain = (x) => JSON.parse(JSON.stringify(x));
const merge = (b, l, r, opts) => plain(syncMerge3(plain(b), plain(l), plain(r), opts));

const T = (id, extra = {}) => ({ id, title: 'Task ' + id, dueDate: null, priority: 'p0', tags: [], subtasks: [], ...extra });
const base = () => ({
  custom: [T('a'), T('b', { tags: ['x', 'y'] }), T('c', { subtasks: [{ id: 's1', title: 'one', done: false }, { id: 's2', title: 'two', done: false }] })],
  statuses: { a: 'todo' }, notes: { a: [{ id: 'n1', ts: 1, text: 'hello' }] }, countdowns: [{ id: 'k1', label: 'K', date: '2030-01-01' }],
  view: 'today', _lastSave: 1,
});

test('loads without a browser and exposes pure functions', () => {
  assert.equal(typeof syncMerge3, 'function');
  assert.equal(typeof syncResolve, 'function');
});

test('identical sides and one-sided edits merge without conflicts', () => {
  const b = base();
  const l = base(); l.custom[0].title = 'Local title';
  const r = base(); r.custom[1].priority = 'p1'; r.statuses.b = 'done';
  const { merged, conflicts } = merge(b, l, r);
  assert.equal(conflicts.length, 0);
  assert.equal(merged.custom[0].title, 'Local title');
  assert.equal(merged.custom[1].priority, 'p1');
  assert.equal(merged.statuses.b, 'done');
  assert.deepEqual(merge(b, b, b).merged, b);
});

test('different fields of the SAME task merge field by field', () => {
  const b = base();
  const l = base(); l.custom[0].title = 'Mine'; l.custom[0].detail = 'added here';
  const r = base(); r.custom[0].dueDate = '2030-05-05'; r.custom[0].priority = 'p2';
  const { merged, conflicts } = merge(b, l, r);
  assert.equal(conflicts.length, 0);
  assert.deepEqual([merged.custom[0].title, merged.custom[0].detail, merged.custom[0].dueDate, merged.custom[0].priority], ['Mine', 'added here', '2030-05-05', 'p2']);
});

test('a true same-field conflict is reported, keeps mine by default, and can be resolved to theirs', () => {
  const b = base();
  const l = base(); l.custom[0].title = 'Mine'; l.custom[1].title = 'Only mine';
  const r = base(); r.custom[0].title = 'Theirs';
  const res = syncMerge3(plain(b), plain(l), plain(r));
  assert.equal(res.conflicts.length, 1);
  assert.deepEqual(plain(res.conflicts[0].path), ['custom', { id: 'a' }, 'title']);
  assert.equal(res.merged.custom[0].title, 'Mine');
  assert.ok(syncResolve(res.merged, res.conflicts[0], 'remote'));
  assert.equal(res.merged.custom[0].title, 'Theirs');
  assert.equal(res.merged.custom[1].title, 'Only mine', 'the rest is untouched');
});

test('the same change on both sides is not a conflict', () => {
  const b = base();
  const l = base(); l.custom[2].subtasks[0].done = true;
  const r = base(); r.custom[2].subtasks[0].done = true;
  assert.equal(merge(b, l, r).conflicts.length, 0);
});

test('tasks added on both sides are all kept, in a sensible order', () => {
  const b = base();
  const l = base(); l.custom.push(T('mine1'));
  const r = base(); r.custom.splice(1, 0, T('theirs1')); r.custom.push(T('theirs2'));
  const { merged, conflicts } = merge(b, l, r);
  assert.equal(conflicts.length, 0);
  assert.deepEqual(merged.custom.map(t => t.id), ['a', 'theirs1', 'b', 'c', 'theirs2', 'mine1']);
});

test('deletes: clean ones apply; delete vs edit is a conflict and nothing is lost', () => {
  const b = base();
  const l = base(); l.custom = l.custom.filter(t => t.id !== 'a');            // I deleted a
  const r = base(); r.custom = r.custom.filter(t => t.id !== 'b');            // they deleted b
  const m = merge(b, l, r);
  assert.equal(m.conflicts.length, 0);
  assert.deepEqual(m.merged.custom.map(t => t.id), ['c']);

  const l2 = base(); l2.custom = l2.custom.filter(t => t.id !== 'a');        // I deleted a
  const r2 = base(); r2.custom[0].title = 'edited elsewhere';                 // they edited a
  const res = syncMerge3(plain(b), plain(l2), plain(r2));
  assert.equal(res.conflicts.length, 1);
  assert.equal(res.conflicts[0].kind, 'deleted-locally');
  syncResolve(res.merged, res.conflicts[0], 'remote');
  assert.ok(res.merged.custom.some(t => t.id === 'a' && t.title === 'edited elsewhere'));

  const l3 = base(); l3.custom[1].title = 'edited here';
  const r3 = base(); r3.custom = r3.custom.filter(t => t.id !== 'b');
  const res3 = syncMerge3(plain(b), plain(l3), plain(r3));
  assert.equal(res3.conflicts[0].kind, 'deleted-remotely');
  assert.ok(res3.merged.custom.some(t => t.id === 'b'), 'my edit survives by default');
});

test('tag lists merge as sets; map entries and notes merge per key and id', () => {
  const b = base();
  const l = base(); l.custom[1].tags = ['x', 'y', 'mine'];                    // added
  const r = base(); r.custom[1].tags = ['y', 'theirs'];                       // removed x, added theirs
  l.notes.a.push({ id: 'n2', ts: 2, text: 'my note' });
  r.notes.a[0].text = 'hello edited';
  r.notes.c = [{ id: 'n3', ts: 3, text: 'new' }];
  l.statuses.c = 'doing';
  const { merged, conflicts } = merge(b, l, r);
  assert.equal(conflicts.length, 0);
  assert.deepEqual(merged.custom[1].tags, ['y', 'mine', 'theirs']);
  assert.deepEqual(merged.notes.a.map(n => n.text), ['hello edited', 'my note']);
  assert.equal(merged.notes.c.length, 1);
  assert.equal(merged.statuses.c, 'doing');
});

test('reordering on one side is kept while the other side edits', () => {
  const b = base();
  const l = base(); l.countdowns.push({ id: 'k2', label: 'L', date: '2031-01-01' });
  const r = base(); r.custom.reverse();
  const { merged } = merge(b, l, r);
  assert.deepEqual(merged.custom.map(t => t.id), ['c', 'b', 'a']);
  assert.equal(merged.countdowns.length, 2);
});

test('skipped keys (UI) come from this tab; an unknown base never drops anything', () => {
  const b = base();
  const l = base(); l.view = 'week';
  const r = base(); r.view = 'calendar'; r.custom[0].title = 'theirs';
  const { merged } = merge(b, l, r, { skip: ['view', '_lastSave'] });
  assert.equal(merged.view, 'week');
  assert.equal(merged.custom[0].title, 'theirs');

  const l2 = base(); l2.custom.push(T('mine')); l2.custom[0].title = 'mine';
  const r2 = base(); r2.custom.push(T('theirs')); r2.custom[0].title = 'theirs';
  const res = syncMerge3(null, plain(l2), plain(r2));
  assert.deepEqual(plain(res.merged.custom.map(t => t.id).sort()), ['a', 'b', 'c', 'mine', 'theirs']);
  assert.equal(res.conflicts.length, 1);
});

test('a big realistic state merges quickly', () => {
  const big = { custom: Array.from({ length: 400 }, (_, i) => T('t' + i, { tags: ['a', 'b'], subtasks: [{ id: 's' + i, title: 'x', done: false }] })), statuses: {}, notes: {} };
  const l = plain(big); l.custom[10].title = 'L'; l.custom.push(T('new'));
  const r = plain(big); r.custom[20].priority = 'p1'; r.statuses.t5 = 'done';
  const t0 = Date.now();
  const { merged, conflicts } = merge(big, l, r);
  assert.ok(Date.now() - t0 < 1500);
  assert.equal(conflicts.length, 0);
  assert.equal(merged.custom.length, 401);
});
