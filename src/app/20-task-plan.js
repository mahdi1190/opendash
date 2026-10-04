/* ============================================================
   PLANNED SLOTS AND WORKING HOURS on the page. Owner: W0-B (shared time
   logic). The rules are pure, in 12-home-plan-logic.js (the server runs the
   same file through lib/plan-logic.mjs). CSS: styles/33-plan-slots.css.

   Working hours (config.workHours, Settings > Profile):
     homeWorkHours()                  planWorkHours(APP_CONFIG.workHours), memoised
     homeWorkDay(iso)                 is that day a working day
     homeWorkWindow()                 {workStart, workEnd} in minutes, for homeDayModel(o)
     planSettingsWorkHoursRow()       the Settings > Profile row

   Planned slots (task.plannedFor + plannedTime + plannedMinutes; the deadline
   is never touched). Shown as dashed "Planned" blocks in Today's schedule
   (homeTimedTasks) and the Calendar (calEntriesOn: entries with planned:true,
   key 'p:<id>'), counted as busy when free gaps are worked out.
     setPlannedSlot(id, date, time, minutes, o)
                                      one saveData step + an Undo toast; undefined = keep,
                                      null = clear (see planApplySlot). o: {toast:false,
                                      reason, render:false}. -> true when something changed
     planSlotFor(idOrItem)            the slot (planSlotOf) of an open task, else null
     planSlotsOn(iso, {includeDone})  [{item, slot}] that day, by start
     planSlotLabel(item)              '10:00–11:30', or ''
     planTaskInfo(item)               {id, title, minutes, due, priority, plannedFor, plannedTime,
                                      doing, pinned}: the shape homeGapCandidates / homeAutoPlan take
     homePlanInputs(iso)              {events, plans, load} for homeDayCapacity

   Calendar drag (40-calendar.js / 42-calendar-views.js call these):
     planDragNote(e, id)              at dragstart: what is being dragged (a planned block,
                                      a block with a due time, or a task)
     planDragPreview(id)              while over a time: {minutes, label} when the drop plans a slot
     planDropOnTime(id, iso, hm)      true when handled: a task or a planned block dropped on a
                                      time gets a planned slot there (its deadline stays). A block
                                      with a due time keeps moving its due time (calScheduleTask).
     planDropOnDay(id, where)         true when handled: a planned block dropped on a day
   ============================================================ */
let _planWhKey = null, _planWh = null;
function homeWorkHours() {
  const raw = typeof APP_CONFIG !== 'undefined' && APP_CONFIG ? APP_CONFIG.workHours : null;
  const key = JSON.stringify(raw || null);
  if (key !== _planWhKey || !_planWh) { _planWhKey = key; _planWh = planWorkHours(raw || null); }
  return _planWh;
}
function homeWorkDay(iso) { return planIsWorkDay(homeWorkHours(), iso || todayStr()); }
function homeWorkWindow() { const w = homeWorkHours(); return { workStart: w.startMin, workEnd: w.endMin }; }

