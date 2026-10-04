// The Finish-the-day story (src/app/79-story-evening.js), loaded as the page loads it with
// small stubs for the page globals: the kind of evening (palette, mood, pace), which beats
// play and in what order, the narration, people seen, the nudge, the done tiles, the
// reflection (built-in and Claude's), moving / dropping / restoring a slipped task, and the
// engine hook it relies on (a beat that turns auto-advance off while waiting to leave stays).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = readFileSync(join(ROOT, 'src', 'app', '79-story-core.js'), 'utf8');
const evening = readFileSync(join(ROOT, 'src', 'app', '79-story-evening.js'), 'utf8');

/** Load the module with stubbed page globals; returns its functions and the registered builder. */
function load(env = {}) {
  const reg = { builders: {}, types: {} };
  const g = {
    storyRegisterBuilder: (k, f) => { reg.builders[k] = f; },
    storyRegisterBeatType: (k, f) => { reg.types[k] = f; },
    STORY_KIT: { list: (a) => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]) },
    animScene: (t) => ({ type: t, label: { writing: 'Writing', email: 'Email', admin: 'Admin', task: 'Task', coding: 'Coding', run: 'Run' }[t] || 'Event' }),
    briefAddDays: (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); },
    EVENING_ROLL_REASON: 'Rolled over at the end of the day',
    state: env.state || { taskActivity: {}, statuses: {} },
    getItem: env.getItem || (() => null),
    statusOf: env.statusOf || (() => 'todo'),
    saveData: env.saveData || (() => {}), render: () => {},
    userName: () => 'Sam',
  };
  g.setStatus = env.setStatus || ((id, s, o) => { g.state.statuses[id] = s; const it = g.getItem(id); if (o && o.wontDo && it) it.resolution = 'wontdo'; });
  g._evRoll = env._evRoll || ((id, field, date, reason) => {
    const it = g.getItem(id);
    if (field === 'planned') { it.plannedFor = date; } else { it.dueDate = date; }
    (g.state.taskActivity[id] = g.state.taskActivity[id] || []).push({ type: field === 'planned' ? 'plan' : 'date', to: date, reason });
  });
  const names = ['sevNumWord', 'sevSpokenTime', 'sevEventPhrase', 'sevPeopleMet', 'sevNudge', 'sevDayType', 'sevDoneGroups', 'sevReflection', '_sevSession', 'sevMoveOps', 'sevTop3Ops', '_sevForget', '_sev', 'storyCreateTimeline', 'storyCreateNarrator'];
  const keys = Object.keys(g);
  const fn = new Function(...keys, `"use strict";\n${core}\n${evening}\nreturn { ${names.join(', ')} };`);
  const api = fn(...keys.map(k => g[k]));
  return { ...api, reg, g };
}

