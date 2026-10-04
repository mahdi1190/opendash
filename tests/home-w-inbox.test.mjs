// Home widget "inbox" (Needs reply, WIDGETS_CATALOGUE.md 3.7): the inbox cut down
// to what needs the user, triaged in one click.
//   - the pure part (src/app/12-home-inbox-logic.js) alone in a VM: sizes and caps,
//     the small size's summary, stale data, the enter-once key, age text, the task
//     card's prefill (the same task the ✓ adds), Claude's pending suggestions, the
//     parser's ignore list, the undo fold and the sample rows;
//   - in the Home bundle (every 12-home*.js file): registered and available, the
//     defaults match the server's settings schema, Task opens the prefilled card
//     (nothing written before Save, a second press does nothing, Save is ONE undo
//     step), Reply opens the Gmail DRAFT editor and its ✓ saves a draft (never a send).
// Which threads need the user (homeNeedsReply) and emailQuickTask as one undo step
// are covered in tests/home-mail-logic.test.mjs. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
const TODAY = '2026-10-05';
const NOW = Date.UTC(2026, 9, 5, 12, 0);

/* ───────── the pure part, alone in a VM ───────── */
const logic = vm.createContext({});
vm.runInContext(read('12-home-inbox-logic.js'), logic, { filename: '12-home-inbox-logic.js' });
const fn = (name) => vm.runInContext(name, logic);
const L = (name, ...args) => plain(fn(name)(...plain(args)));
const row = (id, o) => Object.assign({ id, name: 'Sam Taylor', first: 'Sam', email: 'sam@example.com', known: false, ageDays: 1, count: 1, m: { id, subject: 'Subject ' + id, from: { name: 'Sam Taylor', email: 'sam@example.com' } } }, o || {});

test('homeInboxCap: s shows no rows, m and l six, full eight; an unknown size is m', () => {
  assert.deepEqual(['s', 'm', 'l', 'full', 'xl', undefined].map(s => fn('homeInboxCap')(s)), [0, 6, 6, 8, 6, 6]);
});

