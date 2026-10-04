// Event editing in the card (src/app/46-cal-event-edit-logic.js, loaded in a VM
// as the page loads it): Google's 15-minute time list with lengths, typed
// times, an event's date/time fields and how an edit moves them, the patch that
// goes to CalWrite (only what changed), new-event drafts from the quick-create
// prefill, guests, colours, Maps links. Plus the card's hooks: openEvent(null,
// {create}) opens create mode, and the UI file keeps the page's rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = (f) => readFileSync(join(ROOT, 'src', 'app', f), 'utf8');
const LOGIC = '46-cal-event-edit-logic.js';

function load() {
  // Only the language's own globals plus the page's Clock (wall times in the dashboard's
  // zone, travel spec 2.7): the rules must not touch the page.
  const box = { Math, JSON, Date, Number, String, Object, Array, Set, Map, RegExp, isFinite, encodeURIComponent };
  vm.createContext(box);
  loadPageClock(box);
  vm.runInContext(app(LOGIC), box, { filename: LOGIC });
  return box;
}
const L = load();
const plain = (x) => JSON.parse(JSON.stringify(x));
/** A local wall-clock time as the ISO string Google sends (with this machine's offset), so tests pass in any time zone. */
const iso = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi).toISOString();

test('the rules file is pure: no DOM, no page globals', () => {
  const src = app(LOGIC);
  for (const bad of ['document.', 'window.', 'state.', 'localStorage', 'fetch(', 'render(', 'CalStore', 'innerHTML']) {
    assert.ok(!src.includes(bad), `${LOGIC} uses ${bad}`);
  }
});

/* ---------- time list ---------- */
test('the time list has every 15 minutes of the day', () => {
  const all = L.evcTimeOptions({});
  assert.equal(all.length, 96);
  assert.equal(all[0].hm, '00:00');
  assert.equal(all[1].hm, '00:15');
  assert.equal(all[95].hm, '23:45');
  assert.ok(all.every(o => o.dur === ''), 'no lengths without a start');
});

test('lengths read like Google: 15 mins, 1 hr, 1.25 hrs, 2 hrs', () => {
  assert.equal(L.evcDurationLabel(15), '15 mins');
  assert.equal(L.evcDurationLabel(1), '1 min');
  assert.equal(L.evcDurationLabel(45), '45 mins');
  assert.equal(L.evcDurationLabel(60), '1 hr');
  assert.equal(L.evcDurationLabel(75), '1.25 hrs');
  assert.equal(L.evcDurationLabel(90), '1.5 hrs');
  assert.equal(L.evcDurationLabel(120), '2 hrs');
  assert.equal(L.evcDurationLabel(1440), '24 hrs');
});

test('the end list starts after the start and carries the length', () => {
  const w = { allDay: false, startDate: '2026-10-07', startTime: '14:00', endDate: '2026-10-07', endTime: '15:00' };
  const ends = L.evcEndOptions(w);
  assert.equal(ends[0].hm, '14:15');
  assert.equal(ends[0].dur, '15 mins');
  assert.equal(ends.find(o => o.hm === '15:00').dur, '1 hr');
  assert.equal(ends.find(o => o.hm === '15:30').dur, '1.5 hrs');
  assert.equal(ends[ends.length - 1].hm, '23:45');
  assert.ok(ends.every(o => o.min > 14 * 60 && o.date === '2026-10-07'));
  // an odd start (14:10): the list still runs on the quarter hours
  assert.equal(L.evcEndOptions(Object.assign({}, w, { startTime: '14:10' }))[0].hm, '14:15');
  // 23:45: midnight the next day
  const late = L.evcEndOptions({ allDay: false, startDate: '2026-10-07', startTime: '23:45', endDate: '2026-10-07', endTime: '23:45' });
  assert.deepEqual(plain(late), [{ hm: '00:00', min: 0, dur: '15 mins', date: '2026-10-08' }]);
  // an event that ends the next day: the whole day, lengths counted from the start
  const over = L.evcEndOptions({ allDay: false, startDate: '2026-10-07', startTime: '22:00', endDate: '2026-10-08', endTime: '01:00' });
  assert.equal(over.length, 96);
  assert.equal(over.find(o => o.hm === '01:00').dur, '3 hrs');
  assert.equal(over[0].date, '2026-10-08');
});

