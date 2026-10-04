/* ============================================================
   HOME widget "activity" (What changed): the pure rules (WIDGETS_CATALOGUE.md 3.16).
   OWNER: the "activity" widget builder. No DOM, no state, no clock: the page passes
   everything in, so tests/home-w-activity.test.mjs runs this file alone in a VM.
   Loads before 12-home.js (build order): declarations only.

   An entry is one batch from the actions layer's journal (history.list):
     {token, at (ISO), version, source, client?, summary, ops (a count), undoOf?,
      undone?: {at, by}, undoable, touched?: ['task:<id>', ...], touchedCount?}

     actvKind(e)                 'you' (source ui) | 'assistant' | 'mcp' | 'autolink' | 'script'
     actvSourceLabel(e)          ui "You", assistant "Assistant", mcp the client's name,
                                 autolink "Auto-link", anything else in title case
     actvClientName(raw)         "claude-code 2.1.4" -> "Claude Code" ('' when none)
     actvTime(at), actvDayOf(ms) ms from an ISO string or a number; the local YYYY-MM-DD
     actvRangeStart(range, today)   the first day a range covers ('today' | '7d')
     actvResolve(list, local)    undo chains: Map token -> {undone, redone, target, here}. An
                                 entry undone and then redone (its undo undone) is live
                                 again; Undo then sends the newest link of the chain.
                                 local {token: {by}}: undos this tab made (before the list
                                 caught up, too); here = the chain holds one of them.
     actvModel(list, o)          what the widget shows (see the function)
     actvCountText(n, range, capped)  "4 changes by assistants today"
     actvWhen(ms, today, locale) "14:05", "Yesterday 14:05", "Thu 14:05", "26 Sep"
     actvAgo(ms, now)            "just now", "12 min ago", "3 h ago", "2 days ago"
     actvTaskIds(e), actvSingleTask(e)   the tasks an entry touched (task: and autolink: keys)
     actvEntity(key, look)       a touched key as {kind, id, label, icon, task}
   ============================================================ */
const ACTV_KINDS = Object.freeze(['assistant', 'mcp', 'autolink', 'script', 'you']);
const ACTV_KIND_LABEL = Object.freeze({ all: 'All', assistant: 'Assistant', mcp: 'MCP', autolink: 'Auto-link', script: 'Scripts', you: 'You' });
const ACTV_KIND_ICON = Object.freeze({ assistant: 'sparkles', mcp: 'plug', autolink: 'link', script: 'terminal', you: 'user' });

function actvKind(e) {
  const s = String((e && e.source) || '').toLowerCase();
  if (s === 'ui') return 'you';
  if (s === 'assistant' || s === 'mcp' || s === 'autolink') return s;
  return 'script';
}
function _actvTitleCase(s) {
  return String(s || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ').filter(Boolean).map(w => (/^(mcp|ai|cli|api)$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}
/** An MCP client's name for people: no version, words in title case ("claude-code 2.1.4" -> "Claude Code"). */
function actvClientName(raw) {
  let s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  s = s.replace(/\s+v?\d+(?:\.\d+)*(?:[-+][\w.]+)?$/i, '').trim();      // the version mcp/server.mjs appends
  if (!s) return '';
  return /[A-Z]/.test(s) ? s : _actvTitleCase(s);                          // a name that already has capitals stays as it is
}
function actvSourceLabel(e) {
  const s = String((e && e.source) || '');
  if (s === 'ui') return 'You';
  if (s === 'assistant') return 'Assistant';
  if (s === 'mcp') return actvClientName(e.client) || 'MCP';
  if (s === 'autolink') return 'Auto-link';
  return _actvTitleCase(s) || 'Script';
}

function actvTime(at) {
  if (typeof at === 'number') return Number.isFinite(at) ? at : NaN;
  if (typeof at === 'string' && at) { const t = Date.parse(at); return Number.isFinite(t) ? t : NaN; }
  return NaN;
}
function _actvPad(n) { return (n < 10 ? '0' : '') + n; }
function actvDayOf(ms) {
  if (typeof Clock !== 'undefined') return Clock.parts(ms).iso;   // the page's day (travel spec 2.7)
  const d = new Date(ms);
  return `${d.getFullYear()}-${_actvPad(d.getMonth() + 1)}-${_actvPad(d.getDate())}`;   // clock-ok: Node fallback
}
function _actvAddDays(iso, n) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);   // clock-ok: pure ISO arithmetic (UTC)
}
function actvRangeStart(range, today) { return range === '7d' ? _actvAddDays(today, -6) : String(today); }