const DAY = '2026-10-05';   // a Monday
const person = (id, first, extra) => Object.assign({ id, name: first + ' Example', first, color: 'blue', meetings: [], counts: { owe: 0, waiting: 0, followUps: 0 }, owe: [], lastContact: null }, extra || {});
function ctxFor(d, script) {
  const people = new Map((d.people || []).map(p => [p.id, p]));
  const events = new Map((d.events || []).map(e => [e.id, e]));
  const ents = new Map((d.entities || []).map(e => [e.type + '|' + e.ref, e]));
  return { kind: 'evening', data: d, script: script || { source: 'fallback', sentences: [{ text: 'A day.', entities: [] }], closing: 'Rest well.' }, reduced: false,
    person: (id) => people.get(id) || null, event: (id) => events.get(id) || null, task: () => null, entity: (t, r) => ents.get(t + '|' + r) || null, kit: {} };
}
function fullDay(over) {
  return Object.assign({
    kind: 'evening', date: DAY, weekday: 'Monday', userName: 'Sam Example',
    done: [{ id: 't1', title: 'Write the pricing page', type: 'writing', priority: 'p2', stream: 'Work' }, { id: 't2', title: 'Reply to the agency', type: 'email', stream: 'Work' }, { id: 't3', title: 'Pay the invoice', type: 'admin', stream: 'Home' }],
    doneCount: 3, subtasksDone: 2, held: ['e1', 'e2'], meetingsHeld: 2,
    events: [
      { id: 'e1', title: 'Coffee with Priya', date: DAY, start: '08:00', type: 'coffee', allDay: false },
      { id: 'e2', title: 'Design sync', date: DAY, start: '09:00', type: 'meeting', allDay: false },
      { id: 'e9', title: 'Supervision', date: '2026-10-06', start: '09:30', startMin: 570, type: 'one-on-one', allDay: false },
    ],
    people: [
      person('p1', 'Priya', { meetings: [{ eventId: 'e1', date: DAY, start: '08:00' }] }),
      person('p2', 'Tom', { meetings: [{ eventId: 'e2', date: DAY, start: '09:00' }] }),
      person('p3', 'Owen', { counts: { owe: 1, waiting: 0, followUps: 0 }, owe: [{ id: 't7', title: 'Send Owen the dataset' }] }),
    ],
    slipped: [{ id: 's1', title: 'Renew the railcard', why: 'due', field: 'due' }, { id: 's2', title: 'Chapter 6 intro', why: 'planned', field: 'planned' }],
    streak: { days: 3 }, thisWeek: 9,
    tomorrow: { date: '2026-10-06', weekday: 'Tuesday', events: ['e9'], tasks: [], first: 'e9' },
    deadlines: [], entities: [{ type: 'task', ref: 't1', text: 'pricing page' }, { type: 'event', ref: 'e9', text: 'Supervision' }],
  }, over || {});
}

test('spoken numbers and times read naturally', () => {
  const m = load();
  assert.equal(m.sevNumWord(8, true), 'Eight');
  assert.equal(m.sevNumWord(15), '15');
  assert.equal(m.sevSpokenTime('09:00'), '9 am');
  assert.equal(m.sevSpokenTime('14:30'), '2:30 pm');
  assert.equal(m.sevSpokenTime('12:00'), 'noon');
  assert.equal(m.sevSpokenTime('00:15'), '12:15 am');
  assert.equal(m.sevEventPhrase({ title: 'Alex Taylor Bday' }, 'Alex Taylor Bday'), "Alex Taylor's birthday");
  assert.equal(m.sevEventPhrase({ title: "Sam's birthday party" }, 'x'), "Sam's birthday");
  assert.equal(m.sevEventPhrase({ title: 'Team offsite' }, 'Offsite'), 'Offsite');
});

test('the kind of evening sets palette, mood, pace and confetti', () => {
  const m = load();
  const T = (d) => m.sevDayType(d, m.sevPeopleMet(d));
  assert.equal(T(fullDay({ doneCount: 0, done: [], subtasksDone: 0, meetingsHeld: 0, held: [], people: [] })).type, 'quiet');
  const q = T(fullDay({ doneCount: 0, done: [], subtasksDone: 0, meetingsHeld: 0, held: [], people: [] }));
  assert.deepEqual([q.palette, q.mood, q.confetti], ['lavender', 'gentle', false]);
  assert.ok(q.pace > 1, 'a quiet evening moves more slowly');
  const fest = fullDay(); fest.events = [...fest.events, { id: 'e5', title: 'Dinner with friends', date: DAY, start: '19:00', type: 'dinner' }];
  assert.equal(T(fest).type, 'festive');
  assert.equal(T(fest).palette, 'ember');
  assert.equal(T(fullDay({ done: [{ id: 't1', title: 'Submit', type: 'deadline' }] })).type, 'win');
  assert.equal(T(fullDay({ deadlines: [{ id: 'd1', due: '2026-10-06' }] })).type, 'focused');
  assert.equal(T(fullDay({ weekday: 'Saturday' })).type, 'weekend');
  assert.equal(T(fullDay({ doneCount: 7 })).type, 'full');
  assert.equal(T(fullDay()).type, 'steady');
});

