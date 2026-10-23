/* ============================================================
   TASK UI PIECES (owner: Tasks)
     openDueDatePopover(anchor, {value, time, allowTime, title, onPick(date|null, time|null)})
     buildMiniMonth(el, {month, value, onPick, counts})
     openPriorityMenu / openStreamMenu / openPeoplePicker / openTaskMenu(anchor|{x,y}, id)
     renderMarkdown(text) -> safe HTML (escaped first, then a small markdown subset)
     openTaskDisplayPopover(anchor)  sort / group / rows for the current view
     renderBulkBar()                 the multi-select action bar (+ Select all); bulk* actions
     task keyboard shortcuts         j/k, x, s, d, p, 1-4, t, e, Del (x t d 1-4 Del act on
                                     the selection when tasks are ticked)
     setDueWithNote(id, date, time)  a new due date; a toast + Undo when the task leaves the list
     palette commands                for the open task / the keyboard cursor, with their keys
   ============================================================ */

/* ---------- focus that survives a re-render ---------- */
let _pendingFocusKey = null;
function _keepFocus(key) { _pendingFocusKey = key; }
function _restoreFocus() {
  if (!_pendingFocusKey) return;
  const el = document.querySelector(`[data-fk="${CSS.escape(_pendingFocusKey)}"]`);
  if (el) { _pendingFocusKey = null; try { el.focus({ preventScroll: true }); } catch (e) {} }
}

/* ---------- mini month ---------- */
function buildMiniMonth(el, o) {
  o = o || {};
  const today = todayStr();
  let cur = o.month || (o.value || today).slice(0, 7);
  const paint = () => {
    const [y, m] = cur.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const ws = _tWeekStart();
    const lead = (first.getDay() - ws + 7) % 7; // clock-ok: wall date
    const start = new Date(y, m - 1, 1 - lead);
    const counts = o.counts || {};
    let html = `<div class="mm-h"><button type="button" class="btn-icon btn-sm" data-mm="prev" aria-label="Previous month">${icon('chevron-left')}</button>`
      + `<b>${esc(first.toLocaleDateString(_locale(), { month: 'long', year: 'numeric' }))}</b>`
      + `<button type="button" class="btn-icon btn-sm" data-mm="next" aria-label="Next month">${icon('chevron-right')}</button></div><div class="mm-g">`;
    for (let i = 0; i < 7; i++) html += `<span class="mm-wd">${esc(new Date(2024, 0, 7 + ws + i).toLocaleDateString(_locale(), { weekday: 'narrow' }))}</span>`;
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); // clock-ok: wall date
      if (i >= 35 && d.getMonth() !== m - 1) break; // clock-ok: wall date
      const ds = fmtDate(d);
      const cls = ['mm-d', d.getMonth() !== m - 1 ? 'out' : '', ds === today ? 'today' : '', ds === o.value ? 'sel' : '', ds < today ? 'past' : '', counts[ds] ? 'has' : ''].filter(Boolean).join(' '); // clock-ok: wall date
      html += `<button type="button" class="${cls}" data-date="${ds}" title="${escAttr(d.toLocaleDateString(_locale(), { weekday: 'long', day: 'numeric', month: 'long' }) + (counts[ds] ? ` · ${counts[ds]} open` : ''))}">${d.getDate()}</button>`; // clock-ok: wall date
    }
    el.innerHTML = html + '</div>';
    el.querySelector('[data-mm="prev"]').onclick = (e) => { e.stopPropagation(); const d = new Date(y, m - 2, 1); cur = fmtDate(d).slice(0, 7); paint(); };
    el.querySelector('[data-mm="next"]').onclick = (e) => { e.stopPropagation(); const d = new Date(y, m, 1); cur = fmtDate(d).slice(0, 7); paint(); };
    el.querySelectorAll('[data-date]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); o.onPick && o.onPick(b.dataset.date); }; });
  };
  el.classList.add('mini-month');
  paint();
}
function _openCountsByDay() {
  const c = {};
  for (const it of getAllItems()) { if (statusOf(it.id) === 'done') continue; const d = effDate(it); if (d) c[d] = (c[d] || 0) + 1; }
  return c;
}

