/* ============================================================
   CENTRE CARD (owner: Tasks): the one way an item opens.
   User request, 3 Oct: "when we click tasks ... it appears in the center and becomes
   big in the center, in the same way as when we click calendar events, very
   similar style to google calendar" and "a center opening screen is easier as
   it keeps the UI centered and easy to type and change and add things".

   PUBLIC API (stable; other areas call these, never the _tc* internals):
     openTask(id, {from, mode, list, push, context}) -> 'card' | 'panel' | false
         id      task id
         from    the element it was opened from (row, card, chip): the card
                 grows out of it and focus returns to it on close
         mode    'card' | 'panel' to override Settings > Tasks for this one open
         list    ids for previous/next (default: the rendered list it came from)
         push    true: stack it on the open card with Back (default: only when
                 opened from inside the card)
         context 'home' adds Home's "Hide from Focus today" to the card's menu
     openEvent(id, {from, mode, push})  a calendar event (same options)
     tcOpenCreate(prefill, {from})      a new task in create mode; prefill is
                 quick-add text or {title, date, time, minutes, eventId,
                 people, detail, stream, tags, priority, onCreated(id)}
     tcClose({instant}), tcIsOpen(), tcCurrentTaskId(), itemOpenMode(),
     itemOpenTarget() (where the next open lands: 'panel' whenever the side
     panel is showing something), switchItemMode(mode) (the switch buttons)
   SIDE PANEL STAYS OPEN: once the side panel shows a task or an event, every
   other open swaps into it (no close / reopen); it closes only on x / Esc or
   "Open in the centre". The card's "Open in side panel" switches the mode for
   this session (not the saved setting); "Open in the centre" switches back.
   Opening the task that is already open does nothing (no replayed motion).
   Settings > Tasks > "Open tasks and events in": Centre card (default) | Side
   panel (UI key state.openItemsIn; itemOpenMode()). The card's "Open in side
   panel" and the side panel's "Open in the centre" switch one item; the
   setting stays. New task (openNewTask, the calendar's New / Create task) opens
   the card in create mode in card mode; the side-panel mode keeps the dialogs.

   One card, a stack of views: a related task opened from an event card (a
   meeting from a task card, Create task from an event) replaces the view, with
   Back. Esc leaves a field first, then goes back one view, then closes.
   Content: the task detail builders (60-task-detail.js) and the event parts
   (43-calendar-panel.js calEventParts). renderDetail() calls tcRefresh() on
   every render, so live sync (MCP), undo and edits elsewhere show at once.
   Header band: the item's animated scene, big, tinted with the stream (or
   calendar) colour; click it to change the scene (animPickType, 78-brief-hooks).
   Settings > Tasks can turn the band off.
   Motion: the card grows out of the row it was opened from and shrinks back
   into it; a bottom sheet at <= 700 px; nothing moves with reduced motion.
   Focus is trapped inside and returns to the row. Keys: Esc, Tab, Ctrl+Enter
   (done / create and close), Up/Down or J/K (previous / next task in the list),
   the task keys X S T D P 1-4 E . Del, Alt+Left (back), M (maximise).
   Size: drag the edges or corners, or the maximise toggle (M); remembered in
   localStorage as window type 'card' (13-splitter.js makeResizable);
   double-click an edge to reset.
   ============================================================ */

const TC_STACK_MAX = 12;
let _tc = null;   // the open card: {root, scrim, card, hero, inner, stack, list, returnFocus, context, ...}

/* ---------- the setting ---------- */
/** Where tasks and events open: 'card' (default) or 'panel'. */
/** The saved setting (Settings > Tasks): 'card' (default) or 'panel'. */
function itemOpenSetting() {
  const v = typeof state !== 'undefined' && state ? state.openItemsIn : null;
  return v === 'panel' ? 'panel' : 'card';
}
/**
 * Where the next task / event opens. The card's "Open in side panel" and the
 * panel's "Open in the centre" switch it for this session (until a reload or a
 * change in Settings), without changing the saved setting.
 */
let _itemModeSession = null;
function itemOpenMode() { return _itemModeSession || itemOpenSetting(); }
function setItemOpenMode(mode) {
  state.openItemsIn = mode === 'panel' ? 'panel' : 'card';
  _itemModeSession = null;
  saveUI();
}
/** One of the switch buttons was used: the rest of this session opens items there. */
function switchItemMode(mode) { _itemModeSession = mode === 'panel' ? 'panel' : 'card'; }
/**
 * The mode one open uses: an explicit o.mode, else the side panel whenever it is
 * already showing something (a new item swaps into it; it never closes under
 * you), else itemOpenMode(). User request, 3 Oct: "the side bar should always remain open".
 */
function _itemModeFor(o) {
  if (o && (o.mode === 'panel' || o.mode === 'card')) return o.mode;
  if (typeof detailPaneOpen === 'function' && detailPaneOpen()) return 'panel';
  return itemOpenMode();
}
/** Where the next open lands right now ('card' | 'panel'), for callers that choose between the two themselves. */
function itemOpenTarget() { return _itemModeFor(null); }
/** The big animated scene band at the top of the card (and the small one in the side panel). */
function itemHeroOn() { return !(typeof state !== 'undefined' && state && state.itemHero === false); }
function tcIsOpen() { return !!_tc; }
/** The task the card shows now (null: closed, an event or a new task). */
function tcCurrentTaskId() { const c = _tc && !_tc.closing ? _tcCur() : null; return c && c.kind === 'task' ? c.id : null; }

/* ---------- opening ---------- */
/** Open a task where Settings > Tasks says (o.mode overrides): the centre card or the side panel. */
function openTask(id, o) {
  o = o || {};
  if (!id || !getItem(id)) return false;
  const mode = _itemModeFor(o);
  if (typeof _lastSelectedTaskId !== 'undefined') _lastSelectedTaskId = id;
  if (mode === 'panel') {
    if (_tc) tcClose({ instant: true, noFocus: true });
    // Into the side panel: a content swap when it is already open (same width, no close/reopen).
    if (state.selectedTaskId !== id || (typeof _dpEventId !== 'undefined' && _dpEventId)) selectTask(id);
    return 'panel';
  }
  // Already showing it: re-opening is a no-op (no replayed animation, no flicker).
  if (_tc && !_tc.closing && tcCurrentTaskId() === id && !o.push) { _tcFocusStart(); return 'card'; }
  // Measure where it came from before anything re-renders.
  const fromEl = _tcFromEl(o.from, id);
  const fromRect = fromEl ? fromEl.getBoundingClientRect() : null;
  const list = o.list || _tcListFor(id, fromEl);
  _tcClosePanel();   // only reached with an explicit {mode:'card'} while the panel is open ("Open in the centre")
  tcOpen({ kind: 'task', id, list }, Object.assign({}, o, { fromEl, fromRect }));
  return 'card';
}
/** One place at a time: the side panel closes when the card takes over. */
function _tcClosePanel() {
  if (!(typeof detailPaneOpen === 'function' ? detailPaneOpen() : state.selectedTaskId)) return;
  state.selectedTaskId = null;
  if (typeof _dpEventId !== 'undefined') _dpEventId = null;
  saveUI();
  const c = document.getElementById('content'); if (c) c.classList.remove('detail-open');
  render();
}
/** Open a calendar event the same way. Not loaded yet: the calendar finds it (side panel). */
function openEvent(id, o) {
  o = o || {};
  if (!id) return false;
  const mode = _itemModeFor(o);
  const ev = typeof calEventById === 'function' ? calEventById(id) : null;
  if (mode === 'panel' || !ev) {
    if (_tc) tcClose({ instant: true, noFocus: true });
    // Loaded: into the side panel (it swaps in when the panel already shows a task). Not loaded: the calendar finds it.
    if (ev && typeof selectEventInPanel === 'function') selectEventInPanel(id);
    else if (typeof _calOpenEventPanel === 'function') _calOpenEventPanel(id);
    return 'panel';
  }
  const now = _tc && !_tc.closing ? _tcCur() : null;
  if (now && now.kind === 'event' && now.id === id && !o.push) { _tcFocusStart(); return 'card'; }
  _tcClosePanel();
  if (typeof _calOpenEventId !== 'undefined' && _calOpenEventId) { _calOpenEventId = null; render(); }
  const fromEl = o.from && o.from.isConnected ? o.from : null;
  tcOpen({ kind: 'event', id }, Object.assign({}, o, { fromEl, fromRect: fromEl ? fromEl.getBoundingClientRect() : null }));
  return 'card';
}
/** The card in create mode. prefill: text ("+work Email Sam fri") or {title, date, time, minutes, eventId, people, detail, stream, tags, priority, onCreated}. */
function tcOpenCreate(prefill, o) {
  o = o || {};
  const draft = tcDraftFrom(prefill, state.view, typeof quickAddDefaults === 'function' && typeof isTaskView === 'function' && isTaskView(state.view) ? quickAddDefaults(state.view) : {});
  const ae = document.activeElement;
  const fromEl = o.from && o.from.isConnected ? o.from
    : (ae && ae !== document.body && ae.getBoundingClientRect && !(_tc && _tc.card.contains(ae)) && ae.offsetParent !== null ? ae : null);
  tcOpen({ kind: 'create', draft }, Object.assign({}, o, { fromEl, fromRect: fromEl ? fromEl.getBoundingClientRect() : null }));
  return 'card';
}

/** Show `entry` in the card: a new card, or (already open) a new view in it. */
function tcOpen(entry, o) {
  o = o || {};
  if (_tc) {
    const inside = (o.from && _tc.card.contains(o.from)) || _tc.card.contains(document.activeElement);
    const push = o.push === true || (o.push !== false && inside);
    if (push) { _tc.stack.push(entry); if (_tc.stack.length > TC_STACK_MAX) _tc.stack.shift(); }
    else _tc.stack[_tc.stack.length - 1] = entry;
    if (o.context) _tc.context = o.context;
    _tcPaint({ swap: push ? 'push' : 'swap' });
    _tcFocusStart();
    return;
  }
  _tcBuild(o);
  _tc.stack = [entry];
  _tc.context = o.context || null;
  _tcPaint();
  _tcAnimateIn(o.fromRect);
  _tcFocusStart();
}

