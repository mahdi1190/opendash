/* ============================================================
   DAILY CAPACITY (owner: Tasks views, 2.16). How a day's task estimates
   compare with the free hours the calendar leaves inside the working hours
   (config.workHours, 20-task-plan.js): "Tue: 7 h of tasks, 3 h free".
   Shown on the week timeline's day heads, the week strip (Today, Upcoming,
   day views) and Upcoming's day headers, with a note on overloaded days.
   Counts ALL open tasks (a day is a day, whatever list is on screen):
   a task belongs to the day it is planned for (an old plan counts as
   today), else its due day (overdue counts as today). A planned slot counts
   its length; a task without an estimate counts PLAN_DEFAULT_MINUTES.
     viewsTaskDay(item, today)        -> 'YYYY-MM-DD' | null
     viewsDayCapacity(iso)            -> {iso, past, isToday, work, taskMin, freeMin, meetingMin,
                                          windowMin, count, unestimated, over, tight, overMin, calOk}
     viewsHours(min)                  '7 h' · '1.5 h' · '45 min'
     viewsCapacityText(cap, o)        'Tue: 7 h of tasks, 3 h free'
     viewsCapacityMeter(cap, o)       the small bar + label (o.label false: bar only)
     viewsCapacityDecorate(el, iso, o) adds it to a strip day (o.kind 'strip') or a header ('header')
     viewsCapacityNote()              Upcoming's "heads up" line, null when no day is over
     viewsMoveToDay(ids, iso, o)      move tasks to a day the timeline way (see the function)
     viewsBalanceProposals(fromIso)   the moves that even out the next 7 days
     viewsOpenBalance(anchor)         "Even out the week": pick the moves (selectList), Apply
   ============================================================ */
