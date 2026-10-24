/* ============================================================
   NAVIGATION: setView, '#view=' hash routing, the sidebar.
   The sidebar body (nav#sidebar) is built from the blocks registered for
   the active section group (registerSidebarBlock in 14-shell.js). The
   default blocks for Home, Tasks, Calendar and Finances live below; a
   feature builder replaces one by registering a block with the same id.
   ============================================================ */
// The data change (state.view + save) is instant; only the repaint runs inside
// a View Transition (src/motion.js) when one is available.
// Navigation kinds (src/app/09-motion-logic.js, MOTION_SYSTEM §6):
//   same: re-selecting the current view is a no-op (scroll to the top if scrolled);
//   sub : same section (a Settings group, a Review tab, a person, a task view): no View
//         Transition; only the section's changing pane animates (Motion.afterMain);
//   page: another section: the View Transition and the page entrance.
// Callers that need a refresh call render(), not setView(sameView).
/* The Morning brief and the Review pages became Home (user request, 4 Oct): Home's
   Today / Evening / Week / History tabs are 'home', 'home:evening', 'home:week' and
   'home:history'. Old names (links, bookmarks, saved views, other code) land there. */
function viewAlias(v) {
  if (typeof v !== 'string') return v;
  if (v === 'review' || v === 'review:today' || v === 'home:today' || v === 'brief') return 'home';
  const m = /^review:(evening|week|history)$/.exec(v);
  return m ? 'home:' + m[1] : v;
}
function setView(v) {
  v = viewAlias(v);
  const from = state.view;
  const person = typeof v === 'string' && v.startsWith('person:');
  if (from === v && !(person && state.selectedTaskId)) {
    if (typeof _navViaNext !== 'undefined') _navViaNext = '';
    closePopovers();
    if (window.Motion && Motion.scrollTopIfScrolled) Motion.scrollTopIfScrolled(document.getElementById('main'));
    return;
  }
  // Where you came from (14-shell.js): a page opened from a link inside another offers '‹ Back to …'.
  if (typeof navNoteMove === 'function') navNoteMove(from, v);
  // The person panel only renders when no task is selected, so going to a
  // person must close any open task panel (otherwise the person never shows).
  if (person) state.selectedTaskId = null;
  state.view = v; saveUI();
  _syncViewHash();
  closePopovers();
  if (!window.Motion) { render(); return; }
  const kind = from === v ? 'same' : motionNavKind(from, v, (x) => { const s = sectionFor(x); return s ? s.name : null; });
  if (kind === 'same') { render(); return; }
  if (Motion.navigate) Motion.navigate(render, { kind, dir: motionNavDir(from, v, (x) => { const s = sectionFor(x); return s ? s.name : null; }) });
  else Motion.viewTransition(render);
}

// Hash routing: '#view=<name>' (e.g. #view=finance, #view=stream:<id>)
// selects a view on load / hash edit; renderMain keeps the hash in sync.
const _HASH_VIEWS = new Set(['home', 'today', 'tomorrow', 'week', 'all', 'no-date', 'completed', 'wins', 'triage', 'finance', 'bin', 'now', 'inbox']);
// hash: optional, defaults to the current location.hash.
function _viewFromHash(hash) {
  const m = /^#view=(.+)$/.exec(hash == null ? (location.hash || '') : hash);
  if (!m) return null;
  let v; try { v = viewAlias(decodeURIComponent(m[1])); } catch (e) { return null; }
  if (_HASH_VIEWS.has(v)) return v;
  { const sec = sectionFor(v); if (sec && sec.hashable) return v; }   // registerSection() views
  if (/^stream:/.test(v)) return STREAMS[v.slice(7)] ? v : null;
  if (v === 'waiting') return sbWaitingViewExists() ? v : null;   // the Waiting list (review area), once it is there
  if (/^list:/.test(v)) return typeof smartListById === 'function' && smartListById(v.slice(5)) ? v : null;   // smart lists (15-nav-smart-lists.js)
  if (/^day:\d{4}-\d{2}-\d{2}$/.test(v) || /^tag:./.test(v)) return v;
  if (/^person:/.test(v)) return (state.people || []).some(p => p.id === v.slice(7)) ? v : null;
  return null;
}
function _syncViewHash() {
  const want = '#view=' + encodeURIComponent(state.view || 'home').replace(/%3A/gi, ':');
  if (location.hash === want) return;
  try { history.replaceState(history.state, '', want); } catch (e) { /* sandboxed host: no-op */ }
}
window.addEventListener('hashchange', () => {
  const v = _viewFromHash();
  if (v && v !== state.view) { navVia('chrome'); setView(v); }
});

/* ---------- the core pages (the registry: 14-shell.js registerPage; NAVIGATION_PLAN.md 2.6) ----------
   Sections register their own page next to registerSection (Achievements, Memories, Places, Friends,
   Together, Waiting, Tags, People, Files, Calendar, Money, Settings, Connections); these are the views
   with no section of their own. Descriptions: one line, 60 characters at most. */
