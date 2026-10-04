// Home and the Morning brief are ONE page (src/app/12-home.js, 12-home-head.js,
// 74-brief-ui.js, 77-brief-review.js) and the story engine's inline player
// (src/app/79-story-engine.js):
//   - no separate brief panel or page: the 'brief' widget is gone from both
//     catalogues, the Today widget is only a brand-new folder's welcome, and old
//     '#view=review:*' / 'brief' links land on Home's tabs (viewAlias);
//   - Home's tabs: Today / Evening / Week / History as 'home', 'home:evening' ...;
//   - the engine run with a stand-in DOM: full screen is as before; inline lives in
//     its container, expands to full screen and back (Esc), moves with a rebuilt
//     page, only hears keys aimed at it, and reports state and its close.
// Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { HOME_WIDGETS } from '../lib/home-topbar.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
/** One top-level function's source, by name (the file's own text). */
function fnSrc(file, name) {
  const s = read(file);
  const at = s.indexOf(`function ${name}(`);
  assert.ok(at >= 0, `${file} defines ${name}`);
  let depth = 0, i = s.indexOf('{', at);
  for (; i < s.length; i++) { if (s[i] === '{') depth++; else if (s[i] === '}' && --depth === 0) break; }
  return s.slice(at, i + 1);
}

/* ───────── in the Home bundle ───────── */
const HOME_FILES = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort();
function homeBox(st) {
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {} },
    window: { addEventListener() {} }, CSS: { escape: (s) => s }, localStorage: { getItem: () => null, setItem() {} },
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, documentElement: { classList: { contains: () => false } } },
    registerSection() {}, saveData() {}, saveUI() {}, render() {}, toast() {}, todayStr: () => '2026-10-07',
    getItem: (id) => st.custom.find(t => t.id === id) || null, getAllItems: () => st.custom, statusOf: (id) => (st.statuses && st.statuses[id]) || 'todo',
  };
  vm.createContext(box);
  vm.runInContext(HOME_FILES.map(f => read(f)).join('\n'), box, { filename: 'home-bundle.js' });
  return (code) => vm.runInContext(code, box);
}
const withTasks = () => ({ custom: [{ id: 't1', title: 'Draft the intro' }], statuses: {}, pinned: {}, deleted: {}, completionLog: {} });

test('no separate brief panel: the widget and its files are gone from both catalogues', () => {
  assert.equal(HOME_WIDGETS.find(w => w.id === 'brief'), undefined, 'lib/home-topbar.mjs');
  assert.equal(existsSync(join(APP, '12-home-w-brief.js')), false);
  assert.equal(existsSync(join(ROOT, 'src', 'styles', '13-home-w-brief.css')), false);
  const run = homeBox(withTasks());
  assert.equal(run('homeWidgetDef("brief")'), null, 'the page has no brief widget');
  assert.equal(run('homeLayout().widgets.some(w => w.id === "brief")'), false);
  // An old saved board that still lists it simply loses it.
  run('state.home = { layout: { version: 1, widgets: [{ id: "brief", size: "full" }, { id: "focus", size: "l" }] } }');
  assert.equal(run('homeLayout().widgets.some(w => w.id === "brief")'), false);
});

test('the day\'s hero heads Home; the Today widget is only a brand-new folder\'s welcome', () => {
  const run = homeBox(withTasks());
  assert.equal(run('homeIsNewUser()'), false);
  assert.equal(run('homeWidgetAvailable(homeWidgetDef("today"))'), false, 'no second greeting under the hero');
  const fresh = homeBox({ custom: [], statuses: {}, pinned: {}, deleted: {}, completionLog: {} });
  assert.equal(fresh('homeIsNewUser()'), true);
  assert.equal(fresh('homeWidgetAvailable(homeWidgetDef("today"))'), true);
  const home = read('12-home.js');
  assert.match(home, /briefRender\(root\)/, 'Home mounts the hero above the widgets');
  assert.match(home, /homeTabsEl\(tab\)/, 'with the tabs on top');
  const ui = read('74-brief-ui.js');
  assert.match(ui, /homeHeadPlayRow\(row, m\)/, 'Play my morning sits in the hero');
  assert.match(ui, /homeHeadIdeas\(\)/, 'Ideas for today under the sentences');
});

