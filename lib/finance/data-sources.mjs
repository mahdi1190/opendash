// lib/finance/data-sources.mjs - Your data (Money > Your data): where each stored payment
// came from and what the analysis counts. Pure rules plus the one small file they keep.
//
// HOW A PAYMENT REACHES analysis.json: a connected bank's fetch or an imported file lands in
// inbox/, runPipeline adds it to _system/transactions.csv (the store, never thinned out by
// anything here), and every rebuild picks the rows to count with countRule below. Money, the
// brief, the story, budgets, Home, expenses, get_money and sharing with friends all read that
// one analysis (or the copy published from it), so choosing here changes all of them.
//
// One "source" = one key (store.mjs dataKey): an account, or a file with no account column.
//   A connected account's tick is its own enabled flag in sources.json (the one Connections'
//   Show in Finances writes). Everything else (imported files, banks no source names any more)
//   and everything that is not a tick lives in <finance>/_system/data-choices.json:
//     {v, off: {key: 1},                  files and old banks left out of the analysis
//      until: {key: 'YYYY-MM-DD'},        counted up to and including that day
//      dup: {key: keptKey},               left out because it copies keptKey
//      gone: {key: {at, name, bank, token, disconnected}},   a connected account deleted for good:
//                                         what its bank still sends is not imported again
//      undo: {at, label, off, until, dup, accounts: [...]},  the one Undo
//      lastDelete: {token, name, at, count}}
//
//   countRule(hide, until) -> {active, counted(row), hidden(key), balanceOn(key), balanceRow(h)}
//   describeStore(rows, sources) -> Map key -> {key, bank, bankId, name, origin, sourceId, files, count, from, to}
//   markOtherAccount(df, rule, cat, words)   the transfers that lost their other half
//   dataNotes(all, df, rule, cat, desc, today)   salary or bills only seen on what was left out
//
// Logs carry counts only.

import { join } from 'node:path';
import { readJson, writeJson, withLock } from '../fsutil.mjs';
import { dataKey } from './store.mjs';
import { findRecurring } from './analyse.mjs';
import { niceTitle } from './categorise.mjs';
import { transferCategory } from './transfers.mjs';
import { dayNum } from './pycompat.mjs';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// ─── The file ───────────────────────────────────────────────────────────
export const choicesFile = (dir) => join(dir, '_system', 'data-choices.json');
export function cleanChoices(v) {
  const o = isObj(v) ? v : {};
  const until = {};
  for (const [k, d] of Object.entries(isObj(o.until) ? o.until : {})) if (typeof d === 'string' && ISO.test(d)) until[k] = d;
  const dup = {};
  for (const [k, d] of Object.entries(isObj(o.dup) ? o.dup : {})) if (typeof d === 'string' && d) dup[k] = d;
  const off = {};
  for (const k of Object.keys(isObj(o.off) ? o.off : {})) off[k] = 1;
  const gone = {};
  for (const [k, g] of Object.entries(isObj(o.gone) ? o.gone : {})) if (isObj(g)) gone[k] = g;
  return { v: 1, off, until, dup, gone, undo: isObj(o.undo) ? o.undo : null, lastDelete: isObj(o.lastDelete) ? o.lastDelete : null };
}
export async function readChoices(dir) {
  if (!dir) return cleanChoices(null);
  return cleanChoices(await readJson(choicesFile(dir), { fallback: null }).catch(() => null));
}
/** fn(choices) changes them, under the file's lock. */
export async function updateChoices(dir, fn) {
  const f = choicesFile(dir);
  return withLock(f, async () => {
    const c = cleanChoices(await readJson(f, { fallback: null }).catch(() => null));
    await fn(c);
    await writeJson(f, c, { trailingNewline: true });
    return c;
  });
}

