/* ============================================================
   TASK DETAIL (owner: Tasks)
   The same content renders in two containers:
     - the side panel #detail-pane (renderDetail, state.selectedTaskId)
     - the centre card (61-task-card.js, the default way a task opens)
   so every piece below is a builder that takes the task id and a "view"
   ({mode, lastId, editingDesc, showAll} from _tdViews) and returns a node.
   Header (panel): complete, status, plan-for-today, pin, open in the centre,
   menu, close. Body: stream, title, properties (due + time, planned, priority,
   repeat, tags with autocomplete, people with "create person", estimate), the
   description as rendered markdown (click to edit), subtasks (drag to
   reorder, add stays open), notes (once), activity history, Ask Claude.
   Re-renders keep focus, caret and unsaved text of the field being edited.
   ============================================================ */
/** Show a task in the side panel. Already open: its content swaps, the panel stays (no close / reopen). */
function selectTask(id) {
  if (!getItem(id)) return;
  _dpEventId = null;
  state.selectedTaskId = id; saveUI();
  _lastSelectedTaskId = id;
  document.getElementById('content').classList.add('detail-open');
  render();
}
/** A calendar event in the same side panel (openEvent in side-panel mode). Not persisted. */
let _dpEventId = null;
function selectEventInPanel(id) {
  if (!id || typeof calEventById !== 'function' || !calEventById(id)) return false;
  if (typeof _calOpenEventId !== 'undefined') _calOpenEventId = null;   // not also in the calendar's own panel
  state.selectedTaskId = null; saveUI();
  _dpEventId = id;
  document.getElementById('content').classList.add('detail-open');
  render();
  return true;
}
/** Is the side panel showing something (a task or an event)? */
function detailPaneOpen() { return !!(state.selectedTaskId || _dpEventId); }
function closeDetail() {
  state.selectedTaskId = null; _dpEventId = null; saveUI();
  document.getElementById('content').classList.remove('detail-open');
  render();
}

/** Per-container view state: which task it showed last, the description editor, "show all" activity. */
const _tdViews = {
  panel: { mode: 'panel', lastId: null, editingDesc: null, showAll: false },
  card: { mode: 'card', lastId: null, editingDesc: null, showAll: false },
};

const _ACT_SOURCE = { mcp: 'Claude Code', assistant: 'Assistant', script: 'Sync script' };
/** "Today", "Tomorrow", "in 4 days", "2 days overdue" (next to a full date, so never a bare weekday). */
function _relDays(iso) {
  const d = daysUntil(iso);
  if (d === null) return '';
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d < 0) return `${-d} days overdue`;
  if (d < 14) return `in ${d} days`;
  if (d < 70) return `in ${Math.round(d / 7)} weeks`;
  return '';
}
function _fmtVal(field, v) {
  if (v === null || v === undefined || v === '') return 'none';
  if (field === 'priority') return { p1: 'High', p2: 'Medium', p3: 'Low', p0: 'None' }[v] || v;
  if (field === 'stream') return STREAMS[v]?.label || v;
  if (field === 'date' || field === 'plan') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? _dayLabel(v, { day: 'numeric', month: 'short', year: daysUntil(v) > 300 || daysUntil(v) < -300 ? 'numeric' : undefined }) : String(v);
  if (field === 'recurrence') return recurrenceLabel(v);
  return String(v);
}
/** One history entry as {icon, text, quote}. */
function describeActivity(a) {
  const st = (s) => ({ todo: 'To do', doing: 'In progress', done: 'Done', wontdo: "Won't do" }[s] || s || 'To do');
  switch (a.type) {
    case 'created': return { icon: 'circle-plus', text: a.text && a.text !== 'Created' ? a.text : 'Created' };
    case 'status':
      if (a.to === 'done') return { icon: 'circle-check', text: a.from === 'wontdo' ? "Changed from won't do to done" : 'Completed' };
      if (a.to === 'wontdo') return { icon: 'circle-x', text: "Marked won't do" };
      if (a.to === 'doing') return { icon: 'circle-dot', text: 'Started' };
      return { icon: 'rotate-ccw', text: `${st(a.from)} → ${st(a.to)}` };
    case 'occurrence': return { icon: 'repeat', text: `${a.skipped ? 'Skipped' : 'Completed'} · next ${_fmtVal('date', a.to)}`, quote: a.from ? `was due ${_fmtVal('date', a.from)}` : '' };
    case 'date': case 'reschedule': return { icon: 'calendar', text: `Due ${_fmtVal('date', a.from)} → ${_fmtVal('date', a.to)}`, quote: a.reason || '' };
    case 'plan': return { icon: 'sun', text: a.to ? `Planned for ${_fmtVal('plan', a.to)}${a.time ? ', ' + a.time + (a.minutes ? ` (${a.minutes} min)` : '') : ''}` : 'Removed from plan' };
    case 'priority': return { icon: 'flag', text: `Priority ${_fmtVal('priority', a.from)} → ${_fmtVal('priority', a.to)}` };
    case 'stream': return { icon: 'layers', text: `Moved to ${_fmtVal('stream', a.to)}` };
    case 'title': return { icon: 'pencil', text: 'Renamed', quote: a.from ? `was “${String(a.from).slice(0, 120)}”` : '' };
    case 'recurrence': return { icon: 'repeat', text: `Repeats: ${_fmtVal('recurrence', a.to)}` };
    case 'dueTime': return { icon: 'clock', text: a.to ? `Time set to ${a.to}` : 'Time removed' };
    case 'estimate': return { icon: 'timer', text: a.to ? `Estimate ${fmtEstimate(a.to)}` : 'Estimate removed' };
    case 'tags': {
      if (a.added || a.removed) return { icon: 'hash', text: [...(a.added || []).map(t => '+' + t), ...(a.removed || []).map(t => '−' + t)].join(' ') || 'Tags changed' };
      return { icon: 'hash', text: a.text || 'Tags changed' };
    }
    case 'people': {
      const nm = (id) => getPerson(id)?.name || id;
      if (a.added || a.removed) return { icon: 'users', text: [...(a.added || []).map(p => 'Linked ' + nm(p)), ...(a.removed || []).map(p => 'Unlinked ' + nm(p))].join(', ') || 'People changed' };
      return { icon: 'users', text: a.text || 'People changed' };
    }
    case 'pin': return { icon: a.pinned ? 'pin' : 'pin-off', text: a.pinned ? 'Pinned' : 'Unpinned' };
    case 'note': return { icon: 'message-square', text: a.text || 'Note added' };
    case 'subtask': return { icon: 'list-checks', text: a.text || 'Subtasks changed' };
    case 'subtask-promoted': return { icon: 'list-checks', text: `Subtask made its own task: “${String(a.text || '').slice(0, 80)}”` };
    case 'update': return { icon: 'pencil', text: a.text || (a.fields ? 'Edited ' + [].concat(a.fields).join(', ') : 'Edited') };
    case 'restored': return { icon: 'rotate-ccw', text: 'Restored from the bin' };
    case 'binned': return { icon: 'trash-2', text: 'Moved to the bin' };
    case 'undo': return { icon: 'undo-2', text: a.text || 'Undone' };
    default: return { icon: 'circle', text: a.text || String(a.type || 'Changed') };
  }
}

