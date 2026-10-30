/* ============================================================
   BOARD (owner: Boards): the Board mode of every task view and the saved
   boards. Moved out of 31-task-views.js in 2.16 so the two can change
   independently; 31-task-views.js only calls renderKanban(main, {open, closed, view}).
   The model (columns, rows, what a drop does, card order) is 33-board-model.js;
   the toolbar, menus, dialogs, saved boards and keys are 33-board-ui.js.
   Kept from 2.15: the checkbox and Ctrl/Shift+click on cards, the selection
   rectangle (90-wiring.js), dragging a selection (30-task-row.js), Today's sections.
   ============================================================ */
let _bdCurrent = null;   // the board on screen: keys and menus act on it
let _bdDragCol = null;   // the column a card is being dragged from (the insertion line shows only where the drop keeps a place)

/** A task view in Board mode. */
function renderKanban(container, o) {
  renderBoardInto(container, boardForView(o.view), { open: o.open, closed: o.closed, view: o.view, perView: true });
}

/** Render a board definition with these tasks. o: {open, closed, view (for quick-add defaults), perView}. */
function renderBoardInto(container, def, o) {
  const L = boardLayout(def, o.open || [], o.closed || []);
  L.view = o.view || 'all';
  L.perView = !!o.perView;
  _bdCurrent = L;
  const b = L.board;
  if (typeof _bdToolbar === 'function') container.appendChild(_bdToolbar(L));
  const wrap = document.createElement('div');
  wrap.className = 'kanban' + (L.lanes ? ' has-lanes' : '');
  wrap.dataset.board = b.id;
  wrap.style.setProperty('--kb-tpl', L.cols.map(c => _bdColSet(b, c.key).folded ? 'var(--kb-fold-w)' : 'minmax(var(--kb-colw), 1fr)').join(' ') || '1fr');
  if (!L.cols.length) {
    mountEmptyState(container, L.hidden.length
      ? { icon: 'eye-off', compact: true, text: 'Every column is hidden: show them to see your cards here.', actions: [{ label: 'Show all columns', icon: 'eye', primary: true, run: () => boardUpdate(b, d => { for (const c of L.hidden) if (d.col[c.key]) delete d.col[c.key].hidden; }, 'Columns shown') }] }
      : { icon: 'columns-3', compact: true, text: 'Your cards appear here once the board has a column.', actions: [{ label: 'Add a column', icon: 'plus', primary: true, run: () => boardEditColumn(L, null) }] });
    return;
  }
  if (!L.lanes) for (const col of L.cols) wrap.appendChild(_bdColumn(L, col, null));
  else {
    for (const col of L.cols) wrap.appendChild(_bdColumn(L, col, 'head'));
    for (const lane of L.lanes) {
      wrap.appendChild(_bdLaneHead(L, lane));
      if (b.laneFold[lane.key]) continue;
      for (const col of L.cols) wrap.appendChild(_bdColumn(L, col, lane));
    }
  }
  container.appendChild(wrap);
  // Keyboard order (Up/Down, Shift+click ranges, Ctrl+A): column by column, top to bottom; done and folded ones left out.
  for (const col of L.cols) {
    if (_bdColIsDone(L, col) || _bdColSet(b, col.key).folded) continue;
    const parts = L.lanes ? L.lanes.filter(l => !b.laneFold[l.key]).map(l => _bdVisibleIn(L, col, l.key)) : [_bdVisibleIn(L, col)];
    for (const arr of parts) for (const it of arr) if (!_lastRenderedTaskIds.includes(it.id)) _lastRenderedTaskIds.push(it.id);
  }
  if (_bdClearedOnce && Date.now() - _bdClearedOnce.at > 4000) _bdClearedOnce = null;
}
/** The cards a column shows (rows folded away left out), in order. */
function _bdVisibleIn(L, col, laneKey) {
  const arr = L.byCol.get(col.key) || [];
  if (!L.lanes) return arr;
  return arr.filter(it => { const lk = L.laneOf.get(it.id); return laneKey != null ? lk === laneKey : !L.board.laneFold[lk]; });
}

