  // @part 15-kpis.js · OWNER: C3 (KPI row; kpiNumbers feeds the numbers audit)
  // ── KPI row ───────────────────────────────────────────────────────────
  const KPI_DEFS = [
    { k: 'spent', l: 'Spent', hero: true, good: -1, go: 'spending', icon: 'wallet' },
    { k: 'avg', l: 'Average a day', good: -1, go: 'spending', icon: 'calendar-days' },
    { k: 'income', l: 'Money in', good: 1, go: 'cashflow', icon: 'coins' },
    { k: 'net', l: 'Net cash flow', good: 1, go: 'cashflow', icon: 'arrow-up-down' },
    { k: 'rate', l: 'Savings rate', good: 1, go: 'cashflow', icon: 'piggy-bank' },
    { k: 'count', l: 'Transactions', good: 0, go: 'transactions', icon: 'receipt' },
    { k: 'big', l: 'Biggest purchase', good: 0, go: 'big', icon: 'flag' },
    { k: 'rec', l: 'Recurring a month', good: -1, go: 'recurring', icon: 'repeat' },
    { k: 'proj', l: 'Projected this month', good: -1, go: 'budgets', icon: 'chart-line' },
  ];
  // Which tiles each section shows. The full row (nine tiles, Spent as the
  // hero) suits a summary; a section with its own story gets a compact row of
  // the few that matter there, so its charts start higher. Overview has the
  // Money brief's own tiles and Budgets its rings, so they show none.
  // SEC_OPTS[id].kpis (false, true or a list of keys) wins over this.
  const KPI_SETS = {
    overview: false, budgets: false,
    spending: ['spent', 'avg', 'count', 'big'], categories: ['spent', 'avg', 'count'], merchants: ['spent', 'count', 'big'],
    // @p1: Recurring's own summary strip already leads with "Committed each month", so no 'rec' tile.
    cashflow: ['income', 'spent', 'net', 'rate'], recurring: ['proj', 'spent'], transactions: ['count', 'spent', 'income'],
  };
  function kpiSetFor(id) {
    const o = SEC_OPTS[id];
    const s = o && 'kpis' in o ? o.kpis : (id in KPI_SETS ? KPI_SETS[id] : true);
    return Array.isArray(s) ? s.filter(k => KPI_DEFS.some(d => d.k === k)) : s !== false;
  }
  function buildKpis() {
    const E = R.els; E.kpi = {};
    // The entrance (FINANCE_MOTION.md §4 KPI rows) plays once per build of the
    // row, the first time it is on show: tiles rise 60 ms apart, numbers tick
    // up as each lands, sparklines draw left to right and their end dot pops,
    // deltas arrive last.
    E.kpisPending = !MK.reduced(); E.kpisEnter = false; E.kpiSet = null;
    E.kpis.addEventListener('scroll', () => { E.kpisScrolled = true; }, { passive: true });   // @p2 see applyKpiSet
    KPI_DEFS.forEach((d, i) => {
      const v = h('div', { class: 'fv-kpi-v' }), dl = h('div', { class: 'fv-kpi-d' }), sp = h('div', { class: 'fv-kpi-sp' }), sub = h('div', { class: 'fv-kpi-sub' });
      const el = h('button', { type: 'button', class: 'fv-kpi' + (d.hero ? ' hero' : ''), style: { '--i': i }, 'data-k': d.k },
        h('div', { class: 'fv-kpi-l' }, h('span', { class: 'fv-kpi-ic', 'aria-hidden': 'true' }, ic(d.icon)), h('span', { text: d.l })), v, dl, sub, sp);
      el.addEventListener('click', () => {
        if (d.go === 'big') { const t = R.ctx && R.ctx.kpi && R.ctx.kpi.bigTx; if (t) openMerchant(t.m); return; }
        setSection(d.go);
      });
      E.kpis.append(el); E.kpi[d.k] = { el, v, dl, sp, sub, d, i, painted: false, dir: null, last: null };
    });
  }
  // Show the tiles section `id` wants (called by paintSecOpts on every section build).
  function applyKpiSet(id) {
    const E = R.els; if (!E.kpi) return;
    const set = kpiSetFor(id);
    const key = set === true ? 'all' : set === false ? 'none' : set.join(',');
    E.kpis.hidden = set === false;
    if (E.kpiSet !== key) {
      const had = E.kpiSet != null;
      E.kpiSet = key;
      const list = Array.isArray(set) ? set : null;
      E.kpis.classList.toggle('is-compact', !!list);
      if (list) E.kpis.style.setProperty('--kn', String(Math.max(1, list.length)));
      let vis = 0;
      for (const d of KPI_DEFS) {
        const k = E.kpi[d.k]; const at = list ? list.indexOf(d.k) : KPI_DEFS.indexOf(d);
        k.el.hidden = at < 0;
        k.el.style.order = at < 0 ? '' : String(at);
        if (at >= 0) k.el.style.setProperty('--i', String(vis++));
      }
      // The phone row scrolls sideways: a new set starts at its first tile (scroll-snap would
      // otherwise chase the tile that was in view before the reorder).
      // @p2 only when the row was scrolled: writing scrollLeft forces a layout of the half-built section.
      if (E.kpisScrolled) { E.kpisScrolled = false; E.kpis.scrollLeft = 0; }
      // A different set crossfades in (not on the first show, which has its entrance).
      if (had && set !== false && !E.kpisPending && !MK.reduced() && typeof E.kpis.animate === 'function') E.kpis.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
    }
    if (set !== false && E.kpisPending) kpiEntrance();
  }
  function kpiEntrance() {
    const E = R.els; E.kpisPending = false;
    if (MK.reduced()) return;
    E.kpisEnter = true; E.kpis.classList.add('fv-kpis-enter');
    for (const d of KPI_DEFS) {
      const k = E.kpi[d.k]; if (k.el.hidden || !k.last) continue;
      const i = +k.el.style.getPropertyValue('--i') || 0;
      k.v._fvVal = 0; k.v._fvTicked = false;
      MK.tick(k.v, k.last.v, k.last.f, { delay: i * 60 + 200 });
    }
    clearTimeout(E.kpiT);
    E.kpiT = setTimeout(() => { if (E.kpis) E.kpis.classList.remove('fv-kpis-enter'); E.kpisEnter = false; }, 2400);
  }
  function projection(M, q) {
    const today = M.anchor; const mi = monthIdx(today); const ms = monthStart(mi), me = monthEnd(mi);
    const rows = M.tx.filter(t => t.kind === 'spend' && t.n >= ms && t.n <= today && q(t));
    const mtd = sum(rows, t => t.s); const elapsed = today - ms + 1, total = me - ms + 1;
    const t0 = Math.max(M.minN, ms - 90); const tdays = ms - t0;
    let rate90 = null;
    if (tdays >= 14) {
      const tr = M.tx.filter(t => t.kind === 'spend' && t.n >= t0 && t.n < ms && q(t) && t.s < M.p99);
      rate90 = sum(tr, t => t.s) / tdays;
    }
    const rateM = mtd / elapsed; const w = elapsed / total;
    const rate = rate90 == null ? rateM : w * rateM + (1 - w) * rate90;
    const proj = mtd + Math.max(0, rate) * (total - elapsed);
    const pm = mi - 1; const pms = monthStart(pm), pme = monthEnd(pm);
    const lastFull = pms >= M.minN ? sum(M.tx.filter(t => t.kind === 'spend' && t.n >= pms && t.n <= pme && q(t)), t => t.s) : null;
    const cum = []; let c = 0;
    const daily = new Array(elapsed).fill(0); rows.forEach(t => { daily[t.n - ms] += t.s; });
    daily.forEach(v => { c += v; cum.push(c); });
    return { mtd, proj, lastFull, elapsed, total, cum, mi };
  }
  // The KPI numbers, without the DOM: paintKpis shows them and
  // FinanceView._numbers() reports them (the numbers audit), so restyling
  // the tiles can never change a figure unnoticed.
  function kpiNumbers(ctx) {
    const M = ctx.M; const { cur, prv } = ctx;
    const spent = sum(cur.spend, x => x.s), spentP = sum(prv.spend, x => x.s);
    const effP = Math.max(0, Math.min(ctx.prev.to, M.anchor) - Math.max(ctx.prev.from, M.minN) + 1);
    const income = sum(cur.income, x => x.inc), incomeP = sum(prv.income, x => x.inc);
    const net = income - spent, netP = incomeP - spentP;
    const rate = income > 0 ? net / income : null, rateP = incomeP > 0 ? netP / incomeP : null;
    const count = cur.spend.filter(x => x.s > 0).length, countP = prv.spend.filter(x => x.s > 0).length;
    let bigTx = null; for (const x of cur.spend) if (!bigTx || x.s > bigTx.s) bigTx = x;
    let bigP = 0; for (const x of prv.spend) bigP = Math.max(bigP, x.s);
    const proj = projection(M, pred());
    const has = ctx.hasPrev && effP > 0;
    const recs = M.recurring.filter(r => r.active);
    const avg = spent / ctx.days, avgP = has ? spentP / effP : null;
    return { spent, spentP, effP, income, incomeP, net, netP, rate, rateP, count, countP, bigTx, bigP, proj, has, recs, avg, avgP };
  }
  function paintKpis(ctx) {
    const E = R.els, M = ctx.M, t = tk(); if (!E.kpi) return;
    const { cur, buckets, ix } = ctx;
    const { spent, spentP, income, incomeP, net, netP, rate, rateP, count, countP, bigTx, bigP, proj, has, recs, avg, avgP } = kpiNumbers(ctx);
    const sSpend = seriesBy(cur.spend, buckets, ix, x => x.s);
    const sInc = seriesBy(cur.income, buckets, ix, x => x.inc);
    const sNet = sInc.map((v, i) => v - sSpend[i]);
    const bdays = buckets.map(b => b.e - b.s + 1);
    const sCount = seriesBy(cur.spend, buckets, ix, x => (x.s > 0 ? 1 : 0));
    const sBig = new Array(buckets.length).fill(0); cur.spend.forEach(x => { const i = ix(x.n); if (i >= 0 && i < sBig.length) sBig[i] = Math.max(sBig[i], x.s); });
    const vs = ctx.rg.len === 1 ? 'vs previous day' : `vs previous ${ctx.rg.len} days`;
    const vals = {
      spent: { v: spent, f: gbp, prev: has ? spentP : null, sp: sSpend },
      avg: { v: avg, f: gbp, prev: avgP, sp: sSpend.map((v, i) => v / bdays[i]), sub: `over ${ctx.days} day${ctx.days === 1 ? '' : 's'}` },
      income: { v: income, f: gbp, prev: has ? incomeP : null, sp: sInc, color: t.income },
      net: { v: net, f: x => (x > 0.5 ? '+' : '') + gbp(x), prev: has ? netP : null, sp: sNet, abs: true },
      rate: { v: rate, f: x => x == null ? '—' : pct(x), prev: has ? rateP : null, sp: sInc.map((v, i) => v > 0 ? sNet[i] / v : null), pts: true, sub: income > 0 ? '' : 'No income in range' },
      count: { v: count, f: x => nf0.format(Math.round(x)), prev: has ? countP : null, sp: sCount, sub: count ? `avg ${gbp2(spent / Math.max(1, count))}` : '' },
      big: { v: bigTx ? bigTx.s : 0, f: gbp, prev: has ? bigP : null, sp: sBig, sub: bigTx ? `${bigTx.m} · ${fDay(bigTx.n)}` : 'Nothing yet' },
      rec: { v: M.recurringMonthly, f: gbp, prev: null, sp: null, sub: `${recs.length} active payment${recs.length === 1 ? '' : 's'} · ${gbp(M.recurringMonthly * 12)}/yr` },
      proj: { v: proj.proj, f: gbp, prev: proj.lastFull, sp: proj.cum, projEnd: proj.proj, slots: proj.total, sub: `${gbp(proj.mtd)} so far in ${fMonthS(proj.mi)} · day ${proj.elapsed}/${proj.total}`, vs: 'vs last month' },
    };
    ctx.kpi = { bigTx };
    const calm = MK.reduced();
    for (const d of KPI_DEFS) {
      const k = E.kpi[d.k], x = vals[d.k];
      const first = !k.painted; k.painted = true;
      k.last = { v: x.v, f: x.f };
      // Before the row's entrance (kpiEntrance counts up from zero): just the value. Later: old -> new.
      if (E.kpisPending || first) { if (k.v._fvRaf) { cancelAnimationFrame(k.v._fvRaf); k.v._fvRaf = 0; } k.v._fvVal = x.v; k.v.textContent = x.f(x.v); }
      else MK.tick(k.v, x.v, x.f);
      // Delta (rebuilt only when it changes, so a repaint never re-runs anything)
      let dkey = 'none', dir = null, parts = null, tone = 'flat';
      if (x.prev != null && x.v != null && isFinite(x.prev)) {
        let txt;
        if (d.k === 'rate') { const dd = (x.v - x.prev) * 100; dir = Math.sign(Math.round(dd)); txt = `${dd >= 0 ? '+' : '−'}${Math.abs(dd).toFixed(0)} pts`; }
        else if (x.abs || Math.abs(x.prev) < 0.5) { const dd = x.v - x.prev; dir = Math.sign(Math.round(dd)); txt = (dd >= 0 ? '+' : '−') + gbp(Math.abs(dd)).replace('−', ''); if (d.k === 'count') txt = (dd >= 0 ? '+' : '−') + nf0.format(Math.abs(dd)); }
        else { const r = (x.v - x.prev) / Math.abs(x.prev); dir = Math.abs(r) < 0.005 ? 0 : Math.sign(r); txt = `${r >= 0 ? '+' : '−'}${Math.abs(r * 100) < 10 ? Math.abs(r * 100).toFixed(1) : Math.abs(r * 100).toFixed(0)}%`; if (Math.abs(r) < 0.0005) txt = 'No change'; if (r >= 9.995 && x.prev > 0) txt = '×' + (x.v / x.prev < 100 ? nf1 : nf0).format(x.v / x.prev); }   // @p1: not "+0.0%" · @p2: ten times or more reads "×1,309", not "+130845%"
        tone = !dir || !d.good ? 'flat' : (dir * d.good > 0 ? 'good' : 'bad');
        parts = [txt, ' ' + (x.vs || vs)]; dkey = tone + '|' + dir + '|' + parts.join('');
      } else if (d.hero && !has) { parts = [null, ctx.rg.from <= M.minN ? 'All of your history' : 'No earlier data to compare']; dkey = 'h|' + parts[1]; }
      if (k.dkey !== dkey) {
        k.dkey = dkey; k.dl.innerHTML = ''; k.dl.className = 'fv-kpi-d ' + tone;
        if (parts && parts[0] != null) {
          const arr = h('span', { class: 'arr' }, ic(dir > 0 ? 'arrow-up' : dir < 0 ? 'arrow-down' : 'minus'));
          k.dl.append(arr, h('b', { text: parts[0] }), h('span', { class: 'vs', text: parts[1] }));
          // The arrow turns over when the direction flips (not on the first paint, which has its own entrance).
          if (!first && k.dir != null && k.dir !== dir && !calm && typeof arr.animate === 'function')
            arr.animate([{ opacity: 0, transform: `translateY(${dir > 0 ? 5 : -5}px)` }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
        } else if (parts) k.dl.append(h('span', { class: 'vs', text: parts[1] }));
        k.dir = dir;
      }
      k.sub.textContent = x.sub || '';
      // Sparkline: redrawn only when its data changes; a changed one crossfades in.
      const col = x.color || t.accent;
      const skey = x.sp ? col + '|' + (x.projEnd || '') + '|' + (x.slots || '') + '|' + x.sp.map(v => v == null ? '' : Math.round(v * 100)).join(',') : '';
      if (k.skey !== skey) {
        k.skey = skey;
        k.sp.innerHTML = x.sp ? sparkSvg(x.sp, col, { proj: x.projEnd, slots: x.slots }) : '';
        if (!first && !calm && !E.kpisEnter && x.sp && typeof k.sp.animate === 'function') k.sp.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
      }
    }
  }