test('beats: all six with stable ids, empty ones dropped, a social evening leads with people', () => {
  const m = load();
  const build = m.reg.builders.evening;
  const full = build(ctxFor(fullDay()));
  assert.deepEqual(full.map(b => b.id), ['done', 'people', 'slipped', 'tomorrow', 'reflect', 'outro']);
  assert.deepEqual(full.map(b => b.type), ['ev-done', 'ev-people', 'ev-slipped', 'ev-tomorrow', 'ev-reflect', 'ev-outro']);
  assert.ok(full.every(b => b.bg && b.bg.tod === 'dusk'), 'the evening is a dusk sky');
  assert.equal(full[full.length - 1].auto, false, 'the outro waits for Close the day');
  // Nobody seen, nothing slipped: those beats go.
  const lean = build(ctxFor(fullDay({ people: [], slipped: [], held: [] })));
  assert.deepEqual(lean.map(b => b.id), ['done', 'tomorrow', 'reflect', 'outro']);
  // Claude's script later: the same ids (the engine swaps the beats after the one on screen).
  const ai = build(ctxFor(fullDay(), { source: 'ai', palette: 'ocean', sentences: [{ text: 'You closed the pricing page.', entities: [] }], closing: 'Sleep well.' }));
  assert.deepEqual(ai.map(b => b.id), full.map(b => b.id));
  assert.equal(ai[0].bg.palette, 'ocean');
  // A party night with little ticked off: the people come first.
  const fest = fullDay({ doneCount: 1, done: [{ id: 't1', title: 'Write the pricing page', type: 'writing' }] });
  fest.events = [...fest.events, { id: 'e5', title: 'Drinks', date: DAY, start: '19:00', type: 'drinks' }];
  assert.equal(build(ctxFor(fest))[0].id, 'people');
});

test('narration: counts in words, names, singular and plural, spoken times', () => {
  const m = load();
  const b = m.reg.builders.evening(ctxFor(fullDay()));
  const by = Object.fromEntries(b.map(x => [x.id, x]));
  assert.equal(by.done.say, 'Three things done today, including pricing page.');
  assert.equal(by.people.say, 'You saw Priya and Tom. Anything to remember?');
  assert.equal(by.people.say, by.people.text, 'the heading IS the narration (the words light up with the voice)');
  assert.deepEqual(by.people.entities.map(e => e.ref), ['p1', 'p2']);
  assert.equal(by.slipped.say, 'Two things slipped. Want to move them to tomorrow?');
  assert.equal(by.tomorrow.say, 'Tomorrow starts at 9:30 am with Supervision. Pick your top three.');
  assert.equal(by.outro.head, 'Good job, Sam.');
  const one = m.reg.builders.evening(ctxFor(fullDay({ slipped: [{ id: 's1', title: 'Renew', why: 'due' }] })));
  assert.equal(one.find(x => x.id === 'slipped').say, 'One thing slipped. Want to move it to tomorrow?');
  const quiet = m.reg.builders.evening(ctxFor(fullDay({ doneCount: 0, done: [], subtasksDone: 0, meetingsHeld: 0, held: [], people: [], slipped: [] })));
  assert.equal(quiet[0].say, 'A quiet day on the list. Rest counts too.');
  assert.equal(quiet.find(x => x.id === 'outro').head, 'Rest well, Sam.');
});

test('people seen today and the nudge', () => {
  const m = load();
  const d = fullDay();
  d.people.push(person('p4', 'Lena', { meetings: [{ eventId: 'e7', date: DAY, start: '20:00' }] }));   // later tonight: not seen yet
  assert.deepEqual(m.sevPeopleMet(d).map(p => p.id), ['p1', 'p2']);
  const n = m.sevNudge(d, m.sevPeopleMet(d));
  assert.equal(n.p.id, 'p3'); assert.equal(n.kind, 'owe');
  const d2 = fullDay({ people: [person('p1', 'Priya', { meetings: [{ eventId: 'e1', date: DAY }] }), person('p5', 'Ana', { lastContact: { daysAgo: 35 } }), person('p6', 'Jo', { lastContact: { daysAgo: 4 } })] });
  const n2 = m.sevNudge(d2, m.sevPeopleMet(d2));
  assert.equal(n2.p.id, 'p5'); assert.match(n2.text, /5 weeks/);
  assert.equal(m.sevNudge(fullDay({ people: [] }), []), null);
});