/* ---------- due date popover ---------- */
function openDueDatePopover(anchor, o) {
  o = o || {};
  return openPopover(anchor, (el, close) => {
    el.classList.add('due-pop');
    const pick = (d, t) => { close(); o.onPick && o.onPick(d, t === undefined ? (o.time || null) : t); };
    if (o.title) { const h = document.createElement('div'); h.className = 'pop-label'; h.textContent = o.title; el.appendChild(h); }
    const box = document.createElement('label'); box.className = 'input input-sm due-pop-in';
    box.innerHTML = icon('calendar');
    const inp = document.createElement('input'); inp.placeholder = 'Type a date: fri, 15 oct, in 2 weeks';
    inp.setAttribute('autofocus', '');
    const hint = document.createElement('span'); hint.className = 'due-pop-hint';
    box.append(inp, hint);
    el.appendChild(box);
    const parseTyped = () => {
      const p = parseQuickAdd('x ' + inp.value.trim());
      return p.dueDate ? { date: p.dueDate, time: p.dueTime } : null;
    };
    inp.oninput = () => { const r = parseTyped(); hint.textContent = r ? dueLabel(r.date) + (r.time ? ' ' + r.time : '') : ''; };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); const r = parseTyped(); if (r) pick(r.date, r.time || undefined); } };
    const t0 = _qaToday();
    const quick = [
      ['Today', 'sun', fmtDate(t0)],
      ['Tomorrow', 'sunrise', fmtDate(_qaAdd(t0, 1))],
      ['This weekend', 'coffee', fmtDate(_qaNextWeekday(t0, 6, false))],
      ['Next week', 'calendar-plus', fmtDate(_qaAdd(_qaWeekStart(t0), 7))],
    ];
    const list = document.createElement('div'); list.className = 'due-pop-quick';
    for (const [label, ic, iso] of quick) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pop-item' + (o.value === iso ? ' on' : '');
      b.innerHTML = icon(ic) + `<span class="lbl">${esc(label)}</span><span class="hint">${esc(_dayLabel(iso, { weekday: 'short', day: 'numeric', month: 'short' }))}</span>`;
      b.onclick = () => pick(iso);
      list.appendChild(b);
    }
    if (o.value || o.allowClear) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pop-item';
      b.innerHTML = icon('circle-x') + '<span class="lbl">No date</span>';
      b.onclick = () => pick(null, null);
      list.appendChild(b);
    }
    el.appendChild(list);
    const mm = document.createElement('div');
    buildMiniMonth(mm, { value: o.value, counts: _openCountsByDay(), onPick: (d) => pick(d) });
    el.appendChild(mm);
    if (o.allowTime) {
      const tr = document.createElement('div'); tr.className = 'due-pop-time';
      tr.innerHTML = icon('clock') + '<span>Time</span>';
      const ti = document.createElement('input'); ti.type = 'time'; ti.className = 'control control-sm'; ti.value = o.time || '';
      ti.onchange = () => { if (o.value) { close(); o.onPick && o.onPick(o.value, ti.value || null); } };
      tr.appendChild(ti);
      if (o.time) { const x = document.createElement('button'); x.type = 'button'; x.className = 'btn btn-ghost btn-sm'; x.textContent = 'Clear'; x.onclick = () => { close(); o.onPick && o.onPick(o.value, null); }; tr.appendChild(x); }
      if (!o.value) { ti.disabled = true; ti.title = 'Pick a date first'; }
      el.appendChild(tr);
    }
  }, { width: 280, align: o.align || 'start' });
}

/* ---------- small task pickers ---------- */
function openPriorityMenu(anchor, id) {
  const item = getItem(id); if (!item) return;
  const cur = effPriority(item);
  const mk = (k, label, kbd) => ({ label, icon: 'flag', className: 'prio-item ' + k, checked: cur === k, kbd, run: () => { setOverride(id, 'priority', k); render(); } });
  openMenu(anchor, [mk('p1', 'High', '1'), mk('p2', 'Medium', '2'), mk('p3', 'Low', '3'), mk('p0', 'No priority', '4')], { align: 'start', width: 200 });
}
function openStreamMenu(anchor, id, onPick) {
  const item = id ? getItem(id) : null;
  const cur = item ? effStream(item) : null;
  const rows = Object.entries(STREAMS).filter(([k, s]) => !s.archived || k === cur).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
  openMenu(anchor, rows.map(([k, s]) => ({
    label: s.label, icon: streamMarkHtml(k), checked: cur === k,
    run: () => { if (onPick) onPick(k); else setStreamWithNote(id, k); },
  })), { align: 'start', width: 220 });
}
/** Link people to a task: search, toggle, or create a new person by name. */
function openPeoplePicker(anchor, id) {
  return openPopover(anchor, (el, close) => {
    el.classList.add('people-pop');
    const box = document.createElement('label'); box.className = 'input input-sm';
    box.innerHTML = icon('search');
    const inp = document.createElement('input'); inp.placeholder = 'Find or add a person'; inp.setAttribute('autofocus', '');
    box.appendChild(inp);
    el.appendChild(box);
    const list = document.createElement('div'); list.className = 'pp-list';
    el.appendChild(list);
    let idx = 0, rows = [];
    const paint = () => {
      const item = getItem(id); if (!item) { close(); return; }
      // Everyone linked, also through a tag (effPeople), so a tick can always be undone.
      const linked = new Set(typeof effPeople === 'function' ? effPeople(item) : (item.people || []));
      const q = inp.value.trim().toLowerCase();
      const people = (state.people || []).filter(p => !p.self);
      const match = (p) => !q || [p.id, p.name, p.role, ...(p.aliases || [])].some(x => String(x || '').toLowerCase().includes(q));
      rows = [];
      // Linked ids with no profile yet: offer to create one.
      for (const pid of linked) if (!getPerson(pid) && (!q || pid.includes(q))) rows.push({ kind: 'orphan', id: pid, name: pid });
      for (const p of people.filter(match).sort((a, b) => (linked.has(b.id) - linked.has(a.id)) || String(a.name).localeCompare(String(b.name))).slice(0, 30)) rows.push({ kind: 'person', p, on: linked.has(p.id) });
      if (q && !people.some(p => String(p.name || '').toLowerCase() === q)) rows.push({ kind: 'create', name: inp.value.trim() });
      idx = Math.min(idx, Math.max(0, rows.length - 1));
      list.innerHTML = '';
      rows.forEach((r, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pop-item' + (i === idx ? ' on' : '');
        if (r.kind === 'person') {
          b.innerHTML = `<span class="avatar avatar-16" style="--c:${escAttr(safeColor(r.p.color, 'var(--sw-slate)'))}">${esc(avatarInitials(r.p.name))}</span><span class="lbl">${esc(r.p.name)}</span>`
            + (r.p.role ? `<span class="hint">${esc(r.p.role)}</span>` : '') + (r.on ? icon('check', 'chk') : '');
          b.setAttribute('aria-checked', r.on ? 'true' : 'false');
        } else if (r.kind === 'orphan') {
          b.innerHTML = `<span class="avatar avatar-16 unknown">${esc(avatarInitials(r.name))}</span><span class="lbl">${esc(r.name)}</span><span class="hint">no profile · create</span>`;
        } else {
          b.innerHTML = icon('user-plus') + `<span class="lbl">Create “${esc(r.name)}”</span><span class="hint">new person</span>`;
        }
        b.onclick = () => act(r);
        list.appendChild(b);
      });
      if (!rows.length) list.innerHTML = '<div class="pop-empty">No people yet. Type a name to add one.</div>';
    };
    const act = (r) => {
      if (!r) return;
      const item = getItem(id); if (!item) return;
      const cur = item.people || [];
      if (r.kind === 'person') {
        // removePersonFromTask remembers the unlink, so a tag or the backfill does not bring them back (50-people.js).
        if (r.on) removePersonFromTask(id, r.p.id); else addPersonToTask(id, r.p.id);
      } else if (r.kind === 'orphan') {
        const nice = r.name.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, c => c.toUpperCase());
        state.people.push({ id: r.name, name: nice, kind: 'person', email: '', emails: [], role: '', aliases: [], streams: [], color: '#475569', createdAt: Date.now() });
        saveData();
        toast(`Created ${nice}`, { kind: 'ok', icon: 'user-plus', action: { label: 'Open', run: () => openPerson(r.name) } });
      } else {
        const pid = ensurePersonByName(r.name);
        if (pid && !cur.includes(pid)) setOverride(id, 'people', [...cur, pid]); else saveData();
        toast(`Added ${r.name} to People`, { kind: 'ok', icon: 'user-plus' });
        inp.value = '';
      }
      render(); paint(); inp.focus();
    };
    inp.oninput = () => { idx = 0; paint(); };
    inp.onkeydown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (rows.length) { idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length; paint(); } }
      if (e.key === 'Enter') { e.preventDefault(); act(rows[idx]); }
    };
    paint();
  }, { width: 280, align: 'start' });
}

