/* ============================================================
   COMPOSED SCENES (v2, by hand) uk-north / Sheffield's parks: four real viewpoints. docs/dev/SCENE_ENGINE_V2.md.
   Objects and helpers in 70-scene-lib-sheffield-parks.js; registered by 72-anim-pack-uk-north-sheffield-parks.js.

   v1  The Botanical Gardens (Clarkehouse Road): from the foot of the main lawn, looking north up the slope to the three
       curvilinear glass pavilions on their terrace (1836). The gravel walk curves up the lawn to the central steps; the
       herbaceous borders run up both sides; specimen trees stand on the lawn's edges and the gardens' woods close round
       behind. Framing: an ivy-clad trunk on the left, a beech bough across the top right.
       Life: picnics and a ball game on the lawn, a photographer lining up the pavilions, walkers and a dog on the walk,
       grey squirrels, a robin on the border, pigeons, swallows in summer.
         https://www.sbg.org.uk/   https://historicengland.org.uk/listing/the-list/list-entry/1247336
   PURE: defines the scene functions, called once each, lazily.
   ============================================================ */
const SCENE_SHP_VIEWS = Object.freeze({
  v1: { camera: { eye: 1.6, fov: 62, horizon: 452, heading: 352, lat: 53.3717, lon: -1.4994 } },
  v2: { camera: { eye: 1.65, fov: 64, horizon: 430, heading: 255, lat: 53.3666, lon: -1.5001, water: -0.45 } },
  v3: { camera: { eye: 2.0, fov: 80, horizon: 400, heading: 160, lat: 53.3833, lon: -1.4905 } },
  v4: { camera: SCENE_SHP_V4.camera },
});

/** The people and life helpers shared by the views. */
function _shpLife(data) {
  const Pl = data.place, A = data.actors;
  return {
    put: (obj, x, d, o) => Pl.push(Object.assign({ obj, at: [x, d] }, o || {})),
    walk: (obj, pts, sp, o) => A.push(Object.assign({ obj, ground: pts, speedM: sp, loop: 'pingpong' }, o || {})),
  };
}

