/* ============================================================
   SCENE ENGINE v2: the ground grid, the camera, surfaces, ground placements, snapping, draw order
   (docs/dev/SCENE_ENGINE_V2.md sections 2 to 5.2, 12; builder A).
   PURE classic script: functions and consts only, no DOM, nothing expensive at load. It may call 70-scene-0core.js at
   load; the other 70-scene-1* files (the real sizes, scatter, recipes, atmos, flows, presets), the generator and the 71
   files only LAZILY, inside functions, behind typeof guards. Private names: _scgr.

   THE SWITCH. A scene is v2 when its camera has eye, horizon, fov or preset (sceneIsV2; v1 data may carry
   camera: { pan, period }, the slow pan, which does not make it v2). sceneCompile (the core) then runs the v2 stages
   here: sceneCompileV2Begin (camera, surfaces, water geometry, terrain ridges, generated buildings), sceneCompileV2Place
   (each ground or pixel placement), the scatter and cover of 70-scene-1scatter.js, sceneCompileV2Finish (flows, atmos,
   weather, lights, draw order, stats). v1 data never reaches this file (byte-identical compiles, V2 14.1).

   Camera (2.1, 2.2)   SCENE_BANDS_DEFAULT, sceneIsV2(data), sceneCamera(data) -> Cam (memoised per data),
                       sceneProject(cam, x, d, h) -> { X, Y, k }, sceneUnproject(cam, X, Y) -> { x, d } | null,
                       sceneGroundHeight(cam, x, d), sceneDepthBand(cam, d) -> the layer index
   Surfaces (3)        SCENE_SURFACE_KINDS, sceneSurfaceKinds(), sceneSurfacesCompile(data, cam, G),
                       sceneSurfaceAt(C, x, d) -> { id, kind, flags } | null (water counts, kind 'water'),
                       sceneSurfaceNearest(C, x, d, kinds, maxM) -> { id, kind, x, d, m } | null,
                       sceneSurfaceSpan(C, id, d) -> [[x0, x1], ...] (the slices of a surface at a depth)
   Water (5.1, 5.2)    sceneWaterCompile(data, cam, G): the regions' geometry (canals from a centreline, banks, rowAt, edges)
   Placements (4)      SCENE_PLACE_RULES, SCENE_DRIVE_LEFT, sceneObjClass(id), scenePlaceAllowed(cls, surf, p),
                       scenePlaceResolve(G, p, i) -> the placement in pixel form + its ground record, sceneGroundSnap(G, cls, x, d, o),
                       sceneViewOf(id, tangent, x, d, face), sceneActorAtV2(a, t, cam), sceneDepthOrder(items, buildings, cam)
   Compile glue (12)   sceneCompileV2Begin(data, opt), sceneCompileV2Place(G, p, i), sceneCompileV2Attach(G, it, q),
                       sceneCompileV2Actor(G, a, i), sceneCompileV2Finish(G, C)

   Ground metres: x to the right of the camera's axis, d forward (d > 0), h up. Screen units: the 1600 x 900 frame.
   ============================================================ */
const SCENE_BANDS_DEFAULT = Object.freeze([
  Object.freeze({ id: 'horizon', d: Object.freeze([800, Infinity]) }), Object.freeze({ id: 'far', d: Object.freeze([200, 800]) }),
  Object.freeze({ id: 'mid', d: Object.freeze([50, 200]) }), Object.freeze({ id: 'near', d: Object.freeze([15, 50]) }),
  Object.freeze({ id: 'fore', d: Object.freeze([0, 15]) }), Object.freeze({ id: 'front', d: null }),
]);
const SCENE_DMAX = 20000;
const _SCGR_DEG = Math.PI / 180;
const _scgrClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _scgrNum = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
const _scgrR1 = v => Math.round(v * 10) / 10, _scgrR2 = v => Math.round(v * 100) / 100, _scgrR3 = v => Math.round(v * 1000) / 1000;

/* ---------- surface kinds (3.1): flags, paints by season [far, near], the factors weather and cover read ---------- */
const _scgrK = (o) => Object.freeze(Object.assign({ walk: false, drive: Object.freeze([]), rail: Object.freeze([]), plant: false, hard: false, wet: 0.2, snow: 'full', leaves: 0.5 }, o));
const _scgrSeas = (spring, summer, autumn, winter) => Object.freeze({ spring, summer: summer || spring, autumn: autumn || summer || spring, winter: winter || summer || spring });
const SCENE_SURFACE_KINDS = Object.freeze({
  road: _scgrK({ drive: ['car', 'bus', 'bike', 'cyclist', 'tractor'], hard: true, wet: 0.8, snow: 'slush', leaves: 0.3, col: _scgrSeas(['#77787a', '#4c4d4f']), marks: 'centre', look: 'tarmac' }),
  parking: _scgrK({ walk: true, drive: ['car'], hard: true, wet: 0.7, snow: 'slush', leaves: 0.3, col: _scgrSeas(['#75767a', '#525356']), marks: 'bays', look: 'tarmac' }),
  driveway: _scgrK({ walk: true, drive: ['car'], hard: true, wet: 0.6, snow: 'slush', leaves: 0.4, col: _scgrSeas(['#94867a', '#76675a']), look: 'blocks' }),
  track: _scgrK({ walk: true, drive: ['tractor', 'car'], wet: 0.3, snow: 'full', leaves: 0.5, col: _scgrSeas(['#9a8a68', '#78684a'], null, ['#8e7a5a', '#6c5a3e'], ['#8e8270', '#6e624e']), look: 'ruts' }),
  pavement: _scgrK({ walk: true, hard: true, wet: 0.6, snow: 'slush', leaves: 0.5, col: _scgrSeas(['#aeaaa2', '#8f8b84']), look: 'flags' }),
  plaza: _scgrK({ walk: true, hard: true, wet: 0.7, snow: 'slush', leaves: 0.4, col: _scgrSeas(['#aaa093', '#877d70']), look: 'setts' }),
  platform: _scgrK({ walk: true, hard: true, wet: 0.6, snow: 'slush', leaves: 0.2, col: _scgrSeas(['#aba79f', '#8b8780']), marks: 'platform', look: 'flags' }),
  path: _scgrK({ walk: true, drive: ['bike', 'cyclist'], wet: 0.3, snow: 'full', leaves: 0.8, col: _scgrSeas(['#b9a986', '#94825f'], null, ['#aa9474', '#86704f'], ['#a49a88', '#827664']), look: 'gravel' }),
  towpath: _scgrK({ walk: true, drive: ['bike', 'cyclist'], wet: 0.3, snow: 'full', leaves: 0.8, col: _scgrSeas(['#ad9f82', '#8a7b5e'], null, ['#a08a6c', '#7e6a4c'], ['#a09888', '#7c7262']), look: 'gravel' }),
  cycleway: _scgrK({ walk: true, drive: ['bike', 'cyclist'], hard: true, wet: 0.5, snow: 'slush', leaves: 0.4, col: _scgrSeas(['#a06a5e', '#844a40']), look: 'tarmac' }),
  steps: _scgrK({ walk: true, hard: true, wet: 0.5, snow: 'full', leaves: 0.5, col: _scgrSeas(['#aaa69c', '#8a867c']), look: 'treads' }),
  bridge: _scgrK({ hard: true, wet: 0.6, snow: 'full', leaves: 0.3, col: _scgrSeas(['#958e86', '#726b63']), look: 'deck' }),
  rail: _scgrK({ rail: ['train'], wet: 0.2, snow: 'full', leaves: 0.2, col: _scgrSeas(['#8e867c', '#6a625a']), marks: 'rails', look: 'ballast' }),
  tramway: _scgrK({ drive: ['car', 'bus'], rail: ['tram'], hard: true, wet: 0.8, snow: 'slush', leaves: 0.3, col: _scgrSeas(['#77787a', '#4c4d4f']), marks: 'tram', look: 'tarmac' }),
  grass: _scgrK({ walk: true, plant: true, wet: 0.2, leaves: 1, col: _scgrSeas(['#93b263', '#5f8c3c'], ['#8dab5c', '#587f36'], ['#9aa45e', '#6a783a'], ['#8c9670', '#68724e']), look: 'grass' }),
  lawn: _scgrK({ walk: true, plant: true, wet: 0.2, leaves: 1, col: _scgrSeas(['#97ba66', '#62943e'], ['#92b360', '#5c8a3a'], ['#9aaa62', '#6a7e3e'], ['#8e9a74', '#6a7652']), look: 'lawn' }),
  park: _scgrK({ walk: true, plant: true, wet: 0.2, leaves: 1, col: _scgrSeas(['#93b263', '#5f8c3c'], ['#8dab5c', '#587f36'], ['#9aa45e', '#6a783a'], ['#8c9670', '#68724e']), look: 'grass' }),
  verge: _scgrK({ plant: true, wet: 0.2, leaves: 1, col: _scgrSeas(['#98ac62', '#6c843e'], ['#97a65c', '#6a7c3a'], ['#a09a5a', '#76703a'], ['#8e9272', '#6c6e50']), look: 'rough' }),
  field: _scgrK({ drive: ['tractor'], plant: true, wet: 0.1, leaves: 0.6, col: _scgrSeas(['#9cb86a', '#6e9444'], ['#a4b45e', '#76903e'], ['#b0a466', '#867a42'], ['#94987a', '#70725a']), look: 'rows' }),
  meadow: _scgrK({ walk: true, plant: true, wet: 0.1, leaves: 0.8, col: _scgrSeas(['#a0b466', '#728c40'], ['#acb064', '#7e8a40'], ['#a8a060', '#7e743e'], ['#969478', '#727058']), look: 'rough' }),
  heath: _scgrK({ walk: true, plant: true, wet: 0.1, leaves: 0.6, col: _scgrSeas(['#8c8a62', '#666444'], ['#94806c', '#6c5a4a'], ['#9a7a56', '#72563a'], ['#888272', '#665e50']), look: 'heath' }),
  wood: _scgrK({ walk: true, plant: true, wet: 0.1, snow: 'partial', leaves: 1.2, col: _scgrSeas(['#6e6a44', '#4e4a2e'], ['#646640', '#46482c'], ['#7a5e3c', '#5a4228'], ['#6e665a', '#504a40']), look: 'litter' }),
  garden: _scgrK({ walk: true, plant: true, wet: 0.2, leaves: 1, col: _scgrSeas(['#94b664', '#5e8c3c'], ['#8eb05e', '#5a8638'], ['#9aa660', '#6a7a3c'], ['#8c9872', '#687450']), look: 'lawn' }),
  bank: _scgrK({ walk: true, plant: true, wet: 0.4, leaves: 0.8, col: _scgrSeas(['#8a9a5a', '#62723c'], ['#86945a', '#5e6c3a'], ['#8e8a52', '#686236'], ['#82866a', '#62664c']), look: 'rough' }),
  reedbed: _scgrK({ plant: 'reeds', wet: 0.6, snow: 'partial', leaves: 0.3, col: _scgrSeas(['#94a062', '#6e7a42'], ['#8e9e5a', '#6a7a3c'], ['#ac9e62', '#827442'], ['#a8a080', '#827a5e']), look: 'rough' }),
  beach: _scgrK({ walk: true, wet: 0.5, leaves: 0.1, col: _scgrSeas(['#e2d4ae', '#cbb68c']), look: 'sand' }),
  sand: _scgrK({ walk: true, wet: 0.5, leaves: 0.1, col: _scgrSeas(['#dccca2', '#c4ae82']), look: 'sand' }),
  shingle: _scgrK({ walk: true, wet: 0.5, leaves: 0.1, col: _scgrSeas(['#bcb2a2', '#988e7e']), look: 'shingle' }),
  rock: _scgrK({ walk: true, hard: true, wet: 0.4, leaves: 0.1, col: _scgrSeas(['#9e988e', '#7a746a']), look: 'rock' }),
  mud: _scgrK({ walk: 'birds', wet: 0.9, leaves: 0.2, col: _scgrSeas(['#766a58', '#564c3e']), look: 'mud' }),
  edge: _scgrK({ hard: true, wet: 0.5, leaves: 0.2, col: _scgrSeas(['#bdb5a4', '#a39b8a']), look: 'coping' }),
  rooftop: _scgrK({ walk: 'birds', hard: true, wet: 0.4, leaves: 0.3, col: _scgrSeas(['#7e7874', '#605a56']), look: 'roof' }),
  plot: _scgrK({ wet: 0.2, leaves: 0.6, col: _scgrSeas(['#a09680', '#7e7460']), look: 'plot' }),
  water: _scgrK({ wet: 0, snow: 'none', leaves: 0, col: _scgrSeas(['#6a8a9a', '#2a4a5a']), look: 'water' }),
});
/** Kinds that read as the same paint in scene palettes: lawn and park paint as grass unless the palette names them. */
const _SCGR_KIND_ALIAS = Object.freeze({ lawn: 'grass', park: 'grass', sand: 'beach' });
/** The edge looks of the 'edge' kind (coping, quay, wall, kerb): [far, near]. */
const _SCGR_EDGE_LOOKS = Object.freeze({ coping: ['#c4bcab', '#a8a090'], quay: ['#8a857c', '#6c675e'], wall: ['#8c5a46', '#6e4234'], kerb: ['#bab6ae', '#9e9a92'], natural: ['#6e6650', '#5a523e'], beach: ['#cdbf98', '#b9a77e'] });
/** Field crops (field: crop): [far, near] by season, overriding the kind's paint. */
const _SCGR_CROPS = Object.freeze({
  pasture: null,
  stubble: _scgrSeas(['#b4a66a', '#8e7e48'], ['#c8b670', '#a48e4c'], ['#c0aa66', '#9a8446'], ['#a49c7c', '#807858']),
  wheat: _scgrSeas(['#a8b868', '#7e9440'], ['#d0bc6c', '#b49a48'], ['#b8a462', '#927c40'], ['#9a9a7a', '#76765a']),
  plough: _scgrSeas(['#8e7a5c', '#6a5640'], ['#8a765a', '#66523e'], ['#866e52', '#62503a'], ['#857a6a', '#615648']),
  rape: _scgrSeas(['#d8d060', '#b8b040'], ['#8ea456', '#6a823a'], ['#8e9a58', '#6a7a3a'], ['#909478', '#6c7058']),
});

