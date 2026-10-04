  // @part 25-money-model.js · NEW (3 Oct 2026) · OWNER: O (Overview money brief). Pure model: no DOM and no other part's helpers, because lib/finance/brief.mjs evaluates this same file in Node.
  // ── Money brief model (MBM) ───────────────────────────────────────────
  // The analysis behind the Overview's "Money brief": the pay cycle (or the
  // calendar month when no salary is found), the usual pace (median and
  // p25-p75 of earlier cycles by day), the mood of the money, a projection,
  // the bills before payday, safe to spend a day, the movers, insight cards
  // and "your money in three sentences" (a deterministic template). The page
  // (30-overview.js) and the server's optional AI rewrite (GET
  // /api/finance/brief, lib/finance/brief.mjs) run the SAME code, so the
  // numbers an AI sentence is checked against are the numbers on screen.
  //
  //   MBM.fromAnalysis(a, {today})      analysis.json -> input (rows as buildModel makes them)
  //   MBM.recurring(tx, pipeline, anchor)   recurring payments (the rules of 02-model.js detectRecurring)
  //   MBM.salary(tx, anchor)            the regular salary {m, days, gap, dom, amount} | null
  //   MBM.cycleOf(anchor, mode, sal, minN)   {mode, start, next, len, day, daysLeft, prev:[{start,next}]}
  //   MBM.curve(tx, start, len, upTo)   cumulative spending by day of a cycle
  //   MBM.bands(tx, cycle)              usual pace {med, lo, hi, n} | null
  //   MBM.moodOf(spent, usual)          {ratio, mood: cool|calm|warm|hot, diff, known}
  //   MBM.compute(input, opts)          everything the brief shows (B)
  //   MBM.sentences(B, fmt)             the three template sentences [{text, entities}]
  //   MBM.facts(B, fmt)                 the aggregates an AI may see (no transactions)
  //   MBM.factsKey(B)                   short key of the headline numbers
  //   MBM.validate(ai, B, fmt)          AI sentences checked against B: {sentences, dropped, replaced}
  //   MBM.numbersIn(text, fmt)          every number written in a sentence
  //   MBM.makeFmt(currency, locale)     money/date formatters (the page passes its own)
  // Amounts are in the account currency. Spending = rows of kind 'spend'
  // (refunds count against it), exactly as the Spent KPI adds them up.
  const MBM = (function () {
    'use strict';
    const DAY = 864e5;
    const r2 = x => Math.round(x * 100) / 100;
    const sumBy = (a, f) => { let s = 0; for (const x of a) s += f ? f(x) : x; return s; };
    const med = a => { if (!a.length) return 0; const s = [...a].sort((p, q) => p - q); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    // Interpolated quantile (the band edges move smoothly as cycles are added).
    const qt = (a, q) => { if (!a.length) return 0; const s = [...a].sort((p, r) => p - r); const p = (s.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return s[lo] + (s[hi] - s[lo]) * (p - lo); };
    const validIso = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s);
    const dnum = iso => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY);
    const diso = n => new Date(n * DAY).toISOString().slice(0, 10);   // clock-ok: a day number to its ISO date (UTC arithmetic)
    const dobj = n => new Date(n * DAY);
    const dowOf = n => (n + 3) % 7;                         // Monday = 0
    const mIdx = n => { const d = dobj(n); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
    const mStart = mi => Math.round(Date.UTC(Math.floor(mi / 12), mi % 12, 1) / DAY);
    const dimOf = mi => mStart(mi + 1) - mStart(mi);
    const domOf = n => dobj(n).getUTCDate();
    const bump = (map, k, v) => map.set(k, (map.get(k) || 0) + v);

    // Spending that moves with habits; rent, bills and money to people don't.
    const FIXED = ['Housing', 'Bills & utilities', 'Payments to people'];
    const FIXED_RE = /^(housing|rent|mortgage|council tax|bills?( & utilities)?|utilities|payments to people)$/i;
    const isFixed = c => FIXED.includes(c) || FIXED_RE.test(String(c || ''));
    // Recurring rows that are not bills (money that stays yours).
    const NOT_BILLS = ['Internal transfers', 'Savings & investments', 'Income'];
    const SALARY_MIN = 500;
    const CUSHION = 100;
    const MAX_CYCLES = 6;

    /* ---------- input ---------- */
    // analysis.json -> the rows the page's buildModel makes (same kinds, same order).
    function fromAnalysis(a, o) {
      o = o || {};
      a = a && typeof a === 'object' ? a : {};
      const raw = Array.isArray(a.transactions) ? a.transactions : [];
      const exclude = Array.isArray(a.exclude_from_spending) && a.exclude_from_spending.length ? a.exclude_from_spending.map(String) : ['Income', 'Internal transfers'];
      const tx = [];
      raw.forEach((r, idx) => {
        if (!r || !validIso(r.d)) return;
        const amt = Number(r.a); if (!isFinite(amt)) return;
        const c = String(r.c || 'Uncategorised');
        const kind = exclude.includes(c) ? (c === 'Income' ? 'income' : 'transfer') : 'spend';
        tx.push({ i: idx, d: r.d.slice(0, 10), n: dnum(r.d), m: String(r.m || 'Unknown'), c, a: amt, acct: r.acct ? String(r.acct) : '', memo: r.memo ? String(r.memo) : '',
          how: r.how ? String(r.how) : '', bc: r.bc ? String(r.bc) : null, ty: r.ty ? String(r.ty) : '', k: r.k ? String(r.k) : 'i' + idx, kind,
          s: kind === 'spend' ? -amt : 0, inc: kind === 'income' && amt > 0 ? amt : 0 });
      });
      tx.sort((p, q) => q.n - p.n || p.i - q.i);
      // No day given: the home day on the page (Clock; money days stay on home time); without Clock,
      // today on this computer's calendar (not UTC's day, and never rounded up at noon).
      const localDay = () => { const now = new Date(); return Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY); };   // clock-ok: fallback where Clock is not loaded (server, tests)
      const today = validIso(a.today) ? dnum(a.today) : (Number.isFinite(o.today) ? o.today : typeof Clock !== 'undefined' ? dnum(Clock.today(Clock.home())) : localDay());
      const maxN = tx.length ? tx[0].n : today;
      const anchor = Math.max(today, maxN);
      const minN = tx.length ? Math.min(tx[tx.length - 1].n, anchor) : anchor - 90;
      return { tx, anchor, minN, balances: a.balances, history: a.balance_history, recurring: recurring(tx, a.recurring, anchor) };
    }

    /* ---------- recurring payments (same rules as 02-model.js detectRecurring / mkRec) ---------- */
    const FREQS = [
      { p: 7, tol: 1.5, label: 'Weekly', min: 3 }, { p: 14, tol: 2, label: 'Fortnightly', min: 3 },
      { p: 30.44, tol: 4, label: 'Monthly', min: 2 }, { p: 91, tol: 10, label: 'Quarterly', min: 2 },
      { p: 365, tol: 25, label: 'Yearly', min: 2 },
    ];
    function periodFromText(s) {
      s = String(s || '').toLowerCase();
      if (/fortnight|2.?week|bi.?week/.test(s)) return FREQS[1];
      if (/week/.test(s)) return FREQS[0];
      if (/quarter/.test(s)) return FREQS[3];
      if (/year|annual/.test(s)) return FREQS[4];
      return FREQS[2];
    }
    function recurring(tx, pipeline, anchor) {
      const cats = new Map();
      for (const t of tx) { if (t.kind !== 'spend') continue; let s = cats.get(t.m); if (!s) { s = {}; cats.set(t.m, s); } s[t.c] = (s[t.c] || 0) + 1; }
      const catOf = m => { const s = cats.get(m); return s ? Object.entries(s).sort((p, q) => q[1] - p[1])[0][0] : null; };
      const mkRec = (m, list, f, source) => {
        const days = new Map(); list.forEach(t => days.set(t.n, (days.get(t.n) || 0) + t.s));
        const ds = [...days.keys()].sort((p, q) => p - q);
        const amts = ds.map(n => days.get(n));
        const typical = med(amts);
        const last = ds.length ? ds[ds.length - 1] : anchor;
        let next = last + Math.round(f.p);
        while (next < anchor - f.tol && ds.length) next += Math.round(f.p);
        return {
          m, cat: catOf(m) || 'Uncategorised', freq: f.label, period: f.p, count: ds.length, first: ds[0] != null ? ds[0] : last, last,
          lastAmt: amts.length ? amts[amts.length - 1] : 0, typical, monthly: typical * 30.44 / f.p,
          next, charges: ds.map(n => ({ n, s: days.get(n) })), varies: amts.length > 1 && Math.max(...amts) / Math.max(0.01, Math.min(...amts)) > 1.15,
          active: anchor - last <= f.p * 2 + f.tol, source,
        };
      };
      const byM = new Map();
      for (const t of tx) {
        if (t.kind !== 'spend' || t.s <= 0) continue;
        if (!byM.has(t.m)) byM.set(t.m, []);
        byM.get(t.m).push(t);
      }
      const out = new Map();
      for (const [m, list] of byM) {
        if (list.length < 2) continue;
        const days = new Map();
        list.forEach(t => days.set(t.n, (days.get(t.n) || 0) + t.s));
        const ds = [...days.keys()].sort((p, q) => p - q);
        if (ds.length < 2) continue;
        const iv = []; for (let i = 1; i < ds.length; i++) iv.push(ds[i] - ds[i - 1]);
        const mi = med(iv);
        const f = FREQS.find(x => Math.abs(mi - x.p) <= x.tol);
        if (!f || ds.length < f.min) continue;
        const okIv = iv.filter(x => Math.abs(x - f.p) <= f.tol * 1.6).length / iv.length;
        const amts = ds.map(n => days.get(n)); const ma = med(amts);
        const okAmt = amts.filter(x => Math.abs(x - ma) / ma <= 0.35).length / amts.length;
        if (okIv < 0.6 || okAmt < 0.6) continue;
        out.set(m, mkRec(m, list, f, 'detected'));
      }
      for (const r of (Array.isArray(pipeline) ? pipeline : [])) {
        if (!r || !r.merchant) continue;
        const m = String(r.merchant);
        const f = periodFromText(r.frequency);
        const list = byM.get(m) || [];
        const rec = out.get(m) || mkRec(m, list, f, 'pipeline');
        rec.source = out.has(m) ? 'both' : 'pipeline';
        if (r.frequency) rec.freq = String(r.frequency).replace(/^./, c => c.toUpperCase());
        if (isFinite(+r.monthly_cost) && +r.monthly_cost > 0) rec.monthly = +r.monthly_cost;
        if (r.category && !rec.cat) rec.cat = String(r.category);
        if (!list.length && validIso(r.last_seen)) { rec.last = dnum(r.last_seen); rec.next = rec.last + Math.round(f.p); rec.lastAmt = +r.last_amount || 0; rec.typical = rec.lastAmt; rec.active = anchor - rec.last <= f.p * 2 + f.tol; }
        if (r.amount_varies) rec.varies = true;
        out.set(m, rec);
      }
      return [...out.values()].sort((p, q) => (q.active - p.active) || (q.monthly - p.monthly));
    }

    /* ---------- pay cycle ---------- */
    // The regular salary: money in of at least SALARY_MIN from one payer, about
    // monthly (median gap 26-35 days, 70% of gaps 24-38), seen 3+ times, the
    // last within 45 days. The biggest such payer wins. null = no salary.
    function salary(tx, anchor) {
      const by = new Map();
      for (const t of tx) if (t.kind === 'income' && t.inc >= SALARY_MIN && t.n <= anchor) { if (!by.has(t.m)) by.set(t.m, []); by.get(t.m).push(t); }
      let best = null;
      for (const [m, list] of by) {
        const days = [...new Set(list.map(t => t.n))].sort((p, q) => p - q);
        if (days.length < 3) continue;
        const gaps = days.slice(1).map((d, i) => d - days[i]);
        const g = med(gaps);
        if (g < 26 || g > 35) continue;
        if (gaps.filter(x => x >= 24 && x <= 38).length < gaps.length * 0.7) continue;
        if (anchor - days[days.length - 1] > 45) continue;
        const total = sumBy(list, t => t.inc);
        if (best && total <= best.total) continue;
        // The intended day of the month: the most common one of the last six (a
        // weekend payday moves to the Friday before, so the mode still finds it).
        const cnt = new Map(); for (const d of days.slice(-6)) bump(cnt, domOf(d), 1);
        const dom = [...cnt.entries()].sort((p, q) => q[1] - p[1] || q[0] - p[0])[0][0];
        best = { m, days, gap: g, total, dom, amount: r2(med(list.map(t => t.inc))) };
      }
      return best;
    }
    // The next payday after day n: that day of a later month (clamped to its
    // length), moved back to the Friday when it falls on a weekend.
    function nextPayday(sal, after) {
      let mi = mIdx(after);
      for (let k = 0; k < 3; k++, mi++) {
        let n = mStart(mi) + Math.min(sal.dom, dimOf(mi)) - 1;
        while (dowOf(n) >= 5) n--;
        if (n > after) return n;
      }
      return after + Math.round(sal.gap);
    }
    // mode 'cycle' needs a salary; otherwise the calendar month. Previous
    // cycles must start inside the data (a part cycle would read as "low").
    function cycleOf(anchor, mode, sal, minN) {
      if (mode === 'cycle' && sal) {
        const past = sal.days.filter(d => d <= anchor);
        const start = past[past.length - 1];
        // A late salary: the expected day has passed; payday is "any day now".
        const next = Math.max(nextPayday(sal, start), anchor + 1);
        const prev = [];
        for (let i = 0; i < past.length - 1; i++) if (past[i] >= minN) prev.push({ start: past[i], next: past[i + 1] });
        return finish({ mode: 'cycle', start, next, prev: prev.slice(-MAX_CYCLES) }, anchor);
      }
      const mi = mIdx(anchor);
      const prev = [];
      for (let k = MAX_CYCLES; k >= 1; k--) if (mStart(mi - k) >= minN) prev.push({ start: mStart(mi - k), next: mStart(mi - k + 1) });
      return finish({ mode: 'month', start: mStart(mi), next: mStart(mi + 1), prev }, anchor);
    }
    function finish(c, anchor) {
      c.len = c.next - c.start; c.day = anchor - c.start; c.daysLeft = c.next - anchor;
      c.late = c.mode === 'cycle' && c.len > 40;
      return c;
    }

    /* ---------- pace ---------- */
    function curve(tx, start, len, upTo) {
      const per = new Array(Math.max(0, len)).fill(0);
      for (const t of tx) if (t.kind === 'spend') { const k = t.n - start; if (k >= 0 && k < len) per[k] += t.s; }
      const end = upTo == null ? len - 1 : Math.min(upTo, len - 1);
      const out = []; let run = 0;
      for (let k = 0; k <= end; k++) { run += per[k]; out.push(r2(run)); }
      return out;
    }
    // Usual pace by day index: median and p25-p75 of earlier cycles. A shorter
    // cycle holds its total for the extra days.
    function bands(tx, cyc) {
      if (!cyc.prev.length) return null;
      const curves = cyc.prev.map(p => curve(tx, p.start, p.next - p.start));
      const out = { med: [], lo: [], hi: [], n: curves.length };
      for (let k = 0; k < cyc.len; k++) {
        const v = curves.map(c => (c.length ? c[Math.min(k, c.length - 1)] : 0));
        out.med.push(r2(med(v))); out.lo.push(r2(qt(v, 0.25))); out.hi.push(r2(qt(v, 0.75)));
      }
      return out;
    }
    // The mood of the money: spent so far / usual by today. Under 0.9 cool,
    // up to 1.05 calm, up to 1.2 warm, above that hot. A gap smaller than
    // `floor` (25, or 5% of a usual whole cycle) stays calm, so early in a
    // cycle (usual by today still tiny) never reads as running hot over a coffee.
    function moodOf(spent, usual, usualEnd) {
      if (!(usual > 0) || !isFinite(spent)) return { ratio: null, mood: 'calm', diff: null, known: false };
      const ratio = spent / usual, diff = r2(spent - usual);
      const floor = Math.max(25, 0.05 * (usualEnd > 0 ? usualEnd : usual));
      const mood = Math.abs(diff) < floor ? 'calm' : ratio < 0.9 ? 'cool' : ratio <= 1.05 ? 'calm' : ratio <= 1.2 ? 'warm' : 'hot';
      return { ratio, mood, diff, known: true };
    }

    /* ---------- balances ---------- */
    // Money you can spend: current / transaction accounts (not credit cards,
    // savings or loans). null when the bank sent no balance.
    function spendable(balances) {
      const list = (Array.isArray(balances) ? balances : []).filter(b => b && isFinite(+b.balance));
      const cur = list.filter(b => /current|transaction|checking|cheque/i.test(String(b.kind || '')));
      const use = cur.length ? cur : list.filter(b => !/credit|saving|loan|mortgage|invest|isa|pension/i.test(String(b.kind || '')));
      if (!use.length) return null;
      return { total: r2(sumBy(use, b => +b.balance)), accts: use.map(b => String(b.acct || '')), asOf: validIso(use[0].asOf) ? use[0].asOf.slice(0, 10) : null, n: use.length };
    }
    function balanceSeries(history, accts) {
      const pts = [];
      for (const x of (Array.isArray(history) ? history : [])) {
        if (!x || !validIso(x.date)) continue;
        const acc = x.accounts && typeof x.accounts === 'object' ? x.accounts : null;
        let v = null;
        if (acc && accts.length && accts.every(a => isFinite(+acc[a]))) v = sumBy(accts, a => +acc[a]);
        else if (isFinite(+x.total)) v = +x.total;
        if (v != null) pts.push({ n: dnum(x.date), v: r2(v) });
      }
      pts.sort((p, q) => p.n - q.n);
      return pts;
    }

    /* ---------- bills ---------- */
    // Each recurring bill's charges from `from` (exclusive) to `to` (exclusive).
    // A charge a few days overdue counts as due now (it has not left yet).
    // @na-fix (numbers audit) Monthly, quarterly and yearly bills fall on their
    // usual day of the month (billDay): rent paid on the 1st is next due on the
    // 1st, not 30 days on (after a 31-day month that is the 31st, which put a
    // whole rent payment "before the month ends" and cut safe to spend).
    // Weekly and fortnightly bills step 7 / 14 days from r.next as before.
    function billsBetween(recs, from, to) {
      const out = [];
      for (const r of recs || []) {
        if (!r || !r.active || NOT_BILLS.includes(r.cat) || !(r.typical > 0)) continue;
        const p = Math.max(1, Math.round(r.period || 30));
        const months = r.period >= 300 ? 12 : r.period >= 80 ? 3 : r.period >= 26 ? 1 : 0;
        const dom = billDay(r);
        const on = mi => mStart(mi) + Math.min(dom, dimOf(mi)) - 1;
        const step = n => (months ? on(mIdx(n) + months) : n + p);
        // The usual day nearest the last charge (a charge moved past a month end by a weekend still counts for its month).
        const near = n => [-1, 0, 1].map(k => on(mIdx(n) + k)).sort((a, b) => Math.abs(a - n) - Math.abs(b - n))[0];
        let n = months && Number.isFinite(r.last) ? step(near(r.last)) : r.next;
        if (months) while (n < from - 3) n = step(n);
        if (n <= from) { if (n >= from - 3) out.push({ m: r.m, c: r.cat, n: from, due: true, amount: r2(r.typical), freq: r.freq, rec: r }); n = step(n); while (n <= from) n = step(n); }
        for (; n < to; n = step(n)) out.push({ m: r.m, c: r.cat, n, due: false, amount: r2(r.typical), freq: r.freq, rec: r });
      }
      return out.sort((p, q) => p.n - q.n || q.amount - p.amount || (p.m < q.m ? -1 : 1));
    }
    // A bill's usual day of the month: the most common one of its last six
    // charges when one repeats (a tie goes to the later day: 31, 31, 30, 30 is
    // "the 31st"); else the last charge's day (a bill that drifts, 27th, 25th,
    // 24th, comes next on the 24th), or, when that charge fell on a month's
    // last day, the latest day seen (31 Aug + 30 Sep is "the 31st": 31 Oct).
    function billDay(r) {
      const ch = Array.isArray(r.charges) ? r.charges.slice(-6) : [];
      if (!ch.length) return Number.isFinite(r.last) ? domOf(r.last) : 1;
      const cnt = new Map(); for (const c of ch) bump(cnt, domOf(c.n), 1);
      const [top, k] = [...cnt.entries()].sort((p, q) => q[1] - p[1] || q[0] - p[0])[0];
      if (k >= 2) return top;
      const last = ch[ch.length - 1].n;
      return domOf(last) === dimOf(mIdx(last)) ? Math.max(...ch.map(c => domOf(c.n))) : domOf(last);
    }

    /* ---------- movers ---------- */
    // This cycle to date against the median of earlier cycles to the same day.
    function movers(tx, cyc, key) {
      if (!cyc.prev.length) return [];
      const D = cyc.day;
      const now = new Map(), catBy = new Map();
      for (const t of tx) {
        if (t.kind !== 'spend') continue;
        const k = t.n - cyc.start;
        if (k >= 0 && k <= D) { bump(now, t[key], t.s); if (key === 'm') { const cm = catBy.get(t.m) || new Map(); bump(cm, t.c, Math.abs(t.s)); catBy.set(t.m, cm); } }
      }
      const prevs = cyc.prev.map(p => {
        const mm = new Map();
        for (const t of tx) if (t.kind === 'spend' && t.n >= p.start && t.n <= p.start + D && t.n < p.next) {
          bump(mm, t[key], t.s);
          if (key === 'm' && !catBy.has(t.m)) { const cm = new Map(); bump(cm, t.c, Math.abs(t.s)); catBy.set(t.m, cm); }
        }
        return mm;
      });
      const keys = new Set([...now.keys(), ...prevs.flatMap(m => [...m.keys()])]);
      const rows = [];
      for (const k of keys) {
        const cat = key === 'c' ? k : [...(catBy.get(k) || new Map()).entries()].sort((p, q) => q[1] - p[1]).map(e => e[0])[0] || 'Uncategorised';
        if (isFixed(cat)) continue;
        const n = r2(now.get(k) || 0), u = r2(med(prevs.map(m => m.get(k) || 0)));
        if (n + u <= 5) continue;
        rows.push({ k, c: cat, now: n, usual: u, delta: r2(n - u), pct: u > 0 ? (n - u) / u : null, spark: [...prevs.map(m => r2(m.get(k) || 0)), n] });
      }
      return rows.sort((p, q) => Math.abs(q.delta) - Math.abs(p.delta) || (p.k < q.k ? -1 : 1));
    }

    /* ---------- formatting ---------- */
    // The page passes its own (00-core gbp/gbp2/fd); the server builds the same from config.
    function makeFmt(currency, locale) {
      const CUR = /^[A-Z]{3}$/.test(currency || '') ? currency : 'GBP';
      let LOC = 'en-GB'; try { LOC = Intl.DateTimeFormat.supportedLocalesOf([locale || 'en-GB'])[0] || 'en-GB'; } catch (e) { /* default */ }
      let sym = CUR + ' ', pre = true, dp = 2;
      try {
        const f = new Intl.NumberFormat(LOC, { style: 'currency', currency: CUR, currencyDisplay: 'narrowSymbol' });
        const parts = f.formatToParts(1);
        const ci = parts.findIndex(p => p.type === 'currency'), ni = parts.findIndex(p => p.type === 'integer');
        if (ci >= 0) {
          const lit = parts.slice(Math.min(ci, ni) + 1, Math.max(ci, ni)).filter(p => p.type === 'literal').map(p => p.value).join('');
          pre = ci < ni; sym = pre ? parts[ci].value + (lit ? ' ' : '') : (lit ? ' ' : '') + parts[ci].value;
        }
        dp = f.resolvedOptions().maximumFractionDigits;
      } catch (e) { /* unknown currency */ }
      const cur = (num, neg) => (neg ? '−' : '') + (pre ? sym + num : num + sym);
      const nf0 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 0 });
      const nf2 = new Intl.NumberFormat(LOC, { minimumFractionDigits: dp, maximumFractionDigits: dp });
      const fd = (n, o) => dobj(n).toLocaleDateString(LOC, Object.assign({ timeZone: 'UTC' }, o));
      return withSeps({
        money: x => { x = +x || 0; return cur(nf0.format(Math.abs(Math.round(x))), x < -0.004); },
        money2: x => { x = +x || 0; return cur(nf2.format(Math.abs(x)), x < -0.004); },
        long: n => fd(n, { weekday: 'long', day: 'numeric', month: 'long' }),
        short: n => fd(n, { day: 'numeric', month: 'short' }),
        weekday: n => fd(n, { weekday: 'long' }),
        month: n => fd(n, { month: 'long' }),
        locale: LOC,
      });
    }
    // Group and decimal separators of a formatter (so numbers can be read back).
    function withSeps(fmt) {
      const s = fmt.money2(12345.5);
      const digits = s.replace(/[^\d.,\s  '’]/g, '').trim();
      const m = /^12(\D)?345(\D)50$/.exec(digits.replace(/\s/g, ' '));
      fmt.group = fmt.group || (m && m[1]) || ',';
      fmt.decimal = fmt.decimal || (m && m[2]) || '.';
      return fmt;
    }
    // A merchant as people read it (fmt.name: the page passes FinSymbols' cleaned name); rows keep the raw name.
    const nameOf = (fmt, m) => { if (fmt && typeof fmt.name === 'function') { try { const s = fmt.name(m); if (s) return String(s); } catch (e) { /* the raw name */ } } return m; };
    // "Thursday" within a week, else "15 Oct".
    const dayRef = (n, anchor, fmt) => (n === anchor ? 'today' : n === anchor + 1 ? 'tomorrow' : n - anchor < 7 ? fmt.weekday(n) : fmt.short(n));

    /* ---------- everything the brief shows ---------- */
    // input: { tx (newest first, kinds as buildModel), anchor, minN, balances, history, recurring }
    // opts:  { mode: 'cycle' | 'month' (default: cycle when a salary is found), fmt, cushion }
    function compute(input, opts) {
      opts = opts || {};
      const fmt = opts.fmt ? withSeps(opts.fmt) : makeFmt();
      const tx = input.tx || [], anchor = input.anchor, minN = input.minN;
      const sal = salary(tx, anchor);
      const mode = opts.mode === 'month' || !sal ? 'month' : 'cycle';
      const cyc = cycleOf(anchor, mode, sal, minN);
      const cur = curve(tx, cyc.start, cyc.len, cyc.day);
      const spent = cur.length ? cur[cur.length - 1] : 0;
      const pace = bands(tx, cyc);
      const usual = pace ? pace.med[Math.min(cyc.day, pace.med.length - 1)] : null;
      const usualEnd = pace ? pace.med[pace.med.length - 1] : null;
      const mood = moodOf(spent, usual, usualEnd);
      const projected = pace ? r2(spent + Math.max(0, usualEnd - usual)) : null;
      // Money in and net, this cycle to date.
      let moneyIn = 0, inCount = 0; const netDay = new Array(cyc.day + 1).fill(0);
      for (const t of tx) {
        const k = t.n - cyc.start; if (k < 0 || k > cyc.day) continue;
        if (t.kind === 'income' && t.inc > 0) { moneyIn += t.inc; inCount++; netDay[k] += t.inc; }
        if (t.kind === 'spend') netDay[k] -= t.s;
      }
      moneyIn = r2(moneyIn);
      const netCurve = []; { let run = 0; for (const v of netDay) { run += v; netCurve.push(r2(run)); } }
      const inPer = [...cyc.prev, { start: cyc.start, next: anchor + 1 }].map(p => ({ start: p.start, v: r2(sumBy(tx.filter(t => t.kind === 'income' && t.n >= p.start && t.n < p.next), t => t.inc)) }));
      // Balance.
      const bal = spendable(input.balances);
      const series = bal ? balanceSeries(input.history, bal.accts) : [];
      const at30 = series.filter(p => p.n <= anchor - 30);
      const bal30 = at30.length ? at30[at30.length - 1].v : null;
      // Bills: before payday (spoken for) and the next 30 days.
      const recs = input.recurring || [];
      const before = billsBetween(recs, anchor, cyc.next);
      const billsTotal = r2(sumBy(before, b => b.amount));
      const upcoming = billsBetween(recs, anchor, anchor + 31);
      const cushion = Number.isFinite(opts.cushion) ? opts.cushion : CUSHION;
      const safe = bal ? (() => {
        const left = r2(bal.total - billsTotal - cushion);
        return { perDay: r2(Math.max(0, left) / Math.max(1, cyc.daysLeft)), left, cushion, bills: billsTotal, daysLeft: cyc.daysLeft };
      })() : null;
      // Movers and who leads each category this cycle.
      const mv = movers(tx, cyc, 'c'), mvM = movers(tx, cyc, 'm');
      const leadAmt = new Map(), catNow = new Map(), visits = new Map();
      for (const t of tx) {
        if (t.kind !== 'spend' || t.n < cyc.start || t.n > anchor) continue;
        bump(leadAmt, t.c + '\u0000' + t.m, t.s); bump(catNow, t.c, t.s);
        if (t.s > 0) { const v = visits.get(t.m) || { n: 0, a: 0, c: t.c }; v.n++; v.a += t.s; visits.set(t.m, v); }
      }
      const lead = {};
      for (const [key, v] of [...leadAmt.entries()].sort((p, q) => q[1] - p[1])) { const [c, m] = key.split('\u0000'); if (!lead[c] && v > 0) lead[c] = m; }
      const cats = [...catNow.entries()].filter(e => e[1] > 0.004).sort((p, q) => q[1] - p[1]).map(([c, v]) => ({ c, v: r2(v) }));
      const phase = cyc.day <= 4 ? 'Fresh start' : cyc.daysLeft <= 6 ? 'Home stretch' : cyc.mode === 'month' ? 'Mid-month' : 'Mid-cycle';
      const B = {
        anchor, minN, mode, auto: sal ? 'cycle' : 'month', hasSalary: !!sal, salaryDom: sal ? sal.dom : null, salaryAmount: sal ? sal.amount : null, paydays: sal ? sal.days.slice() : [], cycle: cyc, phase,
        curve: cur, pace, spent, usual, usualEnd, projected, mood,
        moneyIn, inCount, net: r2(moneyIn - spent), netCurve, inPer,
        balance: bal, balSeries: series, bal30,
        bills: before, billsTotal, upcoming, safe, cushion,
        movers: mv, moversM: mvM, lead, cats, visits,
      };
      B.insights = insights(B, tx, recs, fmt);
      B.sentences = sentences(B, fmt);
      B.key = factsKey(B);
      return B;
    }

    /* ---------- insight cards ---------- */
    // [{kind, tone: 'warn' | 'good' | 'info', title, sub, m?, c?, amount?}], at most 4, one of each kind.
    function insights(B, tx, recs, fmt) {
      const out = []; const A = B.anchor, cyc = B.cycle;
      const recM = new Set(recs.filter(r => r.active).map(r => r.m));
      for (const r of recs) {
        if (!r.active || NOT_BILLS.includes(r.cat)) continue;
        const ch = r.charges || [];
        if (ch.length >= 3 && r.last >= A - 70) {
          const was = med(ch.slice(0, -1).map(x => x.s)), now = ch[ch.length - 1].s;
          if (now - was >= 0.5 && (now - was) / was > 0.05) {
            const per = r.period >= 300 ? 'a year' : r.period >= 80 ? 'a quarter' : r.period >= 25 ? 'a month' : r.period >= 12 ? 'a fortnight' : 'a week';
            const yr = (now - was) * 365 / Math.max(1, r.period);
            out.push({ kind: 'price', tone: 'warn', m: r.m, c: r.cat, amount: r2(now), title: `${nameOf(fmt, r.m)} went up ${fmt.money2(now - was)} ${per}`,
              sub: `${fmt.money2(was)} → ${fmt.money2(now)} since ${fmt.short(r.last)}. That's ${fmt.money(yr)} more a year.` });
          }
        }
        if (r.first >= A - 70 && r.count <= 3 && r.first > B.minN + 14) {
          out.push({ kind: 'new', tone: 'info', m: r.m, c: r.cat, amount: r2(r.typical), title: `New regular payment: ${nameOf(fmt, r.m)}`,
            sub: `${fmt.money2(r.typical)} ${r.freq.toLowerCase()} since ${fmt.short(r.first)} (${fmt.money(r.monthly * 12)} a year).` });
        }
      }
      const hot = B.movers.find(x => x.delta > 25 && x.pct != null && x.pct > 0.2);
      if (hot) out.push({ kind: 'hot', tone: 'warn', c: hot.k, amount: hot.delta, title: `${hot.k} is ${fmt.money(hot.delta)} above usual`, sub: `${fmt.money(hot.now)} so far; by now you'd usually be at ${fmt.money(hot.usual)}.` });
      const cool = B.movers.find(x => x.delta < -15);
      if (cool) out.push({ kind: 'cool', tone: 'good', c: cool.k, amount: -cool.delta, title: `${cool.k} is ${fmt.money(-cool.delta)} below usual`, sub: `${fmt.money(cool.now)} so far against a usual ${fmt.money(cool.usual)} by today.` });
      let big = null;
      for (const t of tx) if (t.kind === 'spend' && t.n >= cyc.start && t.n <= A && t.s > 0 && !recM.has(t.m) && (!big || t.s > big.s)) big = t;
      if (big && big.s >= 80) out.push({ kind: 'big', tone: 'info', m: big.m, c: big.c, amount: r2(big.s), title: `Largest purchase: ${nameOf(fmt, big.m)}`, sub: `${fmt.money2(big.s)} on ${fmt.short(big.n)}, the biggest one-off this ${cyc.mode === 'cycle' ? 'cycle' : 'month'}.` });
      const hab = [...B.visits.entries()].filter(([m]) => !recM.has(m)).sort((p, q) => q[1].n - p[1].n || q[1].a - p[1].a)[0];
      if (hab && hab[1].n >= 3) out.push({ kind: 'habit', tone: 'info', m: hab[0], c: hab[1].c, amount: r2(hab[1].a), title: `${hab[1].n} visits to ${nameOf(fmt, hab[0])} this ${cyc.mode === 'cycle' ? 'cycle' : 'month'}`, sub: `${fmt.money2(hab[1].a)} so far, about ${fmt.money2(hab[1].a / hab[1].n)} a visit.` });
      // One of each kind, the most telling first.
      const order = ['price', 'hot', 'new', 'cool', 'big', 'habit'];
      const seen = new Set();
      return out.sort((p, q) => order.indexOf(p.kind) - order.indexOf(q.kind)).filter(x => !seen.has(x.kind) && seen.add(x.kind)).slice(0, 4);
    }

    /* ---------- your money in three sentences (the template) ---------- */
    // Facts only: pace against usual, the biggest movers, the bills before
    // payday (naming the next) and safe to spend. Entities carry char offsets.
    function sentence(parts) {
      let text = ''; const entities = [];
      for (const p of parts) {
        if (p == null || p === false) continue;
        if (typeof p === 'string') { text += p; continue; }
        const start = text.length; text += p.text;
        entities.push(Object.assign({}, p, { start, end: text.length }));
      }
      return { text, entities };
    }
    function sentences(B, fmt) {
      const out = []; const cyc = B.cycle;
      const since = cyc.mode === 'cycle' ? 'since payday' : 'so far this month';
      const money = (v, tone, f) => ({ type: 'money', text: (f || fmt.money)(v), ref: String(r2(v)), tone: tone || 'out' });
      // 1. Pace.
      if (B.mood.known) {
        const d = B.mood.diff;
        out.push(Math.abs(d) < 1
          ? sentence(["You've spent ", money(B.spent), ` ${since}, right on your usual pace.`])
          : sentence(["You've spent ", money(B.spent), ` ${since}, `, money(Math.abs(d), d < 0 ? 'good' : 'warn'), d < 0 ? ' under your usual pace.' : ' over your usual pace.']));
      } else {
        const per = B.spent / Math.max(1, cyc.day + 1);
        out.push(B.spent > 0.004
          ? sentence(["You've spent ", money(B.spent), ` ${since}, about `, money(per), ' a day.'])
          : sentence([cyc.mode === 'cycle' ? 'Nothing spent since payday yet.' : 'Nothing spent so far this month.']));
      }
      // 2. Movers of at least 5 (or, with no history yet, the biggest category).
      const up = B.movers.find(x => x.delta >= 5), down = B.movers.find(x => x.delta <= -5);
      const cat = (c) => ({ type: 'category', text: c, ref: c });
      const merch = (m) => ({ type: 'merchant', text: nameOf(fmt, m), ref: m });
      // "mostly X" only when X is short enough to read in a sentence.
      const lead = (c) => (B.lead[c] && B.lead[c] !== c && nameOf(fmt, B.lead[c]).length <= 26 ? [', mostly ', merch(B.lead[c])] : []);
      // @na-fix (numbers audit) "everything else is close to normal" only when it is:
      // a second riser of 5 or more is named instead (it was said with another category's amount and percentage, up).
      const up2 = up && !down ? B.movers.find(x => x !== up && x.delta >= 5) : null;
      if (up && down) out.push(sentence([cat(up.k), ' is up ', money(up.delta, 'warn'), ' on usual', ...lead(up.k), ', while ', cat(down.k), ' is ', money(-down.delta, 'good'), ' lower.']));
      else if (up && up2) out.push(sentence([cat(up.k), ' is up ', money(up.delta, 'warn'), ' on usual', ...lead(up.k), ', and ', cat(up2.k), ' is ', money(up2.delta, 'warn'), ' higher.']));
      else if (up) out.push(sentence([cat(up.k), ' is up ', money(up.delta, 'warn'), ' on usual', ...lead(up.k), '; everything else is close to normal.']));
      else if (down) out.push(sentence([cat(down.k), ' is ', money(-down.delta, 'good'), ' lower than usual, and nothing is running high.']));
      else if (B.cats.length) out.push(sentence([cat(B.cats[0].c), ' is the biggest category so far at ', money(B.cats[0].v), ...lead(B.cats[0].c), '.']));
      // 3. Bills before payday, the next one, and safe to spend.
      const n = B.bills.length, first = B.bills[0];
      const until = cyc.mode === 'cycle' ? ['before payday on ', { type: 'date', text: fmt.long(cyc.next), ref: diso(cyc.next) }] : ['before the month ends'];
      const tail = B.safe
        ? (B.safe.perDay >= 1 ? [', so about ', money(B.safe.perDay, 'good'), ' a day is free to spend.'] : [', which leaves nothing spare after a ', money(B.safe.cushion), ' cushion.'])
        : ['.'];
      const when = b => { if (b.due) return 'due now'; const r = dayRef(b.n, B.anchor, fmt); return r === 'today' || r === 'tomorrow' ? r : 'on ' + r; };
      if (n >= 2) out.push(sentence([`${n} bills worth `, money(B.billsTotal), ' leave ', ...until, ', starting with ', merch(first.m), ' ' + when(first), ...tail]));
      else if (n === 1) out.push(sentence([merch(first.m), ' (', money(first.amount, 'out', fmt.money2), ') is the only bill ', ...until, ...tail]));
      else out.push(sentence(['No bills are due ', ...until, ...tail]));
      return out;
    }

    /* ---------- what an AI may see ---------- */
    // @na-fix (numbers audit, round 2) The movers an AI sees and a sentence may
    // state: the five biggest, plus the riser(s) and faller sentence 2 names when
    // they rank lower ("while Health is £N lower" with Health 7th failed the
    // template's own check, and an AI was never told about it).
    function factMovers(B) {
      const mv = B.movers.slice(0, 5);
      const up = B.movers.find(x => x.delta >= 5), down = B.movers.find(x => x.delta <= -5);
      const up2 = up && !down ? B.movers.find(x => x !== up && x.delta >= 5) : null;
      for (const x of [up, up2, down]) if (x && !mv.includes(x)) mv.push(x);
      return mv;
    }
    // Aggregates only: totals, deltas, the next bills' merchants and amounts,
    // pace. Never a transaction, a balance or an account.
    function facts(B, fmt) {
      const cyc = B.cycle;
      const M = v => (v == null ? null : fmt.money(v)), M2 = v => (v == null ? null : fmt.money2(v));
      return {
        period: {
          kind: cyc.mode === 'cycle' ? 'pay cycle (payday to payday)' : 'calendar month', today: fmt.long(B.anchor),
          day: cyc.day + 1, length: cyc.len, daysLeft: cyc.daysLeft, started: fmt.long(cyc.start),
          ends: cyc.mode === 'cycle' ? 'payday on ' + fmt.long(cyc.next) : 'the end of ' + fmt.month(cyc.start), phase: B.phase,
          earlierCyclesCompared: B.pace ? B.pace.n : 0,
        },
        pace: {
          spentSoFar: M(B.spent), usualByToday: M(B.usual), difference: B.mood.known ? M(Math.abs(B.mood.diff)) : null,
          direction: B.mood.known ? (B.mood.diff < -0.5 ? 'under usual' : B.mood.diff > 0.5 ? 'over usual' : 'on usual') : 'no usual yet',
          mood: B.mood.mood, ifTheRestGoesAsUsual: M(B.projected), usualWholeCycle: M(B.usualEnd),
        },
        // Categories only: the one merchant name that leaves is a bill's (below).
        movers: factMovers(B).map(x => ({ category: x.k, soFar: M(x.now), usualByNow: M(x.usual), change: (x.delta >= 0 ? 'up ' : 'down ') + M(Math.abs(x.delta)), percent: x.pct == null ? null : Math.round(x.pct * 100) })),
        categoriesSoFar: B.cats.slice(0, 8).map(x => ({ category: x.c, total: M(x.v) })),
        bills: { beforeEnd: B.bills.length, total: M(B.billsTotal), next: B.bills.slice(0, 6).map(b => ({ merchant: nameOf(fmt, b.m), amount: M2(b.amount), due: b.due ? 'now' : fmt.long(b.n) })) },
        safeToSpend: B.safe ? { perDay: M(B.safe.perDay), forDays: B.safe.daysLeft, cushionKeptBack: M(B.safe.cushion) } : null,
      };
    }
    function factsKey(B) {
      const c = B.cycle;
      return [c.mode, c.start, B.anchor, Math.round(B.spent), B.usual == null ? '-' : Math.round(B.usual), B.bills.length, Math.round(B.billsTotal), B.safe ? Math.round(B.safe.perDay) : '-',
        B.movers.slice(0, 3).map(x => x.k + ':' + Math.round(x.delta)).join(',')].join('|');
    }

    /* ---------- checking an AI's sentences against the numbers ---------- */
    // Number words ("four bills"); "one" is left out ("no one", "the only one").
    const WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
    // @na-fix (numbers audit) Amounts in words can't be checked, so they fail:
    // "fifty pounds", "two hundred pounds", "a grand", "twice the usual" got through before.
    const VAGUE = /\b(thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundreds?|thousands?|millions?|grand|dozens?|twice|double[ds]?|triple[ds]?|treble[ds]?|half|halved|quarter)\b/gi;
    // A unit written after the number: "12 pounds" is money, "40 per cent" a percentage, "50p" pence.
    const UNIT = /^\s?(per ?cent|percent|pounds?|quid|pence|p|gbp|eur|usd|euros?|dollars?)\b/i;
    const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Every number in a text: [{v, money, pct, k, raw}]. Uses the formatter's separators.
    function numbersIn(text, fmt) {
      const f = fmt ? withSeps(fmt) : { group: ',', decimal: '.' };
      const g = escRe(f.group === ' ' || f.group === ' ' ? ' ' : f.group), d = escRe(f.decimal);
      const s = String(text || '').replace(/[  ]/g, ' ');
      const re = new RegExp(`(\\p{Sc})?\\s?([−-])?(\\p{Sc})?(\\d{1,3}(?:${g}\\d{3})+|\\d+)(?:${d}(\\d+))?(\\s?(?:k\\b|%|\\p{Sc}))?`, 'gu');
      const out = []; let m;
      while ((m = re.exec(s))) {
        const int = m[4].split(f.group === ' ' || f.group === ' ' ? ' ' : f.group).join('');
        let v = Number(int + (m[5] ? '.' + m[5] : ''));
        if (!isFinite(v)) continue;
        const suf = (m[6] || '').trim();
        let money = !!(m[1] || m[3] || /\p{Sc}/u.test(suf)), pct = suf === '%';
        const unit = suf ? null : UNIT.exec(s.slice(m.index + m[0].length));
        if (unit) { const u = unit[1].toLowerCase(); if (/cent$/.test(u)) pct = true; else { money = true; if (u === 'p' || u === 'pence') v = v / 100; } }
        const k = suf === 'k'; if (k) v *= 1000;
        out.push({ v, money, pct, k, dp: m[5] ? m[5].length : 0, raw: m[0].trim(), at: m.index });
      }
      for (const [w, v] of Object.entries(WORDS)) { const r = new RegExp(`\\b${w}\\b`, 'gi'); let x; while ((x = r.exec(s))) out.push({ v, money: false, pct: false, k: false, dp: 0, raw: w, word: true, at: x.index }); }
      VAGUE.lastIndex = 0; let vw; while ((vw = VAGUE.exec(s))) out.push({ v: NaN, money: false, pct: false, k: false, dp: 0, raw: vw[0], word: true, vague: true, at: vw.index });
      return out;
    }
    // @na-fix (numbers audit) The direction must be right too: "£N under your
    // usual pace" when it is £N OVER, or "Shopping is down £M" when it is up,
    // used only real figures and so got through. A clause (split at , ; : . and
    // "while", "but", "and", "whereas") that pairs the pace gap or a mover's
    // change with a word for the opposite direction fails, as does a mover's
    // clause that carries another category's change.
    const UPW = /\b(up|over|above|more|higher|ahead|rose|risen|rising|increased?|extra)\b/i;
    const DOWNW = /\b(down|under|below|less|lower|behind|fell|fallen|falling|decreased?|saved|cheaper)\b/i;
    // The clause around a position. @na-fix (round 2): a separator inside a number
    // ("£1,234", or pence after a point) is not a clause break; it was, so "£1,234 under your
    // usual pace" lost its direction word and was never checked.
    function clauser(text) {
      const cuts = [0, text.length]; const cr = /[,;:.!?](?=\s|$)|\s(?:while|but|and|whereas)\s/gi; let c;
      while ((c = cr.exec(text))) cuts.push(c.index, c.index + c[0].length);
      cuts.sort((p, q) => p - q);
      return at => { let a = 0, b = text.length; for (const x of cuts) { if (x <= at) a = x; else { b = x; break; } } return text.slice(a, b); };
    }
    function wrongWay(text, B, fmt) {
      const nums = numbersIn(text, fmt).filter(x => !x.vague && (x.money || (x.v >= 32 && !x.pct)));
      if (!nums.length) return false;
      const clauseAt = clauser(text);
      const near = (v, w, x) => w != null && isFinite(w) && Math.abs(Math.abs(w) - v) <= (x.k ? 50 : 0.5);
      const mv = factMovers(B);
      for (const x of nums) {
        const cl = clauseAt(x.at); const up = UPW.test(cl), down = DOWNW.test(cl);
        if (up === down) continue;   // no direction, or both: nothing to check
        const sign = up ? 1 : -1;
        const named = mv.filter(m => new RegExp(`(^|[^\\p{L}])${escRe(m.k)}($|[^\\p{L}])`, 'iu').test(cl));
        if (named.length === 1) {
          const m0 = named[0];
          if (near(x.v, m0.delta, x)) { if (Math.abs(m0.delta) >= 0.5 && Math.sign(m0.delta) !== sign) return true; continue; }
          if (!near(x.v, m0.now, x) && !near(x.v, m0.usual, x) && mv.some(m => m !== m0 && near(x.v, m.delta, x))) return true;
          continue;
        }
        if (!named.length && B.mood.known && Math.abs(B.mood.diff) >= 1 && near(x.v, B.mood.diff, x) && Math.sign(B.mood.diff) !== sign) return true;
      }
      return false;
    }
    // @na-fix (numbers audit, round 2) A real figure in the wrong place got
    // through, because each number was only checked against the set of all of
    // the brief's figures: the bills total as "spent", spent as "a day", a
    // mover's change given to a category that did not move, "8 bills" (8 is a
    // real count: the day of the cycle), "payday on 2 October" (today's date)
    // or the wrong weekday. Now a clause that names a role ("a day", bills,
    // spent, the cushion) or one category must use that role's or category's
    // own figures, and dates, weekdays and the counts of bills and days left
    // must be the real ones. English date words only; other locales skip those.
    const MON_RE = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
    const DOWS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const CNT_RE = '(\\d+|no|one|a single|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)';
    const countOf = s => (/^\d+$/.test(s) ? +s : s === 'no' ? 0 : s === 'one' || s === 'a single' ? 1 : WORDS[s]);
    const monOf = s => ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(s.slice(0, 3).toLowerCase());
    function wrongPlace(text, B, fmt) {
      const c = B.cycle, lower = text.toLowerCase(), clauseAt = clauser(text);
      let m;
      // Counts: "N bills", "N days left / to payday", "day N of M".
      const billRe = new RegExp(`\\b${CNT_RE}\\s+(?:more\\s+|other\\s+|regular\\s+|upcoming\\s+)?bills?\\b`, 'g');
      while ((m = billRe.exec(lower))) if (countOf(m[1]) !== B.bills.length) return true;
      const leftRe = new RegExp(`\\b${CNT_RE}\\s+(?:more\\s+)?days?\\s+(?:left|to go|to payday|until|till|before|remaining)\\b`, 'g');
      while ((m = leftRe.exec(lower))) { const v = countOf(m[1]); if (v !== c.daysLeft && v !== c.daysLeft - 1) return true; }
      const ofRe = /\bday (\d+) of (\d+)\b/g;
      while ((m = ofRe.exec(lower))) if (+m[1] !== c.day + 1 || +m[2] !== c.len) return true;
      // Dates ("Friday 23 October", "23rd Oct", "October 23"): one of the brief's own, with its weekday.
      const dkey = n => { const d = dobj(n); return d.getUTCMonth() * 100 + d.getUTCDate(); };
      const own = new Map();
      for (const n of [B.anchor, B.anchor + 1, c.start, c.next, c.next - 1, ...B.bills.slice(0, 6).map(b => b.n)]) own.set(dkey(n), dobj(n).getUTCDay());
      const DOW = DOWS.join('|');
      const dateRes = [
        new RegExp(`\\b(?:(${DOW}),?\\s+(?:the\\s+)?)?(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+of)?\\s+(${MON_RE})\\b`, 'g'),
        new RegExp(`\\b(?:(${DOW}),?\\s+)?(${MON_RE})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'g'),
      ];
      const inDates = [];
      for (const [i, re] of dateRes.entries()) {
        while ((m = re.exec(lower))) {
          const dom = +(i ? m[3] : m[2]), mon = monOf(i ? m[2] : m[3]), k = mon * 100 + dom;
          inDates.push([m.index, m.index + m[0].length]);
          if (!own.has(k)) return true;
          if (m[1] && DOWS.indexOf(m[1]) !== own.get(k)) return true;
          const cl = clauseAt(m.index).toLowerCase();
          if (/\bpayday\b/.test(cl) && k !== dkey(c.start) && k !== dkey(c.next)) return true;
          if (/\b(?:month|cycle) ends?\b|\bend of the (?:month|cycle)\b|\bmonth-end\b/.test(cl) && k !== dkey(c.next - 1) && k !== dkey(c.next)) return true;
        }
      }
      const days = new Set([...own.values()]);
      const dowRe = new RegExp(`\\b(${DOW})\\b`, 'g');
      while ((m = dowRe.exec(lower))) if (!inDates.some(([a, b]) => m.index >= a && m.index < b) && !days.has(DOWS.indexOf(m[1]))) return true;
      // Amounts in a clause with a role or one category.
      const mv = factMovers(B), cats = B.cats.slice(0, 8);
      const names = [...new Set([...cats.map(x => x.c), ...mv.map(x => x.k)])];
      const strip = [...names, ...B.bills.slice(0, 6).flatMap(b => [b.m, nameOf(fmt, b.m)])].filter(Boolean).map(s => String(s).toLowerCase()).sort((p, q) => q.length - p.length);
      const ROLES = [
        [/\b(?:a|per|each|every) day\b|\bdaily\b|\/\s?day\b/, [B.safe ? B.safe.perDay : null, !B.mood.known && B.spent > 0.004 ? B.spent / Math.max(1, c.day + 1) : null]],
        [/\bbills?\b|\bdirect debits?\b|\bstanding orders?\b/, [B.billsTotal, ...B.bills.slice(0, 6).map(b => b.amount)]],
        [/\bcushion\b|\bbuffer\b|\bkeeps? back\b|\bkept back\b|\bset aside\b/, [B.cushion]],
        [/\bspent\b|\bspending\b|\boutgoings\b/, [B.spent, B.usual, B.mood.diff, B.projected, B.usualEnd, ...mv.flatMap(x => [x.now, x.usual, x.delta]), ...cats.map(x => x.v)]],
      ];
      for (const x of numbersIn(text, fmt)) {
        if (x.vague || x.word || !isFinite(x.v)) continue;
        if (inDates.some(([a, b]) => x.at >= a && x.at < b)) continue;
        const near = w => w != null && isFinite(w) && Math.abs(Math.abs(w) - x.v) <= (x.k ? 50 : x.dp ? 0.006 : 0.5);
        const cl = clauseAt(x.at);
        const named = names.filter(k => new RegExp(`(^|[^\\p{L}])${escRe(k)}($|[^\\p{L}])`, 'iu').test(cl));
        if (x.pct) {
          const m0 = named.length === 1 ? mv.find(y => y.k === named[0]) : null;
          if (m0 && m0.pct != null && Math.abs(Math.round(Math.abs(m0.pct) * 100) - x.v) > 1) return true;
          continue;
        }
        if (!x.money && (x.v < 32 || (x.v >= 1900 && x.v <= 2100 && Number.isInteger(x.v)))) continue;   // a count or a year
        if (named.length === 1) {
          const m0 = mv.find(y => y.k === named[0]), c0 = cats.find(y => y.c === named[0]);
          if (![m0 && m0.now, m0 && m0.usual, m0 && m0.delta, c0 && c0.v].some(near)) return true;
          continue;
        }
        let bare = cl.toLowerCase(); for (const s of strip) bare = bare.split(s).join(' ');
        const roles = ROLES.filter(r => r[0].test(bare));
        if (roles.length && !roles.some(r => r[1].some(near))) return true;
      }
      return false;
    }
    // The values a sentence may state.
    function allowed(B) {
      const money = new Set(), counts = new Set(), pcts = new Set();
      const addM = v => { if (v == null || !isFinite(v)) return; money.add(r2(Math.abs(v))); };
      [B.spent, B.usual, B.mood.diff, B.projected, B.usualEnd, B.billsTotal, B.cushion].forEach(addM);
      if (B.safe) addM(B.safe.perDay);
      const perDay = !B.mood.known && B.spent > 0.004 ? B.spent / Math.max(1, B.cycle.day + 1) : null;   // sentence 1 with no usual yet: "about £N a day"
      addM(perDay);
      factMovers(B).forEach(x => { addM(x.now); addM(x.usual); addM(x.delta); if (x.pct != null) pcts.add(Math.round(Math.abs(x.pct) * 100)); });
      B.cats.slice(0, 8).forEach(x => addM(x.v));
      B.bills.slice(0, 6).forEach(b => addM(b.amount));
      const c = B.cycle;
      [B.bills.length, c.day + 1, c.len, c.daysLeft, c.daysLeft - 1, B.pace ? B.pace.n : 0, 30].forEach(v => counts.add(v));
      for (const n of [B.anchor, c.start, c.next, ...B.bills.slice(0, 6).map(b => b.n)]) { counts.add(domOf(n)); counts.add(dobj(n).getUTCFullYear()); }
      return { money, counts, pcts };
    }
    function okNumber(x, A) {
      if (x.vague || !isFinite(x.v)) return false;
      if (x.pct) return [...A.pcts].some(p => Math.abs(p - x.v) <= 1);
      const near = (v, tol) => [...A.money].some(m => Math.abs(m - v) <= tol);
      if (x.money) return x.k ? near(x.v, 50) : x.dp ? near(x.v, 0.006) : near(x.v, 0.5);
      if (x.word || Number.isInteger(x.v)) { if (A.counts.has(x.v)) return true; }
      return x.v >= 32 && near(x.v, x.dp ? 0.006 : 0.5);   // an amount written without its symbol
    }
    // ai: {sentences: [{text, entities: [{type, text, ref}]}]} (anything else is ignored).
    // Returns 3 sentences: each AI sentence whose numbers all check out (with
    // only the entities that check out), else the template sentence in its place.
    function validate(ai, B, fmt) {
      fmt = fmt ? withSeps(fmt) : makeFmt();
      const tpl = B.sentences || sentences(B, fmt);
      const A = allowed(B);
      // An AI only saw the bills' merchants (facts()), so only those can be chips.
      // name (as written, lower case) -> the row's name; merchants by their raw and their display name.
      const names = { merchant: new Map(), category: new Map() };
      for (const b of B.bills.slice(0, 6)) { names.merchant.set(b.m.toLowerCase(), b.m); names.merchant.set(nameOf(fmt, b.m).toLowerCase(), b.m); }
      for (const c of [...B.cats.slice(0, 8).map(x => x.c), ...factMovers(B).map(x => x.k)]) names.category.set(c.toLowerCase(), c);
      const list = ai && Array.isArray(ai.sentences) ? ai.sentences.slice(0, 3) : [];
      const out = []; let dropped = 0, replaced = 0;
      for (let i = 0; i < 3; i++) {
        const s = list[i];
        const text = s && typeof s.text === 'string' ? s.text.replace(/\s+/g, ' ').trim() : '';
        const bad = !text || text.length > 240 || /[<>{}[\]]|https?:|www\./i.test(text) || numbersIn(text, fmt).some(x => !okNumber(x, A)) || wrongWay(text, B, fmt) || wrongPlace(text, B, fmt);
        if (bad) { if (tpl[i]) { out.push(tpl[i]); replaced++; } continue; }
        const ents = [];
        const lower = text.toLowerCase();
        for (const e of (Array.isArray(s.entities) ? s.entities : []).slice(0, 8)) {
          if (!e || typeof e.text !== 'string' || !e.text.trim()) { dropped++; continue; }
          const t = e.text.trim(); const at = lower.indexOf(t.toLowerCase());
          let ok = at >= 0 && ['money', 'merchant', 'category', 'date'].includes(e.type);
          let ref = typeof e.ref === 'string' && e.ref ? e.ref : t;
          let tone = 'out';
          if (ok && e.type === 'money') { const nums = numbersIn(t, fmt); ok = nums.length === 1 && nums[0].money && okNumber(nums[0], A); if (ok) { tone = toneOf(nums[0].v, B); ref = String(nums[0].v); } }
          if (ok && (e.type === 'merchant' || e.type === 'category')) { const hit = names[e.type].get(ref.toLowerCase()) || names[e.type].get(t.toLowerCase()); ok = !!hit; ref = hit || ref; }
          if (ok && ents.some(x => at < x.end && at + t.length > x.start)) ok = false;
          if (!ok) { dropped++; continue; }
          ents.push({ type: e.type, text: text.slice(at, at + t.length), ref, tone, start: at, end: at + t.length });
        }
        out.push({ text, entities: ents.sort((p, q) => p.start - q.start) });
      }
      return { sentences: out, dropped, replaced };
    }
    // The tone a money chip takes: under usual / free to spend read good, over reads warn.
    function toneOf(v, B) {
      const near = x => x != null && Math.abs(Math.abs(x) - v) < 0.51;
      if (B.mood.known && near(B.mood.diff)) return B.mood.diff < 0 ? 'good' : 'warn';
      if (B.safe && near(B.safe.perDay)) return 'good';
      const mv = B.movers.find(x => near(x.delta));
      if (mv) return mv.delta > 0 ? 'warn' : 'good';
      return 'out';
    }

    return {
      FIXED, isFixed, NOT_BILLS, SALARY_MIN, CUSHION, FREQS,
      fromAnalysis, recurring, salary, nextPayday, cycleOf, curve, bands, moodOf, spendable, balanceSeries, billsBetween, movers,
      makeFmt, compute, insights, sentences, facts, factsKey, numbersIn, validate, allowed,
      util: { dnum, diso, dowOf, mIdx, mStart, domOf, med, qt, r2 },
    };
  })();
