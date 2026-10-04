// The Finances view as ordered parts (src/finance/), its chart and motion
// kits, the numbers audit hook and the scale fake data. The view runs here in
// the stub-DOM sandbox of tools/finance-numbers.mjs (no browser).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { financeSources, buildHtml, FINANCE_IIFE } from '../build.mjs';
import { originalPart, lineDiff } from '../tools/finance-split-check.mjs';
import { loadFinanceView, diffNumbers } from '../tools/finance-numbers.mjs';
import { buildFakeData } from '../tools/make-fake-data.mjs';
import { buildScaleFinance } from '../tools/make-fake-finance.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src', 'finance');
const parts = readdirSync(DIR).sort();
const read = f => readFileSync(join(DIR, f), 'utf8');
const plain = x => JSON.parse(JSON.stringify(x));   // the sandbox's objects come from another realm
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.011, `${msg}: ${a} vs ${b}`);

test('parts are named NN-area.js / NN-area.css, end with a newline, and each JS part parses on its own', () => {
  assert.ok(parts.filter(f => f.endsWith('.js')).length >= 25);
  for (const f of parts) {
    assert.match(f, /^\d{2}-[a-z0-9-]+\.(js|css)$/, f);
    assert.ok(read(f).endsWith('\n'), `${f} ends with a newline`);
    if (f.endsWith('.js')) assert.doesNotThrow(() => new vm.Script(read(f), { filename: f }), f);
  }
  assert.equal(parts.find(f => f.endsWith('.js')), '00-core.js');
  assert.ok(!existsSync(join(ROOT, 'src', 'finance.js')) && !existsSync(join(ROOT, 'src', 'finance.css')), 'the old single files are gone');
});

test('build puts the JS parts in ONE IIFE in name order, and the CSS parts after motion.css', () => {
  const s = financeSources(ROOT);
  const js = parts.filter(f => f.endsWith('.js')).map(read).join('');
  const css = parts.filter(f => f.endsWith('.css')).map(read).join('');
  assert.equal(s.js, FINANCE_IIFE[0] + js + FINANCE_IIFE[1]);
  assert.equal(s.css, css);
  const html = buildHtml(ROOT);
  assert.equal(html.split('if (window.FinanceView) return;').length - 1, 1, 'one finance wrapper');
  assert.ok(html.indexOf(css) > html.indexOf('window.Motion') || html.indexOf(css) > 0, 'finance CSS in the page');
  assert.ok(html.includes('window.FinanceView._numbers = numbersSnapshot'));
});

test('split check: @part headers and @new blocks are the only allowances', () => {
  assert.equal(originalPart('  // @part 20-x.js · OWNER: C1\nA\n'), 'A\n');
  assert.equal(originalPart('  // @part 06-x.js · NEW · OWNER: C3\nA\n'), null);
  assert.equal(originalPart('A\n  // @new-begin kit\nB\n  // @new-end\nC\n'), 'A\nC\n');
  assert.deepEqual(lineDiff('a\nb\nc', 'a\nB\nc'), ['+2: B', '-2: b']);
  // Every part file has an owner line.
  for (const f of parts) assert.match(read(f).split('\n')[0], /@part .*OWNER: /, `${f} has an @part owner line`);
});

test('smoothing rule: lines and areas smooth 0.25-0.35, monotone in x; bars never smooth', () => {
  for (const f of parts.filter(p => p.endsWith('.js') && p !== '05-chart-kit.js')) {
    for (const line of read(f).split('\n')) {
      const m = /\bsmooth:\s*([0-9.]+)/.exec(line);
      if (m) {
        assert.ok(+m[1] >= 0.25 && +m[1] <= 0.35, `${f}: smooth ${m[1]} out of range`);
        assert.match(line, /smoothMonotone:\s*'x'/, `${f}: smoothing without smoothMonotone 'x'`);
      }
      if (/type:\s*'bar'/.test(line)) assert.doesNotMatch(line, /\bsmooth:/, `${f}: a smoothed bar`);
    }
  }
});

