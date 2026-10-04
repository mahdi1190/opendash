// Home widget "launchpad" (WIDGETS_CATALOGUE.md 3.13): the folders, files, links and
// snippets the user pins, one click away.
//   - the pure rules (12-home-launchpad-logic.js, with 62-resources-logic.js for rsrc*):
//     tile order (new pins at the end), grouping by stream, what each size draws, what a
//     click does for each kind (a program is only revealed; a phone copies a path), the
//     suggested pins, a drop, arrow keys across the tiles;
//   - in the Home bundle: registered and offered, its settings match the server schema,
//     and pinning / unpinning is ONE save (one undo step) that keeps the order.
// Synthetic data only (generic names).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';
import { check } from '../server/actions/validate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));

/* ───────── the pure rules in a VM (as the page loads them: the logic file, then 62) ───────── */
const logic = vm.createContext({});
vm.runInContext(read('12-home-launchpad-logic.js') + '\n' + read('62-resources-logic.js'), logic, { filename: 'launchpad-logic.js' });
const L = (fn, ...args) => plain(vm.runInContext(fn, logic)(...plain(args)));
const ids = (list) => list.map(r => r.id);

const R = (id, kind, target, o) => Object.assign({ id, kind, target, label: id, pinned: true, links: [], createdAt: 1000 }, o || {});
const folder = (id, o) => R(id, 'folder', 'C:\\Work\\' + id, o);

test('tile order: the saved order first, then pins it has not seen, oldest first (a new pin goes at the end)', () => {
  const list = [
    folder('a', { createdAt: 30 }), folder('b', { createdAt: 10 }), folder('c', { createdAt: 20 }),
    folder('d', { createdAt: 5, pinned: false }), folder('e', { createdAt: 40 }),
  ];
  assert.deepEqual(ids(L('lpPinned', list, [])), ['b', 'c', 'a', 'e'], 'nothing saved: oldest first; unpinned left out');
  assert.deepEqual(ids(L('lpPinned', list, ['e', 'a'])), ['e', 'a', 'b', 'c'], 'the saved order, then the rest oldest first');
  assert.deepEqual(ids(L('lpPinned', list, ['zz', 'a', 'a', 'd', 'b'])), ['a', 'b', 'c', 'e'], 'unknown, repeated and unpinned ids in the order are ignored');
  // A brand-new pin (newest createdAt) lands after everything, even with a saved order.
  const withNew = list.concat([folder('n', { createdAt: 99 })]);
  assert.deepEqual(ids(L('lpPinned', withNew, ['e', 'a', 'b', 'c'])), ['e', 'a', 'b', 'c', 'n']);
  // Pinning from the widget saves the order shown, then the new ones.
  assert.deepEqual(L('lpOrderWith', ['e', 'a', 'b'], ['x', 'a', 'y']), ['e', 'a', 'b', 'x', 'y']);
  const many = Array.from({ length: 205 }, (_, i) => 'r' + i);
  const capped = L('lpOrderWith', many, ['new']);
  assert.equal(capped.length, 200, 'at most 200 ids (the server schema)');
  assert.equal(capped[capped.length - 1], 'new', 'the newest stay');
  assert.deepEqual(L('lpOrderWithout', ['a', 'b', 'c'], ['b']), ['a', 'c']);
  assert.deepEqual(L('lpPinned', null, null), []);
  assert.deepEqual(L('lpPinned', [null, 3, { kind: 'url' }, folder('ok')], []).map(r => r.id), ['ok'], 'junk entries are skipped');
});

test('dragging one part of the order (a group\'s tiles, its chips) keeps everything else in place; Move earlier/later', () => {
  const full = ['a', 's1', 'b', 'c', 's2', 'd'];
  assert.deepEqual(L('lpSplice', full, ['c', 'a', 'b', 'd']), ['c', 's1', 'a', 'b', 's2', 'd'], 'the tiles moved, the snippets kept their slots');
  assert.deepEqual(L('lpSplice', full, ['s2', 's1']), ['a', 's2', 'b', 'c', 's1', 'd']);
  assert.deepEqual(L('lpSplice', full, ['x', 'b', 'b', 'a']), ['b', 's1', 'a', 'c', 's2', 'd'], 'unknown and repeated ids are ignored');
  assert.deepEqual(L('lpMove', full, 'c', -1), ['a', 's1', 'c', 'b', 's2', 'd']);
  assert.deepEqual(L('lpMove', full, 'c', 1, ['a', 'b', 'c', 'd']), ['a', 's1', 'b', 'd', 's2', 'c'], 'within its own row of kind');
  assert.equal(L('lpMove', full, 'a', -1), null, 'already first: nothing to do');
  assert.equal(L('lpMove', full, 'd', 1), null, 'already last: nothing to do');
  assert.equal(L('lpMove', full, 'zz', 1), null);
});

