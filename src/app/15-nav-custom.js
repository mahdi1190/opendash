/* ============================================================
   THE CUSTOMISED SIDEBAR (owner: lists). Move sections, hide what you do
   not use, rename sections, pin smart lists, saved boards or any view to
   the top. Synced data: state.sidebarLayout (lib/sync/manifest.mjs
   '── lists ──'): one change here shows on every device; every change is
   one undo step, and "Reset sidebar" puts the default back (with Undo).

   state.sidebarLayout = {
     order:  {<tab>: [blockId]}      section order per tab (home, tasks, calendar, finance, life)
     hidden: {'<tab>/<blockId>': true, 'item:<view>': true}
                                     a block registered with hiddenByDefault: true (the Friends item,
                                     2.17.1: the corner is the way in) is hidden until the user shows
                                     it, saved as '<tab>/<blockId>': false
     names:  {<blockId>: 'Name'}     renamed section headings
     items:  {<blockId>: [view]}     row order inside a section (Views)
     pins:   [view]                  pinned to the top ('list:<id>', 'stream:<id>', 'today', a board view ...)
     more:   [view]                  2.18: the Views rows folded under More views, once the user chose (Shown /
                                     In More / Hidden); absent: the defaults (sbViewPlacement). One whole list.
   }
   renderSidebar (15-nav-sidebar.js) asks sbLayoutBlocks() which blocks to
   draw and in what order, then sbLayoutDecorate() renames, hides and orders
   rows. Rows carry data-view (sbNavItem, 14-shell.js).
     sbIsPinned(view) / sbTogglePin(view, o) / sbUnpin(view, o)
     registerSidebarPinKind(prefix, resolve(view, ctx) -> {label, icon|avatarHtml, count, onClick} | null)
                                    another module's pinnable things (saved boards: prefix 'board')
     sbBlockHidden(L, tab, block)   is a block hidden (the user's choice, else its default)
     sbViewPlacement(view, L?)      a Views row: 'shown' | 'more' | 'hidden' (15-nav-sidebar.js draws it)
     sbSetViewPlacement(view, p)    set it (one undo step)
     openSidebarCustomiser()        the Customise sidebar dialog
     sbResetLayout()
   Keys: Alt+1..9 opens the first nine pins.
   ============================================================ */
const _SB_PIN_KINDS = [];
function registerSidebarPinKind(prefix, resolve) {
  if (typeof prefix !== 'string' || typeof resolve !== 'function') return;
  const i = _SB_PIN_KINDS.findIndex(k => k.prefix === prefix);
  if (i >= 0) _SB_PIN_KINDS[i] = { prefix, resolve }; else _SB_PIN_KINDS.push({ prefix, resolve });
}
const _SB_BLOCK_LABELS = { 'pinned': 'Pinned', boards: 'Boards', 'task-views': 'Views', 'smart-lists': 'Smart lists', streams: 'Streams', tags: 'Tags', people: 'People', minical: 'Month', calendars: 'Calendars', 'cal-countdowns': 'Countdowns', 'finance-sections': 'Money', 'life-tabs': 'Life', 'life-you': 'You', 'all-pages': 'All pages', 'review-nav': 'Plan' };
const _sbBlockTitles = {};   // the heading each block drew last (before a rename)
const _SB_TABS = [['home', 'Home'], ['tasks', 'Tasks'], ['calendar', 'Calendar'], ['finance', 'Money'], ['life', 'Life']];

