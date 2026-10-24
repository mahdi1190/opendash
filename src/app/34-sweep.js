/* ============================================================
   TODAY -> TOMORROW and PLAN MY WEEK (owner: Review, v2.16).
   The sweep (Shift+T, the Review menu, Home's Review card in the evening):
   one screen with what is left in Today; one key per task, and the cursor
   moves on: T tomorrow, W next week, S someday, C done, X drop, D waiting on…,
   K keep it in Today, A all the rest to tomorrow; U undo, Enter close.
   Plan my week (Shift+P): the tasks worth planning on the left, the seven days
   on the right with each day's load (meetings + planned work) against your
   capacity (hours a day; weekends optional). 1-7 puts the task under the cursor
   on that day, drag works too, A spreads them all where there is room
   (never after a deadline), U undo. It plans (plannedFor); deadlines stay.
   Daily capacity follows the same idea as the timeline's: booked time from the
   calendar plus estimates (30 min when a task has none).
   ============================================================ */
function rfCapacityHours() { const h = Number(taskViewPrefs('plan').hours); return h >= 1 && h <= 16 ? h : 8; }
function rfPlanWeekends() { return taskViewPrefs('plan').weekends === true; }
function _rfIsWeekend(iso) { const d = new Date(iso + 'T12:00:00').getDay(); return d === 0 || d === 6; }
/** One day's load: meetings and planned work against the capacity (minutes). */
function rfDayLoad(iso) {
  const cap = rfCapacityHours() * 60;
  const evs = typeof _bfEventsOn === 'function' ? _bfEventsOn(iso).filter(e => !e.allDay) : [];
  const meet = Math.min(cap * 2, evs.reduce((t, e) => t + Math.max(0, Number(e.minutes) || 0), 0));
  const tasks = getAllItems().filter(i => rfIsOpen(i) && !rfIsWaiting(i) && (i.plannedFor ? i.plannedFor === iso : effDate(i) === iso));
  const work = tasks.reduce((t, i) => t + (Number(i.estimate) || 30), 0);
  return { date: iso, cap, meet, work, tasks, events: evs.length, free: cap - meet - work, load: (meet + work) / cap };
}
function _rfHours(min) { const h = min / 60; return h >= 10 || Number.isInteger(h) ? `${Math.round(h)} h` : `${h.toFixed(1)} h`; }
/** A row of day cells: name, a bar (meetings, then work), and what is free. */
function rfCapacityStrip(from, n, o) {
  o = o || {};
  const wrap = document.createElement('div'); wrap.className = 'rf-cap' + (o.compact ? ' compact' : '');
  for (let k = 0; k < n; k++) {
    const iso = _isoPlus(k, from);
    const L = rfDayLoad(iso);
    const cell = document.createElement('div');
    cell.className = 'rf-cap-d' + (L.load > 1 ? ' over' : L.load >= 0.85 ? ' tight' : '') + (iso === todayStr() ? ' is-today' : '') + (_rfIsWeekend(iso) ? ' wknd' : '');
    const mp = Math.min(100, Math.round(L.meet / L.cap * 100)), wp = Math.min(100 - mp, Math.round(L.work / L.cap * 100));
    cell.innerHTML = `<div class="rf-cap-h"><b>${esc(rfDayName(iso))}</b><span class="num">${esc(new Date(iso + 'T12:00:00').getDate())}</span></div>`
      + `<div class="rf-cap-bar" title="${escAttr(`${_rfHours(L.meet)} of meetings, ${_rfHours(L.work)} of planned work, against ${rfCapacityHours()} h`)}"><i class="m" style="--pct:${mp}%"></i><i class="w" style="--pct:${wp}%"></i></div>`
      + `<div class="rf-cap-s">${L.free >= 0 ? `${esc(_rfHours(L.free))} free` : `${esc(_rfHours(-L.free))} over`}<span class="muted"> · ${esc(L.tasks.length)} task${L.tasks.length === 1 ? '' : 's'}</span></div>`;
    wrap.appendChild(cell);
  }
  return wrap;
}

