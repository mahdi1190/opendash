// lib/finance/money-plan.mjs - "Your money plan": the plan itself, what it adds up to, and how the bank compares.
// Pure: no I/O, no clock (today comes in). The plan is the person's own data: it lives in the finance folder and syncs
// with the finance edits. It never goes into friends' sharing (lib/friends/share.mjs reads the analysis only) and an AI
// sees it only through planSummary, read only.
//
//   cleanPlan(v)                      a stored or posted plan, checked field by field
//   planView(plan, analysis, o)       everything the page shows: {questions, calc, budget, comingUp, flags, calendar, ...}
//   briefPlan(plan, analysis, o)      {paydays, bills} for MBM.compute: safe to spend and the pay cycle use the plan
//   planSummary(view)                 the read-only money summary (the assistant, Home)
//
// plan = { v: 1, country: null|'uk'|'other', step, done, at, period: 'cycle'|'month',
//   tax: {region, hasJob, loans: [], blind, marriage, bik, noTradingAllowance, allowanceOverride (HMRC's own tax-free amount, with allowanceOverrideYear and allowanceNote)}, taxAside: {mode: 'auto'|'off'|'amount', amount} (the Tax tab can set it),
//   taxLink: what the Tax tab worked out for this tax year (lib/finance/tax-tab.mjs): {year, items: {itemId: {income, costs, capital}}, tradeChoice, gains, childBenefit, giftAid, pensionPaid, claimRas, pot, bills: [{date, amount, label}]},
//   items: [Item], assets: [{id, name, amount, kind}], dismissed: {flagId: date} }
// Item = { id, kind: 'income'|'bill'|'everyday'|'saving'|'debt'|'fund', type?, name, amount, per, cat?,
//   status: 'now'|'later'|'no', paused?, starts?, ends?, when?: rule (pay-dates.mjs), tol?, link?: {m}|{c}, notM?: [merchant],
//   splitWith?: string (names: each time it leaves the bank it splits with them, lib/owed.mjs syncPlanRepeats),
//   income: incomeType: 'job'|'self'|'side'|'benefit'|'rental'|'dividend'|'interest'|'partner'|'other', main?, basis, annual, payslipGross, net,
//     partTime, hoursPct, bonus, bonusAt, bonusOn (a date), payments ([{date, amount}]: exact pay still to come, replaces the yearly pay after the pay-so-far date), overtime, taxCode, prevPay, prevTax, ytd, pension, sacrifice, changes, expenses,
//   debt: balance, apr, minimum; saving: target, saved, by; fund: amount a year, when (a yearly rule) }

