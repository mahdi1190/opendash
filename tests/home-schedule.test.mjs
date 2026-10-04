// Home's schedule, week and countdowns widgets (src/app/12-home-cal.js,
// 12-home-w-schedule.js, 12-home-w-week.js, 12-home-w-countdowns.js): the
// pure day / week / countdown models run in a VM with the other Home files in
// build order, plus the calendar status rules, the small-cache fallback,
// escaping and the catalogue entries. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { HOME_WIDGETS } from '../lib/home-topbar.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const HOME_FILES = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort();
const H = (h, m = 0) => h * 60 + m;
const pad = (n) => String(n).padStart(2, '0');
const plain = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const eq = (a, b, msg) => assert.deepEqual(plain(a), plain(b), msg);   // values from the VM are another realm
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function homeBox(extra = {}) {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const box = {
    console, state: { custom: [], statuses: {}, people: [] }, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {} },
    window: { addEventListener() {} }, CSS: { escape: (s) => s },
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null },
    registerSection() {}, saveData() {}, saveUI() {}, render() {}, toast() {},
    todayStr: () => '2026-10-09', fmtDate: (d) => iso(d),
    esc: (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]), escAttr: (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]),
    icon: (n) => `<svg data-i="${n}"></svg>`, safeColor: (c, f) => (/^#[0-9a-f]{3,8}$/i.test(String(c)) ? c : f),
    ...extra,
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock: wall times in the dashboard's zone (travel spec 2.7)
  vm.runInContext(HOME_FILES.map(f => readFileSync(join(APP, f), 'utf8')).join('\n'), box, { filename: 'home-bundle.js' });
  return { box, run: (code) => vm.runInContext(code, box) };
}
const ev = (id, s, e, extra = {}) => ({ kind: 'event', key: 'e:' + id, id, title: id, allDay: false, bg: false, start: s, end: e, color: 'blue', type: 'meeting', people: [], ...extra });
const task = (id, s, e, extra = {}) => ({ kind: 'task', key: 't:' + id, id, title: id, allDay: false, bg: false, start: s, end: e, color: '', ...extra });
const shape = (m) => m.rows.map(r => (r.t === 'item' ? `${r.item.id}:${r.state}${r.next ? '*' : ''}` : r.t === 'gap' ? `gap ${r.start}-${r.end}${r.best ? ' best' : ''}${r.lead ? ' lead' : ''}` : 'NOW'));

test('the day model: past, under way, next; the now line after what is under way and before what is still to start', () => {
  const { box } = homeBox();
  const events = [ev('standup', H(9, 30), H(10)), ev('coffee', H(10, 30), H(11, 15)), ev('review', H(13), H(14)), ev('dentist', H(16), H(16, 40))];
  const m = box.homeDayModel({ events, nowMin: H(9, 48) });
  eq(shape(m), ['standup:now', 'NOW', 'coffee:future*', 'gap 675-780', 'review:future', 'gap 840-960 best', 'dentist:future', 'gap 1000-1080']);
  assert.equal(m.next.id, 'coffee');
  assert.equal(m.nextIn, 42, '"in 42 min"');
  eq(m.current.map(x => x.id), ['standup']);
  assert.equal(m.eventCount, 4);
  // An event starting exactly now is under way; one that ended exactly now is past.
  const at10 = box.homeDayModel({ events, nowMin: H(10) });
  eq(shape(at10).slice(0, 2), ['standup:past', 'NOW']);
  const at1030 = box.homeDayModel({ events, nowMin: H(10, 30) });
  eq(shape(at1030).slice(0, 3), ['standup:past', 'coffee:now', 'NOW']);
  assert.equal(at1030.next.id, 'review');
  // After the last one: everything past, the line at the end, nothing next.
  const late = box.homeDayModel({ events, nowMin: H(21) });
  assert.equal(shape(late).at(-1), 'NOW');
  assert.equal(late.next, null);
  assert.equal(late.nextIn, null);
  assert.equal(late.gaps.length, 0, 'no gaps after the working day');
});

