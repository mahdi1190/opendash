// lib/owed.mjs - Owed to me: money other people owe you, and money you owe them or expect back.
// You paid for bowling: split it, write down who owes what, and OpenDash watches the bank for it arriving.
//
//   <data>/expenses/owed.json          {v: 1, prefs, things, people, groups, trips, asks, offers, proposed}
//   <data>/expenses/owed-journal.json  the last undo steps (stays on this computer)
//
// thing  {id, kind: 'split' (you paid) | 'iowe' (someone else paid) | 'expect' (a refund, a deposit, a loan...), title, total,
//         currency, date, due?, method, meIn, myShare, rounding, lines: [line], others?: [{key, amount}], payer?: person key,
//         source: {type: 'tx'|'manual'|'expense'|'mcp', txKey?, k?}, merchant?, tripId?, expectKind?, note?, fromExpense?, createdAt}
// line   {key, owes, weight?, pct?, exact?, extra?, what?, off?: 'YYYY-MM-DD' (written off), remindedAt?, taskId?,
//         payments: [{id, amount, date, how: 'bank'|'hand', k?, txKey?, memo?, over? (kept as credit), gift?, by? (who sent it, when not this person), txa? (the whole bank payment)}]}
// person {name, pid? (their id in People), match: [UPPERCASE bank wordings you confirmed], uses, last, paysFor?: {key: times} ("Sam often pays for Alex": a hint, never acted on)}
// group  {name, keys, uses, last}    "Bowling lot"
// trip   {name, keys, createdAt}     several payments and who owes whom
//
// Bank matching is findMatches: money in against what is owed by amount, the name in the bank's wording and the date.
// It only ever suggests; nothing is marked unless the owner turned autoMark on, and then only a single exact match
// with the name in it. A bank payment is used once. What was matched leaves income and comes off the original payment
// (netPlan, applied by lib/finance/transfers.mjs applyOwedNet), unless netSpending is off.
//
// PRIVACY: private, like expenses. It syncs only between the owner's own devices with end-to-end encryption
// (lib/sync/manifest.mjs); lib/friends/share.mjs never reads it. No network, no Claude. Nothing is ever sent to anyone.

import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readJson } from './fsutil.mjs';
import { journalledStore, expensesDir, pence, isIso, addDays, newId, payerKey, GENERIC, csvCell, subsetsSumming } from './expenses.mjs';

