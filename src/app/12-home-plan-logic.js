/* ============================================================
   PLANNING LOGIC (pure). Owner: W0-B (shared time logic).
   Working hours, planned time slots and free time, shared by Home's
   widgets, the Calendar, the task card and the server: lib/plan-logic.mjs
   evaluates this file for Node (the task.plan op, config validation, the
   stories), so the page and the server follow one rule.
   No DOM and no page globals (tests/plan-slots.test.mjs checks it).
   Times are minutes since midnight; days are 'YYYY-MM-DD'.

   Working hours: config.workHours = {start:'09:00', end:'18:00', days:[1,2,3,4,5]}
   (optional; days are 0 = Sunday ... 6 = Saturday). Every free-time sum
   (the hero, Today's schedule, the brief, the widgets) reads it through
   homeWorkHours() (20-task-plan.js) so they agree.
     PLAN_WORK_DEFAULT
     planWorkHours(raw)            -> {start, end, days, startMin, endMin, minutes, custom}
     planWorkHoursCheck(raw)       -> null | 'what is wrong' (null raw = the default: fine)
     planIsWorkDay(wh, iso)        -> is that day one of the working days

   Planned slots: when the user means to WORK on a task, never its deadline.
   task.plannedFor 'YYYY-MM-DD' (the day; existed before), task.plannedTime
   'HH:MM' (needs plannedFor) and task.plannedMinutes 5-720 (optional; else
   the estimate, else 30). dueDate / dueTime are never touched.
     PLAN_MIN_MINUTES, PLAN_MAX_MINUTES, PLAN_DEFAULT_MINUTES
     planSlotMinutes(task)         -> the slot's length
     planSlotOf(task)              -> {date, time, start, end, minutes} | null
     planSlotCheck(p, cur)         -> null | error text  (p = {date, time, minutes}; undefined = keep)
     planApplySlot(task, p)        -> {changed, from, to} | {error}: changes the task in place
                                      (date null clears all three; time null clears the time
                                      and length; minutes null goes back to the estimate)
     planSlotText(slot)            -> '10:00–11:30'

   Free time:
     planMergeBusy(blocks)         -> [[start, end]] merged, sorted ([{start,end}] or [[s,e]] in)
     planFreeGaps(blocks, o)       -> [{start, end, minutes}] free stretches inside
                                      o = {start, end, from, min (default 30)}
     homeDayCapacity(o)            -> how full a day is (see the function)
     planTaskScore(t, today)       -> {score, why[]} how much a task wants time today
     homeGapCandidates(gap, tasks, o) -> the tasks that fit one free gap, best first
     homeAutoPlan(o)               -> {slots:[{id, date, time, start, end, minutes}], left:[id]}
   Task shape for the last three (the caller builds it, 20-task-plan.js
   planTaskInfo does it on the page): {id, title, minutes, due, priority,
   plannedFor, plannedTime, doing, pinned}.
   ============================================================ */
