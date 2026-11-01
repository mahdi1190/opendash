/* ============================================================
   ACHIEVEMENTS, the page side of the 500 (2.21; docs/dev/ACHIEVEMENTS_500.md 1.8, 2.1.4). The pure fact
   sources (71-ach-src-*.js) read the synced data; this file holds what only the page can see: the
   garden, the pet, the places log, the scenes you really watched, the calendar's quiet days and a
   few calm moments. Every function is guarded: a missing module (or one that is turned off) simply
   reports nothing, and nothing here is ever in the way of the app. Ids and counts only, never text.
   ============================================================ */
const _ACHG_ISO = /^\d{4}-\d{2}-\d{2}$/;
function _achgNum(v) { v = Number(v); return isFinite(v) && v > 0 ? Math.floor(v) : 0; }

/** The garden's numbers (the module's own functions; read once a minute at most by the facts layer). */
function gardenAchFacts() {
  try {
    if (typeof gardenFacts !== 'function' || typeof gardenModel !== 'function' || typeof state === 'undefined' || !state || !state.garden) return null;
    const m = gardenModel(), f = gardenFacts(m), g = state.garden, w = m.wallet || { n: {} };
    const decor = new Set((m.decor || []).map(d => d && d.def && d.def.id).filter(Boolean));
    const tend = {};
    for (const d of Object.keys(g.wl || {})) if (_ACHG_ISO.test(d) && Object.keys(g.wl[d] || {}).length) tend[d] = 1;
    for (const e of Object.values(g.led || {})) if (e && e.d && e.k !== 'mig' && _ACHG_ISO.test(e.d)) tend[e.d] = 1;
    return {
      n: {
        'garden.planted': _achgNum(f.planted), 'garden.species': _achgNum(f.plantsFound), 'garden.harvests': _achgNum(f.harvests),
        'garden.decor': _achgNum(f.decorPlaced), 'garden.decorDistinct': decor.size, 'garden.visitorsDistinct': _achgNum(f.visitorsFound),
        'garden.shopBuys': _achgNum(w.n && w.n.bought), 'garden.level': _achgNum(m.level && m.level.level),
        'garden.almanac': Object.keys(g.disc || {}).length, 'garden.bloomSeasons': _achgNum(f.seasons), 'garden.friendWaters': _achgNum(f.friendWaters),
      },
      s: { 'd.gardenTend': tend },
    };
  } catch (e) { return null; }
}

/** The pet's numbers (state.pet: a single pet, fed and petted by day). */
function petAchFacts() {
  try {
    const p = typeof state !== 'undefined' && state ? state.pet : null;
    if (!p || typeof p !== 'object' || !p.look) return null;
    const sum = (o) => Object.values(o && typeof o === 'object' ? o : {}).reduce((t, v) => t + _achgNum(v), 0);
    const care = {};
    for (const d of [...Object.keys(p.fed || {}), ...Object.keys(p.petted || {})]) if (_ACHG_ISO.test(d)) care[d] = 1;
    let all = 0;
    try { const tr = typeof petTricks === 'function' ? petTricks() : []; all = tr.length && tr.every(t => t && t.taught) ? 1 : 0; } catch (e) { all = 0; }
    const born = _ACHG_ISO.test(String(p.born || '')) ? Math.max(0, Math.round((Date.parse(todayStr() + 'T12:00:00Z') - Date.parse(p.born + 'T12:00:00Z')) / 86400000)) : 0;
    return {
      n: { 'pets.adopted': 1, 'pets.named': String(p.name || '').trim() ? 1 : 0, 'pets.treats': sum(p.fed), 'pets.tricks': Object.keys(p.tricks || {}).length, 'pets.tricksAll': all, 'pets.oldestDays': born },
      s: { 'd.petCare': care },
    };
  } catch (e) { return null; }
}

