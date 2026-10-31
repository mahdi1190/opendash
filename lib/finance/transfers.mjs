// lib/finance/transfers.mjs - money moved between the user's OWN accounts
// (across banks and sources) is not spending.
//
// matchOwnTransfers(frame, {exclude, windowDays}) pairs an outgoing row in one
// account with an incoming row of exactly the same amount in a DIFFERENT
// account within `windowDays` days (closest date first, each row used once).
// Both rows become 'Internal transfers' (or the first excluded category whose
// name mentions transfers) with match 'own-transfer', so they drop out of
// spending, income and the charts. Rows already in an excluded category are
// paired too (so they are not paired again) but left as they are.
//
// A pair is found across EVERY stored row, also rows left out of the analysis (Your data), so
// a Barclays-to-Monzo payment stays a transfer on Monzo when Barclays is unticked. Each row
// keeps its other half in r.pair. `skip`: accounts that are copies of another one (their rows
// are the same payments, so they can never be the other half).
// Money in that fell to 'Income' only because it was positive (or the bank said so) is relabelled;
// money in from a rule or the user's own choice, and a regular payer that only happened to
// match an amount once or twice (a salary), stays Income.
//
// Every account in the store is the user's own (it came from their bank, a
// connected source or their CSV export), so no list of accounts is needed.
// Off by default in runPipeline (the Python parity check never sees it);
// lib/finance.mjs turns it on.

/**
 * Owed to me (lib/owed.mjs netPlan): money in that a friend paid you back stops being income, and comes off the payment
 * it paid back, so a £40 bowling you split 5 ways ends up as your £8. Only counted rows take part: a payment back on
 * an account left out of Your data changes nothing. A row of money in that sits in a spending category and belongs
 * to no payment (a refund) already takes itself off spending, so it stays as it is.
 * Mutates df; r.sb on money in that left income whole, r.sa + r.sbP on money in that left it in part, r.bk (pounds) on the payment. -> {sig, count, back} in pounds.
 */
export function applyOwedNet(df, plan, cat) {
  const out = { sig: (plan && plan.sig) || '', count: 0, back: 0 };
  const credits = plan && plan.credits;
  if (!credits || !out.sig) return out;
  const tc = transferCategory(cat.exclude);
  const byK = new Map(df.map(r => [r.k, r]));
  for (const [k, c] of Object.entries(credits)) {
    const r = byK.get(k);
    if (!r || r.p <= 0) continue;
    const linked = Object.values(c.payments).some(a => a > 0);
    if (!linked && !cat.exclude.has(r.category)) continue;
    // Part of it is nothing to do with this (a gift, or not related): that part stays what it was. r.sa: pounds paid back.
    // Measured against the row as it is now: money in that was pending can settle at another amount.
    const keepP = c.txa > 0 ? Math.max(0, r.p - Math.round(((Number(c.used) || 0) + (Number(c.over) || 0)) * 100)) : Math.round((Number(c.keep) || 0) * 100);
    if (keepP > 0 && keepP < r.p) {
      const backP = r.p - keepP;
      r.sbP = backP; r.sa = backP / 100;
      if (!cat.exclude.has(r.category)) { r.sp += backP; r.spend = r.sp / 100; }
    } else if (keepP < r.p || keepP === 0) { r.category = tc; r.match = 'owed-back'; r.spend = 0; r.sp = 0; r.sb = 1; }
    out.count++;
    for (const [pk, amount] of Object.entries(c.payments)) {
      const q = byK.get(pk);
      if (!q || q.p >= 0 || q.sp <= 0) continue;
      const take = Math.min(Math.round(amount * 100), q.sp);
      q.sp -= take; q.spend = q.sp / 100; q.bk = Math.round(((q.bk || 0) + take / 100) * 100) / 100;
      out.back += take;
    }
  }
  out.back = out.back / 100;
  return out;
}

export function transferCategory(exclude) {
  const list = [...(exclude || [])];
  return list.find(c => /^internal transfers?$/i.test(c)) || list.find(c => /transfer/i.test(c)) || 'Internal transfers';
}

/** Mutates matching frame rows; returns the number of pairs found. */
export function matchOwnTransfers(frame, { exclude = new Set(), windowDays = 3, minPence = 100, skip = null } = {}) {
  const cat = transferCategory(exclude);
  const ex = exclude instanceof Set ? exclude : new Set(exclude);
  const outs = [], ins = new Map();      // pence -> incoming rows
  for (const r of frame) {
    if (!r.account || Math.abs(r.p) < minPence || (skip && skip.has(r.account))) continue;
    if (r.p < 0) outs.push(r);
    else (ins.get(r.p) || ins.set(r.p, []).get(r.p)).push(r);
  }
  const used = new Set(), found = [];
  const payerIn = new Map(), payerPaired = new Map();
  for (const r of frame) if (r.p > 0 && r.category === 'Income') payerIn.set(r.merchant, (payerIn.get(r.merchant) || 0) + 1);
  let pairs = 0;
  // Oldest first, so a chain of transfers pairs in order.
  outs.sort((a, b) => a.n - b.n);
  for (const o of outs) {
    const cands = (ins.get(-o.p) || []).filter(i => !used.has(i) && i.account !== o.account && Math.abs(i.n - o.n) <= windowDays);
    if (!cands.length) continue;
    cands.sort((a, b) => Math.abs(a.n - o.n) - Math.abs(b.n - o.n) || a.n - b.n);
    const i = cands[0];
    used.add(i); used.add(o);
    pairs++;
    found.push([o, i]);
    if (i.category === 'Income') payerPaired.set(i.merchant, (payerPaired.get(i.merchant) || 0) + 1);
  }
  for (const [o, i] of found) {
    o.pair = i; i.pair = o;
    for (const r of [o, i]) {
      if (ex.has(r.category)) {
        if (r.category !== 'Income' || !['default', 'bank'].includes(r.match)) continue;
        const all = payerIn.get(r.merchant) || 0;
        if (all >= 3 && (payerPaired.get(r.merchant) || 0) / all < 0.5) continue;
      }
      r.category = cat;
      r.match = 'own-transfer';
      r.spend = 0; r.sp = 0;
    }
  }
  return pairs;
}
