// What suggestion buttons do (src/app/68-suggest-actions.js, run in a VM with a
// stand-in CalWrite and server) and the server side they rely on (event.annotate
// `origin`, the dashboard's own blocks). Covers: the action registry is closed
// (unknown types refused), the safety checks (no guests, only own events move,
// a block is 15 min to 4 h inside one day and not in the past, RSVP needs the
// second press, ops are allowlisted), the S1 flows with the user's prefilled
// rule (3 Oct): the PRIMARY opens the event card in create mode prefilled and
// its Save links the task back; the ✓ books at once with a receipt and ONE
// Undo (also while Google is still saving); never a task. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir, TODAY } from './fixtures/actions-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const PAGE_FILES = readdirSync(APP).filter(n => /^68-suggest-(actions|context|logic|rules-.*)\.js$/.test(n)).sort();   // build order
const DAY = '2026-10-06';                // "tomorrow" for the stand-in clock (todayStr = 2026-10-05)

function fakeCalWrite(o = {}) {
  const subs = new Set(), calls = [];
  let n = 0;
  const W = {
    calls,
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
    defaultCalendarId: () => 'me@example.com',
    info: () => ({ fake: true }),
    guests: (id) => (id === 'guesty' ? [{ email: 'alex@example.com' }] : []),
    canRsvp: () => ({ ok: true }),
    create(input, opt) {
      calls.push(['create', input, opt]);
      const tmp = 'tmp-' + (++n);
      for (const f of subs) f({ id: tmp, op: 'create', state: 'pending', pending: true });
      let release;
      const gate = new Promise(r => { release = r; });
      W.release = release;
      const wait = o.hold ? gate : new Promise(r => setTimeout(r, 2));
      return wait.then(() => (o.fail ? { ok: false, code: 'GOOGLE', message: 'Google said no' }
        : { ok: true, event: { id: 'g' + n, summary: input.title, start: { dateTime: input.start }, end: { dateTime: input.end }, attendees: input.guests || [] } }));
    },
    remove(id, opt) { calls.push(['remove', id, opt]); return Promise.resolve({ ok: true }); },
    update(id, p, opt) { calls.push(['update', id, p, opt]); return Promise.resolve({ ok: true, event: { id } }); },
    move(id, t, opt) { calls.push(['move', id, t, opt]); return Promise.resolve({ ok: true, event: { id } }); },
    resize(id, t, opt) { calls.push(['resize', id, t, opt]); return Promise.resolve({ ok: true, event: { id } }); },
    rsvp(id, r, opt) { calls.push(['rsvp', id, r, opt]); return Promise.resolve({ ok: true }); },
  };
  return W;
}
function page(o = {}) {
  const posts = [], opened = [], toasts = [];
  const tasks = [{ id: 't-report', title: 'Report draft: section 2', stream: 'work' }, { id: 't-slides', title: 'Slides for Alex', stream: 'work' }];
  const W = fakeCalWrite(o);
  const box = {
    console, setTimeout, clearTimeout, Promise, JSON, Math, Date, Object, Array, String, Number, Set, Map, RegExp, Error,
    state: { custom: tasks, eventMeta: o.eventMeta || {}, suggest: undefined, suggestStats: undefined, _lastSave: 1 },
    APP_CONFIG: { timezone: 'Europe/London', locale: 'en-GB' },
    window: { CalWrite: W },
    todayStr: () => '2026-10-05', fmtDate: (d) => d.toISOString().slice(0, 10),
    getItem: (id) => tasks.find(t => t.id === id), effTitle: (t) => t.title, effStream: (t) => t.stream,
    netErrorMessage: (e, f) => (e && e.message) || f || 'error',
    toast: (msg, opt) => { toasts.push({ msg, opt }); return () => {}; },
    confirmDialog: async () => true,
    openEvent: (id, opt) => { opened.push(['event', id, opt]); return 'card'; },
    openTask: (id, opt) => opened.push(['task', id, opt]),
    tcOpenCreate: (pre, opt) => opened.push(['create', pre, opt]),
    setView: (v) => opened.push(['view', v]),
    render() {}, saveData() {}, saveUI() {},
    homeCalStatus: () => ({ ok: true, stale: !!o.stale, label: 'Updated 08:00' }),
    calEventById: (id) => ({ id, start: { dateTime: `${DAY}T10:00` }, end: { dateTime: `${DAY}T11:00` }, summary: 'Focus: x', calendarId: 'me@example.com' }),
    fetch: async (url, init) => {
      const body = JSON.parse(init.body);
      posts.push({ url, body });
      if (o.opsFail && url === '/api/actions' && !body.dryRun) return { ok: false, status: 400, json: async () => ({ ok: false, error: { code: 'BAD', message: 'nope' } }) };
      if (url === '/api/actions/undo') return { ok: true, status: 200, json: async () => ({ ok: true, version: 3 }) };
      return { ok: true, status: 200, json: async () => (body.dryRun ? { ok: true, preview: [] } : { ok: true, undo: 'tok-' + posts.length, version: 2, summary: 'Done' }) };
    },
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock: wall times in the dashboard's zone (travel spec 2.7)
  vm.runInContext(PAGE_FILES.map(f => readFileSync(join(APP, f), 'utf8')).join('\n;\n') + '\n;this.__ = { sgRun, sgUndoGroup, sgApplyOps, sgAfterEventCreate, SG_ACTIONS, SG_ACTION_TYPES, sgCanBlock };', box, { filename: 'suggest-page.js' });
  return { box, W, posts, opened, toasts, api: box.__ };
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const blockArgs = (over = {}) => Object.assign({ taskId: 't-report', date: DAY, start: 14 * 60 + 45, end: 16 * 60 + 45, gapEnd: 18 * 60, rule: 'free-slot', title: 'Focus: Report draft', description: 'Focus block from your dashboard.\nTask: Report draft: section 2' }, over);

test('the files load in build order (actions before logic) with nothing run too early', () => {
  assert.deepEqual(PAGE_FILES.slice(0, 3), ['68-suggest-actions.js', '68-suggest-context.js', '68-suggest-logic.js']);
  const { api } = page();
  assert.ok(api.SG_ACTIONS['cal.block']);
});

test('the registry is closed: every listed type is implemented, nothing else runs; unknown types are refused', async () => {
  const { api } = page();
  assert.deepEqual(Object.keys(api.SG_ACTIONS).sort(), Object.keys(api.SG_ACTION_TYPES).sort());
  const r = await api.sgRun({ type: 'email.send', args: {} }, null, {});
  assert.equal(r.code, 'UNKNOWN_ACTION');
  api.SG_ACTIONS['sneaky'] = { check: () => '', run: () => ({ ok: true, ran: true }) };
  assert.equal((await api.sgRun({ type: 'sneaky' }, null, {})).code, 'UNKNOWN_ACTION', 'registered but not in SG_ACTION_TYPES');
});

test('safety: blocks are 15 min to 4 h inside one day, never in the past, never with guests; a stale or unconnected calendar refuses', async () => {
  const { api } = page();
  const no = async (args) => (await api.sgRun({ type: 'cal.block', args }, null, {})).code;
  assert.equal(await no(blockArgs({ date: '2026-10-04' })), 'REFUSED', 'yesterday');
  assert.equal(await no(blockArgs({ start: 600, end: 600 + 241 })), 'REFUSED', 'over 4 h');
  assert.equal(await no(blockArgs({ start: 600, end: 610 })), 'REFUSED', 'under 15 min');
  assert.equal(await no(blockArgs({ start: 23 * 60, end: 24 * 60 + 30 })), 'REFUSED', 'crosses midnight');
  assert.equal(await no(blockArgs({ guests: ['alex@example.com'] })), 'REFUSED', 'guests');
  assert.equal((await page({ stale: true }).api.sgRun({ type: 'cal.block', args: blockArgs() }, null, {})).message, 'Update the calendar first.');
  const p = page(); p.W.defaultCalendarId = () => null;
  assert.match((await p.api.sgRun({ type: 'cal.block', args: blockArgs() }, null, {})).message, /Connect Google Calendar/);
});

test('safety: only the dashboard\'s own events without guests move, resize or go; RSVP needs the second press', async () => {
  const { api, W } = page({ eventMeta: { own1: { origin: { kind: 'block' } }, guesty: { origin: { kind: 'block' } } } });
  const run = (type, args, o) => api.sgRun({ type, args }, null, o || {});
  for (const type of ['cal.move', 'cal.resize', 'cal.remove']) {
    assert.match((await run(type, { id: 'other', date: DAY, start: 600, end: 660 })).message, /Only blocks the dashboard made/, type);
    assert.match((await run(type, { id: 'guesty', date: DAY, start: 600, end: 660 })).message, /guests/, type);
  }
  assert.equal((await run('cal.move', { id: 'own1', date: DAY, start: 600, end: 660 })).ok, true);
  assert.deepEqual(W.calls.find(c => c[0] === 'move').slice(1, 2), ['own1']);
  assert.match((await run('cal.rsvp', { id: 'inv1', response: 'accepted' })).message, /Press again/);
  assert.equal(W.calls.filter(c => c[0] === 'rsvp').length, 0, 'nothing sent on the first press');
  assert.equal((await run('cal.rsvp', { id: 'inv1', response: 'accepted' }, { confirmed: true })).ok, true);
  assert.equal(W.calls.filter(c => c[0] === 'rsvp').length, 1);
});

test('ops: only the allowlist, task.update only for status; applied with a dry run first and an Undo token', async () => {
  const { api, posts } = page();
  const r1 = await api.sgRun({ type: 'ops', args: { ops: [{ op: 'task.bin', id: 't-report' }] } }, null, {});
  assert.equal(r1.code, 'REFUSED');
  const r2 = await api.sgRun({ type: 'ops', args: { ops: [{ op: 'task.update', id: 't-report', title: 'x' }] } }, null, {});
  assert.match(r2.message, /status/);
  assert.equal(posts.length, 0);
  const states = [];
  const r3 = await api.sgRun({ type: 'ops', args: { ops: [{ op: 'task.plan', id: 't-report', date: DAY }], line: 'Planned for Tuesday' } }, null, { onState: (s) => states.push(s.state) });
  assert.equal(r3.ok, true);
  assert.deepEqual(posts.map(p => [p.url, !!p.body.dryRun, p.body.client]), [['/api/actions', true, 'suggestions'], ['/api/actions', false, 'suggestions']]);
  assert.deepEqual(states, ['saving', 'saved']);
});

test('S1 primary: the event card in CREATE mode, prefilled (title, times, primary calendar, the task, who made it); nothing is written yet', async () => {
  const { api, opened, W, posts } = page();
  const card = { key: 'free:2026-10-06:1080', rule: 'free-slot' };
  const r = await api.sgRun({ type: 'cal.blockOpen', args: blockArgs() }, card, {});
  assert.equal(r.ok, true);
  assert.equal(opened.length, 1);
  const [kind, id, opt] = opened[0];
  assert.deepEqual([kind, id], ['event', null]);
  assert.deepEqual(plain(opt.create), {
    title: 'Focus: Report draft', start: `${DAY}T14:45`, end: `${DAY}T16:45`, calendarId: 'me@example.com',
    description: 'Focus block from your dashboard.\nTask: Report draft: section 2', relatedTaskId: 't-report', origin: { kind: 'block', rule: 'free-slot' }, suggestKey: card.key,
  });
  assert.equal(W.calls.length + posts.length, 0, 'the user adjusts, then Saves');
});

test('S1 prefilled Save: the event is marked as the dashboard\'s block, linked to the task, the task planned for that day; one Undo for all', async () => {
  const { api, posts, toasts, W } = page();
  const res = { ok: true, event: { id: 'g9', summary: 'Focus: Report draft', start: { dateTime: `${DAY}T15:00:00` }, end: { dateTime: `${DAY}T16:30:00` } } };
  await api.sgAfterEventCreate(res, { title: 'Focus: Report draft', link: { taskId: 't-report', origin: { kind: 'block', rule: 'free-slot' }, key: 'free:x' } });
  const applied = posts.find(p => p.url === '/api/actions' && !p.body.dryRun);
  assert.deepEqual(plain(applied.body.ops), [
    { op: 'event.annotate', eventId: 'g9', origin: { kind: 'block', rule: 'free-slot', taskId: 't-report' }, linkTasks: ['t-report'] },
    { op: 'task.plan', id: 't-report', date: DAY },
  ]);
  const t = toasts.at(-1);
  assert.equal(t.msg, 'Blocked 15:00–16:30 · Focus: Report draft');
  assert.equal(t.opt.action.label, 'Undo');
  await t.opt.action.run();
  await new Promise(r => setTimeout(r, 5));
  assert.deepEqual(plain(W.calls.find(c => c[0] === 'remove')), ['remove', 'g9', { quiet: true, silent: true }]);
  const tok = 'tok-' + (posts.indexOf(applied) + 1);
  assert.ok(posts.some(p => p.url === '/api/actions/undo' && p.body.token === tok), 'the link and the plan go back too (by their token)');
});

test('S1 ✓: books at once (no guests, silent: the card owns the Undo), the receipt goes saving -> saved, then ONE Undo removes the event and the link', async () => {
  const { api, W, posts } = page();
  const states = [];
  const card = { key: 'free:2026-10-06:1080', rule: 'free-slot' };
  const r = await api.sgRun({ type: 'cal.block', args: blockArgs() }, card, { onState: (s) => states.push(plain(Object.assign({}, s, { group: undefined, retry: undefined }))) });
  assert.equal(r.ok, true);
  const [, input, opt] = W.calls[0];
  assert.deepEqual(plain(input), { title: 'Focus: Report draft', start: `${DAY}T14:45`, end: `${DAY}T16:45`, description: 'Focus block from your dashboard.\nTask: Report draft: section 2', calendarId: 'me@example.com' });
  assert.deepEqual(plain(opt), { quiet: true, silent: true });
  assert.ok(!('guests' in input) && !('attendees' in input));
  assert.deepEqual(states.map(s => [s.state, s.sub]), [['saving', 'Saving to Google…'], ['saved', 'In Google Calendar']]);
  assert.equal(states[1].line, 'Blocked 14:45–16:45 · Focus: Report draft');
  assert.equal(states[1].eventId, 'g1');
  const ops = posts.find(p => p.url === '/api/actions' && !p.body.dryRun).body.ops;
  assert.deepEqual(plain(ops.map(o => o.op)), ['event.annotate', 'task.plan']);
  assert.ok(!JSON.stringify(ops).includes('task.create'), 'never a task');
  const u = await r.group.undo();
  assert.equal(u.ok, true);
  assert.deepEqual(plain(W.calls.filter(c => c[0] === 'remove').map(c => c[1])), ['g1']);
  assert.equal(posts.filter(p => p.url === '/api/actions/undo').length, 1);
  assert.deepEqual(plain(await r.group.undo()), { ok: true, already: true }, 'a second Undo does nothing');
});

test('S1 ✓ undone while Google is still saving: the remove queues behind the create and the link batch never runs', async () => {
  const { api, W, posts } = page({ hold: true });
  let group = null;
  const p = api.sgRun({ type: 'cal.block', args: blockArgs() }, { key: 'k', rule: 'free-slot' }, { onState: (s) => { if (s.group) group = s.group; } });
  await new Promise(r => setTimeout(r, 1));
  assert.ok(group, 'the receipt has its Undo at once');
  await group.undo();
  assert.deepEqual(plain(W.calls.filter(c => c[0] === 'remove').map(c => c[1])), ['tmp-1'], 'the temporary id: CalWrite queues it behind the create');
  W.release();
  const r = await p;
  assert.equal(r.undone, true);
  assert.equal(posts.length, 0, 'no annotate / plan');
});

test('S1 ✓ when Google refuses: the card comes back with the reason and nothing else changed; a failed link keeps the event', async () => {
  const a = page({ fail: true });
  const states = [];
  const r = await a.api.sgRun({ type: 'cal.block', args: blockArgs() }, { key: 'k', rule: 'free-slot' }, { onState: (s) => states.push(s.state) });
  assert.equal(r.ok, false);
  assert.deepEqual(states, ['saving', 'error']);
  assert.equal(a.posts.length, 0);
  const b = page({ opsFail: true });
  const st = [];
  const r2 = await b.api.sgRun({ type: 'cal.block', args: blockArgs() }, { key: 'k', rule: 'free-slot' }, { onState: (s) => st.push(s) });
  assert.equal(r2.ok, true, 'the event stays: that is what the user asked for');
  assert.equal(st.at(-1).state, 'warn');
  assert.match(st.at(-1).sub, /Couldn’t link it to the task/);
  assert.equal(typeof st.at(-1).retry, 'function');
});

test('the page code never reaches Google or Gmail around CalWrite / GmailDraft, and never sends', () => {
  for (const f of readdirSync(APP).filter(n => /^68-suggest-/.test(n) || n === '12-home-w-suggest.js')) {
    const src = readFileSync(join(APP, f), 'utf8');
    assert.ok(!/noDialogs|sendUpdates/.test(src), `${f}: CalWrite's internal options`);
    assert.ok(!/\/api\/calendar\/events|\/api\/gmail\//.test(src), `${f}: write routes called directly`);
    assert.ok(!/send_message|\.send\(|forward\(/.test(src), `${f}: anything that sends`);
    assert.ok(!/\son[a-z]+\s*=\s*["']/.test(src), `${f}: inline handler strings`);
  }
});

test('the morning story takes the engine\'s ideas first (at most two), and its free-time card replaces the server\'s; "suggest" runs the card\'s button', () => {
  const src = readFileSync(join(APP, '79-story-morning-logic.js'), 'utf8');
  const smIdeas = new Function(`"use strict";\n${src}\nreturn smIdeas;`)();
  const eng = (key, text) => ({ kind: 'suggest', label: 'Time and calendar', text, say: text, detail: '1 fact', scene: 'writing', act: { label: 'Block 14:45–16:45', icon: 'calendar-plus', do: 'suggest', key } });
  const d = { date: '2026-10-05', gaps: [{ start: '14:00', end: '16:00', minutes: 120 }], focus: [], people: [], events: [],
    suggestions: [{ kind: 'gap', text: 'Two free hours.', refs: [] }, { kind: 'overdue', text: 'One thing slipped.', refs: [] }] };
  const out = smIdeas(Object.assign({}, d, { engineIdeas: [eng('free:2026-10-05:1080', 'Free 14:45–18:00. Block 2 h?'), eng('x:1', 'Two'), eng('x:2', 'Three')] }));
  assert.deepEqual(out.map(x => x.kind), ['suggest', 'suggest', 'overdue'], 'two engine ideas, then the server\'s (its gap idea dropped)');
  assert.equal(out[0].act.do, 'suggest');
  assert.deepEqual(smIdeas(d).map(x => x.kind), ['gap', 'overdue'], 'without the engine: as before');
  const ui = readFileSync(join(APP, '79-story-morning.js'), 'utf8');
  assert.match(ui, /a\.do === 'suggest'[^\n]*sgRunKey\(a\.key\)/);
  assert.match(ui, /engineIdeas: sgStoryIdeas\('morning'\)/);
});

/* ───────── the server: event.annotate origin ───────── */
test('event.annotate origin: kept (also with nothing else), cleared with null, a $ref task works, bad kinds refused, undo puts it back', async () => {
  const d = makeDataDir();
  try {
    const a = createActions({ dataDir: d });
    const run = (ops) => a.apply({ ops, source: 'ui', client: 'suggestions' });
    const disk = () => JSON.parse(readFileSync(join(d, 'state', 'dashboard-state.json'), 'utf8'));
    const r = await run([{ op: 'event.annotate', eventId: 'g1_abc', origin: { kind: 'block', rule: 'free-slot', taskId: 'u-2-bbb' }, linkTasks: ['u-2-bbb'] }, { op: 'task.plan', id: 'u-2-bbb', date: TODAY }]);
    assert.deepEqual(disk().eventMeta.g1_abc, { origin: { kind: 'block', rule: 'free-slot', taskId: 'u-2-bbb' }, tasks: ['u-2-bbb'] });
    assert.equal(disk().custom.find(t => t.id === 'u-2-bbb').plannedFor, TODAY);
    await a.undo(r.undo, { source: 'ui' });
    assert.equal((disk().eventMeta || {}).g1_abc, undefined, 'undo takes the origin and the link away');
    assert.equal(disk().custom.find(t => t.id === 'u-2-bbb').plannedFor, undefined, '... and restores the plan');
    await run([{ op: 'event.annotate', eventId: 'g1_abc', origin: { kind: 'block', rule: 'free-slot', taskId: 'u-2-bbb' }, linkTasks: ['u-2-bbb'] }]);
    // Unlinking the task leaves the origin: the meta stays (tidyMeta keeps it).
    await run([{ op: 'event.annotate', eventId: 'g1_abc', unlinkTasks: ['u-2-bbb'] }]);
    assert.deepEqual(disk().eventMeta.g1_abc, { origin: { kind: 'block', rule: 'free-slot', taskId: 'u-2-bbb' } });
    await run([{ op: 'event.annotate', eventId: 'g1_abc', origin: null }]);
    assert.equal((disk().eventMeta || {}).g1_abc, undefined, 'nothing left: the entry goes');
    await run([{ op: 'task.create', title: 'Prep for the call', ref: 'p' }, { op: 'event.annotate', eventId: 'g2', origin: { kind: 'prep', taskId: '$p' }, linkTasks: ['$p'] }]);
    const m2 = disk().eventMeta.g2;
    assert.equal(m2.origin.kind, 'prep');
    assert.equal(m2.origin.taskId, m2.tasks[0], 'the $ref became the new id');
    await assert.rejects(run([{ op: 'event.annotate', eventId: 'g3', origin: { kind: 'meeting' } }]), /kind|allowed/);
    await assert.rejects(run([{ op: 'event.annotate', eventId: 'g3', origin: { kind: 'block', extra: 1 } }]));
  } finally { rmSync(d, { recursive: true, force: true }); }
});
