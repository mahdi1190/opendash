/* ============================================================
   CALENDAR SECTION (#view=calendar)  (owner: Calendar)
   ------------------------------------------------------------
   Month / Week / Day / Agenda of Google events (every calendar the account
   can see), task due dates and planned times, and countdowns. A rail on the
   right shows the focused day's agenda; clicking an event swaps the rail for
   the event panel (43-calendar-panel.js).

   Focus date: _calSelectedDate (15-nav-sidebar.js, shared with the mini
   month); calendarSelectedDate() returns it or today. Mode: calPrefs().mode
   (UI key). #view=calendar:week etc. opens a mode directly.
   Sidebar blocks here: 'calendars' (one toggle per Google calendar, with
   rename/recolour; replaces the shell's default) and 'cal-sync' (data age +
   Update now). Keys: t today, j/k or arrows previous/next, m w d a modes,
   Esc closes the event panel.
   ============================================================ */
let _calSectionFresh = true;     // entering the section starts on today
let _calOpenEventId = null;      // the event whose panel is open
let _calTimer = null;
const _CAL_MODES = [['month', 'Month'], ['week', 'Week'], ['day', 'Day'], ['agenda', 'Agenda']];

function calMode() { return calPrefs().mode; }
function calSetMode(m) {
  if (!_CAL_MODES.some(x => x[0] === m)) return;
  // Re-selecting the mode you are in is a no-op (CLAUDE.md "Interaction conventions").
  if (calMode() === m && state.view === 'calendar:' + m) return;
  calPrefs().mode = m;
  // The view carries the mode (#view=calendar:week), so links and reloads land on it.
  if (String(state.view).startsWith('calendar')) {
    state.view = 'calendar:' + m;
    if (typeof _syncViewHash === 'function') _syncViewHash();
    saveUI(); render();
  } else setView('calendar:' + m);
}
function calFocus() { return calendarSelectedDate(); }
function calSetFocus(iso, opts) {
  if (iso === calFocus() && iso.slice(0, 7) === state.calMonth && !(opts && opts.force)) return;   // the selected day again: no-op
  _calSelectedDate = iso;
  state.calMonth = iso.slice(0, 7);
  if (!(opts && opts.quiet)) { saveUI(); render(); }
}
// On a phone seven columns are unreadable: "Week" shows three days from the focused day.
const _CAL_NARROW_MQ = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
function _calNarrow() { return !!(_CAL_NARROW_MQ && _CAL_NARROW_MQ.matches); }
if (_CAL_NARROW_MQ && _CAL_NARROW_MQ.addEventListener) {
  _CAL_NARROW_MQ.addEventListener('change', () => { if (String(state.view).startsWith('calendar')) { _calGridScroll = null; render(); } });
}
function _calWeekDays(iso) {
  if (_calNarrow()) return [0, 1, 2].map(i => _calAddDays(iso, i));
  const s = _calWeekStartOf(iso); return [0, 1, 2, 3, 4, 5, 6].map(i => _calAddDays(s, i));
}
function calStep(dir) {
  const f = calFocus(), m = calMode();
  if (m === 'month') {
    const d = _calParse(f); const day = d.getDate();
    const t = new Date(d.getFullYear(), d.getMonth() + dir, 1);
    t.setDate(Math.min(day, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()));
    calSetFocus(fmtDate(t));
  } else calSetFocus(_calAddDays(f, dir * (m === 'week' ? (_calNarrow() ? 3 : 7) : m === 'agenda' ? 14 : 1)));
}
function calTitleParts() {
  const f = _calParse(calFocus()), m = calMode(), L = _CAL_LOCALE();
  if (m === 'month') return [f.toLocaleDateString(L, { month: 'long' }), String(f.getFullYear())];
  if (m === 'week') {
    const days = _calWeekDays(calFocus());
    const a = _calParse(days[0]), b = _calParse(days[days.length - 1]);
    const same = a.getMonth() === b.getMonth();
    // Three-letter months as in mockup 07 ("28 Sep – 4 Oct"; some locales write "Sept").
    const short = (d) => d.toLocaleDateString(L, { day: 'numeric', month: 'short' }).replace(/\bSept\b/, 'Sep');
    const left = same ? String(a.getDate()) : short(a);
    return [`${left} – ${short(b)}`, String(b.getFullYear())];
  }
  if (m === 'day') return [f.toLocaleDateString(L, { weekday: 'long', day: 'numeric', month: 'long' }), String(f.getFullYear())];
  return ['Agenda', 'from ' + f.toLocaleDateString(L, { day: 'numeric', month: 'short' })];
}

