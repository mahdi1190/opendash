// Home as a grid of widgets: the layout model (lib/home-topbar.mjs and the
// page's copy in src/app/12-home.js, run on the same data), the widget
// registry the page builds at load, the once-per-entry entrance logic, the
// order helper edit mode uses, and the actions-layer ops set_home_layout /
// reset_home_layout / get_home_layout. Synthetic data only.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { HOME_WIDGETS, HOME_SIZES, HOME_SIZE_COLS, normalizeHomeLayout, clampHomeSize, findHomeWidget } from '../lib/home-topbar.mjs';
import { createActions } from '../server/actions/index.mjs';
import { OP_BY_TOOL } from '../server/actions/ops.mjs';
import { QUERY_BY_TOOL } from '../server/actions/queries.mjs';
import { makeDataDir, TODAY } from './fixtures/actions-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const HOME_FILES = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort();
const plain = (x) => JSON.parse(JSON.stringify(x));

/* ───────── the page's Home files in a VM, as ONE script in build order (like build.mjs) ───────── */
function homeBox(state) {
  const sections = {};
  const st = state || { custom: [{ id: 't1', title: 'One' }, { id: 't2', title: 'Two' }], statuses: { t2: 'done' }, pinned: {}, deleted: {} };
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {} },
    window: { addEventListener() {} }, CSS: { escape: (s) => s },
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null },
    registerSection: (name, def) => { sections[name] = def; },
    saveData() {}, saveUI() {}, render() {}, toast() {}, todayStr: () => TODAY,
    getItem: (id) => st.custom.find(t => t.id === id) || null, statusOf: (id) => (st.statuses && st.statuses[id]) || 'todo',
  };
  vm.createContext(box);
  vm.runInContext(HOME_FILES.map(f => readFileSync(join(APP, f), 'utf8')).join('\n'), box, { filename: 'home-bundle.js' });
  return { box, sections, run: (code) => vm.runInContext(code, box) };
}

test('Home is split into a core and widget files that load in build order without errors', () => {
  assert.ok(HOME_FILES.includes('12-home.js'));
  for (const f of ['12-home-grid.js', '12-home-edit.js', '12-home-drag.js']) assert.ok(HOME_FILES.includes(f), f);
  const widgets = HOME_FILES.filter(f => /^12-home-w-/.test(f));
  assert.ok(widgets.length >= 8, widgets.join(', '));
  // build.mjs sorts by name: every 12-home-*.js comes BEFORE 12-home.js, so the
  // registry has to work before the core file has run (it does: homeBox loads them so).
  assert.equal([...HOME_FILES].sort().at(-1), '12-home.js');
  const { sections } = homeBox();
  assert.equal(typeof sections.home.mount, 'function');
  assert.equal(typeof sections.home.unmount, 'function');
});

test('widget files only declare things and register at load (no page code runs before boot)', () => {
  for (const f of HOME_FILES.filter(n => /^12-home-w-/.test(n))) {
    const lines = readFileSync(join(APP, f), 'utf8').split('\n');
    const bad = lines.map((l, i) => [i + 1, l]).filter(([, l]) => l && !/^(\s|\/\*|\/\/|\*|function |async function |const |let |registerHomeWidget\(|\}|\]|\))/.test(l));
    assert.deepEqual(bad, [], `${f}: top-level statements other than declarations / registerHomeWidget`);
    assert.match(readFileSync(join(APP, f), 'utf8'), /registerHomeWidget\(\{/, `${f} registers a widget`);
  }
});

