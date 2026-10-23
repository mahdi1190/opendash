// lib/sync/model.mjs: local changes -> field-level changes, and merging them
// (per-field last-writer-wins, tombstones, list positions, conflicts).
// Devices here are in-memory (no files): lib/sync/engine.mjs does the same
// steps around the state store (tests/sync-integration.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock, encodeHlc } from '../lib/sync/hlc.mjs';
import {
  capture, applyWrite, materialize, newTree, validateOp, syncedView, serializeTree, loadTree, getReg, SYNC_KEYS,
} from '../lib/sync/model.mjs';

const ID = { a: 'aaaaaaaaaaaaaaaa', b: 'bbbbbbbbbbbbbbbb', c: 'cccccccccccccccc' };
let wall = Date.UTC(2026, 9, 23, 9, 0, 0);
const now = () => wall;

function device(name, state = { custom: [] }) {
  return { id: ID[name], name, tree: newTree(), clock: createClock({ deviceId: ID[name], now }), seq: 0, seen: {}, state: structuredClone(state), conflicts: [] };
}
/** A local edit: capture what changed, stamp it, keep it. Returns the change line. */
function edit(d, fn) {
  wall += 10;
  const next = structuredClone(d.state);
  fn(next);
  const cap = capture(next, d.tree);
  d.state = next;
  if (!cap.w.length && !cap.x.length) return null;
  const op = { v: 1, dev: d.id, n: ++d.seq, h: d.clock.tick(), s: { ...d.seen }, w: cap.w, x: cap.x };
  for (const [p, v] of op.w) applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, v });
  for (const p of op.x) applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, d: true });
  return JSON.parse(JSON.stringify(op));   // as it would come out of a log file
}
/** Receive change lines from other devices, in the order given. */
function receive(d, ops) {
  const touched = new Set();
  for (const raw of ops.flat().filter(Boolean)) {
    if (raw.dev === d.id) continue;
    const v = validateOp(raw, raw.dev);
    assert.ok(v, 'a valid change line');
    const op = v.op;
    d.clock.observe(op.h);
    const onConflict = (c) => d.conflicts.push(c);
    for (const [p, val] of op.w) if (applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, v: val }, onConflict) === 'won') touched.add(p[0]);
    for (const p of op.x) if (applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, d: true }, onConflict) === 'won') touched.add(p[0]);
    d.seen[op.dev] = Math.max(d.seen[op.dev] || 0, op.n);
  }
  d.state = materialize(d.state, d.tree, [...touched]);
}
const task = (id, extra = {}) => ({ id, title: `Task ${id}`, dueDate: '2026-10-30', priority: 'p2', tags: ['email'], stream: 'work', subtasks: [], ...extra });
const find = (d, id) => d.state.custom.find(t => t.id === id);
const same = (a, b) => assert.equal(syncedView(a.state), syncedView(b.state));

/** Start two devices that share the same first copy (a's first capture holds all of it). */
function pair(state) {
  const a = device('a', state), b = device('b', { custom: [] });
  receive(b, [edit(a, () => {})]);
  same(a, b);
  return { a, b };
}
/** Everything a device knows, as change lines (the content of its snapshot.json). */
function everything(d) {
  const byOp = new Map();
  const walk = (node, path) => {
    const r = node.r;
    if (r) {
      const key = `${r.h}|${r.n}`;
      if (!byOp.has(key)) byOp.set(key, { v: 1, dev: r.h.slice(-16), n: r.n, h: r.h, s: r.s || {}, w: [], x: [] });
      if (r.d) byOp.get(key).x.push(path); else byOp.get(key).w.push([path, r.v]);
    }
    if (node.k) for (const [seg, c] of node.k) walk(c, [...path, seg]);
  };
  walk(d.tree, []);
  return JSON.parse(JSON.stringify([...byOp.values()]));
}

