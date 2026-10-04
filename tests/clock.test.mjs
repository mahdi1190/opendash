// The one time resolver (travel spec 2.1-2.2, 7.3 "Clock"): effectiveZone,
// canonZone aliases, "today" around midnight in 12 zones, wall times in DST gaps
// and overlaps, difference labels, the fast path against Intl, and the page and
// Node agreeing (the page's own file, evaluated in both). Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  effectiveZone, canonZone, clockPlaceless, clockPartsIn, clockTodayIn, clockOffsetIn, clockAtIn, clockAddDays,
  clockDiffMin, clockFmtDiff, clockDiffLabel, clockZoneLabel, clockAway, clockFor, systemZone, requestZone, processZone, CLOCK_OVERRIDE_READY,
} from '../lib/clock.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const LOGIC = readFileSync(join(APP, '07-core-clock-logic.js'), 'utf8');
const PAGE = readFileSync(join(APP, '07-core-clock.js'), 'utf8');
const Z = (iso) => Date.parse(iso);

/** The logic with the override switch forced on or off (both branches are tested, whatever the build says). */
function logicWith(ready) {
  const code = LOGIC.replace(/const CLOCK_OVERRIDE_READY = (true|false);/, `const CLOCK_OVERRIDE_READY = ${ready};`);
  // eslint-disable-next-line no-new-func
  return new Function(`"use strict";\n${code}\nreturn { effectiveZone, clockFollowOf };`)();
}

test('effectiveZone: follows the computer by default; home only as the last resort', () => {
  for (const ready of [false, true]) {
    const L = logicWith(ready);
    const cfg = { timezone: 'Europe/London' };
    assert.equal(L.effectiveZone(cfg, { zone: 'Asia/Tokyo' }), 'Asia/Tokyo');
    assert.equal(L.effectiveZone(cfg, { zone: 'asia/calcutta' }), 'Asia/Kolkata', 'case and alias folded');
    assert.equal(L.effectiveZone(cfg, { zone: 'Mars/Base' }), 'Europe/London', 'an unknown system zone falls back to home');
    assert.equal(L.effectiveZone(cfg, null), 'Europe/London');
    assert.equal(L.effectiveZone({}, null), 'UTC');
    assert.equal(L.effectiveZone({ timezone: 'Europe/London', time: { follow: 'system' } }, { zone: 'America/New_York' }), 'America/New_York');
    assert.equal(L.clockFollowOf({ time: { follow: 'nonsense' } }), 'system');
  }
});

test('effectiveZone: the override (home, a zone, a trip) only once it is ready', () => {
  const now = Z('2026-10-05T03:00:00Z');
  const home = { timezone: 'Europe/London', time: { follow: 'home' } };
  const zone = { timezone: 'Europe/London', time: { follow: 'zone', zone: 'America/Chicago' } };
  const trip = (until) => ({ timezone: 'Europe/London', time: { follow: 'system', trip: { zone: 'Asia/Tokyo', until } } });
  const on = logicWith(true), off = logicWith(false);
  assert.equal(on.effectiveZone(home, { zone: 'Asia/Tokyo' }, now), 'Europe/London');
  assert.equal(on.effectiveZone(zone, { zone: 'Asia/Tokyo' }, now), 'America/Chicago');
  assert.equal(on.effectiveZone({ ...zone, time: { follow: 'zone', zone: 'Nope/Nope' } }, { zone: 'Asia/Tokyo' }, now), 'Asia/Tokyo', 'a bad fixed zone is ignored');
  assert.equal(on.effectiveZone(trip('2026-10-09'), { zone: 'Europe/London' }, now), 'Asia/Tokyo', 'a trip zone until its date');
  assert.equal(on.effectiveZone(trip('2026-10-04'), { zone: 'Europe/London' }, now), 'Europe/London', 'a trip that ended (in its own zone)');
  assert.equal(on.clockFollowOf(home), 'home');
  // Not ready: the page and the server follow the computer...
  assert.equal(off.effectiveZone(home, { zone: 'Asia/Tokyo' }, now), 'Asia/Tokyo');
  assert.equal(off.effectiveZone(zone, { zone: 'Asia/Tokyo' }, now), 'Asia/Tokyo');
  assert.equal(off.effectiveZone(trip('2026-10-09'), { zone: 'Europe/London' }, now), 'Europe/London');
  assert.equal(off.clockFollowOf(home), 'system');
  // ...except a computer left on UTC with "home" chosen: the server keeps home, the page the computer's (spec 2.5, case 7).
  assert.equal(off.effectiveZone(home, { zone: 'Etc/UTC' }, now), 'Europe/London');
  assert.equal(off.effectiveZone(home, { zone: 'Etc/UTC', page: true }, now), 'UTC');
});

