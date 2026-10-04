/* ============================================================
   SERVER LINK: offline banner, reconnect, re-sync, offline page
   ============================================================
   Owner: server control (with 58-settings-server.js; server side
   server/routes/server-control.mjs, server/lifecycle.mjs, tools/supervisor.mjs).

   - The server is "gone" when the live-sync stream drops (86-live-sync.js),
     a save fails, or any /api request fails to connect - AND a quick health
     probe fails too. Then a calm, sticky banner: "The dashboard server isn't
     running." with [Start server] and [Retry]. It checks again by itself
     (1 s, 2 s, 3 s, 5 s, 8 s, then every 10 s) and clears on reconnect.
   - Edits made meanwhile are never dropped: saveData() keeps them in this
     browser (marked unsaved); on reconnect they are sent, and a newer file
     is merged with them (86-live-sync.js, conflicts asked). Other changes
     (actions, settings) fail with the clear message from 02-core-net.js,
     whose down/up signal (DashboardNet.onChange) also feeds this banner.
   - [Start server] is a dashboard-start:// link when Settings > Server >
     "Enable the Start server button" is on (Windows), else instructions.
   - The offline page: a service worker (src/sw.js, /sw.js) keeps the last
     copy of the app so a page opened while the server is down boots into
     this banner. ?nosw in the address, or Settings > Server, turns it off.
   Nothing here runs at load except listeners (see MODULES.md).
   ============================================================ */
const _SRV_BACKOFF = [1000, 2000, 3000, 5000, 8000, 10000];
const _SRV_SCHEME_KEY = 'dashboard-start-scheme';
const _SRV_SW_OFF_KEY = 'dashboard-sw-off';
const _SRV_RELOAD_KEY = 'dashboard-srv-reload-at';
const _srvLink = { state: 'unknown', since: 0, tries: 0, timer: null, probing: null, polling: false, nextAt: 0, fast: 0, lastWriteToast: 0, banner: null, tick: null };
// The browser's own fetch: the probe must not report itself as a failed request.
const _srvFetch = (typeof window !== 'undefined' && typeof window.fetch === 'function') ? window.fetch.bind(window) : null;

