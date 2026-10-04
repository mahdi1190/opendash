// The SWEEP (travel spec 2.7 "page display code", 2.8 the override): every display
// file asks Clock, so the override is on, and with it the calendar, Home and Tasks
// show a zone other than the computer's without disagreeing with each other or with
// the server. Plus the override's API (87-clock-override.js) and the suggestions'
// 'time.follow' action (T7 "Use Tokyo time", "Keep London time").
// The page files run in a VM on a UK computer (process.env.TZ); the dashboard is told
// to show Tokyo time. Synthetic data only.
process.env.TZ = 'Europe/London';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { countAll, displayClean, overrideConstant, DISPLAY_FILES } from '../tools/clock-audit.mjs';
import { clockFor, effectiveZone } from '../lib/clock.mjs';
import { validateConfig } from '../lib/datadir.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
const eq = (a, b, msg) => assert.deepEqual(plain(a), plain(b), msg);
const H = (h, m = 0) => h * 60 + m;
// 16:00 UTC on Mon 5 Oct 2026: 17:00 Monday in London, 01:00 Tuesday in Tokyo.
const NOW = Date.UTC(2026, 9, 5, 16, 0);
const ukZone = new Date(2026, 9, 5, 12).getTimezoneOffset() === -60;

test('the computer is on UK time for these tests', () => { assert.ok(ukZone, 'process.env.TZ = Europe/London took effect'); });

test('every display file of spec 2.7 asks Clock, so the override is on (spec 2.8)', () => {
  for (const f of DISPLAY_FILES) assert.ok(existsSync(join(ROOT, f)), `${f} exists`);
  const counts = countAll();
  const left = DISPLAY_FILES.filter(f => counts[f]);
  eq(left, [], 'display files still reading the browser\'s clock');
  assert.ok(displayClean(counts));
  assert.equal(overrideConstant(), true, 'CLOCK_OVERRIDE_READY matches the display list');
});

/* ---------- the page, in a VM: Clock + the calendar, Home and Tasks code ---------- */
function pageBox(time, extra = {}) {
  const pad = (n) => String(n).padStart(2, '0');
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);
  const box = {
    console, STREAMS: { work: { label: 'Work', color: 'blue' } }, PRIORITY_ORDER: { p1: 0, p2: 1, p3: 2, p0: 3 },
    APP_CONFIG: { locale: 'en-GB', myEmails: ['me@example.com'], timezone: 'Asia/Tokyo', weekStart: 'Mon', time },
    state: { custom: [], statuses: {}, deleted: {}, people: [], eventMeta: {}, calPrefs: { mode: 'week', hidden: {} } },
    window: { addEventListener() {} }, document: { addEventListener() {} },
    getAllItems: () => box.state.custom, getItem: (id) => box.state.custom.find(t => t.id === id),
    statusOf: () => 'todo', effDate: (t) => t.dueDate || null, effTitle: (t) => t.title, effStream: () => 'work', effPriority: () => 'p0',
    saveData() {}, render() {}, toast() {}, logActivity() {}, esc, escAttr: esc, icon: (n) => `<i data-i="${n}"></i>`, streamIsCustomised: () => false,
    URLSearchParams, pad, ...extra,
  };
  vm.createContext(box);
  loadPageClock(box);
  vm.runInContext('Clock._setNow(' + NOW + ');', box);
  const files = ['08-utils-dates.js', '12-home-plan-logic.js', '12-home-cal.js', '12-home-meet-logic.js', '20-task-plan.js', '22-quick-add.js',
    '40-calendar.js', '43-calendar-meta.js', '45-calendar-grid-logic.js', '46-cal-event-edit-logic.js'];
  vm.runInContext(files.map(read).join('\n;\n'), box, { filename: 'sweep-bundle.js' });
  return box;
}
const EVENTS = [
  // 00:00-01:00 UTC Tue: 09:00-10:00 Tue in Tokyo, 01:00-02:00 Tue in London
  { id: 'e1', summary: 'Stand-up', start: { dateTime: '2026-10-06T00:00:00Z' }, end: { dateTime: '2026-10-06T01:00:00Z' }, calendarId: 'me@example.com' },
  // 20:00-21:00 UTC Mon: 05:00-06:00 Tue in Tokyo, 21:00-22:00 Mon in London
  { id: 'e2', summary: 'Late call', start: { dateTime: '2026-10-05T20:00:00Z' }, end: { dateTime: '2026-10-05T21:00:00Z' }, calendarId: 'me@example.com' },
  { id: 'e3', summary: 'Away day', allDay: true, start: { date: '2026-10-06' }, end: { date: '2026-10-07' }, calendarId: 'me@example.com' },
];
function withEvents(box) {
  const st = vm.runInContext('CalStore.st', box);
  st.data = { status: 'ok', fetchedAt: new Date(NOW).toISOString(), calendars: [{ id: 'me@example.com', name: 'Me' }], events: EVENTS.map(e => Object.assign({}, e)) };
  st.loaded = true;
  return box;
}
const evRows = (box, iso) => box.calEntriesOn(iso, { mine: false }).filter(e => e.kind === 'event').map(e => [e.id, e.allDay ? 'all-day' : e.start, e.allDay ? '' : e.end, e.time || '']);

