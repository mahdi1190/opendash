// Merchants, Recurring and Transactions (src/finance/25-vendor-kit.js and the
// sections that use it): the pure vendor logic VL.*, merchant name variants
// counted as one merchant, and the numbers staying put. Runs the Finances
// view in the stub-DOM sandbox of tools/finance-numbers.mjs (no browser).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadFinanceView } from '../tools/finance-numbers.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FV = loadFinanceView();
const { VL } = FV._vendors;
const plain = x => JSON.parse(JSON.stringify(x));
const dn = iso => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5);
const iso = n => new Date(n * 864e5).toISOString().slice(0, 10);
const symBox = {}; vm.createContext(symBox);
vm.runInContext(readFileSync(join(ROOT, 'src', 'app', '67-fin-symbols.js'), 'utf8'), symBox);

test('monoPath passes through every point and never overshoots (Fritsch–Carlson)', () => {
  const pts = [[0, 30], [10, 5], [20, 5], [30, 28], [40, 2], [50, 2.5], [60, 40], [70, 39]];
  const d = VL.monoPath(pts);
  const segs = d.split('C').slice(1).map(s => s.trim().split(/\s+/).map(Number));
  assert.equal(segs.length, pts.length - 1);
  segs.forEach((s, i) => {
    const [, c1y, , c2y, x, y] = s;
    assert.deepEqual([x, y], pts[i + 1], 'segment ends on the data point');
    const lo = Math.min(pts[i][1], pts[i + 1][1]) - 1e-6, hi = Math.max(pts[i][1], pts[i + 1][1]) + 1e-6;
    assert.ok(c1y >= lo && c1y <= hi && c2y >= lo && c2y <= hi, `segment ${i}: control points inside [${lo}, ${hi}] (${c1y}, ${c2y})`);
  });
  assert.equal(VL.monoPath([]), '');
  assert.match(VL.monoPath([[0, 1]]), /^M0 1$/);
});

test('groupAgg merges name variants; totals and visits add up; the biggest name leads', () => {
  const rows = [
    { m: 'TESCO STORES 3345', total: 40, count: 2, cats: { Groceries: 40 }, first: 10, last: 20 },
    { m: 'Tesco', total: 100, count: 5, cats: { Groceries: 90, Shopping: 10 }, first: 5, last: 30 },
    { m: 'Corner Shop', total: 7, count: 1, cats: { Groceries: 7 }, first: 12, last: 12 },
  ];
  const key = m => (/tesco/i.test(m) ? 'tesco' : m.toLowerCase());
  const g = VL.groupAgg(rows, key, k => (k === 'tesco' ? 'Tesco' : k)).sort((a, b) => b.total - a.total);
  assert.equal(g.length, 2);
  assert.equal(g[0].total, 140); assert.equal(g[0].count, 7); assert.equal(g[0].primary, 'Tesco');
  assert.deepEqual(plain(g[0].raw), ['Tesco', 'TESCO STORES 3345']);
  assert.equal(g[0].first, 5); assert.equal(g[0].last, 30); assert.equal(g[0].cat, 'Groceries');
  assert.equal(Math.round(g[0].avg * 100) / 100, 20);
});

test('raceFrames: cumulative per merchant, ends on the range totals, top n only', () => {
  const rows = [];
  const add = (m, n, s) => rows.push({ m, n, s });
  add('A', 0, 10); add('A', 8, 5); add('B', 1, 30); add('B', 15, -4); add('C', 20, 2); add('D', 3, 1);
  const buckets = [{ label: 'w1' }, { label: 'w2' }, { label: 'w3' }];
  const ix = n => Math.floor(n / 7);
  const r = VL.raceFrames(rows, m => m, buckets, ix, 'spend', 3);
  assert.deepEqual(plain(r.keys), ['B', 'A', 'C']);
  assert.deepEqual(plain(r.frames.map(f => f.values)), [[30, 10, 0], [30, 15, 0], [26, 15, 2]]);
  const v = VL.raceFrames(rows, m => m, buckets, ix, 'visits', 10);
  assert.deepEqual(plain(v.frames[2].values), [2, 1, 1, 1], 'a refund is not a visit');
});

test('occurrences: paid charges in range, then monthly on the same day of the month', () => {
  const r = { active: true, period: 30.44, typical: 9.99, next: dn('2026-10-31'), charges: [{ n: dn('2026-08-31'), s: 9.99 }, { n: dn('2026-09-30'), s: 10.49 }] };
  const o = VL.occurrences(r, dn('2026-09-01'), dn('2027-01-31'));
  assert.deepEqual(plain(o.map(x => [iso(x.n), x.amt, x.paid])), [
    ['2026-09-30', 10.49, true], ['2026-10-31', 9.99, false], ['2026-11-30', 9.99, false], ['2026-12-31', 9.99, false], ['2027-01-31', 9.99, false]]);
  const wk = VL.occurrences({ active: true, period: 7, typical: 5, next: 100, charges: [{ n: 93, s: 5 }] }, 90, 115);
  assert.deepEqual(plain(wk.map(x => x.n)), [93, 100, 107, 114]);
  assert.deepEqual(plain(VL.occurrences({ active: false, period: 7, typical: 5, next: 100, charges: [{ n: 93, s: 5 }] }, 90, 115).map(x => x.n)), [93], 'stopped: no expected charges');
});

