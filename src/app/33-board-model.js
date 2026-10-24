/* ============================================================
   BOARD MODEL (owner: Boards, 2.16). What a board shows and what a drop does.

   Two kinds of board, one definition (state.taskBoards, synced, items by id):
     - the Board mode of a task view: {id: 'vb-<view>', forView: '<view>'}, made the
       first time its columns, rows or cards are changed (until then the defaults);
     - SAVED boards (sidebar > Boards, view 'taskboard:<id>'): {name, icon, order,
       filter: {view, done}} plus the same layout fields.
   Layout fields: group (status | priority | stream | tag | person | due | custom),
   columns (custom only: [{id, label, rule}], rule = {kind, value} = what a drop does
   and which tasks gather there), col {<colKey>: {wip, folded, hidden}}, colOrder
   [colKey] (derived columns moved, and tag/person columns added by hand), lanes
   (none | status | priority | stream | tag | person | due), laneFold {<laneKey>: true},
   fields [card fields], colorBy (stream | priority | none), personDrop (link | wait).

   Card order (state.boardOrder, synced, one whole list per column):
   {'<boardId>|<colKey>': [taskId...]}. A column without a list keeps the view's
   sort (pinned first). In a custom column without a rule the list is also who is in it.
   The retired brainstorm boards used the keys 'boards' and views 'board:' (lib/state-keys.mjs
   drops them): never reuse those names.
   ============================================================ */
const BOARD_VIEW_PREFIX = 'taskboard:';
const BOARD_GROUPS = [
  ['status', 'Status', 'circle-dot'], ['priority', 'Priority', 'flag'], ['stream', 'Stream', 'layers'],
  ['tag', 'Tag', 'hash'], ['person', 'Person', 'users'], ['due', 'Due date', 'calendar'], ['custom', 'My own columns', 'columns-3'],
];
const BOARD_LANES = [['none', 'No rows'], ['stream', 'Stream'], ['priority', 'Priority'], ['person', 'Person'], ['tag', 'Tag'], ['status', 'Status'], ['due', 'Due date']];
const BOARD_FIELDS = [
  ['stream', 'Stream', 'layers'], ['priority', 'Priority flag', 'flag'], ['due', 'Due date', 'calendar'],
  ['subtasks', 'Checklist progress', 'list-checks'], ['people', 'People', 'users'], ['tags', 'Tags', 'hash'],
  ['estimate', 'Estimate', 'timer'], ['notes', 'Notes count', 'message-square'], ['age', 'Quiet for a while', 'hourglass'],
];
// Calm cards (UI_CLEANUP_PLAN.md 2.2): stream, priority and due; saved boards keep their own fields (_bdEnsure only fills a missing list).
const BOARD_DEFAULT_FIELDS = ['stream', 'priority', 'due'];
const BOARD_COLOR_BY = [['stream', 'Stream colour'], ['priority', 'Priority colour'], ['none', 'No colour']];
const BOARD_STATUS_COLS = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];
const BOARD_PRIO_COLS = [['p1', 'High'], ['p2', 'Medium'], ['p3', 'Low'], ['p0', 'No priority']];
const BOARD_DUE_COLS = [
  ['overdue', 'Overdue', 'triangle-alert'], ['today', 'Today', 'sun'], ['tomorrow', 'Tomorrow', 'sunrise'],
  ['week', 'This week', 'calendar-range'], ['next', 'Next week', 'calendar-days'], ['later', 'Later', 'calendar-clock'], ['none', 'No date', 'circle-dashed'],
];
const BOARD_ICONS = ['square-kanban', 'kanban', 'columns-3', 'rocket', 'graduation-cap', 'briefcase', 'book-open', 'pen-tool', 'flask-conical', 'target', 'lightbulb', 'users', 'calendar-range', 'flame', 'star', 'heart', 'house', 'plane'];

