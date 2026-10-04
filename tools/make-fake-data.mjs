#!/usr/bin/env node
// tools/make-fake-data.mjs - realistic FAKE demo data: tasks, people,
// countdowns, a calendar and an inbox snapshot, and a finance analysis.
// Every name, address, merchant and amount is invented (emails use the
// reserved example.com/.org domains). Used by first-run onboarding ("Load
// demo data"), tests, screenshots and load tests.
//
//   node tools/make-fake-data.mjs <dest-data-dir> [--tasks N] [--seed N] [--force] [--no-finance] [--user "Alex"]
//
//   --tasks N     how many tasks (default 72; e.g. 2000 for a load test)
//   --seed N      a different (but repeatable) set of data
//   --force       replace an existing state in <dest> (a copy is kept in state/backups/)
//   --no-finance  skip the finance folder
//   --user NAME   the name in config.json (default "Alex"; never overwrites a set name)
//   --today DATE  pretend today is DATE (YYYY-MM-DD), e.g. for screenshots that match a mockup
//
// Then:  node serve.mjs --data-dir <dest> --port <yours> --no-open
// Node stdlib only.

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { atomicWrite, withLock, writeJson, readJson, isInside } from '../lib/fsutil.mjs';
import { argValue, ensureDataDir, REPO_ROOT } from '../lib/datadir.mjs';

const isInsideRepo = (p) => isInside(REPO_ROOT, resolve(p));

// ─── Deterministic randomness ─────────────────────────────────────────────
function rng(seed) {
  let a = (Number(seed) || 1) >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; },
  };
}
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function localStamp(d) {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}

// ─── The cast (all invented) ──────────────────────────────────────────────
export const DEMO_STREAMS = [
  { id: 'work', label: 'Work', color: '#4f46e5', order: 0, archived: false },
  { id: 'launch', label: 'Product launch', color: '#db2777', order: 1, archived: false },
  { id: 'learning', label: 'Learning', color: '#059669', order: 2, archived: false },
  { id: 'home', label: 'Home & admin', color: '#0891b2', order: 3, archived: false },
  { id: 'health', label: 'Health', color: '#ea580c', order: 4, archived: false },
];
export const DEMO_PEOPLE = [
  { id: 'priya', name: 'Priya Shah', email: 'priya.shah@example.com', role: 'Manager', org: 'Northwind Labs', group: 'Work', color: '#4f46e5', aliases: ['Priya'] },
  { id: 'tom', name: 'Tom Becker', email: 'tom.becker@example.com', role: 'Product designer', org: 'Northwind Labs', group: 'Work', color: '#db2777', aliases: ['Tom'] },
  { id: 'lena', name: 'Lena Ortiz', email: 'lena.ortiz@example.com', role: 'Engineer', org: 'Northwind Labs', group: 'Work', color: '#059669', aliases: ['Lena'] },
  { id: 'marcus', name: 'Marcus Chen', email: 'marcus@example.org', role: 'Client lead', org: 'Harbor & Co', group: 'Clients', color: '#ea580c', aliases: ['Marcus'] },
  { id: 'ana', name: 'Dr Ana Silva', email: 'ana.silva@example.org', role: 'Mentor', org: 'Easton University', group: 'Personal', color: '#0891b2', aliases: ['Ana'] },
  { id: 'jordan', name: 'Jordan Lee', email: 'jordan.lee@example.net', role: 'Friend', group: 'Personal', color: '#7c3aed', aliases: ['Jordan'] },
];
// Who is at which recurring demo meeting (so People shows "Next meeting" / "Last contact").
const DEMO_ATTENDEES = {
  '1:1': ['priya', 'tom'], 'Design review': ['tom', 'lena'], 'Client': ['marcus'], 'Dinner with Jordan': ['jordan'], 'Lunch with Ana': ['ana'],
};
// The demo's calendars (one Google account that also sees a team and a family calendar).
export const DEMO_CALENDARS = [
  { id: 'you@example.com', name: 'Personal', color: 'blue', primary: true },
  { id: 'demo-work@group.calendar.google.com', name: 'Work', color: 'violet' },
  { id: 'demo-clients@group.calendar.google.com', name: 'Clients', color: 'green' },
  { id: 'demo-family@group.calendar.google.com', name: 'Family', color: 'teal' },
];
const TAGS = ['meeting', 'email', 'review', 'writing', 'research', 'errand', 'finance', 'waiting', 'quick', 'deep-work'];

