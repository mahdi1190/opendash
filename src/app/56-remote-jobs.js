/* ============================================================
   REMOTE JOBS (window.RemoteJobs). Owner: Connections.
   Connect once, use everywhere (docs/dev/MULTI_DEVICE.md): something this
   computer cannot do (no Claude here) but another of your devices can is
   asked there. The server answers 202 {remote: {id, runsOn, message}}
   (lib/remote-jobs.mjs); remoteFetch() shows "Asking Home laptop…", waits
   for the answer (GET /api/requests/:id, woken at once by the live event
   'synced-files') and hands it back as if the server had answered itself:
   callers keep their own error handling.

     remoteFetch(url, init, {quiet, onState})  -> Response (fetch's shape)
     RemoteJobs.wait(remote, opts)            -> Response, for a 202 already read
     syncedFilesChanged(rels)                  the live event: reload what changed
                                               (the calendar, the inbox, the day
                                               adviser's review, a request's answer)
   ============================================================ */
const _rjWaiters = new Map();
function _rjResponse(status, body) {
  return new Response(JSON.stringify(body || {}), { status, headers: { 'Content-Type': 'application/json' } });
}
async function remoteFetch(url, init, opts) {
  const r = await fetch(url, init);
  // The device that would run it is asleep or off (lib/sync/presence.mjs): nothing was started,
  // and the answer is a calm line (calm: true), shown calmly by toast() (56-presence.js).
  if (r.status === 503) {
    try { const j = await r.clone().json(); if (j && j.calm && typeof presenceCalm === 'function') presenceCalm(j.error || j.message); } catch (e) { /* not JSON */ }
    return r;
  }
  if (r.status !== 202) return r;
  let j = null;
  try { j = await r.clone().json(); } catch (e) { return r; }
  if (!j || !j.remote || !j.remote.id) return r;
  return remoteWait(j.remote, opts);
}
async function remoteWait(remote, opts) {
  opts = opts || {};
  const id = String(remote.id);
  const url = '/api/requests/' + encodeURIComponent(id);
  let cancelled = false;
  const close = opts.quiet ? () => {} : toast(remote.message || ('Asking ' + (remote.runsOn || 'your other computer') + '…'), {
    icon: 'loader-circle', timeout: 21 * 60000,   // outlives the 20-minute wait below: the spinner never goes while Cancel is still needed
    action: { label: 'Cancel', run: () => { cancelled = true; remoteWake(); fetch(url + '/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {}); } },
  });
  // The toast follows the request: "Asking Home laptop…", then "Home laptop is off: using this computer…".
  let shown = remote.message || '';
  const tell = (x) => {
    if (x && x.message && x.message !== shown && typeof close.update === 'function') { shown = x.message; close.update(x.message); }
    if (typeof opts.onState === 'function') { try { opts.onState(x); } catch (e) { console.error('[remote]', e); } }
  };
  tell(remote);
  const t0 = Date.now();
  try {
    for (;;) {
      if (cancelled) return _rjResponse(499, { error: 'Cancelled.', code: 'CANCELLED' });
      await new Promise((res) => { const t = setTimeout(res, Date.now() - t0 < 30000 ? 1000 : 3000); _rjWaiters.set(id, () => { clearTimeout(t); res(); }); });
      _rjWaiters.delete(id);
      if (cancelled) return _rjResponse(499, { error: 'Cancelled.', code: 'CANCELLED' });
      let x = null;
      try {
        const r = await fetch(url, { cache: 'no-store' });
        x = await r.json();
        if (!r.ok) throw new Error((x && x.error) || ('HTTP ' + r.status));
      } catch (e) {
        if (Date.now() - t0 > 20 * 60000) return _rjNoAnswer(remote);
        continue;
      }
      tell(x);
      // The answer of the route it ran there, exactly (an error from there too).
      if ((x.status === 'done' || x.status === 'error') && x.result) return _rjResponse(x.result.status || 200, x.result.body || { ok: true });
      if (['error', 'cancelled', 'expired'].includes(x.status)) {
        // It went away while asked (lib/sync/presence.mjs): a calm line, not an error (toast() shows it calmly).
        if (x.calm && typeof presenceCalm === 'function') presenceCalm(x.message);
        const who = x.runsOn || remote.runsOn || 'Your other computer';
        return _rjResponse(x.state === 'offline' ? 503 : 502, { error: x.calm ? (x.message || 'It runs this when it wakes.') : who + " couldn't do it: " + String(x.message || 'it did not work').replace(/\.+$/, '') + '.', code: (x.error && x.error.code) || String(x.status).toUpperCase(), runsOn: x.runsOn || null, ...(x.calm ? { calm: true } : {}) });
      }
    }
  } finally { close(); }
}
/** 20 minutes without an answer: if that computer is asleep or off, the calm line (never an error); else "{name} couldn't do it". */
function _rjNoAnswer(remote) {
  const name = remote.runsOn || 'Your other computer';
  const devs = (typeof _pr !== 'undefined' && _pr && _pr.view && Array.isArray(_pr.view.devices)) ? _pr.view.devices : [];
  const d = devs.find(x => x && x.name === name);
  if (d && !d.reachable && !d.checking) {
    const msg = name + ' is ' + (d.base === 'off' ? 'off' : 'asleep') + '. It runs this when it wakes.';
    if (typeof presenceCalm === 'function') presenceCalm(msg);
    return _rjResponse(503, { error: msg, code: 'NO_ANSWER', calm: true, runsOn: name });
  }
  return _rjResponse(504, { error: name + " couldn't do it: no answer yet.", code: 'NO_ANSWER', runsOn: name });
}
function remoteWake() { for (const fn of [..._rjWaiters.values()]) { try { fn(); } catch (e) { /* fine */ } } }

/** Another device published something this page shows: reload just that. */
function syncedFilesChanged(rels) {
  const list = Array.isArray(rels) ? rels : [];
  if (list.includes('requests.json')) remoteWake();
  const any = (prefix) => list.some(r => typeof r === 'string' && r.startsWith(prefix));
  // Your choices on sources (names, colours, on/off: source-prefs.json) change both lists.
  const prefs = list.includes('source-prefs.json');
  try { if (typeof CalStore !== 'undefined' && CalStore && CalStore.st && CalStore.st.loaded && (any('calendar/') || prefs)) CalStore.load(true); } catch (e) { /* not loaded yet */ }
  try { if (typeof InboxStore !== 'undefined' && InboxStore && InboxStore.st && InboxStore.st.loaded && (any('inbox/') || any('email/') || prefs)) InboxStore.load(true); } catch (e) { /* not loaded yet */ }
  if (list.includes('brief/day-advice.json') && typeof homeAdvisorRefresh === 'function') homeAdvisorRefresh();
  if (any('finance-share/') && typeof financeSharedChanged === 'function') financeSharedChanged();
  if (any('finance-share/') && typeof expFinanceUpdated === 'function') expFinanceUpdated();   // paid back? (66-expenses-0core.js)   // finances from the computer that reads the bank (65-finance-view.js)
  // A person's picture arrived from another computer (lib/sync/blobs.mjs): shown in place of the initials (50-people.js).
  if (any('people/images/') && typeof pplPicturesArrived === 'function') pplPicturesArrived(list);
  if (any('expenses/') && typeof owedFilesChanged === 'function') owedFilesChanged(list);   // Owed to me from another computer (66-owed-0core.js)
  if (any('expenses/') && typeof expensesFilesChanged === 'function') expensesFilesChanged(list);   // expenses and receipts from another computer (66-expenses-0core.js)
  if (list.includes('friends/spaces.json') && typeof togetherFilesChanged === 'function') togetherFilesChanged();   // shared spaces from another of your computers (99-together-0core.js)
  _rjFilesRefresh(list, any);
  if ((list.includes('profile.json') || any('briefs/') || prefs) && typeof render === 'function') { try { render(); } catch (e) { /* fine */ } }
  // A proposal applied or dismissed on another computer (state/proposals.json): the assistant's cards follow (70-ai-chats.js).
  if (list.includes('state/proposals.json') && typeof chatProposalsChanged === 'function') chatProposalsChanged();
}
/**
 * The other files a view shows (lib/sync/manifest.mjs SYNC_FILES, "files"):
 * read again WITHOUT asking for a fresh fetch (a refresh here would fetch,
 * write and send it back: a loop). The server answers from the copy that arrived.
 */
function _rjFilesRefresh(list, any) {
  const repaint = () => { if (typeof render === 'function') { try { render(); } catch (e) { /* fine */ } } };
  // The Morning brief's forecast (briefs/weather.json).
  if (list.includes('briefs/weather.json') && typeof briefLoadWeather === 'function' && typeof _bf !== 'undefined' && _bf && _bf.weather) {
    try { _bf.weatherAt = 0; briefLoadWeather(false).then(repaint, () => {}); } catch (e) { /* fine */ }
  }
  // Travel: the forecast and the online holidays (travel/weather.json, travel/holidays-*.json).
  if (any('travel/') && typeof _trlCache !== 'undefined' && _trlCache) {
    try {
      if (list.includes('travel/weather.json')) _trlCache.weather.clear();
      if (any('travel/holidays-')) _trlCache.online.clear();
      if (typeof _homeDataCache !== 'undefined' && typeof homeDataRefresh === 'function') for (const k of [..._homeDataCache.keys()]) if (k.startsWith('travel:wx:')) homeDataRefresh(k);
      if (typeof _trlBump === 'function') _trlBump();
    } catch (e) { /* not loaded yet */ }
  }
  // Open "Open on GitHub" panels (resources/github-cache.json): the server answers from the cache.
  if (list.includes('resources/github-cache.json') && typeof _resGh !== 'undefined' && _resGh && typeof resLoadGithub === 'function') {
    for (const id of Object.keys(_resGh)) if (_resGh[id] && _resGh[id].data && !_resGh[id].loading) { try { resLoadGithub(id, false); } catch (e) { /* fine */ } }
  }
  // My animations (animations/mine.json).
  if (list.includes('animations/mine.json') && typeof animMineLoad === 'function') { try { Promise.resolve(animMineLoad()).then(repaint, () => {}); } catch (e) { /* fine */ } }
  // Auto-link settings (index/settings.json), when that panel is open.
  if (list.includes('index/settings.json') && typeof alStatus === 'function' && typeof _alPaintSettings === 'function') { try { alStatus(true).then(() => _alPaintSettings(), () => {}); } catch (e) { /* fine */ } }
}

window.RemoteJobs = { fetch: remoteFetch, wait: remoteWait, wake: remoteWake, filesChanged: syncedFilesChanged };
