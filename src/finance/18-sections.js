  // @part 18-sections.js · OWNER: C3 (section framework: S, BUILD/UPDATE, buildSection, updateAll)
  // ── Sections ──────────────────────────────────────────────────────────
  const S = {};          // current section's cards
  // Per-section shell options (C3): SEC_OPTS[id] = { kpis: false } hides the
  // KPI row ({ kpis: ['spent', 'avg'] } picks tiles, { kpis: true } shows all
  // nine; the defaults are KPI_SETS in 15-kpis.js), { filters: false } hides
  // the date and filter rows (for a section that does not follow the range:
  // Budgets is always this calendar month).
  const SEC_OPTS = {};
  // Entrances play once per section per session (FINANCE_MOTION.md §2): the
  // first visit rises in card by card and draws its charts; later visits,
  // saves, live sync and filter changes render settled (charts morph).
  // R.entering is true while a section's first build + update runs, so a
  // section can add its own one-off motion (budget rings fill, tickers count).
  R.entered = new Set(); R.entering = false; R.settleNext = false;
  function disposeChartObj(c) {
    if (!c) return;
    try { c.ro.disconnect(); } catch (e) { /* ignore */ }
    if (c.raf) cancelAnimationFrame(c.raf);
    fxUndefer(c);
    try { if (!c.inst.isDisposed()) c.inst.dispose(); } catch (e) { /* ignore */ }
  }
  // o.dir: +1 / -1 when switching sections by tab (the old section leaves as a
  // ghost, the new one slides in from the travel side); 0 or absent: a plain swap.
  function buildSection(id, o) {
    o = o || {};
    const E = R.els;
    const oldGrid = E.panel.querySelector(':scope > .fv-grid:not(.fv-ghost)');
    const swap = !!o.dir && !!oldGrid && !MK.reduced() && !document.hidden;
    if (swap) {
      // @p1: the ghost sits in the panel, so when the new section's KPI row (or a shorter
      // sticky bar) moved the panel, the leaving section jumped ~150 px for its 120 ms exit.
      // Pin it where it was: one read now (the old layout), one read in the next frame
      // (the layout that frame needs anyway), then a one-off top offset (not animated).
      const top0 = E.panel.getBoundingClientRect().top;
      requestAnimationFrame(() => {
        if (!oldGrid.isConnected) return;
        const dy = E.panel.getBoundingClientRect().top - top0;
        if (Math.abs(dy) > 0.5) oldGrid.style.top = (-dy).toFixed(1) + 'px';
      });
      // The old charts stay alive (and drawn) for the 120 ms exit; the new
      // section gets fresh instances under the same keys.
      const olds = [];
      for (const k of [...R.charts.keys()]) if (k.startsWith('s:')) { olds.push(R.charts.get(k)); R.charts.delete(k); }
      for (const x of [...E.panel.children]) if (x !== oldGrid && !x.classList.contains('fv-ghost')) x.remove();
      MK.ghostOut(oldGrid, o.dir, () => olds.forEach(disposeChartObj));
    } else {
      disposeAll('s:');
      E.panel.innerHTML = '';
    }
    for (const k in S) delete S[k];
    R.catModeShown = {};
    E.panel.setAttribute('aria-label', (SECTIONS.find(s => s[0] === id) || [])[1] || '');
    const first = !R.entered.has(id);
    R.entering = first && !MK.reduced();
    R.settleNext = !first;
    R.building = true;   // @p2 until this section's first update ends (C1.draw renders settled charts below the fold in idle time)
    const grid = h('div', { class: 'fv-grid' });
    E.panel.append(grid);
    BUILD[id](grid);
    [...grid.children].forEach((c, i) => c.style.setProperty('--i', i));
    R.sectionId = id;
    paintSecOpts(id);
    // First visit: cards rise in, 60 ms apart, as they come into view.
    if (R.entering) MK.inView(grid, { sel: ':scope > *', step: 60, max: 420, distance: 14 });
    if (swap) MK.slideIn(grid, o.dir);
  }
  function paintSecOpts(id) {
    const E = R.els, o = SEC_OPTS[id] || {};
    applyKpiSet(id);
    if (E.sticky) E.sticky.classList.toggle('no-filters', o.filters === false);
    if (R.root) R.root.setAttribute('data-section', id);
  }
  function updateSection(ctx) {
    const id = R.sectionId; if (!id) return;
    // A re-visit renders settled: no draw-in, no tickers from zero.
    const settle = R.settleNext; R.settleNext = false;
    const was = R.noAnim; if (settle) R.noAnim = true;
    try { UPDATE[id](ctx); } catch (e) { console.error('[finance] section update failed', e); }
    finally {
      R.noAnim = was; R.building = false;
      if (R.entering) { R.entered.add(id); R.entering = false; }
    }
  }
  function updateAll() {
    if (R.mode !== 'ready' || !R.model) return;
    const ctx = makeCtx(); R.ctx = ctx;
    // Clean filters that no longer apply (e.g. a category that disappeared).
    F.cats = F.cats.filter(c => R.model.categories.includes(c));
    F.accts = F.accts.filter(a => R.model.accts.includes(a));
    paintTop(); paintUpdate(); paintFilters(ctx); paintKpis(ctx);
    if (R.sectionId !== F.section) buildSection(F.section);
    updateSection(ctx);
    paintTabs(false);
    const meta = (R.data && R.data.meta) || {};
    R.els.foot.textContent = 'Everything here is built on this computer from your own data folder. Categories are fixed per merchant: change one in Transactions and the rule is saved for future imports.';
    if (R.drawer) refreshDrawer();
  }
  const BUILD = {}, UPDATE = {};