/* ---------- placement rules (4.4, 4.5): the surface kinds each class may stand on, and how far it may be snapped ---------- */
const _SCGR_WALK = Object.freeze(Object.keys(SCENE_SURFACE_KINDS).filter(k => SCENE_SURFACE_KINDS[k].walk === true));
const _SCGR_PLANT = Object.freeze(['grass', 'lawn', 'park', 'verge', 'field', 'meadow', 'heath', 'wood', 'garden', 'bank']);
const _SCGR_BUILD = Object.freeze(['plot', 'grass', 'lawn', 'park', 'field', 'garden', 'meadow', 'heath', 'wood', 'verge']);
const _scgrRule = (on, snap, o) => Object.freeze(Object.assign({ on: Object.freeze(on), snap }, o || {}));
const SCENE_PLACE_RULES = Object.freeze({
  car: _scgrRule(['road', 'parking', 'driveway', 'tramway', 'track'], 3, { lane: true }),
  bus: _scgrRule(['road', 'tramway'], 3, { lane: true }),
  tram: _scgrRule(['tramway', 'rail'], 3, { lane: true, railTag: 'tram' }),
  train: _scgrRule(['rail'], 3, { lane: true }),
  bike: _scgrRule(['road', 'cycleway', 'path', 'towpath', 'park'], 2),
  cyclist: _scgrRule(['road', 'cycleway', 'path', 'towpath', 'park'], 2),
  tractor: _scgrRule(['field', 'track', 'road'], 3),
  boat: _scgrRule(['water'], 3, { inset: true, beached: ['beach', 'sand', 'shingle', 'mud'] }),
  person: _scgrRule(_SCGR_WALK.concat(['bridge']), 2, { warnOn: ['cycleway'] }),
  'animal-graze': _scgrRule(['field', 'meadow', 'heath', 'grass', 'lawn', 'park'], 3),
  'animal-dog': _scgrRule(_SCGR_WALK.concat(['bridge']), 3),
  animal: _scgrRule(_SCGR_WALK.concat(['verge', 'field', 'bridge']), 3),
  'bird-water': _scgrRule(['water', 'bank', 'reedbed', 'mud', 'beach', 'sand', 'shingle', 'grass', 'lawn', 'park', 'edge'], 3),
  'bird-ground': _scgrRule(_SCGR_WALK.concat(['rooftop', 'edge', 'mud', 'verge', 'field', 'bridge']), 3),
  'bird-air': _scgrRule([], 0, { exempt: true }),
  air: _scgrRule([], 0, { exempt: true }),
  // pit: a tree or shrub in a pit in hard ground, only with pit: true (a street tree; a mapped tree in a square, yard or car park)
  tree: _scgrRule(_SCGR_PLANT, 4, { pit: ['pavement', 'plaza', 'plot', 'parking'] }),
  shrub: _scgrRule(_SCGR_PLANT, 3, { pit: ['pavement', 'plaza', 'plot', 'parking'], edgeOn: ['reedbed', 'mud'] }),
  cover: _scgrRule(Object.keys(SCENE_SURFACE_KINDS).filter(k => k !== 'water'), 1.5, { cover: true }),
  street: _scgrRule(['pavement', 'plaza', 'platform', 'path', 'towpath', 'park', 'grass', 'lawn', 'garden', 'parking', 'bridge', 'edge'], 1.5, { kerbside: 0.6 }),
  rail: _scgrRule(['rail', 'platform', 'tramway'], 1.5),
  building: _scgrRule(_SCGR_BUILD, 6, { over: true }),
  structure: _scgrRule(_SCGR_BUILD.concat(['plaza', 'bank', 'pavement', 'edge', 'beach', 'sand', 'shingle', 'rock']), 6, { over: true }),
  landmark: _scgrRule(_SCGR_BUILD.concat(['plaza', 'bank', 'pavement', 'edge', 'beach', 'sand', 'shingle', 'rock', 'heath']), 0, { over: true, fix: true }),
  rock: _scgrRule(Object.keys(SCENE_SURFACE_KINDS).filter(k => k !== 'water' && !SCENE_SURFACE_KINDS[k].hard).concat(['rock']), 3, { bankWater: 3 }),
});
/** Where traffic keeps LEFT (9.1): ISO country codes, and the boxes [lat0, lon0, lat1, lon1] that find them from the camera. */
const SCENE_DRIVE_LEFT = Object.freeze({
  countries: Object.freeze(['GB', 'IE', 'IM', 'JE', 'GG', 'JP', 'AU', 'NZ', 'IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'ZA', 'HK', 'MO', 'SG', 'MY', 'TH', 'ID', 'BN', 'KE', 'UG', 'TZ', 'MZ', 'ZW', 'ZM', 'BW', 'NA', 'JM', 'TT', 'BB', 'MU', 'CY', 'MT', 'FJ']),
  boxes: Object.freeze([[49.8, -8.7, 60.9, 1.8], [51.3, -10.7, 55.5, -5.9], [24, 122.9, 45.6, 146], [-44, 112.8, -10, 154], [-47.5, 166, -34, 179], [6.7, 68, 35.6, 89.5],
    [-35, 16.4, -22, 33], [22.1, 113.8, 22.6, 114.4], [1.15, 103.6, 1.48, 104.1], [0.8, 99.6, 7.4, 119.3], [5.6, 97.3, 20.5, 105.7], [-11, 95, 6, 141], [35.5, 32.2, 35.75, 34.6], [35.78, 14.18, 36.08, 14.58]]),
});
/** 'left' or 'right' for a scene: D's sceneDriveSide when loaded (one answer for flows and placements), else the table above. */
function _scgrDrive(data) {
  if (typeof sceneDriveSide === 'function') { try { const s = sceneDriveSide(data); if (s === 'left' || s === 'right') return s; } catch (e) { /* the table */ } }
  if (data && (data.drive === 'left' || data.drive === 'right')) return data.drive;
  const c = (data && data.camera) || {}, v = (data && data.view) || {}, lat = _scgrNum(c.lat, v.lat), lon = _scgrNum(c.lon, v.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'left';
  return SCENE_DRIVE_LEFT.boxes.some(b => lat >= b[0] && lat <= b[2] && lon >= b[1] && lon <= b[3]) ? 'left' : 'right';
}

/* ---------- the camera (2.1, 2.2) ---------- */
/** Is this scene data v2? Its camera has eye, horizon, fov or preset (the same rule as C's sceneAtmosIsV2). */
function sceneIsV2(data) {
  const c = data && typeof data === 'object' ? data.camera : null;
  return !!(c && typeof c === 'object' && (c.eye != null || c.horizon != null || c.fov != null || c.preset != null));
}
const _scgrCams = new WeakMap();
/** The bands of a scene: its layers with `d` ranges (2.3), else SCENE_BANDS_DEFAULT; at most 8. -> [{ id, i, d0, d1 }] */
function _scgrBands(data) {
  const ls = Array.isArray(data && data.layers) && data.layers.length && data.layers.some(l => l && Array.isArray(l.d)) ? data.layers.slice(0, 8) : SCENE_BANDS_DEFAULT;
  return ls.map((l, i) => {
    const d = Array.isArray(l.d) && l.d.length === 2 ? [Math.max(0, _scgrNum(l.d[0], 0)), l.d[1] === null || l.d[1] === Infinity || !Number.isFinite(l.d[1]) ? Infinity : l.d[1]] : null;
    return { id: String(l.id), i, d0: d ? d[0] : null, d1: d ? d[1] : null };
  });
}
/** The relief grid (2.4), checked: { x: [x0, x1], d: [d0, d1], nx, nd, h: [...] } or null. */
function _scgrRelief(g) {
  const r = g && typeof g === 'object' && !Array.isArray(g) ? g.relief : null;
  if (!r || !Array.isArray(r.x) || !Array.isArray(r.d) || !Array.isArray(r.h)) return null;
  const nx = r.nx | 0, nd = r.nd | 0;
  if (nx < 2 || nd < 2 || r.h.length !== nx * nd || !r.h.every(Number.isFinite) || !(r.x[1] > r.x[0]) || !(r.d[1] > r.d[0]) || !(r.d[0] > 0)) return null;
  return { x: [r.x[0], r.x[1]], d: [r.d[0], r.d[1]], nx, nd, h: r.h.slice(), src: r.src || null };
}
/**
 * The camera of a v2 scene (2.1), memoised per data object: { eye, fov, horizon, heading, x0, f, dMin, dMax, water, lat, lon, alt,
 * bands, relief, preset }. A preset (G's sceneCameraPreset) fills what the author left out; the author's numbers win.
 */
function sceneCamera(data) {
  if (data && typeof data === 'object' && _scgrCams.has(data)) return _scgrCams.get(data);
  const c0 = (data && data.camera) || {}, v = (data && data.view) || {};
  let c = c0;
  if (c0.preset && typeof sceneCameraPreset === 'function') { try { const p = sceneCameraPreset(c0.preset, c0); if (p) c = Object.assign({}, p, c0); } catch (e) { /* the defaults */ } }
  const eye = _scgrClamp(_scgrNum(c.eye, 1.65), 0.2, 3000), fov = _scgrClamp(_scgrNum(c.fov, 66), 10, 150), horizon = _scgrClamp(_scgrNum(c.horizon, 470), -1000, 880);
  const heading = (((_scgrNum(c.heading, _scgrNum(v.heading, 180))) % 360) + 360) % 360, x0 = _scgrNum(c.x0, 800), f = 800 / Math.tan(fov * _SCGR_DEG / 2);
  const cam = { eye, fov, horizon, heading, x0, f, dMin: f * eye / (900 - horizon), dMax: SCENE_DMAX, water: _scgrNum(c.water, 0),
    lat: _scgrNum(c.lat, _scgrNum(v.lat, null)), lon: _scgrNum(c.lon, _scgrNum(v.lon, null)), alt: _scgrNum(c.alt, null),
    bands: _scgrBands(data), relief: _scgrRelief(data && data.ground), preset: c.preset || null };
  if (data && typeof data === 'object') _scgrCams.set(data, cam);
  return cam;
}
/** The ground height at (x, d) in metres (2.4): bilinear in (x, log d) over the relief grid, clamped at its edges; 0 without relief. */
function sceneGroundHeight(cam, x, d) {
  const r = cam && cam.relief;
  if (!r) return 0;
  const u = _scgrClamp((x - r.x[0]) / (r.x[1] - r.x[0]), 0, 1) * (r.nx - 1);
  const w = _scgrClamp(Math.log(Math.max(d, 1e-3) / r.d[0]) / Math.log(r.d[1] / r.d[0]), 0, 1) * (r.nd - 1);
  const i = Math.min(r.nx - 2, Math.floor(u)), j = Math.min(r.nd - 2, Math.floor(w)), fu = u - i, fw = w - j, H = (a, b) => r.h[b * r.nx + a];
  return (H(i, j) * (1 - fu) + H(i + 1, j) * fu) * (1 - fw) + (H(i, j + 1) * (1 - fu) + H(i + 1, j + 1) * fu) * fw;
}
/** The screen point of a ground point (2.2): { X, Y, k: f / d }. h null: the ground (relief) height at (x, d); a number: that height. */
function sceneProject(cam, x, d, h) {
  const dd = Math.max(0.01, d), k = cam.f / dd, hh = h == null ? sceneGroundHeight(cam, x, dd) : h;
  return { X: cam.x0 + k * x, Y: cam.horizon + k * (cam.eye - hh), k };
}
/**
 * The ground point under a screen point (2.2): { x, d }, or null where the ray meets no ground (above the horizon on flat ground).
 * With relief: the NEAREST crossing of the ray and the ground (what the eye sees), bracketed on a log-depth scan, then 6 Newton
 * steps (bisection when a step leaves the bracket).
 */
function sceneUnproject(cam, X, Y) {
  if (!cam.relief) {
    if (!(Y > cam.horizon + 1e-6)) return null;
    const d = cam.f * cam.eye / (Y - cam.horizon);
    return { x: (X - cam.x0) * d / cam.f, d };
  }
  // g(d) = the ground's row at depth d along this column minus Y: positive near the camera, the first sign change is the hit
  const g = (dd) => { const x = (X - cam.x0) * dd / cam.f; return cam.horizon + cam.f * (cam.eye - sceneGroundHeight(cam, x, dd)) / dd - Y; };
  let a = Math.max(0.05, cam.dMin * 0.3), ga = g(a), b = null;
  const step = Math.pow(cam.dMax / a, 1 / 96);
  for (let i = 1; i <= 96; i++) { const t = a * step, gt = g(t); if (ga > 0 && gt <= 0) { b = t; break; } a = t; ga = gt; }
  if (b == null) return null;
  let d = (a + b) / 2;
  for (let n = 0; n < 6; n++) {
    const e = Math.max(1e-5, d * 1e-5), g0 = g(d);
    if (Math.abs(g0) < 1e-10) break;
    if (g0 > 0) a = d; else b = d;
    const dg = (g(d + e) - g(d - e)) / (2 * e), nd = dg ? d - g0 / dg : NaN;
    d = nd > a && nd < b ? nd : (a + b) / 2;
  }
  for (let n = 0; n < 40 && Math.abs(g(d)) > 1e-7; n++) { if (g(d) > 0) a = d; else b = d; d = (a + b) / 2; }
  return { x: (X - cam.x0) * d / cam.f, d };
}
/** The layer index of a depth (2.3): the band holding d (the explicit-only 'front' band never), the nearest band under the first, the farthest past the last. */
function sceneDepthBand(cam, d) {
  const bands = (cam && cam.bands) || [];
  let near = -1, far = -1, nearD = Infinity, farD = -Infinity;
  for (const b of bands) {
    if (b.d0 == null) continue;
    if (d >= b.d0 && d < b.d1) return b.i;
    if (b.d0 < nearD) { nearD = b.d0; near = b.i; }
    if (b.d1 > farD) { farD = b.d1; far = b.i; }
  }
  if (near < 0) return Math.max(0, bands.length - 1);
  return d < nearD ? near : far;
}
/** The flat-ground row of a depth (the draw-order key z, 4.6). */
const _scgrRow = (cam, d) => cam.horizon + cam.f * cam.eye / Math.max(0.01, d);

/* ---------- geometry in ground metres ---------- */
/** Catmull-Rom through the points (uniform, about one point per 3 m, at most 24 per span): the same smoothing as the flows (D). */
function _scgrSmooth(pts) {
  if (!pts || pts.length < 3) return (pts || []).map(p => [p[0], p[1]]);
  const out = [], P = (i) => pts[_scgrClamp(i, 0, pts.length - 1)];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), n = _scgrClamp(Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 3), 1, 24);
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
  return out;
}
/** The polyline offset by `off` metres to the LEFT of its direction (negative: to the right); the same as the flows (D). */
function _scgrOffset(pts, off) {
  if (!off) return pts.map(p => p.slice());
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b[0] - a[0], td = b[1] - a[1], l = Math.hypot(tx, td) || 1;
    return [p[0] - td / l * off, p[1] + tx / l * off];
  });
}
function _scgrLen(pts) { let n = 0; for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return n; }
/** The point and unit tangent at s metres along a polyline: [x, d, tx, td]. */
function _scgrAlong(pts, s) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + l >= s || i === pts.length - 1) { const u = l ? _scgrClamp((s - acc) / l, 0, 1) : 0; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, l ? (b[0] - a[0]) / l : 0, l ? (b[1] - a[1]) / l : 1]; }
    acc += l;
  }
  const p = pts[0] || [0, 1];
  return [p[0], p[1], 0, 1];
}
/** The nearest point of a polyline to (x, d): { s (metres along), off (signed, + to the left), x, d, tx, td, dist }. */
function _scgrNearestOn(pts, x, d) {
  let best = null, acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], vx = b[0] - a[0], vd = b[1] - a[1], l2 = vx * vx + vd * vd, l = Math.sqrt(l2);
    const u = l2 ? _scgrClamp(((x - a[0]) * vx + (d - a[1]) * vd) / l2, 0, 1) : 0, px = a[0] + vx * u, pd = a[1] + vd * u, dist = Math.hypot(x - px, d - pd);
    if (!best || dist < best.dist) {
      const tx = l ? vx / l : 0, td = l ? vd / l : 1, off = (x - px) * -td + (d - pd) * tx;   // + on the left normal (-td, tx)
      best = { s: acc + l * u, off, x: px, d: pd, tx, td, dist };
    }
    acc += l;
  }
  return best;
}
function _scgrInPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function _scgrBox(poly) { let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity; for (const p of poly) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > e) e = p[1]; } return [a, b, c, e]; }
/** The horizontal slices [x0, x1] of a polygon at depth d (even-odd). */
function _scgrSpans(poly, d) {
  const xs = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > d) !== (yj > d)) xs.push(xi + (d - yi) * (xj - xi) / (yj - yi)); }
  xs.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] > xs[i]) out.push([xs[i], xs[i + 1]]);
  return out;
}
/** The distance from (x, d) to a polygon's boundary. */
function _scgrEdgeDist(poly, x, d) {
  let m = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i], vx = b[0] - a[0], vd = b[1] - a[1], l2 = vx * vx + vd * vd, u = l2 ? _scgrClamp(((x - a[0]) * vx + (d - a[1]) * vd) / l2, 0, 1) : 0;
    m = Math.min(m, Math.hypot(x - a[0] - vx * u, d - a[1] - vd * u));
  }
  return m;
}
/** Sutherland-Hodgman against one half-plane a*x + b*d + c >= 0 (works for any polygon; marks points made on the line). */
function _scgrClipHalf(poly, a, b, c, tag) {
  const out = [], n = poly.length;
  if (!n) return out;
  const side = p => a * p[0] + b * p[1] + c;
  for (let i = 0; i < n; i++) {
    const P = poly[i], Q = poly[(i + 1) % n], sp = side(P), sq = side(Q);
    if (sp >= 0) out.push(P);
    if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); const p = [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]; p.cut = tag || true; out.push(p); }
  }
  return out;
}
/** A ground polygon clipped to the view frustum (3.2: d from dNear to dFar, the columns -200 to 1800) and to a depth range. */
function _scgrClipView(cam, poly, d0, d1) {
  const xl = (-200 - cam.x0) / cam.f, xr = (1800 - cam.x0) / cam.f;   // x = xl * d and x = xr * d: the frustum's sides
  let p = poly;
  p = _scgrClipHalf(p, 0, 1, -Math.max(d0, 0.05), 'near');
  if (Number.isFinite(d1)) p = _scgrClipHalf(p, 0, -1, d1, 'far');
  p = _scgrClipHalf(p, 1, -xl, 0, 'side');
  p = _scgrClipHalf(p, -1, xr, 0, 'side');
  return p.length >= 3 ? p : [];
}
/** The frustum between two depths as a ground polygon (a rest surface, a band, the sea). */
function _scgrWedge(cam, d0, d1) {
  const xl = (-200 - cam.x0) / cam.f, xr = (1800 - cam.x0) / cam.f, a = Math.max(0.05, d0), b = Math.min(SCENE_DMAX, d1);
  return [[xl * a * 1.01, a], [xr * a * 1.01, a], [xr * b * 1.01, b], [xl * b * 1.01, b]];
}
/** Densify a ground polygon's edges so a relief follows them (2.4): pieces of at most 1/8 of the local depth. */
function _scgrDensify(cam, poly) {
  if (!cam.relief) return poly;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], n = _scgrClamp(Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.max(1, Math.min(a[1], b[1]) / 8)), 1, 40);
    for (let j = 0; j < n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
  }
  return out;
}
/** Project a ground polygon to the screen (at height h: null the ground, a number a level). */
function _scgrProjPoly(cam, poly, h) { return _scgrDensify(cam, poly).map(p => { const q = sceneProject(cam, p[0], p[1], h); return [q.X, q.Y]; }); }
const _scgrF1 = v => Math.round(v * 10) / 10;
/** SVG path data for screen polygons (scene units, 0.1 precision); empty polygons dropped. */
function _scgrPathD(polys) {
  let s = '';
  for (const P of polys) { if (!P || P.length < 3) continue; s += 'M' + P.map(p => _scgrF1(p[0]) + ' ' + _scgrF1(p[1])).join('L') + 'z'; }
  return s;
}

/**
 * Screen-space polygon difference S minus the union of Bs (nonzero winding for each), exact for straight edges: slabs between
 * every vertex row and edge crossing, intervals per slab, trapezoids chained into polygons. Returns [polygon].
 */