const PLAN_MIN_MINUTES = 5;
const PLAN_MAX_MINUTES = 720;
const PLAN_DEFAULT_MINUTES = 30;
const PLAN_WORK_DEFAULT = Object.freeze({ start: '09:00', end: '18:00', days: Object.freeze([1, 2, 3, 4, 5]) });
const _PLAN_HM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const _PLAN_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function _planMin(hm) { const m = _PLAN_HM_RE.exec(String(hm == null ? '' : hm)); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function _planHM(min) {
  const m = Math.max(0, Math.min(24 * 60, Math.round(Number(min) || 0)));
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
function _planIsIso(d) {
  if (!_PLAN_ISO_RE.test(String(d || ''))) return false;
  const [y, m, dd] = String(d).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === dd;
}
function _planDayNo(iso) { const [y, m, d] = String(iso).split('-').map(Number); return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000); }
function _planDaysBetween(a, b) { return _planDayNo(b) - _planDayNo(a); }
function _planWeekday(iso) { return ((_planDayNo(iso) % 7) + 7 + 4) % 7; }     // 1970-01-01 was a Thursday

/* ---------- working hours ---------- */
function planWorkHoursCheck(raw) {
  if (raw == null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return 'workHours must be {start, end, days}';
  const s = _planMin(raw.start), e = _planMin(raw.end);
  if (s === null) return "workHours.start must be 'HH:MM' (24-hour)";
  if (e === null && raw.end !== '24:00') return "workHours.end must be 'HH:MM' (24-hour)";
  if ((e === null ? 24 * 60 : e) - s < 30) return 'the working day must be at least 30 minutes long';
  if (raw.days !== undefined) {
    if (!Array.isArray(raw.days) || !raw.days.length) return 'workHours.days must list at least one day (0 = Sunday ... 6 = Saturday)';
    if (raw.days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) return 'workHours.days are numbers 0 (Sunday) to 6 (Saturday)';
  }
  return null;
}
/** The working hours: the user's when they are valid, else 09:00-18:00 Monday to Friday. */
function planWorkHours(raw) {
  const ok = raw != null && !planWorkHoursCheck(raw);
  const start = ok ? raw.start : PLAN_WORK_DEFAULT.start;
  const end = ok ? raw.end : PLAN_WORK_DEFAULT.end;
  const days = ok && Array.isArray(raw.days) ? [...new Set(raw.days)].sort((a, b) => a - b) : PLAN_WORK_DEFAULT.days.slice();
  const startMin = _planMin(start), endMin = end === '24:00' ? 24 * 60 : _planMin(end);
  return { start, end, days, startMin, endMin, minutes: endMin - startMin, custom: ok };
}
function planIsWorkDay(wh, iso) {
  if (!_planIsIso(iso)) return false;
  const days = wh && Array.isArray(wh.days) ? wh.days : PLAN_WORK_DEFAULT.days;
  return days.includes(_planWeekday(iso));
}

/* ---------- planned slots ---------- */
function planSlotMinutes(t) {
  const n = Number(t && t.plannedMinutes) > 0 ? Number(t.plannedMinutes) : Number(t && t.estimate) > 0 ? Number(t.estimate) : PLAN_DEFAULT_MINUTES;
  return Math.max(PLAN_MIN_MINUTES, Math.min(PLAN_MAX_MINUTES, Math.round(n)));
}
/** The task's planned slot, or null (no day, no time, or a bad value). The end never passes midnight. */
function planSlotOf(t) {
  if (!t || !_planIsIso(t.plannedFor)) return null;
  const start = _planMin(t.plannedTime);
  if (start === null) return null;
  const minutes = planSlotMinutes(t);
  return { date: t.plannedFor, time: t.plannedTime, start, end: Math.min(24 * 60, start + minutes), minutes };
}
/**
 * Is p = {date, time, minutes} a valid change to a slot that is now cur =
 * {date, time} (undefined fields are kept)? null when it is, else the reason.
 */
function planSlotCheck(p, cur) {
  p = p || {}; cur = cur || {};
  if (p.date !== undefined && p.date !== null && !_planIsIso(p.date)) return "date must be 'YYYY-MM-DD'";
  if (p.time !== undefined && p.time !== null && _planMin(p.time) === null) return "time must be 'HH:MM' (24-hour)";
  if (p.minutes !== undefined && p.minutes !== null) {
    const n = Number(p.minutes);
    if (!Number.isFinite(n) || Math.round(n) !== n || n < PLAN_MIN_MINUTES || n > PLAN_MAX_MINUTES) return `minutes must be a whole number from ${PLAN_MIN_MINUTES} to ${PLAN_MAX_MINUTES}`;
  }
  const date = p.date !== undefined ? p.date : (cur.date || null);
  const time = p.date === null ? null : p.time !== undefined ? p.time : (cur.time || null);
  if (p.time && !date) return 'a time needs a day (date)';
  if (p.minutes != null && (!time || p.date === null)) return 'minutes needs a time slot (time)';
  return null;
}
/**
 * Change the task's slot in place. p: {date, time, minutes}; undefined keeps,
 * null clears (date null clears all three; time null clears time and length;
 * minutes null goes back to the estimate). -> {changed, from, to} or {error}.
 */
function planApplySlot(t, p) {
  p = p || {};
  const snap = () => ({ date: t.plannedFor || null, time: t.plannedTime || null, minutes: Number(t.plannedMinutes) > 0 ? Number(t.plannedMinutes) : null });
  const from = snap();
  const err = planSlotCheck(p, from);
  if (err) return { error: err, changed: false, from, to: from };
  if (p.date === null) { delete t.plannedFor; delete t.plannedTime; delete t.plannedMinutes; }
  else {
    if (p.date !== undefined) t.plannedFor = p.date;
    if (p.time === null) { delete t.plannedTime; delete t.plannedMinutes; }
    else if (p.time !== undefined) t.plannedTime = p.time;
    if (p.minutes === null) delete t.plannedMinutes;
    else if (p.minutes !== undefined && t.plannedTime) t.plannedMinutes = Number(p.minutes);
  }
  const to = snap();
  return { changed: from.date !== to.date || from.time !== to.time || from.minutes !== to.minutes, from, to };
}
/** '10:00–11:30' for a slot (or any {start, end}). */
function planSlotText(slot) { return slot ? _planHM(slot.start) + '–' + _planHM(slot.end) : ''; }

/* ---------- free time ---------- */
function planMergeBusy(blocks) {
  const list = [];
  for (const b of Array.isArray(blocks) ? blocks : []) {
    if (!b) continue;
    const s = Array.isArray(b) ? b[0] : b.start, e = Array.isArray(b) ? b[1] : b.end;
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
    list.push([s, Math.max(e, s + 1)]);
  }
  list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [];
  for (const [s, e] of list) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e); else out.push([s, e]);
  }
  return out;
}
/** Free stretches of at least o.min minutes between max(o.from, o.start) and o.end. */
function planFreeGaps(blocks, o) {
  o = o || {};
  const ws = Number.isFinite(o.start) ? o.start : _planMin(PLAN_WORK_DEFAULT.start);
  const we = Number.isFinite(o.end) ? o.end : _planMin(PLAN_WORK_DEFAULT.end);
  const min = Number.isFinite(o.min) ? o.min : 30;
  let cur = Math.max(ws, Number.isFinite(o.from) ? o.from : ws);
  const out = [];
  const add = (a, b) => { if (b - a >= min) out.push({ start: a, end: b, minutes: b - a }); };
  for (const [s, e] of planMergeBusy(blocks)) {
    if (cur >= we) break;
    if (e <= cur) continue;
    if (s > cur) add(cur, Math.min(s, we));
    cur = Math.max(cur, e);
  }
  if (cur < we) add(cur, we);
  return out;
}
/** Minutes of [a, b) inside [lo, hi). */
function _planOverlap(a, b, lo, hi) { return Math.max(0, Math.min(b, hi) - Math.max(a, lo)); }

