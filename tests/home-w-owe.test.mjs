// Home widget "owe" (I owe, WIDGETS_CATALOGUE.md 3.8): promises the user made to
// other people, the mirror of Waiting on.
//   - the pure rules (src/app/12-home-owe-logic.js) alone in a VM: homeOweList (both
//     waiting rules, the user's own person left out, ordering, snoozed and not-yet-
//     started tasks left out), homeOweGroups, homeOweEmailRows, the "when" text and
//     the plain-text draft;
//   - in the Home bundle (every 12-home*.js file plus the people-link rules): the
//     widget is registered and available, its defaults match the server's settings
//     schema, the page model joins homeIsWaiting and pplIsWaiting, Today is a no-op
//     once planned, and Write only ever builds a Gmail DRAFT (never a send).
// Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
const TODAY = '2026-10-05';
const plus = (n) => { const d = new Date(TODAY + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/* ───────── the pure rules, alone in a VM ───────── */
const logic = vm.createContext({});
vm.runInContext(read('12-home-owe-logic.js'), logic, { filename: '12-home-owe-logic.js' });
const L = (fn, ...args) => plain(vm.runInContext(fn, logic)(...plain(args)));
const task = (id, o) => Object.assign({ id, title: 'Task ' + id, status: 'todo', people: ['sam'], createdAt: plus(-3) }, o || {});

test('homeOweList keeps open tasks linked to someone else; the user, done, won\'t do and waiting ones are left out', () => {
  const items = [
    task('a'),
    task('b', { people: ['me'] }),                           // only the user: owed to nobody else
    task('c', { people: ['me', 'alex'] }),                   // the user and Alex: owed to Alex
    task('d', { status: 'done' }),
    task('e', { status: 'wontdo' }),
    task('f', { wontDo: true }),
    task('g', { people: [] }),
    task('h', { status: 'waiting' }),                        // the default waiting rule (status)
    task('i', { waiting: true }),
    task('a'),                                               // a duplicate id counts once
    null, { title: 'no id' },
  ];
  const rows = L('homeOweList', items, { today: TODAY, selfIds: ['me'] });
  assert.deepEqual(rows.map(r => r.id).sort(), ['a', 'c']);
  assert.deepEqual(rows.find(r => r.id === 'c').people, ['alex'], 'the user is never one of the people owed');
  // selfId (one) works as well as selfIds.
  assert.deepEqual(L('homeOweList', [task('b', { people: ['me'] })], { today: TODAY, selfId: 'me' }), []);
});

test('homeOweList: both waiting rules through isWaiting (the page passes homeIsWaiting || pplIsWaiting)', () => {
  const items = [task('own'), task('tagged', { tags: ['waiting-sam'] }), task('chase', { title: 'Chase Sam for the figures' }), task('st', { status: 'waiting' })];
  const isWaiting = vm.runInContext(`(i) => i.status === 'waiting' || (i.tags || []).some(t => /^waiting/.test(t)) || /^chase\\b/i.test(i.title)`, logic);
  const rows = vm.runInContext('homeOweList', logic)(items, { today: TODAY, isWaiting });
  assert.deepEqual(plain(rows).map(r => r.id), ['own']);
});

test('homeOweList leaves out tasks not started yet and tasks snoozed on Home (until the day after the last hidden day)', () => {
  const items = [task('later', { startDate: plus(2) }), task('started', { startDate: TODAY }), task('snz', {}), task('back', {})];
  const rows = L('homeOweList', items, { today: TODAY, snoozed: { snz: plus(1), back: plus(-1) } });
  assert.deepEqual(rows.map(r => r.id).sort(), ['back', 'started']);
});

test('homeOweList order: late first, then the soonest due, then the oldest created; stable across calls', () => {
  const items = [
    task('new', { createdAt: plus(-1) }),
    task('old', { createdAt: plus(-20) }),
    task('soon', { due: plus(3) }),
    task('late2', { due: plus(-2) }),
    task('today', { dueDate: TODAY }),
    task('late9', { due: plus(-9) }),
    task('nodate', { createdAt: null }),
    task('ms', { createdAt: Date.parse(plus(-10) + 'T10:00:00') }),
  ];
  const rows = L('homeOweList', items, { today: TODAY });
  assert.deepEqual(rows.map(r => r.id), ['late9', 'late2', 'today', 'soon', 'old', 'ms', 'new', 'nodate']);
  assert.deepEqual(L('homeOweList', items.slice().reverse(), { today: TODAY }).map(r => r.id), rows.map(r => r.id));
  const late = rows[0];
  assert.equal(late.late, 9); assert.equal(late.dueIn, -9);
  assert.equal(rows.find(r => r.id === 'old').age, 20);
  assert.equal(rows.find(r => r.id === 'today').late, 0);
});

test('readers: the page\'s status, deadline, title and people come in as functions', () => {
  const items = [{ id: 'x', title: 'raw', people: ['me'] }];
  const rows = L('homeOweList', items, { today: TODAY }) ;
  assert.equal(rows.length, 1, 'no selfIds: everyone counts');
  const r = plain(vm.runInContext('homeOweList', logic)(items, {
    today: TODAY, statusOf: () => 'todo', dueOf: () => plus(1), titleOf: () => 'Effective title', peopleOf: () => ['sam', 'sam', '', 7],
  }));
  assert.equal(r[0].title, 'Effective title'); assert.equal(r[0].due, plus(1)); assert.deepEqual(r[0].people, ['sam']);
  assert.equal(plain(vm.runInContext('homeOweList', logic)(items, { today: TODAY, statusOf: () => 'done' })).length, 0);
});

test('homeOweGroups: one block per first person, in the order of their most pressing row', () => {
  const rows = L('homeOweList', [
    task('s1', { people: ['sam'], due: plus(4), createdAt: plus(-2) }),
    task('a1', { people: ['alex', 'sam'], due: plus(-1) }),
    task('s2', { people: ['sam'], createdAt: plus(-12) }),
  ], { today: TODAY });
  const g = L('homeOweGroups', rows);
  assert.deepEqual(g.map(x => x.personId), ['alex', 'sam']);
  assert.deepEqual(g[1].rows.map(r => r.id), ['s1', 's2']);
  assert.equal(g[1].oldest.id, 's2');
});

test('homeOweEmailRows: people the user knows, more than 2 days, at most 2, oldest first, never the user', () => {
  const reply = [
    { id: 'm1', known: true, personId: 'sam', ageDays: 3 },
    { id: 'm2', known: false, personId: null, ageDays: 9 },
    { id: 'm3', known: true, personId: 'alex', ageDays: 2 },
    { id: 'm4', known: true, personId: 'jo', ageDays: 6 },
    { id: 'm5', known: true, personId: 'me', ageDays: 8 },
    { id: 'm6', known: true, personId: 'kim', ageDays: 4 },
  ];
  assert.deepEqual(L('homeOweEmailRows', reply, { selfIds: ['me'] }).map(r => r.id), ['m4', 'm6']);
  assert.deepEqual(L('homeOweEmailRows', reply, { selfIds: ['me'], limit: 5 }).map(r => r.id), ['m4', 'm6', 'm1']);
  assert.deepEqual(L('homeOweEmailRows', reply, { limit: 0 }), []);
});

test('the "when" text: late beats due today beats a date beats the age', () => {
  const W = (r) => L('homeOweWhenText', r, {});
  assert.equal(W({ late: 3, due: plus(-3), dueIn: -3 }), '3 days late');
  assert.equal(W({ late: 1, due: plus(-1), dueIn: -1 }), '1 day late');
  assert.equal(W({ late: 0, due: TODAY, dueIn: 0 }), 'due today');
  assert.equal(W({ late: 0, due: plus(1), dueIn: 1 }), 'due tomorrow');
  assert.equal(W({ late: 0, due: plus(5), dueIn: 5 }), 'due ' + plus(5));
  assert.equal(W({ late: 0, due: null, age: 9 }), '9 days');
  assert.equal(W({ late: 0, due: null, age: 0 }), 'new today');
  assert.equal(L('homeOweWhen', { late: 2 }), 'late');
  assert.equal(L('homeOweWhen', null), '');
});

test('the draft: one item or a list, plain text, no line breaks smuggled into a line, never empty', () => {
  const one = L('homeOweDraft', { first: 'Sam', me: 'Robin', items: [{ title: 'Send the figures\nBcc: x@example.com' }] });
  assert.match(one.subject, /^Update: Send the figures Bcc: x@example\.com$/);
  assert.match(one.body, /^Hi Sam,\n\nA quick update on Send the figures Bcc: x@example\.com:\n/);
  assert.match(one.body, /Best,\nRobin$/);
  const list = L('homeOweDraft', { first: 'Sam', items: [{ title: 'A' }, { title: 'B' }, { title: ' ' }] });
  assert.equal(list.subject, 'A quick update on 2 things');
  assert.match(list.body, /- A\n- B\n/);
  assert.match(list.body, /Best,$/);
  const dated = vm.runInContext('homeOweDraft', logic)({ first: 'Sam', today: TODAY, dueLabel: (iso) => 'on ' + iso, items: [{ title: 'Late one', due: plus(-2) }, { title: 'Ahead', due: plus(3) }] });
  assert.match(dated.body, /- Late one\n- Ahead \(by on 2026-10-08\)\n/, 'a deadline already past is left out; one ahead is given');
  const many = L('homeOweDraft', { items: Array.from({ length: 14 }, (_, i) => ({ title: 'T' + i })) });
  assert.match(many.body, /- and 2 more/);
  assert.match(many.body, /^Hi,/);
  assert.ok(L('homeOweDraft', {}).subject.length > 0, 'a new email always has a subject (the server refuses one without)');
  const longT = 'Acme review Mon 5 Oct: ask Sam for the revised titration data and show the fixed model to the team';
  const long = L('homeOweDraft', { first: 'Sam', items: [{ title: longT }] });
  assert.ok(long.subject.length <= 'Update: '.length + 73, 'a long title makes a short subject: ' + long.subject);
  assert.match(long.subject, /^Update: Acme review Mon 5 Oct: ask Sam for the revised titration data and\w*…$|^Update: Acme review .*[a-z]…$/);
  assert.ok(long.body.includes(longT), 'the body keeps the whole title');
});

/* ───────── in the Home bundle ───────── */
function fakeEl() {
  const attrs = {};
  return { dataset: {}, innerHTML: '', textContent: '', disabled: false, isConnected: true, style: {}, getAttribute: (k) => attrs[k] ?? null,
    setAttribute: (k, v) => { attrs[k] = String(v); }, removeAttribute: (k) => { delete attrs[k]; }, hasAttribute: (k) => k in attrs,
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} }, appendChild() {}, querySelector: () => null, querySelectorAll: () => [] };
}
function bundle(st) {
  const calls = { setPlanned: [], toasts: [], mailto: [], editor: [], quick: [] };
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', features: {} }, CSS: { escape: (s) => s }, TextEncoder,
    window: { addEventListener() {} },
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => fakeEl(), body: { appendChild() {} }, hidden: false },
    registerSection() {}, render() {}, saveData() {}, saveUI() {}, undo() {},
    toast: (m, o) => calls.toasts.push({ m, o }), todayStr: () => TODAY, fmtDate: (d) => d.toISOString().slice(0, 10),
    setTimeout: () => 0, clearTimeout() {},
    esc: (s) => String(s), escAttr: (s) => String(s), icon: (n) => `<i data-i="${n}"></i>`,
    getAllItems: () => st.custom.filter(t => !(st.deleted || {})[t.id]), getItem: (id) => st.custom.find(t => t.id === id),
    statusOf: (id) => (st.statuses || {})[id] || 'todo', effDate: (i) => i.dueDate || null, effTitle: (i) => i.title, effTags: (i) => i.tags || [],
    effStream: (i) => i.stream, effPriority: (i) => i.priority || 'p0',
    getPerson: (id) => (st.people || []).find(p => p.id === id),
    pplPersonEmails: (p) => [p.email].filter(Boolean),
    setPlanned: (id, d) => { calls.setPlanned.push([id, d]); st.custom.find(t => t.id === id).plannedFor = d; },
    hglMailto: (p, s, b) => 'mailto:' + p.email + '?subject=' + encodeURIComponent(s), hglOpenMail: (u) => { calls.mailto.push(u); return true; },
    userName: () => 'Robin Example',
    _tbShortDate: (iso) => iso, dueLabel: (iso) => iso,
  };
  box.effPeople = (i) => (Array.isArray(i.people) ? i.people : []);
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  const files = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort().map(read);
  vm.runInContext(read('52-people-link.js') + '\n' + files.join('\n'), box, { filename: 'home-owe-bundle.js' });
  box.hglOpenMail = (u) => { calls.mailto.push(u); return true; };       // after the bundle (its own declaration would win)
  return { box, calls, run: (code) => vm.runInContext(code, box), json: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, box)) };
}
function ownState() {
  return {
    custom: [
      { id: 'o1', title: 'Send Sam the figures', people: ['sam'], dueDate: plus(-2), createdAt: plus(-6) },
      { id: 'o2', title: 'Review the draft for Alex', people: ['alex'], createdAt: plus(-4) },
      { id: 'w1', title: 'Chase Alex for the data', people: ['alex'] },              // pplIsWaiting (title)
      { id: 'w2', title: 'Figures from Sam', people: ['sam'], tags: ['waiting-sam'] }, // homeIsWaiting (tag)
      { id: 'w3', title: 'Signed form', people: ['sam'], waitingOn: 'sam' },          // homeIsWaiting (waitingOn)
      { id: 'me1', title: 'Book a dentist', people: ['me'] },
      { id: 'mb', title: 'Shared inbox thing', people: ['box'] },
      { id: 'gone', title: 'Deleted person', people: ['nobody'] },
      { id: 'sn', title: 'Snoozed promise', people: ['sam'] },
      { id: 'dn', title: 'Done promise', people: ['sam'] },
    ],
    statuses: { dn: 'done' }, deleted: {}, pinned: {},
    people: [{ id: 'me', name: 'Robin Example', self: true }, { id: 'sam', name: 'Sam Taylor', email: 'sam@example.com' }, { id: 'alex', name: 'Alex Kim' }, { id: 'box', name: 'Team inbox', kind: 'mailbox', email: 'team@example.com' }],
    home: { snoozed: { sn: plus(1) } },
  };
}

