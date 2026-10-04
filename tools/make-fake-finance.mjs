#!/usr/bin/env node
// tools/make-fake-finance.mjs - a large, made-up finance history for load and
// visual tests of the Finances view (the demo data in make-fake-data.mjs has
// four months). Every merchant and amount is invented. Deterministic: the same
// --seed and --today give the same transactions.
//
//   node tools/make-fake-finance.mjs <dest-data-dir> [--days 730] [--seed 11] [--today YYYY-MM-DD] [--force]
//
// Writes <dest>/finance/_system (store CSV, rules, balances, a .demo-data
// marker) and runs the built-in pipeline, so /api/finance serves it like real
// data. About 6-7 transactions a day (about 4,600 over two years): two accounts, salary and a side income,
// rent and bills, subscriptions (one price rise), groceries, coffee, travel,
// refunds, transfers and a few uncategorised merchants. A real (non-demo)
// finance folder is never replaced; --force replaces an earlier demo one.
// Usual pairing: node tools/make-fake-data.mjs <dir> --seed 7 --today <date> first (tasks, config).
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { atomicWrite, writeJson, isInside } from '../lib/fsutil.mjs';
import { argValue, ensureDataDir, REPO_ROOT } from '../lib/datadir.mjs';

function rng(seed) {
  let a = (Number(seed) || 1) >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), pick: arr => arr[Math.floor(next() * arr.length)], chance: p => next() < p };
}
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const money = x => Math.round(x * 100) / 100;

