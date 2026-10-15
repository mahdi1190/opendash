/* ============================================================
   WORLD ENGINE (scene format v3.1): the fill (docs/dev/WORLD_ENGINE.md 12.3; WORLD_ENGINE_REQUIREMENTS.md P5, P6, P7, P8, C3, C6).
   Package `kb`, private prefix _wfl. PURE classic script: only constants and functions at load. It reads the knowledge base
   (79-world-0kb.js) and, through typeof guards, the core and sense (worldSurfaceAt, worldPlaceProbe, worldPlaceOk,
   worldPlaceAdd, worldObjectInfo), look (worldCoverage, worldBackdrop, worldEntityBox) and the v2 camera maths (sceneProject,
   sceneUnproject, sceneGroundHeight). A missing package removes a detail; the fill still runs on its own checks. Never throws.

     WORLD_FILL_STYLES               per place style: what dresses each surface (near / mid / far / seasonal accents), the edges
                                     (water banks by water kind, verges, kerbs and pavements, wall bases, hedgerows), the framing
                                     options and the default backdrop
     WORLD_RICHNESS_FLOOR            the floor of worldRichness (P7) and the box-measure target by place kind
     worldFill(world, o)             -> log: dresses edges (P5), frames the near band (C3), gives paving its sparse street furniture
                                     and unlived paving and paths their people (a population), fills every visible undressed
                                     surface by kind, style and depth (P6) and keeps filling with the next tier until the frame has
                                     <= 15 % bare (C6, look's worldCoverage, over the entities present all year), then the richness
                                     tier lifts the box measure towards the place kind's target or a converted scene's source score
                                     (P7). Nothing auto-placed hides a landmark's main face (P8). spec fill: false (or o.fill ===
                                     false) switches the auto-fill off; edges and framing still run. Idempotent (world.fillState).
                                     Things that come and go by date (K6: flowers, lilies, leaf litter) are placed only with
                                     o.seasonal or when the renderer hides absent statics (worldStaticPresent, typeof).
     worldRichness(world, cam, o)    -> { near, mid, far: { cover, variety }, score, bare, ok, floor, box: { near, mid, far, score } }
                                     (P7; box is the tools' critic measure: depth bands near < 15 m, mid 15-80 m, far beyond)
     worldFillStyle(world, o)        -> the style key the fill uses for a world

   Every generated entity carries auto: 'edge' | 'frame' | 'fill' and goes through sense's worldPlaceAdd(world, e, why) when
   it exists (its log lists each one); otherwise the fill builds the entity itself after its own habitat (K1), footprint
   overlap (P2), walking-line (P3), frame-cut (C1) and landmark (P8) checks and logs each one. Placement is seeded and
   clustered (clumps, stands with gaps), never rows. The entries go into world.log (when the world has one) and are returned.
   o: { ctx (WorldTimeCtx), cam, fill, style, floor: { score } (a converted scene's source score, box measure), seasonal, maxTier (5),
        maxAuto (1400), W (1600), H (900), overscan (0.18 of W each side) }.
   ============================================================ */

/* ---------- styles ---------- */
// score / near / mid / far: the frame-band floor (cover below the horizon, variety); box: the default target of the box measure
// (worldRichness(...).box, the same measure as the tools' critic: a converted scene must reach its source's) by place kind
const WORLD_RICHNESS_FLOOR = Object.freeze({ score: 62, near: Object.freeze({ cover: 0.7, variety: 2 }), mid: Object.freeze({ cover: 0.7, variety: 3 }), far: Object.freeze({ cover: 0.6, variety: 2 }),
  // box: what the richness tier aims at; gate: what worldRichness(...).ok needs (bug 9: one gate, band floor AND box measure).
  // The gate sits below the aim: the gold proof Fleet Pond scores 94 by this measure, and the sky window (bugs 9, 21) keeps the
  // centre of the sky open, which a box measure cannot reward. A converted scene's own source score (o.floor) raises both.
  box: Object.freeze({ rural: 96, park: 96, town: 75, city: 66 }), gate: Object.freeze({ rural: 88, park: 88, town: 72, city: 64 }) });
const _WFL_NEAR_Z = 12, _WFL_MID_Z = 35, _WFL_EDGE_ZMAX = 150, _WFL_FILL_ZMAX = 260;
// lists are [object id, weight]; near: z < 12 m (low dressing only), mid: 12-35 m, far: beyond; accents are seasonal or
// occasional (flowers in their months, leaf litter in autumn, stones, logs): richness, never coverage
const _WFL_RURAL_GRASS = { near: [['plant.grass-long', 4], ['plant.yg-meadow', 4], ['plant.grass', 2], ['plant.fern', 1], ['plant.bracken', 1]],
  mid: [['plant.yg-meadow', 3], ['plant.bracken', 2], ['plant.rph-hazel-coppice', 2], ['plant.shrub', 2], ['plant.fern', 1], ['tree.hawthorn', 1]],
  far: [['tree.bank-oak', 3], ['tree.bank-alder', 2], ['tree.bank-birch', 2], ['tree.wyv-far-sallow', 1], ['tree.hawthorn', 1], ['plant.shrub', 1]],
  accents: [['plant.wildflowers', 3], ['plant.daisies', 1], ['plant.bluebells', 1], ['ground.leaf-litter', 2], ['rock.stones', 1], ['ground.log', 1]] };
const _WFL_HEATH = { near: [['ground.yc-heath-drift', 4], ['plant.heather', 3], ['plant.wyv-heath-bank', 2], ['plant.moor-heather', 2], ['plant.grass-long', 1]],
  mid: [['plant.gorse', 3], ['plant.yc-gorse-spray', 2], ['plant.wyv-heath-bank', 2], ['plant.bracken', 2], ['tree.wyv-far-sallow', 1]],
  far: [['tree.pool-birch', 3], ['tree.pine', 2], ['tree.pond-pine', 2], ['tree.bank-birch', 1], ['plant.gorse', 1]],
  accents: [['plant.yc-cotton-grass', 1], ['rock.stones', 1], ['ground.log', 1], ['ground.puddle', 1]] };
const _WFL_WOOD = { near: [['plant.fern', 3], ['plant.bracken', 2], ['plant.rph-woodland-sedge', 3], ['plant.grass-long', 2]],
  mid: [['plant.rph-hazel-coppice', 3], ['plant.holly', 1], ['plant.shrub', 2], ['plant.fern', 1], ['plant.bracken', 1]],
  far: [['tree.bank-oak', 3], ['tree.wyv-far-oak', 2], ['tree.pool-birch', 2], ['tree.bank-birch', 1], ['tree.bank-alder', 1]],
  accents: [['plant.bluebells', 3], ['ground.leaf-litter', 3], ['ground.log', 2], ['plant.daisies', 1]] };
const _WFL_FARM = { near: [['plant.grass-long', 4], ['plant.yg-meadow', 3], ['plant.grass', 3]],
  mid: [['plant.yg-meadow', 2], ['plant.hedge', 2], ['plant.hedgerow-blackberry', 1], ['plant.shrub', 1]],
  far: [['tree.bank-oak', 3], ['tree.hawthorn', 2], ['tree.bank-birch', 1], ['plant.hedge', 2]],
  accents: [['plant.wildflowers', 3], ['plant.daisies', 1], ['ground.hay-bales', 1], ['rock.stones', 1]] };
const _WFL_PARK_GRASS = { near: [['plant.grass', 4], ['plant.grass-long', 2], ['plant.yg-meadow', 1]], maxH: 3.5,
  mid: [['plant.shrub', 2], ['plant.rph-church-shrub', 2], ['plant.holly', 1], ['plant.grass-long', 1]],
  far: [['tree.plane', 2], ['tree.bank-oak', 2], ['tree.horse-chestnut', 1], ['tree.bank-birch', 1], ['plant.rph-church-shrub', 1]],
  accents: [['plant.daisies', 3], ['plant.shp-border', 2], ['ground.leaf-litter', 2], ['ground.petals', 1]] };
// city verges and banks stay low (grass and long grass, the odd buddleia): fill never hides a street front or a mill's ground floor
const _WFL_CITY_GRASS = { near: [['plant.grass', 4], ['plant.grass-long', 2]], mid: [['plant.grass-long', 3], ['plant.grass', 2], ['plant.yg-meadow', 1]],
  far: [['tree.mqn-street-tree', 3], ['tree.plane', 1], ['plant.grass-long', 2]], accents: [['plant.daisies', 2], ['ground.leaf-litter', 2], ['plant.mqn-buddleia', 1]], maxH: 1.3 };
const _WFL_PAVING = { near: [['plant.planter', 2], ['street.mqn-bin', 1], ['plant.rph-flower-tub', 1]],
  mid: [['street.mqn-planter-grass', 2], ['tree.mqn-street-tree', 2], ['street.mcr-cycle-stand', 1], ['street.bench', 1], ['street.lamppost', 1]],
  far: [['tree.mqn-street-tree', 3], ['street.mqn-planter-grass', 1]], accents: [['ground.rph-paving-wear', 3], ['ground.leaf-litter', 2], ['ground.puddle', 1]], max: { near: 6, mid: 14, far: 12 } };
const _WFL_PATH = { near: [], mid: [], far: [], accents: [['ground.leaf-litter', 3], ['ground.puddle', 1]] };
const _WFL_SAND = { near: [['rock.stones', 2], ['plant.grass-long', 1]], mid: [['rock.boulder', 1], ['plant.grass-long', 1]], far: [['rock.boulder', 1]], accents: [['rock.stones', 1]] };
const _WFL_WET = { near: [['plant.rph-woodland-sedge', 2], ['plant.proof-fleet-rush', 1]], mid: [['plant.yg-reedbed', 2], ['plant.proof-fleet-reed', 1]], far: [['plant.yg-reedbed', 1], ['tree.wyv-far-sallow', 1]], accents: [] };
const _WFL_WATER_CALM = { calm: [['water.lily', 4], ['water.fish-ring', 1]], share: 0.3 };
const _WFL_NATURAL_BANK = { margin: [['plant.proof-fleet-reed', 3], ['plant.reed', 3], ['plant.bulrush', 2], ['plant.proof-fleet-rush', 1]],
  bank: [['plant.grass-long', 4], ['plant.rph-woodland-sedge', 2], ['plant.fern', 1], ['plant.canal-view-meadowsweet', 1], ['plant.canal-view-loosestrife', 1], ['rock.stones', 1]], stands: 0.5 };
// the richness tier's pools by band (perennial only; habitat decides where each may stand): the variety of the corpus scenes
const _WFL_RICH_RURAL = {
  mid: [['tree.bank-oak', 2], ['tree.bank-alder', 2], ['tree.bank-birch', 2], ['tree.bank-willow', 1], ['tree.pool-birch', 2], ['tree.wyv-far-oak', 1], ['tree.wyv-far-sallow', 2],
    ['tree.hawthorn', 2], ['tree.pond-pine', 1], ['plant.holly', 1], ['plant.rph-hazel-coppice', 2], ['plant.shrub', 2], ['plant.gorse', 1], ['plant.bracken', 2], ['plant.fern', 2],
    ['plant.yg-meadow', 2], ['plant.grass-long', 2], ['plant.rph-woodland-sedge', 1], ['plant.wyv-heath-bank', 1], ['rock.boulder', 1], ['ground.log', 1], ['plant.reed', 1],
    ['plant.bulrush', 1], ['plant.proof-fleet-reed', 1], ['plant.yg-reedbed', 1]],
  far: [['tree.bank-oak', 3], ['tree.bank-alder', 2], ['tree.bank-birch', 2], ['tree.wyv-far-oak', 2], ['tree.far-broad', 2], ['tree.far-birch', 1], ['tree.far-pine', 1],
    ['tree.bank-distant', 2], ['tree.pond-pine', 1], ['tree.pool-birch', 1], ['tree.hawthorn', 1], ['plant.shrub', 1], ['tree.woods-edge', 3], ['tree.distant', 2]] };
const _WFL_RICH_CITY = {
  mid: [['tree.mqn-street-tree', 3], ['tree.plane', 1], ['plant.grass-long', 2], ['plant.grass', 2], ['plant.mqn-buddleia', 1]],
  far: [['tree.mqn-street-tree', 2], ['tree.plane', 2], ['tree.far-broad', 1]] };
const _WFL_EDGES_RURAL = { water: { pond: 'natural', lake: 'natural', canal: 'natural', river: 'natural', sea: 'none', harbour: 'urban', puddle: 'none' }, natural: _WFL_NATURAL_BANK,
  verge: [['plant.grass-long', 4], ['plant.grass', 3], ['plant.wildflowers', 1]], hedgerow: [['plant.hedgerow-blackberry', 3], ['plant.hedge', 2], ['tree.hawthorn', 1]],
  wallBase: [['plant.grass', 3], ['plant.rph-woodland-sedge', 2], ['plant.fern', 1]], kerb: true, pavement: false };
const _WFL_EDGES_URBAN = { water: { pond: 'natural', lake: 'natural', canal: 'urban', river: 'urban', sea: 'urban', harbour: 'urban', puddle: 'none' }, natural: _WFL_NATURAL_BANK,
  verge: [['plant.grass', 3], ['plant.grass-long', 2], ['plant.daisies', 1]], vergeShare: 0.35, hedgerow: [], wallBase: [['plant.grass', 3], ['plant.mqn-buddleia', 1]], kerb: true, pavement: true };
const _WFL_FRAME_WOOD = [{ kind: 'bough', trunk: 'tree.shp-trunk', bough: 'plant.canal-view-bough' }, { kind: 'reeds', obj: 'plant.yg-reedbed' },
  { kind: 'shrub', obj: 'plant.rph-hazel-coppice' }, { kind: 'hedge', obj: 'plant.towpath-hedge' }];