// [title, stream, tags, people, detail?, subtasks?]
const SEED_TASKS = [
  ['Prepare launch checklist', 'launch', ['writing'], ['tom'], 'Pull together everything that must be true before launch day.', ['List open bugs', 'Confirm pricing page copy', 'Book the announcement slot']],
  ['Review landing page copy', 'launch', ['review'], ['tom'], 'Second pass on the hero and FAQ sections.'],
  ['Send beta invite emails', 'launch', ['email'], [], null, ['Export the waitlist', 'Write the invite', 'Send the first 50']],
  ['Plan launch-day social posts', 'launch', ['writing'], [], null],
  ['Fix onboarding drop-off on step 3', 'launch', ['deep-work'], ['lena'], 'Analytics show a 40% drop at the workspace step.'],
  ['Record product demo video', 'launch', ['deep-work'], ['tom'], null, ['Write a script', 'Record', 'Edit to under 2 minutes']],
  ['Weekly 1:1 with Priya', 'work', ['meeting'], ['priya'], 'Agenda: launch status, hiring, holiday dates.'],
  ['Draft Q4 roadmap', 'work', ['writing', 'deep-work'], ['priya'], null, ['Collect team input', 'Rank by impact', 'Share draft']],
  ['Reply to Marcus about the contract renewal', 'work', ['email'], ['marcus']],
  ['Prepare client workshop slides', 'work', ['writing'], ['marcus'], null, ['Outline', 'Design pass', 'Rehearse']],
  ['Review Lena\'s pull request on search', 'work', ['review'], ['lena']],
  ['Update the team wiki with release notes', 'work', ['writing']],
  ['Interview candidate for the design role', 'work', ['meeting'], ['tom']],
  ['Waiting on legal sign-off for the new terms', 'work', ['waiting'], ['priya']],
  ['Send Sam Rivera the workshop agenda', 'work', ['email'], []],
  // a little tag mess on purpose, so the tag clean-up has something to suggest
  ['Book the room for the planning session', 'work', ['meetings'], []],
  ['Agenda for the partner call', 'work', ['mtg'], []],
  ['Second look at the help-centre articles', 'launch', ['reviews'], []],
  ['Ask Noor Haddad for the pricing research', 'launch', ['research'], []],
  ['Expense report for the September trip', 'work', ['finance', 'quick']],
  ['Clean up the shared drive', 'work', ['quick']],
  ['Read "Designing Data-Intensive Applications" ch. 5', 'learning', ['research']],
  ['Finish the statistics course module 4', 'learning', ['deep-work']],
  ['Monthly catch-up with Ana', 'learning', ['meeting'], ['ana'], 'Bring: career questions, talk proposal.'],
  ['Write a blog post about the redesign', 'learning', ['writing'], [], null, ['Outline', 'First draft', 'Edit and publish']],
  ['Submit a talk proposal for the autumn meetup', 'learning', ['writing'], ['ana']],
  ['Practise Spanish (20 minutes)', 'learning', ['quick']],
  ['Renew car insurance', 'home', ['finance', 'errand']],
  ['Book boiler service', 'home', ['errand']],
  ['File receipts for tax return', 'home', ['finance']],
  ['Pay council tax', 'home', ['finance', 'quick']],
  ['Plan Jordan\'s birthday dinner', 'home', ['errand'], ['jordan'], null, ['Pick a restaurant', 'Book a table for 6', 'Order a cake']],
  ['Return the borrowed drill to Jordan', 'home', ['errand', 'quick'], ['jordan']],
  ['Sort out the spare room', 'home', []],
  ['Compare broadband deals', 'home', ['research', 'finance']],
  ['Dentist check-up', 'health', ['errand']],
  ['Book a physio appointment', 'health', ['quick']],
  ['Run 5k', 'health', []],
  ['Meal-prep for the week', 'health', []],
  ['Order new running shoes', 'health', ['errand', 'quick']],
];
const VERBS = ['Draft', 'Review', 'Plan', 'Update', 'Fix', 'Research', 'Schedule', 'Follow up on', 'Prepare', 'Summarise', 'Check', 'Write'];
const OBJECTS = ['the pricing page', 'the onboarding emails', 'the analytics dashboard', 'the support macros', 'the hiring plan', 'the budget sheet',
  'the release notes', 'the partner FAQ', 'the user interviews', 'the accessibility audit', 'the API docs', 'the newsletter', 'the travel booking',
  'the team offsite', 'the vendor invoices', 'the style guide', 'the backlog', 'the feedback survey', 'the sprint retro', 'the help centre'];

