// Home quality of life, accessibility and robustness (HQ, 3 Oct): what the browser
// checks found, kept here so it stays fixed. Widget unmount hooks (timers stop when
// Home is left), the minute ticks pause in a hidden tab, a task added from Home keeps
// keyboard focus, Focus rows are one Tab stop each, the Home tile is a no-op when Home
// is already open, and the people index is built once per tasksForPerson call (the
// sidebar asks for every person on every render). Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const HOME_FILES = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort();
const plain = (x) => JSON.parse(JSON.stringify(x));
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** A small stand-in for a DOM element: enough for the code paths tested here. */
function fakeEl(tag) {
  const cls = new Set();
  const e = {
    tagName: String(tag || 'div').toUpperCase(), children: [], dataset: {}, style: { setProperty() {}, removeProperty() {} }, attrs: {},
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c), toggle: (c, on) => ((on === undefined ? !cls.has(c) : on) ? cls.add(c) : cls.delete(c)) },
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null }, hasAttribute(k) { return k in this.attrs; },
    appendChild(c) { this.children.push(c); return c; }, addEventListener() {},
    querySelector(sel) { return sel === '.sw-badge' ? (this._badge || (this._badge = fakeEl('span'))) : (sel === '.hf-tt' ? fakeEl('div') : null); },
    querySelectorAll(sel) { return sel === '.sw-tile' ? this.children : []; },
    focused: 0, focus() { this.focused++; },
  };
  let html = '';
  Object.defineProperty(e, 'innerHTML', { get: () => html, set: (v) => { html = String(v); if (!html) e.children = []; } });
  return e;
}

/** Every Home file in a VM (build order) with a stand-in for the app around it. */
function homeBox(st) {
  const state = Object.assign({ view: 'home', custom: [], statuses: {}, pinned: {}, deleted: {}, completionLog: {}, home: {}, homeUI: {} }, st || {});
  const listeners = {};
  const timers = { set: 0, cleared: 0 };
  const errors = [];
  const sections = {};
  const box = {
    console: Object.assign({}, console, { error: (...a) => errors.push(a.join(' ')) }),
    state, APP_CONFIG: { locale: 'en-GB', features: {} }, STREAMS: { work: { label: 'Work', color: '#2563eb' } },
    window: { addEventListener() {}, Motion: null }, CSS: { escape: (s) => s },
    document: {
      hidden: false, activeElement: null, body: fakeEl('body'),
      addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
      querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: (t) => fakeEl(t),
    },
    setTimeout: () => ++timers.set, clearTimeout: () => { timers.cleared++; }, setInterval: () => ++timers.set, clearInterval: () => { timers.cleared++; },
    performance: { now: () => 0 }, requestAnimationFrame: () => 0,
    registerSection: (name, def) => { sections[name] = def; }, render() {}, saveData() {}, saveUI() {}, toast() {}, undo() {},
    fmtDate: fmt, todayStr: () => fmt(new Date()), daysUntil: () => null, dueLabel: (s) => s,
    esc, escAttr: esc, icon: (n) => `<svg data-i="${n}"></svg>`, safeColor: (c, d) => c || d,
    getItem: (id) => state.custom.find(t => t.id === id), getAllItems: () => state.custom.filter(t => !state.deleted[t.id]),
    statusOf: (id) => state.statuses[id] || 'todo', isPinned: (id) => !!state.pinned[id],
    effDate: (t) => t.dueDate || null, effPriority: (t) => t.priority || 'p0', effStream: (t) => t.stream, effTags: (t) => t.tags || [],
    effTitle: (t) => t.title, effDetail: () => '', getPerson: () => null, getSubtasks:(id) => (state.custom.find(t => t.id === id) || {}).subtasks || [],
  };
  box.document.activeElement = box.document.body;
  vm.createContext(box);
  loadPageClock(box);   // Home's hours come from the page's Clock (travel spec 2.7 P12)
  vm.runInContext(HOME_FILES.map(f => readFileSync(join(APP, f), 'utf8')).join('\n'), box, { filename: 'home-bundle.js' });
  const fire = (t) => { for (const f of listeners[t] || []) f({}); };
  return { box, state, sections, timers, errors, fire, run: (code) => vm.runInContext(code, box) };
}

