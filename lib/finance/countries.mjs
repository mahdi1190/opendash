// lib/finance/countries.mjs - the country registry for "Your money plan".
//
// One entry per country: id -> {id, name, calendar, questions(plan, ctx), calc(plan, ctx), checks(plan, calc, ctx)}.
// Adding a country means adding one module here with its question set, its calculator and its yearly data table
// (the UK's table is TAX_YEARS in lib/finance/uk-tax.mjs). "Somewhere else" has no calculator: the person enters their
// take-home in their own currency and everything else (budgets, matching, debts) works the same.
//
// A question: {id, group, title, help?, kind: 'choice'|'multi'|'fields'|'schedule'|'timing'|'list', ...} (see
// src/finance/36-plan-q.js for how each is drawn). Paths: 'tax.x' a field of plan.tax, 'job.x' a field of the main job.
//
// calc() -> {kind: 'estimate'|'entered'|'none', yearLabel, perYear, perMonth, perPayslip, steps: {year, month, payslip},
//   jobs: {itemId: {name, monthly, payslip, expected: {date: amount}, ...}}, soFar, warnings, notes, stillToPay, overTaken,
//   code, position}

import { TAX_YEARS, taxYearOf, yearData, annualEstimate, soFarThisYear, codeWarnings, parseTaxCode, workedOutCode } from './uk-tax.mjs';
import { realDates, freqOfRule, dn } from './pay-dates.mjs';

const r2 = (x) => Math.round(x * 100) / 100;
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const FREQ_N = { monthly: 12, fourweekly: 13, fortnightly: 26, weekly: 52, quarterly: 4, yearly: 1 };
export const PER = Object.freeze({ month: 1, week: 52 / 12, fortnight: 26 / 12, '4weeks': 13 / 12, quarter: 1 / 3, year: 1 / 12 });

export const isJob = (i) => i && i.kind === 'income' && i.incomeType === 'job';
export const mainJob = (plan) => (plan.items || []).find(i => isJob(i) && i.main) || (plan.items || []).find(isJob) || null;
/** Is this item part of the plan at all (a job left at "not at all" or paused takes no part in the sums)? */
export const inPlay = (i) => i && i.status !== 'no' && !i.paused && !(i.status === 'later' && !i.starts);

