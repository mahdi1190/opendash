// Calendar + Email: the Google data jobs (lib/calendar.mjs, lib/inbox.mjs),
// the calendar/email ops and queries (server/actions/ops-calendar.mjs,
// calendar-queries.mjs) and the runner profile. Synthetic data only; the
// claude CLI is replaced by a fake `run`.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  normaliseEvent, normaliseCalendar, friendlyCalendarName, calendarsFromResults, dedupeEvents, eventsFromResults,
  eventCalls, splitCalls, createCalendarService, eventDays, importLegacy,
} from '../lib/calendar.mjs';
import { createInboxService, normaliseThread, messagesFor } from '../lib/inbox.mjs';
import { buildArgs, CONNECTORS, ClaudeError } from '../lib/claude-runner.mjs';
import { dataPaths } from '../lib/datadir.mjs';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir, TODAY, addDays } from './fixtures/actions-state.mjs';

const CAL = 'mcp__claude_ai_Google_Calendar__';
const GM = 'mcp__claude_ai_Gmail__';
const line = (o) => JSON.stringify(o);
/** stream-json lines for tool calls + their results: [[name, input, payload|{error}]] */
function streamOf(calls) {
  const lines = [line({ type: 'system', subtype: 'init', tools: [], mcp_servers: [] })];
  calls.forEach(([name, input, payload], i) => {
    lines.push(line({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't' + i, name, input }] } }));
    const isErr = payload && payload.error;
    lines.push(line({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't' + i, is_error: !!isErr, content: [{ type: 'text', text: isErr ? payload.error : JSON.stringify(payload) }] }] } }));
  });
  lines.push(line({ type: 'result', result: 'DONE' }));
  return { lines };
}
const ev = (id, summary, start, end, extra = {}) => ({ id, summary, start, end, status: 'confirmed', ...extra });

// ─── normalising ─────────────────────────────────────────────────────────────
test('normaliseEvent: connector all-day dates, cancelled, join links, html, calendar id', () => {
  const a = normaliseEvent(ev('a1', 'Away', { date: '2026-09-01T00:00:00Z' }, { date: '2026-09-03T00:00:00Z' }), 'team@group.calendar.google.com');
  assert.deepEqual([a.allDay, a.start, a.end, a.calendarId], [true, { date: '2026-09-01' }, { date: '2026-09-03' }, 'team@group.calendar.google.com']);
  assert.deepEqual(eventDays(a, 'UTC'), ['2026-09-01', '2026-09-02']);
  assert.equal(normaliseEvent(ev('c1', 'Gone', { date: '2026-09-01' }, { date: '2026-09-02' }, { status: 'cancelled' })), null);
  assert.equal(normaliseEvent(ev('bad id!', 'x', { date: '2026-09-01' })), null);
  const m = normaliseEvent(ev('m1', 'Sync <b>now</b>', { dateTime: '2026-09-01T10:00:00+01:00' }, { dateTime: '2026-09-01T11:00:00+01:00' }, {
    hangoutLink: 'https://meet.google.com/abc-defg-hij', description: '<p>Agenda</p><script>alert(1)</script><a href="x">link</a>',
    attendees: [{ email: 'Sam@Example.com', displayName: 'Sam', responseStatus: 'accepted', organizer: true }, { email: 'me@example.com', self: true, responseStatus: 'tentative' }, { email: 'room@resource.calendar.google.com', resource: true }],
    transparency: 'transparent', iCalUID: 'uid-1@google.com', htmlLink: 'javascript:alert(1)',
  }), 'me@example.com');
  assert.equal(m.conferenceUrl, 'https://meet.google.com/abc-defg-hij');
  assert.equal(m.description, 'Agenda\nlink');
  assert.equal(m.attendees.length, 2);
  assert.equal(m.attendees[0].email, 'sam@example.com');
  assert.equal(m.selfResponse, 'tentative');
  assert.equal(m.free, true);
  assert.equal(m.iCalUID, 'uid-1@google.com');
  assert.equal(m.htmlLink, undefined, 'only Google Calendar links are kept');
  const evil = normaliseEvent(ev('e1', 'x', { dateTime: '2026-09-01T10:00:00Z' }, { dateTime: '2026-09-01T11:00:00Z' }, { conferenceUrl: 'https://evil.example/meet' }));
  assert.equal(evil.conferenceUrl, undefined);
});

