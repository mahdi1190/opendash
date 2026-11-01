// lib/finance/tax-tab.mjs - the Tax tab: one tax year's sources, position, keep-aside, deadlines and claims. Pure: no I/O, no clock.
//
// This year's sources ARE the money plan's income items, so an edit here moves take-home, the plan and safe to spend.
// A past year keeps its own copy in the tax document. What the plan needs from here (payments, claims, choices, the pot
// and the bills) is written to plan.taxLink on every save (lib/finance/countries.mjs personOf reads it).
//
// The tax document is the person's own data: it lives in the finance folder and syncs with the finance edits (encrypted,
// their own devices only). It never goes into friends' sharing. UTR and NI number are NOT in it: lib/tax-ids.mjs keeps them
// in the secret store. An AI sees taxSummary only.
//
//   cleanTax(v)                        a stored or posted document, checked field by field
//   rollOver(plan, doc, today)         the first time a new tax year is seen: keep last year's sources, carry them over to confirm
//   planForYear(plan, doc, yearId, today)   the plan-like {items, tax, taxLink} for that year, and whether it was carried over
//   personFor(plan, doc, yearId, today)     {person, planLike, link, carried}
//   taxLinkFor(plan, doc, today)       plan.taxLink for the current year
//   taxView(plan, doc, analysis, o)    everything the page shows for one tax year
//   taxSummary(view)                   the read-only summary for the assistant: figures only, never an identifier, never a transaction
//
// doc = { v: 1, at, lastYear, prefs: {basis, remind, lead, registered, gatewayBroken, hmrcAsked, paper, partner, foreign, askedTo},
//   years: { '2025-26': { items?, tax?, confirmed?, payments: [...], claims: [...], dismissed: {}, seen: {}, simplified: {...}, extras: {...},
//     ticks: {}, tasks: {}, prompts: {}, walk: {}, hmrc: {total}, filed: {...}, payslips: [...], docs: [...] } }, memory: [...] }

import { yearData, taxYearOf, howWorkedOut, saBill, keepOf, claimSaving, tradeCompare, codeWarnings, wholeYearLiability, allowanceParts, settleYear, codeYearOf } from './uk-tax.mjs';
import { looksOff, payLooksOff } from './tax-check.mjs';
import { personOf, isJob, inPlay, amountInYear, costsInYear } from './countries.mjs';
import { yearDeadlines, needToFile, rhythmFor, yearEndReview, notesFor, keepRecordsUntil, taskDate, taxYearAfter, PENALTY_LINE, CHECKLISTS, lifePrompts } from './tax-rules.mjs';
import { nextDates, dn } from './pay-dates.mjs';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const YEAR = /^\d{4}-\d{2}$/;
const ID = /^[\w-]{1,40}$/;
const r2 = (x) => Math.round(x * 100) / 100;
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v, n = 120) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n) : '');
const money = (v) => { if (v === null || v === undefined || v === '') return undefined; const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 1e9 ? r2(n) : undefined; };
const signed = (v) => { if (v === null || v === undefined || v === '') return undefined; const n = Number(v); return Number.isFinite(n) && Math.abs(n) <= 1e9 ? r2(n) : undefined; };
const dateOf = (v) => (typeof v === 'string' && ISO.test(v) ? v : undefined);
const opt = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const pct = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 100 ? r2(n) : undefined; };
const list = (v, n, f) => (Array.isArray(v) ? v : []).slice(0, n).map(f).filter(Boolean);
const dayMap = (v, n = 200) => { const o = {}; for (const [k, d] of Object.entries(isObj(v) ? v : {}).slice(0, n)) if (typeof k === 'string' && k.length <= 120 && dateOf(d)) o[k] = d; return o; };

export const CLAIM_CATS = Object.freeze(['goods', 'travel', 'staff', 'premises', 'repairs', 'fees', 'finance', 'office', 'ads', 'other', 'capital']);
const SIMPLE_KINDS = ['car', 'motorcycle'];

