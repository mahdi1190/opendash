/* ============================================================
   CLOCK: the page's reaction to a time-zone change. Owner: CLOCK
   (travel spec 2.4, 2.5, 6.4). Clock itself is 07-core-clock.js.

     clockBoot()            99-boot: start Clock's ticker and sensor, compare the
                            computer's zone with the one the server last saw
                            (a change while the tab was closed), tell the server
     clockSettingsRows(el, {home, follow, clock})
                            the Settings rows "Dashboard time", "Home time zone"
                            and "Clock" (Profile uses them; Travel & time may too)
     clockKeepHome()        "Keep <home> time" (only once Clock.overrideReady)

   On a zone change, in this order: Clock emits {kind:'zone'}; render() once;
   the calendar re-derives its days (and updates when "today" left the fetched
   window); POST /api/time/observe (at most once per 10 s); the one-line
   banner, once per change, even with travel off (it is about time, not place).
   A DST change ({kind:'offset'}) only re-renders. A zone that flips back
   within 10 min shows nothing (and takes the first banner away).
   A computer on UTC / Etc while home is a real place gets one card instead:
   "Which time should the dashboard use?" (spec 2.5, case 7).
   ============================================================ */
let _clkBooted = false;
const _clkObs = { last: 0, at: 0, timer: null, client: 'p' + Math.random().toString(36).slice(2, 10) };
const _CLK_BANNER_KEY = 'dashboard-zone-banner';      // localStorage: {from, to, at} of the last change a tab showed
const _CLK_UTC_KEY = 'dashboard-zone-utc-asked';      // localStorage: the UTC card was answered
const _CLK_OPTIN_KEY = 'dashboard-travel-optin-line'; // localStorage: the banner's "Turn on travel features?" line was shown
let _clkRenderTimer = null;
let _clkChangedAt = 0;   // when this tab last saw the computer change zone (also one found at boot)

/**
 * Milliseconds the morning brief / story auto-open should still wait (spec 2.5,
 * rule 3): never in the first 10 min after a zone change, and not before 06:00
 * local on the day of one. 0 = go ahead.
 */
function clockAutoOpenWait(at) {
  if (!_clkChangedAt) return 0;
  const t = at || Date.now();
  const since = t - _clkChangedAt;
  if (since > 24 * 3600000) return 0;
  if (since < 10 * 60000) return 10 * 60000 - since;
  const p = Clock.parts(Clock.now());
  return p.h < 6 ? (6 * 60 - p.min) * 60000 : 0;
}

/**
 * PUT /api/config for the time keys; APP_CONFIG.time is REPLACED by the
 * server's answer (a key set to null is gone, which a merge would keep).
 */
async function _clkPutConfig(patch, okMsg) {
  try {
    const r = await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    if (j.time && typeof j.time === 'object') APP_CONFIG.time = j.time;
    if (typeof j.timezone === 'string') APP_CONFIG.timezone = j.timezone;
    if (okMsg) toast(okMsg, { kind: 'ok' });
    return true;
  } catch (e) {
    toast('Not saved: ' + netErrorMessage(e, 'the OpenDash server is not running'), { kind: 'err' });
    return false;
  }
}
function _clkLs(k, v) {
  try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ }
  return null;
}
const _clkServerUp = () => typeof _serverAvailable === 'undefined' || !!_serverAvailable;

/**
 * Countries and city names for Clock from the place table (69-travel-data.js),
 * read on first use. The travel engine may plug in its own (Clock.usePlaces).
 */
function _clkTablePlaces() {
  if (typeof TR_DATA === 'undefined' || typeof trPlaceTables !== 'function') return null;
  const row = (z) => { try { const t = trPlaceTables(); return t.zones[t.links[z] || z] || null; } catch (e) { return null; } };
  return {
    ccOf: (z) => (row(z) || {}).cc || '',
    label: (z) => { const r = row(z); if (!r || !r.city) return ''; try { const c = trPlaceTables().byId.get(r.city); return c ? c.name : ''; } catch (e) { return ''; } },
  };
}
function clockBoot() {
  if (_clkBooted || typeof Clock === 'undefined') return;
  _clkBooted = true;
  if (!Clock.hasPlaces()) { const p = _clkTablePlaces(); if (p) Clock.usePlaces(p); }
  Clock.start();
  Clock.onChange(_clkOnChange);
  Clock.onTick(() => { if (Date.now() - _clkObs.at > 3600000) _clkObserveSoon(); });   // keep time.json fresh for the MCP (12 h rule)
  _clkBootCompare();
}