function _scgrPolyMinus(S, Bs) {
  const polys = [S].concat(Bs), edges = [];
  polys.forEach((P, pi) => {
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if (a[1] === b[1]) continue;
      const down = a[1] < b[1], lo = down ? a : b, hi = down ? b : a;
      edges.push({ x0: lo[0], y0: lo[1], y1: hi[1], k: (hi[0] - lo[0]) / (hi[1] - lo[1]), p: pi, w: down ? 1 : -1 });
    }
  });
  const sb = _scgrBox(S), ys = new Set();
  for (const P of polys) for (const p of P) if (p[1] >= sb[1] && p[1] <= sb[3]) ys.add(p[1]);
  ys.add(sb[1]); ys.add(sb[3]);
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const e = edges[i], g = edges[j], lo = Math.max(e.y0, g.y0, sb[1]), hi = Math.min(e.y1, g.y1, sb[3]);
    if (!(hi > lo) || e.k === g.k) continue;
    const y = (g.x0 - g.k * g.y0 - e.x0 + e.k * e.y0) / (e.k - g.k);
    if (y > lo && y < hi) ys.add(y);
  }
  const rows = [...ys].sort((a, b) => a - b), xAt = (e, y) => e.x0 + (y - e.y0) * e.k;
  const out = [];
  let open = [];   // chains { L: [[x, y]...], R: [[x, y]...], lb, rb } open at the previous slab's bottom
  const close = (ch) => { if (ch.L.length + ch.R.length >= 3) out.push(ch.L.concat(ch.R.slice().reverse())); };
  for (let r = 0; r + 1 < rows.length; r++) {
    const ya = rows[r], yb = rows[r + 1];
    if (yb - ya < 1e-7) continue;
    const ym = (ya + yb) / 2, act = edges.filter(e => e.y0 <= ym && e.y1 > ym).map(e => ({ e, x: xAt(e, ym) })).sort((a, b) => a.x - b.x);
    // per polygon: the intervals where its winding is nonzero, as [leftEdge, rightEdge]
    const ivs = polys.map(() => []), wind = polys.map(() => 0), from = polys.map(() => null);
    for (const a of act) {
      const p = a.e.p, was = wind[p];
      wind[p] += a.e.w;
      if (was === 0 && wind[p] !== 0) from[p] = a;
      else if (was !== 0 && wind[p] === 0) ivs[p].push([from[p], a]);
    }
    // the union of the holes, then S minus it
    const holes = [];
    for (let p = 1; p < polys.length; p++) for (const iv of ivs[p]) holes.push(iv);
    holes.sort((a, b) => a[0].x - b[0].x);
    const U = [];
    for (const h of holes) { const last = U[U.length - 1]; if (last && h[0].x <= last[1].x) { if (h[1].x > last[1].x) last[1] = h[1]; } else U.push([h[0], h[1]]); }
    const pieces = [];
    for (const [l0, r0] of ivs[0]) {
      let l = l0;
      for (const [hl, hr] of U) {
        if (hr.x <= l.x || hl.x >= r0.x) continue;
        if (hl.x > l.x) pieces.push([l, hl]);
        l = hr;
        if (l.x >= r0.x) break;
      }
      if (l.x < r0.x) pieces.push([l, r0]);
    }
    const next = [];
    for (const [l, rr] of pieces) {
      const lt = [xAt(l.e, ya), ya], rt = [xAt(rr.e, ya), ya], lb = [xAt(l.e, yb), yb], rbt = [xAt(rr.e, yb), yb];
      const ci = open.findIndex(ch => Math.abs(ch.lb[0] - lt[0]) < 1e-6 && Math.abs(ch.rb[0] - rt[0]) < 1e-6 && Math.abs(ch.lb[1] - ya) < 1e-9);
      let ch;
      if (ci >= 0) { ch = open[ci]; open.splice(ci, 1); ch.L.push(lb); ch.R.push(rbt); }
      else ch = { L: [lt, lb], R: [rt, rbt] };
      ch.lb = lb; ch.rb = rbt;
      next.push(ch);
    }
    for (const ch of open) close(ch);
    open = next;
  }
  for (const ch of open) close(ch);
  return out;
}

/* ---------- colours ---------- */
/** A colour mix in hex (the core's _scMix). */
const _scgrMix = (a, b, t) => (typeof _scMix === 'function' ? _scMix(a, b, t) : a);
const _SCGR_HAZE = '#c9d4da';   // the neutral the compile hazes far stops toward (the light grades it; C's pass adds the real colour)
/** The haze of a depth at compile: C's sceneHazeAt on the authored atmosphere when loaded, else none (7.1, 3.3). */
function _scgrHaze(G, d) {
  if (typeof sceneHazeAt !== 'function' || !(d > 0)) return 0;
  try { return _scgrClamp(sceneHazeAt(Math.min(d, 30000), G.atmos || (G.data && G.data.atmos) || 'clear', null) || 0, 0, 0.9); } catch (e) { return 0; }
}
/** A surface's [far, near] paint for the season: the scene palette's slot (the surface's paint, or its kind) else the table. */
function _scgrPaints(G, s) {
  const se = G.season, pal = (G.data && G.data.palette) || {};
  const slotOf = (name) => { const p = (pal[se] && pal[se][name] != null) ? pal[se][name] : pal.base ? pal.base[name] : undefined; return p == null ? null : Array.isArray(p) ? [p[0], p[p.length > 1 ? 1 : 0]] : [p, p]; };
  const named = s.paint ? slotOf(String(s.paint).replace(/^@/, '')) : null;
  if (named) return named;
  if (s.kind === 'edge') { const look = _SCGR_EDGE_LOOKS[s.look || s.edge] || _SCGR_EDGE_LOOKS.coping; return slotOf('edge-' + (s.look || s.edge || 'coping')) || look; }
  if (s.kind === 'field' && s.crop && _SCGR_CROPS[s.crop]) return slotOf('field-' + s.crop) || _SCGR_CROPS[s.crop][se] || _SCGR_CROPS[s.crop].summer;
  const k = SCENE_SURFACE_KINDS[s.kind] || SCENE_SURFACE_KINDS.grass;
  return slotOf(s.kind) || (_SCGR_KIND_ALIAS[s.kind] && slotOf(_SCGR_KIND_ALIAS[s.kind])) || k.col[se] || k.col.summer;
}
/** The paint of a depth across the frame: near colour at dNear, far colour by about 400 m (log depth), hazed by distance. */
function _scgrColAt(G, cols, d) {
  const cam = G.cam, t = _scgrClamp(Math.log(Math.max(d, cam.dMin) / cam.dMin) / Math.log(Math.max(400, cam.dMin * 4) / cam.dMin), 0, 1);
  const c = _scgrMix(cols[1], cols[0], t);
  return _scgrMix(c, _SCGR_HAZE, _scgrHaze(G, d));
}

/* ---------- surfaces (3.2, 3.3) ---------- */
function sceneSurfaceKinds() { return SCENE_SURFACE_KINDS; }
const _SCGR_ID_RE = /^[a-z0-9-]{1,30}$/;
/** The strips' smoothed centrelines and widths, the beside chain resolved (a parent may be a water channel). id -> { path, width } */
function _scgrStrips(data) {
  const decl = new Map();
  for (const s of (data && Array.isArray(data.surfaces) ? data.surfaces : [])) if (s && s.id) decl.set(s.id, { src: s, width: _scgrNum(s.width, 0) });
  for (const w of (data && Array.isArray(data.water) ? data.water : [])) if (w && w.id && !decl.has(w.id)) decl.set(w.id, { src: w, width: _scgrNum(w.width, 0), water: true });
  const centre = (id, seen) => {
    const e = decl.get(id);
    if (!e || e.path !== undefined) return e;
    e.path = null;
    if (seen.has(id)) return e;
    seen.add(id);
    const s = e.src;
    if (Array.isArray(s.path) && s.path.length >= 2 && s.path.every(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))) e.path = _scgrSmooth(s.path);
    else if (s.beside && decl.has(s.beside)) {
      const p = centre(s.beside, seen);
      if (p && p.path) e.path = _scgrOffset(p.path, (s.side === 'right' ? -1 : 1) * ((p.width || 0) / 2 + _scgrNum(s.gap, 0) + (e.width || 0) / 2));
    }
    return e;
  };
  for (const id of [...decl.keys()]) centre(id, new Set());
  return decl;
}
/** A strip's ground polygon from its centreline and width (left edge out, right edge back). */
function _scgrStripPoly(path, width) {
  const L = _scgrOffset(path, width / 2), R = _scgrOffset(path, -width / 2);
  return L.concat(R.reverse());
}
/** The water regions' declared geometry: [{ id, kind, polyM (unclipped), path, width, src }] (canals from a centreline, 5.1). */
function _scgrWaterDecl(data, cam, strips, problems) {
  const out = [];
  (Array.isArray(data.water) ? data.water : []).forEach((w, wi) => {
    if (!w || typeof w !== 'object' || w.d != null) return;   // a pixel water area (v1 form) compiles as in v1
    const id = String(w.id || 'water-' + wi), kind = w.kind || (w.path ? 'canal' : w.band ? 'sea' : 'lake');
    let poly = null, path = null, width = 0;
    const e = strips.get(w.id);
    if (e && e.path && _scgrNum(w.width, 0) > 0) { path = e.path; width = w.width; poly = _scgrStripPoly(path, width); }
    else if (Array.isArray(w.poly) && w.poly.length >= 3) poly = w.poly.map(p => [p[0], p[1]]);
    else if (Array.isArray(w.band) && w.band.length === 2) poly = _scgrWedge(cam, _scgrNum(w.band[0], cam.dMin), w.band[1] == null || !Number.isFinite(w.band[1]) ? SCENE_DMAX : w.band[1]);
    if (!poly) { problems.push({ rule: 'water', sev: 'error', i: wi, obj: null, at: null, msg: `water[${wi}] ${id}: give path + width, poly or band`, fix: 'a canal is { path: [[x, d], ...], width }' }); return; }
    out.push({ id, kind, polyM: poly, path, width, src: w, wi });
  });
  return out;
}
/**
 * The surfaces of a v2 scene (3.2, 3.3), into G: G.surfaces = [{ id, kind, flags, polyM, groundIdx, path?, width?, crossing?, look? }]
 * in paint order (a rest first), G.ground (the drawable fills per band, with textures, markings and kerbs; water cut out of every
 * surface nearer than the water's own band), and G.waterDecl (the regions' geometry for sceneWaterCompile).
 */