function sbLayout() {
  const L = state.sidebarLayout && typeof state.sidebarLayout === 'object' ? state.sidebarLayout : {};
  const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  return { order: obj(L.order), hidden: obj(L.hidden), names: obj(L.names), items: obj(L.items), pins: Array.isArray(L.pins) ? L.pins.filter(v => typeof v === 'string' && v) : [],
    more: Array.isArray(L.more) ? L.more.filter(v => typeof v === 'string' && v) : null };
}
/** Change the layout (one undo step) and redraw the sidebar. */
function sbLayoutEdit(fn, o) {
  o = o || {};
  const L = JSON.parse(JSON.stringify(sbLayout()));
  fn(L);
  for (const k of ['order', 'hidden', 'names', 'items']) for (const [kk, v] of Object.entries(L[k])) if (v === null || v === undefined || (v === false && !(k === 'hidden' && _sbHiddenByDefault(kk))) || v === '' || (Array.isArray(v) && !v.length)) delete L[k][kk];
  if (!Array.isArray(L.more)) delete L.more;   // an empty list stays: "nothing in More" is a choice
  state.sidebarLayout = L;
  if (o.noSave) return;
  saveData();
  renderSidebar();
}
/** A block that starts hidden (registerSidebarBlock {hiddenByDefault: true}), from its '<tab>/<blockId>' key. */
function _sbHiddenByDefault(key) {
  const i = String(key).indexOf('/');
  if (i < 0) return false;
  const id = String(key).slice(i + 1), b = SIDEBAR_BLOCKS.find(x => x.id === id);
  return !!(b && b.hiddenByDefault);
}
/** Is a block hidden on a tab: the user's choice when there is one, else the block's own default. */
function sbBlockHidden(L, tab, b) {
  const k = tab + '/' + b.id;
  return Object.prototype.hasOwnProperty.call(L.hidden, k) ? L.hidden[k] === true : !!b.hiddenByDefault;
}
/** Hide or show a block (inside sbLayoutEdit): back at its default, the key goes (so Reset and new devices agree). */
function _sbSetBlockHidden(L, tab, b, hide) {
  const k = tab + '/' + b.id;
  if (!!hide === !!b.hiddenByDefault) delete L.hidden[k]; else L.hidden[k] = !!hide;
}
function _sbLabelOf(b) { return _sbBlockTitles[b.id] || b.label || b.title || _SB_BLOCK_LABELS[b.id] || String(b.id).replace(/[-_]+/g, ' ').replace(/^\w/, c => c.toUpperCase()); }
function sbBlockName(id) { const n = sbLayout().names[id]; return typeof n === 'string' && n.trim() ? n.trim() : null; }
/** The blocks of a tab in the user's order, hidden ones left out (o.all: keep them). */
function sbLayoutBlocks(blocks, tab, o) {
  const L = sbLayout();
  const want = Array.isArray(L.order[tab]) ? L.order[tab] : [];
  const pos = new Map(want.map((id, i) => [id, i]));
  // The saved order first; a block it does not know (new in an update, or another module's)
  // goes in after the block it follows by default (or at the top when it leads).
  const out = blocks.filter(b => pos.has(b.id)).sort((a, b) => pos.get(a.id) - pos.get(b.id));
  let front = 0;
  blocks.forEach((b, i) => {
    if (pos.has(b.id)) return;
    let j = i - 1; while (j >= 0 && !out.includes(blocks[j])) j--;
    if (j < 0) out.splice(front++, 0, b); else out.splice(out.indexOf(blocks[j]) + 1, 0, b);
  });
  return o && o.all ? out : out.filter(b => !sbBlockHidden(L, tab, b));
}
/** After a block drew itself: its heading's new name, hidden rows, the row order. */
function sbLayoutDecorate(el, blockId) {
  const L = sbLayout();
  const t = el.querySelector(':scope > .nav-sec > .t');
  if (t) {
    if (!t.dataset.dflt) t.dataset.dflt = t.textContent;
    _sbBlockTitles[blockId] = t.dataset.dflt;
    const n = sbBlockName(blockId);
    if (n) t.textContent = n;
  }
  if (blockId !== 'pinned') for (const row of el.querySelectorAll('.nav-item[data-view]')) {
    const v = row.dataset.view;
    if (L.hidden['item:' + v] && state.view !== v) row.remove();
  }
  const order = Array.isArray(L.items[blockId]) ? L.items[blockId] : null;
  if (order && order.length) {
    const rows = [...el.querySelectorAll(':scope > .nav-item[data-view]')];
    if (rows.length > 1) {
      const pos = new Map(order.map((v, i) => [v, i]));
      const anchor = rows[rows.length - 1].nextSibling;
      const sorted = rows.map((r, i) => ({ r, i })).sort((a, b) => ((pos.has(a.r.dataset.view) ? pos.get(a.r.dataset.view) : 1e3 + a.i) - (pos.has(b.r.dataset.view) ? pos.get(b.r.dataset.view) : 1e3 + b.i)));
      for (const { r } of sorted) el.insertBefore(r, anchor);
    }
  }
}
/** Drag a section by its heading, and the Views rows, right in the sidebar (makeSortable, 12-home-drag.js). */
function sbLayoutDrag(sb) {
  if (typeof makeSortable !== 'function') return;
  if (!sb._sbDrag) {
    sb._sbDrag = true;   // once: the sidebar element stays, its blocks are redrawn
    makeSortable(sb, { items: '.sb-block', handle: '.nav-sec', idOf: n => n.dataset.block,
      onReorder: (ids) => { const t = _sbTab(); const all = sbLayoutBlocks(SIDEBAR_BLOCKS.filter(b => b.groups.includes(t)), t, { all: true }).map(b => b.id); sbLayoutEdit(L => { L.order[t] = sbMergeOrder(ids, all); }); } });
  }
  const tv = sb.querySelector(':scope > .sb-block[data-block="task-views"]');
  if (tv && tv.querySelectorAll(':scope > .nav-item[data-view]').length > 1) {
    // Dragging the rows up front keeps what is folded where it is (the placement becomes the user's own).
    makeSortable(tv, { items: '.nav-item[data-view]', idOf: n => n.dataset.view, onReorder: (ids) => sbLayoutEdit(L => { _sbViewsFreeze(L); L.items['task-views'] = sbMergeOrder(ids, L.items['task-views']); }) });
  }
}
/** The note at the foot of the sidebar when something is hidden (plain, so nothing is lost from sight). */
function sbLayoutFooter(sb, tab) {
  const L = sbLayout();
  // Blocks hidden by default (the Friends item: the corner is the way in) are not counted; the user's own choices are.
  const n = Object.keys(L.hidden).filter(k => L.hidden[k] === true && (k.startsWith(tab + '/') || (k.startsWith('item:') && tab === 'tasks'))).length;
  if (!n) return;
  const b = sbNavItem({ label: `${n} hidden · Customise`, icon: 'eye-off', className: 'nav-more sb-hidden-note', active: false, onClick: () => openSidebarCustomiser(tab) });
  sb.appendChild(b);
}