test('homeInboxModel: counts, the oldest thread from someone known, the rows shown and how many more', () => {
  const rows = [row('a', { known: true, ageDays: 2 }), row('b'), row('c', { known: true, ageDays: 9 }), row('d'), row('e'), row('f'), row('g'), null, { name: 'no id' }];
  const m = L('homeInboxModel', rows, { size: 'm' });
  assert.equal(m.count, 7);
  assert.equal(m.known, 2);
  assert.equal(m.oldestKnown.id, 'c');
  assert.deepEqual(m.shown.map(r => r.id), ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.equal(m.more, 1);
  const s = L('homeInboxModel', rows, { size: 's' });
  assert.deepEqual(s.shown, []);
  assert.equal(s.more, 7);
  assert.equal(L('homeInboxModel', rows, { size: 'full' }).more, 0);
  assert.deepEqual(L('homeInboxModel', null, {}), { count: 0, known: 0, oldestKnown: null, shown: [], more: 0, cap: 6 });
});

test('homeInboxSummary: the small size reads as text (never colour alone)', () => {
  const sum = (rows) => L('homeInboxSummary', fn('homeInboxModel')(plain(rows), { size: 's' }));
  assert.deepEqual(sum([row('a', { known: true, ageDays: 3 }), row('b'), row('c')]),
    { big: '3', unit: 'need a reply', known: '1 from people you know', oldest: 'Sam · 3 days' });
  assert.deepEqual(sum([row('a', { known: true, ageDays: 0 })]), { big: '1', unit: 'needs a reply', known: 'from someone you know', oldest: 'Sam · today' });
  assert.equal(sum([row('a', { known: true }), row('b', { known: true })]).known, 'all from people you know');
  assert.equal(sum([row('a')]).known, 'none from people you know');
  assert.deepEqual(sum([]), { big: '0', unit: 'need a reply', known: '', oldest: '' });
});

test('homeInboxStale: Update shows when the inbox is more than 6 hours old, or was never read', () => {
  const at = (h) => new Date(NOW - h * 3600000).toISOString();
  assert.equal(fn('homeInboxStale')(at(5.9), NOW), false);
  assert.equal(fn('homeInboxStale')(at(6.1), NOW), true);
  assert.equal(fn('homeInboxStale')(null, NOW), true);
  assert.equal(fn('homeInboxStale')('not a date', NOW), true);
});

test('homeInboxRowKey: a new message in a thread enters again; otherwise the key stays', () => {
  assert.equal(fn('homeInboxRowKey')({ id: 't1', lastMessageId: 'm9' }), 'in:m9');
  assert.equal(fn('homeInboxRowKey')({ id: 't1', m: { lastMessageId: 'm8' } }), 'in:m8');
  assert.equal(fn('homeInboxRowKey')({ id: 't1' }), 'in:t1');
  assert.equal(fn('homeInboxRowKey')(null), '');
});

test('homeInboxAgeText and homeInboxAddDays', () => {
  assert.deepEqual([0, 0.4, 1, 3, 13, 14, 30, 59, 61, 200].map(d => fn('homeInboxAgeText')(d)),
    ['today', 'today', '1 day', '3 days', '13 days', '2 weeks', '4 weeks', '8 weeks', '2 months', '7 months']);
  assert.equal(fn('homeInboxAddDays')('2026-10-30', 3), '2026-11-02');
  assert.equal(fn('homeInboxAddDays')('2026-12-31', 1), '2027-01-01');
  assert.equal(fn('homeInboxAddDays')('31/12/2026', 1), null);
});

test('homeInboxTaskPrefill: the card opens with exactly the task the ✓ adds', () => {
  const r = row('t1', { personId: 'sam', m: { id: 't1', subject: 'Lunch on\nFriday #budget', from: { name: 'Sam Taylor', email: 'sam@example.com' } } });
  const pre = L('homeInboxTaskPrefill', r, { today: TODAY, link: 'https://mail.google.com/mail/u/0/#all/t1', sender: 'Sam Taylor <sam@example.com>' });
  assert.equal(pre.title, 'Reply to Sam: Lunch on Friday #budget');
  assert.equal(pre.date, TODAY);
  assert.equal(pre.priority, 'p0');
  assert.deepEqual(pre.tags, ['email']);
  assert.deepEqual(pre.people, ['sam']);
  assert.equal(pre.detail, 'From: Sam Taylor <sam@example.com>\nSubject: Lunch on Friday #budget\nhttps://mail.google.com/mail/u/0/#all/t1');
  // An unknown sender: nobody linked; a non-https link is left out.
  const anon = L('homeInboxTaskPrefill', row('t2', { first: '' }), { today: TODAY, link: 'javascript:alert(1)' });
  assert.deepEqual(anon.people, []);
  assert.equal(anon.title, 'Reply to them: Subject t2');
  assert.doesNotMatch(anon.detail, /javascript/);
  assert.ok(L('homeInboxTaskPrefill', row('t3', { m: { id: 't3', subject: 'x'.repeat(400) } }), {}).title.length <= 140);
});

test('homeInboxSuggestionPrefill: what acceptSuggestion adds (due from the hint, known stream only)', () => {
  const s = { id: 's1', emailId: 'e1', title: 'Send the terms', detail: 'By Friday.', priority: 'p2', tags: ['from-email', 'contracts'], peopleIds: ['sam', 7, ''], dueHint: 2, stream: 'work' };
  const email = { id: 'e1', subject: 'Terms', from: { name: 'Sam Taylor', email: 'sam@example.com' } };
  const pre = L('homeInboxSuggestionPrefill', s, { today: TODAY, email, link: 'https://mail.google.com/x', sender: 'Sam Taylor', streams: { work: {} } });
  assert.equal(pre.title, 'Send the terms');
  assert.equal(pre.date, '2026-10-07');
  assert.equal(pre.priority, 'p2');
  assert.deepEqual(pre.tags, ['email', 'contracts']);
  assert.deepEqual(pre.people, ['sam']);
  assert.equal(pre.stream, 'work');
  assert.equal(pre.detail, 'By Friday.\n\nFrom: Sam Taylor\nSubject: Terms\nhttps://mail.google.com/x');
  const unknown = L('homeInboxSuggestionPrefill', Object.assign({}, s, { stream: 'gone', dueHint: null, priority: 'urgent' }), { today: TODAY, streams: { work: {} } });
  assert.equal(unknown.stream, undefined);
  assert.equal(unknown.date, null);
  assert.equal(unknown.priority, 'p3');
});

test('homeInboxPending: pending only, threads already handled left out, newest first, capped', () => {
  const triage = {
    handled: { e2: { action: 'dismiss' } },
    suggestions: [
      { id: 'a', emailId: 'e1', status: 'pending', at: 1 },
      { id: 'b', emailId: 'e2', status: 'pending', at: 5 },         // its thread is handled
      { id: 'c', emailId: 'e3', status: 'accepted', at: 6 },
      { id: 'd', emailId: 'e4', status: 'pending', at: 3 },
      { id: 'e', status: 'pending', at: 2 },
      null,
    ],
  };
  assert.deepEqual(L('homeInboxPending', triage, {}).map(s => s.id), ['d', 'e', 'a']);
  assert.deepEqual(L('homeInboxPending', triage, { limit: 2 }).map(s => s.id), ['d', 'e']);
  assert.deepEqual(L('homeInboxPending', null, {}), []);
});

test('homeInboxIgnore: the raw words the parser found, once each (an email subject keeps its words)', () => {
  assert.deepEqual(L('homeInboxIgnore', { tokens: [{ raw: 'Friday' }, { raw: '#budget' }, { raw: 'Friday' }, { raw: '' }, {}] }), ['Friday', '#budget']);
  assert.deepEqual(L('homeInboxIgnore', null), []);
});

test('homeInboxFoldUndo: everything pushed after the mark folds into it (one Undo)', () => {
  const stack = ['s0', 's1', 'mark', 'x', 'y'];
  assert.equal(fn('homeInboxFoldUndo')(stack, 'mark'), 2);
  assert.deepEqual(plain(stack), ['s0', 's1', 'mark']);
  assert.equal(fn('homeInboxFoldUndo')(stack, 'gone'), 0);
  assert.equal(fn('homeInboxFoldUndo')(stack, null), 0);
  assert.deepEqual(plain(stack), ['s0', 's1', 'mark']);
});

test('homeInboxParseFrom and homeInboxSampleRows (the gallery preview)', () => {
  assert.deepEqual(L('homeInboxParseFrom', '"Sam Taylor" <Sam@Example.com>'), { name: 'Sam Taylor', email: 'sam@example.com' });
  assert.deepEqual(L('homeInboxParseFrom', 'alex@example.org'), { name: '', email: 'alex@example.org' });
  assert.deepEqual(L('homeInboxParseFrom', 'Acme'), { name: 'Acme', email: '' });
  const rows = L('homeInboxSampleRows', [
    { id: 'x1', from: 'Sam Taylor <sam@example.com>', subject: 'Terms', date: new Date(NOW - 3 * 86400000).toISOString(), threadCount: 3 },
    { id: 'x2', from: 'Acme', subject: '', date: 'bad' },
    { id: 'x3', from: 'alex@example.org', subject: 'Slides' },
    { from: 'no id' },
  ], { now: NOW, known: 2 });
  assert.deepEqual(rows.map(r => [r.id, r.first, r.known, r.ageDays, r.count]), [['x1', 'Sam', true, 3, 3], ['x2', 'Acme', true, 0, 1], ['x3', 'alex@example.org', false, 0, 1]]);
  assert.ok(rows.every(r => r.m.link === ''), 'preview rows never link anywhere');
});

/* ───────── in the Home bundle ───────── */
function fakeEl() {
  const attrs = {};
  return { dataset: {}, innerHTML: '', textContent: '', disabled: false, isConnected: true, style: {}, getAttribute: (k) => attrs[k] ?? null,
    setAttribute: (k, v) => { attrs[k] = String(v); }, removeAttribute: (k) => { delete attrs[k]; }, hasAttribute: (k) => k in attrs,
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} }, appendChild() {}, querySelector: () => null, querySelectorAll: () => [] };
}
function bundle() {
  const calls = { open: [], marked: [], toasts: [], editor: [], quick: [], mailto: [], created: [] };
  const st = { custom: [], emailTriage: { handled: {}, suggestions: [] }, home: {}, view: 'home' };
  const undoStack = [];
  const G = {
    info: async () => ({ fake: true }), available: () => true,
    prefill: (kind, o) => (o && o.message && o.message.from && o.message.from.email ? { to: [o.message.from.email], subject: 'Re: ' + o.message.subject, body: 'Hi,', threadId: o.message.id, purpose: kind } : null),
    openEditor: (pre, o) => { calls.editor.push({ pre, title: o.title }); },
    quick: async (pre, o) => { calls.quick.push(pre); const r = { ok: true, id: 'd1', viewUrl: 'https://mail.google.com/d1' }; o.onSaved(r); return r; },
    mailto: (pre) => { calls.mailto.push(pre); return true; },
  };
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', features: {} }, CSS: { escape: (s) => s }, TextEncoder,
    window: { addEventListener() {}, GmailDraft: G },
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => fakeEl(), body: { appendChild() {} }, hidden: false },
    registerSection() {}, render() {}, saveUI() {}, undo() {},
    saveData: () => { undoStack.push('snap' + undoStack.length); },
    toast: (m, o) => calls.toasts.push({ m, o }), todayStr: () => TODAY,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    esc: (s) => String(s), escAttr: (s) => String(s), icon: (n) => `<i data-i="${n}"></i>`,
    getItem: (id) => st.custom.find(t => t.id === id), getAllItems: () => st.custom,
    _emLink: (m) => (m && m.id ? 'https://mail.google.com/mail/u/0/#all/' + m.id : ''),
    _emSenderName: (m) => (m.from && m.from.name) || '',
    emailMarkHandled: (id, action, taskId) => { calls.marked.push([id, action, taskId]); st.emailTriage.handled[id] = { action }; box.saveData(); },
    tcOpenCreate: (pre, o) => { calls.open.push(pre); box._tcCurVal = { kind: 'create', draft: pre }; },
    _tc: {}, _tcCur: () => box._tcCurVal || null, _tcFocusStart: () => { calls.focus = (calls.focus || 0) + 1; },
    parseQuickAdd: (t) => ({ tokens: /Friday/.test(t) ? [{ raw: 'Friday' }] : [] }),
    _undoStack: undoStack,
  };
  vm.createContext(box);
  const files = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort().map(read);
  vm.runInContext(files.join('\n'), box, { filename: 'home-inbox-bundle.js' });
  return { box, st, calls, undoStack, run: (code) => vm.runInContext(code, box), json: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, box)) };
}
const R = (id, o) => Object.assign({ id, name: 'Sam Taylor', first: 'Sam', email: 'sam@example.com', personId: 'sam', known: true, ageDays: 2, count: 1,
  m: { id, subject: 'Lunch on Friday', from: { name: 'Sam Taylor', email: 'sam@example.com' } } }, o || {});