/* ---------- checking the document ---------- */
function cleanSource(i) {
  if (!isObj(i) || !ID.test(String(i.id || ''))) return null;
  // The same shape as a plan's income item; money-plan.mjs cleanPlan checks it again when it is used.
  return { ...i, id: i.id, kind: 'income' };
}
function cleanYear(v) {
  const o = isObj(v) ? v : {};
  const e = isObj(o.extras) ? o.extras : {};
  const s = isObj(o.simplified) ? o.simplified : {};
  const f = isObj(o.filed) ? o.filed : null;
  return opt({
    items: Array.isArray(o.items) ? list(o.items, 60, cleanSource) : undefined,
    tax: isObj(o.tax) ? o.tax : undefined,
    confirmed: dateOf(o.confirmed),
    payments: list(o.payments, 600, p => (isObj(p) && ID.test(String(p.id || '')) && dateOf(p.date) && money(p.amount) !== undefined ? opt({ id: p.id, item: ID.test(String(p.item || '')) ? p.item : undefined, date: p.date, amount: money(p.amount), client: str(p.client, 60), note: str(p.note, 120), tx: str(p.tx, 80) }) : null)),
    claims: list(o.claims, 800, c => (isObj(c) && ID.test(String(c.id || '')) && money(c.amount) !== undefined ? opt({ id: c.id, item: ID.test(String(c.item || '')) ? c.item : undefined, tx: str(c.tx, 80), date: dateOf(c.date), what: str(c.what, 80), amount: money(c.amount), pct: pct(c.pct), cat: CLAIM_CATS.includes(c.cat) ? c.cat : 'other', rule: str(c.rule, 30), receipts: list(c.receipts, 8, r => (typeof r === 'string' && /^rc-[0-9a-f]{16}\.(pdf|png|jpg|webp|gif)$/.test(r) ? r : null)) }) : null)),
    dismissed: dayMap(o.dismissed, 800), seen: dayMap(o.seen, 800),
    simplified: opt({ miles: isObj(s.miles) ? opt({ car: money(s.miles.car), motorcycle: money(s.miles.motorcycle) }) : undefined, wfh: list(s.wfh, 12, w => (isObj(w) && money(w.hours) !== undefined && money(w.months) !== undefined ? { hours: money(w.hours), months: Math.min(12, money(w.months)) } : null)) }),
    extras: opt({ tradeChoice: ['auto', 'allowance', 'actual'].includes(e.tradeChoice) ? e.tradeChoice : undefined, giftAid: money(e.giftAid), pensionPaid: money(e.pensionPaid), childBenefit: money(e.childBenefit), cbChildren: money(e.cbChildren), isaUsed: money(e.isaUsed), lisaUsed: money(e.lisaUsed), hasEmi: e.hasEmi === true ? true : undefined,
      gains: list(e.gains, 100, g => (isObj(g) && ID.test(String(g.id || '')) ? opt({ id: g.id, what: str(g.what, 60), date: dateOf(g.date), proceeds: money(g.proceeds), cost: money(g.cost), isa: g.isa === true ? true : undefined }) : null)) }),
    ticks: dayMap(o.ticks), walk: dayMap(o.walk), tasks: (() => { const t = {}; for (const [k, x] of Object.entries(isObj(o.tasks) ? o.tasks : {}).slice(0, 100)) if (typeof x === 'string' && x.length <= 80) t[k] = x; return t; })(),
    prompts: (() => { const t = {}; for (const [k, x] of Object.entries(isObj(o.prompts) ? o.prompts : {}).slice(0, 100)) if (isObj(x) && ['dismissed', 'task'].includes(x.state)) t[k] = opt({ state: x.state, at: dateOf(x.at), task: str(x.task, 80) }); return t; })(),
    hmrc: isObj(o.hmrc) ? opt({ total: money(o.hmrc.total), at: dateOf(o.hmrc.at) }) : undefined,
    filed: f ? opt({ at: dateOf(f.at), total: signed(f.total), paid: money(f.paid), paidAt: dateOf(f.paidAt), poaFirst: money(f.poaFirst), poaSecond: money(f.poaSecond), poaFirstPaid: dateOf(f.poaFirstPaid), poaSecondPaid: dateOf(f.poaSecondPaid), note: str(f.note, 200), bankMatch: str(f.bankMatch, 80) }) : undefined,
    payslips: list(o.payslips, 200, p => (isObj(p) && ID.test(String(p.id || '')) ? opt({ id: p.id, job: ID.test(String(p.job || '')) ? p.job : undefined, employer: str(p.employer, 60), payDate: dateOf(p.payDate), period: str(p.period, 30), gross: money(p.gross), tax: signed(p.tax), ni: money(p.ni), plan: money(p.plan), pg: money(p.pg), pension: money(p.pension), net: money(p.net), code: str(p.code, 12), file: typeof p.file === 'string' && /^[\w.-]{1,80}$/.test(p.file) ? p.file : undefined, at: dateOf(p.at) }) : null)),
    docs: list(o.docs, 300, d => (isObj(d) && ID.test(String(d.id || '')) ? opt({ id: d.id, kind: ['payslip', 'p45', 'p60', 'p11d', 'receipt', 'statement', 'other'].includes(d.kind) ? d.kind : 'other', name: str(d.name, 80), file: typeof d.file === 'string' && /^[\w.-]{1,80}$/.test(d.file) ? d.file : undefined, ref: typeof d.ref === 'string' && d.ref.length <= 40 ? d.ref : undefined, at: dateOf(d.at) }) : null)),
  });
}
export function cleanTax(v) {
  const o = isObj(v) ? v : {};
  const p = isObj(o.prefs) ? o.prefs : {};
  const years = {};
  for (const [k, y] of Object.entries(isObj(o.years) ? o.years : {}).slice(0, 30)) if (YEAR.test(k)) years[k] = cleanYear(y);
  return {
    v: 1, at: typeof o.at === 'string' ? o.at.slice(0, 40) : null, lastYear: YEAR.test(String(o.lastYear || '')) ? o.lastYear : null,
    prefs: opt({ basis: p.basis === 'traditional' ? 'traditional' : 'cash', remind: p.remind === true ? true : undefined, lead: Number.isFinite(Number(p.lead)) ? Math.min(60, Math.max(3, Math.floor(Number(p.lead)))) : undefined,
      registered: typeof p.registered === 'boolean' ? p.registered : undefined, gatewayBroken: p.gatewayBroken === true ? true : undefined, hmrcAsked: p.hmrcAsked === true ? true : undefined, paper: p.paper === true ? true : undefined, partner: p.partner === true ? true : undefined, foreign: p.foreign === true ? true : undefined,
      watchFolder: str(p.watchFolder, 260) }),
    years,
    memory: list(o.memory, 200, m => (isObj(m) && ID.test(String(m.id || '')) && str(m.text, 400) ? opt({ id: m.id, text: str(m.text, 400), date: dateOf(m.date), source: str(m.source, 60), open: m.open === true ? true : undefined, task: str(m.task, 80) }) : null)),
  };
}

/* ---------- one year's sources ---------- */
const dayN = (iso) => Math.round(Date.parse(iso + 'T00:00:00Z') / 864e5);
const overlaps = (i, y) => (!i.starts || i.starts <= y.end) && (!i.ends || i.ends >= y.start);
const isSource = (i) => i && i.kind === 'income' && ['job', 'self', 'side', 'rental', 'dividend', 'interest', 'other'].includes(i.incomeType);
// A job can have ended before a tax year and still pay in it: an exact payment listed for that year.
const paysIn = (i, y) => Array.isArray(i.payments) && i.payments.some(p => p && p.date >= y.start && p.date <= y.end);

