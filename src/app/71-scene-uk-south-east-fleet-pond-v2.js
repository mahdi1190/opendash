/* ============================================================
   COMPOSED SCENE (v2, by hand) uk-south-east / Fleet Pond, view 2 (close): the Gelvert stream boardwalk.
   docs/dev/SCENE_ENGINE_V2.md. Redrawn on the v2 engine (the hand-drawn art stays in the 72 file as legacySvg).

   The view: on the boardwalk through the alder and willow carr at the south-west corner of the reserve, where the Gelvert
   stream runs out through the reeds into the pond, looking north (heading 8). The walk crosses the stream on its railed
   bridge and bends right to a small platform over the stream mouth; the stream meanders off to the left between sedge and
   reed to the open water. Beyond the water, the north reedbed and the South Western main line on its low bank along the
   north shore, trains crossing in front of the lineside birches; Fleet's woods behind.
   Framing: an ivy-clad alder trunk up the left edge with its bough over the top, ferns and sedge at the foot of the frame.
   The life: a kingfisher on its stick over the stream and its blue streak down the stream, a moorhen working the stream
   edge, a grey heron stalking the shallows at the mouth, mallards, swans and great crested grebes out on the pond, a
   birdwatcher on the platform; swallows over the water in summer, pipistrelles and mist after dusk.
   Ground plan and objects of its own: SCENE_FPV.v2 and structure.fpv-walk-v2 (70-scene-lib-fleet-pond-views.js).
     https://www.hart.gov.uk/fleet-pond-local-nature-reserve   https://fleetpond.org.uk/about-fleet-pond/
   PURE: defines sceneUkFleetPondV2() -> the scene data, called once, lazily.
   ============================================================ */
