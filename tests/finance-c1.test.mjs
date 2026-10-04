// The C1 chart helpers for Spending, Categories and Cash flow (src/finance/25-c1-kit.js):
// the new analysis behind the pace chart, the time-of-month pattern, the calendar's quantile
// bins and the cash-flow sankey, plus the smoothing and tooltip guarantees. Runs the view in
// the stub-DOM sandbox of tools/finance-numbers.mjs (no browser).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFinanceView } from '../tools/finance-numbers.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const plain = x => JSON.parse(JSON.stringify(x));
const C1 = loadFinanceView({ currency: 'GBP', locale: 'en-GB' })._c1;
const day = iso => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5);

test('monoPath: a monotone cubic through every point that never overshoots', () => {
  const P = [[0, 10], [10, 40], [20, 35], [30, 90], [40, 90], [50, 0]];
  const d = C1.monoPath(P);
  assert.match(d, /^M0 10C/);
  const segs = d.slice(1).split('C').slice(1).map(s => s.trim().split(/\s+/).map(Number));
  assert.equal(segs.length, P.length - 1);
  segs.forEach((s, i) => {
    const [, y1, , y2, x3, y3] = s; const lo = Math.min(P[i][1], P[i + 1][1]), hi = Math.max(P[i][1], P[i + 1][1]);
    assert.equal(x3, P[i + 1][0]); assert.equal(y3, P[i + 1][1], 'passes through the point');
    for (const y of [y1, y2]) assert.ok(y >= lo - 1e-9 && y <= hi + 1e-9, `control point ${y} stays within [${lo}, ${hi}]`);
  });
  assert.equal(C1.monoPath([]), '');
  assert.equal(C1.monoPath([[1, 2]]), 'M1 2');
});

test('heatBins: quantile edges of spending days, strictly increasing, so one big day never washes out the rest', () => {
  const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 2000];
  const e = plain(C1.heatBins(vals));
  assert.equal(e.length, 4);
  assert.ok(e.every((x, i) => i === 0 || x > e[i - 1]));
  assert.ok(e[3] < 100, 'the rent-sized day does not stretch the scale');
  assert.equal(C1.binOf(0.5, e), 0); assert.equal(C1.binOf(2000, e), 4);
  assert.deepEqual(plain(C1.heatBins([5, 5, 5, 5])), [5], 'equal values collapse to one edge');
  assert.deepEqual(plain(C1.heatBins([0, -3])), [], 'no spending days, no bins');
});

test('pace: cumulative by day of the period; the ends equal the totals; days before the data are blank', () => {
  const rg = { from: day('2026-09-01'), to: day('2026-09-10'), len: 10 };
  const prev = { from: day('2026-08-22'), to: day('2026-08-31'), len: 10 };
  const cur = [{ n: day('2026-09-01'), s: 10 }, { n: day('2026-09-03'), s: 5 }, { n: day('2026-09-10'), s: 20 }, { n: day('2026-09-04'), s: -2 }];
  const prv = [{ n: day('2026-08-25'), s: 7 }, { n: day('2026-08-31'), s: 3 }];
  const P = plain(C1.pace(cur, prv, rg, prev, rg.to, day('2026-08-24')));
  assert.equal(P.len, 10); assert.equal(P.today, 9);
  assert.equal(P.cur[9], 33, 'this period ends at its total (refunds included)');
  assert.equal(P.cur[3], 13);
  assert.equal(P.prev[0], null, 'before the data starts: no line (not a fake zero)');
  assert.equal(P.prev[1], null);
  assert.equal(P.prev[3], 7); assert.equal(P.prevTotal, 10); assert.equal(P.prevAtToday, 10);
  assert.equal(P.partialPrev, true);
  const P2 = plain(C1.pace(cur, prv, rg, prev, day('2026-09-05'), 0));
  assert.equal(P2.today, 4); assert.equal(P2.cur[5], null, 'after today: blank'); assert.equal(P2.partialPrev, false);
});

test('monthDays: average per calendar day for each day of the month, and the early / mid / late split', () => {
  const from = day('2026-07-01'), to = day('2026-08-31');
  const rows = [{ n: day('2026-07-01'), s: 30 }, { n: day('2026-08-01'), s: 10 }, { n: day('2026-07-31'), s: 9 }, { n: day('2026-08-15'), s: 4 }];
  const m = plain(C1.monthDays(rows, from, to));
  assert.equal(m.days.reduce((a, b) => a + b, 0), 62, 'every day of the range counted once');
  assert.equal(m.days[30], 2); assert.equal(m.days[0], 2);
  assert.equal(m.avg[0], 20); assert.equal(m.avg[30], 4.5); assert.equal(m.avg[14], 2);
  assert.equal(m.sums.reduce((a, b) => a + b, 0), 53);
  assert.ok(Math.abs(m.early - 40 / 20) < 1e-9 && Math.abs(m.mid - 4 / 20) < 1e-9 && Math.abs(m.late - 9 / 22) < 1e-9);
});