/** The undo chains (see the header). */
function actvResolve(list, local) {
  const all = Array.isArray(list) ? list : [];
  const by = new Map();
  for (const e of all) if (e && e.token) by.set(e.token, e);
  const undoneBy = (e) => {
    if (e.undone && typeof e.undone === 'object') return typeof e.undone.by === 'string' && e.undone.by ? e.undone.by : '?';
    const l = local && Object.prototype.hasOwnProperty.call(local, e.token) ? local[e.token] : null;
    return l ? (typeof l.by === 'string' && l.by ? l.by : '?') : null;
  };
  const isLocal = (t) => !!(local && t && Object.prototype.hasOwnProperty.call(local, t));
  const out = new Map();
  for (const e of all) {
    if (!e || !e.token) continue;
    let cur = e, tok = e.token, flips = 0, here = false;
    for (let g = 0; g < 24 && cur; g++) {
      const nx = undoneBy(cur);
      if (!nx) break;
      flips++;
      if (isLocal(cur.token)) here = true;
      tok = nx === '?' ? null : nx;
      cur = tok ? by.get(tok) || null : null;
    }
    const undone = flips % 2 === 1;
    let target = null;
    if (!undone) target = cur ? (cur.undoable ? cur.token : null) : tok;   // a link this tab made, not listed yet: trust it
    out.set(e.token, { undone, redone: !undone && flips > 0, target, here });
  }
  return out;
}

