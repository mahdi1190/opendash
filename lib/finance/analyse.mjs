// lib/finance/analyse.mjs - the spending analysis (analysis.json), a port of
// spend.py's build_frame / find_recurring / flags_for / analyse.
//
//   buildFrame(rows, categoriser, bankCategories) -> rows with merchant, category, spend...
//   findRecurring(frame, exclude)                 -> recurring payments
//   flagsFor(frame, start, end, recurring)        -> "worth a look" flags
//   analyse(frame, todayIso, categoriser, opts)   -> the analysis object
//
// Sums are done in whole pence (exact), which is what spend.py's rounded
// float sums come to. Ties are broken the stable way: rows keep their
// (date, memo) order, as Python's sorted() and a stable pandas sort give.
// Dates are calendar days (numbers of days since 1970-01-01).

import { stableKeys, rowKeyStr, sortRows } from './store.mjs';
import { cleanMerchant, niceTitle } from './categorise.mjs';
import { pyRound, pyFixed, pySlice, cmpStr, dayNum, isoOf, weekday, strftime } from './pycompat.mjs';

const pence = (x) => Math.round(x * 100);
const fromPence = (p) => p / 100;

// numpy's float64 sum (what pandas Series.sum() does): 0.0 + pairwise sum with
// 8 accumulators per 128-element block. Only needed where spend.py uses an
// unrounded sum (the weekly average), so a tie at half a penny rounds the same way.
function pairwise(a, lo, n) {
  if (n < 8) { let r = -0.0; for (let i = 0; i < n; i++) r += a[lo + i]; return r; }
  if (n <= 128) {
    const r = a.slice(lo, lo + 8);
    let i = 8;
    for (; i < n - (n % 8); i += 8) for (let j = 0; j < 8; j++) r[j] += a[lo + i + j];
    let res = ((r[0] + r[1]) + (r[2] + r[3])) + ((r[4] + r[5]) + (r[6] + r[7]));
    for (; i < n; i++) res += a[lo + i];
    return res;
  }
  let n2 = Math.floor(n / 2); n2 -= n2 % 8;
  return pairwise(a, lo, n2) + pairwise(a, lo + n2, n - n2);
}
export const npSum = (a) => 0.0 + pairwise(a, 0, a.length);

// Python's built-in sum() of floats (3.12+): Neumaier compensated summation.
export function pySum(a) {
  if (!a.length) return 0;
  let f = 0 + a[0], c = 0;
  for (let i = 1; i < a.length; i++) {
    const x = a[i], t = f + x;
    if (Math.abs(f) >= Math.abs(x)) c += (f - t) + x; else c += (x - t) + f;
    f = t;
  }
  return c && Number.isFinite(c) ? f + c : f;
}

function median(vals) {
  if (!vals.length) return NaN;
  const s = [...vals].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Group rows by a key, keys in Python sort order, rows in their original order. */
function groupBy(rows, keyFn, cmp = cmpStr) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return [...m.entries()].sort((a, b) => cmp(a[0], b[0]));
}
const byDate = (rows) => rows.map((r, i) => [r, i]).sort((a, b) => a[0].n - b[0].n || a[1] - b[1]).map(x => x[0]);

/** Every stored row with its merchant, category, spend and key. */
export function buildFrame(rows, cat, bank = {}) {
  const sorted = sortRows(rows);
  const keys = stableKeys(sorted);
  const out = sorted.map((r, i) => {
    const bc = Object.prototype.hasOwnProperty.call(bank, rowKeyStr(r)) ? bank[rowKeyStr(r)] : null;
    const amount = Number(r.amount);
    const merchant = cleanMerchant(r.memo);
    const [category, match] = cat.categorise(r.memo, merchant, amount, r.subcategory, bc);
    const excluded = cat.exclude.has(category);
    return {
      date: r.date, n: dayNum(r.date), amount, p: pence(amount), account: r.account == null ? '' : String(r.account),
      subcategory: r.subcategory == null ? '' : String(r.subcategory), memo: String(r.memo), source: r.source,
      k: keys[i], bc, merchant, category, match,
      spend: excluded ? 0 : -amount, sp: excluded ? 0 : -pence(amount), month: r.date.slice(0, 7),
    };
  });
  return byDate(out);
}