/* ---------- the definitions ---------- */
function _bdAll() { return Array.isArray(state.taskBoards) ? state.taskBoards.filter(b => b && typeof b === 'object' && b.id) : []; }
function boardById(id) { return _bdAll().find(b => b.id === id) || null; }
/** Saved boards in their sidebar order. */
function boardSavedList() { return _bdAll().filter(b => !b.forView).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name || '').localeCompare(String(b.name || ''))); }
function _bdNewId(p) { return (p || 'bd') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }
function _bdViewKey(view) { return typeof _prefKey === 'function' ? _prefKey(view) : (String(view || '').startsWith('day:') ? 'day' : String(view || '')); }
/** Fill in what a definition leaves out (in place; returns it). */
function _bdEnsure(b) {
  if (!BOARD_GROUPS.some(g => g[0] === b.group)) b.group = 'status';
  if (!BOARD_LANES.some(l => l[0] === b.lanes)) b.lanes = 'none';
  if (!Array.isArray(b.fields)) b.fields = BOARD_DEFAULT_FIELDS.slice();
  if (!BOARD_COLOR_BY.some(c => c[0] === b.colorBy)) b.colorBy = b.forView ? 'none' : 'stream';
  if (!b.col || typeof b.col !== 'object' || Array.isArray(b.col)) b.col = {};
  if (!Array.isArray(b.colOrder)) b.colOrder = [];
  if (!Array.isArray(b.columns)) b.columns = [];
  b.columns = b.columns.filter(c => c && c.id);
  if (!b.laneFold || typeof b.laneFold !== 'object' || Array.isArray(b.laneFold)) b.laneFold = {};
  if (b.personDrop !== 'link') b.personDrop = 'wait';
  if (!b.forView && (!b.filter || typeof b.filter !== 'object')) b.filter = { view: 'all' };
  return b;
}
/** A copy with every field filled in (rendering never writes into the stored one). */
function _bdNormalize(b) { return _bdEnsure(JSON.parse(JSON.stringify(b || {}))); }
/** The board of a task view's Board mode (its defaults until it is first changed). */
function boardForView(view) {
  const key = _bdViewKey(view);
  return _bdAll().find(b => b.forView === key) || { id: 'vb-' + key, forView: key };
}
function _bdColSet(board, key) { const s = board && board.col && board.col[key]; return s && typeof s === 'object' ? s : {}; }
function _bdIsDoneRule(r) { return !!r && r.kind === 'status' && r.value === 'done'; }

/**
 * Change a board: fn(stored definition) mutates it; one undo step, then a render.
 * msg: the toast (with Undo). A view's board is stored the first time it changes.
 */
function boardUpdate(board, fn, msg, o) {
  if (!Array.isArray(state.taskBoards)) state.taskBoards = [];
  let cur = state.taskBoards.find(b => b && b.id === board.id);
  if (!cur) { cur = JSON.parse(JSON.stringify(board)); state.taskBoards.push(cur); }
  _bdEnsure(cur);
  fn(cur);
  cur.updatedAt = Date.now();
  saveData(); render();
  if (msg) toast(msg, { icon: (o && o.icon) || 'square-kanban', action: { label: 'Undo', run: () => undo() } });
  return cur;
}
/** Make a saved board from a (partial) definition; one undo step. o.orderFrom: copy that board's card order. */
function boardCreate(def, o) {
  if (!Array.isArray(state.taskBoards)) state.taskBoards = [];
  const src = JSON.parse(JSON.stringify(def || {}));
  const now = Date.now();
  const order = boardSavedList().reduce((m, b) => Math.max(m, (b.order ?? 0) + 1), 0);
  const b = Object.assign({ name: 'New board', icon: 'square-kanban', filter: { view: 'all' }, group: 'status', lanes: 'none',
    fields: BOARD_DEFAULT_FIELDS.slice(), colorBy: 'stream', col: {}, colOrder: [], columns: [], laneFold: {}, personDrop: 'wait' }, src,
  { id: _bdNewId('bd'), order, createdAt: now, updatedAt: now });
  delete b.forView;
  b.col = Object.assign({}, b.col || {});
  b.columns = (b.columns || []).map(c => {
    const col = { id: c.id || _bdNewId('col'), label: String(c.label || 'Column').slice(0, 60) };
    if (c.rule) col.rule = { kind: c.rule.kind, value: c.rule.value };
    if (c.wip) b.col[col.id] = Object.assign({}, b.col[col.id] || {}, { wip: c.wip });
    return col;
  });
  _bdEnsure(b);
  state.taskBoards.push(b);
  const from = o && o.orderFrom;
  if (from && state.boardOrder && typeof state.boardOrder === 'object') {
    for (const k of Object.keys(state.boardOrder)) if (k.startsWith(from + '|') && Array.isArray(state.boardOrder[k])) state.boardOrder[b.id + k.slice(from.length)] = state.boardOrder[k].slice();
  }
  saveData();
  return b;
}
/** Remove a saved board and its card order (Undo in the toast). */
function boardDelete(id) {
  const b = boardById(id); if (!b) return;
  state.taskBoards = state.taskBoards.filter(x => !(x && x.id === id));
  if (state.boardOrder && typeof state.boardOrder === 'object') for (const k of Object.keys(state.boardOrder)) if (k.startsWith(id + '|')) delete state.boardOrder[k];
  if (state.view === BOARD_VIEW_PREFIX + id) { state.view = 'all'; saveUI(); }
  saveData(); render();
  toast(`Board “${b.name || 'Board'}” deleted`, { icon: 'trash-2', action: { label: 'Undo', run: () => undo() } });
}

