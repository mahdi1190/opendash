// Home and the top bar: the shared rules (lib/home-topbar.mjs), the page's own
// copies of them (src/app/10-header.js, 12-home.js, loaded into a VM) agreeing
// with the server, the actions (ops-home.mjs / queries-home.mjs) and
// migration 020-countdowns. Synthetic data only.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, rmSync, mkdtempSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  normalizeWidget, widgetList, storedWidget, upgradeCountdowns, setHeadline, focusTasks, focusConfig, normColor, SWATCHES, EMOJI_ICONS,
} from '../lib/home-topbar.mjs';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir, TODAY, addDays } from './fixtures/actions-state.mjs';
import { applyMigration } from '../tools/migrations/_lib.mjs';
import * as m020 from '../tools/migrations/020-countdowns.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(ROOT, 'src', 'app', f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));

/* ───────────── the page's code in a VM, with the few helpers it needs ───────────── */
function pageBox(state, today) {
  const box = {
    state, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {} }, console,
    window: { addEventListener() {} }, CSS: { escape: (s) => s },
    todayStr: () => today,
    daysUntil: (iso) => { if (!iso) return null; const u = (s) => Date.UTC(...s.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0))); return Math.round((u(iso) - u(today)) / 86400000); },
    dueLabel: (iso) => iso, fmtDate: (d) => d.toISOString().slice(0, 10), userName: () => 'Sam',
    statusOf: (id) => state.statuses[id] || 'todo', isPinned: (id) => !!state.pinned[id],
    effDate: (i) => i.dueDate || null, effStream: (i) => i.stream, effPriority: (i) => i.priority ?? 'p0', effTitle: (i) => i.title, effTags: (i) => i.tags ?? [],
    getAllItems: () => state.custom.filter(i => !state.deleted[i.id]),
    registerSection() {}, saveData() {}, render() {}, toast() {},
  };
  vm.createContext(box);
  vm.runInContext(src('10-header.js'), box, { filename: '10-header.js' });
  vm.runInContext(src('12-home.js'), box, { filename: '12-home.js' });
  return box;
}

const T = (id, extra = {}) => ({ id, title: 'Task ' + id, stream: 'work', priority: 'p0', tags: [], subtasks: [], ...extra });
function focusState(today) {
  return {
    custom: [
      T('a', { dueDate: addDays(today, -3) }),                 // overdue
      T('b', { dueDate: today, priority: 'p2' }),              // today
      T('c', { priority: 'p1' }),                              // high priority
      T('d', { dueDate: addDays(today, 2) }),                  // due soon
      T('e', { dueDate: addDays(today, 9) }),                  // not focus
      T('f', { stream: 'home', priority: 'p1' }),              // other stream
      T('g', { plannedFor: today }),                           // planned
      T('h', { priority: 'p1', startDate: addDays(today, 4) }),// not started yet
      T('i', { dueDate: addDays(today, -1) }),                 // done
      T('j', { priority: 'p1' }),                              // binned
      T('k'),                                                  // pinned
      T('l'),                                                  // in progress
    ],
    statuses: { i: 'done', l: 'doing' }, pinned: { k: true }, deleted: { j: true },
  };
}

