/* ============================================================
   TASK LOGS (owner: Tasks): Review (per view), Wins, Bin, go-to-date.
   ============================================================ */

/* ---------- go to a date (week strip calendar button) ---------- */
function openDatePicker(anchor) {
  openPopover(anchor, (el, close) => {
    const mm = document.createElement('div');
    buildMiniMonth(mm, {
      value: state.view.startsWith('day:') ? state.view.slice(4) : todayStr(),
      counts: _openCountsByDay(),
      onPick: (d) => { close(); setView(d === todayStr() ? 'today' : 'day:' + d); },
    });
    el.appendChild(mm);
    const f = document.createElement('div'); f.className = 'mm-foot';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.textContent = 'Today';
    b.onclick = () => { close(); state.weekBarOffset = 0; setView('today'); };
    f.appendChild(b); el.appendChild(f);
  }, { width: 260, align: 'end' });
}
function closeDatePicker() { closePopovers(); }

/* ---------- Review (stats for the current view) ---------- */
function renderReviewView(container) {
  const view = state.view;
  const all = getAllItems().filter(i => inViewScope(i, view === 'completed' ? 'all' : view) || view === 'today');
  const scope = view === 'today' ? getAllItems() : all;
  const open = scope.filter(i => statusOf(i.id) !== 'done');
  const overdue = open.filter(i => { const d = daysUntil(effDate(i)); return d !== null && d < 0; });
  const dueWeek = open.filter(i => { const d = daysUntil(effDate(i)); return d !== null && d >= 0 && d <= 7; });
  const weekAgo = Date.now() - 7 * 86400000;
  const ids = new Set(scope.map(i => i.id));
  const recent = [];
  for (const [id, tss] of Object.entries(state.completionLog || {})) {
    if (!ids.has(id) && view !== 'today') continue;
    for (const ts of tss) if (ts >= weekAgo) recent.push({ id, ts });
  }
  const lastTouch = (i) => Math.max(_createdTs(i), ...((state.taskActivity[i.id] || []).map(a => a.ts || 0)), ...getNotes(i.id).map(n => n.ts || 0));
  const stale = open.filter(i => Date.now() - lastTouch(i) > 30 * 86400000);
  const slipped = open.map(i => ({ i, n: (state.taskActivity[i.id] || []).filter(a => (a.type === 'date' || a.type === 'reschedule') && a.from && a.to && a.to > a.from).length }))
    .filter(x => x.n >= 2).sort((a, b) => b.n - a.n);

  const page = document.createElement('div'); page.className = 'review';
  const scopeNote = document.createElement('p'); scopeNote.className = 'muted review-scope';
  scopeNote.textContent = view === 'today' ? 'Across all tasks.' : `For ${viewTitle(view)}.`;
  page.appendChild(scopeNote);
  const stats = document.createElement('div'); stats.className = 'stat-row';
  const stat = (lbl, n, sub, tone) => `<div class="stat-card${tone ? ' ' + tone : ''}"><div class="lbl">${esc(lbl)}</div><div class="num">${n}</div><div class="sub">${esc(sub)}</div></div>`;
  stats.innerHTML = stat('Open', open.length, 'not done yet')
    + stat('Overdue', overdue.length, 'past their date', overdue.length ? 'danger' : '')
    + stat('Due in 7 days', dueWeek.length, 'coming up')
    + stat('Done this week', recent.length, 'completions', 'success');
  page.appendChild(stats);

  const section = (title, rows, empty) => {
    const s = document.createElement('section'); s.className = 'wins-section';
    s.innerHTML = `<h3>${esc(title)} <span class="count">${rows.length}</span></h3>`;
    if (!rows.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = empty; s.appendChild(p); }
    for (const r of rows.slice(0, 10)) s.appendChild(r);
    page.appendChild(s);
  };
  const rowFor = (it, when, tone) => {
    const r = document.createElement('button'); r.type = 'button'; r.className = 'win-row';
    r.innerHTML = `<span class="when${tone ? ' ' + tone : ''}">${esc(when)}</span><span class="dot" style="--c:${escAttr(safeColor(STREAMS[effStream(it)]?.color, '#868a94'))}"></span><span class="what">${esc(effTitle(it))}</span>`;
    r.onclick = () => openTask(it.id, { from: r });   // centre card or side panel (61-task-card.js)
    return r;
  };
  // Open work by stream
  const byStream = {};
  for (const i of open) byStream[effStream(i)] = (byStream[effStream(i)] || 0) + 1;
  const max = Math.max(1, ...Object.values(byStream));
  const sec = document.createElement('section'); sec.className = 'wins-section';
  sec.innerHTML = '<h3>Open work by stream</h3>';
  for (const [k, n] of Object.entries(byStream).sort((a, b) => b[1] - a[1])) {
    const info = STREAMS[k] || { label: k, color: '#868a94' };
    const row = document.createElement('button'); row.type = 'button'; row.className = 'bar-stream';
    row.innerHTML = `<span class="name">${esc(info.label)}</span><span class="progress"><i style="--pct:${Math.round(n / max * 100)}%;--c:${escAttr(safeColor(info.color))}"></i></span><span class="num">${n}</span>`;
    row.onclick = () => setView('stream:' + k);
    sec.appendChild(row);
  }
  page.appendChild(sec);
  section('Overdue', sortItems(overdue, 'date').map(i => rowFor(i, `${-daysUntil(effDate(i))}d late`, 'danger')), 'Nothing overdue.');
  section('Slipping (moved later 2+ times)', slipped.map(x => rowFor(x.i, `${x.n}× moved`, 'warn')), 'No task keeps slipping.');
  section('Untouched for 30 days', stale.slice(0, 10).map(i => rowFor(i, _dayLabel(Clock.parts(new Date(lastTouch(i)).getTime()).iso, { day: 'numeric', month: 'short' }))), 'Everything has moved recently.');
  section('Done this week', recent.sort((a, b) => b.ts - a.ts).map(c => { const it = getItem(c.id); return it ? rowFor(it, formatTimestamp(c.ts), 'success') : null; }).filter(Boolean), 'Nothing completed in the last 7 days.');
  container.appendChild(page);
}

