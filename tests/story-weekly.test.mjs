// Weekly story (src/app/79-story-weekly-model.js, loaded as the page loads it, and
// src/app/79-story-weekly.js with page stubs): the week model (numbers, wins, stream
// progress, people, slipped and why, next week against capacity, outcome ideas, the
// guided-review steps), the beats (stable ids, dropped when empty, order by week type),
// outcomes into the guided-review draft, escaping in the renderers and the entry points.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = readFileSync(join(ROOT, 'src', 'app', '79-story-weekly-model.js'), 'utf8');
const NAMES = ['stwWeekModel', 'stwBuildBeats', 'stwSyncOutcomes', 'stwWeekNo', 'stwShortTitle', 'stwHoursSay', 'stwFixFor', 'stwNextWords', 'stwSceneOr', 'STW_CAP_MIN'];
const W = new Function(`"use strict";\n${MODEL}\nreturn { ${NAMES.join(', ')} };`)();

/* ---------- a week of fake data (Mon 28 Sep - Sun 4 Oct 2026, today Saturday) ---------- */
const DAY = (iso, h = 10) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), h);
const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);
const PEOPLE = {
  sam: { id: 'sam', name: 'Sam Taylor', first: 'Sam', color: 'pink' },
  alex: { id: 'alex', name: 'Dr Alex Jones', first: 'Alex', color: 'teal' },
  jo: { id: 'jo', name: 'Jo Smith', first: 'Jo', color: 'amber' },
};
function data(over) {
  return Object.assign({
    kind: 'week', date: '2026-10-03', now: '11:00', weekday: 'Saturday',
    range: { from: '2026-09-28', to: '2026-10-04', nextFrom: '2026-10-05', nextTo: '2026-10-11' },
    completed: 6, byDay: { '2026-09-28': 2, '2026-09-30': 3, '2026-10-02': 1 },
    perStream: [{ stream: 'thesis', n: 4, label: 'Thesis' }],
    wins: [
      { id: 't1', title: 'Write the methods section: draft and figures', priority: 'p2', stream: 'Thesis', type: 'writing', subtasks: { done: 3, total: 3 }, people: ['alex'] },
      { id: 't2', title: 'Submit the grant report', priority: 'p1', stream: 'Grants', type: 'deadline', subtasks: { done: 0, total: 0 }, people: [] },
      { id: 't3', title: 'Tidy desk', priority: null, stream: null, type: 'task', subtasks: {}, people: [] },
    ],
    slippedWeek: [
      { id: 's1', title: 'Chapter 6 intro', from: '2026-09-29', to: '2026-10-06', reason: 'Too big', moves: 3 },
      { id: 's2', title: 'Figure 4', from: '2026-09-30', to: '2026-10-02', reason: 'Blocked by data', moves: 1 },
      { id: 's3', title: 'Old idea', from: '2026-09-30', to: '2026-10-02', reason: 'no reason given', moves: 1 },
    ],
    reasons: [{ reason: 'Too big', n: 3 }, { reason: 'Blocked by data', n: 2 }, { reason: 'no reason given', n: 1 }],
    events: [
      { id: 'e1', title: 'Supervision', date: '2026-09-29', start: '10:00', end: '11:30', startMin: 600, endMin: 690, minutes: 90, type: 'meeting', people: ['alex'] },
      { id: 'e2', title: 'Coffee', date: '2026-09-30', start: '15:00', end: '15:30', startMin: 900, endMin: 930, minutes: 30, type: 'coffee', people: ['sam', 'alex'] },
      { id: 'e3', title: 'Later today', date: '2026-10-03', start: '16:00', end: '17:00', startMin: 960, endMin: 1020, minutes: 60, type: 'meeting', people: ['jo'] },
      { id: 'e4', title: 'Holiday', date: '2026-10-01', allDay: true, minutes: 0, type: 'holiday', people: ['sam'] },
      { id: 'e5', title: 'Ghost', date: '2026-10-01', start: '09:00', end: '10:00', startMin: 540, endMin: 600, minutes: 60, type: 'meeting', people: ['nobody'] },
    ],
    next: { meetings: 3, capacity: [
      { date: '2026-10-05', weekday: 'Monday', booked: 120, planned: 0, tasks: 1, meetings: 1 },
      { date: '2026-10-06', weekday: 'Tuesday', booked: 30, planned: 0, tasks: 0, meetings: 0 },
      { date: '2026-10-07', weekday: 'Wednesday', booked: 240, planned: 300, tasks: 2, meetings: 2 },
      { date: '2026-10-08', weekday: 'Thursday', booked: 60, planned: 0, tasks: 0, meetings: 0 },
      { date: '2026-10-09', weekday: 'Friday', booked: 300, planned: 120, tasks: 1, meetings: 0 },
      { date: '2026-10-10', weekday: 'Saturday', booked: 0, planned: 0, tasks: 0, meetings: 0 },
      { date: '2026-10-11', weekday: 'Sunday', booked: 0, planned: 0, tasks: 0, meetings: 0 },
    ] },
    deadlines: [{ id: 'd1', title: 'Abstract due: conference', due: '2026-10-07', stream: 'Thesis' }],
    focus: [{ id: 'f1', title: 'Reviewer 2 answers', stream: 'Papers' }],
    waiting: [{ id: 'w1', title: 'Data from Jo', people: ['jo'] }],
    people: [
      { id: 'alex', first: 'Alex', name: 'Dr Alex Jones', meetings: [{ date: '2026-10-07', start: '10:00' }], counts: { owe: 2, waiting: 0, followUps: 0 }, lastContact: { daysAgo: 4 } },
      { id: 'jo', first: 'Jo', name: 'Jo Smith', meetings: [], counts: { owe: 0, waiting: 1, followUps: 0 }, lastContact: { daysAgo: 30 } },
    ],
    overdue: 2,
  }, over || {});
}
function env(over) {
  return Object.assign({
    tasks: [
      { id: 't1', title: 'Write the methods section', stream: 'thesis', done: true },
      { id: 't2', title: 'Submit the grant report', stream: 'grants', done: true },
      { id: 'x1', title: 'Old thesis task', stream: 'thesis', done: true },
      { id: 'x2', title: 'Open thesis task', stream: 'thesis', done: false },
      { id: 'x3', title: 'Open grants task', stream: 'grants', done: false },
      { id: 'a1', title: 'Archived stream task', stream: 'old', done: true },
      { id: 'a2', title: 'Archived stream task 2', stream: 'old', done: false },
      { id: 's1', title: 'Chapter 6 intro', stream: 'thesis', done: false },
      { id: 's2', title: 'Figure 4', stream: 'thesis', done: false },
      { id: 's3', title: 'Old idea', stream: 'thesis', done: true },
      { id: 'm1', title: 'Big Wednesday job', stream: 'thesis', done: false, due: '2026-10-07', estimate: 180 },
      { id: 'm2', title: 'Small Wednesday job', stream: 'thesis', done: false, due: '2026-10-07', estimate: 30 },
    ],
    completions: { t1: [DAY('2026-09-30')], t2: [DAY('2026-10-02')], x1: [DAY('2026-09-10')], a1: [DAY('2026-09-29')], z9: [DAY('2026-09-22'), DAY('2026-09-23')] },
    streams: { thesis: { label: 'Thesis', color: '#5b5bd6' }, grants: { label: 'Grants', color: '#12a594' }, papers: { label: 'Papers' }, old: { label: 'Old', archived: true } },
    person: (id) => PEOPLE[id] || null,
    peopleAll: [{ id: 'jo', createdAt: DAY('2026-09-29') }, { id: 'sam', createdAt: DAY('2026-01-01') }],
    dayOf, pending: 3, draft: { outcomes: {}, done: { inbox: true } },
  }, over || {});
}

