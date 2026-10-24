/* ============================================================
   LOCATIONS, the pure part (2.16). No DOM, no page globals at load.
   The permanent location log (lib/locations.mjs, 90-locations.js) turned
   into fun facts: where you have been, firsts, time zones, distance, days
   abroad, tasks done per place, weather where you were, and badges.
   User request, 24 Oct: "keep location history forever ... so we can do
   cool things with the data later ... a Locations tab to show fun facts".

     locKm(a, b)                      great-circle km between two {lat, lon}
     locFold(s)                       a place name folded for keys
     locKeyOf(r)                      'JP|kyoto' (city) or 'JP|' (country only)
     locTzOffset(tz, ms)              minutes east of UTC (Intl), 0 when unknown
     locHourIn(ms, tz)                the local hour 0-23 there
     locDayIn(ms, tz)                 'YYYY-MM-DD' there
     locTimeline(records, o)          [{from, to, rec, key, city, place, region, country, cc, tz, lat, lon, src}]
                                      non-overlapping; a trip covers its days unless a device or manual
                                      fix inside it is more precise; a zone move into the same country as
                                      the last town keeps that town (you came back)
     locVisits(segments)              consecutive segments of one place merged: [{key, ..., from, to, ms, wx}]
     locSegmentAt(segments, ms)       the segment (or visit) at a time (binary search) | null
     locFacts(input)                  everything the Locations tab and window.Locations show
       input: {records, done, completions: [{task, at}], now, homeCc, homeZone, zoneCoords(tz), notTrips}
     LOC_BADGES / locBadges(f)        [{id, kind, title, text, icon, at}] earned, oldest first
   Rules: gentle and honest. Times are the log's own (a stay runs until the next
   one starts: "last known place"); unknown is left out, never guessed at.
   ============================================================ */
const LOC_DAY_MS = 86400000;

function locKm(a, b) {
  if (!a || !b || ![a.lat, a.lon, b.lat, b.lon].every(Number.isFinite)) return 0;
  const r = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}
