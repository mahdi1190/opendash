// Needs reply (src/app/12-home-mail-logic.js, also loaded by lib/mail-logic.mjs):
// which threads need the user, in what order; first names; the plain-text
// draft templates; and the one-click "make a task from this email"
// (emailQuickTask, 55-email-actions.js) as ONE undo step, plus the draft
// prefill. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as ML from '../lib/mail-logic.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
function box(extra = {}) {
  const ctx = { console, Date, Math, JSON, Intl, window: {}, ...extra };
  vm.createContext(ctx);
  vm.runInContext(src('12-home-mail-logic.js'), ctx, { filename: '12-home-mail-logic.js' });
  return ctx;
}

const NOW = Date.UTC(2026, 9, 10, 12, 0);
const ago = (d, h = 0) => new Date(NOW - d * 86400000 - h * 3600000).toISOString();
const msg = (id, email, name, days, x = {}) => ({ id, subject: 'Subject ' + id, from: { name, email }, date: ago(days), unread: false, important: false, count: 1, link: '', ...x });
const MESSAGES = [
  msg('a1', 'sam@example.com', 'Sam Taylor', 1, { lastMessageId: 'ma1' }),
  msg('a2', 'robin@acme.example', 'Robin Quill', 5, { important: true }),
  msg('a3', 'me@example.org', 'Test User', 0),                                  // the user replied last
  msg('a4', 'noreply@shop.example', 'Shop', 1),                                 // automated
  msg('a5', 'news@list.example', 'List', 2, { category: 'promotions' }),
  msg('a6', 'alex@example.org', 'Alex Kim', 3),
  msg('a7', 'alex@example.org', 'Alex Kim', 20),                                // too old
  msg('a8', 'pat@example.net', 'Pat Lowe', 2),                                  // handled
  msg('a9', 'kim@example.net', 'Kim Park', 4),                                  // a task already relates to it
  msg('a10', 'notifications@tool.example', 'Tool', 1),
  msg('a11', 'jo@example.net', '', 8, { important: true }),
  msg('a12', '', 'No Address', 1),                                              // nobody to answer
  msg('a13', 'sam@example.com', 'Sam Taylor', 6, { category: 'updates' }),
  msg('a1', 'sam@example.com', 'Sam Taylor', 1),                                // duplicate id
];
const PEOPLE_IDX = new Map([['sam@example.com', 'sam'], ['alex@example.org', 'alex'], ['shared@example.org', null]]);
const OPTS = { myEmails: ['ME@example.org'], peopleIdx: PEOPLE_IDX, now: NOW, taskThreads: new Set(['a9']) };
const TRIAGE = { handled: { a8: { action: 'dismiss', at: 1 } } };

test('homeNeedsReply: who needs you, in order (people you know, then important, then oldest)', () => {
  const B = box();
  const rows = plain(B.homeNeedsReply(MESSAGES, TRIAGE, OPTS));
  assert.deepEqual(rows.map(r => r.id), ['a6', 'a1', 'a11', 'a2'], 'within each group the oldest first');
  const sam = rows.find(r => r.id === 'a1');
  assert.deepEqual([sam.known, sam.personId, sam.first, sam.ageDays, sam.lastMessageId, sam.email], [true, 'sam', 'Sam', 1, 'ma1', 'sam@example.com']);
  const jo = rows.find(r => r.id === 'a11');
  assert.deepEqual([jo.known, jo.personId, jo.first, jo.name], [false, null, 'Jo', 'jo@example.net']);
  // the same through Node
  assert.deepEqual(plain(ML.homeNeedsReply(MESSAGES, TRIAGE, OPTS)).map(r => r.id), rows.map(r => r.id));
  // options: known only, the age limit, a limit; the {email: Map} index form (pplIndex())
  assert.deepEqual(plain(B.homeNeedsReply(MESSAGES, TRIAGE, { ...OPTS, knownOnly: true })).map(r => r.id), ['a6', 'a1']);
  assert.deepEqual(plain(B.homeNeedsReply(MESSAGES, TRIAGE, { ...OPTS, maxDays: 30 })).map(r => r.id), ['a7', 'a6', 'a1', 'a11', 'a2']);
  assert.deepEqual(plain(B.homeNeedsReply(MESSAGES, TRIAGE, { ...OPTS, maxDays: 3 })).map(r => r.id), ['a6', 'a1']);
  assert.equal(B.homeNeedsReply(MESSAGES, TRIAGE, { ...OPTS, limit: 2 }).length, 2);
  assert.deepEqual(plain(B.homeNeedsReply(MESSAGES, TRIAGE, { ...OPTS, peopleIdx: { email: PEOPLE_IDX } })).map(r => r.id), rows.map(r => r.id));
  // an address two people share (null in the index) still counts as someone you know
  const shared = plain(B.homeNeedsReply([msg('s1', 'shared@example.org', 'Office', 1)], {}, OPTS));
  assert.deepEqual([shared[0].known, shared[0].personId], [true, null]);
  // a known person is never dropped as "automated"
  assert.equal(B.homeNeedsReply([msg('n1', 'alerts@team.example', 'Team alerts', 1)], {}, { ...OPTS, peopleIdx: new Map([['alerts@team.example', 'team']]) }).length, 1);
  // nothing in, nothing out
  assert.deepEqual(plain(B.homeNeedsReply(null, null, {})), []);
  const sum = plain(B.homeNeedsReplySummary(rows));
  assert.equal(sum.count, 4); assert.equal(sum.known, 2); assert.equal(sum.oldestKnown.id, 'a6');
  assert.equal(B.homeNeedsReplySummary([]).oldestKnown, null);
});