function sceneSurfacesCompile(data, cam, G) {
  G = G || { data, cam, season: 'summer', problems: [], ground: [], surfaces: [] };
  const problems = G.problems, strips = _scgrStrips(data), list = [], seen = new Set();
  const bad = (i, msg, fix) => problems.push({ rule: 'surface', sev: 'error', i, obj: null, at: null, msg, fix });
  const decl = Array.isArray(data.surfaces) ? data.surfaces : [];
  let rest = null;
  decl.forEach((s, si) => {
    if (!s || typeof s !== 'object') return;
    const id = String(s.id || ''), kind = s.kind || (s.rest ? 'grass' : null);
    if (!_SCGR_ID_RE.test(id)) { bad(si, `surfaces[${si}]: the id "${id}" must match [a-z0-9-]{1,30}`, 'id: a short lower-case name'); return; }
    if (seen.has(id)) { bad(si, `surfaces[${si}]: the id ${id} is used twice`, 'give each surface its own id'); return; }
    if (!SCENE_SURFACE_KINDS[kind] || kind === 'water') { bad(si, `surfaces[${si}] ${id}: unknown kind ${kind}`, 'kind: one of ' + Object.keys(SCENE_SURFACE_KINDS).filter(k => k !== 'water').join(' ')); return; }
    seen.add(id);
    let poly = null;
    if (s.rest) { if (rest) { bad(si, `surfaces[${si}] ${id}: a second rest surface`, 'at most one rest: true'); return; } poly = _scgrWedge(cam, cam.dMin * 0.9, SCENE_DMAX); }
    else if (Array.isArray(s.band) && s.band.length === 2) poly = _scgrWedge(cam, _scgrNum(s.band[0], cam.dMin * 0.9), s.band[1] == null || !Number.isFinite(s.band[1]) ? SCENE_DMAX : s.band[1]);
    else if (Array.isArray(s.poly) && s.poly.length >= 3) poly = s.poly.map(p => [p[0], p[1]]);
    else { const e = strips.get(id); if (e && e.path && e.width > 0) poly = _scgrStripPoly(e.path, e.width); }
    if (!poly) { bad(si, `surfaces[${si}] ${id}: no geometry (rest, band, poly, path + width, or beside + width)`, s.beside ? `beside: ${s.beside} is not a strip or water channel` : 'add path and width'); return; }
    const e = strips.get(id), rec = { id, kind, src: s, poly, path: e && e.path && e.width > 0 ? e.path : null, width: e && e.width > 0 ? e.width : null, si };
    if (s.rest) { rest = rec; list.unshift(rec); } else list.push(rec);
  });
  if (!rest) { const id = seen.has('rest') ? 'rest-auto' : 'rest'; list.unshift({ id, kind: 'grass', src: { id, kind: 'grass', rest: true }, poly: _scgrWedge(cam, cam.dMin * 0.9, SCENE_DMAX), path: null, width: null, si: -1, auto: true }); }
  // canal banks (5.1): the towpath and its coping, a wall or a garden edge, beside the channel (<water id>-left / -right, as the flows name them)
  const waterDecl = _scgrWaterDecl(data, cam, strips, problems);
  for (const w of waterDecl) {
    if (!w.path || !w.src.banks) continue;
    for (const side of ['left', 'right']) {
      const b = w.src.banks[side];
      if (!b) continue;
      const sg = side === 'right' ? -1 : 1, bw = _scgrNum(b.width, 0), kind = SCENE_SURFACE_KINDS[b.surface] && b.surface !== 'water' ? b.surface : 'towpath';
      const id = w.id + '-' + side;
      if (bw > 0 && !seen.has(id)) { const path = _scgrOffset(w.path, sg * (w.width / 2 + bw / 2)); list.push({ id, kind, src: { id, kind, bank: w.id }, poly: _scgrStripPoly(path, bw), path, width: bw, si: -1, bank: true }); seen.add(id); }
      const edge = b.edge || (w.kind === 'canal' ? 'coping' : null);
      if (edge && edge !== 'natural' && edge !== 'beach') {
        const ew = edge === 'wall' ? 0.45 : 0.4, path = _scgrOffset(w.path, sg * (w.width / 2 + ew / 2 - 0.02)), eid = id + '-edge';
        if (!seen.has(eid)) { list.push({ id: eid, kind: 'edge', src: { id: eid, kind: 'edge', look: edge }, look: edge, poly: _scgrStripPoly(path, ew), path, width: ew, si: -1, bank: true }); seen.add(eid); }
      }
    }
  }
  G.waterDecl = waterDecl;
  // clip every surface to the view, then emit its fills per band (water nearer than its own band cut out)
  const bands = cam.bands.filter(b => b.d0 != null), dNear = cam.dMin * 0.9;
  const waterScreen = waterDecl.map(w => {
    const poly = _scgrClipView(cam, w.polyM, dNear, SCENE_DMAX);
    if (!poly.length) return null;
    const level = cam.water + (cam.relief ? sceneGroundHeight(cam, 0, Math.min(...poly.map(p => p[1]))) : 0);
    const dFar = Math.max(...poly.map(p => p[1]));
    // the hole in nearer ground is the channel's FOOTPRINT at ground level: the near bank's top hides the lower water surface
    return { id: w.id, scr: _scgrProjPoly(cam, poly, null), layer: sceneDepthBand(cam, dFar * 0.999), box: null };
  }).filter(Boolean);
  for (const ws of waterScreen) ws.box = _scgrBox(ws.scr);
  G.surfaces = [];
  for (const s of list) {
    const polyM = _scgrClipView(cam, s.poly, dNear, SCENE_DMAX);
    const flags = Object.assign({}, SCENE_SURFACE_KINDS[s.kind]);
    if (s.kind === 'bridge') { flags.walk = s.src.walk !== false; flags.drive = Array.isArray(s.src.drive) ? s.src.drive.slice() : []; }
    if (s.kind === 'rail' && s.src.tram) flags.rail = ['train', 'tram'];
    const rec = { id: s.id, kind: s.kind, flags, polyM: polyM.map(p => [_scgrR2(p[0]), _scgrR2(p[1])]), groundIdx: [] };
    if (s.path) { rec.path = s.path.map(p => [_scgrR2(p[0]), _scgrR2(p[1])]); rec.width = s.width; }
    if (s.src.crossing) rec.crossing = true;
    if (s.look) rec.look = s.look;
    if (s.src.over) rec.over = s.src.over;
    if (s.bank) rec.bank = true;
    G.surfaces.push(rec);
    if (!polyM.length) continue;
    const cols = _scgrPaints(G, s);
    for (const b of bands) {
      const piece = _scgrClipView(cam, polyM, Math.max(b.d0, dNear), b.d1);
      if (!piece.length) continue;
      const dA = Math.min(...piece.map(p => p[1])), dB = Math.max(...piece.map(p => p[1]));
      let scr = [_scgrProjPoly(cam, piece, null)];
      // water whose own layer is farther than this band is drawn before this band's ground: cut it out
      const sb = _scgrBox(scr[0]);
      const holes = waterScreen.filter(ws => ws.layer < b.i && !(ws.box[2] < sb[0] || ws.box[0] > sb[2] || ws.box[3] < sb[1] || ws.box[1] > sb[3])).map(ws => ws.scr);
      if (holes.length) scr = _scgrPolyMinus(scr[0], holes);
      const d = _scgrPathD(scr);
      if (!d) continue;
      const yTop = _scgrRow(cam, dB), yBot = _scgrRow(cam, dA);
      const fill = yBot - yTop < 0.5 ? _scgrColAt(G, cols, (dA + dB) / 2) : { lin: [[0, _scgrColAt(G, cols, dB), 1], [1, _scgrColAt(G, cols, dA), 1]], x1: 0, y1: _scgrR1(yTop), x2: 0, y2: _scgrR1(yBot) };
      rec.groundIdx.push(G.ground.length);
      G.ground.push({ layer: b.i, d, fill, surf: s.id });
      _scgrDetails(G, s, rec, b, piece, holes);
    }
  }
  return G;
}
/** One more fill of a surface in a band (texture, markings, kerbs): ground polygons in metres, clipped to the band and the view. */
function _scgrExtra(G, rec, b, polysM, fill, holes, what) {
  const cam = G.cam, scr = [];
  for (const P of polysM) {
    const q = _scgrClipView(cam, P, Math.max(b.d0, cam.dMin * 0.9), b.d1);
    if (!q.length) continue;
    const S = _scgrProjPoly(cam, q, null);
    if (holes && holes.length) { const bx = _scgrBox(S); const hs = holes.filter(h => { const hb = _scgrBox(h); return !(hb[2] < bx[0] || hb[0] > bx[2] || hb[3] < bx[1] || hb[1] > bx[3]); }); if (hs.length) { scr.push(..._scgrPolyMinus(S, hs)); continue; } }
    scr.push(S);
  }
  const d = _scgrPathD(scr);
  if (!d) return;
  rec.groundIdx.push(G.ground.length);
  G.ground.push({ layer: b.i, d, fill, surf: rec.id, mark: what });
}
/** A flat paint at an opacity (a two-stop gradient of one colour: both renderers draw stop opacity). */
const _scgrOp = (col, op) => ({ lin: [[0, col, op], [1, col, op]], x1: 0, y1: 0, x2: 0, y2: 900 });
/** Visible on screen? a ground width w metres at depth d is at least px units wide. */
const _scgrSeen = (cam, w, d, px) => cam.f * w / d >= px;
/** The details of one surface in one band (3.3): kerbs, road markings, rails and sleepers, lawn stripes, paving joints, field rows. */
function _scgrDetails(G, s, rec, b, piece, holes) {
  const cam = G.cam, src = s.src, kind = s.kind, K = SCENE_SURFACE_KINDS[kind], dA = Math.min(...piece.map(p => p[1])), dB = Math.max(...piece.map(p => p[1]));
  const lim = (w, px) => Math.min(dB, cam.f * w / px);   // the farthest depth where a feature w metres wide is px units on screen
  const path = s.path, W = s.width;
  const quad = (x0, d0, x1, d1, x2, d2, x3, d3) => [[x0, d0], [x1, d1], [x2, d2], [x3, d3]];
  // a band of a strip between two offsets (left normal) from metre s0 to s1 along it
  const stripBand = (o0, o1, s0, s1) => {
    const pts = [];
    const n = Math.max(1, Math.ceil((s1 - s0) / 3));
    for (let j = 0; j <= n; j++) { const a = _scgrAlong(path, s0 + (s1 - s0) * j / n); pts.push(a); }
    const L = pts.map(a => [a[0] - a[3] * o0, a[1] + a[2] * o0]), R = pts.map(a => [a[0] - a[3] * o1, a[1] + a[2] * o1]);
    return L.concat(R.reverse());
  };
  const len = path ? _scgrLen(path) : 0;
  // the stretch of a strip inside this band (metres along): from the samples whose depth is in [dA, dB]
  const span = () => {
    if (!path) return null;
    let s0 = Infinity, s1 = -Infinity;
    const n = Math.max(2, Math.ceil(len / 2));
    for (let j = 0; j <= n; j++) { const a = _scgrAlong(path, len * j / n); if (a[1] >= dA - 3 && a[1] <= dB + 3) { s0 = Math.min(s0, len * j / n); s1 = Math.max(s1, len * j / n); } }
    return s1 > s0 ? [Math.max(0, s0 - 3), Math.min(len, s1 + 3)] : null;
  };
  const sp = span();
  const white = '#e8e6de', yellow = '#d8b23a', dark = '#3e3d3b';
  // kerbs (pavements beside a road; platforms' edges): a light top and a dark face on the road side
  if (path && sp && (src.kerb || (kind === 'pavement' && src.beside)) && _scgrSeen(cam, 0.15, dA, 1.2)) {
    const parent = G.surfaces.find(x => x.id === src.beside), sideSign = src.side === 'right' ? 1 : -1;   // the road is on the other side of the beside offset
    if (!src.beside || (parent && ['road', 'tramway', 'parking', 'cycleway', 'driveway'].includes(parent.kind)) || src.kerb) {
      const e = sideSign * W / 2, far = lim(0.15, 1.2);
      const polys = [], faces = [];
      for (let s0 = sp[0]; s0 < sp[1]; s0 += 12) {
        const s1 = Math.min(sp[1], s0 + 12), a = _scgrAlong(path, s0);
        if (a[1] > far) continue;
        polys.push(stripBand(e, e - sideSign * 0.16, s0, s1));
        faces.push(stripBand(e + sideSign * 0.1, e, s0, s1));
      }
      if (polys.length) { _scgrExtra(G, rec, b, faces, _scgrColAt(G, ['#6c6a66', '#5a5854'], (dA + dB) / 2), holes, 'kerb-face'); _scgrExtra(G, rec, b, polys, _scgrColAt(G, _SCGR_EDGE_LOOKS.kerb, (dA + dB) / 2), holes, 'kerb'); }
    }
  }
  if (!path || !sp) {
    // polygons and bands: lawn stripes / field rows across depth, kept near
    if ((K.look === 'lawn' || kind === 'field') && b.d0 < 60 && _scgrSeen(cam, 0.6, dA, 2)) {
      const xs = piece.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), far = Math.min(dB, 60), step = kind === 'field' ? 1.6 : 2.4, polys = [];
      for (let x = Math.floor(x0 / step) * step; x < x1; x += step * 2) polys.push(quad(x, dA, x + step, dA, x + step, far, x, far));
      if (polys.length) _scgrExtra(G, rec, b, polys.map(P => _scgrClipPolyTo(P, piece)).filter(P => P.length >= 3), _scgrOp(kind === 'field' ? _scgrColAt(G, ['#6e7a44', '#5a6436'].map(c => _scgrMix(c, _scgrPaints(G, s)[1], 0.5)), (dA + far) / 2) : _scgrColAt(G, _scgrPaints(G, s).map(c => _scgrMix(c, '#ffffff', 0.2)), (dA + far) / 2), 0.5), holes, kind === 'field' ? 'rows' : 'stripes');
    }
    return;
  }
  // road markings: a dashed centre line (3 m dashes, 6 m gaps, 0.1 m), edge lines, zebra stripes, bay lines
  const marks = src.markings != null ? src.markings : K.marks;
  if ((kind === 'road' || kind === 'tramway') && marks && marks !== 'none') {
    const far = lim(0.1, 0.6), polys = [];
    if (marks === 'zebra') {
      const half = Math.min(W / 2 - 0.2, 1.5);
      for (let s0 = Math.ceil(sp[0]); s0 < sp[1]; s0 += 1) { const a = _scgrAlong(path, s0); if (a[1] <= lim(0.5, 0.6)) polys.push(stripBand(half, -half, s0, s0 + 0.5)); }
      if (polys.length) _scgrExtra(G, rec, b, polys, _scgrColAt(G, [white, white], (dA + dB) / 2), holes, 'zebra');
    } else {
      if ((marks === 'centre' || marks === 'bus' || marks === 'tram') && W >= 5) for (let s0 = Math.floor(sp[0] / 9) * 9; s0 < sp[1]; s0 += 9) { const a = _scgrAlong(path, s0); if (a[1] <= far && s0 + 3 > sp[0]) polys.push(stripBand(0.05, -0.05, Math.max(s0, 0), Math.min(s0 + 3, len))); }
      if (polys.length) _scgrExtra(G, rec, b, polys, _scgrColAt(G, [white, white], (dA + dB) / 2), holes, 'centre');
      const edges = [];
      if ((marks === 'edge' || marks === 'centre' || marks === 'bus') && W >= 5) for (const e of [W / 2 - 0.35, -(W / 2 - 0.35)]) for (let s0 = sp[0]; s0 < sp[1]; s0 += 15) { const a = _scgrAlong(path, s0); if (a[1] <= far) edges.push(stripBand(e + 0.05, e - 0.05, s0, Math.min(sp[1], s0 + 15))); }
      if (edges.length) _scgrExtra(G, rec, b, edges, _scgrColAt(G, [white, white], (dA + dB) / 2), holes, 'edges');
      if (marks === 'bus') { const bp = []; for (let s0 = sp[0]; s0 < sp[1]; s0 += 15) { const a = _scgrAlong(path, s0); if (a[1] <= far) bp.push(stripBand(-(W / 2 - 3.2) + 0.08, -(W / 2 - 3.2) - 0.08, s0, Math.min(sp[1], s0 + 15))); } if (bp.length) _scgrExtra(G, rec, b, bp, _scgrColAt(G, [white, white], (dA + dB) / 2), holes, 'bus'); }
    }
  }
  if (kind === 'parking' && W >= 4) {
    const far = lim(0.1, 0.6), polys = [];
    for (let s0 = Math.floor(sp[0] / 2.4) * 2.4; s0 < sp[1]; s0 += 2.4) { const a = _scgrAlong(path, Math.max(0, s0)); if (a[1] <= far) for (const e of [W / 2, -W / 2 + 4.8]) polys.push(stripBand(e, e - 4.8, Math.max(0, s0), Math.max(0, s0) + 0.1)); }
    if (polys.length) _scgrExtra(G, rec, b, polys, _scgrColAt(G, [white, white], (dA + dB) / 2), holes, 'bays');
  }
  // rails: two per track (1.435 m gauge), sleepers in the near bands only; trams: rails in the road
  if (kind === 'rail' || kind === 'tramway') {
    const tracks = Math.max(1, Math.min(4, src.tracks | 0 || (kind === 'rail' ? (W >= 7 ? 2 : 1) : (W >= 6 ? 2 : 1)))), tw = W / tracks, rails = [], sleepers = [];
    for (let t = 0; t < tracks; t++) {
      const c = W / 2 - tw * (t + 0.5);
      if (kind === 'rail' && b.d0 < 50) for (let s0 = Math.floor(sp[0] / 0.7) * 0.7; s0 < sp[1]; s0 += 0.7) { const a = _scgrAlong(path, Math.max(0, s0)); if (a[1] <= lim(0.25, 1.1)) sleepers.push(stripBand(c + 1.3, c - 1.3, Math.max(0, s0), Math.max(0, s0) + 0.25)); }
      for (const g of [0.7175, -0.7175]) for (let s0 = sp[0]; s0 < sp[1]; s0 += 12) { const a = _scgrAlong(path, s0); if (a[1] <= lim(0.07, 0.5)) rails.push(stripBand(c + g + 0.035, c + g - 0.035, s0, Math.min(sp[1], s0 + 12))); }
    }
    if (sleepers.length) _scgrExtra(G, rec, b, sleepers, _scgrColAt(G, ['#6e6256', '#54483c'], (dA + dB) / 2), holes, 'sleepers');
    if (rails.length) _scgrExtra(G, rec, b, rails, _scgrColAt(G, ['#9a9a9c', '#7a7a7e'], (dA + dB) / 2), holes, 'rails');
  }
  // platform edges: a yellow line 0.1 m wide set 0.6 m in from the track-side edge
  if (kind === 'platform' && (marks === 'platform' || marks == null)) {
    const e = (src.side === 'right' ? 1 : -1) * (W / 2 - 0.6), polys = [];
    for (let s0 = sp[0]; s0 < sp[1]; s0 += 12) { const a = _scgrAlong(path, s0); if (a[1] <= lim(0.1, 0.6)) polys.push(stripBand(e + 0.05, e - 0.05, s0, Math.min(sp[1], s0 + 12))); }
    if (polys.length) _scgrExtra(G, rec, b, polys, _scgrColAt(G, [yellow, yellow], (dA + dB) / 2), holes, 'edge-line');
  }
  // paving joints (pavements, plazas, platforms): transverse lines every 0.9 m, near only
  if ((K.look === 'flags' || K.look === 'setts') && b.d0 < 50) {
    const far = lim(0.04, 0.7), polys = [];
    for (let s0 = Math.floor(sp[0] / 0.9) * 0.9; s0 < sp[1]; s0 += 0.9) { const a = _scgrAlong(path, Math.max(0, s0)); if (a[1] <= far) polys.push(stripBand(W / 2, -W / 2, Math.max(0, s0), Math.max(0, s0) + 0.04)); }
    if (polys.length) _scgrExtra(G, rec, b, polys, _scgrOp(_scgrColAt(G, _scgrPaints(G, s).map(c => _scgrMix(c, dark, 0.4)), (dA + dB) / 2), 0.55), holes, 'joints');
  }
  // gravel paths and towpaths: two worn wheel / foot lines along, near only
  if (K.look === 'gravel' && b.d0 < 50 && W >= 1.6) {
    const far = lim(0.25, 1), polys = [];
    for (const e of [W * 0.2, -W * 0.2]) for (let s0 = sp[0]; s0 < sp[1]; s0 += 12) { const a = _scgrAlong(path, s0); if (a[1] <= far) polys.push(stripBand(e + 0.14, e - 0.14, s0, Math.min(sp[1], s0 + 12))); }
    if (polys.length) _scgrExtra(G, rec, b, polys, _scgrOp(_scgrColAt(G, _scgrPaints(G, s).map(c => _scgrMix(c, '#ffffff', 0.18)), (dA + dB) / 2), 0.35), holes, 'wear');
  }
}
/** A convex-ish clip of P to the bounding depth range of `to` (for textures inside a polygon: the rows stay inside the piece). */
function _scgrClipPolyTo(P, to) {
  // clip against each edge of `to` when it is convex; a concave piece gets no texture (it would spill outside the surface)
  const n = to.length;
  if (n < 3) return [];
  let area = 0;
  for (let i = 0; i < n; i++) { const a = to[i], b = to[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sg = area >= 0 ? 1 : -1, cross = (a, b, q) => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
  for (let i = 0; i < n; i++) if (sg * cross(to[i], to[(i + 1) % n], to[(i + 2) % n]) < -1e-9) return [];
  let q = P;
  for (let i = 0; i < n && q.length; i++) { const a = to[i], b = to[(i + 1) % n]; const nx = -(b[1] - a[1]) * sg, nd = (b[0] - a[0]) * sg; q = _scgrClipHalf(q, nx, nd, -(nx * a[0] + nd * a[1])); }
  return q;
}

/* ---------- water (5.1, 5.2): the geometry; B's water pass draws it ---------- */
const _SCGR_WATER = Object.freeze({
  canal: { base: ['#4a5a48', '#3a4a3e', '#2a362e'], clarity: 0.05, mirror: 0.85, ripple: 0.15, edge: 'coping', foam: 'none' },
  river: { base: ['#5a7480', '#3f5e6a', '#2d4652'], clarity: 0.1, mirror: 0.6, ripple: 0.35, edge: 'natural', foam: 'none' },
  lake: { base: ['#6a8a9a', '#446a7c', '#2a4a5a'], clarity: 0.12, mirror: 0.7, ripple: 0.3, edge: 'natural', foam: 'none' },
  pond: { base: ['#6a8a9a', '#446a7c', '#2a4a5a'], clarity: 0.15, mirror: 0.75, ripple: 0.2, edge: 'natural', foam: 'none' },
  sea: { base: ['#5f8aa6', '#3a6a8c', '#234a66'], clarity: 0.1, mirror: 0.35, ripple: 0.6, edge: 'beach', foam: 'shore' },
  harbour: { base: ['#5a7a8a', '#3a5a6a', '#253f4e'], clarity: 0.05, mirror: 0.55, ripple: 0.35, edge: 'quay', foam: 'none' },
  puddle: { base: ['#7a8a96', '#5a6a76', '#4a5662'], clarity: 0, mirror: 0.7, ripple: 0.25, edge: 'natural', foam: 'none' },
});
/** The channel under the water (its walls and bed where they show): [far, near] by edge look. */
const _SCGR_CHANNEL = Object.freeze({ coping: ['#5e584e', '#4a443c'], wall: ['#5e4a40', '#4a3a32'], quay: ['#545049', '#403c36'], natural: ['#5e5542', '#4a4234'], beach: ['#b8a47e', '#a08c66'] });
/** A intersect B (screen polygons, nonzero): A minus (A minus B). */
function _scgrPolyAnd(A, B) { const out = _scgrPolyMinus(A, [B]); return out.length ? _scgrPolyMinus(A, out) : [A]; }
/** The ground edges of a clipped water polygon (not the frame cuts) as screen polylines. */
function _scgrWaterEdges(cam, poly, level, kind) {
  const out = [];
  let cur = null;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], cut = a.cut && b.cut;
    if (cut) { if (cur) { out.push(cur); cur = null; } continue; }
    const pa = sceneProject(cam, a[0], a[1], level), pb = sceneProject(cam, b[0], b[1], level);
    if (!cur) cur = [[_scgrR1(pa.X), _scgrR1(pa.Y)]];
    cur.push([_scgrR1(pb.X), _scgrR1(pb.Y)]);
  }
  if (cur) out.push(cur);
  return out.filter(p => p.length >= 2).map(pts => ({ pts, kind }));
}
/**
 * The water regions of a v2 scene (5.2), into G.water: each region is ALSO a v1 C.water entry (the v1 path still draws it) in
 * the layer of its FAR edge, with a v2 record for B's pass: { id, kind, polyM, dNear, dFar, level, rowAt, edges, mirror, ripple,
 * clarity, bed, glint, foam, wakes, rings, flow, path?, width?, inset? }. Bridges over a region are cut out of its fill.
 */
