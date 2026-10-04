/* ============================================================
   SETTINGS > TRAVEL & TIME (#view=settings:time). Owner: SURFACES (travel spec 6.4, 5.9).
   User request, 3 Oct: "making sure we track the timezone ... update everything".
   Time: the Dashboard time, Home time zone and Clock rows (87-clock-ui.js
   clockSettingsRows), the second clock and both times for meetings. Travel (off
   until the user turns it on): where trips are noticed from, moments, weather,
   holidays, rates, jet lag, what Claude sees, how long trips are kept, the trips
   (Open / Forget) and "Forget all travel history" (6.5).
   Motion (5.9, the Settings bug): every row has data-m-key="time:<row>". Turning travel
   on reveals its rows: only those enter, the rest stay still; turning it off, they
   leave. A re-render (a save, live sync) in the middle continues the same motion
   (negative delays), never restarts it, and never replays the rest of the group.
   Prefill: a suggestion's nav {view:'settings:time', prefill:{home}} (the long stay, 3.3)
   shows "Make Tokyo my home time zone" ticked with Save / Cancel; nothing changes until Save.
   ============================================================ */

const _TRS_KEEP = [['90', '3 months'], ['180', '6 months'], ['365', '1 year'], ['730', '2 years'], ['1825', '5 years']];
let _trsMove = null;        // {at, enter: Set(keys), leave: [{key, html, top}], ms}: a travel on/off reveal in flight
let _trsHomeProp = null;    // a proposed home zone (prefill), waiting for Save

function _trsRow(key, label, hint, control) {
  const r = _settingsRow(label, hint, control);
  r.dataset.mKey = 'time:' + key;
  return r;
}
function _trsHead(key, title, sub) {
  const h = document.createElement('div'); h.className = 'tr-set-h'; h.dataset.mKey = 'time:' + key;
  h.innerHTML = `<h3>${esc(title)}</h3>` + (sub ? `<p>${esc(sub)}</p>` : '');
  return h;
}
function _trsCheck(label, on, onToggle, o) {
  o = o || {};
  const l = document.createElement('label'); l.className = 'tr-set-cb' + (o.disabled ? ' is-off' : '');
  const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!on; c.disabled = !!o.disabled;
  c.addEventListener('change', () => onToggle(c.checked, c));
  const t = document.createElement('span'); t.textContent = label;
  l.append(c, t);
  if (o.hint) { const h = document.createElement('span'); h.className = 'set-h tr-set-cb-h'; h.textContent = o.hint; l.appendChild(h); }
  return l;
}
async function _trsSave(patch, msg) {
  const ok = await settingsSaveConfig({ travel: patch }, msg === undefined ? 'Saved' : msg);
  if (ok && typeof TravelStore !== 'undefined') TravelStore.changed();
  return ok;
}

