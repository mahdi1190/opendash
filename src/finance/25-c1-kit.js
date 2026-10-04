  // @part 25-c1-kit.js · NEW · OWNER: C1 (chart helpers + the new analysis for Spending, Categories and Cash flow)
  // ── C1: charts for Spending, Categories and Cash flow ─────────────────
  // Pure functions (no DOM; tests/finance-c1.test.mjs runs them in Node
  // through FinanceView._c1):
  //   C1.monoPath(points)            monotone cubic path (never overshoots), for SVG sparklines
  //   C1.heatBins(values)            quantile edges (20/40/60/80th) for the calendar heatmap
  //   C1.binOf(v, edges)             which bin a value falls in
  //   C1.pace(cur, prv, rg, prev, effTo, minN)   cumulative spend by day: this period vs the previous one
  //   C1.monthDays(rows, from, to)   average spend per day of the month (and early / mid / late)
  //   C1.sankey(o)                   money in -> categories -> kept: nodes + links that balance exactly
  //   C1.bucketSeries(rows, B, ix, keyOf)   per-key series over the buckets (small multiples)
  // View helpers: C1.tip (glass tooltip body), C1.tile / C1.catIcon (FinSymbols markup),
  // C1.tileImg / C1.catImg (images for ECharts rich labels), C1.spark (SVG sparkline),
  // C1.zoom (the styled navigator), C1.yIn (labels inside the plot), C1.draw (plot, but charts
  // below the fold draw in when they first scroll into view), C1.partial (a bucket that is only partly over).
  const C1_WAIT = { io: null, cbs: new Map() };
  let c1Uid = 0;
  const C1 = {
    // ---------- pure ----------
    monoPath(P) {
      const n = P.length; if (!n) return '';
      const f = v => +v.toFixed(2);
      if (n === 1) return `M${f(P[0][0])} ${f(P[0][1])}`;
      const dx = [], m = [], t = [];
      for (let i = 0; i < n - 1; i++) { dx[i] = P[i + 1][0] - P[i][0]; m[i] = dx[i] ? (P[i + 1][1] - P[i][1]) / dx[i] : 0; }
      t[0] = m[0]; t[n - 1] = m[n - 2];
      for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
      let d = `M${f(P[0][0])} ${f(P[0][1])}`;
      for (let i = 0; i < n - 1; i++) {
        const k = dx[i] / 3;
        d += `C${f(P[i][0] + k)} ${f(P[i][1] + t[i] * k)} ${f(P[i + 1][0] - k)} ${f(P[i + 1][1] - t[i + 1] * k)} ${f(P[i + 1][0])} ${f(P[i + 1][1])}`;
      }
      return d;
    },
    heatBins(values) {
      const v = values.filter(x => x > 0).sort((p, q) => p - q);
      if (!v.length) return [];
      const edges = [];
      for (const q of [0.2, 0.4, 0.6, 0.8]) { const e = round2(quantile(v, q)); if (e > 0 && (!edges.length || e > edges[edges.length - 1])) edges.push(e); }
      return edges;
    },
    binOf(v, edges) { let b = 0; for (const e of edges) if (v >= e) b++; return b; },
    pace(cur, prv, rg, prev, effTo, minN) {
      const len = rg.len; const today = clamp(effTo - rg.from, 0, len - 1);
      const a = new Array(len).fill(0), b = new Array(len).fill(0);
      for (const x of cur) { const i = x.n - rg.from; if (i >= 0 && i < len) a[i] += x.s; }
      for (const x of prv) { const i = x.n - prev.from; if (i >= 0 && i < len) b[i] += x.s; }
      let s1 = 0, s2 = 0;
      const curC = a.map((v, i) => { s1 += v; return i <= today ? round2(s1) : null; });
      const prevC = b.map((v, i) => { s2 += v; return prev.from + i < minN ? null : round2(s2); });
      return { len, today, cur: curC, prev: prevC, partialPrev: prev.from < minN, prevAtToday: prevC[today], prevTotal: prevC[len - 1] };
    },
    monthDays(rows, from, to) {
      const sums = new Array(31).fill(0), days = new Array(31).fill(0);
      for (let n = from; n <= to; n++) days[dobj(n).getUTCDate() - 1]++;
      for (const x of rows) sums[dobj(x.n).getUTCDate() - 1] += x.s;
      const avg = sums.map((s, i) => (days[i] ? round2(s / days[i]) : 0));
      const part = (a, b) => { let s = 0, d = 0; for (let i = a; i <= b; i++) { s += sums[i]; d += days[i]; } return d ? s / d : 0; };
      return { sums: sums.map(round2), days, avg, early: part(0, 9), mid: part(10, 19), late: part(20, 30) };
    },
    // o: { sources: [[name, value]] (money in by source, positive), cats: [{ name, value, members }] (folded, positive),
    //      out: total spent (may include refunds), inc: total money in }. Every node balances: what flows in flows out.
    sankey(o) {
      const inc = Math.max(0, o.inc || 0), out = o.out || 0;
      const cats = (o.cats || []).filter(c => c.value > 0.004);
      const catSum = sum(cats, c => c.value);
      const refunds = round2(Math.max(0, catSum - out));
      const kept = round2(inc - out);
      const hub = kept >= 0 ? 'Money in' : 'Money out';
      const nodes = [], links = [];
      const node = (id, label, side, kind, extra) => { nodes.push(Object.assign({ name: id, label, side, kind }, extra || {})); return id; };
      const H = node('hub', hub, 'm', 'hub');
      const srcs = (o.sources || []).filter(s => s[1] > 0.004).sort((p, q) => q[1] - p[1]);
      const top = srcs.slice(0, 3), rest = sum(srcs.slice(3), s => s[1]);
      top.forEach(([nm, v], i) => links.push({ source: node('src:' + i, nm, 'l', 'in'), target: H, value: round2(v) }));
      if (rest > 0.004) links.push({ source: node('src:rest', 'Other money in', 'l', 'in'), target: H, value: round2(rest) });
      if (refunds > 0.004) links.push({ source: node('src:refunds', 'Refunds', 'l', 'refund'), target: H, value: refunds });
      if (kept < -0.004) links.push({ source: node('src:balance', 'From your balance', 'l', 'balance'), target: H, value: round2(-kept) });
      cats.forEach((c, i) => links.push({ source: H, target: node('cat:' + i, c.name, 'r', 'cat', { members: c.members || [c.name] }), value: round2(c.value) }));
      if (kept > 0.004) links.push({ source: H, target: node('kept', 'Kept', 'r', 'kept'), value: kept });
      return { nodes, links, inc: round2(inc), out: round2(out), kept, refunds, hub, rate: inc > 0 ? kept / inc : null };
    },
    // @p1: the calendar heatmap's cell size for a card w px wide showing `weeks` columns: cells at most
    // 28 px tall and 1.5:1 wide (short ranges used to stretch into 74 × 26 bars), at least 11 px, and
    // the grid centred (left offset, never under the 30 px the day letters need).
    calCells(w, weeks) {
      const raw = Math.floor((w - 60) / Math.max(1, weeks));
      const ch = clamp(Math.min(raw, 28), 11, 28);
      const cw = clamp(Math.min(raw, Math.round(ch * 1.5)), 11, 120);
      return { cw, ch, left: Math.max(30, Math.round((w - 24 - weeks * cw) / 2)) };
    },
    bucketSeries(rows, B, ix, keyOf) {
      const out = new Map();
      for (const x of rows) {
        const k = keyOf(x); if (k == null) continue;
        const i = ix(x.n); if (i < 0 || i >= B.length) continue;
        if (!out.has(k)) out.set(k, new Array(B.length).fill(0));
        out.get(k)[i] += x.s;
      }
      for (const [k, a] of out) out.set(k, a.map(round2));
      return out;
    },

    // ---------- view helpers ----------
    // A bucket only partly over (this week so far, the first part-week of the range): drawn faded, never a fake dip.
    partial(b) {
      if (!b) return false;
      if (b.mi != null) return b.s !== monthStart(b.mi) || b.e !== monthEnd(b.mi);
      if (F.gran === 'week') return b.e - b.s < 6;
      return false;
    },
    // Tooltip body. rows: [{ c, v, k, key: 'ln'|'bx'|'ds'|'dt'|'circ'|'none', muted, tone: 'good'|'warn' }]
    // o: { sub (right of the title), hero: { v, k, c }, items: [{ m, c, a }] (payments with merchant tiles), foot }
    tip(title, rows, o) {
      o = o || {};
      const keyOf = r => r.key || (r.box ? 'bx' : 'ln');
      const head = `<div class="fv-tt-h c1-tt-h"><span>${esc(title)}</span>${o.sub ? `<em>${esc(o.sub)}</em>` : ''}</div>`;
      const hero = o.hero ? `<div class="fv-tt-hero"${o.hero.c ? ` style="--c:${esc(o.hero.c)}"` : ''}><b>${esc(o.hero.v)}</b>${o.hero.k ? `<span>${esc(o.hero.k)}</span>` : ''}</div>` : '';
      const body = (rows || []).filter(Boolean).map(r => {
        const k = keyOf(r); const c = esc(r.c || 'transparent');
        return `<div class="fv-tt-r${r.muted ? ' mute' : ''}${r.tone ? ' c1-' + (r.tone === 'good' ? 'good' : 'warn') : ''}"><i class="${k}" style="--c:${c}${k === 'ln' || k === 'bx' || k === 'circ' ? ';background:' + c : ''}"></i><b>${esc(r.v)}</b><span>${esc(r.k)}</span></div>`;
      }).join('');
      const items = o.items && o.items.length ? `<div class="c1-tt-m">${o.items.map(x => `<div>${C1.tile(x.m, x.c, 'xs', { live: false, badge: false })}<span class="nm">${esc(x.m)}</span><b>${esc(gbp2(x.a))}</b></div>`).join('')}</div>` : '';
      return `<div class="fv-tt fv-tt-glass c1-tt">${head}${hero}${body}${items}${o.foot ? `<div class="fv-tt-f">${esc(o.foot)}</div>` : ''}</div>`;
    },
    sym: () => (window.FinSymbols && typeof window.FinSymbols.merchantSymbol === 'function' ? window.FinSymbols : null),
    // Merchant tile markup (FinSymbols); a plain monogram if the symbols module is missing.
    tile(m, c, size, o) {
      const S2 = C1.sym();
      if (S2) return S2.merchantSymbol(m, c, Object.assign({ size: size || 'sm' }, o || {}));
      return `<span class="c1-tile-fb" aria-hidden="true">${esc(String(m || '?').trim().charAt(0).toUpperCase())}</span>`;
    },
    catIcon(c, o) {
      o = o || {};
      const S2 = C1.sym();
      const col = c === 'Everything else' ? tk().other : catColor(c);
      if (S2) return S2.categoryIcon(c === 'Everything else' ? 'Other' : c, Object.assign({ size: 'sm', color: col }, o));
      return `<i class="fv-sw" style="background:${esc(col)}" aria-hidden="true"></i>`;
    },
    tileEl(m, c, size, o) { return h('span', { class: 'c1-sym', html: C1.tile(m, c, size, o) }); },
    catIconEl(c, o) { return h('span', { class: 'c1-sym', html: C1.catIcon(c, o) }); },
    // Images for ECharts rich-text labels: drawn once, cached by theme; never fetched.
    imgs: new Map(),
    mix(a, b, w) {
      const p = x => { const n = parseInt(x.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
      if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
      const x = p(a), y = p(b);
      return '#' + x.map((v, i) => Math.round(v * w + y[i] * (1 - w)).toString(16).padStart(2, '0')).join('');
    },
    catImg(cat, px) {
      const t = tk(); const col = cat === 'Everything else' ? t.other : catColor(cat);
      const key = 'c|' + cat + '|' + px + '|' + (t.dark ? 'd' : 'l') + col;
      if (C1.imgs.has(key)) return C1.imgs.get(key);
      const S2 = C1.sym();
      const raw = S2 && S2.categoryGlyph ? S2.categoryGlyph(cat === 'Everything else' ? 'Other' : cat) : '';
      const inner = (/<svg[^>]*>([\s\S]*)<\/svg>/.exec(raw) || [])[1] || '<circle cx="12" cy="12" r="4"/>';
      const ink = /^#[0-9a-f]{6}$/i.test(col) ? col : '#888888';
      const bg = C1.mix(ink, /^#[0-9a-f]{6}$/i.test(t.card) ? t.card : (t.dark ? '#18181c' : '#ffffff'), t.dark ? 0.22 : 0.14);
      const body = inner.replace(/class="f"/g, `fill="${ink}" stroke="none"`).replace(/class="[^"]*"/g, '');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}"><rect width="${px}" height="${px}" rx="${px * 0.3}" fill="${bg}"/><g transform="translate(${px * 0.2} ${px * 0.2}) scale(${(px * 0.6) / 24})" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      C1.imgs.set(key, url); return url;
    },
    tileImg(m, cat, px) {
      const S2 = C1.sym(); const t = tk();
      const info = S2 && S2.merchantInfo ? S2.merchantInfo(m, cat) : { color: t.accent, ink: '#ffffff', mono: String(m || '?').charAt(0).toUpperCase(), key: m };
      const key = 't|' + info.key + '|' + info.mono + '|' + px;
      if (C1.imgs.has(key)) return C1.imgs.get(key);
      let url = '';
      try {
        const r = 2, cv = document.createElement('canvas'); cv.width = cv.height = px * r;
        const g = cv.getContext('2d'); g.scale(r, r);
        const rad = px * 0.3;
        g.fillStyle = info.color; g.beginPath(); g.moveTo(rad, 0); g.arcTo(px, 0, px, px, rad); g.arcTo(px, px, 0, px, rad); g.arcTo(0, px, 0, 0, rad); g.arcTo(0, 0, px, 0, rad); g.closePath(); g.fill();
        const len = [...String(info.mono || '')].length; const fs = px * (len >= 3 ? 0.3 : len === 2 ? 0.38 : 0.46);
        g.fillStyle = info.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${fs}px ${FONT}`;
        g.fillText(info.mono || '?', px / 2, px / 2 + fs * 0.05);
        url = cv.toDataURL();
      } catch (e) { url = ''; }
      C1.imgs.set(key, url); return url;
    },
    // SVG sparkline (monotone, gradient wash, an HTML end dot that never stretches). The draw-in is a
    // clip rect scaling on X (transform only), played once by CSS when the element first appears.
    spark(values, o) {
      o = o || {};
      const v = values.map(x => (x == null || !isFinite(x) ? 0 : x));
      const w = 100, hh = o.h || 36, pad = 3;
      if (v.length < 2) return '';
      const lo = Math.min(0, ...v), hi = Math.max(...v); const span = hi - lo || 1;
      const P = v.map((x, i) => [(i / (v.length - 1)) * w, pad + (1 - (x - lo) / span) * (hh - pad * 2)]);
      const id = 'c1s' + (++c1Uid);
      const col = /^#[0-9a-f]{3,8}$|^rgba?\([0-9., ]+\)$/i.test(String(o.color || '')) ? o.color : 'var(--accent)';
      const line = C1.monoPath(P);
      const last = P[P.length - 1];
      return `<svg class="c1-spk" viewBox="0 0 ${w} ${hh}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity="${o.a0 == null ? 0.22 : o.a0}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>`
        + `<clipPath id="${id}c"><rect class="c1-spk-clip" x="0" y="-8" width="${w}" height="${hh + 16}"/></clipPath></defs>`
        + `<g clip-path="url(#${id}c)"><path d="${line}L${w} ${hh}L0 ${hh}Z" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${col}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></g></svg>`
        + `<i class="c1-spk-dot" style="left:${((last[0] / w) * 100).toFixed(2)}%;top:${((last[1] / hh) * 100).toFixed(2)}%;background:${col}"></i>`;
    },
    // Value axis for lines and areas: labels sit on the gridline inside the plot (Stripe / Apple Stocks).
    yIn(o) {
      o = o || {}; const t = tk();
      return Object.assign({
        type: 'value', splitNumber: o.ticks || 3, axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: t.dark ? t.border : t.grid, width: 1 } },
        // @p1: a surface-coloured halo keeps the label legible where a line passes behind it
        // (the axis draws above the series for that; a stacked fill can pass extra: { z: 0 }).
        z: 6,
        axisLabel: { inside: true, margin: 0, verticalAlign: 'bottom', padding: [0, 0, 4, 2], color: t.dim, fontSize: 10.5, fontFamily: FONT, textBorderColor: t.card, textBorderWidth: 3, formatter: o.fmt || (v => gbpShort(v)) },
      }, o.extra || {});
    },
    yOut(o) {
      o = o || {}; const t = tk();
      return Object.assign({
        type: 'value', splitNumber: o.ticks || 4, axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: t.dark ? t.border : t.grid, width: 1 } },
        axisLabel: { color: t.dim, fontSize: 10.5, fontFamily: FONT, formatter: o.fmt || (v => gbpShort(v)) },
      }, o.extra || {});
    },
    xCat(labels, o) {
      o = o || {}; const t = tk();
      const x = Object.assign({
        type: 'category', data: labels, boundaryGap: o.edge ? false : true,
        axisLine: { show: !!o.line, lineStyle: { color: t.strong } }, axisTick: { show: false },
        axisPointer: { label: { show: !!o.pill, backgroundColor: t.text, color: t.card, borderRadius: 6, padding: [4, 7, 3], fontSize: 11, fontWeight: 600, fontFamily: FONT, margin: 6, shadowBlur: 0, formatter: o.pillFmt } },
      }, o.extra || {});
      x.axisLabel = Object.assign({ color: t.dim, fontSize: 10.5, fontFamily: FONT, hideOverlap: true, margin: 10 }, o.edge ? { alignMinLabel: 'left', alignMaxLabel: 'right' } : {}, o.label || {});
      // @p1: edge-aligned first/last labels shift inwards, so ECharts' own spacing let the last two
      // touch ("7 Sept21 Sept"). With the plot width known: every k-th label, the last always, and
      // none crowding it.
      const n = labels.length;
      if (o.edge && o.width > 0 && n > 2 && !(o.label && o.label.interval != null)) {
        const k = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(o.width / (o.per || 70)))));
        x.axisLabel.interval = i => i === n - 1 || (i % k === 0 && n - 1 - i >= Math.ceil(k * 0.75));
      }
      return x;
    },
    // The in-chart zoom scrubber (the range bar's navigator is the period slider for the page).
    // @p1: a quiet scrollbar-like track: no second copy of the data (the navigator above already
    // draws the history), a soft thumb for the visible window and small pill handles, so it reads as
    // "zoomable" without a heavy purple block under every chart.
    zoom(o) {
      const t = tk();
      return Object.assign({
        type: 'slider', bottom: 8, left: 14, right: 14, borderColor: 'transparent', backgroundColor: alpha(t.text, t.dark ? 0.06 : 0.04),
        fillerColor: alpha(t.accent, t.dark ? 0.26 : 0.15), borderRadius: 6, brushSelect: false, moveHandleSize: 0, showDetail: false,
        dataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
        selectedDataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
        handleIcon: 'path://M3,0 h2 a3,3 0 0 1 3,3 v10 a3,3 0 0 1 -3,3 h-2 a3,3 0 0 1 -3,-3 v-10 a3,3 0 0 1 3,-3 z', handleSize: '140%',
        handleStyle: { color: t.card, borderColor: alpha(t.accent, 0.85), borderWidth: 1.25, shadowBlur: 3, shadowColor: 'rgba(0,0,0,0.14)' },
        emphasis: { handleStyle: { borderColor: t.accent, color: t.card, shadowBlur: 5 } }, textStyle: { color: t.muted },
      }, o || {}, { height: 10 });
    },
    // The glass tooltip with a crosshair that snaps and glides, and the date pill riding the x axis.
    tooltip(o) {
      o = Object.assign({}, o || {}); const t = tk();
      const tt = FX.tooltip(o);
      if (tt.trigger === 'axis' && tt.axisPointer && tt.axisPointer.type === 'line') {
        tt.axisPointer = { type: 'line', snap: true, animation: FX.animated(), animationDurationUpdate: 160, animationEasingUpdate: 'cubicOut', z: 0,
          lineStyle: { color: alpha(t.text, t.dark ? 0.35 : 0.22), width: 1 }, label: { show: false } };
      }
      tt.transitionDuration = FX.animated() ? 0.2 : 0;
      return tt;
    },
    // Lift on hover: a darker fill and a soft coloured shadow (no dimming of the others).
    lift(col) {
      const t = tk();
      return { focus: 'none', itemStyle: { color: C1.mix(col, t.dark ? '#ffffff' : '#000000', t.dark ? 0.86 : 0.88), shadowBlur: 14, shadowOffsetY: 4, shadowColor: alpha(col, t.dark ? 0.55 : 0.38) } };
    },
    // plot(), except a NEW chart below the fold waits and draws in when it first scrolls into view.
    // opts.after(c) runs after every real setOption (pulse dots, selection, brush cursor).
    draw(cd, key, option, opts) {
      opts = opts || {};
      if (!hasEcharts() || !cd.chart) { const c0 = plot(cd, key, option, opts); if (c0 && opts.after) opts.after(c0); return c0; }
      const c = chartFor(key, cd.chart); if (!c) return null;
      const waitable = (c.fresh || c.cleared) && FX.animated() && typeof IntersectionObserver !== 'undefined';
      // @p2 A settled section build (a re-visit, or reduced motion): a new chart below the fold renders
      // in idle time, one per idle slot, instead of inside the tab switch (cuts the switch's long task).
      // Nothing animates (the option was built settled) and nothing replays when it scrolls in (noDefer).
      if (!waitable && R.building && (c.fresh || c.cleared) && c1Below(cd.chart)) {
        cd.setEmpty(null);
        const first = !c.c1Wait;
        c.c1Wait = { option, opts: Object.assign({}, opts, { noDefer: true }) };
        if (first) c1Idle(cd.chart, () => {
          const w = c.c1Wait; c.c1Wait = null;
          if (!w || c.inst.isDisposed() || !cd.chart.isConnected) return;
          const c2 = plot(cd, key, w.option, w.opts);
          if (c2 && w.opts.after) w.opts.after(c2);
        });
        return c;
      }
      if (waitable && c1Below(cd.chart)) {
        cd.setEmpty(null);
        const first = !c.c1Wait;
        c.c1Wait = { option, opts };
        if (first) c1Watch(cd.chart, () => {
          const w = c.c1Wait; c.c1Wait = null;
          if (!w || c.inst.isDisposed() || !cd.chart.isConnected) return;
          const c2 = plot(cd, key, w.option, w.opts);
          if (c2 && w.opts.after) w.opts.after(c2);
        });
        return c;
      }
      c.c1Wait = null;
      const c2 = plot(cd, key, option, opts);
      if (c2 && opts.after) opts.after(c2);
      return c2;
    },
    // Is the card's selection the only thing selected? (re-clicking it does nothing)
    isOnly(list, members) { return list.length === members.length && members.every(m => list.includes(m)); },
    pickCats(members) { if (C1.isOnly(F.cats, members)) return; setCats(members); },
  };
  function c1Below(el) {
    const r = el.getBoundingClientRect(); const vh = window.innerHeight || document.documentElement.clientHeight || 800;
    return r.top > vh - 40 || r.bottom < 0;
  }
  // @p2 Idle queue for settled builds: one chart per idle slot (a 200 ms timeout keeps it prompt),
  // or straight away when it scrolls near the viewport first.
  const C1_IDLE = { q: [], t: 0, io: null };
  function c1IdleRun(item) {
    const i = C1_IDLE.q.indexOf(item); if (i < 0) return;
    C1_IDLE.q.splice(i, 1);
    if (C1_IDLE.io) C1_IDLE.io.unobserve(item.el);
    if (item.el.isConnected) { try { item.cb(); } catch (e) { console.error('[finance] deferred chart', e); } }
  }
  function c1IdleNext() {
    const go = dl => {
      C1_IDLE.t = 0;
      const t0 = performance.now();
      do { if (C1_IDLE.q.length) c1IdleRun(C1_IDLE.q[0]); }
      while (C1_IDLE.q.length && (dl && !dl.didTimeout ? dl.timeRemaining() > 12 : performance.now() - t0 < 8));
      if (C1_IDLE.q.length) C1_IDLE.t = c1IdleNext();
    };
    return typeof requestIdleCallback === 'function' ? requestIdleCallback(go, { timeout: 200 }) : setTimeout(() => go(null), 16);
  }
  function c1Idle(el, cb) {
    for (const x of C1_IDLE.q.slice()) if (!x.el.isConnected) { C1_IDLE.q.splice(C1_IDLE.q.indexOf(x), 1); if (C1_IDLE.io) C1_IDLE.io.unobserve(x.el); }
    const item = { el, cb };
    C1_IDLE.q.push(item);
    if (typeof IntersectionObserver !== 'undefined') {
      if (!C1_IDLE.io) C1_IDLE.io = new IntersectionObserver(es => {
        for (const en of es) if (en.isIntersecting) { const it = C1_IDLE.q.find(x => x.el === en.target); if (it) c1IdleRun(it); }
      }, { rootMargin: '0px 0px 300px 0px' });
      C1_IDLE.io.observe(el);
    }
    if (!C1_IDLE.t) C1_IDLE.t = c1IdleNext();
  }
  function c1Watch(el, cb) {
    if (!C1_WAIT.io) C1_WAIT.io = new IntersectionObserver(es => {
      for (const en of es) {
        if (!en.isIntersecting) continue;
        const f = C1_WAIT.cbs.get(en.target); C1_WAIT.io.unobserve(en.target); C1_WAIT.cbs.delete(en.target);
        if (f) f();
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    for (const k of [...C1_WAIT.cbs.keys()]) if (!k.isConnected) { C1_WAIT.io.unobserve(k); C1_WAIT.cbs.delete(k); }
    C1_WAIT.cbs.set(el, cb); C1_WAIT.io.observe(el);
  }
  // Esc clears the category picked from a chart (the chip × and the crumbs do the same).
  let c1KeyWired = false;
  function c1WireKeys() {
    if (c1KeyWired) return; c1KeyWired = true;
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || e.defaultPrevented || !R.mounted || R.mode !== 'ready' || R.drawer) return;
      if (!['spending', 'categories', 'cashflow'].includes(R.sectionId)) return;
      const tg = e.target; if (tg && (tg.closest && tg.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]'))) return;
      if (F.cats.length) { e.preventDefault(); setCats([]); }
      else if (F.amt && R.sectionId === 'spending') { e.preventDefault(); F.amt = null; changed(); }
    });
  }
  // A crumb trail for a card header: "All › Eating out ×". Clicking All (or ×) clears the selection.
  function c1Crumbs(cd, label) {
    let el = cd.tools.querySelector(':scope > .c1-crumbs');
    if (!label) { if (el) el.remove(); return; }
    if (!el) { el = h('nav', { class: 'c1-crumbs', 'aria-label': 'Selection' }); cd.tools.prepend(el); }
    el.innerHTML = '';
    el.append(h('button', { type: 'button', class: 'c1-crumb', text: 'All', title: 'Show every category (Esc)', onclick: () => setCats([]) }),
      ic('chevron-right', 'c1-crumb-sep'), h('b', { 'aria-current': 'true', text: label }),
      h('button', { type: 'button', class: 'c1-crumb-x', 'aria-label': 'Clear the selection', title: 'Clear (Esc)', onclick: () => setCats([]) }, ic('x')));
  }