test('free gaps: 45 min or more, inside 08:00-18:00, from the next quarter hour, busy blocks merged; timed tasks are busy too', () => {
  const { box } = homeBox();
  const m = box.homeDayModel({ events: [ev('a', H(9), H(10)), ev('b', H(9, 30), H(11)), ev('c', H(11, 30), H(12))], tasks: [task('t', H(14), H(15))], nowMin: H(7, 5) });
  // 08:00-09:00 (60), [09:00-11:00 merged], 11:00-11:30 too short, 12:00-14:00 (120, best), 15:00-18:00 (180).
  eq(m.gaps.map(g => [g.start, g.end, g.best, g.lead]), [[H(8), H(9), false, true], [H(12), H(14), false, false], [H(15), H(18), true, false]]);
  assert.equal(m.freeMin, 60 + 120 + 180);
  const lead = box.homeDayModel({ events: [ev('x', H(13), H(14))], nowMin: H(9, 48) }).gaps[0];
  eq([lead.start, lead.end, lead.lead], [H(10), H(13), true], 'a gap that starts now begins at the next quarter hour');
  // Not today (no now): no now line, nothing past, gaps over the whole working day.
  const other = box.homeDayModel({ events: [ev('x', H(13), H(14))], nowMin: null });
  assert.ok(!other.rows.some(r => r.t === 'now'));
  assert.ok(other.rows.filter(r => r.t === 'item').every(r => r.state === 'future'));
  eq(other.gaps.map(g => [g.start, g.end]), [[H(8), H(13)], [H(14), H(18)]]);
  // A short "best" needs 90 minutes.
  assert.equal(box.homeDayModel({ events: [ev('x', H(8, 45), H(17, 30))], nowMin: null }).gaps.some(g => g.best), false);
});

test('background blocks (leave, out of office, free) and all-day events never become "now" or "next"; tasks are next only without events', () => {
  const { box } = homeBox();
  const m = box.homeDayModel({ events: [ev('ooo', 0, H(24), { allDay: true }), ev('focus-block', H(9), H(12), { bg: true }), ev('call', H(15), H(15, 30))], tasks: [task('t1', H(11), H(11, 30))], nowMin: H(10) });
  eq(m.allDay.map(e => e.id), ['ooo', 'focus-block']);
  assert.equal(m.next.id, 'call', 'the next event wins over an earlier timed task');
  assert.equal(m.eventCount, 2, 'the all-day event and the call; a background block is not an event to count');
  const onlyTasks = box.homeDayModel({ tasks: [task('t1', H(11), H(11, 30)), task('t2', H(16), H(16, 30))], nowMin: H(10) });
  assert.equal(onlyTasks.next.id, 't1');
});

test('the signature (what a minute tick compares) changes only when the picture changes', () => {
  const { box } = homeBox();
  const events = [ev('standup', H(9, 30), H(10)), ev('coffee', H(10, 30), H(11, 15))];
  const sig = (now) => box.homeDayModel({ events, nowMin: now }).sig;
  assert.equal(sig(H(9, 40)), sig(H(9, 44)), 'minutes passing inside the stand-up: same picture ("in N min" updates in place)');
  assert.notEqual(sig(H(9, 59)), sig(H(10)), 'the stand-up ends');
  assert.notEqual(sig(H(10, 29)), sig(H(10, 30)), 'coffee starts');
  assert.equal(box.homeDayModel({ events: [ev('x', H(15), H(16))], nowMin: H(9, 1) }).sig, box.homeDayModel({ events: [ev('x', H(15), H(16))], nowMin: H(9, 14) }).sig, 'the leading gap moves by quarter hours, not every minute');
});