/** The time rows (CLOCK's), keyed for 5.9, plus the home-zone proposal and the travel time rows. */
function _trsTimeRows(el, after) {
  el.appendChild(_trsHead('h-time', 'Time', '“Today”, due dates and the calendar follow the time zone below. This works whether or not travel features are on.'));
  const before = el.children.length;
  if (typeof clockSettingsRows === 'function') clockSettingsRows(el, { onChange: after });
  const keys = ['follow', 'home', 'clock'];
  [...el.children].slice(before).forEach((r, i) => { r.dataset.mKey = 'time:' + (keys[i] || 'time-' + i); });
  // "Make <current> my home time zone" (the audit's Use <zone>, P4): when the computer is elsewhere.
  const homeRow = el.querySelector('[data-m-key="time:home"] .set-c');
  const sys = Clock.system(), home = Clock.home();
  const pre = typeof sgTakePrefill === 'function' ? sgTakePrefill('settings:time') : null;
  if (pre && pre.home && typeof clockValidZone === 'function' && clockValidZone(pre.home)) { _trsHomeProp = { zone: pre.home, at: Date.now() }; if (typeof trNavFocus === 'function') trNavFocus('time:home'); }
  if (_trsHomeProp && Date.now() - _trsHomeProp.at > 10 * 60000) _trsHomeProp = null;
  if (homeRow && _trsHomeProp && _trsHomeProp.zone !== home) {
    const z = _trsHomeProp.zone;
    const box = document.createElement('div'); box.className = 'tr-set-prop'; box.dataset.prefilled = '';
    box.innerHTML = sgPrefillTagHtml() + `<label class="tr-set-cb"><input type="checkbox" checked><span></span></label><div class="tr-set-prop-f"></div>`;
    box.querySelector('label span').textContent = `Make ${Clock.label(z)} my home time zone (${z})`;
    const f = box.querySelector('.tr-set-prop-f');
    const save = document.createElement('button'); save.type = 'button'; save.className = 'btn btn-primary btn-sm'; save.textContent = 'Save';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-ghost btn-sm'; cancel.textContent = 'Cancel';
    save.addEventListener('click', async () => {
      const ticked = box.querySelector('input').checked;
      _trsHomeProp = null;
      if (ticked) await _trsSetHome(z);
      else render();
    });
    cancel.addEventListener('click', () => { _trsHomeProp = null; render(); });
    f.append(save, cancel);
    homeRow.appendChild(box);
    requestAnimationFrame(() => sgPrefillSweep(box, { fields: [box] }));
  } else if (homeRow && sys !== home && !(typeof clockPlaceless === 'function' && clockPlaceless(sys))) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm tr-set-mkhome';
    b.innerHTML = icon('house', 'i-sm') + `<span>Make ${esc(Clock.label(sys))} my home time zone</span>`;
    b.addEventListener('click', () => _trsSetHome(sys));
    homeRow.appendChild(b);
  }
  const cfg = trUiCfg(APP_CONFIG.travel);
  el.appendChild(_trsRow('second', 'Second clock', 'In the top bar while you are away: local time and home time. Needs travel features.',
    _settingsSwitch(cfg.secondClock, 'Second clock in the top bar while away', async (on) => { if (await _trsSave({ secondClock: on }, on ? 'Second clock on' : 'Second clock off')) render(); })));
  el.appendChild(_trsRow('meetings', 'Meetings', 'Show both times on events: yours and home’s while away, the event’s own zone, and the other people’s time.',
    _settingsSelect([['auto', 'When away or the zone differs'], ['always', 'Always'], ['off', 'Never']], cfg.bothTimes, async (v) => { if (await _trsSave({ bothTimes: v }, 'Saved')) render(); })));
}
async function _trsSetHome(zone) {
  const before = APP_CONFIG.timezone;
  if (!(await settingsSaveConfig({ timezone: zone }, false))) return false;
  Clock.refresh('setting');
  if (typeof TravelStore !== 'undefined') TravelStore.changed();
  render();
  toast(`Home time zone: ${Clock.label(zone)}`, { kind: 'ok', icon: 'house', action: { label: 'Undo', run: async () => { if (await settingsSaveConfig({ timezone: before }, false)) { Clock.refresh('setting'); render(); } } } });
  return true;
}