test('helpers: week number, short titles, hours for speech, scene fallback', () => {
  assert.equal(W.stwWeekNo('2026-09-28'), 40);
  assert.equal(W.stwWeekNo('2027-01-01'), 53);
  assert.equal(W.stwShortTitle('Launch plan: budget, risks; sign-off'), 'Launch plan');
  assert.ok(W.stwShortTitle('x'.repeat(90), 40).length <= 41);
  assert.equal(W.stwHoursSay(630), 'ten and a half hours');
  assert.equal(W.stwHoursSay(60), 'an hour');
  assert.equal(W.stwHoursSay(0), '');
  assert.equal(W.stwSceneOr('task', 'review'), 'review');
  assert.equal(W.stwSceneOr('writing', 'review'), 'writing');
});

test('numbers: per-day bars, last week, only past timed events, people seen by time together', () => {
  const m = W.stwWeekModel(data(), env());
  const n = m.numbers;
  assert.deepEqual(n.byDay, [2, 0, 3, 0, 1, 0, 0]);
  assert.equal(n.done, 6);
  assert.equal(n.prev, 2);             // z9: two completions in the week before
  assert.equal(n.delta, 4);
  assert.equal(n.events, 3);           // e1, e2, e5 (e3 is later today, e4 is all day)
  assert.equal(n.minutes, 180);
  assert.equal(n.hours, 3);
  assert.deepEqual(n.people.map(p => p.id), ['alex', 'sam']);   // the unknown attendee is dropped
  assert.equal(n.daysSoFar, 6);
  assert.equal(n.activeDays, 3);
  assert.equal(m.weekNo, 40);
  assert.equal(m.label, '28 Sep – 4 Oct');
});