/**
 * How full one day is, inside the working hours.
 * o: {workHours (planWorkHours), date, nowMin (null = not today: the whole window),
 *     events: [{start, end, allDay?, bg?}] (timed meetings; all-day and background ones are skipped),
 *     plans: [{start, end}] (planned slots that day),
 *     load: [{minutes}] (open tasks wanting time that day but with no slot)}
 * -> {work (a working day), windowMin (minutes left in the window), meetingMin, plannedMin,
 *     busyMin (their union), freeMin, loadMin, spareMin (free - load; below 0 = over),
 *     over, ratio (0..n: (busy + load) / window), gaps: [{start, end, minutes}] (30 min+)}
 */
function homeDayCapacity(o) {
  o = o || {};
  const wh = o.workHours && Number.isFinite(o.workHours.startMin) ? o.workHours : planWorkHours(null);
  const work = o.date ? planIsWorkDay(wh, o.date) : true;
  const lo = Math.max(wh.startMin, Number.isFinite(o.nowMin) ? o.nowMin : wh.startMin), hi = wh.endMin;
  const windowMin = Math.max(0, hi - lo);
  const evs = (Array.isArray(o.events) ? o.events : []).filter(e => e && !e.allDay && !e.bg && Number.isFinite(e.start) && Number.isFinite(e.end));
  const plans = (Array.isArray(o.plans) ? o.plans : []).filter(p => p && Number.isFinite(p.start) && Number.isFinite(p.end));
  const clip = (list) => planMergeBusy(list).reduce((n, [s, e]) => n + _planOverlap(s, e, lo, hi), 0);
  const meetingMin = clip(evs), plannedMin = clip(plans), busyMin = clip(evs.concat(plans));
  const freeMin = Math.max(0, windowMin - busyMin);
  const loadMin = (Array.isArray(o.load) ? o.load : []).reduce((n, t) => n + (Number(t && t.minutes) > 0 ? Number(t.minutes) : 0), 0);
  const spareMin = freeMin - loadMin;
  return {
    work, windowMin, meetingMin, plannedMin, busyMin, freeMin, loadMin, spareMin, over: spareMin < 0,
    ratio: windowMin ? Math.round(((busyMin + loadMin) / windowMin) * 100) / 100 : (busyMin + loadMin ? 1 : 0),
    gaps: windowMin ? planFreeGaps(evs.concat(plans), { start: lo, end: hi, min: 30 }) : [],
  };
}

