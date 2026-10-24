/* ============================================================
   APP SHELL (Shell/Design). The frame around every view:
     sidebar  = workspace head, search (command palette), section tiles,
                nav#sidebar (blocks per section), footer (Bin, Settings, keys)
     top bar  = breadcrumb, widget strip (#countdowns slot + registered
                widgets), save status, theme, More menu
     main     = page header (#view-header) + #main-body, detail pane.

   Shell API (all declared here, safe to call from any module):
     registerTile({id, label, icon, order, view, feature, badge})   section tiles: Home, Tasks,
                                Calendar, Money (id 'finance'), Life (2.18, 15-nav-life.js)
     shellGroupFor(view)        -> 'home'|'tasks'|'calendar'|'finance'|'life'|'system'
                                (the page registry's area first, then the section's group,
                                which may be a function of the view)
     registerPage(def) / pageFor(view) / pagesAll() / pagesMarkSeen(view) / pagesFresh()
                                the ONE list of pages (2.18, NAVIGATION_PLAN.md 2.6): the Life
                                sidebar and tab strip, All pages, the palette's Go to, the new-page
                                dots, the crumbs and Home's card links all read it (below)
     areaTabsEl(view)           the slim level-1 strip (an area's tab pages) and the level-2 one
                                (the page's sections), drawn above a page (80-main-render.js)
     navBackTarget()            '‹ Back to …' for a page reached from a link inside another
     registerSidebarBlock(groups, {id, order, render(el, ctx)})  sidebar content
         groups: a group id or an array; same id replaces. render() may return
         false to hide the block. ctx: {view, group, navItem(o), section(o)}.
         label: its name in Customise sidebar; hiddenByDefault: true starts it
         hidden until the user shows it there (15-nav-custom.js sbBlockHidden).
     sbNavItem(o) / sbSection(o)    build sidebar rows (see below)
     registerTopbarWidget({id, order, render(el)})                top-bar strip
     registerMoreItem({id, label, icon, order, where, run, checked, hidden, hint, kbd})
         where: ['more'] (top-bar More menu) and/or 'workspace' (brand menu)
     onShell(event, fn) / emitShell(event, payload)               tiny event bus
     openNewTask(prefill, {quick, from})  the centre card in create mode (side-panel
                                    mode: focus quick add, or the quick-add dialog)
     renderShell()                  repaint the chrome (called by render())
   Sections themselves register with registerSection() (00-core-config.js);
   add `group: 'calendar'` (etc.) so the right tile lights up and `crumb(view)`
   for a custom breadcrumb. crumb() returns parts after the area: strings, or
   {label, view} (or {label, run}) for parts you can click (every part but the last).
   ============================================================ */

/* ---------- section tiles ---------- */
const SHELL_TILES = [];
function registerTile(def) {
  if (!def || !def.id) throw new Error('registerTile needs an id');
  const i = SHELL_TILES.findIndex(t => t.id === def.id);
  const t = Object.assign({ order: 50, icon: 'circle', label: def.id, view: def.id }, def);
  if (i >= 0) SHELL_TILES[i] = t; else SHELL_TILES.push(t);
  SHELL_TILES.sort((a, b) => a.order - b.order);
}
function _tileEnabled(t) {
  if (!t.feature) return true;
  const f = APP_CONFIG.features || {};
  return f[t.feature] !== false;
}
// The last task view this session visited (the Tasks tile returns to it); the Life tile likewise (15-nav-life.js).
let _shellLastTaskView = 'today';
let _shellLastLifeView = '';
let _shellLastGroup = 'home';

registerTile({ id: 'home', label: 'Home', icon: 'house', order: 10, view: 'home' });
registerTile({ id: 'tasks', label: 'Tasks', icon: 'list-todo', order: 20, view: () => _shellLastTaskView || 'today' });
registerTile({ id: 'calendar', label: 'Calendar', icon: 'calendar-days', order: 30, view: 'calendar', feature: 'calendar' });
// 'Money' since 2.18 (it fits five tiles; NAVIGATION_PLAN.md 2.1): the id, view and feature stay 'finance'.
registerTile({ id: 'finance', label: 'Money', icon: 'wallet', order: 40, view: 'finance', feature: 'finance' });
// The fifth area (2.18): Friends, Garden, Pets, Achievements, Memories and Places (15-nav-life.js).
registerTile({ id: 'life', label: 'Life', icon: 'heart', order: 50,
  view: () => (typeof lifeTileView === 'function' ? lifeTileView() : 'memories'),
  badge: () => (typeof lifeBadge === 'function' ? lifeBadge() : null) });

const _TASK_GROUP_VIEWS = new Set(['today', 'tomorrow', 'week', 'all', 'no-date', 'completed', 'wins', 'triage']);
const _SYSTEM_VIEWS = new Set(['bin']);
/** Which tile a view belongs to: its page's area (the registry below), else its section's group, else the old rules. */
function shellGroupFor(view) {
  const v = String(view || '');
  const pg = pageFor(v);
  if (pg && pg.area && !pg.keepGroup) return areaGroup(pg.area);
  const sec = typeof sectionFor === 'function' ? sectionFor(v) : null;
  if (sec && sec.group) {
    if (typeof sec.group !== 'function') return sec.group;
    try { return sec.group(v) || 'system'; } catch (e) { return 'system'; }
  }
  if (v === 'finance') return 'finance';
  if (v === 'home') return 'home';
  if (v === 'calendar' || v.startsWith('calendar:')) return 'calendar';
  if (_SYSTEM_VIEWS.has(v)) return 'system';
  if (_TASK_GROUP_VIEWS.has(v) || /^(stream|tag|day|person):/.test(v)) return 'tasks';
  return sec ? 'system' : 'tasks';
}
const _SHELL_GROUP_LABEL = { home: 'Home', tasks: 'Tasks', calendar: 'Calendar', finance: 'Money', life: 'Life', system: '' };

/* ---------- the pages registry (2.18, docs/dev/NAVIGATION_PLAN.md 2.6) ----------
   One list of every page. The Life sidebar and its tab strip, All pages (16-pages.js), the
   palette's Go to, the new-page dots, the crumbs and Home's card links read it.

   registerPage({
     id: 'game',                    stable page id (the seen flags and achievements use it)
     view: 'game',                  the view it opens (or () => view)
     match: v => ...,               the views it owns (default: the view itself, and '<view>:<anything>')
     label: 'Achievements', icon: 'trophy',
     desc: 'one line, 60 characters at most',
     area: 'life',                  home | tasks | calendar | money | life | system
     tab: true,                     one of its area's level-1 tabs (Life's six)
     sections: [['game', 'Today'], ['game:wall', 'Achievements'], ...] or () => [...]
                                    its level-2 control; an entry may be {label, view} or {label, run}
     ownTabs: true,                 the page draws its own level-2 tabs (the shell's strip leaves them out)
     keepGroup: true,               listed under its area, but its section's group decides the tile
                                    (Profile: Life › You in All pages, Settings › Profile on screen)
     family: 'home',                pages that are tabs of one screen (Home's four, Settings' groups):
                                    moving between them is not a link, so no 'Back to'
     keywords: 'search words', since: '2.18', discover: true,   the new-page dot (pagesFresh)
     available: () => true,         false: not on this build (hidden everywhere: Garden before 2.18)
     off: () => null | {label, action: {label, run}},   switched off: one calm "Turn on"
     badge: () => '',               a count, or a short hint ('Lv 14', 'in 9d'); only what needs you
     order: 40,
   })
   pageById(id), pageFor(view), pageView(page), pageLabel(page), pageAvailable(page), pagesAll(o),
   pagesInArea(area, {tabs}), pageSectionsOf(page), areaGroup(area) / groupArea(group),
   pagesMarkSeen(view), pageIsFresh(page), pagesFresh(), pagesMarkAllSeen()
   Seen pages: state.seen.pages {pageId: 'YYYY-MM-DD'} (06-core-seen.js; synced per entry). */
