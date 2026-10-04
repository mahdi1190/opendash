// Home widget "catchup" (Catch up, WIDGETS_CATALOGUE.md 3.9): clear what slipped in
// one sweep, and decide about tasks that keep moving.
//   - the pure rules (src/app/12-home-catchup-logic.js, with briefRollover from
//     73-brief-logic.js) in a VM: what counts as slipped (due today left to Today,
//     missed plans in), the settings, the order; homeStuck's thresholds (3 moves later
//     in 60 days, only later moves, the last human reason, settled after the last move)
//     and its stalled rule (in progress, nothing for 10 days); one row per task; the
//     changes a move makes; next week's first (work) day;
//   - in the Home bundle with the real task model (20-task-model.js): registered and
//     available with the server's settings keys; Move all is ONE save (one undo step,
//     one render) that moves due dates with a logged reason and missed plans to the new
//     day; a row's reason chip is the move's reason; Break it down's steps are one save
//     and settle "keeps moving".
// Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
const TODAY = '2026-10-05';                    // a Monday
const plus = (n) => { const d = new Date(TODAY + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const at = (n) => new Date(2026, 9, 5 + n, 12, 0, 0).getTime();     // local noon, n days from TODAY

/* ───────── the pure rules, in a VM (with briefRollover, as the page has it) ───────── */
const logic = vm.createContext({});
vm.runInContext(read('73-brief-logic.js') + '\n' + read('12-home-catchup-logic.js'), logic, { filename: 'catchup-logic.js' });
const L = (fn, ...args) => plain(vm.runInContext(fn, logic)(...plain(args)));
const t = (id, o) => Object.assign({ id, title: 'Task ' + id, done: false, status: 'todo', priority: 'p2', recurring: false }, o || {});
const move = (n, from, to, reason, type) => ({ ts: at(n), type: type || 'date', from, to, reason: reason == null ? null : reason });

test('slipped: overdue and missed plans; due today and planned today belong to Today', () => {
  const tasks = [
    t('over', { due: plus(-3) }),
    t('dueToday', { due: TODAY }),
    t('missed', { planned: plus(-1), due: plus(4) }),
    t('missedNoDue', { planned: plus(-2) }),
    t('plannedToday', { planned: TODAY }),
    t('missedButDueToday', { planned: plus(-1), due: TODAY }),       // Today has it (due today)
    t('missedAndOverdue', { planned: plus(-1), due: plus(-2) }),     // once, as overdue
    t('future', { due: plus(2) }),
    t('done', { due: plus(-5), done: true }),
    t('snoozed', { due: plus(-5), snoozed: true }),
    t('none'),
  ];
  const rows = L('homeCatchupSlipped', tasks, TODAY, {});
  assert.deepEqual(rows.map(r => r.id).sort(), ['missed', 'missedAndOverdue', 'missedNoDue', 'over']);
  const by = Object.fromEntries(rows.map(r => [r.id, r]));
  assert.equal(by.over.why, 'overdue'); assert.equal(by.over.field, 'due'); assert.equal(by.over.from, plus(-3)); assert.equal(by.over.days, 3);
  assert.equal(by.missed.why, 'planned'); assert.equal(by.missed.field, 'planned'); assert.equal(by.missed.from, plus(-1));
  assert.equal(by.missedAndOverdue.why, 'overdue', 'overdue wins over the missed plan: one row');
  assert.deepEqual(L('homeCatchupSlipped', tasks, 'not a date', {}), []);
});

test('slipped: the settings (overdue, missed plans, repeating) and the order', () => {
  const tasks = [
    t('a', { due: plus(-1), priority: 'p3' }),
    t('b', { due: plus(-4), priority: 'p1' }),
    t('c', { due: plus(-6), priority: 'p3' }),
    t('d', { planned: plus(-1), priority: 'p1' }),
    t('rep', { due: plus(-2), recurring: true }),
  ];
  assert.deepEqual(L('homeCatchupSlipped', tasks, TODAY, {}).map(r => r.id), ['b', 'rep', 'c', 'a', 'd'], 'overdue first, then priority, then the oldest');
  assert.deepEqual(L('homeCatchupSlipped', tasks, TODAY, { overdue: false }).map(r => r.id), ['d']);
  assert.deepEqual(L('homeCatchupSlipped', tasks, TODAY, { missedPlans: false }).map(r => r.id), ['b', 'rep', 'c', 'a']);
  assert.ok(!L('homeCatchupSlipped', tasks, TODAY, { includeRepeating: false }).some(r => r.id === 'rep'));
});

test('homeStuck: 3 moves later in the last 60 days; earlier, undated and old moves do not count', () => {
  const acts = {
    three: [move(-30, plus(-31), plus(-24)), move(-20, plus(-24), plus(-17)), move(-10, plus(-17), plus(-3), 'Too big')],
    two: [move(-20, plus(-24), plus(-17)), move(-10, plus(-17), plus(-3))],
    earlier: [move(-30, plus(-20), plus(-25)), move(-20, plus(-25), plus(-30)), move(-10, plus(-30), plus(-35))],
    old: [move(-90, plus(-91), plus(-80)), move(-70, plus(-80), plus(-70)), move(-10, plus(-17), plus(-3))],
    undated: [move(-30, null, plus(-24)), move(-20, null, plus(-17)), move(-10, null, plus(-3))],
    resched: [move(-30, plus(-31), plus(-24), null, 'reschedule'), move(-20, plus(-24), plus(-17), null, 'reschedule'), move(-10, plus(-17), plus(-3), null, 'reschedule')],
    occurrence: [move(-30, plus(-31), plus(-24), null, 'occurrence'), move(-20, plus(-24), plus(-17), null, 'occurrence'), move(-10, plus(-17), plus(-3), null, 'occurrence')],
  };
  const items = Object.keys(acts).map(id => t(id));
  const rows = L('homeStuck', items, acts, TODAY, { moves: 3, staleDays: 10 });
  assert.deepEqual(rows.map(r => r.id).sort(), ['resched', 'three'], 'reschedule entries are moves too; repeating occurrences are not');
  const three = rows.find(r => r.id === 'three');
  assert.equal(three.kind, 'moved'); assert.equal(three.moves, 3); assert.equal(three.lastReason, 'Too big'); assert.equal(three.since, plus(-31));
  // The threshold is a setting.
  assert.ok(L('homeStuck', items, acts, TODAY, { moves: 2 }).some(r => r.id === 'two'));
  assert.ok(!L('homeStuck', items, acts, TODAY, { moves: 4 }).some(r => r.id === 'three'));
});

test('homeStuck: the last human reason; settled after the last move leaves the list, a new move brings it back', () => {
  const base = [move(-30, plus(-31), plus(-24), 'Blocked'), move(-20, plus(-24), plus(-17), 'caught up'), move(-10, plus(-17), plus(-3), 'task-sync 2026-09-23')];
  const r1 = L('homeStuck', [t('x')], { x: base }, TODAY, {});
  assert.equal(r1[0].lastReason, 'Blocked', 'the dashboard\'s own words are not a reason: the latest one the user gave shows');
  assert.equal(L('homeStuck', [t('x')], { x: base.slice(1) }, TODAY, {})[0], undefined, 'two moves: not yet');
  assert.equal(L('homeStuck', [t('x')], { x: base.slice(1).concat([move(-5, plus(-3), plus(2))]) }, TODAY, {})[0].lastReason, '', 'no reason of the user\'s: none shown');
  const r2 = L('homeStuck', [t('x')], { x: [...base.slice(0, 2), move(-10, plus(-17), plus(-3), 'Waiting on Sam')] }, TODAY, {});
  assert.equal(r2[0].lastReason, 'Waiting on Sam');
  for (const settle of [{ type: 'estimate', from: 120, to: 30 }, { type: 'plan', from: null, to: TODAY }, { type: 'priority', from: 'p3', to: 'p1' }, { type: 'update', field: 'subtasks', text: 'Broken into 3 steps' }]) {
    assert.deepEqual(L('homeStuck', [t('x')], { x: [...base, Object.assign({ ts: at(-5) }, settle)] }, TODAY, {}), [], settle.type + ' settles it');
  }
  assert.equal(L('homeStuck', [t('x')], { x: [...base, { ts: at(-5), type: 'tags', added: ['x'] }] }, TODAY, {}).length, 1, 'a tag is not a decision');
  const again = [...base, { ts: at(-5), type: 'estimate', from: 120, to: 30 }, move(-2, plus(-3), plus(4))];
  assert.equal(L('homeStuck', [t('x')], { x: again }, TODAY, {})[0].moves, 4, 'moved again after the decision: back on the list');
});

test('homeStuck: in progress with nothing logged for 10 days is stalled; 9 days, or not started, is not', () => {
  const items = [
    t('s10', { status: 'doing', createdAt: new Date(at(-40)).toISOString() }),
    t('s9', { status: 'doing', createdAt: new Date(at(-40)).toISOString() }),
    t('todo', { status: 'todo', createdAt: new Date(at(-40)).toISOString() }),
    t('fresh', { status: 'doing', createdAt: new Date(at(-3)).toISOString() }),
    t('noted', { status: 'doing', createdAt: new Date(at(-40)).toISOString(), touchedAt: at(-2) }),
    t('unknown', { status: 'doing' }),
  ];
  const acts = { s10: [{ ts: at(-10), type: 'status', from: 'todo', to: 'doing' }], s9: [{ ts: at(-9), type: 'status', from: 'todo', to: 'doing' }], todo: [], noted: [{ ts: at(-30), type: 'status' }] };
  const rows = L('homeStuck', items, acts, TODAY, { staleDays: 10 });
  assert.deepEqual(rows.map(r => r.id), ['s10']);
  assert.equal(rows[0].kind, 'stalled'); assert.equal(rows[0].idleDays, 10);
});

test('the model lists a task once: a slipped task that also keeps moving carries its moves', () => {
  const acts = { both: [move(-30, plus(-31), plus(-24)), move(-20, plus(-24), plus(-17)), move(-10, plus(-17), plus(-3), 'Too big')], k: [move(-30, plus(-1), plus(6)), move(-20, plus(6), plus(13)), move(-10, plus(13), plus(20))] };
  const m = L('homeCatchupModel', { tasks: [t('both', { due: plus(-3) }), t('k', { due: plus(20) }), t('p', { planned: plus(-1) })], activity: acts, today: TODAY, prefs: {} });
  assert.deepEqual(m.slipped.map(r => r.id), ['both', 'p']);
  assert.equal(m.slipped[0].moves, 3); assert.equal(m.slipped[0].lastReason, 'Too big');
  assert.deepEqual(m.stuck.map(r => r.id), ['k']);
  assert.equal(m.overdue, 1); assert.equal(m.planned, 1);
  // The moves setting is clamped to 2..10.
  assert.equal(L('homeCatchupModel', { tasks: [t('k', { due: plus(20) })], activity: acts, today: TODAY, prefs: { moves: 99 } }).stuck.length, 0);
});

test('a move: due dates move with a logged reason; missed plans move to the day and lose their old time', () => {
  const rows = [{ id: 'a', field: 'due', from: plus(-2) }, { id: 'b', field: 'planned', from: plus(-1) }, { id: 'c', field: 'due', from: plus(1) }];
  const ch = L('homeCatchupChanges', rows, plus(1), null);
  assert.deepEqual(ch.map(c => c.id), ['a', 'b'], 'a row already on that day is left out');
  assert.equal(ch[0].reason, 'caught up');
  const why = vm.runInContext('(id) => id === "a" ? "Too big" : null', logic);
  assert.equal(plain(vm.runInContext('homeCatchupChanges', logic)(rows, plus(1), why))[0].reason, 'Too big');
  const apply = vm.runInContext('homeCatchupApply', logic);
  const log = [];
  const a = { id: 'a', dueDate: plus(-2), dueTime: '09:00' };
  assert.equal(apply(a, ch[0], (type, d) => log.push([type, d])), true);
  assert.equal(a.dueDate, plus(1)); assert.equal(a.dueTime, '09:00', 'the due time stays');
  const b = { id: 'b', plannedFor: plus(-1), plannedTime: '14:00', plannedMinutes: 60, dueDate: plus(5) };
  assert.equal(apply(b, ch[1], (type, d) => log.push([type, d])), true);
  assert.equal(b.plannedFor, plus(1)); assert.equal(b.plannedTime, undefined); assert.equal(b.plannedMinutes, undefined); assert.equal(b.dueDate, plus(5), 'the deadline stays');
  assert.deepEqual(plain(log), [['date', { from: plus(-2), to: plus(1), reason: 'caught up' }], ['plan', { from: plus(-1), to: plus(1), reason: 'caught up' }]]);
  assert.equal(apply(a, ch[0], () => assert.fail('nothing to log')), false, 'again: nothing changes');
});

test('an overdue task with a plan for a past day: its plan moves too, so it does not stay slipped', () => {
  const tasks = [t('both', { due: plus(-2), planned: plus(-3) }), t('futurePlan', { due: plus(-2), planned: plus(1) })];
  const rows = L('homeCatchupSlipped', tasks, TODAY, {});
  const by = Object.fromEntries(rows.map(r => [r.id, r]));
  assert.equal(by.both.stalePlan, plus(-3)); assert.equal(by.futurePlan.stalePlan, undefined, 'a plan still ahead stays');
  const ch = L('homeCatchupChanges', rows, plus(1), null);
  const apply = vm.runInContext('homeCatchupApply', logic);
  const log = [];
  const both = { id: 'both', dueDate: plus(-2), plannedFor: plus(-3), plannedTime: '09:00' };
  const fut = { id: 'futurePlan', dueDate: plus(-2), plannedFor: plus(1) };
  apply(both, ch.find(c => c.id === 'both'), (type, d) => log.push([type, d.from, d.to]));
  apply(fut, ch.find(c => c.id === 'futurePlan'), () => {});
  assert.equal(both.dueDate, plus(1)); assert.equal(both.plannedFor, plus(1)); assert.equal(both.plannedTime, undefined);
  assert.equal(fut.plannedFor, plus(1)); assert.equal(fut.dueDate, plus(1));
  assert.deepEqual(plain(log), [['date', plus(-2), plus(1)], ['plan', plus(-3), plus(1)]]);
  const after = L('homeCatchupSlipped', [t('both', { due: both.dueDate, planned: both.plannedFor })], TODAY, {});
  assert.deepEqual(after, [], 'nothing left slipped');
  // A plan rolled forward with a move, or in the dashboard's words, decides nothing; a later plan of the user's does.
  const base = [move(-30, plus(-31), plus(-24)), move(-20, plus(-24), plus(-17)), move(-10, plus(-17), plus(-3))];
  const rolled = [...base, { ts: at(-10) + 1, type: 'plan', from: plus(-18), to: plus(-3), reason: 'Blocked' }];
  assert.equal(L('homeStuck', [t('x')], { x: rolled }, TODAY, {}).length, 1);
  assert.equal(L('homeStuck', [t('x')], { x: [...base, { ts: at(-5), type: 'plan', from: null, to: plus(-4), reason: 'caught up' }] }, TODAY, {}).length, 1);
  assert.equal(L('homeStuck', [t('x')], { x: [...base, { ts: at(-5), type: 'plan', from: null, to: plus(-4) }] }, TODAY, {}).length, 0);
});

test('next week: the first day of the user\'s week, moved on to a work day', () => {
  assert.equal(L('homeCatchupNextWeek', TODAY, 'Mon'), plus(7));                  // Monday -> next Monday
  assert.equal(L('homeCatchupNextWeek', plus(3), 'Mon'), plus(7));                // Thursday -> next Monday
  assert.equal(L('homeCatchupNextWeek', plus(6), 'Mon'), plus(7));                // Sunday -> tomorrow (Monday)
  assert.equal(L('homeCatchupNextWeek', plus(3), 'Sun'), plus(6));                // weeks from Sunday
  const weekdays = vm.runInContext('(iso) => { const d = new Date(iso + "T12:00:00Z").getUTCDay(); return d >= 1 && d <= 5; }', logic);
  assert.equal(vm.runInContext('homeCatchupNextWeek', logic)(plus(3), 'Sun', weekdays), plus(7), 'Sunday is not a work day: Monday');
});

/* ───────── in the Home bundle, with the real task model ───────── */
function fakeEl() {
  const attrs = {};
  return { dataset: {}, innerHTML: '', textContent: '', disabled: false, isConnected: true, style: {}, getAttribute: (k) => attrs[k] ?? null,
    setAttribute: (k, v) => { attrs[k] = String(v); }, removeAttribute: (k) => { delete attrs[k]; }, hasAttribute: (k) => k in attrs,
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} }, appendChild() {}, append() {}, querySelector: () => null, querySelectorAll: () => [] };
}
function bundle(st) {
  const calls = { saves: 0, renders: 0, toasts: [] };
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', features: {}, weekStart: 'Mon' }, CSS: { escape: (s) => s }, TextEncoder,
    window: { addEventListener() {} },
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => fakeEl(), body: { appendChild() {} }, hidden: false },
    registerSection() {}, saveUI() {}, undo() {},
    toast: (m, o) => calls.toasts.push({ m, o }), todayStr: () => TODAY, fmtDate: (d) => d.toISOString().slice(0, 10),
    setTimeout: () => 0, clearTimeout() {},
    esc: (s) => String(s), escAttr: (s) => String(s), icon: (n) => `<i data-i="${n}"></i>`,
    _tbShortDate: (iso) => iso, dueLabel: (iso) => iso,
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  const files = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort().map(read);
  vm.runInContext(files.join('\n') + '\n' + read('20-task-model.js') + '\n' + read('73-brief-logic.js'), box, { filename: 'home-catchup-bundle.js' });
  // After the bundle (its own declarations would win): count saves and renders.
  box.saveData = () => { calls.saves++; st._lastSave = (st._lastSave || 0) + 1; };
  box.render = () => { calls.renders++; };
  return { box, calls, run: (code) => vm.runInContext(code, box), json: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, box)) };
}
function cuState() {
  return {
    custom: [
      { id: 'o1', title: 'Send the figures', dueDate: plus(-3), priority: 'p1', stream: 'work' },
      { id: 'o2', title: 'Fix the bike', dueDate: plus(-1), plannedFor: plus(-2), stream: 'home' },
      { id: 'm1', title: 'Read the draft', plannedFor: plus(-1), plannedTime: '10:00', plannedMinutes: 60, dueDate: plus(6), stream: 'work' },
      { id: 'k1', title: 'Write the report', dueDate: plus(9), stream: 'work' },
      { id: 'td', title: 'Due today', dueDate: TODAY },
      { id: 'dn', title: 'Done already', dueDate: plus(-4) },
    ],
    statuses: { dn: 'done' }, deleted: {}, pinned: {}, notes: {}, completionLog: {},
    taskActivity: { k1: [move(-30, plus(-21), plus(-14)), move(-20, plus(-14), plus(-5), 'Too big'), move(-10, plus(-5), plus(9))] },
    home: {},
  };
}