/* ---------- columns and cells ---------- */
// lane: null (no rows: the whole column), 'head' (the header cell above the rows), or a row {key, label}.
function _bdColumn(L, col, lane) {
  const b = L.board, set = _bdColSet(b, col.key);
  const isHead = lane === 'head', isCell = !!lane && !isHead;
  const total = (L.byCol.get(col.key) || []).length;
  const items = isCell ? _bdVisibleIn(L, col, lane.key) : (L.byCol.get(col.key) || []);
  const c = document.createElement(lane ? 'div' : 'section');
  c.className = 'kanban-col' + (isCell ? ' kanban-cell' : '') + (isHead ? ' kb-head-cell' : '') + (set.folded ? ' folded' : '') + (set.wip && total > set.wip ? ' kb-over' : '');
  c.dataset.col = col.key;
  if (b.group === 'status') c.dataset.status = col.key;
  if (col.dot) c.style.setProperty('--kb-dot', col.dot);
  if (!isCell) c.setAttribute('aria-label', `${col.label}: ${total} card${total === 1 ? '' : 's'}`);
  _bdDropZone(c, L, col, isCell ? lane.key : null);
  if (set.folded) {
    if (isCell) { c.innerHTML = items.length ? `<span class="kb-fold-n">${items.length}</span>` : ''; return c; }
    const fb = document.createElement('button'); fb.type = 'button'; fb.className = 'kb-fold-strip';
    fb.setAttribute('aria-label', `Unfold ${col.label} (${total})`); fb.dataset.tip = 'Unfold';
    fb.innerHTML = `<span class="kb-fold-dot"></span><span class="kb-fold-label">${esc(col.label)}</span><span class="kb-count">${total}</span>`;
    fb.onclick = () => boardUpdate(b, d => { d.col[col.key] = Object.assign({}, d.col[col.key], { folded: false }); delete d.col[col.key].folded; });
    c.appendChild(fb);
    return c;
  }
  if (!isCell) c.appendChild(_bdColHead(L, col, total));
  if (isHead) return c;
  const list = document.createElement('div'); list.className = 'kanban-list';
  // Today's board: To do in the same sections as the list (order and hidden ones from the view's preferences), until you order it yourself.
  const sections = L.perView && L.view === 'today' && b.group === 'status' && col.key === 'todo' && !L.lanes
    && groupForView('today') === 'auto' && !_bdOrderList(b.id, 'todo').length;
  if (sections) {
    const by = {};
    for (const it of items) { const k = todaySectionOf(it); (by[k] = by[k] || []).push(it); }
    let hiddenN = 0;
    for (const k of todaySectionOrder()) {
      const arr = by[k]; if (!arr || !arr.length) continue;
      if (todaySectionHidden(k)) { hiddenN += arr.length; continue; }
      const def = todaySectionDef(k);
      const sh = document.createElement('div'); sh.className = 'kc-sec' + (k === 'overdue' ? ' danger' : '');
      sh.innerHTML = `${icon(def.icon, 'i-xs')}<span>${esc(def.label)}</span><span class="n">${arr.length}</span>`;
      list.appendChild(sh);
      for (const it of arr) list.appendChild(_renderKanbanCard(it, L, col));
    }
    if (hiddenN) {
      const hn = document.createElement('button'); hn.type = 'button'; hn.className = 'btn btn-ghost btn-sm kc-sec-hidden';
      hn.textContent = `${hiddenN} in hidden sections · Show`;
      hn.onclick = () => { setTaskViewPref('today', { hiddenSections: null }); render(); };
      list.appendChild(hn);
    }
  } else {
    for (const it of items) list.appendChild(_renderKanbanCard(it, L, col));
  }
  if (!items.length) {
    const t = _bdEmptyText(L, col);
    const e = document.createElement('div'); e.className = 'kanban-empty' + (t.cleared ? ' kb-cleared' : '');
    e.innerHTML = (t.cleared ? icon('party-popper', 'i-sm') : '') + `<span>${esc(t.text)}</span>`;
    list.appendChild(e);
  }
  c.appendChild(list);
  if (_bdColTakesDrops(L, col) && !_bdColIsDone(L, col)) c.appendChild(_bdAddInput(L, col, isCell ? lane : null));
  return c;
}
function _bdColHead(L, col, total) {
  const b = L.board, set = _bdColSet(b, col.key);
  const h = document.createElement('h3'); h.className = 'kb-colhead' + (col.mark || col.icon ? ' has-mark' : '');
  const wip = set.wip || 0, over = !!wip && total > wip;
  const manual = _bdOrderList(b.id, col.key).length > 0 && !(b.group === 'custom' && !col.rule);
  h.innerHTML = (col.mark ? `<span class="kb-mark">${col.mark}</span>` : col.icon ? `<span class="kb-mark kb-ic">${icon(col.icon, 'i-xs')}</span>` : '')
    + `<span class="kb-col-label">${esc(col.label)}</span>`
    + `<span class="kb-count${over ? ' over' : ''}"${wip ? ` data-tip="${escAttr(over ? `Over your limit of ${wip}. Just a nudge: nothing is blocked` : `Limit: ${wip}`)}"` : ''}>${wip ? `${total}/${wip}` : total}</span>`
    + (manual ? `<span class="kb-flag" data-tip="Your own order (column menu: back to the usual order)">${icon('arrow-up-down', 'i-xs')}</span>` : '')
    + (col.rule ? `<span class="kb-flag" data-tip="${escAttr('A drop here ' + _bdRuleText(col.rule, b))}">${icon('zap', 'i-xs')}</span>` : '');
  const m = document.createElement('button'); m.type = 'button'; m.className = 'btn-icon btn-sm kb-col-menu';
  m.setAttribute('aria-label', `Column options: ${col.label}`); m.dataset.tip = 'Column options';
  m.innerHTML = icon('ellipsis');
  m.onclick = (e) => { e.stopPropagation(); boardColumnMenu(L, col, m); };
  h.appendChild(m);
  if (col.custom) { const lb = h.querySelector('.kb-col-label'); lb.title = 'Double-click to edit'; lb.ondblclick = () => boardEditColumn(L, col); }
  h.oncontextmenu = (e) => { e.preventDefault(); boardColumnMenu(L, col, m); };
  return h;
}
/** What a drop on a custom column does, in words ("completes it"). */
function _bdRuleText(r, board) {
  if (!r) return 'just places it here';
  if (r.kind === 'status') return r.value === 'done' ? 'completes it' : r.value === 'doing' ? 'starts it' : 'moves it back to To do';
  if (r.kind === 'priority') return r.value === 'p0' ? 'clears its priority' : 'makes it ' + ((BOARD_PRIO_COLS.find(p => p[0] === r.value) || [0, r.value])[1]).toLowerCase() + ' priority';
  if (r.kind === 'stream') return 'moves it to ' + ((STREAMS[r.value] && STREAMS[r.value].label) || r.value);
  if (r.kind === 'tag') return 'tags it #' + r.value;
  if (r.kind === 'person') return (board && board.personDrop === 'link' ? 'links ' : 'waits on ') + _bdPersonName(r.value);
  if (r.kind === 'due') return ({ today: 'makes it due today', tomorrow: 'makes it due tomorrow', week: 'makes it due this week', next: 'makes it due next week', later: 'moves it to later', none: 'clears the date' })[r.value] || 'sets the date';
  return 'places it here';
}
function _bdEmptyText(L, col) {
  const b = L.board, g = b.group;
  const c = _bdClearedOnce;
  if (c && c.board === b.id && c.col === col.key && Date.now() - c.at < 4000) return { cleared: true, text: 'All clear' };
  if (!_bdColTakesDrops(L, col)) return { text: 'Nothing overdue' };
  if (_bdColIsDone(L, col)) return { text: 'Drop here to complete' };
  if (g === 'status') return { text: col.key === 'doing' ? 'Drop a task here to start it' : 'Nothing to do. Add one below' };
  if (g === 'custom') return { text: col.rule ? 'Drop here: ' + _bdRuleText(col.rule, b) : 'Drop a task here' };
  if (g === 'priority') return { text: col.key === 'p0' ? 'Drop here to clear the priority' : `Drop here to make it ${col.label.toLowerCase()} priority` };
  if (g === 'stream') return { text: `Drop here to move it to ${col.label}` };
  if (g === 'tag') return { text: col.key === '_none' ? 'Drop here to clear its tags' : `Drop here to tag it ${col.label}` };
  if (g === 'person') return { text: col.key === '_none' ? 'Drop here to unlink' : (b.personDrop === 'wait' ? `Drop here to wait on ${col.label}` : `Drop here to link ${col.label}`) };
  if (g === 'due') return { text: col.key === 'none' ? 'Drop here to clear the date' : `Drop here to make it due ${col.label.toLowerCase()}` };
  return { text: 'Drop a task here' };
}
/** The per-column (or per-cell) quick add: quick-add words work, and the column (and row) fill in the rest. */
function _bdAddInput(L, col, lane) {
  const b = L.board;
  const fk = 'kanban-add:' + b.id + ':' + col.key + (lane ? ':' + lane.key : '');
  const add = document.createElement('input'); add.className = 'kanban-add' + (lane ? ' kb-add-sm' : '');
  add.placeholder = lane ? '+ Add' : '+ Add a task';
  add.dataset.fk = fk;
  add.setAttribute('aria-label', `Add a task to ${col.label}${lane ? ', ' + lane.label : ''}`);
  add.title = 'Enter to add · quick-add words work: fri, !p1, #tag, @person';
  add.onkeydown = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); add.value = ''; add.blur(); return; }
    if (e.key !== 'Enter' || !add.value.trim()) return;
    e.preventDefault();
    const parsed = parseQuickAdd(add.value);
    let d = typeof quickAddDefaults === 'function' ? quickAddDefaults(L.view) : {};
    d = _bdMergeDefaults(d, b.group === 'custom' ? (col.rule ? _bdDefaultsFor(col.rule.kind, col.rule.value, b) : {}) : _bdDefaultsFor(b.group, col.key, b));
    if (lane) d = _bdMergeDefaults(d, _bdDefaultsFor(b.lanes, lane.key, b));
    _keepFocus(fk);
    const id = addParsedTask(parsed, d);
    // A plain custom column: the list is who is in it.
    if (id && b.group === 'custom' && !col.rule) {
      if (!state.boardOrder || typeof state.boardOrder !== 'object') state.boardOrder = {};
      const k = _bdOrderKey(b.id, col.key);
      state.boardOrder[k] = _bdOrderList(b.id, col.key).concat([id]).slice(-800);
      saveData(); render();
    }
  };
  return add;
}
function _bdLaneHead(L, lane) {
  const b = L.board, folded = !!b.laneFold[lane.key];
  let n = 0;
  for (const col of L.cols) for (const it of (L.byCol.get(col.key) || [])) if (L.laneOf.get(it.id) === lane.key) n++;
  const h = document.createElement('button'); h.type = 'button'; h.className = 'kb-lane-h' + (folded ? ' folded' : '');
  h.setAttribute('aria-expanded', folded ? 'false' : 'true');
  if (lane.dot) h.style.setProperty('--kb-dot', lane.dot);
  h.innerHTML = icon(folded ? 'chevron-right' : 'chevron-down', 'i-xs')
    + (lane.mark ? `<span class="kb-mark">${lane.mark}</span>` : lane.icon ? `<span class="kb-mark kb-ic">${icon(lane.icon, 'i-xs')}</span>` : '<span class="kb-lane-dot"></span>')
    + `<span class="kb-lane-label">${esc(lane.label)}</span><span class="kb-count">${n}</span>`;
  h.title = folded ? 'Unfold this row' : 'Fold this row (drop a task here to move it to this row)';
  h.onclick = () => boardUpdate(b, d => { if (folded) delete d.laneFold[lane.key]; else d.laneFold[lane.key] = true; });
  // A task dropped on a row's heading moves to that row and keeps its column.
  h.addEventListener('dragover', (e) => { if (!isTaskDrag(e)) return; e.preventDefault(); h.classList.add('dragover'); });
  h.addEventListener('dragleave', (e) => { if (!h.contains(e.relatedTarget)) h.classList.remove('dragover'); });
  h.addEventListener('drop', (e) => {
    h.classList.remove('dragover');
    const ids = draggedTaskIds(e); if (!ids.length) return;
    e.preventDefault(); e.stopPropagation();
    _bdDropOnLane(L, ids, lane);
  });
  return h;
}
function _bdDropOnLane(L, ids, lane) {
  const b = L.board, phrases = [];
  for (const id of ids) { if (L.laneOf.get(id) === lane.key) continue; const p = _bdApply(b.lanes, id, lane.key, L.laneOf.get(id), b); if (p && !phrases.includes(p)) phrases.push(p); }
  if (!phrases.length) return;
  saveData(); render();
  toast(`${ids.length === 1 ? '“' + _bdShort(effTitle(getItem(ids[0]))) + '”' : ids.length + ' tasks'}: ${phrases.join(' · ')}`, { kind: 'ok', icon: 'square-kanban', action: { label: 'Undo', run: () => undo() } });
}

