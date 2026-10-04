// Suggestion cards S2-S9: time and calendar (src/app/68-suggest-rules-time.js).
// Each rule: it fires on its fixture and stays quiet on near misses, every card
// keeps the contract (the user's rule, 3 Oct: the PRIMARY opens the normal
// editor prefilled or navigates; the ✓ applies at once with Undo; an RSVP asks
// first), keys are stable, and the specifics of the spec (SUGGESTIONS_CATALOGUE
// 2.4). Plus the page side the cards rely on: cal.create's extra ops (S4: the
// meeting's notes), the prefilled prep card's Save running them, and a second
// press on an open prefilled card doing nothing. Synthetic data only (Sam, Alex).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { engine, fixture, makeCtx, ev, task, hm, runRule, evaluate, assertRuleContract, assertCard } from './fixtures/suggest/harness.mjs';

const E = engine();
const plain = (x) => JSON.parse(JSON.stringify(x));
const TIME_RULES = ['block-task', 'deadline-hours', 'meeting-prep', 'block-clash', 'answer-invite', 'block-started', 'block-missed', 'tomorrow-first'];

test('all eight time cards are registered, in the time area, with a description and what the buttons do', () => {
  for (const id of TIME_RULES) {
    const r = E.sgRule(id);
    assert.ok(r, id);
    assert.equal(r.area, 'time', id);
    assert.ok(r.description && r.safetyHint, id);
    assert.ok(r.needs.includes('calendar'), `${id} needs a fresh calendar (G1)`);
  }
});

/* ───────── S2 block-task ───────── */
test('S2 block-task: in the open task card, today\'s first stretch long enough for the estimate; prefilled event card + ✓', () => {
  const fires = makeCtx({ tasks: [task({ id: 't1', title: 'Write the intro', estimate: 90 })], openTask: 't1' });
  const [c] = assertRuleContract(E, 'block-task', {
    fires,
    quiet: [
      makeCtx({ tasks: [task({ id: 't1' })] }),                                                 // no task card open
      makeCtx({ tasks: [task({ id: 't1', waiting: true })], openTask: 't1' }),                  // waiting on someone
      makeCtx({ tasks: [task({ id: 't1', status: 'done' })], openTask: 't1' }),                 // done
      makeCtx({ tasks: [task({ id: 't1' })], openTask: 't1',                                    // a block for it is still to come
        events: { '2026-10-06': [ev('09:00', '10:00', { origin: { kind: 'block', taskId: 't1' }, linked: ['t1'] })] } }),
    ],
  });
  assert.equal(c.key, 'blocktask:t1:2026-10-05');
  assert.equal(c.title, 'Free 14:45–18:00');
  assert.equal(c.text, 'Block 1 h 30 min for this?');
  assert.deepEqual([c.primary.label, c.primary.action.type, c.quick.action.type], ['Block 14:45–16:15', 'cal.blockOpen', 'cal.block']);
  assert.deepEqual(plain(c.primary.action.args), { taskId: 't1', date: '2026-10-05', start: hm('14:45'), end: hm('16:15'), gapEnd: hm('18:00'), rule: 'block-task',
    title: 'Focus: Write the intro', description: 'Focus block from your dashboard.\nTask: Write the intro' });
  assert.deepEqual(c.secondary.map(s => s.label), ['Tomorrow 09:00', '30 min', '1 h']);
  assert.ok(c.secondary.every(s => s.action.type === 'cal.blockOpen'), 'the chips open the editor too');
  assert.deepEqual(c.claims, [], 'claims nothing: S1 may offer the same task on Home');
});
test('S2: the length is clamp(estimate || 60, 30, 120); a packed day falls to the next work day; Saturday to Monday; no write -> Connect', () => {
  const len = (estimate) => { const [c] = runRule(E, 'block-task', makeCtx({ tasks: [task({ id: 'x', estimate })], openTask: 'x' })); return c.primary.action.args.end - c.primary.action.args.start; };
  assert.deepEqual([len(null), len(10), len(45), len(300)], [60, 30, 45, 120]);
  const [p] = runRule(E, 'block-task', fixture('packed-day', { openTask: 't-report' }));
  assert.equal(p.key, 'blocktask:t-report:2026-10-06');
  assert.deepEqual([p.title, p.primary.label], ['Tomorrow free 09:00–18:00', 'Block tomorrow 09:00–10:00']);
  const [s] = runRule(E, 'block-task', fixture('saturday-gap', { openTask: 't-report' }));
  assert.equal(s.primary.action.args.date, '2026-10-05', 'not on a day off: Monday');
  const [n] = runRule(E, 'block-task', fixture('no-calendar-write', { openTask: 't-report' }));
  assert.deepEqual([n.primary.label, n.primary.action.type, n.quick], ['Connect calendar', 'nav', null]);
  assertCard(E, n);
});
test('S2 shows only in place: no proactive surface, the task card hosts it', () => {
  const ctx = makeCtx({ tasks: [task({ id: 't1' })], openTask: 't1' });
  const r = evaluate(E, ctx, {}, ['block-task']);
  assert.equal(r.cards.length, 1);
  const a = E.sgAssign(r.cards, ctx);
  assert.deepEqual([a.hero, a.home.length, a.story.morning.length], [null, 0, 0]);
});