import { briefFor, MBM, canonical } from './brief.mjs';
import { COUNTRIES, COUNTRY_QUESTION, countryOf, isJob, mainJob, inPlay, PER } from './countries.mjs';
import { realDates, nextDates, describeRule, detectRule, dn, diso } from './pay-dates.mjs';
import { catalogue, applyParts, cleanParts, sayParts, startsOf, isLump } from './what-if.mjs';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[\w-]{1,40}$/;
const r2 = (x) => Math.round(x * 100) / 100;
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v, n = 80) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n) : '');
const money = (v) => { if (v === null || v === undefined || v === '') return undefined; const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 1e9 ? r2(n) : undefined; };
const dateOf = (v) => (typeof v === 'string' && ISO.test(v) ? v : undefined);
const opt = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const med = (a) => { if (!a.length) return 0; const s = [...a].sort((p, q) => p - q), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/* ---------- what can be planned ---------- */
// The outgoings the questionnaire asks about, in order. Bills have a date; everyday items follow a category.
export const TYPES = Object.freeze({
  rent: { label: 'Rent', group: 'bill', ask: 'Do you pay rent?', cats: ['Rent', 'Housing'], re: /\brent\b|letting|landlord|housing assoc|estates?\b/i, day: 1 },
  mortgage: { label: 'Mortgage', group: 'bill', ask: 'Do you pay a mortgage?', cats: ['Mortgage', 'Housing'], re: /mortgage|building society|nationwide bs|halifax mtg/i, day: 1 },
  council: { label: 'Council tax', group: 'bill', ask: 'Do you pay council tax?', cats: ['Council tax', 'Bills & utilities', 'Tax'], re: /council|borough|city of|district/i, day: 1 },
  electricity: { label: 'Electricity', group: 'bill', ask: 'Do you pay for electricity?', cats: ['Bills & utilities', 'Utilities', 'Energy'], re: /electric|power|energy|octopus|edf|e\.?on|ovo|british gas|scottish ?power|sse|utilita/i, day: 5, varies: true },
  gas: { label: 'Gas', group: 'bill', ask: 'Do you pay for gas as a separate bill?', cats: ['Bills & utilities', 'Utilities', 'Energy'], re: /\bgas\b|british gas|calor/i, day: 5, varies: true },
  water: { label: 'Water', group: 'bill', ask: 'Do you pay for water?', cats: ['Bills & utilities', 'Utilities'], re: /water/i, day: 5 },
  broadband: { label: 'Broadband', group: 'bill', ask: 'Do you pay for broadband?', cats: ['Bills & utilities', 'Utilities', 'Phone'], re: /broadband|fibre|\bbt\b|virgin media|talktalk|plusnet|hyperoptic|\bsky\b/i, day: 15 },
  phone: { label: 'Phone', group: 'bill', ask: 'Do you have a phone contract?', cats: ['Bills & utilities', 'Phone'], re: /mobile|\bee\b|\bo2\b|vodafone|three\b|giffgaff|tesco mobile|voxi|smarty/i, day: 15 },
  tv: { label: 'TV licence', group: 'bill', ask: 'Do you pay for a TV licence?', cats: ['Bills & utilities', 'Subscriptions'], re: /tv licen[cs]e|tvl\b/i, day: 1 },
  insurance: { label: 'Insurance', group: 'bill', ask: 'Do you pay for insurance every month?', cats: ['Insurance', 'Bills & utilities'], re: /insur|shield|aviva|admiral|direct line|lv=|axa/i, day: 1 },
  childcare: { label: 'Childcare', group: 'bill', ask: 'Do you pay for childcare?', cats: ['Childcare', 'Family'], re: /nursery|childcare|childminder|after.?school/i, day: 1 },
  gym: { label: 'Gym', group: 'bill', ask: 'Do you pay for a gym?', cats: ['Fitness', 'Health'], re: /gym|fitness|puregym|david lloyd/i, day: 1 },
  transport: { label: 'Transport', group: 'everyday', ask: 'Do you spend on transport?', cats: ['Transport', 'Travel'] },
  groceries: { label: 'Groceries', group: 'everyday', ask: 'Do you spend on groceries?', cats: ['Groceries', 'Food'] },
  subscriptions: { label: 'Subscriptions', group: 'everyday', ask: 'Do you spend on subscriptions?', cats: ['Subscriptions', 'Entertainment'] },
  pets: { label: 'Pets', group: 'everyday', ask: 'Do you spend on pets?', cats: ['Pets'] },
});
const TYPE_ORDER = Object.keys(TYPES);

/* ---------- checking a plan ---------- */
function cleanRule(r) {
  if (!isObj(r)) return null;
  const adjust = ['prev', 'next', 'none'].includes(r.adjust) ? r.adjust : undefined;
  if (r.t === 'day') return opt({ t: 'day', day: Math.min(31, Math.max(1, Math.floor(num(r.day)) || 1)), adjust });
  if (r.t === 'lastWorking') return { t: 'lastWorking' };
  if (r.t === 'lastWeekday') return { t: 'lastWeekday', wd: Math.min(6, Math.max(0, Math.floor(num(r.wd)))) };
  if (r.t === 'every' && [7, 14, 28].includes(Number(r.days))) return opt({ t: 'every', days: Number(r.days), anchor: dateOf(r.anchor), adjust });
  if (r.t === 'months' && [3, 12].includes(Number(r.every))) return opt({ t: 'months', every: Number(r.every), month: Math.min(12, Math.max(1, Math.floor(num(r.month)) || 1)), day: Math.min(31, Math.max(1, Math.floor(num(r.day)) || 1)), adjust });
  return null;
}
const pct = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 100 ? r2(n) : undefined; };
function cleanItem(i) {
  if (!isObj(i) || !ID.test(String(i.id || ''))) return null;
  const kind = ['income', 'bill', 'everyday', 'saving', 'debt', 'fund'].includes(i.kind) ? i.kind : null;
  if (!kind) return null;
  const out = opt({
    id: i.id, kind, type: TYPES[i.type] ? i.type : undefined, name: str(i.name, 60), amount: money(i.amount), per: ['month', 'week', 'fortnight', '4weeks', 'quarter', 'year', 'total'].includes(i.per) ? i.per : undefined,
    cat: str(i.cat, 40) || undefined, status: ['now', 'later', 'no'].includes(i.status) ? i.status : 'now', paused: i.paused === true ? true : undefined,
    starts: dateOf(i.starts), ends: dateOf(i.ends), when: cleanRule(i.when) || undefined, tol: Number.isFinite(Number(i.tol)) && Number(i.tol) >= 0 && Number(i.tol) <= 15 && i.tol !== '' && i.tol != null ? Math.floor(Number(i.tol)) : undefined,
    splitWith: str(i.splitWith, 120) || undefined,
  });
  if (isObj(i.link)) { if (typeof i.link.m === 'string' && i.link.m) out.link = { m: i.link.m.slice(0, 120) }; else if (typeof i.link.c === 'string' && i.link.c) out.link = { c: i.link.c.slice(0, 40) }; }
  if (Array.isArray(i.notM)) { const n = i.notM.filter(x => typeof x === 'string' && x).map(x => x.slice(0, 120)).slice(0, 20); if (n.length) out.notM = n; }
  if (kind === 'income') {
    Object.assign(out, opt({ incomeType: ['job', 'self', 'side', 'benefit', 'rental', 'dividend', 'interest', 'partner', 'other'].includes(i.incomeType) ? i.incomeType : 'other', main: i.main === true ? true : undefined,
      basis: i.basis === 'payslip' ? 'payslip' : undefined, annual: money(i.annual), payslipGross: money(i.payslipGross), net: money(i.net), partTime: i.partTime === true ? true : undefined, hoursPct: pct(i.hoursPct),
      bonus: money(i.bonus), bonusOn: dateOf(i.bonusOn), bonusAt: Number.isFinite(Number(i.bonusAt)) ? Math.min(51, Math.max(0, Math.floor(Number(i.bonusAt)))) : undefined, overtime: money(i.overtime),
      taxCode: str(i.taxCode, 12).toUpperCase() || undefined, prevPay: money(i.prevPay), prevTax: money(i.prevTax), sacrifice: money(i.sacrifice), expenses: money(i.expenses), connected: i.connected === true ? true : undefined }));
    if (isObj(i.pension)) { const t = ['sacrifice', 'netpay', 'ras', 'none'].includes(i.pension.type) ? i.pension.type : null; if (t) out.pension = opt({ type: t, pct: pct(i.pension.pct), amount: money(i.pension.amount), employerPct: pct(i.pension.employerPct), employerAmount: money(i.pension.employerAmount), base: i.pension.base === 'qualifying' ? 'qualifying' : undefined, starts: dateOf(i.pension.starts) }); }
    if (Array.isArray(i.payments)) { const p = i.payments.filter(x => isObj(x) && dateOf(x.date) && money(x.amount) > 0).slice(0, 60).map(x => ({ date: x.date, amount: money(x.amount) })).sort((a, b) => a.date.localeCompare(b.date)); if (p.length) out.payments = p; }
    if (isObj(i.ytd) && dateOf(i.ytd.asOf)) out.ytd = opt({ asOf: i.ytd.asOf, pay: money(i.ytd.pay), taxablePay: money(i.ytd.taxablePay), tax: money(i.ytd.tax), ni: money(i.ytd.ni), plan: money(i.ytd.plan), pg: money(i.ytd.pg) });
    if (Array.isArray(i.changes)) { const c = i.changes.filter(x => isObj(x) && dateOf(x.from) && money(x.annual) !== undefined).slice(0, 12).map(x => ({ from: x.from, annual: money(x.annual) })); if (c.length) out.changes = c; }
  }
  if (kind === 'debt') Object.assign(out, opt({ balance: money(i.balance), apr: pct(i.apr), minimum: money(i.minimum), debtType: str(i.debtType, 20) || undefined }));
  if (kind === 'saving') Object.assign(out, opt({ target: money(i.target), saved: money(i.saved), by: dateOf(i.by) }));
  return out;
}
function cleanTaxLink(v) {
  if (!isObj(v) || typeof v.year !== 'string' || !/^\d{4}-\d{2}$/.test(v.year)) return undefined;
  const items = {};
  for (const [k, x] of Object.entries(isObj(v.items) ? v.items : {}).slice(0, 60)) if (ID.test(k) && isObj(x)) items[k] = opt({ income: money(x.income), costs: money(x.costs), capital: money(x.capital) });
  const bills = (Array.isArray(v.bills) ? v.bills : []).slice(0, 8).filter(b => isObj(b) && dateOf(b.date) && money(b.amount)).map(b => ({ date: b.date, amount: money(b.amount), label: str(b.label, 60) || 'Tax bill' }));
  return opt({ year: v.year, items, tradeChoice: ['auto', 'allowance', 'actual'].includes(v.tradeChoice) ? v.tradeChoice : undefined, gains: money(v.gains), childBenefit: money(v.childBenefit), giftAid: money(v.giftAid), pensionPaid: money(v.pensionPaid), claimRas: v.claimRas === true ? true : undefined, pot: money(v.pot), paidOn: money(v.paidOn), bills });
}
/** Saved what-ifs: {id, name, parts}; a part's values are checked again when it is used. */
const cleanScenarios = (v) => (Array.isArray(v) ? v : []).slice(0, 30).map(s => (isObj(s) && ID.test(String(s.id || '')) ? { id: s.id, name: str(s.name, 60) || 'My what if', parts: cleanParts(s.parts) } : null)).filter(Boolean);
export function cleanPlan(v) {
  const o = isObj(v) ? v : {};
  const t = isObj(o.tax) ? o.tax : {};
  const seen = new Set();
  const items = (Array.isArray(o.items) ? o.items : []).slice(0, 200).map(cleanItem).filter(i => i && !seen.has(i.id) && seen.add(i.id));
  const assets = (Array.isArray(o.assets) ? o.assets : []).slice(0, 40).map(a => (isObj(a) && ID.test(String(a.id || '')) ? opt({ id: a.id, name: str(a.name, 60), amount: money(a.amount), kind: str(a.kind, 20) }) : null)).filter(Boolean);
  const dismissed = {};
  for (const [k, d] of Object.entries(isObj(o.dismissed) ? o.dismissed : {}).slice(0, 200)) if (typeof k === 'string' && k.length <= 100 && dateOf(d)) dismissed[k] = d;
  return {
    v: 1, country: COUNTRIES[o.country] ? o.country : null, step: typeof o.step === 'string' && o.step.length <= 40 ? o.step : null, done: o.done === true, at: typeof o.at === 'string' ? o.at.slice(0, 40) : null, period: o.period === 'month' ? 'month' : 'cycle',
    tax: opt({ region: t.region === 'scotland' ? 'scotland' : t.region === 'ruk' ? 'ruk' : undefined, hasJob: typeof t.hasJob === 'boolean' ? t.hasJob : undefined, loans: Array.isArray(t.loans) ? t.loans.filter(x => ['plan1', 'plan2', 'plan4', 'plan5', 'pg'].includes(x)) : undefined,
      blind: t.blind === true ? true : t.blind === false ? false : undefined, marriage: ['none', 'give', 'get'].includes(t.marriage) ? t.marriage : undefined, bik: money(t.bik), noTradingAllowance: t.noTradingAllowance === true ? true : undefined,
      allowanceOverride: money(t.allowanceOverride), allowanceOverrideYear: /^\d{4}-\d{2}$/.test(String(t.allowanceOverrideYear || '')) && money(t.allowanceOverride) !== undefined ? t.allowanceOverrideYear : undefined, allowanceNote: str(t.allowanceNote, 120) || undefined }),
    taxAside: isObj(o.taxAside) ? opt({ mode: ['auto', 'off', 'amount'].includes(o.taxAside.mode) ? o.taxAside.mode : 'auto', amount: money(o.taxAside.amount) }) : { mode: 'auto' },
    taxLink: cleanTaxLink(o.taxLink),
    items, assets, dismissed, debtExtra: money(o.debtExtra) || undefined, oneOffOut: money(o.oneOffOut) || undefined, oneOffIn: money(o.oneOffIn) || undefined, scenarios: cleanScenarios(o.scenarios),
  };
}

