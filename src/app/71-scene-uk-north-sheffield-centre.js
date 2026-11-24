/* ============================================================
   COMPOSED SCENES (v2, by hand) uk-north / Sheffield city centre, four views (docs/dev/SCENE_ENGINE_V2.md).
   Ground plans and the views' own objects: 70-scene-lib-sheffield-centre.js. The pack: 72-anim-pack-uk-north-sheffield-centre.js.

   v1  The Peace Gardens from the south steps, looking north (heading 352): the two Holberry Cascades run up either side of the
       granite walk as stone rills through the lawns and lead to the Goodwin Fountain's arc of jets; the Town Hall closes the
       view, its tower on the left with Vulcan on top; Pinstone Street down the left with its buses and Edwardian fronts.
       Framing: a London plane up the left edge, its bough over the top. Life: the lunchtime crowd, children at the jets,
       people on the benches, a dog, pigeons on the granite, gulls over the roofs.
   v2  Millennium Square, looking east (heading 75) at the long glass side of the Winter Garden, St Paul's Tower rising out of
       the frame on the left, the Millennium Gallery's white frames on the right. Granite bands lead to the doors; cafe
       tables by the gallery, birches in their beds. Framing: a lamp standard close on the left, a flower bed on the right.
   v3  Sheaf Square from the top of Howard Street (eye 4.6 m), looking east (heading 104): the Cutting Edge's steel wall curves
       down from the near right toward Sheaf Street, water running down it into its channel, the stepped pools beside it;
       the station's stone arcade across the road with its taxi rank and buses; Park Hill on its hill above the station,
       the Supertram climbing the hill to its right; Norfolk Park's ridge beyond. Hallam's buildings on the left.
   v4  A Park Hill deck (eye 34 m), looking west (heading 262) over the hillside, the Supertram climbing it, the railway and the
       station, the city (St Paul's Tower, the Town Hall's tower, the Cathedral's spire, the Arts Tower) to the western
       hills (Crookes and Walkley's terraces, the moors beyond). Framing: the deck's parapet, column and soffit.
     https://www.sheffield.gov.uk/parks-sport-recreation/find-park/peace-gardens   https://www.sheffieldwintergarden.co.uk/
     https://en.wikipedia.org/wiki/Sheaf_Square   https://en.wikipedia.org/wiki/Park_Hill,_Sheffield
   PURE: each function returns the scene data, called once, lazily.
   ============================================================ */
const _SHC_R1 = v => Math.round(v * 10) / 10, _SHC_R2 = v => Math.round(v * 100) / 100;
// the flows walk toward and away from us too, so only people with the directional views (q-front, front, q-back, back);
// the shoppers, students and commuters are hand-placed behaviours on routes across the view (side-on is right for them)
const _SHC_WALKERS = { 'person.walker': 10, 'person.dog-walker': 1, 'person.jogger': 1, 'person.family': 1 };
const _SHC_SKY = { stars: 140, clouds: { n: 5, y: [30, 270], speed: 5 }, sunR: 22, moonR: 16 };
const _SHC_PAL = {
  base: { plaza: ['#b2aa9c', '#9a9284'], pavement: ['#a8a196', '#8c867a'], lawn: ['#6e9448', '#4e7434'], park: ['#6a9046', '#4c7032'], garden: ['#5e7a3e', '#4a6230'] },
  autumn: { lawn: ['#7e9248', '#5e7436'], park: ['#7a8c46', '#5a6e34'] },
  winter: { lawn: ['#7a8a62', '#5e6e4a'], park: ['#768660', '#5a6a48'] },
};

/** Hand-placed movers, every one built by a sceneBehave preset at true scale. rows: [type, obj, route, preset, variant, offset]
 *  type 'a' one actor, 'p' a pair chatting as they walk, 'd' a walker with an off-lead dog. Seeds come from the row index. */