const WORLD_FILL_STYLES = _wkbFreeze({
  'canal-wooded': { backdrop: 'canal-wooded', place: 'park', ground: 'grass', fill: { grass: _WFL_RURAL_GRASS, heath: _WFL_HEATH, wood: _WFL_WOOD, field: _WFL_FARM, wet: _WFL_WET, sand: _WFL_SAND, paving: _WFL_PAVING, path: _WFL_PATH, water: _WFL_WATER_CALM },
    edges: _WFL_EDGES_RURAL, frame: _WFL_FRAME_WOOD },
  pond: { backdrop: 'woodland', place: 'park', ground: 'grass', fill: { grass: _WFL_RURAL_GRASS, heath: _WFL_HEATH, wood: _WFL_WOOD, field: _WFL_FARM, wet: _WFL_WET, sand: _WFL_SAND, paving: _WFL_PAVING, path: _WFL_PATH, water: _WFL_WATER_CALM },
    edges: _WFL_EDGES_RURAL, frame: [{ kind: 'reeds', obj: 'plant.yg-reedbed' }, { kind: 'bough', trunk: 'tree.shp-trunk', bough: 'plant.canal-view-bough' }, { kind: 'shrub', obj: 'plant.rph-hazel-coppice' }] },
  woodland: { backdrop: 'woodland', place: 'rural', ground: 'wood', fill: { grass: _WFL_WOOD, wood: _WFL_WOOD, heath: _WFL_HEATH, field: _WFL_FARM, wet: _WFL_WET, sand: _WFL_SAND, paving: _WFL_PAVING, path: _WFL_PATH, water: _WFL_WATER_CALM },
    edges: _WFL_EDGES_RURAL, frame: _WFL_FRAME_WOOD },
  heath: { backdrop: 'heath', place: 'rural', ground: 'heath', fill: { grass: _WFL_HEATH, heath: _WFL_HEATH, wood: _WFL_WOOD, field: _WFL_FARM, wet: _WFL_WET, sand: _WFL_SAND, paving: _WFL_PAVING, path: _WFL_PATH, water: _WFL_WATER_CALM },
    edges: _WFL_EDGES_RURAL, frame: [{ kind: 'shrub', obj: 'plant.yc-gorse-spray' }, { kind: 'bough', trunk: 'tree.shp-trunk', bough: 'plant.canal-view-bough' }, { kind: 'reeds', obj: 'plant.yg-reedbed' }] },
  downs: { backdrop: 'downs', place: 'rural', ground: 'field', fill: { grass: _WFL_FARM, field: _WFL_FARM, heath: _WFL_HEATH, wood: _WFL_WOOD, wet: _WFL_WET, sand: _WFL_SAND, paving: _WFL_PAVING, path: _WFL_PATH, water: _WFL_WATER_CALM },
    edges: _WFL_EDGES_RURAL, frame: [{ kind: 'hedge', obj: 'plant.hedgerow-blackberry' }, { kind: 'shrub', obj: 'plant.shrub' }] },
  farmland: { backdrop: 'farmland', place: 'rural', ground: 'field', fill: { grass: _WFL_FARM, field: _WFL_FARM, heath: _WFL_HEATH, wood: _WFL_WOOD, wet: _WFL_WET, sand: _WFL_SAND, paving: _WFL_PAVING, path: _WFL_PATH, water: _WFL_WATER_CALM },
    edges: _WFL_EDGES_RURAL, frame: [{ kind: 'hedge', obj: 'plant.hedgerow-blackberry' }, { kind: 'bough', trunk: 'tree.shp-trunk', bough: 'plant.canal-view-bough' }, { kind: 'shrub', obj: 'plant.shrub' }] },
  coast: { backdrop: 'coast', place: 'rural', ground: 'sand', fill: { grass: _WFL_FARM, sand: _WFL_SAND, field: _WFL_FARM, heath: _WFL_HEATH, wood: _WFL_WOOD, wet: _WFL_WET, paving: _WFL_PAVING, path: _WFL_PATH, water: { calm: [], share: 0 } },
    edges: _WFL_EDGES_RURAL, frame: [{ kind: 'shrub', obj: 'plant.gorse' }, { kind: 'railing', obj: 'structure.mqn-quayrail-v1' }] },
  park: { backdrop: 'town-low', place: 'park', ground: 'grass', fill: { grass: _WFL_PARK_GRASS, heath: _WFL_HEATH, wood: _WFL_WOOD, field: _WFL_FARM, wet: _WFL_WET, sand: _WFL_SAND, paving: _WFL_PAVING, path: _WFL_PATH, water: _WFL_WATER_CALM },
    edges: _WFL_EDGES_RURAL, frame: [{ kind: 'bough', trunk: 'tree.shp-trunk', bough: 'plant.shp-bough' }, { kind: 'shrub', obj: 'plant.rph-church-shrub' }, { kind: 'lamp', obj: 'street.lamp' }] },
  'town-low': { backdrop: 'town-low', place: 'town', ground: 'grass', fill: { grass: _WFL_PARK_GRASS, paving: _WFL_PAVING, path: _WFL_PATH, heath: _WFL_HEATH, wood: _WFL_WOOD, field: _WFL_FARM, wet: _WFL_WET, sand: _WFL_SAND, water: _WFL_WATER_CALM },
    edges: _WFL_EDGES_URBAN, frame: [{ kind: 'bough', trunk: 'tree.shp-trunk', bough: 'plant.shp-bough' }, { kind: 'lamp', obj: 'street.lamp' }, { kind: 'shrub', obj: 'plant.rph-church-shrub' }] },
  'city-victorian': { backdrop: 'city-victorian', place: 'city', ground: 'grass', fill: { grass: _WFL_CITY_GRASS, paving: _WFL_PAVING, path: _WFL_PATH, heath: _WFL_HEATH, wood: _WFL_WOOD, field: _WFL_FARM, wet: _WFL_WET, sand: _WFL_SAND, water: { calm: [], share: 0 } },
    edges: _WFL_EDGES_URBAN, frame: [{ kind: 'lamp', obj: 'street.lamppost' }, { kind: 'railing', obj: 'structure.mqn-quayrail-v1' }, { kind: 'bough', trunk: 'tree.shp-trunk', bough: 'plant.mcf-plane-bough' }] },
  'city-sheffield-hills': { backdrop: 'city-sheffield-hills', place: 'city', ground: 'grass', fill: { grass: _WFL_CITY_GRASS, paving: _WFL_PAVING, path: _WFL_PATH, heath: _WFL_HEATH, wood: _WFL_WOOD, field: _WFL_FARM, wet: _WFL_WET, sand: _WFL_SAND, water: { calm: [], share: 0 } },
    edges: _WFL_EDGES_URBAN, frame: [{ kind: 'bough', trunk: 'tree.shp-trunk', bough: 'plant.klm-sycamore-bough' }, { kind: 'lamp', obj: 'street.lamppost' }, { kind: 'railing', obj: 'structure.mqn-quayrail-v1' }] },
  'city-manchester-towers': { backdrop: 'city-manchester-towers', place: 'city', ground: 'grass', fill: { grass: _WFL_CITY_GRASS, paving: _WFL_PAVING, path: _WFL_PATH, heath: _WFL_HEATH, wood: _WFL_WOOD, field: _WFL_FARM, wet: _WFL_WET, sand: _WFL_SAND, water: { calm: [], share: 0 } },
    edges: _WFL_EDGES_URBAN, frame: [{ kind: 'railing', obj: 'structure.mqn-quayrail-v1' }, { kind: 'lamp', obj: 'street.lamppost' }, { kind: 'bough', trunk: 'tree.shp-trunk', bough: 'plant.mcf-plane-bough' }] },
});
// surface kind -> fill group
const _WFL_GROUP = { grass: 'grass', lawn: 'grass', park: 'grass', verge: 'grass', garden: 'grass', meadow: 'grass', bank: 'grass', ground: null,
  heath: 'heath', field: 'field', wood: 'wood', sand: 'sand', beach: 'sand', shingle: 'sand', pavement: 'paving', plaza: 'paving', platform: 'paving', driveway: 'paving',
  path: 'path', towpath: 'path', track: 'path', cycleway: 'path', water: 'water', reeds: 'wet', bed: 'wet', mud: 'wet', reedbed: 'wet' };
const _WFL_DRESSED = new Set(['water', 'reeds', 'bed', 'hedge', 'weir', 'rail', 'tram', 'reedbed']);
const _WFL_WALK = new Set(['path', 'pavement', 'towpath', 'plaza', 'boardwalk', 'bridge-deck', 'deck', 'platform', 'stairs', 'ramp', 'crossing', 'track', 'cycleway', 'steps', 'driveway', 'jetty', 'pontoon']);

/* ---------- small helpers ---------- */
const _wflNum = v => typeof v === 'number' && Number.isFinite(v);
const _wflR2 = v => Math.round(v * 100) / 100;
const _wflDeg = r => r * 180 / Math.PI;
function _wflRng(seed) {
  let a = _wkbHash(seed) || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function _wflPick(list, r) {
  if (!Array.isArray(list) || !list.length) return null;
  let tot = 0; for (const [, w] of list) tot += Math.max(0, w);
  if (!(tot > 0)) return null;
  let u = r() * tot;
  for (const [id, w] of list) { u -= Math.max(0, w); if (u <= 0) return id; }
  return list[list.length - 1][0];
}
function _wflInPoly(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function _wflSeg(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, t = L2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)) : 0;
  const px = a[0] + t * dx, pz = a[1] + t * dz;
  return { d: Math.hypot(x - px, z - pz), px, pz, dir: _wflDeg(Math.atan2(dx, dz)), t };
}
/** Nearest point of a polyline (open) or ring (closed). */
function _wflNear(pts, x, z, closed) {
  let best = { d: Infinity, px: x, pz: z, dir: 0 };
  const n = pts.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) { const r = _wflSeg(x, z, pts[i], pts[(i + 1) % n]); if (r.d < best.d) best = r; }
  return best;
}
function _wflContains(s, x, z) {
  if (Array.isArray(s.poly) && s.poly.length >= 3) return _wflInPoly(s.poly, x, z);
  if (Array.isArray(s.path) && s.path.length >= 2 && s.width > 0) return _wflNear(s.path, x, z, false).d <= s.width / 2;
  return false;
}
function _wflOffsetLine(P, o) {
  return P.map((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    // +o: to the right of the path direction (x right, z forward: the right normal of (dx, dz) is (dz, -dx))
    return [p[0] + o * dz / L, p[1] - o * dx / L];
  });
}
const _wflLog = (F, e) => { F.log.push(Object.assign({ id: null, obj: null, action: 'fill', rule: 'P6', reason: '', by: 'kb' }, e)); };

/* ---------- the camera ---------- */
function _wflProj(F, x, z, y) {
  const cam = F.cam;
  if (typeof sceneProject === 'function') return sceneProject(cam, x, z, y);
  const d = Math.max(0.01, z), k = cam.f / d;
  return { X: cam.x0 + k * x, Y: cam.horizon + k * (cam.eye - (y == null ? 0 : y)), k };
}
function _wflGround(F, x, z) { return typeof sceneGroundHeight === 'function' ? sceneGroundHeight(F.cam, x, z) : 0; }
function _wflUnproject(cam, X, Y) {
  if (typeof sceneUnproject === 'function') return sceneUnproject(cam, X, Y);
  if (!(Y > cam.horizon + 1e-6)) return null;
  const d = cam.f * cam.eye / (Y - cam.horizon);
  return { x: (X - cam.x0) * d / cam.f, d };
}
/** The frame x at depth z of a screen column X. */
const _wflXAt = (cam, X, z) => (X - cam.x0) * z / cam.f;
const _wflDims = (obj) => { const kb = worldKb(obj); if (kb && kb.size && _wflNum(kb.size.h0)) return { h: kb.size.h0, l: kb.size.l || 1, w: kb.size.w || 0.5 }; const r = typeof sceneObjReal === 'function' ? sceneObjReal(obj) : null; return r ? { h: r.h, l: r.l, w: r.w } : { h: 1, l: 1, w: 0.6 }; };
/** The screen box [X0, Y0, X1, Y1] of an entity standing at its real size (look's worldEntityBox when loaded). */
function _wflBox(F, e) {
  const kb = e && e.obj ? worldKb(e.obj) : null;
  if (kb && kb.hang && Array.isArray(kb.art)) {
    const z = Math.max(0.05, e.z), y = _wflNum(e.y) ? e.y : _wflGround(F, e.x, z), p = _wflProj(F, e.x, z, y), mir = _wflNum(e.facing) && e.facing > 180 && e.facing < 360 ? -1 : 1;
    const xa = p.X + kb.art[0] * p.k * mir, xb = p.X + kb.art[2] * p.k * mir;
    return [Math.min(xa, xb), p.Y - kb.art[3] * p.k, Math.max(xa, xb), p.Y - kb.art[1] * p.k];
  }
  if (typeof worldEntityBox === 'function') { try { const b = worldEntityBox(F.cam, e); if (b && b.every(_wflNum)) return b; } catch (err) { /* own */ } }
  const d = _wflDims(e.obj), z = Math.max(0.05, e.z), y = _wflNum(e.y) ? e.y : _wflGround(F, e.x, z), p = _wflProj(F, e.x, z, y);
  const h = _wflNum(e.height) ? e.height : d.h, hw = d.l * p.k / 2;
  return [p.X - hw, p.Y - h * p.k, p.X + hw, p.Y];
}