/** Merchants charged at a roughly monthly (or weekly/annual) rhythm with a stable amount. */
export function findRecurring(df, exclude = []) {
  const skip = new Set(['Groceries', 'Eating out', 'Cash', 'Internal transfers', 'Shopping', 'Transport', 'Entertainment', 'Income', ...exclude]);
  const debits = df.filter(r => r.amount < 0 && !skip.has(r.category));
  const out = [];
  for (const [merchant, g0] of groupBy(debits, r => r.merchant)) {
    if (g0.length < 2) continue;
    const g = byDate(g0);
    const gaps = []; for (let i = 1; i < g.length; i++) gaps.push(g[i].n - g[i - 1].n);
    const amts = g.map(r => -r.amount);
    const medGap = median(gaps);
    let freq, perMonth;
    if (medGap >= 25 && medGap <= 35) { freq = 'monthly'; perMonth = 1.0; }
    else if (medGap >= 6 && medGap <= 8) { freq = 'weekly'; perMonth = 52 / 12; }
    else if (medGap >= 350 && medGap <= 380) { freq = 'annual'; perMonth = 1 / 12; }
    else continue;
    const last = amts[amts.length - 1];
    const tail = amts.slice(-3);
    const stable = !((Math.max(...tail) - Math.min(...tail)) > Math.max(1.0, 0.2 * median(tail)));
    if (!stable && freq !== 'monthly') continue;
    out.push({
      merchant: niceTitle(merchant),
      category: g[g.length - 1].category,
      frequency: freq,
      last_amount: pyRound(last, 2),
      monthly_cost: pyRound(last * perMonth, 2),
      first_seen: g[0].date,
      last_seen: g[g.length - 1].date,
      count: g.length,
      amount_varies: !stable,
    });
  }
  return out.map((r, i) => [r, i]).sort((a, b) => b[0].monthly_cost - a[0].monthly_cost || a[1] - b[1]).map(x => x[0]);
}

/** The "worth a look" list for the period [start, end] (day numbers). */
export function flagsFor(df, start, end, recurring, { symbol = '£' } = {}) {
  const flags = [];
  const period = df.filter(r => r.n >= start && r.n <= end);
  const hist = df.filter(r => r.n < start);
  const spend = period.filter(r => r.spend > 0);
  const dm = (n) => strftime(n, '%d %b');
  // Large one-offs vs that category's typical transaction.
  for (const r of spend) {
    const h = hist.filter(x => x.category === r.category && x.spend > 0).map(x => x.spend);
    const typical = h.length >= 5 ? median(h) : null;
    const big = r.spend >= 250 || (typical && r.spend >= Math.max(60, 4 * typical));
    if (big) {
      const why = typical && r.spend >= 4 * typical
        ? `about ${pyFixed(r.spend / typical, 0)}x your usual ${r.category.toLowerCase()} transaction` : 'large payment';
      flags.push({ kind: 'Large spend', severity: 'warn', date: r.date, merchant: niceTitle(r.merchant), amount: pyRound(r.spend, 2), note: why });
    }
  }
  // Possible duplicates: same merchant and amount within a day.
  const s = byDate(spend);
  const groups = groupBy(s, r => JSON.stringify([r.merchant, r.spend]), (a, b) => {
    const [ma, sa] = JSON.parse(a), [mb, sb] = JSON.parse(b);
    return cmpStr(ma, mb) || (sa < sb ? -1 : sa > sb ? 1 : 0);
  });
  for (const [key, g] of groups) {
    if (g.length < 2) continue;
    const [m, a] = JSON.parse(key);
    const d = g.map(r => r.n).sort((x, y) => x - y);
    for (let i = 1; i < d.length; i++) {
      if (d[i] - d[i - 1] <= 1 && a >= 5) {
        flags.push({
          kind: 'Possible duplicate', severity: 'warn', date: isoOf(d[i]), merchant: niceTitle(m), amount: pyRound(a, 2),
          note: d[0] === d[d.length - 1] ? `charged ${g.length} times on ${dm(d[0])}` : `charged ${g.length} times between ${dm(d[0])} and ${dm(d[d.length - 1])}`,
        });
        break;
      }
    }
  }
  // New recurring payments (first seen in the last 70 days and charged in this period).
  for (const r of recurring) {
    const first = dayNum(r.first_seen), last = dayNum(r.last_seen);
    if (first >= end - 70 && start <= last && last <= end) {
      flags.push({ kind: 'New recurring payment', severity: 'info', date: r.last_seen, merchant: r.merchant, amount: r.last_amount, note: `${r.frequency}, about ${symbol}${pyFixed(r.monthly_cost, 2)} a month` });
    }
  }
  // Price rises on recurring payments.
  for (const [merchant, g0] of groupBy(df.filter(r => r.amount < 0), r => r.merchant)) {
    const g = byDate(g0);
    const lastN = g[g.length - 1].n;
    if (g.length >= 3 && start <= lastN && lastN <= end) {
      const nt = niceTitle(merchant);
      if (recurring.some(r => nt === r.merchant && !r.amount_varies)) {
        const prev = -g[g.length - 2].amount, now = -g[g.length - 1].amount;
        if (now > prev * 1.05 && now - prev >= 0.5) {
          flags.push({ kind: 'Price rise', severity: 'warn', date: g[g.length - 1].date, merchant: nt, amount: pyRound(now, 2), note: `up from ${symbol}${pyFixed(prev, 2)}` });
        }
      }
    }
  }
  // Uncategorised.
  for (const [m, g] of groupBy(period.filter(r => r.category === 'Uncategorised'), r => r.merchant)) {
    flags.push({
      kind: 'Uncategorised', severity: 'info', date: isoOf(Math.max(...g.map(r => r.n))), merchant: niceTitle(m),
      amount: pyRound(fromPence(g.reduce((t, r) => t + r.sp, 0)), 2), note: `${g.length} transaction(s); raw: ${pySlice(g[0].memo, 60)}`,
    });
  }
  const order = { 'Possible duplicate': 0, 'Large spend': 1, 'Price rise': 2, 'New recurring payment': 3, 'Uncategorised': 4 };
  return flags.map((f, i) => [f, i]).sort((a, b) => ((order[a[0].kind] ?? 9) - (order[b[0].kind] ?? 9)) || cmpStr(a[0].date, b[0].date) || a[1] - b[1]).map(x => x[0]);
}

