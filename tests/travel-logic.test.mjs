// The travel engine (travel spec 3.1-3.3, 5.2, 5.3, 5.5, 7.3 "Legs and trips"): legs from
// calendar events, journeys and layovers, trips from every signal, the zone history, where
// the user is, a trip's spending, the body clock, their time, the moment gates and the
// snapshot's speed (under 3 ms for 300 events). Synthetic places (fixtures/travel/places.json)
// and synthetic people only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, P, ms, timed, allDay, home, snap, scenario } from './fixtures/travel/kit.mjs';

const O = { zone: 'Europe/London' };
const legsOf = (evs) => L.trLegs(evs, P, O);
const tripsOf = (evs, o = {}) => {
  const legs = legsOf(evs);
  const te = L.trTripEvents(evs, P, O);
  return L.trTripsFrom(legs, te, o.eps || [], o.pay || [], home, P, { now: ms(o.now || '2026-10-01T09:00:00+01:00'), zone: 'Europe/London', decisions: o.decisions });
};
const LDN = (s) => ({ dateTime: s, timeZone: 'Europe/London' });

test('a Gmail-style flight: start and end in their own zones', () => {
  const [l] = legsOf([timed('g1', 'Flight to Tokyo (JL 44)', LDN('2026-10-10T11:30:00+01:00'), { dateTime: '2026-10-11T09:30:00+09:00', timeZone: 'Asia/Tokyo' })]);
  assert.equal(l.mode, 'flight');
  assert.equal(l.code, 'JL 44');
  assert.equal(l.to.cityId, 'tokyo-jp');
  assert.equal(l.arriveZone, 'Asia/Tokyo');
  assert.equal(l.departZone, 'Europe/London');
  assert.equal(l.arrive, ms('2026-10-11T09:30:00+09:00'));
  assert.equal(l.intl, true);
});

test('"BA 7 LHR → HND": the code and both airports', () => {
  const [l] = legsOf([timed('b7', 'BA 7 LHR → HND', '2026-10-10T11:30:00+01:00', '2026-10-11T09:30:00+09:00')]);
  assert.deepEqual([l.code, l.from.iata, l.to.iata, l.from.cc, l.to.cc, l.how], ['BA 7', 'LHR', 'HND', 'GB', 'JP', 'iata']);
  for (const t of ['BA 7 LHR-HND', 'BA7 LHR -> HND']) assert.equal(legsOf([timed('x', t, '2026-10-10T11:30:00+01:00', '2026-10-10T23:30:00+01:00')])[0].to.iata, 'HND', t);
});

test('"Flight to Lisbon (TP 1353)" and its trip with the flight back', () => {
  const evs = [timed('o', 'Flight to Lisbon (TP 1353)', '2026-10-09T07:40:00+01:00', '2026-10-09T10:20:00+01:00'),
    timed('b', 'TP 1352 LIS → LHR', '2026-10-12T18:05:00+01:00', '2026-10-12T20:45:00+01:00')];
  const ls = legsOf(evs);
  assert.deepEqual(ls.map(l => [l.code, l.to.cityId]), [['TP 1353', 'lisbon-pt'], ['TP 1352', 'london-gb']]);
  const [t] = tripsOf(evs);
  assert.deepEqual([t.dest.cityId, t.from, t.to, t.nights, t.intl, t.kind], ['lisbon-pt', '2026-10-09', '2026-10-12', 3, true, 'legs']);
  assert.match(t.id, /^trip-[a-z0-9]+$/, 'ids nav accepts (trip:<id>)');
  assert.equal(tripsOf(evs)[0].id, t.id, 'stable ids');
});

test('a Dubai layover chains into one journey; the trip goes to Singapore', () => {
  const evs = [timed('a', 'EK 2 LHR → DXB', '2026-10-10T14:00:00+01:00', '2026-10-11T00:40:00+04:00'),
    timed('b', 'EK 354 DXB → SIN', '2026-10-11T03:30:00+04:00', '2026-10-11T14:50:00+08:00'),
    timed('c', 'SQ 322 SIN → LHR', '2026-10-18T23:00:00+08:00', '2026-10-19T06:00:00+01:00')];
  const js = L.trJourneys(legsOf(evs));
  assert.equal(js.length, 2);
  assert.equal(js[0].layovers.length, 1);
  assert.equal(js[0].layovers[0].place.iata, 'DXB');
  assert.equal(js[0].layovers[0].minutes, 170);
  const [t] = tripsOf(evs);
  assert.equal(t.dest.cityId, 'singapore-sg');
  assert.equal(t.layovers.length, 1);
  assert.equal(t.legs.length, 3);
});

