// Brief + Review: the pure rules (src/app/73-brief-logic.js) and the animated
// scene library + classifier (src/app/71-anim-library.js), through
// lib/brief-logic.mjs exactly as the brief.get query uses them.
// Synthetic, generic titles only. Optional: BRIEF_REAL_TITLES=<json file outside
// the repo> with [{title, location?, link?, attendees?, allDay?, minutes?, expect}]
// checks the owner's real calendar titles without putting them in this file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as L from '../lib/brief-logic.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ev = (title, o = {}) => ({ kind: 'event', title, ...o });
const tk = (title, o = {}) => ({ kind: 'task', id: 't-' + title.length, title, ...o });

// ─── the registry ──────────────────────────────────────────────────────────
test('the scene registry has 40+ distinct, complete entries', () => {
  assert.ok(L.ANIM_SCENES.length >= 40, `only ${L.ANIM_SCENES.length} scenes`);
  const types = L.ANIM_SCENES.map(s => s.type);
  assert.equal(new Set(types).size, types.length, 'types are unique');
  const SW = ['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet', 'slate'];
  for (const s of L.ANIM_SCENES) {
    assert.match(s.type, /^[a-z][a-z-]+$/, s.type);
    assert.ok(s.label && typeof s.label === 'string', `${s.type} label`);
    assert.ok(Array.isArray(s.keywords), `${s.type} keywords`);
    assert.ok(SW.includes(s.colour), `${s.type} colour ${s.colour}`);
    assert.ok(['subtle', 'once'].includes(s.loop), `${s.type} loop`);
    assert.ok(L.ANIM_CATEGORIES[s.cat], `${s.type} category ${s.cat}`);
    assert.equal(typeof s.match, 'function');
    assert.equal(typeof s.svg, 'function');
  }
  for (const t of ['meeting', 'one-on-one', 'video-call', 'party', 'birthday', 'wedding', 'outing', 'flight', 'train', 'car', 'holiday', 'gym', 'run', 'sport',
    'dinner', 'coffee', 'drinks', 'health', 'dentist', 'haircut', 'shopping', 'cinema', 'concert', 'conference', 'lecture', 'lab', 'writing', 'coding', 'email',
    'call', 'interview', 'review', 'deadline', 'finance', 'admin', 'moving', 'driving', 'reading', 'rest', 'home', 'prayer', 'delivery', 'event', 'task']) {
    assert.ok(types.includes(t), `missing scene type ${t}`);
  }
  // a fallback for every category
  for (const [cat, type] of Object.entries(L.ANIM_CATEGORY_FALLBACK)) assert.ok(types.includes(type), `fallback for ${cat}`);
});

/** Tiny well-formedness check for the SVG strings (balanced tags, sane attributes). */
function wellFormed(svg) {
  const stack = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, close, name, , self] = m;
    if (self) continue;
    if (close) { const top = stack.pop(); if (top !== name) return `</${name}> closes <${top}>`; }
    else stack.push(name);
  }
  return stack.length ? `unclosed <${stack.join('><')}>` : null;
}
test('every registry entry renders a well-formed, safe SVG', () => {
  const css = readFileSync(join(ROOT, 'src', 'styles', '71-anim-library.css'), 'utf8');
  const motion = new Set();
  for (const s of L.ANIM_SCENES) {
    let svg;
    assert.doesNotThrow(() => { svg = L.animSceneSvg(s.type); }, s.type);
    assert.ok(svg.startsWith(`<svg class="as as-${s.type}"`), s.type);
    assert.equal(wellFormed(svg), null, `${s.type}: ${wellFormed(svg)}`);
    assert.ok(!/NaN|undefined|null|Infinity/.test(svg), `${s.type} has a bad number`);
    assert.ok(!/<script|on[a-z]+=|javascript:|href=/i.test(svg), `${s.type} must be inert markup`);
    assert.ok(svg.length < 6000, `${s.type} is ${svg.length} bytes`);
    assert.ok(/class="[^"]*\bx-/.test(svg), `${s.type} has no motion`);
    for (const m of svg.matchAll(/class="([^"]+)"/g)) for (const c of m[1].split(/\s+/)) if (c.startsWith('x-')) motion.add(c);
  }
  // every motion class names a keyframe in the stylesheet
  for (const c of motion) assert.ok(new RegExp(`\\.${c}\\s*\\{[^}]*--an:`).test(css), `no CSS for .${c}`);
  // and the stylesheet only animates transform / opacity
  for (const kf of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
    const props = [...kf[2].matchAll(/([a-z-]+)\s*:/g)].map(x => x[1]);
    for (const p of props) assert.ok(['transform', 'opacity'].includes(p), `@keyframes ${kf[1]} animates ${p}`);
  }
  assert.equal(L.animSceneSvg('no-such-type'), L.animSceneSvg('event'), 'unknown types fall back');
});

