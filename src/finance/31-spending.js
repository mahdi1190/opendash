  // @part 31-spending.js · OWNER: C1 (Spending section: trend, pace, patterns, calendar, sizes, biggest payments)
  // ----- Spending -----
  BUILD.spending = g => {
    S.trend = card(g, { title: 'Spending over time', span: 12, chart: true, height: 420 });
    S.trendSeg = seg([['bars', 'Bars'], ['line', 'Line']], F.spTrend === 'line' ? 'line' : 'bars', v => { F.spTrend = v; saveF(); S.trendSeg.set(v); trendChart(S.trend, R.ctx, 's:sp-trend', true); }, 'Chart style');
    S.trend.tools.append(h('span', { class: 'fv-hint', text: 'Drag across bars to pick dates · click one to drill in · Ctrl+scroll to zoom' }), S.trendSeg.el);
    S.pace = card(g, { title: 'Pace against the previous period', span: 8, md: 12, chart: true, height: 260, fill: true });
    S.dow = card(g, { title: 'When you spend', span: 4, md: 12, chart: true, height: 196, fill: true });
    S.dowSeg = seg([['week', 'Week'], ['month', 'Month']], F.spPattern === 'month' ? 'month' : 'week', v => { F.spPattern = v; saveF(); S.dowSeg.set(v); dayOfWeek(S.dow, R.ctx); }, 'Pattern');
    S.dow.tools.append(S.dowSeg.el);
    S.wk = h('div', { class: 'fv-mini-stats' }); S.dow.body.append(S.wk);
    S.cal = card(g, { title: 'Every day', span: 12, chart: true, height: 200 });
    S.calLegend = h('div', { class: 'c1-scale', 'aria-hidden': 'true' }); S.cal.body.append(S.calLegend);
    S.hist = card(g, { title: 'Payment sizes', span: 6, chart: true, height: 250, fill: true });
    S.histSeg = seg([['count', 'Count'], ['total', SYM + ' total']], F.histMode, v => { F.histMode = v; saveF(); S.histSeg.set(v); histogram(S.hist, R.ctx); }, 'Measure');
    S.hist.tools.append(S.histSeg.el);
    S.large = card(g, { title: 'Biggest payments', span: 6 });
    S.flags = card(g, { title: 'Flags', span: 12, md: 6, cls: 'fv-flags-wide' });
    c1WireKeys();
  };
  UPDATE.spending = ctx => {
    trendChart(S.trend, ctx, 's:sp-trend', true);
    paceChart(S.pace, ctx);
    dayOfWeek(S.dow, ctx);
    calendar(S.cal, ctx);
    histogram(S.hist, ctx);
    largest(S.large, ctx);
    flagList(S.flags, ctx, 40);
  };
  // NEW: cumulative spending by day of the period, against the same day of the previous period.
  function paceChart(cd, ctx) {
    const t = tk(); const M = ctx.M;
    if (!ctx.hasPrev) { cd.setSub(''); cd.setEmpty('There is no earlier period of the same length in your data. Pick a shorter range to compare.'); return; }
    if (!ctx.cur.spend.length && !ctx.prv.spend.length) { cd.setSub(''); cd.setEmpty('No spending in either period.'); return; }
    const P = C1.pace(ctx.cur.spend, ctx.prv.spend, ctx.rg, ctx.prev, ctx.effTo, M.minN);
    // Most of the previous period is before your data starts: a comparison would only mislead.
    const covered = P.prev.filter(v => v != null).length / Math.max(1, P.len);
    if (covered < 0.5) { cd.setSub(''); cd.setEmpty(`Your data starts ${nf0.format(ctx.rg.from - M.minN)} day${ctx.rg.from - M.minN === 1 ? '' : 's'} before this period, too soon to compare it with the ${nf0.format(P.len)} days before. Pick a shorter range.`); return; }
    const now = P.cur[P.today], was = P.prevAtToday;
    const diff = was == null ? null : now - was;
    cd.setSub(diff == null ? 'The previous period is mostly before your data starts'
      : `${gbp(Math.abs(diff))} ${diff <= 0 ? 'less' : 'more'} than by the same day last period${P.partialPrev ? ' · the previous period starts before your data' : ''}`);
    const labels = []; for (let i = 0; i < P.len; i++) labels.push(fDay(ctx.rg.from + i));
    const lastX = P.today;
    const option = base({
      grid: { left: 6, right: 70, top: 46, bottom: 28 },   // @p1: room for the top y label under the legend
      legend: { top: 2, left: 0, selectedMode: false, itemWidth: 16, itemHeight: 8, itemGap: 16, textStyle: { color: t.muted, fontSize: 11.5, fontFamily: FONT },
        data: [{ name: 'This period', icon: 'path://M0,3 L16,3 L16,5.5 L0,5.5 Z', itemStyle: { borderWidth: 0 } }, { name: 'Previous period', icon: 'path://M0,3 L5,3 L5,5.5 L0,5.5 Z M8,3 L13,3 L13,5.5 L8,5.5 Z', itemStyle: { borderWidth: 0 } }] },
      xAxis: C1.xCat(labels, { edge: true, pill: true, width: (cd.chart.clientWidth || 0) - 76 }),
      yAxis: C1.yIn({ ticks: 3 }),
      tooltip: C1.tooltip({ trigger: 'axis', formatter: ps => {
        const i = ps[0].dataIndex; const a = P.cur[i], b = P.prev[i];
        const rows = [a != null ? { c: t.accent, v: gbp(a), k: 'spent by this day' } : null,
          b != null ? { c: t.dim, key: 'ds', v: gbp(b), k: `by ${fDay(ctx.prev.from + i)} last period` } : { key: 'none', v: '—', k: 'previous period not in your data', muted: true }];
        if (a != null && b != null) { const d = a - b; rows.push({ key: 'none', v: gbp(Math.abs(d)), k: d <= 0 ? 'less than last period' : 'more than last period', tone: d <= 0 ? 'good' : 'warn' }); }
        return C1.tip(fDayLong(ctx.rg.from + i), rows, { sub: `day ${i + 1} of ${P.len}` });
      } }),
      series: [
        FX.smoothLine({ id: 'prev', name: 'Previous period', data: P.prev, color: t.dim, width: 1.75, dashed: true, z: 2,
          endLabel: v => gbpShort(v) }),
        FX.area({ id: 'cur', name: 'This period', data: P.cur, color: t.accent, area: t.dark ? 0.3 : 0.2, width: 2.25, z: 4, endLabel: v => gbp(v) }),
        FX.pulse({ id: 'cur-now', at: [lastX, now], z: 4, delay: FX.MOTION.draw }),
      ],
    });
    // The previous period's end label is quieter than this period's, and steps aside when the two would collide.
    const top = Math.max(1, ...P.cur.filter(v => v != null), ...P.prev.filter(v => v != null));
    if (option.series[0].endLabel) {
      if (P.prevTotal == null || Math.abs(P.prevTotal - now) < top * 0.09) delete option.series[0].endLabel;
      else Object.assign(option.series[0].endLabel, { color: t.muted, fontWeight: 500 });
    }
    C1.draw(cd, 's:sp-pace', option, { after: c => FX.live(c) });
  }
  function dayOfWeek(cd, ctx) {
    const t = tk();
    const monthMode = F.spPattern === 'month';
    S.wk.innerHTML = '';
    S.wk.classList.toggle('c1-three', monthMode);
    if (!ctx.cur.spend.length) { cd.setEmpty('No spending in this range.'); return; }
    const ghost = alpha(t.accent, t.dark ? 0.34 : 0.26);
    const stat = (label, val, unit, extra) => {
      const b = h('b', { class: 'num' });
      const el = h('div', null, h('span', { class: 'l', text: label }), b, h('span', { class: 'l', text: unit }), extra || null);
      S.wk.append(el); MK.tick(b, val, v => (v == null ? '—' : gbp(v)));
      return el;
    };
    let option;
    if (!monthMode) {
      const sums = new Array(7).fill(0), days = new Array(7).fill(0);
      for (let n = ctx.effFrom; n <= ctx.effTo; n++) days[dow(n)]++;
      ctx.cur.spend.forEach(x => { sums[dow(x.n)] += x.s; });
      const avg = sums.map((s, i) => days[i] ? round2(s / days[i]) : 0);
      const wkd = sum(sums.slice(0, 5)) / Math.max(1, sum(days.slice(0, 5))), wke = sum(sums.slice(5)) / Math.max(1, sum(days.slice(5)));
      // Card payments are dated by the day they post, so weekends can be empty
      // without meaning no spending: say so rather than show a green "−100%".
      const postingGap = wke < 0.5 && wkd > 0 && sum(days.slice(5)) >= 4;
      const diff = wkd > 0 && !postingGap ? (wke - wkd) / wkd : null;
      stat('Weekdays', wkd, ' a day');
      stat('Weekends', postingGap ? null : wke, postingGap ? ' posted on weekdays' : ' a day',
        diff != null ? h('span', { class: 'fv-delta ' + (Math.abs(diff) < 0.05 ? 'flat' : diff > 0 ? 'bad' : 'good'), text: ` ${diff >= 0 ? '+' : '−'}${Math.abs(diff * 100).toFixed(0)}%` }) : null);
      cd.setSub(postingGap
        ? 'Average per calendar day · your bank dates card payments by posting day, so weekend spending shows up on weekdays'
        : 'Average spent per calendar day');
      const peak = avg.indexOf(Math.max(...avg));
      const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const s = FX.bars({ id: 'dow', name: 'Average a day', radius: 5, width: 26, catGap: '30%', color: t.accent,
        data: avg.map((v, i) => ({ value: v, itemStyle: { color: i === peak ? t.accent : ghost } })),
        label: Object.assign(FX.numLabel({ fmt: v => gbp(v), color: t.text, weight: 650 }), { formatter: p => (p.dataIndex === peak ? gbp(p.value) : '') }) });
      s.emphasis = C1.lift(t.accent);
      option = base({
        grid: { left: 2, right: 4, top: 22, bottom: 2, containLabel: true },
        tooltip: C1.tooltip({ trigger: 'axis', pointer: 'shadow', formatter: ps => { const i = ps[0].dataIndex; return C1.tip(names[i], [{ c: t.accent, key: 'bx', v: gbp2(avg[i]), k: 'on an average day' }, { key: 'none', v: gbp2(sums[i]), k: `over ${days[i]} day${days[i] === 1 ? '' : 's'}`, muted: true }]); } }),
        xAxis: C1.xCat(WD, { line: true }), yAxis: C1.yOut({ ticks: 3 }),
        series: [s],
      });
    } else {
      // NEW: the time-of-month pattern (average spend on each day of the month, per calendar day).
      const md = C1.monthDays(ctx.cur.spend, ctx.effFrom, ctx.effTo);
      stat('1st – 10th', md.early, ' a day'); stat('11th – 20th', md.mid, ' a day'); stat('21st – end', md.late, ' a day');
      cd.setSub('Average spent on each day of the month');
      const peak = md.avg.indexOf(Math.max(...md.avg));
      const lbl = []; for (let i = 1; i <= 31; i++) lbl.push(String(i));
      const s = FX.bars({ id: 'dow', name: 'Average a day', radius: 3, width: 10, catGap: '28%', color: t.accent,
        data: md.avg.map((v, i) => ({ value: v, itemStyle: { color: i === peak ? t.accent : ghost } })),
        label: Object.assign(FX.numLabel({ fmt: v => gbp(v), color: t.text, weight: 650 }), { formatter: p => (p.dataIndex === peak ? gbp(p.value) : '') }) });
      s.emphasis = C1.lift(t.accent);
      option = base({
        grid: { left: 2, right: 4, top: 22, bottom: 2, containLabel: true },
        tooltip: C1.tooltip({ trigger: 'axis', pointer: 'shadow', formatter: ps => { const i = ps[0].dataIndex; return C1.tip(`Day ${i + 1} of the month`, [{ c: t.accent, key: 'bx', v: gbp2(md.avg[i]), k: 'on an average day' }, { key: 'none', v: gbp2(md.sums[i]), k: `over ${md.days[i]} day${md.days[i] === 1 ? '' : 's'}`, muted: true }]); } }),
        xAxis: C1.xCat(lbl, { line: true, label: { interval: i => i === 0 || (i + 1) % 5 === 0 } }), yAxis: C1.yOut({ ticks: 3 }),
        series: [s],
      });
    }
    C1.draw(cd, 's:sp-dow', option);
  }
  // Every day of the range (up to a year) as a calendar heatmap. Five quantile bins, so one
  // rent-sized day never washes out the rest. Cells ripple in once, week by week.
  function calendar(cd, ctx) {
    const t = tk(); const M = ctx.M;
    const to = ctx.rg.to, from = Math.max(ctx.rg.from, to - 370);
    const daily = new Map(); const counts = new Map(); const tops = new Map();
    ctx.cur.spend.forEach(x => {
      if (x.n < from) return;
      daily.set(x.n, (daily.get(x.n) || 0) + x.s); counts.set(x.n, (counts.get(x.n) || 0) + 1);
      if (x.s > 0) { const a = tops.get(x.n) || []; a.push(x); if (a.length > 3) { a.sort((p, q) => q.s - p.s); a.pop(); } tops.set(x.n, a); }
    });
    const vals = [...daily.values()].filter(v => v > 0);
    const nDays = vals.length;
    cd.setSub(`${ctx.rg.from < from ? 'The last 12 months of the range' : 'Each day of the range'} · ${nf0.format(nDays)} day${nDays === 1 ? '' : 's'} with spending · click a day for its payments`);
    if (!vals.length) { cd.setEmpty('No spending in this range.'); S.calLegend.innerHTML = ''; return; }
    const edges = C1.heatBins(vals); const nb = edges.length + 1;
    const colOf = b => t.seq[nb <= 1 ? 4 : 1 + Math.round(b * 4 / (nb - 1))];
    const w0 = weekStart(from);
    const weeks = Math.floor((weekStart(to) - w0) / 7) + 1;
    const w = cd.chart.clientWidth || 700;
    // @p1: near-square cells, the grid centred (C1.calCells); its scale legend follows it.
    const { cw, ch, left: calLeft } = C1.calCells(w, weeks);
    S.calLegend.style.paddingLeft = calLeft + 'px';
    cd.chart.style.height = (ch * 7 + 30) + 'px';
    const data = [];
    for (let n = from; n <= to; n++) {
      const v = daily.get(n) || 0;
      data.push({ name: diso(n), value: [diso(n), round2(v), v > 0 ? C1.binOf(v, edges) : -1, Math.floor((weekStart(n) - w0) / 7), dow(n)] });
    }
    const anim = FX.animated();
    const anchorIso = diso(M.anchor);
    const option = base({
      tooltip: C1.tooltip({ trigger: 'item', formatter: p => {
        const iso = p.data && p.data.value ? p.data.value[0] : null; if (!iso) return '';
        const n = dnum(iso); const v = p.data.value[1]; const k = counts.get(n) || 0;
        if (!(v > 0)) return C1.tip(fDayLong(n), [{ key: 'none', v: k ? gbp2(v) : '—', k: k ? 'net of refunds' : 'no spending', muted: true }]);
        return C1.tip(fDayLong(n), [{ c: colOf(p.data.value[2]), key: 'bx', v: gbp2(v), k: 'spent' }, { key: 'none', v: String(k), k: k === 1 ? 'payment' : 'payments', muted: true }],
          { items: (tops.get(n) || []).sort((a, b) => b.s - a.s).map(x => ({ m: x.m, c: x.c, a: x.s })), foot: 'Click for the day’s payments' });
      } }),
      calendar: {
        // @p1: no right/bottom, or ECharts stretches the cells to fill the card.
        top: 22, left: calLeft, cellSize: [cw, ch], range: [diso(from), diso(to)], orient: 'horizontal',
        splitLine: { show: false }, itemStyle: { color: 'transparent', borderWidth: 0 },
        dayLabel: { firstDay: 1, nameMap: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], color: t.dim, fontSize: 10, fontFamily: FONT, margin: 8 },
        monthLabel: { color: t.muted, fontSize: 11, fontFamily: FONT, margin: 6, nameMap: 'EN', align: 'left' }, yearLabel: { show: false },
      },
      series: [{ id: 'cal', type: 'custom', coordinateSystem: 'calendar', data, animation: anim,
        renderItem: (params, api) => {
          const iso = data[params.dataIndex] && data[params.dataIndex].value[0]; if (!iso) return null;
          const p = api.coord(iso); if (!p) return null;
          const cs = params.coordSys; const gap = Math.max(2, Math.round(Math.min(cs.cellWidth, cs.cellHeight) / 7));
          const ww = Math.max(2, cs.cellWidth - gap), hh = Math.max(2, cs.cellHeight - gap);
          const v = api.value(1), b = api.value(2), wk = api.value(3), dw = api.value(4);
          const today = iso === anchorIso;
          return {
            type: 'rect', shape: { x: p[0] - ww / 2, y: p[1] - hh / 2, width: ww, height: hh, r: Math.min(4, Math.min(ww, hh) / 4) },
            originX: p[0], originY: p[1],
            style: { fill: v > 0 ? colOf(b) : t.hover, stroke: today ? t.text : null, lineWidth: today ? 1.5 : 0 },
            emphasis: { style: { stroke: t.text, lineWidth: 1.5 } },
            transition: ['shape', 'style'],
            enterFrom: anim ? { scaleX: 0.3, scaleY: 0.3, style: { opacity: 0 } } : undefined,
            enterAnimation: anim ? { duration: 480, easing: 'cubicOut', delay: Math.min(wk * 18 + dw * 14, 1100) } : undefined,
          };
        } }],
    });
    C1.draw(cd, 's:sp-cal', option);
    const c = R.charts.get('s:sp-cal');
    if (c) on(c, 'click', p => { const iso = p.data && p.data.value && p.data.value[0]; if (iso && p.data.value[1] !== 0) openDay(dnum(iso)); });
    // The scale, in HTML: Less [five steps] More, with each step's amounts.
    S.calLegend.innerHTML = '';
    const lab = i => (i === 0 ? `${gbp(0)}–${gbp(edges[0])}` : i === nb - 1 ? `${gbp(edges[nb - 2])}+` : `${gbp(edges[i - 1])}–${gbp(edges[i])}`);
    S.calLegend.append(h('span', { text: 'Less' }), ...Array.from({ length: nb }, (_, i) => h('i', { style: { background: colOf(i) }, title: lab(i) })), h('span', { text: 'More' }),
      h('span', { class: 'c1-scale-v', text: nb > 1 ? Array.from({ length: nb }, (_, i) => lab(i)).join(' · ') : '' }));
  }
  function histogram(cd, ctx) {
    const t = tk(); const M = ctx.M;
    const q = pred({ amt: true });
    const rows = M.tx.filter(x => x.kind === 'spend' && x.s > 0 && x.n >= ctx.rg.from && x.n <= ctx.rg.to && q(x));
    const bins = HIST_EDGES.slice(0, -1).map((lo, i) => ({ lo, hi: HIST_EDGES[i + 1], count: 0, total: 0 }));
    rows.forEach(x => { const b = bins.find(b2 => x.s >= b2.lo && x.s < b2.hi); if (b) { b.count++; b.total += x.s; } });
    while (bins.length > 4 && !bins[bins.length - 1].count) bins.pop();
    const lbl = b => b.hi === Infinity ? curBare(nf0.format(b.lo)) + '+' : curBare(`${nf0.format(b.lo)}–${nf0.format(b.hi)}`);
    // Compact axis labels so they never need rotating: <£5, £5–10 … £1k–2k, £2k+.
    const kk = v => (v >= 1000 ? (v / 1000) + 'k' : String(v));
    const axl = b => b.lo === 0 ? '<' + curBare(kk(b.hi)) : b.hi === Infinity ? curBare(kk(b.lo)) + '+' : curBare(`${kk(b.lo)}–${kk(b.hi)}`);
    if (!rows.length) { cd.setEmpty('No payments in this range.'); return; }
    const med = median(rows.map(x => x.s));
    cd.setSub(`${nf0.format(rows.length)} payments · median ${gbp2(med)} · click a bar to keep only that size`);
    const amt = F.amt;
    const isSel = b => !!amt && amt[0] === b.lo && (amt[1] === b.hi || b.hi === Infinity);
    const inSel = b => !amt || (b.hi > amt[0] && b.lo <= amt[1]);
    const count = F.histMode === 'count';
    const fmt = v => (count ? nf0.format(v) : gbpShort(v));
    const s = FX.bars({ id: 'h', name: count ? 'Payments' : 'Total', radius: 5, width: 34, catGap: '20%', color: t.accent,
      data: bins.map(b => ({ value: count ? b.count : round2(b.total), itemStyle: { color: inSel(b) ? t.accent : alpha(t.accent, t.dark ? 0.3 : 0.24) } })),
      label: Object.assign(FX.numLabel({ fmt, color: t.muted, size: 10.5 }), { formatter: p => (!p.value ? '' : fmt(p.value)) }) });
    s.emphasis = C1.lift(t.accent);
    const option = base({
      grid: { left: 2, right: 6, top: 22, bottom: 2, containLabel: true },
      tooltip: C1.tooltip({ trigger: 'axis', pointer: 'shadow', formatter: ps => { const b = bins[ps[0].dataIndex]; if (!b) return '';
        return C1.tip(lbl(b), [{ c: t.accent, key: 'bx', v: nf0.format(b.count), k: b.count === 1 ? 'payment' : 'payments' }, { key: 'none', v: gbp2(b.total), k: `in total · ${pct(b.total / Math.max(1, sum(bins, x => x.total)))} of spend`, muted: true }],
          { foot: isSel(b) ? 'Selected · Esc or × to clear' : 'Click to keep only this size' }); } }),
      xAxis: C1.xCat(bins.map(axl), { line: true, label: { interval: (cd.chart.clientWidth || 600) / bins.length >= 66 ? 0 : 'auto' } }),   // @p1: 54 px let "£100–200£200–500" touch
      yAxis: C1.yOut({ ticks: 3, fmt: count ? (v => nf0.format(v)) : (v => gbpShort(v)) }),
      series: [s],
    });
    const c = C1.draw(cd, 's:sp-hist', option);
    // Re-clicking the selected size does nothing (clear it with the chip ×, or Esc).
    on(c, 'click', p => { const b = bins[p.dataIndex]; if (!b || isSel(b)) return; F.amt = [b.lo, b.hi === Infinity ? M.maxAmt : b.hi]; changed(); });
  }
  function largest(cd, ctx) {
    const M = ctx.M;
    const rows = ctx.cur.spend.filter(x => x.s > 0).sort((p, q) => q.s - p.s).slice(0, 8);
    cd.body.querySelectorAll('.fv-list').forEach(x => x.remove());
    if (!rows.length) { cd.setEmpty('No payments in this range.'); return; }
    cd.setEmpty(null);
    const tot = sum(ctx.cur.spend, x => x.s);
    cd.setSub(`The top ${rows.length} make up ${pct(sum(rows, x => x.s) / Math.max(1, tot))} of spending`);
    const max = rows[0].s;
    const play = MK.once(cd.el, 'list') && !MK.reduced();
    const S2 = C1.sym();
    const ul = h('ul', { class: 'fv-list c1-big' + (play ? ' c1-play' : '') });
    rows.forEach((x, i) => {
      const cur = F.merchant === x.m;
      const badge = S2 && S2.txTypeBadge ? h('span', { class: 'c1-sym', html: S2.txTypeBadge(x, { compact: true, size: 'sm' }) }) : null;
      ul.append(h('li', { style: { '--i': i } }, h('button', { type: 'button', class: 'fv-row c1-big-row fsym-host', 'aria-current': cur ? 'true' : null, onclick: () => openMerchant(x.m) },
        C1.tileEl(x.m, x.c, 'md'),
        h('span', { class: 'fv-row-main' },
          h('span', { class: 'fv-row-t', text: x.m }),
          h('span', { class: 'fv-row-s' }, h('span', { class: 'c1-nw', text: fDayW(x.n) + ' ·' }), C1.catIconEl(x.c, { size: 'xs', plain: true, live: false }), h('span', { class: 'c1-ell', text: x.c })),
          h('span', { class: 'fv-row-bar c1-bar' }, h('i', { style: { transform: `scaleX(${(x.s / max).toFixed(4)})`, background: x.c === 'Uncategorised' ? tk().uncat : catColor(x.c) } }))),
        badge,
        h('span', { class: 'fv-row-v', text: gbp2(x.s) }))));
    });
    cd.body.append(ul);
    if (M && S2 && S2.activate) S2.activate(ul, { max: 6 });
  }