/* ---------- slots ---------- */
function _planDayText(iso) {
  const t = todayStr();
  if (iso === t) return 'today';
  if (typeof daysUntil === 'function' && daysUntil(iso) === 1) return 'tomorrow';
  try { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined, { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return iso; }
}
function _planRestore(id, before) {
  const it = getItem(id); if (!it) return;
  for (const k of ['plannedFor', 'plannedTime', 'plannedMinutes']) { if (before[k] == null) delete it[k]; else it[k] = before[k]; }
  saveData(); render();
}
function setPlannedSlot(id, date, time, minutes, o) {
  o = o || {};
  const item = getItem(id); if (!item) return false;
  const before = { plannedFor: item.plannedFor, plannedTime: item.plannedTime, plannedMinutes: item.plannedMinutes };
  if (minutes != null) minutes = Math.max(PLAN_MIN_MINUTES, Math.min(PLAN_MAX_MINUTES, Math.round(Number(minutes) / 5) * 5 || PLAN_MIN_MINUTES));
  const r = planApplySlot(item, { date, time, minutes });
  if (r.error) { if (o.toast !== false) toast(r.error, { kind: 'err' }); return false; }
  if (!r.changed) return false;
  logActivity(id, 'plan', { from: r.from.date, to: r.to.date, ...(r.to.time ? { time: r.to.time } : {}), ...(r.to.time && r.to.minutes ? { minutes: r.to.minutes } : {}), ...(o.reason ? { reason: o.reason } : {}) });
  saveData();
  if (o.render !== false) render();
  if (o.toast !== false) {
    const slot = planSlotOf(item);
    const msg = !r.to.date ? 'Removed from the plan'
      : slot ? `Planned ${_planDayText(slot.date)}, ${planSlotText(slot)}` + (effDate(item) ? ' · the deadline stays' : '')
      : r.from.time && r.from.date === r.to.date ? 'Planned time removed' : `Planned for ${_planDayText(r.to.date)}`;
    toast(msg, { kind: 'ok', icon: 'calendar-clock', action: { label: 'Undo', run: () => _planRestore(id, before) } });
  }
  return true;
}
function planSlotFor(x) {
  const it = typeof x === 'string' ? getItem(x) : x;
  if (!it || (state.deleted && state.deleted[it.id]) || statusOf(it.id) === 'done') return null;
  return planSlotOf(it);
}
function planSlotsOn(iso, o) {
  o = o || {};
  const out = [];
  for (const item of getAllItems()) {
    if (item.plannedFor !== iso || !item.plannedTime) continue;
    if (!o.includeDone && statusOf(item.id) === 'done') continue;
    const slot = planSlotOf(item);
    if (slot) out.push({ item, slot });
  }
  return out.sort((a, b) => a.slot.start - b.slot.start || a.slot.end - b.slot.end);
}
function planSlotLabel(item) { const s = item ? planSlotOf(item) : null; return s ? planSlotText(s) : ''; }
function planTaskInfo(item) {
  return {
    id: item.id, title: effTitle(item), minutes: Number(item.estimate) > 0 ? Number(item.estimate) : PLAN_DEFAULT_MINUTES,
    due: effDate(item) || null, priority: effPriority(item), plannedFor: item.plannedFor || null, plannedTime: item.plannedTime || null,
    doing: statusOf(item.id) === 'doing', pinned: typeof isPinned === 'function' ? !!isPinned(item.id) : false,
  };
}
/** What homeDayCapacity needs for one day: timed events, planned slots, and the open tasks wanting time without a slot. */
function homePlanInputs(iso) {
  iso = iso || todayStr();
  const events = typeof homeCalEvents === 'function' ? homeCalEvents(iso).filter(e => !e.allDay && !e.bg).map(e => ({ start: e.start, end: e.end })) : [];
  const plans = planSlotsOn(iso).map(p => ({ start: p.slot.start, end: p.slot.end, id: p.item.id }));
  const load = [];
  for (const item of getAllItems()) {
    if (statusOf(item.id) === 'done' || (item.plannedFor === iso && item.plannedTime)) continue;
    const due = effDate(item);
    if ((due && due <= iso) || (item.plannedFor && item.plannedFor <= iso)) load.push({ id: item.id, minutes: Number(item.estimate) > 0 ? Number(item.estimate) : PLAN_DEFAULT_MINUTES });
  }
  return { events, plans, load, workHours: homeWorkHours(), date: iso };
}

/* ---------- calendar drag: plan a slot, never move the deadline by accident ---------- */
let _planDragMode = '';          // 'plan' (a planned block) | 'due' (a block with a due time) | 'task'
function planDragNote(e, id) {
  const t = e && e.target && e.target.closest ? e.target : null;
  const el = t ? t.closest('[data-kind="task"]') : null;
  _planDragMode = el && el.dataset.plan ? 'plan' : el && el.classList.contains('wv-ev') && el.classList.contains('is-task') ? 'due' : 'task';
  document.addEventListener('dragend', () => { _planDragMode = ''; }, { once: true, capture: true });
}
function planDragPreview(id) {
  if (_planDragMode !== 'plan' && _planDragMode !== 'task') return null;
  const it = getItem(id); if (!it) return null;
  return { minutes: _planDragMode === 'plan' ? planSlotMinutes(it) : Math.max(PLAN_MIN_MINUTES, Math.min(8 * 60, Number(it.estimate) > 0 ? Number(it.estimate) : PLAN_DEFAULT_MINUTES)), label: 'Plan' };
}
function planDropOnTime(id, iso, hm) {
  if (_planDragMode !== 'plan' && _planDragMode !== 'task') return false;
  if (!getItem(id)) return true;
  // The length stays: a planned block keeps its own, a task gets its estimate (else 30 min).
  setPlannedSlot(id, iso, hm, undefined, { reason: 'Planned on the calendar' });
  return true;
}
function planDropOnDay(id, where) {
  if (_planDragMode !== 'plan' || !where || !where.date) return false;
  setPlannedSlot(id, where.date, where.time === null ? null : undefined, undefined, { reason: 'Planned on the calendar' });
  return true;
}

/* ---------- Settings > Profile: working hours ---------- */
function planSettingsWorkHoursRow() {
  const wh = homeWorkHours();
  const box = document.createElement('div'); box.className = 'set-workhours';
  const mk = (val, label) => { const i = document.createElement('input'); i.type = 'time'; i.step = 900; i.className = 'control control-sm set-wh-time'; i.value = val; i.setAttribute('aria-label', label); return i; };
  const start = mk(wh.start, 'Working day starts'), end = mk(wh.end === '24:00' ? '23:59' : wh.end, 'Working day ends');
  const to = document.createElement('span'); to.className = 'set-wh-to'; to.textContent = 'to';
  const days = document.createElement('div'); days.className = 'set-wh-days'; days.setAttribute('role', 'group'); days.setAttribute('aria-label', 'Working days');
  const ws = typeof _weekStartIndex === 'function' ? _weekStartIndex() : 1;
  const L = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined;
  for (let i = 0; i < 7; i++) {
    const d = (ws + i) % 7;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'set-wh-day'; b.dataset.d = String(d);
    const name = new Date(2024, 0, 7 + d);       // 7 Jan 2024 was a Sunday
    b.textContent = name.toLocaleDateString(L, { weekday: 'narrow' });
    b.setAttribute('aria-label', name.toLocaleDateString(L, { weekday: 'long' }));
    b.setAttribute('aria-pressed', wh.days.includes(d) ? 'true' : 'false');
    days.appendChild(b);
  }
  const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'btn btn-ghost btn-sm set-wh-reset'; reset.textContent = 'Reset';
  reset.hidden = !wh.custom;
  const save = async (patch, msg) => {
    if (patch) {
      const err = planWorkHoursCheck(patch);
      if (err) { toast(err, { kind: 'err' }); start.value = homeWorkHours().start; end.value = homeWorkHours().end; return; }
      const cur = homeWorkHours();
      if (cur.custom && patch.start === cur.start && patch.end === cur.end && patch.days.join() === cur.days.join()) return;
    }
    if (typeof settingsSaveConfig === 'function' && await settingsSaveConfig({ workHours: patch }, msg)) { reset.hidden = !homeWorkHours().custom; render(); }
  };
  const read = () => ({ start: start.value, end: end.value, days: [...days.querySelectorAll('[aria-pressed="true"]')].map(b => Number(b.dataset.d)).sort((a, b) => a - b) });
  start.onchange = end.onchange = () => save(read(), 'Working hours saved');
  days.addEventListener('click', (e) => {
    const b = e.target.closest('.set-wh-day'); if (!b) return;
    const on = b.getAttribute('aria-pressed') === 'true';
    if (on && days.querySelectorAll('[aria-pressed="true"]').length === 1) { toast('Keep at least one working day', { kind: 'err' }); return; }
    b.setAttribute('aria-pressed', on ? 'false' : 'true');
    save(read(), 'Working days saved');
  });
  reset.onclick = () => {
    const d = planWorkHours(null);
    start.value = d.start; end.value = d.end;
    for (const b of days.querySelectorAll('.set-wh-day')) b.setAttribute('aria-pressed', d.days.includes(Number(b.dataset.d)) ? 'true' : 'false');
    save(null, 'Working hours reset');
  };
  const times = document.createElement('div'); times.className = 'set-wh-times';
  times.append(start, to, end, reset);
  box.append(times, days);
  return _settingsRow('Working hours', 'Free time, focus gaps and planning use these hours (default 09:00 to 18:00, Monday to Friday).', box);
}
