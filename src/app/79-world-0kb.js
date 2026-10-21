/* ============================================================
   WORLD ENGINE (scene format v3.1): the knowledge base (docs/dev/WORLD_ENGINE.md 1.3, 12, 15.3; WORLD_ENGINE_REQUIREMENTS.md
   K1-K9, S1, S4, V3). Package `kb`, private prefix _wkb. PURE classic script: only constants and functions at load; every
   engine name it reads (sceneObj, sceneObjReal, sceneMoverSize, sceneObjClass, sceneObjShapes, sceneBehave, SCENE_PLACE_RULES,
   SCENE_DRIVE_LEFT, SCENE_SURFACE_KINDS, WORLD_POPULATIONS) is looked up through typeof guards when called, so the load order
   does not matter and a missing module removes a detail, never the answer. No function here throws.

   Every object class knows itself; the ENGINE reads this, scenes never repeat it.
     WORLD_KB_TAGS                    the habitat tag vocabulary (K1)
     WORLD_KB_CLASSES                 one descriptor per world class (every class of the core's _wcClass, plus bough, frond, lead,
                                      mooring-line, smoke, washing-line, window-light, flower, insect, lily, fish-ring, market-stall,
                                      cafe-table, umbrella, picnic, car, van, bus, signage)
     WORLD_KB_OBJECTS                 per-object overrides (liveries, bloom windows, region, poses, seasonal dates ...)
     worldKb(id)                      -> the frozen descriptor of a library object (or of a class name), memoised; null if unknown
     worldKbClassOf(id)               -> the world class of an object id (or null)
     worldKbSurfaceTags(kind)         -> the habitat tags of a surface kind (v3 and v2 kinds)
     worldKbHabitatOk(kb, probe)      -> { ok, reason } K1 (probe: the core's worldPlaceProbe record; an array = the footprint corners)
     worldKbOrient(kb, probe)         -> { facing, either, lookAt, along, rule, tol, reason } K3 (camera frame: 0 away, 90 right)
     worldKbParentOk(kb, child, parent) -> { ok, reason } K4 (helper for the solver and the fill)
     worldKbWhen(kb, ctx)             -> { ok, share, why } K6 (ctx: the WorldTimeCtx of WORLD_ENGINE.md 11.11)
     worldKbState(kb, ctx, key)       -> { present, leaf, turn, drop, grow, bloom, snow, frost, wet, lit, litShare } S1, V3
     worldKbDensity(who, ctx, place)  -> a density factor >= 0 (A1, S4) by hour, weekday, season and weather
     worldKbSize(kb, pose, age, rnd)  -> metres to the top (K8)
     worldKbVariant(kb, place, rnd, o)-> a variant index from the local liveries (K7, A11)
     worldKbRegionOk(kb, place)       -> { ok, reason, swap } (K7)
     worldKbCare(id)                  -> { ok, text, flags, faces, symbols, ignoreParts, reason } (K9, L3)
     worldKbAreas(place)              -> the area names of a place (uk, london, sheffield, manchester, us, asia ...)

   Conventions. Facing: degrees in the camera frame (0 = away from the camera, 90 = right), as the core's footprints: an
   object's LENGTH lies along its facing, except front classes (orient path | view | street: benches, buildings, stalls,
   signs), whose facing is where their front looks (the core lays their length across it). ctx fields read: doy | ms | month (1-12), hour, dow (0 = Sunday) | weekend,
   weather ('clear' | 'cloud' | 'rain' | 'snow' | 'fog'), cover, temp, snowDay, snowing, frost, sun.alt, dark, lat. A missing
   field is permissive (no ctx: everything present, density 1).
   ============================================================ */

/* ---------- small helpers ---------- */
const _wkbNum = v => typeof v === 'number' && Number.isFinite(v);
const _wkbClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _wkbR3 = v => Math.round(v * 1000) / 1000;
function _wkbHash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15; return h >>> 0; }
/** A seeded uniform in [0, 1) for a key and a salt (per-entity unevenness: trees turn unevenly, windows light at different times). */
const _wkbU = (key, salt) => _wkbHash(String(key) + '|' + salt) / 4294967296;
function _wkbFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) _wkbFreeze(o[k]); }
  return o;
}
/** A deep merge of plain objects (arrays and scalars replace). */
function _wkbMerge(a, b) {
  if (b == null) return a;
  if (a == null || typeof a !== 'object' || Array.isArray(a) || typeof b !== 'object' || Array.isArray(b)) return b;
  const out = Object.assign({}, a);
  for (const k of Object.keys(b)) out[k] = _wkbMerge(a[k], b[k]);
  return out;
}
const _wkbCopy = v => (v == null || typeof v !== 'object') ? v : JSON.parse(JSON.stringify(v));
const _wkbRnd = (rnd) => typeof rnd === 'function' ? (() => { const v = Number(rnd()); return _wkbNum(v) ? _wkbClamp(v, 0, 0.999999) : 0.5; }) : _wkbNum(rnd) ? (() => _wkbClamp(rnd, 0, 0.999999)) : (() => 0.5);
const _wkbLerp = (r, t) => r[0] + (r[1] - r[0]) * t;

/* ---------- habitat tags (K1) ---------- */
/** The habitat tag vocabulary. Surface tags come from worldKbSurfaceTags(kind); the probe adds the distance tags
    (water-margin, bank, grass-edge, walkline, wet) and 'pit' / 'perch' / 'roof' / 'deck' come from hosts. */
const WORLD_KB_TAGS = Object.freeze(['water', 'water-margin', 'bank', 'wet', 'walk', 'path', 'paving', 'deck', 'crossing', 'cycle', 'grass', 'soil', 'heath',
  'field', 'wood', 'sand', 'stone', 'grass-edge', 'walkline', 'road', 'road-lane', 'rail', 'tram', 'hedge', 'weir', 'roof', 'perch', 'wall', 'air', 'ground',
  'reeds', 'attached']);
const _WKB_SURFACE_TAGS = Object.freeze({
  water: ['water'], puddle: ['water'], weir: ['weir', 'water'], reeds: ['water-margin', 'wet', 'reeds', 'soil'], reedbed: ['water-margin', 'wet', 'reeds', 'soil'],
  bed: ['water-margin', 'wet', 'soil'], mud: ['wet', 'soil', 'water-margin'],
  path: ['walk', 'path'], towpath: ['walk', 'path'], track: ['walk', 'path', 'soil'], cycleway: ['walk', 'path', 'cycle'], steps: ['walk', 'deck'],
  pavement: ['walk', 'paving'], plaza: ['walk', 'paving'], driveway: ['walk', 'paving'], crossing: ['walk', 'crossing'],
  boardwalk: ['walk', 'deck'], 'bridge-deck': ['walk', 'deck'], bridge: ['walk', 'deck'], deck: ['walk', 'deck'], platform: ['walk', 'deck', 'paving'],
  stairs: ['walk', 'deck'], ramp: ['walk', 'deck'], jetty: ['walk', 'deck'], pontoon: ['walk', 'deck'],
  grass: ['grass', 'soil'], lawn: ['grass', 'soil'], park: ['grass', 'soil'], verge: ['grass', 'soil'], garden: ['grass', 'soil'], meadow: ['grass', 'soil'],
  heath: ['grass', 'soil', 'heath'], field: ['grass', 'soil', 'field'], wood: ['soil', 'grass', 'wood'], plot: ['soil'], bank: ['grass', 'soil', 'bank'],
  sand: ['sand'], beach: ['sand'], shingle: ['sand', 'stone'], rock: ['stone'],
  road: ['road', 'road-lane'], parking: ['road', 'paving'], tramway: ['tram', 'road', 'road-lane'], rail: ['rail'], tram: ['tram'],
  hedge: ['hedge'], edge: ['bank', 'paving'], rooftop: ['roof'], roof: ['roof'], ground: ['soil', 'grass', 'ground'], bare: ['soil', 'grass', 'ground'],
});
const _wkbTagMemo = new Map();
/** The habitat tags of a surface kind (v3 kinds, v2 SCENE_SURFACE_KINDS, null = bare ground). Never throws. */
function worldKbSurfaceTags(kind) {
  const k = kind == null ? 'ground' : String(kind);
  if (_wkbTagMemo.has(k)) return _wkbTagMemo.get(k);
  let out = _WKB_SURFACE_TAGS[k];
  if (!out) {
    const v2 = typeof SCENE_SURFACE_KINDS === 'object' && SCENE_SURFACE_KINDS ? SCENE_SURFACE_KINDS[k] : null;
    out = [];
    if (v2) {
      if (v2.walk === true) out.push('walk', v2.hard ? 'paving' : 'path');
      if (v2.plant) out.push(v2.plant === 'reeds' ? 'reeds' : 'grass', 'soil');
      if (v2.drive && v2.drive.length && !v2.walk) out.push('road', 'road-lane');
      if (v2.rail) out.push(v2.rail.includes('tram') ? 'tram' : 'rail');
      if (v2.wet >= 0.6 && v2.plant) out.push('wet', 'water-margin');
    }
    if (!out.length) out.push('ground');
  }
  out = Object.freeze(out.slice());
  _wkbTagMemo.set(k, out);
  return out;
}

/* ---------- the class table (WORLD_ENGINE.md 1.3) ---------- */
// The size tables of K8 (metres to the top). Movers without an age or pose table scale their real size by +- 8 %.
const _WKB_PERSON_SIZE = { poses: { stand: [1.6, 1.9], sit: [1.2, 1.4], lie: [0.25, 0.45], ride: [1.6, 1.9] }, ages: { adult: [1.6, 1.9], child: [1.0, 1.4] },
  child: { stand: [1.0, 1.4], sit: [0.75, 1.0], lie: [0.2, 0.35], ride: [1.0, 1.4] } };
