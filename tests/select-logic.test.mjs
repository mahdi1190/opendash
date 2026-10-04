// The shared select list's pure rules and the proposal-subset rules
// (src/app/11-ui-select-logic.js, loaded through lib/select-logic.mjs exactly
// as the actions layer uses them): ranges, select all / none / invert with
// locked rows, keeping ticks across re-renders, the $ref dependency closure
// (tick a change -> its prerequisites; untick -> its dependants) and the
// subset remap (indices back to the proposal's numbers, refs to applied ops
// replaced by the ids they created).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SOURCE_FILE, selRange, selSet, selAllIds, selInvertIds, selState, selKeep, selCountText,
  opsRefOf, opsRefDeps, opsTickClosure, opsUntickClosure, opsSubset, opsRemapPreview,
} from '../lib/select-logic.mjs';

test('the shared file stays pure: no DOM, no page globals', () => {
  const src = readFileSync(SOURCE_FILE, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const bad of [/\bdocument\./, /\bwindow\./, /\bstate\./, /\bfetch\(/, /\brender\(/, /\bsaveData\(/, /\blocalStorage\b/]) assert.ok(!bad.test(src), `uses ${bad}`);
});

/* ---------- selection ---------- */
const ORDER = ['a', 'b', 'c', 'd', 'e'];

test('shift-click ranges run either way and fall back to the clicked row', () => {
  assert.deepEqual(selRange(ORDER, 'b', 'd'), ['b', 'c', 'd']);
  assert.deepEqual(selRange(ORDER, 'd', 'b'), ['b', 'c', 'd']);
  assert.deepEqual(selRange(ORDER, 'c', 'c'), ['c']);
  assert.deepEqual(selRange(ORDER, 'gone', 'c'), ['c'], 'the anchor row is no longer shown');
  assert.deepEqual(selRange(ORDER, 'a', 'gone'), []);
});

test('tick / untick report what changed and never touch locked rows', () => {
  const on = new Set(['a']);
  const locked = new Set(['c']);
  assert.deepEqual(selSet(on, ['a', 'b', 'c'], true, locked), ['b']);
  assert.deepEqual([...on].sort(), ['a', 'b']);
  assert.deepEqual(selSet(on, ['a', 'c', 'd'], false, locked), ['a']);
  assert.deepEqual([...on], ['b']);
  assert.deepEqual(selSet(on, ['b'], true), [], 'already ticked: no change');
});

test('select all, invert and the master box skip locked (applied) rows', () => {
  const locked = new Set(['e']);
  const on = new Set(['a', 'b']);
  assert.deepEqual(selAllIds(ORDER, on, locked), ['a', 'b', 'c', 'd']);
  assert.deepEqual(selInvertIds(ORDER, on, locked), ['c', 'd']);
  assert.equal(selState(ORDER, on, locked), 'some');
  assert.equal(selState(ORDER, new Set(), locked), 'none');
  assert.equal(selState(ORDER, new Set(['a', 'b', 'c', 'd']), locked), 'all', 'locked rows do not count');
  assert.equal(selState(['e'], new Set(), locked), 'none', 'nothing left to tick');
  assert.equal(selCountText(2, 5), '2 of 5 selected');
});

test('ticks survive a re-render; gone rows are forgotten; new rows get the default', () => {
  const on = new Set(), seen = new Set();
  selKeep(['a', 'b', 'c'], on, seen, () => true);
  assert.deepEqual([...on], ['a', 'b', 'c'], 'proposals start all ticked');
  on.delete('b');
  selKeep(['a', 'b', 'c', 'd'], on, seen, (id) => id !== 'd');
  assert.deepEqual([...on].sort(), ['a', 'c'], 'b stays unticked; d is new and its default is off');
  selKeep(['a', 'd'], on, seen, () => true);
  assert.deepEqual([...on], ['a'], 'c left the list');
  selKeep(['a', 'c'], on, seen, () => true);
  assert.deepEqual([...on], ['a'], 'a row seen before does not get its default again');
});

/* ---------- proposal dependencies ---------- */
// 0 create (ref w)  1 subtask on $w  2 other task  3 due date of $w  4 create (ref x) with a subtask on $w  5 note on $x
const OPS = [
  { op: 'task.create', title: 'Workshop', ref: 'w' },
  { op: 'task.add_subtask', id: '$w', title: 'Book a room' },
  { op: 'task.set_priority', id: 'u-2', priority: 'p1' },
  { op: 'task.update', params: { id: '$w', dueDate: '2026-10-09' } },
  { op: 'task.create', title: 'Catering', ref: 'x', relatedTo: ['$w'] },
  { op: 'task.add_note', id: '$x', text: 'Ask for options' },
];

test('refs: an op defines one with ref, later ops use $name at any depth', () => {
  assert.equal(opsRefOf(OPS[0]), 'w');
  assert.equal(opsRefOf(OPS[1]), null);
  assert.equal(opsRefOf({ op: 'task.create', params: { ref: 'p' } }), 'p', 'the {op, params} shape');
  assert.equal(opsRefOf({ op: 'task.create', ref: 'bad ref!' }), null);
  assert.deepEqual(opsRefDeps(OPS), [[], [0], [], [0], [0], [4]]);
  // A ref used before it is defined is not a dependency; a reused name points at the latest definition.
  assert.deepEqual(opsRefDeps([{ op: 'a', id: '$k' }, { op: 'b', ref: 'k' }, { op: 'c', ref: 'k' }, { op: 'd', id: '$k' }]), [[], [], [], [2]]);
  assert.deepEqual(opsRefDeps(null), []);
  assert.deepEqual(opsRefDeps([{ op: 'x', id: '$' }, { op: 'y', text: 'costs $5' }]), [[], []], 'plain dollar text is not a ref');
});

test('ticking a change ticks what it needs; unticking one unticks what needs it (transitively)', () => {
  const deps = opsRefDeps(OPS);
  assert.deepEqual(opsTickClosure(deps, 5), [0, 4, 5]);
  assert.deepEqual(opsTickClosure(deps, 2), [2]);
  assert.deepEqual(opsUntickClosure(deps, 0), [0, 1, 3, 4, 5]);
  assert.deepEqual(opsUntickClosure(deps, 4), [4, 5]);
  assert.deepEqual(opsUntickClosure(deps, 5), [5]);
  // cycles (never valid, but must not hang)
  assert.deepEqual(opsTickClosure([[1], [0]], 0), [0, 1]);
});

/* ---------- the subset remap ---------- */
test('a subset brings its prerequisites and keeps the proposal\'s numbers in index', () => {
  const s = opsSubset(OPS, [5, 2]);
  assert.deepEqual(s.index, [0, 2, 4, 5]);
  assert.deepEqual(s.added, [0, 4]);
  assert.deepEqual(s.missing, []);
  assert.deepEqual(s.ops.map(o => o.op), ['task.create', 'task.set_priority', 'task.create', 'task.add_note']);
  assert.equal(s.ops[3].id, '$x', 'refs to ops in the same batch stay refs');
  assert.notEqual(s.ops[0], OPS[0], 'the ops are copies');
});

test('refs to ops applied earlier become the ids they created; applied ops are left out', () => {
  const s = opsSubset(OPS, [1, 3, 5], { applied: [0, 4], createdIds: { 0: 'u-new-w', 4: 'u-new-x' } });
  assert.deepEqual(s.index, [1, 3, 5]);
  assert.deepEqual(s.added, []);
  assert.equal(s.ops[0].id, 'u-new-w');
  assert.equal(s.ops[1].params.id, 'u-new-w', 'inside params too');
  assert.equal(s.ops[2].id, 'u-new-x');
  assert.deepEqual(OPS[1].id, '$w', 'the stored ops are not changed');
  // the ref field itself is never rewritten
  const again = opsSubset(OPS, [4], { applied: [0], createdIds: { 0: 'u-new-w' } });
  assert.equal(again.ops[0].ref, 'x');
  assert.deepEqual(again.ops[0].relatedTo, ['u-new-w']);
});

test('an applied prerequisite whose id is unknown is reported, not guessed', () => {
  const s = opsSubset(OPS, [1], { applied: [0], createdIds: {} });
  assert.deepEqual(s.missing, ['w']);
  assert.equal(s.ops[0].id, '$w');
});

test('a subset of nothing new, and numbers that do not exist', () => {
  assert.deepEqual(opsSubset(OPS, [0], { applied: [0] }).ops, []);
  assert.match(opsSubset(OPS, [9]).error, /no change number 9/);
  assert.match(opsSubset(OPS, ['x']).error, /no change number x/);
  assert.match(opsSubset(OPS, [-1]).error, /no change number -1/);
});

test('a subset\'s preview and errors map back to the proposal\'s numbers', () => {
  const index = [0, 2, 4, 5];
  const back = opsRemapPreview([{ index: 0, op: 'task.create' }, { index: 3, op: 'task.add_note' }, { op: 'no index' }, null], index);
  assert.deepEqual(back.map(p => p && p.index), [0, 5, undefined, null]);
  assert.deepEqual(opsRemapPreview(null, index), []);
});
