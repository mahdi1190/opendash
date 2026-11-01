// lib/finance/tax-rules.mjs - the year's calendar and the rules of thumb behind the Tax tab. Pure: no I/O, no clock.
// Every date comes from the tax year's end date, so future years just work. Sources, read on 30 Oct 2026:
//   [dl]  https://www.gov.uk/self-assessment-tax-returns/deadlines        (5 October, 31 October, 30 December, 31 January, 31 July)
//   [pen] https://www.gov.uk/self-assessment-tax-returns/penalties        (100 pounds, then daily, then 5%; 5% late payment at 30 days, 6 and 12 months)
//   [who] https://www.gov.uk/self-assessment-tax-returns/who-must-send-a-tax-return
//   [tpa] https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income
//   [rec] https://www.gov.uk/self-employed-records/how-long-to-keep-your-records   (5 years after the 31 January deadline)
//   [p60] https://www.gov.uk/paye-forms-p45-p60-p11d/p60 (P60 by 31 May); P11D by 6 July: https://www.gov.uk/employer-reporting-expenses-benefits/deadlines
//   [mtd] https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax
//   [poa] https://www.gov.uk/government/publications/fiscal-events-2026-factsheets/timely-payments-in-income-tax-self-assessment-factsheet--2
//   [mar] https://www.gov.uk/marriage-allowance   [gift] https://www.gov.uk/donating-to-charity/gift-aid   [cb] https://www.gov.uk/child-benefit-tax-charge
//   [room] https://www.gov.uk/rent-room-in-your-home   [dir] https://www.gov.uk/hmrc-internal-manuals/national-insurance-manual/nim12000 (directors: a yearly period)
//   [cl4] https://www.gov.uk/self-employed-national-insurance-rates (State Pension age)   [ben] https://www.gov.uk/income-tax/taxfree-and-taxable-state-benefits
//   [penr] https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief (100% of earnings, or 3,600 pounds)   [cgt60] https://www.gov.uk/report-and-pay-your-capital-gains-tax/if-you-sold-a-property-in-the-uk-on-or-after-6-april-2020
//
//   deadlinesFor(yearId)                   the return's dates for that tax year, in order
//   nextDeadlines(today, o)                what is coming up across the years that matter now
//   needToFile(person, due, o)             "Do I need to file this year?" with the reason
//   rhythmFor(today, ctx)                  the year's prompts: April, May, July, October, December, January, March
//   yearEndReview(person, due, ctx)        tax-saving suggestions with the amount each would save
//   notesFor(person, due, ctx)             things people forget, only when they apply
//   notCovered(person, due, ctx)           what Freeflo does not work out, one sentence each, only when the person's answers suggest it applies
//   keepRecordsUntil(yearId)               the date to keep records until
//   payslipIssues(slip, expected, ctx)     a payslip against what the engine expected and the bank

import { yearData, taxYearOf, parseTaxCode, codeYearOf } from './uk-tax.mjs';

const r2 = (x) => Math.round(x * 100) / 100;
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const gbp0 = (x) => '£' + Math.round(x).toLocaleString('en-GB');
// Marriage Allowance goes only to someone paying no more than the basic rate; in Scotland, the intermediate rate ([mar]).
const couldGetMarriage = (person, due, y) => person.marriage === 'none' && due.income > y.allowance && due.taxParts.taxable <= (person.region === 'scotland' ? y.bands.scotland.find(b => b[2] === 'intermediate')[0] : y.bands.ruk[0][0]);
const endYear = (id) => Number(String(id).slice(0, 4)) + 1;
const nextId = (id, by = 1) => { const a = Number(String(id).slice(0, 4)) + by; return `${a}-${String((a + 1) % 100).padStart(2, '0')}`; };
export { nextId as taxYearAfter };

export const PENALTY_LINE = 'Late means a £100 penalty, then more after 3, 6 and 12 months. Paying late adds interest, and 5% of what is unpaid at 30 days, 6 months and 12 months.';