/* ---------- dates ---------- */
function _bdWeek() {
  const t = todayStr();
  const ws = typeof _tWeekStart === 'function' ? _tWeekStart() : 1;
  const back = (new Date(t + 'T00:00:00').getDay() - ws + 7) % 7;   // clock-ok: wall date
  const start = _isoPlus(-back, t);
  return { today: t, tomorrow: _isoPlus(1, t), start, end: _isoPlus(6, start), nextStart: _isoPlus(7, start), nextEnd: _isoPlus(13, start) };
}
function _bdIsWorkday(iso) { const g = new Date(iso + 'T00:00:00').getDay(); return g >= 1 && g <= 5; }   // clock-ok: wall date
function _bdDueBucket(due, w) {
  if (!due) return 'none';
  if (due < w.today) return 'overdue';
  if (due === w.today) return 'today';
  if (due === w.tomorrow) return 'tomorrow';
  if (due <= w.end) return 'week';
  if (due <= w.nextEnd) return 'next';
  return 'later';
}
/** A custom column's due rule: 'This week' holds everything due by the end of the week. */
function _bdDueRuleMatch(v, due, w) {
  if (v === 'none') return !due;
  if (!due) return false;
  if (v === 'overdue') return due < w.today;
  if (v === 'today') return due <= w.today;
  if (v === 'tomorrow') return due === w.tomorrow;
  if (v === 'week') return due <= w.end;
  if (v === 'next') return due >= w.nextStart && due <= w.nextEnd;
  if (v === 'later') return due > w.nextEnd;
  return false;
}
/** The date a drop on a due column gives (null clears it, undefined: not a drop target). */
function _bdDueTarget(key, item, w) {
  const cur = (item && item.dueDate) || null;
  if (key === 'today') return w.today;
  if (key === 'tomorrow') return w.tomorrow;
  if (key === 'none') return null;
  if (key === 'week') {   // the last working day of this week (after tomorrow)
    for (let d = w.end; d > w.tomorrow; d = _isoPlus(-1, d)) if (_bdIsWorkday(d)) return d;
    return w.end > w.tomorrow ? w.end : _isoPlus(2, w.today);
  }
  if (key === 'next') { for (let d = w.nextStart; d <= w.nextEnd; d = _isoPlus(1, d)) if (_bdIsWorkday(d)) return d; return w.nextStart; }
  if (key === 'later') {
    if (cur && cur > w.nextEnd) return cur;
    let d = _isoPlus(1, w.nextEnd);
    for (let i = 0; i < 7 && !_bdIsWorkday(d); i++) d = _isoPlus(1, d);
    return d;
  }
  return undefined;
}

