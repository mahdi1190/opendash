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
/** Tree pits: a 2.4 m square of garden under each street tree (trees may not stand on paving). */
const _shcPits = (list) => list.map(([x, d], i) => ({ id: 'pit-' + i, kind: 'garden', poly: [[x - 1.2, d - 1.2], [x + 1.2, d - 1.2], [x + 1.2, d + 1.2], [x - 1.2, d + 1.2]] }));
/** Pigeons in loose groups: [x, d, n] each; anim only on the nearest few. */
const _shcPigeons = (Pl, r, groups, near) => { let n = 0; for (const [cx, cd, k] of groups) for (let i = 0; i < k; i++, n++) { const u = r(), obj = u < 0.4 ? 'bird.pigeon' : 'bird.pigeon-feral'; const sp = 2 + r() * 5; Pl.push({ obj, at: [_SHC_R2(cx + (r() - 0.5) * sp), _SHC_R2(cd + (r() - 0.5) * sp * 0.7)], k: _SHC_R2(0.85 + r() * 0.3), variant: Math.floor(r() * 3), face: n % 2 ? 'left' : 'right', tint: ['#5a5e66', _SHC_R2(r() * 0.14)], anim: cd < (near || 0) ? undefined : false }); } };

/** Hand-placed movers, every one built by a sceneBehave preset at true scale. rows: [type, obj, route, preset, variant, offset]
 *  type 'a' one actor, 'p' a pair chatting as they walk, 'd' a walker with an off-lead dog. Seeds come from the row index. */
const _shcLife = (D, seed0, rows) => rows.forEach(([t, obj, route, preset, v, off], i) => {
  const spec = { obj, route, preset, variant: v | 0, seed: seed0 + i * 97, offset: off != null ? off : (i * 0.37) % 1 };
  if (t === 'p') D.actors.push(...sceneBehave.pair(D, spec));
  else if (t === 'd') D.actors.push(...sceneBehave.walkWithDog(D, Object.assign(spec, { walker: obj, dogVariant: v % 3 })));
  else D.actors.push(sceneBehave.actor(D, spec));
});

