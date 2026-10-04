// Home's "Payday & safe to spend" (lib/finance/glance.mjs, GET /api/finance/glance):
// the numbers are the Finances Overview's own (MBM.compute through
// lib/finance/brief.mjs), and the page's model agrees with them; the cushion
// and period choices; the lowest point before payday; data age; the route
// ({status:'empty'} without data, 400 on bad input, same origin only). Synthetic data only.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { MBM, briefFor } from '../lib/finance/brief.mjs';
import { financeGlance, glanceParams, todayIn } from '../lib/finance/glance.mjs';
import { loadFinanceView } from '../tools/finance-numbers.mjs';
import { buildFakeData } from '../tools/make-fake-data.mjs';

const { dnum, diso } = MBM.util;
const plain = (x) => JSON.parse(JSON.stringify(x));

// Salary on the 25th (Friday before a weekend), rent on the 1st, a phone bill on the 18th,
// a streaming bill on the 20th, groceries on irregular days, a balance and its history.
function synth({ today = '2026-10-14', months = 4, salary = true, balance = 1500, balances = true } = {}) {
  const tx = []; const T = dnum(today); const start = T - months * 31 - 10;
  const add = (n, m, c, a) => tx.push({ d: diso(n), m, c, a, acct: 'acc-1', memo: m.toUpperCase(), k: 'k' + tx.length });
  for (let n = start; n <= T; n++) {
    const d = new Date(n * 864e5); const dom = d.getUTCDate(); const wd = (n + 3) % 7;
    const pay = (() => { const y = d.getUTCFullYear(), mo = d.getUTCMonth(); let p = dnum(`${y}-${String(mo + 1).padStart(2, '0')}-25`); while ((p + 3) % 7 >= 5) p--; return p; })();
    if (salary && n === pay) add(n, 'Northwind Labs', 'Income', 2500);
    if (dom === 1) add(n, 'Oak Lane Lettings', 'Housing', -900);
    if (dom === 18) add(n, 'Pocket Mobile', 'Bills & utilities', -18);
    if (dom === 20) add(n, 'StreamCo', 'Entertainment', -11);
    const rnd = k => Math.abs(Math.sin(n * k) * 43758.5453) % 1;
    if (rnd(78.233) < 0.25) add(n, 'Green Basket', 'Groceries', -Math.round(10 + rnd(12.9898) * 60));
    if (wd < 5) add(n, 'Bean There Coffee', 'Eating out', -3);
  }
  const history = []; for (let n = T - 90; n <= T; n += 2) history.push({ date: diso(n), total: balance + (T - n) * 3, accounts: { 'acc-1': balance + (T - n) * 3, 'sav-1': 5000 } });
  return { today, transactions: tx, exclude_from_spending: ['Income', 'Internal transfers', 'Savings & investments'],
    balances: balances ? [{ acct: 'acc-1', name: 'Current', kind: 'current', balance, currency: 'GBP', asOf: today }, { acct: 'sav-1', name: 'Rainy day', kind: 'savings', balance: 5000, currency: 'GBP', asOf: today }] : [],
    balance_history: balances ? history : [], recurring: [] };
}