// ─── the classifier ────────────────────────────────────────────────────────
const CASES = [
  // meetings and calls
  [ev('Sam / Alex'), 'one-on-one'], [ev('Priya / Sam', { location: 'Microsoft Teams Meeting', attendees: 2 }), 'one-on-one'],
  [ev('1:1 with Jordan'), 'one-on-one'], [ev('Alex & Priya - catch up'), 'one-on-one'],
  [ev('Kit, Sam and Jo', { link: true, attendees: 3 }), 'meeting'], [ev('Weekly team meeting'), 'meeting'],
  [ev('Project sync', { link: true, attendees: 6 }), 'video-call'], [ev('Zoom with the supplier'), 'video-call'],
  [ev('Steering group', { attendees: 9 }), 'meeting'], [ev('Untitled', { link: true }), 'video-call'],
  [ev('Phone call with the bank'), 'call'], [tk('Call the landlord back'), 'call'],
  [ev('Job interview: Acme'), 'interview'], [ev('Assessment centre'), 'interview'],
  // celebrations and social
  [ev("Sam's birthday party"), 'birthday'], [ev('Jo Bday', { allDay: true }), 'birthday'], [ev('Granny 🎂', { allDay: true }), 'birthday'],
  [ev('Anything', { allDay: true, calendar: 'Birthdays' }), 'birthday'], [ev('Wedding: Sam and Alex', { allDay: true, days: 2 }), 'wedding'],
  [ev('Stag do', { allDay: true }), 'party'], [ev('Staff party'), 'party'], [ev('Graduation ceremony'), 'celebration'],
  [ev('Leaving drinks for Jo'), 'drinks'], [ev('Pub quiz', { start: 19 * 60 }), 'drinks'],
  [ev('Team dinner'), 'dinner'], [ev('Lunch with Priya'), 'dinner'], [ev('Coffee'), 'coffee'], [ev('Coffee with Alex'), 'coffee'],
  // travel and outings
  [ev('Flight to Lisbon'), 'flight'], [ev('✈️ XY123 – Leeds → Lisbon'), 'flight'], [ev('Train to York'), 'train'],
  [ev('Drive to Leeds'), 'car'], [ev('Annual leave', { allDay: true, days: 5 }), 'holiday'], [ev('Beach day'), 'holiday'],
  [ev('Hotel check-in'), 'travel'], [ev('Walk in the hills'), 'outing'], [ev('Picnic in the park'), 'outing'],
  [ev('Castle tour'), 'sightseeing'], [ev('Museum visit'), 'sightseeing'],
  // sport and health
  [ev('Gym'), 'gym'], [ev('Leg day'), 'gym'], [ev('Parkrun', { start: 9 * 60, weekday: 6 }), 'run'], [ev('Morning 5k run'), 'run'],
  [ev('5-a-side football'), 'sport'], [ev('Tennis'), 'sport'], [ev('Bowling'), 'bowling'],
  [ev('Dentist'), 'dentist'], [ev('🦷 Dental appointment'), 'dentist'], [ev('GP appointment'), 'health'],
  [ev('Appointment (in person)', { location: 'Example Medical Centre' }), 'health'], [ev('Physio'), 'health'],
  [ev('Haircut'), 'haircut'], [ev('Meditation'), 'rest'], [ev('Yoga'), 'rest'],
  // life and home
  [tk('Weekly shop at Tesco'), 'shopping'], [ev('Cinema: a new film'), 'cinema'], [ev('Concert at the arena'), 'concert'],
  [ev('Visit parents', { allDay: true }), 'home'], [ev('WFH', { allDay: true }), 'home'], [tk('Moving day: pack boxes'), 'moving'],
  [tk('Collect parcel from the post office'), 'delivery'], [ev('Friday prayers'), 'prayer'], [ev('Church'), 'prayer'],
  [ev('Vet'), 'pet'], [ev('Driving lesson'), 'driving'], [ev('Driving test'), 'driving'],
  // work
  [ev('Conference keynote'), 'conference'], [tk('Prepare poster presentation'), 'conference'], [ev('Lecture: Thermodynamics'), 'lecture'],
  [ev('Seminar series'), 'lecture'], [tk('Lab: PCR run'), 'lab'], [tk('Acid-base titration'), 'lab'],
  [tk('Write thesis chapter 3'), 'writing'], [tk('Draft paper introduction'), 'writing'], [tk('Fix login bug'), 'coding'], [tk('Deploy v2 of the app'), 'coding'],
  [tk('Reply to the email from the office'), 'email'], [tk('Peer review for the journal'), 'review'],
  [tk('Report submission deadline'), 'deadline'], [tk('Submit the final version'), 'deadline'],
  [tk('Pay council tax'), 'finance'], [tk('Payday'), 'finance'], [tk('Renew passport form'), 'admin'], [tk('Read chapter 4'), 'reading'],
  [ev('Brainstorm the roadmap'), 'idea'], [ev('Desk time and tasks', { minutes: 480 }), 'work'],
  // invites with an automatic Teams link: a room means in person; "Sam / Alex" stays a 1:1
  [ev('Fortnightly project meeting', { link: true, location: 'Room 3, Example House' }), 'meeting'],
  [ev('Fortnightly project meeting: Online', { link: true, location: 'Online' }), 'video-call'],
  [ev('Sam / Alex', { link: true, location: 'Microsoft Teams Meeting', attendees: 2 }), 'one-on-one'],
  [ev('Welcome Week - Department Induction', { link: true, location: 'Main Hall' }), 'lecture'],
  [ev('Flu jab', { link: true }), 'health'], [ev('Product Design Basics', { location: 'Lecture Theatre 1' }), 'event'],
  [ev('Time held for travel'), 'travel'], [ev('Vienna', { allDay: true }), 'travel'], [ev('Oxford visit', { allDay: true }), 'travel'], [ev('Sam in Oxford', { allDay: true }), 'event'],
  [ev('Train to Edinburgh Waverley'), 'train'], [ev('Kit OFF', { allDay: true }), 'holiday'], [ev('Monthly lab clean up'), 'lab'],
  [ev('Quarterly catch ups', { link: true, location: 'Room 4' }), 'one-on-one'], [ev('Village bake sale'), 'shopping'],
  // nothing to go on
  [ev('Q4'), 'event'], [tk('Thing'), 'task'],
];
test(`the classifier maps ${CASES.length} realistic titles to the right scene`, () => {
  assert.ok(CASES.length >= 60);
  const wrong = [];
  for (const [item, want] of CASES) {
    const r = L.animClassify(item);
    if (r.type !== want) wrong.push(`${item.title} -> ${r.type} (${r.source}, ${r.why}), want ${want}`);
  }
  assert.deepEqual(wrong, []);
});