const SHELL_AREAS = Object.freeze([['home', 'Home', 'house'], ['tasks', 'Tasks', 'list-todo'], ['calendar', 'Calendar', 'calendar-days'], ['money', 'Money', 'wallet'], ['life', 'Life', 'heart'], ['system', 'Settings and help', 'settings']]);
/** The Money area is the 'finance' tile and sidebar group (their ids are kept, so saved layouts stay). */
function areaGroup(area) { return area === 'money' ? 'finance' : String(area || 'system'); }
function groupArea(group) { return group === 'finance' ? 'money' : String(group || 'system'); }
const SHELL_PAGES = [];
const _pageForMemo = new Map();
function _areaIndex(a) { const i = SHELL_AREAS.findIndex(x => x[0] === a); return i < 0 ? SHELL_AREAS.length : i; }
function registerPage(def) {
  if (!def || !def.id) throw new Error('registerPage needs an id');
  const view = def.view || def.id;
  const p = Object.assign({ order: 50, icon: 'circle', area: 'system', label: def.id, desc: '', keywords: '' }, def, { view });
  if (typeof p.match !== 'function') {
    const v0 = typeof view === 'string' ? view : null;
    p.match = (v) => v0 !== null && (v === v0 || v.startsWith(v0 + ':'));
  }
  const i = SHELL_PAGES.findIndex(x => x.id === p.id);
  if (i >= 0) SHELL_PAGES[i] = p; else SHELL_PAGES.push(p);
  SHELL_PAGES.sort((a, b) => (_areaIndex(a.area) - _areaIndex(b.area)) || (a.order - b.order));
  _pageForMemo.clear();
  return p;
}
function pageById(id) { return SHELL_PAGES.find(p => p.id === id) || null; }
/** The page a view belongs to (available or not), or null. */
function pageFor(view) {
  const v = String(view || '');
  if (_pageForMemo.has(v)) return _pageForMemo.get(v);
  let hit = null;
  for (const p of SHELL_PAGES) { try { if (p.match(v)) { hit = p; break; } } catch (e) { /* a page's own rule */ } }
  if (_pageForMemo.size > 500) _pageForMemo.clear();
  _pageForMemo.set(v, hit);
  return hit;
}
function pageView(p) { if (!p) return ''; try { return String((typeof p.view === 'function' ? p.view() : p.view) || p.id); } catch (e) { return p.id; } }
function pageLabel(p) { if (!p) return ''; try { return String((typeof p.label === 'function' ? p.label() : p.label) || p.id); } catch (e) { return p.id; } }
function pageDesc(p) { if (!p) return ''; try { return String((typeof p.desc === 'function' ? p.desc() : p.desc) || ''); } catch (e) { return ''; } }
function pageAvailable(p) { if (!p) return false; if (typeof p.available !== 'function') return true; try { return p.available() !== false; } catch (e) { return false; } }
function pageOff(p) { if (!p || typeof p.off !== 'function') return null; try { return p.off() || null; } catch (e) { return null; } }
function pageBadge(p) { if (!p || typeof p.badge !== 'function') return ''; try { const b = p.badge(); return b === 0 || b == null ? '' : String(b); } catch (e) { return ''; } }
/** The available pages in area order (o.all: the unavailable ones too). */
function pagesAll(o) { return o && o.all ? SHELL_PAGES.slice() : SHELL_PAGES.filter(pageAvailable); }
/** An area's pages (o.tabs: only its level-1 tabs). */
function pagesInArea(area, o) { return pagesAll().filter(p => p.area === area && (!o || !o.tabs || p.tab)); }
/** A page's sections as [{view, label, run, icon}] (its level-2 control). */
function pageSectionsOf(p) {
  if (!p || !p.sections) return [];
  let list = p.sections;
  if (typeof list === 'function') { try { list = list() || []; } catch (e) { list = []; } }
  return (Array.isArray(list) ? list : []).map(s => (Array.isArray(s) ? { view: s[0], label: s[1], icon: s[2] } : s)).filter(s => s && s.label && (s.view || typeof s.run === 'function'));
}

/* ---------- new-page dots (NAVIGATION_PLAN.md 2.9) ----------
   A page has a dot until it is first opened, for a user who had OpenDash before the registry
   (seen.once 'pagesUpgrade:2.18', decided once and synced, so every device agrees) when it is
   newer than that (since) or was hard to find (discover). A brand-new user ('pagesFresh:2.18')
   gets dots only for pages newer than their start. */
const PAGES_BASE = '2.18';
function _pagesVer(v) { const m = /^(\d+)\.(\d+)/.exec(String(v || '')); return m ? Number(m[1]) * 1000 + Number(m[2]) : 0; }
/** 'upgrade' | 'fresh' | '' (not decided yet: the state file is still loading). */
function pagesBaseline() {
  if (typeof seenOnce !== 'function') return '';
  if (seenOnce('pagesUpgrade:' + PAGES_BASE)) return 'upgrade';
  if (seenOnce('pagesFresh:' + PAGES_BASE)) return 'fresh';
  if (typeof _uiSharedBooted !== 'undefined' && !_uiSharedBooted) return '';
  let had = false;
  try {
    const t = todayStr(), [y, m, d] = t.split('-').map(Number);
    const start = new Date(y, m - 1, d).getTime();   // clock-ok: the start of today, local
    const old = (ms) => typeof ms === 'number' && ms < start;
    had = !!(APP_CONFIG.onboardedAt && String(APP_CONFIG.onboardedAt).slice(0, 10) < t)
      || (typeof getAllItems === 'function' && getAllItems().some(i => i && (!i.createdAt || old(i.createdAt))))
      || Object.values(state.completionLog || {}).some(a => Array.isArray(a) && a.some(old));
  } catch (e) { had = false; }
  try {
    seenMarkOnce((had ? 'pagesUpgrade:' : 'pagesFresh:') + PAGES_BASE);
    // A brand-new user starts with Tags folded (UX_BLUEPRINT.md 2: show today, reveal the rest).
    if (!had) { state.collapsedSidebar = state.collapsedSidebar && typeof state.collapsedSidebar === 'object' ? state.collapsedSidebar : {}; if (state.collapsedSidebar.tags === undefined) { state.collapsedSidebar.tags = true; saveUI(); } }
  } catch (e) { /* the next render decides */ }
  return had ? 'upgrade' : 'fresh';
}
function pageIsFresh(p) {
  if (!p || !pageAvailable(p) || typeof seenGet !== 'function') return false;
  if (seenGet('pages', p.id)) return false;
  const base = pagesBaseline();
  if (!base) return false;
  const since = _pagesVer(p.since), b = _pagesVer(PAGES_BASE);
  return base === 'upgrade' ? (since >= b || !!p.discover) : since > b;
}
function pagesFresh() { return pagesAll().filter(pageIsFresh); }
/** Opening a page clears its dot (renderShell calls this for every view shown). */
function pagesMarkSeen(view) {
  const p = pageFor(view);
  if (!p || typeof seenGet !== 'function' || seenGet('pages', p.id)) return false;
  return seenSet('pages', p.id, todayStr());
}
function pagesMarkAllSeen() {
  const ids = pagesFresh().map(p => p.id);
  if (ids.length && typeof seenSetMany === 'function') seenSetMany('pages', ids, todayStr());
  return ids.length;
}

