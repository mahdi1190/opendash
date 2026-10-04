/* ============================================================
   HOME EDIT MODE ("Customise"). Owner: Home foundation.
   Like editing phone home-screen widgets: the widgets go quiet (inert) and
   sway very slightly; each gets a minus (hide) at its top-left, a grip at
   its top-centre and its sizes (S M L Full, settings) at its top-right; you
   drag them anywhere in the grid, add hidden ones back from the gallery,
   Reset to the defaults, and Done (or Esc) to finish. The toolbar floats at
   the foot of the view, so the board never shifts. Entry points: the
   Customise pill beside the breadcrumb, the "Customise Home" pill at the
   foot of the board. Every change is one undoable data save
   (state.home.layout) and glides into place.

   Keyboard, with a widget focused (Tab / arrows walk between them):
     Alt+Up/Left, Alt+Down/Right   move it earlier / later
     + / -, or 1-4                 bigger / smaller, or Small/Medium/Large/Full
     Delete or Backspace           hide it (back from Add widget)
     Esc                           done
   Changes are spoken through a polite live region (homeAnnounce).
   Public: homeEditStart({gallery}), homeEditDone(), homeAnnounce(text),
   homeWidgetMove(id, delta), homeWidgetResize(id, size), homeWidgetStep(id, dir),
   homeWidgetHide(id), homeWidgetShow(id).
   ============================================================ */
let _homeEditFocusId = null;      // the widget to focus again after the re-render
let _homeEditFresh = false;       // edit mode has just started (the bar slides in)

function homeAnnounce(msg) {
  let r = document.getElementById('home-live');
  if (!r) {
    r = document.createElement('div'); r.id = 'home-live'; r.className = 'sr-only';
    r.setAttribute('role', 'status'); r.setAttribute('aria-live', 'polite');
    document.body.appendChild(r);
  }
  r.textContent = '';
  setTimeout(() => { r.textContent = String(msg || ''); }, 40);
}

/* ---------- the Customise pill (top bar, beside the "Home" breadcrumb, HOME_SPEC.md 6) ----------
   It lives next to #crumb while Home is open (the shell re-renders only the crumb's
   own content, so a sibling survives) and goes when Home is left. While customising
   it is the current thing: pressed, and clicking it again does nothing. */
function _homeHeadActions() {
  const old = document.querySelector('#view-header > .home-head-actions');
  if (old) old.remove();                                    // (older builds put it in the page header)
  const crumb = document.getElementById('crumb');
  if (!crumb || !crumb.parentElement) return;
  let b = document.getElementById('tb-home-customise');
  if (!b) {
    b = document.createElement('button'); b.type = 'button'; b.id = 'tb-home-customise'; b.className = 'tb-home-cust home-customise';
    b.innerHTML = icon('layout-grid') + '<span>Customise</span>';
    b.setAttribute('data-tip', 'Move, resize, hide and add Home widgets');
    b.setAttribute('aria-label', 'Customise Home');
    b.onclick = () => { if (!_homeEditing) homeEditStart(); };   // re-selecting does nothing
    crumb.insertAdjacentElement('afterend', b);
  }
  b.setAttribute('aria-pressed', _homeEditing ? 'true' : 'false');
}
function _homeHeadActionsRemove() {
  const el = document.getElementById('tb-home-customise');
  if (el) el.remove();
}
/** The quiet foot of the board: "Customise Home" (like the iOS Today view). */
function _homeFoot() {
  const f = document.createElement('div'); f.className = 'home-foot-bar';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm home-foot-cust';
  b.innerHTML = icon('layout-grid') + '<span>Customise Home</span>';
  b.onclick = () => homeEditStart();
  f.appendChild(b);
  return f;
}

