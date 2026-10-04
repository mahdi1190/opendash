/* ============================================================
   CALENDAR VIEWS: week / day time grid and the agenda list (owner: Calendar)
   ------------------------------------------------------------
   calTimeGrid({days:[iso], selectedId, onEvent, onTask, onDay}) -> element
       One scroll box: sticky day headers, an all-day lane (events spanning
       days, countdowns), a "due" lane (tasks due that day without a time),
       then the hour grid. Overlapping events sit side by side; a task's
       planned slot (20-task-plan.js) is a dashed "Planned" block, a task due
       at a time a "Due" block; the red now-line marks the time.
       Drag a task (from the due lane, a planned block, the rail or a month
       cell) onto a time to plan it: a placeholder shows where and how long.
       That sets a planned slot and never moves the deadline; dragging a
       "Due" block still moves its due time.
       Click an empty slot for New task / Google event (in the Calendar
       section 45-calendar-grid-edit.js takes over: drag events, resize,
       click-and-drag to create).
   calAgendaList({from, days, entries(iso), onEvent, onTask, onDay}) -> element
   calAgendaRow(entry, iso) -> one agenda/rail row
   Both use calEntriesOn() / calChipHtml() from 40-calendar.js.
   ============================================================ */
const CAL_HOUR_PX = 50;       // mockup 07: one hour = 50px
let _calGridScroll = null;    // keep the week/day scroll position between renders
let _calGridScrollKey = '';

/** Lay out timed entries in columns: sets e._col, e._cols and e._cluster (overlapping group). */
let _calClusterSeq = 0;
function _calLayoutTimed(list) {
  const items = list.slice().sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  let cluster = [], clusterEnd = -1;
  const flush = () => {
    const cols = [];
    const id = ++_calClusterSeq;
    for (const e of cluster) {
      let c = cols.findIndex(end => end <= e.start);
      if (c < 0) { c = cols.length; cols.push(e.end); } else cols[c] = e.end;
      e._col = c;
      e._cluster = id;
    }
    for (const e of cluster) e._cols = cols.length;
    cluster = []; clusterEnd = -1;
  };
  for (const e of items) {
    if (cluster.length && e.start >= clusterEnd) flush();
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, e.end);
  }
  if (cluster.length) flush();
  return items;
}

