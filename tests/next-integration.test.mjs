// Integration checks for the next version (integrator, 4 Oct): the pieces the
// builders' own tests do not cover together. Synthetic data only.
//   - a forged calendar-write record that answers one call twice fails closed
//     (the same check lib/gmail-draft.mjs has);
//   - a widget new in this version goes in after its catalogue neighbour on an
//     already saved board (Suggestions under Focus + schedule, not at the bottom);
//   - the demo data gives every new Home widget and the main suggestions something to show;
//   - every v1 widget is offered in Add widget (registered, available, hidden by default).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPlan, CalWriteError } from '../lib/calendar-write.mjs';
import { CONNECTORS } from '../lib/claude-runner.mjs';
import { HOME_WIDGETS, normalizeHomeLayout } from '../lib/home-topbar.mjs';
import { buildFakeData } from '../tools/make-fake-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAL = CONNECTORS.calendar.prefix;

/* ---------- 1. calendar write: one answer per call ---------- */
const tu = (id, tool, input) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name: CAL + tool, input }] } });
const tr = (id, payload, isError = false) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: isError, content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload) }] }] } });
const forged = (events) => async (opts) => {
  for (const e of events) { try { opts.onLine && opts.onLine(JSON.stringify(e), e); } catch { /* as the runner */ } }
  const result = { type: 'result', subtype: 'success', is_error: false, result: 'DONE', permission_denials: [] };
  return { text: 'DONE', lines: [...events, result].map(e => JSON.stringify(e)), result };
};

test('calendar write: a record that answers one call twice is not believed', async () => {
  const cIn = { summary: 'Focus: report', startTime: '2026-10-06T10:00:00+01:00', endTime: '2026-10-06T11:00:00+01:00', timeZone: 'Europe/London', notificationLevel: 'NONE' };
  const plan = { steps: [{ tool: 'create_event', input: cIn }] };
  // the honest record still works
  const ok = await runPlan(plan, { run: forged([tu('a', 'create_event', cIn), tr('a', { id: 'n1' })]) });
  assert.equal(ok.length, 1);
  // the gate refused the call, then a forged "success" for the same call
  await assert.rejects(runPlan(plan, { run: forged([tu('a', 'create_event', cIn), tr('a', 'PreToolUse:create_event hook error: Refused', true), tr('a', { id: 'n1' })]) }),
    (e) => e instanceof CalWriteError && ['BAD_OUTPUT', 'UNCERTAIN'].includes(e.code));
  // two "successes" for one call
  await assert.rejects(runPlan(plan, { run: forged([tu('a', 'create_event', cIn), tr('a', { id: 'n1' }), tr('a', { id: 'n2' })]) }),
    (e) => e instanceof CalWriteError && e.code === 'UNCERTAIN', 'a write went through: never "nothing was saved"');
});

/* ---------- 2. a new widget on an old board ---------- */
test('layout: a widget the saved board has never seen goes after its catalogue neighbour', () => {
  const ids = (l) => l.widgets.map(w => w.id);
  // An old board: the hero, Focus, schedule, then the rest the user arranged; no suggest.
  const old = { widgets: [{ id: 'today' }, { id: 'focus' }, { id: 'schedule' }, { id: 'finance' }, { id: 'people' }, { id: 'links', hidden: false }] };
  const n = ids(normalizeHomeLayout(old));
  assert.equal(n[n.indexOf('schedule') + 1], 'suggest', 'Suggestions under Focus + schedule');
  assert.deepEqual(n.filter(id => old.widgets.some(w => w.id === id)), old.widgets.map(w => w.id), 'the stored order is kept');
  // stable once saved
  const once = normalizeHomeLayout(old);
  assert.deepEqual(normalizeHomeLayout(once), once);
});

