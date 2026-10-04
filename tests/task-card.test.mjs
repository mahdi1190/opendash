// Centre card + resizing: where a task / event opens (Settings > Tasks), the
// splitter and window-resize maths, remembered sizes, the new-task draft, and
// that every place a task opens goes through openTask (src/app/13-splitter.js,
// src/app/61-task-card.js loaded into a VM with small stubs).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { UI_STATE_KEYS } from '../lib/state-keys.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = (f) => readFileSync(join(ROOT, 'src', 'app', f), 'utf8');

function makeBox() {
  const calls = { saveUI: 0, render: 0, selectTask: [], tcOpen: [], calPanel: [], panelEvent: [], settings: [], commands: [] };
  const store = new Map();
  const box = {
    console, Math, JSON, Date, Number, String, Object, Array, Set, Map, isFinite,
    CSS: { escape: (s) => String(s) },
    state: { view: 'today', selectedTaskId: null, custom: [{ id: 'u-1', title: 'One' }, { id: 'u-2', title: 'Two' }] },
    saveUI: () => { calls.saveUI++; }, render: () => { calls.render++; },
    getItem: (id) => box.state.custom.find(t => t.id === id) || null,
    // The side panel as 60-task-detail.js runs it: a task or an event; selectTask swaps the task in.
    selectTask: (id) => { calls.selectTask.push(id); box.state.selectedTaskId = id; box.__panelEvent = null; },
    selectEventInPanel: (id) => { calls.panelEvent.push(id); box.state.selectedTaskId = null; box.__panelEvent = id; return true; },
    detailPaneOpen: () => !!(box.state.selectedTaskId || box.__panelEvent),
    closeDetail: () => { box.state.selectedTaskId = null; box.__panelEvent = null; },
    __panelEvent: null,
    calEventById: (id) => (id === 'ev-1' || id === 'ev-2' ? { id, summary: 'Supervisor 1:1' } : null),
    _calOpenEventPanel: (id) => { calls.calPanel.push(id); },
    registerSettingsGroup: (g) => { calls.settings.push(g); },
    registerCommand: (c) => { calls.commands.push(c); },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } },
    requestAnimationFrame: (f) => setTimeout(f, 0), cancelAnimationFrame: (t) => clearTimeout(t), setTimeout, clearTimeout,
    document: {
      addEventListener: () => {}, removeEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [],
      getElementById: () => null, documentElement: { style: { setProperty: () => {} } }, body: { classList: { add() {}, remove() {} } },
    },
  };
  box.window = { addEventListener: () => {}, removeEventListener: () => {}, innerWidth: 1440, innerHeight: 900, matchMedia: () => ({ matches: false }) };
  vm.createContext(box);
  for (const f of ['13-splitter.js', '61-task-card.js']) vm.runInContext(app(f), box, { filename: f });
  // Opening the card itself needs a real page: record what would open.
  box.tcOpen = (entry, o) => { calls.tcOpen.push({ entry, o }); };
  return { box, calls, store };
}
let B, C, S;
beforeEach(() => { ({ box: B, calls: C, store: S } = makeBox()); });
const plain = (x) => JSON.parse(JSON.stringify(x));

/* ---------- the setting ---------- */
test('tasks and events open in the centre card by default; the setting is a remembered UI key', () => {
  assert.equal(B.itemOpenMode(), 'card');
  B.setItemOpenMode('panel');
  assert.equal(B.state.openItemsIn, 'panel');
  assert.equal(B.itemOpenMode(), 'panel');
  assert.ok(C.saveUI >= 1, 'saved with saveUI (no undo step)');
  B.setItemOpenMode('nonsense');
  assert.equal(B.itemOpenMode(), 'card', 'anything else means the card');
  for (const k of ['openItemsIn', 'itemHero', 'paneSizes']) {
    assert.ok(UI_STATE_KEYS.includes(k), `${k} is a UI key (lib/state-keys.mjs)`);
    assert.match(app('01-core-state.js'), new RegExp(`'${k}'`), `${k} is in the page's UI_STATE_KEYS too`);
  }
  const g = C.settings.find(x => x.id === 'tasks');
  assert.ok(g, 'Settings > Tasks is registered');
  assert.equal(g.title, 'Tasks');
  assert.ok(C.commands.some(c => c.id === 'toggle-open-mode'), 'a palette command switches it');
});

