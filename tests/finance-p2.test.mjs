// P2 (performance, accessibility, robustness) for the Finances view: the cached
// date formatter gives exactly what toLocaleDateString gave, and the chart data
// tables (07-chart-a11y.js: a chart's numbers for keyboard and screen-reader
// users) read every chart shape correctly and leave decoration out. Runs the
// view in the stub-DOM sandbox of tools/finance-numbers.mjs (no browser).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFinanceView } from '../tools/finance-numbers.mjs';
import { financeSources } from '../build.mjs';

const FV = loadFinanceView({ currency: 'GBP', locale: 'en-GB' });
const P = FV._p2;
const plain = x => JSON.parse(JSON.stringify(x));
const money = () => v => '£' + Math.round(v).toLocaleString('en-GB');
const day = ms => new Date(ms).toISOString().slice(5, 10);

test('fd (one cached Intl formatter per option set) matches toLocaleDateString exactly', () => {
  const OPTS = [undefined, { day: 'numeric', month: 'short' }, { day: 'numeric', month: 'short', year: 'numeric' }, { weekday: 'short', day: 'numeric', month: 'short' },
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, { month: 'long', year: 'numeric' }, { month: 'short', year: '2-digit' }, { month: 'short' },
    { weekday: 'long', day: 'numeric', month: 'long' }, { weekday: 'long' }, { month: 'long' }, { weekday: 'short', day: 'numeric' }];
  for (const o of OPTS) for (let n = 19700; n < 20800; n += 13) {
    const want = new Date(n * 864e5).toLocaleDateString('en-GB', Object.assign({ timeZone: 'UTC' }, o));
    assert.equal(P.fd(n, o), want, JSON.stringify(o) + ' day ' + n);
    assert.equal(P.fd(n, o && Object.assign({}, o)), want, 'a fresh options object hits the same cache entry');
  }
});

test('a11yRows: category bars + a running total on a second axis; decoration is left out', () => {
  const opt = {
    xAxis: [{ type: 'category', data: ['1 Sep', '8 Sep', '15 Sep'] }, { type: 'category', data: ['1 Sep', '8 Sep', '15 Sep'], gridIndex: 1 }],
    yAxis: [{ type: 'value' }, { type: 'value', gridIndex: 1 }, { type: 'value', show: false, min: 0, max: 1 }],
    series: [
      { id: 'spend', name: 'Spent', type: 'bar', data: [120, { value: 80.4 }, '-'] },
      { id: 'inDot', name: 'Money in', type: 'scatter', yAxisIndex: 2, data: [0.965, null, null] },          // hidden 0-1 rail
      { id: 'band', name: 'Usual range', type: 'line', silent: true, tooltip: { show: false }, data: [1, 2, 3] },
      { id: 'now', type: 'effectScatter', data: [[2, 3]] },
      { id: 'cum', name: 'Running total', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: [120, 200.4, 200.4] },
    ],
  };
  const r = P.a11yRows(opt, money, day);
  assert.equal(r.kind, 'bar chart');
  assert.deepEqual(plain(r.cols), ['', 'Spent', 'Running total']);
  assert.deepEqual(plain(r.rows), [['1 Sep', '£120', '£120'], ['8 Sep', '£80', '£200'], ['15 Sep', '—', '£200']]);
  assert.equal(r.n, 3); assert.equal(r.first, '1 Sep'); assert.equal(r.last, '15 Sep'); assert.equal(r.ranged, true);
  assert.deepEqual(plain(P.a11ySeries(opt).map(s => s.id)), ['spend', 'cum']);
  // a row with nothing at all is skipped
  const r2 = P.a11yRows({ xAxis: { type: 'category', data: ['a', 'b'] }, yAxis: {}, series: [{ name: 'S', type: 'bar', data: [null, 5] }] }, money, day);
  assert.deepEqual(plain(r2.rows), [['b', '£5']]);
});

test('a11yRows: time axes with ISO dates or epoch ms, in date order', () => {
  const opt = { xAxis: { type: 'time' }, yAxis: { type: 'value' }, series: [
    { name: 'Total', type: 'line', data: [['2026-09-03', 50], ['2026-09-01', 10], ['2026-09-02', -5]] },
    { name: 'Card', type: 'line', data: [[Date.UTC(2026, 8, 1), 1], [Date.UTC(2026, 8, 3), 3]] },
  ] };
  const r = P.a11yRows(opt, money, day);
  assert.deepEqual(plain(r.rows), [['09-01', '£10', '£1'], ['09-02', '£-5', '—'], ['09-03', '£50', '£3']]);
  assert.equal(r.ranged, true);
});