const _WKB_ATTACHED = { on: ['attached'] };
const _WKB_FURNITURE = { on: ['paving', 'path', 'grass-edge', 'deck', 'bank'], avoid: ['walkline', 'water', 'road-lane', 'rail', 'tram', 'hedge'] };
const _WKB_STATIC_ANIM = { clips: [], idle: null, stiffness: 1, secondary: [] };
const WORLD_KB_CLASSES = _wkbFreeze({
  // ---- people ----
  person: { habitat: { on: ['walk', 'grass', 'sand', 'deck', 'crossing'], avoid: ['water', 'hedge', 'weir', 'rail', 'tram', 'road-lane'] }, foot: 'disc', solidity: 'passable', clearance: 0.25,
    orient: 'free', group: { kind: 'mixed', size: [1, 5], gap: 0.6, shares: { single: 0.55, pair: 0.3, family: 0.1, group: 0.05 } }, density: 'people',
    size: _WKB_PERSON_SIZE, care: { faces: false }, lit: null,
    anim: { clips: ['walk', 'run', 'idle', 'look', 'sit', 'chat'], stride: 'stroll', idle: 'breathe', stiffness: 1, secondary: ['coat', 'scarf'] } },
  cyclist: { habitat: { on: ['path', 'cycle', 'road-lane', 'crossing'], avoid: ['water', 'hedge', 'rail', 'paving'] }, foot: 'box', solidity: 'passable', clearance: 0.5,
    orient: 'lane', group: { kind: 'single', size: [1, 2], gap: 3 }, density: 'cyclist', size: { poses: { ride: [1.6, 1.85] }, ages: { adult: [1.6, 1.85], child: [1.1, 1.4] } },
    anim: { clips: ['pedal', 'idle'], stride: null, idle: 'breathe', stiffness: 1, secondary: [] } },
  picnic: { habitat: { on: ['grass', 'sand'], avoid: ['walkline', 'water', 'wet', 'path', 'paving'] }, foot: 'box', solidity: 'passable', clearance: 0.6, orient: 'view',
    group: { kind: 'family', size: [1, 4], gap: 4 }, density: 'people', size: Object.assign({ pose: 'sit' }, _WKB_PERSON_SIZE),
    when: { months: [5, 6, 7, 8, 9], hours: [11, 19.5], weather: ['clear', 'cloud'], tempMin: 15, snowDay: false, dark: false },
    anim: { clips: ['sit', 'idle'], stride: null, idle: 'breathe', stiffness: 1, secondary: [] } },
  'cafe-table': { habitat: { on: ['paving', 'deck'], avoid: ['walkline', 'water', 'road-lane'] }, foot: 'box', solidity: 'solid', clearance: 0.5, orient: 'free',
    group: { kind: 'clump', size: [2, 8], gap: 1.4 }, density: 'people', size: Object.assign({ pose: 'sit' }, _WKB_PERSON_SIZE),
    when: { months: [4, 5, 6, 7, 8, 9, 10], hours: [8, 21], weather: ['clear', 'cloud'], tempMin: 11, snowDay: false },
    anim: { clips: ['sit', 'idle'], stride: null, idle: 'breathe', stiffness: 1, secondary: [] } },
  umbrella: { habitat: { on: ['walk', 'paving', 'sand', 'deck', 'grass'], avoid: ['water', 'road-lane'] }, foot: 'disc', solidity: 'passable', clearance: 0.4, orient: 'free',
    group: { kind: 'single', size: [1, 2], gap: 1 }, density: 'people',
    when: { weather: ['rain'] }, anim: { clips: [], stride: null, idle: null, stiffness: 1, secondary: [] } },   // rigid: statics never sway (M2)
  // ---- animals ----
  dog: { habitat: { on: ['walk', 'grass', 'sand', 'deck', 'soil', 'crossing'], avoid: ['water', 'hedge', 'weir', 'rail', 'road-lane'] }, foot: 'box', solidity: 'passable', clearance: 0.2,
    orient: 'free', group: { kind: 'single', size: [1, 2], gap: 0.5 }, density: 'dog', size: { poses: { stand: [0.3, 0.7], sit: [0.25, 0.55], lie: [0.15, 0.3] } },
    anim: { clips: ['trot', 'run', 'sniff', 'idle', 'sit'], stride: 'dog-trot', idle: 'tail', stiffness: 1, secondary: ['tail', 'ears'] } },
  duck: { habitat: { on: ['water'], inset: 0.1, alt: { graze: ['bank', 'grass', 'water-margin'] }, avoid: ['roof', 'road-lane', 'rail', 'paving'] }, foot: 'box', solidity: 'passable', clearance: 0.15,
    orient: 'free', group: { kind: 'loose', size: [3, 8], gap: 0.6 }, density: 'water-bird', floats: true, size: { poses: { swim: [0.3, 0.4], stand: [0.3, 0.42] } },
    anim: { clips: ['swim', 'dabble', 'preen', 'idle', 'fly'], stride: 'duck', idle: 'swimmer', stiffness: 1, secondary: [] } },
  coot: { habitat: { on: ['water'], inset: 0.1, alt: { graze: ['bank', 'grass', 'water-margin'] }, avoid: ['roof', 'road-lane', 'rail', 'paving'] }, foot: 'box', solidity: 'passable', clearance: 0.15,
    orient: 'free', group: { kind: 'loose', size: [2, 5], gap: 0.8 }, density: 'water-bird', floats: true, size: { poses: { swim: [0.27, 0.35] } },
    anim: { clips: ['swim', 'dive', 'idle'], stride: 'coot', idle: 'swimmer', stiffness: 1, secondary: [] } },
  grebe: { habitat: { on: ['water'], inset: 0.3, avoid: ['roof', 'road-lane', 'rail', 'paving', 'grass'] }, foot: 'box', solidity: 'passable', clearance: 0.2, orient: 'free',
    group: { kind: 'pair', size: [2, 2], gap: 1.5 }, density: 'water-bird', floats: true, size: { poses: { swim: [0.36, 0.46] } },
    anim: { clips: ['swim', 'dive', 'idle'], stride: 'grebe', idle: 'swimmer', stiffness: 1, secondary: [] } },
  swan: { habitat: { on: ['water'], inset: 0.25, alt: { graze: ['bank', 'grass'] }, avoid: ['roof', 'road-lane', 'rail', 'paving'] }, foot: 'box', solidity: 'passable', clearance: 0.3,
    orient: 'free', group: { kind: 'pair', size: [2, 2], gap: 1.2 }, density: 'water-bird', floats: true, size: { poses: { swim: [0.55, 0.65], stand: [1.0, 1.25] } },
    anim: { clips: ['swim', 'dabble', 'preen', 'idle'], stride: 'swan', idle: 'swan', stiffness: 1, secondary: [] } },
  goose: { habitat: { on: ['water', 'grass', 'bank', 'field'], inset: 0.15, avoid: ['roof', 'road-lane', 'rail'] }, foot: 'box', solidity: 'passable', clearance: 0.25, orient: 'free',
    group: { kind: 'loose', size: [4, 15], gap: 0.8 }, density: 'water-bird', floats: true, size: { poses: { swim: [0.55, 0.7], stand: [0.65, 0.85] } },
    anim: { clips: ['swim', 'graze', 'walk', 'idle', 'fly'], stride: 'goose-graze', idle: 'graze-bird', stiffness: 1, secondary: [] } },
  heron: { habitat: { on: ['water-margin', 'bank', 'wet', 'perch'], avoid: ['road-lane', 'paving', 'rail'] }, foot: 'disc', solidity: 'passable', clearance: 0.4, orient: 'free',
    group: { kind: 'single', size: [1, 1], gap: 20 }, density: 'water-bird', size: { poses: { stand: [0.85, 1.0], fly: [0.85, 1.0] } },
    anim: { clips: ['stalk', 'idle', 'strike', 'fly'], stride: 'heron-stalk', idle: 'heron', stiffness: 1, secondary: [] } },
  kingfisher: { habitat: { on: ['perch', 'air'] }, foot: 'disc', solidity: 'passable', clearance: 0.1, orient: 'view', group: { kind: 'single', size: [1, 1], gap: 30 },
    density: 'water-bird', size: { poses: { perch: [0.15, 0.19] } }, anim: { clips: ['perch', 'dive', 'fly'], stride: null, idle: 'kingfisher', stiffness: 1, secondary: [] } },
  gull: { habitat: { on: ['water', 'walk', 'grass', 'roof', 'perch', 'sand', 'air'], inset: 0.2, avoid: ['road-lane', 'rail'] }, foot: 'box', solidity: 'passable', clearance: 0.2,
    orient: 'free', group: { kind: 'loose', size: [2, 12], gap: 1 }, density: 'gull', floats: true, size: { poses: { stand: [0.4, 0.5], swim: [0.3, 0.4] } },
    anim: { clips: ['fly', 'swim', 'walk', 'idle'], stride: null, idle: 'songbird', stiffness: 1, secondary: [] } },
  bird: { habitat: { on: ['walk', 'grass', 'roof', 'perch', 'soil', 'paving', 'heath'], avoid: ['water', 'road-lane'] }, foot: 'disc', solidity: 'passable', clearance: 0.1,
    orient: 'free', group: { kind: 'loose', size: [1, 10], gap: 0.4 }, density: 'pigeon', size: { poses: { stand: [0.12, 0.35] } },
    anim: { clips: ['walk', 'peck', 'hop', 'fly', 'idle'], stride: null, idle: 'songbird', stiffness: 1, secondary: [] } },
  'bird-air': { habitat: { on: ['air'] }, foot: 'disc', solidity: 'passable', clearance: 0, orient: 'free', group: { kind: 'loose', size: [1, 6], gap: 2 }, density: 'flyer',
    size: { poses: { fly: [0.1, 1.0] } }, anim: { clips: ['fly', 'glide'], stride: null, idle: null, stiffness: 1, secondary: [] } },
  insect: { habitat: { on: ['air'] }, foot: 'disc', solidity: 'passable', clearance: 0, orient: 'free', group: { kind: 'loose', size: [1, 4], gap: 0.5 }, density: 'insect',
    when: { months: [4, 5, 6, 7, 8, 9], hours: [8.5, 19.5], weather: ['clear', 'cloud'], tempMin: 12, dark: false },
    anim: { clips: ['fly', 'hover'], stride: null, idle: null, stiffness: 0, secondary: ['wings'] } },
  fish: { habitat: { on: ['water'], inset: 0.3 }, foot: 'box', solidity: 'passable', clearance: 0.2, orient: 'free', group: { kind: 'loose', size: [1, 6], gap: 0.5 },
    density: 'water-bird', anim: { clips: ['swim', 'jump'], stride: null, idle: null, stiffness: 1, secondary: [] } },
  grazer: { habitat: { on: ['grass', 'field', 'heath'], avoid: ['walkline', 'water', 'paving', 'road-lane', 'rail'] }, foot: 'box', solidity: 'passable', clearance: 0.6, orient: 'free',
    group: { kind: 'loose', size: [3, 12], gap: 2 }, density: 'grazer', anim: { clips: ['graze', 'walk', 'idle', 'lie'], stride: 'cattle-graze', idle: 'graze', stiffness: 1, secondary: ['tail'] } },
  animal: { habitat: { on: ['grass', 'soil', 'walk', 'wood', 'heath', 'sand'], avoid: ['water', 'road-lane', 'rail'] }, foot: 'box', solidity: 'passable', clearance: 0.3, orient: 'free',
    group: { kind: 'single', size: [1, 3], gap: 1 }, density: 'animal', anim: { clips: ['walk', 'run', 'idle', 'look'], stride: 'deer', idle: 'graze', stiffness: 1, secondary: ['tail'] } },
  // ---- vehicles ----
  boat: { habitat: { on: ['water'], inset: 0.25, moored: 1.2, avoid: ['weir'] }, foot: 'box', solidity: 'solid', clearance: 0.3, orient: 'bank',
    group: { kind: 'nose-tail', size: [1, 4], gap: 1.5 }, density: 'boat', floats: true, perch: 'boat', lit: 'window',
    anim: { clips: ['cruise', 'moored'], stride: null, idle: 'bob', stiffness: 1, secondary: ['rock'] } },
  car: { habitat: { on: ['road-lane'], avoid: ['walk', 'water', 'rail'] }, foot: 'box', solidity: 'solid', clearance: 0.5, orient: 'lane', group: { kind: 'traffic', size: [1, 6], gap: 8 },
    density: 'traffic', lit: 'vehicle', size: { h: [1.4, 1.6] }, anim: { clips: ['drive', 'stopped'], stride: null, idle: null, stiffness: 1, secondary: [] } },
  van: { habitat: { on: ['road-lane'], avoid: ['walk', 'water', 'rail'] }, foot: 'box', solidity: 'solid', clearance: 0.5, orient: 'lane', group: { kind: 'traffic', size: [1, 3], gap: 9 },
    density: 'traffic', lit: 'vehicle', size: { h: [1.9, 2.7] }, anim: { clips: ['drive', 'stopped'], stride: null, idle: null, stiffness: 1, secondary: [] } },
  bus: { habitat: { on: ['road-lane'], avoid: ['walk', 'water', 'rail'] }, foot: 'box', solidity: 'solid', clearance: 0.6, orient: 'lane', group: { kind: 'traffic', size: [1, 2], gap: 12 },
    density: 'traffic', lit: 'vehicle', size: { h: [3.0, 4.5] }, anim: { clips: ['drive', 'stopped'], stride: null, idle: null, stiffness: 1, secondary: [] } },
  vehicle: { habitat: { on: ['road-lane', 'field', 'road'], avoid: ['walk', 'water', 'rail'] }, foot: 'box', solidity: 'solid', clearance: 0.5, orient: 'lane',
    group: { kind: 'traffic', size: [1, 3], gap: 8 }, density: 'traffic', lit: 'vehicle', anim: { clips: ['drive', 'stopped'], stride: null, idle: null, stiffness: 1, secondary: [] } },
  tram: { habitat: { on: ['tram', 'rail'] }, foot: 'box', solidity: 'solid', clearance: 0.6, orient: 'rail', group: { kind: 'single', size: [1, 1], gap: 40 }, density: 'transit',
    lit: 'vehicle', anim: { clips: ['drive', 'stopped'], stride: null, idle: null, stiffness: 1, secondary: [] } },
  train: { habitat: { on: ['rail'] }, foot: 'box', solidity: 'solid', clearance: 0.8, orient: 'rail', group: { kind: 'single', size: [1, 1], gap: 200 }, density: 'transit',
    lit: 'vehicle', anim: { clips: ['drive', 'stopped'], stride: null, idle: null, stiffness: 1, secondary: [] } },
  air: { habitat: { on: ['air'] }, foot: 'disc', solidity: 'passable', clearance: 0, orient: 'free', group: { kind: 'single', size: [1, 1], gap: 0 }, density: 'flyer',
    anim: { clips: ['fly'], stride: null, idle: null, stiffness: 1, secondary: [] } },
  // ---- plants ----
  tree: { habitat: { on: ['soil', 'grass', 'wet', 'bank', 'hedge'], pit: ['paving', 'path'], avoid: ['walkline', 'water', 'road-lane', 'rail', 'tram', 'deck', 'weir'] }, foot: 'disc',
    solidity: 'solid', clearance: 0.5, orient: 'free', group: { kind: 'clump', size: [2, 6], gap: 4 }, leaf: 'deciduous', perch: 'tree', snow: 0.45,
    anim: { clips: [], stride: null, idle: null, stiffness: 0.85, secondary: ['leaves'] } },
  bough: { habitat: _WKB_ATTACHED, foot: 'disc', solidity: 'passable', clearance: 0, orient: 'free', framing: true, leaf: 'deciduous', perch: 'bough', snow: 0.5,
    parent: { cls: ['tree'], reach: 12, side: 'same', anchor: 'trunk', height: [0.12, 0.98], frame: true }, group: { kind: 'single', size: [1, 2], gap: 0 },
    anim: { clips: [], stride: null, idle: null, stiffness: 0.55, secondary: ['leaves'] } },
  frond: { habitat: _WKB_ATTACHED, foot: 'disc', solidity: 'passable', clearance: 0, orient: 'free', framing: true, leaf: 'deciduous', snow: 0.2,
    parent: { cls: ['tree'], match: 'willow', reach: 10, side: 'same', anchor: 'trunk', height: [0.2, 1.0], frame: true }, group: { kind: 'single', size: [1, 2], gap: 0 },
    anim: { clips: [], stride: null, idle: null, stiffness: 0.15, secondary: ['whips'] } },
  shrub: { habitat: { on: ['soil', 'grass', 'wet', 'bank', 'heath'], avoid: ['walkline', 'water', 'paving', 'road-lane', 'rail', 'tram', 'deck', 'path'] }, foot: 'disc', solidity: 'passable',
    clearance: 0.2, orient: 'free', group: { kind: 'clump', size: [2, 6], gap: 0.8 }, leaf: 'deciduous', snow: 0.6, anim: { clips: [], stride: null, idle: null, stiffness: 0.5, secondary: [] } },
  hedge: { habitat: { on: ['soil', 'grass', 'hedge', 'bank'], avoid: ['walkline', 'water', 'paving', 'road-lane', 'rail', 'deck', 'path'] }, foot: 'box', solidity: 'solid', clearance: 0.3,
    orient: 'fence', group: { kind: 'stand', size: [2, 8], gap: 0.4 }, leaf: 'deciduous', snow: 0.7, perch: 'fence', framing: true,
    anim: { clips: [], stride: null, idle: null, stiffness: 0.7, secondary: [] } },
  reed: { habitat: { on: ['water-margin', 'wet', 'reeds'], avoid: ['walkline', 'paving', 'road-lane', 'rail', 'deck'] }, foot: 'disc', solidity: 'passable', clearance: 0.1, orient: 'free',
    group: { kind: 'stand', size: [5, 20], gap: 0.3 }, leaf: 'herb', snow: 0.3, framing: true, anim: { clips: [], stride: null, idle: null, stiffness: 0.15, secondary: [] } },
  flower: { habitat: { on: ['grass', 'soil', 'wet', 'bank', 'heath'], avoid: ['walkline', 'water', 'paving', 'path', 'road-lane', 'rail', 'deck'] }, foot: 'disc', solidity: 'passable',
    clearance: 0.1, orient: 'free', group: { kind: 'clump', size: [3, 12], gap: 0.25 }, leaf: 'herb', bloomDefault: [[5, 1], [8, 31]],
    when: { months: [5, 6, 7, 8, 9], snowDay: false }, anim: { clips: [], stride: null, idle: null, stiffness: 0.3, secondary: [] } },
  lily: { habitat: { on: ['water'], inset: 0.2, calm: true }, foot: 'disc', solidity: 'water', clearance: 0, orient: 'free', floats: true, group: { kind: 'loose', size: [3, 12], gap: 0.35 },
    when: { months: [5, 6, 7, 8, 9, 10], snowDay: false }, bloomDefault: [[6, 10], [8, 25]], anim: { clips: [], stride: null, idle: null, stiffness: 0.9, secondary: [] } },
  'fish-ring': { habitat: { on: ['water'], inset: 0.4, calm: true }, foot: 'disc', solidity: 'water', clearance: 0, orient: 'free', floats: true, group: { kind: 'single', size: [1, 2], gap: 4 },
    when: { months: [4, 5, 6, 7, 8, 9, 10], weather: ['clear', 'cloud', 'fog'] }, anim: { clips: ['ring'], stride: null, idle: null, stiffness: 1, secondary: [] } },
  cover: { habitat: { on: ['soil', 'grass', 'walk', 'paving', 'sand', 'wet', 'ground', 'bank', 'heath', 'stone'], avoid: ['water', 'road-lane', 'rail', 'tram'] }, foot: 'disc',
    solidity: 'passable', clearance: 0, orient: 'free', group: { kind: 'clump', size: [2, 8], gap: 0.3 }, snow: 1, anim: _WKB_STATIC_ANIM },
  rock: { habitat: { on: ['soil', 'grass', 'sand', 'wet', 'water-margin', 'stone', 'heath', 'bank'], avoid: ['walkline', 'road-lane', 'rail', 'paving', 'deck'] }, foot: 'disc',
    solidity: 'solid', clearance: 0.1, orient: 'free', group: { kind: 'clump', size: [1, 5], gap: 0.5 }, perch: 'top', snow: 0.8, anim: _WKB_STATIC_ANIM },
  // ---- built ----
  building: { habitat: { on: ['soil', 'grass', 'paving', 'ground', 'stone', 'sand'], avoid: ['water', 'road-lane', 'rail', 'tram', 'walkline'] }, foot: 'box', solidity: 'solid',
    clearance: 1.0, orient: 'street', group: { kind: 'row', size: [1, 12], gap: 0 }, perch: 'roof', lit: 'window', snow: 0.9, anim: _WKB_STATIC_ANIM },
  structure: { habitat: { on: ['soil', 'grass', 'paving', 'walk', 'water', 'sand', 'ground', 'water-margin', 'bank', 'stone', 'deck'], avoid: ['road-lane', 'rail', 'walkline'] },
    foot: 'box', solidity: 'solid', clearance: 0.5, orient: 'free', group: { kind: 'single', size: [1, 1], gap: 0 }, perch: 'top', snow: 0.8, anim: _WKB_STATIC_ANIM },
  landmark: { habitat: { on: ['soil', 'grass', 'paving', 'walk', 'water', 'sand', 'ground', 'water-margin', 'bank', 'stone', 'heath', 'deck', 'road', 'road-lane', 'rail'] }, foot: 'box',
    solidity: 'solid', clearance: 1.0, orient: 'free', group: { kind: 'single', size: [1, 1], gap: 0 }, perch: 'roof', lit: 'window', snow: 0.85, anim: _WKB_STATIC_ANIM },
  walkway: { habitat: { on: ['water', 'soil', 'grass', 'wet', 'walk', 'road', 'road-lane', 'rail', 'tram', 'water-margin', 'bank', 'ground', 'paving', 'deck', 'stone'] }, foot: 'box',
    solidity: 'overhead', clearance: 1.2, orient: 'free', group: { kind: 'single', size: [1, 1], gap: 0 }, perch: 'rail', snow: 0.8, deck: true, anim: _WKB_STATIC_ANIM },
  weir: { habitat: { on: ['water', 'weir'] }, foot: 'box', solidity: 'solid', clearance: 0.5, orient: 'bank', group: { kind: 'single', size: [1, 1], gap: 0 }, snow: 0.3, anim: _WKB_STATIC_ANIM },
  // a lychgate: a roof on four posts over a path in a churchyard wall: stands on the path (walkers pass under it), faces as it is told
  lychgate: { habitat: { on: ['soil', 'grass', 'walk', 'paving', 'ground', 'path', 'hedge', 'heath', 'field'], avoid: ['water', 'road-lane', 'rail'] }, foot: 'box', solidity: 'overhead',
    clearance: 0.5, orient: 'free', group: { kind: 'single', size: [1, 1], gap: 0 }, perch: 'roof', snow: 0.8, anim: _WKB_STATIC_ANIM },
  gate: { habitat: { on: ['soil', 'grass', 'walk', 'paving', 'ground', 'path', 'hedge', 'heath', 'field'], avoid: ['water', 'road-lane', 'rail'] }, foot: 'box', solidity: 'solid',
    clearance: 1.5, orient: 'fence', group: { kind: 'single', size: [1, 1], gap: 0 }, perch: 'fence', snow: 0.6, anim: _WKB_STATIC_ANIM },
  fence: { habitat: { on: ['soil', 'grass', 'walk', 'paving', 'ground', 'path', 'bank', 'heath', 'field', 'stone', 'water-margin'], avoid: ['water', 'road-lane', 'rail', 'walkline'] }, foot: 'box',
    solidity: 'solid', clearance: 0.2, orient: 'fence', group: { kind: 'row', size: [1, 20], gap: 0 }, perch: 'fence', snow: 0.7, framing: true, anim: _WKB_STATIC_ANIM },
  'rail-kit': { habitat: { on: ['rail', 'tram', 'soil', 'paving', 'grass', 'ground', 'deck'], avoid: ['water'] }, foot: 'box', solidity: 'passable', clearance: 0.2, orient: 'rail',
    group: { kind: 'row', size: [1, 10], gap: 0 }, snow: 0.8, anim: _WKB_STATIC_ANIM },
  bench: { habitat: _WKB_FURNITURE, foot: 'box', solidity: 'solid', clearance: 0.6, orient: 'path', group: { kind: 'single', size: [1, 2], gap: 6 }, perch: 'top', snow: 0.8, anim: _WKB_STATIC_ANIM },
  lamp: { habitat: { on: ['paving', 'path', 'grass-edge', 'deck', 'bank', 'grass', 'wall'], avoid: ['walkline', 'water', 'road-lane', 'rail', 'tram'] }, foot: 'disc', solidity: 'solid',
    clearance: 0.3, orient: 'free', group: { kind: 'single', size: [1, 1], gap: 15 }, perch: 'post', lit: 'lamp', framing: true, snow: 0.3,
    mount: { cls: ['post', 'fence', 'building', 'walkway', 'structure', 'landmark'], anchor: 'post' }, anim: _WKB_STATIC_ANIM },
  post: { habitat: { on: ['paving', 'path', 'grass-edge', 'grass', 'bank', 'water-margin', 'deck', 'soil', 'water'], avoid: ['walkline', 'road-lane', 'rail', 'tram'] }, foot: 'disc',
    solidity: 'solid', clearance: 0.15, orient: 'free', group: { kind: 'row', size: [1, 12], gap: 1.5 }, perch: 'post', snow: 0.4, anim: _WKB_STATIC_ANIM },
  street: { habitat: { on: ['paving', 'path', 'grass-edge', 'grass', 'deck', 'bank', 'soil', 'ground'], avoid: ['walkline', 'water', 'road-lane', 'rail', 'tram'] }, foot: 'box',
    solidity: 'solid', clearance: 0.3, orient: 'free', group: { kind: 'single', size: [1, 3], gap: 2 }, perch: 'top', snow: 0.8, anim: _WKB_STATIC_ANIM },
  signage: { habitat: { on: ['paving', 'path', 'grass-edge', 'deck', 'wall', 'bank'], avoid: ['walkline', 'water', 'road-lane', 'rail'] }, foot: 'disc', solidity: 'solid', clearance: 0.3,
    orient: 'path', group: { kind: 'single', size: [1, 1], gap: 10 }, perch: 'post', snow: 0.4,
    mount: { cls: ['post', 'fence', 'building', 'walkway', 'structure', 'landmark'], anchor: 'post' }, anim: _WKB_STATIC_ANIM },
  'market-stall': { habitat: { on: ['paving', 'deck'], avoid: ['walkline', 'water', 'road-lane', 'rail', 'grass'] }, foot: 'box', solidity: 'solid', clearance: 1.0, orient: 'path',
    group: { kind: 'row', size: [2, 12], gap: 1.2 }, lit: 'window', snow: 0.8, density: 'people',
    when: { days: [4, 5, 6], hours: [8, 18] }, anim: _WKB_STATIC_ANIM },
  // ---- attached things (K4: they exist only with their parent) ----
  lead: { habitat: _WKB_ATTACHED, foot: 'disc', solidity: 'passable', clearance: 0, orient: 'free', parent: { cls: ['dog', 'person'], anchor: 'dog-walker', reach: 2.5 },
    group: { kind: 'single', size: [1, 1], gap: 0 }, anim: { clips: [], stride: null, idle: null, stiffness: 0.2, secondary: ['swing'] } },
  'mooring-line': { habitat: _WKB_ATTACHED, foot: 'disc', solidity: 'passable', clearance: 0, orient: 'free', parent: { cls: ['boat'], to: ['post', 'fence', 'walkway', 'structure'], anchor: 'two', reach: 4 },
    group: { kind: 'single', size: [1, 2], gap: 0 }, anim: { clips: [], stride: null, idle: null, stiffness: 0.6, secondary: [] } },
  smoke: { habitat: _WKB_ATTACHED, foot: 'disc', solidity: 'passable', clearance: 0, orient: 'free', parent: { cls: ['building', 'boat', 'landmark'], anchor: 'chimney', reach: 0 },
    group: { kind: 'single', size: [1, 1], gap: 0 }, when: { months: [10, 11, 12, 1, 2, 3, 4], tempMax: 14 }, anim: { clips: ['drift'], stride: null, idle: null, stiffness: 0, secondary: [] } },
  'washing-line': { habitat: _WKB_ATTACHED, foot: 'disc', solidity: 'passable', clearance: 0, orient: 'free', parent: { cls: ['post', 'building', 'tree', 'fence'], anchor: 'two', reach: 12 },
    group: { kind: 'single', size: [1, 1], gap: 0 }, when: { weather: ['clear', 'cloud'], hours: [8, 18], snowDay: false }, anim: { clips: [], stride: null, idle: null, stiffness: 0.05, secondary: ['flap'] } },
  'window-light': { habitat: _WKB_ATTACHED, foot: 'disc', solidity: 'passable', clearance: 0, orient: 'free', lit: 'window',
    parent: { cls: ['building', 'landmark', 'boat', 'tram', 'train', 'bus'], anchor: 'wall', reach: 0 }, group: { kind: 'single', size: [1, 1], gap: 0 }, anim: _WKB_STATIC_ANIM },
});

