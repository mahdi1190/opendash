// lib/owed.mjs - Owed to me: money other people owe you, and money you owe them or expect back.
// You paid for bowling: split it, write down who owes what, and OpenDash watches the bank for it arriving.
//
//   <data>/expenses/owed.json          {v: 1, prefs, things, people, groups, trips, asks, offers, proposed, notes, repeats, repeatSeen, shares, inbox}
//   <data>/expenses/owed-journal.json  the last undo steps (stays on this computer)
//
// thing  {id, kind: 'split' (you paid) | 'iowe' (someone else paid) | 'expect' (a refund, a deposit, a loan...), title, total,
//         currency, date, due?, method, meIn, myShare, rounding, lines: [line], others?: [{key, amount}], payer?: person key,
//         source: {type: 'tx'|'manual'|'expense'|'mcp'|'repeat', txKey?, k?}, merchant?, tripId?, expectKind?, note?, fromExpense?, repeatId?, createdAt, receipt?: {items: [{n, p, w: [who]}], tax, tip, service, discount}, receiptRef?,
//         fx?: {cur, amount, rate (of theirs for 1 of yours), at, source: own|online|typed|bank}, myFx?}
//         Paid in another currency: total, owes and every sum stay in your own money, so the totals and the bank matching just work; line.fx says what it is in theirs.
// line   {key, owes, weight?, pct?, exact?, extra?, what?, off?: 'YYYY-MM-DD' (written off), remindedAt?, taskId?,
//         payments: [{id, amount, date, how: 'bank'|'hand', k?, txKey?, memo?, over? (kept as credit), gift?, by? (who sent it, when not this person), txa? (the whole bank payment)}]}
// person {name, pid? (their id in People), match: [UPPERCASE bank wordings you confirmed], uses, last, paysFor?: {key: times} ("Sam often pays for Alex": a hint, never acted on)}
// group  {name, keys, uses, last}    "Bowling lot"
// trip   {name, keys, createdAt}     several payments and who owes whom
// repeat {title, match: {m: merchant, near?: usual amount} | {c: category} | null, rule?: {t, ...} + amount? (a date instead of a bank payment), people: [{key, weight?, pct?, exact?, from?, until?}],
//         method, meIn, myWeight?, from, until?, paused?, planItem? (the money plan's item, whose splitWith names the people), remindDays, last?, made?, problem?, createdAt}
//         Rent and bills: each time the payment leaves the bank it becomes a thing with repeatId (runRepeats). repeatSeen {'repeatId|tx': date}
//         is never touched for Undo, so a payment undone or deleted is not split again.
//
// Bank matching is findMatches: money in against what is owed by amount, the name in the bank's wording and the date.
// It only ever suggests; nothing is marked unless the owner turned autoMark on, and then only a single exact match
// with the name in it. A bank payment is used once. What was matched leaves income and comes off the original payment
// (netPlan, applied by lib/finance/transfers.mjs applyOwedNet), unless netSpending is off.
//
// share  {id, key, friend, at, what}  one person's part, sent to that friend on the owner's press (lib/owed-friends.mjs). The key is a random ref.
// inbox  {from, ref, what, amount, cur, date, alt?, at, said?, closed?}   what a friend shared with you: untrusted text, drawn as text, never given to the assistant.
//
// PRIVACY: private, like expenses. It syncs only between the owner's own devices with end-to-end encryption
// (lib/sync/manifest.mjs); lib/friends/share.mjs never reads it. No Claude. The only thing that ever leaves is one person's own
// part of one split, to that person, on the owner's press (lib/owed-friends.mjs, which says exactly what and how).

import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readJson } from './fsutil.mjs';
import { journalledStore, expensesDir, pence, isIso, addDays, newId, payerKey, GENERIC, csvCell, subsetsSumming, expenseNet } from './expenses.mjs';

export const KINDS = Object.freeze(['split', 'iowe', 'expect']);
export const METHODS = Object.freeze(['equal', 'exact', 'shares', 'percent', 'items']);
export const EXPECT_KINDS = Object.freeze(['refund', 'deposit', 'loan', 'claim', 'other']);
export const ID_RE = /^o-[a-z0-9]{6,30}$/;
const MAX_THINGS = 5000, MAX_LINES = 60, MAX_PAYMENTS = 40, MAX_REPEATS = 100, DAY = 86400000;
export const DEFAULT_PREFS = Object.freeze({ autoMark: false, netSpending: true, offers: true, chaseTasks: false, chaseDays: 7, windowDays: 120, oldDays: 30, offerMin: 30, bankDetails: '', sendBank: false, payLink: '' });

export const owedFile = (dataDir) => join(expensesDir(dataDir), 'owed.json');
const journalFile = (dataDir) => join(expensesDir(dataDir), 'owed-journal.json');

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const money = (n) => Math.round(Number(n) * 100) / 100;
const fromP = (p) => Math.round(p) / 100;
const line = (v, n = 120) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '');
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / DAY);
const stamp = (v) => (Number.isFinite(Date.parse(String(v))) ? String(v).slice(0, 40) : new Date().toISOString());
export const personKey = (name) => payerKey(name);

// ─── The sum ────────────────────────────────────────────────────────────────
/**
 * Who owes what, in whole pence, so no penny is lost: what does not divide falls to you (`rounding`, also when you are
 * not in it: you paid, so you carry the odd pennies). Also in src/app/66-owed-0core.js (owdSplit) for the live preview.
 * people: [{key, weight?, pct?, exact?, extra?}]; o: {method, meIn, myWeight, myExtra}.
 * -> {lines: [{key, owes}], me, rounding, method} or {error: 'in plain words'}.
 */
export function computeSplit(total, people, o = {}) {
  const T = pence(total);
  if (!Number.isFinite(T) || T <= 0) return { error: 'Put in the amount first.' };
  const list = Array.isArray(people) ? people : [];
  if (!list.length) return { error: 'Add at least one person.' };
  const method = METHODS.includes(o.method) ? o.method : 'equal';
  const meIn = o.meIn !== false;
  const owes = new Map();
  let me = 0, rounding = 0;
  const num = (v, d = 0) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);
  if (method === 'equal') {
    const n = list.length + (meIn ? 1 : 0), base = Math.floor(T / n);
    for (const p of list) owes.set(p.key, base);
    rounding = T - base * n;
    me = (meIn ? base : 0) + rounding;
  } else if (method === 'shares') {
    const myW = meIn ? num(o.myWeight, 1) : 0;
    const W = list.reduce((a, p) => a + num(p.weight, 1), myW);
    if (W <= 0) return { error: 'Give someone at least one share.' };
    let sum = 0;
    for (const p of list) { const v = Math.floor(T * num(p.weight, 1) / W); owes.set(p.key, v); sum += v; }
    me = T - sum;
    rounding = me - Math.floor(T * myW / W);
  } else if (method === 'percent') {
    const pcts = list.reduce((a, p) => a + num(p.pct), 0);
    if (pcts > 100.001) return { error: `That adds up to ${Math.round(pcts * 10) / 10}%. Bring it down to 100%.` };
    if (!meIn && pcts < 99.999) return { error: `That adds up to ${Math.round(pcts * 10) / 10}%. Share out the other ${Math.round((100 - pcts) * 10) / 10}%, or turn on "I'm in it too".` };
    let sum = 0;
    for (const p of list) { const v = Math.floor(T * num(p.pct) / 100); owes.set(p.key, v); sum += v; }
    me = T - sum;
    rounding = meIn ? me - Math.floor(T * (100 - pcts) / 100) : me;
  } else if (method === 'exact') {
    let sum = 0;
    for (const p of list) { const v = pence(num(p.exact)); owes.set(p.key, v); sum += v; }
    if (sum > T) return { error: `That is ${fmt(fromP(sum - T), o.cur)} too much.` };
    me = T - sum;
    if (!meIn && me > 0) return { error: `${fmt(fromP(me), o.cur)} is not shared out yet. Add it to someone, or turn on "I'm in it too".` };
  } else {   // items: everyone's own extras first, then the rest split equally
    const extra = (p) => pence(num(p.extra));
    const E = list.reduce((a, p) => a + extra(p), pence(num(o.myExtra)));
    if (E > T) return { error: `The extras come to ${fmt(fromP(E - T), o.cur)} more than the total.` };
    const rest = T - E, n = list.length + (meIn ? 1 : 0), base = Math.floor(rest / n);
    for (const p of list) owes.set(p.key, base + extra(p));
    rounding = rest - base * n;
    me = (meIn ? base : 0) + rounding + pence(num(o.myExtra));
  }
  const lines = list.map(p => ({ key: p.key, owes: fromP(owes.get(p.key)) })).filter(l => l.owes > 0);
  if (!lines.length) return { error: 'As it stands nobody owes you anything.' };
  return { lines, me: fromP(me), rounding: fromP(rounding), method };
}
const fmt = (n, cur = 'GBP') => `${{ GBP: '£', USD: '$', EUR: '€' }[cur] || cur + ' '}${Number(n).toFixed(2)}`;
/**
 * The same sum for a payment in another currency: everyone's part is worked out in the money it was paid in, then turned into
 * yours at this payment's own rate (what really left your bank over what was charged). Odd pennies fall to you, as ever.
 */
export function computeSplitFx(total, people, o = {}, fx = null) {
  if (!fx) return computeSplit(total, people, o);
  const r = computeSplit(fx.amount, people, { ...o, cur: fx.cur });
  if (r.error) return r;
  const T = pence(total), rate = fx.amount / Number(total);
  let sum = 0;
  const lines = r.lines.map(l => { const p = Math.round(pence(l.owes) / rate); sum += p; return { key: l.key, p, fx: l.owes }; });
  if (sum > T && lines.length) { lines[0].p -= sum - T; sum = T; }
  return { lines: lines.filter(l => l.p > 0).map(l => ({ key: l.key, owes: fromP(l.p), fx: l.fx })), me: fromP(T - sum), myFx: r.me, rounding: fromP(Math.round(pence(r.rounding) / rate)), method: r.method };
}

// ─── Cleaning ───────────────────────────────────────────────────────────────
/**
 * A pay-me link the person saved (for example https://monzo.me/yourname): https only, a real host name, nothing hidden in it.
 * It only ever goes into a message the person sends themselves. -> the link, or '' when it is not one.
 */