/* ───────── S3 deadline-hours ───────── */
test('S3 deadline-hours: a p1 task due within a week needs 3 h more; books today 14:45–16:45 and tomorrow 09:45–10:45', () => {
  const [c] = assertRuleContract(E, 'deadline-hours', {
    fires: fixture('weekday-afternoon-gap'),
    quiet: [
      fixture('weekday-afternoon-gap', { now: '2026-10-01T14:40' }),                                       // due in 8 days
      makeCtx({ tasks: [task({ id: 'd', priority: 'p2', due: '2026-10-08', estimate: 240 })] }),          // not high priority
      makeCtx({ tasks: [task({ id: 'd', priority: 'p1', due: '2026-10-08', estimate: 45 })] }),           // under an hour
      makeCtx({ tasks: [task({ id: 'd', priority: 'p1', due: '2026-10-08', estimate: 120 })],             // enough booked already
        events: { '2026-10-06': [ev('09:00', '10:30', { origin: { kind: 'block', taskId: 'd' } })] } }),
      makeCtx({ tasks: [task({ id: 'd', priority: 'p1', due: '2026-10-05', estimate: 240 })] }),          // due today: too late to plan
    ],
  });
  assert.equal(c.key, 'deadline:t-report:2026-10-05:240', 'the week (its Monday) and the estimate: a new estimate re-arms it');
  assert.equal(c.title, 'Report draft is due Fri');
  assert.equal(c.text, 'It needs about 3 h. Book today 14:45–16:45 and tomorrow 09:45–10:45?');
  assert.deepEqual([c.primary.action.type, c.primary.label], ['cal.blockOpen', 'Book today 14:45–16:45']);
  assert.equal(c.quick.action.type, 'cal.blockMany');
  assert.deepEqual(c.quick.action.args.blocks.map(b => [b.date, b.start, b.end]), [['2026-10-05', hm('14:45'), hm('16:45')], ['2026-10-06', hm('09:45'), hm('10:45')]]);
  assert.ok(c.quick.action.args.blocks.every(b => b.taskId === 't-report' && b.rule === 'deadline-hours' && !b.guests));
  assert.match(c.why.join(' '), /1 of 4 steps done/);
  assert.deepEqual(c.secondary.map(s => [s.label, s.action.type]), [['Move the deadline', 'task.open']]);
});
test('S3: less free time than needed -> "Only … free", the deadline move leads; nothing free -> no ✓; one block -> cal.block', () => {
  const tight = makeCtx({ now: '2026-10-05T16:00', tasks: [task({ id: 'd', title: 'Grant report', priority: 'p1', due: '2026-10-06', estimate: 240 })] });
  const [c] = runRule(E, 'deadline-hours', tight);
  assert.match(c.text, /^Only 2 h free before tomorrow, and it needs about 4 h/);
  assert.deepEqual([c.primary.label, c.primary.action.type], ['Move the deadline', 'task.open']);
  assert.equal(c.secondary[0].action.type, 'cal.blockOpen');
  assert.equal(c.quick.action.type, 'cal.block');
  assertCard(E, c);
  const none = runRule(E, 'deadline-hours', fixture('packed-day', { tasks: [{ id: 'd', title: 'Grant report', priority: 'p1', due: '2026-10-06', estimate: 120 }] }));
  assert.equal(none.length, 1);
  assert.ok(!none[0].quick, 'no ✓ without a slot');
  assert.match(none[0].text, /nothing is free before then/);
});

