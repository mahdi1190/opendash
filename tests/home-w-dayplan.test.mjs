// Plan my day, the "dayplan" Home widget (WIDGETS_CATALOGUE.md 3.3):
//   - the pure rules (12-home-dayplan-logic.js) in a VM with W0-B's planning logic:
//     the day's model and capacity, the capacity line, auto-plan (no overlaps, the
//     buffer, the end of the working day, due today first, deterministic), "move N to
//     tomorrow" (only plans, lowest priority first, until the day fits), drops on the
//     timeline (15-minute snap, refused over a meeting or another block), "Plan at…";
//   - in the Home bundle: registered and available, its sizes and settings, the gallery
//     sample makes a sensible day;
//   - the source: writes only through the page helpers (planned slots, never
//     task.schedule; a deadline moves only behind "Move deadline"), calendar blocks only
//     through S1's cal.block (own events, no guests), the ✓ never opens an editor.
// Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';
import { check } from '../server/actions/validate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));

/* ───────── the pure rules, in a VM with only the planning logic ───────── */
const logic = vm.createContext({});
vm.runInContext(read('12-home-plan-logic.js'), logic, { filename: '12-home-plan-logic.js' });
vm.runInContext(read('12-home-dayplan-logic.js'), logic, { filename: '12-home-dayplan-logic.js' });
const L = (fn, ...args) => plain(vm.runInContext(fn, logic)(...plain(args)));

const TODAY = '2026-10-05';                 // a Monday
const WH = L('planWorkHours', { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] });
const H = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
function task(id, o) {
  return Object.assign({ id, title: 'Task ' + id, stream: 'work', priority: 'p2', estimate: null, due: null, dueTime: null,
    plannedFor: TODAY, plannedTime: null, plannedMinutes: null, doing: false, pinned: false, focus: -1 }, o || {});
}
function day(o) {
  return Object.assign({ today: TODAY, nowMin: H('10:00'), workHours: WH, unestimated: 30, buffer: 5,
    events: [{ id: 'e1', title: 'Standup', start: H('11:00'), end: H('12:00') }, { id: 'e2', title: 'Review with Sam', start: H('14:00'), end: H('14:30') }],
    own: [], tasks: [] }, o || {});
}
const model = (o) => L('homeDayplanModel', day(o));