test('calendar names: readable defaults, raw name kept', () => {
  assert.equal(friendlyCalendarName('sam.lee@example.org', 'sam.lee@example.org'), 'Sam Lee');
  assert.equal(friendlyCalendarName('*Team Rota', 'x@group.calendar.google.com'), 'Team Rota');
  assert.equal(friendlyCalendarName('', 'abc@group.calendar.google.com'), 'Shared calendar');
  assert.equal(friendlyCalendarName('Work', 'w@example.org'), 'Work');
  const c = normaliseCalendar({ id: 'sam.lee@example.org', summary: 'sam.lee@example.org', timeZone: 'Europe/London' });
  assert.deepEqual([c.name, c.googleName, c.timeZone], ['Sam Lee', 'sam.lee@example.org', 'Europe/London']);
  assert.equal(normaliseCalendar({ id: 'not a calendar id', summary: 'x' }), null);
  const { calendars, ok } = calendarsFromResults([{ name: CAL + 'list_calendars', input: {}, payload: { calendars: [
    { id: 'g1@group.calendar.google.com', summary: 'Group' }, { id: 'me@example.org', summary: 'Me' }, { id: 'me@example.org', summary: 'dup' },
  ] } }]);
  assert.equal(ok, 1);
  assert.deepEqual(calendars.map(c => c.id), ['me@example.org', 'g1@group.calendar.google.com'], 'own calendars before group ones, no duplicates');
  assert.ok(calendars.every(c => typeof c.color === 'string'));
});

test('events in several calendars are folded into one', () => {
  const s = { dateTime: '2026-09-01T10:00:00Z' }, e = { dateTime: '2026-09-01T11:00:00Z' };
  const list = [
    normaliseEvent(ev('x1', 'Review', s, e), 'a@example.org'),
    normaliseEvent(ev('x1', 'Review', s, e, { attendees: [{ email: 'sam@example.com' }] }), 'b@example.org'),
    normaliseEvent(ev('y1', 'Lunch', s, e, { iCalUID: 'u1' }), 'a@example.org'),
    normaliseEvent(ev('y2', 'Lunch (copy)', { dateTime: '2026-09-02T10:00:00Z' }, e, { iCalUID: 'u1' }), 'b@example.org'),
    normaliseEvent(ev('z1', 'Stand-up', s, e), 'a@example.org'),
    normaliseEvent(ev('z9', 'stand-up', s, e), 'c@example.org'),
  ];
  const out = dedupeEvents(list);
  assert.equal(out.length, 3);
  const r = out.find(x => x.id === 'x1');
  assert.deepEqual(r.calendars, ['a@example.org', 'b@example.org']);
  assert.equal(r.attendees.length, 1, 'the richer copy fills in details');
  assert.deepEqual(out.find(x => x.id === 'z1').calendars, ['a@example.org', 'c@example.org']);
});

test('list_events calls: one per calendar and chunk, capped; busy chunks split', () => {
  const cals = Array.from({ length: 7 }, (_, i) => ({ id: `c${i}@example.org` }));
  const calls = eventCalls(cals, '2026-09-01', '2027-01-29', 'Europe/London');
  assert.ok(calls.length <= 60 && calls.length >= 7);
  assert.ok(cals.every(c => calls.some(x => x.calendarId === c.id)));
  assert.equal(calls[0].pageSize, 250);
  assert.equal(eventCalls([], '2026-09-01', '2026-09-10', 'UTC')[0].calendarId, undefined, 'no list: the main calendar');
  const more = splitCalls([{ calendarId: 'c0@example.org', startTime: '2026-09-01T00:00:00Z', endTime: '2026-09-30T23:59:59Z', timeZone: 'UTC' }]);
  assert.equal(more.length, 4);
  assert.equal(more[0].startTime, '2026-09-01T00:00:00Z');
  assert.equal(more[3].endTime, '2026-09-30T23:59:59Z');
  assert.deepEqual(splitCalls([{ calendarId: 'bad id', startTime: '2026-09-01T00:00:00Z', endTime: '2026-09-30T23:59:59Z' }]), []);
});