function sceneWaterCompile(data, cam, G) {
  G = G || {};
  const decl = G.waterDecl || _scgrWaterDecl(data, cam, _scgrStrips(data), G.problems || []), out = [];
  const pal = (p) => (typeof _scPaint === 'function' && typeof p === 'string' && p[0] === '@' ? _scPaint({ palette: data.palette || {} }, G.season || 'summer', p) : p);
  const bridges = (G.surfaces || []).filter(s => s.kind === 'bridge' && s.polyM && s.polyM.length >= 3);
  for (const w of decl) {
    const D = _SCGR_WATER[w.kind] || _SCGR_WATER.lake, src = w.src;
    const poly = _scgrClipView(cam, w.polyM, cam.dMin * 0.9, SCENE_DMAX);
    if (!poly.length) continue;
    const dNear = Math.min(...poly.map(p => p[1])), dFar = Math.max(...poly.map(p => p[1]));
    const level = cam.water + (cam.relief ? sceneGroundHeight(cam, 0, dNear) : 0);
    // what shows of the water: its surface at its level (below the banks' tops) inside the channel's footprint at ground level
    // (the near bank hides the rest); the channel itself, darker, is a ground fill under it, so the far bank's wall face shows
    // between the far waterline and the far bank's top (5.3 draws the wet band and the coping on it)
    const foot = _scgrProjPoly(cam, poly, null), lev = _scgrProjPoly(cam, poly, level);
    const bridgeHoles = bridges.map(bs => _scgrProjPoly(cam, bs.polyM, null));
    let scr = Math.abs(level) > 0.005 ? _scgrPolyAnd(lev, foot) : [lev];
    if (bridgeHoles.length) scr = scr.flatMap(P => _scgrPolyMinus(P, bridgeHoles));
    const d = _scgrPathD(scr);
    if (!d) continue;
    const chan = bridgeHoles.length ? _scgrPolyMinus(foot, bridgeHoles) : [foot];
    if (Math.abs(level) > 0.005 && G.ground) G.ground.push({ layer: sceneDepthBand(cam, dFar * 0.999), d: _scgrPathD(chan), fill: _scgrColAt(G, _SCGR_EDGE_LOOKS[src.edge || D.edge] ? _SCGR_CHANNEL[src.edge || D.edge] || _SCGR_CHANNEL.natural : _SCGR_CHANNEL.natural, (dNear + Math.min(dFar, 400)) / 2), surf: w.id, mark: 'channel' });
    const y0 = cam.horizon + cam.f * (cam.eye - level) / dFar, y1 = Math.min(900, cam.horizon + cam.f * (cam.eye - level) / dNear);
    const rowAt = [];
    for (let j = 0; j < 16; j++) { const dd = dNear * Math.pow(dFar / dNear, j / 15); rowAt.push([_scgrR2(dd), _scgrR1(cam.horizon + cam.f * (cam.eye - level) / dd)]); }
    let flow = [0, 0];
    if (w.path && Number.isFinite(src.flow) && src.flow) { const a = _scgrAlong(w.path, _scgrLen(w.path) / 2); flow = [_scgrR2(a[2] * src.flow), _scgrR2(a[3] * src.flow)]; }
    const edgeKind = src.edge || D.edge;
    const v2 = { id: w.id, kind: w.kind, polyM: poly.map(p => [_scgrR2(p[0]), _scgrR2(p[1])]), dNear: _scgrR2(dNear), dFar: _scgrR2(dFar), level: _scgrR2(level), rowAt,
      edges: _scgrWaterEdges(cam, poly, level, edgeKind), mirror: _scgrNum(src.mirror, D.mirror), ripple: _scgrNum(src.ripple, D.ripple), clarity: _scgrNum(src.clarity, D.clarity),
      bed: src.bed || '#4a4030', glint: src.glint !== false, foam: src.foam || D.foam, wakes: src.wakes !== false, rings: src.rings !== false, flow };
    if (w.path) { v2.path = w.path.map(p => [_scgrR2(p[0]), _scgrR2(p[1])]); v2.width = w.width; }
    if (src.lock) v2.lock = { at: _scgrClamp(_scgrNum(src.lock.at, 0.5), 0, 1), gates: _scgrClamp(src.lock.gates | 0 || 2, 1, 4) };
    out.push({ layer: sceneDepthBand(cam, dFar * 0.999), d, y0: _scgrR1(y0), y1: _scgrR1(y1), base: (src.base || D.base).map(pal), reflect: src.reflect !== false, shimmer: 0, lightPath: true, v2 });
  }
  G.water = out;
  return out;
}

/* ---------- terrain ridges (18.3): the area under each ridge, a ground fill in the horizon and far bands ---------- */
const _SCGR_HILL = _scgrSeas(['#7f9a72', '#6a8460'], ['#7a9468', '#647e56'], ['#8e8a64', '#76704e'], ['#8e958e', '#767c76']);
function _scgrRidges(G) {
  const t = G.data && G.data.terrain, cam = G.cam;
  if (!t || !Array.isArray(t.ridges)) return;
  const ridges = t.ridges.filter(r => r && Array.isArray(r.pts) && r.pts.length >= 2).slice().sort((a, b) => _scgrNum(b.d, 5000) - _scgrNum(a.d, 5000));
  const pal = (G.data.palette || {}), se = G.season, slot = (pal[se] && pal[se].hill) || (pal.base && pal.base.hill), cols = slot ? (Array.isArray(slot) ? [slot[0], slot[slot.length - 1]] : [slot, slot]) : (_SCGR_HILL[se] || _SCGR_HILL.summer);
  ridges.forEach((r, ri) => {
    const d = _scgrNum(r.d, 5000), pts = r.pts.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).slice().sort((a, b) => a[0] - b[0]);
    if (pts.length < 2) return;
    const base = cam.horizon + 3, poly = [[Math.min(-200, pts[0][0]), base]].concat(pts.map(p => [p[0], Math.min(p[1], base)]), [[Math.max(1800, pts[pts.length - 1][0]), base]]);
    if (pts[0][0] > -200) poly.splice(1, 0, [-200, pts[0][1]]);
    if (pts[pts.length - 1][0] < 1800) poly.splice(poly.length - 1, 0, [1800, pts[pts.length - 1][1]]);
    const t0 = ri / Math.max(1, ridges.length - 1), col = _scgrMix(_scgrMix(cols[0], cols[1], t0), _SCGR_HAZE, _scgrHaze(G, d));
    // the band of its DEPTH (integration, 8 Oct: the terrain tool names its ridges near / mid / far by ITS bands; a 'near' ridge
    // 1.3 km away went into the scene's near band and covered the far shore). A named band counts only when the depth is in it.
    const named = r.band ? cam.bands.find(b => b.id === r.band) : null;
    const layer = named && named.d0 != null && d >= named.d0 && (named.d1 == null || d < named.d1) ? named.i : sceneDepthBand(cam, d);
    G.ground.push({ layer, d: _scgrPathD([poly]), fill: col, ridge: true });
  });
}

/* ---------- object classes (4.3) ---------- */
const _scgrClassMemo = new Map();
/** The class of an object: an explicit class:<c> tag, else from its category, role and tags. */
function sceneObjClass(id) {
  if (_scgrClassMemo.has(id)) return _scgrClassMemo.get(id);
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
  const tags = (def && def.tags) || [], has = t => tags.includes(t), cat = def ? def.category : String(id).split('.')[0], role = (tags.find(t => t.startsWith('role:')) || '').slice(5);
  let c = (tags.find(t => t.startsWith('class:')) || '').slice(6) || null;
  if (!c) {
    if (cat === 'vehicle') c = has('tram') ? 'tram' : (has('bus') || /bus/.test(id)) ? 'bus' : has('tractor') ? 'tractor' : (has('aircraft') || has('sky') || role === 'sky') ? 'air' : (has('bike') || has('scooter') || has('moped')) ? 'bike' : 'car';
    else if (cat === 'rail') c = (role === 'vehicle' || has('train')) ? 'train' : 'rail';
    else if (cat === 'boat') c = 'boat';
    else if (cat === 'person') c = (has('cyclist') || has('bike')) ? 'cyclist' : (has('kayak') || has('rower') || has('paddleboard') || has('sailor')) ? 'boat' : 'person';
    else if (cat === 'animal') c = (has('insect') || has('butterfly') || has('bee') || has('dragonfly')) ? 'air' : has('fish') || has('trout') ? 'bird-water' : has('grazing') ? 'animal-graze' : (has('dog') || has('pet')) ? 'animal-dog' : 'animal';
    else if (cat === 'bird') c = (has('flight') || has('flying') || /-flight$/.test(id) || role === 'sky') ? 'bird-air' : (has('water') || has('kit:water') || has('waterbird')) ? 'bird-water' : 'bird-ground';
    else if (cat === 'tree') c = 'tree';
    else if (cat === 'plant') c = role === 'tree' ? 'tree' : has('planter') ? 'street' : 'shrub';
    else if (cat === 'ground') c = 'cover';
    else if (cat === 'water') c = (has('water-lily') || /lily|ring|crowfoot/.test(id)) ? 'bird-water' : 'cover';
    else if (cat === 'rock') c = 'rock';
    else if (cat === 'street' || cat === 'prop') c = 'street';
    else if (cat === 'building') c = 'building';
    else if (cat === 'structure') c = 'structure';
    else if (cat === 'landmark') c = 'landmark';
    else if (cat === 'sky') c = 'air';
    else c = 'street';
  }
  if (!SCENE_PLACE_RULES[c]) c = 'street';
  _scgrClassMemo.set(id, c);
  return c;
}
/** The default size factor k of a class (4.2): people 0.94 to 1.06, trees 0.75 to 1.25, shrubs 0.7 to 1.3 (seeded); 1 otherwise. */
function _scgrDefaultK(cls, r) {
  if (cls === 'person' || cls === 'cyclist' || cls === 'animal-dog') return 0.94 + 0.12 * r();
  if (cls === 'tree') return 0.75 + 0.5 * r();
  if (cls === 'shrub' || cls === 'cover') return 0.7 + 0.6 * r();
  if (cls === 'animal' || cls === 'animal-graze' || cls === 'bird-water' || cls === 'bird-ground') return 0.92 + 0.16 * r();
  return 1;
}
/** An object's real size { h, l, w, src } (4.2): A's table (70-scene-1real.js) when loaded, else its def, else a class default. */
function _scgrReal(id) {
  if (typeof sceneObjReal === 'function') { try { const r = sceneObjReal(id); if (r && r.h > 0) return r; } catch (e) { /* below */ } }
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
  if (def && def.real && def.real.h > 0) return Object.assign({ src: 'def' }, def.real);
  const c = sceneObjClass(id);
  return { h: { person: 1.72, cyclist: 1.75, car: 1.5, bus: 4.4, tram: 3.4, train: 3.8, boat: 2, tree: 15, shrub: 1, building: 9, structure: 4, landmark: 30, street: 2, rock: 1 }[c] || 1, l: 2, w: 1, src: 'class' };
}
/** The footprint radius (metres) of a placed object, for the scatter's gap rule (11) and draw order. */
function _scgrFootR(id, k) {
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
  if (def && Number.isFinite(def.foot)) return def.foot * (k || 1);
  if (def && Array.isArray(def.foot)) return Math.max(def.foot[0], def.foot[1]) / 2 * (k || 1);
  const r = _scgrReal(id), c = sceneObjClass(id);
  if (c === 'tree') return Math.max(0.6, 0.13 * r.h) * (k || 1);
  if (c === 'shrub') return Math.max(0.15, Math.min(r.l || r.h, r.h * 1.4) / 2) * (k || 1);
  if (c === 'cover') return 0;
  return Math.max(0.2, Math.max(r.l || 0, r.w || 0) / 2) * (k || 1);
}

/* ---------- where a class may stand (4.4) ---------- */
/**
 * May an object of class cls stand on surface surf ({ id, kind, flags } from sceneSurfaceAt)? p: the placement (cross, pit,
 * beached, over, h) and o: { obj (the object id), near: the distance to the surface's edge }. -> true | 'warn' | false
 */
function scenePlaceAllowed(cls, surf, p, o) {
  const R = SCENE_PLACE_RULES[cls];
  if (!R || R.exempt) return true;
  if (!surf) return false;
  p = p || {}; o = o || {};
  const kind = surf.kind, F = surf.flags || SCENE_SURFACE_KINDS[kind] || {};
  if (p.over && (cls === 'structure' || cls === 'landmark' || cls === 'building')) return true;
  if (kind === 'bridge') {
    if (cls === 'person' || cls === 'animal-dog' || cls === 'animal' || cls === 'bird-ground') return F.walk !== false;
    if (['car', 'bus', 'bike', 'cyclist', 'tractor'].includes(cls)) return (F.drive || []).includes(cls === 'cyclist' ? 'bike' : cls) || (F.drive || []).includes(cls);
  }
  if (cls === 'person' && (kind === 'road' || kind === 'tramway' || kind === 'parking') && (p.cross || surf.crossing)) return true;
  if (cls === 'tram' && kind === 'rail') return (F.rail || []).includes('tram');
  if ((cls === 'tree' || cls === 'shrub') && p.pit && R.pit.includes(kind)) return true;
  if (cls === 'shrub' && o.edge && R.edgeOn.includes(kind)) return true;
  if (cls === 'boat' && (p.beached || o.beached) && R.beached.includes(kind)) return true;
  if (cls === 'street' && kind === 'road' && o.kerbside && o.edgeDist != null && o.edgeDist <= R.kerbside) return true;
  if (cls === 'rock' && kind === 'water' && o.edgeDist != null && o.edgeDist <= R.bankWater) return true;
  if (cls === 'person' && R.warnOn.includes(kind)) return 'warn';
  return R.on.includes(kind);
}

/* ---------- surface lookups (3.3) ---------- */
const _scgrLookMemo = new WeakMap();
/** The lookup list of a compiled scene (or the compile context): bridges, then water, then surfaces last to first; each with its box. */
function _scgrLook(C) {
  let L = _scgrLookMemo.get(C);
  if (L && L.n === ((C.surfaces || []).length + (C.water || []).length)) return L.list;
  const list = [];
  const surf = (C.surfaces || []).filter(s => s.polyM && s.polyM.length >= 3);
  for (let i = surf.length - 1; i >= 0; i--) if (surf[i].kind === 'bridge') list.push({ id: surf[i].id, kind: 'bridge', flags: surf[i].flags, poly: surf[i].polyM, box: _scgrBox(surf[i].polyM), s: surf[i] });
  for (const w of C.water || []) if (w.v2 && w.v2.polyM && w.v2.polyM.length >= 3) list.push({ id: w.v2.id, kind: 'water', flags: SCENE_SURFACE_KINDS.water, poly: w.v2.polyM, box: _scgrBox(w.v2.polyM), water: w.v2 });
  for (let i = surf.length - 1; i >= 0; i--) if (surf[i].kind !== 'bridge') list.push({ id: surf[i].id, kind: surf[i].kind, flags: surf[i].flags, poly: surf[i].polyM, box: _scgrBox(surf[i].polyM), s: surf[i] });
  _scgrLookMemo.set(C, { n: (C.surfaces || []).length + (C.water || []).length, list });
  return list;
}
const _scgrHit = (e, x, d) => x >= e.box[0] && x <= e.box[2] && d >= e.box[1] && d <= e.box[3] && _scgrInPoly(x, d, e.poly);
/** The surface at a ground point (3.3): { id, kind, flags, crossing? } of the top one (water counts as kind 'water'), or null. */
function sceneSurfaceAt(C, x, d) {
  if (!C) return null;
  for (const e of _scgrLook(C)) if (_scgrHit(e, x, d)) return e.s && e.s.crossing ? { id: e.id, kind: e.kind, flags: e.flags, crossing: true } : { id: e.id, kind: e.kind, flags: e.flags };
  return null;
}
/** The look-up entry of an id (a surface or water region). */
function _scgrEntry(C, id) { return _scgrLook(C).find(e => e.id === id) || null; }
/** The horizontal slices [x0, x1] of a surface (or water region) at depth d, from its own polygon. */
function sceneSurfaceSpan(C, id, d) { const e = _scgrEntry(C, id); return e ? _scgrSpans(e.poly, d) : []; }
/**
 * The nearest point of an allowed surface (3.3): kinds (kind names or ids; a function (surf, x, d) -> bool also works),
 * within maxM metres. The point must be on top there (nothing later covers it). -> { id, kind, x, d, m } | null
 */
function sceneSurfaceNearest(C, x, d, kinds, maxM) {
  const ok = typeof kinds === 'function' ? kinds : (s) => !!s && (kinds || []).some(k => k === s.kind || k === s.id);
  const here = sceneSurfaceAt(C, x, d);
  if (here && ok(here, x, d)) return { id: here.id, kind: here.kind, x, d, m: 0 };
  const lim = maxM == null ? 3 : maxM, cands = [];
  for (const e of _scgrLook(C)) {
    if (e.box[0] > x + lim || e.box[2] < x - lim || e.box[1] > d + lim || e.box[3] < d - lim) continue;
    const P = e.poly;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const a = P[j], b = P[i], vx = b[0] - a[0], vd = b[1] - a[1], l2 = vx * vx + vd * vd;
      if (!l2) continue;
      const u = _scgrClamp(((x - a[0]) * vx + (d - a[1]) * vd) / l2, 0, 1), px = a[0] + vx * u, pd = a[1] + vd * u, m = Math.hypot(x - px, d - pd);
      if (m > lim + 0.1) continue;
      const l = Math.sqrt(l2), nx = -vd / l, nd = vx / l;
      for (const sg of [1, -1]) for (const eps of [0.05, 0.3]) { const qx = px + nx * eps * sg, qd = pd + nd * eps * sg; if (_scgrHit(e, qx, qd)) cands.push([Math.hypot(x - qx, d - qd), qx, qd]); }
    }
  }
  cands.sort((a, b) => a[0] - b[0]);
  for (const c of cands) { if (c[0] > lim) break; const s = sceneSurfaceAt(C, c[1], c[2]); if (s && ok(s, c[1], c[2])) return { id: s.id, kind: s.kind, x: c[1], d: c[2], m: c[0] }; }
  // a ring search (narrow or covered pieces): 12 radii x 16 angles
  for (let ri = 1; ri <= 12; ri++) {
    const r = lim * ri / 12;
    for (let a = 0; a < 16; a++) { const qx = x + r * Math.cos(a * Math.PI / 8), qd = d + r * Math.sin(a * Math.PI / 8); if (qd <= 0.1) continue; const s = sceneSurfaceAt(C, qx, qd); if (s && ok(s, qx, qd)) return { id: s.id, kind: s.kind, x: qx, d: qd, m: r }; }
  }
  return null;
}

