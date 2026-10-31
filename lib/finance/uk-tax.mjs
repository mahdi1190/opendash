// lib/finance/uk-tax.mjs - UK take-home pay and the year's tax position: an estimate, worked the way PAYE works it.
// Pure: no I/O, no clock.
//
// Adding a tax year = one entry in TAX_YEARS. Every figure below was read from GOV.UK on 30 Oct 2026:
//   [emp]  https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
//          https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026
//          (PAYE bands incl. Scotland, Class 1 NI, student and postgraduate loan thresholds and rates)
//   [rate] https://www.gov.uk/income-tax-rates                         (allowance, UK bands, the £100,000 taper)
//   [sco]  https://www.gov.uk/scottish-income-tax                      (Scottish bands as whole-income figures)
//   [itr]  https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past
//          (Blind Person's Allowance, dividends, starting rate for savings)
//   [mar]  https://www.gov.uk/marriage-allowance                       (£1,260; the page carries no year)
//   [slr]  https://www.gov.uk/guidance/special-rules-for-student-loans (NI-able pay is the base; whole pounds)
//   [rep]  https://www.gov.uk/repaying-your-student-loan/what-you-pay  (several plans at once)
//   [pen]  https://www.gov.uk/government/publications/rates-and-allowances-pension-schemes/pension-schemes-rates
//   [cl4]  https://www.gov.uk/self-employed-national-insurance-rates   (Class 4)
//   [psa]  https://www.gov.uk/apply-tax-free-interest-on-savings/how-much-is-tax-free
//   [tpa]  https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income
//   [cod]  https://www.gov.uk/tax-codes/what-your-tax-code-means       (code letters, Scottish flat codes)
//   [lim]  https://www.gov.uk/hmrc-internal-manuals/paye-manual/paye11095 and the PAYE Regulations 2003 (the 50% limit, on every code)
//   [cwg2] https://www.gov.uk/government/publications/cwg2-further-guide-to-paye-and-national-insurance-contributions (pay after a P45: code 0T, on its own)
//   [s25]  https://www.legislation.gov.uk/ukpga/2007/3/section/25 (allowances come off in the way that leaves the least tax)
//   [nic]  https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions (Class 2, Class 4)
//   [cslm] https://www.gov.uk/hmrc-internal-manuals/collection-of-student-loans-manual/cslm10114 ("rounded down to the nearest whole pound")
//   [une]  https://www.legislation.gov.uk/uksi/2009/470/part/3 reg 29(4)(c), 29(5); https://www.gov.uk/hmrc-internal-manuals/collection-of-student-loans-manual/cslm16035
//          (unearned income counts in full only when it is over 2,000 pounds; the first 2,000 is not exempt)
//   [poa]  https://www.gov.uk/understand-self-assessment-bill/payments-on-account; https://www.gov.uk/hmrc-internal-manuals/self-assessment-legal-framework/salf303
//          (under 1,000 pounds owed, or over 80% met at source: none. Half each. Class 4 counts; Capital Gains Tax and student loans do not)
//   [mil]  https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles (55p from 6 April 2026, 45p before)
//   [wfh]  https://www.gov.uk/simpler-income-tax-simplified-expenses/working-from-home
//   [aia]  https://www.gov.uk/capital-allowances/annual-investment-allowance
//   [cgt]  https://www.gov.uk/capital-gains-tax/allowances, https://www.gov.uk/capital-gains-tax/rates
//   [cb]   https://www.gov.uk/child-benefit-tax-charge
//   [isa]  https://www.gov.uk/individual-savings-accounts, https://www.gov.uk/lifetime-isa
//   [mtd]  https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax
//
//   A year not in the table: yearData(id) answers with the nearest year's figures under the right dates, estimated: true.
//   paymentsOnAccount(due, coll)    the 1,000 pound and 80% tests, each payment, in plain words
//   saBill(position, o)             the balancing payment, January and July
//   howWorkedOut(person, today)     every line of the sum, for the Tax tab and the assistant
//   claimSaving(person, cost)       what a cost saves in tax, Class 4 and student loan; keepOf(person, amount): what to keep of a payment
//   tradeCompare(person)            the trading allowance against actual costs, and why
//   parseTaxCode(code, region)      {kind: 'allowance'|'zero'|'k'|'flat'|'none'|'invalid', amount?, cumulative, emergency, label}
//   workedOutCode(person, job?)     the code you would normally expect, as text
//   jobRun(job, person)             PAYE for one job, period by period, cumulative
//   annualEstimate(person, today?)  every job + other income, the plain totals (a year, a month, a payslip)
//   wholeYearLiability(person)      income tax, Class 4 and student loan due on ALL income
//   collectedThroughPayroll(person, today?)   what the payrolls take: so far, and by the end of the year
//   yearPosition(person, today?)    due against collected, and the difference (still to pay, or a refund)
//   soFarThisYear(person, today)    pay, allowance used, tax paid up to today
//   codeWarnings(person, job)       a calm note when a code looks wrong
//   taxYearOf(iso), yearData(id)    which year a date is in; its figures
//
// person = { year?: '2026-27', region: 'ruk'|'scotland', loans?: ['plan2','pg'], blind?, marriage?: 'none'|'give'|'get', bik?: 0 (a year),
//   jobs: [job], self?: [{from, to, amount, expenses?, capital?, connected?}] (no tax taken), side?, rental?, otherTaxable?, interest?, dividends? (a year),
//   tradeChoice?: 'auto'|'allowance'|'actual', noTradingAllowance?, childBenefit?, gains? (the Tax tab: a year),
//   giftAid?, pensionPaid? (what you paid yourself, before basic-rate relief is added), claimRas? (relief-at-source pensions counted as claimed on a return) }
// job = { id?, name?, main?, freq: 'monthly'|'fourweekly'|'fortnightly'|'weekly', annual, hoursPct?, bonus?, bonusAt? (0-based period),
//   overtime? (a payslip), changes?: [{from: iso, annual}], start?: iso, end?: iso, taxCode?, prevPay?, prevTax? (a P45 from this tax year),
//   ytd?: {asOf: iso, pay, taxablePay?, tax, ni, plan, pg} (from a payslip: replaces our own figures up to that date),
//   pension?: {type: 'sacrifice'|'netpay'|'ras'|'none', pct?, amount? (a payslip), employerPct?, employerAmount?},
//   sacrifice? (a month: cycle, car), payDates?: [iso, ...] one per period }
// The main job (job.main, else the first) gets the worked-out code when it has none; any other job with none gets BR.