export function buildFakeData({ today = new Date(), seed = 7, tasks: nTasks = 72, userName = 'Alex', currency = 'GBP' } = {}) {
  const r = rng(seed);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const now = t0.getTime();
  const state = {
    custom: [], statuses: {}, notes: {}, pinned: {}, completionLog: {}, taskActivity: {}, customOrder: {},
    bin: { tasks: [], notes: [] }, people: DEMO_PEOPLE.map(p => ({ ...p, aliases: [...p.aliases] })), peopleNotes: {},
    countdowns: [
      { id: 'cd-demo-launch', label: 'Product launch', date: iso(addDays(t0, 34)), icon: 'rocket', color: '#db2777' },
      { id: 'cd-demo-review', label: 'Quarterly review', date: iso(addDays(t0, 12)), icon: 'presentation', color: '#4f46e5' },
      { id: 'cd-demo-talk', label: 'Meetup talk', date: iso(addDays(t0, 58)), icon: 'award', color: '#059669' },
      { id: 'cd-demo-holiday', label: 'Summer holiday', date: iso(addDays(t0, 120)), icon: 'plane', color: '#0891b2' },
    ],
    streams: DEMO_STREAMS.map(s => ({ ...s })),
    quickTemplates: [
      { label: 'Follow-up email', title: 'Email re: ', stream: 'work', tags: ['email'], priority: 'p3' },
      { label: 'Errand', title: 'Pick up ', stream: 'home', tags: ['errand'], priority: 'p3' },
      { label: 'Daily review', title: 'Daily review + plan', stream: 'work', tags: [], priority: 'p3', daysAhead: 1, recurrence: 'daily' },
    ],
    taskTemplates: [], taskChat: {}, weeklyReviews: [], emailTriage: { emails: [], suggestions: [], lastFetched: 0, daysWindow: 7 },
    _demo: { seed, createdAt: new Date(now).toISOString() },
  };
  let idn = 0;
  const newId = () => `u-${now - 86400000 * 30 + (idn++) * 1000}-${(idn * 7919 % 46656).toString(36).padStart(3, '0')}`;
  const seenTitles = new Set();
  const specs = [];
  for (const s of SEED_TASKS) specs.push(s);
  let k = 0;
  while (specs.length < nTasks) {
    const v = VERBS[k % VERBS.length], o = OBJECTS[Math.floor(k / VERBS.length) % OBJECTS.length];
    const round = Math.floor(k / (VERBS.length * OBJECTS.length));
    specs.push([`${v} ${o}${round ? ` (${round + 1})` : ''}`, r.pick(['work', 'work', 'launch', 'learning', 'home']), r.chance(0.6) ? [r.pick(TAGS)] : [], r.chance(0.3) ? [r.pick(DEMO_PEOPLE).id] : []]);
    k++;
  }
  specs.length = Math.max(0, nTasks);
  specs.forEach((sp, i) => {
    const [title, stream, tags, people, detail, subs] = sp;
    if (seenTitles.has(title)) return;
    seenTitles.add(title);
    const id = newId();
    // due dates: a few overdue, many this fortnight, some later, some undated
    const roll = r.next();
    const due = roll < 0.12 ? addDays(t0, -r.int(1, 9)) : roll < 0.55 ? addDays(t0, r.int(0, 14)) : roll < 0.85 ? addDays(t0, r.int(15, 60)) : null;
    const isRec = /Weekly 1:1|Run 5k|Practise Spanish|Meal-prep/.test(title);
    const prio = /launch checklist|drop-off|roadmap|contract renewal|insurance/.test(title) ? 'p1' : r.pick(['p0', 'p2', 'p3', 'p3', 'p2', 'p0']);
    const task = {
      id, title, dueDate: due ? iso(due) : null, priority: prio, tags: [...tags], stream,
      detail: detail || '', subtasks: (subs || []).map((st, j) => ({ id: `${id}-s${j}`, title: st, done: j === 0 && r.chance(0.5), ts: now })),
      recurrence: isRec ? (/Practise/.test(title) ? 'daily' : 'weekly') : 'none', people: [...(people || [])],
      createdAt: now - r.int(2, 40) * 86400000,
    };
    state.custom.push(task);
    const done = i >= SEED_TASKS.length ? r.chance(0.25) : (due && due < t0 && r.chance(0.5));
    if (done && !isRec) {
      state.statuses[id] = 'done';
      state.completionLog[id] = [now - r.int(0, 6) * 86400000 - r.int(1, 8) * 3600000];
    } else if (r.chance(0.08)) state.statuses[id] = 'doing';
    if (i < 3) state.pinned[id] = true;
    if (r.chance(0.12)) state.notes[id] = [{ id: `n-${id}`, ts: now - 86400000, text: r.pick(['Asked for an update; waiting to hear back.', 'Half done; the rest needs a quiet morning.', 'Moved because the client meeting slipped.']) }];
  });

  // A few notes on people (the People panel shows them as cards)
  const pNote = (pid, daysAgo, text) => {
    const p = state.people.find(x => x.id === pid);
    if (p) (p.notes = p.notes || []).push({ id: `pn-${pid}-${daysAgo}`, ts: now - daysAgo * 86400000, text });
  };
  pNote('priya', 8, 'Prefers one combined update rather than several small ones.');
  pNote('priya', 22, 'Away the last week of the month; send drafts before then.');
  pNote('marcus', 5, 'Renewal hinges on the reporting add-on.');

  // Calendar snapshot (same shape the Calendar connector writes): several
  // calendars, a week laid out like the calendar mockups (02 month, 07 week),
  // anchored on the Monday of this week so any weekday looks lived-in.
  const events = [];
  let en = 0;
  const monday = addDays(t0, -((t0.getDay() + 6) % 7));
  const dayOff = (week, dow) => Math.round((addDays(monday, week * 7 + dow) - t0) / 86400000);   // dow: 0 = Monday
  const ev = (day, h, m, mins, summary, extra = {}) => {
    const s = addDays(t0, day); s.setHours(h, m, 0, 0);
    const e = new Date(s.getTime() + mins * 60000);
    const { responses = {}, organizer, ...rest } = extra;
    const who = Object.entries(DEMO_ATTENDEES).find(([k]) => summary.includes(k));
    const attendees = who ? [{ email: 'you@example.com', self: true, responseStatus: 'accepted' }, ...who[1].map(pid => {
      const p = DEMO_PEOPLE.find(x => x.id === pid);
      return { email: p.email, name: p.name, responseStatus: responses[pid] || 'accepted', ...(organizer === pid ? { organizer: true } : {}) };
    })] : undefined;
    events.push({ id: `demo-ev-${en++}`, calendarId: DEMO_CALENDARS[0].id, summary, start: { dateTime: localStamp(s) }, end: { dateTime: localStamp(e) }, ...(attendees ? { attendees } : {}), ...rest });
  };
  const allDay = (day, days, summary, extra = {}) => {
    events.push({ id: `demo-ev-${en++}`, calendarId: DEMO_CALENDARS[0].id, summary, start: { date: iso(addDays(t0, day)) }, end: { date: iso(addDays(t0, day + days)) }, ...extra });
  };
  const [PERSONAL, WORK, CLIENTS, FAMILY] = DEMO_CALENDARS.map(c => ({ calendarId: c.id }));
  const meet = (code) => ({ hangoutLink: `https://meet.google.com/${code}`, conferenceData: { solutionName: 'Google Meet' } });
  // Every week: the team meeting, two stand-ups and the 1:1.
  for (let w = -1; w <= 4; w++) {
    ev(dayOff(w, 0), 10, 0, 60, 'Team meeting', { ...WORK, location: 'Room 2', recurringEventId: 'demo-team' });
    for (const d of [3, 4]) ev(dayOff(w, d), 9, 30, 30, 'Stand-up', { ...WORK, ...meet('abc-defg-hij'), recurringEventId: 'demo-standup' });
    ev(dayOff(w, 4), 11, 0, 60, '1:1 with Priya', { ...WORK, ...meet('kpr-qwmz-tud'), recurringEventId: 'demo-1to1', organizer: 'priya', responses: { tom: 'tentative' },
      description: 'Weekly check-in: launch status, blockers, anything for the roadmap.' });
  }
  // Last week, so the month and People's "last contact" have something behind today.
  ev(dayOff(-1, 1), 15, 0, 60, 'Design review', { ...WORK, location: 'Room 2' });
  ev(dayOff(-1, 2), 12, 30, 60, 'Lunch with Ana', { ...PERSONAL, location: 'The Corner Bistro' });
  // This week (the week mockup).
  ev(dayOff(0, 1), 10, 0, 30, 'Client check-in', { ...CLIENTS, ...meet('hbr-chck-inx') });
  ev(dayOff(0, 1), 15, 0, 90, 'Reading group', { ...WORK, location: 'Library, room 2.14' });
  ev(dayOff(0, 2), 13, 0, 60, 'Lunch talk: search ranking', { ...WORK, location: 'Auditorium' });
  ev(dayOff(0, 3), 15, 0, 60, 'Client sync', { ...CLIENTS, ...meet('hbr-sync-wkl') });
  ev(dayOff(0, 4), 14, 0, 60, 'Client call: pricing', { ...CLIENTS, ...meet('hbr-prce-cal') });
  ev(dayOff(0, 4), 16, 30, 60, 'Gym', { ...PERSONAL, location: 'FitLife' });
  ev(dayOff(0, 4), 19, 0, 90, 'Dinner with Jordan', { ...PERSONAL, location: 'Noodle House' });
  ev(dayOff(0, 5), 9, 0, 60, 'Parkrun', { ...PERSONAL, location: 'Riverside Park' });
  ev(dayOff(0, 6), 11, 0, 120, 'Family lunch', { ...FAMILY, location: 'Home' });
  allDay(dayOff(0, 5), 2, 'Family visit', FAMILY);
  // The weeks after.
  allDay(dayOff(1, 2), 1, 'Company open day', WORK);
  ev(dayOff(1, 4), 14, 0, 60, 'Design review', { ...WORK, location: 'Room 2' });
  allDay(dayOff(1, 5), 1, 'Jordan’s birthday', { ...FAMILY, eventType: 'birthday' });
  ev(dayOff(2, 2), 16, 0, 60, 'Workshop prep', CLIENTS);
  ev(dayOff(3, 1), 9, 0, 30, 'Dentist', { ...PERSONAL, location: 'Smile Dental' });
  ev(dayOff(3, 3), 15, 0, 90, 'Client workshop: Harbor & Co', { ...CLIENTS, location: 'Harbor & Co offices' });
  allDay(dayOff(3, 6), 3, 'Product conference', WORK);
  ev(dayOff(4, 5), 19, 0, 150, 'Concert', { ...PERSONAL, location: 'Town Hall' });
  events.sort((a, b) => String(a.start.dateTime || a.start.date).localeCompare(String(b.start.dateTime || b.start.date)));
  const calendar = { source: 'demo', fetchedAt: new Date(now).toISOString(), calendars: DEMO_CALENDARS.map(c => ({ ...c })), events };
  // An agenda on the 1:1 that is on today's week (the event panel shows it under "Agenda & notes").
  const oneToOne = events.find(e => e.summary === '1:1 with Priya' && e.start.dateTime.slice(0, 10) === iso(addDays(t0, dayOff(0, 4))));
  if (oneToOne) state.eventMeta = { [oneToOne.id]: { notes: '1. Launch checklist: walk through what is still open\n2. Q4 roadmap: who leads the first draft?', notesBy: 'Drafted from your open tasks with Priya Shah' } };
  // A task planned into this Friday afternoon (a dashed block in the week view).
  const planned = state.custom.find(t => t.title === 'Prepare client workshop slides');
  if (planned) Object.assign(planned, { dueDate: iso(addDays(t0, dayOff(0, 4))), dueTime: '15:15', estimate: 60, priority: 'p1' });

  // Inbox snapshot
  const mails = [
    ['Contract renewal: next steps', 'Marcus Chen <marcus@example.org>', 'Thanks for the call. Could you send the revised terms by Friday?'],
    ['Launch checklist comments', 'Tom Becker <tom.becker@example.com>', 'Left a few notes on the pricing section; mostly wording.'],
    ['Your talk proposal', 'Meetup Organisers <hello@example.org>', 'Thanks for submitting! We will confirm the line-up next week.'],
    ['Search PR ready for review', 'Lena Ortiz <lena.ortiz@example.com>', 'The indexing change is in; would love a second pair of eyes.'],
    ['Insurance renewal reminder', 'Safe Roads Insurance <renewals@example.net>', 'Your policy renews in 14 days. Review your cover online.'],
    ['Saturday?', 'Jordan Lee <jordan.lee@example.net>', 'Are we still on for dinner? I can book the place we liked.'],
  ];
  const inbox = { source: 'demo', fetchedAt: new Date(now).toISOString(), emails: mails.map(([subject, sender, snippet], i) => ({ id: `demo-mail-${i}`, subject, sender, snippet, date: new Date(now - i * 7 * 3600000).toISOString() })) };

  return { state, calendar, inbox, finance: buildFakeFinance({ r, t0, currency }), config: { userName } };
}

