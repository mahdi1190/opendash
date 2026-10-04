/* ============================================================
   STORAGE / STATE
   ============================================================ */
// Browser storage key: a fast first-paint cache of the state. The state file
// on the server is the source of truth, so a browser with an empty cache just
// loads the file. (The pre-2.0 key is no longer read.)
const STORAGE_KEY = 'dashboard-state-v1';
const LEGACY_STORAGE_KEYS = [];
let _toastTimer = null;
function showToast(msg, isError) {
  // v2 shell: route to the design-system toast (11-ui-kit.js); a leading
  // glyph such as a tick or warning sign becomes the toast's icon.
  if (typeof toast === 'function' && document.getElementById('toast-host')) {
    const s = String(msg == null ? '' : msg);
    // Routine "saved" ticks show in the top bar's save status, not as a toast.
    if (!isError && /^[^\p{L}]*saved$/u.test(s)) { if (typeof renderSaveStatus === 'function') renderSaveStatus(); return; }
    const lead = (s.match(/^[^\p{L}\p{N}"'(]+/u) || [''])[0];
    const text = s.slice(lead.length) || s;
    const warn = /⚠/.test(lead);
    toast(text.charAt(0).toUpperCase() + text.slice(1), isError ? { kind: 'err' } : warn ? { icon: 'triangle-alert' } : /[✓✔]/.test(lead) ? { kind: 'ok' } : {});
    return;
  }
  const el = document.getElementById('save-toast'); if (!el) return;
  el.textContent = msg;
  el.className = 'save-toast show' + (isError ? ' error' : '');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = 'save-toast' + (isError ? ' error' : ''); }, 900);
}
const loadState = () => {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    try { const s = JSON.parse(localStorage.getItem(key)); if (s && typeof s === 'object') return s; }
    catch (e) { /* try the next key */ }
  }
  return {};
};

// ─── Saving: data vs UI ─────────────────────────────────────────────────
// UI keys (where you are, what is open, display prefs, caches) change on every
// click. They must not create undo steps or server backups. The server keeps
// the same list in lib/state-keys.mjs (tests check they match).
const UI_STATE_KEYS = [
  'view', 'viewMode', 'selectedTaskId', 'calMonth', 'weekBarOffset', '_snappedFor',
  'sortBy', 'groupBy', 'theme', 'density', 'focus', 'sidebarCollapsed',
  'collapsedSidebar', 'personEditMode', 'calCache', 'peopleEmailCache', 'autoTheme',
  'lastReviewPrompt', '_lastBackup', 'taskViewPrefs', 'calPrefs', 'peopleView',
  'openItemsIn', 'itemHero', 'paneSizes',
  'homeUI',   // Home: which Focus cards are expanded (12-home.js)
];
const BOOKKEEPING_KEYS = ['_lastSave', '_saveCount', '_localDirty'];
const _NON_DATA_KEYS = new Set([...UI_STATE_KEYS, ...BOOKKEEPING_KEYS]);
// Retired features (brainstorm boards): an older backup's data for them is
// left out when it is imported. Same list in lib/state-keys.mjs.
const RETIRED_STATE_KEYS = ['boards', 'boardCollapsed', 'canvasConnect'];

function _writeLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

/**
 * Save a DATA change (tasks, notes, people, countdowns...): one undo
 * step, browser storage, and a debounced write to the server.
 */
function saveData() {
  try {
    _captureUndo();
    state._saveCount = (state._saveCount || 0) + 1;
    state._localDirty = true;
    _writeLocal();
    showToast('✓ saved', false);
    maybeAutoBackup();
    if (typeof schedulePersist === 'function') schedulePersist();
  }
  catch (e) { showToast('⚠ save failed', true); }
}
/**
 * Save a UI change (view, selection, sort, theme, calendar month, caches): no
 * undo step and no toast; browser storage now, the server later (slow
 * debounce, and only if something it stores actually changed).
 */
function saveUI() {
  try { _writeLocal(); if (typeof schedulePersistUI === 'function') schedulePersistUI(); }
  catch (e) { /* storage full or blocked: the next data save reports it */ }
}
// Legacy name, kept so older call sites keep working: it means saveData().
// New code calls saveData() or saveUI() explicitly.
const saveState = (s) => saveData();

