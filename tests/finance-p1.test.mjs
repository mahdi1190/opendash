// P1 visual review fixes that carry logic (src/finance/25-c1-kit.js): the calendar heatmap's cell
// size, the edge-label spacing on line charts, the label halo on inside y axes and the quiet zoom
// scrubber. Runs the view in the stub-DOM sandbox of tools/finance-numbers.mjs (no browser).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFinanceView } from '../tools/finance-numbers.mjs';

const C1 = loadFinanceView({ currency: 'GBP', locale: 'en-GB' })._c1;

test('calCells: near-square cells (at most 1.5:1, 11-28 px tall), the grid centred, never left of the day letters', () => {
  for (const [w, weeks] of [[1120, 14], [1120, 5], [1120, 53], [330, 14], [330, 53], [700, 27], [1400, 1]]) {
    const c = C1.calCells(w, weeks);
    assert.ok(c.ch >= 11 && c.ch <= 28, `height ${c.ch} for ${w}px / ${weeks} weeks`);
    assert.ok(c.cw >= 11, `width ${c.cw}`);
    assert.ok(c.cw <= Math.max(11, Math.round(c.ch * 1.5)), `${c.cw} x ${c.ch} stays near-square`);
    assert.ok(c.left >= 30, 'room for the day letters');
    // Centred: equal room either side (within rounding), unless the grid is wider than that allows.
    const spare = w - 24 - weeks * c.cw;
    if (spare / 2 >= 30) assert.ok(Math.abs(c.left - spare / 2) <= 0.5, `centred: left ${c.left}, spare ${spare}`);
  }
  // A quarter on a wide card: no longer 74 px bars.
  const q = C1.calCells(1120, 14);
  assert.deepEqual([q.cw, q.ch], [42, 28]);
  assert.equal(q.left, Math.round((1120 - 24 - 14 * 42) / 2));
  // A year fills the card with square cells, as before.
  const y = C1.calCells(1120, 53);
  assert.equal(y.cw, y.ch);
  assert.equal(y.left, 30);
});

test('xCat edge labels: the last label always shows and no label crowds it; every k-th otherwise', () => {
  const labels = Array.from({ length: 14 }, (_, i) => `L${i}`);
  const ax = C1.xCat(labels, { edge: true, width: 300 });
  const f = ax.axisLabel.interval;
  assert.equal(typeof f, 'function');
  const shown = labels.map((_, i) => i).filter(i => f(i));
  assert.equal(shown[0], 0); assert.equal(shown[shown.length - 1], 13);
  const k = Math.ceil(14 / Math.floor(300 / 70));
  for (let j = 1; j < shown.length; j++) assert.ok(shown[j] - shown[j - 1] >= Math.ceil(k * 0.75), `gap ${shown[j - 1]}..${shown[j]}`);
  assert.ok(shown.length <= Math.floor(300 / 70) + 1, 'no more labels than fit');
  // Without a width (or with a caller's own interval) ECharts' own spacing stays in charge.
  assert.equal(C1.xCat(labels, { edge: true }).axisLabel.interval, undefined);
  assert.equal(C1.xCat(labels, { edge: true, width: 300, label: { interval: 0 } }).axisLabel.interval, 0);
  assert.equal(C1.xCat(labels, { width: 300 }).axisLabel.interval, undefined, 'centred (bar) axes are untouched');
});

test('yIn: labels carry a surface halo and draw above the series; a caller can put the axis back under a fill', () => {
  const y = C1.yIn({});
  assert.equal(y.axisLabel.inside, true);
  assert.equal(y.axisLabel.textBorderWidth, 3);
  assert.equal(y.z, 6);
  assert.equal(C1.yIn({ extra: { z: 0 } }).z, 0);
});

test('zoom: a quiet scrubber (no second copy of the data), always 10 px whatever the caller asks', () => {
  const z = C1.zoom({ start: 0, end: 100, height: 18, left: 44 });
  assert.equal(z.type, 'slider');
  assert.equal(z.height, 10);
  assert.equal(z.left, 44);
  assert.equal(z.dataBackground.areaStyle.opacity, 0);
  assert.equal(z.selectedDataBackground.lineStyle.opacity, 0);
});