let _vwCapMemo = { key: '', days: null, index: null };
function _vwNowMin() { const p = Clock.parts(typeof Clock.now === 'function' ? Clock.now() : Date.now()); return p.h * 60 + p.mi; }
function _vwCapKey() {
  const cal = typeof CalStore !== 'undefined' && CalStore && CalStore.data ? (CalStore.data.fetchedAt || '') + ':' + ((CalStore.data.events || []).length) : '';
  return [state._lastSave || 0, (state.custom || []).length, todayStr(), Math.floor(Date.now() / 300000), cal,
    JSON.stringify((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.workHours) || null)].join('|');
}
function viewsTaskDay(item, today) {
  today = today || todayStr();
  if (item.plannedFor) return item.plannedFor < today ? today : item.plannedFor;
  const due = effDate(item);
  if (!due) return null;
  return due < today ? today : due;
}
/** Open tasks by day (memoised per save / calendar load / five minutes). */
function _vwDayIndex() {
  const key = _vwCapKey();
  if (_vwCapMemo.key !== key) _vwCapMemo = { key, days: new Map(), index: null };
  if (_vwCapMemo.index) return _vwCapMemo.index;
  const today = todayStr();
  const ix = new Map();
  for (const it of getAllItems()) {
    if (statusOf(it.id) === 'done') continue;
    const d = viewsTaskDay(it, today);
    if (!d) continue;
    if (!ix.has(d)) ix.set(d, []);
    ix.get(d).push(it);
  }
  _vwCapMemo.index = ix;
  return ix;
}
function _vwTaskMinutes(it) {
  const slot = it.plannedTime ? planSlotOf(it) : null;
  if (slot) return { min: slot.minutes, est: true };
  const n = Number(it.estimate);
  return n > 0 ? { min: n, est: true } : { min: PLAN_DEFAULT_MINUTES, est: false };
}
function _vwCalOk() {
  try { return typeof homeCalStatus === 'function' ? !!homeCalStatus().ok : false; } catch (e) { return false; }
}
function viewsDayCapacity(iso) {
  _vwDayIndex();
  const memo = _vwCapMemo.days;
  if (memo.has(iso)) return memo.get(iso);
  const today = todayStr();
  const wh = homeWorkHours();
  const isToday = iso === today, past = iso < today;
  const lo = isToday ? Math.max(wh.startMin, _vwNowMin()) : wh.startMin, hi = wh.endMin;
  const windowMin = past ? 0 : Math.max(0, hi - lo);
  const calOk = _vwCalOk();
  let meetingMin = 0;
  if (calOk && windowMin) {
    const evs = (typeof homeCalEvents === 'function' ? homeCalEvents(iso) : []).filter(e => !e.allDay && !e.bg);
    meetingMin = planMergeBusy(evs.map(e => ({ start: e.start, end: e.end }))).reduce((n, [s, e]) => n + Math.max(0, Math.min(e, hi) - Math.max(s, lo)), 0);
  }
  const items = _vwDayIndex().get(iso) || [];
  let taskMin = 0, unestimated = 0;
  for (const it of items) { const m = _vwTaskMinutes(it); taskMin += m.min; if (!m.est) unestimated++; }
  const freeMin = Math.max(0, windowMin - meetingMin);
  // Today after hours is not 'overloaded' (the window just closed): the meter still says no time is left.
  const over = !past && taskMin > 0 && taskMin > freeMin && !(isToday && windowMin === 0);
  const cap = {
    iso, past, isToday, work: planIsWorkDay(wh, iso), taskMin, freeMin, meetingMin, windowMin, count: items.length, unestimated,
    over, tight: !over && !past && taskMin > 0 && taskMin > freeMin * 0.8, overMin: Math.max(0, taskMin - freeMin), calOk,
  };
  memo.set(iso, cap);
  return cap;
}
function viewsHours(min) {
  min = Math.max(0, Math.round(Number(min) || 0));
  if (min < 60) return min + ' min';
  const h = Math.round(min / 30) / 2;
  return (Number.isInteger(h) ? h : h.toFixed(1)) + ' h';
}
function _vwDayShort(iso) { return _dayLabel(iso, { weekday: 'short' }); }
function viewsCapacityText(cap, o) {
  o = o || {};
  const day = o.day === false ? '' : _vwDayShort(cap.iso) + ': ';
  if (cap.past) return day + 'past';
  const free = cap.windowMin ? `${viewsHours(cap.freeMin)} free` : 'no working time left';
  const tasks = cap.count ? `${viewsHours(cap.taskMin)} of tasks` : 'no tasks';
  return day + tasks + ', ' + free + (cap.work ? '' : ' (a day off)');
}
function _vwCapTitle(cap) {
  const lines = [viewsCapacityText(cap)];
  if (cap.count) lines.push(`${cap.count} task${cap.count === 1 ? '' : 's'}` + (cap.unestimated ? `, ${cap.unestimated} without an estimate (counted as ${PLAN_DEFAULT_MINUTES} min)` : ''));
  if (cap.over) lines.push(`Over by ${viewsHours(cap.overMin)}`);
  if (!cap.calOk) lines.push('No calendar: free time is your working hours');
  else if (cap.meetingMin) lines.push(`${viewsHours(cap.meetingMin)} in meetings`);
  if (cap.isToday) lines.push('Free time counts from now');
  return lines.join('\n');
}
/** A small bar (tasks against free time) and, unless o.label is false, '3 h / 5 h'. */
function viewsCapacityMeter(cap, o) {
  o = o || {};
  const el = document.createElement('span');
  el.className = 'vw-cap' + (cap.over ? ' is-over' : cap.tight ? ' is-tight' : '') + (cap.count ? '' : ' is-empty') + (cap.work ? '' : ' is-off');
  el.title = _vwCapTitle(cap);
  const pct = cap.freeMin ? Math.min(100, Math.round(cap.taskMin / cap.freeMin * 100)) : cap.taskMin ? 100 : 0;
  el.innerHTML = `<span class="vw-cap-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>`
    + (o.label === false ? '' : `<span class="vw-cap-t">${cap.over ? icon('triangle-alert', 'i-xs') : ''}${esc(cap.count ? viewsHours(cap.taskMin) : '0')}<span class="vw-cap-of"> / ${esc(viewsHours(cap.freeMin))} free</span></span>`);
  el.setAttribute('aria-label', viewsCapacityText(cap) + (cap.over ? ', overloaded' : ''));
  return el;
}
function viewsCapacityDecorate(el, iso, o) {
  o = o || {};
  if (!el || !iso || iso < todayStr()) return;
  let cap;
  try { cap = viewsDayCapacity(iso); } catch (e) { return; }
  if (o.kind === 'strip') {
    // The strip's day buttons: a red corner when over, the numbers in the tooltip.
    if (cap.over) { el.classList.add('vw-over'); el.insertAdjacentHTML('beforeend', `<span class="vw-over-dot" aria-hidden="true"></span>`); }
    else if (cap.tight) el.classList.add('vw-tight');
    if (cap.count) el.title = (el.title ? el.title + '\n' : '') + viewsCapacityText(cap, { day: false }) + (cap.over ? ` · over by ${viewsHours(cap.overMin)}` : '');
    return;
  }
  if (!cap.count) return;
  const m = viewsCapacityMeter(cap);
  m.classList.add('vw-cap-h');
  el.appendChild(m);
}

