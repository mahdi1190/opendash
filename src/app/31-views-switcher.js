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
   taskViewPrefs._rows = {hide: ['tags', ...], v: 2} (every list, one choice;
   UI_CLEANUP_PLAN.md 2.2). With nothing saved, rows are Calm: the title, the
   due date, the priority (the checkbox colour) and the stream dot. Every write
   stores an explicit array (Everything = []); an older non-empty hide (no v) is
   kept, with the four 2.18 fields hidden too; a missing or null value is Calm.
     VIEW_ROW_FIELDS                  [[key, label]]
     VIEW_ROW_CALM                    the default hidden list
     viewsRowHidden()                 Set of hidden field keys
     viewsSetRowHidden(key, hidden)   one field on / off
     viewsSetRowPreset(hide)          a whole choice (a preset)
     viewsApplyListFields(el)         stamps data-vf-hide on a list (CSS hides the parts)
     viewsListFieldsField(el, paint)  the "Show on rows" field in the Display popover
   Hidden is not gone: the row's tooltip lists what is hidden (30-task-row.js).
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
  if (typeof gameMark === 'function') gameMark('view-mode', k);   // achievements (71-ach-src-b2-work.js)
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
const VIEW_ROW_FIELDS = [['due', 'Due date'], ['stream', 'Stream'], ['streamLabel', 'Stream name'], ['tags', 'Tags'], ['people', 'People'], ['subtasks', 'Subtasks'],
  ['estimate', 'Estimate'], ['context', 'Context and energy'], ['planned', 'Planned day'], ['pin', 'Pin'], ['details', 'Notes, files, repeat']];
/** The fields 2.18 added: an older explicit choice hides them too, so Calm and Bare users stay calm. */
const _VW_ROW_NEW = ['streamLabel', 'context', 'planned', 'pin'];
const VIEW_ROW_CALM = ['streamLabel', 'tags', 'people', 'subtasks', 'estimate', 'details', 'context', 'planned', 'pin'];
const _VW_ROW_PRESETS = [['all', 'Everything', []], ['calm', 'Calm', VIEW_ROW_CALM], ['bare', 'Bare', VIEW_ROW_FIELDS.map(f => f[0]).filter(k => k !== 'due')]];
function _vwRowKeys(list) { return list.filter(k => VIEW_ROW_FIELDS.some(f => f[0] === k)); }
function viewsRowHidden() {
  const p = taskViewPrefs('_rows');
  const h = p.hide;
  if (p.v === 2 && Array.isArray(h)) return new Set(_vwRowKeys(h));                   // a 2.18 choice, as it is
  if (Array.isArray(h) && h.length) return new Set(_vwRowKeys(h).concat(_VW_ROW_NEW));   // an older explicit choice
  return new Set(VIEW_ROW_CALM);                                                         // nothing saved: Calm
}
/** Save a whole choice: always an explicit array (Everything is []), marked v: 2. */
function viewsSetRowPreset(hide) { setTaskViewPref('_rows', { hide: _vwRowKeys(hide || []).slice(), v: 2 }); }
function viewsSetRowHidden(key, hidden) {
  const s = viewsRowHidden();
  if (hidden) s.add(key); else s.delete(key);
  viewsSetRowPreset([...s]);
}
function viewsApplyListFields(el) {
  if (!el) return el;
  const s = viewsRowHidden();
  if (s.size) el.setAttribute('data-vf-hide', [...s].join(' ')); else el.removeAttribute('data-vf-hide');
  _vwCalmTipSoon();
  return el;
}
/* The one case that cannot be told apart (UI_CLEANUP_PLAN.md 2.2, step 3): someone who had OpenDash
   before 2.18 and nothing saved (they had Everything) now sees Calm rows. One tip on the Display
   button, once on every device (seen.once), whose button writes Everything. */
const _VW_CALM_TIP = 'calmRows:2.18';
let _vwCalmTipTimer = null, _vwCalmTipShown = false;
function _vwCalmTipWanted() {
  if (_vwCalmTipShown || typeof seenOnce !== 'function' || seenOnce(_VW_CALM_TIP)) return false;
  const p = taskViewPrefs('_rows');
  if (p.v === 2 || (Array.isArray(p.hide) && p.hide.length)) return false;   // a choice was made
  return typeof pagesBaseline === 'function' && pagesBaseline() === 'upgrade';
}
function _vwCalmTipSoon() {
  if (_vwCalmTipTimer || !_vwCalmTipWanted()) return;
  _vwCalmTipTimer = setTimeout(() => { _vwCalmTipTimer = null; _vwCalmTip(); }, 1200);
}
function _vwCalmTip() {
  const btn = document.getElementById('display-btn');
  if (!btn || btn.hidden || !btn.getClientRects().length || !_vwCalmTipWanted()) return;
  if (document.querySelector('.modal, .pop')) return;   // not over a dialog or a menu: the next list render tries again
  _vwCalmTipShown = true;
  const done = () => { if (typeof seenMarkOnce === 'function') seenMarkOnce(_VW_CALM_TIP); };
  openPopover(btn, (pop, close) => {
    const t = document.createElement('p'); t.className = 'vw-tip-t'; t.textContent = 'Rows are calmer now. Show everything?';
    const row = document.createElement('div'); row.className = 'vw-tip-acts';
    row.append(
      uiButton({ label: 'Not now', kind: 'ghost', size: 'sm', run: () => close() }),
      uiButton({ label: 'Show everything', kind: 'primary', size: 'sm', run: () => { viewsSetRowPreset([]); close(); render(); } }),
    );
    pop.append(t, row);
  }, { className: 'vw-tip', align: 'end', width: 260, focus: false, onClose: done });
}
/** "Show on rows": a toggle per field plus three presets (Everything, Calm, Bare). */
function viewsListFieldsField(el, paint) {
  const hid = viewsRowHidden();
  const f = document.createElement('div'); f.className = 'field vw-fields';
  const l = document.createElement('span'); l.className = 'field-label'; l.textContent = 'Show on rows'; f.appendChild(l);
  const seg = document.createElement('div'); seg.className = 'seg seg-block seg-wrap'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Show on rows');
  for (const [k, t] of VIEW_ROW_FIELDS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
    b.setAttribute('aria-pressed', hid.has(k) ? 'false' : 'true');
    b.title = hid.has(k) ? 'Hidden: click to show' : 'Shown: click to hide';
    b.onclick = () => { viewsSetRowHidden(k, !hid.has(k)); if (typeof seenMarkOnce === 'function') seenMarkOnce(_VW_CALM_TIP); render(); paint(); };
    seg.appendChild(b);
  }
  f.appendChild(seg);
  const pre = document.createElement('div'); pre.className = 'vw-presets';
  const curKey = [...hid].sort().join(',');
  for (const [k, t, hide] of _VW_ROW_PRESETS) {
    const on = hide.slice().sort().join(',') === curKey;
    const b = uiButton({ label: t, kind: 'ghost', size: 'sm', pressed: on, bubble: true, tip: k === 'calm' ? 'Title, due date, priority and the stream dot' : k === 'bare' ? 'Title and due date' : '',
      run: () => { if (on) return; viewsSetRowPreset(hide); if (typeof seenMarkOnce === 'function') seenMarkOnce(_VW_CALM_TIP); render(); paint(); } });
    if (on) b.setAttribute('aria-current', 'true');
    pre.appendChild(b);
  }
  f.appendChild(pre);
  el.appendChild(f);
}
