/* ============================================================
   THE BOARD EDITOR (Customise), shared by Home and My money. Owner: Home foundation.
   boardEditor(grid, A) is the pointer editor; A is the host's adapter (12-home-board.js lists it; Home's is
   homeBoardAdapter() below, My money's is in src/finance/39-board-edit.js). Free sizing (2.19.5): a widget is
   any 1-12 columns wide and any number of rows tall; the 12 columns and the rows are the snap points.
   The board is a 12-column grid that packs densely (12-home-grid.js). While customising:

   Move: press a widget and drag. It lifts (a copy follows the pointer, shrunk
     when it is tall so the board stays visible) and its place on the board
     becomes a dashed placeholder that IS the preview: it moves to where the
     widget would land and the other widgets glide (FLIP) around it. Over a
     widget, its left or right half (top or bottom half for a full-width one)
     says before or after it; the empty end of a shelf means after its last
     widget; below the board means last. Release saves; Esc puts it back.
   Resize: each widget has handles on its right edge (width), bottom edge
     (height) and bottom-right corner (both). Width snaps to the 12 columns (any of
     1-12; the Small / Medium / Large / Full presets are 4, 6, 8, 12); height snaps to
     rows of HOME_ROW_PX (double-click the bottom edge = back to the content's height,
     the right edge = back to the preset width). The widget changes live and the
     others reflow and glide; a badge says the size. Release saves; Esc puts it back.
   Every change is one save (homeSaveLayout) and goes on Customise's own Undo
   (the toolbar's Undo button). Nothing glides with reduced motion.
   Keyboard (12-home-board.js boardEditKey): arrows move, Shift+arrows resize one column / row.
   The hero is not on the grid: it stays where it is.
   Public: boardEditor(grid, A) -> {destroy(), dragging}, _homeGridEditor(grid), homeBoardAdapter(),
   homeWidgetSet(id, {size?, cols?, h?}), homeWidgetMoveTo(id, j), homeWidgetMoveRow(id, dir),
   homeWidgetHeight(id, h), homeWidgetHeightStep(id, dir), homeWidgetCols(id, n),
   homeShelfDropIndex(boxes, x, y, gridW) (pure).
   ============================================================ */

function _hgeCols(grid) {
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 16;
  return { gap, colW: (grid.clientWidth - 11 * gap) / 12 };
}
/** A frame's box from layout (offsets), so one that is still gliding is hit where it will be. */
function _hgeBox(f) {
  const g = f.offsetParent, gr = g ? g.getBoundingClientRect() : { left: 0, top: 0 };
  const left = gr.left + (g ? g.clientLeft : 0) + f.offsetLeft, top = gr.top + (g ? g.clientTop : 0) + f.offsetTop;
  return { left, top, right: left + f.offsetWidth, bottom: top + f.offsetHeight, width: f.offsetWidth, height: f.offsetHeight };
}
/** Change the board (fn moves or resizes frames); the others glide from where they were. */
function _hgeReflow(grid, fn) {
  homeGridRemember(grid, homeFlip(grid, fn));
}
function _hgeFrames(grid, sel) { return [...grid.querySelectorAll(':scope > ' + (sel || '.hg-w[data-wid]'))].filter(f => !f.hidden); }

/**
 * Where a dragged widget goes (pure). boxes: the OTHER widgets in order, each {left, top,
 * right, bottom}; x, y: the pointer; gridW: the board's width. -> the index among them it
 * goes before (boxes.length = last), or null (keep where it is: over its own placeholder or
 * between things). Over a widget: its left / right half (top / bottom half when it is full
 * width); in the empty end of a shelf: after the shelf's last widget; below them all: last.
 */
function homeShelfDropIndex(boxes, x, y, gridW) {
  for (let i = 0; i < boxes.length; i++) {
    const r = boxes[i];
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    const full = (r.right - r.left) >= gridW * 0.9;
    const after = full ? y > (r.top + r.bottom) / 2 : x > (r.left + r.right) / 2;
    return i + (after ? 1 : 0);
  }
  if (!boxes.length) return null;
  if (y > Math.max(...boxes.map(b => b.bottom))) return boxes.length;
  // The empty end of a shelf: after the last widget on it that ends left of the pointer.
  let best = -1;
  for (let i = 0; i < boxes.length; i++) {
    const r = boxes[i];
    if (y >= r.top && y <= r.bottom && x > r.right) best = i;
  }
  if (best >= 0 && !boxes.slice(best + 1).some(r => y >= r.top && y <= r.bottom && r.left > boxes[best].right)) return best + 1;
  return null;
}