test('wins: a p1 deadline leads, steps and people describe them, weekday from the completion', () => {
  const m = W.stwWeekModel(data(), env());
  assert.equal(m.wins[0].id, 't2');
  assert.equal(m.wins[0].weekday, 'Friday');
  const t1 = m.wins.find(w => w.id === 't1');
  assert.equal(t1.title, 'Write the methods section');
  assert.equal(t1.desc, 'All 3 steps done');
  assert.equal(t1.weekday, 'Wednesday');
});

test('stream progress: share done before the week and gained in it; archived streams left out', () => {
  const m = W.stwWeekModel(data(), env());
  const ids = m.streams.map(x => x.id);
  assert.ok(!ids.includes('old'));
  const th = m.streams.find(x => x.id === 'thesis');
  // thesis: t1 x1 x2 s1 s2 s3 m1 m2 = 8 tasks, done t1 x1 s3 = 3, this week t1 = 1
  assert.equal(th.total, 8); assert.equal(th.done, 3); assert.equal(th.week, 1);
  assert.equal(th.before, 25); assert.equal(th.gain, 13); assert.equal(th.pct, 38);
  assert.equal(m.streams[0].id, 'grants');   // gained the biggest share (1 of 3)
});

test('slipped: totals from the reasons, a fix per reason, nothing to act on when done', () => {
  const m = W.stwWeekModel(data(), env());
  const S = m.slipped;
  assert.equal(S.total, 6);
  assert.equal(S.top.label, 'Too big');
  assert.equal(S.reasons.find(r => r.none).label, 'No reason given');
  const [a, b, c] = S.items;
  assert.equal(a.fix.act, 'move'); assert.match(a.fix.text, /first small step/);
  assert.equal(a.fix.to, '2026-10-06');            // the lightest weekday (Tuesday)
  assert.equal(b.fix.act, 'move'); assert.match(b.fix.text, /^Chase/);
  assert.equal(c.open, false); assert.equal(c.fix.act, null);
  // the evening story's reasons each get their own fix
  const slot = { date: '2026-10-06', weekday: 'Tuesday' };
  assert.equal(W.stwFixFor({ reason: 'Not important', moves: 1 }, true, slot).act, 'drop');
  assert.match(W.stwFixFor({ reason: 'No time', moves: 1 }, true, slot).text, /fixed day: Tuesday/);
  assert.match(W.stwFixFor({ reason: 'Too big', moves: 1 }, true, slot).text, /first small step on Tuesday/);
  assert.match(W.stwFixFor({ reason: 'Blocked', moves: 1 }, true, slot).text, /^Chase/);
  assert.equal(W.stwFixFor({ reason: 'No time', moves: 1 }, true, slot).label, 'Plan Tue');
});