registerPage({ id: 'home', view: 'home', match: v => v === 'home', label: 'Home', icon: 'house', area: 'home', order: 10, family: 'home', desc: 'Your day: the story, your cards and the daily note', keywords: 'today dashboard start my day widgets cards brief morning' });
registerPage({ id: 'home-evening', view: 'home:evening', match: v => v === 'home:evening', label: 'Finish the day', icon: 'sunset', area: 'home', order: 20, family: 'home', desc: 'An evening recap and your top 3 for tomorrow', keywords: 'evening recap wrap up roll over tomorrow top 3' });
registerPage({ id: 'home-week', view: 'home:week', match: v => v === 'home:week', label: 'Weekly review', icon: 'calendar-range', area: 'home', order: 30, family: 'home', desc: 'A calm look back at your week, and a plan for the next', keywords: 'week review outcomes plan retrospective' });
registerPage({ id: 'home-history', view: 'home:history', match: v => v === 'home:history', label: 'History', icon: 'history', area: 'home', order: 40, family: 'home', desc: 'Your past reviews and recaps', keywords: 'past reviews briefs recaps mornings evenings' });
registerPage({ id: 'inbox', view: 'inbox', match: v => v === 'inbox', label: 'Inbox', icon: 'inbox', area: 'tasks', order: 10, desc: 'Quick captures, waiting to be sorted', keywords: 'capture sort new unsorted' });
registerPage({ id: 'today', view: 'today', match: v => v === 'today', label: 'Today', icon: 'sun', area: 'tasks', order: 20, desc: 'What is due or planned for today', keywords: 'tasks due now overdue' });
registerPage({ id: 'week', view: 'week', match: v => v === 'week', label: 'Upcoming', icon: 'calendar-range', area: 'tasks', order: 30, desc: 'The next days, day by day', keywords: 'this week next days soon upcoming' });
registerPage({ id: 'all', view: 'all', match: v => v === 'all', label: 'All tasks', icon: 'layers', area: 'tasks', order: 40, desc: 'Everything still open', keywords: 'every open list search' });
registerPage({ id: 'now', view: 'now', match: v => v === 'now', label: 'Do now', icon: 'target', area: 'tasks', order: 60, desc: 'What fits where you are, your energy and your time', keywords: 'context energy minutes what can i do now' });
registerPage({ id: 'tomorrow', view: 'tomorrow', match: v => v === 'tomorrow', label: 'Tomorrow', icon: 'sunrise', area: 'tasks', order: 65, desc: 'What is due tomorrow', keywords: 'next day' });
registerPage({ id: 'no-date', view: 'no-date', match: v => v === 'no-date', label: 'No date', icon: 'circle-dashed', area: 'tasks', order: 70, desc: 'Open tasks without a due date', keywords: 'undated no due' });
registerPage({ id: 'someday', view: 'tag:someday', match: v => v === 'tag:someday', label: 'Someday', icon: 'archive', area: 'tasks', order: 75, desc: 'Parked: not now, not forgotten', keywords: 'someday maybe later parked' });
registerPage({ id: 'completed', view: 'completed', match: v => v === 'completed', label: 'Logbook', icon: 'circle-check', area: 'tasks', order: 80, desc: 'Everything you have finished', keywords: 'done completed finished log history' });
registerPage({ id: 'wins', view: 'wins', match: v => v === 'wins', label: 'Wins', icon: 'trophy', area: 'tasks', order: 85, desc: 'Your wins log', keywords: 'wins log good things achievements' });
registerPage({ id: 'triage', view: 'triage', match: v => v === 'triage', label: 'Email triage', icon: 'mail', area: 'tasks', order: 90, desc: 'Turn emails into tasks', keywords: 'email mail inbox suggestions triage' });
registerPage({ id: 'bin', view: 'bin', match: v => v === 'bin', label: 'Bin', icon: 'trash-2', area: 'system', order: 80, desc: 'Deleted tasks and notes, ready to restore', keywords: 'trash deleted restore' });

