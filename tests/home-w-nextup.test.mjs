// Home widget "nextup" (Meeting prep, WIDGETS_CATALOGUE.md 3.4): the pure rules in
// src/app/12-home-nextup-logic.js (the open loop per person, the time pill, the
// follow-up's date, the agenda line, the email plan, the whole view model), the
// meeting choice it relies on (12-home-meet-logic.js homeNextMeeting: the user left
// out, declined / out of office left out, under way, the horizon), its registration
// against lib/home-topbar.mjs, and the widget's writes in a VM with stubbed page
// helpers (the user's rule: Follow-up opens the task card PREFILLED and writes
// nothing; its ✓ is ONE undo step; a second press does nothing). Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';
import { check } from '../server/actions/validate.mjs';

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
  vm.runInContext(['52-people-link.js', '12-home-meet-logic.js', '12-home-nextup-logic.js'].map(read).join('\n;\n'), box, { filename: 'nextup-logic.js' });
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
];
const O = { myEmails: ['me@example.net'], people: PEOPLE };

test('the rules file is pure: no DOM, no page state, no clock', () => {
  const src = read('12-home-nextup-logic.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const word of ['document.', 'window.', 'APP_CONFIG', 'state.', 'localStorage', 'fetch(', 'saveData', 'render(', 'Date.now(', 'new Date()']) assert.ok(!src.includes(word), `uses ${word}`);
});

test('which meeting: the user alone, declined, out of office, focus time and all-day are left out', () => {
  const events = [
    ev('alone', at(0, 15, 10), at(0, 15, 40), { attendees: [ME] }),
    ev('declined', at(0, 15, 20), at(0, 16), { attendees: [{ ...ME, response: 'declined' }, SAM] }),
    ev('ooo', at(0, 15, 30), at(0, 17), { eventType: 'outOfOffice' }),
    ev('focus', at(0, 15, 30), at(0, 17), { eventType: 'focusTime' }),
    ev('selfByAddress', at(0, 15, 35), at(0, 16), { attendees: [{ email: 'ME@example.net', response: 'accepted' }] }),
    ev('allday', null, null, { start: { date: '2026-10-05' }, end: { date: '2026-10-06' } }),
    ev('review', at(0, 16), at(0, 17), { attendees: [ME, SAM, JO] }),
  ];
  const n = L.homeNextMeeting(events, NOW, { ...O, horizonH: 18 });
  assert.equal(n.meeting.id, 'review');
  assert.equal(n.inMin, 60);
  assert.equal(n.current, false);
  eq(n.meeting.attendees.map(a => a.personId), ['sam', 'jo'], 'the user is never an attendee line');
});

test('which meeting: the one under way wins; the horizon reaches tomorrow morning from the evening', () => {
  const running = ev('running', at(0, 14, 30), at(0, 15, 30));
  const later = ev('later', at(0, 15, 45), at(0, 16));
  const n = L.homeNextMeeting([later, running], NOW, { ...O, horizonH: 18 });
  eq([n.meeting.id, n.current, n.inMin], ['running', true, 0]);
  // 20:00, a meeting at 09:30 tomorrow: 13.5 h ahead
  const eve = new Date(2026, 9, 5, 20, 0).getTime();
  const morning = ev('standup', at(1, 9, 30), at(1, 10));
  assert.equal(L.homeNextMeeting([morning], eve, { ...O, horizonH: 18 }).meeting.id, 'standup');
  assert.equal(L.homeNextMeeting([morning], eve, { ...O, horizonH: 12 }), null, 'outside a 12 h horizon');
  assert.equal(L.homeNextMeeting([ev('done', at(0, 13), at(0, 14))], NOW, { ...O, horizonH: 18 }), null, 'an ended one is not next');
});

test('the open loop: earliest due first, then priority; owe before waiting; late days; how many more', () => {
  const r = L.nuLoopFor([
    { id: 'a', title: 'Send the draft', due: '2026-10-09', priority: 'p2' },
    { id: 'b', title: 'Waiting on the signed contract', due: '2026-10-02', priority: 'p3', waiting: true },
    { id: 'c', title: 'Undated thing', due: null, priority: 'p1' },
  ], { today: '2026-10-05' });
  eq(r, { kind: 'waiting', id: 'b', title: 'Waiting on the signed contract', due: '2026-10-02', late: true, lateDays: 3, more: 2 });
  const tie = L.nuLoopFor([
    { id: 'w', title: 'Waiting on review', due: '2026-10-07', priority: 'p2', waiting: true },
    { id: 'o', title: 'Write the review', due: '2026-10-07', priority: 'p2' },
  ], { today: '2026-10-05' });
  eq([tie.kind, tie.id, tie.late], ['owe', 'o', false], 'same date and priority: what the user owes first');
  assert.equal(L.nuLoopFor([], {}), null);
  assert.equal(L.nuLoopFor([{ id: 'x', title: '  ' }], {}), null, 'a blank title is no loop');
  assert.equal(L.nuWaitingWhat('Waiting on: the signed contract'), 'the signed contract');
  assert.equal(L.nuWaitingWhat('Blocked by legal sign-off'), 'legal sign-off');
});

test('the time pill: now with time left, minutes, tomorrow, the weekday', () => {
  eq(L.nuWhen({ current: true, leftMin: 20 }), { text: 'Now · 20 min left', kind: 'now' });
  eq(L.nuWhen({ inMin: 42, dayDiff: 0 }), { text: 'in 42 min', kind: 'today' });
  eq(L.nuWhen({ inMin: 10, dayDiff: 0 }), { text: 'in 10 min', kind: 'soon' });
  eq(L.nuWhen({ inMin: 0, dayDiff: 0 }), { text: 'Starting now', kind: 'soon' });
  eq(L.nuWhen({ inMin: 30, dayDiff: 1 }), { text: 'in 30 min', kind: 'today' }, 'just after midnight still reads as minutes');
  eq(L.nuWhen({ inMin: 800, dayDiff: 1 }), { text: 'Tomorrow', kind: 'tomorrow' });
  eq(L.nuWhen({ inMin: 3000, dayDiff: 2, weekday: 'Wednesday' }), { text: 'Wednesday', kind: 'later' });
  assert.equal(L.nuDur(65), '1 h 5 min');
  assert.equal(L.nuDur(120), '2 h');
});

test('follow-up date: 2 working days, skipping the weekend and the user\'s days off', () => {
  assert.equal(L.nuWorkdaysAfter('2026-10-05', 2), '2026-10-07');
  assert.equal(L.nuWorkdaysAfter('2026-10-08', 2), '2026-10-12', 'Thursday -> Monday');
  assert.equal(L.nuWorkdaysAfter('2026-10-08', 2, [1, 2, 3, 4]), '2026-10-13', 'Friday is off');
  assert.equal(L.nuWorkdaysAfter('nonsense', 2), null);
  assert.equal(L.nuFollowUpTitle('Design review'), 'Follow up: Design review');
  assert.ok(L.nuIsFollowUp('Follow-up: anything') && L.nuIsFollowUp('follow up with Sam') && !L.nuIsFollowUp('Followers'));
});

test('agenda: one bullet from what was typed; the preview keeps 4 lines and counts the rest', () => {
  assert.equal(L.nuAgendaLine('  agree the   launch date '), '- agree the launch date');
  assert.equal(L.nuAgendaLine('- already a bullet'), '- already a bullet');
  assert.equal(L.nuAgendaLine('2) numbered'), '- numbered');
  assert.equal(L.nuAgendaLine('   '), '');
  assert.equal(L.nuAgendaLine('x'.repeat(400)).length, 302, 'clipped to 300 characters');
  eq(L.nuNotesPreview('a\n\nb\nc\nd\ne\nf', 4), { lines: ['a', 'b', 'c', 'd'], more: 2 });
});

test('email plan: People addresses in To (3) and Cc (3); every address for the mail app; declined left out', () => {
  const emails = { sam: ['sam@example.com'], jo: ['jo.rivers@example.org', 'jo@example.org'], a: ['a@x.org'], b: ['b@x.org'], c: ['c@x.org'] };
  const plan = L.nuMailPlan([
    { email: 'sam@example.com', personId: 'sam' },
    { email: 'jo@example.org', personId: 'jo' },
    { email: 'stranger@acme.example', personId: null },
    { email: 'a@x.org', personId: 'a' }, { email: 'b@x.org', personId: 'b' },
    { email: 'c@x.org', personId: 'c', response: 'declined' },
  ], { emailsOf: (id) => emails[id] });
  eq(plan.to, ['sam@example.com', 'jo@example.org', 'a@x.org'], 'the invited address when it is theirs');
  eq(plan.cc, ['b@x.org']);
  eq(plan.all, ['sam@example.com', 'jo@example.org', 'stranger@acme.example', 'a@x.org', 'b@x.org']);
  const url = L.nuMailtoUrl(plan.all, 'Re: Review', 'Hi');
  assert.match(url, /^mailto:sam@example\.com,jo@example\.org,stranger@acme\.example,a@x\.org,b@x\.org\?subject=Re%3A%20Review&body=Hi$/);
  assert.equal(L.nuMailtoUrl(['not an address'], 's', 'b'), '');
  const body = L.nuMailBody({ firsts: ['Sam', 'Jo'], notes: '- one\n- two', when: 'today at 16:00', me: 'Alex' });
  assert.match(body, /^Hi Sam and Jo,\n\nAhead of our meeting today at 16:00, this is what I would like to cover:\n\n- one\n- two\n\nBest,\nAlex$/);
  assert.equal(L.nuNameFromEmail('lee.park+x@acme.example'), 'Lee Park');
  assert.equal(L.nuFirstName('Dr Sam Taylor'), 'Sam');
  assert.equal(L.nuNamesText(['Sam', 'Jo', 'Alex', 'Lee'], 2), 'Sam, Jo and 2 others');
});

function sampleModel(extra = {}) {
  const meeting = L.homeNextMeeting([ev('review', at(0, 16), at(0, 17), {
    summary: 'Design review',
    attendees: [ME, { ...JO, organizer: true }, SAM, { email: 'lee.park@acme.example', response: 'needsAction' }, { email: 'kim@acme.example', name: 'Kim', response: 'declined' }],
    conferenceUrl: 'https://meet.example.com/abc',
  })], NOW, { ...O, horizonH: 18 });
  return L.nuModel(Object.assign({
    meeting: meeting.meeting, current: meeting.current, inMin: meeting.inMin, nowMs: NOW, today: '2026-10-05', tomorrow: '2026-10-06',
    people: { sam: { id: 'sam', name: 'Sam Taylor', emails: ['sam@example.com'], notes: [{ ts: new Date(2026, 9, 2, 12).getTime(), text: 'Prefers mornings' }] },
      jo: { id: 'jo', name: 'Jo Rivers', emails: ['jo@example.org'], notes: [] } },
    loops: { jo: [{ id: 't1', title: 'Send the slides', due: '2026-10-06', priority: 'p2' }], sam: [] },
    contact: {}, meta: { notes: '- Walk through the layout', tasks: [] }, me: 'Alex', maxRows: 4, maxAvatars: 4,
  }, extra));
}

test('the view model: organiser first, owe line, last note, unknown attendee, declined last; follow-up and mail', () => {
  const vm2 = sampleModel();
  eq([vm2.id, vm2.title, vm2.dayText, vm2.timeText, vm2.when.text, vm2.join], ['review', 'Design review', 'Today', '16:00–17:00', 'in 1 h', 'https://meet.example.com/abc']);
  eq(vm2.rows.map(r => [r.name, r.line && r.line.kind, r.unknown, r.declined]), [
    ['Jo Rivers', 'owe', false, false],
    ['Sam Taylor', 'note', false, false],
    ['Lee Park', null, true, false],
    ['Kim', null, true, true],
  ]);
  assert.equal(vm2.rows[0].line.text, 'You owe: Send the slides');
  assert.equal(vm2.rows[1].line.text, 'Last note 3 days ago: Prefers mornings');
  eq([vm2.others, vm2.avatars.length, vm2.avatarsMore], [3, 3, 0], 'who is going (not the one who declined)');
  eq(vm2.follow, { title: 'Follow up: Design review', due: '2026-10-07', people: ['jo', 'sam'], stream: null, detail: 'After the meeting “Design review” (Today 16:00–17:00).' });
  assert.equal(vm2.followUp, null);
  eq(vm2.mail.to, ['jo@example.org', 'sam@example.com']);
  assert.ok(vm2.mail.all.includes('lee.park@acme.example') && !vm2.mail.all.includes('kim@acme.example'));
  assert.match(vm2.mail.body, /^Hi Jo and Sam,/);
  assert.equal(vm2.mail.subject, 'Re: Design review');
});

test('the view model: a waiting loop, last contact, rows capped at S/M, a follow-up already linked', () => {
  const vm2 = sampleModel({
    loops: { jo: [{ id: 'w1', title: 'Waiting on the budget', due: null, priority: 'p2', waiting: true }], sam: [] },
    people: { sam: { id: 'sam', name: 'Sam Taylor', emails: ['sam@example.com'], notes: [] }, jo: { id: 'jo', name: 'Jo Rivers', emails: ['jo@example.org'] } },
    contact: { sam: '2 days ago · email' }, maxRows: 2,
    meta: { notes: '', tasks: [{ id: 'f1', title: 'Follow up: Design review', done: false }] },
  });
  eq(vm2.rows.map(r => r.line && r.line.text), ['Waiting on: the budget', 'Last contact 2 days ago · email']);
  assert.equal(vm2.rowsMore, 2);
  eq(vm2.followUp, { id: 'f1', title: 'Follow up: Design review' }, 'the button then reads "Follow-up added"');
  assert.match(vm2.mail.body, /^Hi Jo and Sam,\n\n\n\nBest,\nAlex$/, 'no agenda: a greeting and a blank line to write on');
  const s = sampleModel({ maxRows: 0 });
  eq([s.rows.length, s.rowsMore], [0, 4], 'S: no rows');
  assert.equal(L.nuModel({}), null);
});

/* ───────── the widget in a VM: what each button writes ───────── */
function widgetBox(stateIn) {
  const st = Object.assign({ custom: [], statuses: {}, eventMeta: {}, people: PEOPLE.map(p => ({ ...p })) }, stateIn || {});
  const calls = { open: [], toasts: [], saves: 0, renders: 0, groups: 0, said: [], persons: [], editors: [] };
  let def = null;
  const box = {
    console, state: st, window: {}, CSS: { escape: (s) => s }, APP_CONFIG: { locale: 'en-GB' },
    document: { querySelector: () => null, querySelectorAll: () => [], body: {} },
    registerHomeWidget: (d) => { def = d; },
    todayStr: () => '2026-10-05', fmtDate: (d) => localIso(d),
    getItem: (id) => st.custom.find(t => t.id === id) || null, statusOf: (id) => st.statuses[id] || 'todo',
    getPerson: (id) => st.people.find(p => p.id === id) || null,
    saveData: () => { calls.saves++; }, render: () => { calls.renders++; },
    toast: (msg, o) => calls.toasts.push({ msg, o }), undo: () => { calls.undone = (calls.undone || 0) + 1; },
    selUndoGroup: (fn) => { calls.groups++; const before = calls.saves; const r = fn(); calls.groupSaves = calls.saves - before; return r; },
    addCustomTask: (title, due, pri, tags, stream, rec, extra) => { const id = 't' + (st.custom.length + 1); st.custom.push({ id, title, dueDate: due, stream, people: extra.people, detail: extra.detail }); calls.saves++; return id; },
    tcOpenCreate: (pre) => { calls.open.push(pre); box.__cur = { kind: 'create', draft: { key: 'draft-' + calls.open.length, eventId: pre.eventId } }; },
    _tc: { closing: false }, _tcCur: () => box.__cur || null, _tcFocusStart: () => { calls.focused = (calls.focused || 0) + 1; },
    openPersonEditor: (id, pre) => calls.editors.push({ id, pre }),
    createPerson: (f) => { calls.persons.push(f); calls.saves++; return { id: 'p-new' }; },
    // homeAction (12-home-platform.js): busy, run, then data-done so a second press does nothing.
    homeAction: (btn, run, o) => {
      if (btn.dataset.done === '1' || btn.busy) return Promise.resolve(false);
      btn.busy = true;
      return Promise.resolve().then(() => run(btn)).then((r) => { btn.busy = false; if (r !== false) btn.dataset.done = '1'; if (o && o.say) calls.said.push(o.say); return r; });
    },
    homeAnnounce: (s) => calls.said.push(s),
  };
  vm.createContext(box);
  // The page's Clock (07-core-clock*.js): the widget asks it for days and wall times (travel spec 2.7).
  Object.assign(box, { setTimeout, clearTimeout });
  vm.runInContext(['07-core-clock-logic.js', '07-core-clock.js', '12-home-nextup-logic.js', '43-calendar-meta.js', '12-home-w-nextup.js'].map(read).join('\n;\n')
    + '\n;globalThis.__nu = { followOpen: _nuFollowOpen, followNow: _nuFollowNow, personOpen: _nuPersonOpen, personNow: _nuPersonNow, horizon: _nuHorizon };',
    box, { filename: 'nextup-widget.js' });
  return { box, calls, st, W: box.__nu, def: () => def };
}

test('registration: available, the catalogue entry, settings that fit the server schema, a gallery sample', () => {
  const { def, W } = widgetBox();
  const d = def();
  const w = HOME_WIDGETS.find(x => x.id === 'nextup');
  eq([d.id, d.title, d.group, d.sizes, d.defaultSize, d.defaultHidden, d.gate], [w.id, w.title, w.group, w.sizes, w.defaultSize, true, 'calendar']);
  eq(d.aliases, w.aliases);
  assert.equal(d.available(), true, 'built: offered in Add widget');
  eq(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.nextup.properties).sort());
  eq(check(HOME_WIDGET_PREFS.nextup, d.defaults, 'settings'), []);
  for (const h of [6, 12, 18, 24, 72]) eq(check(HOME_WIDGET_PREFS.nextup, { horizonH: h, showEmails: false }, 'settings'), [], `${h} h fits`);
  eq([W.horizon({ horizonH: 24 }), W.horizon({ horizonH: 0 }), W.horizon({ horizonH: 'x' }), W.horizon(null)], [24, 18, 18, 18]);
  const sample = d.sample({ people: [{ id: 'sample-jo', name: 'Jo Rivera', email: 'jo@example.com' }, { id: 'sample-sam', name: 'Sam Taylor', email: 'sam@example.com' }], today: '2026-10-05', tomorrow: '2026-10-06', tasks: [] });
  assert.equal(sample.title, 'Design review with Acme');
  assert.ok(sample.rows.length === 3 && sample.rows.some(r => r.unknown), 'the sample shows People and an unknown address');
});

const VM_MEET = () => sampleModel();

test('Follow-up: opens the task card PREFILLED and writes nothing; a second press while it is open does nothing', () => {
  const { W, calls, st } = widgetBox();
  const m = VM_MEET();
  W.followOpen(m, {});
  assert.equal(calls.open.length, 1);
  eq(calls.open[0], { title: 'Follow up: Design review', date: '2026-10-07', people: ['jo', 'sam'], detail: m.follow.detail, eventId: 'review' });
  assert.equal(calls.saves, 0, 'nothing saved before Save');
  assert.equal(st.custom.length, 0);
  W.followOpen(m, {});
  assert.equal(calls.open.length, 1, 'no second card; the edits stay');
  assert.equal(calls.focused, 1, 'back to the open card');
});

test('✓ follow-up: created as it is and linked to the event: one undo step with an Undo toast; a second press does nothing', async () => {
  const { W, calls, st } = widgetBox();
  const m = VM_MEET();
  const btn = { dataset: {} };
  await W.followNow(m, btn);
  assert.equal(st.custom.length, 1);
  eq([st.custom[0].title, st.custom[0].dueDate, st.custom[0].people], ['Follow up: Design review', '2026-10-07', ['jo', 'sam']]);
  eq(st.eventMeta.review, { tasks: ['t1'] }, 'linked: the button then reads "Follow-up added"');
  assert.equal(calls.groups, 1, 'one selUndoGroup');
  assert.equal(calls.groupSaves, 2, 'both saves inside the group');
  const t = calls.toasts.at(-1);
  assert.match(t.msg, /^Follow-up added for /);
  assert.equal(t.o.action.label, 'Undo');
  t.o.action.run();
  assert.equal(calls.undone, 1, 'Undo = the page undo (the whole group)');
  await W.followNow(m, btn);
  assert.equal(st.custom.length, 1, 'a second press does nothing');
});

test('Add person: the editor prefilled (nothing saved); ✓ adds them at once with Undo', async () => {
  const { W, calls } = widgetBox();
  const m = VM_MEET();
  const lee = m.rows.find(r => r.email === 'lee.park@acme.example');
  W.personOpen(m, lee.key);
  eq(calls.editors, [{ id: null, pre: { name: 'Lee Park', email: 'lee.park@acme.example', emails: ['lee.park@acme.example'] } }]);
  assert.equal(calls.saves, 0);
  const btn = { dataset: {} };
  await W.personNow(m, lee.key, btn);
  eq(calls.persons, [{ name: 'Lee Park', emails: ['lee.park@acme.example'] }]);
  assert.equal(calls.toasts.at(-1).o.action.label, 'Undo');
  await W.personNow(m, lee.key, btn);
  assert.equal(calls.persons.length, 1, 'a second press does nothing');
});

test('the widget never sends: no send call, mail only through GmailDraft drafts or a mailto link', () => {
  const src = read('12-home-w-nextup.js');
  assert.ok(!/\bsend(Message|Mail|Email)?\s*\(/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'no send function is called');
  assert.ok(!/task\.schedule|setDateWithReason/.test(src), 'never moves a deadline');
});