export const KINDS = Object.freeze(['split', 'iowe', 'expect']);
export const METHODS = Object.freeze(['equal', 'exact', 'shares', 'percent', 'items']);
export const EXPECT_KINDS = Object.freeze(['refund', 'deposit', 'loan', 'claim', 'other']);
export const ID_RE = /^o-[a-z0-9]{6,30}$/;
const MAX_THINGS = 5000, MAX_LINES = 60, MAX_PAYMENTS = 40, DAY = 86400000;
export const DEFAULT_PREFS = Object.freeze({ autoMark: false, netSpending: true, offers: true, chaseTasks: false, chaseDays: 7, windowDays: 120, oldDays: 30, offerMin: 30, bankDetails: '', sendBank: false });

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
    if (sum > T) return { error: `That is ${fmt(fromP(sum - T))} too much.` };
    me = T - sum;
    if (!meIn && me > 0) return { error: `${fmt(fromP(me))} is not shared out yet. Add it to someone, or turn on "I'm in it too".` };
  } else {   // items: everyone's own extras first, then the rest split equally
    const extra = (p) => pence(num(p.extra));
    const E = list.reduce((a, p) => a + extra(p), pence(num(o.myExtra)));
    if (E > T) return { error: `The extras come to ${fmt(fromP(E - T))} more than the total.` };
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

// ─── Cleaning ───────────────────────────────────────────────────────────────
export function cleanPrefs(raw, base = DEFAULT_PREFS) {
  const o = { ...DEFAULT_PREFS, ...(isObj(base) ? base : {}) };
  if (!isObj(raw)) return o;
  for (const k of ['autoMark', 'netSpending', 'offers', 'chaseTasks', 'sendBank']) if (typeof raw[k] === 'boolean') o[k] = raw[k];
  const n = (v, lo, hi) => (Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi ? Math.round(Number(v)) : null);
  for (const [k, lo, hi] of [['chaseDays', 1, 120], ['windowDays', 7, 730], ['oldDays', 3, 365], ['offerMin', 0, 10000]]) { const v = n(raw[k], lo, hi); if (v != null) o[k] = v; }
  if (typeof raw.bankDetails === 'string') o.bankDetails = line(raw.bankDetails, 200);
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
  const what = line(l.what, 80); if (what) out.what = what;
  if (isIso(l.off)) out.off = l.off;
  if (isIso(l.remindedAt)) out.remindedAt = l.remindedAt;
  if (typeof l.taskId === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(l.taskId)) out.taskId = l.taskId;
  return out;
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
  out.source = { type: ['tx', 'manual', 'expense', 'mcp'].includes(src.type) ? src.type : 'manual' };
  if (typeof src.txKey === 'string' && src.txKey) out.source.txKey = src.txKey.slice(0, 300);
  if (typeof src.k === 'string' && src.k) out.source.k = src.k.slice(0, 40);
  const merchant = line(raw.merchant, 60); if (merchant) out.merchant = merchant;
  if (typeof raw.tripId === 'string' && ID_RE.test(raw.tripId)) out.tripId = raw.tripId;
  if (EXPECT_KINDS.includes(raw.expectKind)) out.expectKind = raw.expectKind;
  const note = line(raw.note, 600); if (note) out.note = note;
  if (typeof raw.payer === 'string' && raw.payer) out.payer = raw.payer.slice(0, 60);
  if (Array.isArray(raw.others)) { const o2 = raw.others.slice(0, MAX_LINES).filter(x => isObj(x) && typeof x.key === 'string' && Number(x.amount) > 0).map(x => ({ key: x.key.slice(0, 60), amount: money(x.amount) })); if (o2.length) out.others = o2; }
  if (isObj(raw.fromExpense) && JSON.stringify(raw.fromExpense).length < 6000) out.fromExpense = raw.fromExpense;
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

// ─── The store ──────────────────────────────────────────────────────────────
export function emptyStore() { return { v: 1, prefs: { ...DEFAULT_PREFS }, things: {}, people: {}, groups: {}, trips: {}, asks: {}, offers: {}, proposed: {}, notes: {} }; }
export function normStore(raw, { home = 'GBP' } = {}) {
  const S = emptyStore();
  if (!isObj(raw)) return S;
  S.prefs = cleanPrefs(raw.prefs);
  for (const [k, v] of Object.entries(isObj(raw.things) ? raw.things : {}).slice(0, MAX_THINGS)) { const t = cleanThing({ ...v, id: k }, { home, today: v && v.date }); if (t && t.id === k) S.things[k] = t; }
  for (const [k, v] of Object.entries(isObj(raw.people) ? raw.people : {}).slice(0, 2000)) { const p = cleanPerson(v); if (p) S.people[k] = p; }
  for (const [k, v] of Object.entries(isObj(raw.groups) ? raw.groups : {}).slice(0, 200)) { const g = cleanGroup(v); if (g) S.groups[k] = g; }
  for (const [k, v] of Object.entries(isObj(raw.trips) ? raw.trips : {}).slice(0, 500)) { const t = cleanTrip(v); if (t) S.trips[k] = t; }
  for (const key of ['asks', 'offers']) for (const [k, v] of Object.entries(isObj(raw[key]) ? raw[key] : {}).slice(0, 5000)) if (k.length <= 200 && Number.isFinite(Number(v))) S[key][k] = Number(v);
  for (const [k, v] of Object.entries(isObj(raw.proposed) ? raw.proposed : {}).slice(0, 200)) if (isObj(v) && typeof v.id === 'string' && typeof v.key === 'string' && Number(v.amount) > 0) S.proposed[k] = { id: v.id, key: v.key, amount: money(v.amount), date: isIso(v.date) ? v.date : '', note: line(v.note, 300), at: stamp(v.at) };
  for (const [k, v] of Object.entries(isObj(raw.notes) ? raw.notes : {}).slice(0, 5000)) { const n = line(v, 200); if (n && k.length <= 40) S.notes[k] = n; }
  return S;
}
export async function readStore(dataDir, opts) { return normStore(await readJson(owedFile(dataDir), { fallback: null }).catch(() => null), opts); }
export const { mutate, undoChange } = journalledStore({ file: owedFile, dir: expensesDir, journal: journalFile, kinds: ['things', 'people', 'groups', 'trips', 'asks', 'offers', 'proposed', 'notes'], norm: normStore, cleanPrefs });

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
  const mk = (c, key, kind, conf, allocs, extra = {}) => ({ id: askKey(txIdOf(c), key), dir, k: c.k || '', txKey: c.txKey || '', date: c.date, amount: money(c.amount), memo: line(c.memo, 140), key, name: nameOf(S, key), kind, conf, allocs, ...extra });
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
    for (const { key, s } of named) {
      const debts = (byPerson.get(key) || []).filter(d => room(d) > 0 && inWindow(d, c.date));
      const total = debts.reduce((a, d) => a + room(d), 0);
      const why = s === 4 ? 'you said yes to this wording before' : s >= 2 ? 'the name is in the bank wording' : 'it looks like their initials';
      const one = debts.find(d => Math.abs(room(d) - A) <= 1);
      let sug = null;
      if (one) { sug = mk(c, key, 'exact', s >= 2 ? 'high' : 'medium', [alloc(one, room(one))], { why }); reserve(one, room(one)); }
      else if (debts.length && Math.abs(total - A) <= 1) { sug = mk(c, key, 'several', 'medium', debts.map(d => alloc(d, room(d))), { why }); debts.forEach(d => reserve(d, room(d))); }
      else {
        const subs = A < total && debts.length > 1 ? subsetsSumming(debts.map(d => ({ d, p: room(d) })), A, 6, 14) : [];
        const cover = !subs.length && dir === 'in' ? coverFor(key, A, c) : null;
        if (subs.length) { const pick = subs[0].map(x => x.d); sug = mk(c, key, 'several', 'medium', pick.map(d => alloc(d, room(d))), { why }); pick.forEach(d => reserve(d, room(d))); }
        else if (cover) {
          const hinted = cover.allocs.find(d => d.l.key !== key && S.people[key] && S.people[key].paysFor && S.people[key].paysFor[d.l.key]);
          sug = mk(c, key, 'cover', 'medium', cover.allocs.map(d => alloc(d, room(d))), { why: hinted ? `${nameOf(S, key)} has paid for ${nameOf(S, hinted.l.key)} before` : why, options: cover.options, everyone: cover.everyone, title: cover.title });
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
      const d = ds.find(x => room(x) > 0 && inWindow(x, c.date) && Math.abs(room(x) - A) <= 1);
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
  const sug = [...matchRun(S, credits, { kinds: ['split', 'expect'], dir: 'in', aliases, today, skip }), ...matchRun(S, debits, { kinds: ['iowe'], dir: 'out', aliases, today, skip, minWeak: Infinity })];
  sug.sort((a, b) => CONF[a.conf] - CONF[b.conf] || b.date.localeCompare(a.date));
  if (sug[0] && sug[0].conf === 'high') sug[0].top = true;
  return sug;
}
/** Money out from an analysis (the same shape as creditsFromAnalysis in lib/expenses.mjs). */
export function debitsFromAnalysis(analysis, { today, days = 180 } = {}) {
  const tx = analysis && Array.isArray(analysis.transactions) ? analysis.transactions : [];
  const from = isIso(today) ? addDays(today, -days) : '';
  const out = [];
  for (const t of tx) {
    if (!t || !(Number(t.a) < 0) || !isIso(t.d) || (from && t.d < from)) continue;
    out.push({ txKey: txKeyFrom(t), k: typeof t.k === 'string' ? t.k : '', date: t.d, amount: -Number(t.a), memo: String(t.memo || ''), merchant: String(t.m || '') });
    if (out.length >= 800) break;
  }
  return out;
}
const txKeyFrom = (t) => `${t.d}|${Number(t.a).toFixed(2)}|${t.acct == null ? '' : t.acct}|${String(t.memo == null ? '' : t.memo).toUpperCase()}`.slice(0, 300);

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
    out.push({ k: t.k, txKey, d: t.d, a: Number(t.a), m, c: t.c, memo: line(t.memo, 140) });
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
  return { v: 1, prefs: S.prefs, things, persons: list, people, groups, trips, transfers: transfersOf(S), summary: sum, proposed: S.proposed, notes: S.notes };
}

// ─── Changes (each one a journalled step, so one Undo) ──────────────────────
/** Make the lines of a thing from the page's or the assistant's input. -> {thing fields} or {error}. */
function buildThing(S, touch, raw, { today, home }) {
  const kind = KINDS.includes(raw.kind) ? raw.kind : 'split';
  const title = line(raw.title, 140), total = Number(raw.total);
  if (!title) return { error: 'Say what it was for.' };
  if (!Number.isFinite(total) || total <= 0 || total > 1e7) return { error: 'Put in the amount first.' };
  const date = isIso(raw.date) ? raw.date : today;
  const base = { kind, title, total: money(total), date, currency: raw.currency, source: raw.source, merchant: raw.merchant, note: raw.note, due: raw.due, tripId: raw.tripId, expectKind: raw.expectKind, fromExpense: raw.fromExpense };
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
    const r = computeSplit(total, others, { method: raw.method, meIn: true, myWeight: raw.myWeight, myExtra: raw.myExtra });
    if (r.error) return r;
    if (!(r.me > 0)) return { error: 'As it stands you owe nothing for this.' };
    return { ...base, kind: 'iowe', payer, method: r.method, meIn: true, myShare: r.me, rounding: r.rounding, myWeight: raw.myWeight, myExtra: raw.myExtra, lines: [{ key: payer, owes: r.me }],
      others: r.lines.filter(l => l.key !== payer).map(l => ({ key: l.key, amount: l.owes })) };
  }
  const r = computeSplit(total, people, { method: raw.method, meIn: raw.meIn !== false, myWeight: raw.myWeight, myExtra: raw.myExtra });
  if (r.error) return r;
  const byKey = new Map(people.map(p => [p.key, p]));
  return { ...base, method: r.method, meIn: raw.meIn !== false, myShare: r.me, rounding: r.rounding, myWeight: raw.myWeight, myExtra: raw.myExtra,
    lines: r.lines.map(l => { const p = byKey.get(l.key); return { key: l.key, owes: l.owes, ...(r.method === 'shares' ? { weight: p.weight == null ? 1 : p.weight } : {}), ...(r.method === 'percent' ? { pct: p.pct } : {}), ...(r.method === 'exact' ? { exact: p.exact } : {}), ...(r.method === 'items' && Number(p.extra) > 0 ? { extra: p.extra, what: p.what } : {}) }; }) };
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
    const b = buildThing(S, touch, { source: prev.source, merchant: prev.merchant, tripId: prev.tripId, fromExpense: prev.fromExpense, ...raw }, { today, home });
    if (b.error) return { error: b.error, write: false };
    const old = new Map(prev.lines.map(l => [l.key, l]));
    const lost = prev.lines.find(l => l.payments.length && !b.lines.some(n => n.key === l.key));
    if (lost) return { error: `${nameOf(S, lost.key)} has already paid something towards this, so they stay on it. Say they did not pay first.`, write: false };
    b.lines = b.lines.map(n => { const o = old.get(n.key); return o ? { ...o, ...n, payments: o.payments } : n; });
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
    const r = applyTx(S, touch, sug, allocs, { learnKey: key, payer: key });
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
  const S0 = await readStore(dataDir, { home });
  const al = aliases ? aliases(S0) : null;
  const m0 = findMatches(S0, credits, { debits, today, aliases: al, skip });
  if (!S0.prefs.autoMark || !m0.some(s => s.conf === 'high' && s.kind === 'exact')) return { suggestions: m0, auto: [] };
  const r = await mutate(dataDir, 'Marked paid from the bank', (S, touch) => {
    const auto = [];
    for (const s of findMatches(S, credits, { debits, today, aliases: al, skip })) if (s.conf === 'high' && s.kind === 'exact' && !applyTx(S, touch, s, s.allocs, { learnKey: s.key }).error) auto.push(s);
    return { auto };
  }, { home });
  const S1 = await readStore(dataDir, { home });
  return { suggestions: findMatches(S1, credits, { debits, today, aliases: al, skip }), auto: r.auto || [], ...(r.undo ? { undo: r.undo } : {}) };
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