/* ---------- where you came from: '‹ Back to …' (NAVIGATION_PLAN.md 2.10) ----------
   The sidebar, the tiles, the tab strips, the crumbs, the palette, All pages and the G keys say
   navVia('chrome') before they move; any other setView (a link inside a page) is a link, and the
   page it opens offers the way back. Memory only, this tab only, the last 20 views. */
let _navViaNext = '';
const _navTrail = [];
let _navBack = null;   // {from, to}
function navVia(kind) { _navViaNext = kind || 'chrome'; }
/** setView tells us about every move (15-nav-sidebar.js). */
function navNoteMove(from, to) {
  const via = _navViaNext; _navViaNext = '';
  if (from && from !== to) { _navTrail.push(from); if (_navTrail.length > 20) _navTrail.shift(); }
  if (via || !from || from === to) { if (via) _navBack = null; return; }
  // A move inside one page (a tab, a section, or a page of the same family) keeps the way back to where you came from.
  const pf = pageFor(from), pt = pageFor(to);
  if (pf && pt && (pf === pt || (pf.family && pf.family === pt.family))) { if (_navBack && _navBack.to === from) _navBack = { from: _navBack.from, to }; return; }
  _navBack = { from, to };
}
/** {view, label} to go back to, or null. */
function navBackTarget() {
  if (!_navBack || _navBack.to !== state.view) return null;
  const v = _navBack.from;
  let label = '';
  const p = pageFor(v);
  const sec = typeof sectionFor === 'function' ? sectionFor(v) : null;
  try { label = sec ? String(sec.title(v) || '') : (typeof viewTitle === 'function' ? viewTitle(v) : ''); } catch (e) { label = ''; }
  if (!label && p) label = pageLabel(p);
  if (v === 'home') label = 'Home';
  return label ? { view: v, label } : null;
}
function _navBackPaint() {
  const head = document.getElementById('view-header');
  if (!head) return;
  let row = document.getElementById('view-back');
  const t = navBackTarget();
  if (!t) { if (row) row.remove(); return; }
  if (!row) {
    row = document.createElement('div'); row.id = 'view-back'; row.className = 'view-back-row';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn btn-ghost btn-sm';
    btn.onclick = () => { const x = navBackTarget(); _navBack = null; if (x) { navVia('chrome'); setView(x.view); } };
    row.appendChild(btn);
    head.insertBefore(row, head.firstChild);
  }
  const b = row.firstElementChild;
  const key = t.view + '|' + t.label;
  if (b.dataset.k === key) return;
  b.dataset.k = key;
  b.innerHTML = icon('chevron-left', 'i-sm') + `<span>Back to ${esc(t.label)}</span>`;
  b.setAttribute('aria-label', 'Back to ' + t.label);
}

/* ---------- sidebar blocks ---------- */
const SIDEBAR_BLOCKS = [];
// Blocks whose pages moved into Life (2.18): another module's Home rows for the garden ('fun-nav', which also
// held the Game row) and the pet ('pet-nav') are not drawn; the Life sidebar lists those pages (15-nav-life.js).
const SIDEBAR_RETIRED = new Set(['fun-nav', 'pet-nav']);
function registerSidebarBlock(groups, def) {
  if (!def || !def.id || typeof def.render !== 'function') throw new Error('registerSidebarBlock needs {id, render}');
  if (SIDEBAR_RETIRED.has(def.id)) return;
  const g = Array.isArray(groups) ? groups.slice() : [groups];
  const i = SIDEBAR_BLOCKS.findIndex(b => b.id === def.id);
  const b = Object.assign({ order: 50 }, def, { groups: g });
  if (i >= 0) SIDEBAR_BLOCKS[i] = b; else SIDEBAR_BLOCKS.push(b);
  SIDEBAR_BLOCKS.sort((a, b2) => a.order - b2.order);
}

/**
 * A sidebar row. o: {label, icon, dot (CSS colour), avatarHtml (trusted
 * markup from avatarHtml()), count, countAlert, badge, hint (a quiet word after the
 * label: 'Lv 14', 'in 9d'), view, active, onClick, title, className, disabled,
 * fresh (the new-page dot: true / false; left out, the page registry decides for o.view)}
 * At most three new-page dots show in the sidebar at once (UX_BLUEPRINT.md 3).
 */
let _sbFreshShown = 0;   // dots drawn in this sidebar render (renderSidebar resets it)
function sbNavItem(o) {
  const el = document.createElement('button');
  el.type = 'button';
  const active = o.active !== undefined ? o.active : (o.view && state.view === o.view);
  el.className = 'nav-item' + (active ? ' active' : '') + (o.className ? ' ' + o.className : '') + (o.disabled ? ' is-disabled' : '');
  if (o.view) el.dataset.view = o.view;   // the customised sidebar hides, orders and pins rows by view (15-nav-custom.js)
  if (active) el.setAttribute('aria-current', 'page');
  let lead = '';
  if (o.avatarHtml) lead = o.avatarHtml;
  else if (o.dot) lead = `<span class="ic"><span class="dot" style="--c:${escAttr(safeColor(o.dot))}"></span></span>`;
  else if (o.icon) lead = `<span class="ic">${icon(o.icon)}</span>`;
  const count = (o.count === 0 || o.count) && o.count !== '' ? `<span class="count${o.countAlert ? ' alert' : ''}">${esc(o.count)}</span>` : '';
  const badge = o.badge ? `<span class="badge badge-danger">${esc(o.badge)}</span>` : '';
  const hint = o.hint ? `<span class="count nav-hint">${esc(o.hint)}</span>` : '';
  let fresh = o.fresh;
  if (fresh === undefined && o.view && !active) { const p = pageFor(o.view); fresh = !!(p && pageView(p) === o.view && pageIsFresh(p)); }
  fresh = !!fresh && _sbFreshShown < 3;
  if (fresh) _sbFreshShown++;
  el.innerHTML = `${lead}<span class="label">${esc(o.label)}</span>${fresh ? '<span class="nav-new" role="img" aria-label="new"></span>' : ''}${badge}${hint}${count}`;
  if (o.title) el.title = o.title;
  // Icon rail (the sidebar dragged narrow, 13-splitter.js): the label shows as a tooltip.
  else if (state.paneSizes && state.paneSizes.sidebarRail) el.setAttribute('data-tip', String(o.label || ''));
  if (o.disabled) el.setAttribute('aria-disabled', 'true');
  el.onclick = (e) => {
    if (o.disabled) return;
    // Re-selecting the view you are on is a no-op (CLAUDE.md "Interaction conventions").
    if (!o.onClick && o.view && state.view === o.view) { const m = document.getElementById('main'); if (m && m.scrollTop > 0) m.scrollTo({ top: 0, behavior: (window.Motion && Motion.prefersReduced()) ? 'auto' : 'smooth' }); _shellCloseDrawer(); return; }
    navVia('chrome');
    if (o.onClick) o.onClick(e);
    else if (o.view) setView(o.view);
    _navViaNext = '';
    _shellCloseDrawer();
  };
  return el;
}
/**
 * A sidebar section heading. o: {title, actions:[{icon,label,run,className}],
 * collapsible: key} - collapsible headings fold their block (remembered in
 * state.collapsedSidebar, a UI key).
 */
