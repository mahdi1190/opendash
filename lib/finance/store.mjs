// lib/finance/store.mjs - importing bank CSV exports into the transaction
// store, exactly as spend.py did:
//
//   parseCsv(buf, name)       Barclays-style export (and common variants) -> rows
//   rowKey / rowKeyStr         the de-dup key (date, amount, account, MEMO)
//   merge(existing, incoming)  rows not already stored (counts per key, so two
//                              genuine identical payments on one day both stay)
//   updateBankCategories(map, rows)   bank-sync "Bank category" column -> map
//   updatePlaces(map, rows)    the place columns (Country, City, Local amount, Local
//                              currency, Online: lib/finance/place.mjs) -> map
//   parseStore(text) / storeCsv(rows) the master store (_system/transactions.csv)
//   stableKeys(rows)           12-hex id per row (sha1 of key + occurrence)
//
// Pure functions; the pipeline does the file I/O through lib/fsutil.mjs.

import { createHash } from 'node:crypto';
import { dictRows, writeCsv } from './csv.mjs';
import { placeFromCols, placeKey } from './place.mjs';
import {
  decodeText, splitlines, pyStrip, collapseWs, stripChars, pyFloat, pyRound, pyFixed, pyRepr, strptimeDate, cmpStr,
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
  s = stripChars(s, '()');   // both ends (a /[()]+$/ regex is quadratic on a long run of brackets)
  const x = pyFloat(s);
  return neg ? -x : x;
}