test('grouping by stream: the stream link, else the linked task\'s stream; the user\'s stream order; Other last', () => {
  const streams = { work: { label: 'Work', order: 2 }, home: { label: 'Home', order: 1 }, old: { label: 'Old', order: 0, archived: true } };
  const tasks = { t1: 'work', t2: 'old', t3: 'nope' };
  const o = { streams, taskStream: (id) => tasks[id] || '' };
  const sOf = (r) => vm.runInContext('lpStreamOf', logic)(r, o);
  assert.equal(sOf(folder('a', { links: [{ type: 'stream', id: 'home' }] })), 'home');
  assert.equal(sOf(folder('b', { links: [{ type: 'task', id: 't1' }, { type: 'stream', id: 'home' }] })), 'home', 'a stream link wins over a task link');
  assert.equal(sOf(folder('c', { links: [{ type: 'task', id: 't1' }] })), 'work', 'the task\'s stream');
  assert.equal(sOf(folder('d', { links: [{ type: 'stream', id: 'old' }, { type: 'task', id: 't2' }] })), '', 'archived streams do not count');
  assert.equal(sOf(folder('e', { links: [{ type: 'task', id: 't3' }, { type: 'person', id: 'p' }] })), '', 'an unknown stream: Other');
  assert.equal(vm.runInContext('lpStreamOf', logic)(folder('f', { links: [{ type: 'task', id: 'x' }] }), { taskStream: () => { throw new Error('gone'); } }), '', 'a failing lookup is Other');

  const items = [
    folder('w1', { links: [{ type: 'stream', id: 'work' }] }), folder('x1'), folder('h1', { links: [{ type: 'stream', id: 'home' }] }),
    folder('w2', { links: [{ type: 'task', id: 't1' }] }), folder('x2'),
  ];
  const groups = vm.runInContext('lpGroups', logic)(items, sOf, streams);
  assert.deepEqual(plain(groups.map(g => [g.stream, g.items.map(r => r.id)])), [['home', ['h1']], ['work', ['w1', 'w2']], ['', ['x1', 'x2']]]);
});

test('what each size draws: S 6 tiles (snippets too), M 12 with snippets as chips, L / Full every pin grouped by stream', () => {
  const items = [
    ...Array.from({ length: 9 }, (_, i) => folder('f' + i, { links: i < 3 ? [{ type: 'stream', id: 'work' }] : [] })),
    R('s1', 'snippet', 'git status'), R('u1', 'url', 'https://example.com/wiki'),
    ...Array.from({ length: 5 }, (_, i) => folder('g' + i)),
  ];
  const lay = (size, o) => plain(vm.runInContext('lpLayout', logic)(items, size, Object.assign({ groupByStream: true, streamOf: (r) => (r.links[0] ? r.links[0].id : ''), streams: { work: { order: 1 } } }, o || {})));
  const s = lay('s');
  assert.equal(s.groups.length, 1); assert.equal(s.groups[0].stream, null);
  assert.deepEqual(s.groups[0].tiles.map(r => r.id), ['f0', 'f1', 'f2', 'f3', 'f4', 'f5']);
  assert.equal(s.groups[0].chips.length, 0); assert.equal(s.more.length, items.length - 6);
  const sSnip = plain(vm.runInContext('lpLayout', logic)([R('s1', 'snippet', 'x'), folder('a')], 's', {}));
  assert.deepEqual(sSnip.groups[0].tiles.map(r => r.id), ['s1', 'a'], 'at S a snippet is a tile like the rest');
  const m = lay('m');
  assert.deepEqual(m.groups[0].tiles.map(r => r.id), ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'u1', 'g0', 'g1'], '12 tiles...');
  assert.deepEqual(m.groups[0].chips.map(r => r.id), ['s1'], '...and the snippet as a chip beside them');
  assert.deepEqual(m.more.map(r => r.id), ['g2', 'g3', 'g4'], 'the rest, in order');
  const snips = Array.from({ length: 10 }, (_, i) => R('s' + i, 'snippet', 'x' + i));
  const mS = plain(vm.runInContext('lpLayout', logic)(snips, 'm', {}));
  assert.equal(mS.groups[0].tiles.length, 0); assert.equal(mS.groups[0].chips.length, 8, 'up to 8 chips at M');
  assert.deepEqual(mS.more.map(r => r.id), ['s8', 's9']);
  const l = lay('l');
  assert.deepEqual(l.groups.map(g => g.stream), ['work', ''], 'by stream, then Other');
  assert.deepEqual(l.groups[0].tiles.map(r => r.id), ['f0', 'f1', 'f2']);
  assert.equal(l.more.length, 0, 'every pin');
  assert.deepEqual(l.groups[1].chips.map(r => r.id), ['s1']);
  const flat = lay('full', { groupByStream: false });
  assert.equal(flat.groups.length, 1); assert.equal(flat.groups[0].stream, null, 'grouping off: one list');
  const onlyOther = plain(vm.runInContext('lpLayout', logic)([folder('a'), folder('b')], 'l', { groupByStream: true, streamOf: () => '' }));
  assert.equal(onlyOther.groups.length, 1); assert.equal(onlyOther.groups[0].stream, null, 'only Other: no heading');
  assert.deepEqual(plain(vm.runInContext('lpLayout', logic)([], 'm', {})), { groups: [], more: [] });
});

