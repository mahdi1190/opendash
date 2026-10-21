/* ============================================================
   WORLD ENGINE (scene format v3 / v3.1), package "sense": the core (docs/dev/WORLD_ENGINE.md 0, 1, 5, 9, 12; the contract
   is docs/dev/WORLD_ENGINE_REQUIREMENTS.md and wins where the two disagree). PURE classic script: no DOM, nothing runs at
   load except constants, so Node tests evaluate it exactly as the page does (tools/lib/world/load.mjs).

   The principle (the user): bad input makes a scene PLAINER, never wrong, and it works first time. The validator is strict
   (for authors and tools: `world validate` exits 1 on any error); the LOAD PATH REPAIRS: it strips, defaults, drops and logs,
   then the placement solver (79-world-1place.js) snaps, turns, pushes apart or drops, and the fill (kb) dresses what is bare.
   worldAdd never refuses a spec.

   Formats (5.3, G11; the validator knows both):
     v: 3    camera frame: one `camera` (the v2 camera block: eye, fov, horizon, heading, ...); x right of the camera axis,
             z forward (> 0), facing 0 = away from the camera, 90 = right; life edges N | S | E | W (the names work too).
     v: 3.1  place frame: `cameras: [...]` (or one `camera` by intent: at, height, heading | lookAt, fov, frame); x east of
             place.origin (default place.lat / lon), z north, facing a compass bearing; edges far | near | left | right.
             One world, many cameras (Q7): worldBuild(spec, { camera }) transforms the place into that camera's frame
             (appearance's worldCameraXform when loaded, else the fallback here) BEFORE anything else runs.
   Both share every other key: place (lat, lon, alt, region, origin, style), ground (relief, features), surfaces, lines,
   buildings, entities, landmarks, life, backdrop, fill, seed. A spec never carries look, light, shadow, reflection, screen
   or per-season data (W1, L3, V1): such keys are rejected strictly and stripped on load.

   Facing convention: the direction a thing travels, its long axis along it (boats, vehicles, trains, movers, fences, gates,
   hedges); for FRONT-FACING things (benches, buildings; a descriptor with orient path | view | street) the way its front
   looks, its long axis across it (a bench facing 270 looks left and its seat runs along z).

   API (WORLD_ENGINE.md 9, package sense):
     worldValidate(spec, o)          -> { ok, errors: [{ path, rule, msg, fix, severity }], warnings }   (strict; o.views: the
                                        other views of the place for the C7 `templated` warning)
     worldRepair(spec)               -> { spec, log, errors, warnings }: the strict errors and the repaired spec (strip, default,
                                        drop; placement rules are left to worldPlace). severity: repair | drop | fatal | warn
     worldMigrate(spec)              -> { spec, log }: v3.0 (camera frame) -> v3.1 (place frame: one camera at the origin with
                                        the old heading; facings and edges re-expressed; the relief rides on the camera)
     worldSpecFor(spec, camera)      -> { spec, log, camera: { id, index }, culled }: the repaired camera-frame (v: 3) spec of
                                        one camera of any spec (identity for v3.0)
     worldBuild(spec, o)             -> World { cam, surfaces, lines, buildings, entities, life, backdrop, seed, style, problems,
                                        log, waterSteps, ... }. o: { camera, season, ctx, fill, place, validate }. Order:
                                        repair (+ migrate) -> camera transform -> relief (ground.features, W2) -> entities with
                                        per-entity isolation (G8) -> worldPlace (1place) -> worldFill (kb, typeof). world.log
                                        lists every strip, default, drop, snap, move, rotate, jitter and fill (U2).
     worldObjectInfo(id)             -> Desc | null: library real size and views merged with worldKb(id) (typeof; the class
                                        table WORLD_CLASS_INFO is the fallback)
     worldSurfaceAt(world, x, z, o)  -> the surface at a point: entity decks, then raised surfaces, then the ground (later wins,
                                        solids cut water); o.ground: the ground surface only; o.y: the level at or below y
     worldSurfaceY(s, x, z)          -> the height of a raised surface there (stairs and ramps interpolate from -> to)
     worldWaterLevelAt(world, x, z)  -> the water level of the region there (per region, W4), or null
     worldFrontZ(foot, x)            -> the nearest z of a footprint at a column (Infinity outside its span; min z when x null)
     worldTemplated(specs)           -> warnings: views of one place too alike (C7), across specs and across cameras
     worldItem(meta, spec, o)        -> an item usable from a 72-anim-pack file (I1): call it at load, everything heavy is lazy
     worldItems(meta, spec, o)       -> one item per camera of a v3.1 spec (Q7)
     worldAdd(pack, meta, spec)      -> registers the items (never refuses); worldAddLog(id) the load log; worldAddProblems()
     worldPopulationDefine(name, p)  -> extends WORLD_POPULATIONS (life adds its own population names)
   ============================================================ */
const WORLD_VERSIONS = Object.freeze([3, 3.1]);
const WORLD_RULES = Object.freeze(['badVersion', 'badType', 'badValue', 'unknownKey', 'screenOrLookField', 'seasonPinned', 'perSeasonData', 'missingField',
  'dupId', 'unknownSize', 'unknownVariant', 'careRule', 'regionInvalid', 'badAttach', 'overlap', 'blocksPath', 'orphan', 'orient', 'gridRow', 'nearBand', 'badSurface',
  'unknownSurface', 'unknownWho', 'unreachable', 'emptyBackground', 'unknownBackdrop', 'landmarkSrc', 'walkwayWater', 'templated', 'buildError']);
/** The usual severity of each rule (5.2): repair = stripped, defaulted, snapped or moved; drop = the entry goes; warn = advice only. */
const WORLD_RULE_SEVERITY = Object.freeze({
  badVersion: 'repair', badType: 'repair', badValue: 'repair', unknownKey: 'repair', screenOrLookField: 'repair', seasonPinned: 'repair', perSeasonData: 'repair',
  missingField: 'repair', dupId: 'repair', unknownSize: 'drop', unknownVariant: 'repair', careRule: 'drop', regionInvalid: 'drop', badAttach: 'repair',
  overlap: 'repair', blocksPath: 'repair', orphan: 'repair', orient: 'repair', gridRow: 'repair', nearBand: 'repair', badSurface: 'drop', unknownSurface: 'drop', unknownWho: 'drop',
  unreachable: 'drop', emptyBackground: 'repair', unknownBackdrop: 'repair', landmarkSrc: 'repair', walkwayWater: 'repair', templated: 'warn', buildError: 'drop' });
/** Keys that describe a picture or a look, never a world: refused anywhere in a spec (W1, L3). */
const WORLD_LOOK_KEYS = Object.freeze(['X', 'Y', 'px', 's', 'scale', 'layer', 'flip', 'tint', 'shadow', 'reflect', 'light', 'grade', 'mirror', 'ripple',
  'glint', 'clarity', 'colour', 'color', 'exposure', 'ambient', 'k', 'z-index', 'zIndex', 'band', 'pixel', 'shade', 'shadowCol', 'shadows', 'reflection',
  'reflections', 'highlight', 'glow', 'shimmer', 'lightPath', 'lit', 'opacity', 'alpha', 'blur', 'haze', 'hue', 'saturation', 'brightness', 'contrast', 'bed']);
/** Library objects that ARE a look (a hand shadow, a hand reflection, a light pool): never placed (L3). Parts so named are never drawn. */
const WORLD_LOOK_OBJ_RE = /(^|[.-])(shadows?|reflections?|reflect|shade|glint|light-?pools?|light-?path|sun-?rays|god-?rays|lens-?flare)(-|$)/;
const WORLD_LOOK_PART_RE = /^(shadow|shade|reflect|reflection|mirror|glint)/i;
/** Words that make a key per-season, per-time or per-weather data (V1). */
const _WC_SEASON_WORDS = new Set(['spring', 'summer', 'autumn', 'fall', 'winter', 'season', 'seasons', 'seasonal', 'night', 'nights', 'nighttime', 'daytime',
  'dawn', 'dusk', 'morning', 'evening', 'noon', 'midday', 'sunrise', 'sunset', 'golden', 'rain', 'rainy', 'snow', 'snowy', 'fog', 'foggy', 'frost', 'frosty',
  'sunny', 'overcast', 'cloudy', 'weather', 'month', 'months', 'hour', 'hours', 'colours', 'colors', 'palette', 'palettes', 'liveries']);
/** A library id that is a seasonal or night copy of another object (V1): `<base>-winter`, `<base>-night` ... */
const _WC_SEASON_SUFFIX = /-(spring|summer|autumn|fall|winter|night|nighttime|daytime|dusk|dawn|evening|morning|snow|snowy|frost|frosty|lit|unlit|bare|leafy|wet)$/;

const WORLD_SURFACE_KINDS = Object.freeze({
  path: 'walk', pavement: 'walk', towpath: 'walk', plaza: 'walk', boardwalk: 'walk', 'bridge-deck': 'walk', deck: 'walk', platform: 'walk', stairs: 'walk', ramp: 'walk',
  grass: 'graze', heath: 'graze', field: 'graze', sand: 'graze',
  road: 'drive', crossing: 'walk', water: 'swim', rail: 'rail', tram: 'rail', reeds: 'wade', bed: 'wade', hedge: 'solid', weir: 'solid',
});
/** Walk surfaces that may be raised (`y`, W3); stairs and ramps join two levels (`from`, `to`). */
const WORLD_RAISED_KINDS = Object.freeze(['path', 'pavement', 'towpath', 'plaza', 'boardwalk', 'bridge-deck', 'deck', 'platform']);
const WORLD_JOIN_KINDS = Object.freeze(['stairs', 'ramp']);
/** A raised surface this high or more spans OVER what is beneath (a bridge deck blocks nothing under it, W3). */
const WORLD_OVERHEAD_Y = 1.2;
/** Surface kinds authors reach for that mean a known kind (repair maps them; strict still flags them). */
const WORLD_SURFACE_ALIAS = Object.freeze({ footpath: 'path', track: 'path', trail: 'path', walkway: 'path', promenade: 'pavement', sidewalk: 'pavement',
  square: 'plaza', paving: 'plaza', yard: 'plaza', 'car-park': 'plaza', street: 'road', lane: 'road', lawn: 'grass', park: 'grass', verge: 'grass', bank: 'grass',
  meadow: 'field', moor: 'heath', beach: 'sand', jetty: 'boardwalk', pontoon: 'boardwalk', pier: 'boardwalk', bridge: 'bridge-deck', steps: 'stairs',
  marsh: 'reeds', reedbed: 'reeds', railway: 'rail', tramway: 'tram', pond: 'water', lake: 'water', canal: 'water', river: 'water', sea: 'water', harbour: 'water', estuary: 'water' });
const WORLD_WATER_KINDS = Object.freeze(['pond', 'lake', 'canal', 'river', 'sea', 'harbour', 'puddle', 'estuary']);
const WORLD_WATER_ALIAS = Object.freeze({ ocean: 'sea', bay: 'sea', stream: 'river', brook: 'river', beck: 'river', burn: 'river', loch: 'lake',
  mere: 'lake', tarn: 'lake', reservoir: 'lake', basin: 'canal', cut: 'canal', navigation: 'canal', dock: 'harbour', marina: 'harbour', pool: 'pond' });
const WORLD_WATER_HINTS = Object.freeze(['calm', 'breezy']);
const WORLD_STEP_KINDS = Object.freeze(['weir', 'lock', 'fall']);
const WORLD_LINE_KINDS = Object.freeze(['wall', 'fence', 'railing', 'hedge', 'kerb', 'coping']);
const WORLD_FEATURE_KINDS = Object.freeze(['bank', 'embankment', 'cutting', 'slope', 'cliff']);
const WORLD_BACKDROPS = Object.freeze(['heath', 'woodland', 'downs', 'farmland', 'town-low', 'city-victorian', 'city-sheffield-hills', 'city-manchester-towers', 'canal-wooded', 'coast', 'estuary']);
/** Frame edges: the v3.1 names and the camera-frame letters (their aliases). */
const WORLD_EDGES = Object.freeze(['left', 'right', 'far', 'near', 'W', 'E', 'N', 'S']);
const WORLD_EDGE_ALIAS = Object.freeze({ left: 'W', right: 'E', far: 'N', near: 'S', W: 'left', E: 'right', N: 'far', S: 'near' });
const WORLD_GOAL_VERBS = Object.freeze(['go', 'do', 'wander', 'follow', 'meet', 'leave', 'sit', 'wait', 'board', 'enter', 'fish', 'feed', 'view']);
/** Which surface kinds make a nav layer exist (3.1). */
const WORLD_LAYER_KINDS = Object.freeze({
  walk: ['path', 'pavement', 'towpath', 'plaza', 'boardwalk', 'bridge-deck', 'deck', 'platform', 'stairs', 'ramp', 'crossing', 'grass', 'heath', 'field', 'sand'],
  graze: ['grass', 'heath', 'field', 'sand'], swim: ['water'], wade: ['water', 'reeds', 'bed'], drive: ['road'], rail: ['rail', 'tram'], air: null,
});
/** Life populations (5.1 `who`): name -> { layer, obj }. Life extends this with worldPopulationDefine. An object id also works as `who`. */
const WORLD_POPULATIONS = {
  walkers: { layer: 'walk', obj: 'person.walker' }, visit: { layer: 'walk', obj: 'person.walker' }, crowd: { layer: 'walk', obj: 'person.walker' },
  crowds: { layer: 'walk', obj: 'person.walker' }, 'dog-walkers': { layer: 'walk', obj: 'person.dog-walker' }, boater: { layer: 'walk', obj: 'person.walker' },
  cyclists: { layer: 'drive', obj: 'person.cyclist' }, cars: { layer: 'drive', obj: 'vehicle.car' }, buses: { layer: 'drive', obj: 'vehicle.bus' },
  mallard: { layer: 'swim', obj: 'bird.mallard' }, 'mute-swan': { layer: 'swim', obj: 'bird.swan' }, swan: { layer: 'swim', obj: 'bird.swan' },
  coot: { layer: 'swim', obj: 'bird.coot' }, moorhen: { layer: 'swim', obj: 'bird.moorhen' }, goosander: { layer: 'swim', obj: 'bird.mallard' },
  grebe: { layer: 'swim', obj: 'bird.grebe' }, goose: { layer: 'graze', obj: 'bird.goose' }, heron: { layer: 'wade', obj: 'bird.heron' },
  kingfisher: { layer: 'air', obj: 'bird.kingfisher' }, gulls: { layer: 'air', obj: 'bird.gull' }, pigeons: { layer: 'walk', obj: 'bird.pigeon' },
  'narrowboat-cruising': { layer: 'swim', obj: 'boat.narrowboat' }, train: { layer: 'rail', obj: 'rail.train' }, tram: { layer: 'rail', obj: 'vehicle.supertram' },
  cattle: { layer: 'graze', obj: 'animal.cattle' }, ponies: { layer: 'graze', obj: 'animal.pony' }, sheep: { layer: 'graze', obj: 'animal.sheep' },
  deer: { layer: 'graze', obj: 'animal.deer' }, rabbits: { layer: 'graze', obj: 'animal.rabbit' },
};
function worldPopulationDefine(name, p) { if (!/^[a-z0-9-]+$/.test(String(name)) || !p || !WORLD_LAYER_KINDS.hasOwnProperty(p.layer)) throw new Error('worldPopulationDefine: bad ' + name); WORLD_POPULATIONS[name] = Object.assign({}, p); }

/* ---------- small maths ---------- */
const _WC_DEG = Math.PI / 180;
const _wcNum = v => typeof v === 'number' && Number.isFinite(v);
const _wcObjOf = v => v != null && typeof v === 'object' && !Array.isArray(v);
const _wcPt = p => Array.isArray(p) && p.length === 2 && _wcNum(p[0]) && _wcNum(p[1]);
const _wcR3 = v => Math.round(v * 1000) / 1000;
const _wcR9 = v => Math.round(v * 1e9) / 1e9;
const _wcStr = v => typeof v === 'string' && v.length > 0;
/** A facing in [0, 360), rounded so a rotation and its inverse give the same number back. */
const _wcFace = f => { const r = _wcR9(((f % 360) + 360) % 360); return r >= 360 ? r - 360 : (r === 0 ? 0 : r); };
const _wcAngDiff = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
/** The bearing from a to b in the frame's own convention (0 = +z, 90 = +x). */
const _wcBearing = (a, b) => _wcFace(Math.atan2(b[0] - a[0], b[1] - a[1]) / _WC_DEG);
function _wcRng(seed) { let a = (seed >>> 0) || 0x9e3779b9; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function _wcHash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const _wcPolyBoxes = new WeakMap();
function _wcInPoly(poly, x, z) {
  // a long outline (a ragged shore, a reed bed) is rejected by its box first: the box is kept per outline
  if (poly.length > 12) {
    let b = _wcPolyBoxes.get(poly);
    if (!b) {
      b = [Infinity, Infinity, -Infinity, -Infinity];
      for (const q of poly) { if (q[0] < b[0]) b[0] = q[0]; if (q[1] < b[1]) b[1] = q[1]; if (q[0] > b[2]) b[2] = q[0]; if (q[1] > b[3]) b[3] = q[1]; }
      _wcPolyBoxes.set(poly, b);
    }
    if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) return false;
  }
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function _wcSegDist(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L)) : 0;
  return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz);
}
function _wcLineDist(path, x, z) { let d = Infinity; for (let i = 1; i < path.length; i++) d = Math.min(d, _wcSegDist(x, z, path[i - 1], path[i])); return d; }
/** The nearest point of a polyline: { d, x, z, seg, t (0..1 on the segment), s (arc length), dir: [dx, dz] unit, side: > 0 right of the direction }. */
function _wcLineNear(path, x, z) {
  let best = null, acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, L = Math.sqrt(L2);
    const t = L2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)) : 0, px = a[0] + t * dx, pz = a[1] + t * dz, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) best = { d, x: px, z: pz, seg: i - 1, t, s: acc + t * L, dir: L ? [dx / L, dz / L] : [0, 1], side: L ? ((x - a[0]) * dz - (z - a[1]) * dx) / L : 0 };
    acc += L;
  }
  return best;
}
function _wcPathLen(path) { let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); return L; }
function _wcPolyArea(p) { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return a / 2; }
function _wcCentroid(pts) { let x = 0, z = 0; for (const p of pts) { x += p[0]; z += p[1]; } return pts.length ? [x / pts.length, z / pts.length] : [0, 0]; }
/** The distance from a point to a polygon's boundary. */
function _wcPolyEdgeDist(poly, x, z) { let d = Infinity; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, _wcSegDist(x, z, poly[j], poly[i])); return d; }
/** Separating-axis overlap of two convex polygons: { depth, nx, nz } with (nx, nz) pointing from A to B; null when apart. */
function _wcSat(A, B) {
  let best = null;
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!L) continue;
    const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const q of A) { const v = q[0] * nx + q[1] * nz; if (v < a0) a0 = v; if (v > a1) a1 = v; }
    for (const q of B) { const v = q[0] * nx + q[1] * nz; if (v < b0) b0 = v; if (v > b1) b1 = v; }
    const o = Math.min(a1, b1) - Math.max(a0, b0);
    if (o <= 0) return null;
    if (!best || o < best.depth) { const sgn = (b0 + b1) / 2 >= (a0 + a1) / 2 ? 1 : -1; best = { depth: o, nx: nx * sgn, nz: nz * sgn }; }
  }
  return best;
}
/** The penetration depth of two convex polygons (separating axis), 0 when apart. */
function _wcPenetration(A, B) { const r = _wcSat(A, B); return r ? r.depth : 0; }
/** The nearest z of a footprint at column x (2.3 rule 3); Infinity when x is outside its span; the polygon's min z when x is null. */
function worldFrontZ(foot, x) {
  if (!Array.isArray(foot) || !foot.length) return Infinity;
  if (x == null) return Math.min(...foot.map(p => p[1]));
  let z = Infinity;
  for (let i = 0, j = foot.length - 1; i < foot.length; j = i++) {
    const [x1, z1] = foot[j], [x2, z2] = foot[i];
    if (x < Math.min(x1, x2) || x > Math.max(x1, x2)) continue;
    z = Math.min(z, x1 === x2 ? Math.min(z1, z2) : z1 + (z2 - z1) * (x - x1) / (x2 - x1));
  }
  return z;
}
/** The UK lane direction (drive on the LEFT) at a point beside a road centre line: a facing. */
function _wcLaneFacing(path, x, z) {
  const n = _wcLineNear(path, x, z); if (!n) return null;
  const f = Math.atan2(n.dir[0], n.dir[1]) / _WC_DEG;
  return _wcFace(n.side > 0 ? f + 180 : f);   // right of the line's direction: traffic runs the other way
}

/* ---------- a robust deep copy (a getter that throws drops its entry, G8) ---------- */
const _wcThrew = new WeakMap();
function _wcClone(v, onThrow) {
  // ancestors: the objects on the current path (a cycle is a reference to one of them; shared points are copied each time)
  // stack: the list entries being copied (innermost last); a throw marks the innermost
  const ancestors = new WeakSet(), stack = [];
  const go = (x, path, depth) => {
    if (x === null || typeof x !== 'object') return (typeof x === 'function' || typeof x === 'symbol' || typeof x === 'bigint') ? undefined : x;
    if (depth > 24 || ancestors.has(x)) return undefined;
    ancestors.add(x);
    try { return copy(x, path, depth); } finally { ancestors.delete(x); }
  };
  const copy = (x, path, depth) => {
    if (Array.isArray(x)) {
      const out = []; let n = 0;
      try { n = x.length >>> 0; } catch (e) { n = 0; }
      for (let i = 0; i < n; i++) {
        let y;
        try { y = x[i]; } catch (e) { const m = String(e && e.message || e), ph = { __threw: m }; onThrow(path + '[' + i + ']', m); _wcThrew.set(ph, m); out.push(ph); continue; }
        if (y !== null && typeof y === 'object') {
          const slot = { msg: null }; stack.push(slot);
          const c = go(y, path + '[' + i + ']', depth + 1);
          stack.pop();
          if (slot.msg && c && typeof c === 'object') _wcThrew.set(c, slot.msg);
          out.push(c);
        } else out.push(go(y, path + '[' + i + ']', depth + 1));
      }
      return out;
    }
    const out = {}; let keys = [];
    try { keys = Object.keys(x); } catch (e) { keys = []; }
    for (const k of keys) {
      let y;
      try { y = x[k]; } catch (e) { const m = String(e && e.message || e); onThrow(path + '.' + k, m); if (stack.length && !stack[stack.length - 1].msg) stack[stack.length - 1].msg = m; continue; }
      const c = go(y, path + '.' + k, depth + 1);
      if (c !== undefined) out[k] = c;
    }
    return out;
  };
  return go(v, 'spec', 0);
}
/** A plain deep copy of data already known to be clean (no getters, no cycles). */
const _wcCopy = v => (v === null || typeof v !== 'object') ? v : Array.isArray(v) ? v.map(_wcCopy) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, _wcCopy(x)]));