/** '1h 30m' / '45m' */
function calDurLabel(min) {
  min = Math.round(min);
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h${m ? ' ' + m + 'm' : ''}` : `${m}m`;
}
function calTaskMinutes(t) { const n = Number(t && t.estimate); return n > 0 ? Math.min(n, 8 * 60) : 30; }

/** All-day bars across the shown days, packed into rows: [{e, col, span, row}] */
function _calAllDayBars(days) {
  const first = days[0], last = days[days.length - 1];
  const seen = new Map();
  for (let i = 0; i < days.length; i++) {
    for (const e of calEntriesOn(days[i])) {
      if (!e.allDay || e.kind === 'task') continue;
      if (seen.has(e.key)) continue;
      let span = 1;
      if (e.kind === 'event') {
        const [a, b] = calEventDays(e.ref);
        const s = a < first ? first : a, en = b > last ? last : b;
        span = Math.max(1, days.indexOf(en) - days.indexOf(s) + 1);
        e._cont = a < first; e._more = b > last;
      }
      seen.set(e.key, { e, col: i, span });
    }
  }
  const bars = [...seen.values()].sort((x, y) => x.col - y.col || y.span - x.span || (y.e.important ? 1 : 0) - (x.e.important ? 1 : 0));
  const rows = [];
  for (const b of bars) {
    let r = rows.findIndex(end => end < b.col);
    if (r < 0) { r = rows.length; rows.push(-1); }
    rows[r] = b.col + b.span - 1;
    b.row = r;
  }
  return { bars, rows: rows.length };
}

function calTimeGrid(o) {
  const days = o.days;
  const n = days.length;
  const today = todayStr();
  const now = Clock.parts(Clock.now());
  const nowMin = now.h * 60 + now.mi;
  const root = document.createElement('div');
  root.className = 'wv' + (n === 1 ? ' wv-1' : '');
  root.style.setProperty('--n', String(n));
  root.style.setProperty('--hour', CAL_HOUR_PX + 'px');

  // ---- sticky head: day names, all-day lane, due lane ----
  const head = document.createElement('div'); head.className = 'wv-head';
  let h = '<div class="wv-gut"></div>';
  for (const iso of days) {
    const d = _calParse(iso);
    const wd = d.toLocaleDateString(_CAL_LOCALE(), { weekday: n === 1 ? 'long' : 'short' });
    const wk = d.getDay() === 0 || d.getDay() === 6; // clock-ok: wall date
    h += `<button type="button" class="wv-dh${iso === today ? ' today' : ''}${wk ? ' wkend' : ''}" data-date="${iso}" aria-label="${escAttr(d.toLocaleDateString(_CAL_LOCALE(), { weekday: 'long', day: 'numeric', month: 'long' }))}"><small>${esc(wd)}</small><b>${d.getDate()}</b></button>`; // clock-ok: wall date
  }
  head.innerHTML = h;

  const { bars, rows } = _calAllDayBars(days);
  const MAX_ROWS = 3;
  const allG = document.createElement('div'); allG.className = 'wv-gut wv-lbl'; allG.textContent = 'all-day';
  const all = document.createElement('div'); all.className = 'wv-lane wv-all';
  all.style.gridTemplateRows = `repeat(${Math.max(1, Math.min(rows, MAX_ROWS + 1))}, 22px)`;
  const hiddenPerDay = new Array(n).fill(0);
  for (const b of bars) {
    if (b.row >= MAX_ROWS && rows > MAX_ROWS + 1) { for (let i = b.col; i < b.col + b.span; i++) hiddenPerDay[i]++; continue; }
    const e = b.e;
    const el = document.createElement('button'); el.type = 'button';
    el.className = 'wv-allbar c-' + e.color + (e.kind === 'countdown' ? ' cd' : '') + (e.important ? ' imp' : '') + (e.declined ? ' declined' : '') + (e._cont ? ' cont-l' : '') + (e._more ? ' cont-r' : '');
    el.style.gridColumn = `${b.col + 1} / span ${b.span}`;
    el.style.gridRow = String(b.row + 1);
    el.dataset.kind = e.kind; el.dataset.id = e.id;
    const ic = e.kind === 'countdown' ? icon(e.icon, 'i-xs') : e.important ? icon('star', 'i-xs') : '';
    el.innerHTML = `${ic}<span>${esc(e.title)}</span>`;
    el.title = (e.kind === 'countdown' ? 'Countdown: ' : '') + e.title;
    all.appendChild(el);
  }
  hiddenPerDay.forEach((c, i) => {
    if (!c) return;
    const m = document.createElement('button'); m.type = 'button'; m.className = 'wv-allmore';
    m.style.gridColumn = `${i + 1}`; m.style.gridRow = String(MAX_ROWS + 1);
    m.textContent = `${c} more`;
    m.onclick = (ev) => { ev.stopPropagation(); calDayPopover(m, days[i], calEntriesOn(days[i]).filter(x => x.allDay && x.kind !== 'task'), o); };
    all.appendChild(m);
  });
  days.forEach((iso, i) => {
    const drop = document.createElement('div'); drop.className = 'wv-dropcell'; drop.style.gridColumn = String(i + 1); drop.style.gridRow = '1 / -1';
    calMakeDropTarget(drop, () => ({ date: iso, time: null }));
    all.appendChild(drop);
  });

  const dueG = document.createElement('div'); dueG.className = 'wv-gut wv-lbl'; dueG.textContent = 'due';
  const due = document.createElement('div'); due.className = 'wv-lane wv-duelane';
  const perDay = days.map(iso => ({ iso, entries: calEntriesOn(iso) }));
  let anyDue = false;
  for (const { iso, entries } of perDay) {
    const cell = document.createElement('div'); cell.className = 'wv-duecell'; cell.dataset.date = iso;
    const tasks = entries.filter(e => e.kind === 'task' && e.allDay);
    if (tasks.length) anyDue = true;
    const show = tasks.length > 3 ? tasks.slice(0, 2) : tasks;
    cell.innerHTML = show.map(e => `<button type="button" class="wv-due${e.done ? ' done' : ''}" data-kind="task" data-id="${escAttr(e.id)}" draggable="true" title="${escAttr('Due: ' + e.title + ' · drag onto a time to plan it')}"><span class="mini-check ${escAttr(e.prio)}"></span><span>${esc(e.title)}</span></button>`).join('')
      + (tasks.length > show.length ? `<button type="button" class="wv-due more" data-more="${iso}">${tasks.length - show.length} more</button>` : '');
    cell._tasks = tasks;
    calMakeDropTarget(cell, () => ({ date: iso, time: null }));
    due.appendChild(cell);
  }
  head.append(allG, all, dueG, due);
  if (!anyDue) { dueG.classList.add('empty'); due.classList.add('empty'); }
  root.appendChild(head);

  // ---- hour grid ----
  const body = document.createElement('div'); body.className = 'wv-grid';
  body.style.height = (24 * CAL_HOUR_PX) + 'px';
  let lines = '';
  for (let hh = 0; hh < 24; hh++) {
    lines += `<div class="wv-hr" style="top:${hh * CAL_HOUR_PX}px">${hh ? `<span>${esc(_calTimeLabel(_calHM(hh * 60)))}</span>` : ''}</div>`;
  }
  body.innerHTML = lines + '<div class="wv-gutcol"></div>';
  // Busy hours: at most maxCols side by side, each at least ~64px wide; the rest of an
  // overlapping group goes behind a "+N more" chip in the last column.
  const mainW = (document.getElementById('main-body') || {}).clientWidth || (window.innerWidth - 260);
  const colW = Math.max(60, (mainW - (n === 1 ? 380 : 360) - 56) / n);
  // Week: at least two (an event and the "+N more" chip beside it), at most four.
  const maxCols = Math.max(2, Math.min(n === 1 ? 6 : 4, Math.floor(colW / 50)));
  for (const { iso, entries } of perDay) {
    const col = document.createElement('div');
    const dow = _calParse(iso).getDay(); // clock-ok: wall date
    col.className = 'wv-col' + (iso === today ? ' today' : '') + (dow === 0 || dow === 6 ? ' wkend' : '');
    col.dataset.date = iso;
    // The sky across the week (78-anim-weeksky.js): a quiet layer behind the hours.
    const sky = typeof animWeekSkyVars === 'function' ? animWeekSkyVars(iso) : '';
    if (sky) { const s = document.createElement('div'); s.className = 'wv-sky'; s.setAttribute('aria-hidden', 'true'); s.style.cssText = sky; col.appendChild(s); }
    // "Free" events (shown as available in Google: reminders, other people's
    // leave) sit behind the rest as quiet bands.
    const all = entries.filter(x => !x.allDay);
    // Very long blocks (6 hours or more: "research day", a shift) do the same.
    const bands = all.filter(x => x.kind === 'event' && !x.important && (x.free || x.end - x.start >= 360));
    const bandsLaid = _calLayoutTimed(bands);
    for (const e of bandsLaid) e._band = true;
    const timed = bandsLaid.concat(_calLayoutTimed(all.filter(x => !bands.includes(x))));
    // Overflow: in a group wider than maxCols, columns from maxCols-1 on are folded into a chip.
    const overflow = new Map();      // cluster -> [entries]
    for (const e of timed) {
      e._hidden = false;
      if (e._band || e._cols <= maxCols) continue;
      if (e._col >= maxCols - 1) { if (!overflow.has(e._cluster)) overflow.set(e._cluster, []); overflow.get(e._cluster).push(e); e._hidden = true; }
    }
    for (const e of timed) {
      if (e._hidden) continue;
      const b = document.createElement('button'); b.type = 'button';
      const ht = Math.max(20, (e.end - e.start) / 60 * CAL_HOUR_PX - 3);
      // As in mockup 07: only today's finished events fade; earlier days keep their colours.
      const past = iso === today && e.end <= nowMin;
      b.className = 'wv-ev' + (e.kind === 'task' ? ' is-task' + (e.planned ? ' is-plan' : ' is-due') : ' c-' + e.color) + (e.important ? ' imp' : '') + (e.declined ? ' declined' : '')
        + (e.done ? ' done' : '') + (ht < 38 ? ' short' : '') + (past && e.kind === 'event' ? ' past' : '') + (o.selectedId && e.id === o.selectedId ? ' sel' : '')
        + (e.ref && e.ref.status === 'tentative' ? ' tentative' : '');
      b.dataset.kind = e.kind; b.dataset.id = e.id;
      if (e.planned) b.dataset.plan = '1';      // a planned slot (20-task-plan.js): dragging it moves the slot, not the deadline
      b.style.top = (e.start / 60 * CAL_HOUR_PX + 1) + 'px';
      b.style.height = ht + 'px';
      if (e._band) {
        b.classList.add('band');
        b.style.left = `calc(${(e._col / e._cols) * 100}% + 2px)`;
        b.style.width = `calc(${100 / e._cols}% - ${e._cols > 1 ? 3 : 6}px)`;
        b.style.zIndex = '0';
      } else {
        const cols = Math.min(e._cols, maxCols);
        b.style.left = `calc(${(e._col / cols) * 100}% + 2px)`;
        b.style.width = `calc(${100 / cols}% - ${cols > 1 ? 3 : 6}px)`;
        if (cols >= 3) b.classList.add('narrow');
      }
      let sub;
      if (e.kind === 'task') {
        b.draggable = true;
        sub = `${_calTimeLabel(_calHM(e.start))}–${_calTimeLabel(_calHM(e.end))} · ${e.planned ? 'Planned' : 'Due'} · ${calDurLabel(e.end - e.start)}`;
      } else {
        const ev = e.ref;
        const times = e.continued ? `until ${_calTime(calEventEnd(ev))}` : `${e.time}–${_calTime(calEventEnd(ev))}`;
        const where = ev.conferenceUrl ? (ev.conferenceName || 'Video call') : ev.location || '';
        const others = (ev.attendees || []).filter(a => !a.self);
        const who = others.length === 1 ? (others[0].name || others[0].email) : '';
        sub = [times, where, who].filter(Boolean).join(' · ');
      }
      // A task of a stream with its own symbol / shape shows it (28-customise.js).
      const sm = e.kind === 'task' && e.ref && typeof streamIsCustomised === 'function' && streamIsCustomised(effStream(e.ref)) ? streamMarkHtml(effStream(e.ref)) : '';
      // v2.2 wave 4 (78-anim-moments.js): the event's scene on roomy chips, the pulse before it starts.
      const evm = e.kind === 'event' && !e.declined && typeof animEventSceneHtml === 'function';
      const scn = evm && ht >= 44 && !b.classList.contains('narrow') ? animEventSceneHtml(e.ref, { size: 'xs', cls: 'wv-sc' }) : '';
      const soon = evm && typeof animSoonInfo === 'function' ? animSoonInfo(e.ref) : null;
      if (scn) b.classList.add('anim-hover-host', 'has-sc');
      if (soon) b.classList.add('ap-soon');
      b.innerHTML = `<span class="wv-t">${e.kind === 'task' ? `<span class="mini-check ${escAttr(e.prio)}"></span>${sm}` : e.important ? icon('star', 'i-xs') : ''}<span>${esc(e.title)}</span></span><span class="wv-s">${esc(sub)}</span>${scn}${soon ? '<i class="ap-soon-ring" aria-hidden="true"></i>' : ''}`;
      b.title = `${e.title}\n${sub}`;
      col.appendChild(b);
    }
    for (const [, hid] of overflow) {
      const first = hid.reduce((a, b) => (b.start < a.start ? b : a));
      const m = document.createElement('button'); m.type = 'button'; m.className = 'wv-more';
      m.style.top = (first.start / 60 * CAL_HOUR_PX + 1) + 'px';
      m.style.left = `calc(${((maxCols - 1) / maxCols) * 100}% + 2px)`;
      m.style.width = `calc(${100 / maxCols}% - 3px)`;
      m.textContent = colW / maxCols >= 72 ? `+${hid.length} more` : `+${hid.length}`;
      m.title = hid.map(x => x.title).slice(0, 12).join('\n');
      m.setAttribute('aria-label', `${hid.length} more events`);
      m.onclick = (ev) => { ev.stopPropagation(); calDayPopover(m, iso, hid.slice().sort((a, b) => a.start - b.start), o); };
      col.appendChild(m);
    }
    if (iso === today) {
      const line = document.createElement('div'); line.className = 'wv-now'; line.style.top = (nowMin / 60 * CAL_HOUR_PX) + 'px';
      line.innerHTML = '<i></i>' + (typeof animWeekSkyOrb === 'function' ? animWeekSkyOrb(nowMin, iso) : '');
      col.appendChild(line);
    }
    _calWireColumn(col, iso);
    body.appendChild(col);
  }
  root.appendChild(body);

  // ---- interactions ----
  head.addEventListener('click', (e) => {
    const dh = e.target.closest('.wv-dh');
    if (dh) { if (o.onDay) o.onDay(dh.dataset.date); return; }
    const more = e.target.closest('[data-more]');
    if (more) { const cell = more.closest('.wv-duecell'); e.stopPropagation(); calDayPopover(more, cell.dataset.date, cell._tasks, o); return; }
  });
  root.addEventListener('click', (e) => {
    const t = e.target.closest('.wv-ev, .wv-allbar, .wv-due[data-id]');
    if (!t) return;
    e.stopPropagation();
    _calChipClick(t, o);
  });
  root.addEventListener('contextmenu', (e) => { const t = e.target.closest('[data-kind="task"]'); if (t) { e.preventDefault(); calTaskMenu(t, t.dataset.id); } });
  root.addEventListener('dragstart', (e) => {
    const t = e.target.closest('[data-kind="task"][draggable="true"]');
    if (t) calDragStart(e, t.dataset.id);
  });
  root.addEventListener('dragend', calDragEnd);

  // First show: scroll to the working day (or just before now); keep the user's scroll after that.
  const key = days[0] + ':' + n;
  // Only a laid-out, connected grid may record the position (a detached or not
  // yet sized grid reports 0, which would then stick at midnight).
  root.addEventListener('scroll', () => {
    if (root.isConnected && root.scrollHeight > root.clientHeight + 1) { _calGridScroll = root.scrollTop; _calGridScrollKey = key; }
  }, { passive: true });
  let tries = 0;
  const place = () => {
    if (!root.isConnected) return;          // replaced by a newer render before it was shown
    if (root.scrollHeight <= root.clientHeight + 1) { if (++tries < 20) requestAnimationFrame(place); return; }
    if (_calGridScroll !== null && _calGridScrollKey === key) { root.scrollTop = _calGridScroll; return; }
    // The working day (08:00), earlier if an event starts earlier; when today is
    // shown and "now" would be below the fold, bring it into view. Night-time
    // (before 08:00) still opens on the morning, not on empty small hours.
    const earliest = Math.min(...perDay.flatMap(p => p.entries.filter(x => !x.allDay && !x.free && !x.continued).map(x => x.start)), 24 * 60);
    let startMin = 8 * 60;
    if (typeof homeWorkHours === 'function') startMin = Math.max(6 * 60, homeWorkHours().startMin - 60);   // an hour before the working day (config.workHours)
    if (earliest < startMin) startMin = Math.max(6 * 60, earliest - 30);
    const viewMin = Math.max(180, (root.clientHeight - 140) / CAL_HOUR_PX * 60);
    if (days.includes(today) && nowMin > startMin + viewMin - 60) startMin = Math.min(nowMin - 120, 24 * 60 - viewMin);
    root.scrollTop = Math.max(0, startMin / 60 * CAL_HOUR_PX - 12);     // the first hour line sits just under the lanes
    _calGridScroll = root.scrollTop; _calGridScrollKey = key;
  };
  requestAnimationFrame(place);
  return root;
}

/** Drag-to-plan and click-a-slot on one day column of the time grid. */
function _calWireColumn(col, iso) {
  const drop = document.createElement('div'); drop.className = 'wv-drop'; drop.hidden = true;
  col.appendChild(drop);
  const minAt = (clientY) => {
    const r = col.getBoundingClientRect();
    const m = Math.round(((clientY - r.top) / CAL_HOUR_PX * 60) / 15) * 15;
    return Math.max(0, Math.min(24 * 60 - 15, m));
  };
  const show = (start, len, label) => {
    drop.hidden = false;
    drop.style.top = (start / 60 * CAL_HOUR_PX + 1) + 'px';
    drop.style.height = Math.max(20, len / 60 * CAL_HOUR_PX - 3) + 'px';
    drop.innerHTML = icon('calendar', 'i-xs') + `<span>${esc(label)}</span>`;
  };
  col.addEventListener('dragover', (e) => {
    if (![...(e.dataTransfer.types || [])].includes(CAL_DND_TYPE)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    const id = _calDragId;
    const pl = id && typeof planDragPreview === 'function' ? planDragPreview(id) : null;   // dropping plans a slot (20-task-plan.js)
    const len = pl ? pl.minutes : calTaskMinutes(id ? getItem(id) : null);
    const m = Math.min(minAt(e.clientY - (_calDragOffsetMin / 60 * CAL_HOUR_PX)), 24 * 60 - 15);
    show(m, len, `${pl ? pl.label : 'Drop to schedule'} · ${_calTimeLabel(_calHM(m))}–${_calTimeLabel(_calHM(Math.min(24 * 60, m + len)))}`);
    col.classList.add('drop-on');
  });
  col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) { drop.hidden = true; col.classList.remove('drop-on'); } });
  col.addEventListener('drop', (e) => {
    const id = calDropTaskId(e); drop.hidden = true; col.classList.remove('drop-on');
    if (!id) return;
    e.preventDefault();
    const m = minAt(e.clientY - (_calDragOffsetMin / 60 * CAL_HOUR_PX));
    const hm = _calHM(Math.min(m, 24 * 60 - 15));
    if (typeof planDropOnTime === 'function' && planDropOnTime(id, iso, hm)) return;   // a planned slot; the deadline stays
    calScheduleTask(id, iso, hm);
  });
  col.addEventListener('click', (e) => {
    if (e.target.closest('.wv-ev') || col.closest('.cge-on')) return;   // the Calendar section: click-and-drag to create (45-calendar-grid-edit.js)
    const m = Math.floor(minAt(e.clientY) / 30) * 30;
    show(m, 60, `${_calTimeLabel(_calHM(m))}–${_calTimeLabel(_calHM(Math.min(24 * 60, m + 60)))}`);
    drop.classList.add('pick');
    calSlotMenu(drop, iso, _calHM(m), () => { drop.hidden = true; drop.classList.remove('pick'); });
  });
  col.addEventListener('dblclick', (e) => {
    if (e.target.closest('.wv-ev') || col.closest('.cge-on')) return;
    const m = Math.floor(minAt(e.clientY) / 30) * 30;
    closePopovers();
    calNewTaskDialog({ date: iso, time: _calHM(m) });
  });
}

/** Quick menu on an empty week/day slot. */
function calSlotMenu(anchor, iso, hm, onClose) {
  const when = _calFmt(iso, { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + _calTimeLabel(hm);
  openMenu(anchor, [
    { heading: when },
    { label: 'New task at this time', icon: 'plus', run: () => calNewTaskDialog({ date: iso, time: hm }) },
    { label: 'New Google Calendar event', icon: 'external-link', hint: 'opens Google', run: () => window.open(googleCalendarUrl({ title: '', date: iso, time: hm }), '_blank', 'noopener') },
  ], { align: 'start', onClose });
}

/* ---------- agenda ---------- */
/** Reading order for lists: countdowns and all-day first, then by time, untimed tasks last. */
function calChrono(entries) {
  const k = (e) => e.kind === 'countdown' ? -2 : e.kind === 'task' && e.allDay ? 3000 + (PRIORITY_ORDER[e.prio] ?? 3) : e.allDay ? (e.free ? -0.5 : -1) : e.start;
  return entries.slice().sort((a, b) => k(a) - k(b) || String(a.title).localeCompare(String(b.title)));
}
function calAgendaList(o) {
  const wrap = document.createElement('div'); wrap.className = 'agd';
  const today = todayStr();
  let shown = 0;
  for (let i = 0; i < o.days; i++) {
    const iso = _calAddDays(o.from, i);
    const entries = calChrono(o.entries(iso));
    if (!entries.length && iso !== today) continue;
    shown++;
    const sec = document.createElement('section'); sec.className = 'agd-day' + (iso === today ? ' today' : '') + (iso < today ? ' past' : '');
    sec.dataset.date = iso;
    const d = _calParse(iso);
    const rel = iso === today ? 'Today' : iso === _calAddDays(today, 1) ? 'Tomorrow' : iso === _calAddDays(today, -1) ? 'Yesterday' : d.toLocaleDateString(_CAL_LOCALE(), { weekday: 'long' });
    sec.innerHTML = `<button type="button" class="agd-h"><span class="agd-n">${d.getDate()}</span><span class="agd-w"><b>${esc(rel)}</b><span>${esc(d.toLocaleDateString(_CAL_LOCALE(), { month: 'long', year: iso.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric' }))}</span></span></button>`; // clock-ok: wall date
    const list = document.createElement('div'); list.className = 'agd-l';
    if (!entries.length) list.innerHTML = `<div class="agd-empty">Nothing scheduled</div>`;
    for (const e of entries) list.appendChild(calAgendaRow(e, iso, o));
    sec.appendChild(list);
    calMakeDropTarget(sec, () => ({ date: iso }));
    sec.querySelector('.agd-h').onclick = () => o.onDay && o.onDay(iso);
    wrap.appendChild(sec);
  }
  if (!shown) mountEmptyState(wrap, { icon: 'calendar-check', title: 'Nothing coming up', text: 'No events, dated tasks or countdowns in this stretch.' });
  _calWireRows(wrap, o);
  return wrap;
}
/** Clicks, ticks, right-clicks and drags for a container of calAgendaRow()s. */
function _calWireRows(wrap, o) {
  wrap.addEventListener('click', (e) => {
    const chk = e.target.closest('.check[data-id]');
    if (chk) { e.stopPropagation(); cycleStatus(chk.dataset.id); return; }
    const row = e.target.closest('.agd-row');
    if (row) _calChipClick(row, o || {});
  });
  wrap.addEventListener('contextmenu', (e) => { const r = e.target.closest('.agd-row[data-kind="task"]'); if (r) { e.preventDefault(); calTaskMenu(r, r.dataset.id); } });
  wrap.addEventListener('dragstart', (e) => { const r = e.target.closest('.agd-row[data-kind="task"]'); if (r) calDragStart(e, r.dataset.id); });
  wrap.addEventListener('dragend', calDragEnd);
}

/** '30 min' / '1 h' / '1 h 30 min' */
function calDurText(min) {
  min = Math.max(0, Math.round(min || 0));
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}
/** The video service in a word, as the mockups write it: Meet, Teams, Zoom. */
function calShortVideoName(ev) {
  const u = String(ev.conferenceUrl || ''), n = String(ev.conferenceName || '');
  if (/teams\./.test(u) || /teams/i.test(n)) return 'Teams';
  if (/meet\.google/.test(u) || /meet/i.test(n)) return 'Meet';
  if (/zoom\.us/.test(u) || /zoom/i.test(n)) return 'Zoom';
  return n || 'Video call';
}
/**
 * How a repeating event repeats, read from its other occurrences (same title,
 * calendar and start time): {label:'Every Friday', short:'weekly'}, or a plain
 * "Repeating event" when the pattern is not clear. null for one-off events.
 */
let _calRepeatCache = { key: null, map: new Map() };
function calRepeatInfo(ev) {
  if (!ev || !ev.recurring) return null;
  const key = (CalStore.data && CalStore.data.fetchedAt) + '|' + Clock.zone();
  if (_calRepeatCache.key !== key) _calRepeatCache = { key, map: new Map() };
  if (_calRepeatCache.map.has(ev.id)) return _calRepeatCache.map.get(ev.id);
  const s = calEventStart(ev), sp = Clock.parts(s.getTime());
  const hm = ev.allDay ? '' : _calTime(s);
  // Day numbers from the calendar date (UTC) on the page's clock, so a daylight-saving change never makes a week 6 or 8 days.
  const dayNo = (iso) => { const [y, mo, dd] = String(iso).split('-').map(Number); return Math.round(Date.UTC(y, mo - 1, dd) / 86400000); };
  const day0 = dayNo(sp.iso);
  const gaps = new Set(), dows = new Set([sp.dow]);
  for (const o of calAllEvents()) {
    if (o === ev || o.id === ev.id || !o.recurring || o.summary !== ev.summary || (o.calendarId || '') !== (ev.calendarId || '') || !!o.allDay !== !!ev.allDay) continue;
    const os = calEventStart(o), op = Clock.parts(os.getTime());
    if (!ev.allDay && _calTime(os) !== hm) continue;
    const d = Math.abs(dayNo(op.iso) - day0);
    if (d) { gaps.add(d); dows.add(op.dow); }
  }
  const L = _CAL_LOCALE();
  const dayName = (n) => new Date(2024, 0, 7 + n).toLocaleDateString(L, { weekday: 'long' });   // 7 Jan 2024 was a Sunday
  const list = [1, 2, 3, 4, 5, 6, 0].filter(n => dows.has(n)).map(dayName);
  const weekdays = dows.size === 5 && ![0, 6].some(n => dows.has(n));
  let info = { label: 'Repeating event', short: 'repeats' };
  if (dows.size === 7 && gaps.has(1)) info = { label: 'Every day', short: 'daily' };
  else if (weekdays && gaps.has(1)) info = { label: 'Every weekday', short: 'weekdays' };
  else if (gaps.has(7) || (dows.size > 1 && [...gaps].some(g => g < 7))) info = { label: 'Every ' + (list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : list[0]), short: 'weekly' };
  else if (gaps.has(14) && dows.size === 1) info = { label: 'Every other ' + list[0], short: 'fortnightly' };
  _calRepeatCache.map.set(ev.id, info);
  return info;
}

/** One row of the agenda (and the rail): time, colour bar, title, detail line. */
function calAgendaRow(e, iso, o) {
  o = o || {};
  const row = document.createElement('div');
  row.className = 'agd-row' + (e.kind === 'event' ? ' c-' + e.color : e.kind === 'countdown' ? ' c-' + e.color + ' cd' : ' tk') + (e.important ? ' imp' : '') + (e.declined ? ' declined' : '') + (e.done ? ' done' : '')
    + (o.selectedId && o.selectedId === e.id ? ' sel' : '');
  row.dataset.kind = e.kind; row.dataset.id = e.id;
  if (e.planned) { row.dataset.plan = '1'; row.classList.add('plan'); }
  row.tabIndex = 0; row.setAttribute('role', 'button');
  const now = Date.now();
  if (e.kind === 'event' && !e.allDay) {
    const s = calEventStart(e.ref).getTime(), en = calEventEnd(e.ref).getTime();
    if (en < now) row.classList.add('past'); else if (s <= now) row.classList.add('now');
  }
  let lead, sub = '', subIcon = '';
  if (e.kind === 'task') {
    row.draggable = true;
    lead = `<span class="check ${escAttr(e.prio)}${e.done ? ' done' : ''}${statusOf(e.id) === 'doing' ? ' doing' : ''}" data-id="${escAttr(e.id)}" role="checkbox" aria-checked="${e.done}" aria-label="Complete">${e.done ? icon('check') : ''}</span>`;
    if (o.taskMeta !== false) {
      const st = STREAMS[effStream(e.ref)];
      sub = [e.planned ? 'Planned' : e.time ? 'Due' : '', st ? st.label : ''].filter(Boolean).join(' · ');
      if (st && typeof streamMarkHtml === 'function') subIcon = streamMarkHtml(effStream(e.ref));   // the stream's marker (28-customise.js)
    }
  } else if (e.kind === 'countdown') {
    lead = `<span class="bar"></span>`;
    const dd = daysUntil(e.ref.date);
    sub = dd === 0 ? 'Countdown · today' : 'Countdown';
  } else {
    lead = `<span class="bar"></span>`;
    // Mockup 02: where first, then "30 min" (over), "until 12:00 · with …" (now),
    // "linked task", "weekly". The rail keeps "with" for the event on now.
    const ev = e.ref, bits = [];
    const isNow = row.classList.contains('now'), isPast = row.classList.contains('past');
    if (ev.conferenceUrl) { bits.push(calShortVideoName(ev)); subIcon = icon('video', 'i-xs'); }
    else if (ev.location) { bits.push(ev.location); subIcon = icon('map-pin', 'i-xs'); }
    if (!e.allDay && isPast) bits.push(calDurText(Math.round((calEventEnd(ev) - calEventStart(ev)) / 60000)));
    else if (!e.allDay && (isNow || e.continued || !o.rail)) bits.push('until ' + _calTime(calEventEnd(ev)));
    const others = (ev.attendees || []).filter(a => !a.self);
    if (others.length && (!o.rail || isNow)) {
      const lead1 = others.find(a => a.organizer) || others[0];
      bits.push('with ' + (lead1.name || lead1.email) + (others.length > 1 ? ` +${others.length - 1}` : ''));
    }
    const nLinked = (calEventMeta(ev.id).tasks || []).length;
    if (nLinked) bits.push(nLinked === 1 ? 'linked task' : `${nLinked} linked tasks`);
    const rep = !isNow ? calRepeatInfo(ev) : null;
    if (rep) bits.push(rep.short);
    if (e.declined) bits.push('declined');
    sub = bits.join(' · ');
  }
  const time = e.kind === 'event' ? (e.allDay ? 'All day' : e.continued ? '' : e.time) : e.kind === 'task' ? (e.time || '') : '';
  // v2.2 wave 4 (78-anim-moments.js): the event's scene, and "in N min" with a pulse just before it starts.
  const evm = e.kind === 'event' && !e.declined && typeof animEventSceneHtml === 'function';
  const scn = evm ? animEventSceneHtml(e.ref, { size: 'xs', cls: 'agd-sc' }) : '';
  const soon = evm && !e.allDay && typeof animSoonInfo === 'function' ? animSoonInfo(e.ref) : null;
  if (scn) row.classList.add('anim-hover-host');
  if (soon) row.classList.add('ap-soon');
  row.innerHTML = `<time>${esc(time)}</time>${lead}<div class="agd-b"><div class="t">${e.important && e.kind === 'event' ? icon('star', 'i-xs imp-star') : ''}${e.kind === 'countdown' ? icon(e.icon, 'i-xs') : ''}<span>${esc(e.title)}</span>${soon ? `<span class="ap-soon-in">in ${esc(soon.min)} min</span>` : ''}</div>${sub ? `<div class="s">${subIcon}<span>${esc(sub)}</span></div>` : ''}</div>${scn}${soon ? '<i class="ap-soon-ring" aria-hidden="true"></i>' : ''}`;
  row.addEventListener('keydown', (k) => { if (k.key === 'Enter') { k.preventDefault(); row.click(); } });
  return row;
}
