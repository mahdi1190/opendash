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

function animUkOn() { try { return !!animLook().ukRegional; } catch (e) { return false; } }
function _aukTravelPoint() {
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
    if (c) { where = Object.assign(c, { source: p.source }); break; }
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
    let last = '';
    try { last = localStorage.getItem(_AUK_KEY) || ''; } catch (e) { last = ''; }
    if (last === w.id && !o.force) return false;
    if (!last && !o.first) { try { localStorage.setItem(_AUK_KEY, w.id); } catch (e) { /* private mode */ } return false; }
    if (document.hidden || _aukShowing || document.querySelector('.ap-opening:not(.anim-scene), .ap-cine, #od-splash') || document.documentElement.classList.contains('story-open')) return false;   // try again on the next check
    try { localStorage.setItem(_AUK_KEY, w.id); } catch (e) { /* private mode */ }
    const words = 'Welcome to ' + w.welcome;
    const on = typeof _awOn === 'function' ? _awOn() : true;
    if (!on) { if (typeof toast === 'function') toast(words); return true; }
    // Full screen: the county's scene edge to edge (or the seasonal landscape when none is drawn yet),
    // the words low on the left; brief, and a click or any key dismisses it at once.
    const { it, origin } = typeof animOpeningScene === 'function' ? animOpeningScene(w) : { it: null, origin: '' };
    const tod = typeof animTimeOfDay === 'function' ? animTimeOfDay() : 'day';
    const art = it ? animItemHtml(it, { size: 'fill', live: true, tod }) : (typeof animOpeningFallbackHtml === 'function' ? animOpeningFallbackHtml(animSeasonOf(todayStr()), tod) : '');
    const ms = { subtle: 2400, standard: 3400, playful: 4200 }[typeof _agLevel === 'function' ? _agLevel() : 'standard'] || 3400;
    const el = animCineShow({ art, over: 'Welcome to', place: w.welcome, origin, ms, cls: 'ap-uk-welcome', onEnd: () => { _aukShowing = false; } });
    if (!el) { if (typeof toast === 'function') toast(words); return true; }
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