/**
 * The dates for one tax year's return. id is stable, so a tick or a task stays with it.
 * kind: register | file | pay | poa. needs: 'new' (only if you have not sent a return before), 'poa' (only if payments on account apply).
 */
export function deadlinesFor(yearId) {
  const e = endYear(yearId);
  const label = yearData(yearId).label;
  return [
    { id: 'register', kind: 'register', date: `${e}-10-05`, title: 'Register for Self Assessment', text: `If you have not sent a return before, or did not need one for ${yearData(nextId(yearId, -1)).label}, tell HMRC by this date. You get a UTR, your 10-digit taxpayer number, in the post.`, needs: 'new', lead: 30 },
    { id: 'paper', kind: 'file', date: `${e}-10-31`, title: 'Paper return, if you use paper', text: 'Most people file online and can ignore this one.', needs: 'paper', lead: 14 },
    { id: 'code', kind: 'file', date: `${e}-12-30`, title: 'File by now to pay through your tax code', text: 'If you owe under £3,000 and have a job, HMRC can collect it through your pay next year instead of one bill. Tick this once you have filed by this date and not asked to pay it in one go: Freeflo then stops counting it as a January bill.', needs: 'small', lead: 14 },
    { id: 'file', kind: 'file', date: `${e + 1}-01-31`, title: `File your ${label} return online`, text: 'Check your figures, then sign in on GOV.UK and send it. Freeflo walks you through it.', lead: 21 },
    { id: 'pay', kind: 'pay', date: `${e + 1}-01-31`, title: `Pay your ${label} tax bill`, text: 'The rest of the bill, plus your first payment on account if you have one.', lead: 14 },
    { id: 'poa2', kind: 'poa', date: `${e + 1}-07-31`, title: 'Second payment on account', text: 'The second half of what you pay in advance towards next year.', needs: 'poa', lead: 14 },
  ];
}
/** The date before which the task appears: a gentle lead, never before today. */
export function taskDate(d, today) {
  const n = Date.parse(d.date + 'T00:00:00Z') - (d.lead || 14) * 864e5;
  const iso = new Date(n).toISOString().slice(0, 10);   // clock-ok: date arithmetic only
  return iso < today ? today : iso;
}
/** Keep records until 31 January, 5 years after the filing deadline ([rec]: filed for year ending 2023 by Jan 2024 -> end of Jan 2029). */
export const keepRecordsUntil = (yearId) => `${endYear(yearId) + 6}-01-31`;

/* ---------- do I need to file? ---------- */
// needToFile lives in uk-tax.mjs, so the money plan and the Tax tab give the one answer.
export { needToFile } from './uk-tax.mjs';

/* ---------- what is coming up ---------- */
const keepDeadline = (d, ctx) => {
  if (d.needs === 'new') return !ctx.registered;
  if (d.needs === 'paper') return !!ctx.paper;
  if (d.needs === 'small') return ctx.billUnder3000 === true && !ctx.noJob;
  if (d.needs === 'poa') return !!ctx.poaApplies;
  return true;
};
/**
 * The dates for a year, filtered for this person and marked. ctx: {today, registered, paper, billUnder3000, noJob, poaApplies, ticks: {id: date}}.
 * state: done | overdue | soon (within 30 days) | later. A date passed with no tick reads as overdue.
 */
export function yearDeadlines(yearId, ctx) {
  const today = ctx.today;
  const days = (iso) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 864e5);
  return deadlinesFor(yearId).filter(d => keepDeadline(d, ctx)).map(d => {
    const tick = ctx.ticks && ctx.ticks[d.id];
    const left = days(d.date);
    // Collected through the tax code: no January bill. Only a first payment on account can still be due that day.
    if (d.id === 'pay' && ctx.viaCode) {
      if (!ctx.poaFirst) return { ...d, title: 'Collected through your tax code', text: `You do not pay this as a January bill. HMRC takes it through your pay in ${yearData(codeYearOf(yearId)).label}, so your pay will be a little lower then.`, year: yearId, days: left, state: 'done', ticked: null, viaCode: true };
      return { ...d, title: 'Your first payment on account', text: `The rest of the bill is collected through your tax code, so your pay will be a little lower in ${yearData(codeYearOf(yearId)).label}. Only this is paid in January.`, year: yearId, days: left, state: tick ? 'done' : left < 0 ? 'overdue' : left <= 30 ? 'soon' : 'later', ticked: tick || null };
    }
    return { ...d, year: yearId, days: left, state: tick ? 'done' : left < 0 ? 'overdue' : left <= 30 ? 'soon' : 'later', ticked: tick || null };
  });
}

