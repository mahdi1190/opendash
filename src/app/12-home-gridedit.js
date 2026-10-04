/* ============================================================
   HOME GRID EDITOR (Customise). Owner: Home foundation.
   The board is a 12-column grid of shelves (12-home-grid.js). While customising:

   Move: press a widget and drag. It lifts (a copy follows the pointer, shrunk
     when it is tall so the board stays visible) and its place on the board
     becomes a dashed placeholder that IS the preview: it moves to where the
     widget would land and the other widgets glide (FLIP) around it. Over a
     widget, its left or right half (top or bottom half for a full-width one)
     says before or after it; the empty end of a shelf means after its last
     widget; below the board means last. Release saves; Esc puts it back.
   Resize: each widget has handles on its right edge (width), bottom edge
     (height) and bottom-right corner (both). Width snaps to the widget's own
     sizes (columns of 12: 4, 6, 8, 12); height snaps to rows of HOME_ROW_PX
     (double-click the bottom edge = back to the content's height). The
     widget changes live and the others reflow and glide; a badge says the
     size. Release saves; Esc puts it back.
   Every change is one save (homeSaveLayout) and goes on Customise's own Undo
   (the toolbar's Undo button). Nothing glides with reduced motion.
   Keyboard (12-home-edit.js _homeEditKey): arrows move, Shift+arrows resize.
   The hero is not on the grid: it stays where it is.
   Public: _homeGridEditor(grid) -> {destroy()}, _homeResizeHandles(frame, def),
   homeWidgetMoveTo(id, j), homeWidgetMoveRow(id, dir), homeWidgetHeight(id, h),
   homeWidgetHeightStep(id, dir), homeShelfDropIndex(boxes, x, y, gridW) (pure).
   ============================================================ */

/** The columns `size` takes on this screen (narrow screens map sizes to halves and wholes). */
function _hgeSpan(frame, size) {
  const was = frame.dataset.size;
  frame.dataset.size = size;
  const span = Math.min(12, parseInt(getComputedStyle(frame).getPropertyValue('--hg-span'), 10) || HOME_SIZE_COLS[size] || 12);
  frame.dataset.size = was;
  return span;
}
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
function _hgeFrames(grid) { return [...grid.querySelectorAll(':scope > .hg-w[data-wid]')].filter(f => !f.hidden); }

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

/* ---------- resize handles (added by _homeEditChrome) ---------- */
function _homeResizeHandles(frame, def) {
  const multi = def.sizes.length > 1;
  const mk = (dir, label) => {
    const h = document.createElement('span'); h.className = 'hg-rs hg-rs-' + dir; h.dataset.dir = dir;
    h.setAttribute('aria-hidden', 'true'); h.title = label;
    frame.appendChild(h);
  };
  if (multi) mk('e', 'Drag to change the width');
  mk('s', 'Drag to change the height (double-click: fit the content)');
  mk('se', multi ? 'Drag to resize' : 'Drag to change the height');
}