test('a Eurostar day trip: a train leg abroad, no nights', () => {
  const evs = [timed('e1', 'Eurostar London to Paris', '2026-10-10T07:01:00+01:00', '2026-10-10T10:20:00+02:00'),
    timed('e2', 'Eurostar Paris to London', '2026-10-10T19:13:00+02:00', '2026-10-10T20:30:00+01:00')];
  const ls = legsOf(evs);
  assert.deepEqual(ls.map(l => [l.mode, l.to.cityId]), [['eurostar', 'paris-fr'], ['eurostar', 'london-gb']]);
  const [t] = tripsOf(evs);
  assert.deepEqual([t.dest.cc, t.from, t.to, t.nights, t.intl], ['FR', '2026-10-10', '2026-10-10', 0, true]);
});

test('"Holiday" with no place: a trip with no destination ("Where to?"), a candidate', () => {
  const [t] = tripsOf([allDay('h', 'Holiday', '2026-10-12', '2026-10-16')]);
  assert.deepEqual([t.dest, t.from, t.to, t.candidate, t.kind], [null, '2026-10-12', '2026-10-16', true, 'holiday']);
  assert.deepEqual(tripsOf([allDay('h', 'Team offsite planning', '2026-10-12', '2026-10-16')]), [], 'no trip words, no place: nothing');
});

test('a hotel with a location is a trip to that city', () => {
  const [t] = tripsOf([allDay('ht', 'Hotel Gracery', '2026-10-11', '2026-10-15', { location: 'Kabukicho, Shinjuku, Tokyo, Japan' })]);
  assert.deepEqual([t.dest.cityId, t.kind, t.from, t.to], ['tokyo-jp', 'hotel', '2026-10-11', '2026-10-15']);
});

test('a domestic train there and back is a domestic trip; a same-day one is not', () => {
  const there = timed('t1', 'Train to Edinburgh', '2026-10-10T08:00:00+01:00', '2026-10-10T12:20:00+01:00');
  const back = timed('t2', 'Train to London', '2026-10-12T16:00:00+01:00', '2026-10-12T20:20:00+01:00');
  const [t] = tripsOf([there, back]);
  assert.deepEqual([t.dest.cityId, t.domestic, t.intl, t.nights], ['edinburgh-gb', true, false, 2]);
  const sameDay = timed('t3', 'Train to London', '2026-10-10T17:00:00+01:00', '2026-10-10T21:20:00+01:00');
  assert.deepEqual(tripsOf([there, sameDay]), []);
});

test('a cancelled or declined flight is no leg and no trip', () => {
  const a = timed('c1', 'BA 7 LHR → HND', '2026-10-10T11:30:00+01:00', '2026-10-11T09:30:00+09:00', { status: 'cancelled' });
  const b = timed('c2', 'Cancelled: BA 7 LHR → HND', '2026-10-10T11:30:00+01:00', '2026-10-11T09:30:00+09:00');
  const c = timed('c3', 'BA 7 LHR → HND', '2026-10-10T11:30:00+01:00', '2026-10-11T09:30:00+09:00', { selfResponse: 'declined' });
  assert.deepEqual(legsOf([a, b, c]), []);
  assert.deepEqual(tripsOf([a, b, c]), []);
});

test('ordinary events are not legs ("Talk to Paris team", "Train the model")', () => {
  for (const t of ['Talk to Paris team', 'Train the model', 'Lunch → gym', 'Notes to self', 'Room 2 to Room 3']) {
    assert.deepEqual(legsOf([timed('n', t, '2026-10-10T11:30:00+01:00', '2026-10-10T12:30:00+01:00')]), [], t);
  }
});

const ccOf = (z) => { const p = L.trZonePlace(z, P); return p ? p.cc : ''; };
const epOpts = (now, system) => ({ homeCc: 'GB', homeZone: 'Europe/London', ccOf, now: ms(now), system });

