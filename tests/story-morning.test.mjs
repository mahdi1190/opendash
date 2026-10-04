// Morning story (src/app/79-story-morning-logic.js, loaded as the page loads it):
// the kind of day and the beat order, narration, the timeline lanes, people and
// why they matter, focus, deadlines + countdowns + money, ideas, weather chips;
// plus structural checks on the renderer (79-story-morning.js) and its styles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = ['smNum', 'smShort', 'smSayTitle', 'smHourText', 'smDur', 'smDurSay', 'smDueText', 'smAgo', 'smDayKind', 'smOrder', 'smPalette', 'SM_PACE',
  'smRainFrom', 'smWeatherSay', 'smHours', 'smWeatherEntities', 'smTimeline', 'smLanes', 'smTimelineSay', 'smPeople', 'smPeopleSay', 'smPeopleTitle',
  'smFocus', 'smFocusSay', 'smAhead', 'smAheadSay', 'smMoney', 'smIdeas', 'smIdeasSay', 'smGreeting', 'smFacts', 'smBuildMorning', 'SM_TL'];
const src = readFileSync(join(ROOT, 'src', 'app', '79-story-morning-logic.js'), 'utf8');
const M = new Function(`"use strict";\n${src}\nreturn { ${NAMES.join(', ')} };`)();
const UI = readFileSync(join(ROOT, 'src', 'app', '79-story-morning.js'), 'utf8');
const CSS = readFileSync(join(ROOT, 'src', 'styles', '79-story-morning.css'), 'utf8');