test('the classifier: overrides, keyword rules, AI answers, names, emoji, accents', () => {
  const x = ev('Weekly sync');
  assert.equal(L.animClassify(x).type, 'meeting');
  assert.deepEqual(L.animClassify(x, { overrides: { [L.animKey(x)]: 'party' } }).source, 'override');
  assert.equal(L.animClassify(x, { overrides: { [L.animKey(x)]: 'party' } }).type, 'party');
  assert.equal(L.animClassify(x, { overrides: { [L.animKey(x)]: 'not-a-type' } }).type, 'meeting', 'unknown override ignored');
  assert.equal(L.animClassify(ev('XYZ standup'), { rules: [{ kw: 'xyz', type: 'coffee' }] }).type, 'coffee');
  assert.equal(L.animClassify(ev('XYZ standup'), { rules: [{ kw: 'xyz', type: 'nope' }] }).type, 'meeting');
  // AI answers only for titles nothing else matched
  assert.equal(L.animClassify(ev('Q4'), { ai: { q4: 'finance' } }).type, 'finance');
  assert.equal(L.animClassify(ev('Coffee'), { ai: { coffee: 'finance' } }).type, 'coffee');
  // task keys are per id, event keys per title (a repeating event shares one)
  assert.equal(L.animKey(tk('A', { id: 'u-1' })), 't:u-1');
  assert.equal(L.animKey(ev('Team  Meeting!')), L.animKey(ev('team meeting')));
  // names
  assert.equal(L.animNameCount('Sam / Alex'), 2);
  assert.equal(L.animNameCount('Kit, Sam and Jo'), 3);
  assert.equal(L.animNameCount('Priya KT / Sam'), 2);
  assert.equal(L.animNameCount('Product Design and Market Research'), 0);
  assert.equal(L.animNameCount('Sam Wedding'), 0);
  assert.equal(L.animNameCount('Jo / Alex Connect', new Set(['alex'])), 2);
  // accents and emoji
  assert.equal(L.animClassify(ev('Café with Sam')).type, 'coffee');
  assert.equal(L.animClassify(ev('🎉')).type, 'party');
  // stays fast: 1000 classifications well under a second
  const t0 = Date.now();
  for (let i = 0; i < 1000; i++) L.animClassify(ev('Fortnightly project meeting ' + i, { link: true, attendees: 7, location: 'Room 1' }));
  assert.ok(Date.now() - t0 < 1500, `${Date.now() - t0} ms`);
});