test('capturing a state, then materializing its registers, gives the same synced data back', () => {
  const s = {
    custom: [task('u-1', { subtasks: [{ id: 'st-1', title: 'one', done: false }, { id: 'st-2', title: 'two', done: true }] }), task('u-2')],
    statuses: { 'u-1': 'doing' }, pinned: { 'u-2': true }, notes: { 'u-1': [{ id: 'n-1', ts: 1, text: 'hello' }] },
    people: [{ id: 'sam', name: 'Sam', notes: [{ id: 'pn-1', ts: 2, text: 'likes tea' }] }], streams: [{ id: 'work', label: 'Work', color: '#333' }],
    countdowns: [{ id: 'cd-1', label: 'Launch', date: '2026-11-26' }], home: { layout: { version: 1, widgets: [] }, snoozed: { 'u-2': '2026-10-24' } },
    bin: { tasks: [{ binTs: 5, id: 'u-9', title: 'old' }], notes: [] }, daynotes: { '2026-10-23': { md: 'hi', updatedAt: 3 } },
    view: 'home', theme: 'dark',   // UI keys: never synced
  };
  const tree = newTree();
  const cap = capture(s, tree);
  for (const [p, v] of cap.w) applyWrite(tree, p, { h: encodeHlc(wall, 0, ID.a), n: 1, s: {}, v });
  assert.deepEqual(capture(s, tree), { w: [], x: [], skipped: 0 }, 'nothing left to capture');
  const back = materialize({ custom: [] }, tree);
  assert.equal(syncedView(back), syncedView(s));
  assert.equal(back.view, undefined, 'UI keys are not part of sync');
  // ...and through the serialized form (meta.json, snapshot.json).
  assert.equal(syncedView(materialize({ custom: [] }, loadTree(JSON.parse(JSON.stringify(serializeTree(tree)))))), syncedView(s));
});

test('a field edit is one small change; an unchanged state is no change at all', () => {
  const { a } = pair({ custom: [task('u-1'), task('u-2')] });
  assert.equal(edit(a, () => {}), null);
  const op = edit(a, s => { s.custom[1].title = 'Renamed'; });
  assert.deepEqual(op.w, [[['custom', 'u-2', 'title'], 'Renamed']]);
  assert.deepEqual(op.x, []);
  const del = edit(a, s => { delete s.custom[1].dueDate; });
  assert.deepEqual(del.x, [['custom', 'u-2', 'dueDate']]);
});

test('two devices editing different fields of the same task both keep their edit', () => {
  const { a, b } = pair({ custom: [task('u-1')] });
  const oa = edit(a, s => { s.custom[0].title = 'Title from A'; });
  const ob = edit(b, s => { s.custom[0].priority = 'p1'; s.custom[0].tags = ['email', 'urgent']; });
  receive(a, [ob]); receive(b, [oa]);
  same(a, b);
  assert.equal(find(a, 'u-1').title, 'Title from A');
  assert.equal(find(a, 'u-1').priority, 'p1');
  assert.deepEqual(find(b, 'u-1').tags, ['email', 'urgent']);
  assert.equal(a.conflicts.length + b.conflicts.length, 0, 'different fields never conflict');
});

test('the same field edited on both: the later edit wins everywhere, the other is a reported conflict', () => {
  const { a, b } = pair({ custom: [task('u-1')] });
  const ob = edit(b, s => { s.custom[0].title = 'B (earlier)'; });
  const oa = edit(a, s => { s.custom[0].title = 'A (later)'; });
  receive(a, [ob]); receive(b, [oa]);
  same(a, b);
  assert.equal(find(a, 'u-1').title, 'A (later)');
  // b had its own value replaced by a concurrent edit; a received a loser.
  assert.equal(b.conflicts.length, 1);
  assert.equal(b.conflicts[0].lost.v, 'B (earlier)');
  assert.equal(a.conflicts.length, 1);
  assert.equal(a.conflicts[0].kept.v, 'A (later)');
});

test('an edit made after SEEING the other one is history, not a conflict', () => {
  const { a, b } = pair({ custom: [task('u-1')] });
  const o1 = edit(a, s => { s.custom[0].title = 'first'; });
  receive(b, [o1]);
  const o2 = edit(b, s => { s.custom[0].title = 'second'; });
  receive(a, [o2]);
  same(a, b);
  assert.equal(find(a, 'u-1').title, 'second');
  assert.equal(a.conflicts.length + b.conflicts.length, 0);
});

