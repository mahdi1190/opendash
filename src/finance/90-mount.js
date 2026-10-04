  // @part 90-mount.js · OWNER: C3 (theme change, teardown, mount/unmount, window.FinanceView)
  // ── Mount / unmount ───────────────────────────────────────────────────
  function onThemeChange() {
    R.tokens = null;
    if (R.mode !== 'ready' || !R.ctx) return;
    // Rebuild every chart in the new palette, without the enter animation.
    R.noAnim = true;
    try { for (const c of R.charts.values()) c.fresh = true; paintKpis(R.ctx); updateSection(R.ctx); paintFilters(R.ctx); if (R.drawer) refreshDrawer(); }
    finally { R.noAnim = false; }
  }
  function teardown() {
    disposeAll(); closePop(); closeDrawer();
    if (R.layer && R.layer.isConnected) R.layer.remove();
    R.drawerEl = null; R.scrim = null;
    if (R.layer) R.layer.innerHTML = '';
    if (R.themeMo) { R.themeMo.disconnect(); R.themeMo = null; }
    if (R.io) { R.io.disconnect(); R.io = null; }
    if (R.head && R.head.el.isConnected) R.head.el.remove();
    R.mounted = false; R.sectionId = null;
    for (const k in S) delete S[k];
    // @new-begin motion kit observers
    MK.reset();
    // @new-end
    // @c3 shell listeners: Esc, the tab strip's resize watch, the budgets month view
    if (R.keyH) { window.removeEventListener('keydown', R.keyH, true); R.keyH = null; }
    if (R.tabRo) { R.tabRo.disconnect(); R.tabRo = null; }
    R.budgetMonth = null;
    R.entered.clear();   // opening Finances again is a real entry: its first section rises in once more
  }
  function watchDetach(container) {
    if (R.mo) R.mo.disconnect();
    R.mo = new MutationObserver(() => {
      if (R.root && !R.root.isConnected) {
        // renderMain empties #main-body and re-mounts synchronously; only
        // tear down if we are still detached a moment later.
        setTimeout(() => { if (R.root && !R.root.isConnected && R.mounted) { teardown(); if (R.mo) { R.mo.disconnect(); R.mo = null; } } }, 0);
      }
    });
    R.mo.observe(container, { childList: true });
  }
  function mount(container) {
    if (!container) return;
    const wasMounted = R.mounted && R.root;
    const keepScroll = wasMounted ? R.lastScroll : null;
    if (!R.root) buildRoot();
    if (R.root.parentElement !== container) container.append(R.root);
    ensureLayer();
    R.container = container;
    watchDetach(container);
    if (!R.themeMo) {
      R.themeMo = new MutationObserver(() => {
        R.reduced = reducedMotion();
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (!R.tokens || R.tokens.dark !== dark) onThemeChange();
      });
      R.themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'data-motion'] });
    }
    R.reduced = reducedMotion();
    wireDrop(R.root);
    if (wasMounted) {
      // A global render() re-attached us: nothing to rebuild, but the page
      // header (subtitle, actions) was repainted by the shell.
      paintHead();
      const sc = scroller(); if (sc && keepScroll != null && Math.abs(sc.scrollTop - keepScroll) > 1) sc.scrollTop = keepScroll;
      return;
    }
    R.mounted = true;
    if (R.firstMount) {
      R.firstMount = false;
      try { const q = new URLSearchParams(location.search).get('ftab'); if (q && SECTIONS.some(s => s[0] === q)) F.section = q; } catch (e) { /* ignore */ }
    }
    R.mode = null; R.tokens = null;
    paint();
    if (!R.data && !R.loading) load();
    else if (!R.loading && Date.now() - R.loadedAt > 5 * 60e3) load(true);
    requestAnimationFrame(() => { scroller(); paintTabs(false); });
  }
  function unmount() { if (R.root && R.root.isConnected) R.root.remove(); teardown(); }

  window.FinanceView = {
    mount, unmount, refresh: () => load(true),
    // For the app shell's sidebar and breadcrumb (14-shell.js / 15-nav-sidebar.js).
    sections: () => SECTIONS.map(([id, label]) => ({ id, label })),
    section: () => F.section,
    sectionLabel: () => (SECTIONS.find(s => s[0] === F.section) || [])[1] || '',
    setSection: (id) => setSection(id),
  };
  // @c3 The shell's pure helpers, for tests/finance-shell.test.mjs and the console (not an API for other modules).
  window.FinanceView._shell = {
    monoPath, sparkSvg, ringSvg, budgetLook, budgetScheduled, budgetMonthView, budgetCurve, budgetCalc, syncDiff, txKeyOf, kpiSetFor,
    setModel: a => { R.model = buildModel(a); return R.model; },   // load an analysis without the DOM (tests)
    state: () => ({ entered: [...R.entered], section: R.sectionId, charts: R.charts.size, mode: R.mode }),
  };
