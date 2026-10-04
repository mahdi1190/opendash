// The suggestions engine's pure rules (src/app/68-suggest-logic.js + every
// 68-suggest-rules-*.js, loaded through lib/suggest-logic.mjs exactly as the
// page runs them): the registry and card contract, free stretches, the
// guards (offline, stale calendar, in a meeting, working hours), memory (Not
// now, Not for this one, Stop these, accepted, re-arm by key), ranking and
// dedupe, placement (hero, Home, in place), the local counts and "learn",
// performance, and S1 (block a free stretch: the user's own example, 3 Oct)
// with the prefilled-editor rule. Synthetic data only (Sam, Alex).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { sourceFiles, loadSuggestLogic } from '../lib/suggest-logic.mjs';
import { engine, fixture, makeCtx, ev, task, hm, runRule, evaluate, assertCard, assertRuleContract } from './fixtures/suggest/harness.mjs';

const E = engine();

test('the shared files stay pure: no DOM, no page globals, no network', () => {
  for (const f of sourceFiles()) {
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const bad of [/\bdocument\./, /\bwindow\./, /\bstate\./, /\bfetch\(/, /\brender\(/, /\bsaveData\(/, /\bsaveUI\(/, /\blocalStorage\b/, /\bCalStore\b/, /\bAPP_CONFIG\b/, /\bDate\.now\(/, /new Date\(\)/])
      assert.ok(!bad.test(src), `${f.split(/[\\/]/).pop()} uses ${bad}`);
  }
});

test('the page loads the same files as Node (one script, any order of rule files): same answers', () => {
  const box = {};
  vm.createContext(box);
  vm.runInContext(sourceFiles().map(f => readFileSync(f, 'utf8')).join('\n;\n') + '\n;this.__api = { sgEvaluate, sgRules };', box);
  const ctx = fixture('weekday-afternoon-gap');
  const page = box.__api.sgEvaluate(JSON.parse(JSON.stringify(ctx)), {}, {});
  const node = E.sgEvaluate(JSON.parse(JSON.stringify(ctx)), {}, {});
  assert.deepEqual(JSON.parse(JSON.stringify(page.cards)), JSON.parse(JSON.stringify(node.cards)));
  assert.deepEqual(JSON.parse(JSON.stringify(box.__api.sgRules().map(r => r.id))), E.sgRules().map(r => r.id));
});

test('registry: malformed rules are refused at once; same id replaces', () => {
  const X = loadSuggestLogic();
  assert.throws(() => X.sgRegisterRule({ id: 'Bad Id', area: 'time', title: 't', run() {} }), /id/);
  assert.throws(() => X.sgRegisterRule({ id: 'ok-id', area: 'nowhere', title: 't', run() {} }), /area/);
  assert.throws(() => X.sgRegisterRule({ id: 'ok-id', area: 'time', title: 't' }), /run/);
  assert.throws(() => X.sgRegisterRule({ id: 'ok-id', area: 'time', title: 't', run() {}, needs: ['telepathy'] }), /needs/);
  assert.throws(() => X.sgRegisterRule({ id: 'ok-id', area: 'time', title: 't', run() {}, surfaces: ['billboard'] }), /surfaces/);
  const n = X.sgRules().length;
  X.sgRegisterRule({ id: 'ok-id', area: 'time', title: 'One', run: () => [] });
  X.sgRegisterRule({ id: 'ok-id', area: 'time', title: 'Two', run: () => [] });
  assert.equal(X.sgRules().length, n + 1);
  assert.equal(X.sgRule('ok-id').title, 'Two');
});

test('card contract: key, words, a number in why, preview, known action types, allowlisted ops, ✓ never opens an editor', () => {
  const good = { key: 'x:1', title: 'T', text: 'Do it?', why: ['3 things'], preview: 'p', primary: { label: 'Go', action: { type: 'task.open', args: { id: 'a' } } } };
  assert.deepEqual(E.sgCheckCard(good), []);
  assert.match(E.sgCheckCard({ ...good, key: 'nokind' }).join(), /key/);
  assert.match(E.sgCheckCard({ ...good, why: ['no numbers here'] }).join(), /number/);
  assert.match(E.sgCheckCard({ ...good, preview: '' }).join(), /preview/);
  assert.match(E.sgCheckCard({ ...good, primary: { label: 'x', action: { type: 'email.send' } } }).join(), /action type/);
  assert.match(E.sgCheckCard({ ...good, quick: { label: '✓', action: { type: 'ops', args: { ops: [{ op: 'task.bin', id: 'a' }] } } } }).join(), /not allowed/);
  assert.match(E.sgCheckCard({ ...good, quick: { label: '✓', action: { type: 'cal.blockOpen', args: {} } } }).join(), /at once/);
  for (const bad of ['task.bin', 'person.delete', 'person.merge', 'tag.delete', 'countdown.delete']) assert.ok(!E.SG_OPS_ALLOW.includes(bad), bad);
  for (const t of Object.keys(E.SG_ACTION_TYPES)) assert.ok(!/send|pay|transfer|delete/.test(t), 'no action type sends, pays or deletes: ' + t);
});

test('free stretches: work hours, from now (next quarter hour), busy merged, 45 minutes or more, best = longest of 90+', () => {
  const ctx = makeCtx({ now: '2026-10-05T09:05', events: { '2026-10-05': [ev('10:00', '10:44'), ev('11:29', '12:00'), ev('12:00', '13:00'), ev('15:00', '15:30', { free: true }), ev('16:00', '16:30', { declined: true })] } });
  const g = E.sgFreeStretches(ctx, '2026-10-05');
  // From 09:15 (the next quarter hour): 09:15-10:00 and 10:44-11:29 are exactly 45 min (offered); free / declined events are not busy.
  assert.deepEqual(g.map(x => [x.start, x.end]), [[hm('09:15'), hm('10:00')], [hm('10:44'), hm('11:29')], [hm('13:00'), hm('18:00')]]);
  assert.equal(g[0].lead, true);
  const g2 = E.sgFreeStretches(makeCtx({ now: '2026-10-05T09:05', events: { '2026-10-05': [ev('10:00', '10:44'), ev('11:28', '12:00')] } }), '2026-10-05');
  assert.ok(!g2.some(x => x.start === hm('10:44')), 'a 44-minute gap is not offered');
  const g0 = E.sgFreeStretches(ctx, '2026-10-05');
  assert.equal(g0.find(x => x.best).start, hm('13:00'));
  assert.deepEqual(E.sgFreeStretches(ctx, '2026-10-04'), [], 'no gaps in the past');
  const lead = E.sgFreeStretches(makeCtx({ now: '2026-10-05T14:40' }), '2026-10-05');
  assert.deepEqual([lead[0].start, lead[0].lead], [hm('14:45'), true]);
  const timed = E.sgFreeStretches(makeCtx({ now: '2026-10-05T14:40', timed: { '2026-10-05': [{ id: 'x', start: hm('15:00'), end: hm('17:30') }] } }), '2026-10-05');
  assert.deepEqual(timed.map(x => x.start), [], 'timed tasks are busy too (14:45-15:00 and 17:30-18:00 are under 45)');
});

test('working days: config shapes, next work day, Saturday is not one by default', () => {
  assert.deepEqual(E.sgWork({ days: ['Mon', 'Wed'], start: '08:30', end: '16:00' }), { days: [1, 3], start: 510, end: 960 });
  assert.deepEqual(E.sgWork({ start: 540, end: 1020, startMin: 1, days: [1, 2, 3, 4, 5] }).end, 1020);
  assert.deepEqual(E.sgWork({ start: '18:00', end: '09:00' }), { days: [1, 2, 3, 4, 5], start: 540, end: 1080 }, 'nonsense falls back');
  assert.equal(E.sgIsWorkDay({}, '2026-10-03'), false);
  assert.equal(E.sgNextWorkDay({}, '2026-10-02'), '2026-10-05', 'Friday -> Monday');
  assert.equal(E.sgNextWorkDay({ days: [1, 2, 3, 4, 5, 6] }, '2026-10-02'), '2026-10-03');
});

/* ───────── S1: block a free stretch ───────── */
test('S1 fires on a weekday gap with the contract, and stays quiet on a packed day and on a Saturday', () => {
  const cards = assertRuleContract(E, 'free-slot', { fires: fixture('weekday-afternoon-gap'), quiet: [fixture('packed-day'), fixture('saturday-gap')] });
  const c = cards[0];
  assert.equal(c.key, 'free:2026-10-05:1080');
  assert.equal(c.title, 'Free 14:45–18:00');
  assert.equal(c.text, 'Block 2 h for Report draft?');
  assert.equal(c.primary.label, 'Block 14:45–16:45', 'the button states the result, never "Block some"');
  assert.equal(c.primary.aria, 'Block 14:45 to 16:45 for Report draft in Google Calendar');
  assert.ok(c.why.some(w => /3 h 15 min free until 18:00, the end of your working hours/.test(w)));
  assert.ok(c.why.some(w => /first in Focus \(high priority, due Fri\)/.test(w)));
  assert.match(c.preview, /primary Google calendar, 14:45–16:45, with no guests/);
});

test('S1 primary = the event card in CREATE mode, prefilled; ✓ = the block at once; never a task', () => {
  const [c] = runRule(E, 'free-slot', fixture('weekday-afternoon-gap'));
  assert.equal(c.primary.action.type, 'cal.blockOpen');
  assert.equal(E.SG_ACTION_TYPES['cal.blockOpen'], 'opens');
  assert.deepEqual(c.primary.action.args, {
    taskId: 't-report', date: '2026-10-05', start: hm('14:45'), end: hm('16:45'), gapEnd: hm('18:00'), rule: 'free-slot', title: 'Focus: Report draft',
    description: 'Focus block from your dashboard.\nTask: Report draft: section 2\nNext: Outline the argument; Redo figure 3; References',
  });
  assert.equal(c.quick.action.type, 'cal.block');
  assert.deepEqual(c.quick.action.args, c.primary.action.args, 'the ✓ books exactly what the card shows');
  assert.equal(E.SG_ACTION_TYPES['cal.block'], 'instant');
  // No path of S1 creates a task (op task.create); "Make it a task instead" only OPENS the task card from the menu.
  const all = [c.primary, c.quick, ...c.secondary, ...c.menu];
  assert.ok(!all.some(a => a.action.type === 'ops'), 'no ops at all');
  assert.ok(!JSON.stringify(all).includes('task.create"'), 'never task.create');
  assert.deepEqual(c.menu.map(m => [m.label, m.action.type]), [['Make it a task instead', 'task.createOpen']]);
  assert.deepEqual(c.claims, ['slot:2026-10-05:885-1080', 'task:t-report']);
  assert.equal(c.entity, 'task:t-report');
});

test('S1 length = min(gap, 2 h); the start moves to now (5-minute steps); under 15 minutes left = no card', () => {
  const ctx = fixture('weekday-afternoon-gap');
  assert.equal(E.sgFreeSlotCard(ctx, { start: hm('14:45'), end: hm('18:00') }).primary.action.args.end, hm('16:45'), '3 h 15 -> 2 h');
  const c50 = E.sgFreeSlotCard(ctx, { start: hm('15:00'), end: hm('15:50') });
  assert.equal(c50.primary.action.args.end - c50.primary.action.args.start, 50, 'a 50-minute gap gives 50');
  assert.equal(c50.text, 'Block 50 min for Report draft?');
  const late = E.sgFreeSlotCard(makeCtx({ now: '2026-10-05T14:42', tasks: [] }), { start: hm('14:30'), end: hm('16:00') });
  assert.equal(late.primary.action.args.start, hm('14:45'), 'a card left open does not book the past');
  assert.equal(E.sgFreeSlotCard(makeCtx({ now: '2026-10-05T15:47' }), { start: hm('15:00'), end: hm('16:00') }), null, 'only 10 minutes left');
  assert.ok(E.sgFreeSlotCard(makeCtx({ now: '2026-10-05T15:45' }), { start: hm('15:00'), end: hm('16:00') }), '15 minutes left still counts');
});

test('S1 picks the first eligible Focus task: skips done, waiting, snoozed, not started and already blocked ones; none = "Focus time"', () => {
  const tasks = [
    task({ id: 'a', title: 'Waiting one', waiting: true }), task({ id: 'b', title: 'Snoozed one', snoozed: true }), task({ id: 'c', title: 'Later one', notStarted: true }),
    task({ id: 'd', title: 'Blocked already' }), task({ id: 'e', title: 'Write the abstract' }),
  ];
  const events = { '2026-10-05': [ev('17:00', '17:45', { origin: { kind: 'block', rule: 'free-slot', taskId: 'd' }, linked: ['d'] })] };
  const ctx = makeCtx({ now: '2026-10-05T09:00', tasks, events });
  const c = E.sgFreeSlotCard(ctx, { start: hm('09:00'), end: hm('12:00') });
  assert.equal(c.primary.action.args.taskId, 'e');
  assert.equal(c.primary.action.args.title, 'Focus: Write the abstract');
  // A block for d that already happened does not count.
  const past = makeCtx({ now: '2026-10-05T18:00', tasks: [task({ id: 'd', title: 'Blocked already' })], events: { '2026-10-05': [ev('09:00', '10:00', { origin: { kind: 'block', taskId: 'd' } })] } });
  assert.equal(E.sgTopTask(past).id, 'd');
  const none = E.sgFreeSlotCard(makeCtx({ now: '2026-10-05T09:00', tasks: [task({ id: 'w', waiting: true })] }), { start: hm('09:00'), end: hm('12:00') });
  assert.equal(none.primary.action.args.title, 'Focus time');
  assert.equal(none.primary.action.args.taskId, null);
  assert.equal(none.primary.label, 'Block 09:00–11:00 for focus');
  assert.equal(none.text, 'Block 2 h for focus?');
  assert.equal(none.primary.action.args.description, '', 'no description without a task');
  assert.equal(none.entity, '');
});

test('S1 without a calendar to write to says Connect calendar; a stale calendar says Update calendar; never a task', () => {
  const [c] = runRule(E, 'free-slot', fixture('no-calendar-write'));
  assert.deepEqual([c.primary.label, c.primary.action.type, c.primary.action.args.to], ['Connect calendar', 'nav', 'connections']);
  assert.equal(c.quick, null);
  const stale = E.sgFreeSlotCard(makeCtx({ now: '2026-10-05T14:40', cal: { stale: true } }), { start: hm('14:45'), end: hm('18:00') });
  assert.deepEqual([stale.primary.label, stale.primary.action.type], ['Update calendar', 'store.refresh']);
});

/* ───────── guards ───────── */
test('G1 stale calendar: calendar rules are held back (and listed for the guard card); G3 offline: nothing', () => {
  const r = evaluate(E, fixture('stale-calendar'));
  assert.deepEqual(r.cards.filter(c => c.rule === 'free-slot'), []);
  assert.ok(r.suppressed.includes('free-slot'));
  assert.equal(r.guards.calStale, true);
  const down = evaluate(E, makeCtx({ now: '2026-10-05T14:40', down: true, tasks: [task({ id: 'x' })] }));
  assert.deepEqual([down.cards.length, down.guards.down], [0, true]);
});

test('G5 in a meeting with others: only contextual rules run; G6 working hours on proactive surfaces', () => {
  const ctx = fixture('weekday-afternoon-gap', { now: '2026-10-05T10:30' });
  const r = evaluate(E, ctx);
  assert.equal(r.guards.inMeeting, true);
  assert.ok(r.skipped.some(s => s.rule === 'free-slot' && s.why === 'meeting'));
  // An own block (origin) or a free event is not "a meeting".
  assert.equal(E.sgInMeeting(makeCtx({ now: '2026-10-05T10:30', events: { '2026-10-05': [ev('10:00', '11:00', { attendees: 2, origin: { kind: 'block' } })] } })), false);
  // Evening: S1 is not offered on Home (hours 'work'), even with a gap the schedule could still show.
  const eve = evaluate(E, makeCtx({ now: '2026-10-05T18:30', work: { days: [1, 2, 3, 4, 5], start: '09:00', end: '21:00' }, tasks: [task({ id: 'r', title: 'Report' })] }));
  const a = E.sgAssign(eve.cards, makeCtx({ now: '2026-10-05T18:30' }));
  assert.equal(a.hero, null, 'outside 09:00-18:00 the hero stays quiet');
  assert.deepEqual(a.home.filter(c => c.rule === 'free-slot'), []);   // evening cards (S9) may show; S1 may not
});

test('a rule that throws is caught and the others carry on; a bad card is dropped and reported', () => {
  const X = engine(`
    sgRegisterRule({ id: 'boom', area: 'tasks', title: 'Boom', run() { throw new Error('nope'); } });
    sgRegisterRule({ id: 'bad-card', area: 'tasks', title: 'Bad', run() { return [{ key: 'bad:1', title: 'x' }]; } });
    sgRegisterRule({ id: 'fine', area: 'tasks', title: 'Fine', value: 3, run() { return [{ key: 'fine:1', title: 'Fine', text: 'Open it?', why: ['1 thing'], preview: 'Opens it.', primary: { label: 'Open', action: { type: 'task.open', args: { id: 'a' } } } }]; } });
  `);
  const r = X.sgEvaluate(makeCtx({}), {}, {});
  assert.deepEqual(r.errors.map(e => e.rule).sort(), ['bad-card', 'boom']);
  assert.ok(r.cards.some(c => c.key === 'fine:1'));
});

/* ───────── memory ───────── */
test('memory: Not now until tomorrow, Not for this one for 30 days, Stop these, accepted, re-arm through the key; prune', () => {
  const ctx = fixture('weekday-afternoon-gap');
  const today = ctx.now.date;
  const key = 'free:2026-10-05:1080';
  const show = (mem, c = ctx) => evaluate(E, c, mem, ['free-slot']).cards.map(x => x.key);
  assert.deepEqual(show({}), [key]);
  let m = E.sgMemDismiss({}, key, today);
  assert.deepEqual(show(m), []);
  assert.deepEqual(show(m, fixture('weekday-afternoon-gap', { now: '2026-10-06T14:40' })).length, 1, 'back the next day (another key, and the old date passed)');
  m = E.sgMemNotFor({}, 'task:t-report', today, 30);
  assert.equal(m.notFor['task:t-report'], '2026-11-04');
  assert.deepEqual(show(m), []);
  assert.deepEqual(show(m, fixture('weekday-afternoon-gap', { now: '2026-11-05T14:40' })).length, 1, 'after 30 days it is back');
  m = E.sgMemRule({}, 'free-slot', 'off', today);
  assert.deepEqual(show(m), []);
  assert.ok(evaluate(E, ctx, m).skipped.some(s => s.rule === 'free-slot' && s.why === 'off'));
  assert.deepEqual(show(E.sgMemRule(m, 'free-slot', 'on', today)), [key], 'Settings turns it back on');
  assert.deepEqual(show(E.sgMemRule({}, 'free-slot', 'today', today)), [], '"not today"');
  assert.deepEqual(show(E.sgMemAccept({}, key, 5)), [], 'accepted: never again for that key');
  assert.deepEqual(show(E.sgMemSetOff({}, true)), [], 'the master switch');
  // Re-arm: a key carrying its condition (nudge:<id>:<followUp>) is a new key when the condition moves.
  const X = engine(`sgRegisterRule({ id: 'nudge-x', area: 'people', title: 'N', run(ctx) { return [{ key: 'nudge:t1:' + ctx.now.date, title: 'N', text: 'Nudge?', why: ['6 days'], preview: 'p', primary: { label: 'Draft', action: { type: 'gmail.draftOpen', args: { to: ['sam@example.com'] } } } }]; } });`);
  const acc = X.sgMemAccept({}, 'nudge:t1:2026-10-05', 1);
  assert.equal(X.sgEvaluate(makeCtx({ now: '2026-10-05T10:00' }), acc, { only: ['nudge-x'] }).cards.length, 0);
  assert.equal(X.sgEvaluate(makeCtx({ now: '2026-10-08T10:00' }), acc, { only: ['nudge-x'] }).cards.length, 1, 're-armed after the next follow-up date');
  // Prune: old dismissals and run-out mutes go; reset keeps rules switched off.
  const old = { dismissed: { a: '2026-07-01', b: today }, notFor: { 'task:x': '2026-10-01', 'task:y': '2026-12-01' }, accepted: { k: 1 }, rules: { 'free-slot': { off: true } } };
  const p = E.sgMemPrune(old, today, Date.parse('2026-10-05'));
  assert.deepEqual([Object.keys(p.dismissed), Object.keys(p.notFor), Object.keys(p.accepted)], [['b'], ['task:y'], []]);
  assert.deepEqual(E.sgMemReset(old).rules, { 'free-slot': { off: true } });
  assert.equal(E.sgMemCount(old, today), 2);
});

/* ───────── rank, dedupe, placement ───────── */
const R = engine(`
  const mk = (key, o) => Object.assign({ key, title: key, text: 'Do it?', why: ['1 fact'], preview: 'p', primary: { label: 'Go', action: { type: 'task.open', args: { id: 'a' } } } }, o || {});
  sgRegisterRule({ id: 'hi', area: 'tasks', title: 'Hi', value: 5, surfaces: ['hero', 'home'], run: () => [mk('hi:1', { claims: ['task:a'], urgency: 1.2 })] });
  sgRegisterRule({ id: 'lo', area: 'tasks', title: 'Lo', value: 2, surfaces: ['hero', 'home'], run: () => [mk('lo:1', { claims: ['task:a'] }), mk('lo:2', { claims: ['task:b'] }), mk('lo:3')] });
  sgRegisterRule({ id: 'mid', area: 'time', title: 'Mid', value: 4, surfaces: ['home'], inPlace: ['gap'], run: () => [mk('mid:1')] });
  sgRegisterRule({ id: 'tie-a', area: 'tasks', title: 'A', value: 3, surfaces: ['home'], run: () => [mk('tie:b')] });
  sgRegisterRule({ id: 'tie-b', area: 'tasks', title: 'B', value: 3, surfaces: ['home'], run: () => [mk('tie:a')] });
  sgRegisterRule({ id: 'weak', area: 'tasks', title: 'W', value: 1, surfaces: ['home'], run: () => [mk('weak:1', { urgency: 0.5 })] });
`);
const RONLY = ['hi', 'lo', 'mid', 'tie-a', 'tie-b', 'weak'];
test('rank: value × 20 × urgency; the same claim keeps the higher score; ties by registry order then key', () => {
  const r = R.sgEvaluate(makeCtx({ now: '2026-10-05T10:00' }), {}, { only: RONLY });
  const byKey = Object.fromEntries(r.cards.map(c => [c.key, c.score]));
  assert.equal(byKey['hi:1'], 120);
  assert.equal(byKey['lo:1'], undefined, 'claims task:a, which hi:1 (higher) has');
  assert.deepEqual(r.cards.map(c => c.key), ['hi:1', 'mid:1', 'tie:b', 'tie:a', 'lo:2', 'lo:3', 'weak:1']);
  const again = R.sgEvaluate(makeCtx({ now: '2026-10-05T10:00' }), {}, { only: RONLY });
  assert.deepEqual(again.cards.map(c => c.key), r.cards.map(c => c.key), 'deterministic');
});

test('placement: the hero takes the top card scoring 60+, Home the next ones (one per rule, homeMax), a card hosted in place is not repeated, under 30 never shows', () => {
  const ctx = makeCtx({ now: '2026-10-05T10:00' });
  const r = R.sgEvaluate(ctx, {}, { only: RONLY });
  let a = R.sgAssign(r.cards, ctx, { homeMax: 3 });
  assert.equal(a.hero.key, 'hi:1');
  assert.deepEqual(a.home.map(c => c.key), ['mid:1', 'tie:b', 'tie:a'], 'lo:2 and lo:3 come later; one per rule');
  a = R.sgAssign(r.cards, Object.assign({}, ctx, { surfacesVisible: { gap: true } }), { homeMax: 5 });
  assert.equal(a.widgets.gap.key, 'mid:1', 'the widget that hosts it shows it in place');
  assert.ok(!a.home.some(c => c.key === 'mid:1'), '... and Home does not repeat it');
  assert.ok(!a.home.some(c => c.key === 'weak:1'), 'score 10 is under 30');
  assert.deepEqual(a.home.map(c => c.rule), ['tie-a', 'tie-b', 'lo', 'lo'], 'one per rule first, then the next cards of a rule fill up to homeMax');
  assert.deepEqual(a.home.map(c => c.key).slice(2), ['lo:2', 'lo:3']);
  // Fewer than homeMax: the line says how many and why (in place elsewhere, held for working hours).
  const sf = R.sgHomeShortfall(r, a, ctx, 5);
  assert.equal(sf.shown, 4); assert.equal(sf.elsewhere, 2, 'the hero and the gap widget');
  assert.equal(sf.text, '4 suggestions right now (up to 5). 2 are shown elsewhere on Home.');
  assert.equal(R.sgHomeShortfall(r, a, ctx, 4).text, '', 'full: no line');
  // Sunday: work-hours rules wait (G6), and the line says so.
  const sun = makeCtx({ now: '2026-10-04T14:30' });
  const fake = { cards: [{ key: 'w:1', rule: 'nudge-waiting', score: 100, surfaces: ['home'] }, { key: 'a:1', rule: 'task-estimate', score: 66, surfaces: ['home'] }], hidden: [] };
  const as2 = R.sgAssign(fake.cards, sun, { homeMax: 5 });
  assert.deepEqual(as2.home.map(c => c.key), ['a:1']);
  assert.equal(R.sgHomeShortfall(fake, as2, sun, 5).text, '1 suggestion right now (up to 5). 1 more waits for working hours (Mon–Fri 09:00–18:00).');
  // S1 with the schedule widget on the board: not repeated in the hero or Suggestions.
  // (S1 alone: the other cards S2-S20 may rightly fill Home on this fixture.)
  const s1 = evaluate(E, fixture('weekday-afternoon-gap', { surfacesVisible: { schedule: true } }), {}, ['free-slot']);
  const as = E.sgAssign(s1.cards, fixture('weekday-afternoon-gap', { surfacesVisible: { schedule: true } }));
  assert.equal(as.hero, null);
  assert.deepEqual(as.home, []);
  const noSched = E.sgAssign(s1.cards, fixture('weekday-afternoon-gap'));
  assert.equal(noSched.hero.key, 'free:2026-10-05:1080', 'without the schedule on the board, the hero offers it');
  assert.deepEqual(noSched.story.morning.map(c => c.key), ['free:2026-10-05:1080']);
});

/* ───────── counts and learn ───────── */
test('counts: shown once per key per day; acted resets the ignored streak; a new day counts the untouched ones as ignored', () => {
  let s = E.sgStatsNorm(null);
  let r = E.sgStatsShown(s, 'free-slot', 'free:a', '2026-10-05');
  assert.equal(r.changed, true);
  s = r.stats;
  r = E.sgStatsShown(s, 'free-slot', 'free:a', '2026-10-05');
  assert.equal(r.changed, false, 'once per key per day');
  s = E.sgStatsShown(s, 'free-slot', 'free:b', '2026-10-05').stats;
  s = E.sgStatsActed(s, 'free-slot', 'free:b', '2026-10-05');
  s = E.sgStatsRoll(s, '2026-10-06');
  assert.deepEqual(s.rules['free-slot'], { shown: 2, acted: 1, dismissed: 0, ignoredStreak: 1, askedKeep: false });
  assert.deepEqual(s.seen, {});
});

test('learn: 5 ignored in a row halves the score (never under a quarter); "Keep suggesting these?" shows once', () => {
  assert.deepEqual([0, 4, 5, 9, 10, 15, 40].map(E.sgLearn), [1, 1, 0.5, 0.5, 0.25, 0.25, 0.25]);
  assert.deepEqual([0, 1, 2, 3].map(E.sgFewerFactor), [1, 0.5, 0.25, 0.25]);
  const ctx = fixture('weekday-afternoon-gap');
  const stats = { rules: { 'free-slot': { shown: 5, acted: 0, dismissed: 0, ignoredStreak: 5, askedKeep: false } }, seen: {} };
  const c = E.sgEvaluate(ctx, {}, { stats, only: ['free-slot'] }).cards[0];
  assert.equal(c.score, 65);
  assert.equal(c.askKeep, true);
  const asked = E.sgStatsKeep(stats, 'free-slot', false);
  assert.equal(E.sgEvaluate(ctx, {}, { stats: asked, only: ['free-slot'] }).cards[0].askKeep, false, 'asked once');
  const yes = E.sgStatsKeep(stats, 'free-slot', true);
  assert.equal(E.sgEvaluate(ctx, {}, { stats: yes, only: ['free-slot'] }).cards[0].score, 130, 'Yes: the streak starts again');
  assert.equal(E.sgEvaluate(ctx, E.sgMemFewer({}, 'free-slot'), { only: ['free-slot'] }).cards[0].score, 65, 'Fewer like this');
});

test('"why am I seeing this?" is built from the card: the facts, what the button does, what it is based on', () => {
  const ctx = fixture('weekday-afternoon-gap');
  const c = evaluate(E, ctx).cards[0];
  const w = E.sgWhyText(c, ctx);
  assert.ok(w.why.length >= 2);
  assert.match(w.does, /Opens a new event/);
  assert.equal(w.based, 'Based on: calendar updated 08:00 · rule "Block a free stretch"');
});

test('performance: 2,000 tasks and 300 events evaluate in well under 25 ms', () => {
  const tasks = Array.from({ length: 2000 }, (_, i) => task({ id: 'p' + i, title: 'Task number ' + i, due: '2026-10-' + String(5 + (i % 20)).padStart(2, '0') }));
  const events = {};
  for (let d = 0; d < 10; d++) {
    const iso = '2026-10-' + String(4 + d).padStart(2, '0');
    events[iso] = Array.from({ length: 30 }, (_, k) => ev(`${String(8 + (k % 12)).padStart(2, '0')}:00`, `${String(8 + (k % 12)).padStart(2, '0')}:30`, { origin: k % 7 === 0 ? { kind: 'block', taskId: 'p' + k } : null }));
  }
  const ctx = makeCtx({ now: '2026-10-05T07:00', tasks, events, focus: tasks.slice(0, 5).map(t => t.id) });
  E.sgEvaluate(ctx, {}, {});            // warm up
  const runs = 7;
  const copies = Array.from({ length: runs }, () => JSON.parse(JSON.stringify(ctx)));   // fresh snapshots (no index built yet)
  const times = copies.map(c => { const t0 = performance.now(); E.sgEvaluate(c, {}, {}); return performance.now() - t0; }).sort((a, b) => a - b);
  const ms = times[runs >> 1];          // the median: one GC pause or a busy neighbour does not decide it
  // Shared CI runners (GitHub's Windows ones above all) are 1.5x slower and noisier than a
  // desk machine, so they get twice the budget; a real regression (quadratic work over
  // 2,000 tasks) costs far more than that and still fails there.
  const budget = process.env.CI ? 50 : 25;
  assert.ok(ms < budget, `took ${ms.toFixed(2)} ms per evaluation (median of ${runs}; budget ${budget} ms${process.env.CI ? ' on CI' : ''})`);
});

test('the builders\' harness: every registered rule keeps the contract on the fixtures it fires on', () => {
  const names = ['weekday-afternoon-gap', 'saturday-gap', 'packed-day', 'stale-calendar', 'no-calendar-write', 'block-clash', 'block-started', 'evening-rollover', 'waiting-overdue', 'inbox-known-sender'];
  for (const r of E.sgRules()) {
    for (const n of names) {
      const ctx = fixture(n);
      for (const c of runRule(E, r.id, ctx)) assertCard(E, c, `${r.id} on ${n}`);
    }
  }
});
