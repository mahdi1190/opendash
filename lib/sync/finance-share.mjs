// lib/sync/finance-share.mjs - FINANCES ON EVERY DEVICE: the published copy of
// what the Finances view and the Home money cards show, and the user's finance
// edits, shared field by field (docs/dev/MULTI_DEVICE.md "Finances on every device").
//
// PLATFORM-AGNOSTIC: no node: imports, no files, no timers. lib/finance-share.mjs
// is the Node service around it (who publishes, when, and applying the edits).
//
// WHO PUBLISHES: the device that runs the 'bank' job (lib/sync/roles.mjs, with
// lib/sync/caps.mjs): the one that reads the bank, else the one that holds the
// CSV / spreadsheet store. It writes finance-share/finance.json, role
// 'published' (lib/sync/manifest.mjs, account 'bank'); every other device
// receives it read only ("Finance from Home laptop · updated 5 min ago").
//
//   finance.json = {v: 1,
//     head: {<analysis field>: JSON text},     every field of analysis.json but
//                                              the transactions and the balance history
//     tx:   {'YYYY-MM'[~n]: Pack},             the transactions of one month (part n
//                                              when a month is very large)
//     bal:  {'YYYY-MM': BalPack},              the balance history of one month
//     meta: {at, updatedAt, by, fid, currency, lastUpdate, analysisAt, storeCount,
//            accounts, sources}}               (lastUpdate, accounts, sources: JSON text)
//   Pack    = {w: [word], r: [[k, day, m, c, a, acct, memo, how, bc, extra?]]}
//             m, c, acct, memo, how, bc are numbers into the month's own word
//             list w (-1 = none); k is the transaction's stable key; extra =
//             fields a newer pipeline adds (kept as they are), except where it
//             was paid (Spending by country, 2.16): extra.pl = [cc, city, lc,
//             la, ol] with cc, city and lc as words of w (-1 = none), la the
//             amount in lc (or null), ol 1 for an online shop. unpack turns it
//             back into the transaction's cc, city, lc, la, ol; an older copy of
//             this file keeps pl as an unknown field the page ignores.
//   BalPack = {w: [account], r: [[day, total, [account index, value, ...]]]}
//
// COMPACT ON PURPOSE (thousands of transactions): one register per month, rows
// as arrays, repeated words as numbers. A new transaction rewrites only its
// month; a recategorised merchant only the months it appears in; nothing else
// moves. Head fields are JSON text, so a category or account name is never a
// field name (model.mjs drops names that look like credentials) and each
// field changes on its own.
//
// USER EDITS go the other way, from ANY device: finance-share/edits.json, role
// 'shared', one register per entry (an account's fields one each):
//   {v: 1,
//    overrides: {<key>: {m, c, at, by}}     a merchant's category (c null = back to the rules)
//    budgets:   {<key>: {c, v, at, by}}     a category's monthly budget (absent = none)
//    plan:      {doc, at, by}               Your money plan, whole (lib/finance/money-plan.mjs)
//    tax:       {doc, at, by}               The Tax tab's document, whole (lib/finance/tax-tab.mjs); never a UTR or NI number
//    accounts:  {<key>: {k, name?, colour?, hidden?, until?}}   an account's name, colour, tick in Your data, last day counted ('' = none)
//    counting:  {<key>: {k, off, at, by}}   "Don't count this" on one payment (lib/finance/pending.mjs; k is the payment's key)
//    countPending: {on, at, by}             Settings > Money, Count pending payments}
// Keys are hashes of the merchant, category or account (a name is never a key).
// Two devices recategorising the same merchant write one register: the later
// change wins on every device (the other shows as a clash in Settings > Sync);
// different merchants both stay. The fetcher applies the edits to its own
// rules.json, budgets and account list, rebuilds and publishes again; until
// it has (it may be off), the others lay the edits over the published copy.
//
// Never a secret: no path, token or connector name goes in; a text that looks
// like a credential (model.mjs looksSecret) is blanked before it is published.

