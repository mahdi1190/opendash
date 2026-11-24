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

function sceneUkSheffieldParksV1() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone
function sceneUkSheffieldParksV2() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone
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
function sceneUkSheffieldParksV4() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone
