/* ============================================================
   WEEK TIMELINE (owner: Tasks views, 2.16). A task layout: the days of a
   week as columns. Each day has its head (date, all-day events, daily
   capacity from 31-views-capacity.js, "Plan the day"), a lane of the tasks
   that sit on it, and a time grid with the calendar's events faint in the
   background and time-blocked tasks (planned slots, 20-task-plan.js) on top.
     drop a task on a day head or lane  -> viewsMoveToDay (planned before its
                                           deadline, else the deadline moves)
     drop it on a time                  -> setPlannedSlot: a time block, the deadline stays
     drag a block's bottom edge         -> its length (15 min steps)
     drop on "No date"                  -> the date and plan go
   Keys on a card or block: Enter opens it, arrows move between them,
   Shift+Left/Right moves it a day, Shift+Up/Down moves a block 15 min.
   Which tasks: date lists (Today, Upcoming, All, a day...) show every open
   task; a stream, tag or person list shows its own; a search its hits.
   The week follows state.weekBarOffset (shared with the week strip).
   Prefs (synced taskViewPrefs._timeline): workdays (hide days off), tray (No date shown).
     viewsRenderTimeline(box, o)
     viewsAutoPlanDay(iso, ids)       time-block those tasks into the day's free time (one Undo)
   ============================================================ */
let _vwDrag = null;        // {id, minutes, block} while one of the timeline's own cards is dragged
let _vwFocusId = null;     // the card to focus again after a keyboard move
const _VW_SNAP = 15;
const _VW_EV_COLORS = ['amber', 'blue', 'green', 'indigo', 'orange', 'pink', 'red', 'slate', 'teal', 'violet'];

function _vwDateView(view) { return ['today', 'tomorrow', 'week', 'all', 'no-date'].includes(view) || String(view).startsWith('day:'); }
function _vwTimelineItems(o) {
  if (o.searching) return o.open.slice();
  const all = _vwDateView(o.view);
  return getAllItems().filter(i => statusOf(i.id) !== 'done' && (all || inViewScope(i, o.view)));
}
function _vwTlPrefs() { return taskViewPrefs('_timeline'); }
function _vwPxHour() { return state.density === 'compact' ? 34 : 44; }

