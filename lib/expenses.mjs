// lib/expenses.mjs - Expenses (2.18.1): money you spent for someone else (an employer, a client, a
// friend) and are waiting to be paid back. Label a transaction (or add one by hand), keep the
// receipt, send a claim, and OpenDash notices when the money arrives.
//
//   <data>/expenses/expenses.json  {v: 1, prefs, payers: {key: payer}, items: {id: expense},
//                                   claims: {id: claim}, reports: {id: report}, hints: {key: ms}, asks: {key: ms}}
//   <data>/expenses/receipts/rc-<16 hex of the SHA-256>.<pdf|png|jpg|webp|gif>   the receipt files
//   <data>/expenses/journal.json   the last undo steps (stays on this computer)
//
// expense  {id, title, amount, currency, date, payer, status: 'to-claim'|'submitted'|'paid',
//           source: {type: 'tx'|'manual'|'task'|'mail'|'mcp', txKey?, k?}, merchant?, receipts: [receipt],
//           taskIds: [], tasks?: {submit?, check?}, claimId?, paidAt?, paidTxKey?, note?, category?,
//           vat?, foreign?: {amount, currency, rate}, kind?: 'mileage', miles?, rate?, createdAt}
// claim    {id, payer, expenseIds, submittedAt, method, total, note?, createdAt}
// report   {id, dir, payer, count, total, ids: [every expense on the form], moved: [those it moved to submitted],
//           claimId?, from, to, at, createdAt, undoneAt?}: one "Make expense report" (dir: its folder on the computer that made it)
// payer    {name, match: [UPPERCASE words found in the bank text], deadline: {mode: 'none'|'monthEnd'|'day', day?},
//           checkDays?, kind?, uses, last}
// receipt  {ref: 'rc-....pdf', name, size, at} | {mail: {id, src?, subject, from, date, link?}, at}
//
// PRIVACY: this file is private. It syncs only between the user's own devices and only with end-to-end
// encryption (lib/sync/manifest.mjs, the `── expenses ──` block); lib/friends/share.mjs never reads it and
// nothing here calls out. Receipt names are made here from the file's hash, never from the upload's name.
// No network, no Claude.

import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import { readJson, writeJson, withLock, atomicWrite } from './fsutil.mjs';
import { dataPaths } from './datadir.mjs';

export const STATUSES = Object.freeze(['to-claim', 'submitted', 'paid']);
export const METHODS = Object.freeze(['email', 'portal', 'in-person', 'other', '']);
export const SOURCE_TYPES = Object.freeze(['tx', 'manual', 'task', 'mail', 'mcp']);
export const RECEIPT_MAX = 5 * 1024 * 1024;
export const RECEIPT_RE = /^rc-[0-9a-f]{16}\.(pdf|png|jpg|webp|gif)$/;
export const ID_RE = /^[xcp]-[a-z0-9]{6,30}$/;
export const REPORT_ID_RE = /^r-[a-z0-9]{6,30}$/;
const TASK_ID_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
const MAX_ITEMS = 5000;
const MAX_RECEIPTS = 12;
const MAX_JOURNAL = 40;
const DAY = 86400000;

export const DEFAULT_PREFS = Object.freeze({ autoTasks: true, hints: true, reminders: true, mileageRate: 0.45, checkDays: 14, windowDays: 60 });

export const expensesDir = (dataDir) => join(dataPaths(dataDir).root, 'expenses');
export const expensesFile = (dataDir) => join(expensesDir(dataDir), 'expenses.json');
export const receiptsDir = (dataDir) => join(expensesDir(dataDir), 'receipts');
const journalFile = (dataDir) => join(expensesDir(dataDir), 'journal.json');