/** The travel rows (only while travel is on, apart from the switch). */
function _trsTravelRows(el, repaint) {
  const t = (typeof TravelStore !== 'undefined' ? TravelStore.config() : null) || { sources: {}, holidays: {} };
  const on = trUiCfg(APP_CONFIG.travel).on;
  // The same line either way, so switching does not move the rows above the new ones (5.9).
  el.appendChild(_trsHead('h-travel', 'Travel', on ? 'On: local time, weather and tips when you travel.' : 'Off until you turn it on.'));
  const sw = _settingsSwitch(on, 'Travel features', async (v) => {
    if (!(await settingsSaveConfig({ travel: { on: v } }, v ? 'Travel features on' : 'Travel features off'))) return;
    if (typeof TravelStore !== 'undefined') TravelStore.changed();
    repaint();
  });
  el.appendChild(_trsRow('travel', 'Travel features', 'Notices trips from your calendar, time zone and card payments, and shows local time, weather and tips. Everything stays on this computer.', sw));
  if (!on) return;
  const src = t.sources || {};
  const box = document.createElement('div'); box.className = 'tr-set-cbs';
  const setSrc = (k) => async (v) => { await _trsSave({ sources: { [k]: v } }); if (k === 'geo' && v && typeof TravelStore !== 'undefined') TravelStore.locate(); };
  box.append(
    _trsCheck('this computer’s time zone', src.zone !== false, setSrc('zone')),
    _trsCheck('calendar flights and trips', src.calendar !== false, setSrc('calendar')),
    _trsCheck('card payments abroad', src.bank !== false, setSrc('bank')),
    _trsCheck('this browser’s location', src.geo === true, setSrc('geo'), { hint: 'Asks the browser. On Windows, Chrome may use Windows location services. The dashboard keeps only the nearest city, never coordinates.' }));
  const r1 = _trsRow('sources', 'Notice trips from', null, box); r1.classList.add('set-row-stack');
  el.appendChild(r1);
  el.appendChild(_trsRow('moments', 'Moments', 'Arrival, departure and welcome-home cards, at most once each. How much they move follows Appearance > Motion.',
    _settingsSwitch(t.moments !== false, 'Travel moments', (v) => _trsSave({ moments: v }))));
  el.appendChild(_trsRow('weather', 'Weather where you are', 'Sends the city’s position, not yours, to Open-Meteo.',
    _settingsSwitch(t.weather !== false, 'Weather where you are', (v) => _trsSave({ weather: v }))));
  // Public holidays: home country (+ region), shown in the calendar, days off, online lookup.
  const h = t.holidays || {};
  const hb = document.createElement('div'); hb.className = 'tr-set-hol';
  const ccs = typeof trHolidayCountries === 'function' ? trHolidayCountries() : [];
  const homeCc = h.home || (typeof trZoneCountry === 'function' ? trZoneCountry(Clock.home()) : '') || '';
  const cName = (cc) => (typeof trCountry === 'function' && trCountry(cc) ? trCountry(cc).name : cc);
  const csel = _settingsSelect([['', 'None'], ...ccs.map(cc => [cc, cName(cc)]).sort((a, b) => a[1].localeCompare(b[1]))], ccs.includes(homeCc) ? homeCc : '', async (v) => { if (await _trsSave({ holidays: { home: v, region: '' } })) render(); });
  csel.setAttribute('aria-label', 'Home country for public holidays');
  hb.appendChild(csel);
  const regs = homeCc && typeof trHolidayRegions === 'function' ? trHolidayRegions(homeCc) : [];
  if (regs.length) { const rs = _settingsSelect([['', 'All regions'], ...regs.map(r => [r.id, r.label])], h.region || '', (v) => _trsSave({ holidays: { region: v } })); rs.setAttribute('aria-label', 'Region'); hb.appendChild(rs); }
  const hc = document.createElement('div'); hc.className = 'tr-set-cbs';
  hc.append(
    _trsCheck('show in the calendar', h.show !== false, (v) => _trsSave({ holidays: { show: v } })),
    _trsCheck('treat as days off for suggestions', h.daysOff === true, (v) => _trsSave({ holidays: { daysOff: v } })),
    _trsCheck('look them up online (date.nager.at)', h.online === true, (v) => _trsSave({ holidays: { online: v } }), { hint: 'Only for countries without offline rules, and to confirm estimated dates. Sends the country and year.' }));
  hb.appendChild(hc);
  const r2 = _trsRow('holidays', 'Public holidays', null, hb); r2.classList.add('set-row-stack');
  el.appendChild(r2);
  el.appendChild(_trsRow('rates', 'Exchange rates', 'Your own card payments give the rate the bank used.',
    _settingsSeg([['own', 'From my card payments'], ['online', 'Online (frankfurter.app)']], t.rates === 'online' ? 'online' : 'own', async (k) => { if (await _trsSave({ rates: k })) render(); })));
  el.appendChild(_trsRow('jetlag', 'Jet-lag tips', 'Timing tips after long flights (no medical advice). Meetings with others are never moved.',
    _settingsSwitch(t.jetlag !== false, 'Jet-lag tips', (v) => _trsSave({ jetlag: v }))));
  el.appendChild(_trsRow('ai', 'Let Claude see trips', 'Adds the current city and trip dates to what Claude and MCP clients see. Off: only the time zone.',
    _settingsSwitch(t.shareWithAi === true, 'Let Claude see trips', (v) => _trsSave({ shareWithAi: v }))));
  el.appendChild(_trsRow('keep', 'Keep past trips', 'Your decisions about trips (names, “not a trip”) older than this are removed.',
    _settingsSelect(_TRS_KEEP, String(t.keepDays || 365), (v) => _trsSave({ keepDays: Number(v) }))));
  el.appendChild(_trsTripsRow());
}
/** The trips the dashboard knows: Open / Forget; Forget all travel history. */
function _trsTripsRow() {
  const wrap = document.createElement('div'); wrap.className = 'tr-set-trips';
  const snap = typeof trSnapshot === 'function' ? trSnapshot() : null;
  const trips = snap && Array.isArray(snap.trips) ? snap.trips.filter(t => !t.candidate || t.confirmed).slice(-12).reverse() : [];
  if (!trips.length) { const p = document.createElement('p'); p.className = 'set-h'; p.textContent = 'No trips yet. Flights, trips and stays abroad show here.'; wrap.appendChild(p); }
  for (const t of trips) {
    const r = document.createElement('div'); r.className = 'tr-set-trip'; r.dataset.mKey = 'time:trip:' + t.id;
    r.innerHTML = `${t.dest && typeof trFlagHtml === 'function' ? trFlagHtml(t.dest.cc) : icon('map-pin', 'i-sm')}<span class="tr-set-trip-l"></span><span class="subtle tr-set-trip-d"></span>`;
    r.querySelector('.tr-set-trip-l').textContent = t.label || 'Trip';
    r.querySelector('.tr-set-trip-d').textContent = trUiRange(t.from, t.to);
    const open = document.createElement('button'); open.type = 'button'; open.className = 'btn btn-ghost btn-sm'; open.textContent = 'Open';
    open.addEventListener('click', () => setView('trip:' + t.id));
    const forget = document.createElement('button'); forget.type = 'button'; forget.className = 'btn btn-ghost btn-sm'; forget.textContent = 'Forget';
    forget.addEventListener('click', () => trForgetTripAsk(t.id));
    r.append(open, forget);
    wrap.appendChild(r);
  }
  const all = document.createElement('button'); all.type = 'button'; all.className = 'btn btn-danger btn-sm tr-set-forget-all';
  all.innerHTML = icon('trash-2', 'i-sm') + '<span>Forget all travel history</span>';
  all.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Forget all travel history?', danger: true, confirmLabel: 'Forget everything',
      text: 'This clears your trip decisions, the time-zone history (the current zone stays) and the cached weather and holidays, then turns travel features off. Your calendar events, tasks and payments are not touched. The time-zone history cannot be brought back.' });
    if (!ok) return;
    await TravelStore.forgetAll();
    toast('Travel history forgotten. Travel features are off.', { kind: 'ok', icon: 'trash-2' });
    render();
  });
  wrap.appendChild(all);
  const r = _trsRow('trips', 'Trips', null, wrap); r.classList.add('set-row-stack');
  return r;
}