function viewsRenderTimeline(box, o) {
  const view = o.view, today = todayStr();
  const prefs = _vwTlPrefs();
  // A day list opens on its own week, once.
  if (view.startsWith('day:') && state._snappedFor !== view) {
    const target = view.slice(4);
    const ws0 = fmtDate(_qaWeekStart(_qaAdd(_qaToday(), state.weekBarOffset || 0)));
    if (target < ws0 || target > Clock.addDays(ws0, 6)) state.weekBarOffset = daysUntil(target);
    state._snappedFor = view;
  }
  const start = fmtDate(_qaWeekStart(_qaAdd(_qaToday(), state.weekBarOffset || 0)));
  let days = []; for (let i = 0; i < 7; i++) days.push(Clock.addDays(start, i));
  if (prefs.workdays) { const wd = days.filter(d => homeWorkDay(d)); if (wd.length) days = wd; }
  const calSt = typeof homeCalStatus === 'function' ? homeCalStatus() : { ok: false };

  const items = _vwTimelineItems(o);
  const lanes = new Map(days.map(d => [d, []])), blocks = new Map(days.map(d => [d, []]));
  const undated = [];
  for (const it of items) {
    const slot = it.plannedTime ? planSlotOf(it) : null;
    if (slot && blocks.has(slot.date)) { blocks.get(slot.date).push({ it, slot }); continue; }
    const d = viewsTaskDay(it, today);
    if (!d) { undated.push(it); continue; }
    if (lanes.has(d)) lanes.get(d).push(it);
  }
  for (const [d, l] of lanes) lanes.set(d, sortItems(l, 'date', view));
  const doneOn = new Map();
  if (!o.searching) for (const it of getAllItems()) {
    if (statusOf(it.id) !== 'done' || !(_vwDateView(view) || inViewScope(it, view))) continue;
    const d = _closedOn(it); if (d && lanes.has(d)) doneOn.set(d, (doneOn.get(d) || 0) + 1);
  }

  // Events of the visible days and the hours to draw.
  const evs = new Map();
  const wh = homeWorkHours();
  let h0 = Math.max(0, Math.floor(wh.startMin / 60) - 1), h1 = Math.min(24, Math.ceil(wh.endMin / 60) + 1);
  for (const d of days) {
    const list = calSt.ok && typeof homeCalEvents === 'function' ? homeCalEvents(d) : [];
    evs.set(d, list);
    for (const e of list) if (!e.allDay) { h0 = Math.min(h0, Math.floor(e.start / 60)); h1 = Math.max(h1, Math.ceil(e.end / 60)); }
    for (const b of blocks.get(d)) { h0 = Math.min(h0, Math.floor(b.slot.start / 60)); h1 = Math.max(h1, Math.ceil(b.slot.end / 60)); }
  }
  h0 = Math.max(0, h0); h1 = Math.min(24, Math.max(h1, h0 + 1));
  const px = _vwPxHour(), ppm = px / 60;

  const root = document.createElement('div'); root.className = 'vt';
  root.style.setProperty('--vt-hour', px + 'px');
  root.appendChild(_vwTlBar(days, lanes, undated, calSt, view));
  if (undated.length && prefs.tray !== false) root.appendChild(_vwTray(undated, view));

  const grid = document.createElement('div'); grid.className = 'vt-grid';
  grid.style.gridTemplateColumns = `52px repeat(${days.length}, minmax(132px, 1fr))`;
  grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Week timeline');
  // Gutter: the hours.
  const g1 = document.createElement('div'); g1.className = 'vt-gut vt-gut-head'; g1.style.gridColumn = '1'; g1.style.gridRow = '1'; grid.appendChild(g1);
  const g2 = document.createElement('div'); g2.className = 'vt-gut vt-gut-lane'; g2.style.gridColumn = '1'; g2.style.gridRow = '2'; g2.innerHTML = `<span>${icon('list-checks', 'i-xs')}</span>`; g2.title = 'Tasks on the day, without a time'; grid.appendChild(g2);
  const g3 = document.createElement('div'); g3.className = 'vt-gut vt-hours'; g3.style.gridColumn = '1'; g3.style.gridRow = '3'; g3.style.height = ((h1 - h0) * px) + 'px';
  for (let h = h0 + 1; h < h1; h++) {
    const s = document.createElement('span'); s.style.top = ((h - h0) * px) + 'px';
    s.textContent = typeof _calTimeLabel === 'function' ? _calTimeLabel(_planHM(h * 60)) : _planHM(h * 60);
    g3.appendChild(s);
  }
  grid.appendChild(g3);

  days.forEach((d, i) => {
    const col = String(i + 2);
    const cls = (d === today ? ' is-today' : '') + (d < today ? ' is-past' : '') + (homeWorkDay(d) ? '' : ' is-off');
    grid.appendChild(_vwHead(d, col, cls, lanes.get(d), evs.get(d), doneOn.get(d) || 0, view));
    grid.appendChild(_vwLane(d, col, cls, lanes.get(d), view, doneOn.get(d) || 0));
    grid.appendChild(_vwTime(d, col, cls, blocks.get(d), evs.get(d), { h0, h1, ppm, wh }));
  });
  root.appendChild(grid);
  box.appendChild(root);

  if (_vwFocusId) {
    const id = _vwFocusId; _vwFocusId = null;
    requestAnimationFrame(() => { const el = box.querySelector(`[data-vt-id="${CSS.escape(id)}"]`); if (el) el.focus({ preventScroll: false }); });
  }
}