/* ---------- openTask / openEvent routing ---------- */
test('openTask honours the setting, the per-call mode, and refuses unknown ids', () => {
  assert.equal(B.openTask('u-1'), 'card');
  assert.equal(C.tcOpen.length, 1);
  assert.deepEqual(plain(C.tcOpen[0].entry), { kind: 'task', id: 'u-1', list: ['u-1'] });
  assert.equal(C.selectTask.length, 0, 'the side panel is not touched');

  assert.equal(B.openTask('u-2', { mode: 'panel' }), 'panel', 'one open can override the setting');
  assert.deepEqual(C.selectTask, ['u-2']);

  B.setItemOpenMode('panel');
  assert.equal(B.openTask('u-1'), 'panel');
  assert.deepEqual(C.selectTask, ['u-2', 'u-1']);
  assert.equal(B.openTask('u-1'), 'panel');
  assert.deepEqual(C.selectTask, ['u-2', 'u-1'], 'the task already open there is not re-selected (no replayed animation)');
  assert.equal(B.openTask('u-2', { mode: 'card' }), 'card');
  assert.equal(B.openTask('nope'), false);
  assert.equal(B.openTask(''), false);
});

test('"Open in the centre" (an explicit card open) closes the side panel: one place at a time', () => {
  B.state.selectedTaskId = 'u-2';
  B.openTask('u-1', { mode: 'card' });
  assert.equal(B.state.selectedTaskId, null);
  assert.ok(C.render >= 1);
  assert.equal(C.tcOpen.length, 1);
});

// Regression (user report, 3 Oct): "if we put a task on the side bar it minimises if we open up another task".
test('a task in the side panel keeps the panel open: opening B swaps B in, never the card', () => {
  assert.equal(B.itemOpenSetting(), 'card', 'the setting is the default: centre card');
  assert.equal(B.openTask('u-1', { mode: 'panel' }), 'panel', 'A in the side panel');
  assert.equal(B.openTask('u-2'), 'panel', 'B goes into the open panel');
  assert.equal(B.state.selectedTaskId, 'u-2', 'the panel shows B');
  assert.ok(B.detailPaneOpen(), 'the panel is still open');
  assert.equal(C.tcOpen.length, 0, 'the card never opened');
  // an event while the panel shows a task: into the same panel
  assert.equal(B.openEvent('ev-1'), 'panel');
  assert.deepEqual(C.panelEvent, ['ev-1']);
  assert.ok(B.detailPaneOpen(), 'still open, now with the event');
  // and back to a task from the event
  assert.equal(B.openTask('u-1'), 'panel');
  assert.equal(B.state.selectedTaskId, 'u-1');
  assert.equal(C.tcOpen.length, 0);
});

test('"Open in side panel" switches this session (not the setting); "Open in the centre" switches back', () => {
  B.switchItemMode('panel');                       // the card's / menu's "Open in side panel"
  assert.equal(B.itemOpenSetting(), 'card', 'the saved setting is unchanged');
  assert.equal(B.itemOpenMode(), 'panel');
  assert.equal(B.openTask('u-1'), 'panel');
  B.closeDetail();                                 // x / Esc
  assert.equal(B.openTask('u-2'), 'panel', 'after closing it, the next task still opens in the panel this session');
  B.switchItemMode('card');                        // "Open in the centre"
  B.closeDetail();
  assert.equal(B.openTask('u-1'), 'card');
  B.switchItemMode('panel');
  B.setItemOpenMode('card');                       // a change in Settings resets the session switch
  B.closeDetail();
  assert.equal(B.itemOpenMode(), 'card');
  assert.equal(B.itemOpenTarget(), 'card');
  B.state.selectedTaskId = 'u-2';
  assert.equal(B.itemOpenTarget(), 'panel', 'an open panel takes the next item whatever the setting');
});