// ─── small helpers ──────────────────────────────────────────────────────────
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
export const pence = (n) => Math.round(Number(n) * 100 + (Number(n) < 0 ? -1e-9 : 1e-9));
const money = (n) => Math.round(Number(n) * 100) / 100;
const line = (v, n = 120) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '');
const text = (v, n = 600) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n) : '');
export const isIso = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
export const addDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / DAY);
export const newId = (p) => `${p}-${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
/** A payer's key: the name, lower case, letters and digits only ("Acme Ltd." -> "acme-ltd"). */
export const payerKey = (name) => line(name, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
/** The finance de-dup key of a transaction of the analysis ({d, a, acct, memo}); lib/finance/store.mjs rowKeyStr. */
// tk: a payment that was pending keeps the txKey it had then (lib/finance/pending.mjs), so what is linked to it stays linked when it settles.
export const txKeyOf = (t) => (typeof t.tk === 'string' && t.tk ? t.tk : `${t.d}|${Number(t.a).toFixed(2)}|${t.acct == null ? '' : t.acct}|${String(t.memo == null ? '' : t.memo).toUpperCase()}`.slice(0, 300));

// ─── cleaning ───────────────────────────────────────────────────────────────
export function cleanPrefs(raw, base = DEFAULT_PREFS) {
  const o = { ...DEFAULT_PREFS, ...(isObj(base) ? base : {}) };
  if (!isObj(raw)) return o;
  for (const k of ['autoTasks', 'hints', 'reminders']) if (typeof raw[k] === 'boolean') o[k] = raw[k];
  const n = (v, lo, hi) => (Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi ? Number(v) : null);
  const r = n(raw.mileageRate, 0, 10); if (r != null) o.mileageRate = money(r);
  const c = n(raw.checkDays, 1, 120); if (c != null) o.checkDays = Math.round(c);
  const w = n(raw.windowDays, 7, 365); if (w != null) o.windowDays = Math.round(w);
  return o;
}

export function cleanPayer(raw, prev = null) {
  if (!isObj(raw)) return null;
  const name = line(raw.name != null ? raw.name : prev && prev.name, 80);
  if (!name || !payerKey(name)) return null;
  const out = { name, match: [], deadline: { mode: 'none' }, uses: Math.max(0, Math.min(1e6, Math.round(Number(own(raw, 'uses') ? raw.uses : prev && prev.uses) || 0))), last: '' };
  const m = Array.isArray(raw.match) ? raw.match : prev && Array.isArray(prev.match) ? prev.match : [];
  out.match = [...new Set(m.map(x => line(String(x), 40).toUpperCase()).filter(x => x.length >= 3))].slice(0, 6);
  const d = isObj(raw.deadline) ? raw.deadline : prev && isObj(prev.deadline) ? prev.deadline : null;
  if (d && d.mode === 'monthEnd') out.deadline = { mode: 'monthEnd' };
  else if (d && d.mode === 'day' && Number(d.day) >= 1 && Number(d.day) <= 28) out.deadline = { mode: 'day', day: Math.round(Number(d.day)) };
  const cd = own(raw, 'checkDays') ? raw.checkDays : prev && prev.checkDays;
  if (Number.isFinite(Number(cd)) && Number(cd) >= 1 && Number(cd) <= 120) out.checkDays = Math.round(Number(cd));
  const kind = own(raw, 'kind') ? raw.kind : prev && prev.kind;
  if (['employer', 'client', 'friend', 'other'].includes(kind)) out.kind = kind;
  const last = own(raw, 'last') ? raw.last : prev && prev.last;
  if (isIso(last)) out.last = last;
  return out;
}

function cleanReceipt(r) {
  if (!isObj(r)) return null;
  const at = line(r.at, 40);
  const base = { at: Number.isFinite(Date.parse(at)) ? at : new Date().toISOString() };
  if (typeof r.ref === 'string' && RECEIPT_RE.test(r.ref)) {
    return { ref: r.ref, name: line(r.name, 80) || 'Receipt', size: Math.max(0, Math.min(RECEIPT_MAX, Math.round(Number(r.size) || 0))), ...base };
  }
  if (isObj(r.mail)) {
    const id = line(r.mail.id, 120);
    if (!id) return null;
    const m = { id, subject: line(r.mail.subject, 160), from: line(r.mail.from, 120), date: line(r.mail.date, 40) };
    const src = line(r.mail.src, 60); if (src) m.src = src;
    // A link with a query could carry a sign-in token: only plain mail links are kept.
    if (typeof r.mail.link === 'string' && /^https:\/\/(mail\.google\.com|outlook\.(live|office|office365)\.com)\/[A-Za-z0-9\/#._~%-]{1,300}$/.test(r.mail.link)) m.link = r.mail.link;
    return { mail: m, ...base };
  }
  return null;
}

/** An expense from the page, MCP or a script, checked and trimmed; null when it is not one. `prev`: the stored one. */
export function cleanExpense(raw, { prev = null, home = 'GBP', today = null } = {}) {
  if (!isObj(raw)) return null;
  const pick = (k) => (own(raw, k) ? raw[k] : prev ? prev[k] : undefined);
  const id = prev ? prev.id : typeof raw.id === 'string' && ID_RE.test(raw.id) ? raw.id : null;
  const title = line(pick('title'), 140);
  const kind = pick('kind') === 'mileage' ? 'mileage' : null;
  let amount = Number(pick('amount'));
  const out = { id, title, kind: kind || undefined };
  if (kind) {
    const miles = Number(pick('miles')), rate = Number(pick('rate'));
    if (!(miles > 0 && miles <= 100000) || !(rate >= 0 && rate <= 10)) return null;
    out.miles = Math.round(miles * 10) / 10; out.rate = money(rate);
    amount = money(out.miles * out.rate);
  }
  if (!title || !Number.isFinite(amount) || amount <= 0 || amount > 1e7) return null;
  out.amount = money(amount);
  const cur = String(pick('currency') || home).toUpperCase();
  out.currency = /^[A-Z]{3}$/.test(cur) ? cur : home;
  const date = pick('date');
  out.date = isIso(date) ? date : today && isIso(today) ? today : null;
  if (!out.date) return null;
  out.payer = line(pick('payer'), 80);
  const st = pick('status');
  out.status = STATUSES.includes(st) ? st : 'to-claim';
  const src = pick('source');
  const s = { type: isObj(src) && SOURCE_TYPES.includes(src.type) ? src.type : 'manual' };
  if (isObj(src) && typeof src.txKey === 'string' && src.txKey) s.txKey = src.txKey.slice(0, 300);
  if (isObj(src) && typeof src.k === 'string' && /^[0-9a-f]{12}$/.test(src.k)) s.k = src.k;
  out.source = s;
  const merchant = line(pick('merchant'), 60); if (merchant) out.merchant = merchant;
  const rc = pick('receipts');
  out.receipts = (Array.isArray(rc) ? rc : []).slice(0, MAX_RECEIPTS).map(cleanReceipt).filter(Boolean);
  const ti = pick('taskIds');
  out.taskIds = [...new Set((Array.isArray(ti) ? ti : []).filter(t => typeof t === 'string' && TASK_ID_RE.test(t)))].slice(0, 8);
  const tk = pick('tasks');
  if (isObj(tk)) {
    const t = {};
    for (const k of ['submit', 'check']) if (typeof tk[k] === 'string' && TASK_ID_RE.test(tk[k])) t[k] = tk[k];
    if (Object.keys(t).length) out.tasks = t;
  }
  const cid = pick('claimId'); if (typeof cid === 'string' && ID_RE.test(cid)) out.claimId = cid;
  const paidAt = pick('paidAt'); if (isIso(paidAt)) out.paidAt = paidAt;
  const ptx = pick('paidTxKey'); if (typeof ptx === 'string' && ptx) out.paidTxKey = ptx.slice(0, 300);
  const note = text(pick('note'), 600); if (note) out.note = note;
  const cat = line(pick('category'), 40); if (cat) out.category = cat;
  const vat = Number(pick('vat'));
  if (pick('vat') != null && pick('vat') !== '' && Number.isFinite(vat) && vat >= 0 && vat <= out.amount) out.vat = money(vat);
  const fx = pick('foreign');
  if (isObj(fx) && Number(fx.amount) > 0 && /^[A-Za-z]{3}$/.test(String(fx.currency || '')) && Number(fx.rate) > 0) out.foreign = { amount: money(fx.amount), currency: String(fx.currency).toUpperCase(), rate: Math.round(Number(fx.rate) * 1e6) / 1e6 };
  const ca = prev && prev.createdAt ? prev.createdAt : raw.createdAt;
  out.createdAt = Number.isFinite(Date.parse(String(ca))) ? String(ca).slice(0, 40) : new Date().toISOString();
  if (out.status !== 'paid') { delete out.paidAt; delete out.paidTxKey; }
  if (out.status === 'to-claim') delete out.claimId;
  if (out.kind === undefined) delete out.kind;
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

export function cleanClaim(raw, prev = null) {
  if (!isObj(raw)) return null;
  const id = prev ? prev.id : typeof raw.id === 'string' && ID_RE.test(raw.id) ? raw.id : null;
  const ids = [...new Set((Array.isArray(raw.expenseIds) ? raw.expenseIds : prev ? prev.expenseIds : []).filter(x => typeof x === 'string' && ID_RE.test(x)))].slice(0, 100);
  const at = own(raw, 'submittedAt') ? raw.submittedAt : prev && prev.submittedAt;
  if (!ids.length || !isIso(at)) return null;
  const method = own(raw, 'method') ? raw.method : prev ? prev.method : '';
  const total = Number(own(raw, 'total') ? raw.total : prev && prev.total);
  const out = { id, payer: line(own(raw, 'payer') ? raw.payer : prev && prev.payer, 80), expenseIds: ids, submittedAt: at, method: METHODS.includes(method) ? method : 'other', total: Number.isFinite(total) ? money(total) : 0 };
  const note = text(own(raw, 'note') ? raw.note : prev && prev.note, 400); if (note) out.note = note;
  const ca = prev && prev.createdAt ? prev.createdAt : raw.createdAt;
  out.createdAt = Number.isFinite(Date.parse(String(ca))) ? String(ca).slice(0, 40) : new Date().toISOString();
  return out;
}

/** A made report, checked and trimmed; null when it is not one. */
export function cleanReport(raw) {
  if (!isObj(raw) || typeof raw.id !== 'string' || !REPORT_ID_RE.test(raw.id)) return null;
  const list = (v) => [...new Set((Array.isArray(v) ? v : []).filter(x => typeof x === 'string' && ID_RE.test(x)))].slice(0, 200);
  const ids = list(raw.ids);
  const dir = typeof raw.dir === 'string' ? raw.dir.replace(/[\u0000-\u001f]/g, '').slice(0, 500) : '';
  if (!ids.length || !dir || !isIso(raw.at)) return null;
  const total = Number(raw.total);
  const out = { id: raw.id, dir, payer: line(raw.payer, 80), count: Math.max(0, Math.min(1000, Math.round(Number(raw.count) || ids.length))), total: Number.isFinite(total) ? money(total) : 0, ids, moved: list(raw.moved), at: raw.at };
  if (typeof raw.claimId === 'string' && ID_RE.test(raw.claimId)) out.claimId = raw.claimId;
  if (isIso(raw.from)) out.from = raw.from;
  if (isIso(raw.to)) out.to = raw.to;
  if (isIso(raw.undoneAt)) out.undoneAt = raw.undoneAt;
  out.createdAt = Number.isFinite(Date.parse(String(raw.createdAt))) ? String(raw.createdAt).slice(0, 40) : new Date().toISOString();
  return out;
}

// ─── the store ──────────────────────────────────────────────────────────────
export function emptyStore() { return { v: 1, prefs: { ...DEFAULT_PREFS }, payers: {}, items: {}, claims: {}, reports: {}, hints: {}, asks: {} }; }
export function normStore(raw, { home = 'GBP' } = {}) {
  const S = emptyStore();
  if (!isObj(raw)) return S;
  S.prefs = cleanPrefs(raw.prefs);
  for (const [k, v] of Object.entries(isObj(raw.payers) ? raw.payers : {}).slice(0, 200)) { const p = cleanPayer(v); if (p && payerKey(p.name) === k) S.payers[k] = p; }
  for (const [k, v] of Object.entries(isObj(raw.items) ? raw.items : {}).slice(0, MAX_ITEMS)) { const e = cleanExpense({ ...v, id: k }, { home, today: v && v.date }); if (e && e.id === k) S.items[k] = e; }
  for (const [k, v] of Object.entries(isObj(raw.claims) ? raw.claims : {}).slice(0, MAX_ITEMS)) { const c = cleanClaim({ ...v, id: k }); if (c && c.id === k) S.claims[k] = c; }
  for (const [k, v] of Object.entries(isObj(raw.reports) ? raw.reports : {}).slice(0, MAX_ITEMS)) { const r = cleanReport({ ...v, id: k }); if (r) S.reports[k] = r; }
  for (const key of ['hints', 'asks']) for (const [k, v] of Object.entries(isObj(raw[key]) ? raw[key] : {}).slice(0, 2000)) if (k.length <= 200 && Number.isFinite(Number(v))) S[key][k] = Number(v);
  return S;
}
export async function readStore(dataDir, opts) { return normStore(await readJson(expensesFile(dataDir), { fallback: null }).catch(() => null), opts); }

const KINDS = ['items', 'claims', 'payers', 'reports', 'hints', 'asks'];
/**
 * A private JSON file with Undo: mutate and undoChange over one store. Expenses and Owed to me (lib/owed.mjs) use it.
 * o: {file(dataDir), dir(dataDir), journal(dataDir), kinds: [keyed parts of the store], norm(raw, opts), cleanPrefs(raw)}
 */
export function journalledStore({ file: fileOf, dir: dirOf, journal: journalOf, kinds, norm, cleanPrefs: prefsOf }) {
  async function journalPush(dataDir, entry) {
    const f = journalOf(dataDir);
    await withLock(f, async () => {
      const j = await readJson(f, { fallback: null }).catch(() => null);
      const list = (isObj(j) && Array.isArray(j.entries) ? j.entries : []).filter(e => e && Date.now() - e.ms < 7 * DAY);
      list.push(entry);
      await writeJson(f, { v: 1, entries: list.slice(-MAX_JOURNAL) });
    });
  }
  /**
   * Change the store under its lock. fn(S, touch) edits S; touch(kind, key) first records what was there, so
   * the change can be undone. Returns what fn returned plus `undo` (a journal id), or no `undo` if nothing changed.
   */
  async function mutate(dataDir, label, fn, { home = 'GBP' } = {}) {
    const file = fileOf(dataDir);
    const res = await withLock(file, async () => {
      const S = norm(await readJson(file, { fallback: null }).catch(() => null), { home });
      const before = { prefs: undefined };
      for (const k of kinds) before[k] = {};
      const touch = (kind, key) => {
        if (kind === 'prefs') { if (before.prefs === undefined) before.prefs = clone(S.prefs); return; }
        if (!before[kind] || own(before[kind], key)) return;
        before[kind][key] = S[kind][key] === undefined ? null : clone(S[kind][key]);
      };
      const r = (await fn(S, touch)) || {};
      if (r.write === false) return r;
      await fsp.mkdir(dirOf(dataDir), { recursive: true });
      await writeJson(file, S);
      const empty = !kinds.some(k => Object.keys(before[k]).length) && before.prefs === undefined;
      return { ...r, S, ...(empty ? {} : { _journal: { id: newId('u'), at: new Date().toISOString(), ms: Date.now(), label: line(label, 80), before } }) };
    });
    if (res._journal) { await journalPush(dataDir, res._journal).catch(() => {}); res.undo = res._journal.id; delete res._journal; }
    return res;
  }
  /** Put back what one change replaced. Returns {ok, label} or {ok: false, error}. */
  async function undoChange(dataDir, id, { home = 'GBP' } = {}) {
    if (typeof id !== 'string' || !/^u-[a-z0-9]{6,30}$/.test(id)) return { ok: false, error: 'That step cannot be undone any more.' };
    const f = journalOf(dataDir);
    const j = await readJson(f, { fallback: null }).catch(() => null);
    const e = isObj(j) && Array.isArray(j.entries) ? j.entries.find(x => x && x.id === id) : null;
    if (!e || !isObj(e.before)) return { ok: false, error: 'That step cannot be undone any more.' };
    const r = await mutate(dataDir, 'Undo: ' + e.label, (S) => {
      for (const k of kinds) for (const [key, v] of Object.entries(e.before[k] || {})) { if (v === null) delete S[k][key]; else S[k][key] = v; }
      if (e.before.prefs) S.prefs = prefsOf(e.before.prefs);
      return {};
    }, { home });
    await withLock(f, async () => {
      const j2 = await readJson(f, { fallback: null }).catch(() => null);
      await writeJson(f, { v: 1, entries: (isObj(j2) && Array.isArray(j2.entries) ? j2.entries : []).filter(x => x && x.id !== id) });
    }).catch(() => {});
    return { ok: true, label: e.label, S: r.S };
  }
  return { mutate, undoChange };
}
export const { mutate, undoChange } = journalledStore({ file: expensesFile, dir: expensesDir, journal: journalFile, kinds: KINDS, norm: normStore, cleanPrefs });

// ─── deadlines, totals, the page's view ─────────────────────────────────────
/** The next claim deadline of a payer on/after `today` (ISO), or null. */
export function nextDeadline(payer, today) {
  if (!payer || !payer.deadline || !isIso(today)) return null;
  const [y, m, d] = today.split('-').map(Number);
  if (payer.deadline.mode === 'monthEnd') return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  if (payer.deadline.mode === 'day') {
    const day = payer.deadline.day;
    const here = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (here >= today) return here;
    const nm = new Date(Date.UTC(y, m, day)).toISOString().slice(0, 10);
    return nm;
  }
  return null;
}
export const sumOf = (list) => money(list.reduce((a, e) => a + e.amount, 0));
/** Money owed to the user: not yet paid. {total, count, to-claim/submitted splits, oldest age, per payer}. */
export function owedSummary(S, today) {
  const open = Object.values(S.items).filter(e => e.status !== 'paid');
  const per = new Map();
  for (const e of open) {
    const k = payerKey(e.payer) || '-';
    const p = per.get(k) || { payer: e.payer || 'No payer yet', key: k, total: 0, count: 0, toClaim: 0, submitted: 0, oldest: e.date };
    p.total = money(p.total + e.amount); p.count++;
    if (e.status === 'to-claim') p.toClaim++; else p.submitted++;
    if (e.date < p.oldest) p.oldest = e.date;
    per.set(k, p);
  }
  const payers = [...per.values()].sort((a, b) => b.total - a.total);
  const oldest = open.reduce((m, e) => (m && m < e.date ? m : e.date), '');
  const reminders = [];
  const toClaim = open.filter(e => e.status === 'to-claim');
  if (toClaim.length) {
    let soon = null;
    for (const e of toClaim) { const d = nextDeadline(S.payers[payerKey(e.payer)], today); if (d && (!soon || d < soon.date)) soon = { date: d, payer: e.payer }; }
    reminders.push({ kind: 'to-claim', count: toClaim.length, deadline: soon ? soon.date : null, days: soon ? daysBetween(today, soon.date) : null, payer: soon ? soon.payer : '' });
  }
  return { total: sumOf(open), count: open.length, toClaimTotal: sumOf(toClaim), toClaimCount: toClaim.length, submittedCount: open.length - toClaim.length, oldest, oldestDays: oldest && isIso(today) ? Math.max(0, daysBetween(oldest, today)) : 0, payers, reminders };
}
export function publicView(S, today) {
  return {
    v: 1, prefs: S.prefs, payers: Object.entries(S.payers).map(([key, p]) => ({ key, ...p })).sort((a, b) => (b.last || '').localeCompare(a.last || '') || b.uses - a.uses),
    items: Object.values(S.items).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    claims: Object.values(S.claims).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    reports: Object.values(S.reports).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    hints: S.hints, summary: owedSummary(S, today),
  };
}
/** A year at a glance: expensed, claimed, paid back, per payer and month. */
export function yearSummary(S, year) {
  const y = String(year);
  const inYear = Object.values(S.items).filter(e => e.date.startsWith(y));
  const paidBack = Object.values(S.items).filter(e => e.status === 'paid' && (e.paidAt || e.date).startsWith(y));
  const months = Array.from({ length: 12 }, (_, i) => ({ month: `${y}-${String(i + 1).padStart(2, '0')}`, expensed: 0, paid: 0 }));
  for (const e of inYear) months[Number(e.date.slice(5, 7)) - 1].expensed = money(months[Number(e.date.slice(5, 7)) - 1].expensed + e.amount);
  for (const e of paidBack) { const m = months[Number((e.paidAt || e.date).slice(5, 7)) - 1]; m.paid = money(m.paid + e.amount); }
  const perPayer = new Map();
  for (const e of inYear) { const k = e.payer || 'No payer'; const p = perPayer.get(k) || { payer: k, expensed: 0, paid: 0, count: 0 }; p.expensed = money(p.expensed + e.amount); p.count++; if (e.status === 'paid') p.paid = money(p.paid + e.amount); perPayer.set(k, p); }
  return { year: y, expensed: sumOf(inYear), count: inYear.length, paidBack: sumOf(paidBack), outstanding: sumOf(inYear.filter(e => e.status !== 'paid')), vat: money(inYear.reduce((a, e) => a + (e.vat || 0), 0)), months, payers: [...perPayer.values()].sort((a, b) => b.expensed - a.expensed) };
}

// ─── operations (each one a journalled change) ──────────────────────────────
function rememberPayer(S, touch, name, today) {
  const k = payerKey(name); if (!k) return null;
  touch('payers', k);
  const prev = S.payers[k] || null;
  const p = cleanPayer({ name: prev ? prev.name : name, match: prev ? prev.match : [line(name, 40).toUpperCase()].filter(x => x.length >= 3), uses: (prev ? prev.uses : 0) + 1, last: today || (prev && prev.last) || '' }, prev);
  S.payers[k] = p;
  return k;
}
export async function createExpense(dataDir, raw, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Add expense', (S, touch) => {
    if (Object.keys(S.items).length >= MAX_ITEMS) return { error: 'There are too many expenses; delete some old ones first.', write: false };
    const e = cleanExpense({ ...raw, id: undefined }, { home, today });
    if (!e) return { error: 'An expense needs a title, an amount above zero and a date.', write: false };
    if (raw && typeof raw.id === 'string' && ID_RE.test(raw.id) && !S.items[raw.id]) e.id = raw.id; else e.id = newId('x');
    // The same bank transaction is only one expense.
    if (e.source.txKey) { const dup = Object.values(S.items).find(x => x.source && x.source.txKey === e.source.txKey); if (dup) return { error: 'That transaction is already an expense.', duplicate: dup.id, write: false }; }
    e.status = 'to-claim'; delete e.claimId; delete e.paidAt; delete e.paidTxKey;
    touch('items', e.id);
    S.items[e.id] = e;
    if (e.payer) rememberPayer(S, touch, e.payer, today);
    return { id: e.id, expense: e };
  }, { home });
}
/** Several expenses as one change (one undo). Ones that are already there, or not valid, are left out and counted. */
export async function createExpenses(dataDir, raws, { today, home = 'GBP' } = {}) {
  const list = Array.isArray(raws) ? raws.slice(0, 200) : [];
  return mutate(dataDir, `Add ${list.length} expenses`, (S, touch) => {
    const ids = [];
    let skipped = 0;
    for (const raw of list) {
      if (Object.keys(S.items).length >= MAX_ITEMS) { skipped++; continue; }
      const e = cleanExpense({ ...raw, id: undefined }, { home, today });
      if (!e) { skipped++; continue; }
      e.id = newId('x');
      if (e.source.txKey && Object.values(S.items).some(x => x.source && x.source.txKey === e.source.txKey)) { skipped++; continue; }
      e.status = 'to-claim'; delete e.claimId; delete e.paidAt; delete e.paidTxKey;
      touch('items', e.id);
      S.items[e.id] = e;
      if (e.payer) rememberPayer(S, touch, e.payer, today);
      ids.push(e.id);
    }
    if (!ids.length) return { error: skipped ? 'Those are expenses already, or could not be added.' : 'Nothing to add.', write: false };
    return { ids, skipped };
  }, { home });
}
export async function updateExpense(dataDir, id, patch, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Edit expense', (S, touch) => {
    const prev = S.items[id];
    if (!prev) return { error: 'That expense is gone.', write: false };
    const safe = isObj(patch) ? { ...patch } : {};
    for (const k of ['id', 'status', 'claimId', 'paidAt', 'paidTxKey', 'createdAt']) delete safe[k];
    const e = cleanExpense({ ...prev, ...safe }, { prev, home, today });
    if (!e) return { error: 'An expense needs a title, an amount above zero and a date.', write: false };
    // A claim's total follows its expenses.
    touch('items', id); S.items[id] = e;
    if (e.claimId && S.claims[e.claimId]) { touch('claims', e.claimId); S.claims[e.claimId].total = sumOf(S.claims[e.claimId].expenseIds.map(x => S.items[x]).filter(Boolean)); }
    if (e.payer && e.payer !== prev.payer) rememberPayer(S, touch, e.payer, today);
    return { id, expense: e };
  }, { home });
}
export async function deleteExpenses(dataDir, ids, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Delete expense', (S, touch) => {
    let n = 0;
    for (const id of (Array.isArray(ids) ? ids : []).slice(0, 200)) {
      const e = S.items[id]; if (!e) continue;
      touch('items', id); delete S.items[id]; n++;
      const c = e.claimId && S.claims[e.claimId];
      if (c) { touch('claims', c.id); const left = c.expenseIds.filter(x => x !== id && S.items[x]); if (!left.length) delete S.claims[c.id]; else { c.expenseIds = left; c.total = sumOf(left.map(x => S.items[x])); } }
    }
    return n ? { removed: n } : { error: 'Nothing to delete.', write: false };
  }, { home });
}
/** Send a claim: the chosen expenses (to-claim, one payer) become submitted. */
export async function submitClaim(dataDir, ids, { payer, method = '', date, note = '', today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Submit claim', (S, touch) => {
    const list = [...new Set(Array.isArray(ids) ? ids : [])].map(id => S.items[id]).filter(e => e && e.status === 'to-claim');
    if (!list.length) return { error: 'Choose at least one expense that is still to claim.', write: false };
    const who = line(payer, 80) || list[0].payer;
    const at = isIso(date) ? date : today;
    if (!isIso(at)) return { error: 'The date is missing.', write: false };
    const c = cleanClaim({ id: newId('c'), payer: who, expenseIds: list.map(e => e.id), submittedAt: at, method, total: sumOf(list), note });
    if (!c) return { error: 'That claim could not be made.', write: false };
    touch('claims', c.id); S.claims[c.id] = c;
    for (const e of list) { touch('items', e.id); S.items[e.id] = { ...e, status: 'submitted', claimId: c.id, payer: e.payer || who }; }
    if (who) rememberPayer(S, touch, who, today);
    return { claimId: c.id, claim: c, ids: list.map(e => e.id) };
  }, { home });
}
/**
 * A report was made (lib/expense-report.mjs wrote its folder): keep it in the list, and in one step (one Undo) move its
 * expenses that were still to claim to submitted, as one claim.
 */
export async function recordReport(dataDir, { ids, dir, payer = '', count, total, from, to, today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Make expense report', (S, touch) => {
    const all = [...new Set(Array.isArray(ids) ? ids : [])].map(id => S.items[id]).filter(Boolean);
    if (!all.length) return { error: 'Those expenses are gone.', write: false };
    const open = all.filter(e => e.status === 'to-claim');
    const who = line(payer, 80) || all[0].payer;
    let claim = null;
    if (open.length) {
      claim = cleanClaim({ id: newId('c'), payer: who, expenseIds: open.map(e => e.id), submittedAt: today, method: 'other', total: sumOf(open) });
      if (!claim) return { error: 'That report could not be saved.', write: false };
      touch('claims', claim.id); S.claims[claim.id] = claim;
      for (const e of open) { touch('items', e.id); S.items[e.id] = { ...e, status: 'submitted', claimId: claim.id, payer: e.payer || who }; }
      if (who) rememberPayer(S, touch, who, today);
    }
    const report = cleanReport({ id: newId('r'), dir, payer: who, count: count || all.length, total: total == null ? sumOf(all) : total, ids: all.map(e => e.id), moved: open.map(e => e.id), claimId: claim ? claim.id : undefined, from, to, at: today });
    if (!report) return { error: 'That report could not be saved.', write: false };
    touch('reports', report.id); S.reports[report.id] = report;
    return { report, ids: report.moved };
  }, { home });
}
/**
 * Undo a report, whenever: every expense it moved goes back to "to claim" and its claim goes away. An expense since put
 * in another claim stays where it is. The folder stays too (only deleteReportRecord's caller removes it); the report
 * stays in the list, marked undone.
 */
export async function undoReport(dataDir, id, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Undo expense report', (S, touch) => {
    const rp = S.reports[id];
    if (!rp) return { error: 'That report is gone.', write: false };
    if (rp.undoneAt) return { error: 'That report was already undone.', write: false };
    const back = [];
    for (const eid of rp.moved) {
      const e = S.items[eid];
      if (!e || e.status === 'to-claim' || (rp.claimId && e.claimId !== rp.claimId)) continue;
      touch('items', eid);
      const { claimId, paidAt, paidTxKey, ...rest } = e;
      S.items[eid] = { ...rest, status: 'to-claim' };
      back.push(eid);
    }
    if (rp.claimId && S.claims[rp.claimId]) {
      touch('claims', rp.claimId);
      const left = S.claims[rp.claimId].expenseIds.filter(x => S.items[x] && S.items[x].claimId === rp.claimId);
      if (!left.length) delete S.claims[rp.claimId];
      else { S.claims[rp.claimId].expenseIds = left; S.claims[rp.claimId].total = sumOf(left.map(x => S.items[x])); }
    }
    touch('reports', id);
    S.reports[id] = { ...rp, undoneAt: isIso(today) ? today : new Date().toISOString().slice(0, 10) };
    return { changed: back.length, ids: back, report: S.reports[id] };
  }, { home });
}
/** Take a report off the list (its expenses stay as they are). */
export async function deleteReportRecord(dataDir, id, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Delete expense report', (S, touch) => {
    if (!S.reports[id]) return { error: 'That report is gone.', write: false };
    touch('reports', id); delete S.reports[id];
    return {};
  }, { home });
}
/** Take a claim back: its submitted expenses return to "to claim". */
export async function unsubmit(dataDir, ids, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Move back to to-claim', (S, touch) => {
    let n = 0;
    for (const id of (Array.isArray(ids) ? ids : [])) {
      const e = S.items[id]; if (!e || e.status === 'to-claim') continue;
      const cid = e.claimId;
      touch('items', id); const { claimId, paidAt, paidTxKey, ...rest } = e; S.items[id] = { ...rest, status: 'to-claim' }; n++;
      const c = cid && S.claims[cid];
      if (c) { touch('claims', cid); const left = c.expenseIds.filter(x => x !== id && S.items[x] && S.items[x].claimId === cid); if (!left.length) delete S.claims[cid]; else { c.expenseIds = left; c.total = sumOf(left.map(x => S.items[x])); } }
    }
    return n ? { changed: n } : { write: false, error: 'Nothing to move back.' };
  }, { home });
}
export async function markPaid(dataDir, ids, { date, txKey, today, learnFrom = '', home = 'GBP' } = {}) {
  return mutate(dataDir, 'Mark paid', (S, touch) => {
    const at = isIso(date) ? date : today;
    let n = 0; const done = [];
    for (const id of (Array.isArray(ids) ? ids : []).slice(0, 200)) {
      const e = S.items[id]; if (!e || e.status === 'paid') continue;
      touch('items', id);
      S.items[id] = { ...e, status: 'paid', paidAt: isIso(at) ? at : e.date, ...(typeof txKey === 'string' && txKey ? { paidTxKey: txKey.slice(0, 300) } : {}) };
      done.push(id); n++;
      const k = payerKey(e.payer);
      if (k && learnFrom && S.payers[k]) { const w = learnPattern(S.payers[k], learnFrom); if (w) { touch('payers', k); S.payers[k] = cleanPayer({ match: [...S.payers[k].match, w] }, S.payers[k]); } }
    }
    return n ? { changed: n, ids: done } : { write: false, error: 'Those are already paid.' };
  }, { home });
}
export async function markUnpaid(dataDir, ids, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Mark not paid', (S, touch) => {
    let n = 0;
    for (const id of (Array.isArray(ids) ? ids : [])) {
      const e = S.items[id]; if (!e || e.status !== 'paid') continue;
      touch('items', id); const { paidAt, paidTxKey, ...rest } = e; S.items[id] = { ...rest, status: e.claimId && S.claims[e.claimId] ? 'submitted' : 'to-claim' }; n++;
    }
    return n ? { changed: n } : { write: false, error: 'Nothing to change.' };
  }, { home });
}
export async function setPayer(dataDir, name, patch, { today, home = 'GBP' } = {}) {
  return mutate(dataDir, 'Edit payer', (S, touch) => {
    const k = payerKey(name); if (!k) return { error: 'A payer needs a name.', write: false };
    touch('payers', k);
    const p = cleanPayer({ ...(S.payers[k] || { name, uses: 0 }), ...(isObj(patch) ? patch : {}), name: S.payers[k] ? S.payers[k].name : name }, S.payers[k] || null);
    if (!p) return { error: 'That payer could not be saved.', write: false };
    S.payers[k] = p;
    return { key: k, payer: p };
  }, { home });
}
export async function setPrefs(dataDir, patch, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Change settings', (S, touch) => { touch('prefs'); S.prefs = cleanPrefs(patch, S.prefs); return {}; }, { home });
}
export async function dismissHint(dataDir, key, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Dismiss hint', (S, touch) => {
    const k = line(key, 120); if (!k) return { write: false };
    touch('hints', k); S.hints[k] = Date.now();
    const keys = Object.keys(S.hints); if (keys.length > 500) for (const o of keys.sort((a, b) => S.hints[a] - S.hints[b]).slice(0, keys.length - 500)) delete S.hints[o];
    return {};
  }, { home });
}

// ─── receipts ───────────────────────────────────────────────────────────────
/** The file type of some bytes, by its first bytes ('' = not a receipt we keep). */
export function sniffReceipt(buf) {
  if (!buf || buf.length < 12) return '';
  if (buf.slice(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buf[0] === 0x89 && buf.slice(1, 4).toString('latin1') === 'PNG') return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf.slice(0, 4).toString('latin1') === 'GIF8') return 'gif';
  return '';
}
export const RECEIPT_MIME = Object.freeze({ pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' });
/** Keep a receipt file (base64 `data`, or a data: URL) and attach it to an expense. */
/** Keep a receipt file with no expense attached (the Tax tab's claims): the same checks and folder as addReceipt. -> {ref, name, size} or {error, status}. */
export async function storeReceiptFile(dataDir, { data } = {}) {
  let b64 = typeof data === 'string' ? data : '';
  const m = /^data:[^;,]*;base64,/.exec(b64); if (m) b64 = b64.slice(m[0].length);
  if (!b64 || b64.length > Math.ceil(RECEIPT_MAX * 4 / 3) + 8 || !/^[A-Za-z0-9+/=\s]+$/.test(b64)) return { error: 'That file is too big (5 MB at most) or could not be read.', status: 413 };
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length || buf.length > RECEIPT_MAX) return { error: 'That file is too big (5 MB at most) or could not be read.', status: 413 };
  const ext = sniffReceipt(buf);
  if (!ext) return { error: 'Receipts can be a PDF or a picture (PNG, JPEG, WebP or GIF).', status: 415 };
  const ref = `rc-${createHash('sha256').update(buf).digest('hex').slice(0, 16)}.${ext}`;
  await fsp.mkdir(receiptsDir(dataDir), { recursive: true });
  const target = join(receiptsDir(dataDir), ref);
  try { await fsp.stat(target); } catch { await atomicWrite(target, buf, { encoding: null, mode: 0o600 }); }
  return { ref, size: buf.length };
}
export async function addReceipt(dataDir, id, { name, data } = {}, { home = 'GBP' } = {}) {
  let b64 = typeof data === 'string' ? data : '';
  const m = /^data:[^;,]*;base64,/.exec(b64); if (m) b64 = b64.slice(m[0].length);
  if (!b64 || b64.length > Math.ceil(RECEIPT_MAX * 4 / 3) + 8 || !/^[A-Za-z0-9+/=\s]+$/.test(b64)) return { error: 'That file is too big (5 MB at most) or could not be read.', status: 413 };
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length || buf.length > RECEIPT_MAX) return { error: 'That file is too big (5 MB at most) or could not be read.', status: 413 };
  const ext = sniffReceipt(buf);
  if (!ext) return { error: 'Receipts can be a PDF or a picture (PNG, JPEG, WebP or GIF).', status: 415 };
  const ref = `rc-${createHash('sha256').update(buf).digest('hex').slice(0, 16)}.${ext}`;
  await fsp.mkdir(receiptsDir(dataDir), { recursive: true });
  const target = join(receiptsDir(dataDir), ref);
  try { await fsp.stat(target); } catch { await atomicWrite(target, buf, { encoding: null, mode: 0o600 }); }
  const r = await mutate(dataDir, 'Add receipt', (S, touch) => {
    const e = S.items[id]; if (!e) return { error: 'That expense is gone.', write: false };
    if (e.receipts.some(x => x.ref === ref)) return { ref, already: true, write: false };
    if (e.receipts.length >= MAX_RECEIPTS) return { error: 'That expense has the most receipts it can hold.', write: false };
    touch('items', id);
    S.items[id] = { ...e, receipts: [...e.receipts, { ref, name: line(String(name || '').replace(/[\\/]/g, ' '), 80) || 'Receipt', size: buf.length, at: new Date().toISOString() }] };
    return { ref };
  }, { home });
  return { ...r, ref: r.ref || ref, size: buf.length, ext };
}
export async function addMailReceipt(dataDir, id, mail, { home = 'GBP' } = {}) {
  const rc = cleanReceipt({ mail, at: new Date().toISOString() });
  if (!rc) return { error: 'That email could not be attached.', status: 400 };
  return mutate(dataDir, 'Attach email', (S, touch) => {
    const e = S.items[id]; if (!e) return { error: 'That expense is gone.', write: false };
    if (e.receipts.some(x => x.mail && x.mail.id === rc.mail.id)) return { already: true, write: false };
    if (e.receipts.length >= MAX_RECEIPTS) return { error: 'That expense has the most receipts it can hold.', write: false };
    touch('items', id); S.items[id] = { ...e, receipts: [...e.receipts, rc] };
    return { receipt: rc };
  }, { home });
}
export async function removeReceipt(dataDir, id, ref, { home = 'GBP' } = {}) {
  return mutate(dataDir, 'Remove receipt', (S, touch) => {
    const e = S.items[id]; if (!e) return { error: 'That expense is gone.', write: false };
    const left = e.receipts.filter(x => (x.ref || (x.mail && x.mail.id)) !== ref);
    if (left.length === e.receipts.length) return { write: false, error: 'That receipt is not there.' };
    touch('items', id); S.items[id] = { ...e, receipts: left };   // the file stays: Undo can bring the receipt back
    return {};
  }, { home });
}
export async function readReceipt(dataDir, ref) {
  if (typeof ref !== 'string' || !RECEIPT_RE.test(ref)) return null;
  try { const buf = await fsp.readFile(join(receiptsDir(dataDir), ref)); return { buf, mime: RECEIPT_MIME[ref.split('.').pop()] || 'application/octet-stream' }; } catch { return null; }
}

/** Receipt emails that look like this expense: by amount, date and merchant. messages: the inbox snapshot (read only). */
export function matchReceiptEmails(e, messages, { limit = 5 } = {}) {
  if (!e || !Array.isArray(messages)) return [];
  const amt = Number(e.amount).toFixed(2), amtShort = amt.replace(/\.00$/, '');
  const words = [e.merchant, e.title].filter(Boolean).join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !['expense', 'with', 'from', 'this', 'that', 'order', 'purchase', 'lunch', 'travel'].includes(w));
  const have = new Set((e.receipts || []).filter(r => r.mail).map(r => r.mail.id));
  const out = [];
  for (const m of messages.slice(0, 800)) {
    if (!m || !m.id || have.has(m.id)) continue;
    const day = typeof m.date === 'string' ? m.date.slice(0, 10) : '';
    if (!isIso(day)) continue;
    const delta = daysBetween(e.date, day);
    if (delta < -3 || delta > 14) continue;
    const hay = `${m.subject || ''} ${m.snippet || ''}`.toLowerCase();
    const who = `${hay} ${(m.from && (m.from.name || m.from.email)) || m.sender || ''}`.toLowerCase();
    let score = 0; const why = [];
    const amountRe = new RegExp(`(^|[^0-9.,])[£$€]?${amt.replace('.', '[.,]')}(?![0-9])`);
    if (amountRe.test(hay) || (e.amount >= 100 && hay.includes(amtShort + ' '))) { score += 3; why.push('the amount'); }
    const hit = words.find(w => who.includes(w));
    if (hit) { score += 2; why.push('the shop'); }
    if (/receipt|order|invoice|confirmation|payment|booking|ticket|thank you for/.test(hay)) score += 1;
    if (Math.abs(delta) <= 2) { score += 1; why.push('the date'); }
    if (score >= 4 && (why.includes('the amount') || why.includes('the shop'))) {
      out.push({ id: String(m.id), src: m.sourceId || m.accountId || '', subject: line(m.subject, 160), from: line((m.from && (m.from.name || m.from.email)) || m.sender || '', 120), date: day, link: typeof m.link === 'string' ? m.link : '', score, why: why.join(', ') });
    }
  }
  return out.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date)).slice(0, limit);
}

// ─── paid back? ─────────────────────────────────────────────────────────────
export const GENERIC = new Set(['FASTER', 'PAYMENT', 'FROM', 'BGC', 'TFR', 'BACS', 'TRANSFER', 'CREDIT', 'REF', 'REFERENCE', 'LTD', 'LIMITED', 'THE', 'AND', 'EXPENSES', 'EXPENSE', 'SALARY', 'FPI', 'INCOMING', 'MOBILE', 'ONLINE', 'BANKING']);
/** A distinctive word of a bank text to remember for a payer (or ''). */
export function learnPattern(payer, memo) {
  const up = String(memo || '').toUpperCase();
  if (payer && payer.match && payer.match.some(m => up.includes(m))) return '';
  const w = (up.match(/[A-Z][A-Z0-9&'-]{3,}/g) || []).find(x => !GENERIC.has(x) && !/^\d+$/.test(x));
  return w || '';
}
const normWords = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ');
export function payerMatches(payer, memo) {
  if (!payer) return false;
  const up = normWords(memo);
  const pats = (payer.match && payer.match.length ? payer.match : [String(payer.name || '').toUpperCase()]).map(normWords).map(s => s.trim()).filter(s => s.length >= 3);
  return pats.some(p => up.includes(p));
}
/** All subsets (size 1..max) of `arr` whose pence sum is within 1p of `target`. */
export function subsetsSumming(arr, target, max = 5, cap = 14) {
  const a = arr.slice(0, cap), out = [];
  const go = (i, picked, sum) => {
    if (picked.length && Math.abs(sum - target) <= 1) out.push(picked.slice());
    if (picked.length >= max || i >= a.length || out.length > 20) return;
    for (let j = i; j < a.length; j++) { picked.push(a[j]); go(j + 1, picked, sum + a[j].p); picked.pop(); }
  };
  go(0, [], 0);
  return out;
}
export const askKey = (txKey, ids) => createHash('sha1').update(`${txKey}|${[...ids].sort().join(',')}`).digest('hex').slice(0, 16);
/**
 * Match incoming credits to open claims. S: the store; credits: [{txKey, k?, date, amount > 0, memo, merchant?}].
 * Returns {auto: [match], ask: [match]}. A match: {kind, txKey, date, amount, memo, payer, claimIds, expenseIds, askId, weak?}.
 *   auto  the payer's name is in the bank text AND the amount is one claim's total, or the total of several claims
 *         of that payer, within 1p, inside the window after submission, and there is only one way to read it.
 *   ask   anything else that is worth ONE question: two readings, a part payment that equals some of a claim's
 *         expenses, or an exact amount from a payer whose name is not in the text (weak: never marked by itself).
 */
export function findPaidMatches(S, credits, { today, windowDays } = {}) {
  const win = windowDays || (S.prefs && S.prefs.windowDays) || 60;
  const used = new Set(Object.values(S.items).map(e => e.paidTxKey).filter(Boolean));
  const open = [];
  for (const c of Object.values(S.claims)) {
    const exps = c.expenseIds.map(id => S.items[id]).filter(e => e && e.status === 'submitted');
    if (!exps.length) continue;
    open.push({ c, exps, p: pence(sumOf(exps)), key: payerKey(c.payer) });
  }
  const auto = [], ask = [], claimed = new Set();
  const credit = (Array.isArray(credits) ? credits : []).filter(x => x && x.amount > 0 && x.txKey && isIso(x.date)).sort((a, b) => a.date.localeCompare(b.date));
  for (const cr of credit) {
    if (used.has(cr.txKey)) continue;
    const A = pence(cr.amount);
    const inWin = open.filter(o => !o.exps.every(e => claimed.has(e.id)) && cr.date >= addDays(o.c.submittedAt, -1) && cr.date <= addDays(o.c.submittedAt, win));
    if (!inWin.length) continue;
    const byPayer = new Map();
    for (const o of inWin) { const l = byPayer.get(o.key) || []; l.push(o); byPayer.set(o.key, l); }
    let handled = false;
    for (const [key, list] of byPayer) {
      const payer = S.payers[key] || { name: list[0].c.payer, match: [] };
      if (!payerMatches(payer, cr.memo)) continue;
      const live = list.filter(o => !o.exps.some(e => claimed.has(e.id)));
      const sets = [];
      for (const o of live) if (Math.abs(o.p - A) <= 1) sets.push([o]);
      for (const sub of subsetsSumming(live, A, 5, 12)) if (sub.length > 1) sets.push(sub);
      const mk = (kind, os, exps, extra = {}) => ({ kind, txKey: cr.txKey, k: cr.k || '', date: cr.date, amount: money(cr.amount), memo: line(cr.memo, 140), payer: payer.name, claimIds: os.map(o => o.c.id), expenseIds: exps.map(e => e.id), askId: askKey(cr.txKey, exps.map(e => e.id)), ...extra });
      if (sets.length === 1) {
        const exps = sets[0].flatMap(o => o.exps);
        auto.push(mk(sets[0].length > 1 ? 'sum' : 'claim', sets[0], exps));
        exps.forEach(e => claimed.add(e.id)); handled = true; break;
      }
      if (sets.length > 1) {
        const first = sets.sort((a, b) => a[0].c.submittedAt.localeCompare(b[0].c.submittedAt))[0];
        const exps = first.flatMap(o => o.exps);
        if (!S.asks[askKey(cr.txKey, exps.map(e => e.id))]) ask.push(mk('ambiguous', first, exps));
        handled = true; break;
      }
      // a part payment: equals some of one claim's expenses
      for (const o of live.sort((a, b) => a.c.submittedAt.localeCompare(b.c.submittedAt))) {
        const subs = subsetsSumming(o.exps.map(e => ({ e, p: pence(e.amount) })), A, 6, 14);
        if (subs.length === 1 && subs[0].length < o.exps.length) {
          const exps = subs[0].map(x => x.e);
          if (!S.asks[askKey(cr.txKey, exps.map(e => e.id))]) ask.push(mk('partial', [o], exps));
          handled = true; break;
        }
      }
      if (handled) break;
    }
    if (handled) continue;
    // weak: an exact amount with no payer name in the bank text, only one possible claim: one question
    const exact = inWin.filter(o => Math.abs(o.p - A) <= 1 && !payerMatches(S.payers[o.key] || { name: o.c.payer }, cr.memo));
    if (exact.length === 1 && A >= 500 && !exact[0].exps.some(e => claimed.has(e.id))) {
      const exps = exact[0].exps;
      if (!S.asks[askKey(cr.txKey, exps.map(e => e.id))]) ask.push({ kind: 'weak', weak: true, txKey: cr.txKey, k: cr.k || '', date: cr.date, amount: money(cr.amount), memo: line(cr.memo, 140), payer: exact[0].c.payer, claimIds: [exact[0].c.id], expenseIds: exps.map(e => e.id), askId: askKey(cr.txKey, exps.map(e => e.id)) });
    }
  }
  return { auto, ask };
}
/**
 * Expenses paid back, for the analysis (lib/finance/transfers.mjs applyOwedNet): the money coming back is not income and comes off the payment it paid back.
 * credits: {bank key of the money in: {payments: {the payment's key: pounds}, used}}. outs: {the payment's key: pounds} when no money in is known (marked by hand).
 * Only amounts in the home currency: anything else has no bank figure to set against.
 */
export function expenseNet(S, home = 'GBP') {
  const credits = {}, outs = {};
  for (const e of Object.values((S && S.items) || {})) {
    if (!e || e.status !== 'paid' || !(e.amount > 0) || e.currency !== home) continue;
    const ref = e.source ? e.source.k || e.source.txKey || '' : '';
    if (e.paidTxKey) {
      const c = credits[e.paidTxKey] || (credits[e.paidTxKey] = { payments: {}, used: 0 });
      c.used = money(c.used + e.amount);
      if (ref) c.payments[ref] = money((c.payments[ref] || 0) + e.amount);
    } else if (ref) outs[ref] = money((outs[ref] || 0) + e.amount);
  }
  return { credits, outs };
}
/**
 * Marked paid by hand: the one payment in the bank it must have been, or ''. Exact to the penny, within 14 days of the date, with the payer's name in the
 * bank text, and only one such payment: anything less stays unlinked (it still comes off spending).
 */
export function findPaidCredit(S, ids, credits, date) {
  const list = (Array.isArray(ids) ? ids : []).map(id => S.items[id]).filter(Boolean);
  if (!list.length || !isIso(date) || list.some(e => !e.payer || e.payer !== list[0].payer)) return '';
  const used = new Set(Object.values(S.items).map(e => e.paidTxKey).filter(Boolean));
  const want = pence(sumOf(list)), payer = S.payers[payerKey(list[0].payer)] || { name: list[0].payer, match: [] };
  const hits = (Array.isArray(credits) ? credits : []).filter(x => x && !used.has(x.txKey) && Math.abs(pence(x.amount) - want) <= 1 && x.date >= addDays(date, -14) && x.date <= addDays(date, 14) && payerMatches(payer, x.memo));
  return hits.length === 1 ? hits[0].txKey : '';
}
/** Credits (money in) from a finance analysis, newest 150 within `days`. */
export function creditsFromAnalysis(analysis, { today, days = 120 } = {}) {
  const tx = analysis && Array.isArray(analysis.transactions) ? analysis.transactions : [];
  const from = isIso(today) ? addDays(today, -days) : '';
  const out = [];
  for (const t of tx) {
    if (!t || !(Number(t.a) > 0) || !isIso(t.d) || (from && t.d < from)) continue;
    if (t.c === 'Internal transfers') continue;
    out.push({ txKey: txKeyOf(t), k: typeof t.k === 'string' ? t.k : '', date: t.d, amount: Number(t.a), memo: String(t.memo || ''), merchant: String(t.m || ''), ...(t.pe ? { pe: 1 } : {}) });
    if (out.length >= 400) break;
  }
  return out;
}
/** Run the matching and mark every confident match paid. Returns {auto, ask, undo?}. */
export async function scanPaid(dataDir, credits, { today, home = 'GBP' } = {}) {
  const S0 = await readStore(dataDir, { home });
  const m0 = findPaidMatches(S0, credits, { today });
  if (!m0.auto.length) return { auto: [], ask: m0.ask };
  const r = await mutate(dataDir, 'Marked paid automatically', (S, touch) => {
    const m = findPaidMatches(S, credits, { today });
    for (const a of m.auto) {
      for (const id of a.expenseIds) { const e = S.items[id]; if (!e || e.status !== 'submitted') continue; touch('items', id); S.items[id] = { ...e, status: 'paid', paidAt: a.date, paidTxKey: a.txKey }; }
      const k = payerKey(a.payer);
      if (k && S.payers[k]) { const w = learnPattern(S.payers[k], a.memo); if (w) { touch('payers', k); S.payers[k] = cleanPayer({ match: [...S.payers[k].match, w] }, S.payers[k]); } }
    }
    return { auto: m.auto, ask: m.ask };
  }, { home });
  return { auto: r.auto || [], ask: r.ask || [], ...(r.undo ? { undo: r.undo } : {}) };
}
/** The user answered a question: yes marks those expenses paid (and learns the payer's bank text); no remembers it. */
export async function answerAsk(dataDir, ask, yes, { today, home = 'GBP' } = {}) {
  if (!isObj(ask) || !Array.isArray(ask.expenseIds) || typeof ask.txKey !== 'string') return { error: 'That question is out of date.', status: 400 };
  const key = askKey(ask.txKey, ask.expenseIds);
  if (!yes) return mutate(dataDir, 'Not that payment', (S, touch) => { touch('asks', key); S.asks[key] = Date.now(); return {}; }, { home });
  return markPaid(dataDir, ask.expenseIds.filter(x => typeof x === 'string'), { date: isIso(ask.date) ? ask.date : today, txKey: ask.txKey, today, learnFrom: String(ask.memo || ''), home });
}

// ─── the claim pack ─────────────────────────────────────────────────────────
const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const csvCell = (v) => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const sym = (cur) => ({ GBP: '£', USD: '$', EUR: '€' }[cur] || cur + ' ');
const fmt = (n, cur = 'GBP') => `${sym(cur)}${Number(n).toFixed(2)}`;
const longDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
/** Where each receipt file goes inside a pack: receipts/<n>-<slug>.<ext>. */
export function packNames(items) {
  const out = new Map(); let n = 0;
  for (const e of items) for (const r of e.receipts || []) if (r.ref) { n++; out.set(r.ref, `receipts/${String(n).padStart(2, '0')}-${payerKey(e.title).slice(0, 30) || 'receipt'}.${r.ref.split('.').pop()}`); }
  return out;
}
/** The summary of a claim as {html, csv, text}; `items` sorted by date. */
export function claimSummary(items, { payer = '', submittedAt = '', method = '', note = '', homeName = '', title = 'Expense claim' } = {}) {
  const list = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const total = sumOf(list), vat = money(list.reduce((a, e) => a + (e.vat || 0), 0));
  const names = packNames(list);
  const receiptsOf = (e) => (e.receipts || []).map(r => (r.ref ? names.get(r.ref) : `email: ${r.mail.subject || r.mail.from}`)).filter(Boolean);
  const head = `${title}${payer ? ' for ' + payer : ''}`;
  const lines = [head, `${list.length} item${list.length === 1 ? '' : 's'}, ${fmt(total)}${vat ? ` (includes ${fmt(vat)} VAT)` : ''}${submittedAt ? ` · sent ${longDate(submittedAt)}` : ''}`, ''];
  for (const e of list) lines.push(`- ${longDate(e.date)}  ${e.title}  ${fmt(e.amount, e.currency)}${e.foreign ? ` (${e.foreign.amount.toFixed(2)} ${e.foreign.currency})` : ''}${e.kind === 'mileage' ? ` (${e.miles} miles at ${fmt(e.rate)})` : ''}${(e.receipts || []).length ? '  [receipt]' : '  [no receipt]'}`);
  if (note) lines.push('', note);
  const csv = [['Date', 'Description', 'Category', 'Payer', 'Amount', 'Currency', 'VAT', 'Original amount', 'Original currency', 'Receipts', 'Note'].join(',')]
    .concat(list.map(e => [e.date, csvCell(e.title), csvCell(e.category || ''), csvCell(e.payer || payer), e.amount.toFixed(2), e.currency, e.vat != null ? e.vat.toFixed(2) : '', e.foreign ? e.foreign.amount.toFixed(2) : '', e.foreign ? e.foreign.currency : '', csvCell(receiptsOf(e).join('; ')), csvCell(e.note || '')].join(',')))
    .concat([['', 'Total', '', '', total.toFixed(2), 'GBP', vat ? vat.toFixed(2) : '', '', '', '', ''].join(',')]).join('\r\n') + '\r\n';
  const rows = list.map(e => `<tr><td>${escHtml(longDate(e.date))}</td><td><b>${escHtml(e.title)}</b>${e.category ? `<br><span class="m">${escHtml(e.category)}</span>` : ''}${e.kind === 'mileage' ? `<br><span class="m">${e.miles} miles at ${fmt(e.rate)} a mile</span>` : ''}${e.note ? `<br><span class="m">${escHtml(e.note)}</span>` : ''}</td><td class="r">${e.foreign ? `<span class="m">${e.foreign.amount.toFixed(2)} ${escHtml(e.foreign.currency)}</span><br>` : ''}${fmt(e.amount, e.currency)}${e.vat ? `<br><span class="m">VAT ${fmt(e.vat)}</span>` : ''}</td><td>${receiptsOf(e).length ? receiptsOf(e).map(escHtml).join('<br>') : '<span class="m">No receipt</span>'}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escHtml(head)}</title><style>
