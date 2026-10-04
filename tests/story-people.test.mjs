// People of the day (lib/story-data.mjs peopleOfDay / matchAttendee / eventPeople):
// calendar attendees matched to People by email, alias and name (never the user),
// names in titles, birthdays, tasks I owe / waiting on them / follow-ups, the focus
// tasks' people, last contact, ranking. Synthetic names only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { peopleOfDay, matchAttendee, eventPeople } from '../lib/story-data.mjs';
import { pplBuildIndex } from '../lib/people-tags.mjs';

const DAY = '2026-03-10';
const TZ = 'Europe/London';
function state(extra = {}) {
  return {
    people: [
      { id: 'sam', name: 'Sam Taylor', email: 'sam.taylor@uni.example', aliases: ['Sammy'], color: '#2563eb', role: 'Supervisor' },
      { id: 'alex', name: 'Alex Kim', email: '', aliases: ['akim'], color: '#059669' },
      { id: 'jo', name: 'Jo Rivers', email: 'jo@corp.example', aliases: [] },
      { id: 'jo2', name: 'Jo Banks', email: '', aliases: [] },
      { id: 'dee', name: 'Dee Park', email: '', aliases: [], notes: [{ ts: Date.parse('2026-03-08T12:00:00Z'), text: 'n' }] },
      { id: 'pat', name: 'Pat Lee', email: 'pat@x.example', aliases: [], inactive: true },
      { id: 'me', name: 'Robin Example', email: 'robin@uni.example', self: true },
    ],
    custom: [],
    statuses: {}, deleted: {}, completionLog: {},
    ...extra,
  };
}
const ev = (id, title, attendees = [], extra = {}) => ({ id, title, date: DAY, start: '10:00', end: '11:00', allDay: false, type: 'meeting', attendees, ...extra });

test('attendees: email first, then alias, display name and email local part; ambiguous names do not match', () => {
  const s = state();
  const idx = pplBuildIndex(s.people);
  const names = new Map([['sam taylor', 'sam'], ['sammy', 'sam'], ['alex kim', 'alex'], ['akim', 'alex'], ['jo rivers', 'jo'], ['jo banks', 'jo2'], ['dee park', 'dee']]);
  assert.equal(matchAttendee({ email: 'SAM.TAYLOR@uni.example' }, idx, names), 'sam', 'email, any case');
  assert.equal(matchAttendee({ name: 'Sammy' }, idx, names), 'sam', 'alias');
  assert.equal(matchAttendee({ name: 'Alex Kim', email: 'someone@else.example' }, idx, names), 'alex', 'display name');
  assert.equal(matchAttendee({ email: 'akim@lab.example' }, idx, names), 'alex', 'email local part = alias');
  assert.equal(matchAttendee({ email: 'robin@uni.example', name: 'Robin Example' }, idx, names), null, 'never the user');
  assert.equal(matchAttendee({ name: 'Jo' }, idx, names), null, 'two Jos: no guess');
  assert.equal(matchAttendee({ name: 'Unknown Person', email: 'x@y.example' }, idx, names), null);
  assert.equal(matchAttendee({ personId: 'dee' }, idx, names), 'dee', 'an attendee already linked by the calendar layer');
});

test('event people: attendees plus names in the title, once each', () => {
  const s = state();
  const idx = pplBuildIndex(s.people);
  const names = new Map([['sam taylor', 'sam'], ['alex kim', 'alex']]);
  const ids = eventPeople({ title: 'Catch-up with Alex Kim', attendees: [{ email: 'sam.taylor@uni.example' }, { email: 'robin@uni.example' }, { name: 'Alex Kim' }] }, idx, names);
  assert.deepEqual(ids, ['sam', 'alex']);
});

