/* ============================================================
   PRESENCE: IS MY OTHER COMPUTER THERE? (window.Presence). Owner: Sync.
   The server knows, for each of your other devices, one state
   (lib/sync/presence.mjs): open (its dashboard is open), running (on, no
   page), asleep, off, or outdated (an older OpenDash). GET /api/sync/presence
   answers {enabled, me, devices, summary, notices}; the live event 'presence'
   (86-live-sync.js) brings a change at once, and the page asks again every
   PR_POLL_MS while it is visible (that also tells the server a page is open
   here, which the other devices see).

   CALM, NOT ERRORS. Anything that needs another device asks the server, and
   the server checks presence first: while the other one is asleep or off it
   starts nothing that can only time out and answers with a calm line instead
   (`calm: true`: "Mac is off. Your changes reach it when it's back."). Those
   lines pass through here:
     presenceCalm(text)        remember a calm line (remoteFetch / remoteWait do it)
     presenceCalmMatch(msg)    toast() asks: is this "error" only a device being away?
     presenceNote(text)        show a calm line once (an info toast, never red),
                               the same line again within PR_CALM_REPEAT_MS only
                               pulses the top bar's sync dot: never a stream of popups
     presenceFor(nameOrId)     a device's row, or null
   ============================================================ */
const PR_POLL_MS = 30000;
const PR_CALM_KEEP_MS = 2 * 60 * 1000;
const PR_CALM_REPEAT_MS = 5 * 60 * 1000;
const _pr = { view: null, at: 0, loading: null, timer: 0, calm: new Map(), shown: new Map() };

/** Ask the server (at most once in flight); repaints what shows presence. */
function presenceLoad(force) {
  if (_pr.loading) return _pr.loading;
  if (!force && _pr.view && Date.now() - _pr.at < 5000) return Promise.resolve(_pr.view);
  if (typeof _serverAvailable !== 'undefined' && !_serverAvailable) return Promise.resolve(_pr.view);
  _pr.loading = fetch('/api/sync/presence', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then((v) => { if (v && typeof v === 'object') { _pr.view = v; _pr.at = Date.now(); } return _pr.view; })
    .catch(() => _pr.view)
    .finally(() => { _pr.loading = null; presenceRender(); });
  return _pr.loading;
}
/** The live event 'presence': a device's state changed. */
function presenceOnEvent(v) {
  if (!v || typeof v !== 'object') return;
  _pr.view = v; _pr.at = Date.now();
  presenceRender();
}
/** A device's row by name or id, or null. */
function presenceFor(key) {
  const v = _pr.view;
  if (!v || !Array.isArray(v.devices) || !key) return null;
  const k = String(key).toLowerCase();
  return v.devices.find(d => d.id === key || String(d.name || '').toLowerCase() === k) || null;
}

/* ---------- calm lines ---------- */
function _prNorm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
/** Remember a calm line from the server (a device is away), so a toast of it is shown calmly. */
function presenceCalm(text) {
  const t = _prNorm(text);
  if (!t) return;
  _pr.calm.set(t, Date.now());
  if (_pr.calm.size > 30) _pr.calm.delete(_pr.calm.keys().next().value);
  presenceLoad(true);
}
/** The calm line `msg` carries (it may be wrapped: "Couldn't sync: Mac is off..."), or null. */
function presenceCalmMatch(msg) {
  const m = _prNorm(msg);
  if (!m) return null;
  const now = Date.now();
  for (const [t, at] of _pr.calm) {
    if (now - at > PR_CALM_KEEP_MS) { _pr.calm.delete(t); continue; }
    if (m.includes(t)) return t;
  }
  // A line made elsewhere that names one of your devices as asleep or off.
  const v = _pr.view;
  if (v && Array.isArray(v.devices)) {
    for (const d of v.devices) {
      if (!d || !d.name || d.reachable) continue;
      if (m.includes(`${d.name} is asleep`) || m.includes(`${d.name} is off`) || m.includes(`${d.name} is not answering yet`)) return m;
    }
  }
  return null;
}
/** May this calm line show now? Once per PR_CALM_REPEAT_MS; a repeat pulses the sync dot instead. */
function presenceCalmShowOk(text) {
  const t = _prNorm(text), now = Date.now();
  const at = _pr.shown.get(t);
  if (at && now - at < PR_CALM_REPEAT_MS) { _prPulse(); return false; }
  _pr.shown.set(t, now);
  if (_pr.shown.size > 30) _pr.shown.delete(_pr.shown.keys().next().value);
  return true;
}
/** Show a calm line once (an info toast with a moon, never red); a repeat only pulses the sync dot. */
function presenceNote(text, opts) {
  const t = _prNorm(text);
  if (!t) return;
  presenceCalm(t);
  if (!presenceCalmShowOk(t)) return;
  if (typeof toast === 'function') toast(t, Object.assign({ icon: 'moon', timeout: 6000, calm: true }, opts || {}));
}
function _prPulse() {
  const b = document.getElementById('presence-btn');
  if (!b || b.hidden) return;
  b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
}

/* ---------- painting (the top bar's dot: presenceRender) ---------- */
function presenceRender() { /* the top bar's sync dot and its panel: below */ }

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Poll while the page is visible; a hidden tab still counts as open through its event stream.
  const tick = () => { if (!document.hidden) presenceLoad(false); };
  setTimeout(tick, 1500);
  _pr.timer = setInterval(tick, PR_POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) presenceLoad(true); });
}

window.Presence = { load: presenceLoad, view: () => _pr.view, of: presenceFor, calm: presenceCalm, note: presenceNote, match: presenceCalmMatch, onEvent: presenceOnEvent };