test('the page registers exactly the catalogue the server knows (ids, order, sizes, defaults)', () => {
  const { run } = homeBox();
  const page = JSON.parse(run('JSON.stringify(homeWidgetCatalog().map(d => ({ id: d.id, sizes: d.sizes, defaultSize: d.defaultSize, defaultHidden: d.defaultHidden })))'));
  const lib = HOME_WIDGETS.map(w => ({ id: w.id, sizes: [...w.sizes], defaultSize: w.defaultSize, defaultHidden: w.defaultHidden }));
  assert.deepEqual(page, lib, 'add or change the widget in lib/home-topbar.mjs HOME_WIDGETS too');
  // Every widget has a title, an icon and a description for the gallery.
  const meta = JSON.parse(run('JSON.stringify(homeWidgetCatalog().map(d => [d.id, d.title, d.icon, d.description]))'));
  for (const [id, title, ic, desc] of meta) { assert.ok(title && title !== id, id + ' title'); assert.ok(ic, id + ' icon'); assert.ok(desc, id + ' description'); }
  // Sizes are only the four known ones, in canonical order.
  for (const w of HOME_WIDGETS) assert.deepEqual([...w.sizes], HOME_SIZES.filter(s => w.sizes.includes(s)), w.id);
  assert.deepEqual(HOME_SIZE_COLS, { s: 4, m: 6, l: 8, full: 12 });
});

test('size clamping: allowed sizes kept, others go to the nearest (ties to the larger), junk to the default', () => {
  assert.equal(clampHomeSize('m', ['s', 'm'], 's'), 'm');
  assert.equal(clampHomeSize('s', ['m', 'l', 'full'], 'l'), 'm');
  assert.equal(clampHomeSize('m', ['l', 'full'], 'full'), 'l');
  assert.equal(clampHomeSize('m', ['s', 'l'], 's'), 'l', 'tie (2 columns either way): the larger');
  assert.equal(clampHomeSize('full', ['s', 'm', 'l'], 's'), 'l');
  assert.equal(clampHomeSize('xl', ['s', 'm'], 'm'), 'm');
  assert.equal(clampHomeSize(undefined, ['l', 'full'], 'full'), 'full');
  assert.equal(clampHomeSize(null, ['l', 'full'], 'nope'), 'l');
});

test('layout normalisation: unknown ids and repeats dropped, sizes clamped, missing widgets appended; page and server agree', () => {
  const ids = (l) => l.widgets.map(w => w.id);
  const def = normalizeHomeLayout(undefined);
  assert.equal(def.version, 1);
  assert.deepEqual(ids(def), HOME_WIDGETS.map(w => w.id), 'no layout = the catalogue order');
  assert.deepEqual(def.widgets.filter(w => w.hidden).map(w => w.id), HOME_WIDGETS.filter(w => w.defaultHidden).map(w => w.id), 'only the default-hidden ones are hidden');
  assert.ok(def.widgets.every(w => w.size === HOME_WIDGETS.find(c => c.id === w.id).defaultSize));

  const messy = { version: 7, widgets: [{ id: 'finance' }, { id: 'nope', size: 'l' }, { id: 'focus', size: 's' }, { id: 'finance', size: 'l' }, { id: 'week', size: 'm', hidden: 1 }, null, 'x', { id: 5 }, { id: 'people', hidden: true, size: 'enormous' }] };
  const n = normalizeHomeLayout(messy);
  const stored = ['finance', 'focus', 'week', 'people'];
  assert.deepEqual(ids(n).filter(id => stored.includes(id)), stored, 'stored order kept, unknown and repeated ids dropped');
  assert.deepEqual(stored.map(id => n.widgets.find(w => w.id === id)).map(w => [w.size, w.hidden]), [['s', false], ['m', false], ['l', false], ['s', true]]);
  assert.deepEqual(ids(n).slice().sort(), HOME_WIDGETS.map(w => w.id).sort(), 'every widget exactly once');
  // A missing one goes in right after its catalogue neighbour (integrator, 4 Oct: a new
  // default widget lands where it belongs on an old board); the catalogue's first goes last.
  const cat = HOME_WIDGETS.map(w => w.id);
  for (const id of cat.filter(x => !stored.includes(x))) {
    const i = cat.indexOf(id);
    if (i > 0) assert.equal(ids(n)[ids(n).indexOf(id) - 1], cat[i - 1], id + ' follows ' + cat[i - 1]);
  }
  for (const w of n.widgets.filter(x => !stored.includes(x.id))) assert.equal(w.hidden, HOME_WIDGETS.find(c => c.id === w.id).defaultHidden, w.id + ' added with its default visibility');
  assert.equal(n.version, 1);
  assert.deepEqual(normalizeHomeLayout(messy.widgets), n, 'a bare array works too');
  for (const junk of ['x', 42, null, { widgets: 'no' }, [null, 1, 'a', { id: 5 }]]) assert.deepEqual(normalizeHomeLayout(junk), def);
  assert.deepEqual(normalizeHomeLayout(n), n, 'idempotent');

  const { run } = homeBox();
  const cases = [undefined, messy, messy.widgets, { widgets: [{ id: 'countdowns', size: 'full' }, { id: 'today', size: 's' }] }, 'junk', { widgets: HOME_WIDGETS.map(w => ({ id: w.id, size: 'm', hidden: false })) }];
  for (const raw of cases) {
    const page = JSON.parse(run(`JSON.stringify(homeLayoutNormalize(${JSON.stringify(raw === undefined ? null : raw)}, homeWidgetCatalog()))`));
    assert.deepEqual(page, plain(normalizeHomeLayout(raw === undefined ? null : raw)), JSON.stringify(raw));
  }
});

