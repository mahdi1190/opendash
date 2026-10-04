// Home's Focus widget (12-home-w-focus.js, 12-home-focus-card.js): the subtask
// progress the rows and the open card show, which cards are open (UI state,
// never data), "done today", "worth pulling forward", the free stretch in the
// open card's Time, Snooze until a day, the retired sheet's old entry point,
// and the actions-layer side of snoozing (set_home_focus hideUntil).
// Synthetic data only.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir, TODAY, addDays } from './fixtures/actions-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const HOME_FILES = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort();
const plain = (x) => JSON.parse(JSON.stringify(x));
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const LOCAL_TODAY = fmt(new Date());
const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return fmt(d); };

/* ───────── the page's Home files in a VM, in build order, with a small stand-in for the app ───────── */
function focusBox(st) {
  const calls = { saveData: 0, saveUI: 0, render: 0, toasts: [] };
  const state = Object.assign({ custom: [], statuses: {}, pinned: {}, deleted: {}, completionLog: {}, home: {}, homeUI: {} }, st || {});
  const daysUntil = (s) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(y, m - 1, d) - t) / 86400000); };
  const box = {
    console, state, APP_CONFIG: { locale: 'en-GB', features: {} }, STREAMS: { work: { label: 'Work', color: '#2563eb' } },
    window: { addEventListener() {}, Motion: null }, CSS: { escape: (s) => s },
    document: { hidden: false, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, activeElement: null },
    registerSection() {}, render() { calls.render++; }, saveData() { calls.saveData++; }, saveUI() { calls.saveUI++; },
    toast(msg) { calls.toasts.push(msg); }, undo() {},
    fmtDate: fmt, todayStr: () => LOCAL_TODAY, daysUntil, dueLabel: (s) => s,
    getItem: (id) => state.custom.find(t => t.id === id), getAllItems: () => state.custom.filter(t => !state.deleted[t.id]),
    statusOf: (id) => state.statuses[id] || 'todo', isPinned: (id) => !!state.pinned[id],
    isWontDo: (t) => t.resolution === 'wontdo',
    effDate: (t) => t.dueDate || null, effPriority: (t) => t.priority || 'p0', effStream: (t) => t.stream, effTags: (t) => t.tags || [],
    effTitle: (t) => t.title, effDetail: (t) => t.detail || '', getSubtasks: (id) => (state.custom.find(t => t.id === id) || {}).subtasks || [],
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock: wall times in the dashboard's zone (travel spec 2.7)
  vm.runInContext(HOME_FILES.map(f => readFileSync(join(APP, f), 'utf8')).join('\n'), box, { filename: 'home-bundle.js' });
  return { box, state, calls, run: (code) => vm.runInContext(code, box) };
}
const task = (id, extra) => Object.assign({ id, title: 'Task ' + id, stream: 'work', priority: 'p0', subtasks: [] }, extra || {});

test('the old sheet is gone and the Focus files load without running page code', () => {
  assert.ok(!existsSync(join(APP, '12-home-sheet.js')), '12-home-sheet.js is retired');
  assert.ok(!existsSync(join(ROOT, 'src', 'styles', '13-home-w-sheet.css')), 'its CSS too');
  assert.ok(HOME_FILES.includes('12-home-focus-card.js'));
  const { run } = focusBox();
  for (const fn of ['homeFocusProgress', 'homeFocusToggle', 'homeFocusCollapseAll', 'homeFocusDone', 'homeFocusSnooze', 'homeFocusFreeSlot', 'homeFocusDoneToday', 'homeFocusPullForward', 'homeOpenSheet']) {
    assert.equal(run(`typeof ${fn}`), 'function', fn);
  }
  // Nobody uses the sheet's internals any more.
  for (const f of readdirSync(APP).filter(n => n.endsWith('.js'))) {
    const src = readFileSync(join(APP, f), 'utf8');
    assert.ok(!/homeCloseSheet|_homeSheetRefresh|\.home-sheet\b(?!-)/.test(src.replace(/document\.querySelector\('\.home-sheet'\)/g, '')), `${f} still uses the retired sheet`);
  }
});

