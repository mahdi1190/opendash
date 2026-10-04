/* ============================================================
   HOME widget "catchup": the pure rules (WIDGETS_CATALOGUE.md 3.9).
   OWNER: the "catchup" widget builder. No DOM, no state, no clock: the
   widget (12-home-w-catchup.js) passes everything in, so the tests run these
   in a VM. Loads before 12-home.js (build order): declarations only.
   Uses briefRollover (73-brief-logic.js) at call time, never at load time.

     homeCatchupSlipped(tasks, today, o)   what slipped: overdue (due before today) and
                         missed plans (planned for a past day, not due today or earlier).
                         The briefRollover rules without "due today", which belongs to Today.
                         tasks [{id, title, due, planned, done, priority, recurring, stream}],
                         o {overdue, missedPlans, includeRepeating} (all default true)
                         -> [{id, title, priority, stream, why: 'overdue'|'planned',
                             field: 'due'|'planned', from, days, stalePlan?}]  overdue first, then by
                             priority, then the oldest first
     homeCatchupMoves(acts, today, o)      the moves later of one task within o.windowDays
                         (60): 'date' or 'reschedule' entries with to > from
                         -> {n, first, lastTs, lastReason, decided}. decided: something
                         after the last move settled it (an estimate, a plan, a priority, or
                         subtasks added). A plan logged with a move (within 1 s) or in the
                         dashboard's own words ("caught up") rolls forward; it decides nothing
     homeStuck(items, taskActivity, today, o)   "keeps moving": moved later o.moves (3)
                         times or more in the last 60 days and not decided since, or in
                         progress with nothing logged for o.staleDays (10) days or more
                         ("stalled"). items [{id, title, status, done, createdAt, touchedAt}]
                         -> [{id, title, stream, kind: 'moved'|'stalled', moves, since,
                             lastReason, idleDays}]  most moves first, then the longest idle
     homeCatchupModel(input)  both sections for the widget. input {tasks (as both of the
                         above, plus snoozed), activity, today, prefs {overdue, missedPlans,
                         moves, includeRepeating}, staleDays}
                         -> {slipped, stuck, overdue, planned}; a task is listed once (a
                            slipped row that also keeps moving carries `moves`)
     homeCatchupChanges(rows, date, reasonOf)   what moving slipped rows does:
                         [{id, field, from, to, reason, stalePlan?}] (rows already there are
                         left out; stalePlan: an overdue task's plan for a past day, which
                         moves with it so the task does not stay slipped as a missed plan)
     homeCatchupApply(item, change, log)   make one change on a task object; log(type,
                         details) records it. -> true when something changed. The page runs
                         it inside batchTasks: one save, one undo step
     homeCatchupNextWeek(today, weekStart, isWorkDay)   the first day of next week ('Mon'
                         | 'Sun' | 'Sat'), moved on to a work day when isWorkDay says so
     HOME_CATCHUP_WHY    the "why" chips (the weekly story reads them as move reasons)
     HOME_CATCHUP_REASON the reason a move gets when no chip was picked
   ============================================================ */
const HOME_CATCHUP_WHY = Object.freeze(['Too big', 'Blocked', 'Forgot', 'Not important', 'Waiting']);
const HOME_CATCHUP_REASON = 'caught up';
const HOME_CATCHUP_LIMITS = Object.freeze({ moves: 3, staleDays: 10, windowDays: 60 });
// Reasons the dashboard writes itself: they say what happened, not why, so they are never shown as "the reason".
const _HCU_NOT_A_REASON = /^(caught up|moved on home|bulk|rescheduled overdue|rolled over at the end of the day|cleared on home|rebalanced\b|task-sync\b|sync\b)/i;

function _hcuIso(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; }
function _hcuUtc(iso) { const [y, m, d] = String(iso).split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); }
function _hcuAddDays(iso, n) {
  const t = new Date(_hcuUtc(iso) + n * 86400000);
  return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0');
}
function _hcuDaysBetween(a, b) { return Math.round((_hcuUtc(b) - _hcuUtc(a)) / 86400000); }
/** The local calendar day of a timestamp (ms). */
function _hcuLocalIso(ms) {
  const d = new Date(Number(ms));
  if (isNaN(d)) return null;
  if (typeof Clock !== 'undefined') return Clock.parts(d.getTime()).iso;   // the page's day (travel spec 2.7)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');   // clock-ok: Node fallback
}
/** Local midnight of a day (ms). */
function _hcuDayStart(iso) { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1).getTime(); }
function _hcuMs(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
}
const _HCU_PRIO = { p1: 0, p2: 1, p3: 2, p0: 3 };