/* ---------- v1: the Peace Gardens ---------- */
function sceneUkNorthSheffieldCentreV1() {
  const S = SCENE_SHC, cam = { eye: 1.7, fov: 60, horizon: 468, heading: 352, lat: 53.37962, lon: -1.47028 };
  const rill = (side) => [[side * 4.6, 5], [side * 4.9, 20], [side * 5.3, 36], [side * 5.8, 50], [side * 6.8, 57.5]];
  const data = {
    v: 2, id: 'shc-peace-gardens',
    view: { lat: cam.lat, lon: cam.lon }, camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'people', 'birds', 'temperate'],
    sky: _SHC_SKY, palette: _SHC_PAL,
    surfaces: [
      { id: 'land', kind: 'plaza', rest: true },
      { id: 'lawn-l', kind: 'lawn', poly: [[-36, 4], [-2.2, 4], [-2.2, 55], [-12, 58], [-14, 80], [-2.2, 82], [-2.2, 150], [-36, 150]] },
      { id: 'lawn-r', kind: 'lawn', poly: [[2.2, 4], [36, 4], [36, 150], [2.2, 150], [2.2, 82], [14, 80], [12, 58], [2.2, 55]] },
      { id: 'ring', kind: 'plaza', poly: S.oval(0, 67, 17, 12.5, 24) },
      { id: 'walk-s', kind: 'plaza', poly: [[-2.2, 4], [2.2, 4], [2.2, 57], [-2.2, 57]] },
      { id: 'walk-n', kind: 'plaza', poly: [[-2.2, 78], [2.2, 78], [2.2, 151], [-2.2, 151]] },
      { id: 'edge-l', kind: 'edge', path: rill(-1), width: 2.2 },
      { id: 'edge-r', kind: 'edge', path: rill(1), width: 2.2 },
      { id: 'pinstone', kind: 'road', path: [[-44, 3], [-45.5, 120], [-48, 300]], width: 8.4, markings: 'centre' },
      { id: 'pave-w', kind: 'pavement', beside: 'pinstone', side: 'left', width: 3.6, kerb: 0.12 },
      { id: 'pave-e', kind: 'pavement', beside: 'pinstone', side: 'right', width: 4.4, kerb: 0.12 },
      { id: 'front', kind: 'plaza', poly: [[-36, 150], [44, 150], [44, 158], [-36, 158]] },
      { id: 'east', kind: 'pavement', poly: [[36, 4], [44, 4], [44, 150], [36, 150]] },
      { id: 'plot-e', kind: 'plot', poly: [[44, 4], [120, 4], [120, 160], [44, 160]] },
    ],
    water: [
      { id: 'cascade-l', kind: 'canal', poly: S.strip(rill(-1), 1.1), edge: 'hard', ripple: 0, mirror: 0.4, rings: false },
      { id: 'cascade-r', kind: 'canal', poly: S.strip(rill(1), 1.1), edge: 'hard', ripple: 0, mirror: 0.4, rings: false },
      { id: 'fountain', kind: 'pond', poly: S.oval(0, 68, 11, 7.2, 24), edge: 'hard', ripple: 0.25, mirror: 0.6, rings: false },
    ],
    ground: [], place: [], scatter: [], actors: [], flocks: [], buildings: [],
    streets: [
      { side: 'left', along: 'pinstone', from: 6, to: 290, style: { edwardian: 3, 'interwar-shops': 1, georgian: 1 }, storeys: [3, 5], frontage: [9, 16], setback: 4, gaps: 0.04, shops: 'ground', seed: 5 },
    ],
    flows: [
      { id: 'walk', kind: 'walk', on: ['walk-s', 'ring', 'walk-n', 'front'], density: 3, profile: 'town', mix: _SHC_WALKERS, speed: [1.0, 1.5], both: true, max: 20, seed: 11,
        lanes: [{ path: [[-0.9, 5], [-1.2, 44], [-7, 56.5], [-13.6, 68], [-7, 79.5], [-1.2, 90], [-1.2, 150]], dir: 1 }, { path: [[1.1, 150], [1.2, 90], [7, 79.5], [13.6, 68], [7, 56.5], [1.1, 44], [1.1, 5]], dir: 1 },
          { path: [[-36, 153], [43, 154]], dir: 1 }, { path: [[43, 156.5], [-36, 156]], dir: 1 }, ] },
      { id: 'pavements', kind: 'walk', on: ['pave-w', 'pave-e', 'east'], density: 2.4, profile: 'town', mix: _SHC_WALKERS, speed: [1.1, 1.5], both: true, max: 6, seed: 12 },
      // (no traffic flow on Pinstone Street: it runs away from us, and the cars and buses have no three-quarter views yet)
    ],
  };
  const Pl = data.place, Sc = data.scatter, r = S.rnd(101);
  // ---- the granite of the walk and the ring: its joints in perspective
  data.ground.push({ layer: 'fore', d: S.paving(cam, -2.2, 2.2, 4.4, 15, 1.1, 0.75, 0.05), fill: '#857e70' },
    { layer: 'near', d: S.paving(cam, -2.2, 2.2, 15, 54, 1.1, 0.75, 0.05), fill: '#8a8374' });
  // ---- the Town Hall closes the view; the buildings east of the gardens (the Town Hall's extension, Norfolk Street's offices)
  Pl.push({ obj: 'landmark.shc-town-hall', at: [7, 176], fix: true, subject: true });
  data.buildings.push(
    { style: 'edwardian', at: [57, 78], frontage: 22, depth: 30, front: 0, storeys: 4, seed: 41, roof: 'hip' },
    { style: 'georgian', at: [56, 122], frontage: 22, depth: 30, front: 0, storeys: 4, seed: 42, roof: 'flat' },
    { style: 'edwardian', at: [86, 182], frontage: 26, depth: 26, front: 0, storeys: 5, seed: 44 });
  // ---- the fountain: the arc of jets on the far side of the basin, rising to the middle; low jets on the near side
  for (let i = 0; i < 19; i++) {
    const a = Math.PI * (0.06 + 0.88 * i / 18), x = -9.4 * Math.cos(a), d = 68 + 5.4 * Math.sin(a), mid = 1 - Math.abs(i - 9) / 9;
    Pl.push({ obj: 'water.shc-jet', at: [_SHC_R2(x), _SHC_R2(d)], variant: mid > 0.6 ? 2 : mid > 0.2 ? 1 : 0, k: 1, seed: 300 + i, flip: i % 2 === 0, anim: i % 3 ? false : undefined });
  }
  for (let i = 0; i < 7; i++) { const a = Math.PI * (1.12 + 0.76 * i / 6); Pl.push({ obj: 'water.shc-bubbler', at: [_SHC_R2(6.4 * Math.cos(a)), _SHC_R2(68 + 4 * Math.sin(a))], variant: i % 2, k: 1, seed: 340 + i, flip: i % 2 === 1 }); }
  // ---- trees round the edges of the gardens: planes, oaks and birches in groups of different sizes
  const trees = [[-17, 24, 'tree.pool-birch', 0.8, 0], [-28, 66, 'tree.plane-avenue', 1.15, 0], [-34, 95, 'tree.plane-avenue', 1.0, 2], [-31, 128, 'tree.plane-avenue', 0.9, 0],
    [30, 46, 'tree.plane-avenue', 1.1, 2], [27, 58, 'tree.pool-birch', 0.85, 0], [32, 90, 'tree.plane-avenue', 1.2, 0],
    [18, 104, 'tree.pool-birch', 0.75, 1]];
  trees.forEach(([x, d, id, k, v], i) => Pl.push({ obj: id, at: [x, d], k, variant: v, flip: i % 2 === 0, anim: false, reflect: false }));
  // ---- the beds along the lawns: roses and bedding in clumps (small near us), low shrubs further off
  Sc.push({ obj: { 'plant.shrub': 2, 'plant.daisies': 3, 'plant.wildflowers': 3 }, on: ['lawn-l', 'lawn-r'], d: [16, 140], n: 34, dist: 'screen', cluster: { centres: 12, spread: 1.4 }, k: [0.45, 0.8], seed: 21, anim: false, tint: { col: '#8a6a3a', k: [0, 0.14] } });
  Sc.push({ obj: { 'plant.grass': 3, 'plant.daisies': 2, 'plant.wildflowers': 1 }, on: ['lawn-l', 'lawn-r'], d: [4.4, 18], n: 50, dist: 'screen', cluster: { centres: 10, spread: 0.9 }, k: [0.7, 1.1], seed: 22, anim: false, tint: { col: '#8a8a40', k: [0, 0.14] } });
  // ---- benches round the ring and along the walk, lamp standards (irregular)
  [[13.5, 64], [-10, 76], [11, 77], [4.6, 36]].forEach(([x, d], i) => Pl.push({ obj: 'street.bench', at: [x, d], k: 1, variant: i % 3, flip: i % 2 === 0 }));
  for (const [x, d] of [[-3.2, 14], [3.3, 27], [-15, 70], [15.5, 59], [-3.2, 112], [3.4, 131]]) Pl.push({ obj: 'street.lamppost', at: [x, d], k: 1.05, variant: r() < 0.5 ? 1 : 3, flip: x > 0, reflect: false });
  // ---- the life (a few placed people; the crowd comes from the flows): children at the jets, a reader and a sitter on the
  //      benches, a photographer lining up the tower, a dog walker and the dog off the lead, pigeons on the granite
  Pl.push({ obj: 'person.child-jumping', at: [-2.6, 60], k: 1, variant: 0 }, { obj: 'person.child-ball', at: [6, 58.6], k: 1 },
    { obj: 'person.bench-sitter', at: [-13, 62.2], k: 1 }, { obj: 'person.photographer', at: [3, 44], k: 1, face: 'left' },
    { obj: 'person.phone-idler', at: [-8.6, 38], k: 1 });
  // ---- the lunchtime crowd close to us, every one a behaviour (the flows fill the far walk and the ring)
  _shcLife(data, 1100, [
    ['d', 'person.walker', [[-0.8, 6], [-1.0, 24], [-1.2, 44]], 'dog-walker', 1],
    ['p', 'person.walker', [[1.0, 48], [1.1, 30], [1.2, 8]], 'chat', 3],
    ['a', 'person.walker', [[-1.6, 52], [-1.1, 30], [-0.6, 7]], 'stroll', 2],
    ['a', 'person.walker', [[0.6, 6], [0.9, 26], [1.4, 52]], 'brisk', 1, 0.05],
    ['a', 'person.walker', [[-1.4, 12], [-1.3, 34]], 'elderly', 0],
    ['a', 'person.walker', [[1.5, 40], [1.2, 18], [0.4, 6]], 'stroll', 3, 0.85],
    ['a', 'person.walker', [[-0.3, 9], [0.3, 30], [0.8, 50]], 'stroll', 5, 0.6],
    ['p', 'person.walker', [[-1.0, 20], [-1.2, 44], [-7, 56.5], [-12.5, 64]], 'chat', 6],
    ['a', 'person.jogger', [[0.9, 4.6], [1.1, 44], [7, 56.5], [13, 66]], 'jogger', 2, 0.5],
    ['a', 'person.walker', [[-1.0, 56], [-0.9, 36], [-0.8, 16]], 'stroll', 1, 0.15],
    ['a', 'person.walker', [[-12, 61], [-7, 56.5], [-1.4, 46]], 'child', 4],
  ]);
  _shcPigeons(Pl, r, [[8, 56, 7], [-12, 81, 5], [1.6, 14, 4], [-1.6, 26, 3]], 16);
  // ---- benches along the walk with people on them, bins and a planter; autumn leaves and wear on the granite
  // (the sitter objects carry their own bench)
  for (const [x, d, who, v] of [[-3.1, 21, 'person.bench-sitter', 0], [3.2, 39, 'person.bench-reader', 2], [-3.2, 46, 'person.bench-sitter', 3]]) Pl.push({ obj: who, at: [x, d], k: 1, variant: v, flip: x > 0 });
  for (const [x, d] of [[-2.8, 30], [2.9, 52]]) Pl.push({ obj: 'street.bollard', at: [x, d], k: 1, variant: 2 });
  Sc.push({ obj: { 'ground.leaves': 3, 'ground.leaf-litter': 2 }, on: ['land', 'ring'], d: [4.5, 70], n: 30, dist: 'ground', cluster: { centres: 8, spread: 2.4 }, gap: 'foot', seed: 23, anim: false, k: [0.6, 1.2] });
  data.flocks.push({ obj: 'bird.small-flight', n: 5, area: [700, 300, 1200, 440], speed: 60, s: 0.45, seed: 61, layer: 'mid' });
  data.flocks.push({ obj: 'bird.gull', n: 3, area: [200, 50, 1400, 240], speed: 24, s: 0.32, seed: 62, layer: 'far' });
  // ---- framing: the plane up the left edge, its bough over the top; a reader on a bench by the walk
  Pl.push({ obj: 'tree.shc-plane-bough', x: -96, y: 940, s: 1.0, pin: true, layer: 'front', shadow: false, anim: { sway: { k: 0.6 } } });
  Pl.push({ obj: 'person.bench-reader', at: [3.3, 15.2], k: 1, variant: 1, flip: true });
  for (const p of Pl) if (p.reflect == null && !/^water\./.test(p.obj)) p.reflect = false;
  return data;
}