export function cleanPayLink(v) {
  const t = typeof v === 'string' ? v.trim() : '';
  if (!t || t.length > 200 || /[\s\u0000-\u001f\u007f<>"'`\\]/.test(t) || !/^https:\/\//i.test(t)) return '';
  let u; try { u = new URL(t); } catch { return ''; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return '';
  const host = u.hostname.toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(host) || /(^|\.)(localhost|local|internal)$/.test(host)) return '';
  return u.href;
}
export function cleanPrefs(raw, base = DEFAULT_PREFS) {
  const o = { ...DEFAULT_PREFS, ...(isObj(base) ? base : {}) };
  if (!isObj(raw)) return o;
  for (const k of ['autoMark', 'netSpending', 'offers', 'chaseTasks', 'sendBank']) if (typeof raw[k] === 'boolean') o[k] = raw[k];
  const n = (v, lo, hi) => (Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi ? Math.round(Number(v)) : null);
  for (const [k, lo, hi] of [['chaseDays', 1, 120], ['windowDays', 7, 730], ['oldDays', 3, 365], ['offerMin', 0, 10000]]) { const v = n(raw[k], lo, hi); if (v != null) o[k] = v; }
  if (typeof raw.bankDetails === 'string') o.bankDetails = line(raw.bankDetails, 200);
  if (typeof raw.payLink === 'string') o.payLink = cleanPayLink(raw.payLink);
  return o;
}
function cleanPayment(p) {
  if (!isObj(p) || !(Number(p.amount) > 0) || !isIso(p.date)) return null;
  const out = { id: typeof p.id === 'string' && /^y-[a-z0-9]{6,30}$/.test(p.id) ? p.id : newId('y'), amount: money(p.amount), date: p.date, how: p.how === 'bank' ? 'bank' : 'hand' };
  if (typeof p.k === 'string' && p.k) out.k = p.k.slice(0, 40);
  if (typeof p.txKey === 'string' && p.txKey) out.txKey = p.txKey.slice(0, 300);
  const memo = line(p.memo, 140); if (memo) out.memo = memo;
  if (Number(p.over) > 0) out.over = money(p.over);
  const note = line(p.note, 200); if (note) out.note = note;
  if (typeof p.by === 'string' && p.by) out.by = p.by.slice(0, 60);   // paid by someone else: "Paid by Sam for Alex"
  if (Number(p.txa) > 0) out.txa = money(p.txa);                      // the whole bank payment this is part of
  if (Number(p.gift) > 0) out.gift = money(p.gift);                   // what was left over, and you called a gift
  return out;
}
function cleanLine(l) {
  if (!isObj(l) || typeof l.key !== 'string' || !l.key || l.key.length > 60 || !(Number(l.owes) > 0)) return null;
  const out = { key: l.key, owes: money(l.owes), payments: (Array.isArray(l.payments) ? l.payments : []).slice(0, MAX_PAYMENTS).map(cleanPayment).filter(Boolean) };
  for (const k of ['weight', 'pct', 'exact', 'extra']) if (Number(l[k]) >= 0 && l[k] !== '' && l[k] != null) out[k] = money(l[k]);
  if (Number(l.fx) > 0) out.fx = money(l.fx);
  const what = line(l.what, 80); if (what) out.what = what;
  if (isIso(l.off)) out.off = l.off;
  if (isIso(l.remindedAt)) out.remindedAt = l.remindedAt;
  if (isIso(l.nudgedAt)) out.nudgedAt = l.nudgedAt;
  if (typeof l.taskId === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(l.taskId)) out.taskId = l.taskId;
  return out;
}
/** Who had what on a receipt, as saved: names, prices in the receipt's money, and who (person keys and '_me'). -> the plan, or null. */
export function cleanReceiptPlan(v) {
  if (!isObj(v) || !Array.isArray(v.items)) return null;
  const items = v.items.slice(0, 80).map((x) => {
    if (!isObj(x) || !Number.isFinite(Number(x.p)) || Math.abs(Number(x.p)) > 1e7) return null;
    const w = [...new Set((Array.isArray(x.w) ? x.w : []).filter(k => typeof k === 'string' && k && k.length <= 60))].slice(0, MAX_LINES);
    return { n: line(x.n, 60) || 'Item', p: money(x.p), w };
  }).filter(Boolean);
  if (!items.length) return null;
  const pos = (n) => (Number(n) > 0 && Number(n) <= 1e7 ? money(n) : 0);
  return { items, tax: pos(v.tax), tip: pos(v.tip), service: pos(v.service), discount: pos(v.discount) };
}
/**
 * Share a receipt out, in whole pence of its own money: each item equally between who had it, then tax, tip and service less any
 * discount by what each person had. What does not divide falls to you when you are in it, else to whoever had most. Also in
 * src/app/66-owed-7receipt.js (owdReceiptShares) for the live preview; this is the one that counts.
 * -> {shares: {key: pounds}, total: pounds} or {error}.
 */
export function shareReceipt(plan) {
  const has = new Map();
  for (const it of plan.items) {
    if (!it.w.length) return { error: `Say who had “${it.n}”.` };
    const p = pence(it.p), base = Math.trunc(p / it.w.length);
    for (const k of it.w) has.set(k, (has.get(k) || 0) + base);
    const to = it.w.includes('_me') ? '_me' : it.w[0];
    has.set(to, has.get(to) + (p - base * it.w.length));
  }
  const sub = [...has.values()].reduce((a, x) => a + x, 0);
  if (sub <= 0) return { error: 'Add what was on the receipt.' };
  const extras = pence(plan.tax) + pence(plan.tip) + pence(plan.service) - pence(plan.discount);
  const shares = new Map(); let given = 0;
  for (const [k, v] of has) { const x = Math.trunc(extras * v / sub); shares.set(k, v + x); given += x; }
  const to = has.has('_me') ? '_me' : [...has.entries()].sort((a, b) => b[1] - a[1])[0][0];
  shares.set(to, shares.get(to) + extras - given);
  if ([...shares.values()].some(v => v < 0)) return { error: 'That leaves someone owing less than nothing. Check the discount.' };
  return { shares: Object.fromEntries([...shares].map(([k, v]) => [k, fromP(v)])), total: fromP(sub + extras) };
}
/** What a payment in another currency was: {cur, amount, rate, at, source}, or null. */
export function cleanFx(v, home = 'GBP') {
  if (!isObj(v)) return null;
  const c = String(v.cur || '').toUpperCase(), amount = Number(v.amount), rate = Number(v.rate);
  if (!/^[A-Z]{3}$/.test(c) || c === home || !(amount > 0) || amount > 1e9 || !(rate > 0) || rate > 1e6) return null;
  return { cur: c, amount: money(amount), rate: Math.round(rate * 1e5) / 1e5, at: isIso(v.at) ? v.at : '', source: ['own', 'online', 'typed', 'bank'].includes(v.source) ? v.source : 'typed' };
}
export function cleanThing(raw, { home = 'GBP', today = null } = {}) {
  if (!isObj(raw)) return null;
  const title = line(raw.title, 140), total = Number(raw.total);
  if (!title || !Number.isFinite(total) || total <= 0 || total > 1e7) return null;
  const date = isIso(raw.date) ? raw.date : (isIso(today) ? today : null);
  if (!date) return null;
  const lines = (Array.isArray(raw.lines) ? raw.lines : []).slice(0, MAX_LINES).map(cleanLine).filter(Boolean);
  if (!lines.length) return null;
  const cur = String(raw.currency || home).toUpperCase();
  const out = { id: typeof raw.id === 'string' && ID_RE.test(raw.id) ? raw.id : null, kind: KINDS.includes(raw.kind) ? raw.kind : 'split', title, total: money(total), currency: /^[A-Z]{3}$/.test(cur) ? cur : home, date,
    method: METHODS.includes(raw.method) ? raw.method : 'equal', meIn: raw.meIn !== false, myShare: Number(raw.myShare) >= 0 ? money(raw.myShare) : 0, rounding: Number(raw.rounding) >= 0 ? money(raw.rounding) : 0, lines };
  if (Number(raw.myWeight) >= 0 && raw.myWeight != null && raw.myWeight !== '') out.myWeight = money(raw.myWeight);
  if (Number(raw.myExtra) > 0) out.myExtra = money(raw.myExtra);
  if (isIso(raw.due)) out.due = raw.due;
  const src = isObj(raw.source) ? raw.source : {};
  out.source = { type: ['tx', 'manual', 'expense', 'mcp', 'repeat'].includes(src.type) ? src.type : 'manual' };
  if (typeof src.txKey === 'string' && src.txKey) out.source.txKey = src.txKey.slice(0, 300);
  if (typeof src.k === 'string' && src.k) out.source.k = src.k.slice(0, 40);
  const merchant = line(raw.merchant, 60); if (merchant) out.merchant = merchant;
  if (typeof raw.tripId === 'string' && ID_RE.test(raw.tripId)) out.tripId = raw.tripId;
  if (EXPECT_KINDS.includes(raw.expectKind)) out.expectKind = raw.expectKind;
  const note = line(raw.note, 600); if (note) out.note = note;
  if (typeof raw.payer === 'string' && raw.payer) out.payer = raw.payer.slice(0, 60);
  if (Array.isArray(raw.others)) { const o2 = raw.others.slice(0, MAX_LINES).filter(x => isObj(x) && typeof x.key === 'string' && Number(x.amount) > 0).map(x => ({ key: x.key.slice(0, 60), amount: money(x.amount) })); if (o2.length) out.others = o2; }
  if (isObj(raw.fromExpense) && JSON.stringify(raw.fromExpense).length < 6000) out.fromExpense = raw.fromExpense;
  if (typeof raw.repeatId === 'string' && ID_RE.test(raw.repeatId)) out.repeatId = raw.repeatId;
  const fx = cleanFx(raw.fx, home);
  if (fx) { out.fx = fx; if (Number(raw.myFx) >= 0 && raw.myFx != null) out.myFx = money(raw.myFx); }
  const rc = cleanReceiptPlan(raw.receipt); if (rc) out.receipt = rc;
  if (typeof raw.receiptRef === 'string' && /^rc-[a-f0-9]{16}\.(pdf|png|jpg|webp|gif)$/.test(raw.receiptRef)) out.receiptRef = raw.receiptRef;
  out.createdAt = stamp(raw.createdAt);
  return out;
}
export function cleanPerson(raw, prev = null) {
  if (!isObj(raw)) return null;
  const name = line(own(raw, 'name') ? raw.name : prev && prev.name, 80);
  if (!name || !personKey(name)) return null;
  const m = Array.isArray(raw.match) ? raw.match : prev && Array.isArray(prev.match) ? prev.match : [];
  const out = { name, match: [...new Set(m.map(x => line(String(x), 60).toUpperCase()).filter(x => x.length >= 3))].slice(-8), uses: Math.max(0, Math.round(Number(own(raw, 'uses') ? raw.uses : prev && prev.uses) || 0)), last: '' };
  const pid = own(raw, 'pid') ? raw.pid : prev && prev.pid;
  if (typeof pid === 'string' && pid) out.pid = pid.slice(0, 80);
  const last = own(raw, 'last') ? raw.last : prev && prev.last;
  if (isIso(last)) out.last = last;
  // "Sam often pays for Alex": only ever a hint, in the picker and in a suggestion's wording.
  const pf = own(raw, 'paysFor') ? raw.paysFor : prev && prev.paysFor;
  if (isObj(pf)) { const o = {}; for (const [k, n] of Object.entries(pf).slice(0, 30)) if (typeof k === 'string' && k && Number(n) > 0) o[k.slice(0, 60)] = Math.round(Number(n)); if (Object.keys(o).length) out.paysFor = o; }
  return out;
}
function cleanGroup(g) {
  if (!isObj(g)) return null;
  const name = line(g.name, 60), keys = [...new Set((Array.isArray(g.keys) ? g.keys : []).filter(k => typeof k === 'string' && k))].slice(0, MAX_LINES);
  if (!name || !keys.length) return null;
  return { name, keys, uses: Math.max(0, Math.round(Number(g.uses) || 0)), last: isIso(g.last) ? g.last : '' };
}
function cleanTrip(t) {
  if (!isObj(t)) return null;
  const name = line(t.name, 80); if (!name) return null;
  return { name, createdAt: stamp(t.createdAt) };
}
/** A date rule for a repeat with no bank payment behind it (the money plan's own shapes, the ones that make sense here). */
function cleanRepeatRule(r) {
  if (!isObj(r)) return null;
  const n = (v, lo, hi, d) => { const x = Math.floor(Number(v)); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  if (r.t === 'day') return { t: 'day', day: n(r.day, 1, 31, 1) };
  if (r.t === 'every' && [7, 14, 28].includes(Number(r.days)) && isIso(r.anchor)) return { t: 'every', days: Number(r.days), anchor: r.anchor };
  if (r.t === 'months' && [3, 12].includes(Number(r.every))) return { t: 'months', every: Number(r.every), month: n(r.month, 1, 12, 1), day: n(r.day, 1, 31, 1) };
  if (r.t === 'lastWorking') return { t: 'lastWorking' };
  return null;
}
export function cleanRepeat(raw) {
  if (!isObj(raw)) return null;
  const title = line(raw.title, 140);
  const people = [], seen = new Set();
  for (const p of (Array.isArray(raw.people) ? raw.people : []).slice(0, MAX_LINES)) {
    if (!isObj(p) || typeof p.key !== 'string' || !p.key || p.key.length > 60 || seen.has(p.key)) continue;
    seen.add(p.key);
    const o = { key: p.key };
    for (const k of ['weight', 'pct', 'exact']) if (p[k] != null && p[k] !== '' && Number(p[k]) >= 0) o[k] = money(p[k]);
    if (isIso(p.from)) o.from = p.from;
    if (isIso(p.until)) o.until = p.until;
    people.push(o);
  }
  if (!title || !people.length) return null;
  const m = isObj(raw.match) ? raw.match : {};
  const match = line(m.m, 120) ? { m: line(m.m, 120), ...(Number(m.near) > 0 ? { near: money(m.near) } : {}) } : line(m.c, 40) ? { c: line(m.c, 40) } : null;
  const rule = cleanRepeatRule(raw.rule);
  const out = { title, match, people, method: ['equal', 'exact', 'shares', 'percent'].includes(raw.method) ? raw.method : 'equal', meIn: raw.meIn !== false, from: isIso(raw.from) ? raw.from : '', remindDays: Number.isFinite(Number(raw.remindDays)) && raw.remindDays !== '' && raw.remindDays != null ? Math.max(0, Math.min(90, Math.round(Number(raw.remindDays)))) : 7, createdAt: stamp(raw.createdAt) };
  if (rule) out.rule = rule;
  if (Number(raw.amount) > 0) out.amount = money(raw.amount);
  if (Number(raw.myWeight) >= 0 && raw.myWeight != null && raw.myWeight !== '') out.myWeight = money(raw.myWeight);
  if (isIso(raw.until)) out.until = raw.until;
  if (raw.paused === true) out.paused = true;
  if (typeof raw.planItem === 'string' && /^[\w-]{1,40}$/.test(raw.planItem)) out.planItem = raw.planItem;
  if (isIso(raw.last)) out.last = raw.last;
  if (Number(raw.made) > 0) out.made = Math.round(Number(raw.made));
  const problem = line(raw.problem, 240); if (problem) out.problem = problem;
  return out;
}

// ─── The store ──────────────────────────────────────────────────────────────
/** What a friend shared, cleaned again whenever it is read. -> the entry, or null. */
export function cleanInboxEntry(e) {
  if (!isObj(e) || typeof e.from !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(e.from) || typeof e.ref !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(e.ref)) return null;
  const what = line(e.what, 80), amount = Number(e.amount);
  if (!what || !(amount > 0) || amount > 1e7 || !isIso(e.date) || typeof e.cur !== 'string' || !/^[A-Z]{3}$/.test(e.cur)) return null;
  const out = { from: e.from, ref: e.ref, what, amount: money(amount), cur: e.cur, date: e.date, at: Number.isFinite(Number(e.at)) ? Number(e.at) : 0 };
  if (isObj(e.alt) && Number(e.alt.amount) > 0 && Number(e.alt.amount) <= 1e7 && typeof e.alt.cur === 'string' && /^[A-Z]{3}$/.test(e.alt.cur)) out.alt = { amount: money(e.alt.amount), cur: e.alt.cur };
  if (isIso(e.said)) out.said = e.said;
  if (e.closed === 'paid' || e.closed === 'gone') out.closed = e.closed;
  return out;
}
function cleanShare(x) {
  if (!isObj(x) || typeof x.id !== 'string' || !ID_RE.test(x.id) || typeof x.key !== 'string' || !x.key || x.key.length > 60 || typeof x.friend !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(x.friend)) return null;
  return { id: x.id, key: x.key, friend: x.friend, at: stamp(x.at), what: line(x.what, 80) };
}
export function emptyStore() { return { v: 1, prefs: { ...DEFAULT_PREFS }, things: {}, people: {}, groups: {}, trips: {}, asks: {}, offers: {}, proposed: {}, notes: {}, repeats: {}, repeatSeen: {}, shares: {}, inbox: {} }; }
export function normStore(raw, { home = 'GBP' } = {}) {
  const S = emptyStore();
  if (!isObj(raw)) return S;
  S.prefs = cleanPrefs(raw.prefs);
  for (const [k, v] of Object.entries(isObj(raw.things) ? raw.things : {}).slice(0, MAX_THINGS)) { const t = cleanThing({ ...v, id: k }, { home, today: v && v.date }); if (t && t.id === k) S.things[k] = t; }
  for (const [k, v] of Object.entries(isObj(raw.people) ? raw.people : {}).slice(0, 2000)) { const p = cleanPerson(v); if (p) S.people[k] = p; }
  for (const [k, v] of Object.entries(isObj(raw.groups) ? raw.groups : {}).slice(0, 200)) { const g = cleanGroup(v); if (g) S.groups[k] = g; }
  for (const [k, v] of Object.entries(isObj(raw.trips) ? raw.trips : {}).slice(0, 500)) { const t = cleanTrip(v); if (t) S.trips[k] = t; }
  for (const key of ['asks', 'offers']) for (const [k, v] of Object.entries(isObj(raw[key]) ? raw[key] : {}).slice(0, 5000)) if (k.length <= 200 && Number.isFinite(Number(v))) S[key][k] = Number(v);
  for (const [k, v] of Object.entries(isObj(raw.proposed) ? raw.proposed : {}).slice(0, 200)) if (isObj(v) && typeof v.id === 'string' && typeof v.key === 'string' && Number(v.amount) > 0) S.proposed[k] = { id: v.id, key: v.key, amount: money(v.amount), date: isIso(v.date) ? v.date : '', note: line(v.note, 300), at: stamp(v.at), ...(v.via === 'friend' ? { via: 'friend' } : {}) };
  for (const [k, v] of Object.entries(isObj(raw.notes) ? raw.notes : {}).slice(0, 5000)) { const n = line(v, 200); if (n && k.length <= 40) S.notes[k] = n; }
  for (const [k, v] of Object.entries(isObj(raw.repeats) ? raw.repeats : {}).slice(0, MAX_REPEATS)) { const r = ID_RE.test(k) ? cleanRepeat(v) : null; if (r) S.repeats[k] = r; }
  for (const [k, v] of Object.entries(isObj(raw.repeatSeen) ? raw.repeatSeen : {}).slice(-3000)) if (k.length <= 340 && isIso(v)) S.repeatSeen[k] = v;
  for (const [k, v] of Object.entries(isObj(raw.shares) ? raw.shares : {}).slice(0, 5000)) { const x = /^[A-Za-z0-9_-]{1,64}$/.test(k) ? cleanShare(v) : null; if (x) S.shares[k] = x; }
  for (const [k, v] of Object.entries(isObj(raw.inbox) ? raw.inbox : {}).slice(0, 500)) { const e = cleanInboxEntry(v); if (e && k === `${e.from}|${e.ref}`) S.inbox[k] = e; }
  return S;
}
export async function readStore(dataDir, opts) { return normStore(await readJson(owedFile(dataDir), { fallback: null }).catch(() => null), opts); }
export const { mutate, undoChange } = journalledStore({ file: owedFile, dir: expensesDir, journal: journalFile, kinds: ['things', 'people', 'groups', 'trips', 'asks', 'offers', 'proposed', 'notes', 'repeats', 'shares', 'inbox'], norm: normStore, cleanPrefs });

// ─── Reading a line ─────────────────────────────────────────────────────────
const paidOf = (l) => money(l.payments.reduce((a, p) => a + p.amount, 0));
const leftOf = (l) => (l.off ? 0 : Math.max(0, money(l.owes - paidOf(l))));
const isOpen = (l) => leftOf(l) > 0.004;
const nameOf = (S, key) => (S.people[key] && S.people[key].name) || key;
/** Everything a bank payment has been used for, by its key. */
export function usedKeys(S) {
  const used = new Set();
  for (const t of Object.values(S.things)) for (const l of t.lines) for (const p of l.payments) { if (p.k) used.add(p.k); if (p.txKey) used.add(p.txKey); }
  return used;
}

// ─── People ─────────────────────────────────────────────────────────────────
function remember(S, touch, raw, today) {
  const name = line(raw && raw.name, 80), key = personKey(name);
  if (!key) return null;
  touch('people', key);
  const prev = S.people[key] || null;
  S.people[key] = cleanPerson({ name: prev ? prev.name : name, pid: (raw && raw.pid) || (prev && prev.pid) || undefined, uses: (prev ? prev.uses : 0) + 1, last: today || (prev && prev.last) || '' }, prev);
  return key;
}
const WORD = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
const NOT_NAMES = new Set([...GENERIC, 'FP', 'FPS', 'FPO', 'BP', 'SO', 'STO', 'DD', 'DEB', 'CR', 'BGC', 'BANK', 'PAY', 'PAID', 'MR', 'MRS', 'MS', 'MISS', 'DR', 'THANKS', 'THANK', 'YOU', 'THX', 'CHEERS', 'TA', 'FOR', 'TO', 'MONZO', 'REVOLUT', 'STARLING', 'BARCLAYS', 'HSBC', 'LLOYDS', 'NATWEST', 'SANTANDER', 'NATIONWIDE', 'HALIFAX', 'TSB', 'PAYPAL', 'NEW', 'PAYEE']);
/** The wordings to remember for a person from a payment they made: its name-like words, not the thing's own words. With three words, the pairs too: "WIZZ K ADEYEMI" may come back as "K ADEYEMI". */
export function memoPhrases(memo, avoid = '') {
  const skip = new Set(WORD(avoid));
  const t = WORD(memo).filter(w => !NOT_NAMES.has(w) && !skip.has(w) && !/\d/.test(w)).slice(0, 3);
  const all = [t.join(' ')];
  if (t.length === 3) all.push(t.slice(0, 2).join(' '), t.slice(1).join(' '));
  return all.filter(p => p.length >= 3);
}
/** How strongly a bank wording names someone. 4 you said yes to it before, 3 a full name or "J SMITH", 2 one name, 1 initials or a near miss, 0 no. */
export function nameHit(person, aliases, memo) {
  const toks = WORD(memo);
  if (!toks.length || !person) return 0;
  const hay = ` ${toks.join(' ')} `;
  for (const m of person.match || []) if (hay.includes(` ${m} `)) return 4;
  const set = new Set(toks);
  const single = new Set(toks.filter(t => t.length === 1));
  let best = 0;
  for (const name of [person.name, ...(aliases || [])]) {
    const parts = WORD(name);
    if (!parts.length) continue;
    const isAlias = name !== person.name;
    if (parts.length === 1) {
      const p = parts[0];
      if (p.length >= 2 && set.has(p)) best = Math.max(best, isAlias ? 3 : 2);
      else if (p.length >= 3 && toks.some(t => t.length >= 4 && t.startsWith(p))) best = Math.max(best, 1);
      continue;
    }
    const first = parts[0], last = parts[parts.length - 1];
    if (hay.includes(` ${parts.join(' ')} `) || (set.has(first) && set.has(last))) { best = Math.max(best, 3); continue; }
    if (set.has(last) && (single.has(first[0]) || toks.some(t => t !== last && t.length >= 3 && (t.startsWith(first.slice(0, 3)) || first.startsWith(t))))) { best = Math.max(best, 3); continue; }
    if (set.has(last) && last.length >= 3) best = Math.max(best, 2);
    else if (set.has(first) && first.length >= 3) best = Math.max(best, 2);
    else if (parts.length >= 2 && set.has(parts.map(x => x[0]).join(''))) best = Math.max(best, 1);
    else if (first.length >= 3 && toks.some(t => t.length >= 4 && t.startsWith(first))) best = Math.max(best, 1);
  }
  return best;
}
/** Aliases per person key, from People ({id, name, aliases} of the state). */
export function aliasMap(S, statePeople) {
  const out = new Map();
  const list = Array.isArray(statePeople) ? statePeople : [];
  for (const [key, p] of Object.entries(S.people)) {
    const hit = list.find(x => x && ((p.pid && x.id === p.pid) || personKey(x.name) === key));
    if (hit) out.set(key, [hit.name, ...(Array.isArray(hit.aliases) ? hit.aliases : [])].filter(a => typeof a === 'string' && a));
  }
  return out;
}

// ─── Bank matching ──────────────────────────────────────────────────────────
export const askKey = (txId, key) => 'n:' + createHash('sha1').update(`${txId}|${key}`).digest('hex').slice(0, 16);
const txIdOf = (c) => c.k || c.txKey;
const CONF = { high: 0, medium: 1, low: 2 };
/** How close a payment must be: to the penny, or within 3% for a split in another currency (the rate on their side differs). */
const nearEnough = (d, room, A) => Math.abs(room - A) <= (d.t.fx ? Math.max(1, Math.round(room * 0.03)) : 1);
function matchRun(S, txs, { kinds, dir, aliases, today, skip, minWeak = 100 }) {
  const win = (S.prefs && S.prefs.windowDays) || 120;
  const used = new Set([...usedKeys(S), ...(skip || [])]);
  const byPerson = new Map();
  for (const t of Object.values(S.things)) {
    if (!kinds.includes(t.kind)) continue;
    for (const l of t.lines) { if (!isOpen(l)) continue; const a = byPerson.get(l.key) || []; a.push({ t, l, p: pence(leftOf(l)) }); byPerson.set(l.key, a); }
  }
  for (const a of byPerson.values()) a.sort((x, y) => x.t.date.localeCompare(y.t.date));
  const taken = new Map();
  const room = (d) => d.p - (taken.get(d.t.id + '|' + d.l.key) || 0);
  const reserve = (d, p) => taken.set(d.t.id + '|' + d.l.key, (taken.get(d.t.id + '|' + d.l.key) || 0) + p);
  const inWindow = (d, date) => date >= d.t.date && date <= addDays(d.t.due && d.t.due > d.t.date ? d.t.due : d.t.date, win);
  const list = (Array.isArray(txs) ? txs : []).filter(c => c && c.amount > 0 && (c.k || c.txKey) && isIso(c.date) && !used.has(c.k) && !used.has(c.txKey)).sort((a, b) => a.date.localeCompare(b.date));
  const memoCount = new Map();
  for (const c of list) { const m = WORD(c.memo).join(' '); memoCount.set(m, (memoCount.get(m) || 0) + 1); }
  const out = [], done = new Set();
  const mk = (c, key, kind, conf, allocs, extra = {}) => ({ id: askKey(txIdOf(c), key), dir, k: c.k || '', txKey: c.txKey || '', date: c.date, amount: money(c.amount), memo: line(c.memo, 140), key, name: nameOf(S, key), kind, conf, allocs, ...(c.pe ? { pe: 1 } : {}), ...extra });
  const alloc = (d, p) => ({ id: d.t.id, key: d.l.key, amount: fromP(p), title: d.t.title });
  /**
   * Someone paying for more than themselves: the money fits their part and other people's on the things they were on,
   * or only other people's. -> {allocs, options: everyone still open on those things, everyone, hint} or null.
   */
  const coverFor = (payer, A, c) => {
    const hints = (S.people[payer] && S.people[payer].paysFor) || {};
    const things = Object.values(S.things).filter(t => t.kind === 'split' && kinds.includes(t.kind) && t.lines.some(l => l.key === payer) && inWindow({ t }, c.date)).sort((a, b) => a.date.localeCompare(b.date));
    const pool = [];
    for (const t of things) for (const l of t.lines) { const d = (byPerson.get(l.key) || []).find(x => x.t === t); if (d && room(d) > 0) pool.push(d); }
    if (!pool.some(d => d.l.key !== payer)) return null;
    const option = (d) => ({ id: d.t.id, key: d.l.key, name: nameOf(S, d.l.key), left: fromP(room(d)), title: d.t.title, own: d.l.key === payer, hint: !!hints[d.l.key] });
    const whole = things.find(t => { const on = pool.filter(d => d.t === t); return on.length > 1 && Math.abs(on.reduce((a, d) => a + room(d), 0) - A) <= 1; });
    if (whole) { const on = pool.filter(d => d.t === whole); return { allocs: on, options: on.map(option), everyone: true, title: whole.title }; }
    // own part first, then the people they have paid for before, then the oldest
    const order = [...pool].sort((a, b) => (b.l.key === payer) - (a.l.key === payer) || (hints[b.l.key] || 0) - (hints[a.l.key] || 0));
    const subs = subsetsSumming(order.map(d => ({ d, p: room(d) })), A, 6, 14).map(s => s.map(x => x.d)).filter(s => s.some(d => d.l.key !== payer));
    if (!subs.length) return null;
    const score = (s) => s.filter(d => d.l.key === payer).length * 10 + s.reduce((a, d) => a + (hints[d.l.key] ? 3 : 0), 0) - s.length;
    const pick = subs.reduce((best, s) => (score(s) > score(best) ? s : best), subs[0]);
    const on = pool.filter(d => pick.some(x => x.t === d.t));
    return { allocs: pick, options: on.map(option), everyone: false };
  };
  // First every payment with a name in it: a named payment must not lose its debt to one with no name.
  for (const c of list) {
    const A = pence(c.amount), hay = `${c.memo || ''} ${c.merchant || ''}`, id = txIdOf(c);
    const named = [];
    for (const key of new Set([...byPerson.keys(), ...Object.keys(S.people)])) { const s = nameHit(S.people[key] || { name: key }, aliases && aliases.get(key), hay); if (s > 0 && !S.asks[askKey(id, key)]) named.push({ key, s }); }
    named.sort((a, b) => b.s - a.s);
    // "M HART" with a Max and a Mia Hart both owing this much: the bank cannot say which, so ask. Their answer is not learnt as a wording.
    const tied = named.filter(n => n.s >= 2 && n.s === named[0].s).map(n => ({ key: n.key, d: (byPerson.get(n.key) || []).find(d => room(d) > 0 && inWindow(d, c.date) && nearEnough(d, room(d), A)) })).filter(x => x.d);
    if (tied.length > 1) {
      out.push(mk(c, tied[0].key, 'same', 'medium', [alloc(tied[0].d, room(tied[0].d))], { why: 'the name in the bank wording fits more than one person', tied: 1, alts: tied.map(x => ({ key: x.key, name: nameOf(S, x.key), allocs: [alloc(x.d, room(x.d))] })) }));
      done.add(c); continue;
    }
    for (const { key, s } of named) {
      const debts = (byPerson.get(key) || []).filter(d => room(d) > 0 && inWindow(d, c.date));
      const total = debts.reduce((a, d) => a + room(d), 0);
      const why = s === 4 ? 'you said yes to this wording before' : s >= 2 ? 'the name is in the bank wording' : 'it looks like their initials';
      const one = debts.find(d => nearEnough(d, room(d), A));
      let sug = null;
      if (one) { const penny = Math.abs(room(one) - A) <= 1; sug = mk(c, key, penny ? 'exact' : 'part', penny && s >= 2 ? 'high' : 'medium', [alloc(one, room(one))], { why: penny ? why : 'the name is in the bank wording, and it is close to the amount' }); reserve(one, room(one)); }
      else if (debts.length && Math.abs(total - A) <= 1) { sug = mk(c, key, 'several', 'medium', debts.map(d => alloc(d, room(d))), { why }); debts.forEach(d => reserve(d, room(d))); }
      else {
        const subs = A < total && debts.length > 1 ? subsetsSumming(debts.map(d => ({ d, p: room(d) })), A, 6, 14) : [];
        const cover = !subs.length && dir === 'in' ? coverFor(key, A, c) : null;
        if (subs.length) { const pick = subs[0].map(x => x.d); sug = mk(c, key, 'several', 'medium', pick.map(d => alloc(d, room(d))), { why }); pick.forEach(d => reserve(d, room(d))); }
        else if (cover) {
          const hinted = cover.allocs.find(d => d.l.key !== key && S.people[key] && S.people[key].paysFor && S.people[key].paysFor[d.l.key]);
          sug = mk(c, key, 'cover', 'medium', cover.allocs.map(d => alloc(d, room(d))), { why: hinted ? `${nameOf(S, key)} has paid for ${nameOf(S, hinted.l.key)} before` : why, options: cover.options, everyone: cover.everyone, title: cover.title, ...(debts.length ? {} : { ownDone: 1 }) });
          cover.allocs.forEach(d => reserve(d, room(d)));
        }
        else if (!debts.length) continue;
        else if (A > total) { sug = mk(c, key, 'over', 'medium', debts.map(d => alloc(d, room(d))), { why, over: fromP(A - total) }); debts.forEach(d => reserve(d, room(d))); }
        else {   // part: the oldest first
          let left = A; const al = [];
          for (const d of debts) { if (left <= 0) break; const p = Math.min(left, room(d)); al.push(alloc(d, p)); reserve(d, p); left -= p; }
          sug = mk(c, key, 'part', 'medium', al, { why });
        }
      }
      out.push(sug); done.add(c); break;
    }
  }
  // Then the rest: the exact amount only, always a question, never at the top.
  for (const c of list) {
    if (done.has(c)) continue;
    const A = pence(c.amount), id = txIdOf(c);
    if (A < minWeak || memoCount.get(WORD(c.memo).join(' ')) >= 3) continue;   // a regular payer is not a friend paying back
    const hay = `${c.memo || ''} ${c.merchant || ''}`;
    if (Object.entries(S.people).some(([key, p]) => nameHit(p, aliases && aliases.get(key), hay) >= 2)) continue;   // it names someone else: not a stranger's money to guess about
    const cands = [];
    for (const [key, ds] of byPerson) {
      if (S.asks[askKey(id, key)]) continue;
      const d = ds.find(x => room(x) > 0 && inWindow(x, c.date) && nearEnough(x, room(x), A));
      if (d) cands.push({ key, d });
    }
    if (!cands.length) continue;
    const titled = cands.find(x => WORD(x.d.t.title).some(w => w.length >= 4 && WORD(hay).includes(w)));
    const first = titled || cands[0];
    const s = mk(c, first.key, cands.length > 1 && !titled ? 'same' : 'maybe', 'low', [alloc(first.d, room(first.d))], { why: titled ? 'the amount matches and the wording mentions it' : 'only the amount matches' });
    if (cands.length > 1 && !titled) s.alts = cands.map(x => ({ key: x.key, name: nameOf(S, x.key), allocs: [alloc(x.d, room(x.d))] }));
    else reserve(first.d, room(first.d));
    out.push(s);
  }
  return out;
}
/**
 * What the bank suggests. credits: money in [{k, txKey, date, amount, memo, merchant}]; debits: money out, the same with
 * amount > 0. -> suggestions, the surest first. Each: {id, dir, k, txKey, date, amount, memo, key, name, kind, conf, allocs,
 * why, over?, alts?}. kind: exact | several (one payment for several things) | part | over | maybe | same (several people could be it).
 */
export function findMatches(S, credits, { debits = [], today, aliases = null, skip = null } = {}) {
  // Money in that is a payment already marked by hand is not a new payment to ask about (scan links it).
  const handTx = handLinks(S, credits, { aliases, skip }).flatMap(x => [x.tx.k, x.tx.txKey].filter(Boolean));
  const sug = [...matchRun(S, credits, { kinds: ['split', 'expect'], dir: 'in', aliases, today, skip: [...(skip || []), ...handTx] }), ...matchRun(S, debits, { kinds: ['iowe'], dir: 'out', aliases, today, skip, minWeak: Infinity })];
  sug.sort((a, b) => CONF[a.conf] - CONF[b.conf] || b.date.localeCompare(a.date));
  if (sug[0] && sug[0].conf === 'high') sug[0].top = true;
  return sug;
}
/**
 * You marked someone paid by hand, then the bank shows it: the same person (their name in the wording), the same money, within
 * two weeks of the mark. It is that payment, not a second one. -> [{tx, id, key, payId}], each payment and each bank row used once.
 */
export function handLinks(S, credits, { aliases = null, skip = null } = {}) {
  const used = new Set([...usedKeys(S), ...(skip || [])]);
  const list = (Array.isArray(credits) ? credits : []).filter(c => c && c.amount > 0 && (c.k || c.txKey) && isIso(c.date) && !used.has(c.k) && !used.has(c.txKey)).sort((a, b) => a.date.localeCompare(b.date));
  const out = [], claimed = new Set();
  for (const t of Object.values(S.things)) {
    if (t.kind === 'iowe') continue;
    for (const l of t.lines) for (const p of l.payments) {
      if (p.how === 'bank' || !isIso(p.date)) continue;
      const c = list.find(x => !claimed.has(x) && x.date >= t.date && x.date >= addDays(p.date, -14) && x.date <= addDays(p.date, 14) && Math.abs(pence(x.amount) - pence(p.amount)) <= 1 && nameHit(S.people[l.key] || { name: l.key }, aliases && aliases.get(l.key), `${x.memo || ''} ${x.merchant || ''}`) >= 2);
      if (!c) continue;
      claimed.add(c);
      out.push({ tx: c, id: t.id, key: l.key, payId: p.id });
    }
  }
  return out;
}
/** Money out from an analysis (the same shape as creditsFromAnalysis in lib/expenses.mjs). */
export function debitsFromAnalysis(analysis, { today, days = 180 } = {}) {
  const tx = analysis && Array.isArray(analysis.transactions) ? analysis.transactions : [];
  const from = isIso(today) ? addDays(today, -days) : '';
  const out = [];
  for (const t of tx) {
    if (!t || !(Number(t.a) < 0) || !isIso(t.d) || (from && t.d < from)) continue;
    out.push({ txKey: txKeyFrom(t), k: typeof t.k === 'string' ? t.k : '', date: t.d, amount: -Number(t.a), memo: String(t.memo || ''), merchant: String(t.m || ''), cat: String(t.c || ''), ...(t.pe ? { pe: 1 } : {}) });
    if (out.length >= 800) break;
  }
  return out;
}
const txKeyFrom = (t) => (typeof t.tk === 'string' && t.tk ? t.tk : `${t.d}|${Number(t.a).toFixed(2)}|${t.acct == null ? '' : t.acct}|${String(t.memo == null ? '' : t.memo).toUpperCase()}`.slice(0, 300));

const OFFER_RE = /eating|restaurant|\bbars?\b|\bpubs?\b|takeaway|entertain|activit|leisure|going out|drinks|nightlife/i;
const OFFER_WORDS = /tenpin|bowl|restaurant|pizz|nando|wagamama|\bpub\b|\bbar\b|grill|kitchen|cinema|odeon|vue|karaoke|escape|golf|laser|climb|trampoline|tapas|curry|taverna|brewery|\binn\b|\barms\b/i;
/** Recent big payments at a restaurant, bar or activity (or a place you split before): the quiet "Split this?" offers. Dismissed: never again; a place dismissed twice: learnt. */
export function findOffers(S, analysis, { today, days = 45, limit = 40, skip = null } = {}) {
  if (!S.prefs.offers) return [];
  const tx = analysis && Array.isArray(analysis.transactions) ? analysis.transactions : [];
  const ex = new Set(Array.isArray(analysis && analysis.exclude_from_spending) ? analysis.exclude_from_spending : []);
  const from = isIso(today) ? addDays(today, -days) : '';
  const have = new Set(); const places = new Set();
  for (const t of Object.values(S.things)) { if (t.source.k) have.add(t.source.k); if (t.source.txKey) have.add(t.source.txKey); if (t.merchant) places.add(t.merchant.toLowerCase()); }
  const out = [];
  for (const t of tx) {
    if (!t || !(Number(t.a) < 0) || !isIso(t.d) || (from && t.d < from) || ex.has(t.c) || -Number(t.a) < S.prefs.offerMin) continue;
    const m = String(t.m || ''), key = m.toLowerCase(), txKey = txKeyFrom(t);
    if (have.has(t.k) || have.has(txKey) || (skip && (skip.has(t.k) || skip.has(txKey))) || S.offers['tx:' + t.k] || (S.offers['m:' + key] || 0) >= 2) continue;
    if (!(places.has(key) || OFFER_RE.test(String(t.c || '')) || OFFER_WORDS.test(`${m} ${t.memo || ''}`))) continue;
    out.push({ k: t.k, txKey, d: t.d, a: Number(t.a), m, c: t.c, memo: line(t.memo, 140), ...(t.pe ? { pe: 1 } : {}) });
    if (out.length >= limit) break;
  }
  return out;
}

// ─── Spending: what the matches take off ────────────────────────────────────
/**
 * What the analysis should do about matched money in: {on, credits: {creditK: {payments: {paymentK: amount}, none: amount}}, sig}.
 * Only money in, only matched to a bank payment. sig: '' when there is nothing to do, so a rebuild is only asked for when it changes.
 */
export function netPlan(S) {
  const credits = {};
  if (S.prefs.netSpending) {
    for (const t of Object.values(S.things)) {
      if (t.kind === 'iowe') continue;
      for (const l of t.lines) for (const p of l.payments) {
        if (p.how !== 'bank' || !p.k) continue;
        const c = credits[p.k] || (credits[p.k] = { payments: {}, none: 0, used: 0, over: 0, txa: 0, keep: 0, title: t.title });
        if (t.source.k) c.payments[t.source.k] = money((c.payments[t.source.k] || 0) + p.amount);
        else c.none = money(c.none + p.amount);
        c.used = money(c.used + p.amount); c.over = money(c.over + (p.over || 0)); c.txa = Math.max(c.txa, p.txa || 0);
      }
    }
    // What nobody was down for (a gift, or not to do with this) stays what it was. What you keep as credit does not.
    for (const c of Object.values(credits)) c.keep = c.txa ? Math.max(0, money(c.txa - c.used - c.over)) : 0;
  }
  const keys = Object.keys(credits).sort();
  const sig = keys.length ? createHash('sha1').update(JSON.stringify(keys.map(k => [k, credits[k].payments, credits[k].none, credits[k].keep]))).digest('hex').slice(0, 16) : '';
  return { on: !!S.prefs.netSpending, credits, sig };
}

/** netPlan, with expenses paid back by an employer or anyone else (lib/expenses.mjs expenseNet). The same setting turns both off. X: the expenses store. */
export function netPlanAll(S, X, home) {
  const plan = netPlan(S);
  const expenses = plan.on && X ? expenseNet(X, home) : null;
  if (!expenses || !(Object.keys(expenses.credits).length || Object.keys(expenses.outs).length)) return plan;
  return { ...plan, expenses, sig: createHash('sha1').update(JSON.stringify([plan.sig, Object.entries(expenses.credits).sort(), Object.entries(expenses.outs).sort()])).digest('hex').slice(0, 16) };
}

// ─── Totals and the page's view ─────────────────────────────────────────────
function lineView(S, t, l, today, think) {
  const paid = paidOf(l), left = leftOf(l);
  const thinks = think.get(t.id + '|' + l.key) || null;
  const status = l.off ? 'off' : left <= 0.004 ? 'paid' : thinks ? 'think' : paid > 0 ? 'part' : 'wait';
  const age = Math.max(0, daysBetween(t.date, today));
  const via = [...new Set(l.payments.map(p => p.by).filter(Boolean))].map(k => nameOf(S, k));
  return { ...l, name: nameOf(S, l.key), paid, left, status, age, old: status !== 'paid' && status !== 'off' && age >= S.prefs.oldDays, ...(thinks ? { thinks } : {}), ...(via.length ? { via } : {}) };
}
/** The trip's or event's balances and the fewest payments that settle them (you are '_me'). */
export function tripSummary(S, tripId) {
  const trip = S.trips[tripId]; if (!trip) return null;
  const things = Object.values(S.things).filter(t => t.tripId === tripId);
  const bal = new Map();
  const add = (k, p) => bal.set(k, (bal.get(k) || 0) + p);
  let total = 0;
  for (const t of things) {
    total += pence(t.total);
    if (t.kind === 'split') {
      add('_me', pence(t.total) - pence(t.myShare));
      for (const l of t.lines) { const settled = l.off ? pence(l.owes) : pence(paidOf(l)); add(l.key, settled - pence(l.owes)); add('_me', -settled); }
    } else if (t.kind === 'iowe' && t.payer) {
      const mine = t.lines.reduce((a, l) => a + pence(l.owes), 0), others = (t.others || []).reduce((a, o) => a + pence(o.amount), 0);
      add(t.payer, mine + others);
      add('_me', -mine);
      for (const o of t.others || []) add(o.key, -pence(o.amount));
      for (const l of t.lines) { const paid = pence(paidOf(l)); add('_me', paid); add(l.key, -paid); }
    }
  }
  const name = (k) => (k === '_me' ? 'You' : nameOf(S, k));
  const ups = [], downs = [];
  for (const [k, p] of bal) { if (p > 0) ups.push({ k, p }); else if (p < 0) downs.push({ k, p: -p }); }
  ups.sort((a, b) => b.p - a.p); downs.sort((a, b) => b.p - a.p);
  const moves = [];
  for (let i = 0, j = 0; i < downs.length && j < ups.length;) {
    const p = Math.min(downs[i].p, ups[j].p);
    if (p > 0) moves.push({ from: downs[i].k, to: ups[j].k, fromName: name(downs[i].k), toName: name(ups[j].k), amount: fromP(p) });
    downs[i].p -= p; ups[j].p -= p;
    if (downs[i].p <= 0) i++;
    if (ups[j].p <= 0) j++;
  }
  return { id: tripId, name: trip.name, count: things.length, total: fromP(total), moves, balances: [...bal.entries()].map(([k, p]) => ({ key: k, name: name(k), amount: fromP(p) })).sort((a, b) => b.amount - a.amount) };
}
/** Every bank payment in use, whole: who sent it, what it went on, what was left. Newest first. */
export function transfersOf(S) {
  const all = new Map();
  for (const t of Object.values(S.things)) for (const l of t.lines) for (const p of l.payments) {
    const id = p.how === 'bank' && (p.k || p.txKey);
    if (!id) continue;
    const e = all.get(id) || { k: p.k || '', txKey: p.txKey || '', date: p.date, memo: p.memo || '', dir: t.kind === 'iowe' ? 'out' : 'in', amount: 0, used: 0, over: 0, gift: 0, by: '', lines: [] };
    e.used = money(e.used + p.amount); e.over = money(e.over + (p.over || 0)); e.gift = money(e.gift + (p.gift || 0)); e.amount = Math.max(e.amount, p.txa || 0);
    if (p.by) e.by = p.by;
    e.lines.push({ id: t.id, title: t.title, key: l.key, name: nameOf(S, l.key), amount: p.amount });
    all.set(id, e);
  }
  return [...all.values()].map(e => {
    const by = e.by || (new Set(e.lines.map(l => l.key)).size === 1 ? e.lines[0].key : '');
    const amount = e.amount || money(e.used + e.over);
    return { ...e, by, byName: by ? nameOf(S, by) : '', amount, left: Math.max(0, money(amount - e.used - e.over - e.gift)) };
  }).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 200);
}
export function publicView(S, today, suggestions = []) {
  const think = new Map();
  for (const s of suggestions) if (s.conf !== 'low') for (const a of s.allocs) think.set(a.id + '|' + a.key, { suggestion: s.id, amount: a.amount, date: s.date, memo: s.memo });
  for (const [id, p] of Object.entries(S.proposed)) if (!think.has(p.id + '|' + p.key)) think.set(p.id + '|' + p.key, { proposed: id, amount: p.amount, date: p.date, memo: p.note });
  const things = Object.values(S.things).map(t => {
    const lines = t.lines.map(l => lineView(S, t, l, today, think));
    const openL = lines.filter(l => l.status !== 'paid' && l.status !== 'off');
    const left = money(lines.reduce((a, l) => a + l.left, 0));
    const done = lines.filter(l => l.status === 'paid' || l.status === 'off').length;
    const status = !openL.length ? (lines.every(l => l.status === 'off') ? 'off' : 'paid') : lines.some(l => l.status === 'think') ? 'think' : lines.some(l => l.paid > 0 || l.status === 'paid') ? 'part' : 'wait';
    const late = t.kind === 'expect' && left > 0 && !!t.due && t.due < today;
    const back = money(lines.reduce((a, l) => a + l.payments.filter(p => p.how === 'bank').reduce((x, p) => x + p.amount, 0), 0));
    return { ...t, lines, left, done, count: lines.length, status, late, back, age: Math.max(0, daysBetween(t.date, today)) };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const persons = new Map();
  const P = (key) => { let p = persons.get(key); if (!p) { p = { key, name: nameOf(S, key), owes: 0, iowe: 0, over: 0, things: 0, oldest: '', lines: [] }; persons.set(key, p); } return p; };
  const sum = { owedToMe: 0, count: 0, iOwe: 0, iOweCount: 0, expected: 0, expectedCount: 0, think: 0, late: 0, paidBack: 0, oldest: '' };
  for (const t of things) {
    sum.paidBack = money(sum.paidBack + (t.kind === 'iowe' ? 0 : t.back));
    if (t.late) sum.late++;
    for (const l of t.lines) {
      // Paid too much: the credit is with whoever sent it. If you overpaid someone, it counts the other way.
      for (const x of l.payments) if (x.over) { const p = P(x.by || l.key); if (t.kind === 'iowe') p.overOut = money((p.overOut || 0) + x.over); else p.over = money(p.over + x.over); }
      if (l.status === 'think') sum.think++;
      if (l.left <= 0.004) continue;
      const p = P(l.key);
      if (t.kind === 'iowe') { p.iowe = money(p.iowe + l.left); sum.iOwe = money(sum.iOwe + l.left); sum.iOweCount++; }
      else {
        p.owes = money(p.owes + l.left);
        if (t.kind === 'expect') { sum.expected = money(sum.expected + l.left); sum.expectedCount++; }
        else { sum.owedToMe = money(sum.owedToMe + l.left); sum.count++; if (!sum.oldest || t.date < sum.oldest) sum.oldest = t.date; }
      }
      p.things++;
      if (!p.oldest || t.date < p.oldest) p.oldest = t.date;
      p.lines.push({ id: t.id, title: t.title, kind: t.kind, date: t.date, left: l.left, status: l.status, old: l.old, age: l.age });
    }
  }
  sum.oldestDays = sum.oldest ? Math.max(0, daysBetween(sum.oldest, today)) : 0;
  const list = [...persons.values()].filter(p => p.lines.length || p.over || p.overOut).map(p => ({ ...p, net: money(p.owes - p.iowe - p.over + (p.overOut || 0)) })).sort((a, b) => (a.oldest || '9').localeCompare(b.oldest || '9'));
  const people = Object.entries(S.people).map(([key, p]) => ({ key, ...p })).sort((a, b) => (b.last || '').localeCompare(a.last || '') || b.uses - a.uses);
  const groups = Object.entries(S.groups).map(([id, g]) => ({ id, ...g })).sort((a, b) => (b.last || '').localeCompare(a.last || ''));
  const trips = Object.keys(S.trips).map(id => tripSummary(S, id)).filter(Boolean);
  const rp = repeatsView(S, things, today);
  return { v: 1, prefs: S.prefs, things, persons: list, people, groups, trips, transfers: transfersOf(S), summary: sum, proposed: S.proposed, notes: S.notes, repeats: rp.repeats, nudges: rp.nudges, insights: insightsOf(S, today),
    shares: Object.entries(S.shares).map(([ref, x]) => ({ ref, ...x })), inbox: Object.values(S.inbox).sort((a, b) => b.date.localeCompare(a.date)) };
}

// ─── Little things worth saying ─────────────────────────────────────────────
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hintId = (s) => 'h:' + createHash('sha1').update(s).digest('hex').slice(0, 16);
/**
 * From your own splits, nothing else: what came back this month, and a few gentle notes. Each is dismissed for good, in offers.
 * -> {backMonth, backLast, hints: [{id, kind: group|fair|faster, keys, ...}]}.
 */
export function insightsOf(S, today) {
  const month = String(today).slice(0, 7), last = addDays(month + '-01', -1).slice(0, 7);
  let backMonth = 0, backLast = 0;
  const things = Object.values(S.things);
  for (const t of things) {
    if (t.kind === 'iowe') continue;
    for (const l of t.lines) for (const p of l.payments) { const m = p.date.slice(0, 7); if (m === month) backMonth += pence(p.amount); else if (m === last) backLast += pence(p.amount); }
  }
  const hints = [];
  const said = (id) => !!S.offers['tx:' + id];
  // The same people, again and again, and no group for them yet. Often on the same day of the week.
  const since = addDays(today, -90), sets = new Map();
  const havegroup = new Set(Object.values(S.groups).map(g => [...g.keys].sort().join('+')));
  for (const t of things) {
    if (t.kind !== 'split' || t.repeatId || t.date < since || !t.lines.length) continue;
    const keys = t.lines.map(l => l.key).sort(), id = keys.join('+');
    const g = sets.get(id) || { keys, n: 0, days: {} };
    g.n++; const wd = new Date(t.date + 'T12:00:00Z').getUTCDay(); g.days[wd] = (g.days[wd] || 0) + 1;
    sets.set(id, g);
  }
  const best = [...sets.entries()].filter(([id, g]) => g.n >= 3 && !havegroup.has(id)).sort((a, b) => b[1].n - a[1].n)[0];
  if (best) {
    const [id, g] = best, top = Object.entries(g.days).sort((a, b) => b[1] - a[1])[0];
    const hid = hintId('group:' + id);
    if (!said(hid)) hints.push({ id: hid, kind: 'group', keys: g.keys, count: g.n, ...(top[1] >= 3 && top[1] >= g.n * 0.6 ? { day: WEEKDAYS[Number(top[0])] } : {}) });
  }
  // You always pay. Only for people you have shared with a good few times, and only when they never have.
  const from = addDays(today, -120), you = new Map(), them = new Set();
  for (const t of things) {
    if (t.date < from) continue;
    if (t.kind === 'iowe' && t.payer) them.add(t.payer);
    if (t.kind === 'split' && !t.repeatId) for (const l of t.lines) you.set(l.key, (you.get(l.key) || 0) + 1);
  }
  const fair = [...you.entries()].filter(([k, n]) => n >= 5 && !them.has(k)).sort((a, b) => b[1] - a[1])[0];
  if (fair) { const hid = hintId('fair:' + fair[0]); if (!said(hid)) hints.push({ id: hid, kind: 'fair', keys: [fair[0]], count: fair[1] }); }
  // Someone who paid up quicker than they usually do, this week.
  const quick = new Map();
  for (const t of things) {
    if (t.kind !== 'split') continue;
    for (const l of t.lines) { if (l.off || !l.payments.length || leftOf(l) > 0.004) continue; const when = l.payments.map(p => p.date).sort().pop(), d = Math.max(0, daysBetween(t.date, when)); const a = quick.get(l.key) || []; a.push({ d, when, id: t.id }); quick.set(l.key, a); }
  }
  for (const [k, a] of quick) {
    if (a.length < 4) continue;
    a.sort((x, y) => x.when.localeCompare(y.when));
    const now = a[a.length - 1], rest = a.slice(0, -1).map(x => x.d).sort((x, y) => x - y), usual = rest[rest.length >> 1];
    if (usual >= 3 && now.d <= usual * 0.6 && daysBetween(now.when, today) <= 7) { const hid = hintId('faster:' + k + ':' + now.id); if (!said(hid)) hints.push({ id: hid, kind: 'faster', keys: [k], days: now.d, usual }); }
  }
  const order = { faster: 0, group: 1, fair: 2 };   // what only matters this week comes first
  return { backMonth: fromP(backMonth), backLast: fromP(backLast), hints: hints.sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 4) };
}
/** Make a group from a note: the same as naming one on the split screen. */
export async function saveGroup(dataDir, { name, keys }, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Make a group', (S, touch) => {
    const n = line(name, 60), id = personKey(n);
    const g = cleanGroup({ name: n, keys: (Array.isArray(keys) ? keys : []).filter(k => typeof k === 'string' && S.people[k]), uses: 0, last: today });
    if (!id || !g) return { error: 'Give the group a name.', write: false };
    touch('groups', id); S.groups[id] = g;
    return { id };
  }, { home });
}

// ─── Repeating splits: rent and bills ───────────────────────────────────────
/** The dates a rule falls on, from..to (YYYY-MM-DD): the plan's rules, without its bank holidays (only the date on the thing depends on it). */
export function ruleDates(rule, from, to) {
  if (!rule || !isIso(from) || !isIso(to) || from > to) return [];
  const out = [], last = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const iso = (y, m, d) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
  if (rule.t === 'every') {
    let n = Math.ceil(daysBetween(rule.anchor, from) / rule.days) * rule.days;
    for (let d = addDays(rule.anchor, n); d <= to && out.length < 200; n += rule.days, d = addDays(rule.anchor, n)) out.push(d);
    return out;
  }
  const [y0, m0] = from.split('-').map(Number), [y1, m1] = to.split('-').map(Number);
  for (let i = y0 * 12 + m0 - 1; i <= y1 * 12 + m1 - 1 && out.length < 200; i++) {
    const y = Math.floor(i / 12), m = i % 12;
    if (rule.t === 'months' && ((m + 1 - rule.month) % rule.every + rule.every) % rule.every !== 0) continue;
    const d = iso(y, m, rule.t === 'lastWorking' ? last(y, m) : Math.min(rule.day, last(y, m)));
    if (d >= from && d <= to) out.push(d);
  }
  return out;
}
const onDate = (p, d) => (!p.from || p.from <= d) && (!p.until || p.until >= d);
const repeatState = (r, today) => (r.paused ? 'paused' : r.until && r.until < today ? 'ended' : r.from && r.from > today ? 'later' : 'on');
function repeatsView(S, things, today) {
  const due = new Map();
  const repeats = Object.entries(S.repeats).map(([id, r]) => {
    const mine = things.filter(t => t.repeatId === id).sort((a, b) => b.date.localeCompare(a.date));
    const latest = mine[0];
    for (const t of mine) for (const l of t.lines) {
      if (!r.remindDays || l.left <= 0.004 || l.status === 'paid' || l.status === 'off' || l.age < r.remindDays) continue;
      const since = [l.remindedAt, l.nudgedAt].filter(Boolean).sort().pop();
      if (since && daysBetween(since, today) < r.remindDays) continue;
      // One nudge per person per repeat, however many payments they are behind on.
      const n = due.get(id + '|' + l.key) || { key: l.key, name: l.name, title: r.title, left: 0, age: 0, count: 0, refs: [], repeatId: id };
      n.left = money(n.left + l.left); n.age = Math.max(n.age, l.age); n.count++; n.refs.push({ id: t.id, key: l.key });
      due.set(id + '|' + l.key, n);
    }
    return { id, ...r, state: repeatState(r, today), people: r.people.map(p => ({ ...p, name: nameOf(S, p.key), now: onDate(p, today) })), count: mine.length, stillOwed: money(mine.reduce((a, t) => a + t.left, 0)),
      latest: latest ? { id: latest.id, date: latest.date, total: latest.total, lines: latest.lines.map(l => ({ key: l.key, name: l.name, owes: l.owes, left: l.left, status: l.status })) } : null };
  }).sort((a, b) => a.title.localeCompare(b.title));
  return { repeats, nudges: [...due.values()].sort((a, b) => b.age - a.age).slice(0, 12) };
}
/** Names typed in the plan's "Split with": "Sam, Alex and Jo". */
export function splitNames(text) {
  const skip = new Set(['me', 'i', 'myself']);
  return [...new Set(String(text || '').split(/,|&|\+|\/|\band\b/i).map(x => line(x, 80)).filter(x => x && personKey(x) && !skip.has(x.toLowerCase())))].slice(0, 12);
}
function repeatFromInput(S, touch, raw, today, prev) {
  const people = [];
  for (const p of (Array.isArray(raw.people) ? raw.people : []).slice(0, MAX_LINES)) {
    const key = remember(S, touch, { name: p && p.name, pid: p && p.pid }, today);
    if (key && !people.some(x => x.key === key)) people.push({ key, weight: p.weight, pct: p.pct, exact: p.exact, from: p.from, until: p.until });
  }
  return cleanRepeat({ ...(prev || {}), ...raw, people, from: isIso(raw.from) ? raw.from : (prev && prev.from) || today, createdAt: prev ? prev.createdAt : undefined });
}
/** New, or changed from now on: what was split before stays as it was. */
export async function saveRepeat(dataDir, raw, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Repeating split', (S, touch) => {
    if (!isObj(raw)) return { error: 'Say what it is.', write: false };
    if (!line(raw.title, 140)) return { error: 'Say what it is, for example Rent.', write: false };
    const id = typeof raw.id === 'string' && S.repeats[raw.id] ? raw.id : newId('o');
    if (!S.repeats[id] && Object.keys(S.repeats).length >= MAX_REPEATS) return { error: 'There are too many of these; remove an old one first.', write: false };
    const r = repeatFromInput(S, touch, raw, today, S.repeats[id] || null);
    if (!r) return { error: 'Add at least one person.', write: false };
    if (!r.match && !r.rule) return { error: 'Choose the payment it follows, or a date.', write: false };
    if (!r.match && !(r.amount > 0)) return { error: 'Put in how much it is each time.', write: false };
    if (r.until && r.until < r.from) return { error: 'The end date is before the start date.', write: false };
    delete r.problem;
    touch('repeats', id); S.repeats[id] = r;
    // Split by hand just now and asked to repeat: that one is done already.
    const seen = isObj(raw.seen) && (raw.seen.k || raw.seen.txKey);
    if (seen && isIso(raw.seen.date)) S.repeatSeen[id + '|' + String(seen).slice(0, 300)] = raw.seen.date;
    return { id, repeat: r };
  }, { home });
}
export async function removeRepeat(dataDir, id, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Stop repeating', (S, touch) => {
    if (!S.repeats[id]) return { error: 'That is gone.', write: false };
    touch('repeats', id); delete S.repeats[id];
    return { removed: 1 };
  }, { home });
}
export async function pauseRepeat(dataDir, id, paused, { home = 'GBP' } = {}) {
  return mutate(dataDir, paused ? 'Pause' : 'Carry on', (S, touch) => {
    const r = S.repeats[id]; if (!r) return { error: 'That is gone.', write: false };
    touch('repeats', id); const { paused: _, ...rest } = r; S.repeats[id] = paused ? { ...rest, paused: true } : rest;
    return {};
  }, { home });
}
/** Later: this person's nudge stays away until it is due again. Nothing is sent, and nothing else about the line changes. */
export async function nudgeLater(dataDir, refs, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Later', (S, touch) => {
    for (const { t, l } of refsOf(S, refs)) setLine(S, touch, t, l.key, { nudgedAt: today });
    return {};
  }, { home });
}
/**
 * The money plan's "Split with": the plan's rows come in, and each row with names has a repeat that follows it (its names, dates,
 * pause and matched payment). Who is on a repeat and how it is shared can also be changed on the page (the route writes the names
 * back). Taking the names off stops it; what was split stays. -> {added: [{id, title, names}]}.
 */