test('Keep Tokyo time on a UK computer: today, the calendar, the grid, the event card and quick add all say Tuesday in Tokyo', () => {
  const box = withEvents(pageBox({ follow: 'home' }));
  const run = (code) => vm.runInContext(code, box);
  eq([run('Clock.zone()'), run('Clock.system()'), run('Clock.follow()')], ['Asia/Tokyo', 'Europe/London', 'home']);
  assert.equal(run('todayStr()'), '2026-10-06', 'today is Tuesday in Tokyo (Monday in London)');
  assert.equal(run('homeNowMin()'), H(1), 'now is 01:00');
  // Calendar: events on Tokyo's days and wall times
  eq(evRows(box, '2026-10-06'), [['e3', 'all-day', '', ''], ['e2', H(5), H(6), '05:00'], ['e1', H(9), H(10), '09:00']]);
  eq(evRows(box, '2026-10-05'), [], 'nothing left on Monday');
  eq(plain(box.calEventDays(EVENTS[1])), ['2026-10-06', '2026-10-06']);
  assert.equal(box.calEventStart(EVENTS[2]).getTime(), Date.UTC(2026, 9, 5, 15), 'an all-day date starts at midnight in Tokyo');
  // Grid editing and CalWrite times: Tokyo's offset
  const g = box.cglEventGeom(EVENTS[0]);
  eq([g.startDay, g.start, g.end], ['2026-10-06', H(9), H(10)]);
  assert.equal(box.cglLocalIso('2026-10-06', H(9, 30)), '2026-10-06T09:30:00+09:00');
  assert.equal(box.cglLocalIso('2026-10-06', 1440 + 30), '2026-10-07T00:30:00+09:00', 'past midnight: the next day');
  // The event card
  eq(plain(box.evcWhenOf(EVENTS[0])), { allDay: false, startDate: '2026-10-06', startTime: '09:00', endDate: '2026-10-06', endTime: '10:00' });
  assert.equal(box.evcLocalIso('2026-10-06', '09:00'), '2026-10-06T09:00:00+09:00');
  const draft = box.evcDraftFrom({ title: 'New' }, { now: NOW });
  eq([draft.when.startDate, draft.when.startTime], ['2026-10-06', '01:30'], 'a new event starts at the next half hour in Tokyo');
  // Google's prefilled page: the stamp and ctz in one zone
  const url = new URL(box.googleCalendarUrl({ title: 'Plan', date: '2026-10-06', time: '09:00', minutes: 30 }));
  eq([url.searchParams.get('dates'), url.searchParams.get('ctz')], ['20261006T090000/20261006T093000', 'Asia/Tokyo']);
  // Quick add (Tasks): "tomorrow" is Wednesday
  const q = box.parseQuickAdd('Call the bank tomorrow');
  assert.equal(q.dueDate, '2026-10-07');
  assert.equal(run('fmtDate(_qaToday())'), '2026-10-06');
  assert.equal(run('daysUntil("2026-10-06")'), 0);
  // Home meetings: Tokyo days and minutes
  const m = box.homeMeetings([Object.assign({}, EVENTS[0], { attendees: [{ email: 'me@example.com', self: true, response: 'accepted' }, { email: 'guest@example.com' }] })], { myEmails: ['me@example.com'] });
  eq(m.map(x => [x.date, x.startMin, x.endMin]), [['2026-10-06', H(9), H(10)]]);
});