function _clkOnChange(ev) {
  if (!ev) return;
  if (ev.kind === 'zone' || ev.kind === 'offset' || ev.kind === 'day') _clkRenderSoon();
  if (ev.kind === 'zone' || ev.kind === 'offset') _clkCalendarFollow();
  if (ev.kind === 'zone' && ev.reason !== 'setting' && ev.reason !== 'trip') {
    _clkChangedAt = Date.now();
    _clkObserveSoon();
    if (ev.flipBack) _clkBannerClose(true);
    else if (Clock.placeless(Clock.system()) && !Clock.placeless(Clock.home())) _clkUtcCard();
    else _clkZoneBanner(ev, false);
  }
}
/** One render for any number of changes in the same moment. */
function _clkRenderSoon() {
  if (_clkRenderTimer) return;
  _clkRenderTimer = setTimeout(() => { _clkRenderTimer = null; if (typeof render === 'function' && typeof state !== 'undefined') render(); }, 0);
}
/** The calendar's days follow the new zone; a "today" outside the fetched window updates it. */
function _clkCalendarFollow() {
  try { if (typeof _calIndex !== 'undefined') _calIndex = null; } catch (e) { /* calendar not loaded */ }
  if (typeof CalStore === 'undefined' || !CalStore.data || !CalStore.data.window) return;
  const w = CalStore.data.window, today = Clock.today();
  if ((w.from && today < Clock.addDays(w.from, -1)) || (w.to && today > Clock.addDays(w.to, 1))) {
    if (typeof CalStore.update === 'function' && CalStore.access() === 'yes') CalStore.update({ force: false });
  }
}

/* ---------- telling the server (POST /api/time/observe, at most once per 10 s) ---------- */
function _clkObserveSoon() {
  if (!_clkServerUp() || typeof fetch !== 'function') return;
  clearTimeout(_clkObs.timer);
  const wait = Math.max(0, 10000 - (Date.now() - _clkObs.last));
  _clkObs.timer = setTimeout(_clkObserveNow, wait ? wait + 100 : 0);
}
async function _clkObserveNow() {
  _clkObs.last = Date.now();
  const zone = Clock.system();
  try {
    const r = await fetch('/api/time/observe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone, offsetMin: Clock.offset(Date.now(), zone), client: _clkObs.client }),
    });
    if (r.status === 429) { _clkObserveSoon(); return; }
    if (r.ok) _clkObs.at = Date.now();
  } catch (e) { /* the server is down: the next change, tick or boot tries again */ }
}

/** Boot: a change while the dashboard was closed counts as a change (banner "since you last opened"). */
async function _clkBootCompare() {
  let was = null;
  if (_clkServerUp() && typeof fetch === 'function') {
    try {
      const r = await fetch('/api/time', { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); was = j && j.system && j.system.zone; }
    } catch (e) { /* offline */ }
  }
  _clkObserveSoon();
  const now = Clock.system(), before = was && Clock.canon(was);
  if (before && before !== now) _clkChangedAt = Date.now();
  if (Clock.placeless(now) && !Clock.placeless(Clock.home())) { _clkUtcCard(); return; }
  if (before && before !== now) {
    const fromEff = effectiveZone(APP_CONFIG, { zone: before, page: true });
    _clkZoneBanner({ kind: 'zone', from: before, to: now, fromEffective: fromEff, toEffective: Clock.zone(), reason: 'boot' }, true);
  }
}

