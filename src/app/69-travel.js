/* ============================================================
   TRAVEL (page): TravelStore and trSnapshot. Owner: TRIPS (travel spec 3,
   5.3, 5.5, 6). The pure rules are 69-travel-logic.js; this file feeds them
   from the page and keeps the user's decisions.
   User request, 3 Oct: "make sure we track the timezone, and we can make
   recommendations based off the location and country and timezone".

     trSnapshot(o)                 ctx.travel (the suggestions' facts; shape in
                                   68-suggest-rules-travel.js), memoised; o.tasks = the
                                   suggestion snapshot's tasks (saves a pass), o.fresh
     TravelStore.on()              travel features on (config.travel.on; OFF until the user
                                   turns them on, decision 1)
     TravelStore.config()          config.travel with defaults
     TravelStore.places()          the place index (69-travel-data.js; built once, lazily)
     TravelStore.trips() / trip(id) / current()      inferred + decided trips (never stored)
     TravelStore.decisions()       state.travel {v, trips, notTrips, moments} (data: undoable, synced)
     TravelStore.confirm(id, patch)    {name?, dest?, from?, to?}: "this is a trip" (one saveData)
     TravelStore.rename(id, name)
     TravelStore.notTrip(id, {forget, quiet}) "Not a trip" / "Forget this trip" (6.5): one saveData
                                   step; forget also deletes the zone history of those days
                                   (DELETE /api/time/history) and the cached weather
     TravelStore.forgetAll()       clears state.travel, the zone history and the caches; travel off
     TravelStore.claim(key) / momentShown(key) / shown(key)
                                   moments: claimed per tab (localStorage), then kept in
                                   state.travel.moments so every tab and device knows (4.1)
     TravelStore.spending(trip)    Promise<{byCcy, homeOnly, fees, total, rows}> (/api/finance/travel)
     TravelStore.weather(cityId)   Promise<forecast | null> (/api/travel/weather; cached 30 min)
     TravelStore.holidays(cc, year)  [{date, name, estimated?}] (offline rules; online when allowed)
     TravelStore.locate()          opt-in browser location -> the nearest city (coordinates dropped)
     TravelStore.refresh()         re-read the zone history and the payments abroad
     TravelStore.version() / changed() / onChange(fn) -> off
   Sensor glue: Clock.onChange (07-core-clock.js) re-reads the zone history on a zone change
   and drops the memo on a new day. Nothing here runs at load except that subscription.
   Privacy (6): only decisions are stored; places, legs, trips and totals are recomputed;
   browser coordinates never leave this page and are reduced to a city at once.
   ============================================================ */

const TRL_CLAIM_KEY = 'dashboard-travel-claim:';
const TRL_ROWS_TTL = 30 * 60000, TRL_TIME_TTL = 10 * 60000, TRL_WEATHER_TTL = 30 * 60000;
let _trlP = null, _trlPQueued = false;
let _trlVer = 0, _trlMemo = null, _trlMemoKey = '';
let _trlTimeT = null;
const _trlSubs = new Set();
const _trlTab = Math.random().toString(36).slice(2, 10);
const _trlCache = { changes: null, changesAt: 0, rows: null, rowsAt: 0, weather: new Map(), online: new Map(), geo: null, busy: new Set() };

function _trlConfig() {
  const t = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG && APP_CONFIG.travel) || {};
  const s = t.sources || {}, h = t.holidays || {};
  return {
    on: t.on === true, prompt: t.prompt !== false, moments: t.moments !== false, weather: t.weather !== false, jetlag: t.jetlag !== false,
    sources: { zone: s.zone !== false, calendar: s.calendar !== false, bank: s.bank !== false, geo: s.geo === true },
    holidays: { home: h.home || '', region: h.region || '', daysOff: h.daysOff === true, show: h.show !== false, online: h.online === true },
    rates: t.rates === 'online' ? 'online' : 'own', shareWithAi: t.shareWithAi === true, keepDays: Number(t.keepDays) || 365,
  };
}
/** The place index; built on first use (about 10 ms), off the first paint when travel is off. */
function _trlPlaces(o) {
  if (_trlP) return _trlP;
  const build = () => { _trlP = typeof TR_DATA !== 'undefined' ? trPlaceIndexFromData(TR_DATA) : trPlaceIndex({}); return _trlP; };
  if (o && o.lazy) {
    if (!_trlPQueued) {
      _trlPQueued = true;
      const idle = typeof requestIdleCallback === 'function' ? requestIdleCallback : (fn) => setTimeout(fn, 400);
      idle(() => { build(); _trlBump(); });
    }
    return null;
  }
  return build();
}
function _trlNow() { return typeof Clock !== 'undefined' ? Clock.now() : Date.now(); }
function _trlZoneNow() { return typeof Clock !== 'undefined' ? Clock.zone() : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'); }
function _trlHomeZone() { return typeof Clock !== 'undefined' ? Clock.home() : ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.timezone) || 'UTC'); }
function _trlToday() { return typeof Clock !== 'undefined' ? Clock.today() : (typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10)); }   // clock-ok: fallback only when Clock is absent (VM tests)