test('people of the day: meetings with time, tasks owed / waiting / follow-ups, focus, birthdays', () => {
  const s = state({
    custom: [
      { id: 't1', title: 'Send chapter to Sam', people: ['sam'], dueDate: DAY, tags: [] },
      { id: 't2', title: 'Waiting on Sam for comments', people: ['sam'], tags: ['waiting'] },
      { id: 't3', title: 'Follow up with Alex about the data', people: ['alex'], dueDate: DAY, tags: [] },
      { id: 't4', title: 'Plan with Jo', people: ['jo'], dueDate: '2026-04-30', tags: [] },
      { id: 't5', title: 'Done already', people: ['dee'], dueDate: DAY, tags: [] },
      { id: 't6', title: 'Gift for Pat', people: ['pat'], dueDate: DAY, tags: [] },
    ],
    statuses: { t5: 'done' },
  });
  const events = [
    ev('e1', 'Project sync', [{ email: 'sam.taylor@uni.example' }, { email: 'robin@uni.example' }]),
    ev('e2', "Dee Park's birthday", [], { allDay: true, start: null, end: null, type: 'birthday' }),
    ev('e3', 'Declined thing', [{ email: 'jo@corp.example' }], { myResponse: 'declined' }),
  ];
  const out = peopleOfDay({ state: s, events, today: DAY, focusIds: ['t4'], tz: TZ, pastEvents: [{ id: 'p1', title: 'Old call', date: '2026-03-02', attendees: [{ email: 'sam.taylor@uni.example' }] }], inbox: [{ personId: 'alex', date: '2026-03-09T08:00:00Z' }] });
  const by = Object.fromEntries(out.map(p => [p.id, p]));
  assert.deepEqual(Object.keys(by).sort(), ['alex', 'dee', 'jo', 'sam']);
  assert.ok(!by.me && !by.pat, 'never the user; inactive people are left out');
  // Sam: a meeting today at 10:00, one owed, one waiting.
  assert.equal(by.sam.meetings[0].start, '10:00');
  assert.match(by.sam.why, /Meeting at 10:00/);
  assert.equal(by.sam.counts.owe, 1); assert.equal(by.sam.counts.waiting, 1);
  assert.match(by.sam.why, /You owe 1/); assert.match(by.sam.why, /Waiting on 1/);
  assert.equal(by.sam.first, 'Sam'); assert.equal(by.sam.color, '#2563eb'); assert.equal(by.sam.role, 'Supervisor');
  assert.deepEqual(by.sam.lastContact && [by.sam.lastContact.date, by.sam.lastContact.via], ['2026-03-02', 'meeting']);
  assert.equal(by.sam.lastContact.daysAgo, 8);
  // Alex: a follow-up due today, last contact by email.
  assert.equal(by.alex.counts.followUps, 1);
  assert.match(by.alex.why, /Follow-up due/);
  assert.equal(by.alex.lastContact.via, 'email');
  // Dee: a birthday named in the title (not a meeting), last contact from a note.
  assert.equal(by.dee.celebration.kind, 'birthday');
  assert.match(by.dee.why, /Birthday today/);
  assert.equal(by.dee.meetings.length, 0);
  assert.equal(by.dee.lastContact.via, 'note');
  // Jo: only because of a focus task (the declined meeting does not count).
  assert.ok(by.jo.reasons.includes('focus'));
  assert.equal(by.jo.meetings.length, 0);
  // Ranking: the birthday today first, then the meeting.
  assert.deepEqual(out.slice(0, 2).map(p => p.id), ['dee', 'sam']);
});

test('people of the day: nobody relevant -> empty; max is respected; horizon widens "due"', () => {
  const s = state({ custom: [{ id: 't1', title: 'Write to Alex', people: ['alex'], dueDate: '2026-03-11', tags: [] }] });
  assert.deepEqual(peopleOfDay({ state: s, events: [], today: DAY, tz: TZ }), []);
  const tomorrow = peopleOfDay({ state: s, events: [], today: DAY, horizon: '2026-03-11', tz: TZ });
  assert.deepEqual(tomorrow.map(p => p.id), ['alex']);
  const many = state();
  const evs = ['sam', 'alex', 'jo', 'jo2', 'dee'].map((id, i) => ev('e' + i, 'Meeting ' + i, [{ personId: id }]));
  assert.equal(peopleOfDay({ state: many, events: evs, today: DAY, tz: TZ, max: 3 }).length, 3);
  assert.deepEqual(peopleOfDay({ state: null, today: DAY }), []);
});
