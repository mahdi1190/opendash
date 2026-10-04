/* ============================================================
   TASK MODEL (owner: Tasks). Status, won't do, planned-for, dates,
   recurrence, pin, notes, subtasks, clone, delete/restore, bin.

   Task fields (all optional except id/title): dueDate 'YYYY-MM-DD',
   dueTime 'HH:MM', plannedFor 'YYYY-MM-DD' (the day you mean to work on it,
   separate from the deadline), priority p0-p3, stream, tags[], people[],
   detail (markdown), subtasks[{id,title,done,ts}], recurrence
   (none|daily|weekdays|weekly|biweekly|monthly), repeatDay (month anchor),
   estimate (minutes), createdAt, createdVia, resolution ('wontdo'),
   resolvedAt.
   Status lives in state.statuses[id]: todo | doing | done. "Won't do" is
   done + resolution:'wontdo' so every "is it open?" check elsewhere (server,
   MCP, other sections) keeps working. It never enters completionLog, so wins,
   streaks and "completed this week" only count real work.
   ============================================================ */
function statusOf(id) { return state.statuses[id] || 'todo'; }

/** Last time this task was completed (completionLog), or 0. */
function lastCompletionTs(id) {
  const log = state.completionLog && state.completionLog[id];
  return log && log.length ? log[log.length - 1] : 0;
}
/** True when the task is closed as "won't do" (not completed). */
function isWontDo(idOrItem) {
  const it = typeof idOrItem === 'string' ? getItem(idOrItem) : idOrItem;
  if (!it || statusOf(it.id) !== 'done' || it.resolution !== 'wontdo') return false;
  return (it.resolvedAt || 0) >= lastCompletionTs(it.id);
}
function isOpenTask(item) { return statusOf(item.id) !== 'done'; }
/** When a closed task was closed (completion or won't do), or 0. */
function closedAt(item) {
  if (statusOf(item.id) !== 'done') return 0;
  return Math.max(lastCompletionTs(item.id), isWontDo(item) ? (item.resolvedAt || 0) : 0);
}