test('automated senders, first names, subjects and task titles', () => {
  const B = box();
  for (const e of ['noreply@x.example', 'no-reply@x.example', 'do-not-reply@x.example', 'donotreply@x.example', 'notifications@x.example', 'notification@x.example',
    'alerts@x.example', 'mailer-daemon@x.example', 'postmaster@x.example', 'bounce@x.example', 'newsletter@x.example', 'team-noreply@x.example', 'noreply2@x.example',
    'info@x.example', 'news@x.example', 'hello@x.example', 'marketing@x.example', 'support@x.example', 'billing@x.example', 'events@x.example']) {
    assert.equal(B.homeMailIsAutomated(e), true, e);
  }
  for (const e of ['sam@example.com', 'renotify-sam@x.example', 'alexander@x.example', '', 'nope']) assert.equal(B.homeMailIsAutomated(e), false, e);
  assert.equal(B.homeMailFirstName('Sam Taylor', 'x@y.z'), 'Sam');
  assert.equal(B.homeMailFirstName('"Taylor, Sam"', ''), 'Sam');
  assert.equal(B.homeMailFirstName('Dr Alex Kim', ''), 'Alex');
  assert.equal(B.homeMailFirstName('', 'sam.taylor@example.com'), 'Sam');
  assert.equal(B.homeMailFirstName('robin@acme.example', ''), 'Robin');
  assert.equal(B.homeMailFirstName('', ''), '');
  assert.equal(B.homeMailReplySubject('Venue'), 'Re: Venue');
  assert.equal(B.homeMailReplySubject('RE: Venue'), 'RE: Venue');
  assert.equal(B.homeMailReplySubject('a\r\nBcc: x'), 'Re: a Bcc: x');
  assert.equal(B.homeMailReplySubject(''), 'Re: (no subject)');
  assert.equal(B.homeMailQuickTaskTitle({ m: msg('t', 'sam@example.com', 'Sam Taylor', 1, { subject: 'The venue' }) }), 'Reply to Sam: The venue');
  assert.equal(B.homeMailQuickTaskTitle(msg('t', 'x@example.com', '', 1, { subject: 'y'.repeat(200) })).length, 140);
  assert.equal(B.homeMailAgeDays('garbage', NOW), null);
  assert.equal(B.homeMailAgeDays(ago(0, 30), NOW), 1);
});

test('draft templates (plain text, no AI)', () => {
  const B = box();
  assert.equal(B.homeMailDraftTemplate('nudge', { first: 'Sam', me: 'Alex', taskTitle: 'the data files' }),
    'Hi Sam,\n\nJust checking in on the data files. Is there anything you need from me?\n\nThanks,\nAlex');
  assert.equal(B.homeMailDraftTemplate('reply', { first: 'Sam', me: 'Alex' }), 'Hi Sam,\n\n\n\nBest,\nAlex');
  assert.equal(B.homeMailDraftTemplate('note', { first: 'Sam', me: 'Alex', line: 'See you at 3.' }), 'Hi Sam,\n\nSee you at 3.\n\nAlex');
  assert.equal(B.homeMailDraftTemplate('reply', {}), 'Hi,\n\n\n\nBest,');
  assert.equal(B.homeMailDraftTemplate('nudge', { first: 'Sam' }), 'Hi Sam,\n\nJust checking in. Is there anything you need from me?\n\nThanks,');
});

