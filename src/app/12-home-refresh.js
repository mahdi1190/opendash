/* Refresh derived Home content using the dashboard clock. No AI regeneration,
 * connector jobs, page reload or writes to tasks/notes are needed. */
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
function homeRefreshDerived() {
  if (typeof _sgSnap !== 'undefined') _sgSnap = null;
  if (typeof _sgEval !== 'undefined') _sgEval = null;
  if (typeof _homeMemoCache !== 'undefined') _homeMemoCache.clear();
  if (typeof _bfUpdate === 'function') _bfUpdate(['hero']);
  if (typeof _bfPaintAi === 'function') _bfPaintAi(null, false);
  if (typeof _hdRepaintIdeas === 'function') _hdRepaintIdeas();
  if (typeof homeAdvisorPaint === 'function') homeAdvisorPaint();
  if (typeof homeRerenderWidget === 'function') {
    for (const frame of document.querySelectorAll('#main-body .hg-w[data-wid]')) {
      // Editors and receipt controls keep their DOM and focus during a refresh.
      const id = frame.dataset.wid, base = id.split('~')[0];
      if (['notebook', 'capture', 'launchpad'].includes(base) || frame.contains(document.activeElement)) continue;
      homeRerenderWidget(id);
    }
  }
}
function homeRefreshToday() {
  if (_homeTodayRefresh) return _homeTodayRefresh;
  _homeCurrentDate = todayStr();
  _homeClockMinute = String(Math.floor(Clock.now() / 60000));
  if (typeof _hd !== 'undefined') { _hd.story = null; _hd.storyAt = 0; }
  homeRefreshDerived();
  const btn = document.getElementById('tb-home-refresh');
  if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
  _homeTodayRefresh = Promise.resolve().then(async () => {
    const jobs = [];
    if (typeof homeDataRefreshVisible === 'function') jobs.push(homeDataRefreshVisible());
    if (typeof _serverAvailable !== 'undefined' && _serverAvailable) {
      if (typeof briefLoadWeather === 'function') jobs.push(briefLoadWeather());
      if (typeof CalStore !== 'undefined' && typeof CalStore.load === 'function') jobs.push(CalStore.load(true));
    }
    await Promise.allSettled(jobs);
    if (state.view === 'home') homeRefreshDerived();
    if (typeof toast === 'function') toast('Today refreshed for the current time', { kind: 'ok' });
  }).finally(() => {
    _homeTodayRefresh = null;
    const current = document.getElementById('tb-home-refresh');
    if (current) { current.disabled = false; current.removeAttribute('aria-busy'); }
  });
  return _homeTodayRefresh;
}
function homeRefreshClock() {
  if (state.view !== 'home' || document.hidden || _homeTodayRefresh) return;
  const minute = String(Math.floor(Clock.now() / 60000));
  if (minute === _homeClockMinute) return;
  _homeClockMinute = minute; // Set before painting; hero painting invokes its ticker.
  const active = document.activeElement;
  if (active && active.closest && active.closest('.home-head, .hg-w')) return;
  homeRefreshDerived();
  if (typeof homeAdvisorTick === 'function') homeAdvisorTick();
}
function homeRefreshButton(crumb) {
  if (document.getElementById('tb-home-refresh')) return;
  const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'tb-home-refresh'; btn.className = 'tb-home-cust';
  btn.innerHTML = icon('refresh-cw') + '<span>Refresh today</span>';
  btn.setAttribute('data-tip', 'Update ideas, day so far and Home widgets for the current time');
  btn.disabled = !!_homeTodayRefresh;
  btn.onclick = homeRefreshToday;
  crumb.insertAdjacentElement('afterend', btn);
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') document.addEventListener('visibilitychange', () => {
  if (!document.hidden) homeRefreshClock();
});
