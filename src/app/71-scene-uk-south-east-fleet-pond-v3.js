/* ============================================================
   COMPOSED SCENE (v2, by hand) uk-south-east / Fleet Pond, view 3 (the heath and the reedbed, morning).
   docs/dev/SCENE_ENGINE_V2.md. Redrawn on the v2 engine (the hand-drawn art stays in the 72 file as legacySvg).

   The view: from the sandy heath rise on the reserve's western edge, among Scots pines, heather and gorse, looking east
   (heading 96) into the morning sun over the great west reedbed and down the length of the pond. A sandy path drops off
   the brow; below, the reedbed boardwalk runs out through the Phragmites toward the open water; mist lies on the reeds
   and the water at dawn; the far east shore's oaks and pines close the view.
   Framing: a Scots pine up the left edge with its bough over the top left, a silver birch on the right, heather, gorse
   and bracken at the foot of the frame, a bench on the brow.
   The life: a pair of roe deer at the reed edge, a stonechat on the gorse and a Dartford warbler, a walker going down
   to the boardwalk, swans and geese out on the water, a skein of geese across the sunrise, swallows in summer, bats
   and mist after dusk.
     https://www.hart.gov.uk/fleet-pond-local-nature-reserve   https://www.fleetpondsociety.co.uk
   PURE: defines sceneUkFleetPondV3() -> the scene data, called once, lazily.
   ============================================================ */
