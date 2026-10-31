// lib/finance/tax-forms.mjs - a year's figures laid out by the boxes of the official forms, and the filing walkthrough. Pure.
//
// Box numbers were read from the forms themselves on 30 Oct 2026 (tax year 2025 to 2026, HMRC 12/25):
//   SA100  https://assets.publishing.service.gov.uk/media/69c14d07cfa346b9d4704a8d/SA100-2026.pdf
//   SA102  https://assets.publishing.service.gov.uk/media/69bd6a7a7e02b81c0d1c75ae/SA102-2026.pdf
//   SA103S https://assets.publishing.service.gov.uk/media/69c12ae013101e9908704a53/SA103S-2026.pdf (under 90,000 pounds turnover)
//   SA103F https://assets.publishing.service.gov.uk/media/69c2635b13101e9908704b36/SA103F_2026.pdf
//   Which cost goes in which box: SA103F notes 2026, pages SEFN 5-7.
// A later year's form can renumber things: returnPack marks its boxes confirmed: false until FORMS has that year.
// Whole pounds: the SA100 says to round income down and expenses and tax paid up ("it is to your benefit").
//
// The order of the walkthrough follows the paper form. HMRC does not publish its online screens, and they can change.
//
//   returnPack(view)   {year, confirmed, forms: [{form, title, sheet, rows: [{box, label, value, kind, note?}]}], flags: []}
//   walkSteps(view)    the guided "File my return" screens, one at a time
//   compareHmrc(view, total)  our figure against HMRC's, in plain words

const r2 = (x) => Math.round(x * 100) / 100;
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const down = (x) => Math.floor(num(x) + 1e-7);
const up = (x) => Math.ceil(num(x) - 1e-7);
const gbp0 = (x) => '£' + Math.round(x).toLocaleString('en-GB');
const gbpW = (x) => '£' + Math.round(num(x)).toLocaleString('en-GB');
const iso2uk = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '');

export const FORMS = Object.freeze({
  '2025-26': { year: 'Tax year 6 April 2025 to 5 April 2026', sa100: 'SA100 2026', sa102: 'SA102 2026', sa103s: 'SA103S 2026', sa103f: 'SA103F 2026', shortLimit: 90000, confirmed: true },
});
const formOf = (id) => FORMS[id] || { ...FORMS['2025-26'], year: `Tax year ${id}`, sa100: 'SA100', sa102: 'SA102', sa103s: 'SA103S', sa103f: 'SA103F', confirmed: false };
// SA103S and SA103F boxes for each cost, from the notes.
const BOX = {
  short: { goods: '11', travel: '12', staff: '13', premises: '14', repairs: '15', fees: '16', finance: '17', office: '18', ads: '19', other: '19', capital: '15' },
  full: { goods: '17', travel: '20', staff: '19', premises: '21', repairs: '22', office: '23', ads: '24', finance: '26', fees: '28', other: '30', capital: '22' },
};
const LABEL = {
  short: { 11: 'Costs of goods bought for resale or goods used', 12: 'Car, van and travel expenses', 13: 'Wages, salaries and other staff costs', 14: 'Rent, rates, power and insurance costs', 15: 'Repairs and maintenance of property and equipment', 16: 'Accountancy, legal and other professional fees', 17: 'Interest and bank and credit card financial charges', 18: 'Phone, fax, stationery and other office costs', 19: 'Other allowable business expenses' },
  full: { 17: 'Cost of goods bought for resale or goods used', 19: 'Wages, salaries and other staff costs', 20: 'Car, van and travel expenses', 21: 'Rent, rates, power and insurance costs', 22: 'Repairs and maintenance of property and equipment', 23: 'Phone, fax, stationery and other office costs', 24: 'Advertising and business entertainment costs', 26: 'Bank, credit card and other financial charges', 28: 'Accountancy, legal and other professional fees', 30: 'Other business expenses' },
};
const claimAmount = (c) => r2(num(c.amount) * (c.pct != null ? num(c.pct) : 100) / 100);

