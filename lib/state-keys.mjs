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
  // ── game ── (2.16: levels, streaks, quests, focus timer, records; src/app/92-game-*.js); never an undo step
  'game',
  // ── end game ──
  // ── profile ── (2.17: your profile and avatar; src/app/97-profile-*.js); never an undo step
  'profile',
  // ── end profile ──
  // ── local ── (2.16: what the page kept in this browser's localStorage; src/app/06-core-seen.js)
  'seen',      // seen / played / dismissed flags (the brief, stories, confetti, one-off cards, the opening rotation, moments shown)
  'uiPrefs',   // preferences the page used to keep per browser (story player, animation intensity, assistant model, a running focus block)
  'drafts',    // work in progress (the weekly review before it is saved)
  // ── end local ──
  // ── together ── (2.17: shared spaces with friends, src/app/99-together-*.js: layer and leaderboard choices, moments already celebrated); never an undo step
  'together',
  // ── end together ──
]);

// UI keys that are PREFERENCES: they follow the person to every computer
// (lib/sync/manifest.mjs syncs them) and to every tab (src/app/86-live-sync.js
// takes them from a newer copy like data), but they still make no undo step
// and no backup. The other UI keys belong to one tab or screen (where you
// are, panel sizes, caches). The page keeps the same list (SHARED_UI_KEYS).
export const SHARED_UI_KEYS = Object.freeze([
  'sortBy', 'groupBy', 'theme', 'density', 'collapsedSidebar', 'autoTheme',
  'taskViewPrefs', 'calPrefs', 'peopleView', 'openItemsIn', 'itemHero',
  'homeUI', 'achievements', 'sidebarLists',
  // 2.16: the rest of the layout follows the person too (lib/sync/manifest.mjs '── prefs ──')
  'viewMode', 'focus', 'sidebarCollapsed', 'paneSizes', 'lastReviewPrompt', 'suggestStats',
  // ── game ── (2.16: the game follows the person; lib/sync/manifest.mjs '── game ──')
  'game',
  // ── end game ──
  // ── profile ── (2.17: the profile follows the person; lib/sync/manifest.mjs '── profile ──')
  'profile',
  // ── end profile ──
  // ── local ── (2.16: flags, preferences and drafts that used to be per browser; lib/sync/manifest.mjs '── local ──')
  'seen', 'uiPrefs', 'drafts',
  // ── end local ──
  // ── together ── (2.17: your Together choices follow you; lib/sync/manifest.mjs '── together ──')
  'together',
  // ── end together ──
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
