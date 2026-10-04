// Suggestion cards S10-S20 (src/app/68-suggest-rules-tasks.js): tasks, people,
// focus and housekeeping. Each rule fires on its fixture and stays quiet on a
// near miss, keeps the card contract and the user's rule (3 Oct): the PRIMARY
// opens the normal editor prefilled (the event card, the task card, the draft
// editor, or the pre-ticked choose list for a batch), the ✓ applies at once
// with Undo. Plus the page side these cards added: the 'ops.choose' action
// (checks), task.createOpen's afterOps ('$new') and its re-click no-op, and
// the extra snapshot fields (68-suggest-context-tasks.js). Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { engine, fixture, makeCtx, ev, task, runRule, evaluate, assertCard, assertRuleContract } from './fixtures/suggest/harness.mjs';

const E = engine();
const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const MON = '2026-10-05', TUE = '2026-10-06', WED = '2026-10-07';
const keys = (cards) => cards.map(c => c.key);
const allOps = (c) => [c.primary, c.quick, ...(c.secondary || []), ...(c.menu || [])].filter(Boolean)
  .flatMap(a => (a.action.args && a.action.args.ops) || []);

test('S10-S20 are registered with valid definitions', () => {
  for (const id of ['day-overload', 'roll-leftovers', 'keeps-moving', 'task-estimate', 'nudge-waiting', 'reply-owed', 'email-known', 'email-tasks', 'meeting-ended', 'stream-quiet', 'calendar-stale']) {
    const r = E.sgRule(id);
    assert.ok(r, id + ' registered');
    assert.deepEqual(E.sgCheckRule(r), [], id);
    assert.ok(r.description && r.safetyHint, id + ' has words for Settings');
  }
});

/* ---------- S10 too much for today ---------- */
function overloadCtx(over = {}) {
  return makeCtx(Object.assign({
    now: `${MON}T10:00`,
    events: { [MON]: [ev('11:00', '13:00', { attendees: 3 }), ev('14:00', '16:00', { attendees: 2 })] },
    tasks: [
      task({ id: 'a', title: 'Report draft', priority: 'p1', due: MON, estimate: 120 }),
      task({ id: 'b', title: 'Tidy notes', priority: 'p3', planned: MON, estimate: 60 }),
      task({ id: 'c', title: 'Book the venue', priority: 'p2', planned: MON, estimate: 60 }),
      task({ id: 'd', title: 'Order supplies', priority: 'p0', due: MON, estimate: 45 }),
    ],
  }, over));
}
test('S10 fires when today holds more than the free time, and moves the lowest first', () => {
  const [c] = assertRuleContract(E, 'day-overload', {
    fires: overloadCtx(),
    quiet: [
      overloadCtx({ now: `${MON}T15:10` }),                                                     // after 15:00
      overloadCtx({ events: { [MON]: [] } }),                                                    // it fits
      overloadCtx({ now: '2026-10-03T10:00' }),                                                   // Saturday
      overloadCtx({ tasks: [task({ id: 'a', priority: 'p1', due: MON, estimate: 400 }), task({ id: 'b', priority: 'p3', planned: MON })] }),   // one movable
    ],
  });
  assert.equal(c.key, `overload:${MON}`);
  assert.equal(c.primary.action.type, 'ops.choose', 'primary opens the pre-ticked list');
  assert.equal(c.quick.action.type, 'ops');
  const ops = c.quick.action.args.ops;
  assert.ok(!ops.some(o => o.id === 'a'), 'never the p1 task');
  assert.equal(ops[0].op, 'task.plan', 'planned-only tasks first, keeping their deadline');
  assert.equal(ops[0].id, 'b', 'the lowest priority first');
  assert.equal(ops[0].date, TUE, 'to the next work day');
  const d = ops.find(o => o.id === 'd');
  if (d) { assert.equal(d.op, 'task.reschedule'); assert.match(d.reason, /Rebalanced/); }
  const items = c.primary.action.args.items;
  assert.ok(items.every(i => i.alts.length === 2), 'two days per row');
  assert.deepEqual(items.filter(i => i.on).map(i => i.id).sort(), [...new Set(ops.map(o => o.id))].sort(), 'the list is ticked as the ✓ would do');
  assert.match(c.text, /Move \d lower-priority/);
});
test('S10 skips tasks with a block or a time today', () => {
  const ctx = overloadCtx();
  ctx.cal.days[MON].push(ev('16:00', '17:00', { origin: { kind: 'block', taskId: 'b' }, linked: ['b'] }));
  ctx.tasks.find(t => t.id === 'c').plannedTime = '09:30';
  const cards = runRule(E, 'day-overload', ctx);
  for (const c of cards) assert.ok(!allOps(c).some(o => o.id === 'b' || o.id === 'c'));
});