test('reordering the shown widgets keeps hidden ones in their slots (edit mode drag / Alt+arrows)', () => {
  const { run } = homeBox();
  const six = ['today', 'focus', 'waiting', 'schedule', 'finance', 'countdowns'];
  const lay = normalizeHomeLayout({ widgets: [{ id: 'today' }, { id: 'focus' }, { id: 'waiting', hidden: true }, { id: 'schedule' }, { id: 'finance', size: 'm' }, { id: 'countdowns', hidden: true }] }).widgets
    .filter(w => six.includes(w.id));
  const out = JSON.parse(run(`JSON.stringify(homeLayoutReorder(${JSON.stringify(lay)}, ['finance', 'today', 'nope', 'finance', 'countdowns'], w => !w.hidden))`));
  assert.equal(out.length, lay.length);
  assert.deepEqual(out.map(w => w.id).slice(0, 5), ['finance', 'today', 'waiting', 'focus', 'schedule'], 'waiting (hidden) keeps slot 2; unknown, repeated and hidden ids ignored');
  assert.equal(out[0].size, 'm', 'sizes travel with their widget');
  // Every widget still there exactly once.
  assert.deepEqual(out.map(w => w.id).sort(), lay.map(w => w.id).sort());
  // A no-op order leaves it alone.
  assert.deepEqual(JSON.parse(run(`JSON.stringify(homeLayoutReorder(${JSON.stringify(lay)}, [], w => !w.hidden))`)), lay);
});

test('entrance once per entry: firstPaint only on entering Home (or a newly added widget), never on re-renders', () => {
  const { run, sections } = homeBox();
  assert.equal(run('_homeEntryBegin()'), true, 'first mount = entering');
  assert.equal(run('_homeEntryFirst("focus")'), true);
  assert.equal(run('_homeEntryFirst("focus")'), false, 'same widget again in this entry');
  assert.equal(run('_homeEntryBegin()'), false, 'a re-render (save, live sync, undo) is not an entry');
  assert.equal(run('_homeEntryFirst("focus")'), false);
  assert.equal(run('_homeEntryFirst("finance")'), true, 'a widget painting for the first time (just added) gets its entrance');
  // Hiding a widget forgets it, so adding it back plays the entrance again.
  run('_homeEntry.painted.delete("finance")');
  assert.equal(run('_homeEntryFirst("finance")'), true);
  sections.home.unmount();                                   // leave Home
  assert.equal(run('_homeEntryBegin()'), true, 'coming back is a new entry');
  assert.equal(run('_homeEntryFirst("focus")'), true);
});