test('typed times: 2pm, 2:30 pm, 14:30, 1430, 9, 9.15, noon, midnight', () => {
  const cases = { '2pm': '14:00', '2:30 pm': '14:30', '2:30PM': '14:30', '14:30': '14:30', '1430': '14:30', '930': '09:30', '9': '09:00', '9.15': '09:15',
    '12am': '00:00', '12pm': '12:00', '12:45am': '00:45', noon: '12:00', midnight: '00:00', ' 7 a ': '07:00', '23:59': '23:59' };
  for (const [k, v] of Object.entries(cases)) assert.equal(L.evcParseTime(k), v, k);
  for (const bad of ['', '25:00', '13pm', '0am', '12:60', 'soon', '9:5', '-1', null]) assert.equal(L.evcParseTime(bad), null, String(bad));
});

/* ---------- an event's fields ---------- */
test('an event -> its local date/time fields (all-day ends are exclusive in Google)', () => {
  const timed = { start: { dateTime: iso(2026, 10, 7, 14, 0) }, end: { dateTime: iso(2026, 10, 7, 15, 30) } };
  assert.deepEqual(plain(L.evcWhenOf(timed)), { allDay: false, startDate: '2026-10-07', startTime: '14:00', endDate: '2026-10-07', endTime: '15:30' });
  const day = { allDay: true, start: { date: '2026-10-07' }, end: { date: '2026-10-08' } };
  assert.deepEqual(plain(L.evcWhenOf(day)), { allDay: true, startDate: '2026-10-07', startTime: null, endDate: '2026-10-07', endTime: null });
  const trip = { allDay: true, start: { date: '2026-10-07' }, end: { date: '2026-10-10' } };
  assert.equal(L.evcWhenOf(trip).endDate, '2026-10-09');
  assert.equal(L.evcWhenOf({ start: { date: '2026-10-07' } }).endDate, '2026-10-07', 'no end: one day');
  assert.equal(L.evcWhenOf({ start: { dateTime: iso(2026, 10, 7, 9, 0) } }).endTime, '09:00', 'no end: a moment');
});

test('fields -> what CalWrite writes: all-day end exclusive, timed ISO with the local offset', () => {
  const w = L.evcWhenToWrite({ allDay: true, startDate: '2026-10-07', endDate: '2026-10-09' });
  assert.deepEqual(plain(w), { allDay: true, start: '2026-10-07', end: '2026-10-10' });
  const t = L.evcWhenToWrite({ allDay: false, startDate: '2026-10-07', startTime: '14:00', endDate: '2026-10-07', endTime: '15:30' });
  assert.equal(t.allDay, false);
  assert.match(t.start, /^2026-10-07T14:00:00[+-]\d{2}:\d{2}$/);
  assert.equal(new Date(t.start).getTime(), new Date(2026, 9, 7, 14, 0).getTime());
  assert.equal(new Date(t.end).getTime(), new Date(2026, 9, 7, 15, 30).getTime());
  // and back again
  assert.deepEqual(plain(L.evcWhenOf({ start: { dateTime: t.start }, end: { dateTime: t.end } })), { allDay: false, startDate: '2026-10-07', startTime: '14:00', endDate: '2026-10-07', endTime: '15:30' });
});