/** { tx (newest first), history, balances, csv, overrides, today } */
export function buildScaleFinance({ days = 730, seed = 11, today = '2026-10-02' } = {}) {
  const r = rng(seed);
  const t0 = new Date(today + 'T12:00:00Z');
  const tx = [];
  const card = 'demo-credit';
  let cardDue = 0;                                     // the card is repaid in full on the 28th
  const add = (d, m, c, a, acct, memo) => {
    tx.push({ d: isoOf(d), m, c, a: money(a), acct: acct || 'demo-current', memo: memo || m.toUpperCase() });
    if (acct === card) cardDue -= money(a);
  };
  for (let day = -(days - 1); day <= 0; day++) {
    const d = new Date(t0.getTime() + day * 864e5), dom = d.getUTCDate(), dow = d.getUTCDay(), month = d.getUTCMonth();
    const yearIn = day > -365;                         // the second year: a raise and a price rise
    if (dom === 25) add(d, 'Northwind Labs', 'Income', yearIn ? 3700 : 3450, null, 'SALARY NORTHWIND LABS');
    if (dom === 12 && r.chance(0.45)) add(d, 'Harbor & Co', 'Income', r.int(250, 900), null, 'PAYMENT HARBOR CO INVOICE');
    if (dom === 1) add(d, 'Oak Lane Lettings', 'Rent', yearIn ? -1195 : -1150);
    if (dom === 3) add(d, 'City Power & Water', 'Bills & utilities', -(r.int(62, 96) + (month < 3 || month > 9 ? 35 : 0)));
    if (dom === 20) add(d, 'Skyline Broadband', 'Bills & utilities', -32);
    if (dom === 16) add(d, 'Pocket Mobile', 'Bills & utilities', -18);
    if (dom === 8) add(d, 'StreamFlix', 'Subscriptions', yearIn ? -12.99 : -10.99, card);
    if (dom === 11) add(d, 'TuneBox', 'Subscriptions', -11.99, card);
    if (dom === 14) add(d, 'FitLife Gym', 'Fitness', -39);
    if (dom === 2 && month === 4) add(d, 'CloudVault', 'Subscriptions', -59.99, card);
    if (dom === 18 && month === 8) add(d, 'Shieldwise Insurance', 'Bills & utilities', -r.int(280, 340));
    const wk = dow >= 1 && dow <= 5;
    if (dow === 6 || dow === 3) add(d, r.pick(['Green Basket Market', 'FreshWay Foods']), 'Groceries', -(r.int(18, 84) + r.next()), r.chance(0.3) ? card : null);
    if (r.chance(0.65)) add(d, 'Corner Larder', 'Groceries', -(r.int(2, 12) + r.next()));
    if (r.chance(0.6)) add(d, 'Quick Stop Mini', 'Groceries', -(r.int(1, 5) + r.next()), card);
    if (r.chance(wk ? 0.9 : 0.4)) add(d, r.pick(['Bean There Coffee', 'Daily Grind Cafe']), 'Eating out', -(2.6 + r.int(0, 4) * 0.5), card);
    if (wk && r.chance(0.35)) add(d, 'Bean There Coffee', 'Eating out', -(2.6 + r.int(0, 4) * 0.5), card);
    if (r.chance(0.3)) add(d, 'Snack Shack', 'Eating out', -(1 + r.int(0, 4) * 0.5), card);
    if (wk && r.chance(0.55)) add(d, r.pick(['Lunchbox Deli', 'Sushi Go Round', 'Daily Grind Cafe']), 'Eating out', -(r.int(5, 11) + r.int(0, 3) * 0.25), card);
    if (wk && r.chance(0.95)) add(d, 'Metro Transit', 'Transport', -2.8);
    if (wk && r.chance(0.95)) add(d, 'Metro Transit', 'Transport', -2.8);
    if (!wk && r.chance(0.4)) add(d, 'Bike Share', 'Transport', -r.int(2, 6));
    if (r.chance(0.06)) add(d, 'Fuel Stop', 'Transport', -r.int(30, 70), card);
    if (r.chance(0.12)) add(d, 'CityCab', 'Transport', -r.int(9, 28), card);
    if ((dow === 5 || dow === 6) && r.chance(0.45)) add(d, r.pick(['The Corner Bistro', 'Noodle House', 'Pizza Forno', 'Spice Route']), 'Eating out', -r.int(14, 62), card);
    if (wk && r.chance(0.1)) add(d, r.pick(['Noodle House', 'Spice Route']), 'Eating out', -r.int(12, 40), card);
    if (r.chance(0.12)) add(d, 'Speedy Bites', 'Eating out', -r.int(11, 32), card);
    if (r.chance(0.12)) add(d, r.pick(['Bookworm Books', 'Northstar Outdoor', 'Pixel Electronics', 'Homeware Hub', 'Threadline Clothing']), 'Shopping', -r.int(8, 120), card);
    if (r.chance(0.2)) add(d, 'Parcel Point Store', 'Shopping', -r.int(4, 30), card);
    if (r.chance(0.06)) add(d, r.pick(['Wellspring Pharmacy', 'Bright Smile Dental']), 'Health', -r.int(4, 120));
    if (r.chance(0.08)) add(d, r.pick(['Harbour Cinema', 'Gigs & Tickets', 'Appverse']), 'Entertainment', -r.int(2, 85), card);
    if (r.chance(0.012)) add(d, r.pick(['SkyHop Airlines', 'Restwell Hotels', 'Wanderly Travel']), 'Travel', -r.int(120, 780), card);
    if ((month === 11 && dom > 5 && dom < 22 && r.chance(0.3)) || r.chance(0.01)) add(d, 'Gift Garden', 'Gifts', -r.int(15, 90), card);
    if (r.chance(0.05)) add(d, r.pick(['Market Stall 42', 'Online Order 7781', 'Kiosk Payment']), 'Uncategorised', -r.int(4, 45));
    if (r.chance(0.012)) add(d, r.pick(['Threadline Clothing', 'Pixel Electronics']), 'Shopping', r.int(15, 90), card, 'REFUND');
    if (dom === 27 && r.chance(0.6)) add(d, 'Transfer to savings', 'Internal transfers', -r.int(2, 6) * 100, null, 'TRANSFER TO SAVINGS');
    if (dom === 28 && cardDue > 0) { add(d, 'Card repayment', 'Internal transfers', -cardDue, null, 'CARD REPAYMENT'); cardDue = 0; }
  }
  // Refunds keep the merchant's own memo with a suffix, so they categorise with it.
  for (const t of tx) if (t.memo === 'REFUND') t.memo = t.m.toUpperCase() + ' REFUND';
  tx.sort((p, q) => q.d.localeCompare(p.d));
  let cur = 2600, cred = -150;
  const history = []; const byDay = new Map();
  for (const t of tx) { if (!byDay.has(t.d)) byDay.set(t.d, []); byDay.get(t.d).push(t); }
  for (let day = -(days - 1); day <= 0; day++) {
    const d = isoOf(new Date(t0.getTime() + day * 864e5));
    for (const t of byDay.get(d) || []) { if (t.acct === card) cred += t.a; else cur += t.a; if (t.memo === 'CARD REPAYMENT') cred -= t.a; }
    if (day % 7 === 0 || day > -30) history.push({ date: d, total: money(cur + cred), accounts: { 'demo-current': money(cur), 'demo-credit': money(cred) } });
  }
  const balances = { asOf: today, accounts: [
    { acct: 'demo-current', name: 'Everyday account', kind: 'current', balance: money(cur), currency: 'GBP', asOf: today },
    { acct: 'demo-credit', name: 'Credit card', kind: 'credit', balance: money(cred), currency: 'GBP', asOf: today },
  ] };
  const csv = ['date,amount,account,subcategory,memo,source', ...[...tx].reverse().map(t => [t.d, t.a.toFixed(2), t.acct, '', `"${t.memo.replace(/"/g, '""')}"`, 'demo'].join(','))].join('\r\n') + '\r\n';
  const overrides = {};
  for (const t of tx) if (t.c !== 'Income' && t.c !== 'Uncategorised') overrides[t.memo.toUpperCase()] = t.c;
  return { tx, history, balances, csv, overrides, today };
}