/** Places: the locations module's own numbers (private; the log never leaves this computer). */
registerAchFacts('b5-places', () => {
  try {
    if (typeof locationsFacts !== 'function') return null;
    const f = locationsFacts();
    if (!f || typeof f.then === 'function') return null;
    const cities = Array.isArray(f.cities) ? f.cities : [];
    const perMonth = {};
    for (const c of cities) if (c && Number(c.first) > 0) { const k = (typeof Clock !== 'undefined' ? Clock.parts(Number(c.first)).iso : new Date(Number(c.first)).toISOString().slice(0, 10)).slice(0, 7); perMonth[k] = (perMonth[k] || 0) + 1; }   // clock-ok: fallback
    // the first town ever logged is where the log began, not a visit: leave the earliest month out
    const months = Object.keys(perMonth).sort();
    if (months.length) { const first = months[0]; perMonth[first] = Math.max(0, perMonth[first] - 1); if (!perMonth[first]) delete perMonth[first]; }
    const byCity = f.tasks && f.tasks.byCity instanceof Map ? [...f.tasks.byCity.values()] : [];
    const badge = (id) => (Array.isArray(f.badges) && f.badges.some(b => b && b.id === id) ? 1 : 0);
    return {
      n: {
        'places.continents': Array.isArray(f.continents) ? f.continents.length : 0, 'places.km': _achgNum(f.km), 'places.zonesCrossed': _achgNum(f.zonesCrossed),
        'places.longestAway': _achgNum(f.longestAway), 'places.furthestKm': _achgNum(f.furthest && f.furthest.km), 'places.tasksAbroad': _achgNum(f.tasks && f.tasks.abroad),
        'places.maxCityDone': Math.max(0, ...byCity.map(_achgNum)), 'places.newPlaceMonths': Object.keys(perMonth).length, 'places.newCitiesMonthMax': Math.max(0, ...Object.values(perMonth)),
        'locBadge.south': badge('south'), 'locBadge.arctic': badge('arctic'),
      },
    };
  } catch (e) { return null; }
});

/** Together plans: cards you put on shared Plan boards. */
registerAchFacts('b4-together', () => {
  try {
    if (typeof tgAllSpaces !== 'function' || typeof tgMe !== 'function') return null;
    const me = tgMe(); if (!me) return null;
    let cards = 0;
    for (const sp of tgAllSpaces()) {
      if (!sp || sp.status !== 'joined' || !sp.value) continue;
      for (const c of (Array.isArray(sp.value.plan) ? sp.value.plan : []).slice(0, 500)) if (c && c.by === me) cards++;
    }
    return { n: { 'together.planCards': cards } };
  } catch (e) { return null; }
});

/** Calm moments the periodic check notices: Fun on Full, the turn of the year. */
registerAchCheck('b4-moments', (ctx) => {
  try {
    if (typeof gameFun === 'function' && gameFun() === 'full') ctx.tick('fun-full');
    const md = String(ctx.today || '').slice(5);
    if (md === '01-01' && typeof Clock !== 'undefined' && Clock.parts(Clock.now()).h === 0) ctx.mark('new-year-open', String(ctx.today).slice(0, 4));
    if (typeof pagesAll === 'function' && typeof state !== 'undefined' && state.game && state.game.marks) {
      const seen = state.game.marks.view || {};
      const list = pagesAll().filter(p => p && p.id && !p.hidden && (typeof p.available !== 'function' || p.available()));
      if (list.length >= 10 && list.every(p => seen[p.id])) ctx.mark('all-pages', 'yes');
    }
  } catch (e) { /* never in the way */ }
});

/* ---------- scenes you really watched: a playing scene on screen for 20 seconds ---------- */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const secs = new Map();
  setInterval(() => {
    try {
      if (document.hidden || typeof window.__sceneStats !== 'function' || typeof gameMark !== 'function') return;
      const live = window.__sceneStats().filter(s => s && s.ref && s.playing);
      const seen = new Set();
      for (const s of live) {
        const ref = String(s.ref);
        if (!/^[A-Za-z0-9:_./-]{1,64}$/.test(ref) || seen.has(ref)) continue;
        seen.add(ref);
        const t = (secs.get(ref) || 0) + 5;
        secs.set(ref, t);
        if (t === 20) {
          gameMark('scene', ref);
          const h = typeof Clock !== 'undefined' ? Clock.parts(Clock.now()).h : 12, m = Number(String(todayStr()).slice(5, 7));
          gameMark('scene-tod', h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'dusk' : 'night');
          gameMark('scene-season', m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter');
        }
      }
      for (const k of [...secs.keys()]) if (!seen.has(k)) secs.delete(k);
    } catch (e) { /* never in the way */ }
  }, 5000);
})();