/* ───────── S4 meeting-prep ───────── */
test('S4 meeting-prep: Sam at 14:00, two things owed; books 13:30–14:00 and puts them on the meeting\'s notes', () => {
  const [c] = assertRuleContract(E, 'meeting-prep', {
    fires: fixture('meeting-prep'),
    quiet: [
      fixture('meeting-prep', { now: '2026-10-05T13:40' }),                     // starts in under 30 min
      fixture('meeting-prep', { tasks: [] }),                                   // nothing owed, one guest, nothing linked
      makeCtx({ now: '2026-10-05T10:00', events: { '2026-10-05': [ev('14:00', '15:00', { title: 'Lunch', type: 'meal', attendees: 1, people: ['sam'] })] },
        tasks: [task({ id: 'o', people: ['sam'] })] }),                         // not a meeting (one other person, not a meeting type)
    ],
  });
  assert.deepEqual([c.key, c.title, c.text], ['prep:call1', 'Sam at 14:00', 'You owe Sam 2 things. Block 13:30–14:00 to prep?']);
  assert.deepEqual([c.primary.action.type, c.quick.action.type], ['cal.createOpen', 'cal.create']);
  const a = c.primary.action.args;
  assert.deepEqual([a.date, a.start, a.end, a.kind, a.title, a.guests], ['2026-10-05', hm('13:30'), hm('14:00'), 'prep', 'Prep: Call with Sam', undefined]);
  assert.match(a.description, /To bring: Send the budget to Sam; Share the workshop notes/);
  assert.deepEqual(plain(a.ops), [{ op: 'event.annotate', eventId: 'call1', appendNotes: 'To bring: Send the budget to Sam; Share the workshop notes', linkTasks: ['t-budget', 't-notes'] }]);
  assert.ok(!a.ops[0].linkTasks.includes('t-wait'), 'waiting-on tasks are not owed');
  assert.deepEqual(c.secondary.map(s => s.label), ['Just 15 min', 'Open the meeting', 'Sam']);
  assert.equal(c.secondary[0].action.args.start, hm('13:45'));
});
test('S4: the half hour is taken -> "Add to agenda" (✓ annotates only); already linked -> nothing to add; tomorrow\'s first from the evening', () => {
  const busy = fixture('meeting-prep');
  busy.cal.days['2026-10-05'].push(ev('13:15', '13:45', { title: 'Seminar' }));
  const [c] = runRule(E, 'meeting-prep', busy);
  assert.deepEqual([c.primary.action.type, c.quick.action.type, c.quick.label], ['event.open', 'ops', 'Add to agenda']);
  assert.equal(c.quick.action.args.ops[0].op, 'event.annotate');
  assertCard(E, c);
  busy.cal.days['2026-10-05'][0].linked = ['t-budget', 't-notes'];
  assert.deepEqual(runRule(E, 'meeting-prep', busy), [], 'what is owed is already on it');
  const eve = makeCtx({ now: '2026-10-05T18:30', events: { '2026-10-06': [ev('10:00', '11:00', { id: 'rg', title: 'Reading group', type: 'meeting', attendees: 5 })] } });
  const [t] = runRule(E, 'meeting-prep', eve);
  assert.deepEqual([t.key, t.title, t.primary.action.args.date, t.expiresDate], ['prep:rg', 'Reading group tomorrow at 10:00', '2026-10-06', '2026-10-06']);
  assert.deepEqual(runRule(E, 'meeting-prep', makeCtx({ now: '2026-10-05T12:00', events: eve.cal.days })), [], 'tomorrow only from the evening hour');
});

