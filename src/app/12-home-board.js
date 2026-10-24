/* ============================================================
   THE BOARD ENGINE (2.19.5). Owner: Home foundation.
   One way to build and edit a board of widgets, shared by Home (12-home*.js) and My money
   (src/finance/39-board*.js). A board is a 12-column CSS grid; a widget has
     a width     1-12 columns, any of them (the presets Small / Medium / Large / Full are 4, 6, 8, 12),
     a height    a number of rows (HOME_ROW_PX each, HOME_H_MIN..HOME_H_MAX) or none = as tall as its content,
   and they pack densely (grid-auto-flow: dense): a widget that fits a gap further up takes it. In view
   mode a row that still does not add up to 12 hands its free columns to its last widget, so there is never
   a gap; while customising the gaps show as dashed "Add a widget here" slots.

   What lives here (pure ones first):
     boardNearestSize(cols, sizes, map)   the preset nearest a width (ties: the larger)
     boardFit(cols, sizes, map)           a width as {size, c?}: the nearest allowed preset and, when the width is not
                                          exactly that preset, the exact columns c (saved next to the size)
     boardPlace(spans, dense)             where a 12-column board puts items [{row, col, span}] (0 = a full-row barrier)
     boardGaps(spans, dense)              the holes it leaves [{row, col, cols, after}]
     boardSpanOf(el)                      the columns an element takes on this screen (from the computed style)
     boardFillGaps(grid, isFrame, dense)  view mode: no gaps (the last widget of a short row takes the rest)
     boardGapSlots(grid, o)               customising: the dashed "Add a widget here" slots
     boardChrome(frame, o)                customising: the minus, grip, size presets, settings, resize handles and keys
     boardEditBar(o)                      customising: the toolbar at the foot (Add widget, Layouts, Undo, Reset, Done)
     boardEditKey(A, e, id, frame)        keyboard: arrows move, Shift+arrows resize one column / row, 0, +, -, 1-4, Delete, A
   The pointer editor (drag to move, drag an edge or corner to resize) is boardEditor in 12-home-gridedit.js.
   Each host passes an adapter A:
     sel                 CSS selector of its widget frames (direct children of the grid)
     map, presets        preset -> columns, and the presets in key order (1-4)
     state(id)           {size, c, cols, h, sizes, title}: size = the preset in use, c = the custom columns (none = the
                         preset's), cols = the columns it takes, h = rows (null = content), sizes = the presets it allows
     setSize(id, ch, say) one save: ch = {cols?, size?, h?} (cols: any width; size: a preset, dropping the custom width;
                         h: rows, null = fit content)
     preview(frame, st)  live, no save: show {size, c, h} on the frame (a resize in progress)
     ids(), moveTo(id, j), order(ids, movedId), remove(id), add(), say(text), sizeName(size)
     reflow(fn), after(grid), lift {cls, prep(el)}
   ============================================================ */
const BOARD_COLS = 12;

/** The preset nearest `cols` columns among `sizes` (ties: the larger). map: {preset: columns}. */
function boardNearestSize(cols, sizes, map) {
  let best = sizes[0], bd = Infinity;
  for (const s of sizes) {
    const d = Math.abs(map[s] - cols);
    if (d < bd || (d === bd && map[s] > map[best])) { best = s; bd = d; }
  }
  return best;
}
/** A width as {size, c?}: the nearest allowed preset, and the exact columns c when that is not the preset's own. */
function boardFit(cols, sizes, map) {
  const n = Math.max(1, Math.min(BOARD_COLS, Math.round(cols) || BOARD_COLS));
  const size = boardNearestSize(n, sizes, map);
  return map[size] === n ? { size } : { size, c: n };
}
/**
 * Where a 12-column board puts items, one grid row each (pure). spans: the columns of each item in
 * order, 0 = a full-row barrier (a section label). dense: each item takes the first row it fits (CSS
 * grid-auto-flow: dense); otherwise items follow on from the last one. -> [{row, col, span}] (0-based).
 */
