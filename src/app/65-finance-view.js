/* ============================================================
   FINANCES SECTION (#view=finance). Owner: Finance.
   The view itself lives in src/finance/ (ordered parts that build.mjs joins
   into one IIFE, window.FinanceView; see MODULES.md): page-header
   actions (Import CSV, Sync bank), sticky filters, KPIs, My money (your own board) and nine more sections
   of linked ECharts charts. Data comes from /api/finance (analysis.json in
   the finance folder of the data dir) and is held in memory only; nothing
   financial is stored in dashboard state.
   The view loads in a later <script> block than this file, so the very
   first render can arrive before it exists: show a placeholder and retry.
   ============================================================ */
let _finWaitTries = 0, _finWaitTimer = null;

/**
 * The one line every money surface shows for finances another computer reads
 * (Finances' subtitle, Home's Money card, Connections > Money), from meta.remote
 * ({name, online, state, updatedAt}; state open | running | asleep | off | outdated | checking,
 * lib/finance-share.mjs, lib/sync/presence.mjs). While that computer is away it says so calmly,
 * never as an error (checking, right after this computer woke: nothing is claimed yet):
 *   "Finance from Home laptop · updated 5 min ago"
 *   "Finance from Home laptop · last update 2 h ago (it's off)"
 * -> {text, tip, away ('' | 'off' | 'asleep' | 'outdated')} or null.
 */
function financeRemoteLine(rm) {
  if (!rm || !rm.name) return null;
  const t = Date.parse(rm.updatedAt || '');
  const s = Number.isFinite(t) ? Math.max(0, Math.round((Date.now() - t) / 1000)) : null;
  const ago = s == null ? '' : s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`;
  const state = rm.state || (rm.online ? 'open' : 'off');
  const away = state === 'off' || state === 'asleep' || state === 'outdated' ? state : '';
  if (!away) return { text: `Finance from ${rm.name}` + (ago ? ` · updated ${ago}` : ''), tip: `${rm.name} reads your bank; this is the same as there`, away: '' };
  const why = { off: "it's off", asleep: "it's asleep", outdated: 'it needs a Freeflo update' }[away];
  const tip = away === 'outdated' ? `${rm.name} runs an older Freeflo. This is what it last sent; update Freeflo there to keep it coming.`
    : `${rm.name} is ${away === 'off' ? 'off' : 'asleep'} right now. This is what it last sent; it updates by itself when ${rm.name} is on again.`;
  return { text: `Finance from ${rm.name}` + (ago ? ` · last update ${ago}` : '') + ` (${why})`, tip, away };
}

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
  // Connections > Money lists the finance computer's accounts from the same copy (56-fin-connect.js).
  try { if (state.view === 'connections' && typeof FinConnectStore !== 'undefined') FinConnectStore.load({ force: true }); } catch (e) { /* not loaded yet */ }
}
function renderFinanceView(container) {
  try { if (typeof gameStreakTick === 'function') gameStreakTick('fin-visit'); } catch (e) { /* achievements (71-ach-src-b3-life.js): weeks Finances was opened */ }
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
    mountEmptyState(container, { icon: 'circle-alert', title: 'Money couldn’t open', text: 'Reload the page. If it keeps happening, close Freeflo and open it again.' });
    return;
  }
  mountEmptyState(container, { icon: 'loader-circle', title: 'Loading finances…', art: false });
  if (!_finWaitTimer) {
    _finWaitTimer = setTimeout(() => { _finWaitTimer = null; _finWaitTries++; if (state.view === 'finance') render(); }, 50);
  }
}

registerPage({ id: 'money', view: 'finance', match: v => v === 'finance', label: 'Money', icon: 'wallet', area: 'money', tab: true, order: 10, ownTabs: true,
  desc: 'Spending, budgets, transactions and your money story', keywords: 'money finances finance bank spending budgets transactions recurring cash flow merchants categories',
  sections: () => { const FV = window.FinanceView; let l = []; try { l = FV && typeof FV.sections === 'function' ? FV.sections() : []; } catch (e) { l = []; } return l.map(s => ({ label: s.label, run: () => { if (state.view !== 'finance') setView('finance'); try { FV.setSection(s.id); } catch (e) { console.error('[finance] setSection', e); } if (typeof renderSidebar === 'function') renderSidebar(); } })); },
  available: () => !(APP_CONFIG.features && APP_CONFIG.features.finance === false) });
// The page template: one primary action ("Update bank"), the rest under More (UX_BLUEPRINT.md 3).
if (typeof registerHeaderActions === 'function') registerHeaderActions(v => v === 'finance', () => {
  const FV = window.FinanceView;
  if (!FV || typeof FV.update !== 'function') return null;
  return {
    primary: { label: 'Update bank', icon: 'refresh-cw', tip: 'Reads new transactions from your bank', run: () => FV.update({}) },
    more: [
      { label: 'Import a CSV…', icon: 'upload', run: () => FV.importCsv() },
      { label: 'Read my whole bank history again', icon: 'history', run: () => FV.update({ full: true }) },
      { label: 'Import from the Finances folder', icon: 'rotate-ccw', run: () => FV.update({ bank: false }) },
      { label: 'Export all transactions', icon: 'download', run: () => FV.exportAll() },
    ],
  };
});
registerSection('finance', {
  group: 'finance',
  match: v => v === 'finance',
  title: () => 'Money',   // 'Finances' until 2.18 (NAVIGATION_PLAN.md 2.1)
  crumb: () => [],   // the tab you are on is lit in the page header (2.19), so the crumb does not repeat it
  layout: 'page',
  // render() keeps the mounted root attached (80-main-render.js): re-attaching it replayed the KPI entrance (C6).
  keepRoot: (main) => !(typeof fdWhoseFriend === 'function' && fdWhoseFriend('money')) && !!(window.FinanceView && main.childElementCount === 1 && main.firstElementChild.classList.contains('fv')),
  mount(container) { if (typeof fdWhoseFriend === 'function' && fdWhoseFriend('money')) { fdMoneyPage(container); return; } renderFinanceView(container); },   // a friend's shared money, read-only (96-friends-3data.js)
  unmount() { try { if (window.FinanceView && FinanceView.unmount) FinanceView.unmount(); } catch (e) { console.error('[finance] unmount', e); } },
});