function sceneUkSheffieldParksV1() {
  const S = SCENE_SHP, cam = SCENE_SHP_VIEWS.v1.camera, H = cam.horizon;
  const R2 = v => Math.round(v * 100) / 100;
  // the lawn rises about 5 m from the camera to the terrace (the gardens fall south from Clarkehouse Road)
  const nd = 12, d0 = 4, d1 = 600, relief = [];
  for (let j = 0; j < nd; j++) {
    const d = d0 * Math.pow(d1 / d0, j / (nd - 1)), t = Math.max(0, Math.min(1, (d - 8) / (96 - 8))), h = R2(5.2 * t * t * (3 - 2 * t) + (d > 120 ? Math.min(4, (d - 120) * 0.012) : 0));
    for (let i = 0; i < 3; i++) relief.push(h);
  }
  const data = {
    v: 2, id: 'sheffield-parks-1',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'natural', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['temperate', 'urban', 'people', 'birds', 'animals'],
    sky: { stars: 160, clouds: { n: 5, y: [40, 260], speed: 4 }, sunR: 22, moonR: 16 },
    palette: {
      base: { tl: ['#7d9088', '#5f7462', '#4a5e44', '#6a7a52'], lawn: ['#79a24c', '#5e8a3a'], park: ['#6e9644', '#557a34'], garden: ['#4e6a34', '#3e5628'] },
      autumn: { tl: ['#94927a', '#8a7a52', '#6a5a36', '#a07a44'] },
      winter: { tl: ['#8a8e92', '#6e7276', '#585c5c', '#74706a'], lawn: ['#7a8a5a', '#66784a'], park: ['#76845a', '#5e6e46'] },
    },
    ground: { relief: { x: [-300, 300], d: [d0, d1], nx: 3, nd, h: relief } },
    surfaces: [
      { id: 'land', kind: 'park', rest: true },
      { id: 'woods', kind: 'wood', poly: [[-400, 104], [400, 104], [400, 900], [-400, 900]] },
      { id: 'lawn', kind: 'lawn', poly: [[-34, 15], [30, 12], [34, 90], [-38, 90]] },
      { id: 'border-l', kind: 'garden', poly: [[-40, 15], [-33, 15], [-38, 88], [-46, 88]] },
      { id: 'border-r', kind: 'garden', poly: [[31, 12], [37, 12], [42, 88], [35, 88]] },
      // the beds either side of the walk at the foot of the lawn (the near border)
      { id: 'bed-l', kind: 'garden', poly: [[-16, 2], [-1.5, 2], [-1.6, 8], [-2.6, 13.5], [-6, 15], [-16, 15]] },
      { id: 'bed-r', kind: 'garden', poly: [[1.6, 2], [16, 2], [16, 11.5], [4.6, 11.5], [2.6, 9], [1.9, 6]] },
      // two round island beds of summer bedding on the lawn
      { id: 'island-1', kind: 'lawn', poly: SCENE_SHP.loop([[-17, 36], [-13, 33.6], [-9, 36], [-13, 38.4]], 0.8, 0, 1271) },
      { id: 'island-2', kind: 'lawn', poly: SCENE_SHP.loop([[11, 44], [15, 41.8], [19, 44], [15, 46.2]], 0.8, 0, 1273) },
      { id: 'terrace-walk', kind: 'path', poly: [[-70, 90.5], [70, 90.5], [70, 97], [-70, 97]] },
      { id: 'walk', kind: 'path', path: [[0, 1.5], [0.2, 9], [1.4, 20], [2.4, 34], [2.0, 52], [0.9, 72], [0, 91]], width: 2.6 },
      { id: 'walk-x', kind: 'path', path: [[-31, 34], [-20, 44], [-8, 52], [2.6, 55]], width: 2.2 },
    ],
    water: [], place: [], scatter: [], actors: [], flocks: [],
    flows: [
      { id: 'strollers', kind: 'walk', on: ['walk', 'walk-x'], lanes: [{ path: [[2.1, 18], [2.4, 34], [2.0, 52], [0.9, 72], [0, 90]], dir: 1 }, { path: [[0, 90], [0.9, 72], [2.0, 52], [2.4, 34], [2.1, 18]], dir: 1 }, { path: [[0, 90], [-12, 91.2], [-30, 91.0]], dir: 1 }, { path: [[30, 91.2], [12, 91.2], [0, 90]], dir: 1 }], density: 2.4, profile: 'leisure', mix: { 'person.walker': 3, 'person.couple': 2, 'person.elderly-couple': 1, 'person.buggy-walker': 1, 'person.dog-walker': 2, 'person.family': 2, 'person.student': 1, 'person.wheelchair-user': 1 }, speed: [0.8, 1.3], both: true, max: 14, seed: 11 },
      { id: 'cross-walk', kind: 'walk', on: ['walk-x'], lanes: [{ path: [[-31, 34], [-20, 44], [-8, 52], [2.4, 55]], dir: 1 }, { path: [[2.4, 55], [-8, 52], [-20, 44], [-31, 34]], dir: 1 }], density: 1.4, profile: 'leisure', mix: { 'person.walker': 2, 'person.couple': 2, 'person.family': 1, 'person.elderly-walker': 1 }, speed: [0.8, 1.2], both: true, max: 5, seed: 12 },
    ],
  };
  // the far woods and the Victorian villas' roofs above Clarkehouse Road (screen rows, behind the pavilions)
  const gnd = [];
  gnd.push({ layer: 'horizon', d: S.trees(H - 40, 1201, 18, 58, H + 40), fill: { lin: [[0, '@tl.0'], [1, '@tl.1']], y1: H - 120, y2: H + 30 } });
  gnd.push({ layer: 'far', d: S.trees(H - 22, 1213, 14, 46, H + 40), fill: { lin: [[0, '@tl.3'], [1, '@tl.2']], y1: H - 90, y2: H + 30 } });
  data.ground.fills = gnd;
  const Pl = data.place, Sc = data.scatter, L = _shpLife(data);

  // ---- the pavilions on their terrace (the subject)
  Pl.push({ obj: 'landmark.shp-pavilions', at: [0, 100], fix: true, subject: true });
  // the gardens' woods close round behind: limes, beeches, a cedar, Scots pines; then the specimen trees on the lawn's edges
  Sc.push({ obj: { 'tree.wyv-far-oak': 3, 'tree.canal-oak': 2, 'tree.plane': 1, 'tree.pool-birch': 1, 'tree.pond-pine': 1 }, on: 'woods', d: [108, 260], n: 22, dist: 'ground', cluster: { centres: 7, spread: 18 }, gap: 'foot', k: [0.85, 1.25], seed: 1221, anim: false, tint: { col: '#6a7a6a', k: [0.02, 0.06] } });
  L.put('tree.cedar', -64, 112, { k: 1.25, anim: false });
  L.put('tree.plane', 66, 108, { k: 1.15, variant: 1, anim: false });
  L.put('tree.canal-oak', -46, 58, { k: 1.05, anim: false });
  L.put('tree.wyv-far-oak', 52, 70, { k: 1.1, anim: false });
  L.put('tree.bank-birch', 22, 30, { k: 0.95, anim: false });
  L.put('tree.canal-oak', -58, 92, { k: 1.0, variant: 1, anim: false });
  // the borders: herbaceous clumps in drifts, shrubs at the back, low box at the lawn edge
  Sc.push({ obj: { 'plant.shp-border': 6, 'plant.daisies': 1 }, on: ['border-l', 'border-r'], d: [12, 90], n: 220, dist: 'screen', cluster: { centres: 14, spread: 1.6 }, k: [0.8, 1.2], seed: 1231, anim: 'strip', species: 1, tint: { col: '#8a5a7a', k: [0.02, 0.06] } });
  // the near beds: dense drifts round the walk, taller at the back, a low clipped edge along the walk
  Sc.push({ obj: { 'plant.shp-border': 8, 'plant.daisies': 2 }, on: ['bed-l', 'bed-r'], d: [4.5, 16], n: 180, dist: 'screen', cluster: { centres: 12, spread: 0.8 }, k: [0.75, 1.0], seed: 1237, anim: 'strip', species: 1, tint: { col: '#a05a6a', k: [0.02, 0.06] } });
  Sc.push({ obj: { 'ground.leaf-litter': 1, 'ground.petals': 1 }, on: ['walk', 'walk-x', 'terrace-walk'], d: [4, 40], n: 70, dist: 'screen', k: [0.8, 1.2], seed: 1283, anim: false, tint: { col: '#7a5a3a', k: [0.02, 0.06] } });
  // the lawn: fine grass, clover and daisies across the whole width (the mown stripes show between)
  Sc.push({ obj: { 'plant.grass': 6, 'plant.daisies': 3, 'plant.wildflowers': 1 }, on: ['lawn', 'land', 'walk'], d: [4.5, 70], n: 480, dist: 'screen', cluster: { centres: 26, spread: 2.5 }, k: [0.75, 1.15], seed: 1281, anim: false, species: 1, tint: { col: '#8a8a40', k: [0.02, 0.06] } });
  Sc.push({ obj: { 'plant.hedge': 2, 'plant.shrub': 3, 'plant.holly': 1 }, on: 'land', d: [45, 100], n: 50, dist: 'screen', cluster: { centres: 8, spread: 3 }, k: [0.8, 1.3], seed: 1233, anim: false, species: 1 });
  Sc.push({ obj: { 'plant.shp-border': 3, 'plant.shrub': 1 }, on: 'terrace-walk', d: [96, 97], n: 40, dist: 'screen', k: [0.8, 1.1], seed: 1235, anim: false, species: 1, tint: { col: '#a05a6a', k: [0.02, 0.06] } });
  Sc.push({ obj: { 'plant.shp-border': 4, 'plant.daisies': 1 }, on: ['island-1', 'island-2'], d: [30, 50], n: 260, dist: 'screen', cluster: { centres: 6, spread: 1.2 }, k: [0.95, 1.3], seed: 1275, anim: false, species: 1, tint: { col: '#c06a4a', k: [0.02, 0.06] } });
  L.put('street.lamp', -6, 56, { k: 0.9 }); L.put('street.lamp', 6.5, 76, { k: 0.9 }); L.put('street.bench', 5, 24, { k: 1, face: 'left' });
  // benches along the terrace walk and by the cross walk, people on some
  L.put('street.bench', -36, 93.5, { k: 1 }); L.put('street.bench', 30, 93.6, { k: 1 }); L.put('street.bench', -24, 47, { k: 1 });
  L.put('person.bench-reader', -36, 93.4, { k: 0.8 }); L.put('person.bench-sitter', -24.4, 46.9, { k: 0.8, variant: 1 });
  // the lawn's life: two picnics, a ball game, a photographer lining up the pavilions, a family resting, sunbathers in summer
  L.put('person.picnicker', -9, 24, { k: 0.6 }); L.put('person.picnicker', -11.4, 25.5, { k: 0.6, variant: 1, flip: true });
  L.put('person.child-ball', 6, 30);
  L.put('person.photographer', -4, 64, { k: 1, face: 'away' });
  L.put('animal.dog', 1.2, 26, { k: 1 });
  // grey squirrels on the lawn and at the foot of the chestnut, pigeons pecking, a robin on the border's edge
  L.put('animal.squirrel', -6, 18, { k: 1.2 }); L.put('animal.squirrel', -42, 56, { k: 1.1, flip: true }); L.put('animal.squirrel', 9, 16, { k: 1.2 });
  { const r = S.rnd(1241); for (const [cx, cd, n] of [[5, 19, 5], [-6, 40, 4], [20, 60, 3]]) for (let i = 0; i < n; i++) L.put('bird.pigeon', R2(cx + (r() - 0.5) * 3), R2(cd + (r() - 0.5) * 2.4), { k: R2(0.9 + r() * 0.2), variant: Math.floor(r() * 3), flip: r() < 0.5 }); }
  L.put('bird.robin', -2.2, 6, { k: 1 });
  // walkers who stop and go: a dog walker crossing the lawn, a jogger on the walk
  // the lawn rises toward the terrace (ground relief), so the movers here are flow lanes in ground metres: the engine sizes and
  // grounds them on the relief (a pixel-path actor is back-projected onto flat ground by the motion lint and fails)
  data.flows.push({ id: 'lawn-life', kind: 'walk', on: ['lawn'], lanes: [{ path: [[-26, 20], [-18, 24], [-8, 28], [0.4, 30]], dir: 1 }, { path: [[0.4, 30], [-8, 28], [-18, 24], [-26, 20]], dir: 1 }, { path: [[0.2, 6], [0.6, 14], [1.6, 22], [2.2, 30]], dir: 1 }, { path: [[16, 20], [10, 30], [6, 44]], dir: 1 }], density: 1.2, profile: 'leisure', mix: { 'person.dog-walker': 3, 'person.jogger': 2, 'person.couple': 2, 'person.child-scooter': 1 }, speed: [0.9, 1.4], both: true, max: 5, seed: 13 });
  // more life on the lawn: picnic groups, sunbathers, readers, a family on a rug (the lawn's middle was bare)
  { const r = S.rnd(1257); for (const [x, d] of [[-20, 30], [-26, 52], [14, 26], [22, 38], [-14, 64], [12, 60], [26, 74], [-30, 78], [-6, 20], [8, 22], [-4, 44], [16, 50]]) { L.put('person.picnicker', x, d, { k: 0.6, variant: Math.floor(r() * 3), flip: r() < 0.5, tint: ['#5a4a8a', R2(r() * 0.16)] }); if (r() < 0.7) L.put('person.picnicker', R2(x + 1.3), R2(d + 0.4), { k: 0.6, variant: Math.floor(r() * 3), flip: r() < 0.5, tint: ['#8a4a3a', R2(r() * 0.16)] }); } }
  L.put('person.child-ball', 18, 32); L.put('person.child-jumping', 8.6, 40); L.put('person.photographer', 10, 50, { face: 'away' });
  data.flocks.push({ obj: 'bird.small-flight', n: 6, area: [200, 120, 1400, 320], speed: 40, s: 0.35, seed: 1261, layer: 'horizon' });
  data.flocks.push({ obj: 'bird.wp-swallow', n: 3, area: [300, 260, 1300, 420], speed: 90, s: 0.5, seed: 1262, layer: 'mid' });
  // ---- framing: the ivy-clad trunk up the left edge, its bough over the top; a border clump at the foot on the right
  Pl.push({ obj: 'tree.shp-trunk', x: 30, y: 935, s: 1.0, pin: true, layer: 'front', shadow: false, anim: { sway: { k: 0.5 } } });
  Pl.push({ obj: 'plant.shp-bough', x: 1700, y: -20, s: 1.0, pin: true, layer: 'front', shadow: false, flip: true });
  Pl.push({ obj: 'plant.shp-border', x: 1520, y: 960, s: 2.0, pin: true, layer: 'front', shadow: false },
    { obj: 'plant.shp-border', x: 160, y: 968, s: 1.8, variant: 2, pin: true, layer: 'front', shadow: false, flip: true });
  return data;
}

