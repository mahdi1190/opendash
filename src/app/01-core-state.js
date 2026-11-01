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
  'suggestStats',   // Suggestions: local counts (68-suggest-*.js), never sent anywhere
  'achievements',   // Achievements: the unlocks (78-achievements.js); never an undo step
  'sidebarLists',   // Sidebar Streams / Tags / People: sort and how many show (15-nav-order.js); the custom order is data (sidebarOrder)
  // ── game ── (2.16: levels, streaks, quests, the focus timer, records: 92-game-*.js); never an undo step
  'game',
  // ── end game ──
  // ── profile ── (2.17: your profile and avatar, 97-profile-*.js); never an undo step (the builder has its own)
  'profile',
  // ── end profile ──
  // ── wardrobe ── (2.18: your saved outfits, 97-profile-4wardrobe.js); never an undo step (Undo is in the toast)
  'wardrobe',
  // ── end wardrobe ──
  // ── pets ── (2.18: your companion pet, 97-pets-*.js); never an undo step
  'pet',
  // ── end pets ──
  // ── local ── (2.16: what this page kept in localStorage, now in the state: 06-core-seen.js)
  'seen', 'uiPrefs', 'drafts',
  // ── end local ──
  // ── together ── (2.17: shared spaces with friends, 99-together-*.js); never an undo step
  'together',
  // ── end together ──
  // ── garden ── (2.18: the garden game, 94-garden-*.js); never an undo step (the garden has its own Undo)
  'garden',
  // ── end garden ──
];
// UI keys that are PREFERENCES (theme, density, sort, the calendars you hide...):
// they follow you to your other computers (folder sync) and to every tab (live
// sync takes them from a newer copy, 86-live-sync.js), still without undo steps.
// The rest belong to this tab: where you are, panel sizes, caches.
const SHARED_UI_KEYS = [
  'sortBy', 'groupBy', 'theme', 'density', 'collapsedSidebar', 'autoTheme',
  'taskViewPrefs', 'calPrefs', 'peopleView', 'openItemsIn', 'itemHero',
  'homeUI', 'achievements', 'sidebarLists',
  // 2.16: the rest of the layout follows you too (one change here, the same change there)
  'viewMode', 'focus', 'sidebarCollapsed', 'paneSizes', 'lastReviewPrompt', 'suggestStats',
  // ── game ── your level, streaks and quests follow you too (92-game-*.js)
  'game',
  // ── end game ──
  // ── profile ── your profile and avatar follow you too (97-profile-*.js)
  'profile',
  // ── end profile ──
  // ── wardrobe ── your saved outfits follow you too (97-profile-4wardrobe.js)
  'wardrobe',
  // ── end wardrobe ──
  // ── pets ── your pet follows you too (97-pets-*.js)
  'pet',
  // ── end pets ──
  // ── local ── seen flags, per-browser preferences and drafts follow you too (06-core-seen.js)
  'seen', 'uiPrefs', 'drafts',
  // ── end local ──
  // ── together ── your Together choices follow you too (99-together-*.js)
  'together',
  // ── end together ──
  // ── garden ── your garden follows you too (94-garden-*.js)
  'garden',
  // ── end garden ──
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
    // Browser storage is only a first-paint cache (about 5 MiB per site). When it
    // is full (QuotaExceededError) the edit must still be queued for the server.
    let localOk = true;
    try { _writeLocal(); } catch (e) { localOk = false; }
    if (typeof schedulePersist === 'function') schedulePersist();
    if (localOk) showToast('✓ saved', false);
    else _saveLocalFull();
    maybeAutoBackup();
  }
  catch (e) { showToast('Your last change could not be saved in this browser. Keep this page open and try again in a moment.', true); }
}
let _localFullToastAt = 0;
/** Browser storage refused the copy: say where the edit went (at most once a minute). */
function _saveLocalFull() {
  const server = typeof _serverAvailable === 'undefined' || _serverAvailable;
  if (!server) { showToast('Your last change could not be saved: this browser’s storage is full and Freeflo isn’t running. Open Freeflo from your shortcut, and keep this page open until it says Saved.', true); return; }
  if (Date.now() - _localFullToastAt < 60000) return;
  _localFullToastAt = Date.now();
  showToast('This browser’s storage is full, but your change is safely saved in Freeflo', false);
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
// The AI chats (70-ai-chats.js) are data that never makes an undo step and is
// never rolled back by one: undoing a task edit must not take back a message,
// a reply from another computer or a proposal's Applied.
const _NO_UNDO_KEYS = new Set(['taskChat', 'assistantChat', 'chatMeta', 'chatArchive',
  'memories',   // ── memories ── the journal, time capsules, postcards (93-memories-core.js): written in the evening by themselves, never rolled back
]);
function _dataSnapshot() {
  const o = {};
  for (const k of Object.keys(state)) if (!_NON_DATA_KEYS.has(k) && !_NO_UNDO_KEYS.has(k)) o[k] = state[k];
  return JSON.stringify(o);
}
function _restoreDataSnapshot(json) {
  const d = JSON.parse(json);
  for (const k of Object.keys(state)) if (!_NON_DATA_KEYS.has(k) && !_NO_UNDO_KEYS.has(k)) delete state[k];
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
function _afterUndoRedo(msg, other) {
  _prevSnapshot = _dataSnapshot();
  state._localDirty = true;
  try { _writeLocal(); } catch (e) {}
  if (typeof schedulePersist === 'function') schedulePersist();
  render();
  // "Undone" offers Redo (and "Redone" offers Undo), so a slip of Ctrl+Z is one click to put back.
  if (other && typeof toast === 'function' && document.getElementById('toast-host')) toast(msg, { icon: other === 'redo' ? 'undo-2' : 'redo-2', action: { label: other === 'redo' ? 'Redo' : 'Undo again', run: other === 'redo' ? redo : undo } });
  else showToast(msg, false);
}
function undo() {
  if (_undoStack.length === 0) { showToast('Nothing to undo', false); return; }
  _redoStack.push(_dataSnapshot());
  _restoreDataSnapshot(_undoStack.pop());
  _afterUndoRedo('Undone', 'redo');
}
function redo() {
  if (_redoStack.length === 0) { showToast('Nothing to redo', false); return; }
  _undoStack.push(_dataSnapshot());
  _restoreDataSnapshot(_redoStack.pop());
  _afterUndoRedo('Redone', 'undo');
}
/**
 * "Undo" buttons in toasts undo THEIR change, not whatever happened last.
 * undoMark() is taken just after the change is saved; undoMarked(mark):
 *   - nothing happened since: the plain undo() (so Redo still works);
 *   - other edits since (yours, a sync, a background job): only what that
 *     change touched is put back, down to the task, person or field
 *     (_undoRevert3), when nothing since touched the same thing; otherwise
 *     it says so calmly and leaves everything as it is.
 * Ctrl+Z (undo/redo) is unchanged: one step back at a time.
 */
function undoMark() {
  return { before: _undoStack.length ? _undoStack[_undoStack.length - 1] : null, after: _prevSnapshot, depth: _undoStack.length };
}
function _undoSame(x, y) { return x === y || JSON.stringify(x) === JSON.stringify(y); }
function _undoIsObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
/** Every entry an object with its own id (tasks, people, notes, subtasks, countdowns...). */
function _undoIdKeyed(arr) {
  const seen = new Set();
  for (const e of arr) {
    if (!_undoIsObj(e) || (typeof e.id !== 'string' && typeof e.id !== 'number')) return false;
    const k = String(e.id); if (seen.has(k)) return false; seen.add(k);
  }
  return true;
}
/**
 * Take the change b -> a back out of c (c = a plus whatever happened later),
 * touching only what that change touched. -> {ok, v}; ok false when a later
 * change touched the same entry (the same field of the same task...).
 * Objects go key by key, id lists entry by entry, other lists by value.
 */
function _undoRevert3(b, a, c) {
  if (_undoSame(a, c)) return { ok: true, v: b };     // nothing later here: as it was before
  if (_undoSame(b, a)) return { ok: true, v: c };     // this change did not touch it
  if (_undoSame(b, c)) return { ok: true, v: c };     // already back as it was
  if (_undoIsObj(b) && _undoIsObj(a) && _undoIsObj(c)) {
    const out = Object.assign({}, c);
    for (const k of new Set([...Object.keys(b), ...Object.keys(a), ...Object.keys(c)])) {
      const r = _undoRevert3(b[k], a[k], c[k]);
      if (!r.ok) return r;
      if (r.v === undefined) delete out[k]; else out[k] = r.v;
    }
    return { ok: true, v: out };
  }
  if (!Array.isArray(b) || !Array.isArray(a) || !Array.isArray(c)) return { ok: false };
  if (_undoIdKeyed(b) && _undoIdKeyed(a) && _undoIdKeyed(c)) {
    const id = (e) => String(e.id);
    const B = new Map(b.map(e => [id(e), e])), A = new Map(a.map(e => [id(e), e])), Cids = new Set(c.map(id));
    const both = (x, Y) => x.map(id).filter(k => Y.has(k));
    const moved = !_undoSame(both(b, A), both(a, B));   // this change reordered entries
    if (moved && !_undoSame(a.map(id), c.map(id))) return { ok: false };
    const out = [];
    for (const e of c) {
      const k = id(e);
      if (!A.has(k)) { if (B.has(k)) return { ok: false }; out.push(e); continue; }   // added later: kept
      const r = _undoRevert3(B.get(k), A.get(k), e);
      if (!r.ok) return r;
      if (r.v !== undefined) out.push(r.v);                // added by this change (and untouched since): goes
    }
    for (const [k, e] of A) if (!Cids.has(k)) { const r = _undoRevert3(B.get(k), e, undefined); if (!r.ok) return r; }   // removed later
    // What this change removed comes back where it was.
    b.forEach((e, bi) => {
      const k = id(e);
      if (A.has(k) || out.some(x => id(x) === k)) return;
      let at = 0;
      for (let q = bi - 1; q >= 0; q--) { const j = out.findIndex(x => id(x) === id(b[q])); if (j >= 0) { at = j + 1; break; } }
      out.splice(at, 0, e);
    });
    if (moved) { const pos = new Map(b.map((e, n) => [id(e), n])); out.sort((x, y) => (pos.get(id(x)) ?? 1e9) - (pos.get(id(y)) ?? 1e9)); }
    return { ok: true, v: out };
  }
  // Other lists (tags, people ids, logs): what this change added goes, what it removed comes back.
  const key = (e) => JSON.stringify(e);
  const count = (arr) => { const m = new Map(); for (const e of arr) m.set(key(e), (m.get(key(e)) || 0) + 1); return m; };
  const nb = count(b), na = count(a);
  const added = [], removed = [];
  for (const [k, n] of na) for (let q = (nb.get(k) || 0); q < n; q++) added.push(k);
  for (const [k, n] of nb) for (let q = (na.get(k) || 0); q < n; q++) removed.push(k);
  if (!added.length && !removed.length) return { ok: false };   // only the order changed, and more changed since
  const out = c.slice();
  for (const k of added) { const j = out.map(key).lastIndexOf(k); if (j < 0) return { ok: false }; out.splice(j, 1); }
  for (const k of removed) { const e = JSON.parse(k); const bi = b.findIndex(x => key(x) === k); out.splice(Math.min(bi < 0 ? out.length : bi, out.length), 0, e); }
  return { ok: true, v: out };
}
function undoMarked(m) {
  if (!m || !m.before || !m.after) return undo();
  const cur = _dataSnapshot();
  if (cur === m.before) { showToast('Already undone', false); return; }
  if (cur === m.after && _undoStack[_undoStack.length - 1] === m.before) return undo();
  let B, A, C;
  try { B = JSON.parse(m.before); A = JSON.parse(m.after); C = JSON.parse(cur); } catch (e) { return undo(); }
  if (_undoSame(B, A)) { showToast('Nothing to undo', false); return; }
  const r = _undoRevert3(B, A, C);
  if (!r.ok || !_undoIsObj(r.v)) {
    if (typeof toast === 'function') toast('That changed since: open it to undo by hand (or press ' + (/Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl') + '+Z to step back one change at a time).', { icon: 'undo-2', timeout: 9000, dismiss: true });
    return;
  }
  for (const k of new Set([...Object.keys(B), ...Object.keys(A), ...Object.keys(C)])) {
    if (_undoSame(r.v[k], C[k])) continue;
    if (r.v[k] === undefined) delete state[k]; else state[k] = r.v[k];
  }
  ensureStateDefaults(state);
  if (state.selectedTaskId && !getItem(state.selectedTaskId)) state.selectedTaskId = null;
  saveData();   // a new step of its own: Ctrl+Z takes this undo back
  render();
  showToast('Undone', false);
}
/** Forget undo history (after a restore or adopting another copy of the state). */
function resetUndoHistory() { _undoStack.length = 0; _redoStack.length = 0; _prevSnapshot = _dataSnapshot(); }

function backupFilename() {
  const d = Clock.parts(Clock.now(), Clock.home());   // a machine artefact: named in home time
  return `opendash-backup-${d.iso}-${String(d.h).padStart(2,'0')}${String(d.mi).padStart(2,'0')}.json`;
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
  if (!silent && typeof gameMark === 'function') gameMark('backup-month', todayStr().slice(0, 7));   // achievements: a month with a backup you took
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
  // A file that is not a backup, or cannot be read: say so, and offer to pick another (no blocking alert).
  const fail = (msg) => {
    const pick = () => { const inp = document.getElementById('import-file'); if (inp) { inp.value = ''; inp.click(); } };
    if (typeof toast === 'function' && document.getElementById('toast-host')) toast('Not restored: ' + msg, { kind: 'err', action: { label: 'Choose another file', run: pick } });
    else alert('Not restored: ' + msg);
  };
  reader.onerror = () => fail('the file could not be read.');
  reader.onload = async e => {
    let data;
    try {
      data = JSON.parse(e.target.result);
      if (typeof data !== 'object' || !data || Array.isArray(data)) throw new Error('Not a JSON object');
      if (!Array.isArray(data.custom)) throw new Error('This file has no task list, so it is not a Freeflo backup.');
    } catch (err) { fail(err.message === 'Not a JSON object' || err instanceof SyntaxError ? 'this file is not a Freeflo backup.' : err.message); return; }
    try {
      const when = data._lastSave ? new Date(data._lastSave).toLocaleString(undefined, { timeZone: Clock.zone() }) : 'an unknown date';
      // Replacing everything cannot be undone with Ctrl+Z, so this one does ask (in the app's own dialog).
      const text = `File: ${file.name}. Backup from ${when}: ${data.custom.length} tasks (you have ${state.custom.length} now). Everything you have now is replaced, and this cannot be undone with Ctrl+Z; the server keeps its own backups in your data folder.`;
      const ok = typeof confirmDialog === 'function'
        ? await confirmDialog({ title: 'Replace your data with this backup?', text, confirmLabel: 'Replace my data', danger: true })
        : confirm('Replace your current Freeflo data with this backup?\n\n' + text);
      if (!ok) return;
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
      fail(err.message);
    }
  };
  reader.readAsText(file);
}
