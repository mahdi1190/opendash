/* ============================================================
   TASK ROW (owner: Tasks). One line per task:
     [grip][select] (o) Title                     #tag #tag +N  (AB)  Fri
                        * Stream  [] 2/5  # 3  ~ Every week
   The checkbox ring carries the priority colour. One click = done (Undo in
   the toast); "in progress" is Shift+click, S, or the menu. Clicking the
   subtask count shows the checklist inline. Details open in the side panel.
   Used by every task list, the Home page and person pages.
   ============================================================ */
const TASK_DND_MIME = 'application/x-dashboard-task';
/** The task id carried by a drag, or null (rejects text drops and unknown ids). */
function draggedTaskId(e) {
  const dt = e && e.dataTransfer; if (!dt) return null;
  let id = '';
  try { id = dt.getData(TASK_DND_MIME) || ''; } catch (err) { id = ''; }
  if (!id) { try { id = (dt.getData('text/plain') || '').trim(); } catch (err) { id = ''; } }
  if (!id || id.length > 200 || /\s/.test(id)) return null;
  return getItem(id) ? id : null;
}
function isTaskDrag(e) {
  const types = e && e.dataTransfer && e.dataTransfer.types;
  return !!types && Array.from(types).includes(TASK_DND_MIME);
}
function _startTaskDrag(e, item, el) {
  e.dataTransfer.setData(TASK_DND_MIME, item.id);
  e.dataTransfer.setData('text/plain', item.id);
  e.dataTransfer.effectAllowed = 'move';
  el.classList.add('dragging');
  document.body.classList.add('task-dragging');
}
function _endTaskDrag(el) {
  el.classList.remove('dragging');
  document.body.classList.remove('task-dragging');
  document.querySelectorAll('.drag-over, .drop-before, .drop-after').forEach(n => n.classList.remove('drag-over', 'drop-before', 'drop-after'));
}

/** Short due label for rows: Today / 14:00 / Tomorrow / Mon / Yesterday / 12 Sep. */
function rowDueLabel(item) {
  const iso = effDate(item); if (!iso) return '';
  const d = daysUntil(iso);
  const time = item.dueTime || '';
  const loc = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined;
  const dt = new Date(iso + 'T00:00:00');
  let lbl;
  if (d === 0) lbl = time || 'Today';
  else if (d === 1) lbl = 'Tomorrow';
  else if (d === -1) lbl = 'Yesterday';
  else if ((d > 1 && d < 7) || (d < -1 && d > -7)) lbl = dt.toLocaleDateString(loc, { weekday: 'short' });
  else lbl = dt.toLocaleDateString(loc, dt.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  if (time && d !== 0) lbl += ' ' + time;
  return lbl;
}
/** The repeat rule for a row's meta line: "Every Fri" / "Every other Fri" when the weekday is known. */
function _rowRecurLabel(rec, iso) {
  if ((rec === 'weekly' || rec === 'biweekly') && /^\d{4}-\d{2}-\d{2}$/.test(iso || '')) {
    const loc = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined;
    const wd = new Date(iso + 'T00:00:00').toLocaleDateString(loc, { weekday: 'short' });
    return (rec === 'weekly' ? 'Every ' : 'Every other ') + wd;
  }
  return recurrenceLabel(rec);
}
/**
 * The meeting a task is linked to (eventMeta[ev].tasks, set from the event panel or the MCP):
 * the next one still to come, else the latest. -> {title, when} or null. Index rebuilt per save / calendar update.
 */
let _rowMeetIdx = null, _rowMeetKey = null;
function _rowMeeting(taskId) {
  const meta = state.eventMeta;
  if (!meta || typeof meta !== 'object' || typeof calEventById !== 'function' || typeof CalStore === 'undefined') return null;
  const key = [state._lastSave || 0, Object.keys(meta).length, CalStore.data && CalStore.data.fetchedAt].join('|');
  if (key !== _rowMeetKey) {
    _rowMeetKey = key; _rowMeetIdx = new Map();
    for (const [eid, m] of Object.entries(meta)) {
      if (!m || !Array.isArray(m.tasks) || !m.tasks.length) continue;
      const ev = calEventById(eid);
      if (!ev || !ev.start) continue;
      for (const tid of m.tasks) { if (!_rowMeetIdx.has(tid)) _rowMeetIdx.set(tid, []); _rowMeetIdx.get(tid).push(ev); }
    }
  }
  const evs = _rowMeetIdx.get(taskId);
  if (!evs || !evs.length) return null;
  const now = Date.now();
  const at = (ev) => calEventStart(ev).getTime();
  const next = evs.filter(ev => at(ev) >= now - 3600000).sort((a, b) => at(a) - at(b))[0] || evs.slice().sort((a, b) => at(b) - at(a))[0];
  const d = calEventStart(next);
  const loc = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined;
  return { title: String(next.summary || next.title || 'Meeting'), when: isNaN(d) ? '' : d.toLocaleString(loc, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) };
}
function _rowDueClass(item) {
  const d = daysUntil(effDate(item));
  if (d === null) return 'none';
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 3) return 'soon';
  return '';
}
function _highlightText(text) {
  const q = typeof searchQuery === 'string' && searchQuery ? parseTaskSearch(searchQuery) : null;
  if (!q || !q.words.length) return esc(text);
  const words = q.words.filter(w => w.length > 1).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return esc(text);
  const re = new RegExp('(' + words.join('|') + ')', 'ig');
  return String(text).split(re).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join('');
}
/** Avatars for a task (known people; unknown ids as grey initials). */
function _taskAvatarsHtml(item, max) {
  const ids = typeof effPeople === 'function' ? effPeople(item) : (item.people || []);
  const out = [];
  for (const pid of ids) {
    const p = typeof getPerson === 'function' ? getPerson(pid) : null;
    if (p && p.self) continue;
    out.push(p ? { name: p.name, color: p.color, id: pid, p } : { name: pid, color: null, id: pid, unknown: true });
  }
  if (!out.length) return { html: '', title: '' };
  const shown = out.slice(0, max || 3);
  // Known people: their avatar (symbol or initials) with the right-click person menu (28-customise.js).
  const html = shown.map(p => (p.p && typeof avatarHtmlInitials === 'function' ? avatarHtmlInitials(p.p, 20)
    : `<span class="avatar${p.unknown ? ' unknown' : ''}" style="--c:${escAttr(safeColor(p.color, 'var(--sw-slate)'))}">${esc(avatarInitials(p.name))}</span>`)).join('')
    + (out.length > shown.length ? `<span class="avatar more">+${out.length - shown.length}</span>` : '');
  return { html, title: out.map(p => p.name + (p.unknown ? ' (no profile yet)' : '')).join(', ') };
}

