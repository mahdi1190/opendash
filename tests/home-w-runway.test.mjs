// The Deadline runway Home widget (WIDGETS_CATALOGUE.md 3.10):
//   - the pure model (src/app/12-home-runway-logic.js) alone in a VM: workdays, the
//     steps unit, the pace thresholds, a past date, an empty scope, the `since` window,
//     the finish at this pace, the hours line, the guessed scope and the chart's shapes;
//   - in the Home bundle (every 12-home*.js file, in build order): the widget is
//     registered and offered, two copies with different settings give independent
//     runways, the set-up states, and following a countdown is one undo step.
// Synthetic data only (generic names).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';
import { check } from '../server/actions/validate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const plain = (x) => JSON.parse(JSON.stringify(x));

/* ───────── the pure model, alone in a VM ───────── */
const logic = vm.createContext({});
vm.runInContext(readFileSync(join(APP, '12-home-runway-logic.js'), 'utf8'), logic, { filename: '12-home-runway-logic.js' });
const L = (fn, ...args) => plain(vm.runInContext(fn, logic)(...args));
// homeRunway with functions (match, freeMinOn) passed through as they are.
const R = (o) => plain(vm.runInContext('homeRunway', logic)(o));

const TODAY = '2026-10-05';                       // a Monday
const at = (iso, h = 12) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, h).getTime(); };
const add = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const CD = { id: 'cd-1', label: 'Launch', date: '2026-10-16' };   // Friday of next week
const SCOPE = { kind: 'stream', value: 'work' };
/** n tasks in the work stream: `recent` done in the last days, `old` done a month ago, the rest open. */
function world(n, recent, old, extra) {
  const items = [], statuses = {}, completionLog = {};
  for (let i = 0; i < n; i++) {
    const id = 't' + i;
    items.push(Object.assign({ id, title: 'Task ' + i, stream: 'work', tags: [], createdAt: at('2026-09-01') }, (extra && extra(i)) || {}));
    if (i < recent) { statuses[id] = 'done'; completionLog[id] = [at(add(TODAY, -(i % 9)))]; }
    else if (i < recent + old) { statuses[id] = 'done'; completionLog[id] = [at('2026-09-03')]; }
  }
  return { items, statuses, completionLog };
}
const run = (w, o) => R(Object.assign({ countdown: CD, scope: SCOPE, unit: 'tasks', today: TODAY }, w, o || {}));

test('workdays: counted inclusively, whole weeks and the rest; the n-th workday from a day', () => {
  assert.equal(L('rwWorkdaysIn', '2026-10-05', '2026-10-09', [1, 2, 3, 4, 5]), 5, 'Mon to Fri');
  assert.equal(L('rwWorkdaysIn', '2026-10-05', '2026-10-15', [1, 2, 3, 4, 5]), 9, 'Mon to the next Thu');
  assert.equal(L('rwWorkdaysIn', '2026-10-10', '2026-10-11', [1, 2, 3, 4, 5]), 0, 'a weekend');
  assert.equal(L('rwWorkdaysIn', '2026-10-10', '2026-10-11', [0, 1, 2, 3, 4, 5, 6]), 2, 'weekends counted');
  assert.equal(L('rwWorkdaysIn', '2026-10-09', '2026-10-05', [1, 2, 3, 4, 5]), 0, 'backwards = none');
  assert.equal(L('rwWorkdaysIn', '2026-09-01', '2026-11-30', [1, 2, 3, 4, 5]), 65);
  assert.equal(L('rwNthWorkday', '2026-10-05', 1, [1, 2, 3, 4, 5]), '2026-10-05', 'today counts when it is a workday');
  assert.equal(L('rwNthWorkday', '2026-10-05', 6, [1, 2, 3, 4, 5]), '2026-10-12', 'over the weekend');
  assert.equal(L('rwNthWorkday', '2026-10-10', 1, [1, 2, 3, 4, 5]), '2026-10-12', 'from a Saturday');
});

