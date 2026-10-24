/* ============================================================
   PRIORITY MATRIX (owner: Tasks views, 2.16). A task layout: the list's open
   tasks in an urgent / important 2x2.
     important = priority P1 or P2
     urgent    = due within the urgent window (taskViewPrefs._matrix.urgentDays:
                 0 today, 2 (default), 3 or 7 days; overdue is always urgent)
   Dragging a task (or a selection) into another box changes only what has to
   change, in one Undo step: becoming important gives P1 (Do now) or P2
   (Schedule), becoming less important gives P3; becoming urgent makes it due
   today, leaving urgent moves the deadline a week out. Rows are the list's
   own rows (30-task-row.js, the list fields apply); M on the keyboard cursor
   task opens "Move to".
     VIEW_MATRIX_BOXES                [{k, label, sub, icon, urgent, important}]
     viewsMatrixBoxOf(item)           the box key
     viewsMatrixMove(ids, k)          move tasks into a box
     viewsRenderMatrix(box, o)
   ============================================================ */
const VIEW_MATRIX_BOXES = [
  { k: 'do', label: 'Do now', sub: 'Urgent and important', icon: 'flame', urgent: true, important: true, empty: 'Nothing urgent and important. A calm moment.' },
  { k: 'plan', label: 'Schedule', sub: 'Important, not urgent yet', icon: 'calendar-check', urgent: false, important: true, empty: 'Drag important work here to give it time before it turns urgent.' },
  { k: 'fit', label: 'Fit in or hand off', sub: 'Urgent, less important', icon: 'zap', urgent: true, important: false, empty: 'Nothing urgent but minor.' },
  { k: 'later', label: 'Later or drop', sub: 'Neither urgent nor important', icon: 'archive', urgent: false, important: false, empty: 'Nothing parked here.' },
];
const _VM_WINDOWS = [[0, 'Today'], [2, '2 days'], [3, '3 days'], [7, 'A week']];
function _vmUrgentDays() { const n = taskViewPrefs('_matrix').urgentDays; return _VM_WINDOWS.some(w => w[0] === n) ? n : 2; }
function _vmImportant(it) { const p = effPriority(it); return p === 'p1' || p === 'p2'; }
function _vmUrgent(it, lim) { const d = daysUntil(effDate(it)); return d !== null && d <= (lim == null ? _vmUrgentDays() : lim); }
function viewsMatrixBoxOf(it, lim) {
  const u = _vmUrgent(it, lim), i = _vmImportant(it);
  return u && i ? 'do' : i ? 'plan' : u ? 'fit' : 'later';
}
function viewsMatrixMove(ids, k) {
  const q = VIEW_MATRIX_BOXES.find(b => b.k === k); if (!q) return;
  const lim = _vmUrgentDays(), today = todayStr();
  const later = Clock.addDays(today, Math.max(lim + 1, 7));
  let n = 0; const what = new Set();
  for (const id of (Array.isArray(ids) ? ids : [ids])) {
    const it = getItem(id); if (!it || statusOf(id) === 'done') continue;
    let changed = false;
    if (_vmImportant(it) !== q.important) {
      const from = effPriority(it), to = q.important ? (q.urgent ? 'p1' : 'p2') : 'p3';
      logActivity(id, 'priority', { from, to }); it.priority = to; changed = true; what.add(PRIORITIES[to] ? PRIORITIES[to].label.split(' ')[0] : to);
    }
    if (_vmUrgent(it, lim) !== q.urgent) {
      const from = it.dueDate || null, to = q.urgent ? today : later;
      logActivity(id, 'date', { from, to, reason: 'Moved on the priority matrix' }); it.dueDate = to; changed = true; what.add('due ' + dueMoveLabel(to));
    }
    if (changed) n++;
  }
  if (!n) return;
  saveData(); render();
  const mark = undoMark();
  toast((n === 1 ? `Moved to ${q.label}` : `${n} tasks moved to ${q.label}`) + (what.size ? ' · ' + [...what].join(', ') : ''),
    { kind: 'ok', icon: q.icon, action: { label: 'Undo', run: () => undoMarked(mark) } });
}