test('progress: done / total, percent, the next open subtask, all done; junk ignored', () => {
  const { run } = focusBox();
  const p = (subs) => plain(run(`homeFocusProgress(${JSON.stringify(subs)})`));
  assert.deepEqual(p([]), { total: 0, done: 0, open: 0, pct: 0, next: null, label: '', allDone: false });
  assert.deepEqual(p(undefined), { total: 0, done: 0, open: 0, pct: 0, next: null, label: '', allDone: false });
  const three = [{ id: 'a', done: true }, { id: 'b', done: false }, { id: 'c', done: false }];
  assert.deepEqual(p(three), { total: 3, done: 1, open: 2, pct: 33, next: 'b', label: '1/3', allDone: false });
  assert.equal(p([{ id: 'a', done: false }, { id: 'b', done: true }]).next, 'a', 'the first open one, wherever the done ones are');
  assert.deepEqual(p([{ id: 'a', done: true }, { id: 'b', done: true }]), { total: 2, done: 2, open: 0, pct: 100, next: null, label: '2/2', allDone: true });
  assert.equal(p([null, 'x', { id: 'a', done: true }, 3]).total, 1, 'non-objects are not subtasks');
  assert.equal(p([{ id: 'a', done: true }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }, { id: 'g' }]).pct, 14);
});

test('which cards are open is UI state (homeUI.expanded): survives re-renders, never touches data', () => {
  const { run, state, calls } = focusBox({ custom: [task('t1'), task('t2'), task('t3')], statuses: { t3: 'done' } });
  const before = JSON.stringify(Object.assign({}, state, { homeUI: undefined }));
  // No card on screen (another view, or not rendered yet): the set still changes, so Home opens it next time.
  assert.equal(run(`homeFocusToggle('t1', true)`), true);
  assert.equal(run(`homeFocusToggle('t2')`), true);
  assert.deepEqual(plain(state.homeUI.expanded), ['t1', 't2']);
  assert.ok(calls.saveUI >= 2); assert.equal(calls.saveData, 0, 'opening a card is not an undo step');
  // A fresh render reads the same set (the ctx every widget render gets).
  assert.deepEqual([...run(`_homeExpandedSet()`)].sort(), ['t1', 't2']);
  assert.equal(run(`homeIsExpanded('t1')`), true);
  assert.equal(run(`homeFocusToggle('t1', false)`), false);
  assert.deepEqual(plain(state.homeUI.expanded), ['t2']);
  // A done task is never kept open.
  run(`homeFocusToggle('t3', true)`);
  assert.deepEqual(plain(state.homeUI.expanded), ['t2']);
  // Collapse all also forgets cards that are not on screen now.
  run(`homeFocusToggle('t1', true)`);
  run(`homeFocusCollapseAll()`);
  assert.deepEqual(plain(state.homeUI.expanded), []);
  assert.equal(JSON.stringify(Object.assign({}, state, { homeUI: undefined })), before, 'no data key changed');
  assert.equal(calls.saveData, 0);
});

test('"done today": completed today and shown in Focus (or still matching its rules); oldest first', () => {
  const now = Date.now(), yesterday = now - 36 * 3600e3;
  const { run } = focusBox({
    custom: [task('pin', { title: 'Pinned one' }), task('plain'), task('shown'), task('old'), task('wont', { resolution: 'wontdo' }), task('open', { dueDate: LOCAL_TODAY })],
    statuses: { pin: 'done', plain: 'done', shown: 'done', old: 'done', wont: 'done' },
    pinned: { pin: true },
    completionLog: { pin: [now - 2000], plain: [now - 1000], shown: [now - 3000], old: [yesterday], wont: [now], open: [now - 5000] },
  });
  const ids = (shown) => plain(run(`homeFocusDoneToday(new Set(${JSON.stringify(shown)})).map(d => d.item.id)`));
  assert.deepEqual(ids([]), ['pin'], 'pinned still qualifies; an ordinary task does not');
  assert.deepEqual(ids(['shown', 'plain']), ['shown', 'pin', 'plain'], 'shown in Focus today counts; oldest first');
  assert.ok(!ids(['old', 'wont', 'open']).some(x => ['old', 'wont', 'open'].includes(x)), 'yesterday, won\'t do and still-open tasks are not "done today"');
});