test('time left: calendar days and workdays up to the day before the date (the top bar\'s count)', () => {
  const m = run(world(10, 6, 0));
  assert.equal(m.daysLeft, 11);
  assert.equal(m.workdaysLeft, 9, 'Mon 5 to Thu 15');
  assert.equal(run(world(10, 6, 0), { countWeekends: true }).workdaysLeft, 11, 'weekends counted: every day');
  assert.equal(run(world(10, 6, 0), { workDays: [1, 2, 3, 4] }).workdaysLeft, 8, 'the user\'s own working days');
  const due = run(world(10, 6, 0), { countdown: { id: 'x', label: 'x', date: TODAY } });
  assert.equal(due.daysLeft, 0); assert.equal(due.workdaysLeft, 1, 'due today: today is still there');
  assert.equal(due.required, 4, 'everything left, today');
});

test('pace: on track, tight (at least 3/4 of the pace needed) and behind', () => {
  // The pace window: the last 14 days, Tue 22 Sep to Mon 5 Oct = 10 workdays.
  const on = run(world(10, 6, 0));
  assert.deepEqual([on.total, on.done, on.open, on.recentDone, on.window.workdays], [10, 6, 4, 6, 10]);
  assert.equal(on.actual, 0.6); assert.equal(on.required, 0.44);
  assert.equal(on.status, 'on'); assert.equal(on.statusText, 'On track');
  const tight = run(world(17, 8, 0));          // 9 open over 9 workdays: 1 a day needed; 0.8 a day done
  assert.deepEqual([tight.required, tight.actual, tight.status], [1, 0.8, 'tight']);
  const behind = run(world(16, 7, 0));         // 9 open: 1 a day needed; 0.7 a day done
  assert.deepEqual([behind.required, behind.actual, behind.status], [1, 0.7, 'behind']);
  const stalled = run(world(10, 0, 4));        // work done long ago only
  assert.equal(stalled.recentDone, 0); assert.equal(stalled.actual, 0); assert.equal(stalled.status, 'behind');
  assert.equal(stalled.projected, null, 'no pace, no projected finish');
});

test('done, a past date and an empty scope', () => {
  const all = run(world(5, 5, 0));
  assert.equal(all.status, 'done'); assert.equal(all.open, 0); assert.equal(all.required, 0); assert.equal(all.projected, null);
  const past = run(world(10, 6, 0), { countdown: { id: 'p', label: 'Old', date: '2026-10-01' } });
  assert.deepEqual([past.status, past.daysLeft, past.workdaysLeft, past.required], ['past', -4, 0, 0]);
  const pastDone = run(world(4, 4, 0), { countdown: { id: 'p', label: 'Old', date: '2026-10-01' } });
  assert.equal(pastDone.status, 'done', 'all done beats a passed date');
  const empty = run(world(10, 6, 0), { scope: { kind: 'stream', value: 'nothing-here' } });
  assert.deepEqual([empty.status, empty.total, empty.series.length > 0], ['empty', 0, true]);
  assert.equal(run(world(3, 0, 0), { scope: null }).status, 'empty', 'no scope: nothing counts');
});

test('the steps unit: checklist items; a done task counts all its steps; a task with no checklist is one step', () => {
  const recent = at(add(TODAY, -2));
  const items = [
    { id: 'a', title: 'Corrections', stream: 'work', createdAt: at('2026-09-01'), subtasks: [{ id: 's1', done: true, doneAt: recent, ts: at('2026-09-01') }, { id: 's2', done: false, ts: at('2026-09-01') }, { id: 's3', done: false, ts: at('2026-09-20') }, { id: 's4', done: false, ts: at('2026-09-20') }] },
    { id: 'b', title: 'Figures', stream: 'work', createdAt: at('2026-09-01'), subtasks: [{ id: 's5', done: false, ts: 1 }, { id: 's6', done: false, ts: 1 }, { id: 's7', done: true, ts: 1 }] },
    { id: 'c', title: 'Abstract', stream: 'work', createdAt: at('2026-09-10') },
  ];
  const w = { items, statuses: { b: 'done' }, completionLog: { b: [at(add(TODAY, -1))] } };
  const steps = run(w, { unit: 'steps' });
  assert.deepEqual([steps.total, steps.done, steps.open], [8, 4, 4]);
  assert.equal(steps.recentDone, 4, 'one ticked step, and the three of the task finished yesterday');
  assert.deepEqual(steps.next.map(t => [t.id, t.steps]), [['a', { done: 1, total: 4 }], ['c', null]]);
  const tasks = run(w, { unit: 'tasks' });
  assert.deepEqual([tasks.total, tasks.done, tasks.open], [3, 1, 2], 'the same tasks, counted as tasks');
  // The burn-up grows when steps were added (the ts of a step), never above the total.
  const s = steps.series;
  assert.ok(s.every(p => p.done <= p.total));
  assert.equal(s.find(p => p.date === '2026-09-19').total, 6); assert.equal(s.at(-1).total, 8);
});

