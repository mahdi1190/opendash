  // @part 32-categories.js · OWNER: C1 (Categories section: where it went, trends, small multiples, treemap, focus, table, needs a category)
  // ----- Categories -----
  const ctView = () => (['donut', 'bar', 'sun'].includes(F.ctView) ? F.ctView : (F.catMode === 'bar' ? 'bar' : 'donut'));
  BUILD.categories = g => {
    S.cats = card(g, { title: 'Where it went', span: 7, md: 12, chart: true, height: 272, cls: 'fv-cats c1-where' });
    S.catSeg = seg([['donut', 'Donut'], ['bar', 'Ranked'], ['sun', 'Sunburst', 'Categories with their biggest merchants']], ctView(), v => { F.ctView = v; saveF(); S.catSeg.set(v); catWhere(R.ctx); }, 'Chart type');
    S.cats.tools.append(S.catSeg.el);
    S.catCentre = h('div', { class: 'c1-dcenter', 'aria-hidden': 'true' }, h('span', { class: 'c1-dc-t' }, h('span', { class: 'c1-dc-i' }), h('span', { class: 'c1-dc-n' })), h('b', { class: 'c1-dc-v num' }), h('span', { class: 'c1-dc-s' }));
    S.catList = h('div', { class: 'fv-legend c1-cl' });
    const box = h('div', { class: 'c1-where-chart' }, S.cats.chart, S.catCentre);
    S.cats.body.prepend(h('div', { class: 'c1-where-wrap' }, box, S.catList));
    S.area = card(g, { title: 'Category trends', span: 5, md: 12, chart: true, height: 300, fill: true });
    S.areaSeg = seg([['abs', SYM], ['pct', '%']], F.stackMode, v => { F.stackMode = v; saveF(); S.areaSeg.set(v); stackedArea(S.area, R.ctx); }, 'Scale');
    S.area.tools.append(S.areaSeg.el);
    S.multi = card(g, { title: 'Each category over time', span: 12, cls: 'c1-multi-card' });
    S.multiGrid = h('div', { class: 'c1-multi' }); S.multi.body.prepend(S.multiGrid);
    S.tree = card(g, { title: 'Categories and their merchants', span: 12, chart: true, height: 380, cls: 'c1-tree-card' });
    S.focus = card(g, { title: 'Category', span: 5, md: 12, cls: 'c1-focus' });
    S.focus.el.hidden = true;
    S.table = card(g, { title: 'Category details', span: 12 });
    S.uncat = card(g, { title: 'Needs a category', span: 12 });
    c1WireKeys();
  };
  UPDATE.categories = ctx => {
    catWhere(ctx);
    stackedArea(S.area, ctx);
    catMultiples(S.multi, ctx);
    treemap(S.tree, ctx);
    catFocus(S.focus, ctx);
    catTable(S.table, ctx);
    uncatList(S.uncat, ctx);
  };
  function catWhere(ctx) {
    catBreakdown(S.cats, ctx, 's:ct-cats', S.catList, { mode: ctView(), centre: S.catCentre, aligned: true });
    S.cats.el.classList.toggle('c1-mode-bar', ctView() === 'bar');
    const it = (R.charts.get('s:ct-cats') || {}).c1Items || [];
    const sel = it.filter(x => x.members.some(m => F.cats.includes(m)));
    c1Crumbs(S.cats, sel.length === 1 ? sel[0].name : sel.length > 1 ? `${sel.length} categories` : null);
  }
  // The folded categories (the 7 named slots, Uncategorised, Everything else) of the rows, and their members.
  function c1Folded(rows) {
    const items = foldCats(rowsTotals(rows));
    const memberOf = {}; items.forEach(it => it.members.forEach(m => { memberOf[m] = it.name; }));
    return { items, memberOf };
  }
  function rowsTotals(rows) { const o = {}; rows.forEach(x => { o[x.c] = (o[x.c] || 0) + x.s; }); return o; }
  function catTable(cd, ctx) {
    const rows = ctx.spendNoCat(); const prevRows = ctx.hasPrev ? ctx.spendNoCatPrev() : [];
    const cur = {}, cnt = {}, prv = {};
    rows.forEach(x => { cur[x.c] = (cur[x.c] || 0) + x.s; if (x.s > 0) cnt[x.c] = (cnt[x.c] || 0) + 1; });
    prevRows.forEach(x => { prv[x.c] = (prv[x.c] || 0) + x.s; });
    const cats = [...new Set([...Object.keys(cur), ...Object.keys(prv)])].filter(c => (cur[c] || 0) > 0.004 || (prv[c] || 0) > 0.004).sort((p, q) => (cur[q] || 0) - (cur[p] || 0));
    const total = sum(Object.values(cur));
    cd.body.querySelectorAll('.fv-tablewrap').forEach(x => x.remove());
    if (!cats.length) { cd.setEmpty('No spending in this range.'); return; }
    cd.setEmpty(null);
    cd.setSub(ctx.hasPrev ? 'Compared with the previous period of the same length · click a row to focus on it' : 'No earlier data to compare with');
    const max = Math.max(...cats.map(c => Math.max(cur[c] || 0, prv[c] || 0)), 1);
    const bud = R.budgets || {}; const scale = ctx.rg.len / 30.44;
    const only = F.cats.length === 1 ? F.cats[0] : null;
    const tbl = h('table', { class: 'fv-table c1-table' },
      // The "vs prev" column only appears when there is a previous period;
      // a column of dashes is noise.
      h('thead', null, h('tr', null, h('th', { text: 'Category' }), h('th', { class: 'r', text: 'Spent' }), h('th', { class: 'r', text: 'Share' }), ctx.hasPrev ? h('th', { class: 'r', text: 'vs prev' }) : null, h('th', { class: 'r', text: 'Payments' }), h('th', { class: 'r', text: 'Average' }), h('th', { class: 'bar', text: '' }))),
      h('tbody', null, cats.map(c => {
        const v = cur[c] || 0, p = prv[c] || 0, d = v - p;
        const b = bud[c] ? bud[c] * scale : null;
        const isCur = only === c;
        return h('tr', { class: 'click fsym-host' + (F.cats.length && !F.cats.includes(c) ? ' dim' : ''), 'aria-current': isCur ? 'true' : null, onclick: () => C1.pickCats([c]), title: isCur ? 'Selected (Esc to clear)' : 'Click to focus on this category' },
          h('td', null, h('span', { class: 'fv-cell-cat' }, C1.catIconEl(c, { size: 'xs' }), c)),
          h('td', { class: 'r num', text: gbp(v) }), h('td', { class: 'r num mute', text: pct(v / Math.max(1, total)) }),
          ctx.hasPrev ? h('td', { class: 'r num' }, h('span', { class: 'fv-delta ' + (Math.abs(d) < 1 ? 'flat' : d > 0 ? 'bad' : 'good'), text: p > 0.5 ? `${d >= 0 ? '+' : '−'}${Math.abs(d / p * 100).toFixed(0)}%` : (v > 0 ? 'new' : '—') })) : null,
          h('td', { class: 'r num', text: nf0.format(cnt[c] || 0) }), h('td', { class: 'r num mute', text: cnt[c] ? gbp2(v / cnt[c]) : '—' }),
          h('td', { class: 'bar' }, h('div', { class: 'fv-mbar' }, h('i', { style: { width: (Math.max(0, v) / max * 100).toFixed(1) + '%', background: catColor(c) } }), ctx.hasPrev ? h('u', { style: { left: (Math.max(0, p) / max * 100).toFixed(1) + '%' }, title: 'Previous period' }) : null, b ? h('s', { style: { left: Math.min(100, b / max * 100).toFixed(1) + '%' }, title: 'Budget for this range' }) : null)));
      })));
    cd.body.append(h('div', { class: 'fv-tablewrap' }, tbl, h('div', { class: 'fv-table-key' }, ctx.hasPrev ? h('span', null, h('u'), ' previous period') : null, Object.keys(bud).length ? h('span', null, h('s'), ' budget, scaled to the range') : null)));
  }
  // Stacked bars (were smoothed areas until @p1) with surface-coloured seams. The selected category stays lit and the
  // others fade back (rather than vanish), so its share of the whole stays readable.
  function stackedArea(cd, ctx) {
    const t = tk(); const B = ctx.buckets, ix = ctx.ix;
    const rows = ctx.spendNoCat();
    const { items, memberOf } = c1Folded(rows);
    if (!items.length) { cd.setEmpty('No spending in this range.'); return; }
    const data = {}; items.forEach(it => { data[it.name] = new Array(B.length).fill(0); });
    rows.forEach(x => { const s = memberOf[x.c]; const i = ix(x.n); if (s && i >= 0 && i < B.length) data[s][i] += x.s; });
    const totals = B.map((_, i) => sum(items, it => Math.max(0, data[it.name][i])));
    const pctMode = F.stackMode === 'pct';
    const sel = F.cats; const isSel = it => sel.length > 0 && it.members.some(m => sel.includes(m));
    const anySel = sel.length > 0;
    cd.setSub((pctMode ? 'Share of each period’s spending' : `Per ${F.gran}, stacked`) + (anySel ? ' · the selection stays lit' : ''));
    // @p1: stacked BARS, not smoothed areas. Spending lands in whole periods; a smoothed stack drew a
    // rent week as a mountain with fake slopes either side. The legend wraps (no "◀ 1/3 ▶" pager);
    // the plot starts below however many rows it takes.
    const cw0 = Math.max(240, (cd.chart.clientWidth || 460) - 8);
    let rowsL = 1, x0 = 0;
    for (const it of items) { const wI = 10 + 5 + String(it.name).length * 6.1 + 12; if (x0 + wI > cw0 && x0 > 0) { rowsL++; x0 = 0; } x0 += wI; }
    const barW = B.length <= 8 ? 26 : B.length <= 20 ? 16 : B.length <= 40 ? 9 : 5;
    const option = base({
      grid: { left: 2, right: 10, top: 18 + rowsL * 20 + 10, bottom: 34, containLabel: true },
      legend: { top: 0, left: 0, right: 0, type: 'plain', icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 12, textStyle: { color: t.muted, fontSize: 11, fontFamily: FONT } },
      tooltip: C1.tooltip({ trigger: 'axis', pointer: 'shadow', formatter: ps => {
        const i = ps[0].dataIndex; if (!B[i]) return '';
        const rs = items.map(it => ({ it, v: data[it.name][i] })).filter(r => r.v > 0.004).sort((p, q) => q.v - p.v)
          .map(r => ({ c: r.it.color, key: 'bx', v: gbp2(r.v), k: `${r.it.name} · ${pct(r.v / Math.max(0.01, totals[i]))}`, muted: anySel && !isSel(r.it) }));
        return C1.tip(B[i].long, rs.length ? rs : [{ key: 'none', v: gbp(0), k: 'no spending', muted: true }], { sub: gbp(totals[i]) });
      } }),
      xAxis: C1.xCat(B.map(b => b.label), { pill: true, line: true }),
      yAxis: C1.yOut(pctMode ? { ticks: 3, extra: { max: 100 }, fmt: v => v + '%' } : { ticks: 3 }),   // bars: labels outside, as every bar chart
      dataZoom: [{ type: 'inside', zoomOnMouseWheel: 'ctrl', moveOnMouseMove: true, moveOnMouseWheel: false, start: 0, end: 100 }, C1.zoom({ start: 0, end: 100 })],
      series: items.map((it, k) => {
        const lit = !anySel || isSel(it);
        const s = FX.bars({ id: 'c:' + it.name, name: it.name, stack: 'all', color: it.color, radius: k === items.length - 1 ? [3, 3, 0, 0] : 0, width: barW, catGap: '30%', lift: false,
          data: data[it.name].map((v, i) => pctMode ? (totals[i] > 0 ? round2(Math.max(0, v) / totals[i] * 100) : 0) : round2(Math.max(0, v))) });
        // A hairline seam in the card colour between segments; the selection stays lit, the rest fade back.
        s.itemStyle = Object.assign({}, s.itemStyle, { opacity: lit ? 1 : 0.2, borderColor: t.card, borderWidth: B.length <= 40 ? 0.75 : 0 });
        s.emphasis = { focus: 'series' }; s.blur = { itemStyle: { opacity: 0.22 } }; s.z = lit ? 3 : 2;
        return s;
      }),
    });
    const c = C1.draw(cd, 's:ct-area', option);
    on(c, 'click', p => { const it = items.find(x => x.name === p.seriesName); if (it) C1.pickCats(it.members); });
  }
  // NEW: small multiples, one tile per category with its own trend over the range.
  function catMultiples(cd, ctx) {
    const t = tk(); const B = ctx.buckets, ix = ctx.ix;
    const rows = ctx.spendNoCat();
    const { items, memberOf } = c1Folded(rows);
    const grid = S.multiGrid;
    if (!items.length) { grid.innerHTML = ''; cd.setEmpty('No spending in this range.'); return; }
    cd.setEmpty(null);
    const series = C1.bucketSeries(rows, B, ix, x => memberOf[x.c]);
    const prevT = ctx.hasPrev ? rowsTotals(ctx.spendNoCatPrev()) : null;
    const gl = { day: 'day', week: 'week', month: 'month' }[F.gran];
    cd.setSub(`Spending per ${gl}, each on its own scale${ctx.hasPrev ? ' · change on the previous period' : ''} · click one to focus on it`);
    const sel = F.cats; const anySel = sel.length > 0;
    // The tiles rise and their lines draw in once, on the first render; never on later updates.
    const play = MK.once(cd.el, 'multi') && !MK.reduced();
    grid.classList.toggle('c1-play', play);
    if (play) setTimeout(() => grid.classList.remove('c1-play'), 2600);
    const keep = S.multiTiles || (S.multiTiles = new Map());
    const seen = new Set();
    items.forEach((it, i) => {
      seen.add(it.name);
      let tl = keep.get(it.name);
      if (!tl) {
        const val = h('b', { class: 'c1-mt-v num' }); const dl = h('span', { class: 'c1-mt-d' }); const sp = h('div', { class: 'c1-mt-sp' }); const ft = h('span', { class: 'c1-mt-f' });
        const el = h('button', { type: 'button', class: 'c1-mt fsym-host', onclick: () => C1.pickCats(it.members) },
          h('span', { class: 'c1-mt-h' }, C1.catIconEl(it.name, { size: 'sm' }), h('span', { class: 'c1-mt-n', text: it.name }), dl), val, sp, ft);
        tl = { el, val, dl, sp, ft }; keep.set(it.name, tl);
      }
      tl.el.onclick = () => C1.pickCats(it.members);
      const lit = anySel && it.members.some(m => sel.includes(m));
      tl.el.classList.toggle('dim', anySel && !lit);
      if (lit && C1.isOnly(sel, it.members)) tl.el.setAttribute('aria-current', 'true'); else tl.el.removeAttribute('aria-current');
      tl.el.style.setProperty('--i', i);
      MK.tick(tl.val, it.value, v => gbp(v));
      const vals = series.get(it.name) || new Array(B.length).fill(0);
      const pv = prevT ? sum(it.members, m => prevT[m] || 0) : null;
      tl.dl.className = 'c1-mt-d';
      if (pv != null && pv > 0.5) { const d = (it.value - pv) / pv; tl.dl.textContent = `${d >= 0 ? '+' : '−'}${Math.abs(d * 100).toFixed(0)}%`; tl.dl.classList.add(Math.abs(d) < 0.03 ? 'flat' : d > 0 ? 'up' : 'down'); tl.dl.title = `${gbp(pv)} in the previous period`; }
      else { tl.dl.textContent = pv != null && it.value > 0 ? 'new' : ''; tl.dl.removeAttribute('title'); }
      const sig = vals.join(',') + '|' + it.color;
      if (tl.sig !== sig) { tl.sig = sig; tl.sp.innerHTML = C1.spark(vals, { color: it.color, h: 40 }); }
      const peak = vals.indexOf(Math.max(...vals));
      tl.ft.textContent = B.length > 1 && vals[peak] > 0 ? `Peak ${gbp(vals[peak])} · ${B[peak].label}` : `${gbp(it.value)} in total`;
    });
    for (const [k, tl] of keep) if (!seen.has(k)) { tl.el.remove(); keep.delete(k); }
    // Ordered by spend. Only move tiles when the order changed: moving a node restarts its CSS animations.
    const want = items.map(it => keep.get(it.name).el);
    if (want.some((el, i) => grid.children[i] !== el)) want.forEach(el => grid.append(el));
    const S2 = C1.sym(); if (S2 && S2.activate) S2.activate(grid, { max: 6 });
    void t;
  }
  // Treemap: categories framed in their colour with a header strip, merchants inside (biggest
  // darkest). With one category selected it shows that category's merchants only.
  function treemap(cd, ctx) {
    const t = tk(); const S2 = C1.sym();
    const ink = col => (S2 && S2.inkFor ? S2.inkFor(col) : inkOn(col));
    const rows = ctx.cur.spend.filter(x => x.s > 0);
    const byCat = new Map();
    rows.forEach(x => { if (!byCat.has(x.c)) byCat.set(x.c, new Map()); const m = byCat.get(x.c); m.set(x.m, (m.get(x.m) || 0) + x.s); });
    const h3 = cd.el.querySelector('h3');
    if (!byCat.size) { cd.setEmpty('No spending in this range.'); c1Crumbs(cd, null); return; }
    const one = byCat.size === 1 && F.cats.length > 0 ? [...byCat.keys()][0] : null;
    h3.textContent = one ? `Inside ${one}` : 'Categories and their merchants';
    c1Crumbs(cd, one || (F.cats.length > 1 ? `${F.cats.length} categories` : null));
    const merchantsOf = (c, mm, max) => {
      const col = catColor(c);
      const ms = [...mm.entries()].sort((p, q) => q[1] - p[1]);
      const kids = ms.slice(0, max).map(([m, v], j) => { const cc = C1.mix(col, /^#[0-9a-f]{6}$/i.test(t.card) ? t.card : (t.dark ? '#18181c' : '#ffffff'), Math.max(0.5, 1 - j * 0.08)); return { name: m, value: round2(v), merchant: true, itemStyle: { color: cc }, label: { color: ink(cc) } }; });
      const rest = sum(ms.slice(max), e => e[1]);
      if (rest > 0) { const cc = C1.mix(col, /^#[0-9a-f]{6}$/i.test(t.card) ? t.card : '#ffffff', 0.42); kids.push({ name: `${ms.length - max} more merchants`, value: round2(rest), more: true, itemStyle: { color: cc }, label: { color: ink(cc) } }); }
      return kids;
    };
    const data = one ? merchantsOf(one, byCat.get(one), 30)
      : [...byCat.entries()].map(([c, mm]) => { const col = catColor(c); return { id: 'cat:' + c, name: c, value: round2(sum([...mm.values()])), itemStyle: { color: col, borderColor: col }, upperLabel: { color: ink(col) }, children: merchantsOf(c, mm, 18) }; }).sort((p, q) => q.value - p.value);
    const total = sum(rows, x => x.s);
    // @p1: a tile under about 1.3% of the whole (more on a narrow card) is too small for "Name £n";
    // it showed stubs like "Su" or "The". Those tiles go unlabelled (the tooltip names them).
    const lblMin = clamp(0.013 * 1100 / Math.max(320, cd.chart.clientWidth || 1100), 0.006, 0.05);
    cd.setSub(one ? `${nf0.format(byCat.get(one).size)} merchants · sized by spend · click one to open it`
      : `${gbp(total)} · ${byCat.size} categories · ${nf0.format(new Set(rows.map(x => x.m)).size)} merchants · click a category to focus on it`);
    const option = base({
      tooltip: C1.tooltip({ trigger: 'item', formatter: p => {
        const path = (p.treePathInfo || []).slice(1).map(x => x.name);
        const v = p.value; const isM = p.data && (p.data.merchant || p.data.more);
        return C1.tip(path.length ? path[path.length - 1] : 'All spending', [{ c: p.color, key: 'bx', v: gbp2(v), k: `${pct(v / Math.max(1, total), 1)} of ${one ? one : 'spending'}` }, path.length > 1 ? { key: 'none', v: path[0], k: '', muted: true } : null],
          { foot: p.data && p.data.merchant ? 'Click to open this merchant' : !isM && !one ? 'Click to focus on this category' : '' });
      } }),
      series: [{
        id: 'tree', type: 'treemap', roam: false, nodeClick: false, top: 0, left: 0, right: 0, bottom: 0, squareRatio: 0.62, breadcrumb: { show: false },
        visibleMin: 300, leafDepth: one ? 1 : 2,
        // Tiny tiles get no label rather than a truncated stub like "Su".
        label: { show: true, position: 'insideTopLeft', padding: [6, 8], fontSize: 11.5, fontWeight: 600, fontFamily: FONT, overflow: 'truncate', lineHeight: 15,
          formatter: p => (p.value / Math.max(1, total) < lblMin ? '' : `${p.name}\n{v|${gbpShort(p.value)}}`), rich: { v: { fontSize: 11, fontWeight: 500, opacity: 0.85, padding: [2, 0, 0, 0] } } },
        upperLabel: { show: !one, height: 24, fontSize: 11.5, fontWeight: 650, fontFamily: FONT, color: '#fff', formatter: p => (p.value / Math.max(1, total) < Math.max(0.01, lblMin * 0.7) ? '' : `${p.name}  ${gbpShort(p.value)}`) },
        itemStyle: { borderColor: t.card, gapWidth: 2, borderWidth: 0, borderRadius: 6 },
        levels: one ? [{ itemStyle: { borderWidth: 0, gapWidth: 3 } }, { itemStyle: { borderWidth: 0, gapWidth: 2, borderRadius: 6 } }]
          : [{ itemStyle: { borderWidth: 0, gapWidth: 4 }, upperLabel: { show: false } }, { itemStyle: { borderWidth: 3, gapWidth: 2, borderRadius: 8 }, upperLabel: { show: true } }, { itemStyle: { borderWidth: 0, gapWidth: 0, borderRadius: 4 } }],
        animation: FX.animated(), animationDuration: 800, animationEasing: 'cubicOut', animationDurationUpdate: 560, animationEasingUpdate: 'cubicInOut',
        data,
      }],
    });
    const prevC = R.charts.get('s:ct-tree');
    const shape = one ? 'one' : 'all';
    const c = C1.draw(cd, 's:ct-tree', option, { notMerge: !!(prevC && prevC.c1Shape && prevC.c1Shape !== shape), after: c0 => { c0.c1Shape = shape; } });
    on(c, 'click', p => {
      if (!p.data || p.componentType !== 'series') return;
      if (p.data.merchant) { openMerchant(p.name); return; }
      if (p.data.more) return;
      const depth = (p.treePathInfo || []).length;
      if (!one && depth >= 2) { const cat = p.treePathInfo[1].name; if (cat) C1.pickCats([cat]); }
    });
  }
  // With one category selected: what it adds up to, how often, and where.
  function catFocus(cd, ctx) {
    const sel = F.cats;
    const one = sel.length === 1 ? sel[0] : null;
    const was = !cd.el.hidden;
    cd.el.hidden = !one;
    S.tree.el.style.setProperty('--span', one ? 7 : 12);
    if (!one) return;
    if (!was && !MK.reduced() && typeof cd.el.animate === 'function') cd.el.animate([{ opacity: 0, transform: 'translate3d(12px,0,0)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    const rows = ctx.cur.spend.filter(x => x.c === one);
    const prevRows = ctx.hasPrev ? ctx.prv.spend.filter(x => x.c === one) : null;
    const spent = sum(rows, x => x.s), visits = rows.filter(x => x.s > 0).length;
    const prev = prevRows ? sum(prevRows, x => x.s) : null;
    cd.el.querySelector('h3').textContent = one;
    cd.setSub(`${fRange(ctx.rg.from, ctx.rg.to)}`);
    cd.body.querySelectorAll('.c1-focus-b').forEach(x => x.remove());
    if (!rows.length) { cd.setEmpty('No spending in this category in this range.'); return; }
    cd.setEmpty(null);
    const weeks = Math.max(1, ctx.days / 7);
    const kv = (label, val, fmt, sub) => { const b = h('b', { class: 'num' }); MK.tick(b, val, fmt); return h('div', { class: 'c1-kv' }, h('span', { class: 'l', text: label }), b, sub); };
    const d = prev != null ? spent - prev : null;
    const by = new Map(); rows.forEach(x => { const a = by.get(x.m) || { m: x.m, n: 0, s: 0 }; a.n += x.s > 0 ? 1 : 0; a.s += x.s; by.set(x.m, a); });
    const top = [...by.values()].filter(a => a.s > 0.004).sort((p, q) => q.s - p.s).slice(0, 6); const mx = top.length ? top[0].s : 1;
    const play = MK.once(cd.el, 'focus:' + one) && !MK.reduced();
    cd.body.append(h('div', { class: 'c1-focus-b' },
      h('div', { class: 'c1-kvs' },
        kv('Spent', spent, v => gbp(v), d != null ? h('span', { class: 'c1-kv-s ' + (Math.abs(d) < 1 ? 'flat' : d > 0 ? 'up' : 'down'), text: `${d > 0 ? '+' : d < 0 ? '−' : ''}${gbp(Math.abs(d))} vs previous` }) : null),
        kv('Payments', visits, v => nf0.format(Math.round(v)), h('span', { class: 'c1-kv-s', text: `${nf1.format(visits / weeks)} a week` })),
        kv('Average', visits ? spent / visits : 0, v => gbp2(v), h('span', { class: 'c1-kv-s', text: 'per payment' }))),
      h('ul', { class: 'c1-focus-list' + (play ? ' c1-play' : '') }, top.map((a, i) => h('li', { style: { '--i': i } }, h('button', { type: 'button', class: 'c1-fl-row fsym-host', 'aria-current': F.merchant === a.m ? 'true' : null, onclick: () => openMerchant(a.m) },
        C1.tileEl(a.m, one, 'sm'), h('span', { class: 'c1-fl-n' }, h('span', { text: a.m }), h('small', { text: ` · ${a.n} payment${a.n === 1 ? '' : 's'}` })),
        h('span', { class: 'c1-fl-bar' }, h('i', { style: { transform: `scaleX(${(a.s / mx).toFixed(4)})`, background: catColor(one) } })),
        h('span', { class: 'c1-fl-v num', text: gbp(a.s) })))))));
  }
  function uncatList(cd, ctx) {
    const M = ctx.M;
    const agg = new Map();
    M.tx.forEach(x => { if (x.kind === 'spend' && x.c === 'Uncategorised') { const a = agg.get(x.m) || { m: x.m, total: 0, count: 0, last: x.n, how: x.how }; a.total += x.s; a.count++; a.last = Math.max(a.last, x.n); agg.set(x.m, a); } });
    const list = [...agg.values()].sort((p, q) => q.total - p.total);
    cd.body.querySelectorAll('.fv-uncat').forEach(x => x.remove());
    const totalU = sum(list, a => a.total), totalAll = sum(M.tx.filter(x => x.kind === 'spend'), x => x.s);
    if (!list.length) { cd.setEmpty('Everything has a category. Nice.'); cd.setSub(''); return; }
    cd.setEmpty(null);
    cd.setSub(`${nf0.format(list.length)} merchants, ${gbp(totalU)} (${pct(totalU / Math.max(1, totalAll))} of all spending). Picking one saves a rule for future imports.`);
    const shown = list.slice(0, R.uncatLimit || 12);
    const wrap = h('div', { class: 'fv-uncat' });
    shown.forEach(a => {
      wrap.append(h('div', { class: 'fv-uncat-row c1-uncat-row fsym-host' },
        C1.tileEl(a.m, 'Uncategorised', 'sm', { badge: false }),
        h('button', { type: 'button', class: 'fv-link fv-uncat-m', text: a.m, title: 'Open merchant', onclick: () => openMerchant(a.m) }),
        h('span', { class: 'mute num', text: `${a.count} × · ${gbp(a.total)}` }),
        // Pass the real `how` so Undo removes the new rule instead of pinning
        // the merchant to "Uncategorised" with an override.
        catSelect('Uncategorised', a.m, a.how, 'Choose…')));
    });
    if (list.length > shown.length) wrap.append(h('button', { type: 'button', class: 'fv-btn ghost', text: `Show ${Math.min(24, list.length - shown.length)} more`, onclick: () => { R.uncatLimit = (R.uncatLimit || 12) + 24; uncatList(cd, R.ctx); } }));
    cd.body.append(wrap);
  }
