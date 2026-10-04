// Home's Today hero (src/app/12-home-today-logic.js): the deterministic "today
// in a few lines" writer, the numbers row, and the small helpers it uses. The
// file is pure (no DOM, no state), so it runs alone in a VM. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'src', 'app', '12-home-today-logic.js'), 'utf8');
const box = vm.createContext({});
vm.runInContext(SRC, box, { filename: '12-home-today-logic.js' });
// Values cross the VM boundary as JSON, so deepEqual compares plain objects.
const call = (fn, ...args) => JSON.parse(JSON.stringify(vm.runInContext(fn, box)(...JSON.parse(JSON.stringify(args)))));
const template = (x) => call('homeTodayTemplate', x);
const stats = (x) => call('homeTodayStats', x);

const EVENTS = [
  { id: 'e1', title: 'Stand-up', start: '09:00', end: '09:30' },
  { id: 'e2', title: 'Coffee with Ana', start: '10:30', end: '11:15' },
  { id: 'e3', title: 'Paper review', start: '13:00', end: '14:00' },
  { id: 'e4', title: 'Dentist', start: '16:00', end: '16:40' },
  { id: 'e5', title: 'Dinner with Bo', start: '19:00', end: '21:00' },
  { id: 'e6', title: 'Holiday', allDay: true },
];
/** Every entity names exactly the text at its offsets, and spans never overlap. */
function assertSpans(t) {
  for (const s of t.sentences) {
    let last = -1;
    for (const e of s.entities) {
      assert.equal(s.text.slice(e.start, e.end), e.text, `entity text at its offsets in "${s.text}"`);
      assert.ok(e.start >= last, 'in order, no overlap');
      assert.ok(['person', 'task', 'event', 'time', 'place', 'money', 'deadline'].includes(e.type), e.type);
      assert.equal(typeof e.ref, 'string');
      last = e.end;
    }
    assert.match(s.text, /^[A-Z“]/, 'starts with a capital: ' + s.text);
    assert.match(s.text, /[.!?]$/, 'ends a sentence: ' + s.text);
  }
}

test('template, a busy morning: the next events, what is due, the clearest stretch for the top Focus task', () => {
  const t = template({
    now: '09:48', events: EVENTS,
    dueToday: [{ id: 't1', title: 'Send the response letter' }], overdue: [{ id: 't2', title: 'Reply about the dataset' }],
    focus: [{ id: 't1', title: 'Send the response letter' }, { id: 't3', title: 'Chapter 5 corrections: the limitations rewrite' }],
  });
  assertSpans(t);
  assert.equal(t.sentences.length, 3);
  assert.equal(t.sentences[0].text, 'Next up is Coffee with Ana at 10:30, then Paper review at 13:00, and two more after that.');
  assert.equal(t.sentences[1].text, 'Send the response letter is due today, and one task is overdue.');
  // The longest gap from now (09:00-18:00) is 14:00-16:00; the Focus task already named is skipped
  // and the long title is cut at the colon.
  assert.equal(t.sentences[2].text, 'Your clearest stretch is 14:00–16:00: point it at Chapter 5 corrections.');
  const e = t.sentences[2].entities;
  assert.deepEqual(e.map(x => [x.type, x.ref]), [['time', '14:00'], ['task', 't3']]);
  assert.equal(t.tone, 'busy');
});

test('template, a clear day: nothing due, the first event far off, then a gentle suggestion', () => {
  const t = template({ now: '09:48', events: [EVENTS[3]], focus: [{ id: 't3', title: 'Chapter 5 corrections' }] });
  assertSpans(t);
  assert.equal(t.tone, 'clear');
  assert.equal(t.sentences[0].text, 'A clear day. Nothing is due, and the calendar is empty until 16:00, when you have Dentist.');
  assert.deepEqual(t.sentences[0].entities.map(x => x.type), ['time', 'event']);
  assert.equal(t.sentences[1].text, 'A good day to get ahead on Chapter 5 corrections, or to rest.');
  // Nothing at all: still two calm sentences, no entities.
  const empty = template({ now: '09:00' });
  assertSpans(empty);
  assert.deepEqual(empty.sentences.map(s => s.text), ['A clear day: nothing is due and the calendar is empty.', 'A good day to get ahead, or to rest.']);
});

