/* ============================================================
   REFRESH TODAY: refresh EVERYTHING, now and on its own. Owner: Home.
   User request, 24 Oct: "Refresh today should refresh everything: all calendar,
   inbox, finances, weather, as well as actuate any AI advisors like Think through
   my day... But it should also periodically refresh."

     homeRefreshToday()        the button (top bar on Home, the hero's "Day so far" card):
                               a full refresh with the panel; during a run it shows that
                               run's panel instead of starting a second one
     homeRefreshAll({manual})  one run at a time: a manual call while an automatic run is
                               going joins it (and shows its panel)
     homeRefreshRetry(id)      run one part again (the panel's Retry)
     homeRefreshDerived()      repaint what Home derives from the clock (no fetch)

   THE PARTS (_hrSteps), all at once, each with its own outcome:
     Calendar, Inbox   CalStore / InboxStore.update (40-calendar.js) then wait for the job;
                       a click forces it (and asks the other devices that read sources this
                       one does not), the automatic run does not (the server's 30-minute rule
                       and the main-computer rule decide)
     Finances          POST /api/finance/update: a click on a computer that is not the finance
                       computer asks that computer through the request path (remoteFetch,
                       quiet); the automatic run sends {automatic: true}, so only the finance /
                       main computer pulls the bank (never twice across devices). Fresh for 30
                       minutes after a click (bank budgets), 12 hours otherwise
     Weather           briefLoadWeather(true) and the travel forecasts
     Tasks from email  a click, after the inbox: Claude looks only at messages it has not seen
     Day adviser       Think through my day (12-home-advisor.js), ONLY when the day's inputs
                       changed since the last review or it is over 2 hours old (a click); the
                       automatic run only reads the latest review (one made on another device
                       shows) and leaves the automatic AI review to homeAdvisorTick and the
                       server's once-per-period rule
     quiet parts       location, Home widget data, presence, travel, suggestions: refreshed,
                       not listed
   A device that is off or asleep (presence) is not waited for: its part says so calmly
   ("Finances: Mac is off"), in grey, not as a failure.

   THE PANEL (#hr-panel, under the top bar; never blocks the page): "Calendar ✓ · Inbox ✓ ·
   Finances… · Day adviser…" with one Cancel for the whole run; afterwards a plain line for
   each part that failed with a Try again for just that part, or "Everything is up to date" that
   goes by itself. The automatic runs show no panel.

   ON ITS OWN (user request, 24 Oct: Claude usage matters): Settings > Home and stories >
   "Refresh everything automatically": every 30 minutes, every hour (the default), every 2
   hours or only when I click (uiPrefs.refreshEvery, synced). While a page is visible, on that
   schedule, after the computer wakes and when the tab comes back after 10 minutes away:
     free parts       weather, travel, location, presence, widget data, and calendars / inboxes
                      read without Claude (accounts, iCal): every automatic run
     Claude parts     calendars / inboxes read through Claude connectors, the bank update (it may
                      read banks through Claude; direct banks keep the finance computer's own
                      limits), the day adviser and tasks from email: at most every hour and the
                      chosen schedule, and only when something could have changed (the data is
                      that old, the day's inputs changed, there is email Claude has not seen);
                      the adviser and email only where Claude runs on this computer
   One tab runs it for the computer (a stamp in localStorage); the server's main-computer
   rules keep connector, bank and AI jobs to one device; the email Claude was shown is
   remembered for every computer (state.seen 'aiEmail').
   ============================================================ */
let _homeTodayRefresh = null, _homeClockMinute = '', _homeCurrentDate = '';
function homeCurrentSummary() {
  const advice = typeof homeAdviceCurrent === 'function' ? homeAdviceCurrent() : null;
  if (advice && advice.summary && homeAdviceIdeas().length === (advice.ideas || []).length) return advice.summary;
  const model = _hhModel();
  const done = Number(model.doneToday) || 0;
  const progress = done ? `${done} task${done === 1 ? '' : 's'} completed so far today.` : '';
  return [progress, ...homeTodayTemplate(model.tpl).sentences.slice(0, progress ? 2 : 3).map(s => s.text)].filter(Boolean).join(' ');
}
function homeUseCurrentSummary() {
  return Clock.parts(Clock.now()).h >= 12 || _homeCurrentDate === todayStr() || (typeof _homeAdvice !== 'undefined' && _homeAdvice && _homeAdvice.date === todayStr());
}
/**
 * The minute tick on Home. Repainting every widget in one go, each with its own measure-and-glide, froze the page for half a second
 * once a minute. Here the widgets repaint one at a time between frames, and the grid is measured once, at the end.
 */