test('the rules file is pure: no DOM, no page state, no clock', () => {
  const src = read('12-home-dayplan-logic.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const bad of [/\bdocument\b/, /\bwindow\b/, /\bstate\./, /\bAPP_CONFIG\b/, /new Date\(/, /Date\.now/, /\btodayStr\(/, /\bgetItem\(/])
    assert.doesNotMatch(src, bad, String(bad));
});

test('capacity: what wants time against the free time left (meetings out), the line and the colour', () => {
  const m = model({ tasks: [
    task('a', { due: TODAY, estimate: 60, plannedFor: null }),                     // due today, no time
    task('b', { plannedTime: '15:00', plannedMinutes: 45 }),                       // a planned slot
    task('c', {}),                                                                 // planned, no estimate (30)
    task('d', { plannedFor: null, doing: true, estimate: 20 }),                    // in progress only
  ] });
  assert.equal(m.cap.windowMin, 8 * 60, '10:00 to 18:00');
  assert.equal(m.cap.meetingMin, 90);
  assert.equal(m.cap.availMin, 390);
  assert.equal(m.cap.plannedMin, 45);
  assert.equal(m.cap.loadMin, 60 + 30 + 20);
  assert.equal(m.cap.needMin, 155);
  assert.equal(m.cap.spareMin, 235);
  assert.equal(m.cap.level, 'ok');
  assert.equal(L('homeDayplanCapText', m), 'Planned 2 h 35 in 6 h 30 free · 3 h 55 spare');
  assert.match(L('homeDayplanCapSay', m), /^Planned 2 hours 35 minutes in 6 hours 30 minutes of free time, 3 hours 55 minutes to spare$/);
  // Rows: placed first (by time), then the rest best first (due today before planned).
  assert.deepEqual(m.rows.map(r => r.id), ['b', 'a', 'c', 'd']);
  assert.deepEqual(m.unplaced.map(r => r.id), ['a', 'c', 'd']);
  assert.equal(m.rows.find(r => r.id === 'a').dueState, 'today');
  assert.equal(m.rows.find(r => r.id === 'c').onlyPlanned, true);
  assert.equal(m.rows.find(r => r.id === 'c').estimated, false);
  // The lane, the gaps (15 min+, from now, around meetings and the slot).
  assert.deepEqual(m.lane.map(x => [x.kind, x.taskId, x.start, x.end]), [['slot', 'b', H('15:00'), H('15:45')]]);
  assert.deepEqual(m.gaps.map(g => [g.start, g.end]), [[H('10:00'), H('11:00')], [H('12:00'), H('14:00')], [H('14:30'), H('15:00')], [H('15:45'), H('18:00')]]);
});

test('capacity: amber from 85 %, red over, the overrun in the line; a day off and a finished day', () => {
  const big = (n, mins) => Array.from({ length: n }, (_, i) => task('t' + i, { estimate: mins }));
  const tight = model({ tasks: big(7, 50) });              // 350 of 390
  assert.equal(tight.cap.level, 'tight');
  const over = model({ tasks: big(9, 50) });               // 450 of 390
  assert.equal(over.cap.level, 'over');
  assert.equal(over.cap.overMin, 60);
  assert.equal(L('homeDayplanCapText', over), 'Planned 7 h 30 in 6 h 30 free · 1 h over');
  assert.equal(L('homeDayplanCapText', model({ tasks: [] })), 'Nothing planned · 6 h 30 free');
  const sunday = L('homeDayplanModel', day({ today: '2026-10-04', tasks: [] }));
  assert.equal(sunday.work, false);
  const late = model({ nowMin: H('18:30'), tasks: big(2, 30) });
  assert.equal(late.over, true);
  assert.equal(late.gaps.length, 0);
  assert.equal(L('homeDayplanCapText', late), 'Your working day is over · 2 without a time');
  // Not today (nowMin null): the whole working day.
  assert.equal(model({ nowMin: null, tasks: [] }).cap.windowMin, 9 * 60);
});

test('the plan lane: own calendar blocks place their task; a due time is fixed; past blocks free nothing', () => {
  const m = model({
    own: [{ id: 'ev-own', title: 'Focus: Task x', start: H('12:00'), end: H('13:00'), taskId: 'x' }],
    tasks: [task('x', { estimate: 60 }), task('y', { due: TODAY, dueTime: '16:00', estimate: 30, plannedFor: null }), task('z', { plannedTime: '09:00', plannedMinutes: 30 })],
  });
  const x = m.rows.find(r => r.id === 'x'), y = m.rows.find(r => r.id === 'y'), z = m.rows.find(r => r.id === 'z');
  assert.equal(x.place.kind, 'block'); assert.equal(x.place.eventId, 'ev-own');
  assert.equal(y.place.kind, 'due'); assert.equal(y.place.start, H('16:00'));
  assert.equal(z.place.kind, 'slot'); assert.equal(z.place.past, true);
  assert.equal(m.unplaced.length, 0, 'everything has a time');
  assert.equal(m.cap.loadMin, 0);
  assert.equal(m.cap.plannedMin, 60 + 30, 'the block and the due time still to come; the past slot is not counted');
});

test('auto-plan: free gaps only, no overlaps, the buffer, never past the working day, due today first, the same every time', () => {
  const tasks = [
    task('p3', { priority: 'p3', estimate: 45 }),
    task('due', { due: TODAY, estimate: 60, plannedFor: null, priority: 'p2' }),
    task('late', { due: '2026-10-02', estimate: 30, plannedFor: null, priority: 'p3' }),
    task('foc', { estimate: 30, focus: 0 }),
    task('huge', { estimate: 600 }),
  ];
  const m = model({ tasks });
  const a = L('homeDayplanAuto', m, { buffer: 10 });
  const all = a.slots;
  assert.ok(all.length >= 3);
  // Overdue and due today come first.
  const order = all.slice().sort((x, y) => x.start - y.start).map(s => s.id);
  assert.ok(order.indexOf('late') < order.indexOf('p3') && order.indexOf('due') < order.indexOf('p3'), order.join(','));
  // Inside the free time, the buffer kept between blocks and next to meetings.
  const busy = m.events.map(e => [e.start, e.end]);
  for (const s of all) {
    assert.ok(s.start >= m.from && s.end <= m.end, `${s.id} inside the working window`);
    for (const [bs, be] of busy) assert.ok(s.end + 10 <= bs || s.start >= be + 10, `${s.id} keeps 10 min from the meeting ${bs}-${be}`);
    assert.equal(s.date, TODAY); assert.match(s.time, /^\d\d:\d\d$/);
  }
  const sorted = all.slice().sort((x, y) => x.start - y.start);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].start >= sorted[i - 1].end + 10, 'blocks never overlap and keep the buffer');
  assert.ok(a.left.includes('huge'), 'a 10-hour task does not fit');
  // Deterministic: the same proposal again, and whatever order the tasks come in.
  assert.deepEqual(L('homeDayplanAuto', m, { buffer: 10 }), a);
  assert.deepEqual(L('homeDayplanAuto', model({ tasks: tasks.slice().reverse() }), { buffer: 10 }).slots, a.slots);
  // Booking in the calendar: every block 15 min to 4 h (S1's cal.block limits).
  const b = L('homeDayplanAuto', model({ nowMin: H('09:00'), events: [], tasks: [task('tiny', { estimate: 5 }), task('long', { estimate: 300 })] }), { buffer: 5, minMinutes: 15, maxMinutes: 240 });
  assert.deepEqual(b.slots.map(s => [s.id, s.minutes]).sort(), [['long', 240], ['tiny', 15]]);
  // Nothing free: nothing proposed.
  const full = model({ events: [{ id: 'all', title: 'Workshop', start: H('09:00'), end: H('18:00') }], tasks: [task('q', { estimate: 30 })] });
  assert.deepEqual(L('homeDayplanAuto', full, {}).slots, []);
});