/* ---------- item helpers ---------- */
// off: not part of the plan; paused; future: not yet; ended; active.
export function itemState(i, todayN) {
  if (!i || i.status === 'no') return 'off';
  if (i.paused) return 'paused';
  if (i.status === 'later' && !i.starts) return 'future';
  if (i.starts && dn(i.starts) > todayN) return 'future';
  if (i.ends && dn(i.ends) < todayN) return 'ended';
  return 'active';
}
const activeOn = (i, n) => inPlay(i) && (!i.starts || dn(i.starts) <= n) && (!i.ends || dn(i.ends) >= n);
function monthlyOf(i, calc) {
  if (isJob(i)) { const j = calc && calc.jobs && calc.jobs[i.id]; return j ? j.monthly : 0; }
  if (i.kind === 'debt') return num(i.minimum);
  if (i.kind === 'saving') return savingPerMonth(i);
  // A period of work with one total: spread over its own months while it runs.
  if (i.per === 'total') { const days = i.starts && i.ends ? dn(i.ends) - dn(i.starts) + 1 : 365; return num(i.amount) / Math.max(1, days / 30.44); }
  if (i.kind === 'fund') return num(i.amount) * (PER[i.per || 'year'] || 1 / 12);
  return num(i.amount) * (PER[i.per || 'month'] || 1);
}
function savingPerMonth(i, todayN) {
  if (i.amount) return num(i.amount) * (PER[i.per || 'month'] || 1);
  if (i.target && i.by && todayN != null) return Math.max(0, num(i.target) - num(i.saved)) / Math.max(1, (dn(i.by) - todayN) / 30.44);
  return 0;
}
const GROUP_OF = { bill: 'bills', everyday: 'everyday', saving: 'savings', fund: 'savings', debt: 'debts' };
const GROUPS = [['bills', 'Bills'], ['everyday', 'Everyday'], ['savings', 'Savings'], ['debts', 'Debts']];
const tolOf = (i) => (i.tol != null ? i.tol : isJob(i) ? 3 : 4);

/* ---------- the bank's side ---------- */
function bankIndex(input) {
  const byM = new Map(), payers = new Map();
  for (const t of input.tx) {
    if (t.kind === 'spend' && t.s > 0) { let a = byM.get(t.m); if (!a) { a = []; byM.set(t.m, a); } a.push(t); }
    if (t.kind === 'income' && t.inc > 0) { let a = payers.get(t.m); if (!a) { a = []; payers.set(t.m, a); } a.push(t); }
  }
  for (const a of byM.values()) a.sort((p, q) => p.n - q.n);
  for (const a of payers.values()) a.sort((p, q) => p.n - q.n);
  return { byM, payers, recs: (input.recurring || []).filter(r => r.active), cats: new Set(input.tx.map(t => t.c)) };
}
/** What the bank suggests, for the questionnaire. */
function guessFromBank(input, bank, ctx) {
  const out = {};
  const sal = MBM.salary(input.tx, input.anchor);
  if (sal) {
    const d = detectRule(sal.days, { kind: 'pay', country: ctx.calendar || 'none' });
    out.salary = { m: sal.m, amount: sal.amount, days: sal.days.length, rule: d ? d.rule : { t: 'day', day: sal.dom, adjust: 'prev' } };
  }
  const used = new Set();
  for (const k of TYPE_ORDER) {
    const T = TYPES[k];
    if (T.group !== 'bill' || !T.re) continue;
    const r = bank.recs.find(x => !used.has(x.m) && T.re.test(x.m));
    if (r) {
      used.add(r.m);
      const d = detectRule((r.charges || []).map(c => c.n), { kind: 'bill', country: ctx.calendar || 'none' });
      out[k] = { m: r.m, amount: r2(r.varies ? r.typical : r.lastAmt), rule: d ? d.rule : null };
    }
  }
  for (const k of TYPE_ORDER) {
    const T = TYPES[k];
    if (T.group !== 'everyday') continue;
    const cat = T.cats.find(c => bank.cats.has(c));
    if (!cat) continue;
    const m0 = MBM.util.mIdx(input.anchor);
    let tot = 0, months = 0;
    for (let k2 = 1; k2 <= 3; k2++) {
      const s = MBM.util.mStart(m0 - k2), e = MBM.util.mStart(m0 - k2 + 1) - 1;
      if (e < input.minN) continue;
      months++;
      for (const t of input.tx) if (t.kind === 'spend' && t.c === cat && t.n >= s && t.n <= e) tot += t.s;
    }
    if (months) out[k] = { c: cat, amount: Math.round(tot / months / 5) * 5 };
  }
  return out;
}
function catFor(item, bank) {
  if (item.cat) return item.cat;
  const T = TYPES[item.type];
  return (T && T.cats.find(c => bank.cats.has(c))) || (T && T.cats[0]) || null;
}
/** Each item's link to the bank: the one chosen by hand, else the best guess by name, amount and date. Mutates a fresh map. */
function linkAll(plan, input, bank, calc) {
  const links = new Map();
  const used = new Set(), usedPayers = new Set();
  for (const i of plan.items) if (i.link && i.link.m) { used.add(i.link.m); usedPayers.add(i.link.m); }
  const sal = MBM.salary(input.tx, input.anchor);
  const items = plan.items.filter(i => i.status !== 'no').slice().sort((a, b) => monthlyOf(b, calc) - monthlyOf(a, calc));
  for (const i of items) {
    const not = new Set(i.notM || []);
    if (i.link) { links.set(i.id, { ...i.link, by: 'you' }); continue; }
    if (i.kind === 'everyday') { const c = catFor(i, bank); if (c) links.set(i.id, { c, by: 'guess' }); continue; }
    if (i.kind === 'income') {
      if (!isJob(i)) { const best = [...bank.payers.keys()].find(m => !usedPayers.has(m) && !not.has(m) && i.name && m.toLowerCase().includes(i.name.toLowerCase())); if (best) { usedPayers.add(best); links.set(i.id, { m: best, by: 'guess' }); } continue; }
      const j = calc && calc.jobs && calc.jobs[i.id];
      let best = null, bestS = 0;
      for (const [m, list] of bank.payers) {
        if (usedPayers.has(m) || not.has(m) || list.length < 2) continue;
        let s = 0;
        if (i.name && m.toLowerCase().includes(i.name.toLowerCase())) s += 3;
        const typical = med(list.slice(-6).map(t => t.inc)), want = j && j.payslip ? j.payslip.takeHome : 0;
        if (want > 0 && Math.abs(typical - want) / want <= 0.25) s += 2;
        if (i.main && sal && sal.m === m) s += 2;
        if (s > bestS) { bestS = s; best = m; }
      }
      if (best && bestS >= 2) { usedPayers.add(best); links.set(i.id, { m: best, by: 'guess' }); }
      continue;
    }
    if (i.kind === 'saving') continue;
    // Bills, debts, yearly funds: a regular payment. Name first; then amount and date together.
    const T = TYPES[i.type];
    const nameRe = T && T.re ? T.re : null;
    const words = str(i.name, 60).toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let best = null, bestS = 0;
    for (const r of bank.recs) {
      if (used.has(r.m) || not.has(r.m)) continue;
      let s = 0;
      const low = String(r.m).toLowerCase();
      if ((nameRe && nameRe.test(r.m)) || words.some(w => low.includes(w))) s += 3;
      const want = i.kind === 'debt' ? num(i.minimum) : num(i.amount);
      if (want > 0) { const off = Math.abs(r.typical - want) / want; if (off <= 0.12) s += 2; else if (off <= 0.35) s += 1; }
      if (i.when && i.when.t === 'day' && (r.charges || []).length) { const dom = MBM.util.domOf(r.last); if (Math.abs(dom - i.when.day) <= 3) s += 1; }
      if (T && T.cats.includes(r.cat)) s += 1;
      if (s > bestS) { bestS = s; best = r.m; }
    }
    if (best && bestS >= 3) { used.add(best); links.set(i.id, { m: best, by: 'guess' }); }
  }
  return links;
}
const merchantRule = (bank, m, kind, ctx) => {
  const list = bank.byM.get(m) || bank.payers.get(m);
  if (!list) return null;
  const d = detectRule(list.map(t => t.n), { kind, country: ctx.calendar || 'none' });
  return d ? d.rule : null;
};
/** Each expected date since `from`, against what the bank shows. */
function checkDates(i, rule, charges, ctx, from, to) {
  const { todayN } = ctx;
  const tol = tolOf(i);
  const used = new Set();
  const rows = [];
  for (const occ of realDates(rule, from, to, { country: ctx.calendar || 'none' })) {
    let hit = null, best = 99;
    for (const t of charges) { const dd = Math.abs(t.n - occ.n); if (dd <= tol && dd < best && !used.has(t)) { best = dd; hit = t; } }
    if (hit) used.add(hit);
    rows.push({ n: occ.n, date: occ.date, moved: occ.moved, paid: hit ? { n: hit.n, date: hit.d, amount: r2(isJob(i) || i.kind === 'income' ? hit.inc : hit.s) } : null,
      state: hit ? 'paid' : occ.n + tol < todayN ? 'late' : occ.n <= todayN ? 'due' : 'coming' });
  }
  return rows;
}