const DATE_FORMATS = ['%d/%m/%Y', '%d/%m/%y', '%Y-%m-%d', '%d-%m-%Y', '%d %b %Y', '%d-%b-%Y', '%d %B %Y'];
// Files spend.py refused: American layouts (a card company's site in the US) and a time after the date.
const MONTH_FIRST = ['%m/%d/%Y', '%m/%d/%y'];
const MORE_FORMATS = ['%d %b %y', '%d-%b-%y', '%d.%m.%Y', '%d.%m.%y', '%Y/%m/%d', '%b %d, %Y', '%B %d, %Y', '%b %d %Y'];
/** spend.py's _date: the first format that parses, as an ISO date. monthFirst: the file's dates read 12/31/2026. */
export function parseDate(v, monthFirst = false) {
  const s = pyStrip(String(v));
  for (const f of monthFirst ? [...MONTH_FIRST, ...DATE_FORMATS] : DATE_FORMATS) {
    try { return strptimeDate(s, f); } catch { /* next */ }
  }
  const noTime = s.replace(/[ T]\d{1,2}:\d{2}.*$/, '');
  for (const f of [...(noTime !== s ? (monthFirst ? MONTH_FIRST : []).concat(DATE_FORMATS) : []), ...MORE_FORMATS]) {
    try { return strptimeDate(noTime, f); } catch { /* next */ }
  }
  throw new Error(`unrecognised date: '${s}'`);
}
/** Do this column's slash dates read month first? Only when one of them cannot read any other way. */
function datesMonthFirst(cells) {
  let monthFirst = false;
  for (const c of cells) {
    const m = /^(\d{1,2})\/(\d{1,2})\/\d{2,4}\b/.exec(pyStrip(String(c || '')));
    if (!m) continue;
    if (+m[1] > 12) return false;
    if (+m[2] > 12) monthFirst = true;
  }
  return monthFirst;
}
/** "12.40 CR" / "12.40DR" (card exports): {x, tag}; a plain amount has no tag. */
function taggedAmount(v) {
  const m = /^(.*?\d)\s*(CR|DR)\.?$/i.exec(pyStrip(String(v || '')));
  return m ? { x: Math.abs(money(m[1])), tag: m[2].toUpperCase() } : { x: money(v), tag: null };
}
/** A "Debit/Credit" column's word -> -1 (money out), 1 (money in) or 0 (it does not say). */
function directionWord(v) {
  const s = pyStrip(String(v || '')).toLowerCase();
  if (/^(d|dr|debit|purchase|sale|charge)$/.test(s)) return -1;
  if (/^(c|cr|credit|payment|refund|return)$/.test(s)) return 1;
  return 0;
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
 * The array carries .meta {headers, marked, preamble, balances} for lib/finance/cards.mjs:
 * marked = the file says each row's direction itself ("CR"/"DR", a Debit/Credit column).
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
  const cDate = col('date', 'transaction date') || col('posted', 'trans date');
  let cAmt = col('amount', 'value');
  // "Foreign amount" beside "Billing amount": the one that hits the account.
  if (cAmt && !cols.has('amount')) { const b = [...cols.entries()].find(([k]) => k.includes('amount') && /billing|settle|posted|gbp|sterling|£/.test(k)); if (b) cAmt = b[1]; }
  const cIn = col('money in', 'paid in', 'credit');
  const cOut = col('money out', 'paid out', 'debit');
  const cAcc = col('account', 'account number');
  const cSub = col('subcategory', 'type', 'transaction type');
  let cMemo = col('memo', 'description', 'details', 'narrative', 'reference');
  // A shop's name beats a reference number; a card file may only call it the merchant or payee.
  if (!cMemo || cols.get('reference') === cMemo) cMemo = col('merchant', 'payee', 'retailer') || cMemo || cols.get('transaction') || cols.get('name') || null;
  const cBank = cols.has('bank category') ? cols.get('bank category') : null;
  const cDir = cAmt ? ['debit/credit', 'credit/debit', 'dr/cr', 'cr/dr', 'debit or credit', 'credit or debit', 'credit debit indicator'].map(n => cols.get(n)).find(Boolean) || null : null;
  const cBal = col('statement balance', 'running balance', 'balance');
  // Where it was paid: the bank-sync CSV's place columns, or a bank export's own
  // "Local amount" / "Local currency" (Monzo's has them). Exact names only.
  const placeCols = ['country', 'city', 'local amount', 'local currency', 'online', 'currency'].filter(n => cols.has(n));
  const hasPlace = placeCols.some(n => n !== 'currency');
  if (!cDate || !(cAmt || cIn || cOut) || !cMemo) {
    throw new Error(`${name}: couldn't find date/amount/description columns in [${[...cols.keys()].map(k => `'${k}'`).join(', ')}]`);
  }
  const get = (row, c) => (c == null ? null : row.get(c));
  const out = [];
  const monthFirst = datesMonthFirst(rows.map(row => get(row, cDate)));
  // Marked amounts: "CR" is money in, "DR" money out. With only CRs marked, a plain amount is a charge.
  const tags = cAmt ? rows.filter(row => pyStrip(get(row, cDate) || '')).map(row => (/\d\s*(CR|DR)\.?\s*$/i.exec(String(get(row, cAmt) || '')) || [])[1]).filter(Boolean).map(t => t.toUpperCase()) : [];
  const hasCR = tags.includes('CR'), hasDR = tags.includes('DR');
  let marked = hasCR || hasDR;
  const balances = [];
  for (const row of rows) {
    const d = pyStrip(get(row, cDate) || '');
    if (!d) continue;
    let amt;
    if (cAmt) {
      const t = taggedAmount(get(row, cAmt));
      amt = t.tag === 'CR' ? t.x : t.tag === 'DR' ? -t.x : hasCR && !hasDR ? -Math.abs(t.x) : t.x;
      const dir = cDir ? directionWord(get(row, cDir)) : 0;
      if (dir) { amt = dir * Math.abs(t.x); marked = true; }
    } else amt = money(get(row, cIn)) - Math.abs(money(get(row, cOut)));
    if (!Number.isFinite(amt)) throw new Error(`${name}: an amount is not a number`);
    if (cBal) balances.push(get(row, cBal));
    const rec = {
      date: parseDate(d, monthFirst),
      amount: pyRound(amt, 2),
      account: cAcc ? pyStrip(get(row, cAcc) || '') : '',
      subcategory: cSub ? pyStrip(get(row, cSub) || '') : '',
      memo: pyStrip(collapseWs(get(row, cMemo) || '')),
      source: name,
    };
    if (cBank) rec.bank_category = cleanBankCategory(get(row, cBank));
    if (hasPlace) {
      const pl = placeFromCols(n => (placeCols.includes(n) ? get(row, cols.get(n)) ?? '' : undefined));
      if (pl.has) rec.place = pl.place;
    }
    out.push(rec);
  }
  // Two money columns say the direction by themselves, too.
  out.meta = { headers: [...cols.keys()], marked: marked || (!cAmt && !!(cIn || cOut)), preamble: lines.slice(0, start), balances: cBal ? balances : null };
  return out;
}

/**
 * Which "source" a row belongs to in Your data (lib/finance/data-sources.mjs) and in the
 * hide list: its account, or for a file with no account column the file itself.
 */
export const dataKey = (r) => (r && r.account ? String(r.account) : `file:${r && r.source ? r.source : ''}`);

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

/**
 * Record where each row of a CSV with place columns was paid, keyed by the de-dup key
 * (like updateBankCategories: rows already stored count too, so a full re-fetch fills
 * old rows in; an empty place clears it). Mutates `places`; returns how many changed.
 */
export function updatePlaces(places, rows) {
  let changed = 0;
  for (const r of rows) {
    if (!('place' in r)) continue;
    const k = rowKeyStr(r), p = r.place;
    if (p) {
      if (placeKey(places[k]) !== placeKey(p)) { places[k] = p; changed++; }
    } else if (Object.prototype.hasOwnProperty.call(places, k)) { delete places[k]; changed++; }
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