body{font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1c1c22;max-width:760px;margin:32px auto;padding:0 20px}h1{font-size:22px;margin:0 0 4px}.m{color:#666;font-size:12px}.sub{color:#555;margin:0 0 20px}
table{width:100%;border-collapse:collapse}th,td{padding:8px 6px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#666}.r{text-align:right;white-space:nowrap}tfoot td{font-weight:700;border-top:2px solid #333;border-bottom:0}
@media print{body{margin:0;max-width:none}a{color:inherit}}</style></head><body><h1>${escHtml(head)}</h1><p class="sub">${list.length} item${list.length === 1 ? '' : 's'}${submittedAt ? ` · sent ${escHtml(longDate(submittedAt))}` : ''}${method ? ` · by ${escHtml(method)}` : ''}${homeName ? ` · from ${escHtml(homeName)}` : ''}</p>
<table><thead><tr><th>Date</th><th>What</th><th class="r">Amount</th><th>Receipt</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td></td><td>Total</td><td class="r">${fmt(total)}${vat ? `<br><span class="m">includes ${fmt(vat)} VAT</span>` : ''}</td><td></td></tr></tfoot></table>${note ? `<p>${escHtml(note)}</p>` : ''}<p class="m">Made with OpenDash. Receipts are in the receipts folder next to this page.</p></body></html>`;
  return { html, csv, text: lines.join('\n'), total, vat, count: list.length };
}