/* ---------- start / done ---------- */
// The command palette entry (16-command-palette.js loads after the Home files: register once everything has run).
if (typeof setTimeout === 'function') setTimeout(() => {
  if (typeof registerCommand !== 'function') return;
  registerCommand({ id: 'home-customise', label: 'Customise Home', icon: 'layout-grid', keywords: 'home widgets edit arrange move resize hide add layout board', run: () => homeEditStart() });
}, 0);

/** o: {gallery: open Add widget too, focus: the widget id to focus (a long-press on its header)} */
function homeEditStart(o) {
  o = o || {};
  if (state.view !== 'home') { setView('home'); }
  if (!_homeEditing) {
    _homeEditing = true; _homeEditFresh = true;
    if (o.focus) _homeEditFocusId = o.focus;                // _homeEditAfterMount focuses it
    _homeRememberNow();
    render();
    homeAnnounce('Customising Home. Drag a widget to move it, or focus one and press Alt with the arrow keys to move it, plus or minus to resize it, Delete to hide it. Press Escape when you are done.');
    const first = document.querySelector('#main-body .hg-w[data-wid]:not([hidden])');
    if (first && !o.gallery && !o.focus) try { first.focus({ preventScroll: true }); } catch (e) { /* gone */ }
  }
  if (o.gallery) setTimeout(() => _homeOpenGallery(), 0);
}
/**
 * The iOS gesture: holding a widget's header for 450 ms (mouse or touch, without
 * moving) starts Customise with that widget focused. Bound on each mount's grid,
 * so it goes with it. Buttons and links in the header keep their own clicks.
 */
function _homeLongPress(grid) {
  grid.addEventListener('pointerdown', (e) => {
    if (_homeEditing || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const head = e.target.closest('.hg-body .card-h, .hg-body .hf-h');
    if (!head || e.target.closest('button, a, input, select, textarea, [role="button"], [contenteditable="true"]')) return;
    const frame = head.closest('.hg-w[data-wid]');
    if (!frame) return;
    const wid = frame.dataset.wid;                          // (a save or live sync may rebuild the frame meanwhile)
    const x0 = e.clientX, y0 = e.clientY;
    let timer = 0;
    const stop = () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', stop, true);
      window.removeEventListener('pointercancel', stop, true);
    };
    const move = (ev) => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) stop(); };
    timer = setTimeout(() => {
      stop();
      if (_homeEditing || typeof state === 'undefined' || state.view !== 'home') return;
      // The click that ends the press must not land on whatever is under it once the board is customising.
      const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, true), 600);
      homeEditStart({ focus: wid });
    }, 450);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', stop, true);
    window.addEventListener('pointercancel', stop, true);
  });
}
function homeEditDone() {
  if (!_homeEditing) return;
  _homeEditing = false;
  _homeRememberNow();
  if (typeof closePopovers === 'function') closePopovers();
  render();
  homeAnnounce('Done customising Home');
  const b = document.getElementById('tb-home-customise');
  if (b) try { b.focus({ preventScroll: true }); } catch (e) { /* gone */ }
}
// Esc finishes (unless a menu or dialog is open, or a drag is being cancelled).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !_homeEditing || typeof state === 'undefined' || state.view !== 'home') return;
  if (document.body.classList.contains('is-sorting')) return;
  if (document.querySelector('.pop:not([hidden]), .modal, .scrim')) return;
  e.preventDefault();
  homeEditDone();
});

/* ---------- the bar at the top while editing ---------- */
/* The toolbar floats at the foot of the view (sticky, glass), so entering Customise
   never shifts the board (HOME_SPEC.md 6). On the first mount of an edit session it
   rises in and the widgets' controls pop in once (.is-edit-enter); re-renders while
   customising (a move, a resize) do not replay that. */