/* ---------- S11 roll leftovers ---------- */
test('S11 rolls today’s leftovers in the evening, once, until the recap is saved', () => {
  const [c] = assertRuleContract(E, 'roll-leftovers', {
    fires: fixture('evening-rollover'),
    quiet: [Object.assign(fixture('evening-rollover'), { eveningSaved: true }), fixture('evening-rollover', { tasks: [] })],
  });
  assert.equal(c.key, `roll:${MON}`);
  assert.equal(c.hours, 'evening');
  assert.equal(c.primary.action.type, 'ops.choose');
  const ops = c.quick.action.args.ops;
  assert.equal(ops.length, 3);
  assert.deepEqual(ops.find(o => o.id === 't-b'), { op: 'task.plan', id: 't-b', date: TUE }, 'planned items keep their deadline');
  assert.equal(ops.find(o => o.id === 't-a').op, 'task.reschedule');
  assert.equal(ops.find(o => o.id === 't-a').reason, 'Rolled over at the end of the day');
  const item = c.primary.action.args.items[0];
  assert.deepEqual(item.alts.map(a => a.label), ['Tomorrow', 'Wed', 'Won’t do']);
  assert.equal(item.alts[2].ops[0].op, 'task.wont_do');
  // Friday evening: Monday, never the weekend.
  const fri = runRule(E, 'roll-leftovers', makeCtx({ now: '2026-10-09T18:00', tasks: [task({ id: 'x', due: '2026-10-09' })] }))[0];
  assert.equal(fri.quick.action.args.ops[0].dueDate, '2026-10-12');
  assert.match(fri.text, /Mon/);
  // The engine shows it only from the evening hour.
  assert.equal(E.sgHoursOk(E.sgRule('roll-leftovers'), fixture('evening-rollover', { now: `${MON}T15:00` })), false);
});

/* ---------- S12 the task you keep moving ---------- */
const moves = (n) => Array.from({ length: n }, (_, i) => ({ at: E.sgAddDays(MON, -18 + i * 3), from: E.sgAddDays(MON, -18 + i * 3), to: E.sgAddDays(MON, -15 + i * 3), reason: i === n - 1 ? 'Ran out of time' : '' }));
test('S12 offers an hour on the next work day for a task moved 3+ times', () => {
  const ctx = makeCtx({ now: `${MON}T10:00`, tasks: [task({ id: 'm', title: 'Report draft', moves: moves(4) }), task({ id: 'n', moves: moves(2) })] });
  const [c] = assertRuleContract(E, 'keeps-moving', {
    fires: ctx,
    quiet: [makeCtx({ tasks: [task({ id: 'm', moves: moves(2) })] }),
      makeCtx({ tasks: [task({ id: 'm', moves: moves(3).map(m => Object.assign(m, { reason: 'Nudged' })) })] }),
      makeCtx({ tasks: [task({ id: 'm', moves: moves(4).map(m => Object.assign(m, { at: '2026-08-01' })) })] })],
  });
  assert.equal(c.key, 'moving:m');
  assert.equal(c.primary.action.type, 'cal.blockOpen', 'the event card in create mode');
  assert.equal(c.quick.action.type, 'cal.block');
  const a = c.primary.action.args;
  assert.equal(a.date, TUE); assert.equal(a.start, 9 * 60); assert.equal(a.end, 10 * 60);
  assert.equal(a.taskId, 'm'); assert.equal(a.title, 'Focus: Report draft');
  assert.match(c.title, /moved 4 times/);
  assert.match(c.why[0], /Ran out of time/);
  assert.deepEqual(c.secondary.map(s => s.label), ['Won’t do', 'Lower priority', 'Break it down']);
  assert.equal(c.entity, 'task:m');
  assert.equal(E.sgRule('keeps-moving').cooldown.notFor, 14);
});
test('S12 without a calendar opens the task to break it down; without write access says Connect', () => {
  const noCal = runRule(E, 'keeps-moving', makeCtx({ cal: { ok: false }, caps: { calendar: false }, tasks: [task({ id: 'm', moves: moves(3) })] }))[0];
  assertCard(E, noCal);
  assert.equal(noCal.primary.action.type, 'task.open');
  assert.equal(noCal.quick, null);
  const noWrite = runRule(E, 'keeps-moving', makeCtx({ caps: { calWrite: false }, tasks: [task({ id: 'm', moves: moves(3) })] }))[0];
  assert.equal(noWrite.primary.action.type, 'nav');
  assert.equal(noWrite.quick, null);
});