/* ---------- keeping the field being edited across a rebuild ---------- */
/** What is being typed in `root` (field key, caret, unsaved text), when it still shows task `id`. */
function tdCapture(root, view, id) {
  const ae = document.activeElement;
  if (view.lastId !== id || !ae || !root.contains(ae) || !ae.dataset || !ae.dataset.fk) return null;
  return { fk: ae.dataset.fk, value: 'value' in ae ? ae.value : null, s: ae.selectionStart, e: ae.selectionEnd };
}
function tdRestore(root, keep) {
  if (!keep) return;
  const el = root.querySelector(`[data-fk="${CSS.escape(keep.fk)}"]`);
  if (!el) return;
  if (keep.value !== null && 'value' in el && el.value !== keep.value && keep.fk !== 'tag-input') el.value = keep.value;
  try { el.focus({ preventScroll: true }); if (keep.s != null && el.setSelectionRange) el.setSelectionRange(keep.s, keep.e); } catch (e) { /* not focusable any more */ }
}

/* ---------- small pieces ---------- */
function tdStatusLabel(id) {
  const item = getItem(id); if (!item) return '';
  return isWontDo(item) ? "Won't do" : { todo: 'To do', doing: 'In progress', done: 'Done' }[statusOf(id)] || 'To do';
}
function tdStatusMenu(anchor, id) {
  const item = getItem(id); if (!item) return;
  const status = statusOf(id), wont = isWontDo(item), rec = effRecurrence(item) !== 'none';
  openMenu(anchor, [
    { label: 'To do', icon: 'circle', checked: status === 'todo', run: () => setStatus(id, 'todo') },
    { label: 'In progress', icon: 'circle-dot', kbd: 'S', checked: status === 'doing', run: () => setStatus(id, 'doing') },
    { label: rec ? 'Done (repeat)' : 'Done', icon: 'circle-check', kbd: 'X', checked: status === 'done' && !wont, run: () => toggleDone(id) },
    { label: rec ? 'Skip this occurrence' : "Won't do", icon: 'circle-x', checked: wont, run: () => markWontDo(id) },
  ], { align: 'start', width: 210 });
}
/** The priority-coloured complete checkbox. */
function tdCheckbox(id) {
  const item = getItem(id);
  const status = statusOf(id), wont = isWontDo(item), prio = effPriority(item);
  const cb = document.createElement('button'); cb.type = 'button';
  cb.className = 'checkbox ' + prio + (status === 'doing' ? ' doing' : '') + (status === 'done' ? (wont ? ' wontdo' : ' done') : '');
  cb.setAttribute('role', 'checkbox'); cb.setAttribute('aria-checked', status === 'done' ? 'true' : status === 'doing' ? 'mixed' : 'false');
  cb.setAttribute('aria-label', status === 'done' ? 'Reopen task' : 'Complete task');
  cb.setAttribute('data-tip', status === 'done' ? 'Reopen' : 'Mark done'); cb.setAttribute('data-kbd', 'X');
  if (wont) cb.innerHTML = icon('minus', 'i-xs');
  cb.onclick = () => toggleDone(id);
  return cb;
}
function tdStatusPill(id) {
  const item = getItem(id);
  const wont = isWontDo(item), status = statusOf(id);
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'dp-status st-' + (wont ? 'wontdo' : status);
  b.innerHTML = `<span>${esc(tdStatusLabel(id))}</span>` + icon('chevron-down', 'i-xs');
  b.setAttribute('aria-label', 'Status: ' + tdStatusLabel(id));
  b.onclick = (e) => tdStatusMenu(e.currentTarget, id);
  return b;
}
/** The stream as a small coloured button (opens the stream menu). */
function tdStreamCrumb(id, cls) {
  const stream = effStream(getItem(id));
  const crumb = document.createElement('button'); crumb.type = 'button'; crumb.className = (cls || 'dp-crumb') + ' stream';
  crumb.style.setProperty('--c', safeColor(STREAMS[stream]?.color, '#868a94'));
  crumb.innerHTML = `${streamMarkHtml(stream, { inherit: true })}<span data-cz-label>${esc(STREAMS[stream]?.label || stream || 'No stream')}</span>` + icon('chevron-down', 'i-xs');
  if (STREAMS[stream]) czMark(crumb, 'stream', stream);   // right-click: the stream's menu (28-customise.js)
  crumb.title = 'Change stream';
  crumb.onclick = (e) => openStreamMenu(e.currentTarget, id);
  return crumb;
}
/** The title as an auto-growing textarea: Enter saves, Esc puts it back. */
function tdTitleInput(id, cls) {
  const item = getItem(id);
  const titleIn = document.createElement('textarea');
  titleIn.className = (cls || 'dp-title-input') + (statusOf(id) === 'done' ? ' done' : '');
  titleIn.value = effTitle(item); titleIn.rows = 1; titleIn.dataset.fk = 'title';
  titleIn.setAttribute('aria-label', 'Title'); titleIn.spellcheck = true;
  const fit = () => { titleIn.style.height = 'auto'; titleIn.style.height = titleIn.scrollHeight + 'px'; };
  const saveTitle = () => {
    const cur = getItem(id); if (!cur) return;
    const v = titleIn.value.replace(/\s*\n\s*/g, ' ').trim();
    if (!v) { titleIn.value = effTitle(cur); fit(); return; }
    if (v !== effTitle(cur)) { setOverride(id, 'title', v); render(); }
  };
  titleIn.oninput = fit;
  titleIn.onkeydown = (e) => {
    if (e.key === 'Enter' && !(e.ctrlKey || e.metaKey)) { e.preventDefault(); titleIn.blur(); }
    if (e.key === 'Escape') { e.stopPropagation(); titleIn.value = effTitle(getItem(id) || item); titleIn.blur(); }
  };
  titleIn.onblur = saveTitle;
  requestAnimationFrame(fit);
  return titleIn;
}

