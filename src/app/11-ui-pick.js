/* ============================================================
   MULTI-SELECT (owner: Shell/Design): one way to select several things in any
   long-lived list, then act on them together. Rows stay as the page drew them;
   multiPick() adds a checkbox to each (hover, focus or once selecting), a calm
   highlight, and the floating action bar at the bottom (#bulk-bar).
   Not for lists of proposals with Apply (those use selectList, 11-ui-select.js).

     const ms = multiPick(listEl, {
       key,                  one per list; ticks survive re-renders under it
       rows: '.bin-row',     the rows inside listEl (new rows are picked up by themselves)
       idOf(row), nameOf(row),   the row's id, and its name for the checkbox's label
       noun: ['item', 'items'],  how the bar and the labels say it
       actions(ids, ms) ->   [{label, icon, run(ids, button, ms), danger, tip, keep}]
                             run may be async. The selection clears afterwards unless it
                             returns false or the action has keep:true (menus, dialogs).
       set(): Set            optional: the caller's own Set (else one per key)
       exists(id) -> bool    optional: ids that fail are dropped from the selection
       allIds() -> [ids]     optional: everything in the list when only some rows are drawn
       onChange(ids),        after any change
     });
     host.append(ms.button())   the small Select button for the list's header
     ms.ids() ms.clear() ms.selectAll() ms.paint()

   Input: the checkbox or Ctrl/Cmd-click toggles, Shift-click selects a range,
   Ctrl+A selects all shown, Esc clears (both from 90-wiring.js). A long press
   on touch, or the Select button, starts selecting: then a plain click or tap
   toggles. The task lists keep their own store (multiSelect, 30-task-row.js) and
   rendering, and share the bar, the long press and the Select button through
   uiSelectBar, taskPickButton and the task branch below.
   Each action does its whole batch as one change, so one Undo reverts it:
   saveData once for state, a batch route with one undo token for the server.
   Styles: src/styles/11-pick.css. No inline handlers (strict CSP).
   ============================================================ */
const _pk = { cur: null, stores: new Map(), suppress: 0, lp: null };
const _PK_LONG_MS = 480, _PK_LONG_MOVE = 10;

function _pkStore(key) {
  let s = _pk.stores.get(key);
  if (!s) { s = { own: new Set(), mode: false, anchor: null }; _pk.stores.set(key, s); }
  return s;
}
function _pkPlural(n, noun) { return n === 1 ? noun[0] : noun[1]; }
function _pkNoTextPick() { try { const s = window.getSelection && window.getSelection(); if (s) s.removeAllRanges(); } catch (e) { /* no selection API */ } }

/**
 * Paint the floating bar: {text, actions:[{label, icon, run(button), danger, tip, kbd}], selectAll:{label, tip, run}, clear:{label, run}}.
 * Null hides it. Unchanged buttons stay put (focus keeps its place); a click always reads the newest spec.
 */
function uiSelectBar(spec) {
  const bb = document.getElementById('bulk-bar');
  if (!bb) return;
  if (!spec) { bb.classList.remove('open'); bb.replaceChildren(); bb._spec = null; bb._sig = ''; return; }
  const sigA = (a) => [a.label, a.icon, a.danger ? 1 : 0, a.tip || '', a.kbd || ''];
  const sig = JSON.stringify([(spec.actions || []).map(sigA), spec.selectAll ? [spec.selectAll.label, spec.selectAll.tip] : 0, spec.clear ? spec.clear.label : 0]);
  bb._spec = spec;
  bb.classList.add('open');
  bb.setAttribute('role', 'toolbar');
  bb.setAttribute('aria-label', 'Actions for what you selected');
  if (bb._sig !== sig) {
    const focusAt = bb.contains(document.activeElement) ? [...bb.querySelectorAll('button')].indexOf(document.activeElement) : -1;
    bb._sig = sig;
    bb.replaceChildren();
    const count = document.createElement('span'); count.className = 'count'; count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite');
    bb.appendChild(count);
    const mk = (a, cls, read) => {
      const b = document.createElement('button'); b.type = 'button'; if (cls) b.className = cls;
      b.innerHTML = (a.icon ? icon(a.icon) : '') + (a.label ? `<span>${esc(a.label)}</span>` : '');
      if (a.tip) { b.setAttribute('data-tip', a.tip); b.setAttribute('aria-label', a.tip); }
      if (a.kbd) { b.setAttribute('data-kbd', a.kbd); if (!a.tip) b.setAttribute('data-tip', a.label); }
      b.addEventListener('click', () => _pkBarRun(read(), b));
      bb.appendChild(b);
      return b;
    };
    (spec.actions || []).forEach((a, i) => mk(a, a.danger ? 'danger' : '', () => (bb._spec.actions || [])[i]));
    const sp = document.createElement('span'); sp.className = 'pk-bar-gap'; bb.appendChild(sp);
    if (spec.selectAll) mk(Object.assign({ icon: 'list-checks' }, spec.selectAll), 'ghost', () => bb._spec.selectAll);
    if (spec.clear) mk(Object.assign({ icon: 'x' }, spec.clear), 'ghost', () => bb._spec.clear);
    if (focusAt >= 0) { const b = bb.querySelectorAll('button')[focusAt]; if (b) b.focus({ preventScroll: true }); }
  }
  bb.querySelector('.count').textContent = spec.text || '';
}
async function _pkBarRun(a, btn) {
  if (!a || typeof a.run !== 'function') return;
  const bb = document.getElementById('bulk-bar');
  const r = a.run(btn);
  if (!r || typeof r.then !== 'function') return;
  // A batch on the server: the bar waits, so a second one cannot start. A failure says so in its own toast.
  bb.classList.add('is-busy'); bb.setAttribute('aria-busy', 'true');
  for (const b of bb.querySelectorAll('button')) b.disabled = true;
  try { await r; } catch (e) { console.error('[multiPick] action', e); }
  bb.classList.remove('is-busy'); bb.removeAttribute('aria-busy');
  for (const b of bb.querySelectorAll('button')) b.disabled = false;
}