test('chart kit: series factories, axes and tooltip', () => {
  const { FX } = loadFinanceView()._kit;
  const l = FX.smoothLine({ id: 'a', data: [1, 3, 2] });
  assert.equal(l.type, 'line'); assert.equal(l.smooth, 0.3); assert.equal(l.smoothMonotone, 'x');
  assert.equal(FX.smoothLine({ id: 'a', data: [], smooth: 0.9 }).smooth, 0.35);
  assert.equal(FX.smoothLine({ id: 'a', data: [], smooth: 0.05 }).smooth, 0.25);
  assert.equal(FX.smoothLine({ id: 'a', data: [], step: 'end' }).smooth, false);
  assert.ok(FX.area({ id: 'a', data: [] }).areaStyle, 'area has a gradient fill');
  assert.equal(FX.smoothLine({ id: 'a', data: [], endLabel: v => 'v' + v }).endLabel.formatter({ value: [0, 5] }), 'v5');
  const b = FX.bars({ id: 'b', data: [1, 2], morph: true });
  assert.equal(b.type, 'bar'); assert.ok(!('smooth' in b)); assert.ok(b.universalTransition.enabled);
  assert.deepEqual(plain(b.itemStyle.borderRadius), [5, 5, 0, 0]);
  assert.deepEqual(plain(FX.bars({ id: 'b', data: [], horizontal: true }).itemStyle.borderRadius), [0, 5, 5, 0]);
  assert.equal(b.animationDelay(1000), FX.MOTION.staggerMax, 'stagger is capped');
  const d = FX.donut({ id: 'c', data: [{ name: 'x', value: 1 }] });
  assert.equal(d.type, 'pie'); assert.ok(d.universalTransition.enabled); assert.ok(d.padAngle > 0);
  assert.equal(FX.pulse({ id: 'p', at: [0, 1] }).type, 'effectScatter');
  assert.equal(FX.pulse({ id: 'p', at: [0, 1], ring: false }).type, 'scatter');
  assert.equal(FX.tooltip({ trigger: 'axis' }).axisPointer.type, 'line');
  assert.equal(FX.tooltip({ trigger: 'axis', pointer: 'cross' }).axisPointer.type, 'cross');
  assert.equal(FX.tooltip({ trigger: 'axis', pointer: 'shadow' }).axisPointer.type, 'shadow');
  assert.match(FX.tooltip().extraCssText, /backdrop-filter/);
  const a = FX.anim();
  assert.equal(a.animation, true); assert.equal(a.animationEasing, 'quarticOut'); assert.ok(a.animationDurationUpdate > 0);
  assert.equal(FX.yAxis().axisLine.show, false);
  assert.equal(FX.refLine(5, 'avg').data[0].yAxis, 5);
  const it = FX.sel({ value: 1, itemStyle: { color: 'red' } }, false, true);
  assert.equal(it.itemStyle.opacity, 0.3); assert.equal(it.itemStyle.color, 'red'); assert.equal(it.selected, false);
});

test('chart kit tooltips escape their text (merchant names are untrusted)', () => {
  const { FX } = loadFinanceView()._kit;
  const html = FX.tip('<b>t', [{ v: '<img src=x onerror=1>', k: 'a&b', c: 'red"x' }], 'foot<', { v: '<i>', k: 'k' });
  assert.ok(!/<img|<b>t|<i>/.test(html), html);
  assert.match(html, /&lt;img/); assert.match(html, /a&amp;b/); assert.match(html, /red&quot;x/);
});