test('the since window: automatic (earliest task, at most 90 days back) or chosen; the pace never reaches before it', () => {
  const auto = run(world(10, 6, 0));
  assert.equal(auto.since, '2026-09-01', 'the earliest createdAt');
  assert.equal(auto.series[0].date, '2026-09-01'); assert.equal(auto.series.at(-1).date, TODAY);
  const old = run(world(10, 6, 0, () => ({ createdAt: at('2025-01-01') })));
  assert.equal(old.since, add(TODAY, -90), 'at most 90 days back');
  assert.equal(old.series[0].total, 10, 'older tasks count from the first day');
  const chosen = run(world(10, 6, 0), { since: '2026-09-28' });
  assert.equal(chosen.since, '2026-09-28');
  assert.equal(chosen.window.from, '2026-09-28', 'the pace window starts at since when that is nearer');
  assert.equal(chosen.window.workdays, 6, 'Mon 28 Sep to Mon 5 Oct');
  assert.equal(chosen.recentDone, 6, 'completions from 28 Sep on');
  const none = run({ items: [{ id: 'x', stream: 'work', title: 'No date' }], statuses: {}, completionLog: {} });
  assert.equal(none.since, add(TODAY, -13), 'no creation dates: the pace window');
});

test('finish at this pace, and what never counts (repeating, won\'t do, other streams)', () => {
  const m = run(world(10, 6, 0));                // 4 open at 0.6 a workday: 7 workdays
  assert.equal(m.projected, '2026-10-13'); assert.equal(m.projectedLate, false);
  const late = run(world(16, 7, 0));             // 9 open at 0.7: 13 workdays -> Wed 21 Oct
  assert.equal(late.projected, '2026-10-21'); assert.equal(late.projectedLate, true);
  const w = world(6, 2, 0);
  w.items.push({ id: 'rep', title: 'Weekly sync', stream: 'work', recurrence: 'weekly', createdAt: at('2026-09-01') });
  w.items.push({ id: 'wont', title: 'Dropped idea', stream: 'work', resolution: 'wontdo', resolvedAt: at('2026-10-02'), createdAt: at('2026-09-01') });
  w.statuses.wont = 'done';
  w.items.push({ id: 'other', title: 'Elsewhere', stream: 'home', createdAt: at('2026-09-01') });
  const x = run(w);
  assert.deepEqual([x.total, x.done, x.open], [6, 2, 4]);
  assert.ok(!x.next.some(t => ['rep', 'wont', 'other'].includes(t.id)));
});

test('next tasks: in progress first, then by date, priority and age', () => {
  const items = [
    { id: 'late', title: 'B', stream: 'work', dueDate: '2026-10-20', priority: 'p1', createdAt: at('2026-09-01') },
    { id: 'soon', title: 'C', stream: 'work', dueDate: '2026-10-07', priority: 'p3', createdAt: at('2026-09-01') },
    { id: 'none', title: 'A', stream: 'work', priority: 'p1', createdAt: at('2026-09-01') },
    { id: 'doing', title: 'D', stream: 'work', priority: 'p3', createdAt: at('2026-09-02') },
    { id: 'tie1', title: 'E', stream: 'work', dueDate: '2026-10-07', priority: 'p1', createdAt: at('2026-09-03') },
  ];
  const m = run({ items, statuses: { doing: 'doing' }, completionLog: {} });
  assert.deepEqual(m.next.map(t => t.id), ['doing', 'tie1', 'soon', 'late', 'none']);
});

