/* ============================================================
   SCENE ENGINE v2: crowds and traffic (docs/dev/SCENE_ENGINE_V2.md section 9; builder D).
   PURE: functions and consts only, no DOM, nothing expensive at load. Loaded by the browser build and by Node.
   Classic script, one shared scope: top-level names start with scene / SCENE_ / _scfl (private).
   It may call 70-scene-0core.js at load; the other 70-scene-1* files (sceneProject, sceneObjReal, sceneDepthBand,
   sceneHazeAt ...) only LAZILY, inside functions, behind a typeof guard (any builder may land first).

   Authors DECLARE flows along surfaces (roads, pavements, towpaths, rails, water); the engine spawns the agents.
     flows: [{ id, kind: walk|cycle|drive|tram|train|boat|graze, on: '<surface or water id>' | [ids], density (agents per 100 m
               of lane at the profile's peak), profile: commuter|town|leisure|nightlife|boats|rail, mix: 'kit' | id | [ids] | { id: w },
               speed: [min, max] m/s, both (walk: both directions), max (most visible at once), lanes (explicit [{ path, dir }]),
               bus: { obj, every (min), stops: [{ along, dwell (s) }] }, timetable: { every (min), dwell, stops }, dMax, pairs, seed }]
     scene.drive: 'left' | 'right' (default: left inside SCENE_DRIVE_LEFT_BOXES, from the camera's or the view's lat / lon)

   Constants   SCENE_FLOW_PROFILES (24 hourly multipliers, weekday / weekend, plus weather and season factors), SCENE_FLOW_KINDS,
               SCENE_DRIVE_LEFT_BOXES, SCENE_OBJ_VIEWS (front / rear views of movers, 70-scene-lib-vehicles-views.js),
               SCENE_FLOW_PERIOD (600 s), SCENE_FLOW_MAX_AGENTS (60), SCENE_FLOW_MAX_SPRITES (120)
   Compile     sceneFlowCompile(data, C, opt) -> the compiled flows (C.flows: lanes in ground metres, pure JSON; problems pushed to
               C.problems). A's sceneCompile calls it (stage 7) and sets C.flows; C.stats.v2 takes sceneFlowStats(C.flows).
               sceneFlowBudget(flows, otherDraws, problems) scales every max so the scene stays within 60 agents and 300 animated
               draws (A calls it again once the v1 sum is known, if it was not when the flows compiled).
               sceneFlowStats(flows) -> { flows, flowMax, flowDraws }; sceneDriveSide(data)
   Time        sceneFlowHour(L, data) -> { hour, weekday } (L.localHour / L.weekday from C's sceneLightV2, else solar time from
               L.ms and the longitude, else the authored moment); sceneFlowProfile(name, hour, weekday); sceneFlowMult(flow, L,
               data, season) -> the density multiplier now (profile, weather, season, daylight); sceneFlowMults(C, L, data)
   Schedules   sceneFlowSchedule(flow, lane, mult) -> the spawn list of one lane for one period (seeded at the profile's peak,
               then THINNED by a seeded keep value: a change of hour or weather adds or removes agents, it never reshuffles them)
   Agents      sceneFlowAgents(C, t, L, opt) -> every visible agent at time t, far to near: { flow, lane, k, o, v, base, cls, kind,
               x, d, h, X, Y, s, k3, view, viewMissing, flip, alpha, layer, speed, moving, night, bus, water, len, phase }
               (a pure function of (C, t, L): no state, any frame; t = 0 is half a period into the schedule, so a still shows a
               street already in motion). sceneFlowAt(flow, k, t, cam, mult): one agent; sceneFlowCount(C, t, L)
   Views       sceneObjViews(id) -> { front, rear, q } | null; sceneFlowViewOf(id, across, toward) -> { view, o, missing }
   ============================================================ */
const SCENE_FLOW_PERIOD = 600, SCENE_FLOW_MAX_AGENTS = 60, SCENE_FLOW_MAX_SPRITES = 120, SCENE_FLOW_DRAW_BUDGET = 300;
const SCENE_FLOW_KINDS = Object.freeze(['walk', 'cycle', 'drive', 'tram', 'train', 'boat', 'graze']);
/**
 * Hourly density multipliers (index = local hour 0..23; linear between hours), weekday (wd) and weekend (we), plus factors:
 * sun (Sunday on the weekend curve), dusk / daylight (falls away after sunset), season. 1 = the declared density at its busiest.
 */
const SCENE_FLOW_PROFILES = Object.freeze({
  commuter: { wd: [0.08, 0.05, 0.05, 0.05, 0.07, 0.15, 0.4, 0.8, 1, 0.78, 0.6, 0.6, 0.62, 0.6, 0.6, 0.68, 0.85, 1, 0.97, 0.62, 0.42, 0.3, 0.2, 0.12],
              we: [0.1, 0.07, 0.05, 0.05, 0.05, 0.07, 0.12, 0.2, 0.3, 0.45, 0.55, 0.6, 0.62, 0.6, 0.58, 0.55, 0.52, 0.5, 0.45, 0.38, 0.3, 0.24, 0.18, 0.12] },
  town: { wd: [0.05, 0.05, 0.05, 0.05, 0.05, 0.06, 0.12, 0.3, 0.55, 0.8, 1, 1, 1, 1, 1, 1, 1, 0.9, 0.65, 0.5, 0.5, 0.4, 0.2, 0.08],
          we: [0.07, 0.05, 0.05, 0.05, 0.05, 0.05, 0.08, 0.18, 0.4, 0.75, 1.1, 1.3, 1.3, 1.3, 1.3, 1.3, 1.2, 1, 0.75, 0.6, 0.55, 0.45, 0.25, 0.12],
          sun: 0.75 },   // Sunday: the weekend curve x 0.75 (Saturday is the busy day)
  leisure: { wd: [0.02, 0.01, 0.01, 0.01, 0.01, 0.03, 0.1, 0.2, 0.3, 0.35, 0.4, 0.4, 0.42, 0.4, 0.4, 0.4, 0.38, 0.32, 0.25, 0.15, 0.08, 0.04, 0.03, 0.02],
             we: [0.02, 0.01, 0.01, 0.01, 0.01, 0.03, 0.08, 0.2, 0.4, 0.6, 0.8, 0.9, 0.95, 1, 1, 1, 0.95, 0.8, 0.55, 0.3, 0.12, 0.05, 0.03, 0.02],
             dusk: true },
  nightlife: { wd: [0.8, 0.5, 0.25, 0.1, 0.06, 0.06, 0.1, 0.2, 0.3, 0.3, 0.3, 0.3, 0.32, 0.32, 0.3, 0.3, 0.32, 0.4, 0.6, 0.85, 1, 1, 1, 0.95],
               we: [1, 0.75, 0.45, 0.2, 0.08, 0.06, 0.08, 0.15, 0.25, 0.3, 0.32, 0.35, 0.38, 0.38, 0.38, 0.38, 0.4, 0.5, 0.7, 0.95, 1, 1, 1, 1] },
  boats: { wd: [0, 0, 0, 0, 0, 0, 0.1, 0.3, 0.55, 0.75, 0.9, 1, 1, 1, 1, 1, 0.95, 0.8, 0.55, 0.3, 0.1, 0, 0, 0],
           we: [0, 0, 0, 0, 0, 0, 0.12, 0.35, 0.65, 0.9, 1, 1, 1, 1, 1, 1, 1, 0.9, 0.65, 0.35, 0.12, 0, 0, 0],
           daylight: true, season: { spring: 0.8, summer: 1.5, autumn: 0.6, winter: 0.2 } },
  // trams and trains run to a timetable: this is the SERVICE level (1 = the timetable as declared; 0 = no service)
  rail: { wd: [0.5, 0, 0, 0, 0, 0.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.75, 0.75, 0.5],
          we: [0.5, 0.5, 0, 0, 0, 0, 0.5, 0.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.75, 0.75, 0.75, 0.5] },
});
// weather and kind: rain halves walkers (umbrellas), thins cyclists and boats; snow keeps most people in and boats moored
const _SCFL_WX = { rain: { walk: 0.5, cycle: 0.3, boat: 0.5, drive: 1, graze: 0.7 }, snow: { walk: 0.4, cycle: 0.15, boat: 0, drive: 0.8, graze: 0.5 } };
const _SCFL_DEF = {   // per kind: speed m/s, headway gap (m, beyond the half lengths for vehicles), default profile and mix, the class
  walk: { speed: [1.1, 1.5], gap: 0.8, profile: 'town', mix: 'kit', cls: 'person', both: true },
  cycle: { speed: [4, 6.2], gap: 2.5, profile: 'leisure', mix: { 'person.cyclist': 1 }, cls: 'cyclist', both: true },
  drive: { speed: [7.5, 11], gap: 6, profile: 'commuter', mix: { 'vehicle.car': 1 }, cls: 'car', both: true },
  tram: { speed: [6, 8.5], gap: 20, profile: 'rail', mix: { 'vehicle.nottingham-tram': 1 }, cls: 'tram', both: true },
  train: { speed: [12, 18], gap: 40, profile: 'rail', mix: { 'rail.train': 1 }, cls: 'train', both: true },
  boat: { speed: [0.9, 1.3], gap: 12, profile: 'boats', mix: { 'boat.narrowboat': 1 }, cls: 'boat', both: true },
  graze: { speed: [0.04, 0.15], gap: 2, profile: 'leisure', mix: { 'animal.sheep': 1 }, cls: 'animal-graze', both: false },
};
/**
 * Draw calls per visible agent, the upper bound the 300 budget counts (78-scene-flow.js draws at most this many): body and walk
 * parts (a far agent is one sprite), its shadow, its head or tail light at night, its reflection and wake on water.
 */