test('move to tomorrow: only plans (never a deadline, in progress or a calendar block), lowest priority first, until the day fits', () => {
  const tasks = [
    task('due', { due: TODAY, estimate: 120, plannedFor: TODAY, priority: 'p3' }),      // a deadline: never
    task('doing', { estimate: 120, priority: 'p0', doing: true }),                      // in progress: never
    task('hi', { estimate: 120, priority: 'p1' }),
    task('none', { estimate: 60, priority: 'p0' }),
    task('low', { estimate: 90, priority: 'p3' }),
    task('foc', { estimate: 90, priority: 'p3', focus: 1 }),
  ];
  const m = model({ tasks });
  assert.equal(m.cap.over, true);
  const over = m.cap.overMin;                                                           // 600 - 390 = 210
  assert.equal(over, 210);
  const p = L('homeDayplanTomorrowPick', m);
  assert.deepEqual(p.ids, ['none', 'low', 'foc'], 'no priority first, then P3 (not in Focus before Focus), until it fits');
  assert.equal(p.minutes, 240);
  assert.equal(p.fits, true);
  for (const id of ['due', 'doing']) assert.ok(!p.candidates.includes(id), id);
  assert.deepEqual(L('homeDayplanTomorrowPick', m), p, 'the same pick every time');
  // Not over: nothing to move.
  assert.deepEqual(L('homeDayplanTomorrowPick', model({ tasks: [task('one', { estimate: 30 })] })).ids, []);
  // A planned slot frees what is left of it; a block in the calendar is not moved from here.
  const m2 = model({ tasks: [task('s', { plannedTime: '16:00', plannedMinutes: 60, priority: 'p0' }), task('big', { estimate: 300, priority: 'p1' })],
    own: [{ id: 'blk', title: 'Focus', start: H('12:00'), end: H('13:00'), taskId: 'b2' }] });
  const p2 = L('homeDayplanTomorrowPick', m2);
  assert.deepEqual(p2.ids, ['s']);
  assert.equal(p2.minutes, 60);
  // The working day is over: every plan is offered.
  const late = L('homeDayplanTomorrowPick', model({ nowMin: H('19:00'), tasks: [task('u', { estimate: 30 }), task('v', { estimate: 30, priority: 'p1' })] }));
  assert.deepEqual(late.ids.sort(), ['u', 'v']);
});