/* ---------- decisions (state.travel: data) ---------- */
function _trlNormState(s) {
  const x = s && typeof s === 'object' ? s : {};
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  return { v: 1, trips: obj(x.trips), notTrips: obj(x.notTrips), moments: obj(x.moments) };
}
/** One saveData step over state.travel; old decisions (keepDays) are pruned on the way. */
function _trlWrite(fn) {
  const s = JSON.parse(JSON.stringify(_trlNormState(typeof state !== 'undefined' ? state.travel : null)));
  fn(s);
  const cut = clockAddDays(_trlToday(), -_trlConfig().keepDays);
  for (const [id, t] of Object.entries(s.trips)) if (t && t.to && t.to < cut) delete s.trips[id];
  for (const [k, d] of Object.entries(s.notTrips)) if (typeof d === 'string' && d < cut) delete s.notTrips[k];
  const old = Date.now() - _trlConfig().keepDays * 86400000;
  for (const [k, ts] of Object.entries(s.moments)) if (Number(ts) < old) delete s.moments[k];
  state.travel = s;
  saveData();
  _trlBump();
}
function _trlBump() {
  _trlVer++;
  _trlMemo = null;
  for (const fn of [..._trlSubs]) { try { fn(); } catch (e) { console.error('[travel]', e); } }
  if (typeof sgRefresh === 'function') sgRefresh();
}

/* ---------- inputs fetched from the server (read only) ---------- */
async function _trlGet(url) {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
function _trlOnce(key, fn) {
  if (_trlCache.busy.has(key)) return;
  _trlCache.busy.add(key);
  Promise.resolve().then(fn).catch(e => console.error('[travel]', e)).finally(() => _trlCache.busy.delete(key));
}
/** The zone history (CLOCK's /api/time: the last changes) plus this tab's own live ones. */
function _trlChanges() {
  if (Date.now() - _trlCache.changesAt > TRL_TIME_TTL) {
    _trlCache.changesAt = Date.now();
    _trlOnce('time', async () => {
      const j = await _trlGet('/api/time');
      if (j && Array.isArray(j.changes)) { _trlCache.changes = j.changes; _trlBump(); }
    });
  }
  const live = typeof Clock !== 'undefined' && typeof Clock.changes === 'function' ? Clock.changes() : [];
  const all = (_trlCache.changes || []).concat(live.map(c => ({ at: c.at, from: c.from, to: c.to })));
  const seen = new Set();
  return all.filter(c => { const k = String(Date.parse(c.at) || c.at) + c.to; if (seen.has(k)) return false; seen.add(k); return true; });
}
/** Payments abroad in the last 45 days (/api/finance/travel), when the bank source is on. */
function _trlRows(cfg) {
  if (!cfg.sources.bank) return null;
  if (Date.now() - _trlCache.rowsAt > TRL_ROWS_TTL) {
    _trlCache.rowsAt = Date.now();
    const to = clockAddDays(_trlToday(), 3), from = clockAddDays(_trlToday(), -45);
    _trlOnce('rows', async () => {
      const j = await _trlGet(`/api/finance/travel?from=${from}&to=${to}`);
      if (j && Array.isArray(j.rows)) { _trlCache.rows = j.rows; _trlBump(); }
    });
  }
  return _trlCache.rows;
}
/** The cached forecasts by city id (trBuildSnapshot sums them up per trip: trWeatherSummary). */
function _trlWeatherInput(cfg) {
  const out = {};
  if (!cfg.weather) return out;
  for (const [id, c] of _trlCache.weather) if (c && c.data && Date.now() - c.at < TRL_WEATHER_TTL) out[id] = c.data;
  return out;
}
/** Holidays: the offline rules (69-travel-holidays.js), else what the opt-in online lookup brought. */
function _trlHolidaysFor(cc, year) {
  const fn = typeof trHolidays === 'function' ? trHolidays : typeof trHolidaysFor === 'function' ? trHolidaysFor : null;
  let list = null;
  if (fn) { try { const r = fn(cc, year, { region: _trlConfig().holidays.region }); list = Array.isArray(r) ? r : r && Array.isArray(r.days) ? r.days : null; } catch (e) { list = null; } }
  if (list && list.length) return list;
  const on = _trlCache.online.get(cc + ':' + year);
  if (on) return on;
  if (_trlConfig().holidays.online) {
    _trlOnce('hol:' + cc + ':' + year, async () => {
      const j = await _trlGet(`/api/travel/holidays?cc=${encodeURIComponent(cc)}&year=${year}`);
      _trlCache.online.set(cc + ':' + year, j && Array.isArray(j.days) ? j.days : []);
      _trlBump();
    });
  }
  return [];
}

/* ---------- the snapshot ---------- */
function _trlTasks() {
  const out = [];
  if (typeof getAllItems !== 'function') return out;
  for (const i of getAllItems()) {
    const status = typeof statusOf === 'function' ? statusOf(i.id) : '';
    if (status === 'done') continue;
    out.push({ id: i.id, title: String((typeof effTitle === 'function' ? effTitle(i) : i.title) || ''), status, due: (typeof effDate === 'function' ? effDate(i) : i.dueDate) || null,
      planned: i.plannedFor || null, plannedTime: i.plannedTime || null, priority: i.priority || '', tags: typeof effTags === 'function' ? effTags(i) : (i.tags || []) });
  }
  return out;
}
function _trlHome(P) {
  const zone = _trlHomeZone();
  const loc = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.location) || null;
  let cc = loc && /^[A-Z]{2}$/.test(loc.countryCode || '') ? loc.countryCode : '';
  let cityId = '';
  if (loc && loc.name && P) { const pl = trPlace(loc.name + (cc ? ', ' + trCountryLabel(cc) : ''), P, {}); if (pl && pl.cityId && (!cc || pl.cc === cc)) { cityId = pl.cityId; cc = cc || pl.cc; } }
  if (!cc && P) { const zp = trZonePlace(zone, P); cc = zp ? zp.cc : ''; }
  return { zone, cc, cityId, label: (loc && loc.name) || '', ccy: (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.currency) || '' };
}
/**
 * ctx.travel for the suggestions engine and the travel surfaces (pure maths in
 * trBuildSnapshot). Memoised per minute, state version, calendar fetch, zone and the
 * inputs fetched in the background. Travel off: only whether to ask (the opt-in, 6.4).
 */