/** Upcoming: "Heads up: Tue: 7 h of tasks, 3 h free · Thu ..." with Even out and Timeline. */
function viewsCapacityNote() {
  const over = [];
  for (let i = 0; i < 7; i++) { const c = viewsDayCapacity(_isoPlus(i)); if (c.over) over.push(c); }
  if (!over.length) return null;
  const el = document.createElement('div'); el.className = 'vw-cap-note'; el.setAttribute('role', 'status');
  el.innerHTML = icon('gauge') + `<span class="vw-cap-note-t"><b>${over.length === 1 ? 'One day is' : over.length + ' days are'} overloaded.</b> `
    + over.slice(0, 3).map(c => esc(viewsCapacityText(c))).join(' · ') + (over.length > 3 ? ` · +${over.length - 3} more` : '') + '</span>';
  const even = document.createElement('button'); even.type = 'button'; even.className = 'btn btn-secondary btn-sm';
  even.innerHTML = icon('sliders-horizontal', 'i-sm') + '<span>Even out</span>';
  even.onclick = (e) => viewsOpenBalance(e.currentTarget);
  const tl = document.createElement('button'); tl.type = 'button'; tl.className = 'btn btn-ghost btn-sm';
  tl.innerHTML = icon('calendar-range', 'i-sm') + '<span>Timeline</span>';
  tl.onclick = () => viewsSetMode('timeline');
  el.append(even, tl);
  return el;
}

/* ---------- moving a task to a day (the timeline's rule) ---------- */
/**
 * Move tasks to a day, the way the timeline shows them, in ONE undo step:
 *   - on its due day: the plan is taken away (it sits on its deadline);
 *   - before its deadline: it is PLANNED for that day (the deadline stays);
 *   - no deadline, or after it: the deadline moves there (and an old plan goes).
 * A planned time is dropped (it moved off its slot). o: {toast:false, reason, verb}.
 * -> {moved, planned, due} counts.
 */
function viewsMoveToDay(ids, iso, o) {
  o = o || {};
  const r = _vwMoveNoSave(ids, iso, o.reason);
  if (!r.moved) return r;
  saveData(); render();
  if (o.toast === false) return r;
  const mark = undoMark();
  const day = dueMoveLabel(iso);
  let msg;
  if (r.moved === 1) {
    const it = getItem(r.last);
    msg = r.planned ? `Planned for ${day} · still due ${dueMoveLabel(it.dueDate)}` : `Moved to ${day}`;
  } else msg = `${r.moved} tasks moved to ${day}` + (r.planned ? ` (${r.planned} planned, deadlines kept)` : '');
  toast(msg, { kind: 'ok', icon: r.planned ? 'calendar-check' : 'calendar', action: { label: 'Undo', run: () => undoMarked(mark) } });
  return r;
}
/** The change itself, without saving (callers save once). */
function _vwMoveNoSave(ids, iso, reason) {
  ids = (Array.isArray(ids) ? ids : [ids]).filter(id => getItem(id));
  const r = { moved: 0, planned: 0, due: 0, last: null };
  for (const id of ids) {
    const it = getItem(id);
    if (viewsTaskDay(it) === iso && !it.plannedTime) continue;
    const due = it.dueDate || null;
    const plan0 = it.plannedFor || null;
    const clearPlan = () => { delete it.plannedFor; delete it.plannedTime; delete it.plannedMinutes; };
    if (due && iso === due) { if (plan0) { clearPlan(); logActivity(id, 'plan', { from: plan0, to: null, reason: reason || null }); } }
    else if (due && iso < due) {
      it.plannedFor = iso; delete it.plannedTime; delete it.plannedMinutes;
      logActivity(id, 'plan', { from: plan0, to: iso, reason: reason || null }); r.planned++;
    } else {
      logActivity(id, 'date', { from: due, to: iso, reason: reason || null });
      it.dueDate = iso; delete it.dueTime;
      if (plan0) clearPlan();
      r.due++;
    }
    r.moved++; r.last = id;
  }
  return r;
}

