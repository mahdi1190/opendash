// Home widget "wrapup" (After meetings, WIDGETS_CATALOGUE.md 3.5): the pure rules in
// src/app/12-home-wrapup-logic.js (which meetings to wrap up, the follow-up's due
// choices, the thank-you draft), the widget's writes in a VM with stubbed page helpers
// (the user's rule: Follow-up opens the task card PREFILLED and writes nothing; its ✓
// and Save note are ONE undo step each; a second press does nothing), its
// registration against lib/home-topbar.mjs, calAnnotate keeping a wrapped-only entry,
// and the event.annotate op with wrapped. Synthetic data only (generic names).
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';
import { check } from '../server/actions/validate.mjs';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir, TODAY } from './fixtures/actions-state.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const eq = (a, b, msg) => assert.deepEqual(plain(a), plain(b), msg);
const pad = (n) => String(n).padStart(2, '0');
const localIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* ───────── the pure rules ───────── */
function logicBox() {
  const box = { console };
  vm.createContext(box);
  vm.runInContext(['52-people-link.js', '12-home-meet-logic.js', '12-home-wrapup-logic.js'].map(read).join('\n;\n'), box, { filename: 'wrapup-logic.js' });
  return box;
}
const L = logicBox();
// Monday 5 Oct 2026, 15:00 local time (the rules take `now`; they never read the clock).
const NOW = new Date(2026, 9, 5, 15, 0).getTime();
const at = (dayOffset, h, m = 0) => new Date(2026, 9, 5 + dayOffset, h, m).toISOString();
const ME = { email: 'me@example.net', self: true, response: 'accepted' };
const SAM = { email: 'sam@example.com', name: 'Sam Taylor', response: 'accepted' };
const JO = { email: 'jo@example.org', name: 'Jo Rivers', response: 'accepted' };
const ev = (id, s, e, extra = {}) => ({ id, summary: id, start: { dateTime: s }, end: { dateTime: e }, attendees: [ME, SAM], ...extra });
const PEOPLE = [
  { id: 'sam', name: 'Sam Taylor', email: 'sam@example.com' },
  { id: 'jo', name: 'Jo Rivers', email: 'jo@example.org' },
  { id: 'me', name: 'The User', email: 'me@example.net', self: true },
];
const O = { myEmails: ['me@example.net'], people: PEOPLE };

