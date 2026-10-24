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

   Moving and resizing with the pointer (drag a widget; drag its right edge,
   bottom edge or corner) is the grid editor, 12-home-gridedit.js.
   Keyboard, with a widget focused (Tab walks between them; 12-home-board.js boardEditKey):
     Left / Right                  move it one place earlier / later
     Up / Down                     move it to the shelf above / below
     Shift+Left / Shift+Right      one column narrower / wider (any width 1-12)
     Shift+Up / Shift+Down         one row shorter / taller; 0 = fits its content
     + / -, or 1-4                 the next preset bigger / smaller, or Small/Medium/Large/Full
     Delete or Backspace           hide it (back from Add widget)
     Esc                           done
   Changes are spoken through a polite live region (homeAnnounce).
   Public: homeEditStart({gallery}), homeEditDone(), homeAnnounce(text),
   homeWidgetMove(id, delta), homeWidgetResize(id, size), homeWidgetStep(id, dir),
   homeWidgetHide(id) (a copy 'id~n' is removed instead), homeWidgetShow(id);
   copies: homeWidgetAddCopy / homeWidgetRemoveCopy (12-home-platform.js).
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
  if (typeof homeRefreshButton === 'function') homeRefreshButton(crumb);
  let b = document.getElementById('tb-home-customise');
  if (!b) {
    b = document.createElement('button'); b.type = 'button'; b.id = 'tb-home-customise'; b.className = 'tb-home-cust home-customise';
    b.innerHTML = icon('layout-grid', 'i-sm') + '<span>Customise</span>';
    b.setAttribute('data-tip', 'Move, resize, hide and add Home widgets');
    b.setAttribute('aria-label', 'Customise Home');
    b.onclick = () => { if (!_homeEditing) homeEditStart(); };   // re-selecting does nothing
    crumb.insertAdjacentElement('afterend', b);
  }
  b.setAttribute('aria-pressed', _homeEditing ? 'true' : 'false');
}
function _homeHeadActionsRemove() {
  const refresh = document.getElementById('tb-home-refresh');
  if (refresh) refresh.remove();
  const el = document.getElementById('tb-home-customise');
  if (el) el.remove();
}
/** The quiet foot of the board: "Customise Home" (like the iOS Today view). */
function _homeFoot() {
  const f = document.createElement('div'); f.className = 'home-foot-bar';
  f.appendChild(uiButton({ label: 'Customise Home', icon: 'layout-grid', size: 'sm', cls: 'home-foot-cust', run: () => homeEditStart() }));
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
    _homeEditUndo = [];
    if (o.focus) _homeEditFocusId = o.focus;                // _homeEditAfterMount focuses it
    _homeRememberNow();
    render();
    homeAnnounce('Customising Home. Drag a widget to move it and drag its edges to resize it. With a widget focused, the arrow keys move it, Shift with the arrow keys resizes it, Delete hides it. Press Escape when you are done.');
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
    const head = e.target.closest('.hg-body .card-h');
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
  _homeEditUndo = [];
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
  const hiddenN = homeLayout().widgets.filter(w => w.hidden && homeWidgetAvailable(homeWidgetDef(w.id))).length;
  const { bar, btn } = boardEditBar({
    title: 'Customising Home', aria: 'Customise Home', icon: 'layout-grid',
    hint: 'Drag to move · drag an edge or corner to resize to any size · <kbd class="kbd">−</kbd> hides · arrows move, <kbd class="kbd">Shift</kbd>+arrows resize',
    buttons: [
      { key: 'add', label: 'Add widget', icon: 'plus', kind: 'secondary', cls: 'heb-add', aria: 'Add widget', data: { act: 'add' }, run: (e, el) => _homeOpenGallery(el) },
      // Ready-made boards: Focused, Balanced, Everything, Fun (12-home-presets.js).
      typeof homePresetsMenu === 'function' ? { key: 'presets', label: 'Layouts', icon: 'layers', cls: 'heb-presets', tip: 'Start from a ready-made layout', run: (e, el) => homePresetsMenu(el) } : null,
      { key: 'undo', label: 'Undo', icon: 'undo-2', cls: 'heb-undo', tip: 'Undo the last change to the layout', disabled: !_homeEditUndo.length, run: () => homeEditUndo() },
      { key: 'reset', label: 'Reset', icon: 'rotate-ccw', cls: 'heb-reset', aria: 'Reset layout', tip: 'Back to the default layout', disabled: !homeState().layout, run: () => homeResetLayout() },
      { key: 'done', label: 'Done', icon: 'check', kind: 'primary', cls: 'heb-done', kbd: 'Esc', run: () => homeEditDone() },
    ],
  });
  if (hiddenN) btn.add.insertAdjacentHTML('beforeend', `<span class="badge badge-accent num">${esc(hiddenN)}</span>`);
  btn.add.setAttribute('aria-haspopup', 'dialog');
  if (btn.presets) btn.presets.setAttribute('aria-haspopup', 'menu');
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
  for (const o of frame.querySelectorAll(':scope > .hg-chrome, :scope > .hg-x, :scope > .hg-grip, :scope > .hg-rs')) o.remove();
  if (!_homeEditing) { frame.removeAttribute('tabindex'); frame.onkeydown = null; frame.style.removeProperty('--wq'); return; }
  const A = homeBoardAdapter();
  boardChrome(frame, {
    title: def.title,
    aria: `${def.title}, ${w.c ? `${w.c} of 12 columns` : (HOME_SIZE_LABEL[w.size] || w.size)}`,
    // A second copy of a widget is removed (with its settings; Undo), not hidden.
    removeLabel: `${def.copy > 1 ? 'Remove' : 'Hide'} ${def.title}`, removeTip: def.copy > 1 ? 'Remove this copy' : 'Hide',
    onRemove: () => homeWidgetHide(def.id),
    // The presets; a custom width lights none of them.
    sizes: def.sizes.map(s => ({ key: s, text: s === 'full' ? 'Full' : s.toUpperCase(), aria: HOME_SIZE_LABEL[s], tip: `${_HG_SIZE_LONG[s]} (${HOME_SIZES.indexOf(s) + 1})` })),
    cur: w.c ? null : w.size,
    onSize: (s) => homeWidgetResize(def.id, s),
    // Hovering a size shows the footprint it would take (a dashed ghost on the board).
    onHover: (s) => _homeSizeGhost(frame, s),
    settings: typeof def.settings === 'function' ? (b) => { const rec = _homeW.get(def.id); def.settings(b, rec ? _homeCtx(rec, false) : { id: def.id, def }); } : null,
    settingsAria: `${def.title} settings`,
    onKey: (e) => boardEditKey(A, e, def.id, frame),
  });
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
  const was = frame.dataset.size, wasC = frame.dataset.c;
  frame.dataset.size = size; delete frame.dataset.c;
  const span = Math.min(cols, parseInt(getComputedStyle(frame).getPropertyValue('--hg-span'), 10) || HOME_SIZE_COLS[size]);
  frame.dataset.size = was; if (wasC) frame.dataset.c = wasC;
  const g = document.createElement('div'); g.className = 'hg-size-ghost'; g.setAttribute('aria-hidden', 'true');
  g.style.width = Math.round(span * colW + (span - 1) * gap) + 'px';
  g.innerHTML = `<span>${esc(_HG_SIZE_LONG[size])}</span>`;
  frame.appendChild(g);
}
/**
 * While customising, the columns a row leaves empty show as a dashed "+" slot that opens Add widget (HOME_SPEC.md 2),
 * and the widget it adds takes exactly that space. A slot fills exactly the hole the packing leaves, so nothing moves
 * (12-home-board.js boardGapSlots). Wide screens only (on narrow ones every row is whole).
 */
