// The travel surfaces (travel spec 5.1, 5.2, 5.5, 5.6, 6.4; owner SURFACES): the pure
// rules in src/app/69-travel-ui-logic.js (the top-bar chip, the trip timeline, spending,
// the opt-in card, their time, the Home widget's mode), evaluated with the travel rules
// (lib/travel-logic.mjs), plus the wiring the user's prefilled-editor rule (3 Oct) needs:
// a suggestion's checklist reaches the task card, a proposed time reaches the event card,
// a person's zone is validated by the server op. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTravelLogic } from '../lib/travel-logic.mjs';
import { normTravelConfig } from '../lib/travel-config.mjs';
import { HOME_WIDGETS } from '../lib/home-topbar.mjs';
import { snapInput, scenario, ms, home, PEOPLE } from './fixtures/travel/kit.mjs';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir } from './fixtures/actions-state.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');
const U = loadTravelLogic({ extra: src('69-travel-ui-logic.js') });
const snapAt = (o) => U.trBuildSnapshot(snapInput(Object.assign({}, scenario('trip-tokyo'), o)));
/** The text of one top-level function in a page file (to run a pure one in isolation). */
function fnSource(file, name) {
  const s = src(file);
  const i = s.indexOf(`function ${name}(`);
  assert.ok(i >= 0, name + ' in ' + file);
  let depth = 0, j = s.indexOf('{', i);
  for (; j < s.length; j++) { if (s[j] === '{') depth++; else if (s[j] === '}' && --depth === 0) break; }
  return s.slice(i, j + 1);
}

test('the chip: away in Tokyo shows local and home time; off, or the second clock off, shows nothing', () => {
  const s = snapAt({ now: '2026-10-12T10:00:00+09:00', zone: 'Asia/Tokyo', system: 'Asia/Tokyo' });
  const m = U.trUiChip(s, { cfg: U.trUiCfg({ on: true }) });
  assert.equal(m.mode, 'away');
  assert.equal(m.cc, 'JP');
  assert.equal(m.zone, 'Asia/Tokyo');
  assert.equal(m.homeZone, 'Europe/London');
  assert.equal(m.diffMin, 480, '+8 h in October (BST)');
  assert.deepEqual([m.local.h, m.local.mi, m.home.h], [10, 0, 2]);
  assert.match(m.key, /^away:JP:Asia\/Tokyo$/, 'one key per zone: the chip appears once per zone change');
  assert.equal(U.trUiChip(s, { cfg: U.trUiCfg({ on: false }) }), null, 'travel off: no chip');
  assert.equal(U.trUiChip(s, { cfg: U.trUiCfg({ on: true, secondClock: false }) }), null, 'Settings: second clock off');
  assert.equal(U.trUiChip(Object.assign({}, s, { on: false }), { cfg: U.trUiCfg({ on: true }) }), null);
});

test('the chip: in the 24 h before a leg it is the departure pill ("11 h 30 to BA 7 · leave by …")', () => {
  const s = snapAt({ now: '2026-10-10T00:00:00+01:00' });
  const m = U.trUiChip(s, { cfg: U.trUiCfg({ on: true }) });
  assert.equal(m.mode, 'depart');
  assert.equal(m.leg.code, 'BA 7');
  assert.equal(m.inMin, 690);
  assert.match(m.line, /^11 h 30 to BA 7 · leave by \d\d:\d\d$/);
  const far = snapAt({ now: '2026-10-08T09:00:00+01:00' });
  assert.equal(U.trUiChip(far, { cfg: U.trUiCfg({ on: true }) }), null, 'more than 24 h before: nothing in the top bar');
});

test('countdown, arc, ranges and trip lines', () => {
  assert.equal(U.trUiCountdown(45), '45 min');
  assert.equal(U.trUiCountdown(125), '2 h 05');
  assert.equal(U.trUiCountdown(27 * 60), '1 d 3 h');
  assert.equal(U.trUiArc(13).night, false);
  assert.equal(U.trUiArc(2).night, true);
  assert.ok(U.trUiArc(13).y < U.trUiArc(7).y, 'the sun is higher at 13:00 than at 07:00');
  assert.equal(U.trUiRange('2026-10-04', '2026-10-09'), '4–9 Oct');
  assert.equal(U.trUiRange('2026-09-28', '2026-10-03'), '28 Sep – 3 Oct');
  const before = snapAt({ now: '2026-10-08T09:00:00+01:00' });
  const t = before.trips.find(x => x.dest && x.dest.cc === 'JP');
  assert.equal(U.trUiTripWhen(t, before.today), `${t.label} in 2 days`);
  const during = snapAt({ now: '2026-10-12T10:00:00+09:00', zone: 'Asia/Tokyo', system: 'Asia/Tokyo' });
  const t2 = during.trips.find(x => x.dest && x.dest.cc === 'JP');
  assert.equal(U.trUiTripWhen(t2, during.today), 'day 3 of 7 · back Fri 16 Oct');
});

