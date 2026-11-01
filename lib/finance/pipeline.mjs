// lib/finance/pipeline.mjs - the finance pipeline that used to be spend.py.
//
//   runPipeline(financeDir, { today, sample, symbol, now })
//     1. imports every *.csv in inbox/ into _system/transactions.csv, skipping
//        anything already imported from an overlapping export, and records the
//        bank's own categories from bank-sync CSVs (_system/bank_categories.json)
//        and where each payment was made (_system/tx_places.json, lib/finance/place.mjs);
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

import { readdir, readFile, rename, stat, mkdir, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite, writeJson, readJson, withLock, retryFs } from '../fsutil.mjs';
import { parseCsv, merge, updateBankCategories, updatePlaces, parseStore, storeCsv, dataKey } from './store.mjs';
import { Categoriser } from './categorise.mjs';
import { buildFrame, analyse, txRow } from './analyse.mjs';
import { weeklyReport, transactionsCsv } from './report.mjs';
import { cmpStr, pyFixed, dayNum } from './pycompat.mjs';
import { matchOwnTransfers, applyOwedNet } from './transfers.mjs';
import { txKeyOf } from '../expenses.mjs';
import { countRule, describeStore, otherAccountWords, markOtherAccount, dataNotes, plainFile } from './data-sources.mjs';
import { stepLedger, readLedger, readCounting, mergePending, pendingInfo, balancePending, goneRows } from './pending.mjs';
import { readCards, updateCards, cardMap, markCardRows, cardEntries, unseenCards, cardRowsFromFolder, cardPreview, cardFile, cardKeyFor, cleanCardName, fileSignature, statementIn, issuerIn, issuerName, flipRows, cardsFile } from './cards.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_RULES_FILE = join(HERE, 'default-rules.json');
export const defaultRules = () => JSON.parse(readFileSync(DEFAULT_RULES_FILE, 'utf8'));