/* v2  Endcliffe Park: on the south bank of the Porter Brook below the cafe, looking upstream (west). The stepping stones
       cross the brook in a diagonal line just ahead (the leading line runs over them and on up the brook to the old mill
       weir); the park cafe stands on the far bank under the trees, its tables out; the gravel path runs up our bank.
       Framing: an ivy-clad trunk on the left, a sycamore bough over the top.
       Life: children hopping the stones, a parent waiting, a dog who would rather wade, mallards and a moorhen on the
       brook, people at the cafe tables, dog walkers, buggies and joggers on the path, pigeons, a grey squirrel.
         https://www.sheffield.gov.uk/parks-sport-recreation/parks/endcliffe-park   https://www.porterbrook.org.uk/ */
function sceneUkSheffieldParksV2() {
  const S = SCENE_SHP, cam = SCENE_SHP_VIEWS.v2.camera, H = cam.horizon, P = S.proj(cam);
  const R1 = v => Math.round(v * 10) / 10, R2 = v => Math.round(v * 100) / 100, R3 = v => Math.round(v * 1000) / 1000;
  // the brook: [x, d, width] from our feet upstream to where it bends out of sight under the trees
  const brook = [[5.2, 1.0, 6.4], [4.4, 6, 6.8], [3.6, 12, 7.2], [2.6, 20, 7.0], [1.2, 30, 6.6], [1.6, 42, 6.2], [4.2, 56, 5.8], [5.6, 74, 5.2], [4.0, 100, 4.6], [0.6, 140, 4.0], [-4, 190, 3.6]];
  const widthAt = (d) => { for (let k = 0; k < brook.length - 1; k++) if (d >= brook[k][1] && d <= brook[k + 1][1]) { const t = (d - brook[k][1]) / (brook[k + 1][1] - brook[k][1]); return [brook[k][0] + t * (brook[k + 1][0] - brook[k][0]), brook[k][2] + t * (brook[k + 1][2] - brook[k][2])]; } return [brook[brook.length - 1][0], brook[brook.length - 1][2]]; };
  const water = S.stream(S.line(brook.map(p => [p[0], p[1]]), 2).map(p => [p[0], p[1], widthAt(p[1])[1]]), 2201);
  // our bank: a strip of rough grass and ferns along the water's left edge
  const bankL = S.stream(S.line(brook.map(p => [p[0] - p[2] / 2 - 0.9, p[1]]), 2).map(p => [p[0], p[1], 1.8]), 2203);
  const data = {
    v: 2, id: 'sheffield-parks-2',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'natural', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['temperate', 'urban', 'water', 'people', 'birds', 'animals'],
    sky: { stars: 140, clouds: { n: 4, y: [40, 240], speed: 4 }, sunR: 22, moonR: 16 },
    palette: {
      base: { tl: ['#7d9088', '#5f7462', '#4a5e44', '#6a7a52'], park: ['#6e9644', '#557a34'], bank: ['#6a7a3e', '#4e5a2c'] },
      autumn: { tl: ['#94927a', '#8a7a52', '#6a5a36', '#a07a44'] },
      winter: { tl: ['#8a8e92', '#6e7276', '#585c5c', '#74706a'], park: ['#76845a', '#5e6e46'] },
    },
    surfaces: [
      { id: 'land', kind: 'park', rest: true },
      { id: 'woods', kind: 'wood', poly: [[-300, 120], [300, 120], [300, 800], [-300, 800]] },
      { id: 'bank-l', kind: 'bank', poly: bankL },
      { id: 'path', kind: 'path', path: [[-3.2, 1.5], [-3.6, 10], [-5.0, 22], [-6.4, 36], [-5.2, 52], [-2.6, 70], [-1.6, 100]], width: 2.6 },
      { id: 'cafe-yard', kind: 'plaza', poly: [[7.4, 22], [22, 22], [22, 34], [9, 34]] },
      { id: 'path-n', kind: 'path', path: [[8, 22.5], [10, 18], [16, 12], [30, 8]], width: 2.2 },
    ],
    water: [{ id: 'brook', kind: 'river', poly: water, edge: 'natural', flow: 0.5, ripple: 0.45, mirror: 0.55, clarity: 0.4, bed: '#6a5a42', rings: true }],
    ground: [], place: [], scatter: [], actors: [], flocks: [],
    flows: [
      { id: 'path-walkers', kind: 'walk', on: ['path'], lanes: [{ path: [[-3.3, 6], [-3.6, 10], [-5.0, 22], [-6.4, 36], [-5.2, 52], [-2.6, 70], [-1.6, 100]], dir: 1 }, { path: [[-1.6, 100], [-2.6, 70], [-5.2, 52], [-6.4, 36], [-5.4, 22], [-4.0, 10], [-3.9, 6]], dir: 1 }], density: 2.6, profile: 'leisure', mix: { 'person.dog-walker': 4, 'person.buggy-walker': 2, 'person.walker': 2, 'person.jogger': 2, 'person.family': 1, 'person.elderly-couple': 1 }, speed: [0.9, 1.4], both: true, max: 8, seed: 21 },
      { id: 'far-bank', kind: 'walk', on: ['path-n'], density: 1.2, profile: 'leisure', mix: { 'person.walker': 2, 'person.student': 1, 'person.dog-walker': 2 }, speed: [0.9, 1.3], both: true, max: 3, seed: 22 },
    ],
  };
  data.ground.push({ layer: 'horizon', d: S.trees(H - 30, 2211, 22, 70, H + 40), fill: { lin: [[0, '@tl.0'], [1, '@tl.1']], y1: H - 130, y2: H + 30 } });
  data.ground.push({ layer: 'far', d: S.trees(H - 8, 2213, 18, 56, H + 40), fill: { lin: [[0, '@tl.3'], [1, '@tl.2']], y1: H - 90, y2: H + 30 } });
  const Pl = data.place, Sc = data.scatter, L = _shpLife(data);
  const pin = (obj, x, d, h, k, o) => { const def = typeof sceneObj === 'function' ? sceneObj(obj) : null; if (!def) return; const p = P.p(x, d, h); const real = def.real ? def.real.h : (typeof sceneObjReal === 'function' ? sceneObjReal(obj).h : 1); Pl.push(Object.assign({ obj, x: R1(p[0]), y: R1(p[1]), s: R3(k * P.f / d * real / def.size[1]), pin: true, anim: false, shadow: false }, o || {})); };

  // ---- the cafe on the far bank, its yard and tables (the subject), the playground's trees behind
  L.put('building.shp-park-cafe', 14.5, 30.5, { k: 1, subject: true, flip: true });
  L.put('person.cafe-goer', 10.6, 25.6, { k: 0.8 }); L.put('person.cafe-goer', 12.4, 25.9, { k: 0.8, flip: true }); L.put('person.cafe-goer', 18.6, 26.2, { k: 0.8 }); L.put('person.child-scooter', 6.4, 18.5, { k: 0.6 });
  L.put('street.bench', 16.5, 23.5, { k: 1 }); L.put('person.bench-sitter', 16.7, 23.4, { k: 0.8 });
  { const r = S.rnd(2221); for (let i = 0; i < 6; i++) L.put(i < 4 ? 'bird.pigeon' : 'bird.pigeon-feral', R2(11 + r() * 8), R2(23 + r() * 3), { k: R2(0.85 + r() * 0.35), variant: Math.floor(r() * 3), flip: r() < 0.5 }); }
  // ---- the stepping stones: eight squared blocks across the brook on a slight diagonal, pinned at the water's surface
  const stones = [[-0.6, 10.6], [0.3, 11.0], [1.2, 11.5], [2.15, 11.9], [3.05, 12.4], [3.95, 12.8], [4.85, 13.3], [5.8, 13.8]];
  stones.forEach(([x, d], i) => pin('structure.shp-stepping-stone', x, d, cam.water, [0.9, 1.15, 1.0, 0.85, 1.2, 0.95, 1.1, 0.88][i], { variant: (i * 3 + 1) % 4, flip: i % 2 === 1, reflect: true, anim: true }));
  // a child mid-hop on the stones, another waiting on the far side, a parent on our bank; a dog wading below the stones
  pin('person.child-jumping', 2.15, 11.9, cam.water + 0.42, 0.62, { layer: 'near', anim: true });
  pin('person.child-ball', 6.9, 14.2, 0, 0.6, { layer: 'near', anim: true });
  L.put('person.walker', -2.6, 16.5, { k: 1, face: 'right', anim: false });
  pin('animal.dog', 3.2, 9.4, cam.water + 0.05, 1.05, { layer: 'fore', reflect: true, anim: true });
  // ---- the old mill weir upstream: white water across the brook, the pool below it
  pin('structure.shp-weir', 1.4, 44, cam.water, 0.72, { anim: true, layer: 'mid' });
  // ---- the life on the brook: mallards paddling the pool, a pair resting in the stones' lee, a moorhen at the edge
  data.actors.push(sceneBehave.actor(data, { obj: 'bird.mallard', preset: 'duck', acts: ['look', 'preen', 'look'], route: [[2.2, 18], [0.6, 24], [2.6, 30]], seed: 2231, offset: 0.1 }),
    sceneBehave.actor(data, { obj: 'bird.mallard', preset: 'duck', acts: ['look', 'preen', 'look'], route: [[1.4, 26], [2.8, 29], [1.8, 32]], seed: 2232, variant: 1, offset: 0.55 }),
    sceneBehave.actor(data, { obj: 'bird.mallard', preset: 'duck', acts: ['look', 'preen', 'look'], route: [[0.6, 36], [2.4, 39]], seed: 2233, offset: 0.5 }),
    sceneBehave.actor(data, { obj: 'bird.moorhen', preset: 'moorhen', route: [[5.0, 19], [4.8, 23], [4.4, 27]], seed: 2234, offset: 0.3 }));
  L.put('bird.mallard', 4.6, 15.6, { variant: 1 });
  // ---- the trees: beeches, sycamores and alders along the banks, the park's big limes and oaks behind
  L.put('tree.canal-oak', 22, 40, { k: 1.2, anim: false });
  L.put('tree.wyv-far-oak', 8, 48, { k: 1.1, anim: false });
  L.put('tree.bank-alder', 9.5, 42, { k: 1.0, anim: false });
  L.put('tree.canal-willow', -7.5, 34, { k: 1.0, anim: false, flip: true });
  L.put('tree.canal-oak', -18, 46, { k: 1.15, variant: 1, anim: false });
  L.put('tree.pool-birch', -10, 18, { k: 0.95, anim: false });
  L.put('tree.wyv-far-oak', 30, 64, { k: 1.2, variant: 1, anim: false });
  Sc.push({ obj: { 'tree.wyv-far-oak': 3, 'tree.canal-oak': 2, 'tree.plane': 1, 'tree.bank-alder': 2, 'tree.pool-birch': 1 }, on: ['land', 'woods'], avoid: ['path', 'path-n', 'cafe-yard', 'bank-l'], d: [55, 220], n: 28, dist: 'ground', cluster: { centres: 8, spread: 14 }, gap: 'foot', k: [0.85, 1.25], seed: 2241, anim: false, tint: { col: '#6a7a6a', k: [0.02, 0.06] } });
  // the banks: ferns, long grass and meadowsweet at the water's edge; low cover under the trees
  Sc.push({ obj: { 'plant.grass-long': 6, 'plant.fern': 3, 'plant.grass': 3 }, on: ['bank-l'], d: [1.5, 60], n: 190, dist: 'screen', cluster: { centres: 12, spread: 1.0 }, k: [0.7, 1.1], seed: 2243, anim: false, species: 1, tint: { col: '#8a8a40', k: [0.02, 0.06] } });
  Sc.push({ obj: { 'plant.grass-long': 4, 'plant.fern': 3, 'plant.bluebells': 1, 'plant.grass': 2 }, on: ['land'], avoid: ['path', 'path-n', 'cafe-yard'], d: [2, 70], n: 240, dist: 'screen', cluster: { centres: 16, spread: 1.6 }, k: [0.7, 1.1], seed: 2245, anim: false, species: 1, tint: { col: '#6a7a3a', k: [0.02, 0.06] } });
  // the far bank's fringe along the water (pinned at the ground just above the water line: the scatter keeps off narrow ground)
  { const r = S.rnd(2247); for (let i = 0; i < 14; i++) { const d = 4 + r() * 80, [cx, w] = widthAt(d), x = cx + w / 2 + 0.2 + r() * 0.6, u = r();
      pin(u < 0.6 ? 'plant.grass-long' : u < 0.8 ? 'plant.fern' : 'plant.canal-view-meadowsweet', x, d, 0, 0.6 + r() * 0.7, { variant: Math.floor(r() * 3), flip: r() < 0.5, tint: ['#8a8a40', [0, 0.06][i % 2]] }); } }
  // stones in the brook bed breaking the surface
  { const r = S.rnd(2249); for (let i = 0; i < 12; i++) { const d = 5 + r() * 40, [cx, w] = widthAt(d); pin(i % 3 ? 'rock.stones' : 'rock.boulder', cx + (r() - 0.5) * w * 0.8, d, cam.water, i % 3 ? 0.5 + r() * 0.5 : 0.25 + r() * 0.15, { variant: Math.floor(r() * 3), reflect: true, flip: i % 2 === 1 }); } }
  Pl.push({ obj: 'water.fish-ring', at: [1.6, 26], k: 1.1, seed: 5, anim: { flicker: { period: 5.6 } } });
  L.put('animal.squirrel', -7.4, 14, { k: 1.2 }); L.put('bird.robin', -2.2, 5.5);
  data.flocks.push({ obj: 'bird.small-flight', n: 5, area: [200, 100, 1400, 300], speed: 40, s: 0.35, seed: 2261, layer: 'horizon' });
  // ---- framing: the ivy-clad trunk on the left, a sycamore bough across the top, ferns at the foot of the frame
  Pl.push({ obj: 'tree.shp-trunk', x: 20, y: 940, s: 1.04, variant: 1, pin: true, layer: 'front', shadow: false, anim: { sway: { k: 0.5 } } });
  Pl.push({ obj: 'plant.shp-bough', x: 1720, y: -30, s: 1.05, pin: true, layer: 'front', shadow: false, flip: true });
  Pl.push({ obj: 'plant.fern', x: 120, y: 960, s: 2.2, pin: true, layer: 'front', shadow: false, anim: false },
    { obj: 'plant.grass-long', x: 330, y: 950, s: 2.0, pin: true, layer: 'front', shadow: false, anim: false },
    { obj: 'plant.fern', x: 700, y: 965, s: 2.0, variant: 1, pin: true, layer: 'front', shadow: false, anim: false, flip: true },
    { obj: 'plant.grass-long', x: 900, y: 960, s: 1.8, variant: 2, pin: true, layer: 'front', shadow: false, anim: false });
  return data;
}