/* ---------- Today -> Tomorrow ---------- */
/** What is left in Today (the Today list's own rule, so waiting and blocked tasks are already out). */
function rfSweepTasks() { return getAllItems().filter(i => matchesView(i, 'today')).sort((a, b) => (effDate(a) || a.plannedFor || '').localeCompare(effDate(b) || b.plannedFor || '')); }
const _rfSw = { ids: [], dec: {}, at: 0, hist: [], close: null, root: null };
const RF_SWEEP_KEYS = ['tomorrow', 'nextweek', 'someday', 'done', 'drop', 'wait', 'keep'];
function rfSweepOpen() {
  if (_rfSw.close) _rfSw.close();
  Object.assign(_rfSw, { ids: rfSweepTasks().map(i => i.id), dec: {}, at: 0, hist: [] });
  const onKey = (e) => _rfSweepKey(e);
  window.addEventListener('keydown', onKey, true);
  _rfSw.close = openDialog({
    // Fixed (UI_CLEANUP_PLAN.md 1.3): the list scrolls as tasks are decided; the key legend stays at the bottom.
    title: 'Today → Tomorrow', size: 'lg', fixed: true, className: 'rf-sw', resizable: false,
    body: (b) => { _rfSw.root = b; b.classList.add('rf-sw-b'); b.tabIndex = -1; _rfSweepPaint(); setTimeout(() => { try { b.focus({ preventScroll: true }); } catch (e) {} }, 10); },
    onClose: () => { window.removeEventListener('keydown', onKey, true); _rfSw.close = null; _rfSw.root = null; },
  });
}
function _rfSweepPaint() {
  const b = _rfSw.root; if (!b) return;
  b.innerHTML = '';
  const today = todayStr();
  let doneToday = 0;
  for (const tss of Object.values(state.completionLog || {})) for (const ts of (tss || [])) if (Clock.parts(Number(ts)).iso === today) doneToday++;
  const ids = _rfSw.ids.filter(id => getItem(id));
  const left = ids.filter(id => !_rfSw.dec[id]);
  const head = document.createElement('div'); head.className = 'rf-sw-head';
  head.innerHTML = `<div class="rf-sw-score"><b class="num">${esc(doneToday)}</b><span>done today</span></div><div class="rf-sw-score"><b class="num">${esc(left.length)}</b><span>left to decide</span></div><span class="spacer"></span>`;
  if (left.length > 1) {
    const all = uiButton({ label: `All ${left.length} to tomorrow`, icon: 'sunrise', iconCls: 'i-sm', size: 'sm', run: () => _rfSweepAll() });
    all.insertAdjacentHTML('beforeend', '<kbd class="kbd">A</kbd>');
    head.appendChild(all);
  }
  b.appendChild(head);
  if (!left.length) {
    const end = document.createElement('div'); end.className = 'rf-sw-end';
    const art = typeof animSceneHtml === 'function' ? animSceneHtml(ids.length ? 'celebration' : 'rest', { size: 'hero', once: true }) : '';
    const moved = Object.values(_rfSw.dec).filter(k => k === 'tomorrow').length;
    end.innerHTML = `<div class="rf-end-hero">${art}</div><h2>${ids.length ? 'Today is wrapped up' : 'Nothing left over today'}</h2><p class="muted">${ids.length ? `${esc(moved)} moved to tomorrow. ` : ''}Tomorrow starts clean. Enjoy your evening.</p>`;
    if (ids.length) end.insertAdjacentHTML('beforeend', rfCountsHtml(Object.values(_rfSw.dec).reduce((c, k) => (c[k] = (c[k] || 0) + 1, c), {})));
    const close = uiButton({ label: 'Done', kind: 'primary', run: () => _rfSw.close && _rfSw.close() });
    close.insertAdjacentHTML('beforeend', '<kbd class="kbd">Enter</kbd>');
    end.appendChild(close);
    b.appendChild(end);
    if (ids.length && typeof animBurst === 'function') try { animBurst(end.querySelector('.rf-end-hero'), 'celebration'); } catch (e) {}
    return;
  }
  if (!_rfSw.dec[_rfSw.ids[_rfSw.at]] && getItem(_rfSw.ids[_rfSw.at])) { /* the cursor stays */ } else _rfSw.at = Math.max(0, _rfSw.ids.indexOf(left[0]));
  const ul = document.createElement('ul'); ul.className = 'rf-sw-list'; ul.setAttribute('role', 'listbox');
  for (const id of ids) {
    const i = getItem(id); const dec = _rfSw.dec[id]; const on = _rfSw.ids[_rfSw.at] === id;
    const li = document.createElement('li'); li.className = 'rf-sw-row anim-hover-host' + (on ? ' on' : '') + (dec ? ' decided t-' + (RF_KINDS[dec].tone || 'plain') : '');
    li.setAttribute('role', 'option'); li.setAttribute('aria-selected', on ? 'true' : 'false'); li.dataset.id = id;
    const sec = typeof todaySectionOf === 'function' ? todaySectionOf(i) : '';
    const why = sec === 'overdue' ? `${-daysUntil(effDate(i))} d overdue` : sec === 'due' ? 'due today' : sec === 'planned' ? 'planned for today' : 'in progress';
    const art = typeof animSceneHtml === 'function' && typeof animForTask === 'function' ? animSceneHtml(animForTask(i).type, { size: 'xs', hover: true }) : '';
    li.innerHTML = `${art}<span class="rf-sw-main"><span class="rf-sw-t"></span><span class="rf-sw-s">${typeof streamMarkHtml === 'function' ? streamMarkHtml(effStream(i)) : ''}<span>${esc(why)}</span></span></span>`
      + (dec ? `<span class="rf-sw-dec">${icon(RF_KINDS[dec].icon, 'i-xs')}<span>${esc(RF_KINDS[dec].label)}</span></span>` : '');
    li.querySelector('.rf-sw-t').textContent = effTitle(i);
    if (!dec) {
      const acts = document.createElement('span'); acts.className = 'rf-sw-acts';
      for (const kind of RF_SWEEP_KEYS) {
        const k = RF_KINDS[kind];
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'rf-mini t-' + (k.tone || 'plain'); btn.dataset.kind = kind;
        btn.title = `${k.label} (${k.key.toUpperCase()})`; btn.setAttribute('aria-label', k.label);
        btn.innerHTML = `${icon(k.icon, 'i-xs')}<kbd>${esc(k.key.toUpperCase())}</kbd>`;
        btn.onclick = (e) => { e.stopPropagation(); _rfSw.at = _rfSw.ids.indexOf(id); _rfSweepDecide(kind, btn); };
        acts.appendChild(btn);
      }
      li.appendChild(acts);
    }
    li.onclick = () => { _rfSw.at = _rfSw.ids.indexOf(id); _rfSweepPaint(); };
    ul.appendChild(li);
  }
  b.appendChild(ul);
  const foot = document.createElement('div'); foot.className = 'rf-foot';
  foot.innerHTML = `<span><kbd class="kbd">T</kbd> tomorrow <kbd class="kbd">W</kbd> next week <kbd class="kbd">S</kbd> someday <kbd class="kbd">C</kbd> done <kbd class="kbd">X</kbd> drop <kbd class="kbd">D</kbd> waiting <kbd class="kbd">K</kbd> keep</span><span class="spacer"></span><span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> move · <kbd class="kbd">U</kbd> undo</span>`;
  b.appendChild(foot);
  const cur = ul.querySelector('.rf-sw-row.on'); if (cur) cur.scrollIntoView({ block: 'nearest' });
  if (typeof animActivate === 'function') try { animActivate(b); } catch (e) {}
}
function _rfSweepDecide(kind, btn) {
  const id = _rfSw.ids[_rfSw.at];
  if (!id || !getItem(id) || _rfSw.dec[id]) return;
  const done = (mark) => {
    _rfSw.hist.push({ ids: [id], mark });
    _rfSw.dec[id] = kind;
    const nx = _rfSw.ids.findIndex((x, k) => k > _rfSw.at && !_rfSw.dec[x] && getItem(x));
    _rfSw.at = nx >= 0 ? nx : Math.max(0, _rfSw.ids.findIndex(x => !_rfSw.dec[x] && getItem(x)));
    _rfSweepPaint();
  };
  if (kind === 'wait') { rfPickPerson(btn || (_rfSw.root && _rfSw.root.querySelector('.rf-sw-row.on')), { taskId: id, onPick: (pid) => done(rfDo('wait', id, { person: pid })) }); return; }
  if (kind === 'keep') { done(null); return; }                 // stays in Today, untouched
  done(rfDo(kind, id, { reason: 'End of day' }));
}
function _rfSweepAll() {
  const left = _rfSw.ids.filter(id => !_rfSw.dec[id] && getItem(id));
  if (!left.length) return;
  const mark = rfDoMany(left.map(id => ['tomorrow', id, { reason: 'End of day' }]));
  _rfSw.hist.push({ ids: left, mark });
  for (const id of left) _rfSw.dec[id] = 'tomorrow';
  _rfSweepPaint();
}
function _rfSweepUndo() {
  const h = _rfSw.hist.pop();
  if (!h) { toast('Nothing to undo here yet', { icon: 'undo-2' }); return; }
  if (h.mark) undoMarked(h.mark);
  for (const id of h.ids) delete _rfSw.dec[id];
  _rfSw.at = Math.max(0, _rfSw.ids.indexOf(h.ids[0]));
  _rfSweepPaint();
}
function _rfSweepKey(e) {
  if (!_rfSw.root) return;
  const stopIt = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  if ([...document.querySelectorAll('.pop')].some(n => n.getClientRects().length > 0)) { if (e.key === 'Escape') { stopIt(); closePopovers(); } return; }
  const t = e.target;
  if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return;
  if (e.key === 'Escape' || e.key === 'Tab') return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { stopIt(); _rfSweepUndo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const live = _rfSw.ids.filter(id => getItem(id));
  if (k === 'ArrowDown' || k === 'ArrowUp') {
    stopIt();
    const order = live; let at = order.indexOf(_rfSw.ids[_rfSw.at]); at = Math.max(0, Math.min(order.length - 1, at + (k === 'ArrowDown' ? 1 : -1)));
    _rfSw.at = _rfSw.ids.indexOf(order[at]); _rfSweepPaint(); return;
  }
  if (k === 'Enter') { if (t && t.tagName === 'BUTTON' && t.closest('.rf-sw-b')) return; stopIt(); if (!live.some(id => !_rfSw.dec[id])) { if (_rfSw.close) _rfSw.close(); } return; }
  if (k === 'u' || k === 'Backspace') { stopIt(); _rfSweepUndo(); return; }
  if (k === 'a') { stopIt(); _rfSweepAll(); return; }
  const kind = RF_SWEEP_KEYS.find(x => RF_KINDS[x].key === k);
  if (kind) { stopIt(); _rfSweepDecide(kind, _rfSw.root.querySelector(`.rf-sw-row.on [data-kind="${kind}"]`)); return; }
  if (k.length === 1) e.stopImmediatePropagation();
}

/* ---------- Plan my week ---------- */
const _rfPw = { from: '', at: 0, ids: [], hist: [], close: null, root: null };
/** Worth planning: open, not waiting or someday, no plan inside the week, and due within two weeks, overdue, or important. */
function _rfPlanCands(from) {
  const to = _isoPlus(6, from), soon = _isoPlus(13, from);
  return getAllItems().filter(i => {
    if (!rfIsOpen(i) || rfIsWaiting(i) || rfIsSomeday(i) || effRecurrence(i) !== 'none') return false;
    if (i.plannedFor && i.plannedFor >= from && i.plannedFor <= to) return false;
    const d = effDate(i);
    if (d && d >= from && d <= to) return true;
    return (d && d <= soon) || effPriority(i) === 'p1' || effPriority(i) === 'p2' || statusOf(i.id) === 'doing';
  }).sort((a, b) => String(effDate(a) || '9999').localeCompare(String(effDate(b) || '9999')) || (PRIORITY_ORDER[effPriority(a)] - PRIORITY_ORDER[effPriority(b)])).slice(0, 60);
}
function rfPlanWeekOpen(o) {
  o = o || {};
  if (_rfPw.close) _rfPw.close();
  // This week when there is still most of it ahead, else next week.
  const ws = fmtDate(_qaWeekStart(_qaToday()));
  const fromDef = daysUntil(_isoPlus(4, ws)) >= 0 ? todayStr() : rfNextWeek();
  Object.assign(_rfPw, { from: o.from && o.from >= todayStr() ? o.from : (o.from ? todayStr() : fromDef), at: 0, hist: [] });
  const onKey = (e) => _rfPlanKey(e);
  window.addEventListener('keydown', onKey, true);
  _rfPw.close = openDialog({
    // Fixed and tall (UI_CLEANUP_PLAN.md 1.3): each day column scrolls inside as tasks are placed.
    title: 'Plan my week', size: 'xl', fixed: true, height: '90vh', className: 'rf-pw', resizable: false,
    body: (b) => { _rfPw.root = b; b.classList.add('rf-pw-b'); b.tabIndex = -1; _rfPlanPaint(); setTimeout(() => { try { b.focus({ preventScroll: true }); } catch (e) {} }, 10); },
    onClose: () => { window.removeEventListener('keydown', onKey, true); _rfPw.close = null; _rfPw.root = null; },
  });
}
function _rfPlanDays() {
  const out = [];
  for (let k = 0; k < 7; k++) { const iso = _isoPlus(k, _rfPw.from); out.push(iso); }
  return out;
}
function _rfPlanPaint() {
  const b = _rfPw.root; if (!b) return;
  b.innerHTML = '';
  const days = _rfPlanDays();
  const cands = _rfPlanCands(_rfPw.from);
  _rfPw.ids = cands.map(i => i.id);
  _rfPw.at = Math.max(0, Math.min(_rfPw.ids.length - 1, _rfPw.at));
  const bar = document.createElement('div'); bar.className = 'rf-pw-bar';
  const sel = document.createElement('select'); sel.className = 'control control-sm'; sel.setAttribute('aria-label', 'Hours of work a day');
  for (const h of [4, 5, 6, 7, 8, 9, 10]) { const op = document.createElement('option'); op.value = h; op.textContent = `${h} h a day`; if (h === rfCapacityHours()) op.selected = true; sel.appendChild(op); }
  sel.onchange = () => { setTaskViewPref('plan', { hours: Number(sel.value) }); _rfPlanPaint(); };
  const wk = document.createElement('label'); wk.className = 'rf-pw-wk';
  wk.innerHTML = `<input type="checkbox"${rfPlanWeekends() ? ' checked' : ''}><span>Weekends</span>`;
  wk.querySelector('input').onchange = (e) => { setTaskViewPref('plan', { weekends: e.target.checked || null }); _rfPlanPaint(); };
  const nav = (dir) => uiButton({ icon: dir < 0 ? 'chevron-left' : 'chevron-right', iconCls: 'i-sm', size: 'sm', aria: dir < 0 ? 'Earlier' : 'Later', disabled: dir < 0 && _rfPw.from <= todayStr(),
    run: () => { const nx = _isoPlus(dir * 7, _rfPw.from); _rfPw.from = nx < todayStr() ? todayStr() : nx; _rfPlanPaint(); } });
  const auto = uiButton({ label: `Auto-plan ${cands.length}`, icon: 'wand-sparkles', iconCls: 'i-sm', kind: 'primary', size: 'sm', disabled: !cands.length, run: () => _rfPlanAuto() });
  auto.insertAdjacentHTML('beforeend', '<kbd class="kbd">A</kbd>');
  bar.innerHTML = `<b class="rf-pw-range">${esc(_rfShort(days[0]))} – ${esc(_rfShort(days[6]))}</b>`;
  bar.prepend(nav(-1)); bar.appendChild(nav(1));
  bar.append(Object.assign(document.createElement('span'), { className: 'spacer' }), sel, wk, auto);
  b.appendChild(bar);
  const grid = document.createElement('div'); grid.className = 'rf-pw-grid';
  // Left: to plan.
  const pool = document.createElement('section'); pool.className = 'rf-pw-pool';
  pool.innerHTML = `<div class="rf-sub"><b>To plan</b><span class="n">${esc(cands.length)}</span></div>`;
  const ul = document.createElement('ul'); ul.className = 'rf-pw-list';
  cands.forEach((i, k) => {
    const li = document.createElement('li'); li.className = 'rf-pw-item' + (k === _rfPw.at ? ' on' : '') + (rfIsBlocked(i) ? ' is-blocked' : ''); li.draggable = true; li.dataset.id = i.id;
    const d = effDate(i), n = d ? daysUntil(d) : null;
    li.innerHTML = `${typeof streamMarkHtml === 'function' ? streamMarkHtml(effStream(i)) : ''}<span class="rf-pw-t"></span><span class="rf-pw-s">${d ? `<span class="${n < 0 ? 'late' : ''}">${esc(n < 0 ? `${-n} d late` : 'due ' + rfDayName(d))}</span>` : ''}${effPriority(i) === 'p1' ? icon('flag', 'i-xs') : ''}<span class="muted">${esc(typeof fmtEstimate === 'function' ? fmtEstimate(Number(i.estimate) || 30) : (i.estimate || 30) + ' min')}</span>${rfIsBlocked(i) ? icon('lock', 'i-xs') : ''}</span>`;
    li.querySelector('.rf-pw-t').textContent = effTitle(i);
    li.onclick = () => { _rfPw.at = k; _rfPlanPaint(); };
    li.ondragstart = (e) => { e.dataTransfer.setData('text/x-rf-task', i.id); e.dataTransfer.effectAllowed = 'move'; li.classList.add('dragging'); };
    li.ondragend = () => li.classList.remove('dragging');
    ul.appendChild(li);
  });
  if (!cands.length) ul.innerHTML = `<li class="rf-pw-none">${icon('check-check', 'i-sm')}<span>Everything worth planning has a day.</span></li>`;
  pool.appendChild(ul);
  grid.appendChild(pool);
  // Right: the days.
  const cols = document.createElement('div'); cols.className = 'rf-pw-days';
  days.forEach((iso, k) => {
    const L = rfDayLoad(iso);
    const col = document.createElement('section'); col.className = 'rf-pw-day' + (L.load > 1 ? ' over' : L.load >= 0.85 ? ' tight' : '') + (_rfIsWeekend(iso) && !rfPlanWeekends() ? ' off' : '') + (iso === todayStr() ? ' is-today' : '');
    const mp = Math.min(100, Math.round(L.meet / L.cap * 100)), wp = Math.min(100 - mp, Math.round(L.work / L.cap * 100));
    col.innerHTML = `<div class="rf-pw-dh"><kbd class="kbd">${k + 1}</kbd><b>${esc(rfDayName(iso))}</b><span class="num muted">${esc(new Date(iso + 'T12:00:00').getDate())}</span></div>`
      + `<div class="rf-cap-bar" title="${escAttr(`${_rfHours(L.meet)} of meetings + ${_rfHours(L.work)} of work, against ${rfCapacityHours()} h`)}"><i class="m" style="--pct:${mp}%"></i><i class="w" style="--pct:${wp}%"></i></div>`
      + `<div class="rf-cap-s">${L.free >= 0 ? `${esc(_rfHours(L.free))} free` : `${esc(_rfHours(-L.free))} over`}${L.events ? `<span class="muted"> · ${esc(L.events)} meeting${L.events === 1 ? '' : 's'}</span>` : ''}</div>`;
    const list = document.createElement('ul'); list.className = 'rf-pw-dl';
    for (const t of L.tasks) {                                   // the column scrolls, so every task shows
      const li = document.createElement('li'); li.className = 'rf-pw-chip' + (t.plannedFor === iso ? ' planned' : ' due');
      li.innerHTML = `${typeof streamMarkHtml === 'function' ? streamMarkHtml(effStream(t)) : ''}<span></span>`;
      li.querySelector('span:last-child').textContent = effTitle(t);
      li.title = (t.plannedFor === iso ? 'Planned' : 'Due') + ': ' + effTitle(t);
      if (t.plannedFor === iso) {
        const x = document.createElement('button'); x.type = 'button'; x.className = 'rf-pw-x'; x.setAttribute('aria-label', 'Unplan'); x.innerHTML = icon('x', 'i-xs');
        x.onclick = (e) => { e.stopPropagation(); _rfPw.hist.push(rfDo('plan', t.id, { date: null })); _rfPlanPaint(); };
        li.appendChild(x);
      }
      list.appendChild(li);
    }
    col.appendChild(list);
    col.ondragover = (e) => { if ([...e.dataTransfer.types].includes('text/x-rf-task')) { e.preventDefault(); col.classList.add('drag-over'); } };
    col.ondragleave = (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over'); };
    col.ondrop = (e) => { e.preventDefault(); col.classList.remove('drag-over'); const id = e.dataTransfer.getData('text/x-rf-task'); if (id) _rfPlanPut(id, iso); };
    col.onclick = (e) => { if (e.target.closest('button')) return; const id = _rfPw.ids[_rfPw.at]; if (id) _rfPlanPut(id, iso); };
    cols.appendChild(col);
  });
  grid.appendChild(cols);
  b.appendChild(grid);
  const foot = document.createElement('div'); foot.className = 'rf-foot';
  foot.innerHTML = `<span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> pick a task · <kbd class="kbd">1</kbd>–<kbd class="kbd">7</kbd> put it on that day (or drag it, or click a day) · <kbd class="kbd">A</kbd> auto-plan · <kbd class="kbd">U</kbd> undo</span><span class="spacer"></span><span class="muted">Plans the day you work on it; deadlines stay as they are.</span>`;
  b.appendChild(foot);
  const cur = ul.querySelector('.rf-pw-item.on'); if (cur) cur.scrollIntoView({ block: 'nearest' });
}
function _rfPlanPut(id, iso) {
  const i = getItem(id); if (!i) return;
  const m = rfDo('plan', id, { date: iso });
  if (m) _rfPw.hist.push(m);
  const d = effDate(i);
  if (d && iso > d) toast(`Planned after its deadline (${dueLabel(d)})`, { icon: 'triangle-alert' });
  _rfPlanPaint();
}
/** Spread every candidate over the days with room: earliest deadline first, never after a deadline, the emptiest day that fits. */
function _rfPlanAuto() {
  const days = _rfPlanDays().filter(iso => iso >= todayStr() && (rfPlanWeekends() || !_rfIsWeekend(iso)));
  if (!days.length) return;
  const free = new Map(days.map(iso => [iso, rfDayLoad(iso).free]));
  const pairs = [];
  let skipped = 0;
  for (const i of _rfPlanCands(_rfPw.from)) {
    if (rfIsBlocked(i)) { skipped++; continue; }
    const need = Number(i.estimate) || 30;
    const d = effDate(i);
    const ok = days.filter(iso => !d || iso <= d);
    const pool = ok.length ? ok : [days[0]];
    // The emptiest day that fits; ties go to the earliest. Nothing fits: a task with a deadline still goes on its last good day.
    const fits = pool.filter(iso => free.get(iso) >= need);
    let pick = null;
    if (fits.length) pick = fits.reduce((a, b) => (free.get(b) > free.get(a) + 29 ? b : a), fits[0]);
    else if (d) pick = pool[pool.length - 1];
    if (!pick) { skipped++; continue; }
    free.set(pick, free.get(pick) - need);
    pairs.push(['plan', i.id, { date: pick }]);
  }
  if (!pairs.length) { toast(skipped ? 'No room left this week: every day is full' : 'Nothing to plan', { icon: 'calendar-days' }); return; }
  const m = rfDoMany(pairs);
  _rfPw.hist.push(m);
  const nDays = new Set(pairs.map(p => p[2].date)).size;
  rfToast(`Planned ${pairs.length} task${pairs.length === 1 ? '' : 's'} over ${nDays} day${nDays === 1 ? '' : 's'}${skipped ? ` · ${skipped} left (no room or blocked)` : ''}`, m, 'wand-sparkles');
  _rfPlanPaint();
}
function _rfPlanKey(e) {
  if (!_rfPw.root) return;
  const stopIt = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  if ([...document.querySelectorAll('.pop')].some(n => n.getClientRects().length > 0)) { if (e.key === 'Escape') { stopIt(); closePopovers(); } return; }
  const t = e.target;
  if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return;
  if (e.key === 'Escape' || e.key === 'Tab') return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { stopIt(); const m = _rfPw.hist.pop(); if (m) { undoMarked(m); _rfPlanPaint(); } return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'j' || k === 'k') { stopIt(); _rfPw.at = Math.max(0, Math.min(_rfPw.ids.length - 1, _rfPw.at + (k === 'ArrowDown' || k === 'j' ? 1 : -1))); _rfPlanPaint(); return; }
  if (/^[1-7]$/.test(k)) { stopIt(); const id = _rfPw.ids[_rfPw.at]; if (id) _rfPlanPut(id, _rfPlanDays()[Number(k) - 1]); return; }
  if (k === 'a') { stopIt(); _rfPlanAuto(); return; }
  if (k === 'u' || k === 'Backspace') { stopIt(); const m = _rfPw.hist.pop(); if (m) { undoMarked(m); _rfPlanPaint(); } else toast('Nothing to undo here yet', { icon: 'undo-2' }); return; }
  if (k === 'Enter') { if (t && t.tagName === 'BUTTON' && t.closest('.rf-pw-b')) return; stopIt(); if (_rfPw.close) _rfPw.close(); return; }
  if (k.length === 1) e.stopImmediatePropagation();
}
