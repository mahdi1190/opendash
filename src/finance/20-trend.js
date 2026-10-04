  // @part 20-trend.js · OWNER: C1 (trendChart; Overview calls it too)
  // ----- shared chart renderers -----
  // Spending per bucket (rounded bars that rise in turn and lift on hover, or a smooth area),
  // the average as a quiet dotted line, money in as teal markers along the top rail (so a payday
  // never flattens the spending scale), and the running total in a second grid that shares x.
  // A bucket only partly over is drawn faded, so it never reads as a dip.
  function trendChart(cd, ctx, key, big) {
    const t = tk(); const B = ctx.buckets, ix = ctx.ix;
    const spend = seriesBy(ctx.cur.spend, B, ix, x => x.s);
    // Money in is not split by category or merchant, so beside a filtered
    // spend series it would only dwarf the bars: hide it while one is active.
    const narrowed = F.cats.length || F.merchant;
    const inc = F.inc && !narrowed && ctx.cur.income.length ? seriesBy(ctx.cur.income, B, ix, x => x.inc) : null;
    const prev = F.compare && ctx.hasPrev ? ctx.prevSeries() : null;
    const hasAny = ctx.cur.spend.length || (inc && ctx.cur.income.length);
    const gl = { day: 'day', week: 'week', month: 'month' }[F.gran];
    const total = sum(spend);
    cd.setSub(`${gbp(total)} spent · ${B.length} ${gl}${B.length === 1 ? '' : 's'}${prev ? ` · previous period ${gbp(sum(prev))}` : F.compare ? ' · no earlier data to compare with' : ''}`);
    if (!hasAny) { cd.setEmpty('No spending in this range. Widen the dates or clear a filter.'); return; }
    let c1 = 0; const cum = spend.map(v => round2(c1 += v));
    let c2 = 0; const pcum = prev ? prev.map(v => round2(c2 += v)) : null;
    const avg = total / B.length;
    const labels = B.map(b => b.label);
    const part = B.map(b => C1.partial(b));
    const lineMode = key === 's:sp-trend' && F.spTrend === 'line';
    const incInk = t.dark ? '#5fdcc8' : '#0b7d70';
    // The three biggest payments in each bucket, for the tooltip (one pass).
    const tops = B.map(() => []);
    for (const x of ctx.cur.spend) {
      if (x.s <= 0) continue;
      const i = ix(x.n); if (i < 0 || i >= B.length) continue;
      const a = tops[i];
      if (a.length < 3 || x.s > a[a.length - 1].s) { a.push(x); a.sort((p, q) => q.s - p.s); if (a.length > 3) a.pop(); }
    }
    const narrow = (cd.chart.clientWidth || 800) < 560;
    const left = narrow ? 42 : 50, right = narrow ? 46 : 58;
    const barW = B.length <= 8 ? 34 : B.length <= 20 ? 24 : B.length <= 40 ? 16 : 10;
    const soFar = part[part.length - 1] ? `This ${gl} so far` : null;
    const legend = [{ name: 'Spent', icon: 'roundRect' }, soFar && { name: soFar, icon: 'roundRect' }, prev && { name: 'Previous period', icon: 'roundRect' },
      inc && { name: 'Money in', icon: 'circle' }, { name: 'Running total', icon: 'path://M0,3 L16,3 L16,5.5 L0,5.5 Z', itemStyle: { borderWidth: 0 } }].filter(Boolean);   // (the series' surface-coloured ring would hide a thin icon)
    const spent = lineMode
      ? FX.area({ id: 'spent', name: 'Spent', data: spend, area: 0.2, width: 2.25, symbols: B.length <= 40, xAxisIndex: 0, yAxisIndex: 0, universalTransition: { enabled: true } })
      : FX.bars({ id: 'spent', name: 'Spent', color: t.accent, radius: 4, width: barW, catGap: '42%', gap: '12%', morph: true, xAxisIndex: 0, yAxisIndex: 0,
        // Each bar is keyed by its bucket's date, so a range change slides the same weeks into place.
        data: spend.map((v, i) => (part[i] ? { name: diso(B[i].s), value: v, itemStyle: { color: alpha(t.accent, t.dark ? 0.5 : 0.42) } } : { name: diso(B[i].s), value: v })) });
    if (!lineMode) spent.emphasis = C1.lift(t.accent);
    if (B.length > 2) spent.markLine = { symbol: 'none', silent: true, lineStyle: { color: alpha(t.text, 0.35), width: 1, type: [2, 3] },
      label: { position: 'insideStartTop', formatter: 'avg ' + gbpShort(avg), color: t.muted, fontSize: 10.5, fontWeight: 550, fontFamily: FONT, backgroundColor: alpha(t.card, 0.85), padding: [1, 4], borderRadius: 3 },
      data: [{ yAxis: round2(avg) }] };
    const option = base({
      grid: [{ left, right, top: narrow ? 62 : 40, bottom: big ? '38%' : '40%' }, { left, right, top: '70%', bottom: 46 }],
      legend: { top: 4, left: 0, right: 0, selectedMode: false, itemWidth: 14, itemHeight: 9, itemGap: narrow ? 10 : 16, textStyle: { color: t.muted, fontSize: narrow ? 11 : 11.5, fontFamily: FONT }, data: legend },
      xAxis: [C1.xCat(labels, { extra: { gridIndex: 0 }, label: { show: false } }), C1.xCat(labels, { extra: { gridIndex: 1 }, pill: true })],
      yAxis: [C1.yOut({ ticks: 4, extra: { gridIndex: 0 } }), C1.yOut({ ticks: 2, extra: { gridIndex: 1 } }), { type: 'value', gridIndex: 0, min: 0, max: 1, show: false, splitLine: { show: false } }],
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      tooltip: C1.tooltip({
        trigger: 'axis', pointer: lineMode ? 'line' : 'shadow',
        formatter: ps => {
          const i = ps[0].dataIndex; const b = B[i]; if (!b) return '';
          const d = spend[i] - avg;
          const rows = [{ c: part[i] ? alpha(t.accent, 0.5) : t.accent, key: 'bx', v: gbp2(spend[i]), k: part[i] ? 'spent so far' : 'spent' }];
          if (prev) { const dp = spend[i] - prev[i]; rows.push({ c: t.ghost, key: 'bx', v: gbp2(prev[i]), k: `previous period (${dp >= 0 ? '+' : '−'}${gbp(Math.abs(dp))})` }); }
          if (B.length > 2) rows.push({ key: 'none', v: (d >= 0 ? '+' : '−') + gbp(Math.abs(d)), k: `vs the average ${gl}`, muted: true });
          if (inc && inc[i] > 0) rows.push({ c: t.income, key: 'circ', v: gbp2(inc[i]), k: 'money in' });
          rows.push({ c: t.accent, key: 'ln', v: gbp(cum[i]), k: 'running total' });
          return C1.tip(b.long, rows, { items: tops[i].map(x => ({ m: x.m, c: x.c, a: x.s })), foot: b.s === b.e ? 'Click for the day’s payments' : 'Click to zoom in · drag across bars to pick dates' });
        },
      }),
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], zoomOnMouseWheel: 'ctrl', moveOnMouseMove: false, moveOnMouseWheel: false, start: 0, end: 100 },
        C1.zoom({ xAxisIndex: [0, 1], start: 0, end: 100, left: left - 6, right: right - 6 }),
      ],
      brush: { xAxisIndex: 0, brushType: 'lineX', brushMode: 'single', transformable: false, throttleType: 'debounce', throttleDelay: 120, brushStyle: { borderWidth: 1, color: alpha(t.accent, 0.1), borderColor: alpha(t.accent, 0.45) }, outOfBrush: { colorAlpha: 0.3 } },
      toolbox: { show: false, feature: { brush: { type: ['lineX'] } } },
      series: [
        spent,
        // An empty series that only gives "This week so far" its legend swatch.
        soFar && { id: 'sofar', name: soFar, type: 'bar', xAxisIndex: 0, yAxisIndex: 0, data: [], itemStyle: { color: alpha(t.accent, t.dark ? 0.5 : 0.42) }, silent: true },
        prev && (lineMode
          ? FX.smoothLine({ id: 'prev', name: 'Previous period', data: prev, color: t.dim, width: 1.5, dashed: true, xAxisIndex: 0, yAxisIndex: 0, z: 2 })
          : Object.assign(FX.bars({ id: 'prev', name: 'Previous period', data: prev, color: t.ghost, radius: 4, width: barW, xAxisIndex: 0, yAxisIndex: 0, z: 1, lift: false }), { barGap: '12%' })),
        // Paydays and refunds: a teal marker on the top rail, labelled, on their own hidden 0-1 axis.
        inc && { id: 'inDot', name: 'Money in', type: 'scatter', xAxisIndex: 0, yAxisIndex: 2, data: inc.map(v => (v > 0 ? 0.965 : null)), symbol: 'circle', symbolSize: 8, z: 6,
          itemStyle: { color: t.income, borderColor: t.card, borderWidth: 2 }, emphasis: { scale: 1.5 },
          labelLayout: { hideOverlap: true },
          label: { show: !narrow, position: 'left', distance: 5, color: incInk, fontSize: 10.5, fontWeight: 650, fontFamily: FONT, formatter: p => '+' + gbpShort(inc[p.dataIndex]) },
          animationDelay: FX.animated() ? i => 500 + Math.min(i * 20, 400) : 0 },
        // Chart kit: monotone smoothing passes through every point, so the running total's end is exact.
        FX.area({ id: 'cum', name: 'Running total', xAxisIndex: 1, yAxisIndex: 1, data: cum, area: 0.2, width: 2.25, symbolSize: 8, endLabel: v => gbpShort(v) }),
        ctx.rg.to === ctx.M.anchor && FX.pulse({ id: 'cum-now', at: [labels.length - 1, cum[cum.length - 1]], xAxisIndex: 1, yAxisIndex: 1, delay: FX.MOTION.draw }),
        pcum && FX.smoothLine({ id: 'pcum', name: 'Previous running total', xAxisIndex: 1, yAxisIndex: 1, data: pcum, width: 1.5, color: t.dim, dashed: true }),
      ].filter(Boolean),
    });
    const c = C1.draw(cd, key, option, { after: c0 => {
      c0.inst.dispatchAction({ type: 'takeGlobalCursor', key: 'brush', brushOption: { brushType: 'lineX', brushMode: 'single' } });
      FX.live(c0);
    } });
    if (!c) return;
    on(c, 'click', p => {
      if (p.componentType !== 'series' || p.seriesId === 'cum-now') return;
      const b = B[p.dataIndex]; if (!b) return;
      if (b.s === b.e) { openDay(b.s); return; }
      if (b.s === ctx.rg.from && b.e === ctx.rg.to) return;   // already the whole range: nothing to zoom into
      setCustomRange(b.s, b.e);
    });
    on(c, 'brushEnd', p => {
      const area = p.areas && p.areas[0]; if (!area) return;
      let r = area.coordRange;
      if (!r && area.range) r = area.range.map(px => c.inst.convertFromPixel({ xAxisIndex: 0 }, px));
      if (!r) return;
      const i0 = clamp(Math.round(Math.min(r[0], r[1])), 0, B.length - 1), i1 = clamp(Math.round(Math.max(r[0], r[1])), 0, B.length - 1);
      c.inst.dispatchAction({ type: 'brush', areas: [] });
      if (i1 > i0) setCustomRange(B[i0].s, B[i1].e);
    });
  }