/* v3  Weston Park: from the lawn north of the bandstand, looking south-south-east down the main walk to the park gates on
       Western Bank. The bandstand stands on the left with the museum's gallery front behind it; through the gate piers
       Western Bank crosses the view, buses and cars both ways, students on both pavements; across the road the University's
       Firth Court with its gate tower and ogee-capped turrets, and the Arts Tower standing up beyond.
       Framing: a park lime over the right edge, the railed dwarf wall either side of the gates, flower beds at the walk.
       Life: students, dog walkers and a buggy on the walk, picnics and a ball game on the lawn, a busker by
       the gates, pigeons round the bandstand steps, squirrels, the buses and the traffic.
         https://www.museums-sheffield.org.uk/museums/weston-park/home   https://www.sheffield.ac.uk/ */
function sceneUkSheffieldParksV3() {
  const S = SCENE_SHP, cam = SCENE_SHP_VIEWS.v3.camera, H = cam.horizon;
  const R2 = v => Math.round(v * 100) / 100;
  // Western Bank: across the view, falling gently away to the left (east, toward the city)
  const roadD = x => 38 - 0.3 * x, road = [-260, -120, -40, 0, 40, 120, 200].map(x => [x, roadD(x)]);
  const edgeN = x => roadD(x) - 4.5 - 3.2;   // the park's boundary (the north pavement's back edge)
  const data = {
    v: 2, id: 'sheffield-parks-3',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'mixed', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['temperate', 'urban', 'people', 'birds', 'animals', 'vehicles'],
    sky: { stars: 100, clouds: { n: 5, y: [30, 240], speed: 5 }, sunR: 22, moonR: 16 },
    palette: {
      base: { tl: ['#7d9088', '#5f7462', '#4a5e44', '#6a7a52'], park: ['#6e9644', '#557a34'], city: ['#9aa4ae', '#7e8892', '#6a747e'] },
      autumn: { tl: ['#94927a', '#8a7a52', '#6a5a36', '#a07a44'] },
      winter: { tl: ['#8a8e92', '#6e7276', '#585c5c', '#74706a'], park: ['#76845a', '#5e6e46'] },
    },
    surfaces: [
      { id: 'land', kind: 'park', rest: true },
      { id: 'campus', kind: 'plaza', poly: [[-260, roadD(-260) + 6], [200, roadD(200) + 6], [200, 600], [-260, 600]] },
      { id: 'western-bank', kind: 'road', path: road, width: 9, markings: 'centre' },
      { id: 'pave-n', kind: 'pavement', beside: 'western-bank', side: 'right', width: 3.2, kerb: 0.12 },
      { id: 'pave-s', kind: 'pavement', beside: 'western-bank', side: 'left', width: 3.4, kerb: 0.12 },
      { id: 'walk', kind: 'path', path: [[0.4, 1.5], [1.6, 8], [1.0, 14], [0.2, 19], [0, 22.6]], width: 3.6 },
      { id: 'walk-b', kind: 'path', path: [[-30, 8.4], [-18, 8.6], [-6, 9.6], [1.4, 10.4]], width: 2.4 },
      { id: 'bed-l', kind: 'garden', poly: [[-7.5, 18], [-2.4, 18], [-2.2, 21.6], [-9, 21.8]] },
      { id: 'bed-r', kind: 'garden', poly: [[2.4, 18], [7.5, 18], [8, 20.6], [2.2, 21]] },
      { id: 'bed-near', kind: 'garden', poly: SCENE_SHP.loop([[-8.5, 4.2], [-3.2, 3.6], [-2.2, 6.4], [-4.6, 9.6], [-9.4, 8.6]], 0.6, 0, 3361) },
    ],
    water: [], ground: [], place: [], scatter: [], actors: [], flocks: [], buildings: [],
    flows: [
      { id: 'traffic', kind: 'drive', on: 'western-bank', density: 1.0, profile: 'town', mix: { 'vehicle.car-city': 5, 'vehicle.car': 3, 'vehicle.taxi': 1 }, bus: { obj: 'vehicle.shp-bus', every: 3 }, speed: [6, 10], max: 7, seed: 31 },
      { id: 'students', kind: 'walk', on: ['pave-s'], density: 3.0, profile: 'town', mix: { 'person.student': 6, 'person.walker': 3, 'person.commuter': 2, 'person.couple': 1, 'person.takeaway-walker': 1, 'person.elderly-walker': 1 }, speed: [1.0, 1.5], both: true, max: 16, seed: 32 },
      { id: 'cyclists', kind: 'cycle', on: 'western-bank', density: 0.3, profile: 'commuter', mix: { 'person.cyclist': 2, 'person.cyclist-commuter': 1 }, max: 2, seed: 33 },
      { id: 'park-walk', kind: 'walk', on: ['walk-b'], lanes: [{ path: [[0.8, 13.5], [0.6, 16], [0.2, 19], [0, 22.4]], dir: 1 }, { path: [[0, 22.4], [0.2, 19], [0.6, 16], [0.9, 13.5]], dir: 1 }, { path: [[-30, 8.4], [-18, 8.6], [-6, 9.6], [1.4, 10.4]], dir: 1 }, { path: [[1.4, 10.4], [-6, 9.6], [-18, 8.6], [-30, 8.4]], dir: 1 }, { path: [[0.5, 2.5], [1.6, 8], [1.2, 13]], dir: 1 }, { path: [[1.0, 13], [1.4, 8], [0.3, 2.5]], dir: 1 }], density: 3.0, profile: 'leisure', mix: { 'person.student': 5, 'person.dog-walker': 2, 'person.buggy-walker': 1, 'person.walker': 2, 'person.family': 1, 'person.couple': 2, 'person.takeaway-walker': 1 }, speed: [0.9, 1.4], both: true, max: 14, seed: 34 },
    ],
  };
  // the city beyond the campus: roofs and trees falling away toward the centre (screen rows)
  data.ground.push({ layer: 'horizon', d: S.trees(H - 20, 3211, 14, 40, H + 40), fill: { lin: [[0, '@tl.0'], [1, '@tl.1']], y1: H - 70, y2: H + 30 } });
  const Pl = data.place, Sc = data.scatter, L = _shpLife(data);
  // ---- across the road: Firth Court (the subject) with its forecourt; the Arts Tower beyond; campus blocks either side
  L.put('landmark.shp-firth-court', 30, 58, { fix: true, subject: true });
  data.buildings.push({ style: 'edwardian', foot: [[90, 12], [118, 4], [122, 18], [94, 26]], front: 0, storeys: 3, seed: 3301, roof: 'hip' });
    Sc.push({ obj: { 'tree.plane': 3, 'tree.pond-oak': 2, 'tree.bank-oak': 1 }, on: 'campus', avoid: ['pave-s', 'western-bank'], d: [60, 260], n: 26, dist: 'ground', cluster: { centres: 6, spread: 16 }, gap: 'foot', k: [0.85, 1.2], seed: 3311, anim: false, tint: { col: '#6a7a6a', k: [0.02, 0.06] } });
  // ---- the park: the bandstand, the museum's gallery front behind it, the gates and the railed wall on Western Bank
  L.put('structure.shp-bandstand', -14, 16.5, { fix: true });
  L.put('landmark.shp-weston-museum', -30, 29.6, { fix: true });
  L.put('structure.shp-gate-piers', 0, R2(edgeN(0) - 0.6), { variant: 0, fix: true });
  for (const [x, v] of [[-14, 1], [15, 2]]) L.put('structure.shp-gate-piers', x, R2(edgeN(x) - 0.6), { variant: v, fix: true });
  // the park's trees: limes and planes round the lawn; a big lime over the right edge
  L.put('tree.bank-birch', -22, 24, { k: 0.75, anim: false });
  // the beds either side of the walk at the gates, shrubs along the railings
  Sc.push({ obj: { 'plant.shp-border': 5, 'plant.daisies': 1 }, on: ['bed-l', 'bed-r'], d: [17, 22], n: 120, dist: 'screen', k: [0.7, 0.95], seed: 3321, anim: false, species: 1, tint: { col: '#8a6a9a', k: [0.02, 0.06] } });
  Sc.push({ obj: { 'plant.shrub': 2, 'plant.hedge': 2, 'plant.holly': 1 }, on: 'land', d: [18, 24], n: 22, dist: 'screen', cluster: { centres: 7, spread: 2.5 }, k: [0.6, 1.3], seed: 3323, anim: false, species: 1 });
  Sc.push({ obj: { 'plant.grass': 6, 'plant.daisies': 3, 'plant.wildflowers': 1 }, on: ['land', 'walk'], d: [3.4, 24], n: 560, dist: 'screen', cluster: { centres: 22, spread: 1.4 }, k: [0.8, 1.2], seed: 3325, anim: false, species: 1, tint: { col: '#8a8a40', k: [0.02, 0.06] } });
  Sc.push({ obj: { 'ground.leaf-litter': 1, 'ground.leaves': 1 }, on: ['walk', 'walk-b'], d: [2, 24], n: 140, dist: 'screen', k: [0.8, 1.2], seed: 3327, anim: false, tint: { col: '#7a5a3a', k: [0.02, 0.06] } });
  Sc.push({ obj: { 'plant.shp-border': 6, 'plant.daisies': 1 }, on: 'bed-near', d: [5.5, 10], n: 60, dist: 'screen', cluster: { centres: 5, spread: 0.5 }, k: [0.8, 1.0], seed: 3363, anim: 'strip', species: 1 });
  Pl.push({ obj: 'plant.shp-border', x: 120, y: 925, s: 2.4, variant: 1, pin: true, layer: 'front', shadow: false }, { obj: 'plant.shp-border', x: 330, y: 945, s: 2.2, variant: 3, pin: true, layer: 'front', shadow: false, flip: true });
  // ---- the park's life: picnics, a ball game, readers on the benches, a busker at the gates, pigeons at the bandstand
  L.put('person.picnicker', -7, 13, { k: 0.6 }); L.put('person.picnicker', -8.6, 13.6, { k: 0.6, variant: 2, flip: true });
  L.put('person.student', 6.4, 13.5, { k: 1, anim: false });
  L.put('person.child-ball', 9.6, 15, { k: 0.6 }); L.put('animal.dog', 8.4, 13.4, { k: 1 });
  L.put('street.bench', -3.6, 17, { k: 1 }); L.put('person.bench-reader', -3.8, 16.9, { k: 0.8 });
  L.put('street.bench', 4.6, 17.4, { k: 1, flip: true }); L.put('person.bench-sitter', 4.4, 17.2, { k: 0.8, variant: 2 });
  { const r = S.rnd(3331); for (const [cx, cd, n] of [[-8, 13, 7], [2, 11, 4], [-1, R2(edgeN(0) + 2), 5]]) for (let i = 0; i < n; i++) L.put(r() < 0.75 ? 'bird.pigeon-feral' : 'bird.pigeon', R2(cx + (r() - 0.5) * 3), R2(cd + (r() - 0.5) * 2), { k: 1, variant: Math.floor(r() * 3), flip: r() < 0.5 }); }
  L.put('bird.robin', -2.4, 9, { k: 1.4 });
  L.put('animal.squirrel', 14, 15, { k: 1.2 }); L.put('animal.squirrel', -2, 7, { k: 1.2, flip: true });
  data.actors.push(sceneBehave.actor(data, { obj: 'person.jogger', preset: 'jogger', route: [[0.6, 3], [1.6, 8], [0.9, 13.5], [0.4, 19]], seed: 3341, offset: 0.9 }),
    ...sceneBehave.walkWithDog(data, { obj: 'person.walker', preset: 'dog-walker', route: [[-26, 8.3], [-14, 8.8], [-4, 9.8]], seed: 3342, offset: 0.7 }),
    ...sceneBehave.pair(data, { obj: 'person.student', preset: 'chat', route: [[1.8, 4], [1.6, 8], [1.0, 12]], seed: 3343, offset: 0.15 }));
  // the near walk: a lamppost by the walk, students sitting out on the grass
  L.put('street.lamppost', 4.2, 15, { variant: 1 });
  { const r = S.rnd(3345); for (const [x, d] of [[6, 9.5], [9, 15], [-5, 12.5], [11, 21]]) { L.put('person.picnicker', x, d, { k: 0.6, variant: Math.floor(r() * 3), flip: r() < 0.5, tint: ['#5a4a8a', R2(r() * 0.16)] }); if (r() < 0.6) L.put('person.picnicker', R2(x + 1.2), R2(d + 0.3), { k: 0.6, variant: Math.floor(r() * 3), flip: r() < 0.5, tint: ['#8a4a3a', R2(r() * 0.16)] }); } }
  // street lamps along Western Bank
  for (const x of [-9, 12]) L.put('street.lamppost', x, R2(edgeN(x) + 0.6), { k: 1, variant: 1 });
  data.flocks.push({ obj: 'bird.pigeon', n: 5, area: [300, 140, 1300, 320], speed: 50, s: 0.4, seed: 3351, layer: 'mid' });
  // ---- framing: a lime's bough over the top right, a border clump at the foot of the frame on the left
  Pl.push({ obj: 'tree.shp-trunk', x: 1590, y: 940, s: 1.0, pin: true, layer: 'front', shadow: false, flip: true, anim: { sway: { k: 0.4 } } });
  return data;
}

