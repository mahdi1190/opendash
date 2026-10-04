// Sidebar list order (src/app/15-nav-order-logic.js): sorts, custom order, show N, keyboard moves. Pure, synthetic data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const code = readFileSync(join(ROOT, 'src', 'app', '15-nav-order-logic.js'), 'utf8');
// eslint-disable-next-line no-new-func
const L = new Function(`${code}\nreturn { SB_LIST_SORTS, SB_LIST_SHOWS, sbListPrefs, sbTaskStats, sbOrderItems, sbLimit, sbMoveId, sbMergeOrder };`)();

const items = [
  { id: 'a', label: 'Bravo', total: 3, open: 1, recent: 30 },
  { id: 'b', label: 'alpha', total: 9, open: 0, recent: 10 },
  { id: 'c', label: 'Charlie', total: 3, open: 4, recent: 50 },
  { id: 'd', label: 'Delta', total: 1, open: 1, recent: 20, pinned: true },
];
const ids = (xs) => xs.map(x => x.id);

test('prefs fall back to the defaults', () => {
  assert.deepEqual(L.sbListPrefs(null, { sort: 'custom', show: 0 }), { sort: 'custom', show: 0 });
  assert.deepEqual(L.sbListPrefs({ sort: 'name', show: 10 }, {}), { sort: 'name', show: 10 });
  assert.deepEqual(L.sbListPrefs({ sort: 'bogus', show: 7 }, { sort: 'open', show: 5 }), { sort: 'open', show: 5 });
});

test('sorts: pinned first, then the measure, ties by name', () => {
  assert.deepEqual(ids(L.sbOrderItems(items, 'total')), ['d', 'b', 'a', 'c']);
  assert.deepEqual(ids(L.sbOrderItems(items, 'open')), ['d', 'c', 'a', 'b']);
  assert.deepEqual(ids(L.sbOrderItems(items, 'name')), ['d', 'b', 'a', 'c']);
  assert.deepEqual(ids(L.sbOrderItems(items, 'recent')), ['d', 'c', 'a', 'b']);
});

test('custom: pinned first, then the saved order, unknown ids after in their natural order', () => {
  assert.deepEqual(ids(L.sbOrderItems(items, 'custom', ['c', 'a'])), ['d', 'c', 'a', 'b']);
  assert.deepEqual(ids(L.sbOrderItems(items, 'custom', [])), ['d', 'a', 'b', 'c']);
  assert.deepEqual(ids(L.sbOrderItems(items, 'custom', ['c', 'a', 'd'])), ['d', 'c', 'a', 'b']);
});

test('show N keeps the open item and counts the rest', () => {
  assert.deepEqual(L.sbLimit(items, 0, false).hidden, 0);
  const r = L.sbLimit(items, 2, false, 'd');
  assert.deepEqual(ids(r.shown), ['a', 'b', 'd']);
  assert.equal(r.hidden, 1);
  assert.equal(L.sbLimit(items, 2, true).shown.length, 4);
});

test('keyboard move and drag merge', () => {
  assert.deepEqual(L.sbMoveId(['a', 'b', 'c'], 'b', -1), ['b', 'a', 'c']);
  assert.deepEqual(L.sbMoveId(['a', 'b', 'c'], 'a', -1), ['a', 'b', 'c']);
  assert.deepEqual(L.sbMergeOrder(['b', 'a'], ['a', 'b', 'c', 'd']), ['b', 'a', 'c', 'd']);
});

test('task stats: total, open and the newest activity per key', () => {
  const tasks = [
    { id: 't1', stream: 's', createdAt: '2026-01-01T00:00:00Z' },
    { id: 't2', stream: 's', createdAt: '2026-01-02T00:00:00Z', done: true },
    { id: 't3', stream: 'x' },
  ];
  const st = L.sbTaskStats(tasks, { keysOf: (t) => [t.stream], isOpen: (t) => !t.done, activity: { t1: [{ ts: 5e12 }] }, completions: { t3: [7] } });
  assert.deepEqual(st.get('s'), { total: 2, open: 1, recent: 5e12 });
  assert.deepEqual(st.get('x'), { total: 1, open: 1, recent: 7 });
});