test('openEvent: the card when the event is loaded, else the calendar finds it in its panel', () => {
  assert.equal(B.openEvent('ev-1'), 'card');
  assert.deepEqual(plain(C.tcOpen[0].entry), { kind: 'event', id: 'ev-1' });
  assert.equal(B.openEvent('ev-missing'), 'panel');
  assert.deepEqual(C.calPanel, ['ev-missing']);
  B.closeDetail();
  B.setItemOpenMode('panel');
  assert.equal(B.openEvent('ev-2'), 'panel');
  assert.deepEqual(C.panelEvent, ['ev-2'], 'a loaded event goes into the side panel');
  assert.equal(B.openEvent(''), false);
});

/* ---------- previous / next ---------- */
test('tcNavInfo: position, neighbours, gone tasks skipped', () => {
  const list = ['a', 'b', 'c', 'b'];
  assert.deepEqual(plain(B.tcNavInfo(list, 'b')), { i: 1, n: 3, prev: 'a', next: 'c' });
  assert.deepEqual(plain(B.tcNavInfo(list, 'a')), { i: 0, n: 3, prev: null, next: 'b' });
  assert.deepEqual(plain(B.tcNavInfo(list, 'c', (x) => x !== 'b')), { i: 1, n: 2, prev: 'a', next: null });
  assert.equal(B.tcNavInfo(list, 'zz').i, -1);
  assert.equal(B.tcNavInfo(null, 'a').n, 0);
});