/** Months between: day number of the 1st of (month of n) shifted by k months. */
function monthShift(n, k) {
  const d = new Date(n * 864e5);
  return Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, 1) / 864e5);
}
function localStamp(now = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`;
}

/** The analysis object (analysis.json minus sample/balances). */
export function analyse(df, todayIso, cat, opts = {}) {
  const today = dayNum(todayIso);
  const sunday = today - ((weekday(today) + 1) % 7);
  const wkEnd = sunday, wkStart = wkEnd - 6;
  const minN = Math.min(...df.map(r => r.n)), latest = Math.max(...df.map(r => r.n));
  const sp = df.filter(r => r.sp !== 0);
  const totalP = (a, b) => { let t = 0; for (const r of sp) if (r.n >= a && r.n <= b) t += r.sp; return t; };
  const total = (a, b) => fromPence(totalP(a, b));
  const totalF = (a, b) => npSum(sp.filter(r => r.n >= a && r.n <= b).map(r => r.spend));

  const weekTotal = total(wkStart, wkEnd);
  const prevWeeks = []; for (let i = 1; i <= 8; i++) prevWeeks.push(totalF(wkStart - 7 * i, wkEnd - 7 * i));
  const haveHist = prevWeeks.filter((w, i) => (wkStart - 7 * (i + 1)) >= minN);
  const avgWeek = haveHist.length ? pySum(haveHist) / haveHist.length : null;

  const mStart = monthShift(today, 0);
  const lmEndFull = mStart - 1;
  const lmStart = monthShift(lmEndFull, 0);
  const dayOfMonth = today - mStart + 1;
  const lmSame = Math.min(lmStart + dayOfMonth - 1, lmEndFull);
  const mtd = total(mStart, today), lmToDate = total(lmStart, lmSame), lmFull = total(lmStart, lmEndFull);

  const sortDesc = (entries) => entries.map((e, i) => [e, i]).sort((a, b) => b[0][1] - a[0][1] || a[1] - b[1]).map(x => x[0]);
  const byCat = (a, b) => {
    const m = new Map();
    for (const r of sp) if (r.n >= a && r.n <= b) m.set(r.category, (m.get(r.category) || 0) + r.sp);
    const entries = [...m.entries()].sort((x, y) => cmpStr(x[0], y[0]));
    const o = {};
    for (const [k, v] of sortDesc(entries)) if (Math.abs(v) >= 1) o[k] = fromPence(v);
    return o;
  };

  const recurring = findRecurring(df, cat ? [...cat.exclude] : []);
  const flags = flagsFor(df, wkStart, wkEnd, recurring, opts);

  const months = [...new Set(sp.map(r => r.month))].sort(cmpStr).slice(-12);
  const catTotals = new Map();
  for (const r of sp) catTotals.set(r.category, (catTotals.get(r.category) || 0) + r.sp);
  const catsOrder = sortDesc([...catTotals.entries()].sort((x, y) => cmpStr(x[0], y[0]))).map(e => e[0]);
  const monthly = {};
  for (const c of catsOrder) {
    monthly[c] = months.map(m => { let t = 0; for (const r of sp) if (r.month === m && r.category === c) t += r.sp; return fromPence(t); });
  }
  const weeks = [];
  for (let i = 15; i >= 0; i--) {
    const a = wkStart - 7 * i, b = wkEnd - 7 * i;
    if (b < minN) continue;
    weeks.push({ week: isoOf(a), total: total(a, b) });
  }
  const threeMo = [];
  for (let i = 1; i <= 3; i++) {
    const a = monthShift(mStart, -i);
    const b = monthShift(mStart, -(i - 1)) - 1;
    if (b >= minN) threeMo.push(byCat(a, b));
  }
  const avg3 = {};
  for (const c of catsOrder) {
    const vals = threeMo.map(d => (c in d ? d[c] : 0.0));
    avg3[c] = vals.length ? pyRound(pySum(vals) / vals.length, 2) : 0.0;
  }

  // Every stored transaction, newest first (the page filters by date itself).
  const allrows = df.map((r, i) => [r, i]).sort((a, b) => b[0].n - a[0].n || cmpStr(a[0].k, b[0].k) || a[1] - b[1]).map(x => x[0]);
  const tx = allrows.map(r => ({
    d: r.date, m: niceTitle(r.merchant), c: r.category, a: pyRound(r.amount, 2), acct: r.account, memo: pySlice(r.memo, 140),
    how: r.match, bc: typeof r.bc === 'string' && r.bc ? r.bc : null, k: r.k,
  }));
  const categories = new Set(df.map(r => r.category));
  if (cat) for (const c of cat.categories()) categories.add(c);
  const exclude = cat ? [...cat.exclude].sort(cmpStr) : ['Income', 'Internal transfers'];
  const byHow = {};
  for (const r of df) byHow[r.match] = (byHow[r.match] || 0) + 1;
  let incomeP = 0; for (const r of df) if (r.n >= mStart && r.category === 'Income') incomeP += r.p;

  return {
    generated: opts.generated || localStamp(),
    today: isoOf(today),
    latest_transaction: isoOf(latest),
    stale_days: today - latest,
    week: {
      start: isoOf(wkStart), end: isoOf(wkEnd), total: pyRound(weekTotal, 2),
      avg_prev: avgWeek != null ? pyRound(avgWeek, 2) : null, by_category: byCat(wkStart, wkEnd),
    },
    month: {
      label: strftime(mStart, '%B %Y'), mtd: pyRound(mtd, 2), last_month_label: strftime(lmStart, '%B'),
      last_month_to_date: pyRound(lmToDate, 2), last_month_full: pyRound(lmFull, 2),
      by_category: byCat(mStart, today), last_by_category: byCat(lmStart, lmEndFull), avg3_by_category: avg3,
    },
    income_month: fromPence(incomeP),
    months, monthly, weeks,
    recurring, recurring_monthly_total: pyRound(pySum(recurring.map(r => r.monthly_cost)), 2),
    flags,
    uncategorised_merchants: [...new Set(flags.filter(f => f.kind === 'Uncategorised').map(f => f.merchant.toUpperCase()))].sort(cmpStr),
    transactions: tx,
    counts: { total: df.length, by_how: Object.fromEntries(Object.entries(byHow).sort((a, b) => b[1] - a[1])) },
    categories: [...categories].map((c, i) => [c, i]).sort((a, b) => cmpStr(a[0].toLowerCase(), b[0].toLowerCase()) || a[1] - b[1]).map(x => x[0]),
    exclude_from_spending: exclude,
  };
}