/* ---------- object descriptors (1.3) ---------- */
/** The world class of a library object, from its id and its v2 class. */
function _wcClass(id, c2) {
  const t = String(id);
  if (/(^|[.-])(bough|boughs|branch|branches)(-|$)/.test(t)) return 'bough';
  if (/(^|[.-])fronds?(-|$)/.test(t)) return 'frond';
  if (c2 === 'person') return 'person';
  if (c2 === 'cyclist') return 'cyclist';
  if (c2 === 'boat') return 'boat';
  if (c2 === 'train') return 'train';
  if (c2 === 'tram') return 'tram';
  if (c2 === 'car' || c2 === 'bus' || c2 === 'bike' || c2 === 'tractor') return 'vehicle';
  if (/^(animal|bird)\./.test(t)) {
    if (c2 === 'bird-air' || c2 === 'air') return 'bird-air';
    if (/kingfisher/.test(t)) return 'kingfisher';
    if (/heron|egret/.test(t)) return 'heron';
    if (/swan/.test(t)) return 'swan';
    if (/goose/.test(t)) return 'goose';
    if (/coot|moorhen/.test(t)) return 'coot';
    if (/grebe/.test(t)) return 'grebe';
    if (/mallard|duck|teal|wigeon|pochard|tufted|mandarin|goosander/.test(t)) return 'duck';
    if (/gull|cormorant/.test(t)) return 'gull';
    if (c2 === 'animal-dog' || /dog/.test(t)) return 'dog';
    if (c2 === 'animal-graze' || /cattle|cow|pony|sheep|horse|deer|donkey|lamb/.test(t)) return 'grazer';
    if (/trout|fish/.test(t)) return 'fish';
    return /^bird\./.test(t) ? 'bird' : 'animal';
  }
  if (c2 === 'air') return 'air';
  if (c2 === 'tree') return 'tree';
  if (c2 === 'shrub') return /reed|bulrush|rush|sedge/.test(t) ? 'reed' : /hedge/.test(t) ? 'hedge' : 'shrub';
  if (c2 === 'cover' || c2 === 'bird-water') return 'cover';
  if (c2 === 'rock') return 'rock';
  if (c2 === 'rail') return /platform/.test(t) ? 'walkway' : 'rail-kit';
  if (c2 === 'structure' || c2 === 'landmark') {
    if (/weir/.test(t)) return 'weir';
    if (/gate/.test(t) && !/gateway|gatehouse|lock-gate/.test(t)) return 'gate';
    if (c2 === 'structure' && /boardwalk|jetty|pontoon|platform|causeway|stepping|footbridge|bridge/.test(t)) return 'walkway';
    if (c2 === 'landmark' && /boardwalk|jetty|pontoon|pier|causeway|footbridge|bridge|viaduct/.test(t)) return 'walkway';
    if (/fence|wall|railing|palisade/.test(t)) return 'fence';
    return c2;
  }
  if (c2 === 'building') return 'building';
  if (/bench|picnic/.test(t)) return 'bench';
  if (/lamp/.test(t)) return 'lamp';
  if (/bollard|post\b|post-|sign/.test(t)) return 'post';
  return 'street';
}
/** Per class: footprint shape, solidity, legal attachments (first = default), floats (sinks to its waterline). The fallback until kb lands. */
const WORLD_CLASS_INFO = Object.freeze({
  person: { foot: 'disc', solidity: 'passable', attachOk: ['ground', 'deck'] }, cyclist: { foot: 'box', solidity: 'passable', attachOk: ['ground'] },
  dog: { foot: 'box', solidity: 'passable', attachOk: ['ground', 'deck'] },
  duck: { foot: 'box', solidity: 'passable', attachOk: ['water', 'ground', 'deck'], floats: true }, coot: { foot: 'box', solidity: 'passable', attachOk: ['water', 'ground'], floats: true },
  grebe: { foot: 'box', solidity: 'passable', attachOk: ['water'], floats: true }, swan: { foot: 'box', solidity: 'passable', attachOk: ['water', 'ground'], floats: true },
  goose: { foot: 'box', solidity: 'passable', attachOk: ['ground', 'water'], floats: true }, heron: { foot: 'disc', solidity: 'passable', attachOk: ['ground', 'water', 'deck'] },
  kingfisher: { foot: 'disc', solidity: 'passable', attachOk: ['deck', 'air'], perch: true }, gull: { foot: 'box', solidity: 'passable', attachOk: ['ground', 'water', 'deck', 'air'], floats: true },
  bird: { foot: 'disc', solidity: 'passable', attachOk: ['ground', 'deck', 'air'], perch: true }, 'bird-air': { foot: 'disc', solidity: 'passable', attachOk: ['air'] },
  fish: { foot: 'box', solidity: 'passable', attachOk: ['water'] }, grazer: { foot: 'box', solidity: 'passable', attachOk: ['ground'] }, animal: { foot: 'box', solidity: 'passable', attachOk: ['ground'] },
  air: { foot: 'disc', solidity: 'passable', attachOk: ['air'] },
  boat: { foot: 'box', solidity: 'solid', attachOk: ['water'], floats: true }, train: { foot: 'box', solidity: 'solid', attachOk: ['rail'] }, tram: { foot: 'box', solidity: 'solid', attachOk: ['rail'] },
  vehicle: { foot: 'box', solidity: 'solid', attachOk: ['ground'] },
  tree: { foot: 'disc', solidity: 'solid', attachOk: ['ground'] }, shrub: { foot: 'disc', solidity: 'passable', attachOk: ['ground'] },
  bough: { foot: 'disc', solidity: 'passable', attachOk: ['air', 'ground'] }, frond: { foot: 'disc', solidity: 'passable', attachOk: ['air', 'ground'] },
  reed: { foot: 'disc', solidity: 'passable', attachOk: ['ground', 'water'] }, hedge: { foot: 'box', solidity: 'solid', attachOk: ['ground'] },
  cover: { foot: 'disc', solidity: 'passable', attachOk: ['ground', 'water'] }, rock: { foot: 'disc', solidity: 'solid', attachOk: ['ground', 'water'] },
  building: { foot: 'box', solidity: 'solid', attachOk: ['ground'] }, landmark: { foot: 'box', solidity: 'solid', attachOk: ['ground', 'water'] },
  structure: { foot: 'box', solidity: 'solid', attachOk: ['ground', 'water'] }, walkway: { foot: 'box', solidity: 'walkable', attachOk: ['ground', 'water'] },
  weir: { foot: 'box', solidity: 'solid', attachOk: ['water'] }, gate: { foot: 'box', solidity: 'solid', attachOk: ['ground'] },
  fence: { foot: 'box', solidity: 'solid', attachOk: ['ground'] }, 'rail-kit': { foot: 'box', solidity: 'passable', attachOk: ['ground'] },
  bench: { foot: 'box', solidity: 'solid', attachOk: ['ground', 'deck'] }, lamp: { foot: 'disc', solidity: 'solid', attachOk: ['ground', 'deck', 'wall'] },
  post: { foot: 'disc', solidity: 'solid', attachOk: ['ground', 'water', 'deck'] }, street: { foot: 'box', solidity: 'solid', attachOk: ['ground', 'deck', 'wall'] },
});
/** Classes whose facing is where their front looks (their long axis runs across it). */
const WORLD_FRONT_CLASSES = Object.freeze(['bench', 'building']);
/** Gaps: objects whose real size is only a class guess get one here (metres), or they cannot be placed. */
const WORLD_SIZE_GAPS = Object.freeze({});
const _WC_HAB_ATTACH = Object.freeze({ water: 'water', 'water-margin': 'water', bank: 'ground', walk: 'ground', paving: 'ground', grass: 'ground', soil: 'ground',
  'grass-edge': 'ground', 'road-lane': 'ground', road: 'ground', rail: 'rail', tram: 'rail', roof: 'deck', perch: 'deck', deck: 'deck', air: 'air', wall: 'wall' });
const _WC_SOLIDITY = Object.freeze(['solid', 'walkable', 'water', 'passable', 'overhead']);
const _wcInfoMemo = new Map();
const _WC_VIEWS = ['q-front', 'front', 'q-back', 'back'];
function _wcKbOf(id) {
  if (typeof worldKb !== 'function') return null;
  try { const k = worldKb(id); return k && typeof k === 'object' ? k : null; } catch (e) { return null; }
}
function worldObjectInfo(id) {
  if (typeof id !== 'string') return null;
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null, kb = _wcKbOf(id);
  const hit = _wcInfoMemo.get(id);
  if (hit && hit.def === def && hit.kb === kb) return hit.r;
  let r = null;
  try { r = def ? _wcInfoOf(id, def, kb) : null; } catch (e) { r = null; }
  _wcInfoMemo.set(id, { def, kb, r });
  return r;
}
function _wcInfoOf(id, def, kb) {
  let real = typeof sceneObjReal === 'function' ? sceneObjReal(id) : null;
  if (WORLD_SIZE_GAPS[id]) real = Object.assign({ src: 'gap' }, WORLD_SIZE_GAPS[id]);
  const ks = kb && kb.size;
  if (!(real && real.h > 0 && real.src !== 'class') && ks && _wcNum(ks.l) && ks.l > 0) {   // no library size: the descriptor's (K2, K8)
    const kh = Array.isArray(ks.h) ? (ks.h[0] + ks.h[1]) / 2 : ks.h;
    if (_wcNum(kh) && kh > 0) real = { h: kh, l: ks.l, w: _wcNum(ks.w) ? ks.w : ks.l * 0.6, src: 'kb' };
  }
  if (!(real && real.h > 0 && real.src !== 'class')) return null;
  const c2 = typeof sceneObjClass === 'function' ? sceneObjClass(id) : 'street';
  // a library 'class:air' piece that the kb stands on the ground (a fountain jet: kb class street) is grounded: it was drawn 4.6 m up (21 Oct)
  let cls = _wcClass(id, c2);
  if (cls === 'air' && kb && ['street', 'post', 'cover'].includes(kb.cls)) cls = kb.cls;
  const ci = WORLD_CLASS_INFO[cls] || WORLD_CLASS_INFO.street;
  const mv = typeof sceneMoverSize === 'function' ? sceneMoverSize(id) : null;
  // movers keep the v2 real size classes (a duck 0.35 m, a person 1.7 m); everything else its real table size. A seated scenery
  // figure (a picnicker on a rug, a cafe-goer at a table: kb pose 'sit' and a scenery class) is drawn at its seated height (K8)
  const seated = !!(kb && kb.size && kb.size.pose === 'sit' && kb.cls !== 'person' && Array.isArray(kb.size.h) && real.src !== 'class');
  const h = mv && mv.size && !seated ? mv.h : seated ? (kb.size.h[0] + kb.size.h[1]) / 2 : real.h, l = Math.max(0.05, real.l || h), w = Math.max(0.05, real.w || Math.min(l, h) * 0.6);
  let foot = ci.foot, solidity = ci.solidity;
  if (cls === 'street' && (h < 1 || w < 0.3)) solidity = 'passable';
  if (kb && _WC_SOLIDITY.includes(kb.solidity)) solidity = kb.solidity;
  let footPoly = null;
  if (kb && Array.isArray(kb.foot) && kb.foot.length >= 3 && kb.foot.every(_wcPt)) footPoly = kb.foot.map(p => [p[0], p[1]]);
  else if (kb && (kb.foot === 'disc' || kb.foot === 'box')) foot = kb.foot;
  const floats = kb && typeof kb.floats === 'boolean' ? kb.floats : !!ci.floats;
  // what floats: the object units below the waterline (sceneMoverSize sink) in metres
  let sink = floats && mv && mv.top > 0 ? _wcR3(mv.sink * h / mv.top) : 0;
  if (kb && _wcNum(kb.sink) && kb.sink >= 0) sink = _wcR3(kb.sink);
  let deck = null;
  // the walkway deck lies under its ~1 m railing (it sat at railing height: people walked 1 m above the planks)
  if (cls === 'walkway') deck = { poly: [[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], y: _wcR3(h > 3 ? h * 0.55 : Math.max(0.15, h - 1.0)) };
  else if (cls === 'boat' && h < 6 && l > 5) deck = { poly: [[-l * 0.4, -w * 0.4], [l * 0.4, -w * 0.4], [l * 0.4, w * 0.4], [-l * 0.4, w * 0.4]], y: _wcR3(h * 0.8) };
  if (kb && _wcObjOf(kb.deck) && Array.isArray(kb.deck.poly) && kb.deck.poly.length >= 3 && _wcNum(kb.deck.y)) deck = { poly: kb.deck.poly.map(p => [p[0], p[1]]), y: kb.deck.y };
  // the trunk of a tree, the post of a lamp: a small solid disc; the plant's spread is passable
  const rad = cls === 'tree' ? Math.max(0.2, 0.025 * h) : (cls === 'lamp' || cls === 'post') ? Math.min(0.15, Math.max(0.05, Math.min(w, l) / 2)) : Math.max(0.05, Math.min(l, w) / 2);
  const views = Array.isArray(def.views) ? def.views.slice() : ['side'].concat(_WC_VIEWS.filter(v => sceneObj(id + '-' + v)));
  const attachOk = ci.attachOk.slice();
  if (kb && kb.habitat && Array.isArray(kb.habitat.on)) for (const t of kb.habitat.on) { const a = _WC_HAB_ATTACH[t]; if (a && !attachOk.includes(a)) attachOk.push(a); }
  const front = kb && typeof kb.orient === 'string' ? ['path', 'view', 'street'].includes(kb.orient) : WORLD_FRONT_CLASSES.includes(cls);
  return Object.freeze({ id, cls, kcls: kb && typeof kb.cls === 'string' ? kb.cls : cls, size: Object.freeze({ w: _wcR3(l), d: _wcR3(w), h: _wcR3(h) }),
    foot: foot === 'disc' ? 'disc' : 'box', footPoly: footPoly && Object.freeze(footPoly), r: _wcR3(rad), solidity, front,
    attachOk: Object.freeze(attachOk), floats, perch: !!ci.perch, sink, views: Object.freeze(views), deck: deck && Object.freeze(deck),
    variants: Math.max(1, def.variants | 0), variantNames: Array.isArray(def.variantNames) ? def.variantNames.slice() : null,
    clearance: kb && _wcNum(kb.clearance) ? kb.clearance : 0, perchPts: kb && Array.isArray(kb.perch) ? kb.perch : null,
    seasonal: def.seasonal !== false, src: real.src, kb: kb || null });
}
/** The world footprint of a descriptor at (x, z) with facing (degrees, 0 = +z, 90 = +x): a convex polygon. */
function _wcFoot(info, x, z, facing) {
  if (info.footPoly) return _wcLocalToWorld(info.footPoly, x, z, facing);
  if (info.foot === 'disc') { const out = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; out.push([_wcR3(x + info.r * Math.cos(a)), _wcR3(z + info.r * Math.sin(a))]); } return out; }
  const f = (_wcNum(facing) ? facing : 0) * _WC_DEG, hx = Math.sin(f), hz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f);
  const L = (info.front ? info.size.d : info.size.w) / 2, W = (info.front ? info.size.w : info.size.d) / 2;
  return [[-L, -W], [L, -W], [L, W], [-L, W]].map(([u, v]) => [_wcR3(x + u * hx + v * rx), _wcR3(z + u * hz + v * rz)]);
}
function _wcLocalToWorld(poly, x, z, facing) {
  const f = (_wcNum(facing) ? facing : 0) * _WC_DEG, hx = Math.sin(f), hz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f);
  return poly.map(([u, v]) => [_wcR3(x + u * hx + v * rx), _wcR3(z + u * hz + v * rz)]);
}
/** A known style: a backdrop style (core list or look's WORLD_BACKDROP_STYLES) or a fill style (kb's WORLD_FILL_STYLES). */
function _wcBackdropKnown(s) {
  if (!_wcStr(s)) return false;
  if (WORLD_BACKDROPS.includes(s)) return true;
  try { if (typeof WORLD_BACKDROP_STYLES === 'object' && WORLD_BACKDROP_STYLES && Object.prototype.hasOwnProperty.call(WORLD_BACKDROP_STYLES, s)) return true; } catch (e) { /* not loaded */ }
  return false;
}
function _wcStyleKnown(s) {
  if (_wcBackdropKnown(s)) return true;
  try { if (typeof WORLD_FILL_STYLES === 'object' && WORLD_FILL_STYLES && Object.prototype.hasOwnProperty.call(WORLD_FILL_STYLES, s)) return true; } catch (e) { /* not loaded */ }
  return false;
}
/** The backdrop style a place.style stands for: itself when it is a backdrop style, else its kit's backdrop (a style kit: 'quayside' draws the low town), else null. */
function _wcPlaceBackdrop(ps) {
  if (_wcBackdropKnown(ps)) return ps;
  try { const k = typeof worldKit === 'function' ? worldKit(ps) : null; if (k && _wcBackdropKnown(k.backdrop)) return k.backdrop; } catch (e) { /* kits not loaded */ }
  return null;
}
/** The default backdrop style of a spec (U1): place.style when it is a backdrop style or a kit, else a guess from its surfaces. */
function _wcStyleGuess(spec) {
  const ps = spec && _wcObjOf(spec.place) ? spec.place.style : null;
  const pb = _wcPlaceBackdrop(ps); if (pb) return pb;
  const surfs = spec && Array.isArray(spec.surfaces) ? spec.surfaces.filter(_wcObjOf) : [], has = k => surfs.some(s => s.kind === k), water = w => surfs.some(s => s.kind === 'water' && s.water === w);
  if (has('road') || has('pavement') || has('plaza') || has('tram')) return 'town-low';
  if (water('sea') || water('harbour')) return 'coast';
  if (water('canal')) return 'canal-wooded';
  if (has('heath')) return 'heath';
  if (has('field')) return 'farmland';
  return 'woodland';
}