const INF = Infinity;
// The same in every year below; a year that differs says so in its own entry.
const SHARED = Object.freeze({
  loanUnearned: 2000,                                         // [une]
  poa: Object.freeze({ under: 1000, metShare: 0.8 }),         // [poa]
  trading: 1000, property: 1000,                              // [tpa]
  wfh: Object.freeze([[25, 10], [51, 18], [101, 26]]),        // [wfh] hours a month from, pounds a month
  aia: 1000000,                                               // [aia]
  cgt: Object.freeze({ allowance: 3000, basic: 0.18, higher: 0.24 }),   // [cgt]
  hicbc: Object.freeze({ from: 60000, to: 80000, per: 200 }), // [cb]
  isa: 20000, lisa: Object.freeze({ limit: 4000, bonus: 0.25, firstBefore: 40, stopsAt: 50 }),   // [isa]
  giftAid: 0.25,
  overridingLimit: 0.5,                                       // [lim]
  reliefAtSource: 0.2,
  savings: Object.freeze({ startBand: 5000, psa: Object.freeze({ basic: 1000, higher: 500, additional: 0 }) }),   // [itr] [psa]
  pension: Object.freeze({ qualifyingFrom: 6240, qualifyingTo: 50270, annualAllowance: 60000, mpaa: 10000, taperThreshold: 200000, taperAdjusted: 260000, lumpSum: 268275, lumpSumDeath: 1073100 }),   // [pen]
});
export const TAX_YEARS = Object.freeze({
  '2025-26': Object.freeze({
    ...SHARED, id: '2025-26', label: '2025 to 2026', start: '2025-04-06', end: '2026-04-05',
    allowance: 12570, taperFrom: 100000,                       // [rate]
    blind: 3130, marriage: 1260, marriageRate: 0.2,            // [itr] [mar]
    bands: {
      ruk: [[37700, 0.2, 'basic'], [125140, 0.4, 'higher'], [INF, 0.45, 'additional']],   // [emp]
      scotland: [[2827, 0.19, 'starter'], [14921, 0.2, 'basic'], [31092, 0.21, 'intermediate'], [62430, 0.42, 'higher'], [125140, 0.45, 'advanced'], [INF, 0.48, 'top']],   // [emp]
    },
    flat: { ruk: { BR: 0.2, D0: 0.4, D1: 0.45 }, scotland: { BR: 0.2, D0: 0.21, D1: 0.42, D2: 0.45, D3: 0.48 } },   // [cod]
    ni: { monthly: { pt: 1048, uel: 4189 }, weekly: { pt: 242, uel: 967 }, annual: { pt: 12570, uel: 50270 }, main: 0.08, upper: 0.02 },   // [emp]
    class4: { from: 12570, to: 50270, main: 0.06, upper: 0.02 },   // [nic]
    class2: { week: 3.5, spt: 6845 },                          // [nic]
    loans: {   // [emp]; Plan 5 repayments start in April 2026, so that plan is not in this year
      plan1: { name: 'Plan 1', annual: 26065, monthly: 2172.08, weekly: 501.25, rate: 0.09 },
      plan2: { name: 'Plan 2', annual: 28470, monthly: 2372.5, weekly: 547.5, rate: 0.09 },
      plan4: { name: 'Plan 4', annual: 32745, monthly: 2728.75, weekly: 629.71, rate: 0.09 },
      pg: { name: 'Postgraduate', annual: 21000, monthly: 1750, weekly: 403.84, rate: 0.06 },
    },
    dividends: { allowance: 500, basic: 0.0875, higher: 0.3375, additional: 0.3935 },   // [itr]
    mileage: { first: 0.45, firstMiles: 10000, after: 0.25, motorcycle: 0.24 },   // [mil]
  }),
  '2026-27': Object.freeze({
    ...SHARED, id: '2026-27', label: '2026 to 2027', start: '2026-04-06', end: '2027-04-05',
    allowance: 12570, taperFrom: 100000,                       // [rate]
    blind: 3250, marriage: 1260, marriageRate: 0.2,            // [itr] [mar]
    bands: {   // upper limits of TAXABLE income (after the allowance), cumulative
      ruk: [[37700, 0.2, 'basic'], [125140, 0.4, 'higher'], [INF, 0.45, 'additional']],   // [emp] (England, NI, Wales)
      scotland: [[3967, 0.19, 'starter'], [16956, 0.2, 'basic'], [31092, 0.21, 'intermediate'], [62430, 0.42, 'higher'], [125140, 0.45, 'advanced'], [INF, 0.48, 'top']],   // [emp], same as [sco]
    },
    flat: { ruk: { BR: 0.2, D0: 0.4, D1: 0.45 }, scotland: { BR: 0.2, D0: 0.21, D1: 0.42, D2: 0.45, D3: 0.48 } },   // [cod]
    ni: {   // [emp] category A
      monthly: { pt: 1048, uel: 4189 }, weekly: { pt: 242, uel: 967 }, annual: { pt: 12570, uel: 50270 }, main: 0.08, upper: 0.02,
    },
    class4: { from: 12570, to: 50270, main: 0.06, upper: 0.02 },   // [cl4] [nic]
    class2: { week: 3.65, spt: 7105 },                         // [nic] [cl4]
    loans: {   // [emp]; plans 1, 2, 4, 5 share one 9% deduction over the lowest threshold, the postgraduate loan is on top [rep]
      plan1: { name: 'Plan 1', annual: 26900, monthly: 2241.66, weekly: 517.30, rate: 0.09 },
      plan2: { name: 'Plan 2', annual: 29385, monthly: 2448.75, weekly: 565.09, rate: 0.09 },
      plan4: { name: 'Plan 4', annual: 33795, monthly: 2816.25, weekly: 649.90, rate: 0.09 },
      plan5: { name: 'Plan 5', annual: 25000, monthly: 2083.33, weekly: 480.76, rate: 0.09 },
      pg: { name: 'Postgraduate', annual: 21000, monthly: 1750, weekly: 403.84, rate: 0.06 },
    },
    dividends: { allowance: 500, basic: 0.1075, higher: 0.3575, additional: 0.3935 },   // [itr]
    mileage: { first: 0.55, firstMiles: 10000, after: 0.25, motorcycle: 0.24 },   // [mil]
  }),
});
const YEAR_IDS = Object.keys(TAX_YEARS).sort();
export const LATEST_YEAR = YEAR_IDS[YEAR_IDS.length - 1];
const YEAR_ID = /^(\d{4})-(\d{2})$/;
const estimated = new Map();
/** A year's figures. A year not in the table: its own dates, the nearest year's figures, estimated: true (so the next one just works). */
export function yearData(id) {
  if (TAX_YEARS[id]) return TAX_YEARS[id];
  const m = YEAR_ID.exec(String(id || ''));
  if (!m) return TAX_YEARS[LATEST_YEAR];
  if (estimated.has(id)) return estimated.get(id);
  const near = id < YEAR_IDS[0] ? TAX_YEARS[YEAR_IDS[0]] : TAX_YEARS[LATEST_YEAR];
  const a = Number(m[1]);
  const out = Object.freeze({ ...near, id, label: `${a} to ${a + 1}`, start: `${a}-04-06`, end: `${a + 1}-04-05`, estimated: true, figuresFrom: near.id });
  estimated.set(id, out);
  return out;
}
/** The tax year a date falls in. exact: false when its figures are not in Freeflo yet (yearData gives the nearest year's). */
export function taxYearOf(iso) {
  const s = String(iso || '').slice(0, 10);
  const a = Number(s.slice(0, 4)) || Number(LATEST_YEAR.slice(0, 4));
  const first = s.slice(5) >= '04-06' ? a : a - 1;
  const id = `${first}-${String((first + 1) % 100).padStart(2, '0')}`;
  return { id, exact: !!TAX_YEARS[id] };
}

export const FREQS = Object.freeze({ monthly: { n: 12, label: 'month', weeks: 0 }, fourweekly: { n: 13, label: 'four weeks', weeks: 4 }, fortnightly: { n: 26, label: 'fortnight', weeks: 2 }, weekly: { n: 52, label: 'week', weeks: 1 } });
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const pos = (x) => Math.max(0, num(x));
const r2 = (x) => Math.round(x * 100) / 100;
const floor2 = (x) => Math.floor(x * 100 + 1e-7) / 100;
const gbp0 = (x) => '£' + Math.round(x).toLocaleString('en-GB');

/* ---------- tax codes ---------- */
export function parseTaxCode(code, region = 'ruk') {
  let s = String(code || '').toUpperCase().replace(/\s+/g, '');
  let reg = region;
  const emergency = /(W1|M1|X)$/.test(s) || /NONCUM$/.test(s);
  s = s.replace(/(W1|M1|X|NONCUM)$/, '');
  if (/^S/.test(s)) { reg = 'scotland'; s = s.slice(1); } else if (/^C/.test(s)) { reg = 'ruk'; s = s.slice(1); }
  const out = (o) => ({ region: reg, cumulative: !emergency, emergency, text: String(code || '').toUpperCase().trim(), ...o });
  if (s === 'NT') return out({ kind: 'none', cumulative: false, label: 'No tax taken from this pay' });
  if (s === '0T') return out({ kind: 'zero', amount: 0, label: 'No tax-free amount: all of this pay is taxed' });
  if (/^(BR|D[0-3])$/.test(s)) {
    const rate = TAX_YEARS[LATEST_YEAR].flat[reg === 'scotland' ? 'scotland' : 'ruk'][s];
    if (rate == null) return out({ kind: 'invalid', label: 'This code does not look right' });
    return out({ kind: 'flat', name: s, cumulative: false, label: `All of this pay is taxed at ${Math.round(rate * 100)}%` });
  }
  let m;
  if ((m = /^K(\d{1,5})$/.exec(s))) return out({ kind: 'k', amount: Number(m[1]) * 10 + 9, label: `${gbp0(Number(m[1]) * 10)} of untaxed income is added to your taxable pay` });
  if ((m = /^(\d{1,5})[LMNT]$/.exec(s))) return out({ kind: 'allowance', amount: Number(m[1]) * 10 + 9, label: `About ${gbp0(Number(m[1]) * 10)} of your pay each year is tax-free` });
  return out({ kind: 'invalid', label: 'This code does not look right' });
}

