  // @part 27-money-chart.js · NEW (3 Oct 2026) · OWNER: O (Overview money brief: the hero pace chart and its Balance view)
  // ── "Spending since payday" against the usual pace ────────────────────
  // One grid, five layers (CHART_STYLE.md §3a): the usual range (p25-p75 of
  // earlier cycles) as a soft band, the usual pace (median) dashed, "if the
  // rest goes as usual" dotted from today, this cycle as a gradient area
  // that draws in, and today's end dot with a pulsing ring (FX.pulse, paused
  // off screen). Lines are smoothed monotone (FX.smoothLine), so a curve
  // never dips below zero or peaks above a real day, and the end is exact.
  // The glass tooltip lists that day's payments with merchant tiles; a click
  // opens the day. The Balance view swaps in the current account balance
  // with paydays marked. Updates merge by series id, so they morph.
  const MB_CHART = 's:ov-pace';
  function mbNice(v) {
    if (!(v > 0)) return 10;
    const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  // An axis from lo to hi in three or four even, round steps (no stray top label).
  function mbScale(lo, hi) {
    const step = mbNice(Math.max(1, hi - lo) / 3);
    return { min: lo < 0 ? -Math.ceil(-lo / step) * step : 0, max: Math.max(step, Math.ceil(hi / step) * step), step };
  }
  // Tooltip body: the value leads, the label follows; keys for line, dashed, dotted and band.
  function mbTip(title, sub, rows, items, foot) {
    const r = rows.filter(Boolean).map(x => `<div class="fv-tt-r fv-mb-tr${x.tone ? ' ' + x.tone : ''}"><i class="${x.key || 'ln'}" style="--c:${esc(x.c || 'transparent')}"></i><b>${esc(x.v)}</b><span>${esc(x.k)}</span></div>`).join('');
    const it = items && items.length ? `<div class="fv-mb-tm">${items.map(x => `<div><span class="t">${mbTile(x.m, x.c, { size: 'xs', badge: false, live: false })}</span><span class="nm">${esc(mbName(x.m))}</span><b class="num">${esc(gbp2(x.s))}</b></div>`).join('')}</div>` : '';
    return `<div class="fv-tt fv-tt-glass fv-mb-tt"><div class="fv-tt-h">${esc(title)}${sub ? `<span>${esc(sub)}</span>` : ''}</div>${r}${it}${foot ? `<div class="fv-tt-f">${esc(foot)}</div>` : ''}</div>`;
  }
  function mbChartUpdate(switched) {
    const cd = S.pace, B = MB.B; if (!cd || !B || !cd.el.isConnected) return;
    const hasBal = B.balSeries.filter(p => p.n > B.anchor - 90).length > 1;
    const view = F.mbView === 'bal' && hasBal ? 'bal' : 'spend';
    if (S.paceSeg) { S.paceSeg.set(view); S.paceSeg.el.hidden = !hasBal; }
    if (view === 'bal') mbBalChart(cd, B, switched); else mbPaceChart(cd, B, switched);
  }
  function mbPaceChart(cd, B, switched) {
    const t = tk(), cyc = B.cycle, isCycle = cyc.mode === 'cycle', P = B.pace, n = cyc.len, D = cyc.day;
    cd.el.querySelector('h3').textContent = isCycle ? 'Spending since payday' : 'Spending this month';
    cd.setSub(P ? `Day ${D + 1} of ${n} · “usual” is the median of your last ${P.n} ${isCycle ? 'pay cycle' : 'month'}${P.n === 1 ? '' : 's'}` : `Day ${D + 1} of ${n} · the usual pace appears after one full ${isCycle ? 'pay cycle' : 'month'}`);
    const unit = isCycle ? 'This cycle' : 'This month';
    S.paceLegend.innerHTML = `<span><i class="k" style="--c:var(--accent)"></i>${unit}</span>`
      + (P ? '<span><i class="k dash"></i>Usual pace</span><span><i class="k band"></i>Usual range</span><span><i class="k dot" style="--c:var(--accent)"></i>If the rest goes as usual</span>' : '');
    const labels = []; for (let i = 0; i < n; i++) labels.push(fDay(cyc.start + i));
    const cur = B.curve.slice(0, D + 1);
    const base0 = P ? P.med[Math.min(D, P.med.length - 1)] : 0;
    const proj = P ? labels.map((_, i) => (i < D ? '-' : round2(B.spent + (P.med[i] - base0)))) : null;
    // That day's payments (for the tooltip), once per paint.
    const dayTx = new Map();
    for (const x of R.model.tx) { if (x.kind !== 'spend' || x.s <= 0) continue; const k = x.n - cyc.start; if (k < 0 || k > D) continue; if (!dayTx.has(k)) dayTx.set(k, []); dayTx.get(k).push(x); }
    for (const list of dayTx.values()) list.sort((p, q) => q.s - p.s);
    const last = n - 1;
    // A date every week; every fortnight on a phone-narrow chart.
    const xStep = (cd.chart && cd.chart.clientWidth < 520) ? 14 : 7;
    const series = [];
    if (P) {
      series.push({ id: 'lo', type: 'line', data: P.lo, stack: 'band', smooth: 0.3, smoothMonotone: 'x', symbol: 'none', lineStyle: { opacity: 0 }, silent: true, tooltip: { show: false }, animation: false, z: 1 });
      series.push({ id: 'band', name: 'Usual range', type: 'line', data: P.hi.map((v, i) => round2(v - P.lo[i])), stack: 'band', smooth: 0.3, smoothMonotone: 'x', symbol: 'none', lineStyle: { opacity: 0 },
        areaStyle: { color: alpha(t.text, t.dark ? 0.1 : 0.075) }, silent: true, tooltip: { show: false }, animation: false, z: 1 });
      series.push(FX.smoothLine({ id: 'usual', name: 'Usual pace', data: P.med, width: 1.5, dashed: true, color: t.dim, z: 2, draw: 700 }));
      const pj = FX.smoothLine({ id: 'proj', name: 'If the rest goes as usual', data: proj, width: 2, color: alpha(t.accent, 0.75), z: 3, draw: 500 });
      pj.lineStyle.type = [1, 5]; pj.lineStyle.cap = 'round';
      if (FX.animated()) pj.animationDelay = 900;
      series.push(pj);
      series.push({ id: 'projEnd', type: 'scatter', data: [[last, proj[last]]], symbolSize: 9, z: 5, silent: true, tooltip: { show: false },
        itemStyle: { color: t.card, borderColor: alpha(t.accent, 0.8), borderWidth: 2 }, animation: FX.animated(), animationDelay: FX.animated() ? 1300 : 0,
        label: { show: true, position: 'right', distance: 8, formatter: `{a|${gbp(proj[last])}}\n{b|${isCycle ? 'at payday' : 'month end'}}`,
          rich: { a: { color: t.text, fontWeight: 650, fontSize: 12, fontFamily: FONT }, b: { color: t.muted, fontSize: 10.5, fontFamily: FONT, padding: [2, 0, 0, 0] } } } });
    }
    const curS = FX.area({ id: 'cur', name: unit, data: cur, color: t.accent, width: 2.25, area: t.dark ? 0.3 : 0.2, z: 4, symbolSize: 8, endLabel: v => gbp(v),
      markLine: { silent: true, symbol: 'none', animation: false, lineStyle: { color: alpha(t.text, 0.16), width: 1, type: 'solid' },
        label: { show: true, position: 'end', formatter: 'Today', color: t.muted, fontSize: 11, fontWeight: 600, fontFamily: FONT, distance: 4 }, data: [{ xAxis: labels[D] }] } });
    // @p1: with a projection the label rose clear of its first dots (it sat on them), with a surface halo over the band.
    curS.endLabel = Object.assign(curS.endLabel || {}, { fontSize: 12.5, fontWeight: 650, distance: 10, offset: P ? [-2, -15] : [0, -2], textBorderColor: t.card, textBorderWidth: 3 });
    series.push(curS);
    series.push(FX.pulse({ id: 'end', at: [D, B.spent], color: t.accent, z: 4, size: 9 }));
    const yr = mbScale(0, Math.max(B.spent, ...(P ? P.hi : []), ...(P ? proj.filter(v => v !== '-') : [0])) * 1.05);
    const option = base({
      grid: { left: 4, right: P ? 86 : 64, top: 22, bottom: 28, containLabel: false },
      xAxis: FX.xAxis(labels, { bars: false, extra: {
        axisLabel: { color: t.dim, fontSize: 11, hideOverlap: true, margin: 12, interval: i => i === 0 || i === last || (i % xStep === 0 && i < last - xStep / 2), alignMinLabel: 'left', alignMaxLabel: 'right' },
        axisPointer: { label: { show: true, backgroundColor: t.text, color: t.card, borderRadius: 6, padding: [4, 7, 3], fontSize: 11, fontWeight: 600, fontFamily: FONT, margin: 6, shadowBlur: 0,
          formatter: p => { const i = labels.indexOf(p.value); return i >= 0 ? fDayW(cyc.start + i) : String(p.value); } } } } }),
      yAxis: FX.yAxis({ ticks: 3, extra: { max: yr.max, min: 0, interval: yr.step, axisLabel: { inside: true, margin: 0, verticalAlign: 'bottom', padding: [0, 0, 4, 2], color: t.dim, fontSize: 11, formatter: v => (v ? gbpShort(v) : '') }, splitLine: { lineStyle: { color: t.grid, width: 1 } } } }),
      tooltip: FX.tooltip({ trigger: 'axis', pointer: 'line', formatter: ps => {
        const i = ps && ps[0] ? ps[0].dataIndex : -1; if (i < 0) return '';
        const past = i <= D;
        const rows = [past ? { key: 'ln', c: t.accent, v: gbp(B.curve[i]), k: 'spent by this day' } : P ? { key: 'dt', c: alpha(t.accent, 0.75), v: gbp(proj[i]), k: 'if the rest goes as usual' } : null];
        if (P) {
          rows.push({ key: 'ds', c: t.dim, v: gbp(P.med[i]), k: 'usual by this day' }, { key: 'bx', c: alpha(t.text, 0.18), v: `${gbp(P.lo[i])}–${gbp(P.hi[i])}`, k: 'usual range' });
          if (past) { const d = B.curve[i] - P.med[i]; rows.push({ key: 'none', v: gbp(Math.abs(d)), k: d <= 0 ? 'under usual' : 'over usual', tone: Math.abs(d) < 1 ? '' : d <= 0 ? 'good' : 'warn' }); }
        }
        const items = past ? (dayTx.get(i) || []).slice(0, 3) : null;
        const more = past ? Math.max(0, (dayTx.get(i) || []).length - 3) : 0;
        return mbTip(fDayW(cyc.start + i), `day ${i + 1} of ${n}`, rows, items, past ? ((dayTx.get(i) || []).length ? (more ? `+${more} more · ` : '') + 'Click to see the day' : 'Nothing spent this day') : '');
      } }),
      series,
    });
    const c = plot(cd, MB_CHART, option, { notMerge: !!switched });
    if (!c) return;
    FX.live(c);
    // A click on the plot opens that day (a day with payments, up to today).
    on(c, 'click', e => {
      const px = [e.offsetX, e.offsetY];
      if (!c.inst.containPixel('grid', px)) return;
      const v = c.inst.convertFromPixel({ xAxisIndex: 0 }, px);
      const i = Math.round(Array.isArray(v) ? v[0] : v);
      if (i >= 0 && i <= D && dayTx.has(i)) openDay(cyc.start + i);
    }, true);
  }
  // The current account balance over the last 90 days, paydays marked, the low point labelled.
  function mbBalChart(cd, B, switched) {
    const t = tk();
    const pts = B.balSeries.filter(p => p.n > B.anchor - 90);
    cd.el.querySelector('h3').textContent = 'Balance';
    cd.setSub(`${B.balance && B.balance.n > 1 ? `${B.balance.n} current accounts` : 'Current account'} · last ${Math.min(90, B.anchor - pts[0].n + 1)} days`);
    S.paceLegend.innerHTML = `<span><i class="k" style="--c:var(--accent)"></i>Balance</span>${B.paydays.length ? '<span><i class="k pay"></i>Payday</span>' : ''}`;
    const data = pts.map(p => [p.n * DAY_MS, p.v]);
    let lo = pts[0]; for (const p of pts) if (p.v < lo.v) lo = p;
    const pays = B.paydays.filter(d => d >= pts[0].n && d <= B.anchor);
    const area = FX.area({ id: 'bal', name: 'Balance', data, color: t.accent, width: 2.25, area: t.dark ? 0.3 : 0.2, z: 4, symbolSize: 8, endLabel: v => gbp(v),
      markLine: pays.length ? { silent: true, symbol: 'none', animation: false, lineStyle: { color: alpha(t.income, 0.45), width: 1, type: 'solid' }, label: { show: false }, data: pays.map(d => ({ xAxis: d * DAY_MS })) } : undefined,
      markPoint: { silent: true, animation: false, symbol: 'circle', symbolSize: 8, itemStyle: { color: t.card, borderColor: t.sWarn, borderWidth: 2 },
        label: { show: true, position: 'bottom', distance: 6, formatter: 'Lowest ' + gbp(lo.v), color: t.muted, fontSize: 11, fontFamily: FONT, backgroundColor: alpha(t.card, 0.9), padding: [2, 5], borderRadius: 5 },
        data: [{ coord: [lo.n * DAY_MS, lo.v] }] } });
    area.endLabel = Object.assign(area.endLabel || {}, { fontSize: 12.5, fontWeight: 650, distance: 10 });
    const vals = pts.map(p => p.v); const mn = Math.min(...vals), mx = Math.max(...vals);
    const br = mbScale(Math.min(0, mn * 1.1), mx * 1.08);
    const option = base({
      grid: { left: 4, right: 70, top: 22, bottom: 28, containLabel: false },
      xAxis: FX.xTime({ extra: { axisLabel: { color: t.dim, fontSize: 11, hideOverlap: true, formatter: timeLbl }, axisPointer: { label: { show: true, backgroundColor: t.text, color: t.card, borderRadius: 6, padding: [4, 7, 3], fontSize: 11, fontWeight: 600, fontFamily: FONT, shadowBlur: 0, formatter: p => fDayW(Math.round(p.value / DAY_MS)) } } } }),
      yAxis: FX.yAxis({ ticks: 3, extra: { min: br.min, max: br.max, interval: br.step, axisLabel: { inside: true, margin: 0, verticalAlign: 'bottom', padding: [0, 0, 4, 2], color: t.dim, fontSize: 11, formatter: v => (v ? gbpShort(v) : '') } } }),
      tooltip: FX.tooltip({ trigger: 'axis', pointer: 'line', formatter: ps => {
        const p = ps && ps[0]; if (!p) return '';
        const n = Math.round(p.value[0] / DAY_MS);
        const isPay = pays.includes(n);
        return mbTip(fDayW(n), isPay ? 'payday' : '', [{ key: 'ln', c: t.accent, v: gbp2(p.value[1]), k: 'balance' }], null, '');
      } }),
      series: [area, FX.pulse({ id: 'balEnd', at: data[data.length - 1], color: t.accent, z: 4, size: 9 })],
    });
    const c = plot(cd, MB_CHART, option, { notMerge: !!switched });
    if (c) { FX.live(c); on(c, 'click', () => {}, true); }
  }