test('drops on the timeline: a 15-minute snap, not before now, inside the day, refused over a meeting or another block', () => {
  const m = model({ tasks: [task('s', { plannedTime: '15:00', plannedMinutes: 45 })] });
  const ok = L('homeDayplanDropAt', m, H('12:38'), 30);
  assert.deepEqual([ok.ok, ok.time, ok.end], [true, '12:45', H('13:15')]);
  const meet = L('homeDayplanDropAt', m, H('10:50'), 30);
  assert.equal(meet.ok, false);
  assert.equal(meet.clash.kind, 'event');
  assert.match(meet.reason, /^Overlaps Standup \(11:00–12:00\)$/);
  const slot = L('homeDayplanDropAt', m, H('14:50'), 30);
  assert.equal(slot.ok, false);
  assert.match(slot.reason, /Task s/);
  assert.equal(L('homeDayplanDropAt', m, H('15:10'), 45, { selfId: 's' }).ok, true, 'a block may move over its own old place');
  assert.equal(L('homeDayplanDropAt', m, H('08:00'), 30).time, '10:00', 'never before now');
  assert.equal(L('homeDayplanDropAt', m, H('17:55'), 60).time, '17:00', 'ends by the end of the working day');
  // A gap that starts at :50: the quarter hour clashes, the nearest 5 minutes fits.
  const m2 = model({ events: [{ id: 'a', title: 'A', start: H('10:00'), end: H('10:50') }, { id: 'b', title: 'B', start: H('11:40'), end: H('12:30') }], tasks: [] });
  const g = L('homeDayplanDropAt', m2, H('10:52'), 45);
  assert.deepEqual([g.ok, g.time], [true, '10:50']);
  // The day is over.
  assert.equal(L('homeDayplanDropAt', model({ nowMin: H('18:10') }), H('17:00'), 30).ok, false);
});

test('"Plan at…": one start per free gap that fits, on the quarter hour when it still fits', () => {
  const m = model({ events: [{ id: 'a', title: 'A', start: H('10:00'), end: H('10:50') }, { id: 'b', title: 'B', start: H('11:40'), end: H('16:00') }], tasks: [task('s', { plannedTime: '16:00', plannedMinutes: 60 })] });
  const at = L('homeDayplanPlanAt', m, 45);
  assert.deepEqual(at.map(x => x.label), ['10:50–11:35', '17:00–17:45']);
  assert.deepEqual(L('homeDayplanPlanAt', m, 60).map(x => x.label), ['17:00–18:00']);
  // Its own slot is free space when it moves.
  assert.deepEqual(L('homeDayplanPlanAt', m, 60, { selfId: 's' }).map(x => x.label), ['16:00–17:00']);
  assert.deepEqual(L('homeDayplanPlanAt', m, 600), []);
});

test('"Pull 3 from Focus": the first three not on today, in Focus order', () => {
  const m = model({ tasks: [task('a')] });
  assert.deepEqual(L('homeDayplanPullPick', m, [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'b' }, { id: 'd' }, { id: 'e' }], 3), ['b', 'c', 'd']);
  assert.deepEqual(L('homeDayplanPullPick', m, [], 3), []);
});

test('durations read the way the capacity line writes them', () => {
  assert.equal(L('homeDayplanDur', 50), '50 min');
  assert.equal(L('homeDayplanDur', 240), '4 h');
  assert.equal(L('homeDayplanDur', 250), '4 h 10');
  assert.equal(L('homeDayplanSayDur', 61), '1 hour 1 minute');
  assert.equal(L('homeDayplanSayDur', 0), '0 minutes');
});

/* ───────── in the Home bundle ───────── */
const HOME_FILES = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort();
function bundle() {
  const box = {
    console, state: { custom: [], statuses: {}, pinned: {}, deleted: {} }, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {} },
    window: { addEventListener() {} }, CSS: { escape: (s) => s }, TextEncoder,
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({}), body: { appendChild() {} }, hidden: false },
    registerSection() {}, render() {}, saveData() {}, saveUI() {}, toast() {}, todayStr: () => TODAY, fmtDate: (d) => d.toISOString().slice(0, 10),
    setTimeout: () => 0, clearTimeout() {}, esc: (s) => String(s), escAttr: (s) => String(s), icon: (n) => n,
    getItem: () => null, statusOf: () => 'todo',
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  vm.runInContext(HOME_FILES.map(f => read(f)).join('\n'), box, { filename: 'home-bundle.js' });
  return (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, box));
}

