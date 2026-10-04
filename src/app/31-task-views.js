/* ============================================================
   TASK VIEWS (owner: Tasks): the List and Board layouts of every task view,
   the Today summary (progress ring + week strip you can drop tasks on),
   grouped lists with folding, the quick-add box with live preview.
   80-main-render.js hands task views to renderTaskView(main, subtitleEl).
   ============================================================ */
function viewTitle(v) {
  if (v === 'today')     return 'Today';
  if (v === 'tomorrow')  return 'Tomorrow';
  if (v === 'week')      return 'Upcoming';
  if (v === 'all')       return 'All tasks';
  if (v === 'no-date')   return 'No date';
  if (v === 'completed') return 'Logbook';
  if (v === 'bin')       return 'Bin';
  if (v === 'wins')      return 'Wins';
  if (v === 'triage')    return 'Email triage';
  if (v === 'finance')   return 'Finances';
  if (v.startsWith('stream:')) return STREAMS[v.slice(7)]?.label || 'Stream';
  if (v.startsWith('tag:'))    return '#' + v.slice(4);
  if (v.startsWith('day:'))    return _dayLabel(v.slice(4), { weekday: 'long', day: 'numeric', month: 'long' });
  if (v.startsWith('person:')) { const p = getPerson(v.slice(7)); return p ? p.name : 'Person'; }
  return 'Tasks';
}

let _tvLastView = null;
let _logbookDays = 30;            // Logbook shows this many days, "Show older" adds more
let _qaDraft = '', _qaFocused = false, _qaIgnore = [], _qaCaret = null;
let _qaSuggest = { items: [], index: 0 };