function sbSection(o) {
  const h = document.createElement('div');
  h.className = 'nav-sec' + (o.collapsible ? ' collapsible' : '');
  const t = document.createElement('span'); t.className = 't'; t.textContent = o.title || '';
  h.appendChild(t);
  if (o.collapsible) {
    t.setAttribute('role', 'button'); t.tabIndex = 0;
    const toggle = () => {
      state.collapsedSidebar = state.collapsedSidebar && typeof state.collapsedSidebar === 'object' ? state.collapsedSidebar : {};
      state.collapsedSidebar[o.collapsible] = !state.collapsedSidebar[o.collapsible];
      saveUI(); renderSidebar();
    };
    t.onclick = toggle;
    t.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
  }
  if (o.actions && o.actions.length) {
    const act = document.createElement('span'); act.className = 'act';
    for (const a of o.actions) {
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'btn-icon btn-sm' + (a.className ? ' ' + a.className : '');
      b.innerHTML = icon(a.icon || 'plus');
      b.setAttribute('aria-label', a.label || '');
      if (a.label) b.setAttribute('data-tip', a.label);
      b.onclick = (e) => { e.stopPropagation(); a.run && a.run(e, b); };
      act.appendChild(b);
    }
    h.appendChild(act);
  }
  return h;
}
function sbIsCollapsed(key) {
  return !!(state.collapsedSidebar && typeof state.collapsedSidebar === 'object' && state.collapsedSidebar[key]);
}

/* ---------- top-bar widgets ---------- */
const TOPBAR_WIDGETS = [];
function registerTopbarWidget(def) {
  if (!def || !def.id || typeof def.render !== 'function') throw new Error('registerTopbarWidget needs {id, render}');
  const i = TOPBAR_WIDGETS.findIndex(w => w.id === def.id);
  const w = Object.assign({ order: 50 }, def);
  if (i >= 0) TOPBAR_WIDGETS[i] = w; else TOPBAR_WIDGETS.push(w);
  TOPBAR_WIDGETS.sort((a, b) => a.order - b.order);
}

/* ---------- More menu / workspace menu ---------- */
const MORE_ITEMS = [];
function registerMoreItem(def) {
  if (!def || !def.id) throw new Error('registerMoreItem needs an id');
  const i = MORE_ITEMS.findIndex(m => m.id === def.id);
  const m = Object.assign({ order: 50, where: ['more'] }, def);
  if (!Array.isArray(m.where)) m.where = [m.where];
  if (i >= 0) MORE_ITEMS[i] = m; else MORE_ITEMS.push(m);
  MORE_ITEMS.sort((a, b) => a.order - b.order);
}
/** Menu rows for 'more' or 'workspace', with a separator between order bands of 100. */
function shellMenuItems(where) {
  const out = []; let band = null;
  for (const m of MORE_ITEMS) {
    if (!m.where.includes(where)) continue;
    if (m.hidden && (typeof m.hidden === 'function' ? m.hidden() : m.hidden)) continue;
    const b = Math.floor(m.order / 100);
    if (band !== null && b !== band) out.push('sep');
    band = b;
    out.push(m);
  }
  return out;
}

/* ---------- event bus ---------- */
const _shellListeners = new Map();
function onShell(ev, fn) {
  if (!_shellListeners.has(ev)) _shellListeners.set(ev, new Set());
  _shellListeners.get(ev).add(fn);
  return () => _shellListeners.get(ev).delete(fn);
}
function emitShell(ev, payload) {
  const set = _shellListeners.get(ev);
  if (!set || !set.size) return false;
  for (const fn of [...set]) { try { fn(payload); } catch (e) { console.error('[shell] ' + ev, e); } }
  return true;
}

/* ---------- drawer (narrow screens) ---------- */
function _shellCloseDrawer() { const a = document.getElementById('app'); if (a) a.classList.remove('drawer-open'); }
function _shellToggleSidebar() {
  const app = document.getElementById('app');
  if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) { app.classList.toggle('drawer-open'); return; }
  state.sidebarCollapsed = !state.sidebarCollapsed;
  if (!state.sidebarCollapsed && state.focus) state.focus = false;
  saveUI(); renderShell();
}

/* ---------- new task ---------- */
/**
 * New task. Centre-card mode (the default): the card in create mode (61-task-card.js).
 * o.quick (the Q key): the list's inline quick-add box when there is one, for fast capture.
 * Side-panel mode: the inline box, else the quick-add dialog (as before).
 */
function openNewTask(prefill, o) {
  o = o || {};
  const qa = document.getElementById('quick-add');
  const inline = qa && qa.offsetParent !== null && !prefill;
  const card = typeof tcOpenCreate === 'function' && typeof itemOpenTarget === 'function' && itemOpenTarget() === 'card';
  if (inline && (o.quick || !card)) { qa.focus(); qa.scrollIntoView({ block: 'nearest' }); return; }
  if (card) return tcOpenCreate(prefill || '', { from: o.from || null });
  if (typeof openQuickAddDialog === 'function') return openQuickAddDialog(prefill);   // 23-quick-add-dialog.js
  let go = null;
  openDialog({
    title: 'New task', width: 560,
    body: (el, close) => {
      const wrap = document.createElement('div'); wrap.className = 'vstack';
      const box = document.createElement('label'); box.className = 'input';
      box.innerHTML = icon('plus');
      const inp = document.createElement('input');
      inp.placeholder = 'e.g. "email Sam tomorrow #email !p2"';
      inp.value = prefill || '';
      inp.setAttribute('autofocus', '');
      box.appendChild(inp);
      const hint = document.createElement('div'); hint.className = 'field-hint';
      hint.textContent = 'Dates: today, tomorrow, fri, next mon, in 2 weeks. Priority: !p1 to !p3. Tags: #tag.';
      wrap.append(box, hint);
      el.appendChild(wrap);
      go = () => {
        const parsed = parseQuickAdd(inp.value);
        if (!parsed.title) { box.classList.add('is-invalid'); inp.focus(); return false; }
        addParsedTask(parsed, quickAddDefaults(state.view));
        toast('Task added', { kind: 'ok' });
        return true;
      };
      inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (go()) close(); } };
    },
    actions: [
      { label: 'Cancel' },
      { label: 'Add task', primary: true, run: () => (go ? go() : true) },
    ],
  });
}

