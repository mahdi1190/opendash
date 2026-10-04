  // @part 07-chart-a11y.js · NEW (3 Oct 2026) · OWNER: P2 (charts for keyboard and screen-reader users)
  // ── Chart accessibility ───────────────────────────────────────────────
  // plot() calls fxA11y(c, cd, option) after every setOption. The chart box
  // becomes a named image you can Tab to ("Spending over time: bar chart,
  // 14 points, 29 Jun to 28 Sept. Press Enter to read the numbers."). Enter or
  // Space opens a table of what the chart shows, under it, built from the
  // chart's own option (values formatted like its value axis, money in full);
  // Esc or × closes it and focus goes back to the chart. ECharts' generated
  // aria label (which reads "NaN" for gaps) is switched off in plot().
  // a11yRows(opt, fmtFor, dayLbl) is pure (tests/finance-p2.test.mjs runs it through FinanceView._p2).
  const A11Y_KIND = { line: 'line chart', bar: 'bar chart', pie: 'donut chart', scatter: 'scatter chart', sankey: 'flow diagram', gauge: 'gauge',
    treemap: 'treemap', sunburst: 'sunburst chart', heatmap: 'heatmap', boxplot: 'box plot', candlestick: 'chart', custom: 'chart' };
  const a11yArr = x => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const a11yVal = d => (d != null && typeof d === 'object' && !Array.isArray(d) ? d.value : d);
  const a11yRich = s => String(s == null ? '' : s).replace(/\{[\w-]+\|([^}]*)\}/g, '$1 ').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();   // rich text: keep the words
  // A category label as the chart shows it: an axis whose formatter draws rich text (merchant
  // tiles + the cleaned name, "{t3|}{n|Tesco}") reads as that name, not the raw bank string.
  function a11yCat(ax, v, i) {
    const f = ax && ax.axisLabel && typeof ax.axisLabel.formatter === 'function' ? ax.axisLabel.formatter : null;
    if (f) { try { const s = String(f(v, i)); if (/\{[\w-]+\|/.test(s)) { const t = a11yRich(s); if (t) return t; } } catch (e) { /* the raw label */ } }
    return String(v == null ? '' : v).trim();
  }
  const A11Y_LONG = 300 * 864e5;   // a span longer than this shows years on its dates
  // Series a reader cares about: known types, not decoration (silent bands, pulse dots, hidden 0-1 rails).
  function a11ySeries(opt) {
    const ys = a11yArr(opt.yAxis);
    return a11yArr(opt.series).filter(s => s && A11Y_KIND[s.type] && !s.silent && !(s.tooltip && s.tooltip.show === false)
      && !(s.type !== 'bar' && ys[s.yAxisIndex || 0] && ys[s.yAxisIndex || 0].show === false));
  }
  // Pure: { kind, cols, rows: [[label, ...cells]], n, first, last, ranged }.
  // fmtFor(series, axis) -> value formatter; dayLbl(ms) -> a date label.
  function a11yRows(opt, fmtFor, dayLbl) {
    opt = opt || {}; fmtFor = fmtFor || (() => v => String(v)); dayLbl = dayLbl || (t => new Date(t).toISOString().slice(0, 10));
    const out = { kind: '', cols: [], rows: [], n: 0, first: '', last: '', ranged: false };
    const series = a11ySeries(opt); if (!series.length) return out;
    const s0 = series[0];
    out.kind = s0.type === 'custom' && s0.coordinateSystem === 'calendar' ? 'calendar heatmap' : (A11Y_KIND[s0.type] || 'chart');
    const blank = v => v == null || v === '-' || v === '' || (typeof v === 'number' && !isFinite(v));
    const cell = (s, v, ax) => (blank(v) ? '—' : fmtFor(s, ax)(v));
    const isoRe = /^\d{4}-\d{2}-\d{2}/;
    const keyLbl = (x, time) => (typeof x === 'string' && isoRe.test(x) ? dayLbl(Date.parse(x.slice(0, 10) + 'T00:00:00Z')) : time && typeof x === 'number' ? dayLbl(x) : String(x));
    const keyNum = x => (typeof x === 'string' && isoRe.test(x) ? Date.parse(x.slice(0, 10) + 'T00:00:00Z') : +x);
    const done = () => { out.n = out.rows.length; out.first = out.n ? out.rows[0][0] : ''; out.last = out.n ? out.rows[out.n - 1][0] : ''; return out; };
    if (s0.type === 'pie' || s0.type === 'treemap' || s0.type === 'sunburst') {
      const top = a11yArr(s0.data); const total = top.reduce((a, d) => a + (+a11yVal(d) || 0), 0);
      const walk = (list, pre) => { for (const d of a11yArr(list)) { if (!d) continue; const v = +a11yVal(d) || 0; out.rows.push([pre + String(d.name == null ? '' : d.name), cell(s0, v), pre || !total ? '' : Math.round(v / total * 100) + '%']); if (d.children && !pre) walk(d.children, String(d.name) + ' › '); } };
      walk(top, ''); out.cols = ['', s0.name || 'Amount', 'Share']; out.kind = s0.type === 'pie' ? out.kind : out.kind;
      return done();
    }
    if (s0.type === 'sankey') {
      const lf = s0.label && typeof s0.label.formatter === 'function' ? s0.label.formatter : null;
      const nm = n => { if (!lf) return String(n); try { const t = a11yRich(lf({ name: n, value: '', data: { name: n } })).replace(/\s*[^\s]*\d[\d,.]*[^\s]*\s*$/, '').trim(); return t || String(n); } catch (e) { return String(n); } };
      for (const l of a11yArr(s0.links || s0.edges)) out.rows.push([`${nm(l.source)} → ${nm(l.target)}`, cell(s0, l.value)]);
      out.cols = ['Flow', 'Amount'];
      return done();
    }
    if (s0.type === 'gauge') {
      const df = s0.detail && typeof s0.detail.formatter === 'function' ? s0.detail.formatter : null;
      for (const d of a11yArr(s0.data)) { const v = a11yVal(d); let t = ''; try { t = df ? a11yRich(df(v)) : ''; } catch (e) { t = ''; } out.rows.push([String(s0.name || 'Value'), blank(v) ? '—' : t || String(Math.round(v * 10) / 10)]); }
      out.cols = ['', 'Value'];
      return done();
    }
    const xs = a11yArr(opt.xAxis), ys = a11yArr(opt.yAxis);
    if (s0.type === 'scatter') {
      // one row per named point: its x and y, each formatted like its axis
      const xa = xs[s0.xAxisIndex || 0] || {}, ya = ys[s0.yAxisIndex || 0] || {};
      // @p2 dates on a time axis come out in date order (a charge history lists merchant by merchant),
      // with the year when the points span most of a year or more
      const pts = [];
      for (const s of series.filter(x => x.type === 'scatter')) for (const d of a11yArr(s.data)) {
        const v = a11yVal(d); const p = Array.isArray(v) ? v : Array.isArray(d) ? d : null; if (!p) continue;
        // the amount: a third value, or the point's own amt / amount (a charge sized by its amount)
        const amt = typeof p[2] === 'number' && isFinite(p[2]) ? p[2] : d && typeof d === 'object' && !Array.isArray(d) ? [d.amt, d.amount].find(x => typeof x === 'number' && isFinite(x)) : undefined;
        pts.push({ s, d, p, amt, named: !!(d && d.name != null && d.name !== '') });
      }
      const timeX = xa.type === 'time';
      if (timeX) pts.sort((a, b) => keyNum(a.p[0]) - keyNum(b.p[0]));
      const ks = timeX ? pts.map(x => keyNum(x.p[0])).filter(isFinite) : [];
      const yr = ks.length > 1 && ks[ks.length - 1] - ks[0] > A11Y_LONG;
      const axCell = (s, v, ax) => (blank(v) ? '—' : ax.type === 'category' ? a11yCat(ax, typeof v === 'number' && Array.isArray(ax.data) && ax.data[v] != null ? a11yVal(ax.data[v]) : v, typeof v === 'number' ? v : Array.isArray(ax.data) ? ax.data.indexOf(v) : 0)
        : ax.type === 'time' ? (typeof v === 'string' && isoRe.test(v) ? dayLbl(keyNum(v), yr) : dayLbl(+v, yr)) : cell(s, v, ax));
      const third = pts.some(x => x.amt != null);
      for (const x of pts) {
        const row = [x.named ? String(x.d.name) : axCell(x.s, x.p[0], xa), ...(x.named ? [axCell(x.s, x.p[0], xa)] : []), axCell(x.s, x.p[1], ya)];
        if (x.d && x.d.exp === true) row[0] += ' (expected)';
        if (third) row.push(x.amt == null ? '—' : cell(x.s, x.amt));
        out.rows.push(row);
      }
      const named0 = pts.length && pts[0].named;
      out.cols = named0 ? ['', xa.name || 'Across', ya.name || 'Up'] : [timeX ? 'Date' : (xa.name || 'Across'), ya.type === 'category' ? '' : (ya.name || 'Up')];
      if (third) out.cols.push('Amount');
      out.ranged = timeX && !named0;
      return done();
    }
    // Cartesian: one row per category (or time point), one column per series on the same axis.
    const horiz = ys[s0.yAxisIndex || 0] && ys[s0.yAxisIndex || 0].type === 'category' && !(xs[s0.xAxisIndex || 0] && xs[s0.xAxisIndex || 0].type === 'category');
    const catAx = s => (horiz ? ys[s.yAxisIndex || 0] : xs[s.xAxisIndex || 0]) || {};
    const valAx = s => (horiz ? xs[s.xAxisIndex || 0] : ys[s.yAxisIndex || 0]) || {};
    const ax0 = catAx(s0);
    if (ax0.type === 'category' && Array.isArray(ax0.data)) {
      const labels = ax0.data.map((d, i) => { const raw = d && typeof d === 'object' ? d.value : d; const c = a11yCat(ax0, raw, i); return c !== String(raw == null ? '' : raw).trim() ? c : keyLbl(raw, false); });
      const cols = series.filter(s => { const a = catAx(s); return a === ax0 || (a.type === 'category' && Array.isArray(a.data) && a.data.length === labels.length); });
      out.cols = [''].concat(cols.map(s => s.name || 'Amount'));
      labels.forEach((lb, i) => {
        const cells = cols.map(s => { let v = a11yVal(a11yArr(s.data)[i]); if (Array.isArray(v)) v = v[horiz ? 0 : 1]; return cell(s, v, valAx(s)); });
        if (cells.every(x => x === '—')) return;
        out.rows.push([lb].concat(cells));
      });
      out.ranged = !horiz && labels.length > 1 && /\d|^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(labels[0]);
      return done();
    }
    // time or value axis (or a calendar): [x, y] pairs, rows keyed by x
    const time = ax0.type === 'time' || out.kind === 'calendar heatmap';
    const map = new Map(); const cols = series.filter(s => (catAx(s).type || '') === (ax0.type || ''));
    cols.forEach((s, k) => { for (const d of a11yArr(s.data)) { const v = a11yVal(d); const p = Array.isArray(v) ? v : Array.isArray(d) ? d : null; if (!p) continue; const key = keyNum(p[0]); if (!isFinite(key)) continue; if (!map.has(key)) map.set(key, { x: p[0], cells: new Array(cols.length).fill('—') }); map.get(key).cells[k] = cell(s, p[1], valAx(s)); } });
    out.cols = [''].concat(cols.map(s => s.name || 'Amount'));
    const ents = [...map.entries()].sort((a, b) => a[0] - b[0]);
    const yr = time && ents.length > 1 && ents[ents.length - 1][0] - ents[0][0] > A11Y_LONG;
    for (const [k, r] of ents) out.rows.push([time && yr ? dayLbl(k, true) : keyLbl(r.x, time)].concat(r.cells));
    out.ranged = time && out.rows.length > 1;
    return done();
  }
  // A value looks like its axis (the axis' own % / count format), else money in full.
  function a11yFmt() {
    return (s, ax) => {
      const f = ax && ax.axisLabel && typeof ax.axisLabel.formatter === 'function' ? ax.axisLabel.formatter : null;
      let probe = ''; try { probe = f ? String(f(1234, 0)) : ''; } catch (e) { probe = ''; }
      if (f && probe.indexOf(SYM) < 0 && /\d/.test(probe)) return v => { try { return a11yRich(f(+v, 0)); } catch (e) { return String(v); } };
      if (ax && ax.type === 'log' && !f) return v => nf1.format(+v);
      return v => gbp(+v);
    };
  }
  const a11yDay = (ms, yr) => (yr ? fDayY : fDay)(Math.round(ms / DAY_MS));
  function a11yTitle(cd) { const h3 = cd && cd.el && cd.el.querySelector('h3'); return h3 ? h3.textContent.trim() : 'Chart'; }
  function a11yLabel(cd, info) {
    const many = info.n > 1;
    const unit = /donut|treemap|sunburst/.test(info.kind) ? 'parts' : info.kind === 'flow diagram' ? 'flows' : info.kind === 'gauge' ? '' : 'points';
    const span = many && unit ? `, ${info.n} ${unit}` + (info.ranged && info.first !== info.last ? `, ${info.first} to ${info.last}` : '') : '';
    return `${a11yTitle(cd)}: ${info.kind || 'chart'}${span}. Press Enter to read the numbers.`;
  }
  function fxA11y(c, cd, option) {
    const el = cd && cd.chart; if (!el || !c) return;
    let info;
    try { info = a11yRows(option || {}, a11yFmt(), a11yDay); } catch (e) { info = { kind: 'chart', n: 0 }; }
    const label = a11yLabel(cd, info);
    if (el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label);
    if (el.getAttribute('role') !== 'img') el.setAttribute('role', 'img');
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    if (!el._fvA11y) {
      el._fvA11y = true;
      el.addEventListener('keydown', e => {
        if (e.target !== el) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a11yToggle(el, cd); }
        else if (e.key === 'Escape' && el._fvTbl && !el._fvTbl.hidden) { e.preventDefault(); e.stopPropagation(); a11yClose(el); }
      });
    }
    if (el._fvTbl && !el._fvTbl.hidden) a11yFill(el, cd);
  }
  function a11yToggle(el, cd) {
    if (el._fvTbl && !el._fvTbl.hidden) { a11yClose(el); return; }
    if (!el._fvTbl || !el._fvTbl.isConnected) {
      const x = h('button', { type: 'button', class: 'fv-a11y-x', 'aria-label': 'Close the table' }, ic('x'));
      const box = h('div', { class: 'fv-a11y-tbl', role: 'region', tabindex: '-1' }, h('header', null, h('span', { class: 'fv-a11y-t' }), x), h('div', { class: 'fv-a11y-b' }));
      x.addEventListener('click', () => a11yClose(el));
      box.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); a11yClose(el); } });
      el.insertAdjacentElement('afterend', box);
      el._fvTbl = box;
    }
    el._fvTbl.hidden = false; el.setAttribute('aria-expanded', 'true');
    a11yFill(el, cd);
    el._fvTbl.focus({ preventScroll: true });
    try { el._fvTbl.scrollIntoView({ block: 'nearest', behavior: R.reduced ? 'auto' : 'smooth' }); } catch (e) { /* old browser */ }
  }
  function a11yClose(el) { if (el._fvTbl) el._fvTbl.hidden = true; el.setAttribute('aria-expanded', 'false'); el.focus({ preventScroll: true }); }
  function a11yFill(el, cd) {
    const box = el._fvTbl; if (!box) return;
    const c = [...R.charts.values()].find(x => x.el === el);
    // c.a11yOption(): a chart whose picture is a moment (the leaderboard race) gives the numbers to read instead
    let opt = null; try { opt = c && !c.inst.isDisposed() ? (typeof c.a11yOption === 'function' ? c.a11yOption() : c.inst.getOption()) : null; } catch (e) { opt = null; }
    let info = null; try { info = opt ? a11yRows(opt, a11yFmt(), a11yDay) : null; } catch (e) { info = null; }
    const title = a11yTitle(cd);
    box.setAttribute('aria-label', `${title}: the numbers`);
    box.querySelector('.fv-a11y-t').textContent = `${title} · ${info && info.n ? info.n + ' row' + (info.n === 1 ? '' : 's') : 'no data'}`;
    const b = box.querySelector('.fv-a11y-b'); b.innerHTML = '';
    if (!info || !info.n) { b.append(h('p', { class: 'fv-empty', text: 'Nothing to show for this range.' })); return; }
    const head = h('tr', null, info.cols.map(t => h('th', { scope: 'col', text: t })));
    const body = h('tbody', null, info.rows.slice(0, 1000).map(r => h('tr', null, r.map((v, i) => (i === 0 ? h('th', { scope: 'row', text: v }) : h('td', { text: v }))))));
    b.append(h('table', null, h('caption', { class: 'sr-only', text: title }), h('thead', null, head), body));
  }
