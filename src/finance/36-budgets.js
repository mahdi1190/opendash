  // @part 36-budgets.js · OWNER: C3 (Budgets section: rings with a liquid fill, pace, burn-up, history, editor)
  // ----- Budgets -----
  function budgetCalc(M) {
    const today = M.anchor; const mi = monthIdx(today); const ms = monthStart(mi), me = monthEnd(mi);
    const elapsed = today - ms + 1, total = me - ms + 1;
    const spent = {}, hist = {};
    M.tx.forEach(x => {
      if (x.kind !== 'spend') return;
      if (x.n >= ms && x.n <= today) spent[x.c] = (spent[x.c] || 0) + x.s;
      const k = monthIdx(x.n);
      if (k < mi && k >= mi - 3 && x.n >= M.minN) { hist[x.c] = hist[x.c] || {}; hist[x.c][k] = (hist[x.c][k] || 0) + x.s; }
    });
    const fullMonths = [mi - 3, mi - 2, mi - 1].filter(k => monthStart(k) >= M.minN || (monthEnd(k) >= M.minN && monthEnd(k) - M.minN > 20));
    const avg3 = c => fullMonths.length ? sum(fullMonths, k => (hist[c] && hist[c][k]) || 0) / fullMonths.length : null;
    const fc = c => {
      const s = spent[c] || 0; const a = avg3(c);
      const rateM = s / elapsed, rateH = a != null ? a / 30.44 : rateM; const w = elapsed / total;
      return s + Math.max(0, w * rateM + (1 - w) * rateH) * (total - elapsed);
    };
    return { mi, ms, me, elapsed, total, spent, avg3, fc, fullMonths };
  }
  function budgetState(spent, forecast, budget) {
    if (!budget) return { k: 'none', l: 'No budget', icon: 'minus' };
    if (spent > budget + 0.004) return { k: 'over', l: 'Over', icon: 'circle-x' };
    if (forecast > budget * 1.02) return { k: 'risk', l: 'At risk', icon: 'circle-alert' };
    return { k: 'ok', l: 'On track', icon: 'circle-check' };
  }

  // ── Budgets v3 (C3, 3 Oct 2026): liquid rings, pace marker, burn-up, history ──
  // Presentation over the audited numbers above (budgetCalc / budgetState stay
  // the source); the month view of a past month and the burn-up curve are sums
  // of the same transactions (tests/finance-shell.test.mjs).
  // Budgets ignore the date range and the filters (always a calendar month),
  // so the section keeps only the tabs in the sticky bar.
  SEC_OPTS.budgets = Object.assign({ filters: false }, SEC_OPTS.budgets || {});
  // Spending that follows due dates rather than an even pace (rent on the 1st,
  // the gym on the 15th): "On schedule" until it goes over.
  const BUD_SCHED = new Set(['housing', 'utilities', 'phone', 'subscriptions', 'fitness', 'insurance', 'tax', 'debt']);
  function budgetScheduled(c) {
    let scene = null;
    try { if (window.FinSymbols && typeof window.FinSymbols.categoryScene === 'function') scene = window.FinSymbols.categoryScene(c); } catch (e) { /* the symbols module is optional */ }
    if (scene) return BUD_SCHED.has(scene);
    return /\b(rent|mortgage|housing|bills?|utilit|subscri|gym|fitness|insurance|tax|phone|broadband|loan|debt)/i.test(String(c));
  }
  // How a budget reads. Red only when over; amber when spending runs ahead of
  // the month (a little more slack in its first days); bills on schedule.
  function budgetLook(spent, budget, pace, sched) {
    if (!(budget > 0)) return { k: 'none', l: 'No budget', short: 'no budget', icon: 'minus', tone: 'none' };
    if (spent > budget + 0.004) return { k: 'over', l: 'Over by ' + gbp(spent - budget), short: 'over', icon: 'circle-alert', tone: 'bad' };
    if (pace >= 1) return { k: 'ok', l: 'Under by ' + gbp(budget - spent), short: 'under', icon: 'circle-check', tone: 'good' };
    if (sched) return { k: 'sched', l: 'On schedule', short: 'on schedule', icon: 'calendar-check', tone: 'sched' };
    const margin = pace < 0.15 ? 0.2 : 0.1;
    if (spent / budget > pace + margin) return { k: 'ahead', l: 'Ahead of pace', short: 'ahead of pace', icon: 'triangle-alert', tone: 'warn' };
    return { k: 'ok', l: 'On track', short: 'on track', icon: 'circle-check', tone: 'good' };
  }
  const budTone = tone => (tone === 'bad' ? 'var(--danger)' : tone === 'warn' ? 'var(--warning)' : tone === 'none' ? 'var(--fg-disabled)' : 'var(--accent)');
  const budToneHex = tone => { const t = tk(); return tone === 'bad' ? t.sCrit : tone === 'warn' ? t.sWarn : tone === 'none' ? t.other : t.accent; };
  // One month of budgets. The current month is budgetCalc's (pace = days gone);
  // a past month is its final spend per category (pace 100 %, no forecast).
  function budgetMonthView(M, bc, mi) {
    if (mi == null || mi >= bc.mi) return { mi: bc.mi, cur: true, ms: bc.ms, elapsed: bc.elapsed, total: bc.total, pace: bc.elapsed / bc.total, spent: bc.spent, fc: bc.fc, partFrom: null };
    const ms = monthStart(mi), me = monthEnd(mi); const spent = {};
    for (const x of M.tx) if (x.kind === 'spend' && x.n >= ms && x.n <= me) spent[x.c] = (spent[x.c] || 0) + x.s;
    return { mi, cur: false, ms, elapsed: me - ms + 1, total: me - ms + 1, pace: 1, spent, fc: c => spent[c] || 0, partFrom: M.minN > ms ? M.minN : null };
  }
  // Cumulative spend by day of the month for a set of categories, up to today
  // (current month) or the month end. The last value is the month's total, exactly.
  function budgetCurve(M, view, cats) {
    const upto = view.cur ? view.elapsed : view.total;
    const daily = new Array(upto).fill(0);
    for (const x of M.tx) if (x.kind === 'spend' && x.n >= view.ms && x.n < view.ms + upto && cats.has(x.c)) daily[x.n - view.ms] += x.s;
    const out = []; let c = 0;
    for (let i = 0; i < upto; i++) { c += daily[i]; out.push(round2(c)); }
    return out;
  }
  // The ring: a 7 px track and arc (spent / budget), a liquid fill clipped to the
  // inner circle (two sine waves, wavelength 30, at the spent level) and a pace
  // marker. Transform/opacity only: the waves translate, the level rises, the arc
  // grows once through stroke-dashoffset (FINANCE_MOTION.md §7 Budgets).
  let ringUid = 0;
  function ringSvg(frac, pace, o) {
    o = o || {};
    const SZ = o.size || 148, cx = SZ / 2, Rr = SZ / 2 - 8, r = Rr - (SZ > 170 ? 12 : 10), sw = SZ > 170 ? 9 : 7;
    const C = 2 * Math.PI * Rr, f = clamp(frac, 0, 1);
    const id = 'fvrg' + (++ringUid);
    const level = cx + r - f * 2 * r;
    const amp = o.flat ? 0 : 3.4;
    const wave = (y, a, ph) => { let d = `M${-60 + ph} ${y.toFixed(2)}`; for (let x = -60 + ph; x < SZ + 60; x += 30) d += ` q7.5 ${(-a).toFixed(2)} 15 0 t15 0`; return d + ` L${SZ + 60} ${SZ + 12} L${-60 + ph} ${SZ + 12} Z`; };
    const liquid = f > 0.004
      ? `<g clip-path="url(#${id})"><g class="lv" style="--lv:${(SZ + 12 - level).toFixed(1)}px"><g class="wv wv2"><path class="liq2" d="${wave(level + 3, amp * 0.85, 15)}"/></g><g class="wv wv1"><path class="liq" d="${wave(level, amp, 0)}"/></g></g></g>` : '';
    let pm = '';
    if (pace != null && pace < 1) {
      const a = pace * 2 * Math.PI - Math.PI / 2;
      const p1 = [cx + Math.cos(a) * (Rr - sw), cx + Math.sin(a) * (Rr - sw)], p2 = [cx + Math.cos(a) * (Rr + sw), cx + Math.sin(a) * (Rr + sw)];
      const pd = [cx + Math.cos(a) * (Rr + sw + 5), cx + Math.sin(a) * (Rr + sw + 5)];
      pm = `<g class="pmg"><line class="pm" x1="${p1[0].toFixed(2)}" y1="${p1[1].toFixed(2)}" x2="${p2[0].toFixed(2)}" y2="${p2[1].toFixed(2)}"/><circle class="pmd" cx="${pd[0].toFixed(2)}" cy="${pd[1].toFixed(2)}" r="2.2"/></g>`;
    }
    return `<svg viewBox="0 0 ${SZ} ${SZ}" aria-hidden="true" focusable="false"><defs><clipPath id="${id}"><circle cx="${cx}" cy="${cx}" r="${r}"/></clipPath></defs>`
      + `<circle class="glass" cx="${cx}" cy="${cx}" r="${r}"/>${liquid}`
      + `<circle class="trk" cx="${cx}" cy="${cx}" r="${Rr}" stroke-width="${sw}"/>`
      + `<circle class="arc" cx="${cx}" cy="${cx}" r="${Rr}" stroke-width="${sw}" stroke-dasharray="${(C * f).toFixed(2)} ${(C + 1).toFixed(2)}" style="--off:${(C * f).toFixed(2)}px;transform-origin:${cx}px ${cx}px"/>`
      + pm + '</svg>';
  }
  const budMonthLbl = mi => fMonth(mi);
  function budListNames(list) { return list.length <= 2 ? list.join(' and ') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]; }

  BUILD.budgets = g => {
    S.rings = new Map();
    // Month bar: step through months (a past month shows how it ended), the day and pace, edit.
    S.bPrev = h('button', { type: 'button', class: 'fv-bud-step', 'aria-label': 'Previous month', onclick: () => budStep(-1) }, ic('chevron-left'));
    S.bNext = h('button', { type: 'button', class: 'fv-bud-step', 'aria-label': 'Next month', onclick: () => budStep(1) }, ic('chevron-right'));
    S.bMonth = h('button', { type: 'button', class: 'fv-bud-month', onclick: () => { if (R.budgetMonth != null) budSetMonth(null); } });
    S.bDay = h('span', { class: 'fv-bud-day' });
    S.bEdit = h('button', { type: 'button', class: 'fv-btn', 'aria-label': 'Edit budgets', onclick: () => budGoEditor() }, ic('pencil'), h('span', { text: 'Edit budgets' }));
    S.bBar = h('div', { class: 'fv-bud-bar' }, h('div', { class: 'fv-bud-stepper' }, S.bPrev, S.bMonth, S.bNext), S.bDay, h('span', { class: 'fv-grow' }), S.bEdit);
    g.append(S.bBar);
    // Hero: the whole month in one ring, the story in two sentences, the burn-up.
    S.hRingHost = h('div', { class: 'fv-rg-svg' });
    S.hNum = h('b', { class: 'num' }); S.hUnit = h('span');
    S.hRing = h('div', { class: 'fv-rg hero' }, S.hRingHost, h('div', { class: 'fv-rg-ctr' }, S.hNum, S.hUnit));
    S.hOver = h('div', { class: 'fv-bud-over' });
    S.hHead = h('h2', { class: 'fv-bud-h' });
    S.hSay = h('p', { class: 'fv-bud-say' });
    S.hChips = h('div', { class: 'fv-bud-chips' });
    S.hCrumb = h('div', { class: 'fv-bud-crumb', hidden: true });
    S.hBurn = h('div', { class: 'fv-chart fv-bud-burn', style: { height: '176px' } });
    S.hBurnEmpty = h('div', { class: 'fv-empty', hidden: true });
    S.burnCd = { chart: S.hBurn, el: S.hBurn, setEmpty(msg) { S.hBurnEmpty.hidden = !msg; S.hBurnEmpty.textContent = msg || ''; S.hBurn.hidden = !!msg; } };
    S.hEmpty = h('div', { class: 'fv-bud-empty', hidden: true });
    S.hero = h('section', { class: 'fv-card fv-bud-hero', style: { '--span': 12 } },
      h('div', { class: 'fv-bud-hero-in' }, S.hRing,
        h('div', { class: 'fv-bud-hero-main' }, S.hOver, S.hHead, S.hSay, S.hChips,
          h('div', { class: 'fv-bud-burn-wrap' }, h('div', { class: 'fv-bud-burn-h' }, h('span', { class: 'fv-bud-burn-t' }), S.hCrumb), S.hBurn, S.hBurnEmpty))),
      S.hEmpty);
    g.append(S.hero);
    // One ring per budgeted category (the wrapper does not rise as a block: its cards stagger in).
    S.bGrid = h('div', { class: 'fv-bud-grid', role: 'list', 'aria-label': 'Budgets by category' });
    MK.once(S.bGrid, 'iv');
    g.append(S.bGrid);
    S.hist = card(g, { title: 'Budget history', span: 12, chart: true, height: 240 });
    S.ed = card(g, { title: 'Monthly budgets', span: 12, cls: 'fv-budget-card' });
    // Esc: a past month back to this month first, then the category selection.
    S.onEsc = () => {
      if (R.budgetMonth != null) { budSetMonth(null); return true; }
      if (F.budgetCat && F.budgetCat !== '*') { budPick('*'); return true; }
      return false;
    };
  };
  UPDATE.budgets = ctx => {
    const M = ctx.M; const bc = budgetCalc(M);
    S.entering = R.entering && !MK.reduced();   // the first visit: rings fill, numbers count up
    const B = R.budgetDraft || R.budgets || {};
    const saved = R.budgets || {};
    const budgeted = Object.keys(saved).filter(c => saved[c] > 0 && c !== 'Internal transfers');
    const firstMi = monthIdx(M.minN);
    if (R.budgetMonth != null && (R.budgetMonth >= bc.mi || R.budgetMonth < firstMi)) R.budgetMonth = null;
    const view = budgetMonthView(M, bc, R.budgetMonth);
    if (F.budgetCat && F.budgetCat !== '*' && !budgeted.includes(F.budgetCat) && !M.spendCats.includes(F.budgetCat)) F.budgetCat = '';
    S.bc = bc; S.view = view; S.budgeted = budgeted; S.saved = saved;
    budPaintBar(M, bc, view, firstMi);
    budPaintHero(M, bc, view, budgeted, saved);
    budPaintRings(M, bc, view, budgeted, saved);
    budgetEditor(S.ed, ctx, bc, B, saved);
    budgetHistory(S.hist, ctx, bc);
    S.entering = false;
  };
  function budPaintBar(M, bc, view, firstMi) {
    S.bMonth.textContent = budMonthLbl(view.mi);
    S.bMonth.classList.toggle('past', !view.cur);
    S.bMonth.title = view.cur ? 'This month' : 'Back to this month';
    S.bPrev.disabled = view.mi <= firstMi; S.bNext.disabled = view.cur;
    S.bDay.textContent = '';
    if (view.cur) S.bDay.append(h('b', { text: `day ${view.elapsed} of ${view.total}` }), h('span', { text: ` · pace marker at ${Math.round(view.pace * 100)}%` }));
    else S.bDay.append(h('b', { text: 'How it ended' }), h('span', { text: view.partFrom != null ? ` · data from ${fDay(view.partFrom)} · against today’s budgets` : ' · against today’s budgets' }));
  }
  function budPaintHero(M, bc, view, budgeted, saved) {
    const tot = sum(budgeted, c => saved[c]);
    const spentT = sum(budgeted, c => view.spent[c] || 0);
    const has = budgeted.length > 0;
    S.hero.classList.toggle('is-empty-bud', !has);
    S.hEmpty.hidden = has;
    if (!has) {
      S.hEmpty.innerHTML = '';
      const scene = window.FinSymbols && window.FinSymbols.categoryIcon ? h('span', { class: 'fv-bud-empty-ic', html: window.FinSymbols.categoryIcon('Savings', { size: 'xl', live: MK.reduced() ? false : 'loop' }) }) : h('span', { class: 'fv-bud-empty-ic' }, ic('piggy-bank'));
      S.hEmpty.append(scene, h('h3', { text: 'Give your month a shape' }),
        h('p', { text: 'Set a monthly amount for a category or two. Each gets a ring that fills as you spend, a marker for where an even pace would be, and a forecast for the month.' }),
        h('div', { class: 'fv-bud-empty-act' },
          h('button', { type: 'button', class: 'fv-btn primary', onclick: () => { budSuggest(); budGoEditor(); } }, ic('sparkles'), h('span', { text: 'Suggest from history' })),
          h('button', { type: 'button', class: 'fv-btn', onclick: () => budGoEditor() }, ic('pencil'), h('span', { text: 'Set them myself' }))));
      if (window.FinSymbols && window.FinSymbols.activate) window.FinSymbols.activate(S.hEmpty, { max: 2 });
      return;
    }
    const looks = budgeted.map(c => ({ c, look: budgetLook(view.spent[c] || 0, saved[c], view.pace, budgetScheduled(c)) }));
    const tLook = budgetLook(spentT, tot, view.pace, false);
    const frac = tot > 0 ? spentT / tot : 0;
    // The whole month also listens to the forecast: on pace today but heading over reads amber, not "on track".
    const fcT = view.cur ? sum(budgeted, c => bc.fc(c)) : null;
    const headingOver = view.cur && tLook.k !== 'over' && fcT > tot * 1.05;
    const tone = headingOver ? 'warn' : tLook.tone;
    // The ring (rebuilt; its number ticks from the last value)
    const enter = S.entering;
    S.hRing.style.setProperty('--rc', budTone(tone));
    S.hRingHost.innerHTML = ringSvg(frac, view.cur ? view.pace : null, { size: 200, flat: MK.reduced() });
    const left = tot - spentT;
    S.hUnit.textContent = left >= -0.004 ? `left of ${gbp(tot)}` : `over ${gbp(tot)}`;
    MK.tick(S.hNum, Math.abs(left), gbp, enter ? { delay: 380 } : undefined);
    if (enter) budRingEnter(S.hRing, 120);
    // Words
    S.hOver.textContent = view.cur ? `${fd(view.ms, { month: 'long' })} · day ${view.elapsed} of ${view.total}` : `${budMonthLbl(view.mi)} · final`;
    S.hHead.textContent = view.cur ? `${Math.round(frac * 100)}% spent, ${Math.round(view.pace * 100)}% of the month gone.` : `${Math.round(frac * 100)}% of the budget spent in ${fd(view.ms, { month: 'long' })}.`;
    const ahead = looks.filter(x => x.look.k === 'ahead').map(x => x.c);
    const over = looks.filter(x => x.look.k === 'over').map(x => x.c);
    let say = tLook.k === 'over' ? `Over budget overall by ${gbp(spentT - tot)}` : !view.cur ? `Under budget overall by ${gbp(tot - spentT)}`
      : headingOver ? 'Heading over budget' : tLook.k === 'ahead' ? 'Running ahead overall' : 'On track overall';
    const bits = [];
    if (ahead.length) bits.push(`${budListNames(ahead)} ${ahead.length === 1 ? 'is' : 'are'} running ahead`);
    if (over.length === 1) bits.push(`${over[0]} is ${gbp((view.spent[over[0]] || 0) - saved[over[0]])} over its budget`);
    else if (over.length > 1) bits.push(`${budListNames(over)} are over their budgets`);
    if (bits.length) say += (tLook.k === 'over' ? ': ' : '. ') + bits.join(' and ');
    if (view.cur && tLook.k !== 'over') say += headingOver ? `. At this pace the month ends near ${gbp(fcT)}, about ${gbp(fcT - tot)} over` : `. At this pace the month ends near ${gbp(fcT)}, within the budget`;
    S.hSay.textContent = say + '.';
    // v2.2 wave 5: the "Under budget" achievement (src/app/78-achievements.js), with or without motion
    if (!view.cur && bc && view.mi === bc.mi - 1 && tot > 0 && spentT <= tot && typeof achNote === 'function') achNote('under-budget');
    // v2.2 wave 4: last month closed under budget -> a confetti burst at the ring, once a day (src/app/78-anim-moments.js)
    if (!view.cur && bc && view.mi === bc.mi - 1 && tot > 0 && spentT <= tot && typeof animMoneyMoment === 'function' && !MK.reduced()) {
      const ringEl = S.hRing;
      setTimeout(() => { try { if (ringEl.isConnected) animMoneyMoment('under-budget', ringEl, 'm' + view.mi); } catch (e) { /* a moment only */ } }, 450);
    }
    // Status chips (counts)
    S.hChips.innerHTML = '';
    for (const [k, tone, icon, label] of [['ok', 'good', 'circle-check', view.cur ? 'on track' : 'under'], ['ahead', 'warn', 'triangle-alert', 'ahead of pace'], ['over', 'bad', 'circle-alert', 'over'], ['sched', 'sched', 'calendar-check', 'on schedule']]) {
      const n = looks.filter(x => x.look.k === k).length;
      if (n) S.hChips.append(h('span', { class: 'fv-bst ' + tone }, ic(icon), `${n} ${label}`));
    }
    budBurn(M, bc, view, budgeted, saved);
  }
  // Start a ring's one-off entrance (arc grows, liquid rises, waves run twice, marker fades in).
  function budRingEnter(el, delay) {
    if (MK.reduced() || !el) return;
    el.style.setProperty('--d', (delay || 0) + 'ms');
    el.classList.add('is-pre'); el.classList.remove('is-enter');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.classList.remove('is-pre'); el.classList.add('is-enter');
      clearTimeout(el._fvT); el._fvT = setTimeout(() => el.classList.remove('is-enter'), (delay || 0) + 5600);
    }));
  }
  function budPaintRings(M, bc, view, budgeted, saved) {
    const order = budgeted.slice().sort((p, q) => (saved[q] - saved[p]) || p.localeCompare(q));
    const sel = F.budgetCat && F.budgetCat !== '*' ? F.budgetCat : null;
    S.bGrid.hidden = !order.length;
    const keep = new Set(order);
    for (const [c, rc] of [...S.rings]) if (!keep.has(c)) { rc.el.remove(); S.rings.delete(c); }
    const daysLeft = view.total - view.elapsed + 1;
    const fresh = [];
    order.forEach((c, i) => {
      let rc = S.rings.get(c);
      if (!rc) { rc = budRingCard(c); S.rings.set(c, rc); fresh.push(rc); }
      if (S.bGrid.children[i] !== rc.el) S.bGrid.insertBefore(rc.el, S.bGrid.children[i] || null);
      const b = saved[c], s = view.spent[c] || 0;
      const look = budgetLook(s, b, view.pace, budgetScheduled(c));
      rc.el.style.setProperty('--rc', budTone(look.tone));
      rc.chip.className = 'fv-bst ' + look.tone; rc.chip.innerHTML = ''; rc.chip.append(ic(look.icon), look.l);
      rc.svg.innerHTML = ringSvg(s / b, view.cur ? view.pace : null, { flat: MK.reduced() });
      rc.unit.textContent = s > b + 0.004 ? 'over' : 'left';
      const enterNow = S.entering && !MK.reduced();
      // An entering ring counts up when its card is revealed (onIn below); otherwise old -> new.
      if (enterNow) { rc.num._fvVal = Math.abs(b - s); rc.num.textContent = gbp(Math.abs(b - s)); }
      else MK.tick(rc.num, Math.abs(b - s), gbp);
      rc.f1.innerHTML = ''; rc.f1.append(h('b', { text: gbp(s) }), ` of ${gbp(b)} · ${Math.round(s / b * 100)}%`);
      rc.f2.textContent = !view.cur ? (s > b ? `${gbp(s - b)} more than planned` : `${gbp(b - s)} to spare`)
        : s > b ? `${gbp(s - b)} over with ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go`
        : look.k === 'sched' ? `${gbp(b - s)} left for what’s due`
        : `about ${gbp((b - s) / daysLeft)} a day for ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
      rc.el.setAttribute('aria-label', `${c}: ${gbp(s)} of ${gbp(b)}, ${look.l}`);
      const isSel = sel === c;
      rc.el.classList.toggle('is-sel', isSel); rc.el.classList.toggle('is-dim', !!sel && !isSel);
      if (isSel) rc.el.setAttribute('aria-current', 'true'); else rc.el.removeAttribute('aria-current');
      if (enterNow) rc.el.classList.add('is-pre');
    });
    if (S.entering && !MK.reduced()) {
      // Cards rise in, 60 ms apart, when they scroll into view; each ring fills as its card lands.
      MK.inView(S.bGrid, { sel: ':scope > .fv-bud', step: 60, max: 480, distance: 14, onIn: (el, d) => {
        const rc = [...S.rings.values()].find(x => x.el === el); if (!rc) return;
        budRingEnter(el, d + 80);
        const last = rc.num._fvVal; rc.num._fvVal = 0; rc.num._fvTicked = false;
        MK.tick(rc.num, last, gbp, { delay: d + 260 });
      } });
    } else for (const rc of S.rings.values()) rc.el.classList.remove('is-pre');
    if (window.FinSymbols && window.FinSymbols.activate && fresh.length) window.FinSymbols.activate(S.bGrid, { max: 6 });
  }
  function budRingCard(c) {
    const rc = {};
    let icon;
    try { icon = window.FinSymbols && window.FinSymbols.categoryIcon ? h('span', { class: 'fv-bud-ic', html: window.FinSymbols.categoryIcon(c, { size: 'sm', color: catColor(c) }) }) : null; } catch (e) { icon = null; }
    rc.chip = h('span', { class: 'fv-bst' });
    rc.svg = h('div', { class: 'fv-rg-svg' });
    rc.num = h('b', { class: 'num' }); rc.unit = h('span');
    rc.f1 = h('div', { class: 'fv-bud-f1' }); rc.f2 = h('div', { class: 'fv-bud-f2' });
    rc.el = h('section', { class: 'fv-bud fv-rg fsym-host', role: 'listitem', tabindex: '0', 'data-cat': c },
      h('div', { class: 'fv-bud-hd' }, icon || sw(catColor(c)), h('span', { class: 'fv-bud-nm', text: c }), rc.chip),
      h('div', { class: 'fv-bud-ring' }, rc.svg, h('div', { class: 'fv-rg-ctr' }, rc.num, rc.unit)),
      h('div', { class: 'fv-bud-foot' }, rc.f1, rc.f2));
    rc.el.addEventListener('click', () => budPick(c));
    rc.el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); budPick(c); } });
    return rc;
  }
  // Select a category: its card lights up (the others dim) and the burn-up and
  // history follow it. Picking the selected one again does nothing.
  function budPick(c) {
    const cur = F.budgetCat && F.budgetCat !== '*' ? F.budgetCat : '*';
    if (c === cur) return;
    F.budgetCat = c; saveF();
    if (R.sectionId !== 'budgets' || !S.view) return;
    const sel = c !== '*' ? c : null;
    for (const [k, rc] of S.rings) { const on2 = k === sel; rc.el.classList.toggle('is-sel', on2); rc.el.classList.toggle('is-dim', !!sel && !on2); if (on2) rc.el.setAttribute('aria-current', 'true'); else rc.el.removeAttribute('aria-current'); }
    budBurn(R.model, S.bc, S.view, S.budgeted, S.saved);
    budgetHistory(S.hist, R.ctx, S.bc);
  }
  function budSetMonth(mi) {
    if ((mi == null ? null : mi) === (R.budgetMonth == null ? null : R.budgetMonth)) return;
    R.budgetMonth = mi;
    if (R.sectionId === 'budgets' && R.ctx) UPDATE.budgets(R.ctx);
  }
  function budStep(d) {
    if (!S.view || !S.bc) return;
    const firstMi = monthIdx(R.model.minN);
    const mi = clamp(S.view.mi + d, firstMi, S.bc.mi);
    budSetMonth(mi >= S.bc.mi ? null : mi);
  }
  function budGoEditor() {
    if (!S.ed) return;
    S.ed.el.scrollIntoView({ behavior: MK.reduced() ? 'auto' : 'smooth', block: 'start' });
    const inp = S.ed.el.querySelector('input.fv-money, select');
    if (inp) setTimeout(() => inp.focus({ preventScroll: true }), MK.reduced() ? 0 : 420);
  }
  function budSuggest() {
    const M = R.model, bc = budgetCalc(M); const saved = R.budgets || {};
    const d = Object.assign({}, R.budgetDraft || saved);
    M.spendCats.forEach(c => { const a = bc.avg3(c); if (!d[c] && a && a > 1) d[c] = Math.ceil(a / 5) * 5; });
    R.budgetDraft = d; if (R.ctx) UPDATE.budgets(R.ctx);
  }
  // The burn-up: cumulative spend this month (smooth, monotone, so it never
  // runs ahead of the real total) against an even pace to the budget, with the
  // forecast dotted to the month's end and a pulse at today.
  function budBurn(M, bc, view, budgeted, saved) {
    const t = tk();
    const sel = F.budgetCat && F.budgetCat !== '*' && budgeted.includes(F.budgetCat) ? F.budgetCat : null;
    const cats = new Set(sel ? [sel] : budgeted);
    const B = sel ? saved[sel] : sum(budgeted, c => saved[c]);
    const titleEl = S.hero.querySelector('.fv-bud-burn-t');
    titleEl.textContent = view.cur ? 'Spent so far this month' : `Spent through ${fd(view.ms, { month: 'long' })}`;
    S.hCrumb.hidden = !sel; S.hCrumb.innerHTML = '';
    if (sel) S.hCrumb.append(h('button', { type: 'button', class: 'fv-link', text: 'All budgets', onclick: () => budPick('*') }), ic('chevron-right'),
      h('span', { class: 'fv-pill sel' }, sw(catColor(sel)), h('span', { class: 'fv-pill-t', text: sel }), h('button', { type: 'button', class: 'fv-pill-x', 'aria-label': 'Show all budgets', onclick: () => budPick('*') }, ic('x'))));
    if (!budgeted.length || !(B > 0)) { S.burnCd.setEmpty(budgeted.length ? 'No budget for this category.' : null); if (!budgeted.length) S.hBurn.hidden = true; return; }
    const cum = budgetCurve(M, view, cats);
    const days = view.total, upto = cum.length;
    const labels = []; for (let i = 0; i < days; i++) labels.push(fDay(view.ms + i));
    const look = budgetLook(cum[upto - 1] || 0, B, view.pace, sel ? budgetScheduled(sel) : false);
    const fcEnd = view.cur ? round2(sel ? bc.fc(sel) : sum(budgeted, c => bc.fc(c))) : null;
    // Heading over (the forecast) reads amber like the hero ring; bills keep their schedule look.
    const tone = view.cur && look.k !== 'over' && look.k !== 'sched' && fcEnd > B * 1.05 ? 'warn' : look.tone;
    const col = budToneHex(tone);
    const paceData = labels.map((_, i) => round2(B * (i + 1) / days));
    const series = [
      FX.smoothLine({ id: 'pace', name: 'Even pace', data: paceData, color: t.dim, width: 1.25, dashed: true, opacity: 0.8, z: 2, markLine: FX.refLine(B, 'budget ' + gbpShort(B)) }),
      FX.area({ id: 'spent', name: 'Spent', data: cum, color: col, width: 2.25, area: t.dark ? 0.3 : 0.2, z: 4, endLabel: v => gbpShort(v) }),
    ];
    if (view.cur && upto < days) {
      const fcData = labels.map((_, i) => (i === upto - 1 ? cum[upto - 1] : i === days - 1 ? fcEnd : null));
      series.push(FX.smoothLine({ id: 'fc', name: 'Forecast', data: fcData, color: alpha(col, 0.8), width: 2, connectNulls: true, z: 3, draw: 500 }));
      series[series.length - 1].lineStyle.type = [1, 5]; series[series.length - 1].lineStyle.cap = 'round';
      if (FX.animated()) series[series.length - 1].animationDelay = 900;
      series.push(FX.pulse({ id: 'now', at: [upto - 1, cum[upto - 1]], color: col }));
    }
    const yMax = Math.max(B, fcEnd || 0, ...cum);
    const option = base({
      grid: { left: 4, right: 56, top: 14, bottom: 4, containLabel: true },
      xAxis: FX.xAxis(labels, { bars: false, extra: { axisLabel: { color: t.dim, fontSize: 10.5, interval: i => i === 0 || i === days - 1 || (i % 7 === 0 && i < days - 4), hideOverlap: true } } }),
      yAxis: FX.yAxis({ ticks: 3, extra: { max: Math.ceil(yMax * 1.08) } }),
      tooltip: FX.tooltip({ trigger: 'axis', formatter: ps => {
        const i = ps[0].dataIndex; const n = view.ms + i;
        const rows = [];
        if (i < upto) rows.push({ c: col, v: gbp2(cum[i]), k: 'spent by then' });
        else if (fcEnd != null) rows.push({ c: alpha(col, 0.7), v: '≈ ' + gbp(cum[upto - 1] + (fcEnd - cum[upto - 1]) * (i - upto + 1) / Math.max(1, days - upto)), k: 'forecast' });
        rows.push({ c: t.dim, v: gbp(paceData[i]), k: 'even pace' });
        if (i < upto) { const d = cum[i] - paceData[i]; rows.push({ v: (d > 0 ? gbp(d) + ' ahead of' : gbp(-d) + ' under') + ' an even pace', k: '', muted: true }); }
        return FX.tip(fDayW(n) + (i === upto - 1 && view.cur ? ' · today' : ''), rows, `Budget ${gbp(B)}`);
      } }),
      series,
    });
    S.burnCd.setEmpty(null);
    const c = plot(S.burnCd, 's:bg-burn', option);
    if (c) FX.live(c);
  }
  function budgetEditor(cd, ctx, bc, B, saved) {
    const M = ctx.M, t = tk();
    cd.body.innerHTML = '';
    const dirty = !!R.budgetDraft && JSON.stringify(cleanBudgets(R.budgetDraft)) !== JSON.stringify(cleanBudgets(saved));
    cd.setSub(`${fMonth(bc.mi)} · forecasts blend this month’s pace with your last ${bc.fullMonths.length || 0} month${bc.fullMonths.length === 1 ? '' : 's'}` + (R.budgetsLocal ? ' · saved in this browser only (server has no budgets route yet)' : ''));
    cd.tools.innerHTML = '';
    const saveBtn = h('button', { type: 'button', class: 'fv-btn primary', disabled: !dirty || R.budgetsBusy, text: R.budgetsBusy ? 'Saving…' : 'Save budgets', onclick: saveBudgets });
    const suggest = h('button', { type: 'button', class: 'fv-btn ghost', title: 'Fill empty budgets with your average month, rounded up to the next 5', onclick: () => budSuggest() }, ic('sparkles'), h('span', { text: 'Suggest from history' }));
    const discard = h('button', { type: 'button', class: 'fv-btn ghost', text: 'Discard changes', hidden: !dirty, onclick: () => { R.budgetDraft = null; UPDATE.budgets(R.ctx); } });
    cd.tools.append(suggest, discard, saveBtn);
    const all = M.spendCats.filter(c => c !== 'Internal transfers');
    const rows = all.map(c => ({ c, b: +B[c] || 0, s: bc.spent[c] || 0, f: bc.fc(c), a: bc.avg3(c) }))
      .filter(r => r.b > 0 || r.s > 0 || (r.a || 0) > 0 || saved[r.c] > 0)
      .sort((p, q) => (q.b > 0) - (p.b > 0) || q.s - p.s || (q.a || 0) - (p.a || 0));
    const extra = all.filter(c => !rows.some(r => r.c === c));
    const freeMax = Math.max(1, ...rows.filter(r => !(r.b > 0)).map(r => Math.max(r.f, r.s)));
    const pace = bc.elapsed / bc.total;
    const tbl = h('table', { class: 'fv-table fv-budget' },
      h('thead', null, h('tr', null, h('th', { text: 'Category' }), h('th', { class: 'r', text: 'Budget / month' }), h('th', { class: 'r', text: '3-month avg' }), h('th', { class: 'r', text: 'Spent' }), h('th', { class: 'prog', text: 'Progress' }), h('th', { class: 'r', text: 'Forecast' }), h('th', { text: 'Status' }))),
      h('tbody', null, rows.map(r => {
        const inp = h('input', { type: 'number', min: '0', step: '5', inputmode: 'decimal', class: 'fv-input fv-money', placeholder: '—', 'aria-label': `Monthly budget for ${r.c}` });
        if (r.b > 0) inp.value = String(r.b);
        inp.addEventListener('input', () => {
          const v = inp.value === '' ? 0 : Number(inp.value);
          if (!isFinite(v) || v < 0) { inp.classList.add('bad'); return; }
          inp.classList.remove('bad');
          R.budgetDraft = Object.assign({}, R.budgetDraft || saved);
          if (v > 0) R.budgetDraft[r.c] = round2(v); else delete R.budgetDraft[r.c];
          const d2 = JSON.stringify(cleanBudgets(R.budgetDraft)) !== JSON.stringify(cleanBudgets(saved));
          saveBtn.disabled = !d2 || R.budgetsBusy; discard.hidden = !d2;
        });
        inp.addEventListener('change', () => UPDATE.budgets(R.ctx));
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { inp.blur(); if (!saveBtn.disabled) saveBudgets(); } });
        const look = budgetLook(r.s, r.b, pace, budgetScheduled(r.c));
        // Budgeted rows read against their own budget; the rest share one scale.
        const max = r.b > 0 ? Math.max(r.b, r.f, r.s, 1) : freeMax;
        const col = r.b > 0 ? budToneHex(look.tone) : t.uncat;
        return h('tr', null,
          h('td', null, h('span', { class: 'fv-cell-cat' }, sw(catColor(r.c)), r.c)),
          h('td', { class: 'r' }, h('span', { class: 'fv-money-wrap' }, h('span', { class: 'cur', text: SYM }), inp)),
          h('td', { class: 'r num mute', text: r.a != null ? gbp(r.a) : '—' }),
          h('td', { class: 'r num', text: gbp(r.s) }),
          h('td', { class: 'prog' }, h('div', { class: 'fv-prog', title: r.b ? `${pct(r.s / r.b)} used` : '' },
            h('i', { class: 'fc', style: { width: (r.f / max * 100).toFixed(1) + '%', background: col } }),
            h('i', { class: 'sp', style: { width: (r.s / max * 100).toFixed(1) + '%', background: col } }),
            r.b ? h('b', { style: { left: (r.b / max * 100).toFixed(1) + '%' } }) : null,
            h('em', { style: { left: (pace * 100 * (r.b ? r.b / max : 1)).toFixed(1) + '%' }, title: 'Where you would be at an even pace' }))),
          h('td', { class: 'r num', text: gbp(r.f) }),
          h('td', null, h('span', { class: 'fv-bst ' + look.tone }, ic(look.icon), look.k === 'none' ? 'No budget' : look.l)));
      })));
    cd.body.append(h('div', { class: 'fv-tablewrap' }, tbl));
    if (extra.length) {
      const sel = h('select', { class: 'fv-input', 'aria-label': 'Add a budget for another category' }, h('option', { value: '', text: '+ Add a category…' }), extra.map(c => h('option', { value: c, text: c })));
      sel.addEventListener('change', () => { if (!sel.value) return; R.budgetDraft = Object.assign({}, R.budgetDraft || saved, { [sel.value]: 50 }); UPDATE.budgets(R.ctx); });
      cd.body.append(h('div', { class: 'fv-budget-add' }, sel, h('span', { class: 'mute', text: 'The tick marks where you’d be at an even pace through the month.' })));
    }
  }
  async function saveBudgets() {
    if (!R.budgetDraft) return;
    const b = cleanBudgets(R.budgetDraft);
    R.budgetsBusy = true; UPDATE.budgets(R.ctx);
    try {
      const r = await api('/api/finance/budgets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ budgets: b }) });
      if (r.ok && r.body && r.body.budgets) { R.budgets = cleanBudgets(r.body.budgets); R.budgetsLocal = false; R.budgetDraft = null; toast('Budgets saved'); }
      else if (r.status === 404 || r.status === 405) { R.budgets = b; F.localBudgets = b; saveF(); R.budgetsLocal = true; R.budgetDraft = null; toast('Saved in this browser (restart the OpenDash server to store budgets in the finance folder)'); }
      else toast('Could not save budgets: ' + (r.body.error || 'HTTP ' + r.status), { bad: true });
    } catch (e) { toast('Could not reach the OpenDash server', { bad: true }); }
    R.budgetsBusy = false;
    if (R.sectionId === 'budgets') UPDATE.budgets(R.ctx);
    if (R.ctx && R.sectionId === 'categories' && typeof catTable === 'function' && S.table) catTable(S.table, R.ctx);
  }
  // Twelve months of the selection against its budget: rounded bars (red only
  // for a month that went over), this month so far with its forecast as a
  // ghost, the budget as a quiet line. Click a month to see how it ended.
  function budgetHistory(cd, ctx, bc) {
    const M = ctx.M, t = tk();
    const saved = R.budgets || {};
    const cats = Object.keys(saved).filter(c => saved[c] > 0 && c !== 'Internal transfers');
    cd.tools.innerHTML = '';
    if (F.budgetCat && F.budgetCat !== '*' && !M.spendCats.includes(F.budgetCat)) F.budgetCat = '';
    // With no budgets yet, show the everyday category you spend most on (not rent, transfers or money to people).
    const notBudgety = c => c === 'Uncategorised' || c === 'Internal transfers' || /\b(people|transfer)/i.test(c) || (budgetScheduled(c) && /rent|mortgage|housing/i.test(c));
    const topCat = M.spendCats.filter(c => !notBudgety(c)).sort((p, q) => ((bc.avg3(q) || 0) + (bc.spent[q] || 0)) - ((bc.avg3(p) || 0) + (bc.spent[p] || 0)))[0]
      || Object.entries(bc.spent).sort((p, q) => q[1] - p[1]).map(e => e[0]).find(c => c !== 'Uncategorised') || M.spendCats[0] || '';
    const sel = F.budgetCat || (cats.length ? '*' : topCat);
    const pick = h('select', { class: 'fv-input', 'aria-label': 'Category' }, cats.length ? h('option', { value: '*', text: 'All budgeted categories' }) : null, M.spendCats.filter(c => c !== 'Internal transfers').map(c => h('option', { value: c, text: c })));
    pick.value = sel;
    pick.addEventListener('change', () => { if (pick.value === sel) return; if (cats.length && (pick.value === '*' || cats.includes(pick.value))) budPick(pick.value); else { F.budgetCat = pick.value; saveF(); budgetHistory(cd, R.ctx, bc); } });
    cd.tools.append(pick);
    const m0 = Math.max(monthIdx(M.minN), bc.mi - 11);
    const months = []; for (let k = m0; k <= bc.mi; k++) months.push(k);
    const inSel = c => sel === '*' ? cats.includes(c) : c === sel;
    const vals = months.map(() => 0);
    for (const x of M.tx) if (x.kind === 'spend' && inSel(x.c)) { const i = monthIdx(x.n) - m0; if (i >= 0 && i < months.length) vals[i] += x.s; }
    const budget = sel === '*' ? sum(cats, c => saved[c]) : (saved[sel] || 0);
    if (!vals.some(v => v > 0)) { cd.setEmpty('No spending in this category over the last 12 months.'); return; }
    const fcNow = sel === '*' ? sum(cats, c => bc.fc(c)) : bc.fc(sel);
    const fullVals = vals.slice(monthStart(m0) < M.minN ? 1 : 0, -1);   // whole months only
    const overN = budget ? fullVals.filter(v => v > budget + 0.004).length : 0;
    cd.setSub(budget ? `Budget ${gbp(budget)} a month · this month heading for ${gbp(fcNow)}` + (fullVals.length ? ` · over in ${overN} of the last ${fullVals.length} full month${fullVals.length === 1 ? '' : 's'}` : '') : 'No budget set for this category');
    const view = R.budgetMonth != null && R.sectionId === 'budgets' ? R.budgetMonth : null;
    // A part month (this one so far, or the first one when the data starts mid-month) is pale, so it never reads as a dip.
    const part0 = monthStart(m0) < M.minN;
    const isPart = k => k === bc.mi || (part0 && k === m0);
    const colOf = (v, k) => (budget && v > budget + 0.004 ? (isPart(k) && k !== bc.mi ? alpha(t.sCrit, 0.5) : t.sCrit) : isPart(k) ? alpha(t.accent, t.dark ? 0.6 : 0.5) : t.accent);
    const opac = k => (view == null ? 1 : k === view ? 1 : 0.32);
    const lbl = months.map(k => fMonthS(k, bc.mi - m0 > 11));
    const option = base({
      grid: { left: 8, right: 16, top: 26, bottom: 4, containLabel: true },
      tooltip: FX.tooltip({ trigger: 'axis', pointer: 'shadow', formatter: ps => {
        const i = ps[0].dataIndex; const k = months[i];
        const rows = [{ c: colOf(vals[i], k), v: gbp2(vals[i]), k: k === bc.mi ? 'spent so far' : 'spent', box: true }];
        if (k === bc.mi) rows.push({ c: alpha(t.accent, 0.35), v: gbp(fcNow), k: 'forecast for the month', box: true });
        if (budget) rows.push({ c: t.dim, v: gbp(budget), k: vals[i] > budget ? `budget · over by ${gbp(vals[i] - budget)}` : `budget · ${gbp(budget - vals[i])} to spare` });
        return FX.tip(fMonth(k) + (k === bc.mi ? ' (so far)' : part0 && k === m0 ? ` (from ${fDay(M.minN)})` : ''), rows, k === bc.mi ? null : (view === k ? 'Showing this month above' : 'Click to see how it ended'));
      } }),
      xAxis: FX.xAxis(lbl, { line: true }),
      yAxis: FX.yAxis({ ticks: 3, extra: budget ? { max: v => Math.ceil(Math.max(v.max, budget, fcNow) * 1.08) } : {} }),
      series: [
        FX.bars({ id: 'fc', data: months.map(k => (k === bc.mi ? { value: round2(Math.max(fcNow, vals[months.length - 1])), itemStyle: { color: alpha(t.accent, t.dark ? 0.16 : 0.12), borderColor: alpha(t.accent, 0.5), borderWidth: 1, borderType: [3, 3] } } : null)),
          width: 28, gap: '-100%', stagger: false, lift: false, z: 1, tooltip: { show: false } }),
        Object.assign(FX.bars({ id: 'h', name: 'Spent', data: months.map((k, i) => ({ value: round2(vals[i]), itemStyle: { color: colOf(vals[i], k), opacity: opac(k) } })), width: 28, gap: '-100%', z: 2,
          markLine: budget ? FX.refLine(budget, 'budget ' + gbpShort(budget)) : undefined }), { cursor: 'pointer' }),
      ],
    });
    const c = plot(cd, 's:bg-hist', option);
    if (c) FX.onPick(c, p => (p && months[p.dataIndex] != null ? months[p.dataIndex] : null), k => (k === bc.mi ? view == null : view === k),
      k => { budSetMonth(k === bc.mi ? null : k); if (R.sectionId === 'budgets') S.hero.scrollIntoView({ behavior: MK.reduced() ? 'auto' : 'smooth', block: 'nearest' }); });
  }
