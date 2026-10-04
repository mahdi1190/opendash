/* ============================================================
   EVENT NOTES on the page (state.eventMeta). Owner: W0-B (shared time logic).
   eventMeta[eventId] = {notes, tasks:[taskId], important, origin, wrapped}:
   the dashboard's own notes on a calendar event (Google is never written
   here). The server's op is event.annotate [annotate_event]
   (server/actions/ops-calendar.mjs, same prune rule in tidyMeta).
     calMetaIsEmpty(m)            the prune rule, in one place: no notes, tasks,
                                  important, origin or wrapped -> the entry goes
     calAnnotate(evId, patch, o)  one saveData step (+ an Undo toast unless o.toast
                                  is false). patch: {notes (null clears), appendNotes,
                                  linkTasks:[id], unlinkTasks:[id], important
                                  (true|false|null = automatic), wrapped (true; false or
                                  null = not yet)}. -> true when something changed
     calIsWrapped(evId)           the meeting is wrapped up (After meetings is done with it)
   ============================================================ */
function calMetaIsEmpty(m) {
  return !m || (!m.notes && !(Array.isArray(m.tasks) && m.tasks.length) && m.important === undefined && !m.origin && !m.wrapped);
}
function calIsWrapped(evId) {
  const m = state.eventMeta && typeof state.eventMeta === 'object' ? state.eventMeta[evId] : null;
  return !!(m && m.wrapped === true);
}
function calAnnotate(evId, patch, o) {
  patch = patch || {}; o = o || {};
  if (!evId) return false;
  if (!state.eventMeta || typeof state.eventMeta !== 'object') state.eventMeta = {};
  const before = state.eventMeta[evId] ? JSON.parse(JSON.stringify(state.eventMeta[evId])) : null;
  const m = Object.assign({}, state.eventMeta[evId] || {});
  if (patch.notes !== undefined) { const v = patch.notes === null ? '' : String(patch.notes).slice(0, 4000).trim(); if (v) m.notes = v; else delete m.notes; }
  else if (patch.appendNotes) { const v = [m.notes, String(patch.appendNotes).slice(0, 2000).trim()].filter(Boolean).join('\n').slice(0, 4000); if (v) m.notes = v; }
  const tasks = Array.isArray(m.tasks) ? m.tasks.slice() : [];
  for (const id of patch.linkTasks || []) if (id && !tasks.includes(id) && getItem(id)) tasks.push(id);
  for (const id of patch.unlinkTasks || []) { const i = tasks.indexOf(id); if (i >= 0) tasks.splice(i, 1); }
  if (tasks.length) m.tasks = tasks; else delete m.tasks;
  if (patch.important !== undefined) { if (patch.important === null) delete m.important; else m.important = !!patch.important; }
  if (patch.wrapped !== undefined) { if (patch.wrapped === true) m.wrapped = true; else delete m.wrapped; }
  const after = calMetaIsEmpty(m) ? null : m;
  if (JSON.stringify(before) === JSON.stringify(after)) return false;
  if (after) state.eventMeta[evId] = after; else delete state.eventMeta[evId];
  saveData();
  if (o.render !== false) render();
  if (o.toast !== false) {
    const msg = patch.wrapped === true ? 'Marked as wrapped up' : patch.wrapped !== undefined && Object.keys(patch).length === 1 ? 'No longer wrapped up' : 'Event notes saved';
    toast(msg, { kind: 'ok', icon: 'check', action: { label: 'Undo', run: () => {
      if (!state.eventMeta || typeof state.eventMeta !== 'object') state.eventMeta = {};
      if (before) state.eventMeta[evId] = before; else delete state.eventMeta[evId];
      saveData(); render();
    } } });
  }
  return true;
}