/* ---------- pins ---------- */
function sbIsPinned(view) { return sbLayout().pins.includes(view); }
function sbTogglePin(view, o) {
  o = o || {};
  const was = sbIsPinned(view);
  sbLayoutEdit(L => { L.pins = was ? L.pins.filter(v => v !== view) : [...L.pins.filter(v => v !== view), view].slice(0, 30); });
  if (!o.quiet) toast(was ? 'Unpinned' : 'Pinned to the top of the sidebar', { icon: was ? 'pin-off' : 'pin', action: { label: 'Undo', run: () => undo() } });
}
function sbUnpin(view, o) { if (sbIsPinned(view)) sbLayoutEdit(L => { L.pins = L.pins.filter(v => v !== view); }, o); }
const _SB_VIEW_ICONS = { game: 'trophy', locations: 'map-pin', trips: 'map', friends: 'users', garden: 'sprout', pet: 'paw-print', memories: 'book-open', together: 'handshake', files: 'paperclip', waiting: 'hourglass', 'tag:someday': 'archive', today: 'sun', week: 'calendar-range', all: 'layers', 'no-date': 'circle-dashed', completed: 'circle-check', wins: 'trophy', triage: 'mail', now: 'target', inbox: 'inbox', home: 'house', calendar: 'calendar-days', finance: 'wallet', people: 'users', tags: 'tags' };
/** What a pinned view shows: {label, icon | avatarHtml, count, onClick} or null when it is gone. */
function sbPinInfo(view, ctx) {
  const c = (ctx && ctx.counts) || null;
  for (const k of _SB_PIN_KINDS) if (view === k.prefix || view.startsWith(k.prefix + ':')) { try { return k.resolve(view, ctx) || null; } catch (e) { return null; } }
  if (view.startsWith('list:')) {
    const sl = typeof smartListById === 'function' ? smartListById(view.slice(5)) : null;
    if (!sl) return null;
    return { label: sl.name, icon: sl.icon || 'list-filter', count: c ? smartListCount(sl, c.open) : '', onClick: () => openSmartList(sl.id) };
  }
  if (view.startsWith('stream:')) { const id = view.slice(7); return STREAMS[id] && !STREAMS[id].archived ? { label: STREAMS[id].label, avatarHtml: `<span class="ic">${streamMarkHtml(id)}</span>`, count: c ? c.streams[id] || '' : '' } : null; }
  if (view === 'tag:someday') return { label: 'Someday', icon: 'archive', count: c ? c.someday || '' : '' };
  if (view === 'waiting' && typeof sbWaitingViewExists === 'function' && !sbWaitingViewExists()) return null;
  if (view.startsWith('tag:')) { const t = view.slice(4); return { label: t, icon: 'hash', count: c ? c.tags[t] || '' : '' }; }
  if (view.startsWith('person:')) {
    const p = (state.people || []).find(x => x.id === view.slice(7));
    return p ? { label: p.name, avatarHtml: avatarHtml(p, 18), onClick: () => openPerson(p.id) } : null;
  }
  const sec = typeof sectionFor === 'function' ? sectionFor(view) : null;
  if (sec) { let t = ''; try { t = String(sec.title(view) || ''); } catch (e) { t = ''; } return t ? { label: t, icon: sec.icon || _SB_VIEW_ICONS[view] || 'circle' } : null; }
  const cnt = c && (view === 'waiting' ? c.waiting : view === 'today' ? c.today : view === 'week' ? c.week : view === 'all' ? c.all : view === 'no-date' ? c['no-date'] : view === 'inbox' ? c.inbox : view === 'now' ? c.now : '');
  return { label: viewTitle(view), icon: _SB_VIEW_ICONS[view] || 'circle', count: cnt || '' };
}
registerSidebarBlock(['home', 'tasks', 'calendar', 'life'], {
  id: 'pinned', order: 5, label: 'Pinned',
  render(el, ctx) {
    const pins = sbLayout().pins;
    const items = [];
    for (const v of pins) { const info = sbPinInfo(v, ctx); if (info) items.push(Object.assign({ id: v }, info)); }
    if (!items.length) return false;
    el.appendChild(sbSection({ title: 'Pinned', collapsible: 'pinned' }));
    if (sbIsCollapsed('pinned')) return;
    sbOrderedList(el, {
      key: 'pinned', noun: 'Pinned', defaults: { sort: 'custom', show: 0 },
      items, custom: pins,
      saveCustom: (ids) => sbLayoutEdit(L => { L.pins = ids; }),
      row: (it) => {
        const r = sbNavItem({ label: it.label, icon: it.icon, avatarHtml: it.avatarHtml, view: it.id, count: it.count || '', onClick: it.onClick ? (() => { if (state.view !== it.id) it.onClick(); }) : undefined });
        const i = items.indexOf(it);
        if (i < 9) r.setAttribute('aria-keyshortcuts', `Alt+${i + 1}`);
        if (i < 9 && !(state.paneSizes && state.paneSizes.sidebarRail)) r.setAttribute('data-tip', `Alt+${i + 1}`);
        return r;
      },
    });
  },
});
// Alt+1..9: the pins, in order.
document.addEventListener('keydown', (e) => {
  if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !/^Digit[1-9]$/.test(e.code || '')) return;
  const t = e.target;
  if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return;
  const pins = sbLayout().pins.filter(v => sbPinInfo(v, null));
  const v = pins[Number(e.code.slice(5)) - 1];
  if (!v) return;
  e.preventDefault();
  const info = sbPinInfo(v, null);
  if (info && info.onClick) info.onClick(); else setView(v);
});

