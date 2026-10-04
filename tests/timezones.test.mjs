// Time zones, for users anywhere in the world. Nothing may assume one zone:
//   - a new data folder starts on this computer's zone (config.timezone), the page's
//     own default is the browser's zone, and no source file hard-codes a zone;
//   - the server's "today" and clock follow config.timezone (UTC+14 and UTC-4/-5) when the
//     user keeps home time (config.time.follow 'home'; by default they follow the computer,
//     lib/clock.mjs effectiveZone, tested in clock.test.mjs);
//   - Settings says when config.timezone and this computer differ;
//   - daylight-saving days (UK 25 Oct 2026, US 1 Nov 2026, Adelaide 4 Oct 2026,
//     UK 29 Mar 2026): calendar events sit at their wall-clock time on the page,
//     so "next in N min" and the timelines are right; "Yesterday" and "N days ago"
//     count calendar days; iCal times in the repeated hour are the first one;
//   - events that run past midnight are cut at the day's edges (stories, MCP brief);
//   - dates the MCP gives (created, notes, history, people notes, inbox) are on the
//     user's clock, not UTC's.
// The file sets process.env.TZ itself (each test file runs in its own process).
// Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { clock, stampInTz } from '../server/actions/model.mjs';
import { eventMinutesOn } from '../server/actions/calendar-queries.mjs';
import { createActions } from '../server/actions/index.mjs';
import { buildStoryData } from '../lib/story-data.mjs';
import { normaliseEvent } from '../lib/calendar.mjs';
import { zonedToUtc, parseIcal, expandIcal } from '../lib/ical.mjs';
import { dataPaths } from '../lib/datadir.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const plain = (x) => JSON.parse(JSON.stringify(x));
const ME = 'me@example.org';