/* ---------- pure helpers (tests/task-card.test.mjs) ---------- */
/** Position of `id` in `list` (ids that no longer exist are skipped): {i, n, prev, next}. */
function tcNavInfo(list, id, exists) {
  const ids = (Array.isArray(list) ? list : []).filter((x, i, a) => x && a.indexOf(x) === i && (!exists || exists(x) || x === id));
  const i = ids.indexOf(id);
  if (i < 0) return { i: -1, n: ids.length, prev: null, next: null };
  return { i, n: ids.length, prev: i > 0 ? ids[i - 1] : null, next: i < ids.length - 1 ? ids[i + 1] : null };
}
/** A new-task draft from a prefill (text or object) and the view's defaults (quickAddDefaults). */
function tcDraftFrom(prefill, view, defaults) {
  const p = typeof prefill === 'string' ? { title: prefill } : Object.assign({}, prefill || {});
  const d = defaults || {};
  const uniq = (a) => [...new Set((a || []).filter(Boolean))];
  return {
    key: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: String(p.title || ''), detail: String(p.detail || ''),
    dueDate: p.date || p.dueDate || d.dueDate || null,
    dueTime: p.time || p.dueTime || null,
    priority: /^p[0-3]$/.test(p.priority || '') ? p.priority : (/^p[0-3]$/.test(d.priority || '') ? d.priority : 'p0'),
    stream: p.stream || d.stream || null,
    tags: uniq([...(d.tags || []), ...(p.tags || [])]),
    people: uniq([...(d.people || []), ...(p.people || [])]),
    newPeople: [],
    recurrence: p.recurrence || 'none',
    estimate: Number(p.minutes || p.estimate) || null,
    eventId: p.eventId || null,
    onCreated: typeof p.onCreated === 'function' ? p.onCreated : null,
    ignore: [],
  };
}
/**
 * What the draft will create: the card's fields, with anything typed in the
 * title (dates, !p1, #tag, +stream, @person, ~2h, every week) on top. -> addCustomTask args.
 */
function tcDraftResolve(d, parse) {
  parse = parse || (typeof parseQuickAdd === 'function' ? parseQuickAdd : null);
  const parsed = parse ? parse(d.title || '', d.ignore && d.ignore.length ? { ignore: d.ignore } : undefined) : { title: String(d.title || '').trim(), tags: [], people: [], newPeople: [] };
  const uniq = (a) => [...new Set((a || []).filter(Boolean))];
  const dueDate = parsed.dueDate || d.dueDate || null;
  return {
    title: String(parsed.title || '').trim(),
    dueDate,
    dueTime: dueDate ? (parsed.dueTime || d.dueTime || null) : null,
    priority: parsed.priority && parsed.priority !== 'p0' ? parsed.priority : (d.priority || 'p0'),
    stream: parsed.stream || d.stream || null,
    tags: uniq([...(d.tags || []), ...(parsed.tags || [])]),
    people: uniq([...(d.people || []), ...(parsed.people || [])]),
    newPeople: uniq([...(d.newPeople || []), ...(parsed.newPeople || [])]),
    recurrence: parsed.recurrence && parsed.recurrence !== 'none' ? parsed.recurrence : (d.recurrence || 'none'),
    estimate: parsed.estimate || d.estimate || null,
    detail: d.detail || '',
  };
}
/* ---------- small DOM helpers ---------- */
function _tcCur() { return _tc && _tc.stack.length ? _tc.stack[_tc.stack.length - 1] : null; }
function _tcReduced() { return !!(window.Motion && Motion.prefersReduced()) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
function _tcSheet() { return !!(window.matchMedia && window.matchMedia('(max-width: 700px)').matches); }
function _tcIsField(t) { return !!t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable); }
function _tcVisible(el) { return !!el && el.getClientRects().length > 0; }
/** A menu, dialog, drawer, the palette or the shortcuts sheet is on top (they own the keyboard then). */
function _tcOverlay() {
  if (!_tc) return false;
  for (const n of document.querySelectorAll('.pop:not([hidden]), .modal, .cmd, .drawer, #kb-overlay.open, .modal-overlay.open')) {
    if (_tc.card.contains(n)) continue;
    if (_tcVisible(n)) return true;
  }
  return false;
}
/** The row / card / chip a task shows as on the page (to grow out of and return to). */
function _tcRowFor(id) {
  if (!id) return null;
  const q = `[data-id="${CSS.escape(id)}"]`;
  for (const sel of [`#main-body .task${q}`, `#main-body .hf-card${q}`, `#main-body ${q}`, `.ppl-panel ${q}`]) {
    for (const n of document.querySelectorAll(sel)) if (_tcVisible(n) && !(_tc && _tc.root.contains(n))) return n;
  }
  return null;
}
function _tcFromEl(from, id) {
  if (from && from.isConnected && from.getBoundingClientRect) return from;
  return _tcRowFor(id);
}
/** The list prev/next walks through: the rendered task list, else the siblings of the row it came from. */
function _tcListFor(id, fromEl) {
  if (typeof _lastRenderedTaskIds !== 'undefined' && Array.isArray(_lastRenderedTaskIds) && _lastRenderedTaskIds.includes(id)) return _lastRenderedTaskIds.slice();
  const host = fromEl && fromEl.parentElement;
  if (host && !(_tc && _tc.card.contains(host))) {
    const ids = [...host.querySelectorAll(':scope > [data-id]')].map(n => n.dataset.id).filter(x => getItem(x));
    if (ids.includes(id) && ids.length > 1) return [...new Set(ids)];
  }
  return [id];
}
function _tcBtn(ic, label, run, o) {
  o = o || {};
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'btn-icon tc-ib' + (o.on ? ' on' : '') + (o.cls ? ' ' + o.cls : '');
  b.innerHTML = icon(ic);
  b.setAttribute('aria-label', label); b.setAttribute('data-tip', label);
  if (o.kbd) b.setAttribute('data-kbd', o.kbd);
  if (o.fk) b.dataset.fk = o.fk;
  if (o.pressed !== undefined) b.setAttribute('aria-pressed', o.pressed ? 'true' : 'false');
  if (o.disabled) b.disabled = true;
  b.onclick = (e) => { e.stopPropagation(); run(e.currentTarget); };
  return b;
}
function _tcGroup(cls, nodes) {
  const g = document.createElement('div'); g.className = 'tc-grp' + (cls ? ' ' + cls : '');
  for (const n of nodes) if (n) g.appendChild(n);
  return g;
}
function _tcMaxBtn() {
  const m = _tcIsMax();
  return _tcBtn(m ? 'minimize-2' : 'maximize-2', m ? 'Restore size' : 'Maximise', () => tcToggleMax(), { kbd: 'M', fk: 'tc-max', cls: 'tc-maxbtn', pressed: m });
}
function _tcSep() { const s = document.createElement('span'); s.className = 'tc-sep'; s.setAttribute('aria-hidden', 'true'); return s; }
function _tcEntryLabel(e) {
  if (!e) return '';
  if (e.kind === 'task') { const it = getItem(e.id); return it ? effTitle(it) : 'task'; }
  if (e.kind === 'event') { const ev = typeof calEventById === 'function' ? calEventById(e.id) : null; return ev ? String(ev.summary || 'event') : 'event'; }
  return 'New task';
}
function _tcKeyOf(e) { return e.kind + ':' + (e.kind === 'create' ? e.draft.key : e.id); }
function _tcValid(e) {
  if (!e) return false;
  if (e.kind === 'task') return !!getItem(e.id);
  if (e.kind === 'event') return typeof calEventById === 'function' && !!calEventById(e.id);
  return true;
}

/* ---------- the frame ---------- */
function _tcBuild(o) {
  const root = document.createElement('div'); root.className = 'tc-root';
  const scrim = document.createElement('div'); scrim.className = 'tc-scrim'; scrim.setAttribute('aria-hidden', 'true');
  const card = document.createElement('section'); card.className = 'tc';
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.tabIndex = -1;
  const hero = document.createElement('div'); hero.className = 'tc-hero'; hero.hidden = true;
  const grab = document.createElement('div'); grab.className = 'tc-grab'; grab.setAttribute('aria-hidden', 'true'); grab.innerHTML = '<i></i>';
  const inner = document.createElement('div'); inner.className = 'tc-in';
  card.append(hero, grab, inner);
  root.append(scrim, card);
  document.body.appendChild(root);
  // Resize: the side edges, the bottom edge and the bottom corners; remembered (13-splitter.js makeResizable).
  if (typeof makeResizable === 'function') makeResizable(card, { key: 'card', center: 'xy', edges: ['e', 'w', 's', 'se', 'sw'], min: { w: 560, h: 360 }, vars: { w: '--tc-w', h: '--tc-h' } });
  _tc = { root, scrim, card, hero, grab, inner, stack: [], returnFocus: document.activeElement, fromEl: o.fromEl || null, heroKey: null, paintedKey: null, downOnBackdrop: false };
  // A click on the backdrop closes (not the click that closed a menu, nor a drag that started inside).
  root.addEventListener('pointerdown', (e) => { if (!_tc) return; _tc.downOnBackdrop = (e.target === root || e.target === scrim) && !_tc.popAtDown; });
  root.addEventListener('click', (e) => { if (_tc && (e.target === root || e.target === scrim) && _tc.downOnBackdrop) tcClose(); });
  // A field that saves on blur re-renders the card while focus is on its way to the next control:
  // remember where it was going (capture phase runs before the field's own onblur) and put it there.
  card.addEventListener('blur', (e) => {
    if (!_tc) return;
    const rt = e.relatedTarget;
    _tc.nextFocus = rt && card.contains(rt) ? { fk: rt.dataset ? rt.dataset.fk : null, idx: _tcFocusables().indexOf(rt), at: Date.now() } : null;
  }, true);
  document.addEventListener('pointerdown', _tcDownCapture, true);
  document.addEventListener('keydown', _tcKey, true);
  root.addEventListener('keydown', _tcKeyBubble);
  grab.addEventListener('pointerdown', _tcSheetDragStart);
  document.body.classList.add('tc-open');
  _tcApplySize();
}
function _tcDownCapture(e) {
  if (!_tc) return;
  // Was a menu open when this press started? Then the press only closes the menu.
  _tc.popAtDown = [...document.querySelectorAll('.pop:not([hidden])')].some(n => !_tc.card.contains(n) && _tcVisible(n) && !n.contains(e.target));
}
/** Maximised (remembered with the card's size in localStorage, 13-splitter.js). */
function _tcIsMax() { const v = typeof rzLoad === 'function' ? rzLoad('card') : null; return !!(v && v.max); }
function _tcApplySize() { if (_tc) _tc.card.classList.toggle('is-max', _tcIsMax()); }
function tcToggleMax() {
  if (typeof rzSave === 'function') rzSave('card', { max: !_tcIsMax() });
  _tcApplySize();
  if (_tc) _tcPaint();
}