// ─── Finance: an analysis.json the Finances view can show (marked sample) ─
function buildFakeFinance({ r, t0, currency }) {
  const tx = [];
  const add = (d, m, c, a, memo) => tx.push({ d: iso(d), m, c, a: Math.round(a * 100) / 100, acct: 'demo-current', memo: memo || m.toUpperCase(), how: 'rule', bc: null, k: `demo-${tx.length}` });
  for (let day = -119; day <= 0; day++) {
    const d = addDays(t0, day), dom = d.getDate(), dow = d.getDay();
    if (dom === 25) add(d, 'Northwind Labs', 'Income', 3150, 'SALARY NORTHWIND LABS');
    if (dom === 1) add(d, 'Oak Lane Lettings', 'Rent', -1150);
    if (dom === 3) add(d, 'City Power & Water', 'Bills & utilities', -r.int(70, 110));
    if (dom === 8) add(d, 'StreamFlix', 'Subscriptions', -10.99);
    if (dom === 14) add(d, 'FitLife Gym', 'Fitness', -39);
    if (dom === 20) add(d, 'Skyline Broadband', 'Bills & utilities', -32);
    if (dow === 6 || dow === 3) add(d, r.pick(['Green Basket Market', 'FreshWay Foods']), 'Groceries', -r.int(18, 72) - r.next());
    if (dow >= 1 && dow <= 5 && r.chance(0.55)) add(d, 'Bean There Coffee', 'Eating out', -(2.6 + r.int(0, 3) * 0.5));
    if (dow >= 1 && dow <= 5 && r.chance(0.7)) add(d, 'Metro Transit', 'Transport', -2.8);
    if ((dow === 5 || dow === 6) && r.chance(0.5)) add(d, r.pick(['The Corner Bistro', 'Noodle House', 'Pizza Forno']), 'Eating out', -r.int(14, 48));
    if (r.chance(0.06)) add(d, r.pick(['Bookworm Books', 'Northstar Outdoor', 'Pixel Electronics', 'Homeware Hub']), 'Shopping', -r.int(12, 120));
    if (r.chance(0.03)) add(d, 'Transfer to savings', 'Internal transfers', -200, 'TRANSFER TO SAVINGS');
  }
  tx.sort((a, b) => b.d.localeCompare(a.d));
  const latest = tx.length ? tx[0].d : iso(t0);
  let bal = 2400;
  const history = [];
  for (let day = -61; day <= 0; day++) {
    const d = iso(addDays(t0, day));
    for (const t of tx) if (t.d === d) bal += t.a;
    history.push({ date: d, total: Math.round(bal * 100) / 100, accounts: { 'demo-current': Math.round(bal * 100) / 100 } });
  }
  const categories = ['Bills & utilities', 'Eating out', 'Fitness', 'Groceries', 'Income', 'Internal transfers', 'Rent', 'Shopping', 'Subscriptions', 'Transport', 'Uncategorised'];
  const analysis = {
    generated: new Date(t0).toISOString(), today: iso(t0), latest_transaction: latest, stale_days: 0, sample: true,
    transactions: tx, categories, exclude_from_spending: ['Income', 'Internal transfers'],
    balances: [{ acct: 'demo-current', name: 'Everyday account', kind: 'current', balance: Math.round(bal * 100) / 100, currency, asOf: iso(t0) }],
    balance_history: history, recurring: [], flags: [], uncategorised_merchants: [],
    counts: { total: tx.length, by_how: { rule: tx.length } },
  };
  // The store the built-in pipeline (lib/finance/pipeline.mjs) reads, oldest
  // first, plus merchant overrides so it categorises exactly as above.
  const csv = ['date,amount,account,subcategory,memo,source', ...[...tx].reverse().map(t => [t.d, t.a.toFixed(2), 'demo-current', '', `"${t.memo.replace(/"/g, '""')}"`, 'demo'].join(','))].join('\r\n') + '\r\n';
  const overrides = {};
  for (const t of tx) if (t.c !== 'Income') overrides[t.memo.toUpperCase()] = t.c;
  const balances = { asOf: iso(t0), accounts: analysis.balances };
  return { analysis, csv, overrides, balances, history };
}