test('template + stats, an all-day-only day: the entry is named, the calendar is never called empty', () => {
  const bday = { id: 'b1', title: 'Lena’s birthday', allDay: true };
  // The Events number counts it, and the words name it as a chip that opens the event.
  const s = stats({ now: '09:00', events: [bday] });
  assert.deepEqual([s.events.n, s.events.timed, s.events.allDay, s.events.sub], [1, 0, 1, 'No meetings']);
  const t = template({ now: '09:00', events: [bday], focus: [{ id: 'f', title: 'Chapter 5 corrections' }] });
  assertSpans(t);
  assert.equal(t.tone, 'clear');
  assert.equal(t.sentences[0].text, 'Lena’s birthday today, otherwise a clear day: nothing is due and there are no meetings.');
  assert.deepEqual(t.sentences[0].entities.map(e => [e.type, e.ref, e.text]), [['event', 'b1', 'Lena’s birthday']]);
  assert.equal(t.sentences[1].text, 'A good day to get ahead on Chapter 5 corrections, or to rest.');
  for (const x of [t, template({ now: '09:00', events: [EVENTS[5]] }), template({ now: '15:00', events: [EVENTS[3], EVENTS[5]] })]) {
    for (const sn of x.sentences) assert.doesNotMatch(sn.text, /calendar is (empty|done)|nothing booked/i, sn.text);
  }
  // Two, then more than two (named twice at most); the same entry listed twice is said once.
  const two = template({ now: '09:00', events: [bday, { id: 'h', title: 'Bank holiday', allDay: true }, bday] });
  assert.equal(two.sentences[0].text, 'Lena’s birthday and Bank holiday today, otherwise a clear day: nothing is due and there are no meetings.');
  const four = template({ now: '09:00', events: [bday, { id: 'h', title: 'Bank holiday', allDay: true }, { id: 'l', title: 'Leave', allDay: true, bg: true }, { id: 'c', title: 'Conference', allDay: true }] });
  assert.equal(four.sentences[0].text, 'Lena’s birthday, Bank holiday and two more today, otherwise a clear day: nothing is due and there are no meetings.');
  // Meetings later: the entry first, then when the first meeting is.
  const later = template({ now: '09:48', events: [bday, EVENTS[3]] });
  assertSpans(later);
  assert.equal(later.sentences[0].text, 'Lena’s birthday today. Nothing is due, and there are no meetings until 16:00, when you have Dentist.');
  assert.deepEqual(later.sentences[0].entities.map(e => e.type), ['event', 'time', 'event']);
  // Meetings over, or things due with no meetings.
  assert.equal(template({ now: '17:00', events: [bday, EVENTS[3]] }).sentences[0].text, 'Lena’s birthday today, otherwise a clear rest of the day: nothing is due and the meetings are done.');
  const due = template({ now: '09:00', events: [bday], dueToday: [{ id: 'd', title: 'Send the letter' }] });
  assertSpans(due);
  assert.deepEqual(due.sentences.slice(0, 2).map(x => x.text), ['Lena’s birthday today, and no meetings, so the day is yours.', 'Send the letter is due today.']);
  // Leave / out-of-office blocks are all-day background: named, but not counted as events (as in Today's schedule).
  const leave = stats({ now: '09:00', events: [{ id: 'l', title: 'Leave', allDay: true, bg: true }] });
  assert.deepEqual([leave.events.n, leave.events.sub], [0, 'No meetings']);
});

test('template, no calendar or not read yet: no claims about meetings or free time', () => {
  for (const calendar of [false, 'unknown']) {
    const t = template({ now: '09:00', calendar, events: [], focus: [{ id: 'f', title: 'Focus task' }] });
    assertSpans(t);
    assert.deepEqual(t.sentences.map(s => s.text), ['Nothing is due today.', 'A good day to get ahead on Focus task, or to rest.'], String(calendar));
    const d = template({ now: '09:00', calendar, dueToday: [{ id: 'a', title: 'Alpha' }], focus: [{ id: 'f', title: 'Focus task' }] });
    assertSpans(d);
    assert.deepEqual(d.sentences.map(s => s.text), ['Alpha is due today.', 'When you get a moment, make a start on Focus task.'], String(calendar));
    for (const s of [...t.sentences, ...d.sentences]) assert.doesNotMatch(s.text, /calendar|meeting|stretch|free/i, s.text);
  }
});