/* ---------- 5.9: only the rows that appear move ---------- */
function _trsKeyTops(el) { const m = new Map(); for (const n of el.querySelectorAll(':scope > [data-m-key]')) m.set(n.dataset.mKey, { top: n.offsetTop, html: n.outerHTML }); return m; }
/** After a build: continue (or start) the reveal - new rows rise in, rows that stayed glide from their old place. */
function _trsPlay(el) {
  const M = _trsMove;
  if (!M) return;
  if (M.enter === null) {
    // The first build after the switch: which rows are new, which went away.
    const now = new Set([...el.querySelectorAll(':scope > [data-m-key]')].map(n => n.dataset.mKey));
    M.enter = new Set([...now].filter(k => !M.tops.has(k)));
    M.leave = [...M.tops.entries()].filter(([k]) => !now.has(k)).map(([key, v]) => ({ key, top: v.top, html: v.html }));
    M.ms = 260 + Math.min(M.enter.size, 10) * 28;
  }
  const t = performance.now() - M.at;
  if (t > M.ms + 80) { _trsMove = null; return; }
  const reduced = typeof _truReduced === 'function' ? _truReduced() : false;
  if (reduced) { _trsMove = null; return; }
  const rows = [...el.querySelectorAll(':scope > [data-m-key]')];
  // Built off the page (the section mounts into a detached box): no layout yet. Hide the new rows,
  // and play once it is on the page (the next frame).
  if (!el.isConnected) {
    for (const n of rows) if (M.enter.has(n.dataset.mKey)) n.style.opacity = '0';
    requestAnimationFrame(() => { for (const n of rows) n.style.opacity = ''; if (el.isConnected) _trsPlay(el); });
    return;
  }
  let i = 0;
  for (const n of rows) {
    const k = n.dataset.mKey;
    if (M.enter.has(k)) {
      const delay = Math.min(i++, 9) * 28 - t;
      n.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards' });
    } else if (M.tops.has(k)) {
      const dy = M.tops.get(k).top - n.offsetTop;
      if (dy) n.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 260, delay: -t, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards' });
    }
  }
  // Rows that went away: their ghosts fade where they were, then the gap closes (the glide above).
  if (M.leave.length && !M.ghosted) {
    M.ghosted = true;
    const host = el;
    for (const g of M.leave) {
      const tmp = document.createElement('div'); tmp.innerHTML = g.html;
      const ghost = tmp.firstElementChild; if (!ghost) continue;
      ghost.removeAttribute('data-m-key'); ghost.classList.add('tr-set-ghost'); ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
      ghost.style.top = g.top + 'px';
      host.appendChild(ghost);
      const a = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' });
      a.finished.then(() => ghost.remove(), () => ghost.remove());
    }
  }
}
function _trsBuild(el) {
  el.classList.add('tr-set');
  const after = () => { if (typeof TravelStore !== 'undefined') TravelStore.changed(); };
  _trsTimeRows(el, after);
  _trsTravelRows(el, () => _trsRepaint(el));
  _trsPlay(el);
}
/** Repaint the group in place after travel was switched: remember where every row was, rebuild, play. */
function _trsRepaint(el) {
  _trsMove = { at: performance.now(), tops: _trsKeyTops(el), enter: null, leave: null, ms: 400 };
  render();      // the whole page (top bar, sidebar, this group): _trsBuild -> _trsPlay plays the reveal
  if (el.isConnected) { el.textContent = ''; _trsBuild(el); }   // Settings is not the view any more (or render is busy)
}

