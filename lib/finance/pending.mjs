// lib/finance/pending.mjs - payments the bank has not settled yet, and how each one becomes a settled row.
//
// A pending payment counts as normal spending or money in, from the moment the bank lists it. It has one identity for
// its whole life: its key (k, 12 hex like every row's) and its txKey (tk) are made once, and the settled row INHERITS
// them. So a split, an expense, a note, "We think Sam paid", a dismissed hint and "Don't count this" all stay attached
// without anything being rewritten, on every computer, whenever they were made. The store itself never holds a pending
// row: only settled rows go in _system/transactions.csv, and each payment is in the analysis exactly once.
//
//   _system/pending.json          the latest COMPLETE list per bank: {sources: {id: {fetchedAt, rows: [{id, acct, d, a, memo, bc?, sub?, place?}]}}}
//                                 (lib/finance.mjs savePending; an incomplete fetch never writes it, so it can be stale)
//   _system/pending-ledger.json   the state of every payment:
//     open:     {k: Entry}        counted now. Entry = {k, src, id, acct, d, a, memo, bc?, sub?, place?, tk, as: [amounts seen], first, last, gone?}
//                                 last: when the bank last listed it as pending. gone: first noticed missing from a complete list
//     settled:  {natural key: {k, tk, as, how: 'id'|'match', at, c?}}   this store row IS that payment. c: your category choice, when its name changed
//     released: {k: Entry + at}   disappeared and never settled (a declined or released hold). Can still settle late.
//     seen:     {source id: fetchedAt}   the list already read
//     ids:      {'acct|bank id': row key}   the bank's id on a settled row, noted before the id is dropped (the store has no id column)
//   _system/pending-choices.json  {countPending: bool, off: {k: when}}: Settings > Money, and "Don't count this"
//
// How a payment settles, in order:
//   1. The bank's own id. Monzo keeps a transaction's id when it settles; Enable Banking gives entry_reference (or
//      transaction_id) when the bank shares one, and a hash of the row when not, which changes.
//   2. Same account, similar name, near date and amount, tolerating a changed amount (a tip, a hotel hold, a fuel
//      pre-auth). Only a row that arrived AFTER the bank last listed the payment as pending can be its settled row. That
//      one rule keeps every case apart:
//        - still listed by a complete fetch: last moves past the row, so two same-priced coffees stay two payments;
//        - a stale list (an incomplete fetch brought the settled row but no new list): the row is newer than last, so
//          the old pending row is not counted a second time, and nothing is dropped because a list was missing.
//   If a later complete list still shows a payment that was matched by likeness, the match was wrong and is undone.
// A payment missing from a complete list keeps counting for GRACE_DAYS (its settled row can lag), then it is released:
// it leaves the numbers, and lib/owed.mjs pendingNotices says so once if it had a split or an expense.
//
// Only the computer that reads the bank runs this. The others get the rows in its published copy (lib/sync/finance-share.mjs),
// so nothing can be counted twice there; "Don't count this" from another computer goes through finance-share/edits.json.
// Logs carry counts only.

import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readJson, writeJson, withLock } from '../fsutil.mjs';
import { rowKeyStr } from './store.mjs';
import { frameRow } from './analyse.mjs';
import { cleanMerchant, niceTitle } from './categorise.mjs';
import { collapseWs, dayNum, pyStrip } from './pycompat.mjs';

export const GRACE_DAYS = 5;
const KEEP_RELEASED_DAYS = 45;
const NEAR_BEFORE = 2, NEAR_AFTER = 14;   // days a settled row's date may be from the pending one's
const DAY = 86400000;
const KEY_RE = /^[0-9a-f]{12}$/;

export const pendingFile = (dir) => join(dir, '_system', 'pending.json');
export const ledgerFile = (dir) => join(dir, '_system', 'pending-ledger.json');
export const countingFile = (dir) => join(dir, '_system', 'pending-choices.json');

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const objOf = (v) => (isObj(v) ? v : {});
const pence = (a) => Math.round(Number(a) * 100);
const idKey = (acct, id) => `${acct}|${id}`;

export function cleanLedger(v) {
  const o = objOf(v);
  return { v: 1, open: objOf(o.open), settled: objOf(o.settled), released: objOf(o.released), seen: objOf(o.seen), ids: objOf(o.ids) };
}
export async function readLedger(dir) { return cleanLedger(await readJson(ledgerFile(dir), { fallback: null }).catch(() => null)); }