test('editing the times works like Google: the start moves the end, overnight ends, all day', () => {
  const w = { allDay: false, startDate: '2026-10-07', startTime: '14:00', endDate: '2026-10-07', endTime: '15:30' };
  // a new start keeps the length
  assert.deepEqual(plain(L.evcWhenEdit(w, 'startTime', '16:00')), Object.assign({}, w, { startTime: '16:00', endTime: '17:30' }));
  assert.deepEqual(plain(L.evcWhenEdit(w, 'startTime', '23:00')), Object.assign({}, w, { startTime: '23:00', endDate: '2026-10-08', endTime: '00:30' }));
  // a new day moves both days
  assert.deepEqual(plain(L.evcWhenEdit(w, 'startDate', '2026-10-09')), Object.assign({}, w, { startDate: '2026-10-09', endDate: '2026-10-09' }));
  // a new end keeps the start; one at or before the start is the next day
  assert.equal(L.evcWhenEdit(w, 'endTime', '17:00').endTime, '17:00');
  assert.equal(L.evcWhenEdit(w, 'endTime', '17:00').endDate, '2026-10-07');
  assert.equal(L.evcWhenEdit(w, 'endTime', '01:00').endDate, '2026-10-08');
  // a row of the end list (midnight the next day)
  assert.deepEqual(plain(L.evcWhenEdit(w, 'end', { date: '2026-10-08', time: '00:00' })), Object.assign({}, w, { endDate: '2026-10-08', endTime: '00:00' }));
  // an end day before the start is not allowed
  assert.equal(L.evcWhenEdit(w, 'endDate', '2026-10-01').endDate, '2026-10-07');
  // the input is never changed
  assert.equal(w.startTime, '14:00');
  // All day on, then off again: the times come back
  const on = L.evcWhenEdit(w, 'allDay', true);
  assert.equal(on.allDay, true);
  assert.equal(on.startTime, null);
  assert.deepEqual(plain(on.lastTimes), { startTime: '14:00', endTime: '15:30' });
  const off = L.evcWhenEdit(on, 'allDay', false);
  assert.deepEqual(plain(off), w);
  // without remembered times: 09:00 for an hour
  const fresh = L.evcWhenEdit({ allDay: true, startDate: '2026-10-07', startTime: null, endDate: '2026-10-07', endTime: null }, 'allDay', false);
  assert.deepEqual([fresh.startTime, fresh.endTime, fresh.endDate], ['09:00', '10:00', '2026-10-07']);
  // a timed event ending at midnight does not take the next day into all day
  const late = { allDay: false, startDate: '2026-10-07', startTime: '22:00', endDate: '2026-10-08', endTime: '00:00' };
  assert.equal(L.evcWhenEdit(late, 'allDay', true).endDate, '2026-10-07');
  // nonsense is ignored
  assert.deepEqual(plain(L.evcWhenEdit(w, 'startTime', '25:00')), w);
  assert.deepEqual(plain(L.evcWhenEdit(w, 'nope', 1)), w);
});