registerSection('calendar', {
  group: 'calendar',
  match: v => v === 'calendar' || v.startsWith('calendar:'),
  title: () => 'Calendar',
  // The crumb is drawn before mount() adopts the view's mode, so read it from the view first.
  crumb: (v) => { const want = String(v || '').split(':')[1]; return [(_CAL_MODES.find(x => x[0] === want) || _CAL_MODES.find(x => x[0] === calMode()) || _CAL_MODES[0])[1]]; },
  layout: 'bare',
  hashable: true,
  mount(container, view) {
    // #view=calendar:week (deep link, palette) picks the mode once; the mode
    // buttons and keys change it after that without touching the view.
    const want = String(view || '').split(':')[1];
    if (want && _CAL_MODES.some(x => x[0] === want)) calPrefs().mode = want;
    if (_calSectionFresh) {
      _calSectionFresh = false;
      if (!_calSelectedDate) _calSelectedDate = todayStr();
      state.calMonth = calFocus().slice(0, 7);
      if (_serverAvailable) { CalStore.load().then(() => CalStore.maybeAuto()); }
      clearInterval(_calTimer);
      // Keep the now-line and "now" rows honest, and refresh at most every 30 minutes.
      _calTimer = setInterval(() => {
        if (state.view !== 'calendar' && !state.view.startsWith('calendar:')) return;
        _calTickNow();
        CalStore.maybeAuto();
      }, 60000);
    }
    container.innerHTML = '';
    container.appendChild(_calBuild());
  },
  unmount() {
    _calSectionFresh = true; _calSelectedDate = null; _calOpenEventId = null;
    clearInterval(_calTimer); _calTimer = null;
    _calGridScroll = null;
  },
});

/** Move the now-line without a full render. */
function _calTickNow() {
  const n = new Date(), m = n.getHours() * 60 + n.getMinutes();
  document.querySelectorAll('.wv-col.today .wv-now').forEach(el => { el.style.top = (m / 60 * CAL_HOUR_PX) + 'px'; });
}
/** Job progress changed: repaint what shows it (sidebar card) without rebuilding the grid. */
function _calPaintChrome() { if (typeof renderSidebar === 'function') renderSidebar(); }

function _calBuild() {
  const wrap = document.createElement('div');
  const ev = _calOpenEventId ? calEventById(_calOpenEventId) : null;
  if (_calOpenEventId && !ev) _calOpenEventId = null;
  wrap.className = 'cal-wrap' + (ev ? ' with-panel' : '') + ' mode-' + calMode();
  const main = document.createElement('div'); main.className = 'cal-main';
  main.appendChild(_calHeader());
  const body = document.createElement('div'); body.className = 'cal-body';
  main.appendChild(body);
  const m = calMode();
  const o = {
    selectedId: _calOpenEventId,
    onEvent: (id, el) => calOpenEvent(id, el),
    onTask: (id, el) => (typeof openTask === 'function' ? openTask(id, { from: el }) : selectTask(id)),
    onDay: (iso) => { _calSelectedDate = iso; state.calMonth = iso.slice(0, 7); calSetMode('day'); },
  };
  if (m === 'month') {
    const f = _calParse(calFocus());
    const opt = { includeDone: !!calPrefs().showDone };
    const grid = calMonthGrid(Object.assign({}, o, {
      year: f.getFullYear(), month: f.getMonth(), selected: calFocus(),
      entries: (iso) => calEntriesOn(iso, opt),
      onSelect: (iso) => calSetFocus(iso),
    }));
    body.appendChild(grid);
    requestAnimationFrame(() => calFitMonth(grid));
  } else if (m === 'week' || m === 'day') {
    body.appendChild(calTimeGrid(Object.assign({}, o, { days: m === 'week' ? _calWeekDays(calFocus()) : [calFocus()] })));
  } else {
    const opt = { includeDone: !!calPrefs().showDone };
    body.appendChild(calAgendaList(Object.assign({}, o, { from: calFocus(), days: 42, entries: (iso) => calEntriesOn(iso, opt) })));
  }
  wrap.appendChild(main);
  wrap.appendChild(ev ? calEventPanel(ev) : calRail());
  return wrap;
}