test('the owner\'s real calendar titles (BRIEF_REAL_TITLES, outside the repo)', (t) => {
  const f = process.env.BRIEF_REAL_TITLES;
  if (!f || !existsSync(f)) { t.skip('set BRIEF_REAL_TITLES to a JSON file to run this'); return; }
  const list = JSON.parse(readFileSync(f, 'utf8'));
  const wrong = [];
  for (const x of list) {
    const r = L.animClassify({ kind: 'event', ...x });
    if (r.type !== x.expect) wrong.push(`#${list.indexOf(x)} -> ${r.type}, want ${x.expect}`);   // no titles in the output
  }
  assert.deepEqual(wrong, []);
  assert.ok(list.length >= 9);
});

// ─── the day ───────────────────────────────────────────────────────────────
const MON = '2026-10-05', SAT = '2026-10-03';
const evt = (title, type, start, minutes, o = {}) => ({ title, type, start, end: start === null ? null : start + minutes, minutes, allDay: start === null, ...o });
test('briefDayType: deadline, meetings, light, travel, weekend, off, normal', () => {
  const dt = (day) => L.briefDayType({ date: MON, ...day });
  // a deadline leads with focus, accent red
  let r = dt({ events: [evt('1:1', 'one-on-one', 600, 30)], tasks: { today: 3, deadlines: [{ id: 'a', title: 'Submit report' }] } });
  assert.equal(r.type, 'deadline'); assert.equal(r.lead, 'focus'); assert.equal(r.accent, 'red'); assert.match(r.tagline, /Protect your morning/);
  assert.equal(r.order[0], 'focus');
  assert.equal(dt({ tasks: { today: 4, p1Today: 3 } }).type, 'deadline');
  assert.notEqual(dt({ tasks: { today: 1, overdue: 30 } }).type, 'deadline', 'an old backlog is not a deadline day');
  // meeting-heavy leads with the schedule
  r = dt({ events: [evt('A', 'meeting', 540, 60), evt('B', 'video-call', 630, 60), evt('C', 'one-on-one', 720, 30), evt('D', 'meeting', 840, 60)], tasks: { today: 2 } });
  assert.equal(r.type, 'meetings'); assert.equal(r.lead, 'schedule'); assert.equal(r.order[0], 'schedule'); assert.match(r.tagline, /4 meetings, 3\.5 h booked/);
  assert.equal(dt({ events: [evt('Workshop', 'meeting', 540, 300)], tasks: { today: 3 } }).type, 'meetings', '4+ hours of meetings');
  // light day suggests the backlog
  r = dt({ events: [evt('Coffee', 'coffee', 600, 30)], tasks: { today: 1 } });
  assert.equal(r.type, 'light'); assert.ok(r.order.includes('backlog'));
  // travel shows the trip first
  r = dt({ events: [evt('Flight to Lisbon', 'flight', 615, 180)], tasks: { today: 5, deadlines: [{ id: 'x', title: 'y' }] } });
  assert.equal(r.type, 'travel'); assert.equal(r.order[0], 'trip'); assert.ok(r.flags.travel);
  // weekend is gentle, a birthday is a celebration
  r = L.briefDayType({ date: SAT, events: [evt('Jo Bday', 'birthday', null, 0)], tasks: { today: 0 } });
  assert.equal(r.type, 'weekend'); assert.equal(r.lead, 'gentle'); assert.ok(r.flags.birthday); assert.equal(r.accent, 'pink');
  assert.equal(r.counts.celebrations, 1);
  // a day off
  assert.equal(dt({ events: [evt('Annual leave', 'holiday', null, 0)], tasks: { today: 0 } }).type, 'off');
  assert.notEqual(dt({ events: [evt('Kit annual leave', 'holiday', null, 0, { own: false })], tasks: { today: 0 } }).type, 'off', "someone else's leave is not your day off");
  // otherwise normal
  assert.equal(dt({ events: [evt('A', 'meeting', 540, 60), evt('B', 'meeting', 660, 60)], tasks: { today: 4 } }).type, 'normal');
  // overlapping invites are booked once; someone else's all-day trip is not your travel day
  r = dt({ events: [evt('Symposium', 'conference', 540, 600), evt('A / B', 'one-on-one', 600, 30), evt('Group', 'meeting', 720, 120)], tasks: { today: 2 } });
  assert.match(r.tagline, /3 meetings, 10 h booked/);
  assert.notEqual(dt({ events: [evt('Sam away: conference', 'travel', null, 0, { own: false })], tasks: { today: 1 } }).type, 'travel');
  assert.equal(dt({ events: [evt('Trip to Leeds', 'travel', null, 0)], tasks: { today: 1 } }).type, 'travel');
  // rain flag
  assert.ok(dt({ weather: { cond: 'showers' } }).flags.rainy);
});