/** Delay before the n-th re-check (0-based): 1 s, 2 s, 3 s, 5 s, 8 s, then 10 s. */
function srvBackoffDelay(n) { return _SRV_BACKOFF[Math.min(Math.max(0, n | 0), _SRV_BACKOFF.length - 1)]; }
function srvIsOffline() { return _srvLink.state === 'offline'; }
function _srvPlatform() {
  const p = String((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '').toLowerCase();
  return /win/.test(p) ? 'windows' : /mac/.test(p) ? 'mac' : 'other';
}
/**
 * The Start server link's scheme, as last reported by the server (null = not
 * set up). Only ever our own scheme: whatever answered /api/health (or wrote
 * this storage) cannot turn the button into a link to another program.
 */
const _SRV_SCHEME = 'dashboard-start';
function srvStartScheme() {
  try { return localStorage.getItem(_SRV_SCHEME_KEY) === _SRV_SCHEME ? _SRV_SCHEME : null; } catch (e) { return null; }
}
function srvRememberScheme(scheme) {
  try { if (scheme === _SRV_SCHEME) localStorage.setItem(_SRV_SCHEME_KEY, scheme); else localStorage.removeItem(_SRV_SCHEME_KEY); } catch (e) { /* storage blocked */ }
}
/**
 * A short message for an error, to go inside a sentence ("Not saved: ...").
 * Uses the shared helpers in 02-core-net.js (netIsDown / netErrorMessage).
 */
function _srvErrText(e) {
  const m = String((e && e.message) || e || '');
  const down = typeof netIsDown === 'function' ? netIsDown(e) : /failed to fetch|networkerror|load failed|network request failed/i.test(m);
  if (down) return 'the OpenDash server isn\'t running';
  if (typeof netErrorMessage === 'function') return netErrorMessage(e, 'something went wrong');
  return m || 'something went wrong';
}

/** GET /api/health?quick=1 with a timeout; the health object, or null when nothing answers. */
async function srvProbe(timeoutMs) {
  if (!_srvFetch || !/^https?:$/.test(location.protocol)) return null;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), timeoutMs || 4000) : null;
  try {
    const r = await _srvFetch(HEALTH_API + '?quick=1', { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
    if (!r.ok) return null;
    const h = await r.json();
    if (!h || h.app !== 'dashboard') return null;
    if (h.launch) srvRememberScheme(h.launch.startScheme || null);
    return h;
  } catch (e) { return null; } finally { if (t) clearTimeout(t); }
}

/** Something failed to reach the server: check, and show the banner if it is really gone. */
function srvConnectionLost(source) {
  if (_srvLink.state === 'offline' || _srvLink.state === 'restarting' || _srvLink.probing) return;
  _srvLink.probing = srvProbe(3500).then((h) => {
    _srvLink.probing = null;
    if (_srvLink.state === 'restarting') return;
    if (h) { if (_srvLink.state !== 'online') _srvLink.state = 'online'; return; }
    srvGoOffline(source || 'lost');
  });
}
/** The stream (or a request) works again. */
function srvConnectionOk() {
  if (_srvLink.state === 'offline') srvCheckNow();
  else if (_srvLink.state === 'unknown') _srvLink.state = 'online';
}

function srvGoOffline(why) {
  if (_srvLink.state === 'offline') return;
  _srvLink.state = 'offline'; _srvLink.since = Date.now(); _srvLink.tries = 0;
  if (typeof _serverLastError !== 'undefined') _serverLastError = 'the OpenDash server isn\'t running';
  if (typeof renderSaveStatus === 'function') renderSaveStatus();
  // Settings > Server must not go on saying "Running" under the banner.
  if (typeof srvSettingsInvalidate === 'function') srvSettingsInvalidate();
  _srvShowBanner();
  _srvSchedule();
}
function _srvSchedule(delay) {
  clearTimeout(_srvLink.timer);
  const fast = _srvLink.fast > Date.now();
  const d = delay != null ? delay : fast ? 1000 : srvBackoffDelay(_srvLink.tries);
  _srvLink.nextAt = Date.now() + d;
  _srvLink.timer = setTimeout(_srvPollTick, d);
  _srvUpdateBanner();
}
async function _srvPollTick() {
  if (_srvLink.state !== 'offline' || _srvLink.polling) return;
  _srvLink.polling = true;
  _srvLink.nextAt = 0; _srvUpdateBanner();
  let h = null;
  try { h = await srvProbe(4000); } finally { _srvLink.polling = false; }
  if (_srvLink.state !== 'offline') return;
  if (h) { await srvBackOnline(h); return; }
  _srvLink.tries++;
  _srvSchedule();
}
/** [Retry]: check at once. */
function srvCheckNow() {
  if (_srvLink.state !== 'offline' || _srvLink.polling) return;
  clearTimeout(_srvLink.timer);
  _srvPollTick();
}

/** The server answers again: hide the banner, send what is waiting, catch up. */
async function srvBackOnline(h) {
  clearTimeout(_srvLink.timer);
  _srvLink.state = 'online';
  _srvHideBanner();
  if (typeof srvSettingsInvalidate === 'function') srvSettingsInvalidate();   // Settings > Server shows the new process
  const ok = await srvResync(h);
  if (h && srvBuildChanged(h)) { srvReloadForNewBuild(); return; }
  if (ok) _srvToast('Connected to the OpenDash server again', { kind: 'ok' });
}

/** Did the server come back with a different app than this page? */
function srvBuildChanged(h) {
  const mine = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG) ? APP_CONFIG.build : null;
  return !!(h && h.build && mine && h.build !== mine);
}
/** Reload into the new build, once unsaved edits are on the server (at most once a minute, no loops). */
function srvReloadForNewBuild() {
  let last = 0;
  try { last = Number(sessionStorage.getItem(_SRV_RELOAD_KEY)) || 0; } catch (e) { last = 0; }
  const dirty = typeof state !== 'undefined' && state && (state._localDirty || (typeof _persistTimer !== 'undefined' && _persistTimer));
  if (dirty || Date.now() - last < 60000) {
    _srvToast('OpenDash was updated. Reload to use the new version.', { action: { label: 'Reload', run: () => location.reload() }, timeout: 12000 });
    return;
  }
  try { sessionStorage.setItem(_SRV_RELOAD_KEY, String(Date.now())); } catch (e) { /* fine */ }
  location.reload();
}