/* ---------- S13 estimate ---------- */
test('S13 asks for a length on an important task due soon; the ✓ sets the guess', () => {
  const [c] = assertRuleContract(E, 'task-estimate', {
    fires: makeCtx({ tasks: [task({ id: 'e', title: 'Grant report', priority: 'p1', due: WED })], focus: [] }),
    quiet: [makeCtx({ tasks: [task({ id: 'e', priority: 'p1', due: WED, estimate: 60 })], focus: [] }),
      makeCtx({ tasks: [task({ id: 'e', priority: 'p2', due: '2026-10-30' })], focus: [] })],
  });
  assert.equal(c.key, 'estimate:e');
  assert.equal(c.primary.action.type, 'task.open');
  assert.deepEqual(c.quick.action.args.ops, [{ op: 'task.set_estimate', id: 'e', minutes: 120 }]);
  assert.equal(c.secondary.length, 3);
  assert.ok(c.secondary.every(s => s.action.args.ops[0].minutes !== 120));
  // Falls back to a Focus task; a guess from its open subtasks.
  const f = runRule(E, 'task-estimate', makeCtx({ tasks: [task({ id: 'f', subtasks: { done: 1, total: 3, open: ['a', 'b'], doneAt: [] } })], focus: ['f'] }))[0];
  assert.equal(f.quick.action.args.ops[0].minutes, 60);
  assert.match(f.why[0], /Number 1 in Focus/);
  assert.equal(runRule(E, 'task-estimate', makeCtx({ tasks: [task({ id: 'a', priority: 'p1', due: WED }), task({ id: 'b', priority: 'p1', due: TUE })] })).length, 1, 'one a day');
});

/* ---------- S14 nudge ---------- */
test('S14 drafts a nudge (never sends): draft editor prefilled, ✓ saves the draft, then notes and follows up', () => {
  const [c] = assertRuleContract(E, 'nudge-waiting', {
    fires: fixture('waiting-overdue'),
    quiet: [
      fixture('waiting-overdue', { tasks: [{ id: 't-wait', waiting: true, people: ['sam'], createdAt: '2026-10-03T09:00:00Z' }] }),       // 2 days, no date
      fixture('waiting-overdue', { tasks: [{ id: 't-wait', waiting: true, people: [], createdAt: '2026-09-20T09:00:00Z' }] }),           // nobody
      fixture('waiting-overdue', { tasks: [{ id: 't-wait', waiting: false, people: ['sam'], createdAt: '2026-09-20T09:00:00Z' }] }),     // not waiting
    ],
  });
  assert.equal(c.key, 'nudge:t-wait:2026-10-02');
  assert.equal(c.primary.action.type, 'gmail.draftOpen');
  assert.equal(c.quick.action.type, 'gmail.draft');
  const d = c.primary.action.args;
  assert.deepEqual(d.to, ['sam@example.com']);
  assert.equal(d.purpose, 'nudge');
  assert.match(d.body, /^Hi Sam,\n\nJust checking in on Data files from Sam/);
  assert.deepEqual(d.ops.map(o => o.op), ['task.add_note', 'task.reschedule']);
  assert.equal(d.ops[1].dueDate, '2026-10-08', '3 work days later');
  assert.equal(d.ops[1].reason, 'Nudged');
  assert.ok(c.secondary.some(s => s.label === 'They replied'));
  assert.ok(!JSON.stringify(c).includes('send'), 'nothing sends');
});
test('S14 waits on the named person, answers in the related thread, offers the next meeting', () => {
  const ctx = fixture('waiting-overdue', {
    tasks: [{ id: 't-wait', title: 'Data files', waiting: true, people: ['sam', 'alex'], waitingOn: 'alex', createdAt: '2026-09-28T09:00:00Z', emails: [{ id: 'th9', label: 'Data files' }] }],
    inbox: { ok: true, fetchedAt: 'x', threads: [{ id: 'th9', subject: 'Data files', from: { email: 'alex@example.com' }, date: '2026-09-28T10:00:00Z' }] },
    events: { [WED]: [{ id: 'mx', title: 'Catch-up', start: '10:00', end: '10:30', attendees: 1, people: ['alex'] }] },
  });
  const c = runRule(E, 'nudge-waiting', ctx)[0];
  assert.deepEqual(c.primary.action.args.to, ['alex@example.com']);
  assert.equal(c.primary.action.args.threadId, 'th9');
  assert.equal(c.primary.action.args.subject, 'Re: Data files');
  const raise = c.secondary.find(s => /Raise it/.test(s.label));
  assert.ok(raise);
  assert.deepEqual(raise.action.args.ops[0], { op: 'event.annotate', eventId: 'mx', appendNotes: 'Ask Alex about: Data files' });
  // Without Gmail drafts: the mail app, and no ✓.
  const noG = runRule(E, 'nudge-waiting', fixture('waiting-overdue', { caps: { gmailDraft: false } }))[0];
  assert.equal(noG.primary.label, 'Open in your mail app');
  assert.equal(noG.quick, null);
});