test('runner: calendar-read may list calendars and read events, nothing else', () => {
  assert.ok(CONNECTORS.calendar.read.includes('list_calendars'));
  const { args } = buildArgs('calendar-read', { allowedTools: [CAL + 'list_calendars'] });
  const allowed = args[args.indexOf('--allowedTools') + 1].split(',');
  const denied = args[args.indexOf('--disallowedTools') + 1].split(',');
  assert.deepEqual(allowed, [CAL + 'list_calendars']);
  for (const t of ['create_event', 'update_event', 'delete_event', 'respond_to_event', 'list_events']) assert.ok(denied.includes(CAL + t), t);
  assert.ok(denied.includes('mcp__claude_ai_Gmail') && denied.includes('mcp__claude_ai_Bank'));
  assert.throws(() => buildArgs('calendar-read', { allowedTools: [CAL + 'create_event'] }), e => e.code === 'BAD_REQUEST');
});

// ─── the calendar job ────────────────────────────────────────────────────────
let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'cal-test-')); mkdirSync(join(dir, 'calendar'), { recursive: true }); });
// (Retries: Windows can briefly hold a file that was just written and closed.)
afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }));
const svcWith = (run, extra = {}) => createCalendarService({ dataDir: dir, paths: dataPaths(dir), getConfig: () => ({ timezone: 'Europe/London' }), run, ...extra });
async function finish(svc) {
  for (let i = 0; i < 1500; i++) { const s = await svc.status(); if (s.job && s.job.state !== 'running') return s.job; await new Promise(r => setTimeout(r, 10)); }
  throw new Error('job did not finish');
}

test('Update calendar: lists calendars, reads each, folds duplicates, writes events.json', async () => {
  const seen = [];
  const run = async (o) => {
    seen.push({ profile: o.profile, tools: o.allowedTools, prompt: o.prompt });
    if (o.allowedTools[0] === CAL + 'list_calendars') {
      return streamOf([[CAL + 'list_calendars', { pageSize: 250 }, { calendars: [{ id: 'me@example.org', summary: 'me@example.org' }, { id: 'team@group.calendar.google.com', summary: 'Team' }, { id: 'sam@example.com', summary: 'Sam' }] }]]);
    }
    const ids = [...o.prompt.matchAll(/"calendarId":"([^"]+)"/g)].map(m => m[1]);
    assert.ok(ids.length >= 3, 'every calendar is read');
    assert.ok(!/ignore previous/i.test(o.prompt));
    const day = addDays(TODAY, 1);
    const calls = ids.map((id) => {
      const events = id === 'me@example.org' ? [ev('k1', 'Supervision', { dateTime: `${day}T10:00:00Z` }, { dateTime: `${day}T11:00:00Z` })]
        : id === 'team@group.calendar.google.com' ? [ev('k1', 'Supervision', { dateTime: `${day}T10:00:00Z` }, { dateTime: `${day}T11:00:00Z` }), ev('t2', 'Away day', { date: `${day}T00:00:00Z` }, { date: `${addDays(day, 1)}T00:00:00Z` })]
          : [];
      return [CAL + 'list_events', JSON.parse(o.prompt.split('\n').find(l => l.includes(`"calendarId":"${id}"`)).trim()), id === 'sam@example.com' ? { error: 'Forbidden' } : { events }];
    });
    return streamOf(calls);
  };
  const svc = svcWith(run);
  const r = await svc.start({ force: true });
  assert.equal(r.started, true);
  const job = await finish(svc);
  assert.equal(job.state, 'ok', job.error);
  assert.deepEqual(seen.map(s => s.profile), ['calendar-read', 'calendar-read']);
  assert.deepEqual(seen.map(s => s.tools), [[CAL + 'list_calendars'], [CAL + 'list_events']]);
  const doc = JSON.parse(readFileSync(join(dir, 'calendar', 'events.json'), 'utf8'));
  assert.equal(doc.version, 2);
  assert.equal(doc.events.length, 2);
  const k1 = doc.events.find(e => e.id === 'k1');
  assert.equal(k1.calendarId, 'me@example.org');
  assert.deepEqual(k1.calendars, ['me@example.org', 'team@group.calendar.google.com']);
  assert.equal(doc.events.find(e => e.id === 't2').allDay, true);
  assert.deepEqual(doc.calendars.map(c => [c.name, c.count, c.error || null]), [['Me', 1, null], ['Sam', 0, 'unreadable'], ['Team', 2, null]]);
  assert.equal(doc.partial, true, 'a calendar that failed marks the update partial');
  // A second, unforced start within 30 minutes is skipped.
  const again = await svc.start({});
  assert.equal(again.skipped, true);
  const read = await svc.read({ from: addDays(TODAY, 1), to: addDays(TODAY, 1) });
  assert.equal(read.count, 2);
  assert.equal(read.calendars.length, 3);
});

