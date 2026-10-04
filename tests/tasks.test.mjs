// Tasks area: the task model, view predicates, sorting, Today maths, quick-add
// defaults, search, safe markdown and drag ids (src/app/20, 21, 22, 30, 32, 60,
// loaded into a VM with small stubs), plus the server ops the area adds
// (server/actions/ops-tasks.mjs) and the shared recurrence rule.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createActions } from '../server/actions/index.mjs';
import { advanceByRecurrence } from '../server/actions/model.mjs';
import { makeDataDir, sampleState, TODAY as SRV_TODAY, addDays as srvAddDays } from './fixtures/actions-state.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');

// ─── the page code in a VM ────────────────────────────────────────────────
function makeBox() {
  const calls = { saveData: 0, render: 0, toasts: [] };
  const box = {
    console, CSS: { escape: (s) => String(s) },
    APP_CONFIG: { locale: 'en-GB', weekStart: 'Mon' },
    STREAMS: { work: { label: 'Work', color: '#4f46e5', order: 0 }, home: { label: 'Home & admin', color: '#0891b2', order: 1 } },
    PRIORITIES: { p1: { label: 'High' }, p2: { label: 'Medium' }, p3: { label: 'Low' }, p0: { label: 'None' } },
    defaultStreamId: () => 'work',
    esc: (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    escAttr: (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    safeUrl: (u) => (/^(https?:|mailto:)/i.test(String(u)) ? String(u) : ''),
    safeColor: (c, d) => c || d || '',
    icon: (n) => `<svg data-i="${n}"></svg>`,
    getPerson: (id) => (box.state.people || []).find(p => p.id === id) || null,
    effPeople: (item) => item.people || [],
    avatarInitials: (n) => String(n).slice(0, 2).toUpperCase(),
    saveData: () => { calls.saveData++; }, saveUI: () => {}, render: () => { calls.render++; }, renderMain: () => {},
    toast: (msg) => { calls.toasts.push(msg); }, undo: () => {}, selectTask: () => {}, setView: () => {},
    multiSelect: { ids: new Set() },
    recurrenceLabel: undefined,
    document: { addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] },
    window: { addEventListener: () => {} },
    localStorage: { setItem: () => {} },
    STORAGE_KEY: 'x',
  };
  box.state = freshState();
  vm.createContext(box);
  vm.runInContext(src('08-utils-dates.js') + '\n;globalThis.fmtDate = fmtDate; globalThis.todayStr = todayStr; globalThis.daysUntil = daysUntil; globalThis.tomorrowStr = tomorrowStr;', box, { filename: '08-utils-dates.js' });
  for (const f of ['20-task-model.js', '21-task-query.js', '22-quick-add.js', '30-task-row.js', '32-tasks-ui.js', '60-task-detail.js']) {
    vm.runInContext(src(f), box, { filename: f });
  }
  // `let`/`const` at the top level of a script are not globals: expose the few the tests read.
  vm.runInContext('globalThis.__q = { _lastRenderedTaskIds: typeof _lastRenderedTaskIds !== "undefined" ? _lastRenderedTaskIds : null }', box);
  return { box, calls };
}
function freshState() {
  return {
    view: 'today', custom: [], statuses: {}, notes: {}, pinned: {}, deleted: {}, bin: { tasks: [], notes: [] },
    completionLog: {}, taskActivity: {}, customOrder: {}, taskViewPrefs: {}, people: [{ id: 'sam', name: 'Sam Rivera', aliases: [] }],
  };
}
const iso = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const T = (id, extra = {}) => ({ id, title: 'Task ' + id, dueDate: null, priority: 'p0', tags: [], stream: 'work', detail: '', subtasks: [], recurrence: 'none', people: [], ...extra });
const plain = (x) => JSON.parse(JSON.stringify(x));

let B, C;
beforeEach(() => { ({ box: B, calls: C } = makeBox()); });

test('recurrence: rolls past today, clamps month ends, resets subtasks, logs the occurrence', () => {
  assert.equal(B.nextOccurrence(iso(-9), 'daily', iso(0)), iso(1), 'a daily task 9 days late moves to tomorrow');
  assert.equal(B.nextOccurrence('2027-01-31', 'monthly', '2027-01-31', 31), '2027-02-28');
  assert.equal(B.nextOccurrence('2027-02-28', 'monthly', '2027-02-28', 31), '2027-03-31', 'the anchor day comes back after February');
  assert.equal(B.nextOccurrence('2026-10-02', 'weekdays', '2026-10-02'), '2026-10-05', 'Friday -> Monday');
  B.state.custom.push(T('u-1', { dueDate: iso(-3), recurrence: 'weekly', plannedFor: iso(0), subtasks: [{ id: 's1', title: 'a', done: true }, { id: 's2', title: 'b', done: false }] }));
  const r = B.setStatus('u-1', 'done');
  const t = B.state.custom[0];
  assert.equal(r.rolledTo, iso(4));
  assert.equal(t.dueDate, iso(4));
  assert.equal(B.state.statuses['u-1'], 'todo');
  assert.ok(t.subtasks.every(s => !s.done), 'subtasks reset');
  assert.equal(t.plannedFor, undefined, 'plan cleared');
  assert.equal(B.state.completionLog['u-1'].length, 1);
  assert.equal(B.state.taskActivity['u-1'].at(-1).type, 'occurrence');
});

test("won't do: closed but never a completion; reopen and complete work after it", () => {
  B.state.custom.push(T('u-2'));
  B.markWontDo('u-2');
  const t = B.state.custom[0];
  assert.equal(B.statusOf('u-2'), 'done');
  assert.equal(B.isWontDo(t), true);
  assert.equal((B.state.completionLog['u-2'] || []).length, 0);
  assert.equal(B.matchesView(t, 'today'), false);
  B.setStatus('u-2', 'todo');
  assert.equal(B.isWontDo(t), false);
  B.toggleDone('u-2');
  assert.equal(B.isWontDo(t), false);
  assert.equal(B.state.completionLog['u-2'].length, 1);
  // Completed, then changed to won't do: the completion is taken back.
  B.markWontDo('u-2');
  assert.equal(B.state.completionLog['u-2'].length, 0);
  // A repeating task is skipped, not closed.
  B.state.custom.push(T('u-3', { dueDate: iso(0), recurrence: 'daily' }));
  B.markWontDo('u-3');
  assert.equal(B.statusOf('u-3'), 'todo');
  assert.equal(B.state.custom[1].dueDate, iso(1));
  assert.equal((B.state.completionLog['u-3'] || []).length, 0);
});

test('one click = done (with Undo toast); "doing" is separate', () => {
  B.state.custom.push(T('u-4'));
  B.toggleDone('u-4');
  assert.equal(B.statusOf('u-4'), 'done');
  assert.match(C.toasts.at(-1), /completed/i);
  B.toggleDone('u-4');
  assert.equal(B.statusOf('u-4'), 'todo');
  B.toggleDoing('u-4');
  assert.equal(B.statusOf('u-4'), 'doing');
  B.cycleStatus('u-4');
  assert.equal(B.statusOf('u-4'), 'done', 'the old cycle entry point completes in one go');
});

test('Today = due/overdue, planned for today (or earlier), or in progress; tomorrow/day views see plans', () => {
  B.state.custom.push(
    T('a', { dueDate: iso(0) }), T('b', { dueDate: iso(-2) }), T('c', { dueDate: iso(5), plannedFor: iso(0) }),
    T('d', { plannedFor: iso(-1) }), T('e'), T('f', { dueDate: iso(3) }), T('g', { plannedFor: iso(1) }),
  );
  B.state.statuses.e = 'doing';
  const ids = (v) => B.state.custom.filter(i => B.matchesView(i, v)).map(i => i.id).sort().join('');
  assert.equal(ids('today'), 'abcde');
  assert.equal(ids('tomorrow'), 'g');
  assert.equal(ids('day:' + iso(1)), 'g');
  assert.equal(ids('no-date'), 'deg');
  assert.equal(B.taskViewCount('today'), 5);
});

test("Today's progress: done today out of today's plate (not every past task)", () => {
  B.state.custom.push(T('a', { dueDate: iso(0) }), T('b', { dueDate: iso(-30) }), T('c', { dueDate: iso(-40) }), T('d', { dueDate: iso(0) }), T('r', { dueDate: iso(0), recurrence: 'daily' }));
  B.state.statuses.c = 'done'; B.state.completionLog.c = [Date.now() - 20 * 86400000];   // done long ago: not counted
  B.toggleDone('d');   // done today
  B.toggleDone('r');   // repeating, done today: rolled forward but still counts
  const p = B.todayProgress();
  assert.equal(p.done, 2);
  assert.equal(p.open, 2);
  assert.equal(p.total, 4);
  assert.equal(p.overdue, 1);
});

test('sort: per view, date then time then priority by default; manual only after a drag', () => {
  B.state.custom.push(T('x', { dueDate: iso(2), priority: 'p3' }), T('y', { dueDate: iso(1), priority: 'p3' }), T('z', { dueDate: iso(1), priority: 'p1' }), T('w'), T('v', { dueDate: iso(1), priority: 'p1', dueTime: '09:00' }));
  assert.equal(B.sortForView('week'), 'date');
  assert.equal(B.sortItems(B.state.custom, 'date', 'week').map(i => i.id).join(''), 'vzyxw');
  B.state.custom.find(i => i.id === 'x').priority = 'p1';
  assert.equal(B.sortItems(B.state.custom, 'priority', 'week').map(i => i.id).join(''), 'vzxyw', 'priority first, then date');
  B.state.custom.find(i => i.id === 'x').priority = 'p3';
  // A drag switches only that view to manual, seeded from what is on screen.
  vm.runInContext('_lastRenderedTaskIds = ["v","z","y","x","w"]', B);
  B.state.view = 'week';
  B.reorderTask('w', 'v', false);
  assert.equal(B.sortForView('week'), 'manual');
  assert.equal(B.sortForView('all'), 'date', 'other views keep their own sort');
  assert.equal(B.sortItems(B.state.custom, 'manual', 'week').map(i => i.id).join(''), 'wvzyx');
});

test('quick add: every view gives defaults that keep the new task visible there', () => {
  B.state.people.push({ id: 'alex', name: 'Alex Kim' });
  for (const view of ['today', 'week', 'tomorrow', 'day:' + iso(4), 'stream:home', 'tag:email', 'person:alex', 'all', 'no-date']) {
    B.state.view = view;
    const id = B.addTaskFromText('Write the summary', B.quickAddDefaults(view));
    const it = B.getItem(id);
    assert.ok(it, view);
    assert.equal(B.matchesView(it, view), true, `${view}: the new task must stay in the view`);
    assert.ok(it.createdAt > 0);
    assert.equal(B.state.taskActivity[id][0].type, 'created');
  }
  // Parsed parts win over the view's defaults.
  B.state.view = 'today';
  const id = B.addTaskFromText('Call Sam tomorrow 3pm !p1 ~45m @alex', B.quickAddDefaults('today'));
  const it = B.getItem(id);
  assert.equal(it.title, 'Call Sam');
  assert.equal(it.dueDate, iso(1));
  assert.equal(it.dueTime, '15:00');
  assert.equal(it.priority, 'p1');
  assert.equal(it.estimate, 45);
  assert.deepEqual(plain(it.people), ['alex']);
  // @NewName creates the person.
  const id2 = B.addTaskFromText('Lunch with @jordan');
  assert.ok(B.state.people.some(p => p.name === 'Jordan'));
  assert.equal(B.getItem(id2).people.length, 1);
});

test('search: across all fields and views, with operators', () => {
  B.state.custom.push(
    T('a', { title: 'Draft pricing page', tags: ['writing'], dueDate: iso(0), priority: 'p1' }),
    T('b', { title: 'Call the bank', detail: 'about the Huntington account', stream: 'home' }),
    T('c', { title: 'Plan offsite', subtasks: [{ id: 's', title: 'Book the Huntington venue', done: false }], people: ['sam'] }),
    T('d', { title: 'Old thing about Huntington' }),
  );
  B.state.statuses.d = 'done';
  B.state.notes.a = [{ id: 'n', ts: 1, text: 'ask Sam' }];
  const hits = (q) => B.state.custom.filter(i => B.matchesSearch(i, q)).map(i => i.id).join('');
  assert.equal(hits('huntington'), 'bcd', 'detail, subtask and done tasks are searched');
  assert.equal(hits('huntington is:open'), 'bc');
  assert.equal(hits('#writing'), 'a');
  assert.equal(hits('@sam'), 'c', 'people by name');
  assert.equal(hits('p1 due:today'), 'a');
  assert.equal(hits('stream:home'), 'b');
  assert.equal(hits('huntington -venue'), 'bd');
  assert.equal(hits('ask sam'), 'a', 'notes are searched');
});

test('drag ids: junk, text drops and unknown ids are refused', () => {
  B.state.custom.push(T('u-9'));
  const ev = (data) => ({ dataTransfer: { getData: (k) => data[k] || '', types: Object.keys(data) } });
  assert.equal(B.draggedTaskId(ev({ 'application/x-dashboard-task': 'u-9' })), 'u-9');
  assert.equal(B.draggedTaskId(ev({ 'text/plain': 'u-9' })), 'u-9');
  assert.equal(B.draggedTaskId(ev({ 'text/plain': 'some dragged text' })), null);
  assert.equal(B.draggedTaskId(ev({ 'text/plain': 'u-unknown' })), null);
  assert.equal(B.draggedTaskId(ev({})), null);
  assert.equal(B.draggedTaskId({}), null);
});

test('markdown: escaped first; only http(s)/mailto links; lists, task lists, code', () => {
  const h = B.renderMarkdown('**Bold** and <img src=x onerror=alert(1)>\n- one\n- [x] done\n[ok](https://example.com) [bad](javascript:alert(1))\n`<b>`');
  assert.ok(!/<img/i.test(h), 'raw HTML is escaped');
  assert.ok(h.includes('&lt;img'), 'shown as text');
  assert.ok(h.includes('<strong>Bold</strong>'));
  assert.ok(h.includes('<a href="https://example.com"'));
  assert.ok(!/href="javascript/i.test(h));
  assert.ok(h.includes('<ul class="md-tasks">') || h.includes('class="done"'));
  assert.ok(h.includes('<code>&lt;b&gt;</code>'));
  assert.ok(!/onerror=/.test(h.replace(/&lt;img[^]*?&gt;/, '')), 'no live attribute');
});

test('history entries read as sentences (reschedule, update, created, occurrence)', () => {
  assert.match(B.describeActivity({ type: 'reschedule', from: '2026-10-01', to: '2026-10-05', reason: 'waiting' }).text, /^Due .+ → .+/);
  assert.equal(B.describeActivity({ type: 'reschedule', from: null, to: '2026-10-05' }).text.startsWith('Due none'), true);
  assert.match(B.describeActivity({ type: 'update', fields: ['detail'] }).text, /Edited detail/);
  assert.equal(B.describeActivity({ type: 'created' }).text, 'Created');
  assert.match(B.describeActivity({ type: 'occurrence', from: '2026-10-01', to: '2026-10-08' }).text, /Completed · next/);
  assert.match(B.describeActivity({ type: 'status', from: 'todo', to: 'wontdo' }).text, /won't do/);
  assert.equal(typeof B.describeActivity({ type: 'something-new' }).text, 'string');
});

test('subtasks: add at index, move, promote to a task', () => {
  B.state.custom.push(T('p', { dueDate: iso(2), tags: ['x'], people: ['sam'], subtasks: [{ id: 's1', title: 'one', done: false }, { id: 's2', title: 'two', done: true }] }));
  B.addSubtask('p', 'zero', 0);
  assert.deepEqual(B.getSubtasks('p').map(s => s.title), ['zero', 'one', 'two']);
  B.moveSubtask('p', 's2', 0);
  assert.deepEqual(B.getSubtasks('p').map(s => s.title), ['two', 'zero', 'one']);
  const nid = B.promoteSubtask('p', 's2');
  const n = B.getItem(nid);
  assert.equal(n.title, 'two');
  assert.equal(n.dueDate, iso(2));
  assert.deepEqual(plain(n.people), ['sam']);
  assert.equal(B.statusOf(nid), 'done', 'a done subtask becomes a done task');
  assert.deepEqual(B.getSubtasks('p').map(s => s.title), ['zero', 'one']);
});

test('bulk changes are one save (one undo step)', () => {
  B.state.custom.push(T('a'), T('b'), T('c'));
  const before = C.saveData;
  B.batchTasks(['a', 'b', 'c', 'missing'], id => { B.getItem(id).priority = 'p2'; });
  assert.equal(C.saveData - before, 1);
  assert.ok(B.state.custom.every(t => t.priority === 'p2'));
});

// ─── server: ops-tasks.mjs + the shared recurrence rule ────────────────────
test('server recurrence matches the page: past today, month anchor', () => {
  assert.equal(advanceByRecurrence('2026-09-01', 'daily', '2026-10-02'), '2026-10-03');
  assert.equal(advanceByRecurrence('2027-01-31', 'monthly', '2027-01-31', 31), '2027-02-28');
  assert.equal(advanceByRecurrence('2027-02-28', 'monthly', '2027-02-28', 31), '2027-03-31');
  assert.equal(advanceByRecurrence(null, 'weekly', '2026-10-02'), '2026-10-09');
  assert.equal(advanceByRecurrence('2026-10-02', 'none', '2026-10-02'), '2026-10-02');
});

let dir, A;
const srv = { setup() { dir = makeDataDir(stateWithExtras()); A = createActions({ dataDir: dir }); }, done() { rmSync(dir, { recursive: true, force: true }); } };
function stateWithExtras() {
  const s = sampleState();
  s.custom.find(t => t.id === 'u-4-ddd').dueDate = srvAddDays(SRV_TODAY, -10);   // weekly, 10 days late
  s.custom.find(t => t.id === 'u-4-ddd').subtasks = [{ id: 'st-w', title: 'inbox zero', done: true, ts: 1 }];
  s.custom.find(t => t.id === 'u-2-bbb').subtasks = [{ id: 'st-a', title: 'A', done: false }, { id: 'st-b', title: 'B', done: true }, { id: 'st-c', title: 'C', done: false }];
  return s;
}
const disk = () => JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
const run = (ops, extra = {}) => A.apply({ ops, source: 'mcp', client: 'test', ...extra });

test('server: complete_task on a late repeating task lands after today and resets subtasks', async () => {
  srv.setup();
  try {
    await run([{ op: 'task.complete', id: 'u-4-ddd' }]);
    const t = disk().custom.find(x => x.id === 'u-4-ddd');
    assert.ok(t.dueDate > SRV_TODAY, `next due ${t.dueDate} is after today`);
    assert.equal(t.dueDate, srvAddDays(SRV_TODAY, 4));
    assert.equal(t.subtasks[0].done, false);
    assert.equal(disk().statuses['u-4-ddd'], 'todo');
  } finally { srv.done(); }
});

test('server: plan_task puts a task on Today (list_tasks view today), null removes it', async () => {
  srv.setup();
  try {
    let r = await A.query('tasks.list', { view: 'today' });
    assert.ok(!r.tasks.some(t => t.id === 'u-5-eee'));
    await run([{ op: 'task.plan', id: 'u-5-eee', date: SRV_TODAY }]);
    r = await A.query('tasks.list', { view: 'today' });
    const hit = r.tasks.find(t => t.id === 'u-5-eee');
    assert.ok(hit, 'planned task is in Today');
    assert.equal(hit.plannedFor, SRV_TODAY);
    assert.equal(disk().taskActivity['u-5-eee'].at(-1).type, 'plan');
    await run([{ op: 'task.plan', id: 'u-5-eee', date: null }]);
    assert.equal(disk().custom.find(x => x.id === 'u-5-eee').plannedFor, undefined);
    await assert.rejects(run([{ op: 'task.plan', id: 'u-5-eee', date: 'next friday' }]));
  } finally { srv.done(); }
});

test("server: wont_do_task closes without a completion; on a repeating task it skips one", async () => {
  srv.setup();
  try {
    await run([{ op: 'task.wont_do', id: 'u-3-ccc', reason: 'not needed' }]);
    let s = disk();
    const t = s.custom.find(x => x.id === 'u-3-ccc');
    assert.equal(s.statuses['u-3-ccc'], 'done');
    assert.equal(t.resolution, 'wontdo');
    assert.equal((s.completionLog['u-3-ccc'] || []).length, 0);
    const r = await A.query('tasks.list', { view: 'completed' });
    assert.equal(r.tasks.find(x => x.id === 'u-3-ccc').resolution, 'wontdo');
    await run([{ op: 'task.wont_do', id: 'u-4-ddd' }]);
    s = disk();
    assert.equal(s.statuses['u-4-ddd'] || 'todo', 'todo');
    assert.ok(s.custom.find(x => x.id === 'u-4-ddd').dueDate > SRV_TODAY);
    assert.equal(s.taskActivity['u-4-ddd'].at(-1).skipped, true);
    // reopen undoes won't do
    await run([{ op: 'task.reopen', id: 'u-3-ccc' }]);
    assert.equal(disk().statuses['u-3-ccc'], 'todo');
  } finally { srv.done(); }
});

test('server: reorder_subtasks, promote_subtask and set_task_estimate (with undo)', async () => {
  srv.setup();
  try {
    await run([{ op: 'task.reorder_subtasks', id: 'u-2-bbb', subtaskIds: ['st-c', 'A'] }]);
    assert.deepEqual(disk().custom.find(x => x.id === 'u-2-bbb').subtasks.map(x => x.id), ['st-c', 'st-a', 'st-b']);
    const res = await run([{ op: 'task.promote_subtask', id: 'u-2-bbb', subtaskId: 'st-b', ref: 'nb' }, { op: 'task.set_estimate', id: '$nb', minutes: 30 }]);
    const s = disk();
    const nt = s.custom.find(x => x.title === 'B');
    assert.ok(nt && nt.id.startsWith('u-'));
    assert.equal(nt.estimate, 30);
    assert.equal(s.statuses[nt.id], 'done');
    assert.equal(nt.stream, 'work');
    assert.ok(!s.custom.find(x => x.id === 'u-2-bbb').subtasks.some(x => x.id === 'st-b'));
    await A.undo(res.undo, { source: 'mcp' });
    assert.ok(!disk().custom.some(x => x.title === 'B' && x.id === nt.id), 'undo removes the promoted task');
    await assert.rejects(run([{ op: 'task.reorder_subtasks', id: 'u-2-bbb', subtaskIds: ['nope'] }]), (e) => e.code === 'NOT_FOUND');
  } finally { srv.done(); }
});

// ─── migration 045-tasks-fields ────────────────────────────────────────────
test('migration 045: backfills createdAt, subtask ids and resets the old global manual sort; idempotent', async () => {
  const { upgradeTasks } = await import('../tools/migrations/045-tasks-fields.mjs');
  const st = {
    sortBy: 'manual', viewMode: 'calendar',
    custom: [
      { id: 'seed-a', title: 'a', subtasks: [{ title: 'x' }, { id: 'd', title: 'y' }, { id: 'd', title: 'z' }, { text: 'old' }] },
      { id: 'u-1700000000000-abc', title: 'b' },
      { id: 'seed-c', title: 'c' },
      { id: 'seed-d', title: 'd', createdAt: 5 },
    ],
    // seed-c's only history is a re-tag written by migration 040: that is when
    // the migration ran, not when the task was made, so it must be ignored.
    taskActivity: { 'seed-a': [{ type: 'date', ts: 300 }, { type: 'created', ts: 200 }], 'seed-c': [{ type: 'tags', ts: 9e12, source: 'script', client: '040-tags' }] },
    notes: {},
  };
  const r = upgradeTasks(st);
  assert.equal(st.custom[0].createdAt, 200);
  assert.equal(st.custom[1].createdAt, 1700000000000);
  assert.equal(st.custom[2].createdAt, undefined);
  assert.equal(st.custom[3].createdAt, 5);
  const ids = st.custom[0].subtasks.map(x => x.id);
  assert.equal(new Set(ids).size, 4, 'every subtask has a unique id');
  assert.equal(st.custom[0].subtasks[3].title, 'old');
  assert.equal(st.sortBy, 'date');
  assert.equal(st.viewMode, 'list');
  assert.equal(r.createdMissing, 1);
  const again = JSON.stringify(st);
  upgradeTasks(st);
  assert.equal(JSON.stringify(st), again, 'a second run changes nothing');
});
