/* ============================================================
   SHELL WIRING: top bar, page-header controls, menus, keyboard.
   (Runs at load, after every module above has been declared.)
   ============================================================ */
const searchInput = document.getElementById('search-input');
let searchDebounce;
searchInput.addEventListener('input', () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => { searchQuery = searchInput.value.trim(); renderMain(); }, 150);
});
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && searchInput.value) { e.stopPropagation(); searchInput.value = ''; searchQuery = ''; renderMain(); }
});

// Keyboard users: the first Tab offers a jump past the sidebar to the page itself.
{
  const skip = document.getElementById('skip-link');
  if (skip) skip.onclick = () => {
    const m = document.getElementById('main');
    if (!m) return;
    // Focus the page itself: the next Tab is its first control, arrow keys scroll it.
    m.tabIndex = -1; m.focus();
  };
}

document.querySelectorAll('.view-mode-toggle .mode').forEach(b => {
  // "Calendar" is the Calendar section (week view, tasks in the due lane), not a list layout.
  b.onclick = () => { if (b.dataset.goto) { setView(b.dataset.goto); return; } state.viewMode = b.dataset.mode; saveUI(); render(); };
});

// "Display" popover: sort, group, density, expand - one place instead of three buttons.
const _SORTS = [['date', 'Date'], ['priority', 'Priority'], ['title', 'Title'], ['manual', 'Manual']];
const _GROUPS = [['auto', 'Auto'], ['date', 'Date'], ['priority', 'Priority'], ['stream', 'Stream'], ['none', 'None']];
function openDisplayPopover(anchor) {
  openPopover(anchor, (el) => {
    el.classList.add('pad');
    const paint = () => {
      el.innerHTML = '';
      const row = (label, opts, cur, set) => {
        const f = document.createElement('div'); f.className = 'field'; f.style.marginBottom = '12px';
        const l = document.createElement('span'); l.className = 'field-label'; l.textContent = label; f.appendChild(l);
        const seg = document.createElement('div'); seg.className = 'seg seg-block';
        for (const [k, t] of opts) {
          const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
          b.setAttribute('aria-pressed', cur === k ? 'true' : 'false');
          b.onclick = () => { set(k); saveUI(); render(); paint(); };
          seg.appendChild(b);
        }
        f.appendChild(seg); el.appendChild(f);
      };
      row('Sort by', _SORTS, state.sortBy, v => { state.sortBy = v; });
      row('Group by', _GROUPS, state.groupBy, v => { state.groupBy = v; });
      row('Rows', [['normal', 'Comfortable'], ['compact', 'Compact']], state.density === 'compact' ? 'compact' : 'normal', v => { state.density = v; });
      const exp = document.createElement('button'); exp.type = 'button'; exp.id = 'expand-all-btn';
      exp.className = 'btn btn-secondary btn-block';
      exp.innerHTML = icon(_expandedTaskIds.size ? 'minimize-2' : 'maximize-2') + `<span>${_expandedTaskIds.size ? 'Collapse all tasks' : 'Expand all tasks'}</span>`;
      exp.onclick = () => { toggleExpandAll(); paint(); };
      el.appendChild(exp);
    };
    paint();
  }, { width: 300, align: 'end' });
}
document.getElementById('display-btn').onclick = (e) => openTaskDisplayPopover(e.currentTarget);   // per-view sort/group: 32-tasks-ui.js
document.getElementById('new-task-btn').onclick = (e) => openNewTask('', { from: e.currentTarget });   // centre card in create mode
document.getElementById('more-btn').onclick = (e) => openMenu(e.currentTarget, shellMenuItems('more'), { align: 'end', width: 260 });
document.getElementById('ws-btn').onclick = (e) => openMenu(e.currentTarget, shellMenuItems('workspace'), { align: 'start', width: 240 });
document.getElementById('palette-btn').onclick = () => openCommandPalette();
document.getElementById('sidebar-toggle').onclick = () => _shellToggleSidebar();
document.getElementById('drawer-btn').onclick = () => {
  if (window.matchMedia('(max-width: 900px)').matches) document.getElementById('app').classList.toggle('drawer-open');
  else { state.sidebarCollapsed = false; state.focus = false; saveUI(); render(); }
};
document.getElementById('sb-scrim').onclick = () => _shellCloseDrawer();
document.getElementById('debug-close').onclick = () => document.getElementById('debug-banner').classList.remove('show');
document.getElementById('folder-btn').onclick = () => { if (_serverAvailable && (state._localDirty || _persistTimer)) flushPersistNow(); renderSaveStatus(); };