/* ---------- S15 reply owed ---------- */
test('S15 offers a reply draft for a reply-type task 2+ days old', () => {
  const mk = (o) => makeCtx(Object.assign({ now: `${MON}T10:00`, caps: { gmailDraft: true } }, o));
  const [c] = assertRuleContract(E, 'reply-owed', {
    fires: mk({ tasks: [task({ id: 'r', title: 'Reply to Sam about the venue', people: ['sam'], createdAt: '2026-10-01T09:00:00Z' })] }),
    quiet: [
      mk({ tasks: [task({ id: 'r', title: 'Reply to Sam about the venue', people: ['sam'], createdAt: '2026-10-05T08:00:00Z' })] }),   // today
      mk({ tasks: [task({ id: 'r', title: 'Read the venue contract', people: ['sam'], createdAt: '2026-10-01T09:00:00Z' })] }),        // not a reply
      mk({ tasks: [task({ id: 'r', title: 'Reply to Sam', people: [], createdAt: '2026-10-01T09:00:00Z' })] }),                         // nobody
    ],
  });
  assert.equal(c.key, 'owe:r');
  assert.equal(c.primary.action.type, 'gmail.draftOpen');
  assert.equal(c.primary.action.args.purpose, 'reply');
  assert.deepEqual(c.primary.action.args.ops, [{ op: 'task.plan', id: 'r', date: MON }]);
  assert.match(c.title, /Sam has waited 4 days/);
  assert.ok(c.secondary.some(s => s.label === 'Already replied'));
  const blk = c.secondary.find(s => s.action.type === 'cal.block');
  assert.ok(blk, 'a 15 minute block when there is a gap');
  assert.equal(blk.action.args.end - blk.action.args.start, 15);
  const late = runRule(E, 'reply-owed', mk({ tasks: [task({ id: 'r', title: 'Send Sam the budget', people: ['sam'], due: '2026-10-02' })] }))[0];
  assert.match(late.title, /3 days past the date/);
});