/** Pointer moving and resizing on the board. Torn down with the next mount (the '_edit' record). */
function _homeGridEditor(grid) {
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  let press = null, op = null, raf = 0;
  const main = () => grid.closest('.main') || document.getElementById('main');

  function onDown(e) {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || op) return;
    const frame = e.target.closest('.hg-w[data-wid]');
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
    lift.classList.add('sortable-lift', 'hg-lift');
    lift.setAttribute('aria-hidden', 'true');
    for (const x of lift.querySelectorAll('[data-flip]')) x.removeAttribute('data-flip');
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
    return { kind: 'move', frame, lift, dx, dy, order0: _hgeFrames(grid).map(f => f.dataset.wid), next0: frame.nextSibling, at: null };
  }
  function moveTo(x, y) {
    const o = op;
    o.lift.style.left = (x - o.dx) + 'px';
    o.lift.style.top = (y - o.dy) + 'px';
    // After a change, wait for the pointer to move on a little (no flip-flop on the boundary).
    if (o.at && Math.hypot(x - o.at.x, y - o.at.y) < 10) return;
    const others = _hgeFrames(grid).filter(f => f !== o.frame);
    const i = homeShelfDropIndex(others.map(_hgeBox), x, y, grid.clientWidth);
    if (i === null) return;
    const all = _hgeFrames(grid), cur = all.indexOf(o.frame);   // = how many others come before it
    if (i === cur) return;
    const ref = i < others.length ? others[i] : (others.length ? others[others.length - 1].nextSibling : null);
    _hgeReflow(grid, () => grid.insertBefore(o.frame, ref));
    o.at = { x, y };
  }
  function finishMove(o, commit) {
    if (!commit) _hgeReflow(grid, () => grid.insertBefore(o.frame, o.next0 && o.next0.parentNode === grid ? o.next0 : null));
    const ids = _hgeFrames(grid).map(f => f.dataset.wid);
    const changed = commit && ids.join('\u0000') !== o.order0.join('\u0000');
    const done = () => {
      o.lift.remove(); o.frame.classList.remove('is-ghost');
      if (changed) homeWidgetOrder(ids, o.frame.dataset.wid);
      else if (!commit) homeAnnounce('Move cancelled');
      else _homeGapSlots(grid);
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
    const frame = p.frame, def = homeWidgetDef(frame.dataset.wid);
    if (!def) return null;
    begin();
    frame.classList.add('is-resizing');
    const { gap, colW } = _hgeCols(grid);
    const r = _hgeBox(frame);
    const tip = document.createElement('span'); tip.className = 'hg-rs-tip'; tip.setAttribute('aria-hidden', 'true');
    frame.appendChild(tip);
    const o = {
      kind: 'resize', frame, def, dir: p.rs, gap, colW, tip,
      spans: def.sizes.map(s => [s, _hgeSpan(frame, s)]),
      size0: frame.dataset.size, h0: frame.dataset.h ? Number(frame.dataset.h) : null,
      // where the pointer is inside the edge it holds, so the edge does not jump to the pointer
      offX: r.right - p.x, offY: r.bottom - p.y,
    };
    o.size = o.size0; o.h = o.h0;
    showTip(o);
    return o;
  }
  function showTip(o) {
    // The size switcher follows along.
    for (const b of o.frame.querySelectorAll(':scope > .hg-chrome .hg-sizes button[data-size]')) {
      const on = b.dataset.size === o.size;
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
    }
    const span = (o.spans.find(s => s[0] === o.size) || [0, 12])[1];
    const label = (_HG_SIZE_LONG[o.size] || o.size).split(' · ')[0];
    o.tip.textContent = `${label} · ${span} of 12 columns · ${o.h ? `${o.h} rows` : 'fits its content'}`;
  }
  function resizeTo(x, y) {
    const o = op, f = o.frame, r = _hgeBox(f);
    let size = o.size, h = o.h;
    if (o.dir !== 's' && o.spans.length > 1) {
      const cols = (x + o.offX - r.left + o.gap) / (o.colW + o.gap);
      let best = o.spans[0], bd = Infinity;
      for (const s of o.spans) {
        const d = Math.abs(s[1] - cols) - (s[0] === o.size ? 0.35 : 0);   // a little stickiness at the current size
        if (d < bd) { best = s; bd = d; }
      }
      size = best[0];
    }
    if (o.dir !== 'e') {
      h = Math.max(HOME_H_MIN, Math.min(HOME_H_MAX, Math.round((y + o.offY - r.top) / HOME_ROW_PX)));
    }
    if (size === o.size && h === o.h) return;
    o.size = size; o.h = h;
    _hgeReflow(grid, () => {
      f.dataset.size = size;
      if (h) { f.dataset.h = String(h); f.style.setProperty('--hg-h', String(h)); }
    });
    showTip(o);
  }
  function finishResize(o, commit) {
    const f = o.frame;
    f.classList.remove('is-resizing');
    o.tip.remove();
    const changed = o.size !== o.size0 || o.h !== o.h0;
    if (!commit || !changed) {
      if (changed) _hgeReflow(grid, () => {
        f.dataset.size = o.size0;
        if (o.h0) { f.dataset.h = String(o.h0); f.style.setProperty('--hg-h', String(o.h0)); }
        else { delete f.dataset.h; f.style.removeProperty('--hg-h'); }
      });
      if (!commit) homeAnnounce('Resize cancelled');
      _homeGapSlots(grid);
      return;
    }
    homeWidgetSet(o.def.id, { size: o.size, h: o.h }, `${o.def.title}: ${HOME_SIZE_LABEL[o.size] || o.size}${o.h !== o.h0 ? `, ${o.h ? `${o.h} rows tall` : 'fits its content'}` : ''}`);
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
  // Double-click the bottom edge: back to the content's height.
  function onDbl(e) {
    const rs = e.target.closest('.hg-rs-s, .hg-rs-se');
    const frame = rs && rs.closest('.hg-w[data-wid]');
    if (!frame || !frame.dataset.h) return;
    e.preventDefault(); e.stopPropagation();
    homeWidgetHeight(frame.dataset.wid, null);
  }
  const noNative = (e) => { if (e.target.closest && e.target.closest('.hg-w')) e.preventDefault(); };

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
      if (op) { const o = op; op = null; document.body.classList.remove('is-sorting'); if (o.lift) o.lift.remove(); }
    },
    get dragging() { return !!op; },
  };
}