/* ───────── S5 block-clash ───────── */
test('S5 block-clash: the seminar landed on the focus block; ✓ moves the block (never the meeting) to the first free stretch as long', () => {
  const [c] = assertRuleContract(E, 'block-clash', {
    fires: fixture('block-clash'),
    quiet: [
      fixture('block-started'),
      fixture('block-clash', { now: '2026-10-05T15:10' }),                                        // the block has started
      makeCtx({ now: '2026-10-05T13:00', events: { '2026-10-05': [ev('15:00', '16:30', { id: 'b', origin: { kind: 'block' } }), ev('16:20', '17:00', { attendees: 3 })] } }),  // 10 min
      makeCtx({ now: '2026-10-05T13:00', events: { '2026-10-05': [ev('15:00', '16:30', { id: 'b', origin: { kind: 'block' } }), ev('15:00', '16:00', { free: true })] } }),
      makeCtx({ now: '2026-10-05T13:00', events: { '2026-10-05': [ev('15:00', '16:30', { id: 'b', origin: { kind: 'block' } }), ev('15:00', '16:00', { declined: true })] } }),
      makeCtx({ now: '2026-10-05T13:00', events: { '2026-10-05': [ev('15:00', '16:30', { id: 'b', origin: { kind: 'block' } }), ev('15:00', '16:00', { myResponse: 'needsAction' })] } }),
    ],
  });
  assert.equal(c.key, 'clash:blk1:sem2');
  assert.equal(c.title, 'Seminar at 15:30 overlaps your block for Report draft');
  assert.deepEqual([c.primary.action.type, c.primary.action.args.id], ['event.open', 'blk1'], 'the main button opens the block, to adjust it');
  assert.deepEqual(plain(c.quick.action), { type: 'cal.move', args: { id: 'blk1', date: '2026-10-05', start: hm('13:00'), end: hm('14:30') } });
  assert.deepEqual(c.secondary.map(s => [s.label, s.action.type]), [['Shorten to 15:30', 'cal.resize'], ['Remove the block', 'cal.remove'], ['Open Seminar', 'event.open']]);
  assert.ok([c.quick, ...c.secondary].filter(s => /^cal\./.test(s.action.type)).every(s => s.action.args.id === 'blk1'), 'only the own block is ever changed');
  assert.deepEqual([c.expiresDate, c.expiresMin], ['2026-10-05', hm('15:00')]);
});
test('S5: no room today -> the next work day; tomorrow\'s blocks count; no calendar write -> only the Open buttons', () => {
  const full = makeCtx({ now: '2026-10-05T13:00', events: { '2026-10-05': [ev('13:00', '15:00', { attendees: 2 }), ev('15:00', '17:00', { id: 'b', origin: { kind: 'block' } }), ev('15:00', '18:00', { id: 'm', attendees: 3 })] } });
  const [c] = runRule(E, 'block-clash', full);
  assert.deepEqual([c.quick.action.args.date, c.quick.action.args.start, c.quick.label], ['2026-10-06', hm('09:00'), 'Move to Tomorrow 09:00–11:00']);
  const tmr = makeCtx({ now: '2026-10-05T18:00', events: { '2026-10-06': [ev('10:00', '11:00', { id: 'b2', origin: { kind: 'block' } }), ev('10:30', '11:30', { id: 'm2', attendees: 2 })] } });
  const [t] = runRule(E, 'block-clash', tmr);
  assert.match(t.title, /^Tomorrow, /);
  const [n] = runRule(E, 'block-clash', fixture('block-clash', { caps: { calWrite: false } }));
  assert.equal(n.quick, null);
  assert.deepEqual(n.secondary.map(s => s.action.type), ['event.open']);
});
test('S5 is contextual: it still runs in a meeting with others (G5)', () => {
  const ctx = makeCtx({ now: '2026-10-05T10:15', events: { '2026-10-05': [ev('10:00', '11:00', { attendees: 3 }), ev('15:00', '16:30', { id: 'b', origin: { kind: 'block' } }), ev('15:30', '16:30', { id: 's', attendees: 4 })] } });
  const r = evaluate(E, ctx, {}, ['block-clash', 'free-slot']);
  assert.equal(r.guards.inMeeting, true);
  assert.deepEqual(r.cards.map(c => c.rule), ['block-clash']);
});