test('priceChange: the newest change, inside the window only; isNew', () => {
  const r = { charges: [{ n: 100, s: 9.99 }, { n: 130, s: 9.99 }, { n: 160, s: 11.99 }, { n: 190, s: 11.99 }] };
  assert.deepEqual(plain(VL.priceChange(r, 200, 70)), { from: 9.99, to: 11.99, diff: 2, n: 160, up: true });
  assert.equal(VL.priceChange(r, 260, 70), null, 'too long ago');
  assert.equal(VL.priceChange({ charges: [{ n: 1, s: 5 }, { n: 2, s: 5 }] }, 3, 70), null, 'no change');
  assert.equal(VL.priceChange({ charges: [{ n: 1, s: 20 }, { n: 31, s: 18 }] }, 40, 70).up, false);
  assert.equal(VL.isNew({ first: 150 }, 200, 70), true);
  assert.equal(VL.isNew({ first: 100 }, 200, 70), false);
});

test('payday: monthly salary -> the next one a month on, moved back off a weekend', () => {
  const rows = [['2026-07-24', 3000], ['2026-08-25', 3000], ['2026-09-25', 3100], ['2026-09-10', 40]].map(([d, inc]) => ({ n: dn(d), inc }));
  const p = VL.payday(rows, dn('2026-10-02'));
  assert.equal(p.days.length, 3, 'small income is not a payday');
  assert.equal(iso(p.last), '2026-09-25');
  assert.equal(iso(p.next), '2026-10-23', '25 Oct 2026 is a Sunday: paid on Friday 23rd');
  assert.equal(p.amount, 3000);
  assert.equal(VL.payday([{ n: 5, inc: 100 }], 10), null);
  assert.equal(VL.payday([{ n: dn('2026-09-25'), inc: 2000 }], dn('2026-10-02')).next, null, 'one payday: no guess');
});

test('dayGroups and unseen', () => {
  const rows = [{ n: 5, s: 3, a: -3, k: 'a' }, { n: 5, s: 0, a: 50, k: 'b' }, { n: 4, s: 2.5, a: -2.5, k: 'c' }];
  assert.deepEqual(plain(VL.dayGroups(rows).map(d => [d.n, d.rows.length, d.spent, d.inc])), [[5, 2, 3, 50], [4, 1, 2.5, 0]]);
  assert.equal(VL.unseen(rows, null).size, 0, 'first visit: nothing is new');
  assert.deepEqual([...VL.unseen(rows, { since: 4, keys: ['a', 'c'] })], ['b']);
  assert.deepEqual([...VL.unseen(rows, { since: 5, keys: ['a'] })], ['b'], 'older rows than the snapshot are never "new"');
});

test('a merchant filter covers its name variants; with no filter the numbers do not move', () => {
  const tx = [
    { d: '2026-09-01', m: 'TESCO STORES 3345', c: 'Groceries', a: -20, k: 'k1' },
    { d: '2026-09-05', m: 'Tesco', c: 'Groceries', a: -30, k: 'k2' },
    { d: '2026-09-06', m: 'Corner Shop', c: 'Groceries', a: -5, k: 'k3' },
    { d: '2026-09-07', m: 'Payroll', c: 'Income', a: 2000, k: 'k4' },
  ];
  const analysis = { today: '2026-09-30', transactions: tx, categories: ['Groceries', 'Income'], exclude_from_spending: ['Income', 'Internal transfers'] };
  const before = plain(FV._numbers({ preset: '1M', analysis }));
  FV._vendors.useSymbols(symBox.FinSymbols);
  const after = plain(FV._numbers({ preset: '1M', analysis }));
  assert.deepEqual(after, before, 'grouping changes nothing until a merchant is chosen');
  assert.equal(after.merchants.count, 3, 'the existing merchant numbers still count raw names');
  const one = plain(FV._numbers({ preset: '1M', analysis, filters: { merchant: 'Tesco' } }));
  assert.equal(one.kpis.spent, 50, 'both Tesco names are in');
  assert.equal(one.transactions.shown, 2, 'both Tesco rows are listed');
  const other = plain(FV._numbers({ preset: '1M', analysis, filters: { merchant: 'Corner Shop' } }));
  assert.equal(other.kpis.spent, 5);
  FV._vendors.useSymbols(undefined);
});

test('the sections only read symbols through FinSymbols, and escape what they write', () => {
  const src = ['22-merchant-rank.js', '24-upcoming.js', '25-vendor-kit.js', '33-merchants.js', '35-recurring.js', '37-transactions.js', '41-drawer.js']
    .map(f => readFileSync(join(ROOT, 'src', 'finance', f), 'utf8')).join('\n');
  assert.doesNotMatch(src, /https?:\/\//, 'nothing is fetched');
  assert.doesNotMatch(src, /innerHTML\s*=\s*`[^`]*\$\{(?!id|w|ht|line|c\b|o\.|last|\(last)/, 'template HTML only interpolates numbers and ids');
  // No smoothing on bars, none above the monotone range.
  for (const line of src.split('\n')) if (/type:\s*'bar'/.test(line)) assert.doesNotMatch(line, /\bsmooth:/);
});