/** Render the current task view into main. Called by _renderMainBody. */
function renderTaskView(main, subEl) {
  const view = state.view;
  if (state.viewMode === 'calendar') { state.viewMode = 'list'; saveUI(); }   // retired: Calendar is its own section now
  if (_tvLastView !== view) {
    if (view === 'today' || view === 'week') state.weekBarOffset = 0;
    state._snappedFor = null;   // a newly opened day view snaps its week into view once
    if (view !== 'completed') _logbookDays = 30;
    _tvLastView = view;
  }
  _lastRenderedTaskIds = [];
  if (state.viewMode === 'review') { subEl.textContent = ''; renderReviewView(main); return; }

  const all = getAllItems();
  let open, closed;
  const searching = !!searchQuery;
  if (searching) {
    const hits = all.filter(i => matchesSearch(i, searchQuery));
    open = hits.filter(i => statusOf(i.id) !== 'done');
    closed = hits.filter(i => statusOf(i.id) === 'done');
  } else if (view === 'completed') {
    const cutoff = Date.now() - _logbookDays * 86400000;
    const allClosed = all.filter(i => statusOf(i.id) === 'done');
    open = allClosed.filter(i => (closedAt(i) || 0) >= cutoff);
    closed = [];
    renderTaskView._olderCount = allClosed.length - open.length;
  } else {
    const today = todayStr();
    open = all.filter(i => matchesView(i, view));
    closed = all.filter(i => recentlyClosedInView(i, view, today));
  }
  const sort = view === 'completed' && !searching ? 'completed' : sortForView(view);
  open = sortItems(open, sort, view);
  closed = sortItems(closed, 'completed', view);

  if (searching) subEl.textContent = `${open.length + closed.length} match${open.length + closed.length === 1 ? '' : 'es'} in all tasks`;
  else if (view === 'today') subEl.textContent = new Date().toLocaleDateString(_locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  else if (view === 'completed') subEl.textContent = `${open.length} in the last ${_logbookDays} days`;
  else subEl.textContent = open.length ? `${open.length} open` : '';

  if (state.viewMode === 'kanban') return renderKanban(main, { open, closed, view });
  renderListView(main, { open, closed, view, searching, sort });
}

/* ---------- list ---------- */
function renderListView(container, o) {
  const { open, closed, view, searching } = o;
  const list = document.createElement('div'); list.className = 'task-view';
  container.appendChild(list);

  if (!searching) {
    if (view === 'today') list.appendChild(_renderTodaySummary());
    else if (view === 'week' || view === 'tomorrow' || view.startsWith('day:')) list.appendChild(_renderWeekStrip({ standalone: true }));
    if (view === 'today' || view === 'week' || view === 'tomorrow' || view.startsWith('day:')) list.appendChild(_renderTodayJump(view));
    if (view === 'today' && typeof renderCalendarEvents === 'function') {
      try {
        const cal = renderCalendarEvents();   // the Calendar area's strip (pills + "Open calendar")
        if (cal) list.appendChild(cal);
      } catch (e) { console.error('[tasks] calendar strip', e); }
    }
    if (view !== 'completed') list.appendChild(_renderQuickAdd(view));
    // A stream's Files & links (63-resources.js): its folder, repo, decks...
    if (view.startsWith('stream:') && typeof resStreamStrip === 'function') list.appendChild(resStreamStrip(view.slice(7)));
  } else {
    const note = document.createElement('div'); note.className = 'search-note';
    note.innerHTML = icon('search') + `<span>Searching every task for “${esc(searchQuery)}”.</span>`;
    const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'btn btn-ghost btn-sm'; clr.textContent = 'Clear';
    clr.onclick = () => { const s = document.getElementById('search-input'); if (s) s.value = ''; searchQuery = ''; renderMain(); };
    note.appendChild(clr);
    list.appendChild(note);
  }

  if (!open.length && !closed.length) {
    _mountTaskEmpty(list, view, searching);
    if (view === 'completed' && renderTaskView._olderCount) list.appendChild(_logbookMore());
    _afterQuickAddRender();
    return;
  }

  // Pinned first (not in the Logbook or search results)
  let rest = open;
  if (!searching && view !== 'completed') {
    const pinned = open.filter(i => isPinned(i.id));
    if (pinned.length) {
      list.appendChild(_renderGroup(view, { key: 'pinned', label: 'Pinned', icon: 'pin', items: pinned }));
      rest = open.filter(i => !isPinned(i.id));
    }
  }
  let by = groupForView(view);
  if (searching) by = 'none';
  if (by === 'auto' && (view === 'no-date' || view === 'tomorrow' || view.startsWith('day:'))) by = 'none';
  const groups = groupItems(rest, by, view);
  for (const g of groups) {
    if (!g.items.length) continue;
    list.appendChild(_renderGroup(view, Object.assign({}, g, { label: g.label || (searching ? 'Open' : ''), danger: g.key === 'overdue' })));
  }
  if (!open.length && view !== 'completed' && !searching) _mountTaskEmpty(list, view, false, true);
  if (closed.length) {
    list.appendChild(_renderGroup(view, {
      key: 'closed', label: 'Completed', items: closed,
      collapsedDefault: !searching, showClosed: true,
    }));
  }
  if (view === 'completed' && renderTaskView._olderCount) list.appendChild(_logbookMore());
  _afterQuickAddRender();
}

function _logbookMore() {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm logbook-more';
  b.innerHTML = icon('history') + `<span>Show older (${renderTaskView._olderCount})</span>`;
  b.onclick = () => { _logbookDays += 60; renderMain(); };
  return b;
}

function _mountTaskEmpty(list, view, searching, inline) {
  if (searching) {
    mountEmptyState(list, { icon: 'search', title: 'No tasks match', text: 'Try fewer words, or operators like #tag, @person, p1, is:done, due:week.', compact: true,
      actions: [{ label: 'Clear search', run: () => { const s = document.getElementById('search-input'); if (s) s.value = ''; searchQuery = ''; renderMain(); } }] });
    return;
  }
  const o = view === 'today'
    ? { icon: 'sun', title: inline ? 'Nothing left for today' : 'All clear for today', text: 'Nothing is due or planned. Plan tasks for today with the sun button in a task, or add one above.', actions: [{ label: 'See what’s coming up', icon: 'calendar-range', run: () => setView('week') }] }
    : view === 'completed'
    ? { icon: 'circle-check', title: 'Nothing completed lately', text: 'Finished tasks collect here, newest first.' }
    : view === 'week'
    ? { icon: 'calendar-range', title: 'A quiet week ahead', text: 'Nothing is due in the next 7 days.' }
    : view === 'no-date'
    ? { icon: 'circle-dashed', title: 'Every task has a date', text: 'Tasks without a due date show up here.' }
    : { icon: 'sparkles', title: 'Nothing here', text: 'Add a task above.' };
  o.compact = true;
  mountEmptyState(list, o);
}

/** A collapsible group of rows. g: {key, label, sub, icon, items, danger, collapsedDefault, showClosed} */
function _renderGroup(view, g) {
  const grp = document.createElement('section'); grp.className = 'task-group' + (g.danger ? ' danger' : '');
  grp.dataset.group = g.key;
  const collapsed = g.label ? isGroupCollapsed(view, g.key, !!g.collapsedDefault) : false;
  if (g.label) {
    const h = document.createElement('div'); h.className = 'tg-h';
    const t = document.createElement('button'); t.type = 'button'; t.className = 'tg-toggle';
    t.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    t.innerHTML = icon('chevron-down', 'i-sm tg-chev') + (g.icon ? icon(g.icon, 'i-sm tg-ic') : '')
      + `<span class="tg-t">${esc(g.label)}</span>${g.sub ? `<span class="tg-sub">${esc(g.sub)}</span>` : ''}<span class="count">${g.items.length}</span>`;
    t.onclick = () => { toggleGroupCollapsed(view, g.key, !!g.collapsedDefault); render(); };
    h.appendChild(t);
    if (g.key === 'overdue' && !collapsed) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm tg-act';
      b.textContent = 'Reschedule';
      b.onclick = (e) => _rescheduleGroupMenu(e.currentTarget, g.items.map(i => i.id));
      h.appendChild(b);
    }
    // Drop a task on a day header (Upcoming) to move it to that day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(g.key)) _makeDayDropTarget(h, g.key);
    grp.appendChild(h);
  }
  if (collapsed) { grp.classList.add('collapsed'); return grp; }
  const body = document.createElement('div'); body.className = 'tg-b'; body.setAttribute('role', 'list');
  for (const it of g.items) {
    body.appendChild(renderTaskRow(it, { showClosed: g.showClosed || view === 'completed', hideStream: view.startsWith('stream:') }));
    if (statusOf(it.id) !== 'done' || view === 'completed') _lastRenderedTaskIds.push(it.id);
  }
  grp.appendChild(body);
  return grp;
}