test('widgets: defaults, the legacy headline rule and what is stored', () => {
  const legacy = [{ id: 'x', label: 'Submit', date: '2030-01-10' }, { id: 'y', label: 'Trip', date: '2030-02-01', color: 'teal' }];
  const list = widgetList(legacy);
  assert.equal(list[0].headline, true);
  assert.equal(list[0].style, 'tinted');
  assert.equal(list[0].color, 'indigo');
  assert.equal(list[0].icon, 'hourglass');
  assert.equal(list[0].warnDays, 14);
  assert.equal(list[1].headline, false);
  assert.equal(list[1].style, 'subtle');
  assert.equal(list[1].color, 'teal');
  // An explicit headline wins and moves first; only one survives.
  const l2 = widgetList([{ id: 'a', date: '2030-01-01', headline: false }, { id: 'b', date: '2030-01-02', headline: true }, { id: 'c', date: '2030-01-03', headline: true }]);
  assert.deepEqual(l2.map(w => [w.id, w.headline]), [['b', true], ['a', false], ['c', false]]);
  // Stored form drops what the type does not use.
  const clock = storedWidget(normalizeWidget({ id: 'k', type: 'clock', date: '2030-01-01' }));
  assert.equal(clock.date, undefined); assert.equal(clock.unit, undefined); assert.equal(clock.clock, 'both'); assert.equal(clock.tasks, undefined);
  assert.equal(normalizeWidget({ type: 'nonsense', unit: 'wd', color: 'url(x)' }).type, 'countdown');
  assert.equal(normalizeWidget({ unit: 'wd' }).unit, 'workdays');
  assert.notEqual(normalizeWidget({ color: 'url(x)' }).color, 'url(x)');
  assert.equal(normColor('Purple', null), 'violet');
  assert.equal(normColor('#12AbEf', null), '#12abef');
  assert.equal(normColor('expression(x)', null), null);
});

test('the page and the server normalise widgets the same way', () => {
  const box = pageBox({ custom: [], statuses: {}, pinned: {}, deleted: {} }, TODAY);
  const lists = [
    [{ id: 'x', label: 'Submit', date: '2030-01-10' }, { id: 'y', label: 'Trip', date: '2030-02-01', icon: '✈️', color: 'teal', unit: 'w' }],
    [{ id: 'a', type: 'progress', date: '2030-05-01', start: '2030-01-01', headline: false }, { id: 'b', type: 'tasks', tasks: 'week', headline: true, style: 'solid' }, { id: 'c', type: 'clock', clock: 'time', visible: false }],
    [{ id: 'z', type: 'countup', date: '2020-01-01', warnDays: '5', hideWhenPast: 1, time: '25:00' }, { id: 'e', type: 'event', color: '#ff0000' }],
  ];
  for (const l of lists) assert.deepEqual(plain(box.tbList(plain(l))), plain(widgetList(l)));
});

test('upgradeCountdowns keeps what the bar shows and is idempotent', () => {
  const old = [
    { id: 'cd-1', label: 'Submission', date: '2030-03-01', icon: '🎓', color: 'purple' },
    { label: 'Holiday', date: '2030-06-01', icon: '🦄', color: '#2563eb' },
  ];
  const r = upgradeCountdowns(old);
  assert.equal(r.changed, true);
  assert.equal(r.upgraded, 2);
  const [a, b] = r.list;
  assert.equal(a.headline, true); assert.equal(a.style, 'tinted');
  assert.equal(a.icon, 'graduation-cap'); assert.equal(a.color, 'violet');
  assert.equal(a.label, 'Submission'); assert.equal(a.date, '2030-03-01');
  assert.equal(b.headline, false); assert.equal(b.icon, '🦄', 'unknown emoji kept'); assert.equal(b.color, '#2563eb');
  assert.ok(b.id, 'an id is added when missing');
  const again = upgradeCountdowns(r.list);
  assert.equal(again.changed, false);
  assert.deepEqual(again.list, r.list);
  assert.deepEqual(upgradeCountdowns(undefined), { list: [], changed: false, upgraded: 0 });
  // Every mapped emoji names a real icon in the sprite.
  const sprite = readFileSync(join(ROOT, 'vendor', 'icons', 'lucide-sprite.svg'), 'utf8');
  for (const name of new Set(Object.values(EMOJI_ICONS))) assert.ok(sprite.includes(`id="i-${name}"`), name);
  // setHeadline demotes the old one and moves the new one first.
  const l = setHeadline(r.list.map(x => ({ ...x })), b.id);
  assert.equal(l[0].id, b.id); assert.equal(l[0].headline, true); assert.equal(l[0].style, 'tinted');
  assert.equal(l[1].headline, false); assert.equal(l[1].style, 'subtle');
});