/* ---------- the validator and the repair (5.2) ---------- */
const _WC_KEYS = {
  top: ['v', 'place', 'camera', 'cameras', 'ground', 'surfaces', 'lines', 'buildings', 'entities', 'landmarks', 'life', 'backdrop', 'fill', 'seed', 'marsh'],
  place: ['lat', 'lon', 'alt', 'region', 'origin', 'style'],
  camera: ['eye', 'fov', 'horizon', 'heading', 'x0', 'lat', 'lon', 'alt', 'water', 'preset'],
  camera31: ['id', 'at', 'height', 'eye', 'heading', 'lookAt', 'frame', 'fov', 'horizon', 'pitch', 'x0', 'lat', 'lon', 'alt', 'water', 'preset', 'relief'],
  ground: ['relief', 'features'], relief: ['x', 'd', 'nx', 'nd', 'h', 'src'], feature: ['id', 'kind', 'path', 'width', 'h', 'arc', 'scree', 'batter', 'rim', 'high', 'fade', 'rock', 'rough', 'scoop'],
  surface: ['id', 'kind', 'water', 'poly', 'path', 'width', 'shallow', 'level', 'obj', 'open', 'y', 'from', 'to', 'hint', 'flow', 'step', 'over'],
  step: ['to', 'kind'],
  line: ['id', 'kind', 'path', 'width', 'h', 'gaps', 'obj', 'stone', 'laid', 'cope'],
  building: ['id', 'foot', 'storeys', 'h', 'roof', 'style', 'facing', 'src', 'along', 'side', 'from', 'to', 'depth', 'shops', 'gap', 'crown', 'landmark', 'party', 'spacing'],
  entity: ['id', 'obj', 'at', 'facing', 'attach', 'variant', 'y', 'open', 'blocks', 'framed', 'row', 'parent', 'model'],
  cluster: ['cluster', 'on', 'edge', 'n', 'seed', 'gap', 'variant'],
  landmark: ['id', 'obj', 'at', 'facing', 'src', 'variant', 'attach', 'model'],
  life: ['id', 'who', 'on', 'rate', 'count', 'every', 'mix', 'edges', 'goals', 'group', 'state', 'framed'],
  goal: ['go', 'do', 'for', 'wander', 'follow', 'meet', 'leave', 'sit', 'wait', 'board', 'enter', 'fish', 'feed', 'view'],
  backdrop: ['style', 'skyline'], skyline: ['obj', 'bearing', 'dist', 'src'],
};
const _WC_FIX = {
  unknownKey: 'remove the key; the v3 format has closed key sets (WORLD_ENGINE.md 5.2)',
  screenOrLookField: 'remove it: screen position, scale, layer, light, shadow and reflection are derived by the engine',
  seasonPinned: 'remove it: the season comes from the live sky',
  perSeasonData: 'remove it: season, time of day and weather are parameters (V1); the engine colours, leafs and lights by date',
  unknownSize: 'use a library object with a real size (SCENE_REAL_SIZE, WORLD_SIZE_GAPS or the knowledge base)',
  unknownVariant: 'use a variant the object has, or leave it out (a seeded default)', careRule: 'use another object: it breaks the care rules (K9) or is a hand shadow / reflection (L3)',
  regionInvalid: 'use an object that belongs in this region (K7)', badAttach: 'move it onto a surface its class may use, or change attach', overlap: 'move the two solids apart',
  blocksPath: 'move it off the path or set blocks: true', orphan: 'place it within reach of its parent (a bough by its tree) or name parent',
  orient: 'leave facing out: the engine faces it by its rules (K3)', gridRow: 'scatter it, or set row: true when the row is real',
  nearBand: 'place people and animals beyond the near band (f x h / 405 m) or mark a framing element framed: true',
  unreachable: 'give the population a surface of its layer and reachable targets',
  emptyBackground: 'add backdrop: { style } or place.style', unknownBackdrop: 'use one of WORLD_BACKDROPS', landmarkSrc: 'add src: where the landmark\'s position comes from',
  templated: 'move the camera (>= 25 degrees or >= 30 m) and recompose the layout', dupId: 'make ids unique', unknownSurface: 'refer to a surface id that exists',
  unknownWho: 'use a population name (WORLD_POPULATIONS) or a library object id', badSurface: 'give poly (>= 3 points) or path (>= 2 points) + width',
  badVersion: 'set v: 3 (camera frame) or v: 3.1 (place frame with cameras)', badType: 'use the documented type', badValue: 'use a value in range', missingField: 'add the field',
  walkwayWater: 'a walkway joins land to land, or runs to a platform at a reed edge, and never crosses open water: run it over the carr, the reed bed or a bridge between two banks (a jetty, pier or pontoon says over: "water" and is fixed to the shore)',
  buildError: 'the entry threw while loading; give it plain data',
};
/** Split a key into its words (camelCase, kebab, snake). */
function _wcWords(k) { return String(k).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[\s_-]+/).filter(Boolean); }
function _wcSeasonalKey(k) { return _wcWords(k).some(w => _WC_SEASON_WORDS.has(w)); }
/** The base object of a seasonal or night copy, when the library has it (V1). */
function _wcSeasonBase(id) {
  if (typeof id !== 'string' || !_WC_SEASON_SUFFIX.test(id)) return null;
  const base = id.replace(_WC_SEASON_SUFFIX, '');
  return base !== id && worldObjectInfo(base) ? base : null;
}
function _wcSurfContains(s, x, z) {
  if (Array.isArray(s.poly) && s.poly.length >= 3) return _wcInPoly(s.poly, x, z);
  if (Array.isArray(s.path) && s.path.length >= 2 && s.width > 0) return _wcLineDist(s.path, x, z) <= s.width / 2;
  return false;
}
function _wcSurfOk(s) {
  if (!_wcObjOf(s)) return false;
  if (Array.isArray(s.poly)) return s.poly.length >= 3 && s.poly.every(_wcPt) && Math.abs(_wcPolyArea(s.poly)) > 1e-6 && s.path == null;
  if (Array.isArray(s.path)) return s.path.length >= 2 && s.path.every(_wcPt) && _wcNum(s.width) && s.width > 0;
  return false;
}
const _wcRaised = s => s && (_wcNum(s.y) && s.y > 0 || WORLD_JOIN_KINDS.includes(s.kind));
/** The surface of a spec under (x, z), later surfaces win, raised ones skipped (the validator's ground view). */
function _wcSpecSurfAt(surfs, x, z) { for (let i = surfs.length - 1; i >= 0; i--) if (_wcSurfOk(surfs[i]) && !_wcRaised(surfs[i]) && _wcSurfContains(surfs[i], x, z)) return surfs[i]; return null; }
function _wcAttachKind(a) { const s = String(a || ''); const i = s.indexOf(':'); return i < 0 ? s : s.slice(0, i); }
function _wcAttachRef(a) { const s = String(a || ''); const i = s.indexOf(':'); return i < 0 ? null : s.slice(i + 1); }
function _wcPopOf(who) {
  if (typeof who !== 'string') return null;
  if (WORLD_POPULATIONS.hasOwnProperty(who)) return WORLD_POPULATIONS[who];
  const info = worldObjectInfo(who);
  if (!info) return null;
  const k = info.attachOk[0];
  const layer = info.cls === 'heron' ? 'wade' : k === 'water' ? 'swim' : k === 'rail' ? 'rail' : k === 'air' ? 'air' : info.cls === 'grazer' ? 'graze' : (info.cls === 'vehicle' || info.cls === 'cyclist') ? 'drive' : 'walk';
  return { layer, obj: who };
}
function _wcRelief(r) {
  return _wcObjOf(r) && Array.isArray(r.x) && r.x.length === 2 && r.x.every(_wcNum) && r.x[1] > r.x[0] && Array.isArray(r.d) && r.d.length === 2 && r.d.every(_wcNum) && r.d[0] > 0 && r.d[1] > r.d[0]
    && Number.isInteger(r.nx) && Number.isInteger(r.nd) && r.nx >= 2 && r.nd >= 2 && Array.isArray(r.h) && r.h.length === r.nx * r.nd && r.h.every(_wcNum);
}
const _wcVariantOk = (info, v) => (Number.isInteger(v) && v >= 0 && v < info.variants) || (typeof v === 'string' && !!info.variantNames && info.variantNames.includes(v));
/** Is this object refused by the care rules (K9, kb) or itself a hand shadow, reflection or light (L3)? A reason, or null. */
function _wcCareOf(id) {
  if (WORLD_LOOK_OBJ_RE.test(String(id))) return 'a hand-drawn shadow, reflection or light effect (L3)';
  if (typeof worldKbCare === 'function') {
    try { const c = worldKbCare(id); if (c === false || (c && c.ok === false)) return (c && c.reason) || 'it breaks the care rules (K9)'; } catch (e) { /* no verdict */ }
  }
  return null;
}

/**
 * Expand `marsh: [{ id, walk, width, seed, from, reach, open, density, water, rails, platform }]` (see worldMarsh, 79-world-4marsh.js)
 * into plain surfaces, lines and entities of the spec. The marsh's water is listed right after the last water the author listed
 * (so the author's reeds and banks win over it), everything else of the marsh last (islands, spine, walk, platform: they win over
 * the water, and over the author's far reed beds). -> { spec (a new object; `marsh` removed), problems: [{ path, msg }] }
 */
function _wcMarshExpand(spec) {
  const out = Object.assign({}, spec), problems = [];
  delete out.marsh;
  const list = Array.isArray(spec.marsh) ? spec.marsh : [spec.marsh];
  const surfaces = Array.isArray(spec.surfaces) ? spec.surfaces.slice() : [], lines = Array.isArray(spec.lines) ? spec.lines.slice() : [], entities = Array.isArray(spec.entities) ? spec.entities.slice() : [];
  list.forEach((m, i) => {
    const p = `marsh[${i}]`;
    if (!_wcObjOf(m)) { problems.push({ path: p, msg: 'a marsh is an object: { walk: [[x, z], ...], width, seed, from, reach, open, density, platform }' }); return; }
    if (!(Array.isArray(m.walk) && m.walk.length >= 2 && m.walk.every(_wcPt))) { problems.push({ path: p + '.walk', msg: 'a marsh needs walk: its boardwalk centre line, two points or more' }); return; }
    if (typeof worldMarsh !== 'function') { problems.push({ path: p, msg: 'the marsh generator is not loaded' }); return; }
    let g = null;
    try { g = worldMarsh(m); } catch (e) { problems.push({ path: p, msg: 'the marsh generator threw: ' + String(e && e.message || e) }); return; }
    if (!g || !g.surfaces || !g.surfaces.length) { problems.push({ path: p, msg: (g && g.report && g.report.error) || 'the marsh made nothing' }); return; }
    let at = -1;
    surfaces.forEach((s, k) => { if (_wcObjOf(s) && s.kind === 'water') at = k; });
    surfaces.splice(at + 1, 0, g.surfaces[0]);
    for (const s of g.surfaces.slice(1)) surfaces.push(s);
    for (const l of g.lines) lines.push(l);
    for (const e of g.entities) entities.push(e);
  });
  out.surfaces = surfaces;
  if (lines.length) out.lines = lines;
  if (entities.length) out.entities = entities;
  return { spec: out, problems };
}
/**
 * The one checker behind worldValidate and worldRepair. Each error carries the action that repairs it: strip (delete the key),
 * set (default a value), drop (remove the entry), flag (keep, mark) or place (left to the placement solver, 1place). In
 * validate mode nothing is touched; in repair mode the checker runs on a robust copy and applies the actions after the pass.
 */