/**
 * After the server was away (or restarted): capabilities again, then the
 * state. Unsaved edits go up (a newer file is merged with them, conflicts
 * asked); otherwise a newer file is taken. Returns true when in sync.
 * h: a quick health answer already in hand - then the full capability check
 * (which may wait for a new server's AI probe) runs in the background.
 */
async function srvResync(h) {
  if (typeof detectStateServer !== 'function') return false;
  const wasConnected = !!_lastPersistedKey;
  const caps = () => {
    document.body.classList.toggle('no-ai', !AI_AVAILABLE);
    document.body.classList.toggle('no-gmail', !GOOGLE_CONNECTED);
  };
  if (h && h.ok) {
    _serverAvailable = true; _serverHasState = h.stateExists !== false; _serverLastError = null;
    detectStateServer().then(() => { caps(); if (typeof updateGoogleButton === 'function') updateGoogleButton(); if (typeof render === 'function') render(); });
  } else {
    await detectStateServer();
    if (!_serverAvailable) return false;
    caps();
  }
  try {
    if (!wasConnected) {
      // Booted while the server was down (the offline copy): use the base the
      // last session left, so the merge knows what changed where.
      try {
        const saved = JSON.parse(localStorage.getItem(_LIVE_BASE_KEY) || 'null');
        if (saved && saved.key && Number(saved.version) === (Number(state._lastSave) || 0)) _lastPersistedKey = saved.key;
      } catch (e) { /* no base: the merge asks about every difference */ }
      if (!_lastPersistedKey && !state._localDirty) _lastPersistedKey = _persistKey(_stateForPersist());
    }
    if (state._localDirty || _persistTimer) {
      await _persistFire();                       // a 409 merges (86-live-sync.js)
    } else {
      const baseKey = _lastPersistedKey;
      const remote = await serverStateLoad();
      if (remote && (Number(remote._lastSave) || 0) > (Number(state._lastSave) || 0)) {
        const r = await _liveReconcile(remote, baseKey, { source: 'external' });
        if (r && r.ours) schedulePersist(50);
      }
    }
  } catch (e) { console.warn('[server] re-sync failed:', e); }
  // Booted without a server: what boot would have fetched once it answered.
  if (!wasConnected && typeof fetchCalendarEvents === 'function') { try { fetchCalendarEvents(); } catch (e) { /* calendar is optional */ } }
  if (typeof liveSyncStart === 'function') liveSyncStart();
  if (typeof updateSyncIndicator === 'function') updateSyncIndicator();
  if (typeof render === 'function') render();
  return !_serverLastError;
}

function _srvToast(msg, opts) {
  if (typeof toast === 'function') return toast(msg, opts || {});
  if (typeof showToast === 'function') showToast(msg, !!(opts && opts.kind === 'err'));
}