// ─── Sources ────────────────────────────────────────────────────────────
/** A source account's key in the store. */
export const accountKey = (s, a) => (s.preset === 'aureli' || s.kind === 'csv' ? a.id : `${s.id}.${a.id}`);
/** A bank whose accounts are all unticked is not read at all. */
export const allAccountsOff = (s) => !!s && Array.isArray(s.accounts) && s.accounts.length > 0 && s.accounts.every(a => a && a.enabled === false);

// ─── What counts ────────────────────────────────────────────────────────
export function countRule(hide, until) {
  const h = new Set(Array.isArray(hide) ? hide.map(String) : []);
  const u = new Map(Object.entries(isObj(until) ? until : {}).filter(([, d]) => typeof d === 'string' && ISO.test(d)));
  const counted = (r) => {
    const k = dataKey(r);
    if (h.has(k)) return false;
    const d = u.get(k);
    return !d || String(r.date) <= d;
  };
  // A balance is today's money: an account counted only up to a date has left the totals.
  const balanceOn = (k) => !h.has(k) && !u.has(k);
  const balanceRow = (row) => {
    if (!isObj(row.accounts)) return row;
    const accounts = {};
    let total = 0;
    for (const [k, v] of Object.entries(row.accounts)) {
      if (h.has(k) || (u.has(k) && row.date > u.get(k))) continue;
      accounts[k] = v;
      if (typeof v === 'number') total += v;
    }
    return { ...row, total: Math.round(total * 100) / 100, accounts };
  };
  return { active: h.size > 0 || u.size > 0, counted, hidden: (k) => h.has(k), balanceOn, balanceRow, until: u };
}

// ─── Which bank is it ───────────────────────────────────────────────────
const BANKS = [
  ['monzo', 'Monzo', /monzo/i], ['barclays', 'Barclays', /barclay/i], ['hsbc', 'HSBC', /hsbc/i], ['lloyds', 'Lloyds', /lloyds/i], ['natwest', 'NatWest', /nat\s?west/i],
  ['santander', 'Santander', /santander/i], ['starling', 'Starling', /starling/i], ['revolut', 'Revolut', /revolut/i], ['nationwide', 'Nationwide', /nationwide/i],
  ['halifax', 'Halifax', /halifax/i], ['tsb', 'TSB', /\btsb\b/i], ['firstdirect', 'First Direct', /first\s?direct/i], ['rbs', 'Royal Bank of Scotland', /\brbs\b|royal bank of scotland/i],
  ['coop', 'Co-operative Bank', /co-?op(erative)? bank/i], ['metro', 'Metro Bank', /metro bank/i], ['chase', 'Chase', /\bchase\b/i], ['amex', 'American Express', /amex|american express/i],
  ['plasma', 'Plasma One', /plasma/i],
];
// A sort code in the account column of a bank's own export.
const SORT_CODES = [[/^20-\d\d-\d\d\b/, 'barclays'], [/^04-00-\d\d\b/, 'monzo']];
function bankOf(...texts) {
  const t = texts.filter(Boolean).join(' ');
  for (const [id, label, re] of BANKS) if (re.test(t)) return { bankId: id, bank: label };
  for (const x of texts) for (const [re, id] of SORT_CODES) if (re.test(String(x || ''))) return { bankId: id, bank: BANKS.find(b => b[0] === id)[1] };
  return null;
}
/** The name the user gave a file, without the stamp an upload was saved under. */
export const plainFile = (name) => String(name || '').replace(/^upload-\d{8}-\d{4,6}(?:-\d+)?-/, '').replace(/^.*[\\/]/, '');
const isSyncFile = (name) => /^bank-sync-/.test(String(name || ''));
const shortAccount = (k) => (/\d{5,}/.test(k) ? 'Account …' + k.replace(/^.*\./, '').replace(/\s+/g, '').slice(-4) : k.replace(/^.*\./, '').slice(0, 40));