/* ---------- patches ---------- */
test('the patch has only what changed', () => {
  const ev = {
    summary: 'Supervision', location: 'Room 2', description: 'Agenda', calendarId: 'me@example.org', colorId: '',
    start: { dateTime: iso(2026, 10, 7, 14, 0) }, end: { dateTime: iso(2026, 10, 7, 15, 0) },
    attendees: [{ email: 'me@example.org', self: true, organizer: true }, { email: 'Sam@Example.org' }],
  };
  const before = L.evcFieldsOf(ev);
  assert.deepEqual(plain(before.guests), ['sam@example.org'], 'guests: lower case, without you');
  assert.deepEqual(plain(L.evcPatchDiff(before, Object.assign({}, before))), {}, 'nothing changed');
  assert.deepEqual(plain(L.evcPatchDiff(before, Object.assign({}, before, { title: '  Supervision ' }))), {}, 'spaces only');
  assert.deepEqual(plain(L.evcPatchDiff(before, Object.assign({}, before, { title: '' }))), {}, 'an empty title is never sent');
  assert.deepEqual(plain(L.evcPatchDiff(before, Object.assign({}, before, { title: 'Supervision 2 ' }))), { title: 'Supervision 2' });
  assert.deepEqual(plain(L.evcPatchDiff(before, Object.assign({}, before, { location: '' }))), { location: '' }, 'clearing the place is a change');
  assert.deepEqual(plain(L.evcPatchDiff(before, Object.assign({}, before, { description: 'Agenda\n\n' }))), {}, 'trailing blank lines');
  assert.deepEqual(plain(L.evcPatchDiff(before, Object.assign({}, before, { calendarId: 'team@example.org' }))), { calendarId: 'team@example.org' });
  assert.deepEqual(plain(L.evcPatchDiff(before, Object.assign({}, before, { colorId: '11' }))), { colorId: '11' });
  // any time change sends the whole start/end/allDay (a lone start would move the end in the connector)
  const later = L.evcWhenEdit(before.when, 'endTime', '16:00');
  const p = L.evcPatchDiff(before, Object.assign({}, before, { when: later }));
  assert.deepEqual(Object.keys(p).sort(), ['allDay', 'end', 'start']);
  assert.equal(p.allDay, false);
  assert.equal(new Date(p.start).getTime(), new Date(2026, 9, 7, 14, 0).getTime());
  assert.equal(new Date(p.end).getTime(), new Date(2026, 9, 7, 16, 0).getTime());
  const allDay = L.evcPatchDiff(before, Object.assign({}, before, { when: L.evcWhenEdit(before.when, 'allDay', true) }));
  assert.deepEqual(plain(allDay), { allDay: true, start: '2026-10-07', end: '2026-10-08' });
  // guests
  const g = L.evcPatchDiff(before, Object.assign({}, before, { guests: ['alex@example.org'] }));
  assert.deepEqual(plain(g), { addGuests: [{ email: 'alex@example.org' }], removeGuests: ['sam@example.org'] });
  // fields the caller did not pass are left alone
  assert.deepEqual(plain(L.evcPatchDiff({ title: 'A' }, { location: 'B' })), { location: 'B' });
});

/* ---------- new events ---------- */
test('a draft from the quick-create prefill (strings, Dates, Google shapes)', () => {
  const a = L.evcDraftFrom({ title: 'Lunch', start: '2026-10-07T12:30', end: '2026-10-07T13:15', calendarId: 'me@example.org' });
  assert.deepEqual(plain(a.when), { allDay: false, startDate: '2026-10-07', startTime: '12:30', endDate: '2026-10-07', endTime: '13:15' });
  assert.equal(a.title, 'Lunch');
  assert.equal(a.calendarId, 'me@example.org');
  assert.ok(a.key, 'a draft key for the card');
  const b = L.evcDraftFrom({ start: new Date(2026, 9, 7, 9, 0), end: new Date(2026, 9, 7, 10, 0) });
  assert.deepEqual([b.when.startTime, b.when.endTime], ['09:00', '10:00']);
  const c = L.evcDraftFrom({ start: { dateTime: iso(2026, 10, 7, 16, 0) } });
  assert.deepEqual([c.when.startTime, c.when.endTime], ['16:00', '17:00'], 'no end: an hour');
  // all day: Google's exclusive end
  const d = L.evcDraftFrom({ start: '2026-10-07', end: '2026-10-08', allDay: true });
  assert.deepEqual(plain(d.when), { allDay: true, startDate: '2026-10-07', startTime: null, endDate: '2026-10-07', endTime: null });
  const e = L.evcDraftFrom({ start: { date: '2026-10-07' }, end: { date: '2026-10-10' } });
  assert.equal(e.when.allDay, true);
  assert.equal(e.when.endDate, '2026-10-09');
  // an end before the start falls back to an hour
  const f = L.evcDraftFrom({ start: '2026-10-07T15:00', end: '2026-10-07T14:00' });
  assert.equal(f.when.endTime, '16:00');
  // nothing given: the next half hour, an hour long (Google's default)
  const g = L.evcDraftFrom({}, { now: new Date(2026, 9, 7, 10, 10).getTime() });
  assert.deepEqual([g.when.startDate, g.when.startTime, g.when.endTime], ['2026-10-07', '10:30', '11:30']);
  const h = L.evcDraftFrom({}, { now: new Date(2026, 9, 7, 23, 45).getTime() });
  assert.deepEqual([h.when.startDate, h.when.startTime, h.when.endDate, h.when.endTime], ['2026-10-08', '00:00', '2026-10-08', '01:00']);
  // guests: valid addresses only
  assert.deepEqual(plain(L.evcDraftFrom({ guests: ['Sam@Example.org', { email: 'x' }, 'sam@example.org'] }).guests), ['sam@example.org']);
});