function homeCatchupSlipped(tasks, today, o) {
  o = o || {};
  if (!_hcuIso(today)) return [];
  const list = (Array.isArray(tasks) ? tasks : []).filter(t => t && t.id && !t.done && !t.snoozed && (o.includeRepeating !== false || !t.recurring));
  const byId = new Map(list.map(t => [t.id, t]));
  const rolled = briefRollover(list.map(t => ({ id: t.id, title: t.title, priority: t.priority, due: _hcuIso(t.due), planned: _hcuIso(t.planned), done: false })), today);
  const out = [];
  for (const r of rolled) {
    if (r.why === 'overdue' && o.overdue === false) continue;
    if (r.why === 'planned' && (o.missedPlans === false || !(r.from < today))) continue;     // planned today is Today's
    if (r.why !== 'overdue' && r.why !== 'planned') continue;                                  // due today is Today's
    const t = byId.get(r.id) || {};
    const row = { id: r.id, title: r.title, priority: r.priority || 'p0', stream: t.stream || null, why: r.why, field: r.field, from: r.from, days: _hcuDaysBetween(r.from, today) };
    // An overdue task can also carry a plan for a past day: moving only the due date would leave it slipped (as a missed plan).
    const plan = _hcuIso(t.planned);
    if (r.why === 'overdue' && plan && plan < today) row.stalePlan = plan;
    out.push(row);
  }
  return out.sort((a, b) => (a.why === 'overdue' ? 0 : 1) - (b.why === 'overdue' ? 0 : 1)
    || (_HCU_PRIO[a.priority] ?? 3) - (_HCU_PRIO[b.priority] ?? 3)
    || String(a.from).localeCompare(String(b.from)) || String(a.title || '').localeCompare(String(b.title || '')));
}

function homeCatchupMoves(acts, today, o) {
  o = Object.assign({}, HOME_CATCHUP_LIMITS, o || {});
  const since = _hcuIso(today) ? _hcuDayStart(today) - o.windowDays * 86400000 : 0;
  let n = 0, first = null, lastTs = 0, lastReason = '';
  for (const a of Array.isArray(acts) ? acts : []) {
    if (!a || (a.type !== 'date' && a.type !== 'reschedule')) continue;
    const from = _hcuIso(a.from), to = _hcuIso(a.to), ts = Number(a.ts) || 0;
    if (!from || !to || !(to > from) || ts < since) continue;
    n++;
    if (!first || from < first) first = from;
    if (ts >= lastTs) {
      lastTs = ts;
      const why = String(a.reason || '').trim();
      if (why && !_HCU_NOT_A_REASON.test(why)) lastReason = why.slice(0, 80);
    }
  }
  // Settled since the last move: made smaller (estimate), given a day (plan), re-prioritised, or broken into steps.
  const decided = n > 0 && (Array.isArray(acts) ? acts : []).some(a => a && (Number(a.ts) || 0) > lastTs
    && (a.type === 'estimate' || (a.type === 'plan' && (Number(a.ts) || 0) - lastTs > 1000 && !_HCU_NOT_A_REASON.test(String(a.reason || ''))) || a.type === 'priority' || (a.type === 'update' && a.field === 'subtasks')));
  return { n, first, lastTs, lastReason, decided };
}

function homeStuck(items, taskActivity, today, o) {
  o = Object.assign({}, HOME_CATCHUP_LIMITS, o || {});
  const out = [];
  if (!_hcuIso(today)) return out;
  const acts = taskActivity && typeof taskActivity === 'object' ? taskActivity : {};
  for (const it of Array.isArray(items) ? items : []) {
    if (!it || !it.id || it.done) continue;
    const list = Array.isArray(acts[it.id]) ? acts[it.id] : [];
    const m = homeCatchupMoves(list, today, o);
    if (m.n >= o.moves && !m.decided) {
      out.push({ id: it.id, title: it.title, stream: it.stream || null, kind: 'moved', moves: m.n, since: m.first, lastReason: m.lastReason, lastTs: m.lastTs, idleDays: null });
      continue;
    }
    if (it.status !== 'doing') continue;
    let last = Math.max(_hcuMs(it.createdAt), Number(it.touchedAt) || 0);
    for (const a of list) if (a && Number(a.ts) > last) last = Number(a.ts);
    if (!last) continue;                                       // never touched and no creation date: unknown, not stalled
    const day = _hcuLocalIso(last);
    const idle = day ? _hcuDaysBetween(day, today) : 0;
    if (idle >= o.staleDays) out.push({ id: it.id, title: it.title, stream: it.stream || null, kind: 'stalled', moves: m.n, since: day, lastReason: m.lastReason, lastTs: last, idleDays: idle });
  }
  return out.sort((a, b) => (a.kind === 'moved' ? 0 : 1) - (b.kind === 'moved' ? 0 : 1)
    || (b.moves || 0) - (a.moves || 0) || (b.idleDays || 0) - (a.idleDays || 0) || (b.lastTs || 0) - (a.lastTs || 0)
    || String(a.title || '').localeCompare(String(b.title || '')));
}