/** Every source the store or sources.json knows, with where it came from. */
export function describeStore(rows, sources) {
  const list = (Array.isArray(sources) ? sources : []).filter(s => s && s.capability === 'bank');
  const named = new Map();
  for (const s of list) for (const a of s.accounts || []) if (a && typeof a.id === 'string') named.set(accountKey(s, a), { s, a });
  const out = new Map();
  const blank = (key) => ({ key, count: 0, from: null, to: null, files: [], syncRows: 0 });
  for (const [key] of named) out.set(key, blank(key));
  for (const r of rows || []) {
    const key = dataKey(r);
    const x = out.get(key) || out.set(key, blank(key)).get(key);
    x.count++;
    if (!x.from || r.date < x.from) x.from = r.date;
    if (!x.to || r.date > x.to) x.to = r.date;
    if (isSyncFile(r.source)) x.syncRows++;
    else if (r.source && !x.files.includes(r.source)) x.files.push(r.source);
  }
  const aureli = list.find(s => s.preset === 'aureli');
  for (const x of out.values()) {
    const n = named.get(x.key);
    const owner = n ? n.s : list.find(s => s.kind !== 'csv' && x.key.startsWith(s.id + '.')) || (aureli && x.syncRows && !x.files.length && /^[A-Za-z0-9_-]{8,64}$/.test(x.key) ? aureli : null);
    const files = x.files.map(plainFile);
    x.files = files.slice(0, 12);
    x.sourceId = owner ? owner.id : null;
    x.accountId = n ? n.a.id : null;
    x.origin = owner ? 'connected' : x.syncRows && !files.length ? 'gone' : 'file';
    const seen = owner ? bankOf(owner.provider === 'plasma' ? 'plasma' : '', owner.provider === 'monzo' ? 'monzo' : '', owner.label, n && n.a.name) : bankOf(...files, x.key);
    x.bankId = seen ? seen.bankId : owner ? 'other' : x.origin === 'file' ? 'files' : 'other';
    x.bank = seen ? seen.bank : owner ? (owner.label || 'Other banks') : x.origin === 'file' ? 'Files you imported' : 'Other banks';
    x.name = n && n.a.name ? String(n.a.name)
      : x.key.startsWith('file:') ? (files[0] || 'A file you imported')
        : x.origin === 'file' && files.length === 1 && /\d{5,}/.test(x.key) ? `${files[0]} (${shortAccount(x.key)})` : shortAccount(x.key);
    x.balanceOnly = !!(n && n.a.balanceOnly);
    x.enabled = !n || n.a.enabled !== false;
    x.hiddenReason = (n && n.a.hiddenReason) || null;
  }
  return out;
}

// ─── Transfers whose other half is left out ─────────────────────────────
/**
 * Words in the wording of a payment in that say it came from the user's own other account: the
 * names of the banks left out (entirely or after a date) and the user's full name. A connected
 * bank that was unticked sends no new rows, so a later Barclays-to-Monzo payment has no other
 * half to match. Null when there is nothing to look for.
 */
