/* ============================================================
   SIDEBAR LIST ORDER (Streams, Tags, People). PURE: no DOM, no state.
   User request, 3 Oct: reorder the sidebar lists (by total tasks, open
   tasks, name, recent activity, or a custom drag order) and choose how many
   show at once (5 / 10 / all, with "Show N more").
     SB_LIST_SORTS                   [[id, label]]
     SB_LIST_SHOWS                   [5, 10, 0]  (0 = all)
     sbListPrefs(saved, defaults)    {sort, show}, invalid values -> defaults
     sbTaskStats(tasks, o)           Map key -> {total, open, recent}
     sbOrderItems(items, sort, custom)  ordered copy (pinned first, in every sort)
     sbLimit(items, show, expanded, keepId)  {shown, hidden}
     sbMoveId(ids, id, delta)        ids with one moved (keyboard reorder)
     sbMergeOrder(visibleIds, allIds)  the new full order after a drag of the visible ones
   ============================================================ */
const SB_LIST_SORTS = [['total', 'Total tasks'], ['open', 'Open tasks'], ['name', 'Name'], ['recent', 'Recent activity'], ['custom', 'Custom (drag to reorder)']];
const SB_LIST_SHOWS = [5, 10, 0];

function sbListPrefs(saved, defaults) {
  const d = Object.assign({ sort: 'open', show: 0 }, defaults || {});
  const s = saved && typeof saved === 'object' ? saved : {};
  return {
    sort: SB_LIST_SORTS.some(x => x[0] === s.sort) ? s.sort : d.sort,
    show: SB_LIST_SHOWS.includes(s.show) ? s.show : d.show,
  };
}

/**
 * Per-key counts over tasks. o: {keysOf(task) -> [key], isOpen(task) -> bool,
 * activity: {taskId: [{ts}]}, completions: {taskId: [ts]}}.
 * recent = the newest of: an activity entry, a completion, the task's createdAt.
 */
function sbTaskStats(tasks, o) {
  o = o || {};
  const out = new Map();
  const act = o.activity || {}, done = o.completions || {};
  for (const t of Array.isArray(tasks) ? tasks : []) {
    if (!t || !t.id) continue;
    let recent = Date.parse(t.createdAt || '') || 0;
    for (const a of Array.isArray(act[t.id]) ? act[t.id] : []) if (a && +a.ts > recent) recent = +a.ts;
    for (const ts of Array.isArray(done[t.id]) ? done[t.id] : []) if (+ts > recent) recent = +ts;
    const open = o.isOpen ? !!o.isOpen(t) : true;
    for (const k of new Set((o.keysOf ? o.keysOf(t) : []) || [])) {
      if (k == null || k === '') continue;
      const r = out.get(k) || { total: 0, open: 0, recent: 0 };
      r.total++; if (open) r.open++; if (recent > r.recent) r.recent = recent;
      out.set(k, r);
    }
  }
  return out;
}

/**
 * items: [{id, label, total, open, recent, pinned}] in their natural order.
 * custom: [id] (the saved drag order; ids missing from it keep their natural place after it).
 */
function sbOrderItems(items, sort, custom) {
  const list = (Array.isArray(items) ? items : []).map((it, i) => ({ it, i }));
  const name = (a, b) => String(a.it.label || a.it.id).localeCompare(String(b.it.label || b.it.id), undefined, { sensitivity: 'base' }) || a.i - b.i;
  let cmp;
  if (sort === 'custom') {
    const pos = new Map((Array.isArray(custom) ? custom : []).map((id, i) => [id, i]));
    const at = (x) => pos.has(x.it.id) ? pos.get(x.it.id) : Infinity;
    // Pinned still lead (user report, 4 Oct: a pin did nothing under a custom order); the drag order applies within each half.
    cmp = (a, b) => (!!b.it.pinned - !!a.it.pinned) || (at(a) - at(b)) || a.i - b.i;
    return list.sort(cmp).map(x => x.it);
  }
  if (sort === 'name') cmp = name;
  else {
    const f = sort === 'total' ? 'total' : sort === 'recent' ? 'recent' : 'open';
    cmp = (a, b) => (+b.it[f] || 0) - (+a.it[f] || 0) || name(a, b);
  }
  return list.sort((a, b) => (!!b.it.pinned - !!a.it.pinned) || cmp(a, b)).map(x => x.it);
}

/** The rows to draw: the first `show` (0 = all), plus keepId (the open view) when it falls past the cut. */
function sbLimit(items, show, expanded, keepId) {
  const all = Array.isArray(items) ? items : [];
  if (!show || expanded || all.length <= show) return { shown: all.slice(), hidden: 0 };
  const shown = all.slice(0, show);
  if (keepId != null && !shown.some(x => x.id === keepId)) { const k = all.find(x => x.id === keepId); if (k) shown.push(k); }
  return { shown, hidden: all.length - shown.length };
}

function sbMoveId(ids, id, delta) {
  const out = (Array.isArray(ids) ? ids : []).slice();
  const i = out.indexOf(id), j = i + delta;
  if (i < 0 || j < 0 || j >= out.length) return out;
  out.splice(i, 1); out.splice(j, 0, id);
  return out;
}

/** After dragging among the visible rows: their new order, then everything else in its old order. */
function sbMergeOrder(visibleIds, allIds) {
  const vis = (Array.isArray(visibleIds) ? visibleIds : []).slice();
  const seen = new Set(vis);
  return [...vis, ...(Array.isArray(allIds) ? allIds : []).filter(id => !seen.has(id))];
}