/* ---------- S16 email from someone you know ---------- */
test('S16 turns a known sender’s unanswered email into today’s task (task card prefilled)', () => {
  const [c] = assertRuleContract(E, 'email-known', {
    fires: fixture('inbox-known-sender'),
    quiet: [
      fixture('inbox-known-sender', { now: '2026-10-03T10:00' }),                                            // 1 day old
      fixture('inbox-known-sender', { now: '2026-10-20T10:00' }),                                            // 18 days old
      fixture('inbox-known-sender', { tasks: [{ id: 'x', title: 'Venue', emails: [{ id: 'th1', label: 'v' }] }] }),   // a task has it
      fixture('inbox-known-sender', { people: { sam: { first: 'Sam', name: 'Sam Lee', email: 'sam@example.com', self: true } } }),   // it is the user
    ],
  });
  assert.equal(c.key, 'email:th1');
  assert.equal(c.primary.action.type, 'task.createOpen');
  const a = c.primary.action.args;
  assert.equal(a.title, 'Reply to Sam: The venue for the workshop');
  assert.equal(a.date, MON); assert.deepEqual(a.people, ['sam']); assert.deepEqual(a.tags, ['email']);
  assert.deepEqual(a.afterOps.map(o => o.op), ['task.relate', 'email.triage']);
  assert.ok(a.afterOps.every(o => o.id === '$new' || o.taskId === '$new'));
  const ops = c.quick.action.args.ops;
  assert.deepEqual(ops.map(o => o.op), ['task.create', 'task.relate', 'email.triage']);
  assert.equal(ops[0].ref, 't'); assert.equal(ops[1].id, '$t'); assert.equal(ops[2].taskId, '$t');
  assert.ok(c.secondary.some(s => s.label === 'Nothing to do'));
  // Read, not important, a single message, no open tasks with them: not worth a card.
  const calm = fixture('inbox-known-sender');
  calm.inbox.threads[0].unread = false;
  assert.deepEqual(runRule(E, 'email-known', calm), []);
  // Promotions are never offered; neither are the user's own addresses.
  const own = fixture('inbox-known-sender');
  own.myEmails = ['sam@example.com'];
  assert.deepEqual(runRule(E, 'email-known', own), []);
});

/* ---------- S17 emails that look like tasks ---------- */
const sug = (i, o = {}) => Object.assign({ id: 's' + i, emailId: 'th' + i, title: `Send the slides ${i}`, dueHint: 2, tags: ['from-email', 'talk'], priority: 'p2', confidence: 0.8, peopleIds: ['sam'] }, o);
test('S17 adds one email task through the prefilled task card; several through the ticked list', () => {
  const [one] = assertRuleContract(E, 'email-tasks', {
    fires: makeCtx({ triage: { pending: [sug(1)] } }),
    quiet: [makeCtx({ triage: { pending: [] } }), makeCtx({ triage: { pending: [sug(1, { confidence: 0.3 })] } })],
  });
  assert.equal(one.primary.action.type, 'task.createOpen');
  assert.equal(one.primary.action.args.date, WED);
  assert.deepEqual(one.primary.action.args.tags, ['email', 'talk']);
  assert.deepEqual(one.primary.action.args.afterOps, [{ op: 'email.triage', threadId: 'th1', action: 'task', taskId: '$new' }]);
  assert.deepEqual(one.quick.action.args.ops.map(o => o.op), ['task.create', 'email.triage']);
  const [many] = runRule(E, 'email-tasks', makeCtx({ triage: { pending: [sug(1), sug(2), sug(3)] } }));
  assertCard(E, many);
  assert.equal(many.primary.action.type, 'ops.choose');
  assert.equal(many.primary.action.args.items.length, 3);
  assert.equal(many.quick.action.args.ops.length, 6);
  assert.equal(many.quick.action.args.ops[5].taskId, '$e2');
  const again = runRule(E, 'email-tasks', makeCtx({ triage: { pending: [sug(3), sug(1), sug(2)] } }))[0];
  assert.equal(again.key, many.key, 'the key does not depend on the order');
});

/* ---------- S18 meeting just ended ---------- */
test('S18 offers to capture actions after a meeting with people you know', () => {
  const mk = (evo = {}, o = {}) => makeCtx(Object.assign({ now: `${MON}T12:20`, events: { [MON]: [ev('11:00', '12:00', Object.assign({ id: 'mt', title: 'Project sync', attendees: 1, people: ['sam'], type: 'meeting' }, evo))] } }, o));
  const [c] = assertRuleContract(E, 'meeting-ended', {
    fires: mk(),
    quiet: [mk({ notes: true }), mk({ linked: ['t1'] }), mk({ wrapped: true }), mk({ people: [] }), mk({}, { now: `${MON}T15:30` }), mk({}, { now: `${MON}T11:30` }),
      mk({}, { tasks: [task({ people: ['sam'], createdAt: Date.parse(`${MON}T12:10:00Z`) })] })],
  });
  assert.equal(c.key, 'after:mt');
  assert.equal(c.primary.action.type, 'task.createOpen');
  assert.equal(c.primary.action.args.eventId, 'mt', 'linked to the meeting on Save');
  assert.equal(c.primary.action.args.date, WED, '+2 work days');
  assert.deepEqual(c.quick.action.args.ops.map(o => o.op), ['task.create', 'task.plan', 'event.annotate']);
  assert.deepEqual(c.quick.action.args.ops[2].linkTasks, ['$t']);
  assert.deepEqual(c.secondary[0].action.args.ops, [{ op: 'event.annotate', eventId: 'mt', wrapped: true }]);
});