/* ---------- painting ---------- */
/** Rebuild the current view (keeps the field being typed in, its caret and the scroll position). */
function _tcPaint(o) {
  o = o || {};
  if (!_tc) return;
  let cur = _tcCur();
  // Gone (binned, merged, the event no longer loaded): step back, or close.
  while (cur && !_tcValid(cur)) { _tc.stack.pop(); cur = _tcCur(); }
  if (!cur) { tcClose({ instant: true }); return; }
  const key = _tcKeyOf(cur);
  const same = _tc.paintedKey === key;
  const inner = _tc.inner;
  const keep = same ? _tcCapture(inner) : null;
  const sc0 = inner.querySelector('.tc-scroll');
  const scroll = same && sc0 ? sc0.scrollTop : 0;
  const hadFocus = inner.contains(document.activeElement);
  // Autosave: a small "Saved" when a change to what the card shows was saved.
  const saves = (state && state._saveCount) || 0;
  if (same && _tc.saveCount != null && saves > _tc.saveCount) _tcFlashSaved();
  _tc.saveCount = saves;
  inner.innerHTML = '';
  _tc.card.dataset.kind = cur.kind;
  _tc.card.classList.toggle('is-stacked', _tc.stack.length > 1);
  _tcHeroSync(cur);
  if (cur.kind === 'task') _tcTaskView(inner, cur, keep);
  else if (cur.kind === 'event') _tcEventView(inner, cur);
  else _tcCreateView(inner, cur, keep);
  _tc.paintedKey = key;
  const sc = inner.querySelector('.tc-scroll'); if (sc && scroll) sc.scrollTop = scroll;
  const nf = _tc.nextFocus; _tc.nextFocus = null;
  if (keep) _tcRestore(inner, keep);
  else if (nf && Date.now() - nf.at < 250) {
    // Focus was moving to a control this repaint replaced: the same one in the new card,
    // once the browser has finished the focus change it was in the middle of.
    setTimeout(() => {
      if (!_tc) return;
      const a = document.activeElement;
      if (a && a !== document.body && a.isConnected && _tc.card.contains(a) && a !== _tc.card) return;
      const to = (nf.fk && _tc.card.querySelector(`[data-fk="${CSS.escape(nf.fk)}"]`)) || (nf.idx >= 0 ? _tcFocusables()[nf.idx] : null);
      try { (to || _tc.card).focus({ preventScroll: true }); } catch (e) { /* gone */ }
    }, 0);
  }
  else if (hadFocus && !_tcOverlay() && (!document.activeElement || document.activeElement === document.body)) { try { _tc.card.focus({ preventScroll: true }); } catch (e) { /* gone */ } }
  _tcMarkRows();
  if (o.swap && !_tcReduced() && inner.animate) {
    const dy = o.swap === 'next' ? 10 : o.swap === 'prev' ? -10 : 0, dx = o.swap === 'push' ? 14 : o.swap === 'back' ? -14 : 0;
    inner.animate([{ opacity: 0, transform: `translate(${dx}px, ${dy}px)` }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
  }
}
function _tcFlashSaved() {
  if (!_tc) return;
  let s = _tc.saved;
  if (!s) { s = document.createElement('div'); s.className = 'tc-saved'; s.setAttribute('role', 'status'); s.innerHTML = icon('check', 'i-xs') + '<span>Saved</span>'; _tc.card.appendChild(s); _tc.saved = s; }
  s.classList.add('on');
  clearTimeout(_tcFlashSaved._t);
  _tcFlashSaved._t = setTimeout(() => { if (s) s.classList.remove('on'); }, 1400);
}
/** Called by renderDetail() on every render. */
function tcRefresh() { if (_tc && !_tc.closing) _tcPaint(); }
/** The row / chip of what the card shows stays highlighted behind it (aria-current). */
function _tcMarkRows() {
  const cur = _tc && !_tc.closing ? _tcCur() : null;
  const id = cur && (cur.kind === 'task' || cur.kind === 'event') ? cur.id : null;
  for (const n of document.querySelectorAll('.tc-current')) {
    if (id && n.dataset.id === id) continue;
    n.classList.remove('tc-current'); if (n.getAttribute('aria-current') === 'true') n.removeAttribute('aria-current');
  }
  if (!id) return;
  for (const n of document.querySelectorAll(`[data-id="${CSS.escape(id)}"]`)) {
    if (_tc.root.contains(n) || !n.closest('#main-body, .ppl-panel, #detail-pane')) continue;
    n.classList.add('tc-current'); n.setAttribute('aria-current', 'true');
  }
}

function _tcCapture(root) {
  const ae = document.activeElement;
  if (!ae || !root.contains(ae) || !ae.dataset || !ae.dataset.fk) return null;
  const typed = 'value' in ae && ae.tagName !== 'BUTTON' && ae.tagName !== 'SELECT';
  return { fk: ae.dataset.fk, value: typed ? ae.value : null, s: typed ? ae.selectionStart : null, e: typed ? ae.selectionEnd : null };
}
function _tcRestore(root, keep) {
  const el = root.querySelector(`[data-fk="${CSS.escape(keep.fk)}"]`);
  if (!el) { try { _tc.card.focus({ preventScroll: true }); } catch (e) { /* gone */ } return; }
  if (keep.value !== null && 'value' in el && el.value !== keep.value && keep.fk !== 'tag-input') el.value = keep.value;
  try { el.focus({ preventScroll: true }); if (keep.s != null && el.setSelectionRange) el.setSelectionRange(keep.s, keep.e); } catch (e) { /* not focusable */ }
}

/* ---------- the header band: the item's animated scene ---------- */
function _tcHeroSpec(cur) {
  if (typeof animSceneHtml !== 'function') return null;
  if (cur.kind === 'task') {
    const it = getItem(cur.id); if (!it || typeof animForTask !== 'function') return null;
    const a = animForTask(it) || {};
    const s = effStream(it);
    return { type: a.type || 'task', why: a.why || '', color: safeColor(STREAMS[s] && STREAMS[s].color, 'var(--accent)'),
      pick: typeof animPickType === 'function' ? (b) => animPickType(b, { kind: 'task', id: it.id, title: effTitle(it) }, a.type) : null };
  }
  if (cur.kind === 'event') {
    const ev = calEventById(cur.id); if (!ev || typeof animForEvent !== 'function') return null;
    const a = animForEvent(ev) || {};
    const c = typeof calEventColor === 'function' ? calEventColor(ev) : 'indigo';
    return { type: a.type || 'event', why: a.why || '', color: `var(--sw-${/^[a-z]+$/.test(c) ? c : 'indigo'})`,
      pick: typeof animPickType === 'function' ? (b) => animPickType(b, { kind: 'event', title: ev.summary }, a.type) : null };
  }
  // create: the scene follows what you type
  const d = cur.draft;
  let type = 'task';
  try {
    if (typeof animClassify === 'function' && typeof _animOpts === 'function' && d.title.trim()) {
      const r = tcDraftResolve(d);
      const st = STREAMS[r.stream || ''];
      type = (animClassify({ kind: 'task', title: r.title, description: d.detail.slice(0, 400), tags: r.tags, stream: st ? st.label : '', priority: r.priority, dueToday: r.dueDate === todayStr() }, _animOpts()) || {}).type || 'task';
    }
  } catch (e) { type = 'task'; }
  const s = d.stream || (typeof defaultStreamId === 'function' ? defaultStreamId() : '');
  return { type, why: 'follows the title', color: safeColor(STREAMS[s] && STREAMS[s].color, 'var(--accent)'), pick: null };
}
function _tcHeroSync(cur) {
  const hero = _tc.hero;
  const spec = itemHeroOn() ? _tcHeroSpec(cur) : null;
  _tc.card.classList.toggle('has-hero', !!spec);
  if (!spec) { hero.hidden = true; hero.innerHTML = ''; _tc.heroKey = null; return; }
  hero.hidden = false;
  hero.style.setProperty('--tc-c', spec.color);
  hero.style.setProperty('--scene-tint', spec.color);   // 76-scenes.css: the scene takes the stream / calendar colour
  hero.dataset.sceneKey = cur.kind + ':' + (cur.kind === 'create' ? cur.draft.key : cur.id);   // 71-anim-continuity.js
  const key = spec.type + '|' + spec.color;
  const label = (typeof animScene === 'function' ? animScene(spec.type).label : spec.type);
  if (_tc.heroKey !== key) {
    const was = _tc.heroKey;
    _tc.heroKey = key;
    hero.innerHTML = `<div class="tc-hero-bg" aria-hidden="true"><i></i><i></i><i></i></div>`
      + `<button type="button" class="tc-scene">${animSceneHtml(spec.type, { size: 'hero', hero: true, cls: 'is-tinted' })}</button>`;
    const sc = hero.querySelector('.anim-scene');
    if (typeof animActivate === 'function') animActivate(hero);
    if (was && !_tcReduced() && sc && sc.animate) sc.animate([{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
  }
  const b = hero.querySelector('.tc-scene');
  if (spec.pick) {
    b.disabled = false;
    b.setAttribute('aria-label', `Animation: ${label}. Change it`);
    b.setAttribute('data-tip', `${label}${spec.why ? ' · ' + spec.why : ''} · click to change`);
    b.onclick = (e) => { e.stopPropagation(); spec.pick(b); };
  } else {
    b.setAttribute('aria-label', `Animation: ${label}`);
    b.setAttribute('data-tip', `${label} · it follows what you type`);
    b.onclick = null; b.classList.add('is-static');
  }
}

/* ---------- a task ---------- */
function _tcTaskView(inner, cur, keep) {
  const id = cur.id, item = getItem(id), view = _tdViews.card;
  if (view.lastId !== id) { view.editingDesc = null; view.showAll = false; }
  view.lastId = id;
  const status = statusOf(id), done = status === 'done';
  _tc.card.setAttribute('aria-label', 'Task: ' + effTitle(item));

  /* bar */
  const nav = tcNavInfo(cur.list || [id], id, (x) => !!getItem(x));
  const left = [];
  if (_tc.stack.length > 1) left.push(_tcBackBtn());
  if (nav.n > 1) {
    left.push(_tcBtn('chevron-up', 'Previous task', () => _tcStep(-1), { kbd: 'K', disabled: !nav.prev, fk: 'tc-prev' }));
    left.push(_tcBtn('chevron-down', 'Next task', () => _tcStep(1), { kbd: 'J', disabled: !nav.next, fk: 'tc-next' }));
    const pos = document.createElement('span'); pos.className = 'tc-pos'; pos.textContent = `${nav.i + 1} of ${nav.n}`;
    left.push(pos);
  }
  const plannedToday = item.plannedFor && item.plannedFor <= todayStr();
  const right = [
    !done ? _tcBtn('sun', plannedToday ? 'Remove from Today' : 'Plan for today', () => togglePlannedToday(id), { on: plannedToday, kbd: 'T', fk: 'tc-plan', cls: 'tc-opt' }) : null,
    _tcBtn(isPinned(id) ? 'pin-off' : 'pin', isPinned(id) ? 'Unpin' : 'Pin to top', () => togglePin(id), { on: isPinned(id), fk: 'tc-pin', cls: 'tc-opt' }),
    _tcSep(),
    _tcBtn('panel-right', 'Open in side panel', () => _tcToPanel(), { fk: 'tc-panel' }),
    _tcMaxBtn(),
    _tcBtn('ellipsis', 'More: duplicate, copy, template…', (a) => _tcMoreMenu(a, id), { kbd: '.', fk: 'tc-more', cls: 'tc-more' }),
  ];
  inner.appendChild(_tcBar(left, right));

  /* head: complete, title, one line of facts */
  const head = document.createElement('div'); head.className = 'tc-head';
  const cb = tdCheckbox(id); cb.classList.add('tc-check'); cb.dataset.fk = 'tc-done';
  cb.onclick = () => _tcToggleDone(id);
  const hb = document.createElement('div'); hb.className = 'tc-hb';
  const title = tdTitleInput(id, 'tc-title');
  title.id = 'tc-title';
  hb.appendChild(title);
  hb.appendChild(_tcTaskSub(item));
  head.append(cb, hb);
  inner.appendChild(head);

  /* body: main column + properties column */
  const scroll = document.createElement('div'); scroll.className = 'tc-scroll';
  const cols = document.createElement('div'); cols.className = 'tc-cols';
  const main = document.createElement('div'); main.className = 'tc-main';
  main.appendChild(tdDescSection(id, view, () => render(), keep));
  main.appendChild(_buildSubtaskSection(item, getSubtasks(id)));
  main.appendChild(tdNotesSection(id));
  const rel = tdRelatedSection(id);
  if (rel) {
    // Meetings show in the right column with their scenes; keep them out of Related here.
    for (const g of rel.querySelectorAll('.al-group')) { const h = g.querySelector('.al-gh span'); if (h && h.textContent === 'Meetings') g.remove(); }
    main.appendChild(rel);
  }
  main.appendChild(tdActivitySection(id, view, () => _tcPaint()));
  main.appendChild(tdChatSection(id));
  const side = document.createElement('aside'); side.className = 'tc-side'; side.setAttribute('aria-label', 'Properties');
  side.appendChild(tdProps(id, { card: true }));
  const meet = _tcMeetings(id); if (meet) side.appendChild(meet);
  side.appendChild(_tcMeta(id));
  cols.append(main, side);
  scroll.appendChild(cols);
  inner.appendChild(scroll);

  /* foot: quick actions */
  const foot = document.createElement('div'); foot.className = 'tc-foot';
  const fb = (ic, label, cls, fk, run, tip) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + cls; b.dataset.fk = fk;
    b.innerHTML = icon(ic) + `<span>${esc(label)}</span>`;
    if (tip) b.setAttribute('data-tip', tip);
    b.onclick = (e) => run(e.currentTarget);
    foot.appendChild(b); return b;
  };
  fb('trash-2', 'Delete', 'btn-ghost tc-f-del', 'tc-del', () => _tcDelete(id), 'Move to the bin (Del)');
  if (!done) {
    fb('alarm-clock', 'Snooze', 'btn-ghost', 'tc-snooze', (a) => _tcSnoozeMenu(a, id), 'Push the due date');
    fb('layers', 'Move', 'btn-ghost', 'tc-move', (a) => openStreamMenu(a, id), 'Move to another stream');
  }
  const keys = document.createElement('span'); keys.className = 'tc-keys';
  keys.innerHTML = `${nav.n > 1 ? '<span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> next</span>' : ''}<span><kbd class="kbd">Ctrl</kbd><kbd class="kbd">↵</kbd> ${done ? 'reopen' : 'done'}</span>`;
  foot.appendChild(keys);
  if (!done) fb('circle-dot', status === 'doing' ? 'Stop progress' : 'Start', 'btn-secondary', 'tc-start', () => toggleDoing(id), 'In progress (S)');
  fb(done ? 'rotate-ccw' : 'circle-check', done ? 'Reopen' : 'Mark done', done ? 'btn-secondary' : 'btn-primary tc-f-done', 'tc-mark', () => _tcToggleDone(id), done ? 'Reopen (X)' : 'Done (X or Ctrl+Enter)');
  inner.appendChild(foot);
}
/** Snooze: push the due date (and a plan) to a later day; one undo step each. */
function _tcSnoozeMenu(anchor, id) {
  const t0 = _qaToday();
  const at = (d) => fmtDate(d);
  const go = (iso) => {
    const it = getItem(id); if (!it) return;
    setDateWithReason(id, iso, 'Snoozed');
    if (it.plannedFor && it.plannedFor < iso) setPlanned(id, null);
    toast(`Snoozed to ${dueLabel(iso)}`, { kind: 'ok', icon: 'alarm-clock', action: { label: 'Undo', run: () => undo() } });
  };
  openMenu(anchor, [
    { label: 'Tomorrow', icon: 'sunrise', hint: _dayLabel(at(_qaAdd(t0, 1)), { weekday: 'short' }), run: () => go(at(_qaAdd(t0, 1))) },
    { label: 'In 2 days', icon: 'calendar', hint: _dayLabel(at(_qaAdd(t0, 2)), { weekday: 'short' }), run: () => go(at(_qaAdd(t0, 2))) },
    { label: 'This weekend', icon: 'coffee', hint: _dayLabel(at(_qaNextWeekday(t0, 6, false)), { weekday: 'short', day: 'numeric' }), run: () => go(at(_qaNextWeekday(t0, 6, false))) },
    { label: 'Next week', icon: 'calendar-plus', hint: _dayLabel(at(_qaAdd(_qaWeekStart(t0), 7)), { weekday: 'short', day: 'numeric' }), run: () => go(at(_qaAdd(_qaWeekStart(t0), 7))) },
    'sep',
    { label: 'Pick a date…', icon: 'calendar-days', run: () => { const it = getItem(id); openDueDatePopover(anchor, { value: effDate(it), allowClear: false, title: 'Snooze until', onPick: (d) => { if (d) go(d); } }); } },
  ], { align: 'start', width: 230 });
}
/** Under the title: stream · due · repeat · planned (Google Calendar's date line). */
function _tcTaskSub(item) {
  const id = item.id;
  const sub = document.createElement('div'); sub.className = 'tc-sub';
  const s = effStream(item);
  const st = document.createElement('button'); st.type = 'button'; st.className = 'tc-stream';
  st.style.setProperty('--c', safeColor(STREAMS[s] && STREAMS[s].color, '#868a94'));
  // A stream with its own symbol or shape shows that marker (28-customise.js); right-click: the stream's menu.
  const mk = typeof streamIsCustomised === 'function' && streamIsCustomised(s) ? streamMarkHtml(s, { cls: 'mk-md' }) : '<span class="tc-sq" aria-hidden="true"></span>';
  st.innerHTML = `${mk}<span data-cz-label>${esc((STREAMS[s] && STREAMS[s].label) || s || 'No stream')}</span>`;
  if (STREAMS[s] && typeof czMark === 'function') czMark(st, 'stream', s);
  st.title = 'Change stream'; st.dataset.fk = 'tc-stream';
  st.onclick = (e) => openStreamMenu(e.currentTarget, id);
  sub.appendChild(st);
  const bit = (html, cls) => { const b = document.createElement('span'); b.className = 'tc-bit' + (cls ? ' ' + cls : ''); b.innerHTML = html; sub.appendChild(b); };
  const due = effDate(item);
  if (due) bit(`${icon('calendar', 'i-xs')}<span>${esc(_dayLabel(due, { weekday: 'long', day: 'numeric', month: 'long' }))}${item.dueTime ? ' · ' + esc(item.dueTime) : ''}</span>${statusOf(id) !== 'done' && _relDays(due) ? `<b class="${escAttr(_rowDueClass(item))}">${esc(_relDays(due))}</b>` : ''}`);
  const rec = effRecurrence(item);
  if (rec && rec !== 'none') bit(`${icon('repeat', 'i-xs')}<span>${esc(recurrenceLabel(rec))}</span>`);
  if (statusOf(id) === 'doing') bit(`${icon('circle-dot', 'i-xs')}<span>In progress</span>`, 'is-doing');
  if (statusOf(id) === 'done') bit(`${icon('circle-check', 'i-xs')}<span>${isWontDo(item) ? "Won't do" : 'Done'}</span>`, 'is-done');
  return sub;
}
/** Meetings linked to the task, each with its animated scene. */
function _tcMeetings(id) {
  const L = typeof alLinked === 'function' ? alLinked(id) : null;
  const ms = L ? L.meetings : [];
  if (!ms.length) return null;
  const sec = document.createElement('section'); sec.className = 'tc-side-sec tc-meet';
  sec.innerHTML = `<div class="tc-side-h">${icon('video', 'i-sm')}<span>Meetings</span><span class="count">${esc(ms.length)}</span></div>`;
  for (const m of ms.slice(0, 6)) {
    const row = document.createElement('div'); row.className = 'tc-mrow anim-hover-host';
    const open = document.createElement('button'); open.type = 'button'; open.className = 'tc-mopen';
    const type = m.ev && typeof animForEvent === 'function' ? (animForEvent(m.ev) || {}).type : 'event';
    const when = m.ev && typeof alWhen === 'function' ? alWhen(m.start) : '';
    open.innerHTML = (typeof animSceneHtml === 'function' ? animSceneHtml(type || 'event', { size: 'sm', hover: true }) : icon('calendar'))
      + `<span class="tc-mt"><span class="tc-mn"></span><span class="tc-mw">${esc(m.ev ? when + ((m.start || '').slice(0, 10) < todayStr() ? ' · past' : '') : 'Not in the loaded calendar')}</span></span>`;
    open.querySelector('.tc-mn').textContent = m.ev ? String(m.ev.summary || 'Meeting') : 'Calendar event';
    open.disabled = !m.ev;
    open.onclick = () => openEvent(m.id, { from: open, push: true });
    const un = _tcBtn('x', 'Unlink this meeting', () => { if (typeof calLinkTask === 'function') calLinkTask(m.id, id, false); }, { cls: 'tc-munlink' });
    row.append(open, un);
    sec.appendChild(row);
  }
  return sec;
}
function _tcMeta(id) {
  const t = tdTimes(id);
  const m = document.createElement('div'); m.className = 'tc-meta';
  const line = (label, ts) => { if (!ts) return; const p = document.createElement('div'); p.innerHTML = `<span>${esc(label)}</span> ${esc(formatTimestamp(ts))}`; m.appendChild(p); };
  line('Created', t.created);
  line('Updated', t.updated);
  if (t.closed) line(t.wont ? 'Closed' : 'Completed', t.closed);
  return m;
}
function _tcBar(left, right) {
  const bar = document.createElement('header'); bar.className = 'tc-bar';
  bar.appendChild(_tcGroup('tc-l', left));
  const sp = document.createElement('span'); sp.className = 'grow'; bar.appendChild(sp);
  const x = _tcBtn('x', 'Close', () => tcClose(), { kbd: 'Esc', fk: 'tc-close', cls: 'tc-x' });
  bar.appendChild(_tcGroup('tc-r', [...right, right.length ? _tcSep() : null, x]));
  return bar;
}
function _tcBackBtn() {
  const prev = _tc.stack[_tc.stack.length - 2];
  const b = document.createElement('button'); b.type = 'button'; b.className = 'tc-back'; b.dataset.fk = 'tc-back';
  b.innerHTML = icon('arrow-left') + '<span></span>';
  b.querySelector('span').textContent = _tcEntryLabel(prev);
  b.setAttribute('aria-label', 'Back to ' + _tcEntryLabel(prev)); b.setAttribute('data-tip', 'Back'); b.setAttribute('data-kbd', 'Alt+←');
  b.onclick = (e) => { e.stopPropagation(); tcBack(); };
  return b;
}
function tcBack() {
  if (!_tc || _tc.stack.length < 2) return false;
  _tc.stack.pop();
  _tcPaint({ swap: 'back' });
  _tcFocusStart();
  return true;
}
function _tcStep(dir) {
  const cur = _tcCur(); if (!cur || cur.kind !== 'task') return;
  const nav = tcNavInfo(cur.list || [cur.id], cur.id, (x) => !!getItem(x));
  const nid = dir > 0 ? nav.next : nav.prev;
  if (!nid) return;
  const ae = document.activeElement; if (ae && _tc.card.contains(ae) && _tcIsField(ae)) ae.blur();   // commit what was typed
  _tc.stack[_tc.stack.length - 1] = { kind: 'task', id: nid, list: cur.list };
  if (typeof _lastSelectedTaskId !== 'undefined') _lastSelectedTaskId = nid;
  // The list behind follows: cursor on the row, scrolled into view.
  document.querySelectorAll('#main-body .kb-cursor').forEach(n => n.classList.remove('kb-cursor'));
  const row = _tcRowFor(nid);
  if (row) { row.classList.add('kb-cursor'); try { row.scrollIntoView({ block: 'nearest' }); } catch (e) { /* old browser */ } }
  _tcPaint({ swap: dir > 0 ? 'next' : 'prev' });
  try { _tc.card.focus({ preventScroll: true }); } catch (e) { /* gone */ }
}
function _tcToggleDone(id) {
  const ae = document.activeElement; if (ae && _tc && _tc.card.contains(ae) && _tcIsField(ae)) ae.blur();
  toggleDone(id);
}
function _tcDelete(id) {
  const cur = _tcCur();
  const nav = tcNavInfo((cur && cur.list) || [id], id, (x) => !!getItem(x));
  const next = nav.next || nav.prev;
  if (next && _tc.stack.length === 1) { _tc.stack[0] = { kind: 'task', id: next, list: (cur.list || []).filter(x => x !== id) }; deleteTask(id); _tcPaint({ swap: 'next' }); try { _tc.card.focus({ preventScroll: true }); } catch (e) { /* gone */ } return; }
  if (_tc.stack.length > 1) { _tc.stack.pop(); deleteTask(id); _tcPaint({ swap: 'back' }); return; }
  tcClose({ instant: true }); deleteTask(id);
}
/** "Open in side panel": this item, and the next ones this session (switchItemMode), open in the side panel. */
function _tcToPanel() {
  const cur = _tcCur(); if (!cur) return;
  switchItemMode('panel');
  if (cur.kind === 'task') { const id = cur.id; tcClose({ instant: true, noFocus: true }); selectTask(id); return; }
  if (cur.kind === 'event') {
    const id = cur.id; tcClose({ instant: true, noFocus: true });
    if (typeof selectEventInPanel === 'function') selectEventInPanel(id); else if (typeof _calOpenEventPanel === 'function') _calOpenEventPanel(id);
  }
}
/** The task menu, anchored in the card (+ Home's "Hide from Focus today" when it came from Home). */
function _tcMoreMenu(anchor, id) {
  const at = (sel) => () => (_tc && _tc.card.querySelector(sel)) || anchor;
  const items = taskMenuItems(id).map((it) => {
    if (!it || typeof it !== 'object') return it;
    if (it.label === 'Open' || it.label === 'Open in the centre') return null;   // it is open
    if (it.label === 'Open in side panel') return { label: 'Open in side panel', icon: 'panel-right', run: () => _tcToPanel() };
    if (it.label === 'Pick a date…') return Object.assign({}, it, { run: () => { const item = getItem(id); openDueDatePopover(at('.dp-due')(), { value: effDate(item), time: item.dueTime, allowTime: true, allowClear: true, onPick: (d, t) => { setDateWithReason(id, d, null); if (d) setOverride(id, 'dueTime', t || null); render(); } }); } });
    if (it.label === 'Priority…') return Object.assign({}, it, { run: () => openPriorityMenu(at('.dp-prio')(), id) });
    if (it.label === 'Move to stream…') return Object.assign({}, it, { run: () => openStreamMenu(at('.dp-stream')(), id) });
    if (it.label === 'People…') return Object.assign({}, it, { run: () => openPeoplePicker(at('.dp-people .prop-btn.add')(), id) });
    if (it.label === 'Move to bin') return Object.assign({}, it, { run: () => _tcDelete(id) });
    return it;
  }).filter(Boolean);
  if (!items.some(it => it && it.label === 'Open in side panel')) items.splice(Math.max(0, items.lastIndexOf('sep')), 0, { label: 'Open in side panel', icon: 'panel-right', run: () => _tcToPanel() });
  if (_tc && _tc.context === 'home' && typeof homeSnooze === 'function') {
    const i = items.lastIndexOf('sep');
    items.splice(i < 0 ? items.length : i, 0, { label: 'Hide from Focus today', icon: 'eye-off', run: () => homeSnooze(id) });
  }
  openMenu(anchor, items, { align: 'end', width: 240 });
}

/* ---------- an event ---------- */
function _tcEventView(inner, cur) {
  const ev = calEventById(cur.id);
  const p = calEventParts(ev);
  _tc.card.setAttribute('aria-label', 'Event: ' + p.title);
  const right = [calEventStar(ev)];
  right[0].classList.add('tc-ib');
  const link = ev.htmlLink || ev.link || '';
  if (link) {
    const a = document.createElement('a'); a.className = 'btn-icon tc-ib'; a.href = safeUrl(link); a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.innerHTML = icon('external-link'); a.setAttribute('aria-label', ev.htmlLink ? 'Open in Google Calendar' : 'Open the event'); a.setAttribute('data-tip', ev.htmlLink ? 'Open in Google Calendar' : 'Open the event');
    right.push(a);
  }
  right.push(_tcSep(), _tcBtn('panel-right', 'Open in side panel', () => _tcToPanel(), { fk: 'tc-panel' }), _tcMaxBtn());
  inner.appendChild(_tcBar(_tc.stack.length > 1 ? [_tcBackBtn()] : [], right));

  const head = document.createElement('div'); head.className = 'tc-head tc-head-ev';
  const sw = document.createElement('span'); sw.className = 'tc-evsq c-' + (/^[a-z]+$/.test(p.color) ? p.color : 'indigo'); sw.setAttribute('aria-hidden', 'true');
  const hb = document.createElement('div'); hb.className = 'tc-hb';
  const h = document.createElement('h2'); h.className = 'tc-evtitle'; h.id = 'tc-title'; h.textContent = p.title;
  const when = document.createElement('div'); when.className = 'tc-sub tc-when';
  when.innerHTML = `<span class="tc-bit">${icon('clock', 'i-xs')}<span></span></span>${p.live ? `<b class="ev-live${p.live === 'Now' ? ' now' : ''}">${esc(p.live)}</b>` : ''}`;
  when.querySelector('.tc-bit span').textContent = p.when;
  hb.append(h, when);
  head.append(sw, hb);
  inner.appendChild(head);

  const scroll = document.createElement('div'); scroll.className = 'tc-scroll';
  const cols = document.createElement('div'); cols.className = 'tc-cols';
  const main = document.createElement('div'); main.className = 'tc-main tc-evmain';
  for (const n of [p.actions, p.notes, ...p.tasks, p.desc, p.organiser]) if (n) main.appendChild(n);
  const side = document.createElement('aside'); side.className = 'tc-side tc-evside'; side.setAttribute('aria-label', 'Details');
  if (p.facts) side.appendChild(p.facts);
  for (const n of p.attendees) side.appendChild(n);
  if (!p.facts && !p.attendees.length) { const e = document.createElement('div'); e.className = 'tc-meta'; e.textContent = 'No other details from the calendar.'; side.appendChild(e); }
  cols.append(main, side);
  scroll.appendChild(cols);
  inner.appendChild(scroll);
  p.notesInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); p.notesInput.blur(); try { _tc.card.focus({ preventScroll: true }); } catch (err) { /* gone */ } } });
}