test('old brief and review links land on Home\'s tabs', () => {
  const box = vm.createContext({});
  vm.runInContext(fnSrc('15-nav-sidebar.js', 'viewAlias') + '\n' + fnSrc('77-brief-review.js', 'homeTabOf') + '\n' + fnSrc('77-brief-review.js', 'homeTabView')
    + "\nconst HOME_TABS = [['today'], ['evening'], ['week'], ['history']];", box);
  const A = (v) => vm.runInContext(`viewAlias(${JSON.stringify(v)})`, box);
  assert.equal(A('review'), 'home');
  assert.equal(A('review:today'), 'home');
  assert.equal(A('brief'), 'home');
  assert.equal(A('review:evening'), 'home:evening');
  assert.equal(A('review:week'), 'home:week');
  assert.equal(A('review:history'), 'home:history');
  assert.equal(A('calendar:week'), 'calendar:week');
  const T = (v) => vm.runInContext(`homeTabOf(${JSON.stringify(v)})`, box);
  assert.deepEqual(['home', 'home:evening', 'home:week', 'home:history', 'home:nope'].map(T), ['today', 'evening', 'week', 'history', 'today']);
  assert.equal(vm.runInContext('homeTabView("today")', box), 'home');
  assert.equal(vm.runInContext('homeTabView("week")', box), 'home:week');
  assert.match(read('15-nav-sidebar.js'), /v = viewAlias\(v\)/, 'setView redirects');
  assert.match(read('05-core-state-init.js'), /viewAlias\(s\.view\)/, 'a saved view redirects');
});

test('no "Morning brief" place left in the UI: sidebar, palette and Settings say Home', () => {
  const hooks = read('78-brief-hooks.js');
  assert.doesNotMatch(hooks, /label: 'Morning brief'/, 'no sidebar item');
  assert.doesNotMatch(hooks, /title: 'Morning brief'/, 'no Settings group of that name');
  assert.match(hooks, /title: 'Home and stories'/);
  assert.doesNotMatch(read('77-brief-review.js'), /registerSection\('review'/, 'no separate Review page');
  assert.doesNotMatch(read('58-settings-home.js'), /Morning brief on Home/);
});

/* ───────── the engine's inline player, run with a stand-in DOM ───────── */
function storyBox() {
  let doc = null;
  class ClassList {
    constructor() { this.s = new Set(); }
    add(...c) { for (const x of c) this.s.add(x); } remove(...c) { for (const x of c) this.s.delete(x); }
    contains(c) { return this.s.has(c); } toggle(c, f) { const on = f === undefined ? !this.s.has(c) : !!f; if (on) this.s.add(c); else this.s.delete(c); return on; }
  }
  class Style { constructor() { this.p = {}; } setProperty(k, v) { this.p[k] = String(v); } removeProperty(k) { delete this.p[k]; } getPropertyValue(k) { return this.p[k] || ''; } }
  class El {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase(); this.nodeType = 1; this.children = []; this.parentElement = null; this.attrs = {}; this.dataset = {};
      this.classList = new ClassList(); this.style = new Style(); this.listeners = {}; this._q = new Map(); this._html = ''; this.hidden = false; this.checked = false; this.textContent = ''; this.disabled = false; this.tabIndex = -1;
    }
    get className() { return [...this.classList.s].join(' '); } set className(v) { this.classList.s = new Set(String(v).split(/\s+/).filter(Boolean)); }
    get innerHTML() { return this._html; } set innerHTML(v) { this._html = String(v); this._q = new Map(); }
    setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } removeAttribute(k) { delete this.attrs[k]; } hasAttribute(k) { return k in this.attrs; }
    appendChild(c) { if (c.parentElement) c.remove(); c.parentElement = this; this.children.push(c); return c; }
    prepend(c) { if (c.parentElement) c.remove(); c.parentElement = this; this.children.unshift(c); return c; }
    remove() { const p = this.parentElement; if (p) { p.children = p.children.filter(x => x !== this); this.parentElement = null; } }
    contains(x) { for (let n = x; n; n = n.parentElement) if (n === this) return true; return false; }
    get isConnected() { let n = this; while (n.parentElement) n = n.parentElement; return !!doc && n === doc.documentElement; }
    // Parts of the stage are drawn with innerHTML: any selector gets a stand-in child (kept per selector).
    querySelector(sel) { if (!this._q.has(sel)) { const e = new El('div'); e.parentElement = this; this._q.set(sel, e); } return this._q.get(sel); }
    querySelectorAll() { return []; }
    addEventListener(t, f) { (this.listeners[t] || (this.listeners[t] = [])).push(f); }
    removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter(x => x !== f); }
    getBoundingClientRect() { return { left: 40, top: 300, width: 720, height: 450 }; }
    get clientWidth() { return 720; }
    focus() { doc.activeElement = this; }
    closest() { return null; }
    animate() { return { cancel() {}, onfinish: null }; }
    getAnimations() { return []; }
  }
  const html = new El('html'), body = new El('body');
  html.appendChild(body);
  doc = { documentElement: html, body, activeElement: body, hidden: false, listeners: {},
    createElement: (t) => new El(t),
    addEventListener(t, f) { (this.listeners[t] || (this.listeners[t] = [])).push(f); },
    removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter(x => x !== f); },
    querySelector: () => null, querySelectorAll: () => [] };
  const fetches = [];
  const payload = (kind) => ({ kind, date: '2026-10-07', ai: { state: 'cached' },
    data: { kind, date: '2026-10-07', events: [], people: [], focus: [], deadlines: [], entities: [] },
    script: { source: 'ai', headline: 'A steady day', sentences: [{ text: 'Write the intro first.', entities: [] }], closing: 'Off you go.' } });
  const store = {};
  const box = {
    console, Math, JSON, Date, Promise, Number, String, Array, Object, Set, Map,
    document: doc,
    window: { addEventListener() {}, removeEventListener() {}, innerWidth: 1440, innerHeight: 900 },
    navigator: {}, performance: { now: () => 0 },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    APP_CONFIG: { locale: 'en-GB', brief: { story: {} } },
    esc: (s) => String(s == null ? '' : s), escAttr: (s) => String(s == null ? '' : s), icon: (n) => `<i data-icon="${n}"></i>`,
    animSceneHtml: () => '', briefSkyHtml: () => '', animEnabled: () => false, todayStrSafe: () => '2026-10-07',
    _calParse: (iso) => new Date(iso + 'T12:00:00'), registerCommand() {}, toast() {}, setView() {},
    _bfJson: (url) => { fetches.push(url); return Promise.resolve(payload(/kind=(\w+)/.exec(url)[1])); },
  };
  box.window.document = doc;
  vm.createContext(box);
  vm.runInContext(read('79-story-core.js') + '\n' + read('79-story-engine.js'), box, { filename: 'story-bundle.js' });
  const S = vm.runInContext('window.Story', box);
  const key = (k, target) => {
    const e = { key: k, target, ctrlKey: false, metaKey: false, altKey: false, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
    for (const f of doc.listeners.keydown || []) f(e);
    return e;
  };
  return { S, doc, El, body, html, fetches, key, run: (code) => vm.runInContext(code, box) };
}
const tick = () => new Promise(r => setImmediate(r));