registerSettingsGroup({
  id: 'time', title: 'Travel & time', icon: 'globe', order: 15,
  description: 'Which time the dashboard shows, your home time zone, and travel features (off until you turn them on).',
  render(el) { _trsBuild(el); },
});
/** Profile & region keeps a link to the time rows (6.4). */
function trSettingsProfileLink() {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm';
  b.innerHTML = icon('globe', 'i-sm') + '<span>Travel & time</span>' + icon('arrow-right', 'i-xs');
  b.addEventListener('click', () => setView('settings:time'));
  const r = _settingsRow('Time zone', `Home: ${Clock.label(Clock.home())}. The dashboard shows ${Clock.label(Clock.zone())} time. Dashboard time, home time zone and the clock are in Travel & time.`, b);
  r.dataset.mKey = 'profile:time';
  return r;
}

/** "Forget this trip" (6.5): asks first (it says what stays and what cannot be undone); Undo restores the decisions. */
async function trForgetTripAsk(id, o) {
  o = o || {};
  const t = typeof TravelStore !== 'undefined' ? TravelStore.trip(id) : null;
  const label = (t && t.label) || 'this trip';
  const ok = await confirmDialog({ title: `Forget ${label}?`, danger: true, confirmLabel: 'Forget trip',
    text: 'The dashboard stops treating it as a trip and deletes the time-zone history of those days. Your calendar events, tasks and payments are not touched. Undo brings the trip back, but not the time-zone history.' });
  if (!ok) return false;
  const before = state.travel ? JSON.parse(JSON.stringify(state.travel)) : undefined;
  const r = await TravelStore.notTrip(id, { forget: true, quiet: true });
  if (!r || r.ok === false) { toast('Not forgotten: ' + ((r && r.message) || 'something went wrong'), { kind: 'err' }); return false; }
  if (o.after) o.after();
  toast(`${label} forgotten. Your events, tasks and payments are unchanged.`, { kind: 'ok', icon: 'trash-2', timeout: 9000,
    action: { label: 'Undo', run: () => { state.travel = before; saveData(); if (typeof TravelStore !== 'undefined') TravelStore.changed(); render(); toast('Trip back', { kind: 'ok', icon: 'undo-2' }); } } });
  render();
  return true;
}