/* ---------- the world index (surfaces, water, walking lines, solids) ---------- */
function _wflIndexOf(F) {
  if (F.ix) return F.ix;
  const W = F.world, surfs = (W.surfaces || []).filter(s => s && (Array.isArray(s.poly) || (Array.isArray(s.path) && s.width > 0)));
  const ix = { surfs, waters: [], walks: [], roads: [], solids: [], cell: 4, grid: new Map() };
  for (const s of surfs) {
    if (s.kind === 'water') ix.waters.push({ s, rings: _wflRings(s), calm: !(s.water === 'river' || s.water === 'sea' || s.hint === 'breezy' || s.flow), shallow: _wflNum(s.shallow) ? s.shallow : 0.5 });
    else if (_WFL_WALK.has(s.kind)) ix.walks.push(s);
    else if (s.kind === 'road' || s.kind === 'tramway') ix.roads.push(s);
  }
  for (const e of W.entities || []) _wflIndexEnt(ix, e);
  for (const b of W.buildings || []) if (b && Array.isArray(b.foot) && b.foot.length >= 3) _wflIndexEnt(ix, { foot: b.foot, solidity: 'solid', attach: 'ground', id: b.id });
  F.ix = ix;
  return ix;
}
function _wflIndexEnt(ix, e) {
  if (!e || !Array.isArray(e.foot) || e.foot.length < 3 || e.backdrop) return;
  const a = String(e.attach || '');
  if (/^(air|wall|deck)/.test(a)) return;
  const sol = e.solidity;
  if (sol !== 'solid' && sol !== 'walkable' && sol !== 'overhead') return;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of e.foot) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  const rec = { e, foot: e.foot, sol, box: [x0, z0, x1, z1] };
  ix.solids.push(rec);
  for (let i = Math.floor(x0 / ix.cell); i <= Math.floor(x1 / ix.cell); i++) for (let j = Math.floor(z0 / ix.cell); j <= Math.floor(z1 / ix.cell); j++) {
    const k = i + ',' + j; let c = ix.grid.get(k); if (!c) ix.grid.set(k, c = []); c.push(rec);
  }
}
/** Water boundary rings: a polygon's own ring (closed) or a centre line's two banks (open). */
function _wflRings(s) {
  if (Array.isArray(s.poly)) return [{ pts: s.poly, closed: true }];
  return [{ pts: _wflOffsetLine(s.path, -s.width / 2), closed: false }, { pts: _wflOffsetLine(s.path, s.width / 2), closed: false }];
}
/** The topmost surface at a ground point (the core's worldSurfaceAt when loaded: decks first, solids cut water). */
function _wflSurfAt(F, x, z) {
  if (typeof worldSurfaceAt === 'function') { try { return worldSurfaceAt(F.world, x, z); } catch (e) { /* own */ } }
  const S = _wflIndexOf(F).surfs;
  for (let i = S.length - 1; i >= 0; i--) if (_wflContains(S[i], x, z)) return S[i];
  return null;
}
/** The ground surface at a point from the fill's own index (no deck scan): for sampling the frame, where decks do not matter. */
function _wflSurfFast(F, x, z) {
  const S = _wflIndexOf(F).surfs;
  for (let i = S.length - 1; i >= 0; i--) if (_wflContains(S[i], x, z)) return S[i];
  return null;
}
/** The fill's probe (the core's worldPlaceProbe shape): sense's probe wins where it has a value. */
function _wflProbe(F, x, z) {
  const ix = _wflIndexOf(F), s = _wflSurfAt(F, x, z), kind = s ? s.kind : null;
  const p = { x, z, surface: s, surf: s, surfId: s ? s.id : null, kind, tags: null, waterDist: Infinity, bankDist: Infinity, pathDist: Infinity, walkDist: Infinity, calm: true, under: false };
  let inWater = null;
  for (const w of ix.waters) {
    const inside = _wflContains(w.s, x, z);
    for (const r of w.rings) {
      const n = _wflNear(r.pts, x, z, r.closed);
      if (n.d < p.bankDist) { p.bankDist = n.d; p.bankDir = n.dir; p.toWater = _wflDeg(Math.atan2(n.px - x, n.pz - z)); }
    }
    if (inside) { inWater = w; p.waterDist = 0; p.calm = w.calm; p.shallow = w.shallow; }
  }
  if (!inWater) p.waterDist = p.bankDist;
  for (const s2 of ix.walks) {
    if (Array.isArray(s2.path)) {
      const n = _wflNear(s2.path, x, z, false);
      if (n.d < p.pathDist) { p.pathDist = n.d; p.pathDir = n.dir; p.toPath = _wflDeg(Math.atan2(n.px - x, n.pz - z)); }
      p.walkDist = Math.min(p.walkDist, Math.max(0, n.d - s2.width / 2));
    } else if (Array.isArray(s2.poly)) {
      if (_wflInPoly(s2.poly, x, z)) p.walkDist = 0;
      else { const n = _wflNear(s2.poly, x, z, true); p.walkDist = Math.min(p.walkDist, n.d); if (!_wflNum(p.toPath) || n.d < (p._pd || Infinity)) { p._pd = n.d; p.toPath = _wflDeg(Math.atan2(n.px - x, n.pz - z)); p.pathDir = n.dir; } }
    }
  }
  for (const r of ix.roads) if (Array.isArray(r.path)) {
    const n = _wflNear(r.path, x, z, false);
    if (!_wflNum(p._rd) || n.d < p._rd) {
      p._rd = n.d; p.roadDir = n.dir; p.toRoad = _wflDeg(Math.atan2(n.px - x, n.pz - z));
      const tx = Math.sin(n.dir * Math.PI / 180), tz = Math.cos(n.dir * Math.PI / 180);
      p.roadSide = ((x - n.px) * tz - (z - n.pz) * tx) >= 0 ? 1 : -1;   // +1: right of the centre line looking along roadDir
    }
  }
  // overhead spans and footprints under the point
  const cell = ix.grid.get(Math.floor(x / ix.cell) + ',' + Math.floor(z / ix.cell)) || [];
  for (const rec of cell) if (rec.sol === 'overhead' && _wflInPoly(rec.foot, x, z)) p.under = true;
  // tags: the surface's, plus the distance tags (the core's probe adds the same)
  const tags = new Set(worldKbSurfaceTags(kind == null ? 'ground' : kind));
  if (!s && F.style && F.style.ground) for (const t of worldKbSurfaceTags(F.style.ground)) tags.add(t);
  if (inWater) { if (p.bankDist <= Math.max(0.3, inWater.shallow)) tags.add('water-margin'); }
  else if (p.waterDist <= 0.6) { tags.add('water-margin'); tags.add('wet'); tags.add('bank'); }
  else if (p.waterDist <= 2.5) tags.add('bank');
  if ((tags.has('grass') || tags.has('soil')) && p.walkDist > 0 && p.walkDist <= 1.5) tags.add('grass-edge');
  if (_WFL_WALK.has(kind) && p.pathDist < 0.6) tags.add('walkline');
  p.tags = [...tags];
  // sense's probe, when loaded, is the authority for what it knows
  if (typeof worldPlaceProbe === 'function') {
    try {
      const q = worldPlaceProbe(F.world, x, z);
      if (q && typeof q === 'object') {
        for (const k of Object.keys(q)) if (q[k] != null && !(typeof q[k] === 'number' && !Number.isFinite(q[k]))) p[k] = q[k];
        if (!Array.isArray(q.tags)) p.tags = [...tags];
        if (typeof q.surface === 'string') p.surfId = q.surface;
        p.surf = s;
        if (_wflNum(q.waterDist) && q.waterDist < 0) p.waterDist = 0;   // the core counts depth into the water below zero
      }
    } catch (e) { /* own probe */ }
  }
  return p;
}

/* ---------- placement ---------- */
/** Does a candidate circle (x, z, r) hit a solid or walkable footprint (P2)? */
function _wflHits(F, x, z, r, solidOnly) {
  const ix = _wflIndexOf(F), c = ix.cell, seen = new Set();
  for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++) for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++) {
    for (const rec of ix.grid.get(i + ',' + j) || []) {
      if (seen.has(rec)) continue; seen.add(rec);
      if (rec.sol === 'overhead' || (solidOnly && rec.sol !== 'solid')) continue;
      if (x + r < rec.box[0] || x - r > rec.box[2] || z + r < rec.box[1] || z - r > rec.box[3]) continue;
      if (_wflInPoly(rec.foot, x, z) || _wflNear(rec.foot, x, z, true).d < r + 0.05) return rec;
    }
  }
  return null;
}
/** The penetration depth of two convex polygons (separating axes), 0 when apart. */
function _wflPen(A, B) {
  let best = Infinity;
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], nx = -(b[1] - a[1]), nz = b[0] - a[0], L = Math.hypot(nx, nz);
    if (!L) continue;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const q of A) { const v = (q[0] * nx + q[1] * nz) / L; if (v < a0) a0 = v; if (v > a1) a1 = v; }
    for (const q of B) { const v = (q[0] * nx + q[1] * nz) / L; if (v < b0) b0 = v; if (v > b1) b1 = v; }
    const o = Math.min(a1, b1) - Math.max(a0, b0);
    if (o <= 0) return 0;
    if (o < best) best = o;
  }
  return best === Infinity ? 0 : best;
}
/** Does a candidate footprint polygon overlap a solid (or walkable) footprint (P2)? */
function _wflHitsPoly(F, poly, solidOnly) {
  const ix = _wflIndexOf(F), c = ix.cell, seen = new Set();
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) {
    for (const rec of ix.grid.get(i + ',' + j) || []) {
      if (seen.has(rec)) continue; seen.add(rec);
      if (rec.sol === 'overhead' || (solidOnly && rec.sol !== 'solid')) continue;
      if (x1 < rec.box[0] || x0 > rec.box[2] || z1 < rec.box[1] || z0 > rec.box[3]) continue;
      if (_wflPen(poly, rec.foot) > 0.03) return rec;
    }
  }
  return null;
}
/** Spacing between auto items (no stacked clones): a hash of the placed items' discs. */
function _wflSpacingOk(F, x, z, sp, obj) {
  const c = 2, out = F.spacing;
  for (let i = Math.floor((x - sp) / c); i <= Math.floor((x + sp) / c); i++) for (let j = Math.floor((z - sp) / c); j <= Math.floor((z + sp) / c); j++) {
    for (const q of out.get(i + ',' + j) || []) { const need = q.obj === obj ? Math.max(sp, q.sp) : Math.min(sp, q.sp) * 0.7; if (Math.hypot(q.x - x, q.z - z) < need) return false; }
  }
  return true;
}
function _wflSpacingAdd(F, x, z, sp, obj) { const k = Math.floor(x / 2) + ',' + Math.floor(z / 2); let c = F.spacing.get(k); if (!c) F.spacing.set(k, c = []); c.push({ x, z, sp, obj }); }
/** C1: a non-framing entity larger than 25 % of the frame may not be cut by the frame edge; nothing auto-placed is a giant. */
function _wflCut(F, b) {
  const area = Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
  if (area <= 0.25 * F.W * F.H) return false;
  return b[0] < 0 || b[2] > F.W || b[1] < 0 || b[3] > F.H;
}
/** The sky window (composition, bug 9 / 21): the middle 40 % of the frame width over the upper 70 % of the sky stays open of
    anything auto-placed (the gold proof's open sky over the subject; tall fill trees there make a corridor of crowns). */
const WORLD_SKY_WINDOW = Object.freeze({ x0: 0.35, x1: 0.65, top: 0.55 });
function _wflInSkyWindow(F, b) {
  const hz = F.cam.horizon;
  if (!(hz > 40)) return false;
  const X0 = WORLD_SKY_WINDOW.x0 * F.W, X1 = WORLD_SKY_WINDOW.x1 * F.W, Y1 = hz * WORLD_SKY_WINDOW.top;
  const w = Math.min(X1, b[2]) - Math.max(X0, b[0]), h = Math.min(Y1, b[3]) - Math.max(0, b[1]);
  return w > 0 && h > 0 && w * h > 0.01 * (X1 - X0) * Y1;
}
/** A coarse depth buffer of the frame (64 x 36 cells, the nearest depth that covers each), from the entities' boxes inset by a
    sixth (crowns have gaps): enough to tell an item nearer things hide completely. */