test('a click: folders and files open, a program is only revealed, links open in a tab, snippets are copied; a phone copies a path', () => {
  const click = (r, o) => L('lpClick', r, o || {});
  assert.deepEqual(click(folder('Reports')), { act: 'open' });
  assert.deepEqual(click(R('deck', 'file', 'C:\\Talks\\deck.pptx')), { act: 'open' });
  for (const exe of ['C:\\Tools\\setup.exe', 'C:\\Tools\\run.bat', 'C:\\Tools\\go.ps1', '/opt/tool/run.cmd']) {
    assert.deepEqual(click(R('p', 'file', exe)), { act: 'reveal' }, exe + ' is revealed, never opened');
  }
  assert.deepEqual(click(R('w', 'url', 'https://example.com/wiki')), { act: 'url', url: 'https://example.com/wiki' });
  assert.equal(click(R('g', 'github', 'https://github.com/acme/app')).act, 'url');
  assert.equal(click(R('d', 'drive', 'https://docs.google.com/document/d/abc/edit')).act, 'url');
  assert.deepEqual(click(R('bad', 'url', 'javascript:alert(1)')), { act: 'none' }, 'only http(s) links open');
  assert.deepEqual(click(R('s', 'snippet', 'Best wishes,\nSam')), { act: 'copy', text: 'Best wishes,\nSam' });
  assert.deepEqual(click(folder('Reports'), { phone: true }), { act: 'copy-path', text: 'C:\\Work\\Reports' });
  assert.deepEqual(click(R('p', 'file', 'C:\\Tools\\setup.exe'), { phone: true }), { act: 'copy-path', text: 'C:\\Tools\\setup.exe' });
  assert.equal(click(R('w', 'url', 'https://example.com'), { phone: true }).act, 'url', 'a phone still opens links');
  assert.deepEqual(click(null), { act: 'none' });
  // Names for screen readers: "Open <label> (folder)".
  assert.equal(L('lpAriaLabel', folder('Reports', { label: 'Reports' })), 'Open Reports (folder)');
  assert.equal(L('lpAriaLabel', R('s', 'snippet', 'x', { label: 'Sign-off' })), 'Copy Sign-off (snippet)');
  assert.equal(L('lpAriaLabel', R('p', 'file', 'C:\\Tools\\setup.exe', { label: 'Setup' })), 'Show Setup in its folder (program)');
  assert.equal(L('lpAriaLabel', R('g', 'github', 'https://github.com/acme/app', { label: 'acme/app' })), 'Open acme/app (GitHub link)');
  assert.equal(L('lpAriaLabel', folder('Reports', { label: 'Reports' }), { phone: true }), 'Copy the path of Reports (folder)');
});