import { looksSecret, hash, stable } from './model.mjs';

export const SHARE_REL = 'finance-share/finance.json';
export const EDITS_REL = 'finance-share/edits.json';
export const SHARE_DIR = 'finance-share/';
export const SHARE_V = 1;
/** The job whose runner publishes (lib/main-computer.mjs JOBS 'bank': bank and finance updates). */
export const FINANCE_JOB = 'bank';
const PART_MAX = 180 * 1024;          // one register's value stays well under model.mjs MAX_VALUE_BYTES
const HEAD_SKIP = new Set(['transactions', 'balance_history', 'budgets', 'today']);
const TX_KNOWN = ['k', 'd', 'm', 'c', 'a', 'acct', 'memo', 'how', 'bc'];
const TX_PLACE = ['cc', 'city', 'lc', 'la', 'ol'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY = /^(\d{4}-\d{2})(?:~(\d{1,3}))?$/;
const COLOUR = /^[a-z]{2,12}$/;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : null);
const parse = (t, fb = null) => { if (typeof t !== 'string') return fb; try { return JSON.parse(t); } catch { return fb; } };

/** A copy with every string that looks like a credential blanked (a bank memo can carry anything). */
export function scrub(v, depth = 0) {
  if (depth > 30) return null;
  if (typeof v === 'string') return looksSecret(v) ? '' : v;
  if (Array.isArray(v)) return v.map(x => scrub(x, depth + 1));
  if (isObj(v)) { const o = {}; for (const k of Object.keys(v)) if (v[k] !== undefined && !looksSecret(k)) o[k] = scrub(v[k], depth + 1); return o; }
  return typeof v === 'number' && !Number.isFinite(v) ? null : v;
}

