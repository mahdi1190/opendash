/* ============================================================
   CLOCK OVERRIDE (owner: SWEEP; travel spec 2.8). Which zone the dashboard
   shows: this computer's (the default), always the home zone ("Keep London
   time"), always one zone, or a trip's zone until a date ("Use Tokyo time
   until Fri 9 Oct", travel T7). It is config.json `time` ({follow, zone?,
   trip?}): the server reads the same, so the page, the server and the MCP
   agree. Only when Clock.overrideReady: every display file asks Clock
   (tools/clock-audit.mjs), so the calendar, Home and Tasks never disagree.
   The Settings radio and the banner's "Keep London time" are 87-clock-ui.js
   (CLOCK); this file adds the trip's zone, the prefilled choice and the API.

     ClockOverride.ready()                   Clock.overrideReady
     ClockOverride.current()                 {follow, zone?, trip?} (config.time)
     ClockOverride.check(next)               '' or why it cannot be set
     ClockOverride.set(next, o)              save it -> Promise<{ok, same?, before, after, message?}>;
                                             a toast with Undo unless o.quiet
     ClockOverride.keepHome(o) / followSystem(o) / useZone(zone, o)
     ClockOverride.useTrip(zone, until, o)   a trip's zone until 'YYYY-MM-DD' (T7's ✓)
     ClockOverride.describe(t?)              'Showing Tokyo time until Fri 9 Oct' ...
     ClockOverride.tripOn()                  a trip's zone is in force
     ClockOverride.openSettings(proposal?)   Settings at the Dashboard time row; a proposal
                                             ({trip:{zone, until}} | {follow, zone?}) shows ticked and
                                             is saved only with Save (T7's primary, the prefill rule)
     ClockOverride.onApplied(fn) -> off      fn({from, to, time}) after the shown zone changed
     clockFollowTripOption(box, after)       87-clock-ui.js's radio group: the trip / proposal option

   The suggestions engine's 'time.follow' action (68-suggest-actions.js) calls set(), and
   its Undo puts the old config.time back; nav {to:'clock', proposal} calls openSettings().
   Other tabs follow a change through localStorage.
   ============================================================ */
const _CO_KEY = 'dashboard-clock-time';         // localStorage: the last change, for the other tabs
const _coSubs = new Set();
let _coShown = '';                              // the zone last shown (to tell a real change)
let _coProposal = null;                         // a prefilled choice waiting for Save (T7's primary)