function boardPlace(spans, dense) {
  const used = [], out = [];
  let floor = 0, cur = 0;
  for (const s0 of spans) {
    if (!s0) { out.push({ row: used.length, col: 0, span: BOARD_COLS }); used.push(BOARD_COLS); floor = cur = used.length; continue; }
    const span = Math.max(1, Math.min(BOARD_COLS, Math.round(s0) || BOARD_COLS));
    let r = dense ? floor : cur;
    while (r < used.length && used[r] + span > BOARD_COLS) r++;
    while (used.length <= r) used.push(0);
    out.push({ row: r, col: used[r], span });
    used[r] += span;
    if (!dense) cur = r;
  }
  return out;
}
/** The holes boardPlace leaves (pure): [{row, col, cols, after}], after = the index of the last item on that row. */
function boardGaps(spans, dense) {
  const rows = new Map();
  boardPlace(spans, dense).forEach((p, i) => rows.set(p.row, { used: p.col + p.span, last: i }));
  return [...rows].filter(([, r]) => r.used < BOARD_COLS).sort((a, b) => a[0] - b[0])
    .map(([row, r]) => ({ row, col: r.used, cols: BOARD_COLS - r.used, after: r.last }));
}
/** The columns an element takes on this screen (narrow screens map widths to halves and wholes). `grid-column: span N` computes to a start of "span N". */
function boardSpanOf(el) {
  const cs = getComputedStyle(el);
  const m = /span\s+(\d+)/.exec(cs.gridColumnStart || '') || /span\s+(\d+)/.exec(cs.gridColumnEnd || '');
  return m ? Math.max(1, Math.min(BOARD_COLS, parseInt(m[1], 10))) : BOARD_COLS;
}
/**
 * View mode: a row that does not add up to 12 columns (a widget with nothing to show today, a width that
 * leaves a few columns) hands the free ones to its last widget, so there is never a gap beside a short card.
 * Anything in the grid that is not a frame (isFrame false) counts as a full row.
 */
function boardFillGaps(grid, isFrame, dense) {
  const kids = [...grid.children];
  for (const k of kids) if (isFrame(k)) k.style.removeProperty('grid-column');
  const live = kids.filter(k => !k.hidden);
  const spans = live.map(k => (isFrame(k) ? boardSpanOf(k) : 0));
  for (const g of boardGaps(spans, dense)) {
    const k = live[g.after];
    if (k && isFrame(k)) k.style.gridColumn = 'span ' + (spans[g.after] + g.cols);
  }
}
/**
 * Customising: each hole the packing leaves shows as a dashed "Add a widget here" slot (nothing moves: it fills exactly the
 * hole). o: {isFrame(el), onAdd(cols), min = 3 (a hole narrower than that is only drawn)}.
 */
function boardGapSlots(grid, o) {
  for (const x of grid.querySelectorAll(':scope > .hg-slot')) x.remove();
  const kids = [...grid.children].filter(k => !k.hidden);
  const spans = kids.map(k => (o.isFrame(k) ? boardSpanOf(k) : 0));
  for (const g of boardGaps(spans, true)) {
    const narrow = g.cols < (o.min || 3);
    const el = document.createElement(narrow ? 'div' : 'button');
    el.className = 'hg-slot' + (narrow ? ' is-narrow' : '');
    el.style.gridRow = String(g.row + 1);
    el.style.gridColumn = `${g.col + 1} / span ${g.cols}`;
    if (narrow) el.setAttribute('aria-hidden', 'true');
    else {
      el.type = 'button';
      el.innerHTML = icon('plus') + '<span>Add a widget here</span>';
      el.setAttribute('aria-label', `Add a widget in the free space (${g.cols} of 12 columns)`);
      el.onclick = (e) => { e.stopPropagation(); o.onAdd(g.cols); };
    }
    grid.insertBefore(el, kids[g.after + 1] || null);
  }
}

/** The three resize handles: right edge (width), bottom edge (height), bottom-right corner (both). */
function boardHandles(frame) {
  const mk = (dir, label) => {
    const h = document.createElement('span'); h.className = 'hg-rs hg-rs-' + dir; h.dataset.dir = dir;
    h.setAttribute('aria-hidden', 'true'); h.title = label;
    frame.appendChild(h);
  };
  mk('e', 'Drag to change the width (double-click: back to the preset)');
  mk('s', 'Drag to change the height (double-click: fit the content)');
  mk('se', 'Drag to resize');
}
/**
 * A widget's controls while customising: the minus (top left), the grip (top centre), the size presets and settings
 * (top right) and the resize handles. o: {aria, roledesc, removeLabel, removeTip, onRemove, sizes: [{key, text, aria, tip}],
 * cur (the preset lit; none for a custom width), onSize(key), onHover(key | null), settings: fn(button) | null, aria for it,
 * onKey(e)}.
 */