/**
 * Where a 12-column board that packs densely leaves columns empty (pure). spans: the columns each widget takes, in
 * order. -> [{at, cols}]: `cols` free columns at the end of the row whose last widget is before `at`.
 */
function homeShelfGaps(spans) {
  return boardGaps(spans, true).map(g => ({ at: g.after + 1, cols: g.cols }));
}
function _homeGapSlots(grid) {
  boardGapSlots(grid, { isFrame: (k) => k.classList.contains('hg-w') && !!k.dataset.wid, onAdd: (cols) => _homeOpenGallery(null, null, cols) });
}
/** After a re-render in edit mode: drag to reorder, and focus back on the widget being moved. */
function _homeEditAfterMount(grid) {
  // A Home-level sortable (not a widget's): torn down with the next mount.
  // The grid editor: drag to move (a live placeholder, the others glide), edges to resize (12-home-gridedit.js).
  const s = _homeGridEditor(grid);
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
  const next = homeLayout().widgets.map(w => { if (w.id !== id) return w; const o = Object.assign({}, w, { size }); delete o.c; return o; });   // a preset drops a custom width
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
  const save = () => (def.copy > 1 ? homeWidgetRemoveCopy(id)
    : homeSaveLayout(next, { toast: `${def.title} hidden. Add it back from Customise`, say: `${def.title} hidden` }));
  // It shrinks away first; the others then glide into the space.
  const f = document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(id)}"]`);
  const a = f && window.Motion ? Motion.animate(f, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.94)' }], { duration: 180, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }) : null;
  if (a) a.finished.then(save, save); else save();
}
/** Show a hidden widget again (optionally at a size, or a width in columns): it goes at the end of the board (and packs into the first gap that fits). */
function homeWidgetShow(id, size, cols) {
  const def = homeWidgetDef(id);
  if (!def) return;
  _homeAdded = id; _homeEditFocusId = id;
  _homeEntry.painted.delete(id);
  // Added widgets go at the end of the board (where homeGridArrive scrolls to them).
  const all = homeLayout().widgets, me = all.find(w => w.id === id);
  if (!me) return;
  const shown = Object.assign({}, me, { hidden: false });
  if (size && def.sizes.includes(size)) { shown.size = size; delete shown.c; }
  if (cols && cols !== HOME_SIZE_COLS[shown.size]) shown.c = cols;
  const next = all.filter(w => w.id !== id).concat([shown]);
  homeSaveLayout(next, { say: `${def.title} added` });
}

