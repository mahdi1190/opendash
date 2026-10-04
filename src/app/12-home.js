/* ============================================================
   HOME (default landing page) - #view=home. Owner: Home foundation.
   A grid of widgets that the user arranges like phone home-screen widgets
   (Customise: drag, resize, hide, add, reset; keyboard; or the assistant
   through home.set_layout). Each widget lives in its own file:

     12-home.js          core: data rules (Focus, waiting), the widget registry,
                         the layout model, mount, ctx, shared task actions
     12-home-grid.js     the grid: masonry rows, FLIP, entrance helpers
     12-home-edit.js     edit mode (Customise), live announcements
     12-home-drag.js     makeSortable (pointer drag; the top bar uses it too)
     12-home-focus-card.js  Focus: the card a row opens into, its motion, the task
                         actions, and homeOpenSheet (the retired sheet's old name)
     12-home-w-<id>.js   one widget each (today, focus, schedule, links, waiting,
                         finance, people, week, countdowns)
     styles: 13-home-core.css, 13-home-edit.css, 13-home-w-*.css (loaded after
             the core, so a widget's rules can override it)
   build.mjs loads '12-home-*.js' BEFORE this file ('-' sorts before '.'), so
   widget files may only declare things and call registerHomeWidget() at load.

   WIDGET API
     registerHomeWidget({
       id: 'finance',               stable id; ALSO list it in lib/home-topbar.mjs
                                    HOME_WIDGETS (tests/home-layout.test.mjs compares)
       title: 'Finances', icon: 'wallet', description: 'one line for the gallery',
       sizes: ['s', 'm', 'l'],      s = 4 of 12 columns, m = 6, l = 8, full = 12;
                                    one column on phones, s/m = half width when narrow
       defaultSize: 's', order: 60, defaultHidden: false,
       gate: 'finance',             config.features[gate] === false -> not shown anywhere
       emptyHint: 'Appears when…',  optional: Customise's placeholder while render() returns false
       available() { ... },         optional: false = not offered right now
       render(el, ctx) { ... },     fill el (empty) on EVERY Home render; return false
                                    when there is nothing to show (hidden outside edit mode)
       settings(anchor, ctx) {...}, optional: a gear on the widget in edit mode
       unmount() { ... },           optional: Home is being left (stop timers, drop caches)
     });
   ctx (fresh each render):
     id, def, size, editing
     firstPaint          true on the widget's first paint since Home was entered or it was
                         added. The framework already staggers the widget in; use this for
                         effects inside it (count-ups...), never on re-renders from saves/sync.
     isNew(key)          true the first time this widget shows `key` (a task id...) since Home
                         was entered (same answer for the whole render). For "animate only
                         new items".
     enterNew(els, keyOf)   fade/rise the new ones among els (keyOf(el) || data-flip ||
                         data-id); nothing on first paint. Returns how many were new.
     expanded            Set of task ids expanded on Home (UI state homeUI.expanded:
                         survives re-renders, saves, live sync and reloads)
     toggleExpanded(id)  flip one and repaint this widget; it and its neighbours glide
     rerender()          repaint only this widget, with FLIP
     flip(fn)            fn changes this widget's DOM in place; whatever moved glides
     sortable(el, opts)  makeSortable(), destroyed with the widget
     off({icon, title, text, action:{label, icon, run}})  the greyed "connect / no data"
                         state (returns the element; marks the widget is-off)
     openTask(id, fromEl) the full task: the centre card (openTask) when it exists
   FLIP inside a widget: put data-flip="<unique key>" on elements that should glide
   when they move between renders (data-flip-h: also animate their height, e.g. a
   card that expands). Keys are matched within the closest data-flip ancestor.

   DATA (state.home, saved with saveData = one undo step):
     focus {count, pinned, p1, overdue, doing, planned, dueSoonDays, streams[]},
     focusOrder [taskId], snoozed {taskId: 'YYYY-MM-DD'},
     layout {version: 1, widgets: [{id, size, hidden}]}   (missing = the defaults)
   UI (saveUI, no undo): state.homeUI {expanded: [taskId]}.
   Assistants: set_home_focus / get_home_focus, set_home_layout / reset_home_layout /
   get_home_layout (server/actions/ops-home.mjs, queries-home.mjs); the server's
   copy of the rules is lib/home-topbar.mjs.
   ============================================================ */
const _HOME_PO = { p1: 0, p2: 1, p3: 2, p0: 3 };
const HOME_FOCUS_DEFAULTS = Object.freeze({ count: 5, pinned: true, p1: true, overdue: true, doing: true, planned: true, dueSoonDays: 3, streams: [] });
const HOME_SIZES = Object.freeze(['s', 'm', 'l', 'full']);
const HOME_SIZE_COLS = Object.freeze({ s: 4, m: 6, l: 8, full: 12 });
const HOME_SIZE_LABEL = Object.freeze({ s: 'Small', m: 'Medium', l: 'Large', full: 'Full width' });
const HOME_LAYOUT_VERSION = 1;

