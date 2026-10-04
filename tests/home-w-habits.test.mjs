// The "habits" Home widget (WIDGETS_CATALOGUE.md 3.12):
//   - the pure model (src/app/12-home-habits-logic.js), alone in a VM: which tasks are
//     habits, the chain for daily / weekday / weekly / fortnightly habits, a skip keeping
//     the chain, a missed day breaking it, today still open not breaking it, the best
//     streak, the 30-day rate and the words;
//   - in the Home bundle: registered and offered, its settings match the server schema,
//     and the gallery sample runs through the same model.
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

const logic = vm.createContext({});
vm.runInContext(read('12-home-habits-logic.js'), logic, { filename: '12-home-habits-logic.js' });
const L = (fn, ...args) => plain(vm.runInContext(fn, logic)(...plain(args)));

// Days are counted in UTC so the test does not depend on the machine's time zone.
const at = (iso, h) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), h ?? 12);
logic.__utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);
function stats(item, o) {
  logic.__item = plain(item); logic.__o = plain(o || {});
  return plain(vm.runInContext('homeHabitStats(__item, Object.assign({ dayOf: __utcDay }, __o))', logic));
}
const TODAY = '2026-10-05';            // a Monday
const habit = (o) => Object.assign({ id: 'h1', title: 'Stretch', recurrence: 'daily', tags: ['habit'], createdAt: at('2026-09-01'), dueDate: TODAY }, o || {});
const skip = (iso) => ({ type: 'occurrence', skipped: true, ts: at(iso) });

test('which tasks: auto prefers the habit tag, else daily/weekday/weekly/fortnightly (monthly left out); tag; all', () => {
  const T = [
    { id: 'a', title: 'Stretch', recurrence: 'daily', tags: [], createdAt: 3 },
    { id: 'b', title: 'Pay rent', recurrence: 'monthly', tags: [], createdAt: 1 },
    { id: 'c', title: 'Weekly review', recurrence: 'weekly', tags: [], createdAt: 2 },
    { id: 'd', title: 'Report', recurrence: 'none', tags: ['habit'], createdAt: 1 },
    { id: 'e', title: 'Plants', recurrence: 'biweekly', tags: [], createdAt: 1 },
    { id: 'f', title: 'Walk', recurrence: 'weekdays', tags: [], createdAt: 1 },
  ];
  const auto = L('homeHabitPick', T, { mode: 'auto' });
  assert.equal(auto.source, 'repeat');
  assert.deepEqual(auto.list.map(t => t.id), ['a', 'f', 'c', 'e'], 'daily, weekdays, weekly, fortnightly; no monthly, no one-off');
  const tagged = T.map(t => (t.id === 'c' ? Object.assign({}, t, { tags: ['#Habit'] }) : t));
  const auto2 = L('homeHabitPick', tagged, { mode: 'auto' });
  assert.equal(auto2.source, 'tag');
  assert.deepEqual(auto2.list.map(t => t.id), ['c'], 'once a task carries the tag, only tagged ones (tag matched without # and case)');
  assert.deepEqual(L('homeHabitPick', T, { mode: 'tag', tag: 'habit' }).list, [], 'a non-repeating task with the tag is not a habit');
  assert.deepEqual(L('homeHabitPick', T, { mode: 'all' }).list.map(t => t.id), ['a', 'f', 'c', 'e', 'b'], 'all: every repeating task, monthly too');
  assert.equal(L('homeHabitTag', ' ##Gym '), 'gym');
  assert.equal(L('homeHabitTag', ''), 'habit');
});

test('daily: done days build the chain; today still open does not break it', () => {
  const s = stats(habit(), { today: TODAY, completions: ['2026-10-02', '2026-10-03', '2026-10-04'].map(d => at(d)) });
  assert.equal(s.kind, 'day');
  assert.equal(s.now, 'due');
  assert.equal(s.tickable, true);
  assert.equal(s.showToday, true);
  assert.equal(s.streak, 3, 'yesterday and the two days before; today is still open');
  assert.equal(s.cells.length, 14);
  assert.deepEqual(s.cells.slice(-4).map(c => c.state), ['done', 'done', 'done', 'due']);
});

test('daily: done today counts and is no longer tickable (a re-click does nothing)', () => {
  const s = stats(habit({ dueDate: '2026-10-06' }), { today: TODAY, completions: ['2026-10-04', '2026-10-05'].map(d => at(d, 8)) });
  assert.equal(s.doneToday, true);
  assert.equal(s.now, 'done');
  assert.equal(s.tickable, false);
  assert.equal(s.streak, 2);
});