test('registered, available, its sizes and settings agree with the server', () => {
  const js = bundle();
  const d = js('(() => { const d = homeWidgetDef("dayplan"); return { sizes: d.sizes, def: d.defaultSize, hidden: d.defaultHidden, fresh: d.fresh, group: d.group, avail: homeWidgetAvailable(d), defaults: d.defaults, settings: typeof d.settings, unmount: typeof d.unmount }; })()');
  assert.deepEqual(d.sizes, ['m', 'l', 'full']);
  assert.equal(d.def, 'l');
  assert.equal(d.hidden, true, 'hidden by default (or it appears on every board)');
  assert.equal(d.fresh, true);
  assert.equal(d.group, 'time');
  assert.equal(d.avail, true, 'built: offered in Add widget');
  assert.equal(d.settings, 'function'); assert.equal(d.unmount, 'function');
  const srv = HOME_WIDGETS.find(w => w.id === 'dayplan');
  assert.deepEqual([...srv.sizes], d.sizes);
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.dayplan.properties).sort());
  assert.deepEqual(check(HOME_WIDGET_PREFS.dayplan, d.defaults, 'settings'), []);
  assert.deepEqual(check(HOME_WIDGET_PREFS.dayplan, { book: true, buffer: 10, unestimated: 60 }, 'settings'), []);
  assert.notDeepEqual(check(HOME_WIDGET_PREFS.dayplan, { buffer: 90 }, 'settings'), []);
});

test('the gallery sample is a believable day: meetings, a planned slot, tasks with no time', () => {
  const js = bundle();
  const m = js('homeDayplanModel(homeSample("dayplan"))');
  assert.ok(m.events.length >= 3, 'the sample meetings');
  assert.ok(m.lane.some(x => x.kind === 'slot'), 'a planned slot');
  assert.ok(m.unplaced.length >= 3, 'tasks with no time yet');
  assert.ok(m.rows.some(r => r.dueState === 'overdue') && m.rows.some(r => !r.estimated));
  assert.ok(m.gaps.length >= 1);
  assert.ok(js('homeDayplanAuto(homeDayplanModel(homeSample("dayplan")), { buffer: 5 }).slots.length') >= 1);
});