function _homeGreeting() {
  const h = new Date().getHours();
  const part = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return userName() ? `${part}, ${userName()}` : part;
}
function homeState() { return state.home && typeof state.home === 'object' ? state.home : {}; }
function homeFocusConfig() {
  const f = Object.assign({}, HOME_FOCUS_DEFAULTS, homeState().focus || {});
  f.count = Math.max(1, Math.min(9, Math.round(Number(f.count) || 5)));
  f.dueSoonDays = Math.max(0, Math.min(30, Math.round(Number(f.dueSoonDays) || 0)));
  f.streams = Array.isArray(f.streams) ? f.streams : [];
  return f;
}
/** Patch state.home (shallow for focus) and save once. */
function homeUpdate(patch, msg) {
  const cur = homeState();
  const next = Object.assign({}, cur, patch);
  if (patch.focus) next.focus = Object.assign({}, cur.focus || {}, patch.focus);
  for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
  // Drop snoozes that have run out.
  if (next.snoozed) { const t = todayStr(); for (const [k, v] of Object.entries(next.snoozed)) if (!v || v < t) delete next.snoozed[k]; }
  state.home = next;
  saveData(); render();
  if (msg) toast(msg, { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
}

/* ---------- which tasks are "focus" ---------- */
function _homeIsOpen(i) { return statusOf(i.id) !== 'done'; }
function _homeNotStarted(i) { return !!(i.startDate && i.startDate > todayStr()); }
/** Why a task is in Focus (labels, most important first) and a score. */
function homeFocusWhy(i, cfg) {
  cfg = cfg || homeFocusConfig();
  const d = daysUntil(effDate(i));
  const why = []; let s = 0;
  if (cfg.overdue && d !== null && d < 0) { why.push({ k: 'overdue', t: `${-d}d overdue` }); s += 400 - Math.max(d, -30); }
  else if (d === 0) { why.push({ k: 'today', t: 'Due today' }); s += 300; }
  if (cfg.doing && statusOf(i.id) === 'doing') { why.push({ k: 'doing', t: 'In progress' }); s += 250; }
  if (cfg.pinned && isPinned(i.id)) { why.push({ k: 'pinned', t: 'Pinned' }); s += 220; }
  if (cfg.planned && i.plannedFor && i.plannedFor <= todayStr()) { why.push({ k: 'planned', t: 'Planned today' }); s += 200; }
  const p = effPriority(i);
  if (cfg.p1 && p === 'p1') { why.push({ k: 'p1', t: 'High priority' }); s += 120; }
  else s += p === 'p2' ? 30 : p === 'p3' ? 10 : 0;
  if (cfg.dueSoonDays && d !== null && d > 0 && d <= cfg.dueSoonDays) { why.push({ k: 'soon', t: `Due ${dueLabel(effDate(i))}` }); s += 100 - d * 10; }
  return { why, score: s };
}
/** The Focus list: manual order first, then by score; at most cfg.count. */
function homeFocusTasks(limit) {
  const cfg = homeFocusConfig();
  const h = homeState();
  const today = todayStr();
  const snoozed = h.snoozed || {};
  const streams = cfg.streams.length ? new Set(cfg.streams) : null;
  const order = Array.isArray(h.focusOrder) ? h.focusOrder : [];
  const cands = [];
  for (const i of getAllItems()) {
    if (!_homeIsOpen(i) || _homeNotStarted(i)) continue;
    if (snoozed[i.id] && snoozed[i.id] >= today) continue;
    if (streams && !streams.has(effStream(i))) continue;
    const r = homeFocusWhy(i, cfg);
    if (!r.why.length) continue;
    cands.push({ i, why: r.why, score: r.score, o: order.indexOf(i.id) });
  }
  cands.sort((a, b) => {
    if (a.o >= 0 || b.o >= 0) { if (a.o < 0) return 1; if (b.o < 0) return -1; return a.o - b.o; }
    return b.score - a.score;
  });
  return cands.slice(0, limit || cfg.count);
}
function homeFocusCandidateCount() {
  const cfg = homeFocusConfig();
  return getAllItems().filter(i => _homeIsOpen(i) && !_homeNotStarted(i) && homeFocusWhy(i, cfg).why.length).length;
}

/* ---------- waiting on someone ---------- */
const _HOME_WAIT_TAG = /^(waiting|waiting-on|awaiting|blocked)(-|$)/;
function homeIsWaiting(i) {
  if (!_homeIsOpen(i)) return false;
  if (statusOf(i.id) === 'waiting' || i.waitingOn || i.waiting === true) return true;
  return effTags(i).some(t => _HOME_WAIT_TAG.test(String(t)));
}
function homeWaitingPerson(i) {
  const w = i.waitingOn;
  if (w) { const p = getPerson(String(w)) || (state.people || []).find(x => String(x.name || '').toLowerCase() === String(w).toLowerCase()); if (p) return p; }
  for (const t of effTags(i)) {
    const m = /^(?:blocked|waiting|waiting-on|awaiting)-(.+)$/.exec(String(t));
    if (m) { const p = (state.people || []).find(x => x.id === m[1] || (x.aliases || []).includes(m[1])); if (p) return p; }
  }
  const ppl = (typeof effPeople === 'function' ? effPeople(i) : []).map(getPerson).filter(p => p && !p.self);
  return ppl[0] || null;
}

/* ---------- small shared bits ---------- */
function homeAvatar(p, size) {
  if (!p) return '';
  const sz = Number(size) || 20;
  const url = safeUrl(p.avatarUrl);
  const inner = url ? `<img src="${escAttr(url)}" alt="" data-avatar-fallback="${escAttr(p.id)}" data-avatar-size="${sz}">` : esc(avatarInitials(p.name));
  return `<span class="avatar" style="--size:${sz}px;--c:${escAttr(safeColor(p.color, 'var(--sw-slate)'))}" title="${escAttr(p.name || '')}">${inner}</span>`;
}
function _homeStreamHtml(sid) {
  const s = STREAMS[sid];
  return `<span class="stream" style="--c:${escAttr(safeColor(s && s.color, '#868a94'))}"><span class="dot"></span><span>${esc((s && s.label) || sid || 'No stream')}</span></span>`;
}
function _homeDueChip(i) {
  const d = effDate(i);
  if (!d) return '';
  const n = daysUntil(d);
  const cls = n < 0 ? 'overdue' : n === 0 ? 'today' : n <= 3 ? 'soon' : '';
  const txt = n < 0 ? `${-n}d overdue` : dueLabel(d) + (i.dueTime ? ' ' + i.dueTime : '');
  return `<span class="hf-due ${cls}" title="Due ${escAttr(d)}${i.dueTime ? ' ' + escAttr(i.dueTime) : ''}">${icon(n < 0 ? 'circle-alert' : 'calendar')}<span>${esc(txt)}</span></span>`;
}
/** A one-paragraph plain-text preview of a markdown description. */
function homePlainText(md, max) {
  let s = String(md || '');
  // List items read as "a · b · c" rather than running into one sentence.
  let prevItem = false;
  s = s.split('\n').map(line => {
    const m = /^[ \t]{0,3}(?:[-*+]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?(.*)$/.exec(line);
    if (!m) { if (line.trim()) prevItem = false; return line; }
    const out = (prevItem ? '· ' : '') + m[1]; prevItem = true; return out;
  }).join('\n');
  s = s.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]*)`/g, '$1').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, '')
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1').replace(/\s+/g, ' ').trim();
  const a = Array.from(s);
  return a.length > (max || 220) ? a.slice(0, (max || 220) - 1).join('').replace(/\s+\S*$/, '') + '…' : s;
}
function _homeFmtMoney(n, cur) {
  if (typeof n !== 'number' || !isFinite(n)) return '–';
  try { return new Intl.NumberFormat(APP_CONFIG.locale || undefined, { style: 'currency', currency: cur || APP_CONFIG.currency || 'GBP', maximumFractionDigits: 0 }).format(n); }
  catch (e) { return String(Math.round(n)); }
}
function _homeDoneToday() {
  const today = todayStr(); let n = 0;
  for (const arr of Object.values(state.completionLog || {})) for (const ts of (arr || [])) if (Number(ts) && fmtDate(new Date(Number(ts))) === today) n++;
  return n;
}

/* ============================================================
   WIDGET REGISTRY
   The list hangs off a function declaration (hoisted with its body), so the
   widget files, which load before this one, can register at load time.
   ============================================================ */
function homeWidgetDefs() { return homeWidgetDefs.list || (homeWidgetDefs.list = []); }
function registerHomeWidget(def) {
  if (!def || typeof def.id !== 'string' || !def.id || typeof def.render !== 'function') throw new Error('registerHomeWidget needs {id, render}');
  const list = homeWidgetDefs();
  const i = list.findIndex(d => d.id === def.id);
  if (i >= 0) list[i] = def; else list.push(def);
}
/** A definition with every field filled in (sizes in canonical order). */
function _homeDefNorm(d) {
  const asked = Array.isArray(d.sizes) ? d.sizes : HOME_SIZES;
  const sizes = HOME_SIZES.filter(s => asked.includes(s));
  const ss = sizes.length ? sizes : HOME_SIZES.slice();
  return Object.assign({ title: d.id, icon: 'layout-grid', description: '', order: 50, defaultHidden: false }, d, {
    sizes: ss, defaultSize: ss.includes(d.defaultSize) ? d.defaultSize : ss[0], defaultHidden: d.defaultHidden === true,
  });
}
/** Every registered widget, normalised, in default order. */
function homeWidgetCatalog() {
  return homeWidgetDefs().map((d, i) => ({ d: _homeDefNorm(d), i }))
    .sort((a, b) => (a.d.order - b.d.order) || (a.i - b.i)).map(x => x.d);
}
function homeWidgetDef(id) { const d = homeWidgetDefs().find(x => x.id === id); return d ? _homeDefNorm(d) : null; }
/** Shown at all? (feature switch in config, the widget's own available()). */
function homeWidgetAvailable(def) {
  if (!def) return false;
  if (def.gate && APP_CONFIG.features && APP_CONFIG.features[def.gate] === false) return false;
  if (typeof def.available === 'function') { try { return def.available() !== false; } catch (e) { return false; } }
  return true;
}

/* ============================================================
   LAYOUT MODEL (same rules as lib/home-topbar.mjs normalizeHomeLayout)
   ============================================================ */
function homeClampSize(size, sizes, fallback) {
  if (sizes.includes(size)) return size;
  const want = HOME_SIZE_COLS[size];
  if (!want) return sizes.includes(fallback) ? fallback : sizes[0];
  let best = sizes[0], bd = Infinity;
  for (const s of sizes) {
    const d = Math.abs(HOME_SIZE_COLS[s] - want);
    if (d < bd || (d === bd && HOME_SIZE_COLS[s] > HOME_SIZE_COLS[best])) { best = s; bd = d; }
  }
  return best;
}
function homeLayoutNormalize(raw, catalog) {
  const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && Array.isArray(raw.widgets) ? raw.widgets : []);
  const byId = new Map(catalog.map(c => [c.id, c]));
  const seen = new Set();
  const out = [];
  for (const w of list) {
    if (!w || typeof w !== 'object' || typeof w.id !== 'string') continue;
    const c = byId.get(w.id);
    if (!c || seen.has(w.id)) continue;
    seen.add(w.id);
    out.push({ id: w.id, size: homeClampSize(w.size, c.sizes, c.defaultSize), hidden: w.hidden === true });
  }
  for (const c of catalog) if (!seen.has(c.id)) out.push({ id: c.id, size: c.defaultSize, hidden: !!c.defaultHidden });
  return { version: HOME_LAYOUT_VERSION, widgets: out };
}
/** The layout in display order (stored, else the defaults). */
function homeLayout() { return homeLayoutNormalize(homeState().layout, homeWidgetCatalog()); }
/**
 * A new order for the widgets that are shown (isShown(w)); the others (hidden,
 * switched off) keep their slots, so showing one again puts it back where it was.
 * Ids in `order` that are not shown are ignored; shown ones it leaves out keep
 * their relative order at the end. Pure.
 */
function homeLayoutReorder(widgets, order, isShown) {
  const shown = widgets.filter(isShown).map(w => w.id);
  const queue = order.filter((id, i) => shown.includes(id) && order.indexOf(id) === i);
  for (const id of shown) if (!queue.includes(id)) queue.push(id);
  return widgets.map(w => {
    if (!shown.includes(w.id)) return w;
    const id = queue.shift();
    return Object.assign({}, widgets.find(x => x.id === id));
  });
}
/**
 * Save a new layout (a list of {id, size, hidden}): one undo step, then a
 * re-render where everything that moved glides. Returns false when nothing changed.
 */
function homeSaveLayout(widgets, o) {
  o = o || {};
  const next = homeLayoutNormalize({ widgets }, homeWidgetCatalog());
  if (JSON.stringify(next.widgets) === JSON.stringify(homeLayout().widgets)) return false;
  _homeRememberNow();                    // glide from where things are on screen right now
  homeUpdate({ layout: next }, o.toast || null);
  if (o.say) homeAnnounce(o.say);
  return true;
}
function homeResetLayout() {
  if (!homeState().layout) { homeAnnounce('Home already has the default layout'); return; }
  _homeRememberNow();
  homeUpdate({ layout: undefined }, 'Home layout reset');
  homeAnnounce('Home layout reset to the default');
}

/* ---------- expanded tasks (UI state) ---------- */
function _homeExpandedSet() {
  const ui = state.homeUI && typeof state.homeUI === 'object' ? state.homeUI : {};
  return new Set(Array.isArray(ui.expanded) ? ui.expanded.filter(x => typeof x === 'string') : []);
}
function homeIsExpanded(id) { return _homeExpandedSet().has(id); }
/** Expand (true), collapse (false) or flip (undefined) one task on Home. Returns the new state. */
function homeSetExpanded(id, on) {
  const s = _homeExpandedSet();
  const want = on === undefined ? !s.has(id) : !!on;
  if (want) s.add(id); else s.delete(id);
  const keep = [...s].filter(x => { const it = getItem(x); return it && statusOf(x) !== 'done'; }).slice(-50);
  state.homeUI = Object.assign({}, state.homeUI && typeof state.homeUI === 'object' ? state.homeUI : {}, { expanded: keep });
  saveUI();
  return want;
}

/* ============================================================
   MOUNT
   ============================================================ */
let _homeMountedNow = false;       // false until the first mount after Home is entered
let _homeEntry = { n: 0, painted: new Set(), seen: new Map() };
let _homeEditing = false;          // Customise mode (12-home-edit.js)
let _homeAdded = null;             // a widget just added from the gallery: it gets an entrance
let _homeW = new Map();            // widget id -> {frame, body, def, size, sortables}

/* Once per entry: mount() runs on EVERY render while Home is open (saves, live
   sync, undo...). Only the first mount after Home is entered is an "entry";
   a widget's first paint in an entry (or after it is added) is its firstPaint. */
function _homeEntryBegin() {
  const entering = !_homeMountedNow;
  _homeMountedNow = true;
  if (entering) _homeEntry = { n: _homeEntry.n + 1, painted: new Set(), seen: new Map() };
  return entering;
}
function _homeEntryEnd() { _homeMountedNow = false; }
/** True the first time widget `id` paints in this entry (and remembers it). */
function _homeEntryFirst(id) {
  const first = !_homeEntry.painted.has(id);
  _homeEntry.painted.add(id);
  return first;
}

registerSection('home', {
  group: 'home',
  // The Today hero greets (12-home-w-today.js): then the page is just "Home".
  title: () => (typeof homeTodayOnBoard === 'function' && homeTodayOnBoard() ? 'Home' : _homeGreeting()),
  crumb: () => [],
  taskControls: false,
  mount(container) {
    const entering = _homeEntryBegin();
    _homeTeardown();
    const sub = document.getElementById('view-subtitle');
    if (sub) sub.textContent = typeof homeTodayOnBoard === 'function' && homeTodayOnBoard() ? '' : new Date().toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    if (typeof _homeHeadActions === 'function') _homeHeadActions();          // Customise (12-home-edit.js)
    // The live region exists before the first announcement (one made on the spot is often missed).
    if (typeof homeAnnounce === 'function' && !document.getElementById('home-live')) homeAnnounce('');
    const root = document.createElement('div'); root.className = 'home' + (_homeEditing ? ' is-editing' : '');
    // The hero greets: then the page header is only for screen readers (13-home-core.css).
    if (typeof homeTodayOnBoard === 'function' && homeTodayOnBoard()) root.classList.add('has-hero');
    container.appendChild(root);
    const grid = document.createElement('div'); grid.className = 'home-grid';
    root.appendChild(grid);
    if (!_homeEditing && typeof _homeLongPress === 'function') _homeLongPress(grid);   // hold a header = Customise
    // Customise's toolbar floats at the foot of the view (sticky), so the board never shifts.
    if (_homeEditing && typeof _homeEditBar === 'function') root.appendChild(_homeEditBar(entering));
    const layout = homeLayout();
    for (const w of layout.widgets) {
      if (w.hidden) continue;                                             // hidden ones wait in the gallery
      const def = homeWidgetDef(w.id);
      if (!homeWidgetAvailable(def)) continue;
      const frame = _homeFrame(def, w);
      grid.appendChild(frame);
      _homePaintWidget(frame, def, w, entering);
    }
    if (!grid.querySelector(':scope > .hg-w:not([hidden])')) _homeEmptyHome(grid);
    else if (!_homeEditing && typeof _homeFoot === 'function') root.appendChild(_homeFoot());
    homeGridPack(grid);
    homeGridSettle(grid, !entering);                                      // whatever moved since the last render glides
    // The entrance is Home's own (homeGridEntrance); this empty marker keeps the generic
    // Motion.stagger (renderMain on a view change, motion.js at boot) off the widgets.
    const mark = document.createElement('i'); mark.hidden = true; mark.setAttribute('data-stagger', ''); root.appendChild(mark);
    if (!_homeEditing && typeof homeGridEntrance === 'function') { if (entering) homeGridEntrance(grid); else homeGridEntranceContinue(grid); }
    homeGridObserve(grid);
    if (_homeAdded) { const id = _homeAdded; _homeAdded = null; homeGridArrive(grid, id); }
    if (_homeEditing && typeof _homeEditAfterMount === 'function') _homeEditAfterMount(grid, entering);
    _homeRestoreFocus();
    _homeKeepFocus();                     // a save / live sync rebuilt Home: keyboard focus stays where it was
  },
  unmount() {
    _homeEntryEnd();
    _homeEditing = false;
    _homeTeardown();
    for (const d of homeWidgetDefs()) {
      if (typeof d.unmount === 'function') try { d.unmount(); } catch (e) { console.error(`[home] widget "${d.id}" unmount failed`, e); }
    }
    homeGridForget();
    if (typeof _homeHeadActionsRemove === 'function') _homeHeadActionsRemove();
  },
});

/** The frame every widget sits in. */
function _homeFrame(def, w) {
  const f = document.createElement('section');
  f.className = 'hg-w';
  f.dataset.wid = def.id;
  f.dataset.size = w.size;
  f.dataset.flip = 'w:' + def.id;
  f.setAttribute('data-flip-size', '');                  // a size change morphs (12-home-grid.js)
  f.setAttribute('aria-label', def.title);
  const body = document.createElement('div'); body.className = 'hg-body';
  body.setAttribute('data-flip-clip', '');
  f.appendChild(body);
  return f;
}
/** (Re)paint one widget into its frame. */
function _homePaintWidget(frame, def, w, entering) {
  const prev = _homeW.get(def.id);
  if (prev) _homeWidgetCleanup(prev);
  const body = frame.querySelector(':scope > .hg-body');
  body.innerHTML = '';
  body.inert = !!_homeEditing;
  frame.classList.remove('is-off');
  const first = _homeEntryFirst(def.id);
  const rec = { frame, body, def, size: w.size, sortables: [] };
  _homeW.set(def.id, rec);
  const ctx = _homeCtx(rec, first);
  let r;
  try { r = def.render(body, ctx); }
  catch (e) {
    console.error(`[home] widget "${def.id}" failed`, e);
    body.innerHTML = `<div class="card home-card is-off"><div class="card-b"><div class="home-empty">${icon('circle-alert')}<div><b>${esc(def.title)} could not load</b><span>The rest of Home is fine. Reload the page; if it keeps happening, check the console.</span></div></div></div></div>`;
    r = true;
  }
  const empty = r === false || !body.firstElementChild;
  frame.classList.toggle('is-empty', empty);
  frame.hidden = empty && !_homeEditing;
  // Hidden for now (nothing to show): while customising it keeps its slot and says when it appears.
  if (empty && _homeEditing) body.innerHTML = `<div class="hg-placeholder">${icon(def.icon)}<span><b>${esc(def.title)}</b> ${esc(def.emptyHint || 'Nothing to show right now')}</span></div>`;
  if (typeof _homeEditChrome === 'function') _homeEditChrome(frame, def, w);
  // The once-per-entry entrance is homeGridEntrance (called by mount), not per widget.
}
function _homeWidgetCleanup(rec) {
  for (const s of rec.sortables) try { s.destroy(); } catch (e) { /* already gone */ }
  rec.sortables = [];
}
function _homeTeardown() {
  for (const rec of _homeW.values()) _homeWidgetCleanup(rec);
  _homeW = new Map();
  homeGridUnobserve();
}
/** Repaint one widget in place; it and its neighbours glide. */
function homeRerenderWidget(id) {
  const rec = _homeW.get(id);
  if (!rec || !rec.frame.isConnected || state.view !== 'home') { render(); return; }
  const grid = rec.frame.parentElement;
  const w = homeLayout().widgets.find(x => x.id === id) || { id, size: rec.size, hidden: false };
  homeGridRemember(grid, homeFlip(grid, () => { _homePaintWidget(rec.frame, rec.def, w, false); homeGridPack(grid); }));
  _homeKeepFocus();
}
/** Nothing on Home at all (every widget hidden). */
function _homeEmptyHome(grid) {
  const box = document.createElement('div'); box.className = 'hg-w hg-empty-home'; box.dataset.size = 'full';
  grid.appendChild(box);
  mountEmptyState(box, {
    icon: 'layout-grid', title: 'Home is empty',
    text: 'Every widget is hidden. Add the ones you want to see first thing.',
    actions: [{ label: 'Add widgets', icon: 'plus', primary: true, run: () => { if (typeof homeEditStart === 'function') homeEditStart({ gallery: true }); } }],
  });
}

/** The ctx a widget's render gets (see the header). */
function _homeCtx(rec, first) {
  const def = rec.def;
  let seen = _homeEntry.seen.get(def.id);
  if (!seen) { seen = new Set(); _homeEntry.seen.set(def.id, seen); }
  const before = new Set(seen);
  const ctx = {
    id: def.id, def, size: rec.size, editing: _homeEditing, firstPaint: first,
    expanded: _homeExpandedSet(),
    isNew(key) { const k = String(key); seen.add(k); return !before.has(k); },
    enterNew(els, keyOf) {
      const fresh = [];
      for (const el of els || []) {
        const k = keyOf ? keyOf(el) : (el.dataset.flip || el.dataset.id);
        if (k != null && ctx.isNew(k)) fresh.push(el);
      }
      if (!first) homeEnter(fresh);
      return fresh.length;
    },
    toggleExpanded(id) { homeSetExpanded(id); ctx.expanded = _homeExpandedSet(); homeRerenderWidget(def.id); },
    rerender() { homeRerenderWidget(def.id); },
    flip(fn) { const grid = rec.frame.parentElement; homeGridRemember(grid, homeFlip(grid, () => { fn(); homeGridPack(grid); })); },
    sortable(container, opts) { const s = makeSortable(container, opts); rec.sortables.push(s); return s; },
    off(o) { return _homeOffState(rec, o || {}); },
    openTask(id, fromEl) { return homeOpenTask(id, fromEl); },
  };
  return ctx;
}
/** The greyed "connect / no data yet" state inside a widget. */
function _homeOffState(rec, o) {
  const wrap = document.createElement('div'); wrap.className = 'home-empty';
  wrap.innerHTML = `${icon(o.icon || rec.def.icon || 'plug')}<div><b>${esc(o.title || 'Not connected')}</b>${o.text ? `<span>${esc(o.text)}</span>` : ''}</div>`;
  if (o.action && typeof o.action.run === 'function') {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm';
    b.innerHTML = icon(o.action.icon || 'plug') + `<span>${esc(o.action.label || 'Connect')}</span>`;
    b.onclick = () => o.action.run();
    wrap.appendChild(b);
  }
  rec.frame.classList.add('is-off');
  return wrap;
}

/** Open a task in full: the centre card when it exists (61-task-card.js), else the side panel. */
function homeOpenTask(id, fromEl) {
  if (typeof openTask === 'function') return openTask(id, { from: fromEl || null, context: 'home' });
  return selectTask(id);
}

/** What a dragged task shrinks to outside its list (see makeSortable compactLift). */
function _homeDragPill(el) {
  const it = getItem(el && el.dataset.id);
  if (!it) return '';
  return `<span class="hw-p ${escAttr(effPriority(it))}"></span><span class="sp-t">${esc(effTitle(it))}</span><span class="sp-k">${icon('calendar')}Drop on a day</span>`;
}

/* ---------- task actions shared by the widgets (in place where we can, so it stays fluid) ---------- */
function homeToggleSubtask(taskId, stId, cardEl) {
  const cur = getSubtasks(taskId).slice();
  const i = cur.findIndex(s => s.id === stId); if (i < 0) return;
  cur[i] = Object.assign({}, cur[i], { done: !cur[i].done });
  setOverride(taskId, 'subtasks', cur);         // saves; no full repaint
  const nowDone = cur[i].done;
  const doneN = cur.filter(s => s.done).length;
  for (const scope of [cardEl, document.querySelector('.home-sheet')]) {
    if (!scope) continue;
    const li = scope.querySelector(`[data-st="${CSS.escape(stId)}"]`);
    if (li) {
      li.classList.toggle('done', nowDone);
      const cb = li.querySelector('.cbx'); if (cb) { cb.classList.toggle('on', nowDone); cb.setAttribute('aria-checked', nowDone ? 'true' : 'false'); }
      if (nowDone && window.Motion) Motion.animate(cb, [{ transform: 'scale(0.7)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }
    const bar = scope.querySelector('.hf-prog .progress > i, .hs-prog .progress > i');
    const pg = scope.querySelector('.hf-prog'); if (pg) pg.title = doneN + ' of ' + cur.length + ' subtasks done';
    if (bar) bar.style.setProperty('--pct', Math.round(doneN / cur.length * 100) + '%');
    const num = scope.querySelector('.hf-prog .num, .hs-prog .num');
    if (num) num.textContent = `${doneN}/${cur.length}`;
  }
  if (nowDone && doneN === cur.length && statusOf(taskId) !== 'done') {
    toast('All subtasks done', { kind: 'ok', action: { label: 'Complete task', run: () => homeCompleteTask(taskId, document.querySelector(`.hf-card[data-id="${CSS.escape(taskId)}"]`)) } });
  }
}
function homeAddSubtask(taskId, title) {
  const keep = `add-${taskId}`;
  _homeRefocus = keep;
  addSubtask(taskId, title);                    // saves + repaints; focus comes back below
}
let _homeRefocus = null;
function _homeRestoreFocus() {
  if (!_homeRefocus) return;
  const el = document.querySelector(`#main-body [data-fk="${CSS.escape(_homeRefocus)}"]`);
  _homeRefocus = null;
  if (el) try { el.focus({ preventScroll: true }); } catch (e) {}
}
/* Keyboard focus across re-renders. Every save, live-sync update or repaint rebuilds the
   widgets, which used to drop keyboard focus to the page (a screen reader started again
   at the top). The control that has focus is remembered by a key (its widget, the item
   it belongs to, what it is); after a rebuild the same control gets focus back; when it is
   gone (a task done), the control of the same kind in its place (the next row); else the
   first control of the widget. Clicking somewhere that takes no focus forgets it. */
let _homeFocusMemo = null;
function _homeFocusables(frame) {
  const all = [...frame.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.closest('[hidden], [inert]'));
  if (frame.tabIndex >= 0) all.unshift(frame);                // Customise: the frame itself
  return all;
}
function _homeFocusKey(el) {
  const w = el && el.closest ? el.closest('#main-body .hg-w[data-wid]') : null;
  if (!w) return null;
  const wid = w.dataset.wid;
  const act = (el.dataset && (el.dataset.act || el.dataset.size)) || '';
  const kind = [el.tagName, el.getAttribute('role') || '', act, String(el.classList && el.classList[0] || '')].join('|');
  if (el.dataset && el.dataset.fk) return { wid, kind, k: 'fk:' + el.dataset.fk, loose: 'fk:' + el.dataset.fk };
  const host = el.closest('[data-id], [data-ev], [data-st], [data-flip]');
  const hk = host && host !== w && w.contains(host) ? [host.dataset.id, host.dataset.ev, host.dataset.st, host.dataset.flip].map(x => x || '').join(',') : '';
  const loose = hk + '|' + kind + '|' + ((el.dataset && (el.dataset.ev || el.dataset.id)) || '');
  return { wid, kind, k: loose + '|' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60), loose };
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {   // (tests load this file in a VM)
  document.addEventListener('focusin', (e) => {
    const m = _homeFocusKey(e.target);
    if (m) {                                                  // its place among controls of its kind
      const frame = e.target.closest('.hg-w[data-wid]');
      m.pos = _homeFocusables(frame).filter(el => { const k = _homeFocusKey(el); return k && k.kind === m.kind; }).indexOf(e.target);
    }
    _homeFocusMemo = m;
  });
  document.addEventListener('focusout', (e) => {
    const t = e.target;
    // Focus went nowhere while the control is still there and shown (a click on the background):
    // forget it. Removed or hidden (a re-render, a done row leaving) keeps it for the next mount.
    setTimeout(() => { if (t && t.isConnected && t.getClientRects().length && (!document.activeElement || document.activeElement === document.body)) _homeFocusMemo = null; }, 0);
  });
}
function _homeKeepFocus() {
  const m = _homeFocusMemo;
  const a = document.activeElement;
  if (!m || (a && a !== document.body)) return;          // nothing remembered, or focus is fine
  const frame = document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(m.wid)}"]`);
  if (!frame || frame.hidden) return;
  const all = _homeFocusables(frame);
  const keys = all.map(el => _homeFocusKey(el));
  let j = keys.findIndex(k => k && k.k === m.k);
  if (j < 0) j = keys.findIndex(k => k && k.loose === m.loose);
  if (j < 0 && m.pos >= 0) {
    const same = all.filter((el, i) => keys[i] && keys[i].kind === m.kind);
    if (same.length) j = all.indexOf(same[Math.min(m.pos, same.length - 1)]);
  }
  const to = all[j >= 0 ? j : 0];
  if (to) try { to.focus({ preventScroll: true }); } catch (e) { /* gone */ }
}
/**
 * After a task was added from Home (the hero's first task, Focus's quick add) and Home
 * repainted: keyboard focus goes to its Focus row when it is there, else to `fallback`
 * (a selector), never to the page; the addition is announced.
 */