function locFold(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function locKeyOf(r) {
  const city = r && (r.city || '');
  return (r && r.cc || '') + '|' + locFold(city);
}
const _locFmtCache = new Map();
function _locFmt(tz, kind) {
  const k = tz + '|' + kind;
  if (_locFmtCache.has(k)) return _locFmtCache.get(k);
  let f = null;
  try {
    f = kind === 'off' ? new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      : new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
  } catch (e) { f = null; }
  _locFmtCache.set(k, f);
  return f;
}
function locTzOffset(tz, ms) {
  const f = tz ? _locFmt(tz, 'off') : null;
  if (!f) return 0;
  try {
    const p = f.formatToParts(new Date(ms)).find(x => x.type === 'timeZoneName');
    const m = p && /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(p.value);
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 0;
  } catch (e) { return 0; }
}
function _locParts(ms, tz) {
  const f = tz ? _locFmt(tz, 'day') : null;
  if (f) {
    try {
      const o = {}; for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
      return { day: `${o.year}-${o.month}-${o.day}`, hour: Number(o.hour) % 24 };
    } catch (e) { /* below */ }
  }
  const d = new Date(ms);
  return { day: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, hour: d.getHours() };   // clock-ok: real log times
}
function locHourIn(ms, tz) { return _locParts(ms, tz).hour; }
function locDayIn(ms, tz) { return _locParts(ms, tz).day; }

const _LOC_RANK = { geo: 3, manual: 3, import: 3, trip: 2, zone: 1 };
function _locPlace(r) {
  return { rec: r.id, key: locKeyOf(r), city: r.city || '', place: r.place || r.city || r.country || r.tz || '', region: r.region || '', country: r.country || '', cc: r.cc || '', tz: r.tz || '', lat: r.lat, lon: r.lon, src: r.src || 'import' };
}
/**
 * The log as a line of non-overlapping segments (oldest first). o: {now, notTrips: {tripId: day}}.
 * At any time the place is the LAST CONFIRMED one: of the records begun by then, one still
 * confirmed then (the latest begun), else the one confirmed most recently. A trip covers its
 * days unless a device or manual fix, or a time zone in another country, says otherwise.
 */
function locTimeline(records, o) {
  o = o || {};
  const now = Number.isFinite(o.now) ? o.now : Date.now();   // clock-ok: real log times
  const notTrips = o.notTrips || {};
  const list = (Array.isArray(records) ? records : []).filter(r => r && Number.isFinite(r.at) && r.at <= now);
  const base = list.filter(r => r.src !== 'trip').sort((a, b) => a.at - b.at);
  const trips = list.filter(r => r.src === 'trip' && !notTrips[String(r.id).slice(2)] && Number.isFinite(r.until) && r.until > r.at).sort((a, b) => a.at - b.at);
  // A time zone in the country (and zone) of the last town you were in keeps that town (you came back).
  const eff = [];
  let lastTown = null;
  for (const r0 of base) {
    const r = Object.assign({}, r0, { until: Math.min(now, Math.max(r0.at, Number.isFinite(r0.until) ? r0.until : r0.at)) });
    if (r.src === 'zone' && lastTown && r.cc && r.cc === lastTown.cc && (!lastTown.tz || !r.tz || lastTown.tz === r.tz)) r._as = lastTown;
    else if (r.city) lastTown = r0;
    eff.push(r);
  }
  const bounds = new Set([now]);
  for (const r of eff) { bounds.add(r.at); if (r.until > r.at) bounds.add(r.until); }
  for (const t of trips) { bounds.add(t.at); bounds.add(Math.min(t.until, now)); }
  const B = [...bounds].filter(t => t <= now).sort((a, b) => a - b);
  const out = [];
  let next = 0, active = [], done = null;
  for (let i = 0; i < B.length - 1; i++) {
    const t0 = B[i], t1 = B[i + 1];
    while (next < eff.length && eff[next].at <= t0) active.push(eff[next++]);
    // Records no longer confirmed at t0 drop out; the most recently confirmed of them is the fallback.
    active = active.filter(r => { if (r.until > t0 || r.at === t0) return true; if (!done || r.until > done.until || (r.until === done.until && r.at >= done.at)) done = r; return false; });
    const b = active.length ? active[active.length - 1] : done;
    let trip = null;
    for (let j = trips.length - 1; j >= 0; j--) if (trips[j].at <= t0 && t0 < trips[j].until) { trip = trips[j]; break; }
    let pick = b;
    if (trip) {
      const fresh = b && (b.at >= trip.at || b.until > t0);
      const better = fresh && ((_LOC_RANK[b.src] || 0) >= 3 || (b.src === 'zone' && b.cc && b.cc !== trip.cc));
      pick = better ? b : trip;
    }
    if (!pick) continue;
    const seg = Object.assign(_locPlace(pick._as || pick), { from: t0, to: t1, rec: pick.id });
    if (pick._as) seg.via = 'zone';
    const prev = out[out.length - 1];
    if (prev && prev.key === seg.key && prev.rec === seg.rec && prev.to === t0) prev.to = t1;
    else out.push(seg);
  }
  return out;
}
function locSegmentAt(segs, ms) {
  let lo = 0, hi = segs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, s = segs[mid];
    if (ms < s.from) hi = mid - 1; else if (ms >= s.to) lo = mid + 1; else return s;
  }
  return null;
}
/** Consecutive segments of one place merged into visits; wx from the records (byId). */
function locVisits(segs, byId) {
  const out = [];
  for (const s of segs) {
    const prev = out[out.length - 1];
    const key = s.city ? s.key : (s.cc || '') + '|';
    if (prev && prev.key === key && s.from - prev.to < 6 * 3600000) { prev.to = s.to; prev.recs.add(s.rec); if (!prev.lat && s.lat) { prev.lat = s.lat; prev.lon = s.lon; } continue; }
    out.push(Object.assign({}, s, { key, recs: new Set([s.rec]) }));
  }
  // A short interlude (under 15 minutes) between two stays at one place was the same stay (a fix at the edge of town).
  for (let i = 1; i < out.length - 1; i++) {
    const a = out[i - 1], m = out[i], c = out[i + 1];
    if (a.key === c.key && m.to - m.from < 15 * 60000) { a.to = c.to; for (const id of m.recs) a.recs.add(id); for (const id of c.recs) a.recs.add(id); out.splice(i, 2); i--; }
  }
  for (const v of out) {
    v.ms = Math.max(0, v.to - v.from);
    let wx = null;
    for (const id of v.recs) {
      const r = byId && byId.get(id);
      if (!r || !r.wx) continue;
      wx = wx ? { hi: Math.max(wx.hi ?? -999, r.wx.hi ?? -999), lo: Math.min(wx.lo ?? 999, r.wx.lo ?? 999), cond: r.wx.cond || wx.cond, label: r.wx.label || wx.label } : { ...r.wx };
    }
    if (wx) { if (wx.hi === -999) wx.hi = null; if (wx.lo === 999) wx.lo = null; v.wx = wx; }
  }
  return out;
}
function _locDays(from, to, tz, cap) {
  const days = [];
  let t = from;
  const end = Math.max(from, to - 1);
  let guard = 0;
  while (t <= end && guard++ < (cap || 4000)) { days.push(locDayIn(t, tz)); t += LOC_DAY_MS; }
  const last = locDayIn(end, tz);
  if (days[days.length - 1] !== last) days.push(last);
  return days;
}
/** A continent from a time zone's area (good enough for a badge). */
function locContinent(tz, cc) {
  const a = String(tz || '').split('/')[0];
  if (a === 'Europe') return 'Europe';
  if (a === 'Asia') return 'Asia';
  if (a === 'Africa') return 'Africa';
  if (a === 'Australia' || a === 'Pacific') return 'Oceania';
  if (a === 'America') {
    if (/^America\/(Argentina|Sao_Paulo|Santiago|Lima|Bogota|Caracas|Montevideo|Asuncion|La_Paz|Guayaquil|Cayenne|Paramaribo|Guyana|Belem|Fortaleza|Recife|Manaus|Bahia|Cuiaba|Porto_Velho|Rio_Branco|Punta_Arenas|Maceio|Araguaina|Santarem|Campo_Grande|Boa_Vista|Noronha)/.test(String(tz))) return 'South America';
    return 'North America';
  }
  if (a === 'Antarctica') return 'Antarctica';
  if (/^(GB|IE|FR|DE|ES|PT|IT|NL|BE|CH|AT|PL|CZ|SE|NO|DK|FI|GR|HU|RO|BG|HR)$/.test(cc || '')) return 'Europe';
  return '';
}

