// The Finances shell, KPI row, budgets and motion (C3, 3 Oct 2026): the pure
// helpers behind the tabs, sparklines, budget rings, the burn-up and the
// "new since last sync" toast, plus the motion rules the CSS must keep
// (transform and opacity only; nothing moves under reduced motion). The view
// runs in the stub-DOM sandbox of tools/finance-numbers.mjs (no browser).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFinanceView } from '../tools/finance-numbers.mjs';
import { buildFakeData } from '../tools/make-fake-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, 'src', 'finance', f), 'utf8');
const plain = x => JSON.parse(JSON.stringify(x));
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.011, `${msg}: ${a} vs ${b}`);

// Sample a path of M/C segments and return [[x, y], ...] per segment.
function segments(d) {
  const nums = d.replace(/[MC]/g, ' ').trim().split(/\s+/).map(Number);
  const segs = []; let p = [nums[0], nums[1]];
  for (let i = 2; i + 5 < nums.length + 1; i += 6) {
    const c1 = [nums[i], nums[i + 1]], c2 = [nums[i + 2], nums[i + 3]], q = [nums[i + 4], nums[i + 5]];
    const pts = [];
    for (let k = 0; k <= 40; k++) {
      const t = k / 40, u = 1 - t;
      pts.push([u * u * u * p[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * q[0], u * u * u * p[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * q[1]]);
    }
    segs.push({ a: p, b: q, pts }); p = q;
  }
  return segs;
}

test('monoPath: passes through every point and never overshoots (no fake dips or peaks)', () => {
  const { monoPath } = loadFinanceView()._shell;
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cases = [
    [0, 0, 0, 120, 0, 0, 3, 2, 400, 0],               // spikes between zeros (rent, salary)
    [5, 5, 5, 5, 5],                                  // flat
    [0, 10, 20, 30, 45, 61, 61, 80],                  // cumulative (non-decreasing)
    Array.from({ length: 60 }, () => Math.round(rnd() * 300)),
  ];
  for (const ys of cases) {
    const P = ys.map((y, i) => [i * 10, 100 - y]);
    const d = monoPath(P);
    const segs = segments(d);
    assert.equal(segs.length, P.length - 1);
    segs.forEach((s, i) => {
      assert.deepEqual(s.a.map(v => +v.toFixed(2)), P[i].map(v => +v.toFixed(2)), 'segment starts on its point');
      assert.deepEqual(s.b.map(v => +v.toFixed(2)), P[i + 1].map(v => +v.toFixed(2)), 'segment ends on the next point');
      const lo = Math.min(s.a[1], s.b[1]) - 0.011, hi = Math.max(s.a[1], s.b[1]) + 0.011;
      for (const [, y] of s.pts) assert.ok(y >= lo && y <= hi, `overshoot in segment ${i}: ${y} outside ${lo}..${hi}`);
    });
  }
  assert.equal(monoPath([]), '');
  assert.match(monoPath([[0, 1]]), /^M0 1$/);
});

test('sparkline: monotone, a draw-in clip, unique ids, projection inside the period', () => {
  const { sparkSvg } = loadFinanceView()._shell;
  const a = sparkSvg([0, 40, 0, 10, 0], '#5b5bd6'), b = sparkSvg([1, 2, 3], '#5b5bd6');
  assert.match(a, /class="fv-sp-clip"/);
  assert.match(a, /vector-effect="non-scaling-stroke"/);
  const ids = s => [...s.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set([...ids(a), ...ids(b)]).size, ids(a).length + ids(b).length, 'ids never repeat');
  assert.match(a, /<i class="fv-sp-dot"/, 'the end dot is HTML (never stretched)');
  // A month so far: 3 of 31 days fill the left of the tile, the dotted projection runs to the edge.
  const p = sparkSvg([10, 20, 30], '#5b5bd6', { proj: 300, slots: 31 });
  const dot = /left:([\d.]+)%/.exec(p);
  assert.ok(+dot[1] < 15, 'the last real day sits early in the month');
  assert.match(p, /class="fv-sp-proj"/);
  assert.doesNotMatch(sparkSvg([1, 2], 'javascript:alert(1)'), /javascript/, 'only real colours reach the markup');
  assert.match(sparkSvg([1], '#000'), /<svg/, 'one point: an empty tile, no error');
});

test('budget look: red only when over, bills on schedule, amber when ahead of pace', () => {
  const { budgetLook, budgetScheduled } = loadFinanceView()._shell;
  assert.equal(budgetLook(10, 0, 0.5, false).k, 'none');
  const over = budgetLook(160, 150, 0.5, false);
  assert.equal(over.k, 'over'); assert.equal(over.tone, 'bad'); assert.match(over.l, /^Over by £10$/);
  assert.equal(budgetLook(160, 150, 0.5, true).k, 'over', 'a bill that went over is over');
  assert.equal(budgetLook(140, 150, 0.2, true).k, 'sched', 'a bill paid early is on schedule');
  assert.equal(budgetLook(100, 150, 0.5, false).k, 'ahead', '67% spent, 50% gone');
  assert.equal(budgetLook(85, 150, 0.5, false).k, 'ok', '57% spent, 50% gone: within the slack');
  assert.equal(budgetLook(20, 100, 0.06, false).k, 'ok', 'day 2: one shop is not a warning yet');
  assert.equal(budgetLook(40, 100, 0.06, false).k, 'ahead');
  const past = budgetLook(90, 150, 1, false);
  assert.equal(past.k, 'ok'); assert.match(past.l, /^Under by £60$/);
  for (const k of ['ok', 'ahead', 'sched', 'none']) assert.notEqual(budgetLook(k === 'none' ? 1 : 50, k === 'none' ? 0 : 100, k === 'ahead' ? 0.1 : 0.6, k === 'sched').tone, 'bad');
  // Without the symbols module the name decides (the browser asks FinSymbols.categoryScene).
  for (const c of ['Rent', 'Bills & utilities', 'Subscriptions', 'Fitness', 'Car insurance']) assert.ok(budgetScheduled(c), c);
  for (const c of ['Groceries', 'Eating out', 'Shopping', 'Transport']) assert.ok(!budgetScheduled(c), c);
});

test('budget months and the burn-up: the same totals as budgetCalc, endpoints exact', () => {
  const FV = loadFinanceView({ currency: 'GBP', locale: 'en-GB' });
  const { setModel, budgetCalc, budgetMonthView, budgetCurve } = FV._shell;
  const { finance } = buildFakeData({ today: new Date('2026-10-18T12:00:00') });
  const M = setModel(finance.analysis);
  const bc = budgetCalc(M);
  const cur = plain(budgetMonthView(M, bc, null));
  assert.equal(cur.cur, true); assert.equal(cur.mi, bc.mi);
  near(cur.pace, bc.elapsed / bc.total, 'pace = days gone / days');
  const cats = Object.keys(bc.spent).filter(c => bc.spent[c] > 0);
  const curve = plain(budgetCurve(M, budgetMonthView(M, bc, null), new Set(cats)));
  assert.equal(curve.length, bc.elapsed, 'one point per day so far');
  near(curve[curve.length - 1], cats.reduce((s, c) => s + bc.spent[c], 0), 'the curve ends on the month-to-date total');
  // A past month: its final spend per category; the curve ends on the month's total.
  const pv = budgetMonthView(M, bc, bc.mi - 1);
  assert.equal(pv.cur, false); assert.equal(pv.pace, 1); assert.equal(pv.elapsed, pv.total);
  const direct = {};
  for (const x of M.tx) if (x.kind === 'spend' && x.n >= pv.ms && x.n < pv.ms + pv.total) direct[x.c] = (direct[x.c] || 0) + x.s;
  for (const c of Object.keys(direct)) near(pv.spent[c], direct[c], c);
  const pc = plain(budgetCurve(M, pv, new Set(Object.keys(direct))));
  assert.equal(pc.length, pv.total);
  near(pc[pc.length - 1], Object.values(direct).reduce((s, v) => s + v, 0), 'past curve ends on the total');
  assert.equal(plain(budgetMonthView(M, bc, bc.mi + 3)).cur, true, 'a future month falls back to this month');
});

test('budget ring: arc for the spent share, liquid clipped, pace marker only for a running month', () => {
  const { ringSvg } = loadFinanceView()._shell;
  const C = 2 * Math.PI * (148 / 2 - 8);
  const r = ringSvg(0.5, 0.4);
  assert.match(r, new RegExp(`stroke-dasharray="${(C * 0.5).toFixed(2)} `));
  assert.match(r, /<clipPath id="fvrg\d+">/); assert.match(r, /class="liq"/); assert.match(r, /class="pmg"/);
  assert.match(ringSvg(1.4, 0.4), new RegExp(`stroke-dasharray="${C.toFixed(2)} `), 'over budget: a full ring, never more');
  assert.doesNotMatch(ringSvg(0, 0.4), /class="liq"/, 'nothing spent: no liquid');
  assert.doesNotMatch(ringSvg(0.5, null), /class="pmg"/, 'a finished month has no pace marker');
  assert.doesNotMatch(ringSvg(0.5, 1), /class="pmg"/);
  assert.match(ringSvg(0.5, 0.4, { flat: true }), /q7\.5 0\.00 15 0/, 'reduced motion: a flat surface');
  assert.notEqual(/id="(fvrg\d+)"/.exec(ringSvg(0.2, 0.1))[1], /id="(fvrg\d+)"/.exec(ringSvg(0.2, 0.1))[1], 'clip ids are unique');
});

test('new since last sync: counts and totals of the rows that were not there before', () => {
  const { syncDiff, txKeyOf } = loadFinanceView()._shell;
  const tx = [
    { k: 'a', d: '2026-10-01', n: 20727, a: -5, m: 'X', acct: '1', kind: 'spend', s: 5, inc: 0 },
    { k: 'b', d: '2026-10-02', n: 20728, a: -7.25, m: 'Y', acct: '1', kind: 'spend', s: 7.25, inc: 0 },
    { k: 'c', d: '2026-10-02', n: 20728, a: 1200, m: 'Pay', acct: '1', kind: 'income', s: 0, inc: 1200 },
    { k: 'd', d: '2026-10-03', n: 20729, a: -50, m: 'Me', acct: '2', kind: 'transfer', s: 0, inc: 0 },
  ];
  const d = plain(syncDiff(new Set(['a']), tx));
  assert.equal(d.n, 3); assert.deepEqual(d.spend, { n: 1, total: 7.25 }); assert.deepEqual(d.income, { n: 1, total: 1200 }); assert.equal(d.other, 1);
  assert.equal(d.latest, 20729); assert.deepEqual(d.keys, ['b', 'c', 'd']);
  assert.equal(plain(syncDiff(null, tx)).n, 0, 'no earlier data: nothing to call new');
  assert.equal(plain(syncDiff(new Set(tx.map(txKeyOf)), tx)).n, 0, 'nothing new');
  // Index keys (no pipeline key) shift on a rebuild: identity falls back to date, amount, merchant, account.
  assert.equal(txKeyOf({ k: 'i12', d: '2026-10-01', a: -5, m: 'X', acct: '1' }), '2026-10-01|-5|X|1');
});

test('KPI row per section: the brief and budgets show none, others a compact set', () => {
  const { kpiSetFor } = loadFinanceView()._shell;
  assert.equal(kpiSetFor('overview'), false);
  assert.equal(kpiSetFor('budgets'), false);
  assert.deepEqual(plain(kpiSetFor('spending')), ['spent', 'avg', 'count', 'big']);
  assert.equal(kpiSetFor('something-new'), true, 'a section nobody listed shows the full row');
});

test('motion: transform and opacity only, once per entry, nothing under reduced motion', () => {
  const css = ['06-motion-kit.css', '10-shell.css', '12-bar.css', '15-kpis.css', '52-budgets.css'].map(read).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  // Every keyframe moves transform / opacity only.
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
    const props = [...m[2].matchAll(/([a-z-]+)\s*:/g)].map(x => x[1]);
    for (const p of props) assert.ok(['transform', 'opacity'].includes(p), `@keyframes ${m[1]} animates ${p}`);
  }
  // Transitions: no layout properties (stroke-dashoffset is the budget ring's one set-once exception).
  for (const m of css.matchAll(/transition:\s*([^;]+);/g)) {
    for (const part of m[1].split(',')) {
      const prop = part.trim().split(/\s+/)[0];
      assert.ok(!['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'all'].includes(prop), `transition on ${prop}`);
    }
  }
  const motion = read('80-motion.css');
  assert.match(motion, /prefers-reduced-motion: reduce[\s\S]*animation: none !important; transition: none !important/);
  assert.match(motion, /\[data-motion="reduced"\] \.fv \*/);
  // Loops pause while the tab is hidden; the shimmer waits 400 ms.
  assert.match(read('06-motion-kit.css'), /\.fv\.fv-tab-hidden \* \{ animation-play-state: paused !important; \}/);
  assert.match(read('06-motion-kit.css'), /fv-shimmer 1\.4s linear 400ms infinite/);
  // Entrances are once per section per session; re-visits render settled.
  const sec = read('18-sections.js');
  assert.match(sec, /R\.entered = new Set\(\)/);
  assert.match(sec, /const first = !R\.entered\.has\(id\)/);
  assert.match(sec, /if \(settle\) R\.noAnim = true/);
  // Re-selecting the current tab, preset or ring is a no-op.
  assert.match(read('12-bar.js'), /id === F\.section && id === R\.sectionId && R\.mode === 'ready'/);
  assert.match(read('08-controls.js'), /if \(b\.getAttribute\('aria-checked'\) !== 'true'\) onChange\(v\)/);
  assert.match(read('36-budgets.js'), /if \(c === cur\) return;/);
});
