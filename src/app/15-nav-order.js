/* ============================================================
   SIDEBAR LIST ORDER, the page side (pure rules: 15-nav-order-logic.js).
   Streams, Tags and People in the Tasks sidebar share it:
     sbListMenuAction(key, defaults, noun)  the heading's "Sort and show" button
     sbOrderedList(el, o)                   draws the rows in order, N at a time,
                                            with drag (makeSortable, 12-home-drag.js)
                                            and Alt+Up / Alt+Down to reorder
   View prefs (sort, how many) are UI state: state.sidebarLists[key] (saveUI).
   The custom order is data, kept by each list's saveCustom (Streams: the
   streams' own order; Tags and People: state.sidebarOrder[key], saveData).
   Dragging or Alt+arrows while sorted another way switches to Custom.
   ============================================================ */
const _sbListExpanded = {};

function sbListPrefsFor(key, defaults) {
  const all = state.sidebarLists && typeof state.sidebarLists === 'object' ? state.sidebarLists : {};
  return sbListPrefs(all[key], defaults);
}
function sbSetListPrefs(key, patch, defaults) {
  const all = Object.assign({}, state.sidebarLists && typeof state.sidebarLists === 'object' ? state.sidebarLists : {});
  all[key] = Object.assign(sbListPrefsFor(key, defaults), patch);
  state.sidebarLists = all;
  saveUI();
  renderSidebar();
}
/** The custom order of a data-kept list (Tags, People). */
function sbSavedOrder(key) {
  const o = state.sidebarOrder && typeof state.sidebarOrder === 'object' ? state.sidebarOrder : {};
  return Array.isArray(o[key]) ? o[key] : [];
}
function sbSaveOrder(key, ids) {
  state.sidebarOrder = Object.assign({}, state.sidebarOrder && typeof state.sidebarOrder === 'object' ? state.sidebarOrder : {}, { [key]: ids.slice(0, 500) });
  saveData();
}

/** The heading button: a menu of sorts and sizes (arrow keys move through it, Enter picks). */
function sbListMenuAction(key, defaults, noun) {
  return {
    icon: 'arrow-up-down', label: `Sort and show ${noun}`,
    run: (e, btn) => {
      const p = sbListPrefsFor(key, defaults);
      openMenu(btn, [
        { heading: 'Sort by' },
        ...SB_LIST_SORTS.map(([id, label]) => ({ label, checked: p.sort === id, run: () => { if (p.sort !== id) sbSetListPrefs(key, { sort: id }, defaults); } })),
        'sep',
        { heading: 'Show' },
        ...SB_LIST_SHOWS.map(n => ({ label: n ? `${n} at a time` : 'All', checked: p.show === n, run: () => { if (p.show !== n) { _sbListExpanded[key] = false; sbSetListPrefs(key, { show: n }, defaults); } } })),
      ], { align: 'start', width: 230 });
    },
  };
}

/**
 * o: {key, noun, items:[{id, label, total, open, recent, pinned}], defaults:{sort, show},
 *     custom:[id], saveCustom(ids), row(item) -> element, keepId}
 */
function sbOrderedList(el, o) {
  const p = sbListPrefsFor(o.key, o.defaults);
  const ordered = sbOrderItems(o.items, p.sort, o.custom);
  const expanded = !!_sbListExpanded[o.key];
  const { shown, hidden } = sbLimit(ordered, p.show, expanded, o.keepId);
  const box = document.createElement('div'); box.className = 'sb-list'; box.dataset.sbList = o.key;
  box.setAttribute('role', 'group'); box.setAttribute('aria-label', `${o.noun}: drag, or Alt+Up and Alt+Down, to reorder`);
  for (const it of shown) {
    const r = o.row(it);
    if (!r) continue;
    r.dataset.sbId = it.id;
    if (it.pinned && !r.querySelector('.sb-pin')) {   // the visible pin marker (Unpin is in the row's right-click menu)
      r.classList.add('is-pinned');
      const lab = r.querySelector('.label');
      if (lab) lab.insertAdjacentHTML('afterend', `<span class="sb-pin" data-tip="Pinned to the top" aria-label="Pinned">${icon('pin', 'i-xs')}</span>`);
    }
    r.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
    box.appendChild(r);
  }
  el.appendChild(box);
  const allIds = ordered.map(x => x.id);
  const commit = (ids, movedId) => {
    o.saveCustom(ids);
    if (p.sort !== 'custom') {
      const all = Object.assign({}, state.sidebarLists || {});
      all[o.key] = Object.assign({}, p, { sort: 'custom' });
      state.sidebarLists = all; saveUI();
      toast(`${o.noun}: custom order. Change it from the sort button.`, { icon: 'arrow-up-down' });
    }
    renderSidebar();
    if (movedId != null) {
      const sel = `[data-sb-list="${o.key}"] [data-sb-id="${CSS.escape(String(movedId))}"]`;
      const again = document.querySelector(sel);
      if (again) again.focus();
    }
  };
  box.addEventListener('keydown', (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    const row = e.target.closest && e.target.closest('[data-sb-id]');
    if (!row || !box.contains(row)) return;
    e.preventDefault(); e.stopPropagation();
    const id = row.dataset.sbId;
    const next = sbMoveId(allIds, id, e.key === 'ArrowUp' ? -1 : 1);
    if (next.join('\u0001') !== allIds.join('\u0001')) commit(next, id);
  });
  if (typeof makeSortable === 'function' && shown.length > 1) {
    makeSortable(box, {
      items: '[data-sb-id]', idOf: (n) => n.dataset.sbId,
      onReorder: (ids, movedId) => commit(sbMergeOrder(ids, allIds), movedId),
    });
  }
  if (hidden > 0 || (expanded && p.show && ordered.length > p.show)) {
    el.appendChild(sbNavItem({
      label: expanded ? 'Show fewer' : `Show ${hidden} more`,
      icon: expanded ? 'chevron-up' : 'chevron-down', className: 'nav-more', active: false,
      onClick: () => { _sbListExpanded[o.key] = !expanded; renderSidebar(); },
    }));
  }
}