/**
 * Pointer moving and resizing on a board (A: the host's adapter, see 12-home-board.js). Returns {destroy(), dragging};
 * the host tears it down with its next mount.
 */
function boardEditor(grid, A) {
  const reflow = (fn) => A.reflow(grid, fn);
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  let press = null, op = null, raf = 0;
  const main = () => grid.closest('.main') || document.getElementById('main');

  function onDown(e) {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || op) return;
    const frame = e.target.closest(A.sel);
    if (!frame || frame.parentElement !== grid) return;
    const rs = e.target.closest('.hg-rs');
    if (!rs) {
      if (e.target.closest('.hg-x, .hg-chrome, button, a[href], input, select, textarea')) return;
      if (coarse && !e.target.closest('.hg-grip')) return;      // touch: drag by the grip, so the page still scrolls
    }
    if (rs) { e.preventDefault(); e.stopPropagation(); }
    press = { frame, rs: rs ? rs.dataset.dir : '', x: e.clientX, y: e.clientY };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onCancel, true);
  }
  function onMove(e) {
    if (!press) return;
    if (!op) {
      if (!press.rs && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) return;
      op = press.rs ? startResize(press) : startMove(press, e);
      if (!op) { cleanup(); return; }
    }
    e.preventDefault();
    op.px = e.clientX; op.py = e.clientY;
    if (op.kind === 'move') moveTo(e.clientX, e.clientY); else resizeTo(e.clientX, e.clientY);
    if (!raf) raf = requestAnimationFrame(scrollTick);
  }
  /** Near the top or bottom of the view, the board scrolls (also while the pointer rests there). */
  function scrollTick() {
    raf = 0;
    if (!op) return;
    const sc = main();
    if (!sc) return;
    const r = sc.getBoundingClientRect();
    const d = op.py < r.top + 56 ? -(r.top + 56 - op.py) : op.py > r.bottom - 56 ? op.py - (r.bottom - 56) : 0;
    if (!d) return;
    const before = sc.scrollTop;
    sc.scrollTop += Math.max(-22, Math.min(22, d / 3));
    if (sc.scrollTop !== before) { if (op.kind === 'move') moveTo(op.px, op.py); else resizeTo(op.px, op.py); }
    raf = requestAnimationFrame(scrollTick);
  }
  function cleanup() {
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointercancel', onCancel, true);
    press = null;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function begin() {
    for (const x of grid.querySelectorAll(':scope > .hg-slot')) x.remove();   // a change reflows the shelves
    document.body.classList.add('is-sorting');
    if (typeof closePopovers === 'function') closePopovers();
  }
  function end() {
    document.body.classList.remove('is-sorting');
    // The click that follows the pointerup lands on nothing.
    const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener('click', swallow, true);
    setTimeout(() => window.removeEventListener('click', swallow, true), 0);
  }

  /* ----- move ----- */
  function startMove(p) {
    const frame = p.frame, r = frame.getBoundingClientRect();
    begin();
    const lift = frame.cloneNode(true);
    lift.removeAttribute('id'); lift.removeAttribute('data-flip'); lift.removeAttribute('tabindex');
    lift.classList.add(...A.lift.cls);
    lift.setAttribute('aria-hidden', 'true');
    for (const x of lift.querySelectorAll('[data-flip]')) x.removeAttribute('data-flip');
    A.lift.prep(lift);
    // A tall or wide widget is carried smaller, so the board under it stays in view.
    const k = Math.max(0.4, Math.min(1, 340 / r.height, 560 / r.width));
    const dx = p.x - r.left, dy = p.y - r.top;
    Object.assign(lift.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', pointerEvents: 'none', zIndex: 'var(--z-tooltip, 1000)', transformOrigin: `${dx}px ${dy}px` });
    const tilt = _hgReduced() ? '' : ' rotate(0.6deg)';
    lift.style.transform = `scale(${k * (_hgReduced() ? 1 : 1.02)})${tilt}`;
    lift.style.animation = 'none';
    document.body.appendChild(lift);
    if (!_hgReduced() && typeof lift.animate === 'function') lift.animate([{ transform: 'none' }, { transform: lift.style.transform }], { duration: 160, easing: _HG_EASE });
    frame.classList.add('is-ghost');
    return { kind: 'move', frame, lift, dx, dy, order0: _hgeFrames(grid, A.sel).map(f => f.dataset.wid), next0: frame.nextSibling, at: null };
  }
  function moveTo(x, y) {
    const o = op;
    o.lift.style.left = (x - o.dx) + 'px';
    o.lift.style.top = (y - o.dy) + 'px';
    // After a change, wait for the pointer to move on a little (no flip-flop on the boundary).
    if (o.at && Math.hypot(x - o.at.x, y - o.at.y) < 10) return;
    const others = _hgeFrames(grid, A.sel).filter(f => f !== o.frame);
    const i = homeShelfDropIndex(others.map(_hgeBox), x, y, grid.clientWidth);
    if (i === null) return;
    const all = _hgeFrames(grid, A.sel), cur = all.indexOf(o.frame);   // = how many others come before it
    if (i === cur) return;
    const ref = i < others.length ? others[i] : (others.length ? others[others.length - 1].nextSibling : null);
    reflow(() => grid.insertBefore(o.frame, ref));
    o.at = { x, y };
  }
  function finishMove(o, commit) {
    if (!commit) reflow(() => grid.insertBefore(o.frame, o.next0 && o.next0.parentNode === grid ? o.next0 : null));
    const ids = _hgeFrames(grid, A.sel).map(f => f.dataset.wid);
    const changed = commit && ids.join('\u0000') !== o.order0.join('\u0000');
    const done = () => {
      o.lift.remove(); o.frame.classList.remove('is-ghost');
      if (changed) A.order(ids, o.frame.dataset.wid);
      else if (!commit) { A.say('Move cancelled'); A.after(grid); }
      else A.after(grid);
    };
    if (_hgReduced() || typeof o.lift.animate !== 'function') { done(); return; }
    // It lands in its placeholder with a slight settle (HOME_SPEC.md 5.6: 300 ms).
    const to = _hgeBox(o.frame), from = o.lift.getBoundingClientRect();
    const a = o.lift.animate([
      { left: o.lift.style.left, top: o.lift.style.top, transform: o.lift.style.transform },
      { left: to.left + 'px', top: to.top + 'px', transform: 'none' },
    ], { duration: 300, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)', fill: 'forwards' });
    let fired = false;
    const once = () => { if (!fired) { fired = true; done(); } };
    a.finished.then(once, once);
    setTimeout(once, 420);
    void from;
  }

  /* ----- resize ----- */
  function startResize(p) {
    const frame = p.frame, id = frame.dataset.wid, st = A.state(id);
    if (!st) return null;
    begin();
    frame.classList.add('is-resizing');
    const { gap, colW } = _hgeCols(grid);
    const r = _hgeBox(frame);
    const tip = document.createElement('span'); tip.className = 'hg-rs-tip'; tip.setAttribute('aria-hidden', 'true');
    frame.appendChild(tip);
    const o = {
      kind: 'resize', frame, id, dir: p.rs, gap, colW, tip, title: st.title, sizes: st.sizes,
      st0: { size: st.size, c: st.c, h: st.h }, cols0: st.cols, h0: st.h,
      cols: st.cols, h: st.h, fit: { size: st.size, c: st.c },
      // The size follows how far the pointer has moved since the press, not where the widget is: a widget that grows can
      // wrap to another row (its left edge jumps), and that must not change the size the pointer asks for.
      w0: r.width, h0px: r.height, x0: p.x, y0: p.y, sc0: main() ? main().scrollTop : 0,
    };
    showTip(o);
    return o;
  }
  function showTip(o) {
    boardLightSizes(o.frame, o.fit.size, !!o.fit.c);       // the preset switcher follows along (none lit for a custom width)
    o.tip.textContent = `${o.cols} of 12 columns · ${o.h ? `${o.h} rows` : 'fits its content'}`;
  }
  function resizeTo(x, y) {
    const o = op, f = o.frame;
    const dx = x - o.x0, dy = y - o.y0 + ((main() ? main().scrollTop : 0) - o.sc0);   // (the board scrolling under the pointer counts)
    let cols = o.cols, h = o.h;
    if (o.dir !== 's') cols = Math.max(1, Math.min(BOARD_COLS, Math.round((o.w0 + dx + o.gap) / (o.colW + o.gap))));
    // A widget that fits its content only gets a height once the pointer has really moved down or up.
    if (o.dir !== 'e' && (o.h || Math.abs(dy) >= 6)) h = Math.max(HOME_H_MIN, Math.min(HOME_H_MAX, Math.round((o.h0px + dy) / HOME_ROW_PX)));
    if (cols === o.cols && h === o.h) return;
    o.cols = cols; o.h = h; o.fit = boardFit(cols, o.sizes, A.map);
    reflow(() => A.preview(f, { size: o.fit.size, c: o.fit.c, h }));
    showTip(o);
  }
  function finishResize(o, commit) {
    const f = o.frame;
    f.classList.remove('is-resizing');
    o.tip.remove();
    const changed = o.cols !== o.cols0 || o.h !== o.h0;
    if (!commit || !changed) {
      if (changed) reflow(() => A.preview(f, o.st0));
      boardLightSizes(f, o.st0.size, !!o.st0.c);
      if (!commit) A.say('Resize cancelled');
      A.after(grid);
      return;
    }
    const ch = {};
    if (o.cols !== o.cols0) ch.cols = o.cols;
    if (o.h !== o.h0) ch.h = o.h;
    if (!A.setSize(o.id, ch, `${o.title}: ${o.cols} of 12 columns${o.h !== o.h0 ? `, ${o.h ? `${o.h} rows tall` : 'fits its content'}` : ''}`)) A.after(grid);
  }

  function finish(commit) {
    const o = op; op = null;
    if (!o) return;
    end();
    if (o.kind === 'move') finishMove(o, commit); else finishResize(o, commit);
  }
  function onUp() { const was = !!op; cleanup(); if (was) finish(true); }
  function onCancel() { const was = !!op; cleanup(); if (was) finish(false); }
  function onKey(e) { if (e.key === 'Escape' && op) { e.stopPropagation(); e.preventDefault(); cleanup(); finish(false); } }
  // Double-click the bottom edge: back to the content's height; the right edge: back to the preset width.
  function onDbl(e) {
    const rs = e.target.closest('.hg-rs');
    const frame = rs && rs.closest(A.sel);
    const st = frame && A.state(frame.dataset.wid);
    if (!st) return;
    const dir = rs.dataset.dir, ch = {};
    if ((dir === 's' || dir === 'se') && st.h) ch.h = null;
    if ((dir === 'e' || dir === 'se') && st.c) ch.size = st.size;
    if (!Object.keys(ch).length) return;
    e.preventDefault(); e.stopPropagation();
    A.setSize(frame.dataset.wid, ch, `${st.title}: ${ch.size ? 'back to its preset width' : 'fits its content'}`);
  }
  const noNative = (e) => { if (e.target.closest && e.target.closest(A.sel)) e.preventDefault(); };

  grid.addEventListener('pointerdown', onDown);
  grid.addEventListener('dblclick', onDbl);
  grid.addEventListener('dragstart', noNative);
  document.addEventListener('keydown', onKey, true);
  return {
    destroy() {
      grid.removeEventListener('pointerdown', onDown);
      grid.removeEventListener('dblclick', onDbl);
      grid.removeEventListener('dragstart', noNative);
      document.removeEventListener('keydown', onKey, true);
      cleanup();
      if (op) { const o = op; op = null; document.body.classList.remove('is-sorting'); if (o.lift) o.lift.remove(); if (o.frame) o.frame.classList.remove('is-ghost', 'is-resizing'); }
    },
    get dragging() { return !!op; },
  };
}

/* ---------- Home's adapter for the board engine (12-home-board.js lists what an adapter has) ---------- */
let _homeBoardA = null;
function homeBoardAdapter() {
  if (_homeBoardA) return _homeBoardA;
  return (_homeBoardA = {
    sel: '.hg-w[data-wid]',
    map: HOME_SIZE_COLS, presets: HOME_SIZES,
    sizeName: (s) => HOME_SIZE_LABEL[s] || s,
    state(id) {
      const w = homeLayout().widgets.find(x => x.id === id), d = homeWidgetDef(id);
      return w && d ? { size: w.size, c: w.c, cols: homeColsOf(w), h: w.h || null, sizes: d.sizes, title: d.title } : null;
    },
    setSize: (id, ch, say) => homeWidgetSet(id, ch, say),
    preview(f, st) {
      f.dataset.size = st.size;
      if (st.c) f.dataset.c = String(st.c); else delete f.dataset.c;
      if (st.h) { f.dataset.h = String(st.h); f.style.setProperty('--hg-h', String(st.h)); }
      else { delete f.dataset.h; f.style.removeProperty('--hg-h'); }
    },
    ids: () => _homeVisibleIds(),
    moveTo: (id, j) => homeWidgetMoveTo(id, j),
    order: (ids, movedId) => homeWidgetOrder(ids, movedId),
    remove: (id) => homeWidgetHide(id),
    add: () => _homeOpenGallery(),
    say: (msg) => homeAnnounce(msg),
    reflow: (grid, fn) => _hgeReflow(grid, fn),
    after: (grid) => _homeGapSlots(grid),
    lift: { cls: ['sortable-lift', 'hg-lift'], prep() {} },
  });
}
/** Pointer moving and resizing on Home's board. Torn down with the next mount (the '_edit' record). */
function _homeGridEditor(grid) { return boardEditor(grid, homeBoardAdapter()); }

/* ---------- the changes (keyboard and pointer) ---------- */
/**
 * Size, width and / or height of one widget in one save. ch: {size: a preset (drops a custom width), cols: any width 1-12,
 * h: rows, null = fits its content}.
 */
function homeWidgetSet(id, ch, say) {
  const def = homeWidgetDef(id);
  if (!def) return false;
  _homeEditFocusId = id;
  const next = homeLayout().widgets.map(w => {
    if (w.id !== id) return w;
    const o = Object.assign({}, w);
    if (ch.size && def.sizes.includes(ch.size)) { o.size = ch.size; delete o.c; }
    if (ch.cols) { const f = boardFit(ch.cols, def.sizes, HOME_SIZE_COLS); o.size = f.size; if (f.c) o.c = f.c; else delete o.c; }
    if (ch.h !== undefined) { if (ch.h) o.h = ch.h; else delete o.h; }
    return o;
  });
  return homeSaveLayout(next, { say });
}
/** A widget's width in columns (1-12; one save). */
function homeWidgetCols(id, n) {
  const def = homeWidgetDef(id);
  if (!def) return;
  if (!homeWidgetSet(id, { cols: n }, `${def.title}: ${n} of 12 columns`)) homeAnnounce(`${def.title} is already ${n} of 12 columns`);
}
/** Put a widget at index j among the other shown widgets. */
function homeWidgetMoveTo(id, j) {
  const ids = _homeVisibleIds().filter(x => x !== id);
  ids.splice(Math.max(0, Math.min(ids.length, j)), 0, id);
  homeWidgetOrder(ids, id);
}
/** Up / down a shelf (dir -1 / 1): it goes before (up) or after (down) the widget on that shelf nearest its centre. */
function homeWidgetMoveRow(id, dir) {
  boardMoveRow(homeBoardAdapter(), document.querySelector('#main-body .home-grid'), id, dir);
}
/** A widget's height in rows (null = fits its content). */
function homeWidgetHeight(id, h) {
  const def = homeWidgetDef(id);
  if (!def) return;
  const v = h == null ? null : Math.max(HOME_H_MIN, Math.min(HOME_H_MAX, Math.round(h)));
  if (!homeWidgetSet(id, { h: v }, `${def.title}: ${v ? `${v} rows tall` : 'fits its content'}`)) homeAnnounce(`${def.title} is already ${v ? `${v} rows tall` : 'fitting its content'}`);
}
/** One row taller (1) or shorter (-1); from its content's height the first time. */
function homeWidgetHeightStep(id, dir) {
  const w = homeLayout().widgets.find(x => x.id === id);
  if (!w) return;
  let cur = w.h;
  if (!cur) {
    const f = document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(id)}"]`);
    cur = Math.round((f ? f.offsetHeight : 6 * HOME_ROW_PX) / HOME_ROW_PX);
  }
  const n = Math.max(HOME_H_MIN, Math.min(HOME_H_MAX, cur + dir));
  if (n === w.h) { homeAnnounce(`${homeWidgetDef(id).title} is already as ${dir > 0 ? 'tall' : 'short'} as it goes`); return; }
  homeWidgetHeight(id, n);
}

/* ---------- Customise's own Undo (the toolbar button): the layout before each change ---------- */
let _homeEditUndo = [];
function _homeEditPushUndo() {
  const h = homeState();
  _homeEditUndo.push(JSON.stringify({ layout: h.layout === undefined ? null : h.layout, widgetPrefs: h.widgetPrefs === undefined ? null : h.widgetPrefs }));
  if (_homeEditUndo.length > 50) _homeEditUndo.shift();
}
function homeEditUndo() {
  const s = _homeEditUndo.pop();
  if (!s) { homeAnnounce('Nothing to undo'); return; }
  const p = JSON.parse(s);
  _homeRememberNow();
  homeUpdate({ layout: p.layout === null ? undefined : p.layout, widgetPrefs: p.widgetPrefs === null ? undefined : p.widgetPrefs });
  homeAnnounce('Undone');
}