/* ---------- toolbar ---------- */
function _vwTlBar(days, lanes, undated, calSt, view) {
  const bar = document.createElement('div'); bar.className = 'vt-bar';
  const nav = (ic, label, fn, cur) => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = ic ? 'btn-icon btn-sm' : 'btn btn-secondary btn-sm';
    b.innerHTML = ic ? icon(ic) : esc(label); b.setAttribute('aria-label', label); if (ic) b.setAttribute('data-tip', label);
    if (cur) { b.setAttribute('aria-current', 'true'); b.classList.add('is-current'); }
    b.onclick = () => { if (cur) return; fn(); saveUI(); render(); };
    return b;
  };
  const off = state.weekBarOffset || 0;
  const thisWeek = fmtDate(_qaWeekStart(_qaToday())) === fmtDate(_qaWeekStart(_qaAdd(_qaToday(), off)));
  bar.append(
    nav('chevron-left', 'Previous week', () => { state.weekBarOffset = off - 7; }),
    nav('', 'This week', () => { state.weekBarOffset = 0; }, thisWeek),
    nav('chevron-right', 'Next week', () => { state.weekBarOffset = off + 7; }),
  );
  const range = document.createElement('span'); range.className = 'vt-range';
  range.textContent = `${_dayLabel(days[0], { day: 'numeric', month: 'short' })} – ${_dayLabel(days[days.length - 1], { day: 'numeric', month: 'short' })}`;
  bar.appendChild(range);
  // The week in one line: hours of tasks against free hours, and how many days are over.
  const today = todayStr();
  let task = 0, free = 0, over = 0, n = 0;
  for (const d of days) { if (d < today) continue; const c = viewsDayCapacity(d); task += c.taskMin; free += c.freeMin; if (c.over) over++; n += c.count; }
  const sum = document.createElement('span'); sum.className = 'vt-sum' + (over ? ' is-over' : '');
  if (days[days.length - 1] < today) sum.textContent = 'A past week';
  else sum.innerHTML = (over ? icon('triangle-alert', 'i-xs') : icon('gauge', 'i-xs'))
    + `<span>${esc(viewsHours(task))} of tasks · ${esc(viewsHours(free))} free${over ? ` · <b>${over} day${over === 1 ? '' : 's'} over</b>` : ''}</span>`;
  sum.title = (calSt.ok ? 'Free time: your working hours minus calendar events.' : 'No calendar yet: free time is your working hours.') + ' Counts every open task.';
  bar.appendChild(sum);
  const sp = document.createElement('span'); sp.className = 'vt-sp'; bar.appendChild(sp);
  if (over && days.some(d => d >= today)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm';
    b.innerHTML = icon('sliders-horizontal', 'i-sm') + '<span>Even out</span>';
    b.setAttribute('data-tip', 'Move easy tasks off overloaded days');
    b.onclick = (e) => viewsOpenBalance(e.currentTarget);
    bar.appendChild(b);
  }
  if (undated.length) {
    const on = _vwTlPrefs().tray !== false;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.innerHTML = icon('inbox', 'i-sm') + `<span>No date</span><span class="vt-n">${undated.length}</span>`;
    b.setAttribute('data-tip', on ? 'Hide the tasks without a date' : 'Show the tasks without a date, to drag onto days');
    b.onclick = () => { setTaskViewPref('_timeline', { tray: on ? false : null }); render(); };
    bar.appendChild(b);
  }
  const wdOn = !!_vwTlPrefs().workdays;
  const wd = document.createElement('button'); wd.type = 'button'; wd.className = 'btn btn-ghost btn-sm';
  wd.setAttribute('aria-pressed', wdOn ? 'true' : 'false');
  wd.innerHTML = icon('calendar-days', 'i-sm') + `<span>${wdOn ? 'Work days' : 'All 7 days'}</span>`;
  wd.setAttribute('data-tip', wdOn ? 'Show all seven days' : 'Show only your working days');
  wd.onclick = () => { setTaskViewPref('_timeline', { workdays: wdOn ? null : true }); render(); };
  bar.appendChild(wd);
  if (!n && !undated.length) {
    const hint = document.createElement('div'); hint.className = 'vt-hint';
    hint.textContent = view.startsWith('stream:') || view.startsWith('tag:') || view.startsWith('person:') ? 'Nothing from this list is on these days.' : 'A clear week. Add a task with Q, then drag it onto a day or a time.';
    bar.appendChild(hint);
  }
  return bar;
}

/* ---------- No date tray ---------- */
function _vwTray(undated, view) {
  const tray = document.createElement('div'); tray.className = 'vt-tray';
  tray.innerHTML = `<span class="vt-tray-h">${icon('inbox', 'i-xs')}<span>No date</span><span class="vt-n">${undated.length}</span><span class="vt-tray-tip">drag onto a day or a time</span></span>`;
  const list = document.createElement('div'); list.className = 'vt-tray-l';
  const sorted = sortItems(undated, 'priority', view);
  for (const it of sorted.slice(0, 30)) list.appendChild(_vwCard(it, view, { tray: true }));
  if (sorted.length > 30) {
    const more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-ghost btn-sm vt-more';
    more.textContent = `+${sorted.length - 30} more`; more.onclick = () => setView('no-date');
    list.appendChild(more);
  }
  tray.appendChild(list);
  _vwDropZone(tray, (ids) => _vwUndate(ids));
  return tray;
}
function _vwUndate(ids) {
  let n = 0;
  for (const id of ids) {
    const it = getItem(id); if (!it || (!it.dueDate && !it.plannedFor)) continue;
    if (it.dueDate) logActivity(id, 'date', { from: it.dueDate, to: null, reason: 'Moved to No date on the week timeline' });
    if (it.plannedFor) logActivity(id, 'plan', { from: it.plannedFor, to: null });
    it.dueDate = null; delete it.dueTime; delete it.plannedFor; delete it.plannedTime; delete it.plannedMinutes;
    n++;
  }
  if (!n) return;
  saveData(); render();
  const mark = undoMark();
  toast(n === 1 ? 'Date removed' : `${n} tasks have no date now`, { kind: 'ok', icon: 'inbox', action: { label: 'Undo', run: () => undoMarked(mark) } });
}

