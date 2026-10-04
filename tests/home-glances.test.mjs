// Home glances (HB4): the Money glance (homeFinGlance) against a hand-checked
// fixture and against the Finances page's own model (src/finance/25-money-model.js,
// the Overview's usual pace in month mode, and its recurring rules), the
// monotone sparkline path, and People today (homePeopleToday): who you meet
// (attendee addresses, display names, names in titles), Focus people, why it
// matters, who is waiting on you, and who never shows up. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');

/** The glance files in a VM: the people-link logic, the kit, and the three widgets (registration stubbed). */
function box() {
  const ctx = { console, registerHomeWidget() {}, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {} }, window: {}, Intl, Date, Math };
  vm.createContext(ctx);
  vm.runInContext(['52-people-link.js', '12-home-glances.js', '12-home-w-finance.js', '12-home-w-people.js', '12-home-w-waiting.js'].map(src).join('\n;\n'), ctx, { filename: 'glances.js' });
  return ctx;
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.006, `${msg}: ${a} vs ${b}`);

/* ---------- a finance fixture (made up): Jun 1 - Oct 7 2026; "today" is Wed 7 Oct ---------- */
const TODAY = '2026-10-07';
function analysis() {
  const tx = [];
  const add = (d, m, c, a) => tx.push({ d, m, c, a, k: 'k' + tx.length });
  const iso = (n) => new Date(n * 864e5).toISOString().slice(0, 10);
  const start = Date.UTC(2026, 5, 1) / 864e5, end = Date.UTC(2026, 9, 7) / 864e5;
  for (let n = start; n <= end; n++) {
    const d = iso(n), dom = +d.slice(8, 10), dow = new Date(n * 864e5).getUTCDay();
    if (dom === 1) add(d, 'Oak Lane Lettings', 'Housing', -800);
    add(d, 'Corner Cafe', 'Eating out', -3);
    if (dom === 15) add(d, 'StreamCo', 'Entertainment', -10);
    if (dow === 6) add(d, 'Greenleaf Grocer', 'Groceries', -40);
    if (dom === 28) add(d, 'Employer Ltd', 'Income', 2500);
    if (d === '2026-10-06') add(d, 'Greenleaf Grocer', 'Groceries', 5);                 // a refund counts against spending
    if (d === TODAY) { add(d, 'Bookshop', 'Shopping', -12.5); add(d, 'Own savings', 'Internal transfers', -100); }
  }
  tx.push({ d: 'not a date', m: 'x', c: 'Shopping', a: -999 }, { d: TODAY, m: 'x', c: 'Shopping', a: 'NaN' });
  return { today: TODAY, transactions: tx, exclude_from_spending: ['Income', 'Internal transfers'], budgets: { Groceries: 200, 'Eating out': 100, Bad: -5 }, recurring: [] };
}