function multiPick(root, o) {
  o = o || {};
  const st = _pkStore(o.key);
  const noun = o.noun || ['item', 'items'];
  const set = () => (typeof o.set === 'function' ? o.set() : st.own);
  const rows = () => [...root.querySelectorAll(o.rows)];
  const idOf = (r) => { const v = o.idOf ? o.idOf(r) : (r.dataset.pickId || r.dataset.id); return v == null ? '' : String(v); };
  const ms = {};
  let btns = [];

  const prune = () => { if (typeof o.exists === 'function') { const s = set(); for (const id of [...s]) if (!o.exists(id)) s.delete(id); } };
  const paintRows = () => {
    const s = set();
    root.classList.add('pk-root');
    root.classList.toggle('pk-active', s.size > 0 || st.mode);
    for (const r of rows()) {
      const id = idOf(r);
      if (!id) continue;
      const on = s.has(id);
      let c = r.querySelector(':scope > .pk-check, :scope > .pk-td > .pk-check');
      if (!c) {
        c = document.createElement('button'); c.type = 'button'; c.className = 'multi-checkbox pk-check';
        c.setAttribute('role', 'checkbox');
        const name = o.nameOf ? o.nameOf(r) : '';
        c.setAttribute('aria-label', 'Select ' + (name || _pkPlural(1, noun)));
        c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); });   // the row's own keys (Enter opens it) stay out of this
        if (r.tagName === 'TR') {
          const td = document.createElement('td'); td.className = 'pk-td'; td.appendChild(c); r.insertBefore(td, r.firstChild);
          const head = r.closest('table') && r.closest('table').querySelector('thead tr');
          if (head && !head.querySelector(':scope > .pk-td')) { const th = document.createElement('th'); th.className = 'pk-td'; th.setAttribute('aria-label', 'Select'); head.insertBefore(th, head.firstChild); }
        } else { r.classList.add('pk-row'); r.insertBefore(c, r.firstChild); }
      }
      r.classList.toggle('pk-on', on);
      c.classList.toggle('checked', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
    }
  };
  const paintBar = () => {
    if (_pk.cur !== ms) return;
    const s = set(), n = s.size;
    if (!n && !st.mode) { uiSelectBar(null); return; }
    const shown = rows().map(idOf).filter(Boolean);
    const moreShown = shown.some(id => !s.has(id));
    const all = typeof o.allIds === 'function' ? o.allIds() : shown;
    const selectAll = moreShown ? { label: 'Select all', tip: `Select all ${shown.length} shown`, kbd: 'Ctrl+A', run: () => ms.selectAll() }
      : all.length > n ? { label: `Select all ${all.length.toLocaleString()}`, tip: `Select all ${all.length.toLocaleString()}, including those further down`, run: () => { const t = set(); for (const id of all) t.add(id); ms.paint(); } } : null;
    const acts = n && typeof o.actions === 'function' ? (o.actions([...s], ms) || []).filter(Boolean) : [];
    uiSelectBar({
      text: n ? `${n.toLocaleString()} selected` : 'Click the ones you want',
      actions: acts.map(a => Object.assign({}, a, { run: (b) => _pkRunAction(ms, a, b) })),
      selectAll,
      clear: { label: n ? 'Clear' : 'Done', tip: n ? 'Clear the selection (Esc)' : 'Stop selecting (Esc)', kbd: 'Esc', run: () => ms.clear(true) },
    });
  };
  const paintBtns = () => {
    btns = btns.filter(b => b.isConnected || !b._msPlaced);
    const going = set().size > 0 || st.mode;
    for (const b of btns) {
      b.setAttribute('aria-pressed', going ? 'true' : 'false');
      const t = b.querySelector('span'); if (t) t.textContent = going ? 'Done' : 'Select';
    }
  };
  ms.paint = () => {
    if (_pk.cur !== ms) return;
    prune(); paintRows(); paintBar(); paintBtns();
    if (typeof o.onChange === 'function') { try { o.onChange([...set()]); } catch (e) { console.error('[multiPick] onChange', e); } }
  };
  ms.ids = () => [...set()];
  ms.has = (id) => set().has(id);
  ms.clear = (leave) => { set().clear(); if (leave !== false) st.mode = false; st.anchor = null; ms.paint(); };
  ms.selectAll = () => { const s = set(); for (const r of rows()) { const id = idOf(r); if (id) s.add(id); } ms.paint(); };
  ms.selecting = () => set().size > 0 || st.mode;
  ms.setMode = (on) => { st.mode = !!on; if (!on) set().clear(); ms.paint(); };
  /** The small Select button (a toggle: Select, then Done). */
  ms.button = (b) => {
    b = b || {};
    const el = document.createElement('button'); el.type = 'button';
    el.className = (b.cls || 'btn btn-ghost btn-sm') + ' pk-select-btn';
    el.innerHTML = icon('list-checks', 'i-sm') + '<span>Select</span>';
    el.setAttribute('data-tip', `Select several ${noun[1]} to act on them together`);
    el.addEventListener('click', () => { if (ms.selecting()) ms.clear(true); else ms.setMode(true); });
    btns.push(el);
    setTimeout(() => { el._msPlaced = true; }, 0);
    paintBtns();
    return el;
  };
  const toggle = (id) => { const s = set(); if (s.has(id)) s.delete(id); else s.add(id); st.anchor = id; ms.paint(); };
  const range = (id) => {
    const order = rows().map(idOf);
    const a = order.indexOf(st.anchor), b = order.indexOf(id);
    if (a < 0 || b < 0) { toggle(id); return; }
    const s = set();
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (order[i]) s.add(order[i]);
    _pkNoTextPick();
    ms.paint();
  };

  /* ---------- input ---------- */
  const onClick = (e) => {
    const r = e.target.closest && e.target.closest(o.rows);
    if (!r || !root.contains(r)) return;
    const id = idOf(r); if (!id) return;
    const onBox = !!e.target.closest('.pk-check');
    const keyed = e.ctrlKey || e.metaKey;
    if (!onBox && keyed && e.target.closest('a[href]')) return;   // Ctrl-click on a link still opens a tab
    if (!onBox && !keyed && !e.shiftKey && !st.mode) return;
    if (!onBox && e.shiftKey && !st.anchor) return;
    e.preventDefault(); e.stopPropagation();
    if (e.shiftKey && st.anchor) range(id); else toggle(id);
  };
  const onDown = (e) => { if (e.shiftKey && e.target.closest && e.target.closest(o.rows)) e.preventDefault(); };   // no text selection on Shift-click
  const onPress = (e) => {
    const r = e.target.closest && e.target.closest(o.rows);
    if (!r || !root.contains(r) || e.target.closest('.pk-check')) return;
    const id = idOf(r); if (!id) return;
    _pkLongPressStart(e, () => { st.mode = true; set().add(id); st.anchor = id; ms.paint(); });
  };
  root.addEventListener('click', onClick, true);
  root.addEventListener('mousedown', onDown, true);
  root.addEventListener('pointerdown', onPress, { passive: true });
  const watch = typeof MutationObserver === 'function' ? new MutationObserver(() => { if (_pk.cur !== ms) return; paintRows(); watch.takeRecords(); paintBar(); }) : null;
  if (watch) watch.observe(root, { childList: true, subtree: true });
  ms._off = () => {
    if (watch) watch.disconnect();
    root.removeEventListener('click', onClick, true); root.removeEventListener('mousedown', onDown, true); root.removeEventListener('pointerdown', onPress);
    root.classList.remove('pk-active');
  };
  ms._root = root;
  ms._key = o.key;
  ms._forget = () => { set().clear(); st.mode = false; st.anchor = null; };

  // Attach: this list is now the one the keyboard and the bar talk to.
  const old = _pk.cur;
  if (old) { old._off(); if (old._key !== o.key) old._forget(); }
  _pk.cur = ms;
  ms.paint();
  return ms;
}
function _pkRunAction(ms, a, btn) {
  const after = (r) => { if (r !== false && !a.keep) { const c = _pk.cur && _pk.cur._key === ms._key ? _pk.cur : null; if (c) c.clear(true); } return r; };
  const r = a.run(ms.ids(), btn, ms);
  return r && typeof r.then === 'function' ? r.then(after) : after(r);
}
/** A list that has gone from the screen (another page, another tab of the page) lets go of the bar. */
function multiPickCheck() {
  const c = _pk.cur;
  if (c && !c._root.isConnected) { c._off(); c._forget(); _pk.cur = null; uiSelectBar(null); return null; }
  return c;
}
/** The page drew something else in place of this list without a render(): let go now. */
function multiPickLeave(key) {
  const c = _pk.cur;
  if (c && c._key === key) { c._off(); c._forget(); _pk.cur = null; uiSelectBar(null); }
}
/** Is this element the list the bar is talking to? */
function multiPickIsOn(root) { return !!(_pk.cur && _pk.cur._root === root); }
/** Esc: clear the selection, or stop selecting. True when it did. */
function multiPickEsc() {
  const c = multiPickCheck();
  if (!c || !c.selecting()) return false;
  c.clear(true);
  return true;
}
/** Ctrl+A: select all shown. True when a list took it. */
function multiPickSelectAll() {
  const c = multiPickCheck();
  if (!c) return false;
  c.selectAll();
  return true;
}
/** After render(): repaint the bar for the list on screen. False when none, so the task lists may use the bar. */
function multiPickAfterRender() {
  const c = multiPickCheck();
  if (!c) return false;
  c.paint();
  return true;
}