/* ---------- everything the page shows ---------- */
export function planView(plan0, analysis, o = {}) {
  const plan = cleanPlan(plan0);
  const today = o.today, todayN = dn(today);
  const country = countryOf(plan.country);
  const calendar = country ? country.calendar : null;
  const input = MBM.fromAnalysis(analysis && typeof analysis === 'object' ? { ...analysis, today } : { today, transactions: [] }, {});
  const fmt = MBM.makeFmt(o.currency, o.locale);
  if (canonical) fmt.name = canonical;
  const bank = bankIndex(input);
  const ctx = { today, todayN, calendar, fmt, input, bank };
  ctx.guesses = guessFromBank(input, bank, ctx);
  const calc = country ? country.calc(plan, ctx) : null;
  const links = linkAll(plan, input, bank, calc);
  // Pay cycle, safe to spend: the plan's dates (briefPlan is the same list the page and Home pass to MBM.compute).
  const forBrief = planForBrief(plan, input, bank, links, ctx);
  const { B } = briefFor(analysis && typeof analysis === 'object' ? analysis : { transactions: [] }, { mode: plan.period === 'month' ? 'month' : undefined, currency: o.currency, locale: o.locale, today, plan: forBrief, input });
  const cycle = B.cycle;
  ctx.cycle = cycle; ctx.B = B;

  // Each item, as a row: the plan, the link, the dates, this period's actual.
  const rows = new Map();
  for (const i of plan.items) rows.set(i.id, itemRow(i, plan, ctx, calc, links));

  // The budget now, and from any later date.
  const budgetAt = (n) => budgetNumbers(plan, calc, n, todayN);
  const now = budgetAt(todayN);
  const budget = {
    period: cycle.mode, income: now.income, left: now.left, aside: now.aside, asideWord: 'Tax still to pay',
    incomeRows: plan.items.filter(i => i.kind === 'income' && itemState(i, todayN) !== 'off').map(i => rows.get(i.id)),
    groups: GROUPS.map(([id, label]) => {
      const list = plan.items.filter(i => GROUP_OF[i.kind] === id && itemState(i, todayN) !== 'off').map(i => rows.get(i.id));
      const live = list.filter(r => r.state === 'active');
      return { id, label, total: r2(now.groups[id]), rows: list, actual: r2(live.reduce((t, r) => t + (r.actual || 0), 0)), planned: r2(live.reduce((t, r) => t + (r.perPeriod || 0), 0)) };
    }),
    suggestedSaving: now.left > 0 && now.groups.savings === 0 ? Math.floor(now.left * 0.5 / 5) * 5 : 0,
    suggestEveryday: Object.keys(TYPES).filter(k => TYPES[k].group === 'everyday' && ctx.guesses[k] && ctx.guesses[k].amount > 0 && !plan.items.some(i => i.type === k)).map(k => ({ type: k, label: TYPES[k].label, amount: ctx.guesses[k].amount })),
  };
  // Coming up.
  const comingUp = plan.items.filter(i => inPlay(i) && i.starts && dn(i.starts) > todayN || (i.status === 'later' && !i.starts)).map(i => {
    const n = i.starts ? dn(i.starts) : null;
    return { id: i.id, name: i.name || (TYPES[i.type] && TYPES[i.type].label) || 'Something new', kind: i.kind, from: i.starts || null, amount: r2(monthlyOf(i, calc)), leftAfter: n ? budgetAt(n).left : null };
  }).sort((a, b) => (a.from || '9').localeCompare(b.from || '9'));

  const flags = country ? allFlags(plan, ctx, calc, rows, bank, budget, links) : [];
  const out = {
    has: !!country, country: plan.country, countryName: country ? country.name : null, done: plan.done, step: plan.step,
    questions: questionsFor(plan, ctx, country), countries: Object.values(COUNTRIES).map(c => ({ id: c.id, name: c.name })),
    calc: calc ? publicCalc(calc) : null,
    budget, comingUp, flags, rows: Object.fromEntries(rows),
    paydays: paydayView(plan, ctx), cycle: { mode: cycle.mode, start: diso(cycle.start), next: diso(cycle.next), daysLeft: cycle.daysLeft, late: !!cycle.late, label: cycle.mode === 'cycle' ? 'between paydays' : 'this month' },
    calendar: monthCalendar(plan, ctx, calc, rows, budget),
    debts: debtsView(plan, fmt, todayN), goals: goalsView(plan, todayN), funds: fundsView(plan, ctx), netWorth: netWorthView(plan, input),
    annual: annualView(plan, input, budget, todayN),
    checks: country ? country.checks(plan, calc, ctx) : [],
    choices: bankChoices(bank, input), forBrief: { paydays: forBrief.paydays, bills: forBrief.bills },
    today, currency: o.currency || 'GBP', hasBank: input.tx.length > 0,
    whatIf: country ? { catalogue: catalogue(plan, symOf(o)), saved: plan.scenarios || [] } : null,
    taxPot: plan.taxLink && plan.taxAside && plan.taxAside.mode !== 'off' ? num(plan.taxLink.pot) : 0,
  };
  return out;
}

/* ---------- What if? ---------- */
const symOf = (o) => String(MBM.makeFmt(o.currency, o.locale).money(0)).replace(/[\d.,\s\u2212-]/g, '') || '£';
/** The numbers a scenario is judged by. A change that starts later shows as it will be then. */
export function planMetrics(plan, o = {}) {
  const today = o.today, todayN = dn(today);
  const country = countryOf(plan.country);
  if (!country) return null;
  const ctx = { today, todayN, calendar: country.calendar, guesses: {}, fmt: MBM.makeFmt(o.currency, o.locale) };
  const calc = country.calc(plan, ctx);
  const at = Math.max(todayN, ...(o.starts || []).map(dn));
  const b = budgetNumbers(plan, calc, at, todayN);
  const debts = plan.items.filter(i => i.kind === 'debt' && activeOn(i, at)).map(i => ({ balance: num(i.balance), apr: num(i.apr), minimum: num(i.minimum) }));
  const sim = simulateDebts(debts, num(plan.debtExtra), 'avalanche');
  // Savings a month: what the plan puts aside; the pot: what is already there, less a one-off, plus one coming in.
  const lumpIn = num(o.lumpIn) + num(plan.oneOffIn);
  const pot = num(o.accounts) + (plan.assets || []).reduce((t, a) => t + num(a.amount), 0) - num(plan.oneOffOut) + lumpIn;
  const goal = plan.items.find(i => i.kind === 'saving' && inPlay(i) && i.target);
  let toGoal = null;
  if (goal) {
    const need = Math.max(0, num(goal.target) - num(goal.saved) + num(plan.oneOffOut) - lumpIn);
    const a = goal.amount ? monthlyOf(goal, calc) : savingPerMonth(goal, todayN);
    // What the goal gets already, plus what is left over: so a rise or a cut shows here too.
    const monthly = Math.max(0, a) + Math.max(0, b.left);
    const months = need <= 0 ? 0 : monthly > 0 ? Math.ceil(need / monthly) : null;
    toGoal = { name: goal.name || 'Your goal', months, date: months != null ? addMonthsIso(todayN, months) : null };
  }
  return {
    at: diso(at), takeHome: b.income, left: b.left, savings: r2(b.groups.savings), bills: r2(b.groups.bills + b.groups.everyday + b.groups.debts), aside: b.aside, pot: r2(pot), yearTakeHome: r2(calc && calc.perYear ? calc.perYear.takeHome : 0),
    debtFree: debts.length ? { months: sim.months, date: sim.months != null ? addMonthsIso(todayN, sim.months) : null, stuck: sim.stuck, interest: sim.interest } : null, debtTotal: r2(debts.reduce((t, d) => t + d.balance, 0)), goal: toGoal,
  };
}
/**
 * Today against a scenario (and a second one to compare). Nothing is saved: plan in each result is what
 * "Make this my plan" would save. accounts: money already in connected accounts, from the analysis.
 */