/* ---------- per-object overrides ---------- */
// bloom: [[month, day], [month, day]] (the flowering window); when: K6; region / swap / liveries: K7; size: K8 extras.
const _WKB_FINE = ['clear', 'cloud'];
const WORLD_KB_OBJECTS = _wkbFreeze({
  // a lychgate is a roof on four posts over a path: walkers pass under it (overhead), the gate leaves are low and open to the path
  'structure.lychgate': { cls: 'lychgate', solidity: 'overhead' },
  // a railway viaduct strides over a canal, a quay and a towpath: everything passes under it (people, boats, the fill); its piers are drawn, not solid
  'structure.viaduct': { cls: 'walkway', solidity: 'overhead', size: { h: [4, 40] } },
  // headstones are of every size in a churchyard (a low kerbed slab to a tall cross-less stone): the class range is wide
  'structure.headstone': { cls: 'street', size: { h: [0.6, 1.3] } },
  // K7: local transport liveries (Metrolink yellow and grey; Supertram; UK buses and trains in plausible styles)
  'vehicle.metrolink-m5000': { region: { only: ['manchester'] }, swap: { sheffield: 'vehicle.supertram' }, liveries: { default: [0, 1], names: ['Metrolink yellow and grey, two cars', 'Metrolink yellow and grey, four sections'] } },
  'vehicle.supertram': { region: { only: ['sheffield'] }, swap: { manchester: 'vehicle.metrolink-m5000' }, liveries: { default: [0, 1], names: ['Supertram white with blue, orange and red', 'Supertram blue with yellow'] } },
  'vehicle.shc-supertram': { region: { only: ['sheffield'] }, swap: { manchester: 'vehicle.metrolink-m5000' }, liveries: { default: [0], names: ['Supertram'] } },
  'vehicle.shc-supertram-front': { region: { only: ['sheffield'] } }, 'vehicle.shc-supertram-rear': { region: { only: ['sheffield'] } },
  'vehicle.bus-double-decker': { liveries: { default: [0, 2], london: [0, 1, 2], names: ['red modern double-decker', 'red heritage half-cab', 'red modern double-decker (glazed)'] } },
  'vehicle.bus': { liveries: { default: [0, 1], london: [0], names: ['red double-deck', 'blue double-deck'] } },
  'vehicle.shp-bus': { region: { not: ['london'] }, swap: { london: 'vehicle.bus-double-decker' }, liveries: { default: [0, 1], names: ['deep purple with a lilac band', 'white with a blue skirt and an orange swoosh'] } },
  'vehicle.bus-ai': { region: { not: ['london'] } },
  'rail.train': { liveries: { default: [0, 1, 2], names: ['blue and grey', 'white and green', 'dark grey and yellow'] } },
  // a suburban or main-line electric unit seen across a pond is a pale one: the light bodies of the 12 line colours (0, 3, 6, 9),
  // never a dark unit with a green band that reads as a hole in the trees
  'rail.train-mainline': { liveries: { default: [0, 3, 6, 9], names: ['white with a red band', 'grey with a dark blue band', 'dark with a green band', 'white with a yellow band', 'grey with a brown band', 'dark with a pink band', 'white with a purple band', 'grey with a light blue band', 'dark with a grey band', 'white with a black band', 'grey with a teal band', 'dark with an orange band'] } },
  'rail.train-tube': { region: { only: ['london'] }, swap: { uk: 'rail.train' } }, 'rail.train-subsurface': { region: { only: ['london'] }, swap: { uk: 'rail.train' } },
  'rail.train-dlr': { region: { only: ['london'] }, swap: { uk: 'rail.train' } },
  'vehicle.tram-front': { region: { only: ['sheffield', 'manchester', 'nottingham'] } }, 'vehicle.tram-rear': { region: { only: ['sheffield', 'manchester', 'nottingham'] } },
  // K6 / V3: flowers bloom in their months (presence follows the bloom window)
  'plant.wildflowers': { cls: 'flower', bloom: [[5, 10], [9, 10]], when: { months: [5, 6, 7, 8, 9] } },
  'plant.daisies': { cls: 'flower', bloom: [[3, 15], [10, 15]], when: { months: [3, 4, 5, 6, 7, 8, 9, 10] } },
  'plant.bluebells': { cls: 'flower', bloom: [[4, 10], [5, 25]], when: { months: [4, 5] } },
  'plant.canal-view-loosestrife': { cls: 'flower', bloom: [[6, 25], [8, 31]], when: { months: [6, 7, 8, 9] } },
  'plant.canal-view-meadowsweet': { cls: 'flower', bloom: [[6, 10], [8, 20]], when: { months: [6, 7, 8] } },
  'plant.shp-border': { cls: 'flower', bloom: [[5, 1], [9, 30]], when: { months: [4, 5, 6, 7, 8, 9, 10] } },
  'plant.texas-bluebonnet': { cls: 'flower', bloom: [[3, 10], [4, 30]], when: { months: [3, 4] } },
  'plant.us-rainier-lupine': { cls: 'flower', bloom: [[7, 1], [8, 20]], when: { months: [7, 8] } },
  'plant.us-portland-rose': { cls: 'flower', bloom: [[5, 20], [9, 15]], when: { months: [5, 6, 7, 8, 9] } },
  'plant.us-minneapolis-garden-perennial': { cls: 'flower', bloom: [[5, 20], [9, 10]], when: { months: [5, 6, 7, 8, 9] } },
  // blossom and bloom states on perennials (present all year)
  'plant.yg-meadow': { cls: 'shrub', leaf: 'herb', bloom: [[5, 20], [8, 20]] }, 'plant.heather': { bloom: [[8, 1], [9, 25]] }, 'plant.moor-heather': { bloom: [[8, 1], [9, 25]] },
  'ground.yc-heath-drift': { bloom: [[7, 25], [9, 20]] }, 'plant.wyv-heath-bank': { bloom: [[7, 25], [9, 20]] },
  'plant.gorse': { bloom: [[2, 15], [6, 10]] }, 'plant.yc-gorse-spray': { bloom: [[2, 15], [6, 10]] }, 'plant.mqn-buddleia': { bloom: [[7, 1], [9, 30]] },
  'tree.hawthorn': { bloom: [[5, 1], [5, 31]] }, 'tree.horse-chestnut': { bloom: [[4, 25], [5, 25]] }, 'tree.green-chestnut': { bloom: [[4, 25], [5, 25]] },
  'tree.cherry': { bloom: [[3, 25], [4, 25]] }, 'tree.cherry-blossom': { bloom: [[3, 25], [4, 25]] }, 'tree.cherry-ai': { bloom: [[3, 25], [4, 25]] },
  'water.lily': { bloom: [[6, 10], [8, 25]] },
  // seasonal props and life (K6, S4)
  'ground.leaf-litter': { when: { months: [10, 11, 12, 1, 2] } }, 'ground.leaves': { when: { months: [10, 11, 12, 1, 2] } },
  'ground.petals': { when: { months: [4, 5] } }, 'ground.hay-bales': { when: { months: [7, 8, 9] }, group: { kind: 'single', size: [1, 1], gap: 10 } },
  'ground.puddle': { when: { weather: ['rain', 'cloud', 'snow'], months: [10, 11, 12, 1, 2, 3, 4] } }, 'ground.monsoon-puddle': { when: { weather: ['rain'] } },
  'sky.wp-mist': { when: { weather: ['fog', 'cloud', 'clear'], hours: [4.5, 9.5] } },
  'animal.butterfly': { cls: 'insect', when: { months: [4, 5, 6, 7, 8, 9], tempMin: 14 } }, 'animal.bee': { cls: 'insect', when: { months: [3, 4, 5, 6, 7, 8, 9], tempMin: 12 } },
  'animal.dragonfly': { cls: 'insect', when: { months: [5, 6, 7, 8, 9], tempMin: 15 } }, 'animal.pond-dragonfly': { cls: 'insect', when: { months: [5, 6, 7, 8, 9], tempMin: 15 } },
  'animal.wyv-dragonfly': { cls: 'insect', when: { months: [5, 6, 7, 8, 9], tempMin: 15 } },
  'animal.wp-bat': { cls: 'bird-air', when: { months: [4, 5, 6, 7, 8, 9, 10], dark: true, tempMin: 8 } },
  'bird.wp-swallow': { cls: 'bird-air', when: { months: [4, 5, 6, 7, 8, 9], dark: false } },
  'bird.proof-duckling': { when: { months: [5, 6, 7] }, size: { poses: { swim: [0.12, 0.2] } } },
  'bird.proof-duckling-qfront': { when: { months: [5, 6, 7] }, size: { poses: { swim: [0.12, 0.2] } } },
  'bird.proof-duckling-qback': { when: { months: [5, 6, 7] }, size: { poses: { swim: [0.12, 0.2] } } },
  'animal.cattle': { when: { months: [4, 5, 6, 7, 8, 9, 10] } }, 'animal.cattle-qfront': { when: { months: [4, 5, 6, 7, 8, 9, 10] } }, 'animal.cattle-qback': { when: { months: [4, 5, 6, 7, 8, 9, 10] } },
  'tree.mcr-xmas-tree': { cls: 'tree', leaf: 'evergreen', habitat: { on: ['paving', 'soil', 'grass'] }, when: { dates: [[11, 14], [1, 6]] } },
  'structure.mcr-market-chalet': { cls: 'market-stall', when: { dates: [[11, 8], [12, 23]], hours: [9.5, 21], days: null } },
  'structure.mcr-market-hut': { cls: 'market-stall', when: { dates: [[11, 8], [12, 23]], hours: [9.5, 21], days: null } },
  // seafront (17 Oct): a kiosk is a stall (paving or a deck, faces its path); a beach hut keeps the facing the scene or its row gives it (a row fans toward the viewer)
  // a kiosk is a little building, not a market stall that is put up on market days: it stands every day and night (closed after hours; 21 Oct)
  'building.kiosk': { cls: 'market-stall', size: { h: [2.6, 4.8] }, when: { days: [0, 1, 2, 3, 4, 5, 6], hours: [-2, 26] } }, 'building.beach-hut': { orient: 'free' }, 'street.bunting': { solidity: 'passable', orient: 'free', clearance: 0 },
  // a lighthouse is scaled by the scene (a cliff-top light is 30 to 45 m): its model height follows its size
  'structure.lighthouse': { size: { h: [16, 48] } },
  'street.mqn-parasol': { cls: 'umbrella', when: { months: [4, 5, 6, 7, 8, 9, 10], hours: [8, 21], weather: _WKB_FINE, tempMin: 11, snowDay: false, weatherOnly: true }, habitat: { on: ['paving', 'deck'] }, solidity: 'solid' },
  'prop.us-beach-umbrella': { cls: 'umbrella', when: { months: [6, 7, 8], hours: [9, 19], weather: ['clear'], tempMin: 18 }, habitat: { on: ['sand', 'paving'] } },
  'person.cafe-goer': { cls: 'cafe-table' },
  'person.picnicker': { cls: 'picnic' },
  'person.busker': { when: { hours: [10, 19], weather: ['clear', 'cloud', 'fog'] } },
  'person.skateboarder': { when: { weather: ['clear', 'cloud'], snowDay: false } },
  'person.commuter': { variantWhen: { 1: { weather: ['rain'] } } },
  'person.child-ball': { when: { hours: [8, 20], weather: ['clear', 'cloud'] } }, 'person.child-jumping': { when: { hours: [8, 20], weather: ['clear', 'cloud', 'rain'] } },
  'person.child-scooter': { when: { hours: [8, 20], weather: ['clear', 'cloud'] } },
  // K8: sizes by pose and age
  'person.bench-sitter': { size: { pose: 'sit' }, habitat: _WKB_FURNITURE, orient: 'path' }, 'person.bench-reader': { size: { pose: 'sit' }, habitat: _WKB_FURNITURE, orient: 'path' },
  'person.wheelchair-user': { size: { pose: 'sit' } },
  'boat.narrowboat': { size: { lRange: [15, 21], wRange: [2.05, 2.15], h: [1.7, 2.1] } }, 'boat.mcf-narrowboat': { size: { lRange: [15, 21], wRange: [2.05, 2.15], h: [1.7, 2.1] } },
  // a fishing boat is one of three model kinds (79-world-4models-vessels.js): a trawler to its masthead 6 m, a potter about 4 m, a coble about 3 m
  'boat.fishing-boat': { size: { h: [2.9, 7] } },
  'boat.narrowboat-ai': { size: { lRange: [15, 21], wRange: [2.05, 2.15] } }, 'boat.canal-view-boat': { size: { lRange: [15, 21], wRange: [2.05, 2.15] } },
  // K1 special habitats
  'tree.wyv-snag': { cls: 'tree', leaf: 'none', habitat: { on: ['soil', 'grass', 'wet', 'water-margin', 'water', 'bank'] }, perch: 'tree' },
  'tree.us-redwood-snag': { leaf: 'none' },
  'tree.fpv-fallen-pine': { cls: 'rock', habitat: { on: ['soil', 'grass', 'wet', 'water-margin', 'water', 'bank'] }, perch: 'top', leaf: 'none' },
  'tree.shp-trunk': { framing: true, leaf: 'none' }, 'tree.fpv-alder-trunk': { framing: true },
  'tree.wp-treeline': { framing: false }, 'ground.log': { solidity: 'solid', foot: 'box', habitat: { on: ['soil', 'grass', 'wet', 'bank', 'heath', 'water-margin'], avoid: ['walk', 'path', 'paving', 'water', 'road-lane', 'rail', 'tram'] }, group: { kind: 'single', size: [1, 1], gap: 8 } },
  'rock.boulder': { group: { kind: 'single', size: [1, 2], gap: 6 }, habitat: { on: ['soil', 'grass', 'heath', 'bank', 'stone', 'sand'] } },
  'water.edge': { habitat: { on: ['bank', 'water-margin', 'wet', 'soil', 'grass'] } }, 'water.chalk-stream': { habitat: { on: ['water', 'water-margin', 'wet'] } },
  // a fountain jet rises from its pool or from the paving (a 'cover' may stand on ground or water; it was drawn in the air, 21 Oct)
  // a jet is solid (the fill once stood a litter bin among the jets, drawn over by the water), and a city fountain is switched off overnight (its in-ground lights glowed under no water at midnight)
  'water.shc-jet': { cls: 'cover', habitat: { on: ['water', 'paving'] }, solidity: 'solid', when: { hours: [7, 22] } }, 'water.shc-bubbler': { cls: 'cover', habitat: { on: ['water', 'paving'] }, solidity: 'passable', when: { hours: [7, 22] } },
  'structure.shp-stepping-stone': { cls: 'rock', habitat: { on: ['water', 'water-margin', 'wet'] }, solidity: 'walkable' },
  'structure.mqn-ole-v2': { cls: 'post', solidity: 'solid' },
  // a bollard stands on land at the edge (a mooring post in the water is its own object): the post class allows water, so a
  // near-band move left a bollard in the canal at the stern and no habitat check caught it (audit bug 5)
  'street.bollard': { cls: 'post', habitat: { on: ['paving', 'path', 'grass-edge', 'grass', 'bank', 'water-margin', 'deck', 'soil'], avoid: ['walkline', 'water', 'road-lane', 'rail', 'tram'] } }, 'prop.yc-windsock': { cls: 'post' },
});

