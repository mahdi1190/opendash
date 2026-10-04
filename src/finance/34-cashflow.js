  // @part 34-cashflow.js · OWNER: C1 (Cash flow section: sankey, kept gauge, in vs out, cumulative net, balances, savings rate, sources, accounts)
  // ----- Cash flow -----
  const cfPeriod = () => (['range', 'last', 'this'].includes(F.cfPeriod) ? F.cfPeriod : 'range');
  BUILD.cashflow = g => {
    S.sankey = card(g, { title: 'Where the money went', span: 8, md: 12, chart: true, height: 380 });
    S.sankeySeg = seg([['range', 'Range', 'The dates picked above'], ['last', 'Last month'], ['this', 'This month']], cfPeriod(), v => { F.cfPeriod = v; saveF(); S.sankeySeg.set(v); flowSankey(R.ctx); }, 'Period');
    S.sankey.tools.append(S.sankeySeg.el);
    S.kept = card(g, { title: 'Kept', span: 4, md: 12, chart: true, height: 190, cls: 'c1-kept' });
    S.keptBody = h('div', { class: 'c1-kept-b' }); S.kept.body.append(S.keptBody);
    S.flow = card(g, { title: 'Money in and out', span: 7, md: 12, chart: true, height: 320 });
    S.cum = card(g, { title: 'Cumulative net', span: 5, md: 12, chart: true, height: 320, fill: true });
    // Balances and their history sit side by side (one story); either takes
    // the full row if the other has nothing to show.
    S.bal = card(g, { title: 'Balances', span: 4, md: 12, cls: 'fv-bal-card' });
    S.balh = card(g, { title: 'Balance over time', span: 8, md: 12, chart: true, height: 260, fill: true });
    // @p1 (classes): on a wide page the two short lists stack beside the savings-rate chart
    // (97-p1-polish.css) instead of three equal cards with two thirds of them empty.
    S.rate = card(g, { title: 'Savings rate by month', span: 4, chart: true, height: 190, cls: 'p1-cf-rate' });
    S.src = card(g, { title: 'Where money came from', span: 4, chart: true, height: 220, cls: 'p1-cf-side' });
    S.acct = card(g, { title: 'Spending by account', span: 4, chart: true, height: 220, cls: 'p1-cf-side' });
    c1WireKeys();
  };
  UPDATE.cashflow = ctx => {
    flowSankey(ctx);
    flowChart(S.flow, ctx);
    cumNet(S.cum, ctx);
    balances(S.bal, ctx);
    balanceHistory(S.balh, ctx);
    const bOn = !S.bal.el.hidden, hOn = !S.balh.el.hidden;
    S.bal.el.style.setProperty('--span', hOn ? 4 : 12);
    S.balh.el.style.setProperty('--span', bOn ? 8 : 12);
    savingsRate(S.rate, ctx);
    incomeSources(S.src, ctx);
    byAccount(S.acct, ctx);
  };
  // NEW: a sankey of money in -> categories -> kept, for the range, last month or this month so far.
  // Every category is drawn (the category filter lights its own stream rather than hiding the rest).
  function flowSankey(ctx) {
    const cd = S.sankey, t = tk(), M = ctx.M;
    const period = cfPeriod();
    let rowsS, rowsI, label;
    if (period === 'range') { rowsS = ctx.spendNoCat(); rowsI = ctx.cur.income; label = fRange(ctx.rg.from, ctx.rg.to); }
    else {
      const mi = period === 'this' ? monthIdx(M.anchor) : monthIdx(M.anchor) - 1;
      const s = monthStart(mi), e = Math.min(monthEnd(mi), M.anchor); const q = pred({ cats: true });
      const all = M.tx.filter(x => x.n >= s && x.n <= e && q(x));
      rowsS = all.filter(x => x.kind === 'spend'); rowsI = all.filter(x => x.kind === 'income');
      label = fMonth(mi) + (period === 'this' ? ' so far' : '');
    }
    const inc = sum(rowsI, x => x.inc), out = sum(rowsS, x => x.s);
    const srcMap = new Map(); rowsI.forEach(x => { if (x.inc > 0) srcMap.set(x.m, (srcMap.get(x.m) || 0) + x.inc); });
    const items = foldCats(rowsTotals(rowsS));
    const model = C1.sankey({ sources: [...srcMap.entries()], cats: items, out, inc });
    keptCard(model, label, period);
    if (inc <= 0.004 && out <= 0.004) { cd.setSub(label); cd.setEmpty('No money in or out in this period.'); return; }
    const sel = F.cats; const anySel = sel.length > 0;
    const lit = n => !anySel || n.kind !== 'cat' || (n.members || []).some(m => sel.includes(m));
    const narrow = (cd.chart.clientWidth || 800) < 560;
    // On a phone the sources' labels leave the chart (no room on the left), so they go in the caption.
    const srcText = narrow ? model.nodes.filter(n => n.side === 'l').map(n => `${n.label} ${gbp(sum(model.links.filter(l => l.source === n.name), l => l.value))}`).join(' · ') : '';
    cd.setSub(narrow ? `${label} · from ${srcText || 'nothing'}` : `${label} · hover a stream to follow it${anySel ? ' · the selection is lit' : ''}`);
    const labelOf = new Map(model.nodes.map(n => [n.name, n.label]));
    const nodeOf = new Map(model.nodes.map(n => [n.name, n]));
    const colOf = n => n.kind === 'in' ? t.income : n.kind === 'refund' ? alpha(t.income, 0.55) : n.kind === 'balance' ? t.dim
      : n.kind === 'hub' ? (model.kept >= 0 ? t.income : t.accent) : n.kind === 'kept' ? t.sGood : (items.find(x => x.name === n.label) || {}).color || t.other;
    const clean = s => String(s).replace(/[{}|]/g, '');
    // Room on the right for the longest "Name  £1,234" label (an estimate: no layout read needed).
    const longest = Math.max(0, ...model.nodes.filter(n => n.side === 'r').map(n => clean(n.label).length + gbp(sum(model.links.filter(l => l.target === n.name), l => l.value)).length + 2));
    const rightW = clamp(Math.round(longest * (narrow ? 6.2 : 6.7)) + 14, narrow ? 110 : 130, narrow ? 170 : 230);
    const anim = FX.animated();
    const option = base({
      tooltip: C1.tooltip({ trigger: 'item', formatter: p => {
        if (p.dataType === 'edge') { const d = p.data; const tg = nodeOf.get(d.target);
          return C1.tip(`${labelOf.get(d.source)} → ${labelOf.get(d.target)}`, [{ c: colOf(tg || {}), key: 'bx', v: gbp2(d.value), k: inc > 0 ? `${pct(d.value / inc, 1)} of money in` : '' }]); }
        const n = nodeOf.get(p.name) || {};
        return C1.tip(labelOf.get(p.name) || p.name, [{ c: colOf(n), key: 'bx', v: gbp2(p.value), k: inc > 0 && n.kind !== 'in' ? `${pct(p.value / inc, 1)} of money in` : '' }],
          { foot: n.kind === 'cat' ? ((n.members && C1.isOnly(sel, n.members)) ? 'Selected · Esc to clear' : 'Click to focus on this category') : '' });
      } }),
      series: [{ id: 'flow', type: 'sankey', left: 4, right: rightW, top: 10, bottom: 10, nodeWidth: 10, nodeGap: 12, nodeAlign: 'justify', layoutIterations: 0, draggable: false,   // keep the data order: biggest first, Kept last
        data: model.nodes.map(n => ({ name: n.name, itemStyle: { color: colOf(n), borderWidth: 0, opacity: lit(n) ? 1 : 0.3 }, label: { show: !(narrow && n.side !== 'r') } })),
        links: model.links.map(l => { const tg = nodeOf.get(l.target); const o = Object.assign({}, l); if (l.target === 'hub') o.lineStyle = { opacity: t.dark ? 0.2 : 0.16 }; else if (tg && !lit(tg)) o.lineStyle = { opacity: 0.06 }; return o; }),
        lineStyle: { color: 'gradient', opacity: t.dark ? 0.36 : 0.3, curveness: 0.5 },
        emphasis: { focus: 'adjacency', lineStyle: { opacity: 0.58 } }, blur: { lineStyle: { opacity: 0.07 }, itemStyle: { opacity: 0.35 } },
        // @p1: the source and hub labels sit on the streams; a surface halo keeps them crisp.
        label: { color: t.text, fontFamily: FONT, fontSize: narrow ? 11 : 12, fontWeight: 560, distance: 8, textBorderColor: alpha(t.card, 0.9), textBorderWidth: 3, formatter: p => `${clean(labelOf.get(p.name) || p.name)}  {v|${gbp(p.value)}}`,
          rich: { v: { color: t.muted, fontWeight: 500, fontSize: 11.5, fontFamily: FONT, textBorderColor: alpha(t.card, 0.9), textBorderWidth: 3 } } },
        animation: anim, animationDuration: 1100, animationEasing: 'cubicInOut', animationDurationUpdate: 700, animationEasingUpdate: 'cubicInOut' }],
    });
    const c = C1.draw(cd, 's:cf-sankey', option);
    on(c, 'click', p => {
      if (p.dataType !== 'node') return;
      const n = nodeOf.get(p.name); if (!n) return;
      if (n.kind === 'cat') C1.pickCats(n.members);
      else if (n.kind === 'in' && n.name !== 'src:rest') openMerchant(n.label);
    });
  }
  // The share of money in that was kept, as a gauge, with the three numbers behind it.
  function keptCard(model, label, period) {
    const cd = S.kept, t = tk();
    cd.setSub(label);
    const r = model.rate;
    if (model.inc <= 0.004 && model.out <= 0.004) { cd.setEmpty('Nothing came in or went out in this period.'); S.keptBody.innerHTML = ''; return; }
    const anim = FX.animated();
    const v = r == null ? 0 : clamp(r * 100, 0, 100);
    const col = r == null ? t.dim : r >= 0 ? t.income : t.sCrit;
    const option = base({
      tooltip: { show: false },
      series: [{ id: 'g', type: 'gauge', startAngle: 215, endAngle: -35, min: 0, max: 100, radius: '96%', center: ['50%', '58%'],
        progress: { show: true, roundCap: true, width: 12, itemStyle: { color: col } },
        axisLine: { roundCap: true, lineStyle: { width: 12, color: [[1, alpha(t.text, t.dark ? 0.1 : 0.07)]] } },
        pointer: { show: false }, anchor: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        title: { show: true, offsetCenter: [0, '34%'], color: t.muted, fontSize: 12, fontFamily: FONT },
        detail: { valueAnimation: anim, offsetCenter: [0, '0%'], fontSize: 30, fontWeight: 650, fontFamily: FONT, color: r != null && r < 0 ? t.bad : t.text,
          formatter: x => (r == null ? '—' : r < 0 ? `−${Math.round(Math.abs(r) * 100)}%` : `${Math.round(x)}%`) },
        data: [{ value: round2(v), name: r == null ? 'no money in' : r >= 0 ? 'kept' : 'overspent' }],
        animation: anim, animationDuration: 1100, animationEasing: 'cubicOut', animationDurationUpdate: 700, animationEasingUpdate: 'cubicOut' }],
    });
    C1.draw(cd, 's:cf-kept', option);
    // The numbers behind it (tickers count from the last value shown).
    const B0 = S.keptBody;
    if (!B0.firstChild) {
      const row = (cls, label2) => { const b = h('b', { class: 'num' }); const el = h('div', { class: 'c1-kr ' + cls }, h('i', { 'aria-hidden': 'true' }), h('span', { class: 'l', text: label2 }), b); el._b = b; el._l = el.querySelector('.l'); return el; };
      B0._in = row('in', 'Money in'); B0._out = row('out', 'Spent'); B0._kept = row('kept', 'Kept');
      B0._say = h('p', { class: 'c1-kept-say' });
      B0.append(B0._say, B0._in, B0._out, B0._kept);
    }
    B0._in.style.setProperty('--c', t.income); B0._out.style.setProperty('--c', t.accent); B0._kept.style.setProperty('--c', model.kept >= 0 ? t.sGood : t.dim);
    MK.tick(B0._in._b, model.inc, x => gbp(x)); MK.tick(B0._out._b, model.out, x => gbp(x));
    MK.tick(B0._kept._b, Math.abs(model.kept), x => gbp(x));
    B0._kept._l.textContent = model.kept >= 0 ? 'Kept' : 'From your balance';
    B0._kept.classList.toggle('neg', model.kept < 0);
    const when = period === 'range' ? 'over these dates' : period === 'this' ? 'this month so far' : 'last month';
    B0._say.innerHTML = '';
    if (model.inc <= 0.004) B0._say.append(`Nothing came in ${when}; you spent `, h('b', { text: gbp(model.out) }), '.');
    else if (model.kept >= 0) B0._say.append('You kept ', h('b', { text: gbp(model.kept) }), ' of ', h('b', { text: gbp(model.inc) }), ` ${when}.`);
    else B0._say.append('You spent ', h('b', { text: gbp(-model.kept) }), ` more than came in ${when}.`);
    if (F.cats.length) B0._say.append(h('span', { class: 'mute', text: ' Every category counts here; the selection is lit in the flow.' }));
  }
  function balances(cd, ctx) {
    const a = ctx.M.a; const bs = Array.isArray(a.balances) ? a.balances.filter(b => b && isFinite(+b.balance)) : [];
    cd.el.hidden = !bs.length;
    cd.body.querySelectorAll('.fv-bals').forEach(x => x.remove());
    if (!bs.length) return;
    const total = sum(bs, b => +b.balance);
    // asOf is a plain date ('YYYY-MM-DD'); agoText would read it as UTC midnight.
    const asOf = bs[0].asOf;
    cd.setSub(`Total ${gbp2(total)}${asOf ? ' · as of ' + (validIso(asOf) && asOf.length === 10 ? fDayW(dnum(asOf)) : agoText(asOf)) : ''}`);
    // Low / high over the selected range, from the balance snapshots.
    const hist = (Array.isArray(a.balance_history) ? a.balance_history : []).filter(x => x && validIso(x.date) && isFinite(+x.total))
      .map(x => ({ n: dnum(x.date), v: +x.total })).filter(p => p.n >= ctx.rg.from && p.n <= ctx.rg.to);
    cd.body.querySelectorAll('.fv-mini-stats').forEach(x => x.remove());
    if (hist.length > 1) {
      const lo = hist.reduce((p, q) => (q.v < p.v ? q : p)), hi = hist.reduce((p, q) => (q.v > p.v ? q : p));
      const avg = sum(hist, p => p.v) / hist.length;
      cd.body.append(h('div', { class: 'fv-mini-stats fv-bal-stats' },
        h('div', null, h('span', { class: 'l', text: 'Lowest' }), h('b', { class: 'num', text: gbp(lo.v) }), h('span', { class: 'l', text: fDay(lo.n) })),
        h('div', null, h('span', { class: 'l', text: 'Highest' }), h('b', { class: 'num', text: gbp(hi.v) }), h('span', { class: 'l', text: fDay(hi.n) })),
        h('div', { class: 'wide' }, h('span', { class: 'l', text: 'Average balance' }), h('b', { class: 'num', text: gbp(avg) }), h('span', { class: 'l', text: `across ${hist.length} snapshots` }))));
    }
    cd.body.prepend(h('div', { class: 'fv-bals' }, bs.map(b => h('div', { class: 'fv-bal' }, h('span', { class: 'l', text: b.name || b.acct }), h('b', { class: +b.balance < 0 ? 'neg' : '', text: gbp2(+b.balance) }), h('span', { class: 'mute', text: [b.currency && b.currency !== 'GBP' ? b.currency : '', validIso(b.asOf) ? fDay(dnum(b.asOf)) : ''].filter(Boolean).join(' · ') })))));
  }
  function flowSeries(ctx) {
    const B = ctx.buckets, ix = ctx.ix;
    const inc = seriesBy(ctx.cur.income, B, ix, x => x.inc);
    const out = seriesBy(ctx.cur.spend, B, ix, x => x.s);
    return { B, inc, out, net: inc.map((v, i) => round2(v - out[i])) };
  }
  // Money in above the line, money out below it (one axis), and net as a smooth line with an end dot.
  function flowChart(cd, ctx) {
    const t = tk(); const { B, inc, out, net } = flowSeries(ctx);
    if (!ctx.cur.spend.length && !ctx.cur.income.length) { cd.setEmpty('No money in or out in this range.'); return; }
    const ti = sum(inc), to = sum(out);
    cd.setSub(`In ${gbp(ti)} · out ${gbp(to)} · net ${(ti - to >= 0 ? '+' : '') + gbp(ti - to)}`);
    const part = B.map(b => C1.partial(b));
    const barW = B.length <= 8 ? 30 : B.length <= 20 ? 22 : B.length <= 40 ? 14 : 8;
    // Keyed by the bucket's date, so a range change slides the same months into place.
    const fade = (arr, col, f) => arr.map((v, i) => (part[i] ? { name: diso(B[i].s), value: f(v), itemStyle: { color: alpha(col, t.dark ? 0.5 : 0.42) } } : { name: diso(B[i].s), value: f(v) }));
    const sIn = FX.bars({ id: 'in', name: 'Money in', stack: 'flow', color: t.income, radius: [4, 4, 0, 0], width: barW, catGap: '36%', data: fade(inc, t.income, v => v) });
    sIn.emphasis = C1.lift(t.income);
    const sOut = FX.bars({ id: 'out', name: 'Money out', stack: 'flow', color: t.accent, radius: [0, 0, 4, 4], width: barW, catGap: '36%', data: fade(out, t.accent, v => -v) });
    sOut.emphasis = C1.lift(t.accent);
    if (FX.animated()) sOut.animationDelay = i => Math.min(i * FX.MOTION.stagger, FX.MOTION.staggerMax) + 120;
    // @p1: hollow dots only while there are few periods; on weekly ranges they crowded the bar tops.
    const sNet = FX.smoothLine({ id: 'net', name: 'Net', data: net, color: t.text, width: 2, symbols: B.length <= 12, symbolSize: 6, z: 6,
      endLabel: v => (v >= 0 ? '+' : '') + gbpShort(v),
      markLine: { symbol: 'none', silent: true, animation: false, lineStyle: { color: t.strong, width: 1, type: 'solid' }, label: { show: false }, data: [{ yAxis: 0 }] } });
    sNet.itemStyle = { color: t.card, borderColor: t.text, borderWidth: 1.5 };
    if (FX.animated()) sNet.animationDelay = 450;
    const option = base({
      grid: { left: 50, right: 62, top: 34, bottom: 56 },
      legend: { top: 0, left: 0, selectedMode: false, itemWidth: 12, itemHeight: 9, itemGap: 16, textStyle: { color: t.muted, fontSize: 11.5, fontFamily: FONT },
        data: [{ name: 'Money in', icon: 'roundRect' }, { name: 'Money out', icon: 'roundRect' }, { name: 'Net', icon: 'path://M0,4 L16,4 L16,6.5 L0,6.5 Z', itemStyle: { color: t.text, borderWidth: 0 } }] },
      tooltip: C1.tooltip({ trigger: 'axis', pointer: 'shadow', formatter: ps => { const i = ps[0].dataIndex; if (!B[i]) return '';
        return C1.tip(B[i].long, [
          { c: t.income, key: 'bx', v: gbp2(inc[i]), k: 'money in' }, { c: t.accent, key: 'bx', v: gbp2(out[i]), k: 'money out' },
          { c: t.text, key: 'ln', v: (net[i] >= 0 ? '+' : '') + gbp2(net[i]), k: 'net', tone: net[i] >= 0 ? 'good' : 'warn' }], { foot: part[i] ? 'Only part of this period is in the range' : (B[i].s === B[i].e ? 'Click for the day’s payments' : 'Click to zoom in') }); } }),
      xAxis: C1.xCat(B.map(b => b.label), { pill: true }), yAxis: C1.yOut({ ticks: 4 }),
      dataZoom: [{ type: 'inside', zoomOnMouseWheel: 'ctrl', moveOnMouseMove: true, moveOnMouseWheel: false, start: 0, end: 100 }, C1.zoom({ start: 0, end: 100, left: 44, right: 56 })],
      series: [sIn, sOut, sNet, ctx.rg.to === ctx.M.anchor ? FX.pulse({ id: 'net-now', at: [B.length - 1, net[net.length - 1]], color: t.text, z: 6, delay: FX.MOTION.draw + 450 }) : null].filter(Boolean),
    });
    const c = C1.draw(cd, 's:cf-flow', option, { after: c0 => FX.live(c0) });
    on(c, 'click', p => { if (p.seriesId === 'net-now') return; const b = B[p.dataIndex]; if (!b) return; if (b.s === b.e) openDay(b.s); else if (!(b.s === ctx.rg.from && b.e === ctx.rg.to)) setCustomRange(b.s, b.e); });
  }
  // The running net with its stroke and wash split at zero: teal above (saving), red below (drawing down).
  function cumNet(cd, ctx) {
    const t = tk(); const { B, net } = flowSeries(ctx);
    if (!ctx.cur.spend.length && !ctx.cur.income.length) { cd.setEmpty('Nothing in this range.'); return; }
    let c0 = 0; const cum = net.map(v => round2(c0 += v));
    const last = cum[cum.length - 1];
    cd.setSub(`${last >= 0 ? 'Up' : 'Down'} ${gbp(Math.abs(last))} over the range`);
    const pos = t.income, neg = t.neg;
    const mx = Math.max(0, ...cum), mn = Math.min(0, ...cum);
    // Where zero sits inside the area's box (smoothing never overshoots, so the box is the data's).
    const f = mx - mn > 0 ? clamp(mx / (mx - mn), 0, 1) : 1;
    const a0 = t.dark ? 0.32 : 0.22;
    const wash = hasEcharts() ? new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: alpha(pos, a0) }, { offset: f, color: alpha(pos, 0.02) }, { offset: f, color: alpha(neg, 0.02) }, { offset: 1, color: alpha(neg, a0) }]) : alpha(pos, 0.1);
    // The stroke splits at zero too: its box runs from the highest point to the lowest.
    const lmx = Math.max(...cum), lmn = Math.min(...cum);
    const fl = lmx > 0 && lmn < 0 ? clamp(lmx / (lmx - lmn), 0, 1) : (lmn >= 0 ? 1 : 0);
    const stroke = hasEcharts() && lmx > lmn ? new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: lmx > 0 ? pos : neg }, { offset: fl, color: lmx > 0 ? pos : neg }, { offset: fl, color: lmn < 0 ? neg : pos }, { offset: 1, color: lmn < 0 ? neg : pos }]) : (last >= 0 ? pos : neg);
    const s = FX.smoothLine({ id: 'cum', name: 'Cumulative net', data: cum, width: 2.25, symbolSize: 8, z: 4, color: last >= 0 ? pos : neg, endLabel: v => (v >= 0 ? '+' : '') + gbpShort(v),
      markLine: { symbol: 'none', silent: true, animation: false, lineStyle: { color: t.strong, width: 1, type: 'solid' }, label: { show: false }, data: [{ yAxis: 0 }] } });
    s.lineStyle.color = stroke;
    s.itemStyle = { color: last >= 0 ? pos : neg, borderColor: t.card, borderWidth: 2 };
    s.areaStyle = { color: wash, origin: 'auto' };
    const option = base({
      grid: { left: 6, right: 64, top: 18, bottom: 28 },
      tooltip: C1.tooltip({ trigger: 'axis', formatter: ps => { const i = ps[0].dataIndex; if (!B[i]) return '';
        return C1.tip(B[i].long, [{ c: cum[i] >= 0 ? pos : neg, key: 'ln', v: (cum[i] >= 0 ? '+' : '') + gbp2(cum[i]), k: 'cumulative net', tone: cum[i] >= 0 ? 'good' : 'warn' }, { key: 'none', v: (net[i] >= 0 ? '+' : '') + gbp2(net[i]), k: 'this ' + F.gran, muted: true }]); } }),
      xAxis: C1.xCat(B.map(b => b.label), { edge: true, pill: true, width: (cd.chart.clientWidth || 0) - 70 }), yAxis: C1.yIn({ ticks: 3 }),
      series: [s, ctx.rg.to === ctx.M.anchor ? FX.pulse({ id: 'cum-now', at: [B.length - 1, last], color: last >= 0 ? pos : neg, delay: FX.MOTION.draw }) : null].filter(Boolean),
    });
    C1.draw(cd, 's:cf-cum', option, { after: c => FX.live(c) });
  }
  function savingsRate(cd, ctx) {
    const t = tk(); const M = ctx.M;
    const m0 = monthIdx(ctx.rg.from), m1 = monthIdx(ctx.rg.to);
    const months = []; for (let mi = Math.max(m0, m1 - 23); mi <= m1; mi++) months.push(mi);
    const q = pred();
    const rows = months.map(mi => {
      const s = monthStart(mi), e = monthEnd(mi);
      const r = M.tx.filter(x => x.n >= s && x.n <= e && q(x));
      const inc = sum(r, x => x.inc), out = sum(r.filter(x => x.kind === 'spend'), x => x.s);
      return { mi, inc, out, rate: inc > 0 ? (inc - out) / inc : null, part: monthEnd(mi) > M.anchor };
    });
    if (!rows.some(r => r.inc > 0)) { cd.setEmpty('No income recorded in these months, so there is no savings rate.'); return; }
    cd.setSub('Net as a share of money in, per calendar month' + (rows[rows.length - 1].part ? ' · this month is still running' : ''));
    const s = FX.bars({ id: 'r', name: 'Savings rate', radius: 4, width: 22, catGap: '34%',
      data: rows.map(r => { const v = r.rate == null ? null : round2(r.rate * 100); const col = (r.rate || 0) >= 0 ? t.accent : t.neg;
        return { value: v, itemStyle: { color: r.part ? alpha(col, t.dark ? 0.5 : 0.42) : col, borderRadius: (r.rate || 0) >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4] } }; }),
      label: rows.length <= 8 ? Object.assign(FX.numLabel({ fmt: v => Math.round(v) + '%' }), { formatter: p => (p.value == null ? '' : Math.round(p.value) + '%') }) : undefined,
      markLine: { symbol: 'none', silent: true, animation: false, lineStyle: { color: t.strong, width: 1, type: 'solid' }, label: { show: false }, data: [{ yAxis: 0 }] } });
    s.emphasis = C1.lift(t.accent);
    const option = base({
      grid: { left: 2, right: 6, top: 20, bottom: 2, containLabel: true },
      tooltip: C1.tooltip({ trigger: 'axis', pointer: 'shadow', formatter: ps => { const r = rows[ps[0].dataIndex]; if (!r) return '';
        return C1.tip(fMonth(r.mi) + (r.part ? ' (so far)' : ''), [{ c: (r.rate || 0) >= 0 ? t.accent : t.neg, key: 'bx', v: pct(r.rate), k: 'savings rate' }, { c: t.income, key: 'none', v: gbp2(r.inc), k: 'in', muted: true }, { key: 'none', v: gbp2(r.out), k: 'out', muted: true }]); } }),
      xAxis: C1.xCat(rows.map(r => fMonthS(r.mi, m1 - m0 > 11)), { line: true }), yAxis: C1.yOut({ ticks: 3, fmt: v => v + '%' }),
      series: [s],
    });
    C1.draw(cd, 's:cf-rate', option);
  }
  function balanceHistory(cd, ctx) {
    const t = tk(); const a = ctx.M.a;
    const hist = Array.isArray(a.balance_history) ? a.balance_history.filter(x => x && validIso(x.date)) : [];
    cd.el.hidden = !hist.length;
    if (!hist.length) return;
    const pts = hist.map(x => ({ n: dnum(x.date), total: +x.total || 0, acc: x.accounts || {} })).filter(p => p.n >= ctx.rg.from && p.n <= ctx.rg.to).sort((p, q) => p.n - q.n);
    if (!pts.length) { cd.setEmpty('No balance snapshots in this range.'); return; }
    // With a single account its line is identical to (and would hide) the total.
    const allAccts = [...new Set(pts.flatMap(p => Object.keys(p.acc)))];
    const accts = allAccts.length > 1 ? allAccts.slice(0, 3) : [];
    const names = ctx.M.acctNames;
    // @p1: never the total's accent (pal[0]) or the payday teal (pal[2]), so every line is told apart.
    const cols = [t.pal[1], t.pal[4], t.pal[6]];
    const lo = pts.reduce((p, q) => (q.total < p.total ? q : p));
    // Paydays (money in of at least 500 in one go), drawn as quiet teal lines.
    const pays = [...new Set(ctx.cur.income.filter(x => x.inc >= 500).map(x => x.n))].filter(n => n >= pts[0].n && n <= pts[pts.length - 1].n);
    const payset = new Set(pays);
    cd.setSub(`Latest ${gbp2(pts[pts.length - 1].total)} · ${pts.length} snapshot${pts.length === 1 ? '' : 's'}${pays.length ? ' · teal lines are paydays' : ''}`);
    const lastP = pts[pts.length - 1];
    const total = FX.area({ id: 'total', name: 'Total', data: pts.map(p => [diso(p.n), round2(p.total)]), symbols: pts.length < 30, area: t.dark ? 0.3 : 0.2, width: 2.25, endLabel: v => gbpShort(v),
      markLine: pays.length ? { symbol: 'none', silent: true, animation: false, lineStyle: { color: alpha(t.income, 0.45), width: 1, type: 'solid' }, label: { show: false }, data: pays.map(n => ({ xAxis: diso(n) })) } : undefined,
      markPoint: pts.length > 2 ? { silent: true, animation: false, symbol: 'circle', symbolSize: 7, itemStyle: { color: t.card, borderColor: t.sWarn, borderWidth: 2 },
        label: { show: true, position: pts.indexOf(lo) > pts.length * 0.7 ? 'left' : 'right', distance: 7, formatter: 'Lowest ' + gbp(lo.total), color: t.muted, fontSize: 10.5, fontFamily: FONT, backgroundColor: alpha(t.card, 0.85), padding: [1, 4], borderRadius: 3 },
        data: [{ coord: [diso(lo.n), round2(lo.total)] }] } : undefined });
    const option = base({
      grid: { left: 6, right: 64, top: accts.length ? 46 : 22, bottom: 28 },
      // @p1: the series' surface-coloured ring (borderWidth 2) swallowed the 3 px keys; draw them flat.
      legend: { show: accts.length > 0, top: 0, left: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 3, itemGap: 16, itemStyle: { borderWidth: 0 }, textStyle: { color: t.muted, fontSize: 11.5, fontFamily: FONT } },
      tooltip: C1.tooltip({ trigger: 'axis', formatter: ps => {
        const n = dnum(String(ps[0].value[0]).slice(0, 10));
        const rows = ps.filter(p => p.seriesType === 'line').map(p => ({ c: p.color, key: 'ln', v: gbp2(p.value[1]), k: p.seriesName === 'Total' ? (accts.length ? 'total' : 'balance') : p.seriesName }));
        if (payset.has(n)) rows.push({ c: t.income, key: 'circ', v: 'Payday', k: '', muted: true });
        return C1.tip(fDayLong(n), rows);
      } }),
      xAxis: FX.xTime({ extra: { splitNumber: 6, axisPointer: { label: { show: true, backgroundColor: t.text, color: t.card, borderRadius: 6, padding: [4, 7, 3], fontSize: 11, fontWeight: 600, fontFamily: FONT, formatter: p => fDay(Math.round(p.value / DAY_MS)) } } } }),
      yAxis: C1.yIn({ extra: { scale: true } }),
      series: [
        total,
        // Today's balance: a dot at the end of the line, with a soft pulse while it is on screen.
        FX.pulse({ id: 'total-now', at: [diso(lastP.n), round2(lastP.total)], delay: FX.MOTION.draw }),
        ...accts.map((ac, i) => FX.smoothLine({ id: 'a:' + ac, name: names[ac] || ac, data: pts.filter(p => p.acc[ac] != null).map(p => [diso(p.n), round2(+p.acc[ac])]), color: cols[i], width: 1.5, opacity: 0.85, z: 2 })),
      ],
    });
    C1.draw(cd, 's:cf-balh', option, { after: c => FX.live(c) });
  }
  function incomeSources(cd, ctx) {
    const t = tk();
    const agg = new Map(); ctx.cur.income.forEach(x => agg.set(x.m, (agg.get(x.m) || 0) + x.inc));
    const list = [...agg.entries()].filter(e => e[1] > 0).sort((p, q) => q[1] - p[1]).slice(0, 8);
    if (!list.length) { cd.setEmpty('No income in this range.'); return; }
    cd.setSub(`${gbp(sum(list, e => e[1]))} from ${agg.size} source${agg.size === 1 ? '' : 's'} · click one to see its payments`);
    const rich = { n: { color: t.text, fontSize: 11.5, fontFamily: FONT, padding: [0, 0, 0, 7], width: 104 } };
    list.forEach((e, i) => { rich['t' + i] = { backgroundColor: { image: C1.tileImg(e[0], 'Income', 36) }, width: 18, height: 18 }; });
    const cut = s => { s = String(s).replace(/[{}|]/g, ''); return s.length > 16 ? s.slice(0, 15).trimEnd() + '…' : s; };
    const s = FX.bars({ id: 's', name: 'Received', horizontal: true, width: 14, radius: 7, track: true, color: t.income, data: list.map(e => round2(e[1])),
      label: Object.assign(FX.numLabel({ position: 'right', color: t.text, weight: 600, size: 11.5 }), { distance: 8 }) });
    s.emphasis = C1.lift(t.income);
    const option = base({
      grid: { left: 136, right: 58, top: 4, bottom: 4 },
      tooltip: C1.tooltip({ trigger: 'item', formatter: p => { const e = list[p.dataIndex]; return e ? C1.tip(e[0], [{ c: t.income, key: 'bx', v: gbp2(e[1]), k: 'received' }], { foot: 'Click to see its payments' }) : ''; } }),
      xAxis: { type: 'value', show: false, max: v => v.max * 1.02 },
      yAxis: { type: 'category', inverse: true, data: list.map(e => e[0]), axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { margin: 10, align: 'left', padding: [0, 0, 0, -126], formatter: (v, i) => `{t${i}|}{n|${cut(v)}}`, rich } },
      series: [s],
    });
    cd.chart.style.height = Math.max(88, list.length * 32 + 16) + 'px';   // @p1: 88 (was 120): two rows need no more
    const c = C1.draw(cd, 's:cf-src', option);
    on(c, 'click', p => { const e = list[p.dataIndex]; if (e) openMerchant(e[0]); });
  }
  function byAccount(cd, ctx) {
    const t = tk(); const M = ctx.M;
    const q = pred({ acct: true });
    const rows = M.tx.filter(x => x.kind === 'spend' && x.n >= ctx.rg.from && x.n <= ctx.rg.to && q(x));
    const agg = new Map(); rows.forEach(x => agg.set(x.acct || 'Unknown account', (agg.get(x.acct || 'Unknown account') || 0) + x.s));
    const list = [...agg.entries()].filter(e => Math.abs(e[1]) > 0.004).sort((p, q2) => q2[1] - p[1]);
    if (!M.accts.length) { cd.setEmpty('Account names arrive with the next finance update.'); return; }
    if (!list.length) { cd.setEmpty('No spending in this range.'); return; }
    const only = F.accts.length === 1 ? F.accts[0] : null;
    cd.setSub(list.length === 1 ? 'Only one account has spending in this range' : only ? 'Selected · clear it with the chip × above' : 'Click an account to keep only its payments');
    const s = FX.bars({ id: 'a', name: 'Spent', horizontal: true, width: 14, radius: 7, track: true, color: t.accent,
      data: list.map(e => FX.sel({ value: round2(e[1]), itemStyle: { color: t.accent } }, F.accts.includes(e[0]), F.accts.length > 0)),
      label: Object.assign(FX.numLabel({ position: 'right', color: t.text, weight: 600, size: 11.5 }), { distance: 8 }) });
    s.emphasis = C1.lift(t.accent);
    const option = base({
      grid: { left: 8, right: 64, top: 4, bottom: 4, containLabel: true },
      tooltip: C1.tooltip({ trigger: 'item', formatter: p => { const e = list[p.dataIndex]; return e ? C1.tip(M.acctNames[e[0]] || e[0], [{ c: t.accent, key: 'bx', v: gbp2(e[1]), k: 'spent' }], { foot: only === e[0] ? 'Selected' : 'Click to keep only this account' }) : ''; } }),
      xAxis: { type: 'value', show: false, max: v => v.max * 1.02 }, yAxis: { type: 'category', inverse: true, data: list.map(e => M.acctNames[e[0]] || e[0]), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: t.text, fontSize: 11.5, fontFamily: FONT, width: 150, overflow: 'truncate' } },
      series: [s],
    });
    cd.chart.style.height = Math.max(88, list.length * 32 + 16) + 'px';   // @p1: as above
    const c = C1.draw(cd, 's:cf-acct', option);
    // Re-clicking the selected account does nothing (clear it with the chip ×).
    on(c, 'click', p => { const ac = list[p.dataIndex] && list[p.dataIndex][0]; if (!ac || !M.accts.includes(ac) || only === ac) return; F.accts = [ac]; changed(); });
  }