test('canonZone folds renamed and alias ids, so a rename never looks like a trip', () => {
  const pairs = {
    'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Kolkata': 'Asia/Kolkata', 'Europe/Kiev': 'Europe/Kyiv', 'Asia/Saigon': 'Asia/Ho_Chi_Minh',
    'Asia/Katmandu': 'Asia/Kathmandu', 'US/Pacific': 'America/Los_Angeles', 'GB': 'Europe/London', 'Europe/London': 'Europe/London',
    'europe/london': 'Europe/London', 'UTC': 'UTC', 'Etc/UTC': 'UTC', 'Etc/UCT': 'UTC', 'Zulu': 'UTC', 'Japan': 'Asia/Tokyo',
    'America/Buenos_Aires': 'America/Argentina/Buenos_Aires', 'Pacific/Samoa': 'Pacific/Pago_Pago', 'Etc/GMT-9': 'Etc/GMT-9',
  };
  for (const [a, b] of Object.entries(pairs)) assert.equal(canonZone(a), b, a);
  for (const bad of ['', null, undefined, 'Mars/Base', 'x'.repeat(80), 42]) assert.equal(canonZone(bad), '', String(bad));
  assert.ok(clockPlaceless('UTC') && clockPlaceless('Etc/UTC') && clockPlaceless('Etc/GMT+5') && clockPlaceless('GMT'));
  assert.ok(!clockPlaceless('Europe/London') && !clockPlaceless('Asia/Tokyo'));
});

test('"today" around midnight in 12 zones (+14, -11, +5:30, +5:45, +8:45, +13:45 ...)', () => {
  const at = Z('2026-10-03T23:30:00Z');
  const want = {
    'Pacific/Kiritimati': '2026-10-04', 'Pacific/Pago_Pago': '2026-10-03', 'Asia/Kolkata': '2026-10-04', 'Asia/Kathmandu': '2026-10-04',
    'Australia/Eucla': '2026-10-04', 'Europe/London': '2026-10-04', 'America/New_York': '2026-10-03', 'Asia/Tokyo': '2026-10-04',
    'America/St_Johns': '2026-10-03', 'Pacific/Chatham': '2026-10-04', 'UTC': '2026-10-03', 'America/Los_Angeles': '2026-10-03',
  };
  for (const [z, d] of Object.entries(want)) assert.equal(clockTodayIn(z, at), d, z);
  // The edges: the minute before and at local midnight (London is on BST: midnight is 23:00 UTC).
  assert.equal(clockTodayIn('Europe/London', Z('2026-10-03T22:59:59Z')), '2026-10-03');
  assert.equal(clockTodayIn('Europe/London', Z('2026-10-03T23:00:00Z')), '2026-10-04', 'the UTC date would still say the 3rd');
  assert.equal(clockTodayIn('Asia/Kathmandu', Z('2026-10-03T18:14:59Z')), '2026-10-03');
  assert.equal(clockTodayIn('Asia/Kathmandu', Z('2026-10-03T18:15:00Z')), '2026-10-04');
  assert.equal(clockTodayIn('Pacific/Kiritimati', Z('2026-10-03T10:00:00Z')), '2026-10-04');
  // Parts: minutes since midnight and the weekday.
  const p = clockPartsIn(Z('2026-10-03T23:30:00Z'), 'Asia/Kathmandu');
  assert.deepEqual([p.iso, p.h, p.mi, p.min, p.dow, p.off], ['2026-10-04', 5, 15, 315, 0, 345]);
  assert.equal(clockOffsetIn(at, 'Australia/Eucla'), 525);
  assert.equal(clockOffsetIn(at, 'America/St_Johns'), -150);
});