test('in the bundle: registered, available, sizes and settings as the server has them', () => {
  const { json } = bundle(cuState());
  const d = json('homeWidgetDefs().filter(d => d.id === "catchup").map(d => ({ sizes: d.sizes, defaultSize: d.defaultSize, defaultHidden: d.defaultHidden, defaults: d.defaults, available: d.available(), settings: typeof d.settings, title: d.title, sample: typeof d.sample }))')[0];
  const srv = HOME_WIDGETS.find(w => w.id === 'catchup');
  assert.equal(d.available, true);
  assert.deepEqual(d.sizes, srv.sizes); assert.equal(d.defaultSize, srv.defaultSize); assert.equal(d.defaultHidden, true); assert.equal(d.title, srv.title);
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.catchup.properties).sort());
  assert.equal(d.settings, 'function'); assert.equal(d.sample, 'function');
  // The gallery's sample has both sections and only made-up rows.
  const s = json('homeSample("catchup")');
  assert.ok(s.slipped.length && s.stuck.length);
  assert.ok([...s.slipped, ...s.stuck].every(r => /^sample-/.test(r.id)));
});

test('the page model reads the state: slipped (due today and done left out), keeps moving, Home snooze respected', () => {
  const st = cuState();
  const { json } = bundle(st);
  const m = json('homeCatchupNow({ id: "catchup" })');
  assert.deepEqual(m.slipped.map(r => r.id), ['o1', 'o2', 'm1']);
  assert.deepEqual(m.stuck.map(r => r.id), ['k1']);
  st.home = { snoozed: { o2: plus(2) } }; st._lastSave = 99;
  assert.deepEqual(json('homeCatchupNow({ id: "catchup" })').slipped.map(r => r.id), ['o1', 'm1'], 'a task snoozed on Home is hidden from every Home task widget');
});