function _homeEditBar() {
  const bar = document.createElement('div'); bar.className = 'home-editbar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Customise Home');
  const hiddenN = homeLayout().widgets.filter(w => w.hidden && homeWidgetAvailable(homeWidgetDef(w.id))).length;
  bar.innerHTML = `<div class="heb-t">${icon('layout-grid')}<div><b>Customising Home</b><span>Drag to move · pick a size · <kbd class="kbd">−</kbd> hides · <kbd class="kbd">Alt</kbd>+arrows, <kbd class="kbd">1</kbd>–<kbd class="kbd">4</kbd></span></div></div><span class="spacer"></span>`;
  const mk = (cls, ic, label, run, extra) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + cls;
    b.innerHTML = icon(ic) + `<span>${esc(label)}</span>` + (extra || '');
    b.setAttribute('aria-label', label);
    b.onclick = (e) => run(e.currentTarget);
    bar.appendChild(b); return b;
  };
  const add = mk('btn-secondary heb-add', 'plus', 'Add widget', (el) => _homeOpenGallery(el), hiddenN ? `<span class="badge badge-accent num">${esc(hiddenN)}</span>` : '');
  add.dataset.act = 'add'; add.setAttribute('aria-haspopup', 'dialog');
  mk('btn-ghost heb-reset', 'rotate-ccw', 'Reset', () => homeResetLayout()).disabled = !homeState().layout;
  mk('btn-primary heb-done', 'check', 'Done', () => homeEditDone()).setAttribute('data-kbd', 'Esc');
  if (_homeEditFresh) {
    requestAnimationFrame(() => {
      const home = bar.closest('.home');
      if (!home) return;
      home.classList.add('is-edit-enter');
      setTimeout(() => home.classList.remove('is-edit-enter'), 700);
    });
  }
  _homeEditFresh = false;
  return bar;
}