test('leaving Home runs every widget\'s unmount (timers stop at once); one failing does not stop the rest', () => {
  const { run, sections, errors } = homeBox();
  const withUnmount = plain(run(`homeWidgetDefs().filter(d => typeof d.unmount === 'function').map(d => d.id)`));
  for (const id of ['today', 'schedule']) assert.ok(withUnmount.includes(id), `${id} stops its tick on unmount`);
  run(`var __n = [];
    registerHomeWidget({ id: 'qa1', render() {}, unmount() { __n.push('a'); } });
    registerHomeWidget({ id: 'qa2', render() {}, unmount() { throw new Error('boom'); } });
    registerHomeWidget({ id: 'qa3', render() {}, unmount() { __n.push('c'); } });`);
  sections.home.unmount();
  assert.deepEqual(plain(run('__n')), ['a', 'c']);
  assert.equal(errors.filter(e => /qa2/.test(e)).length, 1, 'the failure is reported');
  assert.equal(errors.filter(e => !/qa2/.test(e)).length, 0, 'the built-in widgets unmount cleanly: ' + errors.join(' | '));
  assert.equal(run('_hh.timer'), 0);
  assert.equal(run('_hsTimer'), 0);
});

test('the hero\'s minute tick stops in a hidden tab and catches up when it is back', () => {
  const { box, run, fire, timers } = homeBox();
  run(`_hh.el = { isConnected: true }; var __ticks = 0; _hhTick = function () { __ticks++; }; _hhEnsureTicker();`);
  const t0 = run('_hh.timer');
  assert.ok(t0, 'ticking on Home');
  box.document.hidden = true; fire('visibilitychange');
  assert.equal(run('_hh.timer'), 0, 'no interval while hidden');
  assert.ok(timers.cleared >= 1);
  box.document.hidden = false; fire('visibilitychange');
  assert.equal(run('__ticks'), 1, 'one catch-up tick at once');
  assert.ok(run('_hh.timer'), 'and ticking again');
});

test('the schedule\'s pending minute tick is dropped in a hidden tab, not left to fire', () => {
  const { box, run, fire } = homeBox();
  run(`_hsTickStart();`);
  assert.ok(run('_hsTimer'));
  box.document.hidden = true; fire('visibilitychange');
  assert.equal(run('_hsTimer'), 0);
});

test('a task added from Home keeps keyboard focus: its Focus row, else the fallback; it is announced', () => {
  const { box, run, state } = homeBox({ custom: [{ id: 't1', title: 'Email Sam about the boiler', stream: 'work' }] });
  const row = fakeEl('div'), fallback = fakeEl('h2');
  const said = [];
  box.homeAnnounce = (m) => said.push(m);
  box.document.querySelector = (sel) => (/hf-card\[data-id="t1"\] \.hf-tt/.test(sel) ? row : sel === '.fallback' ? fallback : null);
  run(`homeFocusAfterAdd('t1', '.fallback')`);
  assert.equal(row.focused, 1);
  assert.equal(fallback.focused, 0);
  assert.deepEqual(said, ['Added: Email Sam about the boiler']);
  // Not in Focus (no date yet): the fallback, made focusable without joining the Tab order.
  box.document.querySelector = (sel) => (sel === '.fallback' ? fallback : null);
  run(`homeFocusAfterAdd('t1', '.fallback')`);
  assert.equal(fallback.focused, 1);
  assert.equal(fallback.tabIndex, -1);
  // Nothing was added (empty text): nothing happens.
  run(`homeFocusAfterAdd(null, null)`);
  assert.equal(said.length, 2);
  assert.equal(state.custom.length, 1);
});

