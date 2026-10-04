// The Home widget platform (WIDGETS_CATALOGUE.md 4.1, W0-A): catalogue extras
// (group, multi, aliases) on both sides, the 16 v1 stubs, widget settings
// (page helpers and the set_home_widget op), copies of one widget (runway~2...),
// homeData / homeTick / homeAction / homeMemo / homeSample, the gallery's "New"
// badge and filter, Hide amounts. The page files run in a VM, as one script in
// build order (like build.mjs). Synthetic data only.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import {
  HOME_WIDGETS, HOME_WIDGET_GROUPS, HOME_WIDGET_PREFS, HOME_WIDGET_PREFS_MAX_BYTES, normalizeHomeLayout,
  splitHomeInstance, homeCatalogEntry, homeInstanceTitle, findHomeInstance, mergeWidgetPrefs, findHomeWidget,
} from '../lib/home-topbar.mjs';
import { check } from '../server/actions/validate.mjs';
import { createActions } from '../server/actions/index.mjs';
import { OP_BY_TOOL } from '../server/actions/ops.mjs';
import { makeDataDir, TODAY } from './fixtures/actions-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const STYLES = join(ROOT, 'src', 'styles');
const HOME_FILES = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort();
const plain = (x) => JSON.parse(JSON.stringify(x));
const V1 = ['capture', 'gap', 'dayplan', 'nextup', 'wrapup', 'calcheck', 'inbox', 'owe', 'catchup', 'runway', 'list', 'habits', 'launchpad', 'spendable', 'notebook', 'activity'];

/* ───────── the page's Home files in a VM ───────── */
function fakeEl() {
  const attrs = {}; const classes = new Set();
  return {
    dataset: {}, innerHTML: '', textContent: '', disabled: false, isConnected: true, style: {},
    getAttribute: (k) => (Object.hasOwn(attrs, k) ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = String(v); },
    removeAttribute: (k) => { delete attrs[k]; }, hasAttribute: (k) => Object.hasOwn(attrs, k),
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c), toggle: (c, on) => (on === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : on ? classes.add(c) : classes.delete(c)) },
    appendChild() {}, querySelector: () => null, querySelectorAll: () => [], _attrs: attrs, _classes: classes,
  };
}
function homeBox(stateIn) {
  const st = stateIn || { custom: [], statuses: {}, pinned: {}, deleted: {} };
  const toasts = [];
  const timers = [];
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {} },
    window: { addEventListener() {} }, CSS: { escape: (s) => s }, TextEncoder,
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => fakeEl(), body: { appendChild() {} }, hidden: false },
    registerSection() {}, render() {}, undo() { box._undone = (box._undone || 0) + 1; },
    saveData() { st._saveCount = (st._saveCount || 0) + 1; }, saveUI() { box._ui = (box._ui || 0) + 1; },
    toast: (msg, o) => toasts.push({ msg, o }), todayStr: () => TODAY,
    fmtDate: (d) => d.toISOString().slice(0, 10),
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout() {},
    esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    escAttr: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    icon: (n) => `<i data-i="${n}"></i>`,
    netErrorMessage: (e, fb) => (e && e.message) || fb || 'Something went wrong. Try again.',
    getItem: (id) => st.custom.find(t => t.id === id) || null, statusOf: (id) => (st.statuses && st.statuses[id]) || 'todo',
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock: wall times in the dashboard's zone (travel spec 2.7)
  vm.runInContext(HOME_FILES.map(f => readFileSync(join(APP, f), 'utf8')).join('\n'), box, { filename: 'home-bundle.js' });
  return { box, toasts, timers, run: (code) => vm.runInContext(code, box), json: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, box)) };
}