/** Task ids an entry touched (task:<id>, and autolink:<taskId> = that task's suggested links). */
function actvTaskIds(e) {
  const ids = [];
  for (const k of (e && Array.isArray(e.touched) ? e.touched : [])) {
    const m = /^(?:task|autolink):(.+)$/.exec(String(k));
    if (m && !ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}
/** The one task an entry changed, or null (several, none, or a list the server cut short). */
function actvSingleTask(e) {
  const ids = actvTaskIds(e);
  if (ids.length !== 1) return null;
  const n = Number(e.touchedCount);
  if (Number.isFinite(n) && n > e.touched.length) return null;
  return ids[0];
}
/** A touched entity key for people. look: {task(id) -> title|null, person(id) -> name|null, resource(id) -> label|null}. */
function actvEntity(key, look) {
  look = look || {};
  const k = String(key || '');
  const i = k.indexOf(':');
  const kind = i > 0 ? k.slice(0, i) : k;
  const id = i > 0 ? k.slice(i + 1) : '';
  const get = (fn) => { try { return typeof fn === 'function' ? fn(id) : null; } catch (e) { return null; } };
  if (kind === 'task') { const t = get(look.task); return { kind, id, icon: 'square-check-big', label: t || 'A task that is no longer there', task: t ? id : null }; }
  if (kind === 'autolink') { const t = get(look.task); return { kind, id, icon: 'link', label: t ? `Suggested links for "${t}"` : 'Suggested links', task: t ? id : null }; }
  if (kind === 'person') { const p = get(look.person); return { kind, id, icon: 'user', label: p || 'A person', person: p ? id : null }; }
  if (kind === 'resource') { const r = get(look.resource); return { kind, id, icon: 'folder', label: r ? `File or link "${r}"` : 'A file or link' }; }
  if (kind === 'eventMeta') return { kind, id, icon: 'calendar', label: 'Notes on a calendar event' };
  if (kind === 'countdowns') return { kind, id, icon: 'hourglass', label: 'Countdowns' };
  if (kind === 'streams') return { kind, id, icon: 'layers', label: 'Streams' };
  if (kind === 'home') return { kind, id, icon: 'layout-grid', label: 'Home settings' };
  if (kind === 'tagRegistry') return { kind, id, icon: 'tag', label: 'Tags' };
  if (kind === 'daynote') return { kind, id, icon: 'notebook-pen', label: id ? `Daily note, ${id}` : 'Daily note' };
  if (kind === 'key') return { kind, id, icon: 'database', label: _actvTitleCase(id.replace(/([a-z])([A-Z])/g, '$1 $2')) || 'Settings' };
  return { kind, id, icon: 'circle-dot', label: _actvTitleCase(kind) || 'Something else' };
}

/**
 * What the widget shows. o: {range: 'today'|'7d', mine, filter: 'all'|kind, today, limit, local}.
 * Returns {
 *   rows        [{e, token, at, kind, label, icon, undone, redone, target, task}] newest first:
 *               in the range, yours only with `mine`, then the filter
 *   counts      {kind: n} over the range (yours only with `mine`), before the filter
 *   chips       [{k, label, n, on}] All and every kind with changes (and the current one)
 *   others      changes in the range not made by you (the S line)
 *   you         yours in the range
 *   capped      the list may hold more in the range than it shows (limit reached inside it)
 *   last        the S row: the newest shown change that can be undone, or that this tab
 *               has just undone (local)
 *   lastAny     the newest change outside the range (yours only with `mine`), for the empty state
 * }
 */
function actvModel(list, o) {
  o = o || {};
  const range = o.range === '7d' ? '7d' : 'today';
  const today = String(o.today || '');
  const start = actvRangeStart(range, today);
  const all = (Array.isArray(list) ? list : []).filter(e => e && typeof e.token === 'string' && e.token && Number.isFinite(actvTime(e.at)));
  all.sort((a, b) => actvTime(b.at) - actvTime(a.at));
  const res = actvResolve(all, o.local);
  const deco = (e) => {
    const r = res.get(e.token) || { undone: false, redone: false, target: null, here: false };
    const kind = actvKind(e);
    return { e, token: e.token, at: actvTime(e.at), kind, label: actvSourceLabel(e), icon: ACTV_KIND_ICON[kind], undone: r.undone, redone: r.redone, target: r.target, here: r.here, task: actvSingleTask(e) };
  };
  const inRange = all.filter(e => actvDayOf(actvTime(e.at)) >= start);
  const mineOk = (e) => !!o.mine || actvKind(e) !== 'you';
  const shown = inRange.filter(mineOk).map(deco);
  const counts = {};
  for (const r of shown) counts[r.kind] = (counts[r.kind] || 0) + 1;
  const filter = o.filter && o.filter !== 'all' && ACTV_KINDS.includes(o.filter) ? o.filter : 'all';
  const rows = filter === 'all' ? shown : shown.filter(r => r.kind === filter);
  const chips = [{ k: 'all', label: ACTV_KIND_LABEL.all, n: shown.length, on: filter === 'all' }];
  for (const k of ACTV_KINDS) if (counts[k] || filter === k) chips.push({ k, label: ACTV_KIND_LABEL[k], n: counts[k] || 0, on: filter === k });
  const others = inRange.filter(e => actvKind(e) !== 'you').length;
  const limit = Number(o.limit) || 50;
  const oldest = all[all.length - 1];
  const capped = all.length >= limit && !!oldest && actvDayOf(actvTime(oldest.at)) >= start;
  // S: the newest that can be undone; one undone from this tab stays as its receipt (so a
  // second click on "Undo last" hits the receipt, never the change before it).
  const last = shown.find(r => r.target || (r.undone && r.here)) || null;
  const outside = all.find(e => mineOk(e) && actvDayOf(actvTime(e.at)) < start);
  return { rows, counts, chips, filter, others, you: inRange.length - others, capped, last, lastAny: outside ? deco(outside) : null, range, total: shown.length };
}

function actvCountText(n, range, capped) {
  const when = range === '7d' ? 'in the last 7 days' : 'today';
  n = Math.max(0, Math.round(Number(n) || 0));
  if (!n) return `No changes by assistants ${when}`;
  if (n === 1 && !capped) return `1 change by an assistant ${when}`;
  return `${n}${capped ? '+' : ''} changes by assistants ${when}`;
}
function _actvHM(ms) {
  if (typeof Clock !== 'undefined') { const p = Clock.parts(ms); return `${_actvPad(p.h)}:${_actvPad(p.mi)}`; }
  const d = new Date(ms); return `${_actvPad(d.getHours())}:${_actvPad(d.getMinutes())}`;   // clock-ok: Node fallback
}
/** When a change was made, short: today's time, Yesterday, a weekday this week, else the date. */
function actvWhen(ms, today, locale) {
  if (!Number.isFinite(ms)) return '';
  const day = actvDayOf(ms);
  if (day === today) return _actvHM(ms);
  if (day === _actvAddDays(today, -1)) return 'Yesterday ' + _actvHM(ms);
  const d = new Date(ms);
  try {
    if (day > _actvAddDays(today, -7) && day < today) return d.toLocaleDateString(locale || undefined, { weekday: 'short' }) + ' ' + _actvHM(ms);
    return d.toLocaleDateString(locale || undefined, { day: 'numeric', month: 'short' });
  } catch (e) { return day; }
}
function actvAgo(ms, now) {
  if (!Number.isFinite(ms) || !Number.isFinite(now)) return '';
  const m = Math.max(0, Math.round((now - ms) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