/* ---------- Even out the week ---------- */
const _VW_PRIO_EASE = { p0: 0, p3: 1, p2: 2, p1: 9 };
/**
 * The moves that bring overloaded days (from fromIso, 7 days) back under their free time:
 * the easiest tasks first (no or low priority, bigger first), never P1, in progress, pinned
 * or time-blocked ones. Earlier days first (planned, the deadline stays), else the
 * nearest later day with room. -> [{id, title, from, to, minutes, keepsDeadline}]
 */
function viewsBalanceProposals(fromIso) {
  fromIso = fromIso || todayStr();
  const days = []; for (let i = 0; i < 14; i++) days.push(Clock.addDays(fromIso, i));
  const spare = new Map(days.map(d => { const c = viewsDayCapacity(d); return [d, c.freeMin - c.taskMin]; }));
  const ix = _vwDayIndex();
  const out = [];
  for (const d of days.slice(0, 7)) {
    if (!(spare.get(d) < 0)) continue;
    const movable = (ix.get(d) || []).filter(it => effPriority(it) !== 'p1' && statusOf(it.id) !== 'doing' && !isPinned(it.id) && !it.plannedTime)
      .map(it => ({ it, min: _vwTaskMinutes(it).min }))
      .sort((a, b) => (_VW_PRIO_EASE[effPriority(a.it)] ?? 0) - (_VW_PRIO_EASE[effPriority(b.it)] ?? 0) || b.min - a.min);
    for (const { it, min } of movable) {
      if (!(spare.get(d) < 0)) break;
      const earlier = days.filter(x => x < d && spare.get(x) >= min).sort((a, b) => spare.get(b) - spare.get(a))[0];
      const later = earlier ? null : days.find(x => x > d && spare.get(x) >= min);
      const to = earlier || later;
      if (!to) continue;
      spare.set(d, spare.get(d) + min); spare.set(to, spare.get(to) - min);
      out.push({ id: it.id, title: effTitle(it), from: d, to, minutes: min, keepsDeadline: !!(it.dueDate && to < it.dueDate) });
    }
  }
  return out;
}
function viewsOpenBalance(anchor) {
  const moves = viewsBalanceProposals();
  openPopover(anchor, (el, close) => {
    el.classList.add('pad', 'vw-balance');
    if (!moves.length) {
      el.innerHTML = `<div class="pop-label">Even out the week</div><p class="vw-muted">Nothing can move: what is left on the busy days is high priority, in progress, pinned or time-blocked, or no other day has room.</p>`;
      return;
    }
    el.innerHTML = `<div class="pop-label">Even out the week</div><p class="vw-muted">Easy tasks off the overloaded days, onto days with room. Untick any you want to keep.</p>`;
    const list = document.createElement('div'); list.className = 'vw-bal-list';
    for (const m of moves) {
      const row = document.createElement('div'); row.className = 'vw-bal-row'; row.dataset.selId = m.id;
      row.innerHTML = `<span class="vw-bal-t">${esc(m.title)}</span><span class="vw-bal-m">${esc(_vwDayShort(m.from))} ${icon('arrow-right', 'i-xs')} <b>${esc(_vwDayShort(m.to))}</b> · ${esc(viewsHours(m.minutes))}${m.keepsDeadline ? ' · deadline kept' : ''}</span>`;
      list.appendChild(row);
    }
    el.appendChild(list);
    const apply = (ids) => {
      const pick = moves.filter(m => ids.includes(m.id));
      if (!pick.length) return;
      // One save for all of them, so one Undo takes them all back.
      let n = 0;
      for (const m of pick) n += _vwMoveNoSave([m.id], m.to, 'Evened out the week').moved;
      if (!n) { close(); return { done: ids }; }
      saveData(); render();
      const mark = undoMark();
      close();
      toast(`${n} task${n === 1 ? '' : 's'} moved to quieter days`, { kind: 'ok', icon: 'calendar-check', action: { label: 'Undo', run: () => undoMarked(mark) } });
      return { done: ids };
    };
    if (typeof selectList === 'function') {
      selectList(list, { rows: '.vw-bal-row', key: 'vw-balance:' + Date.now(), defaultOn: true, label: 'Moves', compact: true, rowClick: true,
        labelOf: (row) => row.querySelector('.vw-bal-t').textContent,
        apply: { label: 'Move selected', icon: 'calendar-check', run: (ids) => apply(ids) } });
    } else {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-primary btn-sm';
      b.textContent = `Move ${moves.length}`; b.onclick = () => apply(moves.map(m => m.id));
      el.appendChild(b);
    }
  }, { width: 380, align: 'end' });
}
