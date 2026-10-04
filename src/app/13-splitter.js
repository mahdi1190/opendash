/* ============================================================
   SPLITTER: drag to resize a pane (owner: Shell/Design).
   User request, 3 Oct: "make sure we can resize the side bar by clicking and
   dragging among any other element that might be useful".

   makeSplitter({id, edge, min, max, def, collapseAt, collapsedSize, label,
                 get(), apply(px, collapsed, live), commit(r), reset(), cls})
     -> a handle element (role=separator, focusable). `edge` is the side of the
        pane the handle sits on: 'right' (a left-hand pane: drag right = wider),
        'left' (a right-hand pane: drag left = wider), 'bottom' / 'top' for rows.
        Pointer events (mouse, touch, pen) with pointer capture; the size is
        applied once per animation frame; double-click = default size; keyboard:
        arrows +-16 px (Shift +-64), Home = min, End = max, Enter = default.
        min / max / def may be functions (read at drag time, e.g. from the
        viewport). Below `collapseAt` the pane snaps to `collapsedSize`
        (the sidebar's icon rail); dragging back out restores it.
   Sizes are remembered per pane in state.paneSizes (UI key: saveUI, no undo):
     paneSize(id, def, min, max) / paneSizeSet(id, px|null).
   Pure maths (unit-tested): splitClamp, splitDrag, splitSnap, splitStep,
   rzSize.

   makeResizable(el, {key, edges, min, max, def, center, onResize, vars})
     -> {reset(), size(), apply(), destroy()}   (User request, 3 Oct: "make sure we can
        resize the windows that open by dragging")
     Any window-like surface (dialog, drawer, palette, the centre card): grab
     edges/corners (8 px hit area, resize cursors), the size is remembered per
     window TYPE in localStorage ('dash-window-sizes-v1', key = `key`),
     clamped to the viewport (16 px margin) and to `min`; double-click a
     handle = the default size; the corner handle is focusable: arrows +-16 px
     (Shift +-64), Enter resets. Off below 700 px wide (no handles, no saved
     size). Applied once per animation frame while dragging; contents with a
     ResizeObserver (ECharts in Finances) re-layout as it goes.
       key     'card' | 'dialog:<type>' | 'drawer:<id>' | 'palette' | ...
       edges   any of 'n','e','s','w','ne','nw','se','sw' (default e, w, s, se, sw)
       min/max {w, h} in px (or functions); max defaults to the viewport
       def     {w, h} the default size (else the element's CSS size)
       center  'x' | 'xy' | '' : the element is centred on that axis, so both
               sides move: dragging an edge d px changes the size by 2d
       vars    {w:'--x-w', h:'--x-h'} write CSS variables instead of width/height
       onResize(size, live)
     Used by: the centre card (61-task-card.js), openDialog (every modal:
     quick add, confirm/prompt, reschedule, the calendar's new task...), the
     legacy #modal-overlay card, openDrawer (every drawer), the command
     palette (width only). Windows owned elsewhere (Finances drawers, the
     story player, the server log) can call it the same way.
   splitSync() (render() calls it) applies the remembered sizes as CSS
   variables and mounts the handles on the panes that exist: the sidebar, the
   task detail panel (also People's person panel: both use --detail-w), the
   assistant, the calendar's agenda rail and event panel. Drawers (Files
   Explore and the others) take a handle through openDrawer({resizeId}); the
   centre card has its own edges (61-task-card.js). Home's layout belongs to
   the Home area: it can add makeSplitter({id:'homeRail', ...}) itself.
   ============================================================ */

/* ---------- pure maths ---------- */
/** Clamp to [min, max] and round to a whole pixel (max below min means min). */
function splitClamp(v, min, max) {
  v = Number(v);
  min = Number(min) || 0;
  max = Number(max);
  if (!isFinite(max) || max < min) max = Math.max(min, isFinite(max) ? max : min);
  if (!isFinite(v)) return Math.round(min);
  return Math.round(Math.min(max, Math.max(min, v)));
}
/** The new size after the pointer moved `delta` px. edge 'left'/'top': the pane grows towards the pointer going left/up. */
function splitDrag(start, delta, edge) {
  return Number(start) + (edge === 'left' || edge === 'top' ? -Number(delta) : Number(delta));
}
/**
 * Snap a raw size: below o.collapseAt it collapses to o.collapsedSize (default 0),
 * otherwise it is clamped to [o.min, o.max]. -> {size, collapsed}
 */
