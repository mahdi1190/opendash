/* ============================================================
   COMPOSED SCENE (v2, by hand) uk-south-east / Fleet Pond, view 1 (wide): Sandy Bay.
   docs/dev/SCENE_ENGINE_V2.md. Redrawn on the v2 engine (the hand-drawn art stays in the 72 file as legacySvg).

   The view: from the little sandy beach of Sandy Bay on the north shore, just below the railway, looking south-south-west
   (heading 192) across the whole width of the pond into the sun. The beach curves away to the left round the bay under
   the heath bank, with its Scots pines and birches; a fallen pine lies at the top of the sand. Out on the open water:
   reed islands, dinghies of the sailing club, and the long wooded south shore with the Gelvert reedbed at its west end.
   Framing: a Scots pine bough over the top right, the pine's trunk at the right edge, gorse and marram-like grass on the
   bank. The life: Canada geese grazing the beach and swimming off it, a mute swan pair close inshore, black-headed gulls,
   coots and great crested grebes, a dog walker along the sand, swallows over the water in summer, bats and mist after dusk.
     https://www.hart.gov.uk/fleet-pond-local-nature-reserve   https://www.fleetpondsociety.co.uk
   PURE: defines sceneUkFleetPondV1() -> the scene data, called once, lazily.
   ============================================================ */