function boardChrome(frame, o) {
  for (const x of frame.querySelectorAll(':scope > .hg-chrome, :scope > .hg-x, :scope > .hg-grip, :scope > .hg-rs, :scope > .hg-rs-tip')) x.remove();
  frame.tabIndex = 0;
  frame.setAttribute('aria-roledescription', o.roledesc || 'widget');
  if (o.aria) frame.setAttribute('aria-label', o.aria);
  // The wiggle's phase, so neighbours never sway in step (13-home-edit.css).
  const pos = frame.parentElement ? [...frame.parentElement.children].indexOf(frame) : 0;
  frame.style.setProperty('--wq', String(Math.max(0, pos) % 7));
  const x = document.createElement('button'); x.type = 'button'; x.className = 'hg-x'; x.dataset.act = 'hide';
  x.innerHTML = icon('minus', 'i-sm'); x.setAttribute('aria-label', o.removeLabel); x.setAttribute('data-tip', o.removeTip || 'Remove');
  x.onclick = (e) => { e.stopPropagation(); o.onRemove(); };
  frame.appendChild(x);
  frame.insertAdjacentHTML('beforeend', `<span class="hg-grip" aria-hidden="true">${icon('grip-vertical', 'i-sm')}</span>`);
  const c = document.createElement('div'); c.className = 'hg-chrome';
  if (o.sizes && o.sizes.length > 1) {
    const seg = document.createElement('span'); seg.className = 'seg hg-sizes'; seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', `${o.title || 'Widget'} size`);
    for (const s of o.sizes) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.size = s.key; b.textContent = s.text;
      const on = s.key === o.cur;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.setAttribute('aria-label', s.aria); b.setAttribute('data-tip', s.tip);
      if (on) b.classList.add('on');
      if (o.onHover) { b.onmouseenter = () => { if (!b.classList.contains('on')) o.onHover(s.key); }; b.onmouseleave = () => o.onHover(null); }
      seg.appendChild(b);
    }
    c.appendChild(seg);
  }
  if (typeof o.settings === 'function') c.appendChild(uiButton({ icon: 'sliders-horizontal', iconCls: 'i-sm', size: 'sm', aria: o.settingsAria || 'Settings', tip: 'Settings', data: { act: 'settings' } }));
  c.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.size) { if (!b.classList.contains('on')) o.onSize(b.dataset.size); }   // the preset in use: nothing
    else if (b.dataset.act === 'settings') o.settings(b);
  };
  if (c.firstChild) frame.appendChild(c);
  boardHandles(frame);
  frame.onkeydown = o.onKey || null;
}
/** The preset buttons of a frame's switcher follow a live resize: lit only for the preset in use (none for a custom width). */
function boardLightSizes(frame, size, custom) {
  for (const b of frame.querySelectorAll(':scope > .hg-chrome .hg-sizes button[data-size]')) {
    const on = !custom && b.dataset.size === size;
    b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
  }
}

/** The toolbar at the foot while customising. o: {title, hint (trusted html), icon, cls, aria, buttons: [{key, ...uiButton options}]}. -> {bar, btn: {key: button}} */
function boardEditBar(o) {
  const bar = document.createElement('div'); bar.className = 'home-editbar' + (o.cls ? ' ' + o.cls : '');
  bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', o.aria || o.title);
  bar.innerHTML = `<div class="heb-t">${icon(o.icon || 'layout-grid', 'i-lg')}<div><b>${esc(o.title)}</b><span>${o.hint}</span></div></div><span class="spacer"></span>`;
  const btn = {};
  for (const b of o.buttons) {
    if (!b) continue;
    const el = uiButton(Object.assign({ size: 'sm', kind: 'ghost', bubble: true }, b));
    bar.appendChild(el);
    if (b.key) btn[b.key] = el;
  }
  return { bar, btn };
}