// ─── Settings > Money and "Don't count this" ────────────────────────────────
export function cleanCounting(v) {
  const o = objOf(v), off = {};
  for (const [k, at] of Object.entries(objOf(o.off))) if (KEY_RE.test(k)) off[k] = typeof at === 'string' ? at.slice(0, 40) : '';
  return { v: 1, countPending: o.countPending !== false, off };
}
export async function readCounting(dir) { return cleanCounting(await readJson(countingFile(dir), { fallback: null }).catch(() => null)); }
/** fn(choices) changes them, under the file's lock. -> the choices. */
export function updateCounting(dir, fn) {
  const f = countingFile(dir);
  return withLock(f, async () => {
    const c = cleanCounting(await readJson(f, { fallback: null }).catch(() => null));
    await fn(c);
    await writeJson(f, c, { trailingNewline: true });
    return c;
  });
}
export const isTxKey = (k) => typeof k === 'string' && KEY_RE.test(k);

// ─── Keys ───────────────────────────────────────────────────────────────────
/** The txKey of a pending payment, in the shape lib/expenses.mjs txKeyOf gives a row. Made once: it does not follow the amount. */
export const pendingTxKey = (e) => `${e.d}|${Number(e.a).toFixed(2)}|${e.acct == null ? '' : e.acct}|${String(e.memo == null ? '' : e.memo).slice(0, 140).toUpperCase()}`.slice(0, 300);
const keyOf = (r, n = 0) => createHash('sha1').update(`pending|${r.acct}|${r.id || `${r.d}|${r.a}|${String(r.memo).toUpperCase()}`}|${n}`, 'utf8').digest('hex').slice(0, 12);
/** An id that does not survive a change of amount: none, or Enable Banking's hash of the row. */
const softId = (id) => !id || /:h[0-9a-f]{6,}$/.test(String(id));
/** The store's key for a settled row, as it will be once the bank-sync CSV is imported. */
export const settledRowKey = (acct, row) => rowKeyStr({ date: row.date, amount: row.pence / 100, account: String(acct), memo: pyStrip(collapseWs(String(row.memo == null ? '' : row.memo))) });
/** When a stored row reached this computer: the stamp in its file's name ('bank-sync-20261031-120055...', 'upload-...'). 0: not known. */
export function importedAt(source) {
  const m = /^(?:bank-sync|upload)-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/.exec(String(source || ''));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : 0;
}

// ─── Is it the same payment? ────────────────────────────────────────────────
const NOISE = new Set(['CARD', 'PAYMENT', 'PAYMENTS', 'PAYPAL', 'PP', 'SQ', 'SUMUP', 'ZETTLE', 'IZETTLE', 'IZ', 'ZTL', 'SP', 'TST', 'POS', 'VISA', 'DEBIT', 'CREDIT', 'CONTACTLESS', 'PENDING', 'AUTH', 'AUTHORISED', 'AUTHORIZED', 'PREAUTH', 'PRE', 'HOLD', 'PURCHASE', 'THE', 'LTD', 'LIMITED', 'PLC', 'UK', 'GB', 'GBR', 'WWW', 'COM', 'CO', 'ON', 'AT', 'IN', 'OF', 'AND']);
const words = (memo) => cleanMerchant(memo).toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !NOISE.has(w) && !/^\d+$/.test(w));
/** How alike two bank wordings are: 1 the same shop, 0 nothing in common. */
export function sameShop(a, b) {
  const A = words(a), B = words(b);
  if (!A.length || !B.length) return 0;
  const sa = A.join(''), sb = B.join('');
  if (sa === sb) return 1;
  if (sa.length >= 4 && sb.length >= 4 && (sa.includes(sb) || sb.includes(sa))) return 0.85;
  const near = (x, y) => x === y || (x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x)));
  const hit = A.filter(x => B.some(y => near(x, y))).length;
  const dice = (2 * hit) / (A.length + B.length);
  return A[0] === B[0] && A[0].length >= 3 ? Math.max(dice, 0.6) : dice;
}
/**
 * How likely a row is this payment. 0: it is not. The exact amount is the strongest sign; a changed amount needs the name too,
 * and a very different one (a fuel pre-auth, a hotel hold) needs the same shop.
 */
export function matchScore(e, memo, amountPence, dayGap) {
  if (dayGap < -NEAR_BEFORE || dayGap > NEAR_AFTER) return 0;
  const was = pence(e.a);
  if (!was || !amountPence || (was < 0) !== (amountPence < 0)) return 0;
  const sim = sameShop(e.memo, memo);
  const close = 1 - Math.abs(dayGap) / (NEAR_AFTER + 1);
  if (was === amountPence) return sim >= 0.3 || (dayGap >= -1 && dayGap <= 5) ? 3 + sim + close : 0;
  const ratio = Math.abs(amountPence) / Math.abs(was);
  if (ratio >= 0.5 && ratio <= 1.5 && sim >= 0.5) return 2 + sim + close - Math.abs(1 - ratio);
  return sim >= 0.8 ? 1 + sim + close : 0;
}