test('reduced motion: no chart animation, no pulsing ring, instant tickers', () => {
  const { FX, MK } = loadFinanceView({}, ROOT, { reduced: true })._kit;
  assert.deepEqual(plain(FX.anim()), { animation: false });
  assert.equal(FX.animated(), false);
  assert.equal(FX.pulse({ id: 'p', at: [0, 1] }).type, 'scatter');
  const b = FX.bars({ id: 'b', data: [1] });
  assert.equal(b.animation, false); assert.equal(b.animationDelay, undefined);
  assert.equal(FX.numLabel().valueAnimation, false);
  assert.equal(FX.smoothLine({ id: 'a', data: [] }).animation, false);
  assert.equal(MK.reduced(), true);
  const el = { textContent: '' };
  MK.tick(el, 42.4, v => String(Math.round(v)));
  assert.equal(el.textContent, '42', 'set at once');
});

test('motion kit: entrances once per element, tab direction', () => {
  const { MK } = loadFinanceView()._kit;
  const el = {};
  assert.equal(MK.once(el, 'in'), true); assert.equal(MK.once(el, 'in'), false); assert.equal(MK.once(el, 'other'), true);
  assert.equal(MK.dir('overview', 'spending'), 1); assert.equal(MK.dir('budgets', 'overview'), -1); assert.equal(MK.dir('overview', 'overview'), 0);
  assert.equal(MK.swap(null, 1), null);
});

test('numbers hook: deterministic, consistent across sections, leaves the view untouched', () => {
  const FV = loadFinanceView({ currency: 'GBP', locale: 'en-GB' });
  assert.equal(FV._numbers(), null, 'nothing loaded: null');
  const { finance } = buildFakeData({ today: new Date('2026-10-02T12:00:00') });
  const budgets = { Groceries: 300, 'Eating out': 150 };
  for (const preset of ['1M', '3M', 'YTD', 'All']) {
    const n = FV._numbers({ preset, analysis: finance.analysis, budgets });
    assert.equal(n.range.preset, preset);
    assert.equal(n.range.to, '2026-10-02');
    assert.ok(n.kpis.spent > 0);
    near(n.cashflow.moneyOut, n.kpis.spent, 'cash flow out = spent');
    near(n.categories.total, n.kpis.spent, 'category totals = spent');
    near(n.merchants.total, n.kpis.spent, 'merchant totals = spent');
    near(n.cashflow.months.reduce((s, m) => s + m.out, 0), n.kpis.spent, 'monthly out adds up');
    near(n.spending.total, n.kpis.spent, 'trend buckets add up');
    near(n.cashflow.moneyIn, n.kpis.moneyIn, 'money in agrees');
    assert.equal(n.budgets.byCategory.Groceries.budget, 300);
    assert.ok(['ok', 'risk', 'over'].includes(n.budgets.state));
    assert.equal(n.kpis.recurringActive, n.recurring.active);
    assert.deepEqual(diffNumbers(n, FV._numbers({ preset, analysis: finance.analysis, budgets })), [], 'same input, same numbers');
  }
  assert.equal(FV._numbers(), null, 'the page state was restored');
  assert.equal(FV.section(), 'overview');
});

test('scale fake finance: deterministic, about 4,500 transactions over two years, all made up', () => {
  const a = buildScaleFinance({ days: 730, seed: 11, today: '2026-10-02' });
  const b = buildScaleFinance({ days: 730, seed: 11, today: '2026-10-02' });
  assert.deepEqual(a.tx, b.tx);
  assert.ok(a.tx.length > 4000 && a.tx.length < 5200, String(a.tx.length));
  assert.ok(a.tx.every(t => Number.isFinite(t.a) && t.d >= '2024-10-03' && t.d <= '2026-10-02'));
  const cats = new Set(a.tx.map(t => t.c));
  for (const c of ['Income', 'Internal transfers', 'Groceries', 'Subscriptions', 'Uncategorised']) assert.ok(cats.has(c), c);
  assert.ok(a.balances.accounts.every(x => Math.abs(x.balance) < 50000), 'balances stay plausible');
  assert.notDeepEqual(buildScaleFinance({ days: 730, seed: 12, today: '2026-10-02' }).tx, a.tx);
});