test('daily: a missed day breaks the chain; the best streak remembers the longer run', () => {
  const done = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-10-03', '2026-10-04'];
  const s = stats(habit(), { today: TODAY, completions: done.map(d => at(d)) });
  assert.equal(s.streak, 2);
  assert.equal(s.best, 4);
  assert.equal(s.cells.find(c => c.date === '2026-10-02').state, 'missed');
});

test('a skip keeps the chain but does not add to it', () => {
  const s = stats(habit(), {
    today: TODAY, completions: ['2026-10-01', '2026-10-02', '2026-10-04'].map(d => at(d)),
    activity: [skip('2026-10-03')],
  });
  assert.equal(s.streak, 3, '1st, 2nd and 4th done; the 3rd skipped');
  assert.equal(s.cells.find(c => c.date === '2026-10-03').state, 'skipped');
  const today = stats(habit(), { today: TODAY, completions: [at('2026-10-04')], activity: [skip(TODAY)] });
  assert.equal(today.skippedToday, true);
  assert.equal(today.now, 'skipped');
  assert.equal(today.tickable, false);
  assert.equal(today.streak, 1);
});

test('weekdays: weekends are rest days and never break the chain', () => {
  // Thu 1 and Fri 2 done; Sat 3 and Sun 4 off; Mon 5 (today) open.
  const s = stats(habit({ recurrence: 'weekdays' }), { today: TODAY, completions: ['2026-10-01', '2026-10-02'].map(d => at(d)) });
  assert.equal(s.streak, 2);
  assert.deepEqual(s.cells.slice(-5).map(c => c.state), ['done', 'done', 'off', 'off', 'due']);
  assert.equal(s.window.unit, 'weekdays');
  // A missed Friday breaks it.
  const b = stats(habit({ recurrence: 'weekdays' }), { today: TODAY, completions: [at('2026-10-01')] });
  assert.equal(b.streak, 0);
  // Done on a Saturday anyway: shown, not counted as scheduled.
  const x = stats(habit({ recurrence: 'weekdays' }), { today: TODAY, completions: [at('2026-10-02'), at('2026-10-03')] });
  assert.equal(x.cells.find(c => c.date === '2026-10-03').state, 'extra');
  assert.equal(x.streak, 1);
});

test('weekly: a week counts as done when any completion falls inside it; the current week stays open', () => {
  const item = habit({ recurrence: 'weekly', title: 'Weekly review', createdAt: at('2026-09-01') });
  // Weeks start Monday: 14 Sep, 21 Sep, 28 Sep done (any day inside), 5 Oct open.
  const s = stats(item, { today: TODAY, weekStart: 'Mon', completions: ['2026-09-16', '2026-09-27', '2026-09-28'].map(d => at(d)) });
  assert.equal(s.kind, 'period');
  assert.equal(s.now, 'due');
  assert.equal(s.tickable, true);
  assert.equal(s.streak, 3, 'the 14th, 21st and 28th Sep weeks; this week is still open');
  assert.equal(s.window.unit, 'weeks');
  // This week done too.
  const d = stats(item, { today: TODAY, completions: ['2026-09-16', '2026-09-27', '2026-09-28', '2026-10-05'].map(x => at(x)) });
  assert.equal(d.now, 'done');
  assert.equal(d.streak, 4);
  // A week with nothing breaks it.
  const m = stats(item, { today: TODAY, completions: ['2026-09-16', '2026-09-29'].map(x => at(x)) });
  assert.equal(m.streak, 1);
  assert.equal(m.best, 1);
  // A skip inside a week keeps the chain without adding.
  const k = stats(item, { today: TODAY, completions: ['2026-09-16', '2026-09-29'].map(x => at(x)), activity: [skip('2026-09-22')] });
  assert.equal(k.streak, 2);
});

test('every 2 weeks: periods are counted from the week of its date', () => {
  // Due Mon 5 Oct, so fortnights start 21 Sep, 5 Oct (and 7 Sep before).
  const item = habit({ recurrence: 'biweekly', title: 'Plants', createdAt: at('2026-09-01') });
  const s = stats(item, { today: TODAY, completions: ['2026-09-10', '2026-09-30'].map(d => at(d)) });
  assert.equal(s.streak, 2);
  assert.equal(s.now, 'due');
  assert.equal(s.window.unit, 'fortnights');
});

test('a habit that starts later has missed nothing; the 30-day rate counts done of done + missed', () => {
  const later = stats(habit({ createdAt: at('2026-09-01'), dueDate: '2026-10-10' }), { today: TODAY, completions: [] });
  assert.equal(later.now, 'before');
  assert.equal(later.tickable, false);
  assert.equal(later.cells.filter(c => c.state === 'missed').length, 0);
  // Created 10 days ago, done on 5 of the 9 past days, today open.
  const done = ['2026-09-26', '2026-09-28', '2026-09-30', '2026-10-02', '2026-10-04'];
  const r = stats(habit({ createdAt: at('2026-09-26') }), { today: TODAY, completions: done.map(d => at(d)) });
  assert.equal(r.rateDone, 5);
  assert.equal(r.rateOf, 9);
  assert.equal(L('homeHabitSummary', r), 'done 5 of the last 9 days');
  assert.equal(r.heat.length, 56, '8 weeks');
  assert.equal(r.heat[0].date, '2026-08-17', 'the heatmap starts on a week start, 7 weeks before this one');
});

