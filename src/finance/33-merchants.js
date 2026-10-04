  // @part 33-merchants.js · OWNER: C2 (Merchants section: vendor cards, leaderboard race, bubbles, table)
  // ----- Merchants -----
  // Vendor cards for the top eight, a leaderboard race over the range, how
  // often vs how much, and every merchant in a table. Name variants count as
  // one merchant (VK.groups). The selected merchant (F.merchant) is lit in
  // every one of them and the rest dim; clicking it again does nothing.
  BUILD.merchants = g => {
    S.vc = h('div', { class: 'fv-vc-grid', role: 'list', 'aria-label': 'Top merchants' });
    S.vcWrap = h('div', { class: 'fv-vc-wrap' }, S.vc);
    g.append(S.vcWrap);
    S.vcEls = new Map(); S.vcFirst = true;
    S.race = card(g, { title: 'Leaderboard', span: 7, chart: true, height: 300, cls: 'fv-race-card' });
    S.raceSeg = seg([['spend', 'Spend'], ['visits', 'Visits']], R.raceMetric || 'spend', v => { R.raceMetric = v; S.raceSeg.set(v); raceChart(S.race, R.ctx, { metric: true }); }, 'Race by');
    S.race.tools.append(S.raceSeg.el);
    S.bub = card(g, { title: 'How often vs how much', span: 5, md: 12, chart: true, height: 360 });
    S.list = card(g, { title: 'All merchants', span: 12 });
  };
  UPDATE.merchants = ctx => {
    vendorCards(S.vc, ctx);
    raceChart(S.race, ctx);
    bubbles(S.bub, ctx);
    merchantTable(S.list, ctx);
  };

  // ── Vendor cards ──────────────────────────────────────────────────────
  // Keyed by merchant: a filter change updates the cards in place (numbers
  // tick from their old values, moved cards glide to their new place), so
  // the entrance plays once per visit.
  function vendorCards(grid, ctx) {
    const G = VK.groups(ctx.M);
    const list = merchantGroupsFor(ctx).filter(m => m.total > 0.004).sort((p, q) => q.total - p.total || (p.m < q.m ? -1 : 1));
    const top = list.slice(0, 8);
    // Trends only when the data covers the whole previous period (else everything looks "New").
    const prevOk = ctx.hasPrev && ctx.prev.from >= ctx.M.minN;
    const prev = new Map(prevOk ? merchantGroupsFor(ctx, true).map(m => [m.key, m.total]) : []);
    const gran = ctx.rg.len <= 21 ? 'day' : ctx.rg.len <= 150 ? 'week' : 'month';
    const B = makeBuckets(ctx.rg.from, ctx.rg.to, gran);
    const ser0 = VL.bucketSeries(spendNoMerchant(ctx), G.keyOf, indexer(ctx.rg.from, gran), B.length);
    // A part week or month at either end would read as a dip: the sparklines leave it out.
    const full = b => gran === 'day' || (gran === 'week' ? b.e - b.s === 6 : b.s === monthStart(monthIdx(b.s)) && b.e === monthEnd(monthIdx(b.s)));
    let i0 = 0, i1 = B.length;
    if (B.length > 4 && !full(B[0])) i0 = 1;
    if (B.length - i0 > 4 && !full(B[B.length - 1])) i1 = B.length - 1;
    const ser = new Map([...ser0].map(([k, a]) => [k, a.slice(i0, i1)]));
    const selKey = F.merchant ? G.keyOf(F.merchant) : null;
    const first = S.vcFirst; S.vcFirst = false;
    const anim = !MK.reduced();
    grid.classList.toggle('has-sel', !!selKey);
    if (!top.length) {
      grid.innerHTML = ''; S.vcEls.clear();
      grid.append(h('div', { class: 'fv-empty fv-vc-empty', text: 'No merchants in this range.' }));
      return;
    }
    const empty = grid.querySelector('.fv-vc-empty'); if (empty) empty.remove();
    // FLIP: where each card is now, before the reorder.
    const before = new Map();
    if (anim && !first) for (const [k, el] of S.vcEls) before.set(k, el.getBoundingClientRect());
    const keep = new Set(top.map(m => m.key));
    for (const [k, el] of S.vcEls) if (!keep.has(k)) { el.remove(); S.vcEls.delete(k); }
    top.forEach((m, i) => {
      let el = S.vcEls.get(m.key);
      const fresh = !el;
      if (fresh) { el = vendorCard(m); S.vcEls.set(m.key, el); if (anim) { el.classList.add(first ? 'enter' : 'pop'); el.style.setProperty('--i', i); vkSettle(el, 'enter pop', 1800); } }
      paintVendorCard(el, m, i, prev.has(m.key) ? prev.get(m.key) : (prevOk ? 0 : null), ser.get(m.key) || [], selKey, fresh && first && anim);
      const at = grid.children[i];
      if (at !== el) grid.insertBefore(el, at || null);   // rank order; untouched cards stay put
    });
    if (before.size) {
      for (const [k, el] of S.vcEls) {
        const a = before.get(k); if (!a || typeof el.animate !== 'function') continue;
        const b = el.getBoundingClientRect(); const dx = a.left - b.left, dy = a.top - b.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      }
    }
  }
  function vendorCard(m) {
    const el = h('article', { class: 'fv-vc fsym-host', role: 'listitem', tabindex: '0', 'data-key': m.key });
    el._f = {
      tile: h('span', { class: 'fv-vc-tile' }),
      nm: h('div', { class: 'fv-vc-nm' }), cat: h('div', { class: 'fv-vc-cat' }),
      rank: h('span', { class: 'fv-vc-rank' }),
      open: h('button', { type: 'button', class: 'fv-vc-open btn-icon', 'aria-label': 'Details' }, ic('panel-right')),
      amt: h('div', { class: 'fv-vc-amt' }), meta: h('div', { class: 'fv-vc-meta' }), trend: h('div', { class: 'fv-vc-trend' }),
      spk: h('div', { class: 'fv-vc-spk' }),
    };
    const f = el._f;
    el.append(h('div', { class: 'fv-vc-top' }, f.tile, h('div', { class: 'fv-vc-id' }, f.nm, f.cat), f.rank, f.open), h('div', { class: 'fv-vc-mid' }, f.amt, f.trend), f.meta, f.spk);
    const pick = () => { const d = el._d; if (!d || isSelMerchant(d.primary)) return; setMerchant(d.primary); };
    el.addEventListener('click', e => { if (e.target.closest('.fv-vc-open')) return; pick(); });
    el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === el) { e.preventDefault(); pick(); } });
    f.open.addEventListener('click', e => { e.stopPropagation(); if (el._d) openMerchant(el._d.primary); });
    return el;
  }
  function paintVendorCard(el, m, i, prevTotal, series, selKey, entering) {
    const f = el._f; const old = el._d; el._d = m;
    const on2 = selKey === m.key;
    el.classList.toggle('is-current', on2); el.classList.toggle('is-dim', !!selKey && !on2);
    if (on2) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
    el.setAttribute('aria-label', `${m.m}, ${gbp(m.total)}, ${m.count} visit${m.count === 1 ? '' : 's'}`);
    if (!old || old.cat !== m.cat || old.primary !== m.primary) {
      f.tile.innerHTML = ''; const tl = VK.tile(m.primary, m.cat, { size: 'lg', enter: entering, i }); f.tile.append(tl);
      if (entering) vkSettle(tl, 'fsym-enter', 1600);
      f.cat.innerHTML = ''; f.cat.append(h('i', { class: 'dot', style: { background: catColor(m.cat) } }), h('span', { text: m.cat }));
    }
    f.nm.textContent = m.m; f.nm.title = m.raw.length > 1 ? `Also appears as ${m.raw.filter(r => r !== m.m).join(', ')}` : '';
    f.rank.textContent = '#' + (i + 1);
    f.open.setAttribute('aria-label', 'Details for ' + m.m);
    MK.tick(f.amt, round2(m.total), gbp);
    f.meta.textContent = '';
    f.meta.append(h('span', { text: `${nf0.format(m.count)} visit${m.count === 1 ? '' : 's'}` }), h('span', { text: 'avg ' + gbp2(m.avg) }), h('span', { text: 'last ' + fDay(m.last) }));
    // Trend vs the previous period of the same length.
    f.trend.textContent = ''; f.trend.className = 'fv-vc-trend';
    if (prevTotal != null) {
      if (prevTotal <= 0.004) { f.trend.classList.add('new'); f.trend.append(h('span', { text: 'New' })); f.trend.title = 'Nothing here in the previous period'; }
      else {
        const d = (m.total - prevTotal) / prevTotal;
        const flat = Math.abs(d) < 0.005;
        f.trend.classList.add(flat ? 'flat' : d > 0 ? 'up' : 'down');
        const ad = Math.abs(d * 100);
        f.trend.append(ic(flat ? 'minus' : d > 0 ? 'arrow-up' : 'arrow-down'), h('span', { text: flat ? '0%' : d >= 1 ? '×' + nf1.format(1 + d) : `${ad >= 10 ? Math.round(ad) : ad.toFixed(1)}%` }));
        f.trend.title = `${gbp(prevTotal)} in the previous period`;
      }
    }
    const sig = series.join(',') + catColor(m.cat);
    if (f.spk._sig !== sig) {
      f.spk._sig = sig; f.spk.innerHTML = '';
      const sp = VK.spark(series, { color: catColor(m.cat), enter: entering && !MK.reduced(), i, a0: 0.18 });
      f.spk.append(sp);
      if (entering) setTimeout(() => sp.classList.remove('enter'), 2200);
    }
  }

  // ── Leaderboard race ──────────────────────────────────────────────────
  // Cumulative spend (or visits) per merchant, bucket by bucket across the
  // range, bars re-sorting as they grow (realtimeSort). It plays once when it
  // first scrolls into view, then rests on the latest bucket; play replays,
  // the scrubber jumps. Reduced motion: the latest bucket, no playback.
  function raceChart(cd, ctx, o) {
    o = o || {};
    const t = tk(); const G = VK.groups(ctx.M);
    const metric = R.raceMetric === 'visits' ? 'visits' : 'spend';
    const len = ctx.rg.len;
    const gran = len <= 16 ? 'day' : len <= 120 ? 'week' : 'month';
    const B = makeBuckets(ctx.rg.from, ctx.rg.to, gran);
    const race = VL.raceFrames(spendNoMerchant(ctx), G.keyOf, B, indexer(ctx.rg.from, gran), metric, 10);
    const st = S.raceSt || (S.raceSt = { i: null, timer: 0, playing: false, played: false });
    raceStop(st);
    if (!race.keys.length) { cd.setEmpty('No merchants in this range.'); if (S.raceCtl) S.raceCtl.hidden = true; return; }
    const groups = new Map(merchantGroupsFor(ctx).map(m => [m.key, m]));
    const labels = []; const seen = new Set();
    race.keys.forEach(k => { let l = G.label(k); while (seen.has(l)) l += ' '; seen.add(l); labels.push(l); });
    const cats = race.keys.map(k => (groups.get(k) || {}).cat || 'Uncategorised');
    const prim = race.keys.map(k => (groups.get(k) || {}).primary || k);
    const selKey = F.merchant ? G.keyOf(F.merchant) : null;
    const nF = race.frames.length;
    const ms = clamp(Math.round(9000 / Math.max(1, nF)), 380, 1100);
    const anim = FX.animated();
    const fmt = v => (metric === 'visits' ? nf0.format(v) + (v === 1 ? ' visit' : ' visits') : gbp(v));
    const dataAt = i => race.frames[i].values.map((v, j) => FX.sel({ value: v, itemStyle: { color: catColor(cats[j]) } }, selKey === race.keys[j], !!selKey));
    // The first view starts at the first bucket and waits to be seen; later
    // updates (filters, a sync) rest on the latest bucket and morph there.
    const willPlay = anim && !st.played && nF > 1;
    st.i = willPlay ? 0 : nF - 1;
    st.race = race; st.dataAt = dataAt; st.ms = ms;
    const narrow = (cd.chart.clientWidth || 600) < 480;
    const gut = narrow ? 124 : 156;
    const rt = VK.richTiles(labels.map((l, j) => ({ name: prim[j], cat: cats[j], label: l })), 22, { max: narrow ? 13 : 18, weight: 550 });
    const option = base({
      grid: { left: gut + 12, right: 72, top: 4, bottom: 4 },
      tooltip: FX.tooltip({ trigger: 'item', formatter: p => { const j = p.dataIndex; const g2 = groups.get(race.keys[j]); return vkTip(labels[j], prim[j], cats[j], [
        { c: catColor(cats[j]), v: fmt(p.value), k: (metric === 'visits' ? 'visits' : 'spent') + ' by ' + race.frames[st.i].label, box: true },
        g2 ? { v: gbp2(g2.total), k: 'in the whole range', muted: true } : null], selKey === race.keys[j] ? 'Selected · Esc or × clears it' : 'Click to focus · double-click for details'); } }),
      xAxis: { type: 'value', max: 'dataMax', show: false },
      yAxis: { type: 'category', inverse: true, max: Math.min(7, race.keys.length - 1), data: labels, axisLine: { show: false }, axisTick: { show: false },
        axisLabel: rt.axisLabel(gut), animationDuration: 300, animationDurationUpdate: 300 },
      graphic: [{ id: 'mo', type: 'text', right: 14, bottom: 6, z: 0, silent: true, style: { text: race.frames[st.i].long ? race.frames[st.i].label : race.frames[st.i].label, fontSize: cd.chart.clientWidth < 420 ? 28 : 40, fontWeight: 300, fontFamily: FONT /* @p1: the `font` shorthand drew at 12 px */, fill: alpha(t.text, t.dark ? 0.16 : 0.11), textAlign: 'right', textVerticalAlign: 'bottom' } }],
      series: [Object.assign({ id: 'race', type: 'bar', realtimeSort: true, data: dataAt(st.i), barMaxWidth: 18, barCategoryGap: '32%',
        itemStyle: { borderRadius: [0, 9, 9, 0] },
        emphasis: { itemStyle: { shadowBlur: 12, shadowColor: alpha(t.text, t.dark ? 0.4 : 0.16) } },
        label: { show: true, position: 'right', distance: 8, valueAnimation: anim, color: t.text, fontWeight: 620, fontSize: 12, fontFamily: FONT, formatter: p => (p.value > 0 ? fmt(p.value) : '') },
        animation: anim, animationDuration: anim ? 600 : 0, animationDurationUpdate: anim ? Math.round(ms * 0.92) : 0, animationEasing: 'linear', animationEasingUpdate: 'linear' }, VK.barSelect())],
    });
    const c = plot(cd, 's:mc-race', option, { notMerge: !!o.metric });
    if (!c) return;
    st.c = c;
    // @p2 the chart's table (Enter on the focused chart, 07-chart-a11y.js) reads the final standings, not the frame on screen
    c.a11yOption = () => {
      const o2 = c.inst.getOption(); const s = S.raceSt; const lastF = s && s.race && s.race.frames.length ? s.race.frames.length - 1 : -1;
      if (lastF >= 0 && o2.series && o2.series[0]) Object.assign(o2.series[0], { data: s.dataAt(lastF), name: (metric === 'visits' ? 'Visits' : 'Spent') + ' by ' + s.race.frames[lastF].label });
      if (metric === 'visits' && o2.xAxis && o2.xAxis[0]) o2.xAxis[0].axisLabel = { formatter: v => nf0.format(v) };
      return o2;
    };
    FX.onPick(c, p => (race.keys[p.dataIndex] != null ? race.keys[p.dataIndex] : null), k => k === selKey, k => setMerchant(prim[race.keys.indexOf(k)]));
    on(c, 'dblclick', p => { const j = p.dataIndex; if (prim[j]) openMerchant(prim[j]); });
    raceControls(cd, st, nF, race);
    if (willPlay) raceWhenSeen(cd, st);
  }
  function raceControls(cd, st, nF, race) {
    if (!S.raceCtl) {
      const pp = h('button', { type: 'button', class: 'fv-race-pp', 'aria-label': 'Play the race' });
      pp.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="p" d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z"/><path class="s" d="M4.5 3h2.4v10H4.5zM9.1 3h2.4v10H9.1z"/></svg>';
      const range = h('input', { type: 'range', class: 'fv-race-scrub', min: '0', max: '1', step: '1', value: '0', 'aria-label': 'Race position' });
      const ticks = h('div', { class: 'fv-race-ticks', 'aria-hidden': 'true' });
      const lbl = h('span', { class: 'fv-race-lbl', 'aria-live': 'off' });
      S.raceCtl = h('div', { class: 'fv-race-ctl' }, pp, h('div', { class: 'fv-race-track' }, range, ticks), lbl);
      S.raceCtl._f = { pp, range, ticks, lbl };
      pp.addEventListener('click', () => { const s = S.raceSt; if (!s) return; if (s.playing) raceStop(s); else racePlay(s, true); });
      range.addEventListener('input', () => { const s = S.raceSt; if (!s) return; raceStop(s); raceGo(s, +range.value, true); });
      cd.el.append(S.raceCtl);
    }
    const f = S.raceCtl._f;
    S.raceCtl.hidden = nF < 2;
    f.range.max = String(nF - 1); f.range.value = String(st.i);
    f.pp.hidden = MK.reduced();
    const maxT = Math.max(2, Math.floor((cd.chart.clientWidth || 420) / 78));
    const every = Math.max(1, Math.ceil(nF / maxT));
    f.ticks.innerHTML = '';
    race.frames.forEach((fr, i) => {
      const last = i === nF - 1;
      if (last || (i % every === 0 && nF - 1 - i >= every * 0.7)) f.ticks.append(h('span', { style: { left: (nF > 1 ? i / (nF - 1) * 100 : 0) + '%' }, text: fr.label }));
    });
    raceUi(st);
  }
  function raceUi(st) {
    if (!S.raceCtl || !st.race) return;
    const f = S.raceCtl._f; const fr = st.race.frames[st.i] || {};
    f.range.value = String(st.i);
    f.range.style.setProperty('--p', (st.race.frames.length > 1 ? st.i / (st.race.frames.length - 1) * 100 : 100) + '%');
    f.lbl.textContent = fr.long || fr.label || '';
    f.pp.classList.toggle('playing', !!st.playing);
    f.pp.setAttribute('aria-label', st.playing ? 'Pause the race' : 'Play the race');
  }
  function raceGo(st, i, quick) {
    if (!st.c || st.c.inst.isDisposed() || !st.race) return;
    st.i = clamp(i, 0, st.race.frames.length - 1);
    const fr = st.race.frames[st.i];
    st.c.inst.setOption({ series: [{ id: 'race', data: st.dataAt(st.i), animationDurationUpdate: quick || !FX.animated() ? (FX.animated() ? 280 : 0) : Math.round(st.ms * 0.92) }], graphic: [{ id: 'mo', style: { text: fr.label } }] });
    raceUi(st);
  }
  function raceStop(st) { if (st.timer) clearTimeout(st.timer); st.timer = 0; st.playing = false; raceUi(st); }
  function racePlay(st, fromStart) {
    if (MK.reduced() || !st.race || st.race.frames.length < 2) return;
    raceStop(st);
    st.played = true; st.playing = true;
    if (fromStart || st.i >= st.race.frames.length - 1) raceGo(st, 0, true);
    raceUi(st);
    const step = () => {
      st.timer = 0;
      if (!st.playing || !st.c || st.c.inst.isDisposed() || !st.c.el.isConnected) { st.playing = false; return; }
      if (document.hidden) { raceStop(st); return; }
      if (st.i >= st.race.frames.length - 1) { raceStop(st); return; }
      raceGo(st, st.i + 1);
      st.timer = setTimeout(step, st.ms);
    };
    st.timer = setTimeout(step, fromStart ? 500 : st.ms);
  }
  // Play once, the first time the race is at least half on screen; pause
  // when it scrolls away or the tab is hidden.
  function raceWhenSeen(cd, st) {
    if (typeof IntersectionObserver === 'undefined') { racePlay(st, true); return; }
    if (st.io) st.io.disconnect();
    st.io = new IntersectionObserver(es => {
      for (const en of es) {
        if (en.isIntersecting && en.intersectionRatio >= 0.5 && !st.played && !document.hidden) racePlay(st, true);
        else if (!en.isIntersecting && st.playing) raceStop(st);
      }
      if (!cd.el.isConnected) { st.io.disconnect(); st.io = null; }
    }, { threshold: [0, 0.5] });
    st.io.observe(cd.chart);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.raceSt && S.raceSt.playing) raceStop(S.raceSt); });

  // ── How often vs how much ─────────────────────────────────────────────
  function bubbles(cd, ctx) {
    const t = tk(); const G = VK.groups(ctx.M);
    const list = merchantGroupsFor(ctx).filter(m => m.count > 0 && m.total > 0).sort((p, q) => q.total - p.total).slice(0, 200);
    if (!list.length) { cd.setEmpty('No merchants in this range.'); return; }
    cd.setSub('Each bubble is a merchant · size is the total spent');
    const maxT = Math.max(...list.map(m => m.total));
    const maxC = Math.max(...list.map(m => m.count));
    const few = (cd.chart.clientWidth || 600) < 480 ? 4 : 6;
    const selKey = F.merchant ? G.keyOf(F.merchant) : null;
    const option = base({
      grid: { left: 6, right: 30, top: 30, bottom: 26, containLabel: true },
      tooltip: FX.tooltip({ trigger: 'item', formatter: p => { const m = list[p.dataIndex]; return m ? vkTip(m.m, m.primary, m.cat, [{ c: catColor(m.cat), v: gbp2(m.total), k: 'spent', box: true }, { v: nf0.format(m.count), k: m.count === 1 ? 'visit' : 'visits' }, { v: gbp2(m.avg), k: 'average' }, { v: m.cat, k: '', muted: true }], selKey === m.key ? 'Selected · Esc or × clears it' : 'Click to focus · double-click for details') : ''; } }),
      xAxis: { type: 'log', logBase: 2, min: 0.8, name: 'Visits', nameLocation: 'middle', nameGap: 24, nameTextStyle: { color: t.dim, fontSize: 10.5 }, axisLabel: { color: t.dim, fontSize: 10.5, formatter: v => v < 1 ? '' : nf0.format(v) }, splitLine: { lineStyle: { color: t.grid, type: [3, 4] } }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: FX.yAxis({ ticks: 4, extra: { type: 'log', logBase: 10, name: 'Average', nameTextStyle: { color: t.dim, fontSize: 10.5, align: 'left' }, min: v => Math.max(0.5, v.min / 1.5) } }),
      series: [Object.assign({ id: 'b', type: 'scatter',
        data: list.map((m, i) => FX.sel({ value: [m.count, round2(Math.max(0.5, m.avg))], name: m.m, label: { show: i < few || selKey === m.key, position: Math.log2(Math.max(1, m.count)) > 0.62 * Math.log2(Math.max(2, maxC)) ? 'left' : 'right' },
          itemStyle: { color: alpha(catColor(m.cat), t.dark ? 0.74 : 0.68) } }, selKey === m.key, !!selKey)),
        symbolSize: (v, p) => Math.max(10, Math.sqrt(list[p.dataIndex].total / maxT) * 46),
        itemStyle: { borderColor: t.card, borderWidth: 1.5 },
        emphasis: { focus: 'self', scale: 1.15, itemStyle: { opacity: 1 } }, blur: { itemStyle: { opacity: 0.25 } },
        label: { position: 'right', distance: 6, color: t.text, fontSize: 11, fontWeight: 550, fontFamily: FONT, formatter: p => p.name.length > 18 ? p.name.slice(0, 17) + '…' : p.name, backgroundColor: alpha(t.card, 0.82), padding: [1, 4], borderRadius: 4 },
        labelLayout: { hideOverlap: true },
        animationDelay: FX.animated() ? i => Math.min(i * 15, 600) : 0, progressive: 400 }, FX.selectable(t.accent))],
    });
    const c = plot(cd, 's:mc-bub', option);
    FX.onPick(c, p => (list[p.dataIndex] ? list[p.dataIndex].key : null), k => k === selKey, k => { const m = list.find(x => x.key === k); if (m) setMerchant(m.primary); });
    on(c, 'dblclick', p => { const m = list[p.dataIndex]; if (m) openMerchant(m.primary); });
  }

  // ── All merchants ─────────────────────────────────────────────────────
  function merchantTable(cd, ctx) {
    const G = VK.groups(ctx.M);
    const list = merchantGroupsFor(ctx).filter(m => Math.abs(m.total) > 0.004);
    cd.body.querySelectorAll('.fv-tablewrap,.fv-btn').forEach(x => x.remove());
    if (!list.length) { cd.setEmpty('No merchants in this range.'); return; }
    cd.setEmpty(null);
    const total = sum(list, m => m.total);
    const key = F.mSort.key, dir = F.mSort.dir;
    const val = { m: m => m.m.toLowerCase(), cat: m => m.cat, count: m => m.count, total: m => m.total, avg: m => m.avg, last: m => m.last };
    const vf = val[key] || val.total;
    list.sort((p, q) => { const a = vf(p), b = vf(q); return (a < b ? -1 : a > b ? 1 : 0) * dir || q.total - p.total; });
    cd.setSub(`${nf0.format(list.length)} merchants · ${gbp(total)}`);
    const selKey = F.merchant ? G.keyOf(F.merchant) : null;
    const maxShare = Math.max(...list.map(m => m.total / Math.max(1, total)), 0.0001);
    const th = (k, l, cls) => h('th', { class: (cls || '') + ' sort' + (key === k ? ' on' : ''), 'aria-sort': key === k ? (dir > 0 ? 'ascending' : 'descending') : 'none' },
      h('button', { type: 'button', onclick: () => { F.mSort = { key: k, dir: key === k ? -dir : (k === 'm' || k === 'cat' ? 1 : -1) }; saveF(); merchantTable(cd, R.ctx); } }, l, h('span', { class: 'ar' }, key === k ? ic(dir > 0 ? 'chevron-up' : 'chevron-down') : null)));
    const lim = R.mLimit;
    const tbl = h('table', { class: 'fv-table fv-mtable' + (selKey ? ' has-sel' : '') },
      h('thead', null, h('tr', null, th('m', 'Merchant'), th('cat', 'Category'), th('count', 'Visits', 'r'), th('total', 'Spent', 'r'), th('avg', 'Average', 'r'), h('th', { class: 'fv-th-share', text: 'Share' }), th('last', 'Last', 'r'))),
      h('tbody', null, list.slice(0, lim).map(m => {
        const on2 = selKey === m.key; const share = m.total / Math.max(1, total);
        return h('tr', { class: 'click fsym-host' + (on2 ? ' sel' : ''), 'aria-current': on2 ? 'true' : null, tabindex: '0', onclick: () => openMerchant(m.primary), onkeydown: e => { if (e.key === 'Enter') openMerchant(m.primary); } },
          h('td', { class: 'fv-td-m' }, h('span', { class: 'fv-mcell' }, VK.tile(m.primary, m.cat, { size: 'sm', badge: false }), h('span', { class: 'fv-mcell-t' }, h('span', { class: 'n', text: m.m }), m.raw.length > 1 ? h('span', { class: 'v', text: `${m.raw.length} names` }) : null))),
          h('td', null, h('span', { class: 'fv-cell-cat' }, VK.cat(m.cat, { size: 'xs' }), h('span', { text: m.cat }))),
          h('td', { class: 'r num', text: nf0.format(m.count) }), h('td', { class: 'r num', text: gbp2(m.total) }), h('td', { class: 'r num mute', text: gbp2(m.avg) }),
          h('td', { class: 'fv-td-share' }, h('span', { class: 'fv-share' }, h('i', { style: { '--w': (Math.max(0, share) / maxShare * 100).toFixed(1) + '%', background: catColor(m.cat) } })), h('span', { class: 'num mute', text: pct(share, 1) })),
          h('td', { class: 'r num mute', text: fDay(m.last) }));
      })));
    cd.body.append(h('div', { class: 'fv-tablewrap' }, tbl));
    if (list.length > lim) cd.body.append(h('button', { type: 'button', class: 'fv-btn ghost', text: `Show more (${list.length - lim} left)`, onclick: () => { R.mLimit += 30; merchantTable(cd, R.ctx); } }));
  }