/* ---------- recurrence ---------- */
const RECURRENCE_OPTIONS = [
  ['none', 'Does not repeat'], ['daily', 'Every day'], ['weekdays', 'Every weekday'],
  ['weekly', 'Every week'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Every month'],
];
function recurrenceLabel(r) { const o = RECURRENCE_OPTIONS.find(x => x[0] === r); return o ? o[1] : String(r || ''); }
function _isoAddDays(iso, n) { const [y, m, d] = iso.split('-').map(Number); return fmtDate(new Date(y, m - 1, d + n)); }
function _isoAddMonths(iso, n, anchorDay) {
  const [y, m, d] = iso.split('-').map(Number);
  const first = new Date(y, m - 1 + n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(anchorDay || d, last));
  return fmtDate(first);
}
/** One step of a repeat rule. Month steps clamp to the month's last day (31 Jan -> 28 Feb -> 31 Mar). */
function recurrenceStep(iso, rec, anchorDay) {
  if (rec === 'daily') return _isoAddDays(iso, 1);
  if (rec === 'weekly') return _isoAddDays(iso, 7);
  if (rec === 'biweekly') return _isoAddDays(iso, 14);
  if (rec === 'monthly') return _isoAddMonths(iso, 1, anchorDay);
  if (rec === 'weekdays') {
    let d = _isoAddDays(iso, 1);
    for (let i = 0; i < 3 && [0, 6].includes(new Date(d + 'T00:00:00').getDay()); i++) d = _isoAddDays(d, 1);
    return d;
  }
  return iso;
}
/**
 * The next due date after completing a repeating task: step from the current
 * due date until it lands after today (a daily task done 9 days late moves to
 * tomorrow, not to another day in the past).
 */
function nextOccurrence(fromIso, rec, today, anchorDay) {
  today = today || todayStr();
  if (!rec || rec === 'none') return fromIso || null;
  let next = recurrenceStep(fromIso || today, rec, anchorDay);
  for (let i = 0; next <= today && i < 2000; i++) next = recurrenceStep(next, rec, anchorDay);
  return next;
}

/** Roll a repeating task to its next date: subtasks reset, plan cleared, history logged. */
function _rollRecurring(item, { skipped } = {}) {
  const rec = effRecurrence(item);
  const from = item.dueDate || null;
  if (rec === 'monthly' && !item.repeatDay && from) item.repeatDay = Number(from.slice(8, 10));
  const next = nextOccurrence(from, rec, todayStr(), item.repeatDay);
  item.dueDate = next;
  delete item.plannedFor;
  if (Array.isArray(item.subtasks) && item.subtasks.some(s => s.done)) item.subtasks = item.subtasks.map(s => ({ ...s, done: false }));
  state.statuses[item.id] = 'todo';
  logActivity(item.id, 'occurrence', { from, to: next, rec, skipped: !!skipped });
  return next;
}

/**
 * Change status. s: 'todo' | 'doing' | 'done'. opts: {wontDo, silent, noSave}.
 * Completing (or skipping) a repeating task rolls it to its next date instead.
 * Returns {rolledTo} when it rolled.
 */
function setStatus(id, s, opts) {
  opts = opts || {};
  const item = getItem(id); if (!item) return {};
  const prev = statusOf(id);
  const now = Date.now();
  let result = {};
  const rec = effRecurrence(item);
  if (s === 'done' && prev !== 'done' && rec && rec !== 'none') {
    if (!opts.wontDo) {
      state.completionLog[id] = state.completionLog[id] || [];
      state.completionLog[id].push(now);
    }
    result.rolledTo = _rollRecurring(item, { skipped: !!opts.wontDo });
  } else if (s === 'done') {
    const wasWont = isWontDo(item);
    if (opts.wontDo) {
      if (prev === 'done' && !wasWont && state.completionLog[id] && state.completionLog[id].length) state.completionLog[id].pop();
      item.resolution = 'wontdo'; item.resolvedAt = now;
      if (prev !== 'done' || !wasWont) logActivity(id, 'status', { from: wasWont ? 'wontdo' : prev, to: 'wontdo' });
    } else {
      if (prev !== 'done' || wasWont) {
        state.completionLog[id] = state.completionLog[id] || [];
        state.completionLog[id].push(now);
        logActivity(id, 'status', { from: wasWont ? 'wontdo' : prev, to: 'done' });
      }
      delete item.resolution; delete item.resolvedAt;
    }
    state.statuses[id] = 'done';
  } else {
    if (prev !== s) logActivity(id, 'status', { from: isWontDo(item) ? 'wontdo' : prev, to: s });
    state.statuses[id] = s;
    delete item.resolution; delete item.resolvedAt;
  }
  if (!opts.noSave) { saveData(); render(); }
  return result;
}
/** One click = done; on a closed task it reopens. Shows an Undo toast. */
function toggleDone(id, opts) {
  const item = getItem(id); if (!item) return;
  const closing = statusOf(id) !== 'done';
  const r = setStatus(id, closing ? 'done' : 'todo');
  if (closing && typeof animCelebrate === 'function') animCelebrate(item);   // 78-brief-hooks.js (Settings > Animations)
  if (opts && opts.quiet) return r;
  if (closing) {
    const msg = r.rolledTo ? `Done. Next: ${dueLabel(r.rolledTo)}` : 'Task completed';
    toast(msg, { kind: 'ok', icon: r.rolledTo ? 'repeat' : 'circle-check', action: { label: 'Undo', run: () => undo() } });
  }
  return r;
}
/** Close without doing it. A repeating task skips this occurrence instead. */
function markWontDo(id) {
  const item = getItem(id); if (!item) return;
  const r = setStatus(id, 'done', { wontDo: true });
  toast(r.rolledTo ? `Skipped. Next: ${dueLabel(r.rolledTo)}` : "Marked as won't do", { icon: r.rolledTo ? 'redo-2' : 'circle-x', action: { label: 'Undo', run: () => undo() } });
}
/** In progress on/off ("doing" lives in a menu and the S shortcut, not the checkbox). */
function toggleDoing(id) {
  if (!getItem(id)) return;
  setStatus(id, statusOf(id) === 'doing' ? 'todo' : 'doing');
}
// Kept for older callers: the checkbox no longer cycles through "doing".
function cycleStatus(id) { toggleDone(id, { quiet: true }); }

function isPinned(id) { return !!state.pinned[id]; }
function togglePin(id) {
  const wasPinned = !!state.pinned[id];
  if (state.pinned[id]) delete state.pinned[id]; else state.pinned[id] = true;
  logActivity(id, 'pin', { pinned: !wasPinned });
  saveData(); render();
}

// Post-override-collapse: read fields directly from the task entry.
function effDate(item)       { return item.dueDate || null; }
function effTitle(item)      { return item.title; }
function effStream(item)     { return item.stream; }
function effDetail(item)     { return item.detail ?? ''; }
function effPriority(item)   { return item.priority ?? 'p0'; }
function effTags(item)       { return item.tags ?? []; }
function effSubtasks(item)   { return item.subtasks ?? []; }
function effRecurrence(item) { return item.recurrence ?? 'none'; }

function logActivity(taskId, type, details) {
  if (!taskId) return;
  state.taskActivity[taskId] = state.taskActivity[taskId] || [];
  state.taskActivity[taskId].push({
    id: 'a-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
    ts: Date.now(), type, source: 'ui',
    ...(details || {})
  });
}
function setDateWithReason(id, date, reason) {
  const item = getItem(id); if (!item) return;
  const oldDate = item.dueDate || null;
  if (oldDate !== (date || null)) logActivity(id, 'date', { from: oldDate, to: date || null, reason: reason || null });
  item.dueDate = date || null;
  if (!item.dueDate) delete item.dueTime;
  saveData(); render();
}
// Fields whose changes are logged in the task history.
const _LOGGED_FIELDS = ['priority', 'stream', 'title', 'recurrence', 'estimate', 'dueTime'];
function setOverride(id, field, value) {
  const item = getItem(id); if (!item) return;
  const oldValue = item[field];
  const optional = field === 'dueTime' || field === 'estimate' || field === 'plannedFor';
  if (optional && (value === undefined || value === null || value === '')) delete item[field];
  else item[field] = value;
  // Brief + Review: remember when a subtask was ticked, so "Finish the day" can list today's.
  if (field === 'subtasks' && Array.isArray(value)) {
    const was = new Map((Array.isArray(oldValue) ? oldValue : []).map(s => [s && s.id, !!(s && s.done)]));
    item.subtasks = value.map(s => (!s || typeof s !== 'object') ? s : s.done && !was.get(s.id) ? { ...s, doneAt: Date.now() } : !s.done && s.doneAt ? (({ doneAt, ...r }) => r)(s) : s);
  }
  if (_LOGGED_FIELDS.includes(field) && oldValue !== value) {
    logActivity(id, field, { from: oldValue ?? null, to: value ?? null });
  } else if (field === 'tags' || field === 'people') {
    const a = oldValue || [], b = value || [];
    const added = b.filter(x => !a.includes(x)), removed = a.filter(x => !b.includes(x));
    if (added.length || removed.length) logActivity(id, field, { added, removed });
  }
  saveData();
}
function setDate(id, date) { setDateWithReason(id, date, null); }
/** The day you plan to work on it (separate from the deadline). null clears. */
function setPlanned(id, date) {
  const item = getItem(id); if (!item) return;
  const from = item.plannedFor || null;
  if (from === (date || null)) return;
  if (date) item.plannedFor = date; else delete item.plannedFor;
  logActivity(id, 'plan', { from, to: date || null });
  saveData(); render();
}
function togglePlannedToday(id) {
  const item = getItem(id); if (!item) return;
  const t = todayStr();
  const on = item.plannedFor && item.plannedFor <= t;
  setPlanned(id, on ? null : t);
  toast(on ? 'Removed from Today' : 'Planned for today', { icon: 'sun', action: { label: 'Undo', run: () => undo() } });
}

function getAllItems() { return state.custom.filter(i => !state.deleted[i.id]); }
function getItem(id) { return typeof id === 'string' ? state.custom.find(i => i.id === id) : undefined; }

function getNotes(taskId) { return state.notes[taskId] || []; }
const _noteSaveTimers = {};
function addNote(taskId, text) {
  const t = (text || '').trim(); if (!t) return;
  state.notes[taskId] = state.notes[taskId] || [];
  state.notes[taskId].unshift({ id: 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2,7), ts: Date.now(), text: t });
  saveData(); render();
}
function updateNote(taskId, noteId, text) {
  const arr = state.notes[taskId]; if (!arr) return;
  const n = arr.find(x => x.id === noteId); if (!n || n.text === text) return;
  n.text = text;
  if (_noteSaveTimers[noteId]) clearTimeout(_noteSaveTimers[noteId]);
  _noteSaveTimers[noteId] = setTimeout(() => { saveData(); delete _noteSaveTimers[noteId]; }, 400);
}
function deleteNote(taskId, noteId) {
  if (!state.notes[taskId]) return;
  const note = state.notes[taskId].find(x => x.id === noteId); if (!note) return;
  const parent = getItem(taskId);
  state.bin.notes.push({
    binTs: Date.now(), taskId,
    taskTitle: parent ? effTitle(parent) : '(unknown task)',
    note: { ...note }
  });
  state.notes[taskId] = state.notes[taskId].filter(x => x.id !== noteId);
  saveData(); render();
}
window.addEventListener('beforeunload', () => {
  if (Object.keys(_noteSaveTimers).length > 0) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }
});