const LOC_COUNT_STEPS = [2, 3, 5, 10, 15, 20, 30, 50, 75, 100];
const LOC_CITY_STEPS = [3, 5, 10, 25, 50, 100, 250];
const LOC_KM_STEPS = [[100, '100 km'], [1000, '1,000 km'], [10000, '10,000 km'], [40075, 'Around the world'], [384400, 'To the Moon']];
const LOC_ZONE_STEPS = [2, 5, 10, 25, 50];
/**
 * Everything the tab shows. input: {records, done, completions, now, homeCc, homeZone,
 * zoneCoords(tz) -> {lat, lon} | null, notTrips, monthName(ym)}.
 */
function locFacts(input) {
  const I = input || {};
  const now = Number.isFinite(I.now) ? I.now : Date.now();   // clock-ok: real log times
  const records = (Array.isArray(I.records) ? I.records : []).filter(r => r && Number.isFinite(r.at));
  const byId = new Map(records.map(r => [r.id, r]));
  const segs = locTimeline(records, { now, notTrips: I.notTrips });
  const visits = locVisits(segs, byId);
  for (const v of visits) if (!Number.isFinite(v.lat) && v.tz && typeof I.zoneCoords === 'function') {
    const c = I.zoneCoords(v.tz); if (c && Number.isFinite(c.lat)) { v.lat = c.lat; v.lon = c.lon; v.approx = true; }
  }
  // The home country: the one asked for, else where most time was spent.
  const ccMs = new Map();
  for (const v of visits) if (v.cc) ccMs.set(v.cc, (ccMs.get(v.cc) || 0) + v.ms);
  const homeCc = I.homeCc || [...ccMs.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0])[0] || '';

  // Countries and cities.
  const countries = new Map(), cities = new Map();
  const daysAbroad = new Set(), allDays = new Set();
  for (const v of visits) {
    const days = _locDays(v.from, v.to, v.tz, 4000);
    for (const d of days) { allDays.add(d); if (v.cc && homeCc && v.cc !== homeCc) daysAbroad.add(d); }
    if (v.cc) {
      const c = countries.get(v.cc) || { cc: v.cc, country: v.country || '', first: v.from, last: v.to, ms: 0, days: new Set(), visits: 0, cities: new Set(), tz: v.tz };
      c.country = c.country || v.country || '';
      c.first = Math.min(c.first, v.from); c.last = Math.max(c.last, v.to); c.ms += v.ms; c.visits++;
      for (const d of days) c.days.add(d);
      if (v.city) c.cities.add(v.city);
      countries.set(v.cc, c);
    }
    if (v.city) {
      const c = cities.get(v.key) || { key: v.key, city: v.city, region: v.region, cc: v.cc, country: v.country, first: v.from, last: v.to, ms: 0, days: new Set(), visits: 0, lat: v.lat, lon: v.lon, tz: v.tz, wx: null };
      c.first = Math.min(c.first, v.from); c.last = Math.max(c.last, v.to); c.ms += v.ms; c.visits++;
      for (const d of days) c.days.add(d);
      if (v.wx) c.wx = c.wx ? { hi: Math.max(c.wx.hi ?? -999, v.wx.hi ?? -999), lo: Math.min(c.wx.lo ?? 999, v.wx.lo ?? 999), label: v.wx.label || c.wx.label, cond: v.wx.cond || c.wx.cond } : { ...v.wx };
      cities.set(v.key, c);
    }
  }
  // Firsts: the first visit to each country and town (the very first place is where the log began).
  const seenCc = new Set(), seenCity = new Set();
  for (let i = 0; i < visits.length; i++) {
    const v = visits[i];
    if (v.cc && !seenCc.has(v.cc)) { seenCc.add(v.cc); v.firstCountry = i > 0 && v.cc !== homeCc; }
    if (v.city && !seenCity.has(v.key)) { seenCity.add(v.key); v.firstCity = i > 0; }
    if (i === 0) v.began = true;
  }
  // Moves: distance, time zones crossed, hours shifted.
  let km = 0, zonesCrossed = 0, hoursShifted = 0, furthest = null;
  const zones = new Set(), continents = new Set();
  let home = null;
  for (const v of visits) if (v.cc === homeCc && Number.isFinite(v.lat)) { home = v; break; }
  for (let i = 0; i < visits.length; i++) {
    const v = visits[i], p = visits[i - 1];
    if (v.tz) zones.add(v.tz);
    const ct = locContinent(v.tz, v.cc); if (ct) continents.add(ct);
    if (p) {
      const d = locKm(p, v);
      if (d >= 1) km += d;
      if (p.tz && v.tz && p.tz !== v.tz) {
        const off = Math.abs(locTzOffset(v.tz, v.from) - locTzOffset(p.tz, v.from));
        if (off > 0) { zonesCrossed++; hoursShifted += off / 60; }
      }
    }
    if (home && Number.isFinite(v.lat)) { const d = locKm(home, v); if (!furthest || d > furthest.km) furthest = { km: Math.round(d), city: v.city || v.country || v.place, cc: v.cc, at: v.from }; }
  }
  for (const r of records) if (r.kind === 'move' && r.tz) zones.add(r.tz);

  // Tasks done per place (an explicit place reference first, else where the log says you were).
  const doneRef = new Map();
  for (const d of Array.isArray(I.done) ? I.done : []) if (d && d.id) doneRef.set(d.id, d);
  const tasks = { total: 0, placed: 0, byCity: new Map(), byCc: new Map(), late: new Map(), early: new Map(), monthCities: new Map(), abroad: 0 };
  for (const c of Array.isArray(I.completions) ? I.completions : []) {
    if (!c || !Number.isFinite(c.at) || c.at > now) continue;
    tasks.total++;
    const vi = locSegmentAt(visits, c.at);
    if (vi) vi.done = (vi.done || 0) + 1;
    const ref = doneRef.get(c.task + '@' + c.at);
    const seg = locSegmentAt(segs, c.at);
    const refRec = ref && ref.rec ? byId.get(ref.rec) : null;
    const place = refRec ? _locPlace(refRec) : ref && (ref.city || ref.cc) ? { key: (ref.cc || '') + '|' + locFold(ref.city), city: ref.city || '', cc: ref.cc || '', tz: seg && seg.tz } : seg;
    if (!place) continue;
    tasks.placed++;
    if (place.cc) tasks.byCc.set(place.cc, (tasks.byCc.get(place.cc) || 0) + 1);
    if (place.cc && homeCc && place.cc !== homeCc) tasks.abroad++;
    if (place.city) {
      const k = place.key || locKeyOf(place);
      tasks.byCity.set(k, (tasks.byCity.get(k) || 0) + 1);
      const h = locHourIn(c.at, place.tz || (seg && seg.tz));
      if (h >= 23 || h < 4) tasks.late.set(k, (tasks.late.get(k) || 0) + 1);
      if (h >= 5 && h < 7) tasks.early.set(k, (tasks.early.get(k) || 0) + 1);
      const ym = locDayIn(c.at, place.tz || (seg && seg.tz)).slice(0, 7);
      if (!tasks.monthCities.has(ym)) tasks.monthCities.set(ym, new Map());
      const mc = tasks.monthCities.get(ym); if (!mc.has(k)) mc.set(k, c.at);
      if (!cities.has(k)) cities.set(k, { key: k, city: place.city, region: place.region || '', cc: place.cc, country: place.country || '', first: c.at, last: c.at, ms: 0, days: new Set([locDayIn(c.at, place.tz)]), visits: 0, lat: place.lat, lon: place.lon, tz: place.tz });
    }
  }
  const cityList = [...cities.values()].map(c => Object.assign(c, { nDays: c.days.size, done: tasks.byCity.get(c.key) || 0 }));
  const countryList = [...countries.values()].map(c => Object.assign(c, { nDays: c.days.size, nCities: c.cities.size, done: tasks.byCc.get(c.cc) || 0, home: c.cc === homeCc })).sort((a, b) => a.first - b.first);
  // The most productive place: tasks per day there (two days at least), else the most tasks.
  let productive = null;
  for (const c of cityList) {
    if (c.done < 3) continue;
    const rate = c.done / Math.max(1, c.nDays);
    if (c.nDays >= 2 && (!productive || rate > productive.rate)) productive = { city: c.city, cc: c.cc, key: c.key, done: c.done, days: c.nDays, rate: Math.round(rate * 10) / 10 };
  }
  if (!productive) { const top = cityList.filter(c => c.done).sort((a, b) => b.done - a.done)[0]; if (top) productive = { city: top.city, cc: top.cc, key: top.key, done: top.done, days: top.nDays, rate: Math.round(top.done / Math.max(1, top.nDays) * 10) / 10 }; }
  // Weather where you were.
  const wxCities = cityList.filter(c => c.wx);
  const hottest = wxCities.filter(c => Number.isFinite(c.wx.hi)).sort((a, b) => b.wx.hi - a.wx.hi)[0] || null;
  const coldest = wxCities.filter(c => Number.isFinite(c.wx.lo)).sort((a, b) => a.wx.lo - b.wx.lo)[0] || null;
  // On this day: where you were a year (or more) ago.
  const onThisDay = [];
  for (let y = 1; y <= 10; y++) {
    const d = new Date(now); d.setFullYear(d.getFullYear() - y);   // clock-ok: real log times
    const s = locSegmentAt(segs, d.getTime());
    if (s) onThisDay.push({ years: y, city: s.city, country: s.country, cc: s.cc, place: s.place });
  }
  // Per year.
  const years = new Map();
  for (const v of visits) {
    const y = locDayIn(v.from, v.tz).slice(0, 4);
    const Y = years.get(y) || { year: y, cc: new Set(), cities: new Set(), km: 0 };
    if (v.cc) Y.cc.add(v.cc); if (v.city) Y.cities.add(v.key);
    years.set(y, Y);
  }
  for (let i = 1; i < visits.length; i++) { const y = locDayIn(visits[i].from, visits[i].tz).slice(0, 4); const Y = years.get(y); if (Y) Y.km += locKm(visits[i - 1], visits[i]); }
  // Longest time away (consecutive days abroad).
  let streak = 0, best = 0, prevDay = '';
  for (const d of [...daysAbroad].sort()) {
    const next = prevDay ? new Date(Date.parse(prevDay + 'T12:00:00Z') + LOC_DAY_MS).toISOString().slice(0, 10) : '';
    streak = d === next ? streak + 1 : 1; best = Math.max(best, streak); prevDay = d;
  }
  const f = {
    v: 1, now, homeCc, began: records.length ? Math.min(...records.map(r => r.at)) : null,
    records: records.length, segments: segs, visits, countries: countryList, cities: cityList.sort((a, b) => b.ms - a.ms),
    km: Math.round(km), zones: [...zones], zonesCrossed, hoursShifted: Math.round(hoursShifted), continents: [...continents],
    daysAbroad: daysAbroad.size, daysLogged: allDays.size, longestAway: best, furthest,
    tasks: { total: tasks.total, placed: tasks.placed, abroad: tasks.abroad, byCity: tasks.byCity, byCc: tasks.byCc, late: tasks.late, early: tasks.early, monthCities: tasks.monthCities },
    productive, hottest, coldest, onThisDay, years: [...years.values()].map(Y => ({ year: Y.year, countries: Y.cc.size, cities: Y.cities.size, km: Math.round(Y.km) })).sort((a, b) => b.year.localeCompare(a.year)),
    current: segs.length ? segs[segs.length - 1] : null,
  };
  f.badges = locBadges(f, I);
  return f;
}
/** The badges earned so far, oldest first: {id, kind, title, text, icon, at}. Stable ids (the 'game' side turns them into achievements). */
function locBadges(f, I) {
  I = I || {};
  const out = [];
  const add = (id, kind, title, text, ic, at) => out.push({ id, kind, title, text, icon: ic, at: Number.isFinite(at) ? at : f.now });
  // Countries and towns, counted in the order they were first visited.
  const cs = f.countries.slice().sort((a, b) => a.first - b.first);
  for (const n of LOC_COUNT_STEPS) if (cs.length >= n) add('countries-' + n, 'count', n + ' countries', `You have been to ${n} countries.`, 'globe', cs[n - 1].first);
  const ts = f.cities.slice().sort((a, b) => a.first - b.first);
  for (const n of LOC_CITY_STEPS) if (ts.length >= n) add('cities-' + n, 'count', n + ' places', `${n} different towns and cities.`, 'map-pin', ts[n - 1].first);
  for (const v of f.visits) if (v.firstCountry) add('first-' + v.cc.toLowerCase(), 'first', 'First time in ' + (v.country || v.cc), 'Your first visit, logged ' + new Date(v.from).toISOString().slice(0, 10) + '.', 'flag', v.from);
  if (f.continents.length >= 2) add('continents-' + f.continents.length, 'count', f.continents.length + ' continents', f.continents.join(', ') + '.', 'globe', f.now);
  for (const [n, label] of LOC_KM_STEPS) if (f.km >= n) add('km-' + n, 'distance', label, `${f.km.toLocaleString('en-GB')} km between the places you have been.`, 'plane', f.now);
  for (const n of LOC_ZONE_STEPS) if (f.zonesCrossed >= n) add('zones-' + n, 'zones', 'Crossed ' + n + ' time zones', `${f.hoursShifted} hours of clock change in all.`, 'clock', f.now);
  if (f.longestAway >= 7) add('away-7', 'away', 'A week away', `${f.longestAway} days in a row abroad at most.`, 'plane', f.now);
  if (f.longestAway >= 30) add('away-30', 'away', 'A month away', `${f.longestAway} days in a row abroad.`, 'plane', f.now);
  if (f.visits.some(v => Number.isFinite(v.lat) && v.lat < 0)) add('south', 'place', 'Southern hemisphere', 'You have been south of the equator.', 'compass', (f.visits.find(v => Number.isFinite(v.lat) && v.lat < 0) || {}).from);
  if (f.visits.some(v => Number.isFinite(v.lat) && v.lat >= 66.5)) add('arctic', 'place', 'Arctic Circle', 'You have been north of the Arctic Circle.', 'mountain', (f.visits.find(v => Number.isFinite(v.lat) && v.lat >= 66.5) || {}).from);
  // Night owls and early birds: three late (23:00-04:00) or early (05:00-07:00) completions in one place.
  const cityName = (k) => { const c = f.cities.find(x => x.key === k); return c ? c.city : k.split('|')[1]; };
  for (const [k, n] of f.tasks.late) if (n >= 3) add('night-owl-' + k.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), 'habit', 'Night owl in ' + cityName(k), `${n} tasks finished after 11 pm there.`, 'moon', f.now);
  for (const [k, n] of f.tasks.early) if (n >= 3) add('early-bird-' + k.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), 'habit', 'Early bird in ' + cityName(k), `${n} tasks finished before 7 am there.`, 'sun', f.now);
  // Worked from 3+ towns in one month.
  for (const [ym, m] of f.tasks.monthCities) if (m.size >= 3) {
    const label = typeof I.monthName === 'function' ? I.monthName(ym) : ym;
    add('multi-city-' + ym, 'work', `Worked from ${m.size} places in ${label}`, [...m.keys()].slice(0, 5).map(cityName).join(', ') + '.', 'briefcase', [...m.values()].sort((a, b) => a - b)[2]);
  }
  if (f.tasks.abroad >= 10) add('done-abroad-10', 'work', '10 tasks done abroad', 'Getting things done on the road.', 'circle-check', f.now);
  if (f.productive && f.productive.done >= 10) add('productive-' + f.productive.key.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), 'work', 'Most productive in ' + f.productive.city, `${f.productive.done} tasks, ${f.productive.rate} a day there.`, 'trophy', f.now);
  return out.sort((a, b) => a.at - b.at);
}