const _SCFL_DRAWS = { walk: 4, cycle: 4, drive: 4, tram: 4, train: 3, boat: 4, graze: 2 };
/** The tallest an agent may be on screen (units): walkers keep the care cap (150), vehicles stop short of filling the frame. */
const _SCFL_NEAR_UNITS = { walk: 150, cycle: 150, graze: 150, drive: 520, tram: 520, train: 520, boat: 520 };
/** Drive on the LEFT inside these boxes [lat0, lon0, lat1, lon1] (GB, IE, JP, AU, NZ, IN, ZA, HK, SG, MY, TH, ID, ...); else on the right. */
const SCENE_DRIVE_LEFT_BOXES = Object.freeze([
  [49.8, -8.7, 60.9, 1.8], [51.3, -10.7, 55.5, -5.9], [49.1, -2.7, 49.8, -2], [24, 122.9, 45.6, 146], [-44, 112.8, -10, 154], [-47.5, 166, -34, 179],
  [6.7, 68, 35.6, 89.5], [-35, 16.4, -22, 33], [22.1, 113.8, 22.6, 114.4], [1.15, 103.6, 1.48, 104.1], [0.8, 99.6, 7.4, 119.3], [5.6, 97.3, 20.5, 105.7],
  [-11, 95, 6, 141], [-0.5, 29, 5, 35.1], [-12, 32.6, 5.5, 41.9], [-1.1, 33.9, 4.3, 35], [17.6, -78.4, 18.6, -76.1], [10, -61.95, 11.4, -60.5],
  [13, -59.7, 13.4, -59.4], [-20.6, 57.2, -19.9, 57.9], [5.9, 80, 9.9, 82], [26.3, 80, 30.5, 88.3], [-27, 25, -17.7, 33], [27, 88.7, 28.4, 92.2],
  [-17.8, 177, -16, 180], [-26.9, 30.7, -25.7, 32.2], [-30.7, 27, -28.5, 29.5], [-18.1, 20, -8.2, 33.7], [-26.9, 19.9, -17.8, 29.4], [-15.5, 22, -8, 33.7],
  [12.6, 41.7, 15, 43.3], [35.5, 32.2, 35.75, 34.6],
]);
/**
 * Front and rear (and three-quarter, q) views of the commonest movers (4.3, 9.5), linked here so a library object need not be
 * edited to gain a view (an object's own `views` field wins). The view objects live in 70-scene-lib-vehicles-views.js; a view
 * object shares its side view's variants (a red car's front is red), unless the link names one (`v`: a tram's livery).
 */
const SCENE_OBJ_VIEWS = Object.freeze({
  'vehicle.car': { front: 'vehicle.car-front', rear: 'vehicle.car-rear', q: null },
  'vehicle.taxi': { front: 'vehicle.taxi-front', rear: 'vehicle.taxi-rear', q: null },
  'vehicle.bus': { front: 'vehicle.bus-front', rear: 'vehicle.bus-rear', q: null },
  'vehicle.bus-double-decker': { front: 'vehicle.bus-front', rear: 'vehicle.bus-rear', q: null },
  'vehicle.nottingham-tram': { front: 'vehicle.tram-front', rear: 'vehicle.tram-rear', q: null, v: 0 },
  'vehicle.metrolink-tram': { front: 'vehicle.tram-front', rear: 'vehicle.tram-rear', q: null, v: 1 },
  'vehicle.metrolink-m5000': { front: 'vehicle.tram-front', rear: 'vehicle.tram-rear', q: null, v: 1 },
  'vehicle.supertram': { front: 'vehicle.tram-front', rear: 'vehicle.tram-rear', q: null, v: 2 },
  'vehicle.sheffield-supertram': { front: 'vehicle.tram-front', rear: 'vehicle.tram-rear', q: null, v: 2 },
  'person.cyclist': { front: 'person.cyclist-front', rear: 'person.cyclist-rear', q: null },
  'person.cyclist-commuter': { front: 'person.cyclist-front', rear: 'person.cyclist-rear', q: null },
  'boat.narrowboat': { front: 'boat.narrowboat-bow', rear: 'boat.narrowboat-stern', q: null },
});
/** Real sizes of the movers when the real-size table (70-scene-1real.js, A) is not loaded: { h, l, w } metres (l: along the view). */
const _SCFL_REAL = {
  'person.': { h: 1.72, l: 0.5, w: 0.5 }, 'person.cyclist': { h: 1.75, l: 1.75, w: 0.6 }, 'person.cyclist-commuter': { h: 1.75, l: 1.75, w: 0.6 },
  'person.family': { h: 1.8, l: 1.2, w: 0.6 }, 'person.dog-walker': { h: 1.75, l: 1.6, w: 0.6 }, 'person.buggy-walker': { h: 1.72, l: 1.6, w: 0.6 },
  'person.cyclist-front': { h: 1.75, l: 0.6, w: 1.75 }, 'person.cyclist-rear': { h: 1.75, l: 0.6, w: 1.75 },
  'vehicle.car': { h: 1.5, l: 4.2, w: 1.8 }, 'vehicle.car-city': { h: 1.5, l: 4.2, w: 1.8 }, 'vehicle.taxi': { h: 1.6, l: 4.5, w: 1.8 }, 'vehicle.taxi-black': { h: 1.8, l: 4.6, w: 2 },
  'vehicle.car-front': { h: 1.5, l: 1.8, w: 4.2 }, 'vehicle.car-rear': { h: 1.5, l: 1.8, w: 4.2 }, 'vehicle.taxi-front': { h: 1.6, l: 1.8, w: 4.5 }, 'vehicle.taxi-rear': { h: 1.6, l: 1.8, w: 4.5 },
  'vehicle.bus': { h: 4.4, l: 11, w: 2.55 }, 'vehicle.bus-double-decker': { h: 4.4, l: 11, w: 2.55 }, 'vehicle.bus-front': { h: 4.4, l: 2.55, w: 11 }, 'vehicle.bus-rear': { h: 4.4, l: 2.55, w: 11 },
  'vehicle.tram-front': { h: 3.4, l: 2.65, w: 30 }, 'vehicle.tram-rear': { h: 3.4, l: 2.65, w: 30 }, 'vehicle.nottingham-tram': { h: 3.4, l: 33, w: 2.4 },
  'vehicle.metrolink-tram': { h: 3.4, l: 29, w: 2.65 }, 'vehicle.metrolink-m5000': { h: 3.4, l: 28.4, w: 2.65 }, 'vehicle.supertram': { h: 3.4, l: 34.8, w: 2.65 }, 'vehicle.sheffield-supertram': { h: 3.4, l: 34.8, w: 2.65 },
  'vehicle.tractor': { h: 2.9, l: 4.5, w: 2.4 }, 'vehicle.scooter': { h: 1.6, l: 1.8, w: 0.7 }, 'vehicle.tuk-tuk': { h: 1.9, l: 2.9, w: 1.4 },
  'rail.': { h: 3.8, l: 60, w: 2.8 }, 'boat.narrowboat': { h: 1.9, l: 18, w: 2.1 }, 'boat.narrowboat-bow': { h: 1.9, l: 2.1, w: 18 }, 'boat.narrowboat-stern': { h: 1.9, l: 2.1, w: 18 },
  'boat.dinghy': { h: 6, l: 4.2, w: 1.6 }, 'boat.yacht': { h: 11, l: 10, w: 3.4 }, 'boat.': { h: 2, l: 8, w: 2.5 },
  'animal.sheep': { h: 0.8, l: 1.2, w: 0.5 }, 'animal.dog': { h: 0.55, l: 0.8, w: 0.3 }, 'animal.cattle': { h: 1.45, l: 2.4, w: 0.8 }, 'animal.pony': { h: 1.35, l: 2, w: 0.6 }, 'animal.': { h: 0.8, l: 1, w: 0.4 },
  'bird.': { h: 0.35, l: 0.5, w: 0.3 }, 'vehicle.': { h: 1.6, l: 4.4, w: 1.8 },
};
const _scflR = v => Math.round(v * 100) / 100, _scflR1 = v => Math.round(v * 10) / 10;
const _scflClamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** A seeded unit value in [0, 1) of a string (the per-agent choices: keep, jitter, size, umbrella). */
const _scflU = (s) => (sceneHash(s) % 100003) / 100003;