test('the trip day by day: local days, the leg first, meetings with home time under them', () => {
  const sc = scenario('trip-tokyo');
  const s = snapAt({ now: '2026-10-08T09:00:00+01:00' });
  const t = s.trips.find(x => x.dest && x.dest.cc === 'JP');
  const days = U.trUiTimeline(t, { events: sc.events, tasks: [], zone: 'Europe/London', homeZone: 'Europe/London', now: s.now });
  assert.equal(days[0].date, '2026-10-10');
  assert.equal(days.at(-1).date, '2026-10-16');
  assert.equal(days.length, 7, 'every day of the trip, even the free ones');
  const leg = days[0].items.find(i => i.kind === 'leg');
  assert.ok(leg && /BA 7/.test(leg.title), 'the outbound flight on the first day');
  assert.match(leg.sub, /^leaves 11:30 London · lands 09:30 Sun 11 Oct/, 'a leg keeps its own local times');
  const sync = days.flatMap(d => d.items).find(i => i.title === 'Weekly sync');
  assert.ok(sync, 'a meeting during the trip');
  assert.equal(sync.time, '16:00', 'in Tokyo time');
  assert.equal(sync.home, '08:00 London', 'and home time under it');
});

test('a trip\'s tasks: a dated one only near that trip (a "trip" tag for another trip stays there)', () => {
  const trip = { from: '2026-10-10', to: '2026-10-16', tasks: ['a', 'b', 'c', 'd'] };
  const ids = U.trUiTripTasks(trip, [{ id: 'a', due: '2026-10-08' }, { id: 'b', due: '2026-09-01' }, { id: 'c' }, { id: 'd', planned: '2026-10-16' }, { id: 'e', due: '2026-10-11' }]).map(t => t.id);
  assert.deepEqual(ids, ['a', 'c', 'd']);
});

test('spending: by currency (largest first), what was charged in pounds, fees, the total', () => {
  const s = U.trUiSpend({ byCcy: { JPY: { orig: 18400, home: 96.2, n: 7 }, EUR: { orig: 20, home: 17.1, n: 1 }, GBP: { orig: 0, home: 12, n: 1 } }, homeOnly: 30, fees: 2.5, total: 0 }, 'GBP');
  assert.deepEqual(s.lines.map(l => l.ccy), ['JPY', 'EUR']);
  assert.equal(s.homeOnly, 42, 'home-currency rows join "charged in pounds"');
  assert.equal(s.fees, 2.5);
  assert.equal(s.total, 157.8);
  assert.equal(U.trUiSpend(null, 'GBP').any, false);
});

test('"Turn on travel features?": travel off and a trip abroad soon; Not now holds for that trip; Never and on stop it', () => {
  const s = snapAt({ now: '2026-10-08T09:00:00+01:00', on: false });
  const c = U.trUiOptIn(s, U.trUiCfg({ on: false }), {});
  assert.ok(c, 'a card');
  assert.equal(c.reason, 'trip');
  assert.match(c.key, /^trip:trip-/);
  assert.match(c.text, /Tokyo|Japan/);
  assert.equal(U.trUiOptIn(s, U.trUiCfg({ on: false }), { [c.key]: '2026-10-08' }), null, 'Not now: not again for this trip');
  assert.equal(U.trUiOptIn(s, U.trUiCfg({ on: false, prompt: false }), {}), null, 'Never');
  assert.equal(U.trUiOptIn(s, U.trUiCfg({ on: true }), {}), null, 'already on');
  const abroad = U.trBuildSnapshot(snapInput({ now: '2026-10-08T09:00:00+01:00', on: false, zone: 'Europe/Lisbon', system: 'Europe/Lisbon',
    changes: [{ at: '2026-10-07T08:00:00Z', from: 'Europe/London', to: 'Europe/Lisbon' }] }));
  const z = U.trUiOptIn(abroad, U.trUiCfg({ on: false }), {});
  assert.ok(z && z.reason === 'zone' && z.key === 'zone:Europe/Lisbon', 'a zone abroad asks too');
});