function homeFocusAfterAdd(id, fallback) {
  const it = id ? getItem(String(id)) : null;
  if (it && typeof homeAnnounce === 'function') homeAnnounce(`Added: ${effTitle(it)}`);
  const row = it ? document.querySelector(`#main-body .hf-card[data-id="${CSS.escape(it.id)}"] .hf-tt`) : null;
  const to = row || (fallback ? document.querySelector(fallback) : null);
  if (!to) return;
  if (!row && !to.hasAttribute('tabindex')) to.tabIndex = -1;
  try { to.focus({ preventScroll: true }); } catch (e) { /* gone */ }
}
function homeCompleteTask(id, cardEl, direct) {
  // A Focus row gets Focus's own short celebration (12-home-focus-card.js).
  if (typeof homeFocusDone === 'function' && cardEl && cardEl.classList && cardEl.classList.contains('hf-card')) return homeFocusDone(id, cardEl);
  const finish =() => { if (typeof toggleDone === 'function') toggleDone(id); else setStatus(id, 'done'); };
  if (cardEl && cardEl.isConnected && window.Motion && !Motion.prefersReduced()) {
    cardEl.classList.add('is-completing');
    const cb = cardEl.querySelector('.check'); if (cb) cb.classList.add('done');
    setTimeout(() => Motion.collapse(cardEl, finish), 260);
  } else finish();
}
function homeReschedule(id, date) {
  const it = getItem(id); if (!it || !date) return;
  if (effDate(it) === date) return;
  setDateWithReason(id, date, 'Moved on Home');
  toast(`Moved to ${_tbShortDate(date, true)}`, { kind: 'ok', icon: 'calendar', action: { label: 'Undo', run: () => undo() } });
}
function homeSnooze(id) {
  const s = Object.assign({}, homeState().snoozed || {});
  s[id] = todayStr();
  homeUpdate({ snoozed: s }, 'Hidden from Focus until tomorrow');
}
function homeTaskMenu(anchor, id) {
  const it = getItem(id); if (!it) return;
  const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return fmtDate(d); };
  const nextMon = (() => { const d = new Date(); const add = ((8 - d.getDay()) % 7) || 7; d.setDate(d.getDate() + add); return fmtDate(d); })();
  const card = () => document.querySelector(`.hf-card[data-id="${CSS.escape(id)}"]`);
  openMenu(anchor, [
    { label: 'Open full card', icon: 'maximize-2', kbd: '↵', run: () => homeOpenTask(id, card()) },
    { label: 'Mark done', icon: 'circle-check', kbd: 'X', run: () => homeCompleteTask(id, card()) },
    { label: statusOf(id) === 'doing' ? 'Stop progress' : 'Start (in progress)', icon: 'circle-dot', run: () => (typeof toggleDoing === 'function' ? toggleDoing(id) : setStatus(id, statusOf(id) === 'doing' ? 'todo' : 'doing')) },
    { label: isPinned(id) ? 'Unpin' : 'Pin to Focus', icon: isPinned(id) ? 'pin-off' : 'pin', kbd: 'P', run: () => togglePin(id) },
    'sep', { heading: 'Move to' },
    { label: 'Today', icon: 'sun', run: () => homeReschedule(id, todayStr()) },
    { label: 'Tomorrow', icon: 'sunrise', run: () => homeReschedule(id, plus(1)) },
    { label: 'Next week', icon: 'calendar-range', hint: _tbShortDate(nextMon, true), run: () => homeReschedule(id, nextMon) },
    'sep',
    { label: 'Hide from Focus today', icon: 'eye-off', kbd: 'H', run: () => homeSnooze(id) },
    { label: 'Open in the detail pane', icon: 'panel-right', run: () => selectTask(id) },
  ], { align: 'end' });
}