/* ---------- object facts (lazy: the library and A's tables may land after this file) ---------- */
/** An object's real size { h, l, w } in metres: A's sceneObjReal when loaded, else the def's `real`, else this file's table. */
function _scflReal(id) {
  if (typeof sceneObjReal === 'function') { try { const r = sceneObjReal(id); if (r && r.h > 0) return r; } catch (e) { /* fall through */ } }
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
  if (def && def.real && def.real.h > 0) return def.real;
  if (_SCFL_REAL[id]) return _SCFL_REAL[id];
  const pre = String(id).split('.')[0] + '.';
  return _SCFL_REAL[pre] || { h: 1.5, l: 2, w: 1 };
}
/** The other views of an object: its own `views` field, else SCENE_OBJ_VIEWS; null when it has none. */
function sceneObjViews(id) {
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
  return (def && def.views) || SCENE_OBJ_VIEWS[id] || null;
}
/**
 * Which view to draw (4.3), from the angle between the direction of travel and the line of sight (both on the ground):
 * `across` is that angle folded into 0..90 degrees (90: crossing the view; 0: straight toward or away from the camera).
 * Crossing by more than 55: 'side'; by less than 35: 'front' (coming toward the camera) or 'rear' (going away); between: 'q' if
 * the object has one, else the nearer of the two. (The spec words it as the screen angle of the projected tangent; that agrees
 * near the camera but calls a far car on a receding road side-on, because every line flattens toward the horizon. The sightline
 * is what decides which face of a vehicle the eye sees.) Returns { view, o (the object to draw), missing, want }.
 */
function sceneFlowViewOf(id, across, toward) {
  const ang = 90 - across;   // 0 = side-on
  let want = ang < 35 ? 'side' : ang > 55 ? (toward ? 'front' : 'rear') : 'q';
  const vw = want === 'side' ? null : sceneObjViews(id);
  if (want === 'q') { if (vw && vw.q) return { view: 'q', o: vw.q, missing: false }; want = ang < 45 ? 'side' : (toward ? 'front' : 'rear'); }
  if (want === 'side') return { view: 'side', o: id, missing: false };
  const o = vw && vw[want];
  if (o && (typeof sceneObj !== 'function' || sceneObj(o))) return { view: want, o, missing: false, v: Number.isInteger(vw.v) ? vw.v : null };
  return { view: 'side', o: id, missing: true, want };
}
/** Does an object walk (a 'walk' hook), so it can travel a pavement without sliding? */
function _scflWalks(id) {
  if (typeof sceneObjShapes !== 'function') return true;
  const sh = sceneObjShapes(id, 0, 'summer');
  return !!(sh && (sh.anim || []).some(a => a.kind === 'walk'));
}
const _SCFL_NOT_WALKERS = ['cyclist', 'bike', 'climbing', 'sitting', 'idle', 'umbrella'];   // umbrellas: only in the rain (rainObj)
/**
 * The objects of a mix: 'kit' (the walking people of the scene's kits: role walker with a walk hook; cyclists for a cycle flow),
 * an id, a list, or { id: weight }. Unknown ids are dropped (the compile reports an empty mix).
 */
function _scflMix(mix, kind, data) {
  let m = mix == null ? _SCFL_DEF[kind].mix : mix;
  if (m === 'kit') {
    const kits = (data && (data.kits || (data.meta && data.meta.kits))) || ['people'];
    let pick = typeof sceneKitPick === 'function' ? sceneKitPick(kits, 'walker', {}) : {};
    for (const id of Object.keys(pick)) {
      const t = (typeof sceneObj === 'function' && sceneObj(id) && sceneObj(id).tags) || [];
      const cyc = t.includes('cyclist');
      if (kind === 'cycle' ? !cyc : (t.some(x => _SCFL_NOT_WALKERS.includes(x)) || !_scflWalks(id))) delete pick[id];
    }
    if (!Object.keys(pick).length) pick = kind === 'cycle' ? { 'person.cyclist': 1 } : { 'person.walker': 1 };
    m = pick;
  }
  if (typeof m === 'string') m = { [m]: 1 };
  if (Array.isArray(m)) m = Object.fromEntries(m.map(id => [id, 1]));
  const out = {};
  for (const id of Object.keys(m || {}).sort()) if (m[id] > 0 && (typeof sceneObj !== 'function' || sceneObj(id))) out[id] = m[id];
  return out;
}
/**
 * A flow's object palette: n (object, variant) pairs [o, v, w] (and up to 4 more, one for each object the draw left out), picked by a weighted rendezvous hash of the flow's seed
 * (a function of the mix and the seed only). It bounds the sprites a flow needs (the 120-sprite pool) while every agent still
 * differs from its neighbours.
 */
