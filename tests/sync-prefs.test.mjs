// Preferences follow the person (lib/sync/manifest.mjs, lib/sync/model.mjs
// SYNC_SPEC): theme, density, the calendars you follow or hide, per-view
// options, Home cards... sync to every computer; where you are and this
// screen's sizes never do. Maps merge entry by entry (hiding Alex's calendar
// on one computer and showing Sam's on the other both survive), plain values
// by last writer; while Auto is on each computer keeps its own theme.
// First in memory (the model, like tests/sync-model.test.mjs), then end to end
// with encrypted folder sync: a fresh computer joining adopts the group's
// preferences, and computers that synced before preferences did pick them up
// without losing what they had.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClock, decodeHlc } from '../lib/sync/hlc.mjs';
import { capture, applyWrite, materialize, newTree, validateOp, syncedView, checkWrite } from '../lib/sync/model.mjs';
import { calendarRules } from '../lib/calendar-visibility.mjs';
import { tempDir, rm, sleep, editState, stopAll, makeE2EDevice, settle } from './sync-e2e.shared.mjs';

// ─── In memory ─────────────────────────────────────────────────────────────
const ID = { a: 'aaaaaaaaaaaaaaaa', b: 'bbbbbbbbbbbbbbbb' };
let wall = Date.UTC(2026, 9, 23, 9, 0, 0);
const now = () => wall;
function device(name, state = { custom: [] }) {
  return { id: ID[name], tree: newTree(), clock: createClock({ deviceId: ID[name], now }), seq: 0, seen: {}, state: structuredClone(state) };
}
/** A local change: capture it, stamp it, keep it. Returns the change line (or null: nothing to send). */
function edit(d, fn = () => {}) {
  wall += 10;
  const next = structuredClone(d.state);
  fn(next);
  const cap = capture(next, d.tree);
  d.state = next;
  if (!cap.w.length && !cap.x.length) return null;
  const op = { v: 1, dev: d.id, n: ++d.seq, h: d.clock.tick(), s: { ...d.seen }, w: cap.w, x: cap.x };
  for (const [p, v] of op.w) applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, v });
  for (const p of op.x) applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, d: true });
  return JSON.parse(JSON.stringify(op));
}
function receive(d, ops) {
  const touched = new Set();
  for (const raw of ops.flat().filter(Boolean)) {
    const v = validateOp(raw, raw.dev);
    assert.ok(v, 'a valid change line');
    d.clock.observe(v.op.h);
    for (const [p, val] of v.op.w) if (applyWrite(d.tree, p, { h: v.op.h, n: v.op.n, s: v.op.s, v: val }) === 'won') touched.add(p[0]);
    for (const p of v.op.x) if (applyWrite(d.tree, p, { h: v.op.h, n: v.op.n, s: v.op.s, d: true }) === 'won') touched.add(p[0]);
    d.seen[v.op.dev] = Math.max(d.seen[v.op.dev] || 0, v.op.n);
  }
  d.state = materialize(d.state, d.tree, [...touched]);
}
/** Two devices that share one first copy. */
function pair(state, bLocal = {}) {
  const a = device('a', state), b = device('b', { custom: [], ...bLocal });
  receive(b, [edit(a)]);
  assert.equal(syncedView(a.state), syncedView(b.state));
  return { a, b };
}
const paths = (op) => (op ? [...op.w.map(([p]) => p.join('/')), ...op.x.map(p => p.join('/'))] : []);
const CALS = [{ id: 'alex@example.com', defaultOn: true }, { id: 'sam@example.com', defaultOn: false }, { id: 'team@group.calendar.google.com', defaultOn: true }];

test('theme, density and the other plain preferences: the later choice wins on every device', () => {
  const { a, b } = pair({ custom: [], theme: 'light', autoTheme: false, density: 'normal', sortBy: 'date', openItemsIn: 'panel' });
  assert.equal(b.state.theme, 'light');
  const fromA = edit(a, s => { s.theme = 'dark'; s.density = 'compact'; s.sortBy = 'priority'; });
  const fromB = edit(b, s => { s.sortBy = 'title'; s.openItemsIn = 'card'; });   // later, without having seen A's
  receive(a, [fromB]); receive(b, [fromA]);
  assert.deepEqual([a.state.sortBy, b.state.sortBy], ['title', 'title'], 'same field: the later choice wins');
  assert.deepEqual([a.state.theme, b.state.theme], ['dark', 'dark'], 'a choice only one device made travels');
  assert.deepEqual([a.state.density, b.state.density], ['compact', 'compact']);
  assert.deepEqual([a.state.openItemsIn, b.state.openItemsIn], ['card', 'card']);
  assert.equal(syncedView(a.state), syncedView(b.state));
});