function sceneUkFleetPondV2() {
  const F = SCENE_FPV, P = F.v2, W = SCENE_FPV_WALK.v2, cam = P.camera;
  const R2 = v => Math.round(v * 100) / 100, R1 = v => Math.round(v * 10) / 10;
  const railD = x => P.rail0 + P.slope * x;
  const proj = W.proj, f = W.f;
  // (round 2) the far (north) shore: the water runs right up to the foot of the low embankment (within 3 m of both tracks,
  // so the water pass mirrors the trains; at 200 m a metre is a tenth of a pixel deep), with reed islands standing off the
  // bank in front of it (holes in the water)
  const rs = F.rnd(5), farShore = [];
  for (let x = -260; x <= 260; x += 13) farShore.push([x, R1(railD(x) - 0.5 - rs() * 0.2)]);
  const lineside = [[-320, railD(-320) + 8], [320, railD(320) + 8], [320, railD(320) + 70], [-320, railD(-320) + 70]];
  const islandsN = [[-196, 24, 5], [-132, 34, 4], [-78, 18, 6], [-30, 40, 5], [22, 22, 4], [70, 30, 6], [118, 18, 4], [168, 36, 5], [222, 26, 4]].map(([x, L, w], i) => {
    const d = railD(x) - 5.5 - w / 2 - rs() * 2;
    return F.loop([[x - L / 2, d], [x - L / 4, d - w / 2], [x + L / 4, d - w / 2 - 0.6], [x + L / 2, d], [x + L / 4, d + w / 2], [x - L / 4, d + w / 2 + 0.4]], 3, 1.2, 91 + i);
  });
  const reedsN = [[-260, railD(-260) - 16], [260, railD(260) - 16], [260, railD(260) - 2], [-260, railD(-260) - 2]];
  // (round 2) the near water: the stream comes out from under the sedge on the right, under the bridge, and opens into a
  // shallow pool left of the walk that runs on to the mouth; reed and reedmace stand in tongues out from the carr edge (and
  // one from the right), with open water between them, so the reedbed reads as clumps, stems and seedheads over water
  const inlet = F.line([[-11, 38], [-8.8, 33.6], [-8.4, 30.4], [-8.2, 27], [-8.4, 24.8], [-7.6, 21.8], [-7.2, 19.4], [-6.4, 16.6], [-5.8, 13.8],
    [-4.8, 11.2], [-4.0, 9.4], [-2.9, 8.5], [-1.6, 8.2], [-0.4, 8.4],
    [0.6, 8.7], [2.0, 8.6], [3.4, 8.3], [4.6, 8.6], [5.0, 9.5], [3.9, 10.2], [2.6, 10.8], [1.8, 11.6],   // the stream, under the bridge
    [2.1, 12.8], [3.6, 12.7], [5.0, 13.4], [5.9, 14.8], [6.1, 16.6], [5.2, 18.2], [3.4, 18.8], [2.6, 19.6], [2.8, 23.0], [3.1, 25.4], [3.4, 27.8]], 0.7);
  const pond = F.keyhole([[-260, 84], [-150, 64], [-80, 56], [-40, 50], [-20, 44]].concat(inlet, [[5.6, 31], [8, 36], [14, 41], [30, 46], [60, 52], [120, 62], [260, 84]], farShore.slice().reverse()), islandsN);
  // the reedbeds either side of the bay at the mouth (from the carr's edge to the water)
  const reedsL = F.loop([[-80, 22], [-12, 21], [-8.6, 24], [-9.4, 29], [-9.8, 33.5], [-12.6, 38.5], [-21, 44.6], [-40, 50.6], [-80, 56.6], [-150, 64.6], [-150, 24]], 2.5, 1.0, 11);
  const reedsR = F.loop([[3.6, 23.6], [9, 22.5], [30, 24], [70, 30], [150, 40], [150, 63], [120, 62.6], [60, 52.6], [30, 46.6], [14, 41.6], [8.2, 36.6], [5.8, 31.4], [3.6, 28.4]], 2.5, 1.0, 13);
  // the sedge bank at the foot of the frame, either side of the walk
  const sedgeN = [[-6, 4], [-0.15, 4], [-0.15, 9.2], [-6, 9.2]], sedgeE = [[1.5, 4], [6.4, 4], [6.4, 9.4], [1.5, 9.4]];
  // the carr either side (wet alder and willow wood): the trees stand here, never in the middle of the view
  const carrL = [[-80, 4], [-4.6, 4], [-4.4, 9], [-5.6, 13], [-6.8, 17], [-8.6, 21.5], [-14, 24], [-80, 24]];
  const carrR = [[4.6, 4], [80, 4], [80, 24], [10, 22], [6.6, 18], [6.2, 14], [5.6, 10]];

  const data = {
    v: 2, id: 'fleet-pond-2',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'natural', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['temperate', 'water', 'birds', 'people'],
    sky: { stars: 200, clouds: { n: 4, y: [40, 300], speed: 4 }, sunR: 24, moonR: 18 },
    palette: {
      base: { mud: ['#4a4632', '#36321f'], wood: ['#4e5a34', '#3c4628'], bank: ['#6e7a40', '#55602e'], tl: ['#7d9088', '#5f7462', '#4a5e44', '#6a7a52'] },
      spring: { tl: ['#82968a', '#64806a', '#4e6a46', '#7e9058'] },
      autumn: { wood: ['#6a5a32', '#4e4224'], bank: ['#8a7a42', '#6a5c30'], tl: ['#8e9282', '#7a7656', '#6a5e3a', '#9a7e46'] },
      winter: { wood: ['#5a5446', '#46403a'], bank: ['#8a826a', '#6a6450'], tl: ['#8a8e92', '#6e7276', '#585c5c', '#74706a'] },
    },
    surfaces: [
      { id: 'land', kind: 'wood', rest: true },
      // (round 2) the sedge first: the carr (listed later) wins where they overlap; the water wins over all
      { id: 'fen-r', kind: 'bank', poly: [[2.0, 12.6], [9.0, 12.6], [9.0, 24], [2.0, 24]] },
      { id: 'sedge-n', kind: 'bank', poly: sedgeN },
      { id: 'sedge-e', kind: 'bank', poly: sedgeE },
      { id: 'lineside', kind: 'wood', poly: lineside },
      { id: 'emb', kind: 'verge', path: [[-320, railD(-320)], [320, railD(320)]], width: 16 },
      { id: 'railway', kind: 'rail', path: [[-320, railD(-320)], [320, railD(320)]], width: 9, tracks: 2 },
      { id: 'reeds-n', kind: 'bank', poly: reedsN },
      { id: 'carr-l', kind: 'wood', poly: carrL },
      { id: 'carr-r', kind: 'wood', poly: carrR },
      { id: 'reeds-l', kind: 'bank', poly: reedsL },
      { id: 'reeds-r', kind: 'bank', poly: reedsR },
      { id: 'deck', kind: 'bridge', path: P.deck, width: P.deckW, over: 'water' },
      { id: 'platform', kind: 'bridge', poly: P.platform, over: 'water' },
    ],
    // (round 2) one water region: the pond, the pool and the stream (one reflection bake, not two)
    water: [{ id: 'pond', kind: 'lake', poly: pond, edge: 'natural', rings: false }],
    ground: [], place: [], scatter: [], actors: [], flocks: [],
    flows: [{ id: 'trains', kind: 'train', on: 'railway', timetable: { every: 2 }, mix: { 'rail.train': 1 }, speed: [12, 15], seed: 35 }],
  };
  const Pl = data.place, S = data.scatter, A = data.actors;
  // ---- the woods of Fleet behind the line: layered lobed canopies, Scots pines and birches standing out (far to near)
  const H = cam.horizon;
  data.ground.push(
    { layer: 'horizon', d: F.canopy(H - 4, 81, 10, 30, 0.14, H + 8, 0.05), fill: { lin: [[0, '@tl.0'], [1, '@tl.1']], y1: H - 50, y2: H + 8 } },
    { layer: 'far', d: F.canopy(H + 2, 82, 6, 24, 0.1, H + 10, 0.12), fill: { lin: [[0, '@tl.3'], [1, '@tl.2']], y1: H - 34, y2: H + 10 } });
  const tree = (obj, x, d, k, o) => Pl.push(Object.assign({ obj, at: [x, d], k, anim: false }, o || {}));

  // ---- the boardwalk, its bridge over the stream and the platform (drawn in this camera's perspective)
  Pl.push(...W.placements('structure.fpv-walk-v2'));

  // ---- the carr: alders and willows close round the walk, the stream running out between them; the trunks frame the gap
  tree('tree.pond-alder', -6.4, 10.5, 1.0, { variant: 1 });
  tree('tree.bank-alder', -9.8, 15.5, 1.05, { variant: 0, flip: true });
  tree('tree.bank-willow', -15, 21.5, 0.95, { variant: 1, flip: true });
  tree('tree.pond-birch', -17, 27, 0.9, { variant: 2 });
  tree('tree.pond-alder', 7.4, 10.8, 1.0, { variant: 2, flip: true });
  tree('tree.bank-alder', 10.4, 15.2, 0.95, { variant: 1 });
  tree('tree.pond-birch', 12.2, 20.5, 0.85, { variant: 0, flip: true });
  tree('tree.bank-willow', 18, 23, 0.9, { variant: 0 });
  S.push({ obj: { 'tree.pond-alder': 3, 'tree.bank-willow': 1, 'tree.bank-birch': 2, 'tree.bank-alder': 2 }, on: ['carr-l', 'carr-r'], d: [9, 40], n: 16, dist: 'ground', cluster: { centres: 4, spread: 4 }, gap: 'foot', k: [0.7, 1.0], seed: 31, anim: false });
  // the carr floor under the trees: fern, sedge and rushes, bluebells in spring (no longer carpeting the open fen)
  S.push({ obj: { 'plant.grass-long': 5, 'plant.grass': 4, 'plant.fern': 2 }, on: ['carr-l', 'carr-r'], avoid: ['deck', 'platform'], d: [6, 44], n: 220, dist: 'screen', cluster: { centres: 10, spread: 1.4 }, k: [0.7, 1.1], seed: 32, anim: false, tint: { col: '#8a8a40', k: [0, 0.14] } });
  S.push({ obj: { 'plant.bluebells': 2, 'plant.fern': 1 }, on: ['carr-l', 'carr-r'], d: [8, 24], n: 50, dist: 'screen', cluster: { centres: 5, spread: 2 }, k: [0.9, 1.3], seed: 38, anim: false, species: 1 });
  // (round 2) the sedge bank at the foot of the frame: low tussocks with wet ground between, a reedmace or two
  S.push({ obj: { 'plant.grass-long': 6, 'plant.grass': 2, 'plant.bulrush': 1, 'plant.reed': 1 }, on: ['sedge-n', 'sedge-e'], avoid: ['deck'], d: [5.6, 9.6], n: 90, dist: 'screen', cluster: { centres: 7, spread: 0.4 }, k: [0.55, 0.95], seed: 33, anim: false, species: 1 });
  // (round 2) the reed clumps standing in the pool and the stream (pinned at the water level, as the proof's islands: the
  // engine keeps scattered plants off narrow ground): each a tight stand of Phragmites and reedmace with sedge at its foot,
  // purple loosestrife in summer, open water between them; three tints and quarter-octave scales (few distinct sprites)
  { const r = F.rnd(17), def = (id) => (typeof sceneObj === 'function' ? sceneObj(id) : null), Hm = { 'plant.reed': 2.2, 'plant.bulrush': 1.7, 'plant.grass-long': 0.7, 'plant.canal-view-loosestrife': 1.2 };
    const q = (v) => Math.pow(2, Math.round(Math.log2(v) * 4) / 4);
    // [x, d, rx, rd, n, tint, on the ground (1) or in the water (0)]: the last five are sedge and reed on the narrow banks
    // between the stream and the pools, where the scatter cannot reach (too near the water)
    const clumps = [[-2.7, 11.7, 0.8, 0.35, 11, 0, 0], [-1.3, 14.4, 0.35, 0.2, 5, 1, 0], [-5.0, 16.8, 1.0, 0.45, 13, 2, 0], [-4.6, 23.6, 1.2, 0.5, 13, 0, 0], [-6.2, 28.8, 1.3, 0.55, 12, 1, 0],
      [4.5, 15.6, 0.9, 0.45, 11, 2, 0], [3.4, 13.3, 0.35, 0.2, 5, 1, 0], [4.4, 9.6, 0.5, 0.25, 6, 0, 0],
      [3.4, 11.8, 0.9, 0.4, 9, 1, 1], [5.8, 11.4, 0.8, 0.5, 8, 2, 1], [2.4, 7.4, 0.7, 0.5, 8, 0, 1], [4.6, 7.6, 0.8, 0.5, 7, 1, 1], [-3.4, 7.6, 0.9, 0.4, 7, 2, 1]];
    for (const [cx, cd, rx, rd, n, tk, dry] of clumps) for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()), x = cx + Math.cos(a) * rx * rr, d = cd + Math.sin(a) * rd * rr, u = r();
      const id = (dry ? u < 0.7 : rr > 0.75 && u < 0.5) ? 'plant.grass-long' : dry ? (u < 0.9 ? 'plant.bulrush' : 'plant.canal-view-loosestrife') : u < 0.62 ? 'plant.reed' : u < 0.9 ? 'plant.bulrush' : 'plant.canal-view-loosestrife', D = def(id);
      if (!D) continue;
      const p = proj(x, d, dry ? 0 : cam.water), k = (0.75 + 0.45 * r()) * (1 - 0.3 * rr) * (dry ? 0.8 : 1);
      Pl.push({ obj: id, x: R1(p[0]), y: R1(p[1]), s: R2(q(k * f / d * Hm[id] / D.size[1])), pin: true, variant: Math.floor(r() * 3), flip: r() < 0.5, shadow: false, anim: false, tint: ['#8a7a40', [0, 0.05, 0.1][tk]] });
    } }
  // the fen right of the walk round the pool: reed and reedmace in stands, sedge between
  S.push({ obj: { 'plant.reed': 6, 'plant.bulrush': 2, 'plant.grass-long': 3 }, on: 'fen-r', avoid: ['deck', 'platform'], d: [13, 26], n: 80, dist: 'screen', cluster: { centres: 5, spread: 0.7 }, k: [0.65, 1.2], seed: 39, anim: 'strip', shadow: false, tint: { col: '#8a7a40', k: [0, 0.1] } });
  // the reedbeds round the mouth: tall Phragmites in stands of different heights, reedmace at the water
  S.push({ obj: { 'plant.reed': 7, 'plant.bulrush': 1 }, on: ['reeds-l', 'reeds-r'], d: [20, 80], n: 520, dist: 'screen', cluster: { centres: 18, spread: 4.5 }, k: [0.6, 1.25], seed: 34, anim: 'strip', shadow: false, tint: { col: '#8a7a40', k: [0, 0.12] } });
  // the far shore: reed islands off the embankment, the lineside trees in front of the woods, a long blue treeline
  S.push({ obj: { 'plant.reed': 6, 'plant.bulrush': 1 }, on: 'reeds-n', d: [150, 330], n: 300, dist: 'screen', cluster: { centres: 16, spread: 10 }, k: [0.85, 1.25], seed: 35, anim: false, shadow: false, tint: { col: '#9a8a50', k: [0, 0.12] } });
  S.push({ obj: { 'tree.bank-birch': 3, 'tree.bank-alder': 2, 'tree.bank-oak': 1, 'tree.bank-willow': 1 }, on: 'lineside', d: [150, 330], n: 70, dist: 'ground', cluster: { centres: 9, spread: 12 }, gap: 'foot', seed: 36, anim: false, k: [0.85, 1.4], tint: { col: '#6a7a6a', k: [0, 0.16] } });
  S.push({ obj: { 'tree.far-pine': 2, 'tree.far-birch': 3, 'tree.bank-distant': 2 }, on: 'land', d: [260, 700], n: 90, dist: 'ground', cluster: { centres: 10, spread: 40 }, seed: 37, anim: false, shadow: false, tint: { col: '#7a8a8a', k: [0, 0.16] } });
  // a reed island and reedmace clumps out in the bay: they break the open water into layers (pinned at the water level)
  { const r = F.rnd(7), reedDef = typeof sceneObj === 'function' ? sceneObj('plant.reed') : null, rushDef = typeof sceneObj === 'function' ? sceneObj('plant.bulrush') : null;
    for (const [cx, cd, rx, rd, n] of [[2.4, 34, 1.6, 0.9, 14], [-14, 47, 2.4, 1.0, 10], [16, 52, 2.0, 0.8, 8]]) for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()), x = cx + Math.cos(a) * rx * rr, d = cd + Math.sin(a) * rd * rr, rush = r() < 0.25, def = rush ? rushDef : reedDef;
      if (!def) continue;
      const p = proj(x, d, cam.water), k = (0.7 + 0.45 * r()) * (1 - 0.35 * rr);
      Pl.push({ obj: rush ? 'plant.bulrush' : 'plant.reed', x: R1(p[0]), y: R1(p[1]), s: Math.round(1000 * k * f / d * (rush ? 1.6 : 1.8) / def.size[1]) / 1000,
        pin: true, variant: Math.floor(r() * 3), flip: r() < 0.5, shadow: false, anim: false, tint: ['#8a7a40', R2(r() * 0.1)] });
    } }
  // lilies in the slack water of the pool and the mouth, a few rafts on the pond
  { const r = F.rnd(71); [[-2.4, 14.6, 5], [-5.8, 20.8, 5], [-1.4, 25.4, 4], [4.4, 17.8, 3], [-3.5, 30.5, 4], [5, 40, 5], [-12, 44, 5], [10, 48, 4]].forEach(([x, d, n]) => { for (let i = 0; i < n; i++) Pl.push({ obj: 'water.lily', at: [R2(x + (r() - 0.5) * d * 0.1), R2(d + (r() - 0.5) * d * 0.08)], k: R2(0.8 + r() * 0.6), variant: Math.floor(r() * 3), anim: false }); }); }
  Pl.push({ obj: 'water.fish-ring', at: [-14, 70], k: 1.5, seed: 5, anim: { flicker: { period: 6.2 } } }, { obj: 'water.fish-ring', at: [22, 110], k: 1.8, variant: 1, seed: 9, anim: { flicker: { period: 8.4 } } }, { obj: 'water.fish-ring', at: [-4.6, 20], k: 1, variant: 1, seed: 13, anim: { flicker: { period: 7.3 } } });

  // ---- the kingfisher's stick over the stream and the bird on it; its blue streak down the stream now and then
  Pl.push({ obj: 'bird.kingfisher', at: [-2.6, 11.7], k: 1.7 });
  A.push({ obj: 'bird.kingfisher-flight', ground: [[14, 2.6], [8.8, 4.6], [6, 6.4], [3.4, 8.6], [1, 10.8], [-1.6, 13.4], [-3.6, 17], [-4.4, 21.5], [-5, 26], [-4, 30], [0, 36], [8, 60], [30, 160], [60, 320]], speedM: 7, loop: 'loop', k: 1.3, seed: 41, offset: 0.35 });
  // ---- the moorhen working the stream edge; the heron stalking the shallows at the mouth
  // ---- out on the pond: swans, grebes, mallards and coots
  Pl.push({ obj: 'bird.coot', at: [30, 84], k: 1 }, { obj: 'bird.grebe', at: [-24, 150], k: 1.1, flip: true });
  // ---- a birdwatcher on the platform
  Pl.push({ obj: 'person.birdwatcher', on: 'platform', d: 22, u: 0.3 });

  // ---- swallows skimming the water (spring to early autumn), bats and mist after dusk
  const sw = (pts, sp, s, v, off, seed) => A.push({ obj: 'bird.wp-swallow', layer: 'mid', path: pts, speed: sp, loop: 'fade', s, variant: v, seed, offset: off });
  sw([[-160, 470], [200, 482], [420, 462], [700, 490], [960, 468], [1240, 486], [1760, 470]], 280, 0.55, 0, 0.1, 51);
  sw([[1760, 452], [1380, 466], [1100, 446], [820, 462], [520, 444], [200, 458], [-160, 448]], 250, 0.45, 1, 0.6, 52);
  const bat = (cx, cy, rx, ry, sp, s, v, seed) => {
    const r = F.rnd(seed), pts = [];
    for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2; pts.push([R1(cx + Math.cos(a) * rx * (0.7 + r() * 0.5)), R1(cy + Math.sin(a * 2) * ry * (0.6 + r() * 0.6))]); }
    pts[20] = pts[0];
    A.push({ obj: 'animal.wp-bat', layer: 'near', path: pts, speed: sp, loop: 'loop', s, variant: v, seed, offset: R2(r()) });
  };
  bat(760, 300, 240, 70, 150, 1, 0, 61); bat(1100, 360, 200, 60, 170, 0.9, 1, 62); bat(520, 380, 160, 50, 140, 0.8, 0, 63);
  // (round 2) every mist bank one sprite (one variant, one size, flipped or not): it was the largest sprite memory here
  Pl.push({ obj: 'sky.wp-mist', x: 620, y: 432, s: 1, layer: 'mid', variant: 0, pin: true, anim: false },
    { obj: 'sky.wp-mist', x: 1120, y: 430, s: 1, layer: 'mid', variant: 0, flip: true, pin: true, anim: false });
  A.push({ obj: 'sky.wp-mist', layer: 'mid', path: [[-60, 434], [1660, 434]], speed: 8, loop: 'pingpong', s: 1, variant: 0, seed: 64, offset: 0.3 });
  data.flocks.push({ obj: 'bird.goose-flight', n: 5, area: [200, 120, 1400, 300], speed: 30, s: 0.3, seed: 65, layer: 'horizon' });

  // ---- framing: the ivy-clad alder up the left edge, its bough over the top; ferns at the foot of the frame
  Pl.push({ obj: 'tree.fpv-alder-trunk', x: -70, y: 930, s: 1.02, pin: true, layer: 'front', shadow: false, anim: { sway: { k: 0.6 } } });
  Pl.push({ obj: 'plant.bulrush', x: 1440, y: 950, s: 2.3, pin: true, layer: 'front', shadow: false, anim: false, flip: true },
    { obj: 'plant.fern', x: 1610, y: 960, s: 2.0, pin: true, layer: 'front', shadow: false, anim: false },
    { obj: 'plant.grass-long', x: 1250, y: 940, s: 2.2, pin: true, layer: 'front', shadow: false, anim: false });
  // ---- the movers (10 Oct, the animation overhaul): behaviour presets at their real size (SCENE_FPV.life), after every placement
  A.push(...F.life(data, [
    { obj: 'bird.moorhen', preset: 'moorhen', route: [[-3.4, 18], [-4.2, 21.5], [-4.9, 25]], seed: 42, offset: 0.2 },
    { obj: 'bird.wp-heron-stalk', preset: 'heron-stalk', route: [[-4.2, 25.4], [-4.9, 27], [-5.6, 28.6]], seed: 43, offset: 0.3 },
    { obj: 'bird.swan', preset: 'swan', route: [[-30, 120], [-6, 112], [20, 118]], seed: 44 },
    { obj: 'bird.swan', preset: 'swan', route: [[-27, 124], [-3, 116], [23, 122]], seed: 45, offset: 0.06 },
    { obj: 'bird.grebe', preset: 'grebe', route: [[12, 80], [-4, 76]], seed: 46, offset: 0.5, acts: ['look', 'preen', 'look'] },
    { obj: 'bird.mallard', preset: 'duck', route: [[4, 33], [-1, 31.5], [-5, 33]], seed: 47, offset: 0.1 },
    { obj: 'bird.mallard', preset: 'duck', route: [[4.8, 33.5], [-0.2, 32], [-4.2, 33.5]], variant: 1, seed: 48, offset: 0.45 },
    { obj: 'bird.coot', preset: 'coot', route: [[-40, 92], [-22, 98], [-8, 94]], seed: 49, offset: 0.7, acts: ['look', 'preen', 'look'] },
  ]));
  return data;
}