/** The Waiting list ('waiting', tasks with waitingOn, grouped by person) comes from the review area: its row shows only when the view exists. */
function sbWaitingViewExists() {
  try { return !!((typeof sectionFor === 'function' && sectionFor('waiting')) || (typeof isTaskView === 'function' && isTaskView('waiting'))); } catch (e) { return false; }
}
/** A view another area adds (Locations, the Game page): its row shows only once the view is there. */
function sbViewExists(v) {
  try { return !!((typeof sectionFor === 'function' && sectionFor(v)) || (typeof isTaskView === 'function' && isTaskView(v))); } catch (e) { return false; }
}
/** The Game page's row: there, and the Fun level is not Off (window.OpenDashGame from the game area; without it, shown). */
function sbGameRowOn() {
  if (!sbViewExists('game')) return false;
  try { const g = window.OpenDashGame; return !g || typeof g.on !== 'function' || g.on() !== false; } catch (e) { return true; }
}
function _sbIsWaiting(i) { if (typeof rfIsWaitingAny === 'function') return rfIsWaitingAny(i); const w = i && i.waitingOn; return !!w && (!Array.isArray(w) || w.length > 0); }   // the Waiting list's own rule (34-review-core.js)
/** Open-task counts the sidebar shows (computed once per render). */
function sidebarCounts() {
  const all = getAllItems();
  const open = all.filter(i => statusOf(i.id) !== 'done');
  const due = (i) => daysUntil(effDate(i));
  const c = {
    open,
    today: open.filter(i => matchesView(i, 'today')).length,   // same rule as the Today list (21-task-query.js)
    overdue: open.filter(i => { const d = due(i); return d !== null && d < 0; }).length,
    tomorrow: open.filter(i => due(i) === 1).length,
    week: open.filter(i => matchesView(i, 'week')).length,
    all: open.length,
    'no-date': open.filter(i => effDate(i) === null).length,
    completed: all.filter(i => statusOf(i.id) === 'done' && !isArchived(i)).length,
    inbox: open.filter(i => i.inbox).length,                              // 24-quick-capture.js
    waiting: open.filter(_sbIsWaiting).length,                            // task.waitingOn (the review area's Waiting list)
    someday: open.filter(i => effTags(i).includes('someday')).length,     // the tag someday
    now: typeof doNowActive === 'function' && doNowActive() ? open.filter(i => doNowScope(i)).length : 0,   // 24-do-now.js (a count once a choice is made)
    streams: {}, tags: {},
  };
  for (const i of open) {
    const s = effStream(i); c.streams[s] = (c.streams[s] || 0) + 1;
    for (const t of effTags(i)) c.tags[t] = (c.tags[t] || 0) + 1;
  }
  return c;
}

function renderSidebar() {
  renderShell();
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  const keepScroll = sb.scrollTop;
  sb.innerHTML = '';
  if (typeof _sbFreshShown !== 'undefined') _sbFreshShown = 0;   // at most three new-page dots per sidebar (sbNavItem)
  const group = shellGroupFor(state.view);
  const g = group === 'system' ? _shellLastGroup : group;
  const counts = sidebarCounts();
  const ctx = { view: state.view, group: g, counts, navItem: sbNavItem, section: sbSection };
  // The user's layout (15-nav-custom.js): section order and hidden sections per tab, renamed headings, hidden rows.
  const blocks = typeof sbLayoutBlocks === 'function' ? sbLayoutBlocks(SIDEBAR_BLOCKS.filter(b => b.groups.includes(g)), g) : SIDEBAR_BLOCKS.filter(b => b.groups.includes(g));
  for (const b of blocks) {
    const el = document.createElement('div');
    el.className = 'sb-block'; el.dataset.block = b.id;
    let r;
    try { r = b.render(el, ctx); } catch (e) { console.error('[sidebar block ' + b.id + ']', e); r = false; }
    if (r !== false && el.childNodes.length) {
      if (typeof sbLayoutDecorate === 'function') { try { sbLayoutDecorate(el, b.id); } catch (e) { console.error('[sidebar layout]', e); } }
      sb.appendChild(el);
    }
  }
  if (typeof sbLayoutFooter === 'function') sbLayoutFooter(sb, g);
  if (typeof sbLayoutDrag === 'function') sbLayoutDrag(sb);   // drag a heading to move its section
  // Motion adds a "Reduce motion" footer to a sidebar that has none; that
  // switch lives in the More menu and Settings now.
  const stub = document.createElement('div'); stub.className = 'sidebar-footer'; stub.hidden = true;
  sb.appendChild(stub);
  sb.scrollTop = keepScroll;
  // Motion: gliding active indicator.
  if (window.Motion) Motion.decorateSidebar(sb);
}

/* ---------- Tasks: the views, calmer (2.18, NAVIGATION_PLAN.md 2.4) ----------
   User request, 24 Oct: "the tasks list shows locations, someday etc, it's a bit overwhelming".
   Up front: Inbox, Today, Upcoming, All tasks. Promoted while they need you: Waiting (anything
   waiting), Email triage (suggestions pending), Do now (a place, energy or time chosen), and the
   view you are on. Everything else folds under More views (Do now, No date, Waiting, Someday,
   Logbook, Wins, Email triage, Files and links), open or folded as you left it
   (state.collapsedSidebar['views-more'] === false: open).
   Each row is Shown, In More or Hidden (Customise sidebar, 15-nav-custom.js sbViewPlacement):
   sidebarLayout.more lists the folded ones once you choose; before that a user who had arranged
   or hidden Views rows keeps exactly their list shown, and the fold applies to rows they never
   placed. Home's sidebar holds only Home (and the Plan rows, 78-brief-hooks.js). */