test('Update calendar: busy chunks get a follow-up pass', async () => {
  let n = 0;
  const run = async (o) => {
    n++;
    if (o.allowedTools[0] === CAL + 'list_calendars') return streamOf([[CAL + 'list_calendars', {}, { calendars: [{ id: 'me@example.org', summary: 'Me' }] }]]);
    const inputs = o.prompt.split('\n').filter(l => l.trim().startsWith('{"calendarId"')).map(l => JSON.parse(l.trim()));
    return streamOf(inputs.map((inp, i) => [CAL + 'list_events', inp, { events: [ev(`p${n}-${i}`, 'E' + i, { dateTime: inp.startTime.replace('00:00:00Z', '09:00:00Z') }, { dateTime: inp.startTime.replace('00:00:00Z', '10:00:00Z') })], ...(n === 2 && i === 0 ? { nextPageToken: 'more' } : {}) }]));
  };
  const svc = svcWith(run);
  await svc.start({ force: true, back: 10, ahead: 50 });
  const job = await finish(svc);
  assert.equal(job.state, 'ok', job.error);
  assert.equal(n, 3, 'calendars, events, follow-up');
  const doc = JSON.parse(readFileSync(join(dir, 'calendar', 'events.json'), 'utf8'));
  assert.ok(!doc.partial, 'the follow-up pass completed the window');
  assert.ok(doc.events.some(e => e.id.startsWith('p3-')));
});

test('Update calendar: sign-in problems become clear messages and a Connections status', async () => {
  const svc = svcWith(async () => { throw new ClaudeError('CONNECTOR_AUTH', 'needs you to sign in again'); });
  await svc.start({ force: true });
  const job = await finish(svc);
  assert.equal(job.state, 'error');
  assert.equal(job.code, 'CONNECTOR_AUTH');
  assert.match(job.error, /Google Calendar needs re-authorising: open Connections/);
  // The Connections status is written in the job's onDone hook (after the job
  // state flips), so poll for it instead of guessing a delay (slow under load).
  const connFile = join(dir, 'connections.json');
  let conn = null;
  for (let i = 0; i < 200; i++) {
    try { conn = JSON.parse(readFileSync(connFile, 'utf8')); if (conn.calendar && conn.calendar.status === 'needs-auth') break; } catch { /* not written yet */ }
    await new Promise(r => setTimeout(r, 10));
  }
  assert.equal(conn.calendar.status, 'needs-auth');
  assert.ok(!existsSync(join(dir, 'calendar', 'events.json')), 'nothing written on failure');
  // A list_calendars tool error (not auth) falls back to the main calendar.
  const svc2 = svcWith(async (o) => o.allowedTools[0] === CAL + 'list_calendars'
    ? streamOf([[CAL + 'list_calendars', {}, { error: 'Unknown failure' }]])
    : streamOf([[CAL + 'list_events', JSON.parse(o.prompt.split('\n').find(l => l.trim().startsWith('{')).trim()), { events: [ev('m1', 'Main', { date: TODAY }, { date: addDays(TODAY, 1) })] }]]));
  await svc2.start({ force: true });
  assert.equal((await finish(svc2)).state, 'ok');
  assert.equal(JSON.parse(readFileSync(join(dir, 'calendar', 'events.json'), 'utf8')).events[0].id, 'm1');
});