/* ---------- classification ---------- */
const _WKB_FLOWER_RE = /wildflowers|bluebell|daisies|daisy|bluebonnet|lupine|loosestrife|meadowsweet|portland-rose|garden-perennial|tulip|daffodil|poppy|foxglove|primrose|border\b|shp-border/;
const _WKB_EVERGREEN_RE = /pine|spruce|fir\b|-fir|cedar|yew|holly|juniper|redwood|sequoia|palm|sabal|coconut|ohia|hapuu|xmas|conifer|laurel|rhododendron|ivy|bamboo|sasa|gorse|furze|heather|heath-|moor-heather|ling\b|yucca|saguaro|pricklypear|sotol|creosote|ocotillo|bristlecone|live-oak/;
/** The world class of a library object from its id, its tags and its v2 class. */
function _wkbClassify(id, def, c2) {
  const t = String(id), tags = (def && def.tags) || [], has = x => tags.includes(x), cat = (def && def.category) || t.split('.')[0];
  if (/frond/.test(t)) return 'frond';
  if (/bough|branch/.test(t) || (has('bough') && cat !== 'tree')) return 'bough';
  if (has('bough') && /bough/.test(t)) return 'bough';
  if (cat === 'person') {
    if (/picnic/.test(t) || has('picnic')) return 'picnic';
    if (/cafe/.test(t)) return 'cafe-table';
    if (c2 === 'cyclist' || has('cyclist')) return 'cyclist';
    if (c2 === 'boat' || has('kayak') || has('rower') || has('paddleboard') || has('sailor')) return 'boat';
    return 'person';
  }
  if (cat === 'animal' || cat === 'bird') {
    if (has('insect') || /butterfly|\.bee\b|bee$|dragonfly|damselfly|moth/.test(t)) return 'insect';
    if (cat === 'bird') {
      if (/-flight$|flight/.test(t) || c2 === 'bird-air' || c2 === 'air' || /swallow|swift|martin/.test(t)) return /kingfisher-perch/.test(t) ? 'kingfisher' : 'bird-air';
      if (/kingfisher/.test(t)) return 'kingfisher';
      if (/heron|egret/.test(t)) return 'heron';
      if (/swan/.test(t)) return 'swan';
      if (/goose|nene/.test(t)) return 'goose';
      if (/coot|moorhen/.test(t)) return 'coot';
      if (/grebe|loon/.test(t)) return 'grebe';
      if (/mallard|duck|teal|wigeon|pochard|tufted|mandarin|goosander/.test(t)) return 'duck';
      if (/gull|cormorant|pelican|tern/.test(t)) return 'gull';
      return 'bird';
    }
    if (/\bbat\b|-bat$|\.wp-bat/.test(t)) return 'bird-air';
    if (c2 === 'animal-dog' || /\bdog\b|\.dog|dog-/.test(t)) return 'dog';
    if (/dolphin|sea-lion|trout|fish|koi/.test(t)) return 'fish';
    if (c2 === 'animal-graze' || /cattle|cow\b|pony|sheep|horse|deer|donkey|lamb|longhorn|bison|moose|thoroughbred|giraffe/.test(t)) return 'grazer';
    return 'animal';
  }
  if (cat === 'vehicle') {
    if (c2 === 'tram' || has('tram') || has('light-rail') || /light-rail|-rail$|supertram|metrolink/.test(t)) return 'tram';
    if (c2 === 'air' || has('aircraft') || /airliner|aircraft|helicopter|gondola|jet\b|balloon|paraglider/.test(t)) return 'air';
    if (/elevated-train|incline/.test(t) || has('elevated')) return 'train';
    if (c2 === 'bus' || /\bbus\b|bus-|-bus|coach/.test(t)) return 'bus';
    if (/\bvan\b|-van|van-/.test(t)) return 'van';
    if (c2 === 'car' && /car|taxi|cab/.test(t)) return 'car';
    if (c2 === 'car' && !/tuk|wagon/.test(t)) return 'car';
    return 'vehicle';
  }
  if (cat === 'rail') return c2 === 'train' || has('train') ? 'train' : /platform/.test(t) ? 'walkway' : 'rail-kit';
  if (cat === 'boat') return 'boat';
  if (cat === 'sky') return 'air';
  if (cat === 'tree') {
    if (/fallen/.test(t)) return 'rock';
    return 'tree';
  }
  if (cat === 'plant') {
    if ((def && (def.tags || []).includes('role:tree')) || c2 === 'tree') return 'tree';
    if (/reed|bulrush|rush\b|-rush|reedbed|reedmace/.test(t) || has('reedbed') || has('phragmites')) return 'reed';
    if (/hedge/.test(t) || has('hedgerow')) return 'hedge';
    if (_WKB_FLOWER_RE.test(t)) return 'flower';
    if (/planter|flower-tub/.test(t)) return 'street';
    return 'shrub';
  }
  if (cat === 'ground') return 'cover';
  if (cat === 'water') {
    if (/lily/.test(t) || has('water-lily')) return 'lily';
    if (/ring|splash|ripple/.test(t)) return 'fish-ring';
    return 'cover';
  }
  if (cat === 'rock') return 'rock';
  if (cat === 'building') return c2 === 'air' ? 'landmark' : 'building';
  if (cat === 'landmark') return /boardwalk|jetty|pontoon|pier|causeway|footbridge|bridge|viaduct/.test(t) ? 'walkway' : 'landmark';
  if (cat === 'structure') {
    if (/weir/.test(t)) return 'weir';
    if (/market|chalet|stall/.test(t)) return 'market-stall';
    if (/gate/.test(t) && !/gateway|gatehouse|lock-gate/.test(t)) return 'gate';
    if (/boardwalk|jetty|pontoon|platform|causeway|footbridge|bridge|viaduct|deck|walk-v/.test(t)) return /pier$/.test(t) ? 'structure' : 'walkway';
    if (/fence|wall|railing|palisade|quayrail|parapet|frame|lockside|coping/.test(t)) return 'fence';
    if (/lantern|lamp/.test(t)) return 'lamp';
    if (/stepping/.test(t)) return 'rock';
    if (/planter/.test(t)) return 'street';
    return 'structure';
  }
  // street, prop and anything else
  if (/parasol|umbrella|sunshade/.test(t)) return 'umbrella';
  if (/cafe-table|cafe-chair|\btable\b/.test(t)) return 'cafe-table';
  if (/market|stall/.test(t)) return 'market-stall';
  if (/bench|picnic-table/.test(t)) return 'bench';
  if (/lamp|lantern-post|rail-lantern/.test(t)) return 'lamp';
  if (/nameboard|name-board|totem|aboard|a-board|\bsign|signpost|clock|wayfinding/.test(t) || has('sign') || has('wayfinding') || has('a-board')) return 'signage';
  if (/bollard|post\b|post-|windsock|lifebuoy/.test(t)) return 'post';
  if (/gate/.test(t)) return 'gate';
  if (/fence/.test(t)) return 'fence';
  if (/school-bus/.test(t)) return 'bus';
  return 'street';
}
/** The core's coarser class for a kb class (its WORLD_CLASS_INFO tables keep working while the knowledge base is finer). */
function _wkbCoreCls(cls, id) {
  switch (cls) {
    case 'car': case 'van': case 'bus': return 'vehicle';
    case 'bough': case 'frond': case 'flower': return 'shrub';
    case 'insect': return 'bird-air';
    case 'lily': case 'fish-ring': return 'cover';
    case 'market-stall': return 'structure';
    case 'cafe-table': case 'picnic': case 'umbrella': return /^person\./.test(String(id)) ? 'person' : 'street';
    case 'signage': return 'street';
    case 'lead': case 'mooring-line': case 'smoke': case 'washing-line': case 'window-light': return 'air';
    default: return cls;
  }
}
const _wkbClassMemo = new Map();
/** The world class of an object id (a library object, a WORLD_KB_OBJECTS entry or a class name); null if unknown. Never throws. */
function worldKbClassOf(id) {
  try {
    if (typeof id !== 'string' || !id) return null;
    const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
    const hit = _wkbClassMemo.get(id);
    if (hit && hit.def === def) return hit.cls;
    let cls = null;
    const ov = WORLD_KB_OBJECTS[id];
    if (ov && ov.cls) cls = ov.cls;
    else if (def) cls = _wkbClassify(id, def, typeof sceneObjClass === 'function' ? sceneObjClass(id) : null);
    else if (WORLD_KB_CLASSES[id]) cls = id;
    if (cls && !WORLD_KB_CLASSES[cls]) cls = 'street';
    _wkbClassMemo.set(id, { def, cls });
    return cls;
  } catch (e) { return null; }
}

/* ---------- derived parts of a descriptor ---------- */
function _wkbLeafHabit(cls, id, tags, C, ov) {
  if (ov && ov.leaf) return ov.leaf === 'none' ? null : ov.leaf;
  const t = String(id), has = x => tags.includes(x);
  if (cls === 'reed') return 'herb';
  if (cls === 'flower') return 'herb';
  if (!['tree', 'shrub', 'hedge', 'bough', 'frond'].includes(cls)) return null;
  if (/trunk|snag|fallen/.test(t)) return null;
  if (has('evergreen') || has('conifer') || has('palm') || _WKB_EVERGREEN_RE.test(t)) return 'evergreen';
  if (cls === 'shrub' && /grass|meadow|sedge|cotton-grass|sundew|rosette|bilberry|susuki|switchgrass|wheat|clover|sawgrass|sea-oats|beachgrass|bunchgrass/.test(t)) return /bilberry/.test(t) ? 'deciduous' : 'evergreen';
  if (cls === 'shrub' && /bracken|fern|buddleia/.test(t)) return 'herb';
  return C.leaf || 'deciduous';
}
// species phenology: [regex, spring offset (days), autumn offset (days)]
const _WKB_PHENO = [[/willow|sallow/, -10, 10], [/birch/, -6, -12], [/oak/, 8, 12], [/alder/, -4, 6], [/hawthorn|hedge/, -12, 0], [/chestnut/, -10, -20], [/plane/, 10, 8],
  [/beech/, 5, 5], [/sycamore/, -2, -6], [/maple|momiji/, 0, -6], [/cherry|sakura/, -4, -14], [/hazel|coppice/, -16, 0], [/\bash\b|-ash/, 14, -6], [/lime|linden/, 0, -4],
  [/poplar|aspen|cottonwood/, -4, -10], [/bald-cypress|larch/, 5, 5], [/elm/, 0, 0], [/buddleia|bracken|fern/, 10, -5]];