function _coTime() { const t = typeof APP_CONFIG !== 'undefined' && APP_CONFIG && APP_CONFIG.time; return t && typeof t === 'object' ? t : { follow: 'system' }; }
function _coValidZone(z) { return typeof z === 'string' && !!z && !!Clock.canon(z); }
function _coIso(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
/** A trip's zone still in force (its `until` not passed in its own zone). */
function _coTripOn(t) {
  const tr = t && t.trip;
  return !!(tr && _coValidZone(tr.zone) && _coIso(tr.until) && tr.until >= Clock.today(tr.zone));
}
/** next -> the config.time to save ({follow, zone?, trip?}), or null when it is not valid. */
function _coNorm(next) {
  const n = next && typeof next === 'object' ? next : {};
  const follow = ['system', 'home', 'zone'].includes(n.follow) ? n.follow : 'system';
  const out = { follow };
  if (follow === 'zone') { if (!_coValidZone(n.zone)) return null; out.zone = Clock.canon(n.zone); }
  if (n.trip) {
    if (!_coValidZone(n.trip.zone) || !_coIso(n.trip.until)) return null;
    out.trip = { zone: Clock.canon(n.trip.zone), until: n.trip.until };
  }
  return out;
}
function _coSame(a, b) {
  const k = (t) => JSON.stringify([t.follow || 'system', t.follow === 'zone' ? t.zone || '' : '', t.trip ? [t.trip.zone, t.trip.until] : null]);
  return k(a || {}) === k(b || {});
}
/** 'Fri 9 Oct' for a wall date. */
function _coDay(iso) {
  try { return new Date(iso + 'T12:00:00Z').toLocaleDateString((APP_CONFIG && APP_CONFIG.locale) || undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); } catch (e) { return iso; }
}
/** One line for a config.time: what the dashboard shows. */
function _coDescribe(t) {
  t = t || _coTime();
  if (t.follow === 'home') return `Showing ${Clock.label(Clock.home())} time (home)`;
  if (t.follow === 'zone' && _coValidZone(t.zone)) return `Showing ${Clock.label(t.zone)} time`;
  if (_coTripOn(t)) return `Showing ${Clock.label(t.trip.zone)} time until ${_coDay(t.trip.until)}`;
  return `Following this computer: ${Clock.label(Clock.system())} time`;
}
function _coCheck(next) {
  if (!Clock.overrideReady) return 'The dashboard can only show this computer\'s time for now.';
  return _coNorm(next) ? '' : 'That time zone or date is not known.';
}

/** Put a saved config.time in force here: Clock reads it, the page repaints, the other tabs follow. */
function _coApply(time, o) {
  o = o || {};
  if (typeof APP_CONFIG === 'undefined' || !APP_CONFIG) return;
  APP_CONFIG.time = Object.assign({}, time);    // a new object, replaced (a merge would keep a removed trip)
  // Clock's 'zone' event (reason 'setting'): 87-clock-ui.js repaints and the calendar follows; no banner.
  if (typeof Clock.refresh === 'function') Clock.refresh('setting');
  const z = Clock.zone();
  if (o.broadcast) { try { localStorage.setItem(_CO_KEY, JSON.stringify({ at: Date.now(), time: APP_CONFIG.time })); } catch (e) { /* private mode */ } }
  if (z !== _coShown) {
    const from = _coShown; _coShown = z;
    // The calendar index, Home's memos and the repeat cache key on Clock.zone(); the small cache
    // of the coming events (10-header.js) holds the server's wall times: read it again.
    try { if (typeof calendarSoon === 'function') calendarSoon(null, true); } catch (e) { /* offline */ }
    for (const fn of [..._coSubs]) { try { fn({ from, to: z, time: APP_CONFIG.time }); } catch (e) { console.error('[clock override]', e); } }
  }
  if (typeof render === 'function' && typeof state !== 'undefined' && o.render !== false) render();
}

async function _coSet(next, o) {
  o = o || {};
  const before = Object.assign({ follow: 'system' }, _coTime());
  const why = _coCheck(next);
  if (why) { if (!o.quiet) toast(why, { kind: 'err' }); return { ok: false, message: why, before }; }
  const after = _coNorm(next);
  if (_coSame(before, after)) { _coProposal = null; return { ok: true, same: true, before, after: before }; }
  let j;
  try {
    const r = await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: { follow: after.follow, zone: after.zone || null, trip: after.trip || null } }) });
    j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  } catch (e) {
    const message = typeof netErrorMessage === 'function' ? netErrorMessage(e, 'the OpenDash server is not running') : String((e && e.message) || e);
    if (!o.quiet) toast('Not saved: ' + message, { kind: 'err' });
    return { ok: false, message, before };
  }
  _coProposal = null;
  _coApply(j && j.time && typeof j.time === 'object' ? j.time : after, { broadcast: true });
  const saved = Object.assign({}, _coTime());
  if (!o.quiet) {
    toast(_coDescribe(saved), { kind: 'ok', icon: 'clock', timeout: 8000,
      action: { label: 'Undo', run: () => _coSet(before, { quiet: true }).then(r => { if (r.ok && !r.same) toast(_coDescribe(r.after), { kind: 'ok', icon: 'clock' }); }) } });
  }
  return { ok: true, before, after: saved };
}

const ClockOverride = {
  ready: () => !!Clock.overrideReady,
  current: () => Object.assign({ follow: 'system' }, _coTime()),
  check: _coCheck,
  set: _coSet,
  keepHome: (o) => _coSet({ follow: 'home' }, o),
  followSystem: (o) => _coSet({ follow: 'system' }, o),
  useZone: (zone, o) => _coSet({ follow: 'zone', zone }, o),
  useTrip: (zone, until, o) => _coSet({ follow: 'system', trip: { zone, until } }, o),
  describe: _coDescribe,
  tripOn: () => _coTripOn(_coTime()),
  proposal: () => _coProposal,
  /** Settings at the Dashboard time row; a proposal shows ticked and waits for Save. */
  openSettings(proposal) {
    const p = proposal && typeof proposal === 'object' ? Object.assign({ follow: 'system' }, proposal) : null;
    _coProposal = p && _coNorm(p) ? p : null;
    const group = typeof SETTINGS_GROUPS !== 'undefined' && SETTINGS_GROUPS.some(g => g.id === 'time') ? 'time' : 'profile';
    if (typeof setView === 'function') { if (state.view === 'settings:' + group) render(); else setView('settings:' + group); }
    requestAnimationFrame(() => {
      const row = document.querySelector('#main-body .clk-row');
      if (!row) return;
      row.scrollIntoView({ block: 'center', behavior: (window.Motion && Motion.prefersReduced && Motion.prefersReduced()) ? 'auto' : 'smooth' });
      const f = row.querySelector('.is-proposed input') || row.querySelector('input:checked');
      if (f) f.focus({ preventScroll: true });
    });
  },
  onApplied(fn) { _coSubs.add(fn); return () => _coSubs.delete(fn); },
};
if (typeof window !== 'undefined') window.ClockOverride = ClockOverride;