test('inline API: full screen is unchanged without a container', async () => {
  const t = storyBox();
  await t.S.open('morning', { autoplay: false });
  await tick();
  const root = t.body.children.find(c => c.classList.contains('story'));
  assert.ok(root, 'the stage is a body-level element');
  assert.equal(t.html.classList.contains('story-open'), true);
  assert.equal(root.getAttribute('role'), 'dialog'); assert.equal(root.getAttribute('aria-modal'), 'true');
  assert.equal(root.classList.contains('is-inline'), false);
  assert.equal(t.S.isInline(), false); assert.equal(t.S.isExpanded(), false);
  assert.equal(t.S.expand(), false, 'nothing to expand'); assert.equal(t.S.collapse(), false);
  // Esc closes it, as before.
  t.key('Escape', root);
  assert.equal(t.S.isOpen(), false);
  assert.equal(t.html.classList.contains('story-open'), false);
});

test('inline API: plays in its container, expands to full screen and back, moves, closes once', async () => {
  const t = storyBox();
  const host = new t.El('div'); t.body.appendChild(host);
  const states = [], closes = [];
  await t.S.open('evening', { container: host, autoplay: false, onState: (s) => states.push(s), onClose: (o) => closes.push(o) });
  await tick();
  const root = host.children.find(c => c.classList.contains('story'));
  assert.ok(root, 'the stage lives in the container');
  assert.equal(t.html.classList.contains('story-open'), false, 'the page is not dimmed or locked');
  assert.equal(root.classList.contains('is-inline'), true);
  assert.equal(root.getAttribute('role'), 'region'); assert.equal(root.getAttribute('aria-modal'), null);
  assert.equal(host.classList.contains('st-host'), true);
  // Laid out at the window's size and scaled into the container (720 of 1440 = half; 900 x 0.5).
  assert.equal(root.style.getPropertyValue('--st-k'), '0.5'); assert.equal(host.style.height, '450px');
  assert.deepEqual([t.S.isOpen(), t.S.kind(), t.S.isInline(), t.S.isExpanded()], [true, 'evening', true, false]);
  assert.equal(states.at(-1).inline, true); assert.equal(states.at(-1).count > 0, true, 'state reports the moments');
  // Keys: only those aimed at the player itself.
  const outside = new t.El('button'); t.body.appendChild(outside);
  assert.equal(t.key('m', outside).defaultPrevented, false, 'a key elsewhere on the page is left alone');
  assert.equal(t.key('ArrowRight', root).defaultPrevented, true, 'a key on the stage drives it');
  // Full screen: the same stage moves to the body; nothing reloads.
  assert.equal(t.S.expand(), true);
  assert.equal(root.parentElement, t.body);
  assert.equal(t.html.classList.contains('story-open'), true);
  assert.equal(root.getAttribute('role'), 'dialog'); assert.equal(root.getAttribute('aria-modal'), 'true');
  assert.equal(t.S.isExpanded(), true); assert.equal(states.at(-1).expanded, true);
  assert.equal(root.querySelector('.st-x').getAttribute('aria-label'), 'Back to the panel (Esc)');
  // Esc there brings it back into the panel (it does not close).
  t.key('Escape', root);
  assert.equal(t.S.isOpen(), true);
  assert.equal(root.parentElement, host);
  assert.equal(t.html.classList.contains('story-open'), false);
  assert.equal(t.S.isExpanded(), false); assert.equal(states.at(-1).expanded, false);
  assert.equal(root.querySelector('.st-x').getAttribute('aria-label'), 'Close (Esc)');
  // A full-screen request for the same story while it plays inline expands it (no second copy).
  await t.S.open('evening', { autoplay: true });
  assert.equal(t.S.isExpanded(), true); assert.equal(t.fetches.length, 1, 'loaded once');
  t.S.collapse();
  // A rebuilt panel: the player moves into the new container.
  const host2 = new t.El('div'); t.body.appendChild(host2);
  await t.S.open('evening', { container: host2 });
  assert.equal(root.parentElement, host2);
  assert.equal(host.classList.contains('st-host'), false); assert.equal(host2.classList.contains('st-host'), true);
  assert.equal(t.fetches.length, 1, 'still loaded once');
  // Esc inline stops it; onClose runs once and the container is left clean.
  t.key('Escape', root);
  assert.equal(t.S.isOpen(), false);
  assert.equal(closes.length, 1); assert.deepEqual(plain(closes[0]), { expanded: false });
  assert.equal(host2.classList.contains('st-host'), false); assert.equal(host2.style.height, '');
  t.S.close();
  assert.equal(closes.length, 1, 'closing twice reports once');
});