/* ───────────────────────────── catalogue ───────────────────────────── */
test('the catalogue knows the 16 v1 widgets: hidden by default, after Waiting on, with groups and copies', () => {
  const ids = HOME_WIDGETS.map(w => w.id);
  for (const id of V1) assert.ok(ids.includes(id), id);
  for (const id of V1) assert.equal(HOME_WIDGETS.find(w => w.id === id).defaultHidden, true, `${id} must be hidden by default (or it appears on every board)`);
  assert.ok(ids.indexOf('capture') > ids.indexOf('waiting'), 'the v1 widgets come after the existing ones');
  for (const w of HOME_WIDGETS) assert.ok(Object.hasOwn(HOME_WIDGET_GROUPS, w.group), `${w.id}: group ${w.group}`);
  assert.equal(HOME_WIDGETS.find(w => w.id === 'runway').multi, 4);
  assert.equal(HOME_WIDGETS.find(w => w.id === 'list').multi, 6);
  assert.equal(HOME_WIDGETS.filter(w => w.multi > 1).length, 2);
  // Every name an assistant may use points at exactly one widget.
  const seen = new Map();
  for (const w of HOME_WIDGETS) {
    for (const n of [w.id, w.title, ...w.aliases].map(x => x.toLowerCase().replace(/[’']/g, "'"))) {
      assert.ok(!seen.has(n) || seen.get(n) === w.id, `"${n}" names both ${seen.get(n)} and ${w.id}`);
      seen.set(n, w.id);
    }
  }
});

test('page and server agree on groups, copies, titles and words (and the stubs carry them)', () => {
  const { json } = homeBox();
  const page = json('homeWidgetCatalog().map(d => ({ id: d.id, group: d.group, multi: d.multi, title: d.title, aliases: d.aliases }))');
  for (const w of HOME_WIDGETS) {
    const p = page.find(x => x.id === w.id);
    if (!p) continue;                                        // registered by a file outside 12-home* (the parity test in home-layout covers ids)
    assert.equal(p.group, w.group, `${w.id} group`);
    assert.equal(p.multi, w.multi, `${w.id} multi`);
    if (p.aliases.length) assert.deepEqual(p.aliases, [...w.aliases], `${w.id} aliases (lib/home-topbar.mjs and the page)`);
  }
  for (const id of V1) {
    const p = page.find(x => x.id === id);
    assert.ok(p, `${id} is registered on the page`);
    assert.equal(p.title, HOME_WIDGETS.find(w => w.id === id).title, `${id} title`);
    assert.ok(p.aliases.length, `${id} has words for the gallery filter`);
  }
});

test('each v1 widget has its own stub files with an OWNER line, and is fresh (a "New" badge)', () => {
  const { json } = homeBox();
  const defs = json(`homeWidgetDefs().filter(d => ${JSON.stringify(V1)}.includes(d.id)).map(d => ({ id: d.id, fresh: d.fresh, defaultHidden: d.defaultHidden, order: d.order, render: typeof d.render }))`);
  assert.equal(defs.length, 16);
  for (const id of V1) {
    const js = join(APP, `12-home-w-${id}.js`), css = join(STYLES, `13-home-w-${id}.css`);
    assert.ok(existsSync(js), js); assert.ok(existsSync(css), css);
    assert.match(readFileSync(js, 'utf8'), /OWNER: /, `${id}: the JS file says who owns it`);
    assert.match(readFileSync(css, 'utf8'), /OWNER: /, `${id}: the CSS file says who owns it`);
    assert.match(readFileSync(js, 'utf8'), new RegExp(`id: '${id}'`), `${id}: registers itself`);
    const d = defs.find(x => x.id === id);
    assert.equal(d.fresh, true); assert.equal(d.defaultHidden, true); assert.ok(d.order >= 100, `${id}: order from 100`);
  }
  const orders = defs.map(d => d.order);
  assert.equal(new Set(orders).size, orders.length, 'distinct orders');
});

test('an unavailable widget is offered nowhere: not on the board, not in the gallery, not counted', () => {
  const { json, run } = homeBox();
  run('registerHomeWidget({ id: "zz", title: "Zed", sizes: ["s"], defaultHidden: false, available: () => false, render: () => true, description: "x" })');
  assert.equal(json('homeWidgetAvailable(homeWidgetDef("zz"))'), false);
  assert.equal(json('homeWidgetCatalog().filter(homeWidgetAvailable).some(d => d.id === "zz")'), false);
  // A stub stays in the layout (hidden), so the server and the page agree on the catalogue.
  assert.equal(json('homeLayout().widgets.find(w => w.id === "capture").hidden'), true);
});

/* ───────────────────────────── settings schemas ───────────────────────────── */
test('every v1 widget has a settings schema, and its page defaults fit it exactly', () => {
  const { json } = homeBox();
  const defaults = Object.fromEntries(json(`homeWidgetDefs().filter(d => ${JSON.stringify(V1)}.includes(d.id)).map(d => [d.id, d.defaults || {}])`));
  for (const id of V1) {
    const schema = HOME_WIDGET_PREFS[id];
    assert.ok(schema, `${id} has HOME_WIDGET_PREFS`);
    assert.deepEqual(Object.keys(defaults[id]).sort(), Object.keys(schema.properties).sort(), `${id}: the page defaults and the server schema have the same keys`);
    const set = Object.fromEntries(Object.entries(defaults[id]).filter(([, v]) => v !== null));      // null = not set (the default)
    assert.deepEqual(check(schema, set, 'settings'), [], `${id} defaults fit the schema`);
    assert.ok(Buffer.byteLength(JSON.stringify(defaults[id])) < HOME_WIDGET_PREFS_MAX_BYTES);
  }
  assert.deepEqual(mergeWidgetPrefs({ a: 1, b: 2 }, { a: null, c: 3, d: undefined }), { b: 2, c: 3 });
  assert.deepEqual(mergeWidgetPrefs(null, JSON.parse('{"__proto__": {"x": 1}, "y": 2}')), { y: 2 });
});

/* ───────────────────────────── copies ───────────────────────────── */
test('copy ids: runway~2..runway~4 and list~2..list~6 are legal; nothing else is', () => {
  assert.deepEqual(splitHomeInstance('runway~2'), { base: 'runway', n: 2 });
  assert.deepEqual(splitHomeInstance('runway'), { base: 'runway', n: 1 });
  assert.deepEqual(splitHomeInstance('runway~1'), { base: 'runway~1', n: 1 });
  assert.deepEqual(splitHomeInstance('runway~02'), { base: 'runway~02', n: 1 });
  assert.ok(homeCatalogEntry('runway~4')); assert.equal(homeCatalogEntry('runway~5'), null);
  assert.ok(homeCatalogEntry('list~6')); assert.equal(homeCatalogEntry('list~7'), null);
  assert.equal(homeCatalogEntry('finance~2'), null, 'a widget without copies');
  assert.equal(homeCatalogEntry('nope~2'), null);
  assert.equal(homeInstanceTitle('runway~3'), 'Deadline runway 3');
  assert.equal(homeInstanceTitle('list'), 'Smart list');
  assert.deepEqual(plain(findHomeInstance('runway~2')).id, 'runway~2');
  assert.equal(findHomeInstance('Smart list 3').id, 'list~3');
  assert.equal(findHomeInstance('smart list').id, 'list');
  assert.equal(findHomeInstance('next 7 days').id, 'week', 'an alias that ends in a number is still the alias');
  assert.equal(findHomeInstance('Money 2'), null);
  assert.equal(findHomeWidget('runway~2'), null, 'findHomeWidget stays plain names');
});

test('layout normalisation with copies and settings: page and server agree', () => {
  const ids = (l) => l.widgets.map(w => w.id);
  const base = normalizeHomeLayout(undefined);
  const raw = { widgets: [{ id: 'runway~2', size: 'l' }, { id: 'runway~2' }, { id: 'runway~5' }, { id: 'list~7' }, { id: 'runway~1' }, { id: 'finance~2' }, { id: 'list~3', hidden: true }, { id: 'focus' }] };
  const n = normalizeHomeLayout(raw);
  assert.deepEqual(ids(n).slice(0, 3), ['runway~2', 'list~3', 'focus'], 'legal copies kept, repeats and illegal ones dropped');
  assert.deepEqual(n.widgets[0], { id: 'runway~2', size: 'l', hidden: false });
  assert.equal(n.widgets[1].hidden, true);
  assert.equal(n.widgets.length, HOME_WIDGETS.length + 2, 'every widget once, plus the copies');
  // Settings of a copy the layout lost (an older build dropped it): it comes back, shown, at the end.
  const prefs = { 'list~2': { query: '#x' }, 'runway~3': {}, 'runway~2': { unit: 'steps' }, 'runway~9': {}, gap: { buffer: 10 } };
  const m = normalizeHomeLayout(raw, HOME_WIDGETS, prefs);
  assert.deepEqual(ids(m).slice(-2), ['runway~3', 'list~2'], 'restored in catalogue order; runway~2 was already there; runway~9 is not legal; gap is not a copy');
  assert.deepEqual(m.widgets.at(-1), { id: 'list~2', size: 'm', hidden: false });
  assert.deepEqual(normalizeHomeLayout(m, HOME_WIDGETS, prefs), m, 'idempotent');
  assert.deepEqual(normalizeHomeLayout(undefined, HOME_WIDGETS, null), base);

  const { json } = homeBox();
  for (const [r, p] of [[raw, null], [raw, prefs], [null, prefs], [{ widgets: [{ id: 'list~6' }, { id: 'list~2', hidden: true }] }, { 'list~4': {} }]]) {
    const page = json(`homeLayoutNormalize(${JSON.stringify(r)}, homeWidgetCatalog(), ${JSON.stringify(p)})`);
    assert.deepEqual(page, plain(normalizeHomeLayout(r, HOME_WIDGETS, p)), JSON.stringify([r, p]));
  }
});

test('page: a copy is the same widget with its own id, title, copy number and settings', () => {
  const { json, run, box } = homeBox();
  box.state.home = { widgetPrefs: { 'runway~2': { unit: 'steps', countdownId: 'cd-1' } } };
  assert.deepEqual(json('(() => { const d = homeWidgetDef("runway~2"); return [d.id, d.baseId, d.copy, d.title, d.multi, typeof d.render]; })()'), ['runway~2', 'runway', 2, 'Deadline runway 2', 4, 'function']);
  assert.equal(json('homeWidgetDef("runway~5")'), null);
  assert.equal(json('homeWidgetDef("finance~2")'), null);
  assert.deepEqual(json('[homeWidgetDef("runway").baseId, homeWidgetDef("runway").copy]'), ['runway', 1]);
  run('_homeEntryBegin(); var c2 = _homeCtx({ def: homeWidgetDef("runway~2"), frame: {}, size: "m", sortables: [] }, true); var c1 = _homeCtx({ def: homeWidgetDef("runway"), frame: {}, size: "m", sortables: [] }, true);');
  assert.deepEqual(json('[c2.id, c2.instance, c2.baseId, c2.copy, c2.preview]'), ['runway~2', 'runway~2', 'runway', 2, false]);
  assert.deepEqual(json('c2.prefs'), { countdownId: 'cd-1', scope: null, unit: 'steps', countWeekends: false, since: null }, 'defaults, then what is saved');
  assert.deepEqual(json('c1.prefs'), { countdownId: null, scope: null, unit: 'tasks', countWeekends: false, since: null }, 'copies are independent');
  assert.deepEqual(json('homeInstanceIds("list")'), ['list', 'list~2', 'list~3', 'list~4', 'list~5', 'list~6']);
});

test('page: add another copy, remove it (its settings go too), and Reset drops copies', () => {
  const { json, run, box, toasts } = homeBox();
  box.state.home = { layout: { version: 1, widgets: [{ id: 'list', size: 'm', hidden: false }] } };
  const before = box.state._saveCount || 0;
  assert.equal(json('homeWidgetAddCopy("list", "l")'), 'list~2');
  assert.equal(box.state._saveCount, before + 1, 'one undo step');
  assert.deepEqual(plain(box.state.home.widgetPrefs), { 'list~2': {} }, 'a copy exists while it has an entry');
  assert.deepEqual(json('homeLayout().widgets.at(-1)'), { id: 'list~2', size: 'l', hidden: false });
  assert.equal(json('homeWidgetAddCopy("list")'), 'list~3');
  assert.equal(json('homeWidgetAddCopy("finance")'), false, 'no copies of Money');
  assert.deepEqual(json('homeInstancesShown("list")'), ['list', 'list~2', 'list~3']);
  // Settings per copy.
  assert.equal(json('homeSetPrefs("list~2", { query: "#launch", title: "Launch" })'), true);
  assert.equal(json('homePrefs("list~2").query'), '#launch');
  assert.equal(json('homePrefs("list").query'), '');
  // The minus on a copy removes it and its settings (one step, Undo in the toast).
  run('homeWidgetHide("list~2")');
  assert.equal(json('homeLayout().widgets.some(w => w.id === "list~2")'), false);
  assert.equal(Object.hasOwn(box.state.home.widgetPrefs, 'list~2'), false);
  assert.ok(toasts.some(t => /Smart list 2 removed/.test(t.msg) && t.o && t.o.action && t.o.action.label === 'Undo'));
  // Hiding the widget itself still just hides it.
  run('homeWidgetHide("list")');
  assert.equal(json('homeLayout().widgets.find(w => w.id === "list").hidden'), true);
  // Reset: the default arrangement; copies go, other settings stay.
  run('homeSetPrefs("gap", { buffer: 10 })');
  run('homeResetLayout()');
  assert.equal(box.state.home.layout, undefined);
  assert.deepEqual(plain(box.state.home.widgetPrefs), { gap: { buffer: 10 } });
});

test('page: homeSetPrefs saves one step, null = back to default, a no-op saves nothing, 4 KB at most', () => {
  const { json, box, toasts } = homeBox();
  const n0 = box.state._saveCount || 0;
  assert.equal(json('homeSetPrefs("gap", { buffer: 10 }, "Saved")'), true);
  assert.equal(box.state._saveCount, n0 + 1);
  assert.ok(toasts.some(t => t.msg === 'Saved' && t.o.action.label === 'Undo'), 'msg = a toast with Undo');
  assert.deepEqual(json('homePrefs("gap")'), { buffer: 10, allowUnestimated: true });
  assert.equal(json('homeSetPrefs("gap", { buffer: 10 })'), false, 'nothing changed: nothing saved');
  assert.equal(box.state._saveCount, n0 + 1);
  assert.equal(json('homeSetPrefs({ id: "gap", instance: "gap" }, { buffer: null })'), true, 'a ctx works too');
  assert.equal(box.state.home.widgetPrefs, undefined, 'an empty entry of a widget (not a copy) goes');
  assert.equal(json('homeSetPrefs("gap", { buffer: null })'), false);
  assert.equal(json(`homeSetPrefs("notebook", { template: ${JSON.stringify('x'.repeat(5000))} })`), false, 'over 4 KB');
  assert.ok(toasts.some(t => /too large/.test(t.msg)));
  // homePrefs hands out copies: changing them changes nothing saved.
  json('(() => { const p = homePrefs("calcheck"); p.checks.reply = false; return 1; })()');
  assert.equal(json('homePrefs("calcheck").checks.reply'), true);
});

/* ───────────────────────────── data, tick, actions, memo ───────────────────────────── */
test('homeData: one request at a time, stale data while it refreshes, nothing in a preview, refetch on a new sig', async () => {
  const { run, json, box } = homeBox();
  box.state.view = 'home';
  let calls = 0;
  box.loader = () => { calls++; return Promise.resolve(calls === 1 ? { n: 1 } : null); };
  assert.equal(json('homeData("k", "/api/x", { preview: true }).status'), 'loading', 'a preview never fetches');
  assert.equal(calls, 0);
  assert.equal(json('homeData("k", loader, { maxAge: 60000, wid: "w1" }).status'), 'loading');
  assert.equal(json('homeData("k", loader, { maxAge: 60000, wid: "w1" }).loading'), true);
  assert.equal(calls, 1, 'one in flight');
  await new Promise(r => setImmediate(r));
  assert.deepEqual(json('homeData("k", loader, { maxAge: 60000 })'), { status: 'ok', data: { n: 1 }, at: json('homeDataPeek("k").at'), error: null, loading: false, preview: false });
  assert.equal(calls, 1, 'fresh enough: no new request');
  assert.equal(json('homeData("k", loader, { maxAge: 0 }).data.n'), 1, 'stale: the last answer while it refreshes');
  assert.equal(calls, 2);
  await new Promise(r => setImmediate(r));
  assert.equal(json('homeDataPeek("k").status'), 'empty', 'null = empty');
  assert.equal(json('homeData("k", loader, { maxAge: 60000, sig: 5 }).loading'), true, 'a new sig refetches');
  await new Promise(r => setImmediate(r));
  // Errors keep the last good answer.
  box.bad = () => Promise.reject(new Error('boom'));
  run('homeData("e", bad, {})');
  await new Promise(r => setImmediate(r));
  assert.deepEqual(json('[homeDataPeek("e").status, homeDataPeek("e").error]'), ['error', 'boom']);
  run('homeData("e", () => Promise.resolve({ ok: 1 }), { maxAge: 0 })');
  await new Promise(r => setImmediate(r));
  run('homeData("e", bad, { maxAge: 0 })');
  await new Promise(r => setImmediate(r));
  assert.deepEqual(json('[homeDataPeek("e").status, homeDataPeek("e").data, homeDataPeek("e").error]'), ['ok', { ok: 1 }, 'boom']);
  // No server (yet): no fetch of a URL, no error flash; it says offline and waits for the next render.
  run('var _serverAvailable = false');
  assert.deepEqual(json('(() => { const v = homeData("u", "/api/y", {}); return [v.status, v.offline, v.loading]; })()'), ['loading', true, false]);
});

test('homeTick: one shared timer on the minute, nothing in a preview, stopped when Home is left', () => {
  const { run, json, timers } = homeBox();
  const t0 = timers.length;                                  // (files may set a timer at load)
  assert.equal(json('typeof homeTick({ preview: true, id: "x" }, () => 1)'), 'function');
  assert.equal(timers.length, t0, 'a preview starts no timer');
  assert.equal(json('_homeTicks.size'), 0);
  run('var stop1 = homeTick("a", () => 1); homeTick("b", () => "rerender");');
  assert.equal(timers.length, t0 + 1, 'one timer for every widget');
  assert.ok(timers.at(-1).ms > 0 && timers.at(-1).ms <= 60120, 'on the next minute');
  assert.equal(json('_homeTicks.size'), 2);
  run('stop1()');
  assert.equal(json('_homeTicks.size'), 1);
  run('homeTickStop()');
  assert.equal(json('_homeTicks.size'), 0);
});

test('homeAction: busy, then done (a re-click does nothing), Undo toast; errors offer Try again', async () => {
  const { run, json, box, toasts } = homeBox();
  box.btn = fakeEl(); box.btn.innerHTML = '<span>Plan</span>';
  let ran = 0;
  box.job = () => { ran++; return 'ok'; };
  const p = run('homeAction(btn, job, { done: "Planned", toast: "Planned for today", undo: true, say: "Planned" })');
  assert.equal(box.btn.getAttribute('aria-busy'), 'true');
  assert.equal(box.btn.disabled, true);
  assert.equal(await run('homeAction(btn, job)'), false, 'busy: a second click does nothing');
  assert.equal(await p, 'ok');
  assert.equal(ran, 1);
  assert.equal(box.btn.dataset.done, '1');
  assert.equal(box.btn.getAttribute('aria-busy'), null);
  assert.match(box.btn.innerHTML, /Planned/);
  const t = toasts.find(x => x.msg === 'Planned for today');
  assert.ok(t && t.o.action.label === 'Undo');
  t.o.action.run();
  assert.equal(box._undone, 1, 'undo: true = the page undo');
  assert.equal(await run('homeAction(btn, job)'), false, 'done: a re-click does nothing');
  assert.equal(ran, 1);
  // false = nothing happened: the button comes back as it was.
  box.btn2 = fakeEl(); box.btn2.innerHTML = 'Go';
  assert.equal(await run('homeAction(btn2, () => false, { done: "Done" })'), false);
  assert.equal(box.btn2.dataset.done, undefined); assert.equal(box.btn2.innerHTML, 'Go'); assert.equal(box.btn2.disabled, false);
  // An error: the button comes back, the toast says why and offers Try again.
  box.btn3 = fakeEl(); box.btn3.innerHTML = 'Save';
  box.fail = () => Promise.reject(new Error('The dashboard server is not running.'));
  assert.equal(await run('homeAction(btn3, fail, { done: "Saved" })'), false);
  assert.equal(box.btn3.innerHTML, 'Save'); assert.equal(box.btn3.disabled, false); assert.equal(box.btn3.dataset.done, undefined);
  const err = toasts.find(x => /not running/.test(x.msg));
  assert.ok(err && err.o.kind === 'err' && err.o.action.label === 'Try again');
});

test('homeMemo / homeMemoSig: computed once per signature; every save changes the signature', () => {
  const { run, json, box } = homeBox();
  run('var n = 0; var f = () => ++n;');
  assert.equal(json('homeMemo("w", "s1", f)'), 1);
  assert.equal(json('homeMemo("w", "s1", f)'), 1);
  assert.equal(json('homeMemo("w", "s2", f)'), 2);
  assert.equal(json('homeMemo({ id: "w~2", instance: "w~2" }, "s2", f)'), 3, 'per copy');
  const s1 = json('homeMemoSig()');
  assert.equal(json('homeMemoSig()'), s1);
  box.saveData();
  assert.notEqual(json('homeMemoSig()'), s1);
  assert.notEqual(json('homeMemoSig({ minute: true })'), json('homeMemoSig()'));
  assert.notEqual(json('homeMemoSig({ extra: { a: 1 } })'), json('homeMemoSig({ extra: { a: 2 } })'));
});

test('homeSample: synthetic sample content for previews (generic names), or the widget\'s own', () => {
  const { run, json } = homeBox();
  const tasks = json('homeSample("tasks")');
  assert.ok(tasks.length >= 4 && tasks.every(t => t.id.startsWith('sample-')));
  assert.ok(json('homeSample("events")').length >= 3);
  assert.equal(json('homeSample("nothing-like-this")'), null);
  run('registerHomeWidget({ id: "zs", title: "Zs", description: "x", render: () => true, sample: (kit) => ({ first: kit.tasks[0].title, today: kit.today }) })');
  assert.deepEqual(json('homeSample("zs")'), { first: tasks[0].title, today: TODAY });
  // Only generic sample names (the no-personal-data test scans the whole tree too).
  const txt = JSON.stringify(json('_homeSampleKit()'));
  for (const n of ['Sam', 'Alex', 'Jo', 'Acme']) assert.ok(txt.includes(n));
});

test('gallery: "New" until looked at; the filter matches title, description, words and group', () => {
  const { json, box } = homeBox();
  assert.equal(json('homeWidgetIsNew(homeWidgetDef("capture"))'), true);
  assert.equal(json('homeWidgetIsNew(homeWidgetDef("focus"))'), false, 'only fresh widgets');
  assert.equal(json('homeMarkGallerySeen("capture")'), true);
  assert.equal(json('homeMarkGallerySeen("capture")'), false, 'once');
  assert.equal(json('homeWidgetIsNew(homeWidgetDef("capture"))'), false);
  assert.deepEqual(plain(box.state.homeUI.gallerySeen), ['capture']);
  assert.equal(box.state.home, undefined, 'a UI key: no data change');
  assert.equal(json('homeWidgetMatches(homeWidgetDef("capture"), "quick add")'), true);
  assert.equal(json('homeWidgetMatches(homeWidgetDef("capture"), "two seconds")'), true, 'description');
  assert.equal(json('homeWidgetMatches(homeWidgetDef("habits"), "wellbeing")'), true, 'group');
  assert.equal(json('homeWidgetMatches(homeWidgetDef("capture"), "payday")'), false);
  assert.equal(json('homeWidgetMatches(homeWidgetDef("capture"), "")'), true);
  assert.deepEqual(json('HOME_GROUPS.map(g => g[0])'), Object.keys(HOME_WIDGET_GROUPS), 'the same groups, in the same order');
});

test('Hide amounts: a UI key; hidden amounts blur and read as "hidden"', () => {
  const { json, box } = homeBox();
  assert.equal(json('homeAmtHtml("£23")'), '<span class="hg-amt">£23</span>');
  assert.equal(json('homeSetAmountsHidden(true)'), true);
  assert.equal(json('homeSetAmountsHidden(true)'), false, 'already hidden');
  assert.equal(box.state.homeUI.hideAmounts, true);
  assert.equal(box.state.home, undefined);
  const h = json('homeAmtHtml("<£23>")');
  assert.match(h, /is-hidden/); assert.match(h, /sr-only">hidden</); assert.match(h, /&lt;£23&gt;/);
  json('homeSetAmountsHidden(false)');
  assert.equal(Object.hasOwn(box.state.homeUI, 'hideAmounts'), false);
});

test('the suggestion slot draws nothing until a provider registers; then one item at M and up, never in a preview', () => {
  const { run, json, box } = homeBox();
  box.host = { kids: [], appendChild(x) { this.kids.push(x); } };
  assert.equal(json('homeSuggestSlot(host, { wid: "gap", size: "m" })'), null);
  run('registerHomeSuggestProvider((o) => (o.wid === "gap" ? { tag: "card", o } : null))');
  assert.equal(json('homeSuggestSlot(host, { wid: "gap", size: "s" })'), null, 'not at Small');
  assert.equal(json('homeSuggestSlot(host, { def: {}, id: "gap", size: "m", preview: true })'), null, 'never in a preview');
  assert.equal(json('homeSuggestSlot(host, { wid: "owe", size: "m" })'), null, 'nothing for this widget');
  assert.ok(run('homeSuggestSlot(host, { def: {}, id: "gap", size: "l" }, { taskId: "t1" })'));
  assert.equal(box.host.kids.length, 1);
});

test('the command palette applies ops through the shared actionsApply', () => {
  const pal = readFileSync(join(APP, '16-command-palette.js'), 'utf8');
  const fn = pal.slice(pal.indexOf('async function paletteApplyOps'), pal.indexOf('async function paletteApplyOps') + 400);
  assert.match(fn, /actionsApply\(ops/);
  assert.match(fn, /client: 'command palette'/);
  const plat = readFileSync(join(APP, '12-home-platform.js'), 'utf8');
  assert.match(plat, /async function actionsApply\(ops, o\)/);
  assert.match(plat, /\/api\/actions\/undo/);
});

/* ───────────────────────────── the actions layer ───────────────────────────── */
let dir, a;
beforeEach(() => { dir = makeDataDir(); a = createActions({ dataDir: dir }); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const disk = () => JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
const runOps = (ops, extra = {}) => a.apply({ ops, source: 'mcp', client: 'test', ...extra });
const rejects = async (p, code, check2) => {
  try { await p; } catch (e) { assert.equal(e.code, code, `${e.code}: ${e.message}`); if (check2) check2(e); return e; }
  assert.fail(`expected ${code}`);
};

test('set_home_widget exists and validates settings against the widget\'s schema', async () => {
  assert.ok(OP_BY_TOOL.get('set_home_widget'));
  assert.match(OP_BY_TOOL.get('set_home_widget').description, /newCopy/);
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'gap', settings: { bufer: 3 } }]), 'BAD_VALUE', e => { assert.ok(e.valid.includes('buffer')); assert.match(e.hint, /buffer/); });
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'gap', settings: { buffer: 'lots' } }]), 'INVALID_PARAMS');
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'gap', settings: { buffer: 99 } }]), 'INVALID_PARAMS');
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'inbox', settings: { maxDays: 9 } }]), 'INVALID_PARAMS', e => assert.deepEqual(e.valid, [7, 14, 30]));
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'runway', settings: { scope: { kind: 'planet', value: 'x' } } }]), 'INVALID_PARAMS');
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'focus', settings: { x: 1 } }]), 'BAD_VALUE', e => assert.match(e.message, /no settings/));
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'weather', settings: {} }]), 'NOT_FOUND');
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'runway~9', settings: {} }]), 'NOT_FOUND', e => assert.match(e.message, /allows 4 copies/));
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'finance~2', show: true }]), 'NOT_FOUND', e => assert.match(e.message, /only once/));
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'gap' }]), 'INVALID_PARAMS');
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'notebook', settings: { template: 'x'.repeat(2001) } }]), 'INVALID_PARAMS');
  assert.equal(disk().home, undefined, 'nothing was written');
});