/* ---------- subtasks ---------- */
const _newSubId = () => 'st-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
function getSubtasks(taskId) { const it = getItem(taskId); return it ? effSubtasks(it) : []; }
function addSubtask(taskId, title, atIndex) {
  const t = (title || '').trim(); if (!t) return null;
  const cur = getSubtasks(taskId).slice();
  const st = { id: _newSubId(), title: t, done: false, ts: Date.now() };
  if (typeof atIndex === 'number' && atIndex >= 0 && atIndex <= cur.length) cur.splice(atIndex, 0, st); else cur.push(st);
  setOverride(taskId, 'subtasks', cur); render();
  return st.id;
}
function updateSubtaskTitle(taskId, stId, title) {
  const cur = getSubtasks(taskId).slice();
  const i = cur.findIndex(x => x.id === stId); if (i < 0) return;
  if (cur[i].title === title) return;
  cur[i] = { ...cur[i], title }; setOverride(taskId, 'subtasks', cur);
}
function toggleSubtask(taskId, stId) {
  const cur = getSubtasks(taskId).slice();
  const i = cur.findIndex(x => x.id === stId); if (i < 0) return;
  cur[i] = { ...cur[i], done: !cur[i].done }; setOverride(taskId, 'subtasks', cur); render();
}
function deleteSubtask(taskId, stId) {
  const cur = getSubtasks(taskId).filter(x => x.id !== stId);
  setOverride(taskId, 'subtasks', cur); render();
}
/** Move a subtask to position `toIndex` (index in the list after removal). */
function moveSubtask(taskId, stId, toIndex) {
  const cur = getSubtasks(taskId).slice();
  const i = cur.findIndex(x => x.id === stId); if (i < 0) return;
  const [st] = cur.splice(i, 1);
  const to = Math.max(0, Math.min(cur.length, toIndex));
  if (to === i) return;
  cur.splice(to, 0, st);
  setOverride(taskId, 'subtasks', cur); render();
}
/** Turn a subtask into its own task (same stream, people and tags; linked back in a note). */
function promoteSubtask(taskId, stId) {
  const parent = getItem(taskId); if (!parent) return null;
  const st = getSubtasks(taskId).find(x => x.id === stId); if (!st) return null;
  const id = _newTaskId();
  state.custom.push({
    id, title: st.title, dueDate: parent.dueDate || null, priority: effPriority(parent),
    tags: [...effTags(parent)], stream: effStream(parent), detail: '', subtasks: [], recurrence: 'none',
    people: parent.people ? [...parent.people] : [], createdAt: Date.now(), createdVia: 'ui',
  });
  if (st.done) state.statuses[id] = 'done';
  logActivity(id, 'created', { text: 'From a subtask of: ' + effTitle(parent) });
  parent.subtasks = getSubtasks(taskId).filter(x => x.id !== stId);
  logActivity(taskId, 'subtask-promoted', { text: st.title, to: id });
  saveData(); render();
  return id;
}