/**
 * A new due date (and time: undefined keeps it, null clears it) as ONE undo step. When the task
 * then leaves the list on screen (and is not open in the card or the panel), a toast says where
 * it went, with Undo: the row vanishing on its own looked like the task was lost.
 */
function _taskListedHere(x) { return !!x && typeof isTaskView === 'function' && isTaskView(state.view) && typeof matchesView === 'function' && matchesView(x, state.view); }
function _taskOpenNow(id) { return state.selectedTaskId === id || (typeof tcCurrentTaskId === 'function' && tcCurrentTaskId() === id); }
/** Move a task to another stream; in a stream's own list (where it then vanishes) a toast says where it went, with Undo. */
function setStreamWithNote(id, k) {
  const it = getItem(id); if (!it || effStream(it) === k) return;
  const before = _taskListedHere(it);
  setOverride(id, 'stream', k); render();
  if (before && !_taskOpenNow(id) && !_taskListedHere(getItem(id))) toast(`Moved to ${STREAMS[k]?.label || k}`, { kind: 'ok', icon: 'layers', action: { label: 'Undo', run: () => undo() } });
}
/** Before a deadline changes: what the toast afterwards needs to know. */
function dueMoveSnap(id) {
  const it = getItem(id);
  const due = it ? effDate(it) : null;
  return { listed: _taskListedHere(it), dueToday: !!due && due <= todayStr() };
}
/** "Sat 1 Nov" (the year when it is not this year; today and tomorrow in words). */
function dueMoveLabel(iso) {
  const d = daysUntil(iso);
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  return _dayLabel(iso, { weekday: 'short', day: 'numeric', month: 'short', year: String(iso).slice(0, 4) !== todayStr().slice(0, 4) ? 'numeric' : undefined });
}
/**
 * The toast after a deadline moved (already saved, one undo step): "Moved to Sat 1 Nov", Undo.
 * When it was due today (or overdue) and Today still lists it, it says why: "· still planned for
 * today" (its section, 21-task-query.js) with Not today (takes the plan away), or "· still in
 * Today: in progress". Otherwise it shows only when the task left the list on screen, or o.always
 * (drops, menus). Returns true when it showed.
 */
function dueMovedToast(id, iso, snap, o) {
  o = o || {};
  const it = getItem(id); if (!it) return false;
  const today = todayStr();
  const out = !!(snap && snap.dueToday) && !(iso && iso <= today);
  const still = out && statusOf(id) !== 'done' && inViewScope(it, 'today', today);
  const planned = still && !!it.plannedFor && it.plannedFor <= today;
  const left = !!(snap && snap.listed) && !_taskListedHere(it) && !_taskOpenNow(id);
  if (!o.always && !still && !left) return false;
  let msg = iso ? `Moved to ${dueMoveLabel(iso)}` : 'Date removed';
  if (planned) msg += ' · still planned for today';
  else if (still && statusOf(id) === 'doing') msg += ' · still in Today: in progress';
  _toastWithExtra(msg, { kind: 'ok', icon: 'calendar', action: { label: 'Undo', run: () => undo() } },
    planned ? { label: 'Not today', run: () => { setPlanned(id, null); toast('Removed from Today', { icon: 'sun', action: { label: 'Undo', run: () => undo() } }); } } : null);
  return true;
}
/** toast() with a second button (the toast kit takes one action): added to the toast it just made. */
function _toastWithExtra(msg, opts, extra) {
  const close = toast(msg, opts);
  if (!extra) return close;
  const host = document.getElementById('toast-host');
  const t = host && host.lastElementChild;
  if (!t || !t.classList.contains('toast')) return close;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
  b.textContent = extra.label;
  b.onclick = () => { close(); try { extra.run(); } catch (e) { console.error(e); } };
  t.appendChild(b);
  return close;
}
function setDueWithNote(id, d, t) {
  const it = getItem(id); if (!it) return;
  const snap = dueMoveSnap(id);
  const from = it.dueDate || null, fromT = it.dueTime || null;
  d = d || null;
  const time = d ? (t === undefined ? fromT : (t || null)) : null;
  if (from === d && fromT === time) return;
  if (from !== d) logActivity(id, 'date', { from, to: d, reason: null });
  if (fromT !== time && d) logActivity(id, 'dueTime', { from: fromT, to: time });   // no date: the date entry says it all
  it.dueDate = d;
  if (time) it.dueTime = time; else delete it.dueTime;
  saveData(); render();
  if (from !== d) dueMovedToast(id, d, snap);
}