test('wall times: DST gaps give the next valid minute, overlaps the first instant', () => {
  const iso = (ms) => new Date(ms).toISOString().slice(0, 16);
  // Europe/London: spring forward 29 Mar 2026 01:00 -> 02:00; back 25 Oct 2026 02:00 -> 01:00.
  assert.equal(iso(clockAtIn('2026-03-29', 90, 'Europe/London')), '2026-03-29T01:00', '01:30 does not exist: 02:00 BST');
  assert.equal(iso(clockAtIn('2026-03-29', 60, 'Europe/London')), '2026-03-29T01:00');
  assert.equal(iso(clockAtIn('2026-03-29', 120, 'Europe/London')), '2026-03-29T01:00', '02:00 BST is the first valid minute');
  assert.equal(iso(clockAtIn('2026-03-29', 59, 'Europe/London')), '2026-03-29T00:59');
  assert.equal(iso(clockAtIn('2026-10-25', 90, 'Europe/London')), '2026-10-25T00:30', '01:30 happens twice: the first (BST)');
  assert.equal(iso(clockAtIn('2026-10-25', 150, 'Europe/London')), '2026-10-25T02:30');
  // America/New_York: 8 Mar 2026 02:00 -> 03:00; 1 Nov 2026 02:00 -> 01:00.
  assert.equal(iso(clockAtIn('2026-03-08', 150, 'America/New_York')), '2026-03-08T07:00', '02:30 does not exist: 03:00 EDT');
  assert.equal(iso(clockAtIn('2026-11-01', 90, 'America/New_York')), '2026-11-01T05:30', 'the first 01:30 (EDT)');
  // Australia/Lord_Howe: a 30-minute DST (4 Oct 2026 02:00 -> 02:30; 4 Apr 2027 02:00 -> 01:30).
  assert.equal(iso(clockAtIn('2026-10-04', 135, 'Australia/Lord_Howe')), '2026-10-03T15:30', '02:15 does not exist: 02:30 (+11)');
  assert.equal(iso(clockAtIn('2027-04-04', 105, 'Australia/Lord_Howe')), '2027-04-03T14:45', 'the first 01:45 (+11)');
  // Ordinary days, half-hour zones, and a round trip.
  assert.equal(iso(clockAtIn('2026-10-05', 9 * 60, 'Asia/Kolkata')), '2026-10-05T03:30');
  for (const z of ['Europe/London', 'Asia/Tokyo', 'America/St_Johns', 'Pacific/Chatham', 'Asia/Kathmandu']) {
    const t = clockAtIn('2026-07-15', 14 * 60 + 5, z);
    const p = clockPartsIn(t, z);
    assert.deepEqual([p.iso, p.h, p.mi], ['2026-07-15', 14, 5], z);
  }
  assert.equal(clockAddDays('2026-12-31', 1), '2027-01-01');
  assert.equal(clockAddDays('2028-02-28', 1), '2028-02-29');
  assert.equal(clockAddDays('2026-03-29', -1), '2026-03-28');
});

test('difference labels: hours, half and quarter hours, the same time, the date line', () => {
  assert.equal(clockFmtDiff(480), '+8 h');
  assert.equal(clockFmtDiff(-330), '−5 h 30');
  assert.equal(clockFmtDiff(345), '+5 h 45');
  assert.equal(clockFmtDiff(45), '+45 min');
  assert.equal(clockFmtDiff(0), 'Same time as home');
  const summer = Z('2026-07-01T12:00:00Z');
  assert.equal(clockDiffMin('Europe/London', 'Asia/Tokyo', summer), 480);
  assert.equal(clockDiffMin('Europe/London', 'America/New_York', summer), -300);
  assert.equal(clockDiffLabel('Europe/London', 'Asia/Tokyo', summer), '+8 h');
  assert.equal(clockDiffLabel('Europe/London', 'Pacific/Kiritimati', summer), '+13 h · tomorrow there');
  assert.equal(clockDiffLabel('Pacific/Kiritimati', 'Pacific/Pago_Pago', summer), '−25 h · yesterday there');
  assert.equal(clockZoneLabel('America/New_York'), 'New York');
  assert.equal(clockZoneLabel('America/Argentina/Buenos_Aires'), 'Buenos Aires');
  assert.equal(clockZoneLabel('Etc/GMT-9'), 'UTC+9');
  assert.equal(clockZoneLabel('Etc/UTC'), 'UTC');
});