/* ---------- rendering ---------- */
function _shellCrumbs() {
  const v = state.view || 'home';
  const group = shellGroupFor(v);
  const sec = typeof sectionFor === 'function' ? sectionFor(v) : null;
  if (sec && typeof sec.crumb === 'function') {
    try {
      const c = sec.crumb(v);
      if (Array.isArray(c)) {
        // The page always shows after its area (Life › Friends, not just Life), and a page's own tab says which
        // page it is in (Life › Garden › Shop): sections written before the registry get this for free.
        let parts = c.slice();
        const pg = pageFor(v);
        if (pg && group !== 'home' && group !== 'system' && pageLabel(pg) !== (_SHELL_GROUP_LABEL[group] || '')) {
          const f = parts[0], fl = f && typeof f === 'object' ? f.label : f;
          if (!parts.length) parts = [pageLabel(pg)];
          else if (fl !== pageLabel(pg) && v !== pageView(pg)) parts.unshift({ label: pageLabel(pg), view: pageView(pg) });
        }
        return { group, parts };
      }
    } catch (e) { /* fall through */ }
  }
  const title = sec ? String(sec.title(v) || '') : (typeof viewTitle === 'function' ? viewTitle(v) : v);
  if (group === 'home') return { group, parts: [] };
  if (group === 'finance') {
    const FV = window.FinanceView;
    let sub = '';
    try { if (FV && typeof FV.sectionLabel === 'function') sub = FV.sectionLabel() || ''; } catch (e) {}
    return { group, parts: sub ? [sub] : [] };
  }
  if (group === 'system') return { group, parts: [title] };
  // A page's section (Achievements › Records, Places › Trips): the page, then the section.
  const pg = pageFor(v), secs = pg ? pageSectionsOf(pg) : [];
  const here = secs.find(s => s.view === v);
  if (pg && here && pageView(pg) !== v) return { group, parts: [{ label: pageLabel(pg), view: pageView(pg) }, here.label] };
  return { group, parts: title && title !== _SHELL_GROUP_LABEL[group] ? [title] : [] };
}
const _SHELL_IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
const _GROUP_ICON = { home: 'house', tasks: 'list-todo', calendar: 'calendar-days', finance: 'wallet', life: 'heart', system: 'settings' };

/** A crumb part: a string, or {label, view} / {label, run} (clickable unless it is the last). */
function _crumbPart(p) { return p && typeof p === 'object' ? { label: String(p.label || ''), view: p.view || '', run: typeof p.run === 'function' ? p.run : null } : { label: String(p == null ? '' : p), view: '', run: null }; }
function renderCrumb() {
  const el = document.getElementById('crumb');
  if (!el) return;
  const c = _shellCrumbs(), group = c.group;
  const parts = c.parts.map(_crumbPart).filter(p => p.label);
  const glabel = _SHELL_GROUP_LABEL[group] || '';
  let html = icon(_GROUP_ICON[group] || 'circle');
  if (glabel) {
    html += parts.length ? `<button type="button" data-crumb-group="${escAttr(group)}">${esc(glabel)}</button>` : `<b>${esc(glabel)}</b>`;
  }
  parts.forEach((p, i) => {
    if (glabel || i > 0) html += icon('chevron-right', 'i-xs sep');
    if (i === parts.length - 1) html += `<b>${esc(p.label)}</b>`;
    else if ((p.view && p.view !== state.view) || p.run) html += `<button type="button" data-crumb-i="${i}">${esc(p.label)}</button>`;
    else html += `<span>${esc(p.label)}</span>`;
  });
  if (el.dataset.html === html) return;   // nothing changed: keep the buttons (and focus) as they are
  el.dataset.html = html;
  el.innerHTML = html;
  const gb = el.querySelector('[data-crumb-group]');
  if (gb) gb.onclick = () => { const t = SHELL_TILES.find(x => x.id === group); if (t) { navVia('chrome'); setView(typeof t.view === 'function' ? t.view() : t.view); } };
  for (const b of el.querySelectorAll('[data-crumb-i]')) {
    const p = parts[Number(b.dataset.crumbI)];
    b.onclick = () => { if (!p) return; navVia('chrome'); if (p.run) { p.run(); _navViaNext = ''; } else setView(p.view); };
  }
}

function renderSwitcher() {
  const sw = document.getElementById('section-switcher');
  if (!sw) return;
  const group = shellGroupFor(state.view);
  const tiles = SHELL_TILES.filter(_tileEnabled);
  sw.style.setProperty('--tiles', String(Math.max(1, tiles.length)));
  const key = tiles.map(t => t.id).join(',');
  if (sw.dataset.key !== key) {
    sw.innerHTML = '';
    for (const t of tiles) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw-tile'; b.dataset.tile = t.id;
      b.setAttribute('role', 'tab');
      b.innerHTML = icon(t.icon) + `<span>${esc(t.label)}</span><span class="sw-badge" hidden></span><span class="sw-new" hidden></span>`;
      b.onclick = () => {
        const v = typeof t.view === 'function' ? t.view() : t.view;
        // Re-selecting the view you are on is a no-op, at most a smooth scroll back to the top (CLAUDE.md).
        if (state.view === v) { const m = document.getElementById('main'); if (m && m.scrollTop > 0) m.scrollTo({ top: 0, behavior: (window.Motion && Motion.prefersReduced()) ? 'auto' : 'smooth' }); _shellCloseDrawer(); return; }
        navVia('chrome');
        setView(v);
        _shellCloseDrawer();
      };
      sw.appendChild(b);
    }
    sw.dataset.key = key;
  }
  // A quiet dot on a tile while one of its pages is new (the Life tile above all), unless it shows a number.
  const freshAreas = new Set(pagesFresh().map(p => areaGroup(p.area)));
  for (const b of sw.querySelectorAll('.sw-tile')) {
    const on = b.dataset.tile === group;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    const t = SHELL_TILES.find(x => x.id === b.dataset.tile);
    const badge = b.querySelector('.sw-badge');
    let n = null;
    try { n = t && typeof t.badge === 'function' ? t.badge() : null; } catch (e) { n = null; }
    badge.hidden = !(n || n === 0) || n === 0;
    if (!badge.hidden) badge.textContent = String(n);
    const dot = b.querySelector('.sw-new');
    const fresh = !on && badge.hidden && freshAreas.has(b.dataset.tile);
    if (dot) dot.hidden = !fresh;
    b.setAttribute('aria-label', t ? t.label + (!badge.hidden ? `, ${n} waiting` : '') + (fresh ? ', new pages' : '') : '');
  }
}