test('the draft -> CalWrite.create (empty extras left out)', () => {
  const d = L.evcDraftFrom({ title: ' Lunch ', start: '2026-10-07', allDay: true, calendarId: 'me@example.org' });
  assert.deepEqual(plain(L.evcDraftToCreate(d)), { title: 'Lunch', start: '2026-10-07', end: '2026-10-08', allDay: true, calendarId: 'me@example.org' });
  const t = L.evcDraftToCreate(Object.assign(L.evcDraftFrom({ title: 'Call', start: '2026-10-07T09:00' }), { location: 'Room 1', description: 'Bring notes\n', guests: ['a@example.org'], colorId: '5' }));
  assert.equal(t.location, 'Room 1');
  assert.equal(t.description, 'Bring notes');
  assert.deepEqual(plain(t.guests), [{ email: 'a@example.org' }]);
  assert.equal(t.colorId, '5');
  assert.ok(!('calendarId' in t), 'no calendar: CalWrite uses the primary one');
});

/* ---------- small rules ---------- */
test('invitations, guest counts, typed guests', () => {
  assert.equal(L.evcIsInvitee({ attendees: [{ email: 'me@x.org', self: true }, { email: 'o@x.org', organizer: true }] }), true);
  assert.equal(L.evcIsInvitee({ attendees: [{ email: 'me@x.org', self: true, organizer: true }, { email: 'g@x.org' }] }), false);
  assert.equal(L.evcIsInvitee({}), false, 'no guests: your own event');
  const s = L.evcGuestSummary([{ response: 'accepted' }, { response: 'accepted' }, { response: 'declined' }, { response: 'needsAction' }, {}]);
  assert.deepEqual([s.total, s.yes, s.no, s.maybe, s.awaiting], [5, 2, 1, 0, 2]);
  assert.equal(s.text, '5 guests · 2 yes, 1 no, 2 awaiting');
  assert.equal(L.evcGuestSummary([{ response: 'tentative' }]).text, '1 guest · 1 maybe');
  assert.equal(L.evcGuestSummary([]).text, '');
  assert.deepEqual(plain(L.evcParseGuests('Sam <SAM@example.org>, alex@example.com; nope, alex@example.com')), ['sam@example.org', 'alex@example.com']);
});

test('Maps links, cut descriptions, time zones, colours, writable calendars', () => {
  assert.equal(L.evcMapsUrl('Room 2, Main Building'), 'https://www.google.com/maps/search/?api=1&query=Room%202%2C%20Main%20Building');
  assert.equal(L.evcMapsUrl('https://example.org/where'), 'https://example.org/where');
  assert.equal(L.evcMapsUrl('  '), '');
  assert.equal(L.evcMapsUrl('javascript:alert(1)').startsWith('https://www.google.com/maps/'), true, 'never a script link');
  assert.equal(L.evcDescTruncated('x'.repeat(998) + '…'), true);
  assert.equal(L.evcDescTruncated('short…'), false);
  assert.equal(L.evcZoneNote('America/New_York', 'Europe/London'), 'America/New_York');
  assert.equal(L.evcZoneNote('Europe/London', 'Europe/London'), '');
  assert.equal(L.evcZoneNote('', 'Europe/London'), '');
  assert.equal(vm.runInContext('EVC_COLORS.length', L), 11);
  assert.deepEqual(plain(L.evcColor('11')), { id: '11', name: 'Tomato', sw: 'red' });
  assert.equal(L.evcColor('0'), null);
  const cals = [
    { id: 'team@group.calendar.google.com', accessRole: 'writer' },
    { id: 'me@example.org', accessRole: 'owner', primary: true },
    { id: 'holidays@group.v.calendar.google.com', accessRole: 'reader' },
    { id: 'src1/abc', accessRole: 'owner' },
    { id: 'other@example.org' },
  ];
  assert.deepEqual(L.evcWritableCalendars(cals).map(c => c.id), ['me@example.org', 'team@group.calendar.google.com']);
});