test('template, during an event, several due, overdue only, and no events', () => {
  const now = template({ now: '10:45', events: EVENTS, dueToday: [{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Beta' }] });
  assertSpans(now);
  assert.equal(now.sentences[0].text, 'Right now it’s Coffee with Ana, then Paper review at 13:00.');
  assert.equal(template({ now: '19:30', events: EVENTS, dueToday: [{ id: 'a', title: 'Alpha' }] }).sentences[0].text, 'Right now it’s Dinner with Bo until 21:00.');
  assert.equal(now.sentences[1].text, 'Two things are due today, starting with Alpha.');
  const over = template({ now: '09:00', overdue: [{ id: 'o1', title: 'Old thing' }, { id: 'o2', title: 'Older' }], focus: [{ id: 'f', title: 'Focus task' }] });
  assertSpans(over);
  assert.equal(over.sentences[0].text, 'No meetings today, so the day is yours.');
  assert.equal(over.sentences[1].text, 'Nothing is due today, but two overdue tasks could use a look, starting with Old thing.');
  assert.equal(over.sentences[2].text, 'Your clearest stretch is 09:00–18:00: point it at Focus task.');
  // An entity at the very start is never re-cased (its text must match the sentence).
  const lower = template({ now: '09:00', events: [{ id: 'x', title: 'lunch', start: '12:00', end: '13:00' }], dueToday: [{ id: 'd', title: 'draft intro' }] });
  assert.equal(lower.sentences[0].text, 'First up is lunch at 12:00.');
  const s1 = lower.sentences[1];
  assert.equal(s1.text, 'draft intro is due today.');
  assert.equal(s1.text.slice(s1.entities[0].start, s1.entities[0].end), s1.entities[0].text);
});

test('template, the evening: what got done, what slipped, how tomorrow starts', () => {
  const t = template({ evening: true, now: '17:48', events: EVENTS, doneCount: 9, done: [{ id: 't1', title: 'Response letter' }], slipped: 2, tomorrowFirst: { id: 'e9', title: 'Seminar', start: '09:30' } });
  assertSpans(t);
  assert.equal(t.tone, 'evening');
  assert.deepEqual(t.sentences.map(s => s.text), [
    'You closed nine tasks today, including Response letter.',
    'Two things didn’t fit today; they can move to tomorrow without guilt.',
    'Tomorrow starts at 09:30 with Seminar.',
  ]);
  // Older overdue tasks are "still open", not "didn't fit today".
  const old = template({ evening: true, now: '17:48', doneCount: 2, done: [{ id: 'a', title: 'A thing' }], slipped: 11, slippedToday: 2 });
  assert.equal(old.sentences[1].text, '11 things are still open, two of them from today; pick what moves to tomorrow.');
  const quiet = template({ evening: true, now: '17:48', events: EVENTS, doneCount: 0, slipped: 0 });
  assertSpans(quiet);
  assert.deepEqual(quiet.sentences.map(s => s.text), ['A quieter day on the list. Rest counts too.', 'Still to come: Dinner with Bo at 19:00.']);
  // Never more than three sentences.
  const busy = template({ evening: true, now: '17:48', events: EVENTS, doneCount: 1, done: [{ id: 'a', title: 'A thing' }], slipped: 1, dueTomorrow: [{ id: 'b', title: 'B' }], tomorrowFirst: null });
  assert.ok(busy.sentences.length <= 3);
  assert.equal(busy.sentences[2].text, 'Tomorrow, B is due.');
});

test('stats, the morning: due and overdue, free time, the next event, Focus steps, done since', () => {
  const s = stats({
    now: '09:48', events: EVENTS, dueToday: 2, overdue: 1, doneToday: 3, firstDoneAt: '08:40',
    focus: [{ done: false, subDone: 3, subTotal: 7 }, { done: true, subDone: 0, subTotal: 0 }, { done: false, subDone: 0, subTotal: 0 }, { done: true, subDone: 1, subTotal: 4 }],
  });
  assert.deepEqual(s.due, { n: 2, overdue: 1, bad: true, sub: '1 overdue' });
  assert.equal(s.events.n, 6, 'timed and all-day');
  assert.equal(s.events.timed, 5);
  assert.equal(s.events.held, 1);
  // Free from 09:48: 42 + 105 + 120 + 80 minutes = 5 h 47 -> "5½ h free".
  assert.equal(s.events.sub, '5½ h free');
  assert.deepEqual([s.next.state, s.next.id, s.next.minutes, s.next.big, s.next.small], ['soon', 'e2', 42, '42 min', '']);
  // A task without subtasks is one step; a finished task counts all its steps.
  assert.deepEqual(s.focus, { done: 3 + 1 + 0 + 4, total: 7 + 1 + 1 + 4, pct: Math.round(8 / 13 * 100) });
  assert.deepEqual(s.done, { n: 3, sub: 'Since 08:40' });
});

test('stats: a clear morning, an event under way, nothing left, no calendar, the evening', () => {
  const clear = stats({ now: '09:48', events: [EVENTS[3]] });
  assert.equal(clear.events.sub, 'Free until 16:00');
  assert.deepEqual([clear.next.big, clear.next.small], ['6 h', '12 min']);
  assert.deepEqual(clear.due, { n: 0, overdue: 0, bad: false, sub: 'Nothing overdue' });
  assert.deepEqual(clear.focus, { done: 0, total: 0, pct: 0 });
  assert.deepEqual(clear.done, { n: 0, sub: 'A blank page' });
  // Under way with nothing after it: "Now", until its end.
  const during = stats({ now: '19:30', events: EVENTS });
  assert.deepEqual([during.next.state, during.next.big, during.next.at], ['now', 'Now', 'until 21:00']);
  // Under way with something after it: Next is the one that has not started.
  assert.equal(stats({ now: '10:45', events: EVENTS }).next.id, 'e3');
  // Back to back.
  const packed = stats({ now: '09:00', events: [{ id: 'a', start: '09:00', end: '13:30' }, { id: 'b', start: '13:40', end: '18:00' }] });
  assert.equal(packed.events.sub, 'Back to back');
  // Nothing left today: tomorrow's first, else a dash.
  const late = stats({ now: '21:30', events: EVENTS, tomorrowFirst: { id: 't', title: 'Seminar', start: '09:30' } });
  assert.deepEqual([late.next.state, late.next.big, late.next.small, late.events.sub], ['tomorrow', 'Tomorrow', '09:30', 'All done']);
  const none = stats({ now: '21:30', events: [] });
  assert.deepEqual([none.next.state, none.next.big, none.next.at, none.events.sub], ['none', '—', 'Nothing else today', 'Nothing booked']);
  const noCal = stats({ now: '09:00', calendar: false });
  assert.deepEqual([noCal.events.sub, noCal.next.at], ['No calendar', 'No calendar']);
  // Evening: events held of total, the next one by name, what slipped.
  const eve = stats({ evening: true, now: '17:48', events: EVENTS, slipped: 2 });
  assert.deepEqual([eve.events.held, eve.events.timed, eve.events.sub], [4, 5, 'One still to come']);
  // Before the calendar has been read: no claims either way.
  const unk = stats({ now: '09:00', calendar: 'unknown' });
  assert.deepEqual([unk.events.unknown, unk.events.sub, unk.next.state, unk.next.at], [true, '', 'none', '']);
  assert.deepEqual(eve.slipped, { n: 2, sub: 'Roll them to tomorrow' });
  assert.deepEqual(stats({ evening: true, now: '17:48' }).slipped, { n: 0, sub: 'Nothing slipped' });
});

test('helpers: durations, free gaps, short titles, segments, rain window, ISO week, chips', () => {
  assert.deepEqual(call('homeTodayDur', 42), { big: '42 min', small: '' });
  assert.deepEqual(call('homeTodayDur', 372), { big: '6 h', small: '12 min' });
  assert.deepEqual(call('homeTodayDur', 120), { big: '2 h', small: '' });
  assert.deepEqual(call('homeTodayDur', -5), { big: '0 min', small: '' });
  assert.deepEqual(call('homeTodayGaps', EVENTS, 9 * 60 + 48, { min: 45 }).map(g => [g.start, g.end]), [[11 * 60 + 15, 13 * 60], [14 * 60, 16 * 60], [16 * 60 + 40, 18 * 60]]);
  assert.deepEqual(call('homeTodayGaps', [], 20 * 60, {}), [], 'after the working day: no gaps');
  assert.equal(call('homeTodayShort', 'Launch final plan: budget, risks; sign-off Fri'), 'Launch final plan');
  assert.equal(call('homeTodayShort', 'Seminar: causal inference'), 'Seminar: causal inference', 'a head under 8 characters is not a name');
  assert.equal(call('homeTodayShort', 'A very long title that keeps going well past the limit of forty eight', 30), 'A very long title that keeps');
  const segs = call('homeTodaySegments', 'Coffee with Ana at 10:30.', [{ type: 'time', ref: '10:30', text: '10:30', start: 19, end: 24 }, { type: 'event', ref: 'e2', text: 'Coffee with Ana' }]);
  assert.deepEqual(segs.map(s => [s.text, !!s.entity]), [['Coffee with Ana', true], [' at ', false], ['10:30', true], ['.', false]]);
  const hourly = [8, 9, 10, 11, 12, 13].map((h, i) => ({ date: '2026-10-07', hour: h, cond: i >= 2 && i <= 3 ? 'showers' : 'cloudy', rain: [10, 20, 60, 80, 40, 70][i] }));
  assert.deepEqual(call('homeTodayRain', hourly, '2026-10-07', 8), { from: '10:00', to: '12:00', chance: 80, label: 'Showers', cond: 'showers' });
  assert.deepEqual(call('homeTodayRain', hourly, '2026-10-07', 12).from, '13:00', 'from the current hour on');
  assert.equal(call('homeTodayRain', hourly, '2026-10-08', 0), null, 'other days are ignored');
  assert.equal(call('homeTodayWeek', '2026-10-07'), 41);
  assert.equal(call('homeTodayWeek', '2021-01-03'), 53, 'ISO: early January can be the last week of the year before');
  assert.equal(call('homeTodayWeek', '2026-12-31'), 53);
  const chips = call('homeTodayChips', {
    dueToday: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }], dueTomorrow: [{ id: 'd', title: 'D' }],
    countdowns: [{ id: 'cd1', label: 'Product launch', num: '72', unit: 'd' }, { id: 'cd2', label: 'Quarterly report', num: '15', unit: 'w', warn: true }],
  });
  assert.deepEqual(chips.map(c => [c.kind, c.ref, c.lead, c.tone]), [['task', 'a', 'Today', 'acc'], ['task', 'b', 'Today', 'acc'], ['task', 'd', 'Tomorrow', 'warn']], 'at most three, most urgent first');
  const quietDay = call('homeTodayChips', { countdowns: [{ id: 'cd1', label: 'Product launch', num: '72', unit: 'd' }, { id: 'cd2', label: 'Quarterly report', num: '15', unit: 'w', warn: true }] });
  assert.deepEqual(quietDay.map(c => [c.kind, c.ref, c.lead, c.tone]), [['countdown', 'cd1', '72 d', ''], ['countdown', 'cd2', '15 w', 'warn']]);
  const eve = call('homeTodayChips', { evening: true, dueToday: [{ id: 'a', title: 'A' }], tomorrowFirst: { id: 'e', title: 'Seminar', start: '09:30' } });
  assert.deepEqual(eve.map(c => [c.kind, c.lead]), [['event', 'Tomorrow 09:30']], 'the evening looks ahead, not back');
});

test('the logic file has no side effects and needs no globals (it runs in an empty VM)', () => {
  const names = ['homeTodayShort', 'homeTodayDur', 'homeTodayGaps', 'homeTodayStats', 'homeTodayTemplate', 'homeTodaySegments', 'homeTodayRain', 'homeTodayWeek', 'homeTodayChips'];
  for (const n of names) assert.equal(vm.runInContext(`typeof ${n}`, box), 'function', n);
  assert.doesNotMatch(SRC, /\b(document|window|state|localStorage|fetch)\b\s*[.([]/, 'no DOM, state or network');
});
