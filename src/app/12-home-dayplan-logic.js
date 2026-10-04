/* ============================================================
   PLAN MY DAY: the pure rules of the "dayplan" Home widget
   (WIDGETS_CATALOGUE.md 3.3). OWNER: the "dayplan" widget builder.
   No DOM, no page state and no clock: the widget (12-home-w-dayplan.js)
   gathers the day and passes it in. tests/home-w-dayplan.test.mjs runs this
   file in a VM with 12-home-plan-logic.js (W0-B), whose homeDayCapacity,
   planFreeGaps, planSlotOf, planTaskScore and homeAutoPlan it uses (called
   at run time only, so the load order does not matter).
   Times are minutes since midnight; days are 'YYYY-MM-DD'.

     homeDayplanModel(o)              the day: capacity, today's rows, the plan lane, free gaps
     homeDayplanDur(min)              '50 min', '4 h', '4 h 10'
     homeDayplanSayDur(min)           '4 hours 10 minutes' (screen readers)
     homeDayplanCapText(m)            'Planned 4 h 10 in 3 h 20 free · 50 min over'
     homeDayplanAuto(m, o)            the auto-plan proposal over the free gaps
     homeDayplanTomorrowPick(m)       "Move N to tomorrow": low-priority, only-planned tasks until the day fits
     homeDayplanPullPick(m, cands, n) "Pull 3 from Focus": the first n candidates not on today
     homeDayplanDropAt(m, at, minutes, o)  a drop on the timeline: snapped start, ok, what it overlaps
     homeDayplanPlanAt(m, minutes, o) the "Plan at…" choices: one start per free gap that fits

   Model input o:
     today, nowMin (null = the whole working window, not today),
     workHours (planWorkHours shape: {startMin, endMin, days, ...}),
     events: [{id, title, start, end, color?}]   timed meetings (the caller leaves out
                                                 all-day, background, declined and own blocks)
     own:    [{id, title, start, end, taskId}]   the dashboard's own blocks that day (eventMeta origin)
     tasks:  [{id, title, stream, priority, estimate, due, dueTime, plannedFor, plannedTime,
               plannedMinutes, doing, pinned, focus (rank in Focus, -1 = not)}]   open tasks in Today
     unestimated (30): minutes for a task with no estimate; buffer (5): minutes kept between blocks
   ============================================================ */
const HOME_DAYPLAN_ESTIMATES = Object.freeze([15, 30, 60, 120]);
const HOME_DAYPLAN_STEP = 15;                 // drops snap to a quarter hour
const HOME_DAYPLAN_GAP_MIN = 15;              // shorter free stretches are not gaps
const HOME_DAYPLAN_TIGHT = 0.85;              // below this share of the free time: green
const _HDP_PRIO_RANK = Object.freeze({ p1: 0, p2: 1, p3: 2, p0: 3 });

