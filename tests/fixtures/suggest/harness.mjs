// tests/fixtures/suggest/harness.mjs - the suggestion-card builders' test kit.
//
// Every card is a pure rule (src/app/68-suggest-rules-<area>.js) over a
// snapshot `ctx`. This kit gives synthetic snapshots (fixtures in this folder,
// or built in code with makeCtx / ev / task), runs one rule or the whole
// engine, and checks the contract every rule must keep:
//   - it fires on its fixture and stays quiet on a near miss;
//   - every card passes sgCheckCard: a stable "kind:..." key, a title, one
//     offer, `why` with at least one number, a preview, a primary whose action
//     type exists (and is not refused by the actions layer allowlist), and a ✓
//     (quick) that applies at once rather than opening an editor;
//   - the user's rule (3 Oct): the PRIMARY opens the normal editor prefilled
//     (an 'opens' action: cal.blockOpen, cal.createOpen, task.createOpen,
//     gmail.draftOpen) or navigates; instant changes go in `quick`;
//   - the same snapshot gives the same keys (memory keys on them).
// Synthetic people only (Sam, Alex); no personal data.
//
// Usage (in tests/suggest-<area>.test.mjs):
//   import { engine, fixture, makeCtx, ev, task, runRule, assertRuleContract } from './fixtures/suggest/harness.mjs';
//   const E = engine();
//   const ctx = fixture('weekday-afternoon-gap');
//   assertRuleContract(E, 'free-slot', { fires: ctx, quiet: [fixture('packed-day')] });

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSuggestLogic } from '../../../lib/suggest-logic.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** A fresh engine (its own registry) with every rule file; `extra` = more source (a test's own rule). */
export function engine(extra) { return loadSuggestLogic({ extra: extra || '' }); }

/** Minutes from 'HH:MM'. */
export const hm = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };

/** A calendar event for ctx.cal.days[iso]: ev('10:00', '11:00', {title, attendees, origin...}). */
let _evN = 0;
export function ev(start, end, o = {}) {
  _evN++;
  return Object.assign({ id: o.id || `ev${_evN}`, title: 'Event ' + _evN, start: hm(start), end: hm(end), allDay: false, free: false, declined: false, type: 'event',
    people: [], attendees: 0, organizerSelf: true, myResponse: '', recurring: false, calendarId: 'me@example.com', location: '', join: false, origin: null, linked: [], notes: false }, o);
}
/** An open task for ctx.tasks. */
let _tN = 0;
export function task(o = {}) {
  _tN++;
  return Object.assign({ id: o.id || `t${_tN}`, title: 'Task ' + _tN, stream: 'work', priority: 'p2', status: 'todo', due: null, dueTime: null, planned: null,
    plannedTime: null, plannedMinutes: null, estimate: null, createdAt: null, waiting: false, snoozed: false, notStarted: false,
    subtasks: { done: 0, total: 0, open: [], doneAt: [] }, people: [], tags: [], focusWhy: [] }, o);
}
/**
 * A snapshot with sane defaults: o.now 'YYYY-MM-DDTHH:MM' (default Monday 5 Oct 2026, 14:40),
 * o.events {iso: [ev...]}, o.tasks, o.focus (ids), o.caps (capabilities patch), o.cal (patch), o.work.
 */