test('a connector still starting up (TOOL_MISSING once) is retried', async () => {
  let n = 0;
  const run = async (o) => {
    n++;
    if (n === 1) throw new ClaudeError('TOOL_MISSING', 'connected but its tools are missing');
    if (o.allowedTools[0] === CAL + 'list_calendars') return streamOf([[CAL + 'list_calendars', {}, { calendars: [{ id: 'me@example.org', summary: 'Me' }] }]]);
    const inp = JSON.parse(o.prompt.split('\n').find(l => l.trim().startsWith('{"calendarId"')).trim());
    return streamOf([[CAL + 'list_events', inp, { events: [ev('r1', 'Retry', { date: TODAY }, { date: addDays(TODAY, 1) })] }]]);
  };
  const svc = svcWith(run, { retryDelayMs: 5 });
  await svc.start({ force: true, back: 1, ahead: 5 });
  const job = await finish(svc);
  assert.equal(job.state, 'ok', job.error);
  assert.equal(n, 3);
});

test('the old snapshot is imported once', async () => {
  writeFileSync(join(dir, 'calendar', 'calendar.json'), JSON.stringify({ fetchedAt: '2026-08-26T09:00:00Z', events: [ev('o1', 'Old', { date: '2026-08-27' }, { date: '2026-08-28' })] }));
  const svc = svcWith(async () => { throw new Error('no'); });
  assert.equal((await svc.ensureImported()).imported, 1);
  assert.equal((await svc.ensureImported()).imported, 0);
  const r = await svc.read({});
  assert.equal(r.source, 'snapshot');
  assert.equal(importLegacy({ events: [ev('o1', 'Old', { date: '2026-08-27' })] }).length, 1);
});

// ─── the inbox job ───────────────────────────────────────────────────────────
test('Update inbox: search only, fields validated, auth errors explained', async () => {
  const now = Date.now();
  const seen = [];
  const run = async (o) => {
    seen.push(o);
    const q = o.prompt.split('\n').filter(l => l.trim().startsWith('{"query"')).map(l => JSON.parse(l.trim()));
    return streamOf(q.map((inp, i) => [GM + 'search_threads', inp, i ? {} : { threads: [
      { id: 'th1', messages: [{ subject: 'Hello <script>', sender: '"Sam Lee" <Sam@Example.com>', date: new Date(now - 3600e3).toISOString(), snippet: 'Hi‮there', labelIds: ['UNREAD', 'IMPORTANT'] }] },
      { id: 'bad id', messages: [{ subject: 'x', date: new Date().toISOString() }] },
    ] }]));
  };
  const svc = createInboxService({ dataDir: dir, paths: dataPaths(dir), getConfig: () => ({ timezone: 'UTC' }), run });
  await svc.start({ force: true, days: 7 });
  let job;
  for (let i = 0; i < 1500; i++) { const s = await svc.status(); if (s.job.state !== 'running') { job = s.job; break; } await new Promise(r => setTimeout(r, 10)); }
  assert.equal(job.state, 'ok', job.error);
  assert.equal(seen[0].profile, 'gmail-read');
  assert.deepEqual(seen[0].allowedTools, [GM + 'search_threads']);
  const r = await svc.read({});
  assert.equal(r.count, 1);
  const m = r.messages[0];
  assert.deepEqual([m.from.email, m.from.name, m.unread, m.important, m.snippet], ['sam@example.com', 'Sam Lee', true, true, 'Hithere']);
  assert.deepEqual(messagesFor(r.messages, { emails: ['SAM@example.com'] }).map(x => x.id), ['th1']);
  assert.equal(normaliseThread({ id: 'x', subject: 's' }), null, 'no date, no message');
  const bad = createInboxService({ dataDir: dir, paths: dataPaths(dir), run: async () => streamOf([[GM + 'search_threads', {}, { error: 'MCP server "claude.ai Gmail" needs you to sign in again (run /mcp to re-authenticate)' }]]) });
  await bad.start({ force: true });
  for (let i = 0; i < 1500; i++) { const s = await bad.status(); if (s.job.state !== 'running') { job = s.job; break; } await new Promise(r2 => setTimeout(r2, 10)); }
  assert.equal(job.code, 'CONNECTOR_AUTH');
  assert.equal(job.error, 'Gmail needs re-authorising: open Connections.');
});