/* ---------- which column / row a task is in ---------- */
function _bdStatusKey(it) { const s = statusOf(it.id); return s === 'done' ? 'done' : s === 'doing' ? 'doing' : 'todo'; }
function _bdPrioKey(it) { const p = effPriority(it); return p === 'p1' || p === 'p2' || p === 'p3' ? p : 'p0'; }
function _bdPeopleOf(it) {
  const ids = typeof effPeople === 'function' ? effPeople(it) : (Array.isArray(it.people) ? it.people : []);
  return ids.filter(id => { const p = getPerson(id); return !(p && p.self); });
}
/** The first of keys in board order (idx: key -> position), else the first key. */
function _bdFirstIn(keys, idx) {
  if (!idx) return keys[0];
  let best = null, bi = Infinity;
  for (const k of keys) { const i = idx.get(k); if (i !== undefined && i < bi) { bi = i; best = k; } }
  return best != null ? best : keys[0];
}
function _bdKeyOf(kind, it, idx, w) {
  if (kind === 'status') return _bdStatusKey(it);
  if (kind === 'priority') return _bdPrioKey(it);
  if (kind === 'stream') return effStream(it) || '_none';
  if (kind === 'due') return _bdDueBucket(effDate(it), w);
  if (kind === 'tag') { const t = effTags(it); return t.length ? _bdFirstIn(t, idx) : '_none'; }
  if (kind === 'person') {
    const ppl = _bdPeopleOf(it);
    if (it.waitingOn && getPerson(it.waitingOn) && (!idx || idx.has(it.waitingOn))) return it.waitingOn;
    return ppl.length ? _bdFirstIn(ppl, idx) : '_none';
  }
  return '_none';
}
function _bdRuleMatch(r, it, w) {
  if (!r) return false;
  if (r.kind === 'status') return _bdStatusKey(it) === r.value;
  if (r.kind === 'priority') return _bdPrioKey(it) === r.value;
  if (r.kind === 'stream') return effStream(it) === r.value;
  if (r.kind === 'tag') return effTags(it).includes(r.value);
  if (r.kind === 'person') return it.waitingOn === r.value || _bdPeopleOf(it).includes(r.value);
  if (r.kind === 'due') return _bdDueRuleMatch(r.value, effDate(it), w);
  return false;
}
/** Custom columns: done tasks to the Done column; then where you put it; then the first rule it meets (status rules first); then the first plain column. */
function _bdCustomKey(board, it, manual, w) {
  const cols = board.columns;
  if (statusOf(it.id) === 'done') { const c = cols.find(c => _bdIsDoneRule(c.rule)); return c ? c.id : null; }
  for (const c of cols) if (!c.rule && manual.get(c.id) && manual.get(c.id).has(it.id)) return c.id;
  // Status rules first (In progress beats This week), then the others in column order.
  for (const c of cols) if (c.rule && c.rule.kind === 'status' && !_bdIsDoneRule(c.rule) && _bdRuleMatch(c.rule, it, w)) return c.id;
  for (const c of cols) if (c.rule && c.rule.kind !== 'status' && _bdRuleMatch(c.rule, it, w)) return c.id;
  const m = cols.find(c => !c.rule) || cols.find(c => !_bdIsDoneRule(c.rule));
  return m ? m.id : null;
}
function _bdPersonMark(p) { return p ? (typeof avatarHtmlInitials === 'function' ? avatarHtmlInitials(p, 18) : avatarHtml(p, 18)) : ''; }
/** The columns (or rows) a kind makes from these tasks: [{key, label, dot?, mark?, icon?}]. */
function _bdKindValues(kind, items, board, lane) {
  const has = (k) => items.some(it => _bdKeyOf(kind, it, null, board._w) === k);
  if (kind === 'status') return BOARD_STATUS_COLS.map(([k, l]) => ({ key: k, label: k === 'done' && board.forView === 'today' ? 'Done today' : l, dot: k === 'doing' ? 'var(--warning)' : k === 'done' ? 'var(--success)' : 'var(--fg-disabled)' }))
    .filter(c => !lane || has(c.key));
  if (kind === 'priority') return BOARD_PRIO_COLS.map(([k, l]) => ({ key: k, label: l, dot: PRIORITIES[k] ? PRIORITIES[k].color : '', icon: k === 'p0' ? '' : 'flag' })).filter(c => !lane || has(c.key));
  if (kind === 'due') return BOARD_DUE_COLS.map(([k, l, ic]) => ({ key: k, label: l, icon: ic, dot: k === 'overdue' ? 'var(--danger)' : '' })).filter(c => (k => (lane || k === 'overdue') ? has(k) : true)(c.key));
  const count = new Map();
  if (kind === 'stream') {
    for (const it of items) { const s = effStream(it) || '_none'; count.set(s, (count.get(s) || 0) + 1); }
    const out = Object.entries(STREAMS).filter(([k, s]) => (lane ? count.has(k) : (!s.archived || count.has(k)))).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0))
      .map(([k, s]) => ({ key: k, label: s.label || k, mark: streamMarkHtml(k), dot: safeColor(s.color, '#868a94') }));
    for (const k of count.keys()) if (k !== '_none' && !STREAMS[k]) out.push({ key: k, label: k });
    if (count.has('_none')) out.push({ key: '_none', label: 'No stream' });
    return out;
  }
  if (kind === 'tag' || kind === 'person') {
    for (const it of items) for (const k of (kind === 'tag' ? effTags(it) : _bdPeopleOf(it))) count.set(k, (count.get(k) || 0) + 1);
    let keys = [...count.keys()];
    if (!lane) for (const k of board.colOrder || []) if (!keys.includes(k) && k !== '_none' && (kind === 'tag' || getPerson(k))) keys.push(k);   // added by hand
    keys.sort((a, b) => (count.get(b) || 0) - (count.get(a) || 0) || String(a).localeCompare(String(b)));
    const out = keys.map(k => {
      if (kind === 'tag') return { key: k, label: '#' + k };
      const p = getPerson(k);
      return { key: k, label: p ? p.name : k, mark: _bdPersonMark(p) };
    });
    const none = items.some(it => (kind === 'tag' ? effTags(it) : _bdPeopleOf(it)).length === 0);
    if (!lane || none) out.push({ key: '_none', label: kind === 'tag' ? 'No tag' : 'No one' });
    return out;
  }
  return [];
}
function _bdCustomCols(board) {
  return board.columns.map(c => {
    const r = c.rule;
    const dot = !r ? 'var(--accent)' : _bdIsDoneRule(r) ? 'var(--success)' : r.kind === 'status' && r.value === 'doing' ? 'var(--warning)'
      : r.kind === 'priority' && PRIORITIES[r.value] ? PRIORITIES[r.value].color : r.kind === 'stream' && STREAMS[r.value] ? safeColor(STREAMS[r.value].color, '#868a94') : 'var(--fg-disabled)';
    return { key: c.id, label: c.label || 'Column', rule: r || null, custom: true, dot };
  });
}
/** Derived columns in the board's own order (colOrder first). */
function _bdOrdered(cols, order) {
  if (!order || !order.length) return cols;
  const pos = new Map(order.map((k, i) => [k, i]));
  return cols.map((c, i) => ({ c, i })).sort((a, b) => (pos.has(a.c.key) ? pos.get(a.c.key) : 1e6 + a.i) - (pos.has(b.c.key) ? pos.get(b.c.key) : 1e6 + b.i)).map(x => x.c);
}