test('the glance equals MBM.compute: safe to spend, payday, bills before payday, the next 30 days', () => {
  for (const mode of [undefined, 'cycle', 'month']) {
    const a = synth();
    const g = financeGlance(a, { mode, currency: 'GBP', locale: 'en-GB' });
    const { B } = briefFor(a, { mode, currency: 'GBP', locale: 'en-GB' });
    assert.deepEqual(g.safe, plain(B.safe), String(mode));
    assert.equal(g.payday.next, diso(B.cycle.next)); assert.equal(g.payday.daysLeft, B.cycle.daysLeft);
    assert.equal(g.mode, B.mode); assert.equal(g.payday.hasSalary, B.hasSalary);
    assert.deepEqual(g.bills.map(b => [b.m, b.date, b.amount, b.due]), B.bills.map(b => [b.m, diso(b.n), b.amount, !!b.due]));
    assert.equal(g.billsTotal, B.billsTotal);
    assert.deepEqual(g.upcoming.map(b => [b.m, b.date, b.amount]), B.upcoming.map(b => [b.m, diso(b.n), b.amount]));
    assert.equal(g.cushion, MBM.CUSHION);
    assert.ok(!JSON.stringify(g).includes('"rec"'), 'no internal recurring records leak out');
  }
  const g = financeGlance(synth(), { currency: 'GBP' });
  assert.equal(g.mode, 'cycle'); assert.equal(g.payday.next, '2026-10-23', 'the 25th is a Sunday: payday moves to Friday the 23rd');
  assert.equal(g.payday.daysLeft, 9);
  assert.deepEqual(g.bills.map(b => b.m), ['Pocket Mobile', 'StreamCo'], 'the 18th and the 20th before payday');
  assert.equal(g.safe.left, 1500 - 29 - 100);
  assert.equal(g.safe.perDay, Math.round((1500 - 29 - 100) / 9 * 100) / 100);
  // month mode: the calendar month instead of the pay cycle
  const m = financeGlance(synth(), { mode: 'month' });
  assert.equal(m.payday.next, '2026-11-01'); assert.equal(m.payday.mode, 'month');
});

test('the Finances page and the glance agree on every figure it shows', () => {
  const { finance } = buildFakeData({ today: new Date('2026-10-02T12:00:00') });
  const FV = loadFinanceView({ currency: 'GBP', locale: 'en-GB' });
  for (const mode of ['cycle', 'month']) {
    const page = plain(FV._money.brief({ analysis: finance.analysis, mode }));
    const g = financeGlance(finance.analysis, { mode, currency: 'GBP', locale: 'en-GB' });
    assert.deepEqual(g.safe, page.safe, mode);
    assert.deepEqual(g.bills.map(b => ({ m: b.m, n: dnum(b.date), amount: b.amount })), page.bills, mode);
    assert.equal(g.billsTotal, page.billsTotal, mode);
    assert.equal(g.payday.next, diso(page.cycle.next), mode); assert.equal(g.payday.daysLeft, page.cycle.daysLeft, mode);
  }
});

test('the cushion, the balance, its 60-day series, the 30-day change and the lowest point before payday', () => {
  const a = synth();
  const g0 = financeGlance(a, {});
  const g = financeGlance(a, { cushion: 250 });
  assert.equal(g.cushion, 250); assert.equal(g.safe.cushion, 250);
  assert.equal(g.safe.left, g0.safe.left - 150, 'a bigger cushion leaves exactly that much less');
  assert.deepEqual(financeGlance(a, { cushion: 0 }).safe.left, 1500 - 29);
  // the balance: spendable accounts in the total, savings listed but not counted
  assert.equal(g.balance.total, 1500); assert.equal(g.balance.asOf, '2026-10-14');
  assert.deepEqual(g.balance.accounts.map(x => [x.acct, x.inTotal]), [['acc-1', true], ['sav-1', false]]);
  assert.ok(g.balSeries.length > 20 && g.balSeries.every(p => p.date >= '2026-08-15' && p.date <= '2026-10-14'), '60 days at most');
  assert.equal(g.bal30, 1500 + 30 * 3); assert.equal(g.balChange30, -90);
  // the lowest point: after each bill, in date order, nothing else spent
  assert.deepEqual(g.low, { amount: 1500 - 18 - 11, date: '2026-10-20', basis: 'bills' });
  // no balance: no safe-to-spend, no low point, but the bills are still there
  const nb = financeGlance(synth({ balances: false }), {});
  assert.equal(nb.safe, null); assert.equal(nb.balance, null); assert.equal(nb.low, null); assert.equal(nb.balChange30, null);
  assert.equal(nb.bills.length, 2);
  // no salary: the calendar month
  const ns = financeGlance(synth({ salary: false }), {});
  assert.equal(ns.mode, 'month'); assert.equal(ns.auto, 'month'); assert.equal(ns.payday.hasSalary, false);
});