export async function syncPlanRepeats(dataDir, rows, { today, home = 'GBP' } = {}) {
  const list = (Array.isArray(rows) ? rows : []).filter(x => isObj(x) && x.id);
  const S0 = await readStore(dataDir, { home });
  const want = list.filter(x => splitNames(x.splitWith).length);
  if (!want.length && !Object.values(S0.repeats).some(r => r.planItem)) return { added: [] };
  const added = [];
  const r = await mutate(dataDir, 'Money plan', (S, touch) => {
    let changed = false;
    const byItem = new Map(Object.entries(S.repeats).filter(([, x]) => x.planItem).map(([id, x]) => [x.planItem, id]));
    for (const row of want) {
      const names = splitNames(row.splitWith);
      const off = row.state === 'off' || row.status === 'no';
      // A payment the person chose is followed at any amount (the plan may hold only their share of it). A guess has to look right too.
      const match = row.link && row.link.m ? { m: row.link.m, ...(row.link.by === 'guess' && !row.varies && row.amount > 0 ? { near: row.amount } : {}) } : row.link && row.link.c ? { c: row.link.c } : null;
      const rule = match ? null : cleanRepeatRule(row.rule);
      const id = byItem.get(row.id);
      if (id) {
        const cur = S.repeats[id];
        const keys = names.map(n => personKey(n));
        const people = [...cur.people.filter(p => keys.includes(p.key)), ...names.filter(n => !cur.people.some(p => p.key === personKey(n))).map(n => { const key = remember(S, touch, { name: n }, today); return key ? { key } : null; }).filter(Boolean)];
        const next = cleanRepeat({ ...cur, title: row.name || cur.title, people, match: match || (rule ? null : cur.match), rule: match ? undefined : (rule || cur.rule), amount: match ? cur.amount : (row.amount > 0 ? row.amount : cur.amount), until: row.ends || undefined, paused: row.paused || off });
        if (next && JSON.stringify(next) !== JSON.stringify(cur)) { touch('repeats', id); S.repeats[id] = next; changed = true; }
        continue;
      }
      if (off) continue;
      const nid = newId('o');
      const fresh = repeatFromInput(S, touch, { title: row.name, match, rule, amount: row.amount, people: names.map(n => ({ name: n })), method: 'equal', meIn: true, from: row.starts && row.starts > today ? row.starts : today, until: row.ends || undefined, planItem: row.id, paused: row.paused }, today, null);
      if (fresh && (fresh.match || (fresh.rule && fresh.amount > 0))) { touch('repeats', nid); S.repeats[nid] = fresh; added.push({ id: nid, title: fresh.title, names }); changed = true; }
    }
    const live = new Set(want.map(x => x.id));
    for (const [id, x] of Object.entries(S.repeats)) if (x.planItem && !live.has(x.planItem)) { touch('repeats', id); delete S.repeats[id]; changed = true; }
    return changed ? {} : { write: false };
  }, { home });
  return { added, ...(r.undo && added.length ? { undo: r.undo } : {}) };
}
/**
 * Split what has left the bank (debits: debitsFromAnalysis) and what has come due by date. Each payment once, ever:
 * a payment undone, deleted or already split by hand is never split again. -> {made: [thing], undo?}.
 */