/* ---------- the Settings radio: a trip's zone, and a prefilled choice ---------- */
/**
 * Called by clockSettingsRows (87-clock-ui.js) with its radio group: adds
 * "Use Tokyo time until Fri 9 Oct" when a trip's zone is in force or proposed
 * (T7), and for a proposal ticks it with Save / Cancel (nothing changes until Save).
 */
function clockFollowTripOption(box, after) {
  if (!box || !Clock.overrideReady) return;
  const t = _coTime(), prop = _coProposal;
  const tripOn = _coTripOn(t) && t.follow !== 'home' && t.follow !== 'zone';
  const trip = prop && prop.trip ? prop.trip : tripOn ? t.trip : null;
  const radios = () => [...box.querySelectorAll('input[type="radio"]')];
  const name = (radios()[0] && radios()[0].name) || 'clk-follow';
  if (trip) {
    const lab = document.createElement('label'); lab.className = 'clk-radio co-trip';
    const r = document.createElement('input'); r.type = 'radio'; r.name = name; r.value = 'trip';
    const tx = document.createElement('span'); tx.className = 'clk-radio-t'; tx.textContent = `Use ${Clock.label(trip.zone)} time until ${_coDay(trip.until)}`;
    const h = document.createElement('span'); h.className = 'clk-radio-h'; h.textContent = 'for this trip, then this computer’s again';
    lab.append(r, tx, h);
    box.appendChild(lab);
    if (tripOn && !prop) r.checked = true;
    // Chosen by hand (not a proposal): save at once, like the other options.
    r.addEventListener('change', async () => { if (r.checked && !_coProposal) { const res = await _coSet({ follow: 'system', trip }); if (res.ok && typeof after === 'function') after(); } });
  }
  if (!prop) return;
  // The prefilled choice (T7's primary): ticked, highlighted once, saved only with Save (the user's rule, 3 Oct).
  const want = prop.trip ? 'trip' : prop.follow;
  const pick = radios().find(x => x.value === want);
  if (pick) { pick.checked = true; pick.closest('label').classList.add('is-proposed'); }
  if (want === 'zone' && prop.zone) { const zs = box.querySelector('select'); if (zs) zs.value = prop.zone; }
  // While it waits, the other options do not save on their own (capture: before their own
  // handlers): the box holds the choice until Save.
  box.addEventListener('change', (e) => { if (_coProposal && e.target && (e.target.type === 'radio' || e.target.tagName === 'SELECT')) e.stopPropagation(); }, true);
  const bar = document.createElement('div'); bar.className = 'co-prop';
  bar.innerHTML = `<span class="co-prop-t">${icon('sparkles', 'i-sm')}<span>Filled in from a suggestion</span></span>`
    + '<button type="button" class="btn btn-primary btn-sm" data-co="save">Save</button><button type="button" class="btn btn-ghost btn-sm" data-co="cancel">Cancel</button>';
  bar.querySelector('[data-co="save"]').onclick = async () => {
    const k = (radios().find(x => x.checked) || {}).value || 'system';
    const zs = box.querySelector('select');
    const next = k === 'trip' && trip ? { follow: 'system', trip } : k === 'zone' ? { follow: 'zone', zone: zs ? zs.value : '' } : { follow: k };
    const res = await _coSet(next);
    if (res.ok && typeof after === 'function') after();
  };
  bar.querySelector('[data-co="cancel"]').onclick = () => { _coProposal = null; if (typeof render === 'function') render(); };
  box.appendChild(bar);
}

if (typeof window !== 'undefined') {
  // Another tab changed it: follow (the server already has it).
  window.addEventListener('storage', (e) => {
    if (e.key !== _CO_KEY || !e.newValue) return;
    try { const v = JSON.parse(e.newValue); if (v && v.time && typeof v.time === 'object') _coApply(v.time, { broadcast: false }); } catch (err) { /* ignore */ }
  });
  try { _coShown = Clock.zone(); } catch (e) { _coShown = ''; }
}