test('every symbol offered in the customiser exists in the sprite', () => {
  const sprite = readFileSync(join(ROOT, 'vendor', 'icons', 'lucide-sprite.svg'), 'utf8');
  const code = src('10-header-editor.js');
  const names = [...code.slice(code.indexOf('const TB_SYMBOLS'), code.indexOf('const _TBE_FIRST')).matchAll(/\['([a-z0-9-]+)'/g)].map(m => m[1]);
  assert.ok(names.length > 100);
  const missing = names.filter(n => !sprite.includes(`id="i-${n}"`));
  assert.deepEqual(missing, []);
  assert.equal(new Set(names).size, names.length, 'no duplicates');
  for (const t of ['hourglass', 'timer', 'target', 'list-checks', 'calendar-clock', 'clock']) assert.ok(sprite.includes(`id="i-${t}"`), t);
});

test('Focus: rules, order, snooze and streams; the page and the server agree', () => {
  const today = TODAY;
  const s = focusState(today);
  const ids = (st, limit) => focusTasks(st, today, limit).tasks.map(x => x.task.id);
  const pageIds = (st, limit) => { const box = pageBox(st, today); return plain(box.homeFocusTasks(limit)).map(x => x.i.id); };
  // overdue 400+, today 300, doing 250, pinned 220, planned 200, p1 120, soon 80
  assert.deepEqual(ids(s, 9), ['a', 'b', 'l', 'k', 'g', 'c', 'f', 'd']);
  assert.deepEqual(pageIds(s, 9), ids(s, 9));
  const r = focusTasks(s, today);
  assert.equal(r.tasks.length, 5); assert.equal(r.candidates, 8);
  assert.deepEqual(r.tasks[0].why, ['overdue']);
  // Settings: streams, rules, count.
  const tuned = { ...s, home: { focus: { streams: ['work'], p1: false, dueSoonDays: 0, count: 3 } } };
  assert.deepEqual(ids(tuned), ['a', 'b', 'l']);
  assert.deepEqual(ids(tuned, 9), ['a', 'b', 'l', 'k', 'g']);
  assert.deepEqual(pageIds(tuned, 9), ids(tuned, 9));
  // Manual order first, then by score; snoozed hidden until tomorrow.
  const ordered = { ...s, home: { focusOrder: ['d', 'c'], snoozed: { a: today, b: addDays(today, -1) } } };
  assert.deepEqual(ids(ordered, 9), ['d', 'c', 'b', 'l', 'k', 'g', 'f']);
  assert.deepEqual(pageIds(ordered, 9), ids(ordered, 9));
  assert.equal(focusTasks(ordered, today).hidden, 1);
  assert.equal(focusConfig({ focus: { count: 99, dueSoonDays: -4 } }).count, 9);
  assert.equal(focusConfig({ focus: { count: 99, dueSoonDays: -4 } }).dueSoonDays, 0);
});

test('waiting-on detection on the page', () => {
  const st = { custom: [T('w1', { tags: ['waiting'] }), T('w2', { tags: ['blocked-sam'] }), T('w3', { tags: ['blockers'] }), T('w4', { waitingOn: 'sam' })], statuses: {}, pinned: {}, deleted: {}, people: [{ id: 'sam', name: 'Sam' }] };
  const box = pageBox(st, TODAY);
  box.getPerson = (id) => st.people.find(p => p.id === id);
  box.effPeople = () => [];
  assert.deepEqual(st.custom.map(t => box.homeIsWaiting(t)), [true, true, false, true]);
  assert.equal(box.homeWaitingPerson(st.custom[1]).id, 'sam');
  assert.equal(box.homeWaitingPerson(st.custom[3]).id, 'sam');
  assert.equal(box.homePlainText('**Bold** and [a link](http://x) `code`\n\n- item'), 'Bold and a link code item');
});

/* ───────────────────────────── actions ───────────────────────────── */
let dir, a;
beforeEach(() => { dir = makeDataDir(); a = createActions({ dataDir: dir }); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const disk = () => JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
const run = (ops, extra = {}) => a.apply({ ops, source: 'mcp', client: 'test', ...extra });
const rejects = async (p, code, check) => {
  try { await p; } catch (e) { assert.equal(e.code, code, `${e.code}: ${e.message}`); if (check) check(e); return e; }
  assert.fail(`expected ${code}`);
};

test('countdown ops know the 2.0 widget fields', async () => {
  const r = await run([{ op: 'countdown.create', label: 'Launch', date: addDays(TODAY, 30), icon: 'rocket', color: 'teal', style: 'solid', unit: 'weeks', warnDays: 7, time: '09:30' }]);
  const id = r.created[0].countdownId;
  let w = disk().countdowns.find(x => x.id === id);
  assert.deepEqual([w.type, w.icon, w.color, w.style, w.unit, w.warnDays, w.time, w.headline, w.visible], ['countdown', 'rocket', 'teal', 'solid', 'weeks', 7, '09:30', false, true]);
  assert.equal(disk().countdowns[0].headline, true, 'the old first one became an explicit headline');
  // headline: true moves it first and demotes the old one.
  await run([{ op: 'countdown.update', id: 'Launch', headline: true, hideWhenPast: true, icon: '🎉' }]);
  let list = disk().countdowns;
  assert.equal(list[0].id, id); assert.equal(list[0].headline, true); assert.equal(list[0].icon, 'party-popper');
  assert.equal(list.filter(x => x.headline).length, 1);
  // headline: false hands it to the next one.
  await run([{ op: 'countdown.update', id, headline: false }]);
  list = disk().countdowns;
  assert.notEqual(list[0].id, id); assert.equal(list[0].headline, true);
  // Progress needs a start before its date; count-up from a date.
  await rejects(run([{ op: 'countdown.create', label: 'Contract', type: 'progress', date: addDays(TODAY, 90) }]), 'BAD_VALUE', e => assert.equal(e.field, 'start'));
  await run([{ op: 'countdown.create', label: 'Contract', type: 'progress', date: addDays(TODAY, 90), start: addDays(TODAY, -10) }]);
  w = disk().countdowns.find(x => x.label === 'Contract');
  assert.equal(w.showBar, true);
  await rejects(run([{ op: 'countdown.update', id: 'Contract', start: addDays(TODAY, 95) }]), 'BAD_VALUE');
  await rejects(run([{ op: 'countdown.create', label: 'X', date: TODAY, icon: 'not an icon!' }]), 'BAD_VALUE', e => assert.equal(e.field, 'icon'));
  await rejects(run([{ op: 'countdown.create', label: 'X', date: TODAY, color: 'url(x)' }]), 'BAD_VALUE', e => assert.ok(e.valid.includes('indigo')));
  await rejects(run([{ op: 'countdown.create', label: 'X', date: TODAY, style: 'loud' }]), 'INVALID_PARAMS');
  await rejects(run([{ op: 'countdown.create', label: 'Launch', date: addDays(TODAY, 30) }]), 'DUPLICATE_COUNTDOWN');
  // The query shows the whole widget.
  const q = await a.query('countdowns.list');
  const launch = q.countdowns.find(x => x.id === id);
  assert.equal(launch.daysLeft, 30); assert.match(launch.day, /^[A-Z][a-z]{2}$/); assert.equal(launch.unit, 'weeks'); assert.equal(launch.style, 'solid');
  assert.equal(q.countdowns[0].headline, true);
});

test('live widgets, reorder, delete and undo', async () => {
  const r = await run([{ op: 'topbar.add_widget', type: 'tasks', tasks: 'overdue', position: 0 }]);
  const id = r.created[0].countdownId;
  let list = disk().countdowns;
  assert.equal(list[0].id, id); assert.equal(list[0].headline, true); assert.equal(list[0].tasks, 'overdue'); assert.equal(list[0].date, undefined);
  await rejects(run([{ op: 'topbar.add_widget', type: 'tasks', tasks: 'overdue' }]), 'DUPLICATE_WIDGET');
  await run([{ op: 'topbar.add_widget', type: 'clock', clock: 'time' }]);
  await rejects(run([{ op: 'topbar.add_widget', type: 'countdown' }]), 'INVALID_PARAMS');
  await run([{ op: 'countdown.reorder', ids: ['cd-2'] }]);
  list = disk().countdowns;
  assert.equal(list[0].id, 'cd-2'); assert.equal(list[0].headline, true); assert.equal(list.filter(x => x.headline).length, 1);
  // Deleting the headline makes the next one the headline (dry run first).
  const d = await run([{ op: 'countdown.delete', id: 'cd-2' }], { dryRun: true });
  const del = await run([{ op: 'countdown.delete', id: 'cd-2' }], { confirm: d.confirm });
  list = disk().countdowns;
  assert.ok(!list.some(x => x.id === 'cd-2')); assert.equal(list[0].headline, true);
  await a.undo(del.undo);
  assert.ok(disk().countdowns.some(x => x.id === 'cd-2'));
  // Hide without deleting.
  await run([{ op: 'countdown.update', id: 'cd-1', visible: false }]);
  assert.equal((await a.query('countdowns.list')).countdowns.find(x => x.id === 'cd-1').visible, false);
});

test('home.set_focus and get_home_focus', async () => {
  const before = await a.query('home.focus');
  assert.ok(before.tasks.length >= 1);
  assert.ok(before.tasks.every(t => Array.isArray(t.why) && t.why.length));
  const first = before.tasks.map(t => t.id);
  const r = await run([{ op: 'home.set_focus', count: 3, dueSoonDays: 7, order: first.slice().reverse() }]);
  let s = disk();
  assert.equal(s.home.focus.count, 3); assert.equal(s.home.focus.dueSoonDays, 7);
  assert.deepEqual(s.home.focusOrder, first.slice().reverse());
  const after = await a.query('home.focus');
  assert.ok(after.tasks.length <= 3);
  assert.equal(after.tasks[0].id, first[first.length - 1]);
  // hide / unhide
  await run([{ op: 'home.set_focus', hide: [after.tasks[0].id] }]);
  const hidden = await a.query('home.focus');
  assert.equal(hidden.hiddenToday, 1);
  assert.ok(!hidden.tasks.some(t => t.id === after.tasks[0].id));
  await run([{ op: 'home.set_focus', unhide: ['*'] }]);
  assert.equal((await a.query('home.focus')).hiddenToday, 0);
  // validation and undo
  await rejects(run([{ op: 'home.set_focus', order: ['nope'] }]), 'NOT_FOUND');
  await rejects(run([{ op: 'home.set_focus', streams: ['nowhere'] }]), 'NOT_FOUND');
  await rejects(run([{ op: 'home.set_focus' }]), 'INVALID_PARAMS');
  await a.undo(r.undo, { force: true });
  s = disk();
  assert.equal(s.home && s.home.focus && s.home.focus.count, undefined);
});

/* ───────────────────────────── migration 020 ───────────────────────────── */
test('migration 020-countdowns: dry run, upgrade, idempotent, --add-from', async () => {
  const d = makeDataDir({ ...JSON.parse(JSON.stringify({ custom: [], statuses: {}, _lastSave: 1000 })), countdowns: [{ id: 'cd-1', label: 'Submission', date: '2030-03-01', icon: '🎓', color: 'purple' }, { id: 'cd-2', label: 'Trip', date: '2030-05-01' }] });
  const file = join(d, 'state', 'dashboard-state.json');
  const read = () => JSON.parse(readFileSync(file, 'utf8'));
  const quiet = () => {};
  try {
    const raw0 = readFileSync(file, 'utf8');
    const dry = await applyMigration(m020, { dataDir: d, dryRun: true, log: quiet });
    assert.equal(dry.changed, true);
    assert.equal(readFileSync(file, 'utf8'), raw0, 'a dry run writes nothing');
    const r1 = await applyMigration(m020, { dataDir: d, log: quiet });
    assert.equal(r1.changed, true);
    const s1 = read();
    assert.equal(s1.countdowns.length, 2);
    assert.equal(s1.countdowns[0].headline, true); assert.equal(s1.countdowns[0].icon, 'graduation-cap'); assert.equal(s1.countdowns[0].color, 'violet');
    assert.equal(s1.countdowns[1].headline, false);
    assert.ok(s1._lastSave > 1000, '_lastSave bumped so open pages reload');
    assert.ok(readdirSync(join(d, 'state', 'backups')).some(n => n.startsWith('pre-020-countdowns-')));
    const r2 = await applyMigration(m020, { dataDir: d, log: quiet });
    assert.equal(r2.changed, false);
    // --add-from: adds, skips existing labels, reports bad entries, never twice.
    const add = join(d, 'add.json');
    writeFileSync(add, JSON.stringify({ countdowns: [
      { label: 'Launch', date: '2030-02-01', icon: 'rocket', color: 'teal', headline: true },
      { label: 'Trip', date: '2031-01-01' },
      { label: 'Since', type: 'countup', date: '2029-01-01', visible: false },
      { label: '', date: '2030-01-01' }, { label: 'Bad', date: '1 Feb' }, { label: 'P', type: 'progress', date: '2030-01-01' },
    ] }));
    const dry2 = await applyMigration(m020, { dataDir: d, argv: ['--add-from', add], dryRun: true, log: quiet });
    assert.ok(dry2.notes.some(n => /2 added, 1 skipped/.test(n)), dry2.notes.join(' | '));
    assert.equal(dry2.notes.filter(n => /^add-from: entry/.test(n)).length, 3);
    const r3 = await applyMigration(m020, { dataDir: d, argv: ['--add-from', add], log: quiet });
    assert.equal(r3.changed, true);
    const s3 = read();
    assert.deepEqual(s3.countdowns.map(w => w.label), ['Launch', 'Submission', 'Trip', 'Since']);
    assert.equal(s3.countdowns.filter(w => w.headline).length, 1);
    assert.equal(s3.countdowns[3].type, 'countup'); assert.equal(s3.countdowns[3].visible, false);
    const r4 = await applyMigration(m020, { dataDir: d, argv: ['--add-from', add], log: quiet });
    assert.equal(r4.changed, false);
    assert.equal(read().countdowns.length, 4);
    // A state without countdowns is left alone.
    const e = makeDataDir({ custom: [], statuses: {}, _lastSave: 5 });
    try {
      const r = await applyMigration(m020, { dataDir: e, log: quiet });
      assert.equal(r.changed, false);
      assert.equal(JSON.parse(readFileSync(join(e, 'state', 'dashboard-state.json'), 'utf8')).countdowns, undefined);
    } finally { rmSync(e, { recursive: true, force: true }); }
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('no personal data, inline handlers or raw user text in the Home / top-bar code', () => {
  const homeFiles = readdirSync(join(ROOT, 'src', 'app')).filter(n => /^12-home.*\.js$/.test(n));
  assert.ok(homeFiles.length >= 10, 'Home is split into a core and widget files');
  for (const f of ['10-header.js', '10-header-editor.js', ...homeFiles]) {
    const code = src(f);
    assert.ok(!/\son[a-z]+\s*=\s*["']/.test(code.replace(/\.on[a-z]+\s*=/g, '')), f + ': inline handler attribute');
  }
  // Personal names: tests/no-personal-data.test.mjs checks every app file against
  // the people in the local (gitignored) data folder, so no names live in this file.
});