function trSnapshot(o) {
  o = o || {};
  const cfg = _trlConfig();
  const P = _trlPlaces({ lazy: !cfg.on });
  const now = o.now != null ? Number(o.now) : _trlNow();
  const cal = typeof CalStore !== 'undefined' ? CalStore.data : null;
  const key = [_trlVer, (typeof state !== 'undefined' && state._lastSave) || 0, (typeof state !== 'undefined' && state._saveCount) || 0, cal ? (cal.fetchedAt || '') + ':' + ((cal.events || []).length) : '-',
    _trlZoneNow(), typeof Clock !== 'undefined' ? Clock.system() : '', Math.floor(now / 60000), JSON.stringify((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.travel) || null), P ? 1 : 0].join('|');
  if (!o.fresh && o.now == null && _trlMemo && key === _trlMemoKey) return _trlMemo;
  if (!P) return { v: 1, on: false, trips: [], legs: [], meetings: [], personZones: [], holidays: [], moments: [], optIn: null, pending: true };
  const zone = _trlZoneNow();
  const events = cfg.sources.calendar && cal && Array.isArray(cal.events) ? cal.events : [];
  const s = trBuildSnapshot({
    now, zone, home: _trlHome(P), system: typeof Clock !== 'undefined' ? Clock.system() : zone, on: cfg.on, cfg, overrideReady: typeof Clock !== 'undefined' && !!Clock.overrideReady,
    events, eventMeta: (typeof state !== 'undefined' && state.eventMeta) || {}, tasks: o.tasks || _trlTasks(),
    people: ((typeof state !== 'undefined' && state.people) || []).map(p => ({ id: p.id, name: p.name, email: p.email, emails: p.emails, tz: p.tz, self: !!p.self })),
    myEmails: (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.myEmails) || [],
    changes: cfg.sources.zone ? _trlChanges() : [], rows: cfg.on ? _trlRows(cfg) : null, decisions: _trlNormState(typeof state !== 'undefined' ? state.travel : null),
    work: typeof sgWork === 'function' && typeof sgWorkHoursRaw === 'function' ? sgWork(sgWorkHoursRaw()) : null,
    eveningHour: typeof _sgEveningHour === 'function' ? _sgEveningHour() : 17, P,
    holidaysFor: cfg.on ? _trlHolidaysFor : null, geo: cfg.sources.geo ? _trlCache.geo : null,
    weather: cfg.on ? _trlWeatherInput(cfg) : {},
  });
  // The next trip's weather (T3's packing list, the Trip card): fetched once, then the memo updates.
  if (cfg.on && cfg.weather && s.trip && s.trip.dest && s.trip.dest.cityId && !s.trip.candidate) {
    const c = _trlCache.weather.get(s.trip.dest.cityId);
    if (!c || Date.now() - c.at > TRL_WEATHER_TTL) TravelStore.weather(s.trip.dest.cityId).then(() => _trlBump());
  }
  if (o.now == null) { _trlMemo = s; _trlMemoKey = key; }
  return s;
}