function _wcCheck(spec0, repair) {
  const C = { errs: [], warns: [], acts: [], log: [] };
  const act = (path, rule, msg, a, extra) => {
    const sev = rule === 'templated' ? 'warn' : !a ? (WORLD_RULE_SEVERITY[rule] || 'repair') : a.do === 'drop' ? 'drop' : a.do === 'fatal' ? 'fatal' : 'repair';
    const e = { path, rule, msg, fix: _WC_FIX[rule] || '', severity: sev };
    if (rule === 'templated') C.warns.push(e); else C.errs.push(e);
    if (repair && a && a.do !== 'place') C.acts.push(Object.assign({ e }, a, extra || {}));
  };
  const strip = (o, k, who) => ({ do: 'strip', o, k, who }), set = (o, k, v, who, action) => ({ do: 'set', o, k, v, who, action }), drop = (list, item, who) => ({ do: 'drop', list, item, who });
  const place = { do: 'place' };
  if (!_wcObjOf(spec0)) {
    act('spec', 'badType', 'a spec must be an object', { do: 'fatal' });
    const spec = { v: 3, camera: {}, surfaces: [], entities: [], backdrop: { style: 'woodland' } };
    if (repair) C.log.push({ id: null, obj: null, action: 'default', rule: 'badType', reason: 'a spec must be an object: an empty scene (default camera, bare ground)', from: null, to: 'empty', by: 'sense', path: 'spec', severity: 'fatal' });
    return { spec, errors: C.errs, warnings: C.warns, log: C.log };
  }
  // a `marsh` list is expanded first (79-world-4marsh.js: the walk and a few numbers become the wetland's surfaces, rails and
  // plants), so the validator and the repair see, and judge, exactly what will be built; the scene stays pure data
  let marshProblems = [];
  if (Array.isArray(spec0.marsh) || spec0.marsh != null) { const ex = _wcMarshExpand(spec0); spec0 = ex.spec; marshProblems = ex.problems; }
  const thrown = [];
  const spec = repair ? _wcClone(spec0, (p, m) => thrown.push({ p, m })) : spec0;
  for (const mp of marshProblems) act(mp.path, 'badValue', mp.msg);
  for (const t of thrown) C.log.push({ id: null, obj: null, action: 'drop', rule: 'buildError', reason: `${t.p} threw: ${t.m}`, from: null, to: null, by: 'sense', path: t.p, severity: 'drop' });
  const threw = o => repair && o && typeof o === 'object' && _wcThrew.has(o) ? _wcThrew.get(o) : null;

  /** Closed keys of one object and the look / season bans. */
  const keys = (o, allowed, path, who) => {
    if (!_wcObjOf(o)) return false;
    for (const k of Object.keys(o)) {
      if (WORLD_LOOK_KEYS.includes(k)) act(path + '.' + k, 'screenOrLookField', `${k} is a screen or look field`, strip(o, k, who));
      else if (k === 'season' || k === 'seasons') act(path + '.' + k, 'seasonPinned', 'a scene cannot pin its season', strip(o, k, who));
      else if (allowed.includes(k)) continue;
      else if (_wcSeasonalKey(k)) act(path + '.' + k, 'perSeasonData', `${k} is per-season, per-time or per-weather data`, strip(o, k, who));
      else act(path + '.' + k, 'unknownKey', `unknown key ${k}`, strip(o, k, who));
    }
    return true;
  };
  const listOf = (o, key, path) => {
    if (o[key] == null) return [];
    if (!Array.isArray(o[key])) { act(path, 'badType', key + ' must be a list', strip(o, key)); return []; }
    return o[key];
  };

  // version (G11)
  const camLike = c => _wcObjOf(c) && (c.at != null || c.lookAt != null || c.frame != null || c.height != null || c.id != null);
  let v = spec.v;
  if (v !== 3 && v !== 3.1) {
    const to = (Array.isArray(spec.cameras) || camLike(spec.camera)) ? 3.1 : 3;
    act('spec.v', 'badVersion', `v must be 3 or 3.1 (got ${JSON.stringify(v)}); read as ${to}`, set(spec, 'v', to, null, 'migrate'));
    v = to;
  } else if (v === 3 && Array.isArray(spec.cameras)) {
    act('spec.v', 'badVersion', 'cameras belong to v 3.1 (the place frame)', set(spec, 'v', 3.1, null, 'migrate'));
    v = 3.1;
  }
  const v31 = v === 3.1;
  keys(spec, _WC_KEYS.top, 'spec');
  if (spec.seed != null && !Number.isInteger(spec.seed)) act('spec.seed', 'badType', 'seed must be an integer', strip(spec, 'seed'));
  if (spec.fill != null && typeof spec.fill !== 'boolean') act('spec.fill', 'badType', 'fill is a boolean (false: no auto-fill)', strip(spec, 'fill'));
  if (spec.place != null) {
    if (!_wcObjOf(spec.place)) act('place', 'badType', 'place must be an object', strip(spec, 'place'));
    else {
      const P = spec.place;
      keys(P, _WC_KEYS.place, 'place');
      for (const k of ['lat', 'lon', 'alt']) if (P[k] != null && !_wcNum(P[k])) act('place.' + k, 'badType', k + ' must be a number', strip(P, k));
      if (P.region != null && !_wcStr(P.region)) act('place.region', 'badType', 'region is a string', strip(P, 'region'));
      if (P.origin != null && !(_wcPt(P.origin) && Math.abs(P.origin[0]) <= 90 && Math.abs(P.origin[1]) <= 180)) act('place.origin', 'badValue', 'origin is [lat, lon]', strip(P, 'origin'));
      if (P.style != null && !_wcStyleKnown(P.style)) act('place.style', 'badValue', 'unknown place style ' + JSON.stringify(P.style), strip(P, 'style'));
    }
  }
  const P = _wcObjOf(spec.place) ? spec.place : {};

  // ids first: every later check can see surfaces, entities, landmarks, buildings and populations
  const surfs0 = Array.isArray(spec.surfaces) ? spec.surfaces : [], sIds = new Map(), eIds = new Map(), bIds = new Map(), lifeIds = new Set(), whoIds = new Set();
  for (const s of surfs0) if (_wcObjOf(s) && _wcStr(s.id) && !sIds.has(s.id)) sIds.set(s.id, s);
  for (const key of ['entities', 'landmarks']) for (const e of (Array.isArray(spec[key]) ? spec[key] : [])) if (_wcObjOf(e) && _wcStr(e.id) && !eIds.has(e.id) && !sIds.has(e.id)) eIds.set(e.id, e);
  for (const b of (Array.isArray(spec.buildings) ? spec.buildings : [])) if (_wcObjOf(b) && _wcStr(b.id)) bIds.set(b.id, b);
  for (const L of (Array.isArray(spec.life) ? spec.life : [])) if (_wcObjOf(L)) { if (_wcStr(L.id)) lifeIds.add(L.id); if (_wcStr(L.who)) whoIds.add(L.who); }
  const anyId = id => typeof id === 'string' && (sIds.has(id) || eIds.has(id) || bIds.has(id));

  // cameras
  if (!v31) {
    if (spec.camera == null) act('camera', 'missingField', 'camera is required', set(spec, 'camera', {}));
    else if (!_wcObjOf(spec.camera)) act('camera', 'badType', 'camera must be an object', set(spec, 'camera', {}));
    else {
      const c = spec.camera;
      keys(c, _WC_KEYS.camera, 'camera');
      for (const k of ['eye', 'fov', 'horizon', 'heading', 'x0', 'lat', 'lon', 'alt', 'water']) if (c[k] != null && !_wcNum(c[k])) act('camera.' + k, 'badType', k + ' must be a number', strip(c, k));
      if (_wcNum(c.eye) && c.eye <= 0) act('camera.eye', 'badValue', 'eye must be above the ground', strip(c, 'eye'));
      if (_wcNum(c.fov) && (c.fov < 10 || c.fov > 150)) act('camera.fov', 'badValue', 'fov 10..150', strip(c, 'fov'));
      if (c.preset != null && !_wcStr(c.preset)) act('camera.preset', 'badType', 'preset is a string', strip(c, 'preset'));
    }
  } else {
    let cams = spec.cameras;
    if (cams == null && spec.camera != null) {
      if (_wcObjOf(spec.camera)) { cams = [spec.camera]; if (repair) { spec.cameras = cams; delete spec.camera; } }
      else act('camera', 'badType', 'camera must be an object', strip(spec, 'camera'));
    } else if (cams != null && spec.camera != null) act('camera', 'badValue', 'give cameras or camera, not both', strip(spec, 'camera'));
    if (cams == null || (Array.isArray(cams) && !cams.length)) { act('cameras', 'missingField', 'a v3.1 spec needs at least one camera', set(spec, 'cameras', [{ id: 'main', frame: [] }])); cams = []; }
    else if (!Array.isArray(cams)) { act('cameras', 'badType', 'cameras is a list', set(spec, 'cameras', [{ id: 'main', frame: [] }])); cams = []; }
    const cIds = new Set();
    cams.forEach((c, i) => {
      const p = `cameras[${i}]`;
      if (!_wcObjOf(c) || threw(c)) { act(p, threw(c) ? 'buildError' : 'badType', threw(c) ? 'the camera threw: ' + threw(c) : 'a camera is an object', drop(cams, c)); return; }
      if (i >= 8) { act(p, 'badValue', 'at most 8 cameras', drop(cams, c)); return; }
      keys(c, _WC_KEYS.camera31, p);
      if (c.id != null && !(_wcStr(c.id) && /^[a-z0-9][a-z0-9-]*$/i.test(c.id))) act(p + '.id', 'badValue', 'a camera id is letters, digits and -', strip(c, 'id'));
      else if (_wcStr(c.id) && cIds.has(c.id)) act(p + '.id', 'dupId', 'duplicate camera id ' + c.id, strip(c, 'id'));
      else if (_wcStr(c.id)) cIds.add(c.id);
      if (c.at != null && !_wcPt(c.at)) act(p + '.at', 'badValue', 'at is [x, z] metres in the place frame (or [lat, lon])', strip(c, 'at'));
      for (const k of ['height', 'eye', 'heading', 'fov', 'horizon', 'pitch', 'x0', 'lat', 'lon', 'alt', 'water']) if (c[k] != null && !_wcNum(c[k])) act(`${p}.${k}`, 'badType', k + ' must be a number', strip(c, k));
      for (const k of ['height', 'eye']) if (_wcNum(c[k]) && (c[k] <= 0.2 || c[k] > 3000)) act(`${p}.${k}`, 'badValue', k + ' is metres above the ground (0.2..3000)', strip(c, k));
      if (_wcNum(c.fov) && (c.fov < 10 || c.fov > 150)) act(p + '.fov', 'badValue', 'fov 10..150', strip(c, 'fov'));
      if (_wcNum(c.pitch) && Math.abs(c.pitch) > 60) act(p + '.pitch', 'badValue', 'pitch -60..60', strip(c, 'pitch'));
      if (c.lookAt != null && !_wcNum(c.lookAt) && !anyId(c.lookAt)) act(p + '.lookAt', 'badValue', 'lookAt is a bearing or the id of a landmark, entity, building or surface', strip(c, 'lookAt'));
      if (c.frame != null) {
        if (!Array.isArray(c.frame)) act(p + '.frame', 'badType', 'frame is a list of ids', strip(c, 'frame'));
        else for (const id of c.frame) if (!anyId(id)) act(p + '.frame', 'badValue', 'frame names no id ' + JSON.stringify(id), set(c, 'frame', c.frame.filter(anyId)));
      }
      if (c.preset != null && !_wcStr(c.preset)) act(p + '.preset', 'badType', 'preset is a string', strip(c, 'preset'));
      if (c.relief != null && !_wcRelief(c.relief)) act(p + '.relief', 'badValue', 'relief is { x: [a, b], d: [a, b], nx, nd, h: [nx * nd] }', strip(c, 'relief'));
    });
    // C7 (cheap part): two cameras of one place at nearly the same spot and heading
    const poses = cams.map((c, i) => _wcObjOf(c) && _wcPt(c.at) && (_wcNum(c.heading) || _wcNum(c.lookAt)) ? { i, at: c.at, h: _wcNum(c.heading) ? c.heading : c.lookAt } : null).filter(Boolean);
    for (let a = 0; a < poses.length; a++) for (let b = a + 1; b < poses.length; b++) {
      const A = poses[a], B = poses[b], hd = _wcAngDiff(A.h, B.h), dm = Math.hypot(A.at[0] - B.at[0], A.at[1] - B.at[1]);
      if (hd < 25 && dm < 30) act(`cameras[${A.i}]`, 'templated', `cameras ${A.i} and ${B.i} differ by ${_wcR3(hd)} degrees and ${_wcR3(dm)} m`);
    }
  }

  // ground (W2)
  if (spec.ground != null) {
    if (!_wcObjOf(spec.ground)) act('ground', 'badType', 'ground must be an object', strip(spec, 'ground'));
    else {
      const g = spec.ground;
      keys(g, _WC_KEYS.ground, 'ground');
      if (g.relief != null) { keys(g.relief, _WC_KEYS.relief, 'ground.relief'); if (!_wcRelief(g.relief)) act('ground.relief', 'badValue', 'relief is { x: [a, b], d: [a, b], nx, nd, h: [nx * nd] }', strip(g, 'relief')); }
      const feats = listOf(g, 'features', 'ground.features');
      feats.forEach((f, i) => {
        const p = `ground.features[${i}]`;
        if (!_wcObjOf(f) || threw(f)) { act(p, 'badType', 'a feature is an object', drop(feats, f)); return; }
        keys(f, _WC_KEYS.feature, p, f.id);
        if (!WORLD_FEATURE_KINDS.includes(f.kind)) { act(p + '.kind', 'badValue', 'kind is bank, embankment, cutting, slope or cliff', drop(feats, f, f.id)); return; }
        // a cliff's plan is a path or an arc (4cliff: the arc becomes its polyline here, before the camera transform maps the points)
        const arcP = f.kind === 'cliff' && !f.path && _wcObjOf(f.arc) && typeof worldCliffArcPath === 'function' ? worldCliffArcPath(f.arc) : null;
        if (arcP && repair) f.path = arcP;
        if (!(Array.isArray(f.path || arcP) && (f.path || arcP).length >= 2 && (f.path || arcP).every(_wcPt))) { act(p + '.path', 'badSurface', f.kind === 'cliff' ? 'a cliff needs path (>= 2 points) or arc { c: [x, z], r, from, to }' : 'a feature needs path (>= 2 points)', drop(feats, f, f.id)); return; }
        if (f.kind === 'cliff') {
          if (!(_wcNum(f.h) && f.h > 0 && f.h <= 400)) act(p + '.h', f.h == null ? 'missingField' : 'badValue', 'h is metres (0..400)', set(f, 'h', 30, f.id));
          if (f.rock != null && typeof WORLD_CLIFF_ROCKS !== 'undefined' && !WORLD_CLIFF_ROCKS.includes(f.rock)) act(p + '.rock', 'badValue', 'rock is ' + WORLD_CLIFF_ROCKS.join(', '), strip(f, 'rock', f.id));
          if (f.high != null && !['far', 'left', 'right'].includes(f.high)) act(p + '.high', 'badValue', 'high is far, left or right', strip(f, 'high', f.id));
          if (f.rough != null && f.rough !== false && !(_wcNum(f.rough) && f.rough >= 0 && f.rough <= 3)) act(p + '.rough', 'badValue', 'rough is 0..3 (default 1) or false', strip(f, 'rough', f.id));
          if (f.scoop != null && typeof f.scoop !== 'boolean' && !_wcObjOf(f.scoop)) act(p + '.scoop', 'badValue', 'scoop is true, false or { at: 0..1, w, depth }', strip(f, 'scoop', f.id));
          return;
        }
        if (!(_wcNum(f.width) && f.width > 0)) act(p + '.width', f.width == null ? 'missingField' : 'badValue', 'width is metres > 0', set(f, 'width', 6, f.id));
        if (!(_wcNum(f.h) && f.h > 0 && f.h < 200)) act(p + '.h', f.h == null ? 'missingField' : 'badValue', 'h is metres (0..200)', set(f, 'h', 1, f.id));
      });
    }
  }

  // surfaces (W3, W4, H5)
  const surfs = listOf(spec, 'surfaces', 'surfaces'), seenS = new Set();
  surfs.forEach((s, i) => {
    const p = `surfaces[${i}]`;
    if (!_wcObjOf(s) || threw(s)) { act(p, threw(s) ? 'buildError' : 'badType', threw(s) ? 'the surface threw: ' + threw(s) : 'a surface is an object', drop(surfs, s)); return; }
    const who = s.id;
    keys(s, _WC_KEYS.surface, p, who);
    if (!_wcStr(s.id)) act(p + '.id', 'missingField', 'a surface needs an id', set(s, 'id', '_s' + i));
    else if (seenS.has(s.id)) act(p + '.id', 'dupId', 'duplicate surface id ' + s.id, set(s, 'id', s.id + '~' + i, who));
    else seenS.add(s.id);
    let kind = s.kind;
    if (!WORLD_SURFACE_KINDS.hasOwnProperty(kind)) {
      const al = WORLD_SURFACE_ALIAS[kind];
      if (al) {
        act(p + '.kind', 'badValue', `unknown surface kind ${kind}: read as ${al}`, set(s, 'kind', al, who));
        if (al === 'water' && s.water == null && repair) s.water = WORLD_WATER_KINDS.includes(kind) ? kind : 'pond';
        if (/^(jetty|pier|pontoon)$/.test(kind) && s.over == null && repair) s.over = 'water';   // a jetty is a walkway meant to lie over the water
        kind = al;
      } else { act(p + '.kind', 'badValue', 'unknown surface kind ' + kind, drop(surfs, s, who)); return; }
    }
    if (!_wcSurfOk(s)) { act(p, 'badSurface', 'a surface needs poly (>= 3 points, non-zero area) or path (>= 2 points) + width > 0, not both', drop(surfs, s, who)); return; }
    if (kind === 'water') {
      if (!WORLD_WATER_KINDS.includes(s.water)) act(p + '.water', 'badValue', 'water must be one of ' + WORLD_WATER_KINDS.join(', '), set(s, 'water', WORLD_WATER_ALIAS[s.water] || 'pond', who));
      if (s.shallow != null && !(_wcNum(s.shallow) && s.shallow >= 0)) act(p + '.shallow', 'badValue', 'shallow is metres >= 0', strip(s, 'shallow', who));
      if (s.level != null && !_wcNum(s.level)) act(p + '.level', 'badType', 'level is metres', strip(s, 'level', who));
      if (s.hint != null && !WORLD_WATER_HINTS.includes(s.hint)) act(p + '.hint', 'badValue', 'hint is calm or breezy', strip(s, 'hint', who));
      if (s.flow != null && !_wcNum(s.flow)) act(p + '.flow', 'badType', 'flow is a direction in degrees', strip(s, 'flow', who));
      if (s.step != null) {
        const st = s.step;
        if (!_wcObjOf(st)) act(p + '.step', 'badType', 'step is { to: <water id>, kind: weir | lock | fall }', strip(s, 'step', who));
        else {
          keys(st, _WC_KEYS.step, p + '.step', who);
          const tgt = sIds.get(st.to);
          if (!tgt || tgt === s || tgt.kind !== 'water') act(p + '.step.to', 'unknownSurface', 'step.to names another water surface', strip(s, 'step', who));
          else if (st.kind != null && !WORLD_STEP_KINDS.includes(st.kind)) act(p + '.step.kind', 'badValue', 'step kind is weir, lock or fall', set(st, 'kind', 'weir', who));
        }
      }
    } else for (const k of ['water', 'shallow', 'level', 'hint', 'flow', 'step']) if (s[k] != null) act(p + '.' + k, 'unknownKey', k + ' is only for water surfaces', strip(s, k, who));
    if (s.y != null) {
      if (!WORLD_RAISED_KINDS.includes(kind)) act(p + '.y', 'unknownKey', 'y is only for raised walk surfaces (' + WORLD_RAISED_KINDS.join(', ') + ')', strip(s, 'y', who));
      else if (!(_wcNum(s.y) && s.y >= 0 && s.y <= 300)) act(p + '.y', 'badValue', 'y is metres above the ground (0..300)', strip(s, 'y', who));
    }
    for (const k of ['from', 'to']) {
      if (WORLD_JOIN_KINDS.includes(kind)) {
        if (s[k] == null) act(`${p}.${k}`, 'missingField', `${kind} join two levels: ${k} is a height, 'ground' or a surface id`, set(s, k, 'ground', who));
        else if (!_wcNum(s[k]) && s[k] !== 'ground' && !sIds.has(s[k]) && !(eIds.has(s[k]) && typeof worldModelFor === 'function' && (worldModelFor((eIds.get(s[k]) || {}).obj) || {}).deck)) act(`${p}.${k}`, 'badValue', `${k} is a height, 'ground', a surface id or an entity that carries a deck (a model with a deck)`, set(s, k, 'ground', who));
      } else if (s[k] != null) act(`${p}.${k}`, 'unknownKey', k + ' is only for stairs and ramps', strip(s, k, who));
    }
    if (WORLD_JOIN_KINDS.includes(kind) && !Array.isArray(s.path)) { act(p, 'badSurface', `${kind} need a path (from the first point to the last)`, drop(surfs, s, who)); return; }
    if (s.obj != null && !worldObjectInfo(s.obj)) act(p + '.obj', 'unknownSize', 'no world descriptor for ' + s.obj, strip(s, 'obj', who));
    if (s.open != null && (kind !== 'hedge' || typeof s.open !== 'boolean')) act(p + '.open', 'badValue', 'open is a boolean on a hedge (a gap)', strip(s, 'open', who));
    if (s.over != null && !(s.over === 'water' && WORLD_WALKWAY_KINDS.includes(kind))) act(p + '.over', 'unknownKey', "over is 'water' and only for a walkway (boardwalk, deck, platform, bridge-deck) that is meant to lie over the water", strip(s, 'over', who));
  });
  // walkways never cross open water (SCENE_LESSONS Q: a boardwalk ran across the pond to a platform mid-lake and every check passed)
  {
    const okS = surfs.filter(q => _wcObjOf(q) && _wcSurfOk(q) && !threw(q));
    for (const v of worldWalkwayWater(okS)) act(`surfaces[${surfs.indexOf(v.surface)}]`, 'walkwayWater', v.msg, { do: 'flag', who: v.id });
  }

  // lines and buildings (Q2, Q3: drawn by appearance; solid to the solver)
  const lines = listOf(spec, 'lines', 'lines');
  lines.forEach((l, i) => {
    const p = `lines[${i}]`;
    if (!_wcObjOf(l) || threw(l)) { act(p, 'badType', 'a line is an object', drop(lines, l)); return; }
    keys(l, _WC_KEYS.line, p, l.id);
    if (l.id != null && !_wcStr(l.id)) act(p + '.id', 'badType', 'id is a string', strip(l, 'id'));
    if (!WORLD_LINE_KINDS.includes(l.kind)) { const al = { hedgerow: 'hedge', railings: 'railing', walls: 'wall', fences: 'fence', curb: 'kerb' }[l.kind]; if (al) act(p + '.kind', 'badValue', `unknown line kind ${l.kind}: read as ${al}`, set(l, 'kind', al, l.id)); else { act(p + '.kind', 'badValue', 'kind is ' + WORLD_LINE_KINDS.join(', '), drop(lines, l, l.id)); return; } }
    if (!(Array.isArray(l.path) && l.path.length >= 2 && l.path.every(_wcPt))) { act(p + '.path', 'badSurface', 'a line needs path (>= 2 points)', drop(lines, l, l.id)); return; }
    for (const k of ['width', 'h']) if (l[k] != null && !(_wcNum(l[k]) && l[k] > 0)) act(`${p}.${k}`, 'badValue', k + ' is metres > 0', strip(l, k, l.id));
    if (l.gaps != null && !(Array.isArray(l.gaps) && l.gaps.every(g => (_wcPt(g) && g[0] >= 0 && g[1] > g[0]) || (g && typeof g === 'object' && !Array.isArray(g) && (_wcNum(g.at) || _wcPt(g.at)) && (g.w == null || (_wcNum(g.w) && g.w > 0)))))) act(p + '.gaps', 'badValue', 'gaps are [[s0, s1]] arc lengths in metres, or { at: metres along | [x, z], w } (the extruder reads both)', strip(l, 'gaps', l.id));
    if (l.obj != null && !worldObjectInfo(l.obj)) act(p + '.obj', 'unknownSize', 'no world descriptor for ' + l.obj, strip(l, 'obj', l.id));
    if (l.laid != null && !(l.kind === 'wall' && typeof WORLD_MASONRY_LAID !== 'undefined' && WORLD_MASONRY_LAID.includes(l.laid))) act(p + '.laid', 'badValue', 'laid is coursed, rubble or drystone, on a wall (how the stone is laid)', strip(l, 'laid', l.id));
    if (l.cope != null && !(l.kind === 'wall' && typeof WORLD_MASONRY_COPE !== 'undefined' && WORLD_MASONRY_COPE.includes(l.cope))) act(p + '.cope', 'badValue', 'cope is saddle, flat or upright, on a wall', strip(l, 'cope', l.id));
  });
  const blds = listOf(spec, 'buildings', 'buildings');
  blds.forEach((b, i) => {
    const p = `buildings[${i}]`;
    if (!_wcObjOf(b) || threw(b)) { act(p, 'badType', 'a building is an object', drop(blds, b)); return; }
    keys(b, _WC_KEYS.building, p, b.id);
    // a whole side of a street (79-world-1frontage.js): the engine cuts it into houses along a surface's centre line
    if (b.along != null) {
      const as = sIds.get(b.along);
      if (!as || !Array.isArray(as.path) || !(_wcNum(as.width) && as.width > 0)) { act(p + '.along', 'unknownSurface', 'along names a surface with a centre line (path) and a width: ' + b.along, drop(blds, b, b.id)); return; }
      if (b.side != null && b.side !== 'left' && b.side !== 'right') act(p + '.side', 'badValue', "side is 'left' or 'right' (of the direction of the centre line)", strip(b, 'side', b.id));
      if (b.storeys != null && !((Number.isInteger(b.storeys) && b.storeys >= 1 && b.storeys <= 100) || (Array.isArray(b.storeys) && b.storeys.length === 2 && b.storeys.every(v => Number.isInteger(v) && v >= 1 && v <= 100) && b.storeys[0] <= b.storeys[1]))) act(p + '.storeys', 'badValue', 'storeys is 1..100 or [min, max]', strip(b, 'storeys', b.id));
      for (const k of ['from', 'to']) if (b[k] != null && !(_wcNum(b[k]) && b[k] >= 0)) act(p + '.' + k, 'badValue', k + ' is metres along the centre line', strip(b, k, b.id));
      if (b.depth != null && !((_wcNum(b.depth) && b.depth > 1) || (Array.isArray(b.depth) && b.depth.length === 2 && b.depth.every(v => _wcNum(v) && v > 1)))) act(p + '.depth', 'badValue', 'depth is metres or [min, max]', strip(b, 'depth', b.id));
      if (b.foot != null) act(p + '.foot', 'unknownKey', 'an along building has no foot (its houses get theirs from the centre line)', strip(b, 'foot', b.id));
      for (const k of ['roof', 'style', 'src', 'id']) if (b[k] != null && !_wcStr(b[k])) act(`${p}.${k}`, 'badType', k + ' is a string', strip(b, k, b.id));
      return;
    }
    if (!(Array.isArray(b.foot) && b.foot.length >= 3 && b.foot.every(_wcPt) && Math.abs(_wcPolyArea(b.foot)) > 1)) { act(p + '.foot', 'badSurface', 'a building needs foot (>= 3 points, area > 1 m2)', drop(blds, b, b.id)); return; }
    if (b.storeys != null && !(Number.isInteger(b.storeys) && b.storeys >= 1 && b.storeys <= 100)) act(p + '.storeys', 'badValue', 'storeys is 1..100', strip(b, 'storeys', b.id));
    if (b.h != null && !(_wcNum(b.h) && b.h > 0 && b.h < 1000)) act(p + '.h', 'badValue', 'h is metres', strip(b, 'h', b.id));
    if (b.storeys == null && b.h == null) act(p, 'missingField', 'a building needs storeys or h', set(b, 'storeys', 2, b.id));
    for (const k of ['roof', 'style', 'src', 'id', 'crown']) if (b[k] != null && !_wcStr(b[k])) act(`${p}.${k}`, 'badType', k + ' is a string', strip(b, k, b.id));
    // a building may be declared a LANDMARK (an abbey, a church, a bridge): the fill never hides its main face (P8), as for a placed landmark
    if (b.landmark != null && typeof b.landmark !== 'boolean') act(p + '.landmark', 'badType', 'landmark is true or false', strip(b, 'landmark', b.id));
    if (b.facing != null && !_wcNum(b.facing)) act(p + '.facing', 'badType', 'facing is degrees', strip(b, 'facing', b.id));
  });

  // entities and landmarks (one bad entry never takes the rest down: G8)
  const ents = [], seenE = new Set();
  const placedLists = [['entities', listOf(spec, 'entities', 'entities'), false], ['landmarks', listOf(spec, 'landmarks', 'landmarks'), true]];
  for (const [key, list, lm] of placedLists) list.forEach((e, i) => {
    const p = `${key}[${i}]`;
    try {
      if (!_wcObjOf(e)) { act(p, 'badType', 'an entity is an object', drop(list, e)); return; }
      if (threw(e)) { act(p, 'buildError', 'the entry threw: ' + threw(e), drop(list, e, e.id)); return; }
      if (!lm && e.cluster != null) {
        keys(e, _WC_KEYS.cluster, p, e.cluster);
        const base = _wcSeasonBase(e.cluster);
        if (base) act(p + '.cluster', 'perSeasonData', `${e.cluster} is a seasonal or night copy of ${base}`, set(e, 'cluster', base, e.cluster));
        const id = base || e.cluster, info = worldObjectInfo(id), care = info ? _wcCareOf(id) : null;
        if (!info) { act(p + '.cluster', 'unknownSize', 'no world descriptor for ' + e.cluster, drop(list, e, e.cluster)); return; }
        if (care) { act(p + '.cluster', 'careRule', `${id}: ${care}`, drop(list, e, id)); return; }
        if (!sIds.has(e.on)) { act(p + '.on', 'unknownSurface', 'no surface ' + e.on, drop(list, e, id)); return; }
        const sk = sIds.get(e.on).kind, onWater = sk === 'water';
        if (onWater ? !info.attachOk.includes('water') : !info.attachOk.includes('ground')) { act(p + '.on', 'badAttach', `${id} (${info.cls}) cannot stand on ${sk}`, drop(list, e, id)); return; }
        if (!(Number.isInteger(e.n) && e.n > 0 && e.n <= 2000)) act(p + '.n', 'badValue', 'n is an integer 1..2000', set(e, 'n', Math.max(1, Math.min(2000, Math.round(_wcNum(e.n) ? e.n : 12))), id));
        if (e.seed != null && !Number.isInteger(e.seed)) act(p + '.seed', 'badType', 'seed is an integer', strip(e, 'seed', id));
        if (e.edge != null && typeof e.edge !== 'boolean') act(p + '.edge', 'badType', 'edge is a boolean', strip(e, 'edge', id));
        if (e.gap != null && !(_wcNum(e.gap) && e.gap >= 0)) act(p + '.gap', 'badValue', 'gap is metres >= 0', strip(e, 'gap', id));
        if (e.variant != null && !_wcVariantOk(info, e.variant)) act(p + '.variant', _wcObjOf(e.variant) ? 'perSeasonData' : 'unknownVariant', `${id} has no variant ${JSON.stringify(e.variant)}`, strip(e, 'variant', id));
        return;
      }
      keys(e, lm ? _WC_KEYS.landmark : _WC_KEYS.entity, p, e.id || e.obj);
      if (lm && !_wcStr(e.src) ) act(p + '.src', 'landmarkSrc', 'a landmark carries src', { do: 'flag', who: e.id || e.obj });
      if (e.id != null) {
        if (!_wcStr(e.id)) act(p + '.id', 'badType', 'id is a string', strip(e, 'id', e.obj));
        else if (seenE.has(e.id) || (sIds.has(e.id) && sIds.get(e.id) !== e)) act(p + '.id', 'dupId', 'duplicate id ' + e.id, strip(e, 'id', e.obj));
        else seenE.add(e.id);
      }
      if (typeof e.obj !== 'string') { act(p + '.obj', 'missingField', 'obj is required', drop(list, e, e.id)); return; }
      const base = _wcSeasonBase(e.obj);
      if (base) act(p + '.obj', 'perSeasonData', `${e.obj} is a seasonal or night copy of ${base}`, set(e, 'obj', base, e.id || e.obj));
      const obj = base || e.obj, info = worldObjectInfo(obj);
      if (!info) { act(p + '.obj', 'unknownSize', 'no world descriptor for ' + e.obj, drop(list, e, e.id || e.obj)); return; }
      const care = _wcCareOf(obj);
      if (care) { act(p + '.obj', 'careRule', `${obj}: ${care}`, drop(list, e, e.id || obj)); return; }
      const who = e.id || obj;
      if (!_wcPt(e.at)) { act(p + '.at', 'badValue', 'at is [x, z] in metres', drop(list, e, who)); return; }
      if (!v31 && !(e.at[1] > 0)) { act(p + '.at', 'badValue', 'z must be > 0 (in front of the camera)', drop(list, e, who)); return; }
      if (e.facing != null && !_wcNum(e.facing)) act(p + '.facing', 'badType', 'facing is degrees', strip(e, 'facing', who));
      if (e.variant != null && !_wcVariantOk(info, e.variant)) act(p + '.variant', _wcObjOf(e.variant) || Array.isArray(e.variant) ? 'perSeasonData' : 'unknownVariant', `${obj} has no variant ${JSON.stringify(e.variant)}`, strip(e, 'variant', who));
      for (const k of ['open', 'blocks', 'framed', 'row']) if (e[k] != null && typeof e[k] !== 'boolean') act(p + '.' + k, 'badType', k + ' is a boolean', strip(e, k, who));
      if (e.parent != null && !_wcStr(e.parent)) act(p + '.parent', 'badType', 'parent is an id', strip(e, 'parent', who));
      if (e.model != null) {   // a parametric model's parameters (79-world-4models.js): livery, size, age, seed, opts
        const bad = typeof worldModelSpecCheck === 'function' ? worldModelSpecCheck(e.model) : null;
        if (bad) act(p + '.model', 'badValue', bad, strip(e, 'model', who));
        else if (typeof worldModelHas === 'function' && !worldModelHas(obj)) act(p + '.model', 'badValue', `${obj} has no parametric model (worldModelIds())`, strip(e, 'model', who));
      }
      // the attachment
      let ak = e.attach == null ? null : _wcAttachKind(e.attach), ref = e.attach == null ? null : _wcAttachRef(e.attach);
      const stripAttach = (rule, msg) => { act(p + '.attach', rule, msg, strip(e, 'attach', who)); ak = null; ref = null; };
      if (e.attach != null && (typeof e.attach !== 'string' || !['ground', 'water', 'deck', 'rail', 'air', 'wall'].includes(ak) || ((ak === 'deck' || ak === 'rail' || ak === 'wall') !== !!ref))) stripAttach('badValue', 'attach is ground | water | deck:<host> | rail:<surface> | air | wall:<host>');
      if (ak) {
        const kindOk = ak === 'deck' ? (info.attachOk.includes('deck') || info.perch) : info.attachOk.includes(ak);
        if (!kindOk) stripAttach('badAttach', `${obj} (${info.cls}) cannot attach to ${ak}; legal: ${info.attachOk.join(', ')}`);
        else if (ak === 'rail') {
          const rs = sIds.get(ref);
          if (!rs) stripAttach('unknownSurface', 'no surface ' + ref);
          else if (rs.kind !== 'rail' && rs.kind !== 'tram') stripAttach('badAttach', `${ref} is ${rs.kind}, not a rail`);
        } else if (ak === 'deck' || ak === 'wall') {
          const host = eIds.get(ref), hi = host && worldObjectInfo(host.obj), hs = !host ? sIds.get(ref) : null;
          if (ak === 'deck' && hs && _wcRaised(hs)) { /* a raised surface is a deck */ }
          else if (!host || !hi) stripAttach('unknownSurface', 'no host entity ' + ref);
          else if (ak === 'wall' && !['building', 'structure', 'landmark', 'fence'].includes(hi.cls)) stripAttach('badAttach', `${ref} (${hi.cls}) has no wall`);
          else if (ak === 'deck' && !hi.deck && !(info.perch && hi.solidity === 'solid') && !(typeof worldModelFor === 'function' && (worldModelFor(host.obj) || {}).deck)) stripAttach('badAttach', `${ref} (${hi.cls}) has no deck`);
        }
      }
      const kind = ak || info.attachOk[0];
      if (e.y != null) {
        if (kind !== 'air' && kind !== 'wall') act(p + '.y', 'screenOrLookField', 'y is derived for grounded, floating and decked things', strip(e, 'y', who));
        else if (!_wcNum(e.y) || e.y < 0) act(p + '.y', 'badValue', 'y is metres above the ground', set(e, 'y', kind === 'wall' ? 2.5 : 3, who));
      } else if (kind === 'air' || kind === 'wall') act(p + '.y', 'missingField', kind + ' needs y (metres above the ground)', set(e, 'y', kind === 'wall' ? 2.5 : _wcR3(Math.max(2.5, info.size.h)), who));
      ents.push({ e, p, info, kind, ref, obj });
    } catch (err) { act(p, 'buildError', 'the entry threw: ' + String(err && err.message || err), drop(list, e)); }
  });
  // placement rules (strict only: the solver repairs them, 12.2)
  for (const it of ents) {
    try {
      const { e, p, info, kind, ref, obj } = it, x = e.at[0], z = e.at[1], s = _wcSpecSurfAt(surfs, x, z);
      if (kind === 'water') { if (!s || s.kind !== 'water') act(p + '.at', 'badAttach', `${obj} attaches to water but stands on ${s ? s.kind : 'bare ground'}`, place); }
      else if (kind === 'ground') {
        if (s && (s.kind === 'water' || s.kind === 'weir') && !(info.cls === 'heron' || info.cls === 'reed')) act(p + '.at', 'badAttach', `${obj} stands on the ground but (${x}, ${z}) is ${s.kind}`, place);
        else if (s && (s.kind === 'rail' || s.kind === 'tram') && !['rail-kit', 'post', 'lamp'].includes(info.cls)) act(p + '.at', 'badAttach', `${obj} stands on the ${s.kind} line`, place);
        else if (info.cls === 'vehicle' && s && s.kind === 'road' && Array.isArray(s.path) && _wcNum(e.facing)) {
          const lf = _wcLaneFacing(s.path, x, z);
          if (lf != null && _wcAngDiff(lf, e.facing) > 90) act(p + '.facing', 'orient', `${obj} faces against its lane (UK traffic keeps left)`, place);
        }
      } else if (kind === 'rail' && !ref) {
        if (!surfs.some(q => _wcObjOf(q) && (q.kind === 'rail' || q.kind === 'tram') && _wcSurfOk(q) && _wcSurfContains(q.path ? Object.assign({}, q, { width: Math.max(q.width || 0, 4) }) : q, x, z)))
          act(p + '.at', 'badAttach', `${obj} runs on rails only and (${x}, ${z}) is on no rail`, place);
      } else if (kind === 'rail') {
        const rs = sIds.get(ref);
        if (rs && _wcSurfOk(rs) && !_wcSurfContains(rs.path ? Object.assign({}, rs, { width: Math.max(rs.width || 0, 4) }) : rs, x, z)) act(p + '.at', 'badAttach', `${obj} is off the line ${ref}`, place);
      } else if (kind === 'deck' && ref) {
        const host = eIds.get(ref), hi = host && worldObjectInfo(host.obj), hs = !host ? sIds.get(ref) : null;
        if (hs) { if (_wcSurfOk(hs) && !_wcSurfContains(hs, x, z)) act(p + '.at', 'badAttach', `${obj} is off the deck ${ref}`, place); }
        else if (hi && _wcPt(host.at)) {
          if (hi.deck) { if (!_wcInPoly(_wcLocalToWorld(hi.deck.poly, host.at[0], host.at[1], host.facing), x, z)) act(p + '.at', 'badAttach', `${obj} is off the deck of ${ref}`, place); }
          else if (!_wcInPoly(_wcFoot(hi, host.at[0], host.at[1], host.facing), x, z) && Math.hypot(x - host.at[0], z - host.at[1]) > Math.max(0.5, hi.r * 1.5)) act(p + '.at', 'badAttach', `${obj} is not on its perch ${ref}`, place);
        }
      }
      if ((info.cls === 'bough' || info.cls === 'frond') && !ents.some(o => o !== it && o.info.cls === 'tree' && Math.hypot(o.e.at[0] - x, o.e.at[1] - z) <= 10)) act(p, 'orphan', `${obj} hangs from no tree (K4)`, place);
    } catch (err) { /* a geometry check never takes the validator down */ }
  }
  // solids: no overlaps, no blocked paths
  const solids = ents.filter(it => it.info.solidity === 'solid' && !(it.e.open === true && it.info.cls === 'gate') && it.kind !== 'deck' && it.kind !== 'wall' && it.kind !== 'air')
    .map(it => Object.assign(it, { foot: _wcFoot(it.info, it.e.at[0], it.e.at[1], it.e.facing) }));
  for (const it of solids) { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const q of it.foot) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); } it.bb = [x0, z0, x1, z1]; }
  for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) {
    const a = solids[i], b = solids[j];
    if (a.bb[2] < b.bb[0] || b.bb[2] < a.bb[0] || a.bb[3] < b.bb[1] || b.bb[3] < a.bb[1]) continue;
    const pen = _wcPenetration(a.foot, b.foot);
    if (pen > 0.05) act(b.p, 'overlap', `${b.obj} overlaps ${a.obj} (${a.p}) by ${_wcR3(pen)} m`, place);
  }
  for (const s of surfs) {
    if (!_wcSurfOk(s) || !Array.isArray(s.path) || WORLD_SURFACE_KINDS[s.kind] !== 'walk') continue;
    let px0 = Infinity, px1 = -Infinity, pz0 = Infinity, pz1 = -Infinity;
    for (const q of s.path) { px0 = Math.min(px0, q[0]); px1 = Math.max(px1, q[0]); pz0 = Math.min(pz0, q[1]); pz1 = Math.max(pz1, q[1]); }
    const hw = s.width / 2;
    for (const it of solids) {
      if (it.e.blocks === true) continue;
      if (it.bb[2] < px0 - hw || it.bb[0] > px1 + hw || it.bb[3] < pz0 - hw || it.bb[1] > pz1 + hw) continue;
      let blocked = false;
      for (let k = 1; k < s.path.length && !blocked; k++) {
        const a = s.path[k - 1], b = s.path[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!L) continue;
        if (Math.max(a[0], b[0]) + hw < it.bb[0] || Math.min(a[0], b[0]) - hw > it.bb[2] || Math.max(a[1], b[1]) + hw < it.bb[1] || Math.min(a[1], b[1]) - hw > it.bb[3]) continue;
        const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L, nx = -tz, nz = tx;
        for (let t = 0; t <= L && !blocked; t += 0.25) {
          const cx = a[0] + tx * t, cz = a[1] + tz * t;
          let all = true;
          for (let q = -2; q <= 2 && all; q++) { const o2 = q / 2 * (s.width / 2 - 0.01); if (!_wcInPoly(it.foot, cx + nx * o2, cz + nz * o2)) all = false; }
          if (all) blocked = true;
        }
      }
      if (blocked) act(it.p, 'blocksPath', `${it.obj} covers the whole width of ${s.id}`, place);
    }
  }

  // life
  const layerHas = (layer) => layer === 'air' || surfs.some(s => _wcObjOf(s) && (WORLD_LAYER_KINDS[layer] || []).includes(s.kind)) || (layer === 'walk' && ents.some(it => it.info.deck));
  const edgeOk = x => v31 ? ['left', 'right', 'far', 'near'].includes(x) : WORLD_EDGES.includes(x);
  const lifeL = listOf(spec, 'life', 'life');
  lifeL.forEach((L, i) => {
    const p = `life[${i}]`;
    try {
      if (!_wcObjOf(L) || threw(L)) { act(p, threw(L) ? 'buildError' : 'badType', threw(L) ? 'the population threw: ' + threw(L) : 'a population is an object', drop(lifeL, L)); return; }
      const who = L.id || L.who;
      keys(L, _WC_KEYS.life, p, who);
      const pop = _wcPopOf(L.who);
      if (!pop) { act(p + '.who', 'unknownWho', 'unknown population ' + L.who, drop(lifeL, L, who)); return; }
      if (!layerHas(pop.layer)) { act(p, 'unreachable', `${L.who} lives on the ${pop.layer} layer and the scene has no surface for it`, drop(lifeL, L, who)); return; }
      if (L.on != null) {
        const s = sIds.get(L.on);
        if (!s) act(p + '.on', 'unknownSurface', 'no surface ' + L.on, strip(L, 'on', who));
        else if (pop.layer !== 'air' && !(WORLD_LAYER_KINDS[pop.layer] || []).includes(s.kind)) act(p + '.on', 'unreachable', `${L.who} (${pop.layer}) cannot use ${s.id} (${s.kind})`, strip(L, 'on', who));
      }
      let has = 0;
      if (L.rate != null) { if (!(typeof L.rate === 'string' && /^\d+(\.\d+)?\/(\d+(\.\d+)?)?(s|min|h)$/.test(L.rate))) act(p + '.rate', 'badValue', 'rate is like 6/min or 1/3min', strip(L, 'rate', who)); else has++; }
      if (L.every != null) { if (!(typeof L.every === 'string' && /^\d+(\.\d+)?(s|min|h)$/.test(L.every))) act(p + '.every', 'badValue', 'every is like 6min', strip(L, 'every', who)); else has++; }
      if (L.count != null) { if (!(Number.isInteger(L.count) && L.count > 0 && L.count <= 200)) act(p + '.count', 'badValue', 'count is 1..200', strip(L, 'count', who)); else has++; }
      if (!has) {
        const k = ['walk', 'drive'].includes(pop.layer) ? 'rate' : pop.layer === 'rail' ? 'every' : 'count', val = k === 'rate' ? '2/min' : k === 'every' ? '6min' : 2;
        act(p, 'missingField', 'a population needs rate, count or every', set(L, k, val, who));
      }
      if (L.mix != null && !(_wcObjOf(L.mix) && Object.values(L.mix).every(x => _wcNum(x) && x >= 0))) act(p + '.mix', 'badValue', 'mix is { style: share }', strip(L, 'mix', who));
      if (L.edges != null) {
        if (!Array.isArray(L.edges) || !L.edges.length) act(p + '.edges', 'badValue', 'edges is a list of frame edges', strip(L, 'edges', who));
        else if (!L.edges.every(edgeOk)) {
          const fixed = L.edges.map(x => edgeOk(x) ? x : (v31 && WORLD_EDGE_ALIAS[x] && ['N', 'S', 'E', 'W'].includes(x) ? WORLD_EDGE_ALIAS[x] : null)).filter(Boolean);
          act(p + '.edges', 'badValue', `edges are ${v31 ? 'left, right, far, near' : 'N, S, E, W (or left, right, far, near)'}`, fixed.length ? set(L, 'edges', fixed, who) : strip(L, 'edges', who));
        }
      }
      if (L.framed != null && typeof L.framed !== 'boolean') act(p + '.framed', 'badType', 'framed is a boolean', strip(L, 'framed', who));
      if (L.goals != null) {
        if (!Array.isArray(L.goals)) { act(p + '.goals', 'badType', 'goals is a list', strip(L, 'goals', who)); return; }
        const goals = L.goals; let kept = goals.length;
        goals.forEach((g, k) => {
          const gp = `${p}.goals[${k}]`, dropG = (rule, msg) => { act(gp, rule, msg, drop(goals, g, who)); kept--; };
          if (!_wcObjOf(g)) { dropG('badType', 'a goal is an object'); return; }
          keys(g, _WC_KEYS.goal, gp, who);
          const verbs = WORLD_GOAL_VERBS.filter(x => g[x] != null);
          if (verbs.length !== 1) { dropG('badValue', 'a goal has exactly one verb (' + WORLD_GOAL_VERBS.join(', ') + ')'); return; }
          const vb = verbs[0], tgt = g[vb], idOk = t => anyId(t) || lifeIds.has(t), isEdge = t => edgeOk(t) || (!v31 && WORLD_EDGES.includes(t));
          if (v31 && (vb === 'go' || vb === 'leave') && ['N', 'S', 'E', 'W'].includes(tgt) && !anyId(tgt)) act(`${gp}.${vb}`, 'badValue', `v 3.1 edges are left, right, far, near: ${tgt} read as ${WORLD_EDGE_ALIAS[tgt]}`, set(g, vb, WORLD_EDGE_ALIAS[tgt], who));
          else if (vb === 'go' && !(_wcPt(tgt) || idOk(tgt) || isEdge(tgt))) dropG('unreachable', 'no target ' + JSON.stringify(tgt));
          else if (vb === 'wander' && !sIds.has(tgt) && !(typeof tgt === 'string' && tgt.startsWith('deck:') && eIds.has(tgt.slice(5)))) dropG('unreachable', 'no surface ' + tgt);
          else if (vb === 'leave' && !(isEdge(tgt) || tgt === 'cover' || tgt === 'any')) dropG('badValue', 'leave a frame edge or cover');
          else if ((vb === 'follow' || vb === 'meet') && typeof tgt !== 'string') dropG('badType', 'follow / meet name an id');
          else if (vb === 'sit' && !eIds.has(tgt)) dropG('unreachable', 'sit names a bench (an entity id): ' + JSON.stringify(tgt));
          else if ((vb === 'wait' || vb === 'enter') && !idOk(tgt)) dropG('unreachable', `${vb} names an entity, building or surface: ${JSON.stringify(tgt)}`);
          else if (vb === 'board' && !(idOk(tgt) || whoIds.has(tgt))) dropG('unreachable', 'board names a vehicle, a boat or a population: ' + JSON.stringify(tgt));
          else if ((vb === 'fish' || vb === 'feed' || vb === 'view') && !(_wcPt(tgt) || idOk(tgt) || (vb === 'view' && _wcNum(tgt)))) dropG('unreachable', `${vb} names a place: ${JSON.stringify(tgt)}`);
          else if (vb === 'do' && typeof tgt !== 'string') dropG('badType', 'do names a state');
          else if (g.for != null && !(_wcNum(g.for) || (Array.isArray(g.for) && g.for.length === 2 && g.for.every(_wcNum) && g.for[0] <= g.for[1]))) act(gp + '.for', 'badValue', 'for is seconds or [min, max]', strip(g, 'for', who));
        });
        if (repair && kept <= 0) C.acts.push({ do: 'strip', o: L, k: 'goals', who, e: { path: p + '.goals', rule: 'unreachable', msg: 'no goal left: the population keeps its default behaviour', severity: 'repair' } });
      }
    } catch (err) { act(p, 'buildError', 'the population threw: ' + String(err && err.message || err), drop(lifeL, L)); }
  });

  // backdrop (2.7, U1: the default style comes from place.style)
  if (spec.backdrop == null) {
    if (!_wcPlaceBackdrop(P.style)) act('backdrop', 'emptyBackground', v31 ? 'no backdrop and no place.style (no empty backgrounds)' : 'backdrop is required (no empty backgrounds)', set(spec, 'backdrop', { style: _wcStyleGuess(spec) }));
    else if (repair) spec.backdrop = { style: _wcPlaceBackdrop(P.style) };
  } else if (!_wcObjOf(spec.backdrop)) act('backdrop', 'badType', 'backdrop is { style, skyline? }', set(spec, 'backdrop', { style: _wcStyleGuess(spec) }));
  else {
    const B = spec.backdrop;
    keys(B, _WC_KEYS.backdrop, 'backdrop');
    if (!_wcBackdropKnown(B.style)) act('backdrop.style', 'unknownBackdrop', 'unknown backdrop style ' + B.style, set(B, 'style', _wcStyleGuess(spec)));
    if (B.skyline != null) {
      if (!Array.isArray(B.skyline)) act('backdrop.skyline', 'badType', 'skyline is a list', strip(B, 'skyline'));
      else B.skyline.forEach((k, i) => {
        const p = `backdrop.skyline[${i}]`;
        if (!_wcObjOf(k)) { act(p, 'badType', 'a skyline entry is an object', drop(B.skyline, k)); return; }
        keys(k, _WC_KEYS.skyline, p, k.obj);
        if (!worldObjectInfo(k.obj)) { act(p + '.obj', 'unknownSize', 'no world descriptor for ' + k.obj, drop(B.skyline, k, k.obj)); return; }
        if (!_wcNum(k.bearing)) { act(p + '.bearing', 'badValue', 'bearing is degrees', drop(B.skyline, k, k.obj)); return; }
        if (!(_wcNum(k.dist) && k.dist > 0)) { act(p + '.dist', 'badValue', 'dist is metres > 0', drop(B.skyline, k, k.obj)); return; }
        if (!_wcStr(k.src) || !k.src.trim()) act(p + '.src', 'landmarkSrc', 'a skyline entry carries src', { do: 'flag', who: k.obj });
      });
    }
  }
  if (!repair) return { spec, errors: C.errs, warnings: C.warns, log: [] };

  // apply: sets and strips first, then drops (by identity, so indices never shift under a later action)
  const dropped = new Set(), logOf = (a, action, from, to) => {
    const who = a.who != null ? a.who : null, info = typeof who === 'string' ? worldObjectInfo(who) : null;
    C.log.push({ id: info ? null : who, obj: info ? who : null, action, rule: a.e.rule, reason: a.e.msg, from: from === undefined ? null : from, to: to === undefined ? null : to, by: 'sense', path: a.e.path, severity: a.e.severity });
  };
  for (const a of C.acts) {
    if (a.do === 'strip') { const from = a.o[a.k]; delete a.o[a.k]; logOf(a, 'strip', _wcLogVal(from), null); }
    else if (a.do === 'set') { const from = a.o[a.k]; a.o[a.k] = a.v; logOf(a, a.action || 'default', _wcLogVal(from), _wcLogVal(a.v)); }
    else if (a.do === 'flag') logOf(a, 'flag', null, null);
  }
  for (const a of C.acts) if (a.do === 'drop' && !dropped.has(a.item)) { dropped.add(a.item); logOf(a, 'drop', null, null); }
  const prune = (o, k) => { if (Array.isArray(o[k])) o[k] = o[k].filter(x => !dropped.has(x)); };
  for (const k of ['cameras', 'surfaces', 'lines', 'buildings', 'entities', 'landmarks', 'life']) prune(spec, k);
  if (_wcObjOf(spec.ground)) prune(spec.ground, 'features');
  if (_wcObjOf(spec.backdrop)) prune(spec.backdrop, 'skyline');
  if (Array.isArray(spec.life)) for (const L of spec.life) if (_wcObjOf(L)) prune(L, 'goals');
  if (Array.isArray(spec.cameras) && !spec.cameras.length) spec.cameras = [{ id: 'main', frame: [] }];
  return { spec, errors: C.errs, warnings: C.warns, log: C.log };
}
const _wcLogVal = v => (v === undefined ? null : (v !== null && typeof v === 'object') ? (Array.isArray(v) ? `[${v.length}]` : '{...}') : v);