export function whatIf(plan0, analysis, parts, o = {}) {
  const plan = cleanPlan(plan0);
  const balances = analysis && Array.isArray(analysis.balances) ? analysis.balances.filter(b => b && Number.isFinite(+b.balance) && !/credit|loan|mortgage/i.test(String(b.kind || ''))) : [];
  const accounts = balances.reduce((t, b) => t + +b.balance, 0);
  const base = planMetrics(plan, { ...o, accounts });
  if (!base) return null;
  const one = (ps) => {
    const list = cleanParts(ps);
    const starts = startsOf(list);
    const applied = cleanPlan(applyParts(plan, list));
    // A one-off coming in (a bonus): what it leaves after tax goes on top of the pot, and a one-off is never in the plan's months.
    const withoutIn = cleanPlan(applyParts(plan, list.filter(p => !isLump(p.type) || p.type === 'purchase')));
    const m0 = planMetrics(withoutIn, { ...o, accounts, starts });
    const m1 = planMetrics(applied, { ...o, accounts, starts });
    const lumpIn = Math.max(0, r2(m1.yearTakeHome - m0.yearTakeHome));
    const m = planMetrics(applied, { ...o, accounts, starts, lumpIn });
    const out = { parts: list, said: sayParts(plan, list, symOf(o)), metrics: m, lumpIn: r2(lumpIn + num(applied.oneOffIn)), plan: applied };
    return out;
  };
  return { today: base, a: one(parts), b: o.compare ? one(o.compare) : null };
}
function budgetNumbers(plan, calc, n, todayN) {
  const income = plan.items.filter(i => i.kind === 'income' && activeOn(i, n)).reduce((t, i) => t + monthlyOf(i, calc), 0);
  const groups = {};
  for (const [g] of GROUPS) groups[g] = 0;
  for (const i of plan.items) { const g = GROUP_OF[i.kind]; if (g && activeOn(i, n)) groups[g] += i.kind === 'saving' ? savingPerMonth(i, todayN) : monthlyOf(i, calc); }
  groups.debts += num(plan.debtExtra);
  const aside = asideMonthly(plan, calc);
  return { income: r2(income), groups, aside, left: r2(income - groups.bills - groups.everyday - groups.savings - groups.debts - aside) };
}
const asideMonthly = (plan, calc) => {
  const a = plan.taxAside || { mode: 'auto' };
  if (a.mode === 'off') return 0;
  if (a.mode === 'amount') return num(a.amount);
  return calc && calc.stillToPay > 0.5 ? r2(calc.stillToPay / 12) : 0;
};
const publicCalc = (c) => { const { person, position, ...rest } = c; return { ...rest, due: position ? { tax: position.due.tax, class4: position.due.class4, loan: position.due.loan.total, allowance: position.due.allowance, income: position.due.income, difference: position.difference } : null }; };
function questionsFor(plan, ctx, country) {
  const list = [COUNTRY_QUESTION];
  if (!country) return list;
  const job = mainJob(plan);
  list.push(...country.questions(plan, ctx).map(q => withValue(q, plan, job)));
  // The outgoings every country has: now, later, or not at all.
  for (const k of TYPE_ORDER) {
    const T = TYPES[k];
    const g = ctx.guesses[k];
    const it = plan.items.find(i => i.type === k && (i.kind === 'bill' || i.kind === 'everyday'));
    list.push({ id: 't-' + k, group: T.group === 'bill' ? 'What you pay' : 'Day to day', title: T.ask, kind: 'timing', itemType: k, label: T.label, itemKind: T.group, askDate: T.group === 'bill',
      guess: g ? { amount: g.amount, m: g.m, c: g.c, rule: g.rule || null, text: g.m ? `Your bank shows ${g.m}, about ${ctx.fmt.money(g.amount)}.` : `You usually spend about ${ctx.fmt.money(g.amount)} a month.` } : null, defDay: T.day || 1, value: it || null });
  }
  list.push({ id: 'debts', short: 'What you owe', group: 'What you owe', title: 'Do you owe anything?', help: 'Credit cards, overdrafts, loans, car finance, buy now pay later. APR is the yearly interest rate on your statement.', kind: 'list', list: 'debt', add: 'Add a debt',
    columns: [{ key: 'name', type: 'text', label: 'Name' }, { key: 'balance', type: 'money', label: 'Owed now' }, { key: 'apr', type: 'percent', label: 'APR %' }, { key: 'minimum', type: 'money', label: 'Least you pay a month' }] });
  list.push({ id: 'goals', short: 'Saving goals', group: 'Saving', title: 'Are you saving for anything?', help: 'Give a target and a date and we tell you how much a month it takes.', kind: 'list', list: 'saving', add: 'Add a goal',
    columns: [{ key: 'name', type: 'text', label: 'Goal' }, { key: 'target', type: 'money', label: 'Target' }, { key: 'saved', type: 'money', label: 'Saved so far' }, { key: 'by', type: 'date', label: 'By' }] });
  list.push({ id: 'funds', short: 'Yearly bills', group: 'Saving', title: 'Any big bills once a year?', help: 'Car insurance, MOT, Christmas. We spread them over the year so they do not surprise you.', kind: 'list', list: 'fund', add: 'Add a yearly bill',
    columns: [{ key: 'name', type: 'text', label: 'What' }, { key: 'amount', type: 'money', label: 'Cost a year' }, { key: 'dueMonth', type: 'select', label: 'Due in', options: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => [i + 1, m]) }] });
  list.push({ id: 'assets', short: 'Savings and pots', group: 'Saving', title: 'What do you have put away?', help: 'Savings, ISAs (tax-free savings accounts), a pension pot. For your net worth: what you own minus what you owe. Accounts already connected count on their own.', kind: 'list', list: 'asset', add: 'Add something',
    columns: [{ key: 'name', type: 'text', label: 'What' }, { key: 'amount', type: 'money', label: 'Worth now' }] });
  return list;
}
function withValue(q, plan, job) {
  const copy = { ...q };
  if (q.path) copy.value = readPath(plan, q.path, job);
  if (q.fields) copy.fields = q.fields.map(f => ({ ...f, value: readPath(plan, f.path, job) }));
  return copy;
}
const readPath = (plan, path, job) => {
  const [root, ...rest] = path.split('.');
  let cur = root === 'job' ? job : plan[root];
  if (root === 'country') return plan.country;
  for (const k of rest) cur = cur == null ? cur : cur[k];
  return cur === undefined ? null : cur;
};

/* ---------- one planned item ---------- */
function itemRow(i, plan, ctx, calc, links) {
  const { todayN, cycle, fmt, bank } = ctx;
  const state = itemState(i, todayN);
  const link = links.get(i.id) || null;
  const monthly = i.kind === 'saving' ? savingPerMonth(i, todayN) : monthlyOf(i, calc);
  const row = { id: i.id, kind: i.kind, type: i.type || null, incomeType: i.incomeType || null, main: !!i.main, name: i.name || (TYPES[i.type] && TYPES[i.type].label) || (isJob(i) ? (i.main ? 'Your pay' : 'Another job') : 'Untitled'), state, paused: !!i.paused, status: i.status, starts: i.starts || null, ends: i.ends || null,
    amount: i.amount != null ? i.amount : null, per: i.per || null, monthly: r2(monthly), perPeriod: r2(monthly), link: link ? { m: link.m || null, c: link.c || null, by: link.by } : null, linkLabel: link ? (link.m ? fmt.name ? (fmt.name(link.m) || link.m) : link.m : link.c) : null, splitWith: i.splitWith || null, tol: tolOf(i) };
  if (isJob(i)) { const j = calc && calc.jobs && calc.jobs[i.id]; row.payslip = j && j.payslip ? j.payslip.takeHome : (i.net || null); row.codeText = j ? j.codeText : null; row.codeLabel = j ? j.codeLabel : null; row.nextPay = j && j.next ? { date: j.next.date, takeHome: j.next.takeHome, final: !!j.final, bonus: !!j.next.bonus } : null; }
  if (i.kind === 'debt') { row.balance = i.balance != null ? i.balance : null; row.apr = i.apr != null ? i.apr : null; row.minimum = i.minimum != null ? i.minimum : null; }
  if (i.kind === 'saving') { row.target = i.target != null ? i.target : null; row.saved = i.saved != null ? i.saved : null; row.by = i.by || null; }
  // Dates.
  const rule = i.when || (link && link.m ? merchantRule(bank, link.m, i.kind === 'income' ? 'pay' : 'bill', ctx) : null);
  row.rule = rule; row.ruleWords = rule ? describeRule(rule) : null; row.ruleAuto = !i.when && !!rule;
  if (rule && state !== 'off') {
    const from = Math.max(todayN, i.starts ? dn(i.starts) - 1 : todayN);
    row.next = nextDates(rule, from, 3, { country: ctx.calendar || 'none' }).map(d => ({ date: d.date, moved: d.moved, why: d.why }));
  }
  // This period's actual.
  if (link && state === 'active') {
    if (link.c) {
      let spent = 0;
      for (const t of ctx.input.tx) if (t.kind === 'spend' && t.c === link.c && t.n >= cycle.start && t.n <= todayN) spent += t.s;
      row.actual = r2(spent);
    } else {
      const charges = (i.kind === 'income' ? bank.payers.get(link.m) : bank.byM.get(link.m)) || [];
      let paid = 0;
      for (const t of charges) if (t.n >= cycle.start && t.n <= todayN) paid += i.kind === 'income' ? t.inc : t.s;
      row.actual = r2(paid);
      if (rule && charges.length) {   // no history at all: not matched, rather than "missing"
        const back = i.starts ? Math.max(dn(i.starts), todayN - 45) : todayN - 45;
        row.dates = checkDates(i, rule, charges, ctx, back, todayN + 31);
        const cur = row.dates.filter(d => d.n >= cycle.start && d.n < cycle.next);
        const expect = cur.filter(d => d.n <= todayN);
        row.statusKey = row.dates.some(d => d.state === 'late') ? 'late' : expect.some(d => d.state === 'due') ? 'due' : cur.some(d => d.state === 'paid') ? 'paid' : 'coming';
      }
    }
  }
  if (!row.statusKey && state === 'active' && i.kind !== 'saving' && !link) row.statusKey = 'unmatched';
  if (!row.statusKey && link && link.c) row.statusKey = (row.actual || 0) > row.perPeriod * 1.02 && row.perPeriod > 0 ? 'over' : 'ok';
  return row;
}
const bankChoices = (bank) => ({
  payments: bank.recs.map(r => ({ m: r.m, amount: r2(r.typical), cat: r.cat })).slice(0, 80),
  payers: [...bank.payers.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 30).map(([m, l]) => ({ m, amount: r2(med(l.slice(-6).map(t => t.inc))) })),
  categories: [...bank.cats].filter(c => c !== 'Income' && c !== 'Internal transfers').sort(),
});