const _WFL_ZB_C = 64, _WFL_ZB_R = 36;
function _wflZInit(F) {
  F.zb = new Float32Array(_WFL_ZB_C * _WFL_ZB_R).fill(Infinity);
  for (const e of F.world.entities || []) {
    if (!e || !e.obj || !(e.z > 0) || e.backdrop) continue;
    const kb = worldKb(e.obj);
    if (kb) _wflZAdd(F, _wflBox(F, e), e.z, kb);
  }
}
function _wflZCells(F, b, inset) {
  const w = b[2] - b[0], h = b[3] - b[1], x0 = b[0] + w * inset, x1 = b[2] - w * inset, y0 = b[1] + h * inset, y1 = b[3] - h * inset * 0.3;
  return [Math.max(0, Math.ceil(x0 / F.W * _WFL_ZB_C - 0.5)), Math.min(_WFL_ZB_C - 1, Math.floor(x1 / F.W * _WFL_ZB_C - 0.5)),
    Math.max(0, Math.ceil(y0 / F.H * _WFL_ZB_R - 0.5)), Math.min(_WFL_ZB_R - 1, Math.floor(y1 / F.H * _WFL_ZB_R - 0.5))];
}
function _wflZAdd(F, b, z, kb) {
  if (!F.zb || !b || !b.every(_wflNum) || !kb || !(kb.size.h0 >= 1) || !['tree', 'building', 'hedge', 'shrub', 'structure', 'landmark', 'boat', 'reed'].includes(kb.cls)) return;
  const [c0, c1, r0, r1] = _wflZCells(F, b, kb.cls === 'tree' ? 1 / 6 : 0.05);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const k = r * _WFL_ZB_C + c; if (z < F.zb[k]) F.zb[k] = z; }
}
/** Is an item at depth z with screen box b hidden (>= 92 % of its in-frame cells behind something at least 1 m nearer)? */
function _wflHidden(F, b, z) {
  if (!F.zb) _wflZInit(F);
  const [c0, c1, r0, r1] = _wflZCells(F, b, 0);
  let n = 0, hid = 0;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { n++; if (F.zb[r * _WFL_ZB_C + c] < z - 1) hid++; }
  return n > 0 && hid / n >= 0.92;
}
/** P8: nothing auto-placed hides a declared landmark's main face (a coarse grid per landmark; at most 8 % of it, tufts at its foot). */
function _wflLandmarks(F) {
  const out = [];
  for (const e of F.world.entities || []) {
    if (!e || !e.landmark || !(e.z > 0)) continue;
    const b = _wflBox(F, e), cx0 = Math.max(0, b[0]), cx1 = Math.min(F.W, b[2]), cy0 = Math.max(0, b[1]), cy1 = Math.min(F.H, b[3]);
    if (!(cx1 > cx0 && cy1 > cy0)) continue;
    const zf = Array.isArray(e.foot) && e.foot.length ? Math.min(...e.foot.map(p => p[1])) : e.z;
    out.push({ id: e.id || e.obj, box: [cx0, cy0, cx1, cy1], zf, n: 16, m: 10, cov: new Uint8Array(160), used: 0 });
  }
  return out;
}
function _wflLandmarkCells(L, b) {
  // the main face: the landmark's box above its bottom row (the ground at its foot may carry low dressing)
  const out = [], cw = (L.box[2] - L.box[0]) / L.n, ch = (L.box[3] - L.box[1]) / L.m;
  for (let i = 0; i < L.n; i++) for (let j = 0; j < L.m - 1; j++) {
    const X = L.box[0] + (i + 0.5) * cw, Y = L.box[1] + (j + 0.5) * ch;
    if (X >= b[0] && X <= b[2] && Y >= b[1] && Y <= b[3] && !L.cov[i * L.m + j]) out.push(i * L.m + j);
  }
  return out;
}
function _wflHidesLandmark(F, b, z) {
  for (const L of F.landmarks) {
    if (!(z < L.zf)) continue;
    const add = _wflLandmarkCells(L, b);
    if (add.length && (L.used + add.length) / (L.n * (L.m - 1)) > 0.08) return L.id;
  }
  return null;
}
function _wflLandmarkMark(F, b, z) { for (const L of F.landmarks) if (z < L.zf) for (const c of _wflLandmarkCells(L, b)) { L.cov[c] = 1; L.used++; } }
/** The world footprint of a descriptor at (x, z) with facing (the core's convention: length along the facing). */
function _wflFoot(kb, x, z, facing) {
  const f = (_wflNum(facing) ? facing : 90) * Math.PI / 180, hx = Math.sin(f), hz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f);
  if (kb.foot !== 'box') { const out = [], r = kb.r || 0.2; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; out.push([_wflR2(x + r * Math.cos(a)), _wflR2(z + r * Math.sin(a))]); } return out; }
  // front classes (benches, buildings, stalls, signs) look along their facing: their length lies across it
  const front = ['path', 'view', 'street'].includes(kb.orient);
  const L = ((front ? kb.size.w : kb.size.l) || 1) / 2, Wd = ((front ? kb.size.l : kb.size.w) || 0.5) / 2;
  return [[-L, -Wd], [L, -Wd], [L, Wd], [-L, Wd]].map(([u, v]) => [_wflR2(x + u * hx + v * rx), _wflR2(z + u * hz + v * rz)]);
}
/** Build the entity record when sense is not loaded (the core's entity shape, 1.2). */
function _wflMake(F, c, kb, probe) {
  const info = typeof worldObjectInfo === 'function' ? worldObjectInfo(c.obj) : null;
  const attach = c.attach || (probe && probe.kind === 'water' && kb.floats ? 'water' : 'ground');
  let y = _wflGround(F, c.x, c.z), waterline = null;
  if (attach === 'water') { const s = probe && probe.surf; const lvl = s && _wflNum(s.level) ? s.level : (_wflNum(F.cam.water) ? F.cam.water : 0); waterline = lvl; y = lvl - (kb.sink || 0); }
  else if (attach === 'air') y += _wflNum(c.y) ? c.y : 0;
  const facing = _wflNum(c.facing) ? c.facing : 90;
  const solidity = info && info.solidity && kb.solidity !== 'water' ? info.solidity : kb.solidity;
  return { id: c.id, obj: c.obj, cls: info ? info.cls : kb.coreCls, kbCls: kb.cls, variant: c.variant == null ? null : c.variant, x: _wflR2(c.x), z: _wflR2(c.z), y: _wflR2(y), facing,
    foot: _wflFoot(kb, c.x, c.z, facing), r: kb.r, height: kb.size.h0, size: { w: kb.size.l, d: kb.size.w, h: kb.size.h0 }, solidity, attach, host: null, deck: null,
    waterline: waterline == null ? null : _wflR2(waterline), lights: null, static: true, seasonal: kb.seasonal, blocks: false, framed: false,
    auto: c.auto, framing: !!c.framing, parent: c.parent || null, pit: !!c.pit };
}
/**
 * Try one auto entity. c: { obj, x, z, facing?, variant?, auto, why, rule, attach?, y?, parent?, framing?, pit?, any? (skip spacing) }.
 * Returns the entity or null. Every check is the engine's own (K1, K7, K9, P2, P3, C1, P8); sense's worldPlaceAdd has the last word.
 */
function _wflTry(F, c) {
  if (F.count >= F.maxAuto) return null;
  const kb = worldKb(c.obj);
  if (!kb || !(c.z > 0.5) || !_wflNum(c.x)) return null;
  if (F.bad.has(c.obj)) return null;
  if (!kb.care.ok || !worldKbRegionOk(kb, F.world.place).ok) { F.bad.add(c.obj); return null; }
  const air = c.attach === 'air';
  // K6 things that come and go (flowers, lilies, leaf litter) only where the renderer hides them out of season
  if (!F.seasonal && kb.when && (kb.when.months || kb.when.dates || kb.when.weather)) return null;
  // C1, P8 (on screen)
  const ent0 = { obj: c.obj, x: c.x, z: c.z, y: air ? _wflGround(F, c.x, c.z) + (c.y || 0) : undefined, height: kb.size.h0 };
  const b = _wflBox(F, ent0);
  if (!c.framing && _wflCut(F, b)) return null;
  if (_wflHidesLandmark(F, b, c.z)) return null;
  // composition (15 Oct audit, bugs 9 and 21): nothing auto-placed closes the sky window over the subject, and nothing is added
  // where nearer things already hide it (a hidden tree costs a draw and an occluder redraw every frame and adds nothing)
  if (!c.framing && _wflInSkyWindow(F, b)) { F.skyRefused = (F.skyRefused || 0) + 1; return null; }
  if (!c.framing && c.auto === 'fill' && c.z < 80 && _wflHidden(F, b, c.z)) { F.hiddenRefused = (F.hiddenRefused || 0) + 1; return null; }
  // spacing: no stacked clones; a 'single' (a log, a boulder, a bench) keeps its group gap from its own kind
  const G = kb.group || {}, sp = c.any ? 0 : Math.max(0.18, 0.42 * Math.min(kb.size.l || 0.5, 3) * (F.tier >= 3 ? 0.75 : 1), G.kind === 'single' && _wflNum(G.gap) ? Math.min(G.gap, 12) : 0);
  if (sp && !_wflSpacingOk(F, c.x, c.z, sp, c.obj)) return null;
  // K1 habitat (the whole footprint of a long thing), P3 walking lines, P2 footprints
  let probe = null;
  if (!air) {
    probe = _wflProbe(F, c.x, c.z);
    const hp = c.pit ? Object.assign({}, probe, { pit: true }) : probe;
    if (!worldKbHabitatOk(kb, hp).ok) return null;
    if (kb.foot === 'box' && (kb.size.l > 1.2 || kb.size.w > 1.2)) {
      const corners = _wflFoot(kb, c.x, c.z, c.facing).map(q => { const pq = _wflProbe(F, q[0], q[1]); return c.pit ? Object.assign(pq, { pit: true }) : pq; });
      if (!worldKbHabitatOk(kb, corners).ok) return null;
    }
    if (_wflNum(probe.pathDist) && probe.pathDist < 0.6 + (kb.r || 0.1) + 0.05) return null;
    if (probe.surfId && F.lived.has(probe.surfId) && _WFL_WALK.has(probe.kind)) return null;
    const r = kb.solidity === 'solid' ? (kb.r || 0.2) + (kb.clearance || 0) * 0.5 : Math.min(kb.r || 0.2, 0.3);
    if (_wflHits(F, c.x, c.z, r, false)) return null;
    // a long solid (a hedge, a log, a bench, a planter): its whole footprint, not just a disc round its anchor
    if (kb.solidity === 'solid' && kb.foot === 'box' && _wflHitsPoly(F, _wflFoot(kb, c.x, c.z, c.facing), false)) return null;
    if (probe.under && kb.size.h0 > 2.5) return null;
  }
  // through sense when loaded (its log lists the entity), else built here and logged
  const id = c.id || _wflId(F, c.auto);
  const spec = { id, obj: c.obj, at: [_wflR2(c.x), _wflR2(c.z)], x: _wflR2(c.x), z: _wflR2(c.z), auto: c.auto,
    variant: c.variant == null ? worldKbVariant(kb, F.world.place, F.r, { ctx: F.ctx }) : c.variant };
  if (_wflNum(c.facing)) spec.facing = _wflR2(c.facing);   // else the solver orients it (K3)
  if (air) { spec.attach = 'air'; spec.y = _wflR2(c.y || 0); }
  else if (probe && probe.kind === 'water' && kb.floats) spec.attach = 'water';
  if (c.parent) spec.parent = c.parent;
  if (c.framing) { spec.framing = true; spec.framed = true; }
  if (c.pit) spec.pit = true;
  let ent = null;
  if (typeof worldPlaceAdd === 'function') {
    const action = c.auto === 'edge' ? 'dress' : c.auto === 'frame' ? 'frame' : 'fill';
    try { ent = worldPlaceAdd(F.world, spec, { action, rule: c.rule || 'P6', reason: c.why || 'auto-placed', by: 'kb', snap: !c.exact }); } catch (e) { ent = null; }
    if (!ent) return null;
    if (!ent.auto) ent.auto = c.auto;
    if (c.framing) ent.framing = true;
    if (c.parent && !ent.parent) ent.parent = c.parent;
    if (c.parentOff) ent.parentOff = true;
    if (Array.isArray(F.world.entities) && !F.world.entities.includes(ent) && !F.world.entities.some(q => q && q.id === ent.id)) F.world.entities.push(ent);
  } else {
    ent = _wflMake(F, Object.assign({}, c, spec, { facing: _wflNum(spec.facing) ? spec.facing : 90 }), kb, probe);
    if (c.parentOff) ent.parentOff = true;
    F.world.entities.push(ent);
    _wflLog(F, { id, obj: c.obj, action: c.auto === 'edge' ? 'dress' : c.auto === 'frame' ? 'frame' : 'fill', rule: c.rule || 'P6', reason: c.why || '', to: [ent.x, ent.z] });
  }
  F.ids.add(ent.id || id);
  F.count++;
  F.added.push(ent);
  if (sp) _wflSpacingAdd(F, ent.x, ent.z, sp, c.obj);
  _wflIndexEnt(_wflIndexOf(F), ent);
  _wflLandmarkMark(F, b, c.z);
  _wflZAdd(F, b, ent.z, kb);
  if (F.boxes) F.boxes.push(b);
  return ent;
}
function _wflId(F, auto) { let id; do { id = `${auto || 'fill'}-${F.seq++}`; } while (F.ids.has(id)); return id; }
/** A clump of 1..n members of one object round (x, z) (K5: clumps with gaps, stands; never rows). */
function _wflClump(F, obj, x, z, n, spread, c) {
  const kb = worldKb(obj); if (!kb) return [];
  const out = [], r = F.r, l = kb.size.l || 0.5;
  for (let i = 0, tries = 0; i < n && tries < n * 4; tries++) {
    const a = r() * Math.PI * 2, d = i === 0 ? 0 : spread * Math.sqrt(-2 * Math.log(Math.max(1e-6, r()))) * 0.55;
    const xx = x + Math.cos(a) * d, zz = z + Math.sin(a) * d * 1.2;
    const e = _wflTry(F, Object.assign({}, c, { obj, x: xx, z: zz, facing: c && _wflNum(c.facing) ? c.facing : (r() < 0.5 ? 90 : 270) }));
    if (e) { out.push(e); i++; } else if (i === 0) return out;
  }
  return out.length ? out : [];
}

/* ---------- sampling the frame (the coverage rules of look's worldCoverage) ---------- */
function _wflLived(world) { const s = new Set(); for (const p of world.life || []) if (p && p.on) s.add(p.on); return s; }
/** Perennial entities: present at every date (no K6 `when`), so coverage holds all year. */
function _wflPerennial(e) { if (!e || !e.obj) return false; const kb = worldKb(e.obj); return !kb || !kb.when || (!kb.when.months && !kb.when.dates && !kb.when.weather); }
/**
 * Sample the frame below the horizon: { samples: [{ X, Y, x, z, band, surf, dressed, by }], bare, sky }. Entities cover by their
 * screen boxes; water, reeds, beds, hedges, weirs and rails dress themselves; lived surfaces are dressed by their life.
 */
function _wflSample(world, cam, o) {
  o = o || {};
  const W = o.W || 1600, H = o.H || 900, cols = o.cols || 64, rows = o.rows || 36, top = Math.max(0, cam.horizon), pad = o.pad || 0;
  const res = { samples: [], bare: 0, n: 0, rows, cols, top, W, H, colW: (W + 2 * pad) / cols, rowH: (H - top) / rows };
  if (top >= H) return res;
  const ents = (o.ents || world.entities || []).filter(e => e && e.obj && e.z > 0 && !(o.filter && !o.filter(e)));
  const bd = o.backdrop || [];
  const fake = { cam, world, W, H };
  const byCol = Array.from({ length: cols }, () => []);
  const X0 = -pad, X1 = W + pad, colW = (X1 - X0) / cols;
  for (const e of ents.concat(bd)) {
    const b = _wflBox(fake, e);
    if (b[2] < X0 || b[0] > X1 || b[3] < top) continue;
    const c0 = Math.max(0, Math.floor((b[0] - X0) / colW)), c1 = Math.min(cols - 1, Math.floor((b[2] - X0) / colW));
    for (let c = c0; c <= c1; c++) byCol[c].push({ b, e });
  }
  const lived = _wflLived(world), ground = o.ground;
  for (let r = 0; r < rows; r++) {
    const Y = top + (r + 0.5) * (H - top) / rows, band = r < rows / 3 ? 'far' : r < 2 * rows / 3 ? 'mid' : 'near';
    for (let c = 0; c < cols; c++) {
      const X = X0 + (c + 0.5) * colW;
      let by = null;   // the nearest entity whose box covers the sample: what the eye sees there
      for (const q of byCol[c]) if (X >= q.b[0] && X <= q.b[2] && Y >= q.b[1] && Y <= q.b[3] && (!by || q.e.z < by.z)) by = q.e;
      const g = _wflUnproject(cam, X, Y);
      let surf = null, dressed = !!by;
      if (g) {
        surf = o.surfAt ? o.surfAt(g.x, g.d) : null;
        // the one surface rule of C6 (look's worldSurfaceDressed: sunk channel walls and broad near paving are bare)
        if (!dressed && surf && (typeof worldSurfaceDressed === 'function' ? worldSurfaceDressed(world, cam, surf, X, Y, g, lived) === true : (_WFL_DRESSED.has(surf.kind) || lived.has(surf.id)))) dressed = true;
        else if (!dressed && !surf && ground && Y - cam.horizon < 1.5) dressed = true;
      }
      res.samples.push({ X, Y, x: g ? g.x : null, z: g ? g.d : null, band, surf, dressed, by, inFrame: X >= 0 && X <= W });
      if (X >= 0 && X <= W) { res.n++; if (!dressed) res.bare++; }
    }
  }
  res.bare = res.n ? res.bare / res.n : 0;
  return res;
}
function _wflBackdrop(world, cam) {
  if (typeof worldBackdrop !== 'function' || !world.backdrop) return [];
  try { return worldBackdrop(world, cam, world.season) || []; } catch (e) { return []; }
}
/** The official coverage (look's worldCoverage) over the perennial entities; the fill's own sampler without look. */
function _wflCoverage(F) {
  const world = F.world, view = Object.assign({}, world, { entities: (world.entities || []).filter(_wflPerennial) }), bd = _wflBackdrop(view, F.cam);
  if (typeof worldCoverage === 'function') {
    try { const r = worldCoverage(view, F.cam, { backdrop: bd, W: F.W, H: F.H }); if (r && _wflNum(r.bare)) return { bare: r.bare, sky: _wflNum(r.sky) ? r.sky : 0, ok: !!r.ok, regions: r.regions || [], by: 'look' }; } catch (e) { /* own */ }
  }
  const s = _wflSample(view, F.cam, { W: F.W, H: F.H, backdrop: bd, surfAt: (x, z) => _wflSurfFast(F, x, z), ground: true });
  return { bare: Math.round(s.bare * 1000) / 1000, sky: 0, ok: s.bare <= 0.15, regions: [], by: 'kb' };
}