test('the server and the MCP agree with the page: the same zone and "today" (lib/clock.mjs)', () => {
  const cfg = { timezone: 'Asia/Tokyo', time: { follow: 'home' } };
  assert.equal(effectiveZone(cfg, { zone: 'Europe/London' }, NOW), 'Asia/Tokyo');
  const c = clockFor(cfg, 'Europe/London', NOW);
  eq([c.timezone, c.today, c.time], ['Asia/Tokyo', '2026-10-06', '01:00']);
  // A trip's zone (T7): until its date, then the computer's again
  const trip = { timezone: 'Europe/London', time: { follow: 'system', trip: { zone: 'Asia/Tokyo', until: '2026-10-09' } } };
  assert.equal(clockFor(trip, 'Europe/London', NOW).timezone, 'Asia/Tokyo');
  assert.equal(clockFor(trip, 'Europe/London', Date.UTC(2026, 9, 10, 3)).timezone, 'Europe/London', 'the trip is over');
});

test('following the computer (the default) is unchanged: London days and wall times', () => {
  const box = withEvents(pageBox({ follow: 'system' }));
  assert.equal(vm.runInContext('Clock.zone()', box), 'Europe/London');
  assert.equal(vm.runInContext('todayStr()', box), '2026-10-05');
  eq(evRows(box, '2026-10-05'), [['e2', H(21), H(22), '21:00']]);
  eq(evRows(box, '2026-10-06'), [['e3', 'all-day', '', ''], ['e1', H(1), H(2), '01:00']]);
  assert.equal(box.cglLocalIso('2026-10-06', H(9)), '2026-10-06T09:00:00+01:00');
  assert.equal(box.parseQuickAdd('Call the bank tomorrow').dueDate, '2026-10-06');
});

test('a zone change rebuilds the calendar\'s day index (no stale days after the override)', () => {
  const box = withEvents(pageBox({ follow: 'system' }));
  eq(evRows(box, '2026-10-05').map(r => r[0]), ['e2']);
  box.APP_CONFIG.time = { follow: 'home' };          // what ClockOverride.set does after the server said yes
  eq(evRows(box, '2026-10-05').map(r => r[0]), [], 'Monday is empty in Tokyo');
  eq(evRows(box, '2026-10-06').map(r => r[0]), ['e3', 'e2', 'e1']);
});

/* ---------- ClockOverride (87-clock-override.js) ---------- */
function overrideBox(time) {
  const calls = { puts: [], toasts: [], renders: 0, ls: {} };
  const box = {
    console, APP_CONFIG: { locale: 'en-GB', timezone: 'Europe/London', time: time || { follow: 'system' } },
    state: { view: 'home' }, window: { addEventListener() {} }, document: { querySelector: () => null },
    requestAnimationFrame: (fn) => fn(), setView() {}, render() { calls.renders++; }, icon: (n) => `<i data-i="${n}"></i>`,
    toast(msg, o) { calls.toasts.push({ msg, o }); },
    localStorage: { setItem(k, v) { calls.ls[k] = v; }, getItem(k) { return calls.ls[k] || null; } },
    netErrorMessage: (e) => String(e && e.message),
    // The server's own rules: config.json deep-merged with the patch, then validated (lib/datadir.mjs).
    async fetch(url, init) {
      const body = JSON.parse(init.body);
      calls.puts.push({ url, method: init.method, body });
      const cur = box.__server;
      const merged = Object.assign({}, cur, body.time);
      const { config, errors } = validateConfig({ timezone: 'Europe/London', time: merged });
      if (errors.length) return { ok: false, status: 400, json: async () => ({ error: errors.join('; ') }) };
      box.__server = config.time;
      return { ok: true, status: 200, json: async () => ({ timezone: config.timezone, time: config.time }) };
    },
    __server: Object.assign({}, time || { follow: 'system' }),
  };
  vm.createContext(box);
  loadPageClock(box);
  vm.runInContext('Clock._setNow(' + NOW + ');', box);
  vm.runInContext(read('87-clock-override.js'), box, { filename: '87-clock-override.js' });
  return { box, calls, run: (code) => vm.runInContext(code, box) };
}