/* ---------- dropping (place + action), with the insertion line ---------- */
function _bdDropZone(el, L, col, laneKey) {
  el.addEventListener('dragover', (e) => {
    if (!isTaskDrag(e)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    el.classList.add('dragover');
    _bdMarkPos(el, e, _bdDragCol === col.key || _bdColOrdered(L, col));
  });
  el.addEventListener('dragleave', (e) => { if (!el.contains(e.relatedTarget)) { el.classList.remove('dragover'); _bdClearPos(el); } });
  el.addEventListener('drop', (e) => {
    el.classList.remove('dragover');
    const ids = draggedTaskIds(e); if (!ids.length) return;
    e.preventDefault(); e.stopPropagation();
    const pos = _bdPosFor(el, e);
    _bdClearPos(el);
    boardDropIds(L, ids, col.key, laneKey, pos.before, { positional: pos.positional });
  });
}
function _bdPosFor(el, e) {
  const cards = [...el.querySelectorAll('.kanban-card')].filter(n => !n.classList.contains('dragging'));
  if (!cards.length) return { before: null, positional: false, el: null };
  for (const n of cards) { const r = n.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) return { before: n.dataset.id, positional: true, el: n }; }
  return { before: null, positional: true, el: cards[cards.length - 1], after: true };
}
function _bdMarkPos(el, e, show) {
  const p = show ? _bdPosFor(el, e) : { el: null };
  const want = p.el ? p.el.dataset.id + (p.after ? ':a' : ':b') : '';
  if (el._bdMark === want) return;
  el._bdMark = want;
  _bdClearPos(el, true);
  if (p.el) p.el.classList.add(p.after ? 'drop-after' : 'drop-before');
}
function _bdClearPos(el, keep) {
  if (!keep) el._bdMark = '';
  el.querySelectorAll('.kanban-card.drop-before, .kanban-card.drop-after').forEach(n => n.classList.remove('drop-before', 'drop-after'));
}