/** The tax year's sources. carried: a past year with no copy of its own, taken from the plan by date. */
export function planForYear(plan, doc, yearId, today) {
  const cur = taxYearOf(today).id, y = yearData(yearId), rec = (doc.years || {})[yearId] || {};
  const base = { country: plan.country, tax: { ...(plan.tax || {}), ...(rec.tax || {}) }, taxAside: plan.taxAside };
  if (rec.items) return { planLike: { ...base, items: rec.items }, carried: false, own: true };
  if (yearId === cur) return { planLike: { ...plan, tax: base.tax }, carried: false, own: false };
  return { planLike: { ...base, items: (plan.items || []).filter(i => isSource(i) && inPlay(i) && (overlaps(i, y) || paysIn(i, y))) }, carried: yearId < cur, own: false };
}
const claimShare = (c) => r2(num(c.amount) * (c.pct != null ? num(c.pct) : 100) / 100);
/** Simplified expenses for the year: mileage at the year's rates and working from home by hours a month. */
export function simplifiedCosts(rec, yearId) {
  const y = yearData(yearId), s = rec.simplified || {}, m = s.miles || {};
  const car = num(m.car), bike = num(m.motorcycle);
  const carCost = Math.min(car, y.mileage.firstMiles) * y.mileage.first + Math.max(0, car - y.mileage.firstMiles) * y.mileage.after;
  const mileage = r2(carCost + bike * y.mileage.motorcycle);
  let wfh = 0;
  for (const w of s.wfh || []) { let rate = 0; for (const [from, a] of y.wfh) if (num(w.hours) >= from) rate = a; wfh += rate * num(w.months); }
  return { mileage, wfh: r2(wfh), total: r2(mileage + wfh) };
}
/** The Tax tab's figures for this year: for each self-employed period, money in, costs and capital allowances. */
function linkFor(planLike, doc, yearId) {
  const y = yearData(yearId), rec = (doc.years || {})[yearId] || {}, e = rec.extras || {};
  const selves = (planLike.items || []).filter(i => i.kind === 'income' && i.incomeType === 'self' && inPlay(i));
  const items = {};
  const first = selves[0] ? selves[0].id : null;
  const belongs = (c) => (c.item && selves.some(s => s.id === c.item) ? c.item : first);
  const traditional = (doc.prefs || {}).basis === 'traditional';
  for (const s of selves) items[s.id] = { costs: costsInYear(s, y), capital: 0 };
  let anyPayment = new Set();
  for (const p of rec.payments || []) { const k = belongs(p); if (!k || p.date < y.start || p.date > y.end) continue; items[k].income = r2(num(items[k].income) + num(p.amount)); anyPayment.add(k); }
  for (const c of rec.claims || []) {
    const k = belongs(c); if (!k) continue;
    const v = claimShare(c);
    if (c.cat === 'capital' && traditional) items[k].capital = r2(items[k].capital + v); else items[k].costs = r2(items[k].costs + v);
  }
  const simple = simplifiedCosts(rec, yearId);
  if (first && simple.total) items[first].costs = r2(items[first].costs + simple.total);
  const gains = (e.gains || []).filter(g => !g.isa).reduce((t, g) => t + (num(g.proceeds) - num(g.cost)), 0);
  // What the plan needs so that it answers "must a return be sent, and how is it paid?" as this page does.
  const pf = doc.prefs || {}, filed = rec.filed || null;
  const fileAsk = opt({ hmrcAsked: pf.hmrcAsked === true ? true : undefined, partner: pf.partner === true ? true : undefined, foreign: pf.foreign === true ? true : undefined, filed: filed ? true : undefined, filedTotal: filed && filed.total != null ? filed.total : undefined, codeTicked: (rec.ticks || {}).code ? true : undefined, paid: paidTowards(doc, yearId) || undefined });
  return opt({ year: yearId, items, tradeChoice: e.tradeChoice, gains: gains > 0 ? r2(gains) : undefined, childBenefit: e.childBenefit, giftAid: e.giftAid, pensionPaid: e.pensionPaid, claimRas: true, fileAsk });
}
/** The engine's person for a year, with its Tax tab figures. */
export function personFor(plan, doc, yearId, today, o = {}) {
  const { planLike, carried, own } = planForYear(plan, doc, yearId, today);
  const link = linkFor(planLike, doc, yearId);
  // bare: this year's own sums only, leaving out an earlier year's tax through its payslips.
  if (!o.bare) { const c = codedFrom(plan, doc, taxYearAfter(yearId, -2), today); if (c) link.coded = [c]; }
  const y = yearData(yearId);
  const date = today >= y.start && today <= y.end ? today : y.end < today ? y.end : y.start;
  // A payslip's year-to-date and a P45 belong to their own year.
  const items = (planLike.items || []).map(i => {
    if (!isJob(i)) return i;
    const c = { ...i };
    if (c.ytd && !(c.ytd.asOf >= y.start && c.ytd.asOf <= y.end)) delete c.ytd;
    if (!(c.starts && c.starts >= y.start && c.starts <= y.end)) { delete c.prevPay; delete c.prevTax; }
    return c;
  });
  const person = personOf({ ...planLike, items, taxLink: link }, date);
  return { person, planLike, link, carried, own, date };
}

/* ---------- the first look at a new tax year ---------- */
/** Keep last year's sources before the plan moves on. Returns the document (changed: true when it was). */
export function rollOver(plan, doc, today) {
  const cur = taxYearOf(today).id;
  const out = cleanTax(doc);
  if (!out.lastYear) { out.lastYear = cur; return { doc: out, changed: true, rolled: false }; }
  if (out.lastYear === cur) return { doc: out, changed: false, rolled: false };
  const was = out.lastYear;
  const rec = out.years[was] = out.years[was] || {};
  if (!rec.items) rec.items = (plan.items || []).filter(i => isSource(i) && inPlay(i) && overlaps(i, yearData(was))).map(i => ({ ...i }));
  out.lastYear = cur;
  return { doc: out, changed: true, rolled: true, from: was };
}