test('worth pulling forward: the nearest due, a quick one, the most important; never hidden or done ones', () => {
  const { run, state } = focusBox({
    custom: [
      task('soon', { dueDate: plus(2) }), task('later', { dueDate: plus(9) }),
      task('quick', { estimate: 10 }), task('slow', { estimate: 90 }),
      task('p1', { priority: 'p1' }), task('done', { priority: 'p1' }), task('snoozed', { dueDate: plus(1) }),
      task('future', { startDate: plus(5), priority: 'p1' }),
    ],
    statuses: { done: 'done' },
    home: { snoozed: { snoozed: LOCAL_TODAY } },
  });
  const pick = () => plain(run(`homeFocusPullForward(3).map(p => p.item.id)`));
  assert.deepEqual(pick(), ['soon', 'quick', 'p1']);
  state.homeUI = { notNow: { day: LOCAL_TODAY, ids: ['quick'] } };
  assert.ok(!pick().includes('quick'), '"Not now" holds for today');
  state.homeUI = { notNow: { day: '2000-01-01', ids: ['quick'] } };
  assert.ok(pick().includes('quick'), '...and only today');
});

test('the open card\'s free stretch: the first gap that fits, from now (not before 08:00) to the evening', () => {
  const { run } = focusBox();
  const slot = (evs, from, need, until) => plain(run(`homeFocusFreeSlot(${JSON.stringify(evs)}, ${JSON.stringify(from)}, ${need}, ${JSON.stringify(until)})`));
  const day = [{ start: '09:00', end: '10:00' }, { start: '10:30', end: '12:00' }, { start: '14:00', end: '15:00' }];
  assert.deepEqual(slot(day, '07:10', 60, '19:00'), { start: '08:00', end: '09:00', minutes: 60 }, 'never before 08:00; an exact fit counts');
  assert.deepEqual(slot(day, '07:10', 75, '19:00'), { start: '12:00', end: '14:00', minutes: 120 }, 'the first gap that is long enough');
  assert.deepEqual(slot(day, '11:05', 90, '19:00'), { start: '12:00', end: '14:00', minutes: 120 }, 'inside a meeting: from its end');
  assert.deepEqual(slot(day, '13:20', 60, '19:00'), { start: '15:00', end: '19:00', minutes: 240 }, '13:30-14:00 is too short');
  assert.deepEqual(slot(day, '12:52', 45, '19:00'), { start: '13:00', end: '14:00', minutes: 60 }, 'starts on the next quarter hour');
  assert.equal(slot(day, '18:30', 60, '19:00'), null, 'nothing left today');
  assert.deepEqual(slot([], '10:00', 60, '19:00'), { start: '10:00', end: '19:00', minutes: 540 }, 'an empty calendar');
  assert.deepEqual(slot([{ start: '10:00' }, { start: 'junk' }, null], '10:00', 60, '19:00'), { start: '10:30', end: '19:00', minutes: 510 }, 'no end = 30 minutes; junk ignored');
  assert.deepEqual(slot([{ start: '08:00', end: '18:30' }], '08:00', 30, '19:00'), { start: '18:30', end: '19:00', minutes: 30 });
});

test('Snooze until a day: stored as the last hidden day, one undo step, toast says when it is back', () => {
  const { run, state, calls } = focusBox({ custom: [task('t1'), task('t2')] });
  run(`homeFocusSnooze('t1', ${JSON.stringify(plus(4))}, null)`);
  assert.equal(state.home.snoozed.t1, plus(3), 'hidden through the day before it comes back');
  assert.equal(calls.saveData, 1);
  assert.match(calls.toasts.at(-1), /Hidden from Focus until /);
  run(`homeFocusSnooze('t2', null, null)`);
  assert.equal(state.home.snoozed.t2, LOCAL_TODAY, 'default: back tomorrow');
  assert.match(calls.toasts.at(-1), /until tomorrow/);
  run(`homeFocusSnooze('t2', ${JSON.stringify(LOCAL_TODAY)}, null)`);
  assert.equal(state.home.snoozed.t2, LOCAL_TODAY, 'a day that is not after today means tomorrow');
  // homeFocusTasks leaves them out until then.
  state.home.focus = { pinned: true }; state.pinned = { t1: true, t2: true };
  assert.deepEqual(plain(run(`homeFocusTasks().map(f => f.i.id)`)), []);
  state.home.snoozed = { t1: plus(-1) };
  assert.deepEqual(plain(run(`homeFocusTasks().map(f => f.i.id)`)).sort(), ['t1', 't2'], 'an old snooze has run out');
});