/* ---------- 3. the demo data ---------- */
test('demo data: every new Home widget and the main suggestions have something to show', () => {
  const today = new Date('2026-10-07T12:00:00');      // a Wednesday
  const d = buildFakeData({ today });
  const s = d.state;
  const iso = (n) => { const x = new Date(today); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const on = (n) => d.calendar.events.filter(e => e.start.dateTime && e.start.dateTime.slice(0, 10) === iso(n));
  const withPeople = (e) => (e.attendees || []).some(a => !a.self);
  // After meetings + Meeting prep: a meeting with people that ended this morning, and one later today
  assert.ok(on(0).some(e => withPeople(e) && e.start.dateTime.slice(11, 16) <= '09:00'), 'a meeting that has ended');
  assert.ok(on(0).some(e => withPeople(e) && e.start.dateTime.slice(11, 16) >= '15:00'), 'a meeting later today');
  // Invites & clashes / S6: an invitation on the primary calendar, not answered yet
  const inv = d.calendar.events.find(e => (e.attendees || []).some(a => a.self && a.responseStatus === 'needsAction'));
  assert.ok(inv && inv.organizer && inv.organizer.email, 'an invitation with an organiser');
  assert.equal(inv.calendarId, d.calendar.calendars.find(c => c.primary).id);
  // S5/S7/S8: the dashboard's own focus blocks, linked to an open task
  const own = Object.entries(s.eventMeta || {}).filter(([, m]) => m.origin && m.origin.kind === 'block');
  assert.ok(own.length >= 2);
  for (const [id, m] of own) {
    assert.ok(d.calendar.events.some(e => e.id === id), id + ' is an event');
    assert.ok(s.custom.some(t => t.id === m.origin.taskId) && s.statuses[m.origin.taskId] !== 'done', 'linked to an open task');
  }
  // Habits: repeating tasks with history
  const reps = s.custom.filter(t => t.recurrence && t.recurrence !== 'none');
  assert.ok(reps.filter(t => (s.completionLog[t.id] || []).length >= 3).length >= 2, 'habits with a streak behind them');
  // Launchpad: pinned resources (links only, never a local path); Daily note: today has lines
  assert.ok((s.resources || []).filter(r => r.pinned).length >= 3);
  assert.ok((s.resources || []).every(r => r.kind !== 'folder' && r.kind !== 'file'));
  assert.ok(s.daynotes && s.daynotes[iso(0)] && s.daynotes[iso(0)].md.length > 10);
  // Everything invented: example domains only
  for (const e of d.calendar.events) for (const a of e.attendees || []) assert.match(a.email, /@example\.(com|org|net)$/);
  for (const r of s.resources) if (/^https?:/.test(r.target)) assert.match(r.target, /^https:\/\/([a-z]+\.)?(example\.(com|org)|github\.com\/example)\b/);
});

/* ---------- 4. Add widget offers every v1 widget ---------- */
test('every v1 widget is registered, available, hidden by default and in the server catalogue', () => {
  const V1 = ['capture', 'gap', 'dayplan', 'nextup', 'wrapup', 'calcheck', 'inbox', 'owe', 'catchup', 'runway', 'list', 'habits', 'launchpad', 'spendable', 'notebook', 'activity'];
  const app = join(ROOT, 'src', 'app');
  for (const id of V1) {
    const src = readFileSync(join(app, `12-home-w-${id}.js`), 'utf8');
    assert.match(src, new RegExp(`registerHomeWidget\\(\\{[\\s\\S]*?id: '${id}'`), id + ' registers');
    assert.match(src, /available: (true|\(\) => (true|typeof \w+ === 'function'))/, id + ' is available (no longer a stub)');
    assert.match(src, /defaultHidden: true/, id + ' is hidden by default');
    const c = HOME_WIDGETS.find(w => w.id === id);
    assert.ok(c && c.defaultHidden === true, id + ' in HOME_WIDGETS, hidden by default');
    assert.ok(readdirSync(join(ROOT, 'tests')).includes(`home-w-${id}.test.mjs`), id + ' has its own tests');
  }
  // shown by default: the hero (a new folder's welcome) and the suggestions (and the older glances);
  // the day's hero heads Home itself, so there is no brief widget
  const shown = HOME_WIDGETS.filter(w => !w.defaultHidden).map(w => w.id);
  for (const id of ['today', 'suggest']) assert.ok(shown.includes(id), id + ' shown by default');
  assert.ok(!HOME_WIDGETS.some(w => w.id === 'brief'), 'no brief widget');
  for (const id of V1) assert.ok(!shown.includes(id));
});
