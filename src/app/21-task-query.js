/* ============================================================
   TASK QUERIES (owner: Tasks): which tasks a view shows, search,
   per-view sort and grouping. One set of predicates for lists AND counts.

   Views: today | tomorrow | week (Upcoming) | all | no-date | completed
          (Logbook) | stream:<id> | tag:<tag> | day:<YYYY-MM-DD>
   Today = open tasks due today or earlier, planned for today (or a past day
   and not done yet), or in progress.
   ============================================================ */
const _locale = () => (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined;
function _tWeekStart() {
  const ws = String((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.weekStart) || 'Mon').toLowerCase();
  return ws.startsWith('sun') ? 0 : ws.startsWith('sat') ? 6 : 1;
}
function _isoPlus(n, from) {
  const base = from ? new Date(from + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + n);
  return fmtDate(base);
}
function _dayLabel(iso, opts) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(_locale(), opts || { weekday: 'short', day: 'numeric', month: 'short' });
}

function isArchived(item) {
  if (statusOf(item.id) !== 'done') return false;
  const ts = closedAt(item);
  if (!ts) return false;
  return (Date.now() - ts) > (state.archiveDays || 7) * 86400000;
}
function _closedOn(item) { const ts = closedAt(item); return ts ? fmtDate(new Date(ts)) : null; }

/** Does the task belong to the view, ignoring whether it is open or done? */
function inViewScope(item, view, today) {
  today = today || todayStr();
  const due = effDate(item);
  const plan = item.plannedFor || null;
  if (view === 'today') return (!!due && due <= today) || (!!plan && plan <= today) || statusOf(item.id) === 'doing';
  if (view === 'tomorrow') { const t = _isoPlus(1); return due === t || plan === t; }
  if (view === 'week') { const end = _isoPlus(7); return (!!due && due <= end) || (!!plan && plan <= end); }
  if (view === 'no-date') return !due;
  if (view === 'all' || view === 'completed') return true;
  if (view.startsWith('stream:')) return effStream(item) === view.slice(7);
  if (view.startsWith('tag:')) return effTags(item).includes(view.slice(4));
  if (view.startsWith('day:')) { const d = view.slice(4); return due === d || plan === d; }
  if (view.startsWith('person:') && typeof effPeople === 'function') return effPeople(item).includes(view.slice(7));
  return true;
}
/** Open tasks a view lists (Logbook: closed tasks). The sidebar counts use this too. */
function matchesView(item, view) {
  const done = statusOf(item.id) === 'done';
  if (view === 'completed') return done;
  if (done) return false;
  return inViewScope(item, view);
}
/** Recently closed tasks shown in a view's collapsed "Completed" group. */
function recentlyClosedInView(item, view, today) {
  if (statusOf(item.id) !== 'done' || view === 'completed') return false;
  if (!inViewScope(item, view, today)) {
    // Today: anything closed today counts, even if it has rolled out of scope.
    if (view !== 'today') return false;
  }
  if (view === 'today') return _closedOn(item) === (today || todayStr());
  return !isArchived(item);
}
/** Number of open tasks in a view. */
function taskViewCount(view) {
  let n = 0;
  for (const i of getAllItems()) if (matchesView(i, view)) n++;
  return n;
}

