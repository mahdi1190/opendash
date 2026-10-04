/* ============================================================
   HOME GRID: how the widgets sit and move. Owner: Home foundation.

   Layout: .home-grid is a 12-column CSS grid of "shelves": widgets fill rows
   in their saved order and size, the widgets on a row stretch to the same
   height (13-home-core.css), so where a widget sits never depends on today's
   content (HOME_SPEC.md 1-2). A ResizeObserver glides the rest when a
   widget's content changes (calendar or finances arriving) without a flip.
   A frame whose height changes (its content, or a neighbour on its shelf)
   glides its box height, so the rows below ride along.

   FLIP ("glide"): elements carrying data-flip="<key>" are measured before a
   change and animated from where they were to where they are now. Keys are
   scoped by the closest data-flip ancestor, so a card inside a widget is
   measured relative to its widget. data-flip-h also animates the height
   (the element clips while it grows or shrinks; what follows it in the same
   flow simply rides along). data-flip-size: when its width changes, it
   morphs (width, and the height of its [data-flip-clip] child) instead of
   jumping; the widget frames use it. Interruptible: a new change starts from
   where things are on screen. Nothing moves with reduced motion or a hidden tab.

     homeFlipCapture(root)           -> Map of boxes
     homeFlipPlay(root, first, opts) -> animates; returns the settled boxes
     homeFlip(root, fn, opts)        capture, fn() (changes the DOM), play
     homeEnter(els)                  the small fade/rise for items that are new
   The section keeps the last settled boxes (homeGridRemember), so a whole
   re-render (a save, undo, live sync from the assistant) glides too.
   ============================================================ */
const _HG_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const _HG_MS = 320;
let _hgLast = null;            // Map: the settled boxes after the last render
let _hgRO = null;              // ResizeObserver on the widgets
let _hgBusyUntil = 0;          // a glide is running until then: repack after it
let _hgBusyTimer = 0;
let _hgWidth = 0;              // grid width at the last pack (a resize repacks without gliding)

function _hgReduced() { return !!(window.Motion && Motion.prefersReduced()) || document.hidden; }

/**
 * An element's box on screen: where it is now (running glides included, so a new change
 * starts from what is seen) but with its LAYOUT size, measured from its centre. A rotation
 * or a scale (Customise's sway, an entrance) then never reads as a size change or a move.
 */
function _hgBox(el) {
  const r = el.getBoundingClientRect();
  const w = typeof el.offsetWidth === 'number' ? el.offsetWidth : r.width;
  const h = typeof el.offsetHeight === 'number' ? el.offsetHeight : r.height;
  return { left: (r.left + r.right - w) / 2, top: (r.top + r.bottom - h) / 2, width: w, height: h };
}
/**
 * A box inside a widget whose frame is rotated or scaled (Customise's sway, a lifted widget),
 * with that rotation / scale undone about the frame's centre. The sway turns a widget by
 * 0.22 degrees, which moves the rows inside a tall one by up to 2 px on screen while nothing
 * moved in the layout; measured as is, every ResizeObserver pass in Customise played those
 * as glides. The frame's own translation (a running glide) is kept. cache: Map frame -> t.
 */