export function financePaths(dir) {
  const sys = join(dir, '_system');
  return {
    root: dir, sys, inbox: join(dir, 'inbox'), processed: join(dir, 'processed'), reports: join(dir, 'reports'),
    store: join(sys, 'transactions.csv'), rules: join(sys, 'rules.json'), bankCats: join(sys, 'bank_categories.json'), places: join(sys, 'tx_places.json'),
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

/** Where each stored row was paid ({rowKey: {cc, city, lc, la, ol}}; empty when none is known). */
async function loadPlaces(p) {
  const v = await readJson(p.places, { fallback: {} }).catch(() => ({}));
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

async function loadRules(p) {
  const rules = await readJson(p.rules, { fallback: null });
  if (!rules) return defaultRules();
  return rules;
}

/**
 * Latest balance snapshot and per-date history, if the bank sync wrote them. rule (data-sources.mjs
 * countRule): an account left out of the analysis leaves the totals; one counted up to a date
 * leaves them after that date. cards (cards.mjs cardMap): a card's balance is money owed, never
 * spending money, so it leaves them too (the analysis carries it in `cards`).
 */
async function loadBalances(p, rule = null, cards = null) {
  const out = {};
  const snap = await readJson(p.balances, { fallback: null }).catch(() => null);
  const isCard = (k) => !!cards && cards.has(String(k));
  if (snap && typeof snap === 'object' && Array.isArray(snap.accounts)) {
    out.balances = snap.accounts.filter(b => b && typeof b === 'object' && !Array.isArray(b) && typeof b.balance === 'number' && (!rule || rule.balanceOn(String(b.acct))) && !isCard(b.acct));
  }
  const hist = await readJson(p.balHistory, { fallback: null }).catch(() => null);
  if (Array.isArray(hist)) {
    out.balance_history = hist.filter(h => h && typeof h === 'object' && typeof h.date === 'string' && typeof h.total === 'number')
      .map((h, i) => [h, i]).sort((a, b) => cmpStr(a[0].date, b[0].date) || a[1] - b[1]).map(x => x[0]);
    if (rule && rule.active) out.balance_history = out.balance_history.map(h => rule.balanceRow(h));
    if (cards && cards.size) {
      out.balance_history = out.balance_history.map((h) => {
        if (!h.accounts || typeof h.accounts !== 'object' || !Object.keys(h.accounts).some(isCard)) return h;
        const accounts = Object.fromEntries(Object.entries(h.accounts).filter(([k]) => !isCard(k)));
        return { ...h, accounts, total: Math.round(Object.values(accounts).reduce((t, v) => t + (typeof v === 'number' ? v : 0), 0) * 100) / 100 };
      });
    }
  }
  return out;
}

/** What the card rules need for a run: the file, which sources are cards, the bank's balances. */
async function cardContext(p, dir, opts) {
  const reg = await readCards(dir);
  const balanceDoc = await readJson(p.balances, { fallback: null }).catch(() => null);
  return { reg, balanceDoc, cards: cardMap(reg, opts.sources || [], balanceDoc) };
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
 * The rows the analysis counts. Every stored row goes through categorising and the transfer match
 * first, so a transfer whose other half is left out is still known to be one (markOtherAccount).
 */
async function buildView(store, cat, bank, places, opts, rule, today) {
  const frame = buildFrame(store, cat, bank, places);
  // Payments the bank has not settled yet (lib/finance/pending.mjs): counted as normal rows, unless you said not to.
  const pv = opts.pendingStep ? await opts.pendingStep(frame, cat) : null;
  const { all, uncounted } = pv ? mergePending(frame, pv.ledger, pv.counting, cat, { today, live: pv.live }) : { all: frame, uncounted: [] };
  const pend = pv ? { uncounted: uncounted.filter(rule.counted), ledger: pv.ledger, counting: pv.counting } : null;
  // Credit cards first (cards.mjs): a payment to a card is a transfer even with no other half here.
  const cx = opts.matchTransfers && opts.cardCx ? opts.cardCx : null;
  const marks = cx ? markCardRows(all, cx.cards, cat) : null;
  const owedCards = marks ? { cards: cardEntries({ frame: all, cards: cx.cards, reg: cx.reg, balanceDoc: cx.balanceDoc, rule, pays: marks.pays }), unseen: unseenCards(marks.pays, dayNum(today)) } : { cards: [], unseen: null };
  // Sources: money moved between the user's own accounts is not spending (opt-in; lib/finance.mjs turns it on).
  const ownTransfers = opts.matchTransfers ? matchOwnTransfers(all, { exclude: cat.exclude, skip: new Set(Array.isArray(opts.pairSkip) ? opts.pairSkip.map(String) : []) }) : 0;
  const owed = (rows) => (opts.owedNet ? applyOwedNet(rows, opts.owedNet, cat, (r) => txKeyOf(txRow(r))) : null);   // Owed to me: paid back is not income (lib/owed.mjs)
  if (!rule.active) return { df: all, ownTransfers, other: null, notes: [], owedNet: owed(all), pend, ...owedCards };
  const df = all.filter(rule.counted);
  const desc = describeStore(store, opts.sources || [], cx ? cx.reg.cards : null);
  const other = opts.matchTransfers ? markOtherAccount(df, rule, cat, otherAccountWords(desc, rule, opts.ownName)) : null;
  return { df, ownTransfers, other, notes: dataNotes(all, df, rule, cat, desc, today), owedNet: owed(df), pend, ...owedCards };
}

/** The sources still connected and on: a pending payment of one that is not is left out. null: nothing says. */
function liveSources(opts) {
  const list = Array.isArray(opts.sources) ? opts.sources : [];
  if (!list.length) return () => true;
  const on = new Set(list.filter(s => s && s.enabled !== false).map(s => s.id));
  return (id) => on.has(id);
}
/** For a preview: what the ledger says now, nothing changed. */
const pendingReader = (dir, opts) => async () => ({ ledger: await readLedger(dir), counting: opts.counting || await readCounting(dir), live: liveSources(opts) });

/**
 * What a change of ticks would do, without writing anything: `cur` and `next` are
 * {hide: [keys], until: {key: date}, pairSkip: [keys]}. -> {before, after, otherAccount, notes, empty}
 */
export async function previewChoices(dir, opts, cur, next) {
  const p = financePaths(dir);
  const today = opts.today || todayIn(opts.timeZone);
  const cat = new Categoriser(await loadRules(p));
  const store = await loadStore(p);
  let bank = await readJson(p.bankCats, { fallback: {} }).catch(() => ({}));
  if (!bank || typeof bank !== 'object' || Array.isArray(bank)) bank = {};
  const places = await loadPlaces(p);
  const cardCx = await cardContext(p, dir, opts);
  const look = async (c) => {
    const rule = countRule(c.hide, c.until);
    if (!store.some(rule.counted)) return { payments: 0, monthSpend: 0, monthIncome: 0, balance: null, bills: 0, billsMonthly: 0, other: null, notes: [], month: null };
    const v = await buildView(store, cat, bank, places, { ...opts, pairSkip: c.pairSkip, cardCx, pendingStep: pendingReader(dir, opts) }, rule, today);
    if (!v.df.length) return { payments: 0, monthSpend: 0, monthIncome: 0, balance: null, bills: 0, billsMonthly: 0, other: null, notes: [], month: null };
    const s = analyse(v.df, today, cat, { symbol: opts.symbol || '£' });
    const { balances } = await loadBalances(p, rule, cardCx.cards);
    return {
      payments: s.counts.total, monthSpend: s.month.mtd, monthIncome: s.income_month, month: s.month.label,
      balance: Array.isArray(balances) && balances.length ? Math.round(balances.reduce((t, b) => t + b.balance, 0) * 100) / 100 : null,
      bills: s.recurring.length, billsMonthly: s.recurring_monthly_total, other: v.other, notes: v.notes,
    };
  };
  const a = await look(cur), b = await look(next);
  const pub = ({ payments, monthSpend, monthIncome, balance, bills, billsMonthly, month }) => ({ payments, monthSpend, monthIncome, balance, bills, billsMonthly, month });
  return { before: pub(a), after: pub(b), otherAccount: b.other, notes: b.notes, empty: b.payments === 0 };
}

/**
 * Run the whole pipeline on a finance folder. opts.today: 'YYYY-MM-DD'
 * (default: today in opts.timeZone). opts.symbol: currency symbol for notes.
 * opts.hideAccounts: account ids left out of the analysis (their rows stay stored).
 * opts.untilAccounts: {account id: 'YYYY-MM-DD'} counted only up to that day (rows stay stored).
 * opts.dropAccounts: accounts deleted for good; rows for them are not imported again.
 * opts.pairSkip: accounts that are copies of another (never the other half of a transfer).
 * opts.sources: the bank sources (names for the notes); opts.ownName: the user's full name.
 * opts.clearEmpty: nothing left to show -> analysis.json goes, so no page shows old numbers.
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
    const places = await loadPlaces(p);
    const cardCx = await cardContext(p, dir, opts);

    const files = await inboxFiles(p.inbox);
    let imported = 0, bankChanged = 0;
    const errors = [], moved = [];
    const drop = new Set(Array.isArray(opts.dropAccounts) ? opts.dropAccounts.map(String) : []);
    for (const name of files) {
      const src = join(p.inbox, name);
      let rows;
      try { rows = parseCsv(await readFile(src), name); }
      catch (e) { errors.push(`${name}: ${String(e && e.message || e).replace(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: `), '')}`); continue; }
      // A card file dropped in the folder: there is no one to ask (uploads were already read; cards.mjs).
      if (opts.matchTransfers) {
        const f = cardRowsFromFolder(rows, name, cardCx.reg, cat);
        rows = f.rows;
        if (f.changed) { await writeJson(cardsFile(dir), cardCx.reg, { trailingNewline: true }); cardCx.cards = cardMap(cardCx.reg, opts.sources || [], cardCx.balanceDoc); }
      }
      if (drop.size) rows = rows.filter(r => !drop.has(dataKey(r)));
      const added = merge(store, rows);
      store.push(...added);
      imported += added.length;
      await atomicWrite(p.store, storeCsv(store));
      const n = updateBankCategories(bank, rows);
      if (n) { bankChanged += n; await writeJson(p.bankCats, bank); }
      if (updatePlaces(places, rows)) await writeJson(p.places, places);
      const dest = await uniqueDest(p.processed, name);
      await retryFs(() => rename(src, dest), { label: `moving ${name}` });
      moved.push(name);
    }

    const clearOld = async () => { if (opts.clearEmpty && existsSync(p.store)) { await rm(p.analysis, { force: true }); await rm(p.summary, { force: true }); } };
    if (!store.length) {
      await clearOld();
      return { status: 'empty', message: 'No transactions yet. Import a CSV export from your bank, or connect your bank.', errors, new_files: files, imported: 0 };
    }
    // Accounts switched off (Your data, Connections' Show in Finances, the other half of a duplicate
    // pair) or counted up to a date keep their rows in the store but are left out of the analysis.
    const rule = countRule(opts.hideAccounts, opts.untilAccounts);
    if (!store.some(rule.counted)) {
      await clearOld();
      return { status: 'empty', message: 'Nothing is ticked in Your data, so there is nothing to count.', errors, new_files: files, imported };
    }
    const pendingStep = async (frame, c) => ({
      // A problem with the ledger must not stop an update: what it last said still holds, and the next rebuild tries again.
      ledger: await stepLedger(dir, frame, c, { hidden: rule.hidden, thisRun: new Set(moved), now: opts.now }).catch(() => readLedger(dir)),
      counting: opts.counting || await readCounting(dir), live: liveSources(opts),
    });
    const { df, ownTransfers, other, notes, owedNet, cards, unseen, pend } = await buildView(store, cat, bank, places, { ...opts, cardCx, pendingStep }, rule, today);
    // Everything is left out by hand: there is nothing to work out.
    if (!df.length) { await clearOld(); return { status: 'empty', message: 'Nothing is left to count: every payment here is marked not to count.', errors, new_files: files, imported }; }
    const s = analyse(df, today, cat, { symbol: opts.symbol || '£', generated: opts.generated, fetches: opts.fetches });
    if (opts.matchTransfers) s.own_transfers = ownTransfers;
    if (other) s.other_account = other;
    if (notes.length) s.data_notes = notes;
    if (owedNet && owedNet.sig) s.owed_net = owedNet;
    if (cards.length) s.cards = cards;
    if (unseen) s.card_unseen = unseen;
    // Demo folders (tools/make-fake-data.mjs) stay marked as a sample on every rebuild.
    s.sample = !!opts.sample || existsSync(join(p.sys, '.demo-data'));
    Object.assign(s, await loadBalances(p, rule, cardCx.cards));
    if (pend) {
      s.pending_info = pendingInfo(df, pend.uncounted, pend.counting);
      balancePending(s.balances, df);
      if (pend.uncounted.length) s.uncounted = pend.uncounted.map(r => [r, r.n]).sort((a, b) => b[1] - a[1]).map(x => txRow(x[0]));
      const gone = goneRows(pend.ledger);
      if (gone.length) s.pending_gone = gone;
    }
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
  const df = buildFrame(store, cat, bank && typeof bank === 'object' ? bank : {}, await loadPlaces(p));
  if (opts.matchTransfers) {
    const cx = await cardContext(p, dir, opts);
    markCardRows(df, cx.cards, cat);
    matchOwnTransfers(df, { exclude: cat.exclude });
  }
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
export async function crossAccountOverlap(dir, buf, name, parsed = null) {
  const rows = parsed || parseCsv(buf, name);
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

/** The preview of an upload that looks like a credit card, or null (cards.mjs cardPreview). */
export async function cardCheck(dir, buf, name) {
  const p = financePaths(dir);
  const rows = parseCsv(buf, name);
  const cat = new Categoriser(await loadRules(p));
  return cardPreview(rows, name, await readCards(dir), await loadStore(p), cat);
}

/**
 * The person's answer to the preview. card === false: not a credit card, and this kind of file is not
 * asked about again -> null. Otherwise {key, name, flip, flipped} -> {buf, card}: the file to import, in
 * the store's direction. flipped on a card already here: its older rows were the wrong way round too.
 */
export async function cardAnswer(dir, buf, name, card) {
  const rows = parseCsv(buf, name);
  const sig = fileSignature(rows, name);
  if (card === false) { await updateCards(dir, (reg) => { reg.files[sig] = false; }); return null; }
  const reg = await readCards(dir);
  const label = cleanCardName(card.name) || 'Credit card';
  const asked = typeof card.key === 'string' && reg.cards[card.key] ? card.key : null;
  const key = asked || cardKeyFor(label, rows);
  const marked = !!(rows.meta && rows.meta.marked);
  const flip = card.flip === true;
  if (asked && card.flipped === true) await flipStored(dir, key, flip);
  const iss = issuerIn(`${label} ${plainFile(name)}`);
  const isNew = !reg.cards[key];
  const st = statementIn(rows);
  const saved = await updateCards(dir, (r) => {
    const c = r.cards[key] || (r.cards[key] = { name: label, issuer: null, bank: null, flip });
    c.name = label;
    if (iss && !c.issuer) { c.issuer = iss.id; c.bank = iss.name; }
    if (!c.issuer && typeof card.issuer === 'string' && issuerName(card.issuer)) { c.issuer = card.issuer; c.bank = issuerName(card.issuer); }
    if (!marked) c.flip = flip;
    delete c.guess;
    // A typed balance stays unless the statement is newer.
    if (st && (!c.balance || c.balance.from === 'statement' || st.date > c.balance.date)) c.balance = st;
    r.files[sig] = key;
  });
  const c = saved.cards[key];
  return { buf: Buffer.from(cardFile(rows, key, flip), 'utf8'), card: { key, name: c.name, isNew, balance: c.balance || null, pay: c.pay || null } };
}

/** Every stored row of a source the other way round (cards.mjs flipRows), under the store's lock. Twice = back. */
export async function flipStored(dir, key, flip = null) {
  const p = financePaths(dir);
  return withLock(p.store, async () => {
    const store = await loadStore(p);
    let bank = await readJson(p.bankCats, { fallback: {} }).catch(() => ({}));
    if (!bank || typeof bank !== 'object' || Array.isArray(bank)) bank = {};
    const places = await loadPlaces(p);
    const n = flipRows(store, key, bank, places);
    if (n) {
      await atomicWrite(p.store, storeCsv(store));
      await writeJson(p.bankCats, bank);
      await writeJson(p.places, places);
    }
    await updateCards(dir, (r) => { if (r.cards[key]) r.cards[key].flip = flip === null ? !r.cards[key].flip : !!flip; });
    return n;
  }, { timeoutMs: 60000 });
}

export { transactionsCsv };
