// Home widget "gap" (Fill the gap, WIDGETS_CATALOGUE.md 3.2): the pure rules in
// src/app/12-home-gap-logic.js (run in a VM beside 12-home-plan-logic.js): the
// free time left today, the candidate rule (fit and buffer, no estimate,
// ranking, the same answer every call), a planned slot shrinking the gap, one
// task per gap for Plan all, the ring and its words; S1's block length option
// (sgFreeSlotCard o.minutes) the widget books with; and the widget's
// registration in the page's Home files. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';
import { engine, makeCtx, ev, task } from './fixtures/suggest/harness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const eq = (a, b, msg) => assert.deepEqual(plain(a), plain(b), msg);
const H = (h, m = 0) => h * 60 + m;

function logic() {
  const box = { console };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  vm.runInContext(read('12-home-gap-logic.js') + '\n' + read('12-home-plan-logic.js'), box, { filename: 'gap-logic.js' });
  return box;
}
const L = logic();
const TODAY = '2026-10-05';                                  // a Monday
const t = (o) => Object.assign({ id: 'x', title: 'Task', stream: 'work', priority: 'p2', status: 'todo', due: null, dueTime: null, planned: null, plannedTime: null, estimate: null, tags: [], waiting: false, snoozed: false, notStarted: false }, o);
const day = (now, blocks, o = {}) => L.gapDay(Object.assign({ nowMin: now, workStart: H(9), workEnd: H(18), blocks }, o));