let _hrSoftQ = null;
function homeRefreshSoft() {
  if (_hrSoftQ) return;
  homeRefreshDerived({ soft: true });
}
function _hrSoftNext(q) {
  if (_hrSoftQ !== q) return;
  const t0 = performance.now();
  const grid = q.grid;
  if (state.view !== 'home' || !grid.isConnected) { _hrSoftQ = null; return; }
  while (q.ids.length && performance.now() - t0 < 12) {
    const id = q.ids.shift(), rec = typeof _homeW !== 'undefined' ? _homeW.get(id) : null;
    if (!rec || !rec.frame.isConnected || rec.frame.contains(document.activeElement)) continue;
    const w = homeLayout().widgets.find(x => x.id === id) || { id, size: rec.size, hidden: false };
    try { _homePaintWidget(rec.frame, rec.def, w, false); } catch (e) { console.error('[home]', e); }
  }
  if (q.ids.length) { setTimeout(() => _hrSoftNext(q), 16); return; }
  _hrSoftQ = null;
  homeGridPack(grid);
  homeGridRemember(grid, homeFlipPlay(grid, q.first));
  _homeKeepFocus();
}
function homeRefreshDerived(o) {
  if (typeof _sgSnap !== 'undefined') _sgSnap = null;
  if (typeof _sgEval !== 'undefined') _sgEval = null;
  if (typeof _homeMemoCache !== 'undefined') _homeMemoCache.clear();
  if (typeof _bfUpdate === 'function') _bfUpdate(['hero']);
  if (typeof _bfPaintAi === 'function') _bfPaintAi(null, false);
  if (typeof _hdRepaintIdeas === 'function') _hdRepaintIdeas();
  if (typeof homeAdvisorPaint === 'function') homeAdvisorPaint();
  if (typeof homeRerenderWidget === 'function') {
    const soft = o && o.soft ? [] : null;
    for (const frame of document.querySelectorAll('#main-body .hg-w[data-wid]')) {
      // Editors and receipt controls keep their DOM and focus during a refresh.
      const id = frame.dataset.wid, base = id.split('~')[0];
      if (['notebook', 'capture', 'launchpad'].includes(base) || frame.contains(document.activeElement)) continue;
      // A widget whose content only changes with its refreshKey() (the animation of the day: a 1 MB scene)
      // is left alone while the key is the one it painted (frame.dataset.refreshKey).
      const def = typeof homeWidgetDef === 'function' ? homeWidgetDef(id) : null;
      if (def && typeof def.refreshKey === 'function') {
        let k = '';
        try { k = String(def.refreshKey() || ''); } catch (e) { k = ''; }
        if (k && frame.dataset.refreshKey === k) continue;
      }
      if (soft) soft.push(id); else homeRerenderWidget(id);
    }
    const grid = document.querySelector('#main-body .home-grid');
    if (soft && soft.length && grid) { const q = _hrSoftQ = { grid, ids: soft, first: homeFlipCapture(grid) }; setTimeout(() => _hrSoftNext(q), 16); }
  }
}

/* ---------- timings ---------- */
const HR_EVERY_CHOICES = Object.freeze([['30', 'Every 30 minutes'], ['60', 'Every hour'], ['120', 'Every 2 hours'], ['off', 'Only when I click']]);
const HR_EVERY_DEFAULT = '60';
const HR_CLAUDE_MS = 60 * 60000;         // Claude-run parts on automatic runs: at most this often
const HR_AWAY_MS = 10 * 60000;           // back on the tab after this long: run
const HR_WAKE_GAP_MS = 5 * 60000;        // a minute timer this late: the computer slept
const HR_FRESH_MS = 3 * 60000;           // calendar / inbox read this recently: a click does not read again
const HR_FIN_FRESH_MS = 30 * 60000;      // the bank after a click (providers have daily budgets)
const HR_AI_MS = 2 * 3600000;            // the day adviser: again when older than this (or the day changed)
const HR_JOB_MS = 4 * 60000;             // a job still going after this: "still working", it finishes anyway
const HR_QUICK_MS = 20000;               // a fetch / a location fix
const HR_STAMP_KEY = 'dashboard-refresh-auto';
/** The automatic schedule ('30' | '60' | '120' | 'off'): a preference that follows you to your other computers. */
function homeRefreshEvery() { const v = typeof uiPrefGet === 'function' ? uiPrefGet('refreshEvery') : null; return HR_EVERY_CHOICES.some(c => c[0] === v) ? v : HR_EVERY_DEFAULT; }
function _hrEveryMs() { const v = homeRefreshEvery(); return v === 'off' ? 0 : Number(v) * 60000; }
/** How long a Claude-run part waits between automatic runs: an hour, or the schedule when longer. */
function _hrClaudeMs() { return Math.max(HR_CLAUDE_MS, _hrEveryMs()); }
function _hrEveryText() { const v = homeRefreshEvery(); return v === 'off' ? '' : v === '30' ? 'every 30 minutes' : v === '120' ? 'every 2 hours' : 'every hour'; }
/** This computer's last automatic Claude run of a part ('adviser', 'triage'). */
function _hrClaudeAt(k) { const o = _hrAiGet('auto:' + k); return o ? o.at : 0; }
/** Calendars / inboxes read through Claude: any source that is not a known Claude-free kind (an
 *  account, an iCal link...). Unknown counts as Claude, so a doubt never costs usage. */
const _HR_FREE_KINDS = new Set(['ical', 'microsoft', 'google', 'imap', 'direct', 'csv']);
function _hrViaClaude(store) {
  const src = store && store.data && Array.isArray(store.data.sources) ? store.data.sources : null;
  if (!src || !src.length) return true;
  return src.some(x => !x || !_HR_FREE_KINDS.has(x.kind));
}
const HR_AI_KEY = 'dashboard-refresh-ai';

const _hr = { run: null, last: null, lastAt: 0, tickAt: Date.now(), hiddenAt: 0, hideT: 0, hooked: false };

