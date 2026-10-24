/* ============================================================
   REVIEW CORE (owner: Review, v2.16). The rules every review tool shares:
   waiting / blocked / someday / stale, the dates "tomorrow" and "next week",
   and the one-key task changes (rfDo) used by the weekly review (34-review-flow.js),
   the Today -> Tomorrow sweep and Plan my week (34-sweep.js), the clean-up
   (34-cleanup.js), the waiting list (34-waiting.js) and Blocked by (34-blocked.js).

   Every change is ONE saveData() = one undo step, and rfDo returns undoMark()
   so an Undo button takes back exactly that change (undoMarked). Nothing here
   calls Claude: the review tools are free and instant.

   Task fields (documented in 20-task-model.js): waitingOn, waiting, waitingSince,
   waitingNudgedAt, blockedBy. Someday is the tag 'someday', so it needs no new
   field and has a list of its own (#someday).
   ============================================================ */
const RF_SOMEDAY_TAG = 'someday';

function rfIsOpen(i) { return !!i && statusOf(i.id) !== 'done' && !(state.deleted && state.deleted[i.id]); }
/** Waiting on someone by the explicit flags (the D key, "Waiting on…"): waitingOn, waiting:true or status 'waiting'. */
function rfIsWaiting(i) { return !!i && (!!i.waitingOn || i.waiting === true || statusOf(i.id) === 'waiting'); }
/** Waiting by any rule: the flags above, or a waiting- / blocked- tag (homeIsWaiting, 12-home.js). The Waiting list shows these. */
function rfIsWaitingAny(i) { return rfIsWaiting(i) || (typeof homeIsWaiting === 'function' && !!i && homeIsWaiting(i)); }
function rfIsSomeday(i) { return !!i && effTags(i).includes(RF_SOMEDAY_TAG); }
/** The open tasks this one waits for (blockedBy); done, binned and missing ones no longer block. */
function rfBlockers(i) {
  const ids = i && Array.isArray(i.blockedBy) ? i.blockedBy : [];
  const out = [];
  for (const id of ids) { const t = getItem(id); if (t && rfIsOpen(t)) out.push(t); }
  return out;
}
function rfIsBlocked(i) { return !!i && Array.isArray(i.blockedBy) && i.blockedBy.length > 0 && rfBlockers(i).length > 0; }
/** Does task `a` depend on `b`, directly or through others? (A dependency loop is refused.) */
function rfDependsOn(a, b, seen) {
  seen = seen || new Set();
  if (!a || seen.has(a)) return false;
  seen.add(a);
  const t = getItem(a);
  for (const d of (t && Array.isArray(t.blockedBy) ? t.blockedBy : [])) if (d === b || rfDependsOn(d, b, seen)) return true;
  return false;
}
/** The tasks that list `id` in their blockedBy. */
function rfDependents(id) { return getAllItems().filter(t => Array.isArray(t.blockedBy) && t.blockedBy.includes(id)); }

/**
 * Does a view leave this task out (21-task-query.js matchesView)? Waiting tasks leave
 * the active lists (Today, Tomorrow, Upcoming, No date, a day) for the Waiting list;
 * a blocked task stays out of Today until what it depends on is done; a someday task
 * without a date leaves No date. In progress always stays where you can see it.
 */
function rfLeavesView(i, view) {
  const v = String(view || '');
  const active = v === 'today' || v === 'tomorrow' || v === 'week' || v === 'no-date' || v.startsWith('day:');
  if (!active || statusOf(i.id) === 'doing') return false;
  if (rfIsWaiting(i)) return true;
  if (v === 'today' && rfIsBlocked(i)) return true;
  if (v === 'no-date' && rfIsSomeday(i)) return true;
  return false;
}

/* ---------- dates ---------- */
function rfNextWeek() { return fmtDate(_qaAdd(_qaWeekStart(_qaToday()), 7)); }
function rfWeekEnd() { return fmtDate(_qaAdd(_qaWeekStart(_qaToday()), 6)); }
function _rfIsoOf(c) {
  if (!c) return null;
  if (typeof c === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c)) return c.slice(0, 10);
  const ms = typeof c === 'number' ? c : Date.parse(String(c));
  return isNaN(ms) ? null : Clock.parts(ms).iso;
}
/** Whole days from an ISO date to today (0 = today), or null. */
function rfDaysSince(iso) { const d = iso ? daysUntil(iso) : null; return d === null ? null : Math.max(0, -d); }
function rfDayName(iso, long) {
  try { return new Date(iso + 'T12:00:00').toLocaleDateString(APP_CONFIG.locale || undefined, long ? { weekday: 'long', day: 'numeric', month: 'short' } : { weekday: 'short' }); } catch (e) { return iso; }
}