function splitSnap(px, o) {
  o = o || {};
  if (o.collapseAt != null && Number(px) < Number(o.collapseAt)) return { size: Math.round(Number(o.collapsedSize) || 0), collapsed: true };
  return { size: splitClamp(px, o.min, o.max), collapsed: false };
}
/** Keyboard: the size after one key press, or null for a key the separator does not use. */
function splitStep(size, key, o) {
  o = o || {};
  const step = o.big ? 64 : 16;
  const row = o.edge === 'top' || o.edge === 'bottom';
  const grow = row ? (o.edge === 'top' ? 'ArrowUp' : 'ArrowDown') : (o.edge === 'left' ? 'ArrowLeft' : 'ArrowRight');
  const shrink = row ? (o.edge === 'top' ? 'ArrowDown' : 'ArrowUp') : (o.edge === 'left' ? 'ArrowRight' : 'ArrowLeft');
  if (key === grow) return splitClamp(size + step, o.min, o.max);
  if (key === shrink) return splitClamp(size - step, o.min, o.max);
  if (key === 'Home') return splitClamp(o.min, o.min, o.max);
  if (key === 'End') return splitClamp(o.max, o.min, o.max);
  return null;
}

/* ---------- remembered sizes (state.paneSizes, a UI key) ---------- */
function paneSizes() {
  if (!state.paneSizes || typeof state.paneSizes !== 'object' || Array.isArray(state.paneSizes)) state.paneSizes = {};
  return state.paneSizes;
}
/** The remembered size of pane `id` (clamped when min/max are given), else `def`. */
function paneSize(id, def, min, max) {
  const v = (state && state.paneSizes && typeof state.paneSizes === 'object') ? state.paneSizes[id] : undefined;
  if (typeof v !== 'number' || !isFinite(v)) return def;
  return min != null || max != null ? splitClamp(v, min != null ? min : 0, max != null ? max : 1e6) : v;
}
function paneSizeSet(id, px) {
  const s = paneSizes();
  if (px === null || px === undefined) delete s[id];
  else s[id] = typeof px === 'number' ? Math.round(px) : px;
  saveUI();
}