test('the rules file is pure: no DOM, no page state, no clock', () => {
  const src = read('12-home-wrapup-logic.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const word of ['document.', 'window.', 'APP_CONFIG', 'state.', 'localStorage', 'fetch(', 'saveData', 'render(', 'Date.now(', 'new Date()']) assert.ok(!src.includes(word), `uses ${word}`);
});

test('which meetings: ended within the window, with someone else, newest first', () => {
  const events = [
    ev('standup', at(0, 9), at(0, 9, 15)),
    ev('review', at(0, 13), at(0, 14), { attendees: [ME, SAM, JO] }),
    ev('running', at(0, 14, 30), at(0, 15, 30)),                         // not over yet
    ev('alone', at(0, 11), at(0, 12), { attendees: [ME] }),               // nobody else
    ev('declined', at(0, 10), at(0, 11), { attendees: [{ ...ME, response: 'declined' }, SAM] }),
    ev('allday', null, null, { start: { date: localIso(new Date(NOW)) }, end: { date: localIso(new Date(NOW + 864e5)) } }),
    ev('yesterday', at(-1, 16), at(-1, 17)),
    ev('old', at(-3, 10), at(-3, 11)),                                    // outside 36 h
    ev('ooo', at(0, 8), at(0, 8, 30), { eventType: 'outOfOffice' }),
  ];
  const out = L.homeWrapCandidates(events, {}, NOW, { ...O, windowH: 36 });
  eq(out.map(m => m.id), ['review', 'standup', 'yesterday']);
  eq(out[0].endedMin, 60);
  eq(out[0].people.sort(), ['jo', 'sam'], 'attendees matched to People (never the user)');
  eq(out[0].others, 2);
  // the same from homeMeetings rows
  const rows = L.homeMeetings(events, O);
  eq(L.homeWrapCandidates(rows, {}, NOW, { windowH: 36 }).map(m => m.id), ['review', 'standup', 'yesterday']);
  // 7 days reaches back; "today" (0) starts at local midnight
  eq(L.homeWrapCandidates(events, {}, NOW, { ...O, windowH: 168 }).map(m => m.id), ['review', 'standup', 'yesterday', 'old']);
  eq(L.homeWrapCandidates(events, {}, NOW, { ...O, windowH: 0 }).map(m => m.id), ['review', 'standup']);
  assert.equal(L.homeWrapCandidates(events, {}, 'not a time', O).length, 0);
});

test('wrapped up: the flag or a follow-up made after it began; prep notes and prep tasks do not count', () => {
  const events = [ev('a', at(0, 10), at(0, 11)), ev('b', at(0, 12), at(0, 13)), ev('c', at(0, 13), at(0, 13, 30)), ev('d', at(0, 13, 30), at(0, 14))];
  const created = { prep: new Date(2026, 9, 4, 9).getTime(), follow: new Date(2026, 9, 5, 14, 10).getTime() };
  const meta = {
    a: { wrapped: true },
    b: { notes: '- agenda point', tasks: ['prep'] },                      // agenda + a prep task, both from before
    c: { tasks: ['follow'] },                                             // a follow-up made after it began
    d: { tasks: ['gone'] },                                               // a task we know nothing about
  };
  const out = L.homeWrapCandidates(events, meta, NOW, { ...O, createdAt: (id) => created[id] || null });
  eq(out.map(m => [m.id, m.hasNotes]), [['d', false], ['b', true]]);
  assert.equal(L.wuIsWrapped(null, {}), false);
  assert.equal(L.wuIsWrapped({ wrapped: false, tasks: [] }, { start: 1 }), false);
});

test('repeating meetings can be left out', () => {
  const events = [ev('series', at(0, 9), at(0, 9, 30), { recurring: true }), ev('one-off', at(0, 10), at(0, 10, 30))];
  eq(L.homeWrapCandidates(events, {}, NOW, O).map(m => m.id), ['one-off', 'series']);
  eq(L.homeWrapCandidates(events, {}, NOW, { ...O, skipRecurring: true }).map(m => m.id), ['one-off']);
});

test('words: ended, the summary, the follow-up title, names, notes', () => {
  eq([0, 1, 12, 59, 60, 125, 400].map(n => L.wuEndedText(n, 0)), ['just now', 'just now', '12 min ago', '59 min ago', '1 h ago', '2 h ago', '7 h ago']);
  assert.equal(L.wuEndedText(120, 1), '2 h ago', 'under 6 h it stays in hours across midnight');
  assert.equal(L.wuEndedText(20 * 60, 1), 'yesterday');
  assert.equal(L.wuEndedText(3 * 1440, 3), '3 days ago');
  eq([L.wuSummary(1), L.wuSummary(3), L.wuSummary(0)], ['1 meeting to wrap up', '3 meetings to wrap up', '0 meetings to wrap up']);
  assert.equal(L.wuFollowUpTitle('  Design   review '), 'Follow up: Design review');
  assert.equal(L.wuFollowUpTitle(''), 'Follow up: the meeting');
  const long = L.wuFollowUpTitle('word '.repeat(60));
  assert.ok(long.length <= 132 && long.endsWith('…'), long);
  eq([L.wuNamesText(['Sam']), L.wuNamesText(['Sam', 'Jo']), L.wuNamesText(['Sam', 'Jo', 'Alex']), L.wuNamesText(['Sam', 'Jo', 'Alex', 'Kim', 'Lee'])],
    ['Sam', 'Sam and Jo', 'Sam, Jo and Alex', 'Sam, Jo and 3 others']);
  assert.equal(L.wuNoteLine('  a  \r\n\r\n\r\n\r\nb \n'), 'a\n\nb');
  assert.equal(L.wuNoteLine('x'.repeat(2500)).length, 2000);
  assert.equal(L.wuNoteLine('   '), '');
  assert.equal(L.wuPersonNote(' Agreed the plan ', 'Design review', 'Mon 5 Oct'), 'After “Design review” (Mon 5 Oct): Agreed the plan');
  assert.equal(L.wuPersonNote('  ', 'x', 'y'), '');
  assert.equal(L.wuDetail('Design review', 'Mon 5 Oct · 13:00–14:00', 'Sam and Jo'), 'From the meeting “Design review” (Mon 5 Oct · 13:00–14:00) with Sam and Jo.');
});

test('follow-up due dates: 2 working days by default, tomorrow, next week, none', () => {
  assert.equal(L.wuWorkdaysAfter('2026-10-09', 2), '2026-10-13', 'Friday + 2 working days = Tuesday');
  assert.equal(L.wuWorkdaysAfter('2026-10-05', 2), '2026-10-07');
  assert.equal(L.wuWorkdaysAfter('2026-10-10', 2, [0, 1, 2, 3, 4, 5, 6]), '2026-10-12', 'every day a working day');
  assert.equal(L.wuWorkdaysAfter('bad', 2), null);
  const sat = L.wuDueChoices('2026-10-10');
  eq(sat.map(c => [c.key, c.date]), [['2wd', '2026-10-13'], ['tomorrow', '2026-10-11'], ['nextweek', '2026-10-12'], ['none', null]]);
  eq(L.wuDueChoices('2026-10-05').find(c => c.key === 'nextweek').date, '2026-10-12', 'Monday: next Monday');
  eq(L.wuDueChoices('2026-10-05', [2, 3, 4]).find(c => c.key === 'nextweek').date, '2026-10-13', 'next week starts on its first working day');
});

test('the likely stream: most open tasks with these people, ties by name', () => {
  const tasks = [{ stream: 'work', people: ['sam'] }, { stream: 'thesis', people: ['sam', 'jo'] }, { stream: 'thesis', people: ['jo'] }, { stream: 'home', people: [] }];
  assert.equal(L.wuGuessStream(tasks, ['sam', 'jo']), 'thesis');
  assert.equal(L.wuGuessStream(tasks, ['sam']), 'thesis', 'a tie (1 each): by name');
  assert.equal(L.wuGuessStream(tasks, ['nobody']), null);
  assert.equal(L.wuGuessStream(tasks, []), null);
});

test('thank-you: People addresses only (Gmail drafts), the rest for the mail app; the greeting and a blank line to write on', () => {
  const emails = { sam: ['sam@example.com'], jo: ['jo@example.org', 'jo@home.example'] };
  const first = { sam: 'Sam', jo: 'Jo' };
  const plan = L.wuThanksPlan([
    { email: 'sam@example.com', personId: 'sam' }, { email: 'jo@home.example', personId: 'jo' },
    { email: 'guest@example.net' }, { email: 'no@example.com', personId: 'sam', response: 'declined' },
  ], { emailsOf: (id) => emails[id], firstOf: (id) => first[id] });
  eq(plan, { to: ['sam@example.com', 'jo@home.example'], cc: [], first: ['Sam', 'Jo'], all: ['sam@example.com', 'jo@home.example', 'guest@example.net'] });
  const many = L.wuThanksPlan(['a', 'b', 'c', 'd', 'e'].map(x => ({ email: `${x}@example.com`, personId: x })), { emailsOf: (id) => [`${id}@example.com`] });
  eq([many.to.length, many.cc.length], [3, 2]);
  const d = L.wuThanksDraft({ title: 'Design review', first: ['Sam', 'Jo'], me: 'Alex', when: 'today' });
  assert.equal(d.subject, 'Thank you: Design review');
  assert.equal(d.body, "Hi Sam and Jo,\n\nThank you for today's meeting.\n\n\nBest wishes,\nAlex");
  assert.ok(d.body.includes('\n\n\n'), 'the draft editor puts the caret on the blank line');
  assert.match(L.wuThanksDraft({ first: ['A', 'B', 'C'], when: 'on Monday' }).body, /^Hi all,\n\nThank you for the meeting on Monday\./);
  assert.match(L.wuThanksDraft({}).body, /^Hi all,\n\nThank you for the meeting\.\n\n\nBest wishes$/);
});

/* ───────── the widget in a VM: what each button writes ───────── */
function widgetBox(stateIn) {
  const st = Object.assign({ custom: [], statuses: {}, deleted: {}, eventMeta: {}, people: PEOPLE.map(p => ({ ...p })) }, stateIn || {});
  const calls = { open: [], toasts: [], saves: 0, renders: 0, groups: 0, notes: [], said: [] };
  let def = null;
  const box = {
    console, state: st, window: {}, CSS: { escape: (s) => s }, APP_CONFIG: { locale: 'en-GB', myEmails: ['me@example.net'] },
    STREAMS: { work: { label: 'Work' }, thesis: { label: 'Thesis' } },
    document: { querySelector: () => null, querySelectorAll: () => [], activeElement: null, body: {} },
    registerHomeWidget: (d) => { def = d; },
    todayStr: () => '2026-10-05', fmtDate: (d) => localIso(d),
    getItem: (id) => st.custom.find(t => t.id === id) || null, getAllItems: () => st.custom, statusOf: (id) => st.statuses[id] || 'todo',
    getPerson: (id) => st.people.find(p => p.id === id) || null, effPeople: (t) => t.people || [],
    homeWorkHours: () => ({ days: [1, 2, 3, 4, 5] }),
    saveData: () => { calls.saves++; }, render: () => { calls.renders++; },
    toast: (msg, o) => calls.toasts.push({ msg, o }), homeAnnounce: (s) => calls.said.push(s), undo: () => { calls.undone = (calls.undone || 0) + 1; },
    selUndoGroup: (fn) => { calls.groups++; const before = calls.saves; const r = fn(); calls.groupSaves = calls.saves - before; return r; },
    addCustomTask: (title, due, pri, tags, stream, rec, extra) => { const id = 't' + (st.custom.length + 1); st.custom.push({ id, title, dueDate: due, stream, people: extra.people, detail: extra.detail, createdAt: Date.now() }); calls.saves++; calls.renders++; return id; },
    addPersonNote: (pid, text) => { calls.notes.push({ pid, text }); calls.saves++; return 'n1'; },
    tcOpenCreate: (pre, o) => { calls.open.push(pre); return 'card'; },
  };
  vm.createContext(box);
  vm.runInContext(['12-home-glances.js', '12-home-wrapup-logic.js', '43-calendar-meta.js', '12-home-w-wrapup.js'].map(read).join('\n;\n')
    + '\n;globalThis.__wu = { def: () => __def(), followOpen: _wuFollowUpOpen, followNow: _wuFollowUpNow, nothing: _wuNothing, saveNote: _wuSaveNote, draft: _wuDraft, prefill: _wuFollowUpPrefill };',
    Object.assign(box, { __def: () => def }), { filename: 'wrapup-widget.js' });
  return { box, calls, st, W: box.__wu, def: () => def };
}
const MEET = () => ({
  id: 'ev-review', title: 'Design review', start: new Date(2026, 9, 5, 13).getTime(), end: new Date(2026, 9, 5, 14).getTime(), minutes: 60,
  attendees: [{ email: 'sam@example.com', name: 'Sam Taylor', personId: 'sam', response: 'accepted' }, { email: 'jo@example.org', name: 'Jo Rivers', personId: 'jo', response: 'declined' }],
  people: ['sam', 'jo'], others: 2,
});
const fakeRow = () => ({ dataset: {}, parentElement: { children: [1, 2] }, nextElementSibling: null, previousElementSibling: null, contains: () => false, isConnected: false });

test('registration: available, the catalogue entry, settings that fit the server schema, a gallery sample', () => {
  const { def } = widgetBox();
  const d = def();
  const w = HOME_WIDGETS.find(x => x.id === 'wrapup');
  eq([d.id, d.title, d.group, d.sizes, d.defaultSize, d.defaultHidden, d.gate], [w.id, w.title, w.group, w.sizes, w.defaultSize, true, 'calendar']);
  eq(d.aliases, w.aliases);
  assert.equal(d.available(), true, 'built: offered in Add widget');
  eq(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.wrapup.properties).sort());
  eq(check(HOME_WIDGET_PREFS.wrapup, d.defaults, 'settings'), []);
  eq(check(HOME_WIDGET_PREFS.wrapup, { windowH: 168, skipRecurring: true }, 'settings'), [], 'the 7-day choice fits');
  const sample = d.sample({ people: [{ id: 'sample-sam', name: 'Sam Taylor' }] });
  assert.equal(sample.length, 3);
  assert.ok(sample.every(m => m.end < Date.now() && m.endedMin > 0 && m.title), 'sample meetings have ended');
});

test('Follow-up: opens the task card PREFILLED and writes nothing; a second press while it is open does nothing', () => {
  const { W, calls, st, box } = widgetBox({ custom: [{ id: 'old', title: 'Chapter', stream: 'thesis', people: ['sam'] }] });
  const m = MEET();
  W.followOpen(m, null, null);
  assert.equal(calls.open.length, 1);
  const pre = calls.open[0];
  eq({ title: pre.title, date: pre.date, people: pre.people, eventId: pre.eventId, stream: pre.stream },
    { title: 'Follow up: Design review', date: '2026-10-07', people: ['sam'], eventId: 'ev-review', stream: 'thesis' }, 'title, 2 working days, who was there (not who declined), the meeting, the likely stream');
  assert.match(pre.detail, /^From the meeting “Design review” \(.+ · .+\) with Sam\.$/);
  assert.equal(calls.saves, 0, 'nothing saved before Save');
  assert.equal(st.custom.length, 1);
  // its card is open now (the task card in create mode for this meeting): a second press does nothing
  const entry = { kind: 'create', draft: { eventId: 'ev-review' } };
  box._tc = { closing: false, stack: [entry] }; box._tcCur = () => entry;          // 61-task-card.js's open card
  W.followOpen(m, null, null);
  assert.equal(calls.open.length, 1, 'no second card, the edits stay');
});

test('✓ follow-up: created as it is, linked, wrapped up: one undo step with an Undo toast', () => {
  const { W, calls, st } = widgetBox();
  const m = MEET();
  const btn = { dataset: {} };
  W.followNow(m, btn, fakeRow());
  assert.equal(st.custom.length, 1);
  eq([st.custom[0].title, st.custom[0].dueDate, st.custom[0].people], ['Follow up: Design review', '2026-10-07', ['sam']]);
  eq(st.eventMeta['ev-review'], { wrapped: true, tasks: ['t1'] });
  assert.equal(calls.groups, 1, 'one selUndoGroup');
  assert.ok(calls.groupSaves >= 2, 'every save of the click is inside the group');
  const t = calls.toasts.at(-1);
  assert.match(t.msg, /^Follow-up added: Follow up: Design review/);
  assert.equal(t.o.action.label, 'Undo');
  t.o.action.run();
  assert.equal(calls.undone, 1, 'Undo = the page undo (the whole group)');
  W.followNow(m, btn, fakeRow());
  assert.equal(st.custom.length, 1, 'a second press does nothing');
});

test('Nothing needed: wrapped up alone; Undo un-wraps it (the entry goes)', () => {
  const { W, calls, st, box } = widgetBox();
  const m = MEET();
  W.nothing(m, fakeRow());
  eq(st.eventMeta['ev-review'], { wrapped: true });
  assert.equal(box.calIsWrapped('ev-review'), true);
  calls.toasts.at(-1).o.action.run();
  assert.equal(st.eventMeta['ev-review'], undefined);
  W.nothing(m, fakeRow());
  W.nothing(m, fakeRow());
  eq(st.eventMeta['ev-review'], { wrapped: true }, 'pressing again changes nothing');
  assert.equal(calls.toasts.length, 2);
});

test('Save note: the note on the event, on each ticked person, the follow-up line (L): ONE undo step', () => {
  const { W, calls, st } = widgetBox();
  const m = MEET();
  const d = W.draft(m.id);
  d.text = '  Agreed to send the slides by Friday. ';
  d.ticks.add('sam');
  d.fu.on = true; d.fu.title = 'Send the slides'; d.fu.due = 'tomorrow';
  W.saveNote(m, fakeRow(), 'l', { dataset: {} });
  eq(st.eventMeta['ev-review'], { wrapped: true, notes: 'Agreed to send the slides by Friday.', tasks: ['t1'] });
  eq(calls.notes.map(n => n.pid), ['sam']);
  assert.match(calls.notes[0].text, /^After “Design review” \(.+\): Agreed to send the slides by Friday\.$/);
  eq([st.custom[0].title, st.custom[0].dueDate], ['Send the slides', '2026-10-06']);
  assert.equal(calls.groups, 1);
  assert.match(calls.toasts.at(-1).msg, /^Wrapped up: Design review · note saved, added to Sam's notes, follow-up added$/);
  assert.equal(calls.toasts.at(-1).o.action.label, 'Undo');
});

test('Save note at M: no follow-up line; an empty note saves nothing', () => {
  const { W, calls, st } = widgetBox();
  const m = MEET();
  const d = W.draft(m.id);
  d.fu.on = true;
  W.saveNote(m, fakeRow(), 'm', { dataset: {} });
  assert.equal(calls.saves, 0, 'nothing typed, no follow-up at M: nothing saved');
  d.text = 'Short one';
  W.saveNote(m, fakeRow(), 'm', { dataset: {} });
  eq(st.eventMeta['ev-review'], { wrapped: true, notes: 'Short one' });
  assert.equal(st.custom.length, 0);
  assert.equal(calls.notes.length, 0, 'no person ticked');
});

/* ───────── the page helper and the op ───────── */
test('calAnnotate keeps an entry that only says wrapped, and prunes it when un-wrapped', () => {
  const { box, st } = widgetBox();
  assert.equal(box.calAnnotate('e1', { wrapped: true }, { toast: false }), true);
  eq(st.eventMeta.e1, { wrapped: true });
  assert.equal(box.calAnnotate('e1', { wrapped: true }, { toast: false }), false, 'no change, no save');
  box.calAnnotate('e1', { wrapped: false }, { toast: false });
  assert.equal(st.eventMeta.e1, undefined);
});

let dir, a;
beforeEach(() => { dir = makeDataDir(); a = createActions({ dataDir: dir }); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const disk = () => JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));

test('event.annotate with wrapped: a follow-up, its link, a note and the wrap in one batch, undone by its token', async () => {
  const r = await a.apply({ ops: [
    { op: 'task.create', ref: 't1', title: 'Follow up: Design review', stream: 'work', dueDate: TODAY },
    { op: 'event.annotate', eventId: 'ev-x', appendNotes: 'Agreed the plan', linkTasks: ['$t1'], wrapped: true },
  ], source: 'ui', client: 'home:wrapup' });
  const s = disk();
  const t = s.custom.find(x => x.title === 'Follow up: Design review');
  assert.ok(t);
  eq(s.eventMeta['ev-x'], { notes: 'Agreed the plan', tasks: [t.id], wrapped: true });
  await a.undo(r.undo, { source: 'ui', client: 'home:wrapup' });
  const s2 = disk();
  assert.equal(s2.custom.some(x => x.title === 'Follow up: Design review'), false);
  assert.equal((s2.eventMeta || {})['ev-x'], undefined);
});