export function makeCtx(o = {}) {
  const [date, time] = String(o.now || '2026-10-05T14:40').split('T');
  const min = hm(time || '09:00');
  const days = {};
  for (const [iso, list] of Object.entries(o.events || {})) days[iso] = list;
  if (!days[date]) days[date] = [];
  return {
    now: { date, min, dow: new Date(date + 'T12:00:00Z').getUTCDay(), ts: Date.parse(`${date}T${time || '09:00'}:00Z`) },
    tz: 'Europe/London', locale: 'en-GB', userFirst: 'Sam',
    work: o.work || { days: [1, 2, 3, 4, 5], start: '09:00', end: '18:00' }, eveningHour: o.eveningHour || 17,
    cal: Object.assign({ ok: true, stale: false, writable: true, fetchedAt: `${date}T08:00:00Z`, label: 'Updated 08:00', days }, o.cal || {}),
    tasks: o.tasks || [], timed: o.timed || {}, focus: o.focus || (o.tasks || []).map(t => t.id),
    people: o.people || { sam: { first: 'Sam', name: 'Sam Lee', email: 'sam@example.com', self: false }, alex: { first: 'Alex', name: 'Alex Kim', email: 'alex@example.com', self: false } },
    inbox: o.inbox || { ok: false, fetchedAt: '', threads: [] }, triage: o.triage || { pending: [] }, countdowns: o.countdowns || [],
    surfacesVisible: o.surfacesVisible || {}, openTask: o.openTask || null,
    capabilities: Object.assign({ calendar: true, calWrite: true, inbox: false, gmailDraft: false, server: true, ai: false }, o.caps || {}),
    net: { down: !!o.down },
    // S10-S20 extras (68-suggest-context-tasks.js): last done per stream, the evening recap, the user's addresses.
    streams: o.streams || {}, eveningSaved: !!o.eveningSaved, myEmails: o.myEmails || [],
  };
}
/** A fixture from this folder (JSON = makeCtx options); `over` patches it (e.g. {now}). */
export function fixture(name, over = {}) {
  const raw = JSON.parse(readFileSync(join(HERE, name + '.json'), 'utf8'));
  const o = Object.assign({}, raw, over);
  // over.events / over.tasks (same JSON shape: 'HH:MM' times) replace the fixture's.
  if (o.events) {
    const src = o.events;
    o.events = {};
    for (const [iso, list] of Object.entries(src)) o.events[iso] = list.map(({ start, end, ...rest }) => ev(start, end, rest));
  }
  if (o.tasks) o.tasks = o.tasks.map(t => task(t));
  return makeCtx(o);
}
/** The cards one rule makes on a snapshot (no memory, no ranking). */
export function runRule(E, id, ctx, mem = {}) {
  const r = E.sgRule(id);
  assert.ok(r, `rule "${id}" is registered`);
  E.sgPrepare(ctx);
  return (r.run(ctx, E.sgMemNorm(mem), { today: ctx.now.date, guards: {}, suppressed: [], mem: E.sgMemNorm(mem) }) || []).map(c => E.sgNormCard(c, r));
}
/** The whole pipeline (guards, memory, rank, dedupe) for some rules. */
export function evaluate(E, ctx, mem = {}, only) { return E.sgEvaluate(ctx, mem, only ? { only } : {}); }

/** Contract checks for one card. */
export function assertCard(E, c, label = c && c.key) {
  assert.deepEqual(E.sgCheckCard(c), [], `${label}: card contract`);
  const t = E.SG_ACTION_TYPES[c.primary.action.type];
  assert.ok(['opens', 'navigate'].includes(t) || c.primary.action.type === 'store.refresh' || c.primary.action.type === 'cal.rsvp' || c.primary.action.type === 'suggest.keep',
    `${label}: the primary opens an editor prefilled or navigates (the user's rule); instant changes go in the ✓ (quick). Got ${c.primary.action.type}`);
  if (c.quick) assert.notEqual(E.SG_ACTION_TYPES[c.quick.action.type], 'opens', `${label}: the ✓ applies at once`);
  assert.ok(/\d/.test(c.why.join(' ')), `${label}: why has a number`);
}
/**
 * The rule fires on `fires` (at least one card, each passing the contract, same keys on a
 * second run) and is quiet on every snapshot in `quiet`.
 */
export function assertRuleContract(E, id, { fires, quiet = [] }) {
  const a = runRule(E, id, fires);
  assert.ok(a.length > 0, `${id} fires on its fixture`);
  for (const c of a) assertCard(E, c, `${id} ${c.key}`);
  const b = runRule(E, id, JSON.parse(JSON.stringify(fires)));
  assert.deepEqual(b.map(c => c.key), a.map(c => c.key), `${id}: keys are stable`);
  for (const [i, q] of quiet.entries()) assert.deepEqual(runRule(E, id, q).map(c => c.key), [], `${id} stays quiet on near miss #${i + 1}`);
  return a;
}