/* ---------- S19 a stream has gone quiet ---------- */
test('S19 holds time for a quiet stream with something important coming', () => {
  const mk = (o = {}) => makeCtx(Object.assign({ now: `${MON}T10:00`,
    tasks: [task({ id: 'q', title: 'Book chapter 3', stream: 'research', priority: 'p1', due: '2026-10-17' }), task({ id: 'w', stream: 'work', priority: 'p2' })],
    streams: { research: { label: 'Research', lastDone: '2026-09-27' }, work: { label: 'Work', lastDone: MON } } }, o));
  const [c] = assertRuleContract(E, 'stream-quiet', {
    fires: mk(),
    quiet: [
      mk({ streams: { research: { label: 'Research', lastDone: '2026-10-01' } } }),                                          // done 4 days ago
      mk({ events: { [TUE]: [ev('09:00', '10:00', { origin: { kind: 'block', taskId: 'q' }, linked: ['q'] })] } }),     // already booked
      mk({ tasks: [task({ id: 'q', stream: 'research', priority: 'p2', due: '2026-12-20' })] }),                              // nothing pressing
      mk({ tasks: [task({ id: 'q', stream: 'research', priority: 'p1', subtasks: { done: 1, total: 2, open: ['x'], doneAt: [Date.parse('2026-10-03T12:00:00')] } })] }),   // a subtask done
    ],
  });
  assert.equal(c.key, 'quiet:research:2026-10-05');
  assert.equal(c.entity, 'stream:research', 'Not for this one pauses the stream');
  assert.equal(E.sgRule('stream-quiet').cooldown.notFor, 14);
  assert.equal(c.primary.action.type, 'cal.blockOpen');
  const a = c.primary.action.args;
  assert.equal(a.date, TUE); assert.equal(a.end - a.start, 120); assert.equal(a.taskId, 'q');
  assert.match(c.title, /No Research work in 8 days/);
  assert.match(c.why.join(' '), /in 12 days/);
});

/* ---------- S20 calendar out of date ---------- */
test('S20 appears only when a stale calendar held time cards back, and only reads', () => {
  const ctx = fixture('stale-calendar');
  ctx.cal.fetchedAt = '2026-10-04T18:00:00Z';
  const res = evaluate(E, ctx, {}, ['free-slot', 'calendar-stale']);
  assert.ok(res.suppressed.includes('free-slot'));
  const c = res.cards.find(x => x.rule === 'calendar-stale');
  assert.ok(c, 'the guard card');
  assertCard(E, c);
  assert.equal(c.primary.action.type, 'store.refresh');
  assert.ok(!c.quick, 'read-only: no ✓');
  assert.match(c.title, /Calendar last updated 4 Oct/);
  assert.match(c.why[0], /21 hours ago/);
  // Nothing held back, a fresh calendar, or the schedule widget on the board: quiet.
  assert.equal(evaluate(E, ctx, {}, ['calendar-stale']).cards.length, 0);
  assert.equal(evaluate(E, fixture('weekday-afternoon-gap'), {}, ['free-slot', 'calendar-stale']).cards.filter(x => x.rule === 'calendar-stale').length, 0);
  const sch = fixture('stale-calendar', { surfacesVisible: { schedule: true } });
  assert.equal(evaluate(E, sch, {}, ['free-slot', 'calendar-stale']).cards.filter(x => x.rule === 'calendar-stale').length, 0);
});