test('ctx.isNew remembers items per widget for the whole entry; one answer per render', () => {
  const { run, sections } = homeBox();
  run('_homeEntryBegin()');
  run('var rec = { def: { id: "focus" }, frame: {}, size: "l", sortables: [] }; var c1 = _homeCtx(rec, true);');
  assert.equal(run('c1.firstPaint'), true);
  assert.equal(run('c1.isNew("t1")'), true);
  assert.equal(run('c1.isNew("t1")'), true, 'same render: same answer');
  assert.equal(run('_homeEntryBegin(); var c2 = _homeCtx(rec, false); c2.isNew("t1")'), false, 'next render: already seen');
  assert.equal(run('c2.isNew("t3")'), true, 'a task that just joined');
  assert.equal(run('var other = _homeCtx({ def: { id: "week" }, frame: {}, size: "full", sortables: [] }, false); other.isNew("t1")'), true, 'per widget');
  assert.equal(run('c2.enterNew([{ dataset: { id: "t1" } }, { dataset: { id: "t9" } }])'), 1, 'enterNew counts the new ones (and animates only those)');
  sections.home.unmount();
  run('_homeEntryBegin()');
  assert.equal(run('_homeCtx(rec, true).isNew("t1")'), true, 'a new entry starts fresh');
});

test('expanded cards live in UI state (homeUI), survive re-renders and drop closed or missing tasks', () => {
  const { run, box } = homeBox();
  assert.equal(run('homeSetExpanded("t1")'), true);
  assert.deepEqual(plain(box.state.homeUI.expanded), ['t1']);
  run('_homeEntryBegin()');
  assert.equal(run('_homeCtx({ def: { id: "focus" }, frame: {}, size: "l", sortables: [] }, false).expanded.has("t1")'), true);
  run('homeSetExpanded("t2", true); homeSetExpanded("ghost", true)');
  assert.deepEqual(plain(box.state.homeUI.expanded), ['t1'], 'done (t2) and unknown ids are not kept');
  assert.equal(run('homeSetExpanded("t1")'), false);
  assert.deepEqual(plain(box.state.homeUI.expanded), []);
  assert.equal(box.state.home, undefined, 'expanding never touches data');
  // homeUI is a UI-only key on both sides (no undo step, no backup).
  const page = readFileSync(join(APP, '01-core-state.js'), 'utf8');
  assert.match(page.slice(page.indexOf('const UI_STATE_KEYS'), page.indexOf('];', page.indexOf('const UI_STATE_KEYS'))), /'homeUI'/);
});

test('widget lookup by id, title or alias (what an assistant may say)', () => {
  assert.equal(findHomeWidget('finance').id, 'finance');
  assert.equal(findHomeWidget('Finances').id, 'finance');
  assert.equal(findHomeWidget('  money ').id, 'finance');
  assert.equal(findHomeWidget("today's schedule").id, 'schedule');
  assert.equal(findHomeWidget('Today’s schedule').id, 'schedule');
  assert.equal(findHomeWidget('calendar').id, 'schedule');
  assert.equal(findHomeWidget('Follow up').id, 'people');
  assert.equal(findHomeWidget('this week').id, 'week');
  assert.equal(findHomeWidget('nonsense'), null);
  assert.equal(findHomeWidget(''), null);
});

