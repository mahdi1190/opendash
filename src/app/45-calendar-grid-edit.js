/* ============================================================
   CALENDAR GRID EDITING: Google Calendar's interactions (owner: Calendar)
   ------------------------------------------------------------
   User request, 3 Oct: "is the calendar very similar if not identical to
   [Google Calendar] in terms of interface when we click events and move
   stuff around". The user chose: real Google events become editable like in
   Google Calendar, with a confirmation first when others are invited.

   Wired by the Calendar section (41-calendar-section.js _calBuild):
     calGridEditTime(root)    a week / day grid (calTimeGrid, 42-calendar-views.js)
     calGridEditMonth(grid)   the month grid (calMonthGrid, 40-calendar.js)
     calGridCreate()          "c" and New > New event: a draft on the focused day
     calGridCanEdit(ev)       {ok, reason} (CalWrite.canEdit + the organiser rule)
   What it does, as Google does:
     drag an event          15-minute snap, across days, a ghost with a live
                            "10:15 – 11:00", the original dimmed until the drop;
                            up into the all-day row = all-day; an all-day event
                            down onto the grid = a one-hour event; Esc cancels;
                            the scroll box scrolls near its edges
     resize                 the bottom edge of a timed event (as Google: the top
                            moves it), 15-minute snap, 15 minutes at least
     click-and-drag         on an empty slot draws a new block (one click = a
                            half-hour slot, 30 minutes); the all-day row and
                            month cells draw all-day drafts (drag for several
                            days); then the quick-create popover beside it:
                            title, Event | Task, time, location, calendar
                            (writable ones), Save, More options (the centre card
                            in create mode: openEvent(null, {create}) for an
                            event, tcOpenCreate for a task)
     month                  drag an event to another day, keeping its time
     planned task blocks    keep their own drag (HTML5, 40-calendar.js); their
                            bottom edge resizes them (a planned slot: its length,
                            20-task-plan.js; a due-time block: the estimate; one undo step)
     read-only events       no handles; the tooltip says why
     saving                 a quiet shimmer while CalWrite.pending(id); a failed
                            write glides back to where it was and flashes
     keys                   CGL_KEYS (45-calendar-grid-logic.js): c, n / p,
                            e / Enter, Delete, Alt+arrows (15 minutes / a day),
                            Alt+Shift+Up/Down (shorter / longer), Esc
     touch                  long-press to pick an event up, then drag
   Writes go through window.CalWrite (44-calendar-write.js): it updates the
   page at once, asks before Google emails guests, asks which events of a
   series, shows "Saving to Google... Saved" with Undo, and reverts with an
   error toast. Without it every event shows read-only (the reason says so).
   Event text is untrusted: textContent / esc() everywhere.
   ============================================================ */
const _CGE_HOLD_MS = 450;      // touch: long-press to pick up
const _CGE_SLOP = 4;           // px a mouse moves before a press is a drag
const _CGE_TOUCH_SLOP = 9;     // px a finger moves before the hold: a scroll, not a pick-up
const _CGE_EDGE = 40;          // px from the scroll box's edge where a drag scrolls it
const _CGE_KEY_SETTLE = 650;   // ms after the last Alt+arrow before the move is written
// Google resizes from the bottom edge only: the top of a block (its title) is where people grab it to
// move it, so a top handle turned many moves into resizes (QA, 3 Oct). Kept switchable.
const _CGE_TOP_EDGE = false;

let _cgeDrag = null;           // the press / drag in progress
let _cgeQC = null;             // the open quick-create {d, spec, close, pop}
let _cgeSelId = null;          // the selected event (keys act on it)
let _cgeKey = null;            // an Alt+arrow move waiting to be written
let _cgeRefocus = null;        // give this event the focus after the next render
let _cgeFocusId = null;        // the event block that has the keyboard focus (kept across re-renders)
let _cgeSubscribed = false;
let _cgeLastKind = 'event';    // Event | Task in the quick-create (this session)
let _cgeLastCal = null;        // the calendar picked last
let _cgeLive = null;           // aria-live region
const _cgeInflight = new Set(); // drops handed to CalWrite whose ghost still shows

/* ---------- CalWrite, or a stand-in until it is there ---------- */
const _CGE_NO_WRITE = 'Changes are made in Google Calendar: saving from the dashboard is not available here.';
function _cgeShimFail() { const e = new Error(_CGE_NO_WRITE); e.code = 'UNAVAILABLE'; return Promise.reject(e); }
const _cgeShim = {
  shim: true,
  canEdit: () => ({ ok: false, reason: _CGE_NO_WRITE }),
  guests: (ev) => ((ev && ev.attendees) || []).filter(a => a && !a.self).map(a => ({ email: a.email, self: false, organizer: !!a.organizer, responseStatus: a.response || 'needsAction' })),
  move: _cgeShimFail, resize: _cgeShimFail, update: _cgeShimFail, create: _cgeShimFail, remove: _cgeShimFail, rsvp: _cgeShimFail,
  pending: () => false, onChange: () => () => {},
};
function _cgeCW() { const w = window.CalWrite; return w && typeof w.move === 'function' ? w : _cgeShim; }
/** Can the grid move / resize / delete this event? {ok, reason}. */
function calGridCanEdit(ev) {
  if (!ev) return { ok: false, reason: 'This event is not in the calendar any more.' };
  let r;
  try { r = _cgeCW().canEdit(ev); } catch (e) { r = null; }
  r = r && typeof r === 'object' ? r : { ok: !!r };
  // CalWrite knows the calendars' access and who organises what (44-calendar-write-logic.js calwEditInfo).
  return r.ok ? { ok: true } : { ok: false, reason: String(r.reason || 'This calendar is read-only.') };
}
/** Calendars a new event can go in: owner / writer Google calendars, the primary first. */
function _cgeWritableCalendars() {
  const cw = _cgeCW();
  if (cw.shim) return [];
  const raw = CalStore.data && Array.isArray(CalStore.data.calendars) ? CalStore.data.calendars : [];
  let ok = null;
  try { ok = typeof cw.writableCalendars === 'function' ? cw.writableCalendars() : null; } catch (e) { ok = null; }
  if (!Array.isArray(ok)) ok = raw.filter(c => c && c.id && !String(c.id).includes('/') && (c.accessRole === 'owner' || c.accessRole === 'writer'));
  ok = ok.slice().sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
  const shown = new Map(calCalendars().map(c => [c.id, c]));
  return ok.map(c => { const s = shown.get(c.id) || {}; return { id: c.id, name: s.name || c.name || c.id, color: s.color || c.color || 'blue', primary: !!c.primary }; });
}

/* ---------- small helpers ---------- */
function _cgeHm(min) { return _calTimeLabel(_calHM(((Math.round(min) % CGL_DAY) + CGL_DAY) % CGL_DAY)); }
function _cgeRange(a, b) { return cglRangeLabel(a, b, _cgeHm); }
function _cgeDayLabel(iso, long) { return _calFmt(iso, long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\bSept\b/, 'Sep'); }
function _cgeSpanLabel(first, last) { return first === last ? _cgeDayLabel(first, true) : `${_cgeDayLabel(first)} – ${_cgeDayLabel(last)}`; }
function _cgeReduced() { return !!(window.Motion && Motion.prefersReduced()); }
function _cgeOnCal() { return typeof state !== 'undefined' && String(state.view).startsWith('calendar'); }
function _cgeEls(id, scope) { return id ? [...(scope || document).querySelectorAll(`#main-body .cal-wrap [data-kind="event"][data-id="${CSS.escape(id)}"]`)] : []; }
function _cgeAnnounce(text) {
  if (!_cgeLive || !_cgeLive.isConnected) {
    _cgeLive = document.createElement('div'); _cgeLive.className = 'sr-only'; _cgeLive.setAttribute('aria-live', 'polite');
    document.body.appendChild(_cgeLive);
  }
  _cgeLive.textContent = '';
  setTimeout(() => { if (_cgeLive) _cgeLive.textContent = text; }, 30);
}
/** A small tooltip at the pointer for a moment ("why can't I move this?"). */
function _cgeHint(x, y, text) {
  document.querySelectorAll('.tip.cge-hint').forEach(n => n.remove());
  const t = document.createElement('div'); t.className = 'tip cge-hint'; t.setAttribute('role', 'status');
  t.textContent = text;
  document.body.appendChild(t);
  const w = t.offsetWidth, h = t.offsetHeight;
  t.style.left = Math.round(Math.max(6, Math.min(x - w / 2, window.innerWidth - w - 6))) + 'px';
  t.style.top = Math.round(y + 18 + h > window.innerHeight - 6 ? y - h - 12 : y + 18) + 'px';
  // Gone after a moment, or at the next press (it must not hang over a new draft or popover).
  const off = () => { t.remove(); window.removeEventListener('pointerdown', off, true); };
  setTimeout(() => { if (t.isConnected) window.addEventListener('pointerdown', off, true); }, 0);
  setTimeout(off, 2600);
}
/** Swallow the click that follows a drag (it would open the event / the slot menu). */
function _cgeEatClick() {
  const kill = (e) => {
    window.removeEventListener('click', kill, true);
    // Only the browser's own click from this release, and never one in a dialog / popover CalWrite opened meanwhile.
    if (!e.isTrusted || (e.target && e.target.closest && e.target.closest('.modal, .pop, .drawer, .cmd, #toast-host'))) return;
    e.stopPropagation(); e.preventDefault();
  };
  window.addEventListener('click', kill, true);
  setTimeout(() => window.removeEventListener('click', kill, true), 300);
}

