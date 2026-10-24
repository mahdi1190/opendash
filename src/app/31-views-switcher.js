/* ============================================================
   TASK VIEW SWITCHER (owner: Tasks views, 2.16). One switcher on every task
   list (src/body.html .view-mode-toggle): List, Board (31-task-views.js,
   board code is not here), Timeline (31-views-timeline.js), Matrix
   (31-views-matrix.js) and Review (33-tasks-logs.js). The old "Calendar"
   mode (it only jumped to the Calendar tab) is gone: a saved 'calendar'
   opens the timeline instead.
     VIEW_MODES                       [{k, label, icon, tip}] in switcher order
     viewsSetMode(k)                  switch (re-selecting only scrolls back to the top)
     viewsRenderMode(main, o)         renderTaskView's hook: draws Timeline / Matrix, true when it did
     V / Shift+V                      next / previous layout (List, Board, Timeline, Matrix)
   List fields (which bits a list row shows), saved in the synced
   taskViewPrefs._rows = {hide: ['tags', ...]} (every list, one choice):
     VIEW_ROW_FIELDS                  [[key, label]]
     viewsRowHidden()                 Set of hidden field keys
     viewsSetRowHidden(key, hidden)   one field on / off
     viewsApplyListFields(el)         stamps data-vf-hide on a list (CSS hides the parts)
     viewsListFieldsField(el, paint)  the "Show on rows" field in the Display popover
   ============================================================ */
const VIEW_MODES = [
  { k: 'list', label: 'List', icon: 'layout-list' },
  { k: 'kanban', label: 'Board', icon: 'square-kanban' },
  { k: 'timeline', label: 'Timeline', icon: 'calendar-range', tip: 'Week timeline: drag tasks onto days and free time' },
  { k: 'matrix', label: 'Matrix', icon: 'layout-grid', tip: 'Priority matrix: urgent and important' },
  { k: 'review', label: 'Review', icon: 'list-checks' },
];
const _VW_CYCLE = ['list', 'kanban', 'timeline', 'matrix'];
let _vwEntry = '';

function viewsSetMode(k) {
  if (!VIEW_MODES.some(m => m.k === k)) return;
  if ((state.viewMode || 'list') === k) {
    if (window.Motion && Motion.scrollTopIfScrolled) Motion.scrollTopIfScrolled(document.getElementById('main'));
    return;
  }
  state.viewMode = k; saveUI(); render();
}
function _vwReduced() { return !!(window.Motion && typeof Motion.prefersReduced === 'function' && Motion.prefersReduced()); }

/** Timeline and Matrix for renderTaskView (31-task-views.js). o: {open, closed, view, searching, sort}. */
function viewsRenderMode(main, o) {
  const mode = state.viewMode;
  if (mode !== 'timeline' && mode !== 'matrix') return false;
  if (o.view === 'completed') return false;   // the Logbook stays a list
  const box = document.createElement('div');
  box.className = 'vw-mode vw-' + mode;
  // The entrance plays once per entry (view + layout), not on every save or sync.
  const entry = o.view + '|' + mode;
  if (_vwEntry !== entry) { _vwEntry = entry; if (!_vwReduced()) box.classList.add('vw-enter'); }
  main.appendChild(box);
  try {
    if (mode === 'timeline') viewsRenderTimeline(box, o);
    else viewsRenderMatrix(box, o);
  } catch (e) {
    console.error('[views] ' + mode, e);
    box.innerHTML = emptyStateHtml({ icon: 'triangle-alert', title: 'This layout could not be drawn', text: 'Your tasks are safe. Switch to List to see them.', compact: true });
  }
  return true;
}