test('the hours line: only when at least half the open tasks have estimates; free time from the page', () => {
  const est = (i) => ({ estimate: i % 2 ? 0 : 60 });
  // The page's free time: 0 on days off (its working days), the rest of today, then whole days.
  const weekend = (iso) => [0, 6].includes(new Date(iso + 'T12:00:00Z').getUTCDay());
  const m = run(world(8, 4, 0, est), { freeMinOn: (iso) => (weekend(iso) ? 0 : iso === TODAY ? 120 : 300) });
  // Open: t4..t7; estimated t4, t6 (60 min each); the other two take the average.
  assert.deepEqual(m.hours, { remainingMin: 240, freeMin: 120 + 8 * 300, estimated: 2, of: 4, short: false });
  const few = run(world(8, 4, 0, (i) => ({ estimate: i === 7 ? 30 : 0 })), { freeMinOn: () => 300 });
  assert.equal(few.hours, null, '1 of 4 estimated: no hours line');
  assert.equal(run(world(8, 4, 0, est)).hours, null, 'no free-time source: no hours line');
  const short = run(world(8, 4, 0, () => ({ estimate: 600 })), { freeMinOn: () => 60 });
  assert.equal(short.hours.short, true);
});

test('a scope guessed from the countdown\'s name: a stream first, then a tag', () => {
  const streams = [{ id: 'report', label: 'Report' }, { id: 'papers', label: 'Papers' }, { id: 'acme', label: 'Acme Ltd' }];
  const tags = ['admin', 'corrections', 'grant', 'demo-day'];
  assert.deepEqual(L('rwGuessScope', 'Report corrections', streams, tags), { kind: 'stream', value: 'report' });
  assert.deepEqual(L('rwGuessScope', 'Paper 3 deadline', streams, tags), { kind: 'stream', value: 'papers' }, 'singular and plural');
  assert.deepEqual(L('rwGuessScope', 'Acme start', streams, tags), { kind: 'stream', value: 'acme' }, 'by the stream\'s name');
  assert.deepEqual(L('rwGuessScope', 'Grant Milestone 2', streams, tags), { kind: 'tag', value: 'grant' });
  assert.deepEqual(L('rwGuessScope', 'Demo day slides', streams, tags), { kind: 'tag', value: 'demo-day' }, 'a tag phrase');
  assert.equal(L('rwGuessScope', 'Holiday', streams, tags), null);
  assert.equal(L('rwGuessScope', 'The end', streams, tags), null, 'small words never match');
});

test('scopes: stream, tag (any case, # allowed) and a search through the page\'s matcher', () => {
  const it = { id: 'x', stream: 'work', tags: ['Launch'] };
  const inScope = vm.runInContext('rwInScope', logic);
  assert.equal(inScope(it, { kind: 'stream', value: 'work' }), true);
  assert.equal(inScope(it, { kind: 'tag', value: '#launch' }), true);
  assert.equal(inScope(it, { kind: 'tag', value: 'lunch' }), false);
  assert.equal(inScope(it, { kind: 'query', value: 'x' }), false, 'no matcher: nothing');
  assert.equal(inScope(it, { kind: 'query', value: 'x' }, (i) => i.id === 'x'), true);
  assert.equal(inScope(it, { kind: 'stream', value: '' }), false);
});

test('the chart: a fixed number of points (so it can morph), the line still needed, a week table', () => {
  const m = run(world(10, 6, 0));
  const g = L('rwSparkGeometry', m, { w: 300, h: 64 });
  assert.equal(g.done.split('L').length, 40, 'always 40 points on the done line');
  assert.ok(g.need.startsWith('M'), 'the line still needed runs from today to the date');
  assert.ok(g.today.x < g.end.x && g.dateX === g.end.x);
  const more = run(world(10, 7, 0));
  assert.equal(L('rwSparkGeometry', more, { w: 300, h: 64 }).done.split('L').length, 40, 'the same shape after a change');
  assert.equal(L('rwSparkGeometry', run(world(4, 4, 0)), {}).need, '', 'all done: nothing still needed');
  const rows = L('rwWeekRows', m);
  assert.equal(rows[0].week, '2026-09-01');
  assert.ok(rows.some(r => r.done != null) && rows.some(r => r.needed != null));
  const lastNeeded = rows.filter(r => r.needed != null).at(-1);
  assert.equal(lastNeeded.needed, 10, 'the last week still to come ends at the total');
});