test('in the bundle: registered, available, sizes and defaults as the server has them', () => {
  const { json } = bundle();
  const d = json('homeWidgetDefs().filter(d => d.id === "inbox").map(d => ({ sizes: d.sizes, defaultSize: d.defaultSize, defaultHidden: d.defaultHidden, defaults: d.defaults, available: d.available(), settings: typeof d.settings, title: d.title, group: d.group, gate: d.gate }))')[0];
  const srv = HOME_WIDGETS.find(w => w.id === 'inbox');
  assert.equal(d.available, true);
  assert.deepEqual(d.sizes, srv.sizes); assert.equal(d.defaultSize, srv.defaultSize); assert.equal(d.defaultHidden, true);
  assert.equal(d.title, srv.title); assert.equal(d.group, 'people'); assert.equal(d.gate, 'email');
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.inbox.properties).sort());
  assert.deepEqual(d.defaults, { knownOnly: false, maxDays: 14 });
  assert.equal(d.settings, 'function');
});

test('settings are clamped: an unknown age limit falls back to 14 days', () => {
  const { json } = bundle();
  assert.deepEqual(json('_hinPrefs({ prefs: { knownOnly: 1, maxDays: 99 } })'), { knownOnly: true, maxDays: 14 });
  assert.deepEqual(json('_hinPrefs({ prefs: { maxDays: "30" } })'), { knownOnly: false, maxDays: 30 });
});