test('done tiles: one per kind of work, at most four', () => {
  const m = load();
  const done = ['writing', 'writing', 'email', 'admin', 'coding', 'run', 'run'].map((type, i) => ({ id: 't' + i, title: 'Task ' + i, type }));
  const g = m.sevDoneGroups(done);
  assert.equal(g.length, 4);
  assert.deepEqual(g.slice(0, 2).map(x => [x.type, x.items.length]), [['writing', 2], ['run', 2]]);
  assert.equal(g[3].label, 'Everything else');
  assert.equal(g[0].badge[1], 'written');
  assert.equal(g.reduce((n, x) => n + x.items.length, 0), 7);
});

test("the reflection: Claude's first two sentences with their offsets, or one written from the day", () => {
  const m = load();
  const ai = { source: 'ai', sentences: [{ text: 'A steady day.', entities: [] }, { text: 'Priya made it better.', entities: [{ type: 'person', ref: 'p1', text: 'Priya', start: 0, end: 5 }] }] };
  const r = m.sevReflection(ctxFor(fullDay(), ai), []);
  assert.equal(r.text, 'A steady day. Priya made it better.');
  assert.equal(r.text.slice(r.entities[0].start, r.entities[0].end), 'Priya');
  const d = fullDay();
  const own = m.sevReflection(ctxFor(d), m.sevPeopleMet(d));
  assert.equal(own.text, 'A steady day: you finished pricing page, and still made time for Priya and Tom.');
  assert.deepEqual(own.entities.map(e => e.type + ':' + e.ref), ['task:t1', 'person:p1', 'person:p2']);
});

test("the reflection skips Claude's inventory sentences (two or more tasks, or too long) for a real reflection", () => {
  const m = load();
  const T = (ref, text, start) => ({ type: 'task', ref, text, start, end: start + text.length });
  const list = { text: 'You completed four tasks: Alpha, Beta and Gamma.', entities: [T('t1', 'Alpha', 26), T('t2', 'Beta', 33)] };
  const good = { text: 'A calm day with real progress.', entities: [] };
  const plan = { text: 'Tomorrow begins with lunch at noon.', entities: [] };
  const r = m.sevReflection(ctxFor(fullDay(), { source: 'ai', sentences: [list, plan, good] }), []);
  assert.equal(r.text, 'A calm day with real progress.');
  // Nothing usable from Claude: the day's own line.
  const d = fullDay();
  const own = m.sevReflection(ctxFor(d, { source: 'ai', sentences: [list] }), m.sevPeopleMet(d));
  assert.match(own.text, /^A steady day: you finished pricing page/);
});

