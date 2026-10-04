// Home as a board of "shelves" (HOME_SPEC.md 1-3, 5.5-5.7): the grid places widgets by
// saved order and size only, the default board fills whole rows, Customise shows the
// columns a row leaves free, the glide measures layout sizes (a sway or a scale is not a
// move), the gallery's size labels, and the entrance continues across a re-render.
// Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { HOME_WIDGETS, HOME_SIZE_COLS } from '../lib/home-topbar.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const STYLES = join(ROOT, 'src', 'styles');
const HOME_FILES = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort();
const plain = (x) => JSON.parse(JSON.stringify(x));

function homeBox() {
  const st = { custom: [], statuses: {}, pinned: {}, deleted: {} };
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {} },
    window: { addEventListener() {} }, CSS: { escape: (s) => s },
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null },
    registerSection() {}, saveData() {}, saveUI() {}, render() {}, toast() {}, todayStr: () => '2026-10-07',
    getItem: () => null, statusOf: () => 'todo',
  };
  vm.createContext(box);
  vm.runInContext(HOME_FILES.map(f => readFileSync(join(APP, f), 'utf8')).join('\n'), box, { filename: 'home-bundle.js' });
  return (code) => vm.runInContext(code, box);
}

test('the grid is shelves: no masonry rows, no dense packing; a row stretches its widgets', () => {
  const css = readFileSync(join(STYLES, '13-home-core.css'), 'utf8');
  const rule = /\.home-grid\s*\{([^}]*)\}/.exec(css)[1];
  assert.match(rule, /grid-auto-flow:\s*row\s*;/, 'row flow, not dense');
  assert.doesNotMatch(rule, /dense/);
  assert.match(rule, /grid-auto-rows:\s*auto/, 'no 4px masonry rows');
  assert.match(rule, /align-items:\s*stretch/, 'widgets on a row share its height');
  // homeGridPack no longer writes row spans.
  const grid = readFileSync(join(APP, '12-home-grid.js'), 'utf8');
  assert.doesNotMatch(grid, /gridRowEnd/);
});

test('the default board: whole shelves of 12 at the HOME_SPEC.md 3 sizes, links waiting in the gallery', () => {
  const shown = HOME_WIDGETS.filter(w => !w.defaultHidden).map(w => [w.id, w.defaultSize]);
  assert.deepEqual(shown, [['today', 'full'], ['focus', 'l'], ['schedule', 's'], ['finance', 's'], ['people', 's'], ['countdowns', 's'], ['week', 'l'], ['waiting', 's']]);
  const run = homeBox();
  assert.deepEqual(plain(run(`homeShelfGaps(${JSON.stringify(shown.map(([, s]) => HOME_SIZE_COLS[s]))})`)), [], 'no free columns anywhere');
  // The page registers the same defaults (the catalogue test compares the rest).
  const page = JSON.parse(run('JSON.stringify(homeLayout().widgets.filter(w => !w.hidden).map(w => [w.id, w.size]))'));
  assert.deepEqual(page, shown);
});

test('free columns on a row: where they are and how many (Customise\'s "+" slots)', () => {
  const run = homeBox();
  const gaps = (spans) => plain(run(`homeShelfGaps(${JSON.stringify(spans)})`));
  assert.deepEqual(gaps([12, 8, 4]), []);
  assert.deepEqual(gaps([12, 8, 6]), [{ at: 2, cols: 4 }, { at: 3, cols: 6 }], 'M after L wraps: 4 free before it, 6 after it');
  assert.deepEqual(gaps([4, 6, 4, 8, 4]), [{ at: 2, cols: 2 }, { at: 5, cols: 8 }], 'S+M leaves 2; S+L fill a row; the last S leaves 8');
  assert.deepEqual(gaps([4, 8, 8, 4]), [], 'S+L, L+S');
  assert.deepEqual(gaps([4]), [{ at: 1, cols: 8 }]);
  assert.deepEqual(gaps([]), []);
  assert.deepEqual(gaps([6, 6, 12]), [], 'two halves fill a row');
  assert.deepEqual(gaps(['x', 0, 99]), [], 'junk spans count as whole rows');
});

test('the glide measures layout sizes from the centre: a sway or scale is never a resize or a move', () => {
  const run = homeBox();
  // A 300 x 200 box rotated a little: its bounding box grows, its layout size does not.
  const out = plain(run(`(() => {
    const mk = (r, w, h, flip, kids) => ({ getBoundingClientRect: () => r, offsetWidth: w, offsetHeight: h, isConnected: true,
      dataset: { flip }, parentElement: { closest: () => null }, closest: () => null, querySelectorAll: () => kids || [] });
    const tilted = mk({ left: 98, top: 47, right: 402, bottom: 253, width: 304, height: 206 }, 300, 200, 'w:a');
    const root = mk({ left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000 }, 1000, 1000, '', [tilted]);
    root.contains = () => false;
    return [...homeFlipCapture(root).entries()];
  })()`));
  assert.deepEqual(out, [['>w:a', { x: 100, y: 50, w: 300, h: 200 }]]);
});