/* ---------- small sums ---------- */
function bandTax(taxable, bands, scale = 1) {
  let left = Math.max(0, taxable), low = 0, tax = 0;
  for (const [up, rate] of bands) {
    const lim = up === INF ? INF : up * scale;
    const part = Math.min(left, lim - low);
    if (part <= 0) break;
    tax += part * rate; left -= part; low = lim;
  }
  return tax;
}
const perPeriod = (table, freq) => (freq === 'monthly' ? table.monthly : table.weekly * FREQS[freq].weeks);
const niThresholds = (y, freq) => (freq === 'monthly' ? y.ni.monthly : { pt: y.ni.weekly.pt * FREQS[freq].weeks, uel: y.ni.weekly.uel * FREQS[freq].weeks });
function niFor(pay, y, freq) {
  const t = niThresholds(y, freq);
  return r2(Math.max(0, Math.min(pay, t.uel) - t.pt) * y.ni.main + Math.max(0, pay - t.uel) * y.ni.upper);
}
/** Whole pounds per period ([slr]); plans 1, 2, 4, 5 share one deduction over the lowest threshold, the postgraduate loan is separate ([rep]). */
function loansFor(pay, y, freq, loans) {
  const list = (loans || []).filter(k => y.loans[k]);
  const under = list.filter(k => k !== 'pg');
  let plan = 0, pg = 0;
  if (under.length) {
    const lowest = Math.min(...under.map(k => perPeriod(y.loans[k], freq)));
    plan = Math.floor(Math.max(0, pay - lowest) * y.loans[under[0]].rate + 1e-7);
  }
  if (list.includes('pg')) pg = Math.floor(Math.max(0, pay - perPeriod(y.loans.pg, freq)) * y.loans.pg.rate + 1e-7);
  return { plan, pg };
}
/** The tax-free amount the person typed from HMRC's coding notice (person.allowanceOverride), or null: then it is worked out. */
export function overrideOf(person) {
  const v = person && person.allowanceOverride;
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 1e7 ? n : null;
}
/** Work benefits taxed through the code: not counted in income when the person gives HMRC's own figure (it already allows for them). */
const bikOf = (person) => (overrideOf(person) != null ? 0 : pos(person.bik));
function allowanceFor(person, y, adjustedNet) {
  const ov = overrideOf(person);
  if (ov != null) return ov;
  let a = y.allowance;
  if (adjustedNet > y.taperFrom) a = Math.max(0, a - Math.floor((adjustedNet - y.taperFrom) / 2));
  if (person.blind) a += y.blind;
  if (person.marriage === 'give') a -= y.marriage;
  return a;
}
/** Marriage Allowance only reaches someone who pays no tax above the basic rate; in Scotland, above the intermediate rate on pay and the like [mar]. */
function getsMarriage(person, y, yf) {
  if (person.marriage !== 'get') return false;
  const a = Math.max(0, allowanceFor(person, y, yf.adjustedNet)), ext = yf.extend || 0;
  if (Math.max(0, yf.nonSavings + pos(person.interest) + pos(person.dividends) - a) > y.bands.ruk[0][0] + ext) return false;
  return person.region !== 'scotland' || Math.max(0, yf.nonSavings - a) <= y.bands.scotland.find(b => b[2] === 'intermediate')[0] + ext;
}
/** What the tax code is built from: the tax-free amount, less work benefits, plus Marriage Allowance received (or HMRC's own figure). */
function codeAllowance(person, y, yf) {
  const ov = overrideOf(person);
  if (ov != null) return ov;
  return allowanceFor(person, y, yf.adjustedNet) - pos(person.bik) + (getsMarriage(person, y, yf) ? y.marriage : 0);
}
/** The tax-free amount piece by piece, for the Tax tab: what makes it up, and what it would be without the person's own figure. */
export function allowanceParts(person0) {
  const person = normPerson(person0); const y = yearData(person.year);
  const yf = yearlyFigures(person);
  const ov = overrideOf(person);
  const worked = allowanceFor({ ...person, allowanceOverride: undefined }, y, yf.adjustedNet);
  const taper = yf.adjustedNet > y.taperFrom ? Math.min(y.allowance, Math.floor((yf.adjustedNet - y.taperFrom) / 2)) : 0;
  const give = person.marriage === 'give' ? y.marriage : 0;
  return { year: y.id, total: ov != null ? ov : worked, workedOut: worked, override: ov, standard: y.allowance, taper, blind: !!person.blind, blindAmount: y.blind, marriage: person.marriage === 'get' && !getsMarriage(person, y, yf) ? 'none' : person.marriage || 'none', marriageAmount: y.marriage, give, bik: pos(person.bik), taperFrom: y.taperFrom,
    code: workedOutCode({ ...person, allowanceOverride: undefined }) };
}
function normPerson(p0) {
  const p = p0 || {};
  const year = p.year && YEAR_ID.test(p.year) ? p.year : LATEST_YEAR;
  const jobs = (Array.isArray(p.jobs) ? p.jobs : []).map((j, i) => ({ ...j, id: j.id || 'job' + i, freq: FREQS[j.freq] ? j.freq : 'monthly' }));
  if (jobs.length && !jobs.some(j => j.main)) jobs[0] = { ...jobs[0], main: true };
  return { ...p, year, region: p.region === 'scotland' ? 'scotland' : 'ruk', jobs, self: Array.isArray(p.self) ? p.self : [] };
}
const isoN = (iso) => Math.round(Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z') / 864e5);
const nIso = (n) => new Date(n * 864e5).toISOString().slice(0, 10);   // clock-ok: a day number to its date
function periodSpan(y, freq, i) {
  if (freq === 'monthly') {
    const yy = +y.start.slice(0, 4), mm = +y.start.slice(5, 7) - 1;
    return [Math.round(Date.UTC(yy, mm + i, 6) / 864e5), Math.round(Date.UTC(yy, mm + i + 1, 5) / 864e5)];
  }
  const w = FREQS[freq].weeks * 7, s = isoN(y.start);
  return [s + w * i, s + w * (i + 1) - 1];
}
/** The period (index) whose span holds this day number, or -1 (a day outside the tax year). 52 weeks stop a day or two short of 5 April: those days join the last period. */
function periodOf(y, freq, n, day) {
  for (let i = 0; i < n; i++) { const [a, b] = periodSpan(y, freq, i); if (day >= a && day <= b) return i; }
  return day >= isoN(y.start) && day <= isoN(y.end) ? n - 1 : -1;
}
/**
 * How many periods a payslip's year-to-date already holds. A payslip is dated on its own payday, so with no payday known the
 * period it falls in is inside. With paydays known, those up to its date are inside; a payday just after its date (paid early,
 * or the usual date is a little out) is inside too when the pay so far shows it. Exact payments listed say for themselves what is still to come.
 */
function ytdPeriods(job, person, spans, when, exact) {
  const asOf = job.ytd.asOf, n = spans.length;
  if (exact) { const i = spans.findIndex((sp, k) => when(k, nIso(sp[1])) > asOf); return i < 0 ? n : i; }
  let cut = 0;
  while (cut < n && (when(cut, null) ? when(cut, null) <= asOf : nIso(spans[cut][0]) <= asOf)) cut++;
  const next = cut < n ? when(cut, null) : null;
  if (next && job.ytd.pay != null && isoN(next) - isoN(asOf) <= (FREQS[job.freq].weeks && FREQS[job.freq].weeks < 4 ? 1 : 7)) {
    const plain = jobPay({ ...job, ytd: null, payments: null }, person);
    const upTo = (c) => plain.slice(0, c).reduce((t, p) => t + p.gross, 0);
    if (Math.abs(pos(job.ytd.pay) - upTo(cut + 1)) < Math.abs(pos(job.ytd.pay) - upTo(cut))) cut++;
  }
  return cut;
}
/**
 * One job's pay, period by period, before tax (tax needs the code, the code needs everybody's pay).
 * job.payments [{date, amount}]: exact pay before tax on exact dates. From the pay-so-far date (job.ytd.asOf; without one, from the
 * first listed payment) they replace the yearly pay: a period with none pays nothing. For last payments, or pay that changes each time.
 * job.bonusOn: the date a bonus is paid (else job.bonusAt, a month number). job.pension: {type, pct, amount, base: 'full'|'qualifying', starts}.
 */
function jobPay(job, person) {
  const y = yearData(person.year); const { n } = FREQS[job.freq];
  const hrs = job.hoursPct != null && num(job.hoursPct) > 0 ? num(job.hoursPct) / 100 : 1;
  const pen = job.pension || {};
  const rasIsSum = pen.type === 'ras' && num(pen.amount) > 0;
  const startN = job.start ? isoN(job.start) : -INF, endN = job.end ? isoN(job.end) : INF;
  const changes = (Array.isArray(job.changes) ? job.changes : []).filter(c => c && c.from).map(c => ({ n: isoN(c.from), annual: pos(c.annual) })).sort((a, b) => a.n - b.n);
  const when = (i, to) => (Array.isArray(job.payDates) ? job.payDates[i] || null : null) || to;
  const spans = []; for (let i = 0; i < n; i++) spans.push(periodSpan(y, job.freq, i));
  // Exact payments: which period each lands in, from where they take over.
  const listed = (Array.isArray(job.payments) ? job.payments : []).filter(p => p && p.date && pos(p.amount) > 0).map(p => ({ n: isoN(p.date), date: String(p.date).slice(0, 10), amount: pos(p.amount) })).filter(p => periodOf(y, job.freq, n, p.n) >= 0).sort((a, b) => a.n - b.n);
  const asOf = job.ytd && job.ytd.asOf ? job.ytd.asOf : null;
  const inYtd = asOf ? ytdPeriods(job, person, spans, when, listed.length > 0) : 0;
  let exactFrom = -1;
  if (listed.length) {
    if (asOf) exactFrom = inYtd;
    else { const first = listed.find(p => periodOf(y, job.freq, n, p.n) >= 0); exactFrom = first ? periodOf(y, job.freq, n, first.n) : -1; }
  }
  const exactPays = Array.from({ length: n }, () => []);
  if (exactFrom >= 0) for (const p of listed) {
    if (asOf && p.date <= asOf) continue;   // already inside the pay so far
    let i = periodOf(y, job.freq, n, p.n);
    if (i < 0) continue;
    if (i < exactFrom) i = exactFrom;
    if (i < n) exactPays[i].push(p);
  }
  const bonusDayIdx = job.bonusOn ? periodOf(y, job.freq, n, isoN(job.bonusOn)) : -1;
  const periods = [];
  let firstOn = -1;
  for (let i = 0; i < n; i++) {
    const [a, b] = spans[i];
    const exact = exactFrom >= 0 && i >= exactFrom;
    const hits = exactPays[i];
    const exactPay = hits.reduce((t, p) => t + p.amount, 0);
    const days = Math.max(0, Math.min(b, endN) - Math.max(a, startN) + 1), share = exact ? (exactPay > 0 ? 1 : 0) : days / (b - a + 1);
    let on = exact ? exactPay > 0 : days > 0;
    const bonusHere = pos(job.bonus) > 0 && (job.bonusOn ? i === bonusDayIdx : false);
    if (bonusHere) on = true;
    if (on && firstOn < 0) firstOn = i;
    if (!on && firstOn >= 0 && !job.bonusOn && pos(job.bonus) > 0 && i === Math.min(n - 1, Math.floor(num(job.bonusAt)))) on = true;   // a bonus paid after the last day
    let annual = pos(job.annual);
    for (const c of changes) if (c.n <= b) annual = c.annual;
    const basic = exact ? exactPay : on && !(bonusHere && days === 0) ? annual * hrs / n * share : 0;
    const bonus = bonusHere ? pos(job.bonus) : (!job.bonusOn && on && pos(job.bonus) > 0 && i === Math.min(n - 1, Math.max(firstOn, Math.floor(num(job.bonusAt)))) ? pos(job.bonus) : 0);
    const overtime = on && !exact ? pos(job.overtime) * share : 0;
    const gross = basic + bonus + overtime;
    const penOn = on && pen.type && pen.type !== 'none' && (!pen.starts || (hits.length ? hits[hits.length - 1].date : when(i, nIso(b))) >= pen.starts);   // from the first payday on or after the start date
    // Percentages are of all pay, or of qualifying earnings: the slice of the year's pay between the lower and upper limits [pen].
    const qual = (x) => Math.max(0, Math.min(x, y.pension.qualifyingTo / n) - y.pension.qualifyingFrom / n);
    const pensionBase = pen.base === 'qualifying' ? qual(gross) : basic;
    let pensionIn = 0;
    if (penOn) pensionIn = num(pen.amount) > 0 ? num(pen.amount) * (exact ? 1 : share) : pensionBase * pos(pen.pct) / 100;
    const employerIn = penOn ? (num(pen.employerAmount) > 0 ? num(pen.employerAmount) * (exact ? 1 : share) : (pen.base === 'qualifying' ? qual(gross) : basic) * pos(pen.employerPct) / 100) : 0;
    const sacrifice = on ? pos(job.sacrifice) * 12 / n * (exact ? 1 : share) : 0;
    const pensionSac = pen.type === 'sacrifice' ? pensionIn : 0, pensionNet = pen.type === 'netpay' ? pensionIn : 0;
    // Relief at source: a percentage is the whole contribution (you pay 80%, the provider claims the rest); a sum is what leaves your pay.
    const pensionRas = pen.type === 'ras' ? (rasIsSum ? pensionIn : pensionIn * (1 - y.reliefAtSource)) : 0;
    const pensionGross = pensionSac + pensionNet + (pen.type === 'ras' ? (rasIsSum ? pensionIn / (1 - y.reliefAtSource) : pensionIn) : 0);
    const niable = Math.max(0, gross - sacrifice - pensionSac);
    const taxablePay = Math.max(0, niable - pensionNet);
    const ni = niFor(niable, y, job.freq);
    const loans = loansFor(r2(niable), y, job.freq, person.loans);
    const date = hits.length ? hits[hits.length - 1].date : when(i, null);
    periods.push({ i, from: nIso(a), to: nIso(b), date, on, exact, past: i < inYtd, gross: r2(gross), basic: r2(basic), bonus, overtime: r2(overtime),
      pensionIn: r2(pensionIn), employerIn: r2(employerIn), pensionFromPay: r2(pensionSac + pensionNet + pensionRas), pensionGross: r2(pensionGross), sacrifice: r2(sacrifice), taxablePay: r2(taxablePay), exactPay: taxablePay, niable: r2(niable), ni, plan: loans.plan, pg: loans.pg, _deduct: pensionSac + pensionNet + pensionRas + sacrifice });
  }
  return periods;
}
/**
 * Trading income, and what comes off it. The trading allowance is one choice against actual costs and capital allowances.
 * It cannot be used at all in a year with any income from your employer (or a spouse's or civil partner's), or from a
 * company or partnership you or someone connected to you controls or belongs to ([tpa]).
 * person.tradeChoice: 'auto' (whichever saves more) | 'allowance' | 'actual'. person.noTradingAllowance, or a period's connected: true.
 */
function tradingProfit(person, y) {
  const income = person.self.reduce((t, s) => t + pos(s.amount), 0) + pos(person.side);
  const costs = person.self.reduce((t, s) => t + pos(s.expenses), 0);
  const capital = person.self.reduce((t, s) => t + pos(s.capital), 0);
  const connected = !!person.noTradingAllowance || person.self.some(s => s.connected);
  const cap = Math.min(income, y.trading), actual = costs + capital;
  const choice = person.tradeChoice === 'allowance' || person.tradeChoice === 'actual' ? person.tradeChoice : 'auto';
  const useAllowance = !connected && income > 0 && (choice === 'allowance' || (choice === 'auto' && cap > actual));
  const used = useAllowance ? cap : actual;
  return { income: r2(income), costs: r2(costs), capital: r2(capital), profit: r2(Math.max(0, income - used)), loss: r2(useAllowance ? 0 : Math.max(0, actual - income)),
    allowanceUsed: useAllowance, allowance: useAllowance ? r2(cap) : 0, allowanceAvailable: !connected, connected, choice, fullRelief: useAllowance && income <= y.trading };
}
/** Adjusted net income: everything taxable, less pension paid in. */
function yearlyFigures(person) {
  const y = yearData(person.year);
  let paye = 0, rasGross = 0;
  for (const j of person.jobs) {
    const ytd = j.ytd && j.ytd.asOf ? j.ytd : null;
    let mine = 0, past = 0, pastGross = 0;
    for (const p of jobPay(j, person)) {
      mine += p.exactPay;
      if (ytd && p.past) { past += p.exactPay; pastGross += p.gross; }
      if ((j.pension || {}).type === 'ras') rasGross += p.pensionGross;
    }
    // A payslip's year-to-date replaces our own figures up to its date, as it does for what the payroll has taken.
    // Its pay is before anything taken before tax, so with no taxable pay on it, taxable pay moves by the difference.
    if (ytd) { const said = ytd.taxablePay != null ? pos(ytd.taxablePay) : ytd.pay != null ? past + pos(ytd.pay) - pastGross : past; mine += said - past; }
    paye += mine + pos(j.prevPay);   // pay from an earlier job this year (a P45)
  }
  paye = r2(paye);
  const trade = tradingProfit(person, y);
  const rental = Math.max(0, pos(person.rental) - y.property);
  const nonSavings = paye + bikOf(person) + trade.profit + rental + pos(person.otherTaxable);
  const unearned = rental + pos(person.otherTaxable) + pos(person.interest) + pos(person.dividends);
  // Gift Aid and pension paid personally: grossed up by basic-rate relief, they lift the rate limits and lower adjusted net income.
  const giftGross = pos(person.giftAid) * (1 + y.giftAid), paidGross = pos(person.pensionPaid) / (1 - y.reliefAtSource);
  const extend = giftGross + paidGross + (person.claimRas ? rasGross : 0);
  return { paye, rasGross, trade, rental, nonSavings, unearned, extend, giftGross, paidGross, adjustedNet: nonSavings + pos(person.interest) + pos(person.dividends) - rasGross - giftGross - paidGross };
}
/** Do two jobs run at the same time at any point? One that ended before the other began does not use up its tax code. */
const overlapping = (a, b) => (!a.end || !b.start || a.end >= b.start) && (!b.end || !a.start || b.end >= a.start);
/** The code you'd normally expect for these answers ('1257L', 'S1257L', 'K105'); a job that is not the main one, alongside it: BR. */
export function workedOutCode(person0, job = null) {
  const person = normPerson(person0); const y = yearData(person.year);
  const pre = person.region === 'scotland' ? 'S' : '';
  if (job && !job.main && person.jobs.some(j => j.main && j.id !== job.id && overlapping(j, job))) return `${pre}BR`;
  const yf = yearlyFigures(person);
  const a = codeAllowance(person, y, yf);
  if (a < 0) return `${pre}K${Math.max(1, Math.floor(-a / 10))}`;
  if (a < 10) return `${pre}0T`;
  return `${pre}${Math.floor(a / 10)}${getsMarriage(person, y, yf) ? 'M' : person.marriage === 'give' ? 'N' : 'L'}`;
}

/* ---------- PAYE, period by period, for one job ---------- */
export function jobRun(job0, person0) {
  const person = normPerson(person0);
  const known = person.jobs.find(j => (job0.id && j.id === job0.id));
  const job = { ...(known || {}), ...job0, freq: FREQS[job0.freq] ? job0.freq : 'monthly' };
  job.main = known ? !!known.main : (!!job0.main || !person.jobs.some(j => j.main));
  const y = yearData(person.year); const n = FREQS[job.freq].n;
  const codeText = String(job.taxCode || '').trim() || workedOutCode(person, job);
  const typed = parseTaxCode(codeText, person.region);
  // A code that is not a code (a typing slip) still means tax is taken: worked out as the code you would expect, with a note (codeWarnings).
  const code = typed.kind === 'invalid' ? parseTaxCode(workedOutCode(person, job), person.region) : typed;
  const reg = code.region === 'scotland' ? 'scotland' : 'ruk';
  const bands = y.bands[reg];
  const flat = code.kind === 'flat' ? y.flat[reg][code.name] : null;
  const ytd = job.ytd && job.ytd.asOf ? job.ytd : null;
  const periods = jobPay(job, person);
  // On a cumulative code a new employer carries on from the last one's pay and tax (the P45), typed in or, when that job is listed here, from its own figures.
  let fromPay = pos(job.prevPay), fromTax = pos(job.prevTax);
  if (code.cumulative && job.start && !(fromPay > 0 || fromTax > 0)) {
    for (const o of person.jobs) {
      if (o.id === job.id || !o.end || o.end >= job.start) continue;
      const before = jobRun(o, person);
      if (!parseTaxCode(before.codeText, person.region).cumulative) continue;
      const t = runTotals(before, null);
      fromPay += t.taxablePay + pos(o.prevPay); fromTax += t.tax + pos(o.prevTax);
    }
  }
  let cumTaxable = fromPay, cumTax = fromTax, seeded = !ytd, pastGross = 0;
  for (const p of periods) {
    if (!seeded && !p.past) {
      // What the payslip gives replaces ours; what it leaves out stays ours. Its pay is before anything taken before tax.
      if (ytd.taxablePay != null) cumTaxable = pos(ytd.taxablePay) + fromPay;
      else if (ytd.pay != null) cumTaxable += pos(ytd.pay) - pastGross;
      if (ytd.tax != null) cumTax = pos(ytd.tax) + fromTax;
      seeded = true;
    }
    if (p.past) pastGross += p.gross;
    const k = code.cumulative ? p.i + 1 : 1;
    const lim = y.overridingLimit * p.taxablePay;
    let tax = 0;
    if (!p.on || code.kind === 'none' || code.kind === 'invalid') tax = 0;
    else if (flat != null) tax = floor2(p.taxablePay * flat);
    else {
      const free = code.kind === 'allowance' ? code.amount * k / n : code.kind === 'k' ? -code.amount * k / n : 0;
      const pay = code.cumulative ? cumTaxable + p.taxablePay : p.taxablePay;
      const due = floor2(bandTax(Math.floor(Math.max(0, pay - free) + 1e-7), bands, k / n));
      tax = code.cumulative ? r2(due - cumTax) : due;
    }
    if (tax > lim) tax = floor2(lim);            // never more than half of this pay ([lim]); the rest comes on a later payday
    cumTaxable += p.taxablePay; cumTax = r2(cumTax + tax);
    p.tax = tax; p.cumTax = cumTax; p.cumTaxable = r2(cumTaxable);
    p.takeHome = r2(p.gross - p._deduct - tax - p.ni - p.plan - p.pg);
    delete p._deduct; delete p.exactPay;
  }
  return { id: job.id, name: job.name || '', main: !!job.main, year: person.year, freq: job.freq, n, code: typed, codeText, periods, ytd };
}
const totalOf = (ps, k) => r2(ps.reduce((t, p) => t + (p[k] || 0), 0));
const scale = (o, f) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r2(v * f)]));
const payslipOf = (p) => ({ gross: p.gross, tax: p.tax, ni: p.ni, loans: r2(p.plan + p.pg), plan: p.plan, pg: p.pg, pensionFromPay: p.pensionFromPay, sacrifice: p.sacrifice, takeHome: p.takeHome });
/** A run's totals up to a date (null: the whole year), with a payslip's year-to-date in place of ours up to its date. */
function runTotals(run, upTo) {
  const ps = run.periods.filter(p => p.on && (!upTo || (p.date || p.to) <= upTo));
  const out = { pay: totalOf(ps, 'gross'), taxablePay: totalOf(ps, 'taxablePay'), tax: totalOf(ps, 'tax'), ni: totalOf(ps, 'ni'), plan: totalOf(ps, 'plan'), pg: totalOf(ps, 'pg'), pension: totalOf(ps, 'pensionFromPay'), sacrifice: totalOf(ps, 'sacrifice'), takeHome: totalOf(ps, 'takeHome') };
  const y = run.ytd;
  if (y && (!upTo || y.asOf <= upTo)) {
    const past = ps.filter(p => p.past);
    let delta = 0;   // take-home moves by the pay difference, less the extra deductions
    for (const k of ['pay', 'tax', 'ni', 'plan', 'pg']) {
      if (y[k] == null) continue;
      const was = totalOf(past, k === 'pay' ? 'gross' : k);
      const d = pos(y[k]) - was;
      out[k] = r2(out[k] + d);
      delta += k === 'pay' ? d : -d;
    }
    out.takeHome = r2(out.takeHome + delta);
    // The figure a return uses: the payslip's taxable pay if it shows one, else moved with its pay.
    const wasTaxable = totalOf(past, 'taxablePay');
    if (y.taxablePay != null) out.taxablePay = r2(out.taxablePay + pos(y.taxablePay) - wasTaxable);
    else if (y.pay != null) out.taxablePay = r2(out.taxablePay + pos(y.pay) - totalOf(past, 'gross'));
  }
  return out;
}