/* ---------- the card's hooks (61-task-card.js) ---------- */
test('openEvent(null, {create}) opens the card in create-event mode', () => {
  const calls = [];
  const box = {
    console, Math, JSON, Date, Number, String, Object, Array, Set, Map, isFinite,
    CSS: { escape: (s) => String(s) }, state: { view: 'calendar' },
    saveUI() {}, render() {}, getItem: () => null, selectTask() {}, registerSettingsGroup() {}, registerCommand() {},
    calEventById: () => null, _calOpenEventPanel: (id) => calls.push(['panel', id]),
    evcOpenCreate: (prefill, o) => { calls.push(['create', prefill, o]); return 'card'; },
    setTimeout, clearTimeout,
    document: { addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [], body: { classList: { add() {}, remove() {} } } },
    window: { matchMedia: () => ({ matches: false }) },
  };
  vm.createContext(box);
  vm.runInContext(app('61-task-card.js'), box, { filename: '61-task-card.js' });
  const prefill = { start: '2026-10-07T14:00', end: '2026-10-07T15:00', allDay: false, calendarId: 'me@example.org', title: 'Lunch' };
  assert.equal(box.openEvent(null, { create: prefill }), 'card');
  assert.equal(calls[0][0], 'create');
  assert.deepEqual(calls[0][1], prefill);
  assert.equal(box.openEvent(null, {}), false, 'no id and nothing to create: nothing opens');
  // the card's stack keys and labels know the new kind
  assert.equal(box._tcKeyOf({ kind: 'evcreate', draft: { key: 'v1' } }), 'evcreate:v1');
  assert.equal(box._tcKeyOf({ kind: 'event', id: 'e1' }), 'event:e1');
  assert.equal(box._tcEntryLabel({ kind: 'evcreate', draft: {} }), 'New event');
  assert.equal(box._tcValid({ kind: 'evcreate', draft: {} }), true);
});

test('the event editor UI keeps the page rules: escaped text, no inline handlers, CalWrite only, hooks wired', () => {
  const src = app('46-cal-event-edit.js');
  assert.ok(!/\son[a-z]+=["'\\]/.test(src), 'no inline handlers');
  assert.ok(!/fetch\(/.test(src), 'writes go through CalWrite, never fetch');
  // Event text (titles, places, descriptions, names, addresses) is never put into markup unescaped.
  assert.ok(!/\$\{\s*[a-z]+\.(summary|description|location|name|email)\b/.test(src), 'event text interpolated without esc()');
  assert.match(src, /renderMarkdown\(desc\)/, 'the description is rendered by the safe markdown renderer');
  for (const n of ['canEdit', 'update', 'create', 'remove', 'rsvp', 'onChange', 'realId', 'fieldEditable', 'canRsvp']) assert.match(src, new RegExp(`\\b${n}\\b`), `uses CalWrite.${n}`);
  assert.match(app('61-task-card.js'), /evcFollowId\(e\)/, 'the card follows a new event to its Google id');
  assert.match(app('43-calendar-panel.js'), /evcDecorate\(out, ev, o\)/, 'calEventParts hands its parts to the editor');
  assert.match(app('61-task-card.js'), /_evcCreateView\(inner, cur\)/, 'the card paints create-event mode');
  assert.match(app('40-calendar.js'), /evcColor\(ev\.colorId\)/, 'events show their own Google colour');
});