/* v4  Ringinglow, on the city's western edge: from the crossroads, looking west up Ringinglow Road as it leaves the last
       houses and climbs out over the moor toward Burbage and the gritstone edges of the Peak. The Round House (the 1778
       octagonal toll house) stands on the right at the corner, the stone pub across the road on the left; drystone walls
       line the road and run off across the in-bye pastures (the leading lines), sheep in the fields, the dark conifers of
       Lady Canning's Plantation on the left, and on the skyline the long rocky crest of the edges, Higger Tor's knuckle.
       Framing: a wind-bent hawthorn on the left, heather and bilberry on the verge at the foot of the frame.
       Life: cyclists climbing out of the city, a car now and then, walkers with a dog on the verge, sheep grazing,
       skylarks, the clouds' shadows; frost and snow lie up here when the city has none.
         https://historicengland.org.uk/listing/the-list/list-entry/1247007   https://www.peakdistrict.gov.uk/ */
function sceneUkSheffieldParksV4() {
  const S = SCENE_SHP, W = SCENE_SHP_V4, cam = W.camera, H = cam.horizon, rx = W.roadX;
  const R1 = v => Math.round(v * 10) / 10, R2 = v => Math.round(v * 100) / 100, R3 = v => Math.round(v * 1000) / 1000;
  const roadPath = [2, 10, 30, 60, 100, 140, 200, 280, 380, 520].map(d => [R2(rx(d)), d]);
  const side = (off, d0, d1) => [d0, (d0 + d1) / 2, d1].map(d => [R2(rx(d) + off), d]);
  const data = {
    v: 2, id: 'sheffield-parks-4',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'natural', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['temperate', 'alpine', 'people', 'animals', 'birds', 'vehicles'],
    sky: { stars: 260, clouds: { n: 6, y: [30, 280], speed: 7 }, sunR: 22, moonR: 16 },
    palette: {
      base: { road: ['#8a8a86', '#6e6e6a'], gritd: '#4e4a40', conifer: ['#3e4e3e', '#2e3c30'], hill: ['#9aa6b2', '#7a7e7a', '#6a6a4e', '#8a7a5a'], moorf: ['#7a7446', '#5e5a36'], heath: ['#7a6e4a', '#5e5636'], field: ['#7e9a4e', '#62803c'], verge: ['#7a8e48', '#5e7236'] },
      summer: { hill: ['#9aa6b2', '#7e7a8a', '#7a5e72', '#8a6a6a'], moorf: ['#7a6a5a', '#6a5a4a'] },
      autumn: { hill: ['#a0a4aa', '#867a6a', '#7e6440', '#8e6e44'], moorf: ['#8a6a3e', '#6e5430'], field: ['#8a9a52', '#6e803e'] },
      winter: { hill: ['#a8b0b8', '#8a8a86', '#76705e', '#8a8070'], moorf: ['#7e7462', '#625a4a'], field: ['#7a8a5a', '#62724a'], heath: ['#7a6e5a', '#5e5646'] },
    },
    surfaces: [
      { id: 'land', kind: 'heath', rest: true },
      { id: 'inbye-l', kind: 'meadow', poly: [[-400, 4], [R2(rx(4) - 7.6), 4], [R2(rx(70) - 7.6), 70], [-200, 150], [-400, 260]] },
      { id: 'inbye-r', kind: 'meadow', poly: [[6.4, 58], [400, 58], [400, 220], [R2(rx(190) + 6), 190], [R2(rx(96) + 6), 96]] },
      // the sheep's fields: inside the walls (the near in-bye on the left, the field beyond the Round House on the right)
      { id: 'sheep-l', kind: 'meadow', poly: [[-120, 12], [R2(rx(12) - 9), 12], [R2(rx(62) - 9), 62], [-120, 62]] },
      { id: 'sheep-r', kind: 'meadow', poly: [[R2(rx(106) + 7), 106], [110, 106], [110, 184], [R2(rx(184) + 7), 184]] },
      { id: 'yard', kind: 'plot', poly: [[8.4, 35], [34, 35], [34, 57], [8.4, 57]] },
      { id: 'pub-yard', kind: 'plot', poly: [[-52, 70], [-14, 70], [-14, 90], [-52, 90]] },
      { id: 'verge-l', kind: 'grass', path: side(-5.3, 2, 520), width: 4.2 },
      { id: 'verge-r', kind: 'grass', path: side(3.9, 2, 520), width: 1.4 },
      { id: 'road', kind: 'road', path: roadPath, width: 5.8, markings: 'centre' },
      { id: 'side-road', kind: 'road', path: [[-160, 66], [-40, 65], [-2, 64.6]], width: 5.6, markings: 'none' },
    ],
    water: [], ground: [], place: [], scatter: [], actors: [], flocks: [], buildings: [],
    flows: [
      { id: 'cyclists', kind: 'cycle', on: 'road', dMax: 270, density: 1.2, profile: 'leisure', mix: { 'person.cyclist': 3, 'person.cyclist-commuter': 1 }, max: 6, seed: 41 },
      { id: 'cars', kind: 'drive', on: 'road', dMax: 270, density: 0.4, profile: 'town', mix: { 'vehicle.car': 3, 'vehicle.car-city': 1 }, speed: [9, 13], max: 3, seed: 42 },
      { id: 'walkers', kind: 'walk', on: [], lanes: [{ path: side(-4.6, 13, 300), dir: 1 }, { path: side(3.4, 2, 30), dir: -1 }], density: 0.6, profile: 'leisure', mix: { 'person.hiker': 3, 'person.dog-walker': 2, 'person.walker': 1 }, speed: [1.0, 1.3], max: 4, seed: 43 },
      { id: 'sheep', kind: 'graze', on: ['sheep-l', 'sheep-r'], density: 0.5, mix: { 'animal.sheep-moor': 1 }, max: 6, seed: 44 },
    ],
  };
  // ---- the skyline: the far Peak in haze, then the edges (Burbage, Higger Tor's knuckle, Stanage beyond), then the near moor's brow
  const G = data.ground;
  // the far Peak (Kinder and the Derwent edges) in haze
  G.push({ layer: 'horizon', d: S.ridge([[-170, H - 70], [160, H - 84], [420, H - 96], [700, H - 88], [980, H - 104], [1260, H - 92], [1500, H - 100], [1770, H - 86]], H + 20, 4101, 2), fill: { lin: [[0, '@hill.0'], [1, '@hill.1']], y1: H - 110, y2: H + 10 } });
  // the edges: Burbage Rocks running away left, Higger Tor's knuckle, the long line of Stanage to the right; a dark gritstone
  // scarp under the crest with its buttresses and boulder fans; the moor's slope below it
  const crest = [[-170, H - 30], [120, H - 36], [360, H - 46], [520, H - 60], [560, H - 72], [640, H - 74], [700, H - 60], [860, H - 52], [1100, H - 58], [1360, H - 66], [1560, H - 58], [1770, H - 50]];
  G.push({ layer: 'horizon', d: S.ridge(crest, H + 20, 4103, 1.4), fill: { lin: [[0, '@hill.2'], [1, '@hill.3']], y1: H - 76, y2: H + 10 } });
  { const r = S.rnd(4107); let sc = '', bt = '';
    for (let i = 0; i < crest.length - 1; i++) {
      const [x0, y0] = crest[i], [x1, y1] = crest[i + 1];
      if (x1 < 330 || x0 > 1600) continue;
      for (let x = Math.max(x0, 330); x < Math.min(x1, 1600); x += 5 + r() * 6) {
        const t = (x - x0) / (x1 - x0), y = y0 + (y1 - y0) * (1 - Math.cos(t * Math.PI)) / 2, h = 5 + r() * 7, w = 4 + r() * 5;
        sc += 'M' + R1(x) + ' ' + R1(y + 1) + 'l' + R1(w * 0.2) + ' ' + R1(h) + 'h' + R1(w) + 'l' + R1(w * 0.1) + ' ' + R1(-h * 0.9) + 'z';
        if (r() < 0.3) bt += 'M' + R1(x + 2) + ' ' + R1(y + h + 4) + 'q3 -2 6 0q-3 2 -6 0z';
      }
    }
    G.push({ layer: 'horizon', d: sc, fill: '@gritd' }, { layer: 'horizon', d: bt, fill: '@gritd' }); }
  // the near moor's brow, which the road climbs over and out of sight
  G.push({ layer: 'far', d: S.ridge([[-170, H + 16], [260, H + 4], [620, H - 6], [900, H - 8], [1200, H - 4], [1500, H + 6], [1770, H + 14]], H + 60, 4105, 1.2), fill: { lin: [[0, '@moorf.0'], [1, '@moorf.1']], y1: H - 10, y2: H + 40 } });
  // Lady Canning's Plantation: a dark block of conifers on the slope to the left
  G.push({ layer: 'far', d: S.trees(H + 6, 4109, 10, 26, H + 30, -170, 420), fill: { lin: [[0, '@conifer.0'], [1, '@conifer.1']], y1: H - 30, y2: H + 30 } });
  const Pl = data.place, Sc = data.scatter, L = _shpLife(data);
  // ---- the Round House on its corner (the subject), the pub opposite, a cottage row up the side road
  L.put('landmark.shp-round-house', 17, 46, { fix: true, subject: true });
  data.buildings.push({ style: 'stone-cottage', foot: [[-40, 76], [-28, 76], [-28, 88], [-40, 88]], front: 1, storeys: 2, seed: 4111, roof: 'gable' });
  data.buildings.push({ style: 'stone-cottage', foot: [[70, 150], [84, 150], [84, 158], [70, 158]], front: 0, storeys: 1, seed: 4115, roof: 'gable' });
  data.buildings.push({ style: 'stone-cottage', foot: [[-80, 92], [-58, 92], [-58, 100], [-80, 100]], front: 0, storeys: 2, seed: 4113, roof: 'gable' });
  // ---- the drystone walls, in this camera's perspective (one pinned piece each, near foot as the anchor)
  W.pieces.forEach((pc, i) => { const a = pc.a[1] <= pc.b[1] ? pc.a : pc.b, p = W.proj(a[0], a[1], 0); Pl.push({ obj: pc.run < 4 ? 'structure.shp-moor-wall' : 'structure.shp-field-wall', variant: i, x: R1(p[0]), y: R1(p[1]), s: 1, pin: true, shadow: false, anim: false, tint: ['#6a5a40', (i % 3) * 0.03] }); });
  // ---- trees: sycamores sheltering the Round House and the pub, Lady Canning's conifers on the left, a few thorns on the moor
  L.put('tree.canal-oak', 40, 72, { k: 0.9, anim: false });
  L.put('tree.wyv-far-sallow', -36, 52, { k: 1.0, anim: false });
  // ---- the moor: heather, bilberry, cotton grass and rushes; the in-bye pastures: grass and rush tussocks; the verges
  Sc.push({ obj: { 'plant.moor-heather': 4, 'plant.bilberry': 2, 'plant.yc-cotton-grass': 2, 'plant.grass-long': 3 }, on: 'land', d: [30, 400], n: 420, dist: 'screen', cluster: { centres: 20, spread: 6 }, k: [0.8, 1.3], seed: 4131, anim: false, tint: { col: '#6a5a3a', k: [0.02, 0.06] } });
  Sc.push({ obj: { 'plant.grass-long': 4, 'plant.grass': 4, 'plant.yc-cotton-grass': 1, 'plant.wildflowers': 1 }, on: ['inbye-l', 'inbye-r'], d: [3, 260], n: 620, minGap: 8, dist: 'screen', cluster: { centres: 18, spread: 3 }, k: [0.8, 1.3], seed: 4133, anim: false, tint: { col: '#8a8a40', k: [0.02, 0.06] } });
  Sc.push({ obj: { 'plant.grass-long': 5, 'plant.grass': 4, 'plant.wildflowers': 1, 'plant.bilberry': 1 }, on: ['verge-l', 'verge-r'], d: [6, 120], n: 230, minGap: 8, dist: 'screen', k: [0.55, 1.1], seed: 4135, anim: 'strip', tint: { col: '#7a6a3a', k: [0.02, 0.06] } });
  // sheep resting by the walls; a farm gate in the right-hand wall
  { const r = S.rnd(4141); for (const [cx, cd, n] of [[-16, 30, 3], [-34, 62, 4], [30, 74, 3], [-70, 120, 3], [60, 150, 2]]) for (let i = 0; i < n; i++) L.put('animal.sheep-moor', R2(cx + (r() - 0.5) * 12), R2(cd + (r() - 0.5) * 10), { k: R2(0.9 + r() * 0.2), variant: Math.floor(r() * 3), flip: r() < 0.5 }); }
  L.put('structure.field-gate', R2(rx(64) + 5.4), 64, { k: 1, fix: true });
  // walkers resting by the gate, a dog; a skylark climbing; rooks and gulls far off
  L.put('person.hiker', R2(rx(30) - 5.6), 30, { k: 1, face: 'away', anim: false });
  L.put('animal.dog', R2(rx(28) - 5.0), 28, { k: 1 });
  for (const [x, d, k] of [[R2(rx(20) - 6.6), 20, 1.2], [R2(rx(44) - 6.2), 44, 1.1], [-30, 40, 1]]) L.put('animal.rabbit', x, d, { k, flip: x > -20 });
  data.flocks.push({ obj: 'bird.small-flight', n: 6, area: [100, 120, 1500, 340], speed: 45, s: 0.35, seed: 4151, layer: 'horizon' });
  data.flocks.push({ obj: 'bird.goose-flight', n: 5, area: [300, 80, 1300, 220], speed: 30, s: 0.3, seed: 4153, layer: 'horizon' });
  // ---- framing: a wind-bent hawthorn on the left, heather and bilberry at the foot of the frame
  Pl.push({ obj: 'plant.moor-heather', x: 1450, y: 945, s: 1.8, pin: true, layer: 'front', shadow: false, anim: false },
    { obj: 'plant.bilberry', x: 1250, y: 960, s: 1.8, pin: true, layer: 'front', shadow: false, anim: false },
    { obj: 'plant.grass-long', x: 420, y: 955, s: 2.0, pin: true, layer: 'front', shadow: false, anim: false },
    { obj: 'plant.moor-heather', x: 90, y: 950, s: 2.0, variant: 1, pin: true, layer: 'front', shadow: false, anim: false },
    { obj: 'plant.grass-long', x: 250, y: 965, s: 2.2, variant: 2, pin: true, layer: 'front', shadow: false, anim: false, flip: true });
  // rush tussocks and soft rush clumps across the near pasture (its middle read as a flat bare field)
  Sc.push({ obj: { 'plant.grass-long': 5, 'plant.yc-cotton-grass': 2, 'plant.grass': 2 }, on: 'sheep-l', d: [12, 62], n: 160, dist: 'ground', minGap: 10, cluster: { centres: 16, spread: 3.5 }, k: [0.75, 1.35], seed: 4137, anim: false, tint: { col: '#7a6a3a', k: [0.02, 0.06] } });
  return data;
}