/* ---------- what is really due on everything ---------- */
const extendBands = (bands, ext) => bands.map(([up, r, n]) => [up === INF || n === 'starter' ? up : up + ext, r, n]);
// Pay and the like, savings, dividends: every order the tax-free amount can be used in, the usual one first.
const ALLOWANCE_ORDERS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
function incomeTax(person, y, yf) {
  const reg = person.region === 'scotland' ? 'scotland' : 'ruk';
  const regionBands = extendBands(y.bands[reg], yf.extend || 0);
  const allowanceGiven = allowanceFor(person, y, yf.adjustedNet);
  // Savings and dividends use the UK's bands everywhere ([sco]).
  const uk = extendBands(y.bands.ruk, yf.extend || 0);
  const taxWith = (order) => {
    let allowance = allowanceGiven;
    const left = [yf.nonSavings, pos(person.interest), pos(person.dividends)];
    for (const k of order) { const u = Math.min(Math.max(0, allowance), left[k]); allowance -= u; left[k] -= u; }
    const [ns, savingsIn, divIn] = left;
    const nsTax = bandTax(ns, regionBands);
    const totalTaxable = ns + savingsIn + divIn;
    const bandName = totalTaxable <= uk[0][0] ? 'basic' : totalTaxable <= uk[1][0] ? 'higher' : 'additional';
    const startBand = Math.max(0, y.savings.startBand - ns);
    const free = Math.min(savingsIn, startBand + y.savings.psa[bandName]);
    const sav = bandTax(ns + savingsIn, uk) - bandTax(ns + free, uk);
    const divTaxed = Math.max(0, divIn - y.dividends.allowance);
    const divFrom = ns + savingsIn + (divIn - divTaxed);
    const part = (lo, hi) => Math.max(0, Math.min(divFrom + divTaxed, hi) - Math.max(divFrom, lo));
    const div = part(0, uk[0][0]) * y.dividends.basic + part(uk[0][0], uk[1][0]) * y.dividends.higher + part(uk[1][0], INF) * y.dividends.additional;
    return { ns, nsTax, sav, div, allowance, totalTaxable, sum: nsTax + sav + div };
  };
  // The tax-free amount comes off in whichever way leaves the least tax (Income Tax Act 2007, section 25).
  let best = null;
  for (const o of ALLOWANCE_ORDERS) { const w = taxWith(o); if (!best || w.sum < best.sum - 0.005) best = w; }
  const { ns, nsTax, sav, div, allowance, totalTaxable } = best;
  // It comes off the whole bill, and cannot make it less than nothing.
  const reducer = getsMarriage(person, y, yf) && overrideOf(person) == null ? Math.min(y.marriage * y.marriageRate, best.sum) : 0;
  const parts = [];
  { let low = 0; for (const [up, rate, name] of regionBands) { const part = Math.min(ns, up) - low; if (part <= 0) break; parts.push({ name, rate, amount: r2(part), tax: r2(part * rate) }); low = up; } }
  return { taxable: r2(totalTaxable), bands: parts, allowance: allowanceGiven, allowanceUsed: r2(allowanceGiven - Math.max(0, allowance)), nonSavings: r2(nsTax), savings: r2(sav), dividends: r2(div), marriageReducer: r2(reducer), total: r2(best.sum - reducer) };
}
/**
 * The year's whole bill, across every source. Student loan under Self Assessment: employment and trading income, plus ALL
 * other income when that other income is over 2,000 pounds (at 2,000 or less it is left out; the first 2,000 is not exempt) [une].
 * 9% or 6% over the threshold for the plans held, whole pounds, rounded down [cslm].
 */