/* ---------- create mode ---------- */
function _tcCreateView(inner, cur, keep) {
  const d = cur.draft;
  _tc.card.setAttribute('aria-label', 'New task');
  const left = [];
  if (_tc.stack.length > 1) left.push(_tcBackBtn());
  const lbl = document.createElement('span'); lbl.className = 'tc-crumb';
  const ev = d.eventId && typeof calEventById === 'function' ? calEventById(d.eventId) : null;
  lbl.innerHTML = `${icon('circle-plus', 'i-sm')}<span>New task</span>${ev ? `<span class="tc-crumb-sub">for ${esc(ev.summary || 'the event')}</span>` : ''}`;
  left.push(lbl);
  inner.appendChild(_tcBar(left, [_tcMaxBtn()]));

  const r = tcDraftResolve(d);
  const head = document.createElement('div'); head.className = 'tc-head tc-head-new';
  const cb = document.createElement('span'); cb.className = 'checkbox tc-check is-draft ' + r.priority; cb.setAttribute('aria-hidden', 'true');
  const hb = document.createElement('div'); hb.className = 'tc-hb';
  const ta = document.createElement('textarea'); ta.className = 'tc-title'; ta.id = 'tc-title'; ta.rows = 1; ta.dataset.fk = 'new-title';
  ta.placeholder = 'Task name'; ta.setAttribute('aria-label', 'Task name'); ta.spellcheck = true; ta.maxLength = 300;
  ta.value = d.title;
  const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  const chips = document.createElement('div'); chips.className = 'tc-chips qa-preview'; chips.setAttribute('aria-live', 'polite');
  const paintChips = () => {
    const parsed = typeof parseQuickAdd === 'function' ? parseQuickAdd(d.title, { ignore: d.ignore }) : { tokens: [] };
    chips.innerHTML = typeof _qadChips === 'function' && (parsed.tokens || []).length ? _qadChips(parsed, true) : '';
    chips.hidden = !chips.innerHTML;
  };
  chips.addEventListener('mousedown', (e) => { if (e.target.closest('[data-raw]')) e.preventDefault(); });
  chips.addEventListener('click', (e) => { const c = e.target.closest('[data-raw]'); if (!c) return; d.ignore.push(c.getAttribute('data-raw')); paintChips(); ta.focus(); });
  let heroT = 0;
  ta.addEventListener('input', () => {
    d.title = ta.value.replace(/\n/g, ' ');
    ta.closest('.tc-head').classList.remove('is-invalid');
    fit(); paintChips(); _tcSugPaint(ta, d);
    // The properties and the scene follow what is typed ("fri !p1 #admin" shows in Due, Priority, Tags).
    clearTimeout(heroT); heroT = setTimeout(() => {
      if (!_tc || _tcCur() !== cur) return;
      _tcHeroSync(cur);
      const old = _tc.card.querySelector('.tc-draft-props');
      if (old && !old.contains(document.activeElement)) old.replaceWith(_tcDraftProps(cur, tcDraftResolve(d)));
      const ck = _tc.card.querySelector('.tc-check.is-draft'); if (ck) ck.className = 'checkbox tc-check is-draft ' + tcDraftResolve(d).priority;
    }, 250);
  });
  ta.addEventListener('keyup', (e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) _tcSugPaint(ta, d); });
  ta.addEventListener('blur', () => setTimeout(() => { if (_tc && _tc.sug && document.activeElement !== ta) _tc.sug.hidden = true; }, 150));
  ta.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    const sug = _tc && _tc.sug;
    if (sug && !sug.hidden && sug._items && sug._items.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); sug._index = (sug._index + (e.key === 'ArrowDown' ? 1 : -1) + sug._items.length) % sug._items.length; _tcSugRender(ta, d); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.ctrlKey && !e.metaKey)) { e.preventDefault(); e.stopPropagation(); _tcSugAccept(ta, d, sug._items[sug._index]); return; }
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); _tcCreateSave(false); }
  });
  hb.append(ta, chips);
  head.append(cb, hb);
  inner.appendChild(head);
  requestAnimationFrame(fit);
  paintChips();

  const scroll = document.createElement('div'); scroll.className = 'tc-scroll';
  const cols = document.createElement('div'); cols.className = 'tc-cols';
  const main = document.createElement('div'); main.className = 'tc-main';
  const ds = document.createElement('section'); ds.className = 'dp-section dp-desc-sec';
  ds.innerHTML = '<div class="dp-sh"><h4>Description</h4></div>';
  const desc = document.createElement('textarea'); desc.className = 'dp-desc-edit tc-new-desc'; desc.dataset.fk = 'new-desc'; desc.rows = 4;
  desc.placeholder = 'Notes, links, context (optional). Markdown works.'; desc.setAttribute('aria-label', 'Description');
  desc.value = d.detail;
  desc.addEventListener('input', () => { d.detail = desc.value; });
  ds.appendChild(desc);
  main.appendChild(ds);
  const tip = document.createElement('p'); tip.className = 'tc-tip';
  tip.innerHTML = `${icon('sparkles', 'i-xs')}<span>Type it the quick way too: <b>fri 3pm</b>, <b>!p1</b>, <b>#tag</b>, <b>+stream</b>, <b>@person</b>, <b>~30m</b>, <b>every week</b>.</span>`;
  main.appendChild(tip);
  const side = document.createElement('aside'); side.className = 'tc-side'; side.setAttribute('aria-label', 'Properties');
  side.appendChild(_tcDraftProps(cur, r));
  cols.append(main, side);
  scroll.appendChild(cols);
  inner.appendChild(scroll);

  const foot = document.createElement('div'); foot.className = 'tc-foot';
  foot.innerHTML = '<span class="tc-keys is-left"><span><kbd class="kbd">↵</kbd> create</span><span><kbd class="kbd">Ctrl</kbd><kbd class="kbd">↵</kbd> create and close</span><span><kbd class="kbd">Esc</kbd> cancel</span></span>';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-ghost btn-sm'; cancel.textContent = 'Cancel';
  cancel.onclick = () => _tcBackOrClose();
  const go = document.createElement('button'); go.type = 'button'; go.className = 'btn btn-primary btn-sm'; go.dataset.fk = 'tc-create';
  go.innerHTML = icon('plus') + '<span>Create task</span>';
  go.onclick = () => _tcCreateSave(false);
  foot.append(cancel, go);
  inner.appendChild(foot);
}
/** The draft's properties: due (+ time), priority, stream, people, tags, repeat, length. */
function _tcDraftProps(cur, r) {
  const d = cur.draft;
  const repaint = () => { if (_tc && _tcCur() === cur) _tcPaint(); };
  const dl = document.createElement('dl'); dl.className = 'kv dp-props tc-draft-props';
  const prop = (label, ic, el, key) => {
    const dt = document.createElement('dt'); dt.innerHTML = icon(ic, 'i-sm') + `<span>${esc(label)}</span>`;
    const dd = document.createElement('dd'); dd.appendChild(el);
    dt.dataset.prop = key; dd.dataset.prop = key;
    dl.append(dt, dd);
  };
  const btn = (html, cls, fk, run) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'prop-btn' + (cls ? ' ' + cls : ''); b.innerHTML = html; b.dataset.fk = fk; b.onclick = (e) => run(e.currentTarget); return b; };
  // Due
  const due = r.dueDate;
  prop('Due', 'calendar', btn(due ? `${esc(_dayLabel(due, { weekday: 'short', day: 'numeric', month: 'short' }))}${r.dueTime ? ' · ' + esc(r.dueTime) : ''}<span class="rel">${esc(_relDays(due))}</span>` : '<span class="ph">Add a due date</span>', 'dp-due', 'new-due',
    (a) => openDueDatePopover(a, { value: d.dueDate, time: d.dueTime, allowTime: true, allowClear: true, onPick: (v, t) => { d.dueDate = v || null; d.dueTime = v ? (t || null) : null; repaint(); } })), 'due');
  // Priority: one click
  const seg = document.createElement('div'); seg.className = 'seg tc-prio-seg'; seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', 'Priority');
  for (const [k, l] of [['p1', 'High'], ['p2', 'Med'], ['p3', 'Low'], ['p0', 'None']]) {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.fk = 'new-prio-' + k;
    b.setAttribute('aria-checked', r.priority === k ? 'true' : 'false'); b.className = r.priority === k ? 'on' : '';
    b.innerHTML = `<span class="tc-pd ${k}"></span>${esc(l)}`;
    b.onclick = () => { d.priority = k; repaint(); };
    seg.appendChild(b);
  }
  prop('Priority', 'flag', seg, 'priority');
  // Stream
  const sid = r.stream || (typeof defaultStreamId === 'function' ? defaultStreamId() : '');
  prop('Stream', 'layers', btn(`<span class="stream" style="--c:${escAttr(safeColor(STREAMS[sid] && STREAMS[sid].color, '#868a94'))}"><span class="dot"></span></span><span>${esc((STREAMS[sid] && STREAMS[sid].label) || 'No stream')}</span>`, 'dp-stream', 'new-stream',
    (a) => openStreamMenu(a, null, (k) => { d.stream = k; repaint(); })), 'stream');
  // People
  const pw = document.createElement('div'); pw.className = 'dp-people';
  for (const pid of r.people) {
    const p = getPerson(pid); if (p && p.self) continue;
    const chip = document.createElement('span'); chip.className = 'person-chip';
    chip.innerHTML = `<span class="pc-open"><span class="avatar avatar-16" style="--c:${escAttr(safeColor(p && p.color, 'var(--sw-slate)'))}">${esc(avatarInitials(p ? p.name : pid))}</span><span>${esc(p ? p.name : pid)}</span></span>`;
    if (d.people.includes(pid)) {
      const x = document.createElement('button'); x.type = 'button'; x.className = 'pc-x'; x.innerHTML = icon('x', 'i-xs'); x.setAttribute('aria-label', 'Remove ' + (p ? p.name : pid));
      x.onclick = () => { d.people = d.people.filter(v => v !== pid); repaint(); };
      chip.appendChild(x);
    }
    pw.appendChild(chip);
  }
  for (const n of r.newPeople) { const chip = document.createElement('span'); chip.className = 'person-chip unknown'; chip.innerHTML = `<span class="pc-open"><span class="avatar avatar-16">${esc(avatarInitials(n))}</span><span>${esc(n)}</span></span>`; chip.title = 'New person, added when you create the task'; pw.appendChild(chip); }
  pw.appendChild(btn(icon('user-plus', 'i-sm') + '<span>Add</span>', 'add', 'new-people', (a) => _tcDraftPeoplePicker(a, cur)));
  prop('People', 'users', pw, 'people');
  // Tags
  const tw = document.createElement('div'); tw.className = 'tags-input';
  for (const t of r.tags) {
    const c = document.createElement('span'); c.className = 'chip chip-lg';
    c.innerHTML = `<span class="tag-open"></span>`; c.querySelector('.tag-open').textContent = t;
    if (d.tags.includes(t)) {
      const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.innerHTML = icon('x', 'i-xs'); x.setAttribute('aria-label', 'Remove tag ' + t);
      x.onclick = () => { d.tags = d.tags.filter(v => v !== t); repaint(); };
      c.appendChild(x);
    }
    tw.appendChild(c);
  }
  const tin = document.createElement('input'); tin.className = 'tag-in'; tin.dataset.fk = 'new-tag'; tin.autocomplete = 'off';
  tin.placeholder = r.tags.length ? 'Add…' : 'Add a tag…'; tin.setAttribute('aria-label', 'Add tag');
  const known = typeof _allTagCounts === 'function' ? Object.keys(_allTagCounts()) : [];
  const listId = 'tc-tags-' + d.key;
  const dlist = document.createElement('datalist'); dlist.id = listId;
  for (const t of known.slice(0, 200)) { const op = document.createElement('option'); op.value = t; dlist.appendChild(op); }
  tin.setAttribute('list', listId);
  const addTag = () => {
    const v = tin.value.trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-');
    if (!v) return;
    if (STREAMS[v]) { d.stream = v; } else if (!d.tags.includes(v)) d.tags.push(v);
    tin.value = '';
    if (typeof _keepFocus === 'function') _keepFocus('new-tag');
    repaint();
  };
  tin.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') { if (tin.value.trim()) { e.preventDefault(); e.stopPropagation(); addTag(); } }
    if (e.key === 'Backspace' && !tin.value && d.tags.length) { d.tags.pop(); repaint(); }
  });
  tin.addEventListener('change', () => { if (known.includes(tin.value.trim().toLowerCase())) addTag(); });
  tw.append(tin, dlist);
  prop('Tags', 'hash', tw, 'tags');
  // Repeat
  const sel = document.createElement('select'); sel.className = 'control control-sm'; sel.setAttribute('aria-label', 'Repeat'); sel.dataset.fk = 'new-repeat';
  for (const [k, l] of (typeof RECURRENCE_OPTIONS !== 'undefined' ? RECURRENCE_OPTIONS : [['none', 'Does not repeat']])) { const op = document.createElement('option'); op.value = k; op.textContent = l; if (k === r.recurrence) op.selected = true; sel.appendChild(op); }
  if (r.recurrence === 'none') sel.classList.add('dp-rec-none');
  sel.onchange = () => { d.recurrence = sel.value; repaint(); };
  prop('Repeats', 'repeat', sel, 'repeat');
  // Length (the calendar's "planned block") / estimate
  const est = document.createElement('input'); est.className = 'control control-sm dp-est'; est.dataset.fk = 'new-est';
  est.placeholder = 'e.g. 45m or 2h'; est.setAttribute('aria-label', 'Estimate');
  est.value = r.estimate ? (typeof fmtEstimate === 'function' ? fmtEstimate(r.estimate) : r.estimate + 'm') : '';
  est.addEventListener('change', () => {
    const v = est.value.trim().toLowerCase();
    let mins = 0; const h = /(\d+(?:\.\d+)?)\s*h/.exec(v), m = /(\d+)\s*m/.exec(v);
    if (h) mins += Math.round(Number(h[1]) * 60);
    if (m) mins += Number(m[1]);
    if (!h && !m && /^\d+$/.test(v)) mins = Number(v);
    d.estimate = mins > 0 ? mins : null;
  });
  prop(d.eventId || d.dueTime ? 'Length' : 'Estimate', 'timer', est, 'estimate');
  return dl;
}
/** People for the draft: find, toggle, or a new name (made a person when the task is created). */
function _tcDraftPeoplePicker(anchor, cur) {
  const d = cur.draft;
  openPopover(anchor, (el, close) => {
    el.classList.add('people-pop');
    const box = document.createElement('label'); box.className = 'input input-sm';
    box.innerHTML = icon('search');
    const inp = document.createElement('input'); inp.placeholder = 'Find or add a person'; inp.setAttribute('autofocus', '');
    box.appendChild(inp); el.appendChild(box);
    const list = document.createElement('div'); list.className = 'pp-list'; el.appendChild(list);
    let rows = [], idx = 0;
    const paint = () => {
      const q = inp.value.trim().toLowerCase();
      const people = (state.people || []).filter(p => p && !p.self && (!q || [p.id, p.name, p.role, ...(p.aliases || [])].some(x => String(x || '').toLowerCase().includes(q))));
      rows = people.sort((a, b) => (d.people.includes(b.id) - d.people.includes(a.id)) || String(a.name).localeCompare(String(b.name))).slice(0, 30).map(p => ({ p, on: d.people.includes(p.id) }));
      if (q && !(state.people || []).some(p => String(p.name || '').toLowerCase() === q)) rows.push({ name: inp.value.trim() });
      idx = Math.min(idx, Math.max(0, rows.length - 1));
      list.innerHTML = '';
      rows.forEach((r, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pop-item' + (i === idx ? ' on' : '');
        if (r.p) { b.innerHTML = `<span class="avatar avatar-16" style="--c:${escAttr(safeColor(r.p.color, 'var(--sw-slate)'))}">${esc(avatarInitials(r.p.name))}</span><span class="lbl">${esc(r.p.name)}</span>${r.p.role ? `<span class="hint">${esc(r.p.role)}</span>` : ''}${r.on ? icon('check', 'chk') : ''}`; b.setAttribute('aria-checked', r.on ? 'true' : 'false'); }
        else b.innerHTML = icon('user-plus') + `<span class="lbl">Add “${esc(r.name)}”</span><span class="hint">new person</span>`;
        b.onclick = () => act(r);
        list.appendChild(b);
      });
      if (!rows.length) list.innerHTML = '<div class="pop-empty">No people yet. Type a name to add one.</div>';
    };
    const act = (r) => {
      if (!r) return;
      if (r.p) { if (r.on) d.people = d.people.filter(x => x !== r.p.id); else d.people.push(r.p.id); }
      else if (r.name && !d.newPeople.includes(r.name)) { d.newPeople.push(r.name); inp.value = ''; }
      if (_tc && _tcCur() === cur) _tcPaint();
      paint(); inp.focus();
    };
    inp.oninput = () => { idx = 0; paint(); };
    inp.onkeydown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (rows.length) { idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length; paint(); } }
      if (e.key === 'Enter') { e.preventDefault(); act(rows[idx]); }
    };
    paint();
  }, { width: 280, align: 'start' });
}
/* # @ + suggestions under the title (the quick-add dialog's, 23-quick-add-dialog.js). */
function _tcSugPaint(ta, d) {
  if (!_tc || typeof _qadWordAtCaret !== 'function' || typeof _qadSuggestions !== 'function') return;
  const w = _qadWordAtCaret(ta);
  let sug = _tc.sug;
  if (!sug) { sug = document.createElement('div'); sug.className = 'pop tc-sug'; sug.setAttribute('role', 'listbox'); sug.hidden = true; _tc.card.appendChild(sug); _tc.sug = sug; sug.addEventListener('mousedown', (e) => e.preventDefault()); }
  sug._word = w; sug._items = w ? _qadSuggestions(w.sigil, w.text, w.raw) : []; sug._index = 0;
  if (!sug._items.length || document.activeElement !== ta) { sug.hidden = true; return; }
  _tcSugRender(ta, d);
}
function _tcSugRender(ta, d) {
  const sug = _tc.sug;
  sug.innerHTML = '';
  sug._items.forEach((s, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pop-item' + (i === sug._index ? ' on' : ''); b.setAttribute('role', 'option');
    const lead = s.kind === 'stream' ? `<span class="ic"><span class="dot" style="--c:${escAttr(safeColor(s.color))}"></span></span>`
      : s.kind === 'person' ? `<span class="avatar avatar-16" style="--c:${escAttr(safeColor(s.color, 'var(--sw-slate)'))}">${esc(avatarInitials(s.label))}</span>` : icon(s.kind === 'new' ? 'user-plus' : 'hash');
    b.innerHTML = lead + `<span class="lbl">${esc(s.label)}</span>${s.hint ? `<span class="hint">${esc(s.hint)}</span>` : ''}`;
    b.addEventListener('mousedown', (e) => { e.preventDefault(); _tcSugAccept(ta, d, s); });
    sug.appendChild(b);
  });
  sug.hidden = false;
  const r = ta.getBoundingClientRect(), c = _tc.card.getBoundingClientRect();
  sug.style.left = Math.max(8, r.left - c.left) + 'px';
  sug.style.top = (r.bottom - c.top + 6) + 'px';
}
function _tcSugAccept(ta, d, it) {
  const sug = _tc && _tc.sug; const w = sug && sug._word;
  if (!w || !it) return;
  const v = ta.value, ins = it.insert + ' ';
  ta.value = v.slice(0, w.start) + ins + v.slice(w.end).replace(/^[ \t]+/, '');
  const pos = w.start + ins.length;
  try { ta.setSelectionRange(pos, pos); } catch (e) { /* not a text field */ }
  ta.dispatchEvent(new Event('input'));
  sug.hidden = true;
}
/** Create the task. close: Ctrl+Enter (back to where it came from, or shut). */
function _tcCreateSave(close) {
  const cur = _tcCur(); if (!cur || cur.kind !== 'create') return null;
  const d = cur.draft;
  const desc = _tc.card.querySelector('[data-fk="new-desc"]'); if (desc) d.detail = desc.value;
  const est = _tc.card.querySelector('[data-fk="new-est"]'); if (est && document.activeElement === est) est.dispatchEvent(new Event('change'));
  const r = tcDraftResolve(d);
  if (!r.title) {
    const head = _tc.card.querySelector('.tc-head'); if (head) head.classList.add('is-invalid');
    const ta = _tc.card.querySelector('[data-fk="new-title"]');
    if (ta) { ta.placeholder = 'Give it a name first'; ta.focus(); if (!_tcReduced() && ta.animate) ta.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 280 }); }
    return null;
  }
  if (_tc.sug) _tc.sug.hidden = true;
  const id = addCustomTask(r.title, r.dueDate, r.priority, r.tags, r.stream, r.recurrence, {
    dueTime: r.dueTime, estimate: r.estimate, people: r.people, newPeople: r.newPeople, detail: r.detail,
  });
  if (!id) return null;
  if (d.eventId && typeof calLinkTask === 'function') calLinkTask(d.eventId, id, true);
  if (d.onCreated) { try { d.onCreated(id); } catch (e) { console.error(e); } }
  if (!_tc) return id;
  if (close) {
    if (_tc.stack.length > 1) { _tc.stack.pop(); _tcPaint({ swap: 'back' }); _tcFocusStart(); }
    else tcClose();
    toast(d.eventId ? 'Task added and linked to the event' : 'Task added', { kind: 'ok', action: { label: 'Open', run: () => openTask(id) } });
  } else {
    _tc.stack[_tc.stack.length - 1] = { kind: 'task', id, list: [id] };
    _tcPaint({ swap: 'swap' });
    try { _tc.card.focus({ preventScroll: true }); } catch (e) { /* gone */ }
    toast(d.eventId ? 'Task added and linked to the event' : 'Task added', { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
  }
  return id;
}

/* ---------- keyboard ---------- */
function _tcBackOrClose() { if (!tcBack()) tcClose(); }
function _tcKey(e) {
  if (!_tc || _tc.closing) return;
  if (_tcOverlay()) return;                       // a menu, dialog or the palette owns the keyboard
  const t = e.target;
  const inCard = _tc.card.contains(t);
  if (!inCard && t && t !== document.body && t !== document.documentElement) return;   // typing elsewhere (the assistant)
  const field = inCard && _tcIsField(t);
  const cur = _tcCur(); if (!cur) return;
  const k = e.key;
  const stop = () => { e.preventDefault(); e.stopPropagation(); };
  if (k === 'Tab') {
    // Tab accepts a suggestion in the tag box and the new-task title: theirs, not the trap's.
    if (t && t.classList && t.classList.contains('tag-in') && t.value.trim()) return;
    if (t && t.dataset && t.dataset.fk === 'new-title' && _tc.sug && !_tc.sug.hidden) return;
    _tcTrapTab(e); return;
  }
  if (k === 'Escape') {
    if (_tc.sug && !_tc.sug.hidden) { stop(); _tc.sug.hidden = true; return; }
    if (field && cur.kind !== 'create') return;   // the field's own Esc first (the root listener blurs plain fields)
    stop(); _tcBackOrClose(); return;
  }
  if ((e.ctrlKey || e.metaKey) && k === 'Enter') {
    if (cur.kind === 'create') { stop(); _tcCreateSave(true); return; }
    if (cur.kind === 'task' && (!field || t.dataset.fk === 'title')) { stop(); _tcToggleDone(cur.id); return; }
    return;
  }
  if (e.altKey && k === 'ArrowLeft' && _tc.stack.length > 1) { stop(); tcBack(); return; }
  if (!inCard) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    try { _tc.card.focus({ preventScroll: true }); } catch (err) { /* gone */ }
  }
  if (field || e.ctrlKey || e.metaKey || e.altKey) return;
  if (t && t.closest && t.closest('.tc-rs, .split-h')) return;
  if (k === 'm' || k === 'M') { stop(); tcToggleMax(); return; }
  if (cur.kind === 'task' && _tcTaskKey(k, cur)) { stop(); return; }
  if (!inCard) e.stopPropagation();               // nothing behind the card reacts
}
/** The task keys (as in the lists): returns true when handled. */
function _tcTaskKey(k, cur) {
  const id = cur.id, item = getItem(id); if (!item) return false;
  const q = (sel) => _tc.card.querySelector(sel);
  switch (k) {
    case 'ArrowDown': case 'j': _tcStep(1); return true;
    case 'ArrowUp': case 'k': _tcStep(-1); return true;
    case 'x': _tcToggleDone(id); return true;
    case 's': toggleDoing(id); return true;
    case 't': togglePlannedToday(id); return true;
    case 'd': { const a = q('.dp-due'); if (a) a.click(); return true; }
    case 'p': openPriorityMenu(q('.dp-prio') || _tc.card, id); return true;
    case '1': case '2': case '3': case '4': setOverride(id, 'priority', ['p1', 'p2', 'p3', 'p0'][Number(k) - 1]); render(); return true;
    case 'e': { const ti = q('[data-fk="title"]'); if (ti) { ti.focus(); ti.select(); } return true; }
    case '.': _tcMoreMenu(q('.tc-more') || _tc.card, id); return true;
    case 'Delete': case 'Backspace': _tcDelete(id); return true;
    default: return false;
  }
}
/** Bubble phase on the card: keys typed inside it never reach the page's shortcuts. */
function _tcKeyBubble(e) {
  if (!_tc) return;
  if (_tcOverlay()) return;
  if ((e.ctrlKey || e.metaKey) && !['a', 'A', 'Enter'].includes(e.key)) return;   // Ctrl+K, Ctrl+Z, Ctrl+J still reach the shell
  if (e.key === 'Escape' && _tcIsField(e.target)) { e.target.blur(); try { _tc.card.focus({ preventScroll: true }); } catch (err) { /* gone */ } }
  e.stopPropagation();
}
/** What Tab walks through in the card (suggestion lists are reached with the arrow keys, not Tab). */
function _tcFocusables() {
  return [..._tc.card.querySelectorAll('button:not(:disabled), a[href], input:not([type="hidden"]), textarea, select, [tabindex="0"], [contenteditable="true"]')]
    .filter(n => _tcVisible(n) && !n.closest('[hidden], .tc-sug, .tag-sug, .pop'));
}
/** The card moves focus itself, so it can never land on something about to vanish (or leave the card). */
function _tcTrapTab(e) {
  const f = _tcFocusables();
  e.preventDefault();
  if (!f.length) { _tc.card.focus(); return; }
  const a = document.activeElement;
  let i = f.indexOf(a);
  if (i < 0) {
    // Focus is on the card itself or on something Tab skips: start from the nearest control after it.
    if (!_tc.card.contains(a) || a === _tc.card) { (e.shiftKey ? f[f.length - 1] : f[0]).focus(); return; }
    i = f.findIndex(n => a.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (i < 0) i = f.length;
    i = e.shiftKey ? i : i - 1;
  }
  const next = f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length];
  try { next.focus(); } catch (err) { _tc.card.focus(); }
}
function _tcFocusStart() {
  const cur = _tcCur(); if (!cur) return;
  setTimeout(() => {
    if (!_tc) return;
    if (cur.kind === 'create') {
      const ta = _tc.card.querySelector('[data-fk="new-title"]');
      if (ta) { ta.focus({ preventScroll: true }); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) { /* fine */ } return; }
    }
    // The dialog itself (not the title, which would look like edit mode); Tab walks in.
    if (!_tc.card.contains(document.activeElement) || document.activeElement === document.body) { try { _tc.card.focus({ preventScroll: true }); } catch (e) { /* gone */ } }
  }, 0);
}

