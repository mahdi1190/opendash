  // @part 35-recurring.js · OWNER: C2 (Recurring section: summary, month calendar, next 30/60 days, all payments, charge history)
  // ----- Recurring -----
  BUILD.recurring = g => {
    S.rsum = h('section', { class: 'fv-card fv-rc-sum', style: { '--span': 12 }, 'aria-label': 'Recurring payments in total' });
    g.append(S.rsum);
    S.rcMonth = null; S.rcFirst = true;
    S.rcal = card(g, { title: 'This month', span: 7, md: 12, cls: 'fv-rc-cal-card' });
    S.rcNav = h('div', { class: 'fv-seg fv-rc-nav', role: 'group', 'aria-label': 'Month' },
      S.rcPrev = h('button', { type: 'button', 'aria-label': 'Previous month', onclick: () => rcGoMonth(-1) }, ic('chevron-left')),
      S.rcNow = h('button', { type: 'button', class: 'on', onclick: () => rcGoMonth(0) }),
      S.rcNext = h('button', { type: 'button', 'aria-label': 'Next month', onclick: () => rcGoMonth(1) }, ic('chevron-right')));
    S.rcal.tools.append(S.rcNav);
    S.rnext = card(g, { title: 'Next 30 days', span: 5, md: 12, cls: 'fv-rc-next-card' });
    S.rnextSeg = seg([['30', '30 days'], ['60', '60 days']], String(R.rcDays || 30), v => { R.rcDays = +v; S.rnextSeg.set(v); rcNextList(S.rnext, R.ctx); }, 'Look ahead');
    S.rnext.tools.append(S.rnextSeg.el);
    S.rall = card(g, { title: 'All recurring payments', span: 12, cls: 'fv-rc-all-card' });
    S.rallSeg = seg([['cost', 'Cost'], ['next', 'Next date'], ['name', 'Name']], R.rcSort || 'cost', v => { R.rcSort = v; S.rallSeg.set(v); rcAllList(S.rall, R.ctx); }, 'Sort by');
    S.rall.tools.append(S.rallSeg.el);
    S.rhist = card(g, { title: 'Charge history', span: 12, chart: true, height: 300 });
  };
  // The recurring payments the filters allow (as before: category, merchant, search).
  function rcFiltered(M) {
    const q = (F.q || '').toLowerCase();
    return M.recurring.filter(r => (!F.cats.length || F.cats.includes(r.cat)) && (!F.merchant || isSelMerchant(r.m)) && (!q || r.m.toLowerCase().includes(q)));
  }
  // Paydays: the Overview's salary model (25-money-model.js) when it is there,
  // so both views name the same payday and amount; else VL.payday.
  function rcPayday(M) {
    if (M._vkPay) return M._vkPay.v;
    let v; let viaBrief = false;
    try {
      if (typeof MBM !== 'undefined' && MBM && typeof MBM.salary === 'function' && typeof MBM.cycleOf === 'function') {
        viaBrief = true;
        const sal = MBM.salary(M.tx, M.anchor);
        v = null;
        if (sal && Array.isArray(sal.days) && sal.days.length) {
          const amt = new Map(); for (const t of M.tx) if (t.kind === 'income' && t.m === sal.m) amt.set(t.n, (amt.get(t.n) || 0) + t.inc);
          const cyc = MBM.cycleOf(M.anchor, 'cycle', sal, M.minN);
          v = { days: sal.days.map(n => ({ n, amt: round2(amt.get(n) || sal.amount) })), last: sal.days[sal.days.length - 1], next: cyc && cyc.next > M.anchor ? cyc.next : null, amount: sal.amount };
        }
      }
    } catch (e) { viaBrief = false; }
    if (!viaBrief) v = VL.payday(M.tx.filter(t => t.kind === 'income'), M.anchor);
    M._vkPay = { v };
    return v;
  }
  UPDATE.recurring = ctx => {
    const M = ctx.M;
    const recs = rcFiltered(M);
    const act = recs.filter(r => r.active);
    const due30 = act.filter(r => r.next <= M.anchor + 30);
    rcSummary(S.rsum, M, recs, act, due30);
    rcCalendar(S.rcal, ctx);
    rcNextList(S.rnext, ctx);
    rcAllList(S.rall, ctx);
    rcHistory(S.rhist, ctx, recs);
    S.rcFirst = false;
  };

  // ── Summary strip ─────────────────────────────────────────────────────
  function rcSummary(el, M, recs, act, due30) {
    if (!el._f) {
      const it = (l) => { const b = h('b'); const s = h('span', { class: 's' }); return { el: h('div', { class: 'fv-rc-it' }, h('span', { class: 'l', text: l }), b, s), b, s }; };
      el._f = { mo: it('Committed each month'), yr: it('A year'), due: it('Due in 30 days'), stop: it('Stopped'), tags: h('div', { class: 'fv-rc-tags' }) };
      const f = el._f;
      el.append(f.mo.el, h('i', { class: 'fv-rc-sep', 'aria-hidden': 'true' }), f.yr.el, h('i', { class: 'fv-rc-sep', 'aria-hidden': 'true' }), f.due.el, h('i', { class: 'fv-rc-sep', 'aria-hidden': 'true' }), f.stop.el, f.tags);
    }
    const f = el._f;
    const monthly = sum(act, r => r.monthly);
    MK.tick(f.mo.b, round2(monthly), gbp); f.mo.s.textContent = `${act.length} active`;
    MK.tick(f.yr.b, round2(monthly * 12), gbp); f.yr.s.textContent = 'at today’s prices';
    MK.tick(f.due.b, round2(sum(due30, r => r.typical)), gbp); f.due.s.textContent = `${due30.length} payment${due30.length === 1 ? '' : 's'}`;
    MK.tick(f.stop.b, recs.length - act.length, v => nf0.format(Math.round(v))); f.stop.s.textContent = 'no charge for 2+ cycles';
    const ups = act.filter(r => { const c = VL.priceChange(r, M.anchor, 70); return c && c.up; }).length;
    const fresh = act.filter(r => VL.isNew(r, M.anchor, 70)).length;
    f.tags.textContent = '';
    if (ups) f.tags.append(h('span', { class: 'fv-tag warn', title: 'The latest charge is higher than the one before it (last 70 days)' }, ic('triangle-alert'), `${ups} price rise${ups === 1 ? '' : 's'}`));
    if (fresh) f.tags.append(h('span', { class: 'fv-tag info', title: 'First charged in the last 70 days' }, ic('sparkles'), `${fresh} new`));
  }

  // ── Month calendar ────────────────────────────────────────────────────
  function rcBounds(M) {
    const firsts = M.recurring.map(r => r.first).filter(isFinite);
    const lo = firsts.length ? monthIdx(Math.min(...firsts)) : monthIdx(M.anchor);
    return { lo: Math.max(lo, monthIdx(M.anchor) - 24), hi: monthIdx(M.anchor) + 2 };
  }
  function rcGoMonth(d) {
    const M = R.model; if (!M || !S.rcal) return;
    const cur = S.rcMonth == null ? monthIdx(M.anchor) : S.rcMonth;
    const b = rcBounds(M);
    const next = d === 0 ? monthIdx(M.anchor) : clamp(cur + d, b.lo, b.hi);
    if (next === cur) return;   // the month already shown: nothing to do
    S.rcMonth = next;
    rcCalendar(S.rcal, R.ctx, next > cur ? 1 : -1);
  }
  function rcCalendar(cd, ctx, dir) {
    const M = ctx.M; const anchor = M.anchor;
    const mi = S.rcMonth == null ? (S.rcMonth = monthIdx(anchor)) : S.rcMonth;
    const b = rcBounds(M);
    const from = monthStart(mi), to = monthEnd(mi);
    const recs = rcFiltered(M);
    const pay = rcPayday(M);
    const byDay = new Map(); let paid = 0, coming = 0;
    for (const r of recs) for (const o of VL.occurrences(r, from, to)) {
      if (!byDay.has(o.n)) byDay.set(o.n, []);
      byDay.get(o.n).push({ r, o });
      if (o.paid) paid += o.amt; else coming += o.amt;
    }
    const payDays = new Map();
    if (pay) { for (const d of pay.days) if (d.n >= from && d.n <= to) payDays.set(d.n, { amt: d.amt, real: true }); if (pay.next && pay.next >= from && pay.next <= to && pay.next > anchor) payDays.set(pay.next, { amt: pay.amount, real: false }); }
    const isNow = mi === monthIdx(anchor);
    cd.el.querySelector('.fv-card-t h3').textContent = fMonth(mi);
    cd.setSub(isNow ? `Paid ${gbp(paid)} · still to come ${gbp(coming)}` : mi < monthIdx(anchor) ? `Paid ${gbp(paid)}` : `Expected ${gbp(coming)}`);
    S.rcNow.textContent = fd(from, { month: 'short' });
    S.rcNow.title = isNow ? 'This month' : 'Back to this month';
    S.rcNow.classList.toggle('on', isNow); S.rcNow.disabled = isNow;
    S.rcPrev.disabled = mi <= b.lo; S.rcNext.disabled = mi >= b.hi;
    const cells = [];
    for (let i = 0; i < dow(from); i++) cells.push(h('div', { class: 'fv-rcd out', 'aria-hidden': 'true' }));
    for (let n = from; n <= to; n++) {
      const items = (byDay.get(n) || []).sort((p, q) => q.o.amt - p.o.amt);
      const pd = payDays.get(n);
      const tot = sum(items, x => x.o.amt);
      const cls = ['fv-rcd', n < anchor ? 'past' : '', n === anchor ? 'today' : '', pd ? 'pay' : '', items.length ? 'has' : '', dow(n) >= 5 ? 'we' : ''].filter(Boolean).join(' ');
      const tiles = h('span', { class: 'fv-rcd-tiles' });
      items.slice(0, items.length > 3 ? 2 : 3).forEach((x, j) => {
        const b2 = h('button', { type: 'button', class: 'fv-rcd-t' + (x.o.paid ? '' : ' due'), title: `${vkName(x.r.m)} · ${gbp2(x.o.amt)}${x.o.paid ? ' paid' : ' expected'}`, 'aria-label': `${vkName(x.r.m)}, ${gbp2(x.o.amt)}, ${x.o.paid ? 'paid' : 'expected'} ${fDayW(n)}`, onclick: () => openMerchant(x.r.m), style: { '--j': j } },
          VK.tile(x.r.m, x.r.cat, { size: 'xs', badge: false, live: false }));
        tiles.append(b2);
      });
      if (items.length > 3) tiles.append(h('span', { class: 'fv-rcd-more', text: '+' + (items.length - 2), title: items.slice(2).map(x => vkName(x.r.m)).join(', ') }));
      const lab = n === anchor ? 'Today, ' : '';
      cells.push(h('div', { class: cls, 'aria-current': n === anchor ? 'date' : null, 'aria-label': `${lab}${fDayLong(n)}${items.length ? `: ${items.length} payment${items.length === 1 ? '' : 's'}, ${gbp2(tot)}` : ''}${pd ? `, payday ${gbp(pd.amt)}` : ''}` },
        h('span', { class: 'fv-rcd-n', text: String(dobj(n).getUTCDate()) }),
        tiles,
        pd ? h('span', { class: 'fv-rcd-pay', title: pd.real ? 'Money in' : 'Expected payday' }, ic('banknote'), (pd.real ? '+' : '~') + gbpShort(pd.amt))
          : tot ? h('span', { class: 'fv-rcd-tot', text: gbp(tot) }) : null));
    }
    while (cells.length % 7) cells.push(h('div', { class: 'fv-rcd out', 'aria-hidden': 'true' }));
    const grid = h('div', { class: 'fv-rc-cal' + (S.rcFirst && !MK.reduced() ? ' enter' : ''), role: 'grid', 'aria-label': fMonth(mi) },
      WD.map(w => h('span', { class: 'fv-rc-wd', 'aria-hidden': 'true', text: w })), cells);
    [...grid.querySelectorAll('.fv-rcd')].forEach((c, i) => c.style.setProperty('--row', Math.floor(i / 7)));
    const old = cd.body.querySelector('.fv-rc-cal');
    if (old) old.replaceWith(grid); else cd.body.prepend(grid);
    cd.setEmpty(null);
    if (dir && typeof grid.animate === 'function' && !MK.reduced()) grid.animate([{ opacity: 0, transform: `translateX(${dir * 14}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    if (!recs.length) cd.setEmpty(M.recurring.length ? 'No recurring payments match these filters.' : 'No recurring payments found yet. They appear after two or three regular charges from the same merchant.');
  }

  // ── Next 30 / 60 days ─────────────────────────────────────────────────
  function rcNextList(cd, ctx) {
    const M = ctx.M; const anchor = M.anchor; const days = R.rcDays === 60 ? 60 : 30;
    cd.el.querySelector('.fv-card-t h3').textContent = `Next ${days} days`;
    const pay = rcPayday(M);
    const occ = [];
    for (const r of rcFiltered(M)) if (r.active) for (const o of VL.occurrences(r, anchor, anchor + days)) if (!o.paid) occ.push({ r, o });
    occ.sort((p, q) => p.o.n - q.o.n || q.o.amt - p.o.amt);
    cd.body.querySelectorAll('.fv-bills').forEach(x => x.remove());
    cd.setSub(occ.length ? `${occ.length} payment${occ.length === 1 ? '' : 's'} · ${gbp(sum(occ, x => x.o.amt))}` : '');
    if (!occ.length) { cd.setEmpty(M.recurring.length ? `Nothing expected in the next ${days} days.` : 'Recurring payments show up after two or three regular charges.'); return; }
    cd.setEmpty(null);
    const list = h('div', { class: 'fv-bills', role: 'list' });
    const pn = pay && pay.next && pay.next > anchor && pay.next <= anchor + days ? pay.next : null;
    let sepDone = !pn;
    occ.forEach((x, i) => {
      if (!sepDone && x.o.n >= pn) { sepDone = true; list.append(h('div', { class: 'fv-paysep', role: 'separator' }, ic('banknote'), `Payday ${fDayW(pn)}`, h('span', { class: 'mute', text: ` · about ${gbp(pay.amount)}` }))); }
      const last = VK.lastTx(x.r.m);
      const dd = x.o.n - anchor;
      list.append(h('button', { type: 'button', role: 'listitem', class: 'fv-bill fsym-host' + (pn && x.o.n >= pn ? ' after' : '') + (S.rcFirst && !MK.reduced() ? ' enter' : ''), style: { '--i': Math.min(i, 12) }, onclick: () => openMerchant(x.r.m), title: dd <= 0 ? 'Due today' : dd === 1 ? 'Tomorrow' : `In ${dd} days` },
        h('span', { class: 'fv-bill-d', text: fd(x.o.n, { weekday: 'short', day: 'numeric' }) }),
        VK.tile(x.r.m, x.r.cat, { size: 'sm', badge: false }),
        h('span', { class: 'fv-bill-n', text: vkName(x.r.m) }),
        VK.badgeIf(last ? VK.kind(last) : null, { compact: true }, true),
        h('span', { class: 'fv-bill-a', text: gbp2(x.o.amt) })));
    });
    if (!sepDone && pn) list.append(h('div', { class: 'fv-paysep', role: 'separator' }, ic('banknote'), `Payday ${fDayW(pn)}`));
    cd.body.append(list);
  }

  // ── All recurring payments ────────────────────────────────────────────
  function rcAllList(cd, ctx) {
    const M = ctx.M; const anchor = M.anchor;
    const recs = rcFiltered(M);
    cd.body.querySelectorAll('.fv-rl').forEach(x => x.remove());
    if (!recs.length) { cd.setSub(''); cd.setEmpty(M.recurring.length ? 'No recurring payments match these filters.' : 'None detected yet.'); return; }
    cd.setEmpty(null);
    const srt = R.rcSort || 'cost';
    cd.setSub(`${recs.length} found · ${srt === 'cost' ? 'by cost · the bar is the yearly cost' : srt === 'next' ? 'by the next charge' : 'by name'}${recs.some(r => r.source !== 'detected') ? ' · from regular charges and the import history' : ' · from regular charges'}`);
    const list = recs.slice().sort((p, q) => (q.active - p.active) || (srt === 'next' ? p.next - q.next : srt === 'name' ? p.m.localeCompare(q.m) : q.monthly - p.monthly));
    const maxY = Math.max(...list.map(r => r.monthly * 12), 0.01);
    const wrap = h('div', { class: 'fv-rl' + (S.rcFirst && !MK.reduced() ? ' enter' : ''), role: 'list' });
    list.forEach((r, i) => {
      const chg = VL.priceChange(r, anchor, 70);
      const isNew = VL.isNew(r, anchor, 70);
      const last = VK.lastTx(r.m);
      const sel = isSelMerchant(r.m);
      wrap.append(h('button', { type: 'button', role: 'listitem', class: 'fv-rl-row fsym-host' + (r.active ? '' : ' off') + (sel ? ' is-current' : ''), 'aria-current': sel ? 'true' : null, style: { '--i': Math.min(i, 14) }, onclick: () => openMerchant(r.m) },
        VK.tile(r.m, r.cat, { size: 'md' }),
        h('span', { class: 'fv-rl-main' },
          h('span', { class: 'fv-rl-nm' }, h('span', { class: 'n', text: vkName(r.m) }),
            chg ? h('span', { class: 'fv-chg ' + (chg.up ? 'up' : 'down'), title: `${gbp2(chg.from)} → ${gbp2(chg.to)} on ${fDayY(chg.n)}` }, ic(chg.up ? 'arrow-up' : 'arrow-down'), gbp2(Math.abs(chg.diff))) : null,
            isNew && r.active ? h('span', { class: 'fv-chg new', text: 'New' }) : null,
            r.active ? null : h('span', { class: 'fv-chg off', text: 'Stopped' })),
          h('span', { class: 'fv-rl-sub', text: `${r.cat} · ${r.freq.toLowerCase()} · since ${fd(r.first, { month: 'short', year: 'numeric' })}${r.varies ? ' · amount varies' : ''}` })),
        VK.badgeIf(last ? VK.kind(last) : null, null, true),
        h('span', { class: 'fv-rl-yr' }, h('span', { class: 'bar' }, h('i', { style: { '--w': (r.monthly * 12 / maxY * 100).toFixed(1) + '%', background: catColor(r.cat) } })), h('span', { class: 'cap', text: `${gbp(r.monthly * 12)} a year` })),
        h('span', { class: 'fv-rl-nx', text: r.active ? fDayW(r.next) : `last ${fDay(r.last)}` }),
        h('span', { class: 'fv-rl-am' }, h('b', { text: gbp2(r.typical) }), Math.abs(r.period - 30.44) > 5 ? h('small', { text: `≈ ${gbp2(r.monthly)}/mo` }) : null)));
    });
    cd.body.append(wrap);
  }

  // ── Charge history (every past charge, and the next expected one) ─────
  function rcHistory(cd, ctx, recs) {
    const M = ctx.M; const t = tk();
    const show = recs.slice().sort((p, q) => (q.active - p.active) || q.monthly - p.monthly).slice(0, 16);
    if (!show.length) { cd.setEmpty('Nothing to show yet.'); return; }
    cd.setSub('Each dot is a charge, sized by amount · open dots are the next expected charge · drag or scroll to zoom');
    const names = show.map(r => r.m);   // raw names are the axis keys; the labels show the cleaned ones
    const lo = Math.min(...show.map(r => r.first)) - 5, hi = Math.max(M.anchor, ...show.map(r => r.next)) + 5;
    cd.chart.style.height = Math.max(200, show.length * 30 + 76) + 'px';
    const maxAmt = Math.max(...show.flatMap(r => r.charges.map(c => c.s)), 1);
    const narrow = (cd.chart.clientWidth || 800) < 520;
    const gut = narrow ? 112 : 160;
    const rt = VK.richTiles(show.map(r => ({ name: r.m, cat: r.cat, text: vkName(r.m) })), 18, { max: narrow ? 12 : 19, fontSize: 11.5 });
    const size = v => 7 + 11 * Math.sqrt(Math.max(0, v) / maxAmt);
    const opt = base({
      grid: { left: gut + 12, right: 24, top: 26, bottom: 64 },
      tooltip: FX.tooltip({ trigger: 'item', formatter: p => { const d = p.data || {}; const r = show[d.ri]; if (!r) return ''; return vkTip(vkName(r.m), r.m, r.cat, [
        { c: catColor(r.cat), v: gbp2(d.amt), k: d.exp ? 'expected ' + fDayW(d.n) : fDayW(d.n) + ' ' + String(dobj(d.n).getUTCFullYear()), box: !d.exp },
        d.diff ? { v: (d.diff > 0 ? '+' : '−') + gbp2(Math.abs(d.diff)).replace('−', ''), k: 'vs the charge before' } : null,
        { v: `${r.freq} · ${gbp2(r.monthly)} a month`, k: '', muted: true }], 'Click for the merchant'); } }),
      xAxis: FX.xTime({ line: true, extra: { min: diso(lo), max: diso(hi), splitLine: { show: true, lineStyle: { color: t.grid, type: [3, 4] } } } }),
      yAxis: { type: 'category', data: names, inverse: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: rt.axisLabel(gut), splitLine: { show: true, lineStyle: { color: t.grid } } },
      // @p1: open on the past plus the next few weeks (an annual charge's next date a year out left
      // 40% of the plot empty); pan or zoom to see further. The scrubber matches the other charts.
      // (a phone opens on the last ~8 months, or two years of monthly dots run into one another)
      dataZoom: [{ type: 'inside', xAxisIndex: 0, zoomOnMouseWheel: 'ctrl', moveOnMouseMove: true, startValue: diso(narrow ? Math.max(lo, M.anchor - 240) : lo), endValue: diso(Math.min(hi, M.anchor + 45)) },
        C1.zoom({ xAxisIndex: 0, bottom: 10, left: gut + 12, right: 24, startValue: diso(narrow ? Math.max(lo, M.anchor - 240) : lo), endValue: diso(Math.min(hi, M.anchor + 45)) })],
      series: [
        { id: 'paid', type: 'scatter', data: show.flatMap((r, ri) => r.charges.map((c, j) => ({ value: [diso(c.n), r.m], ri, n: c.n, amt: c.s, diff: j ? round2(c.s - r.charges[j - 1].s) : 0, symbolSize: size(c.s),
          itemStyle: { color: catColor(r.cat), opacity: r.active ? 1 : 0.45 } }))),
          itemStyle: { borderColor: t.card, borderWidth: 1.5 }, emphasis: { scale: 1.3 },
          animationDelay: FX.animated() ? i => Math.min(i * 4, 500) : 0,
          markLine: Object.assign(FX.refLine(diso(M.anchor), 'Today', { axis: 'x', solid: true, position: 'start' }), { lineStyle: { color: alpha(t.text, 0.22), width: 1, type: 'solid' } }) },
        { id: 'next', type: 'scatter', data: show.filter(r => r.active).map(r => ({ value: [diso(r.next), r.m], ri: show.indexOf(r), n: r.next, amt: r.typical, exp: true, symbolSize: size(r.typical), itemStyle: { color: t.card, borderColor: catColor(r.cat), borderWidth: 2 } })),
          animationDelay: FX.animated() ? 700 : 0 },
      ],
    });
    const c = plot(cd, 's:rc-tl', opt);
    on(c, 'click', p => { const r = show[p.data && p.data.ri]; if (r) openMerchant(r.m); });
  }
