/* ============================================================
   TASK UI PIECES (owner: Tasks)
     openDueDatePopover(anchor, {value, time, allowTime, title, onPick(date|null, time|null)})
     buildMiniMonth(el, {month, value, onPick, counts})
     openPriorityMenu / openStreamMenu / openPeoplePicker / openTaskMenu(anchor|{x,y}, id)
     renderMarkdown(text) -> safe HTML (escaped first, then a small markdown subset)
     openTaskDisplayPopover(anchor)  sort / group / rows for the current view
     renderBulkBar()                 the multi-select action bar
     task keyboard shortcuts         j/k, x, s, d, p, 1-4, t, e, Del
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
    run: () => { if (onPick) onPick(k); else { setOverride(id, 'stream', k); render(); } },
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
    { label: 'Due today', icon: 'calendar', run: () => setDate(id, todayStr()) },
    { label: 'Due tomorrow', icon: 'sunrise', run: () => setDate(id, tomorrowStr()) },
    { label: 'Due next week', icon: 'calendar-plus', run: () => setDate(id, fmtDate(_qaAdd(_qaWeekStart(_qaToday()), 7))) },
    { label: 'Pick a date…', icon: 'calendar-days', kbd: 'D', run: () => openDueDatePopover(anchor(), { value: effDate(item), time: item.dueTime, allowTime: true, allowClear: true, align: 'end', onPick: (d, t) => { setDateWithReason(id, d, null); if (d) setOverride(id, 'dueTime', t || null); render(); } }) },
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
    { label: 'Copy title', icon: 'clipboard-list', run: () => { try { navigator.clipboard.writeText(effTitle(item)); toast('Copied', { kind: 'ok' }); } catch (e) {} } },
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
  const btn = (label, ic, run, cls, tip) => {
    const b = document.createElement('button'); b.type = 'button'; if (cls) b.className = cls;
    b.innerHTML = icon(ic) + (label ? `<span>${esc(label)}</span>` : '');
    if (tip) { b.setAttribute('data-tip', tip); b.setAttribute('aria-label', tip); }
    b.onclick = (e) => run(e.currentTarget);
    bb.appendChild(b); return b;
  };
  const done = (msg) => { toast(msg, { kind: 'ok', action: { label: 'Undo', run: () => undo() } }); };
  btn('Complete', 'circle-check', () => { const list = ids(); batchTasks(list, id => { if (statusOf(id) !== 'done') setStatus(id, 'done', { noSave: true }); }); multiSelect.ids.clear(); render(); done(`${list.length} completed`); });
  btn('Today', 'sun', () => { const list = ids(); batchTasks(list, id => { const it = getItem(id); const t = todayStr(); if (it.plannedFor !== t) { logActivity(id, 'plan', { from: it.plannedFor || null, to: t }); it.plannedFor = t; } }); done(`${list.length} planned for today`); }, '', 'Plan for today');
  btn('Date', 'calendar', (a) => openDueDatePopover(a, { allowClear: true, title: `Due date for ${n} tasks`, onPick: (d) => {
    const list = ids(); batchTasks(list, id => { const it = getItem(id); const from = it.dueDate || null; if (from !== d) { logActivity(id, 'date', { from, to: d, reason: 'bulk' }); it.dueDate = d; if (!d) delete it.dueTime; } });
    done(`${list.length} moved to ${d ? dueLabel(d) : 'no date'}`);
  } }));
  btn('Priority', 'flag', (a) => openMenu(a, [['p1', 'High'], ['p2', 'Medium'], ['p3', 'Low'], ['p0', 'No priority']].map(([k, l]) => ({ label: l, icon: 'flag', className: 'prio-item ' + k, run: () => {
    const list = ids(); batchTasks(list, id => { const it = getItem(id); if (effPriority(it) !== k) { logActivity(id, 'priority', { from: effPriority(it), to: k }); it.priority = k; } }); done(`Priority set on ${list.length}`);
  } })), { align: 'center', width: 180 }));
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
  btn('', 'trash-2', () => { const list = ids(); for (const id of list) deleteTask(id, { noSave: true }); multiSelect.ids.clear(); saveData(); render(); done(`${list.length} moved to the bin`); }, 'danger', 'Move to bin');
  btn('', 'x', () => { multiSelect.ids.clear(); render(); }, 'ghost', 'Clear selection (Esc)');
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
  if (k === 'd') { e.preventDefault(); openDueDatePopover(rowAnchor(), { value: effDate(item), time: item.dueTime, allowTime: true, allowClear: true, align: 'end', onPick: (d, tm) => { setDateWithReason(id, d, null); if (d) setOverride(id, 'dueTime', tm || null); render(); } }); return; }
  if (k === 'p') { e.preventDefault(); openPriorityMenu(rowAnchor(), id); return; }
  if (['1', '2', '3', '4'].includes(k)) { e.preventDefault(); setOverride(id, 'priority', ['p1', 'p2', 'p3', 'p0'][Number(k) - 1]); render(); return; }
  if (k === 'e') { e.preventDefault(); if (typeof openTask === 'function') openTask(id); else selectTask(id); setTimeout(() => { const ti = document.querySelector('.tc [data-fk="title"], #detail-pane .dp-title-input'); if (ti) { ti.focus(); ti.select(); } }, 30); return; }
  if (k === '.' ) { e.preventDefault(); openTaskMenu(rowAnchor(), id); return; }
  if (k === 'Delete' || k === 'Backspace') {
    e.preventDefault();
    const i = _lastRenderedTaskIds.indexOf(id);
    const nextId = _lastRenderedTaskIds[i + 1] || _lastRenderedTaskIds[i - 1] || null;
    deleteTask(id);
    _lastSelectedTaskId = nextId;
    return;
  }
});
