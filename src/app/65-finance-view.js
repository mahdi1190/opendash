/* ============================================================
   FINANCES SECTION (#view=finance). Owner: Finance.
   The view itself lives in src/finance/ (ordered parts that build.mjs joins
   into one IIFE, window.FinanceView; see MODULES.md): page-header
   actions (Import CSV, Sync bank), sticky filters, KPIs and eight sections
   of linked ECharts charts. Data comes from /api/finance (analysis.json in
   the finance folder of the data dir) and is held in memory only; nothing
   financial is stored in dashboard state.
   The view loads in a later <script> block than this file, so the very
   first render can arrive before it exists: show a placeholder and retry.
   ============================================================ */
let _finWaitTries = 0, _finWaitTimer = null;

/**
 * Finances on every device (lib/finance-share.mjs): the computer that reads the
 * bank published new finances, or an edit from another device arrived
 * (finance-share/*, the live event 'synced-files', 56-remote-jobs.js): reload
 * what shows them (the Finances view, Home's Money and Safe to spend).
 */
function financeSharedChanged() {
  try { if (window.FinanceView && typeof FinanceView.sharedChanged === 'function') FinanceView.sharedChanged(); } catch (e) { /* not loaded yet */ }
  try { if (typeof _hbFin !== 'undefined' && _hbFin) { _hbFin.at = 0; if (state.view === 'home' && typeof _hbFinLoad === 'function') _hbFinLoad(0); } } catch (e) { /* no Money card */ }
  try { if (state.view === 'home' && typeof homeDataRefresh === 'function' && typeof _HSP_DATA !== 'undefined') homeDataRefresh(_HSP_DATA); } catch (e) { /* no Safe to spend card */ }
}
function renderFinanceView(container) {
  const FV = window.FinanceView;
  if (FV && typeof FV.mount === 'function') {
    _finWaitTries = 0;
    try { FV.mount(container); }
    catch (e) {
      console.error('[finance] mount failed', e);
      mountEmptyState(container, { icon: 'circle-alert', title: 'The Finances view hit an error', text: 'Reload the page. If it keeps happening, the browser console has the details.' });
    }
    return;
  }
  if (_finWaitTries > 40) {
    mountEmptyState(container, { icon: 'circle-alert', title: 'The Finances module did not load', text: 'Rebuild the page (node build.mjs) and reload.' });
    return;
  }
  container.insertAdjacentHTML('beforeend', '<div class="empty-state"><div class="es-icon"><span class="spinner" aria-hidden="true"></span></div><div class="es-text">Loading finances…</div></div>');
  if (!_finWaitTimer) {
    _finWaitTimer = setTimeout(() => { _finWaitTimer = null; _finWaitTries++; if (state.view === 'finance') render(); }, 50);
  }
}

registerSection('finance', {
  group: 'finance',
  match: v => v === 'finance',
  title: () => 'Finances',
  crumb: () => {
    let sub = '';
    try { sub = (window.FinanceView && FinanceView.sectionLabel()) || ''; } catch (e) { /* not loaded yet */ }
    return sub ? [sub] : [];
  },
  layout: 'wide',
  // render() keeps the mounted root attached (80-main-render.js): re-attaching it replayed the KPI entrance (C6).
  keepRoot: (main) => !!(window.FinanceView && main.childElementCount === 1 && main.firstElementChild.classList.contains('fv')),
  mount(container) { renderFinanceView(container); },
  unmount() { try { if (window.FinanceView && FinanceView.unmount) FinanceView.unmount(); } catch (e) { console.error('[finance] unmount', e); } },
});