test('their time on the event card: a person with a zone, the verdict, and nothing when it is the same time', () => {
  const people = new Map(PEOPLE.map(p => [p.email, { id: p.id, name: p.name, first: p.name.split(' ')[0], tz: p.tz || '' }]));
  const m = { start: ms('2026-10-13T10:00:00+01:00'), end: ms('2026-10-13T10:30:00+01:00'), zone: 'Europe/London', organizerSelf: true,
    attendees: [{ email: 'me@example.com', self: true }, { email: 'morgan@example.net', name: 'Morgan Test' }] };
  const t = U.trUiTheirTime(m, { myZone: 'Europe/London', people, now: ms('2026-10-12T09:00:00+01:00') });
  assert.equal(t.text, 'Your 10:00 call is 05:00 for Morgan in New York.');
  assert.equal(t.warn, true);
  assert.match(t.verdict, /outside 07:00–21:00 for Morgan/);
  const noon = U.trUiTheirTime(Object.assign({}, m, { start: ms('2026-10-13T15:00:00+01:00'), end: ms('2026-10-13T15:30:00+01:00') }), { myZone: 'Europe/London', people, now: 0 });
  assert.equal(noon.warn, false);
  assert.match(noon.verdict, /suits you; nothing to change/);
  const same = U.trUiTheirTime(Object.assign({}, m, { attendees: [{ email: 'riley@example.com', name: 'Riley Test' }] }), { myZone: 'Europe/London', people, now: 0 });
  assert.equal(same, null, 'nobody with a zone, and the event is in yours: no line');
});

test('the Home widget: before, during and after a trip; idle otherwise', () => {
  assert.equal(U.trUiWidgetMode(snapAt({ now: '2026-10-08T09:00:00+01:00' })).mode, 'before');
  assert.equal(U.trUiWidgetMode(snapAt({ now: '2026-10-12T10:00:00+09:00', zone: 'Asia/Tokyo', system: 'Asia/Tokyo' })).mode, 'away');
  assert.equal(U.trUiWidgetMode(snapAt({ now: '2026-09-01T09:00:00+01:00' })).mode, 'idle', 'six weeks before: not yet');
  assert.equal(U.trUiWidgetMode(snapAt({ now: '2026-10-12T10:00:00+09:00', on: false })).mode, 'idle', 'travel off');
  assert.ok(HOME_WIDGETS.some(w => w.id === 'travel' && w.defaultHidden === true), 'the server knows the widget; hidden by default');
});

test('holidays on the trip\'s days only', () => {
  const t = { from: '2026-10-10', to: '2026-10-16' };
  const l = U.trUiTripHolidays(t, [{ date: '2026-10-12', name: 'Sports Day' }, { date: '2026-11-03', name: 'Culture Day' }]);
  assert.deepEqual(l, [{ date: '2026-10-12', name: 'Sports Day', estimated: false }]);
});

test('config: the surfaces\' switches are kept and checked', () => {
  const c = normTravelConfig({ on: true, secondClock: false, bothTimes: 'always' });
  assert.equal(c.secondClock, false);
  assert.equal(c.bothTimes, 'always');
  assert.equal(normTravelConfig({ bothTimes: 'sometimes' }).bothTimes, 'auto');
  assert.equal(normTravelConfig({}).secondClock, true);
});

test('prefilled editors: the task card takes a suggestion\'s checklist; the event card takes a proposed time', () => {
  // tcDraftFrom (61-task-card.js) is pure: run it alone.
  const tcDraftFrom = new Function(`${fnSource('61-task-card.js', 'tcDraftFrom')}; return tcDraftFrom;`)();
  const d = tcDraftFrom({ title: 'Pack for Tokyo', date: '2026-10-09', tags: ['trip', 'tokyo'], subtasks: ['Passport', ' ', 'Adapter, type A/B'], suggested: true }, 'home', {});
  assert.deepEqual(d.subtasks, ['Passport', 'Adapter, type A/B']);
  assert.equal(d.suggested, true);
  assert.equal(tcDraftFrom('Plain task', 'home', {}).suggested, false, 'a normal new task says nothing about suggestions');
  // The engine marks every task it opens; the task card saves the checklist with it.
  assert.match(fnSource('68-suggest-actions.js', '_sgCheckBlock') && src('68-suggest-actions.js'), /pre\.suggested = true/);
  assert.match(fnSource('61-task-card.js', '_tcCreateSave'), /subtasks: d\.subtasks/);
  // openEvent(id, {propose}) hands the time to the card; _evcWhen shows the editor at it (Save = CalWrite).
  assert.match(fnSource('61-task-card.js', 'openEvent'), /trEvcSetProposal\(id, o\.propose\)/);
  assert.match(fnSource('46-cal-event-edit.js', '_evcWhen'), /trEvcProposal\(ev, ed, where, extra\)/);
  const prop = fnSource('69-travel-ui.js', 'trEvcProposal');
  assert.match(prop, /evcUpdate\(ev, evcPatchDiff\(\{ when: orig \}, \{ when: w \}\)\)/, 'Save goes through evcUpdate (CalWrite: its guest and series questions)');
  assert.doesNotMatch(prop.split("save.addEventListener")[0], /evcUpdate|CalWrite/, 'nothing is written before Save');
});