export async function runRepeats(dataDir, debits, { today, home = 'GBP', skip = null } = {}) {
  const S0 = await readStore(dataDir, { home });
  if (!Object.keys(S0.repeats).length) return { made: [] };
  const made = [], list = (Array.isArray(debits) ? debits : []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const r = await mutate(dataDir, 'Repeating split', (S, touch) => {
    let wrote = false;
    const splitOne = (id, rep, o) => {
      const on = rep.people.filter(p => onDate(p, o.date));
      if (!on.length) return;
      const b = buildThing(S, touch, { kind: 'split', title: rep.title, total: o.amount, date: o.date, method: rep.method, meIn: rep.meIn, myWeight: rep.myWeight, merchant: o.merchant, source: o.source,
        people: on.map(p => ({ name: nameOf(S, p.key), weight: p.weight, pct: p.pct, exact: p.exact })) }, { today, home });
      if (b.error) { touch('repeats', id); S.repeats[id] = { ...S.repeats[id], problem: `${b.error} That was the ${fmt(o.amount, home)} on ${o.date}: split that one by hand.` }; return; }
      const t = cleanThing({ ...b, id: newId('o'), repeatId: id }, { home, today });
      if (!t) return;
      touch('things', t.id); S.things[t.id] = t;
      touch('repeats', id); const { problem: _p, ...rest } = S.repeats[id]; S.repeats[id] = { ...rest, last: o.date, made: (rest.made || 0) + 1 };
      made.push(t);
    };
    for (const [id, rep] of Object.entries(S.repeats)) {
      if (rep.paused || !rep.people.length) continue;
      const from = rep.from || today, to = rep.until && rep.until < today ? rep.until : today;
      if (rep.match) {
        const m = rep.match.m && rep.match.m.toLowerCase();
        for (const d of list) {
          if (d.date < from || d.date > to || (m ? String(d.merchant).toLowerCase() !== m : d.cat !== rep.match.c)) continue;
          if (rep.match.near && Math.abs(d.amount - rep.match.near) > rep.match.near * 0.3) continue;
          const tx = d.k || d.txKey, sid = id + '|' + String(tx).slice(0, 300);
          if (!tx || S.repeatSeen[sid]) continue;
          S.repeatSeen[sid] = d.date; wrote = true;
          if ((skip && (skip.has(d.k) || skip.has(d.txKey))) || Object.values(S.things).some(t => (d.k && t.source.k === d.k) || (d.txKey && t.source.txKey === d.txKey))) continue;
          splitOne(id, S.repeats[id], { date: d.date, amount: d.amount, merchant: d.merchant, source: { type: 'tx', k: d.k, txKey: d.txKey } });
        }
      } else if (rep.rule && rep.amount > 0) {
        for (const date of ruleDates(rep.rule, from, to)) {
          const sid = id + '|' + date;
          if (S.repeatSeen[sid]) continue;
          S.repeatSeen[sid] = date; wrote = true;
          splitOne(id, S.repeats[id], { date, amount: rep.amount, merchant: '', source: { type: 'repeat' } });
        }
      }
    }
    return wrote ? {} : { write: false };
  }, { home });
  return { made, ...(r.undo ? { undo: r.undo } : {}) };
}

// ─── Changes (each one a journalled step, so one Undo) ──────────────────────
/** Make the lines of a thing from the page's or the assistant's input. -> {thing fields} or {error}. */
function buildThing(S, touch, raw0, { today, home }) {
  // A receipt: the shares are worked out here from who had what, and it goes on as exact amounts.
  let raw = raw0;
  const plan = raw0 && raw0.kind !== 'expect' && !raw0.paidBy ? cleanReceiptPlan(raw0.receipt) : null;
  if (raw0 && raw0.receipt && !plan) return { error: 'Add what was on the receipt.' };
  if (plan) {
    const sh = shareReceipt(plan);
    if (sh.error) return sh;
    const whatFor = (key) => plan.items.filter(i => i.w.includes(key)).map(i => (i.w.length > 1 ? `${i.n} (shared)` : i.n)).join(', ').slice(0, 80);
    const fx0 = isObj(raw0.fx) ? { ...raw0.fx, amount: sh.total } : raw0.fx;
    raw = { ...raw0, method: 'exact', meIn: Number(sh.shares._me) > 0, myExtra: undefined, fx: fx0, total: isObj(fx0) ? raw0.total : sh.total,
      people: (Array.isArray(raw0.people) ? raw0.people : []).map(p => { const k = personKey(line(p && p.name, 80)); return { ...p, exact: sh.shares[k] || 0, what: whatFor(k) }; }) };
  }
  const kind = KINDS.includes(raw.kind) ? raw.kind : 'split';
  const title = line(raw.title, 140), total = Number(raw.total);
  if (!title) return { error: 'Say what it was for.' };
  if (!Number.isFinite(total) || total <= 0 || total > 1e7) return { error: 'Put in the amount first.' };
  const date = isIso(raw.date) ? raw.date : today;
  const fx = kind === 'expect' ? null : cleanFx(raw.fx, home);
  const base = { kind, title, total: money(total), date, currency: raw.currency, source: raw.source, merchant: raw.merchant, note: raw.note, due: raw.due, tripId: raw.tripId, expectKind: raw.expectKind, fromExpense: raw.fromExpense, ...(fx ? { fx } : {}), ...(plan ? { receipt: plan } : {}), ...(raw.receiptRef ? { receiptRef: raw.receiptRef } : {}) };
  if (kind === 'expect') {
    const key = remember(S, touch, { name: line(raw.from, 80) || title }, today);
    if (!key) return { error: 'Say who it is coming from.' };
    return { ...base, method: 'exact', meIn: false, myShare: 0, rounding: 0, lines: [{ key, owes: money(total) }] };
  }
  const people = [];
  for (const p of (Array.isArray(raw.people) ? raw.people : []).slice(0, MAX_LINES)) {
    const key = remember(S, touch, { name: p && p.name, pid: p && p.pid }, today);
    if (key && !people.some(x => x.key === key)) people.push({ key, weight: p.weight, pct: p.pct, exact: p.exact, extra: p.extra, what: p.what });
  }
  const payerName = line(raw.paidBy, 80);
  if (!people.length && !payerName) return { error: 'Add at least one person.' };
  if (payerName) {
    // Someone else paid: you owe them your share. Everyone's share is kept, for who-owes-whom on a trip.
    const payer = remember(S, touch, { name: payerName, pid: raw.paidByPid }, today);
    if (!payer) return { error: 'Say who paid.' };
    const others = people.some(p => p.key === payer) ? people : [...people, { key: payer, weight: 1, pct: 0, exact: 0 }];
    const r = computeSplitFx(total, others, { method: raw.method, meIn: true, myWeight: raw.myWeight, myExtra: raw.myExtra }, fx);
    if (r.error) return r;
    if (!(r.me > 0)) return { error: 'As it stands you owe nothing for this.' };
    return { ...base, kind: 'iowe', payer, method: r.method, meIn: true, myShare: r.me, myFx: r.myFx, rounding: r.rounding, myWeight: raw.myWeight, myExtra: raw.myExtra, lines: [{ key: payer, owes: r.me, ...(r.myFx ? { fx: r.myFx } : {}) }],
      others: r.lines.filter(l => l.key !== payer).map(l => ({ key: l.key, amount: l.owes })) };
  }
  const r = computeSplitFx(total, people, { method: raw.method, meIn: raw.meIn !== false, myWeight: raw.myWeight, myExtra: raw.myExtra }, fx);
  if (r.error) return r;
  const byKey = new Map(people.map(p => [p.key, p]));
  return { ...base, method: r.method, meIn: raw.meIn !== false, myShare: r.me, myFx: r.myFx, rounding: r.rounding, myWeight: raw.myWeight, myExtra: raw.myExtra,
    lines: r.lines.map(l => { const p = byKey.get(l.key); return { key: l.key, owes: l.owes, ...(l.fx ? { fx: l.fx } : {}), ...(r.method === 'shares' ? { weight: p.weight == null ? 1 : p.weight } : {}), ...(r.method === 'percent' ? { pct: p.pct } : {}), ...(r.method === 'exact' ? { exact: p.exact } : {}), ...(r.method === 'items' && Number(p.extra) > 0 ? { extra: p.extra, what: p.what } : {}), ...(plan && p.what ? { what: p.what } : {}) }; }) };
}
export async function createThing(dataDir, raw, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Add to Owed to me', (S, touch) => {
    if (!isObj(raw)) return { error: 'Say what it was for.', write: false };
    if (Object.keys(S.things).length >= MAX_THINGS) return { error: 'There are too many here; delete some old ones first.', write: false };
    const src = isObj(raw.source) ? raw.source : {};
    if (src.k || src.txKey) { const dup = Object.values(S.things).find(t => (src.k && t.source.k === src.k) || (src.txKey && t.source.txKey === src.txKey)); if (dup) return { error: 'That payment is already split.', duplicate: dup.id, write: false }; }
    let tripId = typeof raw.tripId === 'string' && S.trips[raw.tripId] ? raw.tripId : undefined;
    if (!tripId && line(raw.tripName, 80)) { const had = Object.entries(S.trips).find(([, t]) => t.name.toLowerCase() === line(raw.tripName, 80).toLowerCase()); if (had) tripId = had[0]; else { tripId = newId('o'); touch('trips', tripId); S.trips[tripId] = cleanTrip({ name: raw.tripName }); } }
    const b = buildThing(S, touch, { ...raw, tripId }, { today, home });
    if (b.error) return { error: b.error, write: false };
    const t = cleanThing({ ...b, id: newId('o') }, { home, today });
    if (!t) return { error: 'That could not be saved. Check the amount and the date.', write: false };
    touch('things', t.id); S.things[t.id] = t;
    const gName = line(raw.saveGroup, 60);
    if (gName && t.kind === 'split') { const id = personKey(gName); if (id) { touch('groups', id); S.groups[id] = cleanGroup({ name: gName, keys: t.lines.map(l => l.key), uses: ((S.groups[id] && S.groups[id].uses) || 0) + 1, last: today }); } }
    else if (raw.groupId && S.groups[raw.groupId]) { touch('groups', raw.groupId); S.groups[raw.groupId] = { ...S.groups[raw.groupId], uses: S.groups[raw.groupId].uses + 1, last: today }; }
    return { id: t.id, thing: t };
  }, { home });
}
/** Several at once (the bulk bar): one Undo. Ones already split, or not valid, are left out and counted. */
export async function createThings(dataDir, raws, { today, home = 'GBP' } = {}) {
  const list = Array.isArray(raws) ? raws.slice(0, 100) : [];
  return mutate(dataDir, `Split ${list.length} payments`, (S, touch) => {
    const ids = []; let skipped = 0;
    for (const raw of list) {
      const src = isObj(raw) && isObj(raw.source) ? raw.source : {};
      if ((src.k || src.txKey) && Object.values(S.things).some(t => (src.k && t.source.k === src.k) || (src.txKey && t.source.txKey === src.txKey))) { skipped++; continue; }
      const b = isObj(raw) ? buildThing(S, touch, raw, { today, home }) : { error: 'no' };
      const t = b.error ? null : cleanThing({ ...b, id: newId('o') }, { home, today });
      if (!t) { skipped++; continue; }
      touch('things', t.id); S.things[t.id] = t; ids.push(t.id);
    }
    if (!ids.length) return { error: 'Those are split already, or could not be saved.', write: false };
    return { ids, skipped };
  }, { home });
}
/** Change a thing: what you already got from each person stays with them. */
export async function updateThing(dataDir, id, raw, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Edit', (S, touch) => {
    const prev = S.things[id]; if (!prev) return { error: 'That is gone.', write: false };
    const b = buildThing(S, touch, { source: prev.source, merchant: prev.merchant, tripId: prev.tripId, fromExpense: prev.fromExpense, receiptRef: prev.receiptRef, ...raw }, { today, home });
    if (b.error) return { error: b.error, write: false };
    const old = new Map(prev.lines.map(l => [l.key, l]));
    const lost = prev.lines.find(l => l.payments.length && !b.lines.some(n => n.key === l.key));
    if (lost) return { error: `${nameOf(S, lost.key)} has already paid something towards this, so they stay on it. Say they did not pay first.`, write: false };
    b.lines = b.lines.map(n => { const o = old.get(n.key); if (!o) return n; const { what: was, ...rest } = o; return { ...(prev.receipt && !b.receipt ? rest : o), ...n, payments: o.payments }; });
    const t = cleanThing({ ...b, id, createdAt: prev.createdAt }, { home, today });
    if (!t) return { error: 'That could not be saved.', write: false };
    touch('things', id); S.things[id] = t;
    return { id, thing: t };
  }, { home });
}
export async function deleteThings(dataDir, ids, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Delete', (S, touch) => {
    let n = 0;
    for (const id of (Array.isArray(ids) ? ids : []).slice(0, 200)) if (S.things[id]) { touch('things', id); delete S.things[id]; n++; }
    return n ? { removed: n } : { error: 'Nothing to delete.', write: false };
  }, { home });
}
const refsOf = (S, refs) => (Array.isArray(refs) ? refs : []).slice(0, 300).map(r => { const t = isObj(r) && S.things[r.id]; const l = t && t.lines.find(x => x.key === r.key); return l ? { t, l, i: t.lines.indexOf(l), amount: r.amount } : null; }).filter(Boolean);
function setLine(S, touch, t, key, patch) {
  touch('things', t.id);
  S.things[t.id] = { ...S.things[t.id], lines: S.things[t.id].lines.map(l => (l.key === key ? { ...l, ...patch } : l)) };
}
/** Marked by hand: all that is left (or `amount` for one line). */
export async function markPaid(dataDir, refs, { date, today, note = '', home = 'GBP' } = {}) {
  return mutate(dataDir, 'Mark paid', (S, touch) => {
    const list = refsOf(S, refs); let n = 0;
    const at = isIso(date) ? date : today;
    for (const { t, l, amount } of list) {
      const left = leftOf(l); if (left <= 0.004) continue;
      const amt = Number(amount) > 0 ? Math.min(money(amount), left) : left;
      const pay = cleanPayment({ amount: amt, date: at, how: 'hand', note });
      setLine(S, touch, t, l.key, { payments: [...l.payments, pay] }); n++;
    }
    return n ? { changed: n } : { error: 'Those are already paid.', write: false };
  }, { home });
}
/** Take what was marked off again, the bank's and by hand. The bank payment can then be suggested again. */
export async function markUnpaid(dataDir, refs, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Not paid after all', (S, touch) => {
    let n = 0;
    for (const { t, l } of refsOf(S, refs)) { if (!l.payments.length && !l.off) continue; const { off, ...rest } = l; setLine(S, touch, t, l.key, { ...rest, payments: [], off: undefined }); n++; }
    return n ? { changed: n } : { error: 'Nothing to change.', write: false };
  }, { home });
}
export async function writeOff(dataDir, refs, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Write off', (S, touch) => {
    let n = 0;
    for (const { t, l } of refsOf(S, refs)) { if (l.off || leftOf(l) <= 0.004) continue; setLine(S, touch, t, l.key, { off: today }); n++; }
    return n ? { changed: n } : { error: 'Nothing left to write off.', write: false };
  }, { home });
}
export async function noteReminded(dataDir, refs, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Reminded', (S, touch) => {
    for (const { t, l } of refsOf(S, refs)) setLine(S, touch, t, l.key, { remindedAt: today });
    return {};
  }, { home });
}
export async function setTaskIds(dataDir, id, map, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Add reminder tasks', (S, touch) => {
    const t = S.things[id]; if (!t) return { write: false };
    for (const [key, taskId] of Object.entries(isObj(map) ? map : {})) if (t.lines.some(l => l.key === key)) setLine(S, touch, S.things[id], key, { taskId });
    return {};
  }, { home });
}
/** Settle up with one person: everything open in both directions is marked paid by hand, as one step. */
export async function settlePerson(dataDir, key, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Settle up', (S, touch) => {
    let n = 0;
    for (const t of Object.values(S.things)) for (const l of t.lines) {
      if (l.key !== key || !isOpen(l)) continue;
      setLine(S, touch, t, key, { payments: [...l.payments, cleanPayment({ amount: leftOf(l), date: today, how: 'hand', note: 'Settled up' })] }); n++;
    }
    return n ? { changed: n } : { error: 'There is nothing open with them.', write: false };
  }, { home });
}
export async function setPrefs(dataDir, patch, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Change settings', (S, touch) => { touch('prefs'); S.prefs = cleanPrefs(patch, S.prefs); return {}; }, { home });
}
export async function dismissOffer(dataDir, offer, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Not one to split', (S, touch) => {
    const k = line(offer && offer.k, 60), m = line(offer && offer.m, 60).toLowerCase();
    if (k) { touch('offers', 'tx:' + k); S.offers['tx:' + k] = Date.now(); }
    if (m) { touch('offers', 'm:' + m); S.offers['m:' + m] = (S.offers['m:' + m] || 0) + 1; }
    return {};
  }, { home });
}
/** Your own note on a payment (any payment, split or not). '' takes it off. */
export async function setNote(dataDir, k, text, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Note', (S, touch) => {
    const key = line(k, 40); if (!key) return { error: 'That payment could not be found.', write: false };
    touch('notes', key);
    const n = line(text, 200);
    if (n) S.notes[key] = n; else delete S.notes[key];
    return {};
  }, { home });
}
export async function setPersonWords(dataDir, key, match, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Edit bank wording', (S, touch) => {
    const p = S.people[key]; if (!p) return { error: 'That person is gone.', write: false };
    touch('people', key); S.people[key] = cleanPerson({ match }, p);
    return {};
  }, { home });
}

