/* ============================================================
   COMPOSED SCENE (v2, by hand) uk-south-east / Fleet Pond, view 4 (evening): the sailing club pontoon at sunset.
   docs/dev/SCENE_ENGINE_V2.md. Redrawn on the v2 engine (the hand-drawn art stays in the 72 file as legacySvg).

   The view: on the sailing club's floating pontoon on the east shore, looking west (heading 278) along it into the evening
   sun, down the whole length of the pond. Finger pontoons off it with dinghies moored, sails down, burgees at the
   mastheads; on the right the club's hard: the weatherboarded clubhouse with its veranda and flagpole, dinghies on their
   trolleys and one upturned on the grass. Far off: the west reedbeds and the woods against the low sun.
   Framing: weeping willow fronds hanging into the top left, reed and reedmace at the bottom corners.
   The life: a sailor coming in on the last dinghy of the day across the sun's road, a mute swan pair by the pontoon,
   great crested grebes, coots and black-headed gulls (one on the pontoon's end), a club member on the pontoon; the
   clubhouse windows lit from dusk, pipistrelles and mist over the water after dark, swallows in summer.
   Ground plan and objects of its own: SCENE_FPV.v4, structure.fpv-walk-v4, building.fpv-sailing-hut,
   boat.fpv-dinghy-moored and plant.fpv-willow-fronds (70-scene-lib-fleet-pond-views.js).
     https://www.hart.gov.uk/fleet-pond-local-nature-reserve
   PURE: defines sceneUkFleetPondV4() -> the scene data, called once, lazily.
   ============================================================ */