/* ---------- each widget's controls: hide (−) top-left, grip top-centre, sizes top-right ---------- */
function _homeEditChrome(frame, def, w) {
  for (const o of frame.querySelectorAll(':scope > .hg-chrome, :scope > .hg-x, :scope > .hg-grip')) o.remove();
  if (!_homeEditing) { frame.removeAttribute('tabindex'); frame.onkeydown = null; frame.style.removeProperty('--wq'); return; }
  frame.tabIndex = 0;
  frame.setAttribute('aria-roledescription', 'widget');
  frame.setAttribute('aria-label', `${def.title}, ${HOME_SIZE_LABEL[w.size] || w.size}`);
  // The wiggle's phase, so neighbours never sway in step (13-home-edit.css).
  const pos = frame.parentElement ? [...frame.parentElement.children].indexOf(frame) : 0;
  frame.style.setProperty('--wq', String(Math.max(0, pos) % 7));
  const x = document.createElement('button'); x.type = 'button'; x.className = 'hg-x'; x.dataset.act = 'hide';
  x.innerHTML = icon('minus'); x.setAttribute('aria-label', `Hide ${def.title}`); x.setAttribute('data-tip', 'Hide');
  x.onclick = (e) => { e.stopPropagation(); homeWidgetHide(def.id); };
  frame.appendChild(x);
  frame.insertAdjacentHTML('beforeend', `<span class="hg-grip" aria-hidden="true">${icon('grip-vertical')}</span>`);
  const c = document.createElement('div'); c.className = 'hg-chrome';
  if (def.sizes.length > 1) {
    const seg = document.createElement('span'); seg.className = 'seg hg-sizes'; seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', `${def.title} size`);
    for (const s of def.sizes) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.size = s;
      b.textContent = s === 'full' ? 'Full' : s.toUpperCase();
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', s === w.size ? 'true' : 'false');
      b.setAttribute('aria-label', HOME_SIZE_LABEL[s]); b.setAttribute('data-tip', `${_HG_SIZE_LONG[s]} (${HOME_SIZES.indexOf(s) + 1})`);
      if (s === w.size) b.classList.add('on');
      // Hovering a size shows the footprint it would take (a dashed ghost on the board).
      b.onmouseenter = () => { if (s !== w.size) _homeSizeGhost(frame, s); };
      b.onmouseleave = () => _homeSizeGhost(frame, null);
      seg.appendChild(b);
    }
    c.appendChild(seg);
  }
  if (typeof def.settings === 'function') {
    const g = document.createElement('button'); g.type = 'button'; g.className = 'btn-icon btn-sm'; g.dataset.act = 'settings';
    g.innerHTML = icon('sliders-horizontal'); g.setAttribute('aria-label', `${def.title} settings`); g.setAttribute('data-tip', 'Settings');
    c.appendChild(g);
  }
  c.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.size) { if (b.dataset.size !== w.size) homeWidgetResize(def.id, b.dataset.size); }   // the current size: nothing
    else if (b.dataset.act === 'settings') { const rec = _homeW.get(def.id); def.settings(b, rec ? _homeCtx(rec, false) : { id: def.id, def }); }
  };
  if (c.firstChild) frame.appendChild(c);
  frame.onkeydown = (e) => _homeEditKey(e, def.id, frame);
}
/** The dashed outline of the footprint `size` would take, from the widget's top-left (null = remove). */
function _homeSizeGhost(frame, size) {
  const old = frame.querySelector(':scope > .hg-size-ghost');
  if (old) { old.remove(); frame.style.zIndex = ''; }
  const grid = frame.parentElement;
  if (!size || !grid) return;
  frame.style.zIndex = '4';                                  // over its neighbours (each sways in its own layer)
  const cs = getComputedStyle(grid);
  const cols = 12, gap = parseFloat(cs.columnGap) || 16;
  const colW = (grid.clientWidth - (cols - 1) * gap) / cols;
  // The columns that size takes on this screen (narrow screens map sizes to halves and wholes).
  const was = frame.dataset.size;
  frame.dataset.size = size;
  const span = Math.min(cols, parseInt(getComputedStyle(frame).getPropertyValue('--hg-span'), 10) || HOME_SIZE_COLS[size]);
  frame.dataset.size = was;
  const g = document.createElement('div'); g.className = 'hg-size-ghost'; g.setAttribute('aria-hidden', 'true');
  g.style.width = Math.round(span * colW + (span - 1) * gap) + 'px';
  g.innerHTML = `<span>${esc(_HG_SIZE_LONG[size])}</span>`;
  frame.appendChild(g);
}
function _homeEditKey(e, id, frame) {
  if (e.target !== frame) return;
  const k = e.key;
  const frames = () => [...document.querySelectorAll('#main-body .home-grid > .hg-w[data-wid]:not([hidden])')];
  if (e.altKey && (k === 'ArrowUp' || k === 'ArrowLeft')) { e.preventDefault(); homeWidgetMove(id, -1); }
  else if (e.altKey && (k === 'ArrowDown' || k === 'ArrowRight')) { e.preventDefault(); homeWidgetMove(id, 1); }
  else if (!e.altKey && !e.ctrlKey && !e.metaKey && /^Arrow(Up|Down|Left|Right)$/.test(k)) {
    e.preventDefault();
    const all = frames(), i = all.indexOf(frame);
    const n = all[Math.max(0, Math.min(all.length - 1, i + (k === 'ArrowDown' || k === 'ArrowRight' ? 1 : -1)))];
    if (n) n.focus();
  }
  else if (k === '+' || k === '=') { e.preventDefault(); homeWidgetStep(id, 1); }
  else if (k === '-' || k === '_') { e.preventDefault(); homeWidgetStep(id, -1); }
  else if (/^[1-4]$/.test(k) && !e.altKey && !e.ctrlKey && !e.metaKey) {
    // 1-4 = Small, Medium, Large, Full (only the sizes this widget has)
    e.preventDefault();
    const size = HOME_SIZES[Number(k) - 1], def = homeWidgetDef(id);
    if (!def || !def.sizes.includes(size)) { if (def) homeAnnounce(`${def.title} has no ${HOME_SIZE_LABEL[size]} size`); return; }
    homeWidgetResize(id, size);
  }
  else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); homeWidgetHide(id); }
  else if ((k === 'a' || k === 'A') && !e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); _homeOpenGallery(); }
}
/**
 * While customising, the columns a row leaves empty show as a dashed "+" slot that opens
 * Add widget for widgets that fit (HOME_SPEC.md 2). A slot fills exactly the hole the row
 * already has, so nothing moves. Wide screens only (on narrow ones every row is whole).
 */