function sceneUkFleetPondV1() {
  const F = SCENE_FPV, R2 = v => Math.round(v * 100) / 100, R1 = v => Math.round(v * 10) / 10;
  const cam = { eye: 1.65, fov: 66, horizon: 448, x0: 1050, heading: 192, lat: 51.2906, lon: -0.8184, water: -0.12 };
  const J = F.proj(cam), f = J.f, proj = J.p, H = cam.horizon;
  // the waterline of the bay: from the near right (by the camera) sweeping away to the left round under the heath bank
  const shore = F.line([[-1.1, 2.6], [-1.4, 4.2], [-1.9, 6], [-2.9, 8.6], [-4.2, 11.2], [-5.8, 14.3], [-8, 18.5], [-11, 23.7], [-16, 32], [-23, 42], [-34, 54], [-50, 68], [-80, 82], [-140, 98], [-220, 108]], 1.8);
  // the far (south) shore, ragged, with the Gelvert reedbed pushing out at its west (right) end
  const rs = F.rnd(5), far = [];
  for (let x = -420; x <= 420; x += 15) far.push([x, R1(330 + 40 * Math.sin(x / 90) - (x > 120 ? (x - 120) * 0.45 : 0) + rs() * 14)]);
  // the pond: the bay's waterline, round by the far left, along the far shore, back by the near right (one closed ring)
  const pondRing = shore.concat([[-420, 112]], far, [[420, 2.6]]);
  // the beach: the sand between the waterline and the bank (wider in the middle of the bay)
  const bankLine = F.line([[-3.1, 2.6], [-3.4, 4.2], [-4.0, 6], [-5.0, 8], [-6.2, 9.8], [-7.6, 12], [-9.2, 14.3], [-11.4, 17.4], [-14.4, 21], [-19, 27], [-27, 35.7], [-39, 46], [-57, 58], [-86, 70], [-142, 88], [-220, 104]], 1.4);
  const beach = shore.concat(bankLine.slice().reverse());
  // the heath bank behind the beach, up to the woods (pines, birch, gorse, bracken)
  const bank = bankLine.concat([[-220, 160], [-40, 160], [-20, 60], [-8, 4.2]]);
  // the far shore's reedbeds (west end: the Gelvert marsh) and the wood behind
  const reedsS = far.filter(p => p[0] > 60).concat(far.filter(p => p[0] > 60).reverse().map(([x, d]) => [x, d + 18 + (x > 200 ? 20 : 0)]));

  const data = {
    v: 2, id: 'fleet-pond-1',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'natural', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['temperate', 'water', 'birds', 'people'],
    sky: { stars: 200, clouds: { n: 5, y: [40, 330], speed: 4 }, sunR: 24, moonR: 18 },
    palette: {
      base: { mud: ['#b49a70', '#9a8260'], beach: ['#d8c49a', '#c4ab7c'], sand: ['#d8c49a', '#c4ab7c'], heath: ['#7a7450', '#5c5636'], bank: ['#7a8650', '#56602e'], tl: ['#7d9088', '#5f7462', '#4a5e44', '#6a7a52'] },
      spring: { tl: ['#82968a', '#64806a', '#4e6a46', '#7e9058'] },
      autumn: { heath: ['#86704c', '#5e4a30'], bank: ['#868450', '#5e5a32'], tl: ['#8e9282', '#7a7656', '#6a5e3a', '#9a7e46'] },
      winter: { beach: ['#d4ccb8', '#b8ae98'], heath: ['#7c7466', '#5a5244'], tl: ['#8a8e92', '#6e7276', '#585c5c', '#74706a'] },
    },
    surfaces: [
      { id: 'land', kind: 'wood', rest: true },
      { id: 'bank', kind: 'heath', poly: bank },
      { id: 'beach', kind: 'beach', poly: beach },
    // the wet sand at the water's edge: a ragged strip, darker, where the geese leave their prints
    { id: 'wet', kind: 'mud', poly: F.fringe(shore.filter((p, i) => i % 3 === 0), 0.7, 1, 17) },
      { id: 'reeds-s', kind: 'bank', poly: reedsS },
    { id: 'fringe-s', kind: 'bank', poly: far.concat(far.slice().reverse().map(([x, d]) => [x, d + 9])) },
    ],
    water: [{ id: 'pond', kind: 'lake', poly: pondRing, edge: 'none', ripple: 0.3, mirror: 0.7, rings: true }],
    ground: [], place: [], scatter: [], actors: [], flocks: [],
  };
  const Pl = data.place, S = data.scatter, A = data.actors;
  // ---- the south shore's woods: layered lobed canopies (far to near), oaks, birches and pines over Fleet
  data.ground.push(
    { layer: 'horizon', d: F.canopy(H - 8, 91, 18, 46, 0.07, H + 8, 0.06), fill: { lin: [[0, '@tl.0'], [1, '@tl.1']], y1: H - 60, y2: H + 8 } },
    { layer: 'far', d: F.canopy(H + 1, 92, 10, 44, 0.05, H + 8, 0.14), fill: { lin: [[0, '@tl.3'], [1, '@tl.2']], y1: H - 40, y2: H + 8 } });
  S.push({ obj: { 'tree.far-birch': 3, 'tree.far-pine': 2, 'tree.bank-distant': 3, 'tree.bank-oak': 2, 'tree.bank-willow': 1 }, on: 'land', d: [300, 560], n: 190, dist: 'ground', cluster: { centres: 16, spread: 22 }, gap: 'foot', k: [1.1, 1.8], seed: 31, anim: false, shadow: false, tint: { col: '#7a8a8a', k: [0, 0.16] } });
  S.push({ obj: { 'plant.reed': 5, 'plant.bulrush': 1, 'plant.grass-long': 1 }, on: 'fringe-s', d: [250, 420], n: 260, dist: 'screen', cluster: { centres: 18, spread: 8 }, seed: 37, anim: false, shadow: false, tint: { col: '#9a8a50', k: [0, 0.12] } });
  S.push({ obj: { 'plant.reed': 6, 'plant.bulrush': 1 }, on: 'reeds-s', d: [200, 420], n: 360, dist: 'screen', cluster: { centres: 12, spread: 10 }, seed: 32, anim: false, shadow: false, tint: { col: '#9a8a50', k: [0, 0.12] } });

  // ---- the heath bank: Scots pines and birches over the bay, gorse, heather and bracken under them
  const tree = (obj, x, d, k, o) => Pl.push(Object.assign({ obj, at: [x, d], k, anim: false }, o || {}));
  tree('tree.pool-pine', -9.4, 12.6, 1.1, { variant: 0 });
  tree('tree.birch-heath', -12.6, 16.8, 0.85, { variant: 1, flip: true });
  tree('tree.pool-pine', -16.2, 21.6, 1.0, { variant: 2, flip: true });
  tree('tree.pool-pine', -22.5, 28.5, 1.15, { variant: 1 });
  tree('tree.birch-heath', -29, 36, 0.95, { variant: 0 });
  tree('tree.pool-oak', -42, 47, 1.1, { variant: 1 });
  tree('tree.pool-pine', -60, 60, 1.2, { variant: 0 });
  tree('tree.birch-heath', -50, 54, 0.8, { variant: 2, flip: true });
  S.push({ obj: { 'tree.pool-pine': 3, 'tree.birch-heath': 2, 'tree.pool-oak': 1, 'tree.pool-birch': 1 }, on: 'bank', d: [14, 120], n: 24, dist: 'ground', cluster: { centres: 5, spread: 8 }, gap: 'foot', k: [0.8, 1.2], seed: 33, anim: false });
  S.push({ obj: { 'plant.gorse': 3, 'plant.heather': 4, 'plant.bracken': 2, 'plant.grass-long': 3 }, on: 'bank', d: [4.5, 70], n: 380, dist: 'screen', cluster: { centres: 12, spread: 2.5 }, gap: 'foot', k: [0.75, 1.3], seed: 34, anim: false, tint: { col: '#8a7a40', k: [0, 0.12] } });
  // the top of the beach: grass tufts and pebbles in drifts, a fallen pine, a few pine cones and stones down the sand
  S.push({ obj: { 'plant.grass-long': 3, 'plant.grass': 3, 'plant.wildflowers': 1 }, on: 'beach', d: [4.5, 40], n: 170, dist: 'screen', cluster: { centres: 7, spread: 0.8 }, k: [0.6, 1.0], seed: 35, anim: false, species: 1 });
  // pebbles and reed litter in drifts along the sand (the strand line), small
  S.push({ obj: { 'ground.leaves': 2, 'plant.grass': 1 }, on: 'beach', d: [4.6, 30], n: 60, dist: 'screen', cluster: { centres: 9, spread: 0.6 }, k: [0.5, 0.8], seed: 36, anim: false, shadow: false, species: 1 });
  Pl.push({ obj: 'ground.log', at: [-8.4, 15.4], k: 0.9, variant: 0 }, { obj: 'ground.log', at: [-13, 22.6], k: 0.9, variant: 1, flip: true });

  // ---- reed islands out in the bay (pinned at the water level: they break the open water into layers)
  { const r = F.rnd(7), reedDef = typeof sceneObj === 'function' ? sceneObj('plant.reed') : null, rushDef = typeof sceneObj === 'function' ? sceneObj('plant.bulrush') : null;
    for (const [cx, cd, rx, rd, n] of [[1.6, 18, 1.4, 0.6, 14], [9, 34, 2.6, 1.0, 12], [-12, 80, 5, 1.6, 12], [44, 120, 6, 2, 12]]) for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()), x = cx + Math.cos(a) * rx * rr, d = cd + Math.sin(a) * rd * rr, rush = r() < 0.25, def = rush ? rushDef : reedDef;
      if (!def) continue;
      const p = proj(x, d, cam.water), k = (0.75 + 0.45 * r()) * (1 - 0.35 * rr);
      Pl.push({ obj: rush ? 'plant.bulrush' : 'plant.reed', x: R1(p[0]), y: R1(p[1]), s: Math.round(1000 * k * f / d * (rush ? 1.6 : 1.8) / def.size[1]) / 1000,
        pin: true, variant: Math.floor(r() * 3), flip: r() < 0.5, reflect: true, shadow: false, anim: false, tint: ['#8a7a40', R2(r() * 0.1)] });
    } }

  // ---- (round 2) the landmark in the foreground water: a Scots pine blown down off the top of the beach, lying out across the
  // shallows 8 m off, its root plate on the sand; cormorants drying their wings on it (tree.fpv-fallen-pine, drawn at one depth)
  { const dF = 8, xm = -0.2, a = proj(xm, dF, 0);
    Pl.push({ obj: 'tree.fpv-fallen-pine', x: R1(a[0]), y: R1(a[1]), s: R2(f / (dF * 100)), pin: true, layer: 'fore', shadow: false, anim: false }); }

  // ---- the life: geese grazing the sand and swimming off it, a swan pair inshore, gulls, coots, grebes, dinghies
  Pl.push({ obj: 'bird.goose', at: [-3.8, 7.6], k: 0.95, variant: 1 }, { obj: 'bird.goose', at: [-6.6, 13], k: 0.95, flip: true },
    { obj: 'bird.goose', at: [-10.6, 19.4], k: 1 }, { obj: 'bird.goose', at: [-15.6, 25.4], k: 1, variant: 1, flip: true });
  Pl.push({ obj: 'bird.gull', at: [5, 26], k: 1, flip: true }, { obj: 'bird.gull', at: [8, 33], k: 1, variant: 1 }, { obj: 'bird.coot', at: [-6, 64], k: 1 }, { obj: 'bird.grebe', at: [40, 110], k: 1.1 });
  A.push({ obj: 'boat.dinghy', ground: [[-60, 170], [20, 150], [90, 175]], speedM: 1.2, loop: 'pingpong', variant: 0, seed: 47, offset: 0.2 });
  A.push({ obj: 'boat.dinghy', ground: [[70, 230], [-20, 210], [-100, 240]], speedM: 1.0, loop: 'pingpong', variant: 2, seed: 48, offset: 0.55 });
  Pl.push({ obj: 'boat.dinghy', at: [-40, 260], k: 1, variant: 1, flip: true });
  // a dog walker along the sand, out and back
  // swallows over the water, bats and mist after dusk, geese passing high
  const sw = (pts, sp, s, v, off, seed) => A.push({ obj: 'bird.wp-swallow', layer: 'fore', path: pts, speed: sp, loop: 'fade', s, variant: v, seed, offset: off });
  sw([[-160, 560], [240, 590], [520, 548], [820, 600], [1100, 566], [1400, 610], [1760, 580]], 300, 0.8, 0, 0.1, 51);
  sw([[1760, 520], [1400, 540], [1100, 506], [820, 532], [500, 500], [200, 524], [-160, 506]], 270, 0.6, 1, 0.55, 52);
  const bat = (cx, cy, rx, ry, sp, s, v, seed) => {
    const r = F.rnd(seed), pts = [];
    for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2; pts.push([R1(cx + Math.cos(a) * rx * (0.7 + r() * 0.5)), R1(cy + Math.sin(a * 2) * ry * (0.6 + r() * 0.6))]); }
    pts[20] = pts[0];
    A.push({ obj: 'animal.wp-bat', layer: 'mid', path: pts, speed: sp, loop: 'loop', s, variant: v, seed, offset: R2(r()) });
  };
  bat(380, 360, 200, 60, 150, 0.9, 0, 61); bat(800, 400, 260, 70, 170, 1, 1, 62); bat(1200, 330, 180, 60, 140, 0.8, 0, 63);
  // (round 2) every mist bank one sprite (one variant, one size, flipped or not): it was the largest sprite memory here
  Pl.push({ obj: 'sky.wp-mist', x: 700, y: H + 2, s: 1.1, layer: 'mid', variant: 0, pin: true, anim: false },
    { obj: 'sky.wp-mist', x: 1260, y: H + 4, s: 1.1, layer: 'mid', variant: 0, flip: true, pin: true, anim: false });
  A.push({ obj: 'sky.wp-mist', layer: 'mid', path: [[1660, H + 10], [-60, H + 10]], speed: 7, loop: 'pingpong', s: 1.1, variant: 0, seed: 64, offset: 0.4 });
  data.flocks.push({ obj: 'bird.goose-flight', n: 7, area: [200, 120, 1500, 330], speed: 34, s: 0.32, seed: 65, layer: 'horizon' });

  // ---- framing: the pine's trunk up the right edge and its bough over the top right; gorse and grass in the near corners
    Pl.push({ obj: 'tree.wp-pine-bough', x: 1640, y: -26, s: 0.95, layer: 'front', pin: true, flip: true, anim: { sway: { k: 1 } } });
  Pl.push({ obj: 'plant.gorse', x: -60, y: 930, s: 1.6, pin: true, layer: 'front', shadow: false, anim: false },
    { obj: 'plant.grass-long', x: 150, y: 940, s: 2, pin: true, layer: 'front', shadow: false, anim: false },
    { obj: 'plant.bulrush', x: 1560, y: 960, s: 2.6, pin: true, layer: 'front', shadow: false, anim: false, flip: true },
    { obj: 'plant.reed', x: 1660, y: 970, s: 2.9, pin: true, layer: 'front', shadow: false, anim: false },
    { obj: 'plant.reed', x: 1470, y: 980, s: 2.2, pin: true, layer: 'front', shadow: false, anim: false, variant: 2 });
  // ---- the movers (10 Oct, the animation overhaul): behaviour presets at their real size (SCENE_FPV.life), after every placement
  A.push(...F.life(data, [
    { obj: 'bird.goose', preset: 'goose-swim', route: [[1, 20], [6, 23], [11, 22]], seed: 41, offset: 0.2 },
    { obj: 'bird.goose', preset: 'goose-swim', route: [[0, 21.4], [5, 24.4], [10, 23.4]], variant: 1, seed: 42, offset: 0.24 },
    { obj: 'bird.swan', preset: 'swan', route: [[3.0, 12.4], [4.6, 13.2], [6.2, 14.2]], seed: 43 },
    { obj: 'bird.swan', preset: 'swan', route: [[3.9, 11.8], [5.5, 12.6], [7.1, 13.6]], seed: 44, offset: 0.08 },
    { obj: 'bird.mallard', preset: 'duck', route: [[-1.4, 15.6], [0.2, 16.8], [1.8, 16]], seed: 53, offset: 0.3 },
    { obj: 'bird.mallard', preset: 'duck', route: [[-0.9, 16.2], [0.7, 17.4], [2.3, 16.6]], variant: 1, seed: 54, offset: 0.32 },
    { obj: 'bird.coot', preset: 'coot', route: [[-8, 46], [4, 49], [16, 47]], seed: 45, offset: 0.4 },
    { obj: 'bird.grebe', preset: 'grebe', route: [[30, 60], [12, 64]], seed: 46, offset: 0.6 },
    { obj: 'person.dog-walker', preset: 'dog-walker', route: [[-3.2, 5.2], [-5.2, 10.2], [-8.6, 15.4], [-13.4, 22.4], [-20, 30]], seed: 49, offset: 0.35 },
    { obj: 'person.family', preset: 'stroll', speedM: 0.8, route: [[-22, 33], [-32, 42]], seed: 50, offset: 0.7 },
  ]));
  return data;
}