/* ---------- selection (the event the keys act on) ---------- */
function _cgeSelect(id) {
  if (_cgeSelId === id) return;
  _cgeSelId = id || null;
  document.querySelectorAll('#main-body .cge-sel').forEach(n => n.classList.remove('cge-sel'));
  for (const n of _cgeEls(_cgeSelId)) n.classList.add('cge-sel');
}
function _cgeSelected() {
  const a = document.activeElement;
  if (a && a.matches && a.matches('#main-body .cal-wrap [data-kind="event"][data-id]')) return a;
  if (!_cgeSelId) return null;
  const els = _cgeEls(_cgeSelId);
  return els.find(n => n.closest('.wv, .month')) || els[0] || null;
}

/* ---------- wiring a rendered grid ---------- */
/** Decorate + wire a week / day grid (call on every render; the element is new each time). */
function calGridEditTime(root) {
  if (!root || root._cge) return root;
  root._cge = true;
  root.classList.add('cge-on');
  _cgeSubscribe();
  _cgeDecorate(root);
  root.addEventListener('pointerdown', (e) => _cgeTimeDown(e, root));
  _cgeWireCommon(root);
  root.addEventListener('scroll', () => { if (_cgeQC) _cgePlaceQC(); }, { passive: true });
  queueMicrotask(() => _cgeAfterRender(root));
  return root;
}
/** The same for the month grid. */
function calGridEditMonth(grid) {
  if (!grid || grid._cge) return grid;
  grid._cge = true;
  grid.classList.add('cge-on');
  _cgeSubscribe();
  _cgeDecorate(grid);
  grid.addEventListener('pointerdown', (e) => _cgeMonthDown(e, grid));
  _cgeWireCommon(grid);
  grid.addEventListener('dblclick', () => _cgeCloseQC(), true);
  queueMicrotask(() => _cgeAfterRender(grid));
  return grid;
}
function _cgeWireCommon(root) {
  // A finger that picked something up must not scroll the page or open the context menu.
  root.addEventListener('touchmove', (e) => { if (_cgeDrag && _cgeDrag.started && _cgeDrag.touch) e.preventDefault(); }, { passive: false });
  root.addEventListener('contextmenu', (e) => { if (_cgeDrag && _cgeDrag.touch) e.preventDefault(); }, true);
  // A resize handle on a planned task block must not start the block's own (HTML5) drag.
  root.addEventListener('dragstart', (e) => { if (_cgeDrag) e.preventDefault(); }, true);
  root.addEventListener('focusin', (e) => { const b = e.target.closest && e.target.closest('[data-kind="event"][data-id]'); if (b) { _cgeSelect(b.dataset.id); _cgeFocusId = b.dataset.id; } });
  // Focus that leaves for another place forgets the event; a question about it (CalWrite's dialogs) does not.
  // (A re-render removes the focused block without a focusout: _cgeAfterRender puts the focus back.)
  root.addEventListener('focusout', (e) => {
    const from = e.target, to = e.relatedTarget;
    if (to && to.closest && (to.closest('[data-kind="event"][data-id]') || to.closest('.modal, .pop'))) return;
    // Chrome sends focusout when a re-render removes the block: that one keeps the focus id.
    setTimeout(() => { if (from.isConnected && _cgeFocusId === (from.dataset && from.dataset.id)) _cgeFocusId = null; }, 0);
  });
}
/** Handles, read-only tips and the saving shimmer on every event block / chip. */
function _cgeDecorate(root) {
  const cw = _cgeCW();
  const blocks = root.querySelectorAll('.wv-ev[data-kind="event"], .wv-allbar[data-kind="event"], .ce[data-kind="event"]');
  const byId = new Map();
  if (blocks.length) for (const e of calAllEvents()) byId.set(e.id, e);
  for (const b of blocks) {
    const ev = byId.get(b.dataset.id);
    if (!ev) continue;
    const ce = calGridCanEdit(ev);
    if (_cgeSelId === ev.id) b.classList.add('cge-sel');
    try { if (cw.pending(ev.id)) { b.classList.add('cge-saving'); b.setAttribute('aria-busy', 'true'); } } catch (e) { /* no status */ }
    if (!ce.ok) {
      b.classList.add('cge-ro');
      b.setAttribute('data-tip', (b.title ? b.title + '\n' : '') + ce.reason);
      b.removeAttribute('title');
      continue;
    }
    b.classList.add('cge-rw');
    if (!b.classList.contains('wv-ev') || b.classList.contains('band')) continue;
    const g = cglEventGeom(ev);
    const col = b.closest('.wv-col');
    if (g.allDay || g.overnight || !col) continue;
    _cgeAddHandles(b, _CGE_TOP_EDGE && parseFloat(b.style.height) >= 34);
  }
  // Planned task blocks: their bottom edge sets the estimate.
  for (const b of root.querySelectorAll('.wv-ev.is-task[data-kind="task"]')) _cgeAddHandles(b, _CGE_TOP_EDGE && parseFloat(b.style.height) >= 34);
}
function _cgeAddHandles(b, top) {
  if (b.querySelector('.cge-rz')) return;
  const s = document.createElement('span'); s.className = 'cge-rz cge-rz-s'; s.setAttribute('aria-hidden', 'true'); s.title = 'Drag to change the end';
  b.appendChild(s);
  if (top) { const n = document.createElement('span'); n.className = 'cge-rz cge-rz-n'; n.setAttribute('aria-hidden', 'true'); n.title = 'Drag to change the start'; b.appendChild(n); }
}
function _cgeSubscribe() {
  if (_cgeSubscribed) return;
  const cw = _cgeCW();
  if (cw.shim || typeof cw.onChange !== 'function') return;
  _cgeSubscribed = true;
  // CalWrite says "saved" a moment before its counter drops: look again once it has.
  try { cw.onChange(() => { _cgePaintPending(); setTimeout(_cgePaintPending, 0); }); } catch (e) { _cgeSubscribed = false; }
}
function _cgePaintPending() {
  const cw = _cgeCW();
  for (const el of document.querySelectorAll('#main-body .cal-wrap [data-kind="event"][data-id]')) {
    let p = false;
    try { p = !!cw.pending(el.dataset.id); } catch (e) { p = false; }
    el.classList.toggle('cge-saving', p);
    if (p) el.setAttribute('aria-busy', 'true'); else el.removeAttribute('aria-busy');
  }
}
/** After a render: put back what lives across renders (an open draft, an Alt+arrow ghost, the focus). */
function _cgeAfterRender(root) {
  if (!root.isConnected) return;
  const month = root.classList.contains('month');
  if (_cgeQC && _cgeQC.d) {
    const d = _cgeQC.d;
    if (!!d.month === month && d.root !== root) { d.root = root; _cgePaintSpec(d, _cgeQC.spec); _cgePlaceQC(); }
    else if (!!d.month !== month) _cgeCloseQC();
  }
  if (_cgeKey && _cgeKey.d && !!_cgeKey.d.month === month && _cgeKey.d.root !== root) { _cgeKey.d.root = root; _cgeKeyPaint(); }
  if (_cgeDrag && _cgeDrag.started && !_cgeDrag.eat && !!_cgeDrag.month === month && _cgeDrag.root !== root) { _cgeDrag.root = root; _cgeDim(_cgeDrag, true); _cgeUpdate(_cgeDrag); }
  // A write CalWrite has drawn (the page re-rendered): its ghost has done its job.
  for (const d of _cgeInflight) if (d.root !== root) { _cgeClearVisuals(d); _cgeInflight.delete(d); }
  const want = _cgeRefocus || _cgeFocusId;
  if (want) {
    const busy = document.querySelector('.modal, .cmd, .drawer, .pop') || (typeof tcIsOpen === 'function' && tcIsOpen());
    const el = _cgeEls(want).find(n => root.contains(n));
    const a = document.activeElement;
    if (el && !busy && (!a || a === document.body || !a.isConnected)) {
      try { el.focus({ preventScroll: true }); } catch (e) { /* fine */ }
    }
    if (el && want === _cgeRefocus) _cgeRefocus = null;
  }
}