// ─── Reading a complete list ────────────────────────────────────────────────
function cleanRow(sourceId, r) {
  if (!isObj(r) || typeof r.acct !== 'string' || !r.acct || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.d)) || !Number.isFinite(Number(r.a)) || !Number(r.a)) return null;
  return { src: sourceId, id: r.id != null ? String(r.id).slice(0, 120) : null, acct: r.acct, d: r.d, a: Math.round(Number(r.a) * 100) / 100, memo: String(r.memo == null ? '' : r.memo).slice(0, 200) || '(no description)',
    ...(typeof r.bc === 'string' && r.bc ? { bc: r.bc } : {}), ...(typeof r.sub === 'string' && r.sub ? { sub: r.sub } : {}), ...(isObj(r.place) ? { place: r.place } : {}) };
}
function takeRow(e, row, last) {
  e.id = row.id || e.id; e.d = row.d; e.a = row.a; e.memo = row.memo; e.last = last;
  for (const k of ['bc', 'sub', 'place']) { if (row[k] !== undefined) e[k] = row[k]; else delete e[k]; }
  if (!e.as.includes(row.a)) e.as = [...e.as, row.a].slice(-6);
  delete e.gone;
}
function readList(L, sourceId, listing, { nowIso, fresh, skipGone }) {
  // The first time ever (the file was written before this ledger existed): what it listed is only as new as the fetch.
  const last = fresh && listing.fetchedAt ? String(listing.fetchedAt) : nowIso;
  const rows = (Array.isArray(listing.rows) ? listing.rows : []).map(r => cleanRow(sourceId, r)).filter(Boolean);
  const mine = Object.values(L.open).filter(e => e.src === sourceId);
  const met = new Set(), todo = [];
  const settledBy = new Map(Object.entries(L.settled).map(([nk, d]) => [d.k, nk]));
  for (const row of rows) {
    if (row.id && L.ids[idKey(row.acct, row.id)]) continue;   // its settled row has been seen: step 1 below takes it
    const e = row.id ? mine.find(x => !met.has(x) && x.acct === row.acct && x.id === row.id) : null;
    if (e) { takeRow(e, row, last); met.add(e); } else todo.push(row);
  }
  const used = new Set(mine.map(e => e.k));
  const fresh2 = [];
  for (const row of todo) {
    // The same wording with no id, or an id that changed with the amount: the same payment, updated.
    let n = 0, k = keyOf(row);
    const same = !row.id ? mine.find(x => !met.has(x) && x.k === k) : null;
    if (same) { takeRow(same, row, last); met.add(same); continue; }
    const like = mine.filter(x => !met.has(x) && x.acct === row.acct && (softId(x.id) || softId(row.id))).map(x => ({ x, s: matchScore(x, row.memo, pence(row.a), dayNum(row.d) - dayNum(x.d)) })).filter(c => c.s > 0).sort((p, q) => q.s - p.s)[0];
    if (like && Math.abs(dayNum(row.d) - dayNum(like.x.d)) <= 3) { takeRow(like.x, row, last); met.add(like.x); continue; }
    while (used.has(k) && !row.id) k = keyOf(row, ++n);
    used.add(k);
    fresh2.push({ row, k });
  }
  for (const { row, k } of fresh2) {
    const nk = settledBy.get(k);
    const was = nk ? L.settled[nk] : null;
    if (was && was.how === 'id') continue;                    // the bank said it settled, by its own id: that wins
    if (was) delete L.settled[nk];                            // still pending after all: the match by likeness was wrong
    const back = L.released[k];
    if (back) delete L.released[k];
    const e = { k, ...row, tk: (was && was.tk) || (back && back.tk) || pendingTxKey(row), as: [...new Set([...((was && was.as) || (back && back.as) || []), row.a])].slice(-6), first: (back && back.first) || last, last };
    L.open[k] = e;
    met.add(e);
  }
  for (const e of mine) if (!met.has(e) && !e.gone && !skipGone(e)) e.gone = nowIso;
  L.seen[sourceId] = listing.fetchedAt || nowIso;
}

