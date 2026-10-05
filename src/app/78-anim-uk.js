/* ============================================================
   REGIONAL ANIMATIONS, UK (v2.2 wave 3). The page side of the county table
   (71-uk-counties.js) and the UK packs (72-anim-pack-uk-<region>.js).
   Opt-in: Settings > Animations > "Regional animations (UK)" (the data key
   state.animPrefs.look.ukRegional, off by default). Offline: no lookup is
   sent anywhere.
     animUkOn()          the setting
     animUkWhere()       {county record, town, km, source: 'travel' | 'weather'} | null
                         travel: where the travel feature places you now (a city
                         in GB, while away from home); else the weather town
     animUkCountyId()    the county id for animCtx() (the packs' when() rules), '' when off
     animUkCheck(o)      the "Welcome to <county>" moment when the detected county
                         changes (remembered per device); o.first: also on the first
                         detection (just switched on)
   ============================================================ */
const _AUK_KEY = 'dashboard-anim-uk-county';
let _aukMemo = { at: 0, key: '', where: null };
let _aukArrivalMemory = null;
/** Keep a stable town anchor: a new name plus 3 km of movement is an arrival,
 * not a small GPS shift across a nearest-town boundary. Explicit manual choices
 * can change the name without moving. Welcomes last three displays or five
 * minutes from detection, whichever comes first. */
function animUkArrivalState(w, consume = false, acknowledge = false) {
  if (!w) return { remaining: 0, pending: false };
  let rec = _aukArrivalMemory;
  try { rec = JSON.parse(localStorage.getItem('dashboard-anim-uk-arrival') || 'null') || rec; } catch (e) { /* private mode */ }
  const town = w.town || w.name;
  const point = { id: w.id, town, lat: w.lat, lon: w.lon, cc: 'GB' };
  const placeKey = w.id + '|' + town.toLowerCase();
  if (!rec || !rec.point) rec = { point, remaining: 0, pending: false, seen: [placeKey], visits: [{key: placeKey, at: Date.now(), count: 1}], recent: [{key: placeKey, at: Date.now()}], sequence: 0 };
  else if (rec.point.id !== w.id || rec.point.town !== town) {
    const p = rec.point, r = Math.PI / 180;
    const valid = [p.lat, p.lon, w.lat, w.lon].every(v => typeof v === 'number' && Number.isFinite(v));
    const h = valid ? Math.sin((w.lat - p.lat) * r / 2) ** 2 + Math.cos(p.lat * r) * Math.cos(w.lat * r) * Math.sin((w.lon - p.lon) * r / 2) ** 2 : 0;
    const km = valid ? 12742 * Math.asin(Math.min(1, Math.sqrt(h))) : 0;
    if (APP_CONFIG.locationMode === 'manual' || km >= 3 || (!valid && p.id !== w.id)) {
      const seen = Array.isArray(rec.seen) ? rec.seen.filter(x => typeof x === 'string').slice(-12) : [p.id + '|' + String(p.town || '').toLowerCase()];
      const now = Date.now();
      const visits = Array.isArray(rec.visits) ? rec.visits.filter(v => v && typeof v.key === 'string').slice(-12) : [];
      const previous = visits.find(v => v.key === placeKey);
      const count = previous ? Math.max(1, Number(previous.count) || 1) + 1 : seen.includes(placeKey) ? 2 : 1;
      const recent = [...(Array.isArray(rec.recent) ? rec.recent.filter(v => v && typeof v.key === 'string' && v.at > now - 7 * 86400000 && v.at <= now) : []), {key: placeKey, at: now}].slice(-12);
      let local = {};
      try { if (typeof Clock !== 'undefined' && typeof _tmParts === 'function') local = _tmParts(Clock.now(), Clock.zone()); } catch (e) { /* Clock not ready. */ }
      const egg = typeof trJourneyEgg === 'function' && (!rec.eggAt || Date.now() - rec.eggAt >= 6 * 3600000)
        ? trJourneyEgg({ from: p, to: point, returning: seen.includes(placeKey), visitCount: count, awayMs: previous && previous.at > 0 ? now - previous.at : 0,
          uniqueToday: new Set(recent.filter(v => v.at > now - 86400000).map(v => v.key)).size, uniqueWeek: new Set(recent.map(v => v.key)).size,
          sequence: Number(rec.sequence) || 0, hour: local.h, dow: local.dow,
          birthday: !!(APP_CONFIG.birthday && local.iso && String(APP_CONFIG.birthday).slice(-5) === local.iso.slice(-5)),
          source: APP_CONFIG.locationMode === 'manual' ? 'manual' : 'geo' }) : null;
      rec = { ...rec, point, remaining: 3, pending: true, until: Date.now() + 5 * 60 * 1000, egg,
        seen: [...seen.filter(x => x !== placeKey), placeKey].slice(-12), recent,
        visits: [...visits.filter(v => v.key !== placeKey), {key: placeKey, at: now, count}].slice(-12), sequence: (Number(rec.sequence) || 0) + 1 };
    }
  }
  if (rec.remaining > 0 && (!Number.isFinite(rec.until) || Date.now() >= rec.until)) { rec.remaining = 0; rec.pending = false; rec.egg = null; }
  const result = { remaining: Math.max(0, Math.min(3, Number(rec.remaining) || 0)), pending: !!rec.pending, egg: rec.egg || null };
  if (consume) {
    rec.remaining = Math.max(0, result.remaining - 1); rec.pending = false;
    if (rec.egg) rec.eggAt = Date.now();
    rec.egg = null;
  }
  else if (acknowledge) { rec.pending = false; rec.egg = null; }
  _aukArrivalMemory = rec;
  try { localStorage.setItem('dashboard-anim-uk-arrival', JSON.stringify(rec)); } catch (e) { /* private mode */ }
  return result;
}