/* ---------- geometry ---------- */
function _cgeCols(root) { return root ? [...root.querySelectorAll('.wv-grid > .wv-col')] : []; }
function _cgeColOf(root, iso) { return root ? root.querySelector(`.wv-grid > .wv-col[data-date="${iso}"]`) : null; }
/** Pointer -> {i, iso, col, min, zone:'grid'|'lane'} in a week/day grid. */
function _cgeTimeAt(root, x, y) {
  const cols = _cgeCols(root);
  if (!cols.length) return null;
  let i = cols.length - 1;
  for (let k = 0; k < cols.length; k++) { if (x < cols[k].getBoundingClientRect().right) { i = k; break; } }
  const col = cols[i], cr = col.getBoundingClientRect();
  const head = root.querySelector('.wv-head');
  const hb = head ? head.getBoundingClientRect().bottom : cr.top;
  return { i, iso: col.dataset.date, col, min: (y - cr.top) / CAL_HOUR_PX * 60, zone: y < hb ? 'lane' : 'grid' };
}
function _cgeMinIn(col, y) { return (y - col.getBoundingClientRect().top) / CAL_HOUR_PX * 60; }
/** The month cell under the pointer, else the nearest one. */
function _cgeCellAt(grid, x, y) {
  const hit = document.elementFromPoint(x, y);
  const c = hit && hit.closest ? hit.closest('.mc') : null;
  if (c && grid.contains(c)) return c;
  let best = null, bd = Infinity;
  for (const cell of grid.querySelectorAll('.mc')) {
    const r = cell.getBoundingClientRect();
    const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0, dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
    if (dx + dy < bd) { bd = dx + dy; best = cell; }
  }
  return best;
}

/* ---------- painting ghosts and drafts ---------- */
function _cgeGhostEl(d, lane) {
  const g = document.createElement('div');
  g.className = (lane ? 'wv-allbar' : 'wv-ev') + ' cge-ghost' + (d.draft ? ' cge-draft' : '') + (d.taskDraft ? ' is-task' : ' c-' + (d.color || 'blue'));
  g.setAttribute('aria-hidden', 'true');
  g.innerHTML = '<span class="wv-t"><span class="cge-gt"></span></span><span class="wv-s cge-gl"></span>';
  g.querySelector('.cge-gt').textContent = d.title || '(No title)';
  return g;
}
/** A timed block from `start` to `end` minutes of `day`: one ghost per column it touches. */
function _cgePaintTimed(d, day, start, end) {
  if (d.laneGhost) d.laneGhost.remove();
  const segs = [];
  for (const col of _cgeCols(d.root)) {
    const k = cglDayDelta(day, col.dataset.date);
    const a = Math.max(0, start - k * CGL_DAY), b = Math.min(CGL_DAY, end - k * CGL_DAY);
    if (b > a) segs.push({ col, a, b });
  }
  d.ghosts = d.ghosts || [];
  while (d.ghosts.length < segs.length) d.ghosts.push(_cgeGhostEl(d, false));
  d.ghosts.forEach((g, n) => {
    const s = segs[n];
    if (!s) { g.remove(); return; }
    if (g.parentNode !== s.col) s.col.appendChild(g);
    const h = Math.max(20, (s.b - s.a) / 60 * CAL_HOUR_PX - 3);
    g.style.top = (s.a / 60 * CAL_HOUR_PX + 1) + 'px';
    g.style.height = h + 'px';
    g.classList.toggle('short', h < 38);
    g.querySelector('.cge-gl').textContent = n === 0 ? _cgeRange(start, end) : '';
  });
}
/** An all-day bar across [first, last] in the week/day all-day row (clipped to the days shown). */
function _cgePaintLane(d, first, last) {
  (d.ghosts || []).forEach(g => g.remove());
  const lane = d.root && d.root.querySelector('.wv-all');
  const cols = _cgeCols(d.root);
  if (!lane || !cols.length) return;
  const f = cols[0].dataset.date, l = cols[cols.length - 1].dataset.date;
  const g = d.laneGhost || (d.laneGhost = _cgeGhostEl(d, true));
  if (last < f || first > l) { g.remove(); return; }
  const a = cols.find(c => c.dataset.date === (first < f ? f : first)), b = cols.find(c => c.dataset.date === (last > l ? l : last));
  if (g.parentNode !== lane) lane.appendChild(g);
  const lr = lane.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
  g.style.left = (ra.left - lr.left + (first < f ? 0 : 3)) + 'px';
  g.style.width = (rb.right - ra.left - (first < f ? 0 : 3) - (last > l ? 0 : 3)) + 'px';
  g.classList.toggle('cont-l', first < f); g.classList.toggle('cont-r', last > l);
  g.querySelector('.cge-gl').textContent = first === last ? '' : _cgeSpanLabel(first, last);
}
/** Month: the target cells light up and a chip sits in the first one. */
function _cgePaintMonth(d, first, last, timeLabel) {
  const grid = d.root;
  if (!grid) return;
  grid.querySelectorAll('.cge-mt').forEach(c => c.classList.remove('cge-mt'));
  const cells = [...grid.querySelectorAll('.mc')].filter(c => c.dataset.date >= first && c.dataset.date <= last);
  cells.forEach(c => c.classList.add('cge-mt'));
  let g = d.mghost;
  if (!g) {
    g = d.mghost = document.createElement('div');
    g.className = 'ce cge-mghost' + (d.draft ? ' cge-draft' : '') + (d.taskDraft ? ' tk' : ' c-' + (d.color || 'blue')) + (d.timed ? ' timed' : ' allday');
    g.setAttribute('aria-hidden', 'true');
    g.innerHTML = '<time></time><span class="cge-gt"></span>';
    g.querySelector('.cge-gt').textContent = d.title || '(No title)';
  }
  if (!g.isConnected) document.body.appendChild(g);
  g.querySelector('time').textContent = timeLabel || '';
  if (!cells.length) { g.hidden = true; return; }
  g.hidden = false;
  const r0 = cells[0].getBoundingClientRect();
  let right = r0.right;
  for (const c of cells) { const r = c.getBoundingClientRect(); if (Math.abs(r.top - r0.top) < 2) right = Math.max(right, r.right); }
  g.style.left = Math.round(r0.left + 4) + 'px';
  g.style.top = Math.round(r0.top + 28) + 'px';
  g.style.width = Math.round(right - r0.left - 8) + 'px';
}
/** Paint a quick-create spec ({kind:'timed', day, start, end} | {kind:'allday', first, last}). */
function _cgePaintSpec(d, s) {
  if (d.month) _cgePaintMonth(d, s.first || s.day, s.last || s.day, s.kind === 'timed' ? _cgeHm(s.start) : '');
  else if (s.kind === 'timed') _cgePaintTimed(d, s.day, s.start, s.end);
  else _cgePaintLane(d, s.first, s.last);
}
function _cgeClearVisuals(d) {
  if (!d) return;
  (d.ghosts || []).forEach(g => g.remove());
  if (d.laneGhost) d.laneGhost.remove();
  if (d.mghost) d.mghost.remove();
  if (d.root) d.root.querySelectorAll('.cge-mt').forEach(c => c.classList.remove('cge-mt'));
  _cgeDim(d, false);
}
function _cgeDim(d, on) {
  if (!d || !d.id || d.mode === 'resize') return;
  const scope = d.root || document;
  for (const n of scope.querySelectorAll(`[data-kind="event"][data-id="${CSS.escape(d.id)}"]`)) n.classList.toggle('cge-src', !!on);
  if (!on) document.querySelectorAll(`.cge-src[data-id="${CSS.escape(d.id)}"]`).forEach(n => n.classList.remove('cge-src'));
}
function _cgeTitleSet(d, text) {
  for (const g of [...(d.ghosts || []), d.laneGhost, d.mghost]) { const t = g && g.querySelector('.cge-gt'); if (t) t.textContent = text || '(No title)'; }
}
function _cgeColorSet(d, color, task) {
  d.color = color; d.taskDraft = !!task;
  for (const g of [...(d.ghosts || []), d.laneGhost, d.mghost]) {
    if (!g) continue;
    for (const c of [...g.classList]) if (/^c-/.test(c)) g.classList.remove(c);
    g.classList.toggle(g.classList.contains('ce') ? 'tk' : 'is-task', !!task);
    if (!task) g.classList.add('c-' + color);
  }
}