test('the Money glance: today, this week and this month against the usual pace (hand-checked)', () => {
  const g = plain(box().homeFinGlance(analysis(), { today: TODAY, weekStart: 1 }));
  // Today: a coffee and a book; the transfer and the junk rows are not spending.
  assert.deepEqual(g.today, { iso: TODAY, spent: 15.5, count: 2, usual: 9.43, diff: 6.07 });
  // This week (Mon 5 - Sun 11 Oct): 3 + (3 - 5 refund) + 15.5.
  assert.equal(g.week.start, '2026-10-05'); assert.equal(g.week.end, '2026-10-11'); assert.equal(g.week.day, 2);
  assert.equal(g.week.spent, 16.5);
  assert.equal(g.week.n, 8, 'eight earlier weeks, all inside the data');
  assert.equal(g.week.usualNow, 9, 'median of the earlier weeks to Wednesday');
  assert.equal(g.week.usualEnd, 66, 'median of the earlier whole weeks (61 or 71; two rent weeks are outliers)');
  assert.equal(g.usualDay, 9.43, 'a usual day = a usual week / 7');
  // This month: rent, seven coffees, one shop, the refund and the book.
  assert.equal(g.month.start, '2026-10-01'); assert.equal(g.month.end, '2026-10-31'); assert.equal(g.month.len, 31); assert.equal(g.month.day, 6);
  assert.equal(g.month.spent, 868.5);
  assert.equal(g.month.n, 4, 'June to September (May starts before the data)');
  assert.equal(g.month.usualNow, 861);
  assert.equal(g.month.usualEnd, 1061.5, 'shorter months hold their total; median of 1060, 1060, 1063, 1103');
  // 30 days, today last, with the 7-day average.
  assert.equal(g.days.length, 30);
  assert.deepEqual(g.days.at(-1), { iso: TODAY, v: 15.5, count: 2, avg: 124.07 });
  assert.deepEqual(g.days.at(-2), { iso: '2026-10-06', v: -2, count: 1, avg: 122.29 }, '(3 + 803 + 3 + 43 + 3 + 3 - 2) / 7');
  assert.equal(g.days[0].iso, '2026-09-08');
  // Categories this month, biggest first, with their share of spending.
  assert.deepEqual(g.cats.map(c => [c.c, c.v]), [['Housing', 800], ['Groceries', 35], ['Eating out', 21], ['Shopping', 12.5]]);
  near(g.cats[0].share, 800 / 868.5, 'share');
  // The three newest payments, the page's order (newest day first, then file order).
  assert.deepEqual(g.recent.map(t => [t.iso, t.m, t.s]), [[TODAY, 'Corner Cafe', 3], [TODAY, 'Bookshop', 12.5], ['2026-10-06', 'Corner Cafe', 3]]);
  // Regular payments due in the next 14 days (rent is due on 31 Oct: later).
  assert.deepEqual(g.bills.map(b => [b.m, b.iso, b.amount, b.freq, b.due]), [['Greenleaf Grocer', '2026-10-10', 40, 'Weekly', false], ['StreamCo', '2026-10-15', 10, 'Monthly', false]]);
  assert.equal(g.budgetTotal, 300, 'positive budgets only');
  assert.equal(g.asOf, TODAY);
  assert.ok(g.key.startsWith(TODAY + '|'));
});

test('the Money glance matches the Finances page model (usual pace in month mode, recurring payments)', async () => {
  let MBM;
  try { ({ MBM } = await import('../lib/finance/brief.mjs')); } catch { MBM = null; }
  if (!MBM || typeof MBM.compute !== 'function') return;          // the Finances model is not in this tree
  const a = analysis();
  const g = plain(box().homeFinGlance(a, { today: TODAY }));
  const input = MBM.fromAnalysis(a, {});
  const B = MBM.compute(input, { mode: 'month' });
  assert.equal(B.cycle.mode, 'month');
  near(g.month.spent, B.spent, 'spent this month = the Overview\'s spent so far');
  near(g.month.usualNow, B.usual, 'usual by now');
  near(g.month.usualEnd, B.usualEnd, 'usual whole month');
  assert.equal(g.month.n, B.pace.n, 'months compared');
  // Bills: the page's recurring list, due in the Upcoming window.
  const ups = MBM.recurring(input.tx, a.recurring, input.anchor).filter(r => r.active && r.next >= input.anchor - 3 && r.next <= input.anchor + 14)
    .sort((p, q) => p.next - q.next).map(r => [r.m, MBM.util.diso(r.next), Math.round(r.typical * 100) / 100]);
  assert.deepEqual(g.bills.map(b => [b.m, b.iso, b.amount]), ups);
  // A different "today" moves everything with it.
  const g2 = box().homeFinGlance(Object.assign({}, a, { today: '2026-09-20' }), { today: '2026-09-20' });
  const B2 = MBM.compute(MBM.fromAnalysis(Object.assign({}, a, { today: '2026-09-20', transactions: a.transactions.filter(t => String(t.d) <= '2026-09-20') }), {}), { mode: 'month' });
  const g2b = box().homeFinGlance(Object.assign({}, a, { transactions: a.transactions.filter(t => String(t.d) <= '2026-09-20') }), { today: '2026-09-20' });
  near(g2b.month.spent, B2.spent, 'spent (20 Sep)');
  near(g2b.month.usualNow, B2.usual, 'usual by now (20 Sep)');
  assert.ok(g2.month.spent >= g2b.month.spent, 'later rows in the month window count, as on the page');
});