/* ---------- properties ---------- */
/** The property list. o.card: also Status and Stream rows (the side panel has them in its header). */
function tdProps(id, o) {
  o = o || {};
  const item = getItem(id);
  const status = statusOf(id), prio = effPriority(item);
  const props = document.createElement('dl'); props.className = 'kv dp-props';
  const prop = (label, ic, el, key) => {
    const dt = document.createElement('dt'); dt.innerHTML = icon(ic, 'i-sm') + `<span>${esc(label)}</span>`;
    const dd = document.createElement('dd'); dd.appendChild(el);
    if (key) { dt.dataset.prop = key; dd.dataset.prop = key; }
    props.append(dt, dd);
  };
  const chipBtn = (html, cls, onClick, tip) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'prop-btn' + (cls ? ' ' + cls : '');
    b.innerHTML = html; if (tip) b.title = tip; b.onclick = (e) => onClick(e.currentTarget); return b;
  };
  if (o.card) {
    const wont = isWontDo(item);
    prop('Status', 'circle-dot', chipBtn(`<span class="st-dot st-${escAttr(wont ? 'wontdo' : status)}"></span><span>${esc(tdStatusLabel(id))}</span>`, 'dp-st', (a) => tdStatusMenu(a, id), 'Status (S: in progress, X: done)'), 'status');
  }
  // Due
  {
    const wrap = document.createElement('div'); wrap.className = 'prop-row';
    const due = effDate(item);
    const lbl = due ? `${esc(_dayLabel(due, { weekday: 'short', day: 'numeric', month: 'short', year: Math.abs(daysUntil(due)) > 300 ? 'numeric' : undefined }))}${item.dueTime ? ' · ' + esc(item.dueTime) : ''}<span class="rel ${_rowDueClass(item)}">${esc(_relDays(due))}</span>` : '<span class="ph">Add a due date</span>';
    const b = chipBtn(lbl, 'dp-due', (a) => openDueDatePopover(a, { value: due, time: item.dueTime, allowTime: true, allowClear: true, onPick: (d, t) => { setDateWithReason(id, d, null); if (d) setOverride(id, 'dueTime', t || null); render(); } }), 'Due date and time (D)');
    wrap.appendChild(b);
    if (due) {
      const r = document.createElement('button'); r.type = 'button'; r.className = 'btn-icon btn-sm dp-resch'; r.innerHTML = icon('history');
      r.setAttribute('aria-label', 'Reschedule with a reason'); r.setAttribute('data-tip', 'Reschedule with a reason');
      r.onclick = () => _openRescheduleDialog(id);
      wrap.appendChild(r);
    }
    prop('Due', 'calendar', wrap, 'due');
  }
  // Planned
  if (status !== 'done') {
    const pl = item.plannedFor || null;
    const slotTxt = typeof planSlotLabel === 'function' ? planSlotLabel(item) : '';   // a planned time slot (20-task-plan.js)
    const html = (pl ? (daysUntil(pl) <= 0 ? `${icon('sun', 'i-sm')}<span>Today</span>${daysUntil(pl) < 0 ? `<span class="rel">since ${esc(dueLabel(pl))}</span>` : ''}` : esc(_dayLabel(pl, { weekday: 'short', day: 'numeric', month: 'short' }))) : '<span class="ph">Not planned</span>')
      + (slotTxt ? `<span class="rel dp-plan-slot">${esc(slotTxt)}</span>` : '');
    const wrap = document.createElement('div'); wrap.className = 'prop-row';
    wrap.appendChild(chipBtn(html, 'dp-plan' + (pl && daysUntil(pl) <= 0 ? ' on' : ''), (a) => openDueDatePopover(a, { value: pl, allowClear: true, title: 'Plan to work on it', onPick: (d) => setPlanned(id, d) }), 'The day you plan to work on it (not the deadline)'));
    if (!(pl && daysUntil(pl) <= 0)) {
      const t = document.createElement('button'); t.type = 'button'; t.className = 'btn btn-ghost btn-sm'; t.innerHTML = icon('sun', 'i-sm') + '<span>Today</span>';
      t.onclick = () => setPlanned(id, todayStr());
      wrap.appendChild(t);
    }
    prop('Planned', 'sun', wrap, 'planned');
  }
  // Priority
  {
    const lbl = { p1: 'High', p2: 'Medium', p3: 'Low', p0: 'No priority' }[prio] || 'No priority';
    const b = chipBtn(icon('flag', 'i-sm') + `<span${prio === 'p0' ? ' class="ph"' : ''}>${esc(lbl)}</span>`, 'dp-prio prio-' + prio, (a) => openPriorityMenu(a, id), 'Priority (1-4 on the keyboard)');
    prop('Priority', 'flag', b, 'priority');
  }
  if (o.card) {
    const s = effStream(item);
    const sb = chipBtn(`<span class="stream" style="--c:${escAttr(safeColor(STREAMS[s]?.color, '#868a94'))}">${streamMarkHtml(s, { inherit: true })}</span><span data-cz-label>${esc(STREAMS[s]?.label || s || 'No stream')}</span>`, 'dp-stream', (a) => openStreamMenu(a, id), 'Change stream');
    if (STREAMS[s]) czMark(sb, 'stream', s);
    prop('Stream', 'layers', sb, 'stream');
  }
  // Repeat
  {
    const sel = document.createElement('select'); sel.className = 'control control-sm'; sel.setAttribute('aria-label', 'Repeat');
    const rec = effRecurrence(item);
    for (const [k, l] of RECURRENCE_OPTIONS) { const op = document.createElement('option'); op.value = k; op.textContent = l; if (k === rec) op.selected = true; sel.appendChild(op); }
    if (rec === 'none') sel.classList.add('dp-rec-none');
    sel.onchange = () => { setOverride(id, 'recurrence', sel.value); if (sel.value !== 'none' && !effDate(getItem(id))) setDateWithReason(id, todayStr(), null); render(); };
    prop('Repeats', 'repeat', sel, 'repeat');
  }
  // Tags
  prop('Tags', 'hash', _buildTagEditor(item), 'tags');
  // People
  prop('People', 'users', tdPeople(id), 'people');
  // Estimate
  {
    const inp = document.createElement('input'); inp.className = 'control control-sm dp-est'; inp.dataset.fk = 'estimate';
    inp.placeholder = 'e.g. 45m or 2h'; inp.value = item.estimate ? fmtEstimate(item.estimate) : '';
    inp.setAttribute('aria-label', 'Estimate');
    const commit = () => {
      const cur = getItem(id); if (!cur) return;
      const v = inp.value.trim().toLowerCase();
      if (!v) { if (cur.estimate) { setOverride(id, 'estimate', null); render(); } return; }
      let mins = 0; const h = /(\d+(?:\.\d+)?)\s*h/.exec(v), m = /(\d+)\s*m/.exec(v);
      if (h) mins += Math.round(Number(h[1]) * 60);
      if (m) mins += Number(m[1]);
      if (!h && !m && /^\d+$/.test(v)) mins = Number(v);
      if (mins > 0 && mins !== cur.estimate) { setOverride(id, 'estimate', mins); render(); } else inp.value = cur.estimate ? fmtEstimate(cur.estimate) : '';
    };
    inp.onblur = commit;
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } };
    prop('Estimate', 'timer', inp, 'estimate');
  }
  return props;
}
/** People linked to the task: chips (open, create profile, unlink) + Add. */
function tdPeople(id) {
  const item = getItem(id);
  const wrap = document.createElement('div'); wrap.className = 'dp-people';
  const explicit = item.people || [];
  for (const pid of effPeople(item)) {
    const p = getPerson(pid);
    if (p && p.self) continue;
    const chip = document.createElement('span'); chip.className = 'person-chip' + (p ? '' : ' unknown') + (explicit.includes(pid) ? '' : ' inferred');
    const name = p ? p.name : pid;
    const open = document.createElement('button'); open.type = 'button'; open.className = 'pc-open';
    open.innerHTML = `${p ? avatarHtmlInitials(p, 16) : `<span class="avatar avatar-16" style="--c:var(--sw-slate)">${esc(avatarInitials(name))}</span>`}<span data-cz-label>${esc(name)}</span>`;
    if (p) czMark(chip, 'person', pid);   // right-click: the person's menu (28-customise.js)
    open.title = p ? (explicit.includes(pid) ? 'Open ' + name : `Linked through a tag · open ${name}`) : 'No profile yet';
    open.onclick = () => { if (p) openPerson(pid, { from: open }); };   // inside the card: on top, with Back
    chip.appendChild(open);
    if (!p) {
      const mk = document.createElement('button'); mk.type = 'button'; mk.className = 'pc-make'; mk.textContent = 'Create';
      mk.title = `Create a profile for ${pid}`;
      mk.onclick = () => {
        const nice = pid.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, c => c.toUpperCase());
        state.people.push({ id: pid, name: nice, email: '', role: '', aliases: [], color: '#475569', createdAt: Date.now() });
        saveData(); render();
        toast(`Created ${nice}`, { kind: 'ok', icon: 'user-plus', action: { label: 'Open', run: () => openPerson(pid) } });
      };
      chip.appendChild(mk);
    }
    if (explicit.includes(pid)) {
      const x = document.createElement('button'); x.type = 'button'; x.className = 'pc-x'; x.innerHTML = icon('x', 'i-xs');
      x.setAttribute('aria-label', 'Unlink ' + name);
      x.onclick = () => { removePersonFromTask(id, pid); };   // remembered, so a tag cannot re-link them
      chip.appendChild(x);
    }
    wrap.appendChild(chip);
  }
  const add = document.createElement('button'); add.type = 'button'; add.className = 'prop-btn add';
  add.innerHTML = icon('user-plus', 'i-sm') + '<span>Add</span>';
  add.onclick = (e) => openPeoplePicker(e.currentTarget, id);
  wrap.appendChild(add);
  return wrap;
}