// Marks a finance folder as demo data (the pipeline then flags its analysis
// as a sample, and a later demo reset may replace it).
const DEMO_MARKER = '.demo-data';

/**
 * Write the fake data into a data folder. Refuses to replace an existing
 * state with tasks unless force. opts.writeState(obj) lets the server write
 * the state through its store (live sync, versioning); otherwise the file
 * is written under the state lock with a bumped _lastSave.
 */
export async function writeFakeData(dataDir, { tasks = 72, seed = 7, force = false, finance = true, replaceFinance = false, financeDir, userName, today, writeState, setConfig, log = () => {} } = {}) {
  const p = await ensureDataDir(dataDir);
  const cfg = await readJson(p.config, { fallback: {} });
  const data = buildFakeData({ tasks, seed, ...(today ? { today } : {}), userName: (cfg && cfg.userName) || userName || 'Alex', currency: (cfg && cfg.currency) || 'GBP' });
  const cur = existsSync(p.stateFile) ? await readJson(p.stateFile, { fallback: null }) : null;
  if (cur && Array.isArray(cur.custom) && cur.custom.length && !force) {
    throw Object.assign(new Error('this data folder already has tasks (use --force to replace them; a copy is kept)'), { status: 409 });
  }
  if (writeState) await writeState(data.state);
  else {
    await withLock(p.stateFile, async () => {
      let prevSave = 0;
      if (existsSync(p.stateFile)) {
        const prevText = readFileSync(p.stateFile, 'utf8');
        try { prevSave = Number(JSON.parse(prevText)._lastSave) || 0; } catch { /* keep 0 */ }
        await atomicWrite(join(p.stateBackups, `pre-demo-${new Date().toISOString().replace(/[:.]/g, '-')}.json`), prevText);
      }
      data.state._lastSave = Math.max(Date.now(), prevSave + 1);
      await atomicWrite(p.stateFile, JSON.stringify(data.state, null, 1));
    });
  }
  await writeJson(p.calendarFile, data.calendar);
  {
    // The Calendar page reads events.json (lib/calendar.mjs). Write the demo's
    // calendars and events there too, but never over events read from a real calendar.
    const { calendarFiles, normaliseEvent, normaliseCalendar } = await import('../lib/calendar.mjs');
    const f = calendarFiles(p);
    const cur = existsSync(f.events) ? await readJson(f.events, { fallback: null }) : null;
    if (!cur || cur.source === 'demo' || cur.source === 'snapshot' || !(cur.events || []).length) {
      const evs = data.calendar.events.map(e => normaliseEvent(e, e.calendarId)).filter(Boolean);
      const days = evs.map(e => e.start.date || e.start.dateTime.slice(0, 10)).sort();
      const calendars = data.calendar.calendars.map(c => ({ ...normaliseCalendar(c), color: c.color, count: evs.filter(e => e.calendarId === c.id).length }));
      await writeJson(f.events, {
        version: 2, source: 'demo', fetchedAt: data.calendar.fetchedAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        window: days.length ? { from: days[0], to: days[days.length - 1] } : null, count: evs.length, calendars, events: evs,
      }, { trailingNewline: true });
    }
  }
  await writeJson(p.inboxFile, data.inbox);
  // Sources: the demo calendar and inbox are marked as demo data, so nothing ever
  // fetches real events, mail or transactions into a demo folder (lib/sources.mjs).
  {
    const { demoSources, mutateSources } = await import('../lib/sources.mjs');
    // Add a demo source for each capability that has none yet (never replaces a real one).
    await mutateSources(p.root, (list) => {
      for (const d of demoSources()) if (!list.some(s => s.capability === d.capability && (d.kind !== 'csv' ? s.kind !== 'csv' : s.kind === 'csv'))) list.push(d);
    });
  }
  let financeFiles = 0;
  const fin = financeDir ? resolve(financeDir) : p.finance;
  if (finance) {
    const sys = join(fin, '_system');
    const oldStub = existsSync(join(sys, 'spend.py')) && readFileSync(join(sys, 'spend.py'), 'utf8').includes('Demo placeholder');
    const isDemo = oldStub || existsSync(join(sys, DEMO_MARKER));
    // Real data = any store or analysis that is not ours (never overwritten).
    const hasReal = !isDemo && (existsSync(join(sys, 'transactions.csv')) || existsSync(join(sys, 'analysis.json')));
    if (hasReal && !replaceFinance) {
      log('  finance: left alone (a real finance folder is already set up)');
    } else {
      const { runPipeline, defaultRules } = await import('../lib/finance/pipeline.mjs');
      const rules = defaultRules();
      rules.merchant_overrides = data.finance.overrides;
      await atomicWrite(join(sys, DEMO_MARKER), 'Demo data written by tools/make-fake-data.mjs.\n');
      await atomicWrite(join(sys, 'transactions.csv'), data.finance.csv);
      await writeJson(join(sys, 'rules.json'), rules);
      await writeJson(join(sys, 'balances.json'), data.finance.balances);
      await writeJson(join(sys, 'balances_history.json'), data.finance.history);
      for (const f of ['bank_categories.json', 'summary.json']) await import('node:fs/promises').then(m => m.rm(join(sys, f), { force: true }));
      await runPipeline(fin, { today: data.finance.analysis.today, sample: true });
      financeFiles = 5;
    }
  }
  if (!cfg || !cfg.userName) {
    const patch = { userName: data.config.userName };
    if (setConfig) await setConfig(patch);
    else await writeJson(p.config, { ...(cfg || {}), ...patch }, { trailingNewline: true });
  }
  log(`  demo data: ${data.state.custom.length} tasks, ${data.state.people.length} people, ${data.state.countdowns.length} countdowns, ${data.calendar.events.length} events, ${data.inbox.emails.length} emails${financeFiles ? `, ${data.finance.analysis.transactions.length} transactions` : ''}`);
  return { tasks: data.state.custom.length, people: data.state.people.length, countdowns: data.state.countdowns.length, events: data.calendar.events.length, emails: data.inbox.emails.length, transactions: financeFiles ? data.finance.analysis.transactions.length : 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  const valued = ['--tasks', '--seed', '--user', '--today'];
  const dest = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && valued.includes(argv[i - 1])));
  if (!dest) { console.error('usage: node tools/make-fake-data.mjs <dest-data-dir> [--tasks N] [--seed N] [--force] [--no-finance] [--user NAME] [--today YYYY-MM-DD]'); process.exit(2); }
  const todayArg = argValue(argv, '--today');
  if (todayArg && !/^\d{4}-\d{2}-\d{2}$/.test(todayArg)) { console.error('  --today wants a date like 2026-10-02'); process.exit(2); }
  if (isInsideRepo(dest) && !argv.includes('--force')) { console.error('  Refusing to write demo data inside the app folder without --force (it would land in data/).'); process.exit(2); }
  console.log(`\n  Writing FAKE demo data to ${resolve(dest)}`);
  writeFakeData(dest, {
    tasks: Math.max(0, Math.min(50000, Number(argValue(argv, '--tasks')) || 72)), seed: Number(argValue(argv, '--seed')) || 7,
    force: argv.includes('--force'), finance: !argv.includes('--no-finance'), userName: argValue(argv, '--user'), log: console.log,
    ...(todayArg ? { today: new Date(`${todayArg}T12:00:00`) } : {}),
  }).then(() => console.log(`\n  Done. Start it with:\n     node serve.mjs --data-dir "${resolve(dest)}" --port <your port> --no-open\n`))
    .catch(e => { console.error(`\n  ${e.message}\n`); process.exitCode = 1; });
}

export { REPO_ROOT };