/* ---------- card order ---------- */
function _bdOrderKey(boardId, colKey) { return boardId + '|' + colKey; }
function _bdOrderList(boardId, colKey) {
  const o = state.boardOrder;
  const l = o && typeof o === 'object' ? o[_bdOrderKey(boardId, colKey)] : null;
  return Array.isArray(l) ? l : [];
}
/** Pinned ones new to the list lead, then the list's order, then the rest in the view's sort. */
function _bdSortCol(board, key, arr) {
  const list = _bdOrderList(board.id, key);
  if (!list.length) return arr.filter(i => isPinned(i.id)).concat(arr.filter(i => !isPinned(i.id)));
  const pos = new Map(list.map((id, i) => [id, i]));
  const pinnedNew = [], listed = [], rest = [];
  for (const it of arr) { if (pos.has(it.id)) listed.push(it); else if (isPinned(it.id)) pinnedNew.push(it); else rest.push(it); }
  listed.sort((a, b) => pos.get(a.id) - pos.get(b.id));
  return pinnedNew.concat(listed, rest);
}

/**
 * Everything a render needs: the columns (visible and hidden), the tasks per column in
 * order, which column and row each task is in, and the rows.
 */
function boardLayout(board, open, closed) {
  board = _bdNormalize(board);
  const w = _bdWeek();
  Object.defineProperty(board, '_w', { value: w, enumerable: false });
  const group = board.group;
  const doneCol = group === 'status' || (group === 'custom' && board.columns.some(c => _bdIsDoneRule(c.rule)));
  const items = doneCol ? open.concat(closed) : open.slice();
  let all = group === 'custom' ? _bdCustomCols(board) : _bdOrdered(_bdKindValues(group, items, board, false), board.colOrder);
  const hidden = all.filter(c => _bdColSet(board, c.key).hidden);
  const cols = all.filter(c => !_bdColSet(board, c.key).hidden);
  const colIndex = new Map(cols.map((c, i) => [c.key, i]));
  const manual = new Map();
  if (group === 'custom') for (const c of board.columns) if (!c.rule) manual.set(c.id, new Set(_bdOrderList(board.id, c.id)));
  const colOf = new Map(), byCol = new Map(all.map(c => [c.key, []]));
  for (const it of items) {
    const k = group === 'custom' ? _bdCustomKey(board, it, manual, w) : _bdKeyOf(group, it, colIndex, w);
    if (k == null) continue;
    colOf.set(it.id, k);
    if (byCol.has(k)) byCol.get(k).push(it);
  }
  for (const [k, arr] of byCol) byCol.set(k, _bdSortCol(board, k, arr));
  let lanes = null;
  const laneOf = new Map();
  if (board.lanes !== 'none' && board.lanes !== group) {
    const shown = [];
    for (const c of cols) shown.push(...byCol.get(c.key));
    lanes = _bdKindValues(board.lanes, shown, board, true);
    const li = new Map(lanes.map((l, i) => [l.key, i]));
    for (const it of shown) laneOf.set(it.id, _bdKeyOf(board.lanes, it, li, w));
    if (!lanes.length) lanes = null;
  }
  return { board, cols, hidden, all, colIndex, byCol, colOf, lanes, laneOf, w, count: items.length };
}
/** Is a drop here a completion? */
function _bdColIsDone(L, col) { return L.board.group === 'status' ? col.key === 'done' : !!(col.rule && _bdIsDoneRule(col.rule)); }
/** Can a task be dropped here (Overdue gathers late tasks; nothing sets a date in the past)? */
function _bdColTakesDrops(L, col) {
  if (L.board.group === 'due') return col.key !== 'overdue';
  return !(col.rule && col.rule.kind === 'due' && col.rule.value === 'overdue');
}