function animUkOn() { try { return !!animLook().ukRegional; } catch (e) { return false; } }
function _aukTravelPoint() {
  if (APP_CONFIG.locationMode) return null; // Explicit location choice takes precedence over travel inference.
  try {
    if (typeof TravelStore === 'undefined' || !TravelStore.on()) return null;
    const w = TravelStore.snapshot().where;
    const pl = w && w.source !== 'home' ? w.place : null;
    if (!pl || pl.cc !== 'GB' || !pl.cityId) return null;
    const c = TravelStore.places().cities.get(pl.cityId);
    return c && isFinite(c.lat) && isFinite(c.lon) ? { lat: c.lat, lon: c.lon, source: 'travel' } : null;
  } catch (e) { return null; }
}
function _aukWeatherPoint() {
  const loc = APP_CONFIG.location && typeof APP_CONFIG.location === 'object' ? APP_CONFIG.location : null;
  return loc && isFinite(+loc.lat) && isFinite(+loc.lon) ? { lat: +loc.lat, lon: +loc.lon, source: 'weather' } : null;
}
function animUkWhere() {
  if (!animUkOn()) return null;
  const now = Date.now();
  const pts = [_aukTravelPoint(), _aukWeatherPoint()].filter(Boolean);
  const key = JSON.stringify(pts);
  if (_aukMemo.key === key && now - _aukMemo.at < 60e3) return _aukMemo.where;
  let where = null;
  for (const p of pts) {
    const c = ukCountyNearest(p.lat, p.lon);
    if (c) { where = Object.assign(c, { source: p.source, lat: p.lat, lon: p.lon });
      if (APP_CONFIG.locationMode === 'manual' && APP_CONFIG.location && APP_CONFIG.location.name) where.town = APP_CONFIG.location.name;
      break; }
  }
  _aukMemo = { at: now, key, where };
  return where;
}
function animUkCountyId() { try { const w = animUkWhere(); return w ? w.id : ''; } catch (e) { return ''; } }
/** The county's signature opening (a UK pack item), or null when its region is not drawn yet or its pack is off. */
function animUkSignature(id) {
  const look = animLook();
  return animItems({ slot: 'opening', look }).find(it => it.county === id && it.signature && !look.block.includes(it.ref)) || null;
}

/* ---------- the "Welcome to <county>" moment ---------- */
let _aukShowing = false;
function animUkCheck(o) {
  o = o || {};
  try {
    const w = animUkWhere();
    if (!w) return false;
    const arrival = animUkArrivalState(w);
    let last = '';
    try { last = localStorage.getItem(_AUK_KEY) || ''; } catch (e) { last = ''; }
    if (last === w.id && !arrival.pending && !o.force) return false;
    if (!last && !o.first && !arrival.pending) { try { localStorage.setItem(_AUK_KEY, w.id); } catch (e) { /* private mode */ } return false; }
    if (document.hidden || _aukShowing || document.querySelector('.ap-opening:not(.anim-scene), .ap-cine, #od-splash') || document.documentElement.classList.contains('story-open')) return false;   // try again on the next check
    try { localStorage.setItem(_AUK_KEY, w.id); } catch (e) { /* private mode */ }
    const words = w.town || w.name;
    const on = typeof _awOn === 'function' ? _awOn() : true;
    if (!on) { if (typeof toast === 'function') toast(words); animUkArrivalState(w, false, true); return true; }
    // Full screen: the county's scene edge to edge (or the seasonal landscape when none is drawn yet),
    // the words low on the left; brief, and a click or any key dismisses it at once.
    const { it, origin } = typeof animOpeningScene === 'function' ? animOpeningScene(w) : { it: null, origin: '' };
    const tod = typeof animTimeOfDay === 'function' ? animTimeOfDay() : 'day';
    const art = it ? animItemHtml(it, { size: 'fill', live: true, tod }) : (typeof animOpeningFallbackHtml === 'function' ? animOpeningFallbackHtml(animSeasonOf(todayStr()), tod) : '');
    const ms = ({ subtle: 2400, standard: 3400, playful: 4200 }[typeof _agLevel === 'function' ? _agLevel() : 'standard'] || 3400) + (arrival.egg ? arrival.egg.extraMs : 0);
    const el = animCineShow({ art, over: arrival.remaining > 0 ? 'Welcome to' : '', place: animOpeningPlace(it, w), origin, egg: arrival.egg, ms, cls: 'ap-uk-welcome', onEnd: reason => {
      _aukShowing = false;
      // Arrival has the same ordering as the daily splash. Skipping ends the
      // whole sequence; a completed welcome may continue with today's event.
      if (reason !== 'complete' || typeof animOpeningEvent !== 'function') return;
      const event = animOpeningEvent();
      if (!event) return;
      const next = animCineShow({ art: animOpeningEventHtml(event, tod), over: 'Today', place: event.site || event.label,
        ms: _AW_OPEN_MS[typeof _agLevel === 'function' ? _agLevel() : 'standard'] || 1700,
        onEnd: () => { _aukShowing = false; } });
      _aukShowing = !!next;
    } });
    if (!el) { if (typeof toast === 'function') toast(words); return true; }
    animUkArrivalState(w, true);
    _aukShowing = true;
    return true;
  } catch (e) { return false; }
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => animUkCheck(), 3200);                 // after the day's opening
    setInterval(() => { if (animUkOn()) animUkCheck(); }, 5 * 60e3);
  }, { once: true });
}