// ─── ops + queries ───────────────────────────────────────────────────────────
test('calendar ops: schedule a task, annotate an event, rename a calendar, triage email, undo', async () => {
  const d = makeDataDir();
  try {
    const a = createActions({ dataDir: d });
    const run = (ops, extra = {}) => a.apply({ ops, source: 'mcp', client: 'test', ...extra });
    const disk = () => JSON.parse(readFileSync(join(d, 'state', 'dashboard-state.json'), 'utf8'));
    const day = addDays(TODAY, 2);
    const r = await run([{ op: 'task.schedule', id: 'u-2-bbb', date: day, time: '14:30', minutes: 90 }]);
    let t = disk().custom.find(x => x.id === 'u-2-bbb');
    assert.deepEqual([t.dueDate, t.dueTime, t.estimate], [day, '14:30', 90]);
    await assert.rejects(run([{ op: 'task.schedule', id: 'u-2-bbb', date: day, time: '25:00' }]), e => e.code === 'INVALID_PARAMS' || e.code === 'BAD_VALUE');
    await assert.rejects(run([{ op: 'task.schedule', id: 'u-2-bbb', date: 'next friday' }]), e => /YYYY-MM-DD|date/.test(e.message));
    // Create a task from an event and link it, in one batch.
    await run([
      { op: 'task.create', title: 'Prepare for group meeting', dueDate: TODAY, ref: 'prep' },
      { op: 'event.annotate', eventId: 'e1', notes: '1. Results\n2. Next steps', important: true, linkTasks: ['$prep'] },
    ]);
    const meta = disk().eventMeta.e1;
    assert.equal(meta.notes, '1. Results\n2. Next steps');
    assert.equal(meta.important, true);
    assert.equal(meta.tasks.length, 1);
    const listed = await a.query('calendar.list', { from: TODAY, to: TODAY });
    const g = listed.events.find(x => x.id === 'e1');
    assert.equal(g.important, true);
    assert.deepEqual(g.taskIds, meta.tasks);
    assert.match(g.notes, /Results/);
    await run([{ op: 'calendar.update', calendarId: 'team@group.calendar.google.com', alias: 'Lab', color: 'teal' }]);
    assert.deepEqual(disk().calendarSettings['team@group.calendar.google.com'], { alias: 'Lab', color: 'teal' });
    await assert.rejects(run([{ op: 'calendar.update', calendarId: 'team@group.calendar.google.com', color: 'neon' }]));
    const e = await run([{ op: 'email.triage', threadId: 'th-1', action: 'dismiss' }]);
    assert.equal(disk().emailTriage.handled['th-1'].action, 'dismiss');
    await a.undo(e.undo, { source: 'mcp' });
    assert.equal(((disk().emailTriage || {}).handled || {})['th-1'], undefined, 'undo puts the email back');
    await a.undo(r.undo, { source: 'mcp' });
    t = disk().custom.find(x => x.id === 'u-2-bbb');
    assert.deepEqual([t.dueTime, t.estimate], [undefined, undefined]);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('calendar.list hides switched-off calendars and names them', async () => {
  const d = makeDataDir(Object.assign((await import('./fixtures/actions-state.mjs')).sampleState(), {
    calPrefs: { hidden: { 'cal:b@example.org': true } }, calendarSettings: { 'a@example.org': { alias: 'Mine' } },
  }));
  try {
    writeFileSync(join(d, 'calendar', 'events.json'), JSON.stringify({ version: 2, fetchedAt: new Date().toISOString(), calendars: [{ id: 'a@example.org', name: 'A' }, { id: 'b@example.org', name: 'B' }], events: [
      normaliseEvent(ev('v1', 'Visible', { dateTime: `${TODAY}T09:00:00Z` }, { dateTime: `${TODAY}T10:00:00Z` }), 'a@example.org'),
      normaliseEvent(ev('h1', 'Hidden', { dateTime: `${TODAY}T11:00:00Z` }, { dateTime: `${TODAY}T12:00:00Z` }), 'b@example.org'),
    ] }));
    const a = createActions({ dataDir: d });
    const r = await a.query('calendar.list', { from: TODAY, to: TODAY });
    assert.deepEqual(r.events.map(e => [e.id, e.calendar]), [['v1', 'Mine']]);
    assert.deepEqual(r.calendars.map(c => [c.name, !!c.hidden]), [['Mine', false], ['B', true]]);
    const all = await a.query('calendar.list', { from: TODAY, to: TODAY, includeHidden: true });
    assert.equal(all.events.length, 2);
  } finally { rmSync(d, { recursive: true, force: true }); }
});