/* ---------- the handle ---------- */
const _splitVal = (v) => (typeof v === 'function' ? v() : v);
function makeSplitter(o) {
  const row = o.edge === 'top' || o.edge === 'bottom';
  const h = document.createElement('div');
  h.className = `split-h ${row ? 'split-row' : 'split-col'} split-at-${o.edge}${o.cls ? ' ' + o.cls : ''}`;
  h.setAttribute('role', 'separator');
  h.setAttribute('aria-orientation', row ? 'horizontal' : 'vertical');
  h.setAttribute('aria-label', o.label || 'Resize');
  h.setAttribute('data-tip', (o.label || 'Resize') + ' · drag, or double-click to reset');
  h.tabIndex = 0;
  h.dataset.split = o.id;
  const lim = () => ({ min: _splitVal(o.min) || 0, max: _splitVal(o.max) || 1e6, def: _splitVal(o.def) });
  const cur = () => { const L = lim(); return o.get ? o.get() : paneSize(o.id, L.def, L.min, L.max); };
  const aria = (v) => { const L = lim(); h.setAttribute('aria-valuemin', String(Math.round(L.min))); h.setAttribute('aria-valuemax', String(Math.round(L.max))); h.setAttribute('aria-valuenow', String(Math.round(v))); };
  const commit = (r) => { if (o.commit) o.commit(r); else paneSizeSet(o.id, r.size); aria(r.size); };
  let drag = null;
  h.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault(); e.stopPropagation();
    try { h.setPointerCapture(e.pointerId); } catch (err) { /* old browser */ }
    drag = { start: cur(), at: row ? e.clientY : e.clientX, last: null, raf: 0, ev: null, moved: false };
    document.body.classList.add('is-resizing', row ? 'is-resizing-row' : 'is-resizing-col');
    h.classList.add('is-dragging');
    if (typeof closePopovers === 'function') closePopovers();   // a popover would stay where its anchor was
    if (o.onStart) o.onStart();
  });
  const frame = () => {
    if (!drag) return;
    drag.raf = 0;
    const e = drag.ev; if (!e) return;
    const L = lim();
    const px = splitDrag(drag.start, (row ? e.clientY : e.clientX) - drag.at, o.edge);
    const r = splitSnap(px, { min: L.min, max: L.max, collapseAt: _splitVal(o.collapseAt), collapsedSize: _splitVal(o.collapsedSize) });
    if (!drag.last || drag.last.size !== r.size || drag.last.collapsed !== r.collapsed) { o.apply(r.size, r.collapsed, true); aria(r.size); }
    drag.last = r;
  };
  h.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.abs((row ? e.clientY : e.clientX) - drag.at) < 2) return;
    drag.moved = true; drag.ev = e;
    if (!drag.raf) drag.raf = requestAnimationFrame(frame);
  });
  const end = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.raf) { cancelAnimationFrame(d.raf); d.raf = 0; drag = d; frame(); drag = null; }
    document.body.classList.remove('is-resizing', 'is-resizing-row', 'is-resizing-col');
    h.classList.remove('is-dragging');
    if (d.moved && d.last) commit(d.last);
    if (o.onEnd) o.onEnd(d.last);
  };
  h.addEventListener('pointerup', end);
  h.addEventListener('pointercancel', end);
  h.addEventListener('lostpointercapture', end);
  h.addEventListener('dblclick', (e) => { e.preventDefault(); e.stopPropagation(); _splitReset(o, h, lim, aria); });
  h.addEventListener('click', (e) => e.stopPropagation());
  h.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); _splitReset(o, h, lim, aria); return; }
    const L = lim();
    const v = splitStep(cur(), e.key, { edge: o.edge, min: L.min, max: L.max, big: e.shiftKey });
    if (v === null) return;
    e.preventDefault(); e.stopPropagation();
    o.apply(v, false, false);
    commit({ size: v, collapsed: false });
  });
  aria(cur());
  return h;
}
function _splitReset(o, h, lim, aria) {
  if (o.reset) o.reset();
  else { paneSizeSet(o.id, null); o.apply(lim().def, false, false); }
  aria(lim().def);
}

/* ---------- the panes ---------- */
const SPLIT_PANES = {
  sidebar: { def: 248, min: 200, max: 420, collapseAt: 150, rail: 60 },
  detail: { def: 400, min: 320, max: () => Math.max(320, Math.min(820, window.innerWidth - 480)) },
  asst: { def: 420, min: 340, max: () => Math.max(340, Math.min(760, window.innerWidth - 360)) },
  calRail: { def: 296, min: 240, max: 480 },
  calPanel: { def: 360, min: 300, max: 600 },
};
function _splitLim(id) {
  const p = SPLIT_PANES[id];
  return { min: _splitVal(p.min), max: _splitVal(p.max), def: _splitVal(p.def) };
}
function _splitSize(id) { const L = _splitLim(id); return paneSize(id, L.def, L.min, L.max); }
/** Write a pane width as a CSS variable on <html> (every rule that sizes the pane reads it). */
function _splitVar(name, px) { document.documentElement.style.setProperty(name, Math.round(px) + 'px'); }

