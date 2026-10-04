/* ============================================================
   BOOT (runs last: every module above has been defined)
   ============================================================ */
// The hash as the page was opened. Person deep links can only be
// checked once the state file has loaded, and render() rewrites the hash.
const _BOOT_HASH = location.hash || '';

document.title = appTitle();
{ const b = document.getElementById('brand-name'); if (b) b.textContent = userName() || 'OpenDash'; }

applyAutoTheme();
// '#view=...' wins on load; a plain open lands on Home.
{ const hv = _viewFromHash(_BOOT_HASH); state.view = hv || 'home'; if (hv && hv.startsWith('person:')) state.selectedTaskId = null; }
render();
setupRubberBand();
resetUndoHistory();   // baseline for undo
// Hide the features that only work inside Cowork, rather than letting the
// user click them and get an error banner.
document.body.classList.toggle('no-cowork', !HAS_COWORK);
// AI features depend on the local backend. The class is re-applied after the
// health probe resolves.
document.body.classList.toggle('no-ai', true);

// Boot the file backend. Browser storage gives an instant first paint; the
// file is reconciled immediately afterwards. If the file on disk is newer
// (edited by a script, a migration or another tab), adopt it.
function _adoptState(fromFile, msg) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, fromFile);
  ensureStateDefaults(state);   // the file omits calCache etc. - restore them
  // Keep this tab's view: the URL it was opened with, else its current hash.
  { const hv = _viewFromHash(_BOOT_HASH) || _viewFromHash(); if (hv) { state.view = hv; if (hv.startsWith('person:')) state.selectedTaskId = null; } }
  state._localDirty = false;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  resetUndoHistory();
  render();
  if (msg) showToast(msg, false);
}

async function bootStatePersistence() {
  await detectStateServer();
  if (!_serverAvailable) {
    console.info('[state] no local server — browser storage only. '
      + 'Run start-opendash.bat to enable file saving.');
    return;
  }
  const fromFile = await serverStateLoad();
  if (!fromFile) { state._localDirty = true; await _persistFire(); return; }   // seed an empty file
  const fileSave  = fromFile._lastSave || 0;
  const localSave = state._lastSave || 0;
  if (fileSave > localSave && state._localDirty && typeof liveSyncBootMerge === 'function' && liveSyncBootMerge(fromFile)) {
    // unsaved edits from last time merged onto the newer file (86-live-sync.js)
  } else if (fileSave > localSave) {
    // No message when this browser had no copy at all (a new browser, or just
    // after the welcome set-up): loading the file is simply the normal start.
    _adoptState(fromFile, state._localDirty
      ? '⚠ the saved file is newer than this browser\'s unsaved changes — loaded the file'
      : localSave ? '✓ loaded newer state from file' : '');
  } else if (fileSave === localSave && !state._localDirty) {
    // In sync. Re-apply a deep link that needed the file's people.
    const hv = _viewFromHash(_BOOT_HASH);
    if (hv && hv !== state.view) { state.view = hv; if (hv.startsWith('person:')) state.selectedTaskId = null; render(); }
  } else {
    await _persistFire();                            // this browser has unsaved changes
  }
  updateSyncIndicator();
}

// The server answers /api/health before its first AI check finishes; poll
// the status a few times so AI features appear without a reload.
async function _pollAiStatus(tries) {
  if (!AI_PENDING || tries <= 0) return;
  await new Promise(r => setTimeout(r, 4000));
  try {
    const r = await fetch('/api/ai/status', { cache: 'no-store' });
    const s = await r.json();
    if (s && typeof s.available === 'boolean') {
      AI_PENDING = false;
      AI_AVAILABLE = s.available;
      document.body.classList.toggle('no-ai', !AI_AVAILABLE);
      if (AI_AVAILABLE) render();
      return;
    }
  } catch (e) { /* try again */ }
  return _pollAiStatus(tries - 1);
}

bootStatePersistence().then(() => {
  document.body.classList.toggle('no-ai', !AI_AVAILABLE);
  document.body.classList.toggle('no-gmail', !GOOGLE_CONNECTED);
  updateGoogleButton();
  if (AI_AVAILABLE || GOOGLE_CONNECTED) render();
  if (GOOGLE_CONNECTED) fetchCalendarEvents();
  _pollAiStatus(8);
  if (typeof briefMaybeAutoOpen === 'function') setTimeout(briefMaybeAutoOpen, 600);   // Home's morning greeting, first visit of the day (74-brief-ui.js)
  if (typeof liveSyncStart === 'function') liveSyncStart();   // changes from the assistant, MCP clients, other tabs
  if (typeof clockBoot === 'function') clockBoot();           // the time-zone sensor, banner and server sync (87-clock-ui.js)
});

// Persist when the tab is hidden (normal request) or closed (beacon), so the
// debounce window can never swallow the last edit.
document.addEventListener('visibilitychange', () => { if (document.hidden) flushPersistNow(); });
window.addEventListener('pagehide', flushPersistOnExit);

fetchCalendarEvents();
setTimeout(maybeShowReviewPrompt, 1500);
if (state.selectedTaskId) document.getElementById('content').classList.add('detail-open');