function homeCatchupModel(input) {
  input = input || {};
  const p = Object.assign({ overdue: true, missedPlans: true, moves: HOME_CATCHUP_LIMITS.moves, includeRepeating: true }, input.prefs || {});
  const moves = Math.max(2, Math.min(10, Math.round(Number(p.moves)) || HOME_CATCHUP_LIMITS.moves));
  const today = input.today;
  const tasks = (Array.isArray(input.tasks) ? input.tasks : []).filter(t => t && t.id && !t.done && !t.snoozed && (p.includeRepeating !== false || !t.recurring));
  const activity = input.activity && typeof input.activity === 'object' ? input.activity : {};
  const slipped = homeCatchupSlipped(tasks, today, p);
  const inSlipped = new Set(slipped.map(r => r.id));
  for (const r of slipped) {
    const m = homeCatchupMoves(activity[r.id], today, {});
    if (m.n >= moves) { r.moves = m.n; r.lastReason = m.lastReason; }
  }
  const stuck = homeStuck(tasks.filter(t => !inSlipped.has(t.id)), activity, today, { moves, staleDays: Number(input.staleDays) > 0 ? Number(input.staleDays) : HOME_CATCHUP_LIMITS.staleDays });
  return { slipped, stuck, overdue: slipped.filter(r => r.why === 'overdue').length, planned: slipped.filter(r => r.why === 'planned').length };
}

function homeCatchupChanges(rows, date, reasonOf) {
  const to = _hcuIso(date);
  if (!to) return [];
  const out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || !r.id || (r.field !== 'due' && r.field !== 'planned')) continue;
    if (r.from === to) continue;
    const why = typeof reasonOf === 'function' ? reasonOf(r.id) : null;
    const ch = { id: r.id, field: r.field, from: r.from || null, to, reason: (typeof why === 'string' && why.trim()) ? why.trim().slice(0, 80) : HOME_CATCHUP_REASON };
    if (r.field === 'due' && _hcuIso(r.stalePlan)) ch.stalePlan = r.stalePlan;
    out.push(ch);
  }
  return out;
}

function homeCatchupApply(item, ch, log) {
  if (!item || !ch || !_hcuIso(ch.to)) return false;
  const note = typeof log === 'function' ? log : () => {};
  if (ch.field === 'due') {
    const from = item.dueDate || null;
    if (from === ch.to) return false;
    note('date', { from, to: ch.to, reason: ch.reason || null });
    item.dueDate = ch.to;
    // Its plan for a past day moves with it (the old time slot goes).
    if (ch.stalePlan && item.plannedFor === ch.stalePlan) {
      item.plannedFor = ch.to;
      delete item.plannedTime; delete item.plannedMinutes;
      note('plan', { from: ch.stalePlan, to: ch.to, reason: ch.reason || null });
    }
    return true;
  }
  if (ch.field === 'planned') {
    // A missed plan moves to the new day; its old time slot goes (that time was chosen for the day that passed).
    const from = item.plannedFor || null;
    if (from === ch.to && !item.plannedTime) return false;
    item.plannedFor = ch.to;
    delete item.plannedTime; delete item.plannedMinutes;
    note('plan', { from, to: ch.to, reason: ch.reason || null });
    return true;
  }
  return false;
}

function homeCatchupNextWeek(today, weekStart, isWorkDay) {
  if (!_hcuIso(today)) return null;
  const start = { Mon: 1, Sun: 0, Sat: 6 }[weekStart] ?? 1;
  const dow = new Date(_hcuUtc(today)).getUTCDay();
  let d = _hcuAddDays(today, 7 - ((dow - start + 7) % 7));
  if (typeof isWorkDay === 'function') for (let i = 0; i < 6 && !isWorkDay(d); i++) d = _hcuAddDays(d, 1);
  return d;
}
