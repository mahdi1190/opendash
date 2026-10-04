  // @part 41-drawer.js · OWNER: C2 (merchant / day drawer)
  // ── Drawer (merchant / day drill-down) ────────────────────────────────
  // Merchant: a big tile, the category, the numbers, spending over time
  // (by month, or every payment) and the transactions. Day: what went out and
  // came in that day. Name variants of a merchant are shown together.
  // Opening what is already open does nothing; updates (filters, a sync)
  // repaint it without replaying its entrance.
  function ensureLayer() { if (R.layer && !R.layer.isConnected) document.body.append(R.layer); }
  function openMerchant(m) { openDrawer({ kind: 'merchant', m }); }
  function openDay(n) { openDrawer({ kind: 'day', n }); }
  const drawerId = d => (d ? d.kind + ':' + (d.kind === 'merchant' ? VK.groups().keyOf(d.m) : d.n) : '');
  function openDrawer(d) {
    ensureLayer();
    const isOpen = R.drawer && R.layer && R.layer.classList.contains('drawer-open');
    if (isOpen && drawerId(R.drawer) === drawerId(d)) { if (R.drawerEl) R.drawerEl.focus({ preventScroll: true }); return; }
    R.drawer = d; R.drawerFresh = true;
    if (!R.drawerEl) {
      R.scrim = h('div', { class: 'fv-scrim', onclick: closeDrawer });
      R.drawerEl = h('aside', { class: 'fv-drawer', role: 'dialog', 'aria-modal': 'true', tabindex: '-1' });
      R.drawerEl.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeDrawer(); } });
      R.layer.append(R.scrim, R.drawerEl);
    }
    refreshDrawer();
    R.drawerEl.scrollTop = 0;
    requestAnimationFrame(() => { R.layer.classList.add('drawer-open'); const b = R.drawerEl.querySelector('.fv-x'); if (b) b.focus({ preventScroll: true }); });
  }
  function closeDrawer() {
    R.drawer = null; if (!R.layer) return;
    R.layer.classList.remove('drawer-open');
    disposeAll('d:');
  }
  function refreshDrawer() {
    const d = R.drawer, el = R.drawerEl; if (!d || !el || !R.model) return;
    const M = R.model;
    const fresh = !!R.drawerFresh && !MK.reduced(); R.drawerFresh = false;
    const keepScroll = fresh ? 0 : el.scrollTop;
    disposeAll('d:');
    el.innerHTML = '';
    el.classList.toggle('enter', fresh);
    const x = h('button', { type: 'button', class: 'btn-icon fv-x', 'aria-label': 'Close', onclick: closeDrawer }, ic('x'));
    const secs = [];
    const sec = (cls, ...kids) => { const s = h('div', { class: 'fv-dr-sec ' + (cls || '') }, ...kids); s.style.setProperty('--i', secs.length); secs.push(s); return s; };
    if (d.kind === 'merchant') drawerMerchant(el, d, M, x, sec, fresh);
    else drawerDay(el, d, M, x, sec);
    el.append(...secs);
    if (keepScroll) el.scrollTop = keepScroll;
  }
  function drawerMerchant(el, d, M, x, sec, fresh) {
    const t = tk(); const G = VK.groups(M);
    const key = G.keyOf(d.m); const label = G.label(key);
    const members = G.members.get(key) || new Set([d.m]);
    const all = M.tx.filter(y => members.has(y.m));
    const spendAll = all.filter(y => y.kind === 'spend');
    const rg = R.ctx ? R.ctx.rg : getRange();
    const inR = spendAll.filter(y => y.n >= rg.from && y.n <= rg.to);
    const amts = spendAll.filter(y => y.s > 0).map(y => y.s);
    const st = M.mstats.get(d.m);
    const cat = st ? st.cat : (all[0] ? all[0].c : 'Uncategorised');
    const how = all[0] ? all[0].how : '';
    const rec = M.recurring.find(r => members.has(r.m));
    const sel = isSelMerchant(d.m);
    const person = /^(payments? to people|friends ?(&|and) ?family)$/i.test(cat);
    el.setAttribute('aria-label', 'Merchant ' + label);
    el.append(h('header', { class: 'fv-dr-h fv-dr-hero fsym-host' },
      VK.tile(d.m, cat, { size: 'xl', enter: fresh }),
      h('div', { class: 'fv-dr-id' },
        h('div', { class: 'fv-dr-k', text: person ? 'Person' : 'Merchant' }),
        h('h2', { text: label }),
        h('div', { class: 'fv-dr-sub' }, VK.cat(cat, { size: 'xs', plain: false }), h('span', { text: cat }),
          members.size > 1 ? h('span', { class: 'mute', title: [...members].join(', '), text: ` · ${members.size} names on statements` }) : null)),
      x));
    const sumIn = sum(inR, y => y.s), sumAll = sum(spendAll, y => y.s);
    const stats = [
      ['Spent in range', sumIn, gbp2], ['All time', sumAll, gbp2], ['Visits', amts.length, v => nf0.format(Math.round(v))],
      ['Typical', amts.length ? median(amts) : null, gbp2],
      ['First seen', spendAll.length ? Math.min(...spendAll.map(y => y.n)) : null, fDayY, true], ['Last seen', spendAll.length ? Math.max(...spendAll.map(y => y.n)) : null, fDayY, true],
    ];
    const grid = h('div', { class: 'fv-dr-stats' });
    for (const [l, v, f, plain] of stats) {
      const b = h('b');
      grid.append(h('div', null, h('span', { text: l }), b));
      if (v == null) b.textContent = '—'; else if (plain || !fresh) b.textContent = f(v); else MK.tick(b, v, f);
    }
    el.append(grid);
    el.append(h('div', { class: 'fv-dr-cat' }, h('span', { class: 'mute', text: 'Category' }), all.length ? catSelect(cat, d.m, how) : h('span', { text: cat }),
      members.size > 1 ? h('span', { class: 'fv-hint', text: 'changes ' + d.m }) : null));
    el.append(h('div', { class: 'fv-dr-actions' },
      h('button', { type: 'button', class: 'fv-btn ' + (sel ? 'ghost' : 'primary'), onclick: () => setMerchant(sel ? '' : G.primary(key)) }, ic(sel ? 'x' : 'filter'), sel ? 'Clear merchant filter' : 'Focus the dashboard on ' + label)));
    if (rec) {
      const chg = VL.priceChange(rec, M.anchor, 120);
      sec('fv-dr-rec', h('div', { class: 'fv-dr-rec-in' }, ic('repeat'),
        h('div', null, h('b', { text: `${rec.freq}, usually ${gbp2(rec.typical)}` }),
          h('span', { class: 'mute', text: rec.active ? ` · next ${fDayW(rec.next)} · ${gbp(rec.monthly * 12)} a year` : ` · stopped (last ${fDayY(rec.last)})` })),
        chg ? h('span', { class: 'fv-chg ' + (chg.up ? 'up' : 'down'), title: `${gbp2(chg.from)} → ${gbp2(chg.to)} on ${fDayY(chg.n)}` }, ic(chg.up ? 'arrow-up' : 'arrow-down'), gbp2(Math.abs(chg.diff))) : null));
    }
    // Spending over time: months (bars) or every payment.
    const chEl = h('div', { class: 'fv-chart', style: { height: '180px' } });
    const mode = R.drMode === 'pay' ? 'pay' : 'month';
    const modeSeg = seg([['month', 'Months'], ['pay', 'Payments']], mode, v => { R.drMode = v; R.drawerFresh = false; R.drChartAnim = true; refreshDrawer(); }, 'Show');
    sec('', h('div', { class: 'fv-dr-sec-h' }, h('h4', { text: 'Spending over time' }), modeSeg.el), chEl);
    if (spendAll.length && hasEcharts()) {
      requestAnimationFrame(() => {
        if (!chEl.isConnected) return;
        const c = chartFor('d:merchant', chEl); if (!c) return;
        const anim = (fresh || R.drChartAnim) && FX.animated(); R.drChartAnim = false;
        const col = catColor(cat);
        let option;
        if (mode === 'month') {
          const endMi = monthIdx(M.anchor); const startMi = Math.max(monthIdx(Math.min(...spendAll.map(y => y.n))), endMi - 23);
          const mons = []; for (let mi = startMi; mi <= endMi; mi++) mons.push({ mi, v: 0, n: 0 });
          for (const y of spendAll) { const k = monthIdx(y.n) - startMi; if (k >= 0 && k < mons.length) { mons[k].v += y.s; if (y.s > 0) mons[k].n++; } }
          const inMon = mi => monthEnd(mi) >= rg.from && monthStart(mi) <= rg.to;
          const part = M.anchor !== monthEnd(endMi);   // the month in progress: drawn faint, never read as a dip
          const fullM = part ? mons.slice(0, -1) : mons;
          const avg = sum(fullM, m => m.v) / Math.max(1, fullM.length);
          option = base({
            animation: anim,
            grid: FX.grid({ left: 4, right: 8, top: 22, bottom: 2 }),
            tooltip: FX.tooltip({ trigger: 'axis', pointer: 'shadow', formatter: ps => { const m = mons[ps[0].dataIndex]; return m ? FX.tip(fMonth(m.mi) + (part && m.mi === endMi ? ' · so far' : ''), [{ c: col, v: gbp2(m.v), k: 'spent', box: true }, { v: nf0.format(m.n), k: m.n === 1 ? 'visit' : 'visits' }]) : ''; } }),
            xAxis: FX.xAxis(mons.map(m => fMonthS(m.mi, mons.length > 12)), { line: true }),
            yAxis: FX.yAxis({ ticks: 3 }),
            series: [FX.bars({ id: 'mon', color: col, radius: 4, width: 18, stagger: anim,
              data: mons.map(m => ({ value: round2(m.v), itemStyle: { color: !inMon(m.mi) ? alpha(col, t.dark ? 0.3 : 0.24) : part && m.mi === endMi ? alpha(col, 0.45) : col } })),
              markLine: fullM.length > 2 && avg > 0 ? FX.refLine(round2(avg), 'avg ' + gbpShort(avg) + ' a month') : undefined })],
          });
        } else {
          const pts = spendAll.slice().sort((p, q) => p.n - q.n);
          option = base({
            animation: anim,
            grid: FX.grid({ left: 4, right: 8, top: 22, bottom: 2 }),
            tooltip: FX.tooltip({ trigger: 'item', formatter: p => { const y = pts[p.dataIndex]; return y ? FX.tip(fDayLong(y.n), [{ c: col, v: gbp2(y.s), k: y.s < 0 ? 'refund' : 'paid', box: true }, y.memo ? { v: y.memo, k: '', muted: true } : null]) : ''; } }),
            xAxis: FX.xTime({ line: true, extra: { min: diso(Math.min(pts[0].n, rg.from) - 2), max: diso(M.anchor + 2) } }),
            yAxis: FX.yAxis({ ticks: 3 }),
            series: [FX.bars({ id: 'pay', color: col, radius: 3, width: 8, stagger: anim,
              data: pts.map(y => ({ value: [diso(y.n), round2(y.s)], itemStyle: { color: y.n >= rg.from && y.n <= rg.to ? col : alpha(col, t.dark ? 0.3 : 0.24), borderRadius: y.s >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3] } })),
              markLine: amts.length > 2 ? FX.refLine(round2(median(amts)), 'typical ' + gbpShort(median(amts))) : undefined })],
          });
          option.series[0].barMinWidth = 3;
        }
        if (!anim) option.series.forEach(s => { s.animation = false; });
        c.inst.setOption(option, true);
      });
    } else { chEl.classList.add('fv-dr-nochart'); chEl.textContent = 'No spending here yet.'; }
    sec('', txList(all, 'Transactions', 60));
  }
  function drawerDay(el, d, M, x, sec) {
    const n = d.n;
    const rows = M.tx.filter(y => y.n === n);
    const spent = sum(rows.filter(y => y.kind === 'spend'), y => y.s);
    const bal = txBalances(M).get(n);
    el.setAttribute('aria-label', fDayLong(n));
    el.append(h('header', { class: 'fv-dr-h fv-dr-hero' },
      h('div', { class: 'fv-dr-date', 'aria-hidden': 'true' }, h('small', { text: fd(n, { month: 'short' }) }), h('b', { text: String(dobj(n).getUTCDate()) })),
      h('div', { class: 'fv-dr-id' }, h('div', { class: 'fv-dr-k', text: fd(n, { weekday: 'long' }) + (dow(n) >= 5 ? ' · weekend' : '') }), h('h2', { text: fDayLong(n) })),
      x));
    el.append(h('div', { class: 'fv-dr-stats three' },
      h('div', null, h('span', { text: 'Spent' }), h('b', { text: gbp2(spent) })),
      h('div', null, h('span', { text: 'Payments' }), h('b', { text: nf0.format(rows.filter(y => y.kind === 'spend' && y.s > 0).length) })),
      h('div', null, h('span', { text: bal != null ? 'Balance' : 'Money in' }), h('b', { text: bal != null ? gbp2(bal) : gbp2(sum(rows, y => y.inc)) }))));
    el.append(h('div', { class: 'fv-dr-actions' },
      h('button', { type: 'button', class: 'fv-btn primary', onclick: () => { setCustomRange(n, n); closeDrawer(); } }, ic('calendar'), 'Filter everything to this day'),
      h('button', { type: 'button', class: 'fv-btn ghost', text: 'Its week', onclick: () => { setCustomRange(weekStart(n), weekStart(n) + 6); closeDrawer(); } })));
    sec('', txList(rows, rows.length ? 'Transactions' : 'No transactions on this day', 200));
  }
  function txList(rows, title, limit) {
    const M = R.model; const G = VK.groups(M);
    const byMerchant = R.drawer && R.drawer.kind === 'merchant';
    const ul = h('ul', { class: 'fv-list fv-dr-list' });
    rows.slice(0, limit).forEach(y => {
      const kind = VK.kind(y);
      const sub = [byMerchant ? null : y.c, M.accts.length > 1 ? (M.acctNames[y.acct] || y.acct) : '', y.memo && y.memo.toUpperCase() !== y.m.toUpperCase() ? y.memo : ''].filter(Boolean).join(' · ');
      ul.append(h('li', null, h('div', { class: 'fv-row static fv-dr-row fsym-host' },
        byMerchant ? h('span', { class: 'fv-cal', 'aria-hidden': 'true' }, h('b', { text: String(dobj(y.n).getUTCDate()) }), h('small', { text: fd(y.n, { month: 'short' }) }))
          : VK.tile(y.m, y.c, { size: 'sm' }),
        h('span', { class: 'fv-row-main' },
          h('span', { class: 'fv-row-t' }, byMerchant ? fd(y.n, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : G.label(G.keyOf(y.m))),
          h('span', { class: 'fv-row-s' }, VK.badgeIf(kind, { compact: true }), sub ? h('span', { text: sub }) : null)),
        h('span', { class: 'fv-row-v' + (y.a > 0 ? ' in' : ''), text: y.a > 0 ? sgbp2(y.a) : gbp2(y.a) }))));
    });
    if (rows.length > limit) ul.append(h('li', { class: 'fv-more-note', text: `+${rows.length - limit} older` }));
    return h('div', null, h('h4', { text: title }), ul);
  }
