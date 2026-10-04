// The travel suggestions TR1-TR14 (travel spec 5.6, 7.3 "Rules"), plus the long-stay card (3.3).
// Each rule fires on its fixture and stays quiet on a near miss; every card passes the real
// sgCheckCard; keys are stable and follow the spec (tr-<kind>:<ids>); the primary opens an
// editor prefilled or navigates (the user's rule, 3 Oct) and never writes; the ✓ applies at
// once. Synthetic trip (fixtures/travel/trip-tokyo.json: London -> Tokyo, 10-16 Oct 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engine, runRule, assertRuleContract, assertCard } from './fixtures/suggest/harness.mjs';
import { ctxFor, scenario, calEv, task, timed, allDay, PEOPLE } from './fixtures/travel/kit.mjs';

const E = engine();
const sc = (over = {}) => scenario('trip-tokyo', over);
const at = (now, over = {}) => ctxFor(Object.assign(sc(), { now }, over));
const BEFORE = '2026-10-08T09:00:00+01:00';      // two days before (planned)
const EVE = '2026-10-09T13:00:00+01:00';         // the day before the flight (departing)
const LANDED = '2026-10-11T10:30:00+09:00';      // landed an hour ago, computer still on London time
const BACK = '2026-10-17T09:00:00+01:00';        // the morning after the flight home
const keys = (id, ctx) => runRule(E, id, ctx).map(c => c.key);

const RULES = ['travel-checkin', 'travel-leave-by', 'travel-pack', 'travel-away-due', 'travel-ooo', 'travel-meet-hours', 'travel-use-zone', 'travel-jetlag',
  'travel-jet-prep', 'travel-holiday', 'travel-back', 'travel-their-time', 'travel-person-tz', 'travel-trip-found', 'travel-home-zone'];

test('every travel rule is registered in the travel area and needs travel', () => {
  for (const id of RULES) {
    const r = E.sgRule(id);
    assert.ok(r, id);
    assert.equal(r.area, 'travel', id);
    assert.ok(r.needs.includes('travel'), id);
    assert.deepEqual(E.sgCheckRule ? E.sgCheckRule(r) || [] : [], [], id);
  }
});

test('TR1 travel-checkin: the evening before a flight; quiet with a check-in task or 3 days out', () => {
  const [c] = assertRuleContract(E, 'travel-checkin', { fires: at(EVE), quiet: [
    at(EVE, { tasks: sc().tasks.concat([task({ id: 't-ci', title: 'Check in online: BA 7', due: '2026-10-09' })]) }),
    at('2026-10-07T09:00:00+01:00'),
  ] });
  assert.equal(c.key, 'tr-checkin:ev-ba7');
  assert.equal(c.primary.action.type, 'task.createOpen');
  assert.deepEqual([c.primary.action.args.title, c.primary.action.args.date, c.primary.action.args.time, c.primary.action.args.eventId], ['Check in online: BA 7', '2026-10-09', '19:00', 'ev-ba7']);
  assert.ok(c.primary.action.args.tags.includes('trip'));
});

test('TR2 travel-leave-by: block the trip to the airport; quiet when a travel block exists', () => {
  const [c] = assertRuleContract(E, 'travel-leave-by', { fires: at('2026-10-09T20:00:00+01:00'), quiet: [
    at('2026-10-09T20:00:00+01:00', { events: sc().events.concat([timed('taxi', 'Taxi to Heathrow', '2026-10-10T08:15:00+01:00', '2026-10-10T09:15:00+01:00')]) }),
    at(BEFORE),
  ] });
  assert.equal(c.key, 'tr-leaveby:ev-ba7');
  assert.equal(c.title, 'Leave by 08:30');
  assert.deepEqual([c.primary.action.type, c.quick.action.type, c.primary.action.args.kind], ['cal.createOpen', 'cal.create', 'travel']);
  const noWrite = runRule(E, 'travel-leave-by', at('2026-10-09T20:00:00+01:00', { caps: { calWrite: false } }))[0];
  assert.equal(noWrite.primary.action.type, 'nav', 'no calendar write: Connections, never a write');
  assert.equal(noWrite.quick, null);
});

test('TR3 travel-pack: 1-3 days before, a list made for the trip; quiet with a pack task', () => {
  const [c] = assertRuleContract(E, 'travel-pack', { fires: at(BEFORE), quiet: [
    at(BEFORE, { tasks: sc().tasks.concat([task({ id: 't-pk', title: 'Packing', due: '2026-10-09' })]) }),
    at('2026-10-02T09:00:00+01:00'),
  ] });
  assert.match(c.key, /^tr-pack:trip-[a-z0-9]+$/);
  const a = c.primary.action.args;
  assert.deepEqual([a.title, a.date], ['Pack for Tokyo', '2026-10-09']);
  assert.ok(a.subtasks.includes('Passport'));
  assert.ok(a.subtasks.some(s => /adapter/i.test(s)), 'Japan uses A/B plugs: an adapter');
});