// ─── Transactions: one pack per month ──────────────────────────────────────
function packer() {
  const w = [], at = new Map();
  const word = (v) => {
    if (v == null) return -1;
    const s = String(v);
    let i = at.get(s);
    if (i === undefined) { i = w.length; w.push(s); at.set(s, i); }
    return i;
  };
  return { w, word };
}
function packRows(rows) {
  const p = packer();
  const r = rows.map((t) => {
    const row = [String(t.k || ''), Number(t.d.slice(8, 10)), p.word(t.m), p.word(t.c), Number(t.a) || 0, p.word(t.acct), p.word(t.memo), p.word(t.how), p.word(t.bc)];
    const extra = {};
    for (const k of Object.keys(t)) if (!TX_KNOWN.includes(k) && !TX_PLACE.includes(k) && t[k] !== undefined) extra[k] = t[k];
    if (t.cc || t.city || t.lc || t.ol) {
      const la = t.lc && Number.isFinite(Number(t.la)) ? Number(t.la) : null;
      extra.pl = [p.word(t.cc || null), p.word(t.city || null), p.word(t.lc && la != null ? t.lc : null), la, t.ol ? 1 : 0];
    }
    if (Object.keys(extra).length) row.push(extra);
    return row;
  });
  return { w: p.w, r };
}
const packSize = (pk) => JSON.stringify(pk).length;
/** {key: Pack} for a list of transactions (newest first, as analysis.json has them). */
export function packTransactions(list) {
  const byMonth = new Map();
  for (const t0 of Array.isArray(list) ? list : []) {
    if (!isObj(t0) || typeof t0.d !== 'string' || !ISO.test(t0.d.slice(0, 10))) continue;
    const t = scrub(t0);
    const m = t.d.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(t);
  }
  // A very large month: parts in order (halved until each is well under the register limit).
  const parts = (rows) => {
    const pk = packRows(rows);
    if (rows.length <= 1 || packSize(pk) <= PART_MAX) return [pk];
    const half = Math.ceil(rows.length / 2);
    return [...parts(rows.slice(0, half)), ...parts(rows.slice(half))];
  };
  const out = {};
  for (const [m, rows] of byMonth) parts(rows).forEach((pk, i) => { out[i === 0 ? m : `${m}~${i + 1}`] = pk; });
  return out;
}
/** The month keys in transaction order: newest month first, its parts in order. */
function monthOrder(keys) {
  return keys.map(k => ({ k, m: MONTH_KEY.exec(k) })).filter(x => x.m)
    .sort((a, b) => (a.m[1] < b.m[1] ? 1 : a.m[1] > b.m[1] ? -1 : (Number(a.m[2] || 1) - Number(b.m[2] || 1))))
    .map(x => ({ key: x.k, month: x.m[1] }));
}
export function unpackTransactions(tx) {
  const out = [];
  if (!isObj(tx)) return out;
  for (const { key, month } of monthOrder(Object.keys(tx))) {
    const pk = tx[key];
    if (!isObj(pk) || !Array.isArray(pk.w) || !Array.isArray(pk.r)) continue;
    const wd = (i) => (Number.isInteger(i) && i >= 0 && i < pk.w.length ? String(pk.w[i]) : null);
    for (const row of pk.r) {
      if (!Array.isArray(row) || row.length < 9) continue;
      const day = Number(row[1]);
      if (!Number.isInteger(day) || day < 1 || day > 31) continue;
      const t = {
        d: `${month}-${String(day).padStart(2, '0')}`, m: wd(row[2]) ?? '', c: wd(row[3]) ?? 'Uncategorised', a: Number(row[4]) || 0,
        acct: wd(row[5]) ?? '', memo: wd(row[6]) ?? '', how: wd(row[7]) ?? '', bc: wd(row[8]), k: typeof row[0] === 'string' ? row[0] : '',
      };
      if (isObj(row[9])) {
        for (const [k, v] of Object.entries(row[9])) if (k !== 'pl' && !(k in t)) t[k] = v;
        const pl = row[9].pl;
        if (Array.isArray(pl)) {
          const cc = wd(pl[0]), city = wd(pl[1]), lc = wd(pl[2]), la = Number(pl[3]);
          if (cc && /^[A-Z]{2}$/.test(cc)) t.cc = cc;
          if (city) t.city = city.slice(0, 40);
          if (lc && /^[A-Z]{3}$/.test(lc) && pl[3] != null && Number.isFinite(la) && la > 0) { t.lc = lc; t.la = la; }
          if (pl[4] === 1) t.ol = 1;
        }
      }
      out.push(t);
    }
  }
  return out;
}

// ─── Balance history: one pack per month ──────────────────────────────────
export function packBalances(hist) {
  const byMonth = new Map();
  for (const h of Array.isArray(hist) ? hist : []) {
    if (!isObj(h) || typeof h.date !== 'string' || !ISO.test(h.date) || typeof h.total !== 'number') continue;
    const m = h.date.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, { p: packer(), r: [] });
    const g = byMonth.get(m);
    const accs = [];
    for (const [k, v] of Object.entries(isObj(h.accounts) ? h.accounts : {})) if (typeof v === 'number' && Number.isFinite(v)) accs.push(g.p.word(k), v);
    g.r.push([Number(h.date.slice(8, 10)), h.total, accs]);
  }
  const out = {};
  for (const [m, g] of byMonth) out[m] = { w: g.p.w, r: g.r };
  return out;
}
export function unpackBalances(bal) {
  const out = [];
  if (!isObj(bal)) return out;
  const keys = Object.keys(bal).filter(k => /^\d{4}-\d{2}$/.test(k)).sort();
  for (const m of keys) {
    const pk = bal[m];
    if (!isObj(pk) || !Array.isArray(pk.w) || !Array.isArray(pk.r)) continue;
    for (const row of pk.r) {
      if (!Array.isArray(row) || !Number.isInteger(row[0]) || row[0] < 1 || row[0] > 31 || typeof row[1] !== 'number') continue;
      const accounts = {};
      const a = Array.isArray(row[2]) ? row[2] : [];
      for (let i = 0; i + 1 < a.length; i += 2) { const k = pk.w[a[i]]; if (typeof k === 'string' && typeof a[i + 1] === 'number') accounts[k] = a[i + 1]; }
      out.push({ date: `${m}-${String(row[0]).padStart(2, '0')}`, total: row[1], accounts });
    }
  }
  return out;
}