/** The sidebar: a width, or the icon rail (state.paneSizes.sidebarRail). */
function _splitSidebarApply(px, rail) {
  const app = document.getElementById('app');
  if (!app) return;
  app.classList.toggle('sb-rail', !!rail);
  _splitVar('--sidebar-w', rail ? SPLIT_PANES.sidebar.rail : px);
  _splitVar('--sidebar-w-full', rail ? _splitSize('sidebar') : px);   // the drawer on narrow screens is never a rail
}
function _splitMountSidebar() {
  const sb = document.getElementById('app-sidebar');
  if (!sb || sb.querySelector(':scope > .split-h')) return;
  const P = SPLIT_PANES.sidebar;
  sb.appendChild(makeSplitter({
    id: 'sidebar', edge: 'right', label: 'Resize the sidebar', cls: 'split-sidebar',
    min: P.min, max: P.max, def: P.def, collapseAt: P.collapseAt, collapsedSize: P.rail,
    get: () => (paneSizes().sidebarRail ? P.rail : _splitSize('sidebar')),
    apply: (px, collapsed) => _splitSidebarApply(px, collapsed),
    commit: (r) => {
      const s = paneSizes();
      if (r.collapsed) s.sidebarRail = true; else { delete s.sidebarRail; s.sidebar = r.size; }
      saveUI();
      if (typeof renderShell === 'function') renderShell();
    },
    reset: () => { const s = paneSizes(); delete s.sidebarRail; delete s.sidebar; saveUI(); _splitSidebarApply(P.def, false); },
  }));
}
function _splitMountDetail() {
  const content = document.getElementById('content');
  if (!content || content.querySelector(':scope > .split-detail')) return;
  content.appendChild(makeSplitter({
    id: 'detail', edge: 'left', label: 'Resize the side panel', cls: 'split-detail',
    min: () => _splitLim('detail').min, max: () => _splitLim('detail').max, def: SPLIT_PANES.detail.def,
    apply: (px) => _splitVar('--detail-w', px),
  }));
}
function _splitMountAsst() {
  const a = document.querySelector('body > .asst');
  if (!a || a.querySelector(':scope > .split-h')) return;
  a.appendChild(makeSplitter({
    id: 'asst', edge: 'left', label: 'Resize the assistant', cls: 'split-asst',
    min: () => _splitLim('asst').min, max: () => _splitLim('asst').max, def: SPLIT_PANES.asst.def,
    apply: (px) => _splitVar('--asst-w', px),
  }));
}
/** The calendar (rebuilt on every render): a handle on its agenda rail or event panel. */
function _splitMountCalendar() {
  const wrap = document.querySelector('#main-body .cal-wrap');
  if (!wrap || wrap.querySelector(':scope > .split-h')) return;
  const panel = wrap.classList.contains('with-panel');
  const id = panel ? 'calPanel' : 'calRail';
  wrap.appendChild(makeSplitter({
    id, edge: 'left', label: panel ? 'Resize the event panel' : 'Resize the agenda', cls: 'split-cal',
    min: SPLIT_PANES[id].min, max: SPLIT_PANES[id].max, def: SPLIT_PANES[id].def,
    apply: (px) => _splitVar(panel ? '--cal-panel-w' : '--cal-rail-w', px),
  }));
}
/* ---------- resizable windows ---------- */
const RZ_STORE = 'dash-window-sizes-v1';
const RZ_PHONE = 700;
/**
 * The new size of a window being dragged (pure). s = {w, h} at the start,
 * dir = handle ('e', 'sw'...), dx/dy = pointer movement, o = {center, min, max}.
 * -> {w, h} (h null when the handle does not change the height and none was set).
 */