/**
 * Where the rows of a 12-column board leave columns empty (pure). spans: the columns
 * each widget takes, in order. -> [{at, cols}]: `cols` free columns before widget `at`
 * (at = spans.length: after the last one). Same rule as the CSS grid's row flow.
 */
function homeShelfGaps(spans) {
  const out = [];
  let used = 0;
  spans.forEach((s, i) => {
    const span = Math.max(1, Math.min(12, Number(s) || 12));
    if (used + span > 12) { out.push({ at: i, cols: 12 - used }); used = 0; }
    used = (used + span) % 12;
  });
  if (used) out.push({ at: spans.length, cols: 12 - used });
  return out;
}
function _homeGapSlots(grid) {
  for (const x of grid.querySelectorAll(':scope > .hg-slot')) x.remove();
  const frames = [...grid.querySelectorAll(':scope > .hg-w[data-wid]')].filter(f => !f.hidden);
  const spans = frames.map(f => Math.min(12, parseInt(getComputedStyle(f).getPropertyValue('--hg-span'), 10) || 12));
  const add = (before, cols) => {
    if (cols < HOME_SIZE_COLS.s) {                         // no widget fits: just show the space, quietly
      const d = document.createElement('div'); d.className = 'hg-slot is-narrow'; d.setAttribute('aria-hidden', 'true');
      d.style.gridColumn = `span ${cols}`;
      grid.insertBefore(d, before);
      return;
    }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hg-slot';
    b.style.gridColumn = `span ${cols}`;
    b.innerHTML = icon('plus') + '<span>Add a widget here</span>';
    b.setAttribute('aria-label', `Add a widget in the free space (${cols} of 12 columns)`);
    b.onclick = (e) => { e.stopPropagation(); _homeOpenGallery(null, null, cols); };
    grid.insertBefore(b, before);
  };
  for (const g of homeShelfGaps(spans)) add(frames[g.at] || null, g.cols);
}
/** After a re-render in edit mode: drag to reorder, and focus back on the widget being moved. */
function _homeEditAfterMount(grid) {
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  // A Home-level sortable (not a widget's): torn down with the next mount.
  const s = makeSortable(grid, {
    items: '.hg-w[data-wid]', axis: 'grid', idOf: (el) => el.dataset.wid, handle: coarse ? '.hg-grip' : undefined,
    onReorder: (ids, moved) => homeWidgetOrder(ids, moved),
    onStart: () => { for (const x of grid.querySelectorAll(':scope > .hg-slot')) x.remove(); },   // a drag reflows the rows
  });
  const rec = { frame: grid, body: grid, def: { id: '_edit' }, size: '', sortables: [s] };
  _homeW.set('_edit', rec);
  _homeGapSlots(grid);
  if (_homeEditFocusId) {
    const f = grid.querySelector(`:scope > .hg-w[data-wid="${CSS.escape(_homeEditFocusId)}"]`);
    _homeEditFocusId = null;
    if (f) {
      try { f.focus({ preventScroll: true }); } catch (e) { /* gone */ }
      // Scroll only when it went out of sight (scroll-margin keeps it clear of the sticky bar).
      const m = document.getElementById('main'), r = f.getBoundingClientRect(), mr = m ? m.getBoundingClientRect() : { top: 0, bottom: innerHeight };
      if (r.bottom < mr.top + 140 || r.top > mr.bottom - 60) try { f.scrollIntoView({ block: 'start', behavior: _hgReduced() ? 'auto' : 'smooth' }); } catch (e) { /* old browser */ }
    }
  }
}