test('the logic file is pure: no DOM, no page state, no config', () => {
  const src = read('12-home-gap-logic.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const word of ['document.', 'window.', 'APP_CONFIG', 'state.', 'localStorage', 'fetch(', 'saveData', 'render(', 'new Date(']) assert.ok(!src.includes(word), `uses ${word}`);
});

test('minutes: the estimate, else 15 for a quick / small / 5min tag, else unknown', () => {
  assert.equal(L.gapTaskMinutes(t({ estimate: 40 })), 40);
  assert.equal(L.gapTaskMinutes(t({ tags: ['quick'] })), 15);
  assert.equal(L.gapTaskMinutes(t({ tags: ['#Small'] })), 15);
  assert.equal(L.gapTaskMinutes(t({ tags: ['5min'], estimate: 5 })), 5, 'an estimate wins over the tag');
  assert.equal(L.gapTaskMinutes(t({ tags: ['later'] })), null);
});

test('the day: free now until the next event, its name and when the stretch began', () => {
  const d = day(H(13, 35), [{ start: H(9, 30), end: H(10), title: 'Standup', kind: 'event' }, { start: H(12), end: H(13, 10), title: 'Lunch', kind: 'event' },
    { start: H(14), end: H(14, 30), title: 'Design review', kind: 'event' }]);
  assert.equal(d.state, 'free');
  eq(d.cur, { start: H(13, 35), end: H(14), minutes: 25, from: H(13, 10) });
  eq(d.endsWith, { title: 'Design review', kind: 'event', start: H(14) });
  eq(d.later.map(g => [g.start, g.end]), [[H(14, 30), H(18)]]);
  const w = L.gapWords(d, H(13, 35));
  eq([w.big, w.unit, w.line, w.sub], ['25', 'min', '25 min free', 'until Design review at 14:00']);
  assert.equal(w.aria, '25 minutes free until Design review at 14:00');
  // The ring: 25 of the 50 minutes since lunch ended are left.
  eq(L.gapRing(d.cur, H(13, 35)), { left: 25, total: 50, frac: 0.5 });
});

test('the day: no calendar (only timed tasks) reads "until 18:00"; long stretches show hours', () => {
  const d = day(H(15, 30), [{ start: H(9), end: H(10), title: 'A planned task', kind: 'task' }]);
  assert.equal(d.state, 'free'); assert.equal(d.endsWith, null);
  const w = L.gapWords(d, H(15, 30));
  eq([w.big, w.unit, w.line, w.sub], ['2 h', '30 min', '2 h 30 min free', 'until 18:00']);
});

test('the day: during an event it shows the next gap', () => {
  const blocks = [{ start: H(13), end: H(14, 30), title: 'Workshop', kind: 'event' }, { start: H(15, 15), end: H(16), title: 'Call with Sam', kind: 'event' }];
  const d = day(H(13, 40), blocks);
  assert.equal(d.state, 'busy'); assert.equal(d.busyUntil, H(14, 30));
  eq(d.busyWith, { title: 'Workshop', kind: 'event' });
  eq([d.cur.start, d.cur.end, d.cur.minutes], [H(14, 30), H(15, 15), 45]);
  const w = L.gapWords(d, H(13, 40));
  eq([w.line, w.sub], ['Busy until 14:30', 'then 45 min free']);
  // A free stretch under 15 minutes now: the next real gap.
  const s = day(H(15, 5), blocks);
  assert.equal(s.state, 'busy'); assert.equal(s.busyUntil, null);
  eq([s.cur.start, s.cur.end], [H(16), H(18)]);
  eq(L.gapWords(s, H(15, 5)).line, 'Next gap at 16:00');
});

test('the day: hidden outside working hours, on a day off, and with no gap of 15 min left', () => {
  assert.equal(day(H(8, 30), []).state, 'off');
  assert.equal(day(H(18), []).state, 'off');
  assert.equal(day(H(10), [], { workDay: false }).state, 'off');
  const packed = day(H(16, 50), [{ start: H(16), end: H(17, 50), title: 'Workshop', kind: 'event' }]);
  assert.equal(packed.state, 'none', '10 min left after the workshop is not a gap');
  assert.equal(packed.cur, null);
});

test('the gap shrinks when a planned slot is added, and the signature changes only then', () => {
  const ev1 = { start: H(11), end: H(12), title: 'Review', kind: 'event' };
  const a = day(H(10), [ev1]);
  eq([a.cur.end, a.cur.minutes], [H(11), 60]);
  const b = day(H(10), [ev1, { start: H(10, 30), end: H(11), title: 'Draft', kind: 'task' }]);
  eq([b.cur.end, b.cur.minutes], [H(10, 30), 30], 'the slot now ends the gap');
  eq(b.endsWith, { title: 'Draft', kind: 'task', start: H(10, 30) });
  assert.notEqual(a.sig, b.sig);
  assert.equal(day(H(10, 1), [ev1]).sig, a.sig, 'a minute later: the same picture (the tick updates text in place)');
});

test('candidates: fit and buffer, no estimate only in 45 min gaps, what is left out', () => {
  const tasks = [
    t({ id: 'fit20', title: 'Twenty', estimate: 20 }),
    t({ id: 'fit21', title: 'Twenty-one', estimate: 21 }),
    t({ id: 'noest', title: 'No estimate' }),
    t({ id: 'wait', title: 'Waiting', estimate: 5, waiting: true }),
    t({ id: 'snz', title: 'Snoozed', estimate: 5, snoozed: true }),
    t({ id: 'later', title: 'Starts later', estimate: 5, notStarted: true }),
    t({ id: 'slot', title: 'Has a slot today', estimate: 5, planned: TODAY, plannedTime: '16:00' }),
    t({ id: 'timed', title: 'Due at 17:00', estimate: 5, due: TODAY, dueTime: '17:00' }),
    t({ id: 'done', title: 'Done', estimate: 5, status: 'done' }),
    t({ id: 'blocked', title: 'Has a block', estimate: 5 }),
  ];
  const o = { today: TODAY, buffer: 5, skip: ['blocked'], limit: 10 };
  eq(L.gapCandidates(25, tasks, o).map(c => c.id), ['fit20'], '20 min fits 25 - 5; 21 does not; no estimate needs 45');
  eq(L.gapCandidates(26, tasks, o).map(c => c.id), ['fit20', 'fit21']);
  eq(L.gapCandidates(45, tasks, o).map(c => c.id), ['fit20', 'fit21', 'noest']);
  const ne = L.gapCandidates(45, tasks, o).find(c => c.id === 'noest');
  eq([ne.minutes, ne.unknown, ne.reason], [null, true, 'no estimate']);
  eq(L.gapCandidates(45, tasks, Object.assign({}, o, { allowUnestimated: false })).map(c => c.id), ['fit20', 'fit21']);
  eq(L.gapCandidates(25, tasks, Object.assign({}, o, { buffer: 0 })).map(c => c.id), ['fit20', 'fit21'], 'no buffer: 21 fits 25');
  eq(L.gapCandidates(14, tasks, o), [], 'under 15 minutes is not a gap');
  eq(L.gapCandidates(25, tasks, o)[0].why, ['fits 20 min']);
});

test('candidates: ranking is overdue/due today, Focus, p1, due within 3 days, then the shortest', () => {
  const tasks = [
    t({ id: 'short', title: 'Short', estimate: 5 }),
    t({ id: 'long', title: 'Long', estimate: 30 }),
    t({ id: 'soon', title: 'Due in 3 days', estimate: 30, due: '2026-10-08' }),
    t({ id: 'p1', title: 'High', estimate: 30, priority: 'p1' }),
    t({ id: 'focus', title: 'In Focus', estimate: 30 }),
    t({ id: 'today', title: 'Due today', estimate: 30, due: TODAY }),
    t({ id: 'over', title: 'Overdue', estimate: 40, due: '2026-10-01', tags: ['quick'] }),
    t({ id: 'week', title: 'Due in 5 days', estimate: 10, due: '2026-10-10' }),
  ];
  const o = { today: TODAY, buffer: 5, focus: ['focus'], limit: 10 };
  const r = L.gapCandidates(60, tasks, o);
  eq(r.map(c => c.id), ['today', 'over', 'focus', 'p1', 'soon', 'short', 'week', 'long']);
  eq(r.find(c => c.id === 'over').why, ['fits 40 min', 'overdue', 'quick']);
  eq(r.find(c => c.id === 'soon').why, ['fits 30 min', 'due in 3 days']);
  eq(r.find(c => c.id === 'focus').why, ['fits 30 min', 'in Focus']);
  // Deterministic: the same answer every call, whatever the input order.
  eq(L.gapCandidates(60, tasks.slice().reverse(), o), r);
  eq(L.gapCandidates(60, tasks, o), r);
  eq(L.gapCandidates(60, tasks, Object.assign({}, o, { limit: 3 })).map(c => c.id), ['today', 'over', 'focus'], 'the default shows 3');
});

test('Plan all: each gap gets its best task, each task once; a block is the task\'s length (15 min at least)', () => {
  const tasks = [t({ id: 'a', title: 'A', estimate: 30, due: TODAY }), t({ id: 'b', title: 'B', estimate: 20 }), t({ id: 'c', title: 'C', estimate: 90 })];
  const rows = L.gapPlanAll([{ start: H(11), end: H(11, 45) }, { start: H(13), end: H(13, 30) }, { start: H(15), end: H(17) }, { start: H(17, 30), end: H(17, 50) }], tasks, { today: TODAY, buffer: 5, skip: [] });
  eq(rows.map(r => [r.gap.start, r.pick && r.pick.id, r.len]), [[H(11), 'a', 30], [H(13), 'b', 20], [H(15), 'c', 90], [H(17, 30), null, 0]]);
  eq(L.gapPlanAll([{ start: H(11), end: H(11, 45) }], tasks, { today: TODAY, skip: ['a'] }).map(r => r.pick && r.pick.id), ['b'], 'skip: the task already picked above');
  assert.equal(L.gapBlockLength({ minutes: 10 }, 25), 15, 'a calendar block is 15 min at least');
  assert.equal(L.gapBlockLength({ minutes: null }, 120), 30, 'no estimate: 30 min');
  assert.equal(L.gapBlockLength({ minutes: 50 }, 40), 40, 'never longer than the gap');
  assert.equal(L.gapBlockLength({ minutes: 20 }, 12), 0, 'under 15 min: no room');
});

test('S1 books the task\'s own length when asked (sgFreeSlotCard o.minutes), and the card keeps the contract', () => {
  const E = engine();
  const tk = task({ id: 'tg', title: 'Reply to Acme', estimate: 25 });
  const ctx = makeCtx({ now: '2026-10-05T10:32', tasks: [tk], focus: ['tg'], events: { '2026-10-05': [ev('11:30', '12:00', { title: 'Sync' })] } });
  E.sgPrepare(ctx);
  const dflt = E.sgFreeSlotCard(ctx, { start: H(10, 32), end: H(11, 30) }, { taskId: 'tg' });
  eq([dflt.primary.action.args.start, dflt.primary.action.args.end], [H(10, 35), H(11, 30)], 'without minutes: the gap (up to 2 h)');
  const c = E.sgFreeSlotCard(ctx, { start: H(10, 32), end: H(11, 30) }, { taskId: 'tg', minutes: 25, surface: 'gap' });
  const a = c.primary.action.args;
  eq([a.taskId, a.start, a.end, a.gapEnd], ['tg', H(10, 35), H(11), H(11, 30)]);
  assert.equal(c.primary.action.type, 'cal.blockOpen', 'the main button opens the event card, prefilled');
  assert.equal(c.quick.action.type, 'cal.block', 'the ✓ books it at once');
  assert.equal(c.primary.label, 'Block 10:35–11:00');
  assert.match(c.text, /Block 25 min for Reply to Acme/);
  const card = E.sgNormCard(c, E.sgRule('free-slot'));
  card.key = 'gap:2026-10-05:690:tg';
  eq(E.sgCheckCard(card), []);
  // Clamped: at least 15 minutes, at most the gap.
  eq(E.sgFreeSlotCard(ctx, { start: H(10, 32), end: H(11, 30) }, { minutes: 5 }).primary.action.args.end, H(10, 50));
  eq(E.sgFreeSlotCard(ctx, { start: H(10, 32), end: H(11, 30) }, { minutes: 300 }).primary.action.args.end, H(11, 30));
});

/* ---------- the widget in the page's Home files ---------- */
function homeFiles() {
  const files = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort();
  const box = {
    console, state: { custom: [], statuses: {}, pinned: {}, deleted: {} }, APP_CONFIG: { locale: 'en-GB', features: {} },
    window: { addEventListener() {} }, CSS: { escape: (s) => s }, TextEncoder,
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, body: { appendChild() {} }, hidden: false },
    registerSection() {}, render() {}, saveData() {}, saveUI() {}, toast() {}, todayStr: () => TODAY, fmtDate: (d) => d.toISOString().slice(0, 10),
    setTimeout: () => 0, clearTimeout() {}, esc: (s) => String(s), escAttr: (s) => String(s), icon: (n) => `<i data-i="${n}"></i>`,
    getItem: () => null, statusOf: () => 'todo',
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  vm.runInContext(files.map(f => read(f)).join('\n'), box, { filename: 'home-bundle.js' });
  return box;
}

test('the widget is registered and offered: metadata as the server has it, defaults = the settings schema', () => {
  const box = homeFiles();
  const d = vm.runInContext('homeWidgetDefs().find(x => x.id === "gap")', box);
  assert.ok(d, 'registered');
  assert.equal(d.available(), true, 'available (built)');
  assert.equal(typeof d.settings, 'function');
  const srv = HOME_WIDGETS.find(w => w.id === 'gap');
  eq([d.title, d.sizes, d.defaultSize, d.defaultHidden, d.group, d.order], [srv.title, srv.sizes, srv.defaultSize, true, srv.group, 110]);
  eq(d.aliases, srv.aliases);
  eq(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.gap.properties).sort(), 'the settings keys the server accepts');
  eq(d.defaults, { buffer: 5, allowUnestimated: true });
  // The gallery preview: sample data, a free stretch, tasks that fit (nothing fetched).
  const kit = vm.runInContext('_homeSampleKit()', box);
  const m = vm.runInContext('(kit) => _gapSample(kit)', box)(kit);
  assert.equal(m.preview, true);
  assert.ok(m.day.cur, 'the sample has a gap');
  assert.ok(m.cands.length >= 1, 'and a task that fits it');
});
