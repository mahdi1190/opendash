// Which calendar events the user sees, and which make up the user's own day
// (lib/calendar-visibility.mjs), everywhere they are used: the pure rule; the
// calendar.list query (default = the Calendar page's rule, mine:true = the user's
// own day, untitled events flagged); the page's copy of the rule in
// src/app/40-calendar.js (same answers, and calEntriesOn keeps the Calendar page
// and Home/the brief apart); and the stories' day model (lib/story-data.mjs), which
// never names another person's calendar, a declined event or "(no title)".
// Synthetic data only (generic names and example.org addresses).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import {
  calendarRules, visibleEvents, isCalendarShown, isUntitledEvent, isDeclinedEvent, isUserInvited, calendarPrefKey, eventCalendarIds,
} from '../lib/calendar-visibility.mjs';
import { normaliseEvent } from '../lib/calendar.mjs';
import { calendarDefaultOn } from '../lib/sources.mjs';
import { createActions } from '../server/actions/index.mjs';
import { buildStoryData } from '../lib/story-data.mjs';
import { fallbackStoryScript, storyPrompt } from '../lib/story-script.mjs';
import { clock } from '../server/actions/model.mjs';
import { dataPaths } from '../lib/datadir.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ME = 'me@example.org', SAM = 'sam@example.org', TEAM = 'team@group.calendar.google.com';
const MY = [ME];
// The calendars as mergeCalendarData returns them: defaultOn from config.myEmails.
const CALS = [{ id: ME, name: 'Me' }, { id: SAM, name: 'Sam' }, { id: TEAM, name: 'Team' }].map(c => ({ ...c, defaultOn: calendarDefaultOn(c, MY) }));
const raw = (id, cal, extra = {}) => ({ id, summary: id, calendarId: cal, start: { dateTime: '2026-03-10T10:00:00Z' }, end: { dateTime: '2026-03-10T11:00:00Z' }, ...extra });

test('defaults: the user\'s own and group calendars show, another person\'s does not', () => {
  assert.deepEqual(CALS.map(c => [c.id, c.defaultOn]), [[ME, true], [SAM, false], [TEAM, true]]);
  const r = calendarRules({ calendars: CALS, state: {}, myEmails: MY });
  assert.equal(r.shown(raw('own', ME)), true);
  assert.equal(r.shown(raw('team', TEAM)), true);
  assert.equal(r.shown(raw('other', SAM)), false, 'own calendars only by default');
  assert.equal(r.mine(raw('own', ME)), true);
  assert.equal(r.mine(raw('other', SAM)), false);
  assert.deepEqual([...r.hiddenIds], [SAM]);
  assert.equal(calendarPrefKey('google'), 'google');
  assert.equal(calendarPrefKey(ME), 'cal:' + ME);
  assert.deepEqual(eventCalendarIds({ calendars: [SAM, ME], calendarId: SAM }), [SAM, ME]);
  assert.deepEqual(eventCalendarIds({}), ['google'], 'an old snapshot event: the page\'s single "google" row');
});

test('ticked calendars: shown in the Calendar; the user\'s own day only when invited', () => {
  const state = { calPrefs: { hidden: { ['cal:' + SAM]: false, ['cal:' + TEAM]: true } } };
  const r = calendarRules({ calendars: CALS, state, myEmails: MY });
  assert.equal(r.shown(raw('other', SAM)), true, 'the user switched it on: the Calendar shows it');
  assert.equal(r.mine(raw('other', SAM)), false, 'but another person\'s meeting is not the user\'s "next up"');
  const invited = raw('inv', SAM, { attendees: [{ email: 'SAM@example.org', response: 'accepted' }, { email: 'Me@Example.org', response: 'accepted' }] });
  assert.equal(r.mine(invited), true, 'invited (address in config.myEmails, any case)');
  assert.equal(r.mine(raw('org', SAM, { organizer: { email: ME } })), true, 'organised by the user');
  assert.equal(r.mine(raw('said-no', SAM, { attendees: [{ email: ME, response: 'declined' }] })), false);
  assert.equal(r.shown(raw('team', TEAM)), false, 'switched off by the user');
  assert.equal(r.mine(raw('both', SAM, { calendars: [SAM, ME] })), true, 'also in an own calendar');
  // Switching the user's own calendar off hides it everywhere.
  const off = calendarRules({ calendars: CALS, state: { calPrefs: { hidden: { ['cal:' + ME]: true } } }, myEmails: MY });
  assert.equal(off.shown(raw('own', ME)), false);
  assert.equal(off.mine(raw('own', ME)), false);
  assert.equal(isCalendarShown({ id: SAM, defaultOn: false }, { ['cal:' + SAM]: false }), true);
  assert.equal(isCalendarShown({ id: ME, defaultOn: true }, { ['cal:' + ME]: true }), false);
});