/* ---------- P7: richness ---------- */
const _WFL_VTARGET = { near: 4, mid: 5, far: 4 };
/** What the richness tier may add at most (bug 21: the canal had 122 tier trees, most of them hidden or crowding the sky). */
const WORLD_RICH_BUDGET = Object.freeze({ items: 300, trees: 120 });
/**
 * The richness of a world through a camera (P7): per frame band (the thirds of the frame below the horizon: far, mid, near) the
 * covered share and the variety (distinct objects, self-dressed surface kinds and life populations seen there), and a score
 * 0..100 (near 40 %, mid 35 %, far 25 %; each band 60 % cover, 40 % variety). o: { perennial (only entities present all year),
 * floor ({ score } to beat, e.g. a converted scene's source score), W, H, cols, rows, backdrop }. The tools' critic uses this.
 */
function worldRichness(world, cam, o) {
  const empty = { near: { cover: 0, variety: 0 }, mid: { cover: 0, variety: 0 }, far: { cover: 0, variety: 0 }, score: 0, bare: 1, ok: false };
  try {
    o = o || {};
    cam = cam || (world && world.cam);
    if (!world || !cam) return empty;
    const view = o.perennial ? Object.assign({}, world, { entities: (world.entities || []).filter(_wflPerennial) }) : world;
    const bd = o.backdrop || _wflBackdrop(view, cam), F = { world: view, cam, ix: null };
    const s = _wflSample(view, cam, { W: o.W || 1600, H: o.H || 900, cols: o.cols || 48, rows: o.rows || 30, backdrop: bd, surfAt: (x, z) => _wflSurfFast(F, x, z), ground: true });
    const lived = new Map(); for (const p of world.life || []) if (p && p.on) { const k = lived.get(p.on) || []; k.push(String(p.who)); lived.set(p.on, k); }
    const out = { near: null, mid: null, far: null, score: 0, bare: Math.round(s.bare * 1000) / 1000 };
    let score = 0;
    for (const band of ['near', 'mid', 'far']) {
      const B = s.samples.filter(q => q.band === band && q.inFrame), kinds = new Set();
      let cov = 0;
      for (const q of B) {
        if (q.dressed) cov++;
        if (q.by) kinds.add(q.by.obj);
        else if (q.surf && _WFL_DRESSED.has(q.surf.kind)) kinds.add('surface:' + q.surf.kind);
        if (q.surf && lived.has(q.surf.id)) for (const w of lived.get(q.surf.id)) kinds.add('life:' + w);
      }
      const cover = B.length ? cov / B.length : 1, variety = kinds.size;
      out[band] = { cover: Math.round(cover * 1000) / 1000, variety };
      score += ({ near: 0.4, mid: 0.35, far: 0.25 })[band] * (0.6 * cover + 0.4 * Math.min(1, variety / _WFL_VTARGET[band]));
    }
    out.score = Math.round(score * 100);
    const fl = WORLD_RICHNESS_FLOOR, want = Math.max(fl.score, o.floor && _wflNum(o.floor.score) ? o.floor.score : 0);
    out.ok = out.score >= want && ['near', 'mid', 'far'].every(b => out[b].cover >= fl[b].cover && out[b].variety >= fl[b].variety);
    out.floor = want;
    if (o.box === false) return out;
    const box = _wflBoxScore(view, cam, { W: o.W, H: o.H, backdrop: bd });
    // one gate (bug 9: the band measure said 100 while the box measure said 67): ok needs the box measure's target as well
    let kind = 'park'; try { kind = (WORLD_FILL_STYLES[worldFillStyle(world, { style: world.style })] || {}).place || 'park'; } catch (e) { /* park */ }
    const boxTarget = Math.max(fl.gate[kind] || fl.gate.park, o.floor && _wflNum(o.floor.box) ? o.floor.box : 0);
    out.ok = out.ok && box.score >= boxTarget;
    out.boxTarget = boxTarget;
    out.box = { near: { cover: box.near.cover, variety: box.near.variety, n: box.near.n }, mid: { cover: box.mid.cover, variety: box.mid.variety, n: box.mid.n },
      far: { cover: box.far.cover, variety: box.far.variety, n: box.far.n }, score: box.score };
    return out;
  } catch (e) { return empty; }
}

/* ---------- the style ---------- */
/**
 * The fill style of a world: the place's own style (place.style, or o.style when it is not just the backdrop's), else what its
 * surfaces say (a city or town backdrop with paving, heath, fields, a canal, a pond or lake, the sea), else the backdrop style,
 * else 'park'.
 */
function worldFillStyle(world, o) {
  try {
    const bd = world && world.backdrop && world.backdrop.style, ps = world && world.place && world.place.style;
    const own = ps || (o && o.style && o.style !== bd ? o.style : null);
    if (own && WORLD_FILL_STYLES[own]) return own;
    const S = (world && world.surfaces) || [], has = k => S.some(s => s && s.kind === k), water = S.find(s => s && s.kind === 'water');
    const urban = has('road') || has('pavement') || has('plaza') || has('tramway');
    if (urban) return bd && WORLD_FILL_STYLES[bd] && WORLD_FILL_STYLES[bd].place !== 'rural' && bd !== 'canal-wooded' ? bd : S.filter(s => ['pavement', 'plaza', 'road'].includes(s.kind)).length >= 3 ? 'city-victorian' : 'town-low';
    if (has('heath')) return 'heath';
    if (has('field')) return bd === 'downs' ? 'downs' : 'farmland';
    if (water && (water.water === 'sea' || water.water === 'harbour')) return 'coast';
    if (water && (water.water === 'canal' || water.water === 'river')) return bd === 'woodland' ? 'woodland' : 'canal-wooded';
    if (water) return 'pond';
    if (has('wood')) return 'woodland';
    return bd && WORLD_FILL_STYLES[bd] ? bd : 'park';
  } catch (e) { return 'park'; }
}

/* ---------- P5: edge dressing ---------- */
function _wflVisible(F, x, z, margin) {
  if (!(z > F.cam.dMin * 0.85) || z > _WFL_EDGE_ZMAX) return false;
  const xa = _wflXAt(F.cam, -F.pad, z) - (margin || 2), xb = _wflXAt(F.cam, F.W + F.pad, z) + (margin || 2);
  return x >= xa && x <= xb;
}
/** Walk a polyline in steps that grow with depth; fn(point, dir, normal(right), s). */
function _wflWalk(pts, closed, fn) {
  const n = pts.length, m = closed ? n : n - 1;
  let s = 0;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    if (!(L > 0)) continue;
    const tx = dx / L, tz = dz / L;
    for (let t = 0; t < L;) {
      const x = a[0] + tx * t, z = a[1] + tz * t, step = Math.max(0.35, Math.min(4, 0.022 * Math.max(1, z)));
      fn([x, z], [tx, tz], [tz, -tx], s + t, step);
      t += step;
    }
    s += L;
  }
}
/**
 * A hedge surface is a hedge (P5, 1.4): its whole visible length gets library hedge sections end to end (seeded jitter, never a
 * grid), except where a hedge-class thing already stands on it (an author's brambles dress their own stretch, never the whole
 * line: before, one bramble on a 400 m hedge left the rest of it as bare ground, 15 Oct audit bug 9). Through sense
 * (worldPlaceAdd: habitat, overlap, walking lines, the near band) so a section never lands where the solver would refuse it.
 */