/* ---------- the UK ---------- */
const payJobFreq = (job) => { const f = freqOfRule(job.when); return FREQ_N[f] && f !== 'quarterly' && f !== 'yearly' ? f : 'monthly'; };
/** The tax engine's person for the tax year this date is in. plan.taxLink (lib/finance/tax-tab.mjs): the Tax tab's payments, claims and choices for that year. */
export function personOf(plan, today, mutate) {
  const year = taxYearOf(today).id, y = yearData(year);
  const L = plan.taxLink && plan.taxLink.year === year ? plan.taxLink : null;
  const linked = (i) => (L && L.items && L.items[i.id]) || null;
  const items = (plan.items || []).filter(inPlay);
  const yStart = dn(y.start), yEnd = dn(y.end);
  const jobs = items.filter(isJob).map(j => {
    const freq = payJobFreq(j), n = FREQ_N[freq];
    const dates = j.when && j.when.t ? realDates(j.when, yStart, yEnd, { country: 'uk' }).map(d => d.date) : null;
    return { id: j.id, name: j.name || '', main: !!j.main, freq, annual: j.basis === 'payslip' ? num(j.payslipGross) * n : num(j.annual), hoursPct: j.partTime ? j.hoursPct : null, bonus: j.bonus, bonusAt: j.bonusAt != null ? Math.floor(num(j.bonusAt) * n / 12) : undefined, overtime: j.overtime,
      taxCode: j.taxCode || '', start: j.starts || null, end: j.ends || null, prevPay: j.prevPay, prevTax: j.prevTax, ytd: j.ytd || null, pension: j.pension || null, sacrifice: j.sacrifice, changes: j.changes || null, payDates: dates };
  });
  const inYear = (i) => {
    // One total for a period: only the part of it that falls in this tax year (a period across two years is not counted twice).
    if (i.per === 'total') { const f = i.starts ? dn(i.starts) : yStart, t = i.ends ? dn(i.ends) : yEnd; if (f > yEnd || t < yStart) return 0; return num(i.amount) * (Math.min(t, yEnd) - Math.max(f, yStart) + 1) / Math.max(1, t - f + 1); }
    const f = Math.max(yStart, i.starts ? dn(i.starts) : yStart), t = Math.min(yEnd, i.ends ? dn(i.ends) : yEnd);
    return t < f ? 0 : num(i.amount) * (PER[i.per] || 1) * 12 * ((t - f + 1) / (yEnd - yStart + 1));
  };
  const sum = (type) => items.filter(i => i.kind === 'income' && i.incomeType === type).reduce((t, i) => t + inYear(i), 0);
  const person = {
    year, region: plan.tax && plan.tax.region === 'scotland' ? 'scotland' : 'ruk', loans: (plan.tax && plan.tax.loans) || [], blind: !!(plan.tax && plan.tax.blind), marriage: (plan.tax && plan.tax.marriage) || 'none', bik: plan.tax && plan.tax.bik,
    jobs,
    self: items.filter(i => i.kind === 'income' && i.incomeType === 'self').map(i => { const k = linked(i); return { id: i.id, name: i.name || '', from: i.starts || y.start, to: i.ends || y.end, amount: k && k.income != null ? k.income : inYear(i), expenses: k && k.costs != null ? k.costs : i.expenses, capital: k ? k.capital : 0, connected: i.connected === true }; }),
    side: sum('side'), rental: sum('rental'), otherTaxable: sum('other'), interest: sum('interest'), dividends: sum('dividend'),
    ...(L ? { tradeChoice: L.tradeChoice, gains: L.gains, childBenefit: L.childBenefit, giftAid: L.giftAid, pensionPaid: L.pensionPaid, claimRas: L.claimRas === true } : {}),
    noTradingAllowance: !!(plan.tax && plan.tax.noTradingAllowance),
  };
  return mutate ? mutate(person) : person;
}
const LOAN_NAMES = (y, loans) => (loans || []).map(k => (y.loans[k] ? y.loans[k].name : k)).join(' and ');
function steps(t, y, loans, extra) {
  const rows = [{ k: 'gross', label: 'Your pay before anything comes off', amount: t.gross, first: true }];
  rows.push({ k: 'tax', label: 'Income tax', amount: -t.tax });
  rows.push({ k: 'ni', label: 'National Insurance', amount: -t.ni, help: 'Pays for your State Pension and some benefits.' });
  if (t.loans > 0) rows.push({ k: 'loan', label: `Student loan (${LOAN_NAMES(y, loans)})`, amount: -t.loans, help: 'Only taken on pay above a set amount.' });
  if (t.pensionFromPay > 0) rows.push({ k: 'pension', label: 'Pension', amount: -t.pensionFromPay, help: 'Yours to keep later on.' });
  if (t.sacrifice > 0) rows.push({ k: 'sacrifice', label: 'Other schemes through work', amount: -t.sacrifice });
  rows.push({ k: 'take', label: 'What reaches your bank', amount: t.takeHome, total: true });
  if (extra) rows.push(...extra);
  return rows;
}
function ukCalc(plan, ctx) {
  const today = ctx.today, year = taxYearOf(today), y = yearData(year.id);
  const person = personOf(plan, today);
  const est = annualEstimate(person, today);
  // Payments on account already made towards this year come off what is still to pay (the Tax tab records them).
  const paidOn = plan.taxLink && plan.taxLink.year === y.id ? num(plan.taxLink.paidOn) : 0;
  if (paidOn > 0) { const left = r2(est.stillToPay - est.overTaken - paidOn); est.stillToPay = Math.max(0, left); est.overTaken = Math.max(0, -left); }
  const loans = person.loans;
  const main = mainJob(plan);
  const untaxedIncome = est.position.due.trade.income + num(person.rental) + num(person.otherTaxable) + num(person.interest) + num(person.dividends);
  // Money with nothing taken off, and what is still to pay on it (the Tax tab can set the keep-aside amount: plan.taxAside).
  const asideNote = [];
  if (untaxedIncome > 0.5) asideNote.push({ k: 'other', label: 'Other money, with no tax taken off', amount: r2(untaxedIncome) });
  if (est.stillToPay > 0.5) asideNote.push({ k: 'aside', label: 'Tax still to pay', amount: -est.stillToPay, help: 'Nobody takes this before the money reaches you. Keep it aside: you pay it through a tax return.' });
  const factor = { year: 1, month: 1 / 12 };
  const jobs = {};
  for (const j of est.byJob) {
    const expected = {};
    for (const p of j.periods) if (p.date && p.on) expected[p.date] = p.takeHome;
    const ongoing = j.payslip ? j.payslip.takeHome * j.n / 12 : 0;
    jobs[j.id] = { name: j.name, main: j.main, codeText: j.codeText, codeLabel: j.code.label, freq: j.freq, periodsInYear: j.n, payslip: j.payslip, monthly: r2(ongoing), year: j.year, soFar: j.soFar, expected };
  }
  const warnings = [];
  for (const j of person.jobs) for (const w of codeWarnings(person, j)) warnings.push(w);
  if (est.pensionLimitOver) warnings.push({ level: 'info', text: `You and your employer are paying more than £${y.pension.annualAllowance.toLocaleString('en-GB')} into pensions this year, the usual tax-free limit. Worth checking.` });
  if (!year.exact) warnings.push({ level: 'info', text: `The ${y.label} tax figures are not in Freeflo yet, so this uses the latest ones as an estimate.` });
  const mainJ = est.byJob.find(j => j.main) || est.byJob[0];
  const soFar = soFarThisYear(person, today);
  return {
    kind: 'estimate', yearId: y.id, yearLabel: y.label, regionName: person.region === 'scotland' ? 'Scottish' : 'UK', perYear: est.perYear, perMonth: est.perMonth, perPayslip: est.perPayslip,
    steps: { year: steps(est.perYear, y, loans, asideNote), month: steps(est.perMonth, y, loans, asideNote.map(a => ({ ...a, amount: r2(a.amount * factor.month) }))), payslip: est.perPayslip ? steps(est.perPayslip, y, loans) : [] },
    jobs, soFar, warnings, notes: est.notes, stillToPay: est.stillToPay, overTaken: est.overTaken, untaxedIncome: r2(untaxedIncome), hasUntaxed: est.position.hasUntaxed,
    employerPension: est.employerPension, pensionTotal: est.pensionTotal, reliefToClaim: est.reliefToClaim,
    code: mainJ ? { text: mainJ.codeText, label: mainJ.code.label, workedOut: est.workedOut, given: !!(main && main.taxCode) } : null,
    position: est.position, person,
  };
}
const REGION_OPTS = [{ v: 'ruk', l: 'England, Wales or Northern Ireland' }, { v: 'scotland', l: 'Scotland', h: 'Scotland has its own income tax rates.' }];
function ukQuestions(plan, ctx) {
  const q = [];
  const G = 'Your pay', T = 'Tax details';
  const job = mainJob(plan);
  const hasJob = plan.tax && plan.tax.hasJob;
  const g = ctx.guesses || {};
  q.push({ id: 'region', group: 'Where you live', title: 'Where do you live?', help: 'This decides which income tax rates apply to you.', kind: 'choice', path: 'tax.region', options: REGION_OPTS });
  q.push({ id: 'hasjob', group: G, title: 'Do you have a job with a payslip?', help: 'Your employer takes tax off before paying you. If you have more than one, tell us about the main one first.', kind: 'choice', path: 'tax.hasJob',
    options: [{ v: true, l: 'Yes' }, { v: false, l: 'No', h: 'Self-employed or other income only.' }] });
  if (hasJob) {
    q.push({ id: 'salary', group: G, title: 'How much is your pay, before tax?', help: 'Your contract or payslip shows it.', kind: 'fields', hint: g.salary ? `Your bank shows about ${ctx.fmt.money(g.salary.amount)} reaching you each time, after tax.` : null,
      fields: [{ path: 'job.basis', type: 'select', label: 'I know it as', options: [['annual', 'A yearly salary'], ['payslip', 'An amount on each payslip']], def: 'annual' },
        { path: 'job.annual', type: 'money', label: 'A year, before tax', showIf: { path: 'job.basis', not: 'payslip' } }, { path: 'job.payslipGross', type: 'money', label: 'Each payslip, before tax', showIf: { path: 'job.basis', is: 'payslip' } }] });
    q.push({ id: 'parttime', group: G, title: 'Is that the full-time amount, and do you work fewer hours?', kind: 'choice', path: 'job.partTime', options: [{ v: false, l: 'No, that is what I get' }, { v: true, l: 'Yes, I work part time', h: 'We will reduce it for your hours.' }] });
    if (job && job.partTime) q.push({ id: 'hours', group: G, title: 'How much of a full-time week do you work?', kind: 'fields', fields: [{ path: 'job.hoursPct', type: 'percent', label: 'Share of full time', placeholder: '60' }] });
    q.push({ id: 'payday', group: G, title: 'When are you paid?', help: 'We work out the real date, including weekends and bank holidays.', kind: 'schedule', path: 'job.when', kindOf: 'pay', guess: g.salary && g.salary.rule ? { rule: g.salary.rule, label: 'From your bank' } : null });
    q.push({ id: 'jobstart', group: G, title: 'Did this job start after April, or is it about to?', help: 'Leave it empty if you have had it all year. A date in the future means it joins your plan from then.', kind: 'fields', fields: [{ path: 'job.starts', type: 'date', label: 'First day' }, { path: 'job.ends', type: 'date', label: 'Last day, if you know it will end' }] });
    if (job && job.starts && job.starts > yearData(taxYearOf(ctx.today).id).start) q.push({ id: 'p45', group: G, title: 'Did you earn anything earlier this tax year?', help: 'A P45 (the form you get when you leave a job) shows both. Skip this if you did not work.', kind: 'fields', fields: [{ path: 'job.prevPay', type: 'money', label: 'Pay so far' }, { path: 'job.prevTax', type: 'money', label: 'Tax paid so far' }] });
    q.push({ id: 'bonus', group: G, title: 'Do you expect a bonus this tax year?', kind: 'fields', fields: [{ path: 'job.bonus', type: 'money', label: 'Bonus before tax' }, { path: 'job.bonusAt', type: 'select', label: 'Paid in', options: taxMonths(), def: 0 }] });
    q.push({ id: 'overtime', group: G, title: 'Do you usually get overtime?', kind: 'fields', fields: [{ path: 'job.overtime', type: 'money', label: 'On a usual payslip, before tax' }] });
  }
  q.push({ id: 'loans', group: T, title: 'Do you have a student loan?', help: 'Tick all that apply. Your payslip or the Student Loans Company tells you which plan.', kind: 'multi', path: 'tax.loans',
    options: [{ v: 'plan1', l: 'Plan 1', h: 'Usually started before 2012 in England or Wales, or in Northern Ireland.' }, { v: 'plan2', l: 'Plan 2', h: 'Usually started from 2012 to 2023 in England or Wales.' }, { v: 'plan4', l: 'Plan 4', h: 'Scotland.' }, { v: 'plan5', l: 'Plan 5', h: 'Started from August 2023 in England.' }, { v: 'pg', l: 'Postgraduate loan', h: 'A master\'s or doctoral loan. Taken on top of the others.' }] });
  if (hasJob) {
    q.push({ id: 'pensiontype', group: T, title: 'Do you pay into a pension at work?', help: 'Your payslip or your pension letter usually says which.', kind: 'choice', path: 'job.pension.type',
      options: [{ v: 'sacrifice', l: 'Yes, through salary sacrifice', h: 'Your pay is reduced before tax and National Insurance.' }, { v: 'netpay', l: 'Yes, taken before tax', h: 'Called "net pay". Saves tax, but not National Insurance.' }, { v: 'ras', l: 'Yes, taken after tax', h: 'Called "relief at source". Your provider claims 20% back for you.' }, { v: 'none', l: 'No' }] });
    if (job && job.pension && job.pension.type && job.pension.type !== 'none') {
      q.push({ id: 'pensionamt', group: T, title: 'How much goes in?', help: 'Give either a percentage of your pay or an amount on each payslip.', kind: 'fields', fields: [{ path: 'job.pension.pct', type: 'percent', label: 'You pay (% of pay)', placeholder: '5' }, { path: 'job.pension.amount', type: 'money', label: 'Or an amount on each payslip' }, { path: 'job.pension.employerPct', type: 'percent', label: 'Your employer pays (% of pay)', placeholder: '3' }] });
    }
    q.push({ id: 'sacrifice', group: T, title: 'Anything else taken from your pay before tax?', help: 'For example a cycle to work or car scheme.', kind: 'fields', fields: [{ path: 'job.sacrifice', type: 'money', label: 'A month' }] });
    q.push({ id: 'bik', group: T, title: 'Do you get anything from work that is taxed, but is not money?', help: 'For example a company car or health cover. Your P11D form (a yearly list of work benefits) shows the value.', kind: 'fields', fields: [{ path: 'tax.bik', type: 'money', label: 'Value a year' }] });
    const expected = (() => { try { return workedOutCode(personOf(plan, ctx.today), job ? { id: job.id, main: true } : null); } catch { return '1257L'; } })();
    q.push({ id: 'taxcode', group: T, title: 'Do you know your tax code?', help: 'A short code on your payslip, like 1257L. It tells your employer how much of your pay is tax-free.', kind: 'fields', hint: `From your answers we would expect ${expected}. Leave it empty and we use that.`, fields: [{ path: 'job.taxCode', type: 'text', label: 'Tax code', placeholder: expected, upper: true }] });
  }
  q.push({ id: 'allowances', group: T, title: 'Do either of these apply to you?', help: 'Most people can skip this.', kind: 'choice', path: 'tax.marriage', options: [{ v: 'none', l: 'No' }, { v: 'give', l: 'I gave part of my tax-free amount to my spouse', h: 'Marriage Allowance: you earn less than the tax-free amount.' }, { v: 'get', l: 'My spouse gave me part of theirs', h: 'Marriage Allowance: you pay basic-rate tax.' }] });
  q.push({ id: 'blind', group: T, title: 'Are you registered blind?', help: 'You may get an extra tax-free amount: Blind Person\'s Allowance.', kind: 'choice', path: 'tax.blind', options: [{ v: false, l: 'No' }, { v: true, l: 'Yes' }] });
  q.push({ id: 'jobs', group: 'Other income', title: 'Do you have another job with a payslip?', help: 'Each job has its own tax code. A second job is usually on BR, which means no tax-free amount. Leave the code empty and we assume that.', kind: 'list', list: 'jobs', add: 'Add another job',
    columns: [{ key: 'name', type: 'text', label: 'Employer' }, { key: 'annual', type: 'money', label: 'A year, before tax' }, { key: 'taxCode', type: 'text', label: 'Tax code', upper: true, placeholder: 'BR' }, { key: 'starts', type: 'date', label: 'First day' }, { key: 'ends', type: 'date', label: 'Last day' }] });
  q.push({ id: 'self', group: 'Other income', title: 'Have you been self-employed this tax year?', help: 'Consulting, freelance work, a small business. No tax is taken before this reaches you, so we keep track of what you will still owe.', kind: 'list', list: 'self', add: 'Add a period',
    columns: [{ key: 'name', type: 'text', label: 'What was it?' }, { key: 'amount', type: 'money', label: 'Money in, total' }, { key: 'expenses', type: 'money', label: 'Costs, total' }, { key: 'starts', type: 'date', label: 'From' }, { key: 'ends', type: 'date', label: 'To' }] });
  q.push(otherIncomeQuestion(true));
  return q;
}
const taxMonths = () => ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'].map((m, i) => [i, m]);
function otherIncomeQuestion(taxed) {
  const types = taxed
    ? [['side', 'Side income'], ['benefit', 'Benefits'], ['rental', 'Rent from a property'], ['dividend', 'Dividends'], ['interest', 'Savings interest'], ['partner', 'From a partner'], ['other', 'Other']]
    : [['side', 'Side income'], ['benefit', 'Benefits'], ['partner', 'From a partner'], ['other', 'Other']];
  return { id: 'otherincome', group: 'Other income', title: 'Does any other money come in?', help: taxed ? 'Benefits, rent from a lodger or a property, dividends, interest, or money from a partner.' : 'Benefits, side income, or money from a partner.', kind: 'list', list: 'income', add: 'Add money in',
    columns: [{ key: 'incomeType', type: 'select', label: 'Kind', options: types }, { key: 'name', type: 'text', label: 'Name' }, { key: 'amount', type: 'money', label: 'Amount' }, { key: 'per', type: 'select', label: 'Every', options: [['month', 'Month'], ['week', 'Week'], ['year', 'Year']] }] };
}
function ukChecks(plan, calc, ctx) {
  const m = Number(ctx.today.slice(5, 7)), out = [];
  const inRun = m <= 4 || m >= 12;
  out.push({ id: 'code', text: 'Compare the tax code on your latest payslip with the one shown above. If it changes, tell Freeflo.', soon: false });
  if (calc && calc.hasUntaxed) out.push({ id: 'sa', text: 'You have income with no tax taken. A tax return for last year is usually due online by 31 January, and tax is paid by the same day.', soon: m === 1 || m === 12 });
  if (calc && calc.reliefToClaim > 0.5) out.push({ id: 'relief', text: `You may be able to claim about ${ctx.fmt.money(calc.reliefToClaim)} more pension tax relief.`, soon: inRun });
  out.push({ id: 'isa', text: 'If you use an ISA (a tax-free savings account), this year\'s allowance ends on 5 April.', soon: inRun });
  out.push({ id: 'p60', text: 'Your employer gives you a P60 by 31 May: it shows your pay and tax for the year. Keep it.', soon: m === 4 || m === 5 });
  if (plan.tax && plan.tax.marriage === 'none') out.push({ id: 'marriage', text: 'Married, and one of you earns under the tax-free amount? Marriage Allowance may save you money.', soon: false });
  return out;
}

