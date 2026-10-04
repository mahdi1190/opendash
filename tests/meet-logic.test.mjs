// Meetings and last contact (W0-B): the pure rules in src/app/12-home-meet-logic.js
// and src/app/53-people-contact-logic.js (through lib/meet-logic.mjs): one copy
// per meeting across calendars, attendees matched to People exactly as the
// stories match them, the next / ended meetings, "last contact" shared with
// lib/story-data.mjs and person.get, plus eventMeta.wrapped through
// annotate_event. Synthetic data only (generic names).
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  homeDedupeEvents, meetPeopleIndex, meetAttendeePerson, homeMeetingAttendees, homeEventPeople, homeIsMeeting,
  homeMeetings, homeNextMeeting, homeEndedMeetings, lastContactMap, lastContactFor, contactDaysAgo, contactDue,
} from '../lib/meet-logic.mjs';
import { matchAttendee, eventPeople, peopleOfDay } from '../lib/story-data.mjs';
import { pplBuildIndex, pplFold } from '../lib/people-tags.mjs';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir, TODAY, addDays } from './fixtures/actions-state.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const plain = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const eq = (a, b, msg) => assert.deepEqual(plain(a), plain(b), msg);

const PEOPLE = [
  { id: 'sam', name: 'Sam Taylor', email: 'sam@example.com', aliases: ['samt'] },
  { id: 'alex', name: 'Alex Kim', emails: ['alex.kim@example.org'] },
  { id: 'jo', name: 'Jo Rivers' },
  { id: 'me', name: 'The User', email: 'me@example.net', self: true },
  { id: 'old', name: 'Robin Old', email: 'robin@example.com', inactive: true },
];
const T = (h, m = 0, day = '2026-10-05') => `${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
const ev = (id, s, e, extra = {}) => ({ id, summary: id, start: { dateTime: s }, end: { dateTime: e }, attendees: [{ email: 'me@example.net', self: true, response: 'accepted' }, { email: 'sam@example.com', name: 'Sam Taylor', response: 'accepted' }], ...extra });

test('both files are pure: no DOM, no page state', () => {
  for (const f of ['12-home-meet-logic.js', '53-people-contact-logic.js']) {
    const src = readFileSync(join(APP, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const word of ['document.', 'window.', 'APP_CONFIG', 'state.', 'localStorage', 'fetch(', 'saveData', 'render(']) assert.ok(!src.includes(word), `${f} uses ${word}`);
  }
});

test('dedupe: one copy per meeting across calendars, the richer copy wins; a series keeps its occurrences', () => {
  const a = ev('m1', T(10), T(11), { calendarId: 'me@example.net' });
  const b = { ...ev('m1', T(10), T(11)), calendarId: 'team@group.calendar.google.com', description: 'Agenda', attendees: [...a.attendees, { email: 'alex.kim@example.org' }] };
  const c = { id: 'x2', summary: 'M1', start: { dateTime: T(10) }, end: { dateTime: T(11) }, calendarId: 'other@example.com' };   // same start, end and title
  const r1 = { id: 'r1', iCalUID: 'uid-1', summary: 'Standup', start: { dateTime: T(9) }, end: { dateTime: T(9, 15) } };
  const r2 = { id: 'r2', iCalUID: 'uid-1', summary: 'Standup', start: { dateTime: T(9, 0, '2026-10-06') }, end: { dateTime: T(9, 15, '2026-10-06') } };
  const r3 = { id: 'r3', iCalUID: 'uid-1', summary: 'Stand-up (copy)', start: { dateTime: T(9) }, end: { dateTime: T(9, 15) } };
  const out = homeDedupeEvents([a, b, c, r1, r2, r3, null, { id: 'nostart' }]);
  eq(out.map(e => e.id), ['m1', 'r1', 'r2']);
  eq(out[0].calendars, ['me@example.net', 'team@group.calendar.google.com', 'other@example.com']);
  eq([out[0].description, out[0].attendees.length], ['Agenda', 3]);
  assert.equal(a.calendars, undefined, 'the input is not changed');
});

test('attendees -> People: the same rule as the stories (address, name, alias, local part, a unique name)', () => {
  const ix = meetPeopleIndex(PEOPLE);
  const idx = pplBuildIndex(PEOPLE);
  const names = new Map();
  for (const p of PEOPLE) if (!p.self && !p.inactive) { names.set(pplFold(p.name), p.id); for (const al of p.aliases || []) names.set(pplFold(al), p.id); }
  const cases = [
    { email: 'SAM@example.com' }, { email: 'alex.kim@example.org', name: 'whoever' }, { name: 'Jo Rivers' }, { name: 'samt' },
    { email: 'jo.rivers@mail.example.net' }, { name: 'Dr Alex Kim' }, { email: 'me@example.net' }, { name: 'Nobody Here' }, { personId: 'jo' }, null,
  ];
  for (const a of cases) assert.equal(meetAttendeePerson(a, ix), matchAttendee(a, idx, names), JSON.stringify(a));
  eq(cases.map(a => meetAttendeePerson(a, ix)), ['sam', 'alex', 'jo', 'sam', 'jo', 'alex', null, null, 'jo', null]);
  // an event's people: attendees then names in the title, as the stories' eventPeople
  const e = { summary: 'Catch-up with Alex', attendees: [{ email: 'sam@example.com' }, { email: 'me@example.net', self: true }] };
  eq(homeEventPeople(e, ix), eventPeople({ title: e.summary, attendees: e.attendees }, idx, names));
  eq(homeEventPeople(e, ix), ['sam', 'alex']);
});

test('which events are meetings, and the other people at them', () => {
  const o = { myEmails: ['me@example.net'] };
  assert.equal(homeIsMeeting(ev('m', T(10), T(11)), o), true);
  assert.equal(homeIsMeeting({ ...ev('m', T(10), T(11)), selfResponse: 'declined' }, o), false, 'declined');
  assert.equal(homeIsMeeting({ ...ev('m', T(10), T(11)), eventType: 'focusTime' }, o), false);
  assert.equal(homeIsMeeting({ ...ev('m', T(10), T(11)), free: true }, o), false);
  assert.equal(homeIsMeeting({ id: 'solo', summary: 'Gym', start: { dateTime: T(7) }, end: { dateTime: T(8) } }, o), false, 'nobody else');
  assert.equal(homeIsMeeting({ id: 'room', summary: 'Room', start: { dateTime: T(7) }, end: { dateTime: T(8) }, attendees: [{ email: 'room-1@resource.calendar.google.com' }] }, o), false, 'only a room');
  assert.equal(homeIsMeeting({ ...ev('d', '', ''), start: { date: '2026-10-05' }, end: { date: '2026-10-06' }, allDay: true }, o), false, 'all day');
  // no self flag (an iCal source): the user's addresses say who is "me"
  const ical = { id: 'i', summary: 'Sync', start: { dateTime: T(12) }, end: { dateTime: T(12, 30) }, attendees: [{ email: 'me@example.net', response: 'declined' }, { email: 'sam@example.com' }] };
  assert.equal(homeIsMeeting(ical, o), false);
  const att = homeMeetingAttendees(ev('m', T(10), T(11), { attendees: [{ email: 'me@example.net', self: true }, { email: 'sam@example.com', organizer: true }, { email: 'sam@example.com' }, { name: 'Jo Rivers', optional: true }] }), meetPeopleIndex(PEOPLE), o);
  eq(att.map(a => [a.personId, a.organizer, a.optional]), [['sam', true, false], ['jo', false, true]]);
});

test('meetings in a window, the next one (or the one under way), and the ones that ended', () => {
  const events = [
    ev('early', T(8), T(8, 30)), ev('standup', T(9, 30), T(10)), { ...ev('standup', T(9, 30), T(10)), calendarId: 'team@group.calendar.google.com' },
    ev('review', T(13), T(14), { organizer: { email: 'me@example.net', self: true }, conferenceUrl: 'https://meet.google.com/abc' }),
    ev('tomorrow', T(10, 0, '2026-10-06'), T(11, 0, '2026-10-06')), { id: 'gym', summary: 'Gym', start: { dateTime: T(18) }, end: { dateTime: T(19) } },
  ];
  const o = { from: T(0), to: T(0, 0, '2026-10-06'), myEmails: ['me@example.net'], people: PEOPLE };
  const ms = homeMeetings(events, o);
  eq(ms.map(m => m.id), ['early', 'standup', 'review']);
  eq([ms[2].organizer, ms[2].join, ms[2].people, ms[2].minutes, ms[2].startMin, ms[2].date], ['me', 'https://meet.google.com/abc', ['sam'], 60, 13 * 60, '2026-10-05']);
  const now = Date.parse(T(9, 45));
  const n = homeNextMeeting(ms, now);
  eq([n.meeting.id, n.current, n.inMin], ['standup', true, 0]);
  const n2 = homeNextMeeting(events, Date.parse(T(10, 5)), { myEmails: ['me@example.net'] });
  eq([n2.meeting.id, n2.current, n2.inMin], ['review', false, 175]);
  assert.equal(homeNextMeeting(ms, Date.parse(T(10, 5)), { horizonH: 1 }), null, 'nothing within the hour');
  const ended = homeEndedMeetings(ms, Date.parse(T(14, 30)), { isWrapped: (id) => id === 'early' });
  eq(ended.map(m => m.id), ['review', 'standup'], 'newest first, wrapped ones left out');
  eq(homeEndedMeetings(ms, Date.parse(T(14, 30)), { sinceH: 1 }).map(m => m.id), ['review']);
});

test('last contact: the latest day wins; on one day meeting > email > note > task; nothing after today', () => {
  const src = {
    today: '2026-10-05',
    pastEvents: [{ date: '2026-09-30', people: ['sam', 'jo'] }, { date: '2026-10-05', people: ['alex'] }],
    emails: [{ personId: 'sam', date: '2026-09-30T08:00:00Z' }, { personId: 'jo', date: '2026-10-02' }, { personId: 'alex', date: '2026-10-09' }],
    notes: [{ personId: 'jo', date: '2026-10-02' }, { personId: 'kai', date: '2026-10-01' }],
    doneTasks: [{ date: '2026-10-03', people: ['kai'] }, { date: 'bad', people: ['sam'] }],
  };
  const m = lastContactMap(src);
  eq(Object.fromEntries(m), {
    sam: { date: '2026-09-30', kind: 'meeting', daysAgo: 5 },
    jo: { date: '2026-10-02', kind: 'email', daysAgo: 3 },
    kai: { date: '2026-10-03', kind: 'task', daysAgo: 2 },
  });
  assert.equal(m.has('alex'), false, "today's meeting is not over (the stories' rule) and a future email does not count");
  eq(lastContactFor('alex', { ...src, includeToday: true }), { date: '2026-10-05', kind: 'meeting', daysAgo: 0 }, 'the page passes only meetings that ended');
  assert.equal(lastContactFor('nobody', src), null);
  assert.equal(contactDaysAgo('2026-09-05', '2026-10-05'), 30);
  // keep in touch
  eq(contactDue({ date: '2026-09-01' }, 30, '2026-10-05'), { due: true, overdueBy: 4, nextOn: '2026-10-01' });
  eq(contactDue({ date: '2026-09-20' }, 30, '2026-10-05'), { due: false, overdueBy: 0, nextOn: '2026-10-20' });
  eq(contactDue(null, 14, '2026-10-05'), { due: true, overdueBy: 0, nextOn: '2026-10-05' });
  eq(contactDue({ date: '2026-09-01' }, 30, '2026-10-05', '2026-10-10'), { due: false, overdueBy: 0, nextOn: '2026-10-10' }, 'snoozed');
  eq(contactDue({ date: '2026-09-01' }, 0, '2026-10-05').due, false);
});

test('the stories still report last contact the same way (via the shared rule)', () => {
  const day = (ms) => new Date(ms).toISOString().slice(0, 10);
  const state = {
    people: PEOPLE.map(p => p.id === 'jo' ? { ...p, notes: [{ id: 'n', ts: Date.parse('2026-10-04T12:00:00Z'), text: 'x' }] } : p),
    custom: [{ id: 't1', title: 'Send Sam the plan', people: ['sam'], dueDate: '2026-10-05' }, { id: 't2', title: 'Chase Jo', people: ['jo'], dueDate: '2026-10-05' }],
    statuses: {}, completionLog: {},
  };
  const out = peopleOfDay({ state, today: '2026-10-05', events: [], pastEvents: [{ id: 'p', title: 'Lunch', date: '2026-10-01', attendees: [{ email: 'sam@example.com' }] }], inbox: [{ personId: 'sam', date: '2026-09-29' }], tz: 'UTC' });
  const by = Object.fromEntries(out.map(p => [p.id, p.lastContact]));
  eq(by.sam, { date: '2026-10-01', via: 'meeting', daysAgo: 4 });
  eq(by.jo, { date: '2026-10-04', via: 'note', daysAgo: 1 });
  assert.equal(day(Date.parse('2026-10-04T12:00:00Z')), '2026-10-04');
});

/* ---------- through the actions layer ---------- */
let dir, a;
beforeEach(() => { dir = makeDataDir(); a = createActions({ dataDir: dir }); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const disk = () => JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
const run = (ops) => a.apply({ ops, source: 'mcp', client: 'test' });

test('annotate_event wrapped: kept on its own, shown by list_calendar, removed (and pruned) when cleared', async () => {
  await run([{ op: 'event.annotate', eventId: 'e1', wrapped: true }]);
  eq(disk().eventMeta.e1, { wrapped: true });
  const cal = await a.query('calendar.list', { from: TODAY, to: TODAY });
  assert.equal(cal.events.find(e => e.id === 'e1').wrapped, true);
  const r = await run([{ op: 'event.annotate', eventId: 'e1', wrapped: true }]);
  assert.equal(r.changed, 0, 'already wrapped');
  await run([{ op: 'event.annotate', eventId: 'e1', wrapped: false }]);
  assert.equal((disk().eventMeta || {}).e1, undefined, 'an entry with nothing left is pruned');
  await run([{ op: 'event.annotate', eventId: 'e1', notes: 'Agenda', wrapped: true }]);
  await run([{ op: 'event.annotate', eventId: 'e1', notes: null }]);
  eq(disk().eventMeta.e1, { wrapped: true }, 'wrapped alone keeps the entry');
});

test('get_person says when the user was last in touch (a note on the person, a completed task)', async () => {
  const s = disk();
  const p = s.people.find(x => x.id === 'alex');
  p.notes = [{ id: 'n1', ts: Date.parse(addDays(TODAY, -3) + 'T12:00:00Z'), text: 'Met at the seminar' }];
  s.completionLog = { 'u-1-aaa': [Date.parse(addDays(TODAY, -1) + 'T12:00:00Z')] };
  writeFileSync(join(dir, 'state', 'dashboard-state.json'), JSON.stringify(s));
  const g = await a.query('person.get', { id: 'alex' });
  eq(g.lastContact, { date: addDays(TODAY, -3), kind: 'note', daysAgo: 3 });
  const sam = await a.query('person.get', { id: 'sam' });
  eq(sam.lastContact, { date: addDays(TODAY, -1), kind: 'task', daysAgo: 1 });
});