/* ---------- closing ---------- */
function tcClose(o) {
  o = o || {};
  if (!_tc) return;
  const t = _tc;
  t.closing = true;
  // Commit the field being edited (title, description, a note) while the card still counts as open.
  const act = document.activeElement;
  if (act && t.card.contains(act) && typeof act.blur === 'function') act.blur();
  _tc = null;
  document.removeEventListener('keydown', _tcKey, true);
  document.removeEventListener('pointerdown', _tcDownCapture, true);
  document.body.classList.remove('tc-open');
  if (typeof closePopovers === 'function') { try { closePopovers(); } catch (e) { /* none open */ } }
  _tdViews.card.lastId = null; _tdViews.card.editingDesc = null;
  _tcMarkRows();
  const cur = t.stack[t.stack.length - 1];
  const target = cur && cur.kind === 'task' ? _tcRowFor(cur.id) : (t.fromEl && t.fromEl.isConnected ? t.fromEl : null);
  const remove = () => t.root.remove();
  if (o.instant || _tcReduced() || !t.card.animate) remove();
  else _tcAnimateOut(t, target, remove);
  if (!o.noFocus) _tcReturnFocus(t, cur, target);
}
function _tcReturnFocus(t, cur, target) {
  const ret = t.returnFocus;
  if (ret && ret.isConnected && ret !== document.body && !t.root.contains(ret) && ret.offsetParent !== null) { try { ret.focus({ preventScroll: true }); } catch (e) { /* fine */ } return; }
  if (target && target.isConnected) {
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    if (target.classList.contains('task')) { document.querySelectorAll('#main-body .kb-cursor').forEach(n => n.classList.remove('kb-cursor')); target.classList.add('kb-cursor'); }
    try { target.focus({ preventScroll: true }); } catch (e) { /* fine */ }
  }
}