test('the zone history: a 5-minute flip-back is no episode; a DST change is not a trip', () => {
  const flip = [{ at: '2026-10-10T09:00:00Z', from: 'Europe/London', to: 'Asia/Tokyo' }, { at: '2026-10-10T09:05:00Z', from: 'Asia/Tokyo', to: 'Europe/London' }];
  assert.deepEqual(L.trZoneEpisodes(flip, epOpts('2026-10-10T12:00:00Z', 'Europe/London')), []);
  // Same zone id across the clocks going back: no change recorded, nothing abroad.
  const dst = [{ at: '2026-10-24T09:00:00Z', from: 'Europe/London', to: 'Europe/London' }];
  assert.deepEqual(L.trZoneEpisodes(dst, epOpts('2026-10-26T12:00:00Z', 'Europe/London')), []);
  const s = snap({ now: '2026-10-26T12:00:00+00:00', changes: dst });
  assert.deepEqual(s.trips, []);
  assert.equal(s.away, false);
  // UTC is never a place.
  assert.deepEqual(L.trZoneEpisodes([{ at: '2026-10-10T09:00:00Z', from: 'Europe/London', to: 'Etc/UTC' }], epOpts('2026-10-11T12:00:00Z', 'Etc/UTC')), []);
});

test('6 h or more on a zone abroad with no calendar trip: an unplanned trip; under 6 h: none', () => {
  const ch = [{ at: '2026-10-10T09:00:00Z', from: 'Europe/London', to: 'Asia/Tokyo' }];
  const s = snap({ now: '2026-10-10T16:00:00+00:00', zone: 'Asia/Tokyo', system: 'Asia/Tokyo', changes: ch });
  assert.equal(s.trips.length, 1);
  assert.deepEqual([s.trips[0].unplanned, s.trips[0].dest.cc, s.trips[0].status], [true, 'JP', 'away']);
  assert.equal(s.where.source, 'zone');
  assert.equal(s.away, true);
  assert.equal(snap({ now: '2026-10-10T13:00:00+00:00', zone: 'Asia/Tokyo', system: 'Asia/Tokyo', changes: ch }).trips.length, 0);
});

test('30 days on one zone abroad: the long stay', () => {
  const ch = [{ at: '2026-09-01T09:00:00Z', from: 'Europe/London', to: 'Asia/Tokyo' }];
  const s = snap({ now: '2026-10-02T09:00:00+09:00', zone: 'Asia/Tokyo', system: 'Asia/Tokyo', changes: ch });
  assert.equal(s.longStay.zone, 'Asia/Tokyo');
  assert.ok(s.longStay.days >= 30);
  assert.equal(snap({ now: '2026-09-20T09:00:00+09:00', zone: 'Asia/Tokyo', system: 'Asia/Tokyo', changes: ch }).longStay, null);
});

test('trip status runs planned → departing → away → returning → home → past', () => {
  const sc = scenario('trip-tokyo');
  const at = (now) => snap(Object.assign({}, sc, { now })).trips[0].status;
  assert.equal(at('2026-10-08T09:00:00+01:00'), 'planned');
  assert.equal(at('2026-10-09T13:00:00+01:00'), 'departing');
  assert.equal(at('2026-10-12T10:00:00+09:00'), 'away');
  assert.equal(at('2026-10-15T20:00:00+09:00'), 'returning');
  assert.equal(at('2026-10-16T20:00:00+01:00'), 'home');
  assert.equal(at('2026-10-18T09:00:00+01:00'), 'past');
});

test('overlapping signals merge into one trip; "not a trip" drops it; a confirmed name sticks', () => {
  const sc = scenario('trip-tokyo');
  const s = snap(Object.assign({}, sc, { now: '2026-10-08T09:00:00+01:00' }));
  assert.equal(s.trips.length, 1, 'legs + hotel = one trip');
  const t = s.trips[0];
  assert.deepEqual([t.dest.cityId, t.from, t.to, t.nights], ['tokyo-jp', '2026-10-10', '2026-10-16', 6]);
  assert.ok(t.ids.length >= 2);
  const hotelId = t.ids.find(x => x !== t.id);
  assert.deepEqual(snap(Object.assign({}, sc, { now: '2026-10-08T09:00:00+01:00', decisions: { notTrips: { [hotelId]: '2026-10-08' } } })).trips, [], 'a decision under any of its ids holds');
  const named = snap(Object.assign({}, sc, { now: '2026-10-08T09:00:00+01:00', decisions: { trips: { [t.id]: { confirmed: true, name: 'Autumn in Japan' } } } })).trips[0];
  assert.deepEqual([named.label, named.confirmed], ['Autumn in Japan', true]);
});