test('sankey: every node balances; kept is in minus out; overspending draws on the balance; refunds are a source', () => {
  const inflow = (m, id) => m.links.filter(l => l.target === id).reduce((a, l) => a + l.value, 0);
  const outflow = (m, id) => m.links.filter(l => l.source === id).reduce((a, l) => a + l.value, 0);
  const near = (a, b) => Math.abs(a - b) < 0.011;
  const cats = [{ name: 'Rent', value: 900, members: ['Rent'] }, { name: 'Groceries', value: 250, members: ['Groceries'] }, { name: 'Everything else', value: 150, members: ['A', 'B'] }];
  const a = plain(C1.sankey({ sources: [['Acme', 2000], ['Gift', 100], ['X', 1], ['Y', 2], ['Z', 3]], cats, out: 1300, inc: 2106 }));
  assert.equal(a.hub, 'Money in'); assert.equal(a.kept, 806); assert.ok(near(a.rate, 806 / 2106));
  assert.ok(near(inflow(a, 'hub'), outflow(a, 'hub')), 'the hub balances');
  assert.ok(near(inflow(a, 'hub'), 2106));
  assert.equal(a.nodes.filter(n => n.side === 'l').length, 4, 'top 3 sources + "Other money in"');
  assert.equal(a.nodes.find(n => n.kind === 'kept').label, 'Kept');
  assert.equal(a.nodes[a.nodes.length - 1].kind, 'kept', 'kept comes last');
  assert.deepEqual(a.nodes.find(n => n.label === 'Everything else').members, ['A', 'B']);
  const b = plain(C1.sankey({ sources: [['Acme', 1000]], cats, out: 1300, inc: 1000 }));
  assert.equal(b.hub, 'Money out'); assert.equal(b.kept, -300);
  assert.ok(near(inflow(b, 'hub'), outflow(b, 'hub')));
  assert.equal(b.links.find(l => l.source === 'src:balance').value, 300);
  assert.ok(!b.nodes.some(n => n.kind === 'kept'));
  // A category of refunds (negative) is folded away; its money comes back in as "Refunds".
  const c = plain(C1.sankey({ sources: [['Acme', 1000]], cats, out: 1250, inc: 1000 }));
  assert.equal(c.refunds, 50);
  assert.ok(near(inflow(c, 'hub'), outflow(c, 'hub')));
  const n0 = plain(C1.sankey({ sources: [], cats: [], out: 0, inc: 0 }));
  assert.equal(n0.rate, null); assert.equal(n0.links.length, 0);
});

test('bucketSeries: per-key series over the buckets, rows outside ignored', () => {
  const B = [{}, {}, {}];
  const m = C1.bucketSeries([{ n: 0, s: 1, c: 'a' }, { n: 1, s: 2, c: 'a' }, { n: 1, s: 4, c: 'b' }, { n: 9, s: 5, c: 'a' }, { n: 2, s: 1, c: null }], B, n => n, x => x.c);
  assert.deepEqual(plain([...m.entries()]), [['a', [1, 2, 0]], ['b', [0, 4, 0]]]);
});

test('tooltips escape merchant names and amounts; the payment rows fall back to a plain monogram', () => {
  const html = C1.tip('<b>Day', [{ c: 'red"x', v: '<img src=x onerror=1>', k: 'a&b', key: 'ds' }, { v: '1', k: 'x', tone: 'good' }], { sub: '<i>', items: [{ m: '<script>', c: 'Groceries', a: 3 }], foot: 'f<' });
  assert.ok(!/<img|<script|<b>Day|<i>/.test(html), html);
  assert.match(html, /&lt;img/); assert.match(html, /a&amp;b/); assert.match(html, /red&quot;x/); assert.match(html, /c1-good/);
  assert.match(html, /class="ds"/);
});

test('my charts: lines smooth 0.25-0.35 and monotone, bars never smoothed, no hard-coded currency', () => {
  for (const f of ['20-trend.js', '21-cat-breakdown.js', '25-c1-kit.js', '31-spending.js', '32-categories.js', '34-cashflow.js']) {
    const src = readFileSync(join(ROOT, 'src', 'finance', f), 'utf8');
    for (const m of src.matchAll(/\bsmooth:\s*([0-9.]+)/g)) assert.ok(+m[1] >= 0.25 && +m[1] <= 0.35, `${f}: smooth ${m[1]}`);
    assert.doesNotMatch(src, /smooth:\s*true/, `${f}: unbounded smoothing`);
    assert.doesNotMatch(src.replace(/\/\/.*$/gm, ''), /£/, `${f}: currency symbol`);
  }
  // Under reduced motion the helpers ask for no animation at all.
  const Cr = loadFinanceView({}, ROOT, { reduced: true })._c1;
  assert.equal(Cr.tooltip({ trigger: 'axis' }).transitionDuration, 0);
});