test('the Money glance: no analysis, no rows, a week starting on Sunday, no earlier periods', () => {
  const b = box();
  assert.equal(b.homeFinGlance(null), null);
  assert.equal(b.homeFinGlance({}), null);
  const empty = plain(b.homeFinGlance({ transactions: [] }, { today: TODAY }));
  assert.equal(empty.count, 0);
  assert.equal(empty.month.spent, 0); assert.equal(empty.month.usualNow, null); assert.equal(empty.usualDay, null);
  assert.deepEqual(empty.recent, []); assert.deepEqual(empty.bills, []);
  const sun = plain(b.homeFinGlance(analysis(), { today: TODAY, weekStart: 0 }));
  assert.equal(sun.week.start, '2026-10-04'); assert.equal(sun.week.day, 3);
  assert.equal(sun.week.spent, 3 + 16.5, 'Sunday 4 Oct joins the week');
  // Data from Tue 29 Sep: no earlier month or whole week; a usual day is the average day so far (8 days).
  const fresh = analysis(); fresh.transactions = fresh.transactions.filter(t => String(t.d) >= '2026-09-29');
  const f = plain(b.homeFinGlance(fresh, { today: TODAY }));
  assert.equal(f.month.n, 0); assert.equal(f.month.usualEnd, null);
  assert.equal(f.week.n, 0, 'the week of 28 Sep starts before the data');
  assert.equal(f.usualDay, Math.round((3 + 3 + 803 + 3 + 43 + 3 + 3 - 2) / 8 * 100) / 100, 'the average day so far');
  // Under a week of data: no usual day at all.
  const newer = analysis(); newer.transactions = newer.transactions.filter(t => String(t.d) >= '2026-10-03');
  assert.equal(b.homeFinGlance(newer, { today: TODAY }).usualDay, null);
});

test('the sparkline path is a monotone cubic: flat stays flat, nothing overshoots the data', () => {
  const b = box();
  assert.equal(b.homeFinSmoothPath([]), '');
  assert.equal(b.homeFinSmoothPath([[0, 5]]), 'M0,5');
  const pts = [[0, 40], [10, 40], [20, 10], [30, 10], [40, 44], [50, 20]];
  const d = b.homeFinSmoothPath(pts);
  assert.match(d, /^M0,40C/);
  const nums = d.replace(/^M/, '').split(/[C ]/).filter(Boolean).map(p => p.split(',').map(Number));
  assert.equal(nums.length, 1 + 3 * (pts.length - 1));
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, c1, c2, p1] = [nums[3 * i], nums[3 * i + 1], nums[3 * i + 2], nums[3 * i + 3]];
    const lo = Math.min(p0[1], p1[1]) - 1e-9, hi = Math.max(p0[1], p1[1]) + 1e-9;
    assert.ok(c1[1] >= lo && c1[1] <= hi && c2[1] >= lo && c2[1] <= hi, `segment ${i} stays inside its own range`);
    assert.ok(c1[0] > p0[0] && c2[0] < p1[0], 'x moves forward');
  }
  assert.deepEqual(nums.slice(1, 3).map(p => p[1]), [40, 40], 'a flat run stays flat (no dip)');
});

/* ---------- People today ---------- */
const PEOPLE = [
  { id: 'me', name: 'Sam Example', self: true, email: 'me@example.org' },
  { id: 'hannah', name: 'Hannah Okafor', email: 'hannah@example.org', aliases: ['Han'] },
  { id: 'tomas', name: 'Tomás Reyes', email: 'tomas@example.org' },
  { id: 'priya', name: 'Priya Natarajan', email: 'priya@example.org' },
  { id: 'owen', name: 'Owen Hughes', email: 'owen@example.org' },
  { id: 'clara', name: 'Clara Moreau', email: 'clara@example.org' },
  { id: 'old', name: 'Jordan Smith', email: 'jordan@example.org', inactive: true },
  { id: 'registry', name: 'Student Registry', kind: 'mailbox', email: 'registry@example.org' },
];
const ev = (id, title, start, end, attendees, more) => Object.assign({ id, title, date: TODAY, start, end, allDay: false, location: '', attendees: attendees || [] }, more || {});
// Local noon (the page reads createdAt on this computer's clock): UTC noon is already the next day at +12 to +14.
const daysAgo = (n) => new Date(2026, 9, 7 - n, 12).getTime();

