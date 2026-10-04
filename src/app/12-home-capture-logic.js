/* ============================================================
   HOME widget "capture" (Quick capture): its pure rules.
   OWNER: the "capture" widget builder (WIDGETS_CATALOGUE.md 3.1).
   No DOM, no state, no clock: everything comes in as arguments, so
   tests/home-w-capture.test.mjs runs this file in a VM. The widget
   (12-home-w-capture.js) maps tasks to plain rows first:
     {id, title, createdAt (ms or ISO), dueDate, plannedFor, tags[], stream, open}

     homeCaptureTs(createdAt)                       -> ms, or null
     homeCaptureJustAdded(rows, now, {limit, hours})   open rows made in the last
                                                    24 h, newest first (at most 5)
     homeCaptureUnsorted(rows, now, {defaultStream, sorted, days, limit, skip})
                                                    "To sort": open, made in the last
                                                    7 days, no due date, no plan, no
                                                    tags, the default (or no) stream,
                                                    not marked "Looks fine"; newest first
     homeCaptureTopStreams(rows, {allowed, limit, exclude})   the most used streams
     homeCaptureWordIndex(rows, {allowed, exclude})  words -> streams, built once per model
     homeCaptureGuessStream(title, rowsOrIndex, {allowed, exclude, selfId})
                                                    the stream similar tasks use (shared
                                                    words), or null (none, or a tie)
     homeCaptureStreamChoices(title, rows, {allowed, exclude, limit, index})
                                                    -> [{id, guess}] the guess first,
                                                    then the most used
     homeCaptureTemplates(quick, task, {limit})     template chips: quick templates
                                                    first, then the user's task templates
     homeCaptureTemplateDue(t, today)               a template's due date (daysAhead)
     homeCaptureTemplateOpenEnded(t)                its title waits to be finished
                                                    ("Email re: "): no instant add
     homeCaptureDayOn(row, iso)                     is the row already on that day
                                                    (its plan, else its due date)?
     homeCaptureAgo(createdAt, now)                 "5 min ago", "yesterday"
     homeCaptureSortedAdd(sorted, id, {cap, keep, maxChars})
                                                    "Looks fine": add, newest last,
                                                    capped by count and by size
   ============================================================ */

const HOME_CAPTURE_SORTED_MAX = 200;           // = HOME_WIDGET_PREFS.capture.sorted (lib/home-topbar.mjs)
const HOME_CAPTURE_SORTED_CHARS = 3000;        // the list's JSON stays well inside a widget's 4 KB of settings
const _HCAP_STOP = new Set(('the a an and or of to for in on at by with from about into re fw fwd up out off over via per '
  + 'my your our their his her its this that these those it is be are was were do does did done get got make made '
  + 'new task tasks todo note notes call email send check follow reply book need needs').split(' '));

/** A creation time (ms since epoch, or an ISO string) as ms; null when unknown. */
function homeCaptureTs(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : null;
}
function _hcapNowMs(now) {
  if (now instanceof Date) return now.getTime();
  const n = homeCaptureTs(now);
  return n == null ? 0 : n;
}
function _hcapByNewest(a, b) {
  return (b._ts - a._ts) || String(a.id).localeCompare(String(b.id));
}

/** Open rows created in the last `hours` (24), newest first, at most `limit` (5). */
function homeCaptureJustAdded(rows, now, o) {
  o = o || {};
  const limit = o.limit == null ? 5 : Math.max(0, o.limit);
  const nowMs = _hcapNowMs(now);
  const since = nowMs - (o.hours == null ? 24 : o.hours) * 3600000;
  const out = [];
  for (const r of rows || []) {
    if (!r || !r.id || r.open === false) continue;
    const ts = homeCaptureTs(r.createdAt);
    if (ts == null || ts < since || ts > nowMs + 60000) continue;      // a clock in the future says nothing
    out.push(Object.assign({}, r, { _ts: ts }));
  }
  return out.sort(_hcapByNewest).slice(0, limit);
}

/**
 * "To sort": open rows created in the last `days` (7) with no due date, no plan, no tags,
 * and the default stream (or none), that the user has not marked "Looks fine". Newest first.
 * o.skip: ids shown elsewhere in the widget (Just added) are left out.
 */