/* ---------- the year's rhythm ---------- */
/**
 * Prompts for this time of year. Each has a stable id per year: one tap dismisses it or turns it into a task.
 * ctx: {today, yearId, filing: need-to-file answer for last year, hasJob, hasBik, hasUntaxed, registered, gatewayBroken}.
 */
export function rhythmFor(today, ctx = {}) {
  const m = Number(today.slice(5, 7)), d = Number(today.slice(8, 10));
  const year = taxYearOf(today).id;
  const y = yearData(year);
  const last = nextId(year, -1);
  const out = [];
  const add = (id, title, text, o = {}) => out.push({ id: `${id}:${o.year || year}`, title, text, due: o.due || null, kind: o.kind || 'prompt' });
  const start = Number(year.slice(0, 4));
  // April: new tax year, tax code, P60 by 31 May. July: P11D by 6 July.
  if ((m === 4 && d >= 6) || m === 5) {
    if (ctx.hasJob) add('april-code', 'A new tax year has started: check your tax code', 'Your first payslip of the year shows it. If it looks different, tell Freeflo.', { due: `${start}-05-15` });
    if (ctx.hasJob) add('p60', 'Your P60 should arrive by 31 May', 'It shows your pay and tax for last year. Keep it: your return needs it.', { due: `${start}-05-31` });
  }
  if (m === 6 || (m === 7 && d <= 6)) { if (ctx.hasBik) add('p11d', 'Your P11D should arrive by 6 July', 'It lists work benefits such as a company car. Your return needs it.', { due: `${start}-07-06` }); }
  // September, October: register if you are new.
  if ((m === 9 || m === 10) && !ctx.registered && ctx.filing && ctx.filing.answer !== 'no') add('register', `Register for Self Assessment by 5 October`, `You need to send a return for ${yearData(last).label}, and you have not registered yet. It takes about 10 minutes on GOV.UK.`, { due: `${start}-10-05`, year: last });
  // November to January: file and pay.
  if ((m >= 11 || m === 1) && ctx.filing && ctx.filing.answer !== 'no') {
    const fileYear = m === 1 ? nextId(year, -1) : last;
    add('file', `File your ${yearData(fileYear).label} return`, 'The online deadline is 31 January. Doing it in December means no rush, and you know the bill in time.', { due: `${endYear(fileYear) + 1}-01-31`, year: fileYear });
    if (ctx.gatewayBroken) add('gateway', 'Sort out your Government Gateway sign-in', 'You said it was not working. Fix it now: getting a new one can take days. Freeflo never asks for that password.', { due: `${endYear(fileYear) + 1}-01-10`, year: fileYear });
  }
  // March: year-end review.
  if (m === 3 || (m === 4 && d <= 5)) add('yearend', 'Your year-end tax check', `The ${y.label} tax year ends on 5 April. See below for what could save you tax before then.`, { due: `${start + 1}-04-05`, kind: 'review' });
  return out;
}

/* ---------- year-end review: what could save tax, and how much ---------- */
/**
 * Suggestions with the pounds each would save, from the engine. ctx: {save: (personChange) => pounds, unclaimed, isaUsed, married, giftAidThisYear, cash}.
 * ctx.save runs the whole year again with the change, so the answer includes student loan and every band.
 */