test('a Focus row is one Tab stop: the hover actions are not (X and ] do the same on the row)', () => {
  const { run } = homeBox({ custom: [{ id: 't1', title: 'Send <the> invites', stream: 'work', subtasks: [] }] });
  const html = run(`_hfCard(getItem('t1'), [], { expanded: new Set(), editing: false }).innerHTML`);
  const quick = html.match(/<button[^>]*class="hf-qb[^"]*"[^>]*>/g) || [];
  assert.equal(quick.length, 2, 'Done and Tomorrow');
  for (const b of quick) assert.match(b, /tabindex="-1"/, b);
  assert.match(html, /class="hf-tt" role="button" tabindex="0"[^>]*aria-keyshortcuts="X O P H \[ \]"/);
  assert.match(html, /Send &lt;the&gt; invites/, 'the title is escaped');
});

/* ---------- the shell: re-selecting the Home tile ---------- */
function shellBox() {
  const main = { scrollTop: 0, scrolled: [], scrollTo(o) { this.scrolled.push(o); } };
  const sw = fakeEl('div');
  const box = {
    console, setTimeout, clearTimeout,
    document: { addEventListener() {}, getElementById: (id) => (id === 'section-switcher' ? sw : id === 'main' ? main : null), createElement: (t) => fakeEl(t), querySelector: () => null, querySelectorAll: () => [] },
    window: { addEventListener() {}, matchMedia: () => ({ matches: false }) },
    location: { hash: '' }, history: { replaceState() {} },
  };
  box.globalThis = box;
  vm.createContext(box);
  const files = ['00-core-config.js', '00-core-constants.js', '11-ui-kit.js', '12-home.js', '14-shell.js', '15-nav-sidebar.js'];
  for (const f of files) vm.runInContext(readFileSync(join(APP, f), 'utf8'), box, { filename: f });
  vm.runInContext('var HAS_COWORK = false; var state = { view: "home", people: [], custom: [] }; applyStreams(state); var __views = []; setView = function (v) { __views.push(v); };', box);
  return { box, sw, main, run: (c) => vm.runInContext(c, box) };
}

test('the Home tile while Home is open does nothing (a scrolled page goes back to the top); other tiles switch', () => {
  const { run, sw, main } = shellBox();
  run('renderSwitcher()');
  const tile = (id) => sw.children.find(b => b.dataset.tile === id);
  assert.ok(tile('home') && tile('tasks'));
  tile('home').onclick();
  assert.deepEqual(plain(run('__views')), [], 'no setView, so no re-render and no replayed entrance');
  assert.equal(main.scrolled.length, 0, 'already at the top: nothing moves');
  main.scrollTop = 420;
  tile('home').onclick();
  assert.deepEqual(plain(run('__views')), []);
  assert.equal(main.scrolled.length, 1);
  assert.equal(main.scrolled[0].top, 0);
  tile('tasks').onclick();
  assert.equal(plain(run('__views')).length, 1, 'another tile still switches');
});

/* ---------- people: the index once per call ---------- */
test('tasksForPerson builds the people signature once per call, not once per task (same answer)', () => {
  const people = [{ id: 'p1', name: 'Sam' }, { id: 'p2', name: 'Ana' }];
  const tasks = Array.from({ length: 40 }, (_, i) => ({ id: 't' + i, title: 'Task ' + i, people: i % 3 ? ['p1'] : ['p2'] }));
  const box = {
    console, state: { people, custom: tasks, statuses: { t1: 'done' } },
    document: { addEventListener() {} },
    getAllItems: () => tasks, statusOf: (id) => (id === 't1' ? 'done' : 'todo'),
    pplBuildIndex: () => ({}), pplLinked: (s, t) => t.people || [],
  };
  vm.createContext(box);
  vm.runInContext(readFileSync(join(APP, '50-people.js'), 'utf8'), box, { filename: '50-people.js' });
  vm.runInContext('var __sig = 0; const __orig = _pplSig; _pplSig = function () { __sig++; return __orig(); };', box);
  const all = vm.runInContext(`tasksForPerson('p1').map(t => t.id)`, box);
  assert.equal(vm.runInContext('__sig', box), 1);
  assert.equal(all.length, tasks.filter(t => t.people.includes('p1')).length);
  assert.equal(vm.runInContext(`openTaskCountFor('p1')`, box), all.length - 1, 'open only: t1 is done');
});