/* ---------- ground placements (4.1 to 4.5) ---------- */
/** The lanes of a strip (4.5): { off (left-normal offset), dir: 1 along the path | -1 against | 0 both } for its kind and width. */
function _scgrLanes(surf, drive, cls) {
  const W = surf.width || 3, kind = surf.kind;
  if (kind === 'rail' || (kind === 'tramway' && cls === 'tram')) {
    const tracks = Math.max(1, Math.min(4, (surf.tracks | 0) || (W >= (kind === 'rail' ? 7 : 6) ? 2 : 1))), tw = W / tracks, out = [];
    for (let t = 0; t < tracks; t++) { const off = W / 2 - tw * (t + 0.5); out.push({ off, dir: tracks === 1 ? 0 : ((off > 0) === (drive === 'left') ? 1 : -1) }); }
    return out;
  }
  const n = Math.max(1, Math.floor(W / 3.2)), lw = W / n, out = [];
  for (let j = 0; j < n; j++) { const off = W / 2 - lw * (j + 0.5); out.push({ off, dir: n === 1 ? 0 : Math.abs(off) < 1e-6 ? 0 : ((off > 0) === (drive === 'left') ? 1 : -1) }); }
  return out;
}
/**
 * Snap a ground point for a class (4.5): the nearest allowed point within the class's radius; cars, buses, trams and trains to a
 * lane centre (keep-left in the UK), boats inside the inset water. o: { p (the placement), obj, want: 1 | -1 (the travel direction
 * along the path), r: radius override }. -> { x, d, surf, m, lane?, dir? } | null (refused)
 */
function sceneGroundSnap(G, cls, x, d, o) {
  o = o || {};
  const R = SCENE_PLACE_RULES[cls] || SCENE_PLACE_RULES.street, p = o.p || {}, rad = o.r != null ? o.r : (p.fix || R.fix ? 0 : R.snap);
  const real = o.obj ? _scgrReal(o.obj) : null, inset = R.inset ? (real && real.w ? real.w / 2 : 1) + 0.3 : 0;
  const allowed = (s, qx, qd) => {
    if (!s) return false;
    const e = s.kind === 'water' || (cls === 'street' && s.kind === 'road') || (cls === 'rock' && s.kind === 'water') ? _scgrEntry(G, s.id) : null;
    const edgeDist = e ? _scgrEdgeDist(e.poly, qx, qd) : null;
    const a = scenePlaceAllowed(cls, s, p, { obj: o.obj, edge: o.edge, beached: o.beached, kerbside: o.kerbside, edgeDist });
    if (!a) return false;
    if (inset && s.kind === 'water' && edgeDist != null && edgeDist < inset) {
      // the frame cuts are not banks: only the real edges count
      const w = e.water;
      if (!w || !w.edges || _scgrNearBank(G, w, qx, qd) < inset) return false;
    }
    return true;
  };
  const here = sceneSurfaceAt(G, x, d);
  let hit = allowed(here, x, d) ? { id: here.id, kind: here.kind, x, d, m: 0 } : (rad > 0 ? sceneSurfaceNearest(G, x, d, (s, qx, qd) => allowed(s, qx, qd), rad) : null);
  if (!hit) return null;
  // lanes: cars, buses, trams and trains on a strip go to the centre of a lane
  const surf = G.surfaces.find(s => s.id === hit.id);
  if (R.lane && surf && surf.path && surf.width) {
    const near = _scgrNearestOn(surf.path, hit.x, hit.d), lanes = _scgrLanes(surf, G.drive || 'left', cls);
    let pick = null;
    for (const ln of lanes) {
      if (o.want && ln.dir && ln.dir !== o.want) continue;
      const m = Math.abs(ln.off - near.off);
      if (!pick || m < pick.m) pick = { ln, m };
    }
    if (!pick) for (const ln of lanes) { const m = Math.abs(ln.off - near.off); if (!pick || m < pick.m) pick = { ln, m }; }
    // once the vehicle is on the strip it goes to the lane centre (that is not a correction: m stays the distance to the strip)
    const lx = near.x - near.td * pick.ln.off, ld = near.d + near.tx * pick.ln.off;
    hit = { id: hit.id, kind: hit.kind, x: lx, d: ld, m: hit.m, laneM: Math.hypot(lx - hit.x, ld - hit.d), lane: pick.ln.off, dir: pick.ln.dir || o.want || 1, tan: [near.tx, near.td] };
  }
  return hit;
}
/** The distance from (x, d) to the nearest real bank of a water region (its land edges; the frame's cuts are not banks), metres. */
function _scgrNearBank(G, w, x, d) {
  if (w.path && w.width) { const n = _scgrNearestOn(w.path, x, d); return w.width / 2 - Math.abs(n.off); }
  const cam = G.cam, xl = (-200 - cam.x0) / cam.f, xr = (1800 - cam.x0) / cam.f, dn = cam.dMin * 0.9;
  const onCut = p => Math.abs(p[0] - xl * p[1]) < 0.02 * Math.max(1, p[1]) || Math.abs(p[0] - xr * p[1]) < 0.02 * Math.max(1, p[1]) || Math.abs(p[1] - dn) < 0.02 || p[1] >= SCENE_DMAX * 0.999;
  const P = w.polyM;
  let m = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[j], b = P[i];
    if (onCut(a) && onCut(b)) continue;
    const vx = b[0] - a[0], vd = b[1] - a[1], l2 = vx * vx + vd * vd, u = l2 ? _scgrClamp(((x - a[0]) * vx + (d - a[1]) * vd) / l2, 0, 1) : 0;
    m = Math.min(m, Math.hypot(x - a[0] - vx * u, d - a[1] - vd * u));
  }
  return m;
}
/** The views of an object (4.3): its def's `views`, else D's table (SCENE_OBJ_VIEWS). */
function _scgrViews(id) {
  if (typeof sceneObjViews === 'function') { try { return sceneObjViews(id); } catch (e) { /* none */ } }
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
  return (def && def.views) || null;
}
/**
 * Which view to draw (4.3): from the angle between the direction of travel (tx, td) and the line of sight to (x, d), the rule the
 * flows use (D's sceneFlowViewOf when loaded): side-on when it crosses the view (over 55 degrees), front or rear when it runs
 * toward or away (under 35), q between when the object has one. face 'away' / 'toward' asks for rear / front directly.
 * -> { view, o (the object to draw), missing, want? }
 */
function sceneViewOf(id, tangent, x, d, face) {
  let across = 90, toward = false;
  if (face === 'away' || face === 'toward') { across = 0; toward = face === 'toward'; }
  else if (tangent) {
    const l = Math.hypot(x, d) || 1, sx = x / l, sd = d / l, dot = tangent[0] * sx + tangent[1] * sd;
    across = Math.acos(_scgrClamp(Math.abs(dot), 0, 1)) / _SCGR_DEG;
    toward = dot < 0;
  }
  if (typeof sceneFlowViewOf === 'function') { try { const r = sceneFlowViewOf(id, across, toward); if (r && r.o) return r; } catch (e) { /* below */ } }
  const ang = 90 - across;
  let want = ang < 35 ? 'side' : ang > 55 ? (toward ? 'front' : 'rear') : 'q';
  const vw = want === 'side' ? null : _scgrViews(id);
  if (want === 'q') { if (vw && vw.q) return { view: 'q', o: vw.q, missing: false }; want = ang < 45 ? 'side' : (toward ? 'front' : 'rear'); }
  if (want === 'side') return { view: 'side', o: id, missing: false };
  const o = vw && vw[want];
  if (o && (typeof sceneObj !== 'function' || sceneObj(o))) return { view: want, o, missing: false };
  return { view: 'side', o: id, missing: true, want };
}
const _SCGR_MOVERS = ['car', 'bus', 'tram', 'train', 'bike', 'cyclist', 'tractor', 'boat', 'person', 'animal', 'animal-dog', 'animal-graze', 'bird-water', 'bird-ground'];
/** Is a placement in ground form (4.1)? */
const _scgrIsGround = p => !!p && (p.on != null || Array.isArray(p.at)) && !(Number.isFinite(p.x) && Number.isFinite(p.y));
/** The flat-ground depth of a pixel row (4.7), or null on or above the horizon. */
const _scgrDepthOfRow = (cam, y) => (y > cam.horizon + 0.5 ? cam.f * cam.eye / (y - cam.horizon) : null);
/**
 * Resolve one placement of a v2 scene (4.1 to 4.7) -> the placement in PIXEL form ({ obj, x, y, s, flip, layer, ... } for the core's
 * push) plus `$v2` (the ground record: g, dz, cls, view, problems), or null when it is refused. Pixel placements pass through,
 * checked (surface, scale) and never moved. Problems go to G.problems.
 */
function scenePlaceResolve(G, p, i) {
  const cam = G.cam, data = G.data, def = typeof sceneObj === 'function' ? sceneObj(p.obj) : null;
  if (!def) return null;
  const prob = (rule, sev, at, msg, fix, extra) => G.problems.push(Object.assign({ rule, sev, i, obj: p.obj, at: at ? [_scgrR1(at[0]), _scgrR1(at[1])] : null, msg, fix }, extra || {}));
  const cls = sceneObjClass(p.obj), R = SCENE_PLACE_RULES[cls], layerOf = (name) => { const l = G.layers.find(x => x.id === name); return l ? l.i : null; };
  const r = sceneRnd(sceneHash((data.id || 'scene') + '|g|' + i + '|' + (p.seed | 0)));
  if (!_scgrIsGround(p)) {
    // a pixel placement (4.7): drawn as given, checked from the inferred ground point unless pinned
    const q = Object.assign({}, p);
    const d0 = Number.isFinite(p.y) ? _scgrDepthOfRow(cam, p.y) : null;
    q.layer = p.layer != null && layerOf(p.layer) != null ? p.layer : (d0 ? G.layers[sceneDepthBand(cam, d0)].id : G.layers[0].id);
    const g = d0 ? { x: _scgrR2((p.x - cam.x0) * d0 / cam.f), d: _scgrR2(d0), h: 0, surf: null, snapped: 0 } : null;
    if (g && !p.pin && !(R && R.exempt)) {
      const s = sceneSurfaceAt(G, g.x, g.d);
      g.surf = s ? s.id : null;
      const ok = scenePlaceAllowed(cls, s, p, { obj: p.obj, kerbside: (def.tags || []).includes('kerbside') });
      if (!ok) prob(_scgrSurfRule(cls), _scgrSurfSev(cls), [g.x, g.d], `place[${i}] ${p.obj} (pixel) stands on ${s ? s.kind + ' (' + s.id + ')' : 'no surface'} at x ${_scgrR1(p.x)} y ${_scgrR1(p.y)}`, `convert it to a ground placement (on: '<surface>'), or mark it pin: true`, { pixel: true });
      const real = _scgrReal(p.obj), implied = (p.s || 1) * def.size[1] * d0 / cam.f, ratio = implied / real.h;
      const lim = cls === 'person' ? [0.85, 1.2] : [0.7, 1.45];
      if (!(cls === 'landmark') && (ratio < lim[0] || ratio > lim[1])) prob('scale', 'warn', [g.x, g.d], `place[${i}] ${p.obj} (pixel) at s ${p.s || 1} is ${_scgrR2(implied)} m tall at ${_scgrR1(d0)} m (real ${real.h} m, x${_scgrR2(ratio)})`, `use a ground placement, or s ${_scgrR3((p.s || 1) / ratio)}`, { pixel: true });
    }
    q.$v2 = { g, dz: g ? g.d : null, cls, view: 'side', pixel: true, pin: !!p.pin };
    return q;
  }
  // ground placements: where it was asked to stand
  const surfOf = (id) => G.surfaces.find(s => s.id === id) || null;
  let x = null, d = null, tan = null, onId = null;
  if (Array.isArray(p.at) && Number.isFinite(p.at[0]) && Number.isFinite(p.at[1])) { x = p.at[0]; d = p.at[1]; }
  else if (p.on != null) {
    onId = String(p.on);
    const e = _scgrEntry(G, onId), strip = surfOf(onId) || (G.water.find(w => w.v2.id === onId) || {}).v2;
    if (!e) { prob('refused', 'error', null, `place[${i}] ${p.obj}: no surface or water "${onId}"`, `on: one of ${G.surfaces.map(s => s.id).concat(G.water.map(w => w.v2.id)).slice(0, 10).join(', ')}`); G.stats.refused++; return null; }
    if ((p.along != null || p.alongM != null) && strip && strip.path) {
      const L = _scgrLen(strip.path), sM = p.alongM != null ? _scgrClamp(+p.alongM, 0, L) : _scgrClamp(+p.along, 0, 1) * L, a = _scgrAlong(strip.path, sM);
      const u = p.u != null ? _scgrClamp(+p.u, 0, 1) : 0.2 + 0.6 * r(), off = strip.width / 2 - u * strip.width;
      x = a[0] - a[3] * off; d = a[1] + a[2] * off; tan = [a[2], a[3]];
    } else {
      d = _scgrNum(p.d, null);
      if (d == null) {
        // no depth: the middle of the surface's visible stretch
        const ds = e.poly.map(q => q[1]); d = Math.max(cam.dMin * 1.2, Math.min(...ds)) + (Math.min(Math.max(...ds), 120) - Math.max(cam.dMin * 1.2, Math.min(...ds))) * (0.25 + 0.5 * r());
      }
      const spans = _scgrSpans(e.poly, d);
      if (!spans.length) { prob('refused', 'error', null, `place[${i}] ${p.obj}: ${onId} is not in view at ${_scgrR1(d)} m`, `d: a depth where ${onId} is (from ${_scgrR1(Math.min(...e.poly.map(q => q[1])))} to ${_scgrR1(Math.max(...e.poly.map(q => q[1])))} m)`); G.stats.refused++; return null; }
      if (cls === 'boat' && e.water) {
        // u runs across the water a boat may use: inset by half its beam + 0.3 m from each bank
        const ins = (_scgrReal(p.obj).w || 2) / 2 + 0.3;
        for (const sp of spans) { const a = sp[0], b = sp[1]; if (b - a > 2 * ins) { sp[0] = a + (_scgrNearBank(G, e.water, a, d) < ins + 0.01 ? ins : 0); sp[1] = b - (_scgrNearBank(G, e.water, b, d) < ins + 0.01 ? ins : 0); } }
      }
      const tot = spans.reduce((n, s) => n + s[1] - s[0], 0), u = p.u != null ? _scgrClamp(+p.u, 0, 1) : 0.2 + 0.6 * r();
      let rem = u * tot;
      for (const s of spans) { if (rem <= s[1] - s[0] + 1e-9) { x = s[0] + rem; break; } rem -= s[1] - s[0]; }
      if (x == null) x = spans[spans.length - 1][1];
      if (strip && strip.path) { const n = _scgrNearestOn(strip.path, x, d); tan = [n.tx, n.td]; }
    }
  }
  if (x == null || !(d > 0)) { prob('refused', 'error', null, `place[${i}] ${p.obj}: give on + d (+ u), on + along, or at: [x, d]`, 'see V2 4.1'); G.stats.refused++; return null; }
  // the travel direction asked for: dir 'away' | 'toward' (on a road), face (left / right / away / toward)
  let want = 0;
  const dirAsk = p.dir || (p.face === 'away' || p.face === 'toward' ? p.face : null);
  if (dirAsk && tan) want = (dirAsk === 'away') === (tan[1] >= 0) ? 1 : -1;
  // snapping (4.5): refuse when nothing allowed is within the radius
  const real = _scgrReal(p.obj), tags = def.tags || [];
  const o = { p, obj: p.obj, want, edge: tags.includes('role:edge'), beached: !!p.beached || tags.includes('beached'), kerbside: tags.includes('kerbside') };
  const fixed = !!(p.fix || (R && R.fix));
  let hit = R && R.exempt ? { id: null, kind: null, x, d, m: 0 } : sceneGroundSnap(G, cls, x, d, Object.assign({}, o, fixed ? { r: 0 } : {}));
  if (!hit) {
    const s = sceneSurfaceAt(G, x, d);
    prob('refused', 'error', [x, d], `place[${i}] ${p.obj} (${cls}) cannot stand on ${s ? s.kind + ' (' + s.id + ')' : 'nothing'} at x ${_scgrR1(x)} d ${_scgrR1(d)}, and nothing it may stand on is within ${fixed ? 0 : R.snap} m`, `move it onto ${R.on.slice(0, 6).join(', ')}${fixed ? '' : ' (on: \'<surface id>\')'}`);
    G.stats.refused++;
    return null;
  }
  if (hit.m > 0.05) { prob('snapped', 'warn', [x, d], `place[${i}] ${p.obj} moved ${_scgrR2(hit.m)} m from x ${_scgrR1(x)} d ${_scgrR1(d)} to x ${_scgrR1(hit.x)} d ${_scgrR1(hit.d)} (${hit.kind} ${hit.id})`, `place it on ${hit.id} (on: '${hit.id}')`, { to: [_scgrR1(hit.x), _scgrR1(hit.d)], m: _scgrR2(hit.m), half: hit.m > (R.snap || 1) / 2 }); G.stats.snapped++; }
  x = hit.x; d = hit.d;
  if (hit.tan) tan = hit.tan;
  if (hit.dir && hit.tan) want = hit.dir;
  // the size factor, the care cap (a near person is pushed back along the ray to 150 units tall)
  let k = cls === 'landmark' ? 1 : (p.k != null ? _scgrNum(+p.k, 1) : _scgrDefaultK(cls, r));
  const cap = (typeof SCENE_PERSON === 'object' && SCENE_PERSON.max) || 150;
  if ((cls === 'person' || cls === 'cyclist') && cam.f * real.h * k / d > cap) {
    const d2 = cam.f * real.h * k / cap, x2 = x * d2 / d;
    prob('capped', 'info', [x, d], `place[${i}] ${p.obj} would be ${Math.round(cam.f * real.h * k / d)} units tall at ${_scgrR1(d)} m: pushed back to ${_scgrR1(d2)} m (the care cap, ${cap})`, 'place it farther away');
    const s2 = sceneSurfaceAt(G, x2, d2);
    if (scenePlaceAllowed(cls, s2, p, o)) { x = x2; d = d2; hit = { id: s2.id, kind: s2.kind, x, d, m: hit.m }; }
    else { const h2 = sceneGroundSnap(G, cls, x2, d2, o); if (h2) { x = h2.x; d = h2.d; hit = h2; } else { x = x2; d = d2; } }
  }
  // the height of the anchor: water level for what floats, the ground (relief) otherwise; an explicit h lifts it
  const floats = (cls === 'boat' || cls === 'bird-water' || def.float) && hit.kind === 'water';
  let h;
  if (floats) { const w = G.water.find(q => q.v2.id === hit.id); h = (w ? w.v2.level : cam.water) + (def.float && Number.isFinite(def.float.level) ? def.float.level : 0); }
  else h = sceneGroundHeight(cam, x, d) + _scgrNum(p.h, 0);
  // the view (4.3) and facing: movers face their travel; a missing front or rear view keeps the side view (a problem)
  let obj = p.obj, view = 'side', flip = !!p.flip;
  const moves = _SCGR_MOVERS.includes(cls);
  let travel = tan && want ? [tan[0] * want, tan[1] * want] : null;
  if (moves && (travel || p.face === 'away' || p.face === 'toward')) {
    const vw = sceneViewOf(p.obj, travel, x, d, travel ? null : p.face);
    if (vw.missing && d < 30) prob('view', 'warn', [x, d], `place[${i}] ${p.obj}: drawn side-on where a ${vw.want} view is wanted (no ${vw.want} view in the library)`, `add views: { ${vw.want}: '<object id>' } to ${p.obj}`);
    if (vw.o !== p.obj && typeof sceneObj === 'function' && sceneObj(vw.o)) obj = vw.o;
    view = vw.view;
  }
  if (moves && def.flippable !== false && view === 'side') {
    if (p.face === 'left') flip = true;
    else if (p.face === 'right') flip = false;
    else if (travel) { const a = sceneProject(cam, x, d, h), b = sceneProject(cam, x + travel[0], d + travel[1], h); flip = b.X < a.X; }
    else if (p.flip == null) flip = r() < 0.5;
  }
  const odef = sceneObj(obj) || def, oreal = obj === p.obj ? real : _scgrReal(obj), P = sceneProject(cam, x, d, h);
  const s = k * P.k * oreal.h / Math.max(1, odef.size[1]);
  const band = sceneDepthBand(cam, d), forced = p.layer != null ? layerOf(p.layer) : null, layer = forced != null ? forced : band;
  if (forced != null && Math.abs(forced - band) > 1 && p.layer !== 'front') prob('layer', 'warn', [x, d], `place[${i}] ${p.obj}: layer ${p.layer} disagrees with its depth ${_scgrR1(d)} m (band ${G.layers[band].id})`, 'leave layer out: the depth decides it');
  const q = Object.assign({}, p, { obj, x: _scgrR1(P.X), y: _scgrR1(P.Y), s: _scgrR3(Math.max(0.001, s)), flip, layer: G.layers[layer].id });
  if (floats) q.reflect = p.reflect != null ? p.reflect : true;
  delete q.on; delete q.at; delete q.d; delete q.u; delete q.along; delete q.alongM; delete q.k; delete q.dir; delete q.face; delete q.fix; delete q.h;
  q.$v2 = { g: { x: _scgrR2(x), d: _scgrR2(d), h: _scgrR2(h), surf: hit.id, snapped: _scgrR2(hit.m || 0) }, dz: _scgrR2(d), cls, view, k: _scgrR3(k), z: _scgrRow(cam, d), floats };
  G.stats.groundItems++;
  return q;
}
const _scgrSurfRule = cls => (['car', 'bus', 'tram', 'train', 'bike', 'tractor'].includes(cls) ? 'vehicleSurface' : cls === 'boat' ? 'boatSurface' : cls === 'person' || cls === 'cyclist' ? 'personSurface' : (cls === 'tree' || cls === 'shrub') ? 'plantSurface' : 'surface');
const _scgrSurfSev = cls => (['car', 'bus', 'tram', 'train', 'bike', 'tractor', 'boat'].includes(cls) ? 'error' : 'warn');