test('Move all is ONE save (one undo step, one render): due dates with the reason, missed plans to the day', () => {
  const st = cuState();
  const { json, calls, run } = bundle(st);
  run('_hcuWhy.set("o2", "Blocked")');                               // a row's chip: that move's reason
  const n = json('homeCatchupCommit(homeCatchupChanges(homeCatchupNow({ id: "catchup" }).slipped, _hcuTomorrow(), (x) => _hcuWhy.get(x)))');
  assert.equal(n, 3);
  assert.equal(calls.saves, 1, 'one saveData = one undo step');
  assert.equal(calls.renders, 1);
  const by = Object.fromEntries(st.custom.map(x => [x.id, x]));
  assert.equal(by.o1.dueDate, plus(1)); assert.equal(by.o2.dueDate, plus(1));
  assert.equal(by.m1.plannedFor, plus(1)); assert.equal(by.m1.plannedTime, undefined); assert.equal(by.m1.dueDate, plus(6), 'a missed plan keeps its deadline');
  assert.equal(by.td.dueDate, TODAY, 'due today is not touched');
  const last = (id) => st.taskActivity[id][st.taskActivity[id].length - 1];
  assert.equal(last('o1').type, 'date'); assert.equal(last('o1').reason, 'caught up'); assert.equal(last('o1').from, plus(-3));
  assert.equal(last('o2').reason, 'Blocked');
  assert.equal(last('m1').type, 'plan'); assert.equal(last('m1').to, plus(1));
  assert.equal(by.o2.plannedFor, plus(1), 'an overdue task\'s past plan moves with it');
  assert.deepEqual(json('homeCatchupNow({ id: "catchup" }).slipped'), [], 'all caught up: nothing left slipped');
  // Nothing left to move: nothing saved.
  assert.equal(json('homeCatchupCommit(homeCatchupChanges([], _hcuTomorrow()))'), 0);
  assert.equal(calls.saves, 1);
});