test('next week: over capacity, a rebalance hint for the biggest estimated task', () => {
  const m = W.stwWeekModel(data(), env());
  const N = m.next;
  assert.deepEqual(N.over.map(c => c.weekday), ['Wednesday']);
  assert.equal(N.over[0].over, 60);
  assert.deepEqual(N.heavy.map(c => c.weekday), ['Wednesday', 'Friday']);
  assert.equal(N.hint.taskId, 'm1');
  assert.equal(N.hint.to, '2026-10-06');
  assert.equal(N.days.find(c => c.date === '2026-10-07').deadline.id, 'd1');
  assert.equal(W.stwNextWords(N).title, 'Wednesday is over capacity');
  // without estimates there is nothing to move
  const m2 = W.stwWeekModel(data(), env({ tasks: env().tasks.map(t => Object.assign({}, t, { estimate: 0 })) }));
  assert.equal(m2.next.hint, null);
});

test('people: constellation by time together, a faded one who is owed, next week reasons', () => {
  const m = W.stwWeekModel(data(), env());
  const P = m.people;
  assert.equal(P.top.id, 'alex');
  assert.deepEqual(P.nodes.filter(n => !n.faded).map(n => n.id), ['alex', 'sam']);
  const jo = P.nodes.find(n => n.id === 'jo');
  assert.ok(jo && jo.faded);
  assert.equal(jo.meta, 'You are waiting on them');
  assert.equal(P.reach[0].p.id, 'alex');
  assert.equal(P.reach[0].say, 'You see Alex on Wednesday at 10:00.');
  assert.deepEqual(P.thanks.map(x => x.p.id), ['alex']);
  assert.deepEqual(P.fresh.map(x => x.p.id), ['jo']);
});

test('outcomes and guided steps: ideas from deadlines, focus and waiting; first open step', () => {
  const m = W.stwWeekModel(data(), env());
  assert.deepEqual(m.outcomes.suggestions.map(s => s.text), ['Abstract due', 'Reviewer 2 answers', 'Hear back from Jo']);
  assert.equal(m.outcomes.suggestions[0].area, 'Thesis');
  assert.equal(m.outcomes.defArea, 'Thesis');
  assert.equal(m.guided.first, 1);
  assert.equal(m.guided.steps[0].done, true);
  assert.equal(m.guided.steps[1].v, '2 overdue');
  assert.equal(m.guided.minutes, 10);
});

test('beats: stable ids, empty beats dropped, AI sentences capped at three, the hand-off waits', () => {
  const script = { sentences: [{ text: 'One.', entities: [] }, { text: 'Two.', entities: [] }, { text: 'Three.', entities: [] }, { text: 'Four.', entities: [] }], closing: 'Rest well.' };
  const m = W.stwWeekModel(data(), env());
  const beats = W.stwBuildBeats(m, script, {});
  const ids = beats.map(b => b.id);
  // more slipped than half of what got done: the slips come early; a heavy next week looks ahead before the wins
  assert.equal(m.type.key, 'slippy'); assert.equal(m.type.heavyNext, true); assert.equal(m.type.mood, 'focused');
  assert.deepEqual(ids, ['numbers', 's0', 's1', 's2', 'slipped', 'next', 'wins', 'streams', 'people', 'outcomes', 'guided']);
  const g = beats.at(-1);
  assert.equal(g.auto, false); assert.equal(g._auto0, false);
  assert.match(g.say, /^Rest well\. Ready for the guided review\?/);
  assert.ok(beats.every(b => b.bg && b.bg.tod === 'day' && b.className.includes('stw-b-' + b.id)));
  assert.match(beats[0].say, /^Week 40: 6 tasks done, three hours in meetings and events and 2 people seen\.$/);
  // a quiet week with nothing slipped, no wins and no streams
  const q = W.stwWeekModel(data({ completed: 0, byDay: {}, wins: [], slippedWeek: [], reasons: [], events: [], people: [], next: { capacity: [] } }), env({ tasks: [], completions: {} }));
  const qi = W.stwBuildBeats(q, {}, {}).map(b => b.id);
  assert.deepEqual(qi, ['numbers', 'outcomes', 'guided']);
  assert.equal(q.type.key, 'quiet'); assert.equal(q.type.pace > 1, true);
});