function _wkbPheno(id) { for (const [re, s, a] of _WKB_PHENO) if (re.test(id)) return { spring: s, autumn: a }; return { spring: 0, autumn: 0 }; }
const _WKB_MD = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const _wkbDoyOf = (m, d) => _WKB_MD[_wkbClamp((m | 0) - 1, 0, 11)] + _wkbClamp(d | 0, 1, 31);
/** Materials by part name (V2): the descriptor's default map; the look package colours them. */
function _wkbMaterialOf(part, cls, id, leaf) {
  const p = String(part), t = String(id);
  const needle = leaf === 'evergreen' && /pine|spruce|fir|cedar|yew|juniper|redwood|larch|conifer|xmas|bristlecone/.test(t);
  if (/shadow|reflect|mirror/.test(p)) return null;
  if (/^(trunk|branch|branches|limb|limbs|twigs|bark|stump|log|stem|stems)$/.test(p)) return 'bark';
  if (/^(crown|crowns|leaves|leaf|foliage|whips|canopy-leaves|needles)$/.test(p)) return needle ? 'needle' : 'leaf';
  // flower heads, spikes and blossom are flowers (buddleia spikes, meadow tops, catkins), never leaves
  if (/^(flowers?|blooms?|blossoms?|petals?|spikes?|panicles?|catkins?|heads|tops|umbels?|plumes?)$/.test(p) && ['tree', 'shrub', 'hedge', 'reed', 'flower', 'bough'].includes(cls)) return 'flower';
  if (/^(wake|rings|ring|splash|ripple|ripples|spray|jet|water)$/.test(p)) return 'water';
  if (/^(lit|glass|windows|window|glazing)$/.test(p)) return 'glass';
  if (/^(wheels|wheel|rails|rail|chain|frame)$/.test(p)) return 'metal';
  if (/^(roof|roofs)$/.test(p)) return /cottage|thatch/.test(t) ? 'tile' : 'slate';
  if (/^(rug|blanket|canopy|awning|sail|sails|flag)$/.test(p)) return 'fabric';
  if (/^(chair|table|bike|ball)$/.test(p)) return p === 'ball' ? 'paint' : 'metal';
  if (p === 'bench') return 'timber';
  if (/^(hull|cabin|deck)$/.test(p)) return p === 'deck' ? 'timber' : 'paint';
  if (/^(head|hair|face|hands)$/.test(p)) return ['person', 'cyclist', 'picnic', 'cafe-table', 'umbrella'].includes(cls) ? 'skin' : ['duck', 'coot', 'grebe', 'swan', 'goose', 'heron', 'kingfisher', 'gull', 'bird', 'bird-air'].includes(cls) ? 'feather' : 'fur';
  if (/^(leg|legs|legA|legB|legsNear|legsFar|armA|armB|arms|body|tail|wings|smoke)$/.test(p) || p === 'body') {
    if (p === 'smoke') return null;
    if (['person', 'cyclist', 'picnic', 'cafe-table', 'umbrella'].includes(cls)) return 'fabric';
    if (['dog', 'grazer', 'animal'].includes(cls)) return 'fur';
    if (['duck', 'coot', 'grebe', 'swan', 'goose', 'heron', 'kingfisher', 'gull', 'bird', 'bird-air'].includes(cls)) return 'feather';
    if (cls === 'insect') return 'fabric';
    if (cls === 'fish') return 'water';
  }
  switch (cls) {
    case 'tree': case 'bough': case 'frond': case 'shrub': case 'hedge': return /heather|ling/.test(t) ? 'flower' : 'leaf';
    case 'reed': return 'reed';
    case 'flower': return 'flower';
    case 'lily': return 'leaf';
    case 'fish-ring': return 'water';
    case 'rock': case 'weir': return 'stone';
    case 'boat': case 'car': case 'van': case 'bus': case 'vehicle': case 'tram': case 'train': case 'signage': return 'paint';
    case 'bench': return 'timber';
    case 'lamp': case 'post': return 'metal';
    case 'gate': return /iron|piers|railings/.test(t) ? 'metal' : 'timber';
    case 'fence': return /drystone|stone-wall|moor-wall|field-wall|overlook/.test(t) ? 'stone' : /wall/.test(t) ? 'brick' : /rail|quay|parapet/.test(t) ? 'metal' : 'timber';
    case 'walkway': return /brick|arch|viaduct|railbridge/.test(t) ? 'brick' : /boardwalk|jetty|pontoon|platform|walk-v|deck/.test(t) ? 'timber' : /packhorse|stone/.test(t) ? 'stone' : 'metal';
    case 'building': case 'landmark': return /stone|gritstone|limestone|church|cathedral|castle|hall/.test(t) ? 'stone' : /glass|tower-glass|mcr-glass/.test(t) ? 'glass' : /stucco|townhouse|render|cottage-ai|green-cottage/.test(t) ? 'render' : 'brick';
    case 'cover': return /leaf|leaves/.test(t) ? 'leaf' : /petal/.test(t) ? 'flower' : /puddle|swim|chalk-stream|edge|koi/.test(t) ? 'water' : /paving|setts|joint|cobble|quay|pier/.test(t) ? 'paving' : /ballast|gravel|grit|path|track/.test(t) ? 'gravel' : /sand|beach|dune|gypsum/.test(t) ? 'soil' : /log/.test(t) ? 'bark' : 'grass';
    case 'market-stall': case 'cafe-table': case 'umbrella': return 'fabric';
    case 'structure': case 'street': return /planter|bin|stand|hoop|lifebuoy|totem|statue|column|cross|crane|turbine|windpump|ole/.test(t) ? (/statue|column|cross/.test(t) ? 'stone' : 'metal') : 'stone';
    default: return 'paint';
  }
}
/** Perch points [[u, y, v]] in the object's own frame (u along its length, y up, v across), from its kind and size. */
function _wkbPerches(kind, l, h, w) {
  const R = v => _wkbR3(v);
  switch (kind) {
    case 'post': case 'top': return [[0, R(h), 0]];
    case 'fence': case 'rail': return [[R(-l / 3), R(h), 0], [0, R(h), 0], [R(l / 3), R(h), 0]];
    case 'roof': return [[R(-l / 4), R(h * 0.96), 0], [0, R(h), 0], [R(l / 4), R(h * 0.96), 0]];
    case 'boat': return [[R(-l * 0.25), R(h * 0.82), 0], [R(l * 0.2), R(h * 0.82), 0]];
    case 'tree': return [[R(-l * 0.28), R(h * 0.55), 0], [R(l * 0.24), R(h * 0.64), 0], [0, R(h * 0.82), 0]];
    case 'bough': return [[R(-l * 0.2), R(h * 0.5), 0], [R(l * 0.15), R(h * 0.4), 0]];
    default: return [];
  }
}
/** Region rules from the object's tags (K7): US and Asian kit stays in its region; palms and tropical or desert kit never in the UK. */
function _wkbRegionOf(id, tags, cat) {
  const t = String(id), has = x => tags.includes(x);
  const uk = has('uk') || tags.some(x => /^uk-|^place:uk/.test(x)) || has('london') || has('hampshire');
  const us = has('us') || has('texas') || tags.some(x => /^us-|^place:us|^place:texas/.test(x)) || /\.us-/.test(t);
  const asia = has('asia') || has('japan') || has('china') || has('east-asia') || has('kit:east-asian') || has('kit:shophouse') || tags.some(x => /^asia-|^place:asia/.test(x));
  const r = { only: null, not: null };
  if (/school-bus/.test(t) || has('school-bus')) r.only = ['us'];
  else if (us && !uk) r.only = ['us'];
  else if (asia && !uk) r.only = ['asia'];
  if (has('palm') || /palm|coconut|sabal/.test(t) || has('kit:tropical') || has('tropical') || has('kit:arid') || /desert|tuk-tuk|longtail|sampan|bumboat|junk\b/.test(t)) r.not = ['uk'];
  // a landmark of one real place belongs to that place
  if (cat === 'landmark') {
    const pl = tags.find(x => /^place:uk\//.test(x));
    if (pl) { const a = _wkbAreaAlias(pl.slice(9)); if (a && ['manchester', 'sheffield', 'london', 'nottingham', 'hampshire'].includes(a)) r.only = [a]; }
  }
  return r;
}

/* ---------- regions and areas (K7) ---------- */
const _WKB_AREA_BOXES = [
  ['uk', [49.8, -8.7, 60.9, 1.8]], ['london', [51.28, -0.52, 51.70, 0.34]], ['sheffield', [53.28, -1.62, 53.47, -1.25]], ['manchester', [53.33, -2.75, 53.69, -1.91]],
  ['nottingham', [52.88, -1.30, 53.05, -1.05]], ['hampshire', [50.70, -1.96, 51.39, -0.73]], ['us', [24.4, -125, 49.4, -66.9]], ['us', [51, -180, 72, -129]], ['us', [18.8, -160.5, 22.4, -154.7]],
  ['asia', [-11, 60, 55, 150]], ['europe', [35, -10, 71, 40]],
];
function _wkbAreaAlias(s) {
  const k = String(s || '').toLowerCase().replace(/\s+/g, '-');
  if (!k) return null;
  if (/manchester|salford|trafford|bury|oldham|rochdale|stockport|tameside|wigan|bolton/.test(k)) return 'manchester';
  if (/sheffield|south-yorkshire|rotherham/.test(k)) return 'sheffield';
  if (/london|westminster|camden|southwark|greenwich/.test(k)) return 'london';
  if (/nottingham/.test(k)) return 'nottingham';
  if (/hampshire|fleet|yateley|winchester|southampton|portsmouth/.test(k)) return 'hampshire';
  return k;
}
const _WKB_UK_AREAS = new Set(['uk', 'london', 'sheffield', 'manchester', 'nottingham', 'hampshire', 'england', 'scotland', 'wales', 'yorkshire', 'surrey', 'berkshire', 'norfolk', 'kent', 'devon', 'cornwall', 'cumbria', 'derbyshire', 'peak-district', 'lancashire', 'cheshire', 'merseyside']);
/** The area names of a place: { lat, lon, region, area, country } -> ['uk', 'sheffield', ...]. Unknown place: []. */
function worldKbAreas(place) {
  try {
    const out = new Set();
    if (!place || typeof place !== 'object') return [];
    const lat = place.lat, lon = place.lon;
    if (_wkbNum(lat) && _wkbNum(lon)) for (const [a, b] of _WKB_AREA_BOXES) if (lat >= b[0] && lat <= b[2] && lon >= b[1] && lon <= b[3]) out.add(a);
    if (out.has('uk')) out.delete('europe');
    for (const k of ['region', 'area', 'country', 'county', 'city']) if (typeof place[k] === 'string') {
      const a = _wkbAreaAlias(place[k]);
      if (a) { out.add(a); if (_WKB_UK_AREAS.has(a) || /shire$|^uk-|yorkshire/.test(a)) out.add('uk'); if (a === 'gb' || a === 'united-kingdom') out.add('uk'); }
    }
    return [...out];
  } catch (e) { return []; }
}

/* ---------- the descriptor ---------- */
const _wkbMemo = new Map();
function _wkbPresetFor(id, cls) {
  const B = typeof sceneBehave === 'object' && sceneBehave ? sceneBehave : null;
  let name = null;
  try { name = B && typeof B.presetFor === 'function' ? B.presetFor(id) : null; } catch (e) { name = null; }
  const C = WORLD_KB_CLASSES[cls];
  if (!name && C && C.anim && typeof C.anim.stride === 'string') name = C.anim.stride;
  let p = null;
  try { p = name && B && typeof B.preset === 'function' ? B.preset(name) : null; } catch (e) { p = null; }
  return p ? { preset: name, stepM: p.stepM || null, speedM: p.speedM || null, period: B && typeof B.stride === 'function' && p.stepM ? B.stride(p, p.speedM) : null } : (name ? { preset: name, stepM: null, speedM: null, period: null } : null);
}
function _wkbPartsOf(id, def) {
  if (def && Array.isArray(def.parts) && def.parts.length) return def.parts.slice();
  try { const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(id, 0, 'summer') : null; if (sh && sh.parts) return Object.keys(sh.parts); } catch (e) { /* none */ }
  return ['body'];
}
const _wkbS = (v) => v === 'solid' || v === 'walkable' || v === 'passable' || v === 'overhead';
function _wkbBuild(id) {
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
  const ov = WORLD_KB_OBJECTS[id] || null;
  const cls = worldKbClassOf(id);
  if (!cls) return null;
  const C = WORLD_KB_CLASSES[cls];
  // a class name with no library object: the class descriptor itself (lead, smoke, mooring-line ...)
  if (!def) {
    const d = _wkbMerge(_wkbCopy(C), _wkbCopy(ov ? Object.assign({}, ov, { cls: undefined, bloom: undefined }) : null));
    const bl = (ov && ov.bloom) || d.bloomDefault || null;
    delete d.bloomDefault;
    return Object.assign(d, { id, cls, coreCls: _wkbCoreCls(cls, id), object: false, size: Object.assign({ h: null, h0: null, l: null, w: null }, d.size || {}),
      region: d.region || { only: null, not: null }, bloom: bl ? [_wkbDoyOf(bl[0][0], bl[0][1]), _wkbDoyOf(bl[1][0], bl[1][1])] : null,
      care: { ok: true, text: false, flags: false, faces: false, symbols: false, hand: false, ignoreParts: [], reason: '' }, material: {}, perch: [], variants: 1, pheno: null });
  }
  const tags = def.tags || [], cat = def.category || String(id).split('.')[0];
  const c2 = typeof sceneObjClass === 'function' ? sceneObjClass(id) : null;
  const real = typeof sceneObjReal === 'function' ? sceneObjReal(id) : { h: 1, l: 1, w: 0.6, src: 'none' };
  const mv = typeof sceneMoverSize === 'function' ? sceneMoverSize(id) : null;
  const d = _wkbCopy(C);
  // K8: size. Movers keep the v2 real size classes (a duck 0.35 m, a person 1.7 m); everything else its real table size
  const moverCls = ['person', 'cyclist', 'picnic', 'cafe-table', 'umbrella', 'dog', 'duck', 'coot', 'grebe', 'swan', 'goose', 'heron', 'kingfisher', 'gull', 'bird', 'grazer', 'animal', 'fish'];
  const size = Object.assign({}, d.size || {}, ov && ov.size ? ov.size : null);
  const ageChild = cls !== 'cafe-table' && (/child|kid/.test(id) && !/family/.test(id));
  const pose = size.pose || (tags.includes('sitting') || /sitter|reader|picnic|cafe|wheelchair/.test(id) ? 'sit' : cls === 'duck' || cls === 'coot' || cls === 'grebe' || cls === 'swan' ? 'swim' : cls === 'kingfisher' ? 'perch' : cls === 'cyclist' ? 'ride' : 'stand');
  size.pose = pose; size.age = ageChild ? 'child' : 'adult';
  // K8: people keep the shared figure's metric (a seated figure ~1.3 m, a child ~1.1 m), never the v2 1.7 m mover class;
  // animals keep the v2 real size classes (a duck 0.35 m, a swan 0.6, a cow 1.4); everything else its real table size
  const personLike = cat === 'person' && ['person', 'cyclist', 'picnic', 'cafe-table', 'umbrella'].includes(cls);
  let h0 = moverCls.includes(cls) && mv && mv.size ? mv.h : real.h;
  if (personLike) {
    const pr = (size.age === 'child' && size.child && size.child[pose]) || (size.poses && size.poses[pose]) || [1.6, 1.9];
    h0 = real.h >= 0.6 && real.h <= 2.1 && (real.src === 'table' || real.src === 'def') ? real.h : (pr[0] + pr[1]) / 2;
  }
  let hr = null;
  if (size.poses) hr = (size.age === 'child' && size.child && size.child[pose]) || size.poses[pose] || size.poses.stand || null;
  // a class range (a car 1.4-1.6 m) holds for objects of about that size; an odd object (a London cab, 1.8 m) keeps its own
  if (!hr && Array.isArray(size.h)) hr = h0 >= size.h[0] * 0.9 && h0 <= size.h[1] * 1.1 ? size.h : [_wkbR3(h0 * 0.97), _wkbR3(h0 * 1.03)];
  if (!hr) {
    const k = cls === 'tree' ? [0.75, 1.25] : (cls === 'shrub' || cls === 'flower' || cls === 'reed' || cls === 'cover') ? [0.75, 1.25] : moverCls.includes(cls) ? [0.92, 1.08] : [1, 1];
    hr = [_wkbR3(h0 * k[0]), _wkbR3(h0 * k[1])];
  }
  size.h = hr; size.h0 = _wkbR3(h0); size.l = _wkbR3(real.l || h0); size.w = _wkbR3(real.w || Math.min(real.l || h0, h0) * 0.6); size.src = real.src || null;
  d.size = size;
  d.id = id; d.cls = cls; d.coreCls = _wkbCoreCls(cls, id); d.object = true; d.category = cat; d.v2 = c2;
  d.variants = Math.max(1, def.variants | 0); d.variantNames = Array.isArray(def.variantNames) ? def.variantNames.slice() : null;
  d.seasonal = def.seasonal !== false;
  d.leaf = _wkbLeafHabit(cls, id, tags, C, ov);
  d.evergreen = d.leaf === 'evergreen';
  // flat ground marks (leaf litter, paving wear, puddles, petals, lily pads, rings): drawn as decals on the ground, under movers
  d.decal = ['cover', 'lily', 'fish-ring', 'flower'].includes(cls) && h0 <= 0.15;
  // stops for traffic (A9): tram shelters and stops, bus stops
  d.stop = /tram/.test(id) && (tags.includes('tram-stop') || tags.includes('shelter') || /tramstop|tram-shelter|tram-stop/.test(id)) ? 'tram' : (tags.includes('bus-stop') && cat !== 'person') || /bus-stop|bus-shelter/.test(id) ? 'bus' : null;
  d.pheno = d.leaf === 'deciduous' || d.leaf === 'herb' ? _wkbPheno(id) : null;
  d.framing = !!(d.framing || tags.includes('frame') || tags.includes('framing') || tags.includes('role:frame'));
  if (cls === 'tree' && !(tags.includes('frame') || tags.includes('framing') || /trunk/.test(id))) d.framing = false;
  // floating things: the object units below the waterline (sceneMoverSize sink) in metres (as the core does)
  d.floats = !!d.floats;
  d.sink = d.floats && mv && mv.top > 0 ? _wkbR3(mv.sink * h0 / mv.top) : 0;
  if (cls === 'tree') d.trunkR = _wkbR3(Math.max(0.2, 0.025 * h0));
  d.r = _wkbR3(cls === 'tree' ? d.trunkR : (cls === 'lamp' || cls === 'post' || cls === 'signage') ? Math.min(0.15, Math.max(0.05, Math.min(size.l, size.w) / 2)) : Math.max(0.05, Math.min(size.l, size.w) / 2));
  // v2 placement knowledge (SCENE_PLACE_RULES): the snap radius, the kerbside clearance, beaching kinds
  const R = typeof SCENE_PLACE_RULES === 'object' && SCENE_PLACE_RULES && c2 ? SCENE_PLACE_RULES[c2] : null;
  d.snap = R && _wkbNum(R.snap) ? R.snap : 2;
  if (R && _wkbNum(R.kerbside)) d.clearance = Math.max(d.clearance || 0, R.kerbside);
  if (R && R.beached) d.habitat = Object.assign({}, d.habitat, { beached: worldKbSurfaceTags('beach').slice() });
  // K6 bloom windows; the night light kind
  const bloom = (ov && ov.bloom) || d.bloomDefault || null;
  d.bloom = bloom ? [_wkbDoyOf(bloom[0][0], bloom[0][1]), _wkbDoyOf(bloom[1][0], bloom[1][1])] : null;
  delete d.bloomDefault;
  const glow = def.night && def.night.glow ? Object.keys(def.night.glow) : [];
  if (!d.lit && (glow.includes('window') || glow.includes('lamp'))) d.lit = cls === 'lamp' ? 'lamp' : ['car', 'van', 'bus', 'tram', 'train', 'vehicle'].includes(cls) ? 'vehicle' : 'window';
  if (d.lit && !glow.length && !(def.parts || []).includes('lit') && !['lamp', 'car', 'van', 'bus', 'vehicle'].includes(cls)) d.lit = null;
  // K7 region, K9 care
  d.region = _wkbRegionOf(id, tags, cat);
  d.care = worldKbCare(id);
  // materials by part name, perch points, deck hint
  const parts = _wkbPartsOf(id, def), mat = {};
  for (const p of parts) { const m = _wkbMaterialOf(p, cls, id, d.leaf); if (m) mat[p] = m; }
  const dflt = _wkbMaterialOf('*', cls, id, d.leaf);
  if (dflt) mat['*'] = dflt;
  d.material = mat;
  d.perch = typeof d.perch === 'string' ? _wkbPerches(d.perch, size.l, size.h0, size.w) : [];
  // the drawn box about the anchor in metres (x right, y up; unmirrored): a standing thing spans [-l/2, 0, l/2, h]; a framing bough
  // or frond is anchored where it enters the frame and hangs below it (hang: true)
  d.art = null; d.hang = false;
  try {
    const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(id, 0, 'summer') : null, b = sh && sh.box, sz = def.size;
    if (Array.isArray(b) && b.length === 4 && Array.isArray(sz) && sz[1] > 0) {
      const m = (real.h || h0) / sz[1];
      d.art = [_wkbR3(b[0] * m), _wkbR3(-b[3] * m), _wkbR3(b[2] * m), _wkbR3(-b[1] * m)];
      d.hang = b[3] > 0.5 * (b[3] - b[1]);
    }
  } catch (e) { d.art = null; }
  if (cls === 'walkway') d.deck = { y: _wkbR3(h0 > 3 ? h0 * 0.55 : Math.min(h0, 1.2)) };
  else if (cls === 'boat' && h0 < 6 && size.l > 5) d.deck = { y: _wkbR3(h0 * 0.8), inset: 0.4 };
  else d.deck = null;
  // bridges, viaducts and footbridges are overhead to what passes beneath; low boardwalks are walkable
  if (cls === 'walkway') d.solidity = /bridge|viaduct|footbridge|railbridge|arch/.test(id) ? 'overhead' : 'walkable';
  if (ov && _wkbS(ov.solidity)) d.solidity = ov.solidity;
  // A6, M1, M3: animation (the v2 behaviour presets, so the stride matches the v2 walk hooks)
  // stride: metres a walk cycle (two steps) at the gait's reference speed, so rate = speed / stride (A6, no sliding feet)
  const gait = _wkbPresetFor(id, cls) || null;
  d.anim = Object.assign({}, d.anim, { stride: gait && _wkbNum(gait.stepM) ? _wkbR3(2 * gait.stepM) : null, gait, hooks: def.anim ? Object.keys(def.anim) : [] });
  if (cls === 'tree' || cls === 'shrub' || cls === 'reed' || cls === 'flower' || cls === 'hedge') d.anim.stiffness = _wkbR3(_wkbClamp((d.anim.stiffness || 0.5) * (cls === 'tree' ? Math.min(1.15, 0.7 + h0 / 60) : 1), 0.05, 1));
  // the per-object override wins
  let out = d;
  if (ov) {
    const o2 = Object.assign({}, ov); delete o2.cls;
    if (o2.bloom) delete o2.bloom;
    if (o2.leaf) delete o2.leaf;
    out = _wkbMerge(d, _wkbCopy(o2));
    if (ov.region) out.region = Object.assign({ only: null, not: null }, ov.region);
    if (ov.when) out.when = Object.assign({}, d.when || {}, ov.when);
  }
  return out;
}
/**
 * The knowledge-base descriptor of a library object (WORLD_ENGINE.md 1.3), or of a class name with no object (lead, smoke ...):
 * { id, cls, habitat, foot, solidity, clearance, size: { h: [min, max], h0, l, w, pose, age, poses, ages }, orient, parent, group,
 *   when, region, liveries, swap, care, floats, sink, perch, deck, material, anim: { clips, stride (m a cycle), gait, idle, stiffness,
   secondary }, leaf, evergreen, pheno, bloom, lit, snow, framing, decal, art, hang, stop, coreCls, variants }.
 * Frozen and memoised (a redefined object is looked up again); null for an unknown id. Never throws.
 */
function worldKb(id) {
  try {
    if (typeof id !== 'string' || !id) return null;
    const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
    const hit = _wkbMemo.get(id);
    if (hit && hit.def === def) return hit.kb;
    const kb = _wkbBuild(id);
    const r = kb ? _wkbFreeze(kb) : null;
    _wkbMemo.set(id, { def, kb: r });
    return r;
  } catch (e) { return null; }
}
const _wkbOf = (kb) => typeof kb === 'string' ? worldKb(kb) : (kb && typeof kb === 'object' ? kb : null);

/* ---------- K9: care ---------- */
const _wkbCareMemo = new Map();
/** The care flags of an object (K9): true means it breaks a rule (readable text, flags, faces, political or military symbols);
    ignoreParts lists library parts drawn as hand shadows or reflections (L3: never drawn). ok = no flag set. */
function worldKbCare(id) {
  try {
    const def = typeof sceneObj === 'function' && typeof id === 'string' ? sceneObj(id) : null;
    const hit = _wkbCareMemo.get(id);
    if (hit && hit.def === def) return hit.r;
    const t = String(id), tags = (def && def.tags) || [], has = x => tags.includes(x), cat = (def && def.category) || t.split('.')[0];
    const text = (has('text') || has('lettering') || has('logo') || has('brand') || /logo|brand|lettering|-text\b/.test(t) || ((has('sign') || has('name-board')) && !has('blank') && !has('wayfinding')));
    const flags = has('flag') || has('banner') || has('ensign') || /\bflag\b|-flag|flag-|banner/.test(t);
    const symbols = has('military') || has('political') || has('emblem') || has('coat-of-arms') || /swastika|insignia|emblem|coat-of-arms/.test(t);
    const faces = cat === 'person' && !(has('anonymous') || has('silhouette'));
    const hand = /reflection|-shadow\b|shadow-/.test(t);
    let ignoreParts = [];
    if (def) {
      const parts = Array.isArray(def.parts) ? def.parts : [];
      ignoreParts = parts.filter(p => /shadow|reflect|mirror/i.test(p));
    }
    const reason = text ? 'readable text' : flags ? 'a flag' : symbols ? 'a political or military symbol' : faces ? 'an identifiable person (no anonymous or silhouette tag)' : hand ? 'a hand-drawn reflection or shadow' : '';
    const r = Object.freeze({ ok: !(text || flags || symbols || faces || hand), text: !!text, flags: !!flags, faces: !!faces, symbols: !!symbols, hand: !!hand, ignoreParts: Object.freeze(ignoreParts), reason });
    _wkbCareMemo.set(id, { def, r });
    return r;
  } catch (e) { return Object.freeze({ ok: true, text: false, flags: false, faces: false, symbols: false, hand: false, ignoreParts: Object.freeze([]), reason: '' }); }
}

/* ---------- K7: region and liveries ---------- */
/** May this object exist at this place? { ok, reason, swap } (swap: a local equivalent object id when there is one). Unknown place: ok. */
function worldKbRegionOk(kb, place) {
  try {
    kb = _wkbOf(kb);
    if (!kb) return { ok: false, reason: 'no descriptor', swap: null };
    const areas = worldKbAreas(place);
    if (!areas.length) return { ok: true, reason: 'unknown place', swap: null };
    const R = kb.region || {}, set = new Set(areas);
    let bad = null;
    if (Array.isArray(R.only) && R.only.length && !R.only.some(a => set.has(a))) bad = `${kb.id} belongs to ${R.only.join(' / ')}, not ${areas.join(' / ')}`;
    if (!bad && Array.isArray(R.not) && R.not.some(a => set.has(a))) bad = `${kb.id} does not belong in ${R.not.filter(a => set.has(a)).join(' / ')}`;
    if (!bad) return { ok: true, reason: '', swap: null };
    let swap = null;
    if (kb.swap) for (const a of areas.slice().sort((x, y) => (x === 'uk') - (y === 'uk'))) if (kb.swap[a]) { swap = kb.swap[a]; break; }
    return { ok: false, reason: bad, swap };
  } catch (e) { return { ok: true, reason: 'error', swap: null }; }
}
/** A variant for this object at this place (K7 liveries, A11 variety): the most local livery list, minus variants whose own
    `when` fails at o.ctx (an umbrella up only in rain); rnd: a function or a number in [0, 1). */
function worldKbVariant(kb, place, rnd, o) {
  try {
    kb = _wkbOf(kb);
    const n = kb && kb.variants ? kb.variants : 1, r = _wkbRnd(rnd);
    let list = null;
    const L = kb && kb.liveries;
    if (L) {
      const areas = worldKbAreas(place);
      for (const a of areas.filter(x => x !== 'uk').concat(areas.filter(x => x === 'uk'))) if (Array.isArray(L[a])) { list = L[a]; break; }
      if (!list && Array.isArray(L.default)) list = L.default;
    }
    if (!list) list = Array.from({ length: n }, (_, i) => i);
    list = list.filter(v => Number.isInteger(v) && v >= 0 && v < n);
    const ctx = o && o.ctx;
    if (kb && kb.variantWhen && ctx) {
      const ok = list.filter(v => !kb.variantWhen[v] || worldKbWhen({ when: kb.variantWhen[v] }, ctx).ok);
      if (ok.length) list = ok;
    }
    if (!list.length) return 0;
    return list[Math.min(list.length - 1, Math.floor(r() * list.length))];
  } catch (e) { return 0; }
}

/* ---------- K1: habitat ---------- */
function _wkbProbeTags(p) {
  if (!p) return new Set();
  const out = new Set(Array.isArray(p.tags) ? p.tags : worldKbSurfaceTags(p.kind == null && !p.surface ? null : (p.kind || (p.surface && p.surface.kind))));
  if (p.pit) out.add('pit');
  // the core's probe names the walking line 'path-line'; both names mean the central 1.2 m of a path (P3)
  if (out.has('path-line')) out.add('walkline');
  if (out.has('walkline')) out.add('path-line');
  return out;
}
/**
 * Is this probe a legal place for this object (K1)? probe: the core's probe { kind, tags, waterDist, bankDist, pathDist, calm, pit,
 * moored, under, anchor, ... }; one probe is one point of the footprint (water things keep `inset` from the bank there); probe.anchor
 * === true marks the anchor of a floater judged alone (it keeps inset + half its width); an ARRAY of probes is the whole footprint
 * (every point must pass). -> { ok, reason }.
 */
function worldKbHabitatOk(kb, probe) {
  try {
    kb = _wkbOf(kb);
    if (!kb) return { ok: false, reason: 'no descriptor' };
    const H = kb.habitat || { on: [] }, on = H.on || [];
    if (on.includes('attached')) return { ok: true, reason: 'attached: judged by its parent (K4)' };
    if (on.includes('air') && on.length === 1) return { ok: true, reason: 'in the air' };
    if (Array.isArray(probe)) {
      if (!probe.length) return { ok: false, reason: 'no footprint' };
      for (const p of probe) { const r = _wkbHabitatOne(kb, p, false); if (!r.ok) return r; }
      return { ok: true, reason: '' };
    }
    return _wkbHabitatOne(kb, probe, true);
  } catch (e) { return { ok: false, reason: 'habitat check failed: ' + (e && e.message) }; }
}
function _wkbHabitatOne(kb, p, anchor) {
  if (!p || typeof p !== 'object') return { ok: false, reason: 'no ground here' };
  const H = kb.habitat || {}, tags = _wkbProbeTags(p);
  if (p.under && kb.solidity === 'solid' && (kb.size && kb.size.h0 > 3) && kb.cls !== 'walkway') return { ok: false, reason: 'under an overhead span' };
  for (const a of H.avoid || []) if (tags.has(a)) {
    if (a === 'walkline' && p.blocks === true) continue;
    return { ok: false, reason: `${kb.cls} never stands on ${a}` };
  }
  let ok = (H.on || []).some(t => tags.has(t)) || (tags.has('perch') && (H.on || []).includes('perch'));
  if (!ok && Array.isArray(H.pit) && (p.pit === true) && H.pit.some(t => tags.has(t))) ok = true;
  if (!ok && H.alt && p.pose && Array.isArray(H.alt[p.pose]) && H.alt[p.pose].some(t => tags.has(t))) ok = true;
  if (!ok && Array.isArray(H.beached) && p.beached === true && H.beached.some(t => tags.has(t))) ok = true;
  if (!ok) return { ok: false, reason: `${kb.cls} lives on ${(H.on || []).join(' | ')}; here is ${[...tags].join(', ') || 'nothing'}` };
  // water things keep off the banks (the WHOLE footprint inside the water)
  if (tags.has('water') && (H.on || []).includes('water') && kb.cls !== 'walkway' && kb.cls !== 'landmark' && kb.cls !== 'structure' && kb.cls !== 'weir') {
    // a probe marked as the anchor (probe.anchor) keeps half the hull too; a footprint point keeps the inset only
    const inset = _wkbNum(H.inset) ? H.inset : 0, half = anchor && p.anchor === true && kb.floats && kb.size ? Math.min(kb.size.w || 0, kb.size.l || 0) / 2 : 0;
    if (_wkbNum(p.bankDist) && p.bankDist + 1e-6 < inset + half) return { ok: false, reason: `${kb.cls} must keep ${_wkbR3(inset + half)} m off the bank (it is ${_wkbR3(p.bankDist)} m)` };
    if (anchor && p.moored === true && _wkbNum(H.moored) && _wkbNum(p.bankDist) && p.bankDist > inset + (kb.size ? Math.min(kb.size.w || 0, kb.size.l || 0) / 2 : 0) + H.moored) return { ok: false, reason: 'a moored boat lies alongside the bank' };
    if (H.calm && p.calm === false) return { ok: false, reason: `${kb.cls} needs calm water` };
  }
  if (kb.cls === 'reed' && tags.has('water') && !tags.has('water-margin')) return { ok: false, reason: 'reeds grow in the margin, not in open water' };
  return { ok: true, reason: '' };
}

/* ---------- K3: orientation ---------- */
const _wkbNorm = a => ((a % 360) + 360) % 360;
/** The UK drives on the LEFT: SCENE_DRIVE_LEFT boxes for a place (default left). */
function _wkbDriveSide(probe) {
  if (probe && (probe.drive === 'left' || probe.drive === 'right')) return probe.drive;
  const pl = (probe && probe.place) || probe || {}, lat = pl.lat, lon = pl.lon;
  if (_wkbNum(lat) && _wkbNum(lon) && typeof SCENE_DRIVE_LEFT === 'object' && SCENE_DRIVE_LEFT && Array.isArray(SCENE_DRIVE_LEFT.boxes))
    return SCENE_DRIVE_LEFT.boxes.some(b => lat >= b[0] && lat <= b[2] && lon >= b[1] && lon <= b[3]) ? 'left' : 'right';
  return 'left';
}
/**
 * The facing the rules give this object at this probe (K3): { facing, either, lookAt, along, rule, tol, reason }. Boats, cars,
 * trains and gates: facing is the direction of their LENGTH (parallel to the bank, along the lane on the drive side, along the
 * rails, in the fence line); front classes (benches, buildings, stalls, signs): facing is where the front looks (the path,
 * the view, the street) and `along` is their length. either = the reverse is as good (moored boats, rails, gates); tol: the
 * tolerance in degrees. facing null = the rule needs a probe field it lacks (bankDir, laneDir | roadDir + roadSide, railDir,
 * toPath | pathDir, toWater, fenceDir, toRoad) or the class is free.
 */
function worldKbOrient(kb, probe) {
  try {
    kb = _wkbOf(kb);
    const rule = kb ? kb.orient || 'free' : 'free', p = probe || {};
    const R = (facing, either, x) => Object.assign({ facing: facing == null ? null : _wkbR3(_wkbNorm(facing)), either: !!either, lookAt: null, rule, tol: either ? 20 : 15, reason: '' }, x || {});
    switch (rule) {
      case 'bank': {
        const d = _wkbNum(p.bankDir) ? p.bankDir : _wkbNum(p.channelDir) ? p.channelDir : null;
        return d == null ? R(null, true, { reason: 'no bankDir in the probe' }) : R(d, true);
      }
      case 'lane': {
        const side = _wkbDriveSide(p);
        if (_wkbNum(p.roadDir) && (p.roadSide === 1 || p.roadSide === -1)) {
          // roadSide -1: left of the centre line looking along roadDir; keeping LEFT that lane runs along roadDir
          const along = (side === 'left') === (p.roadSide < 0);
          return R(along ? p.roadDir : p.roadDir + 180, false, { drive: side });
        }
        if (_wkbNum(p.laneDir)) return R(p.laneDir, false, { drive: side });
        return R(null, false, { reason: 'no laneDir or roadDir + roadSide in the probe', drive: side });
      }
      case 'rail': return _wkbNum(p.railDir) ? R(p.railDir, true) : _wkbNum(p.laneDir) ? R(p.laneDir, true) : R(null, true, { reason: 'no railDir in the probe' });
      // front classes (benches, buildings, stalls, signs): facing is where the FRONT looks (the core's footprint puts their length
      // across it); along = the direction of their length
      case 'path': case 'view': {
        const look = rule === 'path' ? (_wkbNum(p.toPath) ? p.toPath : _wkbNum(p.toWater) ? p.toWater : null) : (_wkbNum(p.toWater) ? p.toWater : _wkbNum(p.toView) ? p.toView : _wkbNum(p.toPath) ? p.toPath : null);
        if (look != null) return R(look, false, { lookAt: _wkbR3(_wkbNorm(look)), along: _wkbR3(_wkbNorm(look + 90)), tol: 35 });
        if (rule === 'path' && _wkbNum(p.pathDir)) return R(p.pathDir + 90, true, { along: _wkbR3(_wkbNorm(p.pathDir)), reason: 'beside a path: either side' });
        return R(rule === 'view' ? 0 : null, false, { lookAt: rule === 'view' ? 0 : null, reason: rule === 'view' ? 'faces the view (away from the camera)' : 'no toPath or pathDir in the probe' });
      }
      case 'street': {
        const look = _wkbNum(p.toRoad) ? p.toRoad : _wkbNum(p.toPath) ? p.toPath : null;
        if (look != null) return R(look, false, { lookAt: _wkbR3(_wkbNorm(look)), along: _wkbR3(_wkbNorm(look + 90)), tol: 30 });
        if (_wkbNum(p.roadDir) || _wkbNum(p.pathDir)) { const d = _wkbNum(p.roadDir) ? p.roadDir : p.pathDir; return R(d + 90, true, { along: _wkbR3(_wkbNorm(d)) }); }
        return R(null, false, { reason: 'no street near' });
      }
      case 'fence': return _wkbNum(p.fenceDir) ? R(p.fenceDir, true) : R(null, true, { reason: 'no fenceDir in the probe' });
      default: return R(null, true, { rule: 'free' });
    }
  } catch (e) { return { facing: null, either: true, lookAt: null, rule: 'free', tol: 180, reason: 'orient failed' }; }
}

/* ---------- K4: parents ---------- */
/**
 * Is `parent` a legal parent for `child` (K4)? child / parent: entity records { x, y, z, obj, cls, height } in camera metres;
 * o.cam: the camera (to judge "in frame or just outside it on the same side"). -> { ok, reason }.
 */
function worldKbParentOk(kb, child, parent, o) {
  try {
    kb = _wkbOf(kb);
    const P = kb && kb.parent;
    if (!P) return { ok: true, reason: 'no parent rule' };
    if (!parent) return P.optional ? { ok: true, reason: 'optional' } : { ok: false, reason: `a ${kb.cls} needs a ${P.cls.join(' or ')}` };
    const pk = parent.obj ? worldKb(parent.obj) : null, pc = (pk && pk.cls) || parent.cls;
    if (!P.cls.includes(pc)) return { ok: false, reason: `a ${kb.cls} hangs from a ${P.cls.join(' or ')}, not a ${pc}` };
    if (P.match && !new RegExp(P.match).test(String(parent.obj || ''))) return { ok: false, reason: `a ${kb.cls} needs a ${P.match}` };
    if (!child) return { ok: true, reason: '' };
    const dx = (child.x || 0) - (parent.x || 0), dz = (child.z || 0) - (parent.z || 0), reach = _wkbNum(P.reach) ? P.reach : Infinity;
    const ph = _wkbNum(parent.height) ? parent.height : pk && pk.size ? pk.size.h0 : 10;
    const reachM = P.anchor === 'trunk' ? Math.max(reach, ph * 0.75) : reach;
    if (Math.hypot(dx, dz) > reachM + 1e-6) return { ok: false, reason: `the ${kb.cls} is ${_wkbR3(Math.hypot(dx, dz))} m from its ${pc} (reach ${_wkbR3(reachM)} m)` };
    if (P.side === 'same' && Math.abs(child.x || 0) > 0.5 && Math.abs(parent.x || 0) > 0.5 && Math.sign(child.x) !== Math.sign(parent.x)) return { ok: false, reason: `the ${kb.cls} and its ${pc} are on opposite sides` };
    if (Array.isArray(P.height) && _wkbNum(child.y)) {
      const rel = (child.y - (parent.y || 0)) / Math.max(0.1, ph);
      if (rel < P.height[0] - 1e-6 || rel > P.height[1] + 1e-6) return { ok: false, reason: `the ${kb.cls} hangs at ${Math.round(rel * 100)} % of its ${pc}'s height` };
    }
    const cam = o && o.cam;
    if (P.frame && cam && _wkbNum(cam.f) && _wkbNum(parent.z) && parent.z > 0) {
      // the trunk is in frame or just outside it (within a quarter of the frame width) on the same side
      const X = cam.x0 + cam.f / parent.z * parent.x, W = (o && o.W) || 1600;
      if (X < -0.25 * W || X > 1.25 * W) return { ok: false, reason: `the ${kb.cls}'s ${pc} is far outside the frame` };
    }
    return { ok: true, reason: '' };
  } catch (e) { return { ok: false, reason: 'parent check failed' }; }
}

/* ---------- K6: when ---------- */
function _wkbCtxDoy(ctx) {
  if (_wkbNum(ctx.doy)) return _wkbClamp(Math.round(ctx.doy), 1, 366);
  if (_wkbNum(ctx.ms)) { const d = new Date(ctx.ms), y0 = Date.UTC(d.getUTCFullYear(), 0, 1); return Math.floor((ctx.ms - y0) / 86400000) + 1; }
  if (_wkbNum(ctx.month)) { const m = ctx.month === 0 ? 1 : _wkbClamp(Math.round(ctx.month), 1, 12); return _WKB_MD[m - 1] + 15; }
  return null;
}
function _wkbCtxMonth(ctx, doy) {
  if (doy != null) { let m = 1; for (let i = 11; i >= 0; i--) if (doy > _WKB_MD[i]) { m = i + 1; break; } return m; }
  if (_wkbNum(ctx.month)) return ctx.month === 0 ? 1 : _wkbClamp(Math.round(ctx.month), 1, 12);
  return null;
}
function _wkbCtxHour(ctx) {
  if (_wkbNum(ctx.hour)) return ((ctx.hour % 24) + 24) % 24;
  if (_wkbNum(ctx.ms)) { const d = new Date(ctx.ms); return d.getUTCHours() + d.getUTCMinutes() / 60; }
  return null;
}
function _wkbCtxDow(ctx) {
  if (_wkbNum(ctx.dow)) return ((Math.round(ctx.dow) % 7) + 7) % 7;
  if (_wkbNum(ctx.ms)) return new Date(ctx.ms).getUTCDay();
  return null;
}
const _wkbWeekend = (ctx, dow) => typeof ctx.weekend === 'boolean' ? ctx.weekend : dow == null ? false : (dow === 0 || dow === 6);
const _wkbSeasonOf = (doy) => doy == null ? null : doy < 60 || doy >= 335 ? 'winter' : doy < 152 ? 'spring' : doy < 244 ? 'summer' : 'autumn';
function _wkbInHours(h, r) { if (!Array.isArray(r) || h == null) return true; return r[0] <= r[1] ? (h >= r[0] && h < r[1]) : (h >= r[0] || h < r[1]); }
function _wkbInDates(doy, dates) {
  if (!Array.isArray(dates) || doy == null) return true;
  const a = _wkbDoyOf(dates[0][0], dates[0][1]), b = _wkbDoyOf(dates[1][0], dates[1][1]);
  return a <= b ? (doy >= a && doy <= b) : (doy >= a || doy <= b);
}
function _wkbWeatherOf(ctx) { const w = typeof ctx.weather === 'string' ? ctx.weather : null; return w === 'drizzle' || w === 'showers' ? 'rain' : w === 'overcast' ? 'cloud' : w; }
function _wkbDark(ctx) {
  if (typeof ctx.dark === 'boolean') return ctx.dark;
  if (_wkbNum(ctx.dark)) return ctx.dark > 0.5;
  let a = ctx.sun && _wkbNum(ctx.sun.alt) ? ctx.sun.alt : null;
  // a time context without a sun record (the life's own: ms, lat, lon): the almanac's sun, so a night's density is a night's (gulls and
  // pigeons flew over the night harbour because 'dark' was unknown here: the night-light audit)
  if (a == null && _wkbNum(ctx.ms) && typeof almSunPosition === 'function') { try { const p = almSunPosition(ctx.ms, _wkbNum(ctx.lat) ? ctx.lat : 51.5, _wkbNum(ctx.lon) ? ctx.lon : 0); if (p && _wkbNum(p.alt)) a = p.alt; } catch (e) { a = null; } }
  return a == null ? null : a < -4;
}
/**
 * K6: is this class present at this time, and how much of a population (share 0..1)? ctx: the WorldTimeCtx (11.11).
 * when: { months: [1..12], dates: [[m, d], [m, d]], hours: [h0, h1], days: [dow], weather: [...], tempMin, tempMax, snowDay: false,
 * dark: true | false }. -> { ok, share, why } (why names the failing rule). No ctx or no when: { ok: true, share: 1 }.
 */
function worldKbWhen(kb, ctx) {
  try {
    kb = _wkbOf(kb);
    const w = kb && kb.when;
    if (!w || !ctx || typeof ctx !== 'object') return { ok: true, share: 1, why: '' };
    const doy = _wkbCtxDoy(ctx), month = _wkbCtxMonth(ctx, doy), hour = _wkbCtxHour(ctx), dow = _wkbCtxDow(ctx), weather = _wkbWeatherOf(ctx), dark = _wkbDark(ctx);
    const no = why => ({ ok: false, share: 0, why });
    if (Array.isArray(w.months) && month != null && !w.months.includes(month)) return no('months');
    if (Array.isArray(w.dates) && !_wkbInDates(doy, w.dates)) return no('dates');
    if (Array.isArray(w.days) && dow != null && !w.days.includes(dow)) return no('days');
    if (Array.isArray(w.hours) && !_wkbInHours(hour, w.hours)) return no('hours');
    if (Array.isArray(w.weather) && weather && !w.weather.includes(weather)) return no('weather');
    if (w.snowDay === false && (ctx.snowDay === true || ctx.snowing === true)) return no('snow');
    if (w.dark === true && dark === false) return no('daylight');
    if (w.dark === false && dark === true) return no('dark');
    if (_wkbNum(w.tempMin) && _wkbNum(ctx.temp) && ctx.temp < w.tempMin) return no('cold');
    if (_wkbNum(w.tempMax) && _wkbNum(ctx.temp) && ctx.temp > w.tempMax) return no('warm');
    // the share: ramps at the ends of a month window, near the temperature limit and at the ends of the hours
    let share = 1;
    if (Array.isArray(w.months) && w.months.length < 12 && doy != null) {
      const m = month, prev = m === 1 ? 12 : m - 1, next = m === 12 ? 1 : m + 1, day = doy - _WKB_MD[m - 1];
      if (!w.months.includes(prev) && day < 10) share *= 0.4 + 0.06 * day;
      if (!w.months.includes(next) && day > 20) share *= 0.4 + 0.06 * (31 - day);
    }
    if (_wkbNum(w.tempMin) && _wkbNum(ctx.temp)) share *= _wkbClamp(0.35 + (ctx.temp - w.tempMin) / 6, 0.35, 1);
    if (Array.isArray(w.hours) && hour != null && w.hours[0] < w.hours[1]) {
      const a = hour - w.hours[0], b = w.hours[1] - hour;
      share *= _wkbClamp(0.45 + Math.min(a, b) / 2, 0.45, 1);
    }
    if (w.weather && weather === 'cloud' && w.weather.includes('clear') && !w.weatherOnly) share *= 0.75;
    return { ok: true, share: _wkbR3(_wkbClamp(share, 0, 1)), why: '' };
  } catch (e) { return { ok: true, share: 1, why: 'error' }; }
}

/* ---------- S1, V3: state from descriptors ---------- */
/** The share of windows lit by the sun's elevation (fewer late at night; a dull overcast day lights a few). */
function _wkbLitShare(ctx) {
  const alt = ctx.sun && _wkbNum(ctx.sun.alt) ? ctx.sun.alt : (_wkbDark(ctx) ? -12 : 30), hour = _wkbCtxHour(ctx);
  let s = 0.72 * _wkbClamp((4 - alt) / 10, 0, 1);
  if (hour != null) { if (hour >= 23.5 || hour < 5) s *= 0.35; else if (hour >= 22.5) s *= 0.65; else if (hour < 6.5) s *= 0.6; }
  const weather = _wkbWeatherOf(ctx);
  if (alt < 14 && ((_wkbNum(ctx.cover) && ctx.cover > 0.85) || weather === 'rain' || weather === 'fog' || weather === 'snow')) s += 0.06;
  return _wkbR3(_wkbClamp(s, 0, 0.8));
}
/**
 * The state of one entity of this class at this time (S1, V3): { present, leaf: 'bare' | 'bud' | 'full' | 'turn' | null, grow (bud
 * progress), turn (share turned), drop (share fallen), bloom (0..1), snow (0..1 cover), frost, wet, lit, litShare }.
 * key seeds the per-entity unevenness (trees turn unevenly, windows light at different times, a share of a population shows).
 * Deciduous trees: bare in winter, budding in spring, full in summer, turning unevenly in autumn; evergreens stay full.
 */
function worldKbState(kb, ctx, key) {
  const out = { present: true, leaf: null, grow: 0, turn: 0, drop: 0, bloom: 0, snow: 0, frost: 0, wet: false, lit: false, litShare: 0 };
  try {
    kb = _wkbOf(kb);
    if (!kb) return out;
    const k = key == null ? (kb.id || kb.cls) : key;
    if (kb.leaf) out.leaf = 'full';
    if (!ctx || typeof ctx !== 'object') return out;
    const w = worldKbWhen(kb, ctx);
    out.present = w.ok && (key == null || w.share >= 1 || _wkbU(k, 'present') < w.share);
    const doy = _wkbCtxDoy(ctx), lat = _wkbNum(ctx.lat) ? ctx.lat : 52;
    // leaves (S1): dates move later in spring and earlier in autumn further north; each entity has its own offsets
    if (kb.leaf && doy != null) {
      const ph = kb.pheno || { spring: 0, autumn: 0 }, north = lat - 51.5;
      if (kb.leaf === 'evergreen') out.leaf = 'full';
      else if (kb.leaf === 'herb') {
        // herbs (reeds, bracken, buddleia, meadow): green from late spring, turning from late September, then dormant (dead
        // straw stands, the library's winter art) from mid November until they bud again; never 'turn' through the winter
        const bud = 105 + ph.spring + north * 3 + (_wkbU(k, 'spring') - 0.5) * 14, full = bud + 35, turn = 268 + ph.autumn - north * 2 + (_wkbU(k, 'autumn') - 0.5) * 24;
        const dormant = turn + 48 + (_wkbU(k, 'dormant') - 0.5) * 12;
        if (doy >= bud && doy < full) { out.leaf = 'bud'; out.grow = _wkbR3((doy - bud) / (full - bud)); }
        else if (doy >= full && doy < turn) out.leaf = 'full';
        else if (doy >= turn && doy < dormant) { out.leaf = 'turn'; out.turn = _wkbR3(_wkbClamp((doy - turn) / 30, 0.05, 1)); }
        else { out.leaf = 'bare'; out.drop = 1; }
      } else {
        const bud = 98 + ph.spring + north * 3 + (_wkbU(k, 'spring') - 0.5) * 16, full = bud + 22;
        const turn = 282 + ph.autumn - north * 2 + (_wkbU(k, 'autumn') - 0.5) * 28, drop = turn + 30, bare = drop + 14;
        if (doy < bud || doy >= bare) { out.leaf = 'bare'; out.drop = 1; }
        else if (doy < full) { out.leaf = 'bud'; out.grow = _wkbR3((doy - bud) / (full - bud)); }
        else if (doy < turn) out.leaf = 'full';
        else { out.leaf = 'turn'; out.turn = _wkbR3(_wkbClamp((doy - turn) / 30, 0.05, 1)); out.drop = _wkbR3(_wkbClamp((doy - drop) / 14, 0, 1)); }
      }
    }
    // flowers and blossom (V3)
    if (kb.bloom && doy != null && out.present) {
      const j = (_wkbU(k, 'bloom') - 0.5) * 10, a = kb.bloom[0] + j + (lat - 51.5) * 2, b = kb.bloom[1] + j + (lat - 51.5);
      const len = a <= b ? b - a : b + 365 - a, pos = a <= b ? doy - a : (doy >= a ? doy - a : doy + 365 - a);
      if (pos >= 0 && pos <= len) { const ramp = Math.max(4, len * 0.22); out.bloom = _wkbR3(_wkbClamp(Math.min(pos, len - pos) / ramp, 0, 1)); }
    }
    // snow and frost (S2 overlays, V3 snow on surfaces on snow days only)
    const sn = _wkbNum(kb.snow) ? kb.snow : 0;
    if (ctx.snowDay === true) out.snow = _wkbR3(Math.min(1, sn * (kb.leaf === 'evergreen' ? 1.25 : 1)));
    else if (ctx.snowing === true) out.snow = _wkbR3(sn * 0.25);
    if (ctx.frost === true || (_wkbNum(ctx.frost) && ctx.frost > 0)) out.frost = sn > 0 ? _wkbR3(_wkbNum(ctx.frost) ? _wkbClamp(ctx.frost, 0, 1) : 1) : 0;
    out.wet = _wkbWeatherOf(ctx) === 'rain';
    // lights (V3, L4): windows by a per-window threshold against the share; lamps by a photocell threshold; vehicles at dusk or in murk
    if (kb.lit) {
      const alt = ctx.sun && _wkbNum(ctx.sun.alt) ? ctx.sun.alt : (_wkbDark(ctx) ? -12 : 30), weather = _wkbWeatherOf(ctx);
      if (kb.lit === 'window') { out.litShare = _wkbLitShare(ctx); out.lit = _wkbU(k, 'window') < out.litShare; }
      else if (kb.lit === 'lamp') { const on = 1.5 + 2.5 * (_wkbU(k, 'lamp') - 0.5); out.lit = alt < on; out.litShare = out.lit ? 1 : 0; }
      else { out.lit = alt < 4 + 2 * (_wkbU(k, 'veh') - 0.5) || weather === 'fog' || weather === 'snow' || (weather === 'rain' && alt < 20); out.litShare = out.lit ? 1 : 0; }
    }
    return out;
  } catch (e) { return out; }
}

/* ---------- A1, S4: density ---------- */
// hourly curves (index = hour, 0..23); linear between hours
const _WKB_CURVES = {
  leisure: [0.02, 0.01, 0.01, 0.01, 0.02, 0.04, 0.12, 0.3, 0.42, 0.55, 0.75, 0.9, 1, 1, 1, 0.95, 0.85, 0.72, 0.58, 0.46, 0.3, 0.15, 0.07, 0.03],
  dog: [0.02, 0.01, 0.01, 0.01, 0.02, 0.08, 0.35, 0.8, 1, 0.8, 0.6, 0.55, 0.55, 0.5, 0.5, 0.6, 0.8, 0.9, 0.75, 0.55, 0.4, 0.25, 0.1, 0.04],
  jogger: [0.01, 0, 0, 0, 0.02, 0.15, 0.7, 1, 0.8, 0.45, 0.35, 0.3, 0.45, 0.4, 0.3, 0.3, 0.45, 0.8, 1, 0.85, 0.5, 0.25, 0.08, 0.02],
  cityWeekday: [0.08, 0.05, 0.04, 0.03, 0.04, 0.08, 0.2, 0.6, 1.25, 0.95, 0.6, 0.7, 1.0, 1.0, 0.72, 0.7, 0.85, 1.3, 1.05, 0.65, 0.48, 0.38, 0.28, 0.16],
  cityWeekend: [0.25, 0.18, 0.1, 0.05, 0.03, 0.03, 0.06, 0.12, 0.22, 0.4, 0.62, 0.9, 1.1, 1.2, 1.2, 1.15, 1.0, 0.82, 0.62, 0.56, 0.5, 0.46, 0.42, 0.32],
  trafficWeekday: [0.08, 0.05, 0.04, 0.04, 0.06, 0.15, 0.4, 0.88, 1.2, 0.92, 0.72, 0.72, 0.78, 0.78, 0.75, 0.82, 0.98, 1.2, 1.0, 0.62, 0.46, 0.36, 0.26, 0.15],
  trafficWeekend: [0.12, 0.08, 0.06, 0.04, 0.04, 0.06, 0.12, 0.24, 0.42, 0.6, 0.75, 0.82, 0.86, 0.86, 0.84, 0.8, 0.76, 0.7, 0.6, 0.48, 0.38, 0.3, 0.22, 0.16],
  transit: [0.3, 0, 0, 0, 0, 0.15, 0.6, 1, 1, 1, 0.85, 0.85, 0.85, 0.85, 0.85, 0.9, 1, 1, 1, 0.8, 0.65, 0.55, 0.5, 0.4],
  boat: [0, 0, 0, 0, 0, 0, 0, 0.1, 0.4, 0.75, 0.95, 1, 1, 1, 1, 1, 0.9, 0.7, 0.4, 0.15, 0, 0, 0, 0],
  day: [0.6, 0.6, 0.6, 0.6, 0.65, 0.8, 0.95, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.95, 0.85, 0.75, 0.65, 0.6],
};
function _wkbCurve(name, hour) {
  const c = _WKB_CURVES[name] || _WKB_CURVES.day;
  if (hour == null) return 1;
  const i = Math.floor(hour) % 24, f = hour - Math.floor(hour);
  return c[i] * (1 - f) + c[(i + 1) % 24] * f;
}
/** The place kind of a place type or style name: 'city' | 'town' | 'park' | 'rural'. */
function _wkbPlaceKind(p) {
  const s = String((p && typeof p === 'object' ? (p.style || p.type || p.kind) : p) || '').toLowerCase();
  if (/city|centre|center|towers|victorian|sheffield-hills|urban|station|quay|square|plaza/.test(s)) return 'city';
  if (/town|village|high-street|suburb|street/.test(s)) return 'town';
  if (/heath|wood|downs|farm|field|moor|coast|beach|rural|common|countryside|reserve/.test(s)) return 'rural';
  return 'park';
}
function _wkbFamily(who) {
  const w = String(who || '').toLowerCase();
  let obj = null;
  try { const P = typeof WORLD_POPULATIONS === 'object' && WORLD_POPULATIONS ? WORLD_POPULATIONS[who] : null; if (P && P.obj) obj = P.obj; } catch (e) { obj = null; }
  if (!obj && typeof sceneObj === 'function' && sceneObj(who)) obj = who;
  const kb = obj ? worldKb(obj) : (WORLD_KB_CLASSES[w] ? worldKb(w) : null);
  let fam = null;
  if (/dog/.test(w)) fam = 'dog';
  else if (/jog|runner/.test(w)) fam = 'jogger';
  else if (/cycl|bike/.test(w)) fam = 'cyclist';
  else if (/tram|train|rail|metro/.test(w)) fam = 'transit';
  else if (/\bcars?\b|van|taxi|traffic|bus/.test(w)) fam = 'traffic';
  else if (/boat|narrowboat|kayak|rower|canoe|cruis/.test(w)) fam = 'boat';
  else if (/gull/.test(w)) fam = 'gull';
  else if (/pigeon/.test(w)) fam = 'pigeon';
  else if (/mallard|duck|swan|coot|moorhen|grebe|goose|goosander|heron|kingfisher/.test(w)) fam = 'water-bird';
  else if (/cattle|cow|pony|sheep|deer|rabbit|horse/.test(w)) fam = 'grazer';
  else if (/butterfly|bee|dragonfly|insect/.test(w)) fam = 'insect';
  else if (/\bbats?\b/.test(w)) fam = 'bat';
  else if (/walker|visit|crowd|stroll|brisk|elderly|child|boater|people|shopper|commuter|student|family|picnic|tourist|angler/.test(w)) fam = 'people';
  if (!fam && kb) fam = kb.density || null;
  return { fam: fam || 'people', kb };
}
/**
 * A1, S4: the density factor of a population (who: a population name, an object id or a class) at this time and place type
 * ('city' | 'town' | 'park' | 'rural', or a place style). 1 = the declared rate; 0 = none. Hour, weekday, season and weather;
 * the population's own K6 `when` gates it first (no picnics in January, no insects at night). Never throws (1 on error).
 */
function worldKbDensity(who, ctx, placeType) {
  try {
    const { fam, kb } = _wkbFamily(who);
    let share = 1;
    if (kb && kb.when) { const w = worldKbWhen(kb, ctx); if (!w.ok) return 0; share = w.share; }
    if (!ctx || typeof ctx !== 'object') return _wkbR3(share);
    const doy = _wkbCtxDoy(ctx), hour = _wkbCtxHour(ctx), dow = _wkbCtxDow(ctx), weekend = _wkbWeekend(ctx, dow), season = ctx.season || _wkbSeasonOf(doy);
    const weather = _wkbWeatherOf(ctx), dark = _wkbDark(ctx), place = _wkbPlaceKind(placeType), temp = _wkbNum(ctx.temp) ? ctx.temp : null;
    let f = 1;
    const W = (o) => (weather && o[weather] != null ? o[weather] : 1);
    switch (fam) {
      case 'people': {
        if (place === 'city' || place === 'town') {
          f = _wkbCurve(weekend ? 'cityWeekend' : 'cityWeekday', hour) * (place === 'town' ? 0.85 : 1);
          f *= ({ winter: 0.85, spring: 0.95, summer: 1.05, autumn: 0.95 })[season] || 1;
          if (doy != null && doy >= 330 && doy <= 358) f *= 1.15;
          f *= W({ rain: 0.7, snow: 0.6, fog: 0.85, cloud: 0.97, clear: 1.03 });
        } else {
          f = _wkbCurve('leisure', hour) * (weekend ? (hour != null && hour >= 9 && hour <= 18 ? 1.55 : 1.15) : 1);
          f *= ({ winter: 0.55, spring: 0.9, summer: 1.2, autumn: 0.85 })[season] || 1;
          f *= W({ rain: 0.3, snow: 0.45, fog: 0.7, cloud: 0.95, clear: 1.08 });
        }
        if (temp != null && temp < 2) f *= 0.8;
        break;
      }
      case 'dog': f = _wkbCurve('dog', hour) * (weekend ? 1.2 : 1) * W({ rain: 0.65, snow: 0.6, fog: 0.85 }) * (season === 'winter' ? 0.85 : 1); break;
      case 'jogger': f = _wkbCurve('jogger', hour) * (weekend ? 1.2 : 1) * W({ rain: 0.5, snow: 0.2, fog: 0.8 }) * (season === 'winter' ? 0.75 : 1); break;
      case 'cyclist':
        f = (place === 'city' || place === 'town') && !weekend ? _wkbCurve('trafficWeekday', hour) : _wkbCurve('leisure', hour) * (weekend ? 1.3 : 0.9);
        f *= W({ rain: 0.35, snow: 0.12, fog: 0.6, clear: 1.08 }) * (({ winter: 0.6, spring: 0.95, summer: 1.15, autumn: 0.85 })[season] || 1) * (dark ? 0.5 : 1);
        break;
      case 'traffic': f = _wkbCurve(weekend ? 'trafficWeekend' : 'trafficWeekday', hour) * W({ rain: 1.05, snow: 0.6, fog: 0.85 }) * (place === 'rural' ? 0.5 : 1); break;
      case 'transit': f = _wkbCurve('transit', hour) * (dow === 0 ? 0.6 : weekend ? 0.8 : 1) * W({ snow: 0.8 }); break;
      case 'boat': f = _wkbCurve('boat', hour) * (weekend ? 1.5 : 1) * (({ winter: 0.15, spring: 0.7, summer: 1.2, autumn: 0.6 })[season] || 1) * W({ rain: 0.4, snow: 0.1, fog: 0.5 }); break;
      case 'water-bird': f = (dark ? 0.7 : 1) * (season === 'winter' ? 1.2 : 1); break;
      // gulls and pigeons roost after dark (on roofs and ledges out of the view): none spawn, so none fly over a night harbour (night-light audit)
      case 'gull': f = (dark ? 0 : 1) * (({ winter: 1.4, autumn: 1.1, summer: 0.7 })[season] || 1); break;
      case 'pigeon': f = dark ? 0 : _wkbCurve('day', hour); break;
      case 'grazer': f = dark ? 0.6 : 1; break;
      case 'insect': f = dark ? 0 : _wkbCurve('leisure', hour) * W({ rain: 0, snow: 0, fog: 0.3, cloud: 0.6 }); break;
      case 'bat': f = dark === false ? 0 : 1; break;
      case 'flyer': f = dark ? 0.3 : 1; break;
      default: f = 1;
    }
    return _wkbR3(Math.max(0, f * share));
  } catch (e) { return 1; }
}

/* ---------- K8: sizes ---------- */
/** Metres to the top of one agent of this class (K8): pose 'stand' | 'sit' | 'lie' | 'ride' | 'swim' | 'perch' (default: the
    object's own), age 'adult' | 'child' (default: the object's own); rnd: a function or a number in [0, 1). */
function worldKbSize(kb, pose, age, rnd) {
  try {
    kb = _wkbOf(kb);
    if (!kb || !kb.size) return 1;
    const S = kb.size, r = _wkbRnd(rnd)(), p = pose || S.pose || 'stand', a = age || S.age || 'adult';
    let range = null;
    if (a === 'child' && S.child && S.child[p]) range = S.child[p];
    else if (a === 'child' && S.ages && S.ages.child && (p === 'stand' || p === 'walk')) range = S.ages.child;
    else if (S.poses && S.poses[p]) range = S.poses[p];
    else if (a === 'adult' && S.ages && S.ages.adult && (p === 'stand' || p === 'walk')) range = S.ages.adult;
    if (!range) range = Array.isArray(S.h) ? S.h : [S.h0 || 1, S.h0 || 1];
    // a seeded size that clusters round the middle of the range (the mean of two draws), as real heights do
    const u = 0.5 * (r + _wkbU(r, 'size'));
    return _wkbR3(_wkbLerp(range, u));
  } catch (e) { return 1; }
}
