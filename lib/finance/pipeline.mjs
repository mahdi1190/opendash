// lib/finance/pipeline.mjs - the finance pipeline that used to be spend.py.
//
//   runPipeline(financeDir, { today, sample, symbol, now })
//     1. imports every *.csv in inbox/ into _system/transactions.csv, skipping
//        anything already imported from an overlapping export, and records the
//        bank's own categories from bank-sync CSVs (_system/bank_categories.json);
//     2. moves the imported CSVs to processed/ (a file that can't be read stays
//        in inbox/ and is reported);
//     3. categorises everything with _system/rules.json (overrides -> keyword
//        rules -> bank category -> defaults);
//     4. writes _system/analysis.json, _system/summary.json and reports/<today>.md.
//     Returns the summary ({status:'ok'|'empty', imported, errors, ...}).
//
//   ensureFinanceDir(financeDir)   folders + default rules.json for a new user
//   loadFrame(financeDir)          the categorised rows (for the CSV export)
//   financePaths(financeDir)
//
// One run at a time per folder: the whole run holds the cross-process lock on
// the store (lib/fsutil.mjs withLock). Every write is atomic (fsutil).
// Python is no longer needed. Spending.xlsx and _system/dashboard.html are no
// longer produced (the Finances view and GET /api/finance/export replace them).

import { readdir, readFile, rename, stat, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite, writeJson, readJson, withLock, retryFs } from '../fsutil.mjs';
import { parseCsv, merge, updateBankCategories, parseStore, storeCsv } from './store.mjs';
import { Categoriser } from './categorise.mjs';
import { buildFrame, analyse } from './analyse.mjs';
import { weeklyReport, transactionsCsv } from './report.mjs';
import { cmpStr, pyFixed } from './pycompat.mjs';
import { matchOwnTransfers } from './transfers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_RULES_FILE = join(HERE, 'default-rules.json');
export const defaultRules = () => JSON.parse(readFileSync(DEFAULT_RULES_FILE, 'utf8'));

export function financePaths(dir) {
  const sys = join(dir, '_system');
  return {
    root: dir, sys, inbox: join(dir, 'inbox'), processed: join(dir, 'processed'), reports: join(dir, 'reports'),
    store: join(sys, 'transactions.csv'), rules: join(sys, 'rules.json'), bankCats: join(sys, 'bank_categories.json'),
    balances: join(sys, 'balances.json'), balHistory: join(sys, 'balances_history.json'),
    analysis: join(sys, 'analysis.json'), summary: join(sys, 'summary.json'), budgets: join(sys, 'budgets.json'),
    lastUpdate: join(sys, 'dashboard_update.json'), backups: join(sys, 'backups'),
  };
}

/** Create the folders, and a starter rules.json if there is none. Never overwrites. */
export async function ensureFinanceDir(dir) {
  const p = financePaths(dir);
  for (const d of [p.sys, p.inbox, p.processed, p.reports]) await mkdir(d, { recursive: true });
  let created = false;
  if (!existsSync(p.rules)) { await atomicWrite(p.rules, await readFile(DEFAULT_RULES_FILE, 'utf8')); created = true; }
  return { paths: p, rulesCreated: created };
}

// Python's Path.suffix / Path.stem.
const suffix = (name) => { const i = name.lastIndexOf('.'); return i > 0 && i < name.length - 1 ? name.slice(i) : ''; };
const stem = (name) => { const s = suffix(name); return s ? name.slice(0, -s.length) : name; };

async function inboxFiles(inbox) {
  let names = [];
  try { names = await readdir(inbox); } catch { return []; }
  const out = [];
  for (const n of names) {
    if (suffix(n).toLowerCase() !== '.csv') continue;
    try { if ((await stat(join(inbox, n))).isFile()) out.push(n); } catch { /* vanished */ }
  }
  // Python sorts Path objects; on Windows they compare case-insensitively.
  const key = process.platform === 'win32' ? (s) => s.toLowerCase() : (s) => s;
  return out.sort((a, b) => cmpStr(key(a), key(b)));
}

async function uniqueDest(dir, name) {
  let dest = join(dir, name), n = 1;
  while (existsSync(dest)) dest = join(dir, `${stem(name)} (${n++})${suffix(name)}`);
  return dest;
}

async function loadStore(p) {
  if (!existsSync(p.store)) return [];
  return parseStore(await retryFs(() => readFile(p.store, 'utf8'), { label: 'reading transactions.csv' }));
}

async function loadRules(p) {
  const rules = await readJson(p.rules, { fallback: null });
  if (!rules) return defaultRules();
  return rules;
}

/** Latest balance snapshot and per-date history, if the bank sync wrote them. */
async function loadBalances(p) {
  const out = {};
  const snap = await readJson(p.balances, { fallback: null }).catch(() => null);
  if (snap && typeof snap === 'object' && Array.isArray(snap.accounts)) {
    out.balances = snap.accounts.filter(b => b && typeof b === 'object' && !Array.isArray(b) && typeof b.balance === 'number');
  }
  const hist = await readJson(p.balHistory, { fallback: null }).catch(() => null);
  if (Array.isArray(hist)) {
    out.balance_history = hist.filter(h => h && typeof h === 'object' && typeof h.date === 'string' && typeof h.total === 'number')
      .map((h, i) => [h, i]).sort((a, b) => cmpStr(a[0].date, b[0].date) || a[1] - b[1]).map(x => x[0]);
  }
  return out;
}