test('person time zone: update_person takes tz (IANA, old names mapped), refuses junk and UTC; get_person returns it', async () => {
  const dir = makeDataDir();
  try {
    const a = createActions({ dataDir: dir });
    const run = (ops) => a.apply({ ops, source: 'mcp', client: 'test' });
    await run([{ op: 'person.update', id: 'sam', tz: 'Asia/Calcutta' }]);
    const p = (await a.query('person.get', { id: 'sam' }));
    assert.equal(p.tz, 'Asia/Kolkata');
    for (const bad of ['Mars/Olympus', 'UTC']) {
      let code = '';
      try { await run([{ op: 'person.update', id: 'sam', tz: bad }]); } catch (e) { code = e.code; }
      assert.equal(code, 'BAD_VALUE', bad);
    }
    await run([{ op: 'person.update', id: 'sam', tz: '' }]);
    assert.equal((await a.query('person.get', { id: 'sam' })).tz, undefined, "'' removes it");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('top-bar clocks take a zone (local, home or IANA): the server keeps the page\'s rule; a world clock is a second clock', async () => {
  const { normalizeWidget } = await import('../lib/home-topbar.mjs');
  assert.equal(normalizeWidget({ id: 'c', type: 'clock', zone: 'Asia/Tokyo', zoneLabel: 'Tokyo office' }).zone, 'Asia/Tokyo');
  assert.equal(normalizeWidget({ id: 'c', type: 'clock', zone: 'home' }).zone, 'home');
  assert.equal(normalizeWidget({ id: 'c', type: 'clock', zone: 'Mars/Base' }).zone, undefined, 'unknown zone dropped');
  assert.equal(normalizeWidget({ id: 'c', type: 'tasks', zone: 'Asia/Tokyo' }).zone, undefined, 'only clocks have a zone');
  assert.equal(normalizeWidget({ id: 'c', type: 'clock', zone: 'local', zoneLabel: 'x' }).zoneLabel, undefined);
  const dir = makeDataDir();
  try {
    const a = createActions({ dataDir: dir });
    const run = (ops) => a.apply({ ops, source: 'mcp', client: 'test' });
    await run([{ op: 'topbar.add_widget', type: 'clock' }]);
    const r = await run([{ op: 'topbar.add_widget', type: 'clock', zone: 'Asia/Tokyo', zoneLabel: 'Tokyo' }]);
    const id = r.created[0].countdownId;
    const s = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
    const w = s.countdowns.find(x => x.id === id);
    assert.deepEqual([w.type, w.zone, w.zoneLabel], ['clock', 'Asia/Tokyo', 'Tokyo']);
    let code = '';
    try { await run([{ op: 'topbar.add_widget', type: 'clock', zone: 'Asia/Tokyo' }]); } catch (e) { code = e.code; }
    assert.equal(code, 'DUPLICATE_WIDGET', 'one clock per zone');
    try { await run([{ op: 'countdown.update', id, zone: 'Nowhere/Land' }]); code = ''; } catch (e) { code = e.code; }
    assert.equal(code, 'BAD_VALUE');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Settings > Travel & time: every row has a unique 5.9 key; Profile links to it', () => {
  const s = src('69-travel-ui-settings.js');
  const keys = [...s.matchAll(/_trsRow\('([a-z-]+)'/g)].map(m => m[1]).concat([...s.matchAll(/_trsHead\('([a-z-]+)'/g)].map(m => m[1]));
  assert.ok(keys.length >= 12);
  assert.equal(new Set(keys).size, keys.length, 'unique keys');
  assert.match(s, /registerSettingsGroup\(\{\s*id: 'time', title: 'Travel & time', icon: 'globe'/);
  assert.match(src('57-settings.js'), /trSettingsProfileLink/);
  // Forget: asks first, says what stays, deletes the zone history (TravelStore.notTrip forget).
  const f = fnSource('69-travel-ui-settings.js', 'trForgetTripAsk');
  assert.match(f, /confirmDialog/);
  assert.match(f, /calendar events, tasks and payments are not touched/);
  assert.match(f, /notTrip\(id, \{ forget: true/);
});

test('surfaces never write data in render and never fetch other hosts', () => {
  for (const f of ['69-travel-ui.js', '69-travel-ui-trips.js', '69-travel-ui-settings.js', '69-travel-ui-logic.js', '12-home-w-travel.js']) {
    const s = src(f);
    assert.doesNotMatch(s, /fetch\(\s*['"`]https?:/, f + ': only the dashboard\'s own routes');
    assert.doesNotMatch(s, /\bon[a-z]+\s*=\s*["']/i, f + ': no inline handlers');
    assert.doesNotMatch(s, /getBoundingClientRect/, f + ': layout boxes only');
  }
  assert.doesNotMatch(src('69-travel-ui-logic.js'), /\bdocument\b|\bwindow\b|localStorage/, 'the logic file is pure');
});