/* ---------- sections ---------- */
/** Description: rendered markdown; click (or Enter) to edit; saved when you click away. */
function tdDescSection(id, view, rerender, keep) {
  const item = getItem(id);
  const desc = document.createElement('section'); desc.className = 'dp-section dp-desc-sec';
  desc.innerHTML = `<div class="dp-sh"><h4>Description</h4></div>`;
  const detail = effDetail(item);
  if (view.editingDesc === id) {
    const ta = document.createElement('textarea'); ta.className = 'dp-desc-edit'; ta.dataset.fk = 'desc';
    ta.value = detail; ta.placeholder = 'Notes, links, context. Markdown works: **bold**, - lists, [links](https://…)';
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(window.innerHeight * 0.6, ta.scrollHeight + 2) + 'px'; };
    ta.oninput = grow;
    const done = (save) => {
      view.editingDesc = null;
      if (save && ta.value !== effDetail(getItem(id) || item)) setOverride(id, 'detail', ta.value);
      rerender();
    };
    ta.onkeydown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); done(true); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); done(true); }
    };
    ta.onblur = () => { if (view.editingDesc === id) done(true); };
    desc.appendChild(ta);
    const hint = document.createElement('div'); hint.className = 'field-hint'; hint.textContent = 'Saved when you click away · Ctrl+Enter or Esc to finish';
    desc.appendChild(hint);
    requestAnimationFrame(() => { grow(); if (!keep && ta.isConnected) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } });
  } else {
    const md = document.createElement('div'); md.className = 'md dp-desc' + (detail.trim() ? '' : ' empty');
    md.tabIndex = 0; md.setAttribute('role', 'button'); md.setAttribute('aria-label', 'Edit description');
    md.innerHTML = detail.trim() ? renderMarkdown(detail) : '<span class="ph">Add a description…</span>';
    md.onclick = (e) => { if (e.target.closest('a')) return; view.editingDesc = id; rerender(); };
    md.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); view.editingDesc = id; rerender(); } };
    desc.appendChild(md);
  }
  return desc;
}
/** Related: files & links (63-resources.js), meetings, emails, people, tasks, suggestions (66-autolink.js). */
function tdRelatedSection(id) {
  if (typeof autolinkRelatedSection === 'function') return autolinkRelatedSection(id);
  if (typeof resBlock === 'function') return resBlock({ type: 'task', id });
  return null;
}
function tdNotesSection(id) {
  const notes = getNotes(id);
  const ns = document.createElement('section'); ns.className = 'dp-section dp-notes';
  ns.innerHTML = `<div class="dp-sh"><h4>Notes</h4>${notes.length ? `<span class="count">${notes.length}</span>` : ''}</div>`;
  const comp = document.createElement('div'); comp.className = 'note-compose';
  const nta = document.createElement('textarea'); nta.placeholder = 'Add a note: progress, a decision, a blocker…'; nta.rows = 1; nta.dataset.fk = 'note-new';
  nta.setAttribute('aria-label', 'New note');
  nta.oninput = () => { nta.style.height = 'auto'; nta.style.height = Math.min(240, nta.scrollHeight) + 'px'; comp.classList.toggle('has-text', !!nta.value.trim()); };
  const nadd = document.createElement('button'); nadd.type = 'button'; nadd.className = 'btn btn-primary btn-sm'; nadd.textContent = 'Add note';
  const submit = () => { const v = nta.value; if (!v.trim()) return; nta.value = ''; _keepFocus('note-new'); addNote(id, v); };
  nadd.onclick = submit;
  nta.onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); submit(); } };
  comp.append(nta, nadd);
  ns.appendChild(comp);
  for (const n of notes) {
    const bub = document.createElement('div'); bub.className = 'note-bubble';
    const txt = document.createElement('div'); txt.className = 'note-text';
    txt.textContent = n.text; txt.contentEditable = 'true'; txt.spellcheck = true; txt.dataset.fk = 'note:' + n.id;
    txt.oninput = () => updateNote(id, n.id, txt.textContent);
    txt.onblur = () => {
      if (_noteSaveTimers[n.id]) { clearTimeout(_noteSaveTimers[n.id]); delete _noteSaveTimers[n.id]; }
      const arr = state.notes[id]; const note = arr && arr.find(x => x.id === n.id);
      if (note && note.text !== txt.textContent) { note.text = txt.textContent; saveData(); }
    };
    const meta = document.createElement('div'); meta.className = 'note-meta'; meta.textContent = formatTimestamp(n.ts);
    const del = document.createElement('button'); del.type = 'button'; del.className = 'note-del btn-icon btn-sm'; del.innerHTML = icon('trash-2');
    del.setAttribute('aria-label', 'Delete note');
    del.onclick = () => { deleteNote(id, n.id); toast('Note moved to the bin', { icon: 'trash-2', action: { label: 'Undo', run: () => undo() } }); };
    bub.append(del, txt, meta);
    ns.appendChild(bub);
  }
  return ns;
}
function tdActivitySection(id, view, rerender) {
  const acts = [...(state.taskActivity[id] || [])].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const as = document.createElement('section'); as.className = 'dp-section dp-activity';
  as.innerHTML = `<div class="dp-sh"><h4>Activity</h4>${acts.length ? `<span class="count">${acts.length}</span>` : ''}</div>`;
  const shown = view.showAll ? acts : acts.slice(0, 6);
  const ol = document.createElement('ol'); ol.className = 'act-list';
  for (const a of shown) {
    const d = describeActivity(a);
    const li = document.createElement('li');
    const src = _ACT_SOURCE[a.source] ? (a.client && a.source === 'mcp' ? a.client : _ACT_SOURCE[a.source]) : '';
    li.innerHTML = `<span class="act-ic">${icon(d.icon, 'i-sm')}</span><div class="act-b"><span class="act-t">${esc(d.text)}</span>`
      + (d.quote ? `<span class="act-q">${esc(d.quote)}</span>` : '')
      + `<span class="act-m">${esc(a.ts ? formatTimestamp(a.ts) : '')}${src ? ' · ' + esc(src) : ''}</span></div>`;
    ol.appendChild(li);
  }
  if (!acts.length) {
    const li = document.createElement('li'); li.className = 'act-empty';
    li.textContent = 'No changes recorded yet.';
    ol.appendChild(li);
  }
  as.appendChild(ol);
  if (acts.length > 6) {
    const more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-ghost btn-sm';
    more.textContent = view.showAll ? 'Show less' : `Show all ${acts.length}`;
    more.onclick = () => { view.showAll = !view.showAll; rerender(); };
    as.appendChild(more);
  }
  return as;
}
/** Ask Claude about this task (only when AI is connected). */
function tdChatSection(id) {
  const chat = getTaskChat(id);
  const cs = document.createElement('details'); cs.className = 'dp-section dp-chat ai-only';
  if (chat.length) cs.open = true;
  cs.innerHTML = `<summary><span class="dp-sh-in">${icon('sparkles', 'i-sm')}<h4>Ask Claude about this task</h4></span>${icon('chevron-down', 'i-xs')}</summary>`;
  const chatArea = document.createElement('div'); chatArea.className = 'chat-area';
  if (!chat.length) { const h = document.createElement('div'); h.className = 'chat-hint'; h.textContent = 'Break it down, draft a reply, or suggest next steps.'; chatArea.appendChild(h); }
  for (const msg of chat) { const m = document.createElement('div'); m.className = 'chat-msg ' + msg.role; m.textContent = msg.text; chatArea.appendChild(m); }
  cs.appendChild(chatArea);
  const crow = document.createElement('div'); crow.className = 'chat-input-row';
  const cta = document.createElement('textarea'); cta.placeholder = 'Ask… (Enter to send)'; cta.rows = 1; cta.dataset.fk = 'chat';
  cta.setAttribute('aria-label', 'Ask Claude about this task');
  const send = () => { const v = cta.value.trim(); if (!v) return; cta.value = ''; _keepFocus('chat'); sendTaskChat(id, v); };
  cta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const sbtn = document.createElement('button'); sbtn.type = 'button'; sbtn.className = 'btn btn-secondary btn-sm'; sbtn.textContent = 'Send'; sbtn.onclick = send;
  crow.append(cta, sbtn);
  if (chat.length) {
    const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'btn btn-ghost btn-sm'; clr.textContent = 'Clear';
    clr.onclick = async () => { if (await confirmDialog({ title: 'Clear this chat?', confirmLabel: 'Clear', danger: true })) { delete state.taskChat[id]; saveData(); render(); } };
    crow.appendChild(clr);
  }
  cs.appendChild(crow);
  if (chat.length) setTimeout(() => { chatArea.scrollTop = chatArea.scrollHeight; }, 0);
  return cs;
}
/** When it was created / last changed / closed, as {created, updated, closed} timestamps. */
function tdTimes(id) {
  const item = getItem(id);
  const acts = state.taskActivity[id] || [];
  const created = item.createdAt || (acts.find(a => a.type === 'created') || {}).ts || null;
  const updated = acts.reduce((m, a) => Math.max(m, a.ts || 0), 0) || item.updatedAt || null;
  const closed = statusOf(id) === 'done' ? closedAt(item) : null;
  return { created, updated: updated && updated !== created ? updated : null, closed, wont: isWontDo(item) };
}
function tdFootText(id) {
  const t = tdTimes(id);
  return (t.created ? `Created ${formatTimestamp(t.created)}` : '') + (t.closed ? ` · ${t.wont ? 'Closed' : 'Completed'} ${formatTimestamp(t.closed)}` : '');
}