/* ---------- the changes ---------- */
function _homeVisibleIds() {
  return homeLayout().widgets.filter(w => !w.hidden && homeWidgetAvailable(homeWidgetDef(w.id))).map(w => w.id);
}
/** New order of the visible widgets; hidden (and unavailable) ones keep their slots. */
function homeWidgetOrder(ids, movedId) {
  const next = homeLayoutReorder(homeLayout().widgets, ids, w => !w.hidden && homeWidgetAvailable(homeWidgetDef(w.id)));
  const def = movedId ? homeWidgetDef(movedId) : null;
  const pos = movedId ? ids.indexOf(movedId) + 1 : 0;
  _homeEditFocusId = movedId || null;
  homeSaveLayout(next, { say: def ? `${def.title} moved to position ${pos} of ${ids.length}` : 'Widgets reordered' });
}
function homeWidgetMove(id, delta) {
  const ids = _homeVisibleIds();
  const i = ids.indexOf(id), j = i + delta;
  if (i < 0) return;
  const def = homeWidgetDef(id);
  if (j < 0 || j >= ids.length) { homeAnnounce(`${def.title} is already ${j < 0 ? 'first' : 'last'}`); return; }
  [ids[i], ids[j]] = [ids[j], ids[i]];
  homeWidgetOrder(ids, id);
}
function homeWidgetResize(id, size) {
  const def = homeWidgetDef(id);
  if (!def || !def.sizes.includes(size)) return;
  _homeEditFocusId = id;
  const next = homeLayout().widgets.map(w => (w.id === id ? Object.assign({}, w, { size }) : w));
  if (!homeSaveLayout(next, { say: `${def.title}: ${HOME_SIZE_LABEL[size]}` })) homeAnnounce(`${def.title} is already ${HOME_SIZE_LABEL[size]}`);
}
function homeWidgetStep(id, dir) {
  const def = homeWidgetDef(id);
  const cur = (homeLayout().widgets.find(w => w.id === id) || {}).size;
  const i = def ? def.sizes.indexOf(cur) : -1;
  const n = def && def.sizes[i + dir];
  if (!n) { if (def) homeAnnounce(`${def.title} is already as ${dir > 0 ? 'big' : 'small'} as it goes`); return; }
  homeWidgetResize(id, n);
}
function homeWidgetHide(id) {
  const def = homeWidgetDef(id);
  if (!def) return;
  const vis = _homeVisibleIds(), i = vis.indexOf(id);
  _homeEditFocusId = vis[i + 1] || vis[i - 1] || null;
  _homeEntry.painted.delete(id);
  const next = homeLayout().widgets.map(w => (w.id === id ? Object.assign({}, w, { hidden: true }) : w));
  const save = () => homeSaveLayout(next, { toast: `${def.title} hidden. Add it back from Customise`, say: `${def.title} hidden` });
  // It shrinks away first; the others then glide into the space.
  const f = document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(id)}"]`);
  const a = f && window.Motion ? Motion.animate(f, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.94)' }], { duration: 180, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }) : null;
  if (a) a.finished.then(save, save); else save();
}
/** Show a hidden widget again (optionally at a size): it goes at the end of the board. */
function homeWidgetShow(id, size) {
  const def = homeWidgetDef(id);
  if (!def) return;
  _homeAdded = id; _homeEditFocusId = id;
  _homeEntry.painted.delete(id);
  // Added widgets go at the end of the board (where homeGridArrive scrolls to them).
  const all = homeLayout().widgets, me = all.find(w => w.id === id);
  if (!me) return;
  const next = all.filter(w => w.id !== id).concat([Object.assign({}, me, { hidden: false }, size && def.sizes.includes(size) ? { size } : {})]);
  homeSaveLayout(next, { say: `${def.title} added` });
}