// ─── A pending payment that changed under a split ──────────────────────────
const NOTICE_RE = /^pend:(amt:[0-9a-f]{12}:\d+\.\d\d|gone:[0-9a-f]{12})$/;
/**
 * What to say about payments that were pending (lib/finance/pending.mjs). X: the expenses store (lib/expenses.mjs).
 *   {id, kind: 'changed', what: 'split'|'expense', ref, title, was, now, claimed?}   it settled at another amount
 *   {id, kind: 'gone', what: 'split'|'expense'|'paid'|'claim', ref, title, a, m, d, k, txKey?} the bank dropped it (a declined or released hold)
 * Said until answered: an answer goes in offers (synced), so the other computers stop asking too.
 */
export function pendingNotices(S, X, analysis) {
  const out = [];
  const said = (id) => !!S.offers[id];
  const tx = analysis && Array.isArray(analysis.transactions) ? analysis.transactions : [];
  const things = Object.values(S.things), items = X && X.items ? Object.values(X.items) : [];
  const seenAt = (t, v) => t.pas.some(a => Math.abs(Math.abs(Number(a)) - v) < 0.005);
  for (const t of tx) {
    if (!t || t.pe || !Array.isArray(t.pas) || !t.k) continue;
    const now = money(Math.abs(Number(t.a)));
    const id = `pend:amt:${t.k}:${now.toFixed(2)}`;
    if (said(id)) continue;
    const th = things.find(x => x.kind === 'split' && x.source && x.source.k === t.k);
    if (th && Math.abs(th.total - now) >= 0.005 && seenAt(t, th.total)) out.push({ id, kind: 'changed', what: 'split', ref: th.id, title: th.title, was: th.total, now });
    const e = items.find(x => x.source && x.source.k === t.k);
    if (e && Math.abs(e.amount - now) >= 0.005 && seenAt(t, e.amount)) out.push({ id, kind: 'changed', what: 'expense', ref: e.id, title: e.title, was: e.amount, now, ...(e.status !== 'to-claim' ? { claimed: true } : {}) });
  }
  for (const g of analysis && Array.isArray(analysis.pending_gone) ? analysis.pending_gone : []) {
    if (!g || !g.k) continue;
    const id = `pend:gone:${g.k}`;
    if (said(id)) continue;
    const base = { id, kind: 'gone', a: Math.abs(Number(g.a)), m: String(g.m || ''), d: g.d, k: g.k, txKey: g.tk };
    const th = things.find(x => x.source && x.source.k === g.k);
    if (th) out.push({ ...base, what: 'split', ref: th.id, title: th.title });
    const e = items.find(x => x.source && x.source.k === g.k);
    if (e) out.push({ ...base, what: 'expense', ref: e.id, title: e.title });
    const used = things.find(x => x.lines.some(l => l.payments.some(p => p.k === g.k)));
    if (used) out.push({ ...base, what: 'paid', ref: used.id, title: used.title, name: nameOf(S, used.lines.find(l => l.payments.some(p => p.k === g.k)).key) });
    const claim = items.find(x => x.paidTxKey && x.paidTxKey === g.tk);
    if (claim) out.push({ ...base, what: 'claim', ref: claim.id, title: claim.title });
  }
  return out.slice(0, 8);
}
/** The answer to one of those: not asked again, on any of your computers. */
export async function saidNotice(dataDir, id, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Noted', (S, touch) => {
    if (typeof id !== 'string' || !NOTICE_RE.test(id)) return { error: 'That has gone.', write: false };
    touch('offers', id); S.offers[id] = Date.now();
    return {};
  }, { home });
}
/**
 * The payment came to another amount: everyone's part is worked out again the way it was split, and what was already paid stays.
 * Exact amounts or a receipt: everyone keeps their part and the difference is yours; if you are not in it, it has to be shared out by hand.
 */