/** What the scene band shows (null: off); the band is rebuilt only when this changes. */
function tdMiniHeroKey(id) {
  if (typeof itemHeroOn === 'function' && !itemHeroOn()) return null;
  if (typeof animSceneHtml !== 'function' || typeof animForTask !== 'function') return null;
  const item = getItem(id); if (!item) return null;
  const s = effStream(item);
  return [id, (animForTask(item) || {}).type, STREAMS[s] && STREAMS[s].color, effTitle(item)].join('|');
}
/** The side panel's small scene band (the centre card has the big one): click the scene to change it. */
function tdMiniHero(id) {
  if (typeof itemHeroOn === 'function' && !itemHeroOn()) return null;
  if (typeof animSceneHtml !== 'function' || typeof animForTask !== 'function') return null;
  const item = getItem(id);
  const a = animForTask(item) || {};
  const s = effStream(item);
  const color = safeColor(STREAMS[s] && STREAMS[s].color, 'var(--accent)');
  const band = document.createElement('div'); band.className = 'dp-hero';
  band.style.setProperty('--tc-c', color);
  band.style.setProperty('--scene-tint', color);   // 76-scenes.css
  band.dataset.sceneKey = 'task:' + id;            // 71-anim-continuity.js
  const b = document.createElement('button'); b.type = 'button'; b.className = 'dp-scene';
  const label = typeof animScene === 'function' ? animScene(a.type).label : (a.type || 'scene');
  b.setAttribute('aria-label', `Animation: ${label}. Change it`);
  b.setAttribute('data-tip', `${label}${a.why ? ' · ' + a.why : ''} · click to change`);
  b.innerHTML = animSceneHtml(a.type || 'task', { size: 'lg', cls: 'is-tinted' });
  if (typeof animPickType === 'function') b.onclick = (e) => { e.stopPropagation(); animPickType(b, { kind: 'task', id, title: effTitle(item) }, a.type); };
  else b.disabled = true;
  band.appendChild(b);
  if (typeof animActivate === 'function') requestAnimationFrame(() => { if (band.isConnected) animActivate(band); });
  return band;
}