/* ---------- untouched ---------- */
/** The last time anything happened to a task: created, any history entry, any note (ms). */
function rfCreatedMs(i) {
  const c = typeof _createdTs === 'function' ? _createdTs(i) : i.createdAt;
  return typeof c === 'number' ? c : (Date.parse(String(c || '')) || 0);
}
function rfLastTouch(i) {
  let t = rfCreatedMs(i);
  for (const a of ((state.taskActivity || {})[i.id] || [])) if (a && Number(a.ts) > t) t = Number(a.ts);
  for (const n of getNotes(i.id)) if (n && Number(n.ts) > t) t = Number(n.ts);
  return t;
}
/** Open tasks nobody has touched for `days` (60): not pinned, repeating, waiting, someday, in progress or due ahead. Oldest first. */
function rfStaleTasks(days) {
  const cut = Date.now() - (Number(days) || 60) * 864e5, today = todayStr();
  return getAllItems().filter(i => {
    if (!rfIsOpen(i) || statusOf(i.id) === 'doing' || isPinned(i.id) || effRecurrence(i) !== 'none' || rfIsWaiting(i) || rfIsSomeday(i)) return false;
    const d = effDate(i);
    if (d && d >= today) return false;
    const t = rfLastTouch(i);
    return t > 0 && t < cut;
  }).sort((a, b) => rfLastTouch(a) - rfLastTouch(b));
}

/* ---------- waiting ---------- */
function rfWaitPerson(i) {
  if (!i) return null;
  const p = i.waitingOn ? getPerson(String(i.waitingOn)) : null;
  if (p) return p;
  return typeof homeWaitingPerson === 'function' ? homeWaitingPerson(i) : null;
}
/** When the waiting started: waitingSince, else when the task was made. */
function rfWaitSince(i) { return (i && i.waitingSince) || _rfIsoOf(i && i.createdAt); }
/** Follow up after this many days of silence (the Waiting list's setting, synced). */
function rfNudgeDays() { const n = Number(taskViewPrefs('waiting').nudgeDays); return n >= 1 && n <= 60 ? Math.round(n) : 5; }
/** Time to chase: N days since it started (or since the last nudge), or its follow-up date has come. */
function rfNudgeDue(i) {
  if (!rfIsOpen(i) || !rfIsWaitingAny(i)) return false;
  const base = i.waitingNudgedAt || rfWaitSince(i);
  const n = rfDaysSince(base);
  if (n !== null && n >= rfNudgeDays()) return true;
  const d = effDate(i);
  return !!d && daysUntil(d) <= 0 && i.waitingNudgedAt !== todayStr();
}
function rfWaitingTasks() { return getAllItems().filter(i => rfIsOpen(i) && rfIsWaitingAny(i)); }

/* ---------- the one-key changes (mutate only; rfDo saves) ---------- */
function _rfUnsomeday(i) {
  if (!rfIsSomeday(i)) return;
  i.tags = effTags(i).filter(t => t !== RF_SOMEDAY_TAG);
  logActivity(i.id, 'tags', { added: [], removed: [RF_SOMEDAY_TAG] });
}
function _rfSetPlan(i, date) {
  const from = i.plannedFor || null;
  if (from === (date || null)) return;
  if (date) i.plannedFor = date; else delete i.plannedFor;
  delete i.plannedTime; delete i.plannedMinutes;
  logActivity(i.id, 'plan', { from, to: date || null });
}
/**
 * Put the task on the list for `target`: a deadline before it moves to it (with the
 * reason in the history); otherwise it is PLANNED for that day and the deadline is
 * left alone. A past plan moves too, so the task really leaves today.
 */