function _calHeader() {
  const h = document.createElement('div'); h.className = 'cal-h';
  const [a, b] = calTitleParts();
  // Today, the arrows, then the title (as Google Calendar does): the title's
  // width changes with the period, so it goes last and the arrows never move.
  h.innerHTML = `<button type="button" class="btn btn-secondary" data-today data-tip="Go to today" data-kbd="T"${calFocus() === todayStr() ? ' aria-current="date"' : ''}>Today</button>`
    + `<button type="button" class="btn btn-icon" data-step="-1" aria-label="Previous" data-tip="Previous" data-kbd="K">${icon('chevron-left')}</button>`
    + `<button type="button" class="btn btn-icon" data-step="1" aria-label="Next" data-tip="Next" data-kbd="J">${icon('chevron-right')}</button>`
    + `<h1>${esc(a)} <span>${esc(b)}</span></h1>`
    + `<div class="cal-h-r"><div class="seg" role="tablist" aria-label="Calendar view">${_CAL_MODES.map(([k, l]) => `<button type="button" role="tab" data-mode="${k}" class="${calMode() === k ? 'on' : ''}" aria-selected="${calMode() === k}" data-tip="${escAttr(l)} view" data-kbd="${l[0]}">${esc(l)}</button>`).join('')}</div>`
    + _calStreamChip()
    + `<button type="button" class="btn btn-secondary" data-filter>${icon('list-filter', 'i-sm')}<span>Filter</span>${_calFilterCount() ? `<span class="badge">${_calFilterCount()}</span>` : ''}</button>`
    + `<button type="button" class="btn btn-primary" data-new>${icon('plus', 'i-sm')}<span>New</span></button></div>`;
  h.querySelectorAll('[data-step]').forEach(btn => { btn.onclick = () => calStep(Number(btn.dataset.step)); });
  h.querySelector('[data-today]').onclick = () => { _calGridScroll = null; calSetFocus(todayStr()); };
  h.querySelectorAll('[data-mode]').forEach(btn => { btn.onclick = () => calSetMode(btn.dataset.mode); });
  h.querySelector('[data-filter]').onclick = (e) => calFilterMenu(e.currentTarget);
  const clr = h.querySelector('[data-clear-stream]');
  if (clr) clr.onclick = () => calSetStreamFilter(null);
  h.querySelector('[data-new]').onclick = (e) => {
    const f = calFocus();
    openMenu(e.currentTarget, [
      { label: 'New task', icon: 'circle-plus', hint: _calFmt(f, { day: 'numeric', month: 'short' }), run: () => calNewTaskDialog({ date: f }) },
      { label: 'New Google Calendar event', icon: 'external-link', hint: 'opens Google', run: () => window.open(googleCalendarUrl({ title: '', date: f, time: '09:00' }), '_blank', 'noopener') },
    ], { align: 'end' });
  };
  return h;
}

/* ---------- filter: what the calendar shows ---------- */
function _calFilterCount() {
  const hidden = calPrefs().hidden;
  return Object.keys(hidden).filter(k => k !== 'declined' && hidden[k]).length + (_calOnlyStream() ? 1 : 0);
}
/** One stream's tasks only (right-click a stream > Show in calendar, or Filter): its id, or null. */
function _calOnlyStream() { const s = calPrefs().stream; return s && STREAMS[s] ? s : null; }
function calSetStreamFilter(sid) {
  const p = calPrefs();
  if ((p.stream || null) === (sid || null)) return;   // already showing that
  if (sid) { p.stream = sid; delete p.hidden.tasks; } else delete p.stream;
  saveUI(); render();
}
/** The chip for a one-stream calendar: its marker and name; x shows every stream again. */
function _calStreamChip() {
  const sid = _calOnlyStream();
  if (!sid) return '';
  const label = STREAMS[sid].label;
  return `<span class="chip chip-lg cal-stream-only" data-cz="stream" data-cz-id="${escAttr(sid)}" title="${escAttr('Only ' + label + ' tasks')}">${typeof streamMarkHtml === 'function' ? streamMarkHtml(sid) : ''}<span data-cz-label>${esc(label)}</span>`
    + `<button type="button" class="x" data-clear-stream aria-label="${escAttr('Show tasks from every stream')}">${icon('x', 'i-xs')}</button></span>`;
}
function calFilterMenu(anchor) {
  const p = calPrefs();
  const toggle = (k) => () => { if (p.hidden[k]) delete p.hidden[k]; else p.hidden[k] = true; saveUI(); render(); };
  const cals = calCalendars();
  openMenu(anchor, [
    ...(cals.length ? [{ heading: 'Calendars' }] : []),
    ...cals.map(c => ({ label: c.name, icon: 'calendar', checked: () => !calPrefs().hidden[c.id === 'google' ? 'google' : 'cal:' + c.id], keepOpen: true, run: (e) => { calSetCalendarHidden(c.id, !c.hidden); c.hidden = !c.hidden; _calRefreshMenuChecks(e); } })),
    { heading: 'From OpenDash' },
    { label: 'Task due dates', icon: 'circle-check', checked: () => !calPrefs().hidden.tasks, keepOpen: true, run: (e) => { toggle('tasks')(); _calRefreshMenuChecks(e); } },
    { label: 'Tasks from', icon: 'layers', hint: _calOnlyStream() ? STREAMS[_calOnlyStream()].label : 'every stream', run: () => setTimeout(() => {
      const cur = _calOnlyStream();
      const b = document.querySelector('.cal-h [data-filter]');
      openMenu(b || anchor, [
        { label: 'Every stream', icon: 'layers', checked: !cur, run: () => calSetStreamFilter(null) },
        'sep',
        ...Object.entries(STREAMS).filter(([, s]) => !s.archived).sort((x, y) => (x[1].order ?? 0) - (y[1].order ?? 0))
          .map(([k, s]) => ({ label: s.label, icon: typeof streamMarkHtml === 'function' ? streamMarkHtml(k) : 'circle', checked: cur === k, run: () => calSetStreamFilter(k) })),
      ], { align: 'end', width: 220 });
    }, 0) },
    { label: 'Countdowns', icon: 'hourglass', checked: () => !calPrefs().hidden.countdowns, keepOpen: true, run: (e) => { toggle('countdowns')(); _calRefreshMenuChecks(e); } },
    'sep',
    { label: 'Declined events', icon: 'circle-x', checked: () => !calPrefs().hidden.declined, keepOpen: true, run: (e) => { toggle('declined')(); _calRefreshMenuChecks(e); } },
    { label: 'Completed tasks', icon: 'check-check', checked: () => !!calPrefs().showDone, keepOpen: true, run: (e) => { p.showDone = !p.showDone; saveUI(); render(); _calRefreshMenuChecks(e); } },
  ], { align: 'end' });
}
/** A keep-open menu row: flip its tick in place (the menu outlives the render). */
function _calRefreshMenuChecks(e) {
  const b = e && e.currentTarget && e.currentTarget.closest ? e.currentTarget : e && e.target && e.target.closest ? e.target.closest('.pop-item') : null;
  if (!b) return;
  const on = b.getAttribute('aria-checked') !== 'true';
  b.setAttribute('aria-checked', on ? 'true' : 'false');
  const chk = b.querySelector('.chk');
  if (on && !chk) b.insertAdjacentHTML('beforeend', icon('check', 'chk'));
  if (!on && chk) chk.remove();
}