export function wholeYearLiability(person0) {
  const person = normPerson(person0); const y = yearData(person.year);
  const yf = yearlyFigures(person);
  const tax = incomeTax(person, y, yf);
  const p = yf.trade.profit;
  const class4 = r2(Math.max(0, Math.min(p, y.class4.to) - y.class4.from) * y.class4.main + Math.max(0, p - y.class4.to) * y.class4.upper);
  const counted = yf.unearned > y.loanUnearned;
  const earned = yf.paye + p;
  const earnings = earned + (counted ? yf.unearned : 0);
  const under = (person.loans || []).filter(k => k !== 'pg' && y.loans[k]);
  const whole = (x) => Math.floor(x + 1e-7);
  const threshold = under.length ? Math.min(...under.map(k => y.loans[k].annual)) : null;
  const planDue = under.length ? whole(Math.max(0, earnings - threshold) * y.loans[under[0]].rate) : 0;
  const pgDue = (person.loans || []).includes('pg') && y.loans.pg ? whole(Math.max(0, earnings - y.loans.pg.annual) * y.loans.pg.rate) : 0;
  // High Income Child Benefit Charge: 1% for every 200 pounds over 60,000, all of it from 80,000 [cb]. Rounded down to the pound.
  const cb = pos(person.childBenefit);
  const hicbc = cb > 0 ? Math.floor(cb * Math.min(100, Math.max(0, Math.floor((yf.adjustedNet - y.hicbc.from) / y.hicbc.per))) / 100 + 1e-7) : 0;
  // Capital Gains Tax: gains over the allowance; the basic rate on what is left of the basic band [cgt].
  const gainsIn = pos(person.gains);
  const taxedGains = Math.max(0, gainsIn - y.cgt.allowance);
  const bandLeft = Math.max(0, y.bands.ruk[0][0] + (yf.extend || 0) - tax.taxable);
  const cgt = r2(Math.min(taxedGains, bandLeft) * y.cgt.basic + Math.max(0, taxedGains - bandLeft) * y.cgt.higher);
  const class2 = { week: y.class2.week, year: r2(y.class2.week * 52), spt: y.class2.spt, voluntary: yf.trade.income > 0 && p < y.class2.spt };
  return { year: y.id, income: r2(yf.nonSavings + pos(person.interest) + pos(person.dividends)), adjustedNet: r2(yf.adjustedNet), allowance: tax.allowance, allowanceUsed: tax.allowanceUsed, allowanceLeft: r2(Math.max(0, tax.allowance - tax.allowanceUsed)),
    tax: r2(tax.total + hicbc), taxParts: { pay: tax.nonSavings, savings: tax.savings, dividends: tax.dividends, marriageReducer: tax.marriageReducer, hicbc, bands: tax.bands, taxable: tax.taxable },
    class4, class2, cgt, gains: r2(gainsIn), loan: { plan: planDue, pg: pgDue, total: r2(planDue + pgDue), earnings: r2(earnings), earned: r2(earned), unearned: r2(yf.unearned), unearnedCounted: counted, threshold }, trade: yf.trade, rental: r2(yf.rental) };
}
/** What the payrolls take, job by job: up to today (so far) and by the end of the tax year. Payslip figures win where given. */
export function collectedThroughPayroll(person0, todayIso = null) {
  const person = normPerson(person0);
  const jobs = person.jobs.map(j => {
    const run = jobRun(j, person);
    return { id: run.id, name: run.name, main: run.main, codeText: run.codeText, code: run.code, soFar: todayIso ? runTotals(run, todayIso) : null, year: runTotals(run, null), run };
  });
  const add = (w, k) => r2(jobs.reduce((t, x) => t + (x[w] ? x[w][k] : 0), 0));
  // Pay and tax from an earlier job this year (a P45) count as already collected.
  const prevPay = person.jobs.reduce((t, j) => t + pos(j.prevPay), 0), prevTax = person.jobs.reduce((t, j) => t + pos(j.prevTax), 0);
  const sum = (w) => ({ pay: r2(add(w, 'pay') + prevPay), tax: r2(add(w, 'tax') + prevTax), ni: add(w, 'ni'), plan: add(w, 'plan'), pg: add(w, 'pg'), loans: r2(add(w, 'plan') + add(w, 'pg')), takeHome: add(w, 'takeHome') });
  return { jobs, soFar: todayIso ? sum('soFar') : null, year: sum('year') };
}
/**
 * Due against collected, for the whole year. difference > 0: still to pay; < 0: too much taken (usually a refund).
 * hasUntaxed: some income has no tax taken from it before it arrives, so tax on it is still to pay.
 */