/* ---------- the keyboard (a widget focused) ---------- */
function boardStepCols(A, id, dir) {
  const s = A.state(id); if (!s) return;
  const n = Math.max(1, Math.min(BOARD_COLS, s.cols + dir));
  if (n === s.cols) { A.say(`${s.title} is already as ${dir > 0 ? 'wide' : 'narrow'} as it goes`); return; }
  A.setSize(id, { cols: n }, `${s.title}: ${n} of 12 columns`);
}
function boardStepRows(A, id, dir, frame) {
  const s = A.state(id); if (!s) return;
  const cur = s.h || Math.round((frame ? frame.offsetHeight : 6 * HOME_ROW_PX) / HOME_ROW_PX);
  const n = Math.max(HOME_H_MIN, Math.min(HOME_H_MAX, cur + dir));
  if (n === s.h) { A.say(`${s.title} is already as ${dir > 0 ? 'tall' : 'short'} as it goes`); return; }
  A.setSize(id, { h: n }, `${s.title}: ${n} rows tall`);
}
/** The next bigger (1) or smaller (-1) preset the widget allows. */
function boardStepSize(A, id, dir) {
  const s = A.state(id); if (!s) return;
  const allowed = s.sizes.slice().sort((a, b) => A.map[a] - A.map[b]);
  const next = dir > 0 ? allowed.find(x => A.map[x] > s.cols) : allowed.slice().reverse().find(x => A.map[x] < s.cols);
  if (!next) { A.say(`${s.title} is already as ${dir > 0 ? 'big' : 'small'} as it goes`); return; }
  A.setSize(id, { size: next }, `${s.title}: ${A.sizeName(next)}`);
}
/** One place earlier (-1) or later (1). */
function boardMoveBy(A, id, delta) {
  const ids = A.ids(), i = ids.indexOf(id), j = i + delta;
  if (i < 0) return;
  if (j < 0 || j >= ids.length) { A.say(`${A.state(id).title} is already ${j < 0 ? 'first' : 'last'}`); return; }
  A.moveTo(id, j);
}
/** Up / down a shelf (dir -1 / 1): before (up) or after (down) the widget on that shelf nearest its centre. */
function boardMoveRow(A, grid, id, dir) {
  const s = A.state(id);
  if (!grid || !s) return;
  const frames = [...grid.querySelectorAll(':scope > ' + A.sel)].filter(f => !f.hidden), me = frames.find(f => f.dataset.wid === id);
  if (!me) return;
  const tops = [...new Set(frames.map(f => f.offsetTop))].sort((a, b) => a - b);
  const row = tops.indexOf(me.offsetTop), want = tops[row + dir];
  const ids = A.ids();
  if (want === undefined) {
    // Already on the first / last shelf: first / last place.
    if ((dir < 0 && ids[0] === id) || (dir > 0 && ids[ids.length - 1] === id)) { A.say(`${s.title} is already ${dir < 0 ? 'first' : 'last'}`); return; }
    A.moveTo(id, dir < 0 ? 0 : ids.length);
    return;
  }
  const cx = me.offsetLeft + me.offsetWidth / 2;
  const on = frames.filter(f => f !== me && f.offsetTop === want);
  if (!on.length) return;
  const near = on.reduce((a, b) => (Math.abs(b.offsetLeft + b.offsetWidth / 2 - cx) < Math.abs(a.offsetLeft + a.offsetWidth / 2 - cx) ? b : a));
  const others = ids.filter(x => x !== id);
  A.moveTo(id, others.indexOf(near.dataset.wid) + (dir > 0 ? 1 : 0));
}
/** The keys (a widget focused). Left / Right move it a place, Up / Down a shelf; Shift: one column / row wider, narrower, taller, shorter. */
function boardEditKey(A, e, id, frame) {
  if (e.target !== frame) return;
  const k = e.key, plain = !e.altKey && !e.ctrlKey && !e.metaKey;
  if (/^Arrow(Up|Down|Left|Right)$/.test(k) && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    const fwd = k === 'ArrowDown' || k === 'ArrowRight' ? 1 : -1, vert = k === 'ArrowUp' || k === 'ArrowDown';
    if (e.shiftKey) { if (vert) boardStepRows(A, id, fwd, frame); else boardStepCols(A, id, fwd); }
    else if (vert) boardMoveRow(A, frame.parentElement, id, fwd);
    else boardMoveBy(A, id, fwd);
  }
  else if (k === '0' && plain) { e.preventDefault(); const s = A.state(id); if (s && s.h) A.setSize(id, { h: null }, `${s.title}: fits its content`); }
  else if ((k === '+' || k === '=') && plain) { e.preventDefault(); boardStepSize(A, id, 1); }
  else if ((k === '-' || k === '_') && plain) { e.preventDefault(); boardStepSize(A, id, -1); }
  else if (/^[1-4]$/.test(k) && plain) {
    // 1-4 = the presets in order (only the ones this widget has)
    e.preventDefault();
    const size = A.presets[Number(k) - 1], s = A.state(id);
    if (!s || !size) return;
    if (!s.sizes.includes(size)) { A.say(`${s.title} has no ${A.sizeName(size)} size`); return; }
    A.setSize(id, { size }, `${s.title}: ${A.sizeName(size)}`);
  }
  else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); A.remove(id); }
  else if ((k === 'a' || k === 'A') && plain) { e.preventDefault(); A.add(); }
  else if (k === 'Enter' && plain) { const b = frame.querySelector(':scope > .hg-chrome [data-act="settings"]'); if (b) { e.preventDefault(); b.click(); } }
}