function _rescheduleGroupMenu(anchor, ids) {
  const set = (d, label) => {
    batchTasks(ids, id => { const it = getItem(id); const from = it.dueDate || null; if (from !== d) { logActivity(id, 'date', { from, to: d, reason: 'rescheduled overdue' }); it.dueDate = d; } });
    toast(`${ids.length} task${ids.length === 1 ? '' : 's'} moved to ${label}`, { kind: 'ok', icon: 'calendar', action: { label: 'Undo', run: () => undo() } });
  };
  openMenu(anchor, [
    { heading: `Move ${ids.length} overdue task${ids.length === 1 ? '' : 's'} to` },
    { label: 'Today', icon: 'sun', run: () => set(todayStr(), 'today') },
    { label: 'Tomorrow', icon: 'sunrise', run: () => set(tomorrowStr(), 'tomorrow') },
    { label: 'Next week', icon: 'calendar-plus', run: () => { const d = _qaAdd(_qaWeekStart(_qaToday()), 7); set(fmtDate(d), 'next week'); } },
    { label: 'Pick a date…', icon: 'calendar', run: () => openDueDatePopover(anchor, { value: null, title: 'Move overdue tasks to', onPick: (d) => d && set(d, dueLabel(d)) }) },
  ], { align: 'end', width: 220 });
}

/* ---------- Big centred "Today" button (User request, 3 Oct: "a big today button near the center") ----------
   Quiet when you're already on today's view and this week; a bold "Back to today" when
   you've moved to another day or week. One click returns to Today and resets the strip. */
function _renderTodayJump(view) {
  const row = document.createElement('div'); row.className = 'today-jump-row';
  const here = view === 'today' && !(state.weekBarOffset || 0);
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'today-jump ' + (here ? 'is-here' : 'is-away');
  const d = _qaToday();
  const dateTxt = d.toLocaleDateString(_locale(), { weekday: 'short', day: 'numeric', month: 'short' });
  b.innerHTML = `${icon('sun')}<span class="tj-label">${here ? 'Today' : 'Back to today'}</span><span class="tj-date">${esc(dateTxt)}</span>`;
  b.setAttribute('aria-label', here ? `Today, ${dateTxt}` : `Back to today, ${dateTxt}`);
  if (here) b.setAttribute('aria-current', 'date');
  else b.setAttribute('data-tip', 'Back to today');
  b.onclick = () => {
    if (here) return;   // already there: a no-op (CLAUDE.md "Interaction conventions")
    state.weekBarOffset = 0;
    if (state.view !== 'today') setView('today');
    else { saveUI(); render(); }
  };
  row.appendChild(b);
  return row;
}

/* ---------- Today summary: ring + week strip ---------- */
function _renderTodaySummary() {
  const p = todayProgress();
  const wrap = document.createElement('div'); wrap.className = 'today-sum';
  const left = document.createElement('div'); left.className = 'ts-prog';
  const pct = p.total ? Math.round(p.done / p.total * 100) : 0;
  const ring = document.createElement('span'); ring.className = 'ring'; ring.style.setProperty('--pct', String(pct));
  const ringTxt = `${p.done}/${p.total}`;
  ring.innerHTML = `<span${ringTxt.length > 4 ? ' class="long"' : ''}>${ringTxt}</span>`;
  const txt = document.createElement('div'); txt.className = 'ts-txt';
  const bits = [];
  if (p.overdue) bits.push(`${p.overdue} overdue`);
  if (p.doing) bits.push(`${p.doing} in progress`);
  const streak = computeStreak();
  if (streak > 1) bits.push(`${streak}-day streak`);
  txt.innerHTML = `<b>${p.total ? `${p.done} of ${p.total} done` : 'Nothing planned yet'}</b><span>${esc(bits.join(' · ') || (p.total && p.done === p.total ? 'All done. Nice.' : 'Due today, planned and in progress'))}</span>`;
  left.append(ring, txt);
  wrap.appendChild(left);
  wrap.appendChild(_renderWeekStrip({}));
  return wrap;
}