/* ---------- v2: Millennium Square and the Winter Garden ---------- */
function sceneUkNorthSheffieldCentreV2() {
  const S = SCENE_SHC, cam = { eye: 1.65, fov: 56, horizon: 548, heading: 75, lat: 53.37935, lon: -1.46905 };
  const treesAt = [[-24, 44, 'tree.pool-birch', 0.9], [-19.5, 49, 'tree.pool-birch', 0.75], [-28, 52, 'tree.pool-birch', 1.0], [26, 58, 'tree.pool-birch', 0.9], [-36, 70, 'tree.cherry', 0.8]];
  const data = {
    v: 2, id: 'shc-winter-garden',
    view: { lat: cam.lat, lon: cam.lon }, camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'people', 'birds', 'temperate'],
    sky: _SHC_SKY, palette: _SHC_PAL,
    surfaces: [
      { id: 'land', kind: 'plaza', rest: true },
      { id: 'band-l', kind: 'edge', path: [[-6, 4.6], [-2.4, 78]], width: 0.5 },
      { id: 'band-r', kind: 'edge', path: [[6, 4.6], [2.4, 78]], width: 0.5 },
      { id: 'band-x', kind: 'edge', path: [[-40, 30], [40, 30]], width: 0.4 },
      { id: 'bed-near', kind: 'garden', poly: [[4.6, 5.6], [14, 5.6], [14, 9.4], [4.6, 9.4]] },
      { id: 'gallery', kind: 'plot', poly: [[20, 68], [100, 68], [100, 80], [20, 80]] },
      { id: 'wg', kind: 'plot', poly: [[-42, 80], [42, 80], [42, 100], [-42, 100]] },
    ].concat(_shcPits(treesAt), [{ id: 'bed-l', kind: 'garden', poly: [[-30, 40], [-17, 40], [-17, 54], [-30, 54]] }]),
    water: [],
    ground: [], place: [], scatter: [], actors: [], flocks: [], buildings: [],
    flows: [
      { id: 'walk', kind: 'walk', on: ['land'], density: 4.5, profile: 'town', mix: _SHC_WALKERS, speed: [1.0, 1.5], both: true, max: 30, seed: 21,
        lanes: [{ path: [[-60, 18], [-10, 20], [20, 22], [60, 24]], dir: 1 }, { path: [[60, 36], [20, 35], [-20, 34], [-60, 33]], dir: 1 },
          { path: [[-0.8, 5], [-0.4, 40], [0, 78]], dir: 1 }, { path: [[1.2, 78], [1.4, 40], [2.4, 5]], dir: 1 }, { path: [[-60, 62], [60, 64]], dir: 1 }, { path: [[60, 12], [-60, 11]], dir: 1 }] },
    ],
  };
  const Pl = data.place, Sc = data.scatter, r = S.rnd(202);
  // ---- the granite: joints in perspective over the near square
  data.ground.push({ layer: 'fore', d: S.paving(cam, -14, 14, 4.8, 15, 1.2, 0.9, 0.05), fill: '#8a8376' },
    { layer: 'near', d: S.paving(cam, -30, 30, 15, 50, 1.2, 0.9, 0.05), fill: '#8e8778' });
  Pl.push({ obj: 'landmark.shc-winter-garden', at: [0, 84], fix: true, variant: 0, subject: true });
  Pl.push({ obj: 'landmark.shc-st-pauls-tower', at: [-58, 132], fix: true });
  Pl.push({ obj: 'landmark.shc-gallery', at: [50, 76], fix: true });
  data.buildings.push({ style: 'modern-glass', at: [-92, 80], frontage: 36, depth: 40, front: 0, storeys: 7, seed: 51 },
    { style: 'georgian', at: [-45, 175], frontage: 30, depth: 30, front: 0, storeys: 5, seed: 52 });
  // ---- trees: birches in their bed and pits, planes and a cherry on the square's edges (in groups, not a row)
  for (const [x, d, id, k] of treesAt) Pl.push({ obj: id, at: [x, d], k, variant: Math.floor(r() * 3), flip: r() < 0.5, anim: false });
  Sc.push({ obj: { 'plant.shrub': 2, 'plant.daisies': 3, 'plant.wildflowers': 2, 'plant.grass': 2 }, on: ['bed-l'], d: [38, 56], n: 50, dist: 'screen', cluster: { centres: 5, spread: 1.2 }, k: [0.6, 1], seed: 31, anim: false, tint: { col: '#8a6a3a', k: [0, 0.14] } });
  Sc.push({ obj: { 'plant.daisies': 3, 'plant.wildflowers': 3, 'plant.grass': 2, 'plant.shrub': 1 }, on: ['bed-near'], d: [5.6, 9.4], n: 60, dist: 'screen', cluster: { centres: 5, spread: 0.6 }, k: [0.7, 1.1], seed: 32, anim: false, tint: { col: '#8a5a6a', k: [0, 0.16] } });
  // ---- the cafe tables by the gallery, benches, lamps, planters (irregular)
  for (const [x, d] of [[16, 34], [20, 38], [15, 43]]) Pl.push({ obj: 'person.cafe-goer', at: [x, d], k: 1, variant: Math.floor(r() * 4) });
  for (const [x, d] of [[-14, 58], [9, 60]]) Pl.push({ obj: 'street.bench', at: [x, d], k: 1, variant: Math.floor(r() * 3), flip: r() < 0.5 });
  for (const [x, d] of [[8, 31], [-5, 56], [11, 64]]) Pl.push({ obj: 'street.lamppost', at: [x, d], k: 1.0, variant: 1, flip: x > 0 });
  for (const [x, d] of [[-3.4, 72], [3.6, 72], [-12, 26], [12.5, 50], [19, 30]]) Pl.push({ obj: 'plant.planter', at: [x, d], k: 1.2, variant: Math.floor(r() * 3), flip: r() < 0.5 });
  // ---- the life (a few placed; the crowd from the flows): a reader on a bench, a child on a scooter, a photographer, pigeons
  Pl.push({ obj: 'person.bench-reader', at: [-10, 36.2], k: 1 }, { obj: 'person.child-scooter', at: [4, 26], k: 1 }, { obj: 'person.photographer', at: [-2.4, 48], k: 1, face: 'right' },
    { obj: 'person.child-ball', at: [-6, 16], k: 1 }, { obj: 'person.bench-sitter', at: [-3.6, 15], k: 1, variant: 2 });
  _shcPigeons(Pl, r, [[1.6, 13, 6], [-8, 42, 5], [12, 62, 4], [-1, 8, 3]], 10);
  data.flocks.push({ obj: 'bird.small-flight', n: 7, area: [500, 200, 1100, 420], speed: 60, s: 0.45, seed: 71, layer: 'mid' });
  data.flocks.push({ obj: 'bird.gull', n: 3, area: [300, 40, 1500, 200], speed: 24, s: 0.34, seed: 72, layer: 'far' });
  // ---- close to us: a dog nosing at the pigeons, a planter of bedding, cyclists crossing the square
  Pl.push({ obj: 'animal.dog', at: [-2.2, 11.5], k: 1, variant: 2, face: 'right' }, { obj: 'plant.planter', at: [6.4, 12.6], k: 1.3, variant: 2 }, { obj: 'street.bollard', at: [-5.2, 12], k: 1, variant: 1 }, { obj: 'street.bollard', at: [4.4, 16.5], k: 1, variant: 1 });
  // ---- the cafe terrace by the gallery under parasols, street trees in pits, cycle hoops, the leaves and the granite's wear
  [[13.5, 30, 1], [16.5, 36, 0], [13.8, 42, 3], [17, 47, 2]].forEach(([x, d, v], i) => Pl.push({ obj: 'street.mqn-parasol', at: [x, d], variant: v, flip: i % 2 === 1 }));
  for (const [x, d, v] of [[12.4, 33, 1], [15.6, 39.5, 2], [13, 45, 0], [18.2, 33.5, 3], [16, 50, 1]]) Pl.push({ obj: 'person.cafe-goer', at: [x, d], k: 1, variant: v, flip: x > 15 });
  for (const [x, d, v] of [[9.6, 17, 0], [-15, 38, 2], [21, 62, 1]]) Pl.push({ obj: 'tree.mqn-street-tree', at: [x, d], variant: v, pit: true, anim: false, flip: v === 1 });
  for (const [x, d, v] of [[-8.4, 14, 0], [-8.4, 15.6, 2], [-8.5, 17.2, 1], [-8.4, 18.8, 0]]) Pl.push({ obj: 'street.mqn-bike-hoop', at: [x, d], variant: v, face: 'right' });
  for (const [x, d, v] of [[4.2, 21, 1], [-4.5, 30, 0], [6, 44, 2]]) Pl.push({ obj: 'street.mqn-planter-grass', at: [x, d], variant: v });
  Sc.push({ obj: { 'ground.leaves': 3, 'ground.leaf-litter': 2 }, on: ['land'], d: [4.5, 60], n: 32, dist: 'ground', cluster: { centres: 8, spread: 2.4 }, gap: 'foot', seed: 33, anim: false, k: [0.6, 1.2] });
  // ---- the crowd close to us, each a behaviour: shoppers and office workers crossing to the Winter Garden's doors and to
  //      Surrey Street, students cutting across, a family, a dog walker
  _shcLife(data, 2200, [
    ['a', 'person.walker', [[-24, 10], [-6, 12], [10, 14], [28, 16]], 'stroll', 1],
    ['a', 'person.walker', [[28, 19], [8, 18], [-10, 16.5], [-28, 15]], 'brisk', 2],
    ['p', 'person.walker', [[-0.6, 6], [-0.2, 30], [0.2, 70]], 'chat', 3],
    ['a', 'person.walker', [[1.8, 74], [1.6, 40], [2.4, 7]], 'brisk', 0],
    ['d', 'person.walker', [[-22, 24], [-6, 26], [8, 27], [20, 28]], 'dog-walker', 4],
    ['a', 'person.walker', [[-3, 9], [-2.4, 22], [-1.8, 36]], 'elderly', 1],
    ['a', 'person.takeaway-walker', [[24, 22], [6, 22.5], [-10, 21], [-22, 20]], 'stroll', 2, 0.5],
    ['a', 'person.walker', [[-18, 34], [-4, 33], [6, 32.5]], 'stroll', 0],
    ['a', 'person.walker', [[3, 8], [3.6, 24], [4.4, 50], [3.2, 70]], 'child', 6],
    ['p', 'person.walker', [[20, 12], [6, 10], [-8, 9.5], [-20, 9]], 'chat', 1, 0.7],
    ['a', 'person.jogger', [[-30, 40], [-10, 39], [10, 38], [28, 37]], 'jogger', 3],
    ['a', 'person.student', [[18, 7.4], [6, 7.2], [-6, 7.0], [-18, 6.8]], 'brisk', 2, 0.2],
    ['a', 'person.shopper', [[-16, 8.4], [-4, 8.6], [8, 8.8], [18, 9]], 'stroll', 3, 0.65],
  ]);
  // ---- framing: the flower bed and a birch close on the right
  return data;
}