/* ---------- all together ---------- */
test('the whole engine runs these rules on every fixture without errors, and fast', () => {
  for (const f of ['weekday-afternoon-gap', 'saturday-gap', 'packed-day', 'evening-rollover', 'waiting-overdue', 'inbox-known-sender', 'block-clash', 'block-started', 'stale-calendar', 'no-calendar-write']) {
    const res = evaluate(E, fixture(f));
    assert.deepEqual(res.errors, [], f);
    for (const c of res.cards) assertCard(E, c, `${f} ${c.key}`);
  }
  const big = overloadCtx({ tasks: Array.from({ length: 400 }, (_, i) => task({ id: 'k' + i, priority: ['p0', 'p2', 'p3'][i % 3], planned: MON, moves: moves(i % 5), people: ['sam'], waiting: i % 7 === 0, createdAt: '2026-09-01T00:00:00Z' })) });
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) evaluate(E, JSON.parse(JSON.stringify(big)));
  assert.ok((performance.now() - t0) / 20 < 60, 'well under a frame per evaluation with 400 tasks');
});
test('the card contract rejects a batch list or an after-save step that would do something not allowed', () => {
  const base = runRule(E, 'roll-leftovers', fixture('evening-rollover'))[0];
  const bad = JSON.parse(JSON.stringify(base));
  bad.primary.action.args.items[0].alts[0].ops = [{ op: 'task.bin', id: 't-a' }];
  assert.ok(E.sgCheckCard(bad).some(x => /task\.bin/.test(x)));
  const one = runRule(E, 'email-known', fixture('inbox-known-sender'))[0];
  const bad2 = JSON.parse(JSON.stringify(one));
  bad2.primary.action.args.afterOps.push({ op: 'email.send' });
  assert.ok(E.sgCheckCard(bad2).some(x => /email\.send/.test(x)));
});