/* ---------- Add widget gallery (HOME_SPEC.md 6, hm-07; groups and copies: WIDGETS_CATALOGUE.md 4.1) ----------
   A dialog: on the left a filter box (title, description, words) and every widget:
   "Not on Home" grouped (Time, Tasks, People...; a "New" badge until it has been looked
   at), then "On Home"; on the right the chosen one's name, what it does, its sizes and a
   LIVE preview (the widget's own render() into a box of that size, inert, scaled to fit).
   Add to Home puts it at the end of the board in the chosen size; for one already on
   Home the button applies the chosen size, and a widget that allows copies offers Add
   another. A preview may reset module state a widget keeps for its board copy, so
   closing re-renders Home (positions are remembered; nothing moves). */
const _HG_SIZE_W = Object.freeze({ s: 365, m: 556, l: 746, full: 1128 });
const _HG_SIZE_LONG = Object.freeze({ s: 'Small · a third', m: 'Medium · half', l: 'Large · two thirds', full: 'Full width' });
function _homeOpenGallery(anchor, pick, fitCols) {
  const cat = homeWidgetCatalog().filter(homeWidgetAvailable);
  const placed = () => new Map(homeLayout().widgets.map(w => [w.id, w]));
  const shownN = (id) => homeLayout().widgets.filter(w => !w.hidden && homeBaseId(w.id) === id).length;   // copies too
  const isOn = (id) => shownN(id) > 0;
  // From a free slot: the widgets with a size that fits it come first (in each group), at that size.
  const fitSize = (def) => (fitCols ? def.sizes.filter(s => HOME_SIZE_COLS[s] <= fitCols).pop() || def.sizes[0] : null);
  const byFit = (a, b) => (fitCols ? (fitSize(a) ? 0 : 1) - (fitSize(b) ? 0 : 1) : 0);
  const notOn = cat.filter(d => !isOn(d.id)), on = cat.filter(d => isOn(d.id));
  const groups = HOME_GROUPS.map(([g, label]) => [label, notOn.filter(d => d.group === g).sort(byFit)]).filter(x => x[1].length);
  const ordered = groups.flatMap(x => x[1]);
  let sel = (pick && cat.find(d => d.id === pick)) || (fitCols && ordered.find(d => fitSize(d))) || ordered[0] || on[0];
  if (!sel) return;
  let size = fitSize(sel);             // the size picked in the segment (null = current or default)
  const sizeC = (def) => (fitCols && size && size === fitSize(def) && !isOn(def.id) ? fitCols : undefined);   // from a free slot: take exactly the slot's columns unless another size was picked
  let changed = false;
  openDialog({
    // A filter and a list: a fixed height, so filtering never moves the buttons (UI_CLEANUP_PLAN.md 1.3).
    title: 'Add a widget', size: 'xl', fixed: true, className: 'hgal-modal', resizable: false,
    onClose: () => { if (!changed && typeof state !== 'undefined' && state.view === 'home') render(); },
    body: (el, close) => {
      el.classList.add('hgal-b');
      const side = document.createElement('div'); side.className = 'hgal-side';
      const q = document.createElement('input'); q.type = 'search'; q.className = 'input input-sm hgal-q';
      q.placeholder = 'Search widgets'; q.setAttribute('aria-label', 'Search widgets'); q.autocomplete = 'off';
      const list = document.createElement('div'); list.className = 'hgal-list'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Widgets');
      const none = emptyLine('No widget matches. Try another word, such as money or calendar.'); none.classList.add('hgal-none'); none.hidden = true;
      none.setAttribute('role', 'status');
      side.append(q, list, none);
      const pane = document.createElement('div'); pane.className = 'hgal-pane';
      el.append(side, pane);
      const badge = (def, here) => {
        if (here) { const n = shownN(def.id); return `<span class="hgal-on">${icon('check', 'i-xs')}On Home${n > 1 ? ` ×${n}` : ''}</span>`; }
        return homeWidgetIsNew(def) ? '<span class="hgal-new">New</span>' : '<span class="hgal-tag">Add</span>';
      };
      const heading = (cls, label) => { const h = document.createElement('div'); h.className = cls; h.textContent = label; list.appendChild(h); return h; };
      const group = (defs, here, sub) => {
        const h = sub ? heading('hgal-gh hgal-sg', sub) : null;
        for (const def of defs) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'hgal-item'; b.dataset.id = def.id;
          b.setAttribute('role', 'option');
          b.innerHTML = `<span class="hgal-ic">${icon(def.icon)}</span><span class="hgal-t">${esc(def.title)}</span>${badge(def, here)}`;
          b.onclick = () => { if (sel.id !== def.id) { sel = def; size = isOn(def.id) ? null : fitSize(def); paint(); } };   // re-selecting: nothing
          b._hgDef = def;
          if (h) b._hgHead = h;
          list.appendChild(b);
        }
      };
      if (groups.length) heading('hgal-gh hgal-top', 'Not on Home');
      for (const [label, defs] of groups) group(defs, false, label);
      if (on.length) { const h = heading('hgal-gh hgal-top', 'On Home'); group(on, true, null); for (const b of list.querySelectorAll('.hgal-item')) if (!b._hgHead && isOn(b.dataset.id)) b._hgHead = h; }
      const visible = () => [...list.querySelectorAll('.hgal-item')].filter(b => !b.hidden);
      // The filter: hides what does not match (and empty headings); the selection moves to the first match.
      q.addEventListener('input', () => {
        for (const b of list.querySelectorAll('.hgal-item')) b.hidden = !homeWidgetMatches(b._hgDef, q.value);
        for (const h of list.querySelectorAll('.hgal-gh')) {
          const mine = [...list.querySelectorAll('.hgal-item')].filter(b => b._hgHead === h);
          h.hidden = mine.length ? mine.every(b => b.hidden) : false;
        }
        for (const h of list.querySelectorAll('.hgal-top')) {           // "Not on Home" / "On Home" over their groups
          let n = h.nextElementSibling, any = false;
          while (n && !n.classList.contains('hgal-top')) { if (n.classList.contains('hgal-item') && !n.hidden) any = true; n = n.nextElementSibling; }
          h.hidden = !any;
        }
        const vis = visible();
        none.hidden = vis.length > 0;
        if (vis.length && !vis.some(b => b.dataset.id === sel.id)) { sel = vis[0]._hgDef; size = isOn(sel.id) ? null : fitSize(sel); paint(); }
      });
      q.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          const v = visible(); if (!v.length) return;
          e.preventDefault();
          const b = v.find(x => x.dataset.id === sel.id) || v[0];
          b.focus(); if (b.dataset.id !== sel.id) b.click();
        }
      });
      list.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const items = visible();
        const i = items.findIndex(x => x.dataset.id === sel.id);
        if (e.key === 'ArrowUp' && i <= 0) { e.preventDefault(); q.focus(); return; }
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
        // Looked at: its "New" badge goes (homeUI.gallerySeen).
        if (homeWidgetIsNew(def) && homeMarkGallerySeen(def.id)) {
          const nb = list.querySelector(`.hgal-item[data-id="${CSS.escape(def.id)}"] .hgal-new`);
          if (nb) nb.outerHTML = '<span class="hgal-tag">Add</span>';
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
        foot.appendChild(!here ? uiButton({ label: 'Add to Home', icon: 'plus', kind: 'primary', run: () => { changed = true; close(); homeWidgetShow(def.id, sz, sizeC(def)); } })
          : sz !== cur ? uiButton({ label: `Make it ${_HG_SIZE_LONG[sz].split(' · ')[0]}`, icon: 'check', kind: 'primary', run: () => { changed = true; close(); homeWidgetResize(def.id, sz); } })
          : uiButton({ label: 'On Home', icon: 'check', disabled: true }));
        // A widget that allows copies (runway, smart list): another one, with its own settings.
        const n = shownN(def.id);
        if (here && def.multi > 1 && n < def.multi) foot.appendChild(uiButton({ label: 'Add another', icon: 'plus', cls: 'hgal-another', run: () => { changed = true; close(); homeWidgetAddCopy(def.id, sz); } }));
        const note = document.createElement('p'); note.className = 'hgal-note';
        note.textContent = here
          ? (def.multi > 1 ? `On your Home${n > 1 ? ` ${n} times` : ''}. You can have up to ${def.multi}, each with its own settings.` : 'Already on your Home. Pick another size to change it, or hide it with its − button.')
          : 'Lands at the end of the board; drag it where you like afterwards.';
        foot.appendChild(note);
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
  const frame = document.createElement('section'); frame.className = 'hg-w hgal-w'; frame.dataset.size = size; frame.dataset.wid = def.id; frame.dataset.base = def.baseId || def.id;
  const body = document.createElement('div'); body.className = 'hg-body'; body.inert = true;
  frame.appendChild(body); box.appendChild(frame); stage.appendChild(box);
  const rec = { frame, body, def };
  const ctx = {
    id: def.id, def, size, editing: false, firstPaint: false, preview: true, expanded: new Set(),
    instance: def.id, baseId: def.baseId || def.id, copy: def.copy || 1, prefs: homePrefs(def.id),
    isNew: () => false, enterNew: () => 0, toggleExpanded() {}, rerender() {}, flip(fn) { fn(); },
    sortable: () => ({ destroy() {}, get dragging() { return false; } }),
    off: (o) => _homeOffState(rec, o || {}), openTask() {},
  };
  let ok = false;
  try { ok = def.render(body, ctx) !== false && !!body.firstElementChild; } catch (e) { console.error(`[home] preview of "${def.id}" failed`, e); }
  if (!ok) body.innerHTML = `<div class="hg-placeholder">${icon(def.icon, 'i-lg')}<span><b>${esc(def.title)}</b> ${esc(def.emptyHint || 'Nothing to show right now')}</span></div>`;
  const fit = () => {
    const avail = stage.clientWidth - 24;                  // inside the stage's 12 px padding
    const s = Math.min(1, avail > 0 ? avail / w : 1);
    box.style.transform = s < 1 ? `scale(${s})` : '';
    box.style.marginRight = s < 1 ? `${-w * (1 - s)}px` : '';   // the scaled box takes its scaled width (stays centred)
    stage.style.height = Math.min(400, Math.ceil(frame.offsetHeight * s) + 24) + 'px';
  };
  requestAnimationFrame(fit);
}