/* ---------- the pay cycle and safe to spend ---------- */
function planForBrief(plan, input, bank, links, ctx) {
  const { todayN } = ctx;
  const job = mainJob(plan);
  const paydays = [];
  if (job && inPlay(job)) {
    const rule = job.when || (links.get(job.id) && links.get(job.id).m ? merchantRule(bank, links.get(job.id).m, 'pay', ctx) : null);
    if (rule) {
      const from = Math.max(job.starts ? dn(job.starts) : -Infinity, todayN - 400);
      const to = job.ends ? Math.min(dn(job.ends), todayN + 120) : todayN + 120;
      for (const d of realDates(rule, from, to, { country: ctx.calendar || 'none' })) paydays.push(d.n);
    }
  }
  // Bills the bank's regular-payment detection does not know (a new or a future one): safe to spend keeps money back for them.
  const recM = new Set(bank.recs.map(r => r.m));
  const bills = [];
  for (const i of plan.items) {
    if (i.kind !== 'bill' && i.kind !== 'debt') continue;
    if (!inPlay(i) || !i.when) continue;
    const l = links.get(i.id);
    if (l && l.m && recM.has(l.m)) continue;
    const amount = i.kind === 'debt' ? num(i.minimum) : num(i.amount);
    if (!(amount > 0)) continue;
    for (const d of realDates(i.when, todayN, todayN + 62, { country: ctx.calendar || 'none' })) {
      if (i.starts && d.n < dn(i.starts)) continue;
      if (i.ends && d.n > dn(i.ends)) continue;
      bills.push({ m: i.name || (TYPES[i.type] && TYPES[i.type].label) || 'Bill', c: i.cat || (TYPES[i.type] && TYPES[i.type].cats[0]) || 'Bills & utilities', n: d.n, amount: r2(amount), freq: 'Planned' });
    }
  }
  // The tax bill (the Tax tab): safe to spend keeps it back once it is close.
  if (plan.taxAside && plan.taxAside.mode !== 'off') for (const b of (plan.taxLink && plan.taxLink.bills) || []) {
    const n = dn(b.date);
    if (n >= todayN && n <= todayN + 62) bills.push({ m: b.label, c: 'Tax', n, amount: r2(b.amount), freq: 'Planned' });
  }
  return { paydays, bills };
}
/** For the page and Home: the same list planView works from. */
export function briefPlan(plan0, analysis, o = {}) {
  const plan = cleanPlan(plan0);
  if (!countryOf(plan.country)) return null;
  const todayN = dn(o.today);
  const input = MBM.fromAnalysis(analysis && typeof analysis === 'object' ? { ...analysis, today: o.today } : { today: o.today, transactions: [] }, {});
  const bank = bankIndex(input);
  const country = countryOf(plan.country);
  const ctx = { today: o.today, todayN, calendar: country.calendar, fmt: MBM.makeFmt(o.currency, o.locale), input, bank };
  ctx.guesses = {};
  const calc = country.calc(plan, ctx);
  return planForBrief(plan, input, bank, linkAll(plan, input, bank, calc), ctx);
}
function paydayView(plan, ctx) {
  const job = mainJob(plan);
  if (!job) return { rule: null, words: null, next: [] };
  const rule = job.when || null;
  return { rule, words: rule ? describeRule(rule) : null, next: rule ? nextDates(rule, ctx.todayN, 4, { country: ctx.calendar || 'none' }).map(d => ({ date: d.date, moved: d.moved, why: d.why })) : [] };
}