/* ---------- the agenda rail ---------- */
function calRail() {
  const rail = document.createElement('aside'); rail.className = 'cal-rail';
  rail.setAttribute('aria-label', 'Agenda');
  const today = todayStr();
  const start = calMode() === 'month' ? calFocus() : (calFocus() < today && calMode() !== 'day' ? today : calFocus());
  const d = CalStore.data;
  if (!d || d.status !== 'ok' || !calAllEvents().length) {
    const card = document.createElement('div'); card.className = 'cal-connect';
    const access = CalStore.access();
    const running = CalStore.running();
    card.innerHTML = `<div class="cal-connect-h">${icon('calendar-days')}<b>${esc(running ? 'Reading your calendar…' : access === 'yes' ? 'No events yet' : 'Bring in your calendar')}</b></div>`
      + `<p>${esc(running ? 'This takes a minute. Your events appear here when it is done.' : access === 'yes' ? 'Update to read your Google calendars. Tasks and countdowns already show.' : 'Connect a calendar (Google Calendar, or any iCal link with no AI involved) to see your events next to your tasks. Tasks and countdowns already show.')}</p>`;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-primary btn-sm';
    if (running || access === 'yes') {
      b.setAttribute('data-requires', 'calendar');
      b.innerHTML = icon(running ? 'loader-circle' : 'refresh-cw', 'i-sm' + (running ? ' spin' : '')) + `<span>${running ? 'Updating…' : 'Update calendar'}</span>`;
      b.disabled = running;
      b.onclick = () => CalStore.update({ force: true });
    } else {
      // Not connected yet: the one button here must lead somewhere, not sit
      // greyed out (an iCal link needs no Claude at all).
      b.innerHTML = icon('calendar-plus', 'i-sm') + '<span>Connect a calendar</span>';
      b.onclick = () => (window.Connections && typeof Connections.open === 'function' ? Connections.open('calendar') : setView('connections'));
    }
    card.appendChild(b);
    rail.appendChild(card);
  }
  let shownDays = 0;
  for (let i = 0; i < 14 && shownDays < 4; i++) {
    const iso = _calAddDays(start, i);
    const entries = calEntriesOn(iso, { includeDone: false });
    const evs = entries.filter(e => e.kind !== 'task');
    const tasks = entries.filter(e => e.kind === 'task');
    if (i > 0 && !entries.length) continue;
    shownDays++;
    const sec = document.createElement('section'); sec.className = 'ag-day';
    const dd = _calParse(iso);
    const rel = iso === today ? 'Today' : iso === _calAddDays(today, 1) ? 'Tomorrow' : iso === _calAddDays(today, -1) ? 'Yesterday' : dd.toLocaleDateString(_CAL_LOCALE(), { weekday: 'long' });
    const sub = iso === today || iso === _calAddDays(today, 1) || iso === _calAddDays(today, -1)
      ? dd.toLocaleDateString(_CAL_LOCALE(), { weekday: 'short', day: 'numeric', month: 'short' })
      : dd.toLocaleDateString(_CAL_LOCALE(), { day: 'numeric', month: 'short' });
    const nEv = evs.filter(e => e.kind === 'event').length;
    sec.innerHTML = `<button type="button" class="ag-dh" data-day="${iso}"><b>${esc(rel)}</b><span>${esc(sub)}</span>${i === 0 && nEv ? `<em>${nEv} event${nEv === 1 ? '' : 's'}</em>` : ''}</button>`;
    // All-day items as a compact row of chips, then the timed ones in order.
    const allDay = evs.filter(e => e.allDay).sort((a, b) => (a.free ? 1 : 0) - (b.free ? 1 : 0) || (b.important ? 1 : 0) - (a.important ? 1 : 0));
    if (allDay.length) {
      const chips = document.createElement('div'); chips.className = 'ag-allday';
      const MAX = 4;
      chips.innerHTML = allDay.slice(0, MAX).map(e => calChipHtml(e, { noDrag: true })).join('')
        + (allDay.length > MAX ? `<button type="button" class="ce more" data-moreday="${iso}">${allDay.length - MAX} more</button>` : '');
      chips.addEventListener('click', (ev) => {
        const more = ev.target.closest('[data-moreday]');
        if (more) { ev.stopPropagation(); calDayPopover(more, iso, allDay, { onEvent: calOpenEvent }); return; }
        const c = ev.target.closest('.ce[data-id]');
        if (c) { ev.stopPropagation(); _calChipClick(c, { onEvent: calOpenEvent }); }
      });
      sec.appendChild(chips);
    }
    const list = document.createElement('div'); list.className = 'ag-list';
    for (const e of evs.filter(x => !x.allDay).sort((a, b) => a.start - b.start)) list.appendChild(calAgendaRow(e, iso, { selectedId: _calOpenEventId, rail: true }));
    if (!evs.filter(x => !x.allDay).length && i === 0) list.insertAdjacentHTML('beforeend', `<div class="ag-empty">${icon('coffee', 'i-sm')}<span>${esc(iso === today ? 'No events today' : 'No events')}</span></div>`);
    sec.appendChild(list);
    if (tasks.length) {
      const th = document.createElement('div'); th.className = 'ag-dh ag-sub';
      th.innerHTML = `<b>${esc(iso === today ? 'Due today' : 'Due')}</b><span>${tasks.length} task${tasks.length === 1 ? '' : 's'}</span>`;
      sec.appendChild(th);
      const tl = document.createElement('div'); tl.className = 'ag-list';
      for (const e of tasks.slice(0, 8)) tl.appendChild(calAgendaRow(e, iso, { taskMeta: false }));
      if (tasks.length > 8) { const m = document.createElement('button'); m.type = 'button'; m.className = 'ag-more'; m.textContent = `${tasks.length - 8} more`; m.onclick = () => setView('day:' + iso); tl.appendChild(m); }
      sec.appendChild(tl);
    }
    calMakeDropTarget(sec, () => ({ date: iso }));
    rail.appendChild(sec);
  }
  rail.addEventListener('click', (e) => {
    const h = e.target.closest('.ag-dh[data-day]');
    if (h) { const iso = h.dataset.day; _calSelectedDate = iso; state.calMonth = iso.slice(0, 7); calSetMode('day'); }
  });
  _calWireRows(rail, { onEvent: (id, el) => calOpenEvent(id, el), onTask: (id, el) => (typeof openTask === 'function' ? openTask(id, { from: el }) : selectTask(id)) });
  return rail;
}