/** Everything you can do to a task, as menu rows (context menu, "…" button). */
function taskMenuItems(id) {
  const item = getItem(id); if (!item) return [];
  const st = statusOf(id), wont = isWontDo(item);
  const planned = item.plannedFor && item.plannedFor <= todayStr();
  const rec = effRecurrence(item) !== 'none';
  const anchor = () => document.querySelector(`#main-body .task[data-id="${CSS.escape(id)}"] .due-stamp`) || document.querySelector(`#main-body [data-id="${CSS.escape(id)}"]`) || document.getElementById('main-body');
  return [
    st === 'done'
      ? { label: wont ? 'Reopen' : 'Mark as not done', icon: 'rotate-ccw', kbd: 'X', run: () => setStatus(id, 'todo') }
      : { label: rec ? 'Complete this occurrence' : 'Complete', icon: 'circle-check', kbd: 'X', run: () => { const row = window.Motion && document.querySelector(`#main-body .task[data-id="${CSS.escape(id)}"]`); if (row) Motion.completeTask(row, () => toggleDone(id)); else toggleDone(id); } },
    st !== 'done' ? { label: st === 'doing' ? 'Stop progress' : 'Start (in progress)', icon: 'circle-dot', kbd: 'S', run: () => toggleDoing(id) } : null,
    st !== 'done' ? { label: rec ? 'Skip this occurrence' : "Won't do", icon: 'circle-x', run: () => markWontDo(id) } : null,
    'sep',
    st !== 'done' ? { label: planned ? 'Remove from Today' : 'Plan for today', icon: 'sun', kbd: 'T', run: () => togglePlannedToday(id) } : null,
    { label: 'Due today', icon: 'calendar', run: () => setDueWithNote(id, todayStr()) },
    { label: 'Due tomorrow', icon: 'sunrise', run: () => setDueWithNote(id, tomorrowStr()) },
    { label: 'Due next week', icon: 'calendar-plus', run: () => setDueWithNote(id, fmtDate(_qaAdd(_qaWeekStart(_qaToday()), 7))) },
    { label: 'Pick a date…', icon: 'calendar-days', kbd: 'D', run: () => openDueDatePopover(anchor(), { value: effDate(item), time: item.dueTime, allowTime: true, allowClear: true, align: 'end', onPick: (d, t) => setDueWithNote(id, d, t) }) },
    'sep',
    { label: 'Priority…', icon: 'flag', kbd: 'P', run: () => openPriorityMenu(anchor(), id) },
    { label: 'Move to stream…', icon: 'layers', run: () => openStreamMenu(anchor(), id) },
    { label: 'People…', icon: 'users', run: () => openPeoplePicker(anchor(), id) },
    'sep',
    { label: 'Open', icon: 'maximize-2', kbd: 'Enter', run: () => (typeof openTask === 'function' ? openTask(id) : selectTask(id)) },
    // The switch, as on the card / panel buttons: it holds for the rest of the session (61-task-card.js).
    typeof openTask === 'function' ? (typeof itemOpenTarget === 'function' && itemOpenTarget() === 'card'
      ? { label: 'Open in side panel', icon: 'panel-right', run: () => { if (typeof switchItemMode === 'function') switchItemMode('panel'); openTask(id, { mode: 'panel' }); } }
      : { label: 'Open in the centre', icon: 'scan', run: () => { if (typeof switchItemMode === 'function') switchItemMode('card'); openTask(id, { mode: 'card' }); } }) : null,
    typeof alTaskMenuItem === 'function' ? alTaskMenuItem(id) : null,   // Find related links (66-autolink.js)
    { label: isPinned(id) ? 'Unpin' : 'Pin to top', icon: isPinned(id) ? 'pin-off' : 'pin', run: () => togglePin(id) },
    { label: 'Duplicate', icon: 'copy', run: () => cloneTask(id) },
    // Said only once it worked; a refusal (no clipboard permission) says what to do instead.
    { label: 'Copy title', icon: 'clipboard-list', run: () => {
      const fail = () => toast("Couldn't copy: the browser blocked the clipboard. Open the task and copy the title from there.", { kind: 'err' });
      try { navigator.clipboard.writeText(effTitle(item)).then(() => toast('Title copied', { kind: 'ok' }), fail); } catch (e) { fail(); }
    } },
    { label: 'Save as template', icon: 'layout-template', run: () => saveTaskAsTemplate(id) },
    'sep',
    { label: 'Move to bin', icon: 'trash-2', kbd: 'Del', danger: true, run: () => deleteTask(id) },
  ].filter(Boolean);
}
/** Open the task menu at an element or at a point {x, y}. */
function openTaskMenu(at, id) {
  let anchor = at;
  if (!(at instanceof Element)) {
    anchor = document.createElement('span');
    anchor.className = 'menu-point';
    anchor.style.cssText = `position:fixed;left:${Math.round(at.x)}px;top:${Math.round(at.y)}px;width:1px;height:1px;pointer-events:none`;
    document.body.appendChild(anchor);
  }
  openMenu(anchor, taskMenuItems(id), { align: 'start', width: 240, onClose: () => { if (anchor !== at) anchor.remove(); } });
}