/* ---------- the monthly check ---------- */
function allFlags(plan, ctx, calc, rows, bank, budget, links) {
  const { todayN, fmt, B, cycle, today } = ctx;
  const out = [];
  const add = (f) => { if (!plan.dismissed[f.id]) out.push(f); };
  const M = fmt.money, MM = (v) => fmt.money2(v);
  const dayN = (n) => fmt.short(n);
  const lastSeen = new Set();
  for (const i of plan.items) {
    const r = rows.get(i.id);
    if (!r || r.state !== 'active') continue;
    const l = links.get(i.id);
    if (l && l.m) lastSeen.add(l.m);
    const name = r.name;
    if (i.kind === 'income' && isJob(i) && r.dates) {
      const seen = r.dates.filter(d => d.n <= todayN);
      const j = calc && calc.jobs && calc.jobs[i.id];
      for (const d of seen.filter((x, k) => x.state === 'late' || k === seen.length - 1)) {
        if (d.state === 'late') add({ id: `pay-late:${i.id}:${d.date}`, kind: 'pay-late', score: 100, tone: 'bad', item: i.id, title: `Your pay hasn't arrived yet`, text: `It's normally in by ${dayN(d.n)}${i.name ? ` from ${i.name}` : ''}. Banks can be a day or two slow, so it may just be late.`, why: [] });
        if (d.state === 'paid' && j) {
          const want = (j.expected && j.expected[d.date]) || (j.payslip && j.payslip.takeHome) || 0;
          if (!want) continue;
          const diff = r2(d.paid.amount - want);
          if (diff < -Math.max(5, want * 0.01)) add({ id: `pay-short:${i.id}:${d.date}`, kind: 'pay-short', score: 98, tone: 'bad', item: i.id, amount: -diff, title: `Your pay was ${M(-diff)} less than expected on ${dayN(d.paid.n)}`, text: `We expected about ${M(want)}, and ${M(d.paid.amount)} arrived.`, why: calc.kind === 'estimate' ? ['Your tax code may have changed.', 'You may have worked fewer hours, or had unpaid leave.', 'Student loan or pension may have been taken differently.'] : ['You may have worked fewer hours, or had unpaid leave.'] });
          else if (diff > Math.max(25, want * 0.03)) add({ id: `pay-more:${i.id}:${d.date}`, kind: 'pay-more', score: 28, tone: 'info', item: i.id, amount: diff, title: `Your pay was ${M(diff)} more than expected on ${dayN(d.paid.n)}`, text: `We expected about ${M(want)}. If this is a rise, change your answers so the plan keeps up.`, why: [] });
        }
      }
      continue;
    }
    if ((i.kind === 'bill' || i.kind === 'debt' || i.kind === 'fund') && r.dates) {
      for (const d of r.dates) {
        if (d.state !== 'late') continue;
        const over = todayN - d.n;
        const housing = i.type === 'rent' || i.type === 'mortgage';
        add({ id: `missing:${i.id}:${d.date}`, kind: 'missing', score: housing ? 95 : 85, tone: 'warn', item: i.id, title: over > 10 ? `${name} looks missed: nothing went out around ${dayN(d.n)}` : `${name} hasn't gone out yet, it's normally by ${ordDay(d.n, fmt)}`, text: `We expected about ${M(r.perPeriod)}. If you paid another way, or it moved, tell us.`, why: [] });
      }
    }
    if (l && l.m && i.kind !== 'income') {
      const charges = (bank.byM.get(l.m) || []);
      if (charges.length >= 2) {
        const last = charges[charges.length - 1];
        if (last.n >= todayN - 35) {
          const prev = charges[charges.length - 2];
          if (prev.n >= last.n - 5 && Math.abs(prev.s - last.s) <= Math.max(1, last.s * 0.01)) add({ id: `twice:${i.id}:${last.d}`, kind: 'twice', score: 80, tone: 'warn', item: i.id, amount: last.s, title: `${name} may have been paid twice`, text: `${MM(last.s)} went out on ${dayN(prev.n)} and again on ${dayN(last.n)}.`, why: [] });
          else if (charges.length >= 3) {
            const usual = med(charges.slice(-7, -1).map(t => t.s));
            const up = r2(last.s - usual);
            if (up >= Math.max(3, usual * 0.1)) {
              const steady = charges.length >= 4 && (() => { const h = charges.slice(-5, -1).map(t => t.s); return Math.max(...h) - Math.min(...h) <= Math.max(1, usual * 0.02); })();
              add({ id: `high:${i.id}:${last.d}`, kind: steady ? 'price' : 'high', score: steady ? 72 : 70, tone: 'warn', item: i.id, amount: up, title: steady ? `${name} went up by ${MM(up)}` : `${name} is ${M(up)} higher than usual`, text: `${MM(last.s)} on ${dayN(last.n)}. It's usually about ${MM(usual)}.`, why: [] });
            }
          }
        }
      }
    }
  }
  // Things the plan does not know about.
  for (const r of bank.recs) {
    if (lastSeen.has(r.m) || MBM.NOT_BILLS.includes(r.cat)) continue;
    if (r.first >= todayN - 70 && r.count <= 3 && r.first > ctx.input.minN + 14) add({ id: `new:${r.m}`, kind: 'new', score: 50, tone: 'info', m: r.m, amount: r.typical, title: `A new regular payment: ${disp(fmt, r.m)}`, text: `${MM(r.typical)} ${String(r.freq).toLowerCase()}. Add it to your plan, or check you still want it.`, why: [] });
    const ch = r.charges || [];
    if (ch.length >= 3 && r.last >= todayN - 35) {
      const was = med(ch.slice(0, -1).map(x => x.s)), nowV = ch[ch.length - 1].s;
      if (nowV - was >= 0.5 && (nowV - was) / was > 0.05) add({ id: `price:${r.m}:${diso(r.last)}`, kind: 'price', score: 60, tone: 'info', m: r.m, amount: r2(nowV - was), title: `${disp(fmt, r.m)} went up by ${MM(nowV - was)}`, text: `From ${MM(was)} to ${MM(nowV)} on ${dayN(r.last)}.`, why: [] });
    }
  }
  // An unusually big one this period.
  const recM = new Set(bank.recs.map(r => r.m));
  const byCat = new Map();
  for (const t of ctx.input.tx) if (t.kind === 'spend' && t.s > 0 && t.n < cycle.start) { let a = byCat.get(t.c); if (!a) { a = []; byCat.set(t.c, a); } if (a.length < 300) a.push(t.s); }
  let big = null;
  for (const t of ctx.input.tx) {
    if (t.kind !== 'spend' || t.n < cycle.start || t.n > todayN || t.s <= 0 || recM.has(t.m) || lastSeen.has(t.m)) continue;
    const typical = med(byCat.get(t.c) || []);
    if (t.s >= Math.max(150, 4 * typical) && (!big || t.s > big.s)) big = t;
  }
  if (big) add({ id: `big:${big.k}`, kind: 'big', score: 55, tone: 'info', m: big.m, amount: big.s, title: `A big payment: ${disp(fmt, big.m)}, ${M(big.s)}`, text: `On ${dayN(big.n)}. Much more than you usually spend on ${String(big.c).toLowerCase()}.`, why: [] });
  // Tax still to pay.
  if (calc && calc.hasUntaxed && calc.stillToPay > 0.5) add({ id: `tax-owed:${calc.yearId}`, kind: 'tax-owed', score: 62, tone: 'warn', amount: calc.stillToPay, title: `You'll still owe about ${M(calc.stillToPay)} ${calc.position && calc.position.difference.loan > 0.5 ? 'in tax and student loan' : 'in tax'} for this year`, text: 'Nothing is taken from some of your income before it reaches you. You usually pay this through a tax return, so it helps to keep it aside.', why: [] });
  // The money to keep for the tax bill (the Tax tab), against what you have.
  const pot = plan.taxLink && plan.taxAside && plan.taxAside.mode !== 'off' ? num(plan.taxLink.pot) : 0;
  if (pot > 0.5 && Array.isArray(ctx.input.balances) && ctx.input.balances.length) {
    const have = ctx.input.balances.filter(b => b && Number.isFinite(+b.balance) && !/credit|loan|mortgage/i.test(String(b.kind || ''))).reduce((t, b) => t + +b.balance, 0) + (plan.assets || []).reduce((t, a) => t + num(a.amount), 0);
    if (have < pot) add({ id: `tax-pot:${today.slice(0, 7)}`, kind: 'tax-pot', score: 64, tone: 'warn', amount: pot, title: `Your money is below what to keep for tax`, text: `You have ${M(have)}, and about ${M(pot)} is owed for tax. Try to build it back up before the bill is due.`, why: [] });
  }
  if (calc && calc.overTaken > 25) add({ id: `tax-over:${calc.yearId}`, kind: 'tax-over', score: 45, tone: 'info', amount: calc.overTaken, title: `You may pay about ${M(calc.overTaken)} too much tax this year`, text: 'Your tax codes take more than your whole-year bill. HMRC usually refunds it, or you can ask them to change your code.', why: [] });
  for (const w of (calc && calc.warnings) || []) if (w.level === 'warn') add({ id: `code:${w.text.slice(0, 40)}`, kind: 'code', score: 66, tone: 'warn', title: 'Worth checking your tax code', text: w.text, why: [] });
  // On course.
  const usualRest = B.projected;
  const planned = budget.groups.filter(g => g.id === 'bills' || g.id === 'everyday' || g.id === 'debts').reduce((t, g) => t + g.total, 0);
  if (planned > 0 && cycle.day >= 5 && ctx.input.tx.length) {
    const elapsed = (cycle.day + 1) / Math.max(1, cycle.len);
    const proj = usualRest != null ? usualRest : B.spent / Math.max(0.05, elapsed);
    const lenRatio = cycle.mode === 'cycle' ? Math.max(0.2, cycle.len / 30.44) : 1;
    const gap = r2(proj - planned * lenRatio);
    const word = cycle.mode === 'cycle' ? 'before payday' : 'this month';
    if (Math.abs(gap) >= 25) add({ id: `course:${today.slice(0, 7)}:${gap > 0 ? 'over' : 'under'}`, kind: 'course', score: gap > 0 ? 75 : 25, tone: gap > 0 ? 'warn' : 'good', amount: Math.abs(gap), title: gap > 0 ? `You're on course to spend ${M(gap)} more than planned ${word}` : `You're on course to spend ${M(-gap)} less than planned ${word}`, text: `About ${M(proj)} against a plan of ${M(planned * lenRatio)}. That counts everything you spend, planned or not.`, why: [] });
  }
  // The biggest things first; a few price rises at most, so the list stays calm.
  const seen = new Set(); let prices = 0;
  return out.sort((a, b) => b.score - a.score).filter(f => !seen.has(f.id) && seen.add(f.id)).filter(f => !(f.kind === 'price' && f.m && ++prices > 2)).slice(0, 10);
}
const disp = (fmt, m) => { try { return (fmt.name && fmt.name(m)) || m; } catch { return m; } };
const ordDay = (n, fmt) => { const d = new Date(n * 864e5).getUTCDate(); return `the ${d}${d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th'}`; };