/* ---------- the banner ---------- */
function _clkBannerEl() {
  let el = document.getElementById('clk-banner');
  if (el) return el;
  el = document.createElement('div');
  el.className = 'clk-banner'; el.id = 'clk-banner';
  el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  // In the flow between the top bar and the page, like the server banner (86-offline-banner.js).
  const content = document.getElementById('content');
  if (content && content.parentNode) content.parentNode.insertBefore(el, content);
  else { el.classList.add('is-floating'); document.body.appendChild(el); }
  return el;
}
function _clkBannerClose(quiet) {
  const el = document.getElementById('clk-banner');
  if (!el) return;
  if (quiet || (window.Motion && Motion.prefersReduced && Motion.prefersReduced())) { el.remove(); return; }
  el.classList.add('is-out');
  setTimeout(() => el.remove(), 220);
}
/** The words of the zone banner (pure apart from Clock): {lead, rest}. */
function clockBannerText(ev, boot) {
  const to = ev.toEffective || Clock.zone();
  const from = ev.fromEffective || ev.from || Clock.home();
  const home = Clock.home();
  const place = Clock.label(to);
  // Away: the difference from home ("+8 h", as on the postcard). Back home: from where it was.
  const base = to === home ? from : home;
  const diff = Clock.diff(base, to);
  const diffTxt = diff ? ` (${Clock.fmtDiff(diff)}${to === home ? '' : ' from ' + Clock.label(home)})` : (to === home ? ' (the same time as before)' : ` (the same time as ${Clock.label(home)})`);
  const date = Clock.fmtDate(Clock.now(), { zone: to, weekday: 'long', day: 'numeric', month: 'long' });
  const verb = to === home ? 'is back on' : 'is now on';
  const lead = boot ? `Since you last opened the dashboard, your computer has moved to ${place} time${diffTxt}.` : `Your computer ${verb} ${place} time${diffTxt}.`;
  return { lead, rest: `It is ${date} here; “today”, due dates and the calendar follow it.` };
}
function _clkWinLink() {
  // Windows only: Chrome asks before it opens the Settings app.
  if (!/Win/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || '')) return null;
  const a = document.createElement('a');
  a.className = 'btn btn-ghost btn-sm'; a.href = 'ms-settings:dateandtime';
  a.innerHTML = icon('settings') + '<span>How to change the computer’s time zone</span>';
  return a;
}
function _clkTravelOff() { const t = APP_CONFIG.travel; return !(t && t.on); }
function _clkZoneBanner(ev, boot, force) {
  if (typeof document === 'undefined' || !document.body) return;
  if (ev.fromEffective && ev.toEffective && ev.fromEffective === ev.toEffective) return;   // the dashboard keeps its zone (override): nothing to say
  // Once per change, across tabs: a tab that already showed this change claims it.
  let claim = null;
  try { claim = JSON.parse(_clkLs(_CLK_BANNER_KEY) || 'null'); } catch (e) { claim = null; }
  if (!force && claim && claim.from === ev.from && claim.to === ev.to && (boot || Date.now() - claim.at < 5 * 60000)) return;
  if (document.hidden) { document.addEventListener('visibilitychange', function once() { if (document.hidden) return; document.removeEventListener('visibilitychange', once); _clkZoneBanner(ev, boot, force); }); return; }
  _clkLs(_CLK_BANNER_KEY, JSON.stringify({ from: ev.from, to: ev.to, at: Date.now() }));
  // Travel on and an arrival coming: the arrival card carries this sentence instead (spec 2.4 step 6;
  // one surface, never both). 69-travel-moments.js calls back if no arrival follows.
  if (!force && typeof trMomentsTakeBanner === 'function' && trMomentsTakeBanner(ev, clockBannerText(ev, boot), () => _clkZoneBanner(ev, boot, true))) return;
  const el = _clkBannerEl();
  const words = clockBannerText(ev, boot);
  const home = Clock.home(), to = ev.toEffective || Clock.zone();
  el.dataset.kind = 'zone';
  el.innerHTML = `<span class="clk-ic">${icon('globe')}</span><div class="clk-msg"><span class="clk-t"></span> <span class="clk-s"></span><div class="clk-optin" hidden></div></div><div class="clk-acts"></div>`;
  el.querySelector('.clk-t').textContent = words.lead;
  el.querySelector('.clk-s').textContent = words.rest;
  const acts = el.querySelector('.clk-acts');
  if (to !== home) {
    if (Clock.overrideReady) {
      const keep = document.createElement('button'); keep.type = 'button'; keep.className = 'btn btn-secondary btn-sm';
      keep.textContent = `Keep ${Clock.label(home)} time`;
      keep.addEventListener('click', () => { clockKeepHome(); _clkBannerClose(); });
      acts.appendChild(keep);
    } else {
      const a = _clkWinLink();
      if (a) acts.appendChild(a);
    }
  }
  const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm clk-x'; x.setAttribute('aria-label', 'Dismiss');
  x.innerHTML = icon('x');
  x.addEventListener('click', () => _clkBannerClose());
  acts.appendChild(x);
  // Travel off and now abroad: one line, once (spec 2.4 step 6, 6.4).
  const away = Clock.away();
  if (away.away && !Clock.placeless(to) && _clkTravelOff() && !_clkLs(_CLK_OPTIN_KEY)) {
    _clkLs(_CLK_OPTIN_KEY, String(Date.now()));
    const line = el.querySelector('.clk-optin');
    line.hidden = false;
    line.innerHTML = '<span>Turn on travel features? Local time, weather and tips for the trip; everything stays on this computer.</span>';
    const on = document.createElement('button'); on.type = 'button'; on.className = 'btn btn-ghost btn-sm'; on.textContent = 'Turn on…';
    on.addEventListener('click', () => {
      if (window.Travel && typeof Travel.turnOn === 'function') Travel.turnOn();
      else setView(typeof SETTINGS_GROUPS !== 'undefined' && SETTINGS_GROUPS.some(g => g.id === 'time') ? 'settings:time' : 'settings');
      line.hidden = true;
    });
    const no = document.createElement('button'); no.type = 'button'; no.className = 'btn btn-ghost btn-sm'; no.textContent = 'Not now';
    no.addEventListener('click', () => { line.hidden = true; });
    line.append(on, no);
  }
  requestAnimationFrame(() => el.classList.add('on'));
}