function _hgUnsway(el, r, cache) {
  const fr = typeof el.closest === 'function' ? el.closest('.hg-w') : null;
  if (!fr || fr === el) return r;
  let t = cache.get(fr);
  if (t === undefined) {
    t = null;
    const s = typeof getComputedStyle === 'function' ? getComputedStyle(fr).transform : 'none';
    if (s && s !== 'none' && typeof DOMMatrixReadOnly === 'function') {
      const m = new DOMMatrixReadOnly(s);
      const det = m.a * m.d - m.b * m.c;
      if (Math.abs(det) > 1e-6 && (Math.abs(m.a - 1) > 1e-6 || Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6 || Math.abs(m.d - 1) > 1e-6)) {
        const fb = fr.getBoundingClientRect();
        t = { fx: (fb.left + fb.right) / 2, fy: (fb.top + fb.bottom) / 2, ia: m.d / det, ib: -m.b / det, ic: -m.c / det, id: m.a / det };
      }
    }
    cache.set(fr, t);
  }
  if (!t) return r;
  const cx = r.left + r.width / 2 - t.fx, cy = r.top + r.height / 2 - t.fy;
  const x = t.fx + t.ia * cx + t.ic * cy, y = t.fy + t.ib * cx + t.id * cy;
  return { left: x - r.width / 2, top: y - r.height / 2, width: r.width, height: r.height };
}
/** Every keyed box in root, relative to its closest keyed ancestor (or root). */
function homeFlipCapture(root) {
  const m = new Map();
  if (!root || !root.isConnected) return m;
  const r0 = _hgBox(root);
  const sway = new Map();
  for (const el of root.querySelectorAll('[data-flip]')) {
    if (el.closest('[hidden]')) continue;
    const r = _hgUnsway(el, _hgBox(el), sway);
    if (!r.width && !r.height) continue;
    const ref = el.parentElement ? el.parentElement.closest('[data-flip]') : null;
    const inRoot = ref && root.contains(ref);
    const b = inRoot ? _hgUnsway(ref, _hgBox(ref), sway) : r0;
    m.set((inRoot ? ref.dataset.flip : '') + '>' + el.dataset.flip, { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height });
  }
  return m;
}
function _hgKey(el, root) {
  const ref = el.parentElement ? el.parentElement.closest('[data-flip]') : null;
  return (ref && root.contains(ref) ? ref.dataset.flip : '') + '>' + el.dataset.flip;
}
/** Stop the glides we started under root, so measurements are true. */
function _hgCancel(root) {
  for (const el of root.querySelectorAll('[data-flip], [data-flip-clip]')) {
    if (typeof el.getAnimations !== 'function') continue;
    for (const a of el.getAnimations()) if (a.id === 'hg-flip' || a.id === 'hg-flip-h') a.cancel();
    if (el.dataset.hgClip) { el.style.overflow = ''; delete el.dataset.hgClip; }
  }
}
/**
 * Animate keyed elements from `first` (homeFlipCapture before the change) to
 * where they are now. Returns the settled boxes. opts: {duration, enter}
 * (enter: fade in keyed elements that were not there before).
 */