export function otherAccountWords(desc, rule, ownName) {
  const words = new Set();
  for (const x of desc.values()) {
    if ((rule.hidden(x.key) || rule.until.has(x.key)) && x.bankId !== 'files' && x.bankId !== 'other' && x.count) words.add(x.bank);
  }
  if (!words.size) return null;
  const name = String(ownName || '').trim();
  if (name.split(/\s+/).length >= 2) words.add(name);
  return new RegExp(`\\b(?:${[...words].map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i');
}
/**
 * The counted rows that are one half of a move between the user's own accounts, the other half
 * left out: they stay transfers (r.oa = 1: "Money from your other account"), never income or
 * spending. Mutates df. -> {count, in, out} (amounts in pounds).
 */
export function markOtherAccount(df, rule, cat, words) {
  const tc = transferCategory(cat.exclude);
  let count = 0, inP = 0, outP = 0;
  for (const r of df) {
    const lost = !!r.pair && !rule.counted(r.pair);
    if (lost) {
      if (r.category !== tc) continue;       // the user's own choice, or a regular payer: stays as it is
    } else {
      if (!words || r.p <= 0 || r.match === 'override' || r.match === 'rule' || r.category === tc || !words.test(String(r.memo))) continue;
      r.category = tc; r.match = 'own-transfer'; r.spend = 0; r.sp = 0;
    }
    r.oa = 1;
    count++;
    if (r.p > 0) inP += r.p; else outP -= r.p;
  }
  return { count, in: inP / 100, out: outP / 100 };
}

// ─── What was only seen on what is left out ─────────────────────────────
const NOTE_DAYS = 120, SEEN_DAYS = 60, PAY_MIN = 300;
/** -> [{kind: 'pay'|'bill', name, bank, stillOn}] the page words calmly. */
export function dataNotes(all, df, rule, cat, desc, today) {
  const t = dayNum(today);
  const left = all.filter(r => !rule.counted(r));
  if (!left.length) return [];
  const kept = [...desc.values()].find(x => x.origin === 'connected' && x.count && !rule.hidden(x.key) && !rule.until.has(x.key)) || null;
  const stillOn = kept ? kept.bank : null;
  const bankOfRow = (r) => { const x = desc.get(dataKey(r)); return x ? x.bank : 'your other account'; };
  const recentHere = new Set(df.filter(r => t - r.n <= SEEN_DAYS).map(r => r.merchant));
  const notes = [];
  // Pay: money in from one payer, more than once, lately, and not on anything still counted.
  const payers = new Map();
  for (const r of left) {
    if (r.category !== 'Income' || r.p < PAY_MIN * 100 || t - r.n > NOTE_DAYS) continue;
    (payers.get(r.merchant) || payers.set(r.merchant, []).get(r.merchant)).push(r);
  }
  const pays = [...payers.entries()].filter(([m, rs]) => rs.length >= 2 && !recentHere.has(m)).sort((a, b) => b[1].length - a[1].length || b[1][0].p - a[1][0].p);
  for (const [m, rs] of pays.slice(0, 2)) notes.push({ kind: 'pay', name: niceTitle(m), bank: bankOfRow(rs[0]), stillOn });
  // Regular bills.
  const bills = findRecurring(left, cat ? [...cat.exclude] : []);
  const hereNow = new Set(findRecurring(df, cat ? [...cat.exclude] : []).map(b => b.merchant));
  const byName = new Map(left.map(r => [niceTitle(r.merchant), r]));
  for (const b of bills) {
    if (notes.length >= 6) break;
    if (t - dayNum(b.last_seen) > NOTE_DAYS || hereNow.has(b.merchant) || recentHere.has(b.merchant.toUpperCase())) continue;
    if (stillOn && b.merchant.toUpperCase().includes(stillOn.toUpperCase())) continue;   // "To Monzo": a move, not a bill
    const r = byName.get(b.merchant);
    notes.push({ kind: 'bill', name: b.merchant, bank: r ? bankOfRow(r) : 'your other account', stillOn });
  }
  return notes;
}

/** Same payments twice: pairs of counted sources, by date and amount (overlap.mjs). */
export function overlapPairs(rows, desc, rule, findDuplicates) {
  const byKey = new Map();
  for (const r of rows) (byKey.get(dataKey(r)) || byKey.set(dataKey(r), []).get(dataKey(r))).push(r);
  const out = [], seen = new Set();
  const usable = [...byKey.keys()].filter(k => !rule.hidden(k) && !rule.until.has(k));
  const stored = [];
  for (const k of usable) for (const r of byKey.get(k)) stored.push({ account: k, date: r.date, amount: r.amount });
  for (const k of usable) {
    const fresh = byKey.get(k).map(r => ({ accountId: k, date: r.date, pence: Math.round(Number(r.amount) * 100) }));
    const to = desc.get(k) && desc.get(k).to;
    for (const d of findDuplicates(fresh, stored, { today: to, days: 60 })) {
      const pair = [d.accountId, d.duplicateOf].sort().join('|');
      if (seen.has(pair)) continue;
      seen.add(pair);
      out.push({ a: d.accountId, b: d.duplicateOf, share: d.share, rows: d.rows });
    }
  }
  return out;
}