test('inline API: opening another kind replaces the inline story; a panel that has gone closes it on the way back', async () => {
  const t = storyBox();
  const host = new t.El('div'); t.body.appendChild(host);
  const closes = [];
  await t.S.open('morning', { container: host, autoplay: false, onClose: () => closes.push('morning') });
  await t.S.open('week', { autoplay: false });
  assert.equal(closes.length, 1, 'the inline one was told it closed');
  assert.deepEqual([t.S.kind(), t.S.isInline()], ['week', false]);
  t.S.close();
  // Expanded, then Home is left (the panel is gone): Esc closes instead of docking into nothing.
  await t.S.open('morning', { container: host, autoplay: false, onClose: () => closes.push('again') });
  t.S.expand();
  host.remove();
  const root = t.body.children.find(c => c.classList.contains('story'));
  t.key('Escape', root);
  assert.equal(t.S.isOpen(), false);
  assert.deepEqual(closes, ['morning', 'again']);
});

test('inline fit: the window\'s layout scaled to the container width', () => {
  const t = storyBox();
  const fit = (...a) => plain(t.run(`storyInlineFit(${a.map(x => JSON.stringify(x)).join(',')})`));
  assert.deepEqual(fit(720, 1440, 900), { k: 0.5, height: 450 });
  assert.deepEqual(fit(1080, 1440, 900), { k: 0.75, height: 675 });
  assert.deepEqual(fit(2000, 1440, 900), { k: 1, height: 900 }, 'never larger than the window');
  assert.deepEqual(fit(0, 1440, 900), { k: 1, height: 900 }, 'no width yet: full size');
  assert.deepEqual(fit(500, null, 'x'), { k: 0.3472, height: 313 }, 'junk window: 1440 x 900');
  assert.deepEqual(fit(10, 1440, 900), { k: 0.05, height: 45 }, 'a floor');
});