export async function retotalThing(dataDir, id, total, { home = 'GBP', today = null } = {}) {
  return mutate(dataDir, 'Update the split', (S, touch) => {
    const t = S.things[id];
    if (!t) return { error: 'That is gone.', write: false };
    const T = money(total);
    if (!(T > 0) || T > 1e7) return { error: 'That amount does not look right.', write: false };
    const method = t.receipt ? 'exact' : t.method;
    const people = t.lines.map(l => ({ key: l.key, weight: l.weight, pct: l.pct, exact: method === 'exact' ? l.owes : l.exact, extra: l.extra }));
    const r = computeSplitFx(T, people, { method, meIn: t.meIn, myWeight: t.myWeight, myExtra: t.myExtra, cur: t.currency }, t.fx || null);
    if (r.error) return { error: r.error, write: false };
    const owes = new Map(r.lines.map(l => [l.key, l]));
    const next = cleanThing({ ...t, total: T, myShare: r.me, rounding: r.rounding, ...(r.myFx != null ? { myFx: r.myFx } : {}), lines: t.lines.map(l => { const n = owes.get(l.key); return n ? { ...l, owes: n.owes, ...(n.fx ? { fx: n.fx } : {}) } : l; }) }, { home, today });
    if (!next) return { error: 'That could not be saved.', write: false };
    touch('things', id); S.things[id] = next;
    return { id, thing: next };
  }, { home });
}