function worldValidate(spec, o = {}) {
  let r;
  try { r = _wcCheck(spec, false); } catch (e) { r = { errors: [{ path: 'spec', rule: 'buildError', msg: 'the validator threw: ' + String(e && e.message || e), fix: _WC_FIX.buildError, severity: 'fatal' }], warnings: [] }; }
  const warnings = r.warnings.slice();
  if (Array.isArray(o.views) && o.views.length) {
    try { for (const w of worldTemplated([spec, ...o.views])) if (w.path.startsWith('views[0]')) warnings.push(w); } catch (e) { /* the warning is advice only */ }
  }
  return { ok: r.errors.length === 0, errors: r.errors, warnings };
}
/** The repaired spec (still in its own version and frame) and the log of every strip, default and drop; placement is left to worldPlace. */
function worldRepair(spec) {
  let r;
  try {
    r = _wcCheck(spec, true);
    // cascades (a dropped bench leaves a goal with no target): repair again until nothing changes (at most 3 passes);
    // the strict errors and warnings are the first pass's (the input's)
    for (let pass = 0; pass < 2; pass++) {
      const r2 = _wcCheck(r.spec, true), more = r2.log.filter(l => l.action !== 'flag');
      if (!more.length) break;
      r = { spec: r2.spec, errors: r.errors, warnings: r.warnings, log: r.log.concat(more) };
    }
  } catch (e) {
    const m = String(e && e.message || e);
    r = { spec: { v: 3, camera: {}, surfaces: [], entities: [], backdrop: { style: 'woodland' } }, errors: [{ path: 'spec', rule: 'buildError', msg: 'the repair threw: ' + m, fix: _WC_FIX.buildError, severity: 'fatal' }], warnings: [],
      log: [{ id: null, obj: null, action: 'default', rule: 'buildError', reason: 'the repair threw (' + m + '): an empty scene', from: null, to: 'empty', by: 'sense', path: 'spec', severity: 'fatal' }] };
  }
  return { spec: r.spec, log: r.log, errors: r.errors, warnings: r.warnings };
}