test('how old the data is: the newest of the last update, the balance date and the newest transaction', () => {
  const a = synth({ today: '2026-10-10' });
  delete a.today;                                      // the server passes today from the user's time zone
  const g = financeGlance(a, { today: '2026-10-14' });
  assert.equal(g.dataDate, '2026-10-10'); assert.equal(g.staleDays, 4);
  assert.equal(financeGlance(a, { today: '2026-10-14', lastUpdateAt: '2026-10-13T08:00:00.000Z' }).staleDays, 1);
  assert.equal(financeGlance(a, { today: '2026-10-10' }).staleDays, 0);
});

test('query checks and the user\'s day', () => {
  assert.deepEqual(glanceParams(null, null), { cushion: undefined, mode: undefined });
  assert.deepEqual(glanceParams('', 'auto'), { cushion: undefined, mode: undefined });
  assert.deepEqual(glanceParams('120.456', 'month'), { cushion: 120.46, mode: 'month' });
  for (const [c, m] of [['-1', null], ['abc', null], ['1e9', null], [null, 'year'], ['Infinity', null]]) assert.ok(glanceParams(c, m).error, `${c} ${m}`);
  const t = Date.UTC(2026, 9, 3, 23, 30);   // 23:30 UTC on 3 Oct
  assert.equal(todayIn('Europe/London', t), '2026-10-04');
  assert.equal(todayIn('America/New_York', t), '2026-10-03');
  assert.match(todayIn('Not/AZone', t), /^\d{4}-\d{2}-\d{2}$/);
});

// ── GET /api/finance/glance (a real server on a synthetic data folder) ──
let dir, port, srv;
function freePort() { return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); }); }
function get(path, headers = {}) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method: 'GET', path, headers: { Host: `localhost:${port}`, 'Sec-Fetch-Site': 'same-origin', ...headers } }, (r) => {
      const chunks = []; r.on('data', d => chunks.push(d));
      r.on('end', () => { const t = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(t); } catch { /* text */ } res({ status: r.statusCode, json, text: t }); });
    });
    req.on('error', rej); req.end();
  });
}
const NO_CLI = join(tmpdir(), 'glance-no-claude-here.mjs');
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'fin-glance-'));
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ currency: 'GBP', locale: 'en-GB', timezone: 'Europe/London', brief: { autoOpen: false, ai: false, story: { autoOpen: false } } }));
  process.env.CLAUDE_CLI_PATH = NO_CLI;        // nothing here may reach the real claude
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir]);
});
after(async () => {
  await srv?.close();
  rmSync(dir, { recursive: true, force: true });
});

test('GET /api/finance/glance: {status:empty} without data, then the Overview\'s numbers; bad input 400; same origin only', async () => {
  const empty = await get('/api/finance/glance');
  assert.equal(empty.status, 200, empty.text); assert.equal(empty.json.status, 'empty');
  const sys = join(dir, 'finance', '_system'); mkdirSync(sys, { recursive: true });
  const a = synth();
  writeFileSync(join(sys, 'analysis.json'), JSON.stringify(a));
  const r = await get('/api/finance/glance');
  assert.equal(r.status, 200, r.text);
  const { B } = briefFor(a, { currency: 'GBP', locale: 'en-GB' });
  assert.deepEqual(r.json.safe, plain(B.safe));
  assert.equal(r.json.payday.next, diso(B.cycle.next));
  assert.equal(r.json.bills.length, B.bills.length);
  assert.equal(r.json.currency, 'GBP');
  const c = await get('/api/finance/glance?cushion=300&mode=month');
  assert.equal(c.json.safe.cushion, 300); assert.equal(c.json.mode, 'month');
  assert.equal((await get('/api/finance/glance?cushion=-5')).status, 400);
  assert.equal((await get('/api/finance/glance?mode=weekly')).status, 400);
  assert.equal((await get('/api/finance/glance', { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  // the catch-all for other finance paths is untouched
  assert.equal((await get('/api/finance/nope')).status, 404);
});
