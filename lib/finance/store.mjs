// lib/finance/store.mjs - importing bank CSV exports into the transaction
// store, exactly as spend.py did:
//
//   parseCsv(buf, name)       Barclays-style export (and common variants) -> rows
//   rowKey / rowKeyStr         the de-dup key (date, amount, account, MEMO)
//   merge(existing, incoming)  rows not already stored (counts per key, so two
//                              genuine identical payments on one day both stay)
//   updateBankCategories(map, rows)   bank-sync "Bank category" column -> map
//   parseStore(text) / storeCsv(rows) the master store (_system/transactions.csv)
//   stableKeys(rows)           12-hex id per row (sha1 of key + occurrence)
//
// Pure functions; the pipeline does the file I/O through lib/fsutil.mjs.

import { createHash } from 'node:crypto';
import { dictRows, writeCsv } from './csv.mjs';
import {
  decodeText, splitlines, pyStrip, collapseWs, pyFloat, pyRound, pyFixed, pyRepr, strptimeDate, cmpStr,
} from './pycompat.mjs';

export const FIELDS = ['date', 'amount', 'account', 'subcategory', 'memo', 'source'];

/**
 * spend.py's _money: "£1,234.50", "(12.00)", "-", "" -> number. Also strips
 * € and $ (spend.py refused those files; nothing it accepted reads differently).
 */
export function money(v) {
  let s = pyStrip(String(v || '')).replace(/[£€$]/g, '').replace(/,/g, '');
  if (s === '' || s === '-' || s === 'nan') return 0;
  const neg = s.startsWith('(') && s.endsWith(')');
  s = s.replace(/^[()]+/, '').replace(/[()]+$/, '');
  const x = pyFloat(s);
  return neg ? -x : x;
}

const DATE_FORMATS = ['%d/%m/%Y', '%d/%m/%y', '%Y-%m-%d', '%d-%m-%Y', '%d %b %Y', '%d-%b-%Y', '%d %B %Y'];
/** spend.py's _date: the first format that parses, as an ISO date. */
export function parseDate(v) {
  const s = pyStrip(String(v));
  for (const f of DATE_FORMATS) {
    try { return strptimeDate(s, f); } catch { /* next */ }
  }
  throw new Error(`unrecognised date: '${s}'`);
}

const BC_OK = /^[A-Za-z0-9_ &/.-]{1,60}$/;
/** A bank category string, or null. Anything odd is dropped, not trusted. */
export function cleanBankCategory(v) {
  const s = pyStrip(collapseWs(String(v || '')));
  if (!s || ['none', 'null', 'uncategorised', 'uncategorized'].includes(s.toLowerCase()) || !BC_OK.test(s)) return null;
  return s;
}

/**
 * Parse one CSV export. Handles the classic Barclays layout (Number, Date,
 * Account, Amount, Subcategory, Memo) and common variants (Money in / Money
 * out columns, Description instead of Memo, preamble lines before the header).
 * Throws (and the file is left in the inbox) if the columns can't be found or
 * a date or amount can't be read.
 */