const SB_VIEWS_FRONT = Object.freeze(['inbox', 'today', 'week', 'all']);
function sbViewsMoreOpen() { return !!(state.collapsedSidebar && state.collapsedSidebar['views-more'] === false); }
function _sbViewsMoreToggle() {
  state.collapsedSidebar = state.collapsedSidebar && typeof state.collapsedSidebar === 'object' ? state.collapsedSidebar : {};
  state.collapsedSidebar['views-more'] = sbViewsMoreOpen() ? true : false;
  saveUI(); renderSidebar();
}
/** The Views rows with their counts (the identity of each row: _sbViewRows in 15-nav-custom.js).
 *  A number shows only where it asks something of you (UX_BLUEPRINT.md 3, density): Inbox to sort,
 *  Today due, Waiting to chase, Email triage to decide, Do now once chosen. The other rows keep
 *  their number in the tooltip, so nothing is lost. */
function sbTaskViewRows(c) {
  const pendingSugs = ((state.emailTriage && state.emailTriage.suggestions) || []).filter(s => s.status === 'pending').length;
  const quiet = (n, what) => (n ? `${n} ${what}` : '');
  const files = typeof resList === 'function' ? resList().length : 0;
  const extra = {
    inbox: { count: c.inbox || '', title: c.inbox ? `${c.inbox} to sort` : 'Quick capture lands here' },   // 24-quick-capture.js
    today: { count: c.today || '', countAlert: c.overdue > 0, title: c.overdue ? `${c.overdue} overdue` : '' },
    now: { count: c.now || '', title: 'What can I do now?', need: typeof doNowActive === 'function' && doNowActive() },   // 24-do-now.js
    week: { title: quiet(c.week, 'coming up') },
    all: { title: quiet(c.all, 'open') },
    'no-date': { title: quiet(c['no-date'], 'without a date') },
    waiting: { count: c.waiting || '', title: c.waiting ? `${c.waiting} waiting on someone` : 'Tasks waiting on someone', need: c.waiting > 0 },
    'tag:someday': { title: 'Tagged #someday: not now, not forgotten' + (c.someday ? ` (${c.someday})` : '') },
    triage: { count: pendingSugs || '', need: pendingSugs > 0 },
    files: { title: quiet(files, files === 1 ? 'file or link' : 'files and links') },
  };
  const rows = typeof _sbViewRows === 'function' ? _sbViewRows() : SB_VIEWS_FRONT.map(v => ({ view: v, label: viewTitle(v), icon: 'circle' }));
  return rows.map(r => Object.assign({ label: r.label, icon: r.icon, view: r.view }, extra[r.view] || {}));
}
registerSidebarBlock(['home', 'tasks'], {
  id: 'task-views', order: 10,
  render(el, ctx) {
    if (ctx.group === 'home') {
      // 2.19.5: Home's four pages (Today, Evening, Week, History) are here as well as the tabs at the top of Home
      // (HOME_TABS, 77-brief-review.js); the one you are on is lit in both places.
      const tabs = typeof HOME_TABS !== 'undefined' ? HOME_TABS : [['today', 'Today', 'sunrise'], ['evening', 'Evening', 'sunset'], ['week', 'Week', 'calendar-range'], ['history', 'History', 'history']];
      const on = /^home(:|$)/.test(String(state.view || '')) && typeof homeTabOf === 'function' ? homeTabOf(state.view) : '';
      const tips = { today: 'Your day: the story, your cards and the daily note', evening: 'An evening recap and your top 3 for tomorrow', week: 'A calm look back at your week, and a plan for the next', history: 'Your past reviews and recaps' };
      for (const [id, label, ic] of tabs) el.appendChild(sbNavItem({ label, icon: ic, view: id === 'today' ? 'home' : 'home:' + id, active: on === id, fresh: false, title: tips[id] || '' }));
      return;
    }
    const L = typeof sbLayout === 'function' ? sbLayout() : null;
    const place = (v) => (L && typeof sbViewPlacement === 'function' ? sbViewPlacement(v, L) : (SB_VIEWS_FRONT.includes(v) ? 'shown' : 'more'));
    const chosen = (v) => !!(L && Array.isArray(L.more) && L.more.includes(v));
    const front = [], more = [];
    for (const r of sbTaskViewRows(ctx.counts)) {
      const p = place(r.view);
      if (p === 'hidden' && state.view !== r.view) continue;
      // Promoted: it needs you (and you did not put it in More yourself), or you are on it.
      if (p === 'shown' || p === 'hidden' || state.view === r.view || (r.need && !chosen(r.view))) front.push(r); else more.push(r);
    }
    const row = (r) => (typeof sbTaskDrop === 'function' ? sbTaskDrop(sbNavItem(r), r.view) : sbNavItem(r));   // Today, No date and Logbook take a dragged task (30-task-row.js)
    for (const r of front) el.appendChild(row(r));
    const lists = typeof smartListsAll === 'function' ? smartListsAll().length : 1;
    const boards = typeof boardSavedList === 'function' ? boardSavedList().length : 1;
    // Together (2.18.1): the Together section hides while nothing is shared, so its way in stays here, always.
    const togEmpty = typeof tgOn === 'function' && tgOn() && typeof tgSpaces === 'function' && !tgSpaces().length && !tgInvites().length && !/^together(:|$)/.test(String(state.view || ''));
    if (!more.length && lists && boards && !togEmpty) return;
    const open = sbViewsMoreOpen();
    const fold = sbNavItem({ label: open ? 'Fewer views' : 'More views', icon: open ? 'chevron-up' : 'chevron-right', className: 'nav-more sb-views-more', active: false,
      title: open ? '' : more.map(r => r.label).join(', '), onClick: _sbViewsMoreToggle });
    fold.setAttribute('aria-expanded', open ? 'true' : 'false');
    el.appendChild(fold);
    if (!open) return;
    const box = document.createElement('div'); box.className = 'sb-views-more-list';
    for (const r of more) box.appendChild(row(r));
    if (togEmpty) box.appendChild(sbNavItem({ label: 'Together', icon: 'handshake', view: 'together', title: 'Lists you share with friends' }));
    // Nothing saved yet: the Smart lists and Boards headings stay away, and their first one starts here.
    if (!lists) box.appendChild(sbNavItem({ label: 'New smart list', icon: 'list-plus', className: 'nav-more', active: false, title: 'Any filter, grouping and view as one click', onClick: () => openSmartListEditor(null) }));
    if (!boards && typeof boardNewDialog === 'function') box.appendChild(sbNavItem({ label: 'New board', icon: 'square-kanban', className: 'nav-more', active: false, title: 'Columns your way: by status, priority, person, due date or your own', onClick: () => boardNewDialog() }));
    el.appendChild(box);
  },
});