test('away: a country from the place table when there is one, else offset or region', () => {
  const t = Z('2026-07-01T12:00:00Z');
  const cc = (z) => ({ 'Europe/London': 'GB', 'Europe/Lisbon': 'PT', 'Asia/Tokyo': 'JP', 'America/New_York': 'US', 'America/Chicago': 'US' })[z] || '';
  assert.equal(clockAway('Europe/London', 'Europe/London', t, cc).away, false);
  assert.equal(clockAway('Europe/London', 'Europe/Lisbon', t, cc).away, true, 'same offset, another country');
  assert.equal(clockAway('America/New_York', 'America/Chicago', t, cc).away, true, 'same country, another offset');
  assert.deepEqual(clockAway('Europe/London', 'Asia/Tokyo', t, cc), { away: true, cc: 'JP', homeCc: 'GB', diffMin: 480 });
  assert.equal(clockAway('Europe/London', 'Etc/UTC', t, cc).away, false, 'UTC is never a trip');
  assert.equal(clockAway('Europe/London', 'Asia/Tokyo', t).away, true, 'no table: by offset');
});

test('the cached offsets equal Intl, and the native fast path equals the Intl path (10,000 instants)', () => {
  const zones = ['Europe/London', 'America/New_York', 'Australia/Lord_Howe', 'Asia/Kolkata', 'America/St_Johns', 'Pacific/Chatham', 'Africa/Casablanca'];
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const lo = Z('1990-01-01T00:00:00Z'), hi = Z('2040-01-01T00:00:00Z');
  const fmt = new Map(zones.map(z => [z, new Intl.DateTimeFormat('en-US', { timeZone: z, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })]));
  for (let i = 0; i < 2000; i++) {
    const ms = Math.floor(lo + rnd() * (hi - lo));
    for (const z of zones) {
      const p = {}; for (const x of fmt.get(z).formatToParts(new Date(ms))) p[x.type] = x.value;
      const q = clockPartsIn(ms, z);
      assert.deepEqual([q.y, q.mo, q.d, q.h, q.mi], [+p.year, +p.month, +p.day, +p.hour % 24, +p.minute], `${z} ${new Date(ms).toISOString()}`);
    }
  }
  // The fast path: native Date getters in this process's zone give the same as the Intl path.
  const here = processZone();
  for (let i = 0; i < 10000; i++) {
    const ms = Math.floor(lo + rnd() * (hi - lo));
    const d = new Date(ms), q = clockPartsIn(ms, here);
    if (q.y !== d.getFullYear() || q.mo !== d.getMonth() + 1 || q.d !== d.getDate() || q.h !== d.getHours() || q.mi !== d.getMinutes() || q.dow !== d.getDay()) {
      assert.fail(`${here} ${d.toISOString()}: ${JSON.stringify(q)}`);
    }
  }
});

/** The page's Clock in a VM (07-core-clock-logic.js + 07-core-clock.js), with a given config. */
function pageClock(cfg) {
  const box = { APP_CONFIG: cfg, console, Intl, Date, Math, setTimeout, clearTimeout };
  vm.createContext(box);
  vm.runInContext(LOGIC + '\n;\n' + PAGE + '\n;globalThis.__C = Clock;', box, { filename: '07-core-clock.js' });
  return box.__C;
}