function _rfMoveTo(i, target, reason) {
  const due = i.dueDate || null;
  let movedDue = false;
  if (due && due < target) { logActivity(i.id, 'date', { from: due, to: target, reason: reason || null }); i.dueDate = target; movedDue = true; }
  const plan = i.plannedFor || null;
  const needPlan = plan ? (plan !== target && (plan < target || !movedDue)) : (!movedDue && (!due || due > target));
  if (needPlan) _rfSetPlan(i, target);
  _rfUnsomeday(i);
}
const RF_DO = {
  keep(i, o) { logActivity(i.id, 'review', { text: o.text || 'Reviewed: kept as it is' }); },
  tomorrow(i, o) { _rfMoveTo(i, tomorrowStr(), o.reason || 'Review'); },
  nextweek(i, o) { _rfMoveTo(i, rfNextWeek(), o.reason || 'Review'); },
  today(i, o) { _rfMoveTo(i, todayStr(), o.reason || 'Review'); },
  /** Plan for a day (Plan my week): the plan only, never the deadline. date null = unplan. */
  plan(i, o) { _rfSetPlan(i, o.date || null); if (o.date) _rfUnsomeday(i); },
  someday(i) {
    if (!rfIsSomeday(i)) { i.tags = [...effTags(i), RF_SOMEDAY_TAG]; logActivity(i.id, 'tags', { added: [RF_SOMEDAY_TAG], removed: [] }); }
    _rfSetPlan(i, null);
    if (i.dueDate) { logActivity(i.id, 'date', { from: i.dueDate, to: null, reason: 'Parked for someday' }); i.dueDate = null; delete i.dueTime; }
    if (statusOf(i.id) === 'doing') state.statuses[i.id] = 'todo';
  },
  unsomeday(i) { _rfUnsomeday(i); },
  drop(i) { setStatus(i.id, 'done', { wontDo: true, noSave: true }); },
  done(i) {
    const due = effDate(i);
    setStatus(i.id, 'done', { noSave: true });
    if (typeof achTaskDone === 'function') { try { achTaskDone(i, due); } catch (e) { /* achievements are a bonus */ } }
  },
  bin(i) { deleteTask(i.id, { noSave: true }); },
  rename(i, o) { const t = String(o.title || '').trim().slice(0, 500); if (t && t !== i.title) { logActivity(i.id, 'title', { from: i.title, to: t }); i.title = t; } },
  wait(i, o) {
    const pid = o.person || null;
    const p = pid ? getPerson(pid) : null;
    if (p) { i.waitingOn = p.id; delete i.waiting; if (!(Array.isArray(i.people) ? i.people : []).includes(p.id)) { i.people = [...(Array.isArray(i.people) ? i.people : []), p.id]; logActivity(i.id, 'people', { added: [p.id], removed: [] }); } }
    else { delete i.waitingOn; i.waiting = true; }
    i.waitingSince = todayStr(); delete i.waitingNudgedAt;
    if (statusOf(i.id) === 'doing') state.statuses[i.id] = 'todo';
    _rfSetPlan(i, null);
    logActivity(i.id, 'waiting', { text: p ? `Waiting on ${p.name}` : 'Waiting on someone' });
  },
  unwait(i) {
    const p = rfWaitPerson(i);
    delete i.waitingOn; delete i.waiting; delete i.waitingSince; delete i.waitingNudgedAt;
    if (statusOf(i.id) === 'waiting') state.statuses[i.id] = 'todo';
    const tags = effTags(i), keep = tags.filter(t => !/^(waiting|waiting-on|awaiting|blocked)(-|$)/.test(String(t)));
    if (keep.length !== tags.length) { i.tags = keep; logActivity(i.id, 'tags', { added: [], removed: tags.filter(t => !keep.includes(t)) }); }
    logActivity(i.id, 'waiting', { text: p ? `No longer waiting on ${p.name}` : 'No longer waiting' });
  },
  nudged(i) { i.waitingNudgedAt = todayStr(); logActivity(i.id, 'waiting', { text: 'Followed up' }); },
  block(i, o) {
    const dep = o.dep;
    if (!dep || dep === i.id || !getItem(dep)) return;
    const cur = Array.isArray(i.blockedBy) ? i.blockedBy : [];
    if (cur.includes(dep)) return;
    i.blockedBy = [...cur, dep];
    logActivity(i.id, 'blocked', { text: `Blocked by “${String(effTitle(getItem(dep))).slice(0, 80)}”` });
  },
  unblock(i, o) {
    const cur = Array.isArray(i.blockedBy) ? i.blockedBy : [];
    const next = o.dep ? cur.filter(x => x !== o.dep) : [];
    if (next.length === cur.length) return;
    if (next.length) i.blockedBy = next; else delete i.blockedBy;
    const t = o.dep ? getItem(o.dep) : null;
    logActivity(i.id, 'blocked', { text: t ? `No longer blocked by “${String(effTitle(t)).slice(0, 80)}”` : 'No longer blocked' });
  },
};
/** Apply one change (RF_DO[kind]) to a task: one save, one render, one undo step. Returns the undo mark (null: nothing done). */
function rfDo(kind, id, o) {
  const i = getItem(id);
  if (!i || !RF_DO[kind]) return null;
  if (kind === 'block' && o && (o.dep === id || rfDependsOn(o.dep, id))) { toast('That would make a loop: the other task already waits for this one.', { kind: 'err', icon: 'lock' }); return null; }
  RF_DO[kind](i, o || {});
  saveData(); render();
  return undoMark();
}
/** Several at once (Plan my week's Auto-plan, "all to tomorrow"): one save, one undo step. pairs = [[kind, id, o]]. */
function rfDoMany(pairs) {
  let n = 0;
  for (const [kind, id, o] of pairs) { const i = getItem(id); if (i && RF_DO[kind]) { RF_DO[kind](i, o || {}); n++; } }
  if (!n) return null;
  saveData(); render();
  return undoMark();
}
/** A toast for a change made outside a flow, whose Undo takes back exactly that change. */
function rfToast(msg, mark, ic) {
  toast(msg, { icon: ic || 'check', action: mark ? { label: 'Undo', run: () => undoMarked(mark) } : null });
}
/** The keyboard belongs to someone else: typing, or a menu, dialog or palette is open. */
function rfKeysBusy(e) {
  const t = e && e.target;
  if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return true;
  return [...document.querySelectorAll('.cmd, .modal, .drawer, .pop, .tc')].some(n => n.getClientRects().length > 0);
}
