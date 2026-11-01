/* ============================================================
   LOCATIONS (2.16): the permanent location log, the page side.
   User request, 24 Oct: "keep location history forever and properly log it
   ... the data is not going anywhere, and it should remain in the dashboard
   forever, basically never delete".

   The log is <data>/locations/log.json (lib/locations.mjs, /api/locations):
   one record per meaningful stay or move, never pruned automatically, synced
   only between the user's own devices through the encrypted sync. Where the
   records come from (all IP-free):
     geo     the browser's own location, when Device location is chosen
             (77-location-history-logic.js dashboardLocationObserve calls locLogObserve)
     manual  the place the user picked (same hook); touched while the app is open
     zone    the computer's time zone: its changes (/api/time) and, with no place
             set, the zone itself (country level)
     trip    the trips Travel found or the user confirmed (TravelStore)
     import  the browser's old visit history, folded in once per browser
   Task completions record where they happened (20-task-model.js calls
   locLogCompletion).

     locLogOn() / locLogSetOn(on)    the switch (default on; synced with the log)
     locLogObserve(location, source) a device fix or a manual choice
     locLogCompletion(taskId, at)    where a task was completed
     locLogForgetRange(from, to)     "Forget this trip" (69-travel.js): that window goes
     locLogExport('json'|'csv')      a download of everything
     locLogDelete()                  "Delete my location history" (asks first)
     locationsFacts()                the facts (90-locations-logic.js locFacts), memoised
     window.Locations                {facts, badges, where(ms), records(), onChange(fn), onBadge(fn)}
                                     new badges also fire window 'opendash:location-badge'
                                     {detail: badge} and emitShell('locations:badge', badge)
   No Claude calls, no network beyond this dashboard's own server.
   ============================================================ */
const LOC_NOTICE = "Freeflo keeps a private history of where you've been, for fun facts. It stays on your computers unless you share places with a friend.";
const _LOC_CUR_KEY = 'dashboard-location-log-cur';
const _LOC_MIGRATED_KEY = 'dashboard-location-log-migrated';
const _loc = { data: null, loading: null, recs: new Map(), sent: new Map(), dirty: new Set(), doneQ: new Map(), badgeQ: {}, timer: null, ver: 0, subs: new Set(), badgeSubs: new Set(), memo: null, memoKey: '', spend: undefined, booted: false, zonesAt: 0 };

function locLogOn() { return !(_loc.data && _loc.data.prefs && _loc.data.prefs.on === false); }
function _locNow() { return Date.now(); }   // clock-ok: the log keeps real times
function _locId(p, at) { return p + '-' + Math.round(at).toString(36) + '-' + Math.random().toString(36).slice(2, 6); }
function _locHash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function _locBump() {
  _loc.ver++; _loc.memo = null;
  for (const fn of [..._loc.subs]) { try { fn(); } catch (e) { console.error('[locations]', e); } }
  if (state && state.view === 'locations' && typeof render === 'function') { clearTimeout(_loc.rt); _loc.rt = setTimeout(() => { if (state.view === 'locations') render(); }, 300); }
}
function _locCountryName(cc) {
  if (!cc) return '';
  try { const c = typeof trCountry === 'function' ? trCountry(cc) : null; if (c && c.name) return c.name; } catch (e) { /* table not loaded */ }
  return typeof trCountryLabel === 'function' ? trCountryLabel(cc) : cc;
}
function _locZoneCc(tz) { try { return typeof trZoneCountry === 'function' ? trZoneCountry(tz) : ''; } catch (e) { return ''; } }
function _locZoneNow() { return typeof Clock !== 'undefined' ? Clock.zone() : (Intl.DateTimeFormat().resolvedOptions().timeZone || ''); }