// Undo/redo keeps snapshots of the DATA part of state only. Restoring one
// patches the data keys back and keeps the live UI and bookkeeping
// (_lastSave in particular: restoring an old _lastSave made the next save
// look stale to the server, which then threw the undo and the next edit away).
const _undoStack = [];
const _redoStack = [];
const UNDO_LIMIT = 50;
let _prevSnapshot = null;
function _dataSnapshot() {
  const o = {};
  for (const k of Object.keys(state)) if (!_NON_DATA_KEYS.has(k)) o[k] = state[k];
  return JSON.stringify(o);
}
function _restoreDataSnapshot(json) {
  const d = JSON.parse(json);
  for (const k of Object.keys(state)) if (!_NON_DATA_KEYS.has(k)) delete state[k];
  Object.assign(state, d);
  ensureStateDefaults(state);
  if (state.selectedTaskId && !getItem(state.selectedTaskId)) state.selectedTaskId = null;
}
function _captureUndo() {
  const cur = _dataSnapshot();
  if (_prevSnapshot && _prevSnapshot !== cur) {
    _undoStack.push(_prevSnapshot);
    if (_undoStack.length > UNDO_LIMIT) _undoStack.shift();
    _redoStack.length = 0;
  }
  _prevSnapshot = cur;
}
function _afterUndoRedo(msg) {
  _prevSnapshot = _dataSnapshot();
  state._localDirty = true;
  try { _writeLocal(); } catch (e) {}
  if (typeof schedulePersist === 'function') schedulePersist();
  render();
  showToast(msg, false);
}
function undo() {
  if (_undoStack.length === 0) { showToast('Nothing to undo', false); return; }
  _redoStack.push(_dataSnapshot());
  _restoreDataSnapshot(_undoStack.pop());
  _afterUndoRedo('↶ undone');
}
function redo() {
  if (_redoStack.length === 0) { showToast('Nothing to redo', false); return; }
  _undoStack.push(_dataSnapshot());
  _restoreDataSnapshot(_redoStack.pop());
  _afterUndoRedo('↷ redone');
}
/** Forget undo history (after a restore or adopting another copy of the state). */
function resetUndoHistory() { _undoStack.length = 0; _redoStack.length = 0; _prevSnapshot = _dataSnapshot(); }

function backupFilename() {
  const d = new Date();
  return `opendash-backup-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.json`;
}
function downloadBackup(silent) {
  const json = JSON.stringify(typeof _stateForPersist === 'function' ? _stateForPersist() : state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = backupFilename();
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  state._lastBackup = Date.now();
  saveUI();
  if (!silent) showToast('✓ backed up — saved to Downloads', false);
}
let _autoBackupTimer = null;
function maybeAutoBackup() {
  // With the local server running, it keeps rolling + daily backups in
  // <data>/state/backups, so the browser does not also fill Downloads.
  if (typeof _serverAvailable !== 'undefined' && _serverAvailable) return;
  // Without a server: one JSON download per 24h as a safety net.
  const sinceLast = Date.now() - (state._lastBackup || 0);
  if (sinceLast > 24 * 3600 * 1000) {
    if (_autoBackupTimer) clearTimeout(_autoBackupTimer);
    _autoBackupTimer = setTimeout(() => downloadBackup(true), 2000);
  }
}
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof data !== 'object' || !data || Array.isArray(data)) throw new Error('Not a JSON object');
      if (!Array.isArray(data.custom)) throw new Error('This file has no task list, so it is not an OpenDash backup.');
      const when = data._lastSave ? new Date(data._lastSave).toLocaleString() : 'an unknown date';
      if (!confirm(`Replace your current OpenDash data with this backup?\n\nFile: ${file.name}\nBackup from ${when}: ${data.custom.length} tasks (you have ${state.custom.length} now).\nThis will overwrite any unsaved local changes.`)) return;
      for (const k of RETIRED_STATE_KEYS) delete data[k];
      if (data.bin && Array.isArray(data.bin.tasks)) data.bin.tasks = data.bin.tasks.filter(t => !(t && t.kind === 'board'));
      // Preserve current view if not in backup
      const view = data.view || state.view;
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, data);
      state.view = view;
      ensureStateDefaults(state);   // also sends a retired board view to Home
      // A restore is a deliberate replace: make it the newest save so it reaches
      // the file (and isn't undone by the file on the next load).
      state._lastSave = Date.now();
      state._localDirty = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      resetUndoHistory();
      if (typeof schedulePersist === 'function') schedulePersist(0);
      showToast('✓ restored from backup', false);
      render();
    } catch (err) {
      alert('Failed to import: ' + err.message);
    }
  };
  reader.readAsText(file);
}