export function yearEndReview(person, due, ctx) {
  const y = yearData(due.year);
  const out = [];
  const add = (id, title, text, saves, o = {}) => out.push({ id, title, text, saves: r2(Math.max(0, saves)), ...o });
  const t = due.trade;
  if (ctx.unclaimed > 0.5 && t.income > 0 && !t.allowanceUsed) add('unclaimed', `Claim your ${gbp0(ctx.unclaimed)} of possible work costs`, 'The expense finder has found these. Tick the ones that were for your work.', ctx.save({ addCost: ctx.unclaimed }), { go: 'expenses' });
  // Pension top-up: a sum that fits the higher band, or 1,000 pounds.
  const higherSlice = Math.max(0, due.taxParts.taxable - y.bands.ruk[0][0]);
  const topUp = higherSlice > 0 ? Math.min(higherSlice, 5000) : 1000;
  add('pension', `A ${gbp0(topUp)} pension top-up`, `Paying ${gbp0(topUp * 0.8)} into a personal pension becomes ${gbp0(topUp)} with basic-rate relief.${due.adjustedNet > y.taperFrom ? ' Over £100,000 it also gives back some of your tax-free amount.' : ''} The amount shown includes that relief.`, ctx.save({ pensionPaid: topUp * 0.8 }) + topUp * 0.2, { note: 'Money in a pension is locked away until later life.' });
  const giftGross = due.taxParts.taxable > y.bands.ruk[0][0] ? 100 : 0;
  if (giftGross) add('giftaid', 'Gift Aid on what you give to charity', `Every £80 you give with Gift Aid becomes £100 for the charity, and as a higher-rate payer you claim more back on your return.`, ctx.save({ giftAid: 80 }));
  if (ctx.married !== false && couldGetMarriage(person, due, y)) add('marriage', 'Marriage Allowance', `If you are married or in a civil partnership and your partner earns under ${gbp0(y.allowance)}, they can give you ${gbp0(y.marriage)} of their tax-free amount.`, y.marriage * y.marriageRate, { note: 'It can be backdated up to 4 years.' });
  const isaLeft = Math.max(0, y.isa - num(ctx.isaUsed));
  if (isaLeft > 0 && num(person.interest) > 0) add('isa', `Use your ${gbp0(isaLeft)} ISA allowance`, `An ISA is a tax-free savings account. Moving savings in now keeps next year's interest free of tax. The allowance does not carry over after 5 April.`, due.taxParts.savings, { note: 'The saving shown is this year\'s tax on your savings interest.' });
  return out.filter(x => x.saves > 0.5 || x.id === 'isa').sort((a, b) => b.saves - a.saves);
}

/* ---------- what Freeflo does not work out ---------- */
// Benefits with no income tax on them ([ben]): a name like these needs no warning. Anything else called a benefit might be taxable.
const UNTAXED_BENEFIT = /universal credit|personal independence|\bpip\b|child benefit|housing benefit|attendance allowance|disability living|\bdla\b|pension credit|income support|winter fuel|maternity allowance/i;
const PROPERTY_SOLD = /\b(house|home|flat|apartment|bungalow|cottage|property|buy.to.let|btl|maisonette)\b/i;
/**
 * One sentence each: what it is, that Freeflo does not work it out, and who to ask. Only when the person's own answers suggest it applies.
 * ctx: {items: the plan's items (their names and kinds say most of this), gainRows: the Tax tab's sales, when there are any}. each: uncovered: true.
 */