function sceneUkFleetPondV4() {
  const F = SCENE_FPV, P = F.v4, W = SCENE_FPV_WALK.v4, cam = P.camera;
  const R2 = v => Math.round(v * 100) / 100, R1 = v => Math.round(v * 10) / 10;
  const proj = W.proj, f = W.f, H = cam.horizon;
  // the near shore: the club's hard on the right, running away to the north-west (right, far) round the pond
  const shoreR = F.line([[3.4, 2.4], [4.2, 6], [5.6, 10], [7.6, 15], [10.5, 22], [15, 32], [22, 46], [32, 62], [48, 84], [70, 110], [110, 150], [200, 210]], 0.8);
  // the far (west) shore: ragged, about 520 to 640 m off, the west reedbed pushing out on the left
  const rs = F.rnd(5), far = [];
  for (let x = -520; x <= 520; x += 18) far.push([x, R1(560 + 50 * Math.sin(x / 110) + rs() * 20 - (x < -60 ? (-60 - x) * 0.25 : 0))]);
  const pond = [[-520, 2.4]].concat(shoreR.filter(p => p[0] < 500), [[520, 240]], far.slice().reverse().map(p => p)).reverse();
  const reedsW = far.concat(far.slice().reverse().map(([x, d]) => [x, d + 26 + (x < -60 ? 30 : 0)]));
  // the club's hard: grass and gravel from the shore back to the trees
  const hard = shoreR.concat([[200, 260], [200, 2.4]]);
  const gravel = [[8.2, 13], [10.6, 13], [13.4, 22.5], [10.8, 22.5]];   // the slipway

  const data = {
    v: 2, id: 'fleet-pond-4',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'sunset', season: 'auto', setting: 'natural', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['temperate', 'water', 'birds', 'people', 'boats'],
    sky: { stars: 220, clouds: { n: 5, y: [40, 330], speed: 4 }, sunR: 26, moonR: 18 },
    palette: {
      base: { grass: ['#6e8448', '#56683a'], bank: ['#7a8650', '#56602e'], plaza: ['#a49a86', '#8a8070'], tl: ['#7d9088', '#5f7462', '#4a5e44', '#6a7a52'] },
      spring: { tl: ['#82968a', '#64806a', '#4e6a46', '#7e9058'] },
      autumn: { grass: ['#7a8248', '#5e6634'], tl: ['#8e9282', '#7a7656', '#6a5e3a', '#9a7e46'] },
      winter: { grass: ['#7a7e66', '#5e6250'], tl: ['#8a8e92', '#6e7276', '#585c5c', '#74706a'] },
    },
    surfaces: [
      { id: 'land', kind: 'wood', rest: true },
      { id: 'hard', kind: 'grass', poly: hard },
      { id: 'gravel', kind: 'plaza', poly: gravel },
      { id: 'reeds-w', kind: 'bank', poly: reedsW },
      { id: 'deck', kind: 'bridge', path: P.deck, width: P.deckW, over: 'water' },
    ],
    water: [{ id: 'pond', kind: 'lake', poly: pond, edge: 'none', rings: true }],
    ground: [], place: [], scatter: [], actors: [], flocks: [],
  };
  const Pl = data.place, S = data.scatter, A = data.actors;
  // ---- the far west shore: layered lobed canopies, pines standing out against the sunset (far to near)
  data.ground.push(
    { layer: 'horizon', d: F.canopy(H - 4, 61, 12, 34, 0.1, H + 8, 0.05), fill: { lin: [[0, '@tl.0'], [1, '@tl.1']], y1: H - 50, y2: H + 8 } },
    { layer: 'far', d: F.canopy(H + 1, 62, 8, 24, 0.06, H + 8, 0.12), fill: { lin: [[0, '@tl.3'], [1, '@tl.2']], y1: H - 32, y2: H + 8 } });
  S.push({ obj: { 'plant.reed': 6, 'plant.bulrush': 1 }, on: 'reeds-w', d: [380, 700], n: 380, dist: 'screen', cluster: { centres: 16, spread: 14 }, seed: 31, anim: false, shadow: false, tint: { col: '#9a8a50', k: [0, 0.12] } });
  S.push({ obj: { 'tree.far-birch': 3, 'tree.far-pine': 2, 'tree.bank-distant': 3, 'tree.bank-willow': 1 }, on: 'land', d: [560, 900], n: 90, dist: 'ground', cluster: { centres: 10, spread: 40 }, k: [1.0, 1.4], seed: 32, anim: false, shadow: false, tint: { col: '#7a8a8a', k: [0, 0.16] } });

  // ---- the club's hard: the clubhouse, dinghies on trolleys and one upturned, willows and alders along the shore behind
  Pl.push({ obj: 'building.fpv-sailing-hut', at: [13.5, 27], k: 1, flip: true, fix: true });
  // (round 2) one dinghy on its trolley at the foot of the slipway (the upturned one stood in the water: gone)
  Pl.push({ obj: 'boat.fpv-dinghy-moored', at: [11.6, 22.5], k: 1, variant: 2, flip: true });
  const tree = (obj, x, d, k, o) => Pl.push(Object.assign({ obj, at: [x, d], k, anim: false }, o || {}));
  tree('tree.pond-willow', 24, 46, 1.1, { variant: 0 });
  tree('tree.bank-alder', 30, 40, 1.0, { variant: 1, flip: true });
  tree('tree.pond-oak', 40, 66, 1.2, { variant: 1 });
  S.push({ obj: { 'tree.bank-alder': 2, 'tree.bank-willow': 2, 'tree.bank-oak': 2, 'tree.bank-birch': 1 }, on: 'hard', avoid: ['gravel'], d: [40, 220], n: 26, dist: 'ground', cluster: { centres: 6, spread: 8 }, gap: 'foot', k: [0.8, 1.2], seed: 33, anim: false });
  S.push({ obj: { 'plant.grass-long': 4, 'plant.grass': 3, 'plant.reed': 2, 'plant.wildflowers': 1 }, on: 'hard', avoid: ['gravel'], d: [4.5, 60], n: 360, dist: 'screen', cluster: { centres: 12, spread: 1.5 }, k: [0.7, 1.15], seed: 34, anim: false, tint: { col: '#8a8a40', k: [0, 0.12] } });
  // the near bank under the camera's right: tussock grass, reed and reedmace thick at the water's edge
  S.push({ obj: { 'plant.grass-long': 3, 'plant.reed': 3, 'plant.bulrush': 1, 'plant.grass': 2 }, on: 'hard', avoid: ['gravel'], d: [3, 16], n: 160, dist: 'screen', cluster: { centres: 6, spread: 0.8 }, k: [0.8, 1.2], seed: 36, anim: false, species: 1 });
  // the reed fringe along the hard's water edge
  S.push({ obj: { 'plant.reed': 4, 'plant.bulrush': 2 }, on: 'hard', avoid: ['gravel'], d: [5, 60], n: 140, dist: 'screen', cluster: { centres: 8, spread: 0.8 }, k: [0.8, 1.15], seed: 35, anim: 'strip', species: 1 });

  // ---- the pontoon and its fingers (this camera's perspective), the dinghies moored along them, sails down
  Pl.push(...W.placements('structure.fpv-walk-v4'));
  // (round 2) each dinghy lies alongside a finger, parallel to it, on its near side (the hull and its reflection in open water,
  // not standing on the finger's deck)
  const moorAt = (s, len, side, off) => { const q = W.at(s), e = P.deckW / 2 + Math.max(len * 0.5, 2.4); return [R2(q[0] + q[2] * side * e + q[3] * off), R2(q[1] + q[3] * side * e - q[2] * off)]; };
  const moored = [[15, 4.2, -1, 1.25, 1, false], [21, 4.2, -1, 1.25, 0, true], [14, 3.2, 1, 1.25, 0, false]];
  moored.forEach(([s, len, side, off, v, fl]) => Pl.push({ obj: 'boat.fpv-dinghy-moored', at: moorAt(s, len, side, off), k: 1, variant: v, flip: fl, fix: true }));
  // a club member on the pontoon, a gull on its far end
  Pl.push({ obj: 'person.walker', at: [-1.4, 17], k: 1, face: 'left', anim: { walk: false } });
  Pl.push({ obj: 'bird.gull', at: [-2.9, 27.6], k: 1.1 });

  // ---- the life on the water: the last dinghy in across the sun's road, swans by the pontoon, grebes, coots, gulls
  A.push({ obj: 'boat.dinghy', ground: [[-60, 160], [-20, 110], [-8, 70], [-6, 45]], speedM: 1.2, loop: 'pingpong', variant: 1, seed: 41, offset: 0.3 });
  A.push({ obj: 'boat.dinghy', ground: [[40, 260], [-60, 300], [-140, 280]], speedM: 1.4, loop: 'pingpong', variant: 2, seed: 42, offset: 0.7 });
  Pl.push({ obj: 'bird.gull', at: [-12, 48], k: 1, variant: 1, flip: true }, { obj: 'bird.coot', at: [-22, 96], k: 1.1 }, { obj: 'bird.grebe', at: [12, 120], k: 1.1, flip: true });
  // swallows over the water in summer, bats and mist after dusk, geese going over to roost
  const sw = (pts, sp, s, v, off, seed) => A.push({ obj: 'bird.wp-swallow', layer: 'mid', path: pts, speed: sp, loop: 'fade', s, variant: v, seed, offset: off });
  sw([[-160, 540], [240, 566], [520, 528], [820, 572], [1100, 540], [1400, 580], [1760, 556]], 300, 0.7, 0, 0.1, 51);
  const bat = (cx, cy, rx, ry, sp, s, v, seed) => {
    const r = F.rnd(seed), pts = [];
    for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2; pts.push([R1(cx + Math.cos(a) * rx * (0.7 + r() * 0.5)), R1(cy + Math.sin(a * 2) * ry * (0.6 + r() * 0.6))]); }
    pts[20] = pts[0];
    A.push({ obj: 'animal.wp-bat', layer: 'near', path: pts, speed: sp, loop: 'loop', s, variant: v, seed, offset: R2(r()) });
  };
  bat(600, 340, 240, 70, 150, 1, 0, 61); bat(1000, 300, 200, 60, 170, 0.9, 1, 62); bat(1300, 420, 160, 50, 140, 0.8, 0, 63);
  // (round 2) every mist bank one sprite (one variant, one size, flipped or not): it was the largest sprite memory here
  Pl.push({ obj: 'sky.wp-mist', x: 560, y: H + 6, s: 1.1, layer: 'mid', variant: 0, pin: true, anim: false },
    { obj: 'sky.wp-mist', x: 1080, y: H + 10, s: 1.1, layer: 'mid', variant: 0, flip: true, pin: true, anim: false });
  A.push({ obj: 'sky.wp-mist', layer: 'mid', path: [[-60, H + 16], [1660, H + 16]], speed: 7, loop: 'pingpong', s: 1.1, variant: 0, seed: 64, offset: 0.3 });
  data.flocks.push({ obj: 'bird.goose-flight', n: 7, area: [200, 120, 1400, 320], speed: 32, s: 0.32, seed: 65, layer: 'horizon' });

  // ---- framing: willow fronds hanging into the top left, reed and reedmace in the bottom corners
  Pl.push({ obj: 'plant.fpv-willow-fronds', x: -60, y: -20, s: 1.15, pin: true, layer: 'front', shadow: false, anim: { sway: { k: 0.8 } } });
  Pl.push({ obj: 'plant.reed', x: 60, y: 960, s: 2.8, pin: true, layer: 'front', shadow: false, anim: false },
    { obj: 'plant.bulrush', x: 180, y: 970, s: 2.4, pin: true, layer: 'front', shadow: false, anim: false, flip: true },
    { obj: 'plant.reed', x: -40, y: 980, s: 3.2, pin: true, layer: 'front', shadow: false, anim: false, variant: 2 },
    { obj: 'plant.grass-long', x: 1580, y: 950, s: 2.4, pin: true, layer: 'front', shadow: false, anim: false });
  // ---- the movers (10 Oct, the animation overhaul): behaviour presets at their real size (SCENE_FPV.life), after every placement
  A.push(...F.life(data, [
    { obj: 'bird.swan', preset: 'swan', route: [[-2.6, 32], [-6, 30], [-9, 33]], seed: 43 },
    { obj: 'bird.swan', preset: 'swan', route: [[-4.4, 35.4], [-7.8, 33.6], [-10.8, 36.6]], seed: 44, offset: 0.55 },
    { obj: 'bird.grebe', preset: 'grebe', route: [[-30, 70], [-16, 76]], seed: 45, offset: 0.5, acts: ['look', 'preen', 'look'] },
    { obj: 'bird.coot', preset: 'coot', route: [[8, 50], [2, 56], [-4, 52]], seed: 46, offset: 0.2, acts: ['look', 'preen', 'look'] },
  ]));
  return data;
}