/* ---------- a fake day (invented names) ---------- */
const TODAY = '2026-10-05';
const add = (n) => { const d = new Date(TODAY + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mn = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
const ev = (id, title, start, end, type, people = [], extra = {}) => ({ id, title, date: TODAY, allDay: false, start, end, startMin: mn(start), endMin: mn(end), minutes: mn(end) - mn(start), type, people, ...extra });
const person = (id, name, extra = {}) => ({ id, name, first: name.split(' ')[0], role: 'Colleague', kind: 'person', color: 'teal', meetings: [], celebration: null, owe: [], waiting: [], followUps: [], focus: [], counts: { owe: 0, waiting: 0, followUps: 0 }, lastContact: null, ...extra });
function day(over = {}) {
  const A = person('pa', 'Ada Byrne', { meetings: [{ eventId: 'e1', title: 'Coffee with Ada', date: TODAY, start: '10:30', end: '11:15' }], lastContact: { date: add(-21), via: 'meeting', daysAgo: 21 } });
  const R = person('pr', 'Remy Stone', { followUps: [{ id: 't-r', title: 'Reply to Remy about the data link', due: add(-1) }], owe: [{ id: 't-r', title: 'Reply to Remy about the data link', due: add(-1) }], counts: { owe: 1, waiting: 0, followUps: 1 }, lastContact: { date: add(-6), via: 'email', daysAgo: 6 } });
  return {
    kind: 'morning', date: TODAY, weekday: 'Monday', now: '09:48', userName: 'Kit Doe', part: 'morning', tod: 'morning',
    weather: { ok: true, place: 'Townsville', cond: 'partly', label: 'Partly cloudy', temp: 12.4, isDay: true, hi: 15, lo: 9, rainChance: 80,
      next: [{ time: '10:00', cond: 'partly', temp: 12, rain: 0 }, { time: '14:00', cond: 'partly', temp: 14, rain: 30 }, { time: '15:00', cond: 'showers', temp: 14, rain: 70 }] },
    money: { currency: 'GBP', yesterday: { total: 42.1, count: 3, text: '£42.10' }, month: { label: 'October 2026', toDate: 158, lastMonthSameDay: 190, budget: 900, monthPct: 10, text: '£158', budgetText: '£900' }, week: null, staleDays: 0 },
    countdowns: [{ id: 'cd:sub', label: 'Submission', date: add(74), daysLeft: 74 }],
    dayType: { type: 'meetings', tagline: 'A people day.', flags: {}, counts: {} },
    headline: { kind: 'event', id: 'e1', title: 'Coffee with Ada', type: 'coffee' },
    events: [ev('e1', 'Coffee with Ada', '10:30', '11:15', 'coffee', ['pa'], { location: 'Café Nord' }), ev('e2', 'Paper review: round two', '13:00', '14:00', 'video-call')],
    gaps: [{ start: '14:00', end: '16:00', minutes: 120, text: '2 hours' }, { start: '11:15', end: '13:00', minutes: 105, text: '1 h 45 min' }],
    tasks: { dueToday: 1, overdue: 0, p1Today: 1 },
    focus: [{ id: 'f1', title: 'Chapter 5 corrections: the long list for the examiners', due: add(3), stream: 'Thesis', type: 'writing', subtasks: { done: 3, total: 7, next: ['Rewrite 5.4', 'Add refs'] } }],
    deadlines: [{ id: 'd1', title: 'Council tax payment for the', due: add(2), daysLeft: 2, stream: 'Admin', type: 'finance', weekday: 'Wednesday', subtasks: { done: 0, total: 0 } }],
    people: [A, R],
    suggestions: [{ kind: 'gap', text: 'Use the free 2 hours from 14:00 for Chapter 5 corrections.', refs: [{ type: 'time', ref: '14:00' }, { type: 'task', ref: 'f1' }] },
      { kind: 'follow-up', text: 'Follow up with Remy about Reply to Remy about the data link.', refs: [{ type: 'person', ref: 'pr' }, { type: 'task', ref: 't-r' }] }],
    ...over,
  };
}
const script = (n = 3) => ({ headline: 'Good morning, Kit', closing: 'Have a good Monday.', palette: null,
  sentences: [{ text: 'Coffee with Ada at 10:30, then the paper review.', entities: [{ type: 'person', ref: 'pa', text: 'Ada', start: 12, end: 15 }, { type: 'time', ref: '10:30', text: '10:30', start: 19, end: 24 }] },
    { text: 'Your clearest stretch is 14:00 to 16:00.', entities: [] }, { text: 'Showers from 3 pm, so take an umbrella.', entities: [] }, { text: 'A fourth line.', entities: [] }, { text: 'A fifth line.', entities: [] }].slice(0, n) });

test('words, titles and times', () => {
  assert.equal(M.smNum(3), 'three'); assert.equal(M.smNum(12), '12');
  assert.equal(M.smShort('Launch plan: budget, risks; sign-off'), 'Launch plan');
  assert.equal(M.smSayTitle('Council tax payment for the'), 'Council tax payment');
  assert.ok(!M.smSayTitle('a'.repeat(30) + ' ' + 'b'.repeat(30)).includes('…'), 'narration never reads an ellipsis');
  assert.equal(M.smHourText('15:00'), '3 pm'); assert.equal(M.smHourText('12:00'), 'noon'); assert.equal(M.smHourText('09:30'), '9:30 am');
  assert.equal(M.smDur(150), '2 h 30'); assert.equal(M.smDurSay(90), 'an hour and a half'); assert.equal(M.smDurSay(120), 'two hours');
  assert.equal(M.smDueText(add(1), TODAY), 'tomorrow'); assert.equal(M.smDueText(add(2), TODAY), 'Wednesday'); assert.equal(M.smDueText(add(-3), TODAY), '3 days late');
  assert.equal(M.smAgo(21), '3 weeks ago'); assert.equal(M.smAgo(1), 'yesterday');
});

test('the kind of day sets the order, palette and pace', () => {
  assert.equal(M.smDayKind(day()), 'meetings');
  assert.equal(M.smDayKind(day({ dayType: { type: 'deadline', flags: { birthday: true } } })), 'deadline', 'a deadline outranks a party');
  assert.equal(M.smDayKind(day({ dayType: { type: 'normal', flags: {} }, events: [{ id: 'b', title: 'Birthday', date: TODAY, allDay: true, type: 'birthday' }] })), 'celebrate');
  assert.equal(M.smDayKind(day({ dayType: { type: 'weekend', flags: {} } })), 'gentle');
  const o = M.smOrder('meetings');
  assert.ok(o.indexOf('schedule') < o.indexOf('say'), 'a meeting day leads with the timeline');
  assert.equal(M.smOrder('deadline')[1], 'ahead', 'a deadline day leads with the countdown');
  assert.ok(!M.smOrder('gentle').includes('focus'), 'a gentle day skips the focus three');
  for (const k of ['deadline', 'celebrate', 'meetings', 'gentle', 'normal']) assert.equal(M.smOrder(k).at(-1), 'close');
  assert.equal(M.smPalette('deadline'), 'ember'); assert.equal(M.smPalette('celebrate'), 'sunset');
  assert.ok(M.SM_PACE.gentle.after > M.SM_PACE.meetings.after, 'gentle days move slower');
});

test('the whole story: stable ids, narration, content-aware beats', () => {
  const beats = M.smBuildMorning(day(), script(), { nowMin: mn('09:48') });
  const ids = beats.map(b => b.id);
  assert.deepEqual(ids, ['intro', 'schedule', 's0', 's1', 's2', 'people', 'focus', 'ahead', 'close']);
  assert.equal(new Set(ids).size, ids.length);
  for (const b of beats) { assert.equal(typeof b.say, 'string'); assert.ok(b.say.length > 0, b.id + ' has narration'); assert.match(b.type, /^m-/); }
  for (const b of beats.filter(x => x.type === 'm-say')) assert.equal(b.say, b.text, 'the big sentence is the caption');
  assert.equal(beats.at(-1).auto, false, "Let's go waits for a click");
  assert.match(beats[0].say, /^Good morning, Kit\. It's 12 degrees and partly cloudy, with showers from 3 pm\.$/);
  assert.equal(beats[3].m.prev.length, 1, 'later sentences carry the trail of earlier ones');
  // At most four sentences, however many the script has.
  assert.equal(M.smBuildMorning(day(), script(5), {}).filter(b => b.type === 'm-say').length, 4);
  // A new user: no calendar, people, tasks, weather or money -> greeting, sentences, Let's go.
  const empty = M.smBuildMorning({ kind: 'morning', date: TODAY, part: 'morning', userName: '', dayType: { type: 'normal' } }, { ...script(1), headline: null }, {});
  assert.deepEqual(empty.map(b => b.id), ['intro', 's0', 'close']);
  assert.equal(empty[0].say, 'Good morning.');
  // A gentle weekend keeps only what is close.
  const gentle = M.smBuildMorning(day({ dayType: { type: 'weekend', flags: {} }, deadlines: [] }), script(), {});
  assert.ok(!gentle.some(b => b.id === 'ahead' || b.id === 'focus'));
});

test('the AI headline replaces the greeting only when it is one', () => {
  assert.equal(M.smGreeting(day(), { headline: 'Good morning, Kit' }).line, 'Good morning, Kit');
  const g = M.smGreeting(day(), { headline: 'Deadline day: chapter five' });
  assert.equal(g.line, 'Good morning, Kit'); assert.equal(g.lede, 'Deadline day: chapter five');
  assert.equal(M.smGreeting(day({ part: 'afternoon' }), {}).line, 'Good afternoon, Kit');
  const facts = M.smFacts(day()).map(f => f.text);
  assert.deepEqual(facts, ['2 events', '1 focus task', '2 people', '1 due this week']);
});

test('weather: rain timing, narration, the hourly strip and one weather chip per sentence', () => {
  const w = day().weather;
  assert.deepEqual(M.smRainFrom(w.next), { time: '15:00', hour: '3 pm', chance: 70, cond: 'showers', word: 'showers' });
  assert.equal(M.smRainFrom([{ time: '10:00', cond: 'clear', rain: 10 }]), null);
  assert.equal(M.smWeatherSay({ ok: true, temp: 3.6, label: 'Fog', next: [] }), "It's 4 degrees and fog.");
  const hrs = M.smHours(w, day().events.map(e => ({ ...e })), 13);
  assert.equal(hrs[0].label, 'Now'); assert.equal(hrs[0].ev[0], 'coffee', 'event dots land on their hour');
  const text = 'Showers from 3 pm, so take an umbrella to Ada.';
  const ents = M.smWeatherEntities(text, [{ type: 'person', ref: 'pa', start: 42, end: 45 }], 'showers');
  assert.equal(ents.length, 1); assert.deepEqual([ents[0].type, ents[0].ref, ents[0].text], ['weather', 'showers', 'Showers']);
  assert.equal(M.smWeatherEntities('Rain later.', [{ type: 'event', ref: 'x', start: 0, end: 4 }]).length, 0, 'never over an existing entity');
});

test('timeline: next, gaps and card lanes that never overlap', () => {
  const tl = M.smTimeline(day(), mn('09:48'));
  assert.equal(tl.events.length, 2); assert.equal(tl.next.id, 'e1'); assert.equal(tl.next.mins, 42); assert.equal(tl.next.on, false);
  assert.equal(tl.gaps.find(g => g.best).start, '14:00');
  assert.equal(tl.title, '2 events, 4 hours free', '3 h 45 of gaps, to the nearest half hour');
  assert.equal(M.smTimelineSay(tl, 'Coffee with Ada'), 'Two things on the calendar. Next up, Coffee with Ada, in 42 minutes.');
  assert.match(M.smTimelineSay(M.smTimeline(day(), mn('10:40')), 'Coffee'), /Coffee is on now\.$/);
  // Eight events in a narrow track: every placed card clears its lane neighbours; the rest are counted.
  const items = Array.from({ length: 8 }, (_, i) => ({ id: 'x' + i, anchor: 40 + i * 70 }));
  const lay = M.smLanes(items, 900);
  const W = M.SM_TL.cardW;
  for (const a of lay.cards) for (const b of lay.cards) if (a !== b && a.lane === b.lane) assert.ok(a.left + W <= b.left || b.left + W <= a.left, 'no overlap in a lane');
  assert.equal(lay.cards.length + lay.hidden.length, 8);
  for (const c of lay.cards) assert.ok(c.left >= 0 && c.left + W <= 900, 'cards stay on the track');
  assert.deepEqual(M.smLanes([{ id: 'a', anchor: 100 }, { id: 'b', anchor: 600 }], 900).lanes, { up: 1, dn: 0 }, 'far-apart cards share a lane');
});

test('people today: why each matters, best reason first', () => {
  const cards = M.smPeople(day(), { personNote: (id) => (id === 'pa' ? 'Ask about the poster session.' : '') });
  const ada = cards.find(c => c.id === 'pa'), remy = cards.find(c => c.id === 'pr');
  assert.equal(ada.meet.start, '10:30'); assert.equal(ada.meet.type, 'coffee'); assert.equal(ada.meet.where, 'Café Nord');
  assert.equal(ada.why, 'Ask about the poster session.', 'a note on the person is the reason when nothing is owed');
  assert.equal(ada.last, 'last met 3 weeks ago');
  assert.equal(remy.tag, 'Follow-up due'); assert.equal(remy.tone, 'owe'); assert.equal(remy.why, 'Reply to Remy about the data link (overdue).');
  assert.equal(remy.task.id, 't-r');
  const cel = M.smPeople(day({ people: [person('pm', 'Ines Marlow', { celebration: { date: TODAY, kind: 'birthday', title: 'Ines birthday' }, followUps: [{ id: 'z', title: 'Z' }] })] }));
  assert.equal(cel[0].tag, 'Birthday today', 'a birthday outranks a follow-up');
  assert.equal(M.smPeopleTitle(cards), 'One person to see, one waiting on you');
  assert.equal(M.smPeopleSay(cards), "You'll see Ada, and Remy is waiting on a follow-up.");
  const meetOnly = M.smPeople(day({ people: [day().people[0]] }), {});
  assert.match(meetOnly[0].why, /^It’s been 3 weeks since you last met/);
  // The card says "when you last met" once: in the reason, not again under the meeting.
  assert.equal(meetOnly[0].lastSaid, true);
  assert.equal(ada.lastSaid, false, 'a note is the reason, so the meeting line keeps "last met"');
});

test('focus: subtasks, the next one, meta and narration', () => {
  const info = () => ({ subtasks: [{ title: 'a', done: true }, { title: 'b', done: true }, { title: 'c', done: false }, { title: 'd', done: false }], estimate: 120, color: '#123456', folder: { id: 'r1', label: 'Thesis', kind: 'folder' } });
  const [c] = M.smFocus(day(), { itemInfo: info });
  assert.equal(c.short, 'Chapter 5 corrections'); assert.equal(c.done, 2); assert.equal(c.total, 4);
  assert.deepEqual(c.subs.map(s => [s.title, s.done, s.next]), [['a', true, false], ['b', true, false], ['c', false, true], ['d', false, false]]);
  assert.deepEqual(c.meta, ['Thesis', '~2 h', 'due Thursday', 'best at 14:00 (free)']);
  assert.equal(c.folder.id, 'r1');
  assert.equal(M.smFocusSay([c]), 'One thing matters today. Start with Chapter 5 corrections: two steps left.');
  // Without the page's state, the server's next steps are used.
  assert.deepEqual(M.smFocus(day())[0].subs.map(s => s.title), ['Rewrite 5.4', 'Add refs']);
});

test('deadlines, countdowns and money', () => {
  const ah = M.smAhead(day(), { countdowns: [{ id: 'x', label: 'Trip', date: add(150) }] });
  assert.equal(ah.hero.id, 'cd:sub', 'the nearest countdown is the hero');
  assert.equal(ah.hero.num, '74'); assert.equal(ah.hero.unit, 'days');
  assert.equal(ah.rest[0].id, 'd1'); assert.equal(ah.rest[0].urgent, true);
  assert.equal(ah.rest[1].unit, 'weeks');
  assert.equal(M.smAheadSay(ah), 'Submission is 74 days away. Council tax payment is due on Wednesday.');
  assert.equal(ah.money.big, '£158'); assert.equal(ah.money.amount, 158); assert.ok(Math.abs(ah.money.bar.pct - 158 / 900) < 1e-9);
  assert.deepEqual(ah.money.lines.map(l => l.k), ['Yesterday', 'Against last month']);
  assert.equal(ah.money.lines[1].v, '17% less');
  assert.equal(M.smMoney(null), null);
  const today = M.smAhead(day({ countdowns: [], deadlines: [{ id: 'd0', title: 'Hand in', due: TODAY, daysLeft: 0 }] }));
  assert.equal(today.hero.num, 'Today');
});

test('ideas and the last line', () => {
  const ideas = M.smIdeas(day());
  assert.deepEqual(ideas.map(x => x.kind), ['gap', 'follow-up', 'weather']);
  assert.equal(ideas[0].act.do, 'plan'); assert.equal(ideas[0].act.ref, 'f1');
  assert.equal(ideas[1].text, 'Reply to Remy about the data link.', 'no "follow up with Remy about Reply to Remy"');
  assert.equal(ideas[1].act.do, 'task');
  assert.equal(ideas[2].text, 'Showers from 3 pm: take an umbrella.');
  assert.equal(M.smIdeasSay(ideas, 'Have a good Monday.'), "You're free for two hours from 14:00. There's a follow-up for Remy. Have a good Monday.");
  assert.equal(M.smIdeasSay([], ''), "Let's go.");
});

test('the renderer registers every beat type the builder uses, escapes text and cleans up', () => {
  const types = new Set([...src.matchAll(/type: '(m-[a-z]+)'/g)].map(m => m[1]));
  assert.ok(types.size >= 7);
  for (const t of types) assert.ok(UI.includes(`storyRegisterBeatType('${t}'`), t + ' is registered');
  assert.ok(UI.includes("storyRegisterBuilder('morning'"));
  // The card beats light their cards as the narration names them (people, next event, focus, dates, ideas).
  for (const t of ['m-day', 'm-people', 'm-focus', 'm-ahead', 'm-go']) {
    const r = UI.split(`storyRegisterBeatType('${t}'`)[1];
    assert.ok(r.slice(0, r.indexOf('\n});')).includes('_smFollowSay(f, b, bag'), t + ' follows the narration');
  }
  // The sentence beats' hero follows the voice: ring progress and a glow in the named thing's colour.
  assert.ok(UI.includes('sm-hero-ring') && UI.includes("ring.style.setProperty('--sm-p'"));
  // Every beat renderer returns its cleanup (timers, observers, listeners).
  const renderers = UI.split("storyRegisterBeatType('").slice(1);
  for (const r of renderers) assert.match(r.slice(0, r.indexOf('\n});')), /return \(\) => bag\.done\(\);/);
  // No raw interpolation of data into markup without esc()/escAttr() for the text fields we show.
  for (const field of ['p.why', 'p.name', 'x.text', 'x.detail', 'c.short', 'x.label', 'tl.title', 'b.text']) {
    for (const m of UI.matchAll(new RegExp('\\$\\{' + field.replace('.', '\\.') + '\\}', 'g'))) assert.fail(`${field} interpolated without esc() at ${m.index}`);
  }
});

test('styles are scoped to the morning story and stay still under reduced motion', () => {
  const body = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = body.split('}').map(s => s.split('{')[0].trim()).filter(s => s && !s.startsWith('@') && !/^(from|to|\d+%)/.test(s) && !/^[\d%, ]+$/.test(s));
  for (const sel of rules) for (const one of sel.split(/,(?![^(]*\))/)) {
    const s = one.trim();
    if (!s || /^(from|to|\d+%)$/.test(s)) continue;
    assert.ok(s.startsWith('.story[data-kind="morning"]') || s.startsWith('html.anim-paused .story'), 'unscoped selector: ' + s);
  }
  assert.ok(/\.st-still \.sm-say \.st-ent \{ opacity: 1; transform: none; \}/.test(CSS), 'chips are fully visible when still');
  assert.ok(!/animation[^;]*(width|height|top|left)/.test(CSS), 'only transform/opacity are animated');
});