/* ---------- Wins ---------- */
function renderWinsLog(container) {
  const all = [];
  for (const [id, tss] of Object.entries(state.completionLog || {})) for (const ts of tss) all.push({ id, ts });
  all.sort((a, b) => b.ts - a.ts);
  if (!all.length) {
    mountEmptyState(container, { icon: 'trophy', title: 'No wins yet', text: 'Tick tasks done and they collect here, week by week.' });
    return;
  }
  const groups = new Map();
  for (const c of all) {
    const key = fmtDate(_qaWeekStart(_qaToday(c.ts)));   // the week of the day it was done, in the dashboard's zone
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const page = document.createElement('div'); page.className = 'wins';
  for (const [start, items] of groups) {
    const sec = document.createElement('section'); sec.className = 'wins-section';
    const ds = new Date(start + 'T00:00:00');
    const ed = new Date(ds); ed.setDate(ds.getDate() + 6); // clock-ok: wall date
    const thisWeek = start === fmtDate(_qaWeekStart(_qaToday()));
    const lbl = thisWeek ? 'This week' : `${ds.toLocaleDateString(_locale(), { day: 'numeric', month: 'short' })} – ${ed.toLocaleDateString(_locale(), { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const per = {};
    for (const c of items) { const it = getItem(c.id); const s = it ? effStream(it) : '?'; per[s] = (per[s] || 0) + 1; }
    const dots = Object.entries(per).sort((a, b) => b[1] - a[1]).map(([s, n]) => `<span class="stream" style="--c:${escAttr(safeColor(STREAMS[s]?.color, '#868a94'))}"><span class="dot"></span><span>${esc(STREAMS[s]?.label || s)} ${n}</span></span>`).join('');
    sec.innerHTML = `<h3>${esc(lbl)} <span class="count">${items.length}</span><span class="wins-streams">${dots}</span></h3>`;
    for (const c of items) {
      const it = getItem(c.id);
      const row = document.createElement('div'); row.className = 'win-row';
      row.innerHTML = `<span class="when">${esc(formatTimestamp(c.ts))}</span><span class="dot" style="--c:${escAttr(safeColor(it ? STREAMS[effStream(it)]?.color : null, '#868a94'))}"></span><span class="what">${it ? esc(effTitle(it)) : '(deleted task)'}</span>`;
      if (it) {
        row.tabIndex = 0; row.setAttribute('role', 'button');
        row.onclick = () => openTask(c.id, { from: row });
        if (statusOf(c.id) === 'done' && !isWontDo(it)) {
          const u = document.createElement('button'); u.type = 'button'; u.className = 'btn btn-ghost btn-sm win-undo'; u.textContent = 'Not done';
          u.title = 'Reopen this task';
          u.onclick = (e) => { e.stopPropagation(); setStatus(c.id, 'todo'); };
          row.appendChild(u);
        }
      }
      sec.appendChild(row);
    }
    page.appendChild(sec);
  }
  container.appendChild(page);
}

/* ---------- Bin ---------- */
function renderBin(container) {
  const tasks = state.bin.tasks || [];
  const notes = state.bin.notes || [];
  const total = tasks.length + notes.length;
  if (total === 0) {
    mountEmptyState(container, { icon: 'trash-2', title: 'The bin is empty', text: 'Deleted tasks and notes wait here until you empty the bin.' });
    return;
  }
  const head = document.createElement('div'); head.className = 'bin-head';
  head.innerHTML = `<span class="muted">${total} item${total === 1 ? '' : 's'}. Restore anything, or delete it for good.</span>`;
  const empty = document.createElement('button'); empty.type = 'button'; empty.className = 'btn btn-danger btn-sm';
  empty.innerHTML = icon('trash-2') + '<span>Empty bin</span>';
  empty.onclick = async () => {
    if (await confirmDialog({ title: 'Empty the bin?', text: `Permanently delete ${total} item${total === 1 ? '' : 's'}. This cannot be undone.`, confirmLabel: 'Delete for good', danger: true })) emptyBin();
  };
  head.appendChild(empty);
  container.appendChild(head);
  const list = document.createElement('div'); list.className = 'bin-list';
  const entries = [...tasks.map(t => ({ kind: 'task', d: t })), ...notes.map(n => ({ kind: 'note', d: n }))].sort((a, b) => b.d.binTs - a.d.binTs);
  for (const e of entries) {
    const row = document.createElement('div'); row.className = 'bin-row';
    const ic = document.createElement('span'); ic.className = 'bin-icon';
    ic.innerHTML = icon(e.kind === 'task' ? 'circle-check' : 'message-square');
    const info = document.createElement('div'); info.className = 'bin-info';
    const ttl = document.createElement('div'); ttl.className = 'bin-title';
    if (e.kind === 'task') ttl.textContent = e.d.title || '(untitled)';
    else { const txt = (e.d.note && e.d.note.text) || '(empty note)'; ttl.textContent = `“${txt.length > 90 ? txt.slice(0, 87) + '…' : txt}”`; }
    const meta = document.createElement('div'); meta.className = 'bin-meta';
    if (e.kind === 'task') {
      const sl = STREAMS[e.d.stream]?.label || e.d.stream || '';
      const nc = e.d.notes?.length || 0;
      meta.textContent = `Task${sl ? ' · ' + sl : ''}${nc ? ` · ${nc} note${nc === 1 ? '' : 's'}` : ''} · deleted ${formatTimestamp(e.d.binTs)}`;
    } else meta.textContent = `Note on “${e.d.taskTitle}” · deleted ${formatTimestamp(e.d.binTs)}`;
    info.append(ttl, meta);
    const restore = document.createElement('button'); restore.type = 'button'; restore.className = 'btn btn-secondary btn-sm';
    restore.innerHTML = icon('rotate-ccw') + '<span>Restore</span>';
    restore.onclick = () => e.kind === 'task' ? restoreTask(e.d.binTs) : restoreNote(e.d.binTs);
    const del = document.createElement('button'); del.type = 'button'; del.className = 'btn-icon btn-sm bin-del';
    del.innerHTML = icon('x'); del.setAttribute('aria-label', 'Delete for good'); del.setAttribute('data-tip', 'Delete for good');
    del.onclick = async () => { if (await confirmDialog({ title: 'Delete for good?', text: 'This item will be gone permanently.', confirmLabel: 'Delete', danger: true })) purgeBinEntry(e.kind, e.d.binTs); };
    row.append(ic, info, restore, del);
    list.appendChild(row);
  }
  container.appendChild(list);
}