/* ---------- open / close an event ---------- */
/** Open an event the way Settings > Tasks says: the centre card (default) or this calendar's side panel. */
function calOpenEvent(id, from) {
  if (!id) return;
  if (typeof openEvent === 'function') { openEvent(id, { from: from && from.nodeType === 1 ? from : null }); return; }
  _calOpenEventPanel(id);
}
/** The event in the calendar's own side panel (side-panel mode). */
function _calOpenEventPanel(id) {
  if (!id) return;
  if (state.view !== 'calendar' && !state.view.startsWith('calendar:')) {
    const ev = calEventById(id);
    if (ev) { const [a] = calEventDays(ev); _calSelectedDate = a; state.calMonth = a.slice(0, 7); }
    _calOpenEventId = id;
    setView('calendar');
    return;
  }
  _calOpenEventId = _calOpenEventId === id ? null : id;
  render();
}
function calCloseEvent() { if (_calOpenEventId) { _calOpenEventId = null; render(); } }

/* ---------- sidebar: calendars (replaces the shell's default block) ---------- */
registerSidebarBlock('calendar', {
  id: 'calendars', order: 20,
  render(el) {
    const cals = calCalendars();
    el.appendChild(sbSection({ title: 'Calendars', actions: CalStore.data && CalStore.data.status === 'ok' ? [] : [] }));
    const hidden = calPrefs().hidden;
    const row = (o) => {
      const r = document.createElement('div'); r.className = 'calrow' + (o.off ? ' is-off' : '') + (o.gated ? ' is-muted' : '');
      r.style.setProperty('--c', o.c);
      r.tabIndex = 0; r.setAttribute('role', 'switch'); r.setAttribute('aria-checked', o.off ? 'false' : 'true');
      r.innerHTML = `<span class="cb${o.off ? ' off' : ''}">${o.off ? '' : icon('check')}</span><span class="nm">${esc(o.label)}</span><span class="src">${esc(o.src)}</span>`;
      if (o.title) r.title = o.title;
      if (o.menu) {
        const m = document.createElement('button'); m.type = 'button'; m.className = 'btn-icon btn-sm calrow-more';
        m.setAttribute('aria-label', 'Calendar options for ' + o.label); m.innerHTML = icon('ellipsis');
        m.onclick = (e) => { e.stopPropagation(); o.menu(m); };
        r.appendChild(m);
        r.addEventListener('contextmenu', (e) => { e.preventDefault(); o.menu(r); });
      }
      const act = () => o.toggle && o.toggle();
      r.onclick = act;
      r.onkeydown = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); act(); } };
      el.appendChild(r);
    };
    if (!cals.length) {
      const access = CalStore.access();
      row({ label: access === 'yes' ? 'Your calendars' : 'Add a calendar', c: 'var(--sw-blue)', src: access === 'yes' ? 'Update' : 'Connect', off: true, gated: true, title: access === 'yes' ? 'Update to read your calendars' : 'Add Google, Outlook or an iCal link in Connections', toggle: () => (access === 'yes' ? CalStore.update({ force: true }) : (window.Connections ? Connections.open('calendar') : setView('connections'))) });
    }
    const bySource = [];
    for (const c of cals) {
      const k = c.sourceId || 'google';
      let g = bySource.find(x => x.k === k);
      if (!g) { g = { k, label: c.sourceLabel || 'Google', cals: [] }; bySource.push(g); }
      g.cals.push(c);
    }
    const multi = bySource.length > 1;
    for (const g of bySource) {
      if (multi) {
        const sh = document.createElement('div'); sh.className = 'calsrc-h';
        sh.appendChild(Object.assign(document.createElement('span'), { textContent: g.label }));
        const nOn = g.cals.filter(c => !c.hidden).length;
        sh.appendChild(Object.assign(document.createElement('span'), { className: 'calsrc-n', textContent: `${nOn}/${g.cals.length}` }));
        el.appendChild(sh);
      }
      for (const c of g.cals) _calSidebarRow(row, c, multi);
    }
    row({ label: 'Task due dates', c: 'var(--sw-indigo)', src: 'OpenDash', off: !!hidden.tasks, toggle: () => { if (hidden.tasks) delete hidden.tasks; else hidden.tasks = true; saveUI(); render(); } });
    row({ label: 'Countdowns', c: 'var(--sw-amber)', src: 'OpenDash', off: !!hidden.countdowns, toggle: () => { if (hidden.countdowns) delete hidden.countdowns; else hidden.countdowns = true; saveUI(); render(); } });
  },
});
/** One calendar row in the sidebar. The source's name is the group heading when there are several sources. */
function _calSidebarRow(row, c, grouped) {
  const why = c.hidden && !c.defaultOn && !Object.prototype.hasOwnProperty.call(calPrefs().hidden, 'cal:' + c.id) ? 'Someone else’s calendar: off until you switch it on.' : '';
  row({
    label: c.name, c: `var(--sw-${c.color})`, src: c.error ? 'Not read' : grouped ? (c.count ? String(c.count) : '') : (c.sourceLabel || 'Google'), off: c.hidden,
    title: [c.googleName && c.name !== c.googleName ? `In ${c.sourceLabel || 'Google'}: ${c.googleName}` : '', c.description, why, c.error ? 'This calendar could not be read in the last update.' : `${c.count} event${c.count === 1 ? '' : 's'} in the last update`].filter(Boolean).join('\n'),
    toggle: () => calSetCalendarHidden(c.id, !c.hidden),
    menu: (anchor) => calCalendarMenu(anchor, c),
  });
}
/** Rename / recolour / solo one calendar (names and colours are data: saveData). */
function calCalendarMenu(anchor, c) {
  openPopover(anchor, (el, close) => {
    el.classList.add('cal-calpop');
    const h = document.createElement('div'); h.className = 'pop-label'; h.textContent = c.googleName; el.appendChild(h);
    const sw = document.createElement('div'); sw.className = 'cal-swatches';
    for (const s of CAL_SWATCHES) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cal-sw c-' + s + (s === c.color ? ' on' : '');
      b.setAttribute('aria-label', s); b.title = s[0].toUpperCase() + s.slice(1);
      b.onclick = () => { calSetCalendarSetting(c.id, { color: s }); close(); };
      sw.appendChild(b);
    }
    el.appendChild(sw);
    buildMenuItems(el, [
      { label: 'Rename…', icon: 'pencil', run: async () => {
        const v = await promptDialog({ title: 'Rename calendar', label: `Shown instead of “${c.googleName}”. Google is not changed.`, value: c.name, confirmLabel: 'Rename' });
        if (v === null) return;
        calSetCalendarSetting(c.id, { alias: v.trim() && v.trim() !== c.defaultName ? v.trim().slice(0, 40) : null });
      } },
      ...(c.name !== c.defaultName ? [{ label: 'Use the original name', icon: 'rotate-ccw', run: () => calSetCalendarSetting(c.id, { alias: null }) }] : []),
      'sep',
      { label: c.hidden ? 'Show this calendar' : 'Hide this calendar', icon: c.hidden ? 'eye' : 'eye-off', run: () => calSetCalendarHidden(c.id, !c.hidden) },
      { label: 'Show only this calendar', icon: 'eye', run: () => { const p = calPrefs(); for (const x of calCalendars()) { const k = x.id === 'google' ? 'google' : 'cal:' + x.id; if (x.id === c.id) { if (k === 'google') delete p.hidden[k]; else p.hidden[k] = false; } else p.hidden[k] = true; } saveUI(); render(); } },
      { label: 'Show all calendars', icon: 'eye', run: () => { const p = calPrefs(); for (const x of calCalendars()) { const k = x.id === 'google' ? 'google' : 'cal:' + x.id; if (k === 'google') delete p.hidden[k]; else p.hidden[k] = false; } saveUI(); render(); } },
      { label: 'Back to the defaults', icon: 'rotate-ccw', hint: 'yours on, others off', run: () => { const p = calPrefs(); for (const k of Object.keys(p.hidden)) if (k.startsWith('cal:') || k === 'google') delete p.hidden[k]; saveUI(); render(); } },
      'sep',
      { label: 'Manage sources…', icon: 'plug', run: () => (window.Connections ? Connections.open('calendar') : setView('connections')) },
    ], close);
  }, { align: 'start', width: 236 });
}
function calSetCalendarSetting(id, patch) {
  if (!state.calendarSettings || typeof state.calendarSettings !== 'object') state.calendarSettings = {};
  const cur = Object.assign({}, state.calendarSettings[id] || {});
  for (const [k, v] of Object.entries(patch)) { if (v === null || v === '') delete cur[k]; else cur[k] = v; }
  if (Object.keys(cur).length) state.calendarSettings[id] = cur; else delete state.calendarSettings[id];
  saveData(); render();
  toast(patch.color ? 'Calendar colour changed' : 'alias' in patch ? (patch.alias ? `Renamed to ${patch.alias}` : 'Back to the original name') : 'Calendar updated',
    { kind: 'ok', icon: patch.color ? 'palette' : 'pencil', action: { label: 'Undo', run: () => undo() } });
}