/* ---------- pressing ---------- */
/** Week / day: what did the press land on? */
function _cgeTimeDown(e, root) {
  if (_cgeDrag || (e.pointerType === 'mouse' && e.button !== 0) || e.ctrlKey || e.metaKey) return;
  const t = e.target;
  if (!t || !t.closest) return;
  const block = t.closest('.wv-ev, .wv-allbar');
  const rz = t.closest('.cge-rz');
  if (rz && block) {
    if (e.pointerType === 'touch') e.preventDefault();
    const task = block.dataset.kind === 'task';
    const col = block.closest('.wv-col');
    if (!col) return;
    let g;
    let plan = null;
    if (task) {
      const it = getItem(block.dataset.id); if (!it) return;
      plan = block.dataset.plan && typeof planSlotOf === 'function' ? planSlotOf(it) : null;   // a planned slot (20-task-plan.js)
      const s = plan ? plan.start : _calMinOf(it.dueTime); if (s === null) return;
      g = { start: s, end: plan ? plan.end : Math.min(CGL_DAY, s + calTaskMinutes(it)) };
      block.draggable = false;
    } else {
      const ev = calEventById(block.dataset.id); if (!ev) return;
      g = cglEventGeom(ev);
      _cgeSelect(ev.id);
    }
    // A finger on a handle resizes at once (it would scroll otherwise); a mouse click there still opens the event.
    _cgeBegin(e, { mode: 'resize', edge: rz.classList.contains('cge-rz-n') ? 'start' : 'end', task, plan: !!plan, el: block, id: block.dataset.id, root, iso: col.dataset.date, g, pressMin: _cgeMinIn(col, e.clientY), keep: { top: block.style.top, height: block.style.height, cls: block.className, sub: (block.querySelector('.wv-s') || {}).textContent } }, e.pointerType === 'touch');
    return;
  }
  if (block && block.dataset.kind === 'event') {
    const ev = calEventById(block.dataset.id);
    if (!ev) return;
    _cgeSelect(ev.id);
    const at = _cgeTimeAt(root, e.clientX, e.clientY);
    if (!at) return;
    // Asked again at the press: the block was drawn before the server went away (or a calendar went read-only).
    const now = block.classList.contains('cge-rw') ? calGridCanEdit(ev) : null;
    const ro = !now || !now.ok;
    _cgeBegin(e, { mode: ro ? 'readonly' : block.classList.contains('wv-allbar') ? 'lane' : 'move', el: block, id: ev.id, root, g: cglEventGeom(ev), pressIso: at.iso, pressMin: at.min, color: calEventColor(ev), title: ev.summary, reason: ro ? (now && now.reason) || (block.getAttribute('data-tip') || '').split('\n').pop() : '' });
    return;
  }
  if (block || t.closest('button, a, input, .wv-duelane, .wv-dh')) return;   // tasks keep their own drag; buttons do their thing
  const draft = { draft: true, root, color: _cgeDraftColor(), title: '(No title)', qcWasOpen: !!_cgeQC };
  if (t.classList.contains('wv-dropcell')) {
    const at = _cgeTimeAt(root, e.clientX, e.clientY);
    if (!at) return;
    _cgeSelect(null);
    _cgeBegin(e, Object.assign(draft, { mode: 'create-lane', pressIso: at.iso }));
    return;
  }
  const col = t.closest('.wv-col');
  if (col && root.contains(col)) {
    _cgeSelect(null);
    _cgeBegin(e, Object.assign(draft, { mode: 'create', pressIso: col.dataset.date, pressMin: _cgeMinIn(col, e.clientY) }));
  }
}
/** Month: an event chip, or the empty part of a day. */
function _cgeMonthDown(e, grid) {
  if (_cgeDrag || (e.pointerType === 'mouse' && e.button !== 0) || e.ctrlKey || e.metaKey) return;
  const t = e.target;
  if (!t || !t.closest) return;
  const chip = t.closest('.ce');
  const cell = t.closest('.mc');
  if (!cell) return;
  if (chip && chip.dataset.kind === 'event') {
    const ev = calEventById(chip.dataset.id);
    if (!ev) return;
    _cgeSelect(ev.id);
    const now = chip.classList.contains('cge-rw') ? calGridCanEdit(ev) : null;
    const ro = !now || !now.ok;
    const g = cglEventGeom(ev);
    _cgeBegin(e, { mode: ro ? 'readonly' : 'm-move', month: true, el: chip, id: ev.id, root: grid, g, pressIso: cell.dataset.date, color: calEventColor(ev), title: ev.summary, timed: !g.allDay, reason: ro ? (now && now.reason) || (chip.getAttribute('data-tip') || '').split('\n').pop() : '' });
    return;
  }
  if (chip || t.closest('.dn, button')) return;
  _cgeSelect(null);
  _cgeBegin(e, { mode: 'm-create', month: true, draft: true, root: grid, pressIso: cell.dataset.date, out: cell.classList.contains('out'), color: _cgeDraftColor(), title: '(No title)', qcWasOpen: !!_cgeQC });
}
function _cgeDraftColor() {
  const cals = _cgeWritableCalendars();
  const c = cals.find(x => x.id === _cgeLastCal) || cals[0];
  return c ? c.color : 'blue';
}

/* ---------- the drag ---------- */
function _cgeBegin(e, d, immediate) {
  d.x0 = d.lastX = e.clientX; d.y0 = d.lastY = e.clientY;
  d.pid = e.pointerId; d.touch = e.pointerType === 'touch';
  d.started = false; d.ghosts = [];
  _cgeDrag = d;
  window.addEventListener('pointermove', _cgeOnMove, true);
  window.addEventListener('pointerup', _cgeOnUp, true);
  window.addEventListener('pointercancel', _cgeOnCancel, true);
  if (immediate) { _cgeStart(d); return; }
  // Touch: hold still to pick an event up (or to draw a new one); moving first scrolls.
  if (d.touch && d.mode !== 'readonly') d.hold = setTimeout(() => {
    if (_cgeDrag !== d || d.started) return;
    if (d.mode === 'create' || d.mode === 'create-lane' || d.mode === 'm-create') d.held = true;
    _cgeStart(d);
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (x) { /* not on this device */ }
  }, _CGE_HOLD_MS);
}
function _cgeOnMove(e) {
  const d = _cgeDrag;
  if (!d || e.pointerId !== d.pid) return;
  d.lastX = e.clientX; d.lastY = e.clientY;
  if (!d.started) {
    const dist = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
    if (d.touch) { if (dist > _CGE_TOUCH_SLOP) _cgeEnd(d); return; }   // a scroll, not a pick-up
    if (dist < _CGE_SLOP) return;
    _cgeStart(d);
    if (!_cgeDrag) return;
  }
  if (d.eat) return;
  e.preventDefault();
  _cgeUpdate(d);
  if (!d.month) _cgeAutoScroll(d);
}
function _cgeStart(d) {
  if (d.mode === 'readonly') {
    _cgeHint(d.lastX, d.lastY, d.reason || 'This event is read-only.');
    d.started = true; d.eat = true;     // nothing moves; the release must not open it either
    return;
  }
  d.started = true;
  if (typeof closePopovers === 'function') closePopovers();   // a quick-create that was open goes
  if (typeof _hideTip === 'function') _hideTip();
  document.body.classList.add('cge-dragging', 'cge-m-' + (d.mode === 'resize' ? 'resize' : d.draft ? 'create' : 'move'));
  if (d.mode === 'resize') d.el.classList.add('cge-resizing');
  else _cgeDim(d, true);
  if (d.touch && d.el) d.el.classList.add('cge-lifted');
}
function _cgeOnUp(e) {
  const d = _cgeDrag;
  if (!d || e.pointerId !== d.pid) return;
  clearTimeout(d.hold);
  if (!d.started) {
    _cgeEnd(d);
    if (d.draft) {
      _cgeEatClick();
      if (d.qcWasOpen) { _cgeCloseQC(); return; }    // Google: a click outside an open draft only closes it
      _cgeClickCreate(d, e);
    }
    return;   // a click on an event: the grid's own click handler opens it
  }
  _cgeEatClick();
  if (d.eat) { _cgeEnd(d); return; }
  d.lastX = e.clientX; d.lastY = e.clientY;
  _cgeUpdate(d);
  _cgeEnd(d, { keep: true });
  _cgeCommit(d);
}
function _cgeOnCancel(e) { const d = _cgeDrag; if (d && e.pointerId === d.pid) _cgeCancel(); }
/** Esc / pointercancel: everything back where it was. */
function _cgeCancel() {
  const d = _cgeDrag;
  if (!d) return;
  _cgeEnd(d);
  if (d.mode === 'resize') _cgeRestoreResize(d);
  _cgeAnnounce('Cancelled');
}
function _cgeEnd(d, o) {
  clearTimeout(d.hold);
  if (d.asRaf) cancelAnimationFrame(d.asRaf);
  d.asRaf = 0;
  window.removeEventListener('pointermove', _cgeOnMove, true);
  window.removeEventListener('pointerup', _cgeOnUp, true);
  window.removeEventListener('pointercancel', _cgeOnCancel, true);
  document.body.classList.remove('cge-dragging', 'cge-m-resize', 'cge-m-create', 'cge-m-move');
  if (d.started && typeof _hideTip === 'function') _hideTip();   // no tooltip for whatever the pointer crossed
  if (d.started) document.querySelectorAll('.anim-tip').forEach(n => n.remove());   // nor the hover scene (78-brief-hooks.js)
  if (d.el) { d.el.classList.remove('cge-lifted'); if (d.task) d.el.draggable = true; }
  if (_cgeDrag === d) _cgeDrag = null;
  if (!(o && o.keep)) _cgeClearVisuals(d);
}
/** Scroll the week/day box while the pointer is near its top or bottom edge. */
function _cgeAutoScroll(d) {
  if (d.asRaf || !d.root) return;
  const step = () => {
    d.asRaf = 0;
    if (_cgeDrag !== d || !d.started || !d.root || !d.root.isConnected) return;
    const r = d.root.getBoundingClientRect();
    const head = d.root.querySelector('.wv-head');
    const top = head ? head.getBoundingClientRect().bottom : r.top;
    const y = d.lastY;
    let dy = 0;
    // Only towards the edge the pointer is heading for: a press near the top (08:00 sits there) that drags down does not scroll up.
    if (y > r.bottom - _CGE_EDGE && y > d.y0 + 8) dy = Math.min(16, (y - (r.bottom - _CGE_EDGE)) / 3 + 2);
    else if (y >= top && y < top + _CGE_EDGE && y < d.y0 - 8) dy = -Math.min(16, (top + _CGE_EDGE - y) / 3 + 2);
    if (!dy) return;
    const before = d.root.scrollTop;
    d.root.scrollTop = before + dy;
    if (d.root.scrollTop !== before) { _cgeUpdate(d); d.asRaf = requestAnimationFrame(step); }
  };
  d.asRaf = requestAnimationFrame(step);
}