document.addEventListener('click', (e) => {
  // Close date picker if click is outside it
  const dp = document.getElementById('date-picker');
  if (dp && dp.classList.contains('open') && !dp.contains(e.target) && !e.target.closest('.day-cell')) {
    dp.classList.remove('open');
  }
});

document.getElementById('theme-toggle').onclick = () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  saveUI(); render();
};
document.getElementById('import-file').onchange = e => {
  const f = e.target.files && e.target.files[0];
  if (f) importBackup(f);
  e.target.value = '';
};

/* ============================================================
   OTHER UTILS
   ============================================================ */
function printDashboard() { window.print(); }

/** Download the open tasks (by stream) as a Markdown checklist. */
function exportMarkdown() {
  const open = getAllItems().filter(i => statusOf(i.id) !== 'done');
  const byStream = new Map();
  for (const i of open) { const s = effStream(i); if (!byStream.has(s)) byStream.set(s, []); byStream.get(s).push(i); }
  const lines = [`# ${appTitle()}`, '', `Exported ${Clock.fmtDate(Clock.now(), { dateStyle: 'medium', timeStyle: 'short' })} · ${open.length} open task${open.length === 1 ? '' : 's'}`, ''];
  const streams = [...byStream.keys()].sort((a, b) => (STREAMS[a]?.order ?? 999) - (STREAMS[b]?.order ?? 999));
  for (const s of streams) {
    lines.push(`## ${STREAMS[s]?.label || s}`, '');
    for (const i of sortItems(byStream.get(s), 'date')) {
      const due = effDate(i), p = effPriority(i), tags = effTags(i);
      const st = statusOf(i.id) === 'doing' ? ' (in progress)' : '';
      lines.push(`- [ ] ${effTitle(i).replace(/\n/g, ' ')}${st}${due ? ` · due ${due}` : ''}${p !== 'p0' ? ` · ${p.toUpperCase()}` : ''}${tags.length ? ' · ' + tags.map(t => '#' + t).join(' ') : ''}`);
      for (const sub of getSubtasks(i.id)) lines.push(`  - [${sub.done ? 'x' : ' '}] ${String(sub.title || sub.text || '').replace(/\n/g, ' ')}`);
    }
    lines.push('');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `tasks-${todayStr()}.md`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Exported ${open.length} open task${open.length === 1 ? '' : 's'}`, { kind: 'ok', icon: 'file-down' });
}

function applyAutoTheme() {
  if (!state.autoTheme) return;
  const h = Clock.parts(Clock.now()).h;   // the evening where the user is (travel spec 2.7 P12)
  const newTheme = (h >= 19 || h < 7) ? 'dark' : 'light';
  if (state.theme !== newTheme) { state.theme = newTheme; document.documentElement.setAttribute('data-theme', state.theme); renderShell(); }
}
setInterval(applyAutoTheme, 5 * 60 * 1000);
async function runMorningBriefing() {
  if (!HAS_COWORK || typeof window.cowork.runScheduledTask !== 'function') {
    showDebug('Briefing unavailable', 'window.cowork.runScheduledTask is not available.');
    return;
  }
  toast('Starting the morning briefing…', { icon: 'sunrise' });
  try {
    await window.cowork.runScheduledTask('task-management');
    toast('Briefing sent. Check your chat.', { kind: 'ok' });
  } catch (e) {
    showDebug('Briefing failed', (e && e.message) || String(e));
  }
}

// Expand/Collapse-all toggle. If anything is currently expanded, click collapses
// everything. Otherwise expands every task currently rendered in the main view.
function toggleExpandAll() {
  if (_expandedTaskIds.size > 0) { _expandedTaskIds.clear(); }
  else { for (const id of _lastRenderedTaskIds) _expandedTaskIds.add(id); }
  render();
}


// Rubber-band drag-select on the main task list. mousedown starts on empty
// space inside #main-body; mousemove past a small threshold draws a rectangle;
// mouseup adds every intersecting .task[data-id] to multiSelect. Ctrl/Cmd+drag
// is additive, plain drag replaces the current selection.
function setupRubberBand() {
  const main = document.getElementById('main-body');
  if (!main || main._rubberBandReady) return;
  main._rubberBandReady = true;
  let startX, startY, rb, started, additive;
  main.addEventListener('mousedown', (e) => {
    if (state.viewMode !== 'list' || !isTaskView(state.view)) return;
    if (e.button !== 0) return;
    if (e.target.closest('.task, button, input, select, textarea, .multi-handle, a, .quick-add, .templates-row, .progress-row, .week-bar, .calendar-events, .cal-events, .empty-state, .qa-wrap, .today-sum, .week-strip, .tg-h, .cal-sched, .search-note, .subtasks-inline')) return;
    startX = e.clientX; startY = e.clientY;
    started = false; rb = null;
    additive = e.ctrlKey || e.metaKey;
    function onMove(ev) {
      if (!started) {
        if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 4) return;
        rb = document.createElement('div');
        rb.className = 'rubber-band';
        document.body.appendChild(rb);
        started = true;
      }
      const x = Math.min(startX, ev.clientX);
      const y = Math.min(startY, ev.clientY);
      rb.style.left = x + 'px'; rb.style.top = y + 'px';
      rb.style.width = Math.abs(ev.clientX - startX) + 'px';
      rb.style.height = Math.abs(ev.clientY - startY) + 'px';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!started) return;
      const rbRect = rb.getBoundingClientRect();
      rb.remove();
      if (!additive) multiSelect.ids.clear();
      const rows = main.querySelectorAll('.task[data-id]');
      for (const row of rows) {
        const r = row.getBoundingClientRect();
        if (r.right < rbRect.left || r.left > rbRect.right || r.bottom < rbRect.top || r.top > rbRect.bottom) continue;
        const id = row.dataset.id;
        if (id) multiSelect.ids.add(id);
      }
      document.body.classList.toggle('has-selection', multiSelect.ids.size > 0);
      render();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault(); // suppress native text-selection drag
  });
}

// "G then a key" jumps (like Linear/GitHub): g h Home, g t Tasks, g c Calendar,
// g f Finances, g p People, g s Settings, g u Upcoming, g a All tasks.
let _gPending = 0;
const _G_KEYS = { h: 'home', t: 'today', u: 'week', a: 'all', c: 'calendar', f: 'finance', p: 'people', s: 'settings', b: 'bin', l: 'completed' };

document.addEventListener('keydown', e => {
  const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
  const overlayOpen = !!document.querySelector('.cmd, .modal, .drawer');
  if (e.key === 'Escape') {
    closeCtxMenu();
    // :not([hidden]) - the quick-add suggestion list is a .pop that stays in the DOM while hidden.
    if (document.querySelector('.pop:not([hidden])')) { closePopovers(); return; }
    if (document.getElementById('modal-overlay').classList.contains('open')) { closeModal(); return; }
    if (document.getElementById('kb-overlay').classList.contains('open')) { document.getElementById('kb-overlay').classList.remove('open'); return; }
    if (document.getElementById('app').classList.contains('drawer-open')) { _shellCloseDrawer(); return; }
    if (multiSelect.ids.size > 0) { multiSelect.ids.clear(); document.body.classList.remove('has-selection'); render(); return; }
    if (_expandedTaskIds.size > 0) { _expandedTaskIds.clear(); render(); return; }
    // The side panel closes on Esc only when no field is focused: the first Esc leaves a field in it.
    if (inField && e.target.closest && e.target.closest('#detail-pane')) { e.target.blur(); return; }
    if (!inField && (typeof detailPaneOpen === 'function' ? detailPaneOpen() : state.selectedTaskId)) { closeDetail(); return; }
  }
  // Ctrl/Cmd+K: command palette (works from anywhere, including fields)
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); openCommandPalette(); return; }
  if (overlayOpen) return;
  // Ctrl/Cmd+A: select all currently-rendered tasks (skipped when typing in a field)
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'a' && !inField && _lastRenderedTaskIds.length) {
    e.preventDefault();
    for (const id of _lastRenderedTaskIds) multiSelect.ids.add(id);
    document.body.classList.toggle('has-selection', multiSelect.ids.size > 0);
    render();
  }
  // Arrow Up/Down: move keyboard cursor between tasks. Shift+Arrow extends multi-select.
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !inField && !e.metaKey && !e.ctrlKey && _lastRenderedTaskIds.length && !document.querySelector('.pop:not([hidden])')) {
    e.preventDefault();
    const cur = _lastSelectedTaskId ? _lastRenderedTaskIds.indexOf(_lastSelectedTaskId) : -1;
    let next;
    if (cur < 0) next = e.key === 'ArrowDown' ? 0 : _lastRenderedTaskIds.length - 1;
    else next = e.key === 'ArrowDown' ? Math.min(cur + 1, _lastRenderedTaskIds.length - 1) : Math.max(cur - 1, 0);
    if (e.shiftKey && _lastSelectedTaskId) {
      // Extend selection to the new cursor position
      multiSelect.ids.add(_lastSelectedTaskId);
      multiSelect.ids.add(_lastRenderedTaskIds[next]);
      document.body.classList.toggle('has-selection', multiSelect.ids.size > 0);
    }
    _lastSelectedTaskId = _lastRenderedTaskIds[next];
    // Update kb-cursor class without a full re-render
    document.querySelectorAll('.task.kb-cursor').forEach(n => n.classList.remove('kb-cursor'));
    const newEl = document.querySelector(`.task[data-id="${CSS.escape(_lastSelectedTaskId)}"]`);
    if (newEl) {
      newEl.classList.add('kb-cursor');
      newEl.scrollIntoView({ block: 'nearest', behavior: (window.Motion && Motion.prefersReduced()) ? 'auto' : 'smooth' });
    }
    if (e.shiftKey) render(); // selection changed — re-render so checkboxes update
  }
  // Enter on a kb-cursor task: open the detail pane
  if (e.key === 'Enter' && !inField && _lastSelectedTaskId && _lastRenderedTaskIds.includes(_lastSelectedTaskId) && !document.activeElement.closest('button, a')) {
    e.preventDefault();
    if (typeof openTask === 'function') openTask(_lastSelectedTaskId); else selectTask(_lastSelectedTaskId);   // centre card or side panel
  }
  // Ctrl/Cmd+Z: undo. Ctrl/Cmd+Shift+Z or Ctrl+Y: redo.
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !inField) { e.preventDefault(); undo(); }
  if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && e.key.toLowerCase() === 'z') || (!e.shiftKey && e.key.toLowerCase() === 'y')) && !inField) { e.preventDefault(); redo(); }
  if ((e.metaKey || e.ctrlKey) && e.key === '/') { e.preventDefault(); openNewTask(); }
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); state.theme = state.theme === 'dark' ? 'light' : 'dark'; saveUI(); render(); }
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); state.focus = !state.focus; saveUI(); render(); }
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); exportMarkdown(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p' && !inField) { e.preventDefault(); printDashboard(); }
  if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); _shellToggleSidebar(); }
  if (inField || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '?') { e.preventDefault(); showKbHelp(); return; }
  if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); openNewTask('', { quick: true }); return; }   // the inline box when there is one
  if (e.key === '/') { e.preventDefault(); if (isTaskView(state.view)) { searchInput.focus(); searchInput.select(); } else openCommandPalette(); return; }
  if (e.key === 'g') { _gPending = Date.now(); return; }
  if (_gPending && Date.now() - _gPending < 1200) {
    _gPending = 0;
    const v = _G_KEYS[e.key.toLowerCase()];
    if (v) { e.preventDefault(); setView(v); }
  }
});