/** Costs by the form's box, for one self-employed period. */
function costsByBox(view, s, variant) {
  const by = {};
  const put = (box, v) => { if (v > 0) by[box] = r2((by[box] || 0) + v); };
  const traditional = (view.prefs || {}).basis === 'traditional';
  const first = view.sources.self[0];
  for (const c of view.claims) {
    if (c.item ? c.item !== s.id : s.id !== (first && first.id)) continue;
    if (c.cat === 'capital' && traditional) continue;
    put(BOX[variant][c.cat] || BOX[variant].other, claimAmount(c));
  }
  if (s.id === (first && first.id)) {
    put(BOX[variant].travel, num(view.simpleCosts.mileage));
    put(BOX[variant].premises, num(view.simpleCosts.wfh));
  }
  put(BOX[variant].other, num(s.typedCosts));   // a total typed by hand
  return by;
}
const capitalOf = (view, s) => {
  if ((view.prefs || {}).basis !== 'traditional') return 0;
  const first = view.sources.self[0];
  return view.claims.filter(c => c.cat === 'capital' && (c.item ? c.item === s.id : s.id === (first && first.id))).reduce((t, c) => t + claimAmount(c), 0);
};

/** The figures for the return, form by form. */
export function returnPack(view) {
  const F = formOf(view.year);
  const forms = [], flags = [];
  const P = view.position, jobs = view.sources.jobs, selves = view.sources.self, others = view.sources.other;
  const totalIn = selves.reduce((t, s) => t + num(s.income), 0);
  const useFull = totalIn >= F.shortLimit;
  if (!F.confirmed) flags.push(`These box numbers are from the 2025 to 2026 forms. HMRC can renumber boxes: check them against the ${view.yearLabel} form.`);

  const main = [];
  const add = (rows, box, label, value, kind = 'money', note) => { rows.push({ box, label, value, kind, ...(note ? { note } : {}) }); };
  add(main, 'TR2 1', 'Were you an employee, director or agency worker? Number of Employment pages', jobs.length ? `Yes, ${jobs.length}` : 'No', 'text');
  add(main, 'TR2 2', 'Self-employment? Number of businesses', selves.length ? `Yes, ${selves.length}` : 'No', 'text');
  const rent = others.filter(o => o.type === 'rental');
  if (rent.length) add(main, 'TR2 4', 'UK property', 'Yes', 'text', 'The UK property pages (SA105) are not in this pack. Box numbers not confirmed.');
  if ((view.gains || []).length) add(main, 'TR2 7', 'Capital Gains Tax summary', 'Yes', 'text', 'The Capital Gains summary (SA108) is not in this pack. Box numbers not confirmed.');
  const yearlyOf = (o) => num(o.inYear != null ? o.inYear : o.amount);
  const interest = others.filter(o => o.type === 'interest').reduce((t, o) => t + yearlyOf(o), 0);
  const dividends = others.filter(o => o.type === 'dividend').reduce((t, o) => t + yearlyOf(o), 0);
  const other = others.filter(o => o.type === 'other' || o.type === 'side').reduce((t, o) => t + yearlyOf(o), 0);
  if (interest) add(main, 'TR3 2', 'Untaxed UK interest', down(interest));
  if (dividends) add(main, 'TR3 4', 'Dividends from UK companies', down(dividends));
  if (other) add(main, 'TR3 17', 'Other taxable income, before expenses and tax taken off', down(other));
  const ex = view.extras || {};
  if (num(ex.pensionPaid)) add(main, 'TR4 1', 'Payments to pensions with relief at source: the payments and basic rate tax', up(num(ex.pensionPaid) / 0.8));
  if (num(ex.giftAid)) add(main, 'TR4 5', 'Gift Aid payments made in the year', up(ex.giftAid));
  if (P.hasLoan) {
    add(main, 'TR5 Student Loan 1', 'You have been told your repayments were due before the end of the year', 'X', 'text');
    const planTaken = jobs.reduce((t, j) => t + num(j.year && j.year.plan), 0), pgTaken = jobs.reduce((t, j) => t + num(j.year && j.year.pg), 0);
    if (planTaken) add(main, 'TR5 Student Loan 2', 'Student Loan repayments your employer took', up(planTaken));
    if (pgTaken) add(main, 'TR5 Student Loan 3', 'Postgraduate Loan repayments your employer took', up(pgTaken));
  }
  if (num(ex.childBenefit)) { add(main, 'TR5 HICBC 1', 'Total Child Benefit you and your partner got', down(ex.childBenefit)); if (num(ex.cbChildren)) add(main, 'TR5 HICBC 2', 'Number of children', num(ex.cbChildren), 'text'); }
  if (view.bill.owed > 0 && view.bill.owed < 3000 && jobs.length) add(main, 'TR6 2', 'You owe under £3,000. To pay it all in one go rather than through your tax code, put X here. Leave blank to have it collected through your pay.', 'Your choice', 'text');
  forms.push({ form: 'SA100', title: 'Your tax return', sheet: F.sa100, rows: main });

  for (const j of jobs) {
    const y = j.year || {};
    const rows = [];
    add(rows, '1', 'Pay from this employment, before tax', down(num(y.taxablePay)), 'money', 'Your P60 or P45 has the exact figure; use that if it is different.');
    if (num(j.summary && j.summary.before) > 0) flags.push(`Your earlier job, before ${j.name || 'this one'}, needs its own Employment page. Its pay and tax are on your P45.`);
    add(rows, '2', 'UK tax taken off pay in box 1', up(y.tax));
    add(rows, '4', 'PAYE tax reference of your employer', 'On your P60 or P45', 'text');
    add(rows, '5', "Your employer's name", j.name, 'text');
    if (j.main && num(view.bik) > 0) add(rows, '9 to 16', 'Work benefits. Copy each one from your P11D into its own box', gbpW(view.bik), 'text', 'The P11D gives each amount. This is the total you told Freeflo.');
    add(rows, '6', 'Were you a director of this company?', 'No, unless you were', 'text');
    add(rows, '7', 'Was this company a close company?', 'No, unless it was', 'text');
    forms.push({ form: 'SA102', title: `Employment: ${j.name}`, sheet: F.sa102, rows });
  }

  // One trading allowance a year, however many businesses: what one form uses, the next cannot.
  let allowanceLeft = view.trade && view.trade.used === 'allowance' ? up(view.trade.allowance) : 0;
  for (const s of selves) {
    const variant = useFull ? 'full' : 'short';
    const usesAllowance = view.trade && view.trade.used === 'allowance';
    const allowed = Math.min(allowanceLeft, down(s.income));
    allowanceLeft -= allowed;
    const byBox = usesAllowance ? {} : costsByBox(view, s, variant);
    const rows = [];
    const totalCosts = usesAllowance ? 0 : r2(Object.values(byBox).reduce((t, v) => t + v, 0));
    const capital = usesAllowance ? 0 : capitalOf(view, s);
    if (variant === 'short') {
      add(rows, '1', 'Description of business', s.name, 'text');
      add(rows, '5Q', 'Did this business start after the tax year began?', s.from && s.from >= (view.year.slice(0, 4) + '-04-06') ? `Yes, on ${iso2uk(s.from)} (box 5)` : 'No, unless it did', 'text');
      add(rows, '6Q', 'Did this business stop before the end of the tax year?', s.to && s.to <= `${Number(view.year.slice(0, 4)) + 1}-04-05` ? `Yes, on ${iso2uk(s.to)} (box 6)` : 'No, unless it did', 'text');
      add(rows, '9', 'Your turnover: the money your business earned', down(s.income));
      if (usesAllowance) add(rows, '10.1', 'Trading income allowance', allowed, 'money', 'With the allowance you leave the expense boxes empty.');
      for (const box of Object.keys(LABEL.short)) if (byBox[box]) add(rows, box, LABEL.short[box], up(byBox[box]), 'money', 'Under £90,000 you can put just the total in box 20 instead.');
      if (!usesAllowance) add(rows, '20', 'Total allowable expenses', up(totalCosts));
      const net = down(s.income) - (usesAllowance ? 0 : up(totalCosts));
      if (net >= 0) add(rows, '21', 'Net profit', net); else add(rows, '22', 'Net loss', -net);
      if (capital) add(rows, '23', 'Annual Investment Allowance', up(capital));
      const profit = Math.max(0, net - up(capital) - allowed);
      add(rows, '28', 'Net business profit for tax purposes', profit);
      add(rows, '31', 'Total taxable profits from this business', profit);
      if (profit < num(P.class2 && P.class2.spt)) add(rows, '36', 'To pay Class 2 National Insurance by choice, put X', 'Your choice', 'text', `Under ${gbp0(P.class2.spt)} profit you do not have to. It keeps your National Insurance record going, at ${gbp0(P.class2.year)} a year; a job with enough pay usually does that already.`);
      forms.push({ form: 'SA103S', title: `Self-employment (short): ${s.name}`, sheet: F.sa103s, rows });
    } else {
      add(rows, '2', 'Description of business', s.name, 'text');
      add(rows, '6Q', 'Did this business start after the tax year began?', s.from && s.from >= (view.year.slice(0, 4) + '-04-06') ? `Yes, on ${iso2uk(s.from)} (box 6)` : 'No, unless it did', 'text');
      add(rows, '7Q', 'Did this business stop before the end of the tax year?', s.to && s.to <= `${Number(view.year.slice(0, 4)) + 1}-04-05` ? `Yes, on ${iso2uk(s.to)} (box 7)` : 'No, unless it did', 'text');
      add(rows, '15', 'Your turnover', down(s.income));
      if (usesAllowance) add(rows, '16.1', 'Trading income allowance', allowed);
      for (const box of Object.keys(LABEL.full)) if (byBox[box]) add(rows, box, LABEL.full[box], up(byBox[box]));
      if (!usesAllowance) add(rows, '31', 'Total expenses', up(totalCosts));
      const net = down(s.income) - (usesAllowance ? 0 : up(totalCosts));
      if (net >= 0) add(rows, '47', 'Net profit', net); else add(rows, '48', 'Net loss', -net);
      if (capital) add(rows, '49', 'Annual Investment Allowance', up(capital));
      const profit = Math.max(0, net - up(capital) - allowed);
      add(rows, '64', 'Net business profit for tax purposes', profit);
      add(rows, '73', 'Adjusted profit', profit);
      add(rows, '76', 'Total taxable profits from this business', profit);
      forms.push({ form: 'SA103F', title: `Self-employment (full): ${s.name}`, sheet: F.sa103f, rows });
    }
  }
  return { year: view.year, label: view.yearLabel, confirmed: !!F.confirmed, sheetYear: F.year, forms, flags, ours: { owed: view.bill.owed, january: view.bill.january, july: view.bill.july, poaEach: view.bill.poa.first } };
}

