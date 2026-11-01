// lib/finance/tax-change.mjs - one change to the Tax tab's sources, claims and memory, or to the plan's items, with the same
// checks whichever way it came in: the assistant (mcp tax_change, or a proposal the person approved) and the confirmation
// screens (pasted text, a payslip). Pure: works on copies, saves nothing. The route keeps the before for Undo.
//
//   applyTaxChange(plan, doc, change, {today, year}) -> {plan, doc, said, year, ...} | {error, status}
//   TAX_CHANGE_ACTIONS   what can be asked for
//
// Never takes a UTR, an NI number or a password: those are refused here, so they cannot land in the document or the memory.

import { cleanTax, planForYear } from './tax-tab.mjs';
import { cleanPlan } from './money-plan.mjs';
import { taxYearOf, yearData } from './uk-tax.mjs';
import { isJob, mainJob } from './countries.mjs';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const num = (x) => { if (x === null || x === undefined || x === '') return null; const n = Number(x); return Number.isFinite(n) ? n : null; };
const moneyOf = (v) => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 1e8 ? Math.round(n * 100) / 100 : null; };
const dateOf = (v) => (typeof v === 'string' && ISO.test(v) ? v : null);
const text = (v, n = 80) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n) : '');
const newId = (p) => `${p}-${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;
const clone = (o) => JSON.parse(JSON.stringify(o));
const gbp0 = (x) => '£' + Math.round(num(x) || 0).toLocaleString('en-GB');
const IDENT = /\b[A-Za-z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Da-d]\b|(?<!\d)\d{5}\s?\d{5}(?!\d)|\b(password|passcode)\b/i;

export const TAX_CHANGE_ACTIONS = Object.freeze({
  'source.add': 'Add an income source this tax year: {source: {type: job|self|side|rental|dividend|interest|other, name, annual?, taxCode?, every?: monthly|fourweekly|fortnightly|weekly, payday? (day of the month a monthly job pays, 1 to 31), start?, end?, amount?, per?, connected?, main?}}',
  'source.update': 'Change a source: {id, fields: {name, annual, taxCode, every, payday (day of the month a monthly job pays, 1 to 31; null goes back to not known), start, end (the job has ended), amount, per, connected, ytd: {asOf, pay, taxablePay, tax, ni, plan, pg} (pay so far this tax year, from the latest payslip), prevPay, prevTax (pay before this job this tax year, from a P45; needs a start date for the job), payments: [{date, amount}] (exact pay before tax still to come, after the pay-so-far date: last payments, or pay that differs each time; replaces the yearly pay; [] clears it), bonus, bonusOn (date)}}',
  'source.remove': 'Remove a source: {id}',
  'payment.add': 'A payment from a client: {payment: {item?, date, amount, client?, note?}}',
  'payment.remove': 'Remove one: {id}',
  'claim.add': 'A work cost to claim: {claim: {item?, tx?, date?, what, amount, pct?, cat?, rule?}}',
  'claim.update': 'Change a claim: {id, fields: {what, amount, pct, cat, date}}',
  'claim.remove': 'Remove one: {id}',
  'simplified.set': 'Flat rates: {miles?: {car, motorcycle}, wfh?: [{hours, months}]}',
  'extras.set': 'Other figures for the year: {fields: {giftAid, pensionPaid, childBenefit, cbChildren, isaUsed, lisaUsed, tradeChoice, hasEmi}}',
  'gain.add': 'A disposal: {gain: {what, date, proceeds, cost, isa?}}',
  'gain.remove': 'Remove one: {id}',
  'item.add': 'A plan item: {item: {kind: bill|everyday|saving|debt|fund, name, amount, per, balance?, apr?, minimum?, target?, saved?, by?, starts?, ends?}}',
  'item.update': 'Change a plan item: {id, fields}',
  'item.remove': 'Remove one: {id}',
  'memory.add': 'Something to remember about their money: {text, source?, open?}',
  'memory.update': 'Change it: {id, text?, open?}',
  'memory.remove': 'Forget it: {id}',
  'answers.set': 'Answers behind the tax figures, when the user says one is wrong: {fields: {blind: true|false, marriage: none|give|get, bik (a year), noTradingAllowance, region: ruk|scotland, loans: [plan1|plan2|plan4|plan5|pg], allowanceOverride (the tax-free amount HMRC gave them, from a coding notice, for the tax year in question; null goes back to worked out), allowanceNote, pension: {type: sacrifice|netpay|ras|none, pct, amount, employerPct, employerAmount, base: full|qualifying (percentages of all pay, or of qualifying earnings), starts (date)}, job (a job id for the pension; default the main job)}}',
  'pref.set': 'A preference: {fields: {basis, registered, gatewayBroken, hmrcAsked, paper, partner, foreign}}',
  'filed.record': 'After filing: {fields: {at, total, paid, paidAt, poaFirst, poaSecond, poaFirstPaid, poaSecondPaid, note}}',
  'year.confirm': 'This year\'s sources are right',
  dismiss: 'Not for work, stop asking: {tx}',
});

function sourceFields(f) {
  const o = {};
  if (f.name !== undefined) o.name = text(f.name, 60);
  if (f.annual !== undefined) { const v = moneyOf(f.annual); if (v == null && f.annual !== null && f.annual !== '') return { error: 'That pay does not look like an amount.' }; o.annual = v == null ? undefined : v; if (v != null) { o.basis = undefined; o.payslipGross = undefined; } }
  if (f.taxCode !== undefined) o.taxCode = text(f.taxCode, 12).toUpperCase();
  if (f.start !== undefined) o.starts = dateOf(f.start) || undefined;
  if (f.end !== undefined) o.ends = dateOf(f.end) || undefined;
  if (f.amount !== undefined) { const v = moneyOf(f.amount); if (v == null && f.amount !== null && f.amount !== '') return { error: 'That amount does not look right.' }; o.amount = v == null ? undefined : v; }
  if (f.per !== undefined) o.per = ['year', 'month', 'week', 'fortnight', '4weeks', 'quarter', 'total'].includes(f.per) ? f.per : 'year';
  if (f.connected !== undefined) o.connected = f.connected === true ? true : undefined;
  if (f.expenses !== undefined) o.expenses = moneyOf(f.expenses) || undefined;
  if (f.ytd !== undefined) o.ytd = f.ytd && dateOf(f.ytd.asOf) ? { asOf: f.ytd.asOf, pay: moneyOf(f.ytd.pay), taxablePay: moneyOf(f.ytd.taxablePay), tax: moneyOf(f.ytd.tax), ni: moneyOf(f.ytd.ni), plan: moneyOf(f.ytd.plan), pg: moneyOf(f.ytd.pg) } : undefined;
  if (f.payments !== undefined) {
    if (f.payments !== null && !Array.isArray(f.payments)) return { error: 'The payments to come need to be a list of dates and amounts.' };
    const rows = (f.payments || []).filter(p => p && typeof p === 'object' && (p.date || p.amount));
    const clean = rows.slice(0, 60).map(p => ({ date: dateOf(p.date), amount: moneyOf(p.amount) }));
    if (clean.some(p => !p.date || !p.amount)) return { error: 'Each payment needs a date and an amount.' };
    o.payments = clean.length ? clean.sort((a, b) => a.date.localeCompare(b.date)) : undefined;
  }
  if (f.bonus !== undefined) o.bonus = moneyOf(f.bonus) || undefined;
  if (f.bonusOn !== undefined) o.bonusOn = dateOf(f.bonusOn) || undefined;
  if (f.prevPay !== undefined) o.prevPay = moneyOf(f.prevPay) || undefined;
  if (f.prevTax !== undefined) o.prevTax = moneyOf(f.prevTax) || undefined;
  if (f.main !== undefined) o.main = f.main === true ? true : undefined;
  return o;
}
/** How often a job pays: National Insurance and student loan look at each payday, so this changes the answer. */
function payEvery(it, every, today) {
  const days = { weekly: 7, fortnightly: 14, fourweekly: 28 }[every];
  if (days) { if (!(it.when && it.when.t === 'every' && it.when.days === days)) it.when = { t: 'every', days, anchor: it.starts || today, adjust: 'prev' }; }
  else if (every === 'monthly' && it.when && it.when.t === 'every') delete it.when;
}
/** The day of the month a monthly job pays. Empty clears a plain day; a job paid every so many weeks keeps its own rule. */
function payDay(it, day) {
  if (day === undefined) return null;
  if (day === null || day === '') { if (it.when && it.when.t === 'day') delete it.when; return null; }
  const d = Number(day);
  if (!Number.isInteger(d) || d < 1 || d > 31) return 'A payday is a day of the month, 1 to 31.';
  if (it.when && it.when.t === 'every') return 'That job is paid every so many weeks. Change how often it is paid first.';
  it.when = { t: 'day', day: d, adjust: it.when && it.when.t === 'day' && it.when.adjust ? it.when.adjust : 'prev' };
  return null;
}
const apply = (obj, fields) => { for (const [k, v] of Object.entries(fields)) { if (v === undefined || v === null || v === '') delete obj[k]; else obj[k] = v; } };

/** The list of sources to change: the plan's this year, the year's own copy for any other. */
function itemsFor(plan, doc, year, today) {
  const cur = taxYearOf(today).id;
  const rec = doc.years[year] = doc.years[year] || {};
  if (year === cur && !rec.items) return plan.items = plan.items || [];
  if (!rec.items) rec.items = (planForYear(plan, doc, year, today).planLike.items || []).map(i => ({ ...i }));
  return rec.items;
}
const nameOf = (i) => i.name || 'that';

export function applyTaxChange(plan0, doc0, change, o = {}) {
  const today = o.today, c = change && typeof change === 'object' ? change : {};
  const year = o.year || taxYearOf(today).id;
  if (IDENT.test(JSON.stringify(c))) return { error: 'A UTR, National Insurance number or password cannot be saved this way. Those go in the Your details box on the Tax tab, and a password never does.', status: 400 };
  const plan = cleanPlan(clone(plan0 || {}));
  const doc = cleanTax(clone(doc0 || {}));
  const rec = doc.years[year] = doc.years[year] || {};
  const done = (said, extra = {}) => ({ plan, doc, said, year, ...extra });
  const label = yearData(year).label;
  switch (c.action) {
    case 'source.add': {
      const s = c.source && typeof c.source === 'object' ? c.source : {};
      const type = ['job', 'self', 'side', 'rental', 'dividend', 'interest', 'other'].includes(s.type) ? s.type : null;
      if (!type) return { error: 'Which kind of income is it?' };
      const list = itemsFor(plan, doc, year, today);
      const f = sourceFields(s);
      if (f.error) return { error: f.error };
      const item = { id: newId(type), kind: 'income', incomeType: type, status: 'now' };
      apply(item, f);
      if (type === 'job') { payEvery(item, s.every, today); const bad = payDay(item, s.payday); if (bad) return { error: bad }; }
      if (type === 'job' && !list.some(i => i.incomeType === 'job')) item.main = true;
      if (type === 'job' && year === taxYearOf(today).id) plan.tax = Object.assign({}, plan.tax, { hasJob: true });   // the questions must not ask again about a job just added
      if (type === 'self' && !item.per) item.per = 'total';
      if (type !== 'job' && type !== 'self' && !item.per) item.per = 'year';
      list.push(item);
      return done(`Added ${item.name || 'that'} to ${label}`, { id: item.id });
    }
    case 'source.update': {
      const list = itemsFor(plan, doc, year, today);
      const it = list.find(i => i.id === c.id);
      if (!it) return { error: 'That source has gone. Refresh and try again.', status: 404 };
      const f = sourceFields(c.fields || {});
      if (f.error) return { error: f.error };
      apply(it, f);
      if (it.incomeType === 'job' && c.fields && c.fields.every) payEvery(it, c.fields.every, today);
      if (it.incomeType === 'job' && c.fields) { const bad = payDay(it, c.fields.payday); if (bad) return { error: bad }; }
      return done(`Changed ${nameOf(it)}`);
    }
    case 'source.remove': {
      const list = itemsFor(plan, doc, year, today);
      const i = list.findIndex(x => x.id === c.id);
      if (i < 0) return { error: 'That source has gone.', status: 404 };
      const [gone] = list.splice(i, 1);
      return done(`Removed ${nameOf(gone)}`);
    }
    case 'payment.add': {
      const p = c.payment && typeof c.payment === 'object' ? c.payment : {};
      const amount = moneyOf(p.amount), date = dateOf(p.date);
      if (!amount || !date) return { error: 'A payment needs an amount and a date.' };
      rec.payments = rec.payments || [];
      rec.payments.push({ id: newId('pay'), item: p.item || undefined, date, amount, client: text(p.client, 60) || undefined, note: text(p.note, 120) || undefined, tx: text(p.tx, 80) || undefined });
      return done(`Added a payment of ${gbp0(amount)}`);
    }
    case 'payment.remove': {
      const n = (rec.payments || []).length;
      rec.payments = (rec.payments || []).filter(p => p.id !== c.id);
      if (rec.payments.length === n) return { error: 'That payment has gone.', status: 404 };
      return done('Removed that payment');
    }
    case 'claim.add': {
      const x = c.claim && typeof c.claim === 'object' ? c.claim : {};
      const amount = moneyOf(x.amount), what = text(x.what, 80);
      if (!amount || !what) return { error: 'A claim needs what it was and an amount.' };
      rec.claims = rec.claims || [];
      if (x.tx && rec.claims.some(k => k.tx === x.tx)) return { error: 'That payment is already claimed.', status: 409 };
      const id = newId('claim');
      rec.claims.push({ id, item: x.item || undefined, tx: text(x.tx, 80) || undefined, date: dateOf(x.date) || undefined, what, amount, pct: x.pct != null && num(x.pct) != null ? Math.min(100, Math.max(0, num(x.pct))) : undefined, cat: x.cat || 'other', rule: text(x.rule, 30) || undefined, receipts: Array.isArray(x.receipts) ? x.receipts : undefined });
      return done(`Claiming ${what}`, { id });
    }
    case 'claim.update': {
      const k = (rec.claims || []).find(x => x.id === c.id);
      if (!k) return { error: 'That claim has gone.', status: 404 };
      const f = c.fields || {};
      if (f.what !== undefined) k.what = text(f.what, 80) || k.what;
      if (f.amount !== undefined) { const v = moneyOf(f.amount); if (v == null) return { error: 'That amount does not look right.' }; k.amount = v; }
      if (f.pct !== undefined) { const v = num(f.pct); if (v == null || v < 0 || v > 100) return { error: 'The work share is a percentage, 0 to 100.' }; k.pct = v; }
      if (f.cat !== undefined) k.cat = f.cat;
      if (f.date !== undefined) k.date = dateOf(f.date) || undefined;
      if (Array.isArray(f.receipts)) k.receipts = f.receipts;
      return done(`Changed the claim for ${k.what}`);
    }
    case 'claim.remove': {
      const k = (rec.claims || []).find(x => x.id === c.id);
      if (!k) return { error: 'That claim has gone.', status: 404 };
      rec.claims = rec.claims.filter(x => x.id !== c.id);
      return done(`No longer claiming ${k.what}`);
    }
    case 'simplified.set': {
      rec.simplified = rec.simplified || {};
      if (c.miles) rec.simplified.miles = { car: moneyOf(c.miles.car) || undefined, motorcycle: moneyOf(c.miles.motorcycle) || undefined };
      if (Array.isArray(c.wfh)) rec.simplified.wfh = c.wfh.slice(0, 12).map(w => ({ hours: moneyOf(w.hours) || 0, months: Math.min(12, moneyOf(w.months) || 0) }));
      return done('Updated your flat rates');
    }
    case 'extras.set': {
      rec.extras = rec.extras || {};
      apply(rec.extras, c.fields || {});
      return done('Updated those figures');
    }
    case 'gain.add': {
      const g = c.gain && typeof c.gain === 'object' ? c.gain : {};
      rec.extras = rec.extras || {};
      rec.extras.gains = rec.extras.gains || [];
      rec.extras.gains.push({ id: newId('gain'), what: text(g.what, 60) || 'A disposal', date: dateOf(g.date) || undefined, proceeds: moneyOf(g.proceeds) || 0, cost: moneyOf(g.cost) || 0, isa: g.isa === true ? true : undefined });
      return done('Added that sale');
    }
    case 'gain.remove': {
      rec.extras = rec.extras || {};
      rec.extras.gains = (rec.extras.gains || []).filter(g => g.id !== c.id);
      return done('Removed that sale');
    }
    case 'item.add': {
      const x = c.item && typeof c.item === 'object' ? c.item : {};
      if (!['bill', 'everyday', 'saving', 'debt', 'fund'].includes(x.kind)) return { error: 'Which kind of item is it: a bill, everyday spending, saving, a debt or a yearly bill?' };
      plan.items = plan.items || [];
      const id = newId(x.kind);
      plan.items.push({ ...x, id, status: x.status || 'now', name: text(x.name, 60) });
      return done(`Added ${text(x.name, 60) || 'that'} to your plan`, { id });
    }
    case 'item.update': {
      const it = (plan.items || []).find(i => i.id === c.id);
      if (!it) return { error: 'That has gone from your plan.', status: 404 };
      const f = { ...(c.fields || {}) };
      delete f.id; delete f.kind;
      apply(it, f);
      return done(`Changed ${nameOf(it)}`);
    }
    case 'item.remove': {
      const it = (plan.items || []).find(i => i.id === c.id);
      if (!it) return { error: 'That has gone from your plan.', status: 404 };
      plan.items = plan.items.filter(i => i.id !== c.id);
      return done(`Removed ${nameOf(it)} from your plan`);
    }
    case 'memory.add': {
      const t = text(c.text, 400);
      if (!t) return { error: 'What should Freeflo remember?' };
      doc.memory.push({ id: newId('mem'), text: t, date: today, source: text(c.source, 60) || 'You told Freeflo', open: c.open === true ? true : undefined });
      return done('Remembered that');
    }
    case 'memory.update': {
      const m = doc.memory.find(x => x.id === c.id);
      if (!m) return { error: 'That note has gone.', status: 404 };
      if (c.text !== undefined) m.text = text(c.text, 400) || m.text;
      if (c.open !== undefined) m.open = c.open === true ? true : undefined;
      if (c.task !== undefined) m.task = text(c.task, 80) || undefined;
      return done('Changed that note');
    }
    case 'memory.remove': {
      const n = doc.memory.length;
      doc.memory = doc.memory.filter(x => x.id !== c.id);
      if (doc.memory.length === n) return { error: 'That note has gone.', status: 404 };
      return done('Forgotten');
    }
    case 'answers.set': {
      const f = c.fields || {};
      plan.tax = plan.tax || {};
      if (typeof f.blind === 'boolean') plan.tax.blind = f.blind;
      if (['none', 'give', 'get'].includes(f.marriage)) plan.tax.marriage = f.marriage;
      if (f.bik !== undefined) plan.tax.bik = moneyOf(f.bik);
      if (typeof f.noTradingAllowance === 'boolean') plan.tax.noTradingAllowance = f.noTradingAllowance;
      if (f.region !== undefined) { if (!['ruk', 'scotland'].includes(f.region)) return { error: 'Where you live is England, Wales or Northern Ireland (ruk), or Scotland (scotland).' }; plan.tax.region = f.region; }
      if (f.loans !== undefined) plan.tax.loans = Array.isArray(f.loans) ? f.loans.filter(x => ['plan1', 'plan2', 'plan4', 'plan5', 'pg'].includes(x)) : [];
      if (f.allowanceOverride !== undefined) {
        const v = moneyOf(f.allowanceOverride);
        if (v == null && f.allowanceOverride !== null && f.allowanceOverride !== '') return { error: 'That tax-free amount does not look right. It is the amount of your income with no tax on it, such as 12570.' };
        if (v == null) { delete plan.tax.allowanceOverride; delete plan.tax.allowanceOverrideYear; delete plan.tax.allowanceNote; }
        else { plan.tax.allowanceOverride = v; plan.tax.allowanceOverrideYear = year; }
      }
      if (f.allowanceNote !== undefined && plan.tax.allowanceOverride != null) plan.tax.allowanceNote = text(f.allowanceNote, 120) || undefined;
      if (f.pension && typeof f.pension === 'object') {
        const job = f.job ? (plan.items || []).find(i => isJob(i) && i.id === f.job) : mainJob(plan);
        if (!job) return { error: 'There is no job to put that pension on. Add the job first.' };
        const p = { ...(job.pension || {}) }, pf = f.pension;
        if (pf.type !== undefined) { if (!['sacrifice', 'netpay', 'ras', 'none'].includes(pf.type)) return { error: 'The pension type is sacrifice, netpay, ras (relief at source) or none.' }; p.type = pf.type; }
        for (const k of ['pct', 'employerPct']) if (pf[k] !== undefined) { const n = num(pf[k]); if (pf[k] === null || pf[k] === '') delete p[k]; else if (n == null || n < 0 || n > 100) return { error: 'A pension percentage is between 0 and 100.' }; else p[k] = n; }
        for (const k of ['amount', 'employerAmount']) if (pf[k] !== undefined) { const n = moneyOf(pf[k]); if (n == null) delete p[k]; else p[k] = n; }
        if (pf.base !== undefined) { if (pf.base === 'qualifying') p.base = 'qualifying'; else delete p.base; }
        if (pf.starts !== undefined) { const d = dateOf(pf.starts); if (d) p.starts = d; else delete p.starts; }
        if (!p.type) p.type = 'none';
        job.pension = p;
      }
      return done('Changed your tax answers');
    }
    case 'pref.set': {
      const f = c.fields || {};
      doc.prefs = doc.prefs || {};
      for (const k of ['registered', 'gatewayBroken', 'hmrcAsked', 'paper', 'partner', 'foreign']) if (f[k] !== undefined) doc.prefs[k] = f[k] === true;
      if (f.basis) doc.prefs.basis = f.basis === 'traditional' ? 'traditional' : 'cash';
      return done('Saved');
    }
    case 'filed.record': {
      const f = c.fields || {};
      rec.filed = { ...(rec.filed || {}) };
      for (const k of ['at', 'paidAt', 'poaFirstPaid', 'poaSecondPaid']) if (f[k] !== undefined) rec.filed[k] = dateOf(f[k]) || undefined;
      for (const k of ['paid', 'poaFirst', 'poaSecond']) if (f[k] !== undefined) rec.filed[k] = moneyOf(f[k]) == null ? undefined : moneyOf(f[k]);
      if (f.total !== undefined) rec.filed.total = num(f.total) == null ? undefined : num(f.total);
      if (f.note !== undefined) rec.filed.note = text(f.note, 200) || undefined;
      rec.ticks = rec.ticks || {};
      if (rec.filed.at) rec.ticks.file = rec.filed.at;
      if (rec.filed.paidAt) rec.ticks.pay = rec.filed.paidAt;
      if (rec.filed.poaSecondPaid) rec.ticks.poa2 = rec.filed.poaSecondPaid;
      return done(`Recorded your ${label} return`);
    }
    case 'year.confirm': { rec.confirmed = today; return done(`${label}: your sources are confirmed`); }
    case 'dismiss': {
      const list = Array.isArray(c.txs) ? c.txs : [c.tx];
      rec.dismissed = rec.dismissed || {};
      for (const t of list) { const k = text(t, 80); if (k) rec.dismissed[k] = today; }
      return done(list.length > 1 ? `Hidden ${list.length} payments` : 'Hidden');
    }
    case 'payslip.add': return addPayslip(plan, doc, c, { today, year });
    default: return { error: 'That is not a change Freeflo knows.', status: 400 };
  }
}

function addPayslip(plan, doc, c, { today, year: yearArg }) {
  const s = c.slip && typeof c.slip === 'object' ? c.slip : {};
  const payDate = dateOf(s.payDate);
  if (!payDate) return { error: 'Add the pay date first.' };
  const year = taxYearOf(payDate).id || yearArg;
  const rec = doc.years[year] = doc.years[year] || {};
  const list = itemsFor(plan, doc, year, today);
  let job = list.find(i => i.id === c.job);
  if (!job && c.newJobName) { job = { id: newId('job'), kind: 'income', incomeType: 'job', status: 'now', name: text(c.newJobName, 60), per: 'year' }; if (!list.some(i => i.incomeType === 'job')) job.main = true; list.push(job); }
  if (!job) return { error: 'Which job is this payslip from?' };
  const y = s.ytd && typeof s.ytd === 'object' ? s.ytd : {};
  const asOf = { asOf: payDate };
  for (const k of ['pay', 'taxablePay', 'tax', 'ni', 'plan', 'pg']) { const v = moneyOf(y[k]); if (v != null) asOf[k] = v; }
  if (asOf.pay != null || asOf.tax != null) { if (!job.ytd || !job.ytd.asOf || job.ytd.asOf <= payDate) job.ytd = asOf; }
  const code = text(s.code, 12).toUpperCase();
  if (code) job.taxCode = code;
  const gross = moneyOf(s.gross);
  // The plan's expected pay follows the latest usual payslip, unless the person said this one is unusual (a bonus).
  if (gross && s.usual !== false) { job.basis = 'payslip'; job.payslipGross = gross; }
  const entry = { id: newId('slip'), job: job.id, employer: text(s.employer, 60) || job.name, payDate, period: text(s.period, 30) || undefined, gross, tax: num(s.tax), ni: moneyOf(s.ni), plan: moneyOf(s.plan), pg: moneyOf(s.pg), pension: moneyOf(s.pension), net: moneyOf(s.net), code: code || undefined, at: today };
  rec.payslips = rec.payslips || [];
  rec.payslips.push(entry);
  const said = `Updated ${job.name || 'that job'}: ${asOf.pay != null ? `${gbp0(asOf.pay)} paid so far this tax year` : `payslip of ${payDate} kept`}${code ? `, tax code ${code}` : ''}.`;
  return { plan, doc, said, year, payslip: entry, jobId: job.id };
}