/* ---------- the side panel ---------- */
function renderDetail() {
  // The centre card follows every render too (61-task-card.js): live updates, undo, edits elsewhere.
  if (typeof tcRefresh === 'function') { try { tcRefresh(); } catch (e) { console.error('[task card] refresh failed', e); } }
  const dp = document.getElementById('detail-pane');
  const view = _tdViews.panel;
  const id = state.selectedTaskId;
  if (!id && _dpEventId) { _tdRenderEventPanel(dp, view); return; }
  if (!id) { dp.innerHTML = ''; view.lastId = null; _restoreFocus(); return; }
  const item = getItem(id);
  if (!item) { state.selectedTaskId = null; dp.innerHTML = ''; view.lastId = null; document.getElementById('content').classList.toggle('detail-open', detailPaneOpen()); return; }

  // Keep what is being typed (field, caret, unsaved text) and the scroll position.
  const sameTask = view.lastId === id;
  const keep = tdCapture(dp, view, id);
  const scroll = sameTask ? dp.scrollTop : 0;
  if (!sameTask) {
    view.editingDesc = null; view.showAll = false;
    // Another task in a panel that is already open: a plain content swap (no entrance motion);
    // the panel's own slide-in (motion.css) plays only when it opens.
    if (view.lastId === null) {
      dp.classList.add('dp-enter');
      clearTimeout(renderDetail._enterT);
      renderDetail._enterT = setTimeout(() => dp.classList.remove('dp-enter'), 260);
    } else { dp.classList.remove('dp-enter'); }
  }
  view.lastId = id;
  const rerender = () => render();

  const status = statusOf(id);
  // The scene band stays put across re-renders of the same task (its loop does not restart).
  const heroKey = tdMiniHeroKey(id);
  let hero = heroKey && view.heroKey === heroKey && view.heroEl && view.heroEl.parentNode === dp ? view.heroEl : null;
  for (const n of [...dp.childNodes]) if (n !== hero) n.remove();
  if (!hero && heroKey) { hero = tdMiniHero(id); if (hero) dp.appendChild(hero); }
  view.heroEl = hero; view.heroKey = hero ? heroKey : null;
  dp.setAttribute('aria-label', 'Task: ' + effTitle(item));

  /* --- header --- */
  const hdr = document.createElement('div'); hdr.className = 'dp-header';
  hdr.append(tdCheckbox(id), tdStatusPill(id));
  const sp = document.createElement('span'); sp.className = 'grow'; hdr.appendChild(sp);
  const hb = (ic, label, run, cls, kbd) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-icon' + (cls ? ' ' + cls : '');
    b.innerHTML = icon(ic); b.setAttribute('aria-label', label); b.setAttribute('data-tip', label); if (kbd) b.setAttribute('data-kbd', kbd);
    b.onclick = (e) => run(e.currentTarget); hdr.appendChild(b); return b;
  };
  const plannedToday = item.plannedFor && item.plannedFor <= todayStr();
  if (status !== 'done') hb('sun', plannedToday ? 'Remove from Today' : 'Plan for today', () => togglePlannedToday(id), plannedToday ? 'on' : '', 'T');
  hb(isPinned(id) ? 'pin-off' : 'pin', isPinned(id) ? 'Unpin' : 'Pin to top', () => togglePin(id), isPinned(id) ? 'on' : '');
  // One click back to the centre card (and the card has "Open in side panel").
  // "Open in the centre" also switches the next opens back to the card for this session (61-task-card.js).
  if (typeof openTask === 'function') hb('scan', 'Open in the centre', () => { if (typeof switchItemMode === 'function') switchItemMode('card'); openTask(id, { mode: 'card', from: dp }); }, 'dp-to-card');
  hb('ellipsis', 'More', (a) => openTaskMenu(a, id), '', '.');
  hb('x', 'Close', () => closeDetail(), '', 'Esc');
  dp.insertBefore(hdr, hero);   // header, then the scene band, then the body

  const body = document.createElement('div'); body.className = 'dp-body';
  body.append(tdStreamCrumb(id), tdTitleInput(id), tdProps(id));
  body.appendChild(tdDescSection(id, view, rerender, keep));
  body.appendChild(_buildSubtaskSection(item, getSubtasks(id)));
  const rel = tdRelatedSection(id); if (rel) body.appendChild(rel);
  body.appendChild(tdNotesSection(id));
  body.appendChild(tdActivitySection(id, view, () => renderDetail()));
  body.appendChild(tdChatSection(id));
  const foot = document.createElement('div'); foot.className = 'dp-foot';
  foot.textContent = tdFootText(id);
  body.appendChild(foot);
  dp.appendChild(body);

  if (scroll) dp.scrollTop = scroll;
  tdRestore(dp, keep);
  _restoreFocus();
}

