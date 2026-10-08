// lib/fin-connect/overlap.mjs - "is this new account one we already have?"
// (design 3.2 "Dedupe across providers").
//
// After the first sync of a new direct account its last 60 days are compared,
// by date and amount, with every other account already in the store (the same
// test lib/finance/pipeline.mjs crossAccountOverlap uses for CSV uploads). When
// more than 60% of its payments match one other account (Monzo through Aureli
// and Monzo direct, say), the new account starts hidden with a "Possible
// duplicate" note, so nothing is counted twice. The user's choice wins and is
// remembered on the account (dupChoice).
//
//   findDuplicates(fresh, stored, {today, days, threshold, minRows})
//     fresh  = [{accountId: '<sourceId>.<acc>', date, pence}]   the new rows
//     stored = [{account, date, amount}]                         transactions.csv rows
//     -> [{accountId, duplicateOf, share, rows}]
//
// Pure; no I/O.

const DAY = 86400000;
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);

export function findDuplicates(fresh, stored, { today, days = 60, threshold = 0.6, minRows = 5 } = {}) {
  const end = today || [...(fresh || [])].map(r => r.date).sort().pop();
  if (!end) return [];
  const since = addDays(end, -days);
  const byAcct = new Map();
  for (const r of fresh || []) {
    if (!r || !r.accountId || r.date < since || r.date > end) continue;
    if (!byAcct.has(r.accountId)) byAcct.set(r.accountId, []);
    byAcct.get(r.accountId).push(`${r.date}|${Math.round(Number(r.pence))}`);
  }
  // One multiset of date|pence per stored account.
  const pools = new Map();
  for (const r of stored || []) {
    if (!r || !r.account || r.date < since || r.date > end) continue;
    const k = `${r.date}|${Math.round(Number(r.amount) * 100)}`;
    if (!pools.has(r.account)) pools.set(r.account, new Map());
    const p = pools.get(r.account);
    p.set(k, (p.get(k) || 0) + 1);
  }
  const out = [];
  for (const [acct, keys] of byAcct) {
    if (keys.length < minRows) continue;
    let best = null;
    for (const [other, pool] of pools) {
      if (other === acct) continue;
      const left = new Map(pool);
      let matched = 0;
      for (const k of keys) { const n = left.get(k) || 0; if (n > 0) { matched++; left.set(k, n - 1); } }
      const share = matched / keys.length;
      if (!best || share > best.share) best = { other, share };
    }
    if (best && best.share > threshold) out.push({ accountId: acct, duplicateOf: best.other, share: Math.round(best.share * 100) / 100, rows: keys.length });
  }
  return out;
}