/* ---------- Add widget gallery (HOME_SPEC.md 6, hm-07) ----------
   A dialog: on the left every widget ("Not on Home" first, with Add; then "On Home");
   on the right the chosen one's name, what it does, its sizes and a LIVE preview (the
   widget's own render() into a box of that size, inert, scaled to fit). Add to Home
   puts it at the end of the board in the chosen size; for one already on Home the
   button applies the chosen size. A preview may reset module state a widget keeps for
   its board copy, so closing re-renders Home (positions are remembered; nothing moves). */
const _HG_SIZE_W = Object.freeze({ s: 365, m: 556, l: 746, full: 1128 });
const _HG_SIZE_LONG = Object.freeze({ s: 'Small · a third', m: 'Medium · half', l: 'Large · two thirds', full: 'Full width' });
function _homeOpenGallery(anchor, pick, fitCols) {
  const cat = homeWidgetCatalog().filter(homeWidgetAvailable);
  const placed = () => new Map(homeLayout().widgets.map(w => [w.id, w]));
  const isOn = (id) => { const w = placed().get(id); return !!(w && !w.hidden); };
  // From a free slot: the widgets with a size that fits it come first, at that size.
  const fitSize = (def) => (fitCols ? def.sizes.filter(s => HOME_SIZE_COLS[s] <= fitCols).pop() || null : null);
  const byFit = (a, b) => (fitCols ? (fitSize(a) ? 0 : 1) - (fitSize(b) ? 0 : 1) : 0);
  const notOn = cat.filter(d => !isOn(d.id)).sort(byFit), on = cat.filter(d => isOn(d.id));
  let sel = (pick && cat.find(d => d.id === pick)) || notOn[0] || on[0];
  if (!sel) return;
  let size = fitSize(sel);             // the size picked in the segment (null = current or default)
  let changed = false;
  openDialog({
    title: 'Add a widget', width: 940, resizable: false,
    onClose: () => { if (!changed && typeof state !== 'undefined' && state.view === 'home') render(); },
    body: (el, close) => {
      el.classList.add('hgal-b');
      el.closest('.modal').classList.add('hgal-modal');
      const list = document.createElement('div'); list.className = 'hgal-list'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Widgets');
      const pane = document.createElement('div'); pane.className = 'hgal-pane';
      el.append(list, pane);
      const group = (label, defs, here) => {
        if (!defs.length) return;
        const h = document.createElement('div'); h.className = 'hgal-gh'; h.textContent = label; list.appendChild(h);
        for (const def of defs) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'hgal-item'; b.dataset.id = def.id;
          b.setAttribute('role', 'option');
          b.innerHTML = `<span class="hgal-ic">${icon(def.icon)}</span><span class="hgal-t">${esc(def.title)}</span>`
            + (here ? `<span class="hgal-on">${icon('check')}On Home</span>` : '<span class="hgal-tag">Add</span>');
          b.onclick = () => { if (sel.id !== def.id) { sel = def; size = isOn(def.id) ? null : fitSize(def); paint(); } };   // re-selecting: nothing
          list.appendChild(b);
        }
      };
      group('Not on Home', notOn, false);
      group('On Home', on, true);
      list.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const items = [...list.querySelectorAll('.hgal-item')];
        const i = items.findIndex(x => x.dataset.id === sel.id);
        const n = items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
        if (!n) return;
        e.preventDefault(); n.focus(); n.click();
      });
      const paint = () => {
        const def = sel, here = isOn(def.id);
        const cur = (placed().get(def.id) || {}).size || def.defaultSize;
        const sz = size || cur;
        for (const b of list.querySelectorAll('.hgal-item')) {
          const on = b.dataset.id === def.id;
          b.setAttribute('aria-selected', on ? 'true' : 'false');
          b.classList.toggle('is-current', on);
        }
        pane.innerHTML = `<h3>${esc(def.title)}</h3>${def.description ? `<p class="hgal-d">${esc(def.description)}</p>` : ''}`;
        if (def.sizes.length > 1) {
          const row = document.createElement('div'); row.className = 'hgal-sizes';
          row.innerHTML = '<span class="hgal-lbl">Size</span>';
          const seg = document.createElement('span'); seg.className = 'seg'; seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', `${def.title} size`);
          for (const s of def.sizes) {
            const b = document.createElement('button'); b.type = 'button'; b.textContent = _HG_SIZE_LONG[s];
            b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', s === sz ? 'true' : 'false');
            if (s === sz) b.classList.add('on');
            b.onclick = () => { if (s !== sz) { size = s; paint(); } };
            seg.appendChild(b);
          }
          row.appendChild(seg); pane.appendChild(row);
        }
        const stage = document.createElement('div'); stage.className = 'hgal-stage';
        pane.appendChild(stage);
        _homePreview(stage, def, sz);
        const foot = document.createElement('div'); foot.className = 'hgal-foot';
        const go = document.createElement('button'); go.type = 'button'; go.className = 'btn btn-primary';
        if (!here) {
          go.innerHTML = icon('plus') + '<span>Add to Home</span>';
          go.onclick = () => { changed = true; close(); homeWidgetShow(def.id, sz); };
        } else if (sz !== cur) {
          go.innerHTML = icon('check') + `<span>Make it ${esc(_HG_SIZE_LONG[sz].split(' · ')[0])}</span>`;
          go.onclick = () => { changed = true; close(); homeWidgetResize(def.id, sz); };
        } else {
          go.className = 'btn btn-secondary'; go.disabled = true;
          go.innerHTML = icon('check') + '<span>On Home</span>';
        }
        const note = document.createElement('p'); note.className = 'hgal-note';
        note.textContent = here ? 'Already on your Home. Pick another size to change it, or hide it with its − button.'
          : 'Lands at the end of the board; drag it where you like afterwards.';
        foot.append(go, note);
        pane.appendChild(foot);
      };
      paint();
      setTimeout(() => { const b = list.querySelector('.hgal-item.is-current'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { /* gone */ } }, 0);
    },
  });
}
/** A live, inert preview of a widget at a size, scaled to the stage's width. */
function _homePreview(stage, def, size) {
  const w = _HG_SIZE_W[size] || 365;
  const box = document.createElement('div'); box.className = 'hgal-scale'; box.style.width = w + 'px';
  const frame = document.createElement('section'); frame.className = 'hg-w hgal-w'; frame.dataset.size = size; frame.dataset.wid = def.id;
  const body = document.createElement('div'); body.className = 'hg-body'; body.inert = true;
  frame.appendChild(body); box.appendChild(frame); stage.appendChild(box);
  const rec = { frame, body, def };
  const ctx = {
    id: def.id, def, size, editing: false, firstPaint: false, preview: true, expanded: new Set(),
    isNew: () => false, enterNew: () => 0, toggleExpanded() {}, rerender() {}, flip(fn) { fn(); },
    sortable: () => ({ destroy() {}, get dragging() { return false; } }),
    off: (o) => _homeOffState(rec, o || {}), openTask() {},
  };
  let ok = false;
  try { ok = def.render(body, ctx) !== false && !!body.firstElementChild; } catch (e) { console.error(`[home] preview of "${def.id}" failed`, e); }
  if (!ok) body.innerHTML = `<div class="hg-placeholder">${icon(def.icon)}<span><b>${esc(def.title)}</b> ${esc(def.emptyHint || 'Nothing to show right now')}</span></div>`;
  const fit = () => {
    const avail = stage.clientWidth - 24;                  // inside the stage's 12 px padding
    const s = Math.min(1, avail > 0 ? avail / w : 1);
    box.style.transform = s < 1 ? `scale(${s})` : '';
    box.style.marginRight = s < 1 ? `${-w * (1 - s)}px` : '';   // the scaled box takes its scaled width (stays centred)
    stage.style.height = Math.min(400, Math.ceil(frame.offsetHeight * s) + 24) + 'px';
  };
  requestAnimationFrame(fit);
}