test('the page and Node agree: zone, today and wall times from the same file', () => {
  const cfg = { timezone: 'Europe/London', locale: 'en-GB' };
  const C = pageClock(cfg);
  const sys = processZone();
  assert.equal(C.system(), sys);
  assert.equal(C.zone(), effectiveZone(cfg, { zone: sys, page: true }));
  const fixed = Z('2026-10-03T23:30:00Z');
  C._setNow(fixed);
  assert.equal(C.now(), fixed);
  const node = clockFor(cfg, sys, fixed);
  assert.equal(C.today(), node.today);
  assert.equal(C.today('Asia/Tokyo'), '2026-10-04');
  assert.equal(C.today('Pacific/Pago_Pago'), '2026-10-03');
  assert.deepEqual([C.parts(fixed, 'Asia/Kolkata').h, C.parts(fixed, 'Asia/Kolkata').mi], [5, 0]);
  assert.equal(C.at('2026-03-29', 90, 'Europe/London'), clockAtIn('2026-03-29', 90, 'Europe/London'));
  assert.equal(C.at('2026-10-05', 25 * 60, 'Asia/Tokyo'), clockAtIn('2026-10-06', 60, 'Asia/Tokyo'), 'minutes past a day roll over');
  assert.equal(C.offset(fixed, 'Asia/Tokyo'), 540);
  assert.equal(C.diff('Europe/London', 'Asia/Tokyo', fixed), 480);
  assert.equal(C.fmtTime(fixed, { zone: 'Asia/Tokyo', h12: false }), '08:30');
  assert.equal(C.label('America/New_York'), 'New York');
  C.usePlaces({ label: (z) => (z === 'Asia/Tokyo' ? 'Tokyo (table)' : ''), ccOf: (z) => (z === 'Asia/Tokyo' ? 'JP' : z === 'Europe/London' ? 'GB' : '') });
  assert.equal(C.label('Asia/Tokyo'), 'Tokyo (table)');
  assert.equal(C.label('Europe/Paris'), 'Paris');
  // A day passes on the fixed clock: one 'day' event.
  const seen = [];
  C.onChange(e => seen.push(e.kind + ':' + (e.to || '')));
  C._setNow(fixed);
  C._setNow(fixed + 86400000);
  assert.deepEqual(seen.filter(s => s.startsWith('day:')).length, 1);
  C._setNow(null);
});

test('the page Clock: a setting that moves the shown zone emits one zone event (refresh)', () => {
  const cfg = { timezone: 'Europe/London', locale: 'en-GB', time: { follow: 'system' } };
  const C = pageClock(cfg);
  const ev = [];
  C.onChange(e => ev.push(e));
  assert.equal(C.refresh(), false, 'nothing moved');
  if (!CLOCK_OVERRIDE_READY) { assert.equal(C.follow(), 'system'); return; }
  const other = C.system() === 'Asia/Tokyo' ? 'Europe/Paris' : 'Asia/Tokyo';
  cfg.time = { follow: 'zone', zone: other };
  assert.equal(C.refresh('setting'), true);
  assert.equal(C.zone(), other);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].kind, 'zone');
  assert.equal(ev[0].reason, 'setting');
  assert.equal(C.today(), clockTodayIn(other, C.now()));
  assert.equal(C.follow(), 'zone');
});

test('the server picks the system zone: header, then a recent time.json, then this process, then home', () => {
  const now = Z('2026-10-04T10:00:00Z');
  const cfg = { timezone: 'Europe/London' };
  assert.deepEqual(systemZone({ header: 'Asia/Tokyo', stored: { system: { zone: 'America/Chicago', at: '2026-10-04T09:00:00Z' } }, now, cfg }), { zone: 'Asia/Tokyo', source: 'header' });
  assert.deepEqual(systemZone({ header: 'Nope/Nope', stored: { system: { zone: 'America/Chicago', at: '2026-10-04T09:00:00Z' } }, now, cfg }), { zone: 'America/Chicago', source: 'observed' });
  assert.equal(systemZone({ stored: { system: { zone: 'America/Chicago', at: '2026-10-03T09:00:00Z' } }, now, cfg }).source, 'process', 'older than 12 h');
  assert.equal(systemZone({ stored: null, now, cfg }).zone, processZone());
  // The header: validated with Intl, junk ignored.
  const req = (v) => ({ headers: { 'x-dashboard-zone': v } });
  assert.equal(requestZone(req('Asia/Tokyo')), 'Asia/Tokyo');
  assert.equal(requestZone(req('Asia/Calcutta')), 'Asia/Kolkata');
  for (const bad of ['', 'Mars/Base', '../etc/passwd', '<script>', 'x'.repeat(70), undefined]) assert.equal(requestZone(req(bad)), '', String(bad));
  assert.equal(requestZone({ headers: {} }), '');
  // clockFor: the effective day and home, and "away" against home.
  const c = clockFor(cfg, 'Asia/Tokyo', Z('2026-10-04T16:30:00Z'));
  assert.deepEqual([c.today, c.weekday, c.time, c.timezone, c.home, c.away, c.diffMin], ['2026-10-05', 'Monday', '01:30', 'Asia/Tokyo', 'Europe/London', true, 480]);
});