function _scflPairs(mix, seed, n) {
  const all = [];
  for (const id of Object.keys(mix)) {
    const def = typeof sceneObj === 'function' ? sceneObj(id) : null, nv = Math.max(1, (def && def.variants) || 1);
    for (let v = 0; v < nv; v++) all.push([id, v, mix[id] / nv]);
  }
  const key = (p) => Math.log((sceneHash(seed + '|pair|' + p[0] + '|' + p[1]) % 1000003 + 0.5) / 1000003.5) / p[2];
  const ranked = all.map(p => [p, key(p)]).sort((a, b) => b[1] - a[1] || (a[0][0] < b[0][0] ? -1 : 1)).slice(0, Math.max(1, n));
  // the objects the draw left out get one pair each, heaviest first, up to n + 4 pairs (a rare object stays possible)
  const out = ranked.map(x => x[0]);
  const rest = Object.keys(mix).filter(id => !out.some(p => p[0] === id)).sort((a, b) => mix[b] - mix[a] || (a < b ? -1 : 1));
  for (const id of rest) { if (out.length >= n + 4) break; const best = all.filter(p => p[0] === id).map(p => [p, key(p)]).sort((a, b) => b[1] - a[1])[0]; if (best) out.push(best[0]); }
  const per = {};
  for (const p of out) per[p[0]] = (per[p[0]] || 0) + 1;
  return out.map(p => [p[0], p[1], _scflR(mix[p[0]] / per[p[0]])]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
}
/** The library's walker with an umbrella (tag 'umbrella', a walk hook), worn by most walkers in the rain; null when there is none. */
function _scflRainWalker() {
  if (typeof sceneObjs !== 'function') return null;
  const hit = sceneObjs().filter(d => (d.tags || []).includes('umbrella') && (d.tags || []).includes('role:walker') && _scflWalks(d.id)).map(d => d.id).sort();
  return hit[0] || null;
}

/* ---------- the camera (A's sceneCamera / sceneProject when loaded, else the formulas of V2 2.2) ---------- */
function _scflCam(data, C) {
  if (C && C.cam && C.cam.f) return C.cam;
  if (typeof sceneCamera === 'function') { try { const c = sceneCamera(data); if (c && c.f) return c; } catch (e) { /* fall through */ } }
  const c = (data && data.camera) || {}, fov = c.fov || 66, horizon = c.horizon != null ? c.horizon : 470, eye = c.eye || 1.65;
  const f = 800 / Math.tan(fov * Math.PI / 360);
  return { eye, fov, horizon, heading: c.heading || 180, x0: c.x0 != null ? c.x0 : 800, f, dMin: f * eye / Math.max(1, 900 - horizon), dMax: 20000, water: c.water != null ? c.water : 0,
    bands: [{ id: 'horizon', i: 0, d0: 800, d1: Infinity }, { id: 'far', i: 1, d0: 200, d1: 800 }, { id: 'mid', i: 2, d0: 50, d1: 200 }, { id: 'near', i: 3, d0: 15, d1: 50 }, { id: 'fore', i: 4, d0: 0, d1: 15 }], relief: null };
}
/** The layer index of a depth: A's sceneDepthBand, else the camera's bands. */
function _scflBand(cam, d) {
  if (typeof sceneDepthBand === 'function') { try { const b = sceneDepthBand(cam, d); if (Number.isFinite(b)) return b; } catch (e) { /* fall through */ } }
  const bands = cam.bands || [];
  for (const b of bands) if (b.d0 != null && d >= b.d0 && (b.d1 == null || d < b.d1)) return b.i;
  return bands.length ? bands[bands.length - 1].i : 0;
}

/* ---------- geometry in ground metres ---------- */
/** Catmull-Rom through the points (uniform), about one point every 3 m (at most 24 per span): the same smoothing as the strips. */
function _scflSmooth(pts) {
  if (!pts || pts.length < 3) return (pts || []).map(p => [p[0], p[1]]);
  const out = [], P = (i) => pts[_scflClamp(i, 0, pts.length - 1)];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), n = _scflClamp(Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 3), 1, 24);
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
  return out;
}
/** The polyline offset by `off` metres to the LEFT of its direction (negative: to the right). */
function _scflOffset(pts, off) {
  if (!off) return pts.map(p => p.slice());
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b[0] - a[0], td = b[1] - a[1], l = Math.hypot(tx, td) || 1;
    return [p[0] - td / l * off, p[1] + tx / l * off];   // the left normal of (tx, td) is (-td, tx)
  });
}
function _scflLen(pts) { let n = 0; for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return n; }
const _scflCum = new WeakMap();
/** The point and unit tangent at distance s along a polyline (cumulative lengths cached per path). */
function _scflAlong(pts, s) {
  let cum = _scflCum.get(pts);
  if (!cum) { cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); _scflCum.set(pts, cum); }
  const L = cum[cum.length - 1];
  s = _scflClamp(s, 0, L);
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const a = pts[lo], b = pts[hi], seg = (cum[hi] - cum[lo]) || 1, u = (s - cum[lo]) / seg, tx = (b[0] - a[0]) / seg, td = (b[1] - a[1]) / seg;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, tx, td];
}
function _scflInPoly(x, d, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > d) !== (yj > d) && x < (xj - xi) * (d - yi) / (yj - yi) + xi) c = !c; } return c; }
/** The horizontal slices [x0, x1] of a polygon at depth d (even-odd). */
function _scflSpans(poly, d) {
  const xs = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > d) !== (yj > d)) xs.push(xi + (d - yi) * (xj - xi) / (yj - yi)); }
  xs.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}
/**
 * The visible runs of a lane (ground metres): resampled every ~2 m, kept where dLo <= d <= dHi and the column is inside the frame
 * (with a margin, so agents enter from off-screen); runs shorter than 4 m are dropped. Each run: { path, fade0, fade1 } where
 * fade0 / fade1 say the run starts / ends INSIDE the frame (the agents fade in or out there, over 1 s).
 */
function _scflClip(cam, pts, dLo, dHi) {
  const dense = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
    for (let j = 0; j < n; j++) dense.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
  }
  if (pts.length) dense.push(pts[pts.length - 1].slice());
  const t = Math.tan(cam.fov * Math.PI / 360), ok = (p) => p[1] >= dLo && p[1] <= dHi && Math.abs(p[0] - (800 - cam.x0) * p[1] / cam.f) <= p[1] * t * 1.25 + 3;
  const offFrame = (p) => { const X = cam.x0 + cam.f * p[0] / Math.max(0.05, p[1]), Y = cam.horizon + cam.f * cam.eye / Math.max(0.05, p[1]); return X < -60 || X > 1660 || Y > 920; };
  const runs = [];
  let cur = null;
  for (const p of dense) {
    if (ok(p)) { if (!cur) cur = []; cur.push(p); }
    else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs.filter(r => r.length > 1 && _scflLen(r) >= 4).map(r => {
    const keep = [r[0]];
    for (let i = 1; i < r.length - 1; i++) { const a = keep[keep.length - 1], b = r[i], c = r[i + 1], cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (Math.abs(cross) > 0.02 || Math.hypot(b[0] - a[0], b[1] - a[1]) > 40) keep.push(b); }
    keep.push(r[r.length - 1]);
    return { path: keep.map(p => [_scflR(p[0]), _scflR(p[1])]), fade0: !offFrame(r[0]), fade1: !offFrame(r[r.length - 1]) };
  });
}

/* ---------- surfaces: the centreline and width of a strip, the polygon of anything else ---------- */
/** { id -> { kind, path (smoothed centreline), width, poly, band, src } } from the scene data (and A's C.surfaces). */
function _scflSurfaces(data, C) {
  const out = new Map();
  for (const s of (data && data.surfaces) || []) if (s && s.id) out.set(s.id, { src: s, kind: s.kind, width: s.width || 0 });
  for (const w of (data && data.water) || []) if (w && w.id) out.set(w.id, { src: w, kind: w.kind || 'lake', water: true, width: w.width || 0 });
  const centre = (id, seen) => {
    const e = out.get(id);
    if (!e || e.path !== undefined) return e;
    e.path = null;
    if (seen.has(id)) return e;
    seen.add(id);
    const s = e.src;
    if (Array.isArray(s.path) && s.path.length >= 2) e.path = _scflSmooth(s.path);
    else if (s.beside && out.has(s.beside)) {
      const p = centre(s.beside, seen);
      if (p && p.path) {
        const side = s.side === 'right' ? -1 : 1, off = (p.width || 0) / 2 + (s.gap || 0) + (e.width || 0) / 2;
        e.path = _scflOffset(p.path, side * off);
      }
    }
    return e;
  };
  for (const id of [...out.keys()]) centre(id, new Set());
  // a canal's banks are surfaces too (5.1): strips beside the channel, named <water id>-<side> (and their kind, e.g. 'towpath')
  for (const w of (data && data.water) || []) {
    const e = w && w.id && out.get(w.id);
    if (!e || !e.path || !w.banks) continue;
    for (const side of ['left', 'right']) {
      const b = w.banks[side];
      if (!b || !(b.width > 0)) continue;
      const id = w.id + '-' + side, sg = side === 'right' ? -1 : 1;
      if (!out.has(id)) out.set(id, { src: { id, kind: b.surface || 'towpath' }, kind: b.surface || 'towpath', width: b.width, path: _scflOffset(e.path, sg * ((e.width || 0) / 2 + b.width / 2)) });
    }
  }
  // A's compiled surfaces that the data does not name (bank surfaces under another id): their polygons
  for (const cs of (C && Array.isArray(C.surfaces) ? C.surfaces : [])) if (cs && cs.id && !out.has(cs.id)) out.set(cs.id, { src: { id: cs.id, kind: cs.kind }, kind: cs.kind, width: 0, path: null });
  // polygons: the compiled surface's polygon when A compiled it, else the declared one (or a band across the view)
  for (const [id, e] of out) {
    if (e.path) continue;
    const cs = C && Array.isArray(C.surfaces) ? C.surfaces.find(s => s.id === id) : null;
    if (cs && Array.isArray(cs.polyM) && cs.polyM.length >= 3) e.poly = cs.polyM;
    else if (Array.isArray(e.src.poly) && e.src.poly.length >= 3) e.poly = e.src.poly;
    else if (Array.isArray(e.src.band)) e.band = e.src.band;
  }
  return out;
}

