  // @part 29-money-alive.js · NEW (30 Oct 2026) · OWNER: Finance symbols (small touches that bring Money to life: the mood sky's weather, payday, new-import receipt, living categories, landing numbers)
  // Calm first: everything here reads at a glance, never covers a number, stops under reduced motion,
  // and the Fun level dials it (Off leaves the plain page).
  const faFun = () => { try { return typeof gameFun === 'function' ? gameFun() : 'subtle'; } catch (e) { return 'subtle'; } };

  /* ---------- the mood sky: a sun that crosses the month, more cloud when the pace runs warm ---------- */
  // Never a storm: a warm month is a cloudier one, not a telling-off.
  function faSky(B) {
    if (faFun() === 'off') return '';
    const cyc = B.cycle, p = clamp(cyc.day / Math.max(1, cyc.len - 1), 0, 1);
    const n = { cool: 0, calm: 1, warm: 2, hot: 3 }[B.mood.mood] || 0;
    const clouds = [[62, 18, 1], [28, 12, 0.72], [80, 34, 0.56]].slice(0, n).map(([x, y, s], i) => `<i class="fa-cloud" style="--x:${x}%;--y:${y}%;--s:${s};--k:${i}"></i>`).join('');
    // The sun rises through the month: low at the start, high in the middle, low at the end.
    const top = 56 - Math.sin(p * Math.PI) * 44;
    return `<i class="fa-sun" style="--x:${(6 + p * 88).toFixed(1)}%;--y:${top.toFixed(1)}%"></i>${clouds}`;
  }

  /* ---------- payday: a gentle hello on the day, and where it's all going ---------- */
  function faPayday(hero, B) {
    if (!hero) return;
    const old = hero.querySelector('.fa-payday');
    const fun = faFun();
    const M = R.model;
    const pd = M && fun !== 'off' ? VL.payday(M.tx, M.anchor, 300) : null;
    const lastAmt = pd && pd.days.length ? pd.days[pd.days.length - 1] : null;
    const ui = (typeof state !== 'undefined' && state && state.homeUI) || {};
    const show = lastAmt && M.anchor - lastAmt.n <= 1 && lastAmt.n > M.anchor - 2 && ui.finPaydayDone !== lastAmt.n;
    if (!show) { if (old) old.remove(); return; }
    if (old && old.dataset.n === String(lastAmt.n)) return;
    if (old) old.remove();
    const bills = Math.min(lastAmt.amt, Math.max(0, B.billsTotal || 0));
    const rest = Math.max(0, lastAmt.amt - bills);
    const pctB = lastAmt.amt > 0 ? bills / lastAmt.amt * 100 : 0;
    const anim = !MK.reduced();
    const el = h('aside', { class: 'fa-payday' + (anim ? ' is-enter' : ''), 'data-n': String(lastAmt.n), 'aria-label': 'Payday' },
      anim && fun === 'full' ? h('span', { class: 'fa-coins', 'aria-hidden': 'true', html: Array.from({ length: 9 }, (_, i) => `<i style="--k:${i};--x:${6 + i * 11}%"></i>`).join('') }) : null,
      h('div', { class: 'fa-pd-t' }, h('b', { text: 'Payday!' }), ' ', h('span', { class: 'fv-amt', text: gbp(lastAmt.amt) }), ' came in.'),
      bills > 0.5 ? h('div', { class: 'fa-pd-flow', role: 'img', 'aria-label': `About ${gbp(bills)} goes to bills before the next payday; ${gbp(rest)} is left for everything else.` },
        h('span', { class: 'fa-pd-b', style: { flex: `${Math.max(8, pctB).toFixed(1)} 1 0` } }, h('em', { text: 'Bills ahead' }), h('b', { class: 'fv-amt', text: gbp(bills) })),
        h('span', { class: 'fa-pd-r', style: { flex: `${Math.max(8, 100 - pctB).toFixed(1)} 1 0` } }, h('em', { text: 'Everything else' }), h('b', { class: 'fv-amt', text: gbp(rest) }))) : null,
      h('button', { type: 'button', class: 'fa-pd-x', 'aria-label': 'Close the payday note', onclick: () => {
        if (!state.homeUI || typeof state.homeUI !== 'object') state.homeUI = {};
        state.homeUI.finPaydayDone = lastAmt.n;
        if (typeof saveUI === 'function') saveUI();
        el.remove();
      } }, ic('x', 'i-sm')));
    const body = hero.querySelector('.fv-mb-actions');
    if (body && body.parentElement) body.parentElement.insertBefore(el, body); else hero.append(el);
  }

  /* ---------- at the turn of the year: a way in to the year's story ---------- */
  function faYearButton(actions, anchor) {
    if (!actions || actions.querySelector('.fa-yearb') || faFun() === 'off') return;
    const d = new Date(anchor * 864e5), m = d.getUTCMonth(), day = d.getUTCDate();
    if (!((m === 11 && day >= 15) || (m === 0 && day <= 15))) return;
    if (typeof msCanPlay === 'function' && !msCanPlay()) return;
    const y = m === 0 ? d.getUTCFullYear() - 1 : d.getUTCFullYear();
    actions.insertBefore(h('button', { type: 'button', class: 'fv-mb-btn fa-yearb', title: `Your ${y} in money as a story, read aloud`, onclick: () => msOpen({ period: 'year' }) }, msPlayEl(), h('span', { text: `Your ${y}` })), actions.children[2] || null);
  }

  /* ---------- new payments arriving: a tiny receipt prints beside the count ---------- */
  function faReceipt(host, n) {
    if (!host || !(n > 0) || faFun() === 'off' || MK.reduced()) return;
    if (host.querySelector('.fa-receipt')) return;
    const el = h('span', { class: 'fa-receipt', role: 'status', title: `${n} new since your last visit`, 'aria-label': `${n} new since your last visit` },
      h('span', { class: 'fa-rc-printer', 'aria-hidden': 'true' }), h('span', { class: 'fa-rc-paper', 'aria-hidden': 'true', html: '<i></i><i></i><i></i>' }), h('b', { text: `${n > 99 ? '99+' : n} new` }));
    host.prepend(el);
    setTimeout(() => { if (el.isConnected) el.classList.add('is-done'); }, 3200);
    setTimeout(() => { if (el.isConnected) el.remove(); }, 3800);
  }

  /* ---------- spending by category as a living scene: a jar per category, filled in proportion ---------- */
  function faLiving(host, items, total, onPick) {
    host.innerHTML = '';
    const FS = FSY();
    const grid = h('div', { class: 'fa-jars', role: 'list' });
    const max = Math.max(1, ...items.map(x => x.value));
    items.slice(0, 10).forEach((it, i) => {
      const fill = clamp(it.value / max, 0.04, 1);
      const col = it.color || catColor(it.name);
      const tile = h('button', { type: 'button', class: 'fa-jar fsym-host', role: 'listitem', style: { '--c': col, '--k': i, '--f': fill.toFixed(3) }, 'aria-label': `${it.name}: ${gbp(it.value)}, ${Math.round(it.value / Math.max(1, total) * 100)}% of the spending`, onclick: () => onPick && onPick(it) },
        h('span', { class: 'fa-jar-glass', 'aria-hidden': 'true' }, h('i', { class: 'fa-jar-liquid' })),
        h('span', { class: 'fa-jar-ic', html: FS ? FS.categoryIcon(it.name, { size: 'md', live: 'hover', plain: true, color: col }) : '' }),
        h('b', { class: 'fa-jar-v fv-amt', text: gbp(it.value) }),
        h('span', { class: 'fa-jar-n', text: it.name }));
      grid.append(tile);
    });
    host.append(grid);
  }
  /* ---------- a number that lands: one small pop when a count-up reaches the real figure ---------- */
  function faLand(el, ms) {
    if (!el || MK.reduced()) return;
    setTimeout(() => { if (el.isConnected) { el.classList.add('fa-land'); setTimeout(() => el.classList.remove('fa-land'), 460); } }, ms);
  }