test('a completion from before it became a repeating task does not count', () => {
  const s = stats(habit({ createdAt: at('2026-08-01') }), {
    today: TODAY, completions: [at('2026-09-01'), at('2026-10-04')],
    activity: [{ type: 'recurrence', from: 'none', to: 'daily', ts: at('2026-10-04', 7) }],
  });
  assert.equal(s.start, '2026-10-04');
  assert.equal(s.streak, 1);
  assert.equal(s.best, 1);
});

test('words: the pill\'s accessible name, the row summary, today\'s totals', () => {
  const s = stats(habit({ dueDate: '2026-10-06' }), { today: TODAY, completions: ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'].map(d => at(d)) });
  assert.equal(L('homeHabitSay', 'Stretch', s), 'Stretch, done today, 6-day streak');
  const w = stats(habit({ recurrence: 'weekly' }), { today: TODAY, completions: [at('2026-09-29')] });
  assert.equal(L('homeHabitSay', 'Review', w), 'Review, due this week, 1-week streak');
  const open = stats(habit(), { today: TODAY, completions: [at('2026-10-04')] });
  assert.equal(L('homeHabitSay', 'Read', open), 'Read, not done yet, 1-day streak');
  const tot = L('homeHabitTotals', [s, open]);
  assert.deepEqual([tot.due, tot.done, tot.open, tot.allDone], [2, 1, 1, false]);
  assert.equal(L('homeHabitTotals', [s]).allDone, true);
  assert.equal(L('homeHabitTotals', []).allDone, false, 'nothing due: no celebration');
});

/* ───────── in the Home bundle ───────── */
function fakeEl() {
  const attrs = {};
  return { dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => attrs[k] ?? null, removeAttribute() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [] };
}
function homeBox() {
  const st = { custom: [], statuses: {}, pinned: {}, resources: [], home: {} };
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {} }, STREAMS: {},
    window: { addEventListener() {} }, CSS: { escape: (s) => s }, TextEncoder,
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => fakeEl(), body: { appendChild() {} }, hidden: false },
    registerSection() {}, render() {}, undo() {}, saveData() {}, saveUI() {}, toast() {},
    todayStr: () => TODAY, fmtDate: (d) => d.toISOString().slice(0, 10),
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    esc: (s) => String(s), escAttr: (s) => String(s), icon: (n) => `<i data-i="${n}"></i>`,
    resList: () => [], resGet: () => null,
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  const files = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort();
  vm.runInContext(files.map(read).join('\n'), box, { filename: 'home-bundle.js' });
  return { json: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, box)) };
}

test('registered and offered, with the server\'s metadata and settings schema', () => {
  const { json } = homeBox();
  const d = json('(() => { const d = homeWidgetDef("habits"); return { id: d.id, sizes: d.sizes, defaultSize: d.defaultSize, defaultHidden: d.defaultHidden, group: d.group, aliases: d.aliases, available: homeWidgetAvailable(d), defaults: homeWidgetDefs().find(x => x.id === "habits").defaults } })()');
  const srv = HOME_WIDGETS.find(w => w.id === 'habits');
  assert.equal(d.available, true, 'built: offered in Add widget');
  assert.deepEqual(d.sizes, srv.sizes); assert.equal(d.defaultSize, 's'); assert.equal(d.defaultHidden, true);
  assert.equal(d.group, 'wellbeing'); assert.deepEqual(d.aliases, [...srv.aliases]);
  assert.deepEqual(d.defaults, { mode: 'auto', tag: 'habit', days: 14 });
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.habits.properties).sort());
  assert.deepEqual(check(HOME_WIDGET_PREFS.habits, d.defaults, 'settings'), []);
  assert.notDeepEqual(check(HOME_WIDGET_PREFS.habits, { mode: 'sometimes' }, 'settings'), []);
});

test('the gallery sample: three habits with real chains, run through the same model', () => {
  const { json } = homeBox();
  const s = json('(() => { const s = homeSample("habits"); return s.tasks.map(t => { const st = homeHabitStats(t, { completions: s.completions[t.id], activity: [], today: todayStr() }); return [t.title, st.streak, st.best, st.doneToday]; }); })()');
  assert.deepEqual(s, [['Stretch', 6, 12, true], ['Read 20 pages', 3, 9, false], ['Weekly review', 4, 4, false]]);
});