// ─── The published copy ────────────────────────────────────────────────────
/**
 * analysis.json and what the page needs about it -> the published document.
 * meta: {currency, lastUpdate, analysisAt, storeCount, accounts, sources, by, fid}; at: publish time (ISO).
 */
export function encodeShare({ analysis, meta = {}, at = null } = {}) {
  if (!isObj(analysis)) return null;
  const head = {};
  for (const k of Object.keys(analysis)) {
    if (HEAD_SKIP.has(k) || analysis[k] === undefined) continue;
    const text = JSON.stringify(scrub(analysis[k]));
    if (text !== undefined && text.length <= PART_MAX) head[k] = text;
  }
  const m = {
    at: str(at, 40) || null,
    updatedAt: str(meta.analysisAt, 40) || str(at, 40) || null,
    by: str(meta.by, 60) || null, fid: str(meta.fid, 64) || null,
    currency: typeof meta.currency === 'string' && /^[A-Z]{3}$/.test(meta.currency) ? meta.currency : null,
    lastUpdate: meta.lastUpdate ? JSON.stringify(scrub(meta.lastUpdate)) : null,
    analysisAt: str(meta.analysisAt, 40) || null,
    storeCount: Number.isFinite(meta.storeCount) ? meta.storeCount : null,
    accounts: Array.isArray(meta.accounts) ? JSON.stringify(scrub(meta.accounts)) : null,
    ...(isObj(meta.dataSources) ? { dataSources: JSON.stringify(scrub(meta.dataSources)) } : {}),   // Your data's list (no paths or tokens)
    sources: Array.isArray(meta.sources) ? JSON.stringify(scrub(meta.sources)) : null,
  };
  return { v: SHARE_V, head, tx: packTransactions(analysis.transactions), bal: packBalances(analysis.balance_history), meta: m };
}
/** The published document -> {analysis, meta} (meta as GET /api/finance has it, plus at/updatedAt/by), or null. */
export function decodeShare(doc) {
  if (!isObj(doc) || doc.v !== SHARE_V || !isObj(doc.head)) return null;
  const analysis = {};
  for (const [k, t] of Object.entries(doc.head)) { if (HEAD_SKIP.has(k)) continue; const v = parse(t, undefined); if (v !== undefined) analysis[k] = v; }
  analysis.transactions = unpackTransactions(doc.tx);
  const hist = unpackBalances(doc.bal);
  if (hist.length) analysis.balance_history = hist;
  if (!analysis.transactions.length && !Object.keys(doc.head).length) return null;
  const m = isObj(doc.meta) ? doc.meta : {};
  const meta = {
    at: str(m.at, 40), updatedAt: str(m.updatedAt, 40) || str(m.analysisAt, 40) || str(m.at, 40),
    by: str(m.by, 60), fid: str(m.fid, 64),
    currency: typeof m.currency === 'string' && /^[A-Z]{3}$/.test(m.currency) ? m.currency : null,
    lastUpdate: parse(m.lastUpdate, null), analysisAt: str(m.analysisAt, 40),
    storeCount: Number.isFinite(m.storeCount) ? m.storeCount : analysis.transactions.length,
    accounts: (parse(m.accounts, []) || []).filter(isObj), sources: (parse(m.sources, []) || []).filter(isObj),
    dataSources: parse(m.dataSources, null),
  };
  return { analysis, meta };
}
/** Same content (the publish time aside)? */
export function sameShare(a, b) {
  if (!isObj(a) || !isObj(b)) return false;
  const strip = (d) => ({ ...d, meta: { ...(isObj(d.meta) ? d.meta : {}), at: null } });
  return stable(strip(a)) === stable(strip(b));
}