export function yearPosition(person0, todayIso = null) {
  const person = normPerson(person0);
  const due = wholeYearLiability(person);
  const coll = collectedThroughPayroll(person, todayIso);
  const taxDiff = r2(due.tax - coll.year.tax);
  // Too much loan taken through payroll is not set against the tax bill; the Student Loans Company refunds it.
  const loanRaw = r2(due.loan.total - coll.year.loans);
  const loanDiff = Math.max(0, loanRaw);
  const hasUntaxed = due.trade.income > 0 || pos(person.rental) > 0 || pos(person.otherTaxable) > 0 || pos(person.interest) > 0 || pos(person.dividends) > 0;
  return { year: due.year, due, collected: coll, hasUntaxed,
    difference: { tax: taxDiff, class4: due.class4, loan: loanDiff, loanOver: r2(Math.max(0, -loanRaw)), cgt: due.cgt, total: r2(taxDiff + due.class4 + loanDiff + due.cgt) }, collectedSoFar: coll.soFar };
}

/* ---------- the whole year in plain totals ---------- */
export function annualEstimate(person0, todayIso = null) {
  const person = normPerson(person0); const y = yearData(person.year);
  const position = yearPosition(person, todayIso);
  const jobs = position.collected.jobs;
  const yf = yearlyFigures(person);
  const main = jobs.find(j => j.main) || jobs[0] || null;
  const perYear = { gross: 0, tax: 0, ni: 0, plan: 0, pg: 0, loans: 0, pensionFromPay: 0, sacrifice: 0, takeHome: 0 };
  for (const j of jobs) {
    const t = j.year;
    perYear.gross += t.pay; perYear.tax += t.tax; perYear.ni += t.ni; perYear.plan += t.plan; perYear.pg += t.pg; perYear.loans += t.plan + t.pg;
    perYear.pensionFromPay += t.pension; perYear.sacrifice += t.sacrifice; perYear.takeHome += t.takeHome;
  }
  for (const k of Object.keys(perYear)) perYear[k] = r2(perYear[k]);
  const byJob = jobs.map(j => {
    const on = j.run.periods.filter(p => p.on);
    const typical = on.filter(p => !p.bonus).slice(-1)[0] || on[on.length - 1] || null;
    // What is still to come: the very next payment, the next ordinary payslip, and every payment from today on.
    const whenOf = (p) => p.date || p.to;
    const ahead = todayIso ? on.filter(p => whenOf(p) >= todayIso && !p.past) : [];
    const slip = (p) => (p ? { date: whenOf(p), ...payslipOf(p), bonus: p.bonus > 0 } : null);
    const regular = ahead.filter(p => !p.bonus);
    return { id: j.id, name: j.name, main: j.main, codeText: j.codeText, code: j.code, freq: j.run.freq, n: j.run.n, year: j.year, soFar: j.soFar, payslip: typical ? payslipOf(typical) : null, periods: j.run.periods,
      next: slip(ahead[0]), nextRegular: slip(regular[0]), ahead: ahead.map(p => ({ date: whenOf(p), gross: p.gross, takeHome: p.takeHome, bonus: p.bonus > 0 })), regularSlips: regular.map(slip) };
  });
  // Relief a higher-rate payer claims back on relief-at-source pensions.
  let reliefToClaim = 0;
  if (yf.rasGross > 0) {
    const a = allowanceFor(person, y, yf.adjustedNet), b = y.bands[person.region === 'scotland' ? 'scotland' : 'ruk'];
    const saved = bandTax(Math.max(0, yf.nonSavings - a), b) - bandTax(Math.max(0, yf.nonSavings - yf.rasGross - a), b);
    reliefToClaim = r2(Math.max(0, saved - yf.rasGross * y.reliefAtSource));
  }
  let employerPension = 0, pensionGross = 0;
  for (const j of person.jobs) {
    const pen = j.pension || {};
    const found = jobs.find(x => x.id === j.id);
    const ps = found ? found.run.periods.filter(p => p.on) : [];
    pensionGross += totalOf(ps, 'pensionGross');
    if (pen.type && pen.type !== 'none') employerPension += ps.reduce((t, p) => t + p.employerIn, 0);
  }
  employerPension = r2(employerPension);
  const notes = [];
  if (reliefToClaim > 0.5) notes.push(`You could claim about ${gbp0(reliefToClaim)} more pension tax relief, usually through a tax return.`);
  const diff = position.difference;
  // Tax nobody takes before the money arrives. A small payroll rounding on one job is not "still to pay", but a real gap is, either way
  // (a job that ended part-way through the year, an emergency code). A student loan is only collected on the total through a tax return,
  // so with income that needs no return (the same limits as tax-rules.mjs needToFile) only tax counts.
  const t = position.due.trade, dv = pos(person.dividends);
  const needsReturn = t.income > y.trading || (t.income > 0 && t.connected) || pos(person.rental) > y.property || pos(person.otherTaxable) > y.trading || pos(person.interest) > 1000 || dv > y.dividends.allowance || diff.cgt > 0 || position.due.taxParts.hicbc > 0;
  const owed = needsReturn ? diff.total : position.hasUntaxed || jobs.length > 1 || Math.abs(diff.tax) >= 10 ? diff.tax : 0;
  const stillToPay = r2(Math.max(0, owed));
  const overTaken = r2(Math.max(0, -owed));
  return {
    year: y.id, yearLabel: y.label, perYear, perMonth: scale(perYear, 1 / 12), perPayslip: main ? byJob.find(j => j.id === main.id).payslip : null,
    byJob, main: main ? main.id : null, codeText: main ? main.codeText : null, code: main ? main.code : null, workedOut: main ? workedOutCode(person, person.jobs.find(j => j.id === main.id)) : null,
    position: { due: position.due, difference: diff, hasUntaxed: position.hasUntaxed, collectedSoFar: position.collectedSoFar, collectedYear: position.collected.year },
    stillToPay, overTaken, employerPension, pensionTotal: r2(pensionGross + employerPension), reliefToClaim,
    pensionLimitOver: pensionGross + employerPension > y.pension.annualAllowance, notes,
  };
}