test('briefHeadline picks the trip, the celebration, the deadline, the next meeting or the first focus', () => {
  const day = (o) => ({ date: MON, now: 8 * 60, tasks: { today: 0 }, ...o });
  let d = day({ events: [evt('Flight', 'flight', 600, 120), evt('Stag do', 'party', null, 0)] });
  assert.equal(L.briefHeadline(d).type, 'flight');
  d = day({ events: [evt('Party tonight', 'party', 19 * 60, 180), evt('Sync', 'meeting', 600, 30)] });
  assert.equal(L.briefHeadline(d).why, 'celebration');
  d = day({ events: [evt('Sync', 'meeting', 600, 30)], tasks: { today: 1, deadlines: [{ id: 't1', title: 'Submit' }] } });
  const h = L.briefHeadline(d);
  assert.equal(h.type, 'deadline'); assert.equal(h.id, 't1'); assert.ok(h.urgent);
  d = day({ events: [evt('A', 'meeting', 540, 60), evt('B', 'meeting', 600, 60), evt('C', 'meeting', 700, 60), evt('D', 'meeting', 800, 60)] });
  assert.equal(L.briefHeadline(d).title, 'A');
  d = day({ events: [], focus: [{ id: 'f1', title: 'Write', type: 'writing' }] });
  assert.equal(L.briefHeadline(d).type, 'writing');
  assert.equal(L.briefHeadline(day({ events: [] })), null);
});

test('gaps, relative times, time of day, stats', () => {
  const g = L.briefGaps([evt('A', 'meeting', 540, 60), evt('B', 'meeting', 630, 30), evt('C', 'meeting', 900, 60)], 540, 1050, 30);
  assert.deepEqual(g.map(x => [x.start, x.end]), [[600, 630], [660, 900], [960, 1050]]);
  assert.deepEqual(L.briefGaps([evt('All', 'holiday', null, 0)], 540, 600, 30), [{ start: 540, end: 600, minutes: 60 }]);
  assert.equal(L.briefRelTime(42), 'in 42 min');
  assert.equal(L.briefRelTime(65), 'in 1 h 5 min');
  assert.equal(L.briefRelTime(300), 'in 5 h');
  assert.equal(L.briefRelTime(0), 'now');
  assert.equal(L.briefRelTime(-5), '5 min ago');
  assert.equal(L.briefTimeOfDay(5, 7, 19), 'night');
  assert.equal(L.briefTimeOfDay(7.2, 7, 19), 'dawn');
  assert.equal(L.briefTimeOfDay(9, 7, 19), 'morning');
  assert.equal(L.briefTimeOfDay(14, 7, 19), 'day');
  assert.equal(L.briefTimeOfDay(18.6, 7, 19), 'dusk');
  assert.equal(L.briefTimeOfDay(19.8, 7, 19), 'evening');
  assert.equal(L.briefTimeOfDay(23, 7, 19), 'night');
  assert.deepEqual(L.briefStats({ meetings: 3, tasks: 5, deadlines: 2 }).map(s => `${s.n} ${s.n === 1 ? s.one : s.many}`), ['3 meetings', '5 tasks', '2 deadlines']);
  assert.deepEqual(L.briefStats({ tasks: 1 }).map(s => s.one), ['task']);
});