test('payments abroad on 2 days make a candidate trip only; a calendar trip absorbs them', () => {
  const pay = [{ cc: 'PT', ccy: 'EUR', from: '2026-10-20', to: '2026-10-21', days: 2, atm: false, n: 3 }];
  const [t] = tripsOf([], { pay, now: '2026-10-22T09:00:00+01:00' });
  assert.deepEqual([t.candidate, t.dest.cc, t.sources.join()], [true, 'PT', 'bank']);
  const evs = [timed('o', 'Flight to Lisbon (TP 1353)', '2026-10-19T07:40:00+01:00', '2026-10-19T10:20:00+01:00'),
    timed('b', 'TP 1352 LIS → LHR', '2026-10-22T18:05:00+01:00', '2026-10-22T20:45:00+01:00')];
  const ts = tripsOf(evs, { pay, now: '2026-10-22T09:00:00+01:00' });
  assert.equal(ts.length, 1);
  assert.deepEqual([ts[0].candidate, ts[0].sources.join('+')], [false, 'calendar+bank']);
});

test('where am I: landed abroad while the computer is on home time (T7); geo wins over the zone', () => {
  const sc = scenario('trip-tokyo');
  const s = snap(Object.assign({}, sc, { now: '2026-10-11T10:30:00+09:00' }));
  assert.deepEqual([s.where.place.cityId, s.where.source, s.where.mismatch, s.away], ['tokyo-jp', 'calendar', 'zone-home', true]);
  assert.equal(s.landed.zone, 'Asia/Tokyo');
  assert.equal(s.landed.until, '2026-10-16');
  const switched = snap(Object.assign({}, sc, { now: '2026-10-11T10:30:00+09:00', zone: 'Asia/Tokyo', system: 'Asia/Tokyo' }));
  assert.equal(switched.where.mismatch, '');
  assert.equal(switched.landed, null);
  const geo = { place: { kind: 'city', cityId: 'osaka-jp', cc: 'JP', zone: 'Asia/Tokyo', label: 'Osaka' }, at: ms('2026-10-13T09:00:00+09:00') };
  const g = snap(Object.assign({}, sc, { now: '2026-10-13T10:00:00+09:00', zone: 'Asia/Tokyo', system: 'Asia/Tokyo', geo }));
  assert.deepEqual([g.where.source, g.where.place.cityId], ['geo', 'osaka-jp']);
});

test('trGroup: trip tasks, events in the destination, spending by currency, fees on their own line', () => {
  const sc = scenario('trip-tokyo');
  const s = snap(Object.assign({}, sc, { now: '2026-10-08T09:00:00+01:00' }));
  const t = s.trips[0];
  assert.ok(t.tasks.includes('t-adapter'), 'tagged trip');
  assert.ok(!t.tasks.includes('t-later'));
  const rows = [
    { id: 'r1', date: '2026-10-11', amount: -6.33, fx: { ccy: 'JPY', amt: 1200 }, cc: 'JP' },
    { id: 'r2', date: '2026-10-12', amount: -10, fx: { ccy: 'JPY', amt: 1895 }, cc: 'JP' },
    { id: 'r3', date: '2026-10-12', amount: -0.3, fee: true },
    { id: 'r4', date: '2026-10-13', amount: -4.2, fx: null, cc: 'JP' },
    { id: 'r5', date: '2026-11-30', amount: -50, fx: { ccy: 'JPY', amt: 9000 }, cc: 'JP' },
  ];
  const g = L.trGroup(t, { rows, P, zone: 'Europe/London', home, now: ms('2026-10-17T09:00:00+01:00') });
  assert.deepEqual(g.spending.byCcy.JPY, { orig: 3095, home: 20.53, n: 3 });
  assert.equal(g.spending.fees, 0.3);
  assert.equal(g.spending.total, 20.83);
  assert.ok(!g.spending.rows.includes('r5'), 'outside the window');
});