/* ---------- motion ---------- */
const TC_EASE_IN = 'cubic-bezier(0.2, 0, 0, 1)';        // emphasised decelerate (Material 3, as Google Calendar)
const TC_EASE_OUT = 'cubic-bezier(0.3, 0, 0.8, 0.15)';  // emphasised accelerate
function _tcAnimateIn(fromRect) {
  if (!_tc || _tcReduced() || !_tc.card.animate) return;
  const { card, scrim, inner, hero } = _tc;
  scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'linear' });
  if (_tcSheet()) {
    card.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 340, easing: TC_EASE_IN });
    return;
  }
  const b = card.getBoundingClientRect();
  const a = fromRect;
  const usable = a && a.width > 4 && a.height > 4 && a.bottom > 0 && a.top < window.innerHeight && a.right > 0 && a.left < window.innerWidth;
  if (usable) {
    // Shared element: the card grows out of the row (FLIP), its content fades in once it has room.
    // The card's surface turns solid at once (no see-through ghosting); its content fades in once it has room.
    const sx = Math.max(0.05, a.width / b.width), sy = Math.max(0.03, a.height / b.height);
    card.animate([
      { transformOrigin: '0 0', transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${sx}, ${sy})`, borderRadius: `${(8 / sx).toFixed(1)}px / ${(8 / sy).toFixed(1)}px` },
      { transformOrigin: '0 0', transform: 'none', borderRadius: '16px' },
    ], { duration: 340, easing: TC_EASE_IN });
    card.animate([{ opacity: 0 }, { opacity: 1, offset: 0.18 }, { opacity: 1 }], { duration: 340, easing: 'linear' });
    for (const el of [inner, hero]) el.animate([{ opacity: 0 }, { opacity: 0, offset: 0.32 }, { opacity: 1 }], { duration: 340, easing: 'linear' });
  } else {
    card.animate([{ opacity: 0, transform: 'translateY(12px) scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: TC_EASE_IN });
  }
}
function _tcAnimateOut(t, target, done) {
  const { card, scrim, inner, hero } = t;
  t.root.classList.add('is-closing');
  let finished = false;
  const fin = () => { if (finished) return; finished = true; done(); };
  setTimeout(fin, 500);
  scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'linear', fill: 'forwards' });
  if (_tcSheet()) {
    const a = card.animate([{ transform: getComputedStyle(card).transform === 'none' ? 'none' : getComputedStyle(card).transform }, { transform: 'translateY(100%)' }], { duration: 240, easing: TC_EASE_OUT, fill: 'forwards' });
    a.finished.then(fin, fin); return;
  }
  const b = card.getBoundingClientRect();
  const a = target && target.isConnected ? target.getBoundingClientRect() : null;
  const usable = a && a.width > 4 && a.height > 4 && a.bottom > 0 && a.top < window.innerHeight;
  let anim;
  if (usable) {
    const sx = Math.max(0.05, a.width / b.width), sy = Math.max(0.03, a.height / b.height);
    for (const el of [inner, hero]) el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.35 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
    card.animate([{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
    anim = card.animate([
      { transformOrigin: '0 0', transform: 'none', borderRadius: '16px' },
      { transformOrigin: '0 0', transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${sx}, ${sy})`, borderRadius: `${(8 / sx).toFixed(1)}px / ${(8 / sy).toFixed(1)}px` },
    ], { duration: 260, easing: TC_EASE_OUT, fill: 'forwards' });
  } else {
    anim = card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(8px) scale(0.97)' }], { duration: 160, easing: TC_EASE_OUT, fill: 'forwards' });
  }
  anim.finished.then(fin, fin);
}