/* ---------- so far this tax year ---------- */
/** Up to today, across every job: pay, tax, the tax-free amount used, and what comes next. */
export function soFarThisYear(person0, todayIso) {
  const person = normPerson(person0); const y = yearData(person.year);
  const coll = collectedThroughPayroll(person, todayIso);
  const yf = yearlyFigures(person);
  const allowance = Math.max(0, codeAllowance(person, y, yf));
  const t = coll.soFar;
  const main = coll.jobs.find(j => j.main) || coll.jobs[0];
  const done = main ? main.run.periods.filter(p => (p.date || p.to) <= todayIso) : [];
  const fraction = main ? done.length / main.run.n : 0;
  const next = main ? (main.run.periods.find(p => p.on && !p.past && (p.date || p.to) > todayIso) || null) : null;
  const used = r2(Math.min(allowance * fraction, t.pay));   // PAYE hands the tax-free amount out evenly over the year
  return { periods: done.length, ofYear: main ? main.run.n : 0, pay: t.pay, tax: t.tax, ni: t.ni, loans: t.loans, takeHome: t.takeHome,
    allowanceYear: allowance, allowanceByNow: r2(allowance * fraction), allowanceUsed: used, allowanceLeft: r2(Math.max(0, allowance - used)),
    nextDate: next ? next.date : null, expectedNext: next ? next.takeHome : null, byJob: coll.jobs.map(j => ({ id: j.id, name: j.name, codeText: j.codeText, ...j.soFar })) };
}

/* ---------- does the tax code look right? ---------- */
export function codeWarnings(person0, job0 = null) {
  const person = normPerson(person0);
  const job = job0 ? (person.jobs.find(j => j.id === job0.id) || job0) : (person.jobs.find(j => j.main) || person.jobs[0]);
  const out = [];
  if (!job) return out;
  const others = person.jobs.filter(j => j.id !== job.id && overlapping(j, job));
  const only = !others.length, isMain = !!job.main || only;
  if (isMain && person.marriage === 'get' && overrideOf(person) == null && !getsMarriage(person, yearData(person.year), yearlyFigures(person))) out.push({ level: 'warn', text: 'Marriage Allowance only works for someone who pays tax at the basic rate (in Scotland, the starter, basic or intermediate rate). Your income looks too high, so Freeflo leaves it out. If your spouse has already given it to you, HMRC may take it back: worth checking with them.' });
  if (job.end && Array.isArray(job.payments) && job.payments.some(p => p && p.date > job.end)) out.push({ level: 'info', text: `${job.name || 'This job'}: pay that comes after you leave and after your P45 is taxed on its own, using code 0T. That can take more tax from that payment than Freeflo shows here, because Freeflo carries on with your tax code. Any extra comes back after the tax year. Check your last payslip.` });
  const given = String(job.taxCode || '').trim().toUpperCase();
  if (!given) return out;
  const c = parseTaxCode(given, person.region);
  const named = job.name || 'this job';
  if (c.kind === 'invalid') { out.push({ level: 'warn', text: `${given} does not look like a tax code. It is usually printed on your payslip, for example 1257L. Until it is corrected, Freeflo works this job out as ${workedOutCode(person, { ...job, taxCode: '' })}.` }); return out; }
  if (c.emergency) out.push({ level: 'warn', text: `${given} is an emergency code. It often means too much tax for a while, until your employer has your details. It normally sorts itself out, or HMRC can correct it.` });
  if (c.kind === 'zero') out.push({ level: isMain && only ? 'warn' : 'info', text: isMain && only ? '0T means none of your pay is tax-free. That is normal for a little while in a new job, but on your only job it usually means too much tax.' : `0T on ${named} means none of this pay is tax-free. That is normal if another job uses your tax-free amount.` });
  if (c.kind === 'flat' && c.name === 'BR') out.push(only
    ? { level: 'warn', text: 'BR taxes all your pay at the basic rate, with nothing tax-free. On your only job this usually means too much tax.' }
    : { level: 'info', text: `BR on ${named}: normal for a second job, as long as your tax-free amount is used on another job.` });
  if (c.kind === 'flat' && c.name !== 'BR') out.push(only ? { level: 'warn', text: `${given} is usually for a second job. On your only job it would mean a lot of tax.` } : { level: 'info', text: `${given} on ${named}: usual when your other income already uses up the lower tax rates.` });
  if (c.region === 'scotland' && person.region !== 'scotland') out.push({ level: 'warn', text: 'Your code starts with S, which means Scottish tax. You told us you do not live in Scotland: worth checking with HMRC.' });
  if (c.region !== 'scotland' && person.region === 'scotland') out.push({ level: 'info', text: 'People in Scotland normally have a code starting with S. Worth checking your payslip.' });
  // Every job on flat codes, or two jobs both using the allowance.
  if (others.length) {
    const codes = [job, ...others].map(j => parseTaxCode(String(j.taxCode || '').trim() || workedOutCode(person, j), person.region));
    if (codes.every(x => x.kind === 'flat')) out.push({ level: 'warn', text: 'None of your jobs has your tax-free amount. You may be paying too much tax: HMRC can move it to one of them.' });
    else if (codes.filter(x => x.kind === 'allowance').length > 1) out.push({ level: 'warn', text: 'More than one of your jobs uses your tax-free amount. You may owe tax at the end of the year.' });
  }
  const expected = workedOutCode({ ...person, jobs: person.jobs.map(j => (j.id === job.id ? { ...j, taxCode: '' } : j)) }, { ...job, taxCode: '' });
  const e = parseTaxCode(expected, person.region);
  if (isMain && c.kind === 'allowance' && e.kind === 'allowance' && Math.abs(c.amount - e.amount) >= 500) out.push({ level: 'info', text: `From your answers we would expect about ${expected}. Yours may be different because HMRC knows about something else, such as a company benefit or tax owed from another year.` });
  if (c.kind === 'k' && e.kind !== 'k') out.push({ level: 'info', text: 'A K code means HMRC is collecting tax on something else through your pay. Your tax account on GOV.UK shows why.' });
  return out;
}

/* ---------- payments on account, and the bill ---------- */
/**
 * The two tests, on one year's figures [poa]: no payments on account if what is left after tax taken at source is under
 * 1,000 pounds, or if more than 80% of the tax was met at source. Income tax and Class 4 count; Capital Gains Tax and student loans do not.
 */
export function paymentsOnAccount(due, collectedTax, yearId) {
  const y = yearData(yearId || due.year);
  const assessed = r2(pos(due.tax) + pos(due.class4));
  const atSource = r2(Math.min(pos(collectedTax), assessed));
  const relevant = r2(Math.max(0, assessed - pos(collectedTax)));
  const share = assessed > 0 ? atSource / assessed : 1;
  const under = relevant < y.poa.under;
  const met = assessed > 0 && relevant / assessed < 1 - y.poa.metShare;   // "less than 1 to 5": exactly 80% still means payments
  const applies = !under && !met && assessed > 0;
  const each = applies ? r2(relevant / 2) : 0;
  const pct = Math.round(share * 100);
  const why = assessed <= 0 ? 'You owe no tax for the year, so there are no payments on account.'
    : under ? `What is left to pay, ${gbp0(relevant)}, is under ${gbp0(y.poa.under)}, so you do not make payments on account.`
      : met ? `${pct}% of your tax was taken before it reached you, which is more than 80%, so you do not make payments on account.`
        : `What is left to pay is ${gbp0(relevant)}, which is ${gbp0(y.poa.under)} or more, and only ${pct}% of your tax was taken before it reached you. So you pay half of it in advance each January and July, towards next year.`;
  return { applies, relevant, assessed, atSource, sourceShare: r2(share), under, met, first: each, second: each, why };
}
/**
 * What the return for this year costs, and when. paidOnAccount: payments made towards this year already (last year's).
 * January after the year: the balance, plus the first payment on account for next year. July: the second.
 */
export function saBill(position, { paidOnAccount = 0 } = {}) {
  const due = position.due, d = position.difference;
  const poa = paymentsOnAccount(due, position.collected.year.tax, due.year);
  const owedAtSa = r2(d.tax + d.class4 + d.loan + d.cgt);
  const balance = r2(owedAtSa - pos(paidOnAccount));
  return { owed: owedAtSa, balance, refund: r2(Math.max(0, -balance)), poa, january: r2(Math.max(0, balance) + poa.first), july: poa.second, parts: { tax: d.tax, class4: d.class4, loan: d.loan, cgt: d.cgt, paidOnAccount: r2(pos(paidOnAccount)) } };
}