export async function writeScaleFinance(dataDir, { days, seed, today, force = false, log = () => {} } = {}) {
  const p = await ensureDataDir(dataDir);
  const sys = join(p.finance, '_system');
  const isDemo = existsSync(join(sys, '.demo-data'));
  const hasStore = existsSync(join(sys, 'transactions.csv')) || existsSync(join(sys, 'analysis.json'));
  if (hasStore && !isDemo) throw new Error(`${p.finance} holds a real finance folder: refusing to replace it`);
  if (hasStore && !force) throw new Error(`${p.finance} already has demo finance data (add --force to replace it)`);
  const f = buildScaleFinance({ days, seed, today });
  const { runPipeline, defaultRules } = await import('../lib/finance/pipeline.mjs');
  const rules = defaultRules(); rules.merchant_overrides = f.overrides;
  for (const x of ['transactions.csv', 'analysis.json', 'summary.json', 'bank_categories.json', 'budgets.json']) await rm(join(sys, x), { force: true });
  await atomicWrite(join(sys, '.demo-data'), 'Demo data written by tools/make-fake-finance.mjs.\n');
  await atomicWrite(join(sys, 'transactions.csv'), f.csv);
  await writeJson(join(sys, 'rules.json'), rules);
  await writeJson(join(sys, 'balances.json'), f.balances);
  await writeJson(join(sys, 'balances_history.json'), f.history);
  await runPipeline(p.finance, { today: f.today, sample: true });
  log(`  fake finance: ${f.tx.length} transactions over ${days} days to ${f.today} (seed ${seed}) in ${p.finance}`);
  return { transactions: f.tx.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  const valued = ['--days', '--seed', '--today'];
  const dest = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && valued.includes(argv[i - 1])));
  const now = new Date();   // today on this computer's calendar, not UTC's
  const today = argValue(argv, '--today') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (!dest || !/^\d{4}-\d{2}-\d{2}$/.test(today)) { console.error('usage: node tools/make-fake-finance.mjs <dest-data-dir> [--days 730] [--seed 11] [--today YYYY-MM-DD] [--force]'); process.exit(2); }
  if (isInside(REPO_ROOT, resolve(dest))) { console.error('  Use a folder outside the app (e.g. C:/tmp/<you>/scale).'); process.exit(2); }
  writeScaleFinance(dest, { days: Math.max(30, Math.min(3650, Number(argValue(argv, '--days')) || 730)), seed: Number(argValue(argv, '--seed')) || 11, today, force: argv.includes('--force'), log: console.log })
    .catch(e => { console.error('  ' + (e && e.message || e)); process.exit(1); });
}