/* The bottom sheet: drag its handle down to close. */
function _tcSheetDragStart(e) {
  if (!_tc || !_tcSheet()) return;
  const card = _tc.card, y0 = e.clientY, t0 = performance.now();
  let dy = 0;
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* old browser */ }
  const g = e.currentTarget;
  const move = (ev) => { dy = Math.max(0, ev.clientY - y0); card.style.transform = `translateY(${dy}px)`; };
  const up = () => {
    g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up);
    const fast = dy > 40 && dy / Math.max(1, performance.now() - t0) > 0.6;
    if (dy > 110 || fast) tcClose();
    else { card.style.transition = 'transform 180ms cubic-bezier(0.2, 0, 0, 1)'; card.style.transform = ''; setTimeout(() => { card.style.transition = ''; }, 200); }
  };
  g.addEventListener('pointermove', move); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
}

/* ---------- Settings > Tasks ---------- */
if (typeof registerSettingsGroup === 'function') registerSettingsGroup({
  id: 'tasks', title: 'Tasks', icon: 'circle-check', order: 25,
  description: 'How tasks and calendar events open, and what the card shows.',
  render(el) {
    el.appendChild(_settingsRow('Open tasks and events in', 'The centre card is big and keeps you in the middle of the screen; the side panel keeps the list in view. Either one has a button to switch to the other.', _settingsSeg(
      [['card', 'Centre card', 'scan'], ['panel', 'Side panel', 'panel-right']], itemOpenSetting(),
      (k) => { setItemOpenMode(k); render(); toast(k === 'card' ? 'Tasks and events open in the centre' : 'Tasks and events open in the side panel', { kind: 'ok' }); })));
    el.appendChild(_settingsRow('Scene header', 'The animated scene at the top of the card (and a small one in the side panel). Click a scene to change it.', _settingsSwitch(itemHeroOn(), 'Scene header',
      (on) => { state.itemHero = on ? true : false; saveUI(); render(); })));
    const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'btn btn-secondary btn-sm';
    reset.innerHTML = icon('rotate-ccw') + '<span>Reset sizes</span>';
    reset.onclick = () => {
      state.paneSizes = {}; saveUI();
      try { localStorage.removeItem(typeof RZ_STORE !== 'undefined' ? RZ_STORE : 'dash-window-sizes-v1'); } catch (e) { /* storage off */ }
      if (typeof splitSync === 'function') splitSync();
      render(); toast('Panel and window sizes are back to their defaults', { kind: 'ok' });
    };
    el.appendChild(_settingsRow('Panel and window sizes', 'Drag the edge of the sidebar, the side panel, the assistant, the calendar, the card, dialogs and drawers to resize them; double-click an edge to reset it.', reset));
  },
});
if (typeof registerCommand === 'function') registerCommand({
  id: 'toggle-open-mode', label: 'Open tasks in the side panel / centre card', icon: 'panel-right', group: 'View', keywords: 'card centre center panel side detail open where',
  run: () => { setItemOpenMode(itemOpenSetting() === 'card' ? 'panel' : 'card'); render(); toast(itemOpenMode() === 'card' ? 'Tasks and events open in the centre' : 'Tasks and events open in the side panel', { kind: 'ok' }); },
});