test('durations and times read the way the design writes them', () => {
  const { box } = homeBox();
  assert.equal(box.homeDur(42), '42 min');
  assert.equal(box.homeDur(60), '1 h');
  assert.equal(box.homeDur(90), '1 h 30 min');
  assert.equal(box.homeDur(72), '1 h 12 min');
  assert.equal(box.homeHM(H(9, 5)), '09:05');
  assert.equal(box.homeHM(H(24)), '24:00');
});

test('the calendar status: switched off, loading, nothing connected, read failed, fresh or stale', () => {
  const store = (st, data, extra = {}) => ({ st, data, running: () => false, load() { this.loads = (this.loads || 0) + 1; }, ...extra });
  const mk = (s, features = {}) => homeBox({ CalStore: s, calEntriesOn: () => [], _serverAvailable: true, APP_CONFIG: { locale: 'en-GB', features } }).box;
  assert.equal(mk(store({ loaded: false, loading: false }, null), { calendar: false }).homeCalStatus().off, true);
  const s1 = store({ loaded: false, loading: false }, null);
  const b1 = mk(s1);
  assert.equal(b1.homeCalStatus().loading, true);
  assert.equal(s1.loads, 1, 'the first look starts the store loading');
  assert.equal(mk(store({ loaded: true }, { events: [], calendars: [] })).homeCalStatus().none, true);
  assert.match(mk(store({ loaded: true, error: 'HTTP 500' }, null)).homeCalStatus().error, /500/);
  const fresh = mk(store({ loaded: true }, { fetchedAt: new Date(Date.now() - 3600e3).toISOString(), events: [] })).homeCalStatus();
  assert.equal(fresh.ok, true); assert.equal(fresh.stale, false);
  const old = mk(store({ loaded: true }, { fetchedAt: new Date(Date.now() - 7 * 3600e3).toISOString(), events: [] })).homeCalStatus();
  assert.equal(old.stale, true, 'older than 6 h');
  assert.match(old.label, /^Updated /);
});

test('events from the store are normalised like the brief: colours, scenes, background blocks, people by email', () => {
  const raw = (id, extra) => ({ id, summary: id, ...extra });
  const entries = [
    { kind: 'event', id: 'a', title: 'Coffee with Sam', allDay: false, start: H(10, 30), end: H(11), color: 'teal', ref: raw('a', { location: 'Café', attendees: [{ email: 'SAM@example.com' }, { email: 'me@example.com', self: true }] }) },
    { kind: 'event', id: 'b', title: 'Away', allDay: false, start: H(9), end: H(17), color: 'slate', free: true, ref: raw('b', {}) },
    { kind: 'event', id: 'c', title: 'Declined', allDay: false, start: H(12), end: H(13), declined: true, ref: raw('c', {}) },
    { kind: 'task', id: 'd', title: 'not an event', ref: {} },
  ];
  const { box } = homeBox({ CalStore: { st: { loaded: true }, data: { events: [] } }, calEntriesOn: () => entries, animForEvent: (e) => ({ type: e.id === 'a' ? 'coffee' : 'event' }),
    state: { custom: [], statuses: {}, people: [{ id: 'sam', name: 'Sam', email: 'sam@example.com' }] } });
  const out = box.homeCalEvents('2026-10-09');
  eq(out.map(e => e.id), ['b', 'a'], 'declined and non-events dropped; the background block sorts with the all-day ones');
  const a = out.find(e => e.id === 'a');
  eq([a.type, a.color, a.location, a.people], ['coffee', 'teal', 'Café', ['sam']]);
  eq([out[0].bg, out[0].allDay], [true, true]);
});

