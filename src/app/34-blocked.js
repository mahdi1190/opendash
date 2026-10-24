/* ============================================================
   BLOCKED BY + the task-row marks (owner: Review, v2.16).
   A task can wait for other tasks (blockedBy). While any of them is open it
   stays out of Today and shows dimmed with a lock chip ("after: Draft the
   report"); when the last one is done it lights up (a short glow) and a toast
   says it is ready. Set it from the task menu ("Blocked by…"), the B key on a
   task row, or the review flows.
   Also here: the waiting chip on a row ("Clara · 6 d", warning ink once it is
   time to follow up), the task-menu items, and the W / B row keys.
   ============================================================ */
const _rfLit = new Map();        // taskId -> when it was unblocked (the row glows for a few seconds)

/** setStatus(...'done') calls this (20-task-model.js): the tasks that only waited for `id` are ready now. */
function rfOnClosed(id) {
  const ready = rfDependents(id).filter(t => rfIsOpen(t) && !rfIsBlocked(t));
  if (!ready.length) return;
  const now = Date.now();
  for (const t of ready) _rfLit.set(t.id, now);
  setTimeout(() => {
    const first = ready[0];
    const msg = ready.length === 1 ? `Unblocked: “${String(effTitle(first)).slice(0, 70)}” is ready` : `${ready.length} tasks are unblocked and ready`;
    toast(msg, { icon: 'lock-open', kind: 'ok', action: { label: ready.length === 1 ? 'Open' : 'Show', run: () => { if (ready.length === 1 && typeof openTask === 'function') openTask(first.id); else setView('today'); } } });
  }, 650);
}

/** Marks on a task row (30-task-row.js): waiting and blocked chips, dimming, the unblocked glow. m = the row's chip maker. */
function rfRowDecorate(item, el, m) {
  if (!rfIsOpen(item)) return;
  if (rfIsWaiting(item)) {
    el.classList.add('rf-waiting');
    const p = rfWaitPerson(item);
    const n = rfDaysSince(rfWaitSince(item));
    const due = rfNudgeDue(item);
    const who = p ? (typeof hglFirst === 'function' ? hglFirst(p) : p.name) : 'Someone';
    const c = m('rf-chip rf-chip-wait' + (due ? ' due' : ''), due ? 'bell' : 'hourglass', `${who}${n ? ' · ' + n + ' d' : ''}${due ? ' · follow up' : ''}`,
      `Waiting on ${p ? p.name : 'someone'}${rfWaitSince(item) ? ' since ' + rfWaitSince(item) : ''}${due ? ' — time to follow up' : ''}`);
    c.dataset.rfWait = item.id;
  }
  const blockers = rfBlockers(item);
  if (blockers.length) {
    el.classList.add('rf-blocked');
    const t = String(effTitle(blockers[0]));
    m('rf-chip rf-chip-block', 'lock', `after: ${t.length > 32 ? t.slice(0, 31) + '…' : t}${blockers.length > 1 ? ' +' + (blockers.length - 1) : ''}`,
      'Blocked by: ' + blockers.map(b => effTitle(b)).join(', ') + ' — stays out of Today until done');
  }
  // At most two status chips at once (UX_BLUEPRINT.md 3): waiting and blocked win over "planned for today",
  // which folds away (.rf-capped) and is listed in the row's tooltip instead (30-task-row.js).
  const meta = el.querySelector('.t-meta');
  const status = meta ? [...meta.querySelectorAll(':scope > .rf-chip, :scope > .t-planned.is-today')] : [];
  if (status.length > 2) for (const c of status.filter(c => c.classList.contains('t-planned')).slice(0, status.length - 2)) c.classList.add('rf-capped');
  const lit = _rfLit.get(item.id);
  if (lit && Date.now() - lit < 6000) el.classList.add('rf-lit');
  else if (lit) _rfLit.delete(item.id);
}

/** Extra task-menu items (32-tasks-ui.js taskMenuItems). anchor() = the element to open pickers at. */
function rfTaskMenuItems(id, anchor) {
  const i = getItem(id);
  if (!i || !rfIsOpen(i)) return [];
  const at = () => (typeof anchor === 'function' ? anchor() : anchor) || document.getElementById('main-body');
  const out = [];
  if (rfIsWaiting(i)) {
    const p = rfWaitPerson(i);
    out.push({ label: `Stop waiting${p ? ' on ' + (typeof hglFirst === 'function' ? hglFirst(p) : p.name) : ''}`, icon: 'rotate-ccw', run: () => rfStopWaiting(id) });
    if (p) out.push({ label: 'Nudge (draft an email)', icon: 'bell', run: () => rfNudge(id) });
  } else out.push({ label: 'Waiting on…', icon: 'hourglass', kbd: 'W', run: () => rfAskWaiting(id, at()) });
  out.push({ label: rfBlockers(i).length ? 'Blocked by… (' + rfBlockers(i).length + ')' : 'Blocked by…', icon: 'lock', kbd: 'B', run: () => rfAskBlocked(id, at()) });
  out.push(rfIsSomeday(i)
    ? { label: 'Back from someday', icon: 'cloud', run: () => { const mk = rfDo('unsomeday', id); rfToast('Back from someday', mk, 'cloud'); } }
    : { label: 'Someday', icon: 'cloud', run: () => { const mk = rfDo('someday', id); rfToast('Parked for someday (#someday)', mk, 'cloud'); } });
  return out;
}

/* W = waiting on…, B = blocked by… on the task under the cursor (j/k), as the other row keys (32-tasks-ui.js). */
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
  if (e.key !== 'w' && e.key !== 'b') return;
  if (typeof state === 'undefined' || !isTaskView(state.view) || rfKeysBusy(e)) return;
  if (typeof _gPending !== 'undefined' && _gPending && Date.now() - _gPending < 1200) return;
  const id = typeof _taskCursorId === 'function' ? _taskCursorId() : null;
  const i = id && getItem(id);
  if (!i || !rfIsOpen(i)) return;
  e.preventDefault();
  const anchor = document.querySelector(`#main-body [data-id="${CSS.escape(id)}"] .t-title`) || document.querySelector(`#main-body [data-id="${CSS.escape(id)}"]`) || document.getElementById('main-body');
  if (e.key === 'w') { if (rfIsWaiting(i)) rfStopWaiting(id); else rfAskWaiting(id, anchor); }
  else rfAskBlocked(id, anchor);
});