test('People today: who you meet (addresses, display names), Focus people, why it matters, in time order', () => {
  const b = box();
  const events = [
    ev('e1', 'Coffee catch-up', '10:30', '11:15', [{ email: 'me@example.org', self: true }, { email: 'HANNAH@example.org' }]),
    ev('e2', 'Report review', '13:00', '14:00', [{ name: 'Tomás Reyes' }]),
    ev('e3', 'Lab stand-up', '09:00', '09:30', [{ email: 'jordan@example.org' }, { email: 'owen@example.org' }, { email: 'registry@example.org' }]),
    ev('e4', 'Clara away', null, null, [], { allDay: true }),
    ev('e5', 'Dinner', '19:00', '21:00', [{ email: 'priya@example.org' }]),
    ev('e6', 'Board call', '15:00', '16:00', [{ email: 'clara@example.org' }], { declined: true }),
    Object.assign(ev('e7', 'Priya’s birthday', null, null, []), { date: '2026-10-08', allDay: true }),
  ];
  const tasks = [
    { id: 't1', title: 'Figure 4 redraft', people: ['tomas'], due: '2026-10-09' },
    { id: 't2', title: 'Chapter 4 comments', people: ['hannah'], waiting: true, waitingOn: 'hannah' },
    { id: 't3', title: 'Reply to Owen about the dataset link', people: ['owen'], createdAt: daysAgo(6) },
    { id: 't4', title: 'Grant budget', people: ['clara'], focus: true, focusRank: 0 },
    { id: 't5', title: 'Send the form', people: ['registry'], focus: true, focusRank: 1 },
    { id: 't6', title: 'Something with the archived person', people: ['old'], focus: true },
  ];
  const r = plain(b.homePeopleToday({ people: PEOPLE, events, tasks, today: TODAY, nowHM: '09:48', locale: 'en-GB', lastSeen: { hannah: '2026-09-16' } }));
  assert.deepEqual(r.rows.map(x => x.id), ['hannah', 'tomas', 'priya', 'clara', 'owen'], 'upcoming meetings by time, then Focus people, then meetings already over');
  const by = Object.fromEntries(r.rows.map(x => [x.id, x]));
  assert.equal(by.hannah.time, '10:30'); assert.equal(by.hannah.meeting.title, 'Coffee catch-up');
  assert.deepEqual(by.hannah.why.map(w => [w.k, w.pre + w.b + w.post]), [['ask', 'Ask about Chapter 4 comments'], ['seen', 'Last seen 3 weeks ago']]);
  assert.equal(by.tomas.time, '13:00', 'a display name with an accent matches');
  assert.deepEqual(by.tomas.why[0], { k: 'promised', pre: 'You promised ', b: 'Figure 4 redraft', post: ' by Friday' });
  assert.equal(by.priya.why[0].b, 'Birthday tomorrow');
  assert.equal(by.clara.meeting, null, 'Clara: no meeting (all-day "away" and a declined call do not count)');
  assert.deepEqual(by.clara.focus, [{ id: 't4', title: 'Grant budget' }]);
  assert.equal(by.owen.past, true); assert.equal(by.owen.time, '09:00');
  assert.deepEqual(by.owen.owed, { task: { id: 't3', title: 'Reply to Owen about the dataset link' }, days: 6, late: false }, 'waiting on you, shown on his row');
  assert.equal(r.owed, null, 'no separate card when that person already has a row');
  for (const id of ['me', 'old', 'registry']) assert.ok(!r.rows.some(x => x.id === id), id + ' never shows up');
  for (const x of r.rows) assert.ok(x.why.length <= 2);
});

