/* ============================================================
   MAIN RENDER
   ============================================================ */
let _lastRendered = null;      // {section, view, mode} of the previous render
let _lastRenderKind = null;    // 'page' | 'sub' | null for the render in progress (render() hands it to Motion.afterMain)
/** The section a view belongs to, for motion (task views share 'tasks', person: is 'people'). */
function navSectionOf(v) {
  return motionSectionOf(v, (x) => { const s = sectionFor(x); return s ? s.name : null; });
}
function renderMain() {
  const main = document.getElementById('main-body');
  // Entrances play once per ENTRY (CLAUDE.md): a page entry is another section; a sub entry
  // is another sub-view or mode in the same section (only its pane animates, the section's
  // nav, tabs and toolbars stay put); anything else is a re-render and animates nothing new.
  const next = { section: navSectionOf(state.view), view: state.view, mode: state.viewMode };
  const kind = motionRenderKind(_lastRendered, next);
  _lastRendered = next;
  _lastRenderKind = kind;
  if (window.Motion && Motion.beforeMain) Motion.beforeMain(main, kind);
  // A section that owns a persistent root (Finances) keeps it attached across re-renders:
  // re-attaching a detached subtree restarts every CSS entrance inside it.
  const sec = sectionFor(state.view);
  const keep = !kind && sec && typeof sec.keepRoot === 'function' && _mountedSection && _mountedSection.name === sec.name && sec.keepRoot(main);
  if (!keep) main.innerHTML = '';
  if (kind) {
    main.classList.add('view-changed');
    setTimeout(() => main.classList.remove('view-changed'), 350);
  } else {
    main.classList.remove('view-changed');
  }
  _syncViewHash();
  _renderMainBody(main);
  // The Finances view runs its own entrance (cards and KPI tiles rise in), so
  // the generic stagger would animate its wrapper a second time.
  if (kind === 'page' && window.Motion && state.view !== 'finance') Motion.stagger(main);
}
// Views that list tasks (and so use List/Board/Calendar/Review, Sort, Group).
function isTaskView(v) {
  return ['today', 'tomorrow', 'week', 'all', 'no-date', 'completed', 'now', 'inbox'].includes(v) || /^(stream|tag|day|list):/.test(v);   // now, inbox, list:<id>: 15-nav-smart-lists.js
}
let _mountedSection = null;
function _renderMainBody(main) {
  const titleEl = document.getElementById('view-title');
  const subEl = document.getElementById('view-subtitle');
  const sec = sectionFor(state.view);
  // Leaving a registered section: let it clean up (charts, timers, listeners).
  if (_mountedSection && (!sec || sec.name !== _mountedSection.name)) {
    try { if (typeof _mountedSection.unmount === 'function') _mountedSection.unmount(); } catch (e) { console.error('[section] unmount failed', e); }
    _mountedSection = null;
  }
  titleEl.firstChild.nodeValue = sec ? String(sec.title(state.view) || '') : viewTitle(state.view);
  if (typeof czDecorateTitle === 'function') czDecorateTitle(titleEl, sec ? '' : state.view);   // stream / tag marker + right-click (28-customise.js)
  // Keyboard shortcuts act on these ids; non-task views must not leave stale ones.
  _lastRenderedTaskIds = [];

  // Update view-mode buttons
  document.querySelectorAll('.view-mode-toggle .mode').forEach(b => b.classList.toggle('active', b.dataset.mode === state.viewMode));
  // Expand/collapse-all label reflects current state.
  const eab = document.getElementById('expand-all-btn');
  if (eab) eab.textContent = _expandedTaskIds.size > 0 ? 'Collapse all' : 'Expand all';

  // Task list/board/sort controls only mean something on task views.
  const viewControls = document.querySelector('.view-controls');
  if (viewControls) viewControls.style.display = (sec ? sec.taskControls : isTaskView(state.view)) ? '' : 'none';

  // Registered sections (registerSection in 00-core-config.js) come first.
  if (sec) {
    subEl.textContent = '';
    _mountedSection = sec;
    try { sec.mount(main, state.view); }
    catch (e) {
      console.error(`[section ${sec.name}] mount failed`, e);
      // One calm empty state with the next step (UI_CLEANUP_PLAN.md 3.6): what went wrong, and a way out.
      main.innerHTML = '';
      mountEmptyState(main, { icon: 'triangle-alert', title: 'This page couldn’t open', text: 'Reload to try again. Nothing you saved is lost.',
        actions: [{ label: 'Reload', icon: 'refresh-cw', primary: true, run: () => location.reload() }, { label: 'Go to Home', icon: 'house', run: () => { navVia('chrome'); setView('home'); } }] });
    }
    return;
  }

  // Special views
  if (state.view === 'finance') { subEl.textContent = ''; renderFinanceView(main); return; }
  if (state.view === 'bin')  { subEl.textContent = ''; renderBin(main); return; }
  if (state.view === 'wins') { subEl.textContent = ''; renderWinsLog(main); return; }
  if (state.view.startsWith('person:')) { subEl.textContent = ''; renderPersonView(state.view.slice(7), main); return; }
  if (state.view === 'triage') { subEl.textContent = ''; renderEmailTriage(main); return; }

  // Task views (list / board / review, search across all tasks): 31-task-views.js
  renderTaskView(main, subEl);
  if (typeof _restoreFocus === 'function') _restoreFocus();
}

function render() {
  try { return _render(); }
  catch (e) {
    console.error('Render crashed:', e);
    showDebug('Freeflo render error', `${e.name || 'Error'}: ${e.message || e}\n\n${e.stack || ''}`);
    // Still try to show the topbar at least
    try { renderTopbar(); } catch (_) {}
  }
}
function _render() {
  renderTopbar();
  renderSidebar();
  renderMain();
  renderDetail();
  const c = document.getElementById('content');
  c.classList.toggle('detail-open', typeof detailPaneOpen === 'function' ? detailPaneOpen() : !!state.selectedTaskId);   // a task or an event (60-task-detail.js)
  c.classList.toggle('focus', !!state.focus);
  c.classList.toggle('sidebar-narrow', !!state.sidebarCollapsed);
  if (typeof splitSync === 'function') splitSync();   // remembered pane sizes + resize handles (13-splitter.js)
  document.body.classList.toggle('has-selection', multiSelect.ids.size > 0);
  if (window.Motion) Motion.afterRender();   // new-task highlight, expand-in
  if (window.Motion && Motion.afterMain) Motion.afterMain(document.getElementById('main-body'), _lastRenderKind);   // sub-view pane swap, list FLIP
  _lastRenderKind = null;

  // Multi-select action bar (one undo step per action): 32-tasks-ui.js
  renderBulkBar();
  if (typeof uiSharedAfterRender === 'function') uiSharedAfterRender();   // what a newer copy brought: intensity, focus block, opening copies (06-core-seen.js)
  if (typeof togetherAfterRender === 'function') togetherAfterRender();   // shared spaces: load, game ticks (99-together-0core.js)
}