/* ---------- cards ---------- */
function _bdAgeDays(it) {
  const acts = state.taskActivity && state.taskActivity[it.id];
  const last = Array.isArray(acts) && acts.length ? (acts[acts.length - 1].ts || 0) : (typeof _createdTs === 'function' ? _createdTs(it) : 0);
  if (!last) return 0;
  const now = typeof Clock !== 'undefined' && Clock.now ? Clock.now() : Date.now();
  return Math.floor((now - last) / 86400000);
}
function _renderKanbanCard(it, L, col) {
  const b = L ? L.board : null;
  const F = new Set(b ? b.fields : BOARD_DEFAULT_FIELDS);
  const by = (k) => !!b && (b.group === k || b.lanes === k);
  const status = statusOf(it.id);
  const card = document.createElement('div');
  card.className = 'kanban-card' + (state.selectedTaskId === it.id ? ' selected' : '') + (status === 'done' ? ' done' : '') + (isWontDo(it) ? ' wontdo' : '') + (_lastSelectedTaskId === it.id ? ' kb-cursor' : '') + (multiSelect.ids.has(it.id) ? ' multi-selected' : '');
  card.dataset.id = it.id;
  card.draggable = true;
  card.ondragstart = e => { _bdDragCol = col ? col.key : null; _startTaskDrag(e, it, card); };
  card.ondragend = () => { _bdDragCol = null; _endTaskDrag(card); };
  const stream = effStream(it), prio = effPriority(it);
  if (b && b.colorBy !== 'none') {
    const c = b.colorBy === 'priority' ? (prio !== 'p0' && PRIORITIES[prio] ? PRIORITIES[prio].color : '') : (STREAMS[stream] ? safeColor(STREAMS[stream].color, '') : '');
    if (c) { card.classList.add('has-stripe'); card.style.setProperty('--kc-stripe', c); }
  }
  const top = document.createElement('div'); top.className = 'kc-top';
  // The same checkbox as a list row: click = done, Shift+click = in progress, Alt+click = won't do.
  const wont = isWontDo(it);
  const cb = document.createElement('button'); cb.type = 'button';
  cb.className = 'checkbox ' + prio + (status === 'doing' ? ' doing' : '') + (status === 'done' ? (wont ? ' wontdo' : ' done') : '');
  cb.setAttribute('role', 'checkbox');
  cb.setAttribute('aria-checked', status === 'done' ? 'true' : status === 'doing' ? 'mixed' : 'false');
  cb.setAttribute('aria-label', (status === 'done' ? 'Reopen: ' : 'Complete: ') + effTitle(it));
  cb.title = status === 'done' ? (wont ? "Won't do · click to reopen" : 'Done · click to reopen') : `${PRIORITIES[prio]?.label || ''} · click to complete · Shift+click: in progress · Alt+click: won't do`;
  if (wont) cb.innerHTML = icon('minus', 'i-xs');
  cb.onclick = (e) => {
    e.stopPropagation();
    if (e.shiftKey && status !== 'done') { toggleDoing(it.id); return; }
    if (e.altKey && status !== 'done') { markWontDo(it.id); return; }
    toggleDone(it.id);
  };
  const ttl = document.createElement('div'); ttl.className = 'ttl'; ttl.textContent = effTitle(it);
  top.append(cb, ttl);
  if (isPinned(it.id) && status !== 'done') {   // the pin marker (Unpin: right-click > Unpin)
    card.classList.add('pinned');
    const pm = document.createElement('span'); pm.className = 'kc-pin'; pm.setAttribute('aria-label', 'Pinned'); pm.dataset.tip = 'Pinned to the top';
    pm.innerHTML = icon('pin', 'i-xs'); top.appendChild(pm);
  }
  card.appendChild(top);
  const subs = getSubtasks(it.id);
  if (F.has('subtasks') && subs.length) {   // checklist progress
    const done = subs.filter(x => x.done).length, pct = Math.round(done / subs.length * 100);
    const pb = document.createElement('div'); pb.className = 'kc-progress' + (done === subs.length ? ' full' : '');
    pb.setAttribute('role', 'progressbar'); pb.setAttribute('aria-valuemin', '0'); pb.setAttribute('aria-valuemax', String(subs.length)); pb.setAttribute('aria-valuenow', String(done));
    pb.setAttribute('aria-label', `Checklist: ${done} of ${subs.length} done`);
    pb.innerHTML = `<span style="width:${pct}%"></span>`;
    card.appendChild(pb);
  }
  const meta = document.createElement('div'); meta.className = 'meta';
  if (F.has('stream') && !by('stream')) {
    const sb = document.createElement('span'); sb.className = 'stream';
    sb.style.setProperty('--c', safeColor(STREAMS[stream]?.color, '#868a94'));
    sb.innerHTML = `${streamMarkHtml(stream, { inherit: true })}<span data-cz-label>${esc(STREAMS[stream]?.label || stream || '')}</span>`;
    if (STREAMS[stream]) czMark(sb, 'stream', stream);   // marker + right-click menu (28-customise.js)
    meta.appendChild(sb);
  }
  if (F.has('priority') && prio !== 'p0' && !by('priority')) {
    const p = document.createElement('span'); p.className = 'm kc-prio ' + prio; p.innerHTML = icon('flag') + `<span>${esc(prio.toUpperCase())}</span>`;
    p.title = PRIORITIES[prio]?.label || ''; meta.appendChild(p);
  }
  if (F.has('subtasks') && subs.length) { const s = document.createElement('span'); s.className = 'm'; s.innerHTML = icon('list-checks') + `<span>${subs.filter(x => x.done).length}/${subs.length}</span>`; meta.appendChild(s); }
  if (F.has('notes')) { const n = getNotes(it.id).length; if (n) { const s = document.createElement('span'); s.className = 'm'; s.title = `${n} note${n === 1 ? '' : 's'}`; s.innerHTML = icon('message-square') + `<span>${n}</span>`; meta.appendChild(s); } }
  if (F.has('estimate') && it.estimate && typeof fmtEstimate === 'function') { const s = document.createElement('span'); s.className = 'm kc-est'; s.title = 'Estimate'; s.innerHTML = icon('timer') + `<span>${esc(fmtEstimate(it.estimate))}</span>`; meta.appendChild(s); }
  const sp = document.createElement('span'); sp.className = 'grow'; meta.appendChild(sp);
  if (F.has('age') && status !== 'done') {   // quiet for two weeks or more: a soft nudge
    const d = _bdAgeDays(it);
    if (d >= 14) { const a = document.createElement('span'); a.className = 'm kc-age' + (d >= 42 ? ' old' : ''); a.dataset.tip = `No changes for ${d} days`; a.innerHTML = icon('hourglass') + `<span>${d >= 14 ? Math.floor(d / 7) + 'w' : d + 'd'}</span>`; meta.appendChild(a); }
  }
  if (F.has('people')) {
    const av = _taskAvatarsHtml(it, 3);
    if (av.html) { const a = document.createElement('span'); a.className = 'avatars'; a.innerHTML = av.html; a.title = av.title + (it.waitingOn && getPerson(it.waitingOn) ? ` · waiting on ${getPerson(it.waitingOn).name}` : ''); meta.appendChild(a); }
  }
  if (F.has('due') && effDate(it) && status !== 'done') { const ds = document.createElement('span'); ds.className = 'due-stamp ' + _rowDueClass(it); ds.textContent = rowDueLabel(it); meta.appendChild(ds); }
  if (meta.children.length > 1) card.appendChild(meta);
  const tags = F.has('tags') ? effTags(it).filter(t => !(b && b.group === 'tag' && col && col.key === t)) : [];
  if (tags.length) {
    const chips = document.createElement('div'); chips.className = 'chips kc-tags';
    for (const t of tags.slice(0, 2)) { const c = document.createElement('span'); c.className = 'chip'; c.innerHTML = `<span data-cz-label>${esc(t)}</span>`; czTagChip(c, t); chips.appendChild(c); }
    if (tags.length > 2) { const c = document.createElement('span'); c.className = 'chip chip-more'; c.textContent = '+' + (tags.length - 2); chips.appendChild(c); }
    card.appendChild(chips);
  }
  // As in the list: Ctrl/Cmd+click ticks it for the bulk bar; a plain click opens it (centre card or side panel).
  card.onclick = (e) => {
    if (e.shiftKey && _selectRangeTo(it.id)) return;   // Shift+click: everything from the last one clicked (30-task-row.js)
    _lastSelectedTaskId = it.id;
    if (e.ctrlKey || e.metaKey || multiSelect.active) { _toggleMulti(it.id); return; }
    openTask(it.id, { from: card });
  };
  card.oncontextmenu = (e) => { e.preventDefault(); _lastSelectedTaskId = it.id; openTaskMenu({ x: e.clientX, y: e.clientY }, it.id); };
  return card;
}