test('TR4 travel-away-due: tasks on trip days move to the first work day back (a ticked list)', () => {
  const [c] = assertRuleContract(E, 'travel-away-due', { fires: at(BEFORE), quiet: [
    at(BEFORE, { tasks: sc().tasks.filter(t => !['t-report', 't-review'].includes(t.id)) }),
    at('2026-09-20T09:00:00+01:00'),
  ] });
  assert.match(c.key, /^tr-awaydue:trip-/);
  assert.equal(c.primary.action.type, 'list.open');
  assert.deepEqual(c.primary.action.args.rows.map(r => [r.id, r.ops[0].op]).sort(), [['t-report', 'task.reschedule'], ['t-review', 'task.plan']]);
  for (const r of c.primary.action.args.rows) assert.equal((r.ops[0].dueDate || r.ops[0].date), '2026-10-19', 'Mon 19 Oct, the first work day back');
});

test('TR5 travel-ooo: an all-day "Away" event; quiet when one covers the trip', () => {
  const [c] = assertRuleContract(E, 'travel-ooo', { fires: at(BEFORE), quiet: [at(BEFORE, { events: sc().events.concat([allDay('ooo', 'Annual leave', '2026-10-10', '2026-10-16')]) })] });
  assert.deepEqual([c.primary.action.args.title, c.primary.action.args.date, c.primary.action.args.endDate, c.primary.action.args.allDay], ['Away: Tokyo', '2026-10-10', '2026-10-17', true]);
});

test('TR6 travel-meet-hours: a meeting with guests at night in Tokyo; it only opens the event', () => {
  const [c] = assertRuleContract(E, 'travel-meet-hours', { fires: at(BEFORE), quiet: [at(BEFORE, { events: sc().events.filter(e => e.id !== 'ev-late') })] });
  assert.equal(c.key, 'tr-awaymeet:ev-late');
  assert.match(c.title, /02:00 in Tokyo/);
  assert.equal(c.primary.action.type, 'event.open');
  assert.ok(!c.quick, 'no ✓');
});

test('TR7 travel-use-zone: landed, computer still on home time; quiet once it switched', () => {
  const [c] = assertRuleContract(E, 'travel-use-zone', { fires: at(LANDED), quiet: [at(LANDED, { zone: 'Asia/Tokyo', system: 'Asia/Tokyo' }), at(BEFORE)] });
  assert.match(c.key, /^tr-usezone:trip-/);
  assert.equal(c.primary.action.type, 'nav');
  assert.equal(c.quick, null, 'no override yet: no ✓');
  const ready = runRule(E, 'travel-use-zone', at(LANDED, { overrideReady: true }))[0];
  assert.deepEqual([ready.quick.action.type, ready.quick.action.args.trip.zone, ready.quick.action.args.trip.until], ['time.follow', 'Asia/Tokyo', '2026-10-16']);
  assertCard(E, ready);
});