test("calendar follow/hide merges per calendar: hiding Alex's on one device and showing Sam's on the other both survive", () => {
  const { a, b } = pair({ custom: [], calPrefs: { mode: 'month', hidden: { declined: true } } }, { calPrefs: { mode: 'month' } });
  assert.deepEqual(b.state.calPrefs, { mode: 'month', hidden: { declined: true } });
  const fromA = edit(a, s => { s.calPrefs.hidden['cal:alex@example.com'] = true; s.calPrefs.mode = 'week'; });
  const fromB = edit(b, s => { s.calPrefs.hidden['cal:sam@example.com'] = false; s.calPrefs.showDone = true; s.calPrefs.stream = 'work'; });
  assert.deepEqual(paths(fromA), ['calPrefs/hidden/cal:alex@example.com'], 'one entry, not the whole value; the mode you are in is not sent');
  assert.ok(!paths(fromB).includes('calPrefs/stream'), 'the one-stream filter is not sent');
  receive(a, [fromB]); receive(b, [fromA]);
  for (const d of [a, b]) assert.deepEqual(d.state.calPrefs.hidden, { declined: true, 'cal:alex@example.com': true, 'cal:sam@example.com': false });
  assert.deepEqual([a.state.calPrefs.mode, b.state.calPrefs.mode], ['week', 'month'], 'each device keeps the calendar mode it is in');
  assert.deepEqual([a.state.calPrefs.stream, b.state.calPrefs.stream], [undefined, 'work']);
  assert.deepEqual([a.state.calPrefs.showDone, b.state.calPrefs.showDone], [true, true]);
  // What each device shows: Alex off, Sam on (although someone else's calendar starts off), the team calendar by its default.
  const shown = (d) => CALS.filter(c => calendarRules({ calendars: CALS, state: d.state }).isShown(c.id)).map(c => c.id);
  assert.deepEqual(shown(a), ['sam@example.com', 'team@group.calendar.google.com']);
  assert.deepEqual(shown(b), shown(a));
  // "Back to the defaults" on B removes its entries; the removal is per entry too.
  const reset = edit(b, s => { delete s.calPrefs.hidden['cal:sam@example.com']; delete s.calPrefs.hidden['cal:alex@example.com']; });
  const hideTeam = edit(a, s => { s.calPrefs.hidden['cal:team@group.calendar.google.com'] = true; });
  receive(a, [reset]); receive(b, [hideTeam]);
  for (const d of [a, b]) assert.deepEqual(d.state.calPrefs.hidden, { declined: true, 'cal:team@group.calendar.google.com': true });
  assert.equal(syncedView(a.state), syncedView(b.state), 'converged (the modes are not part of what syncs)');
});

test('per-view options, Home cards, sidebar lists and folded headings merge entry by entry', () => {
  const { a, b } = pair({ custom: [], taskViewPrefs: { today: { sort: 'date' } }, homeUI: { expanded: [] }, sidebarLists: {}, collapsedSidebar: {}, achievements: { v: 1, unlocked: {}, notes: {}, checked: true } });
  const fromA = edit(a, s => {
    s.taskViewPrefs.today.sort = 'priority';
    s.homeUI.listFold = { 'list-1': ['overdue'] }; s.homeUI.hideAmounts = true;
    s.sidebarLists.tags = { sort: 'name' }; s.collapsedSidebar.streams = true;
    s.achievements.unlocked['first-week'] = '2026-10-20';
  });
  const fromB = edit(b, s => {
    s.taskViewPrefs.today.collapsed = { done: true }; s.taskViewPrefs.week = { group: 'stream' };
    s.homeUI.listFold = { 'list-2': ['later'] };
    s.sidebarLists.people = { n: 10 }; s.collapsedSidebar.tags = true;
    s.achievements.unlocked['inbox-zero'] = '2026-10-21';
  });
  assert.ok(!paths(fromA).some(p => p.startsWith('homeUI/hideAmounts')), "hiding amounts is this screen's privacy: not sent");
  receive(a, [fromB]); receive(b, [fromA]);
  for (const d of [a, b]) {
    assert.deepEqual(d.state.taskViewPrefs, { today: { sort: 'priority', collapsed: { done: true } }, week: { group: 'stream' } });
    assert.deepEqual(d.state.homeUI.listFold, { 'list-1': ['overdue'], 'list-2': ['later'] }, 'per Home list card');
    assert.deepEqual(d.state.sidebarLists, { tags: { sort: 'name' }, people: { n: 10 } });
    assert.deepEqual(d.state.collapsedSidebar, { streams: true, tags: true });
    assert.deepEqual(Object.keys(d.state.achievements.unlocked).sort(), ['first-week', 'inbox-zero'], 'nothing earned is lost');
  }
  assert.deepEqual([a.state.homeUI.hideAmounts, b.state.homeUI.hideAmounts], [true, undefined]);
  assert.equal(syncedView(a.state), syncedView(b.state));
});