/* ---------- v3: Sheaf Square, the Cutting Edge and the station ---------- */
function sceneUkNorthSheffieldCentreV3() {
  const S = SCENE_SHC, P = S.v3, cam = P.camera, E = SCENE_SHC_EDGE;
  const roadD = (x) => 88 - 0.06 * x;
  const foot = SCENE_SHC.line(P.edge, 3).map(([x, d]) => [_SHC_R1(x - 1.0), d]);
  const treesAt = [[-15, 20, 'tree.pool-birch', 0.85], [-14, 27, 'tree.pool-birch', 0.7], [-17, 60, 'tree.pool-birch', 1.0], [14, 36, 'tree.pool-birch', 0.8]];
  const data = {
    v: 2, id: 'shc-sheaf-square',
    view: { lat: cam.lat, lon: cam.lon }, camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'people', 'birds', 'temperate'],
    sky: _SHC_SKY, palette: _SHC_PAL,
    surfaces: [
      { id: 'land', kind: 'plaza', rest: true },
      { id: 'sheaf', kind: 'road', path: [[-260, roadD(-260)], [260, roadD(260)]], width: 14, markings: 'centre' },
      { id: 'pave-n', kind: 'pavement', beside: 'sheaf', side: 'right', width: 4, kerb: 0.12 },
      { id: 'pave-s', kind: 'pavement', beside: 'sheaf', side: 'left', width: 5, kerb: 0.12 },
      { id: 'xing', kind: 'road', path: [[-6, roadD(-6) - 7], [-6, roadD(-6) + 7]], width: 4.4, markings: 'zebra', crossing: true },
      { id: 'sq', kind: 'plaza', poly: [[-20.5, 11], [5, 11]].concat(P.edge.map(([x, d]) => [_SHC_R1(x - 2.6), d]), [[-9, 68], [40, 68], [40, 80.5], [-20.5, 80.5]]) },
      { id: 'rank', kind: 'parking', poly: [[-80, 99], [60, 98.5], [60, 104], [-80, 104.5]] },
      { id: 'forecourt', kind: 'plaza', poly: [[-200, 104.5], [200, 102], [200, 116], [-200, 116]] },
      { id: 'station', kind: 'plot', poly: [[-200, 116], [200, 116], [200, 140], [-200, 140]] },
      { id: 'hall', kind: 'plot', poly: [[-50, 12], [-21, 12], [-21, 74], [-50, 74]] },
      { id: 'bed', kind: 'garden', poly: [[-19.5, 16], [-12.5, 16], [-12.5, 40], [-19.5, 40]] },
      // behind the station: the railway's yards, then the wooded slope of South Street Park up to Park Hill (no flat lawn)
      { id: 'slope', kind: 'park', poly: [[-260, 140], [260, 140], [260, 600], [-260, 600]] },
    ].concat(_shcPits(treesAt)),
    water: [
      { id: 'pool-1', kind: 'pond', poly: [[-4.6, 24], [1.6, 24], [1.2, 31], [-4.8, 31]], edge: 'hard', ripple: 0.1, mirror: 0.7, rings: false },
      { id: 'pool-2', kind: 'pond', poly: [[-5.6, 34], [0.4, 34], [-0.4, 42], [-6.2, 42]], edge: 'hard', ripple: 0.1, mirror: 0.7, rings: false },
      { id: 'pool-3', kind: 'pond', poly: [[-7, 45], [-1.2, 45], [-2.4, 54], [-8, 54]], edge: 'hard', ripple: 0.1, mirror: 0.7, rings: false },
    ],
    ground: [], place: [], scatter: [], actors: [], flocks: [], buildings: [],
    flows: [
      { id: 'walk', kind: 'walk', on: ['sq', 'forecourt'], density: 4.5, profile: 'town', mix: _SHC_WALKERS, speed: [1.1, 1.6], both: true, max: 22, seed: 31,
        lanes: [{ path: [[-9, 12], [-10, 30], [-11, 50], [-9, 70], [-6.5, 80]], dir: 1 }, { path: [[-5, 80], [-6, 70], [-9.4, 56], [-8, 30], [-6.2, 12]], dir: 1 },
          { path: [[3.4, 12], [4.6, 22]], dir: 1 }, { path: [[-6, 96], [-6, 108], [10, 111]], dir: 1 }, { path: [[30, 111], [-6, 109], [-7, 96]], dir: 1 }, { path: [[-120, 108], [120, 106]], dir: 1 }, { path: [[120, 110], [-120, 112]], dir: 1 }] },
      { id: 'pavements', kind: 'walk', on: ['pave-n', 'pave-s'], density: 2, profile: 'commuter', mix: _SHC_WALKERS, speed: [1.1, 1.5], both: true, max: 6, seed: 32 },
      { id: 'traffic', kind: 'drive', on: 'sheaf', density: 1.2, profile: 'commuter', mix: { 'vehicle.car-city': 5, 'vehicle.taxi-black': 2, 'vehicle.car': 3 }, bus: { obj: 'vehicle.bus', every: 3 }, speed: [6, 11], max: 6, seed: 33 },
    ],
  };
  const Pl = data.place, Sc = data.scatter, A = data.actors, r = S.rnd(303), f = S.proj(cam).f;
  data.ground.push({ layer: 'fore', d: S.paving(cam, -14, 6, 11.2, 15, 1.4, 1.0, 0.06), fill: '#857e70' },
    { layer: 'near', d: S.paving(cam, -14, 4, 15, 46, 1.4, 1.0, 0.06), fill: '#8a8374' });
  // ---- the Cutting Edge, in this camera's perspective
  Pl.push(...E.placements('structure.shc-cutting-edge').map(p => Object.assign(p, { reflect: false })));
  // ---- the station across Sheaf Street, the rank of black cabs on its forecourt
  Pl.push({ obj: 'landmark.shc-station', at: [8, 122], fix: true, subject: true });
  for (const [x, v] of [[-34, 0], [-26, 1], [-18, 2], [16, 3], [24, 0]]) Pl.push({ obj: 'vehicle.taxi-black', at: [x, 101.5], k: 1, variant: v, face: 'left', anim: false });
  // ---- Park Hill on its hill above the station; Norfolk Park's ridge beyond, houses and trees on it
  Pl.push({ obj: 'landmark.shc-park-hill', at: [-30, 430], fix: true, layer: 'far' });
  { const ridge = [[-160, 300], [180, 286], [520, 296], [860, 282], [1180, 290], [1500, 276], [1760, 288]], t = S.terraces(77, ridge.map(([x, y]) => [x, y + 2]), 90, 3, 6);
    data.ground.push({ layer: 'horizon', d: S.ridge(ridge, 420), fill: { lin: [[0, '#7a8e7a'], [1, '#6a7e66']], y1: 270, y2: 420 } }, { layer: 'horizon', d: t.wall, fill: '#9a8e80' }, { layer: 'horizon', d: t.roof, fill: '#6a6a6e' }); }
  data.ground.push({ layer: 'horizon', d: S.ridge([[-160, 334], [300, 330], [700, 338], [1060, 326], [1400, 318], [1760, 306]], 420), fill: { lin: [[0, '#6e8a5e'], [1, '#5a744c']], y1: 300, y2: 420 } });
  // ---- the Supertram on the hill right of the station, climbing (and one coming down), small at this distance
  { const s = _SHC_R2(f / 520 * 3.6 / 130);
    A.push({ obj: 'vehicle.shc-supertram', layer: 'far', path: [[1420, 332], [1540, 321], [1660, 310], [1790, 298]], speed: 12, loop: 'fade', s, seed: 35, offset: 0.25 });
    A.push({ obj: 'vehicle.shc-supertram', layer: 'far', path: [[1790, 306], [1660, 318], [1540, 329], [1420, 340]], speed: 11, loop: 'fade', s, seed: 36, offset: 0.75 }); }
  // ---- Sheffield Hallam's buildings on the left, an office block far right
  data.buildings.push(
    { style: 'brutalist', at: [-38, 24], frontage: 26, depth: 30, front: 0, storeys: 8, seed: 61 },
    { style: 'interwar-shops', at: [58, 70], frontage: 30, depth: 16, front: 0, storeys: 2, seed: 63 });
  // ---- trees: birches and planes in the square (groups), the bed of grasses by the hall
  for (const [x, d, id, k] of treesAt) Pl.push({ obj: id, at: [x, d], k, variant: Math.floor(r() * 3), flip: r() < 0.5, anim: false });
  // the slope's woods behind the station, in clumps, and the station's street trees along the forecourt
  Sc.push({ obj: { 'tree.far-broad': 4, 'tree.far-birch': 2, 'tree.wyv-far-oak': 3 }, on: 'slope', d: [145, 300], n: 60, dist: 'ground', cluster: { centres: 18, spread: 10 }, gap: 'foot', k: [1.2, 2.1], seed: 46, anim: false, shadow: false });
  Sc.push({ obj: { 'tree.far-broad': 4, 'tree.far-birch': 2, 'tree.distant': 2 }, on: 'slope', d: [300, 560], n: 50, dist: 'ground', cluster: { centres: 14, spread: 14 }, gap: 'foot', k: [1.1, 1.9], seed: 42, anim: false, shadow: false });
  for (const [x, d, v] of [[-52, 113, 0], [-30, 114, 1], [40, 112, 2], [64, 111, 0]]) Pl.push({ obj: 'tree.mqn-street-tree', at: [x, d], variant: v, pit: true, anim: false, flip: v === 1 });
  // the square's clutter: cycle hoops by the steps, bollards, grass planters, leaves and the wear of the paving
  for (const [x, d, v] of [[-15.6, 43, 0], [-15.6, 44.8, 2], [-15.6, 46.6, 1], [-15.6, 48.4, 0]]) Pl.push({ obj: 'street.mqn-bike-hoop', at: [x, d], variant: v, face: 'right' });
  // east of the sculpture: the upper square toward Sheaf Street, its street trees, sitters and people heading for the trams
  for (const [x, d, v] of [[14, 16, 0], [22, 30, 2], [12, 52, 1]]) Pl.push({ obj: 'tree.mqn-street-tree', at: [x, d], variant: v, pit: true, anim: false, flip: v === 2 });
  // visitors stopped at the sculpture close to us: a photographer lining it up, a phone, a child with a ball
  Pl.push({ obj: 'person.photographer', at: [0.6, 18.5], k: 1, face: 'right' }, { obj: 'person.phone-idler', at: [-3.4, 16.8], k: 1, variant: 2 }, { obj: 'person.wheelchair-user', at: [-11.4, 22], k: 1, variant: 1, anim: false });
  for (const [x, d, v] of [[-13.6, 30, 0], [-3.2, 64, 2], [6.4, 70, 1]]) Pl.push({ obj: 'street.mqn-planter-grass', at: [x, d], variant: v });
  Sc.push({ obj: { 'ground.leaves': 3, 'ground.leaf-litter': 2 }, on: ['land'], d: [11.5, 80], n: 32, dist: 'ground', cluster: { centres: 8, spread: 2.6 }, gap: 'foot', seed: 43, anim: false, k: [0.6, 1.2] });
  // the crowd off the trains, up the square to Howard Street and the university, each a behaviour
  _shcLife(data, 3300, [
    ['a', 'person.walker', [[-6.5, 82], [-9.2, 60], [-10, 40], [-8.6, 22], [-6.4, 12]], 'brisk', 1],
    ['a', 'person.walker', [[-7.4, 12], [-9.4, 30], [-10.4, 50], [-8.4, 70], [-6, 82]], 'brisk', 2, 0.4],
    ['p', 'person.walker', [[-17, 20.5], [-10, 19.6], [-3, 19]], 'chat', 3],
    ['a', 'person.walker', [[-4.6, 14], [-7.2, 34], [-8.2, 56], [-4.6, 80]], 'brisk', 0, 0.3],
    ['a', 'person.walker', [[-1.6, 14], [-5.8, 22], [-6.6, 33], [-8.4, 43], [-9.6, 58]], 'stroll', 1, 0.55],
    ['d', 'person.walker', [[-11.6, 62], [-10.6, 44], [-9.8, 26], [-9.6, 17]], 'dog-walker', 2],
    ['a', 'person.walker', [[-6.6, 13], [-8, 24], [-9.4, 36]], 'elderly', 3],
    ['a', 'person.walker', [[3.2, 18], [1.8, 13], [-2, 12.6], [-6, 13]], 'stroll', 0, 0.6],
    ['a', 'person.commuter-station', [[-30, 109], [0, 108.6], [30, 108.2]], 'brisk', 4, 0.1],
    ['p', 'person.walker', [[30, 110.6], [0, 111], [-30, 111.4]], 'chat', 5, 0.5],
    ['a', 'person.walker', [[-12, 16], [-4, 15.4], [3, 15]], 'stroll', 6, 0.1],
    ['a', 'person.walker', [[-3, 15], [-6.6, 30], [-9.4, 46]], 'stroll', 2, 0.5],
  ]);
  Sc.push({ obj: { 'plant.grass-long': 3, 'plant.shrub': 2, 'plant.wildflowers': 1 }, on: 'bed', d: [16, 40], n: 50, dist: 'screen', cluster: { centres: 4, spread: 1.2 }, k: [0.5, 1.25], seed: 41, anim: false, tint: { col: '#8a7a40', k: [0, 0.14] } });
  for (const [x, d] of [[-12, 46], [5.4, 58], [-8.6, 74], [-34, 107], [30, 106]]) Pl.push({ obj: 'street.lamppost', at: [x, d], k: 1, variant: 1, flip: x > 0 });
  for (const [x, d] of [[-20, 96], [-14, 96], [6, 95.5]]) Pl.push({ obj: 'street.bollard', at: [x, d], k: 1, variant: 1 });
  for (const [x, d] of [[-11.5, 36]]) Pl.push({ obj: 'street.bench', at: [x, d], k: 1, variant: 1, flip: x < -11.2 });
  // ---- the life (a few placed; the crowds and traffic from the flows): skaters on the square, a sitter, a child at the pools
  Pl.push({ obj: 'person.skateboarder', at: [-1, 20], k: 1 }, { obj: 'person.skateboarder', at: [-12.4, 44], k: 1, variant: 2 }, { obj: 'person.bench-sitter', at: [-11, 16.7], k: 1 },
    { obj: 'person.child-ball', at: [-2, 47], k: 1 }, { obj: 'person.couple', at: [3, 18], k: 1, anim: false }, { obj: 'person.phone-idler', at: [-12, 62], k: 1 });
  _shcPigeons(Pl, r, [[-1.2, 22, 5], [-8, 44, 4], [-4, 58, 5], [-4.4, 13.4, 5]], 30);
  data.flocks.push({ obj: 'bird.small-flight', n: 7, area: [500, 260, 1100, 400], speed: 60, s: 0.4, seed: 81, layer: 'mid' });
  data.flocks.push({ obj: 'bird.gull', n: 3, area: [200, 40, 1400, 220], speed: 26, s: 0.32, seed: 82, layer: 'far' });
  // ---- framing: a lamp standard at the top of the Howard Street steps
  Pl.push({ obj: 'street.lamppost', at: [-6.6, 13.2], k: 1, variant: 3 });
  return data;
}

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