test('beats: a big week leads with its wins and celebrates', () => {
  const m = W.stwWeekModel(data({ completed: 22, next: { capacity: [] } }), env());
  assert.equal(m.type.key, 'big');
  assert.equal(m.type.mood, 'celebratory');
  const ids = W.stwBuildBeats(m, { sentences: [{ text: 'A.', entities: [] }] }, {}).map(b => b.id);
  assert.deepEqual(ids.slice(0, 3), ['numbers', 'wins', 's0']);
});

test('outcomes go into the guided-review draft, one free slot per area, never doubled', () => {
  const d = { outcomes: { Thesis: ['Existing', '', ''] } };
  W.stwSyncOutcomes(d, [{ text: 'Chapter 6 sent', area: 'Thesis' }, { text: 'Reply to Jo', area: 'Papers' }, { text: '', area: 'Thesis' }]);
  assert.deepEqual(d.outcomes.Thesis, ['Existing', 'Chapter 6 sent', '']);
  assert.deepEqual(d.outcomes.Papers, ['Reply to Jo', '', '']);
  // edited and moved to another area: the old entry is replaced, not kept
  W.stwSyncOutcomes(d, [{ text: 'Chapter 6 drafted', area: 'Thesis' }, { text: 'Reply to Jo', area: 'Grants' }]);
  assert.deepEqual(d.outcomes.Thesis, ['Existing', 'Chapter 6 drafted', '']);
  assert.deepEqual(d.outcomes.Papers, ['', '', '']);
  assert.deepEqual(d.outcomes.Grants, ['Reply to Jo', '', '']);
  W.stwSyncOutcomes(d, [{ text: 'Chapter 6 drafted', area: 'Thesis' }, { text: 'Reply to Jo', area: 'Grants' }]);
  assert.deepEqual(d.outcomes.Thesis, ['Existing', 'Chapter 6 drafted', '']);
  // the slots open with what is already named in the guided review
  const m = W.stwWeekModel(data(), env({ draft: { outcomes: { Thesis: ['A', '', 'B'], Papers: ['C', 'D'] }, done: {} } }));
  assert.deepEqual(m.outcomes.slots.map(s => s.text + '@' + s.area), ['A@Thesis', 'B@Thesis', 'C@Papers']);
});

/* ---------- the page file, with stubs ---------- */
function loadPage(extra) {
  const PAGE = readFileSync(join(ROOT, 'src', 'app', '79-story-weekly.js'), 'utf8');
  const reg = { builders: {}, types: {} };
  const ls = new Map();
  const stubs = Object.assign({
    storyRegisterBuilder: (k, f) => { reg.builders[k] = f; },
    storyRegisterBeatType: (k, f) => { reg.types[k] = f; },
    esc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    escAttr: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    safeColor: (c, fb) => (/^#[0-9a-f]{3,8}$/i.test(String(c)) ? c : fb),
    icon: (n) => `<svg data-i="${n}"></svg>`,
    animSceneHtml: (t) => `<span class="anim-scene" data-t="${t}"></span>`,
    STORY_KIT: { avatarHtml: (p) => `<span class="avatar">${String(p.name).replace(/</g, '&lt;')}</span>`, countUp() {}, sceneHtml: (t) => `<span class="anim-scene" data-t="${t}"></span>` },
    todayStrSafe: () => '2026-10-03',
    localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)) },
    window: { innerWidth: 1440, innerHeight: 900 },
    document: { querySelector: () => null, querySelectorAll: () => [] },
  }, extra || {});
  const keys = Object.keys(stubs);
  const api = new Function(...keys, `"use strict";\n${MODEL}\n${PAGE}\nreturn { storyWeekOnEnter, storyWeekPrefs, storyWeekFromPrompt, stwWeekModel, stwBuildBeats };`)(...keys.map(k => stubs[k]));
  return { api, reg, ls };
}
const fakeFrame = () => { const el = () => ({ innerHTML: '', querySelector: () => null, querySelectorAll: () => [], appendChild() {}, style: { setProperty() {} } }); return { scene: el(), type: el(), cards: el(), root: {} }; };