/* ---------- loading and saving ---------- */
async function locLogLoad(force) {
  if (_loc.loading && !force) return _loc.loading;
  _loc.loading = (async () => {
    try {
      const r = await fetch('/api/locations', { headers: { Accept: 'application/json' } });
      if (!r.ok) return _loc.data;
      const j = await r.json();
      _loc.data = { prefs: j.prefs || { on: true }, badges: j.badges || {}, done: Array.isArray(j.done) ? j.done : [], synced: !!j.synced, dev: j.dev || '' };
      const local = new Map([..._loc.recs].filter(([id]) => _loc.dirty.has(id)));
      _loc.recs = new Map((j.records || []).map(x => [x.id, x]));
      for (const x of j.records || []) _loc.sent.set(x.id, x.until || x.at);
      for (const [id, x] of local) { const cur = _loc.recs.get(id); _loc.recs.set(id, cur ? Object.assign({}, cur, x, { at: Math.min(cur.at, x.at), until: Math.max(cur.until || cur.at, x.until || x.at) }) : x); }
      if (!locLogOn()) { _loc.dirty.clear(); _loc.doneQ.clear(); }
      // The history was deleted (here or on another device): this browser's stay must not bring it back.
      const c = _locCurGet(), del = Number(_loc.data.prefs.deletedAt) || 0;
      if (c && c.rec && del && c.rec.at < del && !(j.records || []).some(x => x.id === c.rec.id)) { _locCurSet(null); _loc.dirty.delete(c.rec.id); _loc.recs.delete(c.rec.id); }
      _locBump();
      return _loc.data;
    } catch (e) { return _loc.data; }
    finally { _loc.loading = null; }
  })();
  return _loc.loading;
}
function _locMark(rec, urgent) {
  if (!locLogOn() || !rec) return;
  _loc.recs.set(rec.id, rec);
  const sentUntil = _loc.sent.get(rec.id);
  _loc.dirty.add(rec.id);
  if (urgent || sentUntil == null || (rec.until || rec.at) - sentUntil >= 10 * 60000) _locSoon();
  _locBump();
}
function _locSoon(ms) { clearTimeout(_loc.timer); _loc.timer = setTimeout(() => _locFlush(), ms == null ? 2500 : ms); }
async function _locFlush(keepalive) {
  if (!locLogOn()) { _loc.dirty.clear(); _loc.doneQ.clear(); return; }
  const records = [..._loc.dirty].map(id => _loc.recs.get(id)).filter(Boolean);
  const done = [..._loc.doneQ.values()];
  const badges = _loc.badgeQ;
  if (!records.length && !done.length && !Object.keys(badges).length) return;
  _loc.dirty.clear(); _loc.doneQ.clear(); _loc.badgeQ = {};
  try {
    const r = await fetch('/api/locations', { method: 'POST', keepalive: !!keepalive, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records, done, badges }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (j && j.off) { if (_loc.data) _loc.data.prefs.on = false; return; }
    for (const x of records) _loc.sent.set(x.id, x.until || x.at);
    if (_loc.data) { for (const d of done) _loc.data.done.push(d); Object.assign(_loc.data.badges, badges); }
  } catch (e) {
    // The server is down: keep them for the next try.
    for (const x of records) _loc.dirty.add(x.id);
    for (const d of done) _loc.doneQ.set(d.id, d);
    Object.assign(_loc.badgeQ, badges);
    if (!keepalive) _locSoon(60000);
  }
}

/* ---------- this browser's current stay ---------- */
function _locCurGet() { try { return JSON.parse(localStorage.getItem(_LOC_CUR_KEY) || 'null'); } catch (e) { return _loc.cur || null; } }
function _locCurSet(c) { _loc.cur = c; try { if (c) localStorage.setItem(_LOC_CUR_KEY, JSON.stringify(c)); else localStorage.removeItem(_LOC_CUR_KEY); } catch (e) { /* private mode: memory only */ } }
/** The weather already fetched for Home, when it is for this place: {hi, lo, cond, label} in °C. */
function _locWeatherFor(city) {
  try {
    const w = typeof _bf !== 'undefined' && _bf ? _bf.weather : null;
    if (!w || !w.ok || !w.today || !w.location || !city || locFold(w.location.name) !== locFold(city)) return null;
    const f = /F/.test((w.units && w.units.temp) || '');
    const c = (t) => (Number.isFinite(t) ? Math.round((f ? (t - 32) * 5 / 9 : t) * 10) / 10 : null);
    return { hi: c(w.today.hi), lo: c(w.today.lo), cond: String(w.today.cond || ''), label: String(w.today.label || '') };
  } catch (e) { return null; }
}
function _locMergeWx(a, b) {
  if (!b) return a || null;
  if (!a) return b;
  return { hi: Math.max(a.hi ?? -999, b.hi ?? -999) === -999 ? null : Math.max(a.hi ?? -999, b.hi ?? -999), lo: Math.min(a.lo ?? 999, b.lo ?? 999) === 999 ? null : Math.min(a.lo ?? 999, b.lo ?? 999), cond: b.cond || a.cond, label: b.label || a.label };
}
/** A place from a location object (78-location.js / the picker) -> the record's place fields. */
function _locPlaceOf(loc) {
  const cc = String(loc.countryCode || loc.cc || '').toUpperCase().slice(0, 2);
  const name = String(loc.name || loc.town || '').slice(0, 80);
  const city = name && name !== 'Current location' ? name : '';
  const lat = Number.isFinite(loc.lat) ? Math.round(loc.lat * 100) / 100 : null, lon = Number.isFinite(loc.lon) ? Math.round(loc.lon * 100) / 100 : null;
  return { place: city || (loc.admin ? 'Near ' + loc.admin : '') || _locCountryName(cc) || 'Somewhere', city, region: String(loc.admin || '').slice(0, 80), country: String(loc.country || _locCountryName(cc) || '').slice(0, 80), cc: /^[A-Z]{2}$/.test(cc) ? cc : '', lat, lon, tz: loc.timezone || _locZoneNow() };
}
/** One observation of where you are: extends the current stay, or starts a new one. */
function _locStay(p, src, at) {
  if (!locLogOn() || !p || !Number.isFinite(at)) return null;
  const key = locKeyOf(p) + (p.city ? '' : '|' + p.lat + ',' + p.lon);
  const cur = _locCurGet();
  const near = (r) => !Number.isFinite(p.lat) || !Number.isFinite(r.lat) || locKm(r, p) < 3;
  const wx = _locWeatherFor(p.city);
  const extend = (r, prev, prevKey, prevSrc) => {
    const live = _loc.recs.get(r.id) || r;
    const next = Object.assign({}, live, { until: Math.max(live.until || live.at, at) });
    const w = _locMergeWx(live.wx, wx); if (w) next.wx = w;
    _locCurSet({ rec: next, key, src, prev: prev || null, prevKey: prevKey || '', prevSrc: prevSrc || '' });
    _locMark(next);
    return next;
  };
  if (cur && cur.rec && cur.key === key && cur.src === src && near(cur.rec) && at >= cur.rec.at) return extend(cur.rec, cur.prev, cur.prevKey, cur.prevSrc);
  // Flapping between two places (a fix at the edge of town): back to the one before, within 30 minutes, resumes it.
  if (cur && cur.rec && cur.prev && cur.prevKey === key && cur.prevSrc === src && near(cur.prev) && at - (cur.rec.until || cur.rec.at) < 30 * 60000) return extend(cur.prev, cur.rec, cur.key, cur.src);
  const rec = Object.assign({ id: _locId(src === 'geo' ? 'g' : src === 'manual' ? 'm' : 'z', at), kind: 'stay', at, until: at, src }, p);
  if (wx) rec.wx = wx;
  _locCurSet({ rec, key, src, prev: cur && cur.rec ? cur.rec : null, prevKey: cur ? cur.key || '' : '', prevSrc: cur ? cur.src || '' : '' });
  _locMark(rec, true);
  return rec;
}
/** A device fix (source 'device') or a manual choice ('manual'), from dashboardLocationObserve. */
function locLogObserve(location, source) {
  if (!location || !locLogOn()) return;
  const device = source === 'device';
  const now = _locNow();
  if (device) {
    const at = Number(location.observedAt), acc = Number(location.accuracy);
    if (!Number.isFinite(at) || now - at > 120000 || at > now + 5000 || !Number.isFinite(acc) || acc < 0 || acc > 1000) return;
  }
  const p = _locPlaceOf(location);
  if (!p.cc && !p.city && !Number.isFinite(p.lat)) return;
  _locStay(p, device ? 'geo' : 'manual', device ? Number(location.observedAt) : now);
}
/** While the app is open: the manual place (when the clock is in its country), else the time zone itself. */
function _locTouch() {
  if (!locLogOn() || document.hidden) return;
  const cfg = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG : {};
  const zone = _locZoneNow(), zcc = _locZoneCc(zone);
  if (cfg.locationMode === 'device' && cfg.location) {
    const cur = _locCurGet();
    if (cur && cur.rec && cur.src === 'geo' && _locNow() - (cur.rec.until || cur.rec.at) < 6 * 3600000) return;   // fixes keep it fresh
  }
  if (cfg.locationMode !== 'device' && cfg.location && (!zcc || !cfg.location.countryCode || cfg.location.countryCode === zcc)) {
    _locStay(_locPlaceOf(cfg.location), 'manual', _locNow());
    return;
  }
  if (!zone || !zcc) return;
  const cur = _locCurGet();
  if (cur && cur.rec && cur.rec.cc === zcc && cur.src !== 'zone' && _locNow() - (cur.rec.until || cur.rec.at) < 6 * 3600000) return;
  let label = '';
  try { label = typeof trZoneLabel === 'function' ? trZoneLabel(zone) : ''; } catch (e) { label = ''; }
  _locStay({ place: _locCountryName(zcc) || label, city: '', region: '', country: _locCountryName(zcc), cc: zcc, lat: null, lon: null, tz: zone }, 'zone', _locNow());
}
/** Time-zone changes this computer saw (/api/time keeps the last ten): one 'move' each. */
async function _locImportZones() {
  if (!locLogOn()) return;
  _loc.zonesAt = _locNow();
  let j = null;
  try { const r = await fetch('/api/time', { headers: { Accept: 'application/json' } }); j = r.ok ? await r.json() : null; } catch (e) { j = null; }
  if (!j || !Array.isArray(j.changes)) return;
  for (const c of j.changes) {
    const at = Date.parse(c.at);
    if (!Number.isFinite(at) || !c.to || c.from === c.to) continue;
    const id = 'z-' + at.toString(36) + '-' + _locHash(c.to);
    if (_loc.recs.has(id)) continue;
    const cc = _locZoneCc(c.to);
    let label = ''; try { label = typeof trZoneLabel === 'function' ? trZoneLabel(c.to) : ''; } catch (e) { label = ''; }
    _locMark({ id, kind: 'move', at, until: at, fromTz: c.from || '', tz: c.to, cc, country: _locCountryName(cc), place: label || c.to, src: 'zone' }, true);
  }
}
/** Trips (Travel on): one 'trip' stay per trip that has begun; it grows while you are away. */
function _locImportTrips() {
  if (!locLogOn() || typeof TravelStore === 'undefined' || !TravelStore.on()) return;
  let trips = [];
  try { trips = TravelStore.trips() || []; } catch (e) { trips = []; }
  const today = typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10);
  const now = _locNow();
  for (const t of trips) {
    if (!t || t.candidate || !t.id || !t.from || t.from > today || !t.dest || !t.dest.cc) continue;
    if (!['away', 'returning', 'home', 'past'].includes(t.status)) continue;
    const id = 't-' + String(t.id).replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 70);
    const at = Date.parse(t.from + 'T00:00:00'), end = Date.parse((t.to || today) + 'T23:59:59');
    if (!Number.isFinite(at)) continue;
    const city = t.dest.cityId && typeof trCity === 'function' ? trCity(t.dest.cityId) : null;
    const rec = { id, kind: 'stay', at, until: Math.min(now, Number.isFinite(end) ? end : now), src: 'trip', place: t.label || t.dest.label || (city && city.name) || _locCountryName(t.dest.cc), city: city ? city.name : '', region: '', country: _locCountryName(t.dest.cc), cc: t.dest.cc, tz: t.dest.zone || (city && city.zone) || '', lat: city ? Math.round(city.lat * 100) / 100 : null, lon: city ? Math.round(city.lon * 100) / 100 : null };
    const old = _loc.recs.get(id);
    if (old && old.at === rec.at && old.until === rec.until && old.city === rec.city && old.cc === rec.cc) continue;
    _locMark(old ? Object.assign({}, old, rec) : rec, true);
  }
}
/** The browser's old visit history (localStorage, 90 days at most) folded in once. */
function _locMigrate() {
  if (!locLogOn()) return;
  try { if (localStorage.getItem(_LOC_MIGRATED_KEY)) return; } catch (e) { return; }
  const h = typeof dashboardLocationHistory === 'function' ? dashboardLocationHistory() : null;
  for (const v of (h && Array.isArray(h.visits) ? h.visits : [])) {
    if (!v || !v.point || !Number.isFinite(v.firstSeenAt)) continue;
    const pt = v.point, cc = String(pt.cc || '').toUpperCase();
    const city = pt.name && pt.name !== 'Current location' ? pt.name : '';
    const id = 'i-' + _locHash(String(v.id || '') + '|' + v.firstSeenAt + '|' + (pt.key || ''));
    if (_loc.recs.has(id)) continue;
    const until = Math.max(v.firstSeenAt, Number(v.lastConfirmedAt) || 0);
    let tz = '';
    try { const near = city && typeof trCityFind === 'function' ? trCityFind(city, { cc }) : null; tz = near ? near.zone : ''; } catch (e) { tz = ''; }
    _locMark({ id, kind: 'stay', at: v.firstSeenAt, until, src: v.source === 'device' ? 'geo' : 'manual', place: city || _locCountryName(cc) || 'Somewhere', city, region: '', country: _locCountryName(cc), cc, lat: pt.lat, lon: pt.lon, tz: tz || _locZoneNow() }, true);
  }
  try { localStorage.setItem(_LOC_MIGRATED_KEY, String(_locNow())); } catch (e) { /* private mode */ }
}

