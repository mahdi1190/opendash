  // @part 95-numbers.js · NEW (added after the split) · OWNER: F (numbers audit). Builders may ADD keys for new analysis; never change or drop existing ones.
  // ── Numbers audit: FinanceView._numbers(opts) ─────────────────────────
  // Every KPI and the key figures of each section for the current filters,
  // computed from the model by the same helpers the sections call
  // (kpiNumbers, foldCats, merchantAgg, computeFlags, flowSeries, budgetCalc,
  // budgetState, txRows, M.recurring). No DOM. Restyling must leave this
  // output identical: tools/finance-numbers.mjs runs it in Node on a data
  // folder and compares it with a saved baseline JSON file.
  //   opts.preset    '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'All' (as the preset buttons, granularity included)
  //   opts.filters   extra filter fields, e.g. { cats: ['Groceries'] }
  //   opts.analysis  compute on this analysis.json instead of the loaded one
  //   opts.budgets   ...and these budgets ({ category: monthly amount })
  // The page's own filters, model and budgets are restored afterwards.
  function numbersSnapshot(opts) {
    opts = opts || {};
    const keepF = JSON.stringify(F);
    const keep = { model: R.model, budgets: R.budgets };
    try {
      if (opts.analysis) R.model = buildModel(opts.analysis);
      if (opts.budgets) R.budgets = cleanBudgets(opts.budgets);
      if (!R.model) return null;
      if (opts.preset) { F.preset = opts.preset; F.from = F.to = null; F.gran = autoGran(getRange().len); }
      if (opts.filters) Object.assign(F, opts.filters);
      return numbersFor(makeCtx());
    } finally {
      const f = JSON.parse(keepF);
      for (const k of Object.keys(F)) if (!(k in f)) delete F[k];
      Object.assign(F, f);
      R.model = keep.model; R.budgets = keep.budgets;
    }
  }
  function numbersFor(ctx) {
    const M = ctx.M, a = M.a, rg = ctx.rg;
    const m2 = x => (x == null || !isFinite(x) ? null : round2(x));
    const pc = x => (x == null || !isFinite(x) ? null : Math.round(x * 1e4) / 1e4);
    const k = kpiNumbers(ctx);
    // Spending
    const sp = seriesBy(ctx.cur.spend, ctx.buckets, ctx.ix, x => x.s);
    const inc = seriesBy(ctx.cur.income, ctx.buckets, ctx.ix, x => x.inc);
    const dSum = new Array(7).fill(0), dDays = new Array(7).fill(0);
    for (let n = ctx.effFrom; n <= ctx.effTo; n++) dDays[dow(n)]++;
    ctx.cur.spend.forEach(x => { dSum[dow(x.n)] += x.s; });
    const q = pred({ amt: true });
    const hrows = M.tx.filter(x => x.kind === 'spend' && x.s > 0 && x.n >= rg.from && x.n <= rg.to && q(x));
    const bins = HIST_EDGES.slice(0, -1).map((lo, i) => ({ lo, hi: HIST_EDGES[i + 1] === Infinity ? null : HIST_EDGES[i + 1], count: 0, total: 0 }));
    hrows.forEach(x => { const i = HIST_EDGES.findIndex((lo, j) => x.s >= lo && x.s < HIST_EDGES[j + 1]); if (i >= 0 && bins[i]) { bins[i].count++; bins[i].total += x.s; } });
    const flags = computeFlags(ctx); const byKind = {};
    flags.forEach(f => { byKind[f.kind] = (byKind[f.kind] || 0) + 1; });
    // Categories
    const totals = ctx.catTotals(ctx.spendNoCat());
    const prevTotals = ctx.hasPrev ? ctx.catTotals(ctx.spendNoCatPrev()) : null;
    const sortObj = o => Object.fromEntries(Object.entries(o).filter(e => Math.abs(e[1]) > 0.004).sort((p, r) => r[1] - p[1] || p[0].localeCompare(r[0])).map(e => [e[0], m2(e[1])]));
    // Merchants
    const merch = merchantAgg(ctx.cur.spend).filter(m => m.total > 0.004).sort((p, r) => r.total - p.total || p.m.localeCompare(r.m));
    // Cash flow, by calendar month (partial months at the ends of the range)
    const mB = makeBuckets(rg.from, rg.to, 'month');
    const fl = flowSeries(Object.assign({}, ctx, { buckets: mB, ix: indexer(rg.from, 'month') }));
    const fw = flowSeries(ctx);
    let cn = 0; fw.net.forEach(v => { cn += v; });
    const srcs = new Map(); ctx.cur.income.forEach(x => srcs.set(x.m, (srcs.get(x.m) || 0) + x.inc));
    const qa = pred({ acct: true }); const byAcct = {};
    M.tx.forEach(x => { if (x.kind === 'spend' && x.n >= rg.from && x.n <= rg.to && qa(x)) { const ac = x.acct || 'Unknown account'; byAcct[ac] = (byAcct[ac] || 0) + x.s; } });
    const bals = (Array.isArray(a.balances) ? a.balances : []).filter(b => b && isFinite(+b.balance));
    const hist = (Array.isArray(a.balance_history) ? a.balance_history : []).filter(x => x && validIso(x.date) && isFinite(+x.total)).map(x => ({ n: dnum(x.date), v: +x.total })).filter(p => p.n >= rg.from && p.n <= rg.to);
    // Recurring (as the Recurring section filters them)
    const recs = M.recurring.filter(r => (!F.cats.length || F.cats.includes(r.cat)) && (!F.merchant || r.m === F.merchant) && (!F.q || r.m.toLowerCase().includes(F.q.toLowerCase())));
    const act = recs.filter(r => r.active), due30 = act.filter(r => r.next <= M.anchor + 30);
    // Budgets (this calendar month)
    const bc = budgetCalc(M); const saved = R.budgets || {};
    const budgeted = Object.keys(saved).filter(c => saved[c] > 0).sort();
    const tb = sum(budgeted, c => saved[c]), ts = sum(budgeted, c => bc.spent[c] || 0), tf = sum(budgeted, c => bc.fc(c));
    const bcats = {};
    M.spendCats.filter(c => (bc.spent[c] || 0) > 0 || saved[c] > 0).sort().forEach(c => { bcats[c] = { spent: m2(bc.spent[c] || 0), forecast: m2(bc.fc(c)), budget: saved[c] ? m2(saved[c]) : null, avg3: m2(bc.avg3(c)), state: budgetState(bc.spent[c] || 0, bc.fc(c), saved[c]).k }; });
    // Transactions (as the table lists them)
    const rows = txRows(ctx);
    return {
      v: 1,
      range: { preset: F.preset, gran: F.gran, from: diso(rg.from), to: diso(rg.to), days: rg.len, hasPrev: ctx.hasPrev, prevFrom: diso(ctx.prev.from), prevTo: diso(ctx.prev.to), anchor: diso(M.anchor) },
      data: { transactions: M.tx.length, spendRows: ctx.cur.spend.length, incomeRows: ctx.cur.income.length, transferRows: ctx.cur.xfer.length, categories: M.categories.length, merchantsAllTime: M.mstats.size, accounts: M.accts.length },
      kpis: {
        spent: m2(k.spent), spentPrev: k.has ? m2(k.spentP) : null, avgPerDay: m2(k.avg), avgPerDayPrev: m2(k.avgP), days: ctx.days,
        moneyIn: m2(k.income), moneyInPrev: k.has ? m2(k.incomeP) : null, net: m2(k.net), netPrev: k.has ? m2(k.netP) : null,
        savingsRate: pc(k.rate), savingsRatePrev: k.has ? pc(k.rateP) : null, payments: k.count, paymentsPrev: k.has ? k.countP : null,
        biggest: k.bigTx ? { amount: m2(k.bigTx.s), date: k.bigTx.d, merchant: k.bigTx.m } : null, biggestPrev: k.has ? m2(k.bigP) : null,
        recurringMonthly: m2(M.recurringMonthly), recurringActive: k.recs.length,
        projected: { month: diso(monthStart(k.proj.mi)).slice(0, 7), soFar: m2(k.proj.mtd), projected: m2(k.proj.proj), lastMonth: m2(k.proj.lastFull), day: k.proj.elapsed, days: k.proj.total },
      },
      spending: {
        buckets: ctx.buckets.map(b => diso(b.s)), spent: sp, moneyIn: inc, total: m2(sum(sp)),
        dayOfWeek: { total: dSum.map(m2), days: dDays, avg: dSum.map((s, i) => (dDays[i] ? m2(s / dDays[i]) : 0)) },
        sizes: bins.map(b => ({ lo: b.lo, hi: b.hi, count: b.count, total: m2(b.total) })),
        largest: ctx.cur.spend.filter(x => x.s > 0).sort((p, r) => r.s - p.s).slice(0, 8).map(x => m2(x.s)),
        flags: { count: flags.length, warn: flags.filter(f => f.sev === 'warn').length, byKind },
      },
      categories: {
        total: m2(sum(Object.values(totals))), byCategory: sortObj(totals), prevByCategory: prevTotals ? sortObj(prevTotals) : null,
        folded: foldCats(totals).map(it => ({ name: it.name, value: m2(it.value), members: it.members.slice().sort() })),
      },
      merchants: { count: merch.length, total: m2(sum(merch, m => m.total)), top: merch.slice(0, 15).map(m => ({ m: m.m, total: m2(m.total), visits: m.count, avg: m2(m.avg), cat: m.cat })) },
      cashflow: {
        moneyIn: m2(sum(fw.inc)), moneyOut: m2(sum(fw.out)), net: m2(sum(fw.inc) - sum(fw.out)), cumulativeNet: m2(cn),
        months: mB.map((b, i) => ({ month: diso(b.s).slice(0, 7), part: b.s !== monthStart(monthIdx(b.s)) || b.e !== monthEnd(monthIdx(b.s)), in: fl.inc[i], out: fl.out[i], net: fl.net[i], rate: fl.inc[i] > 0 ? pc(fl.net[i] / fl.inc[i]) : null })),
        incomeSources: [...srcs.entries()].filter(e => e[1] > 0).sort((p, r) => r[1] - p[1] || p[0].localeCompare(r[0])).map(e => ({ m: e[0], total: m2(e[1]) })),
        byAccount: sortObj(byAcct),
        balance: bals.length ? { total: m2(sum(bals, b => +b.balance)), asOf: bals[0].asOf || null, accounts: bals.length } : null,
        balanceRange: hist.length ? { lo: m2(Math.min(...hist.map(p => p.v))), hi: m2(Math.max(...hist.map(p => p.v))), avg: m2(sum(hist, p => p.v) / hist.length), snapshots: hist.length } : null,
      },
      recurring: {
        monthly: m2(sum(act, r => r.monthly)), yearly: m2(sum(act, r => r.monthly) * 12), active: act.length, stopped: recs.length - act.length,
        due30: { count: due30.length, total: m2(sum(due30, r => r.typical)) },
        items: recs.map(r => ({ m: r.m, freq: r.freq, typical: m2(r.typical), monthly: m2(r.monthly), active: r.active, next: r.active ? diso(r.next) : null, charges: r.count })),
      },
      budgets: { month: diso(bc.ms).slice(0, 7), day: bc.elapsed, days: bc.total, budgeted: budgeted.length, totalBudget: m2(tb), totalSpent: m2(ts), totalForecast: m2(tf), state: budgeted.length ? budgetState(ts, tf, tb).k : 'none', byCategory: bcats },
      transactions: { shown: rows.length, moneyOut: m2(sum(rows.filter(x => x.a < 0), x => -x.a)), moneyIn: m2(sum(rows.filter(x => x.a > 0), x => x.a)) },
    };
  }
  window.FinanceView._numbers = numbersSnapshot;
  // The kits, for the console and tests/finance-parts.test.mjs (not an API for other modules).
  window.FinanceView._kit = { FX, MK };