/* ---------- a day ---------- */
function _vwHead(d, col, cls, lane, evs, done, view) {
  const h = document.createElement('div'); h.className = 'vt-head' + cls; h.style.gridColumn = col; h.style.gridRow = '1'; h.dataset.date = d;
  const day = document.createElement('button'); day.type = 'button'; day.className = 'vt-day';
  const dt = _dayLabel(d, { weekday: 'short' }), num = Number(d.slice(8));
  day.innerHTML = `<span class="vt-dw">${esc(dt)}</span><b>${num}</b>` + (done ? `<span class="vt-done" title="${done} done">${icon('check', 'i-xs')}${done}</span>` : '');
  day.title = _dayLabel(d, { weekday: 'long', day: 'numeric', month: 'long' }) + ' · open this day as a list';
  if (state.view === 'day:' + d || (state.view === 'today' && d === todayStr())) day.setAttribute('aria-current', 'date');
  day.onclick = () => { const v = d === todayStr() ? 'today' : 'day:' + d; if (state.view === v) { viewsSetMode('list'); return; } setView(v); };
  h.appendChild(day);
  const allDay = (evs || []).filter(e => e.allDay);
  if (allDay.length) {
    const a = document.createElement('div'); a.className = 'vt-allday';
    a.innerHTML = allDay.slice(0, 2).map(e => `<span class="vt-ad${e.bg ? ' is-bg' : ''}">${esc(e.title)}</span>`).join('') + (allDay.length > 2 ? `<span class="vt-ad-more">+${allDay.length - 2}</span>` : '');
    a.title = allDay.map(e => e.title).join('\n');
    h.appendChild(a);
  }
  if (d >= todayStr()) {
    const row = document.createElement('div'); row.className = 'vt-caprow';
    row.appendChild(viewsCapacityMeter(viewsDayCapacity(d)));
    if (lane.length) {
      const p = document.createElement('button'); p.type = 'button'; p.className = 'btn-icon btn-sm vt-plan';
      p.innerHTML = icon('wand-sparkles', 'i-sm');
      p.setAttribute('aria-label', 'Plan the day: time-block these tasks into free time');
      p.setAttribute('data-tip', 'Plan the day: fit these tasks into the free time');
      p.onclick = () => viewsAutoPlanDay(d, lane.map(it => it.id));
      row.appendChild(p);
    }
    h.appendChild(row);
    _vwDropZone(h, (ids) => viewsMoveToDay(ids, d, { reason: 'Moved on the week timeline' }));
  }
  return h;
}
function _vwLane(d, col, cls, lane, view, done) {
  const l = document.createElement('div'); l.className = 'vt-lane' + cls; l.style.gridColumn = col; l.style.gridRow = '2'; l.dataset.date = d;
  l.setAttribute('role', 'list'); l.setAttribute('aria-label', _dayLabel(d, { weekday: 'long', day: 'numeric', month: 'long' }));
  for (const it of lane) l.appendChild(_vwCard(it, view));
  if (typeof togetherTimelineLane === 'function') togetherTimelineLane(l, d, view);   // shared tasks, friends' layer (99-together-2layers.js)
  // A cleared day says so (today: a small cheer).
  if (!lane.length && done && d <= todayStr()) l.insertAdjacentHTML('beforeend', `<div class="vt-cleared">${icon(d === todayStr() ? 'party-popper' : 'circle-check', 'i-sm')}<span>${d === todayStr() ? 'All done today' : 'All done'}</span></div>`);
  if (d >= todayStr()) _vwDropZone(l, (ids) => viewsMoveToDay(ids, d, { reason: 'Moved on the week timeline' }));
  return l;
}
function _vwTime(d, col, cls, blocks, evs, g) {
  const t = document.createElement('div'); t.className = 'vt-time' + cls; t.style.gridColumn = col; t.style.gridRow = '3'; t.dataset.date = d;
  t.style.height = ((g.h1 - g.h0) * g.ppm * 60) + 'px';
  const base = g.h0 * 60;
  // Outside the working hours: shaded.
  const ws = Math.max(0, (g.wh.startMin - base) * g.ppm), we = Math.max(0, (g.wh.endMin - base) * g.ppm);
  t.style.setProperty('--vt-ws', ws + 'px'); t.style.setProperty('--vt-we', we + 'px');
  for (const e of (evs || [])) {
    if (e.allDay) continue;
    const s = Math.max(e.start, base), en = Math.min(e.end, g.h1 * 60);
    if (en <= s) continue;
    const el = document.createElement('div');
    el.className = 'vt-ev c-' + (_VW_EV_COLORS.includes(e.color) ? e.color : 'blue') + (e.bg ? ' is-bg' : '');
    el.style.top = ((s - base) * g.ppm) + 'px'; el.style.height = Math.max(10, (en - s) * g.ppm - 1) + 'px';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<span>${esc(_planHM(e.start))} ${esc(e.title)}</span>`;
    t.appendChild(el);
  }
  if (typeof togetherTimelineTime === 'function') togetherTimelineTime(t, d, base, g);   // friends' busy times, faint (99-together-2layers.js)
  // Time blocks, side by side where they overlap.
  const sorted = blocks.slice().sort((a, b) => a.slot.start - b.slot.start || b.slot.end - a.slot.end);
  let cluster = [], clusterEnd = -1;
  const flush = () => {
    const lanesEnd = [];
    for (const b of cluster) { let k = lanesEnd.findIndex(e => e <= b.slot.start); if (k < 0) { k = lanesEnd.length; lanesEnd.push(0); } lanesEnd[k] = b.slot.end; b.lane = k; }
    for (const b of cluster) { b.lanes = lanesEnd.length; }
    cluster = [];
  };
  for (const b of sorted) { if (b.slot.start >= clusterEnd && cluster.length) flush(); cluster.push(b); clusterEnd = Math.max(clusterEnd, b.slot.end); }
  if (cluster.length) flush();
  for (const b of sorted) t.appendChild(_vwBlock(b, d, base, g));
  if (d === todayStr()) {
    const now = _vwNowMin();
    if (now >= base && now <= g.h1 * 60) { const n = document.createElement('div'); n.className = 'vt-now'; n.style.top = ((now - base) * g.ppm) + 'px'; n.setAttribute('aria-hidden', 'true'); t.appendChild(n); }
  }
  if (d < todayStr()) return t;   // a past day takes no drops
  // Drop on a time: a time block there (snapped to 15 min), with a ghost while hovering.
  const ghost = document.createElement('div'); ghost.className = 'vt-ghost'; ghost.hidden = true; t.appendChild(ghost);
  const at = (e) => {
    const r = t.getBoundingClientRect();
    const m = base + Math.round(((e.clientY - r.top) / g.ppm) / _VW_SNAP) * _VW_SNAP;
    return Math.max(base, Math.min(g.h1 * 60 - _VW_SNAP, m));
  };
  t.addEventListener('dragover', (e) => {
    if (!isTaskDrag(e)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    const m = at(e), len = _vwDrag ? _vwDrag.minutes : PLAN_DEFAULT_MINUTES;
    ghost.hidden = false; ghost.style.top = ((m - base) * g.ppm) + 'px'; ghost.style.height = Math.max(12, len * g.ppm - 1) + 'px';
    ghost.textContent = planSlotText({ start: m, end: Math.min(24 * 60, m + len) });
    t.classList.add('drag-over');
  });
  t.addEventListener('dragleave', (e) => { if (!t.contains(e.relatedTarget)) { ghost.hidden = true; t.classList.remove('drag-over'); } });
  t.addEventListener('drop', (e) => {
    ghost.hidden = true; t.classList.remove('drag-over');
    const ids = draggedTaskIds(e); if (!ids.length) return;
    e.preventDefault(); e.stopPropagation();
    _vwPlanAt(ids, d, at(e));
  });
  return t;
}
/** Time-block tasks from startMin on day d: one task through setPlannedSlot (its own toast), several back to back. */
function _vwPlanAt(ids, d, startMin) {
  if (ids.length === 1) { setPlannedSlot(ids[0], d, _planHM(startMin), undefined, { reason: 'Time-blocked on the week timeline' }); return; }
  let t = startMin, n = 0;
  for (const id of ids) {
    const it = getItem(id); if (!it || t >= 24 * 60) continue;
    const from = it.plannedFor || null;
    const r = planApplySlot(it, { date: d, time: _planHM(t) });
    if (r.error || !r.changed) continue;
    logActivity(id, 'plan', { from, to: d, time: _planHM(t), reason: 'Time-blocked on the week timeline' });
    t += planSlotMinutes(it) + 5; n++;
  }
  if (!n) return;
  saveData(); render();
  const mark = undoMark();
  toast(`${n} tasks time-blocked from ${_planHM(startMin)} · deadlines stay`, { kind: 'ok', icon: 'calendar-clock', action: { label: 'Undo', run: () => undoMarked(mark) } });
}
function _vwDropZone(el, onDrop) {
  el.addEventListener('dragover', (e) => { if (!isTaskDrag(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('drag-over'); });
  el.addEventListener('dragleave', (e) => { if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over'); });
  el.addEventListener('drop', (e) => {
    el.classList.remove('drag-over');
    const ids = draggedTaskIds(e); if (!ids.length) return;
    e.preventDefault(); e.stopPropagation();
    onDrop(ids);
  });
}

/* ---------- cards and blocks ---------- */
function _vwCheckbox(it, host) {
  const id = it.id, prio = effPriority(it), st = statusOf(id);
  const cb = document.createElement('button'); cb.type = 'button';
  cb.className = 'checkbox ' + prio + (st === 'doing' ? ' doing' : '');
  cb.setAttribute('role', 'checkbox'); cb.setAttribute('aria-checked', st === 'doing' ? 'mixed' : 'false');
  cb.setAttribute('aria-label', 'Complete: ' + effTitle(it)); cb.tabIndex = -1;
  cb.onclick = (e) => {
    e.stopPropagation();
    if (e.shiftKey) { toggleDoing(id); return; }
    if (window.Motion && Motion.completeTask) Motion.completeTask(host, () => toggleDone(id)); else toggleDone(id);
  };
  return cb;
}
function _vwDraggable(el, it, minutes, block) {
  el.draggable = true;
  el.ondragstart = (e) => { _vwDrag = { id: it.id, minutes, block }; _startTaskDrag(e, it, el); };
  el.ondragend = () => { _vwDrag = null; _endTaskDrag(el); document.querySelectorAll('.vt-ghost').forEach(g => { g.hidden = true; }); document.querySelectorAll('.vt-time.drag-over').forEach(x => x.classList.remove('drag-over')); };
  el.onclick = (e) => {
    if (e.target.closest('.checkbox, .vt-rs')) return;
    if (e.ctrlKey || e.metaKey) { if (typeof _toggleMulti === 'function') _toggleMulti(it.id); el.classList.toggle('multi-selected'); return; }
    if (typeof openTask === 'function') openTask(it.id, { from: el }); else selectTask(it.id);
  };
  el.oncontextmenu = (e) => { e.preventDefault(); openTaskMenu({ x: e.clientX, y: e.clientY }, it.id); };
  el.onkeydown = (e) => _vwKey(e, el, it, block);
}
function _vwCard(it, view, o) {
  o = o || {};
  const id = it.id, today = todayStr();
  const el = document.createElement('div');
  const due = effDate(it);
  const overdue = !!due && due < today;
  el.className = 'vt-card ' + effPriority(it) + (overdue ? ' is-overdue' : '') + (statusOf(id) === 'doing' ? ' is-doing' : '')
    + (multiSelect.ids.has(id) ? ' multi-selected' : '') + (state.selectedTaskId === id ? ' is-open' : '');
  el.dataset.vtId = id; el.dataset.id = id; el.tabIndex = 0; el.setAttribute('role', 'listitem');
  const est = Number(it.estimate) > 0 ? Number(it.estimate) : 0;
  const bits = [];
  if (!view.startsWith('stream:')) bits.push(`<span class="vt-c-s">${streamMarkHtml(effStream(it))}</span>`);
  if (it.dueTime && !o.tray) bits.push(`<span>${icon('clock', 'i-xs')}${esc(it.dueTime)}</span>`);
  if (est) bits.push(`<span>${icon('timer', 'i-xs')}${esc(fmtEstimate(est))}</span>`);
  if (overdue) bits.push(`<span class="vt-c-late">${esc(dueLabel(due))}</span>`);
  else if (due && it.plannedFor && due !== viewsTaskDay(it, today)) bits.push(`<span class="vt-c-due">${icon('flag', 'i-xs')}due ${esc(dueMoveLabel(due))}</span>`);
  const subs = getSubtasks(id); if (subs.length) bits.push(`<span>${icon('list-checks', 'i-xs')}${subs.filter(s => s.done).length}/${subs.length}</span>`);
  const body = document.createElement('span'); body.className = 'vt-c-body';
  body.innerHTML = `<span class="vt-c-t">${esc(effTitle(it))}</span>` + (bits.length ? `<span class="vt-c-m">${bits.join('')}</span>` : '');
  el.append(_vwCheckbox(it, el), body);
  el.setAttribute('aria-label', effTitle(it) + (est ? ', ' + fmtEstimate(est) : '') + (due ? ', due ' + dueLabel(due) : ''));
  el.title = effTitle(it) + '\nDrag onto a day or a time · Enter opens · Shift+arrows move it';
  _vwDraggable(el, it, est || PLAN_DEFAULT_MINUTES, false);
  return el;
}
function _vwBlock(b, d, base, g) {
  const { it, slot } = b;
  const el = document.createElement('div');
  el.className = 'vt-blk ' + effPriority(it) + (statusOf(it.id) === 'doing' ? ' is-doing' : '') + (multiSelect.ids.has(it.id) ? ' multi-selected' : '');
  el.dataset.vtId = it.id; el.dataset.id = it.id; el.tabIndex = 0; el.setAttribute('role', 'listitem');
  const top = (slot.start - base) * g.ppm, hgt = Math.max(16, slot.minutes * g.ppm - 2);
  el.style.top = top + 'px'; el.style.height = hgt + 'px';
  const lanes = b.lanes || 1, lane = b.lane || 0;
  el.style.left = `calc(${(lane / lanes) * 100}% + 2px)`; el.style.width = `calc(${100 / lanes}% - 4px)`;
  if (hgt < 30) el.classList.add('is-short');
  const st = document.createElement('span'); st.className = 'vt-b-s'; st.style.setProperty('--c', safeColor(STREAMS[effStream(it)]?.color, '#868a94'));
  const body = document.createElement('span'); body.className = 'vt-b-body';
  body.innerHTML = `<span class="vt-b-t">${esc(effTitle(it))}</span><span class="vt-b-time">${esc(planSlotText(slot))}</span>`;
  const rs = document.createElement('span'); rs.className = 'vt-rs'; rs.setAttribute('aria-hidden', 'true'); rs.title = 'Drag to change the length';
  el.append(st, _vwCheckbox(it, el), body, rs);
  el.setAttribute('aria-label', `${effTitle(it)}, ${planSlotText(slot)}`);
  el.title = `${effTitle(it)} · ${planSlotText(slot)}\nDrag to move · bottom edge: length · Shift+arrows: 15 min / a day`;
  _vwDraggable(el, it, slot.minutes, true);
  // Resize from the bottom edge (pointer), 15-minute steps; saved on release.
  rs.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    rs.setPointerCapture(e.pointerId);
    el.draggable = false; el.classList.add('is-resizing');
    const y0 = e.clientY, m0 = slot.minutes;
    let m = m0;
    const move = (ev) => {
      m = Math.max(_VW_SNAP, Math.min(PLAN_MAX_MINUTES, Math.round((m0 + (ev.clientY - y0) / g.ppm) / _VW_SNAP) * _VW_SNAP));
      m = Math.min(m, 24 * 60 - slot.start);
      el.style.height = Math.max(16, m * g.ppm - 2) + 'px';
      body.querySelector('.vt-b-time').textContent = planSlotText({ start: slot.start, end: slot.start + m });
    };
    const up = () => {
      rs.removeEventListener('pointermove', move); rs.removeEventListener('pointerup', up); rs.removeEventListener('pointercancel', up);
      el.draggable = true; el.classList.remove('is-resizing');
      if (m !== m0) setPlannedSlot(it.id, d, undefined, m, { reason: 'Resized on the week timeline' });
    };
    rs.addEventListener('pointermove', move); rs.addEventListener('pointerup', up); rs.addEventListener('pointercancel', up);
  });
  rs.addEventListener('click', (e) => e.stopPropagation());
  return el;
}

/* ---------- keyboard ---------- */
function _vwKey(e, el, it, block) {
  if (e.target !== el) return;
  const k = e.key;
  if (k === 'Enter') { e.preventDefault(); if (typeof openTask === 'function') openTask(it.id, { from: el }); return; }
  if (k === ' ') { e.preventDefault(); if (window.Motion && Motion.completeTask) Motion.completeTask(el, () => toggleDone(it.id)); else toggleDone(it.id); return; }
  if (!/^Arrow(Left|Right|Up|Down)$/.test(k)) return;
  e.preventDefault();
  const root = el.closest('.vt'); if (!root) return;
  const host = el.closest('[data-date]');
  const day = host ? host.dataset.date : null;
  if (!day) {   // the No date tray: Left/Right walk it, Shift+Right gives the task today
    if (e.shiftKey) { if (k === 'ArrowRight') { _vwFocusId = it.id; viewsMoveToDay([it.id], todayStr(), { reason: 'Moved on the week timeline' }); } return; }
    const list = [...root.querySelectorAll('.vt-tray .vt-card')]; const i = list.indexOf(el);
    const n = list[i + (k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1)]; if (n) n.focus();
    return;
  }
  if (e.shiftKey) {
    _vwFocusId = it.id;
    if (block) {
      const slot = planSlotOf(it); if (!slot) return;
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        const s = Math.max(0, Math.min(24 * 60 - slot.minutes, slot.start + (k === 'ArrowUp' ? -_VW_SNAP : _VW_SNAP)));
        setPlannedSlot(it.id, slot.date, _planHM(s), undefined, { reason: 'Moved on the week timeline' });
      } else {
        const to = Clock.addDays(slot.date, k === 'ArrowLeft' ? -1 : 1);
        if (to < todayStr()) { _vwFocusId = null; return; }
        setPlannedSlot(it.id, to, undefined, undefined, { reason: 'Moved on the week timeline' });
      }
      return;
    }
    if (k === 'ArrowUp' || k === 'ArrowDown') { _vwFocusId = null; return; }
    const from = viewsTaskDay(it) || todayStr();
    const to = Clock.addDays(from, k === 'ArrowLeft' ? -1 : 1);
    if (to < todayStr()) { _vwFocusId = null; toast('That day has passed', { icon: 'calendar' }); return; }
    viewsMoveToDay([it.id], to, { reason: 'Moved on the week timeline' });
    return;
  }
  // Plain arrows: move the focus. Up/Down inside the day (lane, then blocks), Left/Right to the next day.
  const inDay = (d) => [...root.querySelectorAll(`.vt-lane[data-date="${d}"] .vt-card, .vt-time[data-date="${d}"] .vt-blk`)];
  if (k === 'ArrowUp' || k === 'ArrowDown') {
    const list = inDay(day); const i = list.indexOf(el);
    const n = list[i + (k === 'ArrowUp' ? -1 : 1)]; if (n) n.focus();
    return;
  }
  const heads = [...root.querySelectorAll('.vt-head')].map(h => h.dataset.date);
  const i = heads.indexOf(day), cur = inDay(day).indexOf(el);
  for (let j = i + (k === 'ArrowLeft' ? -1 : 1); j >= 0 && j < heads.length; j += (k === 'ArrowLeft' ? -1 : 1)) {
    const list = inDay(heads[j]);
    if (list.length) { list[Math.min(cur, list.length - 1)].focus(); return; }
  }
}

/* ---------- Plan the day ---------- */
function viewsAutoPlanDay(iso, ids) {
  const wh = homeWorkHours(), today = todayStr();
  const lo = iso === today ? Math.max(wh.startMin, Math.ceil(_vwNowMin() / 5) * 5) : wh.startMin;
  const evs = (typeof homeCalEvents === 'function' ? homeCalEvents(iso) : []).filter(e => !e.allDay && !e.bg).map(e => ({ start: e.start, end: e.end }));
  const plans = planSlotsOn(iso).map(p => ({ start: p.slot.start, end: p.slot.end }));
  const gaps = planFreeGaps(evs.concat(plans), { start: lo, end: wh.endMin, min: 15 });
  const tasks = (ids || []).map(id => getItem(id)).filter(it => it && statusOf(it.id) !== 'done' && !(it.plannedTime && it.plannedFor === iso)).map(planTaskInfo);
  if (!tasks.length) { toast('Every task that day already has a time', { icon: 'calendar-check' }); return; }
  const res = homeAutoPlan({ date: iso, today, gaps, tasks, max: 12 });
  if (!res.slots.length) { toast(gaps.length ? 'None of these fit in the free time left' : 'No free time left that day', { icon: 'calendar-clock' }); return; }
  let n = 0;
  for (const s of res.slots) {
    const it = getItem(s.id); if (!it) continue;
    const from = it.plannedFor || null;
    const r = planApplySlot(it, { date: iso, time: s.time });
    if (r.error || !r.changed) continue;
    logActivity(s.id, 'plan', { from, to: iso, time: s.time, reason: 'Planned the day on the week timeline' });
    n++;
  }
  if (!n) return;
  saveData(); render();
  const mark = undoMark();
  toast(`${n} task${n === 1 ? '' : 's'} time-blocked ${dueMoveLabel(iso)}` + (res.left.length ? ` · ${res.left.length} did not fit` : '') + ' · deadlines stay',
    { kind: 'ok', icon: 'wand-sparkles', action: { label: 'Undo', run: () => undoMarked(mark) } });
}