/** "Keep <home> time": follow home while away (needs the override). Undo puts the old setting back. */
async function clockKeepHome() {
  if (!Clock.overrideReady) return false;
  // The override's own path when it is there (87-clock-override.js: toast with Undo, other tabs follow).
  if (typeof ClockOverride !== 'undefined' && typeof ClockOverride.keepHome === 'function') { const r = await ClockOverride.keepHome(); return !!(r && r.ok); }
  const before = Object.assign({ follow: 'system' }, APP_CONFIG.time || {});
  if (!(await _clkPutConfig({ time: { follow: 'home' } }, false))) return false;
  Clock.refresh('setting');
  toast(`The dashboard keeps ${Clock.label(Clock.home())} time`, {
    kind: 'ok', icon: 'house',
    action: { label: 'Undo', run: async () => { if (await _clkPutConfig({ time: { follow: before.follow, zone: before.zone || null } }, false)) { Clock.refresh('setting'); _clkRenderSoon(); } } },
  });
  return true;
}

/* ---------- the computer is on UTC (spec 2.5, case 7) ---------- */
function _clkUtcCard() {
  if (typeof document === 'undefined' || !document.body || _clkLs(_CLK_UTC_KEY)) return;
  if (APP_CONFIG.time && APP_CONFIG.time.follow === 'home') return;
  const el = _clkBannerEl();
  const home = Clock.label(Clock.home());
  el.dataset.kind = 'utc';
  el.innerHTML = `<span class="clk-ic">${icon('clock')}</span><div class="clk-msg"><span class="clk-t"></span> <span class="clk-s"></span></div><div class="clk-acts"></div>`;
  el.querySelector('.clk-t').textContent = `This computer is set to ${Clock.label(Clock.system())}; your home time zone is ${home}.`;
  el.querySelector('.clk-s').textContent = 'Which should the dashboard use?';
  const acts = el.querySelector('.clk-acts');
  const homeBtn = document.createElement('button'); homeBtn.type = 'button'; homeBtn.className = 'btn btn-secondary btn-sm'; homeBtn.textContent = home;
  homeBtn.addEventListener('click', async () => {
    _clkLs(_CLK_UTC_KEY, 'home');
    if (!(await _clkPutConfig({ time: { follow: 'home' } }, false))) return;
    Clock.refresh('setting');
    if (Clock.overrideReady) { _clkBannerClose(); toast(`The dashboard uses ${home} time`, { kind: 'ok', icon: 'house' }); return; }
    // Until the page can show another zone, the server (Claude, the stories) keeps home time and the page says so.
    el.querySelector('.clk-t').textContent = `Claude, the stories and the server now use ${home} time.`;
    el.querySelector('.clk-s').textContent = 'This page keeps the computer’s clock until it can show another zone; set Windows to your time zone to change it here too.';
    acts.textContent = '';
    const a = _clkWinLink(); if (a) acts.appendChild(a);
    const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm clk-x'; x.setAttribute('aria-label', 'Dismiss'); x.innerHTML = icon('x');
    x.addEventListener('click', () => _clkBannerClose());
    acts.appendChild(x);
  });
  const sysBtn = document.createElement('button'); sysBtn.type = 'button'; sysBtn.className = 'btn btn-ghost btn-sm'; sysBtn.textContent = 'The computer’s';
  sysBtn.addEventListener('click', () => { _clkLs(_CLK_UTC_KEY, 'system'); _clkBannerClose(); });
  acts.append(homeBtn, sysBtn);
  requestAnimationFrame(() => el.classList.add('on'));
}

