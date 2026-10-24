/* ============================================================
   BOARD UI (owner: Boards, 2.16): the board's toolbar (Showing, Columns, Rows,
   Cards, hidden columns, + Column, Save as board), the column menu, the column
   and limit dialogs, saved boards (the 'taskboard:<id>' section, the sidebar's
   Boards block via boardsSidebarBlock, the New board dialog with templates),
   and the board keys:
     Left / Right       the keyboard cursor to the next column
     Alt+Left / Right   move the card (or the selection) to the next column
     Alt+Up / Down      move the card up or down in its column
     M                  "Move to…" menu for the card under the cursor
   Every change is one undo step with Undo in its toast (boardUpdate, 33-board-model.js).
   ============================================================ */

/* ---------- toolbar ---------- */
/** A toolbar button: uiButton (ghost, small) with the bar's "Label  Value  v" markup. */
function _bdBarBtn(o) {
  const btn = uiButton({ label: o.label || o.value || ' ', kind: 'ghost', size: 'sm', cls: 'kb-bar-btn' + (o.className ? ' ' + o.className : ''), tip: o.tip, aria: o.aria, run: (e, b) => o.run(b) });
  btn.innerHTML = (o.icon ? icon(o.icon) : '') + (o.label ? `<span class="k">${esc(o.label)}</span>` : '') + (o.value ? `<span class="v">${esc(o.value)}</span>` : '') + (o.menu ? icon('chevron-down', 'i-xs kb-chev') : '');
  if (o.menu) btn.setAttribute('aria-haspopup', 'menu');
  return btn;
}
function _bdFilterLabel(b) { const v = (b.filter && b.filter.view) || 'all'; return typeof viewTitle === 'function' ? viewTitle(v) : v; }
function _bdToolbar(L) {
  const b = L.board;
  const bar = document.createElement('div'); bar.className = 'board-bar';
  bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Board');
  // 2.19.1: Showing, Columns, Rows and Cards are one Layout menu (each still opens its own list), not four buttons.
  const g = BOARD_GROUPS.find(x => x[0] === b.group) || BOARD_GROUPS[0];
  bar.appendChild(_bdBarBtn({ icon: 'layout-template', label: 'Layout', value: g[1], menu: true, tip: 'What the board shows, its columns, rows and cards', run: (el) => openMenu(el, [
    ...(!L.perView ? [{ label: 'Showing', hint: _bdFilterLabel(b), icon: 'list-filter', run: () => _bdFilterMenu(L, el) }] : []),
    { label: 'Columns', hint: g[1], icon: g[2], run: () => _bdGroupMenu(L, el) },
    { label: 'Rows', hint: b.lanes === 'none' ? 'None' : (BOARD_LANES.find(x => x[0] === b.lanes) || BOARD_LANES[0])[1], icon: 'table-2', run: () => _bdLaneMenu(L, el) },
    { label: 'Cards', icon: 'layout-template', run: () => _bdCardsMenu(L, el) },
  ], { align: 'start', width: 250 }) }));
  if (L.hidden.length) bar.appendChild(_bdBarBtn({ icon: 'eye-off', value: `${L.hidden.length} hidden`, menu: true, tip: 'Hidden columns', run: (el) => _bdHiddenMenu(L, el) }));
  const sp = document.createElement('span'); sp.className = 'grow'; bar.appendChild(sp);
  // How far along the board is (when it has a Done column).
  const doneCol = L.cols.find(c => _bdColIsDone(L, c));
  if (doneCol && L.count) {
    const d = (L.byCol.get(doneCol.key) || []).length, pct = Math.round(d / L.count * 100);
    const p = document.createElement('span'); p.className = 'kb-sum' + (pct === 100 ? ' full' : '');
    p.setAttribute('role', 'img'); p.setAttribute('aria-label', `${d} of ${L.count} done`);
    p.innerHTML = `<span class="kb-sum-bar"><span style="width:${pct}%"></span></span><span>${pct === 100 ? 'All done' : `${d} of ${L.count} done`}</span>`;
    bar.appendChild(p);
  }
  if (b.group === 'custom' || b.group === 'tag' || b.group === 'person') {
    bar.appendChild(_bdBarBtn({ icon: 'plus', label: 'Column', aria: 'Add a column', menu: b.group !== 'custom', run: (el) => (b.group === 'custom' ? boardEditColumn(L, null) : _bdAddKeyColumnMenu(L, el)) }));
  }
  const keysItem = { label: 'Board keys', icon: 'keyboard', run: () => toast('Board keys: ← → move between columns · Alt+← → move the card · Alt+↑ ↓ reorder it · M opens Move to…', { icon: 'keyboard', timeout: 7000 }) };
  bar.appendChild(_bdBarBtn({ icon: 'ellipsis', aria: 'More', tip: 'More: save, rename, keys', run: (el) => {
    if (L.perView) openMenu(el, [{ label: 'Save as board', icon: 'square-kanban', hint: 'in the sidebar under Boards', run: () => boardSaveFromView(L) }, keysItem], { align: 'end', width: 250 });
    else _bdBoardMenu(L, el, [keysItem]);
  } }));
  return bar;
}