test('while Auto is on each device keeps its own theme; the Auto choice itself syncs', () => {
  const { a, b } = pair({ custom: [], theme: 'light', autoTheme: false });
  receive(b, [edit(a, s => { s.autoTheme = true; })]);
  assert.equal(b.state.autoTheme, true, 'turning Auto on travels');
  // Evening here, morning there: each page sets its own theme (90-wiring.js applyAutoTheme).
  assert.equal(edit(a, s => { s.theme = 'dark'; }), null, 'a theme Auto picked is not sent');
  assert.equal(edit(b, s => { s.theme = 'light'; }), null);
  // B switches Auto off and picks Light: only autoTheme changes (the synced theme is already light).
  const off = edit(b, s => { s.autoTheme = false; s.theme = 'light'; });
  assert.deepEqual(paths(off), ['autoTheme']);
  receive(a, [off]);
  assert.equal(a.state.autoTheme, false);
  assert.equal(a.state.theme, 'light', "Auto turned off elsewhere brings that device's theme here, though only Auto changed");
  // Then a manual Dark on A travels as usual.
  receive(b, [edit(a, s => { s.theme = 'dark'; })]);
  assert.equal(b.state.theme, 'dark');
  // B turns Auto on again (its page picks Light for its morning): only Auto is sent.
  const on = edit(b, s => { s.autoTheme = true; s.theme = 'light'; });
  assert.deepEqual(paths(on), ['autoTheme']);
  receive(a, [on]);
  assert.deepEqual([a.state.autoTheme, a.state.theme], [true, 'dark'], 'A follows Auto again and keeps its own theme until its page applies it');
  assert.equal(syncedView(a.state), syncedView(b.state), 'converged (the theme is not part of it while Auto is on)');
});

test('where you are and this screen never travel; incoming writes to them are refused', () => {
  const { a, b } = pair({ custom: [{ id: 'u-1', title: 'One', subtasks: [] }] });
  const op = edit(a, s => {
    Object.assign(s, { view: 'calendar:week', viewMode: 'kanban', selectedTaskId: 'u-1', calMonth: '2026-11', weekBarOffset: 2, focus: true,
      paneSizes: { sidebar: 320 }, sidebarCollapsed: true, personEditMode: true, lastReviewPrompt: 5, _lastBackup: 6,
      suggestStats: { rules: { a: { shown: 3 } }, seen: {} }, travel: { v: 1, trips: [] }, env: { host: 'x' } });
  });
  assert.equal(op, null, 'nothing to send');
  for (const p of [['view'], ['viewMode'], ['selectedTaskId'], ['paneSizes', 'sidebar'], ['paneSizes'], ['sidebarCollapsed'], ['focus'], ['suggestStats'], ['calPrefs', 'mode'], ['calPrefs', 'stream'], ['homeUI', 'hideAmounts']]) {
    assert.equal(checkWrite(p, 1), null, `${p.join('.')} is refused`);
  }
  for (const p of [['theme'], ['calPrefs', 'hidden', 'cal:x'], ['homeUI', 'listFold', 'l-1'], ['taskViewPrefs', 'today', 'collapsed', 'done']]) assert.ok(checkWrite(p, true), `${p.join('.')} is accepted`);
  receive(b, [{ v: 1, dev: ID.a, n: 99, h: a.clock.tick(), s: {}, w: [[['view'], 'settings'], [['paneSizes'], { sidebar: 1 }], [['calPrefs', 'mode'], 'day']], x: [] }]);
  assert.equal(b.state.view, undefined);
  assert.equal(b.state.paneSizes, undefined);
  assert.equal(b.state.calPrefs, undefined);
});