/* ───────── S6 answer-invite ───────── */
test('S6 answer-invite: free -> Going is the main button and asks first; a clash -> nothing is styled as the answer, the card opens the invitation', () => {
  const cards = assertRuleContract(E, 'answer-invite', {
    fires: fixture('invite-pending'),
    quiet: [
      fixture('invite-pending', { now: '2026-10-05T07:00' }),                                          // before work, not evening
      makeCtx({ events: { '2026-10-06': [ev('10:00', '11:00', { myResponse: 'needsAction', canRsvp: false })] } }),   // not the user's to answer
      makeCtx({ events: { '2026-10-06': [ev('10:00', '11:00', { myResponse: 'needsAction', organizerSelf: true })] } }),
      makeCtx({ events: { '2026-10-06': [ev('10:00', '11:00', { myResponse: 'accepted', organizerSelf: false })] } }),
      makeCtx({ events: { '2026-10-14': [ev('10:00', '11:00', { myResponse: 'needsAction', organizerSelf: false })] } }),   // over a week away
    ],
  });
  assert.deepEqual(cards.map(c => c.key), ['rsvp:talk1', 'rsvp:read1'], 'soonest first');
  const [clash, free] = cards;
  assert.deepEqual([clash.title, clash.text], ['Alex Kim invited you: Department talk', 'Wed 11:00. It overlaps Supervision.']);
  assert.deepEqual([clash.primary.action.type, clash.secondary.map(s => s.label)], ['event.open', ['Going', 'Maybe', 'Can’t']]);
  assert.deepEqual([free.text, free.primary.label, free.primary.action.type, free.safety], ['Thu 16:00. You’re free then. Going?', 'Going', 'cal.rsvp', 'confirm']);
  assert.deepEqual(plain(free.primary.action), { type: 'cal.rsvp', confirmLabel: 'Send ‘Going’ to Alex Kim', args: { id: 'read1', response: 'accepted' } });
  assert.deepEqual(free.secondary.map(s => [s.label, s.action.type, s.action.args.response || '']), [['Maybe', 'cal.rsvp', 'tentative'], ['Can’t', 'cal.rsvp', 'declined'], ['Open the invitation', 'event.open', '']]);
  for (const c of cards) assert.equal(c.quick || null, null, 'no ✓: an answer always asks first');
});
test('S6: own blocks are a soft clash (named, still free to accept); without calendar write the rule does not run', () => {
  const ctx = makeCtx({ events: { '2026-10-06': [ev('10:00', '11:00', { id: 'i', title: 'Workshop', myResponse: 'needsAction', organizerSelf: false }), ev('10:00', '12:00', { origin: { kind: 'block' } })] } });
  const [c] = runRule(E, 'answer-invite', ctx);
  assert.match(c.text, /overlaps one of your focus blocks/);
  assert.equal(c.primary.action.type, 'cal.rsvp');
  const r = evaluate(E, fixture('invite-pending', { caps: { calWrite: false } }), {}, ['answer-invite']);
  assert.deepEqual([r.cards.length, r.skipped[0].why], [0, 'needs calWrite']);
});

/* ───────── S7 block-started ───────── */
test('S7 block-started: the block is under way and the task still to do; opens the task, ✓ marks it in progress', () => {
  const [c] = assertRuleContract(E, 'block-started', {
    fires: fixture('block-started'),
    quiet: [
      fixture('block-started', { now: '2026-10-05T14:20' }),                                                        // not started
      fixture('block-started', { now: '2026-10-05T16:00' }),                                                        // over
      fixture('block-started', { tasks: [{ id: 't-report', title: 'Report draft', status: 'doing' }] }),            // already in progress
      fixture('block-started', { tasks: [] }),                                                                      // the task is done (not in the snapshot)
    ],
  });
  assert.deepEqual([c.key, c.title, c.text], ['started:blk2', 'Your 14:30 block has started', 'Start Report draft?']);
  assert.deepEqual([c.primary.action.type, c.primary.action.args.id], ['task.open', 't-report']);
  assert.deepEqual(plain(c.quick.action.args.ops), [{ op: 'task.update', id: 't-report', status: 'doing' }]);
  assert.deepEqual(c.secondary.map(s => [s.label, s.action.type]), [['Push back 30 min', 'cal.move'], ['Skip today', 'cal.remove']]);
  assert.deepEqual([c.secondary[0].action.args.start, c.secondary[0].action.args.end], [hm('15:00'), hm('16:30')]);
  const busy = fixture('block-started');
  busy.cal.days['2026-10-05'].push(ev('16:00', '17:00', { attendees: 2 }));
  assert.deepEqual(runRule(E, 'block-started', busy)[0].secondary.map(s => s.label), ['Skip today'], 'push back only into free time');
});