test('the small-cache fallback (no calendar store): timed, all-day and multi-day events', () => {
  const soon = { events: [
    { id: 'x', title: 'Stand-up', date: '2026-10-09', start: '09:30', end: '10:00' },
    { id: 'y', title: 'Conference', date: '2026-10-08', until: '2026-10-10', allDay: true },
    { id: 'z', title: 'Tomorrow', date: '2026-10-10', start: '09:00', end: '10:00' },
  ] };
  const { box } = homeBox({ _calSoon: soon });
  const out = box.homeCalEvents('2026-10-09');
  eq(out.map(e => [e.id, e.allDay, e.start, e.end, e.until]), [['y', true, 0, 1440, '2026-10-10'], ['x', false, H(9, 30), H(10), '']]);
});

test('timed tasks: open ones with a time that day, the estimate as their length', () => {
  const items = [
    { id: 't1', title: 'Write', dueDate: '2026-10-09', dueTime: '14:00', estimate: 90, stream: 'w' },
    { id: 't2', title: 'No time', dueDate: '2026-10-09' },
    { id: 't3', title: 'Done', dueDate: '2026-10-09', dueTime: '09:00' },
    { id: 't4', title: 'Other day', dueDate: '2026-10-10', dueTime: '09:00' },
    { id: 't5', title: 'Call', dueDate: '2026-10-09', dueTime: '08:15' },
  ];
  const { box } = homeBox({ getAllItems: () => items, statusOf: (id) => (id === 't3' ? 'done' : 'todo'), effDate: (i) => i.dueDate || null, effTitle: (i) => i.title,
    effStream: (i) => i.stream, effPriority: () => 'p0', STREAMS: { w: { label: 'Work', color: '#2563eb' } } });
  const out = box.homeTimedTasks('2026-10-09');
  eq(out.map(t => [t.id, t.start, t.end, t.estimated]), [['t5', H(8, 15), H(8, 45), false], ['t1', H(14), H(15, 30), true]]);
  assert.equal(out[1].stream, 'Work');
});