test('Break it down: the steps are one save, logged, and the task stops "keeping moving"', () => {
  const st = cuState();
  const { json, calls } = bundle(st);
  assert.deepEqual(json('homeCatchupNow({ id: "catchup" }).stuck.map(r => r.id)'), ['k1']);
  assert.equal(json('homeCatchupAddSteps("k1", ["Outline the sections", "  ", "Draft the summary"])'), 2);
  assert.equal(calls.saves, 1);
  assert.deepEqual(plain(st.custom.find(x => x.id === 'k1').subtasks.map(s => [s.title, s.done])), [['Outline the sections', false], ['Draft the summary', false]]);
  assert.deepEqual(json('homeCatchupNow({ id: "catchup" }).stuck.map(r => r.id)'), [], 'settled after its last move');
  assert.equal(json('homeCatchupAddSteps("k1", [])'), 0);
  assert.equal(calls.saves, 1, 'no steps: nothing saved');
});

test('nothing in the widget sends email, touches money or calls Claude without a click', () => {
  const src = read('12-home-w-catchup.js');
  assert.doesNotMatch(src, /\/api\/gmail|sendMessage|send_message|\/api\/finance|fetch\(/, 'no mail, money or direct requests');
  // Claude is asked only inside the Break it down editor (a click), through askAIJson (the server runs it via lib/claude-runner.mjs).
  const calls = src.split('askAIJson(').length - 1;
  assert.equal(calls, 1);
  assert.match(src, /function homeCatchupBreakDown\([\s\S]*askAIJson\(/);
});