/** Today's date (YYYY-MM-DD) in a time zone (IANA name), else the machine's. */
export function todayIn(timeZone, now = new Date()) {
  if (timeZone) {
    try {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(now).map(x => [x.type, x.value]));
      if (parts.year && parts.month && parts.day) return `${parts.year}-${parts.month}-${parts.day}`;
    } catch { /* unknown zone: fall back */ }
  }
  const p = (x) => String(x).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/**
 * Run the whole pipeline on a finance folder. opts.today: 'YYYY-MM-DD'
 * (default: today in opts.timeZone). opts.symbol: currency symbol for notes.
 */
export async function runPipeline(dir, opts = {}) {
  const { paths: p } = await ensureFinanceDir(dir);
  return withLock(p.store, async () => {
    const today = opts.today || todayIn(opts.timeZone);
    const rules = await loadRules(p);
    const cat = new Categoriser(rules);          // fail early on a broken rules.json
    const store = await loadStore(p);
    let bank = await readJson(p.bankCats, { fallback: {} }).catch(() => ({}));
    if (!bank || typeof bank !== 'object' || Array.isArray(bank)) bank = {};

    const files = await inboxFiles(p.inbox);
    let imported = 0, bankChanged = 0;
    const errors = [], moved = [];
    for (const name of files) {
      const src = join(p.inbox, name);
      let rows;
      try { rows = parseCsv(await readFile(src), name); }
      catch (e) { errors.push(`${name}: ${String(e && e.message || e).replace(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: `), '')}`); continue; }
      const added = merge(store, rows);
      store.push(...added);
      imported += added.length;
      await atomicWrite(p.store, storeCsv(store));
      const n = updateBankCategories(bank, rows);
      if (n) { bankChanged += n; await writeJson(p.bankCats, bank); }
      const dest = await uniqueDest(p.processed, name);
      await retryFs(() => rename(src, dest), { label: `moving ${name}` });
      moved.push(name);
    }

    if (!store.length) {
      return { status: 'empty', message: 'No transactions yet. Import a CSV export from your bank, or connect your bank.', errors, new_files: files, imported: 0 };
    }
    const df = buildFrame(store, cat, bank);
    // Sources: money moved between the user's own accounts is not spending (opt-in; lib/finance.mjs turns it on).
    const ownTransfers = opts.matchTransfers ? matchOwnTransfers(df, { exclude: cat.exclude }) : 0;
    const s = analyse(df, today, cat, { symbol: opts.symbol || '£', generated: opts.generated });
    if (opts.matchTransfers) s.own_transfers = ownTransfers;
    // Demo folders (tools/make-fake-data.mjs) stay marked as a sample on every rebuild.
    s.sample = !!opts.sample || existsSync(join(p.sys, '.demo-data'));
    Object.assign(s, await loadBalances(p));
    const reportText = weeklyReport(s, imported, files.length, { symbol: opts.symbol || '£' });
    const reportPath = join(p.reports, `${s.today}.md`);
    await atomicWrite(reportPath, reportText);
    await writeJson(p.analysis, s);

    const summary = {};
    for (const k of ['today', 'latest_transaction', 'stale_days', 'week', 'recurring_monthly_total', 'flags', 'uncategorised_merchants']) summary[k] = s[k];
    summary.month = Object.fromEntries(Object.entries(s.month).filter(([k]) => ['label', 'mtd', 'last_month_label', 'last_month_to_date', 'last_month_full'].includes(k)));
    Object.assign(summary, {
      status: 'ok', new_files: files, imported, errors, bank_categories_changed: bankChanged, by_how: s.counts.by_how,
      report: `reports/${s.today}.md`, total: s.counts.total,
    });
    await writeJson(p.summary, summary, { indent: 2 });
    return summary;
  }, { timeoutMs: 60000 });
}

/** Categorised rows of the store (no writes): used for the CSV export. */
export async function loadFrame(dir, opts = {}) {
  const p = financePaths(dir);
  const store = await loadStore(p);
  if (!store.length) return [];
  const bank = await readJson(p.bankCats, { fallback: {} }).catch(() => ({}));
  const cat = new Categoriser(await loadRules(p));
  const df = buildFrame(store, cat, bank && typeof bank === 'object' ? bank : {});
  if (opts.matchTransfers) matchOwnTransfers(df, { exclude: cat.exclude });
  return df;
}

/** Parse a CSV without importing it (to check an upload before it lands in inbox/). */
export function checkCsv(buf, name) {
  const rows = parseCsv(buf, name);
  if (!rows.length) throw new Error('no transactions found in the file');
  let from = null, to = null;
  for (const r of rows) { if (!from || r.date < from) from = r.date; if (!to || r.date > to) to = r.date; }
  return { rows: rows.length, from, to };
}

/**
 * An upload whose account is NOT in the store yet, but whose transactions
 * mostly match stored ones of another account by date and amount, is almost
 * always an export of an account a bank connection already syncs (under its
 * own account id and wording): importing it would count everything twice.
 * -> {rows: rows of new accounts, matched: how many of them match}
 */
export async function crossAccountOverlap(dir, buf, name) {
  const rows = parseCsv(buf, name);
  const p = financePaths(dir);
  if (!existsSync(p.store)) return { rows: 0, matched: 0 };
  const stored = parseStore(await readFile(p.store, 'utf8'));
  const known = new Set(stored.map(r => r.account));
  const fresh = rows.filter(r => !known.has(r.account));
  const key = (r) => `${r.date}|${pyFixed(Number(r.amount), 2)}`;
  const pool = new Map();
  for (const r of stored) pool.set(key(r), (pool.get(key(r)) || 0) + 1);
  let matched = 0;
  for (const r of fresh) { const n = pool.get(key(r)) || 0; if (n > 0) { matched++; pool.set(key(r), n - 1); } }
  return { rows: fresh.length, matched };
}

export { transactionsCsv };
