  // @part 21-cat-breakdown.js · OWNER: C1 (catBreakdown donut/ranked; Overview calls it too)
  // Where the money went, by category. One series ('dist') that MORPHS between a donut, ranked
  // bars and a sunburst (category ring + merchant ring) through universalTransition: the same
  // series id and item names, set with notMerge on a switch. The selected category stays lit
  // (offset slice, full-strength bar, lit ring) and everything else dims; clicking it again does
  // nothing (clear with the crumb ×, the filter chip or Esc).
  //   o: { mode: 'donut' | 'bar' | 'sun', centre: element over the chart for the HTML total ticker,
  //        aligned: in a wide card the bars grow from the list, row for row }
  function catBreakdown(cd, ctx, key, listEl, o) {
    o = o || {};
    const t = tk();
    const rows = ctx.spendNoCat();
    const totals = ctx.catTotals(rows);
    const prevTotals = F.compare && ctx.hasPrev ? ctx.catTotals(ctx.spendNoCatPrev()) : null;
    const items = foldCats(totals);
    const total = sum(items, x => x.value);
    const sel = F.cats;
    const isSel = it => sel.length > 0 && it.members.some(m => sel.includes(m));
    const dim = it => sel.length > 0 && !isSel(it);
    const selItems = items.filter(isSel);
    const nCats = Object.keys(totals).filter(c => totals[c] > 0).length;
    cd.setSub(items.length ? `${gbp(total)} across ${nCats} categor${nCats === 1 ? 'y' : 'ies'}${selItems.length === 1 ? ` · ${selItems[0].name} selected` : selItems.length > 1 ? ` · ${selItems.length} selected` : ''}` : '');
    if (listEl) listEl.innerHTML = '';
    if (!items.length) { cd.setEmpty('No spending in this range.'); if (o.centre) o.centre.hidden = true; return; }
    const mode = o.mode || (F.catMode === 'bar' ? 'bar' : 'donut');
    const aligned = !!(o.aligned && listEl && mode === 'bar' && cd.el.clientWidth >= 560);
    const anim = FX.animated();
    const any = sel.length > 0;
    const rowsH = Math.max(240, items.length * 34);   // the chart's height beside the list (34 px rows, centred)
    const tipFor = (it, extra) => {
      if (!it) return '';
      const rows2 = [{ c: it.color, key: 'bx', v: gbp2(it.value), k: `${pct(it.value / total, 1)} of spending` }];
      if (prevTotals) { const pv = sum(it.members, m => prevTotals[m] || 0); const d = it.value - pv; rows2.push({ c: t.ghost, key: 'bx', v: gbp2(pv), k: 'previous period' }, { key: 'none', v: (d >= 0 ? '+' : '−') + gbp(Math.abs(d)), k: 'on the previous period', tone: d > 0 ? 'warn' : 'good' }); }
      if (it.members.length > 1) rows2.push({ key: 'none', v: String(it.members.length), k: 'smaller categories', muted: true });
      return C1.tip(it.name, rows2.concat(extra || []), { foot: isSel(it) && C1.isOnly(sel, it.members) ? 'Selected · Esc to clear' : 'Click to focus on this category' });
    };
    const itemOf = name => items.find(x => x.name === name);
    let option;
    if (mode === 'sun') {
      // Category ring + merchant ring (the top 6 merchants of each, then "others").
      const byCat = new Map(); const memberOf = {};
      items.forEach(it => it.members.forEach(m => { memberOf[m] = it.name; }));
      rows.forEach(x => { const k = memberOf[x.c]; if (!k || x.s <= 0) return; if (!byCat.has(k)) byCat.set(k, new Map()); const m = byCat.get(k); m.set(x.m, (m.get(x.m) || 0) + x.s); });
      const data = items.map(it => {
        const ms = [...(byCat.get(it.name) || new Map()).entries()].sort((p, q) => q[1] - p[1]);
        const top = ms.slice(0, 6); const rest = it.value - sum(top, e => e[1]);
        const op = dim(it) ? 0.26 : 1;
        const kids = top.map(([m, v], j) => ({ name: m, value: round2(v), merchant: true, itemStyle: { color: C1.mix(it.color, t.card, Math.max(0.42, 0.84 - j * 0.08)), opacity: op } }));
        if (rest > 0.5) kids.push({ name: `${ms.length - top.length > 0 ? 'Other merchants' : 'Other'}`, value: round2(rest), itemStyle: { color: C1.mix(it.color, t.card, 0.3), opacity: op } });
        return { name: it.name, value: round2(it.value), itemStyle: { color: it.color, opacity: op }, children: kids };
      });
      option = base({
        tooltip: C1.tooltip({ trigger: 'item', formatter: p => {
          const path = (p.treePathInfo || []).map(x => x.name).filter(Boolean);
          if (path.length <= 1) return tipFor(itemOf(p.name));
          const it = itemOf(path[0]);
          return C1.tip(p.name, [{ c: p.color, key: 'bx', v: gbp2(p.value), k: `${pct(p.value / Math.max(0.01, it ? it.value : total), 0)} of ${path[0]}` }], { foot: p.data && p.data.merchant ? 'Click to open this merchant' : '' });
        } }),
        series: [{ id: 'dist', type: 'sunburst', radius: ['30%', '94%'], center: ['50%', '50%'], sort: null, nodeClick: false, data,
          itemStyle: { borderColor: t.card, borderWidth: 1.5, borderRadius: 3 },
          emphasis: { focus: 'ancestor', label: { show: false } }, blur: { itemStyle: { opacity: 0.28 }, label: { show: false } },
          levels: [{}, { r0: '30%', r: '62%', label: { show: false }, itemStyle: { borderWidth: 2 } }, { r0: '63.5%', r: '94%', label: { show: false } }],
          universalTransition: { enabled: true, divideShape: 'clone' },
          animation: anim, animationDuration: 900, animationEasing: 'cubicOut', animationDurationUpdate: 600, animationEasingUpdate: 'cubicInOut' }],
      });
    } else if (mode === 'donut') {
      const data = items.map(it => FX.sel({ name: it.name, value: round2(it.value), itemStyle: { color: it.color } }, isSel(it), any));
      const s = FX.donut({ id: 'dist', data, radius: o.centre ? ['66%', '90%'] : ['60%', '86%'], selectable: true });
      Object.assign(s, { selectedOffset: 7, emphasis: Object.assign({}, s.emphasis, { focus: 'self' }), blur: { itemStyle: { opacity: 0.3 } } });
      option = base({ tooltip: C1.tooltip({ trigger: 'item', formatter: p => tipFor(itemOf(p.name)) }), series: [s] });
      if (!o.centre) option.title = { text: gbpShort(total), subtext: 'spent', left: 'center', top: 'center', itemGap: 2, textStyle: { fontSize: 22, fontWeight: 700, color: t.text, fontFamily: FONT }, subtextStyle: { color: t.muted, fontSize: 11 } };
    } else {
      const data = items.map(it => ({ name: it.name, value: round2(it.value), itemStyle: { color: it.color, opacity: dim(it) ? 0.28 : 1, borderRadius: aligned ? 7 : [0, 7, 7, 0] } }));
      const s = FX.bars({ id: 'dist', data, horizontal: true, width: 14, morph: true, track: true, radius: 7 });
      s.backgroundStyle = { color: alpha(t.text, t.dark ? 0.06 : 0.04), borderRadius: 7 };
      s.emphasis = { focus: 'none', itemStyle: { shadowBlur: 12, shadowColor: alpha(t.text, t.dark ? 0.45 : 0.18) } };
      if (anim) s.animationDelay = i => i * 40;
      if (!aligned) s.label = Object.assign(FX.numLabel({ position: 'right', color: t.text, weight: 600, size: 11.5 }), { distance: 8 });
      const rich = { n: { color: t.text, fontSize: 11.5, fontFamily: FONT, padding: [0, 0, 0, 7], width: 96 } };
      items.forEach((it, i) => { rich['i' + i] = { backgroundColor: { image: C1.catImg(it.name, 40) }, width: 18, height: 18 }; });
      const cut = s2 => { s2 = String(s2).replace(/[{}|]/g, ''); return s2.length > 15 ? s2.slice(0, 14).trimEnd() + '…' : s2; };
      option = base({
        tooltip: C1.tooltip({ trigger: 'item', formatter: p => tipFor(itemOf(p.name)) }),
        grid: aligned ? { left: 2, right: 6, top: Math.round((rowsH - items.length * 34) / 2), height: items.length * 34 } : { left: 128, right: 58, top: 2, bottom: 2 },
        xAxis: { type: 'value', show: false, inverse: aligned, max: v => v.max * 1.02 },
        yAxis: { type: 'category', inverse: true, data: items.map(i => i.name), axisLine: { show: false }, axisTick: { show: false },
          axisLabel: aligned ? { show: false } : { margin: 10, align: 'left', padding: [0, 0, 0, -118], formatter: (v, i) => `{i${i}|}{n|${cut(v)}}`, rich } },
        series: [s],
      });
    }
    const prevC = R.charts.get(key);
    const switched = !!(prevC && prevC.c1Mode && prevC.c1Mode !== mode);
    // One height for every mode (a resize in the middle of a morph would freeze it): tall enough
    // for the donut, and exactly one list row per bar when the bars sit beside the list.
    if (o.aligned && listEl) {
      const hh = (cd.el.clientWidth >= 560 ? rowsH : Math.max(240, items.length * 30)) + 'px';
      if (cd.chart.style.height !== hh) cd.chart.style.height = hh;
    }
    const c = C1.draw(cd, key, option, { notMerge: switched, after: c0 => { c0.c1Mode = mode; } });
    if (!c) return;
    c.c1Items = items;
    // The HTML centre: the total, or the hovered / selected category, as a ticker.
    const centre = o.centre;
    const paintCentre = it => {
      if (!centre) return;
      centre.hidden = mode === 'bar';
      const ic0 = centre.querySelector('.c1-dc-i'), nm = centre.querySelector('.c1-dc-n'), val = centre.querySelector('.c1-dc-v'), sub = centre.querySelector('.c1-dc-s');
      ic0.innerHTML = it ? C1.catIcon(it.name, { size: 'xs', live: false }) : '';
      nm.textContent = it ? it.name : 'Spent';
      MK.tick(val, it ? it.value : total, v => gbp(v), { duration: 420 });
      sub.textContent = it ? `${pct(it.value / total)} of ${gbp(total)}` : `${nCats} categor${nCats === 1 ? 'y' : 'ies'}`;
      centre.classList.toggle('is-sel', !!it);
    };
    const resting = () => (selItems.length === 1 ? selItems[0] : null);
    paintCentre(resting());
    const pick = it => {
      if (!it) return;
      if (C1.isOnly(sel, it.members)) {   // already the selection: nothing to do, keep it lit
        if (mode === 'donut') c.inst.dispatchAction({ type: 'select', seriesId: 'dist', name: it.name });
        return;
      }
      setCats(it.members);
    };
    on(c, 'click', p => {
      if (p.componentType !== 'series') return;
      if (mode === 'sun') {
        const path = (p.treePathInfo || []).map(x => x.name).filter(Boolean);
        if (path.length >= 2) { if (p.data && p.data.merchant) openMerchant(p.name); return; }
      }
      pick(itemOf(p.name));
    });
    on(c, 'mouseover', p => { if (p.componentType === 'series') { const path = (p.treePathInfo || []).map(x => x.name).filter(Boolean); paintCentre(itemOf(path[0] || p.name)); } });
    on(c, 'mouseout', () => paintCentre(resting()));
    on(c, 'globalout', () => paintCentre(resting()));
    if (listEl) {
      const S2 = C1.sym();
      items.forEach((it, i) => {
        const pv = prevTotals ? sum(it.members, m => prevTotals[m] || 0) : null;
        const d = pv != null ? it.value - pv : null;
        const cur = isSel(it);
        const row = h('button', { type: 'button', class: 'fv-legend-row c1-cl-row fsym-host' + (dim(it) ? ' dim' : ''), 'aria-current': cur && C1.isOnly(sel, it.members) ? 'true' : null, 'aria-pressed': String(cur),
            style: { '--i': i }, onclick: () => pick(it) },
          S2 ? h('span', { class: 'c1-sym', html: C1.catIcon(it.name, { size: 'sm' }) }) : sw(it.color),
          h('span', { class: 'n', text: it.name }),
          d != null ? h('span', { class: 'fv-delta ' + (Math.abs(d) < 1 ? 'flat' : d > 0 ? 'bad' : 'good'), text: (d >= 0 ? '+' : '−') + gbpShort(Math.abs(d)) }) : null,
          h('span', { class: 'v', text: gbp(it.value) }), h('span', { class: 'p', text: pct(it.value / total) }));
        // Hovering a row lights its slice / bar / ring and ticks the centre to it.
        row.addEventListener('mouseenter', () => { try { c.inst.dispatchAction({ type: 'highlight', seriesId: 'dist', name: it.name }); } catch (e) { /* ignore */ } paintCentre(it); });
        row.addEventListener('mouseleave', () => { try { c.inst.dispatchAction({ type: 'downplay', seriesId: 'dist', name: it.name }); } catch (e) { /* ignore */ } paintCentre(resting()); });
        listEl.append(row);
      });
      listEl.classList.toggle('c1-aligned', aligned);
    }
  }