test('Task opens the prefilled card (the ✓ title, the person, #email); nothing is written before Save; a second press does nothing', () => {
  const { box, calls, run, st } = bundle();
  box.r = R('t1');
  run('_hinTaskOpen(r, document.createElement("button"), document.createElement("li"))');
  assert.equal(calls.open.length, 1);
  const pre = calls.open[0];
  assert.equal(pre.title, run('homeMailQuickTaskTitle({ m: r.m, first: "Sam" })'), 'the same title emailQuickTask gives');
  assert.equal(pre.date, TODAY);
  assert.deepEqual(plain(pre.people), ['sam']);
  assert.deepEqual(plain(pre.tags), ['email']);
  assert.deepEqual(plain(pre.ignore), ['Friday'], 'the subject\'s "Friday" stays text and does not move the date');
  assert.match(pre.detail, /^From: Sam Taylor\nSubject: Lunch on Friday\nhttps:\/\/mail\.google\.com\//);
  assert.equal(calls.marked.length, 0, 'nothing is handled before Save');
  assert.equal(st.custom.length, 0);
  // Pressing Task again while its card is open: no second card, the edits stay.
  run('_hinTaskOpen(r, document.createElement("button"), document.createElement("li"))');
  assert.equal(calls.open.length, 1);
  assert.equal(calls.focus, 1);
});

test('the card\'s Save relates the thread and marks it handled in the SAME undo step as the task', () => {
  const { box, calls, run, undoStack, st } = bundle();
  box.r = R('t1');
  run('_hinTaskOpen(r, document.createElement("button"), document.createElement("li"))');
  // The card adds the task (one saveData), then calls onCreated.
  box.saveData();
  const mark = undoStack[undoStack.length - 1];
  st.custom.push({ id: 'n1', title: calls.open[0].title });
  calls.open[0].onCreated('n1');
  assert.deepEqual(calls.marked, [['t1', 'task', 'n1']]);
  assert.equal(undoStack[undoStack.length - 1], mark, 'the handled save folded into the task\'s step');
  const rel = st.custom[0].related;
  assert.equal(rel.length, 1);
  assert.equal(rel[0].type, 'email'); assert.equal(rel[0].id, 't1');
  // Saving the same card twice does not relate the thread twice.
  run('_hinRelate("n1", r.m)');
  assert.equal(st.custom[0].related.length, 1);
});

test('Reply opens the Gmail DRAFT editor prefilled (never sends); its ✓ saves a draft and the row says so', async () => {
  const { box, calls, run } = bundle();
  box.r = R('t2');
  await run('_hinReply(r, document.createElement("button"), document.createElement("li"))');
  assert.equal(calls.editor.length, 1);
  assert.equal(calls.editor[0].pre.purpose, 'reply');
  assert.deepEqual(calls.editor[0].pre.to, ['sam@example.com']);
  assert.equal(calls.editor[0].title, 'Reply to Sam');
  assert.equal(calls.quick.length, 0);
  // The ✓: a draft at once; a second press does nothing.
  box.btn = run('document.createElement("button")');
  await run('_hinReplyNow(r, btn)');
  assert.equal(calls.quick.length, 1);
  assert.equal(run('_hin.drafted.has("t2")'), true);
  await run('_hinReplyNow(r, btn)');
  assert.equal(calls.quick.length, 1);
  // Drafted: Reply does nothing more.
  await run('_hinReply(r, document.createElement("button"), document.createElement("li"))');
  assert.equal(calls.editor.length, 1);
  // Its Undo (the receipt) clears the mark.
  run('_hinUndrafted("t2")');
  assert.equal(run('_hin.drafted.has("t2")'), false);
});

test('without Gmail drafts, Reply opens the mail app and offers "Mark as handled" (nothing marked by itself)', async () => {
  const { box, calls, run } = bundle();
  box.window.GmailDraft.available = () => false;
  box.r = R('t3');
  await run('_hinReply(r, document.createElement("button"), document.createElement("li"))');
  assert.equal(calls.editor.length, 0);
  assert.equal(calls.mailto.length, 1);
  assert.equal(calls.marked.length, 0);
  const t = calls.toasts.at(-1);
  assert.equal(t.o.action.label, 'Mark as handled');
});

test('the widget never sends mail: no send call, no send endpoint', () => {
  for (const f of ['12-home-w-inbox.js', '12-home-inbox-logic.js']) {
    const s = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(s, /\.send\s*\(|messages\/send|\/send\b|sendMessage/i, f);
  }
});