/* ---------- what a drop does (mutates; the caller saves once) ---------- */
function _bdPersonName(id) { const p = getPerson(id); return p ? p.name : 'them'; }
/** Apply one kind's value to a task. from: the key it is leaving (tag / person columns swap). Returns a phrase or null. */
function _bdApply(kind, id, to, from, board, o) {
  const it = getItem(id); if (!it) return null;
  o = o || {};
  if (kind === 'status') {
    const cur = statusOf(id);
    if (cur === to || (to === 'todo' && cur !== 'done' && cur !== 'doing')) return null;
    setStatus(id, to, { noSave: true });
    return to === 'done' ? 'completed' : to === 'doing' ? 'started' : cur === 'done' ? 'reopened' : 'back to To do';
  }
  if (kind === 'priority') {
    const cur = effPriority(it);
    if (cur === to) return null;
    logActivity(id, 'priority', { from: cur || null, to });
    it.priority = to;
    return to === 'p0' ? 'priority cleared' : 'priority ' + (BOARD_PRIO_COLS.find(p => p[0] === to) || [0, to])[1];
  }
  if (kind === 'stream') {
    if (to === '_none' || !STREAMS[to] || effStream(it) === to) return null;
    logActivity(id, 'stream', { from: it.stream || null, to });
    it.stream = to;
    return 'moved to ' + (STREAMS[to].label || to);
  }
  if (kind === 'tag') {
    const tags = effTags(it).slice();
    let next;
    if (to === '_none') { if (!tags.length || o.rule) return null; next = []; }
    else {
      next = tags.filter(t => !(from && from !== '_none' && from !== to && t === from && !o.rule));
      if (!next.includes(to)) next.push(to);
    }
    const added = next.filter(t => !tags.includes(t)), removed = tags.filter(t => !next.includes(t));
    if (!added.length && !removed.length) return null;
    logActivity(id, 'tags', { added, removed });
    it.tags = next;
    return to === '_none' ? 'tags cleared' : 'tagged #' + to;
  }
  if (kind === 'person') {
    const ppl = Array.isArray(it.people) ? it.people.slice() : [];
    if (to === '_none') {
      if (!from || from === '_none') return null;
      const excl = Array.isArray(it.peopleExcluded) ? it.peopleExcluded : [];
      if (!excl.includes(from)) it.peopleExcluded = [...excl, from];
      it.people = ppl.filter(x => x !== from);
      if (it.waitingOn === from) { delete it.waitingOn; delete it.waiting; }
      logActivity(id, 'people', { added: [], removed: [from] });
      return 'unlinked from ' + _bdPersonName(from);
    }
    if (!getPerson(to)) return null;
    let changed = false;
    if (Array.isArray(it.peopleExcluded) && it.peopleExcluded.includes(to)) { it.peopleExcluded = it.peopleExcluded.filter(x => x !== to); if (!it.peopleExcluded.length) delete it.peopleExcluded; changed = true; }
    if (!ppl.includes(to) && !_bdPeopleOf(it).includes(to)) { it.people = [...ppl, to]; logActivity(id, 'people', { added: [to], removed: [] }); changed = true; }
    if (board.personDrop === 'wait' && it.waitingOn !== to) { it.waiting = true; it.waitingOn = to; return 'waiting on ' + _bdPersonName(to); }
    return changed ? 'linked to ' + _bdPersonName(to) : null;
  }
  if (kind === 'due') {
    const w = board._w || _bdWeek();
    const cur = effDate(it);
    if (o.rule && _bdDueRuleMatch(to, cur, w)) return null;
    const d = _bdDueTarget(to, it, w);
    if (d === undefined || d === cur) return null;
    logActivity(id, 'date', { from: cur || null, to: d, reason: 'board' });
    it.dueDate = d;
    if (!d) delete it.dueTime;
    return d ? 'due ' + (typeof dueLabel === 'function' ? dueLabel(d) : d) : 'date cleared';
  }
  return null;
}
/** A drop on a column: its group's value, or a custom column's rule (a plain custom column only places it; a done task reopens). */
function _bdApplyCol(L, col, id, fromKey) {
  const b = L.board;
  if (b.group !== 'custom') return _bdApply(b.group, id, col.key, fromKey, b);
  if (statusOf(id) === 'done' && !_bdIsDoneRule(col.rule)) {
    setStatus(id, 'todo', { noSave: true });
    const p = col.rule ? _bdApply(col.rule.kind, id, col.rule.value, null, b, { rule: true }) : null;
    return p ? 'reopened · ' + p : 'reopened';
  }
  return col.rule ? _bdApply(col.rule.kind, id, col.rule.value, null, b, { rule: true }) : null;
}
/** What a new task added in a column (and row) starts with. */
function _bdDefaultsFor(kind, key, board) {
  if (key == null || key === '_none') return {};
  if (kind === 'status') return key === 'done' ? {} : { status: key };
  if (kind === 'priority') return { priority: key };
  if (kind === 'stream') return STREAMS[key] ? { stream: key } : {};
  if (kind === 'tag') return { tags: [key] };
  if (kind === 'person') return getPerson(key) ? { people: [key] } : {};
  if (kind === 'due') { const d = _bdDueTarget(key, null, board._w || _bdWeek()); return d ? { dueDate: d } : {}; }
  return {};
}
function _bdMergeDefaults(a, b) {
  const out = Object.assign({}, a, b);
  if (a.tags || b.tags) out.tags = [...new Set([...(a.tags || []), ...(b.tags || [])])];
  if (a.people || b.people) out.people = [...new Set([...(a.people || []), ...(b.people || [])])];
  return out;
}