test('homeOpenSheet (the retired sheet\'s name) opens the full card when Focus is not on screen', () => {
  const { run, box } = focusBox({ custom: [task('t1')], view: 'brief' });
  const opened = [];
  box.openTask = (id, o) => { opened.push([id, !!(o && 'from' in o)]); return 'card'; };
  assert.equal(run(`homeOpenSheet('t1', null)`), 'card');
  assert.deepEqual(opened, [['t1', true]]);
  assert.equal(run(`homeOpenSheet('nope', null)`), false);
  // Without the centre card: the side panel.
  delete box.openTask;
  const sel = []; box.selectTask = (id) => sel.push(id);
  run(`homeOpenSheet('t1', null)`);
  assert.deepEqual(sel, ['t1']);
  // Home's own "Open full card" never falls back to a sheet.
  assert.doesNotMatch(readFileSync(join(APP, '12-home.js'), 'utf8'), /homeOpenSheet\(/);
});

test('Focus markup: no raw user text, inline handlers or personal data', () => {
  for (const f of ['12-home-w-focus.js', '12-home-focus-card.js']) {
    const src = readFileSync(join(APP, f), 'utf8');
    assert.doesNotMatch(src, /\son[a-z]+="/i, f + ': inline handler');
    assert.doesNotMatch(src, /\$\{(?:effTitle|effDetail)\([^)]*\)\}/, f + ': a title or description put into markup without esc()');
    assert.doesNotMatch(src, /\$\{(?:s|p|it|item)\.(?:title|name|label)\}/, f + ': a name put into markup without esc()');
  }
});

/* ───────────────────────────── set_home_focus hideUntil ───────────────────────────── */
let dir, a;
beforeEach(() => { dir = makeDataDir(); a = createActions({ dataDir: dir }); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const disk = () => JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
const runOps = (ops, extra = {}) => a.apply({ ops, source: 'mcp', client: 'test', ...extra });
const rejects = async (p, code) => {
  try { await p; } catch (e) { assert.equal(e.code, code, `${e.code}: ${e.message}`); return e; }
  assert.fail(`expected ${code}`);
};

test('set_home_focus hideUntil: snooze until a day (the page\'s Snooze menu), validated, undoable', async () => {
  const before = await a.query('home.focus');
  const id = before.tasks[0].id;
  const due0 = disk().custom.find(x => x.id === id).dueDate;
  const back = addDays(TODAY, 5);
  const r = await runOps([{ op: 'home.set_focus', hide: [id], hideUntil: back }]);
  assert.equal(disk().home.snoozed[id], addDays(TODAY, 4), 'stored as the last hidden day');
  assert.ok((r.preview || []).flatMap(p => p.changes || []).some(c => c.field === 'hidden' && String(c.to).includes(back)), JSON.stringify(r.preview));
  const q = await a.query('home.focus');
  assert.ok(!q.tasks.some(t => t.id === id));
  assert.equal(q.hiddenToday, 1);
  // The due date is untouched: snoozing is not rescheduling.
  assert.equal(disk().custom.find(x => x.id === id).dueDate, due0);
  // Validation
  await rejects(runOps([{ op: 'home.set_focus', hideUntil: back }]), 'BAD_VALUE');
  await rejects(runOps([{ op: 'home.set_focus', hide: [id], hideUntil: TODAY }]), 'BAD_VALUE');
  await rejects(runOps([{ op: 'home.set_focus', hide: [id], hideUntil: 'next monday' }]), 'INVALID_PARAMS');
  await rejects(runOps([{ op: 'home.set_focus', hide: [id], hideUntil: '2026-02-30' }]), 'BAD_DATE');
  // Plain hide keeps its meaning (until tomorrow); undo puts the old snooze back.
  const r2 = await runOps([{ op: 'home.set_focus', hide: [id] }]);
  assert.equal(disk().home.snoozed[id], TODAY);
  await a.undo(r2.undo, { force: true });
  assert.equal(disk().home.snoozed[id], addDays(TODAY, 4));
  await runOps([{ op: 'home.set_focus', unhide: [id] }]);
  assert.equal(disk().home.snoozed[id], undefined);
});