/* ---------- helpers ---------- */
function _hrUp() { return typeof _serverAvailable === 'undefined' || !!_serverAvailable; }
function _hrConn(id) { return typeof connHas === 'function' ? connHas(id) : typeof gdConnAccess === 'function' && gdConnAccess(id) === 'yes'; }
function _hrFeat(k) { return !(typeof APP_CONFIG !== 'undefined' && APP_CONFIG.features && APP_CONFIG.features[k] === false); }
function _hrSleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function _hrHM(ms) { const p = Clock.parts(ms); return typeof _calTimeLabel === 'function' ? _calTimeLabel(String(p.h).padStart(2, '0') + ':' + String(p.mi).padStart(2, '0')) : `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`; }
function _hrMsg(e, fallback) { return typeof netErrorMessage === 'function' ? netErrorMessage(e, fallback) : (e && e.message) || fallback; }
/** Wait until cond() (may be async) is true, the run is cancelled, or ms pass. -> true when cond held. */
async function _hrUntil(run, cond, ms) {
  const t0 = Date.now();
  for (;;) {
    if (run.cancelled) return false;
    let ok = false;
    try { ok = await cond(); } catch (e) { ok = false; }
    if (ok) return true;
    if (Date.now() - t0 > ms) return false;
    await _hrSleep(Date.now() - t0 < 20000 ? 1000 : 2500);
  }
}
async function _hrJson(url) { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
/** The device a connection comes from when it is asleep or off right now (presence): a calm line, else ''. */
function _hrAway(conn, what) {
  if (typeof connLocalHas === 'function' && connLocalHas(conn)) return '';
  const via = typeof connVia === 'function' ? connVia(conn) : null;
  if (!via || typeof connViaOnline !== 'function' || connViaOnline(conn)) return '';
  const d = typeof presenceFor === 'function' ? presenceFor(via) : null;
  const how = d && d.state === 'asleep' ? 'asleep' : 'off';
  return `${via} is ${how}: ${what} update when it is back.`;
}
function _hrHash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
/** What the day adviser reasons over (tasks, today's events, the part of the day), as one short key. */
function _hrDaySig() {
  try {
    const f = typeof _bfFacts === 'function' && typeof briefModel === 'function' ? Object.assign({}, _bfFacts(briefModel())) : {};
    delete f.now; delete f.weather;
    return _hrHash(JSON.stringify(f) + '|' + (typeof homeAdvicePeriod === 'function' ? homeAdvicePeriod() : '') + '|' + todayStr());
  } catch (e) { return ''; }
}
function _hrAiGet(k) { try { const o = JSON.parse(localStorage.getItem(HR_AI_KEY) || '{}'); return o && o[k] ? o[k] : null; } catch (e) { return null; } }
function _hrAiSet(k, sig) {
  try { const o = JSON.parse(localStorage.getItem(HR_AI_KEY) || '{}') || {}; o[k] = { sig, at: Date.now() }; localStorage.setItem(HR_AI_KEY, JSON.stringify(o)); } catch (e) { /* private mode */ }
}

/* ---------- the parts ---------- */
/** Calendar / inbox: one update job, then its outcome. */
async function _hrStore(run, store, conn, what) {
  if (typeof store === 'undefined' || !store) return { status: 'skipped', reason: 'off' };
  const age = store.age();
  const mail = typeof InboxStore !== 'undefined' && store === InboxStore && typeof emailReadPrefs === 'function';
  if (mail && !run.manual && !emailReadMs()) return { status: 'skipped', reason: 'runs when you ask' };   // (Settings > Reading your email)
  if (run.manual && age !== null && age < HR_FRESH_MS && !store.running()) return { status: 'fresh', at: Date.now() - age };
  // Automatic: read through Claude at most hourly (or on the schedule when longer); without Claude, on the schedule.
  if (!run.manual && age !== null && !store.running()) {
    const wait = Math.max(_hrViaClaude(store) ? _hrClaudeMs() : _hrEveryMs(), mail ? emailReadMs() : 0) - 60000;
    if (age < wait) return { status: 'fresh', at: Date.now() - age };
  }
  const away = _hrAway(conn, what);
  if (away) { store.load(true).catch(() => {}); return { status: 'away', reason: away }; }
  if (!store.running()) {
    const r = await store.update(Object.assign({ force: !!run.manual, quiet: true }, mail ? { body: { days: emailReadPrefs().days } } : {}));
    if (run.cancelled) return { status: 'cancelled' };
    if (r.noSources) return { status: 'skipped', reason: 'not connected' };
    if (r.error) return { status: 'error', reason: r.message || 'The update could not start.' };
    if (r.skipped) {
      await store.load(true);
      return r.runsOn ? { status: 'elsewhere', reason: r.message || `comes from ${r.runsOn}` } : { status: 'fresh', at: store.data && Date.parse(store.data.fetchedAt) };
    }
    if (r.calm && r.message && !r.asked && !r.started) return { status: 'away', reason: r.message };
    // Only another device reads these (nothing runs here): what it fetches arrives by sync.
    if (r.asked && !store.running()) return { status: 'elsewhere', reason: r.message || 'Asked your other computer: it shows here when it arrives.' };
  }
  const ok = await _hrUntil(run, () => !store.running(), HR_JOB_MS);
  if (run.cancelled) return { status: 'cancelled' };
  if (!ok) return { status: 'slow', reason: 'Still reading. It finishes in the background and shows when it is done.' };
  await store.load(true);
  const job = store.st.job;
  if (job && job.state === 'error') return { status: 'error', reason: String(job.error || 'The update did not finish.') };
  if (store.st.error) return { status: 'error', reason: String(store.st.error) };
  return { status: 'done' };
}
async function _hrFinance(run) {
  let s = null;
  try { s = await _hrJson('/api/finance/status'); } catch (e) { return { status: 'error', reason: _hrMsg(e, 'Finances could not be checked.') }; }
  const at = s && s.lastUpdate && Date.parse(s.lastUpdate.at || s.lastUpdate.finishedAt || '');
  const busy = () => !!(s && s.job && s.job.state === 'running');
  if (!busy() && at && Date.now() - at < (run.manual ? HR_FIN_FRESH_MS : _hrClaudeMs() - 60000)) return { status: 'fresh', at };
  const away = _hrAway('bank', 'your finances');
  if (away) return { status: 'away', reason: away };
  if (!busy()) {
    let r, j;
    try {
      // A click on a computer that does not read the bank: the server asks the one that does (lib/finance-share.mjs ask).
      const go = run.manual && typeof remoteFetch === 'function' ? remoteFetch : fetch;
      r = await go('/api/finance/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(run.manual ? {} : { automatic: true }) }, { quiet: true });
      j = await r.json().catch(() => ({}));
    } catch (e) { return { status: 'error', reason: _hrMsg(e, 'The finance update could not start.') }; }
    if (run.cancelled) return { status: 'cancelled' };
    if (j && j.skipped) return { status: 'elsewhere', reason: j.message || (j.runsOn ? `Finance comes from ${j.runsOn}.` : 'Finance is updated on your main computer.') };
    if (j && j.calm) return { status: 'away', reason: String(j.error || j.message || 'Your other computer is away.') };
    if (r.status !== 202 && r.status !== 409 && !r.ok) return { status: 'error', reason: String((j && (j.error && j.error.message || j.error)) || 'HTTP ' + r.status) };
    if (r.status === 409 && j && j.code && !j.job) return { status: 'error', reason: String(j.error || 'The finance update could not start.') };
  }
  // Wait for this computer's job (one run on another computer has already finished when its answer came).
  const ok = await _hrUntil(run, async () => { s = await _hrJson('/api/finance/status'); return !busy(); }, HR_JOB_MS);
  if (run.cancelled) return { status: 'cancelled' };
  if (!ok) return { status: 'slow', reason: 'Still updating. It finishes in the background.' };
  if (typeof financeSharedChanged === 'function') { try { financeSharedChanged(); } catch (e) { /* no finance view */ } }
  if (s && s.job && s.job.state === 'error') return { status: 'error', reason: String(s.job.error || 'The bank update did not finish.') };
  return { status: 'done' };
}
async function _hrWeather() {
  const w = await briefLoadWeather(true);
  if (typeof _trlCache !== 'undefined' && _trlCache && _trlCache.weather) _trlCache.weather.clear();   // travel forecasts: read again when shown
  if (w && w.ok === false) return w.reason === 'offline' ? { status: 'error', reason: 'The forecast could not be fetched.' } : { status: 'skipped', reason: String(w.reason || 'no forecast') };
  return { status: 'done' };
}
async function _hrAdviser(run) {
  if (typeof homeAdvisorRefresh === 'function') { try { await homeAdvisorRefresh(); } catch (e) { /* the last one stays */ } }
  if (run.cancelled) return { status: 'cancelled' };
  const cur = typeof homeAdviceCurrent === 'function' ? homeAdviceCurrent() : null;
  const sig = _hrDaySig(), last = _hrAiGet('adviser');
  // Automatic: only with automatic reviews on, where Claude runs on this computer, at most hourly, and only
  // when the day's inputs changed (the server still allows one automatic review per part of the day).
  if (!run.manual) {
    const local = typeof connLocalHas === 'function' ? connLocalHas('claude') : false;
    const changed = !cur || !last || !sig || last.sig !== sig;
    if (!(typeof briefPrefs === 'function' && briefPrefs().advisorAuto) || !local || !changed || Date.now() - _hrClaudeAt('adviser') < _hrClaudeMs() - 60000) return cur ? { status: 'fresh', at: cur.at } : { status: 'skipped', reason: 'runs when you ask' };
    _hrAiSet('auto:adviser', '');
    await homeAdvisorReview(true, { quiet: true });
    if (run.cancelled) return { status: 'cancelled' };
    if (typeof _homeAdviceError !== 'undefined' && _homeAdviceError) return { status: 'error', reason: String(_homeAdviceError) };
    if (sig) _hrAiSet('adviser', sig);
    return { status: 'done' };
  }
  if (cur && Date.now() - (cur.at || 0) < HR_AI_MS && (!last || !sig || last.sig === sig)) {
    if (!last && sig) _hrAiSet('adviser', sig);
    return { status: 'fresh', at: cur.at, reason: 'Nothing changed since the last review.' };
  }
  await homeAdvisorReview(false, { quiet: true });
  if (run.cancelled) return { status: 'cancelled' };
  if (typeof _homeAdviceError !== 'undefined' && _homeAdviceError) return { status: 'error', reason: String(_homeAdviceError) };
  _hrAiSet('adviser', sig);
  return { status: 'done' };
}
/**
 * Tasks from new email (55-email-google.js aiSuggestTasksFromEmails), after the inbox: only the
 * messages Claude has not been shown from any of your computers (state.seen 'aiEmail', synced),
 * so no email is sent twice. Automatic: where Claude runs on this computer, at most hourly.
 */
async function _hrTriage(run) {
  if (run.p && run.p.inbox) await run.p.inbox;
  if (run.cancelled) return { status: 'cancelled' };
  // The user's own Suggest tasks is running: wait for it rather than stop or repeat it.
  if (typeof _emSuggesting !== 'undefined' && _emSuggesting) {
    await _hrUntil(run, () => !_emSuggesting, 3 * 60000);
    return run.cancelled ? { status: 'cancelled' } : { status: 'fresh', reason: 'Claude has just read your email.' };
  }
  const sent = typeof seenAll === 'function' ? seenAll('aiEmail') : {};
  const t = state.emailTriage || {};
  const handled = t.handled || {}, pending = new Set((t.suggestions || []).map(x => x && x.emailId));
  const fresh = emailMessages().filter(m => m && m.id && !handled[m.id] && !pending.has(m.id) && !sent[m.id]);
  if (!fresh.length) return { status: 'fresh', reason: 'No new email for Claude to look at.' };
  if (!run.manual) {
    const local = typeof connLocalHas === 'function' ? connLocalHas('claude') : false;
    const mailMs = typeof emailReadMs === 'function' ? emailReadMs() : _hrClaudeMs();   // (your choice in Settings > Reading your email)
    if (!local || !mailMs || Date.now() - _hrClaudeAt('triage') < mailMs - 60000) return { status: 'skipped', reason: 'runs when you ask' };
    _hrAiSet('auto:triage', '');
  }
  const r = await aiSuggestTasksFromEmails({ quiet: true, onlyNew: true });
  if (run.cancelled || (r && r.cancelled)) return { status: 'cancelled' };
  if (r && r.error) return { status: 'error', reason: String(r.error) };
  return { status: 'done', reason: r && r.found ? `${r.found} suggested` : '' };
}
function _hrSteps() {
  const ai = typeof briefPrefs === 'function' && !!briefPrefs().ai;
  return [
    { id: 'calendar', label: 'Calendar', ms: HR_JOB_MS + 30000,
      available: () => (!_hrFeat('calendar') || typeof CalStore === 'undefined' ? 'off' : _hrConn('calendar') ? true : 'not connected'),
      run: (r) => _hrStore(r, CalStore, 'calendar', 'its calendars') },
    { id: 'inbox', label: 'Inbox', ms: HR_JOB_MS + 30000,
      available: () => (!_hrFeat('email') || typeof InboxStore === 'undefined' ? 'off' : _hrConn('gmail') ? true : 'not connected'),
      run: (r) => _hrStore(r, InboxStore, 'gmail', 'your email will') },
    { id: 'finance', label: 'Finances', ms: HR_JOB_MS + 30000,
      available: () => (!_hrFeat('finance') ? 'off' : _hrConn('bank') ? true : 'not connected'),
      run: _hrFinance },
    { id: 'weather', label: 'Weather', ms: HR_QUICK_MS,
      available: () => (typeof briefLoadWeather !== 'function' ? 'off' : APP_CONFIG.location ? true : 'no town set'),
      run: _hrWeather },
    { id: 'triage', label: 'Tasks from email', ms: 8 * 60000,
      available: () => (!ai || !_hrFeat('email') || typeof aiSuggestTasksFromEmails !== 'function' || typeof emailMessages !== 'function' || !_hrConn('gmail') ? 'off' : _hrConn('claude') ? true : 'off'),
      run: _hrTriage },
    { id: 'adviser', label: 'Day adviser', ms: 4 * 60000,
      available: () => (!ai || typeof homeAdvisorReview !== 'function' ? 'off' : _hrConn('claude') ? true : 'not connected'),
      run: _hrAdviser },
    // Refreshed with the rest, not listed.
    { id: 'location', quiet: true, ms: HR_QUICK_MS, available: () => typeof dashboardLocationAutoRefresh === 'function',
      run: async (r) => { await dashboardLocationAutoRefresh(!!r.manual); return { status: 'done' }; } },
    { id: 'widgets', quiet: true, ms: HR_QUICK_MS, available: () => typeof homeDataRefreshVisible === 'function',
      run: async () => { await homeDataRefreshVisible(); return { status: 'done' }; } },
    { id: 'presence', quiet: true, ms: HR_QUICK_MS, available: () => typeof presenceLoad === 'function',
      run: async () => { await presenceLoad(true); return { status: 'done' }; } },
    { id: 'travel', quiet: true, ms: HR_QUICK_MS, available: () => typeof TravelStore !== 'undefined' && TravelStore && typeof TravelStore.refresh === 'function',
      run: async () => { await TravelStore.refresh(); return { status: 'done' }; } },
  ];
}

/* ---------- a run ---------- */
/** One part, with its time limit; the outcome lands in run.results[id] and the panel repaints. */
function _hrRunStep(run, s) {
  run.results[s.id] = { status: 'running' };
  _hrPaint();
  const limit = new Promise((res) => setTimeout(() => res({ status: 'slow', reason: 'Still working. It finishes in the background.' }), s.ms || HR_QUICK_MS));
  const work = Promise.resolve().then(() => s.run(run));
  (run.p || (run.p = {}))[s.id] = work.catch(() => null);           // a later part may wait for this one (triage after the inbox)
  return Promise.race([work, limit, run.stop])
    .then((r) => r || { status: 'done' }, (e) => ({ status: 'error', reason: _hrMsg(e, 'That part did not finish.') }))
    .then((r) => {
      if (run.cancelled && r.status !== 'done' && r.status !== 'fresh') r = { status: 'cancelled' };
      run.results[s.id] = r;
      _hrPaint();
      return r;
    });
}
/**
 * Refresh everything (see the header). o: {manual}. A run already going is joined (a click
 * makes its panel show). -> Promise of the run.
 */
function homeRefreshAll(o) {
  o = o || {};
  if (_hr.run) {
    // A click during an automatic run joins it; the day adviser (which the automatic run leaves
    // alone) gets its turn when the run ends, under its own inputs-changed / 2-hour rule.
    if (o.manual) { _hr.run.visible = true; if (!_hr.run.manual) _hr.run.joined = true; _hrPaint(); }
    return _hr.run.promise;
  }
  const run = { manual: !!o.manual, visible: !!o.manual, cancelled: false, results: {}, steps: [], at: Date.now(), done: false };
  let stopNow = null;
  run.stop = new Promise((res) => { stopNow = res; });
  run.cancel = () => {
    if (run.done || run.cancelled) return;
    run.cancelled = true;
    if (run.results.adviser && run.results.adviser.status === 'running' && typeof homeAdvisorCancel === 'function') homeAdvisorCancel();
    stopNow({ status: 'cancelled' });
  };
  _hr.run = run;
  _homeTodayRefresh = run;
  if (run.manual) {
    _homeCurrentDate = todayStr();
    _homeClockMinute = String(Math.floor(Clock.now() / 60000));
    if (typeof _hd !== 'undefined') { _hd.story = null; _hd.storyAt = 0; }
    if (state.view === 'home') homeRefreshDerived();
  }
  try { localStorage.setItem(HR_STAMP_KEY, String(Date.now())); } catch (e) { /* private mode */ }
  _hrButtons();
  if (run.visible && typeof homeAnnounce === 'function') homeAnnounce('Refreshing everything');
  run.promise = Promise.resolve().then(async () => {
    if (!_hrUp()) { run.results.server = { status: 'error', reason: typeof NET_DOWN_MESSAGE !== 'undefined' ? NET_DOWN_MESSAGE : 'Freeflo isn’t answering.' }; run.offline = true; return; }
    const steps = _hrSteps();
    const jobs = [];
    for (const s of steps) {
      let av = false;
      try { av = s.available(); } catch (e) { av = false; }
      if (av !== true) { if (!s.quiet && av !== 'off') run.results[s.id] = { status: 'skipped', reason: typeof av === 'string' ? av : 'not connected' }; continue; }
      if (!s.quiet) run.steps.push(s);
      jobs.push(_hrRunStep(run, s));
    }
    _hrPaint();
    await Promise.race([Promise.allSettled(jobs), run.stop]);
  }).catch((e) => { console.error('[refresh]', e); }).then(() => {
    run.done = true;
    _hr.run = null; _hr.last = run; _hr.lastAt = Date.now();
    _homeTodayRefresh = null;
    if (typeof sgRefresh === 'function') { try { sgRefresh(); } catch (e) { /* none */ } }
    if (state.view === 'home') homeRefreshDerived();
    if (typeof briefLoadMoney === 'function' && !run.offline) briefLoadMoney(true).then(() => { if (typeof _bfUpdate === 'function') _bfUpdate(['money']); }, () => {});
    _hrButtons();
    _hrPaint();
    if (run.joined && !run.cancelled && !run.offline) { setTimeout(() => homeRefreshRetry('adviser'), 0); return run; }
    if (run.visible && !_hrProblems(run).length) _hrAutoHide();
    if (typeof homeAnnounce === 'function' && run.visible) homeAnnounce(_hrSummaryText(run));
    return run;
  });
  return run.promise;
}
/** Run one part again (the panel's Retry), as a click. */
function homeRefreshRetry(id) {
  const run = _hr.last;
  if (_hr.run || !run) { homeRefreshToday(); return; }
  const s = _hrSteps().find(x => x.id === id);
  let av = false;
  try { av = s ? s.available() : false; } catch (e) { av = false; }
  if (!s || av !== true) { _hrPaint(); return; }
  run.cancelled = false; run.done = false; run.manual = true; run.visible = true;
  let stopNow = null;
  run.stop = new Promise((res) => { stopNow = res; });
  run.cancel = () => { if (run.done) return; run.cancelled = true; if (id === 'adviser' && typeof homeAdvisorCancel === 'function') homeAdvisorCancel(); stopNow({ status: 'cancelled' }); };
  if (!run.steps.some(x => x.id === s.id)) run.steps.push(s);
  _hr.run = run; _homeTodayRefresh = run;
  _hrButtons();
  run.joined = false;
  run.promise = _hrRunStep(run, s).then(() => {
    run.done = true; _hr.run = null; _homeTodayRefresh = null; _hr.lastAt = Date.now();
    if (state.view === 'home') homeRefreshDerived();
    _hrButtons(); _hrPaint();
    if (!_hrProblems(run).length) _hrAutoHide();
    if (typeof homeAnnounce === 'function') homeAnnounce(_hrSummaryText(run));
    return run;
  });
}
function homeRefreshToday() { return homeRefreshAll({ manual: true }); }
/** The automatic run: one tab per computer (the stamp), only while visible and the server answers. */
function homeRefreshAuto(why) {
  const every = _hrEveryMs();
  if (!every || _hr.run || document.hidden || !_hrUp()) return;   // "Only when I click": never on its own
  let last = 0;
  try { last = Number(localStorage.getItem(HR_STAMP_KEY)) || 0; } catch (e) { last = 0; }
  const need = why === 'timer' ? every - 60000 : Math.min(every, HR_AWAY_MS);   // another tab did it this recently: nothing
  if (Date.now() - Math.max(last, _hr.lastAt) < need) return;
  homeRefreshAll({ manual: false });
}

/* ---------- the panel ---------- */
const _HR_PROBLEM = new Set(['error', 'slow']);
function _hrProblems(run) { return run ? Object.entries(run.results).filter(([, r]) => r && _HR_PROBLEM.has(r.status)) : []; }
function _hrLabel(run, id) { if (id === 'server') return 'Server'; const s = (run.steps || []).find(x => x.id === id) || _hrSteps().find(x => x.id === id); return s ? s.label : id; }
function _hrChip(run, id, r) {
  const st = r.status;
  const label = _hrLabel(run, id);
  const ic = st === 'running' ? '<span class="spinner" aria-hidden="true"></span>'
    : icon(st === 'done' || st === 'fresh' ? 'check' : st === 'away' ? 'moon' : st === 'elsewhere' ? 'monitor' : st === 'skipped' || st === 'cancelled' ? 'minus' : st === 'slow' ? 'clock' : 'x', 'i-xs');
  const word = st === 'running' ? '…' : st === 'fresh' ? ' up to date' : st === 'skipped' ? ` · ${r.reason || 'not connected'}` : st === 'cancelled' ? ' · stopped' : st === 'slow' ? ' · still working' : st === 'elsewhere' || st === 'away' ? ' · ' + (st === 'away' ? 'away' : 'elsewhere') : st === 'error' ? ' · failed' : '';
  const tip = (r.reason && netPlainError(r.reason)) || (st === 'fresh' && r.at ? `Already up to date (${_hrHM(r.at)})` : '');
  return `<span class="hr-chip s-${escAttr(st)}"${tip ? ` title="${escAttr(tip)}"` : ''}>${ic}<span>${esc(label)}${esc(word)}</span></span>`;
}
function _hrSummaryText(run) {
  if (run.offline) return 'Refreshed for the current time. Freeflo isn’t answering, so nothing new came in.';
  const bad = _hrProblems(run);
  if (run.cancelled) return 'Refresh stopped. What already came in is shown.';
  if (bad.length) return `Refreshed, but ${bad.map(([id]) => _hrLabel(run, id)).join(' and ')} ${bad.length === 1 ? 'needs' : 'need'} another try.`;
  return 'Everything is up to date';
}
function _hrPaint() {
  const run = _hr.run || _hr.last;
  let el = document.getElementById('hr-panel');
  if (!run || !run.visible) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'hr-panel'; el.className = 'hr-panel';
    el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Refresh today');
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); _hrClose(); } });
    el.addEventListener('mouseenter', () => clearTimeout(_hr.hideT));
    el.addEventListener('focusin', () => clearTimeout(_hr.hideT));
    document.body.appendChild(el);
  }
  // The control that had focus gets it back after the repaint (Cancel becomes Close when the run ends).
  const ae = document.activeElement;
  const fk = ae && el.contains(ae) ? (ae.dataset.hrRetry ? 'retry:' + ae.dataset.hrRetry : ae.hasAttribute('data-hr-cancel') || ae.hasAttribute('data-hr-close') ? 'end' : '') : '';
  const busy = !run.done;
  const ids = (run.steps || []).map(s => s.id).concat(Object.keys(run.results).filter(id => !(run.steps || []).some(s => s.id === id)));
  const chips = ids.filter(id => run.results[id]).map(id => _hrChip(run, id, run.results[id])).join('<span class="hr-sep" aria-hidden="true">·</span>');
  const head = busy ? `<span class="spinner" aria-hidden="true"></span><b>Refreshing everything</b>`
    : `${icon(_hrProblems(run).length || run.offline ? 'triangle-alert' : 'circle-check', 'i-sm')}<b>${esc(_hrSummaryText(run))}</b><span class="hr-at">${esc(_hrHM(_hr.lastAt || Date.now()))}</span>`;
  const rows = busy ? '' : (run.offline ? [['server', run.results.server]] : _hrProblems(run)).map(([id, r]) =>
    `<div class="hr-row s-${escAttr(r.status)}"><span class="hr-row-t"><b>${esc(_hrLabel(run, id))}:</b> ${esc(r.reason ? netPlainError(r.reason) : 'It did not finish. Try again.')}</span><button type="button" class="btn btn-ghost btn-sm" data-hr-retry="${escAttr(id)}">${icon('refresh-cw', 'i-xs')}<span>Try again</span></button></div>`).join('');
  const calm = busy ? '' : Object.entries(run.results).filter(([, r]) => r && (r.status === 'away' || r.status === 'elsewhere')).map(([id, r]) =>
    `<div class="hr-row is-calm">${icon(r.status === 'away' ? 'moon' : 'monitor', 'i-xs')}<span class="hr-row-t"><b>${esc(_hrLabel(run, id))}:</b> ${esc(r.reason || '')}</span></div>`).join('');
  el.classList.toggle('is-busy', busy);
  el.classList.toggle('is-warn', !busy && (!!run.offline || _hrProblems(run).length > 0));
  el.innerHTML = `<div class="hr-top">${head}<span class="spacer"></span>`
    + (busy ? `<button type="button" class="btn btn-ghost btn-sm" data-hr-cancel>Cancel</button>` : `<button type="button" class="btn-icon btn-sm" data-hr-close aria-label="Close" data-tip="Close" data-kbd="Esc">${icon('x')}</button>`)
    + `</div>${chips ? `<div class="hr-chips">${chips}</div>` : ''}${rows}${calm}`;
  const c = el.querySelector('[data-hr-cancel]'); if (c) c.onclick = () => { if (_hr.run && _hr.run.cancel) _hr.run.cancel(); };
  const x = el.querySelector('[data-hr-close]'); if (x) x.onclick = _hrClose;
  el.querySelectorAll('[data-hr-retry]').forEach(b => { b.onclick = () => { if (b.dataset.hrRetry === 'server') homeRefreshToday(); else homeRefreshRetry(b.dataset.hrRetry); }; });
  if (fk) {
    const to = (fk.startsWith('retry:') && el.querySelector(`[data-hr-retry="${CSS.escape(fk.slice(6))}"]`)) || el.querySelector('[data-hr-cancel], [data-hr-close]');
    if (to) try { to.focus({ preventScroll: true }); } catch (e) { /* gone */ }
  }
}
function _hrClose() {
  clearTimeout(_hr.hideT);
  if (_hr.run) _hr.run.visible = false; else if (_hr.last) _hr.last.visible = false;
  const el = document.getElementById('hr-panel');
  if (!el) return;
  const had = el.contains(document.activeElement);
  el.remove();
  if (had) { const b = document.getElementById('tb-home-refresh'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { /* gone */ } }
}
/** All good: the panel goes by itself after a moment (not while the pointer or focus is on it). */
function _hrAutoHide() {
  clearTimeout(_hr.hideT);
  _hr.hideT = setTimeout(() => {
    const el = document.getElementById('hr-panel');
    if (!el || el.matches(':hover') || el.contains(document.activeElement)) return;
    if (window.Motion && !Motion.prefersReduced() && el.animate) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180 }).finished.then(_hrClose, _hrClose);
    else _hrClose();
  }, 4500);
}