/* ───────── in the Home bundle ───────── */
const HOME_FILES = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort();
function fakeEl() {
  return { dataset: {}, innerHTML: '', style: {}, classList: { add() {}, remove() {}, contains: () => false, toggle() {} }, setAttribute() {}, getAttribute: () => null, appendChild() {}, querySelector: () => null, querySelectorAll: () => [] };
}
function bundle(st) {
  const today = new Date(); const iso = (d) => d.toISOString().slice(0, 10);
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', features: {} }, window: { addEventListener() {} }, CSS: { escape: (s) => s }, TextEncoder,
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => fakeEl(), body: { appendChild() {} }, hidden: false },
    registerSection() {}, render() {}, undo() {}, toast() {}, saveUI() {},
    saveData() { st._saveCount = (st._saveCount || 0) + 1; },
    todayStr: () => iso(today), fmtDate: (d) => iso(d),
    esc: (s) => String(s), escAttr: (s) => String(s), icon: (n) => `<i data-i="${n}"></i>`,
    getItem: (id) => st.custom.find(t => t.id === id) || null, statusOf: (id) => st.statuses[id] || 'todo',
    getAllItems: () => st.custom, effTags: (i) => i.tags || [], effTitle: (i) => i.title,
    STREAMS: { work: { label: 'Work', order: 0 }, report: { label: 'Report', order: 1 } },
    TB_TYPES: { countdown: { dated: true }, countup: { dated: true }, progress: { dated: true }, clock: {} },
    tbList: () => st.countdowns.slice(),
  };
  vm.createContext(box);
  vm.runInContext(HOME_FILES.map(f => readFileSync(join(APP, f), 'utf8')).join('\n'), box, { filename: 'home-bundle.js' });
  return { box, json: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, box)), run: (code) => vm.runInContext(code, box) };
}
function homeState() {
  const now = Date.now(), day = 86400000;
  const iso = (n) => new Date(now + n * day).toISOString().slice(0, 10);
  const custom = [];
  for (let i = 0; i < 6; i++) custom.push({ id: 'w' + i, title: 'Work ' + i, stream: 'work', tags: i < 2 ? ['launch'] : [], createdAt: now - 20 * day, subtasks: i === 0 ? [{ id: 'a', done: false }, { id: 'b', done: false }] : [] });
  for (let i = 0; i < 3; i++) custom.push({ id: 'th' + i, title: 'Report ' + i, stream: 'report', tags: [], createdAt: now - 10 * day });
  return {
    custom, statuses: { w1: 'done', w2: 'done', th0: 'done' }, completionLog: { w1: [now - 2 * day], w2: [now - day], th0: [now - day] },
    countdowns: [{ id: 'cd-a', type: 'countdown', label: 'Work launch', date: iso(30) }, { id: 'cd-b', type: 'countdown', label: 'Report corrections', date: iso(60) }, { id: 'cd-u', type: 'countup', label: 'Since', date: iso(-5) }],
    home: {}, deleted: {},
  };
}