test('the week model: 7 days from today, weekends, what is due in order, events split, load, overdue on today only', () => {
  const { box } = homeBox();
  const tasks = [
    { id: 'a', title: 'Low', date: '2026-10-09', prio: 'p3' }, { id: 'b', title: 'Urgent', date: '2026-10-09', prio: 'p1', time: '15:00' },
    { id: 'c', title: 'Urgent earlier', date: '2026-10-09', prio: 'p1', time: '09:00' }, { id: 'd', title: 'Next week', date: '2026-10-20', prio: 'p1' },
  ];
  const evs = { '2026-10-09': [ev('m1', H(9), H(10, 30)), ev('m2', H(14), H(15)), ev('bd', 0, 1440, { allDay: true, type: 'birthday' }), ev('trip', 0, 1440, { allDay: true }), ev('ooo', H(8), H(18), { bg: true })] };
  const week = box.homeWeekModel({ start: '2026-10-09', days: 7, tasks, overdue: 3, countdowns: [{ id: 'cd', label: 'Launch', date: '2026-10-09' }, { id: 'cd2', label: 'Later', date: '2026-10-11' }], eventsOn: (d) => evs[d] || [] });
  assert.equal(week.length, 7);
  eq(week.map(d => d.iso), ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']);
  eq(week.map(d => d.today), [true, false, false, false, false, false, false]);
  eq(week.map(d => d.weekend), [false, true, true, false, false, false, false], 'Fri, Sat, Sun, ...');
  const fri = week[0];
  eq(fri.due.map(x => `${x.kind}:${x.id}`), ['cd:cd', 'task:c', 'task:b', 'task:a', 'bday:bd'], 'countdowns, tasks by priority then time, birthdays');
  eq(fri.events.map(e => e.id), ['m1', 'm2']);
  eq(fri.allDay.map(e => e.id), ['trip'], 'birthdays and background blocks are not listed as all-day events');
  assert.equal(fri.loadMin, 150);
  assert.equal(fri.overdue, 3);
  assert.equal(week[1].overdue, 0);
  eq(week[2].due.map(x => x.id), ['cd2']);
  assert.ok(!week.some(d => d.due.some(x => x.id === 'd')), 'outside the 7 days');
});

test('countdowns: the ones inside their warning window first (soonest first), then by date; past and hidden left out; count-ups last', () => {
  const { box } = homeBox();
  const x = (id, date, c, type = 'countdown') => ({ w: { id, date, type, label: id }, c: Object.assign({ num: '1', unit: 'd', warn: false, past: false, hidden: false, pct: null }, c) });
  const out = box.homeCountdownOrder([
    x('far', '2027-02-01'), x('soon', '2026-10-20'), x('warn-late', '2026-11-01', { warn: true }), x('warn-early', '2026-10-25', { warn: true }),
    x('gone', '2026-09-01', { past: true }), x('hidden', '2026-10-15', { hidden: true }), x('since', '2026-01-01', {}, 'countup'), { w: null, c: null },
  ]);
  eq(out.map(i => i.w.id), ['warn-early', 'warn-late', 'soon', 'far', 'since']);
});

test('text from events and tasks is escaped in the schedule rows and cards', () => {
  const { box } = homeBox({ getPerson: () => null });
  const bad = '<img src=x onerror=alert(1)>';
  const m = box.homeDayModel({ events: [ev('e1', H(10), H(11), { title: bad, location: bad })], nowMin: H(9) });
  const row = m.rows.find(r => r.t === 'item');
  const html = box._hsItemHtml(row, m) + box._hsCardHtml(row, m, 0, 0) + box._hsAllDayHtml([ev('e2', 0, 1440, { allDay: true, title: bad })]);
  assert.ok(!html.includes('<img'), html);
  assert.ok(html.includes('&lt;img'));
});

test('the catalogue: schedule S/M/L (S beside Focus), week L/Full (L beside Waiting on), countdowns S/M and shown by default', () => {
  const by = Object.fromEntries(HOME_WIDGETS.map(w => [w.id, w]));
  eq([[...by.schedule.sizes], by.schedule.defaultSize], [['s', 'm', 'l'], 's']);
  eq([[...by.week.sizes], by.week.defaultSize], [['l', 'full'], 'l']);
  eq([[...by.countdowns.sizes], by.countdowns.defaultSize, by.countdowns.defaultHidden], [['s', 'm'], 's', false]);
  const ids = HOME_WIDGETS.map(w => w.id);
  assert.ok(ids.indexOf('countdowns') < ids.indexOf('week'), 'countdowns sit before the week strip (the design order)');
  assert.equal(ids.indexOf('schedule'), ids.indexOf('focus') + 1, 'the schedule sits right after Focus');
});

test('the default board fills whole shelves of 12 columns (HOME_SPEC.md 3): no gaps on a wide screen', () => {
  const COLS = { s: 4, m: 6, l: 8, full: 12 };
  const shown = HOME_WIDGETS.filter(w => !w.defaultHidden);
  const rows = []; let row = [], used = 0;
  for (const w of shown) {
    const c = COLS[w.defaultSize];
    if (used + c > 12) { rows.push(row); row = []; used = 0; }
    row.push(w.id); used += c;
  }
  rows.push(row);
  // Full-width widgets added later sit on shelves of their own (the brief panel under the hero,
  // Suggestions under Focus + schedule); the original shelves are unchanged around them.
  const own = new Set(['brief', 'suggest']);
  for (const id of own) if (shown.some(w => w.id === id)) assert.ok(rows.some(r => r.length === 1 && r[0] === id), id + ' fills a shelf alone');
  eq(rows.filter(r => !(r.length === 1 && own.has(r[0]))), [['today'], ['focus', 'schedule'], ['finance', 'people', 'countdowns'], ['week', 'waiting']]);
  for (const r of rows) eq(r.reduce((s, id) => s + COLS[HOME_WIDGETS.find(w => w.id === id).defaultSize], 0), 12);
  assert.ok(HOME_WIDGETS.find(w => w.id === 'links').defaultHidden, 'Suggested links waits in Add widget');
});
