  // @part 30-overview.js · OWNER: O (Overview section: the Money brief + the overview charts)
  // ----- Overview -----
  // The Money brief on top (26-money-ui.js, 27-money-chart.js, model in
  // 25-money-model.js): it follows the pay cycle (or the month), not the date
  // range, so the range bar's filters never move it. "More detail" below is
  // the range-driven view: spending over time, where it went, top merchants
  // and what's worth a look (the shared renderers, styled by the chart kit).
  // BUILD runs once per real entry (the entrance plays then); UPDATE repaints
  // in place on filters, saves, live sync and theme changes.
  BUILD.overview = g => {
    MB.painted = false;
    mbBuild(g);
    g.append(h('div', { class: 'fv-mb-divider' }, h('h2', { text: 'More detail' }), h('span', { class: 'fv-mb-divider-s', text: 'For the dates in the bar above' })));
    S.trend = card(g, { title: 'Spending over time', span: 8, chart: true, height: 400, fill: true });
    S.cats = card(g, { title: 'Where it went', span: 4, chart: true, height: 200, cls: 'fv-cats' });
    S.catSeg = seg([['donut', 'Donut'], ['bar', 'Ranked']], F.catMode, v => { F.catMode = v; saveF(); S.catSeg.set(v); catBreakdown(S.cats, R.ctx, 's:ov-cats', S.catList); }, 'Chart type');
    S.cats.tools.append(S.catSeg.el);
    S.catList = h('div', { class: 'fv-legend' }); S.cats.body.append(S.catList);
    S.merch = card(g, { title: 'Top merchants', span: 6, chart: true, height: 280 });
    S.flags = card(g, { title: 'Worth a look', span: 6 });
  };
  UPDATE.overview = ctx => {
    // The brief: its own period, recomputed only when the data or the period choice change.
    try {
      const first = !MB.painted; MB.painted = true;
      mbPaint(ctx, first);
      mbChartUpdate(false);
    } catch (e) { console.error('[finance] money brief failed', e); }
    trendChart(S.trend, ctx, 's:ov-trend', false);
    catBreakdown(S.cats, ctx, 's:ov-cats', S.catList);
    topMerchants(S.merch, ctx, 's:ov-merch', 8);
    flagList(S.flags, ctx, 6);
  };