function rzSize(s, dir, dx, dy, o) {
  o = o || {};
  const c = String(o.center || '');
  const fx = c.includes('x') ? 2 : 1, fy = c.includes('y') ? 2 : 1;
  let w = s.w, h = s.h;
  if (dir.includes('e')) w = s.w + dx * fx;
  if (dir.includes('w')) w = s.w - dx * fx;
  if (dir.includes('s')) h = (s.h || 0) + dy * fy;
  if (dir.includes('n')) h = (s.h || 0) - dy * fy;
  const min = o.min || {}, max = o.max || {};
  w = splitClamp(w, min.w || 0, max.w != null ? max.w : 1e6);
  if (h != null) h = splitClamp(h, min.h || 0, max.h != null ? max.h : 1e6);
  return { w, h: h == null ? null : h };
}
function rzLoad(key) {
  try { const all = JSON.parse(localStorage.getItem(RZ_STORE) || '{}'); const v = all && all[key]; return v && typeof v === 'object' ? v : null; } catch (e) { return null; }
}
function rzSave(key, v) {
  try {
    const all = JSON.parse(localStorage.getItem(RZ_STORE) || '{}') || {};
    if (v === null) delete all[key]; else all[key] = Object.assign({}, all[key] || {}, v);
    localStorage.setItem(RZ_STORE, JSON.stringify(all));
  } catch (e) { /* storage full or off: sizes are not remembered */ }
}
const _RZ_CUR = { n: 'ns', s: 'ns', e: 'ew', w: 'ew', ne: 'nesw', sw: 'nesw', nw: 'nwse', se: 'nwse' };
function makeResizable(el, o) {
  o = o || {};
  const key = o.key || 'window';
  const edges = o.edges || ['e', 'w', 's', 'se', 'sw'];
  const val = (v) => (typeof v === 'function' ? v() : v) || {};
  const phone = () => window.innerWidth < RZ_PHONE;
  const maxOf = () => { const m = val(o.max); return { w: Math.min(m.w || 1e6, window.innerWidth - 32), h: Math.min(m.h || 1e6, window.innerHeight - 32) }; };
  // What the caller set inline (openDialog's width...): back to it when there is no saved size.
  const orig = { w: el.style.width, h: el.style.height, mw: el.style.maxWidth, mh: el.style.maxHeight };
  const set = (sz) => {
    if (o.vars) {
      if (o.vars.w) { if (sz && sz.w != null) el.style.setProperty(o.vars.w, sz.w + 'px'); else el.style.removeProperty(o.vars.w); }
      if (o.vars.h) { if (sz && sz.h != null) el.style.setProperty(o.vars.h, sz.h + 'px'); else el.style.removeProperty(o.vars.h); }
    } else {
      el.style.width = sz && sz.w != null ? sz.w + 'px' : orig.w;
      el.style.height = sz && sz.h != null ? sz.h + 'px' : orig.h;
      el.style.maxWidth = sz && sz.w != null ? 'none' : orig.mw;
      el.style.maxHeight = sz && sz.h != null ? 'none' : orig.mh;
    }
    el.classList.toggle('rz-sized', !!(sz && (sz.w != null || sz.h != null)));
    el.classList.toggle('rz-has-h', !!(sz && sz.h != null));
  };
  /** The remembered size, clamped to the window now (null: the default / CSS size). */
  const saved = () => {
    if (phone()) return null;
    const v = rzLoad(key); if (!v || (v.w == null && v.h == null)) return null;
    const mn = val(o.min), mx = maxOf();
    return { w: v.w != null ? splitClamp(v.w, Math.min(mn.w || 0, mx.w), mx.w) : null, h: v.h != null ? splitClamp(v.h, Math.min(mn.h || 0, mx.h), mx.h) : null };
  };
  /** The default size (o.def, clamped), or null for the CSS size. */
  const defSize = () => {
    const d = val(o.def);
    if (phone() || (d.w == null && d.h == null)) return null;
    const mx = maxOf();
    return { w: d.w != null ? Math.min(d.w, mx.w) : null, h: d.h != null ? Math.min(d.h, mx.h) : null };
  };
  const apply = () => { const s = saved() || defSize(); set(s); if (o.onResize) o.onResize(s, false); return s; };
  const reset = () => { rzSave(key, null); const d = defSize(); set(d); if (o.onResize) o.onResize(d, false); };
  const handles = [];
  for (const dir of edges) {
    const h = document.createElement('div');
    h.className = 'rz-h rz-' + dir;
    h.dataset.dir = dir;
    h.style.cursor = _RZ_CUR[dir] + '-resize';
    h.setAttribute('aria-hidden', 'true');
    h.addEventListener('pointerdown', (e) => start(e, h, dir));
    h.addEventListener('dblclick', (e) => { e.preventDefault(); e.stopPropagation(); reset(); });
    h.addEventListener('click', (e) => e.stopPropagation());
    el.appendChild(h);
    handles.push(h);
  }
  // The keyboard handle: the bottom-right corner if there is one, else the last edge.
  const kh = handles.find(h => h.dataset.dir === 'se') || handles.find(h => h.dataset.dir === 'e' || h.dataset.dir === 'w') || handles[0];
  if (kh) {
    kh.tabIndex = 0; kh.removeAttribute('aria-hidden');
    kh.setAttribute('role', 'separator'); kh.setAttribute('aria-label', 'Resize (arrow keys; Enter resets)');
    kh.classList.add('rz-key');
    kh.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); reset(); return; }
      const step = e.shiftKey ? 64 : 16;
      const d = kh.dataset.dir;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowRight') dx = d.includes('w') ? -step : step;
      else if (e.key === 'ArrowLeft') dx = d.includes('w') ? step : -step;
      else if (e.key === 'ArrowDown' && /[sn]/.test(d)) dy = d.includes('n') ? -step : step;
      else if (e.key === 'ArrowUp' && /[sn]/.test(d)) dy = d.includes('n') ? step : -step;
      else return;
      e.preventDefault(); e.stopPropagation();
      if (phone()) return;
      const r = el.getBoundingClientRect();
      const fx = String(o.center || '').includes('x') ? 2 : 1, fy = String(o.center || '').includes('y') ? 2 : 1;
      const sz = rzSize({ w: r.width, h: /[sn]/.test(d) || el.classList.contains('rz-has-h') ? r.height : null }, d, dx / fx, dy / fy, { center: o.center, min: val(o.min), max: maxOf() });
      set(sz); rzSave(key, sz); if (o.onResize) o.onResize(sz, false);
    });
  }
  let drag = null;
  function start(e, h, dir) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (phone() || el.classList.contains('is-max')) return;
    e.preventDefault(); e.stopPropagation();
    try { h.setPointerCapture(e.pointerId); } catch (err) { /* old browser */ }
    const r = el.getBoundingClientRect();
    drag = { h, dir, x: e.clientX, y: e.clientY, s: { w: r.width, h: /[sn]/.test(dir) || el.classList.contains('rz-has-h') ? r.height : null }, raf: 0, ev: null, last: null };
    document.body.classList.add('is-resizing');
    document.body.style.setProperty('--rz-cursor', _RZ_CUR[dir] + '-resize');
    if (typeof closePopovers === 'function') closePopovers();
    const move = (ev) => { if (!drag) return; drag.ev = ev; if (!drag.raf) drag.raf = requestAnimationFrame(frame); };
    const end = () => {
      h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', end); h.removeEventListener('pointercancel', end); h.removeEventListener('lostpointercapture', end);
      if (!drag) return;
      if (drag.raf) { cancelAnimationFrame(drag.raf); frame(); }
      const last = drag.last; drag = null;
      document.body.classList.remove('is-resizing');
      document.body.style.removeProperty('--rz-cursor');
      if (last) { rzSave(key, last); if (o.onResize) o.onResize(last, false); }
    };
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end); h.addEventListener('lostpointercapture', end);
  }
  function frame() {
    if (!drag || !drag.ev) return;
    drag.raf = 0;
    const sz = rzSize(drag.s, drag.dir, drag.ev.clientX - drag.x, drag.ev.clientY - drag.y, { center: o.center, min: val(o.min), max: maxOf() });
    if (!drag.last || drag.last.w !== sz.w || drag.last.h !== sz.h) { set(sz); if (o.onResize) o.onResize(sz, true); }
    drag.last = sz;
  }
  const onWin = () => { if (!el.isConnected) { window.removeEventListener('resize', onWin); return; } if (!drag) apply(); };
  window.addEventListener('resize', onWin);
  apply();
  el.classList.add('rz-on');
  return { reset, apply, size: () => saved(), destroy: () => { window.removeEventListener('resize', onWin); handles.forEach(h => h.remove()); el.classList.remove('rz-on'); } };
}

/** render() calls this: remembered sizes -> CSS variables, handles on the panes that exist. */
function splitSync() {
  try {
    const s = (state && state.paneSizes) || {};
    _splitSidebarApply(_splitSize('sidebar'), !!s.sidebarRail);
    _splitVar('--detail-w', _splitSize('detail'));
    _splitVar('--asst-w', _splitSize('asst'));
    _splitVar('--cal-rail-w', _splitSize('calRail'));
    _splitVar('--cal-panel-w', _splitSize('calPanel'));
    _splitMountSidebar(); _splitMountDetail(); _splitMountAsst(); _splitMountCalendar();
  } catch (e) { console.error('[splitter]', e); }
}
// A window that got narrower: keep the right-hand panes inside it.
window.addEventListener('resize', () => {
  if (typeof state === 'undefined' || !state || !state.paneSizes) return;
  clearTimeout(splitSync._t);
  splitSync._t = setTimeout(splitSync, 120);
});