function homeFlipPlay(root, first, opts) {
  opts = opts || {};
  if (!root || !root.isConnected) return new Map();
  _hgCancel(root);
  const settled = homeFlipCapture(root);
  if (!first || !first.size || _hgReduced() || typeof root.animate !== 'function') return settled;
  const dur = opts.duration || _HG_MS;
  let els = [...root.querySelectorAll('[data-flip]')].filter(el => !el.closest('[hidden]'));
  let any = false;
  // 0. A widget that changed size morphs: its width and its body's height animate
  //    (content reflows inside, clipped); what is inside it is not glided separately.
  const morphing = [];
  for (const el of els) {
    if (!el.hasAttribute('data-flip-size')) continue;
    const k = _hgKey(el, root), a = first.get(k), b = settled.get(k);
    if (!a || !b) continue;
    if (Math.abs(a.w - b.w) < 1) {
      // Same width, new height (its own content, or a neighbour on its shelf grew): the box
      // glides to it. Height is laid out, so the rows below ride along instead of jumping;
      // nothing is clipped (the content already fits the larger of the two heights, or
      // clips itself, like a Focus card).
      if (Math.abs(a.h - b.h) >= 1) {
        const body = el.querySelector(':scope > [data-flip-clip]');
        if (body) { const ab = body.animate([{ height: a.h + 'px' }, { height: b.h + 'px' }], { duration: dur, easing: _HG_EASE }); ab.id = 'hg-flip-h'; any = true; }
      }
      continue;
    }
    morphing.push(el);
    const an = el.animate([{ width: a.w + 'px' }, { width: b.w + 'px' }], { duration: dur, easing: _HG_EASE });
    an.id = 'hg-flip-h';
    // It sits above the others while it grows, so a neighbour wrapping to the next row slides under it.
    el.style.zIndex = '3';
    const lower = () => { if (!el.getAnimations().some(x => x.id === 'hg-flip-h' && x.playState === 'running')) el.style.zIndex = ''; };
    an.finished.then(lower, lower);
    const clip = el.querySelector(':scope > [data-flip-clip]') || el;
    clip.dataset.hgClip = '1'; clip.style.overflow = 'hidden';
    const ah = clip.animate([{ height: a.h + 'px' }, { height: b.h + 'px' }], { duration: dur, easing: _HG_EASE });
    ah.id = 'hg-flip-h';
    const clear = () => { if (clip.dataset.hgClip) { clip.style.overflow = ''; delete clip.dataset.hgClip; } };
    ah.finished.then(clear, clear);
    any = true;
  }
  if (morphing.length) els = els.filter(el => !morphing.some(m => m !== el && m.contains(el)));
  // 1. Heights first: what follows a growing card in the same flow rides along with it.
  for (const el of els) {
    if (!el.hasAttribute('data-flip-h')) continue;
    const k = _hgKey(el, root), a = first.get(k), b = settled.get(k);
    if (!a || !b || Math.abs(a.h - b.h) < 1) continue;
    el.dataset.hgClip = '1'; el.style.overflow = 'hidden';
    const an = el.animate([{ height: a.h + 'px' }, { height: b.h + 'px' }], { duration: dur, easing: _HG_EASE });
    an.id = 'hg-flip-h';
    const clear = () => { if (el.dataset.hgClip) { el.style.overflow = ''; delete el.dataset.hgClip; } };
    an.finished.then(clear, clear);
    any = true;
  }
  // 2. Positions, measured with those heights in place.
  const now = any ? homeFlipCapture(root) : settled;
  for (const el of els) {
    const k = _hgKey(el, root), a = first.get(k), b = now.get(k);
    if (!b) continue;
    if (!a) {
      if (opts.enter) { const an = el.animate([{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }], { duration: dur, easing: _HG_EASE }); an.id = 'hg-flip'; any = true; }
      continue;
    }
    const dx = a.x - b.x, dy = a.y - b.y;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    const an = el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: dur, easing: _HG_EASE });
    an.id = 'hg-flip';
    any = true;
  }
  if (any) _hgBusy(root, dur);
  return settled;
}
/** Capture, change, glide. Returns the settled boxes. */
function homeFlip(root, fn, opts) {
  const first = homeFlipCapture(root);
  fn();
  return homeFlipPlay(root, first, opts);
}
/** The small entrance for items that are new since Home was entered. */
function homeEnter(els) {
  const list = [...(els || [])].filter(el => el && el.isConnected);
  if (!list.length || _hgReduced() || !window.Motion) return;
  list.slice(0, 10).forEach((el, i) => Motion.animate(el, [
    { opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' },
  ], { duration: 260, delay: 40 + i * 40, easing: _HG_EASE, fill: 'backwards' }));
}

/* ---------- shelves ---------- */
/**
 * The grid lays itself out (rows of 12 columns, stretched; 13-home-core.css), so
 * there is nothing to pack: a widget's place depends only on the saved order and
 * sizes, never on today's content (HOME_SPEC.md 1-2). Kept as the hook callers
 * use after a change; returns false (nothing for the caller to glide by itself).
 */
function homeGridPack(grid) {
  if (!grid || !grid.isConnected) return false;
  grid.classList.add('is-packed');
  _hgWidth = grid.clientWidth;
  return false;
}
/** After a whole re-render: glide from the last settled layout (or just remember this one). */
function homeGridSettle(grid, glide) {
  _hgLast = glide && _hgLast ? homeFlipPlay(grid, _hgLast) : homeFlipCapture(grid);
}
/** Keep the settled boxes (pass the map homeFlip/homeFlipPlay returned). */
function homeGridRemember(grid, settled) {
  if (settled) _hgLast = settled;
  else if (performance.now() >= _hgBusyUntil) _hgLast = homeFlipCapture(grid);
}
/** Before a change that re-renders Home: remember where things are on screen now. */
function _homeRememberNow() {
  const g = document.querySelector('#main-body .home-grid');
  if (g) _hgLast = homeFlipCapture(g);
}
function homeGridForget() { _hgLast = null; _hgEnter = null; }
function _hgBusy(root, dur) {
  _hgBusyUntil = Math.max(_hgBusyUntil, performance.now() + dur + 30);
  clearTimeout(_hgBusyTimer);
  _hgBusyTimer = setTimeout(() => { const g = document.querySelector('#main-body .home-grid'); if (g) _hgOnResize(g); }, dur + 60);
}
/**
 * A widget changed size on its own (content arrived, a widget repainted without
 * a flip): the browser has already moved the rest; glide them from where they
 * were (the last settled boxes). The ResizeObserver runs before paint, so
 * nothing is seen in its new place first. A window resize just re-measures.
 */
function _hgOnResize(grid) {
  if (!grid || !grid.isConnected) return;
  if (performance.now() < _hgBusyUntil) return;               // the busy timer comes back
  const resized = Math.abs(grid.clientWidth - _hgWidth) > 1;
  _hgWidth = grid.clientWidth;
  _hgLast = resized || !_hgLast ? homeFlipCapture(grid) : homeFlipPlay(grid, _hgLast);
}
function homeGridObserve(grid) {
  homeGridUnobserve();
  if (typeof ResizeObserver !== 'function' || !grid) return;
  _hgRO = new ResizeObserver(() => _hgOnResize(grid));
  for (const f of grid.querySelectorAll(':scope > .hg-w')) _hgRO.observe(f);
}
function homeGridUnobserve() { if (_hgRO) { _hgRO.disconnect(); _hgRO = null; } }

/**
 * The once-per-entry entrance (HOME_SPEC.md 5.4): the widgets in view rise in
 * reading order, 460 ms each, 55 ms apart (at most 6 steps). Home runs this
 * itself instead of the generic Motion.stagger (12-home.js leaves a zero-size
 * [data-stagger] marker so that one finds nothing to animate). Plain WAAPI, so
 * it also runs at boot, before motion.js has loaded.
 */
let _hgEnter = null;           // the running entrance: {at, ids} (a re-render continues it)
function homeGridEntrance(grid) {
  _hgEnter = null;
  if (!grid || !grid.isConnected || typeof grid.animate !== 'function') return;
  const reduced = document.hidden || document.documentElement.getAttribute('data-motion') === 'reduced'
    || (window.Motion ? Motion.prefersReduced() : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches));
  if (reduced) return;
  const sc = document.getElementById('main');
  const vb = sc ? sc.getBoundingClientRect() : { top: 0, bottom: innerHeight };
  const frames = [...grid.querySelectorAll(':scope > .hg-w')].filter(f => {
    if (f.hidden) return false;
    const r = f.getBoundingClientRect();
    return r.height && r.bottom > vb.top && r.top < vb.bottom;
  }).sort((a, b) => (a.offsetTop - b.offsetTop) || (a.offsetLeft - b.offsetLeft));
  _hgEnter = { at: performance.now(), ids: frames.map(f => f.dataset.wid || '') };
  _hgRise(frames, 0);
  // Measuring mid-rise would read the risen offsets as moves: glides wait until it has landed.
  if (frames.length) _hgBusy(grid, 460 + Math.min(frames.length - 1, 6) * 55);
}
function _hgRise(frames, elapsed) {
  frames.forEach((f, i) => {
    if (!f) return;
    const delay = Math.min(i, 6) * 55 - elapsed;
    if (delay <= -460) return;                              // that one has landed already
    const an = f.animate([{ opacity: 0, transform: 'translateY(12px) scale(0.99)' }, { opacity: 1, transform: 'none' }],
      { duration: 460, delay, easing: _HG_EASE, fill: 'backwards' });
    an.id = 'hg-enter';
  });
}
/**
 * A re-render while the entrance is still running (at boot the saved copy paints first,
 * then the file's copy replaces it; a save or live sync in the first moments): the new
 * frames pick the rise up where it was, instead of popping in or starting again.
 */
function homeGridEntranceContinue(grid) {
  if (!_hgEnter || !grid || typeof grid.animate !== 'function') return;
  const elapsed = performance.now() - _hgEnter.at;
  if (elapsed >= 460 + 6 * 55) { _hgEnter = null; return; }
  _hgRise(_hgEnter.ids.map(id => grid.querySelector(`:scope > .hg-w[data-wid="${CSS.escape(id)}"]`)), elapsed);
}

/** A widget that was just added: bring it into view and let it arrive. */
function homeGridArrive(grid, id) {
  const f = grid.querySelector(`:scope > .hg-w[data-wid="${CSS.escape(id)}"]`);
  if (!f || f.hidden) return;
  const reduced = _hgReduced();
  try { f.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); } catch (e) { /* old browser */ }
  f.classList.add('is-arriving');
  setTimeout(() => f.classList.remove('is-arriving'), 1400);
  if (!reduced && window.Motion) Motion.animate(f, [{ opacity: 0, transform: 'translateY(10px) scale(0.97)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: _HG_EASE });
}
