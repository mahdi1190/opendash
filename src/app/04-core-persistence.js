// ─── Local state persistence ─────────────────────────────────────────────
// The dashboard is served by serve.mjs from http://localhost:<port>:
//     GET  /api/state   -> the state JSON on disk (<data>/state/dashboard-state.json)
//     PUT  /api/state   -> replace it; the server answers {lastSave}
//     GET  /api/health  -> availability + capabilities
//
// Versioning: state._lastSave is the version this tab last loaded or wrote.
// Every PUT sends it; the server refuses (409) if the file is newer (a tools/
// script or another tab wrote it), otherwise stamps a new version and returns
// it. Only the server invents versions.
//
// Opened as a plain file (no server), everything still works from browser
// storage and the file backend is skipped.

const STATE_API = '/api/state';
const HEALTH_API = '/api/health';
let _serverAvailable = false;
let _serverHasState = true;     // false on a brand-new data folder (no request for a file that is not there)
let _serverLastError = null;

// Cowork is optional and legacy; only the old briefing button looks at it.
const HAS_COWORK = typeof window !== 'undefined'
  && typeof window.cowork !== 'undefined'
  && !!window.cowork;

// Keys that never go to the server: rebuildable caches and tab bookkeeping.
const _NOT_PERSISTED = ['calCache', 'peopleEmailCache', '_pendingFromCowork', '_lastGmailSync', '_localDirty'];
function _stateForPersist() {
  const copy = Object.assign({}, state);
  for (const k of _NOT_PERSISTED) delete copy[k];
  return copy;
}

// What the server already has (ignoring version fields), so unchanged
// saves - e.g. a calendar refresh - never cause a request or a disk write.
let _lastPersistedKey = null;
function _persistKey(obj) {
  const c = Object.assign({}, obj);
  delete c._lastSave; delete c._saveCount;
  return JSON.stringify(c);
}

async function detectStateServer() {
  try {
    const r = await fetch(HEALTH_API, { cache: 'no-store' });
    if (!r.ok) throw new Error('health ' + r.status);
    const h = await r.json();
    _serverAvailable = !!h.ok;
    _serverHasState = h.stateExists !== false;
    AI_AVAILABLE = !!(h.ai && h.ai.available);
    AI_PENDING = !!(h.ai && h.ai.pending);
    AI_MODEL = (h.ai && h.ai.model) || null;
    GOOGLE_CONFIGURED = !!(h.google && h.google.configured);
    // 'usable' is true for live OAuth OR a Claude-written snapshot.
    GOOGLE_CONNECTED = !!(h.google && (h.google.usable || h.google.connected));
    GOOGLE_LIVE = !!(h.google && h.google.connected);
    GOOGLE_SNAPSHOT_AT = (h.google && h.google.snapshotAt) || null;
    GOOGLE_ACCOUNT = (h.google && h.google.account) || null;
    _serverLastError = null;
  } catch (e) {
    _serverAvailable = false;
    _serverLastError = (e && e.message) || String(e);
  }
  updateSyncIndicator();
  return _serverAvailable;
}

// Pull state from disk. Used at boot and after a 409, so a state edited
// outside the browser (by a script or another tab) is picked up.
async function serverStateLoad() {
  if (!_serverAvailable || !_serverHasState) return null;
  try {
    const r = await fetch(STATE_API, { cache: 'no-store' });
    if (r.status === 404) return null;           // server up, no state yet
    if (!r.ok) throw new Error('GET ' + r.status);
    const parsed = await r.json();
    if (!parsed || !Array.isArray(parsed.custom)) {
      throw new Error('state from server has no task array');
    }
    _lastPersistedKey = _persistKey(parsed);
    return parsed;
  } catch (e) {
    _serverLastError = (e && e.message) || String(e);
    console.warn('[state] load from server failed:', _serverLastError);
    return null;
  }
}