/* ---------- Tasks: saved boards (owner: Boards; the block itself is boardsSidebarBlock in 33-board-ui.js) ----------
   No saved board yet: no heading (2.18: empty sections hide; "New board" waits under More views and in the palette). */
registerSidebarBlock('tasks', { id: 'boards', order: 15, render: (el, ctx) => (typeof boardsSidebarBlock === 'function' && (typeof boardSavedList !== 'function' || boardSavedList().length || String(state.view || '').startsWith('taskboard:')) ? boardsSidebarBlock(el, ctx) : false) });

/* ---------- Tasks: streams (empty ones folded away) ---------- */
// The Streams heading's +: Settings > Streams with the 'Add a stream' field focused.
function _sbNewStream() {
  setView('settings:streams');
  setTimeout(() => { const i = document.querySelector('input[aria-label="New stream name"]'); if (i) i.focus(); }, 60);
}
let _sbShowEmptyStreams = false;
const SB_STREAM_DEFAULTS = { sort: 'custom', show: 0 };   // the streams' own order, all of them (as before)
/** Streams' custom order is their own order (Settings > Streams, reorder_streams): a drag rewrites it. */
function _sbSaveStreamOrder(ids) {
  const L = typeof _ssList === 'function' ? _ssList() : (Array.isArray(state.streams) ? state.streams : []);
  const pos = new Map(ids.map((id, i) => [id, i]));
  const sorted = L.slice().sort((a, b) => (a.archived - b.archived) || ((pos.has(a.id) ? pos.get(a.id) : 1e6 + (a.order ?? 0)) - (pos.has(b.id) ? pos.get(b.id) : 1e6 + (b.order ?? 0))));
  sorted.forEach((x, i) => { x.order = i; });
  state.streams = sorted;
  applyStreams(state);
  saveData();
}
/** Totals and last activity per stream, tag and person (all tasks, done included), once per save. */
let _sbStatsKey = null, _sbStatsVal = null;
function sbStats() {
  const key = [state._lastSave || 0, (state.custom || []).length, Object.keys(state.deleted || {}).length].join('|');
  if (key === _sbStatsKey && _sbStatsVal) return _sbStatsVal;
  const tasks = getAllItems();
  const base = { isOpen: (t) => statusOf(t.id) !== 'done', activity: state.taskActivity || {}, completions: state.completionLog || {} };
  _sbStatsVal = {
    streams: sbTaskStats(tasks, Object.assign({ keysOf: (t) => [effStream(t)] }, base)),
    tags: sbTaskStats(tasks, Object.assign({ keysOf: (t) => effTags(t) }, base)),
    people: sbTaskStats(tasks, Object.assign({ keysOf: (t) => Array.isArray(t.people) ? t.people : [] }, base)),
  };
  _sbStatsKey = key;
  return _sbStatsVal;
}
registerSidebarBlock('tasks', {
  id: 'streams', order: 20,
  render(el, ctx) {
    const entries = Object.entries(STREAMS).filter(([, s]) => !s.archived).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
    if (!entries.length) return false;
    el.appendChild(sbSection({ title: 'Streams', collapsible: 'streams', actions: [sbListMenuAction('streams', SB_STREAM_DEFAULTS, 'streams'), { icon: 'plus', label: 'New stream', run: _sbNewStream }] }));
    czSectionHint(el, 'streams');
    if (sbIsCollapsed('streams')) return;
    const full = entries.filter(([k]) => ctx.counts.streams[k]);
    const empty = entries.filter(([k]) => !ctx.counts.streams[k] && state.view !== 'stream:' + k);
    // nothing open in a stream: folded away unless asked for (or nothing is open anywhere: list them all)
    const visible = entries.filter(([k]) => ctx.counts.streams[k] || _sbShowEmptyStreams || !full.length || state.view === 'stream:' + k);
    const st = sbStats().streams;
    sbOrderedList(el, {
      key: 'streams', noun: 'Streams', defaults: SB_STREAM_DEFAULTS,
      items: visible.map(([k, s]) => ({ id: k, label: s.label, open: ctx.counts.streams[k] || 0, total: (st.get(k) || {}).total || 0, recent: (st.get(k) || {}).recent || 0 })),
      custom: entries.map(([k]) => k),
      saveCustom: _sbSaveStreamOrder,
      keepId: state.view.startsWith('stream:') ? state.view.slice(7) : null,
      // Its marker (colour, symbol, shape) and the right-click menu: 28-customise.js. Drop a task on it to move it there (30-task-row.js).
      row: (it) => { const r = czMark(sbNavItem({ label: it.label, avatarHtml: `<span class="ic">${streamMarkHtml(it.id)}</span>`, view: 'stream:' + it.id, count: it.open || '' }), 'stream', it.id); return typeof sbTaskDrop === 'function' ? sbTaskDrop(r, 'stream:' + it.id) : r; },
    });
    if (empty.length && full.length) {
      el.appendChild(sbNavItem({
        label: _sbShowEmptyStreams ? 'Hide empty streams' : `${empty.length} empty stream${empty.length === 1 ? '' : 's'}`,
        icon: _sbShowEmptyStreams ? 'chevron-up' : 'chevron-right', className: 'nav-more', active: false,
        onClick: () => { _sbShowEmptyStreams = !_sbShowEmptyStreams; renderSidebar(); },
      }));
    }
  },
});

