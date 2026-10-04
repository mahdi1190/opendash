/* ============================================================
   HOME widget "launchpad": the pure rules (WIDGETS_CATALOGUE.md 3.13).
   OWNER: the "launchpad" widget builder (Phase 1, wave 1).
   No DOM, no state, no clock: the widget (12-home-w-launchpad.js) passes the
   resources (state.resources, Files & links) and its settings in. The tests run
   this file in a VM next to 62-resources-logic.js (the rsrc* helpers it calls).
   It loads before 12-home.js and 62-resources-logic.js: declarations only.

     lpPinned(list, order)        the pinned resources in tile order: the saved order
                                  first, then pins it has not seen yet, oldest first
                                  (so a new pin goes at the end)
     lpOrderWith(shown, add)      the order to save after pinning `add` (at the end),
                                  at most LP_ORDER_MAX ids
     lpOrderWithout(order, ids)   the order without unpinned ids
     lpSplice(full, part)         the full order after one part of it was dragged
     lpMove(full, id, dir)        one step earlier (-1) or later (+1): the menu and Alt+arrows
     lpStreamOf(r, o)             the stream a resource belongs to: its first live stream
                                  link, else the stream of its first linked task ('' = none)
     lpGroups(items, streamOf, streams)   [{stream, items}] in the user's stream order, then
                                  Other (stream '')
     lpLayout(items, size, o)     what a size draws: {groups: [{stream, tiles, chips}], more}
     lpClick(r, o)                what a click does: open | reveal | url | copy | copy-path | none
     lpVerb(r, o) / lpAriaLabel(r, o)   "Open", "Copy"... and "Open Reports (folder)"
     lpSuggest(list, n)           the most-linked unpinned resources ("Pin from Files")
     lpRecent(list, n)            the newest unpinned resources (Full: "Recently added")
     lpDropItems(text)            dropped text -> {items, rejected} (paths and links only)
     lpGridMove(boxes, i, key)    where an arrow / Home / End key moves the focus to
   ============================================================ */
const LP_ORDER_MAX = 200;                       // = lib/home-topbar.mjs HOME_WIDGET_PREFS.launchpad.order
const LP_CAP = Object.freeze({ s: 6, m: 12, l: 60, full: 60 });
const LP_CHIPS_M = 8;                           // M: snippet chips beside its 12 tiles
const LP_PATH_KINDS = Object.freeze(['folder', 'file']);
const LP_URL_KINDS = Object.freeze(['url', 'github', 'drive']);
const LP_NOUN = Object.freeze({ folder: 'folder', file: 'file', url: 'link', github: 'GitHub link', drive: 'Drive link', snippet: 'snippet' });

function _lpList(list) { return (Array.isArray(list) ? list : []).filter(r => r && typeof r === 'object' && typeof r.id === 'string' && r.id); }
function _lpCreated(r) { const n = Number(r && r.createdAt); return Number.isFinite(n) ? n : 0; }

/** The pinned resources, in tile order. */
function lpPinned(list, order) {
  const pinned = _lpList(list).filter(r => r.pinned === true);
  const byId = new Map(pinned.map(r => [r.id, r]));
  const out = [], seen = new Set();
  for (const id of Array.isArray(order) ? order : []) {
    const r = byId.get(id);
    if (r && !seen.has(id)) { seen.add(id); out.push(r); }
  }
  const rest = pinned.map((r, i) => ({ r, i })).filter(x => !seen.has(x.r.id))
    .sort((a, b) => (_lpCreated(a.r) - _lpCreated(b.r)) || (a.i - b.i)).map(x => x.r);
  return out.concat(rest);
}
/** The order to save after pinning `add`: what is shown now, then the new ones. */
function lpOrderWith(shownIds, addIds) {
  const out = [], seen = new Set();
  for (const id of [...(shownIds || []), ...(addIds || [])]) {
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id); out.push(id);
  }
  // Too many to keep: the newest stay in the saved order (the rest fall back to oldest first).
  return out.length > LP_ORDER_MAX ? out.slice(out.length - LP_ORDER_MAX) : out;
}
function lpOrderWithout(order, ids) {
  const drop = new Set(ids || []);
  return (Array.isArray(order) ? order : []).filter(id => typeof id === 'string' && !drop.has(id));
}
/**
 * One part of the order was dragged (the tiles of one group, or its snippet chips):
 * its slots in the full order take the part's new order; everything else stays put.
 */