/* ───────── S8 block-missed ───────── */
test('S8 block-missed: the 14:00 block came and went with the task still open; books the next work day, same length', () => {
  const doneAtInside = Date.parse('2026-10-05T14:30:00Z') - 0;
  const ctx = fixture('block-missed');
  const [c] = assertRuleContract(E, 'block-missed', {
    fires: ctx,
    quiet: [
      fixture('block-missed', { now: '2026-10-05T15:00' }),                                       // still under way? no: ended 15:30 -> not yet
      fixture('block-missed', { tasks: [] }),                                                     // done
      fixture('block-missed', { now: '2026-10-05T18:45', eveningHour: 20 }),                      // over 3 h ago, before the evening
      fixture('block-missed', { tasks: [{ id: 't-report', title: 'Report draft', subtasks: { done: 1, total: 3, open: [], doneAt: [ctx.now.ts - 90 * 60000] } }] }),   // ticked a step inside the block
      fixture('block-missed', { events: Object.assign({}, { '2026-10-05': [{ id: 'blk3', title: 'Focus', start: '14:00', end: '15:30', origin: { kind: 'block', taskId: 't-report' } }],
        '2026-10-07': [{ id: 'blk4', title: 'Focus', start: '09:00', end: '10:00', origin: { kind: 'block', taskId: 't-report' } }] }) }),   // already re-booked
    ],
  });
  assert.ok(doneAtInside);
  assert.deepEqual([c.key, c.title, c.text], ['rebook:blk3', 'The 14:00 block for Report draft came and went', 'Book tomorrow 09:00–10:30?']);
  assert.deepEqual([c.primary.label, c.primary.action.type, c.quick.action.type], ['Book tomorrow 09:00', 'cal.blockOpen', 'cal.block']);
  assert.deepEqual([c.primary.action.args.date, c.primary.action.args.end - c.primary.action.args.start, c.primary.action.args.rule], ['2026-10-06', 90, 'block-missed']);
  assert.deepEqual(c.secondary.map(s => [s.label, s.action.type]), [['It’s done', 'ops'], ['Open the task', 'task.open']]);
  assert.equal(c.secondary[0].action.args.ops[0].op, 'task.complete');
  const eve = runRule(E, 'block-missed', fixture('block-missed', { now: '2026-10-05T19:30' }));
  assert.equal(eve.length, 1, 'in the evening every block of the day counts');
});

/* ───────── S9 tomorrow-first ───────── */
test('S9 tomorrow-first: in the evening, tomorrow is clear until 11:30; book 09:00–11:00 for the top task', () => {
  const [c] = assertRuleContract(E, 'tomorrow-first', {
    fires: fixture('evening-rollover'),
    quiet: [
      fixture('evening-rollover', { now: '2026-10-05T16:00' }),                                                          // before the evening hour
      fixture('evening-rollover', { events: { '2026-10-06': [{ id: 'b', title: 'Focus', start: '09:00', end: '10:00', origin: { kind: 'block' } }] } }),   // already booked
      fixture('evening-rollover', { events: { '2026-10-06': [{ id: 'm', title: 'Away day', start: '09:00', end: '12:30', attendees: 9 }] } }),            // no 90 min before noon
      fixture('evening-rollover', { tasks: [], focus: [] }),                                                              // nothing to start with
    ],
  });
  assert.deepEqual([c.key, c.title, c.text], ['tomorrow:2026-10-06', 'Tomorrow is clear until 11:30', 'Start with Report draft at 09:00?']);
  assert.deepEqual([c.primary.label, c.primary.action.type, c.quick.action.type], ['Book 09:00–11:00', 'cal.blockOpen', 'cal.block']);
  assert.deepEqual(c.secondary.map(s => [s.label, s.action.type]), [['Send the budget to Sam', 'cal.blockOpen']]);
});
test('S9: a task planned or due tomorrow wins (by priority); Friday evening books Monday; "first in Focus" when it is not', () => {
  const ctx = fixture('evening-rollover', { tasks: [
    { id: 't-c', title: 'Report draft', priority: 'p1' },
    { id: 'pl3', title: 'Tidy the notes', priority: 'p3', planned: '2026-10-06' },
    { id: 'pl2', title: 'Budget review', priority: 'p2', due: '2026-10-06' },
  ], focus: ['t-c'] });
  const [c] = runRule(E, 'tomorrow-first', ctx);
  assert.equal(c.primary.action.args.taskId, 'pl2');
  assert.match(c.why.join(' '), /Budget review is due tomorrow/);
  assert.deepEqual(c.secondary.map(s => s.label), ['Tidy the notes', 'Just put it first in Focus']);
  assert.deepEqual(plain(c.secondary[1].action.args.ops), [{ op: 'home.set_focus', order: ['pl2', 't-c'] }]);
  const fri = runRule(E, 'tomorrow-first', makeCtx({ now: '2026-10-09T18:00', tasks: [task({ id: 'f', title: 'Write up' })] }));
  assert.deepEqual([fri[0].key, fri[0].title], ['tomorrow:2026-10-12', 'Mon is clear until 18:00']);
});