/* ---------- no fixed zone anywhere ---------- */
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (!/^(node_modules|vendor|fixtures)$/.test(n)) walk(p, out); }
    else if (/\.(mjs|js)$/.test(n)) out.push(p);
  }
  return out;
}
test('no source file hard-codes a time zone (only the Windows-name table and the old-browser list name zones)', () => {
  const ZONE = /['"`](Europe|America|Asia|Australia|Pacific|Africa|Atlantic|Indian|Antarctica)\/[A-Za-z_]+/;
  const allowed = [
    (f, line) => f === 'lib/ical.mjs' && /Standard Time': '/.test(line),                       // Outlook's Windows zone names -> IANA
    (f, line) => f === 'src/app/57-settings.js' && /^\s*return \['UTC', /.test(line),          // the zone list when Intl cannot list them
    // Old-name -> current-name tables (a renamed zone is never a trip): rows of 'Old': 'New' pairs only.
    (f, line) => /^(src\/app\/07-core-clock-logic\.js|server\/actions\/ops-people\.mjs|tools\/travel-data-facts\.mjs)$/.test(f)
      && /^\s*(?:const TZ_ALIASES = \{\s*)?(?:'[A-Za-z0-9_\/+-]+': '[A-Za-z0-9_\/+-]+',?\s*)+(?:\};?)?\s*$/.test(line),
    // An example zone in a tool description or an error message ("such as 'Asia/Tokyo'", "e.g. 'America/New_York'").
    (f, line) => /^server\/actions\/ops-(home|people)\.mjs$/.test(f) && /(such as|e\.g\.) \\?'/.test(line),
    // Gallery previews and the picker's suggested zone: made-up trips, never the user's clock.
    (f, line) => f === 'src/app/12-home-w-travel.js' && /const z = 'Asia\/Tokyo', hz = Clock\.home\(\);/.test(line),
    (f, line) => f === 'src/app/69-travel-moments.js' && /Clock\.home\(\)\) \|\| 'Europe\/London'|zone: 'Asia\/Tokyo', label: 'Tokyo'/.test(line),
    (f, line) => f === 'src/app/69-travel-ui.js' && /zSel\.value = .*: 'Asia\/Tokyo'\);/.test(line),
    // The fake-data generators (demo trips; a default home only when the fake config has none).
    (f) => f === 'tools/fake-trip.mjs' || f === 'tools/make-fake-data.mjs',
  ];
  const found = [];
  for (const file of ['src', 'lib', 'server', 'mcp', 'tools'].flatMap(d => walk(join(ROOT, d))).concat([join(ROOT, 'serve.mjs'), join(ROOT, 'build.mjs')])) {
    const f = relative(ROOT, file).replace(/\\/g, '/');
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (!ZONE.test(line) || /^\s*(\/\/|\*|\/\*)/.test(line)) return;
      if (!allowed.some(ok => ok(f, line))) found.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(found, [], 'a fixed zone in the code: use config.timezone, or the system zone (lib/datadir.mjs systemTimeZone)');
});

test('a new data folder starts on this computer\'s zone, wherever that is', () => {
  const lib = pathToFileURL(join(ROOT, 'lib', 'datadir.mjs')).href;
  for (const zone of ['Asia/Tokyo', 'Pacific/Kiritimati', 'America/New_York', 'Australia/Adelaide', 'Europe/London']) {
    const dir = mkdtempSync(join(tmpdir(), 'tz-new-'));
    try {
      const code = `import { validateConfig, ensureDataDir, systemTimeZone } from ${JSON.stringify(lib)};
        import { readFileSync } from 'node:fs';
        await ensureDataDir(${JSON.stringify(dir)});
        console.log(JSON.stringify([systemTimeZone(), validateConfig({}).config.timezone, validateConfig({ timezone: 'Mars/Base' }).config.timezone,
          JSON.parse(readFileSync(${JSON.stringify(join(dir, 'config.json'))}, 'utf8')).timezone]));`;
      const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, TZ: zone }, encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(JSON.parse(r.stdout.trim()), [zone, zone, zone, zone], zone);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test('the page\'s default zone is the browser\'s own; config.json still wins', () => {
  process.env.TZ = 'Asia/Tokyo';
  const run = (cfg) => {
    const box = { document: { getElementById: () => (cfg ? { textContent: JSON.stringify(cfg) } : null) }, Intl };
    vm.createContext(box);
    vm.runInContext(src('00-core-config.js') + '\n;globalThis.__cfg = APP_CONFIG;', box);
    return box.__cfg.timezone;
  };
  assert.equal(run(null), 'Asia/Tokyo', 'opened as a plain file: this browser\'s zone, not a fixed one');
  assert.equal(run({ timezone: 'America/Chicago' }), 'America/Chicago');
});

/* ---------- the server's clock ---------- */
test('the server\'s today and time follow config.timezone (UTC+14, UTC-4, London), and the MCP context says so', async () => {
  const at = new Date('2026-10-24T10:30:00Z');
  assert.deepEqual(clock('Pacific/Kiritimati', at), { today: '2026-10-25', weekday: 'Sunday', time: '00:30', timezone: 'Pacific/Kiritimati' });
  assert.deepEqual(clock('America/New_York', at), { today: '2026-10-24', weekday: 'Saturday', time: '06:30', timezone: 'America/New_York' });
  assert.deepEqual(clock('Europe/London', new Date('2026-10-24T23:30:00Z')), { today: '2026-10-25', weekday: 'Sunday', time: '00:30', timezone: 'Europe/London' }, 'GMT again after the change');
  assert.equal(clock('Australia/Adelaide', new Date('2026-10-03T15:00:00Z')).time, '00:30', '+9:30 before its daylight saving starts');
  const dir = mkdtempSync(join(tmpdir(), 'tz-ctx-'));
  try {
    mkdirSync(join(dir, 'state'), { recursive: true });
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ userName: 'Test', timezone: 'Pacific/Kiritimati', time: { follow: 'home' } }));
    writeFileSync(join(dir, 'state', 'dashboard-state.json'), JSON.stringify({ _lastSave: 1, custom: [], streams: [{ id: 'work', label: 'Work', color: '#2563eb', order: 0 }] }));
    const a = createActions({ dataDir: dir, now: () => at.getTime() });
    const c = await a.query('context.get', {});
    assert.equal(c.today, '2026-10-25'); assert.equal(c.timezone, 'Pacific/Kiritimati'); assert.equal(c.time, '00:30');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ---------- Settings ---------- */
test('Settings: the time zone row says when this computer is somewhere else', () => {
  const s = src('57-settings.js');
  const fn = /function settingsZoneNote\([\s\S]*?\n}\n/.exec(s);
  assert.ok(fn, 'settingsZoneNote in 57-settings.js');
  const box = {};
  vm.createContext(box);
  vm.runInContext(fn[0] + ';globalThis.__note = settingsZoneNote;', box);
  assert.deepEqual(plain(box.__note('Asia/Tokyo', 'Asia/Tokyo')), { mismatch: false, text: 'This computer is on Asia/Tokyo too.' });
  const n = plain(box.__note('Europe/London', 'America/New_York'));
  assert.equal(n.mismatch, true);
  assert.match(n.text, /This computer is on America\/New_York\..*use Europe\/London/);
  assert.match(s, /'Use ' \+ here/, 'a one-click "Use <this computer\'s zone>"');
  assert.match(s, /settingsSaveConfig\(\{ timezone: v \}/, 'saved to config.timezone');
});

/* ---------- the page on daylight-saving days ---------- */
function calBox() {
  const box = {
    console, state: { calPrefs: { hidden: { tasks: true, countdowns: true } }, countdowns: [] },
    APP_CONFIG: { myEmails: [ME], locale: 'en-GB' }, window: { addEventListener() {} }, document: { addEventListener() {}, querySelector: () => null },
    setTimeout, clearTimeout, setInterval, fetch: async () => ({ ok: false }), _serverAvailable: false, fmtDate,
  };
  vm.createContext(box);
  // The page's Clock (07-core-clock*.js) follows the computer's zone, as the page does by default.
  vm.runInContext(clockSrc(), box, { filename: '07-core-clock.js' });
  vm.runInContext(src('40-calendar.js'), box, { filename: '40-calendar.js' });
  return box;
}
function clockSrc() { return [src('07-core-clock-logic.js'), src('07-core-clock.js')].join('\n;\n'); }
/** Move this process to another zone and tell the page's Clock at once (no 2 s debounce). */
function setZone(box, zone) {
  process.env.TZ = zone;
  vm.runInContext('Clock.check({ now: true })', box);
}
const timed = (id, a, b) => ({ id, summary: id, calendarId: ME, allDay: false, start: { dateTime: a }, end: { dateTime: b } });
function entriesOn(box, events, iso) {
  box.__data = { fetchedAt: String(Math.random()), calendars: [{ id: ME, name: 'Me' }], events };
  vm.runInContext('CalStore.st.data = __data; _calIndex = null;', box);
  return JSON.parse(vm.runInContext(`JSON.stringify(calEntriesOn(${JSON.stringify(iso)}, { sources: { google: true, tasks: false, countdowns: false } }).map(e => [e.id, e.start, e.end]))`, box));
}
test('daylight-saving days: events sit at their wall-clock time on the page (Home, the brief, week and day views)', () => {
  const box = calBox();
  setZone(box, 'Europe/London');                    // Sun 25 Oct 2026: 02:00 BST -> 01:00 GMT (a 25-hour day)
  const uk = [
    timed('before', '2026-10-25T00:40:00+01:00', '2026-10-25T01:10:00+01:00'),
    timed('first-0130', '2026-10-25T01:30:00+01:00', '2026-10-25T01:45:00+01:00'),
    timed('second-0130', '2026-10-25T01:30:00+00:00', '2026-10-25T01:45:00+00:00'),
    timed('three', '2026-10-25T03:00:00Z', '2026-10-25T03:30:00Z'),
    timed('ten', '2026-10-25T10:00:00Z', '2026-10-25T11:00:00Z'),
    timed('ny-ten', '2026-10-25T10:00:00-04:00', '2026-10-25T11:00:00-04:00'),   // New York is still on EDT that day
    timed('late', '2026-10-25T23:00:00Z', '2026-10-26T01:00:00Z'),
  ];
  assert.deepEqual(entriesOn(box, uk, '2026-10-25'), [['before', 40, 70], ['first-0130', 90, 105], ['second-0130', 90, 105], ['three', 180, 210], ['ten', 600, 660], ['ny-ten', 840, 900], ['late', 1380, 1440]]);
  assert.deepEqual(entriesOn(box, uk, '2026-10-26'), [['late', 0, 60]], 'the next day: from midnight');
  const lateSat = [timed('sat-late', '2026-10-24T23:00:00+01:00', '2026-10-25T01:00:00+00:00')];
  assert.deepEqual(entriesOn(box, lateSat, '2026-10-24'), [['sat-late', 1380, 1440]]);
  assert.deepEqual(entriesOn(box, lateSat, '2026-10-25'), [['sat-late', 0, 60]], '01:00 GMT is two hours after 23:00 BST, at 01:00 on the clock');
  assert.deepEqual(entriesOn(box, [timed('spring', '2026-03-29T09:00:00Z', '2026-03-29T10:00:00Z')], '2026-03-29'), [['spring', 600, 660]], 'a 23-hour day: 10:00 BST');

  setZone(box, 'America/New_York');                 // Sun 1 Nov 2026: 02:00 EDT -> 01:00 EST
  assert.deepEqual(entriesOn(box, [timed('ten', '2026-11-01T15:00:00Z', '2026-11-01T16:00:00Z'), timed('three', '2026-11-01T08:00:00Z', '2026-11-01T08:30:00Z')], '2026-11-01'),
    [['three', 180, 210], ['ten', 600, 660]]);
  setZone(box, 'Australia/Adelaide');               // Sun 4 Oct 2026: 02:00 ACST (+9:30) -> 03:00 ACDT (+10:30)
  assert.deepEqual(entriesOn(box, [timed('ten', '2026-10-04T10:00:00+10:30', '2026-10-04T11:00:00+10:30')], '2026-10-04'), [['ten', 600, 660]]);
  setZone(box, 'Pacific/Kiritimati');               // +14: a UTC morning is already the next day
  assert.deepEqual(entriesOn(box, [timed('morning', '2026-10-24T20:00:00Z', '2026-10-24T21:00:00Z')], '2026-10-25'), [['morning', 600, 660]]);
});

test('Home: "in N min" is real time on the night the clocks change (as the brief counts it)', () => {
  process.env.TZ = 'Europe/London';
  const box = { console, fmtDate, todayStr: () => '2026-10-25' };
  vm.createContext(box);
  vm.runInContext(src('12-home-cal.js'), box, { filename: '12-home-cal.js' });
  const ev = (extra) => ({ kind: 'event', key: 'e:x', id: 'x', title: 'Early train', allDay: false, start: 180, end: 210, ...extra });
  const nowMs = Date.parse('2026-10-25T00:30:00+01:00');   // 00:30 BST
  assert.equal(box.homeDayModel({ events: [ev({ at: Date.parse('2026-10-25T03:00:00Z') })], nowMin: 30, nowMs }).nextIn, 210, '03:00 GMT is 3 h 30 min away');
  assert.equal(box.homeDayModel({ events: [ev({})], nowMin: 30, nowMs }).nextIn, 150, 'no instant (a timed task): clock minutes');
  assert.equal(box.homeDayModel({ events: [ev({ at: Date.parse('2026-10-26T03:00:00Z'), start: 180 })], nowMin: 30, nowMs: Date.parse('2026-10-26T00:30:00Z') }).nextIn, 150, 'an ordinary night: the same either way');
  // The page passes the instant of every timed event and the clock to the model.
  assert.match(src('12-home-cal.js'), /at: !e\.allDay && ev\.start && ev\.start\.dateTime \? Date\.parse\(ev\.start\.dateTime\)/);
  assert.equal((src('12-home-w-schedule.js').match(/nowMs: (?:Date|Clock)\.now\(\)/g) || []).length, 2);   // Clock.now(): the page's clock (fixable for tests)
});

test('daylight-saving days: "Yesterday" and timestamps count calendar days, not 24-hour steps', () => {
  process.env.TZ = 'Europe/London';                 // Sun 29 Mar 2026 has 23 hours
  const now = new Date(2026, 2, 30, 0, 30).getTime();
  class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } }
  const box = { Date: FakeDate, APP_CONFIG: { locale: 'en-GB' } };
  vm.createContext(box);
  vm.runInContext(src('08-utils-dates.js') + ';globalThis.__fmt = formatTimestamp;', box);
  assert.equal(box.__fmt(new Date(2026, 2, 29, 12, 0).getTime()), 'Yesterday, 12:00');
  assert.equal(box.__fmt(new Date(2026, 2, 30, 0, 10).getTime()), 'Today, 00:10');
  const ppl = src('51-people-section.js');
  const fns = ['_pplDayMs', '_pplAgo'].map(n => new RegExp(`function ${n}\\([\\s\\S]*?\\n}\\n|function ${n}\\([^\\n]*\\n`).exec(ppl)[0]);
  const pb = { todayStr: () => '2026-03-30', fmtDate, setTimeout, clearTimeout };
  vm.createContext(pb);
  vm.runInContext(clockSrc() + '\n;\n' + fns.join('\n') + ';globalThis.__ago = _pplAgo;', pb);
  assert.equal(pb.__ago(new Date(2026, 2, 29, 12).getTime()), 'Yesterday', 'two local midnights 23 hours apart are still a day');
  assert.equal(pb.__ago(new Date(2026, 2, 27, 12).getTime()), '3 days ago');
});

/* ---------- iCal: the repeated hour and the missing hour ---------- */
test('iCal times: the repeated hour is the first one (RFC 5545), the missing hour moves forward', () => {
  const iso = (ms) => new Date(ms).toISOString();
  assert.equal(iso(zonedToUtc(2026, 10, 25, 1, 30, 0, 'Europe/London')), '2026-10-25T00:30:00.000Z', '01:30 BST, not 01:30 GMT');
  assert.equal(iso(zonedToUtc(2026, 11, 1, 1, 30, 0, 'America/New_York')), '2026-11-01T05:30:00.000Z', '01:30 EDT');
  assert.equal(iso(zonedToUtc(2026, 4, 5, 2, 30, 0, 'Australia/Adelaide')), '2026-04-04T16:00:00.000Z', '02:30 ACDT');
  assert.equal(iso(zonedToUtc(2026, 3, 29, 1, 30, 0, 'Europe/London')), '2026-03-29T01:30:00.000Z', 'no 01:30 that night: 02:30 BST');
  assert.equal(iso(zonedToUtc(2026, 10, 4, 2, 30, 0, 'Australia/Adelaide')), '2026-10-03T17:00:00.000Z', 'no 02:30 that night: 03:30 ACDT');
  assert.equal(iso(zonedToUtc(2026, 7, 1, 12, 0, 0, 'Pacific/Kiritimati')), '2026-06-30T22:00:00.000Z');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:night@test', 'SUMMARY:Night shift', 'DTSTART;TZID=Europe/London:20261018T013000',
    'DTEND;TZID=Europe/London:20261018T020000', 'RRULE:FREQ=WEEKLY;COUNT=3', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const r = expandIcal(parseIcal(ics), { from: '2026-10-01', to: '2026-11-30', timeZone: 'Europe/London' });
  assert.deepEqual(r.events.map(e => e.start.dateTime), ['2026-10-18T00:30:00.000Z', '2026-10-25T00:30:00.000Z', '2026-11-01T01:30:00.000Z'], 'the same 01:30 on the clock each week');
});

/* ---------- events that run past midnight ---------- */
test('an event past midnight is cut at the day\'s edges: never over before it began', () => {
  assert.deepEqual(eventMinutesOn({ date: '2026-10-24', start: '23:00', end: '01:00', until: '2026-10-25' }), { start: 1380, end: 1440 });
  assert.deepEqual(eventMinutesOn({ date: '2026-10-24', start: '23:00', end: '01:00', until: '2026-10-25' }, '2026-10-25'), { start: 0, end: 60 });
  assert.deepEqual(eventMinutesOn({ date: '2026-10-23', start: '22:00', end: '06:00', until: '2026-10-25' }, '2026-10-24'), { start: 0, end: 1440 }, 'a middle day');
  assert.deepEqual(eventMinutesOn({ date: '2026-10-24', start: '23:00', end: '00:00' }), { start: 1380, end: 1440 }, 'ends at midnight');
  assert.deepEqual(eventMinutesOn({ date: '2026-10-24', start: '09:30', end: '10:15' }), { start: 570, end: 615 });
  assert.equal(eventMinutesOn({ date: '2026-10-24', allDay: true }), null);
});

function storyDir(zone, events) {
  const dir = mkdtempSync(join(tmpdir(), 'tz-story-'));
  mkdirSync(join(dir, 'state'), { recursive: true });
  mkdirSync(join(dir, 'calendar'), { recursive: true });
  const cfg = { userName: 'Robin Example', timezone: zone, time: { follow: 'home' }, weekStart: 'Mon', myEmails: [ME] };
  writeFileSync(join(dir, 'config.json'), JSON.stringify(cfg));
  writeFileSync(join(dir, 'calendar', 'events.json'), JSON.stringify({ version: 2, fetchedAt: new Date().toISOString(), calendars: [{ id: ME, name: 'Me' }],
    events: events.map(([id, a, b]) => normaliseEvent({ id, summary: id.replace(/-/g, ' '), start: { dateTime: a }, end: { dateTime: b }, status: 'confirmed' }, ME)) }));
  const state = { _lastSave: 1, custom: [], statuses: {}, people: [], streams: [] };
  writeFileSync(join(dir, 'state', 'dashboard-state.json'), JSON.stringify(state));
  return { dir, cfg, state };
}
test('the stories in Tokyo at 23:30: the late event is on now, not "held"; tomorrow starts it at midnight', async () => {
  const { dir, cfg, state } = storyDir('Asia/Tokyo', [
    ['Late-call', '2026-10-24T23:00:00+09:00', '2026-10-25T01:00:00+09:00'],
    ['Quick-sync', '2026-10-24T23:40:00+09:00', '2026-10-25T00:10:00+09:00'],
    ['Breakfast', '2026-10-25T08:00:00+09:00', '2026-10-25T09:00:00+09:00'],
  ]);
  try {
    const now = new Date('2026-10-24T23:30:00+09:00');
    const q = { s: state, cfg, clock: clock(cfg.timezone, now), paths: dataPaths(dir), financeDir: null };
    const ev = await buildStoryData(q, 'evening', { weather: null, now });
    assert.equal(ev.date, '2026-10-24'); assert.equal(ev.now, '23:30');
    assert.deepEqual(ev.held, [], 'nothing is over yet');
    const late = ev.events.find(e => e.id === 'Late-call');
    assert.deepEqual([late.startMin, late.endMin, late.minutes], [1380, 1440, 60], 'as seen today');
    const mo = await buildStoryData(q, 'morning', { weather: null, now });
    assert.equal(mo.next, 'Late-call', 'under way now');
    const next = await buildStoryData({ ...q, clock: clock(cfg.timezone, new Date('2026-10-25T00:20:00+09:00')) }, 'morning', { weather: null, now: new Date('2026-10-25T00:20:00+09:00') });
    assert.equal(next.date, '2026-10-25');
    const tl = next.events.filter(e => !e.allDay).map(e => [e.id, e.startMin, e.endMin]);
    assert.deepEqual(tl, [['Late-call', 0, 60], ['Quick-sync', 0, 10], ['Breakfast', 480, 540]], 'from midnight on the second day');
    assert.equal(next.next, 'Late-call');
    // The MCP brief for that day agrees.
    const b = await createActions({ dataDir: dir, now: () => new Date('2026-10-25T00:20:00+09:00').getTime() }).query('brief.get', { date: '2026-10-25' });
    assert.deepEqual(b.brief.schedule.map(x => [x.title, x.start, x.end]), [['Late call', '23:00', '01:00'], ['Quick sync', '23:40', '00:10'], ['Breakfast', '08:00', '09:00']]);
    assert.ok(!b.brief.gaps.some(g => g.minutes < 0), 'no negative gaps');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ---------- MCP dates on the user's clock ---------- */
test('dates the MCP gives are on the user\'s clock: created, notes, history, people notes, inbox (UTC+14)', async () => {
  assert.equal(stampInTz(Date.UTC(2026, 9, 24, 12), 'Pacific/Kiritimati'), '2026-10-25T02:00');
  assert.equal(stampInTz(Date.UTC(2026, 9, 24, 23, 30), 'Europe/London'), '2026-10-25T00:30', 'BST before the change');
  assert.equal(stampInTz(Date.UTC(2026, 9, 25, 23, 30), 'Europe/London'), '2026-10-25T23:30', 'GMT after it');
  assert.equal(stampInTz('not a date', 'Europe/London'), null);
  const dir = mkdtempSync(join(tmpdir(), 'tz-mcp-'));
  try {
    const ts = Date.UTC(2026, 9, 24, 12);           // 02:00 on Sunday 25 Oct in Kiritimati
    mkdirSync(join(dir, 'state'), { recursive: true });
    mkdirSync(join(dir, 'inbox'), { recursive: true });
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ userName: 'Test', timezone: 'Pacific/Kiritimati', time: { follow: 'home' } }));
    writeFileSync(join(dir, 'state', 'dashboard-state.json'), JSON.stringify({
      _lastSave: 1, streams: [{ id: 'work', label: 'Work', color: '#2563eb', order: 0 }],
      people: [{ id: 'sam', name: 'Sam Taylor', email: 'sam@example.org', notes: [{ id: 'pn1', ts, text: 'Met for coffee' }] }],
      custom: [{ id: 'u-1', title: 'Write the report', stream: 'work', priority: 'p2', tags: [], people: ['sam'], createdAt: ts, subtasks: [], recurrence: 'none' }],
      notes: { 'u-1': [{ id: 'n1', ts, text: 'Started' }] },
      taskActivity: { 'u-1': [{ id: 'a1', ts, type: 'created' }] },
    }));
    // list_inbox looks back from the real clock: a message at 12:00 UTC in the last day (already the next day at +14).
    const noon = new Date(); noon.setUTCHours(12, 0, 0, 0);
    if (noon.getTime() > Date.now()) noon.setUTCDate(noon.getUTCDate() - 1);
    const mailDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Kiritimati' }).format(noon);
    assert.notEqual(mailDay, noon.toISOString().slice(0, 10));
    writeFileSync(join(dir, 'inbox', 'messages.json'), JSON.stringify({ fetchedAt: noon.toISOString(), messages: [
      { id: 'm1', subject: 'Hello', sender: 'Sam Taylor <sam@example.org>', from: { name: 'Sam Taylor', email: 'sam@example.org' }, date: noon.toISOString(), snippet: 'Hi' },
    ] }));
    const a = createActions({ dataDir: dir, now: () => ts + 3600000 });
    const t = await a.query('task.get', { id: 'u-1' });
    assert.equal(t.createdAt, '2026-10-25');
    assert.equal(t.notes[0].at, '2026-10-25T02:00');
    assert.equal(t.history[0].at, '2026-10-25T02:00');
    const p = await a.query('person.get', { id: 'sam' });
    assert.equal(p.notes[0].date, '2026-10-25');
    const ib = await a.query('inbox.list', { days: 7 });
    assert.deepEqual(ib.threads.map(x => [x.id, x.date]), [['m1', mailDay]], 'the day it arrived in Kiritimati, not in UTC');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