/* ---------- sidebar: data age + Update ---------- */
registerSidebarBlock('calendar', {
  id: 'cal-sync', order: 90,
  render(el) {
    if (APP_CONFIG.features && APP_CONFIG.features.calendar === false) return false;
    if (_serverAvailable && !CalStore.st.loaded && !CalStore.st.loading) CalStore.load();
    const d = CalStore.data, job = CalStore.st.job;
    const running = CalStore.running();
    const card = document.createElement('div'); card.className = 'cal-sync' + (running ? ' running' : '') + (job && job.state === 'error' ? ' err' : '');
    const at = d && d.fetchedAt;
    let title, text;
    if (running) { title = 'Updating your calendar…'; text = (job && job.detail) || 'Reading your calendars.'; }
    else if (job && job.state === 'error') { title = 'Update failed'; text = job.error || 'The calendar could not be updated.'; }
    else if (at) {
      title = gdAgeLabel(at);
      const n = (d.calendars || []).length;
      const ns = Array.isArray(d.sources) ? d.sources.length : 0;
      text = d.source === 'snapshot' && ns <= 1 ? 'From an older snapshot.' : `${n ? n + ' calendar' + (n === 1 ? '' : 's') + (ns > 1 ? ' from ' + ns + ' sources' : '') + ' · ' : ''}${Number(d.count || 0).toLocaleString(_CAL_LOCALE())} events.${d.partial ? ' Some were missed.' : ''}`;
    } else { title = 'No calendar data yet'; text = 'Events come from the calendars you connect (Google, Outlook, iCal links).'; }
    card.innerHTML = `<div class="cal-sync-h">${icon(running ? 'loader-circle' : job && job.state === 'error' ? 'circle-alert' : 'refresh-cw', running ? 'i-sm spin' : 'i-sm')}<b></b></div><div class="cal-sync-t"></div>`;
    card.querySelector('b').textContent = title;
    card.querySelector('.cal-sync-t').textContent = text + ' ';
    if (!running) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'link-btn';
      // Nothing connected yet: lead to Connections instead of a greyed "Update now".
      const toConn = (job && job.state === 'error' && /Connections/.test(job.error || '')) || (!at && CalStore.access() !== 'yes');
      if (!toConn) b.setAttribute('data-requires', 'calendar');
      b.textContent = toConn ? 'Open Connections' : 'Update now';
      b.onclick = () => { if (b.textContent === 'Open Connections') { if (window.Connections) Connections.open('calendar'); else setView('connections'); } else CalStore.update({ force: true }); };
      card.querySelector('.cal-sync-t').appendChild(b);
    }
    el.appendChild(card);
  },
});