/* ---------- where it would land ---------- */
function _cgeUpdate(d) {
  if (!d.root || !d.root.isConnected) {
    d.root = document.querySelector(d.month ? '#main-body .month.cge-on' : '#main-body .wv.cge-on');
    if (!d.root) return;
    if (d.mode === 'resize') { d.el = d.root.querySelector(`.wv-col[data-date="${d.iso}"] [data-id="${CSS.escape(d.id)}"]`); if (!d.el) return; d.el.classList.add('cge-resizing'); }
    else _cgeDim(d, true);
  }
  const x = d.lastX, y = d.lastY;
  if (d.mode === 'move' || d.mode === 'lane') _cgeUpdMove(d, x, y);
  else if (d.mode === 'resize') _cgeUpdResize(d, y);
  else if (d.mode === 'create') {
    const col = _cgeColOf(d.root, d.pressIso);
    if (!col) return;
    const r = cglCreateRange(d.pressMin, _cgeMinIn(col, y));
    _cgePaintTimed(d, d.pressIso, r.start, r.end);
    d.t = { kind: 'timed', day: d.pressIso, start: r.start, end: r.end };
  } else if (d.mode === 'create-lane') {
    const at = _cgeTimeAt(d.root, x, y);
    if (!at) return;
    const first = at.iso < d.pressIso ? at.iso : d.pressIso, last = at.iso < d.pressIso ? d.pressIso : at.iso;
    _cgePaintLane(d, first, last);
    d.t = { kind: 'allday', first, last };
  } else if (d.mode === 'm-move') {
    const cell = _cgeCellAt(d.root, x, y);
    if (!cell) return;
    const n = cglDayDelta(d.pressIso, cell.dataset.date);
    const first = cglShiftDay(d.g.startDay, n), last = cglShiftDay(d.g.endDay, n);
    _cgePaintMonth(d, first, last, d.g.allDay ? '' : _cgeHm(d.g.start));
    d.t = { same: n === 0, patch: d.g.allDay ? cglAllDayPatch(first, last) : _cgeShiftTimed(d.g, n), say: _cgeSpanLabel(first, last) };
  } else if (d.mode === 'm-create') {
    const cell = _cgeCellAt(d.root, x, y);
    if (!cell) return;
    const iso = cell.dataset.date;
    const first = iso < d.pressIso ? iso : d.pressIso, last = iso < d.pressIso ? d.pressIso : iso;
    _cgePaintMonth(d, first, last, '');
    d.t = { kind: 'allday', first, last };
  }
}
function _cgeShiftTimed(g, n) { return cglTimedPatch(cglShiftDay(g.startDay, n), g.start, g.end); }
function _cgeUpdMove(d, x, y) {
  const at = _cgeTimeAt(d.root, x, y);
  if (!at) return;
  const g = d.g;
  const longTimed = !g.allDay && g.dur >= CGL_DAY;        // a timed event of a day or more lives in the all-day row
  if (at.zone === 'lane' || (d.mode === 'lane' && longTimed)) {
    let first, last;
    if (d.mode === 'lane') { const m = cglMoveAllDay({ first: g.startDay, last: g.endDay }, d.pressIso, at.iso); first = m.first; last = m.last; }
    else { first = last = at.iso; }                         // a timed event lifted into the all-day row
    _cgePaintLane(d, first, last);
    const n = cglDayDelta(g.startDay, first);
    d.t = { same: d.mode === 'lane' && n === 0, patch: g.allDay || d.mode === 'move' ? cglAllDayPatch(first, last) : _cgeShiftTimed(g, n), say: (first === last ? _cgeDayLabel(first, true) : _cgeSpanLabel(first, last)) + ', all day' };
    return;
  }
  let day, r;
  if (d.mode === 'move') {
    const off = cglDayDelta(g.startDay, d.pressIso);      // 1 when an overnight event was grabbed on its second day
    day = cglShiftDay(at.iso, -off);
    r = cglMoveTimed({ day, min: at.min - d.pressMin + g.start }, { grab: 0, dur: g.dur, overnight: g.overnight });
  } else {
    day = at.iso;                                           // an all-day event put down on the grid: one hour
    r = cglAllDayToTimed(at.min);
  }
  _cgePaintTimed(d, day, r.start, r.end);
  d.t = { same: d.mode === 'move' && day === g.startDay && r.start === g.start, patch: cglTimedPatch(day, r.start, r.end), say: `${_cgeDayLabel(day, true)}, ${_cgeRange(r.start, r.end)}` };
}
function _cgeUpdResize(d, y) {
  const el = d.el;
  const col = el && el.closest('.wv-col');
  if (!col) return;
  // The edge follows the pointer from where it was grabbed (the handle sits a few pixels inside the
  // block): 30 minutes of drag = 30 minutes longer, as a move counts from its grab point.
  const min = (d.edge === 'end' ? d.g.end : d.g.start) + _cgeMinIn(col, y) - (d.pressMin == null ? _cgeMinIn(col, d.y0) : d.pressMin);
  let start = d.g.start, end = d.g.end;
  if (d.edge === 'end') end = cglResizeEnd(start, min); else start = cglResizeStart(end, min);
  const h = Math.max(20, (end - start) / 60 * CAL_HOUR_PX - 3);
  el.style.top = (start / 60 * CAL_HOUR_PX + 1) + 'px';
  el.style.height = h + 'px';
  el.classList.toggle('short', h < 38);
  const sub = el.querySelector('.wv-s');
  if (sub) sub.textContent = _cgeRange(start, end) + (d.task ? ' · ' + calDurLabel(end - start) : '');
  d.t = { same: start === d.g.start && end === d.g.end, start, end, say: _cgeRange(start, end) };
}
function _cgeRestoreResize(d) {
  const el = d.el;
  if (!el || !el.isConnected || !d.keep) return;
  el.style.top = d.keep.top; el.style.height = d.keep.height; el.className = d.keep.cls;
  const sub = el.querySelector('.wv-s');
  if (sub && d.keep.sub != null) sub.textContent = d.keep.sub;
}

