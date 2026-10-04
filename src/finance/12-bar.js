  // @part 12-bar.js · OWNER: C3 (sticky bar: tabs, presets, timeline, filters, pills; setSection, paintTabs)
  // The sidebar's icons (15-nav-sidebar.js _FIN_SECTION_ICONS), so the tab strip and the sidebar agree.
  const SECTION_ICONS = { overview: 'gauge', spending: 'chart-column', categories: 'layout-grid', merchants: 'building-2', cashflow: 'arrow-up-down', recurring: 'repeat', budgets: 'piggy-bank', transactions: 'receipt' };
  // The current tab's glyph does one small motion when it becomes current (transform only).
  const TAB_MOTION = {
    overview: [{ transform: 'rotate(-34deg)' }, { transform: 'rotate(9deg)', offset: 0.55 }, { transform: 'none' }],
    spending: [{ transform: 'scaleY(0.35)' }, { transform: 'scaleY(1.1)', offset: 0.6 }, { transform: 'none' }],
    categories: [{ transform: 'scale(0.7)' }, { transform: 'scale(1.14)', offset: 0.55 }, { transform: 'none' }],
    merchants: [{ transform: 'translateY(-3.5px)' }, { transform: 'translateY(0.5px)', offset: 0.6 }, { transform: 'none' }],
    cashflow: [{ transform: 'translateY(3px)' }, { transform: 'translateY(-2.5px)', offset: 0.5 }, { transform: 'none' }],
    recurring: [{ transform: 'rotate(-180deg)' }, { transform: 'none' }],
    budgets: [{ transform: 'rotate(-14deg) translateY(-1px)' }, { transform: 'rotate(9deg)', offset: 0.5 }, { transform: 'none' }],
    transactions: [{ transform: 'translateY(-4px)', opacity: 0.3 }, { transform: 'none', opacity: 1 }],
  };
  function buildReady(root) {
    const E = R.els;
    root.append(buildTop());
    const body = h('div', { class: 'fv-body' });
    root.append(body);
    // Sticky bar: tabs + filters
    const sentinel = h('div', { class: 'fv-sentinel', 'aria-hidden': 'true' });
    E.tabs = h('div', { class: 'fv-tabs', role: 'tablist', 'aria-label': 'Finance sections' });
    E.ink = h('span', { class: 'fv-tab-ink', 'aria-hidden': 'true' });
    E.tabBtns = SECTIONS.map(([id, label]) => {
      const b = h('button', { type: 'button', role: 'tab', class: 'fv-tab', 'data-id': id, 'aria-controls': 'fv-panel', onclick: () => setSection(id) },
        h('span', { class: 'fv-tab-ic', 'data-id': id, 'aria-hidden': 'true' }, ic(SECTION_ICONS[id] || 'circle')), h('span', { class: 'fv-tab-l', text: label }));
      E.tabs.append(b); return b;
    });
    E.tabs.append(E.ink);
    E.tabs.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = E.tabBtns.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); const nb = E.tabBtns[(i + (e.key === 'ArrowRight' ? 1 : E.tabBtns.length - 1)) % E.tabBtns.length]; nb.focus(); nb.click();
    });
    // Fonts landing or the strip resizing move the tabs: keep the ink under the current one.
    if (R.tabRo) { R.tabRo.disconnect(); R.tabRo = null; }
    if (typeof ResizeObserver !== 'undefined') { R.tabRo = new ResizeObserver(() => paintTabs(false)); R.tabRo.observe(E.tabs); }

    E.presets = seg(PRESETS.map(p => [p, p, p === 'YTD' ? 'Year to date' : p === 'All' ? 'All history' : 'Last ' + p.replace('W', ' week').replace('M', ' months').replace('Y', ' year').replace(/^1 months/, '1 month')]), F.preset, setPreset, 'Date range', 'fv-presets');
    E.rangeTxt = h('span', { class: 'fv-range-t' }); E.rangeDays = h('small', { class: 'fv-range-d' });
    E.rangeLbl = h('button', { class: 'fv-range-lbl', type: 'button', title: 'Show more filters', onclick: () => { F.more = !F.more; saveF(); paintFilters(); } }, E.rangeTxt, E.rangeDays);
    E.back = h('button', { class: 'btn-icon fv-icon-btn', type: 'button', 'data-tip': 'Back to the previous date range', 'aria-label': 'Back to the previous date range', onclick: rangeBack }, ic('undo-2'));
    E.gran = seg(GRANS, F.gran, g => { F.gran = g; changed(); }, 'Granularity');
    E.compare = toggle('Compare', F.compare, v => { F.compare = v; changed(); }, 'Compare with the previous period of the same length');
    E.moreBtn = h('button', { class: 'fv-btn ghost fv-more-btn', type: 'button', 'aria-expanded': 'false', onclick: () => { F.more = !F.more; saveF(); paintFilters(); } }, ic('list-filter'), h('span', { text: 'Filters' }), h('span', { class: 'fv-badge', hidden: true }));
    E.reset = h('button', { class: 'fv-btn ghost', type: 'button', text: 'Reset', title: 'Reset all filters', onclick: resetFilters });
    // Active filters as chips beside the range (clear with ×, "Clear all" or Esc).
    E.pills = h('div', { class: 'fv-pills', 'aria-live': 'polite', hidden: true });
    E.pillMap = new Map();
    E.pillClear = h('span', { class: 'fv-pills-end' },
      h('button', { type: 'button', class: 'fv-link', text: 'Clear all', onclick: () => { F.cats = []; F.accts = []; F.merchant = ''; F.q = ''; F.amt = null; changed(); } }),
      h('kbd', { class: 'fv-esc-hint', title: 'Esc clears the selection', text: 'Esc' }));
    E.pills.append(E.pillClear);
    // "Updating…" while a refresh is on its way (the old render stays, dimmed).
    E.upd = h('span', { class: 'fv-upd', role: 'status' }, ic('loader-circle', 'fv-spin'), h('span', { text: 'Updating…' }));
    // Two groups: the date controls on the left, view controls on the right.
    // Each group wraps as a unit, so narrow widths never strand one button.
    const row1 = h('div', { class: 'fv-bar' },
      h('div', { class: 'fv-bar-l' }, E.presets.el, E.back, E.rangeLbl, E.pills, E.upd),
      h('div', { class: 'fv-bar-r' }, E.gran.el, E.compare.el, h('span', { class: 'fv-bar-sep', 'aria-hidden': 'true' }), E.moreBtn, E.reset));

    // The navigator: the whole history as a soft area, the chosen window lit in the accent.
    E.navSel = null;
    E.timeline = dualSlider({
      min: 0, max: 1, lo: 0, hi: 1, step: 1, label: 'Date range', cls: 'fv-timeline',
      fmt: n => fDayY(n),
      onInput: (lo, hi) => { E.rangeTxt.textContent = fRange(lo, hi); E.rangeDays.textContent = `${hi - lo + 1} days`; },
      onChange: (lo, hi) => setCustomRange(lo, hi),
      onPaint: (l, r) => { if (E.navSel) E.navSel.style.clipPath = `inset(0 ${(100 - r).toFixed(3)}% 0 ${l.toFixed(3)}%)`; },
    });

    // Collapsible filter panel
    E.catChips = h('div', { class: 'fv-chips', role: 'group', 'aria-label': 'Categories' });
    E.acctChips = h('div', { class: 'fv-chips', role: 'group', 'aria-label': 'Accounts' });
    E.search = h('input', { type: 'search', class: 'fv-input', placeholder: 'Search merchants and descriptions', 'aria-label': 'Search merchants and descriptions' });
    let qt = 0;
    E.search.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { F.q = E.search.value; R.page = 0; changed(); }, 220); });
    const AMT_POW = 2.4;
    const amtVal = pos => { const M = R.model; const v = M.maxAmt * Math.pow(pos / 1000, AMT_POW); return v < 20 ? Math.round(v * 2) / 2 : v < 200 ? Math.round(v) : Math.round(v / 5) * 5; };
    const amtPos = v => Math.round(1000 * Math.pow(clamp(v / R.model.maxAmt, 0, 1), 1 / AMT_POW));
    E.amtVal = amtVal; E.amtPos = amtPos;
    E.amount = dualSlider({
      min: 0, max: 1000, lo: 0, hi: 1000, step: 1, label: 'Amount', cls: 'fv-amount',
      fmt: p => p >= 1000 ? 'Any' : gbp(amtVal(p)),
      onChange: (lo, hi) => setAmt(lo <= 0 ? 0 : amtVal(lo), hi >= 1000 ? R.model.maxAmt : amtVal(hi)),
    });
    E.amount.el.querySelector('.fv-dual-la').title = 'Smallest amount';
    E.incT = toggle('Money in', F.inc, v => { F.inc = v; changed(); }, 'Show income in lists and the spending chart');
    E.xferT = toggle('Transfers', F.xfer, v => { F.xfer = v; changed(); }, 'Show transfers between your own accounts in lists');
    // Phone: the bar keeps only the range and Filters; grouping and Compare move in here.
    E.gran2 = seg(GRANS, F.gran, g => { F.gran = g; changed(); }, 'Granularity');
    E.compare2 = toggle('Compare', F.compare, v => { F.compare = v; changed(); }, 'Compare with the previous period of the same length');
    E.more = h('div', { class: 'fv-more' }, h('div', { class: 'fv-more-in' },
      h('div', { class: 'fv-frow fv-phone-only' }, h('span', { class: 'fv-flabel', text: 'View' }), h('div', { class: 'fv-toggles' }, E.gran2.el, E.compare2.el,
        h('button', { class: 'fv-btn ghost', type: 'button', text: 'Reset', title: 'Reset all filters', onclick: resetFilters }))),
      h('div', { class: 'fv-frow' }, h('span', { class: 'fv-flabel', text: 'Categories' }), E.catChips),
      E.acctRow = h('div', { class: 'fv-frow' }, h('span', { class: 'fv-flabel', text: 'Accounts' }), E.acctChips),
      h('div', { class: 'fv-frow fv-frow-split' },
        h('div', { class: 'fv-fcell' }, h('span', { class: 'fv-flabel', text: 'Search' }), E.search),
        h('div', { class: 'fv-fcell grow' }, h('span', { class: 'fv-flabel', text: 'Amount' }), E.amount.el),
        h('div', { class: 'fv-fcell' }, h('span', { class: 'fv-flabel', text: 'Include' }), h('div', { class: 'fv-toggles' }, E.incT.el, E.xferT.el)))));
    E.sticky = h('div', { class: 'fv-sticky' }, E.tabs, h('div', { class: 'fv-filters' }, row1, E.timeline.el, E.more));
    body.append(sentinel, E.sticky);
    if (R.io) { R.io.disconnect(); R.io = null; }   // one per rebuild, never stacked
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([en]) => E.sticky.classList.toggle('is-stuck', !en.isIntersecting), { threshold: 0 });
      io.observe(sentinel); R.io = io;
    }
    E.kpis = h('div', { class: 'fv-kpis' });
    E.panel = h('div', { class: 'fv-panel', id: 'fv-panel', role: 'tabpanel' });
    E.foot = h('div', { class: 'fv-foot' });
    body.append(E.kpis, E.panel, E.foot);
    wireSwipe(E.panel);
    wireKeys();
    MK.wireVis();
    buildKpis();
  }

  // ── Filter bar painting ───────────────────────────────────────────────
  function paintFilters(ctx) {
    const E = R.els, M = R.model; if (!E.presets) return;
    ctx = ctx || R.ctx;
    E.presets.set(F.preset); E.gran.set(F.gran); E.compare.set(F.compare); E.incT.set(F.inc); E.xferT.set(F.xfer);
    E.gran2.set(F.gran); E.compare2.set(F.compare);
    E.back.hidden = !R.rangeHistory.length;
    E.rangeTxt.textContent = fRange(ctx.rg.from, ctx.rg.to);
    E.rangeDays.textContent = `${ctx.rg.len} day${ctx.rg.len === 1 ? '' : 's'}`;
    E.rangeLbl.setAttribute('aria-label', `${fRange(ctx.rg.from, ctx.rg.to)}, ${ctx.rg.len} day${ctx.rg.len === 1 ? '' : 's'}. Show more filters`);
    // Navigator art: weekly (or daily) spend over all time, non-date filters applied,
    // as a monotone area (no overshoot: never below zero, never above a real week).
    const q = pred(); const span = M.anchor - M.minN + 1; const step = span > 200 ? 7 : 1;
    const nb = Math.ceil(span / step); const vals = new Array(nb).fill(0);
    for (const t of M.tx) if (t.kind === 'spend' && q(t)) { const i = Math.floor((t.n - M.minN) / step); if (i >= 0 && i < nb) vals[i] += Math.max(0, t.s); }
    const key = nb + ':' + vals.map(v => Math.round(v)).join(',');
    if (E.navKey !== key) {
      E.navKey = key;
      const mx = Math.max(1, ...vals);
      const pts = vals.map((v, i) => [nb === 1 ? 0.5 : (i + 0.5), 96 - v / mx * 82]);
      const P = [[0, pts[0][1]], ...pts, [nb, pts[pts.length - 1][1]]];
      const line = monoPath(P);
      const area = line + `L${nb} 100L0 100Z`;
      const svg = cls => `<svg class="${cls}" viewBox="0 0 ${nb} 100" preserveAspectRatio="none" aria-hidden="true"><path class="a" d="${area}"/><path class="l" d="${line}" vector-effect="non-scaling-stroke"/></svg>`;
      E.timeline.art.innerHTML = svg('fv-nav-base') + `<div class="fv-nav-sel">${svg('fv-nav-lit')}</div>`;
      E.navSel = E.timeline.art.querySelector('.fv-nav-sel');
    }
    if (!E.timeline.dragging()) E.timeline.set(ctx.rg.from, ctx.rg.to, M.minN, M.anchor);
    // Filters panel
    E.more.classList.toggle('open', !!F.more); E.moreBtn.setAttribute('aria-expanded', String(!!F.more));
    E.more.inert = !F.more;   // @p2 a closed panel (0 high, transparent) keeps its ~20 controls out of the Tab order
    if (!E.more.id) { E.more.id = 'fv-more'; E.moreBtn.setAttribute('aria-controls', 'fv-more'); }
    E.moreBtn.classList.toggle('on', !!F.more);
    const nActive = F.cats.length + F.accts.length + (F.merchant ? 1 : 0) + (F.q ? 1 : 0) + (F.amt ? 1 : 0);
    const badge = E.moreBtn.querySelector('.fv-badge'); badge.hidden = !nActive; badge.textContent = nActive;
    // Category chips (spending categories with any spend, plus selected ones)
    const allT = {}; M.tx.forEach(t => { if (t.kind === 'spend') allT[t.c] = (allT[t.c] || 0) + t.s; });
    const cats = M.spendCats.filter(c => allT[c] > 0 || F.cats.includes(c)).sort((p, r) => (allT[r] || 0) - (allT[p] || 0));
    E.catChips.innerHTML = '';
    E.catChips.append(h('button', { type: 'button', class: 'fv-chip' + (F.cats.length ? '' : ' on'), 'aria-pressed': String(!F.cats.length), text: 'All', onclick: () => { if (F.cats.length) setCats([]); } }));
    for (const c of cats) {
      const onn = F.cats.includes(c);
      E.catChips.append(h('button', { type: 'button', class: 'fv-chip' + (onn ? ' on' : ''), 'aria-pressed': String(onn), title: 'Click to add or remove · double-click for only this', onclick: () => toggleCat(c), ondblclick: () => setCats([c]) }, sw(catColor(c)), c));
    }
    E.acctRow.hidden = M.accts.length < 2 && M.sources.length < 2;
    E.acctChips.innerHTML = '';
    // Several sources (banks): a chip per source first (picks all its accounts), then each account with its source's colour.
    const dotOf = (colour) => h('span', { class: 'fv-src-dot c-' + (/^[a-z]{3,8}$/.test(colour || '') ? colour : 'slate') });
    if (M.sources.length > 1) {
      for (const src of M.sources) {
        const all = src.accts.every(ac => F.accts.includes(ac)) && F.accts.length === src.accts.length;
        E.acctChips.append(h('button', { type: 'button', class: 'fv-chip fv-chip-src' + (all ? ' on' : ''), 'aria-pressed': String(all), title: 'Only ' + src.label,
          onclick: () => { F.accts = all ? [] : src.accts.slice(); changed(); } }, dotOf(src.colour), h('span', { text: src.label }), h('span', { class: 'fv-chip-n', text: String(src.accts.length) })));
      }
      E.acctChips.append(h('span', { class: 'fv-chip-sep', 'aria-hidden': 'true' }));
    }
    for (const ac of M.accts) {
      const onn = F.accts.includes(ac);
      const info = M.acctInfo[ac] || {};
      E.acctChips.append(h('button', { type: 'button', class: 'fv-chip' + (onn ? ' on' : ''), 'aria-pressed': String(onn), title: info.sourceLabel ? 'From ' + info.sourceLabel : null,
        onclick: () => { F.accts = onn ? F.accts.filter(x => x !== ac) : [...F.accts, ac]; changed(); } }, M.sources.length > 1 ? dotOf(info.colour || info.sourceColour) : null, h('span', { text: M.acctNames[ac] || ac })));
    }
    if (document.activeElement !== E.search) E.search.value = F.q;
    if (!E.amount.dragging()) E.amount.set(F.amt ? E.amtPos(F.amt[0]) : 0, F.amt ? (F.amt[1] >= M.maxAmt - 0.01 ? 1000 : E.amtPos(F.amt[1])) : 1000);
    // Active filter chips, keyed: a chip that stays is left alone (no replayed
    // pop on every repaint); new ones pop in, removed ones shrink away.
    const want = [];
    if (F.merchant) want.push({ k: 'm:' + F.merchant, label: F.merchant, icon: 'building-2', x: () => setMerchant(''), sel: true });
    F.cats.forEach(c => want.push({ k: 'c:' + c, label: c, color: catColor(c), x: () => toggleCat(c), sel: true }));
    F.accts.forEach(ac => want.push({ k: 'a:' + ac, label: 'Account: ' + (M.acctNames[ac] || ac), x: () => { F.accts = F.accts.filter(x => x !== ac); changed(); } }));
    if (F.q) want.push({ k: 'q', label: `“${F.q}”`, icon: 'search', x: () => { F.q = ''; E.search.value = ''; changed(); } });
    if (F.amt) want.push({ k: 'amt', label: `${gbp(F.amt[0])} – ${F.amt[1] >= M.maxAmt - 0.01 ? 'any' : gbp(F.amt[1])}`, x: () => { F.amt = null; changed(); } });
    syncPills(want);
  }
  function syncPills(want) {
    const E = R.els; const keys = new Set(want.map(w => w.k));
    const animate = !MK.reduced() && E.pillsReady;
    for (const [k, el] of [...E.pillMap]) {
      if (keys.has(k)) continue;
      E.pillMap.delete(k);
      if (animate && typeof el.animate === 'function') {
        el.style.pointerEvents = 'none';
        el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.9)' }], { duration: 140, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }).finished.then(() => el.remove(), () => el.remove());
      } else el.remove();
    }
    for (const w of want) {
      let el = E.pillMap.get(w.k);
      if (!el) {
        el = h('span', { class: 'fv-pill' + (w.sel ? ' sel' : '') + (animate ? ' is-new' : '') },
          w.color ? sw(w.color) : w.icon ? ic(w.icon) : null, h('span', { class: 'fv-pill-t' }),
          h('button', { type: 'button', class: 'fv-pill-x', onclick: () => el._x && el._x() }, ic('x')));
        if (animate) el.addEventListener('animationend', () => el.classList.remove('is-new'), { once: true });
        E.pills.insertBefore(el, E.pillClear); E.pillMap.set(w.k, el);
      }
      el._x = w.x;
      el.querySelector('.fv-pill-t').textContent = w.label;
      el.querySelector('.fv-pill-x').setAttribute('aria-label', 'Remove filter ' + w.label);
    }
    E.pills.hidden = !want.length;
    E.pills.classList.toggle('has-sel', want.some(w => w.sel));
    E.pills.classList.toggle('many', want.length > 1);   // "Clear all" only when there is more than one chip
    // Reset only when there is something to reset (it keeps the bar on one line).
    if (E.reset) E.reset.hidden = !want.length && F.preset === '3M' && !F.compare && F.gran === autoGran(getRange().len) && F.inc && !F.xfer;
    E.pillsReady = true;
  }

  function setSection(id, opts) {
    if (!SECTIONS.some(s => s[0] === id)) id = 'overview';
    // @new-begin re-selecting the section you are on is a no-op (CLAUDE.md interaction conventions)
    // No rebuild, no replayed animation; if scrolled down, glide back to the top (phone tab bar).
    if (id === F.section && id === R.sectionId && R.mode === 'ready' && !(opts && opts.force)) {
      const sc = scroller();
      if (sc && sc.scrollTop > 0 && !(opts && opts.noScroll)) sc.scrollTo({ top: 0, behavior: R.reduced ? 'auto' : 'smooth' });
      return;
    }
    // @new-end
    const from = R.sectionId;
    F.section = id; saveF();
    // Keep the shell's breadcrumb and sidebar (Finances › <section>) in step.
    try { if (typeof window.renderCrumb === 'function') window.renderCrumb(); if (typeof window.renderSidebar === 'function' && R.mounted) window.renderSidebar(); } catch (e) { /* shell not loaded */ }
    if (R.mode !== 'ready') return;
    // The old section leaves away from the direction of travel, the new one arrives from it.
    const dir = from && from !== id && !(opts && opts.instant) ? (MK.dir(from, id) || 1) : 0;
    // @p2 the tab ink is measured before the new section is built: afterwards the read forced a
    // full layout of the half-built section (about 30 ms of the switch at 4,000+ transactions).
    paintTabs(!(opts && opts.instant));
    buildSection(id, { dir });
    updateSection(R.ctx || makeCtx());
    if (!(opts && opts.noScroll)) {
      const sc = scroller(); const st = R.els.sticky;
      // If the section content starts above the viewport, bring its top
      // into view under the sticky bar (never scroll down).
      if (sc && st && st.classList.contains('is-stuck')) {
        const delta = R.els.panel.getBoundingClientRect().top - (st.getBoundingClientRect().bottom + 12);
        if (delta < 0) sc.scrollTo({ top: Math.max(0, sc.scrollTop + delta), behavior: R.reduced ? 'auto' : 'smooth' });
      }
    }
  }
  // One 2 px ink under the current tab, moved with transform only
  // (translateX + scaleX of a 100 px bar, 240 ms); no slide on first paint.
  function paintTabs(animate) {
    const E = R.els; if (!E.tabBtns) return;
    let cur = null;
    E.tabBtns.forEach(b => {
      const onn = b.getAttribute('data-id') === F.section;
      b.classList.toggle('on', onn); b.setAttribute('aria-selected', String(onn)); b.tabIndex = onn ? 0 : -1;
      if (onn) { b.setAttribute('aria-current', 'page'); cur = b; } else b.removeAttribute('aria-current');
    });
    if (!cur) return;
    const w = cur.offsetWidth, x = cur.offsetLeft; if (!w) return;
    const inset = Math.max(0, (parseFloat(getComputedStyle(cur).paddingLeft) || 0) - 2); const iw = Math.max(8, w - inset * 2);
    const slide = !!animate && !MK.reduced() && E.ink.classList.contains('ready');
    E.ink.classList.toggle('noanim', !slide);
    E.ink.style.transform = `translateX(${(x + inset).toFixed(1)}px) scaleX(${(iw / 100).toFixed(4)})`;
    if (!E.ink.classList.contains('ready')) requestAnimationFrame(() => E.ink.classList.add('ready'));
    keepTabInView(cur, slide);
    if (slide && E.lastTab && E.lastTab !== F.section) {
      const g = cur.querySelector('.fv-tab-ic');
      if (g && typeof g.animate === 'function' && TAB_MOTION[F.section]) g.animate(TAB_MOTION[F.section], { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }
    E.lastTab = F.section;
  }
  // Phone: the strip scrolls sideways; keep the current tab in view.
  function keepTabInView(b, smooth) {
    const T = R.els.tabs; if (!T || T.scrollWidth <= T.clientWidth + 2) return;
    const l = b.offsetLeft - 28, r = b.offsetLeft + b.offsetWidth + 28;
    let to = null;
    if (l < T.scrollLeft) to = l; else if (r > T.scrollLeft + T.clientWidth) to = r - T.clientWidth;
    if (to != null) T.scrollTo({ left: Math.max(0, to), behavior: smooth ? 'smooth' : 'auto' });
  }
  // Phone: swipe the section sideways for the next / previous tab. Charts,
  // sliders, tables and fields keep their own gestures.
  // The section follows the finger a little (transform only); a horizontal
  // gesture is claimed (preventDefault) so the browser never turns it into a
  // Back / Forward navigation. A mostly vertical one is left to scrolling.
  function wireSwipe(panel) {
    let st = null;
    const grid = () => panel.querySelector(':scope > .fv-grid:not(.fv-ghost)');
    const settle = (g, back) => {
      if (!g) return;
      if (back && !MK.reduced() && typeof g.animate === 'function' && g.style.transform) {
        const from = { transform: g.style.transform, opacity: g.style.opacity || 1 };
        g.style.transform = ''; g.style.opacity = '';
        g.animate([from, { transform: 'none', opacity: 1 }], { duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      } else { g.style.transform = ''; g.style.opacity = ''; }
    };
    panel.addEventListener('touchstart', e => {
      st = null;
      if (e.touches.length !== 1) return;
      const t = e.target;
      if (t && t.closest && t.closest('.fv-chart, input, select, textarea, .fv-dual, .fv-tablewrap, .fv-noswipe, [contenteditable="true"]')) return;
      st = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now(), dir: null, dx: 0 };
    }, { passive: true });
    panel.addEventListener('touchmove', e => {
      if (!st || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - st.x, dy = e.touches[0].clientY - st.y;
      if (st.dir == null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) st.dir = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y';
      if (st.dir === 'y') { st = null; return; }
      if (st.dir !== 'x') return;
      if (e.cancelable) e.preventDefault();
      st.dx = dx;
      const i = SECTIONS.findIndex(x => x[0] === F.section), j = i + (dx < 0 ? 1 : -1);
      const edge = j < 0 || j >= SECTIONS.length;   // no section that way: resist more
      const g = grid();
      if (g && !MK.reduced()) { g.style.transform = `translate3d(${(dx * (edge ? 0.12 : 0.3)).toFixed(1)}px, 0, 0)`; g.style.opacity = String(Math.max(0.6, 1 - Math.abs(dx) / 900)); }
    }, { passive: false });
    panel.addEventListener('touchend', () => {
      if (!st) return; const s = st; st = null;
      const g = grid();
      if (s.dir !== 'x') { settle(g, false); return; }
      const dx = s.dx;
      const i = SECTIONS.findIndex(x => x[0] === F.section), j = i + (dx < 0 ? 1 : -1);
      if (performance.now() - s.t > 900 || Math.abs(dx) < 56 || i < 0 || j < 0 || j >= SECTIONS.length) { settle(g, true); return; }
      setSection(SECTIONS[j][0]);   // the old grid leaves from where the finger left it
    }, { passive: true });
    panel.addEventListener('touchcancel', () => { if (st) settle(grid(), true); st = null; }, { passive: true });
  }
  // Esc clears the drill-down (the section's own selection via S.onEsc, then the
  // merchant, then categories) when nothing else wanted it: a popover, a dialog,
  // the drawer or a field. A section that handles Esc in its own listener should
  // call e.preventDefault() (then this stays out).
  function wireKeys() {
    if (R.keyH) return;
    R.keyH = e => {
      if (e.key !== 'Escape' || !R.mounted || R.mode !== 'ready' || !R.root || !R.root.isConnected) return;
      const t = e.target;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '') || t.isContentEditable)) return;
      if (R.drawer || R.pop || document.querySelector('.pop:not([hidden]), .modal, .cmd, .drawer, #modal-overlay.open, #app.drawer-open')) return;
      setTimeout(() => { if (e.defaultPrevented || !R.mounted) return; clearDrill(); }, 0);
    };
    window.addEventListener('keydown', R.keyH, true);
  }
  function clearDrill() {
    // A section's own selection first (S.onEsc returns true when it cleared something).
    if (typeof S.onEsc === 'function') { try { if (S.onEsc()) return true; } catch (e) { /* fall through */ } }
    if (F.merchant) { setMerchant(''); return true; }
    if (F.cats.length) { setCats([]); return true; }
    return false;
  }
  function scroller() {
    if (R.scroller && R.scroller.isConnected) return R.scroller;
    let el = R.root && R.root.parentElement;
    while (el && el !== document.body) { const s = getComputedStyle(el); if (/(auto|scroll)/.test(s.overflowY)) break; el = el.parentElement; }
    R.scroller = el && el !== document.body ? el : null;
    if (R.scroller && !R.scroller._fvScroll) { R.scroller._fvScroll = true; R.scroller.addEventListener('scroll', () => { if (R.root && R.root.isConnected) R.lastScroll = R.scroller.scrollTop; }, { passive: true }); }
    return R.scroller;
  }