// ─── Settling ───────────────────────────────────────────────────────────────
function settleOne(L, e, r, how, at, cat) {
  const d = { k: e.k, tk: e.tk, as: e.as, how, at };
  // Your category choice when the name changed: an override is by name, so the settled row would not find it.
  if (cat) { const [c, m] = cat.categorise(e.memo, cleanMerchant(e.memo), Number(e.a), e.sub || '', e.bc || null); if (m === 'override') d.c = c; }
  L.settled[r.k] = d;
  delete L.open[e.k]; delete L.released[e.k];
  if (e.id) delete L.ids[idKey(e.acct, e.id)];
}
/** frame: every stored row, with its natural key (analyse.mjs buildFrame). */
function settleAll(L, frame, { nowIso, cat, listed = new Set(), thisRun = new Set() }) {
  const taken = new Set(Object.keys(L.settled));
  const entries = [...Object.values(L.open), ...Object.values(L.released)];
  if (!entries.length) return 0;
  let n = 0;
  // 1. The bank's own id.
  const byRowKey = new Map();
  for (const e of entries) { const rk = e.id ? L.ids[idKey(e.acct, e.id)] : null; if (rk && !byRowKey.has(rk)) byRowKey.set(rk, []); }
  if (byRowKey.size) for (const r of frame) { const rk = rowKeyStr(r); if (byRowKey.has(rk) && !taken.has(r.k)) byRowKey.get(rk).push(r); }
  const left = [];
  for (const e of entries) {
    const rk = e.id ? L.ids[idKey(e.acct, e.id)] : null;
    const r = rk ? (byRowKey.get(rk) || []).find(x => !taken.has(x.k)) : null;
    if (r) { settleOne(L, e, r, 'id', nowIso, cat); taken.add(r.k); n++; } else left.push(e);
  }
  // 2. Likeness, against rows that arrived after the bank last listed the payment as pending.
  const accts = new Set(left.map(e => e.acct));
  const rows = frame.filter(r => accts.has(r.account) && !taken.has(r.k));
  const pairs = [];
  for (const e of left) {
    const last = Date.parse(e.last) || 0, from = dayNum(e.d);
    for (const r of rows) {
      if (r.account !== e.acct) continue;
      const at = importedAt(r.source);
      if (!at || at <= last || (listed.has(e.k) && thisRun.has(r.source))) continue;
      const s = matchScore(e, r.memo, r.p, r.n - from);
      if (s > 0) pairs.push({ e, r, s, at });
    }
  }
  pairs.sort((p, q) => q.s - p.s || q.at - p.at);
  const met = new Set();
  for (const { e, r } of pairs) {
    if (met.has(e.k) || taken.has(r.k)) continue;
    settleOne(L, e, r, 'match', nowIso, cat);
    met.add(e.k); taken.add(r.k); n++;
  }
  return n;
}
/** Gone for the grace period with nothing settled: it was declined or released. */
function release(L, { nowMs, nowIso }) {
  let n = 0;
  for (const e of Object.values(L.open)) {
    if (!e.gone || nowMs - (Date.parse(e.gone) || nowMs) < GRACE_DAYS * DAY) continue;
    L.released[e.k] = { ...e, at: nowIso };
    delete L.open[e.k];
    n++;
  }
  for (const [k, e] of Object.entries(L.released)) if (nowMs - (Date.parse(e.at) || nowMs) > KEEP_RELEASED_DAYS * DAY) delete L.released[k];
  return n;
}

/**
 * What the bank said on this fetch about ids (always, a complete fetch or not): rows [{id, acct, date, pence, memo}] that
 * are settled. Only ids of payments still open are kept. Nothing to do: nothing is written.
 */
export async function noteSettledIds(dir, rows) {
  const list = (Array.isArray(rows) ? rows : []).filter(r => r && r.id);
  if (!list.length) return 0;
  const f = ledgerFile(dir);
  return withLock(f, async () => {
    const L = cleanLedger(await readJson(f, { fallback: null }).catch(() => null));
    const want = new Map([...Object.values(L.open), ...Object.values(L.released)].filter(e => e.id).map(e => [idKey(e.acct, e.id), e]));
    if (!want.size) return 0;
    let n = 0;
    for (const r of list) {
      const key = idKey(r.acct, String(r.id).slice(0, 120));
      if (!want.has(key)) continue;
      const rk = settledRowKey(r.acct, r);
      if (L.ids[key] !== rk) { L.ids[key] = rk; n++; }
    }
    if (n) await writeJson(f, L);
    return n;
  });
}

/**
 * One rebuild's step, under the store's lock: read the newest complete lists, settle what can settle, release what has gone.
 * frame: the stored rows (buildFrame). o: {hidden(acct) -> bool, thisRun: names of the files imported just now, now?}. -> the ledger.
 */