test('devices that synced before preferences did: the first pass publishes the local values as ordinary changes, and nothing is wiped', () => {
  // Synced data only, as the previous version had it; the preferences were in each state file all along.
  const { a, b } = pair({ custom: [{ id: 'u-1', title: 'One', subtasks: [] }] });
  a.state = { ...a.state, theme: 'dark', density: 'compact', calPrefs: { mode: 'week', hidden: { declined: true, 'cal:alex@example.com': true } } };
  b.state = { ...b.state, theme: 'light', calPrefs: { mode: 'month', hidden: { declined: true, 'cal:sam@example.com': false } }, taskViewPrefs: { today: { sort: 'priority' } } };
  const firstA = edit(a), firstB = edit(b);   // the first pass of the new version (B a moment after A)
  for (const op of [firstA, firstB]) {
    assert.ok(decodeHlc(op.h).wall > 0, 'an ordinary change, not written at the joining floor');
    assert.deepEqual(op.x, [], 'nothing is deleted');
  }
  assert.ok(paths(firstA).includes('theme') && paths(firstA).includes('calPrefs/hidden/cal:alex@example.com'));
  receive(a, [firstB]); receive(b, [firstA]);
  for (const d of [a, b]) {
    assert.deepEqual(d.state.calPrefs.hidden, { declined: true, 'cal:alex@example.com': true, 'cal:sam@example.com': false }, 'both computers keep their hidden and shown calendars');
    assert.equal(d.state.density, 'compact', 'a preference only one had is kept');
    assert.deepEqual(d.state.taskViewPrefs, { today: { sort: 'priority' } });
    assert.equal(d.state.theme, 'light', 'where both had one, the computer that published later wins, like any later change');
  }
  assert.deepEqual([a.state.calPrefs.mode, b.state.calPrefs.mode], ['week', 'month']);
  assert.equal(edit(a), null, 'then nothing more to send');
  assert.equal(edit(b), null);
});

// ─── End to end: encrypted folder sync ─────────────────────────────────────
const base = tempDir('sync-prefs-');
const cloud = join(base, 'cloud');
mkdirSync(cloud);
after(async () => { await stopAll(); rm(base); });
const read = (d) => d.store.readObject();
let A, B, code;

test("a fresh computer that joins adopts the main computer's theme and hidden calendars, and keeps its own view, panel sizes and open task", async () => {
  A = makeE2EDevice(base, 'main', { state: {
    custom: [{ id: 'u-1', title: 'Write chapter 4', subtasks: [] }],
    theme: 'dark', autoTheme: false, density: 'compact', sortBy: 'priority',
    calPrefs: { mode: 'week', hidden: { declined: true, 'cal:alex@example.com': true } },
    taskViewPrefs: { today: { group: 'stream' } },
    view: 'calendar:week', viewMode: 'kanban', selectedTaskId: 'u-1', paneSizes: { sidebar: 300 }, sidebarCollapsed: true,
  } });
  await A.eng.start();
  code = (await A.eng.setupFirst({ folder: cloud, deviceName: 'Home PC', apply: true })).recoveryCode;
  await A.eng.syncNow();
  // A brand-new copy: the page's defaults (05-core-state-init.js) and the calendar's (40-calendar.js calPrefs).
  B = makeE2EDevice(base, 'fresh', { state: {
    custom: [], theme: 'light', autoTheme: false, density: 'normal', sortBy: 'date',
    calPrefs: { mode: 'month', hidden: { declined: true } },
    view: 'home', viewMode: 'list', selectedTaskId: null, paneSizes: { sidebar: 200 }, sidebarCollapsed: false,
  } });
  await B.eng.start();
  await B.eng.joinExisting({ folder: cloud, deviceName: 'Work laptop', apply: true });
  await B.eng.joinWithRecovery(code);
  await settle([A, B]);
  const b = await read(B), a = await read(A);
  assert.equal(b.custom.length, 1);
  assert.deepEqual([b.theme, b.density, b.sortBy, b.autoTheme], ['dark', 'compact', 'priority', false], "the group's preferences win over the fresh copy's defaults");
  assert.equal(b.calPrefs.hidden['cal:alex@example.com'], true, "Alex's calendar stays hidden on the new computer");
  assert.deepEqual(b.taskViewPrefs, { today: { group: 'stream' } });
  assert.deepEqual([b.view, b.viewMode, b.selectedTaskId, b.paneSizes, b.sidebarCollapsed, b.calPrefs.mode], ['home', 'list', null, { sidebar: 200 }, false, 'month'], 'where it is and its own screen stay');
  assert.deepEqual([a.theme, a.density, a.view, a.selectedTaskId, a.paneSizes, a.calPrefs.mode], ['dark', 'compact', 'calendar:week', 'u-1', { sidebar: 300 }, 'week'], 'the main computer is unchanged');
  assert.equal(syncedView(a), syncedView(b));
  assert.equal(A.eng.status().conflicts.count + B.eng.status().conflicts.count, 0, 'no clashes reported');
});