function homeCaptureUnsorted(rows, now, o) {
  o = o || {};
  const nowMs = _hcapNowMs(now);
  const since = nowMs - (o.days == null ? 7 : o.days) * 86400000;
  const sorted = new Set(Array.isArray(o.sorted) ? o.sorted : []);
  const skip = new Set(Array.isArray(o.skip) ? o.skip : []);
  const dflt = new Set([].concat(o.defaultStream == null ? [] : o.defaultStream).filter(Boolean));
  const out = [];
  for (const r of rows || []) {
    if (!r || !r.id || r.open === false || sorted.has(r.id) || skip.has(r.id)) continue;
    const ts = homeCaptureTs(r.createdAt);
    if (ts == null || ts < since || ts > nowMs + 60000) continue;
    if (r.dueDate || r.plannedFor) continue;
    if (Array.isArray(r.tags) && r.tags.length) continue;
    if (r.stream && !dflt.has(r.stream)) continue;
    out.push(Object.assign({}, r, { _ts: ts }));
  }
  out.sort(_hcapByNewest);
  return o.limit == null ? out : out.slice(0, o.limit);
}

/** Stream ids by how many rows use them (most first; ties keep the `allowed` order). */
function homeCaptureTopStreams(rows, o) {
  o = o || {};
  const allowed = Array.isArray(o.allowed) ? o.allowed : null;
  const exclude = new Set([].concat(o.exclude || []));
  const n = new Map();
  for (const r of rows || []) {
    const s = r && r.stream;
    if (!s || exclude.has(s) || (allowed && !allowed.includes(s))) continue;
    n.set(s, (n.get(s) || 0) + 1);
  }
  const rank = (s) => (allowed ? allowed.indexOf(s) : 0);
  const ids = [...n.keys()].sort((a, b) => (n.get(b) - n.get(a)) || (rank(a) - rank(b)) || a.localeCompare(b));
  // Streams nobody uses yet still fill the row (in their own order), so there is always a choice.
  if (allowed) for (const s of allowed) if (!exclude.has(s) && !ids.includes(s)) ids.push(s);
  return ids.slice(0, o.limit == null ? 4 : o.limit);
}

function _hcapWords(title) {
  const out = new Set();
  for (const w of String(title || '').toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (w.length < 3 || _HCAP_STOP.has(w) || /^\d+$/.test(w)) continue;
    out.add(w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w);
  }
  return out;
}
/**
 * Which streams use which words: {byWord: Map(word -> Map(stream -> [ids]))}. Rows in
 * `exclude` streams (the default one) say nothing about where a task belongs. Built
 * once per model, so a guess per row costs a few lookups, not a pass over every task.
 */
function homeCaptureWordIndex(rows, o) {
  o = o || {};
  const allowed = Array.isArray(o.allowed) ? o.allowed : null;
  const exclude = new Set([].concat(o.exclude || []));
  const byWord = new Map();
  for (const r of rows || []) {
    const s = r && r.stream;
    if (!s || exclude.has(s) || (allowed && !allowed.includes(s))) continue;
    for (const w of _hcapWords(r.title)) {
      let m = byWord.get(w);
      if (!m) { m = new Map(); byWord.set(w, m); }
      const ids = m.get(s);
      if (ids) ids.push(r.id); else m.set(s, [r.id]);
    }
  }
  return { byWord };
}
/**
 * The stream that tasks sharing words with `title` use most, or null (no shared word, or a tie).
 * `src`: the rows, or an index from homeCaptureWordIndex. o.selfId: the task itself does not count.
 */
function homeCaptureGuessStream(title, src, o) {
  o = o || {};
  const words = _hcapWords(title);
  if (!words.size) return null;
  const idx = src && src.byWord instanceof Map ? src : homeCaptureWordIndex(src, o);
  const score = new Map();
  for (const w of words) {
    const m = idx.byWord.get(w);
    if (!m) continue;
    for (const [s, ids] of m) {
      const n = o.selfId ? ids.filter(x => x !== o.selfId).length : ids.length;
      if (n) score.set(s, (score.get(s) || 0) + n);
    }
  }
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length || (ranked[1] && ranked[1][1] === ranked[0][1])) return null;
  return ranked[0][0];
}
/** The stream chips for a "To sort" row: the guess first (guess: true), then the most used. */
function homeCaptureStreamChoices(title, rows, o) {
  o = o || {};
  const limit = o.limit == null ? 4 : o.limit;
  if (limit <= 0) return [];
  const guess = homeCaptureGuessStream(title, o.index || rows, o);
  const top = o.top || homeCaptureTopStreams(rows, { allowed: o.allowed, exclude: o.exclude, limit: limit + 1 });
  const ids = (guess ? [guess] : []).concat(top.filter(s => s !== guess)).slice(0, limit);
  return ids.map(id => ({ id, guess: id === guess }));
}