/* ---------- V cycles the layouts; palette commands ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'v' && e.key !== 'V') return;
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"], .pop, .modal, dialog')) return;
  if (typeof isTaskView !== 'function' || !isTaskView(state.view)) return;
  if (typeof tcCurrentTaskId === 'function' && tcCurrentTaskId()) return;   // not behind an open task card
  e.preventDefault();
  const cur = _VW_CYCLE.indexOf(state.viewMode || 'list');
  const next = _VW_CYCLE[(cur + (e.shiftKey ? -1 : 1) + _VW_CYCLE.length) % _VW_CYCLE.length];
  viewsSetMode(next);
  const m = VIEW_MODES.find(x => x.k === next);
  if (m) toast(m.label + ' layout', { icon: m.icon });
});
for (const m of VIEW_MODES) {
  if (m.k === 'review') continue;
  registerCommand({
    id: 'view-mode-' + m.k, group: 'Tasks', icon: m.icon, kbd: 'V',
    label: m.k === 'timeline' ? 'Show tasks as a week timeline' : m.k === 'matrix' ? 'Show tasks as a priority matrix' : `Show tasks as a ${m.label.toLowerCase()}`,
    keywords: 'layout view mode switch ' + m.label.toLowerCase() + (m.k === 'timeline' ? ' week calendar plan time block' : m.k === 'matrix' ? ' eisenhower urgent important quadrant' : ''),
    when: () => typeof isTaskView === 'function' && isTaskView(state.view) && (state.viewMode || 'list') !== m.k,
    run: () => viewsSetMode(m.k),
  });
}

/** The keys sheet's "Task layouts" group (75-modals.js). */
function viewsKeyHelp() {
  return [
    ['Next / previous layout', ['V', 'Shift', 'V']],
    ['Timeline: move between tasks', ['←', '→', '↑', '↓']], ['Timeline: move a task a day', ['Shift', '←', '→']],
    ['Timeline: move a time block 15 min', ['Shift', '↑', '↓']], ['Timeline: complete', ['Space']],
    ['Matrix: move to another box', ['M']],
  ];
}

/* ---------- list fields ---------- */
const VIEW_ROW_FIELDS = [['due', 'Due date'], ['stream', 'Stream'], ['tags', 'Tags'], ['people', 'People'], ['subtasks', 'Subtasks'], ['estimate', 'Estimate'], ['details', 'Notes, files, repeat']];
const _VW_ROW_PRESETS = [['all', 'Everything', []], ['calm', 'Calm', ['tags', 'people', 'details']], ['bare', 'Bare', ['stream', 'tags', 'people', 'subtasks', 'estimate', 'details']]];
function viewsRowHidden() {
  const h = taskViewPrefs('_rows').hide;
  return new Set(Array.isArray(h) ? h.filter(k => VIEW_ROW_FIELDS.some(f => f[0] === k)) : []);
}
function viewsSetRowHidden(key, hidden) {
  const s = viewsRowHidden();
  if (hidden) s.add(key); else s.delete(key);
  setTaskViewPref('_rows', { hide: s.size ? [...s] : null });
}
function viewsApplyListFields(el) {
  if (!el) return el;
  const s = viewsRowHidden();
  if (s.size) el.setAttribute('data-vf-hide', [...s].join(' ')); else el.removeAttribute('data-vf-hide');
  return el;
}
/** "Show on rows": a toggle per field plus three presets (Everything, Calm, Bare). */
function viewsListFieldsField(el, paint) {
  const hid = viewsRowHidden();
  const f = document.createElement('div'); f.className = 'field vw-fields'; f.style.marginBottom = '12px';
  const l = document.createElement('span'); l.className = 'field-label'; l.textContent = 'Show on rows'; f.appendChild(l);
  const seg = document.createElement('div'); seg.className = 'seg seg-block seg-wrap'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Show on rows');
  for (const [k, t] of VIEW_ROW_FIELDS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
    b.setAttribute('aria-pressed', hid.has(k) ? 'false' : 'true');
    b.title = hid.has(k) ? 'Hidden: click to show' : 'Shown: click to hide';
    b.onclick = () => { viewsSetRowHidden(k, !hid.has(k)); render(); paint(); };
    seg.appendChild(b);
  }
  f.appendChild(seg);
  const pre = document.createElement('div'); pre.className = 'vw-presets';
  const curKey = [...hid].sort().join(',');
  for (const [k, t, hide] of _VW_ROW_PRESETS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
    b.textContent = t;
    const on = hide.slice().sort().join(',') === curKey;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) b.setAttribute('aria-current', 'true');
    b.onclick = () => { if (on) return; setTaskViewPref('_rows', { hide: hide.length ? hide.slice() : null }); render(); paint(); };
    pre.appendChild(b);
  }
  f.appendChild(pre);
  el.appendChild(f);
}