test('delete vs edit: the delete is a tombstone that wins; restoring later brings the task back', () => {
  const { a, b } = pair({ custom: [task('u-1'), task('u-2')] });
  const del = edit(a, s => { s.custom = s.custom.filter(t => t.id !== 'u-1'); });
  const ed = edit(b, s => { s.custom[0].title = 'edited while deleted elsewhere'; });
  receive(a, [ed]); receive(b, [del]);
  same(a, b);
  assert.equal(find(a, 'u-1'), undefined);
  assert.equal(find(b, 'u-1'), undefined);
  assert.equal(getReg(b.tree, ['custom', 'u-1', '@alive']).v, false);
  // A later restore (after the delete was seen) is newer than the tombstone.
  const back = edit(b, s => { s.custom.push(task('u-1', { title: 'restored' })); });
  receive(a, [back]);
  same(a, b);
  assert.equal(find(a, 'u-1').title, 'restored');
});

test('subtasks: concurrent reorder on one device and edits on the other merge, and both lists end up identical', () => {
  const st = (n) => ({ id: `st-${n}`, title: `step ${n}`, done: false });
  const { a, b } = pair({ custom: [task('u-1', { subtasks: [st(1), st(2), st(3), st(4)] })] });
  // a moves step 4 to the top; b ticks step 2 and adds step 5 after step 1.
  const oa = edit(a, s => { const l = s.custom[0].subtasks; s.custom[0].subtasks = [l[3], l[0], l[1], l[2]]; });
  assert.equal(oa.w.filter(([p]) => p[p.length - 1] === '@pos').length, 1, 'moving one item writes one position');
  const ob = edit(b, s => { const l = s.custom[0].subtasks; l[1].done = true; l.splice(1, 0, st(5)); });
  receive(a, [ob]); receive(b, [oa]);
  same(a, b);
  assert.deepEqual(find(a, 'u-1').subtasks.map(x => x.id), ['st-4', 'st-1', 'st-5', 'st-2', 'st-3']);
  assert.equal(find(a, 'u-1').subtasks.find(x => x.id === 'st-2').done, true);
});

test('two devices moving different items keep both moves; the same item moved twice ends in one place', () => {
  const c = (n) => ({ id: `cd-${n}`, label: `C${n}` });
  const { a, b } = pair({ custom: [], countdowns: [c(1), c(2), c(3), c(4), c(5)] });
  const oa = edit(a, s => { const l = s.countdowns; s.countdowns = [l[4], l[0], l[1], l[2], l[3]]; });   // 5 to the top
  const ob = edit(b, s => { const l = s.countdowns; s.countdowns = [l[1], l[2], l[3], l[4], l[0]]; });   // 1 to the bottom
  receive(a, [ob]); receive(b, [oa]);
  same(a, b);
  assert.deepEqual(a.state.countdowns.map(x => x.id), ['cd-5', 'cd-2', 'cd-3', 'cd-4', 'cd-1']);
  const o2a = edit(a, s => { s.countdowns.push(s.countdowns.shift()); });
  const o2b = edit(b, s => { s.countdowns.unshift(s.countdowns.pop()); });
  receive(a, [o2b]); receive(b, [o2a]);
  same(a, b);
});

test('notes added to the same task on two devices are both kept', () => {
  const { a, b } = pair({ custom: [task('u-1')], notes: {} });
  const oa = edit(a, s => { s.notes['u-1'] = [{ id: 'n-a', ts: 1, text: 'from A' }]; });
  const ob = edit(b, s => { s.notes['u-1'] = [{ id: 'n-b', ts: 2, text: 'from B' }]; });
  receive(a, [ob]); receive(b, [oa]);
  same(a, b);
  assert.deepEqual(a.state.notes['u-1'].map(n => n.id).sort(), ['n-a', 'n-b']);
});