/**
 * Template chips: the quick templates first (state.quickTemplates, as used by the
 * Templates menu), then the user's task templates. Keys are stable per template.
 * A quick template is always due today + daysAhead (0), as the Templates menu makes it;
 * a task template only with daysAhead, as applyTemplate makes it.
 */
function homeCaptureTemplates(quick, task, o) {
  o = o || {};
  const limit = o.limit == null ? 4 : o.limit;
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const out = [];
  (Array.isArray(quick) ? quick : []).forEach((t, i) => {
    if (!t || !t.title || !t.label) return;
    out.push({ key: 'q:' + i + ':' + String(t.label).slice(0, 40), kind: 'quick', label: String(t.label), title: String(t.title),
      stream: t.stream || null, priority: t.priority || 'p0', tags: Array.isArray(t.tags) ? t.tags.slice() : [],
      daysAhead: num(t.daysAhead) == null ? 0 : num(t.daysAhead),
      recurrence: t.recurrence || 'none', detail: '', subtasks: [], people: [] });
  });
  for (const t of Array.isArray(task) ? task : []) {
    if (!t || !t.id || !t.title) continue;
    out.push({ key: 't:' + t.id, kind: 'task', id: t.id, label: String(t.name || t.title), title: String(t.title),
      stream: t.stream || null, priority: t.priority || 'p0', tags: Array.isArray(t.tags) ? t.tags.slice() : [],
      daysAhead: num(t.daysAhead),
      recurrence: t.recurrence || 'none', detail: String(t.detail || ''),
      subtasks: (Array.isArray(t.subtasks) ? t.subtasks : []).map(s => String((s && s.title) || (typeof s === 'string' ? s : ''))).filter(Boolean),
      people: Array.isArray(t.people) ? t.people.slice() : [] });
  }
  return out.slice(0, limit);
}
/** A template's due date: today + daysAhead (local ISO), or null without daysAhead. */
function homeCaptureTemplateDue(t, today) {
  if (!t || t.daysAhead == null || !/^\d{4}-\d{2}-\d{2}$/.test(String(today || ''))) return null;
  const [y, m, d] = String(today).split('-').map(Number);
  const x = new Date(y, m - 1, d + Number(t.daysAhead));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;   // clock-ok: wall date
}
/** A template whose title is waiting to be finished ("Email re: ", "Call -"): only the editor makes sense. */
function homeCaptureTemplateOpenEnded(t) {
  const s = String((t && t.title) || '');
  return !s.trim() || /(?:[:\-–—(]|\bre)\s*$/i.test(s);
}
/** Is the row already on that day? Its plan when it has one, else its due date. */
function homeCaptureDayOn(row, iso) {
  if (!row || !iso) return false;
  return (row.plannedFor || row.dueDate || null) === iso;
}
/** How long ago a task was made, short: "just now", "5 min ago", "2 h ago", "yesterday", "3 days ago". */
function homeCaptureAgo(ts, now) {
  const t = homeCaptureTs(ts), n = _hcapNowMs(now);
  if (t == null || !n) return '';
  const min = Math.max(0, Math.floor((n - t) / 60000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
/**
 * "Looks fine": the id joins the list (once, newest last). o.keep(id) drops ids that no
 * longer matter (gone, or older than the To sort window); the oldest fall off past o.cap
 * (200) ids or o.maxChars of JSON, so the widget's settings never outgrow their 4 KB.
 */
function homeCaptureSortedAdd(sorted, id, o) {
  o = typeof o === 'number' ? { cap: o } : (o || {});
  const max = o.cap == null ? HOME_CAPTURE_SORTED_MAX : o.cap;
  const chars = o.maxChars == null ? HOME_CAPTURE_SORTED_CHARS : o.maxChars;
  const keep = typeof o.keep === 'function' ? o.keep : null;
  const list = (Array.isArray(sorted) ? sorted : []).filter(x => typeof x === 'string' && x && x !== id && (!keep || keep(x)));
  if (id) list.push(String(id));
  let out = list.slice(Math.max(0, list.length - max));
  while (out.length > 1 && JSON.stringify(out).length > chars) out = out.slice(1);
  return out;
}