/* ───────── booking several blocks under ONE Undo (68-suggest-actions.js, shared group) ───────── */
function suggestPage() {
  const SG = readdirSync(APP).filter(n => /^68-suggest-(actions|context|logic|rules-.*)\.js$/.test(n)).sort();
  const subs = new Set(), calls = [];
  let n = 0;
  const W = {
    calls, onChange(fn) { subs.add(fn); return () => subs.delete(fn); }, defaultCalendarId: () => 'me@example.com', info: () => ({ fake: true }), guests: () => [],
    create(input) { calls.push(['create', input.start]); const tmp = 'tmp-' + (++n); for (const f of subs) f({ id: tmp, op: 'create', state: 'pending' }); const id = 'g' + n; return new Promise(r => setTimeout(() => r({ ok: true, event: { id } }), 2)); },
    remove(id) { calls.push(['remove', id]); return Promise.resolve({ ok: true }); },
  };
  const tasks = [{ id: 't1', title: 'Report draft', stream: 'work' }, { id: 't2', title: 'Slides for Alex', stream: 'work' }];
  const box = {
    console, setTimeout, clearTimeout, Promise, JSON, Math, Date, Object, Array, String, Number, Set, Map, RegExp, Error,
    state: { custom: tasks, eventMeta: {}, _lastSave: 1 }, APP_CONFIG: { timezone: 'Europe/London', locale: 'en-GB' }, window: { CalWrite: W },
    todayStr: () => '2026-10-05', fmtDate: (d) => d.toISOString().slice(0, 10), getItem: (id) => tasks.find(t => t.id === id), effTitle: (t) => t.title, effStream: (t) => t.stream,
    netErrorMessage: (e, f) => (e && e.message) || f || 'error', toast: () => () => {}, confirmDialog: async () => true, render() {}, saveData() {}, saveUI() {},
    homeCalStatus: () => ({ ok: true, stale: false }),
    fetch: async (url, init) => { const body = JSON.parse(init.body); return { ok: true, status: 200, json: async () => (body.dryRun ? { ok: true, preview: [] } : url.endsWith('/undo') ? { ok: true, version: 3 } : { ok: true, undo: 'tok-' + Math.random(), version: 2 }) }; },
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  vm.runInContext(SG.map(f => read(f)).join('\n;\n') + '\n;this.__ = { sgRun, sgUndoGroup };', box, { filename: 'suggest-page.js' });
  return { W, api: box.__ };
}
test('several blocks in one undo group: Undo removes every one of them (Plan my day\'s booking, cal.blockMany)', async () => {
  const args = (taskId, start) => ({ taskId, date: '2026-10-06', start, end: start + 30, rule: 'dayplan', title: 'Focus: x', description: '' });
  // Plan my day: one cal.block per slot, all in one group.
  const a = suggestPage();
  const g = a.api.sgUndoGroup('dayplan:2026-10-05');
  for (const [t, s] of [['t1', 600], ['t2', 660]]) assert.equal((await a.api.sgRun({ type: 'cal.block', args: args(t, s) }, null, { group: g })).ok, true);
  assert.equal((await g.undo()).ok, true);
  assert.deepEqual(a.W.calls.filter(c => c[0] === 'remove').map(c => c[1]).sort(), ['g1', 'g2'], 'both events go, not only the last');
  // cal.blockMany: the same.
  const b = suggestPage();
  const r = await b.api.sgRun({ type: 'cal.blockMany', args: { blocks: [args('t1', 600), args('t2', 660), args(null, 720)] } }, { key: 'k', rule: 'x' }, {});
  assert.equal(r.ok, true);
  await r.group.undo();
  assert.deepEqual(b.W.calls.filter(c => c[0] === 'remove').map(c => c[1]).sort(), ['g1', 'g2', 'g3']);
});

/* ───────── the source: how it writes ───────── */
test('writes go through the page helpers: planned slots, never task.schedule; deadlines only behind "Move deadline"', () => {
  const src = read('12-home-w-dayplan.js');
  assert.doesNotMatch(src, /task\.schedule|calScheduleTask|setDate\(/, 'never moves a deadline to block time');
  assert.match(src, /setPlannedSlot\(/);
  assert.match(src, /setOverride\(id, 'estimate', v\)/);
  // The only deadline change: setDateWithReason(…, 'over capacity'), behind a button that says so.
  assert.equal((src.match(/setDateWithReason\(/g) || []).length, 1);
  assert.match(src, /setDateWithReason\(id, tmrw, 'over capacity'\)/);
  assert.match(src, /'Move deadline'/);
  // Bulk changes are one undo step.
  assert.ok((src.match(/selUndoGroup\(/g) || []).length >= 3);
  assert.match(src, /batchTasks\(/);
  // Calendar blocks only through S1's actions (own events, no guests); never CalWrite directly.
  assert.doesNotMatch(src, /CalWrite\.(create|update|move|remove|rsvp)/);
  assert.match(src, /sgRun\(\{ type: 'cal\.block', args: \{ taskId: s\.id, date: today, start: s\.start, end: s\.end, rule: 'dayplan'/);
  assert.doesNotMatch(src, /\b(guests|attendees)\s*:/, 'a block never names guests');
  assert.match('dayplan', /^[a-z0-9][a-z0-9-]{0,39}$/, 'a valid origin rule for event.annotate');
  // S1 in place: the card's own editor (prefilled) and its receipts.
  assert.match(src, /sgFreeSlotCard\(/);
  assert.match(src, /sgCardEl\(card, \{ surface: 'dayplan', size: 'row' \}\)/);
  assert.match(src, /sgSurfaceReceipts\(body, 'dayplan'\)/);
  // No personal names or addresses.
  assert.doesNotMatch(src, /@[a-z0-9-]+\.(ac|com|co)\b/i);
});

test('each recommendation: the main button opens the proposal; its ✓ applies it at once with Undo (never an editor)', () => {
  const src = read('12-home-w-dayplan.js');
  // Main: open the panel (pressed again: nothing changes).
  assert.match(src, /if \(_hdpPanel && _hdpPanel\.kind === kind\) return;/);
  assert.match(src, /data-rec="\$\{kind\}"/);
  // ✓: the proposal as it is, through homeAction (busy, done, a re-click does nothing).
  const now = src.slice(src.indexOf('function _hdpRecNow'), src.indexOf('/* ---------- S1 on the first free stretch'));
  assert.ok(now.length > 100);
  assert.doesNotMatch(now, /openEvent|tcOpenCreate|openEditor|_hdpPanelOpen|cal\.blockOpen/);
  assert.match(now, /homeAction\(btn/);
  // Every apply leaves an Undo.
  for (const fn of ['_hdpApplySlots', '_hdpApplyTomorrow', '_hdpApplyPull', '_hdpBookSlots']) {
    const body = src.slice(src.indexOf(`function ${fn}`), src.indexOf('\n}\n', src.indexOf(`function ${fn}`)));
    assert.match(body, /label: 'Undo'/, `${fn} offers Undo`);
  }
});