/* ---------- the changes (keyboard and pointer) ---------- */
/** Size and / or height of one widget (h: null = fits its content). One save. */
function homeWidgetSet(id, ch, say) {
  const def = homeWidgetDef(id);
  if (!def) return false;
  _homeEditFocusId = id;
  const next = homeLayout().widgets.map(w => {
    if (w.id !== id) return w;
    const o = Object.assign({}, w);
    if (ch.size && def.sizes.includes(ch.size)) o.size = ch.size;
    if (ch.h !== undefined) { if (ch.h) o.h = ch.h; else delete o.h; }
    return o;
  });
  return homeSaveLayout(next, { say });
}
/** Put a widget at index j among the other shown widgets. */
function homeWidgetMoveTo(id, j) {
  const ids = _homeVisibleIds().filter(x => x !== id);
  ids.splice(Math.max(0, Math.min(ids.length, j)), 0, id);
  homeWidgetOrder(ids, id);
}
/**
 * Up / down a shelf (dir -1 / 1): it goes before (up) or after (down) the widget on that
 * shelf nearest its centre, so it lands on that shelf.
 */
function homeWidgetMoveRow(id, dir) {
  const grid = document.querySelector('#main-body .home-grid');
  const def = homeWidgetDef(id);
  if (!grid || !def) return;
  const frames = _hgeFrames(grid), me = frames.find(f => f.dataset.wid === id);
  if (!me) return;
  const tops = [...new Set(frames.map(f => f.offsetTop))].sort((a, b) => a - b);
  const row = tops.indexOf(me.offsetTop), want = tops[row + dir];
  if (want === undefined) {
    // Already on the first / last shelf: first / last place.
    const ids = _homeVisibleIds();
    if ((dir < 0 && ids[0] === id) || (dir > 0 && ids[ids.length - 1] === id)) { homeAnnounce(`${def.title} is already ${dir < 0 ? 'first' : 'last'}`); return; }
    homeWidgetMoveTo(id, dir < 0 ? 0 : ids.length);
    return;
  }
  const cx = me.offsetLeft + me.offsetWidth / 2;
  const on = frames.filter(f => f !== me && f.offsetTop === want);
  if (!on.length) return;
  const near = on.reduce((a, b) => (Math.abs(b.offsetLeft + b.offsetWidth / 2 - cx) < Math.abs(a.offsetLeft + a.offsetWidth / 2 - cx) ? b : a));
  const others = _homeVisibleIds().filter(x => x !== id);
  homeWidgetMoveTo(id, others.indexOf(near.dataset.wid) + (dir > 0 ? 1 : 0));
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