test('a11yRows: donut shares, treemap children, sankey names from the label formatter, gauge', () => {
  const pie = P.a11yRows({ series: [{ id: 'dist', type: 'pie', data: [{ name: 'Rent', value: 750 }, { name: 'Food', value: 250 }] }] }, money, day);
  assert.equal(pie.kind, 'donut chart');
  assert.deepEqual(plain(pie.rows), [['Rent', '£750', '75%'], ['Food', '£250', '25%']]);
  const tm = P.a11yRows({ series: [{ type: 'treemap', data: [{ name: 'Food', value: 30, children: [{ name: 'Cafe', value: 10 }, { name: 'Shop', value: 20 }] }] }] }, money, day);
  assert.deepEqual(plain(tm.rows), [['Food', '£30', '100%'], ['Food › Cafe', '£10', ''], ['Food › Shop', '£20', '']]);
  const names = { 'src:0': 'Salary', hub: 'Money in', 'cat:0': 'Rent {x}' };
  const sk = P.a11yRows({ series: [{ type: 'sankey', label: { formatter: p => `${names[p.name]}  {v|£1,234}` }, data: [], links: [{ source: 'src:0', target: 'hub', value: 1000 }, { source: 'hub', target: 'cat:0', value: 600 }] }] }, money, day);
  assert.equal(sk.kind, 'flow diagram');
  assert.deepEqual(plain(sk.rows), [['Salary → Money in', '£1,000'], ['Money in → Rent x', '£600']]);
  const g = P.a11yRows({ series: [{ type: 'gauge', name: 'Kept', detail: { formatter: v => `{a|${v.toFixed(0)}}{b|%}` }, data: [{ value: 8.79, name: 'kept' }] }] }, money, day);
  assert.deepEqual(plain(g.rows), [['Kept', '9 %']]);
});

test('a11yRows: horizontal bars and scatter points', () => {
  const hb = P.a11yRows({ xAxis: { type: 'value' }, yAxis: { type: 'category', data: ['Shop A', 'Shop B'] }, series: [{ name: 'Spent', type: 'bar', data: [[300, 0], 120] }] }, money, day);
  assert.deepEqual(plain(hb.rows), [['Shop A', '£300'], ['Shop B', '£120']]);
  assert.equal(hb.ranged, false, 'a ranked list is not a time range');
  const sc = P.a11yRows({ xAxis: { type: 'log', name: 'Visits', axisLabel: { formatter: v => String(v) } }, yAxis: { type: 'log', name: 'Average' }, series: [{ type: 'scatter', data: [{ name: 'Cafe', value: [12, 3.5] }, { name: 'Gym', value: [1, 39] }] }] }, (s, ax) => (ax && ax.name === 'Visits' ? v => String(v) : money()), day);
  assert.deepEqual(plain(sc.cols), ['', 'Visits', 'Average']);
  assert.deepEqual(plain(sc.rows), [['Cafe', '12', '£4'], ['Gym', '1', '£39']]);
  // charges on a date axis against a merchant (category) axis, with the amount as a third value
  const ch = P.a11yRows({ xAxis: { type: 'time' }, yAxis: { type: 'category', data: ['Stream', 'Gym'] }, series: [{ type: 'scatter', data: [['2026-09-08', 0, 12.99], ['2026-09-14', 1, 39]] }] }, money, day);
  assert.deepEqual(plain(ch.cols), ['Date', '', 'Amount']);
  assert.deepEqual(plain(ch.rows), [['09-08', 'Stream', '£13'], ['09-14', 'Gym', '£39']]);
});