/**
 * Write the order of a column after a drop (mutates state.boardOrder; no save).
 * The ids leave every other list of this board. A column gets its own order when a card
 * is moved within it (before: the card it went in front of; null with o.positional = the
 * end); a column that already has one, or a plain custom column (the list is who is in
 * it), takes the place a card from elsewhere was dropped at. A drop from another column
 * on a column in its usual order keeps that order (the card lands where its date puts it).
 */
function _bdPlaceInOrder(L, col, ids, before, o) {
  o = o || {};
  if (!state.boardOrder || typeof state.boardOrder !== 'object' || Array.isArray(state.boardOrder)) state.boardOrder = {};
  const bid = L.board.id, move = new Set(ids);
  for (const c of L.all) {
    if (c.key === col.key) continue;
    const k = _bdOrderKey(bid, c.key), l = state.boardOrder[k];
    if (Array.isArray(l) && l.some(x => move.has(x))) { const n = l.filter(x => !move.has(x)); if (n.length) state.boardOrder[k] = n; else delete state.boardOrder[k]; }
  }
  if (!_bdColOrdered(L, col) && !(ids.every(id => L.colOf.get(id) === col.key) && (o.positional || before))) return;
  const cur = (L.byCol.get(col.key) || []).map(i => i.id).filter(x => !move.has(x));
  let at = before ? cur.indexOf(before) : -1;
  if (at < 0) at = cur.length;
  cur.splice(at, 0, ...ids);
  state.boardOrder[_bdOrderKey(bid, col.key)] = cur.filter(x => getItem(x)).slice(0, 800);
}