/* ---------- search ---------- */
// Operators: #tag  @person  p1..p3 / !p1  is:done|open|doing|wontdo|pinned|planned
//            due:today|overdue|tomorrow|week|none  stream:<id or label>  -word (exclude)
let _searchCacheQ = null, _searchCache = null;
function parseTaskSearch(q) {
  if (q === _searchCacheQ) return _searchCache;
  const out = { words: [], not: [], tags: [], people: [], prio: null, is: [], due: null, stream: null, raw: q || '' };
  for (const tok of String(q || '').trim().split(/\s+/).filter(Boolean)) {
    const low = tok.toLowerCase();
    let m;
    if ((m = /^#(.+)$/.exec(low))) out.tags.push(m[1]);
    else if ((m = /^@(.+)$/.exec(low))) out.people.push(m[1]);
    else if ((m = /^!?p([0-3])$/.exec(low))) out.prio = 'p' + m[1];
    else if ((m = /^is:(\w+)$/.exec(low))) out.is.push(m[1]);
    else if ((m = /^due:(\w+)$/.exec(low))) out.due = m[1];
    else if ((m = /^stream:(.+)$/.exec(low))) out.stream = m[1];
    else if (low.length > 1 && low[0] === '-') out.not.push(low.slice(1));
    else out.words.push(low);
  }
  _searchCacheQ = q; _searchCache = out;
  return out;
}
function _personNames(item) {
  if (typeof effPeople !== 'function') return [];
  const out = [];
  for (const pid of effPeople(item)) {
    const p = typeof getPerson === 'function' ? getPerson(pid) : null;
    out.push(pid);
    if (p) { out.push(p.name || ''); for (const a of (p.aliases || [])) out.push(a); }
  }
  return out.map(s => String(s).toLowerCase());
}
/** The text a free-text search looks through. */
function _taskHaystack(item) {
  const parts = [effTitle(item), effDetail(item), ...effTags(item), ...effSubtasks(item).map(s => s.title || ''),
    ...getNotes(item.id).map(n => n.text || ''), STREAMS[effStream(item)]?.label || '', effStream(item) || '', ..._personNames(item)];
  return parts.join('\n').toLowerCase();
}
function matchesSearch(item, q) {
  if (!q) return true;
  const s = typeof q === 'string' ? parseTaskSearch(q) : q;
  if (s.prio && effPriority(item) !== s.prio) return false;
  if (s.tags.length && !s.tags.every(t => effTags(item).some(x => x === t || x.startsWith(t)))) return false;
  if (s.people.length) {
    const names = _personNames(item);
    if (!s.people.every(p => names.some(n => n === p || n.split(/\s+/).some(w => w.startsWith(p))))) return false;
  }
  if (s.stream) {
    const st = effStream(item), lbl = String(STREAMS[st]?.label || '').toLowerCase();
    if (st !== s.stream && !lbl.startsWith(s.stream)) return false;
  }
  const status = statusOf(item.id);
  for (const k of s.is) {
    if (k === 'done' && !(status === 'done' && !isWontDo(item))) return false;
    if (k === 'open' && status === 'done') return false;
    if (k === 'doing' && status !== 'doing') return false;
    if ((k === 'wontdo' || k === 'skipped') && !isWontDo(item)) return false;
    if (k === 'pinned' && !isPinned(item.id)) return false;
    if (k === 'planned' && !item.plannedFor) return false;
    if (k === 'repeating' && effRecurrence(item) === 'none') return false;
  }
  if (s.due) {
    const d = daysUntil(effDate(item));
    const ok = s.due === 'none' ? d === null : s.due === 'today' ? d === 0 : s.due === 'overdue' ? (d !== null && d < 0)
      : s.due === 'tomorrow' ? d === 1 : s.due === 'week' ? (d !== null && d >= 0 && d <= 7) : true;
    if (!ok) return false;
  }
  if (s.words.length || s.not.length) {
    const hay = _taskHaystack(item);
    if (!s.words.every(w => hay.includes(w))) return false;
    if (s.not.some(w => hay.includes(w))) return false;
  }
  return true;
}

/* ---------- per-view preferences (UI state: sort, grouping, folded groups) ---------- */
function _prefKey(view) { return String(view || '').startsWith('day:') ? 'day' : String(view || ''); }
function taskViewPrefs(view) {
  const all = state.taskViewPrefs && typeof state.taskViewPrefs === 'object' ? state.taskViewPrefs : {};
  return all[_prefKey(view)] || {};
}
function setTaskViewPref(view, patch) {
  if (!state.taskViewPrefs || typeof state.taskViewPrefs !== 'object') state.taskViewPrefs = {};
  const k = _prefKey(view);
  const cur = Object.assign({}, state.taskViewPrefs[k] || {}, patch);
  for (const key of Object.keys(cur)) if (cur[key] === undefined || cur[key] === null) delete cur[key];
  state.taskViewPrefs[k] = cur;
  saveUI();
}
const TASK_SORTS = [['date', 'Due date'], ['priority', 'Priority'], ['title', 'Title'], ['created', 'Newest'], ['manual', 'Manual']];
const TASK_GROUPS = [['auto', 'Smart'], ['date', 'Date'], ['priority', 'Priority'], ['stream', 'Stream'], ['none', 'None']];
/** The sort a view uses: its own choice, else due date then priority. Manual only after a drag. */
function sortForView(view) {
  const s = taskViewPrefs(view).sort;
  if (s && TASK_SORTS.some(x => x[0] === s)) return s;
  return 'date';
}
function groupForView(view) {
  const g = taskViewPrefs(view).group;
  return g && TASK_GROUPS.some(x => x[0] === g) ? g : 'auto';
}
function isGroupCollapsed(view, key, dflt) {
  const c = taskViewPrefs(view).collapsed || {};
  return key in c ? !!c[key] : !!dflt;
}
function toggleGroupCollapsed(view, key, dflt) {
  const c = Object.assign({}, taskViewPrefs(view).collapsed || {});
  c[key] = !isGroupCollapsed(view, key, dflt);
  setTaskViewPref(view, { collapsed: c });
}

const PRIORITY_ORDER = { p1: 0, p2: 1, p3: 2, p0: 3 };
function _createdTs(item) {
  if (item.createdAt) return item.createdAt;
  const m = /^u-(\d{10,})/.exec(item.id || '');
  return m ? Number(m[1]) : 0;
}
function _cmpDate(a, b) {
  const ea = effDate(a), eb = effDate(b);
  if (ea !== eb) { if (!ea) return 1; if (!eb) return -1; return ea < eb ? -1 : 1; }
  const ta = a.dueTime || '99', tb = b.dueTime || '99';
  if (ta !== tb) return ta < tb ? -1 : 1;
  const pa = PRIORITY_ORDER[effPriority(a)] ?? 3, pb = PRIORITY_ORDER[effPriority(b)] ?? 3;
  if (pa !== pb) return pa - pb;
  return _createdTs(a) - _createdTs(b);
}
/** Sort a list. by: date | priority | title | created | manual | completed. view: for manual order. */
function sortItems(items, by, view) {
  const arr = items.slice();
  view = view || state.view;
  if (by === 'manual') {
    const order = state.customOrder[view] || [];
    const pos = new Map(order.map((id, i) => [id, i]));
    arr.sort((a, b) => {
      const ai = pos.has(a.id) ? pos.get(a.id) : Infinity, bi = pos.has(b.id) ? pos.get(b.id) : Infinity;
      if (ai !== bi) return ai - bi;
      return _cmpDate(a, b);
    });
    return arr;
  }
  if (by === 'priority') arr.sort((a, b) => ((PRIORITY_ORDER[effPriority(a)] ?? 3) - (PRIORITY_ORDER[effPriority(b)] ?? 3)) || _cmpDate(a, b));
  else if (by === 'title') arr.sort((a, b) => effTitle(a).localeCompare(effTitle(b), _locale(), { sensitivity: 'base' }));
  else if (by === 'created') arr.sort((a, b) => _createdTs(b) - _createdTs(a));
  else if (by === 'completed') arr.sort((a, b) => closedAt(b) - closedAt(a));
  else arr.sort(_cmpDate);
  return arr;
}

/** Group label + order for one task under the "Smart" grouping of a view. */
function _smartGroup(it, view, today) {
  const due = effDate(it);
  const d = daysUntil(due);
  if (view === 'today') {
    if (d !== null && d < 0) return ['overdue', 'Overdue'];
    if (d === 0 || (it.plannedFor && it.plannedFor <= today)) return ['today', 'Today'];
    return ['doing', 'In progress'];
  }
  if (view === 'week') {
    if (d !== null && d < 0) return ['overdue', 'Overdue'];
    const key = (due && d <= 7) ? due : (it.plannedFor || due || 'zz');
    const dd = daysUntil(key);
    const lbl = dd === 0 ? 'Today' : dd === 1 ? 'Tomorrow' : _dayLabel(key, { weekday: 'long', day: 'numeric', month: 'short' });
    return [key, lbl, dd === 0 ? _dayLabel(key, { weekday: 'short', day: 'numeric', month: 'short' }) : ''];
  }
  if (view === 'completed') {
    const day = _closedOn(it) || 'zz';
    const dd = daysUntil(day);
    return [day, dd === 0 ? 'Today' : dd === -1 ? 'Yesterday' : _dayLabel(day, { weekday: 'long', day: 'numeric', month: 'short' })];
  }
  if (d === null) return ['nodate', 'No date'];
  if (d < 0) return ['overdue', 'Overdue'];
  if (d === 0) return ['today', 'Today'];
  if (d === 1) return ['tomorrow', 'Tomorrow'];
  if (d <= 7) return ['week', 'Next 7 days'];
  return ['later', 'Later'];
}
const _SMART_ORDER = ['overdue', 'today', 'doing', 'tomorrow', 'week', 'later', 'nodate'];
/**
 * Group a (sorted) list. by: auto | date | priority | stream | none.
 * Returns [{key, label, sub, items}] in display order; items keep their sort order.
 */
function groupItems(items, by, view) {
  view = view || state.view;
  if (by === 'none') return [{ key: '', label: '', items }];
  const today = todayStr();
  const groups = new Map();
  for (const it of items) {
    let key, label, sub = '';
    if (by === 'auto') [key, label, sub] = _smartGroup(it, view, today);
    else if (by === 'date') {
      const eff = effDate(it);
      key = eff || 'zz-nodate';
      label = eff ? (daysUntil(eff) === 0 ? 'Today' : daysUntil(eff) === 1 ? 'Tomorrow' : _dayLabel(eff)) : 'No date';
    } else if (by === 'priority') {
      key = effPriority(it); label = PRIORITIES[key]?.label || key;
    } else if (by === 'stream') {
      key = effStream(it) || ''; label = STREAMS[key]?.label || key || 'No stream';
    } else { key = ''; label = ''; }
    if (!groups.has(key)) groups.set(key, { key, label, sub: sub || '', items: [] });
    groups.get(key).items.push(it);
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (by === 'auto' && view !== 'week' && view !== 'completed') return _SMART_ORDER.indexOf(a.key) - _SMART_ORDER.indexOf(b.key);
    if (by === 'auto' && view === 'week') { if (a.key === 'overdue') return -1; if (b.key === 'overdue') return 1; return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; }
    if (by === 'auto' && view === 'completed') return a.key < b.key ? 1 : a.key > b.key ? -1 : 0;
    if (by === 'priority') return (PRIORITY_ORDER[a.key] ?? 3) - (PRIORITY_ORDER[b.key] ?? 3);
    if (by === 'date') return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    if (by === 'stream') return (STREAMS[a.key]?.order ?? 999) - (STREAMS[b.key]?.order ?? 999) || a.label.localeCompare(b.label);
    return 0;
  });
}

/** Today's numbers: done today vs everything on today's plate. */
function todayProgress() {
  const today = todayStr();
  let done = 0, open = 0, overdue = 0, doing = 0;
  for (const i of getAllItems()) {
    if (statusOf(i.id) === 'done') {
      if (!isWontDo(i) && _closedOn(i) === today) done++;
      continue;
    }
    if (!inViewScope(i, 'today', today)) continue;
    open++;
    const d = daysUntil(effDate(i));
    if (d !== null && d < 0) overdue++;
    if (statusOf(i.id) === 'doing') doing++;
  }
  // Repeating tasks done today rolled forward and are open again: count the completion.
  for (const [id, log] of Object.entries(state.completionLog || {})) {
    const it = getItem(id);
    if (!it || statusOf(id) === 'done' || !Array.isArray(log)) continue;
    if (log.some(ts => fmtDate(new Date(ts)) === today)) done++;
  }
  return { done, total: done + open, open, overdue, doing };
}