/* ---------- the store ---------- */
const TravelStore = {
  on: () => _trlConfig().on,
  config: _trlConfig,
  places: () => _trlPlaces(),
  snapshot: (o) => trSnapshot(o),
  trips: () => trSnapshot().trips,
  current: () => trSnapshot().trip,
  trip(id) { return trSnapshot().trips.find(t => t.id === id || (t.ids || []).includes(id)) || null; },
  decisions: () => _trlNormState(typeof state !== 'undefined' ? state.travel : null),
  version: () => _trlVer,
  changed: () => _trlBump(),
  onChange(fn) { _trlSubs.add(fn); return () => _trlSubs.delete(fn); },
  /** "This is a trip" (and its name, place or dates): one saveData step. */
  confirm(id, patch) {
    const t = TravelStore.trip(id);
    if (!t) return { ok: false, message: 'That trip is gone.' };
    const p = patch && typeof patch === 'object' ? patch : {};
    _trlWrite((s) => {
      const cur = s.trips[t.id] || {};
      s.trips[t.id] = Object.assign({}, cur, { confirmed: true, from: p.from || cur.from || t.from, to: p.to || cur.to || t.to || '',
        dest: p.dest && p.dest.cc ? { cc: p.dest.cc, cityId: p.dest.cityId || '', label: p.dest.label || '', zone: p.dest.zone || '' } : (cur.dest || (t.dest ? { cc: t.dest.cc, cityId: t.dest.cityId || '', label: t.dest.label || '', zone: t.dest.zone || '' } : null)),
        legs: (t.legs || []).map(l => l.eventId), ...(typeof p.name === 'string' ? { name: p.name.trim().slice(0, 80) } : {}) });
      for (const other of t.ids || []) if (other !== t.id) delete s.notTrips[other];
    });
    return { ok: true };
  },
  rename(id, name) { return TravelStore.confirm(id, { name: String(name || '') }); },
  /**
   * "Not a trip" (6.5): drops the trip's decisions and moments and remembers every id it goes by,
   * so it is never inferred again. o.forget ("Forget this trip") also deletes the zone changes of
   * those days on the server (that part cannot be undone) and the cached weather for its places.
   * Calendar events, tasks and transactions are never touched.
   */
  async notTrip(id, o) {
    o = o || {};
    const t = TravelStore.trip(id);
    const ids = t ? t.ids || [t.id] : [id];
    const today = _trlToday();
    _trlWrite((s) => {
      for (const x of ids) { delete s.trips[x]; s.notTrips[x] = today; }
      for (const k of Object.keys(s.moments)) if (ids.some(x => k.includes(':' + x))) delete s.moments[k];
    });
    if (o.forget && t) {
      try {
        await fetch('/api/time/history', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: t.from, to: t.to || today }) });
      } catch (e) { /* the server may be down: the decision is saved anyway */ }
      if (t.dest && t.dest.cityId) _trlCache.weather.delete(t.dest.cityId);
      for (const s of t.stops || []) if (s && s.cityId) _trlCache.weather.delete(s.cityId);
      _trlCache.changesAt = 0;
    }
    if (!o.quiet && typeof toast === 'function') toast(o.forget ? 'Trip forgotten. Your events, tasks and payments are unchanged.' : 'Not a trip: it will not be suggested again.', { kind: 'ok', icon: 'map-pin' });
    return { ok: true, ids };
  },
  /** Everything travel kept (6.5): decisions, the zone history (the current zone stays), caches; travel off. */
  async forgetAll() {
    state.travel = _trlNormState(null);
    saveData();
    _trlCache.weather.clear(); _trlCache.online.clear(); _trlCache.rows = null; _trlCache.geo = null; _trlCache.changes = null;
    try { await fetch('/api/time/history', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' }); } catch (e) { /* down */ }
    if (typeof settingsSaveConfig === 'function') await settingsSaveConfig({ travel: { on: false } }, false);
    _trlBump();
    return { ok: true };
  },
  /** One tab claims a moment (like _notifyClaim): true when this tab may show it. */
  claim(key) {
    try {
      const k = TRL_CLAIM_KEY + key;
      const cur = localStorage.getItem(k);
      if (cur && !cur.startsWith(_trlTab + ':')) return false;
      localStorage.setItem(k, _trlTab + ':' + Date.now());
      return true;
    } catch (e) { return true; }
  },
  shown: (key) => !!_trlNormState(typeof state !== 'undefined' ? state.travel : null).moments[key],
  momentShown(key) { if (key && !TravelStore.shown(key)) _trlWrite((s) => { s.moments[key] = Date.now(); }); },
  /** Spending for a trip: its window of /api/finance/travel, grouped by trGroup. */
  async spending(trip) {
    const t = trip && trip.id ? trip : TravelStore.trip(trip);
    if (!t) return null;
    const from = clockAddDays(t.from, -1), to = clockAddDays(t.to || _trlToday(), 3);
    const j = await _trlGet(`/api/finance/travel?from=${from}&to=${to}${t.dest && t.dest.cc ? '&cc=' + t.dest.cc : ''}`);
    if (!j || !Array.isArray(j.rows)) return null;
    const P = _trlPlaces();
    const g = trGroup(t, { rows: j.rows, P, zone: _trlZoneNow(), home: _trlHome(P), now: _trlNow() });
    return Object.assign(g.spending, { booked: j.booked || [], rates: j.rates || {} });
  },
  /** The forecast for a city of the table (the server asks Open-Meteo for the city's centre). */
  async weather(cityId) {
    if (!cityId || !_trlConfig().weather) return null;
    const c = _trlCache.weather.get(cityId);
    if (c && Date.now() - c.at < TRL_WEATHER_TTL) return c.data;
    const j = await _trlGet('/api/travel/weather?place=' + encodeURIComponent(cityId) + '&days=10');
    _trlCache.weather.set(cityId, { at: Date.now(), data: j });
    return j;
  },
  holidays: (cc, year) => _trlHolidaysFor(String(cc || '').toUpperCase(), Number(year) || Number(_trlToday().slice(0, 4))),
  /**
   * The browser's location (opt-in, Settings > Travel: "this browser's location"): reduced to
   * the nearest city of the table (50 km), else that city's country (500 km). The coordinates
   * are dropped here and never stored or sent anywhere.
   */
  locate() {
    const cfg = _trlConfig();
    if (!cfg.on || !cfg.sources.geo || typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const P = _trlPlaces();
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        const r = Math.PI / 180;
        let best = null, bestKm = Infinity;
        for (const c of P.cities.values()) {
          if (!Number.isFinite(c.lat)) continue;
          const dLat = (c.lat - lat) * r, dLon = (c.lon - lon) * r;
          const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat * r) * Math.cos(c.lat * r) * Math.sin(dLon / 2) ** 2;
          const km = 12742 * Math.asin(Math.sqrt(h));
          if (km < bestKm) { bestKm = km; best = c; }
        }
        let place = null;
        if (best && bestKm <= 50) place = { kind: 'city', cityId: best.id, name: best.name, label: best.name, cc: best.cc, zone: best.zone, how: 'geo' };
        else if (best && bestKm <= 500) place = { kind: 'country', cityId: '', name: trCountryLabel(best.cc), label: trCountryLabel(best.cc), cc: best.cc, zone: '', how: 'geo' };
        _trlCache.geo = place ? { place, at: _trlNow() } : null;
        _trlBump();
        resolve(_trlCache.geo);
      }, () => resolve(null), { enableHighAccuracy: false, maximumAge: 3600e3, timeout: 8000 });
    });
  },
  refresh() { _trlCache.changesAt = 0; _trlCache.rowsAt = 0; _trlBump(); },
};
if (typeof window !== 'undefined') window.TravelStore = TravelStore;

/* ---------- sensor glue: the computer's zone changed, a new day began ---------- */
if (typeof Clock !== 'undefined' && typeof Clock.onChange === 'function') {
  Clock.onChange((ev) => {
    if (!ev) return;
    if (ev.kind === 'zone') {
      // The server records the change (87-clock-ui.js posts it); read the history a moment later.
      clearTimeout(_trlTimeT);
      _trlTimeT = setTimeout(() => { _trlCache.changesAt = 0; _trlBump(); }, 3000);
      _trlBump();
    } else if (ev.kind === 'day' || ev.kind === 'resume') _trlBump();
  });
}