/* ---------- versions (G11, 5.3) ---------- */
/** v3.0 (camera frame) -> v3.1 (place frame): one camera at the origin with the old heading; points rotated, facings and edges re-expressed. */
function worldMigrate(spec) {
  const log = [];
  if (!_wcObjOf(spec)) return { spec, log };
  const s = _wcClone(spec, (p, m) => log.push({ id: null, obj: null, action: 'drop', rule: 'buildError', reason: `${p} threw: ${m}`, from: null, to: null, by: 'sense', path: p }));
  if (s.v === 3.1 || Array.isArray(s.cameras)) {
    if (s.v !== 3.1) { log.push({ id: null, obj: null, action: 'migrate', rule: 'badVersion', reason: 'cameras belong to v 3.1', from: s.v, to: 3.1, by: 'sense' }); s.v = 3.1; }
    if (!Array.isArray(s.cameras) && _wcObjOf(s.camera)) { s.cameras = [s.camera]; delete s.camera; }
    return { spec: s, log };
  }
  const c = _wcObjOf(s.camera) ? s.camera : {}, H = _wcNum(c.heading) ? c.heading : 180, cs = Math.cos(H * _WC_DEG), sn = Math.sin(H * _WC_DEG);
  const pt = p => _wcPt(p) ? [p[0] * cs + p[1] * sn, -p[0] * sn + p[1] * cs] : p, face = f => _wcNum(f) ? _wcFace(f + H) : f;
  const cam = { id: 'main', at: [0, 0], heading: H };
  if (_wcNum(c.eye)) cam.height = c.eye;
  for (const k of ['fov', 'horizon', 'x0', 'water', 'lat', 'lon', 'alt', 'preset']) if (c[k] != null) cam[k] = c[k];
  if (_wcObjOf(s.ground) && s.ground.relief != null) { cam.relief = s.ground.relief; delete s.ground.relief; if (!Object.keys(s.ground).length) delete s.ground; }
  _wcMapSpec(s, pt, face, x => (typeof x === 'string' && ['N', 'S', 'E', 'W'].includes(x)) ? WORLD_EDGE_ALIAS[x] : x);
  delete s.camera;
  s.cameras = [cam];
  log.push({ id: null, obj: null, action: 'migrate', rule: 'version', reason: 'v3.0 camera frame -> v3.1 place frame (one camera at the origin, heading ' + _wcR3(H) + ')', from: s.v, to: 3.1, by: 'sense' });
  s.v = 3.1;
  return { spec: s, log };
}
/** Map every point, facing and edge of a spec in place (shared by the migration and the camera transform). */
function _wcMapSpec(s, pt, face, edge) {
  const pts = a => Array.isArray(a) ? a.map(pt) : a;
  if (_wcObjOf(s.ground) && Array.isArray(s.ground.features)) for (const f of s.ground.features) if (_wcObjOf(f)) f.path = pts(f.path);
  for (const q of (Array.isArray(s.surfaces) ? s.surfaces : [])) { if (!_wcObjOf(q)) continue; if (q.poly) q.poly = pts(q.poly); if (q.path) q.path = pts(q.path); if (q.flow != null) q.flow = face(q.flow); }
  for (const l of (Array.isArray(s.lines) ? s.lines : [])) if (_wcObjOf(l) && l.path) l.path = pts(l.path);
  for (const b of (Array.isArray(s.buildings) ? s.buildings : [])) if (_wcObjOf(b)) { if (b.foot) b.foot = pts(b.foot); if (b.facing != null) b.facing = face(b.facing); }
  for (const key of ['entities', 'landmarks']) for (const e of (Array.isArray(s[key]) ? s[key] : [])) if (_wcObjOf(e) && e.cluster == null) { if (e.at) e.at = pt(e.at); if (e.facing != null) e.facing = face(e.facing); }
  for (const L of (Array.isArray(s.life) ? s.life : [])) {
    if (!_wcObjOf(L)) continue;
    if (Array.isArray(L.edges)) L.edges = L.edges.map(edge);
    if (Array.isArray(L.goals)) for (const g of L.goals) if (_wcObjOf(g)) for (const k of ['go', 'leave', 'fish', 'feed', 'view']) if (g[k] != null) g[k] = _wcPt(g[k]) ? pt(g[k]) : (k === 'view' && _wcNum(g[k])) ? face(g[k]) : edge(g[k]);
  }
}

/* ---------- cameras: one world, many views (Q7, 14) ---------- */
function _wcCamList(spec) {
  if (Array.isArray(spec.cameras) && spec.cameras.length) return spec.cameras.filter(_wcObjOf);
  if (_wcObjOf(spec.camera)) return [spec.camera];
  return [{ id: 'main', frame: [] }];
}
function _wcCamIndex(spec, cam) {
  const list = _wcCamList(spec);
  if (Number.isInteger(cam) && cam >= 0 && cam < list.length) return cam;
  if (typeof cam === 'string') { const i = list.findIndex(c => c.id === cam); if (i >= 0) return i; }
  return 0;
}
const _wcCamId = (c, i) => (c && _wcStr(c.id) ? c.id : 'cam' + (i + 1));
/** Every named point of a place spec: id -> [x, z] (entities, landmarks, buildings and surfaces by their centre). */
function _wcIdPoints(spec) {
  const m = new Map();
  for (const key of ['entities', 'landmarks']) for (const e of (Array.isArray(spec[key]) ? spec[key] : [])) if (_wcObjOf(e) && _wcStr(e.id) && _wcPt(e.at)) m.set(e.id, e.at);
  for (const b of (Array.isArray(spec.buildings) ? spec.buildings : [])) if (_wcObjOf(b) && _wcStr(b.id) && Array.isArray(b.foot)) m.set(b.id, _wcCentroid(b.foot.filter(_wcPt)));
  for (const s of (Array.isArray(spec.surfaces) ? spec.surfaces : [])) if (_wcObjOf(s) && _wcStr(s.id) && !m.has(s.id)) { const p = (s.poly || s.path || []).filter(_wcPt); if (p.length) m.set(s.id, _wcCentroid(p)); }
  return m;
}
/** The fallback camera of a v3.1 spec (appearance's worldCameraResolve wins when loaded): { id, index, at, heading, block, relief }. */
function _wcCamResolve(spec, i) {
  const list = _wcCamList(spec), c = list[i] || {}, ids = _wcIdPoints(spec), P = _wcObjOf(spec.place) ? spec.place : {};
  let at = _wcPt(c.at) ? c.at.slice() : null;
  const org = _wcPt(P.origin) ? P.origin : (_wcNum(P.lat) && _wcNum(P.lon) ? [P.lat, P.lon] : null);
  if (at && org && Math.abs(org[0]) > 1 && Math.abs(at[0] - org[0]) < 0.02 && Math.abs(at[1] - org[1]) < 0.02 && !(Number.isInteger(at[0]) && Number.isInteger(at[1])))
    at = [(at[1] - org[1]) * 111320 * Math.cos(org[0] * _WC_DEG), (at[0] - org[0]) * 111320];   // [lat, lon] -> metres east, north
  let heading = _wcNum(c.heading) ? c.heading : _wcNum(c.lookAt) ? c.lookAt : null;
  const fov = _wcNum(c.fov) ? c.fov : 62;
  if (Array.isArray(c.frame) || (!at && heading == null && !(typeof c.lookAt === 'string'))) {
    const pts = (Array.isArray(c.frame) && c.frame.length ? c.frame.map(id => ids.get(id)) : [...ids.values()]).filter(_wcPt);
    if (pts.length) {
      const ctr = _wcCentroid(pts), spread = Math.max(6, ...pts.map(p => Math.hypot(p[0] - ctr[0], p[1] - ctr[1])));
      if (heading == null) heading = at ? _wcBearing(at, ctr) : (Math.hypot(ctr[0], ctr[1]) > 1 ? _wcBearing([0, 0], ctr) : 0);
      if (!at) { const d = spread / Math.tan(fov / 2 * _WC_DEG) * 1.15 + 8, h = heading * _WC_DEG; at = [ctr[0] - Math.sin(h) * d, ctr[1] - Math.cos(h) * d]; }
    }
  }
  if (!at) at = [0, 0];
  if (heading == null && typeof c.lookAt === 'string' && ids.has(c.lookAt)) heading = _wcBearing(at, ids.get(c.lookAt));
  if (heading == null) heading = 0;
  const block = {};
  const eye = _wcNum(c.height) ? c.height : _wcNum(c.eye) ? c.eye : null;
  if (eye != null) block.eye = eye;
  for (const k of ['fov', 'horizon', 'x0', 'water', 'lat', 'lon', 'alt', 'preset']) if (c[k] != null) block[k] = c[k];
  block.heading = _wcFace(heading);
  return { id: _wcCamId(c, i), index: i, at, heading: block.heading, block, relief: _wcRelief(c.relief) ? c.relief : null };
}
/** toCam and facing for camera i: appearance's worldCameraXform when loaded and sane, else the fallback (a rotation about `at`). */
function _wcXform(spec, i) {
  const R = _wcCamResolve(spec, i);
  let toCam = null, face = null, block = R.block;
  if (typeof worldCameraXform === 'function') {
    try {
      const X = worldCameraXform(spec, i);
      if (X && typeof X.toCam === 'function' && typeof X.facing === 'function') {
        const t = X.toCam(R.at[0] + 1, R.at[1] + 1), q = Array.isArray(t) ? t : t && [t.x, t.z], f = X.facing(0);
        if (_wcPt(q) && _wcNum(f)) { toCam = (x, z) => { const r = X.toCam(x, z); return Array.isArray(r) ? [r[0], r[1]] : [r.x, r.z]; }; face = X.facing; }
      }
    } catch (e) { toCam = null; }
  }
  if (typeof worldCameraResolve === 'function') {
    try {
      const b0 = worldCameraResolve(spec, i, {}), b = _wcObjOf(b0) && _wcObjOf(b0.camera) ? b0.camera : b0;
      if (_wcObjOf(b) && (_wcNum(b.eye) || _wcNum(b.heading))) {   // only the v2 camera keys: the camera-frame spec stays a valid v3.0 spec
        const out = {};
        for (const k of _WC_KEYS.camera) if (b[k] != null && (k === 'preset' ? _wcStr(b[k]) : _wcNum(b[k]))) out[k] = b[k];
        if (_wcNum(out.heading)) block = out;
      }
    } catch (e) { /* the fallback block */ }
  }
  if (!toCam) {
    const H = R.heading * _WC_DEG, cs = Math.cos(H), sn = Math.sin(H), ax = R.at[0], az = R.at[1];
    toCam = (x, z) => [(x - ax) * cs - (z - az) * sn, (x - ax) * sn + (z - az) * cs];
    face = f => f - R.heading;
  }
  return { id: R.id, index: i, block, relief: R.relief, toCam: (x, z) => { const r = toCam(x, z); return [_wcR9(r[0]), _wcR9(r[1])]; }, facing: f => _wcFace(face(f)) };
}
const _WC_NEAR = 0.3;
/** Clip a polygon to z >= near (Sutherland-Hodgman against one plane). */
function _wcClipPoly(poly, near) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ina = a[1] >= near, inb = b[1] >= near;
    if (ina) out.push(a);
    if (ina !== inb) { const t = (near - a[1]) / (b[1] - a[1]); out.push([_wcR9(a[0] + (b[0] - a[0]) * t), near]); }
  }
  return out.length >= 3 && Math.abs(_wcPolyArea(out)) > 1e-6 ? out : null;
}
/** Clip a polyline to z >= near: the runs that remain (each >= 2 points). */
function _wcClipPath(path, near) {
  const runs = []; let cur = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[i], ina = a[1] >= near;
    if (ina) cur.push(a);
    if (i + 1 < path.length) {
      const b = path[i + 1], inb = b[1] >= near;
      if (ina !== inb) { const t = (near - a[1]) / (b[1] - a[1]), c = [_wcR9(a[0] + (b[0] - a[0]) * t), near]; cur.push(c); if (!inb) { if (cur.length >= 2) runs.push(cur); cur = []; } }
    }
  }
  if (cur.length >= 2) runs.push(cur);
  return runs;
}
/** A place-frame (v3.1) spec seen from one camera: the camera-frame (v: 3) spec every module after load reads. */
function _wcToCamera(spec31, cam, log) {
  const i = _wcCamIndex(spec31, cam), X = _wcXform(spec31, i), s = _wcCopy(spec31);
  const cams = _wcCamList(s);
  delete s.cameras; delete s.camera;
  const ground = _wcObjOf(s.ground) ? s.ground : {};
  if (X.relief) ground.relief = _wcCopy(X.relief);
  _wcMapSpec(s, p => X.toCam(p[0], p[1]), X.facing, x => (typeof x === 'string' && WORLD_EDGE_ALIAS[x] && !['N', 'S', 'E', 'W'].includes(x)) ? WORLD_EDGE_ALIAS[x] : x);
  if (Object.keys(ground).length) s.ground = ground;
  let culled = 0;
  // what lies behind the camera is not in this view of the world: entities are culled, lines and buildings clipped. Surfaces
  // stay whole (the v2 ground clips them to the view frustum) so a surface is the same shape for every camera: its clusters
  // scatter in its own frame and come out the same for every view (Q7)
  if (Array.isArray(s.lines)) s.lines = s.lines.flatMap(l => _wcClipPath(l.path || [], _WC_NEAR).map((r, k) => Object.assign(k ? _wcCopy(l) : l, { path: r }, k && l.id ? { id: l.id + '~' + k } : {})));
  if (Array.isArray(s.buildings)) s.buildings = s.buildings.map(b => { if (b && typeof b.along === 'string') return b; const c = _wcClipPoly(b.foot || [], _WC_NEAR); if (!c) { culled++; return null; } b.foot = c; return b; }).filter(Boolean);
  if (_wcObjOf(s.ground) && Array.isArray(s.ground.features)) s.ground.features = s.ground.features.flatMap(f => _wcClipPath(f.path || [], _WC_NEAR).map(r => Object.assign(_wcCopy(f), { path: r })));
  for (const key of ['entities', 'landmarks']) if (Array.isArray(s[key])) s[key] = s[key].filter(e => { if (e.cluster != null || !_wcPt(e.at) || e.at[1] >= _WC_NEAR) return true; culled++; return false; });
  s.camera = X.block;
  s.v = 3;
  if (culled && Array.isArray(log)) log.push({ id: null, obj: null, action: 'cull', rule: 'camera', reason: `${culled} entries lie behind camera ${X.id}`, from: null, to: null, by: 'sense' });
  return { spec: s, camera: { id: X.id, index: i, count: cams.length }, culled };
}
/** The repaired camera-frame (v: 3) spec of one camera of any spec (Q7). */
function worldSpecFor(spec, camera) {
  const r = worldRepair(spec), log = r.log.slice();
  if (r.spec.v === 3.1) { const t = _wcToCamera(r.spec, camera, log); return { spec: t.spec, log, camera: t.camera, culled: t.culled, errors: r.errors, warnings: r.warnings }; }
  return { spec: r.spec, log, camera: { id: 'main', index: 0, count: 1 }, culled: 0, errors: r.errors, warnings: r.warnings };
}

/* ---------- templated layouts across a place's views (C7: a warning) ---------- */
function _wcSignature(spec, cam) {
  const w = worldBuild(spec, { validate: false, place: false, fill: false, camera: cam }), out = new Set();
  for (const e of w.entities) {
    const P = sceneProject(w.cam, e.x, e.z, e.y);
    if (!(P.X >= 0 && P.X < 1600 && P.Y >= 0 && P.Y < 900)) continue;
    out.add(`${Math.floor(P.X / (1600 / 6))},${Math.floor(P.Y / 150)}:${e.cls}`);
  }
  return out;
}
function worldTemplated(specs) {
  const errs = [], views = [];
  (Array.isArray(specs) ? specs : []).forEach((s, si) => {
    if (!_wcObjOf(s)) return;
    if (s.v === 3.1 || Array.isArray(s.cameras)) {
      _wcCamList(s).forEach((c, ci) => { const R = _wcCamResolve(s, ci), P = s.place || {}; views.push({ si, spec: s, cam: ci, at: R.at, h: R.heading, ll: [P.lat, P.lon], local: true }); });
    } else {
      const p = s.place || {}, c = s.camera || {};
      views.push({ si, spec: s, cam: 0, h: _wcNum(c.heading) ? c.heading : 180, ll: [_wcNum(p.lat) ? p.lat : c.lat, _wcNum(p.lon) ? p.lon : c.lon] });
    }
  });
  const sigs = views.map(v => { try { return _wcSignature(v.spec, v.cam); } catch (e) { return new Set(); } });
  const name = v => views.filter(x => x.si === v.si).length > 1 ? `views[${v.si}].cameras[${v.cam}]` : `views[${v.si}]`;
  for (let i = 0; i < views.length; i++) for (let j = i + 1; j < views.length; j++) {
    const a = views[i], b = views[j], hd = _wcAngDiff(a.h, b.h);
    let dm = Infinity;
    if (a.local && b.local && a.spec === b.spec) dm = Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]);
    else if (_wcNum(a.ll[0]) && _wcNum(b.ll[0])) dm = Math.hypot((a.ll[0] - b.ll[0]) * 111320, (a.ll[1] - b.ll[1]) * 111320 * Math.cos(a.ll[0] * _WC_DEG)) + (a.local ? Math.hypot(...a.at) : 0) + (b.local ? Math.hypot(...b.at) : 0);
    const push = msg => errs.push({ path: name(a), rule: 'templated', msg, fix: _WC_FIX.templated, severity: 'warn' });
    if (hd < 25 && dm < 30) push(`${name(a)} and ${name(b)}: cameras differ by ${_wcR3(hd)} degrees and ${_wcR3(dm)} m`);
    const A = sigs[i], B = sigs[j]; let inter = 0; for (const t of A) if (B.has(t)) inter++;
    const uni = A.size + B.size - inter, dist = uni ? 1 - inter / uni : 0;
    if (dist < 0.35) push(`${name(a)} and ${name(b)}: layout signatures differ by ${_wcR3(dist)} (< 0.35)`);
  }
  return errs;
}

/* ---------- terrain (W2): ground.features compiled into the relief grid ---------- */
const _wcReliefMemo = new WeakMap();
/** A `slope` (a hill street: Elm Hill, Gold Hill, Steep Hill): the ground rises by `h` metres along its path (0 at the first point, `h` at the last, level beyond both ends), across `width` metres, then falls away to 0 over `fade` (default 12 m). The ends run on in a straight line (a hill street does not end in a round hump). */
function _wcSlopeAt(f, x, z) {
  const P = f.path, EXT = 600, half = f.width / 2, fade = _wcNum(f.fade) && f.fade > 0 ? f.fade : 12;
  const dir = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const d0 = dir(P[0], P[1]), d1 = dir(P[P.length - 2], P[P.length - 1]);
  const path = [[P[0][0] - d0[0] * EXT, P[0][1] - d0[1] * EXT]].concat(P, [[P[P.length - 1][0] + d1[0] * EXT, P[P.length - 1][1] + d1[1] * EXT]]);
  const n = _wcLineNear(path, x, z);
  if (!n || n.d >= half + fade) return 0;
  const L = _wcPathLen(P) || 1, along = Math.max(0, Math.min(1, (n.s - EXT) / L)), t = n.d <= half ? 1 : 1 - (n.d - half) / fade;
  return Math.abs(f.h) * along * t * t * (3 - 2 * t);
}
function _wcFeatProfile(f, t) {
  const half = f.width / 2; if (t >= half) return 0;
  if (f.kind === 'bank') return 0.5 * (1 + Math.cos(Math.PI * t / half));
  return t <= half * 0.5 ? 1 : (half - t) / (half * 0.5);   // embankment and cutting: a flat top (bed) and straight sides
}
/** The camera-frame relief of a spec: its relief plus its features (banks, embankments, cuttings, cliffs), sampled on the v2 grid (x, log d). A cliff is analytic (4cliff): the grid holds its coarse shape, finer than a bank's. */
function _wcReliefCompile(cs) {
  const g = _wcObjOf(cs.ground) ? cs.ground : null; if (!g) return null;
  const base = _wcRelief(g.relief) ? g.relief : null;
  const feats = (Array.isArray(g.features) ? g.features : []).filter(f => _wcObjOf(f) && WORLD_FEATURE_KINDS.includes(f.kind) && Array.isArray(f.path) && f.path.length >= 2 && f.path.every(_wcPt) && (f.kind === 'cliff' ? _wcNum(f.h) && f.h > 0 && typeof worldCliffGeom === 'function' && !!worldCliffGeom(f) : _wcNum(f.width) && f.width > 0 && _wcNum(f.h)));
  if (!feats.length) return base;
  if (_wcReliefMemo.has(g)) return _wcReliefMemo.get(g);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, segs = 0;
  let cliffs = 0;
  for (const f of feats) {
    const G = f.kind === 'cliff' ? worldCliffGeom(f) : null, pad = G ? G.w + G.lipW + 12 : f.width / 2 + 4 + (f.kind === 'slope' ? (_wcNum(f.fade) && f.fade > 0 ? f.fade : 12) : 0);
    segs += G ? G.pts.length - 1 : f.path.length - 1; if (G) cliffs++;
    for (const p of G ? G.pts : f.path) { x0 = Math.min(x0, p[0] - pad); x1 = Math.max(x1, p[0] + pad); z0 = Math.min(z0, p[1] - pad); z1 = Math.max(z1, p[1] + pad + (G ? 40 : 0) + (f.kind === 'slope' ? 4000 : 0)); }   // a slope's plateau runs on: nothing beyond it shows through (the backdrop hides behind the hill's own ground)
  }
  if (base) { x0 = Math.min(x0, base.x[0]); x1 = Math.max(x1, base.x[1]); z0 = Math.min(z0, base.d[0]); z1 = Math.max(z1, base.d[1]); }
  x0 = Math.max(x0, -3000); x1 = Math.min(x1, 3000); z0 = Math.max(0.3, z0); z1 = Math.max(z0 * 1.5, Math.min(z1, 6000));
  // a cliff needs a finer grid (a face is steep over a few metres): a row every 1 % of the depth, a column every metre, capped
  const NXC = cliffs ? 513 : 257, NDC = cliffs ? 401 : 257, ratio = cliffs ? 1.01 : 1.04, budget = cliffs ? 1.6e7 : 4e6;
  let nx = Math.max(2, Math.min(NXC, Math.ceil((x1 - x0) / (cliffs ? 1 : 0.75)) + 1)), nd = Math.max(2, Math.min(NDC, Math.ceil(Math.log(z1 / z0) / Math.log(ratio)) + 1));
  while (nx * nd * segs > budget && (nx > 33 || nd > 33)) { nx = Math.max(33, Math.ceil(nx * 0.8)); nd = Math.max(33, Math.ceil(nd * 0.8)); }
  const baseCam = base ? { relief: { x: base.x, d: base.d, nx: base.nx, nd: base.nd, h: base.h } } : null, h = new Array(nx * nd);
  // a world with a cliff AND other relief keeps the relief without the cliff (relief.base): the cliff is drawn analytically (4terrain), the rest from the grid
  const mixed = cliffs > 0 && (!!base || feats.some(f => f.kind !== 'cliff')), hb = mixed ? new Array(nx * nd) : null;
  for (let j = 0; j < nd; j++) {
    const d = z0 * Math.pow(z1 / z0, j / (nd - 1));
    for (let i = 0; i < nx; i++) {
      const x = x0 + (x1 - x0) * i / (nx - 1);
      let up = 0, down = 0, cl = 0;
      for (const f of feats) {
        if (f.kind === 'cliff') { cl = Math.max(cl, worldCliffHeight(f, x, d)); continue; }
        if (f.kind === 'slope') { up = Math.max(up, _wcSlopeAt(f, x, d)); continue; }
        const pr = _wcFeatProfile(f, _wcLineDist(f.path, x, d)); if (!pr) continue; if (f.kind === 'cutting') down = Math.min(down, -Math.abs(f.h) * pr); else up = Math.max(up, Math.abs(f.h) * pr);
      }
      let upc = up;
      if (cl > 0) upc = Math.max(up, cl);
      const b0 = baseCam ? sceneGroundHeight(baseCam, x, d) : 0;
      h[j * nx + i] = _wcR3(b0 + upc + down);
      if (hb) hb[j * nx + i] = _wcR3(b0 + up + down);
    }
  }
  const r = { x: [_wcR3(x0), _wcR3(x1)], d: [_wcR3(z0), _wcR3(z1)], nx, nd, h, src: 'features' };
  if (hb) r.base = { x: r.x, d: r.d, nx, nd, h: hb };
  _wcReliefMemo.set(g, r);
  return r;
}

