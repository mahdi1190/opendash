  // @part 05-chart-kit.js · OWNER: C3 (shared chart plumbing + the chart kit FX; add helpers at the end, change existing ones only with every section in mind)
  // ── ECharts plumbing ──────────────────────────────────────────────────
  const hasEcharts = () => typeof window.echarts !== 'undefined' && window.echarts && typeof window.echarts.init === 'function';
  function chartFor(key, el) {
    if (!hasEcharts() || !el) return null;
    let c = R.charts.get(key);
    if (c && c.el === el && !c.inst.isDisposed()) return c;
    if (c) disposeChart(key);
    const inst = window.echarts.init(el, null, { renderer: 'canvas' });
    c = { inst, el, raf: 0, handlers: [], fresh: true, w: el.clientWidth, h: el.clientHeight };
    // @c1 fix (3 Oct): only resize when the size really changed. A ResizeObserver always fires once
    // on observe(), and ECharts' resize() runs with duration 0, which cut every entrance animation
    // (bars rising, lines drawing in) short about 100 ms after it started.
    c.ro = new ResizeObserver(() => {
      if (c.raf) return;
      c.raf = requestAnimationFrame(() => {
        c.raf = 0;
        if (inst.isDisposed() || !el.isConnected || !el.clientWidth) return;
        if (el.clientWidth === c.w && el.clientHeight === c.h) return;
        c.w = el.clientWidth; c.h = el.clientHeight; inst.resize();
      });
    });
    c.ro.observe(el);
    R.charts.set(key, c);
    return c;
  }
  function disposeChart(key) {
    const c = R.charts.get(key); if (!c) return;
    try { c.ro.disconnect(); } catch (e) { /* ignore */ }
    if (c.raf) cancelAnimationFrame(c.raf);
    fxUndefer(c);
    try { if (!c.inst.isDisposed()) c.inst.dispose(); } catch (e) { /* ignore */ }
    R.charts.delete(key);
  }
  function disposeAll(prefix) {
    for (const k of [...R.charts.keys()]) if (!prefix || k.startsWith(prefix)) disposeChart(k);
  }
  // Set an option. Merges by series id (so updates animate) unless the
  // chart is new, was cleared by an empty state, or notMerge is asked for.
  function plot(cd, key, option, opts) {
    opts = opts || {};
    if (!hasEcharts()) { cd.setEmpty('Charts unavailable: vendor/echarts.min.js was not built into this page.'); return null; }
    cd.setEmpty(null);
    const c = chartFor(key, cd.chart); if (!c) return null;
    const full = opts.notMerge || c.fresh || c.cleared || R.noAnim;
    // A tooltip/axis pointer left open by the mouse keeps the old series
    // indices; if an update adds or removes series (Compare, Money in) ECharts
    // then throws reading a series that no longer exists. Close it first.
    if (!c.fresh) { try { c.inst.dispatchAction({ type: 'hideTip' }); c.inst.dispatchAction({ type: 'updateAxisPointer', currTrigger: 'leave' }); } catch (e) { /* ignore */ } }
    if (option && typeof option === 'object' && !option.aria) option.aria = { enabled: false };   // @p2 our own label (07-chart-a11y.js), not ECharts' "NaN" one
    c.inst.setOption(option, full ? { notMerge: true } : { replaceMerge: opts.replace || ['series'] });
    // A chart first drawn below the fold draws in again when it scrolls into view (see fxDefer).
    if (c.fresh && !opts.noDefer) fxDefer(c);
    c.fresh = false; c.cleared = false;
    try { fxA11y(c, cd, option); } catch (e) { /* never let the label break a chart */ }   // @p2 Tab to a chart, Enter for its numbers
    return c;
  }
  function on(c, evt, fn, zr) {
    if (!c) return;
    const target = zr ? c.inst.getZr() : c.inst;
    const old = c.handlers.find(x => x.evt === evt && x.zr === !!zr);
    if (old) target.off(evt, old.fn);
    c.handlers = c.handlers.filter(x => x !== old);
    target.on(evt, fn); c.handlers.push({ evt, fn, zr: !!zr });
  }
  // The animation config comes from the chart kit (FX.anim, below).
  function base(extra) {
    const t = tk();
    return Object.assign(FX.anim(), {
      textStyle: { fontFamily: FONT, color: t.muted, fontSize: 11 },
      tooltip: tipBase(),
    }, extra || {});
  }
  function tipBase(extra) {
    const t = tk();
    // A tooltip can fire mid-update with an index from the previous data;
    // never let that throw.
    if (extra && typeof extra.formatter === 'function') {
      const f = extra.formatter;
      extra = Object.assign({}, extra, { formatter: (...args) => { try { return f(...args) || ''; } catch (e) { return ''; } } });
    }
    // Frosted glass (FX.glass): translucent surface, blur behind, soft shadow.
    return Object.assign({
      trigger: 'item', confine: true, backgroundColor: FX.glass().bg, borderColor: FX.glass().border, borderWidth: 1, padding: [10, 12],
      textStyle: { color: t.text, fontSize: 12, fontFamily: FONT },
      extraCssText: FX.glass().css,
      transitionDuration: R.reduced ? 0 : 0.18, enterable: false,
      axisPointer: { type: 'line', lineStyle: { color: t.strong, width: 1 }, shadowStyle: { color: alpha(t.text, 0.045) } },
    }, extra || {});
  }
  // Tooltip body: value leads, label follows, line keys.
  function tipHtml(title, rows, foot) {
    return `<div class="fv-tt"><div class="fv-tt-h">${esc(title)}</div>` + rows.map(r =>
      `<div class="fv-tt-r${r.muted ? ' mute' : ''}"><i class="${r.box ? 'bx' : 'ln'}" style="background:${r.c || 'transparent'}"></i><b>${esc(r.v)}</b><span>${esc(r.k)}</span></div>`).join('')
      + (foot ? `<div class="fv-tt-f">${esc(foot)}</div>` : '') + '</div>';
  }
  function xCat(data, extra) {
    const t = tk();
    return Object.assign({
      type: 'category', data, boundaryGap: true,
      axisLine: { lineStyle: { color: t.strong } }, axisTick: { show: false },
      axisLabel: { color: t.muted, fontSize: 10.5, hideOverlap: true, margin: 10 },
    }, extra || {});
  }
  function yVal(extra, fmt) {
    const t = tk();
    return Object.assign({
      type: 'value', splitNumber: 4,
      splitLine: { lineStyle: { color: t.grid, width: 1 } }, axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: t.muted, fontSize: 10.5, formatter: fmt || (v => gbpShort(v)) },
    }, extra || {});
  }
  function zoomSlider(extra) {
    const t = tk();
    return Object.assign({
      type: 'slider', height: 18, bottom: 8, borderColor: 'transparent', backgroundColor: t.hover,
      fillerColor: alpha(t.accent, t.dark ? 0.22 : 0.13),
      dataBackground: { lineStyle: { color: t.strong, width: 1 }, areaStyle: { color: t.strong, opacity: 0.3 } },
      selectedDataBackground: { lineStyle: { color: t.accent, width: 1 }, areaStyle: { color: t.accent, opacity: 0.2 } },
      handleSize: '120%', handleStyle: { color: t.card, borderColor: t.accent, borderWidth: 1.5 },
      moveHandleSize: 0, showDetail: false, brushSelect: false, textStyle: { color: t.muted },
      emphasis: { handleStyle: { borderColor: t.accent, color: t.card } },
    }, extra || {});
  }
  const barTop = { borderRadius: [4, 4, 0, 0] };
  // Time-axis labels in one plain style ("8 Aug", never a bold "Aug" beside
  // a bare "17"). ECharts adds a tick at each month start, so a day tick a
  // couple of days before one is dropped ("29 Jul  1 Aug" would collide).
  // Values arrive as local midnight; rounding gives the UTC day number.
  function timeLbl(v) {
    const n = Math.round(v / DAY_MS); const d = dobj(n); const day = d.getUTCDate();
    const dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    return day !== 1 && day > dim - 4 ? '' : fDay(n);
  }
  // Category-axis labels for ranked bar lists: the name, then a small dot in
  // the category's colour. Bars stay one calm colour; the dot carries the
  // category link (matching the donut/legend) without a rainbow of bars.
  function catDotAxis(names, cats, maxLen) {
    const t = tk(); const uniq = [...new Set(cats)]; const rich = { n: { color: t.text, fontSize: 11.5, fontFamily: FONT } };
    uniq.forEach((c, i) => { rich['c' + i] = { color: catColor(c), fontSize: 10, padding: [0, 0, 1, 5] }; });
    const clean = s => String(s).replace(/[{}|]/g, '');
    const cut = s => (s.length > maxLen ? s.slice(0, maxLen - 1).trimEnd() + '…' : s);
    return {
      type: 'category', inverse: true, data: names, axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { rich, formatter: (v, i) => `{n|${cut(clean(v))}}{c${uniq.indexOf(cats[i])}|●}` },
    };
  }
  // @new-begin chart kit (foundation, 3 Oct 2026)
  // ── Chart kit (FX) ────────────────────────────────────────────────────
  // One look and one motion language for every Finances chart: calm, crisp,
  // Stripe / Apple Stocks. Each helper returns a plain ECharts option piece:
  // put series factories in `series`, mix the rest into base({...}), then
  // plot() as usual (it merges by series id, so filter changes MORPH).
  // Everything reads the theme from tk() and honours reduced motion
  // (FX.animated() false: no animation, no pulsing rings). API in MODULES.md.
  //
  //   FX.anim()                 global animation config, spread into an option
  //   FX.animated()             false under reduced motion / theme repaints
  //   FX.gradient(col, a0, a1)  vertical gradient, col at alpha a0 -> a1
  //   FX.smoothLine(o)          line, smooth 0.25-0.35 + smoothMonotone 'x'
  //   FX.area(o)                smoothLine + gradient area
  //   FX.pulse(o)               end-point dot, optional pulsing ring
  //   FX.bars(o)                rounded bars, staggered rise, hover lift
  //   FX.donut(o)               rounded, padded donut (morphs with FX.bars)
  //   FX.tooltip(o)             glass tooltip + axis pointer / crosshair
  //   FX.tip(title, rows, foot, hero)   tooltip HTML (value leads)
  //   FX.grid(o) FX.xAxis(data, o) FX.xTime(o) FX.yAxis(o)   minimal axes
  //   FX.numLabel(o)            animated number label (valueAnimation)
  //   FX.refLine(value, text)   quiet dashed reference line (average, budget)
  //   FX.sel(item, on, any)     a data item marked selected / dimmed
  //   FX.selectable(color)      series options that style the selected item
  //   FX.onPick(c, keyOf, isCur, fn)   click handler; re-clicking the current item does nothing
  //   FX.live(c)                pause a chart's pulsing rings off screen / tab hidden
  const FX_MOTION = {
    enter: 820, update: 560, draw: 1050,           // ms: first draw, filter morph, line draw-in
    easeEnter: 'quarticOut', easeUpdate: 'cubicOut',
    stagger: 24, staggerMax: 360,                  // bars rise one after another, capped
  };
  const FX = {
    MOTION: FX_MOTION,
    animated: () => !R.reduced && !R.noAnim,
    anim() {
      if (!FX.animated()) return { animation: false };
      return { animation: true, animationDuration: FX_MOTION.enter, animationEasing: FX_MOTION.easeEnter,
        animationDurationUpdate: FX_MOTION.update, animationEasingUpdate: FX_MOTION.easeUpdate, animationThreshold: 4000 };
    },
    // Per-series motion (a series' own settings beat the option's).
    seriesAnim(o) {
      o = o || {};
      if (!FX.animated()) return { animation: false };
      return { animation: true, animationDuration: o.duration || FX_MOTION.enter, animationEasing: o.easing || FX_MOTION.easeEnter,
        animationDurationUpdate: FX_MOTION.update, animationEasingUpdate: FX_MOTION.easeUpdate };
    },
    glass() {
      const t = tk();
      return {
        bg: alpha(t.raised, t.dark ? 0.8 : 0.84), border: alpha(t.text, t.dark ? 0.1 : 0.07),
        css: 'border-radius:12px;box-shadow:var(--shadow-lg);-webkit-backdrop-filter:blur(14px) saturate(1.5);backdrop-filter:blur(14px) saturate(1.5);',
      };
    },
    gradient(col, a0, a1) {
      a0 = a0 == null ? 0.24 : a0; a1 = a1 == null ? 0 : a1;
      if (!hasEcharts()) return alpha(col, a0 / 2);
      return new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: alpha(col, a0) }, { offset: 1, color: alpha(col, a1) }]);
    },
    // o: { id, name, data, color, width, smooth (0.25-0.35), dashed, area (true | top alpha), endLabel: fmt,
    //      symbols, symbolSize, focus, z, xAxisIndex, yAxisIndex, stack, step, connectNulls, markLine, markPoint,
    //      sampling, opacity, draw (ms) }. Monotone smoothing never overshoots: no fake dips or peaks,
    //      and the curve passes through every point, so totals and endpoints stay exact.
    smoothLine(o) {
      const t = tk(); const col = o.color || t.accent; const w = o.width || 2; const anim = FX.animated();
      const s = Object.assign({
        id: o.id, name: o.name, type: 'line', data: o.data,
        smooth: o.step ? false : clamp(o.smooth != null ? +o.smooth : 0.3, 0.25, 0.35), smoothMonotone: 'x',
        showSymbol: !!o.symbols, symbol: 'circle', symbolSize: o.symbolSize || 7,
        lineStyle: { width: w, color: col, cap: 'round', join: 'round', type: o.dashed ? [4, 4] : 'solid', opacity: o.opacity == null ? 1 : o.opacity },
        itemStyle: { color: col, borderColor: t.card, borderWidth: 2 },
        emphasis: { focus: o.focus || 'none', lineStyle: { width: w + 0.5 } },
        z: o.z || 3,
      }, FX.seriesAnim({ duration: o.draw || FX_MOTION.draw, easing: 'cubicOut' }));
      for (const k of ['xAxisIndex', 'yAxisIndex', 'stack', 'step', 'connectNulls', 'markLine', 'markPoint', 'markArea', 'sampling', 'universalTransition', 'tooltip']) if (o[k] != null) s[k] = o[k];
      if (o.area) s.areaStyle = { color: FX.gradient(col, typeof o.area === 'number' ? o.area : 0.22, 0), origin: o.origin || 'auto' };
      if (o.endLabel) s.endLabel = { show: true, color: t.text, fontWeight: 600, fontSize: 11, fontFamily: FONT, distance: 6, valueAnimation: anim,
        formatter: p => { const v = Array.isArray(p.value) ? p.value[p.value.length - 1] : p.value; return o.endLabel(v); } };
      return s;
    },
    area(o) { return FX.smoothLine(Object.assign({ area: true }, o)); },
    // o: { id, at: [x, y] in data coords, color, size, ring (default true), xAxisIndex, yAxisIndex, z }
    // Appears once the line has drawn in. The ring pulses only while visible: call FX.live(c) after plot().
    pulse(o) {
      const t = tk(); const col = o.color || t.accent; const ring = o.ring !== false && FX.animated();
      const s = {
        id: o.id, type: ring ? 'effectScatter' : 'scatter', data: o.at ? [o.at] : [], silent: true, z: (o.z || 3) + 2,
        symbol: 'circle', symbolSize: o.size || 8, tooltip: { show: false }, legendHoverLink: false,
        itemStyle: { color: col, borderColor: t.card, borderWidth: 2, shadowBlur: 8, shadowColor: alpha(col, 0.5) },
        animation: FX.animated(), animationDelay: o.delay != null ? o.delay : Math.round(FX_MOTION.draw * 0.8), animationDuration: 300,
      };
      if (ring) Object.assign(s, { showEffectOn: 'render', rippleEffect: { period: 2.8, scale: 3, brushType: 'fill', number: 2, color: alpha(col, 0.3) } });
      for (const k of ['xAxisIndex', 'yAxisIndex']) if (o[k] != null) s[k] = o[k];
      return s;
    },
    // o: { id, name, data, color, horizontal, radius (number or [tl, tr, br, bl]), width, stack, gap (barGap),
    //      catGap (barCategoryGap), stagger (default true), lift (default true), track (background bar),
    //      label (e.g. FX.numLabel()), morph (universalTransition with a donut), focus, z, xAxisIndex, yAxisIndex }
    bars(o) {
      const t = tk(); const col = o.color || t.accent; const anim = FX.animated();
      const r = o.radius == null ? 5 : o.radius;
      const radius = Array.isArray(r) ? r : o.horizontal ? [0, r, r, 0] : [r, r, 0, 0];
      const s = Object.assign({
        id: o.id, name: o.name, type: 'bar', data: o.data, barMaxWidth: o.width || (o.horizontal ? 14 : 24),
        itemStyle: { color: col, borderRadius: radius },
        z: o.z || 2,
      }, FX.seriesAnim());
      if (anim && o.stagger !== false) {
        s.animationDelay = i => Math.min(i * FX_MOTION.stagger, FX_MOTION.staggerMax);
        s.animationDelayUpdate = i => Math.min(i * 6, 120);   // a faint wave when the data morphs
      }
      if (o.lift !== false) s.emphasis = { focus: o.focus || 'none', itemStyle: { shadowBlur: 14, shadowOffsetY: o.horizontal ? 0 : 3, shadowColor: alpha(col, t.dark ? 0.55 : 0.38) } };
      if (o.track) { s.showBackground = true; s.backgroundStyle = { color: alpha(col, t.dark ? 0.08 : 0.06), borderRadius: radius }; }
      if (o.morph) s.universalTransition = { enabled: true, divideShape: 'clone' };
      for (const k of ['stack', 'label', 'xAxisIndex', 'yAxisIndex', 'markLine', 'markPoint', 'tooltip', 'realtimeSort', 'labelLayout']) if (o[k] != null) s[k] = o[k];
      if (o.gap != null) s.barGap = o.gap;
      if (o.catGap != null) s.barCategoryGap = o.catGap;
      return s;
    },
    // o: { id, data: [{ name, value, itemStyle: { color } }], radius, center, pad (deg), corner, selectable }
    // Same series id + item names as an FX.bars({ morph: true }) series: switching between them morphs.
    donut(o) {
      const t = tk();
      const s = Object.assign({
        id: o.id, type: 'pie', data: o.data, radius: o.radius || ['62%', '86%'], center: o.center || ['50%', '50%'],
        startAngle: 90, padAngle: o.pad == null ? 1.6 : o.pad, minAngle: 2, avoidLabelOverlap: true,
        label: { show: false }, labelLine: { show: false },
        itemStyle: { borderRadius: o.corner == null ? 6 : o.corner, borderColor: t.card, borderWidth: o.pad === 0 ? 2 : 0 },
        emphasis: { scale: true, scaleSize: 5, itemStyle: { shadowBlur: 18, shadowColor: alpha(t.text, t.dark ? 0.5 : 0.18) } },
        universalTransition: { enabled: true, divideShape: 'clone' },
        animationType: 'expansion', animationTypeUpdate: 'transition',
      }, FX.seriesAnim({ duration: 900, easing: 'cubicOut' }));
      if (o.selectable) Object.assign(s, { selectedMode: 'single', selectedOffset: 6 });
      return s;
    },
    // Tooltip: the glass card (tipBase) plus, for trigger 'axis', a quiet dashed
    // pointer: o.pointer 'line' (default), 'cross' (crosshair with value pills)
    // or 'shadow' (a band, for bars). Other keys pass through to tipBase.
    tooltip(o) {
      o = Object.assign({}, o || {}); const t = tk();
      const kind = o.pointer || 'line'; delete o.pointer;
      const line = { color: alpha(t.text, t.dark ? 0.35 : 0.3), width: 1, type: [3, 3] };
      const tt = tipBase(o);
      if (tt.trigger === 'axis') {
        tt.axisPointer = kind === 'shadow' ? { type: 'shadow', shadowStyle: { color: alpha(t.text, t.dark ? 0.07 : 0.045) } }
          : kind === 'cross' ? { type: 'cross', snap: true, lineStyle: line, crossStyle: line,
            label: { backgroundColor: t.text, color: t.card, borderRadius: 4, padding: [3, 6], fontSize: 10.5, fontFamily: FONT, shadowBlur: 0, formatter: p => (p.axisDimension === 'y' ? gbpShort(p.value) : String(p.value)) } }
            : { type: 'line', snap: true, lineStyle: line, z: 0 };
      }
      return tt;
    },
    // Tooltip HTML. rows: [{ c: colour, v: value, k: label, box, muted }] as tipHtml;
    // hero: { v, k, c } puts one big number first (the Apple Stocks read-out).
    tip(title, rows, foot, hero) {
      const head = `<div class="fv-tt-h">${esc(title)}</div>`;
      const big = hero ? `<div class="fv-tt-hero"${hero.c ? ` style="--c:${esc(hero.c)}"` : ''}><b>${esc(hero.v)}</b>${hero.k ? `<span>${esc(hero.k)}</span>` : ''}</div>` : '';
      const body = (rows || []).filter(Boolean).map(r => `<div class="fv-tt-r${r.muted ? ' mute' : ''}"><i class="${r.box ? 'bx' : 'ln'}" style="background:${esc(r.c || 'transparent')}"></i><b>${esc(r.v)}</b><span>${esc(r.k)}</span></div>`).join('');
      return `<div class="fv-tt fv-tt-glass">${head}${big}${body}${foot ? `<div class="fv-tt-f">${esc(foot)}</div>` : ''}</div>`;
    },
    grid(o) { return Object.assign({ left: 8, right: 16, top: 24, bottom: 8, containLabel: true }, o || {}); },
    // Minimal axes: no axis line or ticks, a faint dashed grid, small muted labels.
    // o.extra merges last (anything ECharts accepts).
    xAxis(data, o) {
      o = o || {}; const t = tk();
      return Object.assign({
        type: 'category', data, boundaryGap: o.bars !== false,
        axisLine: { show: !!o.line, lineStyle: { color: t.border } }, axisTick: { show: false },
        axisLabel: { color: t.dim, fontSize: 10.5, hideOverlap: true, margin: 10 },
      }, o.extra || {});
    },
    xTime(o) {
      o = o || {}; const t = tk();
      return Object.assign({
        type: 'time', axisLine: { show: !!o.line, lineStyle: { color: t.border } }, axisTick: { show: false }, splitLine: { show: false },
        axisLabel: { color: t.dim, fontSize: 10.5, hideOverlap: true, formatter: timeLbl },
      }, o.extra || {});
    },
    yAxis(o) {
      o = o || {}; const t = tk();
      return Object.assign({
        type: 'value', splitNumber: o.ticks || 3, position: o.right ? 'right' : 'left',
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { show: o.grid !== false, lineStyle: { color: t.grid, width: 1, type: [3, 4] } },
        axisLabel: { color: t.dim, fontSize: 10.5, formatter: o.fmt || (v => gbpShort(v)) },
      }, o.extra || {});
    },
    // A series label whose number counts to its new value (ECharts valueAnimation).
    numLabel(o) {
      o = o || {}; const t = tk();
      return { show: true, position: o.position || 'top', distance: o.distance == null ? 6 : o.distance, color: o.color || t.muted,
        fontSize: o.size || 11, fontWeight: o.weight || 600, fontFamily: FONT, valueAnimation: FX.animated(),
        formatter: p => { const v = Array.isArray(p.value) ? p.value[p.value.length - 1] : p.value; return v == null ? '' : (o.fmt || gbpShort)(v); } };
    },
    // A markLine: quiet dashed reference (average, budget). o: { axis: 'x', solid, color, position }
    refLine(value, text, o) {
      o = o || {}; const t = tk();
      return { symbol: 'none', silent: true, animation: FX.animated(),
        lineStyle: { color: o.color || t.dim, width: 1, type: o.solid ? 'solid' : [4, 4] },
        label: text ? { show: true, position: o.position || 'insideEndTop', formatter: text, color: t.muted, fontSize: 10, fontFamily: FONT, backgroundColor: alpha(t.card, 0.85), padding: [1, 4], borderRadius: 3 } : { show: false },
        data: [o.axis === 'x' ? { xAxis: value } : { yAxis: value }] };
    },
    // Selection: the current item keeps a ring and the others dim, in every chart it appears in.
    sel(item, on2, any) {
      const it = Object.assign({}, item, { selected: !!on2 });
      it.itemStyle = Object.assign({}, item && item.itemStyle, { opacity: any && !on2 ? 0.3 : 1 });
      return it;
    },
    selectable(color) {
      const t = tk();
      return { selectedMode: 'single', select: { itemStyle: { borderColor: t.text, borderWidth: 1.5, shadowBlur: 10, shadowColor: alpha(color || t.accent, 0.45), opacity: 1 } } };
    },
    // keyOf(params) -> the clicked item's key (or null); isCur(key) -> already the current one?
    onPick(c, keyOf, isCur, fn) {
      on(c, 'click', p => { const k = keyOf(p); if (k == null || isCur(k)) return; fn(k, p); });
    },
    live(c) {
      if (!c || !c.el || typeof IntersectionObserver === 'undefined') return;
      fxLiveWire();
      if (FX_LIVE.charts.has(c)) return;
      FX_LIVE.charts.add(c); c.visible = true;
      FX_LIVE.io.observe(c.el);
    },
  };
  // Pulsing rings run only while their chart is on screen and the tab is visible.
  const FX_LIVE = { io: null, charts: new Set(), wired: false };
  function fxLiveApply(c) {
    if (!c.inst || c.inst.isDisposed()) return;
    const on2 = c.visible && !document.hidden;
    let opt; try { opt = c.inst.getOption(); } catch (e) { return; }
    // @na-fix: getOption() can hold null series after a replaceMerge.
    // @p2 (the comment above had swallowed the .map, so the rings were re-sent whole and never paused)
    const ids = (opt.series || []).filter(s => s && s.type === 'effectScatter' && s.id != null).map(s => ({ id: s.id, showEffectOn: on2 ? 'render' : 'emphasis' }));
    if (ids.length) c.inst.setOption({ series: ids });
  }
  function fxLivePrune() {
    for (const c of FX_LIVE.charts) if (!c.inst || c.inst.isDisposed() || !c.el.isConnected) { FX_LIVE.charts.delete(c); try { FX_LIVE.io.unobserve(c.el); } catch (e) { /* ignore */ } }
  }
  function fxLiveWire() {
    if (FX_LIVE.wired) { fxLivePrune(); return; }
    FX_LIVE.wired = true;
    FX_LIVE.io = new IntersectionObserver(entries => {
      for (const en of entries) for (const c of FX_LIVE.charts) if (c.el === en.target) { c.visible = en.isIntersecting; fxLiveApply(c); }
    }, { threshold: 0 });
    document.addEventListener('visibilitychange', () => { fxLivePrune(); for (const c of FX_LIVE.charts) fxLiveApply(c); });
  }
  // @new-end chart kit
  // @c3-begin in-view draw-in (C3 shell, 3 Oct 2026; CHART_STYLE.md §13 "Lifecycle")
  // A chart first drawn below the fold would finish animating before anyone
  // scrolled to it. plot() hands such charts to fxDefer: when the chart first
  // comes into view it replays its entrance from its current option (the same
  // data and the same selected:true items; nothing is recomputed). A chart that
  // dispatches select/highlight actions after plot() can set c.onReplay = fn to
  // re-apply them. Off under reduced motion and on settled re-visits (FX.animated()),
  // and plot(cd, key, option, { noDefer: true }) opts out.
  const FX_DEFER = { io: null, map: new Map() };
  function fxDefer(c) {
    if (!c || !c.el || !FX.animated() || typeof IntersectionObserver === 'undefined' || !c.el.isConnected) return;
    const r = c.el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 800;
    if (!r.width || r.top < vh * 0.92) return;   // on screen (or nearly): it is drawing in right now
    if (!FX_DEFER.io) FX_DEFER.io = new IntersectionObserver(es => {
      for (const en of es) {
        if (!en.isIntersecting) continue;
        const c2 = FX_DEFER.map.get(en.target);
        fxUndefer(c2 || { el: en.target });
        if (!c2 || !c2.inst || c2.inst.isDisposed() || !FX.animated() || document.hidden) continue;
        try {
          const o = c2.inst.getOption();
          c2.inst.clear(); c2.inst.setOption(o, { notMerge: true });
          if (typeof c2.onReplay === 'function') c2.onReplay();
        } catch (e) { /* the settled chart stays as it was */ }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
    FX_DEFER.map.set(c.el, c); c.deferred = true; FX_DEFER.io.observe(c.el);
  }
  function fxUndefer(c) {
    if (!c || !c.el) return;
    c.deferred = false;
    if (!FX_DEFER.io) return;
    if (!c.inst || FX_DEFER.map.get(c.el) === c) { FX_DEFER.map.delete(c.el); try { FX_DEFER.io.unobserve(c.el); } catch (e) { /* ignore */ } }
  }
  // @c3-end