// ─── the auto-refresh ──────────────────────────────────────────────────────
test('briefOrchestrate runs each job through its gate, in parallel, and never throws', async () => {
  const seen = [];
  const started = [];
  const job = (id, o) => ({ id, label: id, ...o });
  const r = await L.briefOrchestrate([
    job('calendar', { available: () => true, stale: () => true, start: async () => { started.push('calendar'); return {}; }, wait: () => new Promise(res => setTimeout(() => res({}), 40)) }),
    job('inbox', { available: () => 'not connected', start: async () => { started.push('inbox'); return {}; } }),
    job('finance', { available: () => true, stale: async () => false, start: async () => { started.push('finance'); return {}; } }),
    job('weather', { available: () => true, start: async () => ({ error: 'offline' }) }),
    job('broken', { available: () => true, start: async () => { throw new Error('boom'); } }),
    job('recent', { available: () => true, start: async () => ({ skipped: true }) }),
    job('slow', { available: () => true, start: async () => ({}), wait: () => new Promise(() => {}) }),
  ], { timeoutMs: 120, onProgress: (id, status) => seen.push(`${id}:${status}`) });
  assert.deepEqual(started.sort(), ['calendar'], 'only connected, stale jobs start');
  assert.equal(r.results.calendar.status, 'done');
  assert.equal(r.results.inbox.status, 'skipped'); assert.equal(r.results.inbox.reason, 'not connected');
  assert.equal(r.results.finance.status, 'fresh');
  assert.equal(r.results.weather.status, 'error');
  assert.equal(r.results.broken.status, 'error'); assert.match(r.results.broken.reason, /boom/);
  assert.equal(r.results.recent.status, 'fresh', 'the server skipping a recent update counts as fresh');
  assert.equal(r.results.slow.status, 'timeout');
  assert.equal(r.changed, true);
  assert.ok(seen.indexOf('calendar:pending') < seen.indexOf('calendar:running') && seen.indexOf('calendar:running') < seen.indexOf('calendar:done'));
  // in parallel: all three waits are in flight at once (counted, not timed:
  // timers on a busy CI runner can fire late)
  let live = 0, peak = 0;
  await L.briefOrchestrate([1, 2, 3].map(i => job('j' + i, { start: async () => ({}), wait: () => { peak = Math.max(peak, ++live); return new Promise(res => setTimeout(() => { live--; res({}); }, 80)); } })), {});
  assert.equal(peak, 3, 'the three waits overlapped');
  const none = await L.briefOrchestrate([job('x', { available: () => 'off' })], {});
  assert.equal(none.changed, false);
});

// ─── finish the day ────────────────────────────────────────────────────────
test('briefRollover finds what slipped, most urgent first', () => {
  const today = MON;
  const r = L.briefRollover([
    { id: 'a', title: 'due today', due: today, priority: 'p3' },
    { id: 'b', title: 'overdue', due: '2026-10-01', priority: 'p2' },
    { id: 'c', title: 'planned only', planned: today },
    { id: 'd', title: 'done', due: today, done: true },
    { id: 'e', title: 'later', due: '2026-10-09' },
    { id: 'f', title: 'planned, due later', planned: '2026-10-04', due: '2026-10-20' },
    { id: 'g', title: 'due today p1', due: today, priority: 'p1' },
  ], today);
  assert.deepEqual(r.map(x => x.id), ['b', 'g', 'a', 'c', 'f']);
  assert.equal(r[0].why, 'overdue'); assert.equal(r[0].days, 4); assert.equal(r[0].field, 'due');
  assert.equal(r.find(x => x.id === 'c').field, 'planned');
});