export function parseCsv(buf, name) {
  const text = typeof buf === 'string' ? buf : decodeText(buf);
  const lines = splitlines(text);
  let start = 0;
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const low = lines[i].toLowerCase();
    if (low.includes('date') && (low.includes('amount') || low.includes('money') || low.includes('debit') || low.includes('paid out'))) { start = i; break; }
  }
  const { fieldnames, rows } = dictRows(lines.slice(start).join('\n'));
  const cols = new Map();
  for (const c of fieldnames || []) if (c) cols.set(pyStrip(c).toLowerCase(), c);
  const col = (...names) => {
    for (const n of names) for (const [k, orig] of cols) if (k === n) return orig;
    for (const n of names) for (const [k, orig] of cols) if (k.includes(n)) return orig;
    return null;
  };
  const cDate = col('date', 'transaction date');
  const cAmt = col('amount', 'value');
  const cIn = col('money in', 'paid in', 'credit');
  const cOut = col('money out', 'paid out', 'debit');
  const cAcc = col('account', 'account number');
  const cSub = col('subcategory', 'type', 'transaction type');
  const cMemo = col('memo', 'description', 'details', 'narrative', 'reference');
  const cBank = cols.has('bank category') ? cols.get('bank category') : null;
  if (!cDate || !(cAmt || cIn || cOut) || !cMemo) {
    throw new Error(`${name}: couldn't find date/amount/description columns in [${[...cols.keys()].map(k => `'${k}'`).join(', ')}]`);
  }
  const get = (row, c) => (c == null ? null : row.get(c));
  const out = [];
  for (const row of rows) {
    const d = pyStrip(get(row, cDate) || '');
    if (!d) continue;
    const amt = cAmt ? money(get(row, cAmt)) : money(get(row, cIn)) - Math.abs(money(get(row, cOut)));
    if (!Number.isFinite(amt)) throw new Error(`${name}: an amount is not a number`);
    const rec = {
      date: parseDate(d),
      amount: pyRound(amt, 2),
      account: cAcc ? pyStrip(get(row, cAcc) || '') : '',
      subcategory: cSub ? pyStrip(get(row, cSub) || '') : '',
      memo: pyStrip(collapseWs(get(row, cMemo) || '')),
      source: name,
    };
    if (cBank) rec.bank_category = cleanBankCategory(get(row, cBank));
    out.push(rec);
  }
  return out;
}

/** The de-dup key (as an array). */
export const rowKey = (r) => [r.date, pyFixed(Number(r.amount), 2), r.account, String(r.memo).toUpperCase()];
export const rowKeyStr = (r) => rowKey(r).join('|');
const keyId = (r) => JSON.stringify(rowKey(r));

/**
 * Rows from `incoming` that aren't already in `existing`. Counts per key, so
 * the same transaction in two overlapping exports is kept once while two
 * genuine identical transactions on one day are both kept.
 */
export function merge(existing, incoming) {
  const have = new Map();
  for (const r of existing) { const k = keyId(r); have.set(k, (have.get(k) || 0) + 1); }
  const seen = new Map(), added = [];
  for (const r of incoming) {
    const k = keyId(r);
    const n = (seen.get(k) || 0) + 1;
    seen.set(k, n);
    if (n > (have.get(k) || 0)) added.push(r);
  }
  return added;
}

/**
 * Record the bank's category for every row of a bank-sync CSV, keyed by the
 * de-dup key. Rows already stored count too (that is how a full re-fetch
 * refreshes old categories). An empty category clears it. Mutates `bank`.
 */
export function updateBankCategories(bank, rows) {
  let changed = 0;
  for (const r of rows) {
    if (!('bank_category' in r)) continue;
    const k = rowKeyStr(r), bc = r.bank_category;
    if (bc) {
      if (bank[k] !== bc) { bank[k] = bc; changed++; }
    } else if (Object.prototype.hasOwnProperty.call(bank, k)) { delete bank[k]; changed++; }
  }
  return changed;
}

/** The store file's rows (file order), amounts as numbers. */
export function parseStore(text) {
  const { rows } = dictRows(text);
  return rows.map(m => {
    const o = Object.fromEntries(m);
    o.amount = pyFloat(o.amount);
    return o;
  });
}

/** Sort like Python's sorted(rows, key=(date, memo)) (stable). */
export function sortRows(rows) {
  return rows.map((r, i) => [r, i]).sort((a, b) => cmpStr(a[0].date, b[0].date) || cmpStr(a[0].memo, b[0].memo) || a[1] - b[1]).map(x => x[0]);
}

/** The store as CSV text: sorted by (date, memo), Python float formatting, \r\n. */
export function storeCsv(rows) {
  return writeCsv(FIELDS, sortRows(rows), (r, k) => {
    const v = r[k];
    if (v == null) return '';
    return k === 'amount' && typeof v === 'number' ? pyRepr(v) : v;
  });
}

/** 12-hex key per row: sha1 of the de-dup key plus its occurrence number. */
export function stableKeys(rows) {
  const seen = new Map();
  return rows.map(r => {
    const k = rowKeyStr(r);
    const n = (seen.get(k) || 0) + 1;
    seen.set(k, n);
    return createHash('sha1').update(`${k}|${n}`, 'utf8').digest('hex').slice(0, 12);
  });
}