/* ---------- the world (1.2) ---------- */
/** The water region at a ground point (the topmost water surface there, never a raised one). */
function _wcWaterAt(world, x, z) {
  const surfs = world.surfaces || [];
  for (let i = surfs.length - 1; i >= 0; i--) { const s = surfs[i]; if (s.kind === 'water' && _wcSurfContains(s, x, z)) return s; }
  return null;
}
function _wcWaterLevel(cam, s) { return s && _wcNum(s.level) ? s.level : (cam && _wcNum(cam.water) ? cam.water : 0); }
/** The water level of the region at (x, z) (per region, W4), or null when the point is not in water. */
function worldWaterLevelAt(world, x, z) { if (!world) return null; const s = _wcWaterAt(world, x, z); return s ? _wcWaterLevel(world.cam, s) : null; }
/** The height of a raised surface at (x, z): stairs and ramps rise from `from` (the first point) to `to` (the last). */
function worldSurfaceY(s, x, z) {
  if (!s) return null;
  if (_wcNum(s.y0) && _wcNum(s.y1) && Array.isArray(s.path)) {
    const n = _wcLineNear(s.path, x, z), L = _wcPathLen(s.path) || 1;
    return _wcR3(s.y0 + (s.y1 - s.y0) * Math.max(0, Math.min(1, n.s / L)));
  }
  return _wcNum(s.y) ? s.y : null;
}
/** Lights from the library glow parts ('lit'), in world metres about the anchor. */
const _wcLightMemo = new Map();
function _wcLights(info, x, y, z, facing, season) {
  const key = info.id + '|' + season;
  let rel = _wcLightMemo.get(key);
  if (!rel) {
    rel = [];
    let sh = null;
    if (typeof sceneObjShapes === 'function') { try { sh = sceneObjShapes(info.id, 0, season || 'summer'); } catch (e) { sh = null; } }
    const mv = typeof sceneMoverSize === 'function' ? sceneMoverSize(info.id) : null, top = mv && mv.top > 0 ? mv.top : 64, k = info.size.h / top;
    const lit = sh && sh.parts && sh.parts.lit;
    if (Array.isArray(lit) && typeof scenePathBox === 'function') for (const q of lit) {
      let b = null; try { b = q && q.d ? scenePathBox(q.d, q.m) : null; } catch (e) { b = null; }
      if (!b) continue;
      rel.push({ u: ((b[0] + b[2]) / 2) * k, y: -((b[1] + b[3]) / 2) * k, r: Math.max(0.2, Math.max(b[2] - b[0], b[3] - b[1]) * k / 2), col: typeof q.fill === 'string' ? q.fill : '#ffd27a' });
    }
    _wcLightMemo.set(key, rel);
  }
  const f = (_wcNum(facing) ? facing : 90) * _WC_DEG, hx = Math.sin(f), hz = Math.cos(f), kind = info.cls === 'lamp' ? 'lamp' : info.cls === 'train' || info.cls === 'tram' ? 'signal' : 'window';
  return rel.map(l => ({ x: _wcR3(x + l.u * hx), y: _wcR3(y + l.y), z: _wcR3(z + l.u * hz), r: _wcR3(l.r), col: l.col, kind }));
}
/* ---------- natural edges: wet ground and open natural water never end in a ruled line ---------- */
function _wcNoiseAt(i, j, k) { let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(k | 0, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295 * 2 - 1; }
/** Smooth value noise in -1..1 at a ground point (cell metres), channel k. */
function _wcValueNoise(x, z, cell, k) {
  const u = x / cell, v = z / cell, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
  const a = _wcNoiseAt(i, j, k), b = _wcNoiseAt(i + 1, j, k), c = _wcNoiseAt(i, j + 1, k), d = _wcNoiseAt(i + 1, j + 1, k);
  return (a + (b - a) * su) * (1 - sv) + (c + (d - c) * su) * sv;
}
/**
 * A ragged, soft outline for a natural polygon (a reed bed, the shore of a pond or lake): every edge is cut into pieces of about
 * 2 m (coarser far away) and each point is moved by one smooth noise field of the PLACE (two octaves, up to about a metre). The field depends on
 * the point alone, so two natural polygons that share an edge keep sharing it, and it is applied in the place frame (before the
 * camera transform), so every camera of a place sees the same shore (requirement Q7). Before this a reed bed or a bank drew as
 * its ruled polygon: a flat slab with a perfectly straight cut edge (the Fleet Pond boardwalk, 16 Oct).
 */
function _wcNaturalEdge(poly, seed, eyes) {
  const n = poly.length;
  if (n < 3) return poly;
  const k0 = (seed | 0) % 97, E = Array.isArray(eyes) && eyes.length ? eyes : [[0, 0]];
  // how far a point is from the nearest viewpoint of the place (the same for every camera of it): near edges are cut fine and shift
  // about a metre, far ones are cut coarse and shift more (a metre at 200 m is a hand's breadth on screen)
  const far = (x, z) => { let d = Infinity; for (const e of E) d = Math.min(d, Math.hypot(x - e[0], z - e[1])); return d; };
  const disp = (x, z, d) => {
    const A = Math.min(1.6, 0.7 + 0.008 * d);
    // three octaves: the long swell, the bay and the small bite (a straight run of bank 10 m long is never straight: 16 Oct, the island's front)
    return [A * (_wcValueNoise(x, z, 8.3, k0 + 1) + 0.5 * _wcValueNoise(x, z, 3.7, k0 + 2) + 0.55 * _wcValueNoise(x, z, 2.5, k0 + 5)) / 2.05, 0.9 * A * (_wcValueNoise(x, z, 7.1, k0 + 3) + 0.5 * _wcValueNoise(x, z, 3.3, k0 + 4) + 0.55 * _wcValueNoise(x, z, 2.3, k0 + 6)) / 2.05];
  };
  let mult = 1, out = [];
  for (let tries = 0; tries < 6; tries++) {
    out = [];
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dm = far((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), step = Math.min(16, Math.max(2.2, 0.06 * dm)) * mult, m = Math.max(1, Math.ceil(L / step));
      for (let j = 0; j < m; j++) {
        const t = j / m, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, d = disp(x, z, far(x, z));
        out.push([Math.round((x + d[0]) * 100) / 100, Math.round((z + d[1]) * 100) / 100]);
      }
    }
    if (out.length <= 90) break;
    mult *= 1.6;
  }
  return out;
}
const WORLD_NATURAL_WATERS = Object.freeze(['pond', 'lake']);
function _wcSurfRecord(s) {
  const r = { id: s.id, kind: s.kind, layer: WORLD_SURFACE_KINDS[s.kind] || null };
  if (Array.isArray(s.poly)) r.poly = s.poly.map(p => [p[0], p[1]]);
  if (Array.isArray(s.path)) { r.path = s.path.map(p => [p[0], p[1]]); r.width = s.width; }
  if (s.kind === 'water') {
    r.water = s.water; r.shallow = _wcNum(s.shallow) ? s.shallow : 0.5;
    if (s.hint != null) r.hint = s.hint;
    if (s.flow != null) r.flow = s.flow;
    if (_wcObjOf(s.step)) r.step = { to: s.step.to, kind: s.step.kind || 'weir' };
  }
  if (s.level != null) r.level = s.level;
  if (_wcNum(s.y) && s.y > 0) { r.y = s.y; r.level = s.y; r.overhead = s.y >= WORLD_OVERHEAD_Y; }
  if (WORLD_JOIN_KINDS.includes(s.kind)) { r.from = s.from; r.to = s.to; }
  if (s.obj) r.obj = s.obj;
  if (s.over) r.over = s.over;
  if (s.kind === 'hedge') r.open = s.open === true;
  return r;
}
/** Stairs and ramps: their two levels from heights or the surfaces they join. */
function _wcJoinLevels(world) {
  const byId = new Map(world.surfaces.map(s => [s.id, s]));
  for (const s of world.surfaces) {
    if (!WORLD_JOIN_KINDS.includes(s.kind) || !Array.isArray(s.path)) continue;
    const lv = (v, p) => _wcNum(v) ? v : (byId.has(v) && _wcNum(byId.get(v).y)) ? byId.get(v).y : sceneGroundHeight(world.cam, p[0], p[1]);   // a height, a raised surface, else the ground there
    s.y0 = _wcR3(lv(s.from, s.path[0])); s.y1 = _wcR3(lv(s.to, s.path[s.path.length - 1]));
  }
}
/** A world entity record from one spec entry (camera frame). The entry is kept (non-enumerable `_src`) so the solver can rebuild it. */
function _wcEntity(world, e, info, season) {
  const cam = world.cam, x = e.at[0], z = e.at[1], ak = e.attach ? _wcAttachKind(e.attach) : info.attachOk[0], ref = e.attach ? _wcAttachRef(e.attach) : null;
  const g = sceneGroundHeight(cam, x, z);
  let y = g, waterline = null, hostId = null;
  if (ak === 'water') {
    const s = _wcWaterAt(world, x, z), wl = _wcWaterLevel(cam, s);
    waterline = wl; y = info.floats ? _wcR3(wl - info.sink) : wl;
  } else if (ak === 'deck') {
    const host = world.entities.find(h => h.id === ref);
    hostId = ref;
    if (host) y = host.deck ? host.deck.y : host.y + host.height;
    else { const s = world.surfaces.find(q => q.id === ref); const sy = s ? worldSurfaceY(s, x, z) : null; y = sy != null ? sy : g; }
  } else if (ak === 'air' || ak === 'wall') { y = g + (_wcNum(e.y) ? e.y : 0); if (ak === 'wall') hostId = ref; }
  else if (info.cls === 'heron' || info.cls === 'reed' || info.cls === 'post' || info.cls === 'walkway' || info.cls === 'structure' || info.cls === 'landmark' || info.cls === 'rock') {
    const s = _wcWaterAt(world, x, z);
    if (s && !_wcGroundCovers(world, s, x, z)) { waterline = _wcWaterLevel(cam, s); y = waterline; }
  }
  const facing = _wcFace(_wcNum(e.facing) ? e.facing : 90), open = e.open === true;
  const ent = { id: e.id || null, obj: e.obj, cls: info.cls, variant: e.variant == null ? null : e.variant, x, z, y: _wcR3(y), facing,
    foot: _wcFoot(info, x, z, facing), height: info.size.h, size: info.size, solidity: info.cls === 'gate' && open ? 'passable' : info.solidity,
    attach: ak + (ref ? ':' + ref : ''), host: hostId, deck: null, waterline: waterline == null ? null : _wcR3(waterline), lights: null, static: true,
    seasonal: info.seasonal, blocks: e.blocks === true, framed: e.framed === true };
  if (e.row === true) ent.row = true;
  // a thing on a host's deck is ordered as if it stood at the host's nearest edge (just behind it): drawn after the host wherever it is along the host (a kiosk on a pier)
  if (ak === 'deck' && hostId) { const hh = world.entities.find(q => q.id === hostId); if (hh && Array.isArray(hh.foot) && hh.foot.length > 2) ent.orderZ = _wcR3(Math.min(...hh.foot.map(q => q[1])) - 0.01); }
  if (e.model && typeof worldModelFit === 'function') worldModelFit(ent, info, e.model);   // the model's own size, height and footprint
  if (_wcStr(e.parent)) ent.parent = e.parent;
  if (info.kcls !== info.cls) ent.kcls = info.kcls;
  if (info.deck) ent.deck = { poly: _wcLocalToWorld(info.deck.poly, x, z, facing), y: _wcR3(y + info.deck.y) };
  ent.lights = _wcLights(info, x, ent.y, z, facing, season);
  Object.defineProperty(ent, '_src', { value: e, writable: true, configurable: true, enumerable: false });
  return ent;
}
/** Is a water point covered by a later non-water ground surface (a towpath over the canal's polygon)? */
function _wcGroundCovers(world, water, x, z) {
  const surfs = world.surfaces || [], i0 = surfs.indexOf(water);
  for (let i = surfs.length - 1; i > i0; i--) { const s = surfs[i]; if (s.kind !== 'water' && !(_wcNum(s.y) && s.y > 0) && !WORLD_JOIN_KINDS.includes(s.kind) && _wcSurfContains(s, x, z)) return true; }
  return false;
}
/**
 * A cluster's members (clustered, seeded, never a grid). The scatter runs in the surface's OWN frame (its first point and edge),
 * so it is the same for every frame the world is seen in: the v3.0 and v3.1 forms of a scene and the cameras of a place get
 * the same members (Q7). Members behind the camera are counted (the sequence stays the same) and left out. idx: the cluster's
 * ordinal among the clusters of the spec.
 */
function _wcCluster(world, c, info, idx, season, solids) {
  const s = world.surfaces.find(q => q.id === c.on); if (!s) return [];
  const rnd = _wcRng(((c.seed | 0) * 7919 + idx * 104729 + (world.seed | 0)) >>> 0);
  const pts = s.poly || s.path, o = pts[0];
  let u = null;
  for (let i = 1; i < pts.length && !u; i++) { const dx = pts[i][0] - o[0], dz = pts[i][1] - o[1], L = Math.hypot(dx, dz); if (L > 1e-6) u = [dx / L, dz / L]; }
  if (!u) u = [1, 0];
  const v = [-u[1], u[0]], loc = p => [(p[0] - o[0]) * u[0] + (p[1] - o[1]) * u[1], (p[0] - o[0]) * v[0] + (p[1] - o[1]) * v[1]];
  const wor = (a, b) => [o[0] + a * u[0] + b * v[0], o[1] + a * u[1] + b * v[1]];
  const L = pts.map(loc), pad = s.path ? s.width / 2 : 0;
  const a0 = Math.min(...L.map(p => p[0])) - pad, a1 = Math.max(...L.map(p => p[0])) + pad, b0 = Math.min(...L.map(p => p[1])) - pad, b1 = Math.max(...L.map(p => p[1])) + pad;
  const gap = _wcNum(c.gap) ? c.gap : 0, edgeBand = 1.5, out = [], all = [];
  // an edge cluster on WATER keeps to the margin of a real bank (sense's probe: a seam between two water regions or a deck over
  // the water is not a bank), within the shallows + 1 m less the plant's own radius: margin reeds stood mid-pond, or on the
  // boardwalk, and sense had to snap them (verify round 1, the scene-fill request R1)
  // (its whole footprint in the water: sense judges reeds by the footprint, so one touching the towpath was snapped)
  const rIn = (_wcNum(info.r) ? info.r : 0.3) + 0.05, waterBand = Math.max(rIn + 0.1, Math.min(edgeBand, (_wcNum(s.shallow) && s.shallow > 0 ? s.shallow : 0.5) + 1) - rIn);
  const nearEdge = (x, z) => {
    if (s.kind === 'water' && typeof worldPlaceProbe === 'function') {
      let p = null;
      try { p = worldPlaceProbe(world, x, z); } catch (err) { p = null; }
      if (p && Number.isFinite(p.waterDist)) return !!p.inWater && -p.waterDist >= rIn && -p.waterDist <= waterBand && !(p.tags || []).some(t => t === 'walk' || t === 'deck' || t === 'path');
    }
    if (s.path) return _wcLineDist(s.path, x, z) >= s.width / 2 - edgeBand;
    let d = Infinity; for (let i = 0, j = s.poly.length - 1; i < s.poly.length; j = i++) d = Math.min(d, _wcSegDist(x, z, s.poly[j], s.poly[i])); return d <= edgeBand;
  };
  // seeds, then members around them
  const seeds = []; const nSeeds = Math.max(1, Math.round(Math.sqrt(c.n)));
  for (let tries = 0; seeds.length < nSeeds && tries < nSeeds * 200; tries++) {
    const p = wor(a0 + rnd() * (a1 - a0), b0 + rnd() * (b1 - b0));
    if (_wcSurfContains(s, p[0], p[1]) && (!c.edge || nearEdge(p[0], p[1]))) seeds.push(loc(p));
  }
  if (!seeds.length) return out;
  const spread = Math.max(0.6, Math.sqrt(Math.max(1, (a1 - a0) * (b1 - b0)) / Math.max(1, c.n)) * 1.2);
  const surfOnly = { surfaces: world.surfaces };
  for (let tries = 0; all.length < c.n && tries < c.n * 60; tries++) {
    const sd = seeds[Math.floor(rnd() * seeds.length)], t = rnd() * Math.PI * 2, r = spread * Math.sqrt(-2 * Math.log(Math.max(1e-6, rnd()))) * 0.7;
    const p = wor(sd[0] + Math.cos(t) * r * 1.25, sd[1] + Math.sin(t) * r), x = _wcR3(p[0]), z = _wcR3(p[1]);
    if (worldSurfaceAt(surfOnly, x, z, { ground: true }) !== s || (c.edge && !nearEdge(x, z))) continue;   // where a later surface covers it, not here
    if (gap > 0 && all.some(q => Math.hypot(q[0] - x, q[1] - z) < gap)) continue;
    const foot = _wcFoot(info, x, z, 90);
    if (info.solidity === 'solid' ? solids.some(f => _wcPenetration(f, foot) > 0.05) : solids.some(f => _wcInPoly(f, x, z))) continue;   // never inside a hull, a mill, a trunk
    const variant = c.variant != null ? c.variant : Math.floor(rnd() * info.variants), facing = rnd() < 0.5 ? 90 : 270;
    all.push([x, z]);
    if (!(z > 0.5)) continue;   // behind this camera
    const e = _wcEntity(world, { obj: c.cluster, at: [x, z], facing, attach: s.kind === 'water' ? 'water' : 'ground', variant }, info, season);
    e.id = `${c.on}-${c.cluster}-${idx}-${all.length - 1}`;
    e.cluster = true;
    if (info.solidity === 'solid') solids.push(e.foot);
    out.push(e);
  }
  return out;
}
function _wcLogBuild(log, e, msg, path) { log.push({ id: e && typeof e === 'object' ? (e.id || null) : null, obj: e && typeof e === 'object' ? (e.obj || e.cluster || null) : null, action: 'drop', rule: 'buildError', reason: 'it threw while building: ' + msg, from: null, to: null, by: 'sense', path: path || null, severity: 'drop' }); }
/**
 * The world of a spec (1.2). Repair (and, for v3.1, the camera transform) first, so a bad spec builds plainer, never wrong;
 * then every derived value: y from the attachment (the ground height with its features, the region's water level less the
 * descriptor's sink, a host's deck or a raised surface), footprints, solidity, decks, waterlines, lights. Clusters expand into
 * entities (seeded, clustered). Then the placement solver and the fill. o: { camera, season, ctx, fill, place, validate }.
 */
function worldBuild(spec, o = {}) {
  const season = o.season || 'summer';
  const rep = worldRepair(spec), log = rep.log.slice();
  let cs = rep.spec, camInfo = { id: 'main', index: 0, count: 1 }, culled = 0;
  // natural edges, in the place frame (before the camera transform: every camera of a place sees the same shore)
  if (Array.isArray(cs.surfaces)) {
    const eyes = Array.isArray(cs.cameras) && cs.cameras.length ? cs.cameras.map(c => (c && _wcPt(c.at) ? c.at : [0, 0])) : [[0, 0]];
    cs.surfaces = cs.surfaces.map(q => (q && Array.isArray(q.poly) && q.poly.length >= 3 && (q.kind === 'reeds' || (q.kind === 'water' && WORLD_NATURAL_WATERS.includes(q.water))) ? Object.assign({}, q, { poly: _wcNaturalEdge(q.poly, cs.seed, eyes) }) : q));
  }
  if (cs.v === 3.1) { try { const t = _wcToCamera(cs, o.camera, log); cs = t.spec; camInfo = t.camera; culled = t.culled; } catch (e) { _wcLogBuild(log, null, String(e && e.message || e), 'cameras'); cs = { v: 3, camera: {}, surfaces: [], entities: [], backdrop: cs.backdrop || { style: 'woodland' } }; } }
  let relief = null;
  try { relief = _wcReliefCompile(cs); } catch (e) { _wcLogBuild(log, null, String(e && e.message || e), 'ground.features'); }
  const cam = sceneCamera({ camera: Object.assign({}, _wcObjOf(cs.camera) ? cs.camera : {}), ground: relief ? { relief } : undefined });
  const P = _wcObjOf(cs.place) ? cs.place : {};
  const world = { v: 3, format: rep.spec.v, camera: camInfo, cam, place: Object.assign({}, P), seed: cs.seed | 0, season, ctx: o.ctx || null,
    style: _wcStyleKnown(P.style) ? P.style : (cs.backdrop && cs.backdrop.style) || null, fill: cs.fill !== false,
    surfaces: (Array.isArray(cs.surfaces) ? cs.surfaces : []).filter(_wcSurfOk).map(_wcSurfRecord),
    lines: (Array.isArray(cs.lines) ? cs.lines : []).map(l => { const dry = l.kind === 'wall' && typeof WORLD_DRYSTONE_STYLES !== 'undefined' && WORLD_DRYSTONE_STYLES.includes(P.style); return Object.assign({ width: l.kind === 'hedge' ? 1.2 : l.kind === 'wall' ? (dry ? 0.6 : 0.45) : 0.2, h: l.kind === 'kerb' ? 0.12 : l.kind === 'coping' ? 0.3 : l.kind === 'hedge' ? 1.8 : l.kind === 'wall' ? (dry ? 1.3 : 1.8) : 1.2 }, _wcCopy(l)); }),   // a dry-stone wall is 0.6 m thick and 1.3 m high (4drystone)
    buildings: (Array.isArray(cs.buildings) ? cs.buildings : []).map(b => Object.assign({ solidity: 'solid', h: _wcNum(b.h) ? b.h : (b.storeys || 2) * 3.1 }, _wcCopy(b))),
    features: _wcObjOf(cs.ground) && Array.isArray(cs.ground.features) ? _wcCopy(cs.ground.features) : [],
    reliefBase: relief && relief.base ? relief.base : null,
    entities: [], life: [], backdrop: _wcObjOf(cs.backdrop) ? _wcCopy(cs.backdrop) : null, waterSteps: [],
    problems: o.validate === false ? [] : rep.errors, warnings: rep.warnings, log, culled };
  try { _wcJoinLevels(world); } catch (e) { /* flat joins */ }
  // a whole side of a street becomes its houses (79-world-1frontage.js), before anything reads the footprints
  if (typeof worldFrontageExpand === 'function') { try { worldFrontageExpand(world); } catch (e) { _wcLogBuild(log, null, 'the frontage: ' + String(e && e.message || e), 'buildings'); } }
  for (const s of world.surfaces) if (s.step) { const t = world.surfaces.find(q => q.id === s.step.to); if (t) world.waterSteps.push({ from: s.id, to: t.id, kind: s.step.kind, drop: _wcR3(_wcWaterLevel(cam, s) - _wcWaterLevel(cam, t)) }); }
  world.life = (Array.isArray(cs.life) ? cs.life : []).map(L => Object.assign(_wcCopy(L), { pop: _wcPopOf(L.who) }));
  const all = [...(Array.isArray(cs.entities) ? cs.entities : []), ...(Array.isArray(cs.landmarks) ? cs.landmarks.map(l => Object.assign({ landmark: true }, l)) : [])];
  // hosts first (an attached thing reads its host's deck), clusters last (they avoid the placed solids)
  const placed = all.filter(e => _wcObjOf(e) && e.cluster == null && _wcPt(e.at) && worldObjectInfo(e.obj));
  const isAtt = e => /^(deck|wall):/.test(String(e.attach || ''));
  const ids = new Set();
  for (const e of [...placed.filter(e => !isAtt(e)), ...placed.filter(isAtt)]) {
    try {
      const ent = _wcEntity(world, e, worldObjectInfo(e.obj), season);
      if (e.landmark) { ent.landmark = true; ent.src = e.src || null; if (!e.src) ent.srcMissing = true; }
      // a stable id for every entity (parents, goals, random streams and the order tie-break need one): from its authored spot
      if (!ent.id) { let id = `${e.obj}@${_wcR3(ent.x)},${_wcR3(ent.z)}`, k = 2; while (ids.has(id)) id = `${e.obj}@${_wcR3(ent.x)},${_wcR3(ent.z)}#${k++}`; ent.id = id; ent.idAuto = true; }
      ids.add(ent.id);
      world.entities.push(ent);
    } catch (err) { _wcLogBuild(log, e, String(err && err.message || err)); }
  }
  const solids = world.entities.filter(e => e.solidity === 'solid').map(e => e.foot);
  let ci = 0;
  for (const c of all) {
    if (!_wcObjOf(c) || c.cluster == null) continue;
    const k = ci++;
    try { const info = worldObjectInfo(c.cluster); if (info) world.entities.push(..._wcCluster(world, c, info, k, season, solids)); }
    catch (err) { _wcLogBuild(log, c, String(err && err.message || err)); }
  }
  if (o.place !== false && typeof worldPlace === 'function') {
    try { worldPlace(world); } catch (err) { _wcLogBuild(log, null, 'the placement solver: ' + String(err && err.message || err)); }
  }
  // C1 first as well (appearance, typeof): a wall in the lens's face is moved or dropped BEFORE the fill dresses the view
  // around it (the fill's framing and richness then see the real frame)
  if (o.frame !== false && typeof worldFrameCheck === 'function') { try { worldFrameCheck(world, world.cam, { apply: true }); } catch (err) { _wcLogBuild(log, null, 'the frame check: ' + String(err && err.message || err)); } }
  if (o.fill !== false && typeof worldFill === 'function') {
    try {
      const before = world.log.length, r = worldFill(world, { fill: world.fill, ctx: o.ctx || null, season, style: world.style });
      if (Array.isArray(r) && world.log.length === before) for (const x of r) world.log.push(x);
    } catch (err) { _wcLogBuild(log, null, 'the fill: ' + String(err && err.message || err)); }
  }
  // the frame stage (pipeline 2.1; appearance, typeof): C1 nothing big cut by a frame edge, then C4 landmark faces cleared.
  // Both log their own moves, turns and drops into world.log (by: 'appearance'). o.frame === false skips it (tools that
  // measure the raw spec).
  if (o.frame !== false) {
    if (typeof worldFrameCheck === 'function') { try { worldFrameCheck(world, world.cam, { apply: true }); } catch (err) { _wcLogBuild(log, null, 'the frame check: ' + String(err && err.message || err)); } }
    if (typeof worldLandmarkCheck === 'function') { try { worldLandmarkCheck(world, world.cam, { apply: true, demote: true, season }); } catch (err) { _wcLogBuild(log, null, 'the landmark check: ' + String(err && err.message || err)); } }
  }
  // one shape for every load-log entry, whoever acted (U2, 12.5)
  for (const l of world.log) if (l && typeof l === 'object') for (const k of ['id', 'obj', 'from', 'to']) if (!(k in l)) l[k] = null;
  return world;
}
/* ---------- walkways never cross open water (the validator's rule and the invariant checker's 'walkwayWater') ---------- */
/** Surface kinds that are walkways: a deck laid over what is beneath it (ground, reeds or water). */
const WORLD_WALKWAY_KINDS = Object.freeze(['boardwalk', 'deck', 'platform', 'bridge-deck']);
/** The longest stretch (metres) a boardwalk or deck may lie over water: a footbridge between two banks of a stream or a leat (a
 *  bridge-deck is a bridge: it spans what it spans, between two banks). */
const WORLD_WALKWAY_SPAN = 6;
/**
 * Walkways over water, judged on surfaces alone (the spec's or the built world's). A walkway joins land to land (a footbridge of
 * at most WORLD_WALKWAY_SPAN between two banks), or runs to a platform at a reed edge, and never crosses open water:
 *   - a path walkway: no stretch over water longer than the span (a bridge-deck: any span, between two banks), and no end over water; one marked over: 'water' (a jetty, pier,
 *     pontoon, landing stage) may end over water but is fixed to the shore at the other end;
 *   - a polygon walkway (a platform, a stage): attached to land (its edge touches non-water ground) and at most a quarter over
 *     water, unless marked over: 'water';
 *   - reeds that stand over water must really be reeds: o.reedNear(x, z) -> boolean (the built world's plants); a reeds surface
 *     laid over open water to dodge the rule fails.
 * The ground under a walkway is the last surface that is not itself a walkway there (a water, a reeds bed, grass, a path).
 * -> [{ id, kind, surface, msg, run }]
 */
function worldWalkwayWater(surfaces, o) {
  o = o || {};
  const S = (Array.isArray(surfaces) ? surfaces : []).filter(s => s && typeof s === 'object' && (Array.isArray(s.poly) || Array.isArray(s.path)));
  const out = [], walk = s => WORLD_WALKWAY_KINDS.includes(s.kind);
  const has = (s, x, z) => (Array.isArray(s.poly) && s.poly.length >= 3 ? _wcInPoly(s.poly, x, z) : Array.isArray(s.path) && s.path.length >= 2 && s.width > 0 ? _wcLineDist(s.path, x, z) <= s.width / 2 : false);
  const under = (x, z) => { for (let i = S.length - 1; i >= 0; i--) if (!walk(S[i]) && S[i].kind !== 'stairs' && S[i].kind !== 'ramp' && has(S[i], x, z)) return S[i]; return null; };
  const water = (x, z) => { const g = under(x, z); return !!g && g.kind === 'water'; };
  const land = (x, z) => { const g = under(x, z); return !g || g.kind !== 'water'; };
  const R1 = v => Math.round(v * 10) / 10;
  for (const s of S) {
    if (!walk(s)) continue;
    const id = s.id || s.kind, jetty = s.over === 'water';
    if (Array.isArray(s.path) && s.path.length >= 2 && s.width > 0) {
      // samples along the centre line every half metre, the end points included
      const pts = [];
      for (let i = 1; i < s.path.length; i++) {
        const a = s.path[i - 1], b = s.path[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.5));
        for (let k = i === 1 ? 0 : 1; k <= n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
      }
      const wet = pts.map(p => water(p[0], p[1]));
      let i = 0, bad = null;
      while (i < wet.length && !bad) {
        if (!wet[i]) { i++; continue; }
        let j = i;
        while (j + 1 < wet.length && wet[j + 1]) j++;
        const len = (j - i + 1) * 0.5, atStart = i === 0, atEnd = j === wet.length - 1, at = pts[i];
        if (jetty) { if (atStart && atEnd) bad = { msg: `${id} (over water) is not fixed to the shore at either end`, run: len }; }
        else if (atStart || atEnd) bad = { msg: `${id} (${s.kind}) ends over open water (${R1(len)} m from ${R1(at[0])}, ${R1(at[1])}): a walkway joins land to land or runs to a platform at a reed edge`, run: len };
        else if (len > WORLD_WALKWAY_SPAN && s.kind !== 'bridge-deck') bad = { msg: `${id} (${s.kind}) crosses ${R1(len)} m of open water from ${R1(at[0])}, ${R1(at[1])} (a footbridge between two banks is at most ${WORLD_WALKWAY_SPAN} m)`, run: len };
        i = j + 1;
      }
      if (!bad && typeof o.reedNear === 'function') {
        // (reeds count within 3 m of the deck's EDGE: the deck's own footprint is kept clear of plants, so a wide platform's middle is
        // judged by the reeds round it)
        const rr = 3 + (Number(s.width) || 0) / 2;
        const fake = pts.find(p => { const g = under(p[0], p[1]); return g && g.kind === 'reeds' && S.some(q => q.kind === 'water' && has(q, p[0], p[1])) && !o.reedNear(p[0], p[1], rr); });
        if (fake) bad = { msg: `${id} (${s.kind}) runs over a reeds surface laid on open water with no reeds growing at ${R1(fake[0])}, ${R1(fake[1])}`, run: 0 };
      }
      if (bad) out.push({ id, kind: s.kind, surface: s, msg: bad.msg, run: bad.run });
    } else if (Array.isArray(s.poly) && s.poly.length >= 3) {
      const P = s.poly, xs = P.map(p => p[0]), zs = P.map(p => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), step = Math.max(0.5, Math.sqrt((x1 - x0) * (z1 - z0) / 400));
      let n = 0, w = 0;
      for (let x = x0 + step / 2; x < x1; x += step) for (let z = z0 + step / 2; z < z1; z += step) if (_wcInPoly(P, x, z)) { n++; if (water(x, z)) w++; }
      // the walkway's own edge touches land: non-water ground within a gangway's reach (1.6 m) outside the edge
      let touches = false;
      for (let a = 0; a < P.length && !touches; a++) {
        const p = P[a], q = P[(a + 1) % P.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, nx = (q[1] - p[1]) / L, nz = -(q[0] - p[0]) / L;
        for (const t of [0.1, 0.5, 0.9]) {
          const x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t;
          for (const d of [0.7, 1.6]) for (const sgn of [1, -1]) {
            const u = x + nx * d * sgn, v = z + nz * d * sgn;
            // land, or the end of another walkway (a platform at the end of a walk is attached by it)
            if (!_wcInPoly(P, u, v) && (land(u, v) || S.some(q => q !== s && walk(q) && has(q, u, v)))) touches = true;
          }
        }
      }
      const share = n ? w / n : 0;
      if (!touches) out.push({ id, kind: s.kind, surface: s, msg: `${id} (${s.kind}) floats in open water: no edge of it touches land or a reed bed`, run: 0 });
      else if (share > 0.25 && !jetty) out.push({ id, kind: s.kind, surface: s, msg: `${id} (${s.kind}) lies ${Math.round(share * 100)} % over open water: a platform stands at a reed edge on the bank, not out in the water`, run: 0 });
    }
  }
  return out;
}
/**
 * The surface at a point: a host's deck first, then raised surfaces (decks, bridges, platforms; stairs and ramps), then the ground
 * surfaces (later wins; a solid footprint cuts water). o.ground: the ground surface only (what lies under a bridge); o.y: the level
 * at or below that height (+ 0.75 m).
 */
function worldSurfaceAt(world, x, z, o) {
  if (!world) return null;
  o = o || {};
  const ents = Array.isArray(world.entities) ? world.entities : [], surfs = Array.isArray(world.surfaces) ? world.surfaces : [];
  const ground = () => {
    for (let i = surfs.length - 1; i >= 0; i--) {
      const s = surfs[i];
      if (_wcRaised(s) || !_wcSurfContains(s, x, z)) continue;
      if (s.kind === 'water' && ents.some(e => e.solidity === 'solid' && e.attach !== 'air' && Array.isArray(e.foot) && _wcInPoly(e.foot, x, z))) continue;
      return s;
    }
    return null;
  };
  if (o.ground) return ground();
  const raised = [];
  for (const e of ents) if (e.deck && _wcInPoly(e.deck.poly, x, z)) raised.push({ id: 'deck:' + (e.id || e.obj), kind: 'deck', layer: 'walk', host: e.id, y: e.deck.y, poly: e.deck.poly });
  for (let i = surfs.length - 1; i >= 0; i--) { const s = surfs[i]; if (_wcRaised(s) && _wcSurfContains(s, x, z)) raised.push(s); }
  if (_wcNum(o.y)) {
    const g = ground(), gy = sceneGroundHeight(world.cam, x, z);
    let best = g, by = g && g.kind === 'water' ? worldWaterLevelAt(world, x, z) : gy;
    for (const r of raised) { const ry = r.kind === 'deck' && r.host ? r.y : worldSurfaceY(r, x, z); if (ry != null && ry <= o.y + 0.75 && ry >= (by == null ? -Infinity : by)) { best = r; by = ry; } }
    return best;
  }
  return raised.length ? raised[0] : ground();
}

/* ---------- registration (I1, Q7, U2): never refuse, build lazily ---------- */
// NOTE: worldItem may run while a 72-anim-pack file loads, before this file's constants exist (one shared classic script):
// its synchronous part touches no top-level const of the world files. The registry is a `var` for the same reason.
var _wcAddReg;
function _wcReg() { return _wcAddReg || (_wcAddReg = new Map()); }
/** The repaired camera-frame spec of an item (lazy: computed on first use, after load). */
function _wcItemSpec(key) {
  if (!key.camSpec) {
    let r;
    try { r = worldSpecFor(key.spec, key.cam); } catch (e) { r = { spec: { v: 3, camera: {}, surfaces: [], entities: [], backdrop: { style: 'woodland' } }, log: [], errors: [], warnings: [] }; }
    key.log = r.log; key.errors = r.errors || []; key.warnings = r.warnings || []; key.camSpec = r.spec;
  }
  return key.camSpec;
}
/** A spec object whose top-level keys are read lazily (enumerable getters), so copying an item at load costs nothing. */
function _wcLazySpec(key) {
  const out = {}, names = ['v', 'place', 'camera', 'ground', 'surfaces', 'lines', 'buildings', 'entities', 'landmarks', 'life', 'backdrop', 'fill', 'seed'];
  for (const n of names) Object.defineProperty(out, n, { enumerable: true, configurable: true, get() { return _wcItemSpec(key)[n]; } });
  return out;
}
/**
 * An item usable from a 72-anim-pack file (I1): `add(county, kind, worldItem(meta, spec, { camera }))` gives the v3 scene the
 * same county, ukPlace, ukView, rotation (`when`), gallery grouping, pins, blocks, splash prebake, bake cache and restart clock
 * as any composed item: its scene is the derived v2 data (worldHostData), built lazily. Everything heavy waits for first use.
 */
function worldItem(meta, spec, o) {
  o = o || {};
  const m = Object.assign({}, meta || {});
  m.id = String(m.id || 'world');
  let ll = null;
  try { const p = spec && spec.place; if (p && typeof p.lat === 'number' && typeof p.lon === 'number' && isFinite(p.lat) && isFinite(p.lon)) ll = { lat: p.lat, lon: p.lon }; } catch (e) { ll = null; }
  if (!m.liveSky && ll) m.liveSky = ll;
  const key = { meta: m, spec, cam: o.camera == null ? 0 : o.camera, pack: o.pack || null, log: null, errors: null, warnings: null, camSpec: null, built: null, data: null };
  const lazy = _wcLazySpec(key);
  const thunk = () => {
    if (typeof worldHostData !== 'function') return { v: 3, spec: lazy };
    return key.data || (key.data = worldHostData(lazy, { id: m.id, sim: typeof document === 'undefined' ? false : undefined }));
  };
  const it = typeof sceneItem === 'function' ? sceneItem(m, thunk) : Object.assign({ slot: 'opening', full: true, rich: true, composed: true, reduced: 'static' }, m, { scene: thunk });
  it.world = 3; it.worldSpec = lazy; it.worldCamera = key.cam;
  it.worldLog = () => worldAddLog(m.id);
  it.svg = (so) => {
    if (typeof worldHostData !== 'function' || typeof sceneSvg !== 'function') return '';
    const s = _wcItemSpec(key), P = s.place || {};
    const season = (so && so.season) || it.sceneSeason || it.ukSeason || (typeof sceneSeason === 'function' && so && so.sky && Number.isFinite(so.sky.ms) ? sceneSeason(so.sky.ms, P.lat) : null) || 'summer';
    return sceneSvg(worldHostData(lazy, { id: m.id, season, sim: false }), Object.assign({}, so, { season }));
  };
  key.item = it;
  _wcReg().set(m.id, key);
  return it;
}
/** One item per camera of a v3.1 spec (Q7): ids `<id>-<camera id>` when there are several; one camera keeps the id. */
function worldItems(meta, spec, o) {
  o = o || {};
  let cams = [];
  try { cams = spec && Array.isArray(spec.cameras) ? spec.cameras : []; } catch (e) { cams = []; }
  if (cams.length <= 1) return [worldItem(meta, spec, Object.assign({}, o, { camera: 0 }))];
  const out = [], seen = new Set();
  cams.slice(0, 8).forEach((c, i) => {
    let cid = c && typeof c.id === 'string' && /^[a-z0-9][a-z0-9-]*$/i.test(c.id) ? c.id : 'cam' + (i + 1);
    if (seen.has(cid)) cid = cid + '-' + (i + 1);
    seen.add(cid);
    const m = Object.assign({}, meta || {}, { id: String((meta && meta.id) || 'world') + '-' + cid, viewName: cid });
    m.ukView = (meta && meta.ukView ? meta.ukView + '-' : '') + cid;
    out.push(worldItem(m, spec, Object.assign({}, o, { camera: i })));
  });
  return out;
}
/** Register a v3 scene: never refuses. The repaired spec is registered (one item per camera); the load log is kept (worldAddLog). */
function worldAdd(pack, meta, spec) {
  let items = [];
  try { items = worldItems(meta, spec, { pack }); } catch (e) { try { items = [worldItem(meta, spec, { pack })]; } catch (e2) { items = []; } }
  for (const it of items) {
    try {
      if (typeof _scPacks === 'object' && _scPacks) (_scPacks[pack] = _scPacks[pack] || []).push(it);
      else if (typeof sceneAdd === 'function') sceneAdd(pack, it, it.scene);
    } catch (e) { /* the pack registry is missing: nothing to add to */ }
    const key = _wcReg().get(it.id);
    if (key) { key.pack = pack; try { _wcItemSpec(key); } catch (e) { /* lazy */ } }   // validate (repair) now: cheap; build later
  }
  return items.length > 0;
}
/**
 * The load log of a registered v3 item (U2): every strip, default and drop of the repair, the camera's culls, then (o.build,
 * default true) the placement solver's snaps, moves, turns and drops and the fill, from one cached build.
 */
function worldAddLog(id, o) {
  o = o || {};
  const key = _wcReg().get(id);
  if (!key) return [];
  _wcItemSpec(key);
  if (o.build === false) return key.log.concat(key.warnings.map(w => ({ id: null, obj: null, action: 'warn', rule: w.rule, reason: w.msg, from: null, to: null, by: 'sense', path: w.path, severity: 'warn' })));
  if (!key.built) {
    try { const w = worldBuild(key.spec, { camera: key.cam, season: o.season || 'summer' }); key.built = w.log.slice(); }
    catch (e) { key.built = key.log.concat([{ id: null, obj: null, action: 'drop', rule: 'buildError', reason: 'the build threw: ' + String(e && e.message || e), from: null, to: null, by: 'sense' }]); }
    // C7 across this place's cameras (layout signatures need builds: only here, never at load)
    try { if (Array.isArray(key.spec.cameras) && key.spec.cameras.length > 1 && key.cam === 0) for (const w of worldTemplated([key.spec])) key.built.push({ id: null, obj: null, action: 'warn', rule: 'templated', reason: w.msg, from: null, to: null, by: 'sense', path: w.path, severity: 'warn' }); } catch (e) { /* advice only */ }
    for (const w of key.warnings) key.built.push({ id: null, obj: null, action: 'warn', rule: w.rule, reason: w.msg, from: null, to: null, by: 'sense', path: w.path, severity: 'warn' });
  }
  return key.built.slice();
}
/** The registered v3 items whose specs had strict errors (they were repaired and registered all the same): [{ pack, id, errors }]. */
function worldAddProblems() {
  const out = [];
  for (const [id, key] of _wcReg()) { try { _wcItemSpec(key); } catch (e) { continue; } if (key.errors && key.errors.length) out.push({ pack: key.pack, id, errors: key.errors.slice() }); }
  return out;
}