/* ---------- File my return: one screen at a time ---------- */
const SIGN_IN = 'https://www.gov.uk/log-in-file-self-assessment-tax-return';   // the address the SA100 itself gives
/** One screen per step: what to look for, each figure with a Copy button and a tick. */
export function walkSteps(view, pack) {
  const P = pack || returnPack(view);
  const steps = [];
  const screen = (id, title, text, rows = [], o = {}) => steps.push({ id, title, text, rows, ...o });
  const row = (key, label, value, box) => ({ key, label, value: String(value), box: box || null });
  screen('start', 'Get ready', 'Have your P60 or P45 for each job with you. It takes about 20 minutes. Freeflo does not sign in or send anything: you do that on GOV.UK.', [], { link: { href: SIGN_IN, label: 'Sign in on GOV.UK' }, needsUtr: true });
  screen('about', 'About you', 'HMRC asks you to check your name, address and date of birth. Your UTR is your 10-digit taxpayer number, and your National Insurance number is on your payslip.', [], { ids: true });
  const tailor = P.forms.find(f => f.form === 'SA100');
  screen('tailor', 'Tell HMRC what to include', 'HMRC asks what kinds of income you had, which decides the screens that follow. Answer like this:', (tailor ? tailor.rows : []).filter(r => /^TR2/.test(r.box)).map(r => row(`tailor-${r.box}`, r.label, r.value, r.box)));
  for (const f of P.forms.filter(x => x.form === 'SA102')) screen(`job-${f.title}`, f.title, 'Copy each figure across. Check it against your P60: if the P60 is different, use the P60.', f.rows.map(r => row(`${f.title}-${r.box}`, r.label, r.kind === 'money' ? gbpW(r.value) : r.value, r.box)));
  for (const f of P.forms.filter(x => x.form === 'SA103S' || x.form === 'SA103F')) screen(`self-${f.title}`, f.title, f.form === 'SA103S' ? 'HMRC may ask whether your turnover was under £90,000: answer Yes to use these short screens.' : 'Your turnover was £90,000 or more, so these are the full screens.', f.rows.map(r => row(`${f.title}-${r.box}`, r.label, r.kind === 'money' ? gbpW(r.value) : r.value, r.box)));
  const rest = (tailor ? tailor.rows : []);
  const money = rest.filter(r => /^TR3/.test(r.box));
  if (money.length) screen('income', 'Interest, dividends and other income', 'Enter these under your income from savings and other UK income.', money.map(r => row(`m-${r.box}`, r.label, r.kind === 'money' ? gbpW(r.value) : r.value, r.box)));
  const reliefs = rest.filter(r => /^TR4/.test(r.box));
  if (reliefs.length) screen('reliefs', 'Pensions and charity', 'These lower your tax. Enter them under tax reliefs.', reliefs.map(r => row(`r-${r.box}`, r.label, gbpW(r.value), r.box)));
  const loans = rest.filter(r => /Student Loan/.test(r.box));
  if (loans.length) screen('loan', 'Student loan', 'Tell HMRC you are repaying, and how much your employers already took.', loans.map(r => row(`l-${r.box}`, r.label, r.kind === 'money' ? gbpW(r.value) : r.value, r.box)));
  const cb = rest.filter(r => /HICBC/.test(r.box));
  if (cb.length) screen('cb', 'Child Benefit', 'Enter the Child Benefit you and your partner received.', cb.map(r => row(`c-${r.box}`, r.label, r.kind === 'money' ? gbpW(r.value) : r.value, r.box)));
  const finish = rest.filter(r => /^TR6/.test(r.box));
  screen('finish', 'Before you send it', finish.length ? 'If you owe under £3,000 and have a job, HMRC can take it through your pay next year instead of one bill. You file by 30 December for that.' : 'Check anything HMRC flags, and look at its calculation before you send.', finish.map(r => row(`f-${r.box}`, r.label, r.value, r.box)));
  screen('compare', 'Compare HMRC\'s total with ours', 'Before you press Submit, HMRC shows its calculation. Type its total here. We flag any difference.', [], { compare: true, ours: P.ours });
  screen('submit', 'Send it', 'Submit on GOV.UK and note the reference it gives you. Then tell Freeflo below, and it plans the payment.', [], { record: true });
  return steps;
}
/** Our figure against HMRC's. Whole-pound rounding on the form can move it by a few pounds. */
export function compareHmrc(view, total) {
  const t = num(total), ours = view.bill.owed;
  const diff = r2(t - ours);
  if (Math.abs(diff) <= 5) return { same: true, diff, say: `HMRC's total matches ours (${gbp0(ours)}). Any small difference is from rounding to whole pounds.` };
  return { same: false, diff, say: `HMRC's total is ${gbp0(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than ours (${gbp0(ours)}).`, tips: [
    'Check each figure you typed against this list, especially pay and tax from your P60.',
    'HMRC may include tax owed from an earlier year or a coding adjustment, or leave out payments on account: its total may not be the same kind of total.',
    'If the bill includes a payment on account, compare it with ' + gbp0(view.bill.january) + ' instead.',
  ] };
}