function _wflHedges(F) {
  const ix = _wflIndexOf(F), r = _wflRng('hedge|' + (F.world.seed | 0)), cam = F.cam, before = F.count;
  for (const s of ix.surfs) {
    if (s.kind !== 'hedge' || s.open === true || !Array.isArray(s.path) || s.path.length < 2) continue;
    const obj = s.obj && worldKb(s.obj) ? s.obj : 'plant.towpath-hedge', kb = worldKb(obj);
    if (!kb) continue;
    const L = kb.size.l || 3, D = kb.size.w || 1.2;
    let n = 0;
    for (let i = 1; i < s.path.length; i++) {
      const a = s.path[i - 1], b = s.path[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!(len > 0.01)) continue;
      const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, facing = (_wflDeg(Math.atan2(ux, uz)) + 360) % 360;
      for (let u = L / 2 + r() * 0.3; u < len; u += L + 0.08 + r() * 0.35) {
        const off = (r() - 0.5) * Math.max(0, (s.width || 1.2) - D) * 0.6, x = a[0] + ux * u - uz * off, z = a[1] + uz * u + ux * off;
        if (!(z > cam.dMin * 0.85) || z > _WFL_FILL_ZMAX) continue;
        const xa = _wflXAt(cam, -F.pad, z) - L, xb = _wflXAt(cam, F.W + F.pad, z) + L;
        if (x < xa || x > xb) continue;
        // an author's hedge-class thing (a bramble, a holly) already stands on this stretch
        const hit = _wflHits(F, x, z, L * 0.45, true);
        if (hit && hit.e && (worldKb(hit.e.obj) || {}).cls === 'hedge') continue;
        const spec = { obj, at: [_wflR2(x), _wflR2(z)], facing: _wflR2(facing), variant: worldKbVariant(kb, F.world.place, F.r, { ctx: F.ctx }), auto: 'edge' };
        let ent = null;
        if (typeof worldPlaceAdd === 'function') { try { ent = worldPlaceAdd(F.world, spec, { action: 'dress', rule: 'P5', reason: `hedge surface ${s.id}: a section of its hedge`, by: 'kb', snap: false, log: false }); } catch (e) { ent = null; } }
        else ent = _wflMake(F, Object.assign({ id: _wflId(F, 'edge'), x, z, auto: 'edge' }, spec), kb, null), F.world.entities.push(ent);
        if (!ent) continue;
        ent.on = s.id;
        F.count++; F.added.push(ent); F.ids.add(ent.id); n++;
        _wflIndexEnt(ix, ent);
        if (F.zb) _wflZAdd(F, _wflBox(F, ent), ent.z, kb);
      }
    }
    if (n) _wflLog(F, { id: s.id, obj, action: 'dress', rule: 'P5', reason: `hedge surface ${s.id} laid with ${n} sections of ${obj} (stretches an author's hedge-class things dress are kept)` });
  }
  return F.count - before;
}
function _wflEdges(F) {
  const E = F.style.edges || {}, ix = _wflIndexOf(F), r = F.r, before = F.count;
  _wflHedges(F);
  // water banks by water kind: reed stands with gaps in the margin and bank planting (natural), coping lines (urban)
  for (const w of ix.waters) {
    const mode = (E.water || {})[w.s.water] || 'natural';
    if (mode === 'none') continue;
    for (const ring of w.rings) {
      let state = r() < 0.5 ? 'gap' : 'stand', left = 1 + r() * 4, hard = [], stObj = _wflPick(E.natural.margin, r);
      const flush = () => { if (hard.length >= 2) _wflLine(F, 'coping', hard, w.s.id); hard = []; };
      _wflWalk(ring.pts, ring.closed, (p, t, nr, s, step) => {
        // the outward normal: the side of the boundary that is not this water
        const o1 = [p[0] + nr[0] * 0.6, p[1] + nr[1] * 0.6], out = _wflContains(w.s, o1[0], o1[1]) ? [-nr[0], -nr[1]] : nr;
        if (!_wflVisible(F, p[0], p[1], 4)) { flush(); return; }
        const land = _wflProbe(F, p[0] + out[0] * 1.2, p[1] + out[1] * 1.2);
        if (land.kind === 'water' || land.kind === 'weir') { flush(); return; }
        const hardBank = mode === 'urban' || _WFL_WALK.has(land.kind) || (land.tags || []).includes('paving') || land.walkDist <= 1.0 || !!_wflHits(F, p[0] + out[0] * 1.2, p[1] + out[1] * 1.2, 0.3, true);
        if (hardBank) { if (mode === 'urban' && E.kerb !== false) hard.push([_wflR2(p[0]), _wflR2(p[1])]); else flush(); return; }
        flush();
        left -= step;
        if (left <= 0) { state = state === 'stand' ? 'gap' : 'stand'; left = state === 'stand' ? 2 + r() * 4.5 : 1.5 + r() * 8 * (1 - (E.natural.stands || 0.5)); if (state === 'stand') stObj = _wflPick(E.natural.margin, r); }
        // the author's reeds already dress this stretch
        if (state === 'stand' && !F.authorReeds.some(q => Math.hypot(q.x - p[0], q.z - p[1]) < 2.5)) {
          const per = Math.max(1, Math.round(step / Math.max(0.35, 0.012 * p[1])));
          for (let k = 0; k < per; k++) {
            const along = (r() - 0.5) * step, inn = 0.1 + r() * Math.min(0.85, Math.max(0.3, w.shallow) + 0.1), obj = r() < 0.8 ? stObj : _wflPick(E.natural.margin, r);
            _wflTry(F, { obj, x: p[0] + t[0] * along - out[0] * inn, z: p[1] + t[1] * along - out[1] * inn, auto: 'edge', rule: 'P5', why: `${w.s.water || 'water'} bank: reed stand` });
          }
        }
        if (r() < (state === 'gap' ? 0.4 : 0.2)) {
          const off = 0.35 + r() * 1.3, obj = _wflPick(E.natural.bank, r);
          _wflTry(F, { obj, x: p[0] + out[0] * off + t[0] * (r() - 0.5) * step, z: p[1] + out[1] * off + t[1] * (r() - 0.5) * step, auto: 'edge', rule: 'P5', why: `${w.s.water || 'water'} bank planting` });
        }
      });
      flush();
    }
  }
  // paths get verges (tussocks in clumps along both sides where the ground beside is grass or soil)
  if (Array.isArray(E.verge) && E.verge.length) for (const s of ix.walks) {
    if (!Array.isArray(s.path) || !(s.width > 0) || s.kind === 'boardwalk' || s.kind === 'bridge-deck' || s.kind === 'deck') continue;
    for (const side of [-1, 1]) {
      const share = _wflNum(E.vergeShare) ? E.vergeShare : 0.6;
      let on = r() < share, left = 1 + r() * 3;
      _wflWalk(s.path, false, (p, t, nr, si, step) => {
        if (!_wflVisible(F, p[0], p[1], 2)) return;
        left -= step;
        if (left <= 0) { on = !on; left = on ? (1 + r() * 3.5) * share / 0.6 : (0.8 + r() * 4) * 0.6 / share; }
        if (!on || r() < 0.4) return;
        const off = s.width / 2 + 0.15 + r() * 0.75;
        _wflTry(F, { obj: _wflPick(E.verge, r), x: p[0] + side * nr[0] * off + t[0] * (r() - 0.5) * step, z: p[1] + side * nr[1] * off + t[1] * (r() - 0.5) * step, auto: 'edge', rule: 'P5', why: `${s.kind} verge` });
      });
    }
  }
  // roads get kerbs (linear features for the extruder) and, in towns, pavements where none runs beside them
  for (const s of ix.roads) {
    if (!Array.isArray(s.path) || !(s.width > 0)) continue;
    for (const side of [-1, 1]) {
      const kerb = _wflOffsetLine(s.path, side * s.width / 2);
      if (E.kerb !== false) _wflLine(F, 'kerb', kerb, s.id);
      if (!E.pavement) continue;
      const pave = _wflOffsetLine(s.path, side * (s.width / 2 + 1.1)), base = s.id + '-pave' + (side < 0 ? 'L' : 'R');
      if ((F.world.surfaces || []).some(q => q && typeof q.id === 'string' && q.id.startsWith(base))) continue;
      // sampled every 0.75 m; a pavement is laid only where it is free: never through a solid (a building, a wall: whatever
      // stands there was authored first and must not end up on an invented walking line), nor over water, roads or other walks.
      // The free stretches of 8 m or more become pavements of their own.
      const pts = [];
      for (let i = 1; i < pave.length; i++) {
        const a = pave[i - 1], b = pave[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.75));
        for (let k = i === 1 ? 0 : 1; k <= n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
      }
      const ok = (q) => { const pr = _wflProbe(F, q[0], q[1]); return !_WFL_WALK.has(pr.kind) && pr.kind !== 'water' && pr.kind !== 'road' && !_wflHits(F, q[0], q[1], 1.05, true); };
      const runs = [];
      let cur = [];
      for (const q of pts) { if (ok(q)) cur.push(q); else { if (cur.length) runs.push(cur); cur = []; } }
      if (cur.length) runs.push(cur);
      const long = runs.filter(r => r.length >= 2 && _wflR2(r.reduce((L, q, i) => i ? L + Math.hypot(q[0] - r[i - 1][0], q[1] - r[i - 1][1]) : 0, 0)) >= 8);
      long.forEach((r, k) => {
        const ps = { id: base + (long.length > 1 ? '-' + (k + 1) : ''), kind: 'pavement', layer: 'walk', path: r.filter((q, i) => i % 4 === 0 || i === r.length - 1).map(q => [_wflR2(q[0]), _wflR2(q[1])]), width: 2.0, auto: 'edge' };
        F.world.surfaces.push(ps);
        F.ix = null; _wflIndexOf(F);
        _wflLog(F, { id: ps.id, action: 'dress', rule: 'P5', reason: `a pavement beside road ${s.id}${long.length > 1 || runs.length > 1 ? ' (only where it is free of solids, water and other walks)' : ''}` });
      });
    }
  }
  // walls and fences get bases (tufts on the camera side); fields get hedgerows where no boundary runs
  if (Array.isArray(E.wallBase) && E.wallBase.length) {
    const walls = (F.world.entities || []).filter(e => e && !e.auto && Array.isArray(e.foot) && (e.cls === 'fence' || e.cls === 'building' || (worldKb(e.obj) || {}).cls === 'fence') && e.z < 80)
      .concat((F.world.buildings || []).filter(b => b && Array.isArray(b.foot) && b.foot.length >= 3 && Math.min(...b.foot.map(p => p[1])) < 80));
    for (const e of walls) {
      const P = e.foot; let best = null;
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], mz = (a[1] + b[1]) / 2; if (!best || mz < best.mz) best = { a, b, mz }; }
      if (!best) continue;
      const L = Math.hypot(best.b[0] - best.a[0], best.b[1] - best.a[1]), n = Math.min(10, Math.max(1, Math.round(L / 2.5)));
      for (let k = 0; k < n; k++) if (r() < 0.55) {
        const t = (k + r()) / n, x = best.a[0] + (best.b[0] - best.a[0]) * t, z = best.a[1] + (best.b[1] - best.a[1]) * t - 0.25 - r() * 0.3;
        _wflTry(F, { obj: _wflPick(E.wallBase, r), x, z, auto: 'edge', rule: 'P5', why: 'wall base' });
      }
    }
    for (const L of F.world.lines || []) if (L && (L.kind === 'wall' || L.kind === 'fence') && Array.isArray(L.path) && !L.auto) {
      _wflWalk(L.path, false, (p, t, nr, s, step) => { if (_wflVisible(F, p[0], p[1], 1) && r() < 0.35) _wflTry(F, { obj: _wflPick(E.wallBase, r), x: p[0] - Math.abs(nr[0]) * 0, z: p[1] - 0.35, auto: 'edge', rule: 'P5', why: 'wall base' }); });
    }
  }
  if (Array.isArray(E.hedgerow) && E.hedgerow.length) for (const s of ix.surfs) {
    if (s.kind !== 'field' || !Array.isArray(s.poly)) continue;
    let on = true, left = 3 + r() * 6;
    _wflWalk(s.poly, true, (p, t, nr, si, step) => {
      if (!_wflVisible(F, p[0], p[1], 3)) return;
      const o1 = [p[0] + nr[0] * 0.8, p[1] + nr[1] * 0.8], out = _wflContains(s, o1[0], o1[1]) ? [-nr[0], -nr[1]] : nr, pr = _wflProbe(F, p[0] + out[0] * 1.5, p[1] + out[1] * 1.5);
      if (pr.kind === 'field' || pr.kind === 'hedge' || pr.kind === 'water') return;
      if ((F.world.lines || []).some(L => L && /hedge|wall|fence/.test(L.kind) && Array.isArray(L.path) && _wflNear(L.path, p[0], p[1], false).d < 1.5)) return;
      left -= step;
      if (left <= 0) { on = !on; left = on ? 4 + r() * 10 : 1 + r() * 3; }
      if (on) _wflTry(F, { obj: _wflPick(E.hedgerow, r), x: p[0] - out[0] * 0.5, z: p[1] - out[1] * 0.5, facing: _wflDeg(Math.atan2(t[0], t[1])), auto: 'edge', rule: 'P5', why: 'field hedgerow' });
    });
  }
  if (F.count > before) _wflLog(F, { action: 'dress', rule: 'P5', reason: `edges dressed: ${F.count - before} entities (banks, verges, wall bases, hedgerows)` });
}
/** A linear feature added for the extruder (kerb, coping), unless one already runs there. */
function _wflLine(F, kind, pts, of) {
  if (!Array.isArray(F.world.lines)) F.world.lines = [];
  const vis = pts.filter(p => p[1] > 0);
  if (vis.length < 2) return;
  if (F.world.lines.some(L => L && L.kind === kind && Array.isArray(L.path) && _wflNear(L.path, vis[0][0], vis[0][1], false).d < 1 && _wflNear(L.path, vis[vis.length - 1][0], vis[vis.length - 1][1], false).d < 1)) return;
  const id = `${kind}-${of}-${F.world.lines.length}`;
  F.world.lines.push({ id, kind, path: vis.map(p => [_wflR2(p[0]), _wflR2(p[1])]), width: kind === 'coping' ? 0.3 : 0.2, h: kind === 'coping' ? 0.3 : 0.12, auto: 'edge' });
  _wflLog(F, { id, action: 'dress', rule: 'P5', reason: `${kind} along ${of}` });
}

/* ---------- C3: framing ---------- */
const _WFL_FRAME_CLS = new Set(['bough', 'frond', 'hedge', 'fence', 'lamp', 'reed', 'shrub', 'tree', 'post', 'signage']);
/** Does the near band already have a framing element (the author's, or a stand of reeds at one side)? -> a description or null. */
function _wflHasFrame(F) {
  const side = [0, 0], what = [null, null];
  for (const e of F.world.entities || []) {
    if (!e || !e.obj || e.backdrop || !(e.z > 0)) continue;
    const kb = worldKb(e.obj); if (!kb) continue;
    const framing = e.framing || e.framed || kb.framing || (_WFL_FRAME_CLS.has(kb.cls) && kb.size.h0 >= 1.2);
    if (!framing) continue;
    const b = _wflBox(F, e);
    if (b[2] < 0 || b[0] > F.W || b[3] < 0 || b[1] > F.H) continue;
    if (!(e.z <= _WFL_NEAR_Z || b[3] - b[1] >= 0.3 * F.H)) continue;
    const area = (Math.min(F.W, b[2]) - Math.max(0, b[0])) * (Math.min(F.H, b[3]) - Math.max(0, b[1]));
    if (b[0] < 0.22 * F.W) { side[0] += area; what[0] = what[0] || kb.cls; }
    if (b[2] > 0.78 * F.W) { side[1] += area; what[1] = what[1] || kb.cls; }
    if ((e.framing || e.framed || kb.cls === 'bough' || kb.cls === 'frond') && (b[0] < 0.22 * F.W || b[2] > 0.78 * F.W)) return `${e.auto ? 'a' : "the author's"} ${kb.cls} (${e.id || e.obj})`;
  }
  const i = side[0] >= side[1] ? 0 : 1;
  return side[i] >= 0.04 * F.W * F.H ? `${what[i]}s at the ${i ? 'right' : 'left'}` : null;
}
function _wflFrame(F) {
  const has = _wflHasFrame(F);
  if (has) { _wflLog(F, { action: 'frame', rule: 'C3', reason: `the near band is already framed: ${has}` }); return; }
  const opts = F.style.frame || [], first = F.r() < 0.5 ? -1 : 1;
  for (const opt of opts) for (const s of [first, -first]) {
    const got = opt.kind === 'bough' ? _wflFrameBough(F, opt, s) : _wflFrameClump(F, opt, s);
    if (got) { _wflLog(F, { id: got, action: 'frame', rule: 'C3', reason: `natural framing: ${opt.kind} at the ${s < 0 ? 'left' : 'right'} of the near band (${F.styleKey})` }); return; }
  }
  _wflLog(F, { action: 'frame', rule: 'C3', reason: 'no legal place for a framing element in the near band' });
}
/** A bough with its trunk just outside the frame on the same side (K4: the parent in frame or just outside, at a plausible height). */
function _wflFrameBough(F, opt, s) {
  const cam = F.cam, kt = worldKb(opt.trunk), kbB = worldKb(opt.bough);
  if (!kt || !kbB) return null;
  // the bough reaches about a third of the way across the frame: its depth follows from its drawn width
  const reach = kbB.art ? Math.abs(kbB.art[2] - kbB.art[0]) : kbB.size.l;
  const zBase = Math.max(cam.dMin * 1.5, cam.f * reach / (0.36 * F.W));
  for (const zb of [zBase, zBase * 0.8, zBase * 1.25, zBase * 1.6]) for (const out of [0.03, 0.09, 0.16]) {
    // the trunk just outside the frame on the same side (within a sixth of the frame width), on legal ground
    const zt = zb + 0.5, xt = _wflXAt(cam, s < 0 ? -out * F.W : (1 + out) * F.W, zt);
    const trunk = _wflTry(F, { obj: opt.trunk, x: xt, z: zt, facing: 90, auto: 'frame', rule: 'C3', why: 'framing trunk', framing: true, any: true, exact: true });
    if (!trunk) continue;
    // the bough's anchor is where it enters the frame, at the top corner (its art hangs below the anchor and reaches inwards)
    const k = cam.f / zb, Xa = s < 0 ? -0.02 * F.W : 1.02 * F.W, Ya = 0.03 * F.H;
    const xb = _wflXAt(cam, Xa, zb), yb = cam.eye + (cam.horizon - Ya) / k - _wflGround(F, xb, zb);
    const child = { x: xb, z: zb, y: yb, obj: opt.bough };
    const pok = worldKbParentOk(kbB, child, Object.assign({}, trunk, { height: kt.size.h0 }), { cam, W: F.W });
    if (pok.ok) {
      // the trunk stands just outside the frame: the frame record may not hold it, so the bough says so (the orphan invariant)
      const tX = cam.x0 + cam.f / trunk.z * trunk.x, parentOff = tX < 0 || tX > F.W;
      const b = _wflTry(F, { obj: opt.bough, x: xb, z: zb, attach: 'air', y: yb, parent: trunk.id, parentOff, facing: s < 0 ? 90 : 270, auto: 'frame', rule: 'C3', why: 'framing bough on its trunk', framing: true, any: true, exact: true });
      if (b) return b.id;
    }
    _wflUndo(F, trunk);
  }
  return null;
}
/** A clump (reeds, shrub, hedge, railing, lamp) at one side of the near band, on its own habitat. */
function _wflFrameClump(F, opt, s) {
  const cam = F.cam, kb = worldKb(opt.obj);
  if (!kb) return null;
  // sized to about a quarter of the frame width, standing at the side with half of it outside: a frame, never a wall
  const zIdeal = Math.max(cam.dMin * 1.2, cam.f * (kb.size.l || 1) / (0.26 * F.W));
  for (const z of [zIdeal, zIdeal * 0.8, zIdeal * 1.25, zIdeal * 1.6]) for (const at of [0.04, 0.1, 0.16]) {
    const x = _wflXAt(cam, s < 0 ? at * F.W : (1 - at) * F.W, z);
    const p = _wflProbe(F, x, z), or = worldKbOrient(kb, p);
    if (opt.kind === 'railing' && !(_wflNum(p.bankDist) && p.bankDist <= 3 && p.kind !== 'water')) continue;   // a quay railing stands at the water
    const facing = _wflNum(or.facing) ? or.facing : (s < 0 ? 90 : 270);
    const n = opt.kind === 'reeds' ? 4 : opt.kind === 'shrub' || opt.kind === 'hedge' ? 2 : 1;
    const got = _wflClump(F, opt.obj, x, z, n, Math.max(0.4, kb.size.l * 0.35), { auto: 'frame', rule: 'C3', why: `framing ${opt.kind}`, framing: true, facing });
    if (got.length) return got[0].id;
  }
  return null;
}
/** Remove an entity the fill has just added (a framing trunk whose bough found no place). */
function _wflUndo(F, e) {
  const W = F.world, i = W.entities.indexOf(e);
  if (i >= 0) W.entities.splice(i, 1);
  F.added = F.added.filter(q => q !== e);
  F.count = Math.max(0, F.count - 1);
  F.ix = null;
  for (let k = F.log.length - 1; k >= 0; k--) if (F.log[k] && F.log[k].id === e.id) F.log.splice(k, 1);
  if (Array.isArray(W.log)) for (let k = W.log.length - 1; k >= 0; k--) if (W.log[k] && W.log[k].id === e.id && W.log[k].by !== 'kb') W.log.splice(k, 1);
}

