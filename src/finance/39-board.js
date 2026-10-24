  // @part 39-board.js · NEW (2.16) · OWNER: FUX (My money: the section, its quick filters, the everyday strip, the widget frames)
  // ----- My money -----
  // The page you make yourself (25-board-model.js has the catalogue and the saved layout,
  // 39-board-widgets.js the widgets, 39-board-edit.js Customise and Add widget). On top:
  //   the quick filters (this week / this month / last month / 3 months / this year, a trip,
  //   a country, a category): they are the page's filters, so every widget and every other
  //   section follows them; a widget can keep its own dates instead (its settings);
  //   the everyday strip: spent today, safe to spend until payday, the next bill, unusual
  //   this week (each opens where it comes from);
  //   the layout menu (Simple, Detailed, Start from scratch, plain words, the strip), Customise,
  //   Hide amounts (Home's switch: the same choice everywhere).
  // Widgets live in the section grid as cards keyed by their id (data-wid, data-flip), so a
  // change to the layout reconciles in place (bdSync) and the others glide (Home's FLIP,
  // homeFlip in 12-home-grid.js, when it is there). Entrances are the section's own (once per visit).
  SEC_OPTS.board = { kpis: false, filters: false };
  const BDR = { grid: null, el: null, editing: false, edit: null, tmp: null };

  BUILD.board = g => {
    const E = BDR.el = {};
    BDR.grid = g; g.classList.add('fvb-grid');
    BDR.tmp = h('div');
    E.top = h('div', { class: 'fvb-top', style: { '--span': 12, '--span-md': 12 } });
    E.quick = h('div', { class: 'fvb-quick', role: 'toolbar', 'aria-label': 'Quick filters' });
    E.tools = h('div', { class: 'fvb-tools' });
    E.top.append(E.quick, E.tools);
    E.intro = h('div', { class: 'fvb-intro', style: { '--span': 12, '--span-md': 12 }, hidden: true });
    E.strip = h('div', { class: 'fvb-strip', style: { '--span': 12, '--span-md': 12 }, role: 'group', 'aria-label': 'Today at a glance' });
    E.empty = h('div', { class: 'fvb-empty', style: { '--span': 12, '--span-md': 12 }, hidden: true });
    g.append(E.top, E.intro, E.strip, E.empty);
    BDR.frames = new Map();
    S.onEsc = () => {
      if (BDR.editing) { bdEdit(false); return true; }
      if (F.trip) { setTrip(null); return true; }
      return false;
    };
    // A new visit starts out of Customise (a Customise left open on another visit is put away).
    BDR.editing = false;
    if (BDR.edit) { BDR.edit.destroy(); BDR.edit = null; }
    BDR.bar = null;
    if (R.root) R.root.classList.remove('fvb-editing');
  };
  UPDATE.board = ctx => {
    const X = bdPass(ctx);
    R.root.classList.toggle('fv-amts-hidden', bdHidden());
    bdPaintTools(X); bdPaintQuick(X); bdPaintIntro(X); bdPaintStrip(X);
    bdSync(X);
    bdUpdateFrames(X);
    // The first visit: the widgets rise in as they come into view, like every section's cards.
    if (R.entering) MK.inView(BDR.grid, { sel: ':scope > .fvb-w', step: 60, max: 420, distance: 14 });
  };

  /** One update pass: memoised bits every widget can share. */
  function bdPass(ctx) {
    const L = boardGet(); const memo = {};
    const lazy = (k, f) => (k in memo ? memo[k] : (memo[k] = f()));
    const sizeOf = new Map(L.w.map(w => [w.i, w.s]));
    return {
      ctx, M: ctx.M, L, simple: L.style === 'simple', lazy,
      size: w => sizeOf.get(w.i) || w.s,
      ctxOf: w => { const p = bwOpt(w, 'period'); return !p || p === 'filter' ? ctx : lazy('ctx:' + p, () => bdCtxFor(p)); },
      brief: () => lazy('B', () => { try { return mbData(); } catch (e) { return null; } }),
    };
  }
  /** makeCtx for another date preset (the filters stay); F is put back at once and nothing is saved. */
  function bdCtxFor(p) {
    const keep = { preset: F.preset, from: F.from, to: F.to, gran: F.gran };
    try { F.preset = p; F.from = F.to = null; F.gran = autoGran(getRange().len); return makeCtx(); }
    finally { Object.assign(F, keep); }
  }

  /* ---------- tools: the layout menu, Customise, Hide amounts ---------- */
  function bdPaintTools(X) {
    const E = BDR.el; E.tools.innerHTML = '';
    const L = X.L;
    const name = L.preset === 'custom' ? 'Your own' : (BD_PRESET_INFO[L.preset] || BD_PRESET_INFO.simple).label;
    E.tools.append(
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm fvb-layout', 'aria-haspopup': 'menu', title: 'Presets, plain words and the everyday strip', onclick: e => bdLayoutMenu(e.currentTarget) },
        ic('layout-template'), h('span', { text: name }), ic('chevron-down')),
      h('button', { type: 'button', class: 'btn btn-secondary btn-sm fvb-cust', 'aria-pressed': BDR.editing ? 'true' : 'false', onclick: () => bdEdit(!BDR.editing) },
        ic(BDR.editing ? 'check' : 'pencil'), h('span', { text: BDR.editing ? 'Done' : 'Customise' })),
      h('button', { type: 'button', class: 'btn-icon btn-sm fvb-eye' + (bdHidden() ? ' on' : ''), 'aria-pressed': bdHidden() ? 'true' : 'false',
        'aria-label': bdHidden() ? 'Show amounts' : 'Hide amounts', title: bdHidden() ? 'Show amounts' : 'Hide amounts (hover one to see it; Home follows)', onclick: () => bdToggleAmounts() }, ic(bdHidden() ? 'eye-off' : 'eye')));
  }
  function bdToggleAmounts() {
    if (typeof homeSetAmountsHidden !== 'function') return;
    homeSetAmountsHidden(!bdHidden());
    if (R.ctx && R.sectionId === 'board') { R.noAnim = true; try { UPDATE.board(R.ctx); } finally { R.noAnim = false; } }
    else if (R.root) R.root.classList.toggle('fv-amts-hidden', bdHidden());
  }
  function bdLayoutMenu(anchor) {
    const L = boardGet();
    const pick = name => {
      if (L.preset === name) return;
      const next = bdPreset(name);
      next.strip = L.strip;
      boardSave(next, `${BD_PRESET_INFO[name].label} layout`, { icon: BD_PRESET_INFO[name].icon });
    };
    const items = [{ heading: 'Start from' }];
    for (const k of ['simple', 'detailed', 'scratch']) items.push({ label: BD_PRESET_INFO[k].label, icon: BD_PRESET_INFO[k].icon, title: BD_PRESET_INFO[k].desc, checked: L.preset === k, run: () => pick(k) });
    items.push('sep',
      { label: 'Plain words, big numbers', icon: 'type', checked: L.style === 'simple', title: 'Short sentences and big numbers instead of charts', run: () => boardSave(Object.assign({}, L, { style: L.style === 'simple' ? 'detailed' : 'simple' }), null, { quiet: true }) },
      { label: 'Everyday strip', icon: 'layout-list', checked: L.strip, title: 'Spent today, safe to spend, the next bill and unusual this week', run: () => boardSave(Object.assign({}, L, { strip: !L.strip }), null, { quiet: true }) },
      'sep',
      { label: 'Add a widget…', icon: 'circle-plus', run: () => bdGallery() },
      { label: BDR.editing ? 'Done customising' : 'Customise…', icon: 'pencil', run: () => bdEdit(!BDR.editing) });
    if (typeof window.openMenu === 'function') window.openMenu(anchor, items, { align: 'end' });
  }

  /* ---------- quick filters ---------- */
  const BD_QUICK = [['TW', 'This week'], ['TM', 'This month'], ['LM', 'Last month'], ['3M', '3 months'], ['YTD', 'This year']];
  function bdPaintQuick(X) {
    const E = BDR.el, M = X.M; const box = E.quick; box.innerHTML = '';
    const dates = h('div', { class: 'fvb-chips', role: 'group', 'aria-label': 'Dates' });
    for (const [p, l] of BD_QUICK) {
      const on2 = F.preset === p && !F.trip;
      dates.append(h('button', { type: 'button', class: 'fv-chip' + (on2 ? ' on' : ''), 'aria-pressed': String(on2), 'aria-current': on2 ? 'true' : null, onclick: () => { if (!on2) setPreset(p); } }, l));
    }
    const known = BD_QUICK.some(q => q[0] === F.preset) && !F.trip;
    if (!known && !F.trip) dates.append(h('span', { class: 'fv-chip on fvb-range', 'aria-current': 'true' }, ic('calendar-range'), fRange(X.ctx.rg.from, X.ctx.rg.to)));
    box.append(dates);
    const menus = h('div', { class: 'fvb-chips', role: 'group', 'aria-label': 'Filters' });
    // A trip: its dates as the range.
    const trips = PL.trips(M).slice().reverse();
    const tr = F.trip ? trips.find(t => t.id === F.trip) : null;
    if (tr) menus.append(bdPill(h('span', { class: 'fvb-pflag', html: PL.flag(tr.cc) }), tr.label, () => setTrip(null), 'Back to the dates before the trip'));
    else if (trips.length) menus.append(h('button', { type: 'button', class: 'fv-chip fvb-menu', 'aria-haspopup': 'menu', onclick: e => bdTripMenu(e.currentTarget, trips) }, ic('plane'), 'Trip', ic('chevron-down')));
    // A country.
    if (F.country) menus.append(bdPill(h('span', { class: 'fvb-pflag', html: PL.flag(F.country === 'HOME' ? '' : F.country) }), PL.label(F.country === 'HOME' ? '' : F.country), () => setCountry(''), 'Everywhere again'));
    else menus.append(h('button', { type: 'button', class: 'fv-chip fvb-menu', 'aria-haspopup': 'menu', onclick: e => bdCountryMenu(e.currentTarget, X) }, ic('globe'), 'Country', ic('chevron-down')));
    // A category.
    if (F.cats.length) menus.append(bdPill(h('i', { class: 'fv-sw', style: { background: catColor(F.cats[0]) } }), F.cats.length === 1 ? F.cats[0] : `${F.cats.length} categories`, () => setCats([]), 'All categories again'));
    else menus.append(h('button', { type: 'button', class: 'fv-chip fvb-menu', 'aria-haspopup': 'menu', onclick: e => bdCatMenu(e.currentTarget, X) }, ic('layout-grid'), 'Category', ic('chevron-down')));
    // Filters set elsewhere (a merchant, accounts, a search, an amount) show here too, each with its ×.
    if (F.merchant) menus.append(bdPill(ic('building-2'), F.merchant, () => setMerchant('')));
    if (F.accts.length) menus.append(bdPill(ic('landmark'), F.accts.length === 1 ? (M.acctNames[F.accts[0]] || 'Account') : `${F.accts.length} accounts`, () => { F.accts = []; changed(); }));
    if (F.q) menus.append(bdPill(ic('search'), `“${F.q}”`, () => { F.q = ''; changed(); }));
    if (F.amt) menus.append(bdPill(ic('coins'), `${gbp(F.amt[0])} – ${F.amt[1] >= M.maxAmt - 0.01 ? 'any' : gbp(F.amt[1])}`, () => { F.amt = null; changed(); }));
    const any = F.cats.length || F.accts.length || F.merchant || F.q || F.amt || F.country || F.trip;
    if (any) menus.append(h('button', { type: 'button', class: 'fv-link fvb-clear', text: 'Clear', onclick: () => { const t2 = F.trip; F.cats = []; F.accts = []; F.merchant = ''; F.q = ''; F.amt = null; F.country = ''; if (t2) setTrip(null); else changed(); } }));
    box.append(menus);
  }
  function bdPill(lead, label, x, title) {
    return h('span', { class: 'fv-pill sel fvb-pill' }, lead, h('span', { class: 'fv-pill-t', text: label }),
      h('button', { type: 'button', class: 'fv-pill-x', 'aria-label': 'Remove filter ' + label, title: title || 'Remove', onclick: x }, ic('x')));
  }
  function bdTripMenu(anchor, trips) {
    const items = trips.slice(0, 15).map(t => {
      const a = dnum(t.from), b = dnum(t.to || t.from);
      return { label: t.label, icon: PL.flag(t.cc), hint: a === b ? fDay(a) : fRange(a, b), run: () => setTrip(t) };
    });
    if (typeof window.openMenu === 'function') window.openMenu(anchor, [{ heading: 'Use a trip’s dates' }, ...items], { align: 'start' });
  }
  function bdCountryMenu(anchor, X) {
    const list = PL.agg(ccRows(X.ctx));
    const all = PL.agg(X.M.tx.filter(t => t.kind === 'spend'));
    const inRange = new Set(list.map(x => x.cc));
    const items = [{ heading: 'In these dates' }, ...list.slice(0, 14).map(x => ({ label: x.label, icon: PL.flag(x.cc === 'HOME' ? '' : x.cc), hint: bdHidden() ? '' : gbp(x.total), run: () => setCountry(x.cc) }))];
    const more = all.filter(x => !inRange.has(x.cc)).slice(0, 10);
    if (more.length) items.push({ heading: 'Other dates' }, ...more.map(x => ({ label: x.label, icon: PL.flag(x.cc === 'HOME' ? '' : x.cc), run: () => setCountry(x.cc) })));
    if (typeof window.openMenu === 'function') window.openMenu(anchor, items, { align: 'start' });
  }
  function bdCatMenu(anchor, X) {
    const tot = X.ctx.catTotals(X.ctx.spendNoCat());
    const cats = Object.entries(tot).filter(e => e[1] > 0.004).sort((a, b) => b[1] - a[1]);
    const items = [{ heading: 'In these dates' }, ...cats.slice(0, 20).map(([c, v]) => ({ label: c, icon: `<i class="fv-sw" style="background:${esc(catColor(c))}"></i>`, hint: bdHidden() ? '' : gbp(v), run: () => toggleCat(c, true) }))];
    if (!cats.length) items.push({ label: 'No spending in these dates', disabled: true });
    if (typeof window.openMenu === 'function') window.openMenu(anchor, items, { align: 'start' });
  }

  /* ---------- the first visit: pick a starting point ---------- */
  function bdPaintIntro(X) {
    const el = BDR.el.intro;
    const show = !boardClean(F.board) && !BDR.editing;
    el.hidden = !show;
    if (!show) { el.innerHTML = ''; return; }
    if (el.childElementCount) return;
    const keep = name => { const next = bdPreset(name); boardSave(next, name === 'simple' ? null : `${BD_PRESET_INFO[name].label} layout`, { noUndo: name === 'simple', quiet: name === 'simple' }); if (name === 'scratch') bdGallery(); };
    el.append(h('div', { class: 'fvb-intro-t' }, h('span', { class: 'fvb-intro-ic', 'aria-hidden': 'true' }, ic('layout-template')),
      h('div', null, h('b', { text: 'My money is your page.' }), h('span', { text: ' This is the Simple start. Pick another, or change any widget: drag, resize, add, remove. It follows you to your other devices.' }))),
      h('div', { class: 'fvb-intro-a' },
        ...['simple', 'detailed', 'scratch'].map(k => h('button', { type: 'button', class: 'btn btn-sm ' + (k === 'simple' ? 'btn-primary' : 'btn-secondary'), title: BD_PRESET_INFO[k].desc, onclick: () => keep(k) },
          ic(k === 'simple' ? 'check' : BD_PRESET_INFO[k].icon), h('span', { text: k === 'simple' ? 'Keep Simple' : BD_PRESET_INFO[k].label }))),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { keep('simple'); bdEdit(true); } }, ic('pencil'), h('span', { text: 'Customise' }))));
  }

  /* ---------- the everyday strip ---------- */
  function bdPaintStrip(X) {
    const el = BDR.el.strip;
    el.hidden = !X.L.strip;
    if (!X.L.strip) return;
    const M = X.M; el.innerHTML = '';
    const today = M.today, anchor = M.anchor;
    // Spent today, against a usual day (the median of the last 4 weeks, quiet days included).
    const spentToday = sum(M.tx.filter(t => t.kind === 'spend' && t.n === today), t => t.s);
    const nToday = M.tx.filter(t => t.kind === 'spend' && t.n === today && t.s > 0).length;
    const days = []; for (let n = today - 28; n < today; n++) if (n >= M.minN) days.push(0);
    for (const t of M.tx) if (t.kind === 'spend' && t.n >= today - 28 && t.n < today && t.n >= M.minN) days[t.n - Math.max(today - 28, M.minN)] += t.s;
    const usual = days.length >= 7 ? median(days) : null;
    el.append(bdTile('receipt', 'Spent today', gbp(spentToday),
      nToday ? `${nToday} payment${nToday === 1 ? '' : 's'}` + (usual != null ? ` · a usual day ${gbp(usual)}` : '') : (usual != null ? `Nothing yet · a usual day ${gbp(usual)}` : 'Nothing yet'),
      spentToday > 0 && usual != null && spentToday > usual * 1.5 ? 'warn' : '', () => setCustomRange(today, Math.max(today, Math.min(anchor, today)))));
    // Safe to spend until payday.
    const B = X.brief();
    if (B && B.balance) {
      const left = round2(B.balance.total - B.billsTotal - B.cushion);
      const per = round2(Math.max(0, left) / Math.max(1, B.cycle.daysLeft));
      el.append(bdTile('wallet', B.mode === 'cycle' ? 'Safe to spend until payday' : 'Safe to spend this month', gbp(per) + ' a day',
        `${gbp(Math.max(0, left))} in ${B.cycle.daysLeft} day${B.cycle.daysLeft === 1 ? '' : 's'}` + (B.mode === 'cycle' ? ` · payday ${fDayW(B.cycle.next)}` : ''), left < 0 ? 'bad' : '', () => setSection('overview')));
    } else el.append(bdTile('wallet', 'Safe to spend', '—', 'Needs your balances: Sync bank', 'mute', () => setSection('overview')));
    // The next bill.
    const next = MBM.billsBetween(M.recurring, anchor, anchor + 32)[0];
    if (next) {
      const note = bdNote(next.m);
      el.append(bdTile('repeat', 'Next bill', gbp2(next.amount), `${next.m} · ${dayWord(next.n, anchor).toLowerCase() === 'today' ? 'due today' : dayWord(next.n, anchor)}` + (note ? ' · reminder set' : ''), next.n - anchor <= 1 ? 'warn' : '', () => { F.merchant = next.m; saveF(); setSection('recurring'); }));
    } else el.append(bdTile('repeat', 'Next bill', '—', 'Nothing due in the next month', 'mute', () => setSection('recurring')));
    // Unusual this week.
    const wk = M.tx.filter(t => t.kind === 'spend' && t.n > today - 7 && t.n <= anchor);
    const odd = bdUnusual(M, wk, 100);
    if (odd.length) {
      const top = odd[0];
      el.append(bdTile('triangle-alert', 'Unusual this week', `${odd.length} payment${odd.length === 1 ? '' : 's'}`, `${top.t.m} ${gbp(top.t.s)} · ${top.why[0].toLowerCase()}`, 'warn', () => openMerchant(top.t.m)));
    } else el.append(bdTile('circle-check', 'Unusual this week', 'Nothing', 'No big or odd payments in 7 days', 'good', null));
  }
  function bdTile(icon, label, value, sub, tone, go) {
    const tag = go ? 'button' : 'div';
    const el = h(tag, { type: go ? 'button' : null, class: 'fvb-tile' + (tone ? ' tone-' + tone : '') + (go ? '' : ' static'), onclick: go || null },
      h('span', { class: 'fvb-tile-l' }, h('span', { class: 'fvb-tile-ic', 'aria-hidden': 'true' }, ic(icon)), h('span', { text: label })),
      amt(value, 'fvb-tile-v'), h('span', { class: 'fvb-tile-s fv-amt', text: sub }));
    return el;
  }

  /* ---------- widget frames ---------- */
  const bdChartH = (w, X) => { const r = BWR[w.t]; return r ? (typeof r.chart === 'function' ? r.chart(w, X) : (r.chart || 0)) : 0; };
  const bdSig = (w, X) => JSON.stringify([w.t, w.o, X.simple, bdChartH(w, X)]);
  function bdFrame(w, X) {
    const d = bwDef(w.t);
    const ch = bdChartH(w, X);
    const cd = card(BDR.tmp, { title: d.title, span: BD_SIZE_COLS[w.s], chart: ch > 0, height: ch, cls: 'fvb-w fvb-t-' + w.t });
    const el = cd.el;
    el.dataset.wid = w.i; el.dataset.flip = w.i; el.dataset.t = w.t; el.dataset.size = w.s; el.dataset.sig = bdSig(w, X);
    el.setAttribute('data-flip-size', '');
    el.setAttribute('aria-label', d.title);
    el.querySelector('.fv-card-t h3').prepend(h('span', { class: 'fvb-ic', 'aria-hidden': 'true' }, ic(d.icon)));
    cd.tools.append(h('button', { type: 'button', class: 'btn-icon btn-sm fvb-set', 'aria-label': d.title + ': settings', title: 'Settings', onclick: e => bdSettings(e.currentTarget, w.i) }, ic('sliders-horizontal')));
    el._cd = cd; cd.w = w;
    const r = BWR[w.t];
    if (r && r.build) r.build(cd, w, X);
    return cd;
  }
  function bdSetSpan(el, s) {
    el.dataset.size = s;
    el.style.setProperty('--span', BD_SIZE_COLS[s]);
    el.style.setProperty('--span-md', BD_SIZE_COLS[s] <= 6 ? 6 : 12);
  }
  function bdDisposeFrame(el) { const k = bdKey({ i: el.dataset.wid }); disposeChart(k); disposeAll(k + ':'); }
  /** Make the grid's widget cards match the layout: keep, move, resize, build or drop each by id. */
  function bdSync(X) {
    const g = BDR.grid; if (!g || !g.isConnected) return;
    const want = X.L.w;
    const have = new Map();
    for (const el of [...g.querySelectorAll(':scope > .fvb-w')]) {
      const w = want.find(x => x.i === el.dataset.wid);
      if (!w || el.dataset.t !== w.t || el.dataset.sig !== bdSig(w, X)) { bdDisposeFrame(el); el.remove(); }
      else have.set(w.i, el);
    }
    let ref = BDR.el.empty.nextSibling;
    for (const w of want) {
      let el = have.get(w.i);
      if (!el) { el = bdFrame(w, X).el; el._fresh = true; if (BDR.editing) bdChrome(el); }
      if (el.dataset.size !== w.s || !el.style.getPropertyValue('--span')) bdSetSpan(el, w.s);
      if (el !== ref) g.insertBefore(el, ref); else ref = ref.nextSibling;
      ref = el.nextSibling;
    }
    // Nothing on the board: say how to start (never a blank page).
    const E = BDR.el;
    E.empty.hidden = !!want.length;
    if (!want.length && !E.empty.childElementCount) {
      E.empty.append(h('div', { class: 'fvb-empty-in' }, h('span', { class: 'fvb-intro-ic', 'aria-hidden': 'true' }, ic('circle-plus')),
        h('b', { text: 'An empty page' }), h('span', { text: 'Add the widgets you want: safe to spend, budgets, countries, trips, goals and more.' }),
        h('div', { class: 'fvb-intro-a' }, h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => bdGallery() }, ic('plus'), h('span', { text: 'Add a widget' })),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => boardSave(bdPreset('simple'), 'Simple layout') }, h('span', { text: 'Use Simple' })))));
    }
  }
  function bdUpdateFrames(X) {
    for (const el of BDR.grid.querySelectorAll(':scope > .fvb-w')) {
      const cd = el._cd; if (!cd) continue;
      const w = X.L.w.find(x => x.i === el.dataset.wid); if (!w) continue;
      cd.w = w;
      try { BWR[w.t].update(cd, w, X); }
      catch (e) {
        console.error('[finance] widget failed', w.t, e);
        const box = bdBox(cd); box.append(h('p', { class: 'fvb-note warn', text: 'This widget hit a problem and could not draw. Reload the page; if it stays, remove it and add it again.' }));
      }
      if (el._fresh) { delete el._fresh; el.style.setProperty('--i', String([...BDR.grid.children].indexOf(el))); }
    }
  }
  /** After a layout change (boardSave): reconcile, update, and let the rest glide. */
  function bdApply(o) {
    o = o || {};
    if (R.mode !== 'ready' || R.sectionId !== 'board' || !BDR.grid || !BDR.grid.isConnected) return;
    const ctx = R.ctx || makeCtx();
    const run = () => { R.noAnim = true; try { UPDATE.board(ctx); } finally { R.noAnim = false; } };
    if (!o.instant && !MK.reduced() && typeof homeFlip === 'function') homeFlip(BDR.grid, run, { enter: true });
    else run();
    if (BDR.editing) bdEditRefresh();
  }

  /* ---------- a widget's settings ---------- */
  function bdSetOpt(wid, k, v) {
    const L = boardGet();
    const next = Object.assign({}, L, { w: L.w.map(x => (x.i === wid ? Object.assign({}, x, { o: Object.assign({}, x.o, { [k]: v }) }) : x)) });
    boardSave(bdCustom(next), null, { quiet: true });
  }
  function bdSetSize(wid, s) {
    const L = boardGet(); const w = L.w.find(x => x.i === wid); if (!w || w.s === s) return false;
    return boardSave(bdCustom(Object.assign({}, L, { w: L.w.map(x => (x.i === wid ? Object.assign({}, x, { s }) : x)) })), null, { quiet: true });
  }
  function bdRemove(wid) {
    const L = boardGet(); const w = L.w.find(x => x.i === wid); if (!w) return;
    boardSave(bdCustom(Object.assign({}, L, { w: L.w.filter(x => x.i !== wid) })), `${bwDef(w.t).title} removed`, { icon: 'trash-2' });
  }
  function bdMove(wid, j) {
    const L = boardGet(); const i = L.w.findIndex(x => x.i === wid); if (i < 0) return false;
    j = clamp(j, 0, L.w.length - 1); if (i === j) return false;
    const w2 = L.w.slice(); const [x] = w2.splice(i, 1); w2.splice(j, 0, x);
    return boardSave(bdCustom(Object.assign({}, L, { w: w2 })), null, { quiet: true });
  }
  /** The choices a setting offers (a goal's account list comes from the balances). */
  function bdChoices(o) {
    if (o.input === 'cat') {
      const M = R.model; const tot = {};
      if (M) for (const t of M.tx) if (t.kind === 'spend' && t.n > M.anchor - 120) tot[t.c] = (tot[t.c] || 0) + t.s;
      return [['auto', 'My biggest day-to-day one'], ...Object.keys(tot).filter(c => tot[c] > 0 && c !== 'Uncategorised').sort((a, b) => tot[b] - tot[a]).map(c => [c, c])];
    }
    if (o.input !== 'acct') return o.choices || [];
    const bals = R.model && Array.isArray(R.model.a.balances) ? R.model.a.balances : [];
    return [['all', 'All balances'], ['kept', 'Kept this year'], ...bals.filter(b => b && b.acct).map(b => [String(b.acct), (b.kind === 'pot' ? 'Pot: ' : '') + (b.name || 'Account')])];
  }
  function bdSettings(anchor, wid) {
    if (typeof window.openPopover !== 'function') return;
    window.openPopover(anchor, (el, close) => {
      el.classList.add('fvb-pop', 'fvb-set-pop');
      const paint = () => {
        const L = boardGet(); const w = L.w.find(x => x.i === wid);
        if (!w) { close(); return; }
        const d = bwDef(w.t);
        el.innerHTML = '';
        el.append(h('div', { class: 'fvb-pop-h' }, ic(d.icon), h('b', { text: d.title })), h('p', { class: 'fvb-pop-d', text: d.desc }));
        if (d.sizes.length > 1) el.append(bdSegRow('Size', d.sizes.map(s => [s, BD_SIZE_LABEL[s], BD_SIZE_LONG[s]]), w.s, v => { bdSetSize(wid, v); paint(); }));
        for (const o of d.opts) {
          const cur = bwOpt(w, o.k);
          if (!o.input || o.input === 'acct' || o.input === 'cat') {
            const ch = bdChoices(o).map(([v, l]) => [v, o.money && typeof v === 'number' && v > 0 ? curBare(l) : l]);
            if (ch.length > 4 || o.input === 'acct' || o.input === 'cat') {
              const sel = h('select', { class: 'input input-sm', 'aria-label': o.label });
              for (const [v, l] of ch) { const op = h('option', { value: String(v), text: l }); if (v === cur) op.selected = true; sel.append(op); }
              sel.onchange = () => { const v = ch.find(c => String(c[0]) === sel.value); if (v) { bdSetOpt(wid, o.k, v[0]); paint(); } };
              el.append(h('label', { class: 'fvb-pop-f' }, h('span', { text: o.label }), sel));
            } else el.append(bdSegRow(o.label, ch, cur, v => { bdSetOpt(wid, o.k, v); paint(); }));
          } else {
            const inp = h('input', { class: 'input input-sm', type: o.input === 'money' ? 'number' : o.input === 'date' ? 'date' : 'text', 'aria-label': o.label,
              value: cur == null ? '' : String(cur), min: o.input === 'money' ? '1' : null, step: o.input === 'money' ? '1' : null, maxlength: o.input === 'text' ? '40' : null,
              placeholder: o.input === 'text' ? bwDef(w.t).title : o.input === 'money' ? curBare('1000') : null });
            const commit = () => { const v = o.input === 'money' ? Number(inp.value) : inp.value; const clean = bwInput(o, v); if (clean === undefined && inp.value !== '') { inp.setCustomValidity('Not a valid value'); inp.reportValidity(); return; } inp.setCustomValidity(''); bdSetOpt(wid, o.k, clean); };
            inp.addEventListener('change', commit);
            inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
            el.append(h('label', { class: 'fvb-pop-f' }, h('span', { text: o.label }), inp));
          }
        }
        const L2 = boardGet(); const i = L2.w.findIndex(x => x.i === wid);
        el.append(h('div', { class: 'fvb-pop-a' },
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', disabled: i <= 0, title: 'Earlier on the page', onclick: () => { bdMove(wid, i - 1); paint(); } }, ic('arrow-up'), h('span', { text: 'Earlier' })),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', disabled: i >= L2.w.length - 1, title: 'Later on the page', onclick: () => { bdMove(wid, i + 1); paint(); } }, ic('arrow-down'), h('span', { text: 'Later' })),
          h('span', { class: 'spacer' }),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm fvb-rm', onclick: () => { close(); bdRemove(wid); } }, ic('trash-2'), h('span', { text: 'Remove' }))));
      };
      paint();
    }, { align: 'end', width: 330 });
  }
  /** A labelled segmented control in a popover (the design system's .seg; re-picking does nothing). */
  function bdSegRow(label, choices, cur, pick) {
    const seg2 = h('span', { class: 'seg fvb-seg', role: 'radiogroup', 'aria-label': label });
    for (const [v, l, tip] of choices) {
      const on2 = v === cur;
      seg2.append(h('button', { type: 'button', role: 'radio', 'aria-checked': on2 ? 'true' : 'false', class: on2 ? 'on' : '', title: tip || null, onclick: () => { if (!on2) pick(v); } }, String(l)));
    }
    return h('div', { class: 'fvb-pop-f' }, h('span', { text: label }), seg2);
  }