/* ───────── all of them ───────── */
test('every time card on every fixture: the contract holds, no rule throws, the copy has no "!" or shouting', () => {
  const names = ['weekday-afternoon-gap', 'saturday-gap', 'packed-day', 'stale-calendar', 'no-calendar-write', 'block-clash', 'block-started', 'evening-rollover',
    'waiting-overdue', 'inbox-known-sender', 'meeting-prep', 'invite-pending', 'block-missed'];
  let n = 0;
  for (const name of names) {
    for (const over of [{}, { openTask: 't-report' }, { now: undefined }]) {
      const ctx = fixture(name, Object.fromEntries(Object.entries(over).filter(([, v]) => v !== undefined)));
      const r = evaluate(E, ctx, {}, TIME_RULES);
      assert.deepEqual(r.errors, [], name);
      for (const id of TIME_RULES) for (const c of runRule(E, id, fixture(name, over.openTask ? { openTask: over.openTask } : {}))) {
        assertCard(E, c, `${id} on ${name}`);
        assert.ok(!/!|OVERDUE/.test(c.title + ' ' + c.text), `${c.key}: calm copy`);
        n++;
      }
    }
  }
  assert.ok(n >= 20, `${n} cards checked`);
});
test('a stale calendar holds every time card back (G1) and lists them for the guard card', () => {
  const r = evaluate(E, fixture('stale-calendar', { openTask: 't-report' }), {}, TIME_RULES);
  assert.equal(r.cards.length, 0);
  for (const id of TIME_RULES) assert.ok(r.suppressed.includes(id), id);
});

/* ───────── the page side these cards use ───────── */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const PAGE_FILES = readdirSync(APP).filter(n => /^68-suggest-(actions|context|logic|rules-.*)\.js$/.test(n)).sort();
function page() {
  const posts = [], opened = [], calls = [];
  let n = 0;
  const subs = new Set();
  const W = {
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
    defaultCalendarId: () => 'me@example.com', info: () => ({ fake: true }), guests: () => [], canRsvp: () => ({ ok: true }),
    create(input, opt) { calls.push(['create', input, opt]); const tmp = 'tmp-' + (++n); for (const f of subs) f({ id: tmp, op: 'create', state: 'pending' }); return Promise.resolve({ ok: true, event: { id: 'g' + n, summary: input.title, start: { dateTime: input.start }, end: { dateTime: input.end } } }); },
    remove(id, opt) { calls.push(['remove', id, opt]); return Promise.resolve({ ok: true }); },
  };
  const box = {
    console, setTimeout, clearTimeout, Promise, JSON, Math, Date, Object, Array, String, Number, Set, Map, RegExp, Error,
    state: { custom: [], eventMeta: {}, _lastSave: 1 }, APP_CONFIG: { timezone: 'Europe/London' }, window: { CalWrite: W },
    todayStr: () => '2026-10-05', fmtDate: (d) => d.toISOString().slice(0, 10), getItem: () => null, effTitle: (t) => t.title,
    netErrorMessage: (e, f) => (e && e.message) || f, toast() { return () => {}; }, confirmDialog: async () => true,
    openEvent: (id, opt) => { opened.push(['event', id, opt]); return 'card'; }, render() {}, saveData() {}, saveUI() {},
    homeCalStatus: () => ({ ok: true, stale: false }),
    fetch: async (url, init) => { const body = JSON.parse(init.body); posts.push({ url, body }); return { ok: true, status: 200, json: async () => (body.dryRun ? { ok: true, preview: [] } : { ok: true, undo: 'tok-' + posts.length, version: 2 }) }; },
  };
  vm.createContext(box);
  vm.runInContext(PAGE_FILES.map(f => readFileSync(join(APP, f), 'utf8')).join('\n;\n') + '\n;this.__ = { sgRun, sgAfterEventCreate };', box, { filename: 'suggest-page.js' });
  return { box, posts, opened, calls, api: box.__ };
}
const PREP = (over = {}) => Object.assign({ date: '2026-10-06', start: hm('13:30'), end: hm('14:00'), title: 'Prep: Call with Sam', description: 'Prep for Call with Sam at 14:00.', kind: 'prep', rule: 'meeting-prep',
  ops: [{ op: 'event.annotate', eventId: 'call1', appendNotes: 'To bring: Send the budget', linkTasks: ['t-budget'] }] }, over);