/* ---------- P6, C6: the cover passes ---------- */
function _wflGroupOf(F, surf) {
  if (!surf) return F.style.ground || 'grass';
  const g = _WFL_GROUP[surf.kind];
  return g === null ? (F.style.ground || 'grass') : g || null;
}
/** One cover pass: every bare sample of the frame gets a clump of the surface's dressing for its depth band. -> placed count. */
function _wflCoverPass(F, tier) {
  F.tier = tier;
  const view = Object.assign({}, F.world, { entities: (F.world.entities || []).filter(_wflPerennial) });
  const S = _wflSample(view, F.cam, { W: F.W, H: F.H, cols: 56, rows: 34, pad: F.pad, backdrop: _wflBackdrop(view, F.cam), surfAt: (x, z) => _wflSurfFast(F, x, z), ground: true });
  const bare = S.samples.filter(q => !q.dressed && q.z != null && q.z <= _WFL_FILL_ZMAX);
  // seeded order, nearest rows first (they are the largest share of the frame)
  const r = F.r;
  for (const q of bare) q.u = r() + (q.band === 'near' ? 0 : q.band === 'mid' ? 0.5 : 1);
  bare.sort((a, b) => a.u - b.u);
  F.boxes = [];
  let placed = 0;
  for (const q of bare) {
    if (F.count >= F.maxAuto) break;
    if (F.boxes.some(b => q.X >= b[0] && q.X <= b[2] && q.Y >= b[1] && q.Y <= b[3])) continue;
    const g = _wflGroupOf(F, q.surf), spec = g && F.style.fill[g];
    if (!spec) { F.unfillable.add(q.surf ? q.surf.kind : 'ground'); continue; }
    const band = q.z < _WFL_NEAR_Z ? 'near' : q.z < _WFL_MID_Z ? 'mid' : 'far';
    // the next tier reaches for the next band's dressing too (taller clumps cover more of the frame)
    let list = spec[band] || [];
    if (tier >= 3 && band === 'near') list = list.concat((spec.mid || []).filter(([id]) => (worldKb(id) || { size: { h0: 9 } }).size.h0 <= 1.6));
    if (tier >= 2 && band === 'mid') list = list.concat(spec.far || []);
    if (_wflNum(spec.maxH) && band !== 'far') list = list.filter(([id]) => { const k = worldKb(id); return k && k.size.h0 <= spec.maxH; });
    if (!list.length) { F.unfillable.add(q.surf ? q.surf.kind : 'ground'); continue; }
    // paving gets its sparse furniture once (_wflPaving), never a carpet of planters
    if (g === 'paving') { if (F.pavingDone) F.pavingCapped.add(q.surf ? q.surf.id : 'paving'); continue; }
    let done = false;
    for (let tries = 0; tries < 4 && !done; tries++) {
      const obj = _wflPick(list, r), kb = worldKb(obj);
      if (!kb) continue;
      // a seeded point inside the sample's cell (never the sample lattice itself: no rows), a little nearer so its clump covers it
      const gp = _wflUnproject(F.cam, q.X + (r() - 0.5) * S.colW, Math.max(F.cam.horizon + 0.5, q.Y + (r() - 0.5) * S.rowH)) || { x: q.x, d: q.z };
      const zf = Math.max(F.cam.dMin * 1.03, gp.d * (0.82 + 0.14 * r())), xf = gp.x * zf / gp.d + (r() - 0.5) * Math.min(1.2, kb.size.l * 0.5);
      if (_wflGroupOf(F, _wflSurfAt(F, xf, zf)) !== g) continue;   // the dressing of this surface, not of its neighbour
      const n = kb.cls === 'tree' ? 1 + (r() < 0.35 ? 1 : 0) : kb.cls === 'shrub' || kb.cls === 'cover' || kb.cls === 'flower' ? 1 + Math.floor(r() * (tier >= 2 ? 4 : 3)) : 1;
      const pit = g === 'paving' && kb.cls === 'tree';
      const or = kb.orient && kb.orient !== 'free' ? worldKbOrient(kb, _wflProbe(F, xf, zf)) : null;
      const got = _wflClump(F, obj, xf, zf, n, Math.max(0.5, kb.size.l * (kb.cls === 'tree' ? 1.6 : 0.9)), { auto: 'fill', rule: tier > 1 ? 'C6' : 'P6', why: `${g} ${band} dressing (tier ${tier})`, pit, facing: or && _wflNum(or.facing) ? or.facing : undefined });
      if (got.length) { done = true; placed += got.length; }
    }
  }
  F.boxes = null;
  return placed;
}
/** Street furniture on paving (P6): a few bins, planters, benches, lamps and trees in pits per depth band, scattered at seeded
    spots at least 3 m apart (never rows, never clutter). Paving is mostly dressed by its people (a crowd population). */
function _wflPaving(F) {
  F.pavingDone = true;
  const cam = F.cam, r = F.r, ix = _wflIndexOf(F), spec = F.style.fill.paving;
  if (!spec || !ix.surfs.some(s => _WFL_GROUP[s.kind] === 'paving')) return;
  const cap = spec.max || { near: 6, mid: 14, far: 12 }, got = { near: 0, mid: 0, far: 0 }, spots = [];
  for (let tries = 0; tries < 400; tries++) {
    const X = -F.pad + r() * (F.W + 2 * F.pad), Y = cam.horizon + 4 + r() * (F.H - cam.horizon - 4), g = _wflUnproject(cam, X, Y);
    if (!g || g.d > 90) continue;
    const surf = _wflSurfAt(F, g.x, g.d);
    if (_wflGroupOf(F, surf) !== 'paving' || F.lived.has(surf.id)) continue;
    const band = g.d < _WFL_NEAR_Z ? 'near' : g.d < _WFL_MID_Z ? 'mid' : 'far';
    if (got[band] >= cap[band]) continue;
    if (spots.some(p => Math.hypot(p[0] - g.x, p[1] - g.d) < 3 + 0.05 * g.d)) continue;
    const obj = _wflPick(spec[band], r), kb = worldKb(obj);
    if (!kb) continue;
    const or = kb.orient && kb.orient !== 'free' ? worldKbOrient(kb, _wflProbe(F, g.x, g.d)) : null;
    const e = _wflTry(F, { obj, x: g.x, z: g.d, auto: 'fill', rule: 'P6', why: `paving ${band}: street furniture`, pit: kb.cls === 'tree', facing: or && _wflNum(or.facing) ? or.facing : (r() < 0.5 ? 90 : 270) });
    if (e) { got[band]++; spots.push([g.x, g.d]); }
  }
  if (spots.length) _wflLog(F, { action: 'fill', rule: 'P6', reason: `${spots.length} pieces of street furniture on the paving (near ${got.near}, mid ${got.mid}, far ${got.far})` });
}
/**
 * People dress paving and paths (C6, SCENE_LESSONS A: crowd flows, never empty squares): a walk surface that still shows a large
 * bare share of the frame and has no population gets one by the place style (a crowd in towns and cities, walkers with dogs in
 * parks and the country). The life package spawns, routes and thins them by time (worldKbDensity).
 */
function _wflPeople(F) {
  const W = F.world, view = Object.assign({}, W, { entities: (W.entities || []).filter(_wflPerennial) });
  const S = _wflSample(view, F.cam, { W: F.W, H: F.H, cols: 48, rows: 30, backdrop: _wflBackdrop(view, F.cam), surfAt: (x, z) => _wflSurfFast(F, x, z), ground: true });
  const bare = new Map();
  for (const q of S.samples) if (q.inFrame && !q.dressed && q.surf && _WFL_WALK.has(q.surf.kind) && !q.surf.auto) bare.set(q.surf.id, (bare.get(q.surf.id) || 0) + 1);
  const city = (F.style.place === 'city' || F.style.place === 'town');
  for (const [id, n] of bare) {
    if (n / Math.max(1, S.n) < 0.03 || F.lived.has(id)) continue;
    const s = (W.surfaces || []).find(q => q.id === id);
    const L = city ? { who: 'crowd', on: id, rate: '8/min' } : { who: 'walkers', on: id, rate: '3/min', mix: { stroll: 0.55, brisk: 0.2, 'dog-walker': 0.25 } };
    L.auto = 'fill';
    try { const P = typeof WORLD_POPULATIONS === 'object' && WORLD_POPULATIONS ? WORLD_POPULATIONS[L.who] : null; if (P) L.pop = Object.assign({}, P); } catch (e) { /* the core resolves it */ }
    if (!Array.isArray(W.life)) W.life = [];
    W.life.push(L);
    F.lived.add(id);
    _wflLog(F, { id: 'life:' + id, action: 'fill', rule: 'C6', reason: `${L.who} on ${id} (${s ? s.kind : 'walk'}, ${Math.round(n / S.n * 100)} % of the frame bare): ${city ? 'paving' : 'a path'} is dressed by its people` });
  }
}
/** Seasonal and occasional accents (flowers in their months, leaf litter in autumn, lilies on calm water): variety, never coverage. */
function _wflAccents(F) {
  const r = F.r, before = F.count, ix = _wflIndexOf(F), cam = F.cam;
  const n = Math.min(80, Math.max(8, Math.round(F.count * 0.1)));
  for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
    const X = -F.pad + r() * (F.W + 2 * F.pad), Y = cam.horizon + (F.H - cam.horizon) * Math.pow(r(), 0.7), g = _wflUnproject(cam, X, Y);
    if (!g || g.d > _WFL_MID_Z * 2) continue;
    const surf = _wflSurfAt(F, g.x, g.d), grp = _wflGroupOf(F, surf), spec = grp && F.style.fill[grp];
    if (!spec || !spec.accents || !spec.accents.length || grp === 'water') continue;
    const obj = _wflPick(spec.accents, r), kb = worldKb(obj);
    if (!kb) continue;
    const G = kb.group || {}, n = G.kind === 'single' ? 1 : 1 + Math.floor(r() * Math.min(4, Array.isArray(G.size) ? G.size[1] : 4));
    const got = _wflClump(F, obj, g.x, g.d, n, Math.max(0.4, kb.size.l), { auto: 'fill', rule: 'P6', why: `${grp} seasonal accent` });
    i += got.length;
  }
  // calm water: lilies in loose rafts near the banks, a few fish rings
  const wspec = F.style.fill.water;
  if (wspec && wspec.calm && wspec.calm.length) for (const w of ix.waters) {
    if (!w.calm) continue;
    const rafts = Math.round(6 * (wspec.share || 0.3) * 3);
    for (let k = 0, tries = 0; k < rafts && tries < rafts * 8; tries++) {
      const X = r() * F.W, Y = cam.horizon + (F.H - cam.horizon) * Math.pow(r(), 0.8), g = _wflUnproject(cam, X, Y);
      if (!g || g.d > 90) continue;
      const p = _wflProbe(F, g.x, g.d);
      if (p.kind !== 'water' || !(p.bankDist < 6)) continue;
      const obj = _wflPick(wspec.calm, r), kb = worldKb(obj);
      const got = _wflClump(F, obj, g.x, g.d, kb && kb.cls === 'lily' ? 3 + Math.floor(r() * 6) : 1, 0.8, { auto: 'fill', rule: 'P6', why: 'calm water: lilies and rings', attach: undefined });
      if (got.length) k++;
    }
  }
  if (F.count > before) _wflLog(F, { action: 'fill', rule: 'P6', reason: `${F.count - before} seasonal accents (flowers in their months, leaf litter, lilies on calm water)` });
}

/* ---------- P7: the box measure (the tools' critic measure) and the richness tier ---------- */
const _WFL_BOX_BANDS = [{ id: 'near', z0: 0, z1: 15, w: 0.3, cover: 0.4, variety: 10, n: 80 }, { id: 'mid', z0: 15, z1: 80, w: 0.45, cover: 0.6, variety: 25, n: 300 },
  { id: 'far', z0: 80, z1: Infinity, w: 0.25, cover: 0.25, variety: 15, n: 500 }];
/** The box measure of a world: its statics, backdrop bands and hedge surfaces as screen boxes, judged per depth band (near < 15 m,
    mid 15-80 m, far beyond) by frame cover, object variety and count: { near, mid, far: { cover, variety, n }, score }. */