/* ---------- dropping ---------- */
function _cgeCommit(d) {
  const t = d.t;
  if (d.mode === 'resize') {
    d.el.classList.remove('cge-resizing');
    if (!t || t.same) { _cgeRestoreResize(d); return; }
    // A planned slot keeps the deadline: only its time and length change (20-task-plan.js).
    if (d.task && d.plan && typeof setPlannedSlot === 'function') { setPlannedSlot(d.id, d.iso, _calHM(t.start), Math.min(PLAN_MAX_MINUTES, t.end - t.start), { reason: 'Resized on the calendar' }); return; }
    if (d.task) { _cgeTaskResize(d.id, d.iso, t.start, t.end); return; }
    const cw = _cgeCW();
    _cgeWrite(d, () => (d.edge === 'end' ? cw.resize(d.id, { end: cglLocalIso(d.iso, t.end) }) : cw.move(d.id, cglTimedPatch(d.iso, t.start, t.end))), t.say);
    return;
  }
  if (d.draft) { if (t) _cgeQuickCreate(d, t); else _cgeClearVisuals(d); return; }
  if (!t || t.same) { _cgeClearVisuals(d); return; }
  _cgeWrite(d, () => _cgeCW().move(d.id, t.patch), t.say);
}
/**
 * Hand a write to CalWrite and follow it: the ghost stays where it was put until
 * CalWrite has redrawn the page (or asked about guests / the series); a refusal
 * or a failure glides the event back.
 */
