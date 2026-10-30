// lib/finance/what-if.mjs - the "What if?" explorer's scenarios. Pure: nothing here saves anything.
//
// One small entry per scenario type, in SCENARIOS. Adding one means adding an entry:
//   { id, label, icon, say: (v) => words, only?: 'uk', needs?: (plan) => bool, lump?: true (a one-off, not a monthly change),
//     fields: [{k, label, kind: 'money'|'percent'|'date'|'choice', min, max, step, def, options?}],
//     ready: [{label, values}] (ready-made taps), apply(plan, values, ctx) (changes the COPY of the plan it is given) }
//
//   catalogue(plan)                    the entries for the page (no functions)
//   applyParts(plan, parts, ctx)       a new plan with these changes: parts = [{type, values}]
//   evaluate(plan, parts, metricsOf)   {today, scenario} the page shows side by side
// Numbers always come from the plan engine and the tax engine (metricsOf = money-plan.mjs planMetrics).

import { isJob, mainJob } from './countries.mjs';

const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const newId = (p, plan) => { let i = 1; while (plan.items.some(x => x.id === `${p}-${i}`)) i++; return `${p}-${i}`; };
const hasJob = (plan) => !!mainJob(plan);
const isOther = (plan) => plan.country !== 'uk';
const firstOf = (d) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
const billIn = (plan, type, label, values, cat) => {
  const from = firstOf(values.from);
  let it = plan.items.find(i => i.type === type && i.status !== 'no');
  // Already paying it, and the new amount starts later: the old one runs up to the day before.
  if (it && from && !it.starts) {
    const d = new Date(Date.parse(from + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10);
    it.ends = d;
    it = null;
  }
  if (!it) { it = plan.items.find(i => i.type === type && i.status === 'no') || { id: newId(type, plan), kind: 'bill', type, name: label, per: 'month', when: { t: 'day', day: 1, adjust: 'next' } }; if (cat) it.cat = cat; if (!plan.items.includes(it)) plan.items.push(it); }
  it.status = 'now'; delete it.paused;
  it.amount = num(values.amount);
  if (from) it.starts = from;
  return it;
};

export const SCENARIOS = Object.freeze([
  { id: 'raise', label: 'A pay rise', icon: 'trending-up', needs: hasJob, say: (v, p) => (isOther(p) ? `${money(v.amount)} more each payday` : `${money(v.amount)} more a year, before tax`),
    fields: [{ k: 'amount', label: 'Extra pay a year, before tax', labelElse: 'Extra reaching your bank a year', kind: 'money', min: 0, max: 30000, step: 250, def: 3000 }],
    ready: [{ label: 'A £1,000 rise', values: { amount: 1000 } }, { label: 'A £3,000 rise', values: { amount: 3000 } }, { label: 'A £10,000 rise', values: { amount: 10000 } }],
    apply(plan, v) {
      const j = mainJob(plan); if (!j) return;
      if (isOther(plan)) { j.net = num(j.net) + num(v.amount) / 12; return; }
      if (j.basis === 'payslip') j.payslipGross = num(j.payslipGross) + num(v.amount) / 12; else j.annual = num(j.annual) + num(v.amount);
    } },
  { id: 'salary', label: 'A new salary', icon: 'briefcase', only: 'uk', needs: hasJob, say: (v) => `A new salary of ${money(v.annual)}`,
    fields: [{ k: 'annual', label: 'New salary a year, before tax', kind: 'money', min: 10000, max: 200000, step: 500, def: 35000, fromPlan: (p) => { const j = mainJob(p); return j && j.annual ? j.annual : null; } }],
    ready: [],
    apply(plan, v) { const j = mainJob(plan); if (j) { j.basis = undefined; j.annual = num(v.annual); } } },
  { id: 'bonus', label: 'A bonus', icon: 'gift', lump: true, needs: hasJob, say: (v, p) => (isOther(p) ? `A bonus of ${money(v.amount)}` : `A bonus of ${money(v.amount)} before tax`),
    fields: [{ k: 'amount', label: 'Bonus before tax', labelElse: 'Bonus reaching your bank', kind: 'money', min: 0, max: 50000, step: 250, def: 2000 }],
    ready: [{ label: 'A £1,000 bonus', values: { amount: 1000 } }, { label: 'A £5,000 bonus', values: { amount: 5000 } }],
    apply(plan, v) { const j = mainJob(plan); if (!j) return; if (isOther(plan)) { plan.oneOffIn = num(plan.oneOffIn) + num(v.amount); return; } j.bonus = num(j.bonus) + num(v.amount); } },
  { id: 'pension', label: 'Pay more or less into my pension', icon: 'piggy-bank', only: 'uk', needs: hasJob, say: (v) => `Pension at ${num(v.pct)}% of your pay`,
    fields: [{ k: 'pct', label: 'You pay (% of pay)', kind: 'percent', min: 0, max: 30, step: 0.5, def: 5, fromPlan: (p) => { const j = mainJob(p); return j && j.pension && j.pension.pct != null ? j.pension.pct : null; } }],
    ready: [],
    apply(plan, v) { const j = mainJob(plan); if (!j) return; const pen = j.pension && j.pension.type && j.pension.type !== 'none' ? j.pension : { type: 'sacrifice' }; j.pension = { ...pen, pct: num(v.pct), amount: undefined }; } },
  { id: 'sacrifice', label: 'Change how my pension is paid', icon: 'repeat', only: 'uk', needs: hasJob, say: (v) => ({ sacrifice: 'Pension through salary sacrifice', netpay: 'Pension taken before tax', ras: 'Pension taken after tax' }[v.type] || ''),
    fields: [{ k: 'type', label: 'How it is paid', kind: 'choice', def: 'sacrifice', options: [['sacrifice', 'Salary sacrifice: before tax and National Insurance'], ['netpay', 'Before tax only'], ['ras', 'After tax: your provider claims 20% back']] }],
    ready: [],
    apply(plan, v) { const j = mainJob(plan); if (!j) return; j.pension = { ...(j.pension || { pct: 5 }), type: v.type }; } },
  { id: 'rent', label: 'Moving to a new rent', icon: 'house', say: (v) => `Rent of ${money(v.amount)} a month`,
    fields: [{ k: 'amount', label: 'New rent a month', kind: 'money', min: 0, max: 5000, step: 25, def: 900, fromPlan: (p) => { const r = p.items.find(i => i.type === 'rent' && i.status !== 'no'); return r ? r.amount : null; } }, { k: 'from', label: 'From', kind: 'date', optional: true }],
    ready: [],
    apply(plan, v) { billIn(plan, 'rent', 'Rent', v); } },
  { id: 'startbills', label: 'Starting to pay rent and bills', icon: 'calendar-plus', say: (v) => `${money(num(v.amount) + num(v.bills))} a month${firstOf(v.from) ? ' from ' + v.from : ''}`,
    fields: [{ k: 'amount', label: 'Rent a month', kind: 'money', min: 0, max: 5000, step: 25, def: 800 }, { k: 'bills', label: 'Bills a month', kind: 'money', min: 0, max: 1500, step: 10, def: 200 }, { k: 'from', label: 'From', kind: 'date' }],
    ready: [],
    apply(plan, v) {
      billIn(plan, 'rent', 'Rent', { amount: v.amount, from: v.from });
      const id = newId('bills', plan);
      plan.items.push({ id, kind: 'bill', name: 'Bills', amount: num(v.bills), per: 'month', status: 'now', starts: firstOf(v.from) || undefined, when: { t: 'day', day: 1, adjust: 'next' } });
    } },
  { id: 'car', label: 'A new car on finance', icon: 'car', say: (v) => `Car finance at ${money(v.monthly)} a month`,
    fields: [{ k: 'monthly', label: 'Payment a month', kind: 'money', min: 0, max: 1000, step: 10, def: 250 }, { k: 'balance', label: 'How much you borrow', kind: 'money', min: 0, max: 60000, step: 500, def: 12000 }, { k: 'apr', label: 'Yearly interest %', kind: 'percent', min: 0, max: 30, step: 0.5, def: 8 }, { k: 'from', label: 'From', kind: 'date', optional: true }],
    ready: [],
    apply(plan, v) { plan.items.push({ id: newId('car', plan), kind: 'debt', name: 'Car finance', balance: num(v.balance), apr: num(v.apr), minimum: num(v.monthly), status: 'now', starts: firstOf(v.from) || undefined, when: { t: 'day', day: 1, adjust: 'next' } }); } },
  { id: 'paymore', label: 'Paying more off my debts', icon: 'credit-card', needs: (p) => p.items.some(i => i.kind === 'debt' && i.status !== 'no'), say: (v) => `${money(v.amount)} more a month off your debts`,
    fields: [{ k: 'amount', label: 'Extra a month', kind: 'money', min: 0, max: 1000, step: 10, def: 50 }],
    ready: [{ label: '£25 more a month', values: { amount: 25 } }, { label: '£100 more a month', values: { amount: 100 } }],
    apply(plan, v) { plan.debtExtra = num(plan.debtExtra) + num(v.amount); } },
  { id: 'job2', label: 'A second job', icon: 'briefcase', only: 'uk', say: (v) => `A second job paying ${money(v.annual)} a year`,
    fields: [{ k: 'annual', label: 'A year, before tax', kind: 'money', min: 0, max: 60000, step: 250, def: 8000 }, { k: 'from', label: 'From', kind: 'date', optional: true }],
    ready: [],
    apply(plan, v) { plan.items.push({ id: newId('job', plan), kind: 'income', incomeType: 'job', name: 'Second job', annual: num(v.annual), status: 'now', starts: firstOf(v.from) || undefined, when: { t: 'day', day: 28, adjust: 'prev' } }); } },
  { id: 'side', label: 'Side income', icon: 'coins', say: (v) => `${money(v.amount)} a month on the side`,
    fields: [{ k: 'amount', label: 'A month', kind: 'money', min: 0, max: 5000, step: 25, def: 300 }, { k: 'from', label: 'From', kind: 'date', optional: true }],
    ready: [],
    apply(plan, v) { plan.items.push({ id: newId('side', plan), kind: 'income', incomeType: 'side', name: 'Side income', amount: num(v.amount), per: 'month', status: 'now', starts: firstOf(v.from) || undefined }); } },
  { id: 'parttime', label: 'Going part time', icon: 'clock', needs: hasJob, say: (v) => `Working ${num(v.pct)}% of full time`,
    fields: [{ k: 'pct', label: 'Share of full time', kind: 'percent', min: 10, max: 100, step: 5, def: 80 }],
    ready: [{ label: 'Four days a week', values: { pct: 80 } }, { label: 'Three days a week', values: { pct: 60 } }],
    apply(plan, v) {
      const j = mainJob(plan); if (!j) return;
      if (isOther(plan)) { j.net = num(j.net) * num(v.pct) / 100; return; }
      j.partTime = true; j.hoursPct = num(v.pct);
    } },
  { id: 'purchase', label: 'A big one-off purchase', icon: 'shopping-bag', lump: true, say: (v) => `${money(v.amount)} from your savings`,
    fields: [{ k: 'amount', label: 'How much', kind: 'money', min: 0, max: 50000, step: 100, def: 2000 }],
    ready: [{ label: 'A £1,000 holiday', values: { amount: 1000 } }, { label: 'A £5,000 car repair or kitchen', values: { amount: 5000 } }],
    apply(plan, v) { plan.oneOffOut = num(plan.oneOffOut) + num(v.amount); } },
]);
const money = (x) => '£' + Math.round(num(x)).toLocaleString('en-GB');
const BY = new Map(SCENARIOS.map(s => [s.id, s]));

/** The entries the page draws (no functions; each field's starting value from the plan where there is one). */
export function catalogue(plan, sym = '£') {
  return SCENARIOS.filter(s => (!s.only || s.only === plan.country) && (!s.needs || s.needs(plan))).map(s => ({
    id: s.id, label: s.label, icon: s.icon, lump: !!s.lump, ready: s.ready.map(r => ({ label: r.label.replace(/£/g, sym), values: r.values })),
    fields: s.fields.map(f => { const { fromPlan, labelElse, ...rest } = f; const v = fromPlan ? fromPlan(plan) : null; return { ...rest, label: plan.country !== 'uk' && labelElse ? labelElse : f.label, def: v != null && v !== '' ? v : f.def }; }),
  }));
}
export const cleanParts = (parts) => (Array.isArray(parts) ? parts : []).slice(0, 8).map(p => {
  if (!p || !BY.has(p.type)) return null;
  const s = BY.get(p.type), values = {};
  for (const f of s.fields) {
    const raw = p.values ? p.values[f.k] : undefined;
    if (f.kind === 'date') { if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) values[f.k] = raw; else if (!f.optional) values[f.k] = ''; continue; }
    if (f.kind === 'choice') { values[f.k] = f.options.some(o => o[0] === raw) ? raw : f.def; continue; }
    const n = Number(raw);
    values[f.k] = Number.isFinite(n) ? Math.min(1e7, Math.max(0, n)) : f.def;
  }
  return { type: p.type, values };
}).filter(Boolean);
/** A deep copy of the plan with these changes. The original is never touched. */
export function applyParts(plan, parts) {
  const copy = JSON.parse(JSON.stringify(plan));
  for (const p of cleanParts(parts)) { const s = BY.get(p.type); if (s) s.apply(copy, p.values); }
  return copy;
}
export const sayParts = (plan, parts, sym = '£') => cleanParts(parts).map(p => BY.get(p.type).say(p.values, plan).replace(/£/g, sym));
/** The dates a scenario's changes begin: its result is shown as it will be then. */
export const startsOf = (parts) => cleanParts(parts).map(p => p.values.from).filter(d => typeof d === 'string' && d);
export const isLump = (t) => { const s = BY.get(t); return !!(s && s.lump); };
export { isJob };