test('suggested pins: the most linked unpinned first ("Pin from Files"); "Recently added" is the newest unpinned', () => {
  const link = (n) => Array.from({ length: n }, (_, i) => ({ type: 'task', id: 't' + i }));
  const list = [
    folder('a', { pinned: false, links: link(2), createdAt: 10 }), folder('b', { pinned: false, links: link(5), createdAt: 20 }),
    folder('c', { pinned: true, links: link(9), createdAt: 30 }), folder('d', { pinned: false, links: link(2), createdAt: 40 }),
    R('e', 'snippet', 'x', { pinned: false, createdAt: 50 }), folder('f', { pinned: false, links: link(1), createdAt: 5 }),
  ];
  assert.deepEqual(ids(L('lpSuggest', list, 6)), ['b', 'd', 'a', 'f', 'e'], 'most links, then newest; pinned left out');
  assert.deepEqual(ids(L('lpSuggest', list, 2)), ['b', 'd']);
  assert.deepEqual(ids(L('lpRecent', list, 3)), ['e', 'd', 'b'], 'newest first; pinned left out');
  assert.deepEqual(L('lpSuggest', [], 6), []);
});

test('a drop: absolute paths and http(s) links become items; text and other schemes do not; at most 12', () => {
  const d = L('lpDropItems', 'https://github.com/acme/app\nC:\\Work\\Talks\\\njust some words\njavascript:alert(1)\n');
  assert.deepEqual(d.items.map(i => i.kind), ['github', 'folder']);
  assert.equal(d.rejected, 2);
  const many = Array.from({ length: 20 }, (_, i) => `https://example.com/p${i}`).join('\n');
  assert.equal(L('lpDropItems', many).items.length, 12);
  assert.deepEqual(L('lpDropItems', ''), { items: [], rejected: 0 });
});

test('arrow keys across the tiles: Left/Right in reading order, Up/Down to the nearest in the row above/below, Home/End', () => {
  // Two rows of 4 (80 px apart), then a chips row of 2 under them.
  const boxes = [];
  for (let i = 0; i < 8; i++) boxes.push({ x: (i % 4) * 80, y: Math.floor(i / 4) * 80, w: 76, h: 76 });
  boxes.push({ x: 0, y: 170, w: 100, h: 28 }, { x: 110, y: 170, w: 100, h: 28 });
  const mv = (i, k) => L('lpGridMove', boxes, i, k);
  assert.equal(mv(0, 'ArrowRight'), 1); assert.equal(mv(0, 'ArrowLeft'), 0);
  assert.equal(mv(3, 'ArrowRight'), 4, 'reading order wraps to the next row');
  assert.equal(mv(1, 'ArrowDown'), 5); assert.equal(mv(6, 'ArrowUp'), 2);
  assert.equal(mv(2, 'ArrowUp'), 2, 'the top row stays');
  assert.equal(mv(6, 'ArrowDown'), 9, 'down to the nearest chip');
  assert.equal(mv(9, 'ArrowUp'), 6, 'and back up to the nearest tile (by its centre)');
  assert.equal(mv(9, 'ArrowDown'), 9);
  assert.equal(mv(5, 'Home'), 0); assert.equal(mv(5, 'End'), 9);
  assert.equal(L('lpGridMove', [], 0, 'ArrowRight'), -1);
});

/* ───────── in the Home bundle ───────── */
function fakeEl() {
  const attrs = {};
  return { dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => attrs[k] ?? null, removeAttribute() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [] };
}
function homeBox(resources) {
  const st = { custom: [], statuses: {}, pinned: {}, resources: resources || [], home: {} };
  const toasts = [];
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {} }, STREAMS: {},
    window: { addEventListener() {} }, CSS: { escape: (s) => s }, TextEncoder,
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => fakeEl(), body: { appendChild() {} }, hidden: false },
    registerSection() {}, render() { box._renders = (box._renders || 0) + 1; }, undo() { box._undone = (box._undone || 0) + 1; },
    saveData() { box._saves = (box._saves || 0) + 1; }, saveUI() {},
    toast: (msg, o) => toasts.push({ msg, o }), todayStr: () => '2026-10-05', fmtDate: (d) => d.toISOString().slice(0, 10),
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    esc: (s) => String(s), escAttr: (s) => String(s), icon: (n) => `<i data-i="${n}"></i>`,
    resList: () => st.resources, resGet: (id) => st.resources.find(r => r.id === id) || null,
  };
  vm.createContext(box);
  loadPageClock(box);   // the page's Clock (travel spec 2.7): Home's shared helpers ask it for the day
  const files = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort();
  vm.runInContext(files.map(read).join('\n') + '\n' + read('62-resources-logic.js'), box, { filename: 'home-bundle.js' });
  return { box, st, toasts, run: (code) => vm.runInContext(code, box), json: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, box)) };
}