export function notCovered(person, due, ctx = {}) {
  const y = yearData(due.year);
  const out = [];
  const add = (id, text) => out.push({ id, text, uncovered: true });
  const items = (ctx.items || []).filter(i => i && i.kind === 'income' && i.status !== 'no' && !i.paused);
  const named = (re, types) => items.filter(i => types.includes(i.incomeType) && re.test(String(i.name || '')));
  const t = due.trade;
  if (named(/lodger|\broom\b|flatmate/i, ['rental', 'side', 'other']).length) add('rentroom', `Rent from a lodger in your own home can have up to £7,500 a year free of tax (Rent a Room), and Freeflo does not work that out, so the tax here may be too high: ask HMRC or an accountant.`);
  const smallPay = num(person.dividends) > 0 && (person.jobs || []).some(j => num(j.annual) > 0 && num(j.annual) <= y.allowance);
  if (named(/\bdirector\b/i, ['job']).length || smallPay) add('director', `If you are a director of your own company, your National Insurance is worked out over the whole year rather than each payday, and Freeflo does not do that: ask HMRC or an accountant.`);
  if (t.profit > y.class4.from && items.some(i => /state pension/i.test(String(i.name || '')))) add('class4', `If you had reached State Pension age before this tax year started, you do not pay National Insurance on your profit, but Freeflo still adds it: ask HMRC or an accountant.`);
  if (items.some(i => i.incomeType === 'benefit' && !UNTAXED_BENEFIT.test(String(i.name || '')))) add('benefits', `Some benefits are taxed, such as Carer's Allowance, contribution-based Jobseeker's Allowance and the State Pension, and Freeflo does not count them as income: ask HMRC if yours is one of them.`);
  if (named(/pension/i, ['side', 'other']).length) add('pension-income', `A pension you are paid is often taxed through its own tax code, and Freeflo does not work that out: check your pension payslip, or ask HMRC.`);
  // Gift Aid: the charity claims basic-rate tax back, so you must have paid at least that much tax yourself [gift].
  if (num(person.giftAid) * y.giftAid > num(due.tax) + num(due.cgt) + 0.5) add('giftaid-short', `You gave more through Gift Aid than the tax you pay covers, so HMRC can ask you to pay the difference, and Freeflo does not work that out: ask HMRC or an accountant.`);
  // Tax relief stops at what you earned, or 3,600 pounds if that is more [penr].
  if (num(due.pensionGross) > Math.max(num(due.loan && due.loan.earned), 3600)) add('pension-cap', `You paid more into a pension than you earned this year, and tax relief stops at your earnings (or £3,600 if that is more), but Freeflo does not apply that limit: ask a pension adviser or an accountant.`);
  if (num(due.cgt) > 0) add('cgt-reliefs', `Freeflo does not work out Capital Gains Tax reliefs, such as for your own home or for selling a business, so the tax here may be too high: ask HMRC or an accountant.`);
  const rows = (ctx.gainRows || []).filter(g => g && !g.isa);
  const gainOf = (g) => num(g.proceeds) - num(g.cost);
  if (rows.some(g => gainOf(g) > 0 && PROPERTY_SOLD.test(String(g.what || '')))) add('cgt-60', `If you sold a home or other property in the UK and there is tax to pay, you must report and pay it within 60 days of completion, and Freeflo does not do that or remind you: use the GOV.UK service, or ask an accountant.`);
  if (rows.length && rows.reduce((a, g) => a + gainOf(g), 0) < -0.5) add('cgt-loss', `Your sales made a loss overall this year, which you can usually carry to later years if you tell HMRC, and Freeflo does not carry it for you: ask HMRC or an accountant.`);
  if (t.loss > 0) add('loss', `Your costs are ${gbp0(t.loss)} more than your self-employed income this year, and Freeflo does not carry that loss to other years or set it against your other income: on a tax return you can usually claim it, so ask HMRC or an accountant.`);
  return out;
}