test('slipped tasks move through the actions layer: plan, reschedule (with the reason), drop, reopen', () => {
  const m = load();
  const due = { id: 'a', field: 'due' }, planned = { id: 'b', field: 'planned' };
  assert.deepEqual(m.sevMoveOps(due, 'tomorrow', '2026-10-06', null, 'Too big'), [{ op: 'task.reschedule', id: 'a', dueDate: '2026-10-06', reason: 'Too big' }]);
  assert.deepEqual(m.sevMoveOps(due, 'week', '2026-10-12', { target: 'tomorrow' }), [{ op: 'task.reschedule', id: 'a', dueDate: '2026-10-12', reason: 'Rolled over at the end of the day' }]);
  assert.deepEqual(m.sevMoveOps(planned, 'tomorrow', '2026-10-06', null), [{ op: 'task.plan', id: 'b', date: '2026-10-06' }], 'a plan moves; the deadline stays');
  assert.deepEqual(m.sevMoveOps(planned, 'drop', null, null, 'Not important'), [{ op: 'task.wont_do', id: 'b', reason: 'Not important' }]);
  assert.deepEqual(m.sevMoveOps(planned, 'drop', null, { target: 'drop' }), [], 'dropping twice is a no-op');
  assert.deepEqual(m.sevMoveOps(planned, 'tomorrow', '2026-10-06', { target: 'drop' }), [{ op: 'task.reopen', id: 'b' }, { op: 'task.plan', id: 'b', date: '2026-10-06' }], 'from Drop back to a day reopens first');
  assert.deepEqual(m.sevMoveOps(due, 'tomorrow', 'soon', null), [], 'never a bad date');
  // Undo through the toast or the beat's button: the rows go back to what they were.
  m._sevSession(DAY);
  m._sev.moved.set('a', { target: 'week', date: '2026-10-12' }); m._sev.moved.set('b', { target: 'tomorrow', date: '2026-10-06' });
  const entry = { prev: new Map([['a', { target: 'tomorrow', date: '2026-10-06' }], ['b', null]]), token: 'tok' };
  m._sev.undo.push(entry);
  let painted = 0;
  m._sevForget(entry, () => painted++);
  assert.deepEqual(m._sev.moved.get('a'), { target: 'tomorrow', date: '2026-10-06' });
  assert.equal(m._sev.moved.has('b'), false);
  assert.equal(m._sev.undo.length, 0); assert.equal(painted, 1);
  m._sevSession('2026-10-06');
  assert.equal(m._sev.moved.size, 0, 'a new day starts a new session');
});

test('tomorrow\'s top 3: planned for tomorrow and first in Focus, as actions-layer ops', () => {
  const items = { a: { id: 'a' }, b: { id: 'b' }, c: { id: 'c' }, gone: null };
  const m = load({ getItem: (id) => items[id] || null, statusOf: (id) => (id === 'c' ? 'done' : 'todo') });
  m.g.homeState = () => ({ focusOrder: ['x', 'a'] });
  const ops = m.sevTop3Ops(['a', 'b', 'c', 'gone'], '2026-10-06');
  assert.deepEqual(ops.slice(0, 2), [{ op: 'task.plan', id: 'a', date: '2026-10-06' }, { op: 'task.plan', id: 'b', date: '2026-10-06' }]);
  assert.equal(ops[2].op, 'home.set_focus');
  assert.deepEqual(ops[2].order.slice(0, 2), ['a', 'b']);
  assert.deepEqual(m.sevTop3Ops(['c'], '2026-10-06'), [], 'nothing open: nothing to do');
});

test('engine hook: a beat that stops auto-advance while waiting to leave stays on screen', () => {
  const m = load();
  let t = 0, seq = 0; const q = new Map();
  const timers = { set(fn, ms) { const id = ++seq; q.set(id, { fn, at: t + Math.max(0, ms || 0), id }); return id; }, clear(id) { q.delete(id); } };
  const advance = (ms) => { const end = t + ms; for (;;) { let n = null; for (const x of q.values()) if (x.at <= end && (!n || x.at < n.at || (x.at === n.at && x.id < n.id))) n = x; if (!n) break; q.delete(n.id); t = n.at; n.fn(); } t = end; };
  const narrator = m.storyCreateNarrator({ timers, now: () => t });
  const beats = [{ id: 'a', say: 'Two things slipped today.', after: 2000 }, { id: 'b', say: '', hold: 1000 }];
  const seen = [];
  const tl = m.storyCreateTimeline({ beats, narrator, timers, now: () => t, muted: true, hooks: { onBeat: (i) => seen.push(i) } });
  tl.play();
  advance(3000);                                   // read out and held: the exit waits out `after`
  assert.equal(tl.index, 0);
  beats[0].auto = false;                           // the user starts typing
  advance(6000);
  assert.equal(tl.index, 0, 'still on the interactive beat');
  tl.next();
  assert.equal(tl.index, 1);
  assert.deepEqual(seen, [0, 1]);
});