/** Does this column keep its own order (a list, or a plain custom column)? */
function _bdColOrdered(L, col) { return (L.board.group === 'custom' && !col.rule) || _bdOrderList(L.board.id, col.key).length > 0; }
/**
 * Drop tasks on a column (and row): place them, apply what the column (and row) means,
 * one undo step and one toast with Undo. A single task dropped on Done is completed the
 * usual way (its celebration and toast).
 */
function boardDropIds(L, ids, colKey, laneKey, before, o) {
  o = o || {};
  const col = L.cols.find(c => c.key === colKey) || L.all.find(c => c.key === colKey);
  if (!col) return;
  ids = ids.filter(id => getItem(id));
  if (!ids.length) return;
  if (!_bdColTakesDrops(L, col)) { toast('Overdue gathers late tasks. Drop it on a day instead', { icon: 'calendar' }); return; }
  if (before && ids.includes(before)) before = null;
  const board = L.board;
  const single = ids.length === 1 ? ids[0] : null;
  const completeOne = single && _bdColIsDone(L, col) && statusOf(single) !== 'done';
  const moved = ids.filter(id => L.colOf.get(id) !== colKey);
  const relaned = L.lanes && laneKey != null ? ids.filter(id => L.laneOf.get(id) !== laneKey) : [];
  const beforeOrder = JSON.stringify(state.boardOrder || {});
  _bdPlaceInOrder(L, col, ids, before, { positional: o.positional });
  const orderChanged = JSON.stringify(state.boardOrder || {}) !== beforeOrder;
  const phrases = [];
  const note = (p) => { if (p && !phrases.includes(p)) phrases.push(p); };
  if (completeOne) {
    if (relaned.length) note(_bdApply(board.lanes, single, laneKey, L.laneOf.get(single), board));
    _bdNoteCleared(L, [single]);
    toggleDone(single);   // saves everything above as one step, plays the celebration, says "Task completed" with Undo
    return;
  }
  for (const id of moved) note(_bdApplyCol(L, col, id, L.colOf.get(id)));
  for (const id of relaned) note(_bdApply(board.lanes, id, laneKey, L.laneOf.get(id), board));
  if (!phrases.length && !orderChanged) return;   // nothing this column means could change (e.g. No stream)
  _bdNoteCleared(L, moved);
  saveData(); render();
  const who = single ? `“${_bdShort(effTitle(getItem(single)))}”` : `${ids.length} tasks`;
  let msg = phrases.length ? `${who}: ${phrases.join(' · ')}` : moved.length ? `${who} moved to ${col.label}` : (single ? 'Card moved' : `${ids.length} cards moved`);
  const wip = _bdColSet(board, col.key).wip || 0;
  if (wip) {
    const n = (L.byCol.get(col.key) || []).length + moved.length;
    if (n > wip) msg += ` · ${col.label} has ${n}, over your limit of ${wip}`;
  }
  toast(msg, { kind: phrases.length ? 'ok' : '', icon: phrases.length ? 'square-kanban' : 'arrow-up-down', action: { label: 'Undo', run: () => undo() } });
}
function _bdShort(t) { t = String(t || ''); return t.length > 40 ? t.slice(0, 38) + '…' : t; }
/** Remember a column a drop emptied (not a done one), so its empty state says "All clear" once. */
let _bdClearedOnce = null;
function _bdNoteCleared(L, movedIds) {
  const leaving = new Map();
  for (const id of movedIds) { const k = L.colOf.get(id); if (k != null) leaving.set(k, (leaving.get(k) || 0) + 1); }
  for (const [k, n] of leaving) {
    const col = L.all.find(c => c.key === k);
    if (col && !_bdColIsDone(L, col) && (L.byCol.get(k) || []).length === n) _bdClearedOnce = { board: L.board.id, col: k, at: Date.now() };
  }
}