/* ---------- the banner ---------- */
function _srvBannerEl() {
  if (_srvLink.banner && document.body.contains(_srvLink.banner)) return _srvLink.banner;
  const el = document.createElement('div');
  el.className = 'srv-banner'; el.id = 'srv-banner';
  el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<span class="srv-ic">${icon('cloud-off')}</span>`
    + '<div class="srv-msg"><div class="srv-title">The OpenDash server isn’t running.</div><div class="srv-sub"></div></div>'
    + '<div class="srv-acts"></div>';
  // In the flow between the top bar and the page (pushes it down, covers nothing);
  // floating at the top when the shell is not there.
  const content = document.getElementById('content');
  if (content && content.parentNode) content.parentNode.insertBefore(el, content);
  else { el.classList.add('is-floating'); document.body.appendChild(el); }
  _srvLink.banner = el;
  return el;
}
function _srvShowBanner() {
  if (typeof document === 'undefined' || !document.body) return;
  const el = _srvBannerEl();
  const acts = el.querySelector('.srv-acts');
  acts.textContent = '';
  const scheme = srvStartScheme();
  let start;
  if (scheme) {
    start = document.createElement('a');
    start.href = scheme + '://start';
    start.addEventListener('click', () => { _srvLink.fast = Date.now() + 30000; _srvSchedule(1500); });
  } else {
    start = document.createElement('button'); start.type = 'button';
    start.addEventListener('click', () => srvShowStartHelp());
  }
  start.className = 'btn btn-primary btn-sm srv-start';
  start.innerHTML = icon('plug-zap') + '<span>Start server</span>';
  const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'btn btn-secondary btn-sm srv-retry';
  retry.innerHTML = icon('refresh-cw') + '<span>Retry</span>';
  retry.addEventListener('click', () => srvCheckNow());
  acts.append(start, retry);
  el.hidden = false;
  el.classList.add('on');
  document.body.classList.add('srv-offline');
  _srvUpdateBanner();
  clearInterval(_srvLink.tick);
  _srvLink.tick = setInterval(_srvUpdateBanner, 1000);
}
function _srvUpdateBanner() {
  const el = _srvLink.banner;
  if (!el || el.hidden) return;
  const sub = el.querySelector('.srv-sub');
  const dirty = typeof state !== 'undefined' && state && (state._localDirty || (typeof _persistTimer !== 'undefined' && _persistTimer));
  const keep = dirty ? 'Your unsaved changes are kept in this browser and saved when it is back. ' : 'Changes you make are kept in this browser until it is back. ';
  const left = _srvLink.nextAt ? Math.max(0, Math.ceil((_srvLink.nextAt - Date.now()) / 1000)) : 0;
  const when = _srvLink.nextAt ? (left > 0 ? `Checking again in ${left} s.` : 'Checking…') : 'Checking…';
  const text = keep + when;
  if (sub.textContent !== text) sub.textContent = text;
}
function _srvHideBanner() {
  clearInterval(_srvLink.tick); _srvLink.tick = null;
  const el = _srvLink.banner;
  if (el) { el.classList.remove('on'); el.hidden = true; }
  if (typeof document !== 'undefined' && document.body) document.body.classList.remove('srv-offline');
}

/** [Start server] without the Start server button set up: how to start it by hand. */
function srvShowStartHelp() {
  const plat = _srvPlatform();
  openDialog({
    title: 'Start the OpenDash server', width: 520,
    body: (el) => {
      const p = document.createElement('p');
      p.textContent = plat === 'windows'
        ? 'Double-click your OpenDash shortcut (or start-opendash.bat in the app folder). This page reconnects by itself once it is running.'
        : 'Run sh start-opendash.sh from the app folder in a terminal. This page reconnects by itself once it is running.';
      el.appendChild(p);
      const h = document.createElement('p'); h.className = 'muted';
      h.textContent = plat === 'windows'
        ? 'To start it from this button next time: Settings › Server › “Enable the Start server button”. “Start automatically when I log in” keeps it running from the moment you sign in to Windows.'
        : 'Settings › Server shows how to start it automatically when you log in.';
      el.appendChild(h);
    },
    actions: [{ label: 'Close' }, { label: 'Retry now', primary: true, run: () => { srvCheckNow(); } }],
  });
}

/* ---------- writes while the server is away ---------- */
function _srvIsApi(input) {
  try {
    const u = new URL(typeof input === 'string' ? input : (input && input.url) || '', location.href);
    return u.origin === location.origin && u.pathname.startsWith('/api/');
  } catch (e) { return false; }
}
function _srvMethod(input, init) { return String((init && init.method) || (input && typeof input === 'object' && input.method) || 'GET').toUpperCase(); }
/** A change that could not reach the server: say so (state saves are kept and sent later instead). */
function _srvWriteFailed(input) {
  let path = '';
  try { path = new URL(typeof input === 'string' ? input : input.url, location.href).pathname; } catch (e) { path = ''; }
  if (path === STATE_API || path.startsWith('/api/server/') || path === '/api/events') return;
  if (Date.now() - _srvLink.lastWriteToast < 5000) return;
  _srvLink.lastWriteToast = Date.now();
  _srvToast('That change was not saved: the OpenDash server isn’t running. Start it, then try again.', { kind: 'err', timeout: 7000 });
}
if (typeof window !== 'undefined' && window.DashboardNet && typeof window.DashboardNet.onChange === 'function') {
  // 02-core-net.js already watches every request (and gives callers its clear
  // "isn't running" message): follow its down/up signal.
  window.DashboardNet.onChange((down) => { if (down) srvConnectionLost('request'); else srvConnectionOk(); });
} else if (typeof window !== 'undefined' && _srvFetch) {
  // Without it: observe (never change) the page's requests; a request that
  // cannot connect means the server may be gone. The promise and its error are unchanged.
  window.fetch = function (input, init) {
    const p = _srvFetch(input, init);
    if (_srvIsApi(input)) {
      p.then(() => { if (_srvLink.state === 'offline') srvConnectionOk(); }, (e) => {
        if (e && e.name === 'AbortError') return;
        if (_srvMethod(input, init) !== 'GET') _srvWriteFailed(input);
        srvConnectionLost('request');
      });
    }
    return p;
  };
}

/* ---------- the offline page (service worker) ---------- */
function srvSwEnabled() { try { return localStorage.getItem(_SRV_SW_OFF_KEY) !== '1'; } catch (e) { return true; } }
async function srvSetSwEnabled(on) {
  try { if (on) localStorage.removeItem(_SRV_SW_OFF_KEY); else localStorage.setItem(_SRV_SW_OFF_KEY, '1'); } catch (e) { /* storage blocked */ }
  if (on) return srvRegisterSw();
  return srvUnregisterSw();
}
async function srvUnregisterSw() {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
    if (typeof caches !== 'undefined') { const keys = await caches.keys(); await Promise.all(keys.filter(k => k.startsWith('dashboard-shell-')).map(k => caches.delete(k))); }
    return true;
  } catch (e) { return false; }
}
async function srvRegisterSw() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol) || !window.isSecureContext) return false;
  try { await navigator.serviceWorker.register('/sw.js', { scope: '/' }); return true; } catch (e) { return false; }
}
/** Whether this page is controlled by the offline-page worker right now. */
function srvSwActive() { return !!(typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller); }

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('load', () => {
    if (!/^https?:$/.test(location.protocol)) return;
    // ?nosw: turn the offline page off for this browser (developers).
    const params = new URLSearchParams(location.search);
    if (params.has('nosw')) srvSetSwEnabled(false).then(() => _srvToast('Offline page turned off for this browser (Settings › Server turns it back on).'));
    else if (srvSwEnabled()) srvRegisterSw();
    // Opened while the server is down (the offline copy, or a reload): the banner at once.
    setTimeout(() => {
      if (_srvLink.state !== 'unknown') return;
      srvProbe(4000).then((h) => { if (h) { if (_srvLink.state === 'unknown') _srvLink.state = 'online'; } else srvGoOffline('boot'); });
    }, 300);
  });
  // A tab coming back to the front checks again at once.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && _srvLink.state === 'offline') srvCheckNow(); });
}