/* ---------- right-click on the sidebar: pin, hide, rename, move ---------- */
function _sbBlockOf(node) { const b = node && node.closest && node.closest('.sb-block[data-block]'); return b ? b.dataset.block : null; }
function _sbTab() { const g = shellGroupFor(state.view); return g === 'system' ? (typeof _shellLastGroup !== 'undefined' ? _shellLastGroup : 'tasks') : g; }
function sbMoveBlock(tab, id, delta) {
  const blocks = sbLayoutBlocks(SIDEBAR_BLOCKS.filter(b => b.groups.includes(tab)), tab, { all: true }).map(b => b.id);
  const i = blocks.indexOf(id), j = i + delta;
  if (i < 0 || j < 0 || j >= blocks.length) return;
  blocks.splice(i, 1); blocks.splice(j, 0, id);
  sbLayoutEdit(L => { L.order[tab] = blocks; });
}
function sbHideBlock(tab, id, hide) {
  const b = SIDEBAR_BLOCKS.find(x => x.id === id) || { id };
  sbLayoutEdit(L => { _sbSetBlockHidden(L, tab, b, hide); });
  if (hide) toast(`${sbBlockName(id) || _sbLabelOf(b) || 'Section'} hidden`, { icon: 'eye-off', action: { label: 'Undo', run: () => undo() } });
}
function sbHideItem(view, hide, label) {
  sbLayoutEdit(L => { if (hide) L.hidden['item:' + view] = true; else delete L.hidden['item:' + view]; });
  if (hide) toast(`${label || viewTitle(view)} hidden from the sidebar`, { icon: 'eye-off', action: { label: 'Undo', run: () => undo() } });
}
async function sbRenameBlock(id) {
  const dflt = _sbBlockTitles[id] || _SB_BLOCK_LABELS[id] || id;
  const v = await promptDialog({ title: 'Rename section', label: `Shown instead of “${dflt}” (empty: back to it)`, value: sbBlockName(id) || dflt, confirmLabel: 'Rename' });
  if (v === null) return;
  sbLayoutEdit(L => { if (!v || v === dflt) delete L.names[id]; else L.names[id] = v.slice(0, 40); });
}
function sbResetLayout() {
  if (!state.sidebarLayout || !Object.keys(state.sidebarLayout).length) { toast('The sidebar is already the default', { icon: 'check' }); return; }
  state.sidebarLayout = {};
  saveData(); renderSidebar();
  toast('Sidebar reset to the default', { icon: 'rotate-ccw', action: { label: 'Undo', run: () => undo() } });
}
/** Extra rows for the stream / tag / person right-click menu (28-customise.js). */
function sbPinMenuItems(kind, id) {
  const view = kind === 'stream' ? 'stream:' + id : kind === 'tag' ? 'tag:' + id : kind === 'person' ? 'person:' + id : null;
  if (!view) return null;
  const pinned = sbIsPinned(view);
  return ['sep', { label: pinned ? 'Unpin from the sidebar top' : 'Pin to the sidebar top', icon: pinned ? 'pin-off' : 'pin', run: () => sbTogglePin(view) }];
}
function _sbMenuFor(node) {
  const tab = _sbTab();
  const blockId = _sbBlockOf(node);
  const row = node.closest('.nav-item[data-view]');
  const head = node.closest('.nav-sec');
  const tail = [
    'sep',
    { label: 'Customise sidebar…', icon: 'sliders-horizontal', run: () => openSidebarCustomiser(tab) },
    { label: 'Reset sidebar', icon: 'rotate-ccw', run: () => sbResetLayout() },
  ];
  if (row && !head) {
    const v = row.dataset.view;
    const label = (row.querySelector('.label') || {}).textContent || viewTitle(v);
    const pinned = sbIsPinned(v);
    const own = v.startsWith('list:') && typeof smartListMenuItems === 'function' ? smartListMenuItems(v.slice(5)).filter(x => x === 'sep' || !/pin/i.test(String(x.label))) : [];
    return [
      { heading: label },
      { label: pinned ? 'Unpin from the top' : 'Pin to the top', icon: pinned ? 'pin-off' : 'pin', run: () => sbTogglePin(v) },
      ...(blockId !== 'pinned' ? [{ label: 'Hide from the sidebar', icon: 'eye-off', run: () => sbHideItem(v, true, label) }] : []),
      ...(own.length ? ['sep', ...own] : []),
      ...tail,
    ];
  }
  if (blockId) {
    const blocks = sbLayoutBlocks(SIDEBAR_BLOCKS.filter(b => b.groups.includes(tab)), tab).map(b => b.id);
    const i = blocks.indexOf(blockId);
    const title = sbBlockName(blockId) || _sbBlockTitles[blockId] || _SB_BLOCK_LABELS[blockId] || blockId;
    return [
      { heading: title },
      ...(head ? [{ label: 'Rename section…', icon: 'pencil', run: () => sbRenameBlock(blockId) }] : []),
      { label: 'Move up', icon: 'arrow-up', disabled: i <= 0, run: () => sbMoveBlock(tab, blockId, -1) },
      { label: 'Move down', icon: 'arrow-down', disabled: i < 0 || i >= blocks.length - 1, run: () => sbMoveBlock(tab, blockId, 1) },
      { label: 'Hide section', icon: 'eye-off', run: () => sbHideBlock(tab, blockId, true) },
      ...tail,
    ];
  }
  return tail.slice(1);
}
document.addEventListener('contextmenu', (e) => {
  if (e.defaultPrevented) return;
  const sb = document.getElementById('sidebar');
  const t = e.target;
  if (!sb || !(t instanceof Element) || !sb.contains(t) || t.closest('input, textarea, .minical')) return;
  e.preventDefault();
  closePopovers();
  const items = _sbMenuFor(t);
  const anchor = t.closest('.nav-item, .nav-sec') || t;
  openMenu(anchor, items, { align: 'start', width: 240 });
});