/* ---------- toolbar menus ---------- */
function _bdGroupMenu(L, el) {
  const b = L.board;
  const items = [{ heading: 'Columns by' }];
  for (const [k, label, ic] of BOARD_GROUPS) items.push({ label, icon: ic, checked: b.group === k, run: () => _bdSetGroup(L, k) });
  const persons = b.group === 'person' || b.lanes === 'person' || (b.group === 'custom' && b.columns.some(c => c.rule && c.rule.kind === 'person'));
  if (persons) {
    items.push('sep', { heading: 'A drop on a person' },
      { label: 'Links them and waits on them', checked: b.personDrop === 'wait', run: () => boardUpdate(b, d => { d.personDrop = 'wait'; }, 'A drop on a person now waits on them', { icon: 'users' }) },
      { label: 'Only links them', checked: b.personDrop === 'link', run: () => boardUpdate(b, d => { d.personDrop = 'link'; }, 'A drop on a person now only links them', { icon: 'users' }) });
  }
  if (b.group !== 'custom') items.push('sep', { label: 'Make these my own columns', icon: 'columns-3', hint: 'rename, add, set what a drop does', run: () => _bdToCustom(L) });
  openMenu(el, items, { width: 280 });
}
function _bdSetGroup(L, k) {
  const b = L.board;
  if (b.group === k) return;
  if (k === 'custom' && !b.columns.length) { _bdToCustom(L); return; }
  const g = BOARD_GROUPS.find(x => x[0] === k);
  boardUpdate(b, d => { d.group = k; if (d.lanes === k) d.lanes = 'none'; }, `Columns by ${g[1].toLowerCase()}`, { icon: g[2] });
}
/** The columns on screen become the board's own (each keeps what a drop on it did). */
function _bdToCustom(L) {
  const b = L.board;
  const src = b.group === 'custom' ? [] : L.cols;
  let cols = src.map(c => {
    const col = { id: _bdNewId('col'), label: c.label };
    if (c.key !== '_none') col.rule = { kind: b.group, value: c.key };
    return { col, wip: _bdColSet(b, c.key).wip || 0 };
  });
  if (!cols.length) cols = [{ col: { id: _bdNewId('col'), label: 'To do' } }, { col: { id: _bdNewId('col'), label: 'In progress', rule: { kind: 'status', value: 'doing' } } }, { col: { id: _bdNewId('col'), label: 'Done', rule: { kind: 'status', value: 'done' } } }];
  boardUpdate(b, d => {
    d.group = 'custom';
    d.columns = cols.map(x => x.col);
    for (const x of cols) if (x.wip) d.col[x.col.id] = { wip: x.wip };
    if (d.lanes === 'custom') d.lanes = 'none';
  }, 'These are your own columns now: rename them, add more, choose what a drop does', { icon: 'columns-3' });
}
function _bdLaneMenu(L, el) {
  const b = L.board;
  const items = [{ heading: 'Rows by' }];
  for (const [k, label] of BOARD_LANES) {
    if (k !== 'none' && k === b.group) continue;
    items.push({ label, icon: k === 'none' ? 'square' : 'table-2', checked: b.lanes === k, run: () => { if (b.lanes !== k) boardUpdate(b, d => { d.lanes = k; d.laneFold = {}; }, k === 'none' ? 'No rows' : `A row per ${label.toLowerCase()}`, { icon: 'table-2' }); } });
  }
  if (L.lanes) {
    items.push('sep',
      { label: 'Fold every row', icon: 'minimize-2', run: () => boardUpdate(b, d => { d.laneFold = {}; for (const l of L.lanes) d.laneFold[l.key] = true; }) },
      { label: 'Unfold every row', icon: 'maximize-2', disabled: !Object.keys(b.laneFold).length, run: () => boardUpdate(b, d => { d.laneFold = {}; }) });
  }
  openMenu(el, items, { width: 240 });
}
function _bdCardsMenu(L, el) {
  const b = L.board, has = new Set(b.fields);
  const items = [{ heading: 'Show on cards' }];
  for (const [k, label, ic] of BOARD_FIELDS) {
    items.push({ label, icon: ic, checked: has.has(k), run: () => boardUpdate(b, d => { const s = new Set(d.fields); if (s.has(k)) s.delete(k); else s.add(k); d.fields = BOARD_FIELDS.map(f => f[0]).filter(f => s.has(f)); }) });
  }
  items.push('sep', { heading: 'Colour stripe' });
  for (const [k, label] of BOARD_COLOR_BY) items.push({ label, icon: 'palette', checked: b.colorBy === k, run: () => { if (b.colorBy !== k) boardUpdate(b, d => { d.colorBy = k; }); } });
  openMenu(el, items, { width: 240 });
}
function _bdHiddenMenu(L, el) {
  const b = L.board;
  const items = [{ heading: 'Hidden columns' }];
  for (const c of L.hidden) items.push({ label: 'Show ' + c.label, icon: 'eye', run: () => boardUpdate(b, d => { if (d.col[c.key]) { d.col[c.key] = Object.assign({}, d.col[c.key]); delete d.col[c.key].hidden; } }, `${c.label} shown`, { icon: 'eye' }) });
  if (L.hidden.length > 1) items.push('sep', { label: 'Show them all', icon: 'eye', run: () => boardUpdate(b, d => { for (const c of L.hidden) if (d.col[c.key]) { d.col[c.key] = Object.assign({}, d.col[c.key]); delete d.col[c.key].hidden; } }, 'Every column shown', { icon: 'eye' }) });
  openMenu(el, items, { width: 240 });
}
/** Tag and person boards: add a column for a tag or person that has no cards here yet. */
function _bdAddKeyColumnMenu(L, el) {
  const b = L.board, shown = new Set(L.all.map(c => c.key));
  const items = [{ heading: b.group === 'tag' ? 'Add a column for a tag' : 'Add a column for a person' }];
  let keys = [];
  if (b.group === 'tag') {
    const n = new Map();
    for (const i of getAllItems()) for (const t of effTags(i)) n.set(t, (n.get(t) || 0) + 1);
    keys = [...n.keys()].filter(k => !shown.has(k)).sort((x, y) => n.get(y) - n.get(x)).slice(0, 20).map(k => ({ key: k, label: '#' + k, icon: 'hash' }));
  } else {
    keys = (state.people || []).filter(p => p && !p.self && !shown.has(p.id)).sort((x, y) => String(x.name || '').localeCompare(String(y.name || ''))).slice(0, 30)
      .map(p => ({ key: p.id, label: p.name || p.id, icon: _bdPersonMark(p) }));
  }
  if (!keys.length) items.push({ label: b.group === 'tag' ? 'Every tag has a column' : 'Everyone has a column', disabled: true });
  for (const k of keys) items.push({ label: k.label, icon: k.icon, run: () => boardUpdate(b, d => { const order = L.all.map(c => c.key); order.push(k.key); d.colOrder = order; }, `Column ${k.label} added`, { icon: 'columns-3' }) });
  openMenu(el, items, { width: 260 });
}
function _bdFilterMenu(L, el) {
  const b = L.board, cur = (b.filter && b.filter.view) || 'all';
  const set = (view) => { if (view !== cur) boardUpdate(b, d => { d.filter = Object.assign({}, d.filter || {}, { view }); }, `Showing ${viewTitle(view)}`, { icon: 'list-filter' }); };
  const items = [{ heading: 'Tasks from' }];
  for (const [v, ic] of [['all', 'layers'], ['today', 'sun'], ['week', 'calendar-range'], ['no-date', 'circle-dashed']]) items.push({ label: viewTitle(v), icon: ic, checked: cur === v, run: () => set(v) });
  const streams = Object.entries(STREAMS).filter(([, s]) => !s.archived).sort((x, y) => (x[1].order ?? 0) - (y[1].order ?? 0));
  if (streams.length) { items.push({ heading: 'A stream' }); for (const [k, s] of streams) items.push({ label: s.label || k, icon: streamMarkHtml(k), checked: cur === 'stream:' + k, run: () => set('stream:' + k) }); }
  const open = getAllItems().filter(i => statusOf(i.id) !== 'done');
  const tagN = new Map();
  for (const i of open) for (const t of effTags(i)) tagN.set(t, (tagN.get(t) || 0) + 1);
  const tags = [...tagN.keys()].sort((x, y) => tagN.get(y) - tagN.get(x)).slice(0, 8);
  if (cur.startsWith('tag:') && !tags.includes(cur.slice(4))) tags.push(cur.slice(4));
  if (tags.length) { items.push({ heading: 'A tag' }); for (const t of tags) items.push({ label: '#' + t, icon: 'hash', checked: cur === 'tag:' + t, run: () => set('tag:' + t) }); }
  const ppl = (state.people || []).filter(p => p && !p.self).map(p => ({ p, n: open.filter(i => _bdPeopleOf(i).includes(p.id)).length })).filter(x => x.n || cur === 'person:' + x.p.id).sort((x, y) => y.n - x.n).slice(0, 8);
  if (ppl.length) { items.push({ heading: 'A person' }); for (const { p } of ppl) items.push({ label: p.name, icon: _bdPersonMark(p), checked: cur === 'person:' + p.id, run: () => set('person:' + p.id) }); }
  items.push('sep', { label: 'Show recently done', icon: 'circle-check', checked: !(b.filter && b.filter.done === 'hide'), run: () => boardUpdate(b, d => { d.filter = Object.assign({}, d.filter || {}, { done: d.filter && d.filter.done === 'hide' ? 'recent' : 'hide' }); }) });
  openMenu(el, items, { width: 260 });
}
function _bdBoardMenu(L, el, extra) {
  const b = L.board, list = boardSavedList(), i = list.findIndex(x => x.id === b.id);
  openMenu(el, [
    { heading: b.name || 'Board' },
    { label: 'Rename…', icon: 'pencil', run: () => _bdRename(b.id) },
    { label: 'Icon…', icon: BOARD_ICONS.includes(b.icon) ? b.icon : 'square-kanban', run: () => _bdIconMenu(b, el) },
    { label: 'Duplicate', icon: 'copy', run: () => { const nb = boardCreate(Object.assign(JSON.parse(JSON.stringify(b)), { name: (b.name || 'Board') + ' copy' }), { orderFrom: b.id }); setView(BOARD_VIEW_PREFIX + nb.id); toast(`Made “${nb.name}”`, { kind: 'ok', icon: 'copy', action: { label: 'Undo', run: () => undo() } }); } },
    { label: 'Move up in the sidebar', icon: 'arrow-up', disabled: i <= 0, run: () => _bdMoveBoard(b.id, -1) },
    { label: 'Move down in the sidebar', icon: 'arrow-down', disabled: i < 0 || i >= list.length - 1, run: () => _bdMoveBoard(b.id, 1) },
    'sep',
    ...(extra && extra.length ? [...extra, 'sep'] : []),
    { label: 'Delete board', icon: 'trash-2', danger: true, hint: 'tasks stay', run: () => boardDelete(b.id) },
  ], { align: 'end', width: 250 });
}
function _bdRename(id) {
  const b = boardById(id); if (!b) return;
  promptDialog({ title: 'Rename board', label: 'Name', value: b.name || '', confirmLabel: 'Rename' }).then(v => {
    v = String(v || '').trim().slice(0, 60);
    if (v && v !== b.name) boardUpdate(b, d => { d.name = v; }, `Renamed to “${v}”`, { icon: 'pencil' });
  });
}
function _bdIconMenu(b, el) {
  openMenu(el, [{ heading: 'Icon' }].concat(BOARD_ICONS.map(ic => ({ label: ic.replace(/-/g, ' '), icon: ic, checked: (b.icon || 'square-kanban') === ic, run: () => boardUpdate(b, d => { d.icon = ic; }) }))), { align: 'end', width: 220 });
}
function _bdMoveBoard(id, dir) {
  const list = boardSavedList(), i = list.findIndex(x => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  list.forEach((x, n) => { const s = state.taskBoards.find(y => y && y.id === x.id); if (s) s.order = n; });
  saveData(); render();
  toast('Board moved', { icon: dir < 0 ? 'arrow-up' : 'arrow-down', action: { label: 'Undo', run: () => undo() } });
}

/* ---------- the column menu and dialogs ---------- */
function boardColumnMenu(L, col, anchor) {
  const b = L.board, set = _bdColSet(b, col.key), i = L.cols.findIndex(c => c.key === col.key);
  const manual = _bdOrderList(b.id, col.key).length > 0 && !(b.group === 'custom' && !col.rule);
  const items = [{ heading: col.label }];
  if (col.custom) items.push({ label: 'Edit column…', icon: 'pencil', run: () => boardEditColumn(L, col) });
  items.push({ label: set.wip ? `Limit: ${set.wip}…` : 'Set a limit…', icon: 'gauge', hint: 'a soft one', run: () => _bdWipDialog(L, col) });
  items.push({ label: set.folded ? 'Unfold' : 'Fold', icon: set.folded ? 'maximize-2' : 'minimize-2', run: () => boardUpdate(b, d => { const c = Object.assign({}, d.col[col.key]); if (c.folded) delete c.folded; else c.folded = true; d.col[col.key] = c; }) });
  items.push({ label: 'Move left', icon: 'arrow-left', disabled: i <= 0, run: () => _bdMoveCol(L, col, -1) });
  items.push({ label: 'Move right', icon: 'arrow-right', disabled: i < 0 || i >= L.cols.length - 1, run: () => _bdMoveCol(L, col, 1) });
  if (manual) items.push({ label: 'Back to the usual order', icon: 'arrow-up-down', run: () => boardUpdate(b, () => { delete state.boardOrder[_bdOrderKey(b.id, col.key)]; }, `${col.label}: usual order again`, { icon: 'arrow-up-down' }) });
  if (col.custom) items.push({ label: 'Add a column after', icon: 'plus', run: () => boardEditColumn(L, null, { after: col.key }) });
  items.push('sep');
  if (col.custom) items.push({ label: 'Delete column', icon: 'trash-2', danger: true, hint: 'tasks stay', run: () => _bdDeleteCol(L, col) });
  else items.push({ label: 'Hide column', icon: 'eye-off', run: () => boardUpdate(b, d => { d.col[col.key] = Object.assign({}, d.col[col.key], { hidden: true }); }, `${col.label} hidden`, { icon: 'eye-off' }) });
  openMenu(anchor, items, { align: 'end', width: 250 });
}
function _bdMoveCol(L, col, dir) {
  const b = L.board, i = L.cols.findIndex(c => c.key === col.key), other = L.cols[i + dir];
  if (!other) return;
  boardUpdate(b, d => {
    if (d.group === 'custom') {
      const a = d.columns.findIndex(c => c.id === col.key), z = d.columns.findIndex(c => c.id === other.key);
      if (a < 0 || z < 0) return;
      [d.columns[a], d.columns[z]] = [d.columns[z], d.columns[a]];
    } else {
      const keys = L.all.map(c => c.key), a = keys.indexOf(col.key), z = keys.indexOf(other.key);
      [keys[a], keys[z]] = [keys[z], keys[a]];
      d.colOrder = keys;
    }
  }, `${col.label} moved ${dir < 0 ? 'left' : 'right'}`, { icon: dir < 0 ? 'arrow-left' : 'arrow-right' });
}
function _bdDeleteCol(L, col) {
  const b = L.board;
  const n = (L.byCol.get(col.key) || []).length;
  boardUpdate(b, d => {
    d.columns = d.columns.filter(c => c.id !== col.key);
    delete d.col[col.key];
    if (state.boardOrder) delete state.boardOrder[_bdOrderKey(b.id, col.key)];
  }, `Column “${col.label}” deleted${n ? `. Its ${n} card${n === 1 ? '' : 's'} moved over` : ''}`, { icon: 'trash-2' });
}
function _bdWipDialog(L, col) {
  const b = L.board, cur = _bdColSet(b, col.key).wip || 0;
  promptDialog({ title: `Limit for ${col.label}`, label: 'Most cards you want here. Over it the column turns amber: a nudge, nothing is blocked. Empty or 0: no limit.', value: cur ? String(cur) : '', placeholder: 'e.g. 3', confirmLabel: 'Save' }).then(v => {
    if (v === null) return;
    const n = Math.max(0, Math.min(99, parseInt(v, 10) || 0));
    if (n === cur) return;
    boardUpdate(b, d => { const c = Object.assign({}, d.col[col.key]); if (n) c.wip = n; else delete c.wip; d.col[col.key] = c; }, n ? `${col.label}: limit ${n}` : `${col.label}: no limit`, { icon: 'gauge' });
  });
}
function _bdRuleOptions(sel, cur, b) {
  const add = (parent, v, t) => { const op = document.createElement('option'); op.value = v; op.textContent = t; parent.appendChild(op); };
  const grp = (label) => { const g = document.createElement('optgroup'); g.label = label; sel.appendChild(g); return g; };
  add(sel, '', 'Nothing else: it just sits here');
  let g = grp('Status');
  add(g, 'status:doing', 'Starts it (In progress)'); add(g, 'status:done', 'Completes it'); add(g, 'status:todo', 'Moves it back to To do');
  g = grp('Due date');
  for (const [k, l] of BOARD_DUE_COLS) if (k !== 'overdue') add(g, 'due:' + k, k === 'none' ? 'Clears the date' : k === 'later' ? 'Moves it to later' : 'Makes it due ' + l.toLowerCase());
  g = grp('Priority');
  for (const [k, l] of BOARD_PRIO_COLS) add(g, 'priority:' + k, k === 'p0' ? 'Clears the priority' : `Makes it ${l.toLowerCase()} priority`);
  const streams = Object.entries(STREAMS).filter(([, s]) => !s.archived).sort((x, y) => (x[1].order ?? 0) - (y[1].order ?? 0));
  if (streams.length) { g = grp('Stream'); for (const [k, s] of streams) add(g, 'stream:' + k, 'Moves it to ' + (s.label || k)); }
  const tagN = new Map();
  for (const i of getAllItems()) for (const t of effTags(i)) tagN.set(t, (tagN.get(t) || 0) + 1);
  const tags = [...tagN.keys()].sort((x, y) => tagN.get(y) - tagN.get(x)).slice(0, 40);
  if (cur && cur.kind === 'tag' && !tags.includes(cur.value)) tags.push(cur.value);
  if (tags.length) { g = grp('Tag'); for (const t of tags) add(g, 'tag:' + t, 'Tags it #' + t); }
  const ppl = (state.people || []).filter(p => p && !p.self).sort((x, y) => String(x.name || '').localeCompare(String(y.name || '')));
  if (ppl.length) { g = grp('Person'); for (const p of ppl) add(g, 'person:' + p.id, (b.personDrop === 'link' ? 'Links ' : 'Waits on ') + (p.name || p.id)); }
  sel.value = cur ? `${cur.kind}:${cur.value}` : '';
}
/** New or edit a custom column: its name, what a drop on it does, and a soft limit. o.after: put a new one after that column. */
function boardEditColumn(L, col, o) {
  o = o || {};
  const b = L.board;
  if (b.group !== 'custom') { _bdToCustom(L); return; }
  const cur = col ? b.columns.find(c => c.id === col.key) : null;
  const wip0 = cur ? (_bdColSet(b, cur.id).wip || 0) : 0;
  let name = null, sel = null, wip = null;
  const save = () => {
    const raw = sel.value;
    const at = raw.indexOf(':');
    const rule = raw ? { kind: raw.slice(0, at), value: raw.slice(at + 1) } : null;
    const label = (name.value.trim() || (sel.selectedOptions[0] && raw ? sel.selectedOptions[0].textContent : '') || 'Column').slice(0, 60);
    const n = Math.max(0, Math.min(99, parseInt(wip.value, 10) || 0));
    let key = cur ? cur.id : null;
    boardUpdate(b, d => {
      if (cur) {
        const c = d.columns.find(x => x.id === cur.id); if (!c) return;
        c.label = label;
        if (rule) c.rule = rule; else delete c.rule;
      } else {
        const nc = { id: _bdNewId('col'), label };
        if (rule) nc.rule = rule;
        key = nc.id;
        const after = o.after ? d.columns.findIndex(x => x.id === o.after) : -1;
        d.columns.splice(after >= 0 ? after + 1 : d.columns.length, 0, nc);
      }
      const s = Object.assign({}, d.col[key]);
      if (n) s.wip = n; else delete s.wip;
      d.col[key] = s;
    }, cur ? `Column “${label}” saved` : `Column “${label}” added`, { icon: 'columns-3' });
  };
  openDialog({
    title: cur ? 'Edit column' : 'New column', size: 'sm', resizeKey: 'board-column',
    body: (el, close) => {
      const f1 = document.createElement('label'); f1.className = 'field';
      f1.innerHTML = '<span class="field-label">Name</span>';
      name = document.createElement('input'); name.className = 'control'; name.value = cur ? cur.label : ''; name.placeholder = 'e.g. Writing'; name.maxLength = 60;
      name.setAttribute('autofocus', '');
      name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); close(); } };
      f1.appendChild(name);
      const f2 = document.createElement('label'); f2.className = 'field';
      f2.innerHTML = '<span class="field-label">A task dropped here</span>';
      sel = document.createElement('select'); sel.className = 'control';
      _bdRuleOptions(sel, cur && cur.rule, b);
      f2.appendChild(sel);
      const hint = document.createElement('span'); hint.className = 'field-hint';
      hint.textContent = 'Tasks that already match gather here too (Completes it: finished tasks land here). A plain column holds what you put in it.';
      f2.appendChild(hint);
      const f3 = document.createElement('label'); f3.className = 'field';
      f3.innerHTML = '<span class="field-label">Soft limit (optional)</span>';
      wip = document.createElement('input'); wip.className = 'control'; wip.type = 'number'; wip.min = '0'; wip.max = '99'; wip.placeholder = 'No limit'; wip.value = wip0 ? String(wip0) : '';
      f3.appendChild(wip);
      const box = document.createElement('div'); box.className = 'kb-dlg';
      box.append(f1, f2, f3);
      el.appendChild(box);
    },
    actions: [{ label: 'Cancel' }, { label: cur ? 'Save' : 'Add column', primary: true, run: () => { save(); } }],
  });
}