/* ---------- markdown (safe subset) ---------- */
// Escape first, then add: headings, bold, italics, code, links (http/https/mailto
// only), bullet / numbered / task lists, quotes, rules. Nothing else gets through.
function renderMarkdown(src) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  const inline = (s) => {
    let t = esc(s);
    const codes = [];
    t = t.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
      const u = safeUrl(url.replace(/&amp;/g, '&')) || (/^mailto:/i.test(url) ? url : '');
      return u ? `<a href="${escAttr(u)}" target="_blank" rel="noopener noreferrer">${label}</a>` : m;
    });
    t = t.replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+[^\s<).,;:!?'"])/g, (m, pre, url) => {
      const u = safeUrl(url.replace(/&amp;/g, '&'));
      return u ? `${pre}<a href="${escAttr(u)}" target="_blank" rel="noopener noreferrer">${url}</a>` : m;
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>').replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>');
    t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    t = t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
    return t;
  };
  const out = [];
  let list = null, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    let m;
    if (!line.trim()) { flushPara(); closeList(); continue; }
    if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) { flushPara(); closeList(); const n = Math.min(6, m[1].length + 2); out.push(`<h${n}>${inline(m[2])}</h${n}>`); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { flushPara(); closeList(); out.push('<hr>'); continue; }
    if ((m = /^\s*>\s?(.*)$/.exec(line))) { flushPara(); closeList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
    if ((m = /^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(line))) {
      flushPara(); if (list !== 'ul') { closeList(); out.push('<ul class="md-tasks">'); list = 'ul'; }
      out.push(`<li class="${m[1].trim() ? 'done' : ''}">${icon(m[1].trim() ? 'square-check-big' : 'square', 'i-sm')}<span>${inline(m[2])}</span></li>`); continue;
    }
    if ((m = /^\s*[-*+•]\s+(.*)$/.exec(line))) { flushPara(); if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) { flushPara(); if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    closeList();
    para.push(line);
  }
  flushPara(); closeList();
  return out.join('');
}

/* ---------- Display popover (sort / group / rows, per view) ---------- */
function openTaskDisplayPopover(anchor) {
  openPopover(anchor, (el) => {
    el.classList.add('pad');
    const view = state.view;
    const paint = () => {
      el.innerHTML = '';
      const row = (label, opts, cur, set, note) => {
        const f = document.createElement('div'); f.className = 'field'; f.style.marginBottom = '12px';
        const l = document.createElement('span'); l.className = 'field-label'; l.textContent = label; f.appendChild(l);
        const seg = document.createElement('div'); seg.className = 'seg seg-block';
        for (const [k, t] of opts) {
          const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
          b.setAttribute('aria-pressed', cur === k ? 'true' : 'false');
          b.onclick = () => { set(k); render(); paint(); };
          seg.appendChild(b);
        }
        f.appendChild(seg);
        if (note) { const n = document.createElement('span'); n.className = 'field-hint'; n.textContent = note; f.appendChild(n); }
        el.appendChild(f);
      };
      const h = document.createElement('div'); h.className = 'pop-label'; h.textContent = 'Display · ' + viewTitle(view); el.appendChild(h);
      if (view !== 'completed') {
        row('Sort', TASK_SORTS.slice(0, 4).concat(sortForView(view) === 'manual' || (state.customOrder[view] || []).length ? [TASK_SORTS[4]] : []), sortForView(view), v => setTaskViewPref(view, { sort: v }),
          sortForView(view) === 'manual' ? 'Your own order (drag rows). Pick another sort to go back.' : 'Drag a row to switch this list to your own order.');
        row('Group', TASK_GROUPS, groupForView(view), v => setTaskViewPref(view, { group: v }));
      }
      // Today's sections (21-task-query.js): show or hide each; the order is dragged on the list itself.
      if (view === 'today' && groupForView(view) === 'auto') {
        const f = document.createElement('div'); f.className = 'field'; f.style.marginBottom = '12px';
        f.innerHTML = '<span class="field-label">Sections</span>';
        const seg = document.createElement('div'); seg.className = 'seg seg-block seg-wrap';
        for (const k of todaySectionOrder()) {
          const b = document.createElement('button'); b.type = 'button'; b.textContent = todaySectionDef(k).label;
          b.setAttribute('aria-pressed', todaySectionHidden(k) ? 'false' : 'true');
          b.title = todaySectionHidden(k) ? 'Hidden: click to show' : 'Shown: click to hide';
          b.onclick = () => { setTodaySectionHidden(k, !todaySectionHidden(k)); render(); paint(); };
          seg.appendChild(b);
        }
        f.appendChild(seg);
        const n = document.createElement('span'); n.className = 'field-hint';
        n.textContent = 'Drag a section’s header to move it, or use its ⋯ menu.';
        f.appendChild(n);
        el.appendChild(f);
      }
      row('Rows', [['normal', 'Comfortable'], ['compact', 'Compact']], state.density === 'compact' ? 'compact' : 'normal', v => { state.density = v; saveUI(); });
      const any = _lastRenderedTaskIds.some(id => getSubtasks(id).length);
      if (any) {
        const exp = document.createElement('button'); exp.type = 'button'; exp.className = 'btn btn-secondary btn-block';
        const open = _expandedTaskIds.size > 0;
        exp.innerHTML = icon(open ? 'minimize-2' : 'list-checks') + `<span>${open ? 'Hide all subtasks' : 'Show all subtasks'}</span>`;
        exp.onclick = () => { if (open) _expandedTaskIds.clear(); else for (const id of _lastRenderedTaskIds) if (getSubtasks(id).length) _expandedTaskIds.add(id); render(); paint(); };
        el.appendChild(exp);
      }
    };
    paint();
  }, { width: 320, align: 'end' });
}

/* ---------- bulk actions (the bulk bar and the task keys with a selection) ---------- */
function _bulkDone(msg) { toast(msg, { kind: 'ok', action: { label: 'Undo', run: () => undo() } }); }
function _bulkN(n) { return `${n} task${n === 1 ? '' : 's'}`; }
function bulkComplete(list) {
  batchTasks(list, id => { if (statusOf(id) !== 'done') setStatus(id, 'done', { noSave: true }); });
  multiSelect.ids.clear(); render(); _bulkDone(`${list.length} completed`);
}
function bulkPlanToday(list) {
  const t = todayStr();
  batchTasks(list, id => { const it = getItem(id); if (it.plannedFor !== t) { logActivity(id, 'plan', { from: it.plannedFor || null, to: t }); it.plannedFor = t; } });
  _bulkDone(`${list.length} planned for today`);
}
function bulkSetDue(list, d) {
  const today = todayStr();
  const wasDue = new Set(list.filter(id => { const x = getItem(id); const due = x && effDate(x); return !!due && due <= today; }));
  batchTasks(list, id => { const it = getItem(id); const from = it.dueDate || null; if (from !== d) { logActivity(id, 'date', { from, to: d, reason: 'bulk' }); it.dueDate = d; if (!d) delete it.dueTime; } });
  // Moved out of today but planned for today: they stay in Today's "Planned for today", and the toast says so.
  const kept = !d || d > today ? list.filter(id => { const x = getItem(id); return wasDue.has(id) && x && x.plannedFor && x.plannedFor <= today && statusOf(id) !== 'done'; }) : [];
  _toastWithExtra(`${list.length} moved to ${d ? dueMoveLabel(d) : 'no date'}${kept.length ? ` · ${kept.length} still planned for today` : ''}`,
    { kind: 'ok', action: { label: 'Undo', run: () => undo() } },
    kept.length ? { label: 'Not today', run: () => {
      batchTasks(kept, id => { const x = getItem(id); if (!x.plannedFor) return; logActivity(id, 'plan', { from: x.plannedFor, to: null }); delete x.plannedFor; delete x.plannedTime; delete x.plannedMinutes; });
      toast(`${kept.length} removed from Today`, { icon: 'sun', action: { label: 'Undo', run: () => undo() } });
    } } : null);
}
function bulkPriority(list, k) {
  batchTasks(list, id => { const it = getItem(id); if (effPriority(it) !== k) { logActivity(id, 'priority', { from: effPriority(it), to: k }); it.priority = k; } });
  _bulkDone(`Priority set on ${list.length}`);
}
function bulkBin(list) {
  for (const id of list) deleteTask(id, { noSave: true });
  multiSelect.ids.clear(); saveData(); render(); _bulkDone(`${list.length} moved to the bin`);
}
function bulkDueDatePopover(anchor, list) {
  openDueDatePopover(anchor, { allowClear: true, title: `Due date for ${_bulkN(list.length)}`, onPick: (d) => bulkSetDue(list.filter(id => getItem(id)), d) });
}

/* ---------- bulk bar ---------- */
function renderBulkBar() {
  const bb = document.getElementById('bulk-bar');
  if (!bb) return;
  for (const id of [...multiSelect.ids]) if (!getItem(id)) multiSelect.ids.delete(id);
  if (!multiSelect.ids.size) { bb.classList.remove('open'); bb.innerHTML = ''; document.body.classList.remove('has-selection'); return; }
  const n = multiSelect.ids.size;
  const ids = () => [...multiSelect.ids];
  bb.classList.add('open');
  bb.innerHTML = `<span class="count">${n} selected</span>`;
  const btn = (label, ic, run, cls, tip, kbd) => {
    const b = document.createElement('button'); b.type = 'button'; if (cls) b.className = cls;
    b.innerHTML = icon(ic) + (label ? `<span>${esc(label)}</span>` : '');
    if (tip) { b.setAttribute('data-tip', tip); b.setAttribute('aria-label', tip); }
    if (kbd) { b.setAttribute('data-kbd', kbd); if (!tip) b.setAttribute('data-tip', label); }
    b.onclick = (e) => run(e.currentTarget);
    bb.appendChild(b); return b;
  };
  // More of this list could be selected: one click for all of it (Ctrl+A does the same).
  const rest = _lastRenderedTaskIds.filter(id => !multiSelect.ids.has(id) && getItem(id));
  if (rest.length) btn('Select all', 'list-checks', () => { for (const id of _lastRenderedTaskIds) if (getItem(id)) multiSelect.ids.add(id); document.body.classList.add('has-selection'); render(); }, 'ghost', `Select all ${_lastRenderedTaskIds.length} in this list`, 'Ctrl+A');
  btn('Complete', 'circle-check', () => bulkComplete(ids()), '', '', 'X');
  btn('Today', 'sun', () => bulkPlanToday(ids()), '', 'Plan for today', 'T');
  btn('Date', 'calendar', (a) => bulkDueDatePopover(a, ids()), '', '', 'D');
  btn('Priority', 'flag', (a) => openMenu(a, [['p1', 'High', '1'], ['p2', 'Medium', '2'], ['p3', 'Low', '3'], ['p0', 'No priority', '4']].map(([k, l, kb]) => ({ label: l, icon: 'flag', kbd: kb, className: 'prio-item ' + k, run: () => bulkPriority(ids(), k) })), { align: 'center', width: 180 }), '', '', '1–4');
  const done = _bulkDone;
  btn('Stream', 'layers', (a) => openStreamMenu(a, null, (k) => {
    const list = ids(); batchTasks(list, id => { const it = getItem(id); if (it.stream !== k) { logActivity(id, 'stream', { from: it.stream, to: k }); it.stream = k; } }); done(`${list.length} moved to ${STREAMS[k]?.label || k}`);
  }));
  btn('Tag', 'hash', async () => {
    const v = await promptDialog({ title: `Tags for ${n} tasks`, label: 'Add with +tag, remove with -tag (comma separated)', placeholder: '+review, -old' });
    if (!v) return;
    const ops = v.split(',').map(s => s.trim()).filter(Boolean);
    const list = ids();
    batchTasks(list, id => {
      const it = getItem(id); let tags = effTags(it).slice();
      for (const op of ops) {
        const t = op.replace(/^[+-]/, '').replace(/^#/, '').trim().toLowerCase(); if (!t) continue;
        if (op.startsWith('-')) tags = tags.filter(x => x !== t); else if (!tags.includes(t)) tags.push(t);
      }
      const before = effTags(it);
      if (before.join('\u0000') !== tags.join('\u0000')) { logActivity(id, 'tags', { added: tags.filter(x => !before.includes(x)), removed: before.filter(x => !tags.includes(x)) }); it.tags = tags; }
    });
    done(`Tags updated on ${list.length}`);
  });
  btn('Pin', 'pin', () => { const list = ids(); const allPinned = list.every(id => isPinned(id)); batchTasks(list, id => { if (allPinned) delete state.pinned[id]; else state.pinned[id] = true; }); done(allPinned ? 'Unpinned' : 'Pinned'); }, '', 'Pin or unpin');
  btn('', 'trash-2', () => bulkBin(ids()), 'danger', 'Move to bin', 'Del');
  btn('', 'x', () => { multiSelect.ids.clear(); render(); }, 'ghost', 'Clear selection', 'Esc');
}

/* ---------- keyboard ---------- */
// Runs before the shell's handler (90-wiring.js). Acts on the keyboard cursor
// (or the open task) in task lists. Arrow keys / Enter / Q / G stay in 90-wiring.
function _taskCursorId() {
  if (_lastSelectedTaskId && getItem(_lastSelectedTaskId) && (_lastRenderedTaskIds.includes(_lastSelectedTaskId) || state.selectedTaskId === _lastSelectedTaskId)) return _lastSelectedTaskId;
  if (state.selectedTaskId && getItem(state.selectedTaskId)) return state.selectedTaskId;
  return null;
}
function _moveTaskCursor(dir) {
  const ids = _lastRenderedTaskIds;
  if (!ids.length) return;
  const cur = _lastSelectedTaskId ? ids.indexOf(_lastSelectedTaskId) : -1;
  const next = cur < 0 ? (dir > 0 ? 0 : ids.length - 1) : Math.max(0, Math.min(ids.length - 1, cur + dir));
  _lastSelectedTaskId = ids[next];
  if (state.selectedTaskId) { selectTask(_lastSelectedTaskId); }
  else {
    document.querySelectorAll('#main-body .kb-cursor').forEach(n => n.classList.remove('kb-cursor'));
    const el = document.querySelector(`#main-body [data-id="${CSS.escape(_lastSelectedTaskId)}"]`);
    if (el) { el.classList.add('kb-cursor'); el.scrollIntoView({ block: 'nearest', behavior: (window.Motion && Motion.prefersReduced()) ? 'auto' : 'smooth' }); }
  }
}
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return;
  // A visible menu, dialog, drawer or palette owns the keyboard (hidden suggestion lists do not count).
  if ([...document.querySelectorAll('.cmd, .modal, .drawer, .pop')].some(n => n.getClientRects().length > 0) || document.getElementById('kb-overlay')?.classList.contains('open')) return;
  if (typeof _gPending !== 'undefined' && _gPending && Date.now() - _gPending < 1200) return;   // "g t" etc. belong to the shell
  if (typeof state === 'undefined' || !(isTaskView(state.view) || state.selectedTaskId)) return;
  const k = e.key;
  // In Calendar (a task open in the detail pane) t/j/k/m/w/d/a belong to the calendar (41-calendar-section.js).
  if (/^calendar/.test(String(state.view)) && /^[tjkmwda]$/i.test(k)) return;
  if (k === 'j' || k === 'k') { e.preventDefault(); _moveTaskCursor(k === 'j' ? 1 : -1); return; }
  // Tasks ticked for bulk actions: X, T, D, 1-4 and Del act on all of them (as the bulk bar does).
  const sel = [...multiSelect.ids].filter(x => getItem(x));
  if (sel.length && /^(x|t|d|[1-4]|Delete|Backspace)$/.test(k)) {
    e.preventDefault();
    if (k === 'x') bulkComplete(sel);
    else if (k === 't') bulkPlanToday(sel);
    else if (k === 'd') bulkDueDatePopover(document.querySelector('#bulk-bar [data-kbd="D"]') || document.getElementById('main-body'), sel);
    else if (k === 'Delete' || k === 'Backspace') bulkBin(sel);
    else bulkPriority(sel, ['p1', 'p2', 'p3', 'p0'][Number(k) - 1]);
    return;
  }
  const id = _taskCursorId();
  if (!id) return;
  const rowAnchor = () => document.querySelector(`#main-body [data-id="${CSS.escape(id)}"] .due-stamp`) || document.querySelector(`#main-body [data-id="${CSS.escape(id)}"]`) || document.querySelector('#detail-pane .dp-due') || document.getElementById('main-body');
  const item = getItem(id);
  if (k === 'x') {
    e.preventDefault();
    const row = document.querySelector(`#main-body .task[data-id="${CSS.escape(id)}"]`);
    // Keep the cursor on the next row when this one leaves the list.
    const i = _lastRenderedTaskIds.indexOf(id);
    const nextId = _lastRenderedTaskIds[i + 1] || _lastRenderedTaskIds[i - 1] || null;
    if (statusOf(id) !== 'done' && row && window.Motion) Motion.completeTask(row, () => toggleDone(id)); else toggleDone(id);
    if (!getItem(id) || !_lastRenderedTaskIds.includes(id)) { _lastSelectedTaskId = nextId; if (nextId) document.querySelector(`#main-body [data-id="${CSS.escape(nextId)}"]`)?.classList.add('kb-cursor'); }
    return;
  }
  if (k === 's') { e.preventDefault(); toggleDoing(id); return; }
  if (k === 't') { e.preventDefault(); togglePlannedToday(id); return; }
  if (k === 'd') { e.preventDefault(); openDueDatePopover(rowAnchor(), { value: effDate(item), time: item.dueTime, allowTime: true, allowClear: true, align: 'end', onPick: (d, tm) => setDueWithNote(id, d, tm) }); return; }
  if (k === 'p') { e.preventDefault(); openPriorityMenu(rowAnchor(), id); return; }
  if (['1', '2', '3', '4'].includes(k)) { e.preventDefault(); setOverride(id, 'priority', ['p1', 'p2', 'p3', 'p0'][Number(k) - 1]); render(); return; }
  if (k === 'e') { e.preventDefault(); if (typeof openTask === 'function') openTask(id); else selectTask(id); setTimeout(() => { const ti = document.querySelector('.tc [data-fk="title"], #detail-pane .dp-title-input'); if (ti) { ti.focus(); ti.select(); } }, 30); return; }
  if (k === '.' ) { e.preventDefault(); openTaskMenu(rowAnchor(), id); return; }
  if (k === 'Delete' || k === 'Backspace') {
    e.preventDefault();
    const i = _lastRenderedTaskIds.indexOf(id);
    const nextId = _lastRenderedTaskIds[i + 1] || _lastRenderedTaskIds[i - 1] || null;
    _lastSelectedTaskId = nextId;   // before the render, so the cursor shows on the next row at once
    deleteTask(id);
    return;
  }
});