// ─── The shared edits ──────────────────────────────────────────────────────
/** The key an edit is filed under: 'm'|'b'|'a' + a hash of the merchant (upper case), category or account. */
export function editKey(kind, name) {
  const s = kind === 'm' ? String(name).trim().toUpperCase() : String(name);
  return kind + hash(s).slice(0, 16);
}
const KEY_RE = /^[mbac][0-9a-f]{16}$/;
/** The edits file's value, checked: {v, overrides, budgets (null: never set on any device), accounts}. */
export function cleanEdits(v) {
  const o = isObj(v) ? v : {};
  const each = (m, f) => { const out = {}; if (isObj(m)) for (const [k, e] of Object.entries(m)) { if (!KEY_RE.test(k) || !isObj(e)) continue; const x = f(e); if (x) out[k] = x; } return out; };
  const when = (e) => (typeof e.at === 'string' ? e.at.slice(0, 40) : null);
  const overrides = each(o.overrides, (e) => (typeof e.m === 'string' && e.m.trim() && (e.c === null || typeof e.c === 'string')
    ? { m: e.m.slice(0, 120), c: e.c === null ? null : e.c.slice(0, 40), at: when(e), by: str(e.by, 60) } : null));
  const budgets = isObj(o.budgets) ? each(o.budgets, (e) => (typeof e.c === 'string' && e.c && (e.v === null || (typeof e.v === 'number' && Number.isFinite(e.v) && e.v >= 0 && e.v <= 1e7))
    ? { c: e.c.slice(0, 40), v: e.v === null ? null : Math.round(e.v * 100) / 100, at: when(e), by: str(e.by, 60) } : null)) : null;
  const accounts = each(o.accounts, (e) => {
    if (typeof e.k !== 'string' || !e.k || e.k.length > 160) return null;
    const x = { k: e.k };
    if (typeof e.name === 'string' && e.name.trim()) x.name = e.name.trim().slice(0, 80);
    if (typeof e.colour === 'string' && COLOUR.test(e.colour)) x.colour = e.colour;
    if (typeof e.hidden === 'boolean') x.hidden = e.hidden;
    if (typeof e.until === 'string' && (e.until === '' || ISO.test(e.until))) x.until = e.until;
    return x;
  });
  // Your money plan: one whole value, the later save wins. lib/finance/money-plan.mjs cleanPlan checks its fields on every read.
  const plan = isObj(o.plan) && isObj(o.plan.doc) && JSON.stringify(o.plan.doc).length <= 400000 ? { doc: o.plan.doc, at: when(o.plan), by: str(o.plan.by, 60) } : null;
  const tax = isObj(o.tax) && isObj(o.tax.doc) && JSON.stringify(o.tax.doc).length <= 800000 ? { doc: o.tax.doc, at: when(o.tax), by: str(o.tax.by, 60) } : null;
  const counting = each(o.counting, (e) => (typeof e.k === 'string' && /^[0-9a-f]{12}$/.test(e.k) && typeof e.off === 'boolean' ? { k: e.k, off: e.off, at: when(e), by: str(e.by, 60) } : null));
  const countPending = isObj(o.countPending) && typeof o.countPending.on === 'boolean' ? { on: o.countPending.on, at: when(o.countPending), by: str(o.countPending.by, 60) } : null;
  return { v: 1, overrides, budgets, accounts, ...(plan ? { plan } : {}), ...(tax ? { tax } : {}), counting, ...(countPending ? { countPending } : {}) };
}
/** The shared budgets as {category: amount}, or null when no device has set any through sync yet. */
export function sharedBudgets(edits) {
  const e = cleanEdits(edits);
  if (!e.budgets) return null;
  const out = {};
  for (const b of Object.values(e.budgets)) if (b.v != null) out[b.c] = b.v;
  return out;
}
/**
 * What a budgets save changes, field by field: the entries that differ between
 * what the page started from (base) and what it saves (next). A category the
 * page never had is left alone, so another device's new budget is not lost.
 * -> [{c, v|null}]
 */