/* ---------- what a change is worth ---------- */
const billOf = (person) => {
  const p = yearPosition(person);
  return r2(p.due.tax + p.due.class4 + p.due.cgt + Math.max(p.due.loan.total, p.collected.year.loans));
};
/** What this cost saves: tax, Class 4 and student loan, by working the year out with and without it. */
export function claimSaving(person0, cost, o = {}) {
  const person = normPerson(person0);
  const self = person.self.length ? person.self : [{ amount: 0, expenses: 0 }];
  const choice = o.ifCosts || person.tradeChoice === 'allowance' ? 'actual' : person.tradeChoice;   // ifCosts: what it is worth once actual costs are used
  const without = billOf({ ...person, tradeChoice: choice, self });
  const withIt = billOf({ ...person, tradeChoice: choice, self: [{ ...self[0], expenses: pos(self[0].expenses) + pos(cost) }, ...self.slice(1)] });
  return r2(without - withIt);
}
/** Of a new self-employed payment, what to keep: the bill with it, less the bill without it. */
export function keepOf(person0, amount) {
  const person = normPerson(person0);
  const self = person.self.length ? person.self : [{ amount: 0, expenses: 0 }];
  const before = billOf({ ...person, self });
  const after = billOf({ ...person, self: [{ ...self[0], amount: pos(self[0].amount) + pos(amount) }, ...self.slice(1)] });
  const keep = r2(Math.max(0, after - before));
  return { keep, share: amount > 0 ? r2(keep / amount) : 0 };
}
/** The allowance against actual costs: both worked out, which one is used and why. */
export function tradeCompare(person0) {
  const person = normPerson(person0); const y = yearData(person.year);
  const t = tradingProfit(person, y);
  if (!t.income) return null;
  const leftOf = (ch) => { const p = yearPosition({ ...person, tradeChoice: ch }); return r2(p.difference.total); };
  const allow = t.allowanceAvailable ? leftOf('allowance') : null;
  const actual = leftOf('actual');
  const costs = r2(t.costs + t.capital);
  const why = t.connected ? `You cannot use the ${gbp0(y.trading)} trading allowance this year, because some of this income is from your employer or from a business connected to you. So your actual costs of ${gbp0(costs)} are used.`
    : t.choice === 'allowance' ? `You chose the ${gbp0(y.trading)} trading allowance. With it you cannot also claim any costs.`
      : t.choice === 'actual' ? `You chose your actual costs of ${gbp0(costs)}.`
        : t.allowanceUsed ? `The ${gbp0(y.trading)} trading allowance is more than your actual costs of ${gbp0(costs)}, so we use the allowance. You cannot claim both.`
          : `Your actual costs of ${gbp0(costs)} are more than the ${gbp0(y.trading)} trading allowance, so we use your costs. You cannot claim both.`;
  return { used: t.allowanceUsed ? 'allowance' : 'actual', available: t.allowanceAvailable, connected: t.connected, choice: t.choice, allowance: r2(Math.min(t.income, y.trading)), costs, billWithAllowance: allow, billWithCosts: actual, why, fullRelief: t.fullRelief };
}

/* ---------- how the number was worked out ---------- */
const pct = (r) => `${Math.round(r * 10000) / 100}%`;
/** Every line of the year's sum, in order, with a plain sentence. key lets a line be asked about. */
export function howWorkedOut(person0, todayIso = null) {
  const person = normPerson(person0); const y = yearData(person.year);
  const pos0 = yearPosition(person, todayIso), due = pos0.due, coll = pos0.collected, t = due.trade;
  const L = [];
  const add = (key, label, amount, how, o = {}) => L.push({ key, label, amount: r2(amount), how: how || '', ...o });
  for (const j of coll.jobs) {
    const pay = j.year.taxablePay + pos((person.jobs.find(x => x.id === j.id) || {}).prevPay);
    add(`job:${j.id}`, `Pay from ${j.name || 'your job'}`, pay, 'What this job pays before tax, after anything taken before tax such as a pension.', { group: 'income' });
  }
  if (t.income) {
    add('self-in', 'Self-employed money in', t.income, 'Everything your clients paid you in this tax year.', { group: 'income' });
    if (t.allowanceUsed) add('self-allow', 'Trading allowance', -t.allowance, `A flat ${gbp0(y.trading)} off instead of your actual costs.`, { group: 'income' });
    else if (t.costs + t.capital) add('self-costs', 'Your work costs', -(t.costs + t.capital), 'What you spent to do the work, and any equipment claimed.', { group: 'income' });
    add('self-profit', 'Self-employed profit', t.profit, 'Money in, less what came off. This is the part that is taxed.', { group: 'income', sub: true });
  }
  if (pos(person.rental)) add('rental', 'Rent, after the property allowance', due.rental, `${gbp0(y.property)} of rent is tax-free. Freeflo takes this off, not your actual costs. If your costs are more than that, or you pay a mortgage on the property, your return works it out differently and the tax here is too high.`, { group: 'income' });
  if (pos(person.otherTaxable)) add('other', 'Other income', pos(person.otherTaxable), '', { group: 'income' });
  if (bikOf(person)) add('bik', 'Work benefits', bikOf(person), 'Benefits such as a company car are taxed like pay.', { group: 'income' });
  if (pos(person.interest)) add('interest', 'Savings interest', pos(person.interest), '', { group: 'income' });
  if (pos(person.dividends)) add('dividends', 'Dividends', pos(person.dividends), 'Payments from shares you own.', { group: 'income' });
  add('income', 'Total income', due.income, '', { group: 'income', total: true });
  { const ap = allowanceParts(person);
    const how = ap.override != null ? `This is the figure you gave from HMRC, ${gbp0(ap.override)}. Freeflo uses it instead of working one out.`
      : 'The first part of your income has no tax on it.' + (ap.taper ? ` Yours shrinks by 1 pound for every 2 pounds of income over ${gbp0(ap.taperFrom)}.` : '') + (ap.blind ? ` It includes ${gbp0(y.blind)} of Blind Person's Allowance, because you said you are registered blind.` : '') + (ap.give ? ` It is ${gbp0(ap.give)} lower because you gave part of it to your spouse (Marriage Allowance).` : '');
    add('allowance', 'Your tax-free amount', -due.allowance, how, { group: 'tax' }); }
  for (const b of due.taxParts.bands) add(`band:${b.name}`, `${gbp0(b.amount)} at ${pct(b.rate)}`, b.tax, `The ${b.name} rate.`, { group: 'tax', sub: true });
  if (due.taxParts.savings) add('tax-savings', 'Tax on savings interest', due.taxParts.savings, 'After the savings allowances.', { group: 'tax', sub: true });
  if (due.taxParts.dividends) add('tax-dividends', 'Tax on dividends', due.taxParts.dividends, `After the ${gbp0(y.dividends.allowance)} dividend allowance.`, { group: 'tax', sub: true });
  if (due.taxParts.marriageReducer) add('marriage', 'Marriage Allowance', -due.taxParts.marriageReducer, 'Your spouse gave you part of their tax-free amount.', { group: 'tax', sub: true });
  if (due.taxParts.hicbc) add('hicbc', 'High Income Child Benefit Charge', due.taxParts.hicbc, `1% of your Child Benefit for every ${gbp0(y.hicbc.per)} over ${gbp0(y.hicbc.from)}.`, { group: 'tax', sub: true });
  add('tax-due', 'Income tax for the year', due.tax, '', { group: 'tax', total: true });
  add('tax-taken', 'Taken through payroll', -coll.year.tax, 'What your employers take from your pay.', { group: 'tax' });
  add('tax-left', pos0.difference.tax >= 0 ? 'Income tax still to pay' : 'Income tax paid too much', pos0.difference.tax, '', { group: 'tax', total: true });
  if (t.profit > y.class4.from || t.income) add('class4', 'National Insurance on your profit (Class 4)', due.class4, `${pct(y.class4.main)} of profit between ${gbp0(y.class4.from)} and ${gbp0(y.class4.to)}, then ${pct(y.class4.upper)}.`, { group: 'ni' });
  if ((person.loans || []).length) {
    const names = (person.loans || []).map(k => (y.loans[k] ? y.loans[k].name : k)).join(' and ');
    const uw = due.loan.unearned > 0 ? (due.loan.unearnedCounted ? ` Your other income of ${gbp0(due.loan.unearned)} is over ${gbp0(y.loanUnearned)}, so all of it counts.` : ` Your other income of ${gbp0(due.loan.unearned)} is ${gbp0(y.loanUnearned)} or less, so it does not count.`) : '';
    add('loan-due', `Student loan for the year (${names})`, due.loan.total, `On ${gbp0(due.loan.earnings)} of income, over the ${gbp0(due.loan.threshold != null ? due.loan.threshold : (y.loans.pg ? y.loans.pg.annual : 0))} threshold, in whole pounds rounded down.${uw}`, { group: 'loan' });
    add('loan-taken', 'Taken through payroll', -coll.year.loans, 'Each job looks only at its own pay, so two smaller jobs can take nothing.', { group: 'loan' });
    add('loan-left', 'Student loan still to pay', pos0.difference.loan, '', { group: 'loan', total: true });
  }
  if (due.cgt) add('cgt', 'Capital Gains Tax', due.cgt, `Gains of ${gbp0(due.gains)}, less the ${gbp0(y.cgt.allowance)} allowance.`, { group: 'cgt' });
  return { lines: L, position: pos0 };
}