// ─── Yes and Not this ───────────────────────────────────────────────────────
/** Use one bank payment on some lines. The lines are read again here: a suggestion from the page is only a question. */
function applyTx(S, touch, tx, allocs, { learnKey = '', payer = '', rest = 'credit', replace = false } = {}) {
  if (!isObj(tx) || !isIso(tx.date) || !(Number(tx.amount) > 0) || !(tx.k || tx.txKey)) return { error: 'That suggestion is out of date.' };
  if (replace) removeTx(S, touch, tx);
  const used = usedKeys(S);
  if ((tx.k && used.has(tx.k)) || (tx.txKey && used.has(tx.txKey))) return { error: 'That payment has already been used.' };
  const A = pence(tx.amount);
  let spent = 0, last = null, n = 0;
  for (const a of Array.isArray(allocs) ? allocs : []) {
    const t = isObj(a) && S.things[a.id]; const l = t && t.lines.find(x => x.key === a.key);
    if (!l || !isOpen(l)) continue;
    const p = Math.min(pence(a.amount), pence(leftOf(l)), A - spent);
    if (p <= 0) continue;
    const by = payer && payer !== l.key ? payer : '';
    const pay = cleanPayment({ amount: fromP(p), date: tx.date, how: 'bank', k: tx.k, txKey: tx.txKey, memo: tx.memo, txa: tx.amount, by });
    setLine(S, touch, t, l.key, { payments: [...l.payments, pay] });
    spent += p; last = { t, key: l.key, id: pay.id }; n++;
    // "Sam often pays for Alex": remembered as a hint, never acted on by itself.
    if (by && S.people[by]) { touch('people', by); const pf = { ...(S.people[by].paysFor || {}) }; pf[l.key] = (pf[l.key] || 0) + 1; S.people[by] = cleanPerson({ paysFor: pf }, S.people[by]); }
  }
  if (!n) return { error: 'That has been paid already.' };
  // What is left over: kept as credit with whoever sent it (settle-up shows it), or a gift, or nothing to do with this.
  if (A > spent && last && (rest === 'credit' || rest === 'gift')) {
    const cur = S.things[last.t.id];
    const extra = rest === 'credit' ? { over: fromP(A - spent) } : { gift: fromP(A - spent) };
    setLine(S, touch, cur, last.key, { payments: cur.lines.find(x => x.key === last.key).payments.map(y => (y.id === last.id ? { ...y, ...extra } : y)) });
  }
  if (learnKey && S.people[learnKey]) {
    const title = (allocs || []).map(a => a && a.title).join(' ');
    const w = memoPhrases(tx.memo, title).filter(x => !S.people[learnKey].match.includes(x));
    if (w.length) { touch('people', learnKey); S.people[learnKey] = cleanPerson({ match: [...S.people[learnKey].match, ...w] }, S.people[learnKey]); }
  }
  return { changed: n, over: A > spent ? fromP(A - spent) : 0 };
}
/** Take a bank payment off everything it was used for. -> how many lines changed. */
function removeTx(S, touch, tx) {
  let n = 0;
  const same = (p) => (tx.k && p.k === tx.k) || (tx.txKey && p.txKey === tx.txKey);
  for (const t of Object.values(S.things)) for (const l of t.lines) {
    if (!l.payments.some(same)) continue;
    setLine(S, touch, S.things[t.id], l.key, { payments: l.payments.filter(p => !same(p)) }); n++;
  }
  return n;
}
/** Yes: the payment goes on those lines and the wording is remembered. Not this: this payment is not asked about again for them. */
export async function answer(dataDir, sug, yes, { pick = '', home = 'GBP' } = {}) {
  if (!isObj(sug) || !(sug.k || sug.txKey)) return { error: 'That suggestion is out of date.', status: 400 };
  const txId = sug.k || sug.txKey;
  if (!yes) {
    return mutate(dataDir, 'Not this', (S, touch) => {
      for (const key of [sug.key, ...(Array.isArray(sug.alts) ? sug.alts.map(a => a && a.key) : [])]) if (typeof key === 'string' && key) { const a = askKey(txId, key); touch('asks', a); S.asks[a] = Date.now(); }
      return {};
    }, { home });
  }
  const alt = pick && Array.isArray(sug.alts) ? sug.alts.find(a => a && a.key === pick) : null;
  const allocs = alt ? alt.allocs : sug.allocs, key = alt ? alt.key : sug.key;
  return mutate(dataDir, 'Paid, from the bank', (S, touch) => {
    const r = applyTx(S, touch, sug, allocs, { learnKey: sug.tied ? '' : key, payer: key });
    if (r.error) return { error: r.error, write: false };
    return r;
  }, { home });
}
/**
 * The owner designated a bank payment by hand: allocs [{id, key, amount}], in any amounts. payer: who sent it (a person's key).
 * rest: what happens to what is left: 'credit' (kept with the payer), 'gift', or 'none' (not related). replace: it was used before; this is the new answer.
 */
