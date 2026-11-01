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

/**
 * What actually came, against what Freeflo expected: the owner, 1 Nov 2026: "realise this and be like oh you got more than expected, was it a bonus? was it pension not being taken out?"
 * jobs: [{id, name, taxCode, periods}] (uk-tax periods), payslips: the year's saved ones, tx: the bank's rows {d, a, c}. A payslip says why; without one the bank says only how much.
 * Each payday is asked about once (dismissed under check:pay:<job>:<date>). Never changes a figure.
 */
export function payLooksOff({ jobs, payslips, tx, today, gone }) {
  const out = [], tol = (x) => Math.max(25, num(x) * 0.03), dayN = (d) => Date.parse(String(d).slice(0, 10) + 'T12:00:00Z') / 864e5;
  const dmy = (d) => new Date(String(d).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const when = (p) => p.date || p.to;
  const only = jobs.length === 1;
  for (const j of jobs) {
    const paid = (j.periods || []).filter(p => p.on && num(p.gross) > 0 && when(p));
    if (!paid.length) continue;
    const nearest = (d, within) => { let best = null, bd = within + 1; for (const p of paid) { const g = Math.abs(dayN(when(p)) - dayN(d)); if (g < bd) { bd = g; best = p; } } return best; };
    const slips = (payslips || []).filter(s => s && s.payDate && num(s.net) > 0 && (s.job === j.id || (only && !s.job))).sort((a, b) => String(b.payDate).localeCompare(String(a.payDate)));
    const name = j.name || 'Your job';
    const slip = slips[0], sp = slip ? nearest(slip.payDate, 16) : null;
    if (slip && sp) {
      const diff = num(slip.net) - num(sp.takeHome);
      const penWant = num(sp.pensionFromPay) + (num(sp.sacrifice) > 0 ? num(sp.sacrifice) : 0), penHad = num(slip.pension);
      const code = String(slip.code || '').trim().toUpperCase(), ours = String(j.taxCode || '').trim().toUpperCase();
      const newCode = !!code && !!ours && code !== ours;
      if (Math.abs(diff) <= tol(sp.takeHome) && !newCode) continue;
      const id = 'pay:' + j.id + ':' + slip.payDate;
      if (gone(id)) continue;
      const why = [];
      const gd = slip.gross != null ? num(slip.gross) - num(sp.gross) : 0;
      if (penWant > 1 && penHad < 1) why.push(`No pension came out, and Freeflo expected about ${gbp0(penWant)}. If it starts later, tell Freeflo the date.`);
      if (penHad > 1 && penWant < 1) why.push(`${gbp0(penHad)} went to a pension Freeflo did not know about.`);
      if (gd > tol(sp.gross)) why.push(`Your pay before tax was ${gbp0(gd)} more than usual, which looks like a bonus, overtime or back pay.`);
      if (gd < -tol(sp.gross)) why.push(`Your pay before tax was ${gbp0(-gd)} less than usual, which usually means a part month or unpaid time off.`);
      if (newCode) why.push(`Your payslip shows tax code ${code}, and Freeflo has ${ours}.`);
      if (!why.length) why.push(diff > 0 ? 'It could be a bonus, a tax code change or something not taken out this time.' : 'It could be a new deduction or a tax code change.');
      const more = diff > 0, size = Math.abs(diff) > tol(sp.takeHome);
      out.push({ id, title: size ? `${name}: ${gbp0(Math.abs(diff))} ${more ? 'more' : 'less'} than expected on ${dmy(slip.payDate)}` : `${name}: your tax code may have changed`, text: `Your payslip says ${gbp0(slip.net)} reached you. Freeflo expected about ${gbp0(sp.takeHome)}. ${why.join(' ')}`, keep: 'That is fine',
        ...(newCode ? { fix: { label: `Use tax code ${code}`, change: { action: 'source.update', id: j.id, fields: { taxCode: code } } } } : {}), open: j.id,
        choices: more ? ['A bonus or one-off', ...(penWant > 1 ? ['Pension not started yet'] : []), 'Something else'] : ['A part month or time off', 'Something new came out', 'Something else'] });
      continue;
    }
    // no payslip for it: what reached the bank, around the latest payday that has passed
    const past = paid.filter(p => when(p) <= today).slice(-1)[0];
    if (!past || (today && dayN(today) - dayN(when(past)) > 40)) continue;
    const id = 'pay:' + j.id + ':' + when(past);
    if (gone(id)) continue;
    let hit = null, hd = 1e9;
    for (const r of tx || []) {
      if (!r || !(num(r.a) > 0) || r.c !== 'Income' || !r.d) continue;
      const g = Math.abs(dayN(r.d) - dayN(when(past)));
      if (g > 5) continue;
      const ratio = num(r.a) / Math.max(1, num(past.takeHome));
      if (ratio < 0.5 || ratio > 2) continue;   // (something else that came in)
      const score = Math.abs(num(r.a) - num(past.takeHome)) + g;
      if (score < hd) { hd = score; hit = r; }
    }
    if (!hit) continue;
    const diff = num(hit.a) - num(past.takeHome);
    if (Math.abs(diff) <= tol(past.takeHome)) continue;
    const pen = num(past.pensionFromPay) > 1 && diff > 0 ? ` If your pension has not started yet, that would explain about ${gbp0(past.pensionFromPay)} of it.` : '';
    out.push({ id, title: `${name}: ${gbp0(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than expected on ${dmy(hit.d)}`, text: `${gbp0(hit.a)} came into your bank, and Freeflo expected about ${gbp0(past.takeHome)}.${pen} ${diff > 0 ? 'It could be a bonus, overtime or something not taken out this time.' : 'It could be a part month, time off or a new deduction.'} Adding the payslip would show exactly why.`, keep: 'That is fine', open: j.id,
      choices: diff > 0 ? ['A bonus or one-off', ...(num(past.pensionFromPay) > 1 ? ['Pension not started yet'] : []), 'Something else'] : ['A part month or time off', 'Something new came out', 'Something else'] });
  }
  return out;
}