/* ───────────────────────────── actions ───────────────────────────── */
let dir, a;
beforeEach(() => { dir = makeDataDir(); a = createActions({ dataDir: dir }); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const disk = () => JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
const run = (ops, extra = {}) => a.apply({ ops, source: 'mcp', client: 'test', ...extra });
const shown = (q) => q.widgets.filter(w => !w.hidden).map(w => w.id);
const rejects = async (p, code, check) => {
  try { await p; } catch (e) { assert.equal(e.code, code, `${e.code}: ${e.message}`); if (check) check(e); return e; }
  assert.fail(`expected ${code}`);
};

test('the tools exist with read/write names the propose allowlist accepts', () => {
  assert.ok(OP_BY_TOOL.get('set_home_layout'), 'set_home_layout');
  assert.ok(OP_BY_TOOL.get('reset_home_layout'), 'reset_home_layout');
  assert.ok(QUERY_BY_TOOL.get('get_home_layout'), 'get_home_layout');
  assert.match(OP_BY_TOOL.get('set_home_layout').description, /move Finances to the top/);
  const instr = readFileSync(join(ROOT, 'mcp', 'instructions.mjs'), 'utf8');
  for (const t of ['get_home_layout', 'set_home_layout', 'reset_home_layout']) assert.ok(instr.includes(t), t + ' in the MCP instructions');
});

test('get_home_layout: the defaults, in page order, with sizes and positions', async () => {
  const q = await a.query('home.layout');
  assert.equal(q.custom, false);
  assert.deepEqual(q.widgets.map(w => w.id), HOME_WIDGETS.map(w => w.id));
  assert.deepEqual(shown(q), HOME_WIDGETS.filter(w => !w.defaultHidden).map(w => w.id));
  assert.deepEqual(q.widgets.filter(w => !w.hidden).map(w => w.position), shown(q).map((_, i) => i));
  assert.equal(!!q.widgets.find(w => w.id === 'countdowns').hidden, HOME_WIDGETS.find(w => w.id === 'countdowns').defaultHidden);
  assert.deepEqual(q.widgets.find(w => w.id === 'focus').sizes, ['m', 'l', 'full']);
  assert.ok(q.sizes.s && q.sizes.full);
});

test('set_home_layout: "move Finances to the top", resize, hide, show, before/after, order', async () => {
  const r = await run([{ op: 'home.set_layout', widgets: [{ id: 'Finances', position: 0 }] }]);
  assert.match(r.summary, /Money/);
  assert.ok(r.undo);
  let q = await a.query('home.layout');
  assert.equal(shown(q)[0], 'finance');
  assert.equal(q.custom, true);
  assert.equal(disk().home.layout.version, 1);
  assert.equal(disk().home.layout.widgets[0].id, 'finance');

  await run([{ op: 'home.set_layout', widgets: [{ id: 'focus', size: 'full' }, { id: 'people', hidden: true }, { id: 'countdowns', hidden: false, after: 'focus' }] }]);
  q = await a.query('home.layout');
  assert.equal(q.widgets.find(w => w.id === 'focus').size, 'full');
  assert.equal(q.widgets.find(w => w.id === 'people').hidden, true);
  const s = shown(q);
  assert.equal(s[s.indexOf('focus') + 1], 'countdowns', 'shown again, right after Focus');

  await run([{ op: 'home.set_layout', widgets: [{ id: 'week', before: 'focus' }, { id: 'schedule', position: 20 }] }]);
  q = await a.query('home.layout');
  assert.equal(shown(q)[shown(q).indexOf('focus') - 1], 'week');
  assert.equal(shown(q).at(-1), 'schedule', 'a position past the end = last');

  await run([{ op: 'home.set_layout', order: ['waiting', 'today'] }]);
  q = await a.query('home.layout');
  assert.deepEqual(shown(q).slice(0, 2), ['waiting', 'today']);
  // Nothing to change: a warning, no error.
  const same = await run([{ op: 'home.set_layout', order: ['waiting', 'today'] }]);
  assert.ok((same.warnings || []).some(w => /nothing to change/.test(w.message)), JSON.stringify(same.warnings));
});

test('set_home_layout validates: unknown widget, sizes it does not allow, two moves at once, empty changes', async () => {
  await rejects(run([{ op: 'home.set_layout', widgets: [{ id: 'weather', position: 0 }] }]), 'NOT_FOUND', e => { assert.ok(e.valid.includes('finance')); assert.match(e.hint, /finance = "Money"/); });
  await rejects(run([{ op: 'home.set_layout', widgets: [{ id: 'finance', size: 'full' }] }]), 'BAD_VALUE', e => assert.deepEqual(e.valid, ['s', 'm', 'l']));
  await rejects(run([{ op: 'home.set_layout', widgets: [{ id: 'finance', size: 'xl' }] }]), 'INVALID_PARAMS');
  await rejects(run([{ op: 'home.set_layout', widgets: [{ id: 'finance', position: 0, after: 'focus' }] }]), 'BAD_VALUE');
  await rejects(run([{ op: 'home.set_layout', widgets: [{ id: 'finance', before: 'finance' }] }]), 'BAD_VALUE');
  await rejects(run([{ op: 'home.set_layout', widgets: [{ id: 'finance' }] }]), 'INVALID_PARAMS');
  await rejects(run([{ op: 'home.set_layout' }]), 'INVALID_PARAMS');
  await rejects(run([{ op: 'home.set_layout', order: ['finance', 'Finances'] }]), 'BAD_VALUE');
  await rejects(run([{ op: 'home.set_layout', widgets: [{ id: 'finance', position: -1 }] }]), 'INVALID_PARAMS');
  assert.equal(disk().home, undefined, 'nothing was written');
});

test('set_home_layout: dry run writes nothing; undo puts the old layout back; reset keeps Focus settings', async () => {
  const before = readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8');
  const dry = await run([{ op: 'home.set_layout', widgets: [{ id: 'finance', position: 0 }] }], { dryRun: true });
  assert.match(dry.summary || JSON.stringify(dry), /Money/);
  assert.equal(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'), before);

  await run([{ op: 'home.set_focus', count: 3 }]);
  const r1 = await run([{ op: 'home.set_layout', widgets: [{ id: 'finance', position: 0 }] }]);
  const r2 = await run([{ op: 'home.set_layout', widgets: [{ id: 'focus', size: 'm' }] }]);
  await a.undo(r2.undo);
  let q = await a.query('home.layout');
  assert.equal(q.widgets.find(w => w.id === 'focus').size, 'l', 'undone');
  assert.equal(shown(q)[0], 'finance', 'the earlier change stays');
  await a.undo(r1.undo);
  q = await a.query('home.layout');
  assert.equal(shown(q)[0], 'today');

  await run([{ op: 'home.set_layout', widgets: [{ id: 'week', position: 0 }] }]);
  const rs = await run([{ op: 'home.reset_layout' }]);
  assert.match(rs.summary, /default/);
  const s = disk();
  assert.equal(s.home.layout, undefined);
  assert.equal(s.home.focus.count, 3, 'Focus settings are kept');
  assert.equal((await a.query('home.layout')).custom, false);
  const again = await run([{ op: 'home.reset_layout' }]);
  assert.ok((again.warnings || []).some(w => /default layout/.test(w.message)), JSON.stringify(again.warnings));
});

test('a messy stored layout is read back normalised by the server', async () => {
  await run([{ op: 'home.set_layout', widgets: [{ id: 'finance', position: 0 }] }]);
  // Simulate an older or hand-edited file: unknown ids, bad sizes, repeats.
  const file = join(dir, 'state', 'dashboard-state.json');
  const s = disk();
  s.home.layout = { version: 1, widgets: [{ id: 'gone' }, { id: 'focus', size: 's' }, { id: 'focus', size: 'full' }, { id: 'week', size: 'm' }] };
  s._lastSave = Date.now();
  (await import('node:fs')).writeFileSync(file, JSON.stringify(s));
  const q = await a.query('home.layout');
  assert.deepEqual(q.widgets.filter(w => ['focus', 'week'].includes(w.id)).map(w => [w.id, w.size]), [['focus', 'm'], ['week', 'l']]);
  assert.equal(q.widgets.length, HOME_WIDGETS.length);
  // And the next change stores a clean layout.
  await run([{ op: 'home.set_layout', widgets: [{ id: 'people', position: 0 }] }]);
  assert.deepEqual(disk().home.layout.widgets.map(w => w.id).sort(), HOME_WIDGETS.map(w => w.id).sort());
});

test('a widget height (rows) set in Customise is kept when valid, dropped otherwise; page and lib agree', () => {
  const raw = { widgets: [{ id: 'focus', size: 'l', h: 11 }, { id: 'schedule', h: 2 }, { id: 'finance', h: 31 }, { id: 'people', h: 6.5 }, { id: 'countdowns', h: '8' }, { id: 'week', h: 30 }] };
  const n = normalizeHomeLayout(raw).widgets;
  const h = (id) => n.find(w => w.id === id).h;
  assert.equal(h('focus'), 11);
  assert.equal(h('week'), 30);
  for (const id of ['schedule', 'finance', 'people', 'countdowns']) assert.equal(h(id), undefined, id);
  assert.ok(!('h' in n.find(w => w.id === 'schedule')), 'no h key at all when it is auto');
  assert.deepEqual(normalizeHomeLayout({ widgets: n }).widgets, n, 'idempotent');
  const { run } = homeBox();
  assert.deepEqual(JSON.parse(run(`JSON.stringify(homeLayoutNormalize(${JSON.stringify(raw)}, homeWidgetCatalog()))`)), plain(normalizeHomeLayout(raw)));
});

test('grid editor: where a dragged widget lands (homeShelfDropIndex, pure)', () => {
  const { run } = homeBox();
  const at = (boxes, x, y) => run(`homeShelfDropIndex(${JSON.stringify(boxes)}, ${x}, ${y}, 1200)`);
  // shelf 1: A (0-400) B (416-800); shelf 2: C full width (0-1200); shelf 3: D (0-400), then empty columns
  const b = [
    { left: 0, top: 0, right: 400, bottom: 300 }, { left: 416, top: 0, right: 800, bottom: 300 },
    { left: 0, top: 316, right: 1200, bottom: 500 }, { left: 0, top: 516, right: 400, bottom: 700 },
  ];
  assert.equal(at(b, 100, 100), 0, 'left half of A: before A');
  assert.equal(at(b, 300, 100), 1, 'right half of A: after A');
  assert.equal(at(b, 700, 100), 2, 'right half of B: after B');
  assert.equal(at(b, 900, 100), 2, 'the empty end of shelf 1: after B');
  assert.equal(at(b, 1000, 350), 2, 'a full-width widget: top half = before it');
  assert.equal(at(b, 100, 480), 3, 'bottom half = after it');
  assert.equal(at(b, 900, 600), 4, 'the empty end of the last shelf: after D');
  assert.equal(at(b, 500, 900), 4, 'below everything: last');
  assert.equal(at(b, 408, 100), null, 'in the gap between two widgets: no change');
  assert.equal(at([], 10, 10), null);
});

test('grid editor keys: arrows move, Shift+arrows resize, 0 = fits its content; Customise has its own Undo', () => {
  const src = readFileSync(join(APP, '12-home-edit.js'), 'utf8');
  assert.match(src, /if \(e\.shiftKey\) \{ if \(vert\) homeWidgetHeightStep\(id, fwd\); else homeWidgetStep\(id, fwd\); \}/);
  assert.match(src, /else if \(vert\) homeWidgetMoveRow\(id, fwd\);/);
  assert.match(src, /else homeWidgetMove\(id, fwd\);/);
  assert.match(src, /homeEditUndo\(\)/);
  assert.match(src, /_homeGridEditor\(grid\)/);
  const core = readFileSync(join(APP, '12-home.js'), 'utf8');
  assert.match(core, /if \(_homeEditing && typeof _homeEditPushUndo === 'function'\) _homeEditPushUndo\(\);/);
  const { run } = homeBox();
  run(`state.home = { layout: { version: 1, widgets: [{ id: 'focus', size: 'm', hidden: false }] } }; _homeEditing = true; _homeEditUndo = []; homeAnnounce = () => {}; _homeRememberNow = () => {};`);
  run(`homeWidgetSet('focus', { size: 'l', h: 9 }, 'x')`);
  assert.deepEqual(plain(run(`homeLayout().widgets.find(w => w.id === 'focus')`)), { id: 'focus', size: 'l', hidden: false, h: 9 });
  run(`homeWidgetSet('focus', { h: null }, 'x')`);
  assert.deepEqual(plain(run(`homeLayout().widgets.find(w => w.id === 'focus')`)), { id: 'focus', size: 'l', hidden: false });
  assert.equal(run('_homeEditUndo.length'), 2);
  run('homeEditUndo()');
  assert.equal(run(`homeLayout().widgets.find(w => w.id === 'focus').h`), 9, 'Undo brings the height back');
  run('_homeEditing = false');
});