export function budgetChanges(base, next) {
  const b = isObj(base) ? base : {}, n = isObj(next) ? next : {};
  const out = [];
  for (const c of new Set([...Object.keys(b), ...Object.keys(n)])) {
    const was = typeof b[c] === 'number' ? b[c] : null, now = typeof n[c] === 'number' ? n[c] : null;
    if (was !== now) out.push({ c, v: now });
  }
  return out;
}
/** Account edits by account key: Map key -> {name?, colour?, hidden?}. */
export function accountEdits(edits) {
  const out = new Map();
  for (const a of Object.values(cleanEdits(edits).accounts)) out.set(a.k, a);
  return out;
}
/** The hash of one edit entry (what the fetcher last applied, so an unchanged entry is not applied twice). */
export const entryHash = (e) => hash(stable(e)).slice(0, 16);

/** "Don't count this" and Count pending payments from any device, before the fetcher has applied them: a row moves between the two lists. */
function layCounting(analysis, e) {
  const one = new Map(Object.values(e.counting).map(x => [x.k, x.off]));
  const all = e.countPending ? e.countPending.on : null;
  if (!one.size && all === null) return analysis;
  const was = Array.isArray(analysis.uncounted) ? analysis.uncounted : [];
  // A row you marked by hand stays out whatever the setting says; the setting moves the rest of the pending ones.
  const outNow = (t, out) => (one.has(t.k) ? one.get(t.k) : t.off ? true : t.pe && all !== null ? !all : out);
  const tx = [], off = [];
  let moved = false;
  const put = (t, out) => {
    const o = outNow(t, out);
    if (o !== out) moved = true;
    if (!o) { const { off: _, ...rest } = t; tx.push(rest); } else off.push(one.get(t.k) ? { ...t, off: 1 } : t);
  };
  for (const t of analysis.transactions) put(t, false);
  for (const t of was) put(t, true);
  const on = all === null ? (analysis.pending_info ? analysis.pending_info.on : null) : all;
  if (!moved && (all === null || !analysis.pending_info || analysis.pending_info.on === all)) return analysis;
  const newest = (a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
  const info = analysis.pending_info ? { ...analysis.pending_info, on } : undefined;
  return { ...analysis, transactions: moved ? tx.sort(newest) : analysis.transactions, uncounted: moved ? off.sort(newest) : was, ...(info ? { pending_info: info } : {}) };
}
/**
 * The published analysis with the edits laid over it (the fetcher may not have
 * applied them yet): a merchant's new category on its transactions. A cleared
 * override waits for the fetcher (only its rules know the category it falls back to).
 */
export function overlay(analysis0, edits) {
  if (!isObj(analysis0) || !Array.isArray(analysis0.transactions)) return analysis0;
  const e = cleanEdits(edits);
  const analysis = layCounting(analysis0, e);
  const byMerchant = new Map();
  for (const o of Object.values(e.overrides)) if (o.c) byMerchant.set(o.m.trim().toUpperCase(), o.c);
  if (!byMerchant.size) return analysis;
  let changed = false;
  const tx = analysis.transactions.map((t) => {
    const c = t && typeof t.m === 'string' ? byMerchant.get(t.m.toUpperCase()) : null;
    if (!c || (t.c === c && t.how === 'override')) return t;
    changed = true;
    return { ...t, c, how: 'override' };
  });
  if (!changed) return analysis;
  const categories = Array.isArray(analysis.categories) ? [...analysis.categories] : [];
  for (const c of byMerchant.values()) if (!categories.includes(c)) categories.push(c);
  return { ...analysis, transactions: tx, categories };
}