/** A calendar event in the side panel: the event panel's parts (43-calendar-panel.js) under the panel's own header. */
function _tdRenderEventPanel(dp, view) {
  const ev = typeof calEventById === 'function' ? calEventById(_dpEventId) : null;
  if (!ev) { _dpEventId = null; dp.innerHTML = ''; view.lastId = null; document.getElementById('content').classList.toggle('detail-open', detailPaneOpen()); return; }
  const key = 'ev:' + ev.id;
  const same = view.lastId === key;
  const keep = tdCapture(dp, view, key);
  const scroll = same ? dp.scrollTop : 0;
  if (!same && view.lastId !== null) dp.classList.remove('dp-enter');   // a swap, not an entrance
  view.lastId = key; view.heroEl = null; view.heroKey = null;
  dp.innerHTML = '';
  dp.setAttribute('aria-label', 'Event: ' + String(ev.summary || ''));
  const p = calEventParts(ev);
  const hdr = document.createElement('div'); hdr.className = 'dp-header dp-ev-h';
  const lbl = document.createElement('span'); lbl.className = 'dp-ev-kind';
  lbl.innerHTML = `${icon('calendar', 'i-sm')}<span>Event</span>`;
  hdr.appendChild(lbl);
  const sp = document.createElement('span'); sp.className = 'grow'; hdr.appendChild(sp);
  const star = calEventStar(ev); star.classList.remove('btn', 'btn-ghost'); hdr.appendChild(star);
  const hb = (ic, label, run, cls, kbd) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-icon' + (cls ? ' ' + cls : '');
    b.innerHTML = icon(ic); b.setAttribute('aria-label', label); b.setAttribute('data-tip', label); if (kbd) b.setAttribute('data-kbd', kbd);
    b.onclick = (e) => run(e.currentTarget); hdr.appendChild(b); return b;
  };
  if (typeof openEvent === 'function') hb('scan', 'Open in the centre', () => { if (typeof switchItemMode === 'function') switchItemMode('card'); openEvent(ev.id, { mode: 'card', from: dp }); }, 'dp-to-card');
  hb('x', 'Close', () => closeDetail(), '', 'Esc');
  dp.appendChild(hdr);
  const body = document.createElement('div'); body.className = 'dp-body ev-panel dp-ev';
  body.appendChild(p.head);
  if (typeof animPanelHeader === 'function') animPanelHeader(p.head, ev);   // the event's scene (78-brief-hooks.js)
  for (const n of [p.actions, p.facts, ...p.attendees, ...p.tasks, p.notes, p.desc, p.organiser]) if (n) body.appendChild(n);
  // Esc in the notes leaves the notes (the next Esc closes the panel).
  p.notesInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); p.notesInput.blur(); } });
  dp.appendChild(body);
  if (scroll) dp.scrollTop = scroll;
  tdRestore(dp, keep);
}

function _openRescheduleDialog(id) {
  const item = getItem(id); if (!item) return;
  let dateIn, reasonIn;
  openDialog({
    title: 'Reschedule', width: 420, resizeKey: 'reschedule',
    body: (el) => {
      el.innerHTML = '';
      const f1 = document.createElement('label'); f1.className = 'field';
      f1.innerHTML = '<span class="field-label">New due date</span>';
      dateIn = document.createElement('input'); dateIn.type = 'date'; dateIn.className = 'control'; dateIn.value = effDate(item) || '';
      f1.appendChild(dateIn);
      const f2 = document.createElement('label'); f2.className = 'field';
      f2.innerHTML = '<span class="field-label">Why? (kept in the history)</span>';
      reasonIn = document.createElement('textarea'); reasonIn.className = 'control'; reasonIn.rows = 2; reasonIn.placeholder = 'e.g. waiting for feedback'; reasonIn.setAttribute('autofocus', '');
      f2.appendChild(reasonIn);
      el.append(f1, f2);
    },
    actions: [{ label: 'Cancel' }, { label: 'Reschedule', primary: true, run: () => { setDateWithReason(id, dateIn.value || null, reasonIn.value.trim()); } }],
  });
}

/* ---------- tags editor with autocomplete ---------- */
function _allTagCounts() {
  // Tags: the canonical list (registry + used, archived left out): 26-tags-section.js
  if (typeof tagPickerOptions === 'function') { const c = {}; for (const o of tagPickerOptions('', [])) c[o.tag] = o.count || o.total || 0; return c; }
  const c = {};
  for (const it of getAllItems()) for (const t of effTags(it)) c[t] = (c[t] || 0) + 1;
  return c;
}
function _buildTagEditor(item) {
  const id = item.id;
  const wrap = document.createElement('div'); wrap.className = 'tags-input';
  for (const t of effTags(item)) {
    const c = document.createElement('span'); c.className = 'chip chip-lg';
    const lbl = document.createElement('button'); lbl.type = 'button'; lbl.className = 'tag-open'; lbl.title = 'Show #' + t;
    lbl.innerHTML = `<span data-cz-label>${esc(t)}</span>`;
    lbl.onclick = () => { if (typeof tcClose === 'function') tcClose({ instant: true }); setView('tag:' + t); };
    const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.innerHTML = icon('x', 'i-xs'); x.setAttribute('aria-label', 'Remove tag ' + t);
    x.onclick = () => { setOverride(id, 'tags', effTags(getItem(id) || item).filter(tt => tt !== t)); render(); };
    c.append(lbl, x); czTagChip(c, t); wrap.appendChild(c);
  }
  const inp = document.createElement('input'); inp.className = 'tag-in'; inp.dataset.fk = 'tag-input';
  inp.placeholder = effTags(item).length ? 'Add…' : 'Add a tag…';
  inp.setAttribute('aria-label', 'Add tag'); inp.autocomplete = 'off';
  const sug = document.createElement('div'); sug.className = 'tag-sug pop'; sug.hidden = true;
  let idx = 0, opts = [];
  const add = (raw) => {
    const v = String(raw || '').trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-');
    if (!v) return;
    if (STREAMS[v] || Object.values(STREAMS).some(s => String(s.label).toLowerCase() === v)) {
      toast(`“${v}” is a stream. Use the stream picker instead.`, { icon: 'info' });
      return;
    }
    const cur = getItem(id) || item;
    if (effTags(cur).includes(v)) { inp.value = ''; return; }
    // A brand-new tag is confirmed first (26-tags-section.js), so the list stays clean.
    if (typeof confirmNewTag === 'function' && typeof tagIsKnown === 'function' && !tagIsKnown(v)) {
      inp.value = '';
      confirmNewTag(v).then(ok => { const now = getItem(id); if (ok && now && !effTags(now).includes(tglNorm(v))) { setOverride(id, 'tags', [...effTags(now), tglNorm(v)]); render(); } });
      return;
    }
    _keepFocus('tag-input'); setOverride(id, 'tags', [...effTags(cur), v]); render();
    inp.value = '';
  };
  const paint = () => {
    const q = inp.value.trim().replace(/^#/, '').toLowerCase();
    const have = new Set(effTags(getItem(id) || item));
    const counts = _allTagCounts();
    opts = Object.entries(counts).filter(([t]) => !have.has(t) && (!q || t.includes(q))).sort((a, b) => (b[0].startsWith(q) - a[0].startsWith(q)) || b[1] - a[1]).slice(0, 7);
    const exact = q && counts[q];
    sug.innerHTML = '';
    opts.forEach(([t, n], i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pop-item' + (i === idx ? ' on' : '');
      b.innerHTML = icon('hash') + `<span class="lbl">${esc(t)}</span><span class="hint">${n}</span>`;
      b.onmousedown = (e) => { e.preventDefault(); add(t); };
      sug.appendChild(b);
    });
    if (q && !exact && !have.has(q)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pop-item new' + (opts.length === 0 ? ' on' : '');
      b.innerHTML = icon('plus') + `<span class="lbl">Create “${esc(q)}”</span><span class="hint">new tag</span>`;
      b.onmousedown = (e) => { e.preventDefault(); add(q); };
      sug.appendChild(b);
    }
    sug.hidden = !(document.activeElement === inp && sug.children.length);
  };
  inp.onfocus = () => { idx = 0; paint(); };
  inp.oninput = () => { idx = 0; paint(); };
  inp.onblur = () => setTimeout(() => { sug.hidden = true; }, 120);
  inp.onkeydown = (e) => {
    const n = sug.children.length;
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && n) { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; paint(); return; }
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (e.key === 'Tab' && !inp.value.trim()) return;
      e.preventDefault();
      const q = inp.value.trim().replace(/^#/, '').toLowerCase();
      if (!sug.hidden && opts[idx] && (e.key !== ',' )) add(opts[idx][0]);
      else add(q);
      return;
    }
    if (e.key === 'Escape') { e.stopPropagation(); inp.value = ''; inp.blur(); }
  };
  wrap.append(inp, sug);
  return wrap;
}