function _cgeWrite(d, run, say) {
  const from = (() => { const g = (d.ghosts || []).find(x => x.isConnected) || (d.laneGhost && d.laneGhost.isConnected ? d.laneGhost : null) || (d.mghost && d.mghost.isConnected ? d.mghost : null) || (d.mode === 'resize' ? d.el : null); return g ? g.getBoundingClientRect() : null; })();
  const cw = _cgeCW();
  _cgeRefocus = d.id;
  let p;
  try { p = run(); } catch (e) { p = Promise.reject(e); }
  if (say) _cgeAnnounce('Moving to ' + say);
  _cgeInflight.add(d);
  Promise.resolve(p).then((r) => {
    _cgeInflight.delete(d);
    _cgePaintPending();
    if (r && r.ok === false) _cgeFailed(d, r, from, cw);
    else _cgeClearVisuals(d);
  }, (err) => { _cgeInflight.delete(d); _cgePaintPending(); _cgeFailed(d, err, from, cw); });
}
function _cgeFailed(d, err, from, cw) {
  const cancelled = !!(err && (err.cancelled || err.aborted || /^(CANCELLED|CANCELED|ABORTED)$/.test(String(err.code || ''))));
  if (cw.shim && !cancelled) toast((err && err.message) || _CGE_NO_WRITE, { kind: 'err', icon: 'lock' });
  _cgeClearVisuals(d);
  if (d.mode === 'resize') _cgeRestoreResize(d);
  _cgeRefocus = d.id;
  // After CalWrite has put the event back (it re-renders when it reverts).
  setTimeout(() => requestAnimationFrame(() => {
    const el = _cgeEls(d.id).find(n => n.closest('.wv, .month')) || _cgeEls(d.id)[0];
    if (!el) return;
    if (!cancelled) { el.classList.add('cge-revert'); setTimeout(() => el.classList.remove('cge-revert'), 900); }
    if (!from || _cgeReduced() || typeof el.animate !== 'function') return;
    const to = el.getBoundingClientRect();
    if (!to.width || !to.height) return;
    const dx = from.left - to.left, dy = from.top - to.top, sx = from.width / to.width, sy = from.height / to.height;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02) return;
    el.animate([{ transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transformOrigin: 'top left', transform: 'none' }],
      { duration: 280, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
  }), 0);
}
/** A planned task block resized: its time and estimate, one undo step. */
function _cgeTaskResize(id, day, start, end) {
  const t = getItem(id);
  if (!t) return;
  const hm = _calHM(start), mins = end - start;
  const prevTime = t.dueTime || null, prevEst = Number(t.estimate) > 0 ? Number(t.estimate) : null;
  if (prevTime === hm && prevEst === mins) return;
  if (prevTime !== hm) logActivity(id, 'dueTime', { from: prevTime, to: hm });
  if (prevEst !== mins) logActivity(id, 'estimate', { from: prevEst, to: mins });
  t.dueTime = hm; t.estimate = mins;
  if (!t.dueDate) t.dueDate = day;
  saveData(); render();
  toast(`Planned ${_cgeRange(start, end)} · ${calDurLabel(mins)}`, { kind: 'ok', icon: 'clock', action: { label: 'Undo', run: () => undo() } });
}

/* ---------- a click on an empty slot / day ---------- */
function _cgeClickCreate(d, e) {
  if (d.mode === 'create') {
    const col = _cgeColOf(d.root, d.pressIso);
    if (!col) return;
    const r = cglClickRange(d.pressMin, CGL_CLICK_LEN);
    d.t = { kind: 'timed', day: d.pressIso, start: r.start, end: r.end };
  } else if (d.mode === 'create-lane') {
    d.t = { kind: 'allday', first: d.pressIso, last: d.pressIso };
  } else {
    // Month: the clicked day becomes the focused one (unless it is in the next / previous month).
    if (!d.out && typeof calSetFocus === 'function' && d.pressIso !== calFocus()) {
      calSetFocus(d.pressIso);
      d.root = document.querySelector('#main-body .month.cge-on') || d.root;
    }
    d.t = { kind: 'allday', first: d.pressIso, last: d.pressIso };
  }
  _cgePaintSpec(d, d.t);
  _cgeQuickCreate(d, d.t);
}
/** "c" / New > New event: a draft on the focused day (next half hour today, else 09:00) and the quick-create. */
function calGridCreate(retry) {
  if (!_cgeOnCal()) { if (!retry) { setView('calendar'); setTimeout(() => calGridCreate(true), 60); } return; }
  _cgeCloseQC();
  const mode = calMode(), focus = calFocus();
  const d = { draft: true, color: _cgeDraftColor(), title: '(No title)', ghosts: [] };
  let spec;
  const today = todayStr();
  if (mode === 'month') {
    d.month = true; d.mode = 'm-create';
    d.root = document.querySelector('#main-body .month.cge-on');
    spec = { kind: 'allday', first: focus, last: focus };
  } else {
    d.mode = 'create';
    d.root = mode === 'agenda' ? null : document.querySelector('#main-body .wv.cge-on');
    const days = _cgeCols(d.root).map(c => c.dataset.date);
    let day = days.includes(focus) ? focus : days[0] || focus;
    let start = 9 * 60;
    if ((days.includes(today) && (mode === 'week' || day === today)) || (!days.length && day === today)) {
      const n = Clock.parts(Clock.now()), now = n.h * 60 + n.mi;
      if (now < CGL_DAY - 60) { day = today; start = cglCeil(now + 1, 30); }
    }
    spec = { kind: 'timed', day, start, end: Math.min(CGL_DAY, start + CGL_CLICK_LEN) };
    if (d.root) {
      // Bring the slot into view first.
      const top = start / 60 * CAL_HOUR_PX, head = d.root.querySelector('.wv-head');
      const hh = head ? head.offsetHeight : 0, view = d.root.clientHeight - hh;
      if (top < d.root.scrollTop || top + 80 > d.root.scrollTop + view) d.root.scrollTop = Math.max(0, top - view / 3);
    }
  }
  if (d.root) _cgePaintSpec(d, spec);
  else d.anchor = document.querySelector('#main-body .cal-h [data-new]') || document.querySelector('#main-body .cal-h');
  _cgeQuickCreate(d, spec);
}

/* ---------- the quick-create popover ---------- */
function _cgeCloseQC() { if (_cgeQC && _cgeQC.close) _cgeQC.close(); }
function _cgeDraftAnchor(d) {
  const els = [...(d.ghosts || []), d.laneGhost, d.mghost].filter(x => x && x.isConnected && !x.hidden);
  return els[0] || (d.anchor && d.anchor.isConnected ? d.anchor : null);
}
/** Google places it beside the draft: to the right when there is room, else to the left. */
function _cgePlaceQC() {
  const q = _cgeQC;
  if (!q || !q.pop || !q.pop.isConnected) return;
  const a = _cgeDraftAnchor(q.d);
  if (!a) return;
  const r = a.getBoundingClientRect(), pw = q.pop.offsetWidth, ph = q.pop.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
  let left = r.right + 12, top = r.top - 36;
  if (left + pw > vw - 8) left = r.left - 12 - pw;
  if (left < 8) { left = Math.max(8, Math.min(vw - pw - 8, r.left + r.width / 2 - pw / 2)); top = r.bottom + 8 + ph > vh - 8 ? r.top - ph - 8 : r.bottom + 8; }
  q.pop.style.left = Math.round(left) + 'px';
  q.pop.style.top = Math.round(Math.max(8, Math.min(vh - ph - 8, top))) + 'px';
}
function _cgeWhenText(s) {
  if (s.kind === 'timed') return `${_cgeDayLabel(s.day, true)} · ${_cgeRange(s.start, s.end)}`;
  return s.first === s.last ? `${_cgeDayLabel(s.first, true)} · All day` : `${_cgeSpanLabel(s.first, s.last)} · All day`;
}
function _cgeQuickCreate(d, spec) {
  const anchor = _cgeDraftAnchor(d);
  if (!anchor) { _cgeClearVisuals(d); return; }
  const cals = _cgeWritableCalendars();
  const cw = _cgeCW();
  const rawCals = CalStore.data && Array.isArray(CalStore.data.calendars) ? CalStore.data.calendars : [];
  const why = cw.shim ? _CGE_NO_WRITE
    : cals.length ? ''
      : CalStore.access() === 'no' ? 'Connect Google Calendar in Connections to add events.'
        : rawCals.length && !rawCals.some(c => c && c.accessRole) ? 'Update the calendar once so the dashboard learns which calendars you can add events to.'
          : 'None of your calendars can be changed from here.';
  let kind = cals.length ? _cgeLastKind : 'task';
  let calId = (cals.find(c => c.id === _cgeLastCal) || cals.find(c => c.primary) || cals[0] || {}).id || null;
  let saving = false, pop = null, titleIn = null, locIn = null;
  const close = openPopover(anchor, (el, closeFn) => {
    pop = el;
    el.setAttribute('aria-label', 'New event');
    el.innerHTML = `<div class="cge-qc-top"><button type="button" class="btn-icon btn-sm" data-x aria-label="Close" data-tip="Close" data-kbd="Esc">${icon('x')}</button></div>`
      + '<input type="text" class="cge-qc-title" placeholder="Add title" aria-label="Title" autocomplete="off" maxlength="300" autofocus>'
      + `<div class="seg cge-qc-kind" role="tablist" aria-label="Add as"><button type="button" role="tab" data-k="event">${icon('calendar', 'i-sm')}<span>Event</span></button><button type="button" role="tab" data-k="task">${icon('circle-check', 'i-sm')}<span>Task</span></button></div>`
      + '<div class="cge-qc-rows">'
      + `<div class="cge-qc-row">${icon('clock', 'i-sm')}<span class="cge-qc-when"></span></div>`
      + `<label class="cge-qc-row" data-for="event">${icon('map-pin', 'i-sm')}<input type="text" class="cge-qc-loc" placeholder="Add location" aria-label="Location" autocomplete="off" maxlength="200"></label>`
      + `<label class="cge-qc-row" data-for="event">${icon('calendar', 'i-sm')}<span class="cge-qc-dot"></span><select class="control control-sm cge-qc-cal" aria-label="Calendar"></select></label>`
      + `<div class="cge-qc-row" data-for="task">${icon('timer', 'i-sm')}<span class="cge-qc-tnote"></span></div>`
      + '<p class="cge-qc-why" hidden></p>'
      + '</div>'
      + '<div class="cge-qc-f"><button type="button" class="btn btn-ghost btn-sm" data-more>More options</button><button type="button" class="btn btn-primary btn-sm" data-save>Save</button></div>';
    titleIn = el.querySelector('.cge-qc-title');
    locIn = el.querySelector('.cge-qc-loc');
    el.querySelector('.cge-qc-when').textContent = _cgeWhenText(spec);
    el.querySelector('.cge-qc-tnote').textContent = spec.kind === 'timed'
      ? `Planned for ${calDurText(spec.end - spec.start)} · #tag !p1 +stream work in the title`
      : 'Due that day · #tag !p1 +stream work in the title';
    const sel = el.querySelector('.cge-qc-cal');
    for (const c of cals) { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name + (c.primary ? ' (main)' : ''); if (c.id === calId) o.selected = true; sel.appendChild(o); }
    const dot = el.querySelector('.cge-qc-dot');
    const paintCal = () => {
      const c = cals.find(x => x.id === calId);
      dot.className = 'cge-qc-dot c-' + (c ? c.color : 'blue');
      if (kind === 'event') _cgeColorSet(d, c ? c.color : 'blue', false);
    };
    sel.onchange = () => { calId = sel.value; _cgeLastCal = calId; paintCal(); };
    const evBtn = el.querySelector('[data-k="event"]');
    if (why) { evBtn.disabled = true; evBtn.setAttribute('data-tip', why); }
    const setKind = (k, user) => {
      if (k === 'event' && why) return;
      kind = k;
      if (user) _cgeLastKind = k;
      el.querySelectorAll('[data-k]').forEach(b => { const on = b.dataset.k === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      el.querySelectorAll('[data-for]').forEach(r => { r.hidden = r.dataset.for !== k; });
      el.setAttribute('aria-label', k === 'event' ? 'New event' : 'New task');
      if (k === 'task') _cgeColorSet(d, d.color, true); else paintCal();
      const w = el.querySelector('.cge-qc-why');
      w.hidden = !(k === 'task' && why);
      w.textContent = why;
      requestAnimationFrame(_cgePlaceQC);
    };
    el.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { setKind(b.dataset.k, true); titleIn.focus(); }; });
    titleIn.addEventListener('input', () => _cgeTitleSet(d, titleIn.value.trim()));
    titleIn.addEventListener('keydown', (k) => { if (k.key === 'Enter' && !k.isComposing) { k.preventDefault(); save(); } });
    locIn.addEventListener('keydown', (k) => { if (k.key === 'Enter' && !k.isComposing) { k.preventDefault(); save(); } });
    el.querySelector('[data-x]').onclick = () => closeFn();
    el.querySelector('[data-save]').onclick = () => save();
    el.querySelector('[data-more]').onclick = () => more();
    setKind(kind, false);
  }, { width: 380, className: 'cge-qc', role: 'dialog', onClose: () => { if (_cgeQC && _cgeQC.d === d) _cgeQC = null; if (!saving) _cgeClearVisuals(d); } });
  _cgeQC = { d, spec, close, pop };
  _cgePlaceQC();
  setTimeout(() => { try { if (titleIn && titleIn.isConnected) titleIn.focus({ preventScroll: true }); } catch (e) { /* closed already */ } }, 0);

  const when = () => (spec.kind === 'timed' ? cglTimedPatch(spec.day, spec.start, spec.end) : cglAllDayPatch(spec.first, spec.last));
  function save() {
    const title = titleIn.value.trim();
    if (kind === 'event') {
      const args = Object.assign({ title: title || '(No title)' }, when());
      if (calId) args.calendarId = calId;
      if (locIn.value.trim()) args.location = locIn.value.trim();
      saving = true;
      close();
      _cgeAnnounce('Saving the event to Google Calendar');
      let p;
      try { p = cw.create(args); } catch (e) { p = Promise.reject(e); }
      if (!d.root || !d.root.isConnected || d.month) _cgeClearVisuals(d);   // CalWrite already drew the new event
      Promise.resolve(p).then((r) => { _cgeClearVisuals(d); _cgePaintPending(); if (r && r.ok === false && cw.shim) toast(_CGE_NO_WRITE, { kind: 'err' }); },
        (err) => { _cgeClearVisuals(d); _cgePaintPending(); if (cw.shim) toast((err && err.message) || _CGE_NO_WRITE, { kind: 'err' }); });
      return;
    }
    if (!title) {
      titleIn.placeholder = 'Give the task a name';
      titleIn.focus();
      if (!_cgeReduced() && titleIn.animate) titleIn.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 280 });
      return;
    }
    const parsed = typeof parseQuickAdd === 'function' ? parseQuickAdd(title) : { title, tags: [] };
    const timed = spec.kind === 'timed';
    const id = addCustomTask(parsed.title || title, timed ? spec.day : spec.first, parsed.priority && parsed.priority !== 'p0' ? parsed.priority : 'p0',
      parsed.tags || [], parsed.stream || null, parsed.recurrence || 'none', {
        dueTime: timed ? _calHM(spec.start) : null, estimate: timed ? spec.end - spec.start : (parsed.estimate || null),
        people: parsed.people || [], newPeople: parsed.newPeople || [],
      });
    if (!id) return;
    saving = true;
    close();
    _cgeClearVisuals(d);
    toast('Task added', { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
  }
  // The full editor grows out of the draft (the card measures it before the popover goes).
  function more() {
    const title = titleIn.value.trim();
    const from = _cgeDraftAnchor(d);
    if (kind === 'task') {
      const timed = spec.kind === 'timed';
      const pre = { title, date: timed ? spec.day : spec.first, time: timed ? _calHM(spec.start) : null, minutes: timed ? spec.end - spec.start : null };
      if (typeof tcOpenCreate === 'function' && typeof itemOpenMode === 'function' && itemOpenMode() === 'card') tcOpenCreate(pre, { from }); else calNewTaskDialog(pre);
      close();
      return;
    }
    const w = when();
    const pre = { title, start: w.start, end: w.end, allDay: w.allDay, calendarId: calId || undefined, location: locIn.value.trim() || undefined };
    // The centre card's event editor (46-cal-event-edit.js); without it, Google's own full editor.
    if (typeof evcOpenCreate === 'function' && typeof openEvent === 'function') { openEvent(null, { create: pre, from }); close(); return; }
    close();
    window.open(googleCalendarUrl({ title, date: spec.kind === 'timed' ? spec.day : spec.first, time: spec.kind === 'timed' ? _calHM(spec.start) : null, minutes: spec.kind === 'timed' ? spec.end - spec.start : null, location: pre.location }), '_blank', 'noopener');
  }
}

/* ---------- keys ---------- */
window.addEventListener('keydown', (e) => {
  if (!_cgeOnCal()) return;
  if (_cgeDrag && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); _cgeCancel(); return; }
  if (_cgeDrag || e.defaultPrevented || e.isComposing) return;
  if (_cgeKey && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); _cgeKeyCancel(); return; }
  const t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if ([...document.querySelectorAll('.modal, .pop, .cmd, .drawer')].some(n => n.getClientRects().length > 0) || document.getElementById('kb-overlay')?.classList.contains('open')) return;
  if (typeof tcIsOpen === 'function' && tcIsOpen()) return;
  if (typeof _gPending !== 'undefined' && _gPending && Date.now() - _gPending < 1200) return;   // "g then a letter" belongs to the shell
  // Ctrl/Cmd+Z, as Google: the last calendar change when it is the newest thing to undo (else the app's undo, 90-wiring.js).
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && String(e.key).toLowerCase() === 'z' && _cgeUndo()) { e.preventDefault(); e.stopPropagation(); return; }
  const sel = _cgeSelected();
  const act = cglKeyAction(e, { hasEvent: !!sel, taskOpen: !!state.selectedTaskId, by: 'grid' });
  if (!act) return;
  if (act === 'escape') {
    if (typeof _calOpenEventId !== 'undefined' && _calOpenEventId) return;   // the side panel closes first (41)
    if (!sel) return;
    _cgeSelect(null);
    if (document.activeElement === sel) sel.blur();
    e.preventDefault(); e.stopPropagation();
    return;
  }
  if (act === 'open' && e.key === 'Enter' && document.activeElement === sel) return;   // the button's own click opens it
  e.preventDefault(); e.stopPropagation();
  if (act === 'create') calGridCreate();
  else if (act === 'next' || act === 'prev') calStep(act === 'next' ? 1 : -1);
  else if (act === 'open') calOpenEvent(sel.dataset.id, sel);
  else if (act === 'delete') _cgeDelete(sel.dataset.id);
  else if (act === 'undo') { if (!_cgeUndo() && typeof undo === 'function') undo(); }
  else _cgeNudge(sel, act);
}, true);
/** Undo the last calendar change (CalWrite's inverse write); false when there is none to undo. */
function _cgeUndo() {
  const cw = _cgeCW();
  try { return typeof cw.undoLast === 'function' && !!cw.undoLast(); } catch (e) { return false; }
}