/* ---------- the button ---------- */
/** The button says it is working (and spins, unless motion is reduced); its tip says when it last ran. */
function _homeRefreshLabel(btn, busy) {
  const t = btn.querySelector('span'); if (t) t.textContent = busy ? 'Refreshing…' : 'Refresh today';
  const i = btn.querySelector('.i'); if (i) i.classList.toggle('spin', !!busy);
  if (busy) btn.setAttribute('aria-busy', 'true'); else btn.removeAttribute('aria-busy');
  const when = _hr.lastAt ? ` Last refreshed ${_hrHM(_hr.lastAt)}.` : '';
  btn.setAttribute('data-tip', busy ? 'Refreshing calendar, inbox, finances, weather and the day adviser. Click to see how it is going.'
    : `Refresh everything: calendar, inbox, finances, weather and the day adviser.${_hrEveryText() ? ` It also refreshes on its own ${_hrEveryText()} (Settings > Home and stories).` : ''}${when}`);
}
function _hrButtons() { const b = document.getElementById('tb-home-refresh'); if (b) _homeRefreshLabel(b, !!_hr.run); }
function homeRefreshClock() {
  if (state.view !== 'home' || document.hidden || _hr.run) return;
  const minute = String(Math.floor(Clock.now() / 60000));
  if (minute === _homeClockMinute) return;
  _homeClockMinute = minute; // Set before painting; hero painting invokes its ticker.
  const active = document.activeElement;
  if (active && active.closest && active.closest('.home-head, .hg-w')) return;
  homeRefreshSoft();
  if (typeof homeAdvisorTick === 'function') homeAdvisorTick();
}
function homeRefreshButton(crumb) {
  _hrHook();
  if (document.getElementById('tb-home-refresh')) return;
  const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'tb-home-refresh'; btn.className = 'tb-home-cust';
  btn.innerHTML = icon('refresh-cw', 'i-sm') + '<span>Refresh today</span>';
  btn.setAttribute('aria-controls', 'hr-panel');
  _homeRefreshLabel(btn, !!_hr.run);
  btn.onclick = homeRefreshToday;          // during a run: shows that run (it never starts a second)
  crumb.insertAdjacentElement('afterend', btn);
}