function viewsRenderMatrix(box, o) {
  const view = o.view, lim = _vmUrgentDays();
  const root = document.createElement('div'); root.className = 'vm';
  // The bar: what "urgent" means here, and the totals.
  const bar = document.createElement('div'); bar.className = 'vm-bar';
  const lab = document.createElement('span'); lab.className = 'vm-bar-l'; lab.textContent = 'Urgent means due within';
  const seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Urgent means due within');
  for (const [n, t] of _VM_WINDOWS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
    b.setAttribute('aria-pressed', n === lim ? 'true' : 'false');
    if (n === lim) b.setAttribute('aria-current', 'true');
    b.onclick = () => { if (n === lim) return; setTaskViewPref('_matrix', { urgentDays: n === 2 ? null : n }); render(); };
    seg.appendChild(b);
  }
  bar.append(lab, seg);
  const tip = document.createElement('span'); tip.className = 'vm-tip';
  tip.textContent = 'Important = P1 or P2. Drag between boxes, or press M on a task.';
  bar.appendChild(tip);
  root.appendChild(bar);

  if (!o.open.length) {
    mountEmptyState(root, { icon: 'layout-grid', title: o.searching ? 'No open tasks match' : 'No open tasks here', text: o.searching ? 'Try another search.' : 'Add a task with Q and it lands in its box.', compact: true });
    box.appendChild(root);
    return;
  }
  const groups = new Map(VIEW_MATRIX_BOXES.map(b => [b.k, []]));
  for (const it of o.open) groups.get(viewsMatrixBoxOf(it, lim)).push(it);
  // Done today that counted (important ones): a small win in Do now.
  const today = todayStr();
  let doneToday = 0;
  for (const it of (o.closed || [])) if (_vmImportant(it) && _closedOn(it) === today) doneToday++;

  const grid = document.createElement('div'); grid.className = 'vm-grid';
  if (typeof viewsApplyListFields === 'function') viewsApplyListFields(grid);
  grid.insertAdjacentHTML('beforeend', `<span class="vm-ax vm-ax-x1">${icon('alarm-clock', 'i-xs')}Urgent</span><span class="vm-ax vm-ax-x2">Not urgent</span>`
    + `<span class="vm-ax vm-ax-y1">${icon('star', 'i-xs')}Important</span><span class="vm-ax vm-ax-y2">Less important</span>`);
  for (const q of VIEW_MATRIX_BOXES) {
    const items = sortItems(groups.get(q.k), o.sort === 'completed' ? 'date' : o.sort, view);
    const sec = document.createElement('section'); sec.className = 'vm-q vm-' + q.k; sec.dataset.q = q.k;
    sec.setAttribute('aria-label', `${q.label}: ${q.sub}, ${items.length} task${items.length === 1 ? '' : 's'}`);
    const est = items.reduce((n, it) => n + (Number(it.estimate) > 0 ? Number(it.estimate) : 0), 0);
    const h = document.createElement('header'); h.className = 'vm-h';
    h.innerHTML = `<span class="vm-ic">${icon(q.icon, 'i-sm')}</span><span class="vm-tt"><span class="vm-t">${esc(q.label)}</span><span class="vm-sub">${esc(q.sub)}</span></span>`
      + (q.k === 'do' && doneToday ? `<span class="vm-win" title="Important tasks done today">${icon('check', 'i-xs')}${doneToday} today</span>` : '')
      + (est ? `<span class="vm-est" title="Estimated time in this box">${icon('timer', 'i-xs')}${esc(viewsHours(est))}</span>` : '')
      + `<span class="vm-n">${items.length}</span>`;
    sec.appendChild(h);
    const body = document.createElement('div'); body.className = 'vm-b'; body.setAttribute('role', 'list');
    for (const it of items) {
      body.appendChild(renderTaskRow(it, { noReorder: true, hideStream: view.startsWith('stream:') }));
      _lastRenderedTaskIds.push(it.id);
    }
    if (!items.length) body.innerHTML = `<div class="vm-empty">${esc(q.empty)}</div>`;
    sec.appendChild(body);
    _vmDropZone(sec, q.k);
    grid.appendChild(sec);
  }
  root.appendChild(grid);
  box.appendChild(root);
}
function _vmDropZone(el, k) {
  el.addEventListener('dragover', (e) => { if (!isTaskDrag(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('drag-over'); });
  el.addEventListener('dragleave', (e) => { if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over'); });
  el.addEventListener('drop', (e) => {
    el.classList.remove('drag-over');
    const ids = draggedTaskIds(e); if (!ids.length) return;
    e.preventDefault(); e.stopPropagation();
    viewsMatrixMove(ids, k);
  });
}
/** M: "Move to" for the keyboard cursor task (or the selection) on the matrix. */
function viewsMatrixMenu(anchor, ids) {
  const lim = _vmUrgentDays();
  const cur = ids.length === 1 && getItem(ids[0]) ? viewsMatrixBoxOf(getItem(ids[0]), lim) : '';
  openMenu(anchor, VIEW_MATRIX_BOXES.map(q => ({
    label: q.label + (q.k === cur ? ' (here now)' : ''), icon: q.icon, disabled: q.k === cur,
    run: () => { if (q.k !== cur) viewsMatrixMove(ids, q.k); },
  })), { align: 'start', width: 230 });
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'm' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.defaultPrevented) return;
  if (state.viewMode !== 'matrix' || typeof isTaskView !== 'function' || !isTaskView(state.view) || state.view === 'completed') return;
  if (typeof tcCurrentTaskId === 'function' && tcCurrentTaskId()) return;   // an open task card has its own M (maximise)
  const t = e.target;
  if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"], .pop, .modal, dialog')) return;
  const sel = multiSelect.ids.size ? [...multiSelect.ids].filter(id => getItem(id)) : [];
  const id = _lastSelectedTaskId && _lastRenderedTaskIds.includes(_lastSelectedTaskId) ? _lastSelectedTaskId : null;
  const ids = sel.length ? sel : id ? [id] : [];
  if (!ids.length) return;
  const row = document.querySelector(`#main-body .vm .task[data-id="${CSS.escape(ids[0])}"]`);
  if (!row) return;
  e.preventDefault();
  viewsMatrixMenu(row, ids);
});