test('in the bundle: registered, available, sizes and defaults as the server has them', () => {
  const { json } = bundle(ownState());
  const d = json('homeWidgetDefs().filter(d => d.id === "owe").map(d => ({ sizes: d.sizes, defaultSize: d.defaultSize, defaultHidden: d.defaultHidden, defaults: d.defaults, available: d.available(), settings: typeof d.settings, title: d.title }))')[0];
  const srv = HOME_WIDGETS.find(w => w.id === 'owe');
  assert.equal(d.available, true);
  assert.deepEqual(d.sizes, srv.sizes); assert.equal(d.defaultSize, srv.defaultSize); assert.equal(d.defaultHidden, true);
  assert.equal(d.title, srv.title);
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.owe.properties).sort());
  assert.equal(d.settings, 'function');
});

test('the page model: both waiting rules, the user, mailboxes, unknown people, snoozed and done left out', () => {
  const { json } = bundle(ownState());
  const m = json('(() => { const x = _howModel({ id: "owe" }, { emailRows: false }); return { rows: x.rows.map(r => ({ id: r.id, people: r.people, late: r.late })), emails: x.emails }; })()');
  assert.deepEqual(m.rows.map(r => r.id), ['o1', 'o2']);
  assert.equal(m.rows[0].late, 2);
  assert.deepEqual(m.emails, []);
});