/* ---------- draw order (4.6) ---------- */
/** Does the ground segment from the camera (0, 0) to (x, d) cross polygon P (strictly before reaching the point)? */
function _scgrRayHits(P, x, d) {
  if (_scgrInPoly(x, d, P)) return false;   // standing inside the footprint: not behind it
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[j], b = P[i], ex = b[0] - a[0], ed = b[1] - a[1], den = x * ed - d * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = (a[0] * ed - a[1] * ex) / den, u = (a[0] * d - a[1] * x) / den;
    if (t > 1e-6 && t < 1 - 1e-6 && u >= 0 && u <= 1) return true;
  }
  return false;
}
/**
 * The draw order with buildings (4.6): items sorted by (layer, z, order) as v1, then a stable topological sort with two rules per
 * footprint: an item whose ground ray crosses a building's footprint is drawn BEFORE it; otherwise an item whose screen box
 * overlaps the building's is drawn AFTER it (its layer is raised to the building's when it was farther). Buildings among
 * themselves by their footprint centroids. A cycle falls back to z (an `order` problem). items: [{ layer, z, box, g, foot? }]
 * (box: the screen box; foot: [[x, d], ...]); buildings: [{ i (item index), foot }]. Returns { order: [indices], layers, problems }.
 */
function sceneDepthOrder(items, buildings, cam) {
  const n = items.length, problems = [], layers = items.map(it => it.layer);
  const base = items.map((it, i) => i).sort((a, b) => layers[a] - layers[b] || items[a].z - items[b].z || a - b);
  const B = (buildings || []).filter(b => b && Number.isInteger(b.i) && b.i >= 0 && b.i < n && Array.isArray(b.foot) && b.foot.length >= 3);
  if (!B.length) return { order: base, layers, problems };
  const after = Array.from({ length: n }, () => new Set());   // after[u]: the items that must come after u
  const ov = (a, b) => a && b && !(a[2] <= b[0] || a[0] >= b[2] || a[3] <= b[1] || a[1] >= b[3]);
  const cen = P => { let x = 0, d = 0; for (const p of P) { x += p[0]; d += p[1]; } return [x / P.length, d / P.length]; };
  for (const b of B) {
    const bi = b.i, bb = items[bi].box;
    for (let i = 0; i < n; i++) {
      if (i === bi || !items[i].g) continue;
      const g = items[i].g, other = B.find(q => q.i === i);
      const pt = other ? cen(other.foot) : [g.x, g.d];
      if (_scgrRayHits(b.foot, pt[0], pt[1])) { after[i].add(bi); }
      else if (ov(items[i].box, bb)) { after[bi].add(i); if (layers[i] < layers[bi]) layers[i] = layers[bi]; }
    }
  }
  // the layer of a 'before' item never passes its building's
  for (let u = 0; u < n; u++) for (const v of after[u]) if (layers[u] > layers[v] && B.some(q => q.i === v)) layers[v] = layers[u];
  const order2 = items.map((it, i) => i).sort((a, b) => layers[a] - layers[b] || items[a].z - items[b].z || base.indexOf(a) - base.indexOf(b));
  const rank = new Map(order2.map((v, k) => [v, k])), indeg = new Array(n).fill(0);
  for (let u = 0; u < n; u++) for (const v of after[u]) if (layers[u] === layers[v]) indeg[v]++;
  const out = [], done = new Array(n).fill(false);
  // Kahn within each layer, by base rank
  for (let l = Math.min(...layers); out.length < n;) {
    const avail = order2.filter(v => !done[v] && layers[v] === l && indeg[v] === 0);
    if (!avail.length) {
      const rest = order2.filter(v => !done[v] && layers[v] === l);
      if (!rest.length) { const nxt = order2.find(v => !done[v]); if (nxt == null) break; l = layers[nxt]; continue; }
      problems.push({ rule: 'order', sev: 'info', i: null, obj: null, at: null, msg: `draw order: a cycle among ${rest.length} items beside buildings (layer ${l}); kept by depth`, fix: 'footprints should not overlap' });
      for (const v of rest) { done[v] = true; out.push(v); }
      continue;
    }
    const v = avail.reduce((a, c) => (rank.get(c) < rank.get(a) ? c : a));
    done[v] = true; out.push(v);
    for (const w of after[v]) if (layers[w] === layers[v]) indeg[w]--;
  }
  return { order: out, layers, problems };
}

/* ---------- actors on the ground (4.8) ---------- */
/** A ground path for an actor: its `ground` points, or the centreline of the surface `on` (a strip), densified every ~2 m. */
function _scgrActorGround(G, a) {
  let pts = null;
  if (Array.isArray(a.ground) && a.ground.length >= 2) pts = _scgrSmooth(a.ground.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])));
  else if (a.on) {
    const s = G.surfaces.find(q => q.id === a.on) || (G.water.find(w => w.v2.id === a.on) || {}).v2;
    if (s && s.path) { const off = s.width ? (a.u != null ? s.width / 2 - _scgrClamp(+a.u, 0, 1) * s.width : 0) : 0; pts = _scgrOffset(s.path, off); }
    else if (s && s.polyM) {
      // a polygon: a seeded line across it at its middle depth
      const ds = s.polyM.map(p => p[1]), dm = (Math.min(...ds) + Math.min(Math.max(...ds), 150)) / 2, sp = _scgrSpans(s.polyM, dm)[0];
      if (sp) pts = [[sp[0] + 0.5, dm], [sp[1] - 0.5, dm]];
    }
  }
  if (!pts || pts.length < 2) return null;
  const L = _scgrLen(pts), n = _scgrClamp(Math.ceil(L / 2), 2, 400), out = [];
  for (let j = 0; j <= n; j++) { const q = _scgrAlong(pts, L * j / n); out.push([_scgrR2(q[0]), _scgrR2(q[1])]); }
  return out;
}
/**
 * A v2 actor (4.8) in the v1 actor form, so both renderers draw it now: its ground path projected to a pixel path, sByY from the
 * depth (scale = k * f / d * real.h / size[1] along the way), speed in units per second from its metres per second; the ground
 * record rides along (ground, speedM, k, h) for sceneActorAtV2 and B's per-frame passes. null when it has no ground path.
 */
function sceneCompileV2Actor(G, a, i) {
  const def = typeof sceneObj === 'function' ? sceneObj(a.obj) : null;
  if (!def) return null;
  const pts = _scgrActorGround(G, a);
  if (!pts) { G.problems.push({ rule: 'actor', sev: 'warn', i, obj: a.obj, at: null, msg: `actors[${i}] ${a.obj}: no ground path (ground: [[x, d], ...] or on: '<surface>')`, fix: 'give it a ground path', actor: true }); return null; }
  const cam = G.cam, cls = sceneObjClass(a.obj), real = _scgrReal(a.obj), r = sceneRnd(sceneHash((G.data.id || 'scene') + '|actor|' + i));
  const k = a.k != null ? +a.k : _scgrDefaultK(cls, r), floats = cls === 'boat' || cls === 'bird-water';
  const lvl = (x, d) => { if (floats) { const s = sceneSurfaceAt(G, x, d); if (s && s.kind === 'water') { const w = G.water.find(q => q.v2.id === s.id); return w ? w.v2.level : cam.water; } } return sceneGroundHeight(cam, x, d) + _scgrNum(a.h, 0); };
  const path = [], tab = [];
  let kSum = 0;
  for (const p of pts) { const P = sceneProject(cam, p[0], p[1], lvl(p[0], p[1])); path.push([_scgrR1(P.X), _scgrR1(P.Y)]); tab.push([_scgrR1(P.Y), _scgrR3(k * P.k * real.h / Math.max(1, def.size[1]))]); kSum += P.k; }
  tab.sort((u, v) => u[0] - v[0]);
  const sByY = tab.filter((t, j) => !j || t[0] - tab[j - 1][0] > 0.5);
  const speedM = _scgrNum(a.speedM, _scgrNum(a.speed, cls === 'person' ? 1.3 : cls === 'boat' ? 1.1 : cls === 'car' ? 8 : 1.2));
  const minD = Math.min(...pts.map(p => p[1]));
  return Object.assign({}, a, { path, sByY: sByY.length >= 2 ? sByY : [[sByY[0][0], sByY[0][1]], [sByY[0][0] + 1, sByY[0][1]]], s: 1, speed: _scgrR2(speedM * kSum / pts.length),
    layer: a.layer || G.layers[sceneDepthBand(cam, minD)].id, $ground: { ground: pts, speedM, k: _scgrR3(k), cls, floats } });
}
/**
 * A v2 actor at t seconds (4.8), pure: { x, d, X, Y, s, flip, alpha } from its ground path at its speed in metres per second
 * (pingpong, loop or fade as v1), projected with the camera. a: the compiled actor (its ground record) or { ground, speedM, ... }.
 */
function sceneActorAtV2(a, t, cam) {
  const g = a.ground && Array.isArray(a.ground) ? a : (a.g2 || a.$ground || a);
  const pts = g.ground || [[0, 10], [1, 10]], L = _scgrLen(pts) || 1, sp = g.speedM || 1.2, d0 = (a.offset || 0) * L + sp * t;
  let s, back = false, alpha = 1;
  if ((a.loop || 'pingpong') === 'pingpong') { const u = ((d0 % (2 * L)) + 2 * L) % (2 * L); back = u > L; s = back ? 2 * L - u : u; }
  else { s = ((d0 % L) + L) % L; if (a.loop === 'fade') alpha = _scgrClamp(Math.min(s, L - s) / 3, 0, 1); }
  const q = _scgrAlong(pts, s), x = q[0], d = q[1], P = sceneProject(cam, x, d, g.floats ? cam.water : null);
  const def = typeof sceneObj === 'function' ? sceneObj(a.o || a.obj) : null, real = _scgrReal(a.o || a.obj);
  const sc = (g.k || 1) * P.k * real.h / Math.max(1, def ? def.size[1] : 64);
  const tx = q[2] * (back ? -1 : 1), td = q[3] * (back ? -1 : 1), P2 = sceneProject(cam, x + tx, d + td, null);
  return { x, d, X: P.X, Y: P.Y, s: sc, flip: P2.X < P.X, alpha };
}

/* ---------- the compile glue (12): called by sceneCompile in the core for v2 data ---------- */
/** The layers of a v2 scene in the compiled v1 form: { id, i, depth, haze: 0 } (haze comes from the depth, 7.1; depth: the pan's parallax). */
function _scgrLayers(cam) {
  const def = { horizon: 0.08, far: 0.2, mid: 0.45, near: 0.75, fore: 1, front: 1.25 };
  return cam.bands.map((b, i) => ({ id: b.id, i, depth: def[b.id] != null ? def[b.id] : _scgrR2(0.1 + 1.1 * i / Math.max(1, cam.bands.length - 1)), haze: 0 }));
}
/**
 * Stage 1 to 4 of the v2 compile (12): the camera, the surfaces, the water geometry, the terrain ridges, F's generated
 * buildings. -> G, the compile context (G.layers, G.ground, G.water, G.surfaces, G.problems, G.stats ...).
 */