test('after joining: a hide here and a show there both survive, a theme change travels, and a preference clash is not reported', async () => {
  await editState(A.store, s => { s.calPrefs.hidden['cal:team@group.calendar.google.com'] = true; s.sortBy = 'title'; s.custom[0].title = 'Title from A'; });
  await A.eng.syncNow();
  await sleep(5);
  await editState(B.store, s => { s.calPrefs.hidden['cal:sam@example.com'] = false; s.sortBy = 'date'; s.theme = 'light'; s.paneSizes = { sidebar: 180 }; s.custom[0].title = 'Title from B'; });
  await B.eng.syncNow();   // B had not seen A's sort or title: two clashes, B later
  await settle([A, B]);
  const a = await read(A), b = await read(B);
  for (const s of [a, b]) {
    assert.deepEqual(s.calPrefs.hidden, { declined: true, 'cal:alex@example.com': true, 'cal:team@group.calendar.google.com': true, 'cal:sam@example.com': false });
    assert.equal(s.sortBy, 'date', 'the later choice wins');
    assert.equal(s.theme, 'light');
  }
  assert.deepEqual(a.paneSizes, { sidebar: 300 }, "B's panel sizes never reach A");
  assert.equal(a.custom[0].title, 'Title from B');
  const recent = [...A.eng.status().conflicts.recent, ...B.eng.status().conflicts.recent];
  assert.ok(recent.length >= 1 && recent.every(c => c.path[0] === 'custom'), 'the task title clash is reported, the sort clash is quiet: ' + JSON.stringify(recent.map(c => c.path)));
});

test('computers that synced before preferences did pick them up: each sends its own as ordinary changes, maps keep both', async () => {
  // Two more computers that sync tasks only (the previous version)...
  const cloud2 = join(base, 'cloud2');
  mkdirSync(cloud2);
  const C = makeE2EDevice(base, 'old-c', { state: { custom: [{ id: 'u-9', title: 'Shared task', subtasks: [] }] } });
  const D = makeE2EDevice(base, 'old-d', { state: { custom: [] } });
  await C.eng.start(); await D.eng.start();
  const c2 = (await C.eng.setupFirst({ folder: cloud2, deviceName: 'Desk', apply: true })).recoveryCode;
  await C.eng.syncNow();
  await D.eng.joinExisting({ folder: cloud2, deviceName: 'Laptop', apply: true });
  await D.eng.joinWithRecovery(c2);
  await settle([C, D]);
  assert.equal((await read(D)).custom.length, 1);
  // ...whose state files held preferences that never synced (put in as they were).
  await editState(C.store, s => Object.assign(s, { theme: 'dark', density: 'compact', calPrefs: { mode: 'week', hidden: { declined: true, 'cal:alex@example.com': true } } }));
  await editState(D.store, s => Object.assign(s, { theme: 'light', calPrefs: { mode: 'month', hidden: { declined: true, 'cal:sam@example.com': false } } }));
  await C.eng.syncNow();
  await sleep(5);
  await D.eng.syncNow();   // D's first pass is later
  await settle([C, D]);
  const c = await read(C), d = await read(D);
  for (const s of [c, d]) {
    assert.deepEqual(s.calPrefs.hidden, { declined: true, 'cal:alex@example.com': true, 'cal:sam@example.com': false }, 'both kept');
    assert.equal(s.density, 'compact');
    assert.equal(s.theme, 'light', 'the later first pass wins where both had one (an ordinary change, not the joining floor)');
  }
  assert.deepEqual([c.calPrefs.mode, d.calPrefs.mode], ['week', 'month']);
  assert.equal(syncedView(c), syncedView(d));
  assert.equal(C.eng.status().conflicts.count + D.eng.status().conflicts.count, 0);
});