/* ---------- the extras ---------- */
function monthCalendar(plan, ctx, calc, rows, budget) {
  const { todayN, input } = ctx;
  const mi = MBM.util.mIdx(todayN), s = MBM.util.mStart(mi), e = MBM.util.mStart(mi + 1) - 1;
  const list = [];
  for (const i of plan.items) {
    const r = rows.get(i.id);
    if (!r || !r.rule || !(inPlay(i)) || i.kind === 'everyday' || i.kind === 'saving') continue;
    for (const d of realDates(r.rule, s, e, { country: ctx.calendar || 'none' })) {
      if (i.starts && d.n < dn(i.starts)) continue;
      if (i.ends && d.n > dn(i.ends)) continue;
      const seen = (r.dates || []).find(x => x.n === d.n);
      let amt = i.kind === 'income' ? (isJob(i) ? ((calc && calc.jobs && calc.jobs[i.id] && (calc.jobs[i.id].expected[d.date] || (calc.jobs[i.id].payslip && calc.jobs[i.id].payslip.takeHome))) || 0) : num(i.amount)) : i.kind === 'debt' ? num(i.minimum) : num(i.amount);
      if (seen && seen.paid) amt = seen.paid.amount;
      list.push({ id: i.id, date: d.date, n: d.n, name: r.name, kind: i.kind, amount: r2(amt), moved: d.moved, why: d.why, state: seen ? seen.state : d.n > todayN ? 'coming' : 'unknown' });
    }
  }
  list.sort((a, b) => a.n - b.n || (a.kind === 'income' ? -1 : 1));
  const income = list.filter(x => x.kind === 'income').reduce((t, x) => t + x.amount, 0);
  const bills = list.filter(x => x.kind !== 'income').reduce((t, x) => t + x.amount, 0);
  const paid = list.filter(x => x.kind !== 'income' && x.state === 'paid').reduce((t, x) => t + x.amount, 0);
  return { month: diso(s), rows: list, income: r2(income), bills: r2(bills), paid: r2(paid), still: r2(bills - paid), leftAfter: r2(income - bills), balance: null, input: input.tx.length > 0 };
}
/** Pay every debt's minimum and put `extra` on one debt at a time. */
export function simulateDebts(debts, extra, order) {
  let list = debts.filter(d => d.balance > 0).map(d => ({ ...d }));
  if (!list.length) return { months: 0, interest: 0, stuck: false };
  list.sort(order === 'snowball' ? (a, b) => a.balance - b.balance : (a, b) => b.apr - a.apr || a.balance - b.balance);
  let months = 0, interest = 0;
  const budget = list.reduce((t, d) => t + d.minimum, 0) + extra;
  while (list.length && months < 600) {
    months++;
    let left = budget;
    for (const d of list) { const i = d.balance * d.apr / 1200; interest += i; d.balance += i; }
    for (const d of list) { const pay = Math.min(d.balance, d.minimum); d.balance -= pay; left -= pay; }
    for (const d of list) { if (left <= 0) break; const pay = Math.min(d.balance, left); d.balance -= pay; left -= pay; }
    list = list.filter(d => d.balance > 0.005);
  }
  return { months: list.length ? null : months, interest: r2(interest), stuck: list.length > 0 };
}
function debtsView(plan, fmt, todayN) {
  const debts = plan.items.filter(i => i.kind === 'debt' && inPlay(i)).map(i => ({ id: i.id, name: i.name || 'Debt', balance: num(i.balance), apr: num(i.apr), minimum: num(i.minimum) }));
  if (!debts.length) return null;
  const total = r2(debts.reduce((t, d) => t + d.balance, 0));
  const monthlyInterest = r2(debts.reduce((t, d) => t + d.balance * d.apr / 1200, 0));
  const rows = debts.map(d => {
    const s = simulateDebts([d], 0, 'avalanche');
    return { ...d, monthlyInterest: r2(d.balance * d.apr / 1200), months: s.months, payoff: s.months != null ? addMonthsIso(todayN, s.months) : null, stuck: s.stuck };
  });
  const base = simulateDebts(debts, num(plan.debtExtra), 'avalanche');
  const extras = [10, 25, 50, 100, 200, 300, 500].map(x => {
    const a = simulateDebts(debts, x, 'avalanche'), b = simulateDebts(debts, x, 'snowball');
    return { extra: x, avalanche: { months: a.months, interest: a.interest, date: a.months != null ? addMonthsIso(todayN, a.months) : null }, snowball: { months: b.months, interest: b.interest, date: b.months != null ? addMonthsIso(todayN, b.months) : null }, sooner: base.months != null && a.months != null ? base.months - a.months : null };
  });
  return { total, monthlyInterest, extraNow: num(plan.debtExtra), rows, base: { months: base.months, interest: base.interest, date: base.months != null ? addMonthsIso(todayN, base.months) : null, stuck: base.stuck }, extras };
}
const addMonthsIso = (n, k) => { const d = new Date(n * 864e5); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, 1)).toISOString().slice(0, 7); };
function goalsView(plan, todayN) {
  return plan.items.filter(i => i.kind === 'saving' && inPlay(i)).map(i => {
    const need = Math.max(0, num(i.target) - num(i.saved));
    const months = i.by ? Math.max(1, (dn(i.by) - todayN) / 30.44) : null;
    return { id: i.id, name: i.name || 'Goal', target: num(i.target), saved: num(i.saved), by: i.by || null, need: r2(need), perMonth: months ? r2(need / months) : null, frac: i.target ? Math.min(1, num(i.saved) / num(i.target)) : 0 };
  });
}
function fundsView(plan, ctx) {
  const { todayN } = ctx;
  return plan.items.filter(i => i.kind === 'fund' && inPlay(i)).map(i => {
    const perMonth = r2(monthlyOf(i, null));
    const next = i.when ? nextDates(i.when, todayN - 1, 1, { country: ctx.calendar || 'none' })[0] : null;
    const months = next ? Math.max(0, (next.n - todayN) / 30.44) : null;
    return { id: i.id, name: i.name || 'Yearly bill', amount: num(i.amount), perMonth, nextDate: next ? next.date : null, shouldHave: months != null ? r2(Math.max(0, num(i.amount) - perMonth * months)) : null };
  });
}
function netWorthView(plan, input) {
  const balances = Array.isArray(input.balances) ? input.balances.filter(b => b && Number.isFinite(+b.balance)) : [];
  const accounts = balances.filter(b => !/credit|loan|mortgage/i.test(String(b.kind || ''))).reduce((t, b) => t + +b.balance, 0);
  const owedBanks = balances.filter(b => /credit|loan|mortgage/i.test(String(b.kind || ''))).reduce((t, b) => t + Math.abs(+b.balance), 0);
  const assets = (plan.assets || []).map(a => ({ id: a.id, name: a.name || 'Something', amount: num(a.amount) }));
  const debts = plan.items.filter(i => i.kind === 'debt' && inPlay(i)).reduce((t, i) => t + num(i.balance), 0);
  const owed = Math.max(debts, owedBanks);   // a connected card and the same card typed in the plan are one debt
  const assetsTotal = assets.reduce((t, a) => t + a.amount, 0);
  const series = MBM.balanceSeries(input.history, []).slice(-180).map(p => p.v);
  return { accounts: r2(accounts), assets, assetsTotal: r2(assetsTotal), owed: r2(owed), total: r2(accounts + assetsTotal - owed), series };
}
function annualView(plan, input, budget, todayN) {
  const mi = MBM.util.mIdx(todayN);
  const months = [];
  for (let k = 11; k >= 0; k--) {
    const m = mi - k, s = MBM.util.mStart(m), e = MBM.util.mStart(m + 1) - 1;
    if (e < input.minN) continue;
    let income = 0, spent = 0;
    for (const t of input.tx) { if (t.n < s || t.n > e) continue; if (t.kind === 'income') income += t.inc; else if (t.kind === 'spend') spent += t.s; }
    months.push({ month: diso(s), income: r2(income), spent: r2(spent), part: k === 0 });
  }
  const whole = months.filter(m => !m.part);
  const planOut = budget.groups.filter(g => g.id !== 'savings').reduce((t, g) => t + g.total, 0);
  return { months, plannedIn: budget.income, plannedOut: r2(planOut), yearIn: r2(whole.reduce((t, m) => t + m.income, 0)), yearOut: r2(whole.reduce((t, m) => t + m.spent, 0)), full: whole.length };
}

/* ---------- the read-only summary (the assistant, Home) ---------- */
export function planSummary(view) {
  if (!view || !view.has) return { hasPlan: false };
  const c = view.calc;
  return {
    hasPlan: true, country: view.countryName, done: view.done, currency: view.currency,
    takeHomeMonthly: c ? c.perMonth.takeHome : null, takeHomeMonthlyMeans: 'a normal month from now on (each job - next ordinary payslip), not the year spread over 12', nextPayslips: c && c.jobs ? Object.values(c.jobs).filter(j => j.next).map(j => ({ job: j.name, date: j.next.date, takeHome: j.next.takeHome, final: j.final || undefined })) : [], income: view.budget.income, left: view.budget.left, keepAsideMonthly: view.budget.aside,
    groups: view.budget.groups.map(g => ({ id: g.id, label: g.label, plannedMonthly: g.total })),
    stillToPay: c ? c.stillToPay : 0, payCycle: view.cycle, nextPaydays: view.paydays.next.map(d => d.date),
    flags: view.flags.map(f => ({ kind: f.kind, title: f.title, text: f.text })),
    comingUp: view.comingUp.map(x => ({ name: x.name, from: x.from, amount: x.amount, leftAfter: x.leftAfter })),
    debts: view.debts ? { total: view.debts.total, monthlyInterest: view.debts.monthlyInterest, debtFree: view.debts.base.date } : null,
    netWorth: view.netWorth.total, estimate: c && c.kind === 'estimate',
  };
}
/** The brief's money line: the one thing most worth a look, and in the first days of a month a short check-in before it. */
export function planFlagLine(view) {
  if (!view || !view.has) return null;
  const top = view.flags.length ? view.flags[0].title : null;
  const day = Number(String(view.today || '').slice(8, 10));
  if (!(day >= 1 && day <= 3) || !(view.budget.income > 0)) return top;
  const M = MBM.makeFmt(view.currency).money;
  const check = `This month: ${M(view.budget.left)} left after your plan${view.taxPot > 0.5 ? `, with ${M(view.taxPot)} to keep for tax` : ''}.`;
  return top ? `${check} ${top}` : check;
}
export { itemState as planItemState };