/* ---------- Tasks: top tags + "All tags" ---------- */
const SIDEBAR_TAG_LIMIT = 8;
registerSidebarBlock('tasks', {
  id: 'tags', order: 30,
  render(el, ctx) {
    const pinned = Array.isArray(state.pinnedTags) ? state.pinnedTags : [];
    const all = Object.entries(ctx.counts.tags);
    if (!all.length && !pinned.length) return false;
    const manage = () => setView('tags');
    el.appendChild(sbSection({ title: 'Tags', collapsible: 'tags', actions: [{ icon: 'sliders-horizontal', label: 'Manage tags', run: manage }] }));
    if (sbIsCollapsed('tags')) return;
    const top = [];
    for (const t of pinned) if (!top.includes(t)) top.push(t);
    for (const [t] of all.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) { if (top.length >= SIDEBAR_TAG_LIMIT) break; if (!top.includes(t)) top.push(t); }
    const cur = state.view.startsWith('tag:') ? state.view.slice(4) : null;
    if (cur && !top.includes(cur)) top.push(cur);
    // A tag's number is a total, not a thing to do: it sits in the tooltip (UX_BLUEPRINT.md 3, density).
    for (const t of top) el.appendChild(sbNavItem({ label: t, icon: 'hash', view: 'tag:' + t, title: ctx.counts.tags[t] ? `${ctx.counts.tags[t]} open` : '' }));
    const more = sbNavItem({ label: `All ${all.length} tags`, icon: 'tags', className: 'nav-more', view: 'tags', active: state.view === 'tags' });
    if (all.length > SIDEBAR_TAG_LIMIT) {
      const link = document.createElement('span'); link.className = 'link'; link.textContent = 'Clean up';
      more.appendChild(link);
    }
    el.appendChild(more);
  },
});

/* ---------- Tasks (and Home): people shortcut ---------- */
registerSidebarBlock('tasks', {
  id: 'people', order: 40,
  render(el, ctx) {
    const people = Array.isArray(state.people) ? state.people : [];
    el.appendChild(sbSection({
      title: 'People', collapsible: 'people',
      actions: [
        { icon: 'sparkles', label: 'Link tasks to people with AI', className: 'ai-only', run: () => aiAutoLinkPeople() },
        { icon: 'user-plus', label: 'Add person', run: () => addNewPerson() },
      ],
    }));
    if (sbIsCollapsed('people')) return;
    el.appendChild(sbNavItem({ label: 'All people', icon: 'users', view: 'people', count: people.filter(p => !p.self).length || '' }));
    // Shortcuts: pinned people first, then whoever has the most open tasks.
    const scored = people.filter(p => !p.self).map(p => ({ p, n: tasksForPerson(p.id).filter(i => statusOf(i.id) !== 'done').length }));
    const pick = scored.filter(x => x.p.pinned).concat(scored.filter(x => !x.p.pinned && x.n > 0).sort((a, b) => b.n - a.n)).slice(0, ctx.group === 'home' ? 3 : 5);
    const cur = state.view.startsWith('person:') ? state.view.slice(7) : null;
    if (cur && !pick.some(x => x.p.id === cur)) { const p = people.find(x => x.id === cur); if (p) pick.push({ p, n: 0 }); }
    for (const { p, n } of pick) {
      el.appendChild(sbNavItem({ label: p.name, avatarHtml: avatarHtml(p, 18), active: state.view === 'person:' + p.id, count: n || '', onClick: () => openPerson(p.id) }));
    }
  },
});