test('declined events are never the user\'s day; untitled events are recognised', () => {
  const r = calendarRules({ calendars: CALS, state: {}, myEmails: MY });
  const declined = raw('no', ME, { selfResponse: 'declined' });
  assert.equal(r.shown(declined), true, 'the Calendar can still show it (its own Declined filter)');
  assert.equal(r.mine(declined), false);
  assert.equal(isDeclinedEvent({ myResponse: 'declined' }), true, 'calendar.list shape');
  for (const t of ['(no title)', '(No title)', '', '   ', 'Busy', '(busy)', 'Untitled', null]) assert.equal(isUntitledEvent({ summary: t }), true, String(t));
  for (const t of ['Team sync', 'Busy Bee launch', 'No title needed: plan']) assert.equal(isUntitledEvent({ summary: t }), false, t);
  assert.equal(isUntitledEvent({ title: '(no title)' }), true, 'calendar.list shape');
  assert.equal(isUserInvited({ attendees: [{ email: ME }] }, []), false, 'no own address known: nobody is invited');
});

test('no calendar list (old snapshot, demo data): everything shows and is the user\'s, declined aside', () => {
  const r = calendarRules({ calendars: [], state: { calPrefs: { hidden: { 'cal:x': true } } }, myEmails: MY });
  assert.equal(r.shown({ id: 'a', summary: 'A' }), true);
  assert.equal(r.mine({ id: 'a', summary: 'A' }), true);
  assert.equal(r.mine({ id: 'b', summary: 'B', selfResponse: 'declined' }), false);
  const evs = [raw('own', ME), raw('other', SAM), raw('no', ME, { selfResponse: 'declined' })];
  assert.deepEqual(visibleEvents({ myEmails: MY }, {}, evs, CALS).map(e => e.id), ['own', 'no']);
  assert.deepEqual(visibleEvents({ myEmails: MY }, {}, evs, CALS, { mine: true }).map(e => e.id), ['own']);
});

/* ---------- a data folder with two calendars: the user's and a colleague's (ticked on) ---------- */
const DAY = '2026-03-10';   // a Tuesday; London is on GMT in March, so Z times are local
function dataDir({ tick = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cal-vis-'));
  mkdirSync(join(dir, 'state'), { recursive: true });
  mkdirSync(join(dir, 'calendar'), { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ userName: 'Robin Example', timezone: 'Europe/London', weekStart: 'Mon', myEmails: MY }));
  const t = (h, m = 0) => `${DAY}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`;
  const ev = (id, summary, a, b, cal, extra = {}) => normaliseEvent({ id, summary, start: { dateTime: a }, end: { dateTime: b }, status: 'confirmed', ...extra }, cal);
  writeFileSync(join(dir, 'calendar', 'events.json'), JSON.stringify({
    version: 2, fetchedAt: new Date().toISOString(), calendars: [{ id: ME, name: 'Me' }, { id: SAM, name: 'Sam' }],
    events: [
      ev('own1', 'Project sync', t(10), t(11), ME),
      ev('busy1', '', t(11), t(13), ME),                                                   // "(no title)": a private block
      ev('lect1', 'Lecture: fluid mechanics', t(9), t(10), SAM),                           // the colleague's teaching
      ev('inv1', 'Budget review', t(14), t(15), SAM, { attendees: [{ email: SAM, responseStatus: 'accepted', organizer: true }, { email: ME, responseStatus: 'accepted' }] }),
      ev('dec1', 'Optional seminar', t(15, 30), t(16), ME, { attendees: [{ email: ME, self: true, responseStatus: 'declined' }] }),
    ],
  }));
  const state = {
    custom: [{ id: 'f1', title: 'Send the signed contract to Acme and a copy of the invoice before the end of the month', dueDate: '2026-03-06', priority: 'p1' }],
    statuses: {}, people: [], streams: [],
    calPrefs: { hidden: tick ? { ['cal:' + SAM]: false } : {} },
  };
  writeFileSync(join(dir, 'state', 'dashboard-state.json'), JSON.stringify(state));
  return { dir, state };
}