function renderSidebarFooter() {
  const f = document.getElementById('sb-foot');
  if (!f) return;
  const binCount = (state.bin && (state.bin.tasks.length + state.bin.notes.length)) || 0;
  f.innerHTML = `
    <button type="button" class="btn${state.view === 'bin' ? ' on' : ''}" data-act="bin">${icon('trash-2')}<span>Bin</span>${binCount ? `<span class="count">${binCount}</span>` : ''}</button>
    <button type="button" class="btn${state.view === 'settings' ? ' on' : ''}" data-act="settings">${icon('settings')}<span>Settings</span></button>
    <button type="button" class="btn sb-ask" data-act="assistant" data-requires="claude" aria-label="Ask the assistant" data-tip="Ask the assistant" data-kbd="Ctrl+J">${icon('sparkles')}<span>Ask</span></button>
    <button type="button" class="btn-icon" data-act="keys" aria-label="Keyboard shortcuts" data-tip="Keyboard shortcuts" data-kbd="?">${icon('keyboard')}</button>`;
  f.querySelector('[data-act="bin"]').onclick = () => { setView('bin'); _shellCloseDrawer(); };
  f.querySelector('[data-act="settings"]').onclick = () => { setView('settings'); _shellCloseDrawer(); };
  f.querySelector('[data-act="assistant"]').onclick = () => { if (typeof toggleAssistant === 'function') toggleAssistant(); _shellCloseDrawer(); };   // 72-assistant.js
  if (typeof renderSidebarFooterAssistant === 'function') renderSidebarFooterAssistant();
  f.querySelector('[data-act="keys"]').onclick = () => showKbHelp();
}

/** Save status in the top bar (also called by updateSyncIndicator after each write). */
function renderSaveStatus() {
  const btn = document.getElementById('folder-btn');
  if (!btn) return;
  const lbl = btn.querySelector('.sync-lbl');
  let kind, text, tip;
  const err = String(_serverLastError || '');
  // Calm words for the cases where nothing is lost: the server is away, or saving is
  // paused on purpose. Only a real failure is red, and a click on it tries again (90-wiring.js).
  const offline = _serverAvailable && ((typeof srvIsOffline === 'function' && srvIsOffline()) || (window.DashboardNet && DashboardNet.down) || /isn.t running|not running/i.test(err));
  if (!_serverAvailable) {
    kind = 'local'; text = 'Local only';
    tip = 'Saved in this browser only. Start OpenDash with start-opendash to save to your data folder.';
  } else if (offline) {
    kind = 'offline'; text = 'Offline · changes kept';
    tip = 'The OpenDash server isn’t running. Your changes are kept in this browser and saved as soon as it is back. Click to check again.';
  } else if (/paused/i.test(err)) {
    kind = 'paused'; text = 'Paused · changes kept';
    tip = err.charAt(0).toUpperCase() + err.slice(1) + '. Your changes are kept in this browser and saved when it resumes.';
  } else if (err) {
    kind = 'err'; text = 'Not saved · retry';
    tip = 'Saving to the data folder failed: ' + err + '. Your work is still in this browser. Click to try again.';
  } else if (state._localDirty || _persistInFlight || _persistTimer) {
    kind = 'busy'; text = 'Saving…';
    tip = 'Saving to the data folder';
  } else {
    kind = 'ok'; text = 'Saved';
    tip = 'Saved to the data folder' + (state._lastSave ? ' · ' + formatTimestamp(state._lastSave) : '');
  }
  btn.classList.remove('ok', 'err', 'busy', 'local', 'offline', 'paused');
  btn.classList.add(kind);
  if (lbl && lbl.textContent !== text) lbl.textContent = text;
  btn.title = tip;
  btn.setAttribute('aria-label', text + '. ' + tip);
}

function renderTopbarWidgets() {
  const host = document.getElementById('tb-widgets');
  if (!host) return;
  for (const w of TOPBAR_WIDGETS) {
    let el = document.getElementById('tbw-' + w.id);
    if (!el) { el = document.createElement('div'); el.id = 'tbw-' + w.id; el.className = 'tb-widget'; host.appendChild(el); }
    try { const r = w.render(el); el.hidden = r === false; } catch (e) { console.error('[topbar widget ' + w.id + ']', e); el.hidden = true; }
  }
  _fitTopbarWidgets();
}
// Hide whole widgets (from the end) that would be clipped, instead of cutting one in half.
function _fitTopbarWidgets() {
  const host = document.getElementById('tb-widgets');
  if (!host) return;
  const items = [...host.querySelectorAll('.cdw')];
  items.forEach(n => { n.style.display = ''; });
  // Hide from the end of the strip (least important first).
  for (let i = items.length - 1; i >= 0 && host.scrollWidth > host.clientWidth + 1; i--) items[i].style.display = 'none';
}
window.addEventListener('resize', () => { if (typeof state !== 'undefined') _fitTopbarWidgets(); });

/* ---------- the area's tabs (level 1) and the page's sections (level 2) ----------
   UX_BLUEPRINT.md 3: never more than two levels. Level 1 is drawn for the Life area (its six pages:
   it keeps Life navigable with the sidebar folded, in Focus mode and on phones); level 2 for a
   page that lists sections and does not draw its own tabs (Achievements, Places). Both live in the
   page header (#view-tabs), so they stay put while the page below changes, and repaint only when
   something on them changes. Re-selecting the current tab or section only scrolls back to the top. */