test('a11yRows: charge history in date order, amounts from the point, "expected" marked, years on a long span', () => {
  const dayY = (ms, yr) => new Date(ms).toISOString().slice(yr ? 0 : 5, 10);
  const opt = { xAxis: { type: 'time' }, yAxis: { type: 'category', data: ['Gym', 'Stream'] }, series: [
    { id: 'paid', type: 'scatter', data: [{ value: ['2025-09-14', 'Gym'], amt: 39 }, { value: ['2026-09-14', 'Gym'], amt: 41 }, { value: ['2025-09-08', 'Stream'], amt: 12.99 }] },
    { id: 'next', type: 'scatter', data: [{ value: ['2026-10-08', 'Stream'], amt: 12.99, exp: true }] },
  ] };
  const r = P.a11yRows(opt, money, dayY);
  assert.deepEqual(plain(r.cols), ['Date', '', 'Amount']);
  assert.deepEqual(plain(r.rows), [['2025-09-08', 'Stream', '£13'], ['2025-09-14', 'Gym', '£39'], ['2026-09-14', 'Gym', '£41'], ['2026-10-08 (expected)', 'Stream', '£13']]);
  assert.equal(r.first, '2025-09-08'); assert.equal(r.last, '2026-10-08 (expected)');
  // a short span keeps day-and-month dates
  const short = P.a11yRows({ xAxis: { type: 'time' }, yAxis: { type: 'value' }, series: [{ name: 'Bal', type: 'line', data: [['2026-09-02', 5], ['2026-09-01', 4]] }] }, money, dayY);
  assert.deepEqual(plain(short.rows.map(x => x[0])), ['09-01', '09-02']);
  const long = P.a11yRows({ xAxis: { type: 'time' }, yAxis: { type: 'value' }, series: [{ name: 'Bal', type: 'line', data: [['2024-09-01', 4], ['2026-09-02', 5]] }] }, money, dayY);
  assert.deepEqual(plain(long.rows.map(x => x[0])), ['2024-09-01', '2026-09-02']);
});

test('a11yRows: a category axis drawn as rich text (merchant tiles) reads as the cleaned names', () => {
  const clean = { 'TESCO STORES 3345': 'Tesco', 'AMZN MKTP UK*2X': 'Amazon' };
  const fmt = (v, i) => `{t${i}|}{n|${clean[v] || v}}`;
  const opt = { xAxis: { type: 'value' }, yAxis: { type: 'category', data: ['TESCO STORES 3345', 'AMZN MKTP UK*2X', 'Plain'], axisLabel: { formatter: fmt } },
    series: [{ name: 'Spent', type: 'bar', data: [300, 120, 5] }] };
  assert.deepEqual(plain(P.a11yRows(opt, money, day).rows), [['Tesco', '£300'], ['Amazon', '£120'], ['Plain', '£5']]);
  // a plain formatter (dates, short labels) is not used: the raw label stays
  const opt2 = { xAxis: { type: 'category', data: ['2026-09-01', '2026-09-08'], axisLabel: { formatter: () => '' } }, yAxis: { type: 'value' }, series: [{ name: 'S', type: 'bar', data: [1, 2] }] };
  assert.deepEqual(plain(P.a11yRows(opt2, money, day).rows.map(x => x[0])), ['09-01', '09-08']);
});

test('a11yLabel: the card title, the kind, the size, and a date span only for time-like axes', () => {
  const cd = { el: { querySelector: () => ({ textContent: ' Spending over time ' }) } };
  assert.equal(P.a11yLabel(cd, { kind: 'bar chart', n: 14, first: '29 Jun', last: '28 Sept', ranged: true }), 'Spending over time: bar chart, 14 points, 29 Jun to 28 Sept. Press Enter to read the numbers.');
  assert.equal(P.a11yLabel(cd, { kind: 'donut chart', n: 8, first: 'Rent', last: 'Other', ranged: false }), 'Spending over time: donut chart, 8 parts. Press Enter to read the numbers.');
  assert.equal(P.a11yLabel(cd, { kind: '', n: 0 }), 'Spending over time: chart. Press Enter to read the numbers.');
  assert.equal(P.a11yLabel(cd, { kind: 'gauge', n: 1 }), 'Spending over time: gauge. Press Enter to read the numbers.');
});

test('plot() turns off ECharts’ own aria label and labels every chart itself; the a11y CSS uses tokens only', () => {
  const { js, css } = financeSources();
  assert.match(js, /option\.aria = \{ enabled: false \}/);
  assert.match(js, /fxA11y\(c, cd, option\)/);
  const mine = css.slice(css.indexOf('@part 97-a11y.css'));
  assert.ok(mine.length > 100, '97-a11y.css is in the build');
  assert.deepEqual([...mine.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0]), [], 'no raw colours');
});