test('set_home_widget: change settings (null = default), show and size; get_home_layout shows them; undo', async () => {
  const r = await runOps([{ op: 'home.set_widget_prefs', widget: 'Fill the gap', settings: { buffer: 10, allowUnestimated: false }, show: true, size: 'm' }]);
  assert.match(r.summary, /Fill the gap/);
  assert.ok(r.undo);
  let s = disk().home;
  assert.deepEqual(s.widgetPrefs, { gap: { buffer: 10, allowUnestimated: false } });
  assert.deepEqual(s.layout.widgets.at(-1), { id: 'gap', size: 'm', hidden: false }, 'shown at the end');
  const q = await a.query('home.layout');
  const g = q.widgets.find(w => w.id === 'gap');
  assert.deepEqual(g.settings, { buffer: 10, allowUnestimated: false });
  assert.deepEqual(g.settingKeys, ['buffer', 'allowUnestimated']);
  assert.equal(typeof g.position, 'number');
  assert.equal(q.widgets.find(w => w.id === 'runway').maxCopies, 4);
  await runOps([{ op: 'home.set_widget_prefs', widget: 'gap', settings: { buffer: null } }]);
  assert.deepEqual(disk().home.widgetPrefs, { gap: { allowUnestimated: false } });
  const same = await runOps([{ op: 'home.set_widget_prefs', widget: 'gap', settings: { allowUnestimated: false } }]);
  assert.ok((same.warnings || []).some(w => /nothing to change/.test(w.message)));
  await runOps([{ op: 'home.set_widget_prefs', widget: 'gap', reset: true }]);
  assert.equal(disk().home.widgetPrefs, undefined, 'reset: no settings left');
  // Dry run writes nothing; undo puts it back.
  const before = readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8');
  await runOps([{ op: 'home.set_widget_prefs', widget: 'gap', settings: { buffer: 20 } }], { dryRun: true });
  assert.equal(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'), before);
  const u = await runOps([{ op: 'home.set_widget_prefs', widget: 'gap', settings: { buffer: 20 } }]);
  await a.undo(u.undo);
  assert.equal(disk().home.widgetPrefs, undefined);
  s = disk().home;
  assert.equal(s.layout.widgets.find(w => w.id === 'gap').hidden, false, 'the earlier show stays');
});

test('set_home_widget newCopy: the widget itself first, then runway~2...; at most multi; layout and reset know copies', async () => {
  const r1 = await runOps([{ op: 'home.set_widget_prefs', widget: 'runway', newCopy: true, settings: { countdownId: 'cd-1', scope: { kind: 'tag', value: 'launch' } } }]);
  assert.equal(r1.created[0].widgetId, 'runway', 'an unused widget is used first');
  const r2 = await runOps([{ op: 'home.set_widget_prefs', widget: 'Deadline runway', newCopy: true, settings: { countdownId: 'cd-2', unit: 'steps' } }]);
  assert.equal(r2.created[0].widgetId, 'runway~2');
  assert.match(r2.summary, /Add Deadline runway 2/);
  await runOps([{ op: 'home.set_widget_prefs', widget: 'runway', newCopy: true }]);
  await runOps([{ op: 'home.set_widget_prefs', widget: 'runway', newCopy: true }]);
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'runway', newCopy: true }]), 'BAD_VALUE', e => assert.match(e.message, /already has 4/));
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'gap', newCopy: true }]), 'BAD_VALUE', e => assert.match(e.message, /only once/));
  await rejects(runOps([{ op: 'home.set_widget_prefs', widget: 'runway~2', newCopy: true }]), 'BAD_VALUE');
  let s = disk().home;
  assert.deepEqual(Object.keys(s.widgetPrefs).sort(), ['runway', 'runway~2', 'runway~3', 'runway~4']);
  assert.deepEqual(s.widgetPrefs['runway~3'], {}, 'a copy keeps an (empty) entry');
  assert.deepEqual(s.widgetPrefs['runway~2'], { countdownId: 'cd-2', unit: 'steps' });
  let q = await a.query('home.layout');
  const c2 = q.widgets.find(w => w.id === 'runway~2');
  assert.equal(c2.copyOf, 'runway'); assert.equal(c2.title, 'Deadline runway 2'); assert.equal(c2.hidden, undefined);
  // set_home_layout moves and sizes copies, by id or by name.
  await runOps([{ op: 'home.set_layout', widgets: [{ id: 'runway~2', position: 0 }, { id: 'Deadline runway 3', size: 's' }, { id: 'runway~4', after: 'runway~2' }] }]);
  q = await a.query('home.layout');
  const shown = q.widgets.filter(w => !w.hidden).map(w => w.id);
  assert.deepEqual(shown.slice(0, 2), ['runway~2', 'runway~4']);
  assert.equal(q.widgets.find(w => w.id === 'runway~3').size, 's');
  await rejects(runOps([{ op: 'home.set_layout', widgets: [{ id: 'list~7', position: 0 }] }]), 'NOT_FOUND', e => assert.match(e.message, /allows 6 copies/));
  // Reset: the default arrangement, without the copies; the widget's own settings stay.
  const rs = await runOps([{ op: 'home.reset_layout' }]);
  assert.match(rs.summary, /removed Deadline runway 2/);
  s = disk().home;
  assert.equal(s.layout, undefined);
  assert.deepEqual(Object.keys(s.widgetPrefs), ['runway']);
  q = await a.query('home.layout');
  assert.equal(q.widgets.length, HOME_WIDGETS.length);
});

test('a copy the layout lost comes back from its settings (an older build dropped it)', async () => {
  await runOps([{ op: 'home.set_widget_prefs', widget: 'list', newCopy: true, settings: { query: 'due:week', title: 'This week' } }]);
  await runOps([{ op: 'home.set_widget_prefs', widget: 'list', newCopy: true, settings: { query: '#onboarding' } }]);
  const file = join(dir, 'state', 'dashboard-state.json');
  const s = disk();
  s.home.layout.widgets = s.home.layout.widgets.filter(w => w.id !== 'list~2');      // what an older build saves
  s._lastSave = Date.now();
  (await import('node:fs')).writeFileSync(file, JSON.stringify(s));
  const q = await a.query('home.layout');
  const c = q.widgets.find(w => w.id === 'list~2');
  assert.ok(c && !c.hidden, 'back, shown');
  assert.deepEqual(c.settings, { query: '#onboarding' });
});