const _AREA_STRIP = new Set(['life']);
function areaTabsModel(view) {
  const v = String(view || '');
  const pg = pageFor(v);
  const area = pg ? pg.area : groupArea(shellGroupFor(v));
  const tabs = _AREA_STRIP.has(area) && pg && pg.tab ? pagesInArea(area, { tabs: true }) : [];
  const secs = pg && !pg.ownTabs ? pageSectionsOf(pg) : [];
  let cur = secs.find(s => s.view === v) || secs.find(s => typeof s.match === 'function' && (() => { try { return s.match(v); } catch (e) { return false; } })());
  if (!cur && secs.length && pageView(pg) === v) cur = secs[0];
  let dots = 0;   // at most three new-page dots at once, here as in the sidebar (UX_BLUEPRINT.md 3)
  return {
    area,
    tabs: tabs.length >= 2 ? tabs.map(p => ({ p, id: p.id, label: pageLabel(p), icon: p.icon, view: pageView(p), on: p === pg, badge: pageBadge(p), fresh: p !== pg && dots < 3 && pageIsFresh(p) && ++dots > 0, off: !!pageOff(p) })) : [],
    secs: secs.length >= 2 ? secs.map(s => ({ s, label: s.label, view: s.view || '', icon: s.icon || '', on: s === cur })) : [],
  };
}
function areaTabsEl(view) {
  const m = areaTabsModel(view);
  if (!m.tabs.length && !m.secs.length) return null;
  const wrap = document.createElement('div'); wrap.className = 'area-strips';
  const roving = (bar, sel) => bar.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const all = [...bar.querySelectorAll(sel)];
    const i = all.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length;
    all[j].focus();
  });
  const toTop = () => { const mm = document.getElementById('main'); if (mm && mm.scrollTop > 0) mm.scrollTo({ top: 0, behavior: (window.Motion && Motion.prefersReduced()) ? 'auto' : 'smooth' }); };
  if (m.tabs.length) {
    const bar = document.createElement('div'); bar.className = 'area-tabs'; bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', (SHELL_AREAS.find(a => a[0] === m.area) || [0, 'Pages'])[1]);
    for (const t of m.tabs) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'area-tab' + (t.on ? ' on' : '') + (t.off ? ' is-off' : '');
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', t.on ? 'true' : 'false'); b.tabIndex = t.on ? 0 : -1;
      b.dataset.view = t.view; b.dataset.page = t.id;
      b.innerHTML = icon(t.icon, 'i-sm') + `<span>${esc(t.label)}</span>`
        + (t.badge ? `<span class="area-tab-n">${esc(t.badge)}</span>` : '')
        + (t.fresh ? '<span class="nav-new" role="img" aria-label="new"></span>' : '');
      b.onclick = () => { if (t.on && pageFor(state.view) === t.p) { toTop(); return; } navVia('chrome'); setView(t.view); };
      bar.appendChild(b);
    }
    roving(bar, '.area-tab');
    wrap.appendChild(bar);
  }
  if (m.secs.length) {
    const bar = document.createElement('div'); bar.className = 'area-secs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Sections');
    for (const s of m.secs) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'area-sec' + (s.on ? ' on' : '');
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', s.on ? 'true' : 'false'); b.tabIndex = s.on ? 0 : -1;
      if (s.view) b.dataset.view = s.view;
      b.innerHTML = (s.icon ? icon(s.icon, 'i-xs') : '') + `<span>${esc(s.label)}</span>`;
      b.onclick = () => { if (s.on) { toTop(); return; } navVia('chrome'); if (typeof s.s.run === 'function') { s.s.run(); _navViaNext = ''; } else setView(s.view); };
      bar.appendChild(b);
    }
    roving(bar, '.area-sec');
    wrap.appendChild(bar);
  }
  wrap.dataset.k = JSON.stringify([m.tabs.map(t => [t.id, t.label, t.on, t.badge, t.fresh, t.off]), m.secs.map(s => [s.label, s.view, s.on])]);
  return wrap;
}
function _areaTabsPaint() {
  const head = document.getElementById('view-header');
  if (!head) return;
  const host = document.getElementById('view-tabs');
  const el = areaTabsEl(state.view);
  if (!el) { if (host) host.remove(); return; }
  if (host && host.dataset.k === el.dataset.k) return;   // nothing changed: no repaint, focus stays
  const had = host && host.contains(document.activeElement) ? [...host.querySelectorAll('button')].indexOf(document.activeElement) : -1;
  el.id = 'view-tabs';
  if (host) host.replaceWith(el); else head.appendChild(el);
  if (had >= 0) { const b = el.querySelectorAll('button')[had]; if (b) b.focus({ preventScroll: true }); }
}

function renderPageHeaderControls() {
  const sec = typeof sectionFor === 'function' ? sectionFor(state.view) : null;
  const main = document.getElementById('main');
  if (main) {
    const layout = sec && sec.layout ? sec.layout : (state.view === 'finance' ? 'wide' : 'page');
    main.classList.toggle('wide', layout === 'wide');
    main.classList.toggle('bare', layout === 'bare');
  }
  const sel = document.getElementById('display-btn');
  if (sel) sel.hidden = ['review', 'calendar', 'timeline', 'matrix'].includes(state.viewMode);
  try { _navBackPaint(); } catch (e) { console.error('[shell] back', e); }
  try { _areaTabsPaint(); } catch (e) { console.error('[shell] area tabs', e); }
  if (typeof _lifeOffPaint === 'function') { try { _lifeOffPaint(); } catch (e) { console.error('[shell] off note', e); } }   // 15-nav-life.js
}

/** The OpenDash logo as an image URL: the SVG favicon build.mjs inlines ('' without one). */
function brandLogoSrc() {
  if (typeof _appIconOrigHref !== 'undefined' && _appIconOrigHref && _appIconOrigHref.svg) return _appIconOrigHref.svg;
  const l = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
  return (l && l.getAttribute('href')) || '';
}
/**
 * A brand mark (sidebar, welcome). The icon the user picked (config.appIcon,
 * 17-app-icon.js) wins; automatic: nearby location artwork, then the user's
 * initial or the OpenDash logo. `pref` overrides the saved choice (the picker's preview).
 */
function setBrandMark(el, name, pref) {
  if (!el) return;
  const n = String(name || '').trim();
  const choice = pref !== undefined ? String(pref || '') : String((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.appIcon) || '');
  const kind = typeof appIconKind === 'function' ? appIconKind(choice) : '';
  const local = !kind && typeof animProfileScene === 'function' ? animProfileScene() : null;
  el.classList.toggle('has-local-scene', !!local);
  if (local) {
    const live = !local.full && animEnabled();
    const key = 'nearby:' + local.ref + ':' + _agLevel() + ':' + animTimeOfDay() + ':' + live;
    if (el.dataset.mark === key) return;
    el.dataset.mark = key;
    el.classList.toggle('has-logo', false); el.classList.toggle('has-sym', false);
    el.title = local.site || local.label;
    // Compact motifs move; rich full scenes stay still to keep the shell inexpensive.
    el.innerHTML = animItemHtml(local, { size: local.full ? 'sm' : 'fill', live, reduced: !live, tod: animTimeOfDay() });
    return;
  }
  el.removeAttribute('title');
  if (kind === 'icon' || kind === 'emoji') {
    const key = kind + ':' + choice;
    if (el.dataset.mark === key) return;
    el.dataset.mark = key;
    el.classList.toggle('has-logo', false);
    el.classList.toggle('has-sym', true);
    if (kind === 'icon') el.innerHTML = icon(choice);
    else { const sp = document.createElement('span'); sp.className = 'brand-emoji'; sp.textContent = choice; el.replaceChildren(sp); }
    return;
  }
  el.classList.toggle('has-sym', false);
  const src = (kind === 'logo' || (!n && kind !== 'initial')) ? brandLogoSrc() : '';
  const key = src ? 'logo' : (n || 'O').slice(0, 1).toUpperCase();
  if (el.dataset.mark === key) return;
  el.dataset.mark = key;
  el.classList.toggle('has-logo', !!src);
  if (!src) { el.textContent = key; return; }
  const img = document.createElement('img'); img.className = 'brand-logo'; img.alt = ''; img.src = src;
  el.replaceChildren(img);
}

/* ---------- the light/dark switch ---------- */
const _SHELL_TT_SVG = '<svg class="i tt-morph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs><mask id="tt-mask">'
  + '<rect width="24" height="24" fill="#fff"/><circle class="tt-bite" cx="12" cy="12" r="6.5" fill="#000"/></mask></defs>'
  + '<g class="tt-rays">' + [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); return `<path d="M${(12 + 7.5 * c).toFixed(2)} ${(12 + 7.5 * s).toFixed(2)}L${(12 + 10 * c).toFixed(2)} ${(12 + 10 * s).toFixed(2)}"/>`; }).join('') + '</g>'
  + '<circle class="tt-core" cx="12" cy="12" r="4.5" mask="url(#tt-mask)"/>'
  + '<g class="tt-stars"><path d="M19 4.5v3M17.5 6h3"/><path d="M21 12.5v2M20 13.5h2"/><path d="M4 4.5v2M3 5.5h2"/></g></svg>';
