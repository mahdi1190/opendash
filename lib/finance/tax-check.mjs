// lib/finance/tax-check.mjs - "check this": calm notes about things on the Tax tab that look unusual, without being asked.
// Pure: no I/O, no clock. Each note says what looks odd in plain words, may carry one tap to put it right (fix: a tax_change
// change, applied with Undo), and can be dismissed ("That is right", kept in the year's dismissed list under check:<id>).
//
//   looksOff({person, items, rec, parts, year}) -> [{id, title, text, fix?: {label, change}, open?: jobId, keep}]
//
// A note never blocks anything and never changes a figure by itself.

import { parseTaxCode } from './uk-tax.mjs';

const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const gbp0 = (x) => '£' + Math.round(num(x)).toLocaleString('en-GB');
const same = (a, b) => num(a) > 0 && Math.abs(num(a) - num(b)) < 0.005;

export function looksOff({ person, items, rec, parts, year }) {
  const out = [];
  const gone = (id) => !!((rec && rec.dismissed) || {})['check:' + id];
  const add = (n) => { if (!gone(n.id)) out.push({ keep: 'That is right', ...n }); };
  const ap = parts;
  const jobsIn = (items || []).filter(i => i.kind === 'income' && i.incomeType === 'job' && i.status !== 'no' && !i.paused);

  // Blind Person's Allowance is a big, rare addition.
  if (person.blind && ap.override == null) {
    add({ id: 'blind', title: 'Blind Person’s Allowance is switched on', text: `It adds ${gbp0(ap.blindAmount)} to your tax-free amount, so it is ${gbp0(ap.total)} instead of ${gbp0(ap.total - ap.blindAmount)}. Only people registered as blind or severely sight impaired get it. Is that right?`, fix: { label: 'No, turn it off', change: { action: 'answers.set', fields: { blind: false } } } });
  } else if (ap.override == null) {
    // The main job's tax code says one tax-free amount, the answers work out another.
    const main = person.jobs.find(j => j.main) || person.jobs[0];
    const code = main && String(main.taxCode || '').trim() ? parseTaxCode(main.taxCode, person.region) : null;
    if (code && code.kind === 'allowance') {
      const ours = ap.workedOut - ap.bik + (ap.marriage === 'get' ? ap.marriageAmount : 0);
      if (Math.abs(ours - code.amount) >= 50) {
        const theirs = Math.floor(code.amount / 10) * 10;
        add({ id: 'code', title: 'Your tax code and your tax-free amount differ', text: `Your tax code ${code.text} means about ${gbp0(theirs)} is tax-free, but Freeflo works out ${gbp0(ours)} from your answers. HMRC may know something we do not. Which is right?`, fix: { label: `Use my tax code’s ${gbp0(theirs)}`, change: { action: 'answers.set', fields: { allowanceOverride: theirs, allowanceNote: `From tax code ${code.text}` } } } });
      }
    }
  }

  // A job with nothing in it.
  for (const j of jobsIn) {
    const name = j.name || 'A job';
    const pay = num(j.annual) > 0 || num(j.payslipGross) > 0 || (Array.isArray(j.payments) && j.payments.length) || (j.ytd && num(j.ytd.pay) > 0) || num(j.prevPay) > 0 || num(j.net) > 0;
    if (!pay) add({ id: 'nopay:' + j.id, title: `${name} has no pay in it`, text: 'It adds nothing to your sums. Add its pay, or take it out if it is not a real job.', open: j.id, fix: { label: 'Take it out', change: { action: 'source.remove', id: j.id } } });
  }

  // Two jobs with one name.
  const byName = new Map();
  for (const j of jobsIn) { const k = String(j.name || '').trim().toLowerCase(); if (k) byName.set(k, [...(byName.get(k) || []), j]); }
  for (const [k, list] of byName) if (list.length > 1) add({ id: 'dup:' + k, title: `Two jobs are both called “${list[0].name}”`, text: 'Is one of them a copy? Tax is worked out job by job, so a copy can make your tax-free amount and your tax look wrong.', open: list[1].id, fix: { label: 'Take out the second one', change: { action: 'source.remove', id: list[1].id } } });

  // Pay so far that looks copied from another job.
  for (let b = 1; b < jobsIn.length; b++) {
    for (let a = 0; a < b; a++) {
      const A = jobsIn[a], B = jobsIn[b];
      if (A.ytd && B.ytd && same(A.ytd.pay, B.ytd.pay) && same(A.ytd.tax || 0.01, B.ytd.tax || 0.01) && A.ytd.asOf === B.ytd.asOf) {
        add({ id: 'copy:' + B.id, title: `${B.name || 'A job'} shows the same pay so far as ${A.name || 'another job'}`, text: `Both say ${gbp0(A.ytd.pay)} so far. Two jobs rarely pay exactly the same, so one may have been copied by mistake.`, open: B.id, fix: { label: `Clear it from ${B.name || 'this job'}`, change: { action: 'source.update', id: B.id, fields: { ytd: null } } } });
        break;
      }
      if (same(A.prevPay, B.prevPay) && same(A.prevTax || 0.01, B.prevTax || 0.01)) {
        add({ id: 'copyp:' + B.id, title: `${B.name || 'A job'} shows the same earlier pay as ${A.name || 'another job'}`, text: `Both say ${gbp0(A.prevPay)} before the job. One may have been copied by mistake.`, open: B.id, fix: { label: `Clear it from ${B.name || 'this job'}`, change: { action: 'source.update', id: B.id, fields: { prevPay: null, prevTax: null } } } });
        break;
      }
    }
  }

  // Figures that are saved but left out of the sums.
  for (const j of jobsIn) {
    const live = person.jobs.find(x => x.id === j.id);
    if (!live) continue;
    const name = j.name || 'A job';
    if (num(j.prevPay) > 0 && !(num(live.prevPay) > 0)) add({ id: 'p45:' + j.id, title: `${name}: pay before this job is not counted`, text: 'Pay from an earlier job (a P45) only counts when this job has a first day inside the tax year. Add the first day.', open: j.id });
    const follows = person.jobs.find(o => o.id !== j.id && o.end && live.start && o.end < live.start);
    if (num(live.prevPay) > 0 && follows) add({ id: 'twice:' + j.id, title: `${name}: your earlier pay may be counted twice`, text: `${follows.name || 'Your earlier job'} is on your list too, so Freeflo already counts its pay. The pay before this job, from your P45, is only needed for a job that is not on your list.`, open: j.id, fix: { label: `Clear it from ${name}`, change: { action: 'source.update', id: j.id, fields: { prevPay: null, prevTax: null } } } });
    if (j.ytd && j.ytd.asOf && !live.ytd) add({ id: 'ytd:' + j.id, title: `${name}: the pay so far is for a different tax year`, text: `The payslip date ${j.ytd.asOf} is not inside ${year}, so those figures are left out. Check the date.`, open: j.id });
    if (live.ytd && live.ytd.asOf && Array.isArray(live.payments) && live.payments.some(p => p.date <= live.ytd.asOf)) {
      add({ id: 'late:' + j.id, title: `${name}: some payments are before your pay-so-far date`, text: 'They are already inside the pay so far, so Freeflo leaves them out.', fix: { label: 'Take those out of the list', change: { action: 'source.update', id: j.id, fields: { payments: live.payments.filter(p => p.date > live.ytd.asOf) } } } });
    }
  }
  return out;
}