test('S4 ✓ (cal.create): the prep event (no guests) is marked as the dashboard\'s, and the meeting gets what is owed, in ONE batch', async () => {
  const { api, posts, calls } = page();
  const r = await api.sgRun({ type: 'cal.create', args: PREP() }, { key: 'prep:call1', rule: 'meeting-prep' }, {});
  assert.equal(r.ok, true);
  assert.equal(calls[0][0], 'create');
  assert.equal(calls[0][1].guests, undefined);
  const applied = posts.filter(p => p.url === '/api/actions' && !p.body.dryRun);
  assert.equal(applied.length, 1);
  assert.deepEqual(plain(applied[0].body.ops), [
    { op: 'event.annotate', eventId: 'g1', origin: { kind: 'prep', rule: 'meeting-prep' } },
    { op: 'event.annotate', eventId: 'call1', appendNotes: 'To bring: Send the budget', linkTasks: ['t-budget'] },
  ]);
  // Extra ops outside the allowlist never ride along.
  const p2 = page();
  await p2.api.sgRun({ type: 'cal.create', args: PREP({ ops: [{ op: 'task.bin', id: 'x' }] }) }, { key: 'prep:x', rule: 'meeting-prep' }, {});
  assert.ok(!p2.posts.some(p => (p.body.ops || []).some(o => o.op === 'task.bin')));
});
test('S4 primary (cal.createOpen): the event card opens prefilled and nothing is written; its Save runs the same extra ops; a second press keeps the open card', async () => {
  const { api, posts, opened, box } = page();
  const card = { key: 'prep:call1', rule: 'meeting-prep' };
  await api.sgRun({ type: 'cal.createOpen', args: PREP() }, card, {});
  assert.equal(opened.length, 1);
  const pre = opened[0][2].create;
  assert.deepEqual([pre.title, pre.start, pre.end, pre.origin.kind, pre.suggestKey], ['Prep: Call with Sam', '2026-10-06T13:30', '2026-10-06T14:00', 'prep', 'prep:call1']);
  assert.equal(posts.length, 0, 'nothing until Save');
  // The card is open with this suggestion's draft: pressing again is a no-op.
  box._tc = { closing: false };
  box._tcCur = () => ({ kind: 'evcreate', draft: { link: { key: 'prep:call1' } } });
  box._tcFocusStart = () => {};
  vm.runInContext('_tc = this._tc; _tcCur = this._tcCur; _tcFocusStart = this._tcFocusStart;', box);
  const again = await api.sgRun({ type: 'cal.createOpen', args: PREP() }, card, {});
  assert.equal(again.again, true);
  assert.equal(opened.length, 1);
  // Save -> the link batch carries the meeting's notes.
  await api.sgAfterEventCreate({ ok: true, event: { id: 'g7', summary: 'Prep: Call with Sam', start: { dateTime: '2026-10-06T13:30:00' }, end: { dateTime: '2026-10-06T14:00:00' } } },
    { title: 'Prep: Call with Sam', link: { taskId: '', origin: { kind: 'prep', rule: 'meeting-prep' }, key: 'prep:call1' } });
  const applied = posts.find(p => p.url === '/api/actions' && !p.body.dryRun);
  assert.deepEqual(plain(applied.body.ops).map(o => [o.op, o.eventId]), [['event.annotate', 'g7'], ['event.annotate', 'call1']]);
});