/* ---------- things people forget ---------- */
/** Short notes, only when they apply. ctx: {today, turnover, gains, gainsIsa, isaUsed, lisaUsed, childBenefit, employerClient, hasEmi, pensionIn, married}. */
export function notesFor(person, due, ctx = {}) {
  const y = yearData(due.year);
  const out = [];
  const add = (id, text) => out.push({ id, text });
  const t = due.trade;
  for (const n of notCovered(person, due, ctx)) out.push(n);
  if (t.connected) add('employer', 'A client who is also your employer: the tax rules can treat that work as employment. HMRC has an online employment status check if you want to look.');
  const qualifying = t.income + num(person.rental);
  if (qualifying > 0) {
    if (qualifying > 50000) add('mtd', `Making Tax Digital: with self-employment and property income over £50,000, you keep digital records and send updates every 3 months from 6 April 2026.`);
    else if (qualifying > 30000) add('mtd', `Making Tax Digital: with self-employment and property income over £30,000 on your 2025 to 2026 return, you keep digital records and send updates every 3 months from 6 April 2027.`);
    else if (qualifying > 20000) add('mtd', `Making Tax Digital: with self-employment and property income over £20,000 on your 2026 to 2027 return, you keep digital records and send updates every 3 months from 6 April 2028.`);
  }
  if (num(ctx.isaUsed) > 0) add('isa', `ISA: you have used ${gbp0(ctx.isaUsed)} of the ${gbp0(y.isa)} allowance this year.`);
  if (num(ctx.lisaUsed) > 0) add('lisa', `Lifetime ISA: up to ${gbp0(y.lisa.limit)} a year earns a ${Math.round(y.lisa.bonus * 100)}% bonus, and it counts towards your ISA allowance. You used ${gbp0(ctx.lisaUsed)}.`);
  if (num(ctx.gains) > 0) add('cgt', `Capital gains: the first ${gbp0(y.cgt.allowance)} of gains is tax-free. Above that it is ${Math.round(y.cgt.basic * 100)}% or ${Math.round(y.cgt.higher * 100)}%. This counts for crypto and shares; gains inside an ISA are exempt.`);
  if (num(person.interest) > 0) add('savings', `Savings: the first £1,000 of interest is tax-free for basic-rate payers, £500 for higher-rate payers, and nothing for additional-rate payers. ISA interest does not count.`);
  if (num(person.dividends) > 0) add('dividends', `Dividends: the first ${gbp0(y.dividends.allowance)} is tax-free.`);
  if (num(person.giftAid) > 0) add('giftaid', 'Gift Aid: your donations go on your return. If you pay higher-rate tax you get more back; the engine has already counted it.');
  if (couldGetMarriage(person, due, y)) add('marriage', `Marriage Allowance: if you are married or in a civil partnership and your partner earns under ${gbp0(y.allowance)}, they can give you ${gbp0(y.marriage)} of their tax-free amount, saving up to ${gbp0(y.marriage * y.marriageRate)} a year.`);
  if (num(ctx.pensionIn) > y.pension.annualAllowance) add('pension', `Pension: more than ${gbp0(y.pension.annualAllowance)} went in this year, the usual annual limit.`);
  if (due.adjustedNet > y.hicbc.from && !num(person.childBenefit)) add('hicbc', `Child Benefit: if you or your partner get it, income over ${gbp0(y.hicbc.from)} means a charge. Tell Freeflo the amount and it is added.`);
  if (ctx.hasEmi) add('emi', 'Share options at work: keep your option agreement and any letters. They are needed when you exercise or sell.');
  if (person.jobs && person.jobs.length) add('forms', 'Keep each P60 (by 31 May) and any P45 from a job you left. Your return uses them.');
  return out;
}

/* ---------- a payslip against what we expected ---------- */
const close = (a, b, tol) => Math.abs(num(a) - num(b)) <= tol;
/**
 * slip: {gross, tax, ni, plan, pg, pension, net, code}. expected: the engine's period {gross, tax, ni, plan, pg, pensionFromPay, takeHome}.
 * ctx: {loans: [...], pensionExpected, codeExpected, bankCredit, jobName}. Returns plain lines: level warn | info | good.
 */
