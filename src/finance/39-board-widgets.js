  // @part 39-board-widgets.js · NEW (2.16) · OWNER: FUX (My money's widgets: one renderer per type)
  // ── My money: the widgets ─────────────────────────────────────────────
  // BWR[type] = {chart?: height | (w) -> height, build?(cd, w, X), update(cd, w, X)}.
  // cd is the widget's card (08-controls.js card()); X is the update pass (39-board.js bdPass):
  // {ctx, M, L, simple, lazy, ctxOf(w), brief(), size(w)}. Charts use the key 's:b:<widget id>'
  // (disposed with the section, or when the widget goes). Amounts in the DOM carry .fv-amt, so
  // "Hide amounts" (Home's homeUI.hideAmounts) blurs them; chart labels say ••• then.
  // Every empty state says why in plain words and what to do next.
  const BWR = {};
  const bdHidden = () => { try { return typeof homeAmountsHidden === 'function' && homeAmountsHidden(); } catch (e) { return false; } };
  const bdAxis = () => (bdHidden() ? () => '•••' : v => gbpShort(v));
  const bdTipMoney = v => (bdHidden() ? '•••' : gbp2(v));
  const amt = (text, cls) => h('span', { class: 'fv-amt' + (cls ? ' ' + cls : ''), text });
  const bdKey = (w, s) => 's:b:' + w.i + (s ? ':' + s : '');
  const bdPeriodSub = (ctx, w) => {
    const p = bwOpt(w, 'period');
    const names = { TW: 'This week', TM: 'This month', '1M': 'Last 30 days', '3M': 'Last 3 months', YTD: 'This year' };
    return (p && p !== 'filter' && names[p]) || fRange(ctx.rg.from, ctx.rg.to);
  };
  // A widget's footer link to the section with all of it.
  function bdMore(cd, label, go) {
    const b = h('button', { type: 'button', class: 'fv-link fvb-more', onclick: go }, h('span', { text: label }), ic('chevron-right'));
    cd.body.append(b); return b;
  }
  function bdBox(cd) { if (!cd.box) { cd.box = h('div', { class: 'fvb-box' }); cd.body.insertBefore(cd.box, cd.body.firstChild); } cd.box.innerHTML = ''; return cd.box; }
  // A big number with its words ("£42" "a day"), the board's simple look.
  function bdBig(v, words, tone) {
    return h('div', { class: 'fvb-big' + (tone ? ' ' + tone : '') }, amt(v, 'fvb-big-v'), words ? h('span', { class: 'fvb-big-w', text: words }) : null);
  }
  const bdDelta = (d, good) => h('span', { class: 'fv-delta ' + (Math.abs(d) < 0.5 ? 'flat' : (good ? 'good' : 'bad')) }, amt((d > 0 ? '+' : d < 0 ? '−' : '') + gbp(Math.abs(d))));
  const dayWord = (n, anchor) => (n === anchor ? 'Today' : n === anchor + 1 ? 'Tomorrow' : n === anchor - 1 ? 'Yesterday' : n - anchor > 1 && n - anchor < 7 ? fd(n, { weekday: 'long' }) : fDayW(n));

  /* ---------- Safe to spend ---------- */
  BWR.safe = {
    update(cd, w, X) {
      const B = X.brief(); const box = bdBox(cd);
      if (!B || !B.balance) {
        cd.setSub('');
        box.append(h('p', { class: 'fvb-note', text: 'Safe to spend needs your balances. Update your bank, or connect one that shares balances.' }),
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm', onclick: () => (window.Connections && Connections.open ? Connections.open('money') : null) }, ic('landmark'), h('span', { text: 'Connections' })));
        return;
      }
      const cushion = Number(bwOpt(w, 'cushion')) || 0;
      const left = round2(B.balance.total - B.billsTotal - cushion);
      const days = Math.max(1, B.cycle.daysLeft);
      const perDay = round2(Math.max(0, left) / days);
      const until = B.mode === 'cycle' ? `until payday, ${fDayW(B.cycle.next)}` : `until the end of ${fd(B.cycle.start, { month: 'long' })}`;
      cd.setSub(`${until} · ${days} day${days === 1 ? '' : 's'}`);
      const show = bwOpt(w, 'show');
      const tone = left < 0 ? 'bad' : perDay < 5 ? 'warn' : 'good';
      box.append(show === 'total' ? bdBig(gbp(Math.max(0, left)), 'to spend', tone) : bdBig(gbp(perDay), 'a day', tone));
      if (left < 0) box.append(h('p', { class: 'fvb-note warn' }, 'The bills still to come are ', amt(gbp(-left)), ' more than you have. Moving money in, or a later payday, fixes it.'));
      else if (X.simple) box.append(h('p', { class: 'fvb-plain' }, 'You can spend about ', amt(gbp(perDay)), ` a day ${until}, after the bills still to come.`));
      if (!X.simple && X.size(w) !== 's') {
        box.append(h('div', { class: 'fvb-sum' },
          h('span', null, 'Balance ', amt(gbp(B.balance.total))), h('span', { class: 'op', text: '−' }),
          h('span', null, `${B.bills.length} bill${B.bills.length === 1 ? '' : 's'} to come `, amt(gbp(B.billsTotal))),
          cushion ? h('span', { class: 'op', text: '−' }) : null, cushion ? h('span', null, 'kept back ', amt(gbp(cushion))) : null));
      }
    },
  };

  /* ---------- Your money plan ---------- */
  BWR.moneyplan = {
    update(cd, w) {
      const box = bdBox(cd); const v = MPL.v;
      cd.setSub('');
      const go = () => setSection('budgets');
      if (!v || !v.has) { box.append(h('p', { class: 'fvb-note', text: 'A few easy questions, and we work out what you take home and build a budget.' }), h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Start your plan', onclick: go })); return; }
      box.append(bdBig(gbp(v.budget.left), v.budget.left >= 0 ? 'left a month' : 'short a month', v.budget.left < 0 ? 'bad' : 'good'));
      const top = Number(bwOpt(w, 'top')) || 2;
      if (!v.flags.length) box.append(h('p', { class: 'fvb-plain', text: 'Nothing looks off against your bank this month.' }));
      for (const f of v.flags.slice(0, top)) box.append(h('p', { class: 'fvb-line' }, amt(f.title)));
      bdMore(cd, 'Open my plan', go);
    },
  };

  /* ---------- This month vs last ---------- */
  function bdMonthNumbers(M, q) {
    const today = M.anchor, mi = monthIdx(today), ms = monthStart(mi);
    const pms = monthStart(mi - 1), pme = monthEnd(mi - 1);
    const dayN = today - ms;
    const cum = (a, b) => { const out = new Array(b - a + 1).fill(0); for (const t of M.tx) if (t.kind === 'spend' && t.n >= a && t.n <= b && q(t)) out[t.n - a] += t.s; let c = 0; return out.map(v => (c += v, round2(c))); };
    const cur = cum(ms, today), prev = pms >= M.minN - 31 ? cum(pms, pme) : [];
    const mtd = cur.length ? cur[cur.length - 1] : 0;
    const lastToDate = prev.length ? prev[Math.min(dayN, prev.length - 1)] : null;
    const lastFull = prev.length ? prev[prev.length - 1] : null;
    return { mi, ms, cur, prev, mtd, lastToDate, lastFull, proj: projection(M, q).proj };
  }
  BWR.vsmonth = {
    chart: (w, X) => (bwOpt(w, 'chart') === 'on' && !X.simple ? 150 : 0),
    update(cd, w, X) {
      const M = X.M; const q = pred(); const N = bdMonthNumbers(M, q);
      const box = bdBox(cd);
      const cmpFull = bwOpt(w, 'cmp') === 'full';
      const other = cmpFull ? N.lastFull : N.lastToDate;
      const lastName = fd(monthStart(N.mi - 1), { month: 'long' });
      cd.setSub(`${fd(N.ms, { month: 'long' })} so far` + (F.cats.length || F.country || F.accts.length ? ' · with your filters' : ''));
      box.append(bdBig(gbp(N.mtd), 'spent'));
      if (other != null) {
        const d = N.mtd - other;
        const words = cmpFull ? `${Math.abs(d) < 0.5 ? 'the same as' : d < 0 ? 'less than' : 'more than'} all of ${lastName}` : `${Math.abs(d) < 0.5 ? 'the same as' : d < 0 ? 'less than' : 'more than'} by this day in ${lastName}`;
        box.append(h('p', { class: 'fvb-line' }, bdDelta(d, d <= 0), ' ', words, other > 0 ? h('span', { class: 'mute', text: ` (${d >= 0 ? '+' : '−'}${pct(Math.abs(d) / other)})` }) : null));
      } else box.append(h('p', { class: 'fvb-line mute', text: 'Nothing to compare with yet: last month is not in your data.' }));
      if (N.proj != null && X.size(w) !== 's') box.append(h('p', { class: 'fvb-line mute' }, 'Heading for ', amt(gbp(N.proj)), N.lastFull != null ? h('span', null, ` (${lastName}: `, amt(gbp(N.lastFull)), ')') : null));
      if (!cd.chart) return;
      const t = tk();
      const days = Math.max(N.cur.length, N.prev.length);
      const xs = Array.from({ length: days }, (_, i) => String(i + 1));
      const series = [];
      if (N.prev.length) series.push(FX.smoothLine({ id: 'prev', name: lastName, data: N.prev, color: t.ghost, width: 1.5, dashed: true }));
      series.push(FX.area({ id: 'cur', name: fd(N.ms, { month: 'long' }), data: N.cur, color: t.accent, area: 0.18 }));
      if (N.cur.length) series.push(FX.pulse({ id: 'now', at: [N.cur.length - 1, N.cur[N.cur.length - 1]], color: t.accent }));
      const c = C1.draw(cd, bdKey(w), base({
        grid: FX.grid({ top: 10, left: 4, right: 8, bottom: 4 }),
        tooltip: C1.tooltip({ trigger: 'axis', formatter: ps => C1.tip(`Day ${(+ps[0].dataIndex) + 1}`, ps.filter(p => p.seriesType === 'line').map(p => ({ c: p.color, v: bdTipMoney(p.value), k: p.seriesName }))) }),
        xAxis: FX.xAxis(xs, { bars: false, extra: { axisLabel: { show: false } } }), yAxis: FX.yAxis({ ticks: 2, fmt: bdAxis() }), series,
      }));
      FX.live(c);
    },
  };

  /* ---------- Spending by category ---------- */
  BWR.cats = {
    chart: (w, X) => (bwOpt(w, 'view') === 'list' || X.simple ? 0 : bwOpt(w, 'view') === 'donut' ? 180 : 220),
    update(cd, w, X) {
      const ctx = X.ctxOf(w); const box = bdBox(cd);
      const rows = ctx.spendNoCat(), prevRows = ctx.spendNoCatPrev();
      const tot = ctx.catTotals(rows), ptot = ctx.catTotals(prevRows);
      const top = Number(bwOpt(w, 'top')) || 8;
      const items = Object.entries(tot).filter(e => e[1] > 0.004).sort((a, b) => b[1] - a[1]);
      cd.setSub(bdPeriodSub(ctx, w));
      if (!items.length) { box.append(h('p', { class: 'fvb-note', text: 'No spending in these dates.' })); if (cd.chart) cd.setEmpty(' '); return; }
      const shown = items.slice(0, top), rest = items.slice(top);
      const restV = sum(rest, e => e[1]);
      const all = sum(items, e => e[1]);
      const anySel = F.cats.length > 0;
      const view = X.simple ? 'list' : bwOpt(w, 'view');
      if (cd.chart && view === 'donut') {
        const data = shown.map(([c, v]) => ({ name: c, value: round2(v), itemStyle: { color: catColor(c), opacity: !anySel || F.cats.includes(c) ? 1 : 0.25 } }));
        if (restV > 0.004) data.push({ name: 'Everything else', value: round2(restV), itemStyle: { color: tk().other } });
        const c = C1.draw(cd, bdKey(w), base({ tooltip: C1.tooltip({ formatter: p => C1.tip(p.name, [{ c: p.color, v: bdTipMoney(p.value), k: pct(p.value / all) }]) }), series: [FX.donut({ id: 'd', data, radius: ['58%', '88%'] })] }));
        on(c, 'click', p => { if (p.name && p.name !== 'Everything else' && !(F.cats.length === 1 && F.cats[0] === p.name)) toggleCat(p.name, true); });
      } else if (cd.chart && view === 'bars') {
        const names = shown.map(e => e[0]).reverse();
        const c = C1.draw(cd, bdKey(w), base({
          grid: FX.grid({ left: 4, right: 40, top: 4, bottom: 4 }),
          tooltip: C1.tooltip({ trigger: 'axis', pointer: 'shadow', formatter: ps => C1.tip(ps[0].name, [{ c: catColor(ps[0].name), v: bdTipMoney(ps[0].value), k: pct(ps[0].value / all) }]) }),
          xAxis: { type: 'value', show: false }, yAxis: { type: 'category', data: names, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: tk().text, fontSize: 11, fontFamily: FONT, width: 110, overflow: 'truncate' } },
          series: [Object.assign(FX.bars({ id: 'b', horizontal: true, data: names.map(c2 => ({ value: round2(tot[c2]), itemStyle: { color: catColor(c2), opacity: !anySel || F.cats.includes(c2) ? 1 : 0.25 } })), label: FX.numLabel({ position: 'right', fmt: bdAxis() }) }))],
        }));
        on(c, 'click', p => { if (p.name && !(F.cats.length === 1 && F.cats[0] === p.name)) toggleCat(p.name, true); });
      }
      // The list (always in Simple, under the chart otherwise), with the change on the period before.
      const max = Math.max(0.01, shown[0][1]);
      const ul = h('ul', { class: 'fv-list fvb-cat-list' + (view !== 'list' ? ' compact' : '') });
      shown.slice(0, view === 'list' ? top : 4).forEach(([c, v], i) => {
        const p = ptot[c] || 0, d = v - p;
        const cur = F.cats.length === 1 && F.cats[0] === c;
        ul.append(h('li', null, h('button', { type: 'button', class: 'fv-row fvb-bar-row' + (cur ? ' is-current' : '') + (anySel && !F.cats.includes(c) ? ' dim' : ''), 'aria-current': cur ? 'true' : null, style: { '--c': catColor(c), '--i': i },
          onclick: () => { if (!cur) toggleCat(c, true); } },
          C1.catIconEl(c, { size: 'sm' }),
          h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-cc-top' }, h('span', { class: 'fv-row-t', text: c }), ctx.hasPrev && view === 'list' ? bdDelta(d, d <= 0) : null),
            view === 'list' ? h('span', { class: 'fv-cc-bar', 'aria-hidden': 'true' }, h('i', { style: { width: Math.max(2, v / max * 100).toFixed(1) + '%' } })) : null),
          amt(gbp(v), 'fv-row-v'))));
      });
      box.append(ul);
      if (view === 'list' && restV > 0.004) box.append(h('p', { class: 'fvb-note' }, `${rest.length} more: `, amt(gbp(restV))));
    },
  };

  /* ---------- Spending by country ---------- */
  BWR.countries = {
    update(cd, w, X) {
      const ctx = X.ctxOf(w); const box = bdBox(cd);
      const list = PL.agg(ccRows(ctx));
      const abroad = bwOpt(w, 'scope') === 'abroad';
      const shown = abroad ? list.filter(x => x.abroad) : list;
      const away = list.filter(x => x.abroad);
      cd.setSub(bdPeriodSub(ctx, w) + (away.length ? ` · ${away.length} abroad` : ''));
      if (!shown.length) { box.append(h('p', { class: 'fvb-note', text: abroad ? 'Nothing paid abroad in these dates.' : 'No spending in these dates.' })); return; }
      box.append(ccListEl(list, { abroad, limit: Number(bwOpt(w, 'top')) || 5, compact: X.size(w) === 's' || X.simple }));
      if (!cd.more) cd.more = bdMore(cd, 'Countries', () => setSection('countries'));
    },
  };

  /* ---------- Spending by merchant ---------- */
  BWR.merchants = {
    update(cd, w, X) {
      const ctx = X.ctxOf(w); const box = bdBox(cd);
      const by = new Map();
      for (const t of ctx.cur.spend) { const m = by.get(t.m) || { m: t.m, c: t.c, s: 0, n: 0 }; m.s += t.s; m.n++; by.set(t.m, m); }
      const visits = bwOpt(w, 'sort') === 'visits';
      const list = [...by.values()].filter(m => m.s > 0.004).sort((a, b) => (visits ? b.n - a.n || b.s - a.s : b.s - a.s)).slice(0, Number(bwOpt(w, 'top')) || 5);
      cd.setSub(bdPeriodSub(ctx, w));
      if (!list.length) { box.append(h('p', { class: 'fvb-note', text: 'No spending in these dates.' })); return; }
      const ul = h('ul', { class: 'fv-list' });
      for (const m of list) {
        ul.append(h('li', null, h('button', { type: 'button', class: 'fv-row fsym-host', onclick: () => openMerchant(m.m) }, C1.tileEl(m.m, m.c, 'sm'),
          h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-row-t', text: m.m }), h('span', { class: 'fv-row-s', text: `${m.n} visit${m.n === 1 ? '' : 's'} · ${m.c}` })),
          amt(gbp(m.s), 'fv-row-v'))));
      }
      box.append(ul);
    },
  };

  /* ---------- Budgets ---------- */
  BWR.budgets = {
    update(cd, w, X) {
      const M = X.M; const box = bdBox(cd);
      const bud = R.budgets || {};
      const cats = Object.keys(bud).filter(c => bud[c] > 0 && (!F.cats.length || F.cats.includes(c)));
      if (!cats.length) {
        cd.setSub('');
        box.append(h('p', { class: 'fvb-note', text: F.cats.length ? 'No budget for the picked categories.' : 'No budgets yet. A monthly budget per category shows here with how it is pacing.' }),
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm', onclick: () => setSection('budgets') }, ic('piggy-bank'), h('span', { text: 'Set budgets' })));
        return;
      }
      const bc = budgetCalc(M); const pace = bc.elapsed / bc.total;
      let list = cats.map(c => { const s = bc.spent[c] || 0; return { c, s, b: bud[c], look: budgetLook(s, bud[c], pace, budgetScheduled(c)) }; });
      if (bwOpt(w, 'show') === 'watch') list = list.filter(x => x.look.k === 'over' || x.look.k === 'ahead');
      list.sort((a, b) => (b.s / b.b) - (a.s / a.b));
      const totB = sum(cats, c => bud[c]), totS = sum(cats, c => bc.spent[c] || 0);
      cd.setSub(`${fMonth(bc.mi)} · day ${bc.elapsed} of ${bc.total}`);
      box.append(h('div', { class: 'fvb-budhead' }, amt(gbp(totS), 'b'), h('span', { class: 'mute' }, ' of ', amt(gbp(totB)), ' budgeted · '), amt(gbp(Math.max(0, totB - totS))), h('span', { class: 'mute', text: ' left' })));
      if (!list.length) { box.append(h('p', { class: 'fvb-note good', text: 'Every budget is on pace. Nothing to watch.' })); return; }
      const ul = h('ul', { class: 'fv-list' });
      for (const x of list.slice(0, Number(bwOpt(w, 'top')) || 5)) {
        const frac = clamp(x.s / x.b, 0, 1.2);
        ul.append(h('li', null, h('button', { type: 'button', class: 'fv-row fvb-bud tone-' + x.look.tone, onclick: () => setSection('budgets'), title: x.look.l },
          C1.catIconEl(x.c, { size: 'sm' }),
          h('span', { class: 'fv-row-main' },
            h('span', { class: 'fv-cc-top' }, h('span', { class: 'fv-row-t', text: x.c }), h('span', { class: 'fvb-bud-l', text: x.look.short })),
            h('span', { class: 'fvb-bud-bar', 'aria-hidden': 'true', style: { '--f': (Math.min(1, frac) * 100).toFixed(1) + '%', '--p': (pace * 100).toFixed(1) + '%' } }, h('i'), h('b'))),
          h('span', { class: 'fv-cc-v' }, amt(gbp(x.s), 'fv-row-v'), h('small', null, 'of ', amt(gbp(x.b)))))));
      }
      box.append(ul);
      if (!cd.more) cd.more = bdMore(cd, list.length > ul.childElementCount ? `All ${list.length} budgets` : 'All budgets', () => setSection('budgets'));
    },
  };

  /* ---------- Bills and subscriptions (cancel reminders) ---------- */
  // A note per subscription ("cancel before the 3rd") is a synced preference keyed by a hash
  // of the merchant (F.billNotes: {key: {d, t}}), never the name. A task can be made from it.
  function bdHash(s) { let x = 2166136261; for (const ch of String(s).toLowerCase()) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619) >>> 0; } return 'm' + x.toString(36); }
  const bdNote = m => { const n = F.billNotes && F.billNotes[bdHash(m)]; return n && (n.t || n.d) ? n : null; };
  function bdSetNote(m, n) {
    const k = bdHash(m); const next = Object.assign({}, F.billNotes || {});
    if (n && (n.t || n.d)) next[k] = { d: validIso(n.d) ? n.d.slice(0, 10) : '', t: String(n.t || '').slice(0, 80) }; else delete next[k];
    F.billNotes = next; saveF();
  }
  const bdIsBill = c => MBM.isFixed(c) || /insurance|phone|broadband|energy|water|tax|loan|mortgage|rent/i.test(String(c));
  function bdBills(M, days, kind) {
    const list = MBM.billsBetween(M.recurring, M.anchor, M.anchor + days + 1);
    return list.filter(b => kind === 'all' || (kind === 'bills' ? bdIsBill(b.c) : !bdIsBill(b.c)));
  }
  /** The cancel-reminder popover: a date and a note (saved at once, synced), and a task to cancel it. */
  function bdNoteEditor(anchor, b, after) {
    if (typeof window.openPopover !== 'function') return;
    const cur = bdNote(b.m) || {};
    window.openPopover(anchor, (el, close) => {
      el.classList.add('fvb-pop');
      const defDay = diso(Math.max(R.model.anchor, b.n - 2));
      const date = h('input', { type: 'date', class: 'input input-sm', value: cur.d || defDay, 'aria-label': 'Remind me by' });
      const text = h('input', { type: 'text', class: 'input input-sm', maxlength: '80', value: cur.t || '', placeholder: 'Cancel before the free trial ends', 'aria-label': 'Note' });
      const save = () => { bdSetNote(b.m, { d: date.value, t: text.value.trim() || 'Cancel' }); close(); after && after(); toast('Cancel reminder saved for ' + b.m, { kind: 'ok', icon: 'bell' }); };
      const title = `Cancel ${b.m}${date.value ? ' ' + date.value : ''}`;
      const taskText = () => `Cancel ${b.m} subscription ${date.value || ''}`.trim();
      el.append(h('div', { class: 'fvb-pop-h' }, ic('bell'), h('b', { text: 'Cancel reminder' }), h('span', { class: 'mute', text: b.m })),
        h('label', { class: 'fvb-pop-f' }, h('span', { text: 'By' }), date),
        h('label', { class: 'fvb-pop-f' }, h('span', { text: 'Note' }), text),
        h('div', { class: 'fvb-pop-a' },
          h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: save }, h('span', { text: 'Save' })),
          cur.t || cur.d ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { const was = cur; bdSetNote(b.m, null); close(); after && after(); toast('Reminder removed', { action: 'Undo', onAction: () => { bdSetNote(b.m, was); after && after(); } }); } }, h('span', { text: 'Remove' })) : null),
        typeof openQuickAddDialog === 'function' ? h('div', { class: 'fvb-pop-task' },
          // The user's rule (3 Oct): the main button opens the normal editor filled in; the small check adds it at once, with Undo.
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm', title, onclick: () => { close(); openQuickAddDialog(taskText()); } }, ic('list-checks'), h('span', { text: 'Add a task to cancel it' })),
          typeof addTaskFromText === 'function' ? h('button', { type: 'button', class: 'btn-icon btn-sm', 'aria-label': 'Add the task now', title: 'Add it now (Undo in the toast)', onclick: () => {
            close(); const id = addTaskFromText(taskText()); if (!id) return;
            if (typeof window.toast === 'function') window.toast('Task added: ' + taskText(), { kind: 'ok', icon: 'check', action: { label: 'Undo', run: () => { if (typeof undo === 'function') undo(); } } });
          } }, ic('check')) : null) : null);
      date.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
      text.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    }, { align: 'end', width: 300 });
  }
  // Owed to me (src/app/66-owed-*.js): the total, who owes most, and the way to start a split.
  BWR.owed = {
    update(cd, w, X) {
      const box = bdBox(cd), O = window.Owed;
      const s = O && O.summary ? O.summary() : null;
      if (O && !s && O.load) O.load();
      box.append(bdBig(gbp((s && s.owedToMe) || 0), 'owed to you'));
      if (s && s.iOweCount) box.append(h('p', { class: 'fvb-line mute' }, 'You owe ', amt(gbp(s.iOwe))));
      const line = O && O.briefLine ? O.briefLine({ askOnly: true }) : null;
      if (line) box.append(line);
      box.append(h('div', { class: 'fvb-acts' }, h('button', { type: 'button', class: 'fv-btn', onclick: () => O && O.split({}) }, ic('plus'), h('span', { text: 'Split a payment' })), h('button', { type: 'button', class: 'fv-btn ghost', onclick: () => setView('owed') }, h('span', { text: 'See who' }), ic('chevron-right'))));
    },
  };
  BWR.bills = {
    update(cd, w, X) {
      const M = X.M; const box = bdBox(cd);
      const top = Number(bwOpt(w, 'top')) || 5, kind = bwOpt(w, 'kind');
      let days = Number(bwOpt(w, 'days')) || 30;
      let list = bdBills(M, days, kind);
      // Fewer due than rows: look further ahead (30, then 60 days) so the card is not half empty.
      for (const d of [30, 60]) if (list.length < top && d > days) { days = d; list = bdBills(M, days, kind); }
      const recs = M.recurring.filter(r => r.active && !MBM.NOT_BILLS.includes(r.cat) && (kind === 'all' || (kind === 'bills' ? bdIsBill(r.cat) : !bdIsBill(r.cat))));
      const monthly = sum(recs, r => r.monthly);
      cd.setSub(`Next ${days} days · `);
      cd.el.querySelector('.fv-card-s').append(amt(gbp(monthly)), ` a month in ${recs.length} regular payment${recs.length === 1 ? '' : 's'}`);
      if (!list.length) { box.append(h('p', { class: 'fvb-note', text: recs.length ? `Nothing due in the next ${days} days.` : 'No regular payments found yet. They show up once a bill or subscription has been paid twice.' })); return; }
      const total = sum(list, b => b.amount);
      box.append(h('div', { class: 'fvb-budhead' }, amt(gbp(total), 'b'), h('span', { class: 'mute', text: ` in ${list.length} payment${list.length === 1 ? '' : 's'}` })));
      const ul = h('ul', { class: 'fv-list' });
      const rerender = () => BWR.bills.update(cd, w, X);
      for (const b of list.slice(0, top)) {
        const note = bdNote(b.m);
        const soon = b.n - M.anchor <= 2;
        const sub = [dayWord(b.n, M.anchor), b.freq].filter(Boolean);
        ul.append(h('li', { class: 'fvb-bill' + (soon ? ' is-soon' : '') },
          h('button', { type: 'button', class: 'fv-row fsym-host', onclick: () => { F.merchant = b.m; saveF(); setSection('recurring'); } }, C1.tileEl(b.m, b.c, 'sm'),
            h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-row-t', text: b.m }), h('span', { class: 'fv-row-s', text: sub.join(' · ') }),
              note ? h('span', { class: 'fvb-notechip' }, ic('bell'), h('span', { text: [note.t, note.d ? 'by ' + fDay(dnum(note.d)) : ''].filter(Boolean).join(' · ') })) : null),
            amt(gbp2(b.amount), 'fv-row-v')),
          h('button', { type: 'button', class: 'btn-icon btn-sm fvb-bell' + (note ? ' on' : ''), 'aria-label': (note ? 'Edit the cancel reminder for ' : 'Add a cancel reminder for ') + b.m, title: note ? 'Edit the cancel reminder' : 'Cancel reminder', onclick: e => bdNoteEditor(e.currentTarget, b, rerender) }, ic('bell'))));
      }
      box.append(ul);
      if (!cd.more) cd.more = bdMore(cd, 'All regular payments', () => setSection('recurring'));
    },
  };

  /* ---------- Balances and pots ---------- */
  BWR.balances = {
    update(cd, w, X) {
      const box = bdBox(cd);
      let list = (Array.isArray(X.M.a.balances) ? X.M.a.balances : []).filter(b => b && Number.isFinite(+b.balance));
      if (bwOpt(w, 'pots') === 'hide') list = list.filter(b => b.kind !== 'pot');
      if (!list.length) { cd.setSub(''); box.append(h('p', { class: 'fvb-note', text: 'No balances yet. They arrive with a bank update.' })); return; }
      const byName = bwOpt(w, 'sort') === 'name';
      list = list.slice().sort((a, b) => (byName ? String(a.name || a.acct).localeCompare(String(b.name || b.acct)) : b.balance - a.balance));
      const total = sum(list, b => +b.balance);
      const asOf = list.map(b => b.asOf).filter(validIso).sort().pop();
      cd.setSub(asOf ? 'As of ' + fDayW(dnum(asOf)) : '');
      box.append(bdBig(gbp(total), 'in total', total < 0 ? 'bad' : ''));
      const ul = h('ul', { class: 'fv-list' });
      for (const b of list.slice(0, 12)) {
        const name = b.name || (X.M.acctNames && X.M.acctNames[b.acct]) || 'Account';
        ul.append(h('li', null, h('div', { class: 'fv-row static' }, h('span', { class: 'fvb-acct-ic' }, ic(b.kind === 'pot' ? 'piggy-bank' : 'landmark')),
          h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-row-t', text: name }), b.kind === 'pot' ? h('span', { class: 'fv-row-s', text: 'Pot' }) : null),
          amt(gbp2(b.balance), 'fv-row-v' + (b.balance < 0 ? ' bad' : '')))));
      }
      box.append(ul);
    },
  };

  /* ---------- Net worth trend ---------- */
  BWR.networth = {
    chart: 170,
    update(cd, w, X) {
      const box = bdBox(cd);
      const hist = (Array.isArray(X.M.a.balance_history) ? X.M.a.balance_history : []).filter(p => p && validIso(p.date) && Number.isFinite(+p.total));
      const span = bwOpt(w, 'span');
      const end = X.M.anchor;
      const from = span === 'All' ? -Infinity : span === '1Y' ? addMonths(end, -12) : span === '3M' ? addMonths(end, -3) : addMonths(end, -6);
      const pts = hist.filter(p => dnum(p.date) >= from).map(p => [dnum(p.date) * DAY_MS, round2(+p.total)]);
      if (pts.length < 2) { cd.setSub(''); cd.setEmpty('Builds up with each bank update.'); box.append(h('span')); return; }
      const now = pts[pts.length - 1][1], first = pts[0][1], d = now - first;
      cd.setSub(`Since ${fDayY(Math.round(pts[0][0] / DAY_MS))}`);
      box.append(h('div', { class: 'fvb-nw' }, amt(gbp(now), 'fvb-big-v'), h('span', { class: 'fvb-big-w' }, bdDelta(d, d >= 0))));
      const t = tk();
      const c = C1.draw(cd, bdKey(w), base({
        grid: FX.grid({ top: 8, left: 4, right: 8, bottom: 4 }),
        tooltip: C1.tooltip({ trigger: 'axis', formatter: ps => C1.tip(fDayY(Math.round(ps[0].value[0] / DAY_MS)), [{ c: t.accent, v: bdTipMoney(ps[0].value[1]), k: 'All balances' }]) }),
        xAxis: FX.xTime(), yAxis: FX.yAxis({ ticks: 2, fmt: bdAxis(), extra: { scale: true } }),
        series: [FX.area({ id: 'nw', data: pts, color: t.accent, area: 0.2 }), FX.pulse({ id: 'nw-now', at: pts[pts.length - 1], color: t.accent })],
      }));
      FX.live(c);
    },
  };

  /* ---------- Cash flow ---------- */
  BWR.cashflow = {
    chart: 200,
    update(cd, w, X) {
      const M = X.M; const box = bdBox(cd); const q = pred();
      const n = Number(bwOpt(w, 'months')) || 6;
      const m1 = monthIdx(M.anchor), m0 = Math.max(monthIdx(M.minN), m1 - n + 1);
      const months = []; for (let mi = m0; mi <= m1; mi++) months.push(mi);
      const inc = months.map(() => 0), out = months.map(() => 0);
      for (const t of M.tx) { const i = monthIdx(t.n) - m0; if (i < 0 || i >= months.length || !q(t)) continue; if (t.kind === 'income') inc[i] += t.inc; else if (t.kind === 'spend') out[i] += t.s; }
      const net = months.map((_, i) => round2(inc[i] - out[i]));
      const kept = sum(net, v => v);
      cd.setSub(`Last ${months.length} month${months.length === 1 ? '' : 's'} · click a month to see it`);
      box.append(h('p', { class: 'fvb-line' }, kept >= 0 ? 'Kept ' : 'Spent more than came in by ', amt(gbp(Math.abs(kept))), h('span', { class: 'mute', text: ` over ${months.length} month${months.length === 1 ? '' : 's'}` })));
      const t = tk();
      const c = C1.draw(cd, bdKey(w), base({
        grid: FX.grid({ top: 26, left: 4, right: 8, bottom: 4 }),
        legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: t.muted, fontSize: 11, fontFamily: FONT } },
        tooltip: C1.tooltip({ trigger: 'axis', pointer: 'shadow', formatter: ps => { const i = ps[0].dataIndex; return C1.tip(fMonth(months[i]), [{ c: t.income, box: true, v: bdTipMoney(inc[i]), k: 'Money in' }, { c: t.accent, box: true, v: bdTipMoney(out[i]), k: 'Spent' }, { c: t.text, v: bdTipMoney(net[i]), k: net[i] >= 0 ? 'Kept' : 'Short' }]); } }),
        xAxis: C1.xCat(months.map(mi => fMonthS(mi, months.length > 6)), { line: true }), yAxis: FX.yAxis({ ticks: 3, fmt: bdAxis() }),
        series: [FX.bars({ id: 'in', name: 'Money in', data: inc.map(round2), color: t.income, width: 14, gap: '10%' }), FX.bars({ id: 'out', name: 'Spent', data: out.map(round2), color: t.accent, width: 14 }),
          FX.smoothLine({ id: 'net', name: 'Kept', data: net, color: t.text, width: 1.5, symbols: true, symbolSize: 5 })],
      }));
      on(c, 'click', p => { const mi = months[p.dataIndex]; if (mi != null) setCustomRange(monthStart(mi), Math.min(monthEnd(mi), M.anchor)); });
    },
  };

  /* ---------- Income ---------- */
  BWR.income = {
    update(cd, w, X) {
      const M = X.M; const box = bdBox(cd); const q = pred();
      const mi = monthIdx(M.anchor);
      const per = k => sum(M.tx.filter(t => t.kind === 'income' && monthIdx(t.n) === k && q(t)), t => t.inc);
      const now = per(mi);
      const prev = [mi - 1, mi - 2, mi - 3].filter(k => monthEnd(k) >= M.minN).map(per);
      const usual = prev.length ? median(prev) : null;
      cd.setSub(fMonth(mi));
      box.append(bdBig(gbp(now), 'came in'));
      if (usual != null && usual > 0) box.append(h('p', { class: 'fvb-line' }, h('span', { class: 'mute', text: 'Usual month: ' }), amt(gbp(usual)), now >= usual * 0.95 ? h('span', { class: 'mute', text: ' · all in' }) : null));
      const B = X.brief();
      if (B && B.hasSalary) box.append(h('p', { class: 'fvb-line' }, ic('calendar-days'), ` Next payday ${dayWord(B.cycle.next, M.anchor).toLowerCase() === 'today' ? 'today' : fDayW(B.cycle.next)}`));
      if (bwOpt(w, 'sources') === 'on' && X.size(w) !== 's') {
        const by = new Map(); for (const t of M.tx) if (t.kind === 'income' && monthIdx(t.n) === mi && q(t)) by.set(t.m, (by.get(t.m) || 0) + t.inc);
        const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
        if (top.length) {
          const ul = h('ul', { class: 'fv-list compact' });
          for (const [m, v] of top) ul.append(h('li', null, h('div', { class: 'fv-row static' }, C1.tileEl(m, 'Income', 'xs'), h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-row-t', text: m })), amt(gbp(v), 'fv-row-v in'))));
          box.append(ul);
        }
      }
    },
  };

  /* ---------- Big or unusual payments ---------- */
  function bdUnusual(M, rows, min) {
    const out = [];
    for (const t of rows) {
      if (t.kind !== 'spend' || !(t.s > 0)) continue;
      const st = M.mstats.get(t.m); const why = [];
      if (t.s >= min) why.push('Big');
      if (st && st.count >= 3 && st.med > 0 && t.s >= 2.5 * st.med && t.s >= 20) why.push(`${nf1.format(t.s / st.med)}× usual`);
      if (st && st.first === t.n && st.count <= 2 && t.s >= min / 2) why.push('New place');
      if (why.length) out.push({ t, why, score: t.s * (why.length > 1 ? 1.5 : 1) });
    }
    return out.sort((a, b) => b.score - a.score);
  }
  BWR.big = {
    update(cd, w, X) {
      const ctx = X.ctxOf(w); const box = bdBox(cd);
      const min = Number(bwOpt(w, 'min')) || 100;
      const list = bdUnusual(X.M, ctx.cur.spend, min);
      cd.setSub(bdPeriodSub(ctx, w));
      if (!list.length) { box.append(h('p', { class: 'fvb-note good', text: `Nothing over ${gbp(min)} or out of the ordinary in these dates.` })); return; }
      const ul = h('ul', { class: 'fv-list' });
      for (const x of list.slice(0, X.size(w) === 's' ? 4 : 7)) {
        const t = x.t;
        ul.append(h('li', null, h('button', { type: 'button', class: 'fv-row fsym-host', onclick: () => openMerchant(t.m) }, C1.tileEl(t.m, t.c, 'sm'),
          h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-row-t', text: t.m }), h('span', { class: 'fv-row-s' }, fDayW(t.n), ' · ', ...x.why.map(y => h('span', { class: 'fvb-why', text: y })))),
          amt(gbp2(t.s), 'fv-row-v'))));
      }
      box.append(ul);
    },
  };

  /* ---------- Spend per trip ---------- */
  BWR.trips = {
    update(cd, w, X) {
      const ctx = X.ctxOf(w); const box = bdBox(cd);
      const all = bwOpt(w, 'which') === 'all';
      const list = ccTripTotals(ctx, all).slice(0, Number(bwOpt(w, 'top')) || 6);
      cd.setSub(all ? 'Your latest trips' : bdPeriodSub(ctx, w));
      if (!list.length) {
        const on2 = typeof TravelStore !== 'undefined' && TravelStore && TravelStore.on && TravelStore.on();
        box.append(h('p', { class: 'fvb-note', text: on2 ? 'No trips yet.' : 'No trips yet. A run of card payments abroad shows here as a trip; turning on Travel (Settings > Travel) adds the ones on your calendar.' }));
        return;
      }
      const ul = h('ul', { class: 'fv-list' });
      for (const x of list) ul.append(h('li', null, ccTripRowEl(x)));
      box.append(ul);
    },
  };

  /* ---------- Daily spend calendar ---------- */
  BWR.heatmap = {
    update(cd, w, X) {
      const M = X.M; const box = bdBox(cd); const q = pred(); const t = tk();
      const weeks = Number(bwOpt(w, 'weeks')) || 13;
      const end = M.anchor, ws = weekStart(end), from = ws - (weeks - 1) * 7;
      const daily = new Array(weeks * 7).fill(0);
      for (const x of M.tx) if (x.kind === 'spend' && x.n >= from && x.n <= end && q(x)) daily[x.n - from] += x.s;
      const vals = daily.slice(0, end - from + 1).filter(v => v > 0.004);
      const edges = [0.2, 0.4, 0.6, 0.8].map(p => quantile(vals, p));
      const bin = v => (v <= 0.004 ? -1 : edges.filter(e => v > e).length);
      const ramp = [t.seq[1], t.seq[2], t.seq[3], t.seq[4], t.seq[6]];
      const zeroDays = daily.slice(0, end - from + 1).filter(v => v <= 0.004).length;
      cd.setSub(`${weeks} weeks · ${zeroDays} no-spend day${zeroDays === 1 ? '' : 's'}`);
      const grid = h('div', { class: 'fvb-heat', style: { '--weeks': weeks }, role: 'grid', 'aria-label': 'Spending by day' });
      // One column per week (Monday on top), one row per weekday.
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < weeks; c++) {
          const n = from + c * 7 + r;
          if (n > end) { grid.append(h('i', { class: 'fvb-hc future', style: { gridRow: r + 1, gridColumn: c + 2 } })); continue; }
          const v = daily[n - from]; const b = bin(v);
          const tip = `${fDayW(n)} · ${v > 0.004 ? (bdHidden() ? '•••' : gbp2(v)) : 'nothing spent'}`;
          grid.append(h('button', { type: 'button', class: 'fvb-hc' + (n === end ? ' today' : '') + (b < 0 ? ' zero' : ''), style: { gridRow: r + 1, gridColumn: c + 2, '--hc': b < 0 ? '' : ramp[b] }, title: tip, 'aria-label': tip, onclick: () => openDay(n) }));
        }
      }
      for (let r = 0; r < 7; r += 2) grid.append(h('span', { class: 'fvb-hl', style: { gridRow: r + 1, gridColumn: 1 }, text: WD[r].slice(0, 1) }));
      const months = h('div', { class: 'fvb-heat-m', style: { '--weeks': weeks } });
      let last = -1;
      for (let c = 0; c < weeks; c++) { const mi = monthIdx(from + c * 7); if (mi !== last && dobj(from + c * 7).getUTCDate() <= 7) { months.append(h('span', { style: { gridColumn: c + 2 }, text: fMonthS(mi) })); last = mi; } }
      box.append(months, grid, h('div', { class: 'fvb-heat-k' }, h('span', { text: 'Less' }), ...ramp.map(c => h('i', { style: { background: c } })), h('span', { text: 'More' })));
    },
  };

  /* ---------- Money insights (the money brief) ---------- */
  BWR.insights = {
    update(cd, w, X) {
      const B = X.brief(); const box = bdBox(cd);
      if (!B) { box.append(h('p', { class: 'fvb-note', text: 'Not enough data for insights yet.' })); return; }
      cd.setSub(B.mode === 'cycle' ? 'This pay cycle' : 'This month');
      const ai = MB.ai && MB.ai.key === B.key && MB.ai.mode === B.mode ? MB.ai : null;
      const sents = ai ? ai.sentences : B.sentences;
      const onTop = F.briefOff !== true;   // 2.21: the hero at the top of the page already says the three sentences
      if (onTop) box.append(h('p', { class: 'fvb-note', text: 'Your three sentences are at the top of this page.' }));
      else box.append(h('div', { class: 'fvb-say' }, sents.map(s => h('p', { text: s.text }))));
      if (bwOpt(w, 'cards') === 'on' && Array.isArray(B.insights) && B.insights.length && X.size(w) !== 's') {
        const ul = h('ul', { class: 'fvb-ins' });
        for (const x of B.insights.slice(0, 3)) ul.append(h('li', { class: 'tone-' + (x.tone || 'info') }, ic(x.tone === 'warn' ? 'triangle-alert' : x.tone === 'good' ? 'circle-check' : 'info'), h('div', null, h('b', { text: x.title }), x.sub ? h('span', { text: x.sub }) : null)));
        box.append(ul);
      }
      const acts = h('div', { class: 'fvb-acts' }, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => setSection('overview') }, h('span', { text: 'Open the brief' }), ic('chevron-right')));
      if (!onTop && !ai && typeof mbAiAllowed === 'function' && mbAiAllowed()) acts.append(bdAiButton(cd, w, X, B));
      if (!onTop && ai) acts.append(h('span', { class: 'fvb-src mute' }, ic('sparkles'), ' Worded by Claude, numbers checked'));
      box.append(acts);
    },
  };
  // "Reword with Claude": the brief's own AI route (only the brief's totals go; lib/finance/brief.mjs).
  // The wait has a Cancel; an error says why and what to do.
  function bdAiButton(cd, w, X, B) {
    const wrap = h('span', { class: 'fvb-ai' });
    const go = h('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, ic('sparkles'), h('span', { text: 'Reword with Claude' }));
    wrap.append(go);
    go.onclick = async () => {
      const ac = typeof AbortController === 'function' ? new AbortController() : null;
      wrap.innerHTML = '';
      wrap.append(h('span', { class: 'fvb-wait' }, ic('loader-circle', 'fv-spin'), ' Asking Claude…'), h('button', { type: 'button', class: 'btn-link', text: 'Cancel', onclick: () => { if (ac) ac.abort(); } }));
      try {
        const r = await fetch(`/api/finance/brief?mode=${encodeURIComponent(B.mode)}&ai=1`, { cache: 'no-store', signal: ac ? ac.signal : undefined });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Claude could not reword it just now. Try again in a minute.');
        const a = j.ai;
        if (!a || !Array.isArray(a.sentences) || !a.sentences.length || j.key !== B.key) throw new Error('Claude did not send a wording this time. The plain version stays.');
        const v = MBM.validate({ sentences: a.sentences }, B, mbFmt());
        if (v.replaced >= 3) throw new Error("Claude's numbers did not match yours, so the plain version stays.");
        MB.ai = { key: B.key, mode: B.mode, sentences: v.sentences, model: a.model || '' };
        BWR.insights.update(cd, w, X);
      } catch (e) {
        if (e && e.name === 'AbortError') { BWR.insights.update(cd, w, X); return; }
        const msg = (e && e.message && !/fetch/i.test(e.message)) ? e.message : 'Could not reach the Freeflo server. Is it running?';
        wrap.innerHTML = ''; wrap.append(h('span', { class: 'fvb-err', text: msg }), h('button', { type: 'button', class: 'btn-link', text: 'Try again', onclick: () => BWR.insights.update(cd, w, X) }));
      }
    };
    return wrap;
  }

  /* ---------- Recent transactions ---------- */
  BWR.recent = {
    update(cd, w, X) {
      const ctx = X.ctxOf(w); const box = bdBox(cd); const M = X.M;
      const kind = bwOpt(w, 'kind'), n = Number(bwOpt(w, 'n')) || 10;
      // Card payments the bank has not settled yet come first, labelled Pending (they vanish once settled).
      const pend = (M.pending || []).filter(t => t.n >= ctx.rg.from && t.n <= ctx.rg.to && ctx.p(t) && (kind === 'spend' || kind === 'income' ? t.kind === kind : true));
      const rows = pend.concat((kind === 'spend' ? ctx.cur.spend : kind === 'income' ? ctx.cur.income : ctx.cur.all.filter(t => F.xfer || t.kind !== 'transfer')).slice().sort((a, b) => b.n - a.n || a.i - b.i));
      cd.setSub(bdPeriodSub(ctx, w) + (F.cats.length || F.country || F.merchant || F.accts.length ? ' · with your filters' : ''));
      if (!rows.length) { box.append(h('p', { class: 'fvb-note', text: 'No payments in these dates with these filters.' })); return; }
      PL.ensure(M);
      const ul = h('ul', { class: 'fv-list fvb-tx' + (X.size(w) === 'xl' ? ' wide' : '') });
      let lastDay = null;
      for (const t of rows.slice(0, n)) {
        if (X.size(w) !== 's' && t.n !== lastDay) { ul.append(h('li', { class: 'fvb-day', text: dayWord(t.n, M.anchor) })); lastDay = t.n; }
        const abroad = t.pc && t.pc !== M._plHome && t.pc !== 'HOME';
        const subs = [X.size(w) === 's' ? fDay(t.n) : '', t.c, abroad ? PL.label(t.pc) : ''].filter(Boolean).join(' · ');
        const local = abroad && t.plc && t.pla > 0 && t.plc !== CUR ? fmtCcy(t.pla, t.plc) : '';
        if (t.pending) {
          ul.append(h('li', null, h('div', { class: 'fv-row fsym-host' }, C1.tileEl(t.m, 'Uncategorised', 'sm'),
            h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-row-t', text: t.m }), h('span', { class: 'fv-row-s' }, X.size(w) === 's' ? fDay(t.n) + ' · ' : '', h('b', { text: 'Pending' }), ' · not settled yet')),
            h('span', { class: 'fv-cc-v' }, amt(t.kind === 'income' ? '+' + gbp2(t.inc) : gbp2(t.s), 'fv-row-v' + (t.kind === 'income' ? ' in' : ''))))));
          continue;
        }
        ul.append(h('li', null, h('button', { type: 'button', class: 'fv-row fsym-host', onclick: () => openMerchant(t.m) }, C1.tileEl(t.m, t.c, 'sm'),
          h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-row-t', text: t.m }), h('span', { class: 'fv-row-s' }, abroad ? h('span', { class: 'fvb-txflag', html: PL.flag(t.pc) }) : null, subs)),
          h('span', { class: 'fv-cc-v' }, amt(t.kind === 'income' ? '+' + gbp2(t.inc) : t.kind === 'spend' ? gbp2(t.s) : gbp2(t.a), 'fv-row-v' + (t.kind === 'income' ? ' in' : '')), local ? h('small', { class: 'fv-amt', text: local }) : null))));
      }
      box.append(ul);
      if (!cd.more) cd.more = bdMore(cd, 'All transactions', () => setSection('transactions'));
    },
  };

  /* ---------- Fun: no-spend days, a savings goal, best weeks ---------- */
  // bdFun(M, o) -> the numbers (FinanceView.fun() hands them to anyone: the gamification work hooks in here).
  //   noSpend: {current, best, bestYear, month, monthDays, last14: [{n, ok}]}   o.bills 'ignore' | 'count', o.small (amount)
  //   weeks:   {cheapest: {from, to, total} | null, thisWeek: {from, total, rank, of}, cheapestMonth: {mi, total} | null}   o.what 'day' | 'all'
  function bdDayToDay(M) {
    const rec = new Set(M.recurring.filter(r => r.active).map(r => r.m));
    return t => t.kind === 'spend' && !rec.has(t.m) && !MBM.isFixed(t.c);
  }
  function bdFun(M, o) {
    o = o || {};
    const dayOnly = bdDayToDay(M);
    const counts = o.bills === 'count' ? (t => t.kind === 'spend') : dayOnly;
    const small = Number(o.small) || 0;
    const today = M.anchor;
    const yr0 = monthStart(Math.floor(monthIdx(today) / 12) * 12);
    const spentOn = new Map();
    for (const t of M.tx) if (counts(t) && t.s > small) spentOn.set(t.n, (spentOn.get(t.n) || 0) + t.s);
    const ok = n => !(spentOn.get(n) > 0.004);
    // Today counts only once it is a no-spend day so far; a streak is the run of days up to now.
    let current = 0; for (let n = ok(today) ? today : today - 1; n >= M.minN && ok(n); n--) current++;
    let best = 0, bestYear = 0, run = 0, runY = 0;
    for (let n = M.minN; n <= today; n++) { if (ok(n)) { run++; if (n >= yr0) runY++; } else { run = 0; runY = 0; } best = Math.max(best, run); bestYear = Math.max(bestYear, runY); }
    const ms = monthStart(monthIdx(today)); let month = 0; for (let n = ms; n <= today; n++) if (ok(n)) month++;
    const last14 = []; for (let n = today - 13; n <= today; n++) last14.push({ n, ok: n >= M.minN && ok(n) });
    // Weeks (Monday to Sunday) this year: the cheapest full one, and this week against them.
    const wk = o.what === 'all' ? (t => t.kind === 'spend') : dayOnly;
    const wTot = new Map();
    for (const t of M.tx) if (t.n >= yr0 && wk(t)) { const s = weekStart(t.n); wTot.set(s, (wTot.get(s) || 0) + t.s); }
    const thisWs = weekStart(today);
    const full = []; for (let s = Math.max(weekStart(yr0) + (weekStart(yr0) < yr0 ? 7 : 0), weekStart(M.minN) + 7); s + 6 < thisWs + 7 && s < thisWs; s += 7) full.push({ from: s, to: s + 6, total: round2(wTot.get(s) || 0) });
    const cheapest = full.length ? full.reduce((a, b) => (b.total < a.total ? b : a)) : null;
    const thisTotal = round2(wTot.get(thisWs) || 0);
    const rank = full.filter(x => x.total < thisTotal).length + 1;
    const mTot = new Map(); for (const t of M.tx) if (t.n >= yr0 && wk(t)) { const k = monthIdx(t.n); mTot.set(k, (mTot.get(k) || 0) + t.s); }
    const fullMonths = [...mTot.entries()].filter(([k]) => k < monthIdx(today) && monthStart(k) >= M.minN);
    const cm = fullMonths.length ? fullMonths.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;
    return {
      noSpend: { current, best, bestYear, month, monthDays: today - ms + 1, last14 },
      weeks: { cheapest, thisWeek: { from: thisWs, total: thisTotal, rank, of: full.length + 1, daysIn: today - thisWs + 1 }, cheapestMonth: cm ? { mi: cm[0], total: round2(cm[1]) } : null },
    };
  }
  BWR.streak = {
    update(cd, w, X) {
      const box = bdBox(cd);
      const F2 = bdFun(X.M, { bills: bwOpt(w, 'bills'), small: bwOpt(w, 'small') }).noSpend;
      cd.setSub(F2.current ? 'Keep it going' : 'A day without day-to-day spending starts one');
      box.append(h('div', { class: 'fvb-streak' + (F2.current >= 2 ? ' is-hot' : '') }, h('span', { class: 'fvb-flame', 'aria-hidden': 'true' }, ic('flame')),
        h('div', null, h('b', { class: 'fvb-big-v', text: String(F2.current) }), h('span', { class: 'fvb-big-w', text: F2.current === 1 ? ' no-spend day in a row' : ' no-spend days in a row' }))));
      box.append(h('div', { class: 'fvb-dots', 'aria-label': 'The last 14 days' }, F2.last14.map(d => h('i', { class: d.ok ? 'ok' : '', title: fDayW(d.n) + (d.ok ? ' · no spending' : ' · spent') }))));
      box.append(h('p', { class: 'fvb-line mute', text: `${F2.month} of ${F2.monthDays} days this month · best this year ${F2.bestYear}` + (F2.best > F2.bestYear ? ` · best ever ${F2.best}` : '') }));
    },
  };
  BWR.goal = {
    update(cd, w, X) {
      const box = bdBox(cd); const M = X.M;
      const target = Number(bwOpt(w, 'target')) || 1000;
      const acct = bwOpt(w, 'acct'); const by = bwOpt(w, 'by');
      const bals = (Array.isArray(M.a.balances) ? M.a.balances : []).filter(b => b && Number.isFinite(+b.balance));
      let have = null, what = '';
      if (acct === 'kept') {
        const yr0 = monthStart(Math.floor(monthIdx(M.anchor) / 12) * 12);
        have = round2(sum(M.tx.filter(t => t.n >= yr0 && t.kind === 'income'), t => t.inc) - sum(M.tx.filter(t => t.n >= yr0 && t.kind === 'spend'), t => t.s));
        what = 'kept this year';
      } else if (acct && acct !== 'all') {
        const b = bals.find(x => x.acct === acct); have = b ? +b.balance : null; what = b ? (b.name || 'that account') : '';
      } else if (bals.length) { have = sum(bals, b => +b.balance); what = 'all your balances'; }
      const name = bwOpt(w, 'name') || 'Savings goal';
      if (bwOpt(w, 'name')) cd.el.querySelector('.fv-card-t h3').textContent = name;
      if (have == null) { cd.setSub(''); box.append(h('p', { class: 'fvb-note', text: acct && acct !== 'all' && acct !== 'kept' ? 'That account has no balance here any more. Pick another in the settings.' : 'A goal needs balances: they arrive with a bank update. Or set it to count what you kept this year.' })); return; }
      const frac = clamp(have / target, 0, 1);
      cd.setSub(`Counting ${what}`);
      const ring = h('div', { class: 'fvb-goal' + (frac >= 1 ? ' done' : ''), style: { '--f': (frac * 100).toFixed(1) } },
        h('div', { class: 'fvb-ring', 'aria-hidden': 'true' }, h('span', { text: pct(frac) })),
        h('div', null, h('div', null, amt(gbp(Math.max(0, have)), 'fvb-big-v'), h('span', { class: 'fvb-big-w' }, ' of ', amt(gbp(target)))),
          frac >= 1 ? h('p', { class: 'fvb-line good', text: 'Goal reached.' }) : h('p', { class: 'fvb-line' }, amt(gbp(target - Math.max(0, have))), h('span', { class: 'mute', text: ' to go' }))));
      box.append(ring);
      if (frac < 1 && validIso(by)) {
        const months = Math.max(1, (dnum(by) - M.anchor) / 30.44);
        box.append(h('p', { class: 'fvb-line mute' }, 'About ', amt(gbp((target - Math.max(0, have)) / months)), ` a month to reach it by ${fDayY(dnum(by))}`));
      }
    },
  };
  BWR.weeks = {
    update(cd, w, X) {
      const box = bdBox(cd);
      const W = bdFun(X.M, { what: bwOpt(w, 'what') }).weeks;
      cd.setSub(bwOpt(w, 'what') === 'all' ? 'Everything you spent' : 'Day-to-day spending (no bills)');
      if (!W.cheapest) { box.append(h('p', { class: 'fvb-note', text: 'A full week of this year is needed first.' })); return; }
      const beat = W.thisWeek.total < W.cheapest.total;
      box.append(h('div', { class: 'fvb-trophy' + (beat ? ' is-beat' : '') }, h('span', { class: 'fvb-trophy-ic', 'aria-hidden': 'true' }, ic('trophy')),
        h('div', null, h('span', { class: 'mute', text: 'Cheapest week this year' }), h('div', null, amt(gbp(W.cheapest.total), 'fvb-big-v')), h('span', { class: 'fv-row-s', text: fRange(W.cheapest.from, W.cheapest.to) }))));
      box.append(h('p', { class: 'fvb-line' }, 'This week so far ', amt(gbp(W.thisWeek.total)), h('span', { class: 'mute', text: beat ? ` · on course for a new record (day ${W.thisWeek.daysIn})` : ` · ${W.thisWeek.rank === 1 ? 'the lowest yet' : 'number ' + W.thisWeek.rank + ' of ' + W.thisWeek.of}` })));
      if (W.cheapestMonth && X.size(w) !== 's') box.append(h('p', { class: 'fvb-line mute' }, `Lowest month: ${fMonth(W.cheapestMonth.mi)}, `, amt(gbp(W.cheapestMonth.total))));
    },
  };

  /* ---------- Extras: payday countdown, travel passport, spare change, what if I cut ---------- */
  BWR.payday = {
    update(cd, w, X) {
      const B = X.brief(); const box = bdBox(cd);
      if (!B) { box.append(h('p', { class: 'fvb-note', text: 'Not enough data yet.' })); return; }
      const cyc = B.cycle; const left = Math.max(0, cyc.daysLeft);
      const frac = clamp((cyc.day + 1) / Math.max(1, cyc.len), 0, 1);
      cd.setSub(B.mode === 'cycle' ? `Payday ${fDayW(cyc.next)}` : `No salary found yet: counting to the end of ${fd(cyc.start, { month: 'long' })}`);
      const word = left === 0 ? (B.mode === 'cycle' ? 'Payday is today' : 'Last day of the month') : left === 1 ? 'day to go' : 'days to go';
      box.append(h('div', { class: 'fvb-goal fvb-payday', style: { '--f': (frac * 100).toFixed(1) } },
        h('div', { class: 'fvb-ring', 'aria-hidden': 'true' }, h('span', { text: left ? String(left) : '0' })),
        h('div', null, h('b', { class: 'fvb-big-v', text: left ? String(left) : 'Today' }), h('span', { class: 'fvb-big-w', text: ' ' + word }),
          h('p', { class: 'fvb-line mute', text: `Day ${cyc.day + 1} of ${cyc.len} · ${pct(frac)} through` }))));
      if (bwOpt(w, 'pace') === 'on' && B.usual != null) {
        const d = B.spent - B.usual;
        box.append(h('p', { class: 'fvb-line' }, 'Spent ', amt(gbp(B.spent)), h('span', { class: 'mute', text: ' so far · ' }), bdDelta(d, d <= 0), h('span', { class: 'mute', text: d <= 0 ? ' under a usual cycle' : ' over a usual cycle' })));
      }
    },
  };
  BWR.passport = {
    update(cd, w, X) {
      const box = bdBox(cd); const M = X.M;
      PL.ensure(M);
      const all = PL.agg(M.tx.filter(t => t.kind === 'spend')).filter(x => x.abroad && !String(x.cc).startsWith('X:'));
      const sort = bwOpt(w, 'sort');
      all.sort((a, b) => (sort === 'spend' ? b.total - a.total : sort === 'last' ? b.last - a.last : a.first - b.first));
      const trips = PL.trips(M).filter(t => t.cc !== M._plHome);
      cd.setSub(all.length ? `${all.length} countr${all.length === 1 ? 'y' : 'ies'} · ${trips.length} trip${trips.length === 1 ? '' : 's'}` : '');
      if (!all.length) { box.append(h('p', { class: 'fvb-note', text: 'No stamps yet. Pay for something abroad and the country lands here, with its flag.' })); return; }
      const grid = h('div', { class: 'fvb-stamps' });
      all.slice(0, X.size(w) === 's' ? 4 : 24).forEach((x, i) => {
        const tn = x.trips.size;
        grid.append(h('button', { type: 'button', class: 'fvb-stamp', style: { '--i': i, '--c': ccColor(x.cc), '--r': ((i * 37) % 7 - 3) * 0.6 + 'deg' }, title: `Only ${x.label}`, onclick: () => { setCountry(x.cc); setSection('countries'); } },
          h('span', { class: 'fvb-stamp-f', html: PL.flag(x.cc) }),
          h('b', { text: x.label }),
          h('span', { class: 'fvb-stamp-d', text: 'Since ' + fd(x.first, { month: 'short', year: 'numeric' }) }),
          h('span', { class: 'fvb-stamp-s' }, amt(gbp(x.total)), tn ? ` · ${tn} trip${tn === 1 ? '' : 's'}` : '')));
      });
      box.append(grid);
    },
  };
  BWR.roundup = {
    update(cd, w, X) {
      const box = bdBox(cd); const M = X.M;
      const to = Number(bwOpt(w, 'to')) || 1;
      const yr0 = monthStart(Math.floor(monthIdx(M.anchor) / 12) * 12);
      let total = 0, n = 0; const months = new Map();
      for (const t of M.tx) {
        if (t.kind !== 'spend' || t.n < yr0 || !(t.s > 0) || t.s >= 250) continue;   // card-sized payments only
        const up = round2(Math.ceil(t.s / to - 1e-9) * to - t.s);
        if (up <= 0.004 || up >= to) continue;
        total += up; n++; const mi = monthIdx(t.n); months.set(mi, (months.get(mi) || 0) + up);
      }
      cd.setSub(`This year · to the next ${curBare(String(to))}`);
      if (!n) { box.append(h('p', { class: 'fvb-note', text: 'No card payments to round up this year yet.' })); return; }
      box.append(bdBig(gbp(total), 'of spare change'));
      box.append(h('p', { class: 'fvb-line mute', text: `From ${nf0.format(n)} payments. Put aside as you go, that is ${gbp(total / Math.max(1, months.size))} a month without noticing.` }));
      if (X.size(w) !== 's' && months.size > 1) {
        const ms = [...months.entries()].sort((a, b) => a[0] - b[0]);
        const mx = Math.max(...ms.map(e => e[1]));
        box.append(h('div', { class: 'fvb-minibars', 'aria-hidden': 'true' }, ms.map(([mi, v]) => h('span', { title: `${fMonth(mi)} · ${bdHidden() ? '•••' : gbp2(v)}` }, h('i', { style: { height: Math.max(8, v / mx * 100).toFixed(0) + '%' } }), h('small', { text: fMonthS(mi).slice(0, 1) })))));
      }
    },
  };
  BWR.whatif = {
    update(cd, w, X) {
      const box = bdBox(cd); const M = X.M;
      const from = M.anchor - 89;
      const tot = {}; for (const t of M.tx) if (t.kind === 'spend' && t.n >= from && t.n <= M.anchor) tot[t.c] = (tot[t.c] || 0) + t.s;
      let cat = bwOpt(w, 'cat');
      if (cat === 'auto' || !tot[cat]) {
        const pickable = Object.keys(tot).filter(c => tot[c] > 0 && c !== 'Uncategorised' && !MBM.isFixed(c) && !bdIsBill(c));
        cat = pickable.sort((a, b) => tot[b] - tot[a])[0] || '';
      }
      if (!cat) { box.append(h('p', { class: 'fvb-note', text: 'Not enough spending in the last three months to work this out.' })); return; }
      const days = Math.max(30, Math.min(90, M.anchor - Math.max(M.minN, from) + 1));
      const monthly = (tot[cat] || 0) / days * 30.44;
      const cut = Number(bwOpt(w, 'cut')) || 25;
      const save = monthly * cut / 100;
      const allMonthly = Object.values(tot).reduce((s2, v) => s2 + Math.max(0, v), 0) / days * 30.44;
      cd.setSub(`${cut === 100 ? 'No more' : 'Cutting'} ${cat}${cut === 100 ? '' : ' by ' + (cut === 50 ? 'half' : cut + '%')}`);
      box.append(h('div', { class: 'fvb-whatif', style: { '--c': catColor(cat) } }, C1.catIconEl(cat, { size: 'md' }), h('div', null, bdBig(gbp(save * 12), 'a year'), h('span', { class: 'fv-row-s' }, amt(gbp(save)), ' a month'))));
      box.append(h('p', { class: 'fvb-line mute' }, 'You spend about ', amt(gbp(monthly)), ` a month on ${cat}` + (allMonthly > 0 ? ` (${pct(monthly / allMonthly)} of your spending).` : '.')));
      const goal = X.L.w.find(x => x.t === 'goal');
      if (goal && save > 1) {
        const target = Number(bwOpt(goal, 'target')) || 0;
        if (target > 0) box.append(h('p', { class: 'fvb-line' }, ic('target'), ` Put toward ${bwOpt(goal, 'name') || 'your savings goal'}, that alone reaches it in about ${nf0.format(Math.max(1, Math.ceil(target / save)))} months.`));
      }
    },
  };