/* ---------- what the plan needs from here ---------- */
/** What is owed, what to keep and the next bills, for this tax year and the return before it. */
function asideFor(plan, doc, today) {
  const cur = taxYearOf(today).id, prev = taxYearAfter(cur, -1);
  const thisOne = personFor(plan, doc, cur, today);
  const pos = howWorkedOut(thisOne.person, today).position;
  const prevRec = (doc.years || {})[prev] || {}, curRec = (doc.years || {})[cur] || {};
  const billNow = billFor(thisOne.person, pos, doc, cur, poaToCome(plan, doc, cur, today), today);
  const bills = [];
  let lastUnpaid = 0;
  // A return's bill: unless it is ticked as paid it is owed, however long ago it was due, and it comes with the first payment on account.
  // Last year's, and any older year with its own record that has not been ticked.
  const older = Object.keys(doc.years || {}).filter(id => id < prev && (doc.years[id].filed || doc.years[id].items)).sort().reverse();
  for (const id of [prev, ...older]) {
    const rec = (doc.years || {})[id] || {}, ticks = rec.ticks || {};
    if ((ticks.pay && ticks.poa2) || !prevHasReturn(plan, doc, id, today)) continue;
    const pf = personFor(plan, doc, id, today);
    const b = billFor(pf.person, howWorkedOut(pf.person, today).position, doc, id, 0, today);
    const when = `${Number(id.slice(0, 4)) + 2}-01-31`, july = `${Number(id.slice(0, 4)) + 2}-07-31`;
    const filed = rec.filed || {};
    if (!ticks.pay) {
      const first = filed.poaFirst != null ? num(filed.poaFirst) : b.poa.first;
      // Collected through the tax code: only a first payment on account is left to pay in January.
      const amount = r2(b.viaCode ? first : filed.total != null ? filed.total + num(filed.poaFirst) : b.january);
      if (amount > 0) { bills.push({ date: when, amount, label: b.viaCode ? `First payment on account ${yearData(id).label}` : `Tax bill ${yearData(id).label}`, year: id, id: 'pay', overdue: when < today }); lastUnpaid += amount; }
    }
    const second = filed.poaSecond != null ? filed.poaSecond : b.july;
    if (second > 0 && !ticks.poa2) { bills.push({ date: july, amount: r2(second), label: 'Second payment on account', year: id, id: 'poa2', overdue: july < today }); lastUnpaid += r2(second); }
  }
  // This year: the share earned so far of what will still be owed.
  const y = yearData(cur);
  const payments = (curRec.payments || []).filter(p => p.date >= y.start && p.date <= y.end);
  const total = payments.reduce((t, p) => t + num(p.amount), 0);
  const inSoFar = payments.filter(p => p.date <= today).reduce((t, p) => t + num(p.amount), 0);
  const yearShare = Math.min(1, Math.max(0, (dayN(today) - dayN(y.start) + 1) / (dayN(y.end) - dayN(y.start) + 1)));
  const earnedShare = total > 0 ? Math.max(inSoFar / total, 0) : yearShare;
  // Collected through a tax code is not a bill, so nothing is kept aside for it.
  const owedThisYear = billNow.viaCode ? 0 : r2(Math.max(0, billNow.balance) * earnedShare);
  const pot = r2(lastUnpaid + owedThisYear);
  const k = keepOf(thisOne.person, 1000);
  return { cur, prev, pos, bill: billNow, bills: bills.sort((a, b) => a.date.localeCompare(b.date)), pot, lastUnpaid: r2(lastUnpaid), owedThisYear, thisYearDue: billNow.balance > 0.5 && !billNow.viaCode ? `${Number(cur.slice(0, 4)) + 2}-01-31` : null, keepShare: k.share, keepPer1000: k.keep, person: thisOne.person };
}
/**
 * The bill for a year. With no return to file, a student loan is not collected on the total, and tax under or over is
 * sorted out through the tax code or a letter (P800), not paid as a bill: https://www.gov.uk/tax-overpayments-and-underpayments
 */
function billFor(person, position, doc, yearId, toCome = 0, today = null) {
  const paid = paidTowards(doc, yearId);
  const all = saBill(position, { paidOnAccount: paid + toCome });
  const b = { ...all, poaToCome: toCome, parts: { ...all.parts, paidOnAccount: paid, poaToCome: toCome } };
  const rec = (doc.years || {})[yearId] || {}, collectIn = yearData(codeYearOf(yearId)).label;
  // The one answer: the money plan asks the same question (uk-tax.mjs settleYear).
  const left = rec.filed && rec.filed.total != null ? rec.filed.total : b.balance;
  const s = settleYear(person, position, { today, left });
  if (s.noReturn) {
    const tax = position.difference.tax;
    return { ...b, owed: tax, balance: tax, refund: r2(Math.max(0, -tax)), january: 0, july: 0, noReturn: true, viaCode: s.viaCode, codeAmount: s.codeAmount, collectIn, poa: { ...b.poa, applies: false, first: 0, second: 0, why: 'You do not need to send a return, so there are no payments on account.' } };
  }
  // A return filed in time for the tax code (the deadline ticked), under the limit, with a job to collect it from.
  if (s.viaCode) return { ...b, viaCode: true, codeAmount: s.codeAmount, collectIn, january: b.poa.first };
  return b;
}
/**
 * What a year leaves to come through a later year's tax code, or null. A past year counts only once the person has looked at it (a guess from today's plan
 * must not lower next year's pay), and not once it is ticked as paid.
 */
function codedFrom(plan, doc, yearId, today) {
  const cur = taxYearOf(today).id, rec = (doc.years || {})[yearId] || {};
  if (yearId > cur || (yearId < cur && !(rec.items || rec.confirmed || rec.filed)) || (rec.ticks || {}).pay) return null;
  const pf = personFor(plan, doc, yearId, today, { bare: true });
  const position = howWorkedOut(pf.person, yearId === cur ? today : null).position;
  const b = billFor(pf.person, position, doc, yearId, poaToCome(plan, doc, yearId, today), today);
  if (!(b.codeAmount > 0)) return null;
  const into = codeYearOf(yearId);
  return opt({ in: into, from: yearId, fromLabel: yearData(yearId).label, amount: b.codeAmount, now: into === cur ? true : undefined });
}
const paidTowards = (doc, yearId) => {
  const prev = (doc.years || {})[taxYearAfter(yearId, -1)];
  const f = prev && prev.filed;
  return f ? r2(num(f.poaFirstPaid ? f.poaFirst : 0) + num(f.poaSecondPaid ? f.poaSecond : 0)) : 0;
};
/**
 * This tax year's payments on account that last year's return sets, not yet marked paid. They are this year's tax, paid early: the
 * balance next January is after them, and keeping money for both would count the same tax twice.
 */