test('calendar.list: the page\'s rule by default, the user\'s own day with mine:true, untitled flagged', async () => {
  const { dir } = dataDir();
  try {
    const a = createActions({ dataDir: dir });
    const all = await a.query('calendar.list', { from: DAY, to: DAY });
    assert.deepEqual(all.events.map(e => e.id).sort(), ['busy1', 'dec1', 'inv1', 'lect1', 'own1'], 'the ticked calendar shows, as in the Calendar');
    assert.equal(all.events.find(e => e.id === 'busy1').untitled, true);
    assert.equal(all.events.find(e => e.id === 'own1').untitled, undefined);
    const mine = await a.query('calendar.list', { from: DAY, to: DAY, mine: true });
    assert.deepEqual(mine.events.map(e => e.id).sort(), ['busy1', 'inv1', 'own1'], 'own calendars + invitations, declined left out');
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const { dir: d2 } = dataDir({ tick: false });
  try {
    const all = await createActions({ dataDir: d2 }).query('calendar.list', { from: DAY, to: DAY });
    assert.ok(!all.events.some(e => e.calendar === 'Sam'), 'never ticked: another person\'s calendar stays out');
    assert.deepEqual(all.calendars.map(c => [c.name, !!c.hidden]), [['Me', false], ['Sam', true]]);
  } finally { rmSync(d2, { recursive: true, force: true }); }
});

test('story data: only the user\'s own day; "(no title)" is busy time, never said; the brief agrees', async () => {
  const { dir, state } = dataDir();
  try {
    const now = new Date(`${DAY}T08:30:00Z`);
    const cfg = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
    const q = { s: state, cfg, clock: clock(cfg.timezone, now), paths: dataPaths(dir), financeDir: null };
    const d = await buildStoryData(q, 'morning', { weather: null, now });
    assert.deepEqual(d.events.map(e => e.id).sort(), ['inv1', 'own1'], 'no colleague-only event, no declined one, no untitled one');
    assert.equal(d.next, 'own1');
    assert.ok(d.gaps.some(g => g.start === '13:00'), 'free after the busy block');
    assert.ok(!d.gaps.some(g => g.start === '11:00'), 'the untitled block still counts as busy');
    assert.ok(!d.entities.some(e => e.type === 'event' && /no title|Busy|Lecture/i.test(e.text)));
    const s = fallbackStoryScript('morning', d);
    const words = s.sentences.map(x => x.text).join(' ');
    assert.doesNotMatch(words, /no title|Lecture|Optional seminar/i, words);
    const facts = storyPrompt('morning', d).prompt;
    assert.doesNotMatch(facts, /no title|Lecture|Optional seminar/i, 'the AI is never told about them either');
    // brief.get (the MCP brief) uses the same rule.
    const b = await createActions({ dataDir: dir }).query('brief.get', { date: DAY });
    assert.deepEqual(b.brief.schedule.map(x => x.title), ['Project sync', 'Budget review']);
    assert.ok(!b.brief.gaps.some(g => g.from === '11:00'), 'the untitled block is busy time there too');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ---------- the page's copy of the rule (src/app/40-calendar.js) ---------- */
function pageBox(hidden) {
  const pad = (n) => String(n).padStart(2, '0');
  const box = {
    console, state: { calPrefs: { hidden: { tasks: true, countdowns: true, declined: true, ...hidden } }, countdowns: [] },
    APP_CONFIG: { myEmails: MY, locale: 'en-GB' }, window: { addEventListener() {} }, document: { addEventListener() {}, querySelector: () => null },
    setTimeout, clearTimeout, setInterval, fetch: async () => ({ ok: false }), _serverAvailable: false,
    fmtDate: (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  };
  vm.createContext(box);
  loadPageClock(box);   // 40-calendar.js places events by the page's Clock (travel spec 2.7)
  vm.runInContext(readFileSync(join(ROOT, 'src', 'app', '40-calendar.js'), 'utf8'), box, { filename: '40-calendar.js' });
  return box;
}
// CalStore is a top-level const of the script: set its data from inside the context.
const setData = (box, data) => { box.__data = data; vm.runInContext('CalStore.st.data = __data', box); };
test('the page agrees: same shown / mine answers; Home and the brief get the user\'s own day only', () => {
  const evs = [
    raw('own', ME), raw('other', SAM), raw('team', TEAM), raw('both', SAM, { calendars: [SAM, ME] }),
    raw('inv', SAM, { attendees: [{ email: ME, response: 'accepted' }] }), raw('org', SAM, { organizer: { email: ME } }),
    raw('no', ME, { selfResponse: 'declined' }), raw('said-no', SAM, { attendees: [{ email: ME, response: 'declined' }] }),
    raw('ghost', 'unknown@example.org'),
  ];
  for (const hidden of [{}, { ['cal:' + SAM]: false }, { ['cal:' + SAM]: false, ['cal:' + ME]: true }, { ['cal:' + TEAM]: true }]) {
    const box = pageBox(hidden);
    setData(box, { fetchedAt: JSON.stringify(hidden), calendars: CALS, events: evs });
    const r = calendarRules({ calendars: CALS, state: { calPrefs: { hidden } }, myEmails: MY });
    for (const e of evs) {
      box.__e = e;
      assert.equal(vm.runInContext('calEventVisible(__e)', box), r.shown(e), `shown ${e.id} ${JSON.stringify(hidden)}`);
      assert.equal(vm.runInContext('calEventIsMine(__e)', box), r.mine(e), `mine ${e.id} ${JSON.stringify(hidden)}`);
    }
  }
  // calEntriesOn: the Calendar page shows the ticked calendar and the untitled block;
  // Home and the brief (opt.sources) only the user's own, titled events.
  const box = pageBox({ ['cal:' + SAM]: false });
  setData(box, { fetchedAt: 'x', calendars: CALS, events: [
    raw('own', ME, { start: { dateTime: '2026-03-10T10:00:00' }, end: { dateTime: '2026-03-10T11:00:00' } }),
    raw('other', SAM, { start: { dateTime: '2026-03-10T12:00:00' }, end: { dateTime: '2026-03-10T13:00:00' } }),
    raw('untitled', ME, { summary: '(no title)', start: { dateTime: '2026-03-10T14:00:00' }, end: { dateTime: '2026-03-10T15:00:00' } }),
  ] });
  const ids = (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code}.map(e => e.id))`, box));
  assert.deepEqual(ids("calEntriesOn('2026-03-10')"), ['own', 'other', 'untitled']);
  assert.deepEqual(ids("calEntriesOn('2026-03-10', { sources: { google: true, tasks: false, countdowns: false, declined: false } })"), ['own']);
  assert.deepEqual(ids("calEntriesOn('2026-03-10', { sources: { google: true, tasks: false, countdowns: false }, mine: false })"), ['own', 'other', 'untitled'], 'opt.mine overrides');
  assert.equal(vm.runInContext("calEventUntitled({ summary: '(no title)' })", box), true);
  assert.equal(vm.runInContext("calEventUntitled({ summary: 'Team sync' })", box), false);
});