/* ---------- the drive side ---------- */
/** 'left' or 'right': the scene's own `drive`, else from where the camera stands (SCENE_DRIVE_LEFT_BOXES), else left (the UK). */
function sceneDriveSide(data) {
  if (data && (data.drive === 'left' || data.drive === 'right')) return data.drive;
  const c = (data && data.camera) || {}, v = (data && data.view) || {}, lat = Number.isFinite(c.lat) ? c.lat : v.lat, lon = Number.isFinite(c.lon) ? c.lon : v.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'left';
  return SCENE_DRIVE_LEFT_BOXES.some(b => lat >= b[0] && lat <= b[2] && lon >= b[1] && lon <= b[3]) ? 'left' : 'right';
}

/* ---------- compile (pure; memoised with the scene by A's sceneCompile) ---------- */
/** The busiest a profile gets (the multiplier the base schedule is drawn at). */
function _scflPeak(profile) {
  const P = SCENE_FLOW_PROFILES[profile] || SCENE_FLOW_PROFILES.town, sea = P.season ? Math.max(...Object.values(P.season)) : 1;
  return Math.max(...P.wd, ...P.we) * sea;
}
/**
 * The compiled flows (V2 9, 12): [{ id, kind, cls, lanes: [{ path, dir, len, speedRange, fade0, fade1, kerb? }], density, profile,
 * peak, thin, mix, pairs: [[o, v, w]], rainObj, max, bus?, timetable?, dMax, seed, water, level, draws }]. Lanes come from the
 * surfaces: strips (path / beside / canal banks) give lanes along the centreline (roads floor(width / 3.2) lanes, keep-left or
 * keep-right; pavements and paths 2 or 3 walking sub-lanes; water channels a lane each way, boats keep RIGHT as on every
 * waterway), polygons and bands seeded wander lines; explicit `lanes` too. Everything is clipped to the view: walkers no nearer
 * than the care cap (150 units tall), vehicles than 520 units. `thin` keeps the expected crowd under `max` (the hard cap then
 * rarely bites, so nobody pops). Problems ({ rule, sev, i, msg, fix }) go to C.problems when it is a list; the budget: at most 60
 * agents, and the animated draws within 300 (opt.otherDraws: the v1 sum; sceneFlowBudget).
 */
function sceneFlowCompile(data, C, opt) {
  opt = opt || {};
  const list = (data && Array.isArray(data.flows)) ? data.flows : [];
  if (!list.length) return [];
  const cam = _scflCam(data, C), problems = C && Array.isArray(C.problems) ? C.problems : (opt.problems || []);
  const drive = sceneDriveSide(data), lod = opt.lod != null ? opt.lod : (C && C.lod != null ? C.lod : 1);
  const surf = _scflSurfaces(data, C);
  const prob = (fi, rule, sev, msg, fix) => problems.push({ rule, sev, i: fi, obj: null, at: null, msg, fix, flow: true });
  const flows = [];
  list.forEach((F, fi) => {
    if (!F || !SCENE_FLOW_KINDS.includes(F.kind)) { prob(fi, 'flow', 'error', `flows[${fi}]: unknown kind ${F && F.kind} (${SCENE_FLOW_KINDS.join(' ')})`, 'set kind'); return; }
    const K = _SCFL_DEF[F.kind], id = String(F.id || F.kind + '-' + fi), seed = sceneHash(((data && data.id) || 'scene') + '|flow|' + id + '|' + (F.seed | 0));
    const mix = _scflMix(F.obj ? F.obj : F.mix, F.kind, data);
    if (!Object.keys(mix).length) { prob(fi, 'flow', 'warn', `flows[${fi}] ${id}: no object in its mix exists in the library`, 'mix: { "<object id>": weight }'); return; }
    const speed = Array.isArray(F.speed) && F.speed.length === 2 && F.speed.every(v => v > 0) ? F.speed.map(Number) : K.speed;
    const ons = [].concat(F.on || []), dMax = Math.min(F.dMax || 400, cam.dMax || 20000);
    const water = F.kind === 'boat';
    const hMax = Math.max(...Object.keys(mix).map(o => _scflReal(o).h), F.bus && F.bus.obj ? _scflReal(F.bus.obj).h : 0);
    const dLo = Math.max(cam.dMin * (water ? 0.8 : 0.85), cam.f * hMax / _SCFL_NEAR_UNITS[F.kind]);
    const r = sceneRnd(seed), lanes = [];
    const addLane = (pts, dir, extra) => {
      for (const run of _scflClip(cam, pts, dLo, dMax)) lanes.push(Object.assign({ path: run.path, dir, len: _scflR1(_scflLen(run.path)), speedRange: speed, fade0: run.fade0, fade1: run.fade1 }, extra || {}));
    };
    if (Array.isArray(F.lanes)) for (const ln of F.lanes) { if (ln && Array.isArray(ln.path) && ln.path.length >= 2) addLane(_scflSmooth(ln.path), ln.dir === -1 ? -1 : 1, ln.kerb ? { kerb: true } : null); }
    for (const sid of ons) {
      const e = surf.get(sid);
      if (!e) { prob(fi, 'flow', 'error', `flows[${fi}] ${id}: no surface or water "${sid}"`, `on: one of ${[...surf.keys()].slice(0, 8).join(', ') || '(no surfaces declared)'}`); continue; }
      if (water && !e.water) prob(fi, 'flowSurface', 'warn', `flows[${fi}] ${id}: boats on "${sid}", which is not water (${e.kind})`, 'on: a water id');
      if (!water && e.water) prob(fi, 'flowSurface', 'warn', `flows[${fi}] ${id}: a ${F.kind} flow on water "${sid}"`, 'on: a surface id (a road, a pavement, a towpath)');
      const w = e.width || 0;
      if (e.path) {
        if (F.kind === 'drive' || F.kind === 'tram' || F.kind === 'train') {
          const tracks = F.kind === 'drive' ? Math.max(1, Math.floor(w / 3.2)) : Math.max(1, e.src.tracks || (w >= 5 ? 2 : 1)), lw = w / tracks;
          const both = F.both !== false && tracks > 1;
          for (let j = 0; j < tracks; j++) {
            const off = w / 2 - lw * (j + 0.5);              // j = 0 the leftmost lane (of the path's direction)
            const left = off > 1e-6, mid = Math.abs(off) <= 1e-6;
            let dir = 1;
            if (both) dir = mid ? (j % 2 ? -1 : 1) : (left === (drive === 'left') ? 1 : -1);
            addLane(_scflOffset(e.path, off), dir, { kerb: j === 0 || j === tracks - 1 });
          }
        } else if (water) {
          // a channel: one lane each way a quarter of the width in from each bank; boats keep to the RIGHT
          if (w >= 6 && F.both !== false) { addLane(_scflOffset(e.path, w / 4), -1); addLane(_scflOffset(e.path, -w / 4), 1); }
          else addLane(e.path, 1);
        } else {
          // pavements, paths, towpaths: 2 sub-lanes (3 from 4 m wide), both ways for walkers
          const n = w >= 4 ? 3 : w >= 1.6 ? 2 : 1, both = F.both != null ? !!F.both : K.both;
          for (let j = 0; j < n; j++) {
            const off = n === 1 ? 0 : (w * 0.28) * (1 - 2 * j / (n - 1));   // the sub-lanes keep 20 % of the width clear of each edge (the kerb)
            addLane(_scflOffset(e.path, off), both ? (j % 2 ? -1 : 1) : 1, { w: _scflR(w / n) });
          }
        }
      } else if (e.poly || e.band) {
        // wander lines: seeded chords across the polygon (or the band) at a few depths, some running into the distance
        const poly = e.poly || [[-2000, e.band[0]], [2000, e.band[0]], [2000, Math.min(e.band[1], dMax)], [-2000, Math.min(e.band[1], dMax)]];
        const inset = water ? 3 : 0.6, ds = poly.map(p => p[1]), d0 = Math.max(Math.min(...ds), dLo), d1 = Math.min(Math.max(...ds), dMax);
        if (!(d1 > d0)) continue;
        const nl = _scflClamp(Math.round(2 + Math.log2(1 + (d1 - d0) / 20)), 2, 6);
        for (let j = 0; j < nl; j++) {
          const d = d0 + (d1 - d0) * Math.pow((j + 0.3 + r() * 0.4) / nl, 1.6), spans = _scflSpans(poly, d).filter(sp => sp[1] - sp[0] > 2 * inset + 3);
          if (!spans.length) continue;
          const sp = spans[Math.floor(r() * spans.length)], dd = (r() - 0.5) * Math.min(12, (d1 - d0) * 0.2);
          const a = [sp[0] + inset, d], b = [sp[1] - inset, _scflClamp(d + dd, d0, d1)];
          const pts = [a, [(a[0] + b[0]) / 2 + (r() - 0.5) * 3, (a[1] + b[1]) / 2 + (r() - 0.5) * 2], b].filter(p => !water || _scflInPoly(p[0], p[1], poly));
          if (pts.length >= 2) addLane(pts, r() < 0.5 ? 1 : -1);
        }
      } else prob(fi, 'flow', 'warn', `flows[${fi}] ${id}: surface "${sid}" has no shape (path, beside, poly or band)`, 'give it a shape');
    }
    if (!lanes.length) { prob(fi, 'flowEmpty', 'warn', `flows[${fi}] ${id}: no lane of it is in view`, 'check on (the surfaces) and dMax'); return; }
    const profile = SCENE_FLOW_PROFILES[F.profile] ? F.profile : K.profile;
    const out = { id, kind: F.kind, cls: K.cls, lanes, density: F.density != null ? Math.max(0, +F.density) : 1, profile, peak: _scflR(_scflPeak(profile)), thin: 1,
      mix, pairs: _scflPairs(mix, seed, F.pairs || (F.kind === 'walk' ? 10 : 6)), rainObj: F.kind === 'walk' && (F.mix == null || F.mix === 'kit') ? _scflRainWalker() : null,
      max: Math.max(0, Math.round((F.max != null ? F.max : 12) * lod)), dMax, seed, water, level: water ? (cam.water || 0) : 0, draws: _SCFL_DRAWS[F.kind] };
    if (F.kind === 'drive' && F.bus && F.bus.obj && (typeof sceneObj !== 'function' || sceneObj(F.bus.obj))) out.bus = { obj: F.bus.obj, every: Math.max(1, +F.bus.every || 8), stops: (F.bus.stops || []).map(s => ({ along: _scflClamp(+s.along || 0, 0, 1), dwell: Math.max(0, s.dwell != null ? +s.dwell : 15) })) };
    else if (F.bus && F.bus.obj) prob(fi, 'flow', 'warn', `flows[${fi}] ${id}: no bus object ${F.bus.obj}`, 'bus.obj: a library vehicle');
    if ((F.kind === 'tram' || F.kind === 'train') || F.timetable) {
      const tt = F.timetable || {};
      out.timetable = { every: Math.max(1, +tt.every || (F.kind === 'train' ? 10 : 6)), dwell: Math.max(0, tt.dwell != null ? +tt.dwell : 20), stops: (tt.stops || []).map(s => ({ along: _scflClamp(+s.along || 0, 0, 1), dwell: s.dwell != null ? Math.max(0, +s.dwell) : null })) };
    }
    // the expected crowd at the peak (agents per 100 m of lane): thin it so it stays under 85 % of max, then the hard cap rarely bites
    const expected = out.timetable ? 0 : lanes.reduce((n, ln) => n + out.density * out.peak * ln.len / 100, 0);
    if (expected > 0 && out.max > 0 && expected > out.max * 0.85) out.thin = _scflR(Math.max(0.02, out.max * 0.85 / expected));
    flows.push(out);
  });
  const other = opt.otherDraws != null ? opt.otherDraws : (C && C.stats && Number.isFinite(C.stats.animatedDraws) ? C.stats.animatedDraws : 0);
  sceneFlowBudget(flows, other, problems);
  return flows;
}
/**
 * The budget (9.4): at most 60 agents across the flows, and the scene's animated draws (otherDraws, the v1 sum) plus the flows'
 * draws within 300. Every max is scaled down in proportion (in place) and a `flowBudget` info is recorded. Returns the factor.
 */
