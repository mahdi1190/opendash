/* ============================================================
   SELECT LISTS (owner: Shell/Design): tick all or some items of a list of
   proposals or suggestions, then apply (or dismiss) the ticked ones. ONE
   component for every such list: the assistant's proposed changes,
   suggested links, people to link, tag clean-up, email suggestions.
   The caller renders its rows as usual; selectList() adds a checkbox to
   each row and a sticky bar above them. The rules (ranges, invert, keeping
   ticks across re-renders, proposal dependencies) are the pure functions
   in 11-ui-select-logic.js. Styles: src/styles/11-select.css.

     const sl = selectList(listEl, {
       rows: '.al-row',               the item rows inside listEl (default [data-sel-id])
       idOf(row), labelOf(row),       the row's id (default data-sel-id) + its checkbox's name
       key | store,                   where ticks live, so they survive re-renders: a key
                                      (one store per key) or the caller's own {on:Set}
       defaultOn: bool | fn(id),      ticked when first seen (default true: proposals)
       locked: fn(id) -> 'done' | true | false     done (applied) or not selectable
       label,                         the toolbar's accessible name
       apply:    {label:'Apply selected', icon, danger, run(ids, sl)}    primary, shows (N)
       applyAll: {label:'Apply all', icon, run(ids, sl)}                  secondary
       dismiss:  {label:'Dismiss selected', icon, run(ids, sl)}           tertiary
       onToggle(id, value, on) -> {also:[ids], note}   what changes with it (dependants, prerequisites)
       normalize(on)                  after Select all / Invert / Apply all
       onChange(on), extra(barEl, sl), compact, bar: an element to fill instead of a new bar,
       rowClick: true                 a click anywhere on a row (not its buttons/links) ticks it
     })
   run(ids) may return {done:[ids], errors:{id: message}, error}: done rows show
   a done state; failed rows stay ticked with their error inline. If it throws,
   the bar shows why (netErrorMessage: "The dashboard server isn't running..."
   for a network failure) with Try again, and every tick is kept.
   sl: {selected(), set(ids, value), selectAll(), selectNone(), invert(), run(kind),
        markDone(ids), markError(id, msg), setError(msg, retry), setBusy(b), refresh(), bar}
   Keys: Space ticks the focused row, Shift+click ticks a range, Ctrl/Cmd+A
   ticks every row, Enter on a checkbox applies the ticked ones, Up/Down move
   between checkboxes.
   ============================================================ */
const _selStores = new Map();
/** The ticks for a list, by key (kept for the session, so a re-render keeps them). */
function selStore(key) {
  if (!_selStores.has(key)) _selStores.set(key, { on: new Set(), seen: new Set(), done: new Set(), errors: new Map() });
  return _selStores.get(key);
}