function lpSplice(full, part) {
  const f = Array.isArray(full) ? full.slice() : [];
  const inFull = new Set(f);
  const p = [], seen = new Set();
  for (const id of part || []) if (inFull.has(id) && !seen.has(id)) { seen.add(id); p.push(id); }
  const q = p.slice();
  return f.map(id => (seen.has(id) && q.length ? q.shift() : id));
}
/** Move one id a step earlier (-1) or later (+1) within `scope` (the ids it may swap with). */
function lpMove(full, id, dir, scope) {
  const f = Array.isArray(full) ? full.slice() : [];
  const among = (Array.isArray(scope) && scope.length ? scope : f).filter(x => f.includes(x));
  const i = among.indexOf(id);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= among.length) return null;          // already first / last: nothing to do
  const part = among.slice();
  [part[i], part[j]] = [part[j], part[i]];
  return lpSplice(f, part);
}

/** The stream a resource belongs to ('' = none). o: {streams: {id: {archived}}, taskStream(id)} */
function lpStreamOf(r, o) {
  o = o || {};
  const live = (sid) => !!sid && (!o.streams || (o.streams[sid] && !o.streams[sid].archived));
  const links = Array.isArray(r && r.links) ? r.links : [];
  for (const l of links) if (l && l.type === 'stream' && live(l.id)) return l.id;
  if (typeof o.taskStream === 'function') {
    for (const l of links) {
      if (!l || l.type !== 'task') continue;
      let s = '';
      try { s = o.taskStream(l.id) || ''; } catch (e) { s = ''; }
      if (live(s)) return s;
    }
  }
  return '';
}
/** Group items by stream: the user's stream order (streams[id].order), then label; Other last. */
function lpGroups(items, streamOf, streams) {
  const by = new Map();
  for (const r of items || []) {
    const s = typeof streamOf === 'function' ? (streamOf(r) || '') : '';
    if (!by.has(s)) by.set(s, []);
    by.get(s).push(r);
  }
  const st = streams || {};
  const keys = [...by.keys()].filter(k => k).sort((a, b) => {
    const oa = Number(st[a] && st[a].order), ob = Number(st[b] && st[b].order);
    const da = Number.isFinite(oa) ? oa : 1e9, db = Number.isFinite(ob) ? ob : 1e9;
    return (da - db) || String((st[a] && st[a].label) || a).localeCompare(String((st[b] && st[b].label) || b));
  });
  if (by.has('')) keys.push('');
  return keys.map(k => ({ stream: k, items: by.get(k) }));
}
/**
 * What a size draws. S: tiles only (snippets too), 6 of them. M: 12 tiles, and the snippets
 * as chips under them (up to 8 more: chips are small). L / Full: every pin (up to 60),
 * grouped by stream when o.groupByStream.
 * Returns {groups: [{stream (null = not grouped), tiles, chips}], more: [the rest, in order]}.
 */
function lpLayout(items, size, o) {
  o = o || {};
  const all = Array.isArray(items) ? items : [];
  if (size === 'm') {
    const tiles = all.filter(r => r.kind !== 'snippet').slice(0, LP_CAP.m);
    const chips = all.filter(r => r.kind === 'snippet').slice(0, LP_CHIPS_M);
    const shownM = new Set([...tiles, ...chips]);
    return { groups: tiles.length || chips.length ? [{ stream: null, tiles, chips }] : [], more: all.filter(r => !shownM.has(r)) };
  }
  const cap = LP_CAP[size] || LP_CAP.s;
  const shown = all.slice(0, cap), more = all.slice(cap);
  const split = (list) => size === 's'
    ? { tiles: list.slice(), chips: [] }
    : { tiles: list.filter(r => r.kind !== 'snippet'), chips: list.filter(r => r.kind === 'snippet') };
  if ((size === 'l' || size === 'full') && o.groupByStream) {
    const gs = lpGroups(shown, o.streamOf, o.streams);
    // Only "Other": no heading (nothing is grouped).
    if (gs.length === 1 && gs[0].stream === '') return { groups: [Object.assign({ stream: null }, split(gs[0].items))], more };
    return { groups: gs.map(g => Object.assign({ stream: g.stream }, split(g.items))), more };
  }
  return { groups: shown.length ? [Object.assign({ stream: null }, split(shown))] : [], more };
}