test('ClockOverride: "Use Tokyo time until Fri 9 Oct" (T7), then Undo; a choice ends the trip\'s zone', async () => {
  const { box, calls, run } = overrideBox();
  assert.equal(run('ClockOverride.ready()'), true);
  assert.equal(run('ClockOverride.check({ follow: "zone", zone: "Mars/Olympus" })'), 'That time zone or date is not known.');
  assert.equal(run('ClockOverride.check({ follow: "system", trip: { zone: "Asia/Tokyo", until: "Friday" } })'), 'That time zone or date is not known.');
  assert.equal(run('ClockOverride.check({ follow: "system", trip: { zone: "Asia/Tokyo", until: "2026-10-09" } })'), '');
  const r = await run('ClockOverride.useTrip("Asia/Tokyo", "2026-10-09")');
  assert.equal(r.ok, true);
  eq(calls.puts.at(-1), { url: '/api/config', method: 'PUT', body: { time: { follow: 'system', zone: null, trip: { zone: 'Asia/Tokyo', until: '2026-10-09' } } } });
  eq([run('Clock.zone()'), run('Clock.today()'), run('ClockOverride.tripOn()')], ['Asia/Tokyo', '2026-10-06', true]);
  assert.equal(run('ClockOverride.describe()'), 'Showing Tokyo time until Fri 9 Oct');
  assert.ok(calls.renders >= 1, 'the page repaints');
  assert.ok(calls.ls['dashboard-clock-time'], 'the other tabs are told');
  const t = calls.toasts.at(-1);
  assert.equal(t.msg, 'Showing Tokyo time until Fri 9 Oct');
  await t.o.action.run();                            // Undo
  await new Promise(res => setImmediate(res));
  assert.equal(run('Clock.zone()'), 'Europe/London');
  eq(plain(box.APP_CONFIG.time), { follow: 'system' }, 'the trip is gone, not merged back');
  // a trip in force, then "Follow this computer": the trip's zone ends
  await run('ClockOverride.useTrip("Asia/Tokyo", "2026-10-09", { quiet: true })');
  await run('ClockOverride.followSystem({ quiet: true })');
  eq([run('Clock.zone()'), plain(box.APP_CONFIG.time)], ['Europe/London', { follow: 'system' }]);
  // "Keep London time" while the computer is in Tokyo: the effective zone stays home
  await run('ClockOverride.useZone("America/New_York", { quiet: true })');
  eq([run('Clock.zone()'), run('ClockOverride.describe()')], ['America/New_York', 'Showing New York time']);
  await run('ClockOverride.keepHome({ quiet: true })');
  eq([run('Clock.zone()'), run('ClockOverride.describe()')], ['Europe/London', 'Showing London time (home)']);
  const same = await run('ClockOverride.keepHome({ quiet: true })');
  assert.equal(same.same, true, 'choosing the same again does nothing');
});

test('ClockOverride: an expired trip zone is not in force; a server refusal changes nothing', async () => {
  const { box, calls, run } = overrideBox({ follow: 'system', trip: { zone: 'Asia/Tokyo', until: '2026-10-01' } });
  eq([run('Clock.zone()'), run('ClockOverride.tripOn()')], ['Europe/London', false]);
  box.fetch = async () => ({ ok: false, status: 503, json: async () => ({ error: 'down' }) });
  const r = await run('ClockOverride.keepHome()');
  eq([r.ok, run('Clock.zone()'), calls.toasts.at(-1).msg], [false, 'Europe/London', 'Not saved: down']);
});

test('the suggestions engine: "time.follow" (instant, Undo) and nav "clock" (the prefilled Dashboard time row)', () => {
  const logic = read('68-suggest-logic.js'), actions = read('68-suggest-actions.js');
  assert.match(logic, /'time\.follow': 'instant'/);
  assert.match(actions, /sgDefineAction\('time\.follow', \{/);
  assert.match(actions, /if \(s\.kind === 'time'\) return typeof ClockOverride !== 'undefined' \? ClockOverride\.set\(s\.before, \{ quiet: true \}\)/, 'Undo puts the old config.time back');
  assert.match(actions, /\['connections', 'view', 'story', 'quickAdd', 'clock'\]\.includes\(a\.to\)/);
  assert.match(actions, /a\.to === 'clock'\) \{ if \(typeof ClockOverride !== 'undefined' && ClockOverride\.ready\(\)\) ClockOverride\.openSettings\(a\.proposal \|\| null\); else window\.open\('ms-settings:dateandtime'\); \}/);
  // The Settings radio (87-clock-ui.js) offers the trip's zone and holds a prefilled choice for Save.
  const ui = read('87-clock-ui.js');
  assert.match(ui, /clockFollowTripOption\(box, after\)/);
  assert.match(ui, /trip: null \} \}/, 'a choice in the radio ends a trip\'s zone');
});