function poaToCome(plan, doc, yearId, today) {
  const prev = taxYearAfter(yearId, -1);
  if (yearId !== taxYearOf(today).id || !prevHasReturn(plan, doc, prev, today)) return 0;
  const f = ((doc.years || {})[prev] || {}).filed || {};
  const pf = personFor(plan, doc, prev, today);
  const b = billFor(pf.person, howWorkedOut(pf.person, today).position, doc, prev, 0, today);
  return r2((f.poaFirstPaid ? 0 : f.poaFirst != null ? num(f.poaFirst) : b.poa.first) + (f.poaSecondPaid ? 0 : f.poaSecond != null ? num(f.poaSecond) : b.poa.second));
}
function prevHasReturn(plan, doc, yearId, today) {
  const { person } = personFor(plan, doc, yearId, today);
  const due = wholeYearLiability(person);
  return needToFile(person, due, doc.prefs || {}).answer !== 'no' || !!((doc.years || {})[yearId] || {}).filed;
}
/** plan.taxLink for the current year: the plan's person, its pot and its bills. */
export function taxLinkFor(plan, doc, today) {
  if (!plan || plan.country !== 'uk') return undefined;
  const cur = taxYearOf(today).id;
  const a = asideFor(plan, doc, today);
  const link = linkFor(planForYear(plan, doc, cur, today).planLike, doc, cur);
  const coded = [taxYearAfter(cur, -2), taxYearAfter(cur, -1), cur].map(id => codedFrom(plan, doc, id, today)).filter(Boolean);
  return opt({ ...link, fileAsk: opt({ ...(link.fileAsk || {}), toCome: a.bill.poaToCome || undefined }), pot: a.pot, bills: a.bills, paidOn: paidTowards(doc, cur), coded: coded.length ? coded : undefined });
}