let _shellThemeSwapVariant = null;   // a one-off variant ref (the gallery's "Try it")
let _shellThemeTo = null;            // the theme a running swap is about to apply
/** Options for Motion.themeSwap: where the toggle is, and today's variant from the animation library. */
function _shellThemeSwapOpts(theme) {
  const tt = document.getElementById('theme-toggle');
  const r = tt && tt.getBoundingClientRect();
  const origin = r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  let it = _shellThemeSwapVariant && typeof animItem === 'function' ? animItem(_shellThemeSwapVariant) : null;
  if (!it && typeof animToday === 'function') { try { it = animToday('theme-switch'); } catch (e) { it = null; } }
  return { origin, dark: theme === 'dark', kind: it && it.vt ? it.vt.kind : 'fade', ms: it && it.vt ? it.vt.ms : 320 };   // every variant blocked: the plain crossfade
}

/** Repaint the chrome. render() calls this before the sidebar and main. */
function renderShell() {
  const html = document.documentElement;
  const theme = state.theme === 'dark' ? 'dark' : 'light';
  const was = html.getAttribute('data-theme');
  // A theme change plays the day's light/dark transition once (src/motion.js themeSwap: a circular
  // reveal from the toggle, a dusk wipe or a crossfade; the animation library's 'theme-switch' slot).
  // The swap applies asynchronously (inside the View Transition), so a second render before it lands
  // must not start another one (that would cancel the first); apply reads the theme wanted by then.
  if (was && was !== theme && window.Motion && Motion.themeSwap) {
    if (_shellThemeTo !== theme) {
      _shellThemeTo = theme;
      Motion.themeSwap(() => { _shellThemeTo = null; html.setAttribute('data-theme', state.theme === 'dark' ? 'dark' : 'light'); }, _shellThemeSwapOpts(theme));
    }
  } else if (!_shellThemeTo) html.setAttribute('data-theme', theme);
  _shellThemeSwapVariant = null;
  if (typeof animThemeApply === 'function') animThemeApply();
  html.setAttribute('data-density', state.density === 'compact' ? 'compact' : 'normal');
  const app = document.getElementById('app');
  if (app) {
    app.classList.toggle('sidebar-collapsed', !!state.sidebarCollapsed);
    app.classList.toggle('focus', !!state.focus);
  }
  const group = shellGroupFor(state.view);
  if (group !== 'system') _shellLastGroup = group;
  if (group === 'tasks' && typeof isTaskView === 'function' && isTaskView(state.view)) _shellLastTaskView = state.view;
  if (group === 'life' && typeof lifeRemember === 'function') lifeRemember(state.view);   // the Life tile goes back here (15-nav-life.js)
  try { pagesMarkSeen(state.view); } catch (e) { /* the dot clears next time */ }
  const tt = document.getElementById('theme-toggle');
  if (tt) {
    const dark = state.theme === 'dark';
    // The icon shows the current mode and morphs: sun -> moon with stars going dark, back going light.
    if (!tt.querySelector('.tt-morph')) tt.innerHTML = _SHELL_TT_SVG;
    tt.classList.toggle('is-dark', dark);
    tt.setAttribute('data-tip', dark ? 'Light mode' : 'Dark mode');
    tt.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  // The corner is you (97-profile-3corner.js): your avatar and display name once you have a profile, with your status
  // and a friends badge. Until then the workspace button shows just the name (as in the approved mockups) and the
  // workspace icon. The window title keeps appTitle(); the favicon keeps the app icon (applyAppIconFavicon).
  let you = false;
  if (typeof profileCornerPaint === 'function') { try { you = profileCornerPaint(); } catch (e) { console.error('[corner]', e); } }
  if (!you) {
    const name = userName() || 'OpenDash';
    const bn = document.getElementById('brand-name'); if (bn && bn.textContent !== name) bn.textContent = name;
    setBrandMark(document.getElementById('brand-mark'), userName());
  }
  if (_SHELL_IS_MAC) { const k = document.querySelector('#palette-btn .kbd'); if (k && k.textContent !== '⌘') k.textContent = '⌘'; }
  if (typeof applyAppIconFavicon === 'function') applyAppIconFavicon();
  renderSwitcher();
  renderCrumb();
  renderSidebarFooter();
  renderSaveStatus();
  renderPageHeaderControls();
}

/* ---------- default More / workspace items ---------- */
registerMoreItem({ id: 'new-task', label: 'New task', icon: 'plus', order: 10, kbd: 'Q', run: () => openNewTask() });
registerMoreItem({ id: 'bulk-add', label: 'Bulk add tasks…', icon: 'clipboard-list', order: 20, run: () => openBulkImport() });
registerMoreItem({ id: 'templates', label: 'Templates…', icon: 'layout-template', order: 30, run: () => openTemplatesModal() });
registerMoreItem({ id: 'density', label: 'Compact rows', icon: 'list', order: 110, checked: () => state.density === 'compact',
  run: () => { state.density = state.density === 'compact' ? 'normal' : 'compact'; saveUI(); render(); } });
registerMoreItem({ id: 'focus', label: 'Focus mode', icon: 'focus', order: 120, kbd: 'Ctrl+Shift+F', checked: () => !!state.focus,
  run: () => { state.focus = !state.focus; saveUI(); render(); } });
registerMoreItem({ id: 'reduce-motion', label: 'Reduce motion', icon: 'sparkle', order: 130,
  checked: () => !!(window.Motion && Motion.prefersReduced()),
  disabled: () => (window.Motion && Motion.systemReduced ? Motion.systemReduced() : !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)),
  title: 'Turn interface animations down to the minimum (saved on this device)',
  run: () => { if (window.Motion) Motion.setReduced(!Motion.prefersReduced()); } });
registerMoreItem({ id: 'briefing', label: 'Morning briefing', icon: 'sunrise', order: 210, hidden: () => !HAS_COWORK, run: () => runMorningBriefing() });
registerMoreItem({ id: 'backup', label: 'Back up now', icon: 'download', order: 310, where: ['more', 'workspace'],
  hint: () => lastBackupLabel(), run: () => downloadBackup(false) });
registerMoreItem({ id: 'restore', label: 'Restore from backup…', icon: 'upload', order: 320, where: ['more', 'workspace'],
  run: () => document.getElementById('import-file').click() });
registerMoreItem({ id: 'export', label: 'Export to Markdown', icon: 'file-down', order: 330, where: ['more', 'workspace'], kbd: 'Ctrl+E', run: () => exportMarkdown() });
registerMoreItem({ id: 'print', label: 'Print this view', icon: 'printer', order: 340, where: ['more', 'workspace'], run: () => printDashboard() });
registerMoreItem({ id: 'settings', label: 'Settings', icon: 'settings', order: 410, where: ['more', 'workspace'], run: () => setView('settings') });
registerMoreItem({ id: 'connections', label: 'Connections', icon: 'plug', order: 420, where: ['more', 'workspace'], run: () => setView('connections') });
registerMoreItem({ id: 'shortcuts', label: 'Keyboard shortcuts', icon: 'keyboard', order: 430, where: ['more', 'workspace'], kbd: '?', run: () => showKbHelp() });