test('briefStreak counts days in a row with something done', () => {
  const counts = { '2026-10-05': 2, '2026-10-04': 1, '2026-10-03': 4, '2026-10-01': 1 };
  assert.deepEqual(L.briefStreak(counts, '2026-10-05'), { days: 3, includesToday: true });
  assert.deepEqual(L.briefStreak(counts, '2026-10-06'), { days: 3, includesToday: false });
  assert.deepEqual(L.briefStreak({}, '2026-10-06'), { days: 0, includesToday: false });
});

// ─── the weekly review ─────────────────────────────────────────────────────
test('reviewWeekRange, reviewWeekStats (wins per stream, slipped + why) and reviewCapacity', () => {
  assert.deepEqual(L.reviewWeekRange('2026-10-07', 'Mon'), { from: '2026-10-05', to: '2026-10-11', nextFrom: '2026-10-12', nextTo: '2026-10-18', prevFrom: '2026-09-28', prevTo: '2026-10-04' });
  assert.equal(L.reviewWeekRange('2026-10-07', 'Sun').from, '2026-10-04');
  const ms = (iso, h = 12) => Date.UTC(...iso.split('-').map((n, i) => (i === 1 ? n - 1 : +n)), h);
  const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
  const st = L.reviewWeekStats({
    from: '2026-10-05', to: '2026-10-11', dayOf,
    tasks: [{ id: 'a', title: 'A', stream: 'Work' }, { id: 'b', title: 'B', stream: 'Thesis' }, { id: 'c', title: 'C', stream: 'Work' }],
    completions: { a: [ms('2026-10-05'), ms('2026-10-09')], b: [ms('2026-10-06')], c: [ms('2026-10-01')] },
    activity: {
      a: [{ ts: ms('2026-10-06'), type: 'date', from: '2026-10-06', to: '2026-10-08', reason: 'Rolled over at the end of the day' }, { ts: ms('2026-10-08'), type: 'date', from: '2026-10-08', to: '2026-10-10', reason: 'Waiting for data' }],
      b: [{ ts: ms('2026-10-07'), type: 'date', from: '2026-10-09', to: '2026-10-07', reason: 'earlier' }],
      c: [{ ts: ms('2026-09-30'), type: 'date', from: '2026-10-01', to: '2026-10-03' }],
    },
  });
  assert.equal(st.completed, 3);
  assert.deepEqual(st.perStream, [{ stream: 'Work', n: 2 }, { stream: 'Thesis', n: 1 }]);
  assert.equal(st.slipped.length, 1, 'only moves LATER, made this week');
  assert.deepEqual({ id: st.slipped[0].id, from: st.slipped[0].from, to: st.slipped[0].to, moves: st.slipped[0].moves, reason: st.slipped[0].reason }, { id: 'a', from: '2026-10-06', to: '2026-10-10', moves: 2, reason: 'Waiting for data' });
  const cap = L.reviewCapacity([
    { date: '2026-10-12', events: [{ minutes: 120, type: 'meeting' }, { minutes: 240, type: 'conference' }, { minutes: 0, allDay: true, type: 'holiday' }], tasks: 2, estimate: 60 },
    { date: '2026-10-13', events: [], tasks: 0 },
  ], 480);
  assert.equal(cap[0].booked, 360); assert.equal(cap[0].meetings, 2); assert.equal(cap[0].warn, true); assert.equal(cap[0].free, 60);
  assert.equal(cap[1].warn, false); assert.equal(cap[1].load, 0);
});

test('the brief and scene files stay pure (no DOM, no page globals)', () => {
  for (const f of ['71-anim-library.js', '73-brief-logic.js']) {
    const src = readFileSync(join(ROOT, 'src', 'app', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const g of [/\bdocument\./, /\bwindow\./, /\bstate\./, /\blocalStorage\b/, /\bfetch\(/, /\bAPP_CONFIG\b/, /\besc\(/, /\brender\(/]) assert.ok(!g.test(src), `${f} uses ${g}`);
  }
});
