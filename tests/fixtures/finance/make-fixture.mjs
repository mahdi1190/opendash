// tests/fixtures/finance/make-fixture.mjs - a synthetic finance folder for the
// pipeline tests. Everything is made up (generic shop names, fake account ids)
// and generated from a fixed seed, so the same folder comes out every time.
//
// It covers what the importer and the analysis have to get right: a classic
// Barclays export, an overlapping second export (de-duplication), a Money in /
// Money out export with preamble lines and "£1,234.50" amounts, a bank-sync CSV
// with bank categories, a cp1252-encoded file, a broken file that must stay in
// the inbox, two genuine identical payments on one day, refunds, recurring
// payments (weekly, monthly, annual), a price rise, a new subscription, a large
// one-off, possible duplicates, card numbers, month tokens, "SQ *" style
// merchants, apostrophes and accented names.

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_RULES = join(HERE, '..', '..', '..', 'lib', 'finance', 'default-rules.json');

export const FIXTURE_TODAYS = ['2026-09-10', '2026-09-30'];

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const DAY = 864e5;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const uk = (t) => { const d = iso(t); return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`; };
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const on = (t) => { const d = new Date(t); return `ON ${String(d.getUTCDate()).padStart(2, '0')} ${MON[d.getUTCMonth()]}`; };
const money2 = (x) => x.toFixed(2);
const csvf = (v) => { const s = String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** The rows of the main export, oldest first: [t, amount, account, sub, memo]. */
function mainRows() {
  const r = rng(20260910);
  const rows = [];
  const A = 'ACC-0001', C = 'ACC-0002';
  const start = Date.UTC(2025, 7, 1), end = Date.UTC(2026, 8, 6);
  for (let t = start; t <= end; t += DAY) {
    const d = new Date(t), dom = d.getUTCDate(), dow = d.getUTCDay();
    if (dom === 25) rows.push([t, 2100, A, 'BGC', 'ACME WIDGETS LTD SALARY']);
    if (dom === 1) rows.push([t, -950, A, 'DD', 'OPENRENT LTD REF 88812']);
    if (dom === 5) rows.push([t, -10.99, C, 'DEB', `NETFLIX.COM ${on(t)} BCC`]);
    if (dom === 12) rows.push([t, t >= Date.UTC(2026, 7, 31) ? -12.0 : -10.0, A, 'DD', 'PHONE PLAN CO']);
    if (dow === 1) rows.push([t, -7.5, C, 'DEB', `PUREGYM LTD ${on(t)} CPM`]);
    if (dow === 2 || dow === 5 || (dow === 6 && r() < 0.5)) rows.push([t, -Math.round((8 + r() * 55) * 100) / 100, C, 'DEB', `TESCO STORES ${1000 + Math.floor(r() * 9000)} ${on(t)} BCC`]);
    if (r() < 0.22) rows.push([t, -Math.round((2.2 + r() * 6) * 100) / 100, C, 'DEB', 'SQ *THE COFFEE CO']);
    if (r() < 0.08) rows.push([t, -Math.round((5 + r() * 25) * 100) / 100, C, 'DEB', `UBER *EATS PENDING ${on(t)}`]);
    if (r() < 0.06) rows.push([t, -Math.round((6 + r() * 80) * 100) / 100, C, 'DEB', `AMZN MKTP UK*${String.fromCharCode(65 + Math.floor(r() * 26))}${Math.floor(r() * 1e6)}Q`]);
    if (r() < 0.04) rows.push([t, -Math.round((3 + r() * 30) * 100) / 100, C, 'DEB', 'PAYPAL *SOMESELLER']);
    if (r() < 0.05) rows.push([t, -Math.round((4 + r() * 20) * 100) / 100, C, 'DEB', 'CARD PAYMENT TO CORNER SHOP 1234****5678']);
    if (r() < 0.03) rows.push([t, -Math.round((9 + r() * 30) * 100) / 100, C, 'DEB', "SAM'S DINER"]);
    if (r() < 0.03) rows.push([t, -Math.round((3 + r() * 9) * 100) / 100, C, 'DEB', 'CAFÉ LUMIÈRE']);
    if (dom === 15 && d.getUTCMonth() % 2 === 0) rows.push([t, -4.2, C, 'DEB', `PARKING CITY COUNCIL ${MON[d.getUTCMonth()]}${String(d.getUTCFullYear()).slice(2)}`]);
    if (dom === 26) rows.push([t, -300, A, 'TFR', 'TO SAVINGS ACC 4455']);
    if (dom === 20 && r() < 0.6) rows.push([t, -Math.round((20 + r() * 40) * 100) / 100, A, 'FT', 'J BLOGGS']);
    if (dom === 9 && r() < 0.5) rows.push([t, -40, A, 'Cash Machine', 'NOTEMACHINE HIGH ST']);
  }
  // Annual charge, a year apart.
  rows.push([Date.UTC(2025, 7, 20), -60, A, 'DD', 'ANNUAL WIDGET CLUB']);
  rows.push([Date.UTC(2026, 7, 20), -60, A, 'DD', 'ANNUAL WIDGET CLUB']);
  // New subscription: first seen ~2 months ago, charged in the report week.
  for (const t of [Date.UTC(2026, 6, 3), Date.UTC(2026, 7, 3), Date.UTC(2026, 8, 3)]) rows.push([t, -9.99, C, 'DEB', 'STREAMIFY PREMIUM']);
  // The report week (31 Aug - 6 Sep 2026): a large one-off, a duplicate pair,
  // two genuine identical payments, a refund, and same-day ties.
  rows.push([Date.UTC(2026, 8, 2), -480, A, 'DEB', 'BIGSTORE FURNITURE']);
  rows.push([Date.UTC(2026, 8, 1), -12.4, C, 'DEB', 'CITY TAXI CO']);
  rows.push([Date.UTC(2026, 8, 2), -12.4, C, 'DEB', 'CITY TAXI CO']);
  rows.push([Date.UTC(2026, 8, 4), -3.2, C, 'DEB', 'SNACK HUT']);
  rows.push([Date.UTC(2026, 8, 4), -3.2, C, 'DEB', 'SNACK HUT']);
  rows.push([Date.UTC(2026, 8, 3), 15, C, 'DEB', 'AMZN MKTP UK REFUND']);
  rows.push([Date.UTC(2026, 8, 5), -2.5, C, 'DEB', 'MARKET STALL']);
  rows.push([Date.UTC(2026, 8, 5), -3.1, C, 'DEB', 'MARKET STALL']);
  return rows.sort((a, b) => a[0] - b[0]);
}

function barclays(rows) {
  const out = ['Number,Date,Account,Amount,Subcategory,Memo'];
  rows.forEach(([t, a, acc, sub, memo]) => out.push(['', uk(t), acc, money2(a), sub, memo].map(csvf).join(',')));
  return out.join('\r\n') + '\r\n';
}

export function makeFinanceFixture(dir) {
  const sys = join(dir, '_system'), inbox = join(dir, 'inbox');
  for (const d of [sys, inbox, join(dir, 'processed'), join(dir, 'reports')]) mkdirSync(d, { recursive: true });
  const rules = JSON.parse(readFileSync(DEFAULT_RULES, 'utf8'));
  rules.merchant_overrides = { "SAM'S DINER": 'Eating out', 'CORNER SHOP': 'Groceries' };
  writeFileSync(join(sys, 'rules.json'), JSON.stringify(rules, null, 1));

  const rows = mainRows();
  const cut = Date.UTC(2026, 6, 28);
  // Export A: everything up to 20 Aug. Export B: 28 Jul onwards (overlap).
  writeFileSync(join(inbox, '2026-export-a.csv'), barclays(rows.filter(r => r[0] <= Date.UTC(2026, 7, 20))));
  writeFileSync(join(inbox, '2026-export-b.csv'), barclays(rows.filter(r => r[0] >= cut)));

  // Money in / Money out layout with preamble lines and £ amounts.
  writeFileSync(join(inbox, 'Statement Money In Out.csv'), [
    'Account summary', 'Sort code,00-00-00', '',
    'Transaction Date,Description,Money In,Money Out,Balance',
    '06 Sep 2026,REFUND FROM WIDGET SHOP,"£1,234.50",,"£2,000.00"',
    '05 Sep 2026,HARDWARE DEPOT,,£45.20,£765.50',
    '05 Sep 2026,  BOOKSHOP   CENTRAL  ,,£12.99,£810.70',
    '07 Aug 2026,GARDEN CENTRE,,£23.00,£823.69',
  ].join('\n') + '\n');

  // Bank sync with bank categories: refreshes some stored rows, adds new ones.
  const sync = ['Number,Date,Account,Amount,Subcategory,Memo,Bank category'];
  const tagged = rows.filter(r => r[0] >= Date.UTC(2026, 7, 25)).slice(0, 12);
  const cats = ['eating_out', 'groceries', 'general_shopping', 'Weird<cat>', 'none', 'TRANSPORT', 'subscriptions'];
  tagged.forEach(([t, a, acc, sub, memo], i) => sync.push(['', uk(t), acc, money2(a), sub, memo, cats[i % cats.length]].map(csvf).join(',')));
  sync.push(['', '06/09/2026', 'ACC-0002', '-18.75', '', 'NEW NOODLE PLACE', 'eating_out'].map(csvf).join(','));
  sync.push(['', '06/09/2026', 'ACC-0002', '-6.00', 'FT', 'PIZZA SLICE "N" GO, HIGH ST', 'takeaway'].map(csvf).join(','));
  writeFileSync(join(inbox, 'bank-sync-20260909-120000.csv'), sync.join('\r\n') + '\r\n');

  // cp1252 file: "£" is 0xA3, "É" is 0xC9; parentheses for money out.
  const latin = 'Number,Date,Account,Amount,Subcategory,Memo\r\n,03/09/2026,ACC-0002,(12.00),DEB,CRÊPERIE £ HOUSE\r\n,04/09/26,ACC-0002,-7.00,DEB,THÉ ROOM\r\n';
  writeFileSync(join(inbox, 'old-bank-latin1.csv'), Buffer.from([...latin].map(ch => ({ '£': 0xa3, 'Ê': 0xca, 'É': 0xc9 }[ch] ?? ch.charCodeAt(0)))));

  // Broken: an impossible date. Must stay in inbox/ and be reported.
  writeFileSync(join(inbox, 'broken.csv'), 'Number,Date,Account,Amount,Subcategory,Memo\r\n,31/02/2026,ACC-0001,-5.00,DEB,NOWHERE\r\n');
  writeFileSync(join(inbox, 'notes.txt'), 'not a csv');

  // Balances (what a bank sync would have saved).
  writeFileSync(join(sys, 'balances.json'), JSON.stringify({ asOf: '2026-09-06', accounts: [{ acct: 'asset-1', name: 'Current account', kind: 'cash', balance: 1234.56, currency: 'GBP', asOf: '2026-09-06' }, { acct: 'bad', balance: 'x' }] }));
  writeFileSync(join(sys, 'balances_history.json'), JSON.stringify([
    { date: '2026-09-06', total: 1234.56, accounts: { 'asset-1': 1234.56 } },
    { date: '2026-09-01', total: 1500, accounts: { 'asset-1': 1500 } },
    { date: 'bad', total: 'x' },
  ]));
  return dir;
}
