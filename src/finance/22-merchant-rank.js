  // @part 22-merchant-rank.js · OWNER: C2 (merchantAgg, topMerchants; Overview calls them too)
  function merchantAgg(rows) {
    const map = new Map();
    for (const t of rows) {
      let m = map.get(t.m);
      if (!m) { m = { m: t.m, total: 0, count: 0, cats: {}, first: t.n, last: t.n }; map.set(t.m, m); }
      m.total += t.s; if (t.s > 0) m.count++; m.cats[t.c] = (m.cats[t.c] || 0) + Math.abs(t.s);
      m.first = Math.min(m.first, t.n); m.last = Math.max(m.last, t.n);
    }
    for (const m of map.values()) { m.cat = Object.entries(m.cats).sort((p, q) => q[1] - p[1])[0][0]; m.avg = m.count ? m.total / m.count : 0; }
    return [...map.values()];
  }
  // Merchant groups (name variants merged) for the range, every filter but
  // the merchant one applied: the selected merchant is lit, the rest dim.
  function merchantGroupsFor(ctx, prev) {
    const G = VK.groups(ctx.M);
    return ctx.lazy(prev ? 'c2:mgp' : 'c2:mg', () => VL.groupAgg(merchantAgg(prev ? spendNoMerchantPrev(ctx) : spendNoMerchant(ctx)), G.keyOf, G.label));
  }
  // Ranked merchants: category-coloured bars with the merchant tile beside
  // each name. Click a bar to focus that merchant everywhere (clicking it
  // again does nothing); double-click opens its details.
  function topMerchants(cd, ctx, key, n, sortBy) {
    const t = tk(); const G = VK.groups(ctx.M);
    sortBy = sortBy || 'spend';
    const list = merchantGroupsFor(ctx).filter(m => m.total > 0.004);
    const sk = sortBy === 'visits' ? 'count' : sortBy === 'avg' ? 'avg' : 'total';
    list.sort((p, q) => q[sk] - p[sk] || q.total - p.total || (p.m < q.m ? -1 : 1));
    const top = list.slice(0, n);
    cd.setSub(list.length ? `${nf0.format(list.length)} merchants · top ${top.length} shown` : '');
    if (!top.length) { cd.setEmpty('No merchants in this range.'); return; }
    const selKey = F.merchant ? G.keyOf(F.merchant) : null;
    const val = m => sk === 'count' ? m.count : round2(m[sk]);
    const fmtv = v => sk === 'count' ? `${v} visit${v === 1 ? '' : 's'}` : gbpShort(v);
    const narrow = (cd.chart && cd.chart.clientWidth || 400) < 440;
    const gut = narrow ? 128 : 156;
    const rt = VK.richTiles(top.map(m => ({ name: m.primary, cat: m.cat, label: m.m })), 20, { max: narrow ? 14 : 18, fontSize: 11.5 });
    const option = base({
      grid: { left: gut + 12, right: 58, top: 2, bottom: 2 },
      tooltip: FX.tooltip({ trigger: 'item', formatter: p => { const m = top[p.dataIndex]; return m ? vkTip(m.m, m.primary, m.cat, [
        { c: catColor(m.cat), v: gbp2(m.total), k: 'spent', box: true }, { v: nf0.format(m.count), k: m.count === 1 ? 'visit' : 'visits' }, { v: gbp2(m.avg), k: 'average' }, { v: m.cat, k: '', muted: true }],
        selKey === m.key ? 'Selected · Esc or × clears it' : 'Click to focus · double-click for details') : ''; } }),
      xAxis: { type: 'value', show: false, max: v => v.max * 1.02 },
      yAxis: { type: 'category', inverse: true, data: top.map(m => m.m), axisLine: { show: false }, axisTick: { show: false }, axisLabel: rt.axisLabel(gut) },
      series: [Object.assign(FX.bars({ id: 'm', horizontal: true, radius: 7, width: 14, track: true, color: t.accent,
        data: top.map(m => FX.sel({ value: val(m), itemStyle: { color: catColor(m.cat) } }, selKey === m.key, !!selKey)),
        label: { show: true, position: 'right', distance: 8, color: t.text, fontSize: 11, fontWeight: 600, fontFamily: FONT, formatter: p => fmtv(p.value) } }), VK.barSelect())],
    });
    const c = plot(cd, key, option);
    FX.onPick(c, p => (top[p.dataIndex] ? top[p.dataIndex].key : null), k => k === selKey, k => { const m = top.find(x => x.key === k); if (m) setMerchant(m.primary); });
    on(c, 'dblclick', p => { const m = top[p.dataIndex]; if (m) openMerchant(m.primary); });
    if (cd.chart) cd.chart.style.height = Math.max(160, top.length * 30 + 12) + 'px';
  }