export async function assignTx(dataDir, tx, allocs, { payer = '', rest = 'none', replace = false, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Paid, from the bank', (S, touch) => {
    const list = (Array.isArray(allocs) ? allocs : []).slice(0, 100).filter(a => isObj(a) && Number(a.amount) > 0 && S.things[a.id]).map(a => ({ id: a.id, key: String(a.key || ''), amount: money(a.amount), title: S.things[a.id].title }));
    if (!list.length) return { error: 'Choose something that is still owed.', write: false };
    const sum = list.reduce((a, x) => a + pence(x.amount), 0);
    if (sum > pence(tx && tx.amount) + 1) return { error: `That is ${fmt(fromP(sum - pence(tx.amount)))} more than the payment.`, write: false };
    const who = typeof payer === 'string' && S.people[payer] ? payer : (new Set(list.map(a => a.key)).size === 1 ? list[0].key : '');
    const r = applyTx(S, touch, tx, list, { learnKey: who, payer: who, rest: ['credit', 'gift', 'none'].includes(rest) ? rest : 'none', replace: replace === true });
    if (r.error) return { error: r.error, write: false };
    return r;
  }, { home });
}
/** Take a designation back: the payment is free, and can be matched again. */
export async function unassignTx(dataDir, tx, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Not matched after all', (S, touch) => {
    const n = isObj(tx) ? removeTx(S, touch, tx) : 0;
    return n ? { changed: n } : { error: 'That payment is not matched to anything.', write: false };
  }, { home });
}
/** This bank payment is the one you made for a split or a refund you wrote in by hand: what comes back comes off it. */
export async function linkPayment(dataDir, id, tx, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Link the payment', (S, touch) => {
    const t = S.things[id]; if (!t) return { error: 'That is gone.', write: false };
    const dup = Object.values(S.things).find(x => x.id !== id && isObj(tx) && ((tx.k && x.source.k === tx.k) || (tx.txKey && x.source.txKey === tx.txKey)));
    if (dup) return { error: `That payment is already on “${dup.title}”.`, write: false };
    touch('things', id);
    S.things[id] = { ...t, source: { type: 'tx', ...(tx && tx.k ? { k: String(tx.k).slice(0, 40) } : {}), ...(tx && tx.txKey ? { txKey: String(tx.txKey).slice(0, 300) } : {}) }, ...(t.merchant || !(tx && tx.merchant) ? {} : { merchant: line(tx.merchant, 60) }) };
    return { id };
  }, { home });
}
export async function unlinkPayment(dataDir, id, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Unlink the payment', (S, touch) => {
    const t = S.things[id]; if (!t) return { error: 'That is gone.', write: false };
    touch('things', id); S.things[id] = { ...t, source: { type: 'manual' } };
    return { id };
  }, { home });
}
/** Who a bank wording most looks like. '' when nobody. */
export function guessPayer(S, memo, aliases) {
  let best = '', top = 0;
  for (const [key, p] of Object.entries(S.people)) { const s = nameHit(p, aliases && aliases.get(key), memo); if (s > top) { top = s; best = key; } }
  return best;
}
/** Run the matching. With autoMark on, a single exact match with the name in it is marked (with Undo). */
export async function scan(dataDir, credits, { debits = [], today, aliases = null, skip = null, home = 'GBP' } = {}) {
  let S0 = await readStore(dataDir, { home });
  const al = aliases ? aliases(S0) : null;
  // A hand mark the bank now shows becomes that bank payment, so it comes off the spending like any other.
  let linked = 0;
  if (handLinks(S0, credits, { aliases: al, skip }).length) {
    const lr = await mutate(dataDir, 'Matched to the bank', (S, touch) => {
      const links = handLinks(S, credits, { aliases: al, skip });
      for (const x of links) {
        const t = S.things[x.id], l = t.lines.find(y => y.key === x.key);
        setLine(S, touch, t, x.key, { payments: l.payments.map(p => (p.id === x.payId ? cleanPayment({ id: p.id, amount: p.amount, date: x.tx.date, how: 'bank', k: x.tx.k, txKey: x.tx.txKey, memo: x.tx.memo, txa: x.tx.amount, note: p.note }) : p)) });
      }
      return { linked: links.length };
    }, { home });
    linked = (lr && lr.linked) || 0;
    S0 = await readStore(dataDir, { home });
  }
  const m0 = findMatches(S0, credits, { debits, today, aliases: al, skip });
  if (!S0.prefs.autoMark || !m0.some(s => s.conf === 'high' && s.kind === 'exact')) return { suggestions: m0, auto: [], linked };
  const r = await mutate(dataDir, 'Marked paid from the bank', (S, touch) => {
    const auto = [];
    for (const s of findMatches(S, credits, { debits, today, aliases: al, skip })) if (s.conf === 'high' && s.kind === 'exact' && !applyTx(S, touch, s, s.allocs, { learnKey: s.key }).error) auto.push(s);
    return { auto };
  }, { home });
  const S1 = await readStore(dataDir, { home });
  return { suggestions: findMatches(S1, credits, { debits, today, aliases: al, skip }), auto: r.auto || [], linked, ...(r.undo ? { undo: r.undo } : {}) };
}
/** The assistant read that someone paid (an email, a message): a question on the page, never a mark. */
export async function propose(dataDir, { id, key, amount, date, note }, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Suggested by the assistant', (S, touch) => {
    const t = S.things[id]; const l = t && t.lines.find(x => x.key === key);
    if (!l) return { error: 'That person is not on that.', write: false };
    if (!isOpen(l)) return { error: 'That is paid already.', write: false };
    const pid = newId('o');
    touch('proposed', pid);
    S.proposed[pid] = { id, key, amount: Number(amount) > 0 ? Math.min(money(amount), leftOf(l)) : leftOf(l), date: isIso(date) ? date : today, note: line(note, 300), at: new Date().toISOString() };
    return { proposal: pid };
  }, { home });
}
export async function answerProposal(dataDir, pid, yes, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, yes ? 'Mark paid' : 'Not this', (S, touch) => {
    const p = S.proposed[pid]; if (!p) return { error: 'That question has gone.', write: false };
    touch('proposed', pid); delete S.proposed[pid];
    if (!yes) return {};
    const t = S.things[p.id]; const l = t && t.lines.find(x => x.key === p.key);
    if (!l || !isOpen(l)) return { error: 'That is paid already.', write: false };
    setLine(S, touch, t, p.key, { payments: [...l.payments, cleanPayment({ amount: Math.min(p.amount, leftOf(l)), date: p.date || today, how: 'hand', note: p.note })] });
    return { changed: 1 };
  }, { home });
}

// ─── Export ─────────────────────────────────────────────────────────────────
export function owedCsv(view) {
  const rows = [['Date', 'What', 'Person', 'Direction', 'Their part', 'Paid', 'Left', 'Status', 'Paid by', 'Note'].join(',')];
  const WORDS = { wait: 'Waiting', think: 'We think they paid', paid: 'Paid', part: 'Part paid', off: 'Written off' };
  for (const t of view.things) for (const l of t.lines) rows.push([t.date, csvCell(t.title), csvCell(l.name), { split: 'They owe you', iowe: 'You owe them', expect: 'Expecting' }[t.kind], l.owes.toFixed(2), l.paid.toFixed(2), l.left.toFixed(2), WORDS[l.status], csvCell((l.via || []).join('; ')), csvCell(t.note || '')].join(','));
  return rows.join('\r\n') + '\r\n';
}