test('registered and offered, with the server\'s metadata and settings schema', () => {
  const { json } = homeBox();
  const d = json('(() => { const d = homeWidgetDef("launchpad"); return { id: d.id, sizes: d.sizes, defaultSize: d.defaultSize, defaultHidden: d.defaultHidden, group: d.group, multi: d.multi, aliases: d.aliases, available: homeWidgetAvailable(d), defaults: homeWidgetDefs().find(x => x.id === "launchpad").defaults } })()');
  const srv = HOME_WIDGETS.find(w => w.id === 'launchpad');
  assert.equal(d.available, true, 'built: offered in Add widget');
  assert.deepEqual(d.sizes, srv.sizes); assert.equal(d.defaultSize, 's'); assert.equal(d.defaultHidden, true);
  assert.equal(d.group, 'files'); assert.equal(d.multi, 1); assert.deepEqual(d.aliases, [...srv.aliases]);
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.launchpad.properties).sort());
  assert.deepEqual(check(HOME_WIDGET_PREFS.launchpad, d.defaults, 'settings'), []);
  assert.deepEqual(check(HOME_WIDGET_PREFS.launchpad, { order: ['r-1', 'r-2'], labels: false, groupByStream: false }, 'settings'), []);
  // The gallery preview has sample tiles of every kind (no fetch, no state).
  const sample = json('homeSample("launchpad").resources.map(r => [r.kind, r.pinned])');
  assert.ok(sample.length >= 3 && sample.every(([, p]) => p === true));
});

test('pinning from a suggestion or the picker is one save: pinned, at the end of the order, a toast with Undo', () => {
  const { st, toasts, run, box } = homeBox([folder('a', { createdAt: 1 }), folder('b', { createdAt: 2 }), folder('c', { pinned: false, createdAt: 3 }), folder('d', { pinned: false, createdAt: 0 })]);
  st.home = { widgetPrefs: { launchpad: { order: ['b', 'a'] } } };
  assert.equal(run('lpPinIds(["d", "c"])'), true);
  assert.equal(box._saves, 1, 'one save = one undo step');
  assert.ok(st.resources.find(r => r.id === 'c').pinned && st.resources.find(r => r.id === 'd').pinned);
  assert.deepEqual(plain(st.home.widgetPrefs.launchpad.order), ['b', 'a', 'd', 'c'], 'the new pins at the end, in the order asked');
  const t = toasts.pop();
  assert.equal(t.msg, 'Pinned 2'); assert.equal(t.o.action.label, 'Undo');
  t.o.action.run(); assert.equal(box._undone, 1, 'Undo is the page\'s undo');
  // Again: nothing to do, nothing saved.
  assert.equal(run('lpPinIds(["c"])'), false); assert.equal(box._saves, 1);
});

test('a drop\'s check pins new items (saved pinned) and pins saved ones, in one save; unpinning is one save too', () => {
  const { st, toasts, run, box } = homeBox([folder('a'), R('w', 'url', 'https://example.com/wiki', { pinned: false })]);
  const items = plain(vm.runInContext('lpDropItems', logic)('https://example.com/wiki\nC:\\Work\\New folder\\').items);
  box.items = items;
  assert.equal(run('lpPinItems(items)'), true);
  assert.equal(box._saves, 1);
  const made = st.resources.find(r => r.kind === 'folder' && r.target === 'C:\\Work\\New folder');
  assert.ok(made && made.pinned === true, 'the new folder is saved, pinned');
  assert.equal(st.resources.find(r => r.id === 'w').pinned, true, 'the saved link is pinned, not saved twice');
  assert.equal(st.resources.length, 3);
  assert.deepEqual(plain(st.home.widgetPrefs.launchpad.order), ['a', 'w', made.id]);
  assert.match(toasts.pop().msg, /^Pinned 2$/);
  // Unpin: one save, gone from the order, Undo offered.
  run('_lpUnpin("w")');
  assert.equal(box._saves, 2);
  assert.equal(st.resources.find(r => r.id === 'w').pinned, false);
  assert.deepEqual(plain(st.home.widgetPrefs.launchpad.order), ['a', made.id]);
  const t = toasts.pop(); assert.match(t.msg, /^Unpinned "/); assert.equal(t.o.action.label, 'Undo');
  run('_lpUnpin("w")'); assert.equal(box._saves, 2, 'unpinning again does nothing');
});