/* ---------- palette: the open task (or the keyboard cursor), with the keys that do the same ---------- */
// Listed first in the palette when nothing is typed (16-command-palette.js), so the keys are easy to learn.
function _palTaskId() {
  if (typeof tcIsOpen === 'function' && tcIsOpen()) { const c = tcCurrentTaskId(); return c && getItem(c) ? c : null; }
  if (state.selectedTaskId && getItem(state.selectedTaskId)) return state.selectedTaskId;
  return isTaskView(state.view) ? _taskCursorId() : null;
}
function _palTaskAnchor(id, sel) {
  const q = (s) => document.querySelector(s);
  return (sel && (q('.tc ' + sel) || q('#detail-pane ' + sel))) || q(`#main-body [data-id="${CSS.escape(id)}"] .due-stamp`) || q(`#main-body [data-id="${CSS.escape(id)}"]`) || q('.tc') || document.getElementById('main-body');
}
{
  const has = () => !!_palTaskId();
  const open = () => { const id = _palTaskId(); return id && statusOf(id) !== 'done'; };
  const short = () => { const it = getItem(_palTaskId()); const t = it ? effTitle(it) : ''; return t.length > 48 ? t.slice(0, 47) + '…' : t; };
  const cmd = (def) => registerCommand(Object.assign({ group: 'This task' }, def, { run: () => { const id = _palTaskId(); if (id) def.run(id); } }));
  cmd({ id: 'this-task-done', icon: 'circle-check', kbd: 'X', keywords: 'complete done finish tick reopen', when: has,
    label: () => `${statusOf(_palTaskId()) === 'done' ? 'Reopen' : 'Complete'} “${short()}”`, run: (id) => toggleDone(id) });
  cmd({ id: 'this-task-doing', icon: 'circle-dot', kbd: 'S', keywords: 'start progress doing', when: open,
    label: () => statusOf(_palTaskId()) === 'doing' ? 'Stop progress' : 'Start (in progress)', run: (id) => toggleDoing(id) });
  cmd({ id: 'this-task-today', icon: 'sun', kbd: 'T', keywords: 'plan today', when: open,
    label: () => { const it = getItem(_palTaskId()); return it && it.plannedFor && it.plannedFor <= todayStr() ? 'Remove from Today' : 'Plan for today'; }, run: (id) => togglePlannedToday(id) });
  cmd({ id: 'this-task-due', icon: 'calendar-days', kbd: 'D', keywords: 'date due reschedule deadline', when: has, label: 'Change due date…',
    run: (id) => { const it = getItem(id); openDueDatePopover(_palTaskAnchor(id, '.dp-due'), { value: effDate(it), time: it.dueTime, allowTime: true, allowClear: true, align: 'end', onPick: (d, t) => setDueWithNote(id, d, t) }); } });
  cmd({ id: 'this-task-tomorrow', icon: 'sunrise', keywords: 'snooze postpone later push', when: open, label: 'Due tomorrow', run: (id) => setDueWithNote(id, tomorrowStr()) });
  cmd({ id: 'this-task-priority', icon: 'flag', kbd: 'P', keywords: 'priority urgent important', when: has, label: 'Set priority…', run: (id) => openPriorityMenu(_palTaskAnchor(id, '.dp-prio'), id) });
  cmd({ id: 'this-task-stream', icon: 'layers', keywords: 'stream move project area', when: has, label: 'Move to stream…', run: (id) => openStreamMenu(_palTaskAnchor(id, '.dp-stream'), id) });
  cmd({ id: 'this-task-pin', icon: 'pin', keywords: 'pin top unpin', when: has, label: () => isPinned(_palTaskId()) ? 'Unpin' : 'Pin to top', run: (id) => togglePin(id) });
  cmd({ id: 'this-task-copy', icon: 'copy', keywords: 'duplicate clone copy', when: has, label: 'Duplicate task', run: (id) => cloneTask(id) });
  cmd({ id: 'this-task-bin', icon: 'trash-2', kbd: 'Del', keywords: 'delete remove bin trash', when: has, label: 'Move to bin',
    run: (id) => { if (typeof tcCurrentTaskId === 'function' && tcCurrentTaskId() === id && typeof _tcDelete === 'function') _tcDelete(id); else deleteTask(id); } });
}