test('page: the week builder and every beat type are registered', () => {
  const { reg } = loadPage();
  assert.equal(typeof reg.builders.week, 'function');
  for (const t of ['stw-numbers', 'stw-sentence', 'stw-wins', 'stw-streams', 'stw-people', 'stw-slipped', 'stw-next', 'stw-outcomes', 'stw-guided']) assert.equal(typeof reg.types[t], 'function', t);
});

test('page: titles, names and stream labels are escaped in the renderers', () => {
  const { api, reg } = loadPage();
  const bad = '<img src=x onerror=alert(1)>';
  const d = data({ wins: [{ id: 't1', title: bad, priority: 'p1', stream: bad, type: 'task', subtasks: {}, people: ['evil'] }] });
  const e = env({ person: (id) => (id === 'evil' ? { id, name: bad, first: bad } : PEOPLE[id] || null), streams: { thesis: { label: bad, color: 'red;background:url(x)' }, grants: { label: 'Grants' } } });
  const m = api.stwWeekModel(d, e);
  const beats = api.stwBuildBeats(m, {}, {});
  const ctx = { reduced: true, person: () => null, event: () => null, task: () => null };
  for (const id of ['numbers', 'wins', 'streams', 'people']) {
    const b = beats.find(x => x.id === id); assert.ok(b, id);
    const f = fakeFrame();
    reg.types[b.type](f, b, ctx);
    const html = f.cards.innerHTML;
    assert.ok(html.length > 50, id);
    assert.ok(!html.includes('<img'), id + ' leaks markup');
    assert.ok(!html.includes('url(x)'), id + ' leaks a colour');
  }
});

test('entry: the first visit to Home > Week each week opens the story once; "page" never does', async () => {
  const opened = [];
  const base = { storyOpen: (k, o) => opened.push([k, o]), storyIsOpen: () => false, _wkRange: () => ({ from: '2026-09-28' }), state: { view: 'home:week', reviews: [] }, setTimeout: (f) => f() };
  const p1 = loadPage(Object.assign({ APP_CONFIG: { brief: { story: {} } } }, base));
  p1.api.storyWeekOnEnter(); p1.api.storyWeekOnEnter();
  assert.deepEqual(opened, [['week', { autoplay: false }]]);
  const p2 = loadPage(Object.assign({ APP_CONFIG: { brief: { story: { weekOpen: 'page' } } } }, base));
  p2.api.storyWeekOnEnter();
  assert.equal(opened.length, 1);
  assert.equal(p2.api.storyWeekPrefs().weekOpen, 'page');
  // already saved this week: no story
  const p3 = loadPage(Object.assign({ APP_CONFIG: {} }, base, { state: { view: 'home:week', reviews: [{ kind: 'week', date: '2026-09-28' }] } }));
  p3.api.storyWeekOnEnter();
  assert.equal(opened.length, 1);
  // the weekly prompt: plays at once over the Week page
  const views = [];
  const p4 = loadPage(Object.assign({ APP_CONFIG: {}, setView: (v) => views.push(v) }, base, { state: { view: 'home', reviews: [] } }));
  p4.api.storyWeekFromPrompt();
  assert.deepEqual(opened.at(-1), ['week', { autoplay: true }]);
  assert.deepEqual(views, ['home:week']);
});