async function serverStateWrite() {
  if (!_serverAvailable) return false;
  try {
    const payload = _stateForPersist();
    const key = _persistKey(payload);
    if (key === _lastPersistedKey) { state._localDirty = false; return true; }   // nothing new
    const body = JSON.stringify(payload);
    if (!body || body.length < 10) return false;
    const r = await fetch(STATE_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (r.status === 409) {
      // Live sync (86-live-sync.js): three-way merge of this tab's edits onto
      // the newer file; the user is asked only about true conflicts.
      if (typeof liveSyncHandleConflict === 'function') return await liveSyncHandleConflict(payload, key);
      // The file is newer than this tab (a tools/ script or another tab wrote
      // it). If it already holds exactly what this tab has (e.g. our own
      // last-moment save from before a reload), just take its version.
      // Otherwise adopt it instead of fighting it; this tab is then in sync.
      const fromFile = await serverStateLoad();
      if (fromFile && _persistKey(fromFile) === key) {
        state._lastSave = Number(fromFile._lastSave) || state._lastSave;
        state._localDirty = false;
        _serverLastError = null;
        return true;
      }
      if (fromFile) _adoptState(fromFile, '⚠ tasks were updated outside this tab — loaded the latest; redo your last edit if it is missing');
      _serverLastError = null;
      return !!fromFile;
    }
    if (!r.ok) {
      let msg = 'PUT ' + r.status;
      try { const j = await r.json(); if (j && j.error) msg += ' — ' + j.error; } catch (e) {}
      throw new Error(msg);
    }
    let j = {};
    try { j = await r.json(); } catch (e) {}
    state._lastSave = Number(j.lastSave) || Date.now();
    _lastPersistedKey = key;
    _serverHasState = true;
    // Edits made while the request was in flight are still unsaved.
    state._localDirty = _persistKey(_stateForPersist()) !== key;
    _serverLastError = null;
    return true;
  } catch (e) {
    // "Failed to fetch" = the server is not running (86-offline-banner.js says so and
    // sends this tab's edits, kept in the browser, once it is back).
    _serverLastError = typeof _srvErrText === 'function' ? _srvErrText(e) : ((e && e.message) || String(e));
    console.warn('[state] write to server failed:', _serverLastError);
    return false;
  }
}

// What the server says this machine can do (set by detectStateServer and
// the AI status poll). Features check these to grey themselves out.
let AI_AVAILABLE = false;
let AI_PENDING = false;
let GOOGLE_CONNECTED = false;
let GOOGLE_CONFIGURED = false;
let GOOGLE_ACCOUNT = null;
let GOOGLE_LIVE = false;
let GOOGLE_SNAPSHOT_AT = null;
let AI_MODEL = null;

let _persistTimer = null;
let _persistUITimer = null;
let _persistInFlight = false;
let _persistAgain = false;
async function _persistFire() {
  if (_persistTimer) { clearTimeout(_persistTimer); _persistTimer = null; }
  if (_persistUITimer) { clearTimeout(_persistUITimer); _persistUITimer = null; }
  if (_persistInFlight) { _persistAgain = true; return; }
  _persistInFlight = true;
  try {
    const ok = await serverStateWrite();
    if (ok) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {} }
    updateSyncIndicator(ok);
  } finally {
    _persistInFlight = false;
    if (_persistAgain) { _persistAgain = false; schedulePersist(300); }
  }
}

// Data changes: trailing 2s debounce, so a burst of edits makes one write.
function schedulePersist(delayMs) {
  if (!_serverAvailable) return;
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(_persistFire, delayMs != null ? delayMs : 2000);
}
// UI-only changes (view, selection, sort...): a slow 60s debounce. A data
// save in the meantime carries them along anyway; unchanged payloads are skipped.
function schedulePersistUI() {
  if (!_serverAvailable || _persistTimer) return;
  if (_persistUITimer) clearTimeout(_persistUITimer);
  _persistUITimer = setTimeout(_persistFire, 60000);
}

// Tab hidden (still alive): write now with a normal request, so the new
// version comes back to this tab.
function flushPersistNow() {
  if (!_serverAvailable || (!_persistTimer && !_persistUITimer)) return;
  _persistFire();
}
// Tab closing: a beacon (its answer can't be read; the tab is gone).
function flushPersistOnExit() {
  if (!_serverAvailable || (!_persistTimer && !_persistUITimer)) return;
  if (_persistTimer) clearTimeout(_persistTimer);
  if (_persistUITimer) clearTimeout(_persistUITimer);
  _persistTimer = _persistUITimer = null;
  try {
    const payload = _stateForPersist();
    if (_persistKey(payload) === _lastPersistedKey) return;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(STATE_API, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    }
  } catch (e) { /* best effort */ }
}