/* ---------- the Customise sidebar dialog ---------- */
function openSidebarCustomiser(tab) {
  tab = tab || _sbTab();
  if (!_SB_TABS.some(x => x[0] === tab)) tab = 'tasks';
  let body = null;
  const paint = () => {
    if (!body) return;
    const keepScroll = body.scrollTop;
    body.innerHTML = '';
    const L = sbLayout();
    const tabs = document.createElement('div'); tabs.className = 'seg sbc-tabs';
    for (const [k, t] of _SB_TABS) {
      if (!SIDEBAR_BLOCKS.some(b => b.groups.includes(k))) continue;
      const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.setAttribute('aria-pressed', k === tab ? 'true' : 'false');
      b.onclick = () => { if (tab !== k) { tab = k; paint(); } };
      tabs.appendChild(b);
    }
    body.appendChild(tabs);
    // Sections
    const h = document.createElement('div'); h.className = 'field-label sbc-h'; h.textContent = 'Sections'; body.appendChild(h);
    const list = document.createElement('div'); list.className = 'sbc-list'; list.setAttribute('role', 'list'); list.setAttribute('aria-label', 'Sections: drag, or Alt+Up and Alt+Down, to move');
    const blocks = sbLayoutBlocks(SIDEBAR_BLOCKS.filter(b => b.groups.includes(tab)), tab, { all: true });
    for (const b of blocks) {
      const hidden = sbBlockHidden(L, tab, b);
      const row = document.createElement('div'); row.className = 'sbc-row' + (hidden ? ' is-hidden' : ''); row.dataset.id = b.id; row.tabIndex = 0; row.setAttribute('role', 'listitem');
      const dflt = _sbLabelOf(b);
      row.innerHTML = `<span class="sbc-grip">${icon('grip-vertical', 'i-sm')}</span>`;
      const name = document.createElement('input'); name.className = 'control control-sm sbc-name'; name.value = sbBlockName(b.id) || ''; name.placeholder = dflt;
      name.setAttribute('aria-label', `Name for ${dflt}`);
      name.onchange = () => { const v = name.value.trim(); sbLayoutEdit(Lx => { if (!v || v === dflt) delete Lx.names[b.id]; else Lx.names[b.id] = v.slice(0, 40); }); };
      name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } };
      const eye = uiButton({ icon: hidden ? 'eye-off' : 'eye', size: 'sm', cls: 'sbc-eye', aria: hidden ? `Show ${dflt}` : `Hide ${dflt}`, tip: hidden ? 'Hidden: click to show' : 'Shown: click to hide',
        run: () => { sbLayoutEdit(Lx => { _sbSetBlockHidden(Lx, tab, b, !hidden); }); paint(); } });
      row.append(name, eye);
      row.addEventListener('keydown', (e) => {
        if (e.target === name) return;
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); sbMoveBlock(tab, b.id, e.key === 'ArrowUp' ? -1 : 1); paint(); const again = body.querySelector(`.sbc-row[data-id="${CSS.escape(b.id)}"]`); if (again) again.focus(); }
        if (e.key === ' ') { e.preventDefault(); eye.click(); }
      });
      list.appendChild(row);
    }
    body.appendChild(list);
    if (typeof makeSortable === 'function') makeSortable(list, { items: '.sbc-row', idOf: n => n.dataset.id, onReorder: (ids) => { sbLayoutEdit(Lx => { Lx.order[tab] = ids; }); paint(); } });
    // Rows of the Views section (Tasks): each Shown, In More (under More views) or Hidden (2.18).
    if (tab === 'tasks') {
      const rows = _sbViewRows();
      const h2 = document.createElement('div'); h2.className = 'field-label sbc-h'; h2.textContent = 'Views'; body.appendChild(h2);
      const note = document.createElement('div'); note.className = 'sbc-note subtle';
      const front = rows.filter(r => sbViewPlacement(r.view, L) === 'shown').length;
      note.textContent = 'Shown rows sit up front; In More ones wait under More views (Waiting, Sort email and Do now still come up front while they need you).';
      if (front > 6) {
        note.appendChild(uiButton({ label: 'Fold the extras', kind: 'ghost', size: 'sm', tip: 'Inbox, Today, Upcoming and All tasks up front; the rest under More views', run: () => { sbViewsCalmDefault(); paint(); } }));
      }
      body.appendChild(note);
      const vl = document.createElement('div'); vl.className = 'sbc-list'; vl.setAttribute('role', 'list');
      const order = Array.isArray(L.items['task-views']) ? L.items['task-views'] : [];
      const pos = new Map(order.map((v, i) => [v, i]));
      const sorted = rows.map((r, i) => ({ r, i })).sort((a, b) => ((pos.has(a.r.view) ? pos.get(a.r.view) : 1e3 + a.i) - (pos.has(b.r.view) ? pos.get(b.r.view) : 1e3 + b.i))).map(x => x.r);
      const PLACES = [['shown', 'Shown'], ['more', 'In More'], ['hidden', 'Hidden']];
      for (const r of sorted) {
        const at = sbViewPlacement(r.view, L);
        const row = document.createElement('div'); row.className = 'sbc-row' + (at === 'hidden' ? ' is-hidden' : '') + (at === 'more' ? ' is-more' : ''); row.dataset.id = r.view; row.tabIndex = 0; row.setAttribute('role', 'listitem');
        row.innerHTML = `<span class="sbc-grip">${icon('grip-vertical', 'i-sm')}</span><span class="sbc-ic">${icon(r.icon, 'i-sm')}</span><span class="sbc-lbl">${esc(r.label)}</span>`;
        const seg = document.createElement('div'); seg.className = 'seg seg-sm sbc-place'; seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', `Where ${r.label} goes`);
        for (const [k, t] of PLACES) {
          const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
          b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', at === k ? 'true' : 'false'); b.setAttribute('aria-pressed', at === k ? 'true' : 'false');
          b.onclick = () => { if (at !== k) { sbSetViewPlacement(r.view, k); paint(); } };
          seg.appendChild(b);
        }
        const pin = uiButton({ icon: 'pin', size: 'sm', cls: 'sbc-pin' + (sbIsPinned(r.view) ? ' on' : ''), aria: sbIsPinned(r.view) ? `Unpin ${r.label}` : `Pin ${r.label}`, pressed: sbIsPinned(r.view),
          run: () => { sbTogglePin(r.view, { quiet: true }); paint(); } });
        row.append(pin, seg);
        row.addEventListener('keydown', (e) => {
          if (e.target !== row) return;
          if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            const ids = sorted.map(x => x.view); const i = ids.indexOf(r.view), j = i + (e.key === 'ArrowUp' ? -1 : 1);
            if (j < 0 || j >= ids.length) return;
            ids.splice(i, 1); ids.splice(j, 0, r.view);
            sbLayoutEdit(Lx => { _sbViewsFreeze(Lx); Lx.items['task-views'] = ids; }); paint();
            const again = body.querySelectorAll(`.sbc-row[data-id="${CSS.escape(r.view)}"]`); if (again[0]) again[0].focus();
          }
          // Space steps through Shown, In More and Hidden
          if (e.key === ' ') { e.preventDefault(); const i = PLACES.findIndex(p => p[0] === at); sbSetViewPlacement(r.view, PLACES[(i + 1) % PLACES.length][0]); paint(); const again = body.querySelector(`.sbc-row[data-id="${CSS.escape(r.view)}"]`); if (again) again.focus(); }
        });
        vl.appendChild(row);
      }
      body.appendChild(vl);
      if (typeof makeSortable === 'function') makeSortable(vl, { items: '.sbc-row', idOf: n => n.dataset.id, onReorder: (ids) => { sbLayoutEdit(Lx => { _sbViewsFreeze(Lx); Lx.items['task-views'] = ids; }); paint(); } });
    }
    // Pins
    const h3 = document.createElement('div'); h3.className = 'field-label sbc-h'; h3.textContent = 'Pinned to the top'; body.appendChild(h3);
    const pins = L.pins;
    const pl = document.createElement('div'); pl.className = 'sbc-list'; pl.setAttribute('role', 'list');
    pins.forEach((v, i) => {
      const info = sbPinInfo(v, null);
      const row = document.createElement('div'); row.className = 'sbc-row' + (info ? '' : ' is-hidden'); row.dataset.id = v; row.tabIndex = 0;
      row.innerHTML = `<span class="sbc-grip">${icon('grip-vertical', 'i-sm')}</span><span class="sbc-ic">${info && info.avatarHtml ? info.avatarHtml : icon((info && info.icon) || 'circle', 'i-sm')}</span><span class="sbc-lbl">${esc(info ? info.label : v + ' (gone)')}</span>${i < 9 ? `<kbd class="kbd">Alt+${i + 1}</kbd>` : ''}`;
      row.appendChild(uiButton({ icon: 'x', size: 'sm', aria: 'Unpin', run: () => { sbUnpin(v); paint(); } }));
      pl.appendChild(row);
    });
    // An empty list inside a dialog: one muted line that says what goes here (UI_CLEANUP_PLAN.md 3.6).
    if (!pins.length) pl.appendChild(emptyLine('Nothing pinned yet. Right-click a list, stream, tag or person to pin it, or add one here.'));
    body.appendChild(pl);
    if (typeof makeSortable === 'function' && pins.length > 1) makeSortable(pl, { items: '.sbc-row', idOf: n => n.dataset.id, onReorder: (ids) => { sbLayoutEdit(Lx => { Lx.pins = ids; }); paint(); } });
    body.appendChild(uiButton({ label: 'Pin something…', icon: 'pin', kind: 'ghost', size: 'sm', cls: 'sbc-add', run: (e, btn) => openMenu(btn, _sbPinChoices(), { align: 'start', width: 260 }) }));
    body.scrollTop = keepScroll;
  };
  // A tab per area, so a fixed height: switching tabs never moves the buttons (UI_CLEANUP_PLAN.md 1.3).
  openDialog({
    title: 'Customise sidebar', size: 'md', fixed: true, resizeKey: 'sidebar-custom',
    body: (el) => { el.classList.add('sbc'); body = el; paint(); },
    actions: [
      { label: 'Reset sidebar', icon: 'rotate-ccw', run: () => { sbResetLayout(); paint(); return false; } },
      'spacer',
      { label: 'Done', primary: true },
    ],
  });
}
/** The fixed rows of the Tasks views section (15-nav-sidebar.js draws them; Files and links joined them in 2.18). */
function _sbViewRows() {
  return [['inbox', 'Inbox', 'inbox'], ['today', 'Today', 'sun'], ['now', 'Do now', 'target'], ['week', 'Upcoming', 'calendar-range'], ['all', 'All tasks', 'layers'], ['no-date', 'No date', 'circle-dashed'], ...(typeof sbWaitingViewExists === 'function' && sbWaitingViewExists() ? [['waiting', 'Waiting', 'hourglass']] : []), ['tag:someday', 'Someday', 'archive'], ['completed', 'Finished tasks', 'circle-check'], ['wins', 'Wins', 'trophy'], ['triage', 'Sort email', 'mail'], ...(typeof sectionFor === 'function' && sectionFor('files') ? [['files', 'Files and links', 'paperclip']] : [])]
    .map(([view, label, ic]) => ({ view, label, icon: ic }));
}
/* ---------- Views rows: Shown, In More, Hidden (2.18, NAVIGATION_PLAN.md 2.4) ---------- */
const _SB_VIEWS_FRONT = ['inbox', 'today', 'week', 'all'];
// The rows before 2.18: a user who had arranged or hidden any of them keeps exactly their list shown.
const _SB_VIEWS_OLD = ['inbox', 'today', 'now', 'week', 'all', 'no-date', 'waiting', 'tag:someday', 'completed', 'wins', 'triage'];
function sbViewPlacement(view, L) {
  L = L || sbLayout();
  if (L.hidden['item:' + view] === true) return 'hidden';
  if (view === 'files' && L.hidden['tasks/files'] === true) return 'hidden';   // the old Files and links block, hidden
  const order = Array.isArray(L.items['task-views']) ? L.items['task-views'] : [];
  if (Array.isArray(L.more)) {
    if (L.more.includes(view)) return 'more';
    if (order.includes(view)) return 'shown';
    return _SB_VIEWS_FRONT.includes(view) ? 'shown' : 'more';   // a row new since the choice: its default
  }
  const legacy = order.length > 0 || Object.keys(L.hidden).some(k => L.hidden[k] === true && k.startsWith('item:') && _SB_VIEWS_OLD.includes(k.slice(5)));
  if (legacy && _SB_VIEWS_OLD.includes(view) && (!order.length || order.includes(view))) return 'shown';
  return _SB_VIEWS_FRONT.includes(view) ? 'shown' : 'more';
}
/** Turn the defaults into the user's own list (inside sbLayoutEdit): the rows keep where they are now. */
function _sbViewsFreeze(L) {
  if (Array.isArray(L.more)) return;
  const rows = _sbViewRows().map(r => r.view);
  L.more = rows.filter(v => sbViewPlacement(v, L) === 'more');
  const order = Array.isArray(L.items['task-views']) ? L.items['task-views'].filter(v => rows.includes(v)) : [];
  for (const v of rows) if (!order.includes(v)) order.push(v);
  L.items['task-views'] = order;
}
function sbSetViewPlacement(view, place) {
  sbLayoutEdit(L => {
    _sbViewsFreeze(L);
    if (place === 'hidden') { L.hidden['item:' + view] = true; return; }
    delete L.hidden['item:' + view];
    if (view === 'files') delete L.hidden['tasks/files'];
    L.more = place === 'more' ? [...new Set([...L.more, view])] : L.more.filter(v => v !== view);
  });
}
/** The calm default again for the Views rows (Inbox, Today, Upcoming, All tasks up front), keeping what is hidden and the order. */
function sbViewsCalmDefault() {
  sbLayoutEdit(L => {
    const rows = _sbViewRows().map(r => r.view);
    L.more = rows.filter(v => !_SB_VIEWS_FRONT.includes(v));
    const order = Array.isArray(L.items['task-views']) ? L.items['task-views'].filter(v => rows.includes(v)) : [];
    for (const v of rows) if (!order.includes(v)) order.push(v);
    L.items['task-views'] = order;
  });
  toast('Fewer views up front: the rest are under More views', { icon: 'list', action: { label: 'Undo', run: () => undo() } });
}
function _sbPinChoices() {
  const out = [];
  const pinned = new Set(sbLayout().pins);
  const add = (v, label, ic) => { if (!pinned.has(v)) out.push({ label, icon: ic, run: () => sbTogglePin(v, { quiet: true }) }); };
  const lists = typeof smartListsAll === 'function' ? smartListsAll() : [];
  if (lists.length) { out.push({ heading: 'Smart lists' }); for (const sl of lists) add('list:' + sl.id, sl.name, sl.icon || 'list-filter'); }
  out.push({ heading: 'Views' }); for (const r of _sbViewRows()) add(r.view, r.label, r.icon);
  const streams = Object.entries(STREAMS).filter(([, s]) => !s.archived).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
  if (streams.length) { out.push({ heading: 'Streams' }); for (const [k, s] of streams.slice(0, 12)) add('stream:' + k, s.label, 'layers'); }
  const people = (state.people || []).filter(p => p && !p.self && p.pinned).slice(0, 8);
  if (people.length) { out.push({ heading: 'People' }); for (const p of people) add('person:' + p.id, p.name, 'at-sign'); }
  return out.filter((x, i, a) => !(x.heading && (!a[i + 1] || a[i + 1].heading)));
}
