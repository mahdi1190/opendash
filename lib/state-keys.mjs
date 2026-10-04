// lib/state-keys.mjs - which top-level state keys are "UI" rather than "data".
//
// UI keys (where you are, what is open, display prefs, caches) change all the
// time while you click around. They are saved, but:
//   - the page does not make undo steps for them (saveUI, not saveData);
//   - the server does not make backups when only they changed.
// The page keeps its own copy of this list in src/app/01-core-state.js
// (UI_STATE_KEYS); tests/state-keys.test.mjs fails if the two drift apart.

export const UI_STATE_KEYS = Object.freeze([
  'view', 'viewMode', 'selectedTaskId', 'calMonth', 'weekBarOffset', '_snappedFor',
  'sortBy', 'groupBy', 'theme', 'density', 'focus', 'sidebarCollapsed',
  'collapsedSidebar', 'personEditMode', 'calCache', 'peopleEmailCache', 'autoTheme',
  'lastReviewPrompt', '_lastBackup', 'taskViewPrefs', 'calPrefs', 'peopleView',
  'openItemsIn', 'itemHero', 'paneSizes',
  'homeUI',   // Home: which Focus cards are expanded (src/app/12-home.js)
  'suggestStats',   // Suggestions: local counts (shown / used / dismissed per rule; src/app/68-suggest-*.js), never sent anywhere
  'achievements',   // Achievements: the unlocks and noted moments (src/app/78-achievements.js); never an undo step
  'sidebarLists',   // Sidebar Streams / Tags / People: sort and how many show (15-nav-order.js); the custom order is data (sidebarOrder)
]);

// Bookkeeping: never part of an undo snapshot or a data comparison.
export const BOOKKEEPING_KEYS = Object.freeze(['_lastSave', '_saveCount', '_localDirty']);

const SKIP = new Set([...UI_STATE_KEYS, ...BOOKKEEPING_KEYS]);

/** The data part of a state object, as a stable JSON string (for comparisons). */
export function dataFingerprint(state) {
  if (!state || typeof state !== 'object') return '';
  const keys = Object.keys(state).filter(k => !SKIP.has(k)).sort();
  return JSON.stringify(keys.map(k => [k, state[k]]));
}

/** Everything except bookkeeping, as a stable JSON string. */
export function fullFingerprint(state) {
  if (!state || typeof state !== 'object') return '';
  const keys = Object.keys(state).filter(k => !BOOKKEEPING_KEYS.includes(k)).sort();
  return JSON.stringify(keys.map(k => [k, state[k]]));
}

// Retired features: what an older state file can still hold for them.
// Brainstorm boards (and their canvas) were retired: migration
// 080-remove-boards archives this from the live state, and data imports and
// backup restores leave it out.
export const RETIRED_STATE_KEYS = Object.freeze(['boards', 'boardCollapsed', 'canvasConnect']);

/**
 * Take the retired boards data out of `state` (in place): the keys above,
 * deleted boards waiting in the bin (kind 'board'), the folded "Boards"
 * sidebar heading, and a board view (-> Home). Returns what was removed,
 * or null when there was nothing.
 */
export function dropRetiredState(state) {
  if (!state || typeof state !== 'object') return null;
  const out = {};
  for (const k of RETIRED_STATE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(state, k)) { out[k] = state[k]; delete state[k]; }
  }
  const isBoard = (t) => !!t && typeof t === 'object' && t.kind === 'board';
  if (state.bin && Array.isArray(state.bin.tasks) && state.bin.tasks.some(isBoard)) {
    out.binnedBoards = state.bin.tasks.filter(isBoard);
    state.bin.tasks = state.bin.tasks.filter(t => !isBoard(t));
  }
  if (Array.isArray(state.custom) && state.custom.some(isBoard)) {
    out.boardTasks = state.custom.filter(isBoard);
    state.custom = state.custom.filter(t => !isBoard(t));
  }
  const cs = state.collapsedSidebar;
  if (cs && typeof cs === 'object' && Object.prototype.hasOwnProperty.call(cs, 'boards')) {
    out.collapsedSidebar = { boards: cs.boards };
    delete cs.boards;
  }
  if (typeof state.view === 'string' && state.view.startsWith('board:')) { out.view = state.view; state.view = 'home'; }
  return Object.keys(out).length ? out : null;
}