/* ---------- the long press (every list, and the task rows) ---------- */
function _pkLongPressStart(e, fire) {
  if (e.pointerType !== 'touch') return;
  _pkLongPressEnd();
  const x = e.clientX, y = e.clientY;
  const move = (m) => { if (Math.abs(m.clientX - x) > _PK_LONG_MOVE || Math.abs(m.clientY - y) > _PK_LONG_MOVE) _pkLongPressEnd(); };
  const stop = () => _pkLongPressEnd();
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerup', stop, { passive: true });
  document.addEventListener('pointercancel', stop, { passive: true });
  document.addEventListener('scroll', stop, { passive: true, capture: true });
  const t = setTimeout(() => {
    _pkLongPressEnd();
    // Until the finger lifts: the click that ends this press must not count as a tap.
    _pk.suppress = Infinity;
    document.addEventListener('pointerup', () => { _pk.suppress = Date.now() + 60; }, { once: true, capture: true });
    document.addEventListener('pointercancel', () => { _pk.suppress = 0; }, { once: true, capture: true });
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (err) { /* not on this device */ }
    _pkNoTextPick();
    fire();
  }, _PK_LONG_MS);
  _pk.lp = () => { clearTimeout(t); document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', stop); document.removeEventListener('pointercancel', stop); document.removeEventListener('scroll', stop, { capture: true }); };
}
function _pkLongPressEnd() { if (_pk.lp) { const f = _pk.lp; _pk.lp = null; f(); } }
// The menu a long press opens on a touch screen, and the click that ends it, would undo what it just did.
document.addEventListener('contextmenu', (e) => { if (Date.now() < _pk.suppress) e.preventDefault(); }, true);
document.addEventListener('click', (e) => { if (Date.now() < _pk.suppress && !(e.target.closest && e.target.closest('#bulk-bar'))) { e.preventDefault(); e.stopPropagation(); } }, true);
// Task rows and board cards: the same long press, into their own store (30-task-row.js).
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || !e.target.closest) return;
  const r = e.target.closest('#main-body .task[data-id], #main-body .kanban-card[data-id]');
  if (!r || e.target.closest('.pk-root')) return;
  _pkLongPressStart(e, () => { multiSelect.active = true; if (typeof _toggleMulti === 'function') _toggleMulti(r.dataset.id); });
}, { passive: true });

/* ---------- the task lists' Select button ---------- */
/** In the task lists' controls: Select, then Done. Painted with the bar (32-tasks-ui.js renderBulkBar). */
function taskPickButton() {
  const host = document.getElementById('view-controls');
  if (!host) return;
  let b = document.getElementById('task-select-btn');
  if (!b) {
    b = document.createElement('button'); b.type = 'button'; b.id = 'task-select-btn'; b.className = 'btn btn-secondary pk-select-btn';
    b.innerHTML = icon('list-checks') + '<span>Select</span>';
    b.setAttribute('data-tip', 'Select several tasks to act on them together');
    b.addEventListener('click', () => {
      if (multiSelect.active || multiSelect.ids.size) { multiSelect.active = false; multiSelect.ids.clear(); } else multiSelect.active = true;
      render();
    });
    const before = document.getElementById('display-btn');
    host.insertBefore(b, before && before.parentNode === host ? before : null);
  }
  const going = multiSelect.active || multiSelect.ids.size > 0;
  b.setAttribute('aria-pressed', going ? 'true' : 'false');
  const t = b.querySelector('span'); if (t) t.textContent = going ? 'Done' : 'Select';
}