function sceneFlowBudget(flows, otherDraws, problems) {
  flows = flows || [];
  const sumMax = flows.reduce((n, f) => n + f.max, 0), draws = flows.reduce((n, f) => n + f.max * f.draws, 0), other = otherDraws || 0;
  let k = 1;
  if (sumMax > SCENE_FLOW_MAX_AGENTS) k = Math.min(k, SCENE_FLOW_MAX_AGENTS / sumMax);
  if (draws > 0 && other + draws > SCENE_FLOW_DRAW_BUDGET) k = Math.min(k, Math.max(0, SCENE_FLOW_DRAW_BUDGET - other) / draws);
  if (k < 1) {
    for (const f of flows) { f.max = Math.floor(f.max * k); if (f.thin != null) f.thin = _scflR(Math.max(0.02, f.thin * k)); }
    if (Array.isArray(problems)) problems.push({ rule: 'flowBudget', sev: 'info', i: -1, obj: null, at: null, msg: `flows: max scaled by ${_scflR(k)} (${sumMax} agents, ${draws} draws with ${other} other animated draws; budget ${SCENE_FLOW_MAX_AGENTS} agents, ${SCENE_FLOW_DRAW_BUDGET} draws)`, fix: 'lower the flows\' max', flow: true });
  }
  return _scflR(k);
}
/** { flows, flowMax, flowDraws } of compiled flows (flowDraws: max x draws per agent, the estimate the 300 budget counts). */
function sceneFlowStats(flows) {
  flows = flows || [];
  return { flows: flows.length, flowMax: flows.reduce((n, f) => n + (f.max || 0), 0), flowDraws: flows.reduce((n, f) => n + (f.max || 0) * (f.draws || 3), 0) };
}

/* ---------- time: the hour, the weekday, the weather and the season ---------- */
const _SCFL_AT_HOUR = { dawn: 6.5, morning: 9, day: 12, noon: 13, afternoon: 15.5, golden: 18.5, sunset: 19.5, dusk: 20.5, night: 23 };
/** { hour (0..24, local solar), weekday (0 Sunday .. 6 Saturday) }: L.localHour / L.weekday (C's sceneLightV2), else from L.ms and the longitude, else the authored moment. */
function sceneFlowHour(L, data) {
  if (L && Number.isFinite(L.localHour)) return { hour: ((L.localHour % 24) + 24) % 24, weekday: Number.isFinite(L.weekday) ? L.weekday : 3 };
  const lon = L && Number.isFinite(L.lon) ? L.lon : (data && data.view && Number.isFinite(data.view.lon) ? data.view.lon : 0);
  if (L && Number.isFinite(L.ms)) {
    const local = L.ms + lon / 15 * 3600000, day = Math.floor(local / 86400000);
    return { hour: ((local / 3600000) % 24 + 24) % 24, weekday: ((day + 4) % 7 + 7) % 7 };
  }
  return { hour: _SCFL_AT_HOUR[(data && data.at) || 'afternoon'] || 15, weekday: 3 };
}
/** A profile's multiplier at an hour (linear between hours) on a weekday (0 Sunday .. 6 Saturday). */
function sceneFlowProfile(name, hour, weekday) {
  const P = SCENE_FLOW_PROFILES[name] || SCENE_FLOW_PROFILES.town, we = weekday === 0 || weekday === 6, tab = we ? P.we : P.wd;
  const h = ((hour % 24) + 24) % 24, i = Math.floor(h), u = h - i, v = tab[i] + (tab[(i + 1) % 24] - tab[i]) * u;
  return v * (we && weekday === 0 && P.sun ? P.sun : 1);
}
/** The weather now: { rain, snow } from C's resolved weather (L.wx), else the v1 flags. */
function _scflWeather(L) {
  if (L && L.wx && typeof L.wx === 'object') return { rain: (L.wx.rain || 0) > 0.3 || ['rain', 'showers', 'thunder', 'drizzle'].includes(L.wx.kind), snow: (L.wx.snow || 0) > 0.3 || L.wx.kind === 'snow' || L.wx.kind === 'sleet' };
  return { rain: !!(L && L.rain), snow: !!(L && L.snow) };
}
/** The density multiplier of a flow now (profile by hour and weekday, the weather, the season, daylight), bucketed to 0.05. */
function sceneFlowMult(flow, L, data, season) {
  const { hour, weekday } = sceneFlowHour(L, data), P = SCENE_FLOW_PROFILES[flow.profile] || SCENE_FLOW_PROFILES.town;
  let m = sceneFlowProfile(flow.profile, hour, weekday);
  const wx = _scflWeather(L);
  if (wx.snow) m *= (_SCFL_WX.snow[flow.kind] != null ? _SCFL_WX.snow[flow.kind] : 1);
  else if (wx.rain) m *= (_SCFL_WX.rain[flow.kind] != null ? _SCFL_WX.rain[flow.kind] : 1);
  if (P.season && season) m *= P.season[season] != null ? P.season[season] : 1;
  if ((P.daylight || P.dusk) && L && Number.isFinite(L.alt)) m *= _scflClamp((L.alt + (P.daylight ? 2 : 4)) / 6, 0, 1);
  return Math.round(m * 20) / 20;
}
/** The density multipliers of every flow under L (relight: the spawn lists change, nothing is re-baked). */
function sceneFlowMults(C, L, data) {
  return ((C && C.flows) || []).map(f => sceneFlowMult(f, L, data, C.season));
}