/** Delete the event (with a confirmation; CalWrite asks itself when guests or a series are involved). */
function _cgeDelete(id) {
  const ev = calEventById(id);
  const ce = calGridCanEdit(ev);
  if (!ce.ok) { toast(ce.reason, { icon: 'lock' }); return; }
  const cw = _cgeCW();
  let guests = [];
  try { guests = cw.guests(ev) || []; } catch (e) { guests = []; }
  const go = () => {
    let p;
    try { p = cw.remove(id); } catch (e) { p = Promise.reject(e); }
    Promise.resolve(p).catch((err) => { if (cw.shim) toast((err && err.message) || _CGE_NO_WRITE, { kind: 'err' }); });
  };
  if (guests.length || ev.recurring) { go(); return; }
  confirmDialog({ title: 'Delete this event?', text: `“${ev.summary || '(No title)'}” will be deleted from Google Calendar.`, confirmLabel: 'Delete', danger: true })
    .then((ok) => { if (ok) go(); });
  // Google deletes on the one key; here Delete then Enter does (the confirm stays: an undo re-creates
  // the event under a new id, without its Meet link or the dashboard's notes). The dialog focuses Close first.
  setTimeout(() => { const b = document.querySelector('.modal .modal-f .btn-danger'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { /* closed */ } }, 0);
}
/** Alt+arrows: move the selected event 15 minutes / a day (a week in the month), Alt+Shift+Up/Down: shorter / longer. Written once the keys settle. */
function _cgeNudge(el, act) {
  const id = el.dataset.id;
  const ev = calEventById(id);
  const ce = calGridCanEdit(ev);
  if (!ce.ok) { const r = el.getBoundingClientRect(); _cgeHint(r.left + r.width / 2, r.top + 4, ce.reason); return; }
  const month = !!el.closest('.month');
  let k = _cgeKey;
  if (k && k.id !== id) { _cgeKeyCommit(); k = null; }
  if (!k) {
    const g = cglEventGeom(ev);
    const root = el.closest(month ? '.month' : '.wv');
    k = _cgeKey = { id, g, day: g.startDay, start: g.start, end: g.end, first: g.startDay, last: g.endDay,
      d: { mode: month ? 'm-move' : g.allDay || g.dur >= CGL_DAY ? 'lane' : 'move', month, root, id, color: calEventColor(ev), title: ev.summary, timed: !g.allDay, ghosts: [] } };
    _cgeDim(k.d, true);
  }
  const span = cglDayDelta(k.first, k.last);
  const days = (n) => { k.day = cglShiftDay(k.day, n); k.first = cglShiftDay(k.first, n); k.last = cglShiftDay(k.last, n); };
  if (act === 'dayBefore' || act === 'dayAfter') days(act === 'dayAfter' ? 1 : -1);
  else if (month && (act === 'earlier' || act === 'later')) days(act === 'later' ? 7 : -7);
  else if (!k.g.allDay && (act === 'earlier' || act === 'later')) {
    const dur = k.end - k.start;
    const r = cglMoveTimed({ day: k.day, min: k.start + (act === 'later' ? CGL_STEP : -CGL_STEP) }, { grab: 0, dur, overnight: k.g.overnight });
    k.start = r.start; k.end = r.end;
  } else if (!k.g.allDay && (act === 'shorter' || act === 'longer')) {
    k.end = cglResizeEnd(k.start, k.end + (act === 'longer' ? CGL_STEP : -CGL_STEP), k.g.overnight ? 2 * CGL_DAY : CGL_DAY);
  } else return;
  k.last = cglShiftDay(k.first, span);
  _cgeKeyPaint();
  _cgeAnnounce(k.g.allDay ? _cgeSpanLabel(k.first, k.last) : `${_cgeDayLabel(k.day, true)}, ${_cgeRange(k.start, k.end)}`);
  clearTimeout(k.timer);
  k.timer = setTimeout(_cgeKeyCommit, _CGE_KEY_SETTLE);
}
function _cgeKeyPaint() {
  const k = _cgeKey;
  if (!k || !k.d.root || !k.d.root.isConnected) return;
  _cgeDim(k.d, true);
  if (k.d.month) _cgePaintMonth(k.d, k.first, k.last, k.g.allDay ? '' : _cgeHm(k.start));
  else if (k.d.mode === 'lane') _cgePaintLane(k.d, k.first, k.last);
  else _cgePaintTimed(k.d, k.day, k.start, k.end);
}
function _cgeKeyCommit() {
  const k = _cgeKey;
  if (!k) return;
  clearTimeout(k.timer);
  _cgeKey = null;
  const g = k.g;
  const same = k.first === g.startDay && k.start === g.start && k.end === g.end;
  if (same) { _cgeClearVisuals(k.d); return; }
  const patch = g.allDay ? cglAllDayPatch(k.first, k.last) : cglTimedPatch(k.day, k.start, k.end);
  const sameStart = k.first === g.startDay && k.start === g.start;
  _cgeWrite(k.d, () => (sameStart && !g.allDay ? _cgeCW().resize(k.id, { end: patch.end }) : _cgeCW().move(k.id, patch)));
}
function _cgeKeyCancel() { const k = _cgeKey; if (!k) return; clearTimeout(k.timer); _cgeKey = null; _cgeClearVisuals(k.d); _cgeAnnounce('Cancelled'); }

/* ---------- palette ---------- */
registerCommand({ id: 'cal-new-event', label: 'Calendar: new event', icon: 'calendar-plus', group: 'Create', keywords: 'calendar google event create add meeting', kbd: 'C',
  when: () => (APP_CONFIG.features || {}).calendar !== false, run: () => calGridCreate() });