test('TR8 travel-jetlag: east (J1) and west (J2) move only own blocks', () => {
  const tokyo = { zone: 'Asia/Tokyo', system: 'Asia/Tokyo' };
  const block = (start, end, title) => ({ '2026-10-12': [calEv(start, end, { id: 'blk', title, origin: { kind: 'block' } })] });
  const [east] = assertRuleContract(E, 'travel-jetlag', { fires: at(LANDED, Object.assign({ calDays: block('09:00', '10:00', 'Focus block') }, tokyo)), quiet: [
    at(LANDED, tokyo),
    at(LANDED, Object.assign({ calDays: block('16:00', '17:00', 'Focus block') }, tokyo)),
    at(LANDED, Object.assign({ calDays: { '2026-10-12': [calEv('09:00', '10:00', { id: 'm', title: 'Sync', attendees: 2, origin: null })] } }, tokyo)),
  ] });
  assert.equal(east.key, 'tr-jetlag:2026-10-11');
  assert.match(east.title, /^Your body thinks it's/);
  assert.deepEqual([east.quick.action.type, east.quick.action.args.start], ['cal.move', 14 * 60], 'body 07:00 tomorrow is local 14:00 (D shrinks to 7 h)');
  const westDays = { '2026-10-18': [calEv('18:30', '19:30', { id: 'blk2', title: 'Focus block', origin: { kind: 'block' } })] };
  const [west] = assertRuleContract(E, 'travel-jetlag', { fires: at(BACK, { calDays: westDays }), quiet: [at(BACK)] });
  assert.match(west.title, /feel like midnight/);
  assert.ok(west.quick.action.args.start < 13 * 60, 'to the morning');
});

test('TR9 travel-jet-prep: 1-3 days before a trip 5 h or more away', () => {
  const [c] = assertRuleContract(E, 'travel-jet-prep', { fires: at(BEFORE), quiet: [at('2026-10-04T09:00:00+01:00'),
    at(BEFORE, { tasks: sc().tasks.concat([task({ id: 'bt', title: 'Bedtime 22:30' })]) })] });
  assert.match(c.title, /^Flying 8 h east on Saturday/);
  assert.equal(c.primary.action.type, 'task.createOpen');
  assert.ok(!c.quick, 'no ✓');
});

test('TR10 travel-holiday: a home holiday with tasks due (days off on), or one where a guest lives', () => {
  const hol = (cc, date, name) => (c, y) => (c === cc && y === 2026 ? [{ date, name }] : []);
  const due = sc().tasks.concat([task({ id: 't-hol', title: 'Send the invoice', due: '2026-10-12' })]);
  const [home] = assertRuleContract(E, 'travel-holiday', { fires: at(BEFORE, { tasks: due, holidaysFor: hol('GB', '2026-10-12', 'Test Holiday'), cfg: { holidays: { daysOff: true } } }), quiet: [
    at(BEFORE, { tasks: due, holidaysFor: hol('GB', '2026-10-12', 'Test Holiday') }),
    at(BEFORE, { tasks: due, holidaysFor: hol('GB', '2026-10-30', 'Test Holiday'), cfg: { holidays: { daysOff: true } } }),
  ] });
  assert.equal(home.key, 'tr-holiday:GB:2026-10-12');
  assert.equal(home.primary.action.type, 'list.open');
  const [them] = assertRuleContract(E, 'travel-holiday', { fires: at(BEFORE, { holidaysFor: hol('US', '2026-10-08', 'Test Day') }), quiet: [at(BEFORE, { holidaysFor: hol('US', '2026-10-09', 'Test Day') })] });
  assert.equal(them.key, 'tr-holiday:US:2026-10-08');
  assert.equal(them.primary.action.type, 'event.open');
});

test('TR11 travel-back: the morning after, what slipped; quiet days later', () => {
  const [c] = assertRuleContract(E, 'travel-back', { fires: at(BACK), quiet: [at('2026-10-21T09:00:00+01:00'), at(BACK, { tasks: [] })] });
  assert.match(c.key, /^tr-back:trip-/);
  assert.equal(c.title, '2 things slipped while you were away');
});

test('TR12 travel-their-time: their 05:00; a fairer slot for both, no ✓ (guests are asked)', () => {
  const [c] = assertRuleContract(E, 'travel-their-time', { fires: at(BEFORE), quiet: [at(BEFORE, { people: PEOPLE.map(p => Object.assign({}, p, { tz: undefined })) })] });
  assert.equal(c.key, 'tr-theirtime:ev-morgan');
  assert.equal(c.title, 'Your 10:00 call on Thu is 05:00 for Morgan');
  assert.ok(c.primary.action.args.propose, 'opens the event with a proposed time');
  assert.ok(!c.quick, 'no ✓');
});

test('TR13 travel-person-tz: someone organises in another zone; quiet once saved', () => {
  const [c] = assertRuleContract(E, 'travel-person-tz', { fires: at(BEFORE), quiet: [at(BEFORE, { people: PEOPLE.map(p => (p.id === 'casey' ? Object.assign({}, p, { tz: 'America/New_York' }) : p)) })] });
  assert.equal(c.key, 'tr-ptz:casey:America/New_York');
  assert.deepEqual(c.quick.action.args.ops, [{ op: 'person.update', id: 'casey', tz: 'America/New_York' }]);
  assert.equal(c.primary.action.args.view, 'person:casey');
});

test('TR14 travel-trip-found: an inferred trip, once; quiet when confirmed', () => {
  const [c] = assertRuleContract(E, 'travel-trip-found', { fires: at(BEFORE), quiet: [] });
  const id = c.key.slice('tr-trip:'.length);
  assert.deepEqual(keys('travel-trip-found', at(BEFORE, { decisions: { trips: { [id]: { confirmed: true } } } })), []);
  assert.deepEqual(keys('travel-trip-found', at(BEFORE, { decisions: { notTrips: { [id]: '2026-10-08' } } })), []);
  assert.deepEqual([c.primary.action.type, c.primary.action.args.view, c.quick.action.type], ['nav', 'trip:' + id, 'trip.forget']);
});

test('3.3 travel-home-zone: 30 days on a zone abroad', () => {
  const ch = [{ at: '2026-09-01T09:00:00Z', from: 'Europe/London', to: 'Asia/Tokyo' }];
  const o = { events: [], tasks: [], zone: 'Asia/Tokyo', system: 'Asia/Tokyo', changes: ch };
  const [c] = assertRuleContract(E, 'travel-home-zone', { fires: at('2026-10-04T09:00:00+09:00', o), quiet: [at('2026-09-20T09:00:00+09:00', o)] });
  assert.equal(c.key, 'tr-homezone:Asia/Tokyo');
});

test('travel off: every travel rule is quiet', () => {
  for (const now of [BEFORE, EVE, LANDED, BACK]) for (const id of RULES) assert.deepEqual(keys(id, at(now, { on: false })), [], `${id} at ${now}`);
});

test('no primary writes: every card across the trip opens an editor or navigates', () => {
  const seen = new Set();
  for (const now of [BEFORE, EVE, '2026-10-09T20:00:00+01:00', LANDED, BACK]) {
    for (const id of RULES) for (const c of runRule(E, id, at(now))) { assertCard(E, c); assert.match(c.key, /^tr-[a-z]+:/); seen.add(id); }
  }
  assert.ok(seen.size >= 10, 'most rules fire somewhere on the trip: ' + [...seen].join(', '));
});