function computeStreak() {
  // Consecutive days with at least one completion, ending today or yesterday.
  const completions = Object.values(state.completionLog || {}).flat();
  if (completions.length === 0) return 0;
  const days = new Set(completions.map(ts => fmtDate(new Date(ts))));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(fmtDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(fmtDate(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

/** Make an element accept dropped tasks: the task moves to `iso`. */
function _makeDayDropTarget(el, iso) {
  el.addEventListener('dragover', (e) => { if (!isTaskDrag(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', (e) => {
    el.classList.remove('drag-over');
    const id = draggedTaskId(e);
    if (!id) return;
    e.preventDefault(); e.stopPropagation();
    const it = getItem(id);
    if (it && it.dueDate === iso) return;
    setDateWithReason(id, iso, null);
    toast(`Moved to ${dueLabel(iso)}`, { kind: 'ok', icon: 'calendar', action: { label: 'Undo', run: () => undo() } });
  });
}

/** 7 days starting at the configured week start; drop a task on a day to move it there. */
function _renderWeekStrip(o) {
  o = o || {};
  const wb = document.createElement('div'); wb.className = 'week-strip' + (o.standalone ? ' standalone' : '');
  const today = todayStr();
  // Bring a day view's day on screen ONCE, when the day is opened. Doing it on
  // every render snapped the strip straight back after Previous/Next week, so
  // the arrows looked dead on a day view.
  if (state.view.startsWith('day:') && state._snappedFor !== state.view) {
    const target = state.view.slice(4);
    const ws0 = fmtDate(_qaWeekStart(_qaAdd(_qaToday(), state.weekBarOffset || 0)));
    if (target < ws0 || target > _isoPlus(6, ws0)) state.weekBarOffset = daysUntil(target);
    state._snappedFor = state.view;
  }
  const start = _qaWeekStart(_qaAdd(_qaToday(), state.weekBarOffset || 0));
  const counts = {};
  for (const it of getAllItems()) {
    if (statusOf(it.id) === 'done') continue;
    const d = effDate(it); if (d) counts[d] = (counts[d] || 0) + 1;
  }
  const nav = (dir, ic, label) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-icon btn-sm ws-nav';
    b.innerHTML = icon(ic); b.setAttribute('aria-label', label); b.setAttribute('data-tip', label);
    b.onclick = () => { state.weekBarOffset = (state.weekBarOffset || 0) + dir * 7; saveUI(); render(); };
    return b;
  };
  wb.appendChild(nav(-1, 'chevron-left', 'Previous week'));
  const days = document.createElement('div'); days.className = 'ws-days';
  for (let i = 0; i < 7; i++) {
    const d = _qaAdd(start, i);
    const ds = fmtDate(d);
    const n = counts[ds] || 0;
    const cell = document.createElement('button'); cell.type = 'button';
    const selected = state.view === 'day:' + ds || (state.view === 'today' && ds === today);
    cell.className = 'ws-day' + (ds === today ? ' is-today' : '') + (selected ? ' on' : '') + (ds < today ? ' past' : '');
    cell.innerHTML = `<span class="dn"><span class="dw">${esc(d.toLocaleDateString(_locale(), { weekday: 'short' }))}</span><b>${d.getDate()}</b></span>`
      + `<span class="load${n >= 3 ? ' busy' : ''}">${'<i></i>'.repeat(Math.min(n, 4))}</span>`;
    cell.title = d.toLocaleDateString(_locale(), { weekday: 'long', day: 'numeric', month: 'long' }) + (n ? ` · ${n} open` : '') + ' · drop a task here to move it';
    cell.onclick = () => setView(ds === today ? 'today' : 'day:' + ds);
    _makeDayDropTarget(cell, ds);
    days.appendChild(cell);
  }
  wb.appendChild(days);
  wb.appendChild(nav(1, 'chevron-right', 'Next week'));
  if (o.standalone) {
    const pick = document.createElement('button'); pick.type = 'button'; pick.className = 'btn-icon btn-sm ws-nav';
    pick.innerHTML = icon('calendar'); pick.setAttribute('aria-label', 'Go to a date'); pick.setAttribute('data-tip', 'Go to a date');
    pick.onclick = (e) => { e.stopPropagation(); openDatePicker(pick); };
    wb.appendChild(pick);
  }
  return wb;
}

/* ---------- quick add ---------- */
/** The placeholder example, from the user's own data: '"email Sam tomorrow #work !p2"' (cached per save). */
let _qaExKey = null, _qaExVal = '';
function _qaExample() {
  const key = [state._lastSave || 0, (state.custom || []).length, (state.people || []).length].join('|');
  if (key === _qaExKey) return _qaExVal;
  _qaExKey = key;
  let name = 'Sam', stream = Object.keys(STREAMS).find(k => !STREAMS[k].archived) || 'work';
  try {
    // The person with the most open tasks, and the stream most of those tasks are in.
    const per = {}, streams = {};
    const self = new Set((state.people || []).filter(p => p.self).map(p => p.id));
    for (const it of getAllItems()) {
      if (statusOf(it.id) === 'done') continue;
      for (const pid of (typeof effPeople === 'function' ? effPeople(it) : [])) {
        if (self.has(pid)) continue;
        per[pid] = (per[pid] || 0) + 1;
        const s = effStream(it); (streams[pid] = streams[pid] || {})[s] = (streams[pid][s] || 0) + 1;
      }
    }
    const top = Object.entries(per).sort((a, b) => b[1] - a[1])[0];
    const p = top && (state.people || []).find(x => x.id === top[0]);
    if (p && p.name) {
      name = String(p.name).replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '').split(/\s+/)[0] || name;
      const st = Object.entries(streams[p.id] || {}).sort((a, b) => b[1] - a[1])[0];
      if (st && STREAMS[st[0]]) stream = st[0];
    }
  } catch (e) { /* keep the defaults */ }
  const tag = String((STREAMS[stream] && STREAMS[stream].label) || stream).toLowerCase().replace(/\s+/g, '');
  _qaExVal = `"email ${name} tomorrow #${tag} !p2"`;
  return _qaExVal;
}
function _renderQuickAdd(view) {
  const box = document.createElement('div'); box.className = 'qa-wrap';
  const qa = document.createElement('div'); qa.className = 'quick-add';
  qa.innerHTML = `<span class="qa-plus">${icon('plus')}</span>`;
  const inp = document.createElement('input');
  inp.id = 'quick-add'; inp.autocomplete = 'off'; inp.spellcheck = true;
  inp.setAttribute('aria-label', 'Add a task');
  const narrow = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
  const eg = _qaExample();
  inp.placeholder = narrow ? 'Add a task' : `Add a task e.g. ${eg}`;
  inp.value = _qaDraft;
  qa.appendChild(inp);
  // The placeholder in two tones, as in the mockup: "Add a task" + a quieter example (hidden once you type).
  if (!narrow) {
    const ph = document.createElement('span'); ph.className = 'qa-ph'; ph.setAttribute('aria-hidden', 'true');
    ph.innerHTML = `Add a task <em>e.g. ${esc(eg)}</em>`;
    qa.appendChild(ph);
    qa.classList.add('has-ph');
  }
  const tb = document.createElement('button'); tb.type = 'button'; tb.className = 'btn btn-ghost btn-sm qa-tmpl';
  tb.innerHTML = icon('clipboard-list') + '<span>Templates</span>';
  tb.onclick = (e) => _openTemplatesPopover(e.currentTarget, view);
  qa.appendChild(tb);
  const k = document.createElement('kbd'); k.className = 'kbd'; k.textContent = 'Q'; k.title = 'Press Q anywhere to add a task';
  qa.appendChild(k);
  box.appendChild(qa);
  const prev = document.createElement('div'); prev.className = 'qa-preview'; prev.setAttribute('aria-live', 'polite');
  box.appendChild(prev);
  const sug = document.createElement('div'); sug.className = 'qa-suggest pop'; sug.hidden = true; sug.setAttribute('role', 'listbox');
  box.appendChild(sug);

  const paint = () => _paintQaPreview(prev, inp, view);
  const paintSug = () => _paintQaSuggest(sug, inp);
  inp.addEventListener('input', () => { _qaDraft = inp.value; if (!inp.value.trim()) _qaIgnore = []; paint(); paintSug(); });
  inp.addEventListener('focus', () => { _qaFocused = true; box.classList.add('focused'); paint(); });
  // Chrome fires blur when a re-render removes the focused box; only a real blur
  // (the box is still on the page and lost focus) ends "typing several tasks".
  inp.addEventListener('blur', () => {
    setTimeout(() => {
      if (!inp.isConnected || document.activeElement === inp) return;
      _qaFocused = false; box.classList.remove('focused'); sug.hidden = true;
    }, 0);
  });
  inp.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') paintSug(); });
  inp.addEventListener('keydown', (e) => {
    if (!sug.hidden && _qaSuggest.items.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); _qaSuggest.index = (_qaSuggest.index + (e.key === 'ArrowDown' ? 1 : -1) + _qaSuggest.items.length) % _qaSuggest.items.length; paintSug(); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && _qaSuggest.index >= 0)) { e.preventDefault(); _qaAcceptSuggestion(inp, _qaSuggest.items[_qaSuggest.index]); paint(); paintSug(); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); sug.hidden = true; return; }
    }
    if (e.key === 'Escape') { e.stopPropagation(); if (inp.value) { inp.value = ''; _qaDraft = ''; _qaIgnore = []; paint(); } else inp.blur(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const parsed = parseQuickAdd(inp.value, { ignore: _qaIgnore });
    if (!parsed.title) return;
    _qaDraft = ''; _qaIgnore = []; _qaFocused = true; _qaCaret = 0;
    inp.value = '';
    const id = addParsedTask(parsed, quickAddDefaults(view));   // saves + renders; the new box gets focus back
    const it = id && getItem(id);
    if (it && !matchesView(it, state.view)) {
      const home = homeViewForTask(it);
      toast(`Added to ${viewTitle(home)}`, { kind: 'ok', action: { label: 'Show', run: () => { setView(home); openTask(id); } } });
    }
  });
  return box;
}
// A click anywhere outside the quick-add box closes its # @ + suggestions.
document.addEventListener('mousedown', (e) => {
  const sug = document.querySelector('#main-body .qa-suggest');
  if (sug && !sug.hidden && !(e.target instanceof Element && e.target.closest('.qa-wrap'))) sug.hidden = true;
}, true);
/** Re-focus the quick-add box after a re-render if it had focus (typing several tasks in a row). */
function _afterQuickAddRender() {
  const inp = document.getElementById('quick-add');
  if (!inp) return;
  if (_qaFocused) {
    inp.focus({ preventScroll: true });
    const pos = _qaCaret != null ? Math.min(_qaCaret, inp.value.length) : inp.value.length;
    try { inp.setSelectionRange(pos, pos); } catch (e) {}
    _qaCaret = null;
    const box = inp.closest('.qa-wrap'); if (box) box.classList.add('focused');
    _paintQaPreview(box.querySelector('.qa-preview'), inp, state.view);
  }
}
const _QA_TOKEN_ICON = { date: 'calendar', time: 'clock', priority: 'flag', tag: 'hash', stream: 'circle', person: 'at-sign', repeat: 'repeat', estimate: 'timer' };
function _paintQaPreview(prev, inp, view) {
  if (!prev) return;
  prev.innerHTML = '';
  const txt = inp.value.trim();
  if (!txt) {
    if (_qaFocused) prev.innerHTML = `<span class="qa-help">${esc('fri · next mon · 15 oct · 3pm · every week · !p1 · #stream or #tag · @person · ~2h')}</span>`;
    return;
  }
  const parsed = parseQuickAdd(inp.value, { ignore: _qaIgnore });
  const dflt = quickAddDefaults(view);
  for (const t of parsed.tokens) {
    const chip = document.createElement('button'); chip.type = 'button';
    chip.className = 'chip qa-tok qa-' + t.kind + (t.isNew ? ' is-new' : '') + (t.kind === 'priority' && /^p[1-3]$/i.test(t.label) ? ' qa-' + t.label.toLowerCase() : '');
    const lead = t.kind === 'stream' ? `<span class="dot" style="--c:${escAttr(safeColor(t.color, 'var(--fg-subtle)'))}"></span>` : icon(_QA_TOKEN_ICON[t.kind] || 'circle', 'i-xs');
    chip.innerHTML = lead + `<span>${esc(t.label)}</span>` + icon('x', 'i-xs x');
    chip.title = `Read “${t.raw}” as ${t.kind}. Click to keep it as text.`;
    chip.onmousedown = (e) => e.preventDefault();
    chip.onclick = () => { _qaIgnore.push(t.raw); _paintQaPreview(prev, inp, view); inp.focus(); };
    prev.appendChild(chip);
  }
  // What the list adds by itself (so the task stays where it was added).
  const implied = [];
  if (!parsed.dueDate && dflt.dueDate) implied.push(icon('calendar', 'i-xs') + `<span>${esc(dueLabel(dflt.dueDate))}</span>`);
  if (!parsed.stream && dflt.stream && STREAMS[dflt.stream]) implied.push(`<span class="dot" style="--c:${escAttr(safeColor(STREAMS[dflt.stream].color))}"></span><span>${esc(STREAMS[dflt.stream].label)}</span>`);
  for (const t of (dflt.tags || [])) if (!parsed.tags.includes(t)) implied.push(icon('hash', 'i-xs') + `<span>${esc(t)}</span>`);
  for (const pid of (dflt.people || [])) { const p = getPerson(pid); if (p && !parsed.people.includes(pid)) implied.push(icon('at-sign', 'i-xs') + `<span>${esc(p.name)}</span>`); }
  for (const h of implied) { const s = document.createElement('span'); s.className = 'chip qa-tok implied'; s.innerHTML = h; s.title = 'From this list'; prev.appendChild(s); }
  const hint = document.createElement('span'); hint.className = 'qa-enter'; hint.innerHTML = '<kbd class="kbd">Enter</kbd> to add';
  prev.appendChild(hint);
}
/** The #word / @word being typed at the caret, or null. */
function _qaCurrentWord(inp) {
  const pos = inp.selectionStart ?? inp.value.length;
  const before = inp.value.slice(0, pos);
  const m = /(^|\s)([#@+])([\p{L}\p{N}_-]*)$/u.exec(before);
  if (!m) return null;
  return { sigil: m[2], text: m[3].toLowerCase(), start: pos - m[3].length - 1, end: pos };
}
function _paintQaSuggest(sug, inp) {
  const w = _qaCurrentWord(inp);
  if (!w) { sug.hidden = true; _qaSuggest = { items: [], index: 0 }; return; }
  let items = [];
  if (w.sigil === '#' || w.sigil === '+') {
    for (const [id, s] of Object.entries(STREAMS)) {
      if (s.archived) continue;
      const key = String(s.label || id).toLowerCase().replace(/\s+/g, '');
      if (!w.text || key.startsWith(w.text) || id.startsWith(w.text)) items.push({ kind: 'stream', insert: w.sigil + key, label: s.label, color: s.color, hint: 'stream' });
    }
    if (w.sigil === '#') {
      const counts = {};
      for (const it of getAllItems()) for (const t of effTags(it)) counts[t] = (counts[t] || 0) + 1;
      const tags = Object.entries(counts).filter(([t]) => !w.text || t.startsWith(w.text) || t.includes(w.text)).sort((a, b) => b[1] - a[1]).slice(0, 6);
      for (const [t, n] of tags) items.push({ kind: 'tag', insert: '#' + t, label: '#' + t, hint: String(n) });
    }
  } else {
    for (const p of (state.people || [])) {
      if (p.self) continue;
      const first = String(p.name || '').split(/\s+/)[0].toLowerCase();
      const hay = [p.id, String(p.name || '').toLowerCase(), ...(p.aliases || []).map(a => String(a).toLowerCase())];
      if (!w.text || hay.some(h => h.startsWith(w.text) || h.split(/\s+/).some(x => x.startsWith(w.text)))) items.push({ kind: 'person', insert: '@' + (first || p.id), label: p.name, color: p.color, hint: p.role || '' });
    }
    items = items.slice(0, 7);
    if (w.text && !items.length) items.push({ kind: 'new', insert: '@' + w.text, label: `Create “${w.text}”`, hint: 'new person' });
  }
  items = items.slice(0, 8);
  _qaSuggest = { items, index: Math.min(_qaSuggest.index, Math.max(0, items.length - 1)) };
  if (!items.length) { sug.hidden = true; return; }
  sug.innerHTML = '';
  items.forEach((s, i) => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'pop-item' + (i === _qaSuggest.index ? ' on' : '');
    b.setAttribute('role', 'option');
    const lead = s.kind === 'stream' ? `<span class="dot" style="--c:${escAttr(safeColor(s.color))}"></span>`
      : s.kind === 'person' ? `<span class="avatar avatar-16" style="--c:${escAttr(safeColor(s.color, 'var(--sw-slate)'))}">${esc(avatarInitials(s.label))}</span>`
      : icon(s.kind === 'new' ? 'user-plus' : 'hash');
    b.innerHTML = lead + `<span class="lbl">${esc(s.label)}</span>${s.hint ? `<span class="hint">${esc(s.hint)}</span>` : ''}`;
    b.onmousedown = (e) => { e.preventDefault(); _qaAcceptSuggestion(inp, s); _paintQaPreview(inp.closest('.qa-wrap').querySelector('.qa-preview'), inp, state.view); _paintQaSuggest(sug, inp); };
    sug.appendChild(b);
  });
  sug.hidden = false;
}
function _qaAcceptSuggestion(inp, s) {
  const w = _qaCurrentWord(inp); if (!w || !s) return;
  const v = inp.value;
  const insert = s.insert + ' ';
  inp.value = v.slice(0, w.start) + insert + v.slice(w.end).replace(/^\s+/, '');
  const pos = w.start + insert.length;
  inp.setSelectionRange(pos, pos);
  _qaDraft = inp.value;
  _qaSuggest.index = 0;
}

function _openTemplatesPopover(anchor, view) {
  const items = [];
  for (const t of TEMPLATES) {
    items.push({ label: t.label, icon: 'layout-template', hint: STREAMS[t.stream]?.label || '', run: () => {
      const d = new Date(); d.setDate(d.getDate() + (t.daysAhead || 0));
      const id = addCustomTask(t.title, fmtDate(d), t.priority, [...(t.tags || [])], t.stream, t.recurrence || 'none');
      if (id) toast('Added: ' + t.title, { kind: 'ok', action: { label: 'Open', run: () => openTask(id) } });
    } });
  }
  if ((state.taskTemplates || []).length) {
    items.push('sep', { heading: 'Your templates' });
    for (const t of state.taskTemplates) items.push({ label: t.name, icon: 'copy', run: () => applyTemplate(t.id) });
  }
  if (!items.length) items.push({ label: 'No templates yet', disabled: true });
  items.push('sep', { label: 'Manage templates…', icon: 'settings', run: () => openTemplatesModal() });
  openMenu(anchor, items, { align: 'end', width: 280 });
}

/* ---------- board (kanban) ---------- */
function renderKanban(container, o) {
  const { open, closed, view } = o;
  const cols = [
    { key: 'todo', label: 'To do', items: open.filter(i => statusOf(i.id) === 'todo') },
    { key: 'doing', label: 'In progress', items: open.filter(i => statusOf(i.id) === 'doing') },
    { key: 'done', label: view === 'today' ? 'Done today' : 'Done', items: closed },
  ];
  const wrap = document.createElement('div'); wrap.className = 'kanban';
  for (const col of cols) {
    const c = document.createElement('section'); c.className = 'kanban-col';
    c.dataset.status = col.key;
    const h = document.createElement('h3'); h.innerHTML = `${esc(col.label)}<span>${col.items.length}</span>`;
    c.appendChild(h);
    c.addEventListener('dragover', e => { if (!isTaskDrag(e)) return; e.preventDefault(); c.classList.add('dragover'); });
    c.addEventListener('dragleave', (e) => { if (!c.contains(e.relatedTarget)) c.classList.remove('dragover'); });
    c.addEventListener('drop', e => {
      c.classList.remove('dragover');
      const id = draggedTaskId(e); if (!id) return;
      e.preventDefault();
      const cur = statusOf(id);
      if (col.key === cur) return;
      if (col.key === 'done') toggleDone(id);
      else setStatus(id, col.key);
    });
    const list = document.createElement('div'); list.className = 'kanban-list';
    for (const it of col.items) {
      list.appendChild(_renderKanbanCard(it));
      if (col.key !== 'done') _lastRenderedTaskIds.push(it.id);
    }
    if (!col.items.length) { const e = document.createElement('div'); e.className = 'kanban-empty'; e.textContent = col.key === 'done' ? 'Drop here to complete' : 'Nothing here'; list.appendChild(e); }
    c.appendChild(list);
    if (col.key !== 'done') {
      const add = document.createElement('input'); add.className = 'kanban-add'; add.placeholder = '+ Add a task';
      add.dataset.fk = 'kanban-add:' + col.key;
      add.onkeydown = (e) => {
        if (e.key !== 'Enter' || !add.value.trim()) return;
        e.preventDefault();
        const parsed = parseQuickAdd(add.value);
        _keepFocus('kanban-add:' + col.key);
        addParsedTask(parsed, Object.assign(quickAddDefaults(view), { status: col.key }));
      };
      c.appendChild(add);
    }
    wrap.appendChild(c);
  }
  container.appendChild(wrap);
}
function _renderKanbanCard(it) {
  const status = statusOf(it.id);
  const card = document.createElement('div');
  card.className = 'kanban-card' + (state.selectedTaskId === it.id ? ' selected' : '') + (status === 'done' ? ' done' : '') + (isWontDo(it) ? ' wontdo' : '') + (_lastSelectedTaskId === it.id ? ' kb-cursor' : '');
  card.dataset.id = it.id;
  card.draggable = true;
  card.ondragstart = e => _startTaskDrag(e, it, card);
  card.ondragend = () => _endTaskDrag(card);
  const top = document.createElement('div'); top.className = 'kc-top';
  const cb = document.createElement('button'); cb.type = 'button';
  cb.className = 'checkbox ' + effPriority(it) + (status === 'doing' ? ' doing' : '') + (status === 'done' ? (isWontDo(it) ? ' wontdo' : ' done') : '');
  cb.setAttribute('aria-label', (status === 'done' ? 'Reopen: ' : 'Complete: ') + effTitle(it));
  cb.onclick = (e) => { e.stopPropagation(); toggleDone(it.id); };
  const ttl = document.createElement('div'); ttl.className = 'ttl'; ttl.textContent = effTitle(it);
  top.append(cb, ttl);
  card.appendChild(top);
  const meta = document.createElement('div'); meta.className = 'meta';
  const stream = effStream(it);
  const sb = document.createElement('span'); sb.className = 'stream';
  sb.style.setProperty('--c', safeColor(STREAMS[stream]?.color, '#868a94'));
  sb.innerHTML = `${streamMarkHtml(stream, { inherit: true })}<span data-cz-label>${esc(STREAMS[stream]?.label || stream || '')}</span>`;
  if (STREAMS[stream]) czMark(sb, 'stream', stream);   // marker + right-click menu (28-customise.js)
  meta.appendChild(sb);
  const subs = getSubtasks(it.id);
  if (subs.length) { const s = document.createElement('span'); s.className = 'm'; s.innerHTML = icon('list-checks') + `<span>${subs.filter(x => x.done).length}/${subs.length}</span>`; meta.appendChild(s); }
  const sp = document.createElement('span'); sp.className = 'grow'; meta.appendChild(sp);
  const av = _taskAvatarsHtml(it, 2);
  if (av.html) { const a = document.createElement('span'); a.className = 'avatars'; a.innerHTML = av.html; a.title = av.title; meta.appendChild(a); }
  if (effDate(it) && status !== 'done') { const ds = document.createElement('span'); ds.className = 'due-stamp ' + _rowDueClass(it); ds.textContent = rowDueLabel(it); meta.appendChild(ds); }
  card.appendChild(meta);
  const tags = effTags(it);
  if (tags.length) {
    const chips = document.createElement('div'); chips.className = 'chips kc-tags';
    for (const t of tags.slice(0, 2)) { const c = document.createElement('span'); c.className = 'chip'; c.innerHTML = `<span data-cz-label>${esc(t)}</span>`; czTagChip(c, t); chips.appendChild(c); }
    if (tags.length > 2) { const c = document.createElement('span'); c.className = 'chip chip-more'; c.textContent = '+' + (tags.length - 2); chips.appendChild(c); }
    card.appendChild(chips);
  }
  card.onclick = () => { _lastSelectedTaskId = it.id; openTask(it.id, { from: card }); };   // centre card or side panel
  card.oncontextmenu = (e) => { e.preventDefault(); openTaskMenu({ x: e.clientX, y: e.clientY }, it.id); };
  return card;
}