test('bundle: registered with its final metadata, offered, and its defaults fit the server schema', () => {
  const { json } = bundle(homeState());
  const d = json('(() => { const d = homeWidgetDef("runway"); return { id: d.id, multi: d.multi, sizes: d.sizes, defaultSize: d.defaultSize, hidden: d.defaultHidden, group: d.group, avail: homeWidgetAvailable(d), settings: typeof d.settings, sample: typeof d.sample, defaults: d.defaults }; })()');
  const srv = HOME_WIDGETS.find(w => w.id === 'runway');
  assert.deepEqual([d.multi, d.sizes, d.defaultSize, d.hidden, d.group], [srv.multi, srv.sizes, srv.defaultSize, true, srv.group]);
  assert.equal(d.avail, true, 'available once built');
  assert.equal(d.settings, 'function'); assert.equal(d.sample, 'function');
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.runway.properties).sort());
  const set = { countdownId: 'cd-a', scope: { kind: 'tag', value: 'launch' }, unit: 'steps', countWeekends: true, since: '2026-09-01' };
  assert.deepEqual(check(HOME_WIDGET_PREFS.runway, set, 'settings'), [], 'every setting the picker writes fits the schema');
});

test('bundle: two copies with different settings give independent runways', () => {
  const st = homeState();
  st.home = { widgetPrefs: {
    runway: { countdownId: 'cd-a', scope: { kind: 'stream', value: 'work' } },
    'runway~2': { countdownId: 'cd-b', scope: { kind: 'stream', value: 'report' }, unit: 'steps' },
    'runway~3': { countdownId: 'cd-a', scope: { kind: 'tag', value: 'launch' }, unit: 'steps' },
  } };
  const { json } = bundle(st);
  const one = json('homeRunwayFor("runway")'), two = json('homeRunwayFor("runway~2")'), three = json('homeRunwayFor("runway~3")');
  assert.equal(one.setup, null); assert.equal(two.setup, null);
  assert.deepEqual([one.countdown.id, one.model.unit, one.model.total, one.model.done], ['cd-a', 'tasks', 6, 2]);
  assert.deepEqual([two.countdown.id, two.model.unit, two.model.total, two.model.done], ['cd-b', 'steps', 3, 1]);
  assert.deepEqual([three.model.total, three.model.done], [3, 1], '#launch counted in steps: w0 has 2 steps, w1 is done');
  assert.equal(one.model.daysLeft, 30); assert.equal(two.model.daysLeft, 60);
  assert.notDeepEqual(one.model.series.at(-1), two.model.series.at(-1));
});

test('bundle: set-up states, never hidden: nothing chosen, its countdown removed, nothing to count', () => {
  const st = homeState();
  st.home = { widgetPrefs: { 'runway~2': { countdownId: 'cd-gone', scope: { kind: 'stream', value: 'work' } }, 'runway~3': { countdownId: 'cd-a' } } };
  const { json } = bundle(st);
  assert.equal(json('homeRunwayFor("runway").setup'), 'start');
  assert.equal(json('homeRunwayFor("runway~2").setup'), 'gone');
  assert.equal(json('homeRunwayFor("runway~3").setup'), 'scope');
  assert.deepEqual(json('_rwCountdowns().map(w => w.id)'), ['cd-a', 'cd-b'], 'count-ups are not deadlines');
});

test('bundle: following a countdown brings a scope guessed from its name, in one undo step; the same pick again does nothing', () => {
  const st = homeState();
  const { json, run, box } = bundle(st);
  const before = st._saveCount || 0;
  assert.equal(json('_rwPickCountdown("runway~2", "cd-b", false)'), true);
  assert.equal((box.state._saveCount || 0) - before, 1, 'one save');
  assert.deepEqual(json('homePrefs("runway~2")'), { countdownId: 'cd-b', scope: { kind: 'stream', value: 'report' }, unit: 'tasks', countWeekends: false, since: null });
  assert.equal(json('_rwPickCountdown("runway~2", "cd-b", false)'), false, 're-picking the current one');
  assert.equal(json('homePrefs("runway").countdownId'), null, 'the other copy is untouched');
  // A chosen scope stays when another countdown is picked.
  run('_rwSetScope("runway~2", { kind: "tag", value: "launch" }, false)');
  run('_rwPickCountdown("runway~2", "cd-a", false)');
  assert.deepEqual(json('homePrefs("runway~2").scope'), { kind: 'tag', value: 'launch' });
  assert.equal(json('_rwSetScope("runway~2", { kind: "tag", value: "launch" }, false)'), false, 'the current scope does nothing');
});