/* ---------- everything the page shows ---------- */
const STATE_OF = (id, cur) => (id === cur ? 'current' : id < cur ? 'past' : 'future');
export function taxYears(doc, today, also = []) {
  const cur = taxYearOf(today).id, prev = taxYearAfter(cur, -1);
  const ids = new Set([prev, cur, taxYearAfter(cur, 1), ...also, ...Object.keys(doc.years || {})]);
  return [...ids].filter(id => id >= '2025-26' || (doc.years || {})[id]).sort().reverse().map(id => { const y = yearData(id); return { id, label: y.label, state: STATE_OF(id, cur), estimated: !!y.estimated }; });
}
/** On the job it comes through: how much, and which year it is from. */
function codedNote(person, c) {
  const o = person.codedOut;
  if (!o) return [];
  const each = c && c.run.periods.find(p => p.codedOut > 0), word = { monthly: 'month', fourweekly: 'four weeks', fortnightly: 'fortnight', weekly: 'week' }[c && c.run.freq] || 'payslip';
  const pounds = (x) => '£' + Number(x).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (o.inCode) return c && c.main ? [{ level: 'info', text: `Your tax code already takes ${pounds(o.amount)} of tax from ${o.fromLabel} over this tax year. That is not this year's tax, so it is not counted as too much.` }] : [];
  if (!each) return [];
  const taken = r2(c.run.periods.reduce((t, p) => t + (p.codedOut || 0), 0));
  return [{ level: 'info', text: `About ${pounds(each.codedOut)} a ${word} comes off this pay through your tax code: ${pounds(taken)} of tax from ${o.fromLabel}. It is not this year's tax.${taken < r2(o.amount) ? ` This pay can only take ${pounds(taken)} of the ${pounds(o.amount)}. HMRC will tell you about the rest.` : ''}` }];
}
function sourcesOf(planLike, person, position, doc, yearId, today) {
  const rec = (doc.years || {})[yearId] || {};
  const y = yearData(yearId);
  const coll = position.collected;
  const jobs = person.jobs.map(j => {
    const c = coll.jobs.find(x => x.id === j.id);
    const typical = c ? (c.run.periods.filter(p => p.on && !p.bonus).slice(-1)[0] || null) : null;
    const next = c ? c.run.periods.find(p => p.on && !p.past && (p.date || p.to) > today) || null : null;
    const src = (planLike.items || []).find(i => i.id === j.id) || {};
    // The day of the month this job pays, when it is a plain day; paydayOther: it is set some other way (the last working day).
    const w = src.when || null, payday = w && w.t === 'day' ? w.day : null, paydayOther = w && w.t !== 'day' && w.t !== 'every';
    // What this job adds up to: the pay so far, then each payment still to come, then the year (all before tax).
    const cut = (src.ytd && src.ytd.asOf && j.ytd) ? j.ytd.asOf : today;
    const coming = c ? c.run.periods.filter(p => p.on && !p.past && p.gross > 0 && (p.date || p.to) > cut).map(p => ({ date: p.date || p.to, gross: p.gross, bonus: p.bonus > 0 })) : [];
    const total = c ? c.year.pay : 0, comingSum = r2(coming.reduce((t, p) => t + p.gross, 0));
    // Exact payments listed for a later tax year: shown here, counted in their own year.
    const later = (Array.isArray(src.payments) ? src.payments : []).filter(p => p && p.date > y.end).map(p => ({ date: p.date, gross: num(p.amount), yearId: taxYearOf(p.date).id, yearLabel: yearData(taxYearOf(p.date).id).label }));
    const summary = { soFar: r2(total - comingSum), soFarFrom: j.ytd && j.ytd.pay != null ? 'payslip' : 'estimate', coming, total: r2(total), before: num(j.prevPay), later };
    return { id: j.id, name: j.name || (j.main ? 'Your main job' : 'Another job'), main: !!j.main, freq: j.freq, annual: num(j.annual), codeText: c ? c.codeText : '', codeGiven: !!j.taxCode, codeLabel: c ? c.code.label : '', start: j.start || null, end: j.end || null, ytd: src.ytd || null, prevPay: src.prevPay || null, prevTax: src.prevTax || null,
      payday, paydayOther: !!paydayOther, paydayKnown: !!w, payments: Array.isArray(src.payments) ? src.payments : [], bonus: num(src.bonus) || null, bonusOn: src.bonusOn || null, summary, ended: !!j.end && j.end < today,
      year: c ? c.year : null, soFar: c ? c.soFar : null, typical: typical ? { gross: typical.gross, tax: typical.tax, codedOut: typical.codedOut || 0, ni: typical.ni, plan: typical.plan, pg: typical.pg, pensionFromPay: typical.pensionFromPay, takeHome: typical.takeHome } : null, next: next ? { date: next.date || next.to, gross: next.gross, tax: next.tax, codedOut: next.codedOut || 0, ni: next.ni, plan: next.plan, pg: next.pg, takeHome: next.takeHome } : null,
      notes: codedNote(person, c).concat(codeWarnings(person, j)), hasPension: !!(src.pension && src.pension.type && src.pension.type !== 'none') };
  });
  const self = (planLike.items || []).filter(i => i.kind === 'income' && i.incomeType === 'self' && inPlay(i)).map(i => {
    const pays = (rec.payments || []).filter(p => (p.item ? p.item === i.id : true) && p.date >= y.start && p.date <= y.end).sort((a, b) => b.date.localeCompare(a.date));
    const p = person.self.find(s => s.id === i.id) || {};
    const claims = (rec.claims || []).filter(c => !c.item || c.item === i.id);
    return { id: i.id, name: i.name || 'Self-employed work', from: i.starts || null, to: i.ends || null, connected: i.connected === true, income: r2(num(p.amount)), costs: r2(num(p.expenses)), capital: r2(num(p.capital)), typedCosts: num(i.expenses), payments: pays, claims: claims.length, typedIncome: pays.length ? null : num(i.amount) };
  });
  const TYPE = { side: 'Side income', rental: 'Rent', dividend: 'Dividends', interest: 'Savings interest', other: 'Other income' };
  const other = (planLike.items || []).filter(i => i.kind === 'income' && TYPE[i.incomeType] && inPlay(i)).map(i => ({ id: i.id, type: i.incomeType, typeLabel: TYPE[i.incomeType], name: i.name || TYPE[i.incomeType], amount: num(i.amount), per: i.per || 'year', inYear: r2(amountInYear(i, y)) }));
  return { jobs, self, other };
}
export function taxView(plan0, doc0, analysis, o = {}) {
  const today = o.today;
  const doc = cleanTax(doc0), plan = plan0 || { items: [] };
  const cur = taxYearOf(today).id;
  const yearId = o.year && YEAR.test(o.year) ? o.year : cur;
  const y = yearData(yearId);
  // Next tax year is always there to look ahead to; the one after, when this year's tax is due to come through it.
  const ahead = plan.country === 'uk' ? codedFrom(plan, doc, cur, today) : null;
  const years = taxYears(doc, today, ahead ? [ahead.in] : []);
  const country = plan.country || null;
  const base = { hasCountry: !!country, country, uk: country === 'uk', today, year: yearId, yearLabel: y.label, years, estimated: !!y.estimated, figuresFromLabel: y.estimated ? yearData(y.figuresFrom).label : null, prefs: doc.prefs, memory: doc.memory, currency: o.currency || 'GBP' };
  if (country !== 'uk') return base;

  const rec = doc.years[yearId] || {};
  const { person, planLike, link, carried, own } = personFor(plan, doc, yearId, today);
  const how = howWorkedOut(person, yearId === cur ? today : null);
  const position = how.position, due = position.due;
  const paidOn = paidTowards(doc, yearId);
  const bill = billFor(person, position, doc, yearId, poaToCome(plan, doc, yearId, today), today);
  const trade = tradeCompare(person);
  const filing = needToFile(person, due, doc.prefs);
  const sources = sourcesOf(planLike, person, position, doc, yearId, today);
  const ap = allowanceParts(person);
  const aside = asideFor(plan, doc, today);
  const prevId = taxYearAfter(yearId, -1), nextYearId = taxYearAfter(yearId, 1);
  const registered = doc.prefs.registered === true || !!o.hasUtr;
  const under3000 = bill.balance > 0 && bill.balance < y.codeLimit;
  const ctx = { today, registered, paper: doc.prefs.paper, billUnder3000: under3000, noJob: !sources.jobs.length, poaApplies: bill.poa.applies, ticks: rec.ticks || {}, viaCode: !!bill.viaCode, poaFirst: bill.poa.first };
  const deadlines = filing.answer === 'no' && !rec.filed ? [] : yearDeadlines(yearId, ctx).map(d => ({ ...d, task: (rec.tasks || {})[d.id] || null, taskDue: taskDate(d, today), amount: d.id === 'pay' ? bill.january : d.id === 'poa2' ? bill.july : null }));

  // What is coming up, whichever year it belongs to.
  const upcoming = [];
  for (const id of [taxYearAfter(cur, -1), cur]) {
    const r = doc.years[id] || {};
    const p = id === yearId ? { person, position, bill, filing } : (() => { const pf = personFor(plan, doc, id, today); const pp = howWorkedOut(pf.person, id === cur ? today : null).position; const b = billFor(pf.person, pp, doc, id, poaToCome(plan, doc, id, today), today); return { person: pf.person, position: pp, bill: b, filing: needToFile(pf.person, pp.due, doc.prefs) }; })();
    if (p.filing.answer === 'no' && !r.filed) continue;
    for (const d of yearDeadlines(id, { today, registered, paper: doc.prefs.paper, billUnder3000: p.bill.balance > 0 && p.bill.balance < yearData(id).codeLimit, noJob: !p.person.jobs.length, poaApplies: p.bill.poa.applies, ticks: r.ticks || {}, viaCode: !!p.bill.viaCode, poaFirst: p.bill.poa.first })) {
      // A bill not ticked as paid stays, however long ago it was due.
      if (d.state === 'done' || (d.days < -60 && d.kind !== 'pay' && d.kind !== 'poa') || d.days > 520) continue;
      upcoming.push({ ...d, yearLabel: yearData(id).label, task: (r.tasks || {})[d.id] || null, amount: d.id === 'pay' ? p.bill.january : d.id === 'poa2' ? p.bill.july : null });
    }
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  // A year's comparison, when the year before has anything in it.
  let compare = null;
  {
    const pf = personFor(plan, doc, prevId, today);
    const pp = wholeYearLiability(pf.person);
    // Only a year the person has looked at: a guess from today's plan is no comparison.
    const prevRec = doc.years[prevId] || {};
    if (pp.income > 0 && (prevRec.confirmed || prevRec.items || prevRec.filed)) compare = { label: yearData(prevId).label, income: pp.income, tax: pp.tax, class4: pp.class4, loan: pp.loan.total };
  }

  // Prompts for this time of year, less the ones dismissed or made into tasks.
  const lastId = taxYearAfter(cur, -1);
  const prevFiling = (doc.years[lastId] || {}).filed ? { answer: 'no' } : needToFile(personFor(plan, doc, lastId, today).person, wholeYearLiability(personFor(plan, doc, lastId, today).person), doc.prefs);
  const rhythm = rhythmFor(today, { filing: prevFiling, hasJob: sources.jobs.length > 0, hasBik: num((plan.tax || {}).bik) > 0, registered, gatewayBroken: doc.prefs.gatewayBroken === true });
  const promptState = {};
  for (const yr of Object.values(doc.years)) Object.assign(promptState, yr.prompts || {});
  const nextOf = (i) => { try { const d = nextDates(i.when, dn(today) - 1, 1, { country: 'uk' })[0]; return d ? d.date : null; } catch { return null; } };
  const prompts = rhythm.concat(yearId === cur ? lifePrompts(plan.items, today, nextOf) : []).filter(p => !promptState[p.id]);

  // Year-end review.
  const save = (change) => {
    const after = change.addCost ? claimSaving(person, change.addCost) : (() => {
      const a = wholeYearLiability(person), b = wholeYearLiability({ ...person, giftAid: num(person.giftAid) + num(change.giftAid), pensionPaid: num(person.pensionPaid) + num(change.pensionPaid) });
      return r2(a.tax + a.class4 + a.loan.total - (b.tax + b.class4 + b.loan.total));
    })();
    return after;
  };
  const unclaimedTotal = num(o.unclaimedTotal);
  const review = (Number(today.slice(5, 7)) === 3 || (Number(today.slice(5, 7)) === 4 && Number(today.slice(8, 10)) <= 5) || o.showReview) && yearId === cur ? yearEndReview(person, due, { save, unclaimed: unclaimedTotal, isaUsed: (rec.extras || {}).isaUsed, married: true }) : [];

  const notes = notesFor(person, due, { items: planLike.items || [], gainRows: (rec.extras || {}).gains || [], today, gains: ((rec.extras || {}).gains || []).length, isaUsed: (rec.extras || {}).isaUsed, lisaUsed: (rec.extras || {}).lisaUsed, pensionIn: 0, hasEmi: (rec.extras || {}).hasEmi });
  const gainsRows = ((rec.extras || {}).gains || []).map(g => ({ ...g, gain: r2(num(g.proceeds) - num(g.cost)) }));

  return {
    ...base, yearState: STATE_OF(yearId, cur), carried, own, confirmed: rec.confirmed || null,
    sources, lines: how.lines,
    position: { income: due.income, allowance: due.allowance, allowanceUsed: due.allowanceUsed, allowanceLeft: due.allowanceLeft, taxDue: due.tax, taxTaken: position.collected.year.tax, taxLeft: position.difference.tax, class4: due.class4, class2: due.class2, cgt: due.cgt, gains: due.gains, loanDue: due.loan.total, loanTaken: position.collected.year.loans, loanLeft: position.difference.loan, loanOver: position.difference.loanOver, unearned: due.loan.unearned, unearnedCounted: due.loan.unearnedCounted, unearnedLimit: y.loanUnearned, hasLoan: (person.loans || []).length > 0, loanNames: (person.loans || []).map(k => (y.loans[k] ? y.loans[k].name : k)), adjustedNet: due.adjustedNet, hicbc: due.taxParts.hicbc,
      soFar: position.collectedSoFar, hasUntaxed: position.hasUntaxed, ni: position.collected.jobs.map(j => ({ id: j.id, name: j.name, amount: j.year.ni })), niTotal: position.collected.year.ni },
    codedOut: person.codedOut || null, bill: { ...bill, paidOn }, trade, filing, deadlines, upcoming, penaltyLine: PENALTY_LINE, compare, prompts, review, notes,
    aside: { pot: aside.pot, lastUnpaid: aside.lastUnpaid, owedThisYear: aside.owedThisYear, thisYearDue: aside.thisYearDue, keepShare: aside.keepShare, keepPer1000: aside.keepPer1000, bills: aside.bills, mode: (plan.taxAside && plan.taxAside.mode) || 'auto', amount: plan.taxAside && plan.taxAside.amount, have: o.have == null ? null : r2(o.have), short: o.have != null && o.have < aside.pot, monthly: o.planAside != null ? r2(o.planAside) : null },
    claims: rec.claims || [], payments: rec.payments || [], dismissed: rec.dismissed || {}, simplified: rec.simplified || {}, simpleCosts: simplifiedCosts(rec, yearId), extras: rec.extras || {}, gains: gainsRows, walk: rec.walk || {}, hmrc: rec.hmrc || null, filed: rec.filed || null, payslips: rec.payslips || [], docs: rec.docs || [],
    rates: { mileage: y.mileage, wfh: y.wfh, trading: y.trading, aia: y.aia, keepUntil: keepRecordsUntil(yearId) },
    bik: num((planLike.tax || {}).bik), allowance: { ...ap, note: (planLike.tax || {}).allowanceNote || null }, looksOff: looksOff({ person, items: planLike.items || [], rec, parts: ap, year: y.label }).concat(payLooksOff({ jobs: position.collected.jobs.map(c => { const pj = person.jobs.find(x => x.id === c.id) || {}; return { id: c.id, name: c.name || pj.name, taxCode: pj.taxCode, periods: c.run ? c.run.periods : [] }; }), payslips: rec.payslips || [], tx: yearId === taxYearOf(today).id && analysis && Array.isArray(analysis.transactions) ? analysis.transactions : [], today, gone: (id) => !!(rec.dismissed || {})['check:' + id] })), checklists: CHECKLISTS, nextYear: yearData(nextYearId).label, regionName: person.region === 'scotland' ? 'Scottish' : 'UK',
  };
}

/* ---------- the assistant's read: figures only ---------- */
export function taxSummary(view) {
  if (!view || !view.uk) return { hasTaxTab: false };
  const p = view.position;
  return {
    hasTaxTab: true, year: view.yearLabel, yearId: view.year, estimatedFigures: view.estimated, notAdvice: 'Figures from the Freeflo tax engine. State them as they are; never do the tax arithmetic yourself.',
    income: p.income, allowance: { total: p.allowance, used: p.allowanceUsed, left: p.allowanceLeft, usingTheirOwnFigureFromHmrc: view.allowance.override != null, workedOut: view.allowance.workedOut, standard: view.allowance.standard, reducedForHighIncome: view.allowance.taper, blindPersonsAllowance: view.allowance.blind ? view.allowance.blindAmount : 0, marriageAllowanceGiven: view.allowance.give },
    checkThis: (view.looksOff || []).map(n => ({ id: n.id, title: n.title, text: n.text })),
    incomeTax: { due: p.taxDue, takenThroughPayroll: p.taxTaken, left: p.taxLeft }, class4: p.class4, class2: p.class2 && p.class2.voluntary ? { voluntaryPerYear: p.class2.year, onlyIfProfitUnder: p.class2.spt } : null,
    studentLoan: p.hasLoan ? { plans: p.loanNames, due: p.loanDue, takenThroughPayroll: p.loanTaken, left: p.loanLeft, tooMuchTaken: p.loanOver, otherIncome: p.unearned, otherIncomeCounts: p.unearnedCounted, otherIncomeLimit: p.unearnedLimit } : null,
    capitalGainsTax: p.cgt || 0, employeeNI: p.ni.map(n => ({ job: n.name, amount: n.amount })),
    throughTaxCode: view.bill.viaCode && view.bill.codeAmount ? { amount: view.bill.codeAmount, collectedIn: view.bill.collectIn } : null, earlierYearThroughPayslips: view.codedOut ? { amount: view.codedOut.amount, fromYear: view.codedOut.fromLabel } : null,
    bill: { owedOnReturn: view.bill.owed, paidOnAccountAlready: view.bill.paidOn, paymentsOnAccountStillToMake: view.bill.poaToCome || 0, refund: view.bill.refund, january: view.bill.january, july: view.bill.july, paymentsOnAccount: { apply: view.bill.poa.applies, each: view.bill.poa.first, why: view.bill.poa.why } },
    tradingAllowance: view.trade ? { used: view.trade.used, why: view.trade.why, available: view.trade.available, costs: view.trade.costs } : null,
    needToFile: { answer: view.filing.answer, say: view.filing.say, reasons: view.filing.reasons, maybes: view.filing.maybes },
    keepAside: { rightNow: view.aside.pot, ofEach1000: view.aside.keepPer1000, nextBills: view.aside.bills }, lines: view.lines.map(l => ({ key: l.key, label: l.label, amount: l.amount, how: l.how })),
    deadlines: view.upcoming.map(d => ({ id: d.id, year: d.yearLabel, date: d.date, title: d.title, state: d.state, amount: d.amount })),
    jobs: view.sources.jobs.map(j => ({ id: j.id, name: j.name, code: j.codeText, codeMeans: j.codeLabel, annual: j.annual, start: j.start, end: j.end, ended: j.ended, paySoFarThisYear: j.ytd ? { asOf: j.ytd.asOf, pay: j.ytd.pay, tax: j.ytd.tax } : null, exactPaymentsToCome: j.payments, exactPaymentsInLaterYears: j.summary.later, payThisYear: j.summary.total, next: j.next ? { date: j.next.date, takeHome: j.next.takeHome } : null, tax: j.year ? j.year.tax : null, ni: j.year ? j.year.ni : null, loan: j.year ? r2(j.year.plan + j.year.pg) : null, notes: j.notes.map(n => n.text) })),
    selfEmployed: view.sources.self.map(s => ({ id: s.id, name: s.name, from: s.from, to: s.to, income: s.income, costs: s.costs, fromEmployerOrConnected: s.connected })),
    other: view.sources.other.map(s => ({ id: s.id, type: s.typeLabel, name: s.name, amount: s.amount, per: s.per })),
    claims: view.claims.map(c => ({ id: c.id, what: c.what, amount: c.amount, businessPct: c.pct != null ? c.pct : 100, date: c.date || null })),
    notes: view.notes.map(n => n.text), prompts: view.prompts.map(x => ({ title: x.title, text: x.text })),
    filed: view.filed ? { at: view.filed.at, total: view.filed.total, paid: view.filed.paid } : null,
  };
}