/* ---------- somewhere else: take-home is entered, nothing is worked out ---------- */
function otherCalc(plan) {
  const jobs = {}; let monthly = 0, annualGuess = 0;
  for (const j of (plan.items || []).filter(i => isJob(i) && inPlay(i))) {
    const f = payJobFreq(j), n = FREQ_N[f];
    const pay = num(j.net);
    jobs[j.id] = { name: j.name, main: !!j.main, freq: f, periodsInYear: n, payslip: { takeHome: pay }, monthly: r2(pay * n / 12), expected: {} };
    monthly += pay * n / 12; annualGuess += pay * n;
  }
  const perMonth = { takeHome: r2(monthly) }, perYear = { takeHome: r2(annualGuess) };
  return { kind: 'entered', yearLabel: null, perYear, perMonth, perPayslip: null, steps: { year: [{ k: 'take', label: 'What reaches your bank', amount: perYear.takeHome, total: true }], month: [{ k: 'take', label: 'What reaches your bank', amount: perMonth.takeHome, total: true }], payslip: [] }, jobs, soFar: null, warnings: [], notes: [], stillToPay: 0, overTaken: 0, code: null };
}
function otherQuestions(plan, ctx) {
  const g = ctx.guesses || {};
  return [
    { id: 'net', group: 'Your pay', title: 'How much reaches your bank each time you are paid?', help: 'Use the amount after tax and anything else your employer takes off. Leave it empty if you have no regular pay.', kind: 'fields', hint: g.salary ? `Your bank shows about ${ctx.fmt.money(g.salary.amount)} each time.` : null, fields: [{ path: 'job.net', type: 'money', label: 'Take-home pay', guess: g.salary ? g.salary.amount : null }] },
    { id: 'payday', group: 'Your pay', title: 'When are you paid?', kind: 'schedule', path: 'job.when', kindOf: 'pay', guess: g.salary && g.salary.rule ? { rule: g.salary.rule, label: 'From your bank' } : null },
    otherIncomeQuestion(false),
  ];
}

export const COUNTRIES = Object.freeze({
  uk: Object.freeze({ id: 'uk', name: 'United Kingdom', calendar: 'uk', years: TAX_YEARS, questions: ukQuestions, calc: ukCalc, checks: ukChecks }),
  other: Object.freeze({ id: 'other', name: 'Somewhere else', calendar: null, years: null, questions: otherQuestions, calc: otherCalc, checks: () => [] }),
});
export const countryOf = (id) => COUNTRIES[id] || null;
export const COUNTRY_QUESTION = Object.freeze({
  id: 'country', group: 'Where you live', title: 'Which country do you pay tax in?', help: 'You can change this at any time.', kind: 'choice', path: 'country',
  options: [{ v: 'uk', l: 'United Kingdom', h: 'We work out your tax, National Insurance and student loan.' }, { v: 'other', l: 'Somewhere else', h: 'You tell us what reaches your bank, in your own currency.' }],
});
export { parseTaxCode };