/* ---------- subtasks ---------- */
function _buildSubtaskSection(item, subs) {
  const id = item.id;
  const sec = document.createElement('section'); sec.className = 'dp-section dp-subs';
  const done = subs.filter(s => s.done).length;
  sec.innerHTML = `<div class="dp-sh"><h4>Subtasks</h4>${subs.length ? `<span class="count">${done}/${subs.length}</span>` : ''}</div>`
    + (subs.length ? `<div class="progress dp-subs-bar"><i style="--pct:${Math.round(done / subs.length * 100)}%"></i></div>` : '');
  const list = document.createElement('div'); list.className = 'st-list';
  subs.forEach((st, i) => {
    const row = document.createElement('div'); row.className = 'subtask' + (st.done ? ' done' : '');
    row.dataset.sid = st.id;
    const grip = document.createElement('span'); grip.className = 'st-grip'; grip.innerHTML = icon('grip-vertical'); grip.setAttribute('aria-hidden', 'true');
    row.draggable = true;
    row.ondragstart = (e) => { if (e.target.closest('input')) { e.preventDefault(); return; } e.dataTransfer.setData('application/x-dashboard-subtask', st.id); e.dataTransfer.effectAllowed = 'move'; row.classList.add('dragging'); };
    row.ondragend = () => { row.classList.remove('dragging'); list.querySelectorAll('.drop-before,.drop-after').forEach(n => n.classList.remove('drop-before', 'drop-after')); };
    row.ondragover = (e) => {
      if (!Array.from(e.dataTransfer.types || []).includes('application/x-dashboard-subtask')) return;
      e.preventDefault();
      const r = row.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2;
      row.classList.toggle('drop-after', after); row.classList.toggle('drop-before', !after);
    };
    row.ondragleave = () => row.classList.remove('drop-before', 'drop-after');
    row.ondrop = (e) => {
      const sid = e.dataTransfer.getData('application/x-dashboard-subtask');
      const after = row.classList.contains('drop-after');
      row.classList.remove('drop-before', 'drop-after');
      if (!sid || sid === st.id) return;
      e.preventDefault();
      const cur = getSubtasks(id).filter(x => x.id !== sid);
      let to = cur.findIndex(x => x.id === st.id); if (to < 0) return;
      moveSubtask(id, sid, to + (after ? 1 : 0));
    };
    const c = document.createElement('button'); c.type = 'button';
    c.className = 'check check-sm' + (st.done ? ' done' : '');
    c.setAttribute('role', 'checkbox'); c.setAttribute('aria-checked', st.done ? 'true' : 'false'); c.setAttribute('aria-label', 'Done: ' + st.title);
    c.innerHTML = st.done ? icon('check') : '';
    c.onclick = () => toggleSubtask(id, st.id);
    const inp = document.createElement('input'); inp.className = 'st-text'; inp.value = st.title; inp.dataset.fk = 'st:' + st.id;
    inp.setAttribute('aria-label', 'Subtask');
    inp.onblur = () => { const v = inp.value.trim(); if (!v) { deleteSubtask(id, st.id); return; } if (v !== st.title) { updateSubtaskTitle(id, st.id, v); } };
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = inp.value.trim(); if (v && v !== st.title) updateSubtaskTitle(id, st.id, v);
        // Enter moves on to the next subtask (or the "add" box after the last one).
        const next = sec.querySelector(subs[i + 1] ? `[data-fk="${CSS.escape('st:' + subs[i + 1].id)}"]` : '[data-fk="st-new"]');
        if (next) next.focus();
      }
      if (e.key === 'Backspace' && !inp.value) { e.preventDefault(); const prev = subs[i - 1]; deleteSubtask(id, st.id); if (prev) { _keepFocus('st:' + prev.id); render(); } }
      if (e.key === 'Escape') { e.stopPropagation(); inp.value = st.title; inp.blur(); }
    };
    const more = document.createElement('button'); more.type = 'button'; more.className = 'btn-icon btn-sm st-more'; more.innerHTML = icon('ellipsis');
    more.setAttribute('aria-label', 'Subtask actions');
    more.onclick = (e) => openMenu(e.currentTarget, [
      { label: 'Make it a task', icon: 'circle-plus', run: () => { const nid = promoteSubtask(id, st.id); if (nid) toast('Subtask is now a task', { kind: 'ok', action: { label: 'Open', run: () => (typeof openTask === 'function' ? openTask(nid) : selectTask(nid)) } }); } },
      { label: 'Move up', icon: 'arrow-up', disabled: i === 0, run: () => moveSubtask(id, st.id, i - 1) },
      { label: 'Move down', icon: 'arrow-down', disabled: i === subs.length - 1, run: () => moveSubtask(id, st.id, i + 1) },
      'sep',
      { label: 'Delete', icon: 'trash-2', danger: true, run: () => deleteSubtask(id, st.id) },
    ], { align: 'end', width: 200 });
    row.append(grip, c, inp, more);
    list.appendChild(row);
  });
  sec.appendChild(list);
  const add = document.createElement('div'); add.className = 'add-subtask';
  add.innerHTML = icon('plus', 'i-sm');
  const ai = document.createElement('input'); ai.placeholder = 'Add a subtask'; ai.dataset.fk = 'st-new'; ai.setAttribute('aria-label', 'Add a subtask');
  ai.onkeydown = (e) => {
    if (e.key === 'Enter' && ai.value.trim()) { e.preventDefault(); const v = ai.value.trim(); ai.value = ''; _keepFocus('st-new'); addSubtask(id, v); }
    if (e.key === 'Escape') { e.stopPropagation(); ai.value = ''; ai.blur(); }
  };
  add.appendChild(ai);
  sec.appendChild(add);
  return sec;
}