/** How much a task wants time today: {score, why[]} ('overdue', 'due today', 'due tomorrow', 'due soon', 'planned', 'p1', 'in progress', 'pinned'). */
function planTaskScore(t, today) {
  let score = 0; const why = [];
  const due = t && _planIsIso(t.due) ? t.due : null;
  if (due && today) {
    const d = _planDaysBetween(today, due);
    if (d < 0) { score += 50; why.push('overdue'); }
    else if (d === 0) { score += 40; why.push('due today'); }
    else if (d === 1) { score += 25; why.push('due tomorrow'); }
    else if (d <= 7) { score += 10 - d; why.push('due soon'); }
  }
  if (t && t.plannedFor && today && t.plannedFor <= today) { score += 20; why.push('planned'); }
  const pr = t && t.priority;
  if (pr === 'p1') { score += 15; why.push('p1'); } else if (pr === 'p2') score += 8; else if (pr === 'p3') score += 3;
  if (t && t.doing) { score += 10; why.push('in progress'); }
  if (t && t.pinned) { score += 5; why.push('pinned'); }
  return { score, why };
}
function _planTaskMinutes(t) {
  const n = Number(t && t.minutes);
  return Math.max(PLAN_MIN_MINUTES, Math.min(PLAN_MAX_MINUTES, Math.round(n > 0 ? n : PLAN_DEFAULT_MINUTES)));
}
/**
 * The tasks that fit one free gap ({start, end} or {minutes}), best first.
 * Tasks that already have a slot on o.today are left out. o: {today, limit (5), fill}
 * -> [{id, title, minutes, score, why, fit (minutes / gap)}]
 */
function homeGapCandidates(gap, tasks, o) {
  o = o || {};
  const len = gap ? (Number.isFinite(gap.minutes) ? gap.minutes : (gap.end - gap.start)) : 0;
  if (!(len > 0)) return [];
  const out = [];
  for (const t of Array.isArray(tasks) ? tasks : []) {
    if (!t || !t.id) continue;
    if (t.plannedTime && t.plannedFor && t.plannedFor === o.today) continue;
    const minutes = _planTaskMinutes(t);
    if (minutes > len) continue;
    const s = planTaskScore(t, o.today);
    const fit = Math.round((minutes / len) * 100) / 100;
    out.push({ id: t.id, title: t.title || '', minutes, score: s.score + fit * 6, why: s.why, fit });
  }
  out.sort((a, b) => b.score - a.score || b.minutes - a.minutes || String(a.title).localeCompare(String(b.title)));
  return out.slice(0, Number.isFinite(o.limit) ? o.limit : 5);
}
/**
 * Fill the free gaps with tasks, best first, earliest gap that fits, back to
 * back with a small buffer. o: {date, today, gaps: [{start, end}], tasks,
 * buffer (5), step (5: starts on a multiple), max (8)}
 * -> {slots: [{id, title, date, time, start, end, minutes}], left: [ids that did not fit]}
 */
function homeAutoPlan(o) {
  o = o || {};
  const step = Number.isFinite(o.step) && o.step > 0 ? o.step : 5;
  const buffer = Number.isFinite(o.buffer) ? Math.max(0, o.buffer) : 5;
  const max = Number.isFinite(o.max) ? o.max : 8;
  const today = o.today || o.date;
  const cursors = (Array.isArray(o.gaps) ? o.gaps : []).filter(g => g && g.end > g.start).map(g => ({ at: Math.ceil(g.start / step) * step, end: g.end })).sort((a, b) => a.at - b.at);
  const ranked = (Array.isArray(o.tasks) ? o.tasks : []).filter(t => t && t.id && !(t.plannedTime && t.plannedFor === o.date))
    .map(t => ({ t, minutes: _planTaskMinutes(t), s: planTaskScore(t, today).score }))
    .sort((a, b) => b.s - a.s || b.minutes - a.minutes || String(a.t.title || '').localeCompare(String(b.t.title || '')));
  const slots = [], left = [];
  for (const r of ranked) {
    if (slots.length >= max) { left.push(r.t.id); continue; }
    const c = cursors.find(x => x.at + r.minutes <= x.end);
    if (!c) { left.push(r.t.id); continue; }
    const start = c.at, end = start + r.minutes;
    slots.push({ id: r.t.id, title: r.t.title || '', date: o.date, time: _planHM(start), start, end, minutes: r.minutes });
    c.at = Math.ceil((end + buffer) / step) * step;
  }
  slots.sort((a, b) => a.start - b.start);
  return { slots, left };
}
