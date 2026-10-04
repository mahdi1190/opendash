// Fill in every field the app expects. Runs at load AND whenever `state`
// is replaced wholesale (e.g. adopting a newer state file), because the
// persisted file deliberately omits transient caches like calCache — and
// a missing one crashed renderCalendarEvents.
function ensureStateDefaults(s) {
  s.statuses        = s.statuses        || {};
  s.notes           = s.notes           || {};
  s.dateOverrides   = s.dateOverrides   || {};
  s.taskOverrides   = s.taskOverrides   || {};
  s.deleted         = s.deleted         || {};
  s.custom          = s.custom          || [];
  s.bin             = s.bin             || { tasks: [], notes: [] };
  if (!Array.isArray(s.bin.tasks)) s.bin.tasks = [];
  if (!Array.isArray(s.bin.notes)) s.bin.notes = [];
  s.view            = s.view            || 'today';
  if (String(s.view).startsWith('board:')) s.view = 'home';   // boards were retired (migration 080)
  if (typeof viewAlias === 'function') s.view = viewAlias(s.view);   // the old Review pages are Home's tabs
  s.viewMode        = s.viewMode        || 'list';
  s.sortBy          = s.sortBy          || 'date';
  s.groupBy         = s.groupBy         || 'auto';
  s.selectedTaskId  = s.selectedTaskId  || null;
  s.pinned          = s.pinned          || {};
  s.theme           = s.theme           || (APP_CONFIG.theme.default === 'dark' ? 'dark' : 'light');
  s.density         = s.density         || 'normal';
  s.focus           = !!s.focus;
  s.archiveDays     = s.archiveDays     || 7;
  s.completionLog   = s.completionLog   || {};   // { taskId: [ts, ts, ...] }
  s.customOrder     = s.customOrder     || {};   // { viewKey: [taskId, ...] }
  s.calCache        = s.calCache        || { fetched: 0, events: [], err: null };
  s.calMonth        = s.calMonth        || (() => { try { return Clock.today().slice(0, 7); } catch (e) { return ''; } })();   // '' at first load (before 07-core-clock.js): the views fill it in
  s.weekBarOffset   = s.weekBarOffset   || 0;
  // Countdowns are user data (first one = topbar headline). A fresh install
  // starts with none; existing state keeps whatever it already has.
  s.countdowns      = Array.isArray(s.countdowns) ? s.countdowns : [];
  s.collapsedSidebar = s.collapsedSidebar || {};
  s.personEditMode   = s.personEditMode   || false;
  s.sidebarCollapsed = !!s.sidebarCollapsed;
  s.emailTriage      = s.emailTriage      || { emails: [], suggestions: [], lastFetched: 0, daysWindow: 7 };
  s.taskChat         = s.taskChat         || {};
  s.taskActivity     = s.taskActivity     || {};      // {taskId: [{id, ts, type, from, to, reason, ...}]}      // { taskId: [{role, text, ts}] }
  s.taskTemplates    = s.taskTemplates    || [];      // [{id, name, title, stream, priority, tags, detail, subtasks}]
  s.weeklyReviews    = s.weeklyReviews    || [];      // [{ts, week, answers}]
  s.lastReviewPrompt = s.lastReviewPrompt || 0;
  s.autoTheme        = s.autoTheme        ?? !!APP_CONFIG.theme.auto;
  s._saveCount      = s._saveCount      || 0;
  s._lastBackup     = s._lastBackup     || 0;
  s.people          = s.people          || [];
  s.peopleNotes     = s.peopleNotes     || {};
  s.peopleEmailCache = s.peopleEmailCache || {};
  if (!s.daynotes || typeof s.daynotes !== 'object' || Array.isArray(s.daynotes)) s.daynotes = {};   // Home's Daily note: {'YYYY-MM-DD': {md, updatedAt}} (12-home-daynotes.js)
  s._lastSave       = s._lastSave       || 0;
  // streams / quickTemplates are optional: absent means the generic defaults
  // (see 00-core-constants.js). Rebuild the STREAMS/TEMPLATES lookups.
  applyStreams(s);
  return s;
}

let state = ensureStateDefaults(loadState());


// Migrate string notes → array
for (const id in state.notes) {
  const v = state.notes[id];
  if (typeof v === 'string') state.notes[id] = v.trim() ? [{ id: 'n-legacy-' + id, ts: Date.now(), text: v }] : [];
  else if (!Array.isArray(v)) state.notes[id] = [];
}

// Migration v2: bake remaining taskOverrides/dateOverrides into the matching
// state.custom entry. Post-collapse, all edits write directly to the entry.
if (!state._overridesMigrated_v1) {
  let baked = 0;
  for (const id in (state.taskOverrides || {})) {
    const item = state.custom.find(c => c.id === id);
    if (!item) continue;
    const ovr = state.taskOverrides[id];
    for (const k of ['title','stream','detail','priority','tags','subtasks','recurrence','people']) {
      if (ovr[k] !== undefined) { item[k] = ovr[k]; baked++; }
    }
  }
  for (const id in (state.dateOverrides || {})) {
    const item = state.custom.find(c => c.id === id);
    if (item) { item.dueDate = state.dateOverrides[id]; baked++; }
  }
  state.taskOverrides = {};
  state.dateOverrides = {};
  state._overridesMigrated_v1 = true;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  if (baked > 0) console.log(`[migration v2] baked ${baked} override fields into state.custom`);
}

let multiSelect = { active: false, ids: new Set() };
let searchQuery = '';
// Anchor for shift+click range-select; updated on plain or ctrl+click in a list view.
let _lastSelectedTaskId = null;
// Order of currently-rendered task IDs in the main view (used for range-select + Ctrl+A).
let _lastRenderedTaskIds = [];
// Task rows that are currently inline-expanded (double-click to toggle). Transient — not persisted.
let _expandedTaskIds = new Set();