/* ---------- on its own ---------- */
/** The timers: hooked once (the first Home paint, or a moment after load on any page). */
function _hrHook() {
  if (_hr.hooked || typeof document === 'undefined' || typeof document.addEventListener !== 'function' || typeof setInterval !== 'function') return;
  _hr.hooked = true;
  _hr.lastAt = _hr.lastAt || Date.now();   // the page has just loaded everything
  _hr.tickAt = Date.now();
  setInterval(() => {
    const now = Date.now(), gap = now - _hr.tickAt;
    _hr.tickAt = now;
    if (document.hidden) return;
    if (gap > HR_WAKE_GAP_MS) { homeRefreshAuto('wake'); return; }    // the computer slept
    const every = _hrEveryMs();
    if (every && now - _hr.lastAt >= every) homeRefreshAuto('timer');
  }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { _hr.hiddenAt = Date.now(); return; }
    homeRefreshClock();
    if (_hr.hiddenAt && Date.now() - _hr.hiddenAt > HR_AWAY_MS) homeRefreshAuto('visible');
    _hr.hiddenAt = 0;
  });
}
if (typeof setTimeout === 'function' && typeof document !== 'undefined') setTimeout(_hrHook, 0);

/* ---------- Settings > Home and stories (78-brief-hooks.js adds the row) ---------- */
function homeRefreshSettingsRow() {
  const sel = _settingsSelect(HR_EVERY_CHOICES, homeRefreshEvery(), (v) => {
    if (typeof uiPrefSet === 'function') uiPrefSet('refreshEvery', v);
    _hrButtons();
    const c = HR_EVERY_CHOICES.find(x => x[0] === v);
    toast(`Refresh set to ${c ? c[1].toLowerCase() : 'every hour'}`, { kind: 'ok', icon: 'refresh-cw' });
  });
  sel.setAttribute('aria-label', 'Refresh everything automatically');
  // One sentence on the face (SIMPLIFY_PLAN.md 5.1, P2); the details stay in the tooltip.
  sel.setAttribute('data-tip', 'Weather, travel and data read without Claude refresh on this schedule. Parts that use Claude (calendars and email read through Claude, the bank update, the day adviser, tasks from email) refresh at most every hour, and only when something could have changed. Refresh today always refreshes everything at once. The same on all your computers.');
  return _settingsRow('Refresh everything automatically',
    'While Freeflo is open; parts that use Claude refresh at most once an hour.',
    sel);
}