function selectList(list, o) {
  o = o || {};
  const store = o.store || selStore(o.key || 'default');
  for (const k of ['on', 'seen', 'done']) if (!(store[k] instanceof Set)) store[k] = new Set(Array.isArray(store[k]) ? store[k] : []);
  if (!(store.errors instanceof Map)) store.errors = new Map();
  const idOf = o.idOf || ((row) => row.dataset.selId);
  const labelOf = o.labelOf || ((row) => (row.getAttribute('aria-label') || row.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80));
  const defaultOn = typeof o.defaultOn === 'function' ? o.defaultOn : () => o.defaultOn !== false;
  let rows = [], order = [], byId = new Map();
  let busy = null, msg = null, retry = null, note = null, anchor = null;

  const lockOf = (id) => (store.done.has(id) ? 'done' : (o.locked ? o.locked(id) : false));
  const lockedSet = () => new Set(order.filter(id => lockOf(id)));
  const openIds = () => { const lk = lockedSet(); return order.filter(id => !lk.has(id)); };
  const ticked = () => { const lk = lockedSet(); return order.filter(id => store.on.has(id) && !lk.has(id)); };

  /* ---- the bar ---- */
  const bar = o.bar || document.createElement('div');
  bar.classList.add('sel-bar');
  if (o.compact) bar.classList.add('is-compact');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', o.label ? `${o.label}: selection` : 'Selection');
  const short = !!o.compact;
  bar.innerHTML = `<span class="sel-cbx sel-master" role="checkbox" tabindex="0" aria-label="Select all"></span>`
    + '<span class="sel-count" aria-live="polite"></span>'
    + '<span class="sel-quick">'
    + `<button type="button" class="btn-link" data-sel="all"${short ? ' aria-label="Select all"' : ''}>${short ? 'All' : 'Select all'}</button>`
    + `<button type="button" class="btn-link" data-sel="none"${short ? ' aria-label="Deselect all"' : ''}>${short ? 'None' : 'Deselect all'}</button>`
    + '<button type="button" class="btn-link" data-sel="invert">Invert</button></span>'
    + '<span class="sel-acts"></span>'
    + '<div class="sel-msg" role="alert" hidden></div>';
  const acts = bar.querySelector('.sel-acts');
  const mkBtn = (kind, a, cls) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + cls; b.dataset.sel = kind;
    b.innerHTML = (a.icon ? icon(a.icon) : '') + '<span class="lbl"></span>';
    if (a.tip) b.setAttribute('data-tip', a.tip);
    acts.appendChild(b);
    return b;
  };
  const bDismiss = o.dismiss ? mkBtn('dismiss', Object.assign({ icon: 'x' }, o.dismiss), 'btn-ghost') : null;
  const bAll = o.applyAll ? mkBtn('apply-all', o.applyAll, 'btn-secondary') : null;
  const bApply = o.apply ? mkBtn('apply', Object.assign({ icon: 'check' }, o.apply), o.apply.danger ? 'btn-danger' : 'btn-primary') : null;
  if (!acts.children.length) acts.remove();
  if (!o.bar) list.parentNode.insertBefore(bar, list);
  list.classList.add('sel-list');
  list.classList.toggle('sel-rowclick', !!o.rowClick);
  if (o.label) list.setAttribute('aria-label', o.label);
  if (!list.getAttribute('role')) list.setAttribute('role', 'group');

  /* ---- rows ---- */
  function scan() {
    rows = [...list.querySelectorAll(o.rows || '[data-sel-id]')].filter(r => { const id = idOf(r); return id !== undefined && id !== null && id !== ''; });
    order = rows.map(r => String(idOf(r)));
    byId = new Map(rows.map((r, i) => [order[i], r]));
    selKeep(order, store.on, store.seen, defaultOn);
    for (const id of [...store.done]) if (!byId.has(id)) store.done.delete(id);
    for (const id of [...store.errors.keys()]) if (!byId.has(id)) store.errors.delete(id);
    rows.forEach((row, i) => {
      row.classList.add('sel-row');
      let cb = row.querySelector(':scope > .sel-cbx');
      if (!cb) {
        cb = document.createElement('span'); cb.className = 'sel-cbx'; cb.setAttribute('role', 'checkbox'); cb.tabIndex = 0;
        row.insertBefore(cb, row.firstChild);
      }
      cb.dataset.selFor = order[i];
      cb.setAttribute('aria-label', labelOf(row) || 'Item');
    });
  }
  function paintRow(id) {
    const row = byId.get(id); if (!row) return;
    const cb = row.querySelector(':scope > .sel-cbx');
    const lk = lockOf(id);
    const on = store.on.has(id) && !lk;
    row.classList.toggle('is-on', on);
    row.classList.toggle('sel-done', lk === 'done');
    row.classList.toggle('sel-locked', !!lk && lk !== 'done');
    cb.setAttribute('aria-checked', lk === 'done' ? 'true' : on ? 'true' : 'false');
    if (lk) { cb.setAttribute('aria-disabled', 'true'); cb.tabIndex = -1; } else { cb.removeAttribute('aria-disabled'); cb.tabIndex = 0; }
    cb.innerHTML = lk === 'done' ? icon('check', 'i-xs') : on ? icon('check', 'i-xs') : '';
    if (lk === 'done') cb.setAttribute('data-tip', o.doneLabel || 'Applied'); else cb.removeAttribute('data-tip');
    const err = store.errors.get(id);
    row.classList.toggle('sel-failed', !!err);
    let el = row.querySelector(':scope > .sel-row-err');
    if (err) {
      if (!el) { el = document.createElement('div'); el.className = 'sel-row-err'; row.appendChild(el); }
      el.innerHTML = icon('circle-alert', 'i-xs') + '<span></span>';
      el.querySelector('span').textContent = err;
    } else if (el) el.remove();
    let nt = row.querySelector(':scope > .sel-row-note');
    if (note && note.id === id) {
      if (!nt) { nt = document.createElement('div'); nt.className = 'sel-row-note'; row.appendChild(nt); }
      nt.textContent = note.text;
    } else if (nt) nt.remove();
  }
  function sync() {
    for (const id of order) paintRow(id);
    const lk = lockedSet();
    const open = order.filter(id => !lk.has(id));
    const n = open.filter(id => store.on.has(id)).length;
    const done = order.filter(id => lockOf(id) === 'done').length;
    const st = selState(order, store.on, lk);
    const master = bar.querySelector('.sel-master');
    master.setAttribute('aria-checked', st === 'all' ? 'true' : st === 'some' ? 'mixed' : 'false');
    master.innerHTML = st === 'all' ? icon('check', 'i-xs') : st === 'some' ? icon('minus', 'i-xs') : '';
    master.setAttribute('aria-label', st === 'all' ? 'Deselect all' : 'Select all');
    if (!open.length) master.setAttribute('aria-disabled', 'true'); else master.removeAttribute('aria-disabled');
    bar.querySelector('.sel-count').textContent = selCountText(n, open.length) + (done ? ` · ${done} ${o.doneWord || 'applied'}` : '');
    const q = (k) => bar.querySelector(`[data-sel="${k}"]`);
    q('all').disabled = !!busy || n === open.length;
    q('none').disabled = !!busy || !n;
    q('invert').disabled = !!busy || !open.length;
    const lbl = (b, text) => { if (b) b.querySelector('.lbl').textContent = text; };
    if (bApply) { lbl(bApply, `${o.apply.label || 'Apply selected'} (${n})`); bApply.disabled = !!busy || !n; }
    if (bAll) { lbl(bAll, o.applyAll.label || 'Apply all'); bAll.disabled = !!busy || !open.length; }
    if (bDismiss) { lbl(bDismiss, o.dismiss.label || 'Dismiss selected'); bDismiss.disabled = !!busy || !n; }
    for (const [k, b] of [['apply', bApply], ['apply-all', bAll], ['dismiss', bDismiss]]) {
      if (!b) continue;
      const sp = b.querySelector('.spinner');
      if (busy === k && !sp) b.insertAdjacentHTML('afterbegin', '<span class="spinner" aria-hidden="true"></span>');
      else if (busy !== k && sp) sp.remove();
      b.setAttribute('aria-busy', busy === k ? 'true' : 'false');
    }
    bar.classList.toggle('is-busy', !!busy);
    const m = bar.querySelector('.sel-msg');
    m.hidden = !msg;
    if (msg) {
      m.innerHTML = icon('circle-alert', 'i-sm') + '<span class="grow"></span>';
      m.querySelector('span').textContent = msg;
      if (retry) {
        const r = document.createElement('button'); r.type = 'button'; r.className = 'btn btn-secondary btn-sm';
        r.innerHTML = icon('refresh-cw') + '<span>Try again</span>';
        r.onclick = () => { const f = retry; msg = null; retry = null; sync(); f(); };
        m.appendChild(r);
      }
    }
  }
  const changed = () => { if (o.onChange) o.onChange(store.on); sync(); };

  /* ---- ticking ---- */
  function change(ids, value, single) {
    const want = new Set(ids);
    let n = null;
    if (o.onToggle) {
      for (const id of ids) {
        const r = o.onToggle(id, value, store.on) || {};
        for (const x of r.also || []) want.add(String(x));
        if (single && r.note) n = { id: single, text: r.note };
      }
    }
    note = n;
    for (const id of want) if (!value) store.errors.delete(id);
    selSet(store.on, [...want], value, lockedSet());
    changed();
  }
  function toggle(id, shift) {
    if (lockOf(id) || busy) return;
    const value = !store.on.has(id);
    const ids = shift && anchor && anchor !== id ? selRange(order, anchor, id) : [id];
    anchor = id;
    change(ids, value, ids.length === 1 ? id : null);
  }
  const normalize = () => { if (o.normalize) o.normalize(store.on); };
  function selectAll() { if (busy) return; note = null; selSet(store.on, selAllIds(order, store.on, lockedSet()), true, lockedSet()); normalize(); changed(); }
  function selectNone() { if (busy) return; note = null; selSet(store.on, order, false, lockedSet()); changed(); }
  function invert() {
    if (busy) return;
    note = null;
    const lk = lockedSet();
    const next = selInvertIds(order, store.on, lk);
    selSet(store.on, order, false, lk); selSet(store.on, next, true, lk);
    normalize(); changed();
  }

  /* ---- applying ---- */
  async function run(kind) {
    const a = kind === 'apply' ? o.apply : kind === 'apply-all' ? o.applyAll : kind === 'dismiss' ? o.dismiss : null;
    if (!a || busy) return;
    if (kind === 'apply-all') { selSet(store.on, openIds(), true, lockedSet()); normalize(); }
    const ids = ticked();
    if (!ids.length) { sync(); return; }
    busy = kind; msg = null; retry = null; note = null;
    changed();
    let res;
    try { res = await a.run(ids, api); }
    catch (e) {
      busy = null; msg = netErrorMessage(e, 'That did not work.'); retry = () => run(kind);
      sync(); return;
    }
    busy = null;
    if (res && typeof res === 'object') {
      for (const id of res.done || []) { store.done.add(String(id)); store.on.delete(String(id)); store.errors.delete(String(id)); }
      for (const [id, m] of Object.entries(res.errors || {})) { store.errors.set(String(id), String(m)); store.on.add(String(id)); }
      if (res.error) { msg = netErrorMessage(res.error); retry = () => run(kind); }
    }
    if (bar.isConnected) changed();
  }

  /* ---- events ---- */
  const isField = (t) => /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
  list.addEventListener('click', (e) => {
    const cb = e.target.closest('.sel-cbx');
    if (cb && list.contains(cb) && cb.dataset.selFor) { e.preventDefault(); e.stopPropagation(); toggle(cb.dataset.selFor, e.shiftKey); return; }
    // rowClick: a click anywhere on a row (not on its own buttons or links) ticks it.
    const row = o.rowClick && !cb && e.target.closest('.sel-row');
    if (!row || !list.contains(row) || e.target.closest('button, a, input, select, textarea, label, [role="button"]')) return;
    if (window.getSelection && String(window.getSelection()).length) return;   // selecting text, not ticking
    e.preventDefault();
    toggle(String(idOf(row)), e.shiftKey);
  });
  list.addEventListener('mousedown', (e) => { if (e.shiftKey && e.target.closest(o.rowClick ? '.sel-cbx, .sel-row' : '.sel-cbx')) e.preventDefault(); });   // no text selection on shift-click
  bar.addEventListener('click', (e) => {
    const t = e.target.closest('[data-sel], .sel-master');
    if (!t || !bar.contains(t)) return;
    e.stopPropagation();
    if (t.classList.contains('sel-master')) { if (selState(order, store.on, lockedSet()) === 'all') selectNone(); else selectAll(); return; }
    const k = t.dataset.sel;
    if (k === 'all') selectAll(); else if (k === 'none') selectNone(); else if (k === 'invert') invert(); else run(k);
  });
  const onKey = (e) => {
    const t = e.target;
    if (isField(t) || e.altKey) return;
    const cb = t.closest && t.closest('.sel-cbx');
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); e.stopPropagation(); selectAll(); return; }
    if (e.ctrlKey || e.metaKey) return;
    if (e.key === ' ') {
      if (cb && cb.classList.contains('sel-master')) { e.preventDefault(); e.stopPropagation(); bar.querySelector('.sel-master').click(); return; }
      const row = t.closest && t.closest('.sel-row');
      if (row && list.contains(row) && (cb || !/^(BUTTON|A)$/.test(t.tagName))) {
        e.preventDefault(); e.stopPropagation();
        toggle(String(idOf(row)), e.shiftKey);
        const again = row.querySelector(':scope > .sel-cbx');
        if (cb && again && document.activeElement !== again) again.focus();
      }
      return;
    }
    if (e.key === 'Enter' && cb && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); if (bApply) run('apply'); return; }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && cb) {
      const all = [bar.querySelector('.sel-master'), ...rows.map(r => r.querySelector(':scope > .sel-cbx'))].filter(x => x && x.tabIndex >= 0);
      const i = all.indexOf(cb);
      const nx = all[e.key === 'ArrowDown' ? Math.min(all.length - 1, i + 1) : Math.max(0, i - 1)];
      e.preventDefault(); e.stopPropagation();
      if (nx) nx.focus();
    }
  };
  list.addEventListener('keydown', onKey);
  bar.addEventListener('keydown', onKey);

  const api = {
    bar, list,
    selected: ticked,
    set(ids, value) { selSet(store.on, (ids || []).map(String), value !== false, lockedSet()); changed(); },
    selectAll, selectNone, invert, run,
    markDone(ids) { for (const id of ids || []) { store.done.add(String(id)); store.on.delete(String(id)); store.errors.delete(String(id)); } sync(); },
    markError(id, m) { store.errors.set(String(id), String(m)); store.on.add(String(id)); sync(); },
    clearErrors() { store.errors.clear(); msg = null; retry = null; sync(); },
    setError(m, again) { msg = m ? netErrorMessage(m) : null; retry = m ? again || null : null; sync(); },
    setBusy(b, kind) { busy = b ? (kind || 'apply') : null; sync(); },
    refresh() { scan(); sync(); },
  };
  scan(); normalize();
  if (o.extra) { try { o.extra(bar, api); } catch (err) { console.error('[select]', err); } }
  sync();
  return api;
}

/**
 * Run fn() (which may save several times) as ONE undo step: the undo
 * entries it pushed are folded into the first. For bulk edits of local data
 * (accept 5 email suggestions = 5 new tasks, one Undo).
 */
function selUndoGroup(fn) {
  const before = typeof _dataSnapshot === 'function' ? _dataSnapshot() : null;
  const out = fn();
  try {
    if (before !== null && Array.isArray(_undoStack)) {
      const i = _undoStack.lastIndexOf(before);
      if (i >= 0) _undoStack.splice(i + 1);
    }
  } catch (e) { /* no undo history: nothing to fold */ }
  return out;
}