/** What a click on a tile does. o: {phone} (a phone copies a local path: it cannot open it). */
function lpClick(r, o) {
  o = o || {};
  if (!r || typeof r !== 'object') return { act: 'none' };
  if (r.kind === 'snippet') return { act: 'copy', text: String(r.target == null ? '' : r.target) };
  if (LP_PATH_KINDS.includes(r.kind)) {
    if (o.phone) return { act: 'copy-path', text: String(r.target || '') };
    if (r.kind === 'file' && rsrcIsExecutable(r.target)) return { act: 'reveal' };     // programs are only shown in their folder
    return { act: 'open' };
  }
  if (LP_URL_KINDS.includes(r.kind)) {
    const u = rsrcSafeUrl(r.target);
    return u ? { act: 'url', url: u } : { act: 'none' };
  }
  return { act: 'none' };
}
const _LP_VERB = { open: 'Open', reveal: 'Show in its folder', url: 'Open', copy: 'Copy', 'copy-path': 'Copy the path of', none: 'Open' };
function lpVerb(r, o) { return _LP_VERB[lpClick(r, o).act] || 'Open'; }
function lpNoun(r) {
  if (!r) return 'item';
  if (r.kind === 'file' && rsrcIsExecutable(r.target)) return 'program';
  return LP_NOUN[r.kind] || 'item';
}
/** "Open Reports (folder)", "Copy Sign-off (snippet)", "Show Setup in its folder (program)". */
function lpAriaLabel(r, o) {
  const name = rsrcDisplayLabel(r) || 'item';
  const a = lpClick(r, o).act;
  if (a === 'reveal') return `Show ${name} in its folder (${lpNoun(r)})`;
  return `${lpVerb(r, o)} ${name} (${lpNoun(r)})`;
}

/** Unpinned resources, the most linked first (then the newest): the empty state's "Pin from Files". */
function lpSuggest(list, n) {
  const k = n == null ? 6 : n;
  return _lpList(list).filter(r => r.pinned !== true)
    .map((r, i) => ({ r, i, l: Array.isArray(r.links) ? r.links.length : 0 }))
    .sort((a, b) => (b.l - a.l) || (_lpCreated(b.r) - _lpCreated(a.r)) || (a.i - b.i))
    .slice(0, k).map(x => x.r);
}
/** Unpinned resources, newest first: Full's "Recently added". */
function lpRecent(list, n) {
  const k = n == null ? 6 : n;
  return _lpList(list).filter(r => r.pinned !== true)
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (_lpCreated(b.r) - _lpCreated(a.r)) || (b.i - a.i))
    .slice(0, k).map(x => x.r);
}
/** Text dropped on the widget -> what to pin (absolute paths and http(s) links; at most 12). */
function lpDropItems(text) {
  const p = rsrcParseMany(String(text == null ? '' : text).slice(0, 20000));
  return { items: p.items.slice(0, 12), rejected: p.rejected.length };
}
/**
 * Arrow keys across the widget's items (tiles, chips, Add; several groups): the index
 * focus moves to, from the items' boxes [{x, y, w, h}] in reading order. Left/Right step
 * in reading order; Up/Down go to the nearest item in the row above / below; Home/End.
 * The same index when it cannot move.
 */
function lpGridMove(boxes, i, key) {
  const b = Array.isArray(boxes) ? boxes : [];
  const n = b.length;
  if (!n) return -1;
  const at = Math.max(0, Math.min(n - 1, Number(i) || 0));
  if (key === 'ArrowRight') return Math.min(n - 1, at + 1);
  if (key === 'ArrowLeft') return Math.max(0, at - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return n - 1;
  if (key !== 'ArrowDown' && key !== 'ArrowUp') return at;
  const c = b[at], cx = c.x + c.w / 2, cy = c.y + c.h / 2;
  const down = key === 'ArrowDown';
  let best = at, bestRow = Infinity, bestDx = Infinity;
  for (let j = 0; j < n; j++) {
    if (j === at) continue;
    const o = b[j], oy = o.y + o.h / 2;
    const dy = down ? oy - cy : cy - oy;
    if (dy < Math.min(c.h, o.h) / 2) continue;                    // same row, or the wrong way
    const row = Math.round(dy), dx = Math.abs(o.x + o.w / 2 - cx);
    // The nearest row first (within a few px counts as the same row), then the nearest column.
    if (row < bestRow - 4 || (Math.abs(row - bestRow) <= 4 && dx < bestDx)) { best = j; bestRow = row; bestDx = dx; }
  }
  return best;
}