export function payslipIssues(slip, expected, ctx = {}) {
  const out = [];
  const add = (level, text) => out.push({ level, text });
  const name = ctx.jobName || 'this job';
  if (slip.code && ctx.codeExpected && String(slip.code).toUpperCase() !== String(ctx.codeExpected).toUpperCase()) {
    const c = parseTaxCode(slip.code, ctx.region);
    if (c.kind === 'invalid') add('warn', `The code on the payslip, ${slip.code}, does not look like a tax code.`);
    else if (c.emergency) add('warn', `${slip.code} on this payslip is an emergency code: it often means too much tax for a while.`);
    else add('info', `The tax code on the payslip is ${slip.code}, and Freeflo had ${ctx.codeExpected}. Freeflo will use the payslip's.`);
  }
  if (expected) {
    if (num(slip.gross) > 0 && !close(slip.gross, expected.gross, Math.max(5, num(expected.gross) * 0.02))) add('info', `Pay before tax was ${gbp0(slip.gross)}; we expected about ${gbp0(expected.gross)}.`);
    if (!close(slip.tax, expected.tax, Math.max(5, num(expected.tax) * 0.05))) add(num(slip.tax) > num(expected.tax) ? 'warn' : 'info', `Tax was ${gbp0(slip.tax)}; we expected about ${gbp0(expected.tax)}. ${num(slip.tax) > num(expected.tax) ? 'Worth checking the tax code.' : ''}`.trim());
    if (num(expected.pensionFromPay) > 1 && !num(slip.pension)) add('warn', 'No pension was taken, and you told Freeflo to expect it. It may not have started yet.');
  }
  const loans = ctx.loans || [];
  if (loans.length && expected && num(expected.plan) + num(expected.pg) > 0 && !num(slip.plan) && !num(slip.pg)) add('warn', `No student loan was taken on ${name}, and Freeflo expected some. If your employer has not been told about your loan, you pay it through your tax return instead.`);
  if (num(ctx.bankCredit) > 0 && num(slip.net) > 0 && !close(ctx.bankCredit, slip.net, 1)) add('warn', `The payslip says ${gbp0(slip.net)} after deductions, but your bank shows ${gbp0(ctx.bankCredit)} arriving.`);
  if (!out.length) add('good', 'This payslip matches what we expected.');
  return out;
}

/* ---------- life changes and job checklists ---------- */
/** Prompts from the plan's own dates: a move, a job starting or ending, a yearly bill coming up. items: plan items; nextOf(item): its next date. */
export function lifePrompts(items, today, nextOf) {
  const out = [];
  const days = (iso) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 864e5);
  for (const i of items || []) {
    if (i.status === 'no') continue;
    if ((i.type === 'rent' || i.type === 'mortgage') && i.starts && days(i.starts) >= 0 && days(i.starts) <= 60) out.push({ id: `move:${i.starts}`, title: 'You are moving: who to tell', text: CHECKLISTS.move.items.join(', ') + '.', due: i.starts, kind: 'life' });
    if (i.kind === 'income' && i.incomeType === 'job') {
      if (i.starts && days(i.starts) >= 0 && days(i.starts) <= 30) out.push({ id: `jobstart:${i.id}:${i.starts}`, title: `Starting at ${i.name || 'your new job'}`, text: CHECKLISTS.jobstart.items.join('. ') + '.', due: i.starts, kind: 'life' });
      if (i.ends && days(i.ends) >= 0 && days(i.ends) <= 30) out.push({ id: `jobleave:${i.id}:${i.ends}`, title: `Leaving ${i.name || 'your job'}`, text: CHECKLISTS.jobleave.items.join('. ') + '.', due: i.ends, kind: 'life' });
    }
    if (i.kind === 'fund' && i.when && nextOf) {
      const n = nextOf(i);
      if (n && days(n) >= 0 && days(n) <= 30) out.push({ id: `renew:${i.id}:${n}`, title: `${i.name || 'A yearly bill'} comes up on ${n.slice(8, 10)}/${n.slice(5, 7)}`, text: 'Worth comparing prices before it renews.', due: n, kind: 'life' });
    }
  }
  return out;
}
export const CHECKLISTS = Object.freeze({
  move: { title: 'You are moving: who to tell', items: ['Your employer', 'HMRC (sign in on GOV.UK)', 'The Student Loans Company', 'Your bank', 'Your council, for council tax'] },
  jobstart: { title: 'Starting a new job', items: ['Give your employer your P45 from the last job, or fill in their new starter checklist', 'Check the tax code on your first payslip', 'Tell your employer about your student loan plan', 'Check that your pension has started when you expect it'] },
  jobleave: { title: 'Leaving a job', items: ['Get your P45 and keep it', 'Check your final payslip, including holiday pay', 'Tell Freeflo the last day, so the sums stop there', 'Give the P45 to your next employer'] },
});