test('the sway is not a move for what is inside a widget: its rotation is undone before measuring', () => {
  const run = homeBox();
  // A 400 x 900 widget centred at (500, 600), swaying +-0.22deg; a row 380 px below its centre.
  // On screen the row moves by about 1.5 px between the two ends of the sway; measured, never.
  const out = plain(run(`(() => {
    globalThis.DOMMatrixReadOnly = class { constructor(s) { const [a, b, c, d, e, f] = /matrix\\(([^)]*)\\)/.exec(s)[1].split(',').map(Number); Object.assign(this, { a, b, c, d, e, f }); } };
    globalThis.getComputedStyle = (el) => ({ transform: el._t || 'none' });
    const box = (x, y, w, h) => ({ left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2, width: w, height: h });
    const at = (deg) => {
      const th = deg * Math.PI / 180, cos = Math.cos(th), sin = Math.sin(th);
      const frame = { getBoundingClientRect: () => box(500, 600, 400 * cos + 900 * Math.abs(sin), 400 * Math.abs(sin) + 900 * cos), offsetWidth: 400, offsetHeight: 900,
        isConnected: true, dataset: { flip: 'w:focus' }, parentElement: { closest: () => null }, _t: deg ? 'matrix(' + [cos, sin, -sin, cos, 0, 0].join(', ') + ')' : 'none' };
      frame.closest = (s) => (s === '.hg-w' ? frame : null);
      const row = { getBoundingClientRect: () => box(500 - sin * 380, 600 + cos * 380, 362, 64), offsetWidth: 360, offsetHeight: 60,
        dataset: { flip: 'r1' }, parentElement: { closest: () => frame }, closest: (s) => (s === '.hg-w' ? frame : null) };
      const root = { getBoundingClientRect: () => box(500, 1000, 1000, 2000), offsetWidth: 1000, offsetHeight: 2000, isConnected: true, querySelectorAll: () => [frame, row], contains: () => true };
      return [...homeFlipCapture(root).entries()].map(([k, v]) => [k, Math.round(v.x * 100) / 100, Math.round(v.y * 100) / 100, v.w, v.h]);
    };
    return [at(-0.22), at(0.22), at(0)];
  })()`));
  const still = [['>w:focus', 300, 150, 400, 900], ['w:focus>r1', 20, 800, 360, 60]];
  assert.deepEqual(out, [still, still, still]);
});

test('Customise: the toolbar floats (sticky at the foot), the sway is tiny, off for the hero, reduced motion and hidden tabs', () => {
  const css = readFileSync(join(STYLES, '13-home-edit.css'), 'utf8');
  assert.match(/\.home-editbar\s*\{([^}]*)\}/.exec(css)[1], /position:\s*sticky;\s*bottom:/);
  assert.doesNotMatch(css, /--hg-gap:\s*56px/, 'entering Customise no longer spreads the board');
  assert.match(css, /@keyframes hg-wiggle \{ from \{ transform: rotate\(-0\.22deg\); \} to \{ transform: rotate\(0\.22deg\); \} \}/);
  assert.match(css, /\.hg-w:not\(\[data-wid="today"\]\)/, 'not the hero');
  assert.match(css, /html\.anim-paused \.home\.is-editing \.hg-w[^{]*\{[^}]*animation-play-state:\s*paused/);
  assert.match(css, /\[data-motion="reduced"\] \.home\.is-editing \.hg-w[^{]*\{[^}]*animation:\s*none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.home\.is-editing \.hg-w/);
});

test('Customise keys 1-4 map to the sizes in order; the gallery labels every size', () => {
  const run = homeBox();
  assert.deepEqual(plain(run('HOME_SIZES')), ['s', 'm', 'l', 'full']);
  assert.deepEqual(plain(run('_HG_SIZE_LONG')), { s: 'Small · a third', m: 'Medium · half', l: 'Large · two thirds', full: 'Full width' });
  assert.deepEqual(plain(run('_HG_SIZE_W')), { s: 365, m: 556, l: 746, full: 1128 }, 'preview widths = the sizes at 1440 (HOME_SPEC.md 2)');
  const src = readFileSync(join(APP, '12-home-edit.js'), 'utf8');
  assert.match(src, /\/\^\[1-4\]\$\/\.test\(k\)/);
  assert.match(src, /homeWidgetShow\(id, size\)/, 'Add to Home takes the size picked in the gallery');
});

test('the entrance: Home runs its own (12px rise, 460 ms, 55 ms steps, at most 6) and a re-render continues it', () => {
  const grid = readFileSync(join(APP, '12-home-grid.js'), 'utf8');
  assert.match(grid, /translateY\(12px\) scale\(0\.99\)/);
  assert.match(grid, /duration: 460, delay/);
  assert.match(grid, /Math\.min\(i, 6\) \* 55 - elapsed/);
  const core = readFileSync(join(APP, '12-home.js'), 'utf8');
  assert.match(core, /if \(entering\) homeGridEntrance\(grid\); else homeGridEntranceContinue\(grid\);/);
  // The generic stagger is kept off the widgets (they no longer carry data-stagger).
  assert.doesNotMatch(core, /frame\.setAttribute\('data-stagger'/);
  // Nothing to continue once Home is left.
  const run = homeBox();
  run('_hgEnter = { at: 0, ids: ["focus"] }; homeGridForget();');
  assert.equal(run('_hgEnter'), null);
});