test('People today: names in event titles, the separate "waiting on you" card, nobody today', () => {
  const b = box();
  const tasks = [
    { id: 'a', title: 'Respond to Clara about the budget', people: ['clara'], due: '2026-10-04' },
    { id: 'b', title: 'Answer Tomás', people: ['tomas'], createdAt: daysAgo(1) },
    { id: 'c', title: 'Book the venue', people: ['priya'], due: '2026-10-01' },
  ];
  const r = plain(b.homePeopleToday({ people: PEOPLE, events: [ev('x', 'Call with Owen', '15:00', '15:30')], tasks, today: TODAY, nowHM: '09:48' }));
  assert.deepEqual(r.rows.map(x => x.id), ['owen'], 'a name in the title links the event');
  assert.deepEqual(r.owed, { id: 'clara', person: PEOPLE[5], task: { id: 'a', title: 'Respond to Clara about the budget' }, days: 3, late: true },
    'a reply-type task, overdue; "Answer Tomás" is only a day old, "Book the venue" is not a reply');
  const none = plain(b.homePeopleToday({ people: PEOPLE, events: [], tasks: [], today: TODAY, nowHM: '09:48' }));
  assert.deepEqual(none, { rows: [], more: 0, people: 0, owed: null });
  const solo = plain(b.homePeopleToday({ people: [PEOPLE[0]], events: [ev('y', 'Focus time', '10:00', '11:00', [{ email: 'me@example.org', self: true }])], tasks: [], today: TODAY }));
  assert.deepEqual(solo.rows, [], 'never the user');
  // At most `max` rows; the rest are counted.
  const many = Array.from({ length: 8 }, (_, i) => ({ id: 'p' + i, name: `Person${'abcdefgh'[i]} Test${i}`, email: `p${i}@example.org` }));
  const lots = b.homePeopleToday({ people: many, events: many.map((p, i) => ev('m' + i, 'Meet', `1${i}:00`, `1${i}:30`, [{ email: p.email }])), tasks: [], today: TODAY, nowHM: '08:00', max: 5 });
  assert.equal(lots.rows.length, 5); assert.equal(lots.more, 3);
  assert.equal(lots.people, 8);
});

test('People today: a group meeting is one row; a birthday or someone waiting on you keeps their own', () => {
  const b = box();
  const all = [{ email: 'hannah@example.org' }, { email: 'tomas@example.org' }, { email: 'priya@example.org' }, { email: 'owen@example.org' }, { email: 'clara@example.org' }];
  const events = [
    ev('lab', 'Lab meeting', '12:00', '13:00', all),
    ev('one', 'Coffee', '10:00', '10:30', [{ email: 'hannah@example.org' }]),
    Object.assign(ev('bd', 'Priya’s birthday', null, null, []), { allDay: true }),
  ];
  const tasks = [{ id: 'r', title: 'Reply to Owen', people: ['owen'], createdAt: daysAgo(4) }, { id: 'f', title: 'Draft the plan', people: ['tomas'], due: '2026-10-08' }];
  const r = plain(b.homePeopleToday({ people: PEOPLE, events, tasks, today: TODAY, nowHM: '09:00', locale: 'en-GB' }));
  // Hannah's first meeting is the coffee; Priya has a birthday; Owen is waiting on you: the lab group is Tomás and Clara... only 2, so no group.
  assert.ok(!r.rows.some(x => x.group), 'two people left in the meeting: still one row each');
  const many = PEOPLE.concat([{ id: 'zed', name: 'Zed Quinn', email: 'zed@example.org' }]);
  const r2 = plain(b.homePeopleToday({ people: many, events: [ev('lab', 'Lab meeting', '12:00', '13:00', all.concat([{ email: 'zed@example.org' }])), events[2]], tasks, today: TODAY, nowHM: '09:00', locale: 'en-GB' }));
  const g = r2.rows.find(x => x.group);
  assert.ok(g, 'a group row');
  assert.equal(g.id, 'ev:lab'); assert.equal(g.time, '12:00');
  assert.deepEqual(g.ids.sort(), ['clara', 'hannah', 'tomas', 'zed']);
  assert.match(g.why[0].pre, /^Tomás: you promised $/, 'the first reason, with whose it is');
  assert.ok(r2.rows.some(x => x.id === 'priya' && !x.group), 'the birthday keeps its own row');
  assert.ok(r2.rows.some(x => x.id === 'owen' && x.owed), 'so does the person waiting on you');
  assert.equal(r2.people, 6);
});

test('glance files: no inline handlers, text escaped through esc(), declarations only at load', () => {
  for (const f of ['12-home-glances.js', '12-home-w-finance.js', '12-home-w-people.js', '12-home-w-waiting.js']) {
    const code = src(f);
    assert.ok(!/\son[a-z]+\s*=\s*["']/.test(code.replace(/\.on[a-z]+\s*=/g, '')), f + ': inline handler attribute');
    assert.ok(!/\p{Extended_Pictographic}/u.test(code), f + ': emoji');
    // Every merchant, category, person and task title reaches innerHTML through esc()/escAttr().
    for (const m of code.matchAll(/\$\{(t\.m|t\.c|c\.c|b\.m|top\.c|p\.name|m\.title|w\.b)\}/g)) assert.fail(`${f}: unescaped ${m[1]}`);
  }
});
