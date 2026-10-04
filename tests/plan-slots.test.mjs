// Planned time slots and working hours (W0-B): the pure rules in
// src/app/12-home-plan-logic.js (through lib/plan-logic.mjs), the task.plan op
// with time + minutes (the deadline never moves), clearing the slot when a
// repeating task rolls on, config.workHours, and the page side in a VM:
// Today's schedule and the Calendar show planned blocks and count them as busy.
// Synthetic data only.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  planWorkHours, planWorkHoursCheck, planIsWorkDay, planSlotOf, planSlotCheck, planApplySlot, planSlotMinutes, planSlotText,
  planMergeBusy, planFreeGaps, homeDayCapacity, planTaskScore, homeGapCandidates, homeAutoPlan, PLAN_WORK_DEFAULT,
} from '../lib/plan-logic.mjs';
import { validateConfig, DEFAULT_CONFIG } from '../lib/datadir.mjs';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir, TODAY, addDays } from './fixtures/actions-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const eq = (a, b, msg) => assert.deepEqual(plain(a), plain(b), msg);
const H = (h, m = 0) => h * 60 + m;

test('the planning file is pure: no DOM, no page state, no config', () => {
  const src = read('12-home-plan-logic.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const word of ['document.', 'window.', 'APP_CONFIG', 'state.', 'localStorage', 'fetch(', 'saveData', 'render(']) assert.ok(!src.includes(word), `uses ${word}`);
});

test('working hours: the default, a valid custom day, and what is refused', () => {
  eq(planWorkHours(null), { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5], startMin: H(9), endMin: H(18), minutes: 540, custom: false });
  const c = planWorkHours({ start: '07:30', end: '16:00', days: [5, 1, 1, 3] });
  eq([c.startMin, c.endMin, c.days, c.custom], [H(7, 30), H(16), [1, 3, 5], true]);
  assert.match(planWorkHoursCheck({ start: '9:00', end: '18:00' }), /start/);
  assert.match(planWorkHoursCheck({ start: '18:00', end: '09:00' }), /30 minutes/);
  assert.match(planWorkHoursCheck({ start: '09:00', end: '17:00', days: [] }), /at least one day/);
  assert.match(planWorkHoursCheck({ start: '09:00', end: '17:00', days: [7] }), /0 \(Sunday\)/);
  assert.equal(planWorkHoursCheck(null), null);
  eq(planWorkHours({ start: 'x' }).custom, false, 'a bad value falls back to the default');
  // 2026-10-03 is a Saturday, 2026-10-05 a Monday
  assert.equal(planIsWorkDay(planWorkHours(null), '2026-10-03'), false);
  assert.equal(planIsWorkDay(planWorkHours(null), '2026-10-05'), true);
  assert.equal(planIsWorkDay(planWorkHours({ start: '10:00', end: '14:00', days: [6] }), '2026-10-03'), true);
  assert.ok(Object.isFrozen(PLAN_WORK_DEFAULT));
});

test('config.workHours is validated, optional and null by default', () => {
  assert.equal(DEFAULT_CONFIG.workHours, null);
  assert.equal(validateConfig({}).config.workHours, null);
  const ok = validateConfig({ workHours: { start: '08:00', end: '16:30', days: [4, 1, 2] } });
  eq(ok.errors, []);
  eq(ok.config.workHours, { start: '08:00', end: '16:30', days: [1, 2, 4] });
  eq(validateConfig({ workHours: { start: '08:00', end: '16:30' } }).config.workHours.days, [1, 2, 3, 4, 5], 'days default to Mon-Fri');
  const bad = validateConfig({ workHours: { start: '25:00', end: '16:30' } });
  assert.ok(bad.errors.some(e => /workHours/.test(e)));
  assert.equal(bad.config.workHours, null);
});

test('slots: set, keep, clear; a time needs a day and minutes need a time; the deadline is never touched', () => {
  const t = { id: 't1', title: 'Write', dueDate: '2026-10-09', dueTime: '17:00', estimate: 45 };
  let r = planApplySlot(t, { date: '2026-10-05', time: '10:00' });
  assert.equal(r.changed, true);
  eq(planSlotOf(t), { date: '2026-10-05', time: '10:00', start: H(10), end: H(10, 45), minutes: 45 }, 'length = the estimate');
  r = planApplySlot(t, { minutes: 90 });
  eq([r.changed, t.plannedMinutes, planSlotOf(t).end], [true, 90, H(11, 30)]);
  r = planApplySlot(t, { date: '2026-10-06' });
  eq([t.plannedFor, t.plannedTime, t.plannedMinutes], ['2026-10-06', '10:00', 90], 'moving the day keeps the time');
  assert.equal(planApplySlot(t, { date: '2026-10-06', time: '10:00' }).changed, false, 'the same slot again is no change');
  r = planApplySlot(t, { time: null });
  eq([t.plannedFor, t.plannedTime, t.plannedMinutes], ['2026-10-06', undefined, undefined], 'time null keeps the day');
  assert.match(planApplySlot(t, { minutes: 30 }).error, /needs a time/);
  r = planApplySlot(t, { date: null });
  eq([t.plannedFor, t.plannedTime], [undefined, undefined]);
  assert.match(planApplySlot(t, { time: '09:00' }).error, /needs a day/);
  assert.match(planSlotCheck({ date: '2026-02-30' }), /YYYY-MM-DD/);
  assert.match(planSlotCheck({ date: '2026-10-05', time: '24:00' }), /HH:MM/);
  assert.match(planSlotCheck({ date: '2026-10-05', time: '09:00', minutes: 721 }), /720/);
  assert.match(planSlotCheck({ date: '2026-10-05', time: '09:00', minutes: 2.5 }), /whole/);
  eq([t.dueDate, t.dueTime], ['2026-10-09', '17:00'], 'the deadline stays');
  // the length: own > estimate > 30, and never past midnight
  assert.equal(planSlotMinutes({}), 30);
  assert.equal(planSlotMinutes({ estimate: 2000 }), 720);
  eq(planSlotOf({ plannedFor: '2026-10-05', plannedTime: '23:30', plannedMinutes: 120 }).end, 24 * 60);
  assert.equal(planSlotOf({ plannedTime: '10:00' }), null, 'a time without a day is no slot');
  assert.equal(planSlotText({ start: H(9, 5), end: H(10) }), '09:05–10:00');
});

test('free time: merged busy blocks, gaps inside the working hours, capacity', () => {
  eq(planMergeBusy([{ start: 600, end: 660 }, [630, 700], { start: 800, end: 810 }, { start: 'x' }]), [[600, 700], [800, 810]]);
  eq(planFreeGaps([[H(10), H(11)], [H(13), H(14)]], { start: H(9), end: H(18), min: 45 }), [
    { start: H(9), end: H(10), minutes: 60 }, { start: H(11), end: H(13), minutes: 120 }, { start: H(14), end: H(18), minutes: 240 }]);
  eq(planFreeGaps([[H(10), H(11)]], { start: H(9), end: H(18), from: H(10, 30), min: 30 }), [{ start: H(11), end: H(18), minutes: 420 }]);
  const cap = homeDayCapacity({
    workHours: planWorkHours(null), date: '2026-10-05', nowMin: H(10),
    events: [{ start: H(11), end: H(12) }, { start: 0, end: 1440, allDay: true }, { start: H(12), end: H(13), bg: true }],
    plans: [{ start: H(11, 30), end: H(12, 30) }], load: [{ minutes: 120 }, { minutes: 0 }],
  });
  eq([cap.work, cap.windowMin, cap.meetingMin, cap.plannedMin, cap.busyMin, cap.freeMin, cap.loadMin, cap.spareMin, cap.over], [true, 480, 60, 60, 90, 390, 120, 270, false]);
  eq(cap.gaps.map(g => [g.start, g.end]), [[H(10), H(11)], [H(12, 30), H(18)]], 'planned slots count as busy');
  const sat = homeDayCapacity({ workHours: planWorkHours(null), date: '2026-10-03', nowMin: null, load: [{ minutes: 600 }] });
  eq([sat.work, sat.windowMin, sat.over], [false, 540, true]);
  const late = homeDayCapacity({ workHours: planWorkHours(null), date: '2026-10-05', nowMin: H(19) });
  eq([late.windowMin, late.gaps], [0, []]);
});

test('gap candidates and auto-plan: what fits, best first, back to back with a buffer', () => {
  const today = '2026-10-05';
  const tasks = [
    { id: 'a', title: 'Overdue form', minutes: 30, due: '2026-10-01' },
    { id: 'b', title: 'Long essay', minutes: 180, due: today },
    { id: 'c', title: 'P1 email', minutes: 15, priority: 'p1' },
    { id: 'd', title: 'Already slotted', minutes: 20, plannedFor: today, plannedTime: '09:00' },
    { id: 'e', title: 'Someday', minutes: 40 },
  ];
  eq(planTaskScore(tasks[0], today).why, ['overdue']);
  const cands = homeGapCandidates({ start: H(10), end: H(11) }, tasks, { today });
  eq(cands.map(c => c.id), ['a', 'c', 'e'], 'too long and already slotted ones are left out');
  assert.ok(cands[0].fit > 0 && cands[0].fit <= 1);
  eq(homeGapCandidates({ minutes: 0 }, tasks, { today }), []);
  const plan = homeAutoPlan({ date: today, today, gaps: [{ start: H(9, 2), end: H(10) }, { start: H(13), end: H(17) }], tasks, buffer: 5 });
  eq(plan.slots.map(s => [s.id, s.time, s.minutes]), [['a', '09:05', 30], ['c', '09:40', 15], ['b', '13:00', 180], ['e', '16:05', 40]]);
  eq(plan.left, []);
  const tight = homeAutoPlan({ date: today, gaps: [{ start: H(9), end: H(9, 20) }], tasks, max: 5 });
  eq([tight.slots.map(s => s.id), tight.left.sort()], [['c'], ['a', 'b', 'e']]);
});

/* ---------- the op ---------- */
let dir, a;
beforeEach(() => { dir = makeDataDir(); a = createActions({ dataDir: dir }); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const disk = () => JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
const run = (ops) => a.apply({ ops, source: 'mcp', client: 'test' });
const task = (id) => disk().custom.find(t => t.id === id);
const rejects = async (p, code) => { try { await p; } catch (e) { assert.equal(e.code, code, `${e.code}: ${e.message}`); return e; } assert.fail('expected ' + code); };

test('plan_task with a time: a planned slot; the deadline stays; undo puts it back', async () => {
  const due = task('u-1-aaa').dueDate;
  const day = addDays(TODAY, 1);
  const r = await run([{ op: 'task.plan', id: 'u-1-aaa', date: day, time: '10:00', minutes: 90 }]);
  assert.match(r.preview[0].summary, /10:00 \(90 min; the deadline stays\)/);
  eq(r.preview[0].changes.map(c => c.field), ['plannedFor', 'plannedTime', 'plannedMinutes']);
  const t = task('u-1-aaa');
  eq([t.plannedFor, t.plannedTime, t.plannedMinutes, t.dueDate, t.dueTime], [day, '10:00', 90, due, undefined]);
  const act = disk().taskActivity['u-1-aaa'].at(-1);
  eq([act.type, act.to, act.time, act.minutes], ['plan', day, '10:00', 90]);
  // reads: the compact task and get_task show the slot
  const list = await a.query('tasks.list', { view: 'all' });
  const c = list.tasks.find(x => x.id === 'u-1-aaa');
  eq([c.plannedFor, c.plannedTime, c.plannedMinutes], [day, '10:00', 90]);
  const g = await a.query('task.get', { id: 'u-1-aaa' });
  eq(g.planned, { date: day, weekday: g.planned.weekday, time: '10:00', minutes: 90 });
  // the same again is no change; time null keeps the day; date null clears everything
  const same = await run([{ op: 'task.plan', id: 'u-1-aaa', date: day, time: '10:00' }]);
  eq([same.changed, same.preview[0].changes], [0, undefined]);
  await run([{ op: 'task.plan', id: 'u-1-aaa', date: day, time: null }]);
  eq([task('u-1-aaa').plannedFor, task('u-1-aaa').plannedTime, task('u-1-aaa').plannedMinutes], [day, undefined, undefined]);
  const r2 = await run([{ op: 'task.plan', id: 'u-1-aaa', date: null }]);
  assert.equal(task('u-1-aaa').plannedFor, undefined);
  await a.undo(r2.undo);
  assert.equal(task('u-1-aaa').plannedFor, day, 'undo brings the plan back');
});

test('plan_task refuses minutes without a time and a bad time; the old day-only call still works', async () => {
  await rejects(run([{ op: 'task.plan', id: 'u-2-bbb', date: TODAY, minutes: 30 }]), 'INVALID_PARAMS');
  await rejects(run([{ op: 'task.plan', id: 'u-2-bbb', date: TODAY, time: '9:5' }]), 'INVALID_PARAMS');
  await run([{ op: 'task.plan', id: 'u-2-bbb', date: TODAY }]);
  eq([task('u-2-bbb').plannedFor, task('u-2-bbb').plannedTime], [TODAY, undefined]);
});

test('a repeating task that rolls on (done or skipped) loses its planned slot', async () => {
  await run([{ op: 'task.plan', id: 'u-4-ddd', date: TODAY, time: '16:00', minutes: 30 }]);
  await run([{ op: 'task.complete', id: 'u-4-ddd' }]);
  let t = task('u-4-ddd');
  eq([t.plannedFor, t.plannedTime, t.plannedMinutes], [undefined, undefined, undefined]);
  assert.ok(t.dueDate > TODAY, 'it rolled on');
  await run([{ op: 'task.plan', id: 'u-4-ddd', date: TODAY, time: '16:00' }]);
  await run([{ op: 'task.wont_do', id: 'u-4-ddd' }]);
  t = task('u-4-ddd');
  eq([t.plannedFor, t.plannedTime], [undefined, undefined]);
});

test('the tool descriptions say which one moves the deadline', () => {
  const d = a.describe();
  const op = (n) => d.ops.find(o => o.name === n);
  assert.match(op('task.schedule').description, /MOVES THE DEADLINE/);
  assert.match(op('task.schedule').description, /plan_task/);
  assert.match(op('task.plan').description, /never changed/);
  assert.ok(op('task.plan').schema.properties.time && op('task.plan').schema.properties.minutes);
});

/* ---------- the page, in a VM ---------- */
function pageBox(tasks, extra = {}) {
  const STREAMS = { work: { label: 'Work', color: 'blue' } };
  const pad = (n) => String(n).padStart(2, '0');
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);
  const box = {
    console, STREAMS, PRIORITY_ORDER: { p1: 0, p2: 1, p3: 2, p0: 3 }, APP_CONFIG: { locale: 'en-GB', myEmails: [] },
    state: { custom: tasks, statuses: {}, deleted: {}, people: [], eventMeta: {} },
    window: {}, document: { addEventListener() {} },
    getAllItems: () => box.state.custom.filter(t => !box.state.deleted[t.id]), getItem: (id) => box.state.custom.find(t => t.id === id),
    statusOf: (id) => box.state.statuses[id] || 'todo', effDate: (t) => t.dueDate || null, effTitle: (t) => t.title, effStream: (t) => t.stream || 'work',
    effPriority: (t) => t.priority || 'p0', todayStr: () => '2026-10-05', fmtDate: (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    saveData() { box.saved++; }, render() {}, toast(msg, o) { box.toasts.push({ msg, o }); }, logActivity(id, type, d) { box.acts.push({ id, type, ...d }); },
    esc, escAttr: esc, icon: (n) => `<svg data-i="${n}"></svg>`, streamIsCustomised: () => false,
    saved: 0, toasts: [], acts: [], ...extra,
  };
  vm.createContext(box);
  const files = ['12-home-plan-logic.js', '12-home-cal.js', '20-task-plan.js', '40-calendar.js', '43-calendar-meta.js'];
  vm.runInContext(files.map(read).join('\n;\n'), box, { filename: 'plan-bundle.js' });
  return box;
}

test('Today\'s schedule: planned slots are timed rows (planned:true) and count as busy in the free gaps', () => {
  const box = pageBox([
    { id: 'a', title: 'Draft intro', stream: 'work', dueDate: '2026-10-09', plannedFor: '2026-10-05', plannedTime: '10:00', plannedMinutes: 90 },
    { id: 'b', title: 'Call', stream: 'work', dueDate: '2026-10-05', dueTime: '15:00', estimate: 30 },
    { id: 'c', title: 'Tomorrow', stream: 'work', plannedFor: '2026-10-06', plannedTime: '09:00' },
    { id: 'd', title: 'Done one', stream: 'work', plannedFor: '2026-10-05', plannedTime: '13:00' },
  ]);
  box.state.statuses.d = 'done';
  const rows = box.homeTimedTasks('2026-10-05');
  eq(rows.map(r => [r.key, r.start, r.end, !!r.planned]), [['p:a', H(10), H(11, 30), true], ['t:b', H(15), H(15, 30), false]]);
  const m = box.homeDayModel({ events: [], tasks: rows, nowMin: null, ...box.homeWorkWindow() });
  eq([m.workStart, m.workEnd], [H(9), H(18)], 'the user\'s working hours (the default here)');
  eq(m.gaps.map(g => [g.start, g.end]), [[H(9), H(10)], [H(11, 30), H(15)], [H(15, 30), H(18)]]);
  box.APP_CONFIG.workHours = { start: '08:00', end: '17:00', days: [1, 2, 3, 4, 5] };
  eq(box.homeWorkWindow(), { workStart: H(8), workEnd: H(17) }, 'a settings change is picked up');
  assert.equal(box.homeWorkDay('2026-10-04'), false);
});

test('the Calendar: a planned entry beside the deadline\'s, a "Planned" chip, and the drag rules', () => {
  const box = pageBox([
    { id: 'a', title: 'Draft intro', stream: 'work', dueDate: '2026-10-09', plannedFor: '2026-10-05', plannedTime: '10:00', plannedMinutes: 90 },
    { id: 'b', title: 'Same day', stream: 'work', dueDate: '2026-10-05', plannedFor: '2026-10-05', plannedTime: '14:00' },
  ]);
  const src = { sources: { google: false, countdowns: false, tasks: true } };
  const mon = box.calEntriesOn('2026-10-05', src);
  eq(mon.map(e => [e.key, !!e.planned, e.allDay, e.start ?? null]), [['p:a', true, false, H(10)], ['p:b', true, false, H(14)], ['t:b', false, true, null]]);
  eq(box.calEntriesOn('2026-10-09', src).map(e => e.key), ['t:a'], 'the deadline stays on its own day');
  eq(box.calEntriesOn('2026-10-05', { ...src, plans: false }).map(e => e.key), ['t:b']);
  eq(box.calEntriesOn('2026-10-05', { sources: { google: false, countdowns: false, tasks: false } }).map(e => e.key), ['p:a', 'p:b'], 'planned time has its own switch: due dates off, plans still shown');
  eq(box.calEntriesOn('2026-10-05', { sources: { google: false, countdowns: false, tasks: true, plans: false } }).map(e => e.key), ['t:b']);
  const chip = box.calChipHtml(mon[0]);
  assert.match(chip, /class="ce tk plan"/);
  assert.match(chip, /data-plan="1"/);
  assert.match(chip, /title="Planned: Draft intro"/);
  // a planned block dropped on a time moves the slot (one save, an Undo toast), never the deadline
  const fake = (attrs) => ({ target: { closest: () => ({ dataset: attrs, classList: { contains: (c) => c === 'wv-ev' || c === 'is-task' } }) } });
  box.planDragNote(fake({ plan: '1' }), 'a');
  eq(box.planDragPreview('a'), { minutes: 90, label: 'Plan' });
  assert.equal(box.planDropOnTime('a', '2026-10-06', '11:15'), true);
  const a = box.getItem('a');
  eq([a.plannedFor, a.plannedTime, a.plannedMinutes, a.dueDate], ['2026-10-06', '11:15', 90, '2026-10-09']);
  assert.equal(box.saved, 1);
  assert.match(box.toasts.at(-1).msg, /Planned .*11:15–12:45 · the deadline stays/);
  box.toasts.at(-1).o.action.run();
  eq([a.plannedFor, a.plannedTime], ['2026-10-05', '10:00'], 'Undo puts the slot back');
  // a block with a due time keeps moving its due time (the caller's calScheduleTask)
  box.planDragNote(fake({}), 'b');
  assert.equal(box.planDragPreview('b'), null);
  assert.equal(box.planDropOnTime('b', '2026-10-05', '16:00'), false);
  // a task from the due lane gets a slot of its estimate
  box.planDragNote({ target: { closest: () => ({ dataset: {}, classList: { contains: () => false } }) } }, 'b');
  assert.equal(box.planDropOnTime('b', '2026-10-07', '09:30'), true);
  eq([box.getItem('b').plannedFor, box.getItem('b').plannedTime, box.getItem('b').dueDate], ['2026-10-07', '09:30', '2026-10-05']);
  // a planned block dropped on a day lane: that day, no time
  box.planDragNote(fake({ plan: '1' }), 'a');
  assert.equal(box.planDropOnDay('a', { date: '2026-10-08', time: null }), true);
  eq([a.plannedFor, a.plannedTime], ['2026-10-08', undefined]);
});

test('the source hooks: drag, drop, resize and the task card use the planned slot', () => {
  const v = read('42-calendar-views.js'), c = read('40-calendar.js'), g = read('45-calendar-grid-edit.js'), s = read('12-home-w-schedule.js');
  assert.match(v, /planDropOnTime\(id, iso, hm\)\) return;/);
  assert.match(v, /planDragPreview\(id\)/);
  assert.match(v, /e\.planned \? 'Planned' : 'Due'/);
  assert.match(c, /planDragNote\(e, id\)/);
  assert.match(c, /planDropOnDay\(id, where\)\) return;/);
  assert.match(g, /d\.task && d\.plan && typeof setPlannedSlot === 'function'/);
  assert.match(s, /homeWorkWindow\(\)/);
  assert.match(read('20-task-model.js'), /delete item\.plannedFor; delete item\.plannedTime; delete item\.plannedMinutes;/);
  assert.match(read('57-settings.js'), /planSettingsWorkHoursRow\(\)/);
  const sec = read('41-calendar-section.js');
  assert.match(sec, /label: 'Planned time'[^\n]*hidden\.plans/, 'a "Planned time" switch in the sidebar');
  assert.match(sec, /const tasks = entries\.filter\(e => e\.kind === 'task' && !e\.planned\);/, 'the rail lists planned time with the timed rows, not under Due');
  // every 12-home file still loads in the Home tests' VM
  assert.ok(readdirSync(APP).includes('12-home-plan-logic.js'));
});

test('event notes: wrapped up is kept on its own and pruned when cleared (page helper)', () => {
  const box = pageBox([{ id: 'a', title: 'A', stream: 'work' }]);
  assert.equal(box.calAnnotate('ev1', { wrapped: true }), true);
  eq(box.state.eventMeta.ev1, { wrapped: true });
  assert.equal(box.calIsWrapped('ev1'), true);
  assert.equal(box.calAnnotate('ev1', { wrapped: true }), false, 'no change, no save');
  box.calAnnotate('ev1', { appendNotes: 'Send the slides', linkTasks: ['a', 'nope'] });
  eq(box.state.eventMeta.ev1, { wrapped: true, notes: 'Send the slides', tasks: ['a'] });
  box.calAnnotate('ev1', { notes: null, unlinkTasks: ['a'], wrapped: false });
  assert.equal(box.state.eventMeta.ev1, undefined, 'an empty entry is removed');
  box.calAnnotate('ev2', { wrapped: true });
  box.toasts.at(-1).o.action.run();
  assert.equal(box.state.eventMeta.ev2, undefined, 'Undo');
  assert.equal(box.calMetaIsEmpty({ origin: { kind: 'block' } }), false);
});