test('Today plans the task for today once; pressed, a second press does nothing', async () => {
  const st = ownState();
  const { run, calls } = bundle(st);
  run('_howToday("o1", document.createElement("button"))');
  await new Promise(r => setImmediate(r));
  assert.deepEqual(calls.setPlanned, [['o1', TODAY]]);
  run('_howToday("o1", document.createElement("button"))');
  await new Promise(r => setImmediate(r));
  assert.equal(calls.setPlanned.length, 1, 'already planned for today: nothing happens');
  assert.ok(calls.toasts.some(t => /Planned for today/.test(t.m) && t.o && t.o.action && t.o.action.label === 'Undo'), 'with Undo');
});

test('Write builds a Gmail DRAFT for the person (never a send); without drafts it opens the mail app', () => {
  const st = ownState();
  const { run, json, calls, box } = bundle(st);
  // Without Gmail drafts: mailto (the mail app never sends by itself).
  run('_howWrite({ key: "task:o1", person: getPerson("sam"), rows: _howModel({ id: "owe" }, { emailRows: false }).rows.slice(0, 1), label: "Write", aria: "x" })');
  assert.equal(calls.mailto.length, 1);
  assert.match(calls.mailto[0], /^mailto:sam@example\.com\?subject=Update%3A%20Send%20Sam%20the%20figures/);
  // With drafts: the editor opens PREFILLED (Save is the user's); the check saves the same draft as it is.
  box.window.GmailDraft = {
    available: () => true,
    prefill: () => null,
    openEditor: (p, o) => { calls.editor.push({ p, title: o.title }); return () => {}; },
    quick: async (p) => { calls.quick.push(p); return { ok: true, draftId: 'd-1' }; },
  };
  box.GmailDraft = box.window.GmailDraft;
  const pre = json('_howPrefill({ person: getPerson("sam"), rows: _howModel({ id: "owe" }, { emailRows: false }).rows.slice(0, 1) })');
  assert.deepEqual(pre.to, ['sam@example.com']);
  assert.equal(pre.purpose, 'note'); assert.equal(pre.taskId, 'o1');
  assert.match(pre.body, /^Hi Sam,\n\nA quick update on Send Sam the figures:/);
  assert.match(pre.body, /Best,\nRobin$/);
  assert.deepEqual(Object.keys(pre).sort(), ['body', 'cc', 'purpose', 'subject', 'taskId', 'to'], 'only fields the draft route accepts');
  run('_howWrite({ key: "task:o1", person: getPerson("sam"), rows: _howModel({ id: "owe" }, { emailRows: false }).rows.slice(0, 1), label: "Write", aria: "x" })');
  assert.equal(calls.editor.length, 1); assert.equal(calls.editor[0].title, 'Write to Sam');
  run('_howWrite({ key: "task:o1", person: getPerson("sam"), rows: [], label: "Write", aria: "x" })');
  assert.equal(calls.editor.length, 1, 'its editor is open: a second press does nothing');
  // In a thread the task came from: a reply in that thread.
  box.GmailDraft.prefill = (kind, o) => (kind === 'nudge' ? { to: ['sam@example.com'], subject: 'Re: Figures', threadId: 't-123', purpose: 'nudge', taskId: o.task } : null);
  const inThread = json('_howPrefill({ person: getPerson("sam"), rows: _howModel({ id: "owe" }, { emailRows: false }).rows.slice(0, 1) })');
  assert.equal(inThread.threadId, 't-123'); assert.equal(inThread.purpose, 'reply'); assert.equal(inThread.subject, 'Re: Figures');
  // A person with no address: no draft at all.
  assert.equal(json('_howPrefill({ person: getPerson("alex"), rows: [] })'), null);
  // A person's list (Large): one draft for everything owed to them.
  const list = json('_howPrefill({ person: getPerson("sam"), rows: [{ title: "A", due: null }, { title: "B", due: "' + plus(2) + '" }] })');
  assert.equal(list.subject, 'A quick update on 2 things'); assert.equal(list.taskId, undefined);
});

test('the widget file can only draft: no send, no delete, no money', () => {
  const src = read('12-home-w-owe.js');
  assert.doesNotMatch(src, /send_message|\/api\/gmail\/send|sendMail|\.send\(/i);
  assert.doesNotMatch(src, /\bfetch\(/, 'no requests of its own: drafts go through window.GmailDraft');
  assert.doesNotMatch(src, /\b(Sam|Alex|Jo)\b/, 'no names in the widget code');
});