function sceneCompileV2Begin(data, opt) {
  opt = opt || {};
  const cam = sceneCamera(data);
  const G = { data, season: opt.season || 'summer', lod: opt.lod == null ? 1 : opt.lod, cam, layers: _scgrLayers(cam), problems: [], ground: [], surfaces: [], water: [],
    drive: _scgrDrive(data), placed: [], autoAnim: new WeakSet(), gen: { items: [], buildings: [] },
    stats: { groundItems: 0, pixelItems: 0, snapped: 0, refused: 0, coverItems: 0 } };
  if (typeof sceneAtmosCompile === 'function') { try { G.atmos = sceneAtmosCompile(data, { setting: data.setting || 'natural' }); } catch (e) { G.atmos = null; } }
  // view sync (2.1): the camera wins
  const v = data.view || {};
  for (const [k, cv] of [['horizon', cam.horizon], ['fov', cam.fov], ['heading', cam.heading]]) if (Number.isFinite(v[k]) && Math.abs(v[k] - cv) > 0.5) G.problems.push({ rule: 'viewSync', sev: 'warn', i: null, obj: null, at: null, msg: `view.${k} ${v[k]} differs from the camera's ${cv}: the camera wins`, fix: `drop view.${k} (the camera sets it)` });
  _scgrRidges(G);
  sceneSurfacesCompile(data, cam, G);
  sceneWaterCompile(data, cam, G);
  // lock gates (5.1) from the library when it has them
  for (const w of G.water) if (w.v2.lock && w.v2.path) {
    if (typeof sceneObj === 'function' && sceneObj('structure.lock-gate')) G.lockGates = (G.lockGates || []).concat([{ w: w.v2 }]);
    else G.problems.push({ rule: 'missing', sev: 'info', i: null, obj: 'structure.lock-gate', at: null, msg: `water ${w.v2.id}: lock gates are not in the library yet (structure.lock-gate)`, fix: 'add the object, or drop lock' });
  }
  // F: generated buildings and streets (19) as direct items
  if ((Array.isArray(data.buildings) && data.buildings.length) || (Array.isArray(data.streets) && data.streets.length)) {
    if (typeof sceneGenExpand === 'function') {
      try {
        const r = sceneGenExpand(data, G, cam) || {};
        G.gen = { items: Array.isArray(r.items) ? r.items : [], buildings: Array.isArray(r.buildings) ? r.buildings : [], signs: Array.isArray(r.signs) ? r.signs : [] };
        for (const p of Array.isArray(r.problems) ? r.problems : []) G.problems.push(p);
      }
      catch (e) { G.problems.push({ rule: 'missing', sev: 'warn', i: null, obj: null, at: null, msg: 'the building generator failed: ' + String(e && e.message).slice(0, 120), fix: 'check buildings / streets' }); }
    } else G.problems.push({ rule: 'missing', sev: 'info', i: null, obj: null, at: null, msg: 'buildings and streets need the generator (70-scene-gen-0building.js), which is not loaded: skipped', fix: 'load the generator' });
  }
  return G;
}
/** One placement of a v2 scene (stage 5): scenePlaceResolve, counted. -> the pixel-form placement with $v2, or null (refused). */
function sceneCompileV2Place(G, p, i) {
  const q = scenePlaceResolve(G, p, i);
  if (q && q.$v2 && q.$v2.pixel) G.stats.pixelItems++;
  return q;
}
/** Attach the v2 fields to a compiled item (12): g, dz, cls, view, haze null, direct null, shade; z from the depth. */
function sceneCompileV2Attach(G, it, q) {
  const v = (q && q.$v2) || {};
  it.g = v.g || null;
  it.dz = v.dz != null ? v.dz : null;
  it.cls = v.cls || sceneObjClass(it.o);
  it.view = v.view || 'side';
  it.haze = null;
  it.direct = null;
  it.shade = true;
  if (v.z != null) it.z = _scgrR2(v.z);
  if (v.cover) it.cover = true;
  if (q && q.anim == null && !q.strip && it.anim && it.anim.length && G.autoAnim) G.autoAnim.add(it);   // the object's default hooks: the engine may keep them still
  return it;
}
/**
 * The animation level of detail (12, 25): hooks the author did not ask for stay still on items under SCENE_V2_ANIM.minUnits tall (movers 16),
 * and beyond an animated-area budget (the per-frame redraw: the moving parts' boxes on screen, between the corpus's median and 75th
 * percentile; v1 gold scenes: median 170k, p75 300k), movers (people, animals, birds, boats) kept first, then the smallest.
 * Restates the v1 stats it changes.
 */
const SCENE_V2_ANIM = Object.freeze({ minUnits: 36, minMover: 16, area: 220000 });
function _scgrAnimLod(G, C) {
  if (!G.autoAnim || typeof sceneObjShapes !== 'function') return;
  const movers = ['person', 'cyclist', 'animal', 'animal-dog', 'animal-graze', 'bird-water', 'bird-ground', 'boat', 'car', 'bus', 'tram', 'train'];
  const partBox = (sh, p) => { let b = null; for (const x of (p === '*' ? Object.values(sh.parts).flat() : sh.parts[p] || [])) { const q = typeof scenePathBox === 'function' ? scenePathBox(x.d, x.m) : null; if (q) b = b ? [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])] : q; } return b; };
  const cand = [];
  let small = 0, over = 0, fixed = 0;
  for (const it of C.items) {
    if (!it.anim || !it.anim.length || it.strip >= 0) continue;
    const sh = sceneObjShapes(it.o, it.v, it.season);
    if (!sh) continue;
    let area = 0;
    for (const p of new Set(it.anim.flatMap(a => a.parts || [a.part || '*']))) { const b = partBox(sh, p); if (b) area += (b[2] - b[0]) * (b[3] - b[1]); }
    area *= it.s * it.s;
    if (!G.autoAnim.has(it)) { fixed += area; continue; }
    const mover = movers.includes(it.cls);
    if ((sh.box[3] - sh.box[1]) * it.s < (mover ? SCENE_V2_ANIM.minMover : SCENE_V2_ANIM.minUnits)) { it.anim = []; small++; continue; }
    cand.push({ it, area, mover });
  }
  cand.sort((a, b) => (b.mover - a.mover) || a.area - b.area);
  let used = fixed;
  for (const c of cand) { if (used + c.area <= SCENE_V2_ANIM.area) used += c.area; else { c.it.anim = []; over++; } }
  if (!small && !over) return;
  const parts = C.items.reduce((n, it) => n + it.anim.reduce((m, a) => m + (a.parts ? a.parts.length : 1), 0), 0);
  C.stats.animatedDraws += parts - C.stats.animatedParts;
  C.stats.animatedParts = parts;
  C.stats.staticItems = C.items.filter(i => !i.anim.length && i.strip < 0).length;
  C.problems.push({ rule: 'animLod', sev: 'info', i: null, obj: null, at: null, msg: `animation kept still on ${small} small item(s) and ${over} over the animated-area budget (${Math.round(used / 1000)}k of ${SCENE_V2_ANIM.area / 1000}k units^2)`, fix: "give a placement anim: {...} to keep its motion" });
}
/**
 * Movers behind a building stay still (integration, 8 Oct). A moving part is drawn each frame OVER its bake group's bitmap, so a
 * swaying tree behind a projected building (drawn later in the same group) showed through the facade. Each animated item with a
 * building, structure or landmark drawn after it in the same bake group whose screen box overlaps it is baked still instead.
 */
function _scgrOccludedStill(C) {
  const big = (it) => !!it.direct || it.cls === 'building' || it.cls === 'structure' || it.cls === 'landmark';
  if (!C.items.some(big)) return;
  const plan = typeof sceneBakePlan === 'function' ? sceneBakePlan(C) : C.layers.map(l => ({ layers: [l.i] }));
  const groupOf = [];
  plan.forEach((gr, gi) => gr.layers.forEach(l => { groupOf[l] = gi; }));
  const boxes = C.items.map(it => (big(it) ? _scgrItemBox(it) : null));
  const ov = (a, b) => a && b && !(a[2] <= b[0] || a[0] >= b[2] || a[3] <= b[1] || a[1] >= b[3]);
  let n = 0;
  C.items.forEach((it, i) => {
    if (!it.anim || !it.anim.length || it.strip >= 0 || big(it)) return;
    const b = _scgrItemBox(it);
    for (let j = i + 1; j < C.items.length; j++) {
      const o = C.items[j];
      if (!boxes[j] || (o.anim && o.anim.length) || groupOf[o.layer] !== groupOf[it.layer]) continue;
      if (ov(b, boxes[j])) { it.anim = []; n++; break; }
    }
  });
  if (!n) return;
  const parts = C.items.reduce((m, it) => m + it.anim.reduce((k, a) => k + (a.parts ? a.parts.length : 1), 0), 0);
  C.stats.animatedDraws += parts - C.stats.animatedParts;
  C.stats.animatedParts = parts;
  C.stats.staticItems = C.items.filter(x => !x.anim.length && x.strip < 0).length;
  C.problems.push({ rule: 'animLod', sev: 'info', i: null, obj: null, at: null, msg: `animation kept still on ${n} item(s) behind a building (moving parts draw over the baked layer)`, fix: 'none needed' });
}
/** The screen box of a compiled item (scene units), from its object's box. */
function _scgrItemBox(it) {
  if (it.direct && it.direct.box) return it.direct.box;
  const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(it.o, it.v, it.season) : null;
  if (!sh) return null;
  const b = sh.box, s = it.s;
  return it.flip ? [it.x - b[2] * s, it.y + b[1] * s, it.x - b[0] * s, it.y + b[3] * s] : [it.x + b[0] * s, it.y + b[1] * s, it.x + b[2] * s, it.y + b[3] * s];
}
/**
 * Stages 7 to 9 of the v2 compile (12), on the compiled scene C (its v1 fields already made by the core): F's direct items, D's
 * flows, C's atmosphere, weather and lights, the draw order with buildings, the v2 stats. Returns C.
 */
function sceneCompileV2Finish(G, C) {
  const cam = G.cam, data = G.data;
  C.v = 2;
  C.cam = { eye: cam.eye, fov: cam.fov, horizon: cam.horizon, heading: cam.heading, x0: cam.x0, f: _scgrR3(cam.f), dMin: _scgrR3(cam.dMin), dMax: cam.dMax, water: cam.water,
    lat: cam.lat, lon: cam.lon, alt: cam.alt, bands: cam.bands.map(b => ({ id: b.id, i: b.i, d0: b.d0, d1: b.d1 === Infinity ? null : b.d1 })), relief: cam.relief };
  C.view = Object.assign({}, C.view, { horizon: cam.horizon, fov: cam.fov, heading: cam.heading });
  if (Number.isFinite(cam.lat) && !Number.isFinite(C.view.lat)) C.view.lat = cam.lat;
  if (Number.isFinite(cam.lon) && !Number.isFinite(C.view.lon)) C.view.lon = cam.lon;
  C.surfaces = G.surfaces;
  C.problems = G.problems;
  C.drive = G.drive;   // the lanes' side (keep-left in the UK): sceneGroundSnap on a compiled scene (the editor) uses it
  // F's projected buildings: direct items, by depth (their building records index F's list: rebased onto C.items)
  const genItems = (G.gen.items || []).filter(x => x && typeof x === 'object'), genBase = C.items.length, genAt = new Map();
  genItems.forEach((gi, k) => {
    const d = Number.isFinite(gi.dz) ? gi.dz : (gi.g && gi.g.d) || 50;
    const it = Object.assign({ o: gi.o || 'building.gen', v: 0, x: 0, y: _scgrRow(cam, d), s: 1, flip: false, haze: null, tint: null, season: C.season, seed: 0, strip: -1, anim: [], glowOn: null, shadow: true, reflect: true, lit: false, shade: true },
      gi, { layer: Number.isInteger(gi.layer) ? gi.layer : sceneDepthBand(cam, d), z: Number.isFinite(gi.z) ? gi.z : _scgrRow(cam, d), dz: d, cls: gi.cls || 'building', view: gi.view || 'side' });
    genAt.set((G.gen.items || []).indexOf(gi), genBase + k);
    C.items.push(it);
  });
  C.buildings = (G.gen.buildings || []).map(b => Object.assign({}, b, Number.isInteger(b.i) && genAt.has(b.i) ? { i: genAt.get(b.i) } : {}));
  // F's signs (only with data.signage): in the v1 sign form, in their building's layer
  for (const sg of (G.gen.signs || [])) {
    if (!data.signage || C.signs.length >= 6 || !sg || !Number.isFinite(sg.x) || !Number.isFinite(sg.y) || typeof sg.text !== 'string') continue;
    const t = typeof sceneSignText === 'function' ? sceneSignText(sg.text) : { ok: true, text: sg.text };
    if (!t.ok) continue;
    const host = Number.isInteger(sg.i) && genAt.has(sg.i) ? C.items[genAt.get(sg.i)] : null;
    C.signs.push({ layer: host ? host.layer : sceneDepthBand(cam, 50), x: sg.x, y: sg.y, w: sg.w || 60, h: sg.h || 12, text: t.text, bars: (sg.bars || []).slice(0, 6), style: ['board', 'fascia', 'totem'].includes(sg.style) ? sg.style : 'fascia', ink: sg.ink || '#1d2226', board: sg.board || '#f4f1e8', seed: C.signs.length });
  }
  // the draw order with buildings (4.6): footprints of the generated buildings and of placements that declare `foot`
  const feet = [];
  C.items.forEach((it, i) => {
    if (it.direct && it.direct.foot) feet.push({ i, foot: it.direct.foot });
    else if (Array.isArray(it.foot) && it.foot.length >= 3) feet.push({ i, foot: it.foot });
  });
  for (const b of C.buildings) if (Number.isInteger(b.i) && Array.isArray(b.foot)) { const k = feet.findIndex(f => f.i === b.i); if (k < 0) feet.push({ i: b.i, foot: b.foot }); }
  if (feet.length) {
    const rows = C.items.map(it => ({ layer: it.layer, z: it.z, g: it.g || (Number.isFinite(it.dz) ? { x: 0, d: it.dz } : null), box: _scgrItemBox(it) }));
    const r = sceneDepthOrder(rows, feet, cam);
    r.layers.forEach((l, i) => { C.items[i].layer = l; });
    const perm = r.order, old = C.items.slice(), map = new Map(perm.map((oi, ni) => [oi, ni]));
    C.items.length = 0;
    for (const oi of perm) C.items.push(old[oi]);
    for (const st of C.strips) st.items = st.items.map(k => map.get(k));
    for (const b of C.buildings) if (Number.isInteger(b.i)) b.i = map.get(b.i);
    C.items.forEach((it, i) => { if (it.strip >= 0) { /* strips keep their own index lists */ } });
    C.problems.push(...r.problems);
  } else if (genItems.length) {
    const old = C.items.slice(), idx = old.map((it, i) => i).sort((a, b) => old[a].layer - old[b].layer || old[a].z - old[b].z || a - b), map = new Map(idx.map((oi, ni) => [oi, ni]));
    C.items.length = 0;
    for (const oi of idx) C.items.push(old[oi]);
    for (const st of C.strips) st.items = st.items.map(k => map.get(k));
  }
  _scgrOccludedStill(C);
  _scgrAnimLod(G, C);
  // D: flows; C: atmosphere, weather, lights (each guarded: a missing builder removes only its feature)
  const v1Draws = C.stats.animatedDraws;
  C.flows = [];
  if (typeof sceneFlowCompile === 'function') { try { const f = sceneFlowCompile(data, C, { otherDraws: v1Draws, lod: C.lod }); C.flows = Array.isArray(f) ? f : (C.flows || []); } catch (e) { C.problems.push({ rule: 'flow', sev: 'warn', i: null, obj: null, at: null, msg: 'the flows failed: ' + String(e && e.message).slice(0, 120), fix: 'check flows' }); } }
  if (typeof sceneAtmosCompile === 'function') { try { sceneAtmosCompile(data, C); } catch (e) { C.atmos = null; } } else C.atmos = null;
  if (typeof sceneWeatherCompile === 'function') { try { sceneWeatherCompile(data, C); } catch (e) { C.weather = { input: 'live' }; } } else C.weather = { input: data.weather === 'none' ? 'none' : (data.weather || 'live') };
  C.lights = [];
  if (typeof sceneLightsOf === 'function') { try { const l = sceneLightsOf(C); C.lights = Array.isArray(l) ? l : C.lights; } catch (e) { C.lights = []; } }
  C.cover = { auto: G.coverAuto !== false, n: G.stats.coverItems };
  const src = data.source || {};
  C.source = { osm: src.osm ? Object.assign({}, src.osm) : null, terrain: src.terrain ? Object.assign({}, src.terrain) : (data.terrain && data.terrain.src ? { src: data.terrain.src, fetched: data.terrain.fetched || null } : null) };
  // stats (12): the flows' and the effects' draws join the 300 budget
  let flowDraws = 0, flowMax = 0;
  if (C.flows.length) {
    if (typeof sceneFlowStats === 'function') { try { const s = sceneFlowStats(C.flows) || {}; flowDraws = s.flowDraws || s.draws || 0; flowMax = s.flowMax || s.max || 0; } catch (e) { /* estimated below */ } }
    if (!flowDraws) for (const f of C.flows) { flowMax += f.max || 0; flowDraws += (f.max || 0) * (f.draws || 3); }
  }
  let fxDraws = 0, ripple = 0, glints = 0;
  for (const w of C.water) if (w.v2) { const rows = Math.max(0, w.y1 - w.y0); if (w.v2.ripple > 0.01) ripple += Math.min(90, Math.ceil(rows / 4)); glints += w.lightPath ? 30 : 0; }
  const rings = Math.min(16, C.items.filter(it => it.cls === 'bird-water' && it.g && C.water.some(w => w.v2 && w.v2.id === it.g.surf)).length);
  fxDraws = Math.min(160, ripple) + Math.min(30, glints) + rings + C.actors.filter(a => a.$ground && a.$ground.floats).length;
  const pr = { info: 0, warn: 0, error: 0 };
  for (const p of C.problems) if (pr[p.sev] != null) pr[p.sev]++;
  C.stats.v2 = { groundItems: G.stats.groundItems, pixelItems: G.stats.pixelItems, snapped: G.stats.snapped, refused: G.stats.refused, surfaces: C.surfaces.length, waterV2: C.water.filter(w => w.v2).length,
    flows: C.flows.length, flowMax, flowDraws, fxDraws, lights: C.lights.length, buildings: C.buildings.length, coverItems: G.stats.coverItems, problems: pr };
  C.stats.animatedDraws = v1Draws + flowDraws + fxDraws;
  return C;
}