/* ---------- completions, forgetting, the switch ---------- */
function locLogCompletion(taskId, at) {
  if (!locLogOn() || !taskId || !Number.isFinite(at)) return;
  const cur = _locCurGet();
  const r = cur && cur.rec && at - (cur.rec.until || cur.rec.at) < 12 * 3600000 ? (_loc.recs.get(cur.rec.id) || cur.rec) : null;
  const cc = r ? r.cc : _locZoneCc(_locZoneNow());
  const d = { id: String(taskId) + '@' + at, task: String(taskId), at };
  if (r) { d.rec = r.id; if (r.city) d.city = r.city; }
  if (cc) d.cc = cc;
  _loc.doneQ.set(d.id, d);
  if (r) _locMark(Object.assign({}, r, { until: Math.max(r.until || r.at, at) }));
  _locSoon();
}
/** "Forget this trip": the log forgets those days too (from, to: 'YYYY-MM-DD'). */
async function locLogForgetRange(from, to) {
  const a = Date.parse(from + 'T00:00:00'), b = Date.parse((to || from) + 'T23:59:59');
  if (!Number.isFinite(a) || !Number.isFinite(b)) return;
  for (const [id, r] of [..._loc.recs]) if (r.at <= b && (r.until || r.at) >= a) { _loc.recs.delete(id); _loc.dirty.delete(id); }
  try { const r = await fetch('/api/locations/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true, from: a, to: b }) }); if (!r.ok) toast('Those days may still be in your places history. Try forgetting them again.', { kind: 'err', retry: () => locLogForgetRange(from, to) }); } catch (e) { /* the server is down: the next load shows them again */ }
  _locBump();
}
async function locLogSetOn(on) {
  try {
    const r = await fetch('/api/locations/prefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ on: !!on, noticeAt: _locNow() }) });
    const j = r.ok ? await r.json() : null;
    if (!j || !j.prefs) throw new Error('not saved');
    if (!_loc.data) _loc.data = { prefs: {}, badges: {}, done: [] };
    _loc.data.prefs = j.prefs;
    if (!on) { _loc.dirty.clear(); _loc.doneQ.clear(); _locCurSet(null); }
    else { _locTouch(); }
    _locBump();
    return true;
  } catch (e) { toastError('change your location history', e, () => { locLogSetOn(on).then(ok => { if (ok) render(); }); }); return false; }
}
async function locLogDelete() {
  const ok = await confirmDialog({ title: 'Delete my location history?', text: 'Every place, time-zone move and trip in your location history is removed from this computer and, through sync, from your other computers too. Your tasks and trips themselves are not touched. This cannot be undone.', confirmLabel: 'Delete my location history', danger: true });
  if (!ok) return false;
  try {
    const r = await fetch('/api/locations/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
  } catch (e) { toastError('delete your location history', e, () => { locLogDelete().then(ok => { if (ok) render(); }); }); return false; }
  _loc.recs.clear(); _loc.sent.clear(); _loc.dirty.clear(); _loc.doneQ.clear(); _locCurSet(null);
  if (_loc.data) { _loc.data.done = []; _loc.data.badges = {}; }
  if (typeof dashboardLocationHistoryClear === 'function') dashboardLocationHistoryClear();
  try { localStorage.setItem(_LOC_MIGRATED_KEY, String(_locNow())); } catch (e) { /* private mode */ }
  _locBump();
  toast('Location history deleted: new places are logged from now on' + (locLogOn() ? '' : ' (logging is off)'), { kind: 'ok', icon: 'trash-2' });
  return true;
}

/* ---------- export ---------- */
function _locDownload(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function locLogExport(fmt) {
  const recs = [..._loc.recs.values()].sort((a, b) => a.at - b.at);
  const day = typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10);
  if (fmt === 'csv') {
    const cols = ['id', 'kind', 'start', 'end', 'place', 'city', 'region', 'country', 'country_code', 'lat', 'lon', 'time_zone', 'from_time_zone', 'source', 'device', 'weather_high_c', 'weather_low_c', 'weather'];
    const q = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : '');
    const rows = recs.map(r => [r.id, r.kind, iso(r.at), iso(r.until), r.place, r.city, r.region, r.country, r.cc, r.lat, r.lon, r.tz, r.fromTz, r.src, r.dev, r.wx && r.wx.hi, r.wx && r.wx.lo, r.wx && r.wx.label].map(q).join(','));
    const done = ((_loc.data && _loc.data.done) || []).map(d => ['done:' + d.task, 'task-done', iso(d.at), iso(d.at), '', d.city, '', _locCountryName(d.cc), d.cc, '', '', '', '', 'completion', '', '', '', ''].map(q).join(','));
    _locDownload(`opendash-locations-${day}.csv`, [cols.join(','), ...rows, ...done].join('\r\n') + '\r\n', 'text/csv;charset=utf-8');
  } else {
    const out = { app: 'OpenDash', kind: 'location-history', v: 1, exportedAt: new Date().toISOString(), records: recs, done: (_loc.data && _loc.data.done) || [], badges: (_loc.data && _loc.data.badges) || {} };
    _locDownload(`opendash-locations-${day}.json`, JSON.stringify(out, null, 1), 'application/json');
  }
  toast('Exported ' + recs.length + (recs.length === 1 ? ' place' : ' places'), { kind: 'ok', icon: 'download' });
}

/* ---------- the facts and badges ---------- */
function _locCompletions() {
  const out = [];
  const log = (typeof state !== 'undefined' && state.completionLog) || {};
  for (const id of Object.keys(log)) for (const ts of Array.isArray(log[id]) ? log[id] : []) if (Number.isFinite(+ts)) out.push({ task: id, at: +ts });
  return out;
}
function _locMonthName(ym) {
  const d = new Date(ym + '-15T12:00:00');
  const now = new Date();   // clock-ok: labels only
  try { return d.toLocaleString(APP_CONFIG.locale || undefined, { month: 'long', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) }); } catch (e) { return ym; }
}
function locationsFacts() {
  const comps = _locCompletions();
  const nt = (typeof state !== 'undefined' && state.travel && state.travel.notTrips) || {};
  const key = [_loc.ver, comps.length, Object.keys(nt).length, Math.floor(_locNow() / 600000)].join('|');
  if (_loc.memo && _loc.memoKey === key) return _loc.memo;
  let homeCc = '';
  try { homeCc = _locZoneCc(typeof Clock !== 'undefined' ? Clock.home() : APP_CONFIG.timezone); } catch (e) { homeCc = ''; }
  const f = locFacts({
    records: [..._loc.recs.values()], done: (_loc.data && _loc.data.done) || [], completions: comps, now: _locNow(), homeCc, notTrips: nt,
    zoneCoords: (tz) => { try { const z = typeof trZoneInfo === 'function' ? trZoneInfo(tz) : null; return z && Number.isFinite(z.lat) ? { lat: z.lat, lon: z.lon } : null; } catch (e) { return null; } },
    monthName: _locMonthName,
  });
  _loc.memo = f; _loc.memoKey = key;
  return f;
}
/** New badges: saved with the log (so each device knows), announced once, and handed to listeners. */
function _locCheckBadges() {
  if (!_loc.data || !locLogOn()) return;
  const f = locationsFacts();
  const have = _loc.data.badges || {};
  const first = !Object.keys(have).length && !_loc.data.prefs.badgesAt;
  const fresh = f.badges.filter(b => !have[b.id] && !_loc.badgeQ[b.id]);
  if (!fresh.length) return;
  for (const b of fresh) _loc.badgeQ[b.id] = Math.round(b.at);
  _locSoon();
  for (const b of fresh) {
    for (const fn of [..._loc.badgeSubs]) { try { fn(b); } catch (e) { console.error('[locations]', e); } }
    try { window.dispatchEvent(new CustomEvent('opendash:location-badge', { detail: b })); } catch (e) { /* old browser */ }
    if (typeof emitShell === 'function') { try { emitShell('locations:badge', b); } catch (e) { /* no listeners */ } }
  }
  if (first) {
    if (fresh.length > 1) toast(`Your Places page is ready: ${fresh.length} badges so far`, { icon: 'map-pin', timeout: 9000, action: { label: 'Open', run: () => setView('locations') } });
    return;
  }
  const show = fresh.slice(-2);
  for (const b of show) toast(b.title + (fresh.length > 2 && b === show[show.length - 1] ? ` (and ${fresh.length - 2} more)` : ''), { icon: b.icon || 'map-pin', timeout: 8000, action: { label: 'See', run: () => setView('locations') } });
}

/* ---------- the first-time notice ---------- */
function _locMaybeNotice() {
  if (!_loc.data || _loc.data.prefs.noticeAt) return;
  const busy = (typeof _obOpen !== 'undefined' && _obOpen) || (typeof storyIsOpen === 'function' && storyIsOpen()) || document.querySelector('.modal, .scrim') || (document.documentElement.classList.contains('gd-immersive') || document.documentElement.classList.contains('gsv-immersive'));   // not over the garden
  if (busy || document.hidden) { setTimeout(_locMaybeNotice, 20000); return; }
  let answered = false;
  const seen = (on) => { answered = true; fetch('/api/locations/prefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noticeAt: _locNow(), ...(on === false ? { on: false } : {}) }) }).then(r => r.json()).then(j => { if (j && j.prefs && _loc.data) { _loc.data.prefs = j.prefs; _locBump(); } }).catch(() => {}); };
  _loc.data.prefs.noticeAt = _locNow();
  openDialog({
    title: 'Your places, kept for you', size: 'sm',
    body: (el) => {
      el.innerHTML = `<div class="loc-notice">${icon('map-pin', 'i-xl loc-notice-ic')}<p>${esc(LOC_NOTICE)}</p></div><p class="muted loc-notice-sm">You'll find it under Places: countries and cities, firsts, time zones crossed, where you got the most done, and badges. Turn it off or delete it any time in Settings &gt; Location history.</p>`;
    },
    actions: [
      { label: 'Turn it off', run: () => { seen(false); if (_loc.data) _loc.data.prefs.on = false; _loc.dirty.clear(); _loc.doneQ.clear(); } },
      { label: 'Sounds good', primary: true, run: () => seen(true) },
    ],
    onClose: () => { if (!answered) seen(true); },
  });
}

/* ---------- Settings > Location history ---------- */
registerSettingsGroup({
  id: 'locations', title: 'Location history', icon: 'map-pin', order: 46,
  description: LOC_NOTICE,
  render(el) {
    const on = locLogOn();
    el.appendChild(_settingsRow('Keep my location history', 'When off, nothing new is added.',
      _settingsSwitch(on, 'Keep my location history', async (v) => { if (await locLogSetOn(v)) render(); })));
    const f = locationsFacts();
    const info = document.createElement('div'); info.className = 'loc-set-info';
    const since = f.began ? new Date(f.began).toLocaleDateString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    info.innerHTML = `<p>${f.records ? `<b>${f.records.toLocaleString()}</b> stays and moves since ${esc(since)}: ${f.countries.length} ${f.countries.length === 1 ? 'country' : 'countries'}, ${f.cities.length} ${f.cities.length === 1 ? 'place' : 'places'}.` : 'Nothing logged yet.'}</p>
      <p class="muted">Kept in your data folder and on your other computers (encrypted). Never pruned automatically. Sources: your browser's location when you choose Device location, the place you pick, your computer's time zone and your trips; never your IP address. Positions are rounded to about 1 km.</p>`;
    el.appendChild(_settingsRow('What is kept', null, info));
    const act = document.createElement('div'); act.className = 'loc-set-act';
    act.append(
      uiButton({ label: 'Open Places', icon: 'map-pin', size: 'sm', run: () => setView('locations') }),
      uiButton({ label: 'Download a data file', tip: 'A JSON file, for moving your places to another program', icon: 'download', kind: 'ghost', size: 'sm', run: () => locLogExport('json') }),
      uiButton({ label: 'Download a spreadsheet', tip: 'A CSV file that Excel and other spreadsheets can open', icon: 'download', kind: 'ghost', size: 'sm', run: () => locLogExport('csv') }));
    el.appendChild(_settingsRow('Your data', 'Download everything, any time.', act));
    const del = document.createElement('div');
    del.appendChild(uiButton({ label: 'Delete my location history', icon: 'trash-2', kind: 'danger', size: 'sm', run: async () => { if (await locLogDelete()) render(); } }));
    el.appendChild(_settingsRow('Delete', 'Only when you ask: removes it here and on your other computers.', del));
  },
});
registerCommand({ id: 'locations', label: 'Places', icon: 'map-pin', group: 'Go to', keywords: 'locations places countries cities visited travel map where have I been fun facts badges', run: () => setView('locations') });
registerCommand({ id: 'locations-settings', label: 'Location history settings', icon: 'map-pin', group: 'Settings', keywords: 'location history privacy export delete places', run: () => setView('settings:locations') });

/* ---------- window.Locations (for the 'game' side and other modules) ---------- */
const Locations = {
  facts: () => locationsFacts(),
  badges: () => locationsFacts().badges,
  where(ms) { const f = locationsFacts(); return locSegmentAt(f.segments, Number.isFinite(ms) ? ms : _locNow()); },
  records: () => [..._loc.recs.values()].sort((a, b) => a.at - b.at).map(r => Object.assign({}, r)),
  on: () => locLogOn(),
  onChange(fn) { _loc.subs.add(fn); return () => _loc.subs.delete(fn); },
  onBadge(fn) { _loc.badgeSubs.add(fn); return () => _loc.badgeSubs.delete(fn); },
  spend: () => _locSpend(),
};
if (typeof window !== 'undefined') window.Locations = Locations;
/** Spend per country, when the finance side publishes it: {currency, rows} | null (cached for the session).
    Finances' own numbers first (FinanceView.placeSpend, src/finance/96-board-hooks.js: merchant address >
    memo > currency > trip > home, the published copy on other devices); the server's reading of the analysis after. */
function _locSpend() {
  if (_loc.spend !== undefined) return Promise.resolve(_loc.spend);
  const FV = typeof window !== 'undefined' && window.FinanceView;
  if (FV && typeof FV.placeSpend === 'function') {
    return Promise.resolve().then(() => FV.placeSpend({})).then(p => {
      const rows = p && Array.isArray(p.countries) ? p.countries.filter(c => c && /^[A-Z]{2}$/.test(String(c.cc || '')) && Number(c.total) > 0).map(c => ({ cc: c.cc, amount: Number(c.total), n: c.n || 0 })) : [];
      if (rows.length) { _loc.spend = { currency: p.currency || 'GBP', rows }; return _loc.spend; }
      return _locSpendServer();
    }).catch(() => _locSpendServer());
  }
  return _locSpendServer();
}
function _locSpendServer() {
  if (_loc.spend !== undefined) return Promise.resolve(_loc.spend);
  return fetch('/api/locations/spend', { headers: { Accept: 'application/json' } }).then(r => (r.ok ? r.json() : null)).then(j => {
    _loc.spend = j && j.status === 'ok' && Array.isArray(j.rows) ? { currency: j.currency, rows: j.rows } : null;
    return _loc.spend;
  }).catch(() => { _loc.spend = null; return null; });
}

/* ---------- boot ---------- */
if (typeof window !== 'undefined') window.addEventListener('load', () => {
  setTimeout(async () => {
    await locLogLoad();
    if (!_loc.data) return;
    _loc.booted = true;
    _locMigrate();
    await _locImportZones();
    _locImportTrips();
    _locTouch();
    _locCheckBadges();
    setTimeout(_locMaybeNotice, 6000);
  }, 2500);
  setInterval(() => { if (!_loc.booted || document.hidden) return; _locTouch(); _locImportTrips(); if (_locNow() - _loc.zonesAt > 6 * 3600000) _locImportZones(); _locCheckBadges(); }, 30 * 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) _locFlush(true);
    else if (_loc.booted) { _locTouch(); locLogLoad(true).then(() => _locCheckBadges()); }
  });
  window.addEventListener('pagehide', () => _locFlush(true));
  if (typeof Clock !== 'undefined' && typeof Clock.onChange === 'function') Clock.onChange((ev) => {
    if (ev && ev.kind === 'zone' && ev.reason !== 'setting' && _loc.booted) setTimeout(async () => { await _locImportZones(); _locTouch(); _locCheckBadges(); }, 5000);
  });
  if (typeof TravelStore !== 'undefined' && TravelStore.onChange) {
    let t = null;
    TravelStore.onChange(() => { if (!_loc.booted) return; clearTimeout(t); t = setTimeout(_locImportTrips, 5000); });
  }
}, { once: true });