test('the body clock: east shrinks 1 h a day, west 1.5 h a day, and stops under 1 h', () => {
  const east = [L.trLegs([timed('e', 'BA 7 LHR → HND', '2026-10-10T11:30:00+01:00', { dateTime: '2026-10-11T09:30:00+09:00', timeZone: 'Asia/Tokyo' })], P, O)[0]];
  let b = L.trBody({ now: ms('2026-10-11T09:30:00+09:00'), zone: 'Asia/Tokyo', legs: east });
  assert.deepEqual([b.dir, b.D0, b.D, b.bodyZone, b.active], ['east', 8, 8, 'Europe/London', true]);
  assert.equal(b.bodyNowMin, 90, '09:30 Tokyo is 01:30 in the body');
  b = L.trBody({ now: ms('2026-10-13T09:30:00+09:00'), zone: 'Asia/Tokyo', legs: east });
  assert.equal(b.D, 6);
  assert.equal(L.trBody({ now: ms('2026-10-18T12:00:00+09:00'), zone: 'Asia/Tokyo', legs: east }).active, false, '7 days on: under 1 h');
  const west = [L.trLegs([timed('w', 'BA 8 HND → LHR', { dateTime: '2026-10-16T11:30:00+09:00', timeZone: 'Asia/Tokyo' }, { dateTime: '2026-10-16T15:20:00+01:00', timeZone: 'Europe/London' })], P, O)[0]];
  b = L.trBody({ now: ms('2026-10-18T15:20:00+01:00'), zone: 'Europe/London', legs: west });
  assert.deepEqual([b.dir, b.D0, b.D], ['west', -8, -5]);
  assert.equal(L.trBody({ now: ms('2026-10-12T09:00:00+02:00'), zone: 'Europe/Paris', legs: legsOf([timed('p', 'Eurostar London to Paris', '2026-10-10T07:01:00+01:00', '2026-10-10T10:20:00+02:00')]) }), null, '1 h is no jet lag');
});

test('their time: unsocial for them, a fairer slot inside 08:00-20:00 for both and free for you', () => {
  const people = new Map([['p@example.net', { id: 'p1', name: 'Person One', first: 'Person', tz: 'America/New_York' }]]);
  const m = { eventId: 'm', title: 'Planning', start: ms('2026-10-08T10:00:00+01:00'), end: ms('2026-10-08T10:30:00+01:00'), zone: 'Europe/London', organizerSelf: true,
    attendees: [{ email: 'me@example.com', self: true }, { email: 'p@example.net' }] };
  const r = L.trTheirTime(m, { myZone: 'Europe/London', people, now: ms('2026-10-07T09:00:00+01:00'), busy: [[ms('2026-10-07T13:00:00+01:00'), ms('2026-10-07T14:00:00+01:00')]] });
  assert.equal(r.unsocial, 'them');
  assert.deepEqual([r.their[0].min, r.their[0].unsocial], [300, true], '10:00 London is 05:00 New York');
  assert.ok(r.slot);
  assert.ok(r.slot.startMin >= 13 * 60 && r.slot.endMin <= 20 * 60, 'inside 08:00-20:00 New York and London');
  assert.notEqual(r.slot.start, ms('2026-10-07T13:00:00+01:00'), 'skips a busy slot');
  const ok = L.trTheirTime(Object.assign({}, m, { start: ms('2026-10-08T15:00:00+01:00'), end: ms('2026-10-08T15:30:00+01:00') }), { myZone: 'Europe/London', people, now: 0, busy: [] });
  assert.deepEqual([ok.unsocial, ok.slot], ['', null]);
});