const _shcLife = (D, seed0, rows) => rows.forEach(([t, obj, route, preset, v, off], i) => {
  const spec = { obj, route, preset, variant: v | 0, seed: seed0 + i * 97, offset: off != null ? off : (i * 0.37) % 1 };
  if (t === 'p') D.actors.push(...sceneBehave.pair(D, spec));
  else if (t === 'd') D.actors.push(...sceneBehave.walkWithDog(D, Object.assign(spec, { walker: obj, dogVariant: v % 3 })));
  else D.actors.push(sceneBehave.actor(D, spec));
});

/* ---------- v1: the Peace Gardens ---------- */
function sceneUkNorthSheffieldCentreV1() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone

/* ---------- v2: Millennium Square and the Winter Garden ---------- */
function sceneUkNorthSheffieldCentreV2() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone

/* ---------- v3: Sheaf Square, the Cutting Edge and the station ---------- */
function sceneUkNorthSheffieldCentreV3() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone

/* ---------- v4: from a Park Hill deck over the city to the western hills ---------- */
function sceneUkNorthSheffieldCentreV4() {
  const S = SCENE_SHC, cam = { eye: 34, fov: 66, horizon: 352, heading: 262, lat: 53.38062, lon: -1.45985 };
  const tram = [[46, 70], [38, 96], [24, 126], [6, 160], [-12, 196], [-28, 236], [-40, 270]];
  const railD = (x) => 268 - 0.08 * x;
  const data = {
    v: 2, id: 'shc-park-hill',
    view: { lat: cam.lat, lon: cam.lon }, camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'people', 'birds', 'temperate'],
    sky: _SHC_SKY, palette: Object.assign({}, _SHC_PAL, { base: Object.assign({}, _SHC_PAL.base, { plot: ['#8e8a84', '#7a766e'] }) }),
    surfaces: [
      { id: 'land', kind: 'plot', rest: true },
      { id: 'hill', kind: 'park', poly: [[-200, 60], [200, 60], [200, 250], [-200, 250]] },
      { id: 'path-a', kind: 'path', path: [[-80, 70], [-30, 110], [-90, 150], [-20, 200], [-60, 240]], width: 2.4 },
      { id: 'path-b', kind: 'path', path: [[120, 72], [80, 120], [130, 170], [90, 230]], width: 2.4 },
      { id: 'tramway', kind: 'tramway', path: tram, width: 7.4 },
      { id: 'rail-1', kind: 'rail', path: [[-500, railD(-500)], [500, railD(500)]], width: 12, tracks: 3 },
      { id: 'plat', kind: 'platform', path: [[-300, railD(-300) + 8.5], [300, railD(300) + 8.5]], width: 6 },
      { id: 'rail-2', kind: 'rail', path: [[-500, railD(-500) + 16], [500, railD(500) + 16]], width: 12, tracks: 3 },
      { id: 'sheaf', kind: 'road', path: [[-600, 318], [600, 300]], width: 16, markings: 'centre' },
      { id: 'square', kind: 'plaza', poly: [[-100, 327], [80, 324], [80, 360], [-100, 362]] },
      { id: 'park-1', kind: 'park', poly: [[-180, 420], [-120, 420], [-120, 470], [-180, 470]] },
      { id: 'park-2', kind: 'park', poly: [[60, 690], [130, 690], [130, 740], [60, 740]] },
      { id: 'park-3', kind: 'park', poly: [[150, 520], [230, 520], [230, 560], [150, 560]] },
      // the green in the city: Sheaf Street's verges, the trees of the Ponds Forge and Castlegate edge, squares between blocks
      { id: 'park-4', kind: 'park', poly: [[-600, 327], [600, 309], [600, 316], [-600, 334]] },
      { id: 'park-5', kind: 'park', poly: [[-280, 376], [-180, 376], [-180, 410], [-280, 410]] },
      { id: 'park-6', kind: 'park', poly: [[180, 372], [300, 372], [300, 400], [180, 400]] },
      { id: 'park-7', kind: 'park', poly: [[-60, 364], [40, 363], [40, 372], [-60, 373]] },
    ],
    water: [],
    ground: [], place: [], scatter: [], actors: [], flocks: [], buildings: [],
    flows: [
      { id: 'trams', kind: 'tram', on: 'tramway', timetable: { every: 4 }, mix: { 'vehicle.shc-supertram': 1 }, speed: [5, 7], seed: 41 },
      { id: 'trains', kind: 'train', on: ['rail-1', 'rail-2'], timetable: { every: 3 }, mix: { 'rail.train': 1 }, speed: [6, 10], seed: 42 },
      { id: 'traffic', kind: 'drive', on: 'sheaf', density: 1.2, profile: 'commuter', mix: { 'vehicle.car-city': 5, 'vehicle.taxi-black': 2, 'vehicle.car': 3 }, bus: { obj: 'vehicle.bus', every: 3 }, speed: [8, 12], max: 10, seed: 43 },
      { id: 'walk', kind: 'walk', on: ['path-a', 'path-b', 'plat', 'square'], density: 1.6, profile: 'town', mix: _SHC_WALKERS, speed: [1.0, 1.4], both: true, max: 16, seed: 44 },
    ],
  };
  const Pl = data.place, Sc = data.scatter, r = S.rnd(404);
  // ---- the hillside: trees in clumps (planes, oaks, birches), long grass and shrubs, the platforms' canopies, the station
  Sc.push({ obj: { 'tree.plane-avenue': 1, 'tree.bank-birch': 2, 'tree.green-oak': 3, 'tree.pond-birch': 1, 'tree.bank-oak': 2 }, on: 'hill', avoid: ['tramway', 'path-a', 'path-b'], d: [74, 245], n: 46, dist: 'ground', cluster: { centres: 9, spread: 10 }, gap: 'foot', k: [0.8, 1.2], seed: 51, anim: false, tint: { col: '#6a7a5a', k: [0, 0.14] } });
  Sc.push({ obj: { 'tree.far-broad': 3, 'tree.far-birch': 1 }, on: ['park-1', 'park-2', 'park-3'], d: [400, 760], n: 18, dist: 'ground', cluster: { centres: 5, spread: 8 }, k: [0.8, 1.3], seed: 53, anim: false, shadow: false, tint: { col: '#6a7a6a', k: [0, 0.14] } });
  Sc.push({ obj: { 'plant.grass-long': 4, 'plant.grass': 3, 'plant.wildflowers': 1 }, on: 'hill', avoid: ['tramway', 'path-a', 'path-b'], d: [74, 110], n: 110, dist: 'screen', k: [0.9, 1.4], seed: 54, anim: false, tint: { col: '#8a8a40', k: [0, 0.16] } });
  Sc.push({ obj: { 'plant.grass-long': 3, 'plant.shrub': 2, 'plant.wildflowers': 1 }, on: 'hill', avoid: ['tramway', 'path-a', 'path-b'], d: [110, 220], n: 90, dist: 'screen', cluster: { centres: 22, spread: 4 }, k: [0.8, 1.3], seed: 52, anim: false, tint: { col: '#8a8a40', k: [0, 0.16] } });
  [-190, -60, 40, 170].forEach((x, i) => Pl.push({ obj: 'rail.canopy', at: [x, railD(x) + 8.5], k: _SHC_R2(0.8 + r() * 0.4), variant: i % 3, flip: i % 2 === 0, anim: false }));
  data.buildings.push({ style: 'station', at: [-20, 294], frontage: 140, depth: 12, front: 2, storeys: 2, seed: 71 });
  // ---- the city: blocks of every age between the station and the hills (seeded footprints and heights, not on a grid)
  { const st = ['modern-glass', 'brutalist', 'edwardian', 'victorian-terrace', 'mill', 'georgian', 'interwar-shops'];
    for (let i = 0; i < 110; i++) {
      const d = Math.round(372 + Math.pow(r(), 1.1) * 600), half = d * 0.62, x = Math.round((r() * 2 - 1) * half), sty = st[Math.floor(r() * st.length)];
      if (Math.abs(x + 92 * d / 628) < 40 && d > 560 && d < 700) continue;
      const storeys = sty === 'modern-glass' ? 5 + Math.floor(r() * 10) : sty === 'brutalist' ? 5 + Math.floor(r() * 7) : 3 + Math.floor(r() * 3);
      data.buildings.push({ style: sty, at: [x, d], frontage: Math.round(18 + r() * 30), depth: Math.round(14 + r() * 20), front: 0, storeys, seed: 100 + i, roof: r() < 0.5 ? 'flat' : 'hip' });
    } }
  // the landmarks at their real bearings and distances from the deck
  Pl.push({ obj: 'landmark.shc-st-pauls-tower', at: [-92, 628], fix: true, subject: true });
  Pl.push({ obj: 'landmark.shc-town-hall', at: [108, 692], fix: true });
  Pl.push({ obj: 'landmark.shc-cathedral', at: [367, 696], fix: true });
  // the far city: towers and blocks against the hills (sprites, varied)
  for (let i = 0; i < 18; i++) {
    const d = Math.round(1000 + r() * 1100), x = Math.round((r() * 2 - 1) * d * 0.6), id = ['building.tower-stone', 'building.tower-glass', 'building.mill-red-brick', 'building.tower-stone', 'building.tower-glass', 'building.terrace-northern'][Math.floor(r() * 6)];
    Pl.push({ obj: id, at: [x, d], k: _SHC_R2(0.75 + r() * 0.5), variant: Math.floor(r() * 4), flip: i % 2 === 0, anim: false });
  }
  // ---- the western hills: Crookes and Walkley's terraces on their ridge, the moors of the Peak beyond
  for (const v of [3, 0, 1]) Pl.push({ obj: 'building.shc-hills', variant: v, x: 800, y: [390, 400, 0, 380][v], s: 1, pin: true, layer: 'horizon', shadow: false, anim: false });
  // ---- the Supertram climbing the hill toward us (besides the timetable's trams)
  data.actors.push({ obj: 'vehicle.shc-supertram', ground: tram.slice().reverse(), speedM: 6, loop: 'loop', k: 1, seed: 45, offset: 0.4 });
  // ---- the life: people on the hillside paths, a dog, pigeons on the parapet, gulls and pigeons wheeling
  _shcLife(data, 4400, [
    ['d', 'person.walker', [[-80, 70], [-55, 90], [-30, 110], [-60, 130]], 'dog-walker', 1],
    ['a', 'person.jogger', [[120, 72], [100, 96], [80, 120], [105, 145]], 'jogger', 2],
    ['p', 'person.walker', [[-90, 150], [-55, 175], [-20, 200]], 'chat', 3],
    ['a', 'person.walker', [[130, 170], [110, 200], [90, 230]], 'brisk', 0],
    ['a', 'person.walker', [[-30, 110], [-60, 130], [-90, 150]], 'stroll', 5, 0.15],
  ]);
  // street trees and the green between the city blocks (the city is not bare tarmac between its buildings)
  Sc.push({ obj: { 'tree.far-broad': 4, 'tree.far-birch': 1, 'tree.distant': 2 }, on: ['park-4', 'park-5', 'park-6', 'park-7'], d: [320, 420], n: 45, dist: 'ground', cluster: { centres: 30, spread: 12 }, gap: 'foot', k: [0.8, 1.5], seed: 55, anim: false, shadow: false });
  const par = (x) => Math.round(900 - 168 + 36 * x / 1600 - 8);
  for (const [x, v] of [[300, 0], [336, 2], [1010, 1]]) Pl.push({ obj: 'bird.pigeon-feral', x, y: par(x), s: 1.1, pin: true, layer: 'front', variant: v, flip: x > 600, shadow: false });
  data.flocks.push({ obj: 'bird.small-flight', n: 9, area: [300, 300, 1300, 560], speed: 70, s: 0.55, seed: 91, layer: 'mid' });
  data.flocks.push({ obj: 'bird.gull', n: 5, area: [100, 60, 1500, 260], speed: 28, s: 0.4, seed: 92, layer: 'far' });
  // ---- framing: the deck's parapet, its column and the soffit above
  Pl.push({ obj: 'structure.shc-deck', x: 800, y: 900, s: 1, pin: true, layer: 'front', shadow: false, anim: false });
  return data;
}
