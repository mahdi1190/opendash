/* ============================================================
   MAIN RENDER
   ============================================================ */
let _lastRenderedView = null;
function renderMain() {
  const main = document.getElementById('main-body');
  main.innerHTML = '';
  // Add view-changed class only when view (or list/board/calendar mode) actually
  // switches, not on every render. Only then do rows get the stagger-in.
  const viewKey = state.view + '|' + state.viewMode;
  const viewChanged = _lastRenderedView !== viewKey;
  if (viewChanged) {
    main.classList.add('view-changed');
    _lastRenderedView = viewKey;
    setTimeout(() => main.classList.remove('view-changed'), 350);
  } else {
    main.classList.remove('view-changed');
  }
  _syncViewHash();
  _renderMainBody(main);
  // The Finances view runs its own entrance (cards and KPI tiles rise in), so
  // the generic stagger would animate its wrapper a second time.
  if (viewChanged && window.Motion && state.view !== 'finance') Motion.stagger(main);
}
// Views that list tasks (and so use List/Board/Calendar/Review, Sort, Group).
function isTaskView(v) {
  return ['today', 'tomorrow', 'week', 'all', 'no-date', 'completed'].includes(v) || /^(stream|tag|day):/.test(v);
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
      main.innerHTML = '<div class="empty-state"><div class="msg">This view hit an error. Reload the page; if it keeps happening, check the console.</div></div>';
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
    showDebug('OpenDash render error', `${e.name || 'Error'}: ${e.message || e}\n\n${e.stack || ''}`);
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

  // Multi-select action bar (one undo step per action): 32-tasks-ui.js
  renderBulkBar();
}