function renderTaskRow(item, opts) {
  opts = opts || {};
  const id = item.id;
  const status = statusOf(id);
  const wont = isWontDo(item);
  const prio = effPriority(item);
  const stream = effStream(item);
  const tags = effTags(item);
  const recurrence = effRecurrence(item);
  const notes = getNotes(id);
  const subs = getSubtasks(id);
  const subDone = subs.filter(s => s.done).length;
  const pinned = isPinned(id);
  const today = todayStr();

  const el = document.createElement('div');
  el.className = 'task' + (status === 'done' ? ' done' : '') + (wont ? ' wontdo' : '') + (status === 'doing' ? ' doing' : '')
    + (state.selectedTaskId === id ? ' selected' : '') + (pinned ? ' pinned' : '')
    + (_lastSelectedTaskId === id ? ' kb-cursor' : '') + (multiSelect.ids.has(id) ? ' multi-selected' : '');
  el.dataset.id = id;
  el.setAttribute('role', 'listitem');
  // The open task (side panel or centre card) stays highlighted.
  if (state.selectedTaskId === id || (typeof tcCurrentTaskId === 'function' && tcCurrentTaskId() === id)) {
    el.setAttribute('aria-current', 'true');
    if (state.selectedTaskId !== id) el.classList.add('tc-current');
  }
  el.draggable = true;
  el.ondragstart = e => { if (e.target.closest('input, textarea, [contenteditable="true"]')) { e.preventDefault(); return; } _startTaskDrag(e, item, el); };
  el.ondragend = () => _endTaskDrag(el);
  if (!opts.noReorder) {
    el.ondragover = e => {
      if (!isTaskDrag(e)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      el.classList.toggle('drop-after', after); el.classList.toggle('drop-before', !after);
    };
    el.ondragleave = () => el.classList.remove('drop-before', 'drop-after');
    el.ondrop = e => {
      const draggedId = draggedTaskId(e);
      const after = el.classList.contains('drop-after');
      el.classList.remove('drop-before', 'drop-after');
      if (!draggedId) return;
      e.preventDefault(); e.stopPropagation();
      if (draggedId !== id) reorderTask(draggedId, id, after);
    };
  }

  const grip = document.createElement('span'); grip.className = 'drag-handle'; grip.innerHTML = icon('grip-vertical');
  grip.setAttribute('aria-hidden', 'true');
  el.appendChild(grip);

  const mh = document.createElement('span'); mh.className = 'multi-handle';
  const mc = document.createElement('button'); mc.type = 'button';
  mc.className = 'multi-checkbox' + (multiSelect.ids.has(id) ? ' checked' : '');
  mc.setAttribute('aria-label', 'Select for bulk actions');
  mc.onclick = e => { e.stopPropagation(); _toggleMulti(id); };
  mh.appendChild(mc);
  el.appendChild(mh);

  const cb = document.createElement('button');
  cb.type = 'button';
  cb.className = 'checkbox ' + prio + (status === 'doing' ? ' doing' : '') + (status === 'done' ? (wont ? ' wontdo' : ' done') : '');
  cb.setAttribute('role', 'checkbox');
  cb.setAttribute('aria-checked', status === 'done' ? 'true' : status === 'doing' ? 'mixed' : 'false');
  cb.setAttribute('aria-label', (status === 'done' ? 'Reopen: ' : 'Complete: ') + effTitle(item));
  cb.title = status === 'done' ? (wont ? "Won't do · click to reopen" : 'Done · click to reopen') : `${PRIORITIES[prio]?.label || ''} · click to complete · Shift+click: in progress`;
  if (wont) cb.innerHTML = icon('minus', 'i-xs');
  cb.onclick = e => {
    e.stopPropagation();
    if (e.shiftKey) { toggleDoing(id); return; }
    if (e.altKey) { markWontDo(id); return; }
    if (statusOf(id) !== 'done' && window.Motion) Motion.completeTask(el, () => toggleDone(id));
    else toggleDone(id);
  };
  el.appendChild(cb);

  // Body: title + one meta line.
  const body = document.createElement('div'); body.className = 't-body';
  const titleRow = document.createElement('div'); titleRow.className = 't-title-row';
  const titleEl = document.createElement('span'); titleEl.className = 't-title';
  if (searchQuery) titleEl.innerHTML = _highlightText(effTitle(item)); else titleEl.textContent = effTitle(item);
  titleRow.appendChild(titleEl);
  body.appendChild(titleRow);

  const meta = document.createElement('div'); meta.className = 't-meta';
  if (!opts.hideStream) {
    const sInfo = STREAMS[stream];
    const sm = document.createElement('span'); sm.className = 'stream t-streamdot';
    sm.style.setProperty('--c', safeColor(sInfo?.color, '#868a94'));
    // The stream's marker (symbol, shape) and its right-click menu: 28-customise.js.
    sm.innerHTML = `${streamMarkHtml(stream, { inherit: true })}<span data-cz-label>${esc(sInfo?.label || stream || '')}</span>`;
    if (sInfo) czMark(sm, 'stream', stream);
    meta.appendChild(sm);
  }
  const m = (cls, ic, text, title) => {
    const s = document.createElement('span'); s.className = 'm ' + cls;
    s.innerHTML = icon(ic) + (text !== '' && text != null ? `<span>${esc(text)}</span>` : '');
    if (title) s.title = title;
    meta.appendChild(s); return s;
  };
  // In progress shows as the half-filled checkbox (as in the mockup), not as words in the meta line.
  if (item.plannedFor && status !== 'done' && !(state.view === 'today' && item.plannedFor <= today && daysUntil(effDate(item)) === 0)) {
    const pd = daysUntil(item.plannedFor);
    if (pd !== null && pd <= 0) m('t-planned', 'sun', 'Today', 'Planned for today');
    else m('t-planned', 'calendar-check', dueLabel(item.plannedFor), 'Planned for ' + item.plannedFor);
  }
  if (subs.length > 0) {
    const ss = document.createElement('button'); ss.type = 'button';
    ss.className = 'm sub-count' + (subDone === subs.length ? ' all-done' : '') + (_expandedTaskIds.has(id) ? ' open' : '');
    ss.innerHTML = icon('list-checks') + `<span>${subDone}/${subs.length}</span>`;
    ss.title = `${subDone} of ${subs.length} subtasks done · click to ${_expandedTaskIds.has(id) ? 'hide' : 'show'}`;
    ss.onclick = e => { e.stopPropagation(); toggleInlineSubtasks(id); };
    meta.appendChild(ss);
  }
  if (notes.length > 0) m('note-count', 'message-square', notes.length, `${notes.length} note${notes.length === 1 ? '' : 's'}`);
  // Attached files & links, and the meeting the task is linked to (paperclip count, video + event name).
  const nRes = typeof resFor === 'function' ? resFor('task', id).length : 0;
  if (nRes) m('t-files', 'paperclip', nRes, `${nRes} file${nRes === 1 ? '' : 's'} or link${nRes === 1 ? '' : 's'} attached`);
  const meet = _rowMeeting(id);
  if (meet) m('t-meet', 'video', meet.title, 'Linked meeting: ' + meet.title + (meet.when ? ' · ' + meet.when : ''));
  if (recurrence && recurrence !== 'none') m('t-recur', 'repeat', _rowRecurLabel(recurrence, effDate(item)), recurrenceLabel(recurrence));
  if (item.estimate) m('t-est', 'timer', fmtEstimate(item.estimate), 'Estimate');
  if (pinned) m('t-pin', 'pin', '', 'Pinned');
  if (wont) m('t-wont', 'circle-x', "Won't do");
  else if (status === 'done' && opts.showClosed) {
    const ts = closedAt(item);
    if (ts) m('t-closed', 'check', new Date(ts).toLocaleTimeString((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined, { hour: '2-digit', minute: '2-digit' }), 'Completed ' + formatTimestamp(ts));
  }
  body.appendChild(meta);
  el.appendChild(body);

  // Side: at most 3 tag chips (+N), people, due date.
  const right = document.createElement('div'); right.className = 't-right';
  if (tags.length) {
    const chips = document.createElement('span'); chips.className = 'chips t-tags';
    for (const t of tags.slice(0, 3)) {
      const c = document.createElement('button'); c.type = 'button'; c.className = 'chip t-tag';
      c.innerHTML = `<span data-cz-label>${esc(t)}</span>`;
      czTagChip(c, t);   // the tag's colour and symbol, and its right-click menu (28-customise.js)
      c.title = 'Show #' + t;
      c.onclick = e => { e.stopPropagation(); setView('tag:' + t); };
      chips.appendChild(c);
    }
    if (tags.length > 3) {
      const more = document.createElement('span'); more.className = 'chip chip-more';
      more.textContent = '+' + (tags.length - 3);
      more.title = tags.slice(3).map(t => '#' + t).join('  ');
      chips.appendChild(more);
    }
    right.appendChild(chips);
  }
  const av = _taskAvatarsHtml(item, 3);
  if (av.html) {
    const a = document.createElement('span'); a.className = 'avatars t-people';
    a.innerHTML = av.html; a.title = av.title;
    right.appendChild(a);
  }
  const ds = document.createElement('span');
  ds.className = 'due-stamp ' + (status === 'done' ? 'none' : _rowDueClass(item));
  ds.textContent = status === 'done' ? '' : rowDueLabel(item);
  if (effDate(item) && status !== 'done') ds.title = 'Due ' + effDate(item) + (item.dueTime ? ' ' + item.dueTime : '');
  right.appendChild(ds);
  el.appendChild(right);

  el.onclick = (e) => {
    if (e.target.closest('.multi-handle')) return;
    if (e.shiftKey && _lastSelectedTaskId && _lastRenderedTaskIds.length) {
      const i1 = _lastRenderedTaskIds.indexOf(_lastSelectedTaskId);
      const i2 = _lastRenderedTaskIds.indexOf(id);
      if (i1 >= 0 && i2 >= 0) {
        const [lo, hi] = i1 < i2 ? [i1, i2] : [i2, i1];
        for (let i = lo; i <= hi; i++) multiSelect.ids.add(_lastRenderedTaskIds[i]);
        document.body.classList.toggle('has-selection', multiSelect.ids.size > 0);
        render();
        return;
      }
    }
    if (e.ctrlKey || e.metaKey) { _lastSelectedTaskId = id; _toggleMulti(id); return; }
    _lastSelectedTaskId = id;
    // The centre card or the side panel (Settings > Tasks): 61-task-card.js. Clicking the open one again is a no-op.
    if (typeof openTask === 'function') { openTask(id, { from: el }); return; }
    if (state.selectedTaskId === id) return;
    selectTask(id);
  };
  el.ondblclick = (e) => {
    if (e.target.closest('button, input, textarea, .checkbox')) return;
    if (typeof openTask === 'function') openTask(id, { from: el }); else selectTask(id);
    setTimeout(() => { const t = document.querySelector('.tc [data-fk="title"], #detail-pane .dp-title-input'); if (t) { t.focus(); t.select(); } }, 30);
  };
  el.oncontextmenu = (e) => {
    e.preventDefault();
    _lastSelectedTaskId = id;
    openTaskMenu({ x: e.clientX, y: e.clientY }, id);
  };
  if (!_expandedTaskIds.has(id) || !subs.length) return el;
  // Subtasks shown inline under the row.
  el.classList.add('expanded');
  const block = document.createElement('div');
  block.className = 'task-block';
  block.dataset.id = id;
  block.appendChild(el);
  block.appendChild(_buildInlineSubtasks(item));
  return block;
}

function _toggleMulti(id) {
  if (multiSelect.ids.has(id)) multiSelect.ids.delete(id); else multiSelect.ids.add(id);
  document.body.classList.toggle('has-selection', multiSelect.ids.size > 0);
  render();
}

function toggleInlineSubtasks(id) {
  if (_expandedTaskIds.has(id)) {
    const row = document.querySelector(`#main-body .task[data-id="${CSS.escape(id)}"]`);
    const panel = window.Motion && row && row.parentElement && row.parentElement.querySelector(':scope > .task-expanded');
    if (panel) { Motion.collapse(panel, () => { _expandedTaskIds.delete(id); render(); }); return; }
    _expandedTaskIds.delete(id);
  } else _expandedTaskIds.add(id);
  render();
}

// Inline checklist under a row: tick, and add more without opening the panel.
function _buildInlineSubtasks(item) {
  const wrap = document.createElement('div');
  wrap.className = 'task-expanded subtasks-inline';
  wrap.onclick = (e) => e.stopPropagation();
  for (const s of getSubtasks(item.id)) {
    const row = document.createElement('div'); row.className = 'st-inline' + (s.done ? ' done' : '');
    const c = document.createElement('button'); c.type = 'button';
    c.className = 'check check-sm' + (s.done ? ' done' : '');
    c.setAttribute('role', 'checkbox'); c.setAttribute('aria-checked', s.done ? 'true' : 'false');
    c.setAttribute('aria-label', s.title);
    c.innerHTML = s.done ? icon('check') : '';
    c.onclick = () => toggleSubtask(item.id, s.id);
    const t = document.createElement('span'); t.className = 'st-t'; t.textContent = s.title;
    row.append(c, t);
    wrap.appendChild(row);
  }
  const add = document.createElement('input');
  add.className = 'st-inline-add'; add.placeholder = 'Add a subtask…';
  add.dataset.fk = 'inline-sub:' + item.id;
  add.onkeydown = (e) => {
    if (e.key === 'Enter' && add.value.trim()) { e.preventDefault(); _keepFocus('inline-sub:' + item.id); addSubtask(item.id, add.value.trim()); }
    if (e.key === 'Escape') { add.value = ''; add.blur(); }
  };
  wrap.appendChild(add);
  return wrap;
}

/** Reorder by drag: switches THIS view to manual order (seeded from what is on screen). */
function reorderTask(draggedId, targetId, after) {
  if (!getItem(draggedId) || !getItem(targetId)) return;
  const view = state.view;
  const wasManual = sortForView(view) === 'manual';
  let order = (state.customOrder[view] || []).filter(x => getItem(x));
  if (!wasManual || !order.length) order = _lastRenderedTaskIds.filter(x => getItem(x));
  order = order.filter(x => x !== draggedId);
  let ti = order.indexOf(targetId);
  if (ti < 0) order.push(draggedId);
  else order.splice(ti + (after ? 1 : 0), 0, draggedId);
  state.customOrder[view] = order;
  if (!wasManual) {
    setTaskViewPref(view, { sort: 'manual' });
    toast('This list now uses your own order', { icon: 'grip-vertical', action: { label: 'Sort by date', run: () => { setTaskViewPref(view, { sort: 'date' }); render(); } } });
  }
  saveData(); render();
}