/* ---------- saved boards ---------- */
const BOARD_TEMPLATES = [
  { id: 'classic', name: 'To do, Doing, Done', icon: 'square-kanban', text: 'The classic. Drag across to start and finish.', def: { group: 'status' } },
  { id: 'pipeline', name: 'Writing pipeline', icon: 'pen-tool', text: 'Ideas, Writing, With someone, Done: columns of your own.',
    def: { group: 'custom', columns: [{ label: 'Ideas' }, { label: 'Writing', rule: { kind: 'status', value: 'doing' } }, { label: 'With someone' }, { label: 'Done', rule: { kind: 'status', value: 'done' } }] } },
  { id: 'sprint', name: 'Sprint', icon: 'rocket', text: 'Backlog, This week, In progress (max 3), Done.',
    def: { group: 'custom', columns: [{ label: 'Backlog' }, { label: 'This week', rule: { kind: 'due', value: 'week' } }, { label: 'In progress', rule: { kind: 'status', value: 'doing' }, wip: 3 }, { label: 'Done', rule: { kind: 'status', value: 'done' } }] } },
  { id: 'week', name: 'Plan the week', icon: 'calendar-range', text: 'A column per day range. Drop on Tomorrow to move it there.', def: { group: 'due' } },
  { id: 'streams', name: 'Streams at a glance', icon: 'layers', text: 'To do, Doing, Done with a row per stream.', def: { group: 'status', lanes: 'stream', colorBy: 'priority' } },
  { id: 'people', name: 'Waiting on people', icon: 'users', text: 'A column per person. Drop a task on someone to wait on them.', def: { group: 'person', personDrop: 'wait' } },
  { id: 'priority', name: 'By priority', icon: 'flag', text: 'High, Medium, Low, None: drag to re-prioritise.', def: { group: 'priority' } },
];
/** The New board dialog: a name, a template, and which tasks it shows. o.view: start with these tasks. */
function boardNewDialog(o) {
  o = o || {};
  let name = null, from = null, pick = BOARD_TEMPLATES[0].id;
  const create = () => {
    const tpl = BOARD_TEMPLATES.find(t => t.id === pick) || BOARD_TEMPLATES[0];
    const view = from ? from.value : 'all';
    const typed = name.value.trim().slice(0, 60);
    const b = boardCreate(Object.assign(JSON.parse(JSON.stringify(tpl.def)), {
      name: typed || (view === 'all' ? tpl.name : `${viewTitle(view)}: ${tpl.name}`).slice(0, 60),
      icon: tpl.icon, filter: { view, done: 'recent' },
    }));
    setView(BOARD_VIEW_PREFIX + b.id);
    toast(`Board “${b.name}” made. It is in the sidebar under Boards`, { kind: 'ok', icon: 'square-kanban', action: { label: 'Undo', run: () => undo() } });
  };
  openDialog({
    title: 'New board', size: 'md', resizeKey: 'board-new',
    body: (el, close) => {
      const box = document.createElement('div'); box.className = 'kb-dlg';
      const f1 = document.createElement('label'); f1.className = 'field';
      f1.innerHTML = '<span class="field-label">Name</span>';
      name = document.createElement('input'); name.className = 'control'; name.placeholder = 'e.g. Thesis board'; name.maxLength = 60; name.setAttribute('autofocus', '');
      name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); create(); close(); } };
      f1.appendChild(name);
      const f2 = document.createElement('div'); f2.className = 'field';
      f2.innerHTML = '<span class="field-label" id="kb-tpl-l">Start from</span>';
      const grid = document.createElement('div'); grid.className = 'kb-tpls'; grid.setAttribute('role', 'radiogroup'); grid.setAttribute('aria-labelledby', 'kb-tpl-l');
      for (const t of BOARD_TEMPLATES) {
        const lb = document.createElement('label'); lb.className = 'kb-tpl' + (t.id === pick ? ' on' : '');
        lb.innerHTML = `<input type="radio" name="kb-tpl" value="${escAttr(t.id)}"${t.id === pick ? ' checked' : ''}><span class="kb-tpl-ic">${icon(t.icon)}</span><span class="kb-tpl-t"><b>${esc(t.name)}</b><span>${esc(t.text)}</span></span>`;
        lb.querySelector('input').onchange = () => { pick = t.id; grid.querySelectorAll('.kb-tpl').forEach(n => n.classList.toggle('on', n === lb)); };
        lb.ondblclick = () => { pick = t.id; create(); close(); };
        grid.appendChild(lb);
      }
      f2.appendChild(grid);
      const f3 = document.createElement('label'); f3.className = 'field';
      f3.innerHTML = '<span class="field-label">Tasks from</span>';
      from = document.createElement('select'); from.className = 'control';
      const add = (parent, v, t) => { const op = document.createElement('option'); op.value = v; op.textContent = t; parent.appendChild(op); };
      for (const v of ['all', 'today', 'week', 'no-date']) add(from, v, viewTitle(v));
      const streams = Object.entries(STREAMS).filter(([, s]) => !s.archived).sort((x, y) => (x[1].order ?? 0) - (y[1].order ?? 0));
      if (streams.length) { const g = document.createElement('optgroup'); g.label = 'A stream'; for (const [k, s] of streams) add(g, 'stream:' + k, s.label || k); from.appendChild(g); }
      const tagN = new Map();
      for (const i of getAllItems()) if (statusOf(i.id) !== 'done') for (const t of effTags(i)) tagN.set(t, (tagN.get(t) || 0) + 1);
      const tags = [...tagN.keys()].sort((x, y) => tagN.get(y) - tagN.get(x)).slice(0, 15);
      if (tags.length) { const g = document.createElement('optgroup'); g.label = 'A tag'; for (const t of tags) add(g, 'tag:' + t, '#' + t); from.appendChild(g); }
      const ppl = (state.people || []).filter(p => p && !p.self).sort((x, y) => String(x.name || '').localeCompare(String(y.name || '')));
      if (ppl.length) { const g = document.createElement('optgroup'); g.label = 'A person'; for (const p of ppl) add(g, 'person:' + p.id, p.name || p.id); from.appendChild(g); }
      from.value = o.view && [...from.options].some(op => op.value === o.view) ? o.view : 'all';
      f3.appendChild(from);
      box.append(f1, f2, f3);
      el.appendChild(box);
    },
    actions: [{ label: 'Cancel' }, { label: 'Create board', primary: true, icon: 'square-kanban', run: () => { create(); } }],
  });
}
/** A task view's board, kept as a saved board (its columns, rows, cards and card order). */
function boardSaveFromView(L) {
  const def = JSON.parse(JSON.stringify(L.board));
  for (const k of ['id', 'forView', 'createdAt', 'updatedAt']) delete def[k];
  def.name = (viewTitle(L.view) + ' board').slice(0, 60);
  def.filter = { view: L.view, done: 'recent' };
  if (def.colorBy === 'none') def.colorBy = 'stream';
  const nb = boardCreate(def, { orderFrom: L.board.id });
  setView(BOARD_VIEW_PREFIX + nb.id);
  toast(`Saved as “${nb.name}”. It is in the sidebar under Boards`, { kind: 'ok', icon: 'square-kanban', action: { label: 'Rename', run: () => _bdRename(nb.id) } });
}
/** A saved board's page. */
function renderSavedBoard(container, id) {
  const b = boardById(id);
  const sub = document.getElementById('view-subtitle');
  if (!b) {
    mountEmptyState(container, { icon: 'square-kanban', title: 'This board is gone', text: 'It was deleted here or on another computer; its tasks are still in your lists.',
      actions: [{ label: 'Go to All tasks', icon: 'list', primary: true, run: () => setView('all') }, { label: 'New board', icon: 'plus', run: () => boardNewDialog() }] });
    return;
  }
  const def = _bdNormalize(b);
  const view = def.filter.view || 'all';
  const all = getAllItems(), today = todayStr();
  let open = all.filter(i => matchesView(i, view));
  let closed = def.filter.done === 'hide' ? [] : all.filter(i => recentlyClosedInView(i, view, today));
  open = sortItems(open, sortForView(view), view);
  closed = sortItems(closed, 'completed', view);
  if (sub) sub.textContent = `${open.length} open · ${_bdFilterLabel(def)}`;
  renderBoardInto(container, b, { open, closed, view, perView: false });
  if (!open.length && !closed.length) {
    const hint = document.createElement('p'); hint.className = 'muted kb-hint';
    hint.textContent = 'No tasks here yet. Add one in a column, or change Showing to pick other tasks.';
    container.appendChild(hint);
  }
}
registerSection('taskboard', {
  match: v => typeof v === 'string' && v.startsWith(BOARD_VIEW_PREFIX),
  title: v => { const b = boardById(String(v).slice(BOARD_VIEW_PREFIX.length)); return b ? (b.name || 'Board') : 'Board'; },
  group: 'tasks', taskControls: false, hashable: true,
  mount(container, view) { renderSavedBoard(container, String(view).slice(BOARD_VIEW_PREFIX.length)); },
});
/** The sidebar's Boards block (hooked in from 15-nav-sidebar.js). */
function boardsSidebarBlock(el, ctx) {
  const list = boardSavedList();
  el.appendChild(sbSection({ title: 'Boards', collapsible: 'taskBoards', actions: [{ icon: 'plus', label: 'New board', run: () => boardNewDialog() }] }));
  if (sbIsCollapsed('taskBoards')) return;
  if (!list.length) {
    el.appendChild(sbNavItem({ label: 'New board', icon: 'square-kanban', className: 'nav-more', active: false, title: 'Columns your way: by status, priority, person, due date or your own', onClick: () => boardNewDialog() }));
    return;
  }
  const open = (ctx && ctx.counts && ctx.counts.open) || getAllItems().filter(i => statusOf(i.id) !== 'done');
  for (const b of list) {
    const v = (b.filter && b.filter.view) || 'all';
    let n = 0;
    for (const i of open) if (matchesView(i, v)) n++;
    el.appendChild(sbNavItem({ label: b.name || 'Board', icon: BOARD_ICONS.includes(b.icon) ? b.icon : 'square-kanban', view: BOARD_VIEW_PREFIX + b.id, count: n || '' }));
  }
}