/* ---------- the schedule (9.3): a spawn list per lane for one period, pure and cached ---------- */
const _scflBaseMemo = new WeakMap(), _scflSched = new WeakMap();
/**
 * The BASE spawn list of one lane at the profile's peak (the flow's `peak` multiplier, times its `thin`): [{ t0, v (speed), o,
 * var, len, stop, key, keep, bus }] sorted by t0. Spawn times are stratified and seeded (never a grid); the minimum headway
 * (vehicles 6 m beyond their half lengths, people 0.8 m) holds and nobody overtakes within a lane (a follower is slowed so it
 * cannot reach the one ahead before that one leaves); the period wraps without a clash. Buses (flow.bus) and timetabled trams and
 * trains run on their own lists. Each agent's `keep` (seeded, 0..1) decides at which multiplier it runs.
 */
function _scflBase(flow, li) {
  let byFlow = _scflBaseMemo.get(flow);
  if (!byFlow) { byFlow = new Map(); _scflBaseMemo.set(flow, byFlow); }
  if (byFlow.has(li)) return byFlow.get(li);
  const ln = flow.lanes[li], P = SCENE_FLOW_PERIOD, r = sceneRnd(sceneHash(flow.seed + '|lane|' + li)), K = _SCFL_DEF[flow.kind];
  const pairs = flow.pairs && flow.pairs.length ? flow.pairs : Object.keys(flow.mix).map(o => [o, 0, flow.mix[o]]), tot = pairs.reduce((n, p) => n + p[2], 0);
  const pick = () => { let x = r() * tot; for (const p of pairs) { if ((x -= p[2]) <= 0) return p; } return pairs[pairs.length - 1]; };
  const sp = ln.speedRange || K.speed, out = [];
  const mk = (t0, p, extra) => {
    const real = _scflReal(p[0]), v = sp[0] + r() * (sp[1] - sp[0]);
    return Object.assign({ t0, v, o: p[0], var: p[1], len: real.l || 1, stop: null, key: 0, keep: r(), bus: false }, extra || {});
  };
  if (flow.timetable) {
    // one vehicle every `every` minutes per lane (each direction), a seeded offset; it dwells at the first stop
    const every = flow.timetable.every * 60, off = r() * Math.min(every, P);
    for (let t = off; t < P; t += every) out.push(mk(t, pick(), { v: (sp[0] + sp[1]) / 2 }));
    const stops = flow.timetable.stops.map(s => ({ s: (ln.dir === 1 ? s.along : 1 - s.along) * ln.len, w: s.dwell != null ? s.dwell : flow.timetable.dwell }));
    for (const a of out) if (stops.length) a.stop = stops[0];
  } else if (flow.density > 0) {
    const vMean = (sp[0] + sp[1]) / 2, perLane = flow.density * (flow.peak || 1) * (flow.thin || 1) * ln.len / 100, T = ln.len / vMean;
    const n = Math.min(400, Math.round(perLane * P / Math.max(1, T)));   // agents per period so that perLane are on it on average
    for (let i = 0; i < n; i++) out.push(mk(((i + 0.15 + r() * 0.7) / n) * P, pick()));
  }
  // the bus: on the kerb lanes only, every `every` minutes, its own list (it dwells at its stops; cars pass it)
  if (flow.bus && ln.kerb) {
    const every = flow.bus.every * 60, off = r() * Math.min(every, P), def = typeof sceneObj === 'function' ? sceneObj(flow.bus.obj) : null;
    const stops = flow.bus.stops.map(s => ({ s: (ln.dir === 1 ? s.along : 1 - s.along) * ln.len, w: s.dwell }));
    for (let t = off; t < P; t += every) out.push(mk(t, [flow.bus.obj, Math.floor(r() * ((def && def.variants) || 1)), 1], { v: Math.min(sp[1], 8), bus: true, stop: stops[0] || null }));
  }
  out.sort((a, b) => a.t0 - b.t0);
  // headway and no overtaking, per stream (buses separately from the rest)
  const gapOf = (a, b) => (flow.kind === 'walk' || flow.kind === 'graze' ? K.gap : K.gap + (a.len + b.len) / 2);
  for (const bus of [false, true]) {
    const st = out.filter(a => !!a.bus === bus);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < st.length; i++) {
        const a = st[i], prev = i ? st[i - 1] : (st.length > 1 ? Object.assign({}, st[st.length - 1], { t0: st[st.length - 1].t0 - P }) : null);
        if (!prev || prev === a) continue;
        const g = gapOf(prev, a), dw = (x) => (x.stop ? x.stop.w : 0);
        // the follower may not start before the leader is g metres along
        const tMin = prev.t0 + g / prev.v + (prev.stop && prev.stop.s < g ? prev.stop.w : 0);
        if (a.t0 < tMin) a.t0 = tMin;
        // nor reach it: by the time the leader leaves the lane the follower is at most len - g along (stops count as delay)
        const exitPrev = prev.t0 + ln.len / prev.v + dw(prev), room = exitPrev - a.t0 - dw(a);
        if (room > 0) a.v = Math.min(a.v, Math.max(0.2, (ln.len - g) / room));
        if (prev.stop && !a.stop) a.v = Math.min(a.v, prev.v);   // never overtake one that dwells (a tram, a bus behind a bus)
      }
    }
    // the wrap: an agent pushed past the period is dropped (the first of the next period stands in for it)
    for (let i = st.length - 1; i >= 0; i--) if (st[i].t0 >= P) { out.splice(out.indexOf(st[i]), 1); st.splice(i, 1); }
    if (st.length > 1) { const first = st[0], last = st[st.length - 1]; if (first.t0 + P < last.t0 + gapOf(last, first) / last.v) { out.splice(out.indexOf(first), 1); } }
  }
  out.sort((a, b) => a.t0 - b.t0);
  out.forEach((a, i) => { a.dur = ln.len / a.v + (a.stop ? a.stop.w : 0); a.key = i; a.t0 = Math.round(a.t0 * 1000) / 1000; a.v = Math.round(a.v * 10000) / 10000; a.keep = Math.round(a.keep * 10000) / 10000; });
  byFlow.set(li, out);
  return out;
}
/**
 * The spawn list of one lane at a density multiplier: the base list (at the peak) THINNED to the agents whose keep value is under
 * mult / peak (timetables: the service level). Adding or removing agents never moves the others, so the hourly relight, the rain
 * and the season change the crowd without reshuffling it. { list, durMax }, cached per (lane, multiplier).
 */