function _wflBoxScore(world, cam, o) {
  o = o || {};
  const W = o.W || 1600, H = o.H || 900, COLS = 64, ROWS = 36, F = { world, cam, W, H }, recs = [];
  for (const e of world.entities || []) if (e && e.obj && e.z > 0.3) recs.push({ obj: e.obj, z: e.z, box: _wflBox(F, e) });
  for (const b of o.backdrop || _wflBackdrop(world, cam)) if (b && b.obj && b.z > 0) recs.push({ obj: b.obj, z: b.z, box: _wflBox(F, b) });
  for (const s of world.surfaces || []) {
    if (s.kind !== 'hedge' || !Array.isArray(s.path) || s.path.length < 2) continue;
    const obj = s.obj || 'plant.towpath-hedge';
    if ((world.entities || []).some(e => e.obj === obj && e.host === s.id)) continue;
    for (let i = 1; i < s.path.length; i++) {
      const a = s.path[i - 1], b = s.path[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 2));
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; if (z > 0.5) recs.push({ obj, z, box: _wflBox(F, { obj, x, z }) }); }
    }
  }
  const out = {}, cells = _WFL_BOX_BANDS.map(() => new Uint8Array(COLS * ROWS)), objs = _WFL_BOX_BANDS.map(() => new Set()), counts = _WFL_BOX_BANDS.map(() => 0);
  for (const r of recs) {
    const b = r.box;
    if (!b || !b.every(_wflNum) || b[2] < 0 || b[0] > W || b[3] < 0 || b[1] > H) continue;
    const bi = _WFL_BOX_BANDS.findIndex(x => r.z >= x.z0 && r.z < x.z1);
    if (bi < 0) continue;
    objs[bi].add(r.obj); counts[bi]++;
    const c0 = Math.max(0, Math.floor(b[0] / W * COLS)), c1 = Math.min(COLS - 1, Math.floor(b[2] / W * COLS)), w0 = Math.max(0, Math.floor(b[1] / H * ROWS)), w1 = Math.min(ROWS - 1, Math.floor(b[3] / H * ROWS));
    for (let j = w0; j <= w1; j++) for (let i = c0; i <= c1; i++) { const X = (i + 0.5) * W / COLS, Y = (j + 0.5) * H / ROWS; if (X >= b[0] && X <= b[2] && Y >= b[1] && Y <= b[3]) cells[bi][j * COLS + i] = 1; }
  }
  let score = 0;
  _WFL_BOX_BANDS.forEach((band, bi) => {
    let n = 0; for (const v of cells[bi]) n += v;
    const cover = n / (COLS * ROWS), variety = objs[bi].size, q = { cover: 0.4 * Math.min(1, cover / band.cover), variety: 0.3 * Math.min(1, variety / band.variety), n: 0.3 * Math.min(1, Math.log1p(counts[bi]) / Math.log1p(band.n)) };
    out[band.id] = { cover: Math.round(cover * 1000) / 1000, variety, n: counts[bi], need: { cover: 0.4 - q.cover, variety: 0.3 - q.variety, n: 0.3 - q.n }, objs: objs[bi] };
    score += band.w * (q.cover + q.variety + q.n);
  });
  out.score = Math.round(score * 1000) / 10;
  return out;
}
/**
 * The richness tier (P7): until the box measure reaches the target (a converted scene's source score, o.floor.score, else the
 * place kind's default), add to the band that lacks most: tall clumps where it lacks cover, objects it has not got where it lacks
 * variety, small clumps where it lacks count. Each on legal ground through the usual checks; capped, and logged.
 */
function _wflRichTier(F, floor) {
  const kind = F.style.place || 'park', target = floor && _wflNum(floor.score) ? floor.score : (WORLD_RICHNESS_FLOOR.box[kind] || 90);
  const city = kind === 'city' || kind === 'town', pool = city ? _WFL_RICH_CITY : _WFL_RICH_RURAL, r = F.r, cam = F.cam;
  // the near band's pool: the style's near dressing, the wet margin and the small things of the mid pool
  const nearGroups = city ? ['grass'] : ['grass', 'heath', 'wood', 'wet'];
  const nearPool = [].concat(...nearGroups.map(g => F.style.fill[g]).filter(sp => sp && Array.isArray(sp.near)).map(sp => sp.near), (F.style.edges && F.style.edges.natural && !city) ? F.style.edges.natural.margin : [],
    (pool.mid || []).filter(([id]) => (worldKb(id) || { size: { h0: 9 } }).size.h0 < 2.5));
  const pools = { near: nearPool, mid: pool.mid || [], far: pool.far || [] }, Z = { near: [Math.max(cam.dMin * 1.1, 4), 15], mid: [15, 80], far: [80, 300] };
  let B = _wflBoxScore(F.world, cam), added = 0, trees = 0;
  const start = B.score, dead = new Set();
  for (let round = 0; round < 18 && added < WORLD_RICH_BUDGET.items && B.score < target; round++) {
    // the band and the part of the measure that lack most (a part with nothing left to add is skipped)
    let best = null;
    for (const band of ['near', 'mid', 'far']) for (const what of ['cover', 'variety', 'count']) {
      if (dead.has(band + what) || dead.has(band)) continue;
      // variety and count are cheap (a new kind, a few small clumps); cover costs big trees: weigh by what it buys per item
      const need = B[band].need[what === 'count' ? 'n' : what] * _WFL_BOX_BANDS.find(x => x.id === band).w, gain = need * ({ variety: 3, count: 2, cover: 1 })[what];
      if (need > 0.002 && (!best || gain > best.gain)) best = { band, what, need, gain };
    }
    if (!best) break;
    const { band, what } = best;
    let list = pools[band];
    // the tree budget (bug 21: every tree is a draw and an occluder redraw each frame): spent, the band takes low things only
    if (trees >= WORLD_RICH_BUDGET.trees) list = list.filter(([id]) => (worldKb(id) || { cls: 'tree' }).cls !== 'tree');
    let L = what === 'variety' ? list.filter(([id]) => !B[band].objs.has(id)) : what === 'cover' ? list.filter(([id]) => (worldKb(id) || { size: { h0: 0 } }).size.h0 >= (band === 'near' ? 0.8 : band === 'mid' ? 1.8 : 4)) : list.filter(([id]) => (worldKb(id) || { size: { h0: 9 } }).size.h0 < 4);
    if (!L.length) { dead.add(band + what); continue; }
    let placed = 0;
    for (let tries = 0; tries < 200 && placed < 30; tries++) {
      // cover is bought nearest the band's front (a tree at 90 m covers twice the frame of one at 180 m), then wherever there is land
      const front = what === 'cover' && band !== 'near' && tries < 100;
      const zr = front ? [Z[band][0] + (band === 'mid' ? 12 : 0), Z[band][0] + (Z[band][1] - Z[band][0]) * (band === 'far' ? 0.25 : 1)] : Z[band];
      const z = zr[0] + Math.pow(r(), 0.8) * (zr[1] - zr[0]), x = _wflXAt(cam, r() < 0.85 ? r() * F.W : -F.pad + r() * (F.W + 2 * F.pad), z);   // mostly in frame: the overscan is for wide screens only
      const obj = _wflPick(L, r), kb = worldKb(obj);
      if (!kb) continue;
      const n = kb.cls === 'tree' ? Math.min(1 + (r() < 0.3 ? 1 : 0), WORLD_RICH_BUDGET.trees - trees) : 1 + Math.floor(r() * 3);
      if (n <= 0) continue;
      const got = _wflClump(F, obj, x, z, n, Math.max(0.6, kb.size.l * (kb.cls === 'tree' ? 1.2 : 0.8)), { auto: 'fill', rule: 'P7', why: `richness: ${band} ${what}` });
      placed += got.length;
      trees += got.filter(e => (worldKb(e.obj) || {}).cls === 'tree').length;
      if (trees >= WORLD_RICH_BUDGET.trees && kb.cls === 'tree') break;
      if (what === 'variety' && got.length) { L = L.filter(([id]) => id !== obj); if (!L.length) break; }
    }
    added += placed;
    const B2 = _wflBoxScore(F.world, cam);
    // nothing placed, or too little gained for what it costs: that part is done
    if (!placed || B2.score - B.score < 0.02 * placed) dead.add(band + what);
    B = B2;
  }
  if (F.world.fillState) F.world.fillState.box = B.score;
  if (added || B.score < target) _wflLog(F, { action: 'fill', rule: 'P7', reason: `richness tier: ${added} added; box measure ${start} -> ${B.score} (target ${target}${floor && _wflNum(floor.score) ? ', the source' : ', ' + kind})${B.score < target ? ': no legal place left for more' : ''}` });
}

/* ---------- the fill ---------- */
/**
 * Dress, frame and fill a world (12.3). Runs after the placement solver; idempotent (a second call does only what the first
 * skipped, e.g. the auto-fill after fill: false). Returns the log entries of this call (the caller appends them to world.log).
 */
function worldFill(world, o) {
  const log = [];
  try {
    o = o || {};
    if (!world || typeof world !== 'object') return log;
    const cam = o.cam || world.cam;
    if (!cam || !_wflNum(cam.f)) { log.push({ id: null, obj: null, action: 'fill', rule: 'P6', reason: 'no camera: nothing filled', by: 'kb' }); return log; }
    if (!Array.isArray(world.entities)) world.entities = [];
    if (!Array.isArray(world.surfaces)) world.surfaces = [];
    const state = world.fillState || (world.fillState = { edges: false, frame: false, fill: false, tiers: 0 });
    const fillOff = o.fill === false || world.fill === false || (world.spec && world.spec.fill === false);
    const styleKey = worldFillStyle(world, o), style = WORLD_FILL_STYLES[styleKey];
    const F = { world, cam, log, style, styleKey, W: o.W || 1600, H: o.H || 900, pad: (o.overscan == null ? 0.18 : o.overscan) * (o.W || 1600), ctx: o.ctx || world.ctx || null,
      r: _wflRng('fill|' + (world.seed | 0) + '|' + styleKey + '|' + Math.round(cam.heading || 0)), count: 0, seq: 0, maxAuto: o.maxAuto || 1400, ids: new Set(), added: [], bad: new Set(),
      spacing: new Map(), tier: 1, unfillable: new Set(), pavingCapped: new Set(), lived: _wflLived(world), ix: null, boxes: null, pavingDone: false, authorReeds: [],
      seasonal: o.seasonal === true || (o.seasonal !== false && typeof worldStaticPresent === 'function') };
    for (const e of world.entities) { if (e && e.id) F.ids.add(e.id); if (e && e.auto) F.count++; }
    F.count = Math.min(F.count, F.maxAuto);
    F.authorReeds = world.entities.filter(e => e && !e.auto && e.obj && (worldKb(e.obj) || {}).cls === 'reed');
    F.landmarks = _wflLandmarks(F);
    for (const e of world.entities) if (e && e.auto && e.obj) { const kb = worldKb(e.obj); if (kb) _wflSpacingAdd(F, e.x, e.z, Math.max(0.18, 0.42 * Math.min(kb.size.l || 0.5, 3)), e.obj); }
    // the backdrop from the place style when the scene has none (no empty backgrounds)
    if (!world.backdrop && style.backdrop) {
      world.backdrop = { style: style.backdrop };
      log.push({ id: null, obj: null, action: 'default', rule: 'emptyBackground', reason: `backdrop '${style.backdrop}' from the place style '${styleKey}'`, by: 'kb' });
    }
    if (!state.edges) { _wflEdges(F); state.edges = true; }
    if (!state.frame) { _wflFrame(F); state.frame = true; }
    if (!fillOff && !state.fill) {
      const floor = o.floor || null, maxTier = o.maxTier || 5;
      let cov = _wflCoverage(F), rich = worldRichness(world, cam, { perennial: true, floor, W: F.W, H: F.H, box: false });
      const start = cov.bare;
      _wflPaving(F);
      _wflPeople(F);
      for (let tier = 1; tier <= maxTier; tier++) {
        if (cov.ok && rich.ok && tier > 1) break;
        const n = _wflCoverPass(F, tier);
        const cov2 = _wflCoverage(F);
        log.push({ id: null, obj: null, action: 'fill', rule: tier > 1 ? 'C6' : 'P6', reason: `tier ${tier}: ${n} placed; bare ${Math.round(cov.bare * 100)} % -> ${Math.round(cov2.bare * 100)} % (${cov2.by})`, by: 'kb' });
        cov = cov2; rich = worldRichness(world, cam, { perennial: true, floor, W: F.W, H: F.H, box: false });
        state.tiers = tier;
        if (n === 0) break;
      }
      _wflAccents(F);
      _wflRichTier(F, floor);
      rich = worldRichness(world, cam, { perennial: true, floor, W: F.W, H: F.H, box: false });
      if (!cov.ok) {
        const why = [];
        if (F.unfillable.size) why.push('nothing dresses ' + [...F.unfillable].join(', '));
        if (F.pavingCapped.size) why.push(`the street furniture budget is spent on ${[...F.pavingCapped].join(', ')}`);
        if (F.count >= F.maxAuto) why.push('the auto entity budget is spent');
        log.push({ id: null, obj: null, action: 'fill', rule: 'C6', reason: `stopped at ${Math.round(cov.bare * 100)} % bare (from ${Math.round(start * 100)} %): no legal place left${why.length ? ' (' + why.join('; ') + ')' : ''}`, by: 'kb' });
      }
      if (!rich.ok) {
        const fl = WORLD_RICHNESS_FLOOR, short = ['near', 'mid', 'far'].filter(k => rich[k].cover < fl[k].cover || rich[k].variety < fl[k].variety).map(k => `${k} cover ${rich[k].cover} (floor ${fl[k].cover}), variety ${rich[k].variety} (floor ${fl[k].variety})`);
        log.push({ id: null, obj: null, action: 'fill', rule: 'P7', reason: `below the richness floor: score ${rich.score} (floor ${rich.floor})${short.length ? '; ' + short.join('; ') : ''}`, by: 'kb' });
      }
      state.fill = true;
      state.coverage = cov.bare; state.richness = rich.score;
    } else if (fillOff && !state.offLogged) {
      log.push({ id: null, obj: null, action: 'fill', rule: 'P6', reason: 'fill: false: no auto-fill (edges and framing only)', by: 'kb' });
      state.offLogged = true;
    }
    state.style = styleKey;
    if (Array.isArray(world.log)) for (const x of log) world.log.push(x);
    return log;
  } catch (e) {
    log.push({ id: null, obj: null, action: 'fill', rule: 'G8', reason: 'the fill stopped on an error: ' + (e && e.message ? e.message : String(e)), by: 'kb' });
    return log;
  }
}