const _newTaskId = () => 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
function cloneTask(id) {
  const item = getItem(id); if (!item) return;
  const newId = _newTaskId();
  state.custom.push({
    id: newId,
    title: effTitle(item) + ' (copy)',
    dueDate: effDate(item),
    ...(item.dueTime ? { dueTime: item.dueTime } : {}),
    priority: effPriority(item),
    tags: [...effTags(item)],
    stream: effStream(item),
    detail: effDetail(item),
    subtasks: effSubtasks(item).map(s => ({ ...s, id: _newSubId(), done: false })),
    recurrence: effRecurrence(item),
    people: item.people ? [...item.people] : [],
    createdAt: Date.now(), createdVia: 'ui',
  });
  logActivity(newId, 'created', { text: 'Duplicated' });
  saveData();
  if (typeof openTask === 'function') { openTask(newId); render(); } else selectTask(newId);   // centre card or side panel (61-task-card.js)
  toast('Task duplicated', { kind: 'ok', icon: 'copy' });
}

function deleteTask(id, opts) {
  const item = getItem(id); if (!item) return;
  const isCustom = id.startsWith('u-');
  state.bin.tasks.push({
    binTs: Date.now(), kind: isCustom ? 'custom' : 'seed', id,
    title: effTitle(item), stream: effStream(item),
    customData: isCustom ? { ...state.custom.find(x => x.id === id) } : null,
    status: state.statuses[id] || 'todo',
    notes: state.notes[id] ? state.notes[id].map(n => ({ ...n })) : [],
    pinned: !!state.pinned[id],
  });
  if (isCustom) state.custom = state.custom.filter(i => i.id !== id);
  else state.deleted[id] = true;
  delete state.statuses[id]; delete state.notes[id];
  delete state.pinned[id];
  if (state.selectedTaskId === id) state.selectedTaskId = null;
  multiSelect.ids.delete(id);
  if (opts && opts.noSave) return;
  saveData(); render();
  if (!(opts && opts.quiet)) toast('Moved to the bin', { icon: 'trash-2', action: { label: 'Undo', run: () => undo() } });
}
function restoreTask(binTs) {
  const i = state.bin.tasks.findIndex(t => t.binTs === binTs); if (i < 0) return;
  const t = state.bin.tasks[i];
  if (t.kind === 'custom') {
    let data = t.customData;
    // Backward-compat: pre-collapse bin entries kept overrides separate; bake them in on restore
    if (data && (t.taskOverride || t.dateOverride)) {
      data = { ...data };
      if (t.taskOverride) Object.assign(data, t.taskOverride);
      if (t.dateOverride) data.dueDate = t.dateOverride;
    }
    if (data && !state.custom.some(c => c.id === t.id)) state.custom.push(data);
  } else {
    delete state.deleted[t.id];
    // Backward-compat: same as above for SEED-kind entries
    const item = state.custom.find(c => c.id === t.id);
    if (item) {
      if (t.taskOverride) Object.assign(item, t.taskOverride);
      if (t.dateOverride) item.dueDate = t.dateOverride;
    }
  }
  if (t.status && t.status !== 'todo') state.statuses[t.id] = t.status;
  if (t.notes && t.notes.length) state.notes[t.id] = t.notes;
  if (t.pinned) state.pinned[t.id] = true;
  logActivity(t.id, 'restored', { text: 'Restored from the bin' });
  state.bin.tasks.splice(i, 1);
  saveData(); render();
}
function restoreNote(binTs) {
  const i = state.bin.notes.findIndex(n => n.binTs === binTs); if (i < 0) return;
  const b = state.bin.notes[i];
  state.notes[b.taskId] = state.notes[b.taskId] || [];
  if (!state.notes[b.taskId].some(n => n.id === b.note.id)) state.notes[b.taskId].unshift(b.note);
  state.bin.notes.splice(i, 1); saveData(); render();
}
/** Permanently delete one bin entry (task or note). */
function purgeBinEntry(kind, binTs) {
  const list = kind === 'note' ? state.bin.notes : state.bin.tasks;
  const i = list.findIndex(x => x.binTs === binTs); if (i < 0) return;
  list.splice(i, 1);
  saveData(); render();
}
function emptyBin() { state.bin = { tasks: [], notes: [] }; saveData(); render(); }

/** Change several tasks as ONE undo step and one render. fn(id) mutates without saving. */
function batchTasks(ids, fn) {
  for (const id of ids) { if (getItem(id)) fn(id); }
  saveData(); render();
}