test('an offline device rejoining after many changes, delivered in any order, converges', () => {
  const tasks = Array.from({ length: 30 }, (_, i) => task(`u-${i}`, { subtasks: [{ id: `st-${i}`, title: 's', done: false }] }));
  const { a, b } = pair({ custom: tasks, statuses: {} });
  const c = device('c');
  receive(c, everything(a));            // c has the first copy, then goes offline
  same(a, c);
  const opsA = [], opsB = [];
  for (let i = 0; i < 120; i++) {
    const k = i % 30;
    opsA.push(edit(a, s => { s.custom.find(x => x.id === `u-${k}`) && (s.custom.find(x => x.id === `u-${k}`).title = `A${i}`); if (i % 7 === 0) s.statuses[`u-${k}`] = 'doing'; }));
    opsB.push(edit(b, s => {
      const t = s.custom.find(x => x.id === `u-${(k * 7) % 30}`);
      if (t) { t.priority = ['p1', 'p2', 'p3'][i % 3]; t.subtasks[0].done = !t.subtasks[0].done; }
      if (i === 60) s.custom = s.custom.filter(x => x.id !== 'u-29');
      if (i === 90) s.custom.unshift(task('u-new', { title: 'made by B' }));
    }));
    if (i % 10 === 9) { receive(a, opsB.slice(-10)); receive(b, opsA.slice(-10)); }
  }
  same(a, b);
  // c comes back: every line at once, shuffled (a cloud client delivers files
  // out of order), and then all of them again (merging is idempotent).
  const all = [...opsA, ...opsB].filter(Boolean);
  const shuffled = all.map((o, i) => [(i * 7919) % 104729, o]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  receive(c, shuffled);
  receive(c, all);
  same(a, c);
  assert.ok(find(c, 'u-new'));
  assert.equal(find(c, 'u-29'), undefined);
  assert.equal(c.state.custom[0].id, 'u-new', 'B put the new task first, and it is first everywhere');
});

test('incoming changes are checked: unknown keys, prototype keys, wrong ids and bad values are dropped', () => {
  const h = encodeHlc(wall, 0, ID.b);
  const v = validateOp({
    v: 1, dev: ID.b, n: 1, h, s: {},
    w: [
      [['custom', 'u-1', 'title'], 'ok'],
      [['custom', '__proto__', 'title'], 'x'],
      [['custom', 'u-1', '__proto__'], { polluted: true }],
      [['view'], 'home'],                                   // a UI key
      [['connections', 'google'], { ok: 1 }],               // not synced at all
      [['custom', 'u-1', 'id'], 'u-2'],                     // id must match its key
      [['custom', 'u-1', '@alive'], 'yes'],                 // must be a boolean
      [['custom', 'u-1', '@pos'], 'A!'],                    // not a position
      [['custom', 'u-1', 'apiKey'], 'abc'],                 // credential name
      [['custom', 'u-1', 'detail'], 'see sk-ant-REDACTEDREDACTEDREDACTEDxx'],   // credential-looking value
    ],
    x: [['custom', 'u-1', 'dueDate'], ['statuses']],
  }, ID.b);
  assert.deepEqual(v.op.w, [[['custom', 'u-1', 'title'], 'ok']]);
  assert.deepEqual(v.op.x, [['custom', 'u-1', 'dueDate']]);
  assert.equal(v.rejected, 10);
  assert.equal(validateOp({ v: 1, dev: ID.a, n: 1, h, w: [], x: [] }, ID.a), null, 'the clock must belong to the device');
  assert.equal(validateOp({ v: 1, dev: ID.b, n: 0, h, w: [], x: [] }, ID.b), null);
  assert.ok(SYNC_KEYS.includes('custom') && !SYNC_KEYS.includes('view'));
  // Materializing never touches Object.prototype.
  const tree = newTree();
  applyWrite(tree, ['statuses', 'u-1'], { h, n: 1, s: {}, v: 'done' });
  const out = materialize({ custom: [] }, tree, ['statuses']);
  assert.equal(out.statuses, undefined, 'a container never announced (no @alive register) is not created');
  assert.equal(({}).polluted, undefined);
});