function _hdpHM(min) {
  const m = Math.max(0, Math.min(24 * 60, Math.round(Number(min) || 0)));
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
function _hdpMinOf(hm) { const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hm || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function _hdpDaysBetween(a, b) {
  const n = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000); };
  return n(b) - n(a);
}
function _hdpPrio(p) { return Object.prototype.hasOwnProperty.call(_HDP_PRIO_RANK, p) ? _HDP_PRIO_RANK[p] : 3; }
function _hdpClampMin(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

/** '50 min', '4 h', '4 h 10'. */
function homeDayplanDur(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r}` : `${h} h`;
}
/** '4 hours 10 minutes' for a screen reader. */
function homeDayplanSayDur(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  const h = Math.floor(m / 60), r = m % 60;
  const hs = h ? `${h} hour${h === 1 ? '' : 's'}` : '', rs = r || !h ? `${r} minute${r === 1 ? '' : 's'}` : '';
  return [hs, rs].filter(Boolean).join(' ');
}

/** The day, ready to draw. See the header for o. */
function homeDayplanModel(o) {
  o = o || {};
  const wh = o.workHours && Number.isFinite(o.workHours.startMin) ? o.workHours : planWorkHours(null);
  const today = o.today;
  const unest = Number.isFinite(o.unestimated) && o.unestimated > 0 ? Math.round(o.unestimated) : PLAN_DEFAULT_MINUTES;
  const now = Number.isFinite(o.nowMin) ? o.nowMin : null;
  const start = wh.startMin, end = wh.endMin;
  // Plans start on the next 5 minutes from now, never before the working day.
  const from = now === null ? start : Math.min(end, Math.max(start, Math.ceil(now / 5) * 5));
  const pastOf = (x) => now !== null && x.end <= now;

  const events = (Array.isArray(o.events) ? o.events : []).filter(e => e && Number.isFinite(e.start) && Number.isFinite(e.end) && e.end > e.start)
    .map(e => ({ kind: 'event', key: 'e:' + e.id, id: String(e.id), title: String(e.title || ''), start: e.start, end: Math.min(24 * 60, e.end), color: e.color || '', past: false }))
    .sort((a, b) => a.start - b.start || a.end - b.end || a.title.localeCompare(b.title));
  for (const e of events) e.past = pastOf(e);

  // The plan lane: own calendar blocks, planned slots, tasks with a due time today.
  const lane = [];
  const byTask = new Map();
  const ownOf = new Map();
  for (const b of Array.isArray(o.own) ? o.own : []) {
    if (!b || !Number.isFinite(b.start) || !Number.isFinite(b.end) || b.end <= b.start) continue;
    const it = { kind: 'block', key: 'b:' + b.id, id: String(b.id), eventId: String(b.id), taskId: b.taskId || null, title: String(b.title || ''), stream: '', start: b.start, end: Math.min(24 * 60, b.end), past: false };
    it.minutes = it.end - it.start; it.past = pastOf(it);
    lane.push(it);
    if (it.taskId && !ownOf.has(it.taskId)) ownOf.set(it.taskId, it);
  }
  const tasks = (Array.isArray(o.tasks) ? o.tasks : []).filter(t => t && t.id);
  for (const t of tasks) {
    const slot = typeof planSlotOf === 'function' ? planSlotOf(t) : null;
    let it = null;
    if (slot && slot.date === today) it = { kind: 'slot', key: 'p:' + t.id, start: slot.start, end: slot.end, minutes: slot.minutes };
    else if (t.due === today && _hdpMinOf(t.dueTime) !== null) {
      const s = _hdpMinOf(t.dueTime), mins = _hdpClampMin(Number(t.estimate) > 0 ? Math.round(Number(t.estimate)) : unest, PLAN_MIN_MINUTES, PLAN_MAX_MINUTES);
      it = { kind: 'due', key: 't:' + t.id, start: s, end: Math.min(24 * 60, s + mins), minutes: mins };
    }
    if (!it) continue;
    Object.assign(it, { id: t.id, taskId: t.id, title: String(t.title || ''), stream: t.stream || '' });
    it.past = pastOf(it);
    lane.push(it);
    byTask.set(t.id, it);
  }
  // A block in the calendar for the task: it is placed (unless it also has a slot of its own).
  for (const [tid, b] of ownOf) {
    if (byTask.has(tid)) continue;
    const t = tasks.find(x => x.id === tid);
    if (t) { b.stream = t.stream || ''; if (!b.title) b.title = String(t.title || ''); }
    byTask.set(tid, b);
  }
  lane.sort((a, b) => a.start - b.start || a.end - b.end || String(a.title).localeCompare(String(b.title)));

  // Today's rows.
  const rows = tasks.map(t => {
    const est = Number(t.estimate) > 0 ? Math.round(Number(t.estimate)) : null;
    const due = t.due || null;
    const d = due && today ? _hdpDaysBetween(today, due) : null;
    const dueState = d === null ? null : d < 0 ? 'overdue' : d === 0 ? 'today' : null;
    const planned = !!(t.plannedFor && today && t.plannedFor <= today);
    const focus = Number.isFinite(t.focus) ? t.focus : -1;
    const sc = planTaskScore({ due, priority: t.priority, plannedFor: t.plannedFor, doing: !!t.doing, pinned: !!t.pinned }, today);
    return {
      id: t.id, title: String(t.title || ''), stream: t.stream || '', priority: t.priority || 'p0',
      estimate: est, estimated: !!est, minutes: _hdpClampMin(est || unest, PLAN_MIN_MINUTES, PLAN_MAX_MINUTES),
      due, dueState, planned, onlyPlanned: !dueState && planned, doing: !!t.doing, pinned: !!t.pinned, focus,
      place: byTask.get(t.id) || null, score: sc.score + (focus >= 0 ? 6 - Math.min(5, focus) : 0), why: sc.why,
    };
  });
  const placed = rows.filter(r => r.place).sort((a, b) => a.place.start - b.place.start || a.title.localeCompare(b.title));
  const unplaced = rows.filter(r => !r.place).sort((a, b) => b.score - a.score || _hdpPrio(a.priority) - _hdpPrio(b.priority) || a.title.localeCompare(b.title));

  // Free gaps (15 min+) from now to the end of the working day, around everything timed.
  const busy = events.map(e => [e.start, e.end]).concat(lane.map(x => [x.start, x.end]));
  const gaps = from < end ? planFreeGaps(busy, { start, end, from, min: HOME_DAYPLAN_GAP_MIN }) : [];

  // Capacity: what wants time (planned blocks still to come + tasks with no time) against
  // the free time left in the working day (the window minus meetings).
  const c = homeDayCapacity({ workHours: wh, date: today, nowMin: now, events: events.map(e => ({ start: e.start, end: e.end })),
    plans: lane.map(x => ({ start: x.start, end: x.end })), load: unplaced.map(r => ({ minutes: r.minutes })) });
  const needMin = c.plannedMin + c.loadMin;
  const availMin = Math.max(0, c.windowMin - c.meetingMin);
  const overMin = Math.max(0, needMin - availMin);
  const ratio = availMin ? Math.round((needMin / availMin) * 100) / 100 : needMin ? 9.99 : 0;
  const cap = {
    work: c.work, windowMin: c.windowMin, meetingMin: c.meetingMin, plannedMin: c.plannedMin, loadMin: c.loadMin,
    needMin, availMin, overMin, spareMin: Math.max(0, availMin - needMin), over: overMin > 0, ratio,
    level: overMin > 0 ? 'over' : ratio < HOME_DAYPLAN_TIGHT ? 'ok' : 'tight',
  };
  const sig = [from, cap.level, lane.map(x => x.key + (x.past ? '.' : '')).join(','), events.map(e => e.key + (e.past ? '.' : '')).join(','),
    gaps.map(g => g.start + '-' + g.end).join(','), rows.map(r => r.id).join(',')].join('#');
  return { today, nowMin: now, start, end, from, over: from >= end, work: c.work, events, lane, rows: placed.concat(unplaced), placed, unplaced, gaps, cap, sig, unestimated: unest };
}

/** The capacity as one line of text. */
function homeDayplanCapText(m) {
  const c = m.cap, D = homeDayplanDur;
  if (m.over) return m.unplaced.length ? `Your working day is over · ${m.unplaced.length} without a time` : 'Your working day is over';
  if (!c.needMin) return `Nothing planned · ${D(c.availMin)} free`;
  return `Planned ${D(c.needMin)} in ${D(c.availMin)} free · ${c.over ? D(c.overMin) + ' over' : D(c.spareMin) + ' spare'}`;
}
/** The same, spoken. */
function homeDayplanCapSay(m) {
  const c = m.cap, S = homeDayplanSayDur;
  if (m.over) return homeDayplanCapText(m);
  if (!c.needMin) return `Nothing planned, ${S(c.availMin)} free`;
  return `Planned ${S(c.needMin)} in ${S(c.availMin)} of free time, ${c.over ? S(c.overMin) + ' over' : S(c.spareMin) + ' to spare'}`;
}

/**
 * The auto-plan proposal: the tasks with no time, best first, into the free gaps
 * (homeAutoPlan: greedy, deterministic, never past the working day). The buffer is
 * kept between blocks and next to meetings. o: {buffer, minMinutes (15 when the blocks
 * go to the calendar), maxMinutes (240 then), max (8)}.
 * -> {slots: [{id, title, date, time, start, end, minutes}], left: [ids], minutes}
 */
function homeDayplanAuto(m, o) {
  o = o || {};
  const buffer = Number.isFinite(o.buffer) ? Math.max(0, Math.min(30, o.buffer)) : 5;
  const lo = Number.isFinite(o.minMinutes) ? o.minMinutes : PLAN_MIN_MINUTES;
  const hi = Number.isFinite(o.maxMinutes) ? o.maxMinutes : PLAN_MAX_MINUTES;
  // Trim the buffer off a gap's ends that touch something busy (not "now", not the end of the day).
  const gaps = (m.gaps || []).map(g => ({ start: g.start > m.from ? g.start + buffer : g.start, end: g.end < m.end ? g.end - buffer : g.end })).filter(g => g.end - g.start >= 5);
  const tasks = (m.unplaced || []).map(r => ({ id: r.id, title: r.title, minutes: _hdpClampMin(r.minutes, lo, hi), due: r.due, priority: r.priority,
    plannedFor: r.planned ? m.today : null, plannedTime: null, doing: r.doing, pinned: r.pinned || r.focus >= 0 }));
  const p = homeAutoPlan({ date: m.today, today: m.today, gaps, tasks, buffer, step: 5, max: Number.isFinite(o.max) ? o.max : 8 });
  return { slots: p.slots, left: p.left, minutes: p.slots.reduce((n, s) => n + s.minutes, 0) };
}

/**
 * "Move N to tomorrow": when the day is over capacity, the lowest-priority tasks that are
 * only planned (no deadline today or before; never one in progress, never a block already in
 * the calendar) until what they free covers the overrun. Deterministic.
 * -> {ids, minutes (freed), fits, candidates: [ids in pick order], need (overMin)}
 */
function homeDayplanTomorrowPick(m) {
  const need = m.over ? Infinity : m.cap.overMin;
  const freed = (r) => (r.place ? Math.max(0, r.place.end - Math.max(r.place.start, m.from)) : r.minutes);
  const cands = (m.rows || []).filter(r => r.onlyPlanned && !r.doing && !(r.place && (r.place.kind !== 'slot' || r.place.past)))
    .map(r => ({ r, f: freed(r) }))
    .sort((a, b) => _hdpPrio(b.r.priority) - _hdpPrio(a.r.priority)
      || (a.r.focus >= 0) - (b.r.focus >= 0)
      || String(b.r.due || '9999-12-31').localeCompare(String(a.r.due || '9999-12-31'))
      || b.f - a.f || a.r.title.localeCompare(b.r.title));
  const ids = []; let sum = 0;
  if (need > 0) for (const x of cands) { if (sum >= need) break; ids.push(x.r.id); sum += x.f; }
  return { ids, minutes: sum, fits: need !== Infinity ? sum >= need : ids.length === cands.length, candidates: cands.map(x => x.r.id), need: need === Infinity ? 0 : need };
}

/** "Pull 3 from Focus": the first n of cands ([{id}] in Focus order) that are not on today yet. */
function homeDayplanPullPick(m, cands, n) {
  const on = new Set((m.rows || []).map(r => r.id));
  const out = [];
  for (const c of Array.isArray(cands) ? cands : []) {
    if (!c || !c.id || on.has(c.id) || out.includes(c.id)) continue;
    out.push(c.id);
    if (out.length >= (Number.isFinite(n) ? n : 3)) break;
  }
  return out;
}

/**
 * Where a task dropped at minute `at` would go: snapped to 15 minutes, not before now,
 * ending by the end of the working day. o: {selfId (a block being moved), step}.
 * -> {ok, start, end, minutes, time, reason, clash: {kind, id, title, start, end} | null}
 */
function homeDayplanDropAt(m, at, minutes, o) {
  o = o || {};
  const step = Number.isFinite(o.step) && o.step > 0 ? o.step : HOME_DAYPLAN_STEP;
  const mins = _hdpClampMin(Math.round(Number(minutes) || PLAN_DEFAULT_MINUTES), PLAN_MIN_MINUTES, PLAN_MAX_MINUTES);
  const place = (st) => {
    const first = Math.ceil(m.from / st) * st;
    let s = Math.max(Math.round(Number(at) / st) * st, first);
    if (s + mins > m.end) s = Math.floor((m.end - mins) / st) * st;
    const out = { ok: false, start: s, end: s + mins, minutes: mins, time: _hdpHM(s), reason: '', clash: null };
    if (s < first || m.from >= m.end) { out.reason = m.from >= m.end ? 'Your working day is over' : `No room for ${homeDayplanDur(mins)} before ${_hdpHM(m.end)}`; return out; }
    const hit = (x) => x.start < out.end && x.end > out.start;
    const ev = (m.events || []).find(hit);
    if (ev) { out.clash = { kind: 'event', id: ev.id, title: ev.title, start: ev.start, end: ev.end }; out.reason = `Overlaps ${ev.title || 'an event'} (${_hdpHM(ev.start)}–${_hdpHM(ev.end)})`; return out; }
    const pl = (m.lane || []).find(x => hit(x) && !(o.selfId && (x.taskId === o.selfId || x.id === o.selfId)));
    if (pl) { out.clash = { kind: pl.kind, id: pl.id, title: pl.title, start: pl.start, end: pl.end }; out.reason = `Overlaps ${pl.title || 'a planned block'} (${_hdpHM(pl.start)}–${_hdpHM(pl.end)})`; return out; }
    out.ok = true;
    return out;
  };
  // The quarter hour first; when that clashes, the nearest 5 minutes (a gap that starts at :50).
  const q = place(step);
  if (q.ok || step <= 5) return q;
  const f = place(5);
  return f.ok ? f : q;
}

/**
 * "Plan at…": one start per free gap the task fits (on the quarter hour when that still
 * fits), earliest first. o: {selfId: the task's own block is free space, limit (6)}.
 * -> [{start, end, minutes, time, label, gap: {start, end}}]
 */
function homeDayplanPlanAt(m, minutes, o) {
  o = o || {};
  const mins = _hdpClampMin(Math.round(Number(minutes) || PLAN_DEFAULT_MINUTES), PLAN_MIN_MINUTES, PLAN_MAX_MINUTES);
  let gaps = m.gaps || [];
  if (o.selfId) {
    const busy = (m.events || []).map(e => [e.start, e.end]).concat((m.lane || []).filter(x => x.taskId !== o.selfId).map(x => [x.start, x.end]));
    gaps = m.from < m.end ? planFreeGaps(busy, { start: m.start, end: m.end, from: m.from, min: HOME_DAYPLAN_GAP_MIN }) : [];
  }
  const out = [];
  for (const g of gaps) {
    if (g.end - g.start < mins) continue;
    const q = Math.ceil(g.start / HOME_DAYPLAN_STEP) * HOME_DAYPLAN_STEP;
    const s = q + mins <= g.end ? q : g.start;
    out.push({ start: s, end: s + mins, minutes: mins, time: _hdpHM(s), label: `${_hdpHM(s)}–${_hdpHM(s + mins)}`, gap: { start: g.start, end: g.end } });
    if (out.length >= (Number.isFinite(o.limit) ? o.limit : 6)) break;
  }
  return out;
}