/* ---------- keys ---------- */
function _bdCursorTo(id) {
  _lastSelectedTaskId = id;
  document.querySelectorAll('#main-body .kb-cursor').forEach(n => n.classList.remove('kb-cursor'));
  const el = document.querySelector(`#main-body .kanban-card[data-id="${CSS.escape(id)}"]`);
  if (el) { el.classList.add('kb-cursor'); el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: (window.Motion && Motion.prefersReduced()) ? 'auto' : 'smooth' }); }
}
function _bdCursorStep(L, id, dir) {
  const b = L.board, cols = L.cols.filter(c => !_bdColSet(b, c.key).folded);
  if (!cols.length) return;
  if (!id) { for (const c of cols) { const a = _bdVisibleIn(L, c); if (a.length) { _bdCursorTo(a[0].id); return; } } return; }
  const ci = cols.findIndex(c => c.key === L.colOf.get(id));
  if (ci < 0) return;
  const lane = L.lanes ? L.laneOf.get(id) : undefined;
  const row = _bdVisibleIn(L, cols[ci], lane).findIndex(i => i.id === id);
  for (let j = ci + dir; j >= 0 && j < cols.length; j += dir) {
    const a = _bdVisibleIn(L, cols[j], lane);
    if (a.length) { _bdCursorTo(a[Math.min(Math.max(row, 0), a.length - 1)].id); return; }
  }
}
/** "Move to…": a column (or a row) for the card under the cursor, or for the selection it is in. */
function boardMoveMenu(L, id, anchor) {
  const ids = multiSelect.ids.has(id) ? [...multiSelect.ids].filter(x => L.colOf.has(x)) : [id];
  const items = [{ heading: ids.length > 1 ? `Move ${ids.length} tasks to` : 'Move to column' }];
  for (const c of L.cols) if (_bdColTakesDrops(L, c)) items.push({ label: c.label, icon: c.icon || 'columns-3', checked: L.colOf.get(id) === c.key, run: () => boardDropIds(L, ids, c.key, L.lanes ? L.laneOf.get(id) : null, null) });
  if (L.lanes) {
    items.push('sep', { heading: 'Move to row' });
    for (const l of L.lanes) items.push({ label: l.label, icon: 'table-2', checked: L.laneOf.get(id) === l.key, run: () => _bdDropOnLane(L, ids, l) });
  }
  openMenu(anchor, items, { width: 240 });
}
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;
  const L = _bdCurrent;
  const wrap = document.querySelector('#main-body .kanban[data-board]');
  if (!L || !wrap || wrap.dataset.board !== L.board.id) return;
  const t = e.target;
  if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return;
  if ([...document.querySelectorAll('.cmd, .modal, .drawer, .pop')].some(n => n.getClientRects().length > 0)) return;
  const k = e.key;
  const lr = k === 'ArrowLeft' || k === 'ArrowRight', ud = k === 'ArrowUp' || k === 'ArrowDown';
  const isM = (k === 'm' || k === 'M') && !e.altKey && !e.shiftKey;
  if (!(lr && !e.shiftKey) && !(ud && e.altKey) && !isM) return;
  const id = _lastSelectedTaskId && L.colOf.has(_lastSelectedTaskId) && document.querySelector(`#main-body .kanban-card[data-id="${CSS.escape(_lastSelectedTaskId)}"]`) ? _lastSelectedTaskId : null;
  if (isM) {
    if (!id) return;
    e.preventDefault(); e.stopPropagation();
    boardMoveMenu(L, id, document.querySelector(`#main-body .kanban-card[data-id="${CSS.escape(id)}"]`));
    return;
  }
  if (!e.altKey) { e.preventDefault(); e.stopPropagation(); _bdCursorStep(L, id, k === 'ArrowRight' ? 1 : -1); return; }
  if (!id) return;
  e.preventDefault(); e.stopPropagation();
  const colKey = L.colOf.get(id);
  const lane = L.lanes ? L.laneOf.get(id) : undefined;
  if (lr) {
    const ci = L.cols.findIndex(c => c.key === colKey);
    let next = null;
    for (let j = ci + (k === 'ArrowRight' ? 1 : -1); j >= 0 && j < L.cols.length; j += (k === 'ArrowRight' ? 1 : -1)) if (_bdColTakesDrops(L, L.cols[j])) { next = L.cols[j]; break; }
    if (!next) return;
    const ids = multiSelect.ids.has(id) ? [...multiSelect.ids].filter(x => L.colOf.has(x)) : [id];
    boardDropIds(L, ids, next.key, lane == null ? null : lane, null);
  } else {
    const col = L.cols.find(c => c.key === colKey); if (!col) return;
    const arr = _bdVisibleIn(L, col, lane).map(i => i.id), i = arr.indexOf(id);
    if (k === 'ArrowUp') { if (i <= 0) return; boardDropIds(L, [id], colKey, lane == null ? null : lane, arr[i - 1], { positional: true }); }
    else { if (i < 0 || i >= arr.length - 1) return; boardDropIds(L, [id], colKey, lane == null ? null : lane, arr[i + 2] || null, { positional: true }); }
  }
  setTimeout(() => { if (getItem(id)) _bdCursorTo(id); }, 0);
}, true);

/* ---------- command palette: New board, and every saved board under Go to ---------- */
if (typeof registerCommand === 'function') registerCommand({ id: 'new-board', label: 'New board…', icon: 'square-kanban', keywords: 'kanban columns swimlanes rows sprint pipeline', run: () => boardNewDialog() });
if (typeof registerPaletteSource === 'function') registerPaletteSource((add, mode) => {
  if (mode && mode !== 'go') return;
  for (const b of boardSavedList()) add({ group: 'Go to', icon: BOARD_ICONS.includes(b.icon) ? b.icon : 'square-kanban', label: b.name || 'Board', keywords: 'board kanban', hint: 'Board', run: () => setView(BOARD_VIEW_PREFIX + b.id) });
});