/* ---------- Calendar: mini month, calendars, countdowns ---------- */
let _sbCalCursor = null;          // first day of the month shown in the mini month
let _sbCalShown = null;           // the state.calMonth the mini month last followed
let _calSelectedDate = null;      // 'YYYY-MM-DD' picked in the mini month (Calendar section reads it)
function calendarSelectedDate() { return _calSelectedDate || todayStr(); }
function _weekStartIndex() {
  const ws = String(APP_CONFIG.weekStart || 'Mon').toLowerCase();
  return ws.startsWith('sun') ? 0 : ws.startsWith('sat') ? 6 : 1;
}
registerSidebarBlock('calendar', {
  id: 'minical', order: 10,
  render(el) {
    const today = todayStr();
    // Follow the month the Calendar section shows, unless the user is paging the mini month.
    // Entering the Calendar fresh (first load, or back from elsewhere): the section is about to
    // jump to the selected day (today by default), so follow that, not a month saved last session.
    const fresh = typeof _calSectionFresh !== 'undefined' && _calSectionFresh;
    const want = String(state.view).startsWith('calendar') ? (fresh ? calendarSelectedDate().slice(0, 7) : /^\d{4}-\d{2}$/.test(state.calMonth || '') ? state.calMonth : null) : null;
    if (want && want !== _sbCalShown) { const [yy, mm] = want.split('-').map(Number); _sbCalCursor = new Date(yy, mm - 1, 1); _sbCalShown = want; }
    if (!_sbCalCursor) { const [ty, tm] = today.split('-').map(Number); _sbCalCursor = new Date(ty, tm - 1, 1); }
    const y = _sbCalCursor.getFullYear(), m = _sbCalCursor.getMonth(); // clock-ok: wall date (the month shown)
    const locale = APP_CONFIG.locale || undefined;
    const ws = _weekStartIndex();
    const dueDays = new Set(getAllItems().filter(i => statusOf(i.id) !== 'done' && effDate(i)).map(i => effDate(i)));
    const wrap = document.createElement('div'); wrap.className = 'minical';
    const head = document.createElement('div'); head.className = 'minical-h';
    const title = document.createElement('span');
    title.textContent = _sbCalCursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const nav = document.createElement('span'); nav.className = 'hstack'; nav.style.gap = '0';
    nav.innerHTML = `<button type="button" class="btn-icon" data-d="-1" aria-label="Previous month">${icon('chevron-left')}</button><button type="button" class="btn-icon" data-d="1" aria-label="Next month">${icon('chevron-right')}</button>`;
    nav.querySelectorAll('button').forEach(b => { b.onclick = () => { _sbCalCursor = new Date(y, m + Number(b.dataset.d), 1); renderSidebar(); }; });
    head.append(title, nav);
    const grid = document.createElement('div'); grid.className = 'minical-g';
    const base = new Date(2024, 0, 7 + ws);   // a Sunday + offset
    for (let i = 0; i < 7; i++) {
      const w = document.createElement('span'); w.className = 'w';
      w.textContent = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i).toLocaleDateString(locale, { weekday: 'narrow' }); // clock-ok: wall date
      grid.appendChild(w);
    }
    const first = new Date(y, m, 1);
    const lead = (first.getDay() - ws + 7) % 7; // clock-ok: wall date
    const start = new Date(y, m, 1 - lead);
    const sel = calendarSelectedDate();
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i); // clock-ok: wall date
      if (i >= 35 && d.getMonth() !== m) break; // clock-ok: wall date
      const iso = fmtDate(d);
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'd' + (d.getMonth() !== m ? ' o' : '') + (iso === today ? ' t' : '') + (iso === sel && String(state.view).startsWith('calendar') ? ' sel' : '') + (dueDays.has(iso) ? ' has' : ''); // clock-ok: wall date
      b.textContent = String(d.getDate()); // clock-ok: wall date
      b.setAttribute('aria-label', d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }));
      b.onclick = () => {
        _calSelectedDate = iso;
        state.calMonth = iso.slice(0, 7);
        if (!emitShell('calendar:select-date', iso)) { if (state.view !== 'calendar') setView('calendar'); else { saveUI(); render(); } }
      };
      grid.appendChild(b);
    }
    wrap.append(head, grid);
    el.appendChild(wrap);
  },
});
registerSidebarBlock('calendar', {
  id: 'calendars', order: 20,
  render(el) {
    el.appendChild(sbSection({ title: 'Calendars' }));
    const rows = [
      { label: 'Google Calendar', c: 'var(--sw-blue)', src: GOOGLE_CONNECTED ? (GOOGLE_LIVE ? 'Live' : 'Snapshot') : 'Not connected', off: !GOOGLE_CONNECTED },
      { label: 'Task due dates', c: 'var(--sw-indigo)', src: 'OpenDash' },
      { label: 'Countdowns', c: 'var(--sw-amber)', src: 'OpenDash' },
    ];
    for (const r of rows) {
      const row = document.createElement('div'); row.className = 'calrow';
      row.style.setProperty('--c', r.c);
      row.innerHTML = `<span class="cb${r.off ? ' off' : ''}">${r.off ? '' : icon('check')}</span><span>${esc(r.label)}</span><span class="src">${esc(r.src)}</span>`;
      el.appendChild(row);
    }
  },
});
// At most 12 rows in a sidebar before a fold (UX_BLUEPRINT.md 3): the first countdowns, then "N more".
const SB_COUNTDOWN_LIMIT = 6;
let _sbAllCountdowns = false;
registerSidebarBlock('calendar', {
  id: 'cal-countdowns', order: 30,
  render(el) {
    // Only dated, shown widgets (the top bar also holds live ones: tasks, next event, clock).
    const list = (typeof tbList === 'function' ? tbList() : (Array.isArray(state.countdowns) ? state.countdowns : [])).filter(c => c.date && c.visible !== false);
    if (!list.length) return false;
    // 2.19.1: folded at first, the top bar already counts them down (the Calendars list below still shows or hides them on the grid)
    el.appendChild(sbSection({ title: 'Countdowns', collapsible: 'cal-countdowns' }));
    if (sbIsCollapsed('cal-countdowns')) return;
    const fold = list.length > SB_COUNTDOWN_LIMIT + 1;
    for (const c of fold && !_sbAllCountdowns ? list.slice(0, SB_COUNTDOWN_LIMIT) : list) {
      const d = daysUntil(c.date);
      // Same number and unit as the widget in the top bar (15w, 79d, 40%), in the widget's colour.
      let count = d === null ? '' : d < 0 ? `${-d}d ago` : `${d}d`;
      if (typeof tbCompute === 'function') {
        try { const v = tbCompute(c); if (v.num) count = /^\d/.test(v.num) && v.unit && v.unit.length <= 3 ? `${v.num}${v.unit}` : `${v.num}${v.unit ? ' ' + v.unit : ''}`; } catch (e) { /* keep the day count */ }
      }
      const item = sbNavItem({
        label: c.label || 'Untitled', icon: _isIconName(c.icon) ? c.icon : 'hourglass', active: false,
        count, onClick: () => openCountdownEditor(c.id),
      });
      const ic = item.querySelector('.ic');
      if (ic && typeof tbColorAttrs === 'function') {
        const col = tbColorAttrs(c.color);
        ic.classList.add('sb-cd-ic');
        if (col.cls) ic.classList.add(col.cls);
        if (col.style) ic.setAttribute('style', col.style);
      }
      el.appendChild(item);
    }
    if (fold) {
      const n = list.length - SB_COUNTDOWN_LIMIT;
      el.appendChild(sbNavItem({ label: _sbAllCountdowns ? 'Fewer countdowns' : `${n} more countdown${n === 1 ? '' : 's'}`,
        icon: _sbAllCountdowns ? 'chevron-up' : 'chevron-right', className: 'nav-more', active: false,
        onClick: () => { _sbAllCountdowns = !_sbAllCountdowns; renderSidebar(); } }));
    }
  },
});