test('moments: once-keys, the quiet rules and the 6 h skip', () => {
  assert.equal(L.trMomentKey('arrive', { tripId: 'trip-1', cc: 'JP' }), 'arrive:trip-1:JP');
  assert.equal(L.trMomentKey('depart', { eventId: 'ev-1' }), 'depart:ev-1');
  assert.equal(L.trMomentKey('home', { tripId: 'trip-1' }), 'home:trip-1');
  const m = { key: 'arrive:trip-1:JP', due: 1000 };
  const now = 1000 + 60000;
  assert.equal(L.trMomentDue(m, { now, visible: true }).show, true);
  assert.equal(L.trMomentDue(m, { now, shown: { [m.key]: 1 } }).why, 'shown');
  assert.equal(L.trMomentDue(m, { now, claimed: true }).why, 'claimed');
  assert.equal(L.trMomentDue(m, { now, visible: false }).wait, true);
  assert.equal(L.trMomentDue(m, { now, bootAt: now - 5000 }).why, 'boot');
  assert.equal(L.trMomentDue(m, { now, modal: true }).why, 'busy');
  assert.equal(L.trMomentDue(m, { now, inMeeting: true }).why, 'meeting');
  assert.equal(L.trMomentDue(m, { now, off: true }).why, 'off');
  assert.equal(L.trMomentDue(m, { now, forgotten: true }).why, 'forgotten');
  assert.equal(L.trMomentDue(m, { now: 1000 + 7 * 3600000 }).skip, true);
  const sc = scenario('trip-tokyo');
  const keys = (now, o = {}) => snap(Object.assign({}, sc, { now }, o)).moments.map(x => x.key);
  assert.deepEqual(keys('2026-10-11T10:30:00+09:00'), ['arrive:' + snap(Object.assign({}, sc, { now: '2026-10-08T09:00:00+01:00' })).trips[0].id + ':JP']);
  assert.ok(keys('2026-10-10T07:00:00+01:00').some(k => k === 'depart:ev-ba7'), 'departure 6 h before');
  assert.ok(keys('2026-10-16T20:00:00+01:00').some(k => k.startsWith('home:')), 'welcome home after a night away');
});

test('travel off: nothing proactive except the opt-in question for a flight soon', () => {
  const sc = scenario('trip-tokyo');
  const s = snap(Object.assign({}, sc, { now: '2026-10-08T09:00:00+01:00', on: false }));
  assert.equal(s.on, false);
  assert.deepEqual(s.optIn, { reason: 'trip', label: 'Tokyo' });
  assert.equal(snap(Object.assign({}, sc, { now: '2026-09-01T09:00:00+01:00', on: false })).optIn, null, 'too far off');
});

test('the snapshot is pure, repeatable and under 3 ms for 300 events', () => {
  const sc = scenario('trip-tokyo');
  const extra = [];
  for (let i = 0; i < 292; i++) {
    const d = new Date(Date.UTC(2026, 8, 20 + Math.floor(i / 8)));
    const day = d.toISOString().slice(0, 10);
    const h = 8 + (i % 8);
    extra.push(timed('bulk' + i, i % 5 ? `Meeting ${i}` : `Review ${i} to Paris team`, `${day}T${String(h).padStart(2, '0')}:00:00+01:00`, `${day}T${String(h).padStart(2, '0')}:45:00+01:00`,
      i % 3 ? {} : { attendees: [{ email: 'me@example.com', self: true }, { email: 'riley@example.com' }], organizer: { email: 'me@example.com', self: true } }));
  }
  const input = Object.assign({}, sc, { events: sc.events.concat(extra), now: '2026-10-08T09:00:00+01:00' });
  assert.equal(input.events.length, 300);
  const a = snap(input), b = snap(input);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  for (let i = 0; i < 60; i++) snap(input);             // warm (the page computes it every minute)
  // CPU time per call, the best batch: the suite runs files in parallel, so the others are noise.
  // Batches of 50 calls: Windows counts CPU time in ~15.6 ms ticks, so a short batch reads coarse.
  // A busy machine can slow every batch of one round; a real regression is slow in every round,
  // so up to 5 rounds are measured and the best one counts (it stops at the first under budget).
  const BATCH = 50;
  const batch = () => { const c0 = process.cpuUsage(); for (let i = 0; i < BATCH; i++) snap(input); const c = process.cpuUsage(c0); return (c.user + c.system) / 1000 / BATCH; };
  let per = Infinity;
  for (let round = 0; round < 5 && !(per < 3); round++) for (let r = 0; r < 5; r++) per = Math.min(per, batch());
  assert.ok(per < 3, `trSnapshot took ${per.toFixed(2)} ms for 300 events`);
});