/* ---------- command palette ---------- */
for (const [k, l] of _CAL_MODES) {
  registerCommand({ id: 'cal-' + k, label: `Calendar: ${l.toLowerCase()} view`, icon: k === 'agenda' ? 'list' : 'calendar-days', group: 'Go to', keywords: 'calendar schedule events ' + k,
    when: () => (APP_CONFIG.features || {}).calendar !== false, run: () => calSetMode(k) });
}
registerCommand({ id: 'cal-today', label: 'Calendar: today', icon: 'calendar-check', group: 'Go to', keywords: 'calendar today agenda now',
  when: () => (APP_CONFIG.features || {}).calendar !== false, run: () => { _calSelectedDate = todayStr(); state.calMonth = _calSelectedDate.slice(0, 7); if (!String(state.view).startsWith('calendar')) setView('calendar'); else { saveUI(); render(); } } });
registerCommand({ id: 'update-inbox', label: 'Update inbox', icon: 'inbox', keywords: 'gmail email mail refresh fetch triage',
  when: () => (APP_CONFIG.features || {}).email !== false && typeof InboxStore !== 'undefined', run: () => { InboxStore.update({ force: true }); if (state.view !== 'triage') setView('triage'); } });

/* ---------- mini month + keys ---------- */
onShell('calendar:select-date', (iso) => {
  if (state.view !== 'calendar' && !state.view.startsWith('calendar:')) { setView('calendar'); return; }
  _calGridScroll = null;
  saveUI(); render();
});
// The palette's "Update calendar" runs the job itself; pick up the new file when it is done.
onShell('calendar:refresh', () => { if (_serverAvailable) CalStore.load(true); });
document.addEventListener('keydown', (e) => {
  if (state.view !== 'calendar' && !String(state.view).startsWith('calendar:')) return;
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (document.querySelector('.modal, .pop:not([hidden]), .cmd, .drawer') || document.getElementById('kb-overlay')?.classList.contains('open')) return;
  if (typeof _gPending !== 'undefined' && _gPending && Date.now() - _gPending < 1200) return;   // "g then a letter" belongs to the shell
  const k = e.key.toLowerCase();
  if (k === 'escape' && _calOpenEventId) { e.preventDefault(); calCloseEvent(); return; }
  if (k === 't') { e.preventDefault(); _calGridScroll = null; calSetFocus(todayStr()); return; }
  if (k === 'j' || e.key === 'ArrowRight') { e.preventDefault(); calStep(1); return; }
  if (k === 'k' || e.key === 'ArrowLeft') { e.preventDefault(); calStep(-1); return; }
  const mode = { m: 'month', w: 'week', d: 'day', a: 'agenda' }[k];
  if (mode && !e.shiftKey) { e.preventDefault(); calSetMode(mode); }
});