/* ---------- Money: the page's five tabs (2.19.5: in the sidebar as well as the tabs in the page header) ----------
   Overview, Spending, Cash flow, Budgets and Transactions (FinanceView.groups); Expenses follows (66-expenses-1page.js).
   The tab you are on is lit here and in the header. A tab opens the section you last used in it (FinanceView.openGroup). */
registerSidebarBlock('finance', {
  id: 'finance-sections', order: 10,
  render(el) {
    const FV = window.FinanceView;
    if (!FV) return false;
    let groups = [], cur = '';
    try { groups = typeof FV.groups === 'function' ? FV.groups() : []; if (state.view === 'finance' && typeof FV.group === 'function') cur = FV.group(); } catch (e) { groups = []; }
    if (!groups.length) { el.appendChild(sbNavItem({ label: 'Money', icon: 'wallet', view: 'finance', active: state.view === 'finance', title: 'Overview, spending, cash flow, budgets and transactions' })); return; }
    for (const g of groups) {
      el.appendChild(sbNavItem({ label: g.label, icon: g.icon, active: state.view === 'finance' && cur === g.id, fresh: false, title: g.id === 'overview' ? 'My money, the Money brief and the money story' : '',
        onClick: () => { if (state.view !== 'finance') setView('finance'); try { FV.openGroup(g.id); } catch (e) { console.error('[finance] openGroup', e); } if (typeof renderSidebar === 'function') renderSidebar(); } }));
    }
  },
});