/* ---------- Settings rows (Profile & region; Travel & time may reuse them) ---------- */
function _clkZoneText(z) {
  const off = Clock.offset(Clock.now(), z);
  const a = Math.abs(off), h = Math.floor(a / 60), m = a % 60;
  return `${Clock.label(z)}, UTC${off < 0 ? '−' : '+'}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}
/**
 * Append the time rows to a Settings group. opts: {follow (default true), home
 * (default true), clock (default true), onChange()}.
 */
function clockSettingsRows(el, opts) {
  const o = Object.assign({ follow: true, home: true, clock: true }, opts || {});
  const after = () => { Clock.refresh('setting'); _clkRenderSoon(); if (typeof o.onChange === 'function') o.onChange(); };
  if (o.follow) {
    const cur = Clock.follow();
    const ready = Clock.overrideReady;
    const box = document.createElement('div'); box.className = 'clk-radios'; box.setAttribute('role', 'radiogroup'); box.setAttribute('aria-label', 'Dashboard time');
    const zones = settingsTimeZones();
    const zSel = _settingsSelect(zones, (APP_CONFIG.time && APP_CONFIG.time.zone) || Clock.home(), async (v) => {
      // Picking a zone means "Always: <zone>" (it did nothing before unless that was already chosen).
      const was = Clock.follow();
      const r = box.querySelector('input[value="zone"]'); if (r) r.checked = true;
      const patch = was === 'zone' ? { time: { follow: 'zone', zone: v } } : { time: { follow: 'zone', zone: v, trip: null } };
      if (await _clkPutConfig(patch, 'Dashboard time saved')) after();
      else { const b = box.querySelector(`input[value="${was}"]`); if (b) b.checked = true; }
    }, 'set-tz clk-zone');
    zSel.setAttribute('aria-label', 'Time zone to always show');
    const opt = (k, label, extra, disabled) => {
      const lab = document.createElement('label'); lab.className = 'clk-radio' + (disabled ? ' is-off' : '');
      const r = document.createElement('input'); r.type = 'radio'; r.name = 'clk-follow'; r.value = k; r.checked = cur === k; r.disabled = !!disabled;
      r.addEventListener('change', async () => {
        if (!r.checked) return;
        const patch = k === 'zone' ? { time: { follow: 'zone', zone: zSel.value, trip: null } } : { time: { follow: k, trip: null } };   // a choice ends a trip's zone (T7)
        if (await _clkPutConfig(patch, 'Dashboard time saved')) after();
        else box.querySelector(`input[value="${cur}"]`).checked = true;
      });
      const t = document.createElement('span'); t.className = 'clk-radio-t'; t.textContent = label;
      lab.append(r, t);
      if (extra) lab.appendChild(extra);
      return lab;
    };
    const now = document.createElement('span'); now.className = 'clk-radio-h'; now.textContent = `now ${_clkZoneText(Clock.system())}`;
    box.appendChild(opt('system', 'Follow this computer:', now, false));
    box.appendChild(opt('home', `Always my home time (${Clock.label(Clock.home())})`, null, !ready));
    box.appendChild(opt('zone', 'Always:', zSel, !ready));
    if (!ready) zSel.disabled = true;
    if (typeof clockFollowTripOption === 'function') clockFollowTripOption(box, after);   // a trip's zone, a prefilled choice (87-clock-override.js)
    const hint = ready ? '“Today”, due dates, the calendar and greetings use this. Money stays on home time.'
      : '“Today”, due dates and the calendar follow this computer’s clock. Coming soon: the dashboard can’t yet show a time other than the computer’s.';
    const row = _settingsRow('Dashboard time', hint, box);
    row.classList.add('set-row-stack', 'clk-row');
    el.appendChild(row);
  }
  if (o.home) {
    const sel = _settingsSelect(settingsTimeZones(), APP_CONFIG.timezone, async (v) => {
      if (await _clkPutConfig({ timezone: v }, 'Home time zone saved')) after();
    }, 'set-tz');
    sel.setAttribute('aria-label', 'Home time zone');
    el.appendChild(_settingsRow('Home time zone', 'Where you live: money days and “home” use it. While you travel, the dashboard follows this computer. Changes apply at once.', sel));
  }
  if (o.clock) {
    const c12 = APP_CONFIG.time && APP_CONFIG.time.clock12;
    const cur = c12 === true ? '12' : c12 === false ? '24' : 'auto';
    el.appendChild(_settingsRow('Clock', 'How times are written.', _settingsSeg(
      [['auto', 'As the language'], ['24', '24-hour'], ['12', '12-hour']], cur,
      async (k) => { if (await _clkPutConfig({ time: { clock12: k === 'auto' ? null : k === '12' } }, 'Clock saved')) after(); })));
  }
}