function sceneUkFleetPondV3() {
  const F = SCENE_FPV, R2 = v => Math.round(v * 100) / 100, R1 = v => Math.round(v * 10) / 10;
  // the camera stands on the heath rise, some 2.5 m above the reedbed (the eye 4.2 m over the reedbed's level, the ground plane)
  const cam = { eye: 4.2, fov: 66, horizon: 380, heading: 96, lat: 51.2884, lon: -0.8296, water: -0.4 };
  const J = F.proj(cam), f = J.f, H = cam.horizon;
  // the reedbed below, from the foot of the slope out to the open water; the water from about 130 m to the far east shore
  // (round 2) bays cut back into the reedbed from the open water: the reed edge is not one even line; [centre x, half width,
  // how near they reach]
  const chans = [[46, 16, 98], [-122, 18, 100], [-240, 20, 118], [268, 16, 112]];
  const rw = F.rnd(5), edge = [];
  for (let x = -420; x <= 420; x += 6) {
    let d = 128 + 22 * Math.sin(x / 70 + 1) + rw() * 10 + Math.max(0, -x - 60) * 0.4;
    for (const [cx, w, dt] of chans) { const c = cx + 4 * Math.sin(d / 11), t = Math.abs(x - c) / w; if (t < 1) d = Math.min(d, dt + (d - dt) * Math.pow(t, 1.4)); }
    edge.push([x, R1(d)]);
  }
  const far = [];
  for (let x = -700; x <= 700; x += 20) far.push([x, R1(640 + 50 * Math.sin(x / 140) + rw() * 20)]);
  const pond = edge.concat(far.slice().reverse());
  const reeds = [[-420, 21], [420, 21]].concat(edge.slice().reverse());
  // the boardwalk across the reedbed toward the water, and the sandy path off the brow
  // (round 3) open water inside the reedbed: a channel winding back from the bay at x 46, a second from the reed edge to a
  // small mere behind the scrape, glimpsed from the brow between the stands of reed in front of it
  const ribbon = (C, w0, w1, seed) => { const L = F.line(C, 4), r = F.rnd(seed), A = [], B = []; L.forEach(([x, d], i) => { const t = i / (L.length - 1), w = (w0 + (w1 - w0) * t) * (0.75 + r() * 0.5) / 2; A.push([R1(x - w), d]); B.push([R1(x + w), d]); }); return A.concat(B.reverse()); };
  const chanA = ribbon([[47, 104], [41, 95], [45, 87], [37, 78], [31, 70], [33, 61]], 7, 2.6, 71);
  const chanB = ribbon([[-46, 140], [-38, 126], [-42, 114], [-33, 104], [-28, 94], [-24, 88]], 6, 3, 72);
  const mere = F.loop([[-30, 80], [-21, 76], [-12, 79], [-9, 86], [-14, 93], [-24, 95], [-31, 89]], 3, 1.6, 73);
  const walk = F.line([[2.6, 25], [4.6, 40], [3.4, 56], [6.2, 74], [11, 92], [13, 112], [16, 126]], 1.5);
  const path = F.line([[0.4, 9], [-0.6, 11.5], [0.4, 14], [1.8, 17], [2.4, 20.5], [2.6, 25]], 0.5);

  const data = {
    v: 2, id: 'fleet-pond-3',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    ground: { fills: [] },
    at: 'morning', season: 'auto', setting: 'natural', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['temperate', 'water', 'birds', 'people', 'animals'],
    sky: { stars: 220, clouds: { n: 5, y: [40, 300], speed: 4 }, sunR: 24, moonR: 18 },
    palette: {
      base: { mud: ['#6a5e3e', '#4e4430'], bank: ['#7e7c4a', '#5e5e34'], heath: ['#6a6a40', '#545632'], path: ['#d2bc8e', '#b49a6c'], bridge: ['#8a7a62', '#6a5a46'], tl: ['#7d9088', '#5f7462', '#4a5e44', '#6a7a52'] },
      spring: { bank: ['#7e8a4a', '#5e6a34'], tl: ['#82968a', '#64806a', '#4e6a46', '#7e9058'] },
      autumn: { bank: ['#9a8650', '#76663a'], heath: ['#86704c', '#5e4a30'], tl: ['#8e9282', '#7a7656', '#6a5e3a', '#9a7e46'] },
      winter: { bank: ['#9a9276', '#7a745c'], heath: ['#7c7466', '#5a5244'], tl: ['#8a8e92', '#6e7276', '#585c5c', '#74706a'] },
    },
    surfaces: [
      { id: 'land', kind: 'wood', rest: true },
      { id: 'heath', kind: 'heath', poly: F.loop([[-60, 6], [60, 6], [60, 23], [36, 27.5], [24, 23.2], [14, 29], [7, 25.6], [-2, 25.5], [-14, 27], [-30, 23], [-60, 24]], 2, 1.5, 19) },
      { id: 'reeds', kind: 'bank', poly: reeds },
      // (round 2) wet clearings in the near reedbed (sedge and bare peat): gaps in the wall of reed; the first opens the view
      // from the brow down onto the scrape
      { id: 'clear-a', kind: 'mud', poly: F.loop([[-27, 24], [-14, 22.5], [-6.5, 25], [-6, 31], [-7, 36.4], [-15, 35], [-24, 36.4], [-28, 31]], 1.5, 1.2, 41) },
      { id: 'clear-e', kind: 'mud', poly: F.loop([[7, 30.5], [12, 28.6], [17, 30], [15.5, 33.6], [9, 33.2]], 1.2, 1.0, 46) },
      { id: 'clear-b', kind: 'mud', poly: F.loop([[12, 37], [20, 36], [25, 40], [19, 43.5], [12, 41.5]], 1.5, 1.2, 42) },
      { id: 'clear-d', kind: 'mud', poly: F.loop([[26, 56], [36, 55], [40, 60], [31, 63], [24, 60]], 1.5, 1.2, 44) },
      { id: 'carr', kind: 'wood', poly: [[-420, 30], [-60, 30], [-48, 70], [-40, 120], [-60, 150], [-420, 150]] },
      { id: 'path', kind: 'path', path, width: 1.1 },
      { id: 'walk', kind: 'bridge', path: walk, width: 1.4 },
    ],
    water: [{ id: 'pond', kind: 'lake', poly: pond, edge: 'natural', ripple: 0.25, mirror: 0.75 },
      // (round 2) a scrape in the near reedbed below the brow, open water among the reeds (the reserve keeps such pools open)
      { id: 'scrape', kind: 'pond', poly: F.loop([[-23, 36], [-15, 34.5], [-8.5, 36.5], [-7.5, 40.5], [-11, 44.5], [-19, 46], [-25, 42]], 1.5, 1.4, 45), edge: 'natural', ripple: 0.12, mirror: 0.8, rings: true },
      { id: 'chan-a', kind: 'pond', poly: chanA, edge: 'natural', ripple: 0.15, mirror: 0.8 },
      { id: 'chan-b', kind: 'pond', poly: chanB, edge: 'natural', ripple: 0.15, mirror: 0.8 },
      { id: 'mere', kind: 'pond', poly: mere, edge: 'natural', ripple: 0.15, mirror: 0.8, rings: true }],
    place: [], scatter: [], actors: [], flocks: [],
  };
  const Pl = data.place, S = data.scatter, A = data.actors;
  // ---- the far east shore: layered lobed canopies with pines (far to near), then trees on the land beyond the water
  const g = [
    { layer: 'horizon', d: F.canopy(H - 4, 71, 12, 34, 0.05, H + 8, 0.05), fill: { lin: [[0, '@tl.0'], [1, '@tl.1']], y1: H - 46, y2: H + 8 } },
    { layer: 'far', d: F.canopy(H + 1, 72, 8, 26, 0.03, H + 8, 0.12), fill: { lin: [[0, '@tl.3'], [1, '@tl.2']], y1: H - 30, y2: H + 8 } },
  ];
  data.ground.fills = g;
  S.push({ obj: { 'tree.far-birch': 3, 'tree.far-pine': 2, 'tree.bank-distant': 3, 'tree.bank-oak': 1 }, on: 'land', d: [620, 1000], n: 90, dist: 'ground', cluster: { centres: 10, spread: 50 }, k: [1.0, 1.4], seed: 31, anim: false, shadow: false, tint: { col: '#7a8a8a', k: [0, 0.16] } });

  // ---- the reedbed: Phragmites from the foot of the slope to the water, in stands of different heights with gaps (round 2:
  // tighter clusters, a wider spread of sizes; wet clearings and the channels break it), reedmace at the water's edge
  S.push({ obj: { 'plant.reed': 8, 'plant.bulrush': 1 }, on: 'reeds', avoid: ['walk'], d: [22, 70], n: 580, dist: 'screen', cluster: { centres: 18, spread: 3.4 }, k: [0.6, 1.6], seed: 32, anim: 'strip', shadow: false, tint: { col: '#8a7a40', k: [0, 0.14] } });
  S.push({ obj: { 'plant.grass-long': 4, 'plant.bulrush': 1, 'plant.grass': 2 }, on: ['clear-a', 'clear-b', 'clear-d', 'clear-e'], d: [26, 66], n: 110, dist: 'screen', cluster: { centres: 10, spread: 1.0 }, k: [0.5, 0.9], seed: 40, anim: false, shadow: false });
  // (round 3) beyond 60 m the bed in receding rows, not one wall: each band its own height, density and tone (the near rows
  // the reed's own colour, dark stands of older reed between, then hazing toward the sky's grey as the bed goes away), dense
  // reed masses (plant.yg-reedbed) filling the rows so no bare ground shows between the stems; reedmace along the channels
  S.push({ obj: { 'plant.reed': 6, 'plant.yg-reedbed': 3, 'plant.bulrush': 1 }, on: 'reeds', avoid: ['walk'], d: [62, 86], n: 240, dist: 'screen', cluster: { centres: 20, spread: 7 }, k: [1.0, 1.45], seed: 38, anim: false, shadow: false, tint: { col: '#c8a850', k: [0.17, 0.19] } });
  S.push({ obj: { 'plant.reed': 5, 'plant.yg-reedbed': 3 }, on: 'reeds', avoid: ['walk'], d: [80, 104], n: 190, dist: 'screen', cluster: { centres: 9, spread: 6 }, k: [0.85, 1.2], seed: 44, anim: false, shadow: false, tint: { col: '#4a5230', k: [0.36, 0.38] } });
  S.push({ obj: { 'tree.bank-willow': 3, 'tree.pond-birch': 2, 'tree.bank-alder': 2 }, on: 'reeds', d: [45, 150], n: 16, dist: 'ground', cluster: { centres: 6, spread: 6 }, gap: 'foot', k: [0.4, 0.8], seed: 33, anim: false });
  // the alder carr along the reedbed's north side (left), a dark wall the reeds stand against
  S.push({ obj: { 'tree.bank-alder': 3, 'tree.bank-willow': 1, 'tree.pond-birch': 1 }, on: 'carr', d: [40, 160], n: 14, dist: 'ground', cluster: { centres: 3, spread: 5 }, gap: 'foot', k: [0.8, 1.1], seed: 39, anim: false });

  // (round 3) scrub islands standing out of the bed: sallow, birch and willow on the drier hummocks, breaking the reeds' top
  // line and the water's edge behind them (sallow scrub is what the reserve keeps cutting back from the reedbed)
  for (const [x, d, set] of [[-14, 104, [['tree.wyv-far-sallow', 0, 0, 1.0], ['tree.bank-alder', 3, 2, 0.8]]], [58, 92, [['tree.wyv-far-sallow', 0, 0, 1.1], ['tree.bank-willow', -4, 3, 0.8]]],
    [20, 128, [['tree.bank-alder', 0, 0, 0.95], ['tree.wyv-far-sallow', 4, 1, 0.9], ['tree.wyv-far-sallow', -4, 2, 0.8]]], [-4, 132, [['tree.wyv-far-sallow', 0, 0, 1.0], ['tree.bank-willow', 5, 2, 0.9]]], [82, 140, [['tree.wyv-far-sallow', 0, 0, 0.9]]]])
    for (const [obj, dx, dd, k] of set) Pl.push({ obj, at: [x + dx, d + dd], k, anim: false, variant: Math.abs(x + dx) % 2, flip: (x + dd) % 2 === 0 });

  // ---- the heath rise: heather and gorse in clumps, bracken, grass, birch scrub; pines and a birch framing the view
  const tree = (obj, x, d, k, o) => Pl.push(Object.assign({ obj, at: [x, d], k, anim: false }, o || {}));
  tree('tree.pool-pine', -8.6, 13.6, 1.0, { variant: 0 });
  tree('tree.pool-pine', -14, 21, 0.95, { variant: 2, flip: true });
  tree('tree.birch-heath', 9.4, 14.6, 0.85, { variant: 1, flip: true });
  tree('tree.pool-pine', 14, 17, 1.05, { variant: 1 });
  tree('tree.birch-heath', -16, 22, 0.8, { variant: 2 });
  S.push({ obj: { 'plant.heather': 8, 'plant.grass-long': 3, 'plant.bracken': 1, 'plant.grass': 3 }, on: 'heath', avoid: ['path'], d: [9, 28], n: 820, dist: 'screen', cluster: { centres: 18, spread: 1.2 }, k: [0.8, 1.15], seed: 34, anim: false, tint: { col: '#8a7a40', k: [0, 0.12] } });
  S.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1, 'plant.heather': 1 }, on: 'path', d: [9, 20], n: 26, dist: 'screen', cluster: { centres: 5, spread: 0.3 }, k: [0.4, 0.7], seed: 35, anim: false, species: 1 });
  // (round 3) the far rows of the bed (after the heath's rules, so the heath keeps its own layout): hazing as they go
  S.push({ obj: { 'plant.reed': 6, 'plant.bulrush': 1 }, on: 'reeds', avoid: ['walk'], d: [100, 128], n: 200, dist: 'screen', cluster: { centres: 18, spread: 10 }, k: [0.9, 1.25], seed: 48, anim: false, shadow: false, tint: { col: '#a6a898', k: [0.3, 0.32] } });
  S.push({ obj: { 'plant.reed': 5, 'plant.bulrush': 1 }, on: 'reeds', avoid: ['walk'], d: [124, 165], n: 200, dist: 'screen', cluster: { centres: 20, spread: 12 }, k: [0.8, 1.4], seed: 49, anim: false, shadow: false, tint: { col: '#9aa4aa', k: [0.48, 0.5] } });
  // (round 3) the middle of the bed, 40 to 70 m, filled evenly between the near stands (no bare peat between them)
  S.push({ obj: { 'plant.yg-reedbed': 3, 'plant.reed': 4 }, on: 'reeds', avoid: ['walk'], d: [40, 72], n: 150, dist: 'screen', cluster: { centres: 30, spread: 6 }, k: [0.85, 1.2], seed: 50, anim: false, shadow: false, tint: { col: '#8a7a40', k: [0.08, 0.1] } });
  Pl.push({ obj: 'street.bench', at: [-1.5, 12.4], k: 1, variant: 2, face: 'right' });
  Pl.push({ obj: 'ground.log', at: [4.8, 12.6], k: 1, variant: 1, flip: true });
  Pl.push({ obj: 'plant.gorse', at: [-6.2, 13.6], k: 0.9 }, { obj: 'plant.gorse', at: [6.4, 16.4], k: 0.8, flip: true }, { obj: 'plant.gorse', at: [-9.5, 19], k: 1 }, { obj: 'plant.gorse', at: [11, 21.5], k: 0.9 });
  // a stonechat on the gorse by the path and a Dartford warbler further along
  Pl.push({ obj: 'bird.stonechat', at: [2.8, 11.6], k: 1.6 }, { obj: 'bird.dartford-warbler', at: [-5.2, 13.2], k: 1.6, flip: true });

  // ---- the life below: roe deer at the reed edge, a walker going down to the boardwalk, swans and geese on the water
  Pl.push({ obj: 'animal.deer', at: [-6.2, 22.6], k: 1, flip: true }, { obj: 'animal.deer', at: [-8.4, 23.6], k: 0.9, variant: 1 });
  A.push({ obj: 'person.walker', ground: [[-0.4, 11.5], [0.4, 14], [1.8, 17], [2.4, 20.5], [2.6, 25], [4.4, 38], [3.6, 54]], speedM: 0.8, loop: 'pingpong', seed: 41, offset: 0.25 });
  A.push({ obj: 'bird.swan', ground: [[-30, 190], [-6, 182], [20, 190]], speedM: 0.3, loop: 'pingpong', seed: 42 });
  A.push({ obj: 'bird.swan', ground: [[-27, 194], [-3, 186], [23, 194]], speedM: 0.3, loop: 'pingpong', k: 0.95, seed: 43, offset: 0.06 });
  Pl.push({ obj: 'bird.goose', at: [30, 230], k: 1 }, { obj: 'bird.goose', at: [34, 236], k: 1, variant: 1, flip: true }, { obj: 'bird.coot', at: [-14, 160], k: 1.1 });
  Pl.push({ obj: 'boat.dinghy', at: [60, 380], k: 1, variant: 0 });
  data.flocks.push({ obj: 'bird.goose-flight', n: 9, area: [300, 140, 1400, 320], speed: 30, s: 0.36, seed: 61, layer: 'horizon' });
  // swallows over the reeds in summer; bats after dusk; mist on the reeds and the water from dusk to dawn
  const sw = (pts, sp, s, v, off, seed) => A.push({ obj: 'bird.wp-swallow', layer: 'mid', path: pts, speed: sp, loop: 'fade', s, variant: v, seed, offset: off });
  sw([[-160, 520], [200, 540], [480, 506], [760, 548], [1040, 512], [1320, 540], [1760, 520]], 280, 0.6, 0, 0.1, 51);
  sw([[1760, 470], [1400, 488], [1100, 458], [800, 480], [500, 452], [200, 476], [-160, 460]], 250, 0.5, 1, 0.6, 52);
  const bat = (cx, cy, rx, ry, sp, s, v, seed) => {
    const r = F.rnd(seed), pts = [];
    for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2; pts.push([R1(cx + Math.cos(a) * rx * (0.7 + r() * 0.5)), R1(cy + Math.sin(a * 2) * ry * (0.6 + r() * 0.6))]); }
    pts[20] = pts[0];
    A.push({ obj: 'animal.wp-bat', layer: 'near', path: pts, speed: sp, loop: 'loop', s, variant: v, seed, offset: R2(r()) });
  };
  bat(600, 300, 220, 60, 150, 1, 0, 62); bat(1000, 360, 200, 70, 170, 0.9, 1, 63);
  // (round 2) every mist bank one sprite (one variant, one size, flipped or not): it was the largest sprite memory here
  Pl.push({ obj: 'sky.wp-mist', x: 520, y: 470, s: 1.2, layer: 'mid', variant: 0, pin: true, anim: false },
    { obj: 'sky.wp-mist', x: 1180, y: 452, s: 1.2, layer: 'mid', variant: 0, flip: true, pin: true, anim: false });
  A.push({ obj: 'sky.wp-mist', layer: 'mid', path: [[-60, 500], [1660, 500]], speed: 6, loop: 'pingpong', s: 1.2, variant: 0, seed: 64, offset: 0.3 });

  // ---- framing: the pine bough over the top left; heather and gorse across the foot of the frame
  Pl.push({ obj: 'tree.wp-pine-bough', x: -40, y: -24, s: 0.95, layer: 'front', pin: true, anim: { sway: { k: 1 } } });
  Pl.push({ obj: 'plant.gorse', x: 1500, y: 950, s: 1.8, pin: true, layer: 'front', shadow: false, anim: false, flip: true },
    { obj: 'plant.heather', x: 120, y: 950, s: 2.2, pin: true, layer: 'front', shadow: false, anim: false },
    { obj: 'plant.bracken', x: 1700, y: 960, s: 2.0, pin: true, layer: 'front', shadow: false, anim: false });
  return data;
}