/* ---------- the page side: ops.choose, task.createOpen afterOps, the snapshot extras ---------- */
function page(o = {}) {
  const posts = [], opened = [], toasts = [];
  const box = {
    console, setTimeout, clearTimeout, Promise, JSON, Math, Date, Object, Array, String, Number, Set, Map, RegExp, Error,
    state: { custom: [], suggest: undefined, suggestStats: undefined, _lastSave: 1 },
    APP_CONFIG: {}, window: {}, todayStr: () => MON, fmtDate: (d) => d.toISOString().slice(0, 10),
    getItem: () => null, netErrorMessage: (e, f) => (e && e.message) || f, toast: (m) => { toasts.push(m); return () => {}; },
    confirmDialog: async () => true, render() {}, saveData() {}, saveUI() {},
    tcOpenCreate: (pre, opt) => { opened.push(['create', pre]); box._tc = { closing: false }; box._cur = { kind: 'create', draft: { key: 'n1' } }; },
    _tcCur: () => box._cur, _tcFocusStart: () => opened.push(['focus']),
    sgChooseOpen: (a, opt) => { opened.push(['choose', a.items.length]); return { ok: true, opened: true }; },
    fetch: async (url, init) => { const body = JSON.parse(init.body); posts.push({ url, body }); return { ok: true, status: 200, json: async () => (body.dryRun ? { ok: true, preview: [] } : { ok: true, undo: 'tok', version: 2 }) }; },
  };
  box._tc = null;
  vm.createContext(box);
  const files = ['68-suggest-actions.js', '68-suggest-logic.js'];
  vm.runInContext(files.map(f => readFileSync(join(APP, f), 'utf8')).join('\n;\n') + '\n;this.__ = { sgRun };', box, { filename: 'suggest-page.js' });
  return { box, posts, opened, toasts, api: box.__ };
}
test('ops.choose: the batch list opens (nothing written); bad lists are refused', async () => {
  const { api, posts, opened } = page();
  const card = runRule(E, 'roll-leftovers', fixture('evening-rollover'))[0];
  const r = await api.sgRun(card.primary.action, card, {});
  assert.equal(r.ok, true); assert.equal(r.opened, true);
  assert.deepEqual(opened, [['choose', 3]]);
  assert.equal(posts.length, 0, 'nothing is written before Apply');
  const bad = JSON.parse(JSON.stringify(card.primary.action));
  bad.args.items[0].alts[0].ops = [{ op: 'task.bin', id: 'x' }];
  assert.equal((await api.sgRun(bad, card, {})).code, 'REFUSED');
  assert.equal((await api.sgRun({ type: 'ops.choose', args: { items: [] } }, card, {})).code, 'REFUSED');
});
test('task.createOpen: opens the task card prefilled; a second press keeps it; Save runs afterOps with the new id', async () => {
  const { api, posts, opened, box } = page();
  const card = runRule(E, 'email-known', fixture('inbox-known-sender'))[0];
  await api.sgRun(card.primary.action, card, {});
  assert.equal(opened.length, 1);
  const pre = opened[0][1];
  assert.equal(pre.title, 'Reply to Sam: The venue for the workshop');
  assert.ok(Array.isArray(pre.ignore) && pre.ignore.includes('venue'), 'the subject stays text, not parsed as dates');
  assert.equal(posts.length, 0, 'nothing is written before Save');
  assert.equal(box._cur.draft.sgKey, card.key);
  const again = await api.sgRun(card.primary.action, card, {});
  assert.equal(again.again, true, 'pressing again while it is open is a no-op');
  assert.equal(opened.filter(x => x[0] === 'create').length, 1);
  pre.onCreated('c-new');
  await new Promise(r => setTimeout(r, 450));
  const applied = posts.find(p => p.url === '/api/actions' && !p.body.dryRun);
  assert.ok(applied, 'the after-save ops ran');
  assert.deepEqual(applied.body.ops.map(o => o.op), ['task.relate', 'email.triage']);
  assert.equal(applied.body.ops[0].id, 'c-new');
  assert.equal(applied.body.ops[1].taskId, 'c-new');
});
test('the snapshot extras: date moves, who a task waits on, related emails, last done per stream', () => {
  const now = Date.parse('2026-10-05T12:00:00');
  const box = {
    state: {
      taskActivity: { a: [{ ts: now - 3 * 864e5, type: 'date', from: '2026-10-01', to: '2026-10-03', reason: 'busy' }, { ts: now - 30 * 864e5, type: 'date', from: '2026-09-01', to: '2026-09-02' }, { ts: now - 864e5, type: 'date', from: '2026-10-05', to: '2026-10-02' }, { ts: now, type: 'status', from: 'todo', to: 'doing' }] },
      completionLog: { a: [now - 2 * 864e5], gone: [now] }, reviews: [{ kind: 'evening', date: MON }], people: [{ id: 'me', self: true, email: 'me@example.com' }],
    },
    APP_CONFIG: { myEmails: ['Other@Example.com'] }, STREAMS: { work: { label: 'Work' }, research: { label: 'Research' } },
    fmtDate: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    getItem: (id) => (id === 'a' ? { id: 'a', stream: 'work' } : null), effStream: (i) => i.stream,
    homeIsWaiting: (i) => i.waiting === true, homeWaitingPerson: () => ({ id: 'sam' }),
    pplPersonEmails: (p) => [p.email], pplIndex: () => ({ email: new Map([['sam@example.com', 'sam']]) }),
  };
  vm.createContext(box);
  vm.runInContext(readFileSync(join(APP, '68-suggest-logic.js'), 'utf8') + '\n;' + readFileSync(join(APP, '68-suggest-context-tasks.js'), 'utf8') + '\n;this.__ = { _sgTaskExtra, _sgCtxExtra };', box);
  const x = box.__._sgTaskExtra({ id: 'a', waiting: true, related: [{ type: 'email', id: 'th1', label: 'Hi' }, { type: 'task', id: 'b' }] }, MON);
  assert.equal(x.moves.length, 1, 'forward moves in the last 21 days only');
  assert.deepEqual(JSON.parse(JSON.stringify(x.moves[0])), { at: '2026-10-02', from: '2026-10-01', to: '2026-10-03', reason: 'busy' });
  assert.equal(x.waitingOn, 'sam');
  assert.deepEqual(JSON.parse(JSON.stringify(x.emails)), [{ id: 'th1', label: 'Hi', date: '' }]);
  const ctx = { now: { date: MON }, inbox: { threads: [{ id: 'th1', from: { email: 'Sam@example.com' } }] } };
  const c = box.__._sgCtxExtra(ctx);
  assert.equal(c.streams.work.lastDone, '2026-10-03');
  assert.equal(c.streams.research.lastDone, null);
  assert.equal(c.eveningSaved, true);
  assert.deepEqual([...c.myEmails].sort(), ['me@example.com', 'other@example.com']);
  assert.equal(ctx.inbox.threads[0].personId, 'sam');
});