function sceneFlowSchedule(flow, li, mult) {
  let byFlow = _scflSched.get(flow);
  if (!byFlow) { byFlow = new Map(); _scflSched.set(flow, byFlow); }
  const key = li + '|' + mult;
  if (byFlow.has(key)) return byFlow.get(key);
  const base = _scflBase(flow, li), m = Math.max(0, mult || 0);
  const share = flow.timetable ? m : m / Math.max(0.01, flow.peak || 1);
  const list = share <= 0 ? [] : base.filter(a => (a.bus ? Math.min(1, m) : share) > a.keep);
  const res = { list, durMax: list.reduce((x, a) => Math.max(x, a.dur), 0) };
  byFlow.set(key, res);
  return res;
}
/** Distance along the lane at time u after the spawn (a stop adds a dwell). */
function _scflS(a, u) {
  if (!a.stop || a.stop.s <= 0) return a.v * u;
  const ts = a.stop.s / a.v;
  return u < ts ? a.v * u : u < ts + a.stop.w ? a.stop.s : a.stop.s + a.v * (u - ts - a.stop.w);
}

/* ---------- agents at a time (pure functions of t) ---------- */
/** One agent of a lane at absolute schedule time tau (seconds into the periodic schedule), or null when it is not on the lane. */
function _scflPlace(cam, flow, fi, li, a, tau0, tau, ctx) {
  const ln = flow.lanes[li], u = tau - tau0;
  if (u < 0 || u > a.dur) return null;
  const s0 = _scflS(a, u), s = ln.dir === 1 ? s0 : ln.len - s0;
  if (s0 > ln.len + 1e-6) return null;
  const p = _scflAlong(ln.path, s), tx = p[2] * ln.dir, td = p[3] * ln.dir;
  const ak = flow.seed + '|' + li + '|' + a.key;
  // walkers keep to a sub-lane jitter (seeded per agent)
  let x = p[0], d = p[1];
  if (flow.kind === 'walk' || flow.kind === 'graze') { const j = (_scflU(ak + '|j') - 0.5) * Math.min(0.5, (ln.w || 1.2) * 0.3); x += -td * j; d += tx * j; }
  if (d < 0.5) return null;
  const h = flow.water ? flow.level : 0, k3 = cam.f / d, X = cam.x0 + k3 * x, Y = cam.horizon + k3 * (cam.eye - h);
  // in the rain most walkers carry an umbrella (the library's umbrella walker, when there is one)
  let base = a.o, vv = a.var;
  if (ctx.rain && flow.rainObj && !a.bus && _scflU(ak + '|umb') < 0.6) { base = flow.rainObj; const dd = typeof sceneObj === 'function' ? sceneObj(base) : null; vv = Math.floor(_scflU(ak + '|uv') * ((dd && dd.variants) || 1)); }
  // the view (4.3): the angle between the direction of travel and the sightline; the screen direction sets the flip
  const d2 = Math.max(0.5, d + td * 2), X2 = cam.x0 + cam.f * (x + tx * 2) / d2;
  const rl = Math.hypot(x, d) || 1, dot = (tx * x + td * d) / rl, across = Math.acos(_scflClamp(Math.abs(dot), 0, 1)) * 180 / Math.PI;
  const vw = sceneFlowViewOf(base, across, dot < 0);
  if (vw.v != null) vv = vw.v;
  const real = _scflReal(vw.o), def = typeof sceneObj === 'function' ? sceneObj(vw.o) : null, sz = def && def.size ? def.size[1] : 100;
  let kk = 1;
  if (flow.cls === 'person' || flow.cls === 'cyclist') kk = 0.94 + _scflU(ak + '|k') * 0.12;
  const sc = kk * k3 * real.h / sz;
  // fades: over 1 s where a lane starts or ends inside the frame
  const fadeM = Math.max(1.2, a.v * 1);
  let alpha = 1;
  if (ln.dir === 1 ? ln.fade0 : ln.fade1) alpha = Math.min(alpha, s0 / fadeM);
  if (ln.dir === 1 ? ln.fade1 : ln.fade0) alpha = Math.min(alpha, (ln.len - s0) / fadeM);
  alpha = _scflClamp(alpha, 0, 1);
  if (alpha <= 0.01) return null;
  const moving = !(a.stop && s0 === a.stop.s);
  return { flow: fi, lane: li, k: a.key, o: vw.o, base, v: vv, cls: flow.cls, kind: flow.kind, x: _scflR(x), d: _scflR(d), h, X, Y, s: sc, k3, view: vw.view, viewMissing: !!vw.missing,
    flip: vw.view === 'side' ? (X2 - X) < 0 : false, alpha, layer: _scflBand(cam, d), speed: moving ? a.v : 0, moving, night: !!ctx.night, bus: !!a.bus, water: flow.water, len: a.len,
    phase: _scflU(ak + '|ph'), dirX: tx, dirD: td };
}
/**
 * Every visible agent at time t (seconds; t = 0 is half a period into the schedule, so a still shows a street in motion):
 * [{ flow, lane, k, o, v, base, cls, kind, x, d, h, X, Y, s, k3, view, viewMissing, flip, alpha, layer, speed, moving, ... }]
 * sorted far to near. opt: { mults (sceneFlowMults; default from L), data, maxScale (the governor: max x 0.7) }. Pure: it depends
 * only on (C, t, L). The active set comes from a moving window over each sorted spawn list (cost in proportion to the agents on
 * screen); a flow over its max keeps a stable subset (by a hash of the agent, never by position).
 */
function sceneFlowAgents(C, t, L, opt) {
  opt = opt || {};
  const flows = (C && C.flows) || [];
  if (!flows.length) return [];
  const cam = (C.cam && C.cam.f) ? C.cam : _scflCam(opt.data || {}, C), P = SCENE_FLOW_PERIOD, tau = (t || 0) + P / 2;
  const mults = opt.mults || sceneFlowMults(C, L, opt.data || {}), wx = _scflWeather(L), ctx = { night: !!(L && (L.lamps || L.windows)), rain: wx.rain && !wx.snow };
  const out = [];
  flows.forEach((flow, fi) => {
    const mult = mults[fi] || 0, cap = Math.max(0, Math.floor(flow.max * (opt.maxScale || 1)));
    if (!cap || !(mult > 0)) return;
    const mine = [];
    flow.lanes.forEach((ln, li) => {
      const S = sceneFlowSchedule(flow, li, mult);
      if (!S.list.length) return;
      const p = Math.floor(tau / P), back = Math.ceil(S.durMax / P);
      for (let q = p - back; q <= p; q++) {
        const base = q * P, lo = tau - S.durMax - base, hi = tau - base;
        // binary search the first spawn at or after lo
        let a = 0, b = S.list.length;
        while (a < b) { const m = (a + b) >> 1; if (S.list[m].t0 < lo) a = m + 1; else b = m; }
        for (let i = a; i < S.list.length && S.list[i].t0 <= hi; i++) {
          const ag = _scflPlace(cam, flow, fi, li, S.list[i], base + S.list[i].t0, tau, ctx);
          if (ag && ag.X > -400 && ag.X < 2000 && ag.Y < 1100) { ag.k = q * 100000 + li * 1000 + S.list[i].key; mine.push(ag); }
        }
      }
    });
    if (mine.length > cap) {
      mine.sort((a, b) => (sceneHash(flow.seed + '|keep|' + a.k) % 997) - (sceneHash(flow.seed + '|keep|' + b.k) % 997) || a.k - b.k);
      mine.length = cap;
    }
    out.push(...mine);
  });
  return out.sort((a, b) => (a.d !== b.d ? b.d - a.d : a.flow - b.flow || a.k - b.k));
}
/** The k-th agent (schedule order over the flow's lanes, in the period) at time t, or null when it is not on screen. */
function sceneFlowAt(flow, k, t, cam, mult) {
  if (!flow || !cam) return null;
  const m = mult == null ? (flow.timetable ? 1 : flow.peak || 1) : mult, P = SCENE_FLOW_PERIOD, tau = (t || 0) + P / 2;
  let rest = k | 0;
  for (let li = 0; li < flow.lanes.length; li++) {
    const S = sceneFlowSchedule(flow, li, m);
    if (rest >= S.list.length) { rest -= S.list.length; continue; }
    const a = S.list[rest], p = Math.floor(tau / P);
    for (let q = p; q >= p - Math.ceil(S.durMax / P); q--) {
      const ag = _scflPlace(cam, flow, 0, li, a, q * P + a.t0, tau, { night: false, rain: false });
      if (ag) return ag;
    }
    return null;
  }
  return null;
}
/** How many agents are on screen at t. */
function sceneFlowCount(C, t, L, opt) { return sceneFlowAgents(C, t, L, opt).length; }
