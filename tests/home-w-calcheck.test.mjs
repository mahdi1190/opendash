// Home widget "calcheck" (Invites & clashes, WIDGETS_CATALOGUE.md 3.6): the pure
// rules in src/app/12-home-calcheck-logic.js (run in a VM with the meetings logic
// it uses), and the widget's registration in the page's Home bundle: available,
// its settings fit the server schema, the gallery preview draws sample content
// without fetching or writing. Synthetic data only (generic names).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';
import { check } from '../server/actions/validate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));

function logic() {
  const box = { console, Date, Math, JSON, Map, Set, Number, String, Array, Object, RegExp };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  vm.runInContext(read('12-home-meet-logic.js') + '\n' + read('12-home-calcheck-logic.js'), box, { filename: 'calcheck-logic.js' });
  return box;
}
const L = logic();

// Local wall-clock times (the rules use local time, like the page).
const T = (day, h, m = 0) => `2026-10-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
const NOW = Date.parse(T(5, 8));                      // Monday 5 Oct 2026, 08:00
const ME = 'me@example.net';
const OPT = { now: NOW, myEmails: [ME], myCalendars: [ME] };
const guest = (email, response = 'accepted', extra = {}) => ({ email, name: email.split('@')[0], response, ...extra });
const meAs = (response) => ({ email: ME, self: true, response });
let n = 0;
const ev = (start, end, extra = {}) => ({
  id: extra.id || 'e' + (++n), summary: extra.summary || 'Event ' + n, calendarId: ME,
  start: { dateTime: start }, end: { dateTime: end }, organizer: { email: 'sam@example.com', name: 'Sam Taylor' },
  attendees: [meAs('accepted'), guest('sam@example.com', 'accepted', { organizer: true })], location: 'Room 1', ...extra,
});
const kinds = (r) => r.items.map(i => i.kind);
const run = (events, o = {}) => plain(L.homeCalProblems(events, { ...OPT, ...o }));

test('the rules are pure: no DOM, no page state, no clock', () => {
  const src = read('12-home-calcheck-logic.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const w of ['document.', 'window.', 'APP_CONFIG', 'state.', 'localStorage', 'fetch(', 'saveData', 'render(', 'todayStr(']) assert.ok(!src.includes(w), `uses ${w}`);
  assert.ok(!/Date\.now\(\)/.test(src.replace(/o\.now != null \? o\.now : Date\.now\(\)/, '')), 'the clock only as a default for o.now');
});

test('my answer: my address first, then my own calendar, never someone else\'s calendar', () => {
  const R = (e, o = OPT) => L.cckMyResponse(e, o);
  assert.equal(R(ev(T(5, 10), T(5, 11), { attendees: [meAs('needsAction'), guest('sam@example.com')] })), 'needsAction');
  assert.equal(R(ev(T(5, 10), T(5, 11), { organizer: { email: ME } })), 'organizer');
  // Someone else's calendar the user switched on: "self" there is that person, not the user.
  const theirs = ev(T(5, 10), T(5, 11), { calendarId: 'alex@example.org', attendees: [{ email: 'alex@example.org', self: true, response: 'needsAction' }] });
  assert.equal(R(theirs), null);
  // ...unless the user is invited too (by address).
  theirs.attendees.push(guest(ME, 'tentative'));
  assert.equal(R(theirs), 'tentative');
  // The user's own calendar without guests: an own block.
  assert.equal(R({ id: 'b', summary: 'Focus', calendarId: ME, start: { dateTime: T(5, 9) }, end: { dateTime: T(5, 10) } }), 'own');
  // Nothing known about the user (no addresses): Google's self / selfResponse.
  assert.equal(R({ id: 'x', calendarId: 'c1', selfResponse: 'declined', start: { dateTime: T(5, 9) }, end: { dateTime: T(5, 10) }, attendees: [guest('sam@example.com')] }, {}), 'declined');
  assert.equal(L.cckCommitted('accepted') && L.cckCommitted('organizer') && L.cckCommitted('own'), true);
  assert.equal(L.cckCommitted('tentative') || L.cckCommitted('needsAction'), false);
});

test('needs reply: unanswered invitations first, Maybe listed lower; past, declined and other people\'s left out', () => {
  const a = ev(T(7, 14), T(7, 15), { id: 'inv', summary: 'Reading group', attendees: [meAs('needsAction'), guest('sam@example.com', 'accepted', { organizer: true }), guest('jo@example.com')] });
  const b = ev(T(6, 9), T(6, 10), { id: 'maybe', attendees: [meAs('tentative'), guest('sam@example.com')] });
  const past = ev(T(5, 7), T(5, 7, 30), { id: 'past', attendees: [meAs('needsAction'), guest('sam@example.com')] });
  const declined = ev(T(8, 9), T(8, 10), { id: 'no', attendees: [meAs('declined'), guest('sam@example.com')] });
  const theirs = ev(T(8, 11), T(8, 12), { id: 'theirs', calendarId: 'alex@example.org', attendees: [{ email: 'alex@example.org', self: true, response: 'needsAction' }] });
  const r = run([a, b, past, declined, theirs]);
  assert.deepEqual(r.items.map(i => [i.kind, i.id]), [['reply', 'inv'], ['maybe', 'maybe']]);
  assert.equal(r.items[0].guests, 2);
  assert.deepEqual(r.items[0].organizer, { email: 'sam@example.com', name: 'Sam Taylor' });
  assert.deepEqual([r.counts.reply, r.counts.maybe], [1, 1]);
  assert.deepEqual(plain(L.cckSummary(r.counts)).map(s => s.text), ['1 to answer', '1 maybe']);
  // Started already: too late to answer here.
  assert.equal(run([ev(T(5, 7, 30), T(5, 9), { attendees: [meAs('needsAction'), guest('sam@example.com')] })]).total, 0);
});

test('a repeating invitation is one row with "+N more"; an invitation notes what it overlaps', () => {
  const inst = (d) => ev(T(d, 16), T(d, 17), { id: `ser_202610${String(d).padStart(2, '0')}T150000Z`, recurring: true, summary: 'Seminar', attendees: [meAs('needsAction'), guest('sam@example.com')] });
  const busy = ev(T(6, 16, 30), T(6, 17, 30), { id: 'sup', summary: 'Supervision' });
  const r = run([inst(6), inst(13), busy]);
  const rows = r.items.filter(i => i.kind === 'reply');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].more, 1);
  assert.equal(rows[0].until, Date.parse(T(13, 17)), 'a dismissal lasts until the last copy in the window ends');
  assert.deepEqual(rows[0].overlaps, [{ id: 'sup', title: 'Supervision' }]);
});

test('clash: two committed events overlapping 10 min or more; free, all-day, declined and tentative ignored', () => {
  const a = ev(T(6, 14), T(6, 15), { id: 'a', summary: 'Design review' });
  const b = ev(T(6, 14, 30), T(6, 15, 30), { id: 'b', summary: 'Planning' });
  const near = ev(T(6, 14, 55), T(6, 15, 40), { id: 'c', summary: 'Five minutes only', attendees: [meAs('accepted')] });
  const r1 = run([a, b]);
  assert.deepEqual(kinds(r1), ['clash']);
  assert.deepEqual([r1.items[0].a.id, r1.items[0].b.id, r1.items[0].minutes], ['a', 'b', 30]);
  assert.equal(r1.items[0].start, Date.parse(T(6, 14, 30)));
  // 5 min of overlap (a then c) is not a clash; b and c overlap 35 min.
  const r2 = run([a, near]);
  assert.equal(r2.counts.clash, 0);
  for (const other of [
    ev(T(6, 14), T(6, 15), { id: 'f', free: true }),
    ev(T(6, 14), T(6, 15), { id: 'd', attendees: [meAs('declined'), guest('sam@example.com')] }),
    ev(T(6, 14), T(6, 15), { id: 't', attendees: [meAs('tentative'), guest('sam@example.com')] }),
    { id: 'ad', summary: 'Conference', calendarId: ME, allDay: true, start: { date: '2026-10-06' }, end: { date: '2026-10-07' } },
    ev(T(6, 0), T(6, 23), { id: 'ooo', eventType: 'outOfOffice', attendees: [] }),
  ]) assert.equal(run([a, other]).counts.clash, 0, other.id);
});

test('copies of one event on two calendars are one event (iCalUID, or start + end + title), so no clash with itself', () => {
  const a = ev(T(6, 10), T(6, 11), { id: 'm1', iCalUID: 'uid-1@example.com', summary: 'Standup', calendarId: ME });
  const b = { ...a, id: 'm1-copy', calendarId: 'team@group.calendar.google.com' };
  const c = { ...a, id: 'other-id', iCalUID: undefined, calendarId: 'second@example.com' };       // same start, end and title
  assert.equal(run([a, b, c]).counts.clash, 0);
  // A different event at the same time does clash.
  assert.equal(run([a, ev(T(6, 10), T(6, 11), { id: 'z', summary: 'Other' })]).counts.clash, 1);
});

test('a weekly clash is one row with "+N more"', () => {
  const s = (id, d, h, title) => ev(T(d, h), T(d, h + 1), { id: `${id}_202610${String(d).padStart(2, '0')}T${h}0000Z`, recurring: true, summary: title });
  const r = run([s('x', 6, 10, 'A'), s('y', 6, 10, 'B'), s('x', 13, 10, 'A'), s('y', 13, 10, 'B')]);
  assert.equal(r.counts.clash, 1);
  assert.equal(r.items[0].more, 1);
});

test('back to back: 3 h or more with gaps under 10 min, today and tomorrow only, meetings with others', () => {
  const day = (d) => [
    ev(T(d, 9), T(d, 10), { id: `a${d}` }), ev(T(d, 10, 5), T(d, 11), { id: `b${d}` }),
    ev(T(d, 11), T(d, 12, 15), { id: `c${d}` }),
  ];
  const r = run([...day(5), ...day(6), ...day(7)]);
  const runs = r.items.filter(i => i.kind === 'b2b');
  assert.deepEqual(runs.map(i => [i.date, i.count, i.minutes]), [['2026-10-05', 3, 195], ['2026-10-06', 3, 195]]);
  // A 10-minute gap breaks the run: 2 h + 1 h 5 min is not 3 h.
  const broken = [ev(T(6, 9), T(6, 11), { id: 'p' }), ev(T(6, 11, 10), T(6, 12, 15), { id: 'q' })];
  assert.equal(run(broken).counts.b2b, 0);
  // Own blocks (no other people) are not meetings.
  const own = [ev(T(6, 9), T(6, 11), { id: 'o1', attendees: [] }), ev(T(6, 11), T(6, 13), { id: 'o2', attendees: [] })];
  assert.equal(run(own).counts.b2b, 0);
  // Exactly 3 h counts.
  assert.equal(run([ev(T(6, 9), T(6, 10, 30), { id: 'x1' }), ev(T(6, 10, 35), T(6, 12), { id: 'x2' })]).counts.b2b, 1);
});

test('no link: meetings with others in the next 24 h with no place and no call link', () => {
  const bare = (id, s, e, extra = {}) => ev(s, e, { id, location: '', ...extra });
  const r = run([
    bare('nolink', T(5, 15), T(5, 16)),
    bare('zoom', T(5, 16), T(5, 17), { conferenceUrl: 'https://meet.example.com/abc' }),
    bare('desc', T(5, 17), T(5, 18), { description: 'Join: https://acme.zoom.us/j/123' }),
    bare('later', T(7, 10), T(7, 11)),                                        // more than 24 h ahead
    bare('alone', T(5, 12), T(5, 13), { attendees: [meAs('accepted')] }),     // nobody else: not a meeting
    bare('ask', T(5, 13), T(5, 14), { attendees: [meAs('needsAction'), guest('sam@example.com')] }),   // unanswered: the reply row covers it
  ]);
  assert.deepEqual(r.items.filter(i => i.kind === 'link').map(i => i.id), ['nolink']);
  assert.equal(r.items.find(i => i.kind === 'link').others, 1);
  assert.equal(L.cckHasJoin({ location: 'Room 2' }), true);
  assert.equal(L.cckHasJoin({ description: 'see you there' }), false);
});

test('outside working hours: only when working hours are set', () => {
  const WH = { startMin: 9 * 60, endMin: 17 * 60, days: [1, 2, 3, 4, 5] };
  const events = [
    ev(T(6, 8), T(6, 9), { id: 'early' }), ev(T(6, 16, 30), T(6, 17, 30), { id: 'late' }),
    ev(T(10, 11), T(10, 12), { id: 'sat' }), ev(T(6, 10), T(6, 11), { id: 'fine' }),
  ];
  assert.equal(run(events).counts.hours, 0);
  const r = run(events, { workHours: WH });
  assert.deepEqual(r.items.filter(i => i.kind === 'hours').map(i => [i.id, i.why]), [['early', 'early'], ['late', 'late'], ['sat', 'dayoff']]);
});

test('checks switch off one by one; the window follows o.days', () => {
  const inv = ev(T(20, 10), T(20, 11), { id: 'far', attendees: [meAs('needsAction'), guest('sam@example.com')] });
  assert.equal(run([inv]).total, 0, '15 days ahead is outside 14 days');
  assert.equal(run([inv], { days: 30 }).total, 1);
  assert.equal(run([inv], { days: 30, checks: { reply: false } }).total, 0);
});

test('"It\'s fine": a dismissed problem stays away until its end, then the key expires', () => {
  const a = ev(T(6, 14), T(6, 15), { id: 'a' }), b = ev(T(6, 14, 30), T(6, 15, 30), { id: 'b' });
  const first = run([a, b]);
  const key = first.items[0].key;
  assert.match(key, /^clash:[a-z0-9]+$/);
  assert.equal(run([a, b]).items[0].key, key, 'the key is stable');
  assert.equal(run([a, b], { dismissed: { [key]: first.items[0].until } }).total, 0);
  // An expired dismissal does nothing (and pruning drops it).
  assert.equal(run([a, b], { dismissed: { [key]: NOW - 1 } }).total, 1);
  const pruned = plain(L.cckPruneDismissed({ [key]: NOW - 1, 'reply:abc': NOW + 1000, bad: 5, 'x:y': 'soon' }, NOW));
  assert.deepEqual(pruned, { 'reply:abc': NOW + 1000 });
  const many = {};
  for (let i = 0; i < 60; i++) many['reply:k' + i] = NOW + i * 1000 + 1;
  const kept = plain(L.cckPruneDismissed(many, NOW, 40));
  assert.equal(Object.keys(kept).length, 40);
  assert.ok(kept['reply:k59'] && !kept['reply:k0'], 'the newest are kept');
});

test('order: most severe first, then by start; nearest is the earliest', () => {
  const inv = ev(T(9, 10), T(9, 11), { id: 'inv', attendees: [meAs('needsAction'), guest('sam@example.com')] });
  const a = ev(T(6, 14), T(6, 15), { id: 'a' }), b = ev(T(6, 14, 30), T(6, 15, 30), { id: 'b' });
  const r = run([inv, a, b]);
  assert.deepEqual(kinds(r), ['reply', 'clash']);
  assert.equal(r.nearest.kind, 'clash');
  assert.deepEqual(plain(L.cckSummary(r.counts)).map(s => s.text), ['1 to answer', '1 clash']);
  assert.equal(L.cckMinutesText(45), '45 min');
  assert.equal(L.cckMinutesText(210), '3 h 30 min');
  assert.equal(L.cckMinutesText(180), '3 h');
});

/* ───────── the widget in the page's Home bundle ───────── */
function homeBox() {
  const st = { custom: [], statuses: {}, pinned: {}, deleted: {}, home: {} };
  const fakeEl = () => {
    const attrs = {}; const classes = new Set(); const kids = [];
    return {
      dataset: {}, innerHTML: '', textContent: '', disabled: false, isConnected: true, style: { setProperty() {} }, children: kids,
      getAttribute: (k) => (Object.hasOwn(attrs, k) ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = String(v); },
      removeAttribute: (k) => { delete attrs[k]; }, hasAttribute: (k) => Object.hasOwn(attrs, k),
      classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c), toggle() {} },
      appendChild: (c) => { kids.push(c); return c; }, append: (...c) => kids.push(...c), insertAdjacentHTML() {}, addEventListener() {},
      querySelector: () => null, querySelectorAll: () => [], closest: () => null, remove() {},
    };
  };
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {}, myEmails: ['me@example.net'] },
    window: { addEventListener() {} }, CSS: { escape: (s) => s }, TextEncoder,
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => fakeEl(), body: { appendChild() {} }, hidden: false },
    registerSection() {}, render() {}, undo() {}, saveData() { box._saves = (box._saves || 0) + 1; }, saveUI() {},
    toast: () => {}, todayStr: () => '2026-10-05', fmtDate: (d) => d.toISOString().slice(0, 10),
    setTimeout: () => 1, clearTimeout() {}, fetch: () => { box._fetched = true; return new Promise(() => {}); },
    esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    escAttr: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    icon: (n) => `<i data-i="${n}"></i>`, netErrorMessage: (e) => String(e), getItem: () => null, statusOf: () => 'todo',
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  const files = readdirSync(APP).filter(f => /^12-home.*\.js$/.test(f)).sort();
  vm.runInContext(files.map(read).join('\n'), box, { filename: 'home-bundle.js' });
  return { box, json: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, box)), run: (code) => vm.runInContext(code, box), fakeEl };
}

test('registered, available, and its defaults fit the server schema (set_home_widget)', () => {
  const { json } = homeBox();
  const d = json('(() => { const d = homeWidgetDefs().find(x => x.id === "calcheck"); return { available: d.available(), hidden: d.defaultHidden, sizes: d.sizes, def: d.defaultSize, defaults: typeof d.defaults === "function" ? d.defaults() : d.defaults, settings: typeof d.settings, sample: typeof d.sample }; })()');
  assert.equal(d.available, true);
  assert.equal(d.hidden, true);
  const w = HOME_WIDGETS.find(x => x.id === 'calcheck');
  assert.deepEqual(d.sizes, [...w.sizes]);
  assert.equal(d.def, w.defaultSize);
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.calcheck.properties).sort());
  assert.deepEqual(check(HOME_WIDGET_PREFS.calcheck, d.defaults, 'prefs'), []);
  assert.equal(d.settings, 'function');
  assert.equal(d.sample, 'function');
});

test('the gallery preview draws sample problems: no fetch, no tick, no write', () => {
  const { box, json, run } = homeBox();
  const s = json('(() => { const def = homeWidgetDefs().find(x => x.id === "calcheck"); const r = homeCalProblems(def.sample(_homeSampleKit()).events, def.sample(_homeSampleKit()).opts); return { total: r.total, kinds: r.items.map(i => i.kind) }; })()');
  assert.ok(s.total >= 3, 'sample has something to show');
  assert.ok(s.kinds.includes('reply') && s.kinds.includes('clash'));
  const out = run('(() => { const def = homeWidgetDefs().find(x => x.id === "calcheck"); const el = document.createElement("div"); return def.render(el, { id: "calcheck", baseId: "calcheck", size: "m", preview: true, prefs: homePrefs("calcheck"), firstPaint: true, isNew: () => false, enterNew: () => 0, off: () => null, def: _homeDefNorm(def) }); })()');
  assert.equal(out, true);
  assert.ok(!box._fetched, 'nothing fetched');
  assert.ok(!box._saves, 'nothing saved');
});