/* ---------- create mode ---------- */
test('a new-task draft takes the prefill, the view defaults and what is typed in the title', () => {
  const d = B.tcDraftFrom({ title: 'Prepare for review', date: '2026-10-09', time: '10:00', minutes: 45, eventId: 'ev-1', people: ['sam'] }, 'today', { dueDate: '2026-10-03', tags: ['work'] });
  assert.equal(d.title, 'Prepare for review');
  assert.equal(d.dueDate, '2026-10-09', 'the prefill wins over the view');
  assert.equal(d.dueTime, '10:00');
  assert.equal(d.estimate, 45);
  assert.equal(d.eventId, 'ev-1');
  assert.deepEqual(plain(d.people), ['sam']);
  assert.deepEqual(plain(d.tags), ['work']);
  const t = B.tcDraftFrom('+work Email Sam', 'all', {});
  assert.equal(t.title, '+work Email Sam');
  assert.equal(t.priority, 'p0');
  // A stub parser stands in for parseQuickAdd (22-quick-add.js).
  const parse = (s) => ({ title: s.replace(/\s*(!p1|#\w+|@\w+|fri)\b/g, '').trim(), dueDate: /fri/.test(s) ? '2026-10-09' : null, priority: /!p1/.test(s) ? 'p1' : 'p0', tags: (s.match(/#(\w+)/g) || []).map(x => x.slice(1)), people: (s.match(/@(\w+)/g) || []).map(x => x.slice(1)), newPeople: [] });
  const dr = B.tcDraftFrom({ title: 'Email Sam fri !p1 #admin @alex', priority: 'p3', tags: ['work'], people: ['sam'] });
  const r = B.tcDraftResolve(dr, parse);
  assert.equal(r.title, 'Email Sam');
  assert.equal(r.dueDate, '2026-10-09');
  assert.equal(r.priority, 'p1', 'typed !p1 beats the picker');
  assert.deepEqual(plain(r.tags), ['work', 'admin']);
  assert.deepEqual(plain(r.people), ['sam', 'alex']);
  const empty = B.tcDraftResolve(B.tcDraftFrom(''), parse);
  assert.equal(empty.title, '', 'an empty title creates nothing (Esc leaves no stray task)');
  const noDate = B.tcDraftResolve(Object.assign(B.tcDraftFrom({ title: 'x', time: '09:00' })), parse);
  assert.equal(noDate.dueTime, null, 'no time without a date');
});

/* ---------- splitter maths ---------- */
test('splitClamp, splitDrag, splitSnap (collapse to the rail), splitStep (keyboard)', () => {
  assert.equal(B.splitClamp(500, 200, 420), 420);
  assert.equal(B.splitClamp(100, 200, 420), 200);
  assert.equal(B.splitClamp(260.6, 200, 420), 261);
  assert.equal(B.splitClamp(NaN, 200, 420), 200);
  assert.equal(B.splitClamp(300, 200, 100), 200, 'a max below the min means the min');
  assert.equal(B.splitDrag(400, 50, 'right'), 450, 'left-hand pane: drag right = wider');
  assert.equal(B.splitDrag(400, 50, 'left'), 350, 'right-hand pane: drag right = narrower');
  assert.equal(B.splitDrag(300, -20, 'top'), 320);
  assert.deepEqual(plain(B.splitSnap(120, { min: 200, max: 420, collapseAt: 150, collapsedSize: 60 })), { size: 60, collapsed: true });
  assert.deepEqual(plain(B.splitSnap(170, { min: 200, max: 420, collapseAt: 150, collapsedSize: 60 })), { size: 200, collapsed: false }, 'between the snap point and the min: the min');
  assert.deepEqual(plain(B.splitSnap(999, { min: 200, max: 420 })), { size: 420, collapsed: false });
  const o = { edge: 'left', min: 320, max: 800 };
  assert.equal(B.splitStep(400, 'ArrowLeft', o), 416, 'a right-hand pane grows with ArrowLeft');
  assert.equal(B.splitStep(400, 'ArrowRight', o), 384);
  assert.equal(B.splitStep(400, 'ArrowLeft', Object.assign({ big: true }, o)), 464);
  assert.equal(B.splitStep(400, 'Home', o), 320);
  assert.equal(B.splitStep(400, 'End', o), 800);
  assert.equal(B.splitStep(400, 'x', o), null);
  assert.equal(B.splitStep(200, 'ArrowRight', { edge: 'right', min: 200, max: 420 }), 216);
  assert.equal(B.splitStep(200, 'ArrowDown', { edge: 'bottom', min: 100, max: 300 }), 216);
});

test('pane sizes are remembered in state.paneSizes (UI key), clamped when read', () => {
  assert.equal(B.paneSize('detail', 400, 320, 800), 400, 'the default before anything is saved');
  B.paneSizeSet('detail', 512.4);
  assert.equal(B.state.paneSizes.detail, 512);
  assert.ok(C.saveUI >= 1);
  assert.equal(B.paneSize('detail', 400, 320, 800), 512);
  assert.equal(B.paneSize('detail', 400, 320, 480), 480, 'a smaller window clamps the remembered size');
  B.paneSizeSet('detail', null);
  assert.equal(B.paneSize('detail', 400), 400);
  B.state.paneSizes = 'junk';
  assert.deepEqual(plain(B.paneSizes()), {}, 'a damaged value is replaced');
});

test('rzSize: edges and corners, centred windows change twice as fast, clamps', () => {
  const s = { w: 800, h: 500 };
  assert.deepEqual(plain(B.rzSize(s, 'e', 40, 0, {})), { w: 840, h: 500 });
  assert.deepEqual(plain(B.rzSize(s, 'w', 40, 0, {})), { w: 760, h: 500 });
  assert.deepEqual(plain(B.rzSize(s, 'e', 40, 0, { center: 'x' })), { w: 880, h: 500 }, 'centred: both sides move');
  assert.deepEqual(plain(B.rzSize(s, 'se', 10, 20, { center: 'xy' })), { w: 820, h: 540 });
  assert.deepEqual(plain(B.rzSize(s, 's', 0, 30, { center: 'x' })), { w: 800, h: 530 }, 'a window pinned at the top grows down 1:1');
  assert.deepEqual(plain(B.rzSize({ w: 800, h: null }, 'e', 10, 99, {})), { w: 810, h: null }, 'a side edge never sets a height');
  assert.deepEqual(plain(B.rzSize(s, 'w', 900, 0, { min: { w: 560 } })), { w: 560, h: 500 });
  assert.deepEqual(plain(B.rzSize(s, 'se', 900, 900, { max: { w: 1200, h: 700 } })), { w: 1200, h: 700 });
});

test('window sizes are remembered per window type in localStorage', () => {
  assert.equal(B.rzLoad('card'), null);
  B.rzSave('card', { w: 900, h: 600 });
  B.rzSave('card', { max: true });
  assert.deepEqual(plain(B.rzLoad('card')), { w: 900, h: 600, max: true }, 'merged');
  B.rzSave('dialog:reschedule', { w: 480 });
  assert.deepEqual(Object.keys(JSON.parse(S.get('dash-window-sizes-v1'))).sort(), ['card', 'dialog:reschedule']);
  B.rzSave('card', null);
  assert.equal(B.rzLoad('card'), null, 'reset forgets it');
  S.set('dash-window-sizes-v1', '{not json');
  assert.equal(B.rzLoad('card'), null, 'a damaged store is ignored');
});

/* ---------- every way in goes through openTask ---------- */
test('every place a task opens uses the shared openTask helper', () => {
  const has = (f, re, why) => assert.match(app(f), re, `${f}: ${why}`);
  has('30-task-row.js', /openTask\(id, \{ from: el \}\)/, 'task rows');
  has('16-command-palette.js', /openTask\(it\.id/, 'palette results');
  has('51-people-section.js', /openTask\(i\.id, \{ from: r \}\)/, 'the person panel task list');
  has('63-resources.js', /openTask\(l\.id/, 'Files & links task chips');
  has('40-calendar.js', /openTask\(tid, \{ from: el \}\)/, 'calendar task chips');
  has('41-calendar-section.js', /openTask\(id, \{ from: el \}\)/, 'calendar agenda rows');
  has('43-calendar-panel.js', /openTask\(t\.id, \{ from: r \}\)/, 'the event\'s related tasks');
  has('33-tasks-logs.js', /openTask\(it\.id/, 'Wins and the logbook');
  has('31-task-views.js', /openTask\(it\.id, \{ from: card \}\)/, 'board cards');
  has('90-wiring.js', /openTask\(_lastSelectedTaskId\)/, 'Enter on the keyboard cursor');
  has('14-shell.js', /tcOpenCreate\(prefill/, 'New task opens the card in create mode');
  has('43-calendar-panel.js', /tcOpenCreate\(o\)/, 'the calendar\'s New task / Create task from an event');
  assert.doesNotMatch(app('66-autolink.js'), /selectTask\(/, 'related tasks and suggestions');
  assert.match(app('41-calendar-section.js'), /openEvent\(id/, 'events open through openEvent');
});

test('the card escapes what it shows and writes no inline handlers', () => {
  const src = app('61-task-card.js');
  assert.doesNotMatch(src, /\son[a-z]+=["'`]/, 'no on*= attributes in markup strings');
  // Titles, event names and people go in through textContent / esc(); spot-check the risky spots.
  assert.match(src, /querySelector\('\.tc-mn'\)\.textContent = /);
  assert.match(src, /h\.textContent = p\.title/);
  assert.match(src, /querySelector\('span'\)\.textContent = _tcEntryLabel\(prev\)/);
  assert.doesNotMatch(src, /innerHTML = [^;]*effTitle\(/, 'a task title never goes into innerHTML');
});
