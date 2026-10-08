// lib/fin-connect/normalise.mjs - provider transactions -> finance rows
// (shared by every direct provider; design 3.2 "Normalise").
//
//   finishRows(txs, opts) -> Promise<{rows, rejected: {reason: n}, heldForRate}>
//   finishRow(tx, opts)   -> Promise<{row} | {reason}>
//   cleanMemo(s), cleanCategory(s), dateIn(ts, timeZone), minorDigits(ccy), fxNote(...)
//
// tx  = {id?, accountId, date | ts, minor (signed integer minor units), currency,
//        memo, bc?, sub?}   (what provider.normalise returns)
// row = {id, accountId, date, pence, memo, bc, sub}   (what lib/finance.mjs writes
//        into its bank-sync CSV; the account column becomes '<sourceId>.<accountId>')
// opts = {home: 'GBP', fx(from, to, date) -> Promise<rate|null>, timeZone, from?, maxDate?}
//
// Rules: the sign comes from the provider's own amount/direction (never from
// text); amounts are integers end to end; memos are cleaned like lib/finance.mjs
// (control and bidi characters, 200 characters, no leading = + @ - so a CSV
// export can never start a formula); another currency is converted at that
// day's rate with the original kept in the memo ("... (<amount> <CCY> @ <rate>)").
// With no rate the row is held back (counted), never guessed.

const INVISIBLE = (() => {
  const ranges = [[0x00, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff]];
  const hex = n => n.toString(16).padStart(4, '0');
  return new RegExp('[' + ranges.map(([a, b]) => `\\u${hex(a)}-\\u${hex(b)}`).join('') + ']', 'g');
})();
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ACC_RE = /^[A-Za-z0-9_-]{1,64}$/;
const CCY = /^[A-Z]{3}$/;
// ISO 4217 minor units that are not 2 (the rest are 2).
const DIGITS = { BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3, BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0, PYG: 0, RWF: 0, UGX: 0, UYI: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0 };
export const minorDigits = (ccy) => (Object.hasOwn(DIGITS, ccy) ? DIGITS[ccy] : 2);
const MAX_PENCE = 1e9;

export function cleanMemo(s, max = 200) {
  return String(s == null ? '' : s)
    .replace(INVISIBLE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[=+@\-\s]+/, '')
    .trim()
    .slice(0, max)
    .trim();
}

/** A bank category label, or null: plain words only (it ends up in a CSV and a JSON key). */
export function cleanCategory(s) {
  if (s == null || typeof s !== 'string') return null;
  const v = cleanMemo(s, 60);
  if (!/^[A-Za-z0-9_ &/.-]{1,60}$/.test(v)) return null;
  if (/^(uncategori[sz]ed|none|null|general)$/i.test(v)) return null;
  return v;
}

/** 'YYYY-MM-DD' of an instant in a time zone (the user's home zone; banks date at home). */
export function dateIn(ts, timeZone) {
  const t = Date.parse(ts);
  if (!Number.isFinite(t)) return null;
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
  } catch {
    return new Date(t).toISOString().slice(0, 10);
  }
}

export function fxNote(minor, ccy, rate) {
  const d = minorDigits(ccy);
  const amt = (Math.abs(minor) / 10 ** d).toFixed(d);
  return `(${amt} ${ccy} @ ${Number(rate).toFixed(4)})`;
}

/** One provider transaction -> {row} | {reason}. */
export async function finishRow(tx, opts = {}) {
  if (!tx || typeof tx !== 'object') return { reason: 'not an object' };
  const accountId = String(tx.accountId || '');
  if (!ACC_RE.test(accountId)) return { reason: 'bad account' };
  const date = tx.date && ISO.test(tx.date) ? tx.date : (tx.ts ? dateIn(tx.ts, opts.timeZone) : null);
  if (!date || !ISO.test(date)) return { reason: 'bad date' };
  if (opts.from && date < opts.from) return { reason: 'outside window' };
  if (opts.maxDate && date > opts.maxDate) return { reason: 'outside window' };
  if (!Number.isInteger(tx.minor)) return { reason: 'bad amount' };
  if (tx.minor === 0) return { reason: 'zero amount' };
  const ccy = typeof tx.currency === 'string' && CCY.test(tx.currency) ? tx.currency : null;
  if (!ccy) return { reason: 'bad currency' };
  const home = CCY.test(opts.home || '') ? opts.home : 'GBP';
  let memo = cleanMemo(tx.memo, 200) || '(no description)';
  let pence;
  if (ccy === home) {
    // "pence" is always hundredths of the home unit (lib/finance.mjs writes pence / 100).
    pence = Math.round(tx.minor * 10 ** (2 - minorDigits(ccy)));
  } else {
    const rate = typeof opts.fx === 'function' ? await Promise.resolve(opts.fx(ccy, home, date)).catch(() => null) : null;
    if (!(Number(rate) > 0) || !Number.isFinite(Number(rate))) return { reason: 'no exchange rate', held: true };
    const major = tx.minor / 10 ** minorDigits(ccy);
    // Half away from zero, after trimming float noise (12.34 x 0.75 = 9.255 -> 9.26 in or out).
    const exact = major * Number(rate) * 100;
    pence = Math.sign(exact) * Math.round(Number(Math.abs(exact).toFixed(6)));
    if (pence === 0) pence = tx.minor < 0 ? -1 : 1;     // a tiny payment still counts as one
    const note = fxNote(tx.minor, ccy, rate);
    memo = `${cleanMemo(memo, 199 - note.length)} ${note}`;
  }
  if (!Number.isInteger(pence) || Math.abs(pence) > MAX_PENCE) return { reason: 'implausible amount' };
  const id = tx.id != null ? cleanMemo(tx.id, 80) || null : null;
  const bc = cleanCategory(tx.bc);
  const sub = tx.sub === 'FT' ? 'FT' : '';
  return { row: { id, accountId, date, pence, memo, bc, sub } };
}

/**
 * Many at once: rows (deduped by provider id within one fetch), rejected
 * reasons counted, heldForRate = rows waiting for an exchange rate.
 */
export async function finishRows(txs, opts = {}) {
  const rows = [], rejected = {}, seen = new Set();
  let heldForRate = 0;
  for (const tx of Array.isArray(txs) ? txs : []) {
    const r = await finishRow(tx, opts);
    if (r.reason) {
      if (r.held) heldForRate++;
      rejected[r.reason] = (rejected[r.reason] || 0) + 1;
      continue;
    }
    if (r.row.id) {
      const k = r.row.accountId + '|' + r.row.id;
      if (seen.has(k)) { rejected.duplicate = (rejected.duplicate || 0) + 1; continue; }
      seen.add(k);
    }
    rows.push(r.row);
  }
  return { rows, rejected, heldForRate };
}