export async function stepLedger(dir, frame, cat, o = {}) {
  const f = ledgerFile(dir);
  const nowMs = o.now ? o.now() : Date.now();
  const nowIso = new Date(nowMs).toISOString();
  return withLock(f, async () => {
    const raw = await readJson(f, { fallback: null }).catch(() => null);
    const L = cleanLedger(raw);
    const before = JSON.stringify(L);
    const doc = await readJson(pendingFile(dir), { fallback: null }).catch(() => null);
    const skipGone = (e) => !!(o.hidden && o.hidden(e.acct));   // an account you unticked is not read, so its list says nothing
    const listed = new Set();
    for (const [id, s] of Object.entries(objOf(doc && doc.sources))) {
      if (!isObj(s) || (L.seen[id] && L.seen[id] === s.fetchedAt)) continue;
      readList(L, id, s, { nowIso, fresh: !raw, skipGone });
      for (const e of Object.values(L.open)) if (e.src === id && !e.gone) listed.add(e.k);
    }
    settleAll(L, frame, { nowIso, cat, listed, thisRun: o.thisRun });
    release(L, { nowMs, nowIso });
    if (JSON.stringify(L) !== before) await writeJson(f, L);
    return L;
  });
}

// ─── Into the numbers ───────────────────────────────────────────────────────
/**
 * The rows the analysis counts. Settled rows take on the identity of the pending payment they were; open payments join in
 * as normal rows (rules, your choices, transfers and the card rules all treat them alike). What does not count goes in
 * `uncounted`: every part of the app reads only the counted rows, so it cannot reach a total anywhere.
 * c: readCounting. live(src): the source is still connected and on. -> {all, uncounted}
 */
export function mergePending(frame, L, c, cat, { today, live = () => true } = {}) {
  for (const r of frame) {
    const d = L.settled[r.k];
    if (!d) continue;
    r.nk = r.k; r.k = d.k; r.tk = d.tk; r.pas = d.as;
    if (d.c && r.match !== 'override' && r.category !== d.c) {
      r.category = d.c; r.match = 'carried';
      const out = cat.exclude.has(d.c);
      r.spend = out ? 0 : -r.amount; r.sp = out ? 0 : -r.p;
    }
  }
  const rows = [];
  for (const e of Object.values(L.open)) {
    if (!live(e.src)) continue;
    const date = today && e.d > today ? today : e.d;   // a bank's pending date can be odd
    const r = frameRow({ date, amount: e.a, account: e.acct, subcategory: e.sub || '', memo: e.memo, source: 'pending' }, e.k, cat, e.bc || null, e.place || null);
    r.pe = 1; r.tk = e.tk; r.pas = e.as;
    rows.push(r);
  }
  const keep = [], uncounted = [];
  if (c.countPending) for (const r of rows) keep.push(r); else uncounted.push(...rows);
  const all = [...frame, ...keep].map((r, i) => [r, i]).sort((a, b) => a[0].n - b[0].n || a[1] - b[1]).map(x => x[0]);
  const counted = [];
  for (const r of all) {
    if (Object.prototype.hasOwnProperty.call(c.off, r.k)) { r.off = 1; uncounted.push(r); } else counted.push(r);
  }
  for (const r of uncounted) if (r.pe && Object.prototype.hasOwnProperty.call(c.off, r.k)) r.off = 1;
  return { all: counted, uncounted };
}

/** What the page and the assistant say about them. */
export function pendingInfo(df, uncounted, c) {
  let n = 0, outP = 0, inP = 0;
  for (const r of df) {
    if (!r.pe) continue;
    n++;
    if (r.p < 0) outP -= r.p; else inP += r.p;
  }
  return { on: c.countPending, n, out: outP / 100, in: inP / 100, off: uncounted.length };
}
/**
 * Safe to spend works from the bank's balance. A bank whose balance has no pending payments in it yet (a booked balance) gets
 * b.pend: what they will still take off (or add). Monzo's and any available balance has them already (b.incPending).
 */
export function balancePending(balances, df) {
  if (!Array.isArray(balances)) return;
  for (const b of balances) {
    if (!b || b.incPending) continue;
    let p = 0;
    for (const r of df) if (r.pe && r.account === String(b.acct)) p += r.p;
    if (p) b.pend = p / 100;
  }
}
/** Payments that never settled, for lib/owed.mjs pendingNotices. */
export const goneRows = (L) => Object.values(L.released).map(e => ({ k: e.k, tk: e.tk, d: e.d, a: e.a, m: niceTitle(cleanMerchant(e.memo)), at: e.at })).slice(-100);