/* ---------- emailQuickTask and the draft prefill (55-email-actions.js, page stubs) ---------- */
function pageBox() {
  const saves = [];
  let group = 0, inGroup = 0;
  const state = { custom: [], statuses: {}, people: [{ id: 'sam', name: 'Sam Taylor', email: 'sam@example.com' }, { id: 'me', name: 'Test User', email: 'me@example.org', self: true }],
    emailTriage: { handled: {}, suggestions: [] } };
  const ctx = box({
    state, APP_CONFIG: { myEmails: [] }, _serverAvailable: true,
    selUndoGroup: (fn) => { group++; inGroup++; try { return fn(); } finally { inGroup--; } },
    saveData: () => saves.push({ inGroup: inGroup > 0, group }),
    render: () => {}, toast: () => () => {}, undo: () => {},
    todayStr: () => '2026-10-10', userName: () => 'Test User',
    getItem: (id) => state.custom.find(t => t.id === id),
    getPerson: (id) => state.people.find(p => p.id === id),
    statusOf: (id) => state.statuses[id] || 'todo',
    pplPersonEmails: (p) => [p.email].filter(Boolean),
    pplIndex: () => ({ email: new Map([['sam@example.com', 'sam']]) }),
    addCustomTask: (title, due, prio, tags, stream, rec, extra) => { const id = 'u-' + (state.custom.length + 1); state.custom.push({ id, title, dueDate: due, priority: prio, tags, people: extra.people, detail: extra.detail }); ctx.saveData(); return id; },
    emailMarkHandled: (id, action, taskId) => { state.emailTriage.handled[id] = { action, taskId }; ctx.saveData(); },
    _emSenderName: (m) => m.from.name || m.from.email,
    _emLink: (m) => 'https://mail.google.com/mail/#all/' + m.id,
    emailMessages: () => MESSAGES.slice(0, 2),
    emailById: (id) => MESSAGES.find(m => m.id === id) || null,
  });
  vm.runInContext(src('55-email-actions.js'), ctx, { filename: '55-email-actions.js' });
  return { ctx, state, saves, groups: () => group };
}

test('emailQuickTask: the task, the person, the related thread and "handled" in ONE undo step', () => {
  const { ctx, state, saves, groups } = pageBox();
  const m = MESSAGES[0];
  const id = ctx.emailQuickTask(m);
  assert.equal(id, 'u-1');
  const t = plain(state.custom[0]);
  assert.equal(t.title, 'Reply to Sam: Subject a1');
  assert.equal(t.dueDate, '2026-10-10'); assert.deepEqual(t.tags, ['email']); assert.deepEqual(t.people, ['sam']);
  assert.match(t.detail, /^From: Sam Taylor\nSubject: Subject a1\nhttps:\/\/mail\.google\.com\/mail\/#all\/a1$/);
  assert.equal(t.related.length, 1); assert.equal(t.related[0].type, 'email'); assert.equal(t.related[0].id, 'a1');
  assert.deepEqual(plain(state.emailTriage.handled.a1), { action: 'task', taskId: 'u-1' });
  assert.equal(groups(), 1, 'one selUndoGroup');
  assert.ok(saves.length >= 2 && saves.every(s => s.inGroup), 'every save inside the one group, so Undo takes it all back');
  // an unknown sender: no person; another due date
  ctx.emailQuickTask(msg('z1', 'robin@acme.example', 'Robin Quill', 1), { due: null });
  assert.deepEqual(plain(state.custom[1].people), []); assert.equal(state.custom[1].dueDate, null);
  assert.equal(ctx.emailQuickTask(null), null);
  // Needs reply over the page's stores: the handled thread has gone
  assert.deepEqual(plain(ctx.emailNeedsReply({})).map(r => r.id), ['a2']);
});

test('GmailDraft.prefill: a reply in the thread, a nudge for a task, a note; addresses only from People or the thread', () => {
  const { ctx, state } = pageBox();
  const r = plain(ctx.window.GmailDraft.prefill('reply', { message: MESSAGES[0] }));
  assert.deepEqual(r, { to: ['sam@example.com'], cc: [], subject: 'Re: Subject a1', body: 'Hi Sam,\n\n\n\nBest,\nTest', threadId: 'a1', purpose: 'reply' });
  state.custom.push({ id: 't-9', title: 'Send the data files', related: [{ type: 'email', id: 'a1' }] });
  const n = plain(ctx.window.GmailDraft.prefill('nudge', { task: 't-9', person: 'sam' }));
  assert.equal(n.threadId, 'a1'); assert.equal(n.subject, 'Re: Subject a1'); assert.equal(n.taskId, 't-9'); assert.equal(n.purpose, 'nudge');
  assert.match(n.body, /^Hi Sam,\n\nJust checking in on Send the data files\./);
  state.custom.push({ id: 't-10', title: 'Venue booking' });
  assert.equal(plain(ctx.window.GmailDraft.prefill('nudge', { task: 't-10', person: 'sam' })).subject, 'Venue booking', 'no thread: a new email titled after the task');
  assert.equal(ctx.window.GmailDraft.prefill('nudge', { task: 't-10', person: 'nobody' }), null, 'no address: no draft');
  const note = plain(ctx.window.GmailDraft.prefill('note', { person: 'sam', subject: 'Friday', line: 'Running ten minutes late.' }));
  assert.deepEqual(note, { to: ['sam@example.com'], cc: [], subject: 'Friday', body: 'Hi Sam,\n\nRunning ten minutes late.\n\nTest', purpose: 'note' });
  assert.equal(ctx.window.GmailDraft.prefill('reply', { message: msg('q', '', 'x', 1) }), null);
  for (const k of ['info', 'available', 'prefill', 'openEditor', 'quick', 'create', 'remove', 'mailto']) assert.equal(typeof ctx.window.GmailDraft[k], 'function', k);
  // the page never has a way to send
  assert.doesNotMatch(src('55-email-actions.js').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, ''), /send_message|\/api\/gmail\/send|forward\(/);
});
